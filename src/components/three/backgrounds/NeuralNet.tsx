"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function NeuralNet() {
  const groupRef = useRef<THREE.Group>(null);
  const nodeCount = 30;
  const connectionDist = 2.5;

  const { nodeGeo, lineGeo } = useMemo(() => {
    const nodePos = new Float32Array(nodeCount * 3);
    const np: THREE.Vector3[] = [];
    for (let i = 0; i < nodeCount; i++) {
      const x = (Math.random() - 0.5) * 10;
      const y = (Math.random() - 0.5) * 7;
      nodePos[i * 3] = x;
      nodePos[i * 3 + 1] = y;
      nodePos[i * 3 + 2] = 0;
      np.push(new THREE.Vector3(x, y, 0));
    }
    const ng = new THREE.BufferGeometry();
    ng.setAttribute("position", new THREE.BufferAttribute(nodePos, 3));

    const lines: number[] = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        if (np[i].distanceTo(np[j]) < connectionDist) {
          lines.push(np[i].x, np[i].y, 0, np[j].x, np[j].y, 0);
        }
      }
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.Float32BufferAttribute(lines, 3));

    return { nodeGeo: ng, lineGeo: lg };
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(t * 0.1) * 0.03;
    }
  });

  useEffect(() => () => { nodeGeo.dispose(); lineGeo.dispose(); }, [nodeGeo, lineGeo]);

  return (
    <group ref={groupRef}>
      <lineSegments geometry={lineGeo}>
        <lineBasicMaterial color="#06b6d4" transparent opacity={0.06} />
      </lineSegments>
      <points geometry={nodeGeo}>
        <pointsMaterial size={0.05} color="#06b6d4" transparent opacity={0.2} sizeAttenuation={false} depthWrite={false} />
      </points>
    </group>
  );
}

export function NeuralBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      <Canvas orthographic camera={{ zoom: 50, position: [0, 0, 5] }} gl={{ alpha: true }} dpr={[1, 1.5]}>
        <NeuralNet />
      </Canvas>
    </div>
  );
}
