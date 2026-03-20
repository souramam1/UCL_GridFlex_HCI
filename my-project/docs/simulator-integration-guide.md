# GridFlex Simulator Integration Guide

> **Audience:** Developer of the Concordia-based simulator (and their Claude).
> This document specifies the exact file-based interface between the simulator
> and the GridFlex web application.  Follow this contract and the two systems
> will interoperate without touching each other's code.

---

## 1. How the Simulator Is Launched

The backend spawns the simulator as a **subprocess**.  The command line is:

```
python <simulator_path>
    --input   <path_to_input_yaml>
    --run-dir <path_to_run_directory>
    --delay   1.5
    --scenario negotiation
```

| Argument      | Type   | Description |
|---------------|--------|-------------|
| `--input`     | path   | Absolute path to the input YAML file (see §2) |
| `--run-dir`   | path   | Root of this run's directory tree (see §3) |
| `--delay`     | float  | Seconds between steps (cosmetic; simulator may ignore) |
| `--scenario`  | string | `"clean"` (no grid violations) or `"negotiation"` (violations + agent dialogue) |

The simulator should:
1. Read the input YAML
2. Create its subdirectories under `--run-dir`
3. Write events, status, and output files as described below
4. Exit with code 0 on success, non-zero on error

---

## 2. Input YAML Format

Written by the backend to: `<run_dir>/input/<run_id>.yaml`

The simulator receives the absolute path via `--input`.

```yaml
run_id: "run_2026-03-19_14-30-00"
scenario:
  id: 1
  name: "Scenario I"
players: 4
households:
  house_1:
    player_id: "player_1"
    ev_battery_kwh: 35.0          # Battery capacity (kWh)
    car_away_from: "07:00"        # Car leaves home (HH:MM)
    car_away_until: "21:00"       # Car returns home (HH:MM)
    target_soc_pct: 60.0          # Desired SOC by departure (%)
    initial_soc_pct: 20.0         # SOC when simulation starts (%)
    cooperative: true             # Agent personality flag
    agent_behaviour: ""           # Free-text behaviour instruction
  house_2:
    # ... same structure
  house_3:
    # ...
  house_4:
    # ...
```

**Key rules:**
- `house_N` keys use 1-based numbering matching `player_N`
- All time fields are `HH:MM` strings (24-hour format)
- `cooperative` and `agent_behaviour` are passed through to the Concordia agents
- The simulator must handle 1–6 households (currently tested with 4)

---

## 3. Run Directory Structure

The `--run-dir` argument points to the root.  The simulator must create and write to these subdirectories:

```
<run_dir>/                          (e.g. simulation/runs/run_2026-03-19_14-30-00/)
├── input/                          (already exists — written by backend)
│   └── run_2026-03-19_14-30-00.yaml
├── control/                        ← SIMULATOR CREATES THIS
│   ├── events.jsonl                ← append-only event stream
│   ├── status.json                 ← current simulator state
│   ├── control.json                ← read by simulator, written by backend
│   └── initial_state.json          ← written once at startup
└── output/                         ← SIMULATOR CREATES THIS
    ├── collective/
    │   └── grid_results.jsonl      ← one row per (step, round) pair
    ├── per_agent/
    │   ├── house_1.jsonl           ← one row per (step, round) per agent
    │   ├── house_2.jsonl
    │   └── ...
    └── summary/
        └── network_stats.json      ← written once at end
```

**Important:** The `input/` directory and YAML file already exist when the simulator starts.  The simulator creates `control/` and `output/` and all their contents.

---

## 4. Control Files (control/)

These files form the handshake between simulator and backend.

### 4.1 events.jsonl — Event Stream

**Format:** Append-only, one JSON object per line (JSONL).

The backend polls this file every 0.5 seconds.  Each line must be a complete, self-contained JSON object terminated by `\n`.

**The backend routes events as follows:**

| Event type | Has `step` field? | Backend behaviour |
|---|---|---|
| `simulation_started` | No | Broadcast to frontend immediately |
| `simulation_complete` | No | **Held** until GM has stepped through all steps |
| Any event with `step` field | Yes | **Queued** by step number, released when GM clicks "Step" |
| Any other event | No | Broadcast immediately |

This means the simulator can write events at its own pace.  The backend queues them and the GM controls when they reach the frontend.

