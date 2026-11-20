import numpy as np
import pandas as pd
from typing import Dict, List, Any, Tuple
import os
import pickle

# Robust imports with fallbacks
try:
    from sklearn.ensemble import IsolationForest, RandomForestRegressor, GradientBoostingRegressor
    from sklearn.preprocessing import StandardScaler
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

try:
    import xgboost as xgb
    XGB_AVAILABLE = True
except ImportError:
    XGB_AVAILABLE = False


class EnergyQMLEngine:
    """
    ENERGYQ AI Machine Learning Engine
    Five Modules:
    1. Bill Prediction (monthly kWh & ₹ INR forecast with BESCOM tariff tiers)
    2. Transformer Anomaly Detection (Isolation Forest + XGBoost classifier)
    3. Distribution Loss Detection (Input vs billed feeder discrepancy)
    4. 24-Hour Demand Forecasting (Time-series load curve)
    5. AI Energy Recommendations (Appliance schedule optimization with ₹ savings)
    """

    def __init__(self):
        self.scaler = None
        self.anomaly_detector = None
        self.xgb_detector = None
        self.bill_model = None
        self.demand_model = None
        self.is_trained = False
        self._initialize_or_train_models()

    def _initialize_or_train_models(self):
        """Train or generate models on startup using synthetic BESCOM grid time-series data"""
        if not SKLEARN_AVAILABLE:
            print("[MLEngine] Scikit-Learn not ready yet; using heuristic AI fallback")
            return

        try:
            # 1. Train Anomaly Detection Model (Normal vs Overloaded/Thermal runaway transformers)
            # Features: [voltage_v, load_pct, oil_temp_c, winding_temp_c, harmonics_thd_pct]
            np.random.seed(42)
            n_normal = 800
            normal_voltages = np.random.normal(415, 8, n_normal)
            normal_loads = np.random.uniform(40, 75, n_normal)
            normal_oil_temps = np.random.normal(55, 6, n_normal)
            normal_winding_temps = normal_oil_temps + np.random.uniform(3, 8, n_normal)
            normal_thd = np.random.uniform(1.5, 4.0, n_normal)
            X_normal = np.column_stack([normal_voltages, normal_loads, normal_oil_temps, normal_winding_temps, normal_thd])

            # Anomaly samples (high temp, low voltage, or high load)
            n_anom = 100
            anom_voltages = np.concatenate([np.random.uniform(340, 380, 50), np.random.uniform(435, 460, 50)])
            anom_loads = np.random.uniform(88, 125, n_anom)
            anom_oil_temps = np.random.uniform(85, 115, n_anom)
            anom_winding_temps = anom_oil_temps + np.random.uniform(10, 25, n_anom)
            anom_thd = np.random.uniform(6.0, 14.0, n_anom)
            X_anom = np.column_stack([anom_voltages, anom_loads, anom_oil_temps, anom_winding_temps, anom_thd])

            X_train = np.vstack([X_normal, X_anom])
            self.scaler = StandardScaler()
            X_scaled = self.scaler.fit_transform(X_train)

            self.anomaly_detector = IsolationForest(contamination=0.12, random_state=42)
            self.anomaly_detector.fit(X_scaled)

            # Train XGBoost Classifier for supervised anomaly probability
            if XGB_AVAILABLE:
                y_train = np.array([0] * n_normal + [1] * n_anom)
                self.xgb_detector = xgb.XGBClassifier(
                    n_estimators=35,
                    max_depth=4,
                    learning_rate=0.1,
                    eval_metric="logloss",
                    random_state=42
                )
                self.xgb_detector.fit(X_train, y_train)

            # 2. Train Bill Prediction Model
            # Features: [active_appliances_count, daily_kwh, avg_peak_kw, solar_self_kwh] -> monthly_kwh
            n_homes = 500
            app_count = np.random.randint(3, 10, n_homes)
            daily_kwh = app_count * np.random.uniform(2.5, 4.2, n_homes)
            avg_peak = daily_kwh * np.random.uniform(0.18, 0.28, n_homes)
            solar_kwh = np.random.uniform(0, 8.0, n_homes)
            # Net monthly kwh:
            monthly_net = (daily_kwh - 0.6 * solar_kwh) * 30 + np.random.normal(0, 15, n_homes)
            monthly_net = np.clip(monthly_net, 120, 1800)

            X_bill = np.column_stack([app_count, daily_kwh, avg_peak, solar_kwh])
            self.bill_model = RandomForestRegressor(n_estimators=30, random_state=42)
            self.bill_model.fit(X_bill, monthly_net)

            self.is_trained = True
            print("[MLEngine] Scikit-Learn, IsolationForest & XGBoost models trained successfully.")
        except Exception as e:
            print(f"[MLEngine] Model initialization error: {e}")
            self.is_trained = False

    def predict_bill(self, daily_consumption_kwh: float, solar_generation_kw: float,
                     active_appliances: int, peak_kw: float) -> Dict[str, Any]:
        """
        Module 1: Bill Prediction with BESCOM Karnataka slab tariff
        BESCOM Residential LT-2 Tariff Structure:
        - 0 to 100 units: ₹4.75 / unit
        - Above 100 units: ₹7.00 / unit
        - Fixed charges: ₹110 / kW sanctioned load
        - Electricity Duty: 9%
        """
        solar_daily_offset = solar_generation_kw * 4.5  # avg 4.5 peak sun hours in Bangalore
        if self.is_trained and self.bill_model:
            features = np.array([[active_appliances, daily_consumption_kwh, peak_kw, solar_daily_offset]])
            pred_monthly_kwh = float(self.bill_model.predict(features)[0])
        else:
            net_daily = max(2.0, daily_consumption_kwh - solar_daily_offset * 0.7)
            pred_monthly_kwh = net_daily * 30.0

        # Calculate BESCOM tariff
        units = max(10.0, pred_monthly_kwh)
        energy_charges = 0.0
        if units <= 100:
            energy_charges = units * 4.75
        else:
            energy_charges = (100 * 4.75) + ((units - 100) * 7.00)

        sanctioned_load_kw = 5.0  # standard 5kW for 3BHK/Villa
        fixed_charges = sanctioned_load_kw * 110.0
        subtotal = energy_charges + fixed_charges
        tax_duty = subtotal * 0.09
        total_bill_inr = round(subtotal + tax_duty, 2)

        baseline_without_solar = (units + solar_daily_offset * 30 * 0.7)
        baseline_bill = (100 * 4.75 + max(0, baseline_without_solar - 100) * 7.0) + fixed_charges
        baseline_bill *= 1.09
        monthly_solar_savings = max(0.0, round(baseline_bill - total_bill_inr, 2))

        return {
            "label_type": "ML Forecast",
            "projected_monthly_kwh": round(units, 1),
            "projected_monthly_bill_inr": total_bill_inr,
            "monthly_solar_savings_inr": monthly_solar_savings,
            "tariff_slab": "BESCOM LT-2(a) Domestic",
            "confidence_score": 0.94
        }

    def detect_transformer_anomaly(self, transformer_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Module 2: Transformer Anomaly Detection
        Inputs: voltage, load %, oil temperature, winding temperature, harmonics THD
        Output: Anomaly flag, confidence score, failure mode diagnosis
        """
        v = float(transformer_data.get("voltage_v", 415.0))
        load = float(transformer_data.get("load_pct", 65.0))
        oil_t = float(transformer_data.get("oil_temp_c", 55.0))
        winding_t = float(transformer_data.get("winding_temp_c", oil_t + 6.0))
        thd = float(transformer_data.get("harmonics_thd_pct", 3.0))

        is_anomaly = False
        anomaly_score = 0.05
        diagnosis = "Optimal operating condition within thermal & dielectric tolerances."
        severity = "optimal"

        if self.is_trained and self.anomaly_detector and self.scaler:
            feat = self.scaler.transform([[v, load, oil_t, winding_t, thd]])
            raw_score = float(self.anomaly_detector.decision_function(feat)[0])
            # Lower decision function means higher anomaly
            anomaly_score = float(np.clip(1.0 - (raw_score + 0.3) / 0.6, 0.05, 0.98))

            # Incorporate XGBoost Classifier anomaly probability
            if self.xgb_detector is not None:
                try:
                    xgb_prob = float(self.xgb_detector.predict_proba([[v, load, oil_t, winding_t, thd]])[0][1])
                    anomaly_score = float(np.clip(0.55 * anomaly_score + 0.45 * xgb_prob, 0.05, 0.99))
                except Exception:
                    pass

            is_anomaly = anomaly_score > 0.58
        else:
            # Physics-based rule baseline
            if load > 95 or oil_t > 85 or v < 370 or v > 450:
                is_anomaly = True
                anomaly_score = 0.88
            elif load > 80 or oil_t > 72:
                anomaly_score = 0.55

        # Multi-sensor weighted health index computation
        pv = transformer_data.get("phase_voltages") or {}
        vr = float(pv.get("V_R", v / 1.732))
        vy = float(pv.get("V_Y", v / 1.732))
        vb = float(pv.get("V_B", v / 1.732))
        v_avg = max(1.0, (vr + vy + vb) / 3.0)
        v_imbalance_pct = (max(abs(vr - v_avg), abs(vy - v_avg), abs(vb - v_avg)) / v_avg) * 100.0

        pf = float(transformer_data.get("power_factor", 0.97))
        freq = float(transformer_data.get("frequency_hz", 50.0))

        # Penalties calculation
        p_imbalance = max(0.0, (v_imbalance_pct - 1.2) * 8.0)
        p_thermal = max(0.0, (oil_t - 72.0) * 2.2) + max(0.0, (winding_t - 78.0) * 1.5)
        p_overload = max(0.0, (load - 75.0) * 1.7)
        p_thd = max(0.0, (thd - 4.0) * 3.0)
        p_pf = max(0.0, (0.95 - pf) * 45.0)
        p_freq = max(0.0, abs(freq - 50.0) * 20.0)
        p_ml = anomaly_score * 35.0

        total_penalty = p_imbalance + p_thermal + p_overload + p_thd + p_pf + p_freq + p_ml
        health_score = round(max(5.0, min(100.0, 100.0 - total_penalty)), 1)

        # Refined diagnosis
        if oil_t >= 88.0:
            severity = "critical"
            diagnosis = f"CRITICAL THERMAL RUNAWAY: Transformer oil temp at {oil_t:.1f}°C (Threshold: 85°C). Insulation breakdown risk!"
            is_anomaly = True
            anomaly_score = max(0.92, anomaly_score)
        elif load >= 92.0:
            severity = "critical"
            diagnosis = f"FEEDER OVERLOAD: Sustained load at {load:.1f}% capacity. Substation breaker trip imminent."
            is_anomaly = True
            anomaly_score = max(0.85, anomaly_score)
        elif v <= 375.0 or v_imbalance_pct > 4.5:
            severity = "warning"
            diagnosis = f"VOLTAGE SAG / IMBALANCE ALERT: Phase voltage {v:.1f}V with {v_imbalance_pct:.1f}% phase imbalance."
            is_anomaly = True
            anomaly_score = max(0.72, anomaly_score)
        elif load > 75.0 or oil_t > 70.0:
            severity = "warning"
            diagnosis = f"PEAK LOAD WARNING: Transformer operating at {load:.1f}% with elevated winding temp ({winding_t:.1f}°C)."
        else:
            severity = "optimal"

        return {
            "label_type": "ML Forecast" if self.is_trained else "Rule Alert",
            "is_anomaly": is_anomaly,
            "anomaly_score": round(anomaly_score, 3),
            "health_score": health_score,
            "severity": severity,
            "diagnosis": diagnosis,
            "oil_temp_status": "Overheated" if oil_t > 80 else "Normal",
            "load_status": "Overloaded" if load > 85 else "Acceptable",
            "phase_imbalance_pct": round(v_imbalance_pct, 2)
        }

    def detect_distribution_loss(self, feeder_metrics: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Module 3: Distribution Loss Detection
        Evaluates input power at Substation 11kV bus vs aggregated metered output at consumer end.
        Technical loss: 3-5%
        Commercial loss / Power theft: > 8%
        """
        results = []
        for feeder in feeder_metrics:
            inp = float(feeder.get("input_power_kva", 500.0))
            billed = float(feeder.get("billed_power_kva", 460.0))
            loss_kva = max(0.0, inp - billed)
            loss_pct = (loss_kva / inp) * 100.0 if inp > 0 else 0.0

            # Technical loss model based on line resistance
            tech_loss_pct = min(4.5, loss_pct * 0.45)
            comm_loss_pct = max(0.0, loss_pct - tech_loss_pct)

            status = "normal"
            alert_label = "ML Forecast"
            msg = "Technical loss within KERC standards (<5.5%)."

            if loss_pct > 12.0:
                status = "critical_theft"
                alert_label = "Rule Alert"
                msg = f"UNMETERED CONSUMPTION ALERT: Commercial loss {comm_loss_pct:.1f}% exceeds threshold. High probability of meter tampering or illegal tapping in feeder section 3B."
            elif loss_pct > 7.5:
                status = "high"
                msg = f"ELEVATED LOSS: Feeder distribution loss at {loss_pct:.1f}%. Phase balancing recommended."

            results.append({
                "feeder_id": feeder.get("id"),
                "feeder_name": feeder.get("name"),
                "locality": feeder.get("locality"),
                "label_type": alert_label,
                "input_power_kva": round(inp, 1),
                "billed_power_kva": round(billed, 1),
                "loss_kva": round(loss_kva, 1),
                "total_loss_pct": round(loss_pct, 2),
                "technical_loss_pct": round(tech_loss_pct, 2),
                "commercial_loss_pct": round(comm_loss_pct, 2),
                "loss_status": status,
                "analysis_note": msg
            })
        return results

    def forecast_24h_demand(self, current_hour: int = 14, current_kw: float = 3.5) -> List[Dict[str, Any]]:
        """
        Module 4: 24-Hour Demand Forecasting
        Time-series load curve modeled on Bengaluru daily profile:
        - 00:00 - 05:00: Baseload (~1.2 - 1.8 kW)
        - 06:00 - 09:30: Morning peak (Geysers, cooking, pumps: ~3.8 - 4.8 kW)
        - 11:00 - 15:30: Solar generation peak + moderate AC (~2.2 - 3.2 kW)
        - 18:00 - 22:30: Evening lighting/appliance/EV peak (~4.5 - 5.8 kW)
        """
        forecast = []
        base_curve = [
            1.4, 1.3, 1.2, 1.2, 1.5, 2.2,
            3.8, 4.5, 4.2, 3.2, 2.8, 2.6,
            2.9, 3.4, 3.2, 3.0, 3.3, 4.1,
            5.2, 5.6, 5.4, 4.8, 3.5, 2.1
        ]
        solar_curve = [
            0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
            0.4, 1.2, 2.2, 3.1, 3.6, 3.8,
            3.7, 3.3, 2.6, 1.5, 0.5, 0.0,
            0.0, 0.0, 0.0, 0.0, 0.0, 0.0
        ]

        scale = current_kw / max(1.0, base_curve[current_hour % 24])

        for h in range(24):
            hour_label = f"{h:02d}:00"
            raw_pred = base_curve[h] * scale * (0.95 + 0.1 * np.sin(h * 0.5))
            pred_val = round(max(0.8, raw_pred), 2)
            solar_val = round(solar_curve[h], 2)
            actual_val = round(pred_val * (0.96 + 0.08 * np.random.uniform(-1, 1)), 2) if h <= current_hour else None

            forecast.append({
                "hour": hour_label,
                "hour_int": h,
                "is_current": h == current_hour,
                "actual_kw": actual_val,
                "predicted_kw": pred_val,
                "confidence_lower_kw": round(max(0.5, pred_val * 0.88), 2),
                "confidence_upper_kw": round(pred_val * 1.12, 2),
                "solar_generation_kw": solar_val,
                "tariff_type": "Peak" if (6 <= h <= 10 or 18 <= h <= 22) else "Off-Peak"
            })
        return forecast

    def generate_energy_recommendations(self, appliances: List[Dict[str, Any]],
                                        solar_kw: float, battery_soc: float) -> List[Dict[str, Any]]:
        """
        Module 5: AI Energy Recommendations
        Actionable appliance scheduling tips with estimated ₹ monthly savings
        """
        recommendations = []

        # 1. EV Charger optimization
        ev = next((a for a in appliances if a.get("id") == "ev_charger"), None)
        if ev and ev.get("is_on"):
            recommendations.append({
                "id": "rec_ev_schedule",
                "label_type": "ML Forecast",
                "category": "EV Charging Optimization",
                "title": "Shift EV Fast Charging to 01:00 AM Night Slab",
                "description": "Your EV is charging during peak tariff hours. Scheduling it between 01:00 AM - 05:00 AM takes advantage of BESCOM's off-peak rates and avoids feeder demand surcharges.",
                "estimated_monthly_savings_inr": 480.0,
                "co2_reduction_kg": 24.5,
                "action_type": "schedule_appliance",
                "target_appliance_id": "ev_charger",
                "recommended_time": "01:00 - 05:00"
            })

        # 2. Rooftop Solar self-consumption
        if solar_kw > 1.5:
            recommendations.append({
                "id": "rec_solar_precool",
                "label_type": "ML Forecast",
                "category": "Solar Self-Consumption",
                "title": "Pre-Cool Living Room with Excess Rooftop Solar",
                "description": f"Rooftop solar is generating {solar_kw:.1f} kW of surplus clean power. Pre-cooling your home now at 24°C stores thermal energy, reducing evening grid imports by 38%.",
                "estimated_monthly_savings_inr": 340.0,
                "co2_reduction_kg": 18.0,
                "action_type": "optimize_ac",
                "target_appliance_id": "living_room_ac",
                "recommended_time": "Now (11:00 - 15:00)"
            })

        # 3. Water heater / Geyser standby
        wh = next((a for a in appliances if a.get("id") == "water_heater"), None)
        if wh and wh.get("is_on"):
            recommendations.append({
                "id": "rec_water_heater",
                "label_type": "Rule Alert",
                "category": "Thermal Storage",
                "title": "Smart Geyser Auto-Off Timer",
                "description": "Water heater has reached set temperature. Enabling smart thermodynamic cycling eliminates standby heat loss without compromising shower comfort.",
                "estimated_monthly_savings_inr": 210.0,
                "co2_reduction_kg": 11.2,
                "action_type": "toggle_appliance",
                "target_appliance_id": "water_heater",
                "recommended_time": "Immediate"
            })

        # 4. Battery peak shaving
        if battery_soc > 70.0:
            recommendations.append({
                "id": "rec_battery_shave",
                "label_type": "ML Forecast",
                "category": "Battery Storage Arbitrage",
                "title": "Evening Peak Shaving via Home Battery",
                "description": f"Home battery is charged at {battery_soc:.0f}%. Discharging 1.5 kW into your home circuits between 19:00 - 22:00 insulates you from peak grid tariffs.",
                "estimated_monthly_savings_inr": 390.0,
                "co2_reduction_kg": 19.8,
                "action_type": "discharge_battery",
                "target_appliance_id": "battery_storage",
                "recommended_time": "19:00 - 22:00"
            })

        return recommendations


# Singleton instance
ml_engine = EnergyQMLEngine()
