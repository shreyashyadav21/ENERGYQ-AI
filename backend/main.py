import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

import asyncio
import json
import os
import uuid
from datetime import datetime
from contextlib import asynccontextmanager
from typing import Set, Dict, Any, List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from models import (
    EventTriggerRequest, MaintenanceActionRequest,
    ApplianceToggleRequest, VoiceQueryRequest, VoiceQueryResponse,
    SensorIngestPayload, VoiceSTTResponse, VoiceTTSRequest,
    GridIncidentCreate, GridIncidentReply
)
from simulator import grid_simulator
from ml_engine import ml_engine
from voice_service import voice_assistant
from database import get_db, GridIncidentLog, ApplianceAuditLog, SessionLocal, UserGridIncident
from security import DEMO_MODE, authenticate_token, require_consumer, require_portal_user, require_role, require_user, validate_consumer_scope

# Active WebSocket connections
active_connections: Set[WebSocket] = set()
connection_roles: Dict[WebSocket, str] = {}
connection_users: Dict[WebSocket, str] = {}

async def broadcast_telemetry(payload: Dict[str, Any]):
    """Broadcasts simulator state to all active WebSocket clients"""
    if not active_connections:
        return

    message = json.dumps(payload)
    disconnected_clients = set()
    for ws in list(active_connections):
        try:
            await ws.send_text(message)
        except Exception:
            disconnected_clients.add(ws)

    for dead_ws in disconnected_clients:
        active_connections.discard(dead_ws)
        connection_roles.pop(dead_ws, None)
        connection_users.pop(dead_ws, None)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if DEMO_MODE:
        print("[ENERGYQ Backend] DEMO MODE: simulator-only access controls are enabled; do not expose this service publicly.")
    elif not os.getenv("SUPABASE_JWT_SECRET"):
        print("[ENERGYQ Backend] WARNING: SUPABASE_JWT_SECRET is missing; protected APIs will fail closed.")
    # Register broadcast listener with simulator
    grid_simulator.register_listener(broadcast_telemetry)
    # Start background simulator task
    sim_task = asyncio.create_task(grid_simulator.run_loop())
    print("[ENERGYQ Backend] Simulator started and ready.")
    yield
    # Shutdown
    grid_simulator.is_running = False
    sim_task.cancel()
    try:
        await sim_task
    except asyncio.CancelledError:
        pass
    print("[ENERGYQ Backend] Simulator stopped.")


app = FastAPI(
    title="ENERGYQ AI — Smart Home & BESCOM Grid Core",
    version="2.0.0",
    description="Unified Multi-Sensor API & Real-time Telemetry Engine connecting Consumer Smart Home and BESCOM Utility Digital Twin",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173"
    ).split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    return {
        "status": "online",
        "system": "ENERGYQ AI Demo Simulator" if DEMO_MODE else "ENERGYQ AI",
        "active_ws_clients": len(active_connections),
        "ml_engine_trained": ml_engine.is_trained,
        "simulator_running": grid_simulator.is_running
    }


@app.get("/api/telemetry/current")
async def get_current_telemetry(_user: Dict[str, Any] = Depends(require_portal_user)):
    """Returns the latest synchronized snapshot of consumer + grid multi-sensor state"""
    return grid_simulator.generate_current_state()


@app.post("/api/events/trigger")
async def trigger_grid_event(req: EventTriggerRequest, _user: Dict[str, Any] = Depends(require_role("operator"))):
    """Trigger an intentional grid fault or restoration (Overload, Sag, Loss, Normal)"""
    valid_events = ["overload_yelahanka", "voltage_sag", "line_loss", "restore_normal", "shed_load_yelahanka", "trip_breaker_yelahanka"]
    if req.event_type not in valid_events:
        raise HTTPException(status_code=400, detail=f"Invalid event_type. Must be one of {valid_events}")

    grid_simulator.trigger_event(req.event_type)
    # Immediately broadcast new state
    new_state = grid_simulator.generate_current_state()
    await broadcast_telemetry(new_state)
    return {"status": "success", "event_triggered": req.event_type}


