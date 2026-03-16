# Simulation Project

A multiplayer web interface wrapped around an existing simulation tool. The web app and simulation are fully decoupled — they communicate only through shared input/output folders on the filesystem.

## Project Structure

```
my-project/
├── web/                        ← The web application (entirely self-contained)
│   ├── frontend/               ← React app (what players see in their browsers)
│   │   ├── src/
│   │   │   ├── pages/          ← One component per route
│   │   │   ├── components/     ← Shared/reusable UI components
│   │   │   └── hooks/          ← Custom React hooks (e.g. WebSocket)
│   │   ├── package.json
│   │   └── vite.config.js
│   └── backend/                ← FastAPI + Socket.IO server
│       ├── main.py             ← API endpoints + WebSocket handlers
│       ├── config.py           ← Paths to simulation folders (single source of truth)
│       ├── file_manager.py     ← All reads/writes to simulation folders go through here
│       ├── database.py         ← SQLite for game sessions and player state
│       └── requirements.txt
│
├── simulation/                 ← Your existing simulation (untouched by the web app)
│   ├── simulation_inputs/      ← Web backend writes player inputs here
│   ├── simulation_outputs/     ← Simulation writes results here; web backend reads them
│   └── ...                     ← Your simulation code, scripts, config, etc.
│
├── README.md
└── .gitignore
```

## How the Two Sides Communicate

The web app **never imports or calls** simulation code directly. Instead:

1. Players submit inputs via the web interface
2. The web backend writes those inputs as files into `simulation/simulation_inputs/`
3. The simulation runs (triggered manually, by script, or eventually by the backend) and writes results to `simulation/simulation_outputs/`
4. The web backend reads from `simulation/simulation_outputs/` and serves results to the frontend via API + WebSocket

This means:
- The simulation folder can be developed, tested, and run completely independently
- The web app only needs to know the folder paths and the file formats
- You can swap out the simulation entirely without touching the web code

## Quick Start

### Prerequisites
- **Node.js** (v18+): https://nodejs.org
- **Python** (3.10+): https://python.org

### 1. Set up the backend

```bash
cd web/backend
python -m venv venv
source venv/bin/activate        # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Set up the frontend

```bash
cd web/frontend
npm install
```

### 3. Run both servers

Terminal 1 — backend:
```bash
cd web/backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Terminal 2 — frontend:
```bash
cd web/frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

### 4. Access from other devices on your network

Find your local IP (`ifconfig` on Mac/Linux, `ipconfig` on Windows).
Other devices on the same WiFi can access `http://YOUR_IP:5173`.
For access outside your network: `ngrok http 5173`.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/api/games` | Create a new game session |
| GET    | `/api/games` | List all games (optional `?status=finished`) |
| GET    | `/api/games/:id` | Get game status and players |
| GET    | `/api/games/:id/player/:pid` | Get player info |
| POST   | `/api/games/:id/player/:pid/input` | Submit player inputs |
| POST   | `/api/games/:id/start` | Start the simulation |
| GET    | `/api/games/:id/files` | List output files for a game |
| GET    | `/api/files/*` | Serve a file from simulation_outputs |

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `general_update` | Server → All | General simulation updates |
| `simulation_update` | Server → Player | Player-specific updates |
| `progress` | Server → All | Progress percentage |
| `phase_change` | Server → All | Game phase transitions |
