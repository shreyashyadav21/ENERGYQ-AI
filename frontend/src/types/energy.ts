export interface ApplianceState {
  id: string;
  name: string;
  room: string;
  rated_kw: number;
  current_kw: number;
  is_on: boolean;
  is_schedulable: boolean;
  suggested_off_peak?: boolean;
}

export interface SmartHomeTelemetry {
  consumer_id: string;
  consumer_name: string;
  locality: string;
  feeder_id: string;
  timestamp: string;
  voltage: number;
  current: number;
  frequency: number;
  power_factor: number;
  total_load_kw: number;
  solar_generation_kw: number;
  battery_soc_pct: number;
  battery_power_kw: number; // positive = charging, negative = discharging
  grid_import_kw: number;
  grid_export_kw: number;
  daily_consumption_kwh: number;
  projected_monthly_kwh: number;
  projected_monthly_bill_inr: number;
  grid_status: 'normal' | 'low_voltage' | 'warning' | 'outage' | 'maintenance';
  grid_banner_alert?: string | null;
  appliances: ApplianceState[];
}

export interface TransformerHealth {
  id: string;
  name: string;
  locality: string;
  feeder_id: string;
  rated_capacity_kva: number;
  active_power_kva: number;
  load_pct: number;
  voltage_v: number;
  oil_temp_c: number;
  ambient_temp_c?: number;
  winding_temp_c: number;
  harmonics_thd_pct: number;
  health_status: 'optimal' | 'warning' | 'critical' | 'tripped' | 'maintenance';
  anomaly_score: number;
  is_ml_anomaly: boolean;
  maintenance_dispatched: boolean;
  crew_assigned?: boolean;
  coordinates: [number, number]; // [lng, lat]
  phase_voltages?: { V_R: number; V_Y: number; V_B: number };
  phase_currents?: { I_R: number; I_Y: number; I_B: number };
  power_factor?: number;
  frequency_hz?: number;
  health_score?: number; // 0-100%
  sensor_source?: string;
  last_telemetry_time?: string;
}

export type AuthRole = 'consumer' | 'operator';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: AuthRole;
  meterId?: string;
  locality?: string;
  division?: string;
  accessLevel?: string;
}

export interface GridIncident {
  id: string;
  reporter_ref?: string | null;
  category: string;
  description: string;
  locality: string;
  status: 'open' | 'responded' | 'resolved';
  response?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeederMetric {
  id: string;
  name: string;
  locality: string;
  substation: string;
  input_power_kva: number;
  billed_power_kva: number;
  technical_loss_pct: number;
  commercial_loss_pct: number;
  total_loss_pct: number;
  loss_status: 'normal' | 'high' | 'critical_theft';
  analysis_note?: string;
  label_type?: string;
}

export interface GridEvent {
  id: string;
  event_type: 'overload_yelahanka' | 'voltage_sag' | 'line_loss' | 'restore_normal' | 'normal';
  title: string;
  description: string;
  affected_locality: string;
  affected_feeder_id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  crew_assigned: boolean;
  resolved: boolean;
}

export interface MLInsight {
  category: string;
  label_type: 'ML Forecast' | 'Rule Alert';
  title: string;
  description: string;
  confidence_pct: number;
  projected_impact_inr?: number;
  recommended_action: string;
}

export interface HourlyDemandForecast {
  hour: string;
  hour_int: number;
  is_current: boolean;
  actual_kw: number | null;
  predicted_kw: number;
  confidence_lower_kw: number;
  confidence_upper_kw: number;
  solar_generation_kw: number;
  tariff_type: 'Peak' | 'Off-Peak';
}

export interface TelemetryPayload {
  type: string;
  smart_home: SmartHomeTelemetry;
  transformers: TransformerHealth[];
  feeders: FeederMetric[];
  active_events: GridEvent[];
  ml_insights: MLInsight[];
  demand_forecast_24h: HourlyDemandForecast[];
  system_frequency_hz: number;
  timestamp: string;
}

export type PortalMode = 'consumer' | 'bescom' | 'split';
export type BescomViewMode = '3d' | 'gis';