@app.post("/api/maintenance/action")
async def maintenance_action(req: MaintenanceActionRequest, _user: Dict[str, Any] = Depends(require_role("operator"))):
    """BESCOM Operator assigns crew or marks fault resolved"""
    grid_simulator.set_maintenance_action(req.transformer_id, req.action)
    new_state = grid_simulator.generate_current_state()
    await broadcast_telemetry(new_state)
    return {"status": "success", "action": req.action, "transformer_id": req.transformer_id}


@app.post("/api/appliances/toggle")
async def toggle_appliance(
    req: ApplianceToggleRequest,
    user: Dict[str, Any] = Depends(require_consumer),
    db=Depends(get_db),
):
    """Consumer Portal toggles appliance ON/OFF in 3D digital twin"""
    if req.appliance_id not in grid_simulator.appliances:
        raise HTTPException(status_code=404, detail="Appliance not found")

    appliance = grid_simulator.appliances[req.appliance_id]
    db.add(ApplianceAuditLog(
        appliance_id=req.appliance_id,
        action="ON" if req.state else "OFF",
        kw_reading=appliance.rated_kw if req.state else 0,
        actor_id=user["sub"],
    ))
    db.commit()
    grid_simulator.toggle_appliance(req.appliance_id, req.state)
    new_state = grid_simulator.generate_current_state()
    await broadcast_telemetry(new_state)
    return {"status": "success", "appliance_id": req.appliance_id, "is_on": req.state}


# ==========================================
# Requirement 3: Multi-Sensor Telemetry Ingest
# ==========================================
@app.post("/api/sensors/ingest")
async def ingest_sensor_telemetry(
    req: SensorIngestPayload,
    _user: Dict[str, Any] = Depends(require_role("operator")),
):
    """
    Hardware-Ready Multi-Sensor Ingestion Endpoint.
    Physical ESP32 / IoT edge devices or external SCADA stream live metrics here.
    """
    res = grid_simulator.ingest_sensor_packet(req)
    if res.get("status") == "error":
        raise HTTPException(status_code=404, detail=res.get("detail"))

    # Broadcast updated digital twin state
    new_state = grid_simulator.generate_current_state()
    await broadcast_telemetry(new_state)
    return res


def incident_to_dict(incident: UserGridIncident) -> Dict[str, Any]:
    return {
        "id": incident.id,
        "reporter_ref": incident.reporter_ref,
        "category": incident.category,
        "description": incident.description,
        "locality": incident.locality,
        "status": incident.status,
        "response": incident.response,
        "created_at": incident.created_at.isoformat(),
        "updated_at": incident.updated_at.isoformat(),
    }