### 4.2 status.json — Simulator State

**Format:** JSON, overwritten in place.

```json
{
  "state": "running",
  "current_step": 3,
  "current_round": 2,
  "total_steps": 8,
  "phase": "negotiation",
  "sim_time": "2026-01-15 22:00",
  "wall_clock_started": "2026-03-19T14:30:00.123456",
  "error": null
}
```

| Field | Type | Values |
|---|---|---|
| `state` | string | `"running"`, `"paused"`, `"completed"`, `"error"` |
| `current_step` | int | 1-based step number |
| `current_round` | int | 1 = initial operation, 2 = post-negotiation |
| `total_steps` | int | Total steps in simulation |
| `phase` | string | `"operation"` or `"negotiation"` |
| `sim_time` | string | Simulated time as `"YYYY-MM-DD HH:MM"` |
| `wall_clock_started` | string | ISO 8601 wall-clock timestamp |
| `error` | string or null | Error message if `state == "error"` |

**When to update:**
- At startup: `state="running"`, `current_step=1`, etc.
- At each step: update `current_step`, `sim_time`, `phase`
- At negotiation: update `current_round=2`, `phase="negotiation"`
- On completion: `state="completed"`
- On error: `state="error"`, `error="<message>"`

### 4.3 control.json — Backend Commands

**Format:** JSON, written by the backend.

```json
{"command": ""}
```

The simulator should initialise this file with `{"command": ""}` at startup.

**Possible commands:**
| Command | Meaning |
|---|---|
| `""` (empty) | Continue normally |
| `"pause"` | Pause at next step boundary |
| `"proceed"` | Resume after pause |

**Current behaviour:** The backend only uses this in `sim_control` mode (not yet active).  In the current `playback` mode, the simulator runs freely and the backend queues events.  However, the simulator **should** poll `control.json` at step boundaries for forward compatibility:

```python
# Poll at the start of each step
while read_control(run_dir) == "pause":
    update_status(run_dir, state="paused")
    time.sleep(0.5)
update_status(run_dir, state="running")
```

### 4.4 initial_state.json — Starting Conditions

**Format:** JSON, written once before the first event.

```json
{
  "agents": {
    "House 1": {
      "soc_pct": 20.0,
      "connected": false,
      "battery_kwh": 35,
      "charger_kw": 10,
      "target_soc_pct": 80,
      "car_away_from": "07:00",
      "car_away_until": "21:00",
      "cooperative": true
    },
    "House 2": { ... }
  },
  "grid": {
    "total_load_kw": 0,
    "max_line_loading_percent": 0,
    "max_voltage_drop_pu": 0
  }
}
```

The frontend reads this for the initial display before step 1 data arrives.

---

## 5. Event Schemas (events.jsonl)

Every event must include:
- `"event"` — event type string
- `"timestamp"` — ISO 8601 wall-clock time (e.g. `"2026-03-19T14:30:05.123456"`)

### 5.1 simulation_started

Emitted **once**, before any steps.  **Must not** include a `step` field.

```json
{
  "event": "simulation_started",
  "timestamp": "...",
  "run_id": "run_2026-03-19_14-30-00",
  "total_steps": 8,
  "agent_names": ["House 1", "House 2", "House 3", "House 4"],
  "target_soc": {
    "House 1": 80,
    "House 2": 75,
    "House 3": 60,
    "House 4": 80
  },
  "time_labels": [
    "2026-01-15 21:00",
    "2026-01-15 21:30",
    "2026-01-15 22:00",
    "2026-01-15 22:30",
    "2026-01-15 23:00",
    "2026-01-15 23:30",
    "2026-01-16 00:00",
    "2026-01-16 00:30"
  ],
  "load_limit_kw": 30
}
```

| Field | Required | Notes |
|---|---|---|
| `agent_names` | **Yes** | Ordered list; used for chart legends and SOC lines |
| `target_soc` | **Yes** | Map of agent name → target SOC %; used for chart target lines |
| `time_labels` | **Yes** | One per step; used as X-axis labels on all charts |
| `load_limit_kw` | **Yes** | Grid load threshold in kW; drawn as reference line on load chart |
| `total_steps` | **Yes** | Total number of steps |

### 5.2 step_started

Emitted at the beginning of each step.  **Must** include `step`.

