"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Beams() {
  const groupRef = useRef<THREE.Group>(null);
  const count = 8;

  const beams = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      x: (i - count / 2) * 1.5 + Math.random() * 0.5,
      width: 0.02 + Math.random() * 0.03,
      speed: 0.2 + Math.random() * 0.3,
      phase: Math.random() * Math.PI * 2,
      opacity: 0.03 + Math.random() * 0.04,
    }));
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        const beam = beams[i];
        if (child instanceof THREE.Mesh) {
          child.position.y = Math.sin(t * beam.speed + beam.phase) * 2;
          child.material.opacity = beam.opacity * (0.5 + Math.sin(t * beam.speed * 0.5 + beam.phase) * 0.5);
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {beams.map((beam, i) => (
        <mesh key={i} position={[beam.x, 0, 0]}>
          <planeGeometry args={[beam.width, 12]} />
          <meshBasicMaterial color="#06b6d4" transparent opacity={beam.opacity} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

export function LightBeamsBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      <Canvas orthographic camera={{ zoom: 50, position: [0, 0, 5] }} gl={{ alpha: true }} dpr={[1, 1.5]} style={{ pointerEvents: "none" }}>
        <Beams />
      </Canvas>
    </div>
  );
}
