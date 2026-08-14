"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function SyncPulse() {
  const groupRef = useRef<THREE.Group>(null);
  const ringCount = 4;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        if (child instanceof THREE.Mesh) {
          const scale = 0.5 + ((t * 0.3 + i * 0.8) % 3) * 0.5;
          child.scale.set(scale, scale, 1);
          const mat = child.material as THREE.MeshBasicMaterial;
          mat.opacity = Math.max(0, 0.1 - ((t * 0.3 + i * 0.8) % 3) * 0.03);
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: ringCount }, (_, i) => (
        <mesh key={i}>
          <ringGeometry args={[0.8, 0.85, 64]} />
          <meshBasicMaterial color="#06b6d4" transparent opacity={0.1} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

export function SyncPulseBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      <Canvas orthographic camera={{ zoom: 50, position: [0, 0, 5] }} gl={{ alpha: true }} dpr={[1, 1.5]} style={{ pointerEvents: "none" }}>
        <SyncPulse />
      </Canvas>
    </div>
  );
}