@app.post("/api/incidents", status_code=201)
async def create_user_incident(
    req: GridIncidentCreate,
    user: Dict[str, Any] = Depends(require_consumer),
    db=Depends(get_db),
):
    """Create a consumer report for the BESCOM service queue."""
    incident = UserGridIncident(
        id=str(uuid.uuid4()),
        reporter_id=user["sub"],
        reporter_ref=(
            (user.get("user_metadata") or {}).get("meter_id")
            if user["sub"].startswith("demo-")
            else (user.get("app_metadata") or {}).get("meter_id")
        ),
        category=req.category.strip(),
        description=req.description.strip(),
        locality=req.locality.strip(),
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident_to_dict(incident)


@app.get("/api/incidents")
async def list_user_incidents(
    _user: Dict[str, Any] = Depends(require_role("operator")),
    db=Depends(get_db),
):
    incidents = db.query(UserGridIncident).order_by(UserGridIncident.created_at.desc()).limit(100).all()
    return [incident_to_dict(incident) for incident in incidents]


@app.get("/api/incidents/mine")
async def list_my_incidents(
    user: Dict[str, Any] = Depends(require_consumer),
    db=Depends(get_db),
):
    incidents = (
        db.query(UserGridIncident)
        .filter(UserGridIncident.reporter_id == user["sub"])
        .order_by(UserGridIncident.created_at.desc())
        .limit(50)
        .all()
    )
    return [incident_to_dict(incident) for incident in incidents]


@app.post("/api/incidents/{incident_id}/response")
async def respond_to_user_incident(
    incident_id: str,
    req: GridIncidentReply,
    _user: Dict[str, Any] = Depends(require_role("operator")),
    db=Depends(get_db),
):
    if req.status not in {"responded", "resolved"}:
        raise HTTPException(status_code=400, detail="Status must be responded or resolved.")
    incident = db.query(UserGridIncident).filter(UserGridIncident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")
    incident.response = req.response.strip()
    incident.status = req.status
    incident.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(incident)
    return incident_to_dict(incident)


# ==========================================
# Requirement 4: Live GeoJSON GIS API
# ==========================================
@app.get("/api/gis/assets")
async def get_gis_assets():
    """
    Live GeoJSON Feeder & Transformer API serving real Bengaluru locality coordinates:
    Indiranagar, Koramangala, Yelahanka, Whitefield, Jayanagar, Hebbal.
    """
    state = grid_simulator.generate_current_state()
    tx_map = {t["id"]: t for t in state["transformers"]}

    features = []

    # 1. Primary Substations
    substations = [
        {"id": "sub_hal", "name": "HAL 66/11kV Substation", "locality": "Indiranagar", "coords": [77.6480, 12.9620], "kv": "66/11kV"},
        {"id": "sub_ejipura", "name": "Ejipura 66/11kV Substation", "locality": "Koramangala", "coords": [77.6280, 12.9390], "kv": "66/11kV"},
        {"id": "sub_yelahanka", "name": "Yelahanka 66/11kV Substation", "locality": "Yelahanka", "coords": [77.5963, 13.1007], "kv": "66/11kV"},
        {"id": "sub_hoodi", "name": "Hoodi 220/66/11kV Major Substation", "locality": "Whitefield", "coords": [77.7120, 12.9910], "kv": "220/66/11kV"},
        {"id": "sub_jayanagar", "name": "Jayanagar 66/11kV Substation", "locality": "Jayanagar", "coords": [77.5850, 12.9260], "kv": "66/11kV"},
        {"id": "sub_hebbal", "name": "Hebbal 66/11kV Substation", "locality": "Hebbal", "coords": [77.5910, 13.0370], "kv": "66/11kV"},
    ]

    for sub in substations:
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": sub["coords"]
            },
            "properties": {
                "id": sub["id"],
                "name": sub["name"],
                "asset_type": "substation",
                "locality": sub["locality"],
                "voltage_class": sub["kv"],
                "status": "active"
            }
        })

    # 2. Distribution Transformers (bound to real-time telemetry & health score)
    for tx_id, tx in tx_map.items():
        coords = tx.get("coordinates", [77.6, 12.9])
        health_score = tx.get("health_score", 95.0)
        status = tx.get("health_status", "optimal")
        status_color = "#10B981" if status == "optimal" else ("#F59E0B" if status == "warning" else ("#38BDF8" if status == "maintenance" else "#EF4444"))

        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": coords
            },
            "properties": {
                "id": tx["id"],
                "name": tx["name"],
                "asset_type": "transformer",
                "locality": tx["locality"],
                "feeder_id": tx["feeder_id"],
                "rated_capacity_kva": tx["rated_capacity_kva"],
                "active_power_kva": tx["active_power_kva"],
                "load_pct": tx["load_pct"],
                "voltage_v": tx["voltage_v"],
                "oil_temp_c": tx["oil_temp_c"],
                "winding_temp_c": tx["winding_temp_c"],
                "harmonics_thd_pct": tx["harmonics_thd_pct"],
                "health_status": status,
                "health_score": health_score,
                "status_color": status_color,
                "anomaly_score": tx.get("anomaly_score", 0.0),
                "is_ml_anomaly": tx.get("is_ml_anomaly", False),
                "phase_voltages": tx.get("phase_voltages", {}),
                "phase_currents": tx.get("phase_currents", {}),
                "power_factor": tx.get("power_factor", 0.97),
                "frequency_hz": tx.get("frequency_hz", 50.02)
            }
        })

    # 3. Feeder Lines (LineString connecting substations to distribution transformers)
    feeders_geo = [
        {"id": "line_hal_indiranagar", "feeder_id": "feeder_indiranagar", "coords": [[77.6480, 12.9620], [77.6440, 12.9710], [77.6412, 12.9784]], "name": "Indiranagar 11kV Feeder Line", "tx_id": "tx_indiranagar"},
        {"id": "line_ejipura_koramangala", "feeder_id": "feeder_koramangala", "coords": [[77.6280, 12.9390], [77.6260, 12.9370], [77.6245, 12.9352]], "name": "Koramangala 11kV Feeder Line", "tx_id": "tx_koramangala"},
        {"id": "line_yelahanka_industrial", "feeder_id": "feeder_yelahanka", "coords": [[77.5963, 13.1007], [77.5975, 13.0900], [77.5963, 13.1007]], "name": "Yelahanka 11kV Industrial Line", "tx_id": "tx_yelahanka"},
        {"id": "line_hoodi_whitefield", "feeder_id": "feeder_whitefield", "coords": [[77.7120, 12.9910], [77.7300, 12.9800], [77.7499, 12.9698]], "name": "Whitefield 11kV Tech Line", "tx_id": "tx_whitefield"},
        {"id": "line_jayanagar_dist", "feeder_id": "feeder_jayanagar", "coords": [[77.5850, 12.9260], [77.5840, 12.9255], [77.5833, 12.9250]], "name": "Jayanagar 11kV Distribution Line", "tx_id": "tx_jayanagar"},
        {"id": "line_hebbal_link", "feeder_id": "feeder_hebbal", "coords": [[77.5910, 13.0370], [77.5918, 13.0365], [77.5925, 13.0358]], "name": "Hebbal 11kV Link Line", "tx_id": "tx_hebbal"}
    ]

    for line in feeders_geo:
        tx_data = tx_map.get(line["tx_id"], {})
        status = tx_data.get("health_status", "optimal")
        status_color = "#10B981" if status == "optimal" else ("#F59E0B" if status == "warning" else ("#38BDF8" if status == "maintenance" else "#EF4444"))
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": line["coords"]
            },
            "properties": {
                "id": line["id"],
                "feeder_id": line["feeder_id"],
                "name": line["name"],
                "asset_type": "feeder_line",
                "health_status": status,
                "status_color": status_color,
                "current_load_pct": tx_data.get("load_pct", 65.0)
            }
        })

    return {
        "type": "FeatureCollection",
        "features": features,
        "metadata": {
            "city": "Bengaluru",
            "division": "BESCOM Urban Distribution",
            "timestamp": datetime.now().isoformat(),
            "total_assets": len(features)
        }
    }


