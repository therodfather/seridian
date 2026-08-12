"use client";

import { useEffect, useRef } from "react";

// Lightweight WebGL2 shader hero — < ~3KB gzipped
// Animated cyan gradient mesh, DPR-aware, resizes via ResizeObserver,
// respects prefers-reduced-motion, pauses when hidden.
//
// Shader notes (ANGLE / SwiftShader / Electron quirks):
// - no loops (float or int) — some GPUs fail compile with empty info logs
// - no user-defined helpers — keep main() self-contained
// - mediump fragment precision — more portable than highp on soft GL
// - ASCII-only GLSL comments

const VERTEX_SRC = `#version 300 es
precision highp float;
in vec2 a_pos;
void main(){ gl_Position = vec4(a_pos,0.0,1.0); }
`;

// Soft cyan gradient mesh. Intentionally simple for maximum WebGL2 compile coverage.
const FRAGMENT_SRC = `#version 300 es
precision mediump float;
uniform float u_time;
uniform vec2 u_res;
out vec4 outColor;

void main(){
  vec2 uv = gl_FragCoord.xy / max(u_res, vec2(1.0));
  vec2 p = uv - 0.5;
  // Dampened aspect correction toward square coords (avoids portrait stretch)
  float aspect = u_res.x / max(u_res.y, 1.0);
  float ac = mix(1.0, aspect, 0.4);
  p.x *= ac;

  float t = u_time * 0.14;

  // Seridian palette
  vec3 bg = vec3(0.027, 0.043, 0.078);
  vec3 c1 = vec3(0.023, 0.713, 0.831);
  vec3 c2 = vec3(0.133, 0.827, 0.933);
  vec3 c3 = vec3(0.404, 0.910, 0.976);

  // two large blobs drifting
  float d1 = length(p + vec2(0.22 * sin(t), 0.14 * cos(t * 0.8)));
  float d2 = length(p - vec2(0.20 * cos(t * 0.65), 0.22 * sin(t * 0.75)));
  float b1 = 0.42 / (1.0 + d1 * 3.2);
  float b2 = 0.36 / (1.0 + d2 * 2.9);

  // soft flow lines (aspect-corrected)
  vec2 flowUv = vec2(uv.x * ac, uv.y);
  float flow = sin(flowUv.x * 7.0 + t * 1.1) * 0.5 + cos(flowUv.y * 6.0 - t * 0.9) * 0.5;
  float flowMask = smoothstep(0.35, 0.85, fract(flow * 0.9 + flowUv.y * 0.6)) * 0.07;

  // top-center glow wash
  float orb = exp(-length(p - vec2(0.0, 0.38)) * 2.15) * 0.9;

  // a few unrolled sparkles (no loops) for subtle motion
  vec2 s0 = vec2(fract(0.18 + t * 0.02), fract(0.62 + t * 0.008));
  vec2 s1 = vec2(fract(0.71 + t * 0.015), fract(0.28 + t * 0.01));
  vec2 s2 = vec2(fract(0.43 + t * 0.018), fract(0.81 + t * 0.006));
  vec2 s3 = vec2(fract(0.88 + t * 0.012), fract(0.47 + t * 0.009));
  vec2 p0 = (s0 - 0.5) * vec2(ac, 1.0);
  vec2 p1 = (s1 - 0.5) * vec2(ac, 1.0);
  vec2 p2 = (s2 - 0.5) * vec2(ac, 1.0);
  vec2 p3 = (s3 - 0.5) * vec2(ac, 1.0);
  float particles =
    0.006 / (1.0 + length(p - p0) * 220.0) +
    0.006 / (1.0 + length(p - p1) * 220.0) +
    0.006 / (1.0 + length(p - p2) * 220.0) +
    0.006 / (1.0 + length(p - p3) * 220.0);
  particles = clamp(particles, 0.0, 0.55);

  vec3 col = bg;
  col = mix(col, c1, b1 * 0.34);
  col = mix(col, c2, b2 * 0.30);
  col = mix(col, c2, orb * 0.11);
  col = mix(col, c3, flowMask);
  col += particles * 0.55 * vec3(0.6, 0.95, 1.0);

  // vignette (aspect-aware)
  float vigX = p.x / max(ac, 0.5);
  float vig = 1.0 - (vigX * vigX + p.y * p.y) * 0.42;
  col *= vig;

  outColor = vec4(col, 1.0);
}
`;

function rendererLabel(gl: WebGL2RenderingContext): string {
  const dbg = gl.getExtension("WEBGL_debug_renderer_info");
  if (!dbg) return gl.getParameter(gl.RENDERER) || "unknown";
  return String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || "unknown");
}

