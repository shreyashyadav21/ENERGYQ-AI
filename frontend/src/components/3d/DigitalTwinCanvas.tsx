import React from 'react';
import { Canvas } from '@react-three/fiber';
import {
  OrbitControls,
  Grid,
  ContactShadows,
  Environment,
  Lightformer,
  Sparkles
} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

interface DigitalTwinCanvasProps {
  children: React.ReactNode;
  cameraPosition?: [number, number, number];
  cameraFov?: number;
  target?: [number, number, number];
  maxDistance?: number;
  minDistance?: number;
  sparklesColor?: string;
  gridSectionColor?: string;
}

export const DigitalTwinCanvas: React.FC<DigitalTwinCanvasProps> = ({
  children,
  cameraPosition = [9, 8.5, 12],
  cameraFov = 42,
  target = [0, 1.2, 0],
  maxDistance = 28,
  minDistance = 4,
  sparklesColor = '#00F5D4',
  gridSectionColor = '#00F0FF',
}) => {
  return (
    <div className="w-full h-full relative select-none bg-[#030712]">
      <Canvas
        camera={{ position: cameraPosition, fov: cameraFov }}
        shadows
        gl={{
          antialias: true,
          alpha: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          powerPreference: 'high-performance',
        }}
      >
        <color attach="background" args={['#030712']} />
        <fog attach="fog" args={['#030712', 20, 55]} />

        {/* Ambient & Key Fill Lighting */}
        <ambientLight intensity={0.35} />
        <directionalLight
          position={[10, 18, 8]}
          intensity={1.2}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0001}
        />

        {/* Custom Studio HDRI Environment with Lightformers */}
        <Environment resolution={256}>
          {/* Cool Cyan Overhead Light Strip */}
          <Lightformer
            form="rect"
            intensity={2.2}
            color="#00F0FF"
            position={[0, 9, -4]}
            scale={[14, 4, 1]}
            target={[0, 0, 0]}
          />
          {/* Warm Amber Rim Softbox */}
          <Lightformer
            form="circle"
            intensity={1.6}
            color="#F59E0B"
            position={[-9, 3, -6]}
            scale={7}
            target={[0, 0, 0]}
          />
          {/* Deep Sapphire Horizon Strip */}
          <Lightformer
            form="rect"
            intensity={1.8}
            color="#1E3A8A"
            position={[9, 2, 4]}
            scale={[16, 2, 1]}
            target={[0, 0, 0]}
          />
        </Environment>

        {/* Floating Energy Sparkles */}
        <Sparkles
          count={70}
          scale={16}
          size={1.4}
          speed={0.25}
          color={sparklesColor}
        />

        {/* High-Precision Dark Metallic Architectural Grid Plinth */}
        <Grid
          position={[0, -0.11, 0]}
          args={[48, 48]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#0B1B38"
          sectionSize={4}
          sectionThickness={1.2}
          sectionColor={gridSectionColor}
          fadeDistance={36}
          fadeStrength={1.5}
        />

        {/* Realistic Architectural Ground Contact Shadow */}
        <ContactShadows
          position={[0, -0.1, 0]}
          opacity={0.65}
          scale={28}
          blur={2.0}
          far={12}
        />

        {/* 3D Scene Contents */}
        {children}

        {/* High-End Selective Post-Processing */}
        <EffectComposer multisampling={4}>
          <Bloom
            mipmapBlur
            luminanceThreshold={1.05}
            luminanceSmoothing={0.3}
            intensity={0.85}
          />
          <Vignette offset={0.2} darkness={0.5} />
        </EffectComposer>

        {/* Smooth Damped Orbit Controls */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2.15}
          minDistance={minDistance}
          maxDistance={maxDistance}
          target={target}
        />
      </Canvas>
    </div>
  );
};

export default DigitalTwinCanvas;
