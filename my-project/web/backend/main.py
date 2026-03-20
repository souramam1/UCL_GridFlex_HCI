"""
Main backend server — FastAPI for REST endpoints, Socket.IO for live updates.

The simulation is treated as a separate system. This server communicates with it
only through the filesystem via file_manager.py:
  - Writes player inputs to simulation/input/
  - Reads simulation results from simulation/runs/<run_id>/

Run with: uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

import uuid
import sys
import asyncio
import subprocess
from datetime import datetime
from contextlib import asynccontextmanager

import socketio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from database import get_db, init_db
from config import MOCK_SIMULATOR_PATH, PROJECT_ROOT
import file_manager


# ── Socket.IO server ──

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")


# ── In-memory state for active simulations ──

active_simulations: dict[str, dict] = {}


# ── FastAPI app ──

@asynccontextmanager
async def lifespan(app):
    """Runs on startup — initialise the database."""
    await init_db()
    print("Database initialised.")
    yield

api = FastAPI(lifespan=lifespan)

api.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic models ──

class CreateGameRequest(BaseModel):
    num_players: int
    scenario_id: int = 1
    scenario_name: str = "Scenario I"


class PlayerInput(BaseModel):
    inputs: dict


# ═══════════════════════════════════════════
#  REST Endpoints — Game Management
# ═══════════════════════════════════════════

@api.post("/api/games")
async def create_game(req: CreateGameRequest):
    """Create a new game session with n player slots."""
    if not 1 <= req.num_players <= 4:
        raise HTTPException(400, "Number of players must be between 1 and 4")

    game_id = uuid.uuid4().hex[:8]
    players = []

    db = await get_db()
    try:
        await db.execute(
            "INSERT INTO games (id, num_players, scenario_id, scenario_name) VALUES (?, ?, ?, ?)",
            (game_id, req.num_players, req.scenario_id, req.scenario_name),
        )

        for i in range(req.num_players):
            player_id = uuid.uuid4().hex[:8]
            await db.execute(
                "INSERT INTO players (id, game_id, number) VALUES (?, ?, ?)",
                (player_id, game_id, i + 1),
            )
            players.append({"id": player_id, "number": i + 1})

        await db.commit()
    finally:
        await db.close()

    return {"game_id": game_id, "players": players}


@api.get("/api/games/{game_id}")
async def get_game(game_id: str):
    """Get game status and player info."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM games WHERE id = ?", (game_id,))
        game = await cursor.fetchone()
        if not game:
            raise HTTPException(404, "Game not found")

        cursor = await db.execute(
            "SELECT id, number, has_submitted FROM players WHERE game_id = ? ORDER BY number",
            (game_id,),
        )
        players = await cursor.fetchall()
    finally:
        await db.close()

    return {
        "id": game["id"],
        "status": game["status"],
        "num_players": game["num_players"],
        "scenario_id": game["scenario_id"],
        "scenario_name": game["scenario_name"],
        "run_id": game["run_id"],
        "created_at": game["created_at"],
        "players": [
            {
                "id": p["id"],
                "number": p["number"],
                "has_submitted": bool(p["has_submitted"]),
            }
            for p in players
        ],
    }


