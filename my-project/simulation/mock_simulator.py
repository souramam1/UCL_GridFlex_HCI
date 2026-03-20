#!/usr/bin/env python3
"""
Mock simulator for GridFlex.

Reads an input YAML file and writes simulation output files incrementally,
mimicking the behavior of the real Concordia-based simulation.

Usage:
    python mock_simulator.py --input <path>.yaml --run-dir <run_dir> \
        [--delay 1.5] [--scenario clean|negotiation]

Run directory layout (created by this simulator):
    <run_dir>/
        control/            <-- handshake files
            events.jsonl
            control.json
            status.json
            initial_state.json
        output/             <-- simulation results
            collective/grid_results.jsonl
            per_agent/house_N.jsonl
            summary/network_stats.json
"""

import argparse
import json
import time
import sys
from pathlib import Path
from datetime import datetime, timedelta

import yaml


# =============================================
#  Helpers
# =============================================

def write_json(path, data):
    """Write a JSON file, creating parent dirs as needed."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2)


def append_jsonl(path, data):
    """Append a single JSON line to a .jsonl file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "a") as f:
        f.write(json.dumps(data) + "\n")


def read_control(run_dir):
    """Read the command from control/control.json (if it exists)."""
    control_path = run_dir / "control" / "control.json"
    if not control_path.exists():
        return None
    try:
        with open(control_path) as f:
            return json.load(f).get("command")
    except (json.JSONDecodeError, OSError):
        return None


def update_status(run_dir, **kwargs):
    """Merge kwargs into control/status.json."""
    status_path = run_dir / "control" / "status.json"
    status = {}
    if status_path.exists():
        try:
            with open(status_path) as f:
                status = json.load(f)
        except (json.JSONDecodeError, OSError):
            pass
    status.update(kwargs)
    write_json(status_path, status)


# =============================================
#  Negotiation dialogue templates
# =============================================

NEGOTIATION_TEMPLATES = {
    3: [
        "I need to keep charging. My SOC is only at {soc:.0f}% and I need {target}% by departure. Can one of the other households reduce their load?",
        "My situation is similar, but I could reduce to half power if that helps. Current SOC is {soc:.0f}%.",
        "I have the largest battery and charger, so my impact on the grid is highest. I will defer charging this round and resume next step.",
    ],
    6: [
        "We are getting close to our targets. I only need a bit more. Can someone else wait?",
        "I have been flexible before. I think it is fair if someone else defers this time.",
        "Fine, I will pause again. I still have enough time to reach my target before departure.",
    ],
}

NEGOTIATION_TEMPLATES_DEFAULT = [
    "I would prefer to continue charging. My SOC is at {soc:.0f}% and my target is {target}%.",
    "I can pause if needed, but I would rather not. Current SOC: {soc:.0f}%.",
    "I will defer this round. I can make up the charge in later time steps.",
]


# =============================================
#  Mock Simulator
# =============================================