```json
{
  "event": "step_started",
  "timestamp": "...",
  "step": 3,
  "sim_time": "2026-01-15 22:00"
}
```

### 5.3 decisions_made

Emitted after each decision round (round 1 = initial, round 2 = post-negotiation).

```json
{
  "event": "decisions_made",
  "timestamp": "...",
  "step": 3,
  "round": 1,
  "grid_ok": false,
  "total_load_kw": 40,
  "decisions": {
    "House 1": "Yes",
    "House 2": "Yes",
    "House 3": "Yes",
    "House 4": "Yes"
  }
}
```

- `decisions` values must be `"Yes"` or `"No"` (strings, capitalised)
- `grid_ok` for round 2 should be `true` (negotiation resolved the violation)
- `total_load_kw` = sum of charger power for all houses with `"Yes"` that are connected

### 5.4 grid_violation

Emitted **only** when round 1 `grid_ok` is `false`.  Always round 1.

```json
{
  "event": "grid_violation",
  "timestamp": "...",
  "step": 3,
  "round": 1,
  "total_load_kw": 40,
  "load_limit_kw": 30,
  "max_line_loading_percent": 133.3,
  "overloaded_lines": ["line_11"]
}
```

### 5.5 negotiation_started

Emitted once per violation step, before agent speeches.

```json
{
  "event": "negotiation_started",
  "timestamp": "...",
  "step": 3,
  "round": 2
}
```

### 5.6 agent_speech

One per agent per negotiation round.  Emitted in order.

```json
{
  "event": "agent_speech",
  "timestamp": "...",
  "step": 3,
  "round": 2,
  "agent": "House 1",
  "message": "I need to keep charging. My SOC is only at 25% and I need 80% by departure."
}
```

- `agent` must match a name from `agent_names` in `simulation_started`
- Speeches are displayed as chat bubbles in a negotiation panel

### 5.7 step_complete

Emitted at the end of each step.  The backend enriches this with `grid_data` before sending to the frontend.

```json
{
  "event": "step_complete",
  "timestamp": "...",
  "step": 3
}
```

**Important:** The backend reads `grid_results.jsonl` and attaches the **last row for this step** (which is the post-negotiation round 2 row if there was a violation, or the round 1 row if clean) as `grid_data` on this event.  The simulator does NOT need to include `grid_data` — it's added by the backend.

### 5.8 simulation_complete

Emitted **once**, after all steps.  **Must not** include a `step` field.

```json
{
  "event": "simulation_complete",
  "timestamp": "...",
  "run_id": "run_2026-03-19_14-30-00"
}
```

---

## 6. Event Sequence Per Step

The exact order of events within a single step matters.  The backend releases them in this order with deliberate delays for the frontend.

### Clean Step (no violation):

```
step_started          (step=N)
decisions_made        (step=N, round=1, grid_ok=true)
step_complete         (step=N)
```

### Violation Step (with negotiation):

```
step_started          (step=N)
decisions_made        (step=N, round=1, grid_ok=false)
grid_violation        (step=N, round=1)
negotiation_started   (step=N, round=2)
agent_speech          (step=N, round=2, agent="House 1")
agent_speech          (step=N, round=2, agent="House 2")
agent_speech          (step=N, round=2, agent="House 3")
agent_speech          (step=N, round=2, agent="House 4")
decisions_made        (step=N, round=2, grid_ok=true)
step_complete         (step=N)
```

### Full Simulation:

```
simulation_started    (no step field)
[step 1 events...]
[step 2 events...]
...
[step N events...]
simulation_complete   (no step field)
```

---

## 7. Output Files (output/)

### 7.1 collective/grid_results.jsonl

One or two rows per step (round 1 always; round 2 only if there was a violation).

```json
{
  "step": 3,
  "round": 2,
  "gm": "negotiation",
  "date": "2026-01-15 22:00",
  "grid_ok": true,
  "total_load_kw": 30,
  "max_line_loading_percent": 100.0,
  "max_voltage_drop_pu": 0.045,
  "overloaded_lines": [],
  "overloaded_trafos": [],
  "joint_action": {
    "House 1": true,
    "House 2": true,
    "House 3": true,
    "House 4": false
  },
  "per_agent": {
    "House 1": {
      "soc_pct": 30.0,
      "bus_voltage_pu": 0.977,
      "is_charging": true
    },
    "House 2": {
      "soc_pct": 28.5,
      "bus_voltage_pu": 0.968,
      "is_charging": true
    },
    "House 3": {
      "soc_pct": 32.0,
      "bus_voltage_pu": 0.955,
      "is_charging": true
    },
    "House 4": {
      "soc_pct": 25.0,
      "bus_voltage_pu": 0.962,
      "is_charging": false
    }
  }
}
```

