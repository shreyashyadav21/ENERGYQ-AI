import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export const TwilightAuroraSky: React.FC = () => {
    const matRef = useRef<THREE.ShaderMaterial>(null);
    const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

    useFrame((_, delta) => {
        if (matRef.current) matRef.current.uniforms.uTime.value += Math.min(delta, 0.05);
    });

    return (
        <mesh scale={[140, 140, 140]}>
            <sphereGeometry args={[1, 32, 32]} />
            <shaderMaterial
                ref={matRef}
                side={THREE.BackSide}
                depthWrite={false}
                uniforms={uniforms}
                vertexShader={`
          varying vec3 vWorldPos;
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldPos = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `}
                fragmentShader={`
          uniform float uTime;
          varying vec3 vWorldPos;

          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
          }

          float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(
              mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
              mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
              f.y
            );
          }

          float cloudNoise(vec2 p) {
            float value = 0.0;
            float amplitude = 0.5;
            for (int i = 0; i < 4; i++) {
              value += noise(p) * amplitude;
              p = p * 2.03 + 17.1;
              amplitude *= 0.5;
            }
            return value;
          }

          void main() {
            vec3 dir = normalize(vWorldPos);
            float h = dir.y;
            vec3 zenith = vec3(0.012, 0.025, 0.065);
            vec3 midSky = vec3(0.035, 0.09, 0.19);
            vec3 horizon = vec3(0.24, 0.22, 0.24);
            vec3 warmHorizon = vec3(0.48, 0.28, 0.17);
            float horizonBlend = 1.0 - smoothstep(-0.04, 0.3, h);
            vec3 col = mix(midSky, zenith, smoothstep(0.08, 0.92, h));
            col = mix(col, horizon, horizonBlend * 0.72);

            float sunAlignment = max(dot(dir, normalize(vec3(-0.62, 0.08, -0.78))), 0.0);
            float sunGlow = pow(sunAlignment, 10.0) * horizonBlend;
            float sunDisc = pow(sunAlignment, 150.0) * horizonBlend;
            col = mix(col, warmHorizon, sunGlow * 0.7);
            col += vec3(1.0, 0.58, 0.3) * sunDisc * 0.75;

            vec2 cloudUv = dir.xz / max(0.42, dir.y + 0.82) * 3.0;
            float clouds = cloudNoise(cloudUv + vec2(uTime * 0.004, -uTime * 0.002));
            float cloudBand = smoothstep(-0.12, 0.03, h) * (1.0 - smoothstep(0.28, 0.62, h));
            float cloudMask = smoothstep(0.48, 0.78, clouds) * cloudBand;
            vec3 cloudColor = mix(vec3(0.16, 0.22, 0.32), vec3(0.48, 0.35, 0.29), horizonBlend);
            col = mix(col, cloudColor, cloudMask * 0.38);

            vec2 starGrid = dir.xz * 260.0;
            vec2 starCell = floor(starGrid);
            vec2 starOffset = fract(starGrid) - 0.5;
            float star = (1.0 - smoothstep(0.018, 0.055, length(starOffset))) * step(0.996, hash(starCell));
            col += vec3(0.58, 0.72, 0.95) * star * smoothstep(0.2, 0.72, h) * 0.32;

            gl_FragColor = vec4(col, 1.0);
          }
        `}
            />
        </mesh>
    );
};

interface PlasmaConduitProps {
    points: [number, number, number][];
    colorCore?: string;
    colorGlow?: string;
    speed?: number;
    active?: boolean;
    radius?: number;
}

export const PlasmaEnergyConduit: React.FC<PlasmaConduitProps> = ({
    points,
    colorCore = '#00F5D4',
    colorGlow = '#0EA5E9',
    speed = 1.4,
    active = true,
    radius = 0.055,
}) => {
    const matRef = useRef<THREE.ShaderMaterial>(null);
    const targetCoreColor = useMemo(() => new THREE.Color(colorCore), [colorCore]);
    const targetGlowColor = useMemo(() => new THREE.Color(colorGlow), [colorGlow]);

    const jacketGeo = useMemo(() => {
        const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
        return new THREE.TubeGeometry(curve, 72, radius * 1.15, 10, false);
    }, [points, radius]);

    const coreGeo = useMemo(() => {
        const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
        return new THREE.TubeGeometry(curve, 72, radius * 0.55, 10, false);
    }, [points, radius]);

    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uSpeed: { value: speed },
            uColorCore: { value: new THREE.Color(colorCore) },
            uColorGlow: { value: new THREE.Color(colorGlow) },
            uActive: { value: active ? 1.0 : 0.0 },
        }),
        []
    );

    useFrame((_, delta) => {
        if (matRef.current) {
            matRef.current.uniforms.uTime.value += Math.min(delta, 0.05);
            matRef.current.uniforms.uSpeed.value = THREE.MathUtils.lerp(matRef.current.uniforms.uSpeed.value, speed, 0.1);
            matRef.current.uniforms.uActive.value = THREE.MathUtils.lerp(matRef.current.uniforms.uActive.value, active ? 1.0 : 0.0, 0.1);
            matRef.current.uniforms.uColorCore.value.lerp(targetCoreColor, 0.1);
            matRef.current.uniforms.uColorGlow.value.lerp(targetGlowColor, 0.1);
        }
    });

    return (
        <group>
            <mesh geometry={jacketGeo} castShadow>
                <meshPhysicalMaterial
                    color="#14181d"
                    roughness={0.62}
                    metalness={0.22}
                    clearcoat={0.15}
                    transparent
                    opacity={0.92}
                    transmission={0.08}
                    thickness={0.2}
                />
            </mesh>
            <mesh geometry={coreGeo}>
                <shaderMaterial
                    ref={matRef}
                    transparent
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
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vViewPos = -mvPosition.xyz;
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
                    fragmentShader={`
          uniform float uTime;
          uniform float uSpeed;
          uniform vec3 uColorCore;
          uniform vec3 uColorGlow;
          uniform float uActive;
          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vViewPos;
          void main() {
            vec3 viewDir = normalize(vViewPos);
            float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 2.4);
            float t = vUv.x * 9.0 - uTime * uSpeed * 1.8;
            float packet = pow(max(0.0, sin(t)), 18.0);
            float packet2 = pow(max(0.0, sin(t * 0.55 + 1.7)), 10.0);
            float carrier = 0.18 + 0.22 * sin(vUv.x * 40.0 - uTime * uSpeed * 8.0);
            vec3 col = mix(uColorGlow, uColorCore, packet);
            col = mix(col, vec3(1.0), packet * 0.55);
            col += uColorGlow * (carrier + fresnel * 0.85);
            col *= 0.25 + 2.4 * uActive;
            float alpha = mix(0.08, clamp(0.2 + packet * 0.9 + packet2 * 0.45 + fresnel * 0.3, 0.0, 1.0), uActive);
            gl_FragColor = vec4(col, alpha);
          }
        `}
                />
            </mesh>
        </group>
    );
};

