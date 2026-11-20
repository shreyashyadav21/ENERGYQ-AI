import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const ConduitVertexShader = `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uActive;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);

    // Subtle plasma pulsation along normal when active
    float pulse = sin(uv.x * 24.0 - uTime * uSpeed * 8.0) * 0.015 * uActive;
    vec3 displaced = position + normal * pulse;

    vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const ConduitFragmentShader = `
  uniform float uTime;
  uniform float uSpeed;
  uniform vec3 uColor;
  uniform float uActive;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    // High-frequency directional plasma packet pulses along length (vUv.x)
    float wave1 = sin(vUv.x * 28.0 - uTime * uSpeed * 6.5);
    float wave2 = sin(vUv.x * 14.0 - uTime * uSpeed * 3.8 + 1.57);
    float plasmaPackets = pow(max(0.0, (wave1 + wave2) * 0.5), 3.2);

    // Fresnel edge glow for fiber-optic conduit aesthetic
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    float fresnel = pow(1.0 - max(0.0, dot(normal, viewDir)), 2.2);

    // Dynamic color composition: Core energy color with white plasma peaks
    vec3 coreColor = uColor * (0.6 + 0.4 * uActive);
    vec3 highlightColor = mix(coreColor, vec3(1.0, 1.0, 1.0), 0.75);

    vec3 finalRgb = mix(coreColor, highlightColor, plasmaPackets * uActive);
    finalRgb += uColor * fresnel * 0.8;

    float alpha = mix(0.12, 0.95, (plasmaPackets * 0.8 + fresnel * 0.45) * uActive);
    if (uActive < 0.1) {
      alpha = 0.08 + fresnel * 0.15;
    }

    gl_FragColor = vec4(finalRgb, alpha);
  }
`;

interface EnergyConduitProps {
  points: [number, number, number][];
  color?: string;
  speed?: number;
  active?: boolean;
  radius?: number;
}

export const EnergyConduit: React.FC<EnergyConduitProps> = ({
  points,
  color = '#00F5D4',
  speed = 1.0,
  active = true,
  radius = 0.032,
}) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const curve = useMemo(() => {
    const v3Points = points.map((p) => new THREE.Vector3(...p));
    return new THREE.CatmullRomCurve3(v3Points, false, 'catmullrom', 0.2);
  }, [points]);

  const geometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 64, radius, 12, false);
  }, [curve, radius]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSpeed: { value: speed },
      uColor: { value: new THREE.Color(color) },
      uActive: { value: active ? 1.0 : 0.0 },
    }),
    [color, speed, active]
  );

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      materialRef.current.uniforms.uSpeed.value = active ? speed : 0.15;
      materialRef.current.uniforms.uActive.value = active ? 1.0 : 0.05;
      materialRef.current.uniforms.uColor.value.set(color);
    }
  });

  return (
    <mesh geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={ConduitVertexShader}
        fragmentShader={ConduitFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
};

export default EnergyConduit;
