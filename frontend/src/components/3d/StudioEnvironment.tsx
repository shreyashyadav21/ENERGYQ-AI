import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Environment,
  ContactShadows,
  Sparkles,
  Grid,
  useTexture
} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, SMAA } from '@react-three/postprocessing';
import * as THREE from 'three';
import { IndustrialFloodlight, SafetyChevronRing, useIndustrialTextures } from './IndustrialKit';

// ─── Atmospheric Vertical Gradient Sky Dome ──────────────────────────────────
const SkyDomeVertexShader = `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const SkyDomeFragmentShader = `
  varying vec3 vWorldPosition;

  void main() {
    // Normalized elevation from -1 (nadir) to +1 (zenith)
    float h = normalize(vWorldPosition).y;

    // Atmospheric palette
    vec3 zenithColor   = vec3(0.024, 0.071, 0.169); // #06122B Deep midnight sapphire
    vec3 midSkyColor   = vec3(0.055, 0.161, 0.329); // #0E2954 Twilight electric blue
    vec3 horizonColor  = vec3(0.043, 0.310, 0.424); // #0B4F6C Cyan-emerald horizon haze
    vec3 nadirColor    = vec3(0.016, 0.043, 0.094); // #040B18 Ground void

    vec3 sky;
    if (h > 0.35) {
      float t = (h - 0.35) / 0.65;
      sky = mix(midSkyColor, zenithColor, clamp(t, 0.0, 1.0));
    } else if (h >= 0.0) {
      float t = h / 0.35;
      sky = mix(horizonColor, midSkyColor, clamp(t, 0.0, 1.0));
    } else {
      float t = clamp(-h * 4.0, 0.0, 1.0);
      sky = mix(horizonColor, nadirColor, t);
    }

    // Subtle atmospheric stars / horizon noise
    gl_FragColor = vec4(sky, 1.0);
  }
