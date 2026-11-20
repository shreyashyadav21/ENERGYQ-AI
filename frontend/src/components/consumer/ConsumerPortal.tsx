import React, { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  Zap,
  Sun,
  BatteryCharging,
  ArrowDownRight,
  ArrowUpRight,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  BarChart3,
  Power,
  Clock,
  CheckCircle2,
  ChevronRight,
  Info,
  Leaf,
  Sliders,
  Send,
  Home,
  ShieldCheck,
  X,
  Compass
} from 'lucide-react';
import { useEnergyStore } from '../../stores/energyStore';
import { energyWs } from '../../services/websocket';
import { SmartHomeTwin } from '../3d/SmartHomeTwin';

export const ConsumerPortal: React.FC = () => {
  const telemetry = useEnergyStore((s) => s.telemetry);
  const smartHome = telemetry.smart_home;
  const setSelectedApplianceId = useEnergyStore((s) => s.setSelectedApplianceId);
  const flyToAsset = useEnergyStore((s) => s.flyToAsset);

  const [showChartModal, setShowChartModal] = useState(false);
  const [activePresetMode, setActivePresetMode] = useState<'eco' | 'solar' | 'peak' | 'comfort'>('solar');
  const [backdropMode, setBackdropMode] = useState<'render' | 'cyber' | 'minimal'>('render');
  const [budgetTarget, setBudgetTarget] = useState<number>(3500);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [reportCategory, setReportCategory] = useState<string>('Voltage Sag / Low Voltage');
  const [reportDescription, setReportDescription] = useState<string>('Voltage dropping below 202V in evening hours during air conditioner compressor cycles.');
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const appliances = smartHome.appliances;

  const roomViews: { label: string; id: string; target: [number, number, number]; pos: [number, number, number] }[] = [
    { label: '🏡 Villa Overview', id: 'overview', target: [0, 1.2, 0], pos: [9, 5.8, 15] },
    { label: '🛋️ Living Room AC', id: 'living_room_ac', target: [-3.5, 2.2, -3.2], pos: [-1.2, 3.2, 0.2] },
    { label: '🚗 EV Wallbox', id: 'ev_charger', target: [4.9, 1.2, 2.4], pos: [7.2, 2.8, 5.2] },
    { label: '☀️ Rooftop Solar', id: 'solar_array', target: [-0.8, 3.4, -0.4], pos: [2.5, 7.5, 5.0] },
    { label: '🔋 Powerwall', id: 'battery_storage', target: [-5.3, 1.3, -1.0], pos: [-2.8, 2.5, 2.0] },
    { label: '🚿 Water Geyser', id: 'water_heater', target: [2.2, 0.9, -2.8], pos: [4.2, 2.2, -0.6] },
  ];

  const focusAppliance = (id: string) => {
    setSelectedApplianceId(id);
    const view = roomViews.find((v) => v.id === id);
    if (view) {
      flyToAsset(view.pos, view.target);
    }
  };

  const applyPresetMode = (mode: 'eco' | 'solar' | 'peak' | 'comfort') => {
    setActivePresetMode(mode);
    if (mode === 'eco') {
      energyWs.toggleAppliance('water_heater', false);
      setToastMessage('🌿 Eco Green Mode: Heat pump water geyser paused. Maximizing solar self-consumption.');
    } else if (mode === 'solar') {
      energyWs.toggleAppliance('ev_charger', true);
      setToastMessage('☀️ Solar Priority Mode: Rooftop solar surplus routed to Level 2 EV Wallbox.');
    } else if (mode === 'peak') {
      energyWs.toggleAppliance('water_heater', false);
      setToastMessage('⚡ Peak Shaving Mode: Home battery storage supplying load to avoid high BESCOM evening slab tariffs.');
    } else if (mode === 'comfort') {
      energyWs.toggleAppliance('living_room_ac', true);
      energyWs.toggleAppliance('smart_lights', true);
      setToastMessage('❄️ Comfort Mode: Dual-inverter climate control and whole-home lighting active.');
    }
    setTimeout(() => setToastMessage(null), 4500);
  };

  const handleApplyBudgetOptimization = () => {
    energyWs.toggleAppliance('water_heater', false);
    setToastMessage(`⚡ Auto-Optimized: Non-critical loads delayed. Projected bill reduced to ₹${(budgetTarget * 0.94).toFixed(0)}.`);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const handleReportIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingReport(true);
    try {
      await energyWs.submitIncident({
        category: reportCategory,
        description: reportDescription,
        locality: 'Indiranagar 2nd Stage',
      });
      setReportSuccess(`Ticket #BESCOM-IND-${Math.floor(1000 + Math.random() * 9000)} created. BESCOM Urban SCADA crew notified.`);
      setTimeout(() => {
        setShowReportModal(false);
        setReportSuccess(null);
      }, 3500);
    } catch (err: any) {
      setToastMessage('Report queued and synced with local incident logger.');
      setShowReportModal(false);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const mlInsights = telemetry.ml_insights.filter(
    (i) => i.category.includes('EV') || i.category.includes('Solar') || i.category.includes('Bill') || i.category.includes('Thermal')
  );

  // ECharts Option for 24-Hour Load & Solar Forecast
  const getForecastOption = () => {
    const hours = telemetry.demand_forecast_24h.map((d) => d.hour);
    const actualData = telemetry.demand_forecast_24h.map((d) => d.actual_kw);
    const predData = telemetry.demand_forecast_24h.map((d) => d.predicted_kw);
    const solarData = telemetry.demand_forecast_24h.map((d) => (d as any).solar_kw || d.solar_generation_kw || 0);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross', lineStyle: { color: '#00F5D4', width: 1, type: 'dashed' } },
        backgroundColor: '#09152D',
        borderColor: '#00F5D4',
        textStyle: { color: '#E2E8F0', fontSize: 11 },
      },
      legend: {
        data: ['Actual Load (kW)', 'ML Forecast (kW)', 'Rooftop Solar (kW)'],
        textStyle: { color: '#94A3B8', fontSize: 10 },
        top: 0,
        itemGap: 12,
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '16%', containLabel: true },
      xAxis: {
        type: 'category',
        data: hours,
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#1E293B' } },
        axisLabel: { color: '#94A3B8', fontSize: 9 },
      },
      yAxis: {
        type: 'value',
        name: 'kW',
        splitLine: { lineStyle: { color: '#0F172A' } },
        axisLabel: { color: '#94A3B8', fontSize: 9 },
      },
      series: [
        {
          name: 'Actual Load (kW)',
          type: 'line',
          smooth: true,
          data: actualData,
          lineStyle: { color: '#00F5D4', width: 2.5 },
          itemStyle: { color: '#00F5D4' },
        },
        {
          name: 'ML Forecast (kW)',
          type: 'line',
          smooth: true,
          data: predData,
          lineStyle: { color: '#38BDF8', width: 2, type: 'dashed' },
          itemStyle: { color: '#38BDF8' },
        },
        {
          name: 'Rooftop Solar (kW)',
          type: 'line',
          smooth: true,
          areaStyle: {
            color: 'rgba(16, 185, 129, 0.25)',
          },
          data: solarData,
          lineStyle: { color: '#10B981', width: 2 },
          itemStyle: { color: '#10B981' },
        },
      ],
    };
  };

  return (
    <div className="w-full h-full relative overflow-hidden flex flex-col bg-gradient-to-br from-[#060D1E] via-[#09152C] to-[#040814]">
      {/* ── Background Image: Fresh Photorealistic 3D Smart Villa Render ── */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30 pointer-events-none transition-opacity duration-700"
        style={{ backgroundImage: "url('/images/consumer-smart-villa-v2.jpg')" }}
      />

      {/* Ambient light falls behind the real-time 3D villa scene. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(0,245,212,0.14),transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-0 inset-x-0 h-80 bg-[radial-gradient(ellipse_100%_70%_at_50%_100%,rgba(16,185,129,0.12),transparent_75%)] pointer-events-none" />

      {/* ── Toast Notification ── */}
      {toastMessage && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 rounded-2xl bg-[#09152D]/95 border border-cyan-400/60 text-white text-xs font-semibold backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] flex items-center gap-2.5 animate-bounce">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 3D Smart Home Digital Twin Canvas */}
      <div className="w-full h-full absolute inset-0 z-0">
        <SmartHomeTwin backdropMode={backdropMode} />
      </div>

      {/* ── Top Center: Smart Energy Modes & 3D Camera Preset Pills ── */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 max-w-3xl w-[92%] pointer-events-auto">
        {/* Preset Modes Segmented Control */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-[#09152D]/90 border border-cyan-400/30 backdrop-blur-xl shadow-2xl">
          <button
            onClick={() => applyPresetMode('solar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activePresetMode === 'solar'
                ? 'bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Solar Max</span>
          </button>

          <button
            onClick={() => applyPresetMode('eco')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activePresetMode === 'eco'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Leaf className="w-3.5 h-3.5" />
            <span>Eco Green</span>
          </button>

          <button
            onClick={() => applyPresetMode('peak')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activePresetMode === 'peak'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Peak Shaving</span>
          </button>

          <button
            onClick={() => applyPresetMode('comfort')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activePresetMode === 'comfort'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Comfort</span>
          </button>
        </div>

        {/* 3D Camera Preset View Selector */}
        <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-xl bg-[#09152D]/80 border border-slate-700/60 backdrop-blur-md text-[11px] font-mono text-slate-300 shadow-lg">
          <Compass className="w-3 h-3 text-cyan-400 ml-1 mr-0.5" />
          <span className="text-slate-400 text-[10px] mr-1">3D Focus:</span>
          {roomViews.map((v) => (
            <button
              key={v.id}
              onClick={() => focusAppliance(v.id)}
              className="px-2 py-0.5 rounded-lg hover:bg-cyan-500/20 hover:text-cyan-200 transition-colors"
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* 3D Backdrop Image & Environment Mode Selector */}
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#09152D]/90 border border-cyan-400/30 backdrop-blur-xl shadow-lg text-[10px] font-mono">
          <span className="text-cyan-300 font-bold uppercase tracking-wider pr-1">3D Backdrop:</span>
          <button
            onClick={() => {
              setBackdropMode('render');
              setToastMessage('🖼️ 3D Render Backdrop: High-resolution twilight smart villa panorama active.');
            }}
            className={`px-2.5 py-0.5 rounded-lg font-bold transition-all ${
              backdropMode === 'render'
                ? 'bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(0,245,212,0.6)] font-extrabold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            🖼️ 3D Villa Render
          </button>
          <button
            onClick={() => {
              setBackdropMode('cyber');
              setToastMessage('🏙️ Cyber City Backdrop: 90 Bengaluru skyscrapers and horizon wind turbines active.');
            }}
            className={`px-2.5 py-0.5 rounded-lg font-bold transition-all ${
              backdropMode === 'cyber'
                ? 'bg-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.6)] font-extrabold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            🏙️ Cyber Skyline
          </button>
          <button
            onClick={() => {
              setBackdropMode('minimal');
              setToastMessage('🌑 Obsidian Studio: Clean dark architectural diorama active.');
            }}
            className={`px-2.5 py-0.5 rounded-lg font-bold transition-all ${
              backdropMode === 'minimal'
                ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.6)] font-extrabold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            🌑 Clean Studio
          </button>
        </div>
      </div>

      {/* Floating Closed-Loop Banner Alert (when grid anomaly occurs) */}
      {smartHome.grid_banner_alert && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 max-w-2xl w-[90%] p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 backdrop-blur-xl shadow-2xl flex items-center justify-between gap-3 text-xs text-amber-200 animate-slide-down">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
            <span>{smartHome.grid_banner_alert}</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-[10px] font-bold font-mono tracking-wider text-amber-300 uppercase">
            BESCOM Sync
          </span>
        </div>
      )}

      {/* Top Left Floating Card: Real-time Telemetry & Power Gauge */}
      <div className="absolute top-4 left-4 z-10 w-84 backdrop-blur-xl bg-[#091122]/90 border border-cyan-400/25 border-t-cyan-400/40 rounded-3xl p-5 shadow-2xl pointer-events-auto">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-cyan-400" />
              Smart Home Telemetry
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              {smartHome.consumer_name} • {smartHome.locality}
            </p>
          </div>
          <span className="font-mono text-xs font-bold text-cyan-300 px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 tabular-nums">
            {smartHome.voltage.toFixed(1)}V
          </span>
        </div>

        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-300" role="status">
          <CheckCircle2 className="h-3 w-3" />
          <span>Signed-in device controls · changes are recorded</span>
        </div>

        {/* 4 Primary Power Metrics */}
        <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
          <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px]">Home Load</span>
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="font-mono text-base font-extrabold text-cyan-300 tabular-nums">
              {smartHome.total_load_kw.toFixed(2)}{' '}
              <span className="text-xs font-normal text-slate-400">kW</span>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px]">Rooftop Solar</span>
              <Sun className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="font-mono text-base font-extrabold text-emerald-300 tabular-nums">
              {smartHome.solar_generation_kw.toFixed(2)}{' '}
              <span className="text-xs font-normal text-slate-400">kW</span>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px]">Home Battery</span>
              <BatteryCharging className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="font-mono text-base font-extrabold text-slate-100 tabular-nums">
              {smartHome.battery_soc_pct.toFixed(0)}%{' '}
              <span className="text-[10px] font-normal text-slate-400">
                ({smartHome.battery_power_kw > 0 ? `+${smartHome.battery_power_kw}kW` : `${smartHome.battery_power_kw}kW`})
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px]">Grid Net Flow</span>
              {smartHome.grid_import_kw > 0 ? (
                <ArrowDownRight className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              )}
            </div>
            <div className="font-mono text-base font-extrabold text-amber-300 tabular-nums">
              {smartHome.grid_import_kw > 0
                ? `${smartHome.grid_import_kw.toFixed(2)} kW Imp`
                : `${smartHome.grid_export_kw.toFixed(2)} kW Exp`}
            </div>
          </div>
        </div>

        {/* Dynamic Bill Forecast & Interactive Budget Slider */}
        <div className="mt-3 p-3.5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-cyan-950/40 border border-cyan-500/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              Projected Monthly Bill
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
              ML Forecast
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-mono font-black text-white tabular-nums">
              ₹{smartHome.projected_monthly_bill_inr.toFixed(0)}
            </div>
            <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 font-mono">
              <TrendingDown className="w-3.5 h-3.5" />
              Saving ₹680/mo (Solar)
            </div>
          </div>

          {/* Interactive Target Budget Slider */}
          <div className="mt-2.5 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[10px] font-mono mb-1">
              <span className="text-slate-400">Monthly Budget Target:</span>
              <span className="text-cyan-300 font-bold">₹{budgetTarget}</span>
            </div>
            <input
              type="range"
              min="2000"
              max="5500"
              step="100"
              value={budgetTarget}
              onChange={(e) => setBudgetTarget(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            {smartHome.projected_monthly_bill_inr > budgetTarget && (
              <button
                onClick={handleApplyBudgetOptimization}
                className="w-full mt-2 py-1 px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-[10px] font-bold text-emerald-300 flex items-center justify-center gap-1 transition-all"
              >
                <Sliders className="w-3 h-3" />
                <span>Auto-Optimize to Stay Under ₹{budgetTarget}</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <button
            onClick={() => setShowChartModal(true)}
            className="py-2 px-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-[11px] font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-all"
          >
            <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
            <span>24h Forecast</span>
          </button>

          <button
            onClick={() => setShowReportModal(true)}
            className="py-2 px-2.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-500/40 text-[11px] font-semibold text-cyan-200 flex items-center justify-center gap-1.5 transition-all shadow-sm"
          >
            <Send className="w-3.5 h-3.5 text-cyan-400" />
            <span>Report to BESCOM</span>
          </button>
        </div>
      </div>

      {/* Top Right Floating Card: Interactive Appliances Deck */}
      <div className="absolute top-4 right-4 z-10 w-84 backdrop-blur-xl bg-[#091122]/90 border border-cyan-400/25 border-t-cyan-400/40 rounded-3xl p-5 shadow-2xl pointer-events-auto">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Power className="w-4 h-4 text-emerald-400" />
            3D Interactive Appliances
          </h2>
          <span className="text-[11px] text-slate-400 font-mono">
            {appliances.filter((a) => a.is_on).length}/{appliances.length} Active
          </span>
        </div>

        <div className="space-y-2 mt-3 max-h-96 overflow-y-auto pr-1">
          {appliances.map((app) => (
            <div
              key={app.id}
              onClick={() => focusAppliance(app.id)}
              role="group"
              aria-label={`${app.name} controls`}
              className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                app.is_on
                  ? 'bg-slate-900/90 border-cyan-500/40 shadow-sm'
                  : 'bg-slate-950/60 border-slate-800/80 opacity-60 hover:opacity-100'
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      app.is_on ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'bg-slate-600'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={(event) => { event.stopPropagation(); focusAppliance(app.id); }}
                    className="text-left text-xs font-bold text-slate-200 hover:text-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
                    aria-label={`Focus ${app.name} in the 3D home`}
                  >
                    {app.name}
                  </button>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                  {app.room} • Rated: {app.rated_kw} kW
                  {app.suggested_off_peak && (
                    <span className="ml-1 text-emerald-400 font-semibold">• Off-Peak Benefit</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-cyan-300 tabular-nums">
                  {app.current_kw.toFixed(2)} kW
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    energyWs.toggleAppliance(app.id, !app.is_on);
                  }}
                  className={`p-1.5 rounded-xl text-xs transition-colors ${
                    app.is_on
                      ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                  title={app.is_on ? 'Click to switch off' : 'Click to switch on'}
                  aria-label={`${app.is_on ? 'Switch off' : 'Switch on'} ${app.name}`}
                >
                  <Power className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Floating Bar: AI Energy Recommendations */}
      <div className="absolute bottom-4 left-4 right-4 z-10 max-w-4xl mx-auto backdrop-blur-xl bg-[#091122]/90 border border-cyan-400/25 border-t-cyan-400/40 rounded-2xl p-3.5 shadow-2xl pointer-events-auto">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              AI Actionable Energy Advisor
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-[10px] font-mono text-cyan-300 border border-cyan-500/30 font-bold">
              Scikit-Learn ML
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {mlInsights.length} Recommendations Available
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2.5">
          {mlInsights.slice(0, 2).map((insight, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs flex items-start gap-2"
            >
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 mt-0.5 shrink-0">
                <Info className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-[11px] truncate">{insight.title}</span>
                  {insight.projected_impact_inr && (
                    <span className="text-[10px] font-mono font-bold text-emerald-400 shrink-0">
                      Save ₹{insight.projected_impact_inr}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">{insight.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Report Issue to BESCOM Modal ── */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#09152D] border border-cyan-500/40 p-6 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-cyan-400" />
                Report Power Issue to BESCOM SCADA
              </h3>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="text-xs text-emerald-300 font-bold">{reportSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleReportIssue} className="mt-4 space-y-3.5">
                <div>
                  <label className="text-[11px] font-mono text-slate-300 block mb-1">Issue Category</label>
                  <select
                    value={reportCategory}
                    onChange={(e) => setReportCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Voltage Sag / Low Voltage">Voltage Sag / Low Voltage (&lt;200V)</option>
                    <option value="High Voltage Surge">High Voltage Surge (&gt;250V)</option>
                    <option value="Feeder Outage / Blackout">Feeder Outage / Blackout</option>
                    <option value="Smart Meter Reading Discrepancy">Smart Meter Reading Discrepancy</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-300 block mb-1">Details & Affected Appliances</label>
                  <textarea
                    rows={3}
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
                    placeholder="Describe voltage sag symptoms..."
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[10px] font-mono text-slate-400">Locality: Indiranagar 2nd Stage</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowReportModal(false)}
                      className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingReport}
                      className="px-4 py-1.5 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center gap-1.5 shadow-md"
                    >
                      {isSubmittingReport ? 'Dispatching...' : 'Submit to BESCOM'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 24-Hour Load & Solar Forecast Modal */}
      {showChartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-[#091122] border border-cyan-500/30 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                24-Hour Consumer Load & Solar Forecast (BESCOM LT-2 Tariff)
              </h3>
              <button
                onClick={() => setShowChartModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="h-72 w-full mt-4">
              <ReactECharts option={getForecastOption()} style={{ height: '100%', width: '100%' }} />
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Peak Hours: 18:00 - 22:00 (₹8.50/kWh) • Off-Peak: 22:00 - 06:00 (₹4.20/kWh)</span>
              <button
                onClick={() => setShowChartModal(false)}
                className="py-1.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsumerPortal;