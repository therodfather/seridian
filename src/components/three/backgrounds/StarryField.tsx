"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Stars() {
  const ref = useRef<THREE.Points>(null);
  const count = 200;

  const geo = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 5;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ref.current) {
      ref.current.rotation.y = t * 0.01;
      ref.current.rotation.x = Math.sin(t * 0.005) * 0.1;
    }
  });

  useEffect(() => () => geo.dispose(), [geo]);

  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.03} color="#e0f2fe" transparent opacity={0.6} sizeAttenuation={false} depthWrite={false} />
    </points>
  );
}

export function StarryBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      <Canvas orthographic camera={{ zoom: 50, position: [0, 0, 5] }} gl={{ alpha: true }} dpr={[1, 1.5]}>
        <Stars />
      </Canvas>
    </div>
  );
}
