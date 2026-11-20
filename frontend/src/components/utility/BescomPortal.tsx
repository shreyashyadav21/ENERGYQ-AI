import React, { useState, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  Network,
  Activity,
  AlertTriangle,
  MapPin,
  Box,
  Wrench,
  CheckCircle2,
  TrendingDown,
  BarChart3,
  ShieldCheck,
  Zap,
  Info,
  Radio,
  Send,
  Users,
  Clock,
  ChevronRight,
  Eye,
  Thermometer,
  Gauge,
  Volume2,
  VolumeX,
  ShieldAlert,
  Sliders,
  X
} from 'lucide-react';
import { useEnergyStore } from '../../stores/energyStore';
import { energyWs } from '../../services/websocket';
import { SmartGridTwin } from '../3d/SmartGridTwin';
import { GridGisMap } from '../gis/GridGisMap';
import { GridIncident, TransformerHealth } from '../../types/energy';

const TX_COORDINATES: Record<string, [number, number, number]> = {
  tx_indiranagar: [-9, 0, 6],
  tx_koramangala: [9, 0, 6],
  tx_yelahanka: [0, 0, -10],
  tx_whitefield: [11, 0, -7],
  tx_jayanagar: [-8, 0, -5],
  tx_hebbal: [-4, 0, -12],
};

const TX_CODE_MAP: Record<string, string> = {
  tx_indiranagar: 'DTC-04',
  tx_koramangala: 'DT-12',
  tx_yelahanka: 'TX-2',
  tx_whitefield: 'TX-09',
  tx_jayanagar: 'DT-07',
  tx_hebbal: 'TX-11',
};

