"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const CYAN = new THREE.Color("#06b6d4");
const CYAN_DIM = new THREE.Color("#0e7490");

function ConstellationPoints() {
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);

  const { sLineGeo, sPointsGeo, sPointSizes, bgGeo, bgSizes } = useMemo(() => {
    const sPoints: [number, number][] = [];
    const segments = 60;
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      const x = Math.sin(t) * 0.42;
      const y = Math.cos(t * 2) * 0.28;
      sPoints.push([x, y]);
    }

    const sPos = new Float32Array(sPoints.length * 3);
    for (let i = 0; i < sPoints.length; i++) {
      sPos[i * 3] = sPoints[i][0];
      sPos[i * 3 + 1] = sPoints[i][1];
      sPos[i * 3 + 2] = 0;
    }
    const sPointSizes = new Float32Array(sPoints.length);
    for (let i = 0; i < sPoints.length; i++) {
      sPointSizes[i] = 1.5 + Math.random() * 1.5;
    }
    const sPointsGeo = new THREE.BufferGeometry();
    sPointsGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));

    const linePos = new Float32Array((sPoints.length - 1) * 6);
    const lineCol = new Float32Array((sPoints.length - 1) * 6);
    for (let i = 0; i < sPoints.length - 1; i++) {
      linePos[i * 6] = sPoints[i][0];
      linePos[i * 6 + 1] = sPoints[i][1];
      linePos[i * 6 + 2] = 0;
      linePos[i * 6 + 3] = sPoints[i + 1][0];
      linePos[i * 6 + 4] = sPoints[i + 1][1];
      linePos[i * 6 + 5] = 0;
      const c1 = CYAN_DIM.toArray();
      const c2 = CYAN.toArray();
      lineCol[i * 6] = c1[0]; lineCol[i * 6 + 1] = c1[1]; lineCol[i * 6 + 2] = c1[2];
      lineCol[i * 6 + 3] = c2[0]; lineCol[i * 6 + 4] = c2[1]; lineCol[i * 6 + 5] = c2[2];
    }
    const sLineGeo = new THREE.BufferGeometry();
    sLineGeo.setAttribute("position", new THREE.BufferAttribute(linePos, 3));
    sLineGeo.setAttribute("color", new THREE.BufferAttribute(lineCol, 3));

    const bgCount = 30;
    const bgPos = new Float32Array(bgCount * 3);
    const bgSizes = new Float32Array(bgCount);
    for (let i = 0; i < bgCount; i++) {
      bgPos[i * 3] = (Math.random() - 0.5) * 1.8;
      bgPos[i * 3 + 1] = (Math.random() - 0.5) * 1.4;
      bgPos[i * 3 + 2] = 0;
      bgSizes[i] = 0.5 + Math.random() * 1.0;
    }
    const bgGeo = new THREE.BufferGeometry();
    bgGeo.setAttribute("position", new THREE.BufferAttribute(bgPos, 3));

    return { sLineGeo, sPointsGeo, sPointSizes, bgGeo, bgSizes };
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(t * 0.3) * 0.06;
      groupRef.current.position.y = Math.sin(t * 0.5) * 0.02;
    }
    if (linesRef.current) {
      const mat = linesRef.current.material as THREE.LineBasicMaterial;
      mat.opacity = 0.5 + Math.sin(t * 1.5) * 0.15;
    }
  });

  useEffect(() => {
    return () => {
      sLineGeo.dispose();
      sPointsGeo.dispose();
      bgGeo.dispose();
    };
  }, [sLineGeo, sPointsGeo, bgGeo]);

  return (
    <group ref={groupRef}>
      <points ref={pointsRef} geometry={sPointsGeo}>
        <pointsMaterial
          size={2}
          color={CYAN}
          transparent
          opacity={0.9}
          sizeAttenuation={false}
          depthWrite={false}
        />
      </points>

      <lineSegments ref={linesRef} geometry={sLineGeo}>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.5}
          linewidth={1}
        />
      </lineSegments>

      <points geometry={bgGeo}>
        <pointsMaterial
          size={1.2}
          color={CYAN_DIM}
          transparent
          opacity={0.35}
          sizeAttenuation={false}
          depthWrite={false}
        />
      </points>
    </group>
  );
}

interface ConstellationSProps {
  className?: string;
  size?: number;
}

export function ConstellationS({ className, size = 32 }: ConstellationSProps) {
  return (
    <div className={className} style={{ width: size, height: size }}>
      <Canvas
        orthographic
        camera={{ zoom: 60, position: [0, 0, 5] }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: "transparent" }}
        dpr={[1, 2]}
      >
        <ConstellationPoints />
      </Canvas>
    </div>
  );
}