@api.get("/api/games/{game_id}/player/{player_id}")
async def get_player(game_id: str, player_id: str):
    """Get player info and current game status."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT status FROM games WHERE id = ?", (game_id,))
        game = await cursor.fetchone()
        if not game:
            raise HTTPException(404, "Game not found")

        cursor = await db.execute(
            "SELECT * FROM players WHERE id = ? AND game_id = ?",
            (player_id, game_id),
        )
        player = await cursor.fetchone()
        if not player:
            raise HTTPException(404, "Player not found")
    finally:
        await db.close()

    return {
        "id": player["id"],
        "number": player["number"],
        "has_submitted": bool(player["has_submitted"]),
        "game_status": game["status"],
    }


@api.post("/api/games/{game_id}/player/{player_id}/input")
async def submit_input(game_id: str, player_id: str, req: PlayerInput):
    """
    Submit a player's inputs.
    Saves to the database AND writes to input/ as a file.
    """
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM players WHERE id = ? AND game_id = ?",
            (player_id, game_id),
        )
        player = await cursor.fetchone()
        if not player:
            raise HTTPException(404, "Player not found")

        await db.execute(
            "UPDATE players SET has_submitted = 1 WHERE id = ?",
            (player_id,),
        )
        await db.commit()
    finally:
        await db.close()

    # Write inputs to the filesystem for the simulation to read
    file_manager.write_player_input(game_id, player["number"], req.inputs)

    # Notify the game room that a player has joined
    await sio.emit("player_joined", {
        "player_id": player_id,
        "player_number": player["number"],
    }, room=game_id)
    return {"status": "submitted"}


@api.post("/api/games/{game_id}/start")
async def start_game(game_id: str):
    """Start the simulation. All players must have submitted inputs."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM games WHERE id = ?", (game_id,))
        game = await cursor.fetchone()
        if not game:
            raise HTTPException(404, "Game not found")

        cursor = await db.execute(
            "SELECT * FROM players WHERE game_id = ?", (game_id,)
        )
        players = await cursor.fetchall()

        if not all(p["has_submitted"] for p in players):
            raise HTTPException(400, "Not all players have submitted inputs")

        # Generate timestamp-based run ID
        run_id = f"run_{datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}"

        await db.execute(
            "UPDATE games SET status = 'running', run_id = ? WHERE id = ?",
            (run_id, game_id),
        )
        await db.commit()
    finally:
        await db.close()

    # Read player inputs and assemble scenario info
    player_inputs = file_manager.get_all_player_inputs(game_id)
    scenario = {
        "id": game["scenario_id"],
        "name": game["scenario_name"],
    }

    # Launch the simulation
    await _launch_simulation(game_id, run_id, scenario, player_inputs)

    return {"status": "running", "run_id": run_id}


@api.get("/api/games")
async def list_games(status: str = None):
    """List games, optionally filtered by status."""
    db = await get_db()
    try:
        if status:
            cursor = await db.execute(
                "SELECT * FROM games WHERE status = ? ORDER BY created_at DESC",
                (status,),
            )
        else:
            cursor = await db.execute(
                "SELECT * FROM games ORDER BY created_at DESC"
            )
        games = await cursor.fetchall()
    finally:
        await db.close()

    return {
        "games": [
            {
                "id": g["id"],
                "num_players": g["num_players"],
                "status": g["status"],
                "run_id": g["run_id"],
                "created_at": g["created_at"],
            }
            for g in games
        ]
    }


# ═══════════════════════════════════════════
#  REST Endpoints — Step Data (for refresh / late join)
# ═══════════════════════════════════════════

@api.get("/api/games/{game_id}/step/{step_num}")
async def get_step_data(game_id: str, step_num: int):
    """Get grid and agent data for a specific step."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT run_id FROM games WHERE id = ?", (game_id,))
        game = await cursor.fetchone()
        if not game or not game["run_id"]:
            raise HTTPException(404, "Run not found")
    finally:
        await db.close()

    run_id = game["run_id"]
    grid_data = file_manager.read_grid_results(run_id)
    step_grid = [g for g in grid_data if g.get("step") == step_num]

    agent_data = {}
    for house_num in range(1, 5):
        data = file_manager.read_agent_data(run_id, f"house_{house_num}")
        step_data = [d for d in data if d.get("step") == step_num]
        if step_data:
            agent_data[f"house_{house_num}"] = step_data

    return {
        "step": step_num,
        "grid": step_grid,
        "agents": agent_data,
    }


# ═══════════════════════════════════════════
#  REST Endpoints — File Access
# ═══════════════════════════════════════════

@api.get("/api/games/{game_id}/files")
async def list_game_files(game_id: str):
    """List all output files for a game from simulation outputs."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT run_id FROM games WHERE id = ?", (game_id,))
        game = await cursor.fetchone()
    finally:
        await db.close()

    run_id = game["run_id"] if game and game["run_id"] else game_id
    files = file_manager.list_output_files(run_id)
    return {"game_id": game_id, "files": files}


@api.get("/api/files/{file_path:path}")
async def serve_output_file(file_path: str):
    """Serve a file from simulation outputs."""
    try:
        full_path, exists = file_manager.read_output_file(file_path)
    except ValueError:
        raise HTTPException(400, "Invalid file path")

    if not exists:
        raise HTTPException(404, "File not found")

    return FileResponse(full_path)


# ═══════════════════════════════════════════
#  Simulation Launcher + Event Watcher
# ═══════════════════════════════════════════

