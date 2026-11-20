import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles, Grid } from '@react-three/drei';
import * as THREE from 'three';

const ParallaxCamera = () => {
  useFrame((state) => {
    const { x, y } = state.pointer;
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, x * 1.6, 0.05);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, 2.6 + y * 0.8, 0.05);
    state.camera.lookAt(0, 1.0, 0);
  });
  return null;
};

const SubstationCoreHero = () => {
  const gantryRef = useRef<THREE.Group>(null);
  const radarRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (gantryRef.current) {
      gantryRef.current.rotation.y += delta * 0.2;
    }
    if (radarRef.current) {
      radarRef.current.rotation.z -= delta * 0.8;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.4;
    }
  });

  return (
    <group ref={gantryRef} position={[0, 0.2, 0]}>
      {/* Heavy Plinth */}
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[3.2, 3.5, 0.3, 48]} />
        <meshStandardMaterial color="#07132B" metalness={0.9} roughness={0.25} />
      </mesh>
      <mesh ref={ringRef} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.9, 3.2, 48]} />
        <meshBasicMaterial color="#3B82F6" side={THREE.DoubleSide} toneMapped={false} />
      </mesh>

      {/* Substation Transformer Tank */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[1.8, 1.2, 1.4]} />
        <meshStandardMaterial color="#0A1D3D" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* High-Voltage Bushings */}
      {[-0.5, 0, 0.5].map((x, i) => (
        <group key={i} position={[x, 1.45, 0]}>
          <mesh>
            <cylinderGeometry args={[0.07, 0.12, 0.45, 12]} />
            <meshStandardMaterial color="#38BDF8" emissive="#0284C7" emissiveIntensity={0.6} />
          </mesh>
          <mesh position={[0, 0.25, 0]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshBasicMaterial color="#60A5FA" toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* Gantry Arch Frame */}
      <mesh position={[0, 1.8, 0]}>
        <torusGeometry args={[1.3, 0.06, 16, 32, Math.PI]} />
        <meshStandardMaterial color="#1E3A8A" metalness={0.9} />
      </mesh>

      {/* Rotating SCADA Radar Sweep */}
      <mesh ref={radarRef} position={[0, 2.7, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1.5, 8]} />
        <meshBasicMaterial color="#00F0FF" wireframe toneMapped={false} />
      </mesh>

      {/* Radiator Cooling Fins */}
      {[-0.8, 0.8].map((x, i) => (
        <mesh key={i} position={[x, 0.7, 0]}>
          <boxGeometry args={[0.1, 0.9, 1.2]} />
          <meshStandardMaterial color="#1E293B" metalness={0.85} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
};

export const Operator3DLoginBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden bg-transparent">
      <Canvas
        camera={{ position: [0, 2.6, 7.5], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <ParallaxCamera />
        <ambientLight intensity={0.7} />
        <directionalLight position={[8, 14, 8]} intensity={1.8} color="#93C5FD" />
        <pointLight position={[-4, 3, 2]} color="#3B82F6" intensity={3.0} distance={12} />
        <pointLight position={[4, 2, -2]} color="#00F0FF" intensity={2.5} distance={10} />

        <Float speed={1.4} rotationIntensity={0.2} floatIntensity={0.35}>
          <SubstationCoreHero />
        </Float>

        <Sparkles count={60} scale={14} size={2.0} speed={0.4} color="#38BDF8" />

        <Grid
          position={[0, -1.2, 0]}
          args={[40, 40]}
          infiniteGrid
          fadeDistance={25}
          fadeStrength={2.2}
          cellSize={1.0}
          cellColor="#0D274D"
          sectionSize={4.0}
          sectionColor="#3B82F6"
        />
      </Canvas>
    </div>
  );
};

export default Operator3DLoginBackground;
