import React from 'react';
import {
  X,
  AlertTriangle,
  ZapOff,
  TrendingDown,
  RotateCcw,
  CheckCircle2,
  Wrench,
  ShieldAlert,
  Flame,
  Radio
} from 'lucide-react';
import { useEnergyStore } from '../../stores/energyStore';
import { energyWs } from '../../services/websocket';

export const EventDrawer: React.FC = () => {
  const isOpen = useEnergyStore((s) => s.eventDrawerOpen);
  const setOpen = useEnergyStore((s) => s.setEventDrawerOpen);
  const telemetry = useEnergyStore((s) => s.telemetry);
  const authRole = useEnergyStore((s) => s.authRole);
  const canOperateGrid = authRole === 'operator';
  const activeEvents = telemetry.active_events;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-md">
      <div className="w-full max-w-md bg-[#091122]/95 border-l border-cyan-400/30 p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
        <div>
          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-cyan-400" />
                Grid Event Simulation
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Test real-time closed-loop ML anomaly detection & SCADA response
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Active Incidents Banner */}
          <div className="mt-4 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Current Grid Incidents:</span>
              <span className={`px-2 py-0.5 rounded-full font-mono font-bold text-[10px] ${
                activeEvents.length > 0
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}>
                {activeEvents.length > 0 ? `${activeEvents.length} Anomaly Triggered` : 'Nominal Operation'}
              </span>
            </div>

            {activeEvents.map((ev) => (
              <div key={ev.id} className="mt-2.5 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{ev.title}</span>
                  <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">{ev.severity}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">{ev.description}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">Target: {ev.affected_locality}</span>
                  <button
                      onClick={() => energyWs.markResolved(
                        ev.affected_feeder_id.startsWith('feeder_')
                          ? ev.affected_feeder_id.replace('feeder_', 'tx_')
                          : 'tx_yelahanka'
                      )}
                      disabled={!canOperateGrid}
                      title={canOperateGrid ? 'Resolve the incident' : 'BESCOM operator access is required'}
                    className="text-[10px] font-bold text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Resolve Anomaly
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Simulation Triggers List */}
          <div className="mt-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Inject Grid Scenarios
            </h3>
            {!canOperateGrid && (
              <p className="rounded-xl border border-slate-700 bg-slate-900/80 p-3 text-[11px] text-slate-300">
                Grid simulations and control actions are restricted to BESCOM operator accounts.
              </p>
            )}

            {/* Scenario 1: Thermal Overload */}
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-red-500/40 transition-all flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-red-400" />
                  Transformer Thermal Rise
                </span>
                <span className="text-[10px] font-mono text-red-400">Yelahanka TX-2</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Spikes oil temp to 88°C and winding to 96°C. Triggers thermal plume particles in 3D and automated consumer conservation alert.
              </p>
              <button
                onClick={() => energyWs.triggerEvent('overload_yelahanka')}
                disabled={!canOperateGrid}
                className="w-full mt-1 py-2 px-3 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:cursor-not-allowed disabled:opacity-40"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Simulate Transformer Overload
              </button>
            </div>

            {/* Scenario 2: Feeder Outage */}
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ZapOff className="w-4 h-4 text-amber-400" />
                  Feeder Tripping & Loss
                </span>
                <span className="text-[10px] font-mono text-amber-400">Indiranagar 11kV</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Simulates upstream breaker trip. Consumer home switches seamlessly to solar battery backup.
              </p>
              <button
                onClick={() => energyWs.triggerEvent('voltage_sag')}
                disabled={!canOperateGrid}
                className="w-full mt-1 py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ZapOff className="w-3.5 h-3.5" />
                Simulate 11kV Feeder Outage
              </button>
            </div>

            {/* Scenario 3: Commercial Theft Spike */}
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-cyan-400" />
                  Power Theft / Loss Anomaly
                </span>
                <span className="text-[10px] font-mono text-cyan-400">Whitefield Feeder</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Creates discrepancy between substation bus input and meter billing aggregate (14.5% loss).
              </p>
              <button
                onClick={() => energyWs.triggerEvent('line_loss')}
                disabled={!canOperateGrid}
                className="w-full mt-1 py-2 px-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:cursor-not-allowed disabled:opacity-40"
              >
                <TrendingDown className="w-3.5 h-3.5" />
                Inject Commercial Theft Spike
              </button>
            </div>
          </div>
        </div>

        {/* Reset System Trigger */}
        <div className="pt-4 border-t border-slate-800">
          <button
            onClick={() => energyWs.triggerEvent('restore_normal')}
            disabled={!canOperateGrid}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Grid to Nominal Conditions
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventDrawer;
