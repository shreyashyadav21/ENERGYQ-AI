import { create } from 'zustand';
import {
  TelemetryPayload,
  PortalMode,
  BescomViewMode,
  SmartHomeTelemetry,
  TransformerHealth,
  FeederMetric,
  GridEvent,
  MLInsight,
  HourlyDemandForecast,
  UserSession,
  AuthRole
} from '../types/energy';
import { getDemoUser, signOutSupabase } from '../services/supabase';

const initialAppliances = [
  { id: 'living_room_ac', name: 'Living Room Dual-Inverter AC', room: 'Living Room', rated_kw: 1.85, current_kw: 1.80, is_on: true, is_schedulable: true },
  { id: 'ev_charger', name: 'Level 2 Smart EV Wallbox', room: 'Garage', rated_kw: 3.30, current_kw: 3.25, is_on: true, is_schedulable: true, suggested_off_peak: true },
  { id: 'water_heater', name: 'Heat Pump Water Geyser', room: 'Utility Room', rated_kw: 1.50, current_kw: 0.0, is_on: false, is_schedulable: true },
  { id: 'refrigerator', name: 'Multi-Door Smart Inverter Fridge', room: 'Kitchen', rated_kw: 0.35, current_kw: 0.28, is_on: true, is_schedulable: false },
  { id: 'smart_lights', name: 'Circadian Architectural LED Array', room: 'Whole Home', rated_kw: 0.25, current_kw: 0.22, is_on: true, is_schedulable: false },
];

const initialSmartHome: SmartHomeTelemetry = {
  consumer_id: 'BESCOM-IND-4092',
  consumer_name: 'Aarav Sharma',
  locality: 'Indiranagar 2nd Stage',
  feeder_id: 'feeder_indiranagar',
  timestamp: new Date().toISOString(),
  voltage: 230.4,
  current: 14.8,
  frequency: 50.02,
  power_factor: 0.96,
  total_load_kw: 3.42,
  solar_generation_kw: 2.15,
  battery_soc_pct: 84.0,
  battery_power_kw: 0.50,
  grid_import_kw: 1.77,
  grid_export_kw: 0.0,
  daily_consumption_kwh: 18.6,
  projected_monthly_kwh: 540.0,
  projected_monthly_bill_inr: 3880.0,
  grid_status: 'normal',
  grid_banner_alert: null,
  appliances: initialAppliances,
};

