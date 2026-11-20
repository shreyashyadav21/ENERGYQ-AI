import React, { useState } from 'react';
import {
  Zap,
  Home,
  Network,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Radio,
  Cpu,
  Layers,
  Activity,
  Sun,
  BatteryCharging,
  TrendingUp,
  Gauge,
  SlidersHorizontal,
  Server
} from 'lucide-react';
import { useEnergyStore } from '../../stores/energyStore';
import { AuthRole } from '../../types/energy';
import { Login3DBackdrop } from './Login3DBackdrop';

export const LoginGateway: React.FC = () => {
  const navigate = useEnergyStore((s) => s.navigate);
  const loginAsDemo = useEnergyStore((s) => s.loginAsDemo);
  const [hoveredRole, setHoveredRole] = useState<AuthRole | null>(null);

  const handleConsumerGateway = () => {
    navigate('/login/consumer');
  };

  const handleOperatorGateway = () => {
    navigate('/login/operator');
  };

  return (
    <div
      className="w-screen h-screen relative bg-cover bg-center bg-no-repeat overflow-y-auto lg:overflow-hidden flex flex-col justify-between"
      style={{ backgroundImage: "url('/images/energyq-hero-grid-v2.jpg')" }}
    >
      {/* ── High-Contrast Translucent Obsidian & Midnight Scada Gradient Filter ── */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#060D1E]/75 via-[#09152C]/70 to-[#040814]/80 backdrop-blur-[1px]" />

      {/* ── Atmospheric Radial Glows ── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(0,245,212,0.18),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_15%_85%,rgba(16,185,129,0.14),transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_85%_85%,rgba(59,130,246,0.18),transparent_60%)] pointer-events-none" />

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00F5D408_1px,transparent_1px),linear-gradient(to_bottom,#00F5D408_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_45%,#000_60%,transparent_100%)] pointer-events-none" />

      {/* 3D Interactive Three.js Background with mouse parallax and core energy splitting */}
      <Login3DBackdrop hoveredRole={hoveredRole} />

      {/* ── Top SCADA Brand Bar ── */}
      <header className="relative z-10 w-full px-6 py-4 flex items-center justify-between border-b border-cyan-400/20 bg-[#091328]/80 backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 via-teal-400 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(0,245,212,0.45)]">
            <Zap className="w-5 h-5 text-slate-950 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-200 to-emerald-300 font-mono">
                ENERGYQ AI
              </span>
              <span className="px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-full bg-cyan-400/15 text-cyan-200 border border-cyan-400/35 font-mono">
                BESCOM Grid OS
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Karnataka BESCOM Smart Distribution Grid & Residential AI Intelligence
            </p>
          </div>
        </div>

        {/* Live Grid Frequency Telemetry Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#0B1E3D]/90 border border-cyan-400/30 text-xs shadow-inner">
          <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="text-slate-400">Grid Frequency:</span>
          <span className="font-mono text-cyan-300 font-bold tabular-nums">50.02 Hz</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </div>
      </header>

      {/* ── Center Hero Split Portal Selector + 3-Stage Ecosystem Cards ── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 max-w-6xl mx-auto w-full py-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/30 text-cyan-300 text-xs font-mono font-semibold mb-2.5 shadow-[0_0_20px_rgba(0,245,212,0.2)]">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Select Your Operating Division to Access Portal</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight drop-shadow-lg">
            Bengaluru Smart-City Energy Ecosystem
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto mt-2">
            Connecting residential rooftop solar net-metering and V2G battery storage with BESCOM 66/11kV urban substations and live AI transformer anomaly classification.
          </p>
        </div>

        {/* ── Dual Split Role Gateway Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mb-6">

          {/* Card 1: Consumer Portal */}
          <div
            onMouseEnter={() => setHoveredRole('consumer')}
            onMouseLeave={() => setHoveredRole(null)}
            className="group relative p-6 sm:p-7 rounded-3xl bg-[#09152D]/90 backdrop-blur-2xl border border-cyan-400/30 border-t-cyan-400/60 shadow-[0_12px_40px_rgba(0,0,0,0.7)] hover:border-cyan-400/70 hover:shadow-[0_0_45px_rgba(0,245,212,0.35)] transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="relative h-28 w-full rounded-2xl overflow-hidden mb-4 border border-cyan-400/30">
                <img
                  src="/images/consumer-smart-villa-v2.jpg"
                  alt="Consumer Smart Villa"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#09152D] via-transparent to-transparent" />
                <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-400/20 text-cyan-200 border border-cyan-400/40 backdrop-blur-md">
                  Residential / Smart Villa
                </span>
                <div className="absolute bottom-2 left-2.5 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-cyan-400/30 border border-cyan-400/50 text-cyan-200 flex items-center justify-center backdrop-blur-md shadow-md">
                    <Home className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-mono font-bold text-white drop-shadow">Indiranagar 2nd Stage</span>
                </div>
              </div>

              <h2 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-200 transition-colors">
                Consumer Smart Home Portal
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Monitor live household kW draw, rooftop solar net-metering, battery storage, and interactive 3D villa appliances with closed-loop BESCOM alerts.
              </p>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 font-mono mb-6">
                <div className="p-2.5 rounded-xl bg-[#061022]/80 border border-cyan-400/20">
                  <span className="text-slate-400 block text-[10px]">Active Meter</span>
                  <span className="text-cyan-300 font-bold">BESCOM-IND-4092</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#061022]/80 border border-cyan-400/20">
                  <span className="text-slate-400 block text-[10px]">Location</span>
                  <span className="text-emerald-300 font-bold">Indiranagar Villa</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleConsumerGateway}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(0,245,212,0.35)] transition-all"
              >
                <span>Enter Consumer Login Portal</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => loginAsDemo('consumer')}
                className="w-full py-2 px-3 rounded-xl text-[11px] font-mono font-bold bg-[#0B2144]/60 hover:bg-[#0E2A56] text-cyan-200 border border-cyan-400/30 transition-all flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>1-Click Instant Demo Login</span>
              </button>
            </div>
          </div>

          {/* Card 2: BESCOM Operator Portal */}
          <div
            onMouseEnter={() => setHoveredRole('operator')}
            onMouseLeave={() => setHoveredRole(null)}
            className="group relative p-6 sm:p-7 rounded-3xl bg-[#09152D]/90 backdrop-blur-2xl border border-blue-500/30 border-t-blue-400/60 shadow-[0_12px_40px_rgba(0,0,0,0.7)] hover:border-blue-400/70 hover:shadow-[0_0_45px_rgba(59,130,246,0.35)] transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="relative h-28 w-full rounded-2xl overflow-hidden mb-4 border border-blue-500/30">
                <img
                  src="/images/bescom-bengaluru-grid-v2.jpg"
                  alt="BESCOM Bengaluru Grid"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#09152D] via-transparent to-transparent" />
                <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-200 border border-blue-500/40 backdrop-blur-md">
                  SCADA Command / Utility
                </span>
                <div className="absolute bottom-2 left-2.5 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/30 border border-blue-400/50 text-blue-200 flex items-center justify-center backdrop-blur-md shadow-md">
                    <Network className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-mono font-bold text-white drop-shadow">Bengaluru Urban Grid</span>
                </div>
              </div>

              <h2 className="text-xl font-bold text-white mb-2 group-hover:text-blue-200 transition-colors">
                BESCOM Utility Operator Portal
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Real-time 66/11kV substation telemetry, 3-phase waveforms, transformer health AI index, live GIS mapping, and field maintenance dispatch.
              </p>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 font-mono mb-6">
                <div className="p-2.5 rounded-xl bg-[#061022]/80 border border-blue-500/20">
                  <span className="text-slate-400 block text-[10px]">SCADA Authority</span>
                  <span className="text-blue-300 font-bold">Bengaluru Urban</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#061022]/80 border border-blue-500/20">
                  <span className="text-slate-400 block text-[10px]">DT Units Monitored</span>
                  <span className="text-emerald-300 font-bold">6 Urban Localities</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleOperatorGateway}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(59,130,246,0.35)] transition-all"
              >
                <span>Enter Operator SCADA Portal</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => loginAsDemo('operator')}
                className="w-full py-2 px-3 rounded-xl text-[11px] font-mono font-bold bg-[#0B2144]/60 hover:bg-[#0E2A56] text-blue-200 border border-blue-400/30 transition-all flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>1-Click Instant Demo Login</span>
              </button>
            </div>
          </div>

        </div>

        {/* ── 3-Stage Connected Ecosystem Visual Showcase Cards ── */}
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
          {/* Stage 1: Rooftop Solar & Smart Home */}
          <div className="p-3.5 rounded-2xl bg-[#09152D]/75 backdrop-blur-md border border-cyan-400/20 text-xs flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-400/15 border border-cyan-400/30 text-cyan-300 flex items-center justify-center shrink-0">
              <Sun className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider block">
                Stage 1 · Consumer
              </span>
              <h3 className="font-bold text-white text-xs">Rooftop Solar & Smart Villa</h3>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                Monocrystalline PV generation, V2G home battery optimization, and real-time appliance control.
              </p>
            </div>
          </div>

          {/* Stage 2: AI Transformer Telemetry */}
          <div className="p-3.5 rounded-2xl bg-[#09152D]/75 backdrop-blur-md border border-emerald-400/20 text-xs flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-400/15 border border-emerald-400/30 text-emerald-300 flex items-center justify-center shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider block">
                Stage 2 · Intelligence
              </span>
              <h3 className="font-bold text-white text-xs">AI Anomaly & Health Engine</h3>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                IsolationForest & XGBoost models computing weighted 0–100% health index every 1.5s.
              </p>
            </div>
          </div>

          {/* Stage 3: BESCOM 66/11kV Grid */}
          <div className="p-3.5 rounded-2xl bg-[#09152D]/75 backdrop-blur-md border border-blue-400/20 text-xs flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-400/15 border border-blue-400/30 text-blue-300 flex items-center justify-center shrink-0">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-wider block">
                Stage 3 · Utility Command
              </span>
              <h3 className="font-bold text-white text-xs">BESCOM 66/11kV Grid Twin</h3>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                MapLibre GIS asset map, radial catenary feeder lines, and automated field crew dispatch.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer SCADA Metadata ── */}
      <footer className="relative z-10 w-full px-6 py-3 border-t border-cyan-400/15 bg-[#081226]/80 backdrop-blur-md flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-cyan-300">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            BESCOM 11kV Feeder Network Online
          </span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="hidden sm:inline text-slate-400">
            Bengaluru Urban SCADA Division · Sarvam Multilingual Voice AI Active
          </span>
        </div>
        <div className="text-slate-300 font-bold">
          ENERGYQ AI v2.4 · Bengaluru Distribution Command
        </div>
      </footer>
    </div>
  );
};

export default LoginGateway;