export const HolographicGridScanner: React.FC<{
    radius?: number;
    accentColor?: string;
    faultIntensity?: number;
}> = ({ radius = 16, accentColor = '#00F5D4', faultIntensity = 0.0 }) => {
    const matRef = useRef<THREE.ShaderMaterial>(null);
    const targetAccent = useMemo(() => new THREE.Color(accentColor), [accentColor]);
    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uAccent: { value: new THREE.Color(accentColor) },
            uFault: { value: faultIntensity },
        }),
        []
    );

    useFrame((_, delta) => {
        if (matRef.current) {
            matRef.current.uniforms.uTime.value += Math.min(delta, 0.05);
            matRef.current.uniforms.uAccent.value.lerp(targetAccent, 0.1);
            matRef.current.uniforms.uFault.value = THREE.MathUtils.lerp(matRef.current.uniforms.uFault.value, faultIntensity, 0.1);
        }
    });

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <planeGeometry args={[radius * 2, radius * 2]} />
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
          uniform vec3 uAccent;
          uniform float uFault;
          varying vec2 vUv;
          void main() {
            float dist = length(vUv);
            if (dist > 1.0) discard;
            float rings = 1.0 - smoothstep(0.0, 0.014, abs(fract(dist * 6.0) - 0.5));
            float angle = atan(vUv.y, vUv.x);
            float sweepAngle = mod(mod(angle - uTime * 0.55, 6.28318) + 6.28318, 6.28318);
            float sweep = 1.0 - smoothstep(0.0, 0.55, sweepAngle);
            float shockWave = (1.0 - smoothstep(0.0, 0.04, abs(dist - fract(uTime * 0.55)))) * uFault;
            vec3 col = uAccent * (rings * 0.22 + sweep * 0.28) + vec3(1.0, 0.18, 0.12) * shockWave * 2.4;
            float fade = 1.0 - smoothstep(0.7, 1.0, dist);
            float alpha = clamp((rings * 0.18 + sweep * 0.16 + shockWave * 0.8) * fade, 0.0, 0.55);
            gl_FragColor = vec4(col, alpha);
          }
        `}
            />
        </mesh>
    );
};

export const ThermalHeatPlume: React.FC<{ active: boolean; position?: [number, number, number] }> = ({
    active,
    position = [0, 2.5, 0],
}) => {
    const matRef = useRef<THREE.ShaderMaterial>(null);
    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uActive: { value: active ? 1.0 : 0.0 },
        }),
        []
    );

    useFrame((_, delta) => {
        if (matRef.current) {
            matRef.current.uniforms.uTime.value += Math.min(delta, 0.05);
            matRef.current.uniforms.uActive.value = THREE.MathUtils.lerp(matRef.current.uniforms.uActive.value, active ? 1.0 : 0.0, 0.08);
        }
    });

    return (
        <mesh position={position}>
            <cylinderGeometry args={[1.4, 0.6, 3.2, 24, 1, true]} />
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
          uniform float uTime;
          void main() {
            vUv = uv;
            vec3 pos = position;
            pos.x += sin(uv.y * 8.0 - uTime * 4.0) * 0.12 * uv.y;
            pos.z += cos(uv.y * 8.0 - uTime * 3.5) * 0.12 * uv.y;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `}
                fragmentShader={`
          uniform float uTime;
          uniform float uActive;
          varying vec2 vUv;
          void main() {
            float wave = sin(vUv.x * 18.0 + uTime * 3.0) * sin(vUv.y * 12.0 - uTime * 5.0);
            float verticalFade = smoothstep(0.0, 0.2, vUv.y) * (1.0 - smoothstep(0.25, 1.0, vUv.y));
            vec3 heatCol = mix(vec3(1.0, 0.35, 0.05), vec3(1.0, 0.08, 0.18), vUv.y);
            float alpha = verticalFade * (0.28 + 0.22 * wave) * uActive;
            gl_FragColor = vec4(heatCol * 2.2, clamp(alpha, 0.0, 0.65));
          }
        `}
            />
        </mesh>
    );
};