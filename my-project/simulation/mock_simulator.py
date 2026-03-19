#!/usr/bin/env python3
"""
Mock simulator for GridFlex.

Reads an input YAML file and writes simulation output files incrementally,
mimicking the behavior of the real Concordia-based simulation.

Usage:
    python mock_simulator.py --input <path>.yaml --output <output_dir> \
        [--delay 1.5] [--scenario clean|negotiation]
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


def read_control(output_dir):
    """Read the command from control.json (if it exists)."""
    control_path = output_dir / "control.json"
    if not control_path.exists():
        return None
    try:
        with open(control_path) as f:
            return json.load(f).get("command")
    except (json.JSONDecodeError, OSError):
        return None


def update_status(output_dir, **kwargs):
    """Merge kwargs into status.json."""
    status_path = output_dir / "status.json"
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
    Supports clean (no violations) and negotiation (violations at steps 3, 6).
    """

    def __init__(self, config, output_dir, delay, scenario):
        self.config = config
        self.output_dir = Path(output_dir)
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

        # Derive charger power from battery size (not a player input)
        self.charger_kw = {}
        for num, h in self.households.items():
            battery = h.get("ev_battery_kwh", 35)
            self.charger_kw[num] = 7 if battery >= 50 else 3

        # Track state of charge per house
        self.soc = {
            num: h.get("initial_soc_pct", 20.0)
            for num, h in self.households.items()
        }

        # Parse car connection time (car returns at car_away_until)
        self.connect_hour = {}
        for num, h in self.households.items():
            away_until = h.get("car_away_until", "21:00")
            self.connect_hour[num] = int(away_until.split(":")[0])

        # Steps that trigger grid violations (negotiation scenario only)
        self.negotiation_steps = {3, 6} if scenario == "negotiation" else set()

    def name(self, num):
        return f"House {num}"

    def sim_time(self, step):
        return self.start_time + timedelta(hours=step * self.time_step_hours)

    def sim_time_str(self, step):
        return self.sim_time(step).strftime("%Y-%m-%d %H:%M")

    def is_connected(self, house_num, step):
        """Is the car home (connected) at this step?"""
        hour = self.sim_time(step).hour
        return hour >= self.connect_hour[house_num] or hour < 7

    def emit(self, event_data):
        """Append an event to events.jsonl."""
        event_data["timestamp"] = datetime.now().isoformat()
        append_jsonl(self.output_dir / "events.jsonl", event_data)

    # -- Main loop --

    def run(self):
        self._setup_dirs()
        self._write_initial_state()
        self._write_initial_status()

        self.emit({
            "event": "simulation_started",
            "run_id": self.config.get("run_id", "unknown"),
            "total_steps": self.total_steps,
            "agent_names": [self.name(n) for n in sorted(self.households)],
        })

        for step in range(self.total_steps):
            self._poll_control()
            self._run_step(step)
            time.sleep(self.delay)

        self._write_summary()
        update_status(self.output_dir, state="completed")
        self.emit({
            "event": "simulation_complete",
            "run_id": self.config.get("run_id", "unknown"),
        })

    # -- Step execution --

    def _run_step(self, step):
        sim_time = self.sim_time_str(step)

        self.emit({"event": "step_started", "step": step, "sim_time": sim_time})
        update_status(
            self.output_dir,
            current_step=step, current_round=1,
            phase="operation", sim_time=sim_time,
        )

        decisions = self._decide(step)
        needs_negotiation = step in self.negotiation_steps
        grid_ok = not needs_negotiation

        charging = {
            n: (decisions[n] and self.is_connected(n, step))
            for n in self.households
        }

        self._write_round_data(step, 1, sim_time, grid_ok, decisions, charging)

        self.emit({
            "event": "decisions_made",
            "step": step, "round": 1, "grid_ok": grid_ok,
            "decisions": {
                self.name(n): ("Yes" if d else "No")
                for n, d in decisions.items()
            },
        })

        if grid_ok:
            self._apply_charging(charging)
        else:
            time.sleep(self.delay * 0.5)

            total_load = sum(
                self.charger_kw[n] for n, c in charging.items() if c
            )
            self.emit({
                "event": "grid_violation",
                "step": step, "round": 1,
                "total_load_kw": total_load,
                "max_line_loading_percent": 112.3,
                "overloaded_lines": ["line_11"],
            })

            time.sleep(self.delay * 0.5)
            update_status(self.output_dir, current_round=2, phase="negotiation")
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

            self.emit({
                "event": "decisions_made",
                "step": step, "round": 2, "grid_ok": True,
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
                self.soc[num] = min(
                    100.0,
                    self.soc[num] + (energy / battery * 100),
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
        max_line = total_load * 0.55
        max_vdrop = total_load * 0.00073

        per_agent_grid = {}
        for num in sorted(self.households):
            per_agent_grid[self.name(num)] = {
                "soc_pct": round(self.soc[num], 2),
                "bus_voltage_pu": round(1.0 - total_load * 0.00073, 6),
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
        write_json(self.output_dir / "initial_state.json", {
            "agents": agents,
            "grid": {
                "total_load_kw": 0,
                "max_line_loading_percent": 0,
                "max_voltage_drop_pu": 0,
            },
        })

    def _write_initial_status(self):
        update_status(
            self.output_dir,
            state="running", current_step=0, current_round=1,
            total_steps=self.total_steps, phase="operation",
            sim_time=self.sim_time_str(0),
            wall_clock_started=datetime.now().isoformat(),
            error=None,
        )
        write_json(self.output_dir / "control.json", {"command": ""})

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
                "grid_violations": len(self.negotiation_steps),
                "negotiation_rounds": len(self.negotiation_steps),
            },
        })

    def _setup_dirs(self):
        (self.output_dir / "collective").mkdir(parents=True, exist_ok=True)
        (self.output_dir / "per_agent").mkdir(parents=True, exist_ok=True)
        (self.output_dir / "summary").mkdir(parents=True, exist_ok=True)

    def _poll_control(self):
        """Block while control.json says pause."""
        while True:
            cmd = read_control(self.output_dir)
            if cmd == "pause":
                update_status(self.output_dir, state="paused")
                time.sleep(0.5)
            else:
                update_status(self.output_dir, state="running")
                break


# =============================================
#  CLI entry point
# =============================================

def main():
    parser = argparse.ArgumentParser(description="GridFlex Mock Simulator")
    parser.add_argument("--input", required=True,
                        help="Path to input YAML file")
    parser.add_argument("--output", required=True,
                        help="Path to output directory")
    parser.add_argument("--delay", type=float, default=1.5,
                        help="Delay in seconds between steps (default: 1.5)")
    parser.add_argument("--scenario",
                        choices=["clean", "negotiation"], default="clean",
                        help="Canned scenario to run (default: clean)")
    args = parser.parse_args()

    with open(args.input) as f:
        config = yaml.safe_load(f)

    sim = MockSimulator(config, args.output, args.delay, args.scenario)

    print(f"Mock simulator starting: scenario={args.scenario}, delay={args.delay}s")
    print(f"  Input:      {args.input}")
    print(f"  Output:     {args.output}")
    print(f"  Households: {sim.num_houses}")

    try:
        sim.run()
        print("Simulation completed successfully.")
    except KeyboardInterrupt:
        print("Simulation interrupted.")
        update_status(Path(args.output), state="error",
                      error="Interrupted by user")
    except Exception as e:
        print(f"Simulation error: {e}")
        update_status(Path(args.output), state="error", error=str(e))
        raise


if __name__ == "__main__":
    main()
