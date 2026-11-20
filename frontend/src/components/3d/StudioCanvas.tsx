import React from 'react';
import { Canvas } from '@react-three/fiber';
import {
  Environment,
  Lightformer,
  MeshReflectorMaterial,
  Sparkles,
  ContactShadows,
} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import {
  TwilightAuroraSky,
  HolographicGridScanner,
} from './EnergyShaders';

interface StudioCanvasProps {
  children: React.ReactNode;
  cameraPosition?: [number, number, number];
  cameraFov?: number;
  enableReflector?: boolean;
  enableBloom?: boolean;
  faultIntensity?: number;
}

export const StudioCanvas: React.FC<StudioCanvasProps> = ({
  children,
  cameraPosition = [0, 10, 16],
  cameraFov = 45,
  enableReflector = true,
  enableBloom = true,
  faultIntensity = 0.0,
}) => {
  return (
    <div className="w-full h-full relative select-none bg-[#050C1D] overflow-hidden">
      <Canvas
        camera={{ position: cameraPosition, fov: cameraFov }}
        shadows
        dpr={[1, 2]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
        }}
      >
        {/* Twilight Aurora Horizon Sky from EnergyShaders */}
        <TwilightAuroraSky />

        {/* Ambient & Studio Directional Key Lights */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[14, 22, 12]}
          intensity={1.5}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0001}
        />
        <directionalLight position={[-12, 8, -10]} intensity={0.7} color="#38BDF8" />

        {/* Studio Lightformer Reflections */}
        <Environment resolution={256}>
          <Lightformer
            form="rect"
            intensity={2.8}
            color="#00F5D4"
            position={[0, 10, -5]}
            scale={[16, 5, 1]}
            target={[0, 0, 0]}
          />
          <Lightformer
            form="rect"
            intensity={3.2}
            color="#3B82F6"
            position={[-10, 4, -8]}
            scale={[12, 6, 1]}
            target={[0, 0, 0]}
          />
          <Lightformer
            form="circle"
            intensity={2.0}
            color="#F59E0B"
            position={[10, 4, 6]}
            scale={8}
            target={[0, 0, 0]}
          />
          <Lightformer
            form="ring"
            intensity={1.2}
            color="#050C1D"
            position={[0, -2, 0]}
            scale={16}
            target={[0, 0, 0]}
          />
        </Environment>

        {/* Holographic Radar Scanner */}
        <HolographicGridScanner radius={16} accentColor="#00F5D4" faultIntensity={faultIntensity} />

        {/* Studio Reflective Titanium Plinth */}
        {enableReflector && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
            <circleGeometry args={[18, 64]} />
            <MeshReflectorMaterial
              blur={[300, 100]}
              resolution={512}
              mixBlur={1}
              mixStrength={40}
              roughness={0.4}
              depthScale={1.2}
              minDepthThreshold={0.4}
              maxDepthThreshold={1.4}
              color="#071329"
              metalness={0.85}
              mirror={0.6}
            />
          </mesh>
        )}

        {/* Contact Shadows & Ambient Energy Sparkles */}
        <ContactShadows position={[0, -0.04, 0]} opacity={0.65} scale={26} blur={2.4} far={8} />
        <Sparkles count={80} scale={18} size={1.8} speed={0.3} color="#00F5D4" />

        {/* Scene Children */}
        {children}

        {/* Post-Processing Selective Bloom & Vignette */}
        {enableBloom && (
          <EffectComposer multisampling={4}>
            <Bloom mipmapBlur luminanceThreshold={1.05} intensity={0.9} />
            <Vignette offset={0.25} darkness={0.5} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
};

export default StudioCanvas;
