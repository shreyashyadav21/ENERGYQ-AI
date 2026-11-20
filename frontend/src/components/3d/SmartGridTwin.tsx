import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { useEnergyStore } from '../../stores/energyStore';
import { energyWs } from '../../services/websocket';
import { StudioEnvironment } from './StudioEnvironment';
import { PlasmaEnergyConduit, HolographicGridScanner, ThermalHeatPlume } from './EnergyShaders';
import { ElectricArcBolt } from './AdvancedShaders';
import {
  CeramicBushingStack,
  CoolingFan,
  SteelLatticeMast,
  StatusBeacon,
  useIndustrialTextures,
} from './IndustrialKit';
import { Activity, Wrench, X, Network, Zap, Send, CheckCircle2 } from 'lucide-react';

// ─── Floating 3D Locality & Substation Interactive Pin Badge ─────────────────
const Locality3DBadge: React.FC<{
  position: [number, number, number];
  title: string;
  sub: string;
  isAnomaly: boolean;
  isSelected: boolean;
  onClick: () => void;
}> = ({ position, title, sub, isAnomaly, isSelected, onClick }) => {
  return (
    <Html position={position} center distanceFactor={16}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-mono font-bold transition-all transform hover:scale-115 active:scale-95 shadow-[0_4px_24px_rgba(0,0,0,0.9)] backdrop-blur-md cursor-pointer ${
          isSelected
            ? 'bg-blue-500 text-white border-2 border-cyan-300 shadow-[0_0_25px_rgba(59,130,246,0.9)] scale-110 font-black'
            : isAnomaly
            ? 'bg-red-950/95 text-red-200 border border-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.7)]'
            : 'bg-[#09152D]/95 text-white border border-blue-400/40 hover:border-cyan-300'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isAnomaly
              ? 'bg-red-500 shadow-[0_0_8px_#EF4444]'
              : isSelected
              ? 'bg-cyan-300 shadow-[0_0_8px_#38BDF8]'
              : 'bg-emerald-400 shadow-[0_0_8px_#10B981]'
          }`}
        />
        <span>{title}</span>
        <span className={`${isSelected ? 'text-white' : 'text-cyan-300'} font-extrabold`}>
          {sub}
        </span>
      </button>
    </Html>
  );
};

// ─── Camera Glide Controller ──────────────────────────────────────────────────
const GridCameraGlide: React.FC<{ controlsRef: React.RefObject<any> }> = ({ controlsRef }) => {
  const { camera } = useThree();
  const cameraPosition = useEnergyStore((s) => s.cameraPosition);
  const cameraTarget = useEnergyStore((s) => s.cameraTarget);
  const flyTimestamp = useEnergyStore((s) => s.cameraFlyTimestamp);

  useEffect(() => {
    if (!cameraPosition) return;
    const targetLook = cameraTarget || [0, 1.5, 0];

    gsap.to(camera.position, {
      x: cameraPosition[0] + (cameraPosition[0] === 0 ? 0 : cameraPosition[0] > 0 ? 4 : -4),
      y: Math.max(9, cameraPosition[1] + 6),
      z: cameraPosition[2] + 8,
      duration: 1.6,
      ease: 'power3.inOut',
      onUpdate: () => camera.updateProjectionMatrix(),
    });

    if (controlsRef.current) {
      gsap.to(controlsRef.current.target, {
        x: targetLook[0],
        y: targetLook[1],
        z: targetLook[2],
        duration: 1.6,
        ease: 'power3.inOut',
        onUpdate: () => controlsRef.current.update(),
      });
    }
  }, [flyTimestamp]);

  return null;
};

// ─── 4 Side-Mounted Radiator Cooling Fans with Dynamic RPM ───────────────────
const RadiatorFanAssemblies: React.FC<{ oilTempC: number }> = ({ oilTempC }) => {
  const rpm = Math.max(2.8, (oilTempC - 42) * 0.55);
  return (
    <group>
      <CoolingFan position={[-0.55, 0.95, 1.12]} rpm={rpm} rotation={[Math.PI / 2, 0, 0]} />
      <CoolingFan position={[0.55, 0.95, 1.12]} rpm={rpm * 1.05} rotation={[Math.PI / 2, 0, 0]} />
      <CoolingFan position={[-0.55, 0.95, -1.12]} rpm={rpm * 0.95} rotation={[-Math.PI / 2, 0, 0]} />
      <CoolingFan position={[0.55, 0.95, -1.12]} rpm={rpm} rotation={[-Math.PI / 2, 0, 0]} />
    </group>
  );
};

// ─── Rising Volumetric Thermal Heat-Haze Particles (Warning State) ────────────
const ThermalHeatHazePoints: React.FC<{ active: boolean }> = ({ active }) => {
  const count = 48;
  const pointsRef = useRef<THREE.Points>(null);

  const [positions, speeds] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 2.2;
      pos[i * 3 + 1] = 1.0 + Math.random() * 2.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2.2;
      spd[i] = 0.8 + Math.random() * 0.8;
    }
    return [pos, spd];
  }, [count]);

  useFrame((_, delta) => {
    if (!pointsRef.current || !active) return;
    const posAttr = pointsRef.current.geometry.attributes.position;
    const array = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      array[i * 3 + 1] += delta * speeds[i];
      // reset when rising too high
      if (array[i * 3 + 1] > 4.5) {
        array[i * 3 + 1] = 1.2;
        array[i * 3 + 0] = (Math.random() - 0.5) * 2.2;
        array[i * 3 + 2] = (Math.random() - 0.5) * 2.2;
      }
    }
    posAttr.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.12}
        color="#F59E0B"
        transparent
        opacity={0.45}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// ─── Expanding Red Shockwave Ring on Fault ────────────────────────────────────
const ExpandingShockwaveRing: React.FC<{ active: boolean }> = ({ active }) => {
  const ringRef = useRef<THREE.Mesh>(null);
  const scaleRef = useRef(1);

  useFrame((_, delta) => {
    if (!ringRef.current || !active) return;
    scaleRef.current += delta * 6;
    if (scaleRef.current > 18) scaleRef.current = 1.0;
    ringRef.current.scale.set(scaleRef.current, scaleRef.current, 1);
    const mat = ringRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = Math.max(0, 0.9 * (1.0 - scaleRef.current / 18));
  });

  if (!active) return null;

  return (
    <mesh ref={ringRef} position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.2, 1.45, 48]} />
      <meshBasicMaterial color="#EF4444" side={THREE.DoubleSide} transparent opacity={0.8} toneMapped={false} />
    </mesh>
  );
};

// ─── Central High-Voltage 66/11kV Substation Diorama Complex ───────────────────
const CentralSubstationComplex: React.FC<{
  oilTempC: number;
  isFault: boolean;
  isSelected?: boolean;
  onClick?: () => void;
}> = ({ oilTempC, isFault, isSelected = false, onClick }) => {
  const strobeRef = useRef<THREE.PointLight>(null);
  const [hovered, setHovered] = useState(false);
  const isOverheating = oilTempC > 75;

  useFrame((state) => {
    if (strobeRef.current) {
      if (isFault) {
        strobeRef.current.intensity = Math.sin(state.clock.elapsedTime * 14) > 0 ? 3.5 : 0;
      } else {
        strobeRef.current.intensity = 0;
      }
    }
  });

  const { concrete } = useIndustrialTextures();
  const heat = THREE.MathUtils.clamp((oilTempC - 50) / 40, 0, 1);
  const tankColor = useMemo(() => {
    return new THREE.Color('#5b6b4a').lerp(new THREE.Color('#b45309'), heat).lerp(new THREE.Color('#b91c1c'), isFault ? 0.55 : 0);
  }, [heat, isFault]);

  return (
    <group
      position={[0, 0, 0]}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      {(hovered || isSelected) && (
        <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3.3, 3.6, 48]} />
          <meshBasicMaterial
            color={isFault ? '#EF4444' : '#00F5D4'}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      )}
      <mesh position={[0, -0.04, 0]} receiveShadow>
        <boxGeometry args={[6.4, 0.22, 6.4]} />
        <meshStandardMaterial map={concrete} color="#6b7280" roughness={0.9} metalness={0.08} />
      </mesh>
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <boxGeometry args={[4.6, 0.08, 4.4]} />
        <meshStandardMaterial color="#3f4650" roughness={0.85} metalness={0.12} />
      </mesh>

      <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.7, 1.9, 1.85]} />
        <meshStandardMaterial
          color={tankColor}
          metalness={0.62}
          roughness={0.38}
          emissive={isOverheating ? '#f59e0b' : '#000000'}
          emissiveIntensity={isOverheating ? 0.22 + heat * 0.35 : 0}
        />
      </mesh>
      <mesh position={[0.95, 0.55, 0.95]} castShadow>
        <boxGeometry args={[0.55, 0.7, 0.08]} />
        <meshStandardMaterial color="#111827" metalness={0.4} roughness={0.5} />
      </mesh>

      <mesh position={[0, 2.22, -0.35]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.32, 0.32, 1.9, 18]} />
        <meshStandardMaterial color="#6b7280" metalness={0.78} roughness={0.28} />
      </mesh>
      <mesh position={[0.95, 2.22, -0.35]}>
        <cylinderGeometry args={[0.12, 0.12, 0.18, 10]} />
        <meshStandardMaterial color="#374151" metalness={0.7} roughness={0.35} />
      </mesh>

      {[-1.5, 1.5].map((xSide) => (
        <group key={xSide} position={[xSide, 1.0, 0]}>
          {[-0.7, -0.5, -0.3, -0.1, 0.1, 0.3, 0.5, 0.7].map((z) => (
            <mesh key={z} position={[0, 0, z]} castShadow>
              <boxGeometry args={[0.2, 1.55, 0.045]} />
              <meshStandardMaterial
                color={isOverheating ? '#d97706' : '#4b5563'}
                emissive={isOverheating ? '#f59e0b' : '#000000'}
                emissiveIntensity={isOverheating ? 0.35 : 0}
                metalness={0.7}
                roughness={0.32}
              />
            </mesh>
          ))}
        </group>
      ))}

      <RadiatorFanAssemblies oilTempC={oilTempC} />

      {[-0.85, 0, 0.85].map((x) => (
        <CeramicBushingStack key={x} position={[x, 2.05, 0.18]} height={0.85} live={!isFault} fault={isFault} />
      ))}

      <SteelLatticeMast height={5.2} position={[-2.05, 0, 0]} />
      <SteelLatticeMast height={5.2} position={[2.05, 0, 0]} />
      <mesh position={[0, 5.15, 0]} castShadow>
        <boxGeometry args={[4.4, 0.08, 0.08]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.88} roughness={0.25} />
      </mesh>
      {[-0.18, 0, 0.18].map((z) => (
        <mesh key={z} position={[0, 4.95, z]}>
          <boxGeometry args={[3.8, 0.03, 0.03]} />
          <meshStandardMaterial
            color={isFault ? '#ef4444' : '#cbd5e1'}
            emissive={isFault ? '#ef4444' : '#38bdf8'}
            emissiveIntensity={isFault ? 0.9 : 0.35}
            metalness={0.9}
            roughness={0.18}
          />
        </mesh>
      ))}

      <mesh position={[2.3, 1.05, 1.8]} castShadow>
        <boxGeometry args={[1.1, 1.9, 0.9]} />
        <meshStandardMaterial color="#334155" metalness={0.45} roughness={0.48} />
      </mesh>
      <mesh position={[2.3, 1.5, 2.27]}>
        <boxGeometry args={[0.7, 0.35, 0.02]} />
        <meshBasicMaterial color="#0f766e" toneMapped={false} />
      </mesh>
      <StatusBeacon position={[0, 5.35, 0]} color={isFault ? '#EF4444' : '#22c55e'} active />
      <pointLight ref={strobeRef} position={[0, 5.4, 0]} color="#EF4444" distance={14} decay={2} />

      <ThermalHeatHazePoints active={isOverheating} />
      <ElectricArcBolt active={isFault} start={[-0.85, 2.95, 0.18]} end={[0, 2.95, 0.18]} />
      <ElectricArcBolt active={isFault} start={[0, 2.95, 0.18]} end={[0.85, 2.95, 0.18]} />
      <ExpandingShockwaveRing active={isFault} />
    </group>
  );
};

// ─── 4 Corner Locality Micro-Clusters (Indiranagar, Koramangala, etc.) ────────
const CornerLocalityCluster: React.FC<{
  locality: string;
  position: [number, number, number];
  isAlert?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
}> = ({ locality, position, isAlert = false, isSelected = false, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const buildings = useMemo(() => {
    return [
      { pos: [-1.2, 1.4, -0.8], size: [1.3, 2.8, 1.3] },
      { pos: [0.8, 2.0, -0.6], size: [1.4, 4.0, 1.4] },
      { pos: [-0.3, 1.0, 1.0], size: [1.1, 2.0, 1.1] },
      { pos: [1.2, 0.8, 0.9], size: [1.0, 1.6, 1.0] },
    ];
  }, []);

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      {/* Cluster Selection / Hover Ring */}
      {(hovered || isSelected) && (
        <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.5, 2.85, 36]} />
          <meshBasicMaterial
            color={isAlert ? '#EF4444' : isSelected ? '#3B82F6' : '#00F5D4'}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* Cluster Base Platform */}
      <mesh position={[0, 0.01, 0]} receiveShadow>
        <boxGeometry args={[4.2, 0.05, 4.2]} />
        <meshStandardMaterial color="#081022" roughness={0.8} />
      </mesh>

      {/* Stepped Glass Architectural Commercial & Residential Towers */}
      {buildings.map((b, idx) => (
        <mesh key={idx} position={b.pos as [number, number, number]} castShadow receiveShadow>
          <boxGeometry args={b.size as [number, number, number]} />
          <meshPhysicalMaterial
            color="#1e293b"
            emissive={isAlert ? '#EF4444' : '#1e3a5f'}
            emissiveIntensity={isAlert ? 0.28 : 0.08}
            metalness={0.55}
            roughness={0.32}
            clearcoat={0.35}
          />
        </mesh>
      ))}
      {buildings.map((b, idx) => (
        <mesh key={`win-${idx}`} position={[b.pos[0], b.pos[1] * 0.15, b.pos[2] + b.size[2] / 2 + 0.01]}>
          <planeGeometry args={[b.size[0] * 0.7, b.size[1] * 0.55]} />
          <meshStandardMaterial
            color={isAlert ? '#7f1d1d' : '#fbbf24'}
            emissive={isAlert ? '#ef4444' : '#f59e0b'}
            emissiveIntensity={0.35}
            transparent
            opacity={0.55}
          />
        </mesh>
      ))}

      <group position={[1.4, 0.9, -1.4]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.07, 0.09, 1.9, 8]} />
          <meshStandardMaterial color="#6b7280" metalness={0.7} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.55, 0.12]} castShadow>
          <cylinderGeometry args={[0.18, 0.18, 0.5, 12]} />
          <meshStandardMaterial color="#4b5563" metalness={0.65} roughness={0.35} />
        </mesh>
        <CeramicBushingStack position={[0, 0.85, 0.12]} height={0.28} fault={isAlert} />
      </group>
    </group>
  );
};

// ─── 120 Instanced Directional Power Flow Pulses along Overhead Catenaries ─────
const InstancedCatenaryPulses: React.FC<{
  feeders: {
    start: [number, number, number];
    end: [number, number, number];
    color: string;
    speed: number;
    active: boolean;
  }[];
}> = ({ feeders }) => {
  const countPerFeeder = 30;
  const totalCount = feeders.length * countPerFeeder;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const tangent = useMemo(() => new THREE.Vector3(), []);
  const pt = useMemo(() => new THREE.Vector3(), []);
  const palette = useMemo(() => feeders.map((f) => new THREE.Color(f.color)), [feeders]);

  const curves = useMemo(() => {
    return feeders.map((f) => {
      const mid: [number, number, number] = [
        (f.start[0] + f.end[0]) * 0.5,
        (f.start[1] + f.end[1]) * 0.5 - 0.85,
        (f.start[2] + f.end[2]) * 0.5,
      ];
      return new THREE.CatmullRomCurve3([
        new THREE.Vector3(...f.start),
        new THREE.Vector3(...mid),
        new THREE.Vector3(...f.end),
      ]);
    });
  }, [feeders]);

  // Offsets array
  const offsets = useMemo(() => {
    return Array.from({ length: totalCount }, (_, i) => (i % countPerFeeder) / countPerFeeder);
  }, [totalCount, countPerFeeder]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const clamped = Math.min(delta, 0.05);

    let idx = 0;
    feeders.forEach((f, fIdx) => {
      const curve = curves[fIdx];
      const curSpeed = f.active ? f.speed : 0.08;

      for (let i = 0; i < countPerFeeder; i++) {
        offsets[idx] = (offsets[idx] + clamped * 0.35 * curSpeed) % 1.0;
        curve.getPointAt(offsets[idx], pt);
        dummy.position.copy(pt);
        curve.getTangentAt(offsets[idx], tangent);
        dummy.quaternion.setFromUnitVectors(up, tangent);
        const scale = f.active ? 0.055 : 0.018;
        dummy.scale.set(scale, scale * 2.8, scale);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(idx, dummy.matrix);
        meshRef.current!.setColorAt(idx, palette[fIdx]);
        idx++;
      }
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, totalCount]}>
      <capsuleGeometry args={[1, 1, 6, 8]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
};

// ─── Main Component: SmartGridTwin ───────────────────────────────────────────
export const SmartGridTwin: React.FC<{ backdropMode?: 'render' | 'cyber' | 'minimal' }> = ({
  backdropMode = 'render',
}) => {
  const telemetry = useEnergyStore((s) => s.telemetry);
  const selectedTxId = useEnergyStore((s) => s.selectedTransformerId);
  const setSelectedTxId = useEnergyStore((s) => s.setSelectedTransformerId);
  const flyToAsset = useEnergyStore((s) => s.flyToAsset);
  const controlsRef = useRef<any>(null);

  const transformers = telemetry.transformers;

  const txPosMap: Record<string, [number, number, number]> = {
    tx_indiranagar: [-10.5, 0, 7.5],
    tx_koramangala: [10.5, 0, 7.5],
    tx_yelahanka: [-10.5, 0, -8.5],
    tx_whitefield: [10.5, 0, -8.5],
    tx_jayanagar: [-8, 0, 0],
    tx_hebbal: [8, 0, 0],
  };

  const selectedTxData = useMemo(() => {
    return transformers.find((t) => t.id === selectedTxId) || null;
  }, [transformers, selectedTxId]);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const maxOilTemp = useMemo(() => {
    return Math.max(50, ...transformers.map((t) => t.oil_temp_c || 50));
  }, [transformers]);

  const isAnyCriticalFault = useMemo(() => {
    return transformers.some((t) => t.is_ml_anomaly);
  }, [transformers]);

  // 4 Primary Locality Catenary Lines from Substation to Corners
  const catenaryFeeders = useMemo(() => {
    return [
      {
        start: [0, 4.0, 0] as [number, number, number],
        end: [-10.5, 1.8, 7.5] as [number, number, number],
        color: transformers.some((t) => t.id === 'tx_indiranagar' && t.is_ml_anomaly) ? '#EF4444' : '#00F5D4',
        speed: 1.4,
        active: !transformers.some((t) => t.id === 'tx_indiranagar' && t.is_ml_anomaly),
      },
      {
        start: [0, 4.0, 0] as [number, number, number],
        end: [10.5, 1.8, 7.5] as [number, number, number],
        color: transformers.some((t) => t.id === 'tx_koramangala' && t.is_ml_anomaly) ? '#EF4444' : '#00F5D4',
        speed: 1.3,
        active: !transformers.some((t) => t.id === 'tx_koramangala' && t.is_ml_anomaly),
      },
      {
        start: [0, 4.0, 0] as [number, number, number],
        end: [-10.5, 1.8, -8.5] as [number, number, number],
        color: transformers.some((t) => t.id === 'tx_yelahanka' && t.is_ml_anomaly) ? '#EF4444' : '#00F5D4',
        speed: transformers.some((t) => t.id === 'tx_yelahanka' && t.is_ml_anomaly) ? 0.2 : 1.5,
        active: !transformers.some((t) => t.id === 'tx_yelahanka' && t.is_ml_anomaly),
      },
      {
        start: [0, 4.0, 0] as [number, number, number],
        end: [10.5, 1.8, -8.5] as [number, number, number],
        color: transformers.some((t) => t.id === 'tx_whitefield' && t.is_ml_anomaly) ? '#EF4444' : '#00F5D4',
        speed: 1.2,
        active: !transformers.some((t) => t.id === 'tx_whitefield' && t.is_ml_anomaly),
      },
    ];
  }, [transformers]);

  const handleSelectTransformer = (txId: string, coords: [number, number, number]) => {
    setSelectedTxId(txId);
    flyToAsset([coords[0] + 4, coords[1] + 5, coords[2] + 6], coords);
  };

  const handleSelectSubstation = () => {
    setSelectedTxId('central_substation');
    flyToAsset([0, 7.5, 9.5], [0, 1.8, 0]);
  };

  return (
    <div className="w-full h-full relative select-none bg-[#030712]">
      {/* ── 3D Floating Interactive Toast ── */}
      {toastMsg && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-xl bg-cyan-950/90 border border-cyan-400/50 text-cyan-200 text-xs font-semibold backdrop-blur-xl shadow-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      <Canvas
        camera={{ position: [0, 19, 23], fov: 46 }}
        shadows
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
      >
        {/* Studio Lighting, Pedestal, Reflections & Selective HDR Bloom */}
        <StudioEnvironment
          pedestalRadius={16.5}
          laserColor="#3B82F6"
          sparklesColor="#3B82F6"
          theme="operator"
          backdropMode={backdropMode}
        >
          {/* GSAP Camera Glide Controller */}
          <GridCameraGlide controlsRef={controlsRef} />

          {/* Central 66/11kV Substation Diorama with Rotating Cooling Fans */}
          <CentralSubstationComplex
            oilTempC={maxOilTemp}
            isFault={isAnyCriticalFault}
            isSelected={selectedTxId === 'central_substation'}
            onClick={handleSelectSubstation}
          />
          <Locality3DBadge
            position={[0, 4.2, 0]}
            title="66/11kV Substation"
            sub={isAnyCriticalFault ? 'FAULT' : '2,952 kVA'}
            isAnomaly={isAnyCriticalFault}
            isSelected={selectedTxId === 'central_substation'}
            onClick={handleSelectSubstation}
          />

          {/* ── Volumetric Thermal Heat Plume from EnergyShaders ── */}
          <ThermalHeatPlume active={isAnyCriticalFault || maxOilTemp > 75} position={[0, 2.8, 0]} />

          {/* ── Holographic Radar Scanner Ground Ring ── */}
          <HolographicGridScanner
            radius={16}
            accentColor={isAnyCriticalFault ? '#EF4444' : '#00F5D4'}
            faultIntensity={isAnyCriticalFault ? 1.0 : 0.0}
          />

          {/* 4 Corner Locality Architectural City Blocks with Floating Badges */}
          <group>
            <CornerLocalityCluster
              locality="Indiranagar"
              position={[-10.5, 0, 7.5]}
              isAlert={transformers.some((t) => t.id === 'tx_indiranagar' && t.is_ml_anomaly)}
              isSelected={selectedTxId === 'tx_indiranagar'}
              onClick={() => handleSelectTransformer('tx_indiranagar', [-10.5, 0, 7.5])}
            />
            <Locality3DBadge
              position={[-10.5, 3.4, 7.5]}
              title="Indiranagar"
              sub={`${(transformers.find((t) => t.id === 'tx_indiranagar')?.load_pct || 64).toFixed(0)}%`}
              isAnomaly={transformers.some((t) => t.id === 'tx_indiranagar' && t.is_ml_anomaly)}
              isSelected={selectedTxId === 'tx_indiranagar'}
              onClick={() => handleSelectTransformer('tx_indiranagar', [-10.5, 0, 7.5])}
            />

            <CornerLocalityCluster
              locality="Koramangala"
              position={[10.5, 0, 7.5]}
              isAlert={transformers.some((t) => t.id === 'tx_koramangala' && t.is_ml_anomaly)}
              isSelected={selectedTxId === 'tx_koramangala'}
              onClick={() => handleSelectTransformer('tx_koramangala', [10.5, 0, 7.5])}
            />
            <Locality3DBadge
              position={[10.5, 3.4, 7.5]}
              title="Koramangala"
              sub={`${(transformers.find((t) => t.id === 'tx_koramangala')?.load_pct || 62).toFixed(0)}%`}
              isAnomaly={transformers.some((t) => t.id === 'tx_koramangala' && t.is_ml_anomaly)}
              isSelected={selectedTxId === 'tx_koramangala'}
              onClick={() => handleSelectTransformer('tx_koramangala', [10.5, 0, 7.5])}
            />

            <CornerLocalityCluster
              locality="Yelahanka"
              position={[-10.5, 0, -8.5]}
              isAlert={transformers.some((t) => t.id === 'tx_yelahanka' && t.is_ml_anomaly)}
              isSelected={selectedTxId === 'tx_yelahanka'}
              onClick={() => handleSelectTransformer('tx_yelahanka', [-10.5, 0, -8.5])}
            />
            <Locality3DBadge
              position={[-10.5, 3.4, -8.5]}
              title="Yelahanka"
              sub={`${(transformers.find((t) => t.id === 'tx_yelahanka')?.load_pct || 68).toFixed(0)}%`}
              isAnomaly={transformers.some((t) => t.id === 'tx_yelahanka' && t.is_ml_anomaly)}
              isSelected={selectedTxId === 'tx_yelahanka'}
              onClick={() => handleSelectTransformer('tx_yelahanka', [-10.5, 0, -8.5])}
            />

            <CornerLocalityCluster
              locality="Whitefield"
              position={[10.5, 0, -8.5]}
              isAlert={transformers.some((t) => t.id === 'tx_whitefield' && t.is_ml_anomaly)}
              isSelected={selectedTxId === 'tx_whitefield'}
              onClick={() => handleSelectTransformer('tx_whitefield', [10.5, 0, -8.5])}
            />
            <Locality3DBadge
              position={[10.5, 3.4, -8.5]}
              title="Whitefield"
              sub={`${(transformers.find((t) => t.id === 'tx_whitefield')?.load_pct || 66).toFixed(0)}%`}
              isAnomaly={transformers.some((t) => t.id === 'tx_whitefield' && t.is_ml_anomaly)}
              isSelected={selectedTxId === 'tx_whitefield'}
              onClick={() => handleSelectTransformer('tx_whitefield', [10.5, 0, -8.5])}
            />
          </group>

          {/* 120 Instanced Directional Power Flow Pulses along Catenaries */}
          <InstancedCatenaryPulses feeders={catenaryFeeders} />

          {/* ── High-Energy Travelling Plasma Conduits from EnergyShaders ── */}
          {catenaryFeeders.map((f, idx) => {
            const midX = (f.start[0] + f.end[0]) * 0.5;
            const midY = (f.start[1] + f.end[1]) * 0.5 - 0.85;
            const midZ = (f.start[2] + f.end[2]) * 0.5;
            return (
              <group key={`cat-plasma-${idx}`}>
                {[-0.12, 0, 0.12].map((off, phase) => (
                  <PlasmaEnergyConduit
                    key={phase}
                    points={[
                      [f.start[0], f.start[1] + off, f.start[2]],
                      [midX, midY + off, midZ],
                      [f.end[0], f.end[1] + off, f.end[2]],
                    ]}
                    colorCore={f.color}
                    colorGlow={f.color === '#EF4444' ? '#991B1B' : '#0369a1'}
                    speed={f.speed * (1 + phase * 0.08)}
                    active={f.active}
                    radius={0.028}
                  />
                ))}
              </group>
            );
          })}

          {/* ── Transformers at Localities with Click Selection ── */}
          {transformers.map((tx) => {
            const pos = txPosMap[tx.id] || [0, 0, 0];
            const isSelected = selectedTxId === tx.id;
            const isAnomaly = tx.is_ml_anomaly;

            return (
              <group
                key={tx.id}
                position={pos}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectTransformer(tx.id, pos);
                }}
              >
                {/* Transformer Step-Down Model */}
                <mesh position={[0, 0.7, 0]} castShadow>
                  <boxGeometry args={[1.15, 1.25, 0.95]} />
                  <meshStandardMaterial
                    color={isAnomaly ? '#9a3412' : '#4b5563'}
                    emissive={isAnomaly ? '#EF4444' : isSelected ? '#2563eb' : '#000000'}
                    emissiveIntensity={isAnomaly ? 0.4 : isSelected ? 0.2 : 0.0}
                    metalness={0.62}
                    roughness={0.38}
                  />
                </mesh>
                {[-0.22, 0.22].map((x) => (
                  <mesh key={x} position={[x, 1.4, 0]}>
                    <cylinderGeometry args={[0.05, 0.08, 0.28, 8]} />
                    <meshStandardMaterial color="#c4a574" roughness={0.45} />
                  </mesh>
                ))}
                <mesh position={[0.62, 0.7, 0]} castShadow>
                  <boxGeometry args={[0.12, 1.0, 0.7]} />
                  <meshStandardMaterial color="#6b7280" metalness={0.7} roughness={0.32} />
                </mesh>

                {/* Ground LiDAR Sweep / Selection Ring */}
                <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[1.1, 1.35, 32]} />
                  <meshBasicMaterial
                    color={isAnomaly ? '#EF4444' : isSelected ? '#3B82F6' : '#00F5D4'}
                    side={THREE.DoubleSide}
                    toneMapped={false}
                    transparent
                    opacity={isSelected ? 0.95 : 0.45}
                  />
                </mesh>
              </group>
            );
          })}

          {/* ── Single Crisp Floating Glass Telemetry Card on Click (Zero Text Overlaps!) ── */}
          {selectedTxData && (
            <Html
              position={[
                (txPosMap[selectedTxData.id] || [0, 0, 0])[0],
                (txPosMap[selectedTxData.id] || [0, 0, 0])[1] + 2.6,
                (txPosMap[selectedTxData.id] || [0, 0, 0])[2],
              ]}
              center
              distanceFactor={14}
            >
              <div className="w-64 p-3.5 rounded-2xl bg-[#091122]/95 border border-blue-500/40 shadow-[0_8px_32px_rgba(0,0,0,0.85)] backdrop-blur-xl text-slate-100 flex flex-col gap-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-bold truncate max-w-[160px]">
                      {selectedTxData.locality} Distribution DT
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedTxId(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                  <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-500 block">Load Draw</span>
                    <span className="text-cyan-300 font-bold tabular-nums">
                      {selectedTxData.load_pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-500 block">Oil Temp</span>
                    <span className={`font-bold tabular-nums ${selectedTxData.oil_temp_c > 75 ? 'text-red-400' : 'text-slate-200'}`}>
                      {selectedTxData.oil_temp_c.toFixed(1)}°C
                    </span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-500 block">Phase VR</span>
                    <span className="text-slate-200 font-bold tabular-nums">
                      {selectedTxData.phase_voltages?.V_R || 230.2}V
                    </span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-500 block">AI Health</span>
                    <span className="text-emerald-300 font-bold tabular-nums">
                      {selectedTxData.health_score || 94}%
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => energyWs.assignCrew(selectedTxData.id)}
                    disabled={Boolean(selectedTxData.maintenance_dispatched || selectedTxData.crew_assigned)}
                    className={`w-full py-1.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md ${
                      (selectedTxData.maintenance_dispatched || selectedTxData.crew_assigned)
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                        : 'bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/50'
                    }`}
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>
                      {(selectedTxData.maintenance_dispatched || selectedTxData.crew_assigned)
                        ? 'Field Crew Dispatched'
                        : 'Dispatch Field Crew'}
                    </span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => energyWs.triggerEvent(selectedTxData.is_ml_anomaly ? 'reset_nominal' : 'feeder_trip_whitefield')}
                      className="flex-1 py-1.5 px-2 rounded-xl text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 flex items-center justify-center gap-1"
                    >
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span>{selectedTxData.is_ml_anomaly ? 'Reset Feeder' : 'Trip Breaker'}</span>
                    </button>
                    <button
                      onClick={() => {
                        setToastMsg(`SMS notification broadcast to ${selectedTxData.locality} residents`);
                        setTimeout(() => setToastMsg(null), 3500);
                      }}
                      className="flex-1 py-1.5 px-2 rounded-xl text-[10px] font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center justify-center gap-1"
                    >
                      <Send className="w-3 h-3 text-cyan-400" />
                      <span>Broadcast SMS</span>
                    </button>
                  </div>
                </div>
              </div>
            </Html>
          )}

          {/* ── Central Substation Diagnostic Card ── */}
          {selectedTxId === 'central_substation' && (
            <Html position={[0, 4.4, 0]} center distanceFactor={14}>
              <div className="w-72 p-4 rounded-2xl bg-[#09152D]/95 border border-cyan-400/50 shadow-[0_12px_45px_rgba(0,0,0,0.85)] backdrop-blur-xl text-slate-100 flex flex-col gap-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Network className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white">Central 66/11kV Substation</span>
                  </div>
                  <button
                    onClick={() => setSelectedTxId(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                  <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-500 block">Total Load</span>
                    <span className="text-cyan-300 font-bold tabular-nums">2,952 kVA</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-500 block">Frequency</span>
                    <span className="text-emerald-300 font-bold tabular-nums">50.02 Hz</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-500 block">Oil Temp</span>
                    <span className={`font-bold tabular-nums ${maxOilTemp > 75 ? 'text-red-400' : 'text-slate-200'}`}>
                      {maxOilTemp.toFixed(1)}°C
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-500 block">Cooling Fans</span>
                    <span className="text-cyan-300 font-bold">4/4 Online</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 pt-1">
                  <button
                    onClick={() => energyWs.triggerEvent(isAnyCriticalFault ? 'reset_nominal' : 'overload_yelahanka')}
                    className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md ${
                      isAnyCriticalFault
                        ? 'bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/50'
                        : 'bg-red-600/30 hover:bg-red-600/50 text-red-300 border border-red-500/50'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{isAnyCriticalFault ? 'Normalize Grid Substation' : 'Simulate Substation Overload'}</span>
                  </button>

                  <button
                    onClick={() => flyToAsset([0, 19, 23], [0, 1.5, 0])}
                    className="w-full py-1.5 px-3 rounded-xl text-[11px] font-bold bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700 flex items-center justify-center gap-1"
                  >
                    <span>Reset Camera to Overview</span>
                  </button>
                </div>
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
            minDistance={6}
            maxDistance={52}
            target={[0, 1.5, 0]}
          />
        </StudioEnvironment>
      </Canvas>
    </div>
  );
};

export default SmartGridTwin;