const initialTransformers: TransformerHealth[] = [
  {
    id: 'tx_indiranagar',
    name: 'Indiranagar 11kV/415V DTC-04',
    locality: 'Indiranagar',
    feeder_id: 'feeder_indiranagar',
    rated_capacity_kva: 500.0,
    active_power_kva: 312.0,
    load_pct: 62.4,
    voltage_v: 414.2,
    oil_temp_c: 58.2,
    winding_temp_c: 63.5,
    harmonics_thd_pct: 2.9,
    health_status: 'optimal',
    health_score: 97.5,
    power_factor: 0.98,
    frequency_hz: 50.02,
    phase_voltages: { V_R: 239.5, V_Y: 239.1, V_B: 239.8 },
    phase_currents: { I_R: 435.0, I_Y: 433.2, I_B: 436.5 },
    anomaly_score: 0.12,
    is_ml_anomaly: false,
    maintenance_dispatched: false,
    coordinates: [77.6412, 12.9784],
  },
  {
    id: 'tx_koramangala',
    name: 'Koramangala 4th Block DT-12',
    locality: 'Koramangala',
    feeder_id: 'feeder_koramangala',
    rated_capacity_kva: 630.0,
    active_power_kva: 441.0,
    load_pct: 70.0,
    voltage_v: 412.8,
    oil_temp_c: 62.0,
    winding_temp_c: 67.8,
    harmonics_thd_pct: 3.4,
    health_status: 'optimal',
    health_score: 95.0,
    power_factor: 0.97,
    frequency_hz: 50.01,
    phase_voltages: { V_R: 238.4, V_Y: 238.1, V_B: 238.9 },
    phase_currents: { I_R: 612.4, I_Y: 610.0, I_B: 615.1 },
    anomaly_score: 0.15,
    is_ml_anomaly: false,
    maintenance_dispatched: false,
    coordinates: [77.6245, 12.9352],
  },
  {
    id: 'tx_yelahanka',
    name: 'Yelahanka 66/11kV Substation Power TX-2',
    locality: 'Yelahanka New Town',
    feeder_id: 'feeder_yelahanka',
    rated_capacity_kva: 1000.0,
    active_power_kva: 680.0,
    load_pct: 68.0,
    voltage_v: 415.5,
    oil_temp_c: 61.4,
    winding_temp_c: 68.1,
    harmonics_thd_pct: 3.1,
    health_status: 'optimal',
    health_score: 96.2,
    power_factor: 0.97,
    frequency_hz: 50.02,
    phase_voltages: { V_R: 240.2, V_Y: 239.8, V_B: 240.5 },
    phase_currents: { I_R: 945.0, I_Y: 942.8, I_B: 948.2 },
    anomaly_score: 0.18,
    is_ml_anomaly: false,
    maintenance_dispatched: false,
    coordinates: [77.5963, 13.1007],
  },
  {
    id: 'tx_whitefield',
    name: 'Whitefield ITPL Distribution TX-09',
    locality: 'Whitefield',
    feeder_id: 'feeder_whitefield',
    rated_capacity_kva: 800.0,
    active_power_kva: 544.0,
    load_pct: 68.0,
    voltage_v: 413.0,
    oil_temp_c: 59.5,
    winding_temp_c: 65.2,
    harmonics_thd_pct: 3.8,
    health_status: 'optimal',
    health_score: 94.5,
    power_factor: 0.96,
    frequency_hz: 50.02,
    phase_voltages: { V_R: 238.6, V_Y: 238.2, V_B: 239.0 },
    phase_currents: { I_R: 758.2, I_Y: 755.0, I_B: 762.1 },
    anomaly_score: 0.14,
    is_ml_anomaly: false,
    maintenance_dispatched: false,
    coordinates: [77.7499, 12.9698],
  },
  {
    id: 'tx_jayanagar',
    name: 'Jayanagar 4th Block Distribution TX-08',
    locality: 'Jayanagar',
    feeder_id: 'feeder_jayanagar',
    rated_capacity_kva: 500.0,
    active_power_kva: 295.0,
    load_pct: 59.0,
    voltage_v: 416.0,
    oil_temp_c: 56.0,
    winding_temp_c: 61.2,
    harmonics_thd_pct: 2.5,
    health_status: 'optimal',
    health_score: 98.5,
    power_factor: 0.98,
    frequency_hz: 50.02,
    phase_voltages: { V_R: 240.5, V_Y: 240.2, V_B: 240.8 },
    phase_currents: { I_R: 410.2, I_Y: 408.0, I_B: 412.5 },
    anomaly_score: 0.10,
    is_ml_anomaly: false,
    maintenance_dispatched: false,
    coordinates: [77.5833, 12.9250],
  },
  {
    id: 'tx_hebbal',
    name: 'Hebbal Flyover Substation TX-03',
    locality: 'Hebbal',
    feeder_id: 'feeder_hebbal',
    rated_capacity_kva: 750.0,
    active_power_kva: 480.0,
    load_pct: 64.0,
    voltage_v: 414.0,
    oil_temp_c: 58.0,
    winding_temp_c: 63.8,
    harmonics_thd_pct: 2.8,
    health_status: 'optimal',
    health_score: 97.0,
    power_factor: 0.97,
    frequency_hz: 50.02,
    phase_voltages: { V_R: 239.2, V_Y: 239.0, V_B: 239.5 },
    phase_currents: { I_R: 668.0, I_Y: 665.5, I_B: 670.2 },
    anomaly_score: 0.11,
    is_ml_anomaly: false,
    maintenance_dispatched: false,
    coordinates: [77.5925, 13.0358],
  },
];

