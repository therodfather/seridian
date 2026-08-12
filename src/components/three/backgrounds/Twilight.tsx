"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Twilight() {
  const ref = useRef<THREE.Points>(null);
  const count = 80;

  const geo = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const palette = [
      new THREE.Color("#7c3aed"),
      new THREE.Color("#a855f7"),
      new THREE.Color("#06b6d4"),
      new THREE.Color("#f59e0b"),
    ];
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 8;
      pos[i * 3 + 2] = 0;
      const c = palette[Math.floor(Math.random() * palette.length)].toArray();
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ref.current) {
      ref.current.rotation.z = t * 0.005;
      const posAttr = ref.current.geometry.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < count; i++) {
        arr[i * 3 + 1] += Math.sin(t * 0.3 + i) * 0.002;
      }
      posAttr.needsUpdate = true;
    }
  });

  useEffect(() => () => geo.dispose(), [geo]);

  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.06} vertexColors transparent opacity={0.3} sizeAttenuation={false} depthWrite={false} />
    </points>
  );
}

export function TwilightBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      <Canvas orthographic camera={{ zoom: 50, position: [0, 0, 5] }} gl={{ alpha: true }} dpr={[1, 1.5]}>
        <Twilight />
      </Canvas>
    </div>
  );
}
