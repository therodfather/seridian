"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Waves() {
  const ref = useRef<THREE.Mesh>(null);

  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(14, 10, 40, 40);
    return g;
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const geo = ref.current.geometry as THREE.PlaneGeometry;
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = Math.sin(x * 0.8 + t * 0.4) * 0.15 + Math.cos(y * 0.6 + t * 0.3) * 0.1;
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
  });

  return (
    <mesh ref={ref} geometry={geo} rotation={[-Math.PI / 2.5, 0, 0]} position={[0, -1, 0]}>
      <meshBasicMaterial color="#0e7490" wireframe transparent opacity={0.06} />
    </mesh>
  );
}

export function LiquidBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      <Canvas orthographic camera={{ zoom: 50, position: [0, 3, 8] }} gl={{ alpha: true }} dpr={[1, 1.5]}>
        <Waves />
      </Canvas>
    </div>
  );
}
