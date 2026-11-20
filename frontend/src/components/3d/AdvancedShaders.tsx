import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

/**
 * 1. VOLUMETRIC SOLAR GOD-RAYS SHADER
 * Soft additive sunbeams descending onto rooftop solar panels when solar generation is active.
 */
export const VolumetricSunbeams: React.FC<{ active: boolean; position?: [number, number, number] }> = ({
  active,
  position = [0, 5.2, 0],
}) => {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uOpacity: { value: active ? 1 : 0 } }), []);

  useFrame((_, delta) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value += Math.min(delta, 0.05);
      matRef.current.uniforms.uOpacity.value = THREE.MathUtils.lerp(
        matRef.current.uniforms.uOpacity.value,
        active ? 1.0 : 0.0,
        0.06
      );
    }
  });

  return (
    <mesh position={position} rotation={[0.18, 0, -0.22]}>
      <cylinderGeometry args={[1.6, 3.4, 5.5, 32, 1, true]} />
      <shaderMaterial
        ref={matRef}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vViewPos;
          void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vViewPos = -mv.xyz;
            gl_Position = projectionMatrix * mv;
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform float uOpacity;
          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vViewPos;
          void main() {
            vec3 viewDir = normalize(vViewPos);
            float edgeSoft = pow(abs(dot(vNormal, viewDir)), 1.8);
            float rays = sin(vUv.x * 24.0 + uTime * 0.6) * 0.5 + 0.5;
            rays *= cos(vUv.x * 13.0 - uTime * 0.4) * 0.5 + 0.5;
            float vFade = smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.15, 1.0, vUv.y));
            vec3 sunCol = mix(vec3(1.0, 0.78, 0.32), vec3(1.0, 0.93, 0.62), vUv.y);
            float alpha = edgeSoft * vFade * (0.16 + 0.22 * rays) * uOpacity;
            gl_FragColor = vec4(sunCol * 1.6, alpha);
          }
        `}
      />
    </mesh>
  );
};

/**
 * 2. ARCHITECTURAL SMART-GLASS FRESNEL SHADER
 * Realistic tinted low-E architectural glass with sky reflections and warm interior glow.
 */
export const ArchitecturalSmartGlass: React.FC<{
  args: [number, number, number];
  position: [number, number, number];
  interiorLit?: boolean;
}> = ({ args, position, interiorLit = true }) => {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uLit: { value: interiorLit ? 1.0 : 0.15 },
    }),
    []
  );

  useFrame((_, delta) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value += Math.min(delta, 0.05);
      matRef.current.uniforms.uLit.value = THREE.MathUtils.lerp(
        matRef.current.uniforms.uLit.value,
        interiorLit ? 1.0 : 0.15,
        0.08
      );
    }
  });

  return (
    <mesh position={position}>
      <boxGeometry args={args} />
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`
          varying vec3 vNormal;
          varying vec3 vViewPos;
          varying vec2 vUv;
          void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vViewPos = -mv.xyz;
            gl_Position = projectionMatrix * mv;
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform float uLit;
          varying vec3 vNormal;
          varying vec3 vViewPos;
          varying vec2 vUv;
          void main() {
            vec3 viewDir = normalize(vViewPos);
            float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 2.5);
            vec3 skyRefl = vec3(0.08, 0.55, 0.78);
            vec3 warmInterior = vec3(1.0, 0.78, 0.45) * (0.25 + 0.35 * (1.0 - vUv.y)) * uLit;
            // Subtle architectural mullion frame border
            float border = step(0.96, max(abs(vUv.x * 2.0 - 1.0), abs(vUv.y * 2.0 - 1.0)));
            vec3 col = mix(warmInterior, skyRefl * 1.4, fresnel) + vec3(0.05, 0.12, 0.2) * border;
            float alpha = clamp(0.22 + fresnel * 0.55 + border * 0.4, 0.18, 0.85);
            gl_FragColor = vec4(col, alpha);
          }
        `}
      />
    </mesh>
  );
};

/**
 * 3. EV WIRELESS INDUCTION CHARGING PAD SHADER
 * Concentric pulsing electromagnetic field rings beneath the parked EV when charging.
 */
export const EvInductionPadShader: React.FC<{ active: boolean; position?: [number, number, number] }> = ({
  active,
  position = [0, 0.03, 0],
}) => {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uActive: { value: active ? 1 : 0 } }), []);

  useFrame((_, delta) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value += Math.min(delta, 0.05);
      matRef.current.uniforms.uActive.value = THREE.MathUtils.lerp(
        matRef.current.uniforms.uActive.value,
        active ? 1.0 : 0.0,
        0.08
      );
    }
  });

  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[3.4, 5.2]} />
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv * 2.0 - 1.0;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform float uActive;
          varying vec2 vUv;
          void main() {
            float d = length(vUv * vec2(1.0, 0.75));
            if (d > 1.0) discard;
            float wave = 1.0 - smoothstep(0.0, 0.08, abs(fract(d * 3.0 - uTime * 1.4) - 0.5));
            float core = 1.0 - smoothstep(0.0, 0.45, d);
            vec3 col = mix(vec3(0.0, 0.85, 1.0), vec3(0.06, 0.95, 0.65), wave) * (wave * 2.5 + core * 0.9);
            float fade = 1.0 - smoothstep(0.5, 1.0, d);
            float alpha = clamp((wave * 0.75 + core * 0.35) * fade, 0.0, 0.95) * (0.15 + 0.85 * uActive);
            gl_FragColor = vec4(col, alpha);
          }
        `}
      />
    </mesh>
  );
};

/**
 * 4. HIGH-VOLTAGE ELECTRIC ARC LIGHTNING SHADER
 * Crackling plasma arc ribbon between transformer bushings during critical faults.
 */
export const ElectricArcBolt: React.FC<{
  active: boolean;
  start: [number, number, number];
  end: [number, number, number];
}> = ({ active, start, end }) => {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  const geometry = useMemo(() => {
    const s = new THREE.Vector3(...start);
    const e = new THREE.Vector3(...end);
    const mid = s.clone().lerp(e, 0.5).add(new THREE.Vector3(0, 0.35, 0));
    const curve = new THREE.CatmullRomCurve3([s, mid, e]);
    return new THREE.TubeGeometry(curve, 32, 0.04, 8, false);
  }, [start, end]);

  useFrame((_, delta) => {
    if (matRef.current) matRef.current.uniforms.uTime.value += Math.min(delta, 0.05);
  });

  if (!active) return null;

  return (
    <mesh geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          uniform float uTime;
          void main() {
            vUv = uv;
            vec3 pos = position;
            float jitter = sin(uv.x * 45.0 + uTime * 38.0) * cos(uv.x * 29.0 - uTime * 52.0);
            pos.y += jitter * 0.14 * sin(uv.x * 3.14159);
            pos.x += jitter * 0.09 * sin(uv.x * 3.14159);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          varying vec2 vUv;
          void main() {
            float strobe = step(0.18, fract(sin(floor(uTime * 28.0) * 12.9898) * 43758.5453));
            float core = 1.0 - smoothstep(0.0, 0.42, abs(vUv.y - 0.5));
            float branch = pow(max(0.0, sin(vUv.x * 40.0 + uTime * 60.0)), 6.0);
            vec3 col = mix(vec3(0.55, 0.75, 1.0), vec3(1.0, 0.95, 0.85), core) * (3.2 + branch * 2.0);
            gl_FragColor = vec4(col, core * strobe);
          }
        `}
      />
    </mesh>
  );
};