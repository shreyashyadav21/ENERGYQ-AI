# ⚡ ENERGYQ AI
> *"Powering Smarter Living, Managing Smarter Grids"*

ENERGYQ AI is an end-to-end, real-time AI-powered electricity management ecosystem bridging a **Consumer Smart Home Portal** and a **BESCOM Utility Operator Portal** via a shared FastAPI backend, WebSockets, IoT simulator, and interactive 3D Digital Twins.

---

## 🌟 Core Architecture & Ecosystem Highlights

### 1. Interactive 3D Digital Twins (Centerpiece)
- **Portal A: Consumer 3D Smart Home (`SmartHomeTwin.tsx`)**:
  - Semi-transparent cutaway villa architecture (Living Room, Kitchen, Utility/Meter Room, Garage with EV Wallbox, Rooftop Solar array, Powerwall battery storage).
  - **Animated Energy Flows**: Glowing electric cyan (`#00F0FF`) and energy green (`#10B981`) particle streams flowing from utility pole $\rightarrow$ smart meter $\rightarrow$ indoor appliances, plus rooftop solar power $\rightarrow$ hybrid battery storage.
  - **Advanced GLSL Effects** (`AdvancedShaders.tsx`): Solar-generation sunbeams, Fresnel-tinted smart glass, an animated EV induction charging field, and fault-state electrical arcs.
  - **Realistic 3D Backdrop** (`StudioEnvironment.tsx`): A local CC0 Poly Haven urban-street HDRI supplies a photographic city environment and image-based reflections, complemented by textured ground and cinematic lighting.
  - **Interactive 3D Appliances**: Select an appliance from the keyboard-accessible appliance list to focus the camera, click its 3D model for details, then use the signed-in control to switch it ON/OFF. Telemetry updates the model and load metrics.
- **Portal B: BESCOM 3D Distribution Grid (`SmartGridTwin.tsx`)**:
  - 3D Substation & Feeder Network representing key Bengaluru localities: **Indiranagar**, **Koramangala**, **Yelahanka (Substation Power TX-2)**, and **Whitefield (Tech Corridor)**.
  - **Dynamic Thermal Emissive Shaders**: Transformers shift from Electric Cyan/Green $\rightarrow$ Amber $\rightarrow$ Flashing Crimson Red (`#EF4444`) based on live load %, voltage, and oil temperature.
  - **Fault Visuals**: Thermal plumes, pulsing fault rings, and animated shader-based electric arcs react to transformer anomalies.
  - **Animated Power Flow**: Traveling photon packets along 11kV/66kV distribution lines; when a line or transformer trips, downstream pulses halt and flash red, isolating the feeder.
  - **MapLibre GL JS Integration**: One-click toggle between 3D Digital Twin and dark-mode geographic asset map of Bengaluru.

### 2. Five AI/ML Modules (`backend/ml_engine.py`)
All outputs are explicitly labeled as **`ML Forecast`** vs **`Rule Alert`**:
1. **Bill Prediction**: Scikit-Learn RandomForest model predicting monthly kWh and ₹ INR using Karnataka BESCOM LT-2(a) tariff slab structure and solar self-generation offset.
2. **Transformer Anomaly Detection**: `IsolationForest` + `XGBoost` classifier trained on voltage, load %, oil temp, and harmonics to flag critical thermal runaway and overload states.
3. **Distribution Loss Detection**: Computes discrepancy between Substation 11kV input kVA vs aggregated metered consumer kVA to detect commercial loss and unmetered power theft.
4. **24-Hour Demand Forecasting**: Time-series load curve rendered in Apache ECharts with actual kW, predicted kW, and solar curve.
5. **AI Energy Recommendations**: Actionable scheduling tips with exact monthly ₹ savings (e.g. EV night off-peak charging: save ₹480/month; solar pre-cooling: save ₹340/month).

### 3. Closed-Loop Cross-Portal Workflow
- **Fault Injection**: Trigger *Transformer Overload (Yelahanka Feeder)*, *Voltage Sag*, or *Distribution Line Loss* via the **"Simulate Grid Event" Control Drawer**.
- **Sync Reaction**:
  1. Anomaly triggers $\rightarrow$ BESCOM 3D Transformer turns Amber/Red with flashing warning halo.
  2. Operator clicks **"Assign Maintenance Crew"** $\rightarrow$ Affected consumers immediately receive a live advisory banner in their smart home portal.
  3. Operator clicks **"Mark Resolved"** $\rightarrow$ Both portals smoothly return to the normal optimal state.

### 4. Consumer Service Requests & Security
- Consumers can select **Help / report** in the assistant to send a grid/service report with an issue type, locality, and description.
- Reports are stored in the backend queue. BESCOM operators can send progress updates or resolution notes; consumers see the response and status in the assistant.
- Appliance changes are logged with the authenticated actor. Consumer and operator actions have separate server-side role checks across REST and WebSocket commands; consumer access is bound to the trusted meter ID in Supabase `app_metadata`.
- Demo logins control only the in-memory simulator. They are intentionally not production authentication and must not be used to protect a live device or grid.

