"""
SQLite database for storing game sessions, player state, and metadata.
Uses aiosqlite for async access compatible with FastAPI.
"""

import aiosqlite

from config import DATABASE_PATH


async def get_db():
    """Get an async database connection."""
    db = await aiosqlite.connect(str(DATABASE_PATH))
    db.row_factory = aiosqlite.Row
    return db


async def init_db():
    """Create tables if they don't exist. Called on app startup."""
    db = await get_db()
    try:
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS games (
                id TEXT PRIMARY KEY,
                num_players INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'waiting',
                scenario_id INTEGER,
                scenario_name TEXT,
                run_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS players (
                id TEXT PRIMARY KEY,
                game_id TEXT NOT NULL,
                number INTEGER NOT NULL,
                has_submitted INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (game_id) REFERENCES games(id)
            );
        """)
        await db.commit()
    finally:
        await db.close()
