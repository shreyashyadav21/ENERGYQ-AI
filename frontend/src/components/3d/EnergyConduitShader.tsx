import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const EnergyConduitVertexShader = `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uVoltageStability;
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    
    // Wave distortion along normal driven by voltage stability & flow speed
    float ripple = sin(uv.x * 24.0 - uTime * uSpeed * 6.0) * (0.012 + (1.0 - uVoltageStability) * 0.025);
    vec3 displacedPosition = position + normal * ripple;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
  }
`;

const EnergyConduitFragmentShader = `
  uniform float uTime;
  uniform float uSpeed;
  uniform vec3 uColorStart;
  uniform vec3 uColorEnd;
  uniform float uLoadIntensity;
  uniform float uVoltageStability;
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    // High-energy travelling plasma packets along length (vUv.x)
    float plasmaFreq = 18.0;
    float packet1 = sin(vUv.x * plasmaFreq - uTime * uSpeed * 5.5);
    float packet2 = sin(vUv.x * (plasmaFreq * 0.5) - uTime * uSpeed * 3.2 + 1.57);
    float packets = pow(max(0.0, (packet1 + packet2) * 0.5), 3.0);
    
    // Edge glow falloff around tube circumference (vUv.y from 0 to 1)
    float edgeGlow = sin(vUv.y * 3.14159);
    edgeGlow = pow(edgeGlow, 1.8);
    
    // Dynamic color shift based on load and voltage stability
    vec3 baseColor = mix(uColorStart, uColorEnd, sin(vUv.x * 4.0 - uTime * 2.0) * 0.5 + 0.5);
    if (uVoltageStability < 0.9) {
      // Shift towards cautionary amber / electric violet during voltage sag or overload
      baseColor = mix(baseColor, vec3(1.0, 0.35, 0.1), clamp((0.9 - uVoltageStability) * 4.0, 0.0, 1.0));
    }
    
    // High-intensity white-hot core
    vec3 hotCore = vec3(1.0, 1.0, 1.0);
    vec3 finalColor = mix(baseColor, hotCore, packets * 0.75 * min(1.5, uLoadIntensity));
    
    float alpha = clamp((edgeGlow * 0.45 + packets * 0.85) * min(1.2, uLoadIntensity + 0.3), 0.12, 0.95);
    
    gl_FragColor = vec4(finalColor * (1.2 + packets * 1.6), alpha);
  }
`;

interface EnergyConduitProps {
  points: [number, number, number][];
  colorStart?: string;
  colorEnd?: string;
  speed?: number;
  kwLoad?: number;
  loadIntensity?: number;
  voltageStability?: number; // 1.0 = 230V/415V stable, 0.85 = sag
  radius?: number;
  active?: boolean;
}

export const EnergyConduitShader: React.FC<EnergyConduitProps> = ({
  points,
  colorStart = '#00F0FF',
  colorEnd = '#10B981',
  speed = 1.0,
  kwLoad = 2.0,
  loadIntensity,
  voltageStability = 1.0,
  radius = 0.035,
  active = true,
}) => {
  const effectiveLoad = loadIntensity !== undefined ? loadIntensity * 5 : kwLoad;
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const curve = useMemo(() => {
    const vPoints = points.map((p) => new THREE.Vector3(...p));
    return new THREE.CatmullRomCurve3(vPoints);
  }, [points]);

  const tubeGeo = useMemo(() => {
    return new THREE.TubeGeometry(curve, 48, radius, 10, false);
  }, [curve, radius]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSpeed: { value: speed },
      uColorStart: { value: new THREE.Color(colorStart) },
      uColorEnd: { value: new THREE.Color(colorEnd) },
      uLoadIntensity: { value: Math.max(0.4, effectiveLoad / 3.0) },
      uVoltageStability: { value: voltageStability },
    }),
    [colorStart, colorEnd, effectiveLoad, speed, voltageStability]
  );

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      materialRef.current.uniforms.uSpeed.value = active ? speed : 0.05;
      materialRef.current.uniforms.uLoadIntensity.value = active ? Math.max(0.4, effectiveLoad / 3.0) : 0.1;
      materialRef.current.uniforms.uVoltageStability.value = voltageStability;
    }
  });

  return (
    <mesh geometry={tubeGeo}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={EnergyConduitVertexShader}
        fragmentShader={EnergyConduitFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};
