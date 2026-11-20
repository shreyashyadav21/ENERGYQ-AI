import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles, Grid } from '@react-three/drei';
import * as THREE from 'three';

const ParallaxCamera = () => {
  useFrame((state) => {
    const { x, y } = state.pointer;
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, x * 1.5, 0.05);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, 2.5 + y * 0.8, 0.05);
    state.camera.lookAt(0, 0.8, 0);
  });
  return null;
};

const SmartHomeHero = () => {
  const houseGroup = useRef<THREE.Group>(null);
  const solarRays = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (houseGroup.current) {
      houseGroup.current.rotation.y += delta * 0.25;
    }
    if (solarRays.current) {
      solarRays.current.rotation.z -= delta * 0.5;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.3;
    }
  });

  return (
    <group ref={houseGroup} position={[0, 0.2, 0]}>
      {/* Floating Holographic Platform */}
      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry args={[3.2, 3.4, 0.2, 48]} />
        <meshStandardMaterial color="#0A1C2A" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh ref={ringRef} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.0, 3.25, 48]} />
        <meshBasicMaterial color="#00F5D4" side={THREE.DoubleSide} toneMapped={false} />
      </mesh>

      {/* Modern Villa Structure */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[2.4, 1.6, 2.0]} />
        <meshPhysicalMaterial
          color="#0F2838"
          transmission={0.6}
          roughness={0.15}
          metalness={0.5}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Roof with Solar Panels */}
      <mesh position={[0, 1.85, 0]} rotation={[0.15, 0, 0]}>
        <boxGeometry args={[2.6, 0.1, 2.2]} />
        <meshStandardMaterial color="#040D1A" metalness={0.8} roughness={0.2} />
      </mesh>
      {[-0.8, 0, 0.8].map((x, i) => (
        <mesh key={i} position={[x, 1.95, 0]} rotation={[0.15, 0, 0]}>
          <planeGeometry args={[0.65, 1.8]} />
          <meshBasicMaterial color="#00F5D4" toneMapped={false} />
        </mesh>
      ))}

      {/* Rotating Holographic Solar Aura */}
      <mesh ref={solarRays} position={[0, 2.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.2, 1.8, 6]} />
        <meshBasicMaterial color="#10B981" wireframe toneMapped={false} />
      </mesh>

      {/* Powerwall Accent Glow */}
      <mesh position={[1.22, 0.8, 0]}>
        <boxGeometry args={[0.08, 0.8, 0.4]} />
        <meshBasicMaterial color="#10B981" toneMapped={false} />
      </mesh>
    </group>
  );
};

export const Consumer3DLoginBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden bg-transparent">
      <Canvas
        camera={{ position: [0, 2.5, 7.5], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <ParallaxCamera />
        <ambientLight intensity={0.7} />
        <directionalLight position={[8, 14, 8]} intensity={1.6} color="#E0F2FE" />
        <pointLight position={[-4, 3, 2]} color="#00F5D4" intensity={2.5} distance={12} />
        <pointLight position={[4, 2, -2]} color="#10B981" intensity={2.0} distance={10} />

        <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.4}>
          <SmartHomeHero />
        </Float>

        <Sparkles count={60} scale={14} size={2.0} speed={0.4} color="#00F5D4" />

        <Grid
          position={[0, -1.2, 0]}
          args={[40, 40]}
          infiniteGrid
          fadeDistance={25}
          fadeStrength={2.2}
          cellSize={1.0}
          cellColor="#0B3042"
          sectionSize={4.0}
          sectionColor="#00F5D4"
        />
      </Canvas>
    </div>
  );
};

export default Consumer3DLoginBackground;
