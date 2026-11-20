import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Zap, Activity, ShieldCheck, AlertTriangle, Wrench, X } from 'lucide-react';

interface HolographicHudRingProps {
  position: [number, number, number];
  color?: string;
  title: string;
  subtitle?: string;
  voltage?: number;
  current?: number;
  frequency?: number;
  healthScore?: number;
  oilTemp?: number;
  loadPct?: number;
  isCritical?: boolean;
  onClose?: () => void;
  actionButton?: {
    label: string;
    onClick: () => void;
    colorClass?: string;
  };
}

export const HolographicHudRing: React.FC<HolographicHudRingProps> = ({
  position,
  color = '#00F0FF',
  title,
  subtitle,
  voltage = 230.4,
  current = 14.8,
  frequency = 50.02,
  healthScore = 96,
  oilTemp,
  loadPct,
  isCritical = false,
  onClose,
  actionButton,
}) => {
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z = t * 0.7;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z = -t * 0.5;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.z = t * 0.9;
    }
  });

  const hudColor = isCritical ? '#EF4444' : color;

  return (
    <group position={position}>
      {/* Outer Rotating Concentric HUD Ring 1 */}
      <mesh ref={ring1Ref} position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.8, 1.86, 48]} />
        <meshBasicMaterial
          color={hudColor}
          side={THREE.DoubleSide}
          transparent
          opacity={0.8}
          toneMapped={false}
        />
      </mesh>

      {/* Segmented Dashed HUD Ring 2 */}
      <mesh ref={ring2Ref} position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.0, 2.05, 32]} />
        <meshBasicMaterial
          color={hudColor}
          side={THREE.DoubleSide}
          wireframe
          transparent
          opacity={0.5}
          toneMapped={false}
        />
      </mesh>

      {/* Inner Radar Reticle Ring 3 */}
      <mesh ref={ring3Ref} position={[0, 0.14, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.4, 1.44, 24]} />
        <meshBasicMaterial
          color="#FFFFFF"
          side={THREE.DoubleSide}
          transparent
          opacity={0.4}
          toneMapped={false}
        />
      </mesh>

      {/* Floating 3D Glass HUD Telemetry Tag */}
      <Html
        position={[0, 2.6, 0]}
        center
        distanceFactor={10}
        zIndexRange={[100, 0]}
        style={{ pointerEvents: 'auto' }}
      >
        <div className="w-64 backdrop-blur-xl bg-slate-950/85 border border-cyan-500/40 rounded-2xl p-3.5 shadow-2xl shadow-cyan-500/20 text-white select-none transition-all">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full animate-ping"
                style={{ backgroundColor: hudColor }}
              />
              <h4 className="font-bold text-xs text-white leading-tight">{title}</h4>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {subtitle && (
            <p className="text-[10px] text-slate-400 mt-1 mb-2 font-mono">
              {subtitle}
            </p>
          )}

          {/* 4 Sensor Telemetry Indicators */}
          <div className="grid grid-cols-2 gap-1.5 my-2.5 text-[11px]">
            <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Voltage</span>
              <span className="font-mono font-bold text-cyan-300">
                {voltage.toFixed(1)} V
              </span>
            </div>

            <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Current</span>
              <span className="font-mono font-bold text-emerald-300">
                {current.toFixed(1)} A
              </span>
            </div>

            <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Frequency</span>
              <span className="font-mono font-bold text-slate-200">
                {frequency.toFixed(2)} Hz
              </span>
            </div>

            <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Health Score</span>
              <span
                className={`font-mono font-extrabold ${
                  healthScore < 50
                    ? 'text-red-400'
                    : healthScore < 80
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {healthScore.toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Extra details if available */}
          {(oilTemp !== undefined || loadPct !== undefined) && (
            <div className="flex items-center justify-between px-2 py-1 rounded bg-slate-900/90 text-[10px] font-mono text-slate-300 mb-2">
              {oilTemp !== undefined && (
                <span>
                  Oil Temp: <b className={oilTemp > 75 ? 'text-red-400' : 'text-amber-300'}>{oilTemp.toFixed(1)}°C</b>
                </span>
              )}
              {loadPct !== undefined && (
                <span>
                  Load: <b className={loadPct > 85 ? 'text-red-400' : 'text-cyan-300'}>{loadPct.toFixed(1)}%</b>
                </span>
              )}
            </div>
          )}

          {/* Quick Action Button */}
          {actionButton && (
            <button
              onClick={actionButton.onClick}
              className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-all shadow-md ${
                actionButton.colorClass ||
                'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 hover:brightness-110'
              }`}
            >
              {actionButton.label}
            </button>
          )}
        </div>
      </Html>
    </group>
  );
};