const initialFeeders: FeederMetric[] = [
  {
    id: 'feeder_indiranagar',
    name: 'Indiranagar 11kV Feeder',
    locality: 'Indiranagar',
    substation: 'HAL 66/11kV Substation',
    input_power_kva: 480.0,
    billed_power_kva: 461.5,
    technical_loss_pct: 3.2,
    commercial_loss_pct: 0.6,
    total_loss_pct: 3.8,
    loss_status: 'normal',
    analysis_note: 'Technical loss within KERC standards (<5.5%).',
    label_type: 'ML Forecast',
  },
  {
    id: 'feeder_koramangala',
    name: 'Koramangala Commercial 11kV',
    locality: 'Koramangala',
    substation: 'Ejipura 66/11kV Substation',
    input_power_kva: 680.0,
    billed_power_kva: 651.0,
    technical_loss_pct: 3.6,
    commercial_loss_pct: 0.7,
    total_loss_pct: 4.3,
    loss_status: 'normal',
    analysis_note: 'Optimal phase balancing across commercial loads.',
    label_type: 'ML Forecast',
  },
  {
    id: 'feeder_yelahanka',
    name: 'Yelahanka Industrial Express Feeder',
    locality: 'Yelahanka',
    substation: 'Yelahanka 66/11kV Substation',
    input_power_kva: 1050.0,
    billed_power_kva: 995.0,
    technical_loss_pct: 4.1,
    commercial_loss_pct: 1.1,
    total_loss_pct: 5.2,
    loss_status: 'normal',
    analysis_note: 'High capacity feeder supporting North tech zone.',
    label_type: 'ML Forecast',
  },
  {
    id: 'feeder_whitefield',
    name: 'Whitefield Tech Corridor Feeder',
    locality: 'Whitefield',
    substation: 'Hoodi 220/66/11kV Major Substation',
    input_power_kva: 890.0,
    billed_power_kva: 845.0,
    technical_loss_pct: 3.9,
    commercial_loss_pct: 1.2,
    total_loss_pct: 5.1,
    loss_status: 'normal',
    analysis_note: 'Standard transmission loss profile.',
    label_type: 'ML Forecast',
  },
  {
    id: 'feeder_jayanagar',
    name: 'Jayanagar South Distribution Feeder',
    locality: 'Jayanagar',
    substation: 'Jayanagar 66/11kV Substation',
    input_power_kva: 450.0,
    billed_power_kva: 434.0,
    technical_loss_pct: 3.0,
    commercial_loss_pct: 0.5,
    total_loss_pct: 3.5,
    loss_status: 'normal',
    analysis_note: 'Residential South Bengaluru distribution corridor.',
    label_type: 'ML Forecast',
  },
  {
    id: 'feeder_hebbal',
    name: 'Hebbal North Link Feeder',
    locality: 'Hebbal',
    substation: 'Hebbal 66/11kV Substation',
    input_power_kva: 720.0,
    billed_power_kva: 692.0,
    technical_loss_pct: 3.3,
    commercial_loss_pct: 0.6,
    total_loss_pct: 3.9,
    loss_status: 'normal',
    analysis_note: 'North Bengaluru express airport feeder link.',
    label_type: 'ML Forecast',
  },
];

const initialInsights: MLInsight[] = [
  {
    category: 'Bill Optimization',
    label_type: 'ML Forecast',
    title: 'Projected Monthly Bill: ₹3,880',
    description: 'Based on current runtime & solar curve. Solar offset is saving ₹680/month.',
    confidence_pct: 94.2,
    projected_impact_inr: 680,
    recommended_action: 'Maintain off-peak EV schedule to retain Slab 1 benefits.',
  },
  {
    category: 'EV Charging Optimization',
    label_type: 'ML Forecast',
    title: 'Shift EV Fast Charging to 01:00 AM Night Slab',
    description: 'Your EV is charging during peak tariff hours. Scheduling it between 01:00 AM - 05:00 AM saves ₹480/month.',
    confidence_pct: 91.0,
    projected_impact_inr: 480,
    recommended_action: 'Shift charging to off-peak tariff window.',
  },
  {
    category: 'Solar Self-Consumption',
    label_type: 'ML Forecast',
    title: 'Pre-Cool Living Room with Excess Rooftop Solar',
    description: 'Rooftop solar is generating surplus power. Pre-cooling now reduces evening imports by 38%.',
    confidence_pct: 89.5,
    projected_impact_inr: 340,
    recommended_action: 'Run AC at 24°C while solar is high.',
  },
];

const generateInitialDemandCurve = (): HourlyDemandForecast[] => {
  const hours = [
    1.4, 1.3, 1.2, 1.2, 1.5, 2.2, 3.8, 4.5, 4.2, 3.2, 2.8, 2.6,
    2.9, 3.4, 3.2, 3.0, 3.3, 4.1, 5.2, 5.6, 5.4, 4.8, 3.5, 2.1
  ];
  const solar = [
    0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.4, 1.2, 2.2, 3.1, 3.6, 3.8,
    3.7, 3.3, 2.6, 1.5, 0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
  ];
  const curHour = new Date().getHours();

  return hours.map((pred, h) => ({
    hour: `${String(h).padStart(2, '0')}:00`,
    hour_int: h,
    is_current: h === curHour,
    actual_kw: h <= curHour ? Number((pred * 0.98).toFixed(2)) : null,
    predicted_kw: pred,
    confidence_lower_kw: Number((pred * 0.88).toFixed(2)),
    confidence_upper_kw: Number((pred * 1.12).toFixed(2)),
    solar_generation_kw: solar[h],
    tariff_type: (h >= 6 && h <= 10) || (h >= 18 && h <= 22) ? 'Peak' : 'Off-Peak',
  }));
};

