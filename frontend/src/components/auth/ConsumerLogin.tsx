import React, { useState } from 'react';
import {
  Home,
  Zap,
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Sun,
  BatteryCharging,
  Radio,
  Sparkles
} from 'lucide-react';
import { useEnergyStore } from '../../stores/energyStore';
import { signInWithSupabase } from '../../services/supabase';
import { Consumer3DLoginBackground } from './Consumer3DLoginBackground';

export const ConsumerLogin: React.FC = () => {
  const loginAsDemo = useEnergyStore((s) => s.loginAsDemo);
  const setUserSession = useEnergyStore((s) => s.setUserSession);
  const navigate = useEnergyStore((s) => s.navigate);

  const [email, setEmail] = useState('aarav.sharma@energyq.ai');
  const [password, setPassword] = useState('••••••••••••');
  const [consumerId, setConsumerId] = useState('BESCOM-IND-4092');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const { user, error } = await signInWithSupabase(email, password, 'consumer');
      if (error) {
        setErrorMsg(error);
      } else if (user) {
        setUserSession({
          ...user,
          meterId: consumerId || 'BESCOM-IND-4092',
          role: 'consumer',
        });
      }
    } catch (err: any) {
      setErrorMsg('Login failed. Please try Demo Login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoClick = () => {
    loginAsDemo('consumer');
  };

  return (
    <div
      className="w-screen h-screen flex items-center justify-center relative overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/images/consumer-smart-villa-v2.jpg')" }}
    >
      {/* ── High-Definition Translucent Sapphire Scada Filter Overlay (Visibly Enhances 3D Villa Render) ── */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#060D1E]/65 via-[#09152C]/50 to-[#040814]/75 backdrop-blur-[0.5px]" />

      {/* ── Live 3D Animated Clean-Energy Smart Home Backdrop ── */}
      <Consumer3DLoginBackground />

      {/* ── Atmospheric Radial Lighting ── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(0,245,212,0.18),transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-0 inset-x-0 h-96 bg-[radial-gradient(ellipse_100%_80%_at_50%_100%,rgba(16,185,129,0.15),transparent_75%)] pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/12 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/12 rounded-full blur-3xl pointer-events-none" />

      {/* Cyber Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00F5D408_1px,transparent_1px),linear-gradient(to_bottom,#00F5D408_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,#000_60%,transparent_100%)] pointer-events-none" />

      {/* Card container */}
      <div className="relative z-10 w-full max-w-md mx-4 p-8 rounded-3xl bg-[#09152D]/90 backdrop-blur-2xl border border-cyan-400/30 border-t-cyan-400/60 shadow-[0_12px_45px_rgba(0,0,0,0.75)] flex flex-col gap-6">

        {/* Back to Gateway button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-xs font-mono text-cyan-300 hover:text-white transition-colors w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Gateway</span>
        </button>

        {/* Portal Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center shadow-[0_0_20px_rgba(0,245,212,0.45)]">
            <Home className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-wide flex items-center gap-2">
              Consumer Portal
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-400/20 text-cyan-200 border border-cyan-400/35">
                Residential
              </span>
            </h1>
            <p className="text-xs text-slate-300">Smart Home Energy & Solar Management</p>
          </div>
        </div>

        {/* 1-Click Instant Demo Login Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0B2347]/80 to-[#082E3B]/80 border border-cyan-400/35 shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-300 font-bold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
              1-Click Instant Demo Access
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold font-mono">
              Ready
            </span>
          </div>

          <p className="text-xs text-slate-200 mb-3">
            Sign in as <strong className="text-white">Aarav Sharma</strong> with meter <code className="text-cyan-300 font-mono">BESCOM-IND-4092</code> (Indiranagar Villa).
          </p>

          <button
            type="button"
            onClick={handleDemoClick}
            className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,245,212,0.35)] transition-all transform active:scale-[0.98]"
          >
            <span>Demo Consumer Login (Aarav Sharma — Indiranagar 2nd Stage)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Or credentials</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        {/* Manual Login Form */}
        <form onSubmit={handleCustomLogin} className="space-y-3.5">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-200 uppercase tracking-wider mb-1">
              Consumer Account / Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="consumer@example.com"
                required
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#061022]/90 border border-slate-700 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-200 uppercase tracking-wider mb-1">
              Consumer Meter ID / RR Number
            </label>
            <div className="relative">
              <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
              <input
                type="text"
                value={consumerId}
                onChange={(e) => setConsumerId(e.target.value)}
                placeholder="BESCOM-IND-XXXX"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#061022]/90 border border-slate-700 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-200 uppercase tracking-wider mb-1">
              Account Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#061022]/90 border border-slate-700 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-2.5 px-4 rounded-xl font-bold text-xs bg-[#0B2144]/80 hover:bg-[#0E2A56] text-white border border-cyan-400/40 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                Signing In...
              </span>
            ) : (
              <span>Sign In to Smart Home</span>
            )}
          </button>
        </form>

        {/* Footer Info */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[10px] text-slate-400 font-mono">
          <span className="flex items-center gap-1">
            <Sun className="w-3 h-3 text-amber-400" />
            Solar Net Metering Active
          </span>
          <span className="flex items-center gap-1">
            <BatteryCharging className="w-3 h-3 text-emerald-400" />
            V2G Storage Ready
          </span>
        </div>
      </div>
    </div>
  );
};

export default ConsumerLogin;