class MockSimulator:
    """
    Reads input YAML, produces output files matching the real simulation format.
    Supports clean (no violations) and negotiation (dynamic load-based violations).
    """

    def __init__(self, config, run_dir, delay, scenario):
        self.config = config
        self.run_dir = Path(run_dir)
        self.control_dir = self.run_dir / "control"
        self.output_dir = self.run_dir / "output"
        self.delay = delay
        self.scenario = scenario
        self.total_steps = 8
        self.time_step_hours = 0.5
        self.start_time = datetime(2026, 1, 15, 21, 0)

        # Parse households from input YAML
        self.households = {}
        for house_key, house_data in config.get("households", {}).items():
            house_num = int(house_key.split("_")[1])
            self.households[house_num] = house_data

        self.num_houses = len(self.households)

        # Fixed charger power per house (matches real Concordia ~10 kW)
        self.charger_kw = {num: 10 for num in self.households}

        # Per-house charge efficiency multiplier (creates SOC divergence)
        sorted_nums = sorted(self.households)
        charge_mults = [1.0, 0.85, 1.1, 0.95, 0.90, 1.05]
        self.charge_mult = {
            num: charge_mults[i % len(charge_mults)]
            for i, num in enumerate(sorted_nums)
        }

        # Network position factors — houses further from transformer
        # experience larger voltage drops (mimics real power flow topology)
        pos_factors = [0.0, 0.35, 0.65, 1.0, 0.50, 0.15]
        self.net_position = {
            num: pos_factors[i % len(pos_factors)]
            for i, num in enumerate(sorted_nums)
        }

        # Track state of charge per house
        self.soc = {
            num: h.get("initial_soc_pct", 20.0)
            for num, h in self.households.items()
        }

        # Parse car connection time as a full datetime on the start date.
        # Using strict > comparison means a car arriving at 21:00 is NOT
        # charging at step 1 (21:00) but starts at step 2 (21:30).
        self.connect_time = {}
        for num, h in self.households.items():
            away_until = h.get("car_away_until", "21:00")
            parts = away_until.split(":")
            hour = int(parts[0])
            minute = int(parts[1]) if len(parts) > 1 else 0
            self.connect_time[num] = self.start_time.replace(
                hour=hour, minute=minute,
            )

        # Grid load limit (kW) — violations when total load exceeds this.
        # With 4 houses × 10 kW chargers, all 4 charging = 40 kW.
        # Threshold at 30 kW: deferring 1 house brings load to 30 ≤ 30.
        self.load_limit_kw = 30 if scenario == "negotiation" else 9999

        # Track number of violation steps for the summary
        self.violation_count = 0

    def name(self, num):
        return f"House {num}"

    def sim_time(self, step):
        # step is 1-based, so step 1 → offset 0
        return self.start_time + timedelta(hours=(step - 1) * self.time_step_hours)

    def sim_time_str(self, step):
        return self.sim_time(step).strftime("%Y-%m-%d %H:%M")

    def is_connected(self, house_num, step):
        """Is the car home (connected) at this step?

        Uses strict '>' so the car isn't charging in the exact step it
        arrives (simulates plug-in delay).  Once past midnight the car
        is always home (early-morning hours).
        """
        sim_dt = self.sim_time(step)
        return sim_dt > self.connect_time[house_num] or sim_dt.hour < 7

    def emit(self, event_data):
        """Append an event to control/events.jsonl."""
        event_data["timestamp"] = datetime.now().isoformat()
        append_jsonl(self.control_dir / "events.jsonl", event_data)

    # -- Main loop --

    def run(self):
        self._setup_dirs()
        self._write_initial_state()
        self._write_initial_status()

        sorted_houses = sorted(self.households)
        self.emit({
            "event": "simulation_started",
            "run_id": self.config.get("run_id", "unknown"),
            "total_steps": self.total_steps,
            "agent_names": [self.name(n) for n in sorted_houses],
            # Per-agent target SOC so the dashboard can draw goal lines
            "target_soc": {
                self.name(n): self.households[n].get("target_soc_pct", 80)
                for n in sorted_houses
            },
            # Pre-computed time labels for all steps (fixed X-axis)
            "time_labels": [
                self.sim_time_str(s) for s in range(1, self.total_steps + 1)
            ],
            # Grid load limit so the chart can draw a threshold line
            "load_limit_kw": self.load_limit_kw,
        })

        for step in range(1, self.total_steps + 1):
            self._poll_control()
            self._run_step(step)
            time.sleep(self.delay)

        self._write_summary()
        update_status(self.run_dir, state="completed")
        self.emit({
            "event": "simulation_complete",
            "run_id": self.config.get("run_id", "unknown"),
        })

    # -- Step execution --

    def _run_step(self, step):
        sim_time = self.sim_time_str(step)

        self.emit({"event": "step_started", "step": step, "sim_time": sim_time})
        update_status(
            self.run_dir,
            current_step=step, current_round=1,
            phase="operation", sim_time=sim_time,
        )

        decisions = self._decide(step)

        charging = {
            n: (decisions[n] and self.is_connected(n, step))
            for n in self.households
        }

        # Compute round 1 load and determine violation dynamically
        round1_load = sum(
            self.charger_kw[n] for n, c in charging.items() if c
        )
        grid_ok = round1_load <= self.load_limit_kw

        self._write_round_data(step, 1, sim_time, grid_ok, decisions, charging)

        self.emit({
            "event": "decisions_made",
            "step": step, "round": 1, "grid_ok": grid_ok,
            "total_load_kw": round1_load,
            "decisions": {
                self.name(n): ("Yes" if d else "No")
                for n, d in decisions.items()
            },
        })

        if grid_ok:
            self._apply_charging(charging)
        else:
            self.violation_count += 1
            time.sleep(self.delay * 0.5)

            self.emit({
                "event": "grid_violation",
                "step": step, "round": 1,
                "total_load_kw": round1_load,
                "load_limit_kw": self.load_limit_kw,
                "max_line_loading_percent": round(
                    round1_load / self.load_limit_kw * 100, 1
                ),
                "overloaded_lines": ["line_11"],
            })

            time.sleep(self.delay * 0.5)
            update_status(self.run_dir, current_round=2, phase="negotiation")
            self.emit({"event": "negotiation_started", "step": step, "round": 2})

            for house_num, message in self._speeches(step):
                time.sleep(self.delay * 0.3)
                self.emit({
                    "event": "agent_speech",
                    "step": step, "round": 2,
                    "agent": self.name(house_num),
                    "message": message,
                })

            time.sleep(self.delay * 0.3)

            negotiated = dict(decisions)
            last = max(self.households)
            negotiated[last] = False

            neg_charging = {
                n: (negotiated[n] and self.is_connected(n, step))
                for n in self.households
            }

            self._write_round_data(
                step, 2, sim_time, True, negotiated, neg_charging,
                negotiation=True,
            )
            self._apply_charging(neg_charging)

            round2_load = sum(
                self.charger_kw[n] for n, c in neg_charging.items() if c
            )

            self.emit({
                "event": "decisions_made",
                "step": step, "round": 2, "grid_ok": True,
                "total_load_kw": round2_load,
                "decisions": {
                    self.name(n): ("Yes" if d else "No")
                    for n, d in negotiated.items()
                },
            })

        self.emit({"event": "step_complete", "step": step})

    # -- Decision logic --

    def _decide(self, step):
        return {
            num: (
                self.soc[num] < h.get("target_soc_pct", 80)
                and self.is_connected(num, step)
            )
            for num, h in self.households.items()
        }

    def _apply_charging(self, charging):
        for num, is_charging in charging.items():
            if is_charging:
                energy = self.charger_kw[num] * self.time_step_hours
                battery = self.households[num].get("ev_battery_kwh", 35)
                # Apply per-house charge multiplier for SOC divergence
                mult = self.charge_mult.get(num, 1.0)
                self.soc[num] = min(
                    100.0,
                    self.soc[num] + (energy / battery * 100) * mult,
                )

    def _speeches(self, step):
        templates = NEGOTIATION_TEMPLATES.get(step, NEGOTIATION_TEMPLATES_DEFAULT)
        result = []
        for i, num in enumerate(sorted(self.households)):
            h = self.households[num]
            t = templates[i % len(templates)]
            msg = t.format(soc=self.soc[num], target=h.get("target_soc_pct", 80))
            result.append((num, msg))
        return result

    # -- File writers --

    def _write_round_data(self, step, round_num, sim_time, grid_ok,
                          decisions, charging, negotiation=False):
        total_load = sum(self.charger_kw[n] for n, c in charging.items() if c)

        # Voltage drop: tuned so violated load (~40 kW) gives min voltage
        # near 0.94 threshold; resolved load (~30 kW) stays above it
        base_drop = total_load * 0.0015
        # Line loading percentage relative to the load limit
        max_line = (total_load / self.load_limit_kw * 100) if self.load_limit_kw > 0 else 0
        max_vdrop = base_drop

        per_agent_grid = {}
        for num in sorted(self.households):
            # Per-house voltage varies by network position
            # House at position 1.0 (furthest) gets full drop
            # House at position 0.0 (nearest) gets ~50% of the drop
            pos = self.net_position.get(num, 0.5)
            house_drop = base_drop * (0.5 + 0.5 * pos)
            per_agent_grid[self.name(num)] = {
                "soc_pct": round(self.soc[num], 2),
                "bus_voltage_pu": round(1.0 - house_drop, 6),
                "is_charging": charging[num],
            }

        grid_row = {
            "step": step, "round": round_num,
            "gm": "negotiation" if negotiation else "operation",
            "date": sim_time, "grid_ok": grid_ok,
            "total_load_kw": total_load,
            "max_line_loading_percent": round(max_line, 2),
            "max_voltage_drop_pu": round(max_vdrop, 6),
            "overloaded_lines": [] if grid_ok else ["line_11"],
            "overloaded_trafos": [],
            "joint_action": {self.name(n): d for n, d in decisions.items()},
            "per_agent": per_agent_grid,
        }
        append_jsonl(
            self.output_dir / "collective" / "grid_results.jsonl", grid_row,
        )

        for num in sorted(self.households):
            h = self.households[num]
            battery = h.get("ev_battery_kwh", 35)
            target = h.get("target_soc_pct", 80)
            current = self.soc[num]
            connected = self.is_connected(num, step)
            decided_yes = decisions[num]

            reasoning = None
            if decided_yes and connected:
                remaining_pct = target - current
                energy_needed = remaining_pct / 100 * battery
                hours_needed = (
                    energy_needed / self.charger_kw[num]
                    if self.charger_kw[num] > 0 else 0
                )
                reasoning = (
                    f"{self.name(num)} should continue charging at "
                    f"{self.charger_kw[num]} kW. "
                    f"Current SOC is {current:.1f}%, target is {target}%. "
                    f"Remaining: {energy_needed:.1f} kWh "
                    f"(~{hours_needed:.1f} hours)."
                )
            elif not decided_yes and current >= target:
                reasoning = (
                    f"{self.name(num)} has reached target SOC of {target}%. "
                    f"No further charging needed."
                )
            elif not connected:
                reasoning = (
                    f"{self.name(num)} car is not yet connected. "
                    f"Waiting for arrival."
                )

            neg_summary = None
            if negotiation:
                if not decided_yes:
                    neg_summary = (
                        f"{self.name(num)} agreed to defer charging this "
                        f"round to resolve the grid constraint. "
                        f"Will resume next step."
                    )
                else:
                    neg_summary = (
                        f"{self.name(num)} continues charging as other "
                        f"household(s) agreed to defer."
                    )

            agent_row = {
                "step": step, "round": round_num,
                "gm": "negotiation" if negotiation else "operation",
                "date": sim_time,
                "agent_id": self.name(num),
                "ev_state": {
                    "connected": connected,
                    "charging": charging[num],
                    "soc_pct": round(self.soc[num], 2),
                },
                "decision": "Yes" if decided_yes else "No",
                "decision_reasoning": reasoning,
                "negotiation_summary": neg_summary,
            }
            append_jsonl(
                self.output_dir / "per_agent" / f"house_{num}.jsonl",
                agent_row,
            )

    def _write_initial_state(self):
        agents = {}
        for num, h in self.households.items():
            agents[self.name(num)] = {
                "soc_pct": h.get("initial_soc_pct", 20.0),
                "connected": False,
                "battery_kwh": h.get("ev_battery_kwh", 35),
                "charger_kw": self.charger_kw[num],
                "target_soc_pct": h.get("target_soc_pct", 80),
                "car_away_from": h.get("car_away_from", "07:00"),
                "car_away_until": h.get("car_away_until", "21:00"),
                "cooperative": h.get("cooperative", True),
            }
        write_json(self.control_dir / "initial_state.json", {
            "agents": agents,
            "grid": {
                "total_load_kw": 0,
                "max_line_loading_percent": 0,
                "max_voltage_drop_pu": 0,
            },
        })

    def _write_initial_status(self):
        update_status(
            self.run_dir,
            state="running", current_step=1, current_round=1,
            total_steps=self.total_steps, phase="operation",
            sim_time=self.sim_time_str(1),
            wall_clock_started=datetime.now().isoformat(),
            error=None,
        )
        write_json(self.control_dir / "control.json", {"command": ""})

    def _write_summary(self):
        agent_objectives = {}
        for num, h in self.households.items():
            initial = h.get("initial_soc_pct", 20.0)
            target = h.get("target_soc_pct", 80)
            final = self.soc[num]
            agent_objectives[self.name(num)] = {
                "initial_soc_pct": initial,
                "target_soc_pct": target,
                "final_soc_pct": round(final, 2),
                "target_achieved": final >= target,
            }

        write_json(self.output_dir / "summary" / "network_stats.json", {
            "agent_objectives": agent_objectives,
            "grid_stats": {
                "total_steps": self.total_steps,
                "grid_violations": self.violation_count,
                "negotiation_rounds": self.violation_count,
            },
        })

    def _setup_dirs(self):
        self.control_dir.mkdir(parents=True, exist_ok=True)
        (self.output_dir / "collective").mkdir(parents=True, exist_ok=True)
        (self.output_dir / "per_agent").mkdir(parents=True, exist_ok=True)
        (self.output_dir / "summary").mkdir(parents=True, exist_ok=True)

    def _poll_control(self):
        """Block while control/control.json says pause."""
        while True:
            cmd = read_control(self.run_dir)
            if cmd == "pause":
                update_status(self.run_dir, state="paused")
                time.sleep(0.5)
            else:
                update_status(self.run_dir, state="running")
                break


