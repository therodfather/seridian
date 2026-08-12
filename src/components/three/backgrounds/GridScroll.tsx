"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Grid() {
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ref.current) {
      ref.current.position.y = -((t * 0.1) % 1);
    }
  });

  const lines = useMemo(() => {
    const positions: number[] = [];
    const gridSize = 12;
    const spacing = 0.8;
    for (let i = -gridSize; i <= gridSize; i++) {
      const x = i * spacing;
      positions.push(x, -gridSize, 0, x, gridSize, 0);
      positions.push(-gridSize, i * spacing, 0, gridSize, i * spacing, 0);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, []);

  return (
    <group ref={ref}>
      <lineSegments geometry={lines}>
        <lineBasicMaterial color="#06b6d4" transparent opacity={0.03} />
      </lineSegments>
    </group>
  );
}

export function GridBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      <Canvas orthographic camera={{ zoom: 50, position: [0, 0, 5] }} gl={{ alpha: true }} dpr={[1, 1.5]}>
        <Grid />
      </Canvas>
    </div>
  );
}