# ==========================================
# Requirement 5: Sarvam AI Voice Suite
# ==========================================
@app.post("/api/voice/stt", response_model=VoiceSTTResponse)
async def voice_speech_to_text(
    file: UploadFile = File(...),
    language: str = Form("en"),
    _user: Dict[str, Any] = Depends(require_portal_user),
):
    """Sarvam AI STT endpoint (saarika:v2) accepting audio/webm or audio/wav"""
    audio_bytes = await file.read()
    res = await voice_assistant.transcribe_audio(
        audio_bytes=audio_bytes,
        filename=file.filename or "recording.wav",
        language=language
    )
    return res


@app.post("/api/voice/chat", response_model=VoiceQueryResponse)
async def voice_chat_endpoint(req: VoiceQueryRequest, user: Dict[str, Any] = Depends(require_portal_user)):
    """Sarvam AI Context-Aware NLU Query Processing"""
    res = await voice_assistant.process_query(
        query=req.query,
        language=req.language,
        simulator_context=grid_simulator,
        user_role=user["role"],
    )
    if res.action_executed:
        new_state = grid_simulator.generate_current_state()
        await broadcast_telemetry(new_state)
    return res


@app.post("/api/voice/tts")
async def voice_text_to_speech(req: VoiceTTSRequest, _user: Dict[str, Any] = Depends(require_portal_user)):
    """Sarvam AI TTS endpoint (bulbul:v1) converting response text to natural Indian audio"""
    res = await voice_assistant.synthesize_speech(
        text=req.text,
        language=req.language,
        speaker=req.speaker or "meera"
    )
    return res


@app.post("/api/voice", response_model=VoiceQueryResponse)
async def process_voice_query(req: VoiceQueryRequest, user: Dict[str, Any] = Depends(require_portal_user)):
    """Backward compatibility alias for /api/voice/chat"""
    return await voice_chat_endpoint(req, user)


@app.get("/api/ml/insights")
async def get_ml_insights(_user: Dict[str, Any] = Depends(require_portal_user)):
    """Retrieve full batch of current ML diagnostics and forecasts"""
    state = grid_simulator.generate_current_state()
    return {
        "ml_insights": state.get("ml_insights", []),
        "demand_forecast_24h": state.get("demand_forecast_24h", []),
        "feeders_loss_analysis": state.get("feeders", [])
    }


