"""
File manager — the ONLY module that touches the simulation input/output folders.

Every read/write between the web app and the simulation filesystem goes through
this module. This keeps the boundary clean and makes it easy to change file
formats or folder structures later without touching the rest of the backend.
"""

import json
import os
from pathlib import Path
from typing import Any

from config import SIMULATION_INPUTS_DIR, SIMULATION_OUTPUTS_DIR


# ═══════════════════════════════════════════
#  WRITING INPUTS (web → simulation)
# ═══════════════════════════════════════════

def write_player_input(game_id: str, player_number: int, inputs: dict) -> Path:
    """
    Write a player's inputs to the simulation_inputs folder.

    Creates: simulation_inputs/<game_id>/player_<n>.json

    Args:
        game_id: The game session ID
        player_number: The player's number (1-indexed)
        inputs: The player's input data

    Returns:
        Path to the written file
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
        Dict mapping player number → input data.
        e.g. {1: {...}, 2: {...}}
    """
    game_dir = SIMULATION_INPUTS_DIR / game_id
    if not game_dir.exists():
        return {}

    inputs = {}
    for f in sorted(game_dir.glob("player_*.json")):
        # Extract player number from filename like "player_1.json"
        player_num = int(f.stem.split("_")[1])
        inputs[player_num] = json.loads(f.read_text())

    return inputs


# ═══════════════════════════════════════════
#  READING OUTPUTS (simulation → web)
# ═══════════════════════════════════════════

def list_output_files(game_id: str) -> list[dict]:
    """
    List all output files for a game.

    Returns a list of dicts with file metadata:
        [{"name": "summary.json", "path": "game_abc/summary.json", "size": 1234}, ...]
    """
    game_dir = SIMULATION_OUTPUTS_DIR / game_id
    if not game_dir.exists():
        return []

    files = []
    for f in game_dir.rglob("*"):
        if f.is_file() and not f.name.startswith("."):
            files.append({
                "name": f.name,
                "path": str(f.relative_to(SIMULATION_OUTPUTS_DIR)),
                "size": f.stat().st_size,
                "modified": f.stat().st_mtime,
            })

    return sorted(files, key=lambda x: x["name"])


def read_output_file(relative_path: str) -> tuple[Path, bool]:
    """
    Resolve a relative path within simulation_outputs and return the full path.

    Args:
        relative_path: Path relative to simulation_outputs/ (e.g. "game_abc/summary.json")

    Returns:
        Tuple of (full_path, exists)

    Raises:
        ValueError: If the path tries to escape simulation_outputs (path traversal)
    """
    full_path = (SIMULATION_OUTPUTS_DIR / relative_path).resolve()

    # Security: prevent path traversal attacks
    if not str(full_path).startswith(str(SIMULATION_OUTPUTS_DIR.resolve())):
        raise ValueError("Invalid path: attempted directory traversal")

    return full_path, full_path.exists()


def read_output_json(game_id: str, filename: str) -> Any | None:
    """
    Read and parse a JSON file from simulation_outputs/<game_id>/<filename>.

    Returns None if the file doesn't exist.
    """
    file_path = SIMULATION_OUTPUTS_DIR / game_id / filename
    if not file_path.exists():
        return None

    return json.loads(file_path.read_text())


def game_has_outputs(game_id: str) -> bool:
    """Check whether any output files exist for a game."""
    game_dir = SIMULATION_OUTPUTS_DIR / game_id
    if not game_dir.exists():
        return False
    return any(game_dir.rglob("*"))


# ═══════════════════════════════════════════
#  DEMO: Write fake outputs (remove later)
# ═══════════════════════════════════════════

def write_demo_outputs(game_id: str, player_inputs: dict[int, dict], step: int, total_steps: int):
    """
    Write demo output files to simulate what your real simulation would produce.

    This exists so you can develop the frontend without the real simulation.
    Delete this function once you integrate the actual simulation.
    """
    game_dir = SIMULATION_OUTPUTS_DIR / game_id
    game_dir.mkdir(parents=True, exist_ok=True)

    # Write a general summary file (updated each step)
    summary = {
        "game_id": game_id,
        "step": step,
        "total_steps": total_steps,
        "progress_percent": int((step / total_steps) * 100),
        "status": "running" if step < total_steps else "finished",
    }
    (game_dir / "summary.json").write_text(json.dumps(summary, indent=2))

    # Write per-player result files
    for player_num, inputs in player_inputs.items():
        player_result = {
            "player": player_num,
            "step": step,
            "inputs_received": inputs,
            "demo_score": step * (player_num + 1),  # Placeholder
        }
        (game_dir / f"player_{player_num}_results.json").write_text(
            json.dumps(player_result, indent=2)
        )