### 5. Multilingual Voice Assistant (Sarvam AI Ready)
- Floating microphone widget supporting **English**, **ಕನ್ನಡ (Kannada)**, and **हिंदी (Hindi)**.
- Integrated with Web Speech API for voice recognition, SpeechSynthesis for spoken answers, and `/api/voice` endpoint supporting Sarvam AI API key via `.env`.

---

## 🚀 Quickstart & Startup

### Install Frontend Dependencies
From the repository root, install the packages declared in `frontend/package.json`:
```bash
npm --prefix frontend install --legacy-peer-deps
```

### One-Click Launch (Recommended)
Runs both the FastAPI backend and Vite frontend together:

**On Windows:**
```bat
start.bat
```
or via npm:
```bash
npm start
```

**On Linux / macOS:**
```bash
chmod +x start.sh
./start.sh
```

### Map Tile Configuration
The current dark CARTO raster basemap is used directly and does not require a CARTO API key. The operator GIS map can optionally use MapTiler instead; set `VITE_MAPTILER_KEY` in `frontend/.env` and restart the frontend to enable it.

### Security Configuration
- The local `backend/.env` enables `ENERGYQ_DEMO_MODE=true` for the simulator. Keep the backend on a trusted local network; demo role headers are deliberately not identity credentials.
- For any shared deployment, set `ENERGYQ_DEMO_MODE=false`, configure `SUPABASE_JWT_SECRET`, and set `CORS_ALLOWED_ORIGINS` to the exact frontend origins. Protected endpoints fail closed when production JWT verification is not configured.
- The backend currently verifies Supabase HS256 access tokens. Assign `role` (`consumer` or `operator`) and, for consumers, `meter_id` in trusted Supabase `app_metadata`; do not derive operator clearance or meter ownership from editable user metadata.
- Set `VITE_API_URL` in `frontend/.env` to the backend base URL for non-local deployments. Use HTTPS/WSS in deployed environments.
- This repository's grid twin is a simulator; it is not connected to or authorized to operate physical BESCOM infrastructure.

---

## 🌐 Endpoints & Ports
- **Frontend UI**: [http://localhost:5173](http://localhost:5173)
- **FastAPI Backend**: [http://localhost:8000](http://localhost:8000)
- **Interactive API Docs (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **WebSocket Telemetry Stream**: `ws://localhost:8000/ws/telemetry`

---

## 📁 Repository Structure
```
energyq-ai/
├── backend/
│   ├── venv/                  # Python 3.14 virtual environment
│   ├── main.py                # FastAPI REST & WebSocket server
│   ├── simulator.py           # Background IoT sensor telemetry simulator (1.5s interval)
│   ├── ml_engine.py           # 5 Scikit-learn & XGBoost AI modules
│   ├── models.py              # Pydantic telemetry & event schemas
│   ├── voice_service.py       # Multilingual voice NLU & Sarvam AI bridge
│   ├── database.py            # SQLite / Supabase state store and incident/audit records
│   ├── security.py            # HS256 access-token and consumer/operator role checks
│   └── requirements.txt       # Python dependencies
├── frontend/
│   ├── public/
│   │   └── images/
│   │       └── wide-street-2k.hdr # CC0 HDRI: https://polyhaven.com/a/wide_street_01
│   ├── src/
│   │   ├── components/
│   │   │   ├── 3d/
│   │   │   │   ├── SmartHomeTwin.tsx    # 3D Smart Home with animated energy flows
│   │   │   │   ├── SmartGridTwin.tsx    # 3D BESCOM Grid with thermal shaders & trip isolation
│   │   │   │   ├── AdvancedShaders.tsx  # Solar, smart-glass, EV charging & fault GLSL effects
│   │   │   │   └── IndustrialKit.tsx    # Procedural industrial textures and reusable 3D assets
│   │   │   ├── gis/
│   │   │   │   └── BengaluruMap.tsx     # MapLibre GL JS Bengaluru asset map
│   │   │   ├── consumer/
│   │   │   │   └── ConsumerPortal.tsx   # Consumer Smart Home dashboard & HUD
│   │   │   ├── utility/
│   │   │   │   └── BescomPortal.tsx     # BESCOM SCADA operator dashboard & HUD
│   │   │   ├── split/
│   │   │   │   └── SplitPortalView.tsx  # Dual synchronized cross-portal view
│   │   │   ├── hud/
│   │   │   │   ├── Header.tsx           # SCADA top navigation & status badges
│   │   │   │   └── EventDrawer.tsx      # One-click fault simulation drawer
│   │   │   └── voice/
│   │   │       └── VoiceAssistantModal.tsx # Multilingual voice assistant (En/Kn/Hi)
│   │   ├── stores/
│   │   │   └── energyStore.ts           # Zustand global state store
│   │   ├── services/
│   │   │   └── websocket.ts             # Auto-reconnecting WebSocket client
│   │   └── types/
│   │       └── energy.ts                # TypeScript interfaces
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── run_all.js                 # Concurrent launch script
├── start.bat                  # Windows startup batch file
├── start.sh                   # Linux startup bash script
└── README.md
```
