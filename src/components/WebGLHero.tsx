"use client";

import { useEffect, useRef } from "react";

// Lightweight WebGL2 shader hero — < ~3KB gzipped
// Animated cyan gradient mesh + particles, DPR-aware, resizes via ResizeObserver,
// respects prefers-reduced-motion, pauses when hidden.

const VERTEX_SRC = `#version 300 es
precision highp float;
in vec2 a_pos;
void main(){ gl_Position = vec4(a_pos,0.0,1.0); }
`;

const FRAGMENT_SRC = `#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_res;
out vec4 outColor;

// hash for particles
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }

void main(){
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = frag / u_res;
  vec2 p = uv - 0.5;
  p.x *= u_res.x / max(u_res.y, 1.0);

  float t = u_time * 0.14;

  // Seridian palette
  vec3 bg = vec3(0.027, 0.043, 0.078); // #070b14
  vec3 c1 = vec3(0.023, 0.713, 0.831); // #06b6d4
  vec3 c2 = vec3(0.133, 0.827, 0.933); // #22d3ee
  vec3 c3 = vec3(0.404, 0.910, 0.976); // #67e8f9

  // two large blobs drifting — low opacity gradient mesh
  float d1 = length(p + vec2(0.22 * sin(t), 0.14 * cos(t * 0.8)));
  float d2 = length(p - vec2(0.20 * cos(t * 0.65), 0.22 * sin(t * 0.75)));
  float b1 = 0.42 / (1.0 + d1 * 3.2);
  float b2 = 0.36 / (1.0 + d2 * 2.9);

  // soft flow lines
  float flow = sin(uv.x * 7.0 + t * 1.1) * 0.5 + cos(uv.y * 6.0 - t * 0.9) * 0.5;
  float flowMask = smoothstep(0.35, 0.85, fract(flow * 0.9 + uv.y * 0.6)) * 0.07;

  // top-center glow wash aligned with existing glow-orb
  float orb = exp(-length(p - vec2(0.0, 0.38)) * 2.15) * 0.9;

  // particle field — sparse, slow drift
  float particles = 0.0;
  // 8 particles seeded by grid
  for(float i = 0.0; i < 8.0; i++){
    vec2 seed = vec2(hash(vec2(i, 1.3)), hash(vec2(i, 7.7)));
    // drift slowly on x/y
    vec2 pos = vec2(
      fract(seed.x + t * (0.015 + seed.y * 0.02) + sin(seed.y * 6.28) * 0.1),
      fract(seed.y + t * 0.008 + cos(seed.x * 6.28) * 0.05)
    );
    // convert to p-space
    vec2 pp = pos - 0.5;
    pp.x *= u_res.x / max(u_res.y, 1.0);
    float d = length(p - pp);
    // soft point
    particles += 0.006 / (1.0 + d * 220.0);
  }
  particles = clamp(particles, 0.0, 0.55);

  vec3 col = bg;
  col = mix(col, c1, b1 * 0.34);
  col = mix(col, c2, b2 * 0.30);
  col = mix(col, c2, orb * 0.11);
  col = mix(col, c3, flowMask);
  // particles add on top at low mix
  col += particles * 0.55 * vec3(0.6, 0.95, 1.0);

  // vignette to keep edges dark
  float vig = 1.0 - dot(p, p) * 0.42;
  col *= vig;

  // keep alpha 1 (opaque) but colors are subtle; parent bg stays #070b14
  outColor = vec4(col, 1.0);
}
`;

// Returns null (never throws) so callers can fall back to 2D silently.
// gl.createShader() returns null when the context is lost — this is expected
// under React StrictMode double-effects (cleanup runs, then the effect
// re-runs against the same canvas), Turbopack Fast Refresh remounts, GPU
// process restarts, or when the browser blocks WebGL. Throwing here surfaces
// as a noisy `Error: shader create failed` in dev; returning null lets the
// hero degrade to the static 2D canvas without console noise.
function compile(
  gl: WebGL2RenderingContext,
  type: number,
  src: string
): WebGLShader | null {
  if (typeof gl.isContextLost === "function" && gl.isContextLost()) return null;
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    gl.deleteShader(s);
    return null;
  }
  return s;
}

