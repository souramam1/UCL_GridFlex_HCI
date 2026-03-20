"""
File manager — the ONLY module that touches the simulation input/output folders.

Every read/write between the web app and the simulation filesystem goes through
this module. This keeps the boundary clean and makes it easy to change file
formats or folder structures later without touching the rest of the backend.

Run directory layout:
    simulation/runs/<run_id>/
        input/              <-- consolidated YAML config
        control/            <-- handshake files (events, status, control)
        output/             <-- simulation results
            collective/     <-- grid_results.jsonl
            per_agent/      <-- house_N.jsonl
            summary/        <-- network_stats.json
"""

import json
from pathlib import Path
from typing import Any

import yaml

from config import SIMULATION_INPUTS_DIR, SIMULATION_RUNS_DIR


# ── Helpers ──

def _run_dir(run_id: str) -> Path:
    """Root directory for a run: simulation/runs/<run_id>/"""
    return SIMULATION_RUNS_DIR / run_id


def _control_dir(run_id: str) -> Path:
    """Control directory: simulation/runs/<run_id>/control/"""
    return _run_dir(run_id) / "control"


def _output_dir(run_id: str) -> Path:
    """Output directory: simulation/runs/<run_id>/output/"""
    return _run_dir(run_id) / "output"


# ═══════════════════════════════════════════
#  WRITING INPUTS (web → simulation)
# ═══════════════════════════════════════════

def write_player_input(game_id: str, player_number: int, inputs: dict) -> Path:
    """
    Write a single player's inputs as JSON (intermediate storage).
    The backend consolidates these into a YAML file when the GM starts the sim.

    Creates: simulation/input/<game_id>/player_<n>.json
    """
    game_dir = SIMULATION_INPUTS_DIR / game_id
    game_dir.mkdir(parents=True, exist_ok=True)

    file_path = game_dir / f"player_{player_number}.json"
    file_path.write_text(json.dumps(inputs, indent=2))

    return file_path


def get_all_player_inputs(game_id: str) -> dict[int, dict]:
    """
    Read all player input files for a game.

    Returns:
        Dict mapping player number -> input data.
        e.g. {1: {...}, 2: {...}}
    """
    game_dir = SIMULATION_INPUTS_DIR / game_id
    if not game_dir.exists():
        return {}

    inputs = {}
    for f in sorted(game_dir.glob("player_*.json")):
        player_num = int(f.stem.split("_")[1])
        inputs[player_num] = json.loads(f.read_text())

    return inputs


def write_run_input_yaml(run_id: str, scenario: dict, player_inputs: dict[int, dict]) -> Path:
    """
    Assemble and write the simulation input YAML file.

    Creates: simulation/runs/<run_id>/input/<run_id>.yaml

    Args:
        run_id: Timestamp-based run identifier (e.g. "run_2026-03-19_14-30-00")
        scenario: Dict with 'id' and 'name'
        player_inputs: Dict mapping player_number -> input dict with keys:
            ev_battery_kwh, car_away_from, car_away_until, target_soc_pct,
            initial_soc_pct, cooperative, agent_behaviour
    """
    households = {}
    for player_num, inputs in sorted(player_inputs.items()):
        households[f"house_{player_num}"] = {
            "player_id": f"player_{player_num}",
            "ev_battery_kwh": inputs.get("ev_battery_kwh", 35.0),
            "car_away_from": inputs.get("car_away_from", "07:00"),
            "car_away_until": inputs.get("car_away_until", "21:00"),
            "target_soc_pct": inputs.get("target_soc_pct", 60.0),
            "initial_soc_pct": inputs.get("initial_soc_pct", 20.0),
            "cooperative": inputs.get("cooperative", True),
            "agent_behaviour": inputs.get("agent_behaviour", ""),
        }

    config = {
        "run_id": run_id,
        "scenario": scenario,
        "players": len(player_inputs),
        "households": households,
    }

    input_dir = _run_dir(run_id) / "input"
    input_dir.mkdir(parents=True, exist_ok=True)

    file_path = input_dir / f"{run_id}.yaml"
    file_path.write_text(yaml.dump(config, default_flow_style=False, sort_keys=False))

    return file_path


# ═══════════════════════════════════════════
#  READING CONTROL FILES (simulation ↔ web)
# ═══════════════════════════════════════════

