import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Grid, Sparkles, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { AuthRole } from '../../types/energy';

interface Login3DBackdropProps {
  hoveredRole: AuthRole | null;
}

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
    float h = normalize(vWorldPosition).y;
    vec3 zenithColor   = vec3(0.024, 0.071, 0.169); // #06122B Deep midnight sapphire
    vec3 midSkyColor   = vec3(0.055, 0.161, 0.329); // #0E2954 Twilight electric blue
    vec3 horizonColor  = vec3(0.043, 0.310, 0.424); // #0B4F6C Cyan-emerald horizon haze
    vec3 nadirColor    = vec3(0.016, 0.043, 0.094); // #040B18 Ground

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
    gl_FragColor = vec4(sky, 1.0);
  }
`;

// ─── Procedural Distant Skyline ───────────────────────────────────────────────
const DistantSkylineBackdrop: React.FC = () => {
  const count = 48;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const towers = useMemo(() => {
    const list = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI - Math.PI / 2; // Semi-circle behind
      const radius = 24 + (i % 2) * 5;
      const x = Math.cos(angle) * radius;
      const z = -Math.abs(Math.sin(angle)) * radius - 6;
      const height = 4 + (i % 5) * 2.5;
      const width = 1.6 + (i % 3) * 0.5;
      list.push({ x, z, height, width });
    }
    return list;
  }, [count]);

  React.useEffect(() => {
    if (!meshRef.current) return;
    towers.forEach((t, i) => {
      dummy.position.set(t.x, t.height / 2, t.z);
      dummy.scale.set(t.width, t.height, t.width);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [towers, dummy]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color="#081832"
        emissive="#00F5D4"
        emissiveIntensity={0.12}
        roughness={0.3}
        metalness={0.8}
      />
    </instancedMesh>
  );
};

// Interactive Central Power Core
const HolographicPowerCore = ({ hoveredRole }: { hoveredRole: AuthRole | null }) => {
  const outerIcosaRef = useRef<THREE.Mesh>(null);
  const innerSphereRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const speed = hoveredRole ? 2.5 : 1.0;

    if (outerIcosaRef.current) {
      outerIcosaRef.current.rotation.x = t * 0.4 * speed;
      outerIcosaRef.current.rotation.y = t * 0.6 * speed;
    }
    if (innerSphereRef.current) {
      const pulse = 1.0 + Math.sin(t * 4 * speed) * 0.12;
      innerSphereRef.current.scale.set(pulse, pulse, pulse);
    }
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = t * 0.8 * speed;
      ring1Ref.current.rotation.y = t * 0.3 * speed;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y = -t * 0.7 * speed;
      ring2Ref.current.rotation.z = t * 0.5 * speed;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.z = t * 0.9 * speed;
      ring3Ref.current.rotation.x = -t * 0.4 * speed;
    }
  });

  const coreColor =
    hoveredRole === 'consumer'
      ? '#00F5D4'
      : hoveredRole === 'operator'
      ? '#3B82F6'
      : '#00F0FF';

  return (
    <group position={[0, 1.4, 0]}>
      {/* Outer Cage Wireframe */}
      <mesh ref={outerIcosaRef}>
        <icosahedronGeometry args={[1.3, 1]} />
        <meshStandardMaterial
          color={coreColor}
          wireframe
          emissive={coreColor}
          emissiveIntensity={1.4}
          toneMapped={false}
        />
      </mesh>

      {/* Glowing Inner Energy Nucleus */}
      <mesh ref={innerSphereRef}>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshBasicMaterial color={coreColor} toneMapped={false} />
      </mesh>

      {/* Point Light radiating from core */}
      <pointLight color={coreColor} intensity={3.0} distance={10} decay={2} />

      {/* 3 Concentric Gimbal HUD Rings */}
      <mesh ref={ring1Ref}>
        <torusGeometry args={[1.7, 0.02, 16, 64]} />
        <meshBasicMaterial color={coreColor} toneMapped={false} transparent opacity={0.8} />
      </mesh>
      <mesh ref={ring2Ref}>
        <torusGeometry args={[2.0, 0.02, 16, 64]} />
        <meshBasicMaterial color={coreColor} toneMapped={false} transparent opacity={0.6} />
      </mesh>
      <mesh ref={ring3Ref}>
        <torusGeometry args={[2.3, 0.015, 16, 64]} />
        <meshBasicMaterial color="#38BDF8" toneMapped={false} transparent opacity={0.5} />
      </mesh>
    </group>
  );
};

// Left Side: Stylized 3D Smart Home Villa
const StylizedSmartHome = ({ isHovered }: { isHovered: boolean }) => {
  const homeColor = isHovered ? '#10B981' : '#00F5D4';
  const glowIntensity = isHovered ? 2.2 : 0.7;

  return (
    <group position={[-5.2, 0, -0.5]} rotation={[0, 0.45, 0]}>
      {/* Foundation plinth */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[3.4, 0.2, 2.8]} />
        <meshStandardMaterial color="#0F172A" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Main Ground Floor Living Pavilion */}
      <mesh position={[-0.4, 0.8, 0]}>
        <boxGeometry args={[2.2, 1.2, 2.4]} />
        <meshStandardMaterial
          color="#091122"
          emissive={homeColor}
          emissiveIntensity={glowIntensity * 0.3}
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>

      {/* Panoramic Glass Wall */}
      <mesh position={[-0.4, 0.8, 1.22]}>
        <planeGeometry args={[1.8, 0.9]} />
        <meshPhysicalMaterial
          color={homeColor}
          emissive={homeColor}
          emissiveIntensity={glowIntensity * 0.8}
          transmission={0.8}
          transparent
          opacity={0.85}
          roughness={0.1}
        />
      </mesh>

      {/* Upper Floor Cantilever Suite */}
      <mesh position={[0.2, 1.8, 0.2]}>
        <boxGeometry args={[2.2, 0.9, 2.2]} />
        <meshStandardMaterial
          color="#060E1D"
          emissive={homeColor}
          emissiveIntensity={glowIntensity * 0.4}
          metalness={0.85}
        />
      </mesh>

      {/* Rooftop Solar Array */}
      <group position={[0.2, 2.32, 0.2]} rotation={[-0.15, 0, 0]}>
        <mesh>
          <boxGeometry args={[1.9, 0.05, 1.8]} />
          <meshStandardMaterial
            color="#0F172A"
            emissive="#10B981"
            emissiveIntensity={isHovered ? 1.4 : 0.6}
            roughness={0.15}
            metalness={0.9}
          />
        </mesh>
      </group>

      {/* Garage with EV Charging Pod */}
      <mesh position={[1.4, 0.5, -0.2]}>
        <boxGeometry args={[1.2, 0.8, 2.0]} />
        <meshStandardMaterial color="#0A1324" />
      </mesh>

      {/* Ground Glow Ring */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.0, 2.3, 32]} />
        <meshBasicMaterial
          color={homeColor}
          transparent
          opacity={isHovered ? 0.8 : 0.25}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Floating Status Beacon */}
      <Float speed={3} floatIntensity={0.2}>
        <mesh position={[0, 2.8, 0]}>
          <octahedronGeometry args={[0.2, 0]} />
          <meshBasicMaterial color="#10B981" toneMapped={false} />
        </mesh>
      </Float>
    </group>
  );
};

// Right Side: Stylized 3D High-Voltage Substation Tower
const StylizedSubstationTower = ({ isHovered }: { isHovered: boolean }) => {
  const towerColor = isHovered ? '#00F0FF' : '#38BDF8';
  const glowIntensity = isHovered ? 2.0 : 0.6;

  return (
    <group position={[5.2, 0, -0.5]} rotation={[0, -0.45, 0]}>
      {/* Foundation Pad */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[2.8, 0.2, 2.4]} />
        <meshStandardMaterial color="#0F172A" metalness={0.8} />
      </mesh>

      {/* Transformer Core Oil Unit */}
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[1.6, 1.4, 1.4]} />
        <meshStandardMaterial
          color="#060E1D"
          emissive={towerColor}
          emissiveIntensity={glowIntensity * 0.4}
          metalness={0.85}
          roughness={0.2}
        />
      </mesh>

      {/* Radiator Fins */}
      {[-0.95, 0.95].map((x, idx) => (
        <group key={idx} position={[x, 0.8, 0]}>
          {[-0.4, 0, 0.4].map((z, fIdx) => (
            <mesh key={fIdx} position={[0, 0, z]}>
              <boxGeometry args={[0.2, 1.0, 0.06]} />
              <meshStandardMaterial color="#1E293B" metalness={0.9} />
            </mesh>
          ))}
        </group>
      ))}

      {/* High-Voltage Lattice Gantry Tower Structure */}
      <group position={[0, 2.2, 0]}>
        {[-0.4, 0.4].map((x, xi) =>
          [-0.4, 0.4].map((z, zi) => (
            <mesh key={`${xi}-${zi}`} position={[x, 0.5, z]}>
              <cylinderGeometry args={[0.03, 0.03, 2.0, 6]} />
              <meshBasicMaterial color={towerColor} transparent opacity={0.7} />
            </mesh>
          ))
        )}
        <mesh position={[0, 1.4, 0]}>
          <boxGeometry args={[2.4, 0.06, 0.12]} />
          <meshBasicMaterial color={towerColor} />
        </mesh>
        {[-1.0, 0, 1.0].map((x, i) => (
          <group key={i} position={[x, 1.0, 0]}>
            <mesh>
              <cylinderGeometry args={[0.08, 0.05, 0.5, 8]} />
              <meshStandardMaterial
                color="#64748B"
                emissive={towerColor}
                emissiveIntensity={glowIntensity * 0.8}
                toneMapped={false}
              />
            </mesh>
            <mesh position={[0, -0.3, 0]}>
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshBasicMaterial color={towerColor} toneMapped={false} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Ground High-Voltage Perimeter Ring */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.8, 2.1, 32]} />
        <meshBasicMaterial
          color={towerColor}
          transparent
          opacity={isHovered ? 0.85 : 0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Floating Tactical SCADA Reticle */}
      <Float speed={3} floatIntensity={0.25}>
        <mesh position={[0, 3.8, 0]}>
          <octahedronGeometry args={[0.2, 0]} />
          <meshBasicMaterial color="#00F0FF" toneMapped={false} />
        </mesh>
      </Float>
    </group>
  );
};

// Splitting Energy Stream Conduits
const SplittingConduitStream = ({
  start,
  end,
  color,
  active,
}: {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
  active: boolean;
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const particleCount = 18;
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const curve = useMemo(() => {
    const midY = Math.max(start[1], end[1]) + 0.6;
    const midX = (start[0] + end[0]) * 0.5;
    const midZ = (start[2] + end[2]) * 0.5;
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(...start),
      new THREE.Vector3(midX, midY, midZ),
      new THREE.Vector3(...end),
    ]);
  }, [start, end]);

  const offsets = useMemo(() => {
    return Array.from({ length: particleCount }, (_, i) => i / particleCount);
  }, [particleCount]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const speed = active ? 0.45 : 0.15;
    for (let i = 0; i < particleCount; i++) {
      offsets[i] = (offsets[i] + delta * speed) % 1.0;
      const pt = curve.getPointAt(offsets[i]);
      const tangent = curve.getTangentAt(offsets[i]);
      dummy.position.copy(pt);
      dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
      const s = active ? 0.08 : 0.04;
      dummy.scale.set(s, s * 2.0, s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, particleCount]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </instancedMesh>
  );
};

// Mouse Parallax Camera Rig
const ParallaxRig = () => {
  useFrame((state) => {
    const mouseX = state.pointer.x;
    const mouseY = state.pointer.y;

    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, mouseX * 1.8, 0.05);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, 2.2 + mouseY * 0.8, 0.05);
    state.camera.lookAt(0, 1.0, 0);
  });
  return null;
};

export const Login3DBackdrop: React.FC<Login3DBackdropProps> = ({ hoveredRole }) => {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden">
      <Canvas
        camera={{ position: [0, 2.2, 8.5], fov: 42 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        {/* Atmospheric Vertical Sky Dome */}
        <mesh>
          <sphereGeometry args={[60, 32, 32]} />
          <shaderMaterial
            vertexShader={SkyDomeVertexShader}
            fragmentShader={SkyDomeFragmentShader}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>

        {/* Soft Distance Fog */}
        <fog attach="fog" args={['#071630', 12, 36]} />

        <ParallaxRig />

        {/* Distant Bengaluru Skyline Silhouette */}
        <DistantSkylineBackdrop />

        {/* Ambient & Cinematic Accent Lights */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[6, 12, 6]} intensity={1.4} />
        <pointLight position={[-6, 4, 2]} color="#10B981" intensity={hoveredRole === 'consumer' ? 3.0 : 1.2} distance={15} />
        <pointLight position={[6, 4, 2]} color="#00F0FF" intensity={hoveredRole === 'operator' ? 3.0 : 1.2} distance={15} />

        {/* Atmospheric Particles */}
        <Sparkles count={50} scale={18} size={1.5} speed={0.3} color="#00F5D4" />

        {/* Holographic Cyber Floor Grid */}
        <Grid
          position={[0, -0.05, 0]}
          args={[50, 50]}
          infiniteGrid
          fadeDistance={30}
          fadeStrength={2.0}
          cellSize={1.2}
          cellColor="#0B2B47"
          sectionSize={4.8}
          sectionColor="#00F5D4"
        />

        <ContactShadows position={[0, -0.04, 0]} opacity={0.65} scale={22} blur={2.0} far={6} />

        {/* Central Power Core */}
        <HolographicPowerCore hoveredRole={hoveredRole} />

        {/* Left Side: Smart Home Villa */}
        <StylizedSmartHome isHovered={hoveredRole === 'consumer'} />

        {/* Right Side: Substation Gantry Tower */}
        <StylizedSubstationTower isHovered={hoveredRole === 'operator'} />

        {/* Dual Energy Conduits streaming from Central Core to Portals */}
        <SplittingConduitStream
          start={[0, 1.4, 0]}
          end={[-5.2, 1.2, -0.5]}
          color="#10B981"
          active={hoveredRole === 'consumer' || !hoveredRole}
        />
        <SplittingConduitStream
          start={[0, 1.4, 0]}
          end={[5.2, 1.2, -0.5]}
          color="#00F0FF"
          active={hoveredRole === 'operator' || !hoveredRole}
        />

        {/* Postprocessing Bloom */}
        <EffectComposer>
          <Bloom luminanceThreshold={0.9} intensity={0.8} />
          <Vignette offset={0.25} darkness={0.4} />
        </EffectComposer>
      </Canvas>
    </div>
  );
};

export default Login3DBackdrop;