async def _launch_simulation(game_id: str, run_id: str, scenario: dict,
                             player_inputs: dict):
    """
    1. Write input YAML
    2. Launch mock_simulator.py as subprocess
    3. Start the event watcher task
    """
    # Write the consolidated input YAML
    input_path = file_manager.write_run_input_yaml(run_id, scenario, player_inputs)
    run_dir = file_manager.get_run_dir(run_id)

    # Launch the mock simulator as a subprocess
    proc = subprocess.Popen(
        [
            sys.executable,
            str(MOCK_SIMULATOR_PATH),
            "--input", str(input_path),
            "--run-dir", str(run_dir),
            "--delay", "1.5",
            "--scenario", "negotiation",
        ],
        cwd=str(PROJECT_ROOT / "simulation"),
    )

    # Track this simulation in memory
    # current_step starts at 0 so first Step click releases step 1
    # (mock simulator uses 1-based step numbers)
    active_simulations[game_id] = {
        "process": proc,
        "run_id": run_id,
        "last_event_line": 0,
        "current_step": 0,
        "step_events_queue": {},
        "mode": "playback",
        "sim_finished": False,
        "total_steps": 8,
        "completion_event": None,
        "releasing": False,
    }

    # Start watching events in the background
    asyncio.create_task(_watch_events(game_id))


async def _watch_events(game_id: str):
    """
    Poll events.jsonl every 0.5s for new lines.
    Queue step events — they are only released when the GM clicks Step.
    simulation_complete is held until the GM has stepped through all steps.
    """
    sim = active_simulations.get(game_id)
    if not sim:
        return

    run_id = sim["run_id"]

    while True:
        new_events = file_manager.tail_events_file(run_id, sim["last_event_line"])

        for event in new_events:
            sim["last_event_line"] += 1
            event_type = event.get("event")

            if event_type == "simulation_complete":
                # DON'T broadcast yet — hold until GM has stepped through all steps
                sim["sim_finished"] = True
                sim["completion_event"] = event
                print(f"[{game_id}] Simulation finished writing all events. "
                      f"Waiting for GM to step through all {sim['total_steps']} steps.")
                continue

            if event_type == "simulation_started":
                # Capture total_steps from the event
                sim["total_steps"] = event.get("total_steps", 8)
                # Broadcast immediately — tells frontend the sim is running
                await _broadcast_event(game_id, event)
                continue

            step = event.get("step")

            if step is not None:
                # Queue events by step number (released when GM clicks Step)
                sim["step_events_queue"].setdefault(step, []).append(event)
            else:
                # Other global events — broadcast immediately
                await _broadcast_event(game_id, event)

        # Check if process exited AND we've read all events
        proc_done = sim["process"].poll() is not None
        if proc_done and not new_events:
            if not sim["sim_finished"]:
                # Process died without writing simulation_complete — error
                status = file_manager.read_status(run_id)
                if not status or status.get("state") != "completed":
                    await sio.emit("simulation_error", {
                        "error": "Simulation process terminated unexpectedly",
                    }, room=game_id)
                    return

            # Watcher exits, but the simulation stays in active_simulations.
            # The GM can still Step through queued events.
            print(f"[{game_id}] Event watcher done. "
                  f"Queued steps: {sorted(sim['step_events_queue'].keys())}")
            return

        await asyncio.sleep(0.5)


async def _release_step_events(game_id: str, step: int):
    """Broadcast queued events for a step with deliberate delays."""
    sim = active_simulations.get(game_id)
    if not sim:
        return

    events = sim["step_events_queue"].get(step, [])
    run_id = sim["run_id"]

    for event in events:
        event_type = event.get("event")

        # Enrich step_complete with grid + agent data
        if event_type == "step_complete":
            grid_data = file_manager.read_grid_results(run_id)
            step_grid = [g for g in grid_data if g.get("step") == step]
            if step_grid:
                event["grid_data"] = step_grid[-1]

        await _broadcast_event(game_id, event)

        # Deliberate delays between event types for readability
        if event_type == "agent_speech":
            await asyncio.sleep(1.5)
        elif event_type == "grid_violation":
            await asyncio.sleep(2.0)
        elif event_type == "decisions_made":
            await asyncio.sleep(1.0)
        else:
            await asyncio.sleep(0.3)

    # Send player-specific data for this step
    num_players = len(file_manager.get_all_player_inputs(
        game_id
    )) or 4

    for house_num in range(1, num_players + 1):
        agent_data = file_manager.read_agent_data(run_id, f"house_{house_num}")
        step_data = [d for d in agent_data if d.get("step") == step]
        if step_data:
            player_room = f"{game_id}:player:{house_num}"
            await sio.emit("player_step_data", {
                "step": step,
                "agent_data": step_data[-1],
            }, room=player_room)

    sim["current_step"] = step

    # Check if this was the last step — if so, broadcast completion
    if sim.get("sim_finished") and step >= sim.get("total_steps", 8):
        print(f"[{game_id}] All {step} steps released. Broadcasting completion.")
        completion = sim.get("completion_event") or {"event": "simulation_complete"}
        await _broadcast_event(game_id, completion)
        await _handle_sim_complete(game_id)