def get_run_dir(run_id: str) -> Path:
    """Return the root directory for a run (passed as --output to simulator)."""
    return _run_dir(run_id)


def tail_events_file(run_id: str, after_line: int = 0) -> list[dict]:
    """
    Read new lines from control/events.jsonl starting after the given line number.
    Non-blocking: returns empty list if file missing or no new lines.
    """
    events_path = _control_dir(run_id) / "events.jsonl"
    if not events_path.exists():
        return []

    events = []
    try:
        with open(events_path) as f:
            for i, line in enumerate(f):
                if i >= after_line:
                    line = line.strip()
                    if line:
                        events.append(json.loads(line))
    except (json.JSONDecodeError, OSError):
        pass

    return events


def read_status(run_id: str) -> dict | None:
    """Read and parse control/status.json for a run."""
    path = _control_dir(run_id) / "status.json"
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text())
    except (json.JSONDecodeError, OSError):
        return None


def write_control(run_id: str, command: str):
    """Write a command to control/control.json (e.g. 'pause', 'proceed')."""
    path = _control_dir(run_id) / "control.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"command": command}))


def read_initial_state(run_id: str) -> dict | None:
    """Read control/initial_state.json for a run."""
    path = _control_dir(run_id) / "initial_state.json"
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text())
    except (json.JSONDecodeError, OSError):
        return None


# ═══════════════════════════════════════════
#  READING OUTPUTS (simulation → web)
# ═══════════════════════════════════════════

def read_grid_results(run_id: str) -> list[dict]:
    """Read all lines from output/collective/grid_results.jsonl."""
    path = _output_dir(run_id) / "collective" / "grid_results.jsonl"
    if not path.exists():
        return []
    results = []
    try:
        with open(path) as f:
            for line in f:
                line = line.strip()
                if line:
                    results.append(json.loads(line))
    except (json.JSONDecodeError, OSError):
        pass
    return results


def read_agent_data(run_id: str, house_id: str) -> list[dict]:
    """Read all lines from output/per_agent/<house_id>.jsonl."""
    path = _output_dir(run_id) / "per_agent" / f"{house_id}.jsonl"
    if not path.exists():
        return []
    results = []
    try:
        with open(path) as f:
            for line in f:
                line = line.strip()
                if line:
                    results.append(json.loads(line))
    except (json.JSONDecodeError, OSError):
        pass
    return results


def read_network_stats(run_id: str) -> dict | None:
    """Read output/summary/network_stats.json."""
    path = _output_dir(run_id) / "summary" / "network_stats.json"
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text())
    except (json.JSONDecodeError, OSError):
        return None


# ═══════════════════════════════════════════
#  GENERAL FILE ACCESS (for DataLog etc.)
# ═══════════════════════════════════════════

def list_output_files(run_id: str) -> list[dict]:
    """List all files for a run (across input/, control/, and output/)."""
    run_root = _run_dir(run_id)
    if not run_root.exists():
        return []

    files = []
    for f in run_root.rglob("*"):
        if f.is_file() and not f.name.startswith("."):
            files.append({
                "name": f.name,
                "path": str(f.relative_to(SIMULATION_RUNS_DIR)),
                "size": f.stat().st_size,
                "modified": f.stat().st_mtime,
            })

    return sorted(files, key=lambda x: x["name"])


def read_output_file(relative_path: str) -> tuple[Path, bool]:
    """
    Resolve a relative path within simulation/runs/ and return the full path.
    Raises ValueError on path traversal attempts.
    """
    full_path = (SIMULATION_RUNS_DIR / relative_path).resolve()

    if not str(full_path).startswith(str(SIMULATION_RUNS_DIR.resolve())):
        raise ValueError("Invalid path: attempted directory traversal")

    return full_path, full_path.exists()


def read_output_json(run_id: str, filename: str) -> Any | None:
    """Read and parse a JSON file from a run's output directory."""
    file_path = _output_dir(run_id) / filename
    if not file_path.exists():
        return None
    return json.loads(file_path.read_text())


def game_has_outputs(run_id: str) -> bool:
    """Check whether any output files exist for a run."""
    run_root = _run_dir(run_id)
    if not run_root.exists():
        return False
    return any(run_root.rglob("*"))
