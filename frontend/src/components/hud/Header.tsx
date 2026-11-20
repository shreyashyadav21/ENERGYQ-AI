import React from 'react';
import {
  Zap,
  Activity,
  Home,
  Network,
  SlidersHorizontal,
  Mic,
  ShieldCheck,
  AlertTriangle,
  LogOut,
  User,
  Radio
} from 'lucide-react';
import { useEnergyStore } from '../../stores/energyStore';

export const Header: React.FC = () => {
  const isConnected = useEnergyStore((s) => s.isConnected);
  const telemetry = useEnergyStore((s) => s.telemetry);
  const setEventDrawerOpen = useEnergyStore((s) => s.setEventDrawerOpen);
  const setVoiceModalOpen = useEnergyStore((s) => s.setVoiceModalOpen);
  const user = useEnergyStore((s) => s.user);
  const authRole = useEnergyStore((s) => s.authRole);
  const logout = useEnergyStore((s) => s.logout);
  const navigate = useEnergyStore((s) => s.navigate);

  const hasActiveEvent = telemetry.active_events.length > 0;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isOperator = authRole === 'operator';

  return (
    <header className="h-16 px-4 md:px-6 flex items-center justify-between border-b border-emerald-500/20 bg-[#14221e]/95 backdrop-blur-xl z-30 sticky top-0 shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
      {/* Brand & Portal Context */}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
          isOperator
            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-[0_0_20px_rgba(59,130,246,0.35)]'
            : 'bg-gradient-to-br from-cyan-400 to-emerald-500 shadow-[0_0_20px_rgba(6,182,212,0.35)]'
        }`}>
          {isOperator ? (
            <Network className="w-5 h-5 text-white" />
          ) : (
            <Zap className="w-5 h-5 text-slate-950 fill-current" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base md:text-lg tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 font-mono">
              ENERGYQ AI
            </span>
            <span className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-full border ${
              isOperator
                ? 'bg-blue-500/15 text-blue-300 border-blue-500/40'
                : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
            }`}>
              {isOperator ? 'BESCOM SCADA Command' : 'Consumer Smart Home'}
            </span>
          </div>
          <p className="hidden md:block text-[11px] text-slate-400 font-medium">
            {isOperator
              ? 'Bengaluru Urban Grid Distribution & Transformer Health SCADA'
              : 'Residential Net Metering, Rooftop Solar & Home Battery Intelligence'}
          </p>
        </div>
      </div>

      {/* Center SCADA Telemetry Ticker (No Cross-Portal Switcher Tabs!) */}
      <div className="hidden lg:flex items-center gap-4 px-4 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="text-slate-400">Grid Frequency:</span>
          <span className="font-mono text-cyan-300 font-bold tabular-nums">
            {telemetry.system_frequency_hz.toFixed(2)} Hz
          </span>
        </div>
        <span className="text-slate-700">|</span>
        <div className="flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-400">Status:</span>
          <span className="flex items-center gap-1 font-mono text-emerald-300 font-bold text-[11px]">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-cyan-400 animate-ping'}`} />
            {isConnected ? 'Telemetry Live' : 'Local Stream'}
          </span>
        </div>
      </div>

      {/* Right Action Controls: Voice AI + Simulation Event + User Badge & Logout */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Multilingual Voice Assistant Button */}
        <button
          onClick={() => setVoiceModalOpen(true)}
          className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 hover:from-emerald-500/30 hover:to-cyan-500/30 text-emerald-300 border border-emerald-500/40 transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
          title="Multilingual AI Voice Assistant (Sarvam AI Ready)"
        >
          <Mic className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="hidden sm:inline text-xs font-bold font-mono">Voice AI</span>
        </button>

        {/* Simulate Grid Event Trigger Button */}
        <button
          onClick={() => setEventDrawerOpen(true)}
          className={`relative px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            hasActiveEvent
              ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.25)]'
              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700'
          }`}
        >
          {hasActiveEvent ? (
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          ) : (
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
          )}
          <span className="hidden sm:inline">
            {hasActiveEvent ? 'Active Grid Event' : 'Simulate Event'}
          </span>
        </button>

        {/* Clean User Badge + Role Tag + Logout Button */}
        {user && (
          <div className="flex items-center gap-2 pl-1 border-l border-slate-800">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs">
              <div className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-slate-300" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-slate-100 font-bold leading-tight max-w-[120px] truncate">
                  {user.name}
                </span>
                <span className="text-[10px] text-slate-400 font-mono leading-tight">
                  {user.meterId || user.division || user.email}
                </span>
              </div>
              <span className={`ml-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider ${
                isOperator
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              }`}>
                {user.role}
              </span>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out to Login Gateway"
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900/80 hover:bg-red-500/20 text-slate-400 hover:text-red-300 border border-slate-700/80 hover:border-red-500/40 transition-all flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs font-semibold">Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
