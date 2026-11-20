import os
import asyncio
import time
import math
import random
import json
from datetime import datetime
from typing import Dict, List, Any, Callable, Set, Optional

from models import (
    SmartHomeTelemetry, ApplianceState, TransformerHealth,
    FeederMetric, GridEvent, MLInsight, TelemetryPayload,
    SensorIngestPayload
)
from ml_engine import ml_engine

try:
    import paho.mqtt.client as mqtt
    PAHO_AVAILABLE = True
except ImportError:
    PAHO_AVAILABLE = False


class GridSimulator:
    """
    Real-Time Multi-Sensor IoT Simulator for ENERGYQ AI
    Streams realistic telemetry every 1.0s via WebSockets and MQTT.
    Computes real-time transformer health scores (0-100%) and accepts hardware telemetry.
    """

    def __init__(self):
        self.listeners: Set[Callable[[Dict[str, Any]], None]] = set()
        self.is_running = False

        # Grid event state
        self.active_event_type = "normal"
        self.event_crew_dispatched = False
        self.event_start_time = 0.0

        # Smart home appliances
        self.appliances: Dict[str, ApplianceState] = {
            "living_room_ac": ApplianceState(
                id="living_room_ac",
                name="Living Room Dual-Inverter AC",
                room="Living Room",
                rated_kw=1.85,
                current_kw=1.80,
                is_on=True,
                is_schedulable=True
            ),
            "ev_charger": ApplianceState(
                id="ev_charger",
                name="Level 2 Smart EV Wallbox",
                room="Garage",
                rated_kw=3.30,
                current_kw=3.25,
                is_on=True,
                is_schedulable=True,
                suggested_off_peak=True
            ),
            "water_heater": ApplianceState(
                id="water_heater",
                name="Heat Pump Water Geyser",
                room="Utility Room",
                rated_kw=1.50,
                current_kw=1.45,
                is_on=False,
                is_schedulable=True
            ),
            "refrigerator": ApplianceState(
                id="refrigerator",
                name="Multi-Door Smart Inverter Fridge",
                room="Kitchen",
                rated_kw=0.35,
                current_kw=0.28,
                is_on=True,
                is_schedulable=False
            ),
            "smart_lights": ApplianceState(
                id="smart_lights",
                name="Circadian Architectural LED Array",
                room="Whole Home",
                rated_kw=0.25,
                current_kw=0.22,
                is_on=True,
                is_schedulable=False
            )
        }

        # Multi-Sensor Transformers across Greater Bengaluru (Indiranagar, Koramangala, Yelahanka, Whitefield, Jayanagar, Hebbal)
        self.transformers: Dict[str, TransformerHealth] = {
            "tx_indiranagar": TransformerHealth(
                id="tx_indiranagar",
                name="Indiranagar 11kV/415V DTC-04",
                locality="Indiranagar",
                feeder_id="feeder_indiranagar",
                rated_capacity_kva=500.0,
                active_power_kva=312.0,
                load_pct=62.4,
                voltage_v=414.2,
                oil_temp_c=58.2,
                winding_temp_c=63.5,
                harmonics_thd_pct=2.9,
                health_status="optimal",
                health_score=97.5,
                power_factor=0.98,
                frequency_hz=50.02,
                phase_voltages={"V_R": 239.5, "V_Y": 239.1, "V_B": 239.8},
                phase_currents={"I_R": 435.0, "I_Y": 433.2, "I_B": 436.5},
                coordinates=[77.6412, 12.9784]
            ),
            "tx_koramangala": TransformerHealth(
                id="tx_koramangala",
                name="Koramangala 4th Block DT-12",
                locality="Koramangala",
                feeder_id="feeder_koramangala",
                rated_capacity_kva=630.0,
                active_power_kva=441.0,
                load_pct=70.0,
                voltage_v=412.8,
                oil_temp_c=62.0,
                winding_temp_c=67.8,
                harmonics_thd_pct=3.4,
                health_status="optimal",
                health_score=95.0,
                power_factor=0.97,
                frequency_hz=50.01,
                phase_voltages={"V_R": 238.4, "V_Y": 238.1, "V_B": 238.9},
                phase_currents={"I_R": 612.4, "I_Y": 610.0, "I_B": 615.1},
                coordinates=[77.6245, 12.9352]
            ),
            "tx_yelahanka": TransformerHealth(
                id="tx_yelahanka",
                name="Yelahanka 66/11kV Substation Power TX-2",
                locality="Yelahanka New Town",
                feeder_id="feeder_yelahanka",
                rated_capacity_kva=1000.0,
                active_power_kva=680.0,
                load_pct=68.0,
                voltage_v=415.5,
                oil_temp_c=61.4,
                winding_temp_c=68.1,
                harmonics_thd_pct=3.1,
                health_status="optimal",
                health_score=96.2,
                power_factor=0.97,
                frequency_hz=50.02,
                phase_voltages={"V_R": 240.2, "V_Y": 239.8, "V_B": 240.5},
                phase_currents={"I_R": 945.0, "I_Y": 942.8, "I_B": 948.2},
                coordinates=[77.5963, 13.1007]
            ),
            "tx_whitefield": TransformerHealth(
                id="tx_whitefield",
                name="Whitefield ITPL Distribution TX-09",
                locality="Whitefield",
                feeder_id="feeder_whitefield",
                rated_capacity_kva=800.0,
                active_power_kva=544.0,
                load_pct=68.0,
                voltage_v=413.0,
                oil_temp_c=59.5,
                winding_temp_c=65.2,
                harmonics_thd_pct=3.8,
                health_status="optimal",
                health_score=94.5,
                power_factor=0.96,
                frequency_hz=50.02,
                phase_voltages={"V_R": 238.6, "V_Y": 238.2, "V_B": 239.0},
                phase_currents={"I_R": 758.2, "I_Y": 755.0, "I_B": 762.1},
                coordinates=[77.7499, 12.9698]
            ),
            "tx_jayanagar": TransformerHealth(
                id="tx_jayanagar",
                name="Jayanagar 4th Block Distribution TX-08",
                locality="Jayanagar",
                feeder_id="feeder_jayanagar",
                rated_capacity_kva=500.0,
                active_power_kva=295.0,
                load_pct=59.0,
                voltage_v=416.0,
                oil_temp_c=56.0,
                winding_temp_c=61.2,
                harmonics_thd_pct=2.5,
                health_status="optimal",
                health_score=98.5,
                power_factor=0.98,
                frequency_hz=50.02,
                phase_voltages={"V_R": 240.5, "V_Y": 240.2, "V_B": 240.8},
                phase_currents={"I_R": 410.2, "I_Y": 408.0, "I_B": 412.5},
                coordinates=[77.5833, 12.9250]
            ),
            "tx_hebbal": TransformerHealth(
                id="tx_hebbal",
                name="Hebbal Flyover Substation TX-03",
                locality="Hebbal",
                feeder_id="feeder_hebbal",
                rated_capacity_kva=750.0,
                active_power_kva=480.0,
                load_pct=64.0,
                voltage_v=414.0,
                oil_temp_c=58.0,
                winding_temp_c=63.8,
                harmonics_thd_pct=2.8,
                health_status="optimal",
                health_score=97.0,
                power_factor=0.97,
                frequency_hz=50.02,
                phase_voltages={"V_R": 239.2, "V_Y": 239.0, "V_B": 239.5},
                phase_currents={"I_R": 668.0, "I_Y": 665.5, "I_B": 670.2},
                coordinates=[77.5925, 13.0358]
            )
        }

        # Feeder metrics across 6 sectors
        self.feeders: Dict[str, FeederMetric] = {
            "feeder_indiranagar": FeederMetric(
                id="feeder_indiranagar",
                name="Indiranagar 11kV Feeder",
                locality="Indiranagar",
                substation="HAL 66/11kV Substation",
                input_power_kva=480.0,
                billed_power_kva=461.5,
                technical_loss_pct=3.2,
                commercial_loss_pct=0.6,
                total_loss_pct=3.8,
                loss_status="normal"
            ),
            "feeder_koramangala": FeederMetric(
                id="feeder_koramangala",
                name="Koramangala Commercial 11kV",
                locality="Koramangala",
                substation="Ejipura 66/11kV Substation",
                input_power_kva=680.0,
                billed_power_kva=651.0,
                technical_loss_pct=3.6,
                commercial_loss_pct=0.7,
                total_loss_pct=4.3,
                loss_status="normal"
            ),
            "feeder_yelahanka": FeederMetric(
                id="feeder_yelahanka",
                name="Yelahanka Industrial Express Feeder",
                locality="Yelahanka",
                substation="Yelahanka 66/11kV Substation",
                input_power_kva=1050.0,
                billed_power_kva=995.0,
                technical_loss_pct=4.1,
                commercial_loss_pct=1.1,
                total_loss_pct=5.2,
                loss_status="normal"
            ),
            "feeder_whitefield": FeederMetric(
                id="feeder_whitefield",
                name="Whitefield Tech Corridor Feeder",
                locality="Whitefield",
                substation="Hoodi 220/66/11kV Major Substation",
                input_power_kva=890.0,
                billed_power_kva=845.0,
                technical_loss_pct=3.9,
                commercial_loss_pct=1.2,
                total_loss_pct=5.1,
                loss_status="normal"
            ),
            "feeder_jayanagar": FeederMetric(
                id="feeder_jayanagar",
                name="Jayanagar South Distribution Feeder",
                locality="Jayanagar",
                substation="Jayanagar 66/11kV Substation",
                input_power_kva=450.0,
                billed_power_kva=434.0,
                technical_loss_pct=3.0,
                commercial_loss_pct=0.5,
                total_loss_pct=3.5,
                loss_status="normal"
            ),
            "feeder_hebbal": FeederMetric(
                id="feeder_hebbal",
                name="Hebbal North Link Feeder",
                locality="Hebbal",
                substation="Hebbal 66/11kV Substation",
                input_power_kva=720.0,
                billed_power_kva=692.0,
                technical_loss_pct=3.3,
                commercial_loss_pct=0.6,
                total_loss_pct=3.9,
                loss_status="normal"
            )
        }

        # Energy metrics accumulator
        self.step_counter = 0
        self.base_solar_peak_kw = 3.6
        self.battery_soc_pct = 82.0

        # Optional MQTT setup
        self.mqtt_client = None
        self._setup_mqtt()

    def _setup_mqtt(self):
        if not PAHO_AVAILABLE:
            return
        broker = os.getenv("MQTT_BROKER_HOST", "").strip()
        if not broker or broker.lower() in ("none", "false", "disabled"):
            return
        try:
            try:
                self.mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="energyq_sim_engine")
            except AttributeError:
                self.mqtt_client = mqtt.Client(client_id="energyq_sim_engine")

            self.mqtt_client.on_message = self._on_mqtt_message
            port = int(os.getenv("MQTT_BROKER_PORT", "1883"))
            self.mqtt_client.connect_async(broker, port, 60)
            self.mqtt_client.loop_start()
            if hasattr(self.mqtt_client, "_thread") and self.mqtt_client._thread:
                self.mqtt_client._thread.daemon = True
            self.mqtt_client.subscribe("energyq/sensors/+/telemetry")
            print(f"[Simulator] MQTT client connected asynchronously to {broker}:{port}")
        except Exception as e:
            print(f"[Simulator] MQTT broker unreachable ({e}); continuing in standalone in-memory mode.")
            self.mqtt_client = None

    def _on_mqtt_message(self, client, userdata, msg):
        try:
            payload_dict = json.loads(msg.payload.decode())
            ingest_req = SensorIngestPayload(**payload_dict)
            self.ingest_sensor_packet(ingest_req)
        except Exception as err:
            print(f"[Simulator MQTT] Message error on {msg.topic}: {err}")

    def register_listener(self, callback: Callable[[Dict[str, Any]], None]):
        self.listeners.add(callback)

    def unregister_listener(self, callback: Callable[[Dict[str, Any]], None]):
        self.listeners.discard(callback)

    def trigger_event(self, event_type: str):
        """Simulate Grid Event triggers"""
        print(f"[Simulator] Triggering event: {event_type}")
        self.active_event_type = event_type
        self.event_crew_dispatched = False
        self.event_start_time = time.time()

        if event_type == "restore_normal":
            self.active_event_type = "normal"
            for tx in self.transformers.values():
                tx.health_status = "optimal"
                tx.load_pct = random.uniform(58.0, 68.0)
                tx.oil_temp_c = random.uniform(55.0, 62.0)
                tx.winding_temp_c = tx.oil_temp_c + 5.5
                tx.maintenance_dispatched = False
                tx.is_ml_anomaly = False
                tx.health_score = 96.0

            # Reset feeders
            for f in self.feeders.values():
                f.total_loss_pct = random.uniform(3.5, 4.8)
                f.loss_status = "normal"

        elif event_type == "shed_load_yelahanka":
            self.active_event_type = "normal"
            tx = self.transformers.get("tx_yelahanka")
            if tx:
                tx.load_pct = 62.4
                tx.active_power_kva = 624.0
                tx.oil_temp_c = 61.2
                tx.winding_temp_c = 67.0
                tx.harmonics_thd_pct = 2.8
                tx.voltage_v = 412.0
                tx.power_factor = 0.96
                tx.phase_voltages = {"V_R": 229.8, "V_Y": 230.1, "V_B": 230.4}
                tx.phase_currents = {"I_R": 460.5, "I_Y": 458.2, "I_B": 462.1}
                tx.is_ml_anomaly = False
                tx.health_status = "optimal"
                tx.health_score = 95.0
            print("[Simulator] Emergency load shed executed on Yelahanka feeder.")

        elif event_type == "trip_breaker_yelahanka":
            self.active_event_type = "normal"
            tx = self.transformers.get("tx_yelahanka")
            if tx:
                tx.load_pct = 0.0
                tx.active_power_kva = 0.0
                tx.oil_temp_c = 52.0
                tx.winding_temp_c = 54.0
                tx.harmonics_thd_pct = 0.5
                tx.voltage_v = 0.0
                tx.power_factor = 1.0
                tx.phase_voltages = {"V_R": 0.0, "V_Y": 0.0, "V_B": 0.0}
                tx.phase_currents = {"I_R": 0.0, "I_Y": 0.0, "I_B": 0.0}
                tx.is_ml_anomaly = False
                tx.health_status = "tripped"
                tx.health_score = 50.0
            print("[Simulator] Feeder breaker VCB-04 tripped. Section isolated.")

    def set_maintenance_action(self, transformer_id: str, action: str):
        """Assign maintenance crew or mark resolved"""
        tx = self.transformers.get(transformer_id)
        if not tx:
            return

        if action == "assign_crew":
            self.event_crew_dispatched = True
            tx.maintenance_dispatched = True
            tx.health_status = "maintenance"
            print(f"[Simulator] Crew assigned to {transformer_id}")
        elif action == "mark_resolved":
            self.event_crew_dispatched = False
            self.active_event_type = "normal"
            tx.maintenance_dispatched = False
            tx.health_status = "optimal"
            tx.load_pct = 64.0
            tx.oil_temp_c = 58.0
            tx.winding_temp_c = 63.5
            tx.health_score = 96.5
            tx.is_ml_anomaly = False
            print(f"[Simulator] Event marked resolved for {transformer_id}")

    def toggle_appliance(self, appliance_id: str, state: bool):
        """Toggle smart home appliance ON/OFF"""
        app = self.appliances.get(appliance_id)
        if app:
            app.is_on = state
            app.current_kw = app.rated_kw if state else 0.0
            print(f"[Simulator] Appliance {appliance_id} toggled to {state} ({app.current_kw} kW)")

    def ingest_sensor_packet(self, payload: SensorIngestPayload) -> Dict[str, Any]:
        """Hardware-ready ingestion endpoint for real ESP32/IoT sensors or external APIs"""
        tx = self.transformers.get(payload.transformer_id)
        if not tx:
            return {"status": "error", "detail": f"Transformer {payload.transformer_id} not registered."}

        if payload.voltage_v is not None:
            tx.voltage_v = payload.voltage_v
        if payload.oil_temp_c is not None:
            tx.oil_temp_c = payload.oil_temp_c
        if payload.winding_temp_c is not None:
            tx.winding_temp_c = payload.winding_temp_c
        if payload.load_percentage is not None:
            tx.load_pct = payload.load_percentage
        if payload.power_factor is not None:
            tx.power_factor = payload.power_factor
        if payload.harmonics_thd is not None:
            tx.harmonics_thd_pct = payload.harmonics_thd
        if payload.frequency_hz is not None:
            tx.frequency_hz = payload.frequency_hz
        if payload.phase_voltages is not None:
            tx.phase_voltages = payload.phase_voltages
        if payload.phase_currents is not None:
            tx.phase_currents = payload.phase_currents

        tx.sensor_source = payload.sensor_source or "hardware_ingest"
        tx.last_telemetry_time = datetime.now().isoformat()

        # Recalculate health index immediately
        anom_res = ml_engine.detect_transformer_anomaly(tx.model_dump())
        tx.health_score = anom_res["health_score"]
        tx.anomaly_score = anom_res["anomaly_score"]
        tx.is_ml_anomaly = anom_res["is_anomaly"]
        if not tx.maintenance_dispatched:
            tx.health_status = anom_res["severity"]

        return {
            "status": "success",
            "transformer_id": tx.id,
            "health_score": tx.health_score,
            "health_status": tx.health_status,
            "is_ml_anomaly": tx.is_ml_anomaly,
            "sensor_source": tx.sensor_source,
            "timestamp": tx.last_telemetry_time
        }

    def generate_current_state(self) -> Dict[str, Any]:
        """Produce synchronized multi-sensor state payload for consumer and utility portals"""
        self.step_counter += 1
        t = time.time()

        # 1. Base home appliance load
        active_appliance_kw = sum(a.current_kw for a in self.appliances.values() if a.is_on)
        baseload_kw = 0.45 + 0.05 * math.sin(t * 0.1)
        total_load_kw = round(active_appliance_kw + baseload_kw, 2)

        # 2. Solar generation curve (peaks midday)
        solar_gen_kw = round(max(0.0, self.base_solar_peak_kw * 0.65 + 0.3 * math.sin(t * 0.05)), 2)

        # 3. Battery logic
        battery_flow_kw = 0.0
        if solar_gen_kw > total_load_kw:
            surplus = solar_gen_kw - total_load_kw
            battery_flow_kw = round(min(1.5, surplus), 2)
            self.battery_soc_pct = min(100.0, self.battery_soc_pct + 0.05)
            grid_import_kw = 0.0
            grid_export_kw = round(surplus - battery_flow_kw, 2)
        else:
            deficit = total_load_kw - solar_gen_kw
            if self.battery_soc_pct > 20.0:
                battery_flow_kw = round(-min(1.2, deficit * 0.5), 2)
                self.battery_soc_pct = max(15.0, self.battery_soc_pct - 0.03)
                grid_import_kw = round(deficit + battery_flow_kw, 2)
            else:
                battery_flow_kw = 0.0
                grid_import_kw = round(deficit, 2)
            grid_export_kw = 0.0

        # 4. Grid Voltage & Frequency fluctuations
        nominal_v = 230.0
        voltage_fluctuation = random.gauss(0, 1.2)
        home_voltage = round(nominal_v + voltage_fluctuation, 1)
        system_frequency_hz = round(50.0 + 0.02 * math.sin(t * 0.2) + random.uniform(-0.01, 0.01), 2)

        consumer_grid_status = "normal"
        consumer_banner = None

        # 5. Fault Injection Modifications
        events_list: List[GridEvent] = []

        if self.active_event_type == "overload_yelahanka":
            tx = self.transformers.get("tx_yelahanka")
            if tx:
                tx.load_pct = 98.4
                tx.active_power_kva = 984.0
                tx.oil_temp_c = 91.5
                tx.winding_temp_c = 104.2
                tx.harmonics_thd_pct = 7.8
                tx.voltage_v = 388.0
                tx.power_factor = 0.88
                tx.frequency_hz = round(system_frequency_hz - 0.12, 2)
                tx.phase_voltages = {"V_R": 218.4, "V_Y": 212.1, "V_B": 222.0}
                tx.phase_currents = {"I_R": 1420.5, "I_Y": 1450.2, "I_B": 1390.8}
                tx.is_ml_anomaly = True
                tx.health_status = "maintenance" if self.event_crew_dispatched else "critical"

            events_list.append(GridEvent(
                id="evt_tx_overload_01",
                event_type="overload_yelahanka",
                title="Critical Transformer Overload — Yelahanka Feeder",
                description="Power TX-2 reached 98.4% capacity. Thermal runaway alert: Oil temp at 91.5°C. Automated shed sequence queued.",
                affected_locality="Yelahanka New Town",
                affected_feeder_id="feeder_yelahanka",
                severity="critical",
                timestamp=datetime.now().strftime("%H:%M:%S"),
                crew_assigned=self.event_crew_dispatched,
                resolved=False
            ))

            consumer_grid_status = "warning"
            if self.event_crew_dispatched:
                consumer_banner = "BESCOM Advisory: Field maintenance crew dispatched to Yelahanka Feeder. Grid stabilization in progress."
            else:
                consumer_banner = "BESCOM Feeder Alert: High thermal load on North Bengaluru feeder. Automated load balancing active."

        elif self.active_event_type == "voltage_sag":
            home_voltage = round(194.5 + random.uniform(-2, 2), 1)
            for tx in self.transformers.values():
                tx.voltage_v = 368.0
                v_step = 368.0 / 1.732
                tx.phase_voltages = {
                    "V_R": round(v_step - 2.5, 1),
                    "V_Y": round(v_step, 1),
                    "V_B": round(v_step + 2.0, 1)
                }
                tx.health_status = "warning"

            events_list.append(GridEvent(
                id="evt_volt_sag_02",
                event_type="voltage_sag",
                title="System-Wide Voltage Sag (-15.4%)",
                description="Grid voltage dropped to 194V due to transmission line trip on Hoodi 220kV bus.",
                affected_locality="Greater Bengaluru Urban",
                affected_feeder_id="all_feeders",
                severity="high",
                timestamp=datetime.now().strftime("%H:%M:%S"),
                crew_assigned=self.event_crew_dispatched,
                resolved=False
            ))
            consumer_grid_status = "low_voltage"
            consumer_banner = "Grid Voltage Sag Detected: 194V (Standard: 230V). Smart inverters safeguarding sensitive appliances."

        elif self.active_event_type == "line_loss":
            f_whitefield = self.feeders.get("feeder_whitefield")
            if f_whitefield:
                f_whitefield.input_power_kva = 950.0
                f_whitefield.billed_power_kva = 812.0
                f_whitefield.total_loss_pct = 14.5
                f_whitefield.commercial_loss_pct = 9.8
                f_whitefield.loss_status = "critical_theft"

            events_list.append(GridEvent(
                id="evt_loss_theft_03",
                event_type="line_loss",
                title="Feeder Distribution Discrepancy (14.5% Loss)",
                description="Commercial loss surge detected in Whitefield ITPL sector. Suspected illegal bypass or smart meter communication loss.",
                affected_locality="Whitefield",
                affected_feeder_id="feeder_whitefield",
                severity="medium",
                timestamp=datetime.now().strftime("%H:%M:%S"),
                crew_assigned=self.event_crew_dispatched,
                resolved=False
            ))

        # 6. ML & Multi-Sensor Health Evaluations
        home_current = round(total_load_kw * 1000.0 / max(100.0, home_voltage), 2)
        active_count = sum(1 for a in self.appliances.values() if a.is_on)

        bill_prediction = ml_engine.predict_bill(
            daily_consumption_kwh=18.5,
            solar_generation_kw=solar_gen_kw,
            active_appliances=active_count,
            peak_kw=total_load_kw
        )

        # Update each transformer with realistic sensor oscillations and compute continuous health score
        for tx in self.transformers.values():
            if not (self.active_event_type == "overload_yelahanka" and tx.id == "tx_yelahanka"):
                tx.load_pct = round(60.0 + 8.0 * math.sin(t * 0.05 + hash(tx.id) % 10), 1)
                tx.oil_temp_c = round(56.0 + 3.0 * math.sin(t * 0.03 + hash(tx.id) % 7), 1)
                tx.winding_temp_c = round(tx.oil_temp_c + 5.5, 1)
                tx.voltage_v = round(415.0 + random.uniform(-2.0, 2.0), 1)
                tx.harmonics_thd_pct = round(2.8 + random.uniform(-0.2, 0.3), 1)
                tx.power_factor = round(0.97 + random.uniform(-0.01, 0.01), 2)
                tx.frequency_hz = system_frequency_hz

                v_step = tx.voltage_v / 1.732
                tx.phase_voltages = {
                    "V_R": round(v_step + random.uniform(-0.6, 0.6), 1),
                    "V_Y": round(v_step + random.uniform(-0.6, 0.6), 1),
                    "V_B": round(v_step + random.uniform(-0.6, 0.6), 1),
                }
                i_nom = (tx.rated_capacity_kva * 1000.0) / (math.sqrt(3) * tx.voltage_v) * (tx.load_pct / 100.0)
                tx.phase_currents = {
                    "I_R": round(i_nom + random.uniform(-2.0, 2.0), 1),
                    "I_Y": round(i_nom + random.uniform(-2.0, 2.0), 1),
                    "I_B": round(i_nom + random.uniform(-2.0, 2.0), 1),
                }

            # Evaluate with ML & physics-based sensor health pipeline
            anom_res = ml_engine.detect_transformer_anomaly(tx.model_dump())
            tx.anomaly_score = anom_res["anomaly_score"]
            tx.is_ml_anomaly = anom_res["is_anomaly"]
            tx.health_score = anom_res.get("health_score", 95.0)
            tx.last_telemetry_time = datetime.now().isoformat()

            if not tx.maintenance_dispatched:
                tx.health_status = anom_res["severity"]

        # ML Loss Detection
        feeder_analysis = ml_engine.detect_distribution_loss([f.model_dump() for f in self.feeders.values()])

        # ML 24h Demand Forecast
        current_hour = datetime.now().hour
        demand_24h = ml_engine.forecast_24h_demand(current_hour=current_hour, current_kw=total_load_kw)

        # AI Recommendations
        recommendations = ml_engine.generate_energy_recommendations(
            appliances=[a.model_dump() for a in self.appliances.values()],
            solar_kw=solar_gen_kw,
            battery_soc=self.battery_soc_pct
        )

        ml_insights = [
            MLInsight(
                category="Bill Optimization",
                label_type="ML Forecast",
                title=f"Projected Monthly Bill: ₹{bill_prediction['projected_monthly_bill_inr']:.0f}",
                description=f"Based on current runtime & solar curve. Solar offset is saving ₹{bill_prediction['monthly_solar_savings_inr']:.0f}/month.",
                confidence_pct=94.2,
                projected_impact_inr=bill_prediction['monthly_solar_savings_inr'],
                recommended_action="Maintain off-peak EV schedule to retain Slab 1 benefits."
            )
        ]

        for rec in recommendations:
            ml_insights.append(MLInsight(
                category=rec["category"],
                label_type=rec["label_type"],
                title=rec["title"],
                description=rec["description"],
                confidence_pct=91.0,
                projected_impact_inr=rec.get("estimated_monthly_savings_inr"),
                recommended_action=rec["description"]
            ))

        smart_home_payload = SmartHomeTelemetry(
            consumer_id="BESCOM-IND-4092",
            consumer_name="Aarav Sharma",
            locality="Indiranagar 2nd Stage",
            feeder_id="feeder_indiranagar",
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            voltage=home_voltage,
            current=home_current,
            frequency=system_frequency_hz,
            power_factor=0.96,
            total_load_kw=total_load_kw,
            solar_generation_kw=solar_gen_kw,
            battery_soc_pct=round(self.battery_soc_pct, 1),
            battery_power_kw=battery_flow_kw,
            grid_import_kw=grid_import_kw,
            grid_export_kw=grid_export_kw,
            daily_consumption_kwh=round(18.6 + (self.step_counter * 0.002), 2),
            projected_monthly_kwh=bill_prediction["projected_monthly_kwh"],
            projected_monthly_bill_inr=bill_prediction["projected_monthly_bill_inr"],
            grid_status=consumer_grid_status,
            grid_banner_alert=consumer_banner,
            appliances=list(self.appliances.values())
        )

        return {
            "type": "TELEMETRY_UPDATE",
            "smart_home": smart_home_payload.model_dump(),
            "transformers": [t.model_dump() for t in self.transformers.values()],
            "feeders": feeder_analysis,
            "active_events": [e.model_dump() for e in events_list],
            "ml_insights": [m.model_dump() for m in ml_insights],
            "demand_forecast_24h": demand_24h,
            "system_frequency_hz": system_frequency_hz,
            "timestamp": datetime.now().isoformat()
        }

    async def run_loop(self):
        """Asynchronous simulator loop streaming every 1.0 second"""
        self.is_running = True
        print("[Simulator] Multi-Sensor IoT Telemetry loop started (1.0s interval)...")
        while self.is_running:
            try:
                payload = self.generate_current_state()

                # Publish to MQTT if connected
                if self.mqtt_client and getattr(self.mqtt_client, "is_connected", lambda: False)():
                    try:
                        for tx in self.transformers.values():
                            topic = f"energyq/sensors/{tx.id}/telemetry"
                            self.mqtt_client.publish(topic, json.dumps(tx.model_dump()))
                    except Exception as mq_err:
                        pass

                # Notify WebSocket listeners
                for listener in list(self.listeners):
                    try:
                        if asyncio.iscoroutinefunction(listener):
                            await listener(payload)
                        else:
                            listener(payload)
                    except Exception as err:
                        print(f"[Simulator] Error delivering to listener: {err}")
            except Exception as e:
                print(f"[Simulator] Error in simulation loop: {e}")

            await asyncio.sleep(1.0)


# Global singleton simulator instance
grid_simulator = GridSimulator()