@app.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        auth_message = json.loads(await asyncio.wait_for(websocket.receive_text(), timeout=8))
        if auth_message.get("action") != "AUTH":
            raise HTTPException(status_code=401, detail="WebSocket authentication required.")
        claims = authenticate_token(auth_message.get("access_token"), auth_message.get("demo_role"))
        role = claims["role"]
        if role == "consumer":
            validate_consumer_scope(claims)
        active_connections.add(websocket)
        connection_roles[websocket] = role
        connection_users[websocket] = claims["sub"]
        print(f"[WebSocket] {role} client connected. Total active: {len(active_connections)}")
        await websocket.send_text(json.dumps(grid_simulator.generate_current_state()))

        while True:
            data_text = await websocket.receive_text()
            data = json.loads(data_text)
            cmd = data.get("action")
            required_role = "consumer" if cmd == "TOGGLE_APPLIANCE" else "operator"
            if cmd not in {"TOGGLE_APPLIANCE", "TRIGGER_EVENT", "ASSIGN_CREW", "MARK_RESOLVED"}:
                await websocket.send_text(json.dumps({"type": "COMMAND_REJECTED", "detail": "Unknown command."}))
                continue
            if role != required_role:
                await websocket.send_text(json.dumps({"type": "COMMAND_REJECTED", "detail": f"{required_role.title()} role required."}))
                continue
            if cmd == "TOGGLE_APPLIANCE":
                appliance_id = data.get("appliance_id")
                if appliance_id not in grid_simulator.appliances or not isinstance(data.get("state"), bool):
                    await websocket.send_text(json.dumps({"type": "COMMAND_REJECTED", "detail": "Invalid appliance command."}))
                    continue
                appliance = grid_simulator.appliances[appliance_id]
                db = SessionLocal()
                try:
                    db.add(ApplianceAuditLog(
                        appliance_id=appliance_id,
                        action="ON" if data["state"] else "OFF",
                        kw_reading=appliance.rated_kw if data["state"] else 0,
                        actor_id=connection_users[websocket],
                    ))
                    db.commit()
                finally:
                    db.close()
                grid_simulator.toggle_appliance(appliance_id, data["state"])
            elif cmd == "TRIGGER_EVENT":
                event_type = data.get("event_type")
                if event_type not in {"overload_yelahanka", "voltage_sag", "line_loss", "restore_normal", "shed_load_yelahanka", "trip_breaker_yelahanka"}:
                    await websocket.send_text(json.dumps({"type": "COMMAND_REJECTED", "detail": "Invalid grid event."}))
                    continue
                grid_simulator.trigger_event(event_type)
            elif cmd in {"ASSIGN_CREW", "MARK_RESOLVED"}:
                transformer_id = data.get("transformer_id")
                if transformer_id not in grid_simulator.transformers:
                    await websocket.send_text(json.dumps({"type": "COMMAND_REJECTED", "detail": "Unknown transformer."}))
                    continue
                action = "assign_crew" if cmd == "ASSIGN_CREW" else "mark_resolved"
                grid_simulator.set_maintenance_action(transformer_id, action)

            await broadcast_telemetry(grid_simulator.generate_current_state())
    except asyncio.TimeoutError:
        await websocket.close(code=4401, reason="Authentication timed out.")
    except HTTPException as auth_error:
        await websocket.close(code=4403 if auth_error.status_code == 403 else 4401, reason=auth_error.detail)
    except (json.JSONDecodeError, KeyError, TypeError):
        active_connections.discard(websocket)
        connection_roles.pop(websocket, None)
        connection_users.pop(websocket, None)
        await websocket.close(code=4400, reason="Invalid WebSocket message.")
    except WebSocketDisconnect:
        active_connections.discard(websocket)
        connection_roles.pop(websocket, None)
        connection_users.pop(websocket, None)
        print(f"[WebSocket] Client disconnected. Total active: {len(active_connections)}")
    except Exception as e:
        active_connections.discard(websocket)
        connection_roles.pop(websocket, None)
        connection_users.pop(websocket, None)
        print(f"[WebSocket] Connection closed with error: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