`;

const AtmosphericSkyDome: React.FC = () => {
  const uniforms = useMemo(() => ({}), []);

  return (
    <mesh raycast={() => null}>
      <sphereGeometry args={[120, 32, 32]} />
      <shaderMaterial
        vertexShader={SkyDomeVertexShader}
        fragmentShader={SkyDomeFragmentShader}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
};

// ─── Distant Bengaluru Smart-City Skyline Silhouette ──────────────────────────
const BengaluruSkylineRing: React.FC = () => {
  const buildingCount = 90;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const windowsRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const towers = useMemo(() => {
    const list = [];
    const seeded = (seed: number) => {
      const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
      return value - Math.floor(value);
    };

    for (let i = 0; i < buildingCount; i++) {
      const angle = (i / buildingCount) * Math.PI * 2 + (seeded(i + 1) - 0.5) * 0.06;
      const radius = 38 + (i % 3) * 8 + seeded(i + 101) * 6;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const height = 5 + seeded(i + 201) * 18 + (i % 5 === 0 ? 10 : 0);
      const width = 1.8 + seeded(i + 301) * 2.4;
      const depth = 1.8 + seeded(i + 401) * 2.4;
      list.push({ x, z, height, width, depth, angle });
    }
    return list;
  }, [buildingCount]);

  const windowLights = useMemo(() => {
    const lights: {
      position: [number, number, number];
      rotation: number;
      width: number;
      color: THREE.Color;
    }[] = [];
    const seeded = (seed: number) => {
      const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
      return value - Math.floor(value);
    };

    towers.forEach((tower, towerIndex) => {
      const yaw = -tower.angle + Math.PI / 2;
      const columns = Math.max(2, Math.floor(tower.width / 0.8));
      const floors = Math.floor(tower.height / 1.5);

      for (let floor = 0; floor < floors; floor++) {
        for (let column = 0; column < columns; column++) {
          const seed = towerIndex * 997 + floor * 37 + column * 13;
          if (seeded(seed) < 0.48) continue;

          const localX = ((column + 1) / (columns + 1) - 0.5) * tower.width;
          const localZ = -tower.depth / 2 - 0.015;
          const cosYaw = Math.cos(yaw);
          const sinYaw = Math.sin(yaw);
          lights.push({
            position: [
              tower.x + localX * cosYaw + localZ * sinYaw,
              1.0 + floor * 1.5,
              tower.z - localX * sinYaw + localZ * cosYaw,
            ],
            rotation: yaw,
            width: Math.min(0.28, tower.width / (columns + 1) * 0.35),
            color: new THREE.Color(seed % 3 === 0 ? '#ffd59a' : '#b9d8ff'),
          });
        }
      }
    });

    return lights;
  }, [towers]);

  React.useEffect(() => {
    if (!meshRef.current) return;
    towers.forEach((t, i) => {
      dummy.position.set(t.x, t.height / 2, t.z);
      dummy.scale.set(t.width, t.height, t.depth);
      dummy.rotation.y = -t.angle + Math.PI / 2;
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [towers, dummy]);

  React.useEffect(() => {
    if (!windowsRef.current) return;
    windowLights.forEach((windowLight, i) => {
      dummy.position.set(...windowLight.position);
      dummy.rotation.set(0, windowLight.rotation, 0);
      dummy.scale.set(windowLight.width, 0.34, 0.035);
      dummy.updateMatrix();
      windowsRef.current!.setMatrixAt(i, dummy.matrix);
      windowsRef.current!.setColorAt(i, windowLight.color);
    });
    windowsRef.current.instanceMatrix.needsUpdate = true;
    if (windowsRef.current.instanceColor) windowsRef.current.instanceColor.needsUpdate = true;
  }, [windowLights, dummy]);

  return (
    <>
      <instancedMesh ref={meshRef} args={[undefined, undefined, buildingCount]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#142033"
          emissive="#1e3a5f"
          emissiveIntensity={0.12}
          roughness={0.45}
          metalness={0.55}
        />
      </instancedMesh>
      <instancedMesh ref={windowsRef} args={[undefined, undefined, windowLights.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial vertexColors toneMapped={false} />
      </instancedMesh>
    </>
  );
};

// ─── Distant Wind Turbines on Horizon ─────────────────────────────────────────
const DistantWindTurbines: React.FC = () => {
  const bladesRef = useRef<THREE.Group[]>([]);

  // 6 Turbines along distant horizon
  const turbines = useMemo(
    () => [
      { x: -44, z: -32, height: 16 },
      { x: -52, z: 12, height: 18 },
      { x: -35, z: 46, height: 15 },
      { x: 38, z: -42, height: 17 },
      { x: 48, z: 16, height: 19 },
      { x: 42, z: 40, height: 16 },
    ],
    []
  );

  useFrame((_, delta) => {
    bladesRef.current.forEach((g) => {
      if (g) g.rotation.z += delta * 1.2;
    });
  });

  return (
    <group>
      {turbines.map((t, idx) => (
        <group key={idx} position={[t.x, 0, t.z]}>
          {/* Mast */}
          <mesh position={[0, t.height / 2, 0]}>
            <cylinderGeometry args={[0.15, 0.35, t.height, 12]} />
            <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* Nacelle hub */}
          <mesh position={[0, t.height, 0]}>
            <sphereGeometry args={[0.4, 12, 12]} />
            <meshStandardMaterial color="#475569" metalness={0.9} />
          </mesh>
          {/* 3 Rotating Blades */}
          <group position={[0, t.height, 0.45]} ref={(el) => { if (el) bladesRef.current[idx] = el; }}>
            {[0, 1, 2].map((b) => (
              <mesh key={b} rotation={[0, 0, (b * Math.PI * 2) / 3]} position={[0, 0, 0]}>
                <boxGeometry args={[0.1, 4.2, 0.02]} />
                <meshStandardMaterial color="#94A3B8" emissive="#00F5D4" emissiveIntensity={0.15} />
              </mesh>
            ))}
          </group>
        </group>
      ))}
    </group>
  );
};

// ─── Curved Panoramic 3D Render Horizon Backdrop ─────────────────────────────
const CurvedPanoramicRenderBackdrop: React.FC<{ imageUrl: string; radius?: number; height?: number }> = ({
  imageUrl,
  radius = 65,
  height = 42,
}) => {
  const texture = useTexture(imageUrl);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  return (
    <mesh position={[0, height / 2 - 5, 0]} rotation={[0, -Math.PI / 2, 0]} raycast={() => null}>
      <cylinderGeometry args={[radius, radius, height, 64, 1, true, 0, Math.PI * 2]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} toneMapped={false} />
    </mesh>
  );
};

interface StudioEnvironmentProps {
  children?: React.ReactNode;
  pedestalRadius?: number;
  laserColor?: string;
  sparklesColor?: string;
  enablePostprocessing?: boolean;
  theme?: 'consumer' | 'operator';
  backdropMode?: 'render' | 'cyber' | 'minimal';
}

export const StudioEnvironment: React.FC<StudioEnvironmentProps> = ({
  children,
  pedestalRadius = 14,
  laserColor,
  sparklesColor,
  enablePostprocessing = true,
  theme = 'consumer',
  backdropMode = 'render',
}) => {
  const effectiveLaserColor = laserColor || (theme === 'consumer' ? '#00F5D4' : '#3B82F6');
  const effectiveSparklesColor = sparklesColor || (theme === 'consumer' ? '#00F5D4' : '#38BDF8');
  const renderBackdropImage = theme === 'consumer' ? '/images/consumer-smart-villa-v2.jpg' : '/images/bescom-bengaluru-grid-v2.jpg';

  const { concrete, asphalt } = useIndustrialTextures();
  const beaconRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (beaconRef.current) {
      const mat = beaconRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.35 + Math.sin(state.clock.elapsedTime * 1.6) * 0.2;
    }
  });

  return (
    <>
      <fog attach="fog" args={[theme === 'consumer' ? '#081226' : '#040b18', 35, 95]} />

      <hemisphereLight args={[theme === 'consumer' ? '#8fb4d9' : '#5c86b8', '#1a1612', 0.45]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[16, 22, 10]}
        intensity={1.85}
        color={theme === 'consumer' ? '#fff1d6' : '#cce3ff'}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={70}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-bias={-0.00015}
      />
      <directionalLight position={[-14, 8, -12]} intensity={0.4} color={theme === 'consumer' ? '#3b6ea5' : '#1d4ed8'} />

      {/* PBR reflections only -- DO NOT pass background so custom 3D horizon & sky is visible */}
      <Environment
        files="/images/wide-street-2k.hdr"
        environmentIntensity={0.65}
      />

      {/* ── 3D Horizon & Sky Backdrops ── */}
      <AtmosphericSkyDome />

      {backdropMode === 'render' && (
        <React.Suspense fallback={null}>
          <CurvedPanoramicRenderBackdrop imageUrl={renderBackdropImage} />
        </React.Suspense>
      )}

      {backdropMode === 'cyber' && (
        <>
          <BengaluruSkylineRing />
          <DistantWindTurbines />
        </>
      )}

      <Grid
        position={[0, -0.18, 0]}
        args={[90, 90]}
        infiniteGrid
        fadeDistance={62}
        fadeStrength={2.8}
        cellColor={theme === 'consumer' ? '#1e3a4c' : '#0d274d'}
        sectionColor={theme === 'consumer' ? '#2f6f7c' : '#2563eb'}
        cellSize={1.5}
        sectionSize={6}
        cellThickness={0.35}
        sectionThickness={0.8}
      />

      <group position={[0, -0.12, 0]}>
        <mesh position={[0, -0.12, 0]} receiveShadow raycast={() => null}>
          <cylinderGeometry args={[pedestalRadius + 0.8, pedestalRadius + 1.3, 0.28, 64]} />
          <meshStandardMaterial map={asphalt} color="#2a2d31" roughness={0.92} metalness={0.08} />
        </mesh>
        <mesh position={[0, 0.02, 0]} receiveShadow raycast={() => null}>
          <cylinderGeometry args={[pedestalRadius, pedestalRadius + 0.15, 0.08, 64]} />
          <meshStandardMaterial map={concrete} roughness={0.86} metalness={0.12} />
        </mesh>
        <SafetyChevronRing radius={pedestalRadius - 0.35} />
        <mesh ref={beaconRef} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
          <ringGeometry args={[pedestalRadius - 0.08, pedestalRadius + 0.04, 72]} />
          <meshStandardMaterial
            color={effectiveLaserColor}
            emissive={effectiveLaserColor}
            emissiveIntensity={0.4}
            transparent
            opacity={0.55}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      <IndustrialFloodlight position={[pedestalRadius - 1.2, 0, pedestalRadius - 2.4]} intensity={22} color={theme === 'consumer' ? '#ffffff' : '#93c5fd'} />
      <IndustrialFloodlight position={[-pedestalRadius + 1.4, 0, pedestalRadius - 2.2]} intensity={18} color={theme === 'consumer' ? '#ffffff' : '#38bdf8'} />
      <IndustrialFloodlight position={[pedestalRadius - 2.0, 0, -pedestalRadius + 2.0]} intensity={16} color={theme === 'consumer' ? '#ffe9b8' : '#f59e0b'} />

      <ContactShadows position={[0, -0.08, 0]} opacity={0.82} scale={30} blur={1.8} far={10} />

      <Sparkles count={28} scale={18} size={0.9} speed={0.15} color={effectiveSparklesColor} />

      {children}

      {enablePostprocessing && (
        <EffectComposer multisampling={2}>
          <SMAA />
          <Bloom mipmapBlur luminanceThreshold={0.85} intensity={0.55} radius={0.55} />
          <Vignette offset={0.28} darkness={0.42} />
        </EffectComposer>
      )}
    </>
  );
};

export default StudioEnvironment;
