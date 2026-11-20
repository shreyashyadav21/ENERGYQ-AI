import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { useEnergyStore } from '../../stores/energyStore';
import { energyWs } from '../../services/websocket';
import { StudioEnvironment } from './StudioEnvironment';
import { PlasmaEnergyConduit, HolographicGridScanner } from './EnergyShaders';
import { ArchitecturalSmartGlass, EvInductionPadShader, VolumetricSunbeams } from './AdvancedShaders';
import {
  CeramicBushingStack,
  StatusBeacon,
  useIndustrialTextures,
} from './IndustrialKit';
import { Power, Zap, X } from 'lucide-react';

// ─── Camera Controller with GSAP Glide ─────────────────────────────────────────
const VillaCameraGlide: React.FC<{ controlsRef: React.RefObject<any> }> = ({ controlsRef }) => {
  const { camera } = useThree();
  const cameraPosition = useEnergyStore((s) => s.cameraPosition);
  const cameraTarget = useEnergyStore((s) => s.cameraTarget);
  const flyTimestamp = useEnergyStore((s) => s.cameraFlyTimestamp);

  useEffect(() => {
    if (!cameraPosition) return;
    const targetLook = cameraTarget || [0, 1.4, 0];

    gsap.killTweensOf(camera.position);
    gsap.to(camera.position, {
      x: cameraPosition[0],
      y: cameraPosition[1],
      z: cameraPosition[2],
      duration: 1.5,
      ease: 'power3.inOut',
      onUpdate: () => camera.updateProjectionMatrix(),
    });

    if (controlsRef.current) {
      gsap.killTweensOf(controlsRef.current.target);
      gsap.to(controlsRef.current.target, {
        x: targetLook[0],
        y: targetLook[1],
        z: targetLook[2],
        duration: 1.5,
        ease: 'power3.inOut',
        onUpdate: () => controlsRef.current.update(),
      });
    }
    return () => {
      gsap.killTweensOf(camera.position);
      if (controlsRef.current) gsap.killTweensOf(controlsRef.current.target);
    };
  }, [flyTimestamp, camera, cameraPosition, cameraTarget, controlsRef]);

  return null;
};

// ─── Double Rotating Holographic Laser Ring ───────────────────────────────────
const DoubleHolographicLaserRing: React.FC<{ position: [number, number, number]; color?: string }> = ({
  position,
  color = '#00F5D4',
}) => {
  const innerRef = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (innerRef.current) innerRef.current.rotation.z += delta * 1.8;
    if (outerRef.current) outerRef.current.rotation.z -= delta * 1.2;
  });

  return (
    <group position={position} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Inner Ring */}
      <mesh ref={innerRef}>
        <ringGeometry args={[0.55, 0.62, 32]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {/* Outer Segmented Ring */}
      <mesh ref={outerRef}>
        <ringGeometry args={[0.72, 0.8, 32, 1, 0, Math.PI * 1.6]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} toneMapped={false} transparent opacity={0.8} />
      </mesh>
    </group>
  );
};