function compile(
  gl: WebGL2RenderingContext,
  type: number,
  src: string
): WebGLShader {
  const label = type === gl.VERTEX_SHADER ? "vertex" : "fragment";
  const s = gl.createShader(type);
  if (!s) throw new Error(`${label} shader create failed`);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    // Capture raw info log before delete; empty/null is common on stub GL.
    const raw = gl.getShaderInfoLog(s);
    const log = typeof raw === "string" ? raw.trim() : "";
    gl.deleteShader(s);
    const detail = log || "(empty getShaderInfoLog)";
    throw new Error(
      `${label} shader compile failed: ${detail} | renderer=${rendererLabel(gl)}`
    );
  }
  return s;
}

function createProgram(
  gl: WebGL2RenderingContext,
  vsSrc: string,
  fsSrc: string
): WebGLProgram {
  const vs = compile(gl, gl.VERTEX_SHADER, vsSrc);
  let fs: WebGLShader;
  try {
    fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc);
  } catch (err) {
    gl.deleteShader(vs);
    throw err;
  }
  const prog = gl.createProgram();
  if (!prog) {
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    throw new Error("program create failed");
  }
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const raw = gl.getProgramInfoLog(prog);
    const log = typeof raw === "string" ? raw.trim() : "";
    gl.deleteProgram(prog);
    throw new Error(
      `program link failed: ${log || "(empty getProgramInfoLog)"} | renderer=${rendererLabel(gl)}`
    );
  }
  return prog;
}

