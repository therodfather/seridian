"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Aurora() {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ref.current) {
      const mat = ref.current.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value = t;
    }
  });

  const shader = useMemo(
    () => ({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          float wave1 = sin(vUv.x * 3.0 + uTime * 0.3) * 0.5 + 0.5;
          float wave2 = sin(vUv.x * 5.0 - uTime * 0.2 + 1.5) * 0.5 + 0.5;
          float wave3 = cos(vUv.x * 2.0 + uTime * 0.15) * 0.5 + 0.5;
          float y = vUv.y;
          float band1 = smoothstep(0.3, 0.5, y) * smoothstep(0.7, 0.5, y) * wave1;
          float band2 = smoothstep(0.4, 0.55, y) * smoothstep(0.65, 0.5, y) * wave2;
          vec3 green = vec3(0.1, 0.8, 0.4);
          vec3 cyan = vec3(0.0, 0.7, 0.8);
          vec3 purple = vec3(0.5, 0.2, 0.8);
          vec3 col = green * band1 * 0.15 + cyan * band2 * 0.1 + purple * wave3 * 0.05;
          float alpha = (band1 + band2) * 0.12;
          gl_FragColor = vec4(col, alpha);
        }
      `,
    }),
    [],
  );

  return (
    <mesh ref={ref} position={[0, 0, 0]}>
      <planeGeometry args={[14, 10]} />
      <shaderMaterial
        {...shader}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export function AuroraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      <Canvas orthographic camera={{ zoom: 50, position: [0, 0, 5] }} gl={{ alpha: true }} dpr={[1, 1.5]}>
        <Aurora />
      </Canvas>
    </div>
  );
}