// ─── Floating 3D Interactive Pin Marker ─────────────────────────────────────────
const AppliancePinMarker: React.FC<{
  position: [number, number, number];
  name: string;
  kw: number;
  isOn: boolean;
  isSelected: boolean;
  onClick: () => void;
}> = ({ position, name, kw, isOn, isSelected, onClick }) => {
  return (
    <Html position={position} center distanceFactor={13}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold transition-all transform hover:scale-115 active:scale-95 shadow-[0_4px_20px_rgba(0,0,0,0.85)] backdrop-blur-md cursor-pointer ${
          isSelected
            ? 'bg-cyan-400 text-slate-950 border border-white shadow-[0_0_20px_rgba(0,245,212,0.9)] scale-110 font-black'
            : isOn
            ? 'bg-[#09152D]/95 text-white border border-cyan-400/50 hover:border-cyan-300'
            : 'bg-[#09152D]/85 text-slate-400 border border-slate-700/70 hover:text-white'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isOn ? 'bg-cyan-400 shadow-[0_0_8px_rgba(0,245,212,0.9)] animate-pulse' : 'bg-slate-600'
          }`}
        />
        <span className="truncate max-w-[90px]">{name}</span>
        <span className={`${isSelected ? 'text-slate-950 font-black' : 'text-cyan-300 font-extrabold'}`}>
          {kw.toFixed(1)}kW
        </span>
      </button>
    </Html>
  );
};

// ─── Monocrystalline Rooftop Solar Array ───────────────────────────────────────
const MonocrystallineSolarArray: React.FC<{ solarKw: number }> = ({ solarKw }) => {
  const isActive = solarKw > 0.1;
  const { solarCells, brushedSteel } = useIndustrialTextures();
  const glint = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state) => {
    if (glint.current) {
      glint.current.emissiveIntensity = isActive ? 0.12 + Math.sin(state.clock.elapsedTime * 1.4) * 0.05 : 0.01;
    }
  });

  return (
    <group position={[-1.0, 3.2, 0]} rotation={[0.22, 0, 0]}>
      <mesh position={[0, -0.07, 0]} receiveShadow>
        <boxGeometry args={[5.4, 0.05, 2.35]} />
        <meshStandardMaterial map={brushedSteel} color="#8a93a0" metalness={0.88} roughness={0.28} />
      </mesh>
      {[-1.8, -0.6, 0.6, 1.8].map((x) =>
        [-0.55, 0.55].map((z) => (
          <group key={`${x}-${z}`} position={[x, 0.02, z]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[1.12, 0.045, 0.96]} />
              <meshStandardMaterial color="#1f2937" metalness={0.75} roughness={0.35} />
            </mesh>
            <mesh position={[0, 0.026, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[1.04, 0.88]} />
              <meshStandardMaterial
                ref={glint}
                map={solarCells}
                color="#0b2a55"
                metalness={0.7}
                roughness={0.16}
                emissive="#0ea5e9"
                emissiveIntensity={isActive ? 0.14 : 0.01}
              />
            </mesh>
          </group>
        ))
      )}
      <mesh position={[-2.55, -0.02, 0]}>
        <boxGeometry args={[0.18, 0.12, 0.28]} />
        <meshStandardMaterial color="#111827" metalness={0.6} roughness={0.4} />
      </mesh>
      <VolumetricSunbeams active={isActive} position={[-0.8, 1.2, 0.4]} />
    </group>
  );
};

// ─── Wall-Mounted Smart Powerwall Battery ─────────────────────────────────────
const WallMountedPowerwall: React.FC<{ soc: number; isCharging: boolean }> = ({ soc, isCharging }) => {
  const bars = 6;
  const activeBars = Math.ceil((soc / 100) * bars);

  return (
    <group position={[-5.3, 1.3, -1.0]}>
      {/* Battery Cabinet Chassis */}
      <mesh castShadow>
        <boxGeometry args={[0.22, 1.7, 0.95]} />
        <meshStandardMaterial color="#0A1120" metalness={0.9} roughness={0.18} />
      </mesh>

      {/* Sleek Tempered Obsidian Glass Front */}
      <mesh position={[0.12, 0, 0]}>
        <boxGeometry args={[0.02, 1.65, 0.9]} />
        <meshPhysicalMaterial
          color="#030712"
          roughness={0.08}
          metalness={0.95}
          clearcoat={1.0}
        />
      </mesh>

      {/* Segmented Emerald LED Charge Bar */}
      {Array.from({ length: bars }).map((_, i) => {
        const isBarOn = i < activeBars;
        return (
          <mesh key={i} position={[0.135, -0.6 + i * 0.22, 0]}>
            <boxGeometry args={[0.012, 0.14, 0.65]} />
            <meshBasicMaterial
              color={isBarOn ? (isCharging ? '#00F5D4' : '#10B981') : '#1E293B'}
              toneMapped={false}
            />
          </mesh>
        );
      })}

      {/* Top Status Breathing Glow */}
      <mesh position={[0.135, 0.72, 0]}>
        <sphereGeometry args={[0.025, 12, 12]} />
        <meshBasicMaterial color={isCharging ? '#00F5D4' : '#10B981'} toneMapped={false} />
      </mesh>
    </group>
  );
};

// ─── Carport & Sculpted 3D Electric Vehicle with Holographic Pad ──────────────
const CarportAndEV: React.FC<{ isCharging: boolean }> = ({ isCharging }) => {
  const padRef = useRef<THREE.Mesh>(null);
  const glowLightRef = useRef<THREE.PointLight>(null);

  useFrame((state, delta) => {
    if (padRef.current) padRef.current.rotation.z += delta * (isCharging ? 1.5 : 0.3);
    if (glowLightRef.current && isCharging) {
      glowLightRef.current.intensity = 1.3 + Math.sin(state.clock.elapsedTime * 6) * 0.6;
    }
  });

  // Umbilical charging cable from wall to vehicle charging port
  const cableCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(4.9, 1.0, 2.4),
      new THREE.Vector3(4.6, 0.35, 2.3),
      new THREE.Vector3(4.3, 0.15, 2.1),
      new THREE.Vector3(3.6 + 1.1, 0.42 + 0.25, 2.2 - 0.82),
    ]);
  }, []);

  const cableGeo = useMemo(() => new THREE.TubeGeometry(cableCurve, 28, 0.024, 8, false), [cableCurve]);

  return (
    <group>
      <EvInductionPadShader active={isCharging} position={[3.6, 0.025, 2.2]} />

      {/* Rotating Holographic Wireless Charging Ground Pad */}
      <mesh ref={padRef} position={[3.6, 0.02, 2.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 1.25, 32]} />
        <meshBasicMaterial
          color={isCharging ? '#00F5D4' : '#1E293B'}
          side={THREE.DoubleSide}
          toneMapped={false}
          transparent
          opacity={isCharging ? 0.85 : 0.3}
        />
      </mesh>

      <group position={[3.6, 0.42, 2.2]} rotation={[0, -Math.PI / 12, 0]}>
        <mesh position={[0, 0.22, 0]} castShadow>
          <boxGeometry args={[3.15, 0.48, 1.55]} />
          <meshPhysicalMaterial color="#0b1220" metalness={0.94} roughness={0.16} clearcoat={1} clearcoatRoughness={0.06} />
        </mesh>
        <mesh position={[0.15, 0.48, 0]} castShadow>
          <boxGeometry args={[2.35, 0.28, 1.48]} />
          <meshPhysicalMaterial color="#0b1220" metalness={0.94} roughness={0.16} clearcoat={1} clearcoatRoughness={0.06} />
        </mesh>
        <mesh position={[-0.15, 0.72, 0]} castShadow>
          <boxGeometry args={[1.65, 0.38, 1.28]} />
          <meshPhysicalMaterial
            color="#1e3a5f"
            transmission={0.72}
            roughness={0.08}
            metalness={0.12}
            transparent
            opacity={0.78}
            thickness={0.4}
          />
        </mesh>
        {[-0.85, 0.9].map((x) =>
          [-0.8, 0.8].map((z) => (
            <mesh key={`${x}-${z}`} position={[x, 0.62, z]} castShadow>
              <boxGeometry args={[0.04, 0.22, 0.08]} />
              <meshStandardMaterial color="#111827" metalness={0.6} roughness={0.4} />
            </mesh>
          ))
        )}

        {/* 4 Wheels with Glowing Turbine Rims */}
        {[
          [-1.0, -0.08, 0.82],
          [1.0, -0.08, 0.82],
          [-1.0, -0.08, -0.82],
          [1.0, -0.08, -0.82],
        ].map((wPos, i) => (
          <mesh key={i} position={wPos as [number, number, number]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.32, 0.32, 0.2, 20]} />
            <meshStandardMaterial color="#030712" roughness={0.9} />
            <mesh position={[0, 0.06, 0]}>
              <cylinderGeometry args={[0.18, 0.18, 0.1, 12]} />
              <meshStandardMaterial color="#00F0FF" emissive="#00F0FF" emissiveIntensity={0.3} metalness={0.8} />
            </mesh>
          </mesh>
        ))}

        {/* Front LED Lightbar */}
        <mesh position={[1.61, 0.34, 0]}>
          <boxGeometry args={[0.04, 0.08, 1.4]} />
          <meshBasicMaterial color="#00F5D4" toneMapped={false} />
        </mesh>

        {/* Rear Neon Lightbar */}
        <mesh position={[-1.61, 0.35, 0]}>
          <boxGeometry args={[0.04, 0.08, 1.4]} />
          <meshBasicMaterial color="#EF4444" toneMapped={false} />
        </mesh>

        {/* Charge Port Indicator */}
        <mesh position={[1.1, 0.42, -0.82]} rotation={[0, 0, Math.PI / 2]}>
          <ringGeometry args={[0.06, 0.1, 16]} />
          <meshBasicMaterial color={isCharging ? '#00F5D4' : '#64748B'} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>

        {isCharging && (
          <pointLight ref={glowLightRef} position={[1.1, 0.5, -0.9]} color="#00F5D4" distance={3} decay={2} />
        )}
      </group>

      {/* Umbilical Charging Cable */}
      <mesh geometry={cableGeo}>
        <meshStandardMaterial
          color={isCharging ? '#00F5D4' : '#1E293B'}
          emissive={isCharging ? '#00F5D4' : '#000000'}
          emissiveIntensity={isCharging ? 0.6 : 0.0}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
};

// ─── Split-Inverter AC Cool Air Mist Particles ────────────────────────────────
const AcLouvers: React.FC<{ active: boolean }> = ({ active }) => {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!group.current) return;
    const open = active ? 0.35 + Math.sin(state.clock.elapsedTime * 8) * 0.04 : 0.08;
    group.current.children.forEach((child, i) => {
      child.rotation.x = open + i * 0.01;
    });
  });
  return (
    <group ref={group} position={[0, -0.02, 0.16]}>
      {[-0.12, -0.06, 0, 0.06, 0.12].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[1.02, 0.018, 0.05]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.28} />
        </mesh>
      ))}
    </group>
  );
};

const AcCoolMistParticles: React.FC<{ active: boolean }> = ({ active }) => {
  const count = 28;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const offsets = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 0.9,
        y: Math.random() * -1.4,
        z: Math.random() * 0.7,
        speed: 0.7 + Math.random() * 0.6,
      })),
    [count]
  );

  useFrame((_, delta) => {
    if (!meshRef.current || !active) return;
    const clamped = Math.min(delta, 0.05);

    offsets.forEach((p, i) => {
      p.y -= clamped * p.speed;
      if (p.y < -1.5) p.y = 0;
      dummy.position.set(p.x, p.y - 0.15, p.z + 0.2);
      const s = Math.max(0.02, 0.08 * (1.0 - Math.abs(p.y) / 1.6));
      dummy.scale.set(s, s * 1.6, s);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#38BDF8" transparent opacity={0.35} toneMapped={false} />
    </instancedMesh>
  );
};

// ─── 2-Story Cutaway Modern Architectural Villa ───────────────────────────────
const TwoStoryCutawayVilla: React.FC<{ lightsOn: boolean }> = ({ lightsOn }) => {
  const { concrete, asphalt } = useIndustrialTextures();
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[14, 0.15, 10.5]} />
        <meshStandardMaterial map={asphalt} color="#2c3036" roughness={0.9} metalness={0.08} />
      </mesh>
      <mesh position={[-0.4, 0.05, 0]} receiveShadow>
        <boxGeometry args={[11, 0.06, 8]} />
        <meshStandardMaterial map={concrete} color="#3a414b" roughness={0.55} metalness={0.18} />
      </mesh>

      {/* Second Story Intermediate Mezzanine Slab */}
      <mesh position={[-0.4, 2.7, 0]} castShadow raycast={() => null}>
        <boxGeometry args={[11, 0.12, 8]} />
        <meshStandardMaterial color="#091428" roughness={0.4} metalness={0.5} />
      </mesh>

      {/* Rooftop Upper Slab (Cantilevered) */}
      <mesh position={[-0.4, 3.1, -0.4]} castShadow raycast={() => null}>
        <boxGeometry args={[11.5, 0.1, 7.5]} />
        <meshStandardMaterial color="#060E1C" roughness={0.5} metalness={0.6} />
      </mesh>

      {/* Warm Cedar Wood Accent Feature Walls */}
      <mesh position={[-5.6, 1.35, -1.5]}>
        <boxGeometry args={[0.08, 2.6, 3.5]} />
        <meshStandardMaterial color="#78350F" roughness={0.6} metalness={0.1} />
      </mesh>
      <mesh position={[1.35, 1.35, -2.2]}>
        <boxGeometry args={[0.08, 2.6, 3.2]} />
        <meshStandardMaterial color="#78350F" roughness={0.6} metalness={0.1} />
      </mesh>

      <ArchitecturalSmartGlass
        args={[10.8, 2.6, 0.05]}
        position={[-0.4, 1.35, -3.95]}
        interiorLit={lightsOn}
      />

      {/* Carport Glass Roof Panel */}
      <mesh position={[3.6, 2.5, 2.2]}>
        <boxGeometry args={[4.2, 0.06, 3.2]} />
        <meshPhysicalMaterial
          color="#38BDF8"
          transmission={0.7}
          roughness={0.1}
          transparent
          opacity={0.4}
        />
      </mesh>

      {[
        [-5.6, 1.35, -3.8],
        [4.8, 1.35, -3.8],
        [-5.6, 1.35, 3.8],
        [4.8, 1.35, 3.8],
        [1.35, 1.35, 3.8],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <cylinderGeometry args={[0.1, 0.12, 2.7, 12]} />
          <meshStandardMaterial color="#4b5563" metalness={0.72} roughness={0.38} />
        </mesh>
      ))}

      <group position={[-7.4, 1.8, 4.2]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.11, 0.16, 3.6, 10]} />
          <meshStandardMaterial color="#3f4650" roughness={0.78} metalness={0.25} />
        </mesh>
        <mesh position={[0, 1.62, 0]}>
          <boxGeometry args={[1.35, 0.07, 0.07]} />
          <meshStandardMaterial color="#6b7280" metalness={0.85} roughness={0.3} />
        </mesh>
        <CeramicBushingStack position={[-0.48, 1.66, 0]} height={0.32} />
        <CeramicBushingStack position={[0.48, 1.66, 0]} height={0.32} />
        <mesh position={[0, -1.7, 0]} receiveShadow>
          <cylinderGeometry args={[0.28, 0.34, 0.18, 12]} />
          <meshStandardMaterial color="#6b7280" roughness={0.7} />
        </mesh>
      </group>

      <group position={[-5.8, 1.1, 3.2]}>
        <mesh castShadow>
          <boxGeometry args={[0.22, 0.62, 0.42]} />
          <meshStandardMaterial color="#1f2937" metalness={0.55} roughness={0.42} />
        </mesh>
        <mesh position={[0.12, 0.08, 0]}>
          <boxGeometry args={[0.02, 0.22, 0.28]} />
          <meshBasicMaterial color="#0f766e" toneMapped={false} />
        </mesh>
        <mesh position={[0.12, -0.18, 0]}>
          <boxGeometry args={[0.02, 0.08, 0.18]} />
          <meshStandardMaterial color="#111827" metalness={0.4} roughness={0.5} />
        </mesh>
        <StatusBeacon position={[0.14, 0.28, 0.12]} color="#10B981" />
      </group>

      <mesh position={[-5.4, 1.9, 0.4]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <boxGeometry args={[2.8, 0.08, 0.12]} />
        <meshStandardMaterial color="#374151" metalness={0.7} roughness={0.4} />
      </mesh>

      <pointLight position={[-2.5, 2.3, -1.0]} intensity={lightsOn ? 2.1 : 0.05} color="#ffd79a" distance={8} decay={2} />
      <pointLight position={[1.6, 2.3, 0.4]} intensity={lightsOn ? 1.1 : 0.04} color="#f8e3b0" distance={6} decay={2} />
    </group>
  );
};

// ─── Main Component: SmartHomeTwin ───────────────────────────────────────────
export const SmartHomeTwin: React.FC<{ backdropMode?: 'render' | 'cyber' | 'minimal' }> = ({
  backdropMode = 'render',
}) => {
  const telemetry = useEnergyStore((s) => s.telemetry);
  const selectedApplianceId = useEnergyStore((s) => s.selectedApplianceId);
  const setSelectedApplianceId = useEnergyStore((s) => s.setSelectedApplianceId);
  const flyToAsset = useEnergyStore((s) => s.flyToAsset);
  const controlsRef = useRef<any>(null);

  const smartHome = telemetry.smart_home;
  const appliances = smartHome.appliances;

  const appMap = useMemo(() => {
    return appliances.reduce<Record<string, any>>((acc, app) => {
      acc[app.id] = app;
      return acc;
    }, {});
  }, [appliances]);

  const acApp = appMap['living_room_ac'] || { is_on: true, current_kw: 1.8 };
  const evApp = appMap['ev_charger'] || { is_on: true, current_kw: 3.3 };
  const fridgeApp = appMap['refrigerator'] || { is_on: true, current_kw: 0.22 };
  const heaterApp = appMap['water_heater'] || { is_on: false, current_kw: 0 };
  const lightsApp = appMap['smart_lights'] || { is_on: true, current_kw: 0.15 };

  // Smooth conduit paths
  const utilityToMeterPath = useMemo<[number, number, number][]>(
    () => [
      [-7.4, 3.4, 4.2],
      [-6.8, 2.5, 3.8],
      [-5.8, 1.1, 3.2],
    ],
    []
  );

  const solarToBatteryPath = useMemo<[number, number, number][]>(
    () => [
      [-3.0, 3.0, 0.8],
      [-4.5, 2.4, 0.2],
      [-5.3, 1.3, -1.0],
    ],
    []
  );

  const meterToAcPath = useMemo<[number, number, number][]>(
    () => [
      [-5.8, 1.1, 3.2],
      [-5.3, 1.3, -1.0],
      [-4.5, 0.8, -1.8],
      [-3.5, 2.2, -3.2],
    ],
    []
  );

  const meterToEvPath = useMemo<[number, number, number][]>(
    () => [
      [-5.8, 1.1, 3.2],
      [-2.0, 0.3, 1.5],
      [2.5, 0.3, 1.8],
      [4.9, 1.2, 2.4],
    ],
    []
  );

  const meterToFridgePath = useMemo<[number, number, number][]>(
    () => [
      [-5.8, 1.1, 3.2],
      [-3.5, 0.3, -1.5],
      [0.2, 0.8, -3.2],
    ],
    []
  );

  const selectedApplianceData = selectedApplianceId ? appMap[selectedApplianceId] : null;

  useEffect(() => () => {
    document.body.style.cursor = '';
  }, []);

  const setApplianceCursor = (cursor: 'pointer' | 'grab') => {
    document.body.style.cursor = cursor;
  };

  const handleSelectAppliance = (id: string, coords: [number, number, number]) => {
    setSelectedApplianceId(id);
    flyToAsset([coords[0] + 3, coords[1] + 2.5, coords[2] + 4], coords);
  };

  return (
    <div className="w-full h-full relative select-none bg-[#030712]">
      <Canvas
        camera={{ position: [9, 5.8, 15], fov: 42 }}
        style={{ touchAction: 'none' }}
        shadows
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.08,
        }}
      >
        {/* Studio Lighting, Pedestal, Reflections & Selective HDR Bloom */}
        <StudioEnvironment
          pedestalRadius={13.5}
          laserColor="#00F5D4"
          sparklesColor="#00F5D4"
          theme="consumer"
          backdropMode={backdropMode}
        >
          {/* GSAP Camera Glide Controller */}
          <VillaCameraGlide controlsRef={controlsRef} />

          {/* 2-Story Modern Architectural Cutaway Villa */}
          <TwoStoryCutawayVilla lightsOn={lightsApp.is_on} />

          {/* Monocrystalline Solar PV Array with Light Shafts */}
          <MonocrystallineSolarArray solarKw={smartHome.solar_generation_kw} />

          {/* Wall-Mounted Smart Powerwall Battery */}
          <WallMountedPowerwall
            soc={smartHome.battery_soc_pct}
            isCharging={smartHome.battery_power_kw > 0}
          />

          {/* Carport & Aerodynamic Electric Vehicle */}
          <CarportAndEV isCharging={evApp.is_on} />

          {/* ── Holographic Radar Scanner Ground Ring ── */}
          <HolographicGridScanner radius={13} accentColor="#00F5D4" />

          {/* ── Custom GLSL Traveling Plasma Conduits from EnergyShaders ── */}
          <PlasmaEnergyConduit
            points={utilityToMeterPath}
            colorCore="#00F5D4"
            colorGlow="#0EA5E9"
            speed={1.0}
            active={true}
            radius={0.028}
          />

          <PlasmaEnergyConduit
            points={solarToBatteryPath}
            colorCore="#10B981"
            colorGlow="#059669"
            speed={1.4}
            active={smartHome.solar_generation_kw > 0.15}
            radius={0.026}
          />

          <PlasmaEnergyConduit
            points={meterToAcPath}
            colorCore="#00F5D4"
            colorGlow="#0EA5E9"
            speed={acApp.is_on ? 1.6 : 0.15}
            active={acApp.is_on}
            radius={0.022}
          />

          <PlasmaEnergyConduit
            points={meterToEvPath}
            colorCore="#38BDF8"
            colorGlow="#0284C7"
            speed={evApp.is_on ? 2.0 : 0.12}
            active={evApp.is_on}
            radius={0.026}
          />

          <PlasmaEnergyConduit
            points={meterToFridgePath}
            colorCore="#00F5D4"
            colorGlow="#0EA5E9"
            speed={fridgeApp.is_on ? 1.0 : 0.15}
            active={fridgeApp.is_on}
            radius={0.02}
          />

          {/* ── Interactive 3D Room Appliances with Permanent Floating Pin Markers & Hitboxes ── */}

          {/* 1. Living Room AC with Cool Air Mist */}
          <group
            position={[-3.5, 2.2, -3.2]}
            onPointerOver={() => setApplianceCursor('pointer')}
            onPointerOut={() => setApplianceCursor('grab')}
            onClick={(e) => {
              e.stopPropagation();
              handleSelectAppliance('living_room_ac', [-3.5, 2.2, -3.2]);
            }}
          >
            {/* Generous Invisible Click Hitbox */}
            <mesh visible={false}>
              <boxGeometry args={[1.8, 1.4, 1.4]} />
              <meshBasicMaterial transparent opacity={0} />
            </mesh>
            <mesh castShadow>
              <boxGeometry args={[1.22, 0.42, 0.3]} />
              <meshStandardMaterial color="#d6dce4" metalness={0.45} roughness={0.32} />
            </mesh>
            <mesh position={[0, 0.16, 0.16]}>
              <boxGeometry args={[0.28, 0.04, 0.02]} />
              <meshStandardMaterial
                color={acApp.is_on ? '#10B981' : '#475569'}
                emissive={acApp.is_on ? '#10B981' : '#000'}
                emissiveIntensity={acApp.is_on ? 0.8 : 0}
              />
            </mesh>
            <AcLouvers active={acApp.is_on} />
            <AcCoolMistParticles active={acApp.is_on} />
            <AppliancePinMarker
              position={[0, 0.75, 0]}
              name="Dual-AC"
              kw={acApp.current_kw}
              isOn={acApp.is_on}
              isSelected={selectedApplianceId === 'living_room_ac'}
              onClick={() => handleSelectAppliance('living_room_ac', [-3.5, 2.2, -3.2])}
            />
            {selectedApplianceId === 'living_room_ac' && (
              <DoubleHolographicLaserRing position={[0, -2.1, 0]} color="#00F5D4" />
            )}
          </group>

          {/* 2. EV Fast Wall Connector */}
          <group
            position={[4.9, 1.2, 2.4]}
            onPointerOver={() => setApplianceCursor('pointer')}
            onPointerOut={() => setApplianceCursor('grab')}
            onClick={(e) => {
              e.stopPropagation();
              handleSelectAppliance('ev_charger', [4.9, 1.2, 2.4]);
            }}
          >
            {/* Generous Invisible Click Hitbox */}
            <mesh visible={false}>
              <boxGeometry args={[1.4, 1.6, 1.4]} />
              <meshBasicMaterial transparent opacity={0} />
            </mesh>
            <mesh castShadow>
              <boxGeometry args={[0.22, 0.78, 0.38]} />
              <meshStandardMaterial color="#111827" metalness={0.72} roughness={0.28} />
            </mesh>
            <mesh position={[0.12, 0.18, 0]}>
              <boxGeometry args={[0.02, 0.22, 0.22]} />
              <meshBasicMaterial color={evApp.is_on ? '#22c55e' : '#334155'} toneMapped={false} />
            </mesh>
            <mesh position={[-0.08, -0.22, 0.12]} rotation={[0.4, 0, 0.2]}>
              <cylinderGeometry args={[0.03, 0.03, 0.22, 8]} />
              <meshStandardMaterial color="#1f2937" roughness={0.6} />
            </mesh>
            <StatusBeacon position={[0.14, 0.34, 0.12]} color={evApp.is_on ? '#10B981' : '#64748B'} active={evApp.is_on} />
            <AppliancePinMarker
              position={[0, 0.9, 0]}
              name="EV Wallbox"
              kw={evApp.current_kw}
              isOn={evApp.is_on}
              isSelected={selectedApplianceId === 'ev_charger'}
              onClick={() => handleSelectAppliance('ev_charger', [4.9, 1.2, 2.4])}
            />
            {selectedApplianceId === 'ev_charger' && (
              <DoubleHolographicLaserRing position={[0, -1.1, 0]} color="#10B981" />
            )}
          </group>

          {/* 3. Inverter Refrigerator */}
          <group
            position={[0.2, 0.85, -3.2]}
            onPointerOver={() => setApplianceCursor('pointer')}
            onPointerOut={() => setApplianceCursor('grab')}
            onClick={(e) => {
              e.stopPropagation();
              handleSelectAppliance('refrigerator', [0.2, 0.85, -3.2]);
            }}
          >
            {/* Generous Invisible Click Hitbox */}
            <mesh visible={false}>
              <boxGeometry args={[1.5, 2.2, 1.5]} />
              <meshBasicMaterial transparent opacity={0} />
            </mesh>
            <mesh castShadow>
              <boxGeometry args={[0.72, 1.72, 0.68]} />
              <meshPhysicalMaterial color="#cfd6de" metalness={0.55} roughness={0.22} clearcoat={0.6} />
            </mesh>
            <mesh position={[0.32, 0.12, 0.02]}>
              <boxGeometry args={[0.04, 0.7, 0.04]} />
              <meshStandardMaterial color="#4b5563" metalness={0.8} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.7, 0.35]}>
              <boxGeometry args={[0.18, 0.04, 0.02]} />
              <meshStandardMaterial
                color={fridgeApp.is_on ? '#22c55e' : '#64748b'}
                emissive={fridgeApp.is_on ? '#22c55e' : '#000'}
                emissiveIntensity={fridgeApp.is_on ? 0.7 : 0}
              />
            </mesh>
            <AppliancePinMarker
              position={[0, 1.25, 0]}
              name="Smart Fridge"
              kw={fridgeApp.current_kw}
              isOn={fridgeApp.is_on}
              isSelected={selectedApplianceId === 'refrigerator'}
              onClick={() => handleSelectAppliance('refrigerator', [0.2, 0.85, -3.2])}
            />
            {selectedApplianceId === 'refrigerator' && (
              <DoubleHolographicLaserRing position={[0, -0.8, 0]} color="#00F5D4" />
            )}
          </group>

          {/* 4. Smart Heat Pump Water Heater */}
          <group
            position={[2.2, 0.9, -2.8]}
            onPointerOver={() => setApplianceCursor('pointer')}
            onPointerOut={() => setApplianceCursor('grab')}
            onClick={(e) => {
              e.stopPropagation();
              handleSelectAppliance('water_heater', [2.2, 0.9, -2.8]);
            }}
          >
            {/* Generous Invisible Click Hitbox */}
            <mesh visible={false}>
              <boxGeometry args={[1.4, 1.8, 1.4]} />
              <meshBasicMaterial transparent opacity={0} />
            </mesh>
            <mesh castShadow>
              <cylinderGeometry args={[0.32, 0.34, 1.28, 24]} />
              <meshStandardMaterial color="#9aa3ad" metalness={0.55} roughness={0.38} />
            </mesh>
            <mesh position={[0, 0.68, 0]}>
              <cylinderGeometry args={[0.22, 0.22, 0.08, 16]} />
              <meshStandardMaterial color="#4b5563" metalness={0.8} roughness={0.3} />
            </mesh>
            <mesh position={[0.2, 0.1, 0.22]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.03, 0.03, 0.28, 8]} />
              <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.35} />
            </mesh>
            <StatusBeacon position={[0, 0.22, 0.34]} color={heaterApp.is_on ? '#F59E0B' : '#475569'} active={heaterApp.is_on} />
            <AppliancePinMarker
              position={[0, 1.05, 0]}
              name="Heat Pump Geyser"
              kw={heaterApp.current_kw}
              isOn={heaterApp.is_on}
              isSelected={selectedApplianceId === 'water_heater'}
              onClick={() => handleSelectAppliance('water_heater', [2.2, 0.9, -2.8])}
            />
            {selectedApplianceId === 'water_heater' && (
              <DoubleHolographicLaserRing position={[0, -0.85, 0]} color="#F59E0B" />
            )}
          </group>

          {/* 5. Ambient Circadian Smart Lighting */}
          <group
            position={[-1.5, 2.62, 0]}
            onPointerOver={() => setApplianceCursor('pointer')}
            onPointerOut={() => setApplianceCursor('grab')}
            onClick={(e) => {
              e.stopPropagation();
              handleSelectAppliance('smart_lights', [-1.5, 2.62, 0]);
            }}
          >
            {/* Generous Invisible Click Hitbox */}
            <mesh visible={false}>
              <boxGeometry args={[3.4, 0.8, 1.2]} />
              <meshBasicMaterial transparent opacity={0} />
            </mesh>
            <mesh>
              <boxGeometry args={[3.2, 0.04, 0.08]} />
              <meshBasicMaterial color={lightsApp.is_on ? '#FACC15' : '#334155'} toneMapped={false} />
            </mesh>
            <AppliancePinMarker
              position={[0, 0.4, 0]}
              name="Smart Lighting"
              kw={lightsApp.current_kw}
              isOn={lightsApp.is_on}
              isSelected={selectedApplianceId === 'smart_lights'}
              onClick={() => handleSelectAppliance('smart_lights', [-1.5, 2.62, 0])}
            />
            {selectedApplianceId === 'smart_lights' && (
              <DoubleHolographicLaserRing position={[0, -2.5, 0]} color="#FACC15" />
            )}
          </group>

          {/* ── Single Crisp Floating Glass Telemetry Card on Click (Zero Text Overlaps!) ── */}
          {selectedApplianceData && (
            <Html
              position={
                selectedApplianceId === 'living_room_ac'
                  ? [-3.5, 3.0, -3.2]
                  : selectedApplianceId === 'ev_charger'
                  ? [4.9, 2.0, 2.4]
                  : selectedApplianceId === 'refrigerator'
                  ? [0.2, 2.0, -3.2]
                  : selectedApplianceId === 'water_heater'
                  ? [2.2, 1.8, -2.8]
                  : [-1.5, 3.2, 0]
              }
              center
              distanceFactor={12}
            >
              <div className="w-56 p-3.5 rounded-2xl bg-[#091122]/95 border border-cyan-400/40 shadow-[0_8px_32px_rgba(0,0,0,0.8)] backdrop-blur-xl text-slate-100 flex flex-col gap-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-bold truncate max-w-[140px]">
                      {selectedApplianceData.name}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedApplianceId(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                  <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-500 block">Rated Power</span>
                    <span className="text-white font-bold">{selectedApplianceData.rated_kw} kW</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-500 block">Live Draw</span>
                    <span className="text-cyan-300 font-bold tabular-nums">
                      {selectedApplianceData.current_kw.toFixed(2)} kW
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => energyWs.toggleAppliance(selectedApplianceData.id, !selectedApplianceData.is_on)}
                  className={`w-full py-1.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md ${
                    selectedApplianceData.is_on
                      ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40'
                      : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{selectedApplianceData.is_on ? 'Switch Appliance OFF' : 'Switch Appliance ON'}</span>
                </button>

                <button
                  onClick={() => flyToAsset([9, 5.8, 15], [0, 1.2, 0])}
                  className="w-full py-1 text-[10px] font-mono font-bold text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors"
                >
                  Reset Camera to Overview
                </button>
              </div>
            </Html>
          )}

          {/* Smooth Damped Orbit Controls */}
          <OrbitControls
            ref={controlsRef}
            makeDefault
            enableDamping
            dampingFactor={0.05}
            maxPolarAngle={Math.PI / 2.15}
            minDistance={4.5}
            maxDistance={32}
            target={[0, 1.2, 0]}
          />
        </StudioEnvironment>
      </Canvas>
    </div>
  );
};

export default SmartHomeTwin;
