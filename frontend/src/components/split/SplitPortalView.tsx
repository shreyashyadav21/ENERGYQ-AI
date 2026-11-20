import React from 'react';
import { Home, Network, Sparkles } from 'lucide-react';
import { SmartHomeTwin } from '../3d/SmartHomeTwin';
import { SmartGridTwin } from '../3d/SmartGridTwin';
import { useEnergyStore } from '../../stores/energyStore';
import { energyWs } from '../../services/websocket';

export const SplitPortalView: React.FC = () => {
  const telemetry = useEnergyStore((s) => s.telemetry);
  const smartHome = telemetry.smart_home;
  const transformers = telemetry.transformers;
  const txYelahanka = transformers.find((t) => t.id === 'tx_yelahanka') || transformers[2];

  return (
    <div className="w-full h-full flex flex-col lg:flex-row overflow-hidden relative">
      {/* Left Pane: Consumer 3D Smart Home */}
      <div className="flex-1 h-1/2 lg:h-full relative border-b lg:border-b-0 lg:border-r border-cyan-500/20">
        <SmartHomeTwin />

        {/* Floating Mini Overlay for Consumer */}
        <div className="absolute top-4 left-4 z-10 backdrop-blur-md bg-slate-900/80 border border-cyan-500/30 rounded-xl p-3 shadow-xl max-w-xs">
          <div className="flex items-center gap-1.5 pb-1 border-b border-slate-800 text-xs font-bold text-white">
            <Home className="w-3.5 h-3.5 text-cyan-400" />
            <span>Consumer Portal: {smartHome.locality}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block">Home Load</span>
              <span className="font-mono font-bold text-cyan-300">{smartHome.total_load_kw.toFixed(2)} kW</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Solar Power</span>
              <span className="font-mono font-bold text-emerald-300">{smartHome.solar_generation_kw.toFixed(2)} kW</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Est. Bill</span>
              <span className="font-mono font-bold text-slate-200">₹{smartHome.projected_monthly_bill_inr.toFixed(0)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Voltage</span>
              <span className="font-mono font-bold text-amber-300">{smartHome.voltage.toFixed(1)} V</span>
            </div>
          </div>
        </div>

        {/* Live Banner if event affects this locality */}
        {smartHome.grid_banner_alert && (
          <div className="absolute bottom-4 left-4 right-4 z-10 p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 backdrop-blur-md text-xs text-amber-200 flex items-center justify-between">
            <span>{smartHome.grid_banner_alert}</span>
            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-amber-500/30">SYNCED</span>
          </div>
        )}
      </div>

      {/* Right Pane: BESCOM 3D Grid Distribution Twin */}
      <div className="flex-1 h-1/2 lg:h-full relative">
        <SmartGridTwin />

        {/* Floating Mini Overlay for Operator */}
        <div className="absolute top-4 right-4 z-10 backdrop-blur-md bg-slate-900/80 border border-cyan-500/30 rounded-xl p-3 shadow-xl max-w-xs">
          <div className="flex items-center gap-1.5 pb-1 border-b border-slate-800 text-xs font-bold text-white">
            <Network className="w-3.5 h-3.5 text-cyan-400" />
            <span>BESCOM Central Grid SCADA</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block">System Frequency</span>
              <span className="font-mono font-bold text-cyan-300">{telemetry.system_frequency_hz.toFixed(2)} Hz</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Yelahanka TX-2</span>
              <span className={`font-mono font-bold ${txYelahanka.load_pct > 85 ? 'text-red-400' : 'text-emerald-400'}`}>
                {txYelahanka.load_pct.toFixed(0)}% ({txYelahanka.health_status.toUpperCase()})
              </span>
            </div>
          </div>

          {/* Quick Operator Incident Action */}
          {txYelahanka.health_status === 'critical' && !txYelahanka.maintenance_dispatched && (
            <button
              onClick={() => energyWs.assignCrew(txYelahanka.id)}
              className="w-full mt-2 py-1 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold transition-all"
            >
              Assign Maintenance Crew
            </button>
          )}

          {txYelahanka.maintenance_dispatched && (
            <button
              onClick={() => energyWs.markResolved(txYelahanka.id)}
              className="w-full mt-2 py-1 px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold transition-all"
            >
              Mark Resolved (Restore Normal)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