async def _broadcast_event(game_id: str, event: dict):
    """Send an event to the game room via WebSocket."""
    event_type = event.get("event", "simulation_event")

    # Map to specific WebSocket event names
    ws_event_map = {
        "simulation_started": "simulation_started",
        "step_started": "step_started",
        "decisions_made": "decisions_made",
        "grid_violation": "grid_violation",
        "negotiation_started": "negotiation_started",
        "agent_speech": "agent_speech",
        "step_complete": "step_complete",
        "simulation_complete": "simulation_complete",
    }

    ws_event = ws_event_map.get(event_type, "simulation_event")
    await sio.emit(ws_event, event, room=game_id)


async def _handle_sim_complete(game_id: str):
    """Mark game as finished in the database."""
    db = await get_db()
    try:
        await db.execute(
            "UPDATE games SET status = 'finished' WHERE id = ?", (game_id,)
        )
        await db.commit()
    finally:
        await db.close()

    # Clean up active simulation entry
    active_simulations.pop(game_id, None)


# ═══════════════════════════════════════════
#  Socket.IO Event Handlers
# ═══════════════════════════════════════════

@sio.event
async def connect(sid, environ):
    """Handle new WebSocket connections — join the appropriate rooms."""
    from urllib.parse import parse_qs

    query = parse_qs(environ.get("QUERY_STRING", ""))
    game_id = query.get("game_id", [None])[0]
    player_id = query.get("player_id", [None])[0]

    if not game_id:
        return False  # Reject connection

    # Everyone joins the game room (for general updates)
    await sio.enter_room(sid, game_id)

    # Players also join their personal room (for player-specific updates)
    if player_id and player_id != "main":
        db = await get_db()
        try:
            cursor = await db.execute(
                "SELECT number FROM players WHERE id = ?", (player_id,)
            )
            player = await cursor.fetchone()
            if player:
                await sio.enter_room(sid, f"{game_id}:player:{player['number']}")
        finally:
            await db.close()

    print(f"Client {sid} joined game {game_id} as {player_id or 'main screen'}")


@sio.event
async def disconnect(sid):
    print(f"Client {sid} disconnected")


@sio.event
async def request_step(sid, data):
    """GM clicks Step button — release the next step's queued events."""
    game_id = data.get("game_id")
    sim = active_simulations.get(game_id)
    if not sim:
        return

    # Prevent concurrent step releases (speeches take ~1.5s each)
    if sim.get("releasing"):
        await sio.emit("step_not_ready", {
            "message": "Still processing current step. Please wait.",
        }, to=sid)
        return

    next_step = sim["current_step"] + 1

    if sim["mode"] == "playback":
        # Release queued events for the next step
        if next_step in sim["step_events_queue"]:
            sim["releasing"] = True
            try:
                await _release_step_events(game_id, next_step)
            finally:
                sim["releasing"] = False
        elif sim.get("sim_finished") and next_step > sim.get("total_steps", 8):
            # All steps already completed
            await sio.emit("step_not_ready", {
                "message": "All steps have been completed",
            }, to=sid)
        else:
            # Events not yet available — simulator still running
            await sio.emit("step_not_ready", {
                "message": f"Step {next_step} data not yet available. Simulator still processing.",
            }, to=sid)
    else:
        # sim_control mode — tell the simulator to proceed
        file_manager.write_control(sim["run_id"], "proceed")


@sio.event
async def request_stop(sid, data):
    """GM clicks Stop button — terminate the simulation."""
    game_id = data.get("game_id")
    sim = active_simulations.get(game_id)
    if not sim:
        return

    # Kill the subprocess (if still running)
    try:
        sim["process"].terminate()
    except OSError:
        pass

    # Update database
    db = await get_db()
    try:
        await db.execute(
            "UPDATE games SET status = 'stopped' WHERE id = ?", (game_id,)
        )
        await db.commit()
    finally:
        await db.close()

    # Notify all clients
    await sio.emit("simulation_stopped", {}, room=game_id)

    # Clean up
    active_simulations.pop(game_id, None)


# ── Mount Socket.IO onto FastAPI ──

app = socketio.ASGIApp(sio, other_asgi_app=api)