interface EnergyStoreState {
  // Navigation & Authentication
  currentPath: string;
  user: UserSession | null;
  authRole: AuthRole | null;
  isAuthenticated: boolean;
  portalMode: PortalMode;
  bescomViewMode: BescomViewMode;

  // Real-time Telemetry
  isConnected: boolean;
  telemetry: TelemetryPayload;
  selectedApplianceId: string | null;
  selectedTransformerId: string | null;
  activeLocality: string;
  eventDrawerOpen: boolean;
  voiceModalOpen: boolean;

  // 3D Camera Controls & Cinematic Fly-Throughs
  cameraTarget: [number, number, number] | null;
  cameraPosition: [number, number, number] | null;
  cameraFlyTimestamp: number;

  // Authentication Actions
  loginAsDemo: (role: AuthRole) => void;
  setUserSession: (session: UserSession | null) => void;
  logout: () => void;
  navigate: (path: string) => void;

  // Portal & View Actions
  setPortalMode: (mode: PortalMode) => void;
  setBescomViewMode: (mode: BescomViewMode) => void;
  setIsConnected: (connected: boolean) => void;
  setTelemetry: (payload: TelemetryPayload) => void;
  setSelectedApplianceId: (id: string | null) => void;
  setSelectedTransformerId: (id: string | null) => void;
  setActiveLocality: (locality: string) => void;
  setEventDrawerOpen: (open: boolean) => void;
  setVoiceModalOpen: (open: boolean) => void;

  // Camera Fly-Through Trigger
  flyToAsset: (pos: [number, number, number], target?: [number, number, number]) => void;
  setCameraTarget: (target: [number, number, number]) => void;

  // Control Actions
  toggleApplianceLocal: (id: string, state: boolean) => void;
  assignCrewLocal: (transformerId: string) => void;
  markResolvedLocal: (transformerId: string) => void;
}