**Critical fields used by the frontend charts:**

| Field | Used by | Notes |
|---|---|---|
| `per_agent.*.soc_pct` | SOC chart | One line per agent |
| `per_agent.*.bus_voltage_pu` | Voltage chart | `min()` across all agents |
| `per_agent.*.is_charging` | SOC chart | Filled vs hollow dots |
| `total_load_kw` | Load chart | Resolved load line |
| `grid_ok` | Status display | "Grid Constrained: True/False" |
| `date` | Right panel | Simulation time display |

**The backend picks the LAST row for each step** (which is round 2 if a violation occurred).  This ensures the dashboard shows the post-negotiation resolved state.

### 7.2 per_agent/house_N.jsonl

One or two rows per step per agent.  Sent to individual player screens.

```json
{
  "step": 3,
  "round": 2,
  "gm": "negotiation",
  "date": "2026-01-15 22:00",
  "agent_id": "House 1",
  "ev_state": {
    "connected": true,
    "charging": true,
    "soc_pct": 30.0
  },
  "decision": "Yes",
  "decision_reasoning": "House 1 should continue charging at 10 kW. Current SOC is 30.0%, target is 80%. Remaining: 17.5 kWh (~1.8 hours).",
  "negotiation_summary": "House 1 continues charging as other household(s) agreed to defer."
}
```

| Field | Notes |
|---|---|
| `decision` | `"Yes"` or `"No"` |
| `decision_reasoning` | Natural language explanation of the agent's decision |
| `negotiation_summary` | Only present in round 2; null in round 1 |

### 7.3 summary/network_stats.json

Written once after all steps complete, before the `simulation_complete` event.

```json
{
  "agent_objectives": {
    "House 1": {
      "initial_soc_pct": 20.0,
      "target_soc_pct": 80,
      "final_soc_pct": 72.5,
      "target_achieved": false
    },
    "House 2": { ... }
  },
  "grid_stats": {
    "total_steps": 8,
    "grid_violations": 2,
    "negotiation_rounds": 2
  }
}
```

---

## 8. Agent Naming Convention

**Agent names must be `"House N"` (capital H, space, 1-based number).**

This string is used as:
- Keys in `simulation_started.agent_names`, `target_soc`, `per_agent`
- The `agent` field in `agent_speech` events
- Keys in `joint_action` and `decisions`
- Chart legend labels

The mapping from input YAML to agent name:
```
house_1  →  "House 1"
house_2  →  "House 2"
...
```

---

## 9. Timing Contract

### Simulator pace
The simulator can run at its own speed.  The `--delay` argument is a suggestion for inter-step pauses (useful for the mock; the real simulator may ignore it).

### Backend polling
The backend polls `events.jsonl` every **0.5 seconds**.  Events may be batched — the backend processes all new lines on each poll.

### Frontend release
The GM controls when events reach the frontend via a "Step" button.  Events for step N are released all at once (with small inter-event delays for readability).  The simulator does not need to wait for GM acknowledgement.

### File write atomicity
- **events.jsonl:** Each `append_jsonl()` writes one complete line and flushes.  The backend reads line-by-line and skips incomplete lines.
- **status.json:** Overwritten atomically (write then close).
- **grid_results.jsonl:** Same append pattern as events.jsonl.
- **per_agent files:** Same append pattern.

**If using Concordia's async/threaded model:** ensure that writes to `events.jsonl` are serialised (e.g. with a lock or queue) so lines don't interleave.

---

## 10. Error Handling

If the simulator encounters an error:

1. Write `status.json` with `state: "error"` and `error: "<message>"`
2. Exit with a non-zero exit code
3. Optionally emit an event (but the backend detects errors primarily via process exit + status.json)

The backend checks:
- If the process exits AND no `simulation_complete` event was written → broadcast `simulation_error` to the frontend
- If `status.json` has `state: "error"` → include the error message

