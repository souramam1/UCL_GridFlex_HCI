"""
Configuration — single source of truth for paths and settings.

All paths to the simulation folders are defined here so that
the rest of the backend never hardcodes them. If you move the
simulation folder, update SIMULATION_ROOT and everything else adapts.

Folder layout:
  simulation/
    input/                    <-- per-game player JSON files (pre-run)
    runs/<run_id>/            <-- everything for one simulation run
      input/                  <-- consolidated YAML config
      control/                <-- handshake files (events, status, control)
      output/                 <-- simulation results (grid, per-agent, summary)
"""

import os
from pathlib import Path

# ── Project layout ──
# This file lives at: my-project/web/backend/config.py
# So we go up two levels to reach the project root.

BACKEND_DIR = Path(__file__).resolve().parent
WEB_DIR = BACKEND_DIR.parent
PROJECT_ROOT = WEB_DIR.parent

# ── Simulation paths ──

SIMULATION_ROOT = PROJECT_ROOT / "simulation"
SIMULATION_INPUTS_DIR = SIMULATION_ROOT / "input"       # per-game player JSONs
SIMULATION_RUNS_DIR = SIMULATION_ROOT / "runs"           # per-run directories

# ── Mock simulator path ──

MOCK_SIMULATOR_PATH = SIMULATION_ROOT / "mock_simulator.py"

# ── Database ──

DATABASE_PATH = BACKEND_DIR / "simulation.db"

# ── Ensure directories exist ──

SIMULATION_INPUTS_DIR.mkdir(parents=True, exist_ok=True)
SIMULATION_RUNS_DIR.mkdir(parents=True, exist_ok=True)