# =============================================
#  CLI entry point
# =============================================

def main():
    parser = argparse.ArgumentParser(description="GridFlex Mock Simulator")
    parser.add_argument("--input", required=True,
                        help="Path to input YAML file")
    parser.add_argument("--run-dir", required=True,
                        help="Path to run directory (contains control/ and output/)")
    parser.add_argument("--delay", type=float, default=1.5,
                        help="Delay in seconds between steps (default: 1.5)")
    parser.add_argument("--scenario",
                        choices=["clean", "negotiation"], default="clean",
                        help="Canned scenario to run (default: clean)")
    args = parser.parse_args()

    with open(args.input) as f:
        config = yaml.safe_load(f)

    sim = MockSimulator(config, args.run_dir, args.delay, args.scenario)

    print(f"Mock simulator starting: scenario={args.scenario}, delay={args.delay}s")
    print(f"  Input:      {args.input}")
    print(f"  Run dir:    {args.run_dir}")
    print(f"  Households: {sim.num_houses}")

    try:
        sim.run()
        print("Simulation completed successfully.")
    except KeyboardInterrupt:
        print("Simulation interrupted.")
        update_status(Path(args.run_dir), state="error",
                      error="Interrupted by user")
    except Exception as e:
        print(f"Simulation error: {e}")
        update_status(Path(args.run_dir), state="error", error=str(e))
        raise


if __name__ == "__main__":
    main()