---

## 11. Value Ranges (for realistic output)

These are the ranges the frontend charts are designed for:

| Metric | Typical Range | Notes |
|---|---|---|
| SOC (%) | 0–100 | Starts 15–30, ends 60–85 typically |
| bus_voltage_pu | 0.94–1.00 | Threshold line at 0.94; values below = violation |
| total_load_kw | 0–50 | With 4 houses × 10 kW; 0 when no cars charging |
| max_line_loading_percent | 0–150 | >100 = overloaded |
| charger power | ~7–11 kW | Per house |

**Voltage modelling tips:**
- Each house should have a slightly different voltage based on network topology (distance from transformer)
- A house further from the transformer has a larger voltage drop
- The minimum voltage across all houses is plotted on the voltage chart

**SOC variation tips:**
- Give each house a slightly different charge efficiency so SOC lines diverge
- A house that defers charging has a flat SOC for that step

---

## 12. Integration Checklist

Use this checklist to verify your simulator conforms to the interface:

### Startup
- [ ] Accepts `--input`, `--run-dir`, `--delay`, `--scenario` CLI arguments
- [ ] Reads input YAML with the schema in §2
- [ ] Creates `control/` directory under `--run-dir`
- [ ] Creates `output/collective/`, `output/per_agent/`, `output/summary/` under `--run-dir`
- [ ] Writes `control/initial_state.json` (§4.4)
- [ ] Writes `control/status.json` with `state: "running"` (§4.2)
- [ ] Writes `control/control.json` with `{"command": ""}` (§4.3)

### Events
- [ ] Emits `simulation_started` with all required fields (§5.1) — **no** `step` field
- [ ] Emits `step_started` with `step` at the beginning of each step (§5.2)
- [ ] Emits `decisions_made` for round 1 with `grid_ok`, `total_load_kw`, `decisions` (§5.3)
- [ ] If violation: emits `grid_violation` (§5.4), then `negotiation_started` (§5.5)
- [ ] If violation: emits one `agent_speech` per agent in order (§5.6)
- [ ] If violation: emits `decisions_made` for round 2 with `grid_ok: true` (§5.3)
- [ ] Emits `step_complete` with `step` at the end of each step (§5.7)
- [ ] Emits `simulation_complete` after all steps — **no** `step` field (§5.8)
- [ ] Every event has `"event"` and `"timestamp"` fields
- [ ] Events with `step` always include the 1-based step number
- [ ] Event sequence within each step follows the order in §6

### Output Files
- [ ] Writes to `output/collective/grid_results.jsonl` — 1 row per clean round, 2 rows per violation step (§7.1)
- [ ] Each `grid_results` row has `per_agent` with `soc_pct`, `bus_voltage_pu`, `is_charging` per agent
- [ ] Writes to `output/per_agent/house_N.jsonl` for each agent (§7.2)
- [ ] Agent names in output files match `"House N"` format (§8)
- [ ] Writes `output/summary/network_stats.json` at end (§7.3)

### Status Updates
- [ ] Updates `control/status.json` at each step and round change
- [ ] Sets `state: "completed"` before emitting `simulation_complete`
- [ ] Sets `state: "error"` with `error` message on failure
- [ ] Polls `control/control.json` at step boundaries (§4.3)

### Shutdown
- [ ] Writes `summary/network_stats.json` before completion
- [ ] Updates `status.json` to `state: "completed"`
- [ ] Emits `simulation_complete` as the very last event
- [ ] Exits with code 0

---

## 13. Quick Reference: Files Written by Simulator

| File | Format | When | Written by |
|---|---|---|---|
| `control/events.jsonl` | JSONL (append) | Throughout simulation | Simulator |
| `control/status.json` | JSON (overwrite) | At startup + each step/round | Simulator |
| `control/control.json` | JSON | Read by simulator, written by backend | Both |
| `control/initial_state.json` | JSON | Once at startup | Simulator |
| `output/collective/grid_results.jsonl` | JSONL (append) | Each round | Simulator |
| `output/per_agent/house_N.jsonl` | JSONL (append) | Each round | Simulator |
| `output/summary/network_stats.json` | JSON | Once at end | Simulator |

---

*See also: `docs/data-flow-diagram.txt` for a visual representation of the
complete data flow between simulator, backend, and frontend.*
