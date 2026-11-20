import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ThermalAndArcEffectsProps {
  position: [number, number, number];
  oilTempC: number;
  isCritical: boolean;
}

export const ThermalAndArcEffects: React.FC<ThermalAndArcEffectsProps> = ({
  position,
  oilTempC,
  isCritical,
}) => {
  const isOverheating = oilTempC > 75.0;

  // 1. Rising Thermal Plume Particles
  const plumeCount = 28;
  const plumeMeshRef = useRef<THREE.InstancedMesh>(null);
  const plumeDummy = useMemo(() => new THREE.Object3D(), []);
  const plumeOffsets = useMemo(
    () =>
      Array.from({ length: plumeCount }, () => ({
        x: (Math.random() - 0.5) * 1.2,
        y: Math.random() * 2.5,
        z: (Math.random() - 0.5) * 1.2,
        speed: 0.6 + Math.random() * 0.8,
        drift: (Math.random() - 0.5) * 0.3,
      })),
    [plumeCount]
  );

  // 2. Concentric Ground Shockwave Rings
  const shockwaveRef = useRef<THREE.Mesh>(null);
  const shockwaveRef2 = useRef<THREE.Mesh>(null);

  // 3. Electric Arc Micro-Sparks
  const arcLineRef = useRef<THREE.LineSegments>(null);
  const arcGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(24 * 3); // 12 line segments
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const clampedDelta = Math.min(delta, 0.05);

    // Update rising thermal particles
    if (plumeMeshRef.current && isOverheating) {
      for (let i = 0; i < plumeCount; i++) {
        const p = plumeOffsets[i];
        p.y += clampedDelta * p.speed * (oilTempC > 85 ? 1.5 : 1.0);
        if (p.y > 3.2) {
          p.y = 0.2;
          p.x = (Math.random() - 0.5) * 1.0;
          p.z = (Math.random() - 0.5) * 1.0;
        }

        const hazeX = p.x + Math.sin(t * 5.0 + i) * 0.12;
        const hazeZ = p.z + Math.cos(t * 4.0 + i) * 0.12;
        const scale = 0.08 + (p.y / 3.2) * 0.16;

        plumeDummy.position.set(hazeX, p.y + 1.2, hazeZ);
        plumeDummy.scale.set(scale, scale * 1.5, scale);
        plumeDummy.updateMatrix();

        plumeMeshRef.current.setMatrixAt(i, plumeDummy.matrix);
      }
      plumeMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // Update ground shockwaves when critical
    if (shockwaveRef.current && isCritical) {
      const s1 = (t * 2.0) % 2.5;
      shockwaveRef.current.scale.set(s1, s1, s1);
      const mat = shockwaveRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 1.0 - s1 / 2.5) * 0.8;
    }

    if (shockwaveRef2.current && isCritical) {
      const s2 = (t * 2.0 + 1.25) % 2.5;
      shockwaveRef2.current.scale.set(s2, s2, s2);
      const mat2 = shockwaveRef2.current.material as THREE.MeshBasicMaterial;
      mat2.opacity = Math.max(0, 1.0 - s2 / 2.5) * 0.6;
    }

    // Update electric arc micro-sparks
    if (arcLineRef.current && (isCritical || oilTempC > 85.0)) {
      const positions = arcGeometry.attributes.position.array as Float32Array;
      const flash = Math.sin(t * 30.0) > 0.1;

      for (let i = 0; i < 24; i += 6) {
        if (flash) {
          // Spark origins from high-voltage bushings (y ~ 2.2) to body
          const startX = (Math.random() - 0.5) * 1.2;
          const startY = 2.2 + (Math.random() - 0.5) * 0.3;
          const startZ = 0.4 + (Math.random() - 0.5) * 0.3;

          positions[i] = startX;
          positions[i + 1] = startY;
          positions[i + 2] = startZ;

          positions[i + 3] = startX + (Math.random() - 0.5) * 0.5;
          positions[i + 4] = startY - 0.4 - Math.random() * 0.5;
          positions[i + 5] = startZ + (Math.random() - 0.5) * 0.5;
        } else {
          positions[i] = 0;
          positions[i + 1] = 0;
          positions[i + 2] = 0;
          positions[i + 3] = 0;
          positions[i + 4] = 0;
          positions[i + 5] = 0;
        }
      }
      arcGeometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group position={position}>
      {/* 1. Rising Thermal Haze Particle Plume */}
      {isOverheating && (
        <instancedMesh ref={plumeMeshRef} args={[undefined, undefined, plumeCount]}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial
            color={oilTempC > 85 ? '#EF4444' : '#F59E0B'}
            transparent
            opacity={0.65}
            toneMapped={false}
          />
        </instancedMesh>
      )}

      {/* 2. Concentric Ground Shockwave Pulses */}
      {isCritical && (
        <>
          <mesh ref={shockwaveRef} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.5, 1.7, 32]} />
            <meshBasicMaterial color="#EF4444" transparent opacity={0.8} side={THREE.DoubleSide} />
          </mesh>
          <mesh ref={shockwaveRef2} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.5, 1.7, 32]} />
            <meshBasicMaterial color="#F59E0B" transparent opacity={0.6} side={THREE.DoubleSide} />
          </mesh>
        </>
      )}

      {/* 3. Electric Arc Micro-Sparks */}
      {(isCritical || oilTempC > 85.0) && (
        <lineSegments ref={arcLineRef} geometry={arcGeometry}>
          <lineBasicMaterial color="#38BDF8" linewidth={2} toneMapped={false} />
        </lineSegments>
      )}
    </group>
  );
};