export const BescomPortal: React.FC = () => {
  const telemetry = useEnergyStore((s) => s.telemetry);
  const bescomViewMode = useEnergyStore((s) => s.bescomViewMode);
  const setBescomViewMode = useEnergyStore((s) => s.setBescomViewMode);
  const selectedTxId = useEnergyStore((s) => s.selectedTransformerId);
  const setSelectedTxId = useEnergyStore((s) => s.setSelectedTransformerId);
  const flyToAsset = useEnergyStore((s) => s.flyToAsset);

  const [alertToast, setAlertToast] = useState<string | null>(null);
  const [lossModalOpen, setLossModalOpen] = useState(false);
  const [backdropMode, setBackdropMode] = useState<'render' | 'cyber' | 'minimal'>('render');
  const [userIncidents, setUserIncidents] = useState<GridIncident[]>([]);
  const [incidentReplies, setIncidentReplies] = useState<Record<string, string>>({});
  const [incidentQueueError, setIncidentQueueError] = useState<string | null>(null);

  // EEE Voltage & Flow Overload Thresholds & Alarm State
  const [eeeThresholds, setEeeThresholds] = useState({
    minVoltageV: 205.0,  // Undervoltage / sag limit (nom 230V)
    maxVoltageV: 248.0,  // Overvoltage / surge limit
    maxLoadPct: 85.0,    // Feeder overload flow limit
    maxOilTempC: 75.0,   // Transformer insulation runaway limit
  });
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [isAlarmMuted, setIsAlarmMuted] = useState(false);

  // Buffer for live 3-Phase Voltage and Feeder Load curve
  const [timeSeriesBuffer, setTimeSeriesBuffer] = useState<{
    timestamps: string[];
    vR: number[];
    vY: number[];
    vB: number[];
    totalLoad: number[];
  }>({
    timestamps: ['-15s', '-12s', '-9s', '-6s', '-3s', 'Now'],
    vR: [230.2, 230.1, 229.8, 230.4, 230.0, 230.1],
    vY: [229.4, 229.6, 229.1, 229.5, 229.2, 229.3],
    vB: [230.8, 230.5, 230.2, 230.7, 230.4, 230.6],
    totalLoad: [2920, 2940, 2935, 2950, 2948, 2952],
  });

  const transformers = telemetry.transformers;
  const feeders = telemetry.feeders;
  const activeEvents = telemetry.active_events;

  useEffect(() => {
    let active = true;
    const refreshIncidents = async () => {
      try {
        const reports = await energyWs.listIncidents();
        if (active) {
          setUserIncidents(reports);
          setIncidentQueueError(null);
        }
      } catch (error) {
        console.error('Could not refresh BESCOM service queue:', error);
        if (active) setIncidentQueueError('Service requests could not be loaded.');
      }
    };
    void refreshIncidents();
    const intervalId = window.setInterval(() => void refreshIncidents(), 12000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  // Append live telemetry to the chart time-series every telemetry update
  useEffect(() => {
    const now = new Date();
    const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    // Compute average phase voltages from transformers
    let avgVR = 230.0;
    let avgVY = 229.5;
    let avgVB = 230.2;
    if (transformers.length > 0 && transformers[0].phase_voltages) {
      avgVR = Number((transformers.reduce((acc, t) => acc + (t.phase_voltages?.V_R || 230), 0) / transformers.length).toFixed(1));
      avgVY = Number((transformers.reduce((acc, t) => acc + (t.phase_voltages?.V_Y || 229), 0) / transformers.length).toFixed(1));
      avgVB = Number((transformers.reduce((acc, t) => acc + (t.phase_voltages?.V_B || 230), 0) / transformers.length).toFixed(1));
    }

    const totalKva = Math.round(feeders.reduce((acc, f) => acc + (f.input_power_kva || 0), 0)) || 2952;

    setTimeSeriesBuffer((prev) => {
      const maxPts = 10;
      const nextTs = [...prev.timestamps.slice(-maxPts + 1), timeStr];
      const nextVR = [...prev.vR.slice(-maxPts + 1), avgVR];
      const nextVY = [...prev.vY.slice(-maxPts + 1), avgVY];
      const nextVB = [...prev.vB.slice(-maxPts + 1), avgVB];
      const nextLoad = [...prev.totalLoad.slice(-maxPts + 1), totalKva];
      return {
        timestamps: nextTs,
        vR: nextVR,
        vY: nextVY,
        vB: nextVB,
        totalLoad: nextLoad,
      };
    });
  }, [telemetry.timestamp]);

  // Handle Inspect in 3D
  const handleInspectIn3D = (txId: string) => {
    setSelectedTxId(txId);
    setBescomViewMode('3d');
    const pos = TX_COORDINATES[txId] || [0, 8, 12];
    flyToAsset(pos);
  };

  // Handle Crew Dispatch
  const handleDispatchCrew = (txId: string) => {
    energyWs.assignCrew(txId);
    setAlertToast(`Emergency field maintenance unit dispatched to ${txId.replace('tx_', '').toUpperCase()} Substation.`);
    setTimeout(() => setAlertToast(null), 4000);
  };

  // Handle Push Outage / Restoration Alert to Affected Consumers
  const handlePushConsumerAlert = (locality: string, type: 'outage' | 'restoration') => {
    const msg = type === 'outage'
      ? `BESCOM SMS Alert sent to 3,420 consumers in ${locality}: Feeder trip detected. Crew dispatched, restoration ETA 45m.`
      : `BESCOM SMS Alert sent to ${locality}: Grid stability normalized. Power restored successfully.`;
    setAlertToast(msg);
    setTimeout(() => setAlertToast(null), 5000);
  };

  const handleIncidentReply = async (incident: GridIncident, status: 'responded' | 'resolved') => {
    const responseText = incidentReplies[incident.id]?.trim();
    if (!responseText) return;
    try {
      const updated = await energyWs.respondToIncident(incident.id, responseText, status);
      setUserIncidents((current) => current.map((item) => item.id === updated.id ? updated : item));
      setIncidentReplies((current) => ({ ...current, [incident.id]: '' }));
    } catch (error) {
      console.error('Could not send BESCOM service response:', error);
      setIncidentQueueError('Your response was not sent. Please retry.');
    }
  };

  // EEE Overload & Limits Violation Evaluation
  const overloadedTx = transformers.find(
    (tx) =>
      tx.load_pct >= eeeThresholds.maxLoadPct ||
      tx.oil_temp_c >= eeeThresholds.maxOilTempC ||
      tx.voltage_v <= 370 ||
      (tx.phase_voltages && Math.min(tx.phase_voltages.V_R || 230, tx.phase_voltages.V_Y || 230, tx.phase_voltages.V_B || 230) < eeeThresholds.minVoltageV) ||
      tx.is_ml_anomaly
  );
  const activeFaultEvent = activeEvents.find((e) => !e.resolved);
  const hasCriticalOverload = Boolean(
    overloadedTx || (activeFaultEvent && (activeFaultEvent.severity === 'high' || activeFaultEvent.severity === 'critical'))
  );

  // Web Audio SCADA Alarm Sound Synthesizer
  const playScadaAlarmBeep = () => {
    if (isAlarmMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // Audio autoplay policy
    }
  };

  useEffect(() => {
    if (hasCriticalOverload && !isAlarmMuted) {
      playScadaAlarmBeep();
    }
  }, [hasCriticalOverload, isAlarmMuted, telemetry.timestamp]);

  const handleEmergencyLoadShed = () => {
    energyWs.triggerEvent('shed_load_yelahanka');
    setAlertToast('⚡ Emergency Demand Response Dispatched: 25% non-critical feeder load shed. Substation current stabilizing.');
    setTimeout(() => setAlertToast(null), 5000);
  };

  const handleEmergencyBreakerTrip = () => {
    energyWs.triggerEvent('trip_breaker_yelahanka');
    setAlertToast('🛡️ Protective Trip Action: Feeder circuit breaker VCB-04 tripped. Section isolated from 11kV bus.');
    setTimeout(() => setAlertToast(null), 5000);
  };

  // Live ECharts 3-Phase Multi-Line Telemetry Chart
  const getTelemetryChartOption = () => {
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross', lineStyle: { color: '#00F0FF', width: 1, type: 'dashed' } },
        backgroundColor: '#091122',
        borderColor: '#00F0FF',
        textStyle: { color: '#E2E8F0', fontSize: 11 },
      },
      legend: {
        data: ['Phase R (V)', 'Phase Y (V)', 'Phase B (V)', 'Load (kVA)'],
        textStyle: { color: '#94A3B8', fontSize: 10 },
        top: 0,
        itemGap: 8,
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '24%', containLabel: true },
      xAxis: {
        type: 'category',
        data: timeSeriesBuffer.timestamps,
        axisLine: { lineStyle: { color: '#1E293B' } },
        axisLabel: { color: '#64748B', fontSize: 9 },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Volts (V)',
          min: 210,
          max: 245,
          splitLine: { lineStyle: { color: '#0F172A' } },
          axisLabel: { color: '#94A3B8', fontSize: 9 },
        },
        {
          type: 'value',
          name: 'kVA',
          min: 2500,
          max: 3300,
          splitLine: { show: false },
          axisLabel: { color: '#64748B', fontSize: 9 },
        },
      ],
      series: [
        {
          name: 'Phase R (V)',
          type: 'line',
          smooth: true,
          data: timeSeriesBuffer.vR,
          lineStyle: { color: '#EF4444', width: 2 },
          itemStyle: { color: '#EF4444' },
          symbol: 'none',
        },
        {
          name: 'Phase Y (V)',
          type: 'line',
          smooth: true,
          data: timeSeriesBuffer.vY,
          lineStyle: { color: '#F59E0B', width: 2 },
          itemStyle: { color: '#F59E0B' },
          symbol: 'none',
        },
        {
          name: 'Phase B (V)',
          type: 'line',
          smooth: true,
          data: timeSeriesBuffer.vB,
          lineStyle: { color: '#3B82F6', width: 2 },
          itemStyle: { color: '#3B82F6' },
          symbol: 'none',
        },
        {
          name: 'Load (kVA)',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          data: timeSeriesBuffer.totalLoad,
          lineStyle: { color: '#00F0FF', width: 1.5, type: 'dashed' },
          itemStyle: { color: '#00F0FF' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(0, 240, 255, 0.18)' },
                { offset: 1, color: 'rgba(0, 240, 255, 0.0)' },
              ],
            },
          },
          symbol: 'none',
        },
      ],
    };
  };

  return (
    <div className="w-full h-full relative overflow-hidden flex bg-gradient-to-br from-[#060D1E] via-[#09152C] to-[#040814]">
      {/* ── Restored Background Image: Fresh Photorealistic 3D BESCOM Grid Render ── */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30 pointer-events-none transition-opacity duration-700"
        style={{ backgroundImage: "url('/images/bescom-bengaluru-grid-v2.jpg')" }}
      />

      {/* Ambient light falls behind the real-time 3D substation scene. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(59,130,246,0.15),transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-0 inset-x-0 h-80 bg-[radial-gradient(ellipse_100%_70%_at_50%_100%,rgba(6,182,212,0.12),transparent_75%)] pointer-events-none" />

      {/* ── Emergency EEE Overload & Voltage Limit Violation Alert Bar for Workers ── */}
      {hasCriticalOverload && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 max-w-4xl w-[94%] p-3.5 rounded-2xl bg-gradient-to-r from-red-950/95 via-[#1A0A10]/95 to-amber-950/95 border-2 border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.55)] backdrop-blur-2xl flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-red-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-red-400 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-xs tracking-wider uppercase">
                  🚨 EEE LIMIT OVERLOAD: {overloadedTx ? `${overloadedTx.locality} (${TX_CODE_MAP[overloadedTx.id] || 'DT'})` : (activeFaultEvent?.title || 'Grid Anomaly')}
                </span>
                <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-red-500/30 text-red-300 border border-red-500/50">
                  {overloadedTx?.load_pct ? `${overloadedTx.load_pct.toFixed(0)}% LOAD` : 'CRITICAL'}
                </span>
              </div>
              <p className="text-[11px] text-red-300/90 font-mono mt-0.5">
                {overloadedTx
                  ? `Load: ${overloadedTx.load_pct.toFixed(0)}% (Safety Limit: ${eeeThresholds.maxLoadPct}%) • Core Temp: ${overloadedTx.oil_temp_c.toFixed(1)}°C (Limit: ${eeeThresholds.maxOilTempC}°C) • Phase VR: ${overloadedTx.phase_voltages?.V_R || 218}V (Safe Floor: ${eeeThresholds.minVoltageV}V). Action required!`
                  : (activeFaultEvent?.description || 'Substation voltage sag detected. Protective intervention required.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleEmergencyLoadShed}
              className="py-1.5 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-200 font-bold text-xs flex items-center gap-1.5 shadow-md"
              title="Dispatches automated demand response to shed non-critical feeder load"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Shed Load (-25%)</span>
            </button>

            <button
              onClick={handleEmergencyBreakerTrip}
              className="py-1.5 px-2.5 rounded-xl bg-red-600/30 hover:bg-red-600/50 border border-red-500/50 text-red-200 font-bold text-xs flex items-center gap-1 shadow-md"
              title="Trips protective feeder circuit breaker"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
              <span>Trip Breaker</span>
            </button>

            {overloadedTx && (
              <button
                onClick={() => handleDispatchCrew(overloadedTx.id)}
                className="py-1.5 px-2.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/50 text-blue-200 font-bold text-xs flex items-center gap-1 shadow-md"
              >
                <Wrench className="w-3.5 h-3.5 text-blue-400" />
                <span>Dispatch Crew</span>
              </button>
            )}

            <button
              onClick={() => setIsAlarmMuted(!isAlarmMuted)}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300"
              title={isAlarmMuted ? 'Unmute SCADA Alarm' : 'Mute SCADA Alarm'}
            >
              {isAlarmMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-red-400 animate-pulse" />}
            </button>

            <button
              onClick={() => setShowThresholdModal(true)}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300"
              title="Configure EEE Voltage & Flow Thresholds"
            >
              <Sliders className="w-4 h-4 text-cyan-400" />
            </button>
          </div>
        </div>
      )}

      {/* ── Center Viewport: 3D Grid Digital Twin or MapLibre GIS Map ── */}
      <div className="w-full h-full absolute inset-0 z-0">
        {bescomViewMode === '3d' ? <SmartGridTwin backdropMode={backdropMode} /> : <GridGisMap />}
      </div>

      {/* ── Floating Center Toggle Pill (3D Digital Twin vs MapLibre GIS Map) ── */}
      <div className={`absolute ${hasCriticalOverload ? 'top-20' : 'top-4'} left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 transition-all`}>
        <div className="flex items-center bg-[#091122]/90 border border-blue-500/30 p-1.5 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] backdrop-blur-xl">
          <button
            onClick={() => setBescomViewMode('3d')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              bescomViewMode === '3d'
                ? 'bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Box className="w-4 h-4" />
            <span>3D Substation & Feeder Twin</span>
          </button>

          <button
            onClick={() => setBescomViewMode('gis')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              bescomViewMode === 'gis'
                ? 'bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Live Bengaluru GIS Map</span>
          </button>
        </div>

        {/* 3D Asset Quick-Navigation Toolbar */}
        {bescomViewMode === '3d' && (
          <div className="hidden sm:flex items-center gap-1 px-3 py-1 rounded-2xl bg-[#09152D]/90 border border-slate-700/60 backdrop-blur-xl shadow-xl text-xs font-mono text-slate-300">
            <span className="text-slate-400 text-[10px] mr-1">3D Locality Focus:</span>
            <button
              onClick={() => { setSelectedTxId(null); flyToAsset([0, 19, 23], [0, 1.5, 0]); }}
              className="px-2 py-0.5 rounded-lg hover:bg-blue-500/20 hover:text-cyan-200 transition-colors"
            >
              🌐 Overview
            </button>
            <button
              onClick={() => { setSelectedTxId('central_substation'); flyToAsset([0, 7.5, 9.5], [0, 1.8, 0]); }}
              className={`px-2 py-0.5 rounded-lg transition-colors ${selectedTxId === 'central_substation' ? 'bg-blue-600/40 text-cyan-300 font-bold' : 'hover:bg-blue-500/20 hover:text-cyan-200'}`}
            >
              ⚡ Substation
            </button>
            {['tx_indiranagar', 'tx_koramangala', 'tx_yelahanka', 'tx_whitefield'].map((id) => {
              const tx = transformers.find((t) => t.id === id);
              const isAnomaly = tx?.is_ml_anomaly;
              const isSel = selectedTxId === id;
              return (
                <button
                  key={id}
                  onClick={() => handleInspectIn3D(id)}
                  className={`px-2 py-0.5 rounded-lg transition-colors flex items-center gap-1 ${
                    isSel
                      ? 'bg-blue-600/40 text-cyan-300 font-bold'
                      : isAnomaly
                      ? 'bg-red-500/20 text-red-300 font-bold'
                      : 'hover:bg-blue-500/20 hover:text-cyan-200'
                  }`}
                >
                  {isAnomaly && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />}
                  <span>{tx?.locality || id.replace('tx_', '')}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* 3D Backdrop Image & Environment Mode Selector */}
        {bescomViewMode === '3d' && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#09152D]/90 border border-blue-400/30 backdrop-blur-xl shadow-lg text-[10px] font-mono">
            <span className="text-blue-300 font-bold uppercase tracking-wider pr-1">3D Backdrop:</span>
            <button
              onClick={() => {
                setBackdropMode('render');
                setAlertToast('🖼️ 3D Render Backdrop: High-resolution Bengaluru SCADA substation grid render active.');
              }}
              className={`px-2.5 py-0.5 rounded-lg font-bold transition-all ${
                backdropMode === 'render'
                  ? 'bg-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.6)] font-extrabold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              🖼️ 3D Substation Render
            </button>
            <button
              onClick={() => {
                setBackdropMode('cyber');
                setAlertToast('🏙️ Cyber Grid Backdrop: High-voltage transmission skyline and wind turbines active.');
              }}
              className={`px-2.5 py-0.5 rounded-lg font-bold transition-all ${
                backdropMode === 'cyber'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.6)] font-extrabold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              🏙️ Cyber Horizon
            </button>
            <button
              onClick={() => {
                setBackdropMode('minimal');
                setAlertToast('🌑 SCADA Studio: Clean dark substation diorama active.');
              }}
              className={`px-2.5 py-0.5 rounded-lg font-bold transition-all ${
                backdropMode === 'minimal'
                  ? 'bg-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.6)] font-extrabold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              🌑 Clean SCADA
            </button>
          </div>
        )}
      </div>

      {/* ── Left SCADA Panel: Grid Health & Live Telemetry Charts ── */}
      <div className="absolute top-4 left-4 bottom-4 z-10 w-[360px] flex flex-col gap-3 pointer-events-none">
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 pointer-events-auto scrollbar-thin">

          {/* Primary Substation KPI Card */}
          <div className="p-4 rounded-2xl bg-[#091122]/90 backdrop-blur-xl border border-blue-500/25 border-t-blue-400/40 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                  <Network className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                    BESCOM SCADA Command
                  </h2>
                  <p className="text-[10px] text-slate-400">Bengaluru Urban Grid Division</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                11kV Grid Live
              </span>
            </div>

            {/* 4 SCADA Indicators */}
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Grid Frequency</span>
                <span className="font-mono text-sm font-extrabold text-cyan-300 tabular-nums">
                  {telemetry.system_frequency_hz.toFixed(2)} Hz
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Active Feeders</span>
                <span className="font-mono text-sm font-extrabold text-emerald-300 tabular-nums">
                  4 / 4 Online
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Total Active Load</span>
                <span className="font-mono text-sm font-extrabold text-slate-100 tabular-nums">
                  2,952 kVA
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">AT&C Loss</span>
                <span className="font-mono text-sm font-extrabold text-amber-300 tabular-nums">
                  4.6% Avg
                </span>
              </div>
            </div>
          </div>

          {/* Live Apache ECharts Multi-Line Telemetry Chart */}
          <div className="p-4 rounded-2xl bg-[#091122]/90 backdrop-blur-xl border border-blue-500/25 border-t-blue-400/40 shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <h3 className="text-xs font-bold text-white">3-Phase Voltage & Load Waveform</h3>
              </div>
              <span className="text-[10px] font-mono text-cyan-400">1.5s Stream</span>
            </div>
            <div className="h-44 w-full">
              <ReactECharts option={getTelemetryChartOption()} style={{ height: '100%', width: '100%' }} />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" /> VR: ~230V
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> VY: ~229V
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> VB: ~230V
              </span>
            </div>
          </div>

          {/* Distribution Loss & Commercial Theft AI Card */}
          <div className="p-4 rounded-2xl bg-[#091122]/90 backdrop-blur-xl border border-blue-500/25 border-t-blue-400/40 shadow-2xl">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-cyan-400" />
                Feeder Loss & Theft AI Analysis
              </span>
              <button
                onClick={() => setLossModalOpen(true)}
                className="text-[10px] font-mono text-cyan-400 hover:underline"
              >
                Inspect All →
              </button>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Cross-referencing substation 11kV bus output against smart meter consumer aggregates.
            </p>
            {feeders.some((f) => f.loss_status === 'critical_theft') && (
              <div className="mt-2.5 p-2 rounded-xl bg-red-500/15 border border-red-500/30 text-[11px] text-red-300 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span>Commercial Theft Anomaly: Whitefield Feeder (14.5% Loss)</span>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Right SCADA Panel: Transformer Health Matrix & Outage Dispatch ── */}
      <div className="absolute top-4 right-4 bottom-4 z-10 w-[380px] flex flex-col gap-3 pointer-events-none">
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 pointer-events-auto scrollbar-thin">

          {/* Transformer Matrix Header */}
          <div className="p-4 rounded-2xl bg-[#091122]/90 backdrop-blur-xl border border-blue-500/25 border-t-blue-400/40 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center">
                  <Gauge className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                    Transformer Telemetry Matrix
                  </h2>
                  <p className="text-[10px] text-slate-400">Bengaluru Distribution Units</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-cyan-300 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30">
                XGBoost ML
              </span>
            </div>

            {/* Transformer Cards List */}
            <div className="space-y-2.5 mt-3">
              {transformers.map((tx) => {
                const isSelected = selectedTxId === tx.id;
                const isOverheating = tx.oil_temp_c > 75;
                const isAnomaly = tx.is_ml_anomaly;
                const txCode = TX_CODE_MAP[tx.id] || 'DT-01';
                const health = tx.health_score || (100 - tx.oil_temp_c * 0.4);

                let healthBarColor = 'bg-emerald-400';
                if (health < 60) healthBarColor = 'bg-red-500';
                else if (health < 80) healthBarColor = 'bg-amber-400';

                return (
                  <div
                    key={tx.id}
                    onClick={() => setSelectedTxId(tx.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-950/70 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                        : isAnomaly
                        ? 'bg-red-950/40 border-red-500/40 hover:border-red-500'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">{tx.locality}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {txCode}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isAnomaly && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse">
                            Anomaly
                          </span>
                        )}
                        <span className="font-mono text-xs font-bold text-cyan-300 tabular-nums">
                          {tx.load_pct.toFixed(0)}% Load
                        </span>
                      </div>
                    </div>

                    {/* Sensor stats: Oil temp, Winding, 3-Phase Imbalance, AI Health Score */}
                    <div className="grid grid-cols-4 gap-1.5 my-2 text-[10px] font-mono">
                      <div className="p-1 rounded bg-slate-950/60 border border-slate-800/80 text-center">
                        <span className="text-slate-500 block text-[9px]">Oil Temp</span>
                        <span className={`font-bold tabular-nums ${isOverheating ? 'text-red-400 animate-pulse' : 'text-slate-200'}`}>
                          {tx.oil_temp_c.toFixed(1)}°C
                        </span>
                      </div>
                      <div className="p-1 rounded bg-slate-950/60 border border-slate-800/80 text-center">
                        <span className="text-slate-500 block text-[9px]">Winding</span>
                        <span className="font-bold text-slate-200 tabular-nums">
                          {tx.winding_temp_c.toFixed(1)}°C
                        </span>
                      </div>
                      <div className="p-1 rounded bg-slate-950/60 border border-slate-800/80 text-center">
                        <span className="text-slate-500 block text-[9px]">3Φ Imbal.</span>
                        <span className="font-bold text-cyan-300 tabular-nums">
                          {((Math.abs((tx.phase_voltages?.V_R || 230) - (tx.phase_voltages?.V_B || 230)) / 230) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="p-1 rounded bg-slate-950/60 border border-slate-800/80 text-center">
                        <span className="text-slate-500 block text-[9px]">AI Health</span>
                        <span className="font-bold text-emerald-300 tabular-nums">
                          {health.toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {/* Health progress bar */}
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2.5">
                      <div
                        className={`h-full ${healthBarColor} transition-all duration-500`}
                        style={{ width: `${Math.min(100, Math.max(5, health))}%` }}
                      />
                    </div>

                    {/* Action buttons: Inspect 3D and Dispatch Crew */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInspectIn3D(tx.id);
                        }}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 text-[10px] font-bold text-cyan-300 flex items-center justify-center gap-1 transition-all"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect 3D</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDispatchCrew(tx.id);
                        }}
                        disabled={Boolean(tx.maintenance_dispatched || tx.crew_assigned)}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                          (tx.maintenance_dispatched || tx.crew_assigned)
                            ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 cursor-default'
                            : 'bg-blue-900/40 hover:bg-blue-800/60 border border-blue-500/40 text-blue-200'
                        }`}
                      >
                        <Wrench className="w-3 h-3" />
                        <span>{(tx.maintenance_dispatched || tx.crew_assigned) ? 'Crew Assigned' : 'Dispatch Crew'}</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePushConsumerAlert(tx.locality, tx.is_ml_anomaly ? 'outage' : 'restoration');
                        }}
                        className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-bold text-slate-300 flex items-center justify-center gap-1 transition-all"
                        title="Broadcast SMS to locality residents"
                      >
                        <Send className="w-3 h-3 text-cyan-400" />
                        <span>SMS</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Outage & Maintenance Queue */}
          <div className="p-4 rounded-2xl bg-[#091122]/90 backdrop-blur-xl border border-amber-500/25 border-t-amber-400/40 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-300" />
                <h3 className="text-xs font-bold text-white">Consumer Service Requests</h3>
              </div>
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-200">
                {userIncidents.filter((incident) => incident.status === 'open').length} Open
              </span>
            </div>
            {incidentQueueError && <p role="alert" className="mt-2 text-[10px] text-red-300">{incidentQueueError}</p>}
            {userIncidents.length === 0 ? (
              <p className="py-4 text-center text-[11px] text-slate-400">No consumer reports yet.</p>
            ) : (
              <div className="mt-3 space-y-2.5">
                {userIncidents.map((incident) => (
                  <div key={incident.id} className="rounded-xl border border-slate-700 bg-slate-900/80 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-100">{incident.category}</p>
                        <p className="text-[10px] text-slate-400">{incident.locality}{incident.reporter_ref ? ` · ${incident.reporter_ref}` : ''}</p>
                      </div>
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] capitalize text-amber-200">{incident.status}</span>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-300">{incident.description}</p>
                    {incident.status !== 'resolved' ? (
                      <div className="mt-2 space-y-2">
                        {incident.response && (
                          <p className="rounded-lg bg-blue-950/40 p-2 text-[10px] text-blue-200">
                            Previous update: {incident.response}
                          </p>
                        )}
                        <textarea
                          value={incidentReplies[incident.id] || ''}
                          onChange={(event) => setIncidentReplies((current) => ({ ...current, [incident.id]: event.target.value }))}
                          rows={2}
                          maxLength={2000}
                          placeholder="Write an update or next step for the consumer..."
                          aria-label={`Reply to ${incident.category} report`}
                          className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 py-2 text-[11px] text-white placeholder:text-slate-500"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void handleIncidentReply(incident, 'responded')}
                            disabled={(incidentReplies[incident.id] || '').trim().length < 3}
                            className="flex-1 rounded-lg border border-blue-500/40 bg-blue-500/15 px-2 py-1.5 text-[10px] font-bold text-blue-200 disabled:opacity-40"
                          >
                            Send update
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleIncidentReply(incident, 'resolved')}
                            disabled={(incidentReplies[incident.id] || '').trim().length < 3}
                            className="flex-1 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2 py-1.5 text-[10px] font-bold text-emerald-200 disabled:opacity-40"
                          >
                            Resolve & reply
                          </button>
                        </div>
                      </div>
                    ) : incident.response && (
                      <p className="mt-2 rounded-lg bg-emerald-950/40 p-2 text-[10px] text-emerald-200">{incident.response}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Outage & Maintenance Queue */}
          <div className="p-4 rounded-2xl bg-[#091122]/90 backdrop-blur-xl border border-blue-500/25 border-t-blue-400/40 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-white">Outage & Maintenance Queue</h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                {activeEvents.length > 0 ? `${activeEvents.length} Active` : 'All Clear'}
              </span>
            </div>

            {activeEvents.length === 0 ? (
              <div className="py-4 text-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1 opacity-80" />
                <p className="text-xs text-slate-300 font-semibold">Urban Grid Nominal</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Zero feeder outages reported in division</p>
              </div>
            ) : (
              <div className="space-y-2.5 mt-3">
                {activeEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3 rounded-xl bg-slate-900/90 border border-red-500/30 text-xs flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-red-300">{evt.title}</span>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-bold">
                        {evt.severity}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-snug">{evt.description}</p>

                    {/* Outage Lifecycle Workflow Tracker */}
                    <div className="flex items-center justify-between text-[10px] font-mono p-1.5 rounded-lg bg-slate-950/80 border border-slate-800">
                      <span className="text-slate-400">Workflow:</span>
                      <div className="flex items-center gap-1">
                        <span className="px-1 py-0.2 rounded bg-red-500/20 text-red-300 font-bold">Alert Triggered</span>
                        <span className="text-slate-600">→</span>
                        <span className={`px-1 py-0.2 rounded font-bold ${evt.crew_assigned ? 'bg-amber-500/20 text-amber-300' : 'text-slate-600'}`}>
                          Crew Dispatched
                        </span>
                        <span className="text-slate-600">→</span>
                        <span className="text-slate-600">On-Site Repair</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Locality: {evt.affected_locality}</span>
                      <span className="text-amber-400 font-bold">
                        Status: {evt.crew_assigned ? 'Crew En Route (ETA 18m)' : 'Pending Dispatch'}
                      </span>
                    </div>

                    {/* Push Consumer Alerts Action */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                      <button
                        onClick={() => handlePushConsumerAlert(evt.affected_locality, 'outage')}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-[10px] font-bold text-amber-300 flex items-center justify-center gap-1 transition"
                      >
                        <Send className="w-3 h-3" />
                        <span>Push Outage Alert</span>
                      </button>

                      <button
                        onClick={() => {
                          energyWs.markResolved(
                            evt.affected_feeder_id.startsWith('feeder_')
                              ? evt.affected_feeder_id.replace('feeder_', 'tx_')
                              : 'tx_yelahanka'
                          );
                          handlePushConsumerAlert(evt.affected_locality, 'restoration');
                        }}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-[10px] font-bold text-emerald-300 flex items-center justify-center gap-1 transition"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Resolve & Restore</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Toast Feedback Notification ── */}
      {alertToast && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-[#091122]/95 border border-cyan-400/40 text-xs font-semibold text-cyan-200 shadow-[0_0_30px_rgba(6,182,212,0.5)] backdrop-blur-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{alertToast}</span>
        </div>
      )}

      {/* ── Feeder Loss Analysis Modal ── */}
      {lossModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-lg rounded-3xl bg-[#091122] border border-blue-500/30 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-cyan-400" />
                Distribution Loss & Commercial Theft Inspection
              </h3>
              <button
                onClick={() => setLossModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 mt-4 max-h-80 overflow-y-auto">
              {feeders.map((f) => (
                <div
                  key={f.id}
                  className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-white">{f.name}</span>
                    <p className="text-[11px] text-slate-400">{f.locality}</p>
                    <span className="text-[10px] text-slate-500">{f.analysis_note}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-cyan-300 block text-sm">
                      {f.total_loss_pct.toFixed(1)}% Loss
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Tech: {f.technical_loss_pct.toFixed(1)}% · Comm: {f.commercial_loss_pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 text-right">
              <button
                onClick={() => setLossModalOpen(false)}
                className="py-2 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EEE Safety & Voltage Limit Thresholds Configuration Modal ── */}
      {showThresholdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#09152D] border border-blue-500/40 p-6 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                Configure EEE Voltage & Flow Safety Limits
              </h3>
              <button
                onClick={() => setShowThresholdModal(false)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <span className="text-slate-300">Minimum Safe Voltage (Sag Floor):</span>
                  <span className="text-cyan-300 font-bold">{eeeThresholds.minVoltageV} V</span>
                </div>
                <input
                  type="range"
                  min="190"
                  max="220"
                  step="1"
                  value={eeeThresholds.minVoltageV}
                  onChange={(e) =>
                    setEeeThresholds((prev) => ({ ...prev, minVoltageV: Number(e.target.value) }))
                  }
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
                <span className="text-[10px] text-slate-500 block">KERC Standard: 230V ± 6% (Floor ~ 216V)</span>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <span className="text-slate-300">Maximum Safe Voltage (Surge Ceiling):</span>
                  <span className="text-cyan-300 font-bold">{eeeThresholds.maxVoltageV} V</span>
                </div>
                <input
                  type="range"
                  min="240"
                  max="265"
                  step="1"
                  value={eeeThresholds.maxVoltageV}
                  onChange={(e) =>
                    setEeeThresholds((prev) => ({ ...prev, maxVoltageV: Number(e.target.value) }))
                  }
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <span className="text-slate-300">Feeder Overload Flow Limit:</span>
                  <span className="text-amber-300 font-bold">{eeeThresholds.maxLoadPct} %</span>
                </div>
                <input
                  type="range"
                  min="70"
                  max="95"
                  step="1"
                  value={eeeThresholds.maxLoadPct}
                  onChange={(e) =>
                    setEeeThresholds((prev) => ({ ...prev, maxLoadPct: Number(e.target.value) }))
                  }
                  className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
                <span className="text-[10px] text-slate-500 block">Feeder thermal rating triggers at &gt;85% sustained draw</span>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <span className="text-slate-300">Max Core Oil Temperature:</span>
                  <span className="text-red-300 font-bold">{eeeThresholds.maxOilTempC} °C</span>
                </div>
                <input
                  type="range"
                  min="65"
                  max="90"
                  step="1"
                  value={eeeThresholds.maxOilTempC}
                  onChange={(e) =>
                    setEeeThresholds((prev) => ({ ...prev, maxOilTempC: Number(e.target.value) }))
                  }
                  className="w-full accent-red-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
                <span className="text-[10px] text-slate-500 block">Insulation breakdown hazard threshold: 85°C</span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() =>
                  setEeeThresholds({
                    minVoltageV: 205.0,
                    maxVoltageV: 248.0,
                    maxLoadPct: 85.0,
                    maxOilTempC: 75.0,
                  })
                }
                className="py-1.5 px-3 rounded-xl text-xs text-slate-400 hover:text-white bg-slate-800/80"
              >
                Reset to KERC Standards
              </button>
              <button
                onClick={() => {
                  setShowThresholdModal(false);
                  setAlertToast('EEE voltage and feeder flow safety limits updated.');
                  setTimeout(() => setAlertToast(null), 3500);
                }}
                className="py-1.5 px-4 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950"
              >
                Apply Thresholds
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default BescomPortal;