function createProgram(
  gl: WebGL2RenderingContext,
  vsSrc: string,
  fsSrc: string
): WebGLProgram | null {
  if (typeof gl.isContextLost === "function" && gl.isContextLost()) return null;
  const vs = compile(gl, gl.VERTEX_SHADER, vsSrc);
  if (!vs) return null;
  const fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc);
  if (!fs) {
    gl.deleteShader(vs);
    return null;
  }
  const prog = gl.createProgram();
  if (!prog) {
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return null;
  }
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    gl.deleteProgram(prog);
    return null;
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

export default function WebGLHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    // StrictMode / Turbopack double-effect guard: if cleanup ran, this
    // instance is stale and must not touch GL or start a RAF loop.
    let cancelled = false;

    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = mql.matches;

    // fade in
    requestAnimationFrame(() => {
      if (!cancelled) canvas.style.opacity = "1";
    });

    // WebGL2 only — our shaders are `#version 300 es` (GLSL ES 3.00) and
    // cannot compile on a WebGL1 context, so a missing WebGL2 context means
    // silent 2D fallback (no warning, no throw).
    let gl: WebGL2RenderingContext | null = null;
    try {
      // Opaque fullscreen triangle: no alpha blending needed, no depth /
      // stencil, no MSAA (no geometry edges to smooth), no preserved buffer.
      // desynchronized + failIfMajorPerformanceCaveat:false keeps software
      // GL (SwiftShader) from rejecting context creation outright.
      gl = canvas.getContext("webgl2", {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
        powerPreference: "high-performance",
        failIfMajorPerformanceCaveat: false,
        desynchronized: true,
      }) as WebGL2RenderingContext | null;
    } catch {
      gl = null;
    }

    // Null GL, dead context (StrictMode remount reuses the same canvas whose
    // backing context the previous cleanup may have been holding), or a
    // non-WebGL2 context → degrade silently to the static 2D canvas.
    if (
      !gl ||
      (typeof WebGL2RenderingContext !== "undefined" &&
        !(gl instanceof WebGL2RenderingContext)) ||
      (typeof gl.isContextLost === "function" && gl.isContextLost())
    ) {
      return setupFallback2D(wrap, canvas, mql);
    }

    // Shader / link failure (including createShader returning null after a
    // context loss) → silent 2D fallback. Deliberately no console.warn/error:
    // logging the Error object prints a noisy stack + triggers dev overlays
    // for an expected, fully-handled degradation path.
    // Narrow to a const alias so closures keep the non-null type.
    const glCtx: WebGL2RenderingContext = gl;
    const program = createProgram(glCtx, VERTEX_SRC, FRAGMENT_SRC);
    if (!program || cancelled) {
      if (program && !glCtx.isContextLost()) glCtx.deleteProgram(program);
      return setupFallback2D(wrap, canvas, mql);
    }

    glCtx.useProgram(program);

    // fullscreen triangle (covers viewport, no index buffer)
    const posBuf = glCtx.createBuffer();
    if (!posBuf) {
      glCtx.deleteProgram(program);
      return setupFallback2D(wrap, canvas, mql);
    }
    glCtx.bindBuffer(glCtx.ARRAY_BUFFER, posBuf);
    // 3 verts: (-1,-1) (3,-1) (-1,3)
    glCtx.bufferData(
      glCtx.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      glCtx.STATIC_DRAW
    );
    const aPos = glCtx.getAttribLocation(program, "a_pos");
    // getAttribLocation returns -1 when the compiler optimizes the attribute
    // out — enabling index -1 raises GL errors, so guard it.
    if (aPos !== -1) {
      glCtx.enableVertexAttribArray(aPos);
      glCtx.vertexAttribPointer(aPos, 2, glCtx.FLOAT, false, 0, 0);
    }

    const uTime = glCtx.getUniformLocation(program, "u_time");
    const uRes = glCtx.getUniformLocation(program, "u_res");

    let raf = 0;
    let start = performance.now();
    let elapsed = 0;
    let hidden = document.hidden;
    let ro: ResizeObserver | null = null;
    // Fallback cleanup if we have to degrade mid-flight (context lost).
    let fallbackCleanup: (() => void) | null = null;

    const isDead = () =>
      cancelled || (typeof glCtx.isContextLost === "function" && glCtx.isContextLost());

    const resize = () => {
      if (isDead()) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = wrap.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        // css size via parent; canvas style already 100%
        glCtx.viewport(0, 0, w, h);
        glCtx.uniform2f(uRes, w, h);
      } else {
        // ensure viewport matches even if not resized
        glCtx.viewport(0, 0, canvas.width, canvas.height);
      }
      // draw once after resize so no blank frame
      if (reducedMotion || hidden) {
        glCtx.uniform1f(uTime, elapsed);
        glCtx.drawArrays(glCtx.TRIANGLES, 0, 3);
      }
    };

    // initial size before first draw
    resize();

    const render = (now: number) => {
      if (cancelled || reducedMotion || hidden) return;
      if (typeof glCtx.isContextLost === "function" && glCtx.isContextLost()) return;
      elapsed = (now - start) * 0.001;
      glCtx.uniform1f(uTime, elapsed);
      glCtx.drawArrays(glCtx.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(render);
    };

    // draw static first frame
    if (!isDead()) {
      glCtx.uniform1f(uTime, 0);
      glCtx.drawArrays(glCtx.TRIANGLES, 0, 3);
    }

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
      if (cancelled || isDead()) return;
      hidden = document.hidden;
      if (hidden) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        // capture elapsed so resume is seamless
        // elapsed already updated in last frame; keep it
      } else if (!reducedMotion) {
        // resume subtracting elapsed
        start = performance.now() - elapsed * 1000;
        raf = requestAnimationFrame(render);
      } else {
        // reduced-motion: just redraw static
        glCtx.uniform1f(uTime, elapsed);
        glCtx.drawArrays(glCtx.TRIANGLES, 0, 3);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    const onReduceChange = (e: MediaQueryListEvent) => {
      if (cancelled || isDead()) return;
      reducedMotion = e.matches;
      if (reducedMotion) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        glCtx.uniform1f(uTime, elapsed);
        glCtx.drawArrays(glCtx.TRIANGLES, 0, 3);
      } else if (!document.hidden) {
        start = performance.now() - elapsed * 1000;
        raf = requestAnimationFrame(render);
      }
    };
    mql.addEventListener?.("change", onReduceChange);

    // GPU process restart / tab suspension kills the backing context. The
    // next createShader/draw would no-op and return null — degrade to the
    // static 2D canvas instead of freezing on a black hero.
    const onContextLost = (e: Event) => {
      // preventDefault keeps the context restorable, but we don't wait for
      // restore — the 2D fallback is visually equivalent for this hero.
      e.preventDefault();
      if (cancelled || fallbackCleanup) return;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      fallbackCleanup = setupFallback2D(wrap, canvas, mql);
    };
    canvas.addEventListener("webglcontextlost", onContextLost);

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      mql.removeEventListener?.("change", onReduceChange);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      if (ro) ro.disconnect();
      if (fallbackCleanup) fallbackCleanup();
      // NOTE: intentionally no WEBGL_lose_context.loseContext() here.
      // The canvas owns a single backing GL context; killing it in cleanup
      // poisons React StrictMode's second effect mount (and Turbopack Fast
      // Refresh remounts) — getContext("webgl2") returns the same *lost*
      // context, createShader returns null, and dev logs a noisy
      // "shader create failed". Deleting our program/buffer is sufficient;
      // the browser reclaims the context when the canvas unmounts.
      if (typeof glCtx.isContextLost !== "function" || !glCtx.isContextLost()) {
        glCtx.deleteProgram(program);
        glCtx.deleteBuffer(posBuf);
        glCtx.bindBuffer(glCtx.ARRAY_BUFFER, null);
        glCtx.useProgram(null);
      }
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
