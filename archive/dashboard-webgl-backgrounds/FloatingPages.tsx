"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function FloatingPages() {
  const groupRef = useRef<THREE.Group>(null);
  const count = 12;

  const pages = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 10,
      y: (Math.random() - 0.5) * 7,
      rot: Math.random() * Math.PI * 2,
      speed: 0.1 + Math.random() * 0.2,
      phase: Math.random() * Math.PI * 2,
    }));
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        const page = pages[i];
        child.position.x = page.x + Math.sin(t * page.speed + page.phase) * 0.3;
        child.position.y = page.y + Math.cos(t * page.speed * 0.7 + page.phase) * 0.2;
        child.rotation.z = page.rot + Math.sin(t * page.speed * 0.5) * 0.1;
      });
    }
  });

  return (
    <group ref={groupRef}>
      {pages.map((page, i) => (
        <mesh key={i} position={[page.x, page.y, 0]}>
          <planeGeometry args={[0.4, 0.5]} />
          <meshBasicMaterial color="#e2e8f0" transparent opacity={0.04} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

export function FloatingPagesBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      <Canvas
        orthographic
        camera={{ zoom: 50, position: [0, 0, 5] }}
        gl={{ alpha: true }}
        dpr={[1, 1.5]}
        style={{ pointerEvents: "none" }}
      >
        <FloatingPages />
      </Canvas>
    </div>
  );
}
