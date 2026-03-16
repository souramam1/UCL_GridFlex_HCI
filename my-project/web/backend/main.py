"""
Main backend server — FastAPI for REST endpoints, Socket.IO for live updates.

The simulation is treated as a separate system. This server communicates with it
only through the filesystem via file_manager.py:
  - Writes player inputs to simulation/simulation_inputs/
  - Reads simulation results from simulation/simulation_outputs/

Run with: uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

import uuid
import asyncio
from contextlib import asynccontextmanager

import socketio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from database import get_db, init_db
import file_manager


# ── Socket.IO server ──

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")


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


class PlayerInput(BaseModel):
    inputs: dict


# ═══════════════════════════════════════════
#  REST Endpoints — Game Management
# ═══════════════════════════════════════════

@api.post("/api/games")
async def create_game(req: CreateGameRequest):
    """Create a new game session with n player slots."""
    if not 2 <= req.num_players <= 4:
        raise HTTPException(400, "Number of players must be between 2 and 4")

    game_id = uuid.uuid4().hex[:8]
    players = []

    db = await get_db()
    try:
        await db.execute(
            "INSERT INTO games (id, num_players) VALUES (?, ?)",
            (game_id, req.num_players),
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
    Saves to the database AND writes to simulation_inputs/ as a file.
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

        await db.execute(
            "UPDATE games SET status = 'running' WHERE id = ?", (game_id,)
        )
        await db.commit()
    finally:
        await db.close()

    # Read player inputs from the filesystem
    player_inputs = file_manager.get_all_player_inputs(game_id)

    # Run the demo simulation in background
    # TODO: Replace this with triggering your actual simulation
    asyncio.create_task(
        _run_demo_simulation(game_id, player_inputs)
    )

    return {"status": "running"}


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
                "created_at": g["created_at"],
            }
            for g in games
        ]
    }


# ═══════════════════════════════════════════
#  REST Endpoints — File Access
# ═══════════════════════════════════════════

@api.get("/api/games/{game_id}/files")
async def list_game_files(game_id: str):
    """List all output files for a game from simulation_outputs/."""
    files = file_manager.list_output_files(game_id)
    return {"game_id": game_id, "files": files}


@api.get("/api/files/{file_path:path}")
async def serve_output_file(file_path: str):
    """
    Serve a file from simulation_outputs/.
    The file_path is relative to simulation_outputs/.
    """
    try:
        full_path, exists = file_manager.read_output_file(file_path)
    except ValueError:
        raise HTTPException(400, "Invalid file path")

    if not exists:
        raise HTTPException(404, "File not found")

    return FileResponse(full_path)


# ═══════════════════════════════════════════
#  Demo Simulation Runner (replace later)
# ═══════════════════════════════════════════

async def _run_demo_simulation(game_id: str, player_inputs: dict):
    """
    Simulates a running simulation by writing demo output files and
    emitting WebSocket updates. Replace this entirely when you integrate
    your real simulation.

    When you integrate the real simulation, this function should:
    1. Trigger the simulation (subprocess, import, or however it runs)
    2. Watch simulation_outputs/<game_id>/ for new/changed files
    3. Emit WebSocket updates as results appear
    """
    total_steps = 10

    try:
        await sio.emit("phase_change", {"phase": "running"}, room=game_id)

        for step in range(1, total_steps + 1):
            await asyncio.sleep(1)  # Simulate computation time

            # Write demo output files (mimics what your real simulation would do)
            file_manager.write_demo_outputs(game_id, player_inputs, step, total_steps)

            # Emit progress
            await sio.emit(
                "progress",
                {"percent": int((step / total_steps) * 100)},
                room=game_id,
            )

            # Emit general update
            await sio.emit(
                "general_update",
                {"step": step, "message": f"Completed step {step}/{total_steps}"},
                room=game_id,
            )

            # Emit player-specific updates
            for player_num in player_inputs:
                player_room = f"{game_id}:player:{player_num}"
                await sio.emit(
                    "simulation_update",
                    {
                        "step": step,
                        "message": f"Player {player_num} result for step {step}",
                    },
                    room=player_room,
                )

        # Mark as finished
        db = await get_db()
        try:
            await db.execute(
                "UPDATE games SET status = 'finished' WHERE id = ?", (game_id,)
            )
            await db.commit()
        finally:
            await db.close()

        await sio.emit("phase_change", {"phase": "finished"}, room=game_id)

    except Exception as e:
        print(f"Simulation error for game {game_id}: {e}")
        await sio.emit("general_update", {"error": str(e)}, room=game_id)


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
    sio.enter_room(sid, game_id)

    # Players also join their personal room (for player-specific updates)
    if player_id and player_id != "main":
        db = await get_db()
        try:
            cursor = await db.execute(
                "SELECT number FROM players WHERE id = ?", (player_id,)
            )
            player = await cursor.fetchone()
            if player:
                sio.enter_room(sid, f"{game_id}:player:{player['number']}")
        finally:
            await db.close()

    print(f"Client {sid} joined game {game_id} as {player_id or 'main screen'}")


@sio.event
async def disconnect(sid):
    print(f"Client {sid} disconnected")


# ── Mount Socket.IO onto FastAPI ──

app = socketio.ASGIApp(sio, other_app=api)