// Load saved session from localStorage if present
const getSavedUser = (): UserSession | null => {
  try {
    const raw = localStorage.getItem('energyq_user_session');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const initialSavedUser = getSavedUser();
const initialSavedRole: AuthRole | null = initialSavedUser?.role || (localStorage.getItem('energyq_auth_role') as AuthRole | null);
const initialPath = window.location.pathname || '/';

export const useEnergyStore = create<EnergyStoreState>((set) => ({
  currentPath: initialPath,
  user: initialSavedUser,
  authRole: initialSavedRole,
  isAuthenticated: Boolean(initialSavedUser),
  portalMode: initialSavedRole === 'operator' ? 'bescom' : 'consumer',
  bescomViewMode: '3d',
  isConnected: false,
  telemetry: {
    type: 'TELEMETRY_UPDATE',
    smart_home: initialSmartHome,
    transformers: initialTransformers,
    feeders: initialFeeders,
    active_events: [],
    ml_insights: initialInsights,
    demand_forecast_24h: generateInitialDemandCurve(),
    system_frequency_hz: 50.02,
    timestamp: new Date().toISOString(),
  },
  selectedApplianceId: null,
  selectedTransformerId: null,
  activeLocality: 'Indiranagar',
  eventDrawerOpen: false,
  voiceModalOpen: false,
  cameraTarget: null,
  cameraPosition: null,
  cameraFlyTimestamp: 0,

  navigate: (path: string) => {
    window.history.pushState({}, '', path);
    set({ currentPath: path });
  },

  loginAsDemo: (role: AuthRole) => {
    void signOutSupabase().catch((error) => console.error('Could not clear previous authenticated session:', error));
    const demoUser = getDemoUser(role);
    try {
      localStorage.setItem('energyq_user_session', JSON.stringify(demoUser));
      localStorage.setItem('energyq_auth_role', role);
    } catch {}

    const targetPortal: PortalMode = role === 'consumer' ? 'consumer' : 'bescom';
    const targetPath = role === 'consumer' ? '/consumer' : '/operator';

    window.history.pushState({}, '', targetPath);
    set({
      user: demoUser,
      authRole: role,
      isAuthenticated: true,
      portalMode: targetPortal,
      currentPath: targetPath,
    });
  },

  setUserSession: (session: UserSession | null) => {
    if (session) {
      try {
        localStorage.setItem('energyq_user_session', JSON.stringify(session));
        localStorage.setItem('energyq_auth_role', session.role);
      } catch {}
      const targetPortal: PortalMode = session.role === 'consumer' ? 'consumer' : 'bescom';
      const targetPath = session.role === 'consumer' ? '/consumer' : '/operator';
      window.history.pushState({}, '', targetPath);
      set({
        user: session,
        authRole: session.role,
        isAuthenticated: true,
        portalMode: targetPortal,
        currentPath: targetPath,
      });
    } else {
      try {
        localStorage.removeItem('energyq_user_session');
        localStorage.removeItem('energyq_auth_role');
      } catch {}
      window.history.pushState({}, '', '/');
      set({
        user: null,
        authRole: null,
        isAuthenticated: false,
        currentPath: '/',
      });
    }
  },

  logout: () => {
    void signOutSupabase().catch((error) => console.error('Could not clear authenticated session:', error));
    try {
      localStorage.removeItem('energyq_user_session');
      localStorage.removeItem('energyq_auth_role');
    } catch {}
    window.history.pushState({}, '', '/');
    set({
      user: null,
      authRole: null,
      isAuthenticated: false,
      currentPath: '/',
    });
  },

  setPortalMode: (mode) => set({ portalMode: mode }),
  setBescomViewMode: (mode) => set({ bescomViewMode: mode }),
  setIsConnected: (connected) => set({ isConnected: connected }),
  setTelemetry: (payload) => set({ telemetry: payload }),
  setSelectedApplianceId: (id) => set({ selectedApplianceId: id }),
  setSelectedTransformerId: (id) => set({ selectedTransformerId: id }),
  setActiveLocality: (locality) => set({ activeLocality: locality }),
  setEventDrawerOpen: (open) => set({ eventDrawerOpen: open }),
  setVoiceModalOpen: (open) => set({ voiceModalOpen: open }),

  flyToAsset: (pos, target) => {
    set({
      cameraPosition: pos,
      cameraTarget: target || [pos[0], 0, pos[2]],
      cameraFlyTimestamp: Date.now(),
    });
  },

  setCameraTarget: (target) => {
    set({
      cameraTarget: target,
      cameraPosition: [target[0] + 3, target[1] + 2.5, target[2] + 4],
      cameraFlyTimestamp: Date.now(),
    });
  },

  toggleApplianceLocal: (id, state) =>
    set((s) => {
      const appliances = s.telemetry.smart_home.appliances.map((app) => {
        if (app.id === id) {
          return { ...app, is_on: state, current_kw: state ? app.rated_kw : 0 };
        }
        return app;
      });
      const activeKw = appliances.reduce((sum, a) => sum + (a.is_on ? a.current_kw : 0), 0);
      const totalLoad = Number((activeKw + 0.45).toFixed(2));
      const current = Number(((totalLoad * 1000) / s.telemetry.smart_home.voltage).toFixed(2));

      return {
        telemetry: {
          ...s.telemetry,
          smart_home: {
            ...s.telemetry.smart_home,
            appliances,
            total_load_kw: totalLoad,
            current,
          },
        },
      };
    }),

  assignCrewLocal: (transformerId) =>
    set((s) => ({
      telemetry: {
        ...s.telemetry,
        transformers: s.telemetry.transformers.map((tx) =>
          tx.id === transformerId ? { ...tx, maintenance_dispatched: true, health_status: 'maintenance' } : tx
        ),
        active_events: s.telemetry.active_events.map((evt) => ({ ...evt, crew_assigned: true })),
        smart_home: {
          ...s.telemetry.smart_home,
          grid_banner_alert: 'BESCOM Advisory: Field maintenance crew dispatched to feeder. Grid stabilization in progress.',
        },
      },
    })),

  markResolvedLocal: (transformerId) =>
    set((s) => ({
      telemetry: {
        ...s.telemetry,
        transformers: s.telemetry.transformers.map((tx) =>
          tx.id === transformerId
            ? { ...tx, maintenance_dispatched: false, health_status: 'optimal', load_pct: 64.0, oil_temp_c: 58.0, health_score: 96.5, is_ml_anomaly: false }
            : tx
        ),
        active_events: [],
        smart_home: {
          ...s.telemetry.smart_home,
          grid_status: 'normal',
          grid_banner_alert: null,
          voltage: 230.2,
        },
      },
    })),
}));
