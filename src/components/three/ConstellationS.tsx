"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const CYAN = new THREE.Color("#06b6d4");
const EMERALD = new THREE.Color("#10b981");
const POINT_COUNT = 48;

/** A calligraphic "S" stroke: two opposing arcs sharing a waist point. */
function buildSCurve(): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>();
  path.add(
    new THREE.CubicBezierCurve3(
      new THREE.Vector3(0.32, 0.42, 0),
      new THREE.Vector3(-0.4, 0.5, 0),
      new THREE.Vector3(-0.4, 0.1, 0),
      new THREE.Vector3(0, 0, 0),
    ),
  );
  path.add(
    new THREE.CubicBezierCurve3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.4, -0.1, 0),
      new THREE.Vector3(0.4, -0.5, 0),
      new THREE.Vector3(-0.32, -0.42, 0),
    ),
  );
  return path;
}

function ConstellationPoints() {
  const groupRef = useRef<THREE.Group>(null);

  const { pointsGeo, lineGeo } = useMemo(() => {
    const points = buildSCurve().getSpacedPoints(POINT_COUNT - 1);

    const positions = new Float32Array(POINT_COUNT * 3);
    const colors = new Float32Array(POINT_COUNT * 3);
    for (let i = 0; i < POINT_COUNT; i++) {
      const p = points[i];
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = 0;

      const color = CYAN.clone().lerp(EMERALD, i / (POINT_COUNT - 1));
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    pointsGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const linePositions = new Float32Array((POINT_COUNT - 1) * 6);
    const lineColors = new Float32Array((POINT_COUNT - 1) * 6);
    for (let i = 0; i < POINT_COUNT - 1; i++) {
      linePositions.set([positions[i * 3], positions[i * 3 + 1], 0], i * 6);
      linePositions.set([positions[(i + 1) * 3], positions[(i + 1) * 3 + 1], 0], i * 6 + 3);
      lineColors.set([colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2]], i * 6);
      lineColors.set([colors[(i + 1) * 3], colors[(i + 1) * 3 + 1], colors[(i + 1) * 3 + 2]], i * 6 + 3);
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    lineGeo.setAttribute("color", new THREE.BufferAttribute(lineColors, 3));

    return { pointsGeo, lineGeo };
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.z = Math.sin(t * 0.3) * 0.06;
    groupRef.current.position.y = Math.sin(t * 0.5) * 0.02;
  });

  return (
    <group ref={groupRef}>
      <lineSegments geometry={lineGeo}>
        <lineBasicMaterial vertexColors transparent opacity={0.6} />
      </lineSegments>
      <points geometry={pointsGeo}>
        <pointsMaterial vertexColors size={2.4} sizeAttenuation={false} transparent opacity={0.95} depthWrite={false} />
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
