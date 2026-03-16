# Simulation

This folder contains the simulation tool and its input/output directories.

## Folder Contract

The web application communicates with the simulation **only** through these two folders:

### `simulation_inputs/`

The web backend writes player input files here. The structure within this folder
is up to you — it will be organised per game session. For example:

```
simulation_inputs/
└── game_a1b2c3d4/
    ├── player_1.json
    ├── player_2.json
    └── ...
```

### `simulation_outputs/`

The simulation writes its results here. The web backend reads from this folder
to serve results to the frontend. The structure within is flexible — the web app
will list and serve whatever files appear here. For example:

```
simulation_outputs/
└── game_a1b2c3d4/
    ├── summary.json
    ├── player_1_results.json
    ├── player_2_results.json
    └── ...
```

## Important

- The web app never modifies files in `simulation_outputs/`
- The simulation never needs to read from `simulation_outputs/` via the web app
- File formats (JSON, CSV, etc.) are up to you — define them as you build out the simulation
- The web app's `config.py` points to these folders; update it if you move them