// 2D fallback for no-webgl2 or error
function drawFallback2D(
  canvas: HTMLCanvasElement,
  reducedMotion: boolean
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  ctx.scale(dpr, dpr);
  const w = rect.width;
  const h = rect.height;

  // base
  ctx.fillStyle = "#070b14";
  ctx.fillRect(0, 0, w, h);

  // glow orb fallback — static
  const g = ctx.createRadialGradient(w * 0.5, h * 0.12, 0, w * 0.5, h * 0.12, Math.max(w, h) * 0.55);
  g.addColorStop(0, "rgba(34,211,238,0.16)");
  g.addColorStop(0.4, "rgba(6,182,212,0.06)");
  g.addColorStop(1, "transparent");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // subtle cyan blobs
  for (const pos of [
    { x: w * 0.33, y: h * 0.32, r: w * 0.26, a: 0.07 },
    { x: w * 0.72, y: h * 0.42, r: w * 0.22, a: 0.055 },
  ] as const) {
    const rg = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, pos.r);
    rg.addColorStop(0, `rgba(34,211,238,${pos.a})`);
    rg.addColorStop(1, "transparent");
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, pos.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // particles dots
  if (!reducedMotion) {
    ctx.fillStyle = "rgba(103,232,249,0.5)";
    for (let i = 0; i < 18; i++) {
      const x = ((((i * 137.5) % 100) / 100) * w + w * 0.1) % w;
      const y = ((((i * 73.3) % 100) / 100) * h * 0.7 + h * 0.15) % h;
      ctx.beginPath();
      ctx.arc(x, y, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// 2D fallback wiring shared by the no-webgl2 and shader-error paths.
// If the canvas already holds a webgl context (shader error), getContext("2d")
// returns null — swap in a fresh canvas so the fallback can actually render.
function setupFallback2D(
  wrap: HTMLElement,
  canvas: HTMLCanvasElement,
  mql: MediaQueryList
): () => void {
  let target = canvas.getContext("2d") ? canvas : null;
  if (!target) {
    target = document.createElement("canvas");
    for (let i = 0; i < canvas.attributes.length; i++) {
      const attr = canvas.attributes[i];
      target.setAttribute(attr.name, attr.value);
    }
    canvas.replaceWith(target);
    target.style.opacity = "1";
  }
  let reduced = mql.matches;
  const draw = () => drawFallback2D(target!, reduced);
  draw();
  const ro = new ResizeObserver(draw);
  ro.observe(wrap);
  const onChange = (e: MediaQueryListEvent) => {
    reduced = e.matches;
    draw();
  };
  mql.addEventListener?.("change", onChange);
  return () => {
    ro.disconnect();
    mql.removeEventListener?.("change", onChange);
  };
}

// After WEBGL_lose_context, getContext("webgl2") returns the same lost
// context forever. React Strict Mode remounts must either skip loseContext
// or mint a fresh <canvas> outside React's host tree — we skip loseContext
// and rely on deleteProgram/deleteBuffer + GC when the canvas unmounts.
function replaceCanvas(old: HTMLCanvasElement): HTMLCanvasElement {
  const next = document.createElement("canvas");
  for (let i = 0; i < old.attributes.length; i++) {
    const attr = old.attributes[i];
    next.setAttribute(attr.name, attr.value);
  }
  next.style.cssText = old.style.cssText;
  old.replaceWith(next);
  return next;
}

const WEBGL2_ATTRS: WebGLContextAttributes = {
  alpha: false,
  antialias: true,
  depth: false,
  stencil: false,
  premultipliedAlpha: false,
  powerPreference: "default",
};

function acquireWebGL2(start: HTMLCanvasElement): {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext | null;
} {
  let canvas = start;
  let gl: WebGL2RenderingContext | null = null;
  try {
    gl = canvas.getContext("webgl2", WEBGL2_ATTRS);
  } catch {
    gl = null;
  }

  // Recover from an externally lost context (tab discard, GPU reset).
  // Note: we do not call loseContext() ourselves anymore — that raced with
  // React Strict Mode's mount→cleanup→mount and forced a permanent fallback.
  if (gl?.isContextLost()) {
    canvas = replaceCanvas(canvas);
    try {
      gl = canvas.getContext("webgl2", WEBGL2_ATTRS);
    } catch {
      gl = null;
    }
  }

  if (gl && gl.isContextLost()) gl = null;
  return { canvas, gl };
}

export default function WebGLHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const startCanvas = canvasRef.current;
    if (!startCanvas || !wrap) return;

    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = mql.matches;

    const acquired = acquireWebGL2(startCanvas);
    let canvas = acquired.canvas;
    canvasRef.current = canvas;

    // fade in
    requestAnimationFrame(() => {
      canvas.style.opacity = "1";
    });

    const gl = acquired.gl;
    if (!gl) {
      return setupFallback2D(wrap, canvas, mql);
    }

    // WebGL path
    let program: WebGLProgram | null = null;
    try {
      program = createProgram(gl, VERTEX_SRC, FRAGMENT_SRC);
    } catch (err) {
      // Real shader/driver failure → 2D fallback (dev-only log).
      // Lost-context remounts are handled above via canvas replace.
      if (process.env.NODE_ENV === "development") {
        console.warn("[WebGLHero] shader error, using 2d fallback", err);
      }
      return setupFallback2D(wrap, canvas, mql);
    }

    gl.useProgram(program);

    // fullscreen triangle (covers viewport, no index buffer)
    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    // 3 verts: (-1,-1) (3,-1) (-1,3)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    const aPos = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, "u_time");
    const uRes = gl.getUniformLocation(program, "u_res");

    let raf = 0;
    let start = performance.now();
    let elapsed = 0;
    let hidden = document.hidden;
    let ro: ResizeObserver | null = null;

    const resize = () => {
      if (gl.isContextLost()) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = wrap.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.uniform2f(uRes, w, h);
      } else {
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
      // draw once after resize so no blank frame
      if (reducedMotion || hidden) {
        gl.uniform1f(uTime, elapsed);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    };

    // initial size before first draw
    resize();

    const render = (now: number) => {
      if (reducedMotion || hidden || gl.isContextLost()) return;
      elapsed = (now - start) * 0.001;
      gl.uniform1f(uTime, elapsed);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(render);
    };

    // draw static first frame
    gl.uniform1f(uTime, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (!reducedMotion && !hidden) {
      start = performance.now();
      raf = requestAnimationFrame(render);
    } else {
      elapsed = 0;
    }

    ro = new ResizeObserver(resize);
    ro.observe(wrap);
    // also listen to window resize for dpr changes
    window.addEventListener("resize", resize);

    const onVisibility = () => {
      hidden = document.hidden;
      if (hidden) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      } else if (!reducedMotion && !gl.isContextLost()) {
        start = performance.now() - elapsed * 1000;
        raf = requestAnimationFrame(render);
      } else if (!gl.isContextLost()) {
        gl.uniform1f(uTime, elapsed);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    const onReduceChange = (e: MediaQueryListEvent) => {
      reducedMotion = e.matches;
      if (gl.isContextLost()) return;
      if (reducedMotion) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        gl.uniform1f(uTime, elapsed);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      } else if (!document.hidden) {
        start = performance.now() - elapsed * 1000;
        raf = requestAnimationFrame(render);
      }
    };
    mql.addEventListener?.("change", onReduceChange);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      mql.removeEventListener?.("change", onReduceChange);
      window.removeEventListener("resize", resize);
      if (ro) ro.disconnect();
      if (program && !gl.isContextLost()) gl.deleteProgram(program);
      if (posBuf && !gl.isContextLost()) gl.deleteBuffer(posBuf);
      // Do NOT call WEBGL_lose_context here. React Strict Mode remounts the
      // effect on the same canvas; a lost context cannot be recreated in-place
      // and previously surfaced as a bogus "shader compile error" in bun dev.
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      className="webgl-hero pointer-events-none absolute inset-0 overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        role="presentation"
        className="block h-full w-full opacity-0 transition-opacity duration-700 ease-out"
        style={{ background: "#070b14" }}
      />
    </div>
  );
}
