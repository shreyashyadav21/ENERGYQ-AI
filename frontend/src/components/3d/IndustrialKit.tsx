import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const makeCanvasTexture = (
  size: number,
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
  repeat = 1
) => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

export const useIndustrialTextures = () => {
  return useMemo(() => {
    const concrete = makeCanvasTexture(
      512,
      (ctx, s) => {
        ctx.fillStyle = '#2a2d31';
        ctx.fillRect(0, 0, s, s);
        for (let i = 0; i < 4200; i++) {
          const n = 18 + Math.random() * 40;
          ctx.fillStyle = `rgba(${n},${n + 2},${n - 4},${0.08 + Math.random() * 0.18})`;
          ctx.fillRect(Math.random() * s, Math.random() * s, 1 + Math.random() * 3, 1);
        }
        ctx.strokeStyle = 'rgba(12,12,12,0.45)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, s * 0.5);
        ctx.lineTo(s, s * 0.5);
        ctx.moveTo(s * 0.5, 0);
        ctx.lineTo(s * 0.5, s);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(210,180,60,0.18)';
        ctx.lineWidth = 10;
        ctx.strokeRect(18, 18, s - 36, s - 36);
      },
      6
    );

    const asphalt = makeCanvasTexture(
      256,
      (ctx, s) => {
        ctx.fillStyle = '#1a1c1f';
        ctx.fillRect(0, 0, s, s);
        for (let i = 0; i < 1800; i++) {
          ctx.fillStyle = `rgba(${20 + Math.random() * 30},${20 + Math.random() * 30},${22},0.35)`;
          ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
        }
      },
      8
    );

    const solarCells = makeCanvasTexture(256, (ctx, s) => {
      ctx.fillStyle = '#07162e';
      ctx.fillRect(0, 0, s, s);
      const cols = 6;
      const rows = 10;
      const pad = 6;
      const cw = (s - pad * 2) / cols;
      const rh = (s - pad * 2) / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const g = ctx.createLinearGradient(0, pad + r * rh, 0, pad + (r + 1) * rh);
          g.addColorStop(0, '#0a3a78');
          g.addColorStop(0.5, '#082445');
          g.addColorStop(1, '#0c4a8a');
          ctx.fillStyle = g;
          ctx.fillRect(pad + c * cw + 1, pad + r * rh + 1, cw - 2, rh - 2);
        }
      }
      ctx.strokeStyle = '#c5cdd6';
      ctx.lineWidth = 1;
      for (let c = 0; c <= cols; c++) {
        ctx.beginPath();
        ctx.moveTo(pad + c * cw, pad);
        ctx.lineTo(pad + c * cw, s - pad);
        ctx.stroke();
      }
    });

    const brushedSteel = makeCanvasTexture(
      256,
      (ctx, s) => {
        const g = ctx.createLinearGradient(0, 0, s, s);
        g.addColorStop(0, '#6b7280');
        g.addColorStop(0.5, '#9ca3af');
        g.addColorStop(1, '#4b5563');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, s, s);
        for (let i = 0; i < 80; i++) {
          ctx.fillStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.04})`;
          ctx.fillRect(0, Math.random() * s, s, 1);
        }
      },
      2
    );

    return { concrete, asphalt, solarCells, brushedSteel };
  }, []);
};

export const IndustrialFloodlight: React.FC<{
  position: [number, number, number];
  target?: [number, number, number];
  intensity?: number;
  color?: string;
}> = ({ position, intensity = 18, color = '#fff2d0' }) => {
  return (
    <group position={position}>
      <mesh position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.14, 4.8, 8]} />
        <meshStandardMaterial color="#3f4650" metalness={0.75} roughness={0.38} />
      </mesh>
      <mesh position={[0, 2.55, 0.18]} rotation={[0.55, 0, 0]} castShadow>
        <boxGeometry args={[0.42, 0.22, 0.55]} />
        <meshStandardMaterial color="#1f242c" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[0, 2.5, 0.42]} rotation={[0.55, 0, 0]}>
        <circleGeometry args={[0.16, 16]} />
        <meshBasicMaterial color="#fff6d2" toneMapped={false} />
      </mesh>
      <spotLight
        position={[0, 2.5, 0.3]}
        angle={0.55}
        penumbra={0.45}
        intensity={intensity}
        color={color}
        distance={28}
        decay={2}
      />
    </group>
  );
};

export const SteelLatticeMast: React.FC<{
  height?: number;
  position?: [number, number, number];
}> = ({ height = 6.4, position = [0, 0, 0] }) => {
  const members = useMemo(() => {
    const list: { pos: [number, number, number]; rot: [number, number, number]; size: [number, number, number] }[] = [];
    const half = 0.28;
    const legs: [number, number][] = [
      [-half, -half],
      [half, -half],
      [-half, half],
      [half, half],
    ];
    legs.forEach(([x, z]) => {
      list.push({ pos: [x, height / 2, z], rot: [0, 0, 0], size: [0.05, height, 0.05] });
    });
    for (let y = 0.4; y < height; y += 0.7) {
      list.push({ pos: [0, y, -half], rot: [0, 0, 0], size: [half * 2, 0.035, 0.035] });
      list.push({ pos: [0, y, half], rot: [0, 0, 0], size: [half * 2, 0.035, 0.035] });
      list.push({ pos: [-half, y, 0], rot: [0, 0, 0], size: [0.035, 0.035, half * 2] });
      list.push({ pos: [half, y, 0], rot: [0, 0, 0], size: [0.035, 0.035, half * 2] });
    }
    return list;
  }, [height]);

  return (
    <group position={position}>
      {members.map((m, i) => (
        <mesh key={i} position={m.pos} rotation={m.rot} castShadow>
          <boxGeometry args={m.size} />
          <meshStandardMaterial color="#6b7280" metalness={0.85} roughness={0.32} />
        </mesh>
      ))}
    </group>
  );
};

export const CeramicBushingStack: React.FC<{
  position?: [number, number, number];
  height?: number;
  live?: boolean;
  fault?: boolean;
}> = ({ position = [0, 0, 0], height = 0.9, live = true, fault = false }) => {
  const rings = 6;
  return (
    <group position={position}>
      {Array.from({ length: rings }).map((_, i) => (
        <mesh key={i} position={[0, (i / rings) * height, 0]} castShadow>
          <cylinderGeometry args={[0.07 + (i % 2 === 0 ? 0.05 : 0.02), 0.08, 0.08, 16]} />
          <meshStandardMaterial color="#c4a574" roughness={0.45} metalness={0.05} />
        </mesh>
      ))}
      <mesh position={[0, height + 0.08, 0]}>
        <sphereGeometry args={[0.055, 12, 12]} />
        <meshStandardMaterial
          color={fault ? '#ef4444' : live ? '#dbeafe' : '#64748b'}
          emissive={fault ? '#ef4444' : live ? '#38bdf8' : '#000000'}
          emissiveIntensity={fault ? 1.4 : live ? 0.55 : 0}
          metalness={0.4}
          roughness={0.25}
        />
      </mesh>
    </group>
  );
};

export const CoolingFan: React.FC<{
  position: [number, number, number];
  rpm: number;
  rotation?: [number, number, number];
}> = ({ position, rpm, rotation = [0, 0, 0] }) => {
  const blades = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (blades.current) blades.current.rotation.z += delta * rpm;
  });
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <cylinderGeometry args={[0.28, 0.28, 0.08, 18]} />
        <meshStandardMaterial color="#1f2937" metalness={0.8} roughness={0.35} />
      </mesh>
      <mesh>
        <torusGeometry args={[0.26, 0.018, 8, 20]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
      </mesh>
      <group ref={blades}>
        {[0, 1, 2, 3, 4].map((b) => (
          <mesh key={b} rotation={[0, 0, (b * Math.PI * 2) / 5]} position={[0.0, 0.01, 0]}>
            <boxGeometry args={[0.08, 0.42, 0.012]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.65} roughness={0.28} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

export const SafetyChevronRing: React.FC<{ radius: number }> = ({ radius }) => {
  const count = 24;
  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
      {Array.from({ length: count }).map((_, i) => {
        const a = (i / count) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * radius, Math.sin(a) * radius, 0]} rotation={[0, 0, a]}>
            <boxGeometry args={[0.55, 0.12, 0.01]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? '#f5c518' : '#111827'}
              roughness={0.55}
              metalness={0.1}
            />
          </mesh>
        );
      })}
    </group>
  );
};

export const ArmoredPowerCable: React.FC<{
  points: [number, number, number][];
  radius?: number;
}> = ({ points, radius = 0.038 }) => {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    return new THREE.TubeGeometry(curve, 48, radius, 8, false);
  }, [points, radius]);

  return (
    <mesh geometry={geometry} castShadow>
      <meshStandardMaterial color="#0f1419" roughness={0.72} metalness={0.18} />
    </mesh>
  );
};

export const StatusBeacon: React.FC<{
  position: [number, number, number];
  color: string;
  active?: boolean;
}> = ({ position, color, active = true }) => {
  const light = useRef<THREE.PointLight>(null);
  useFrame((state) => {
    if (!light.current) return;
    light.current.intensity = active ? 1.1 + Math.sin(state.clock.elapsedTime * 4.2) * 0.45 : 0.08;
  });
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.045, 10, 10]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={active ? 1.6 : 0.15}
          toneMapped={false}
        />
      </mesh>
      <pointLight ref={light} color={color} distance={3.2} decay={2} />
    </group>
  );
};
