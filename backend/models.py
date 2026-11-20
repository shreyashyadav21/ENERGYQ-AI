from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime

class ApplianceState(BaseModel):
    id: str
    name: str
    room: str
    rated_kw: float
    current_kw: float
    is_on: bool
    is_schedulable: bool = True
    suggested_off_peak: bool = False

class SmartHomeTelemetry(BaseModel):
    consumer_id: str = "BESCOM-IND-4092"
    consumer_name: str = "Aarav Sharma"
    locality: str = "Indiranagar 2nd Stage"
    feeder_id: str = "feeder_indiranagar"
    timestamp: str
    voltage: float = 230.4
    current: float = 14.8
    frequency: float = 50.02
    power_factor: float = 0.96
    total_load_kw: float = 3.42
    solar_generation_kw: float = 2.15
    battery_soc_pct: float = 84.0
    battery_power_kw: float = 0.50  # positive = charging, negative = discharging
    grid_import_kw: float = 1.77
    grid_export_kw: float = 0.0
    daily_consumption_kwh: float = 18.6
    projected_monthly_kwh: float = 540.0
    projected_monthly_bill_inr: float = 3880.0
    grid_status: str = "normal"  # normal, low_voltage, outage, maintenance
    grid_banner_alert: Optional[str] = None
    appliances: List[ApplianceState] = []

class TransformerHealth(BaseModel):
    id: str
    name: str
    locality: str
    feeder_id: str
    rated_capacity_kva: float = 500.0
    active_power_kva: float = 320.0
    load_pct: float = 64.0
    voltage_v: float = 415.0
    oil_temp_c: float = 58.5
    ambient_temp_c: float = 28.0
    winding_temp_c: float = 64.2
    harmonics_thd_pct: float = 3.2
    health_status: str = "optimal"  # optimal, warning, critical, tripped, maintenance
    anomaly_score: float = 0.12
    is_ml_anomaly: bool = False
    maintenance_dispatched: bool = False
    coordinates: List[float] = [77.6412, 12.9784]
    phase_voltages: Dict[str, float] = Field(default_factory=lambda: {"V_R": 230.2, "V_Y": 230.0, "V_B": 229.8})
    phase_currents: Dict[str, float] = Field(default_factory=lambda: {"I_R": 460.5, "I_Y": 458.2, "I_B": 462.1})
    power_factor: float = 0.97
    frequency_hz: float = 50.02
    health_score: float = 95.0
    sensor_source: str = "simulated"
    last_telemetry_time: Optional[str] = None

class FeederMetric(BaseModel):
    id: str
    name: str
    locality: str
    substation: str
    input_power_kva: float
    billed_power_kva: float
    technical_loss_pct: float
    commercial_loss_pct: float
    total_loss_pct: float
    loss_status: str = "normal"  # normal, high, critical_theft

class GridEvent(BaseModel):
    id: str
    event_type: str  # overload_yelahanka, voltage_sag, line_loss, normal
    title: str
    description: str
    affected_locality: str
    affected_feeder_id: str
    severity: str  # low, medium, high, critical
    timestamp: str
    crew_assigned: bool = False
    resolved: bool = False

class MLInsight(BaseModel):
    category: str
    label_type: str = "ML Forecast"  # "ML Forecast" or "Rule Alert"
    title: str
    description: str
    confidence_pct: float
    projected_impact_inr: Optional[float] = None
    recommended_action: str

class TelemetryPayload(BaseModel):
    smart_home: SmartHomeTelemetry
    transformers: List[TransformerHealth]
    feeders: List[FeederMetric]
    active_events: List[GridEvent]
    ml_insights: List[MLInsight]
    demand_forecast_24h: List[Dict[str, Any]]
    system_frequency_hz: float = 50.02

class EventTriggerRequest(BaseModel):
    event_type: str  # overload_yelahanka, voltage_sag, line_loss, restore_normal

class MaintenanceActionRequest(BaseModel):
    transformer_id: str
    action: str  # assign_crew, mark_resolved

class ApplianceToggleRequest(BaseModel):
    appliance_id: str
    state: bool

class VoiceQueryRequest(BaseModel):
    query: str
    language: str = "en"  # en, kn, hi

class VoiceQueryResponse(BaseModel):
    query: str
    language: str
    intent: str
    response_text: str
    audio_base64: Optional[str] = None
    action_executed: Optional[str] = None
    data_payload: Optional[Dict[str, Any]] = None

class SensorIngestPayload(BaseModel):
    transformer_id: str
    phase_voltages: Optional[Dict[str, float]] = None  # V_R, V_Y, V_B
    phase_currents: Optional[Dict[str, float]] = None  # I_R, I_Y, I_B
    voltage_v: Optional[float] = None
    oil_temp_c: Optional[float] = None
    winding_temp_c: Optional[float] = None
    load_percentage: Optional[float] = None
    power_factor: Optional[float] = None
    harmonics_thd: Optional[float] = None
    frequency_hz: Optional[float] = None
    sensor_source: Optional[str] = "hardware_ingest"

class VoiceSTTResponse(BaseModel):
    text: str
    language: str
    confidence: float = 0.95
    source: str = "sarvam_ai"

class VoiceTTSRequest(BaseModel):
    text: str
    language: str = "en"
    speaker: Optional[str] = "meera"

class GridIncidentCreate(BaseModel):
    category: str = Field(min_length=2, max_length=64)
    description: str = Field(min_length=8, max_length=2000)
    locality: str = Field(min_length=2, max_length=128)

    @field_validator("category", "description", "locality")
    @classmethod
    def reject_blank_values(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("This field must not be blank.")
        return normalized

class GridIncidentReply(BaseModel):
    response: str = Field(min_length=3, max_length=2000)
    status: str = "responded"

    @field_validator("response")
    @classmethod
    def reject_blank_response(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Response must not be blank.")
        return normalized
