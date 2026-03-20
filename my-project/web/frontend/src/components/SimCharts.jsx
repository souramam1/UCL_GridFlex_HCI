import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, ReferenceArea,
} from 'recharts'
import './SimCharts.css'

/**
 * House colors — matches HOUSEHOLDS in ParticipantDashboardPage.
 */
const AGENT_COLORS = {
  'House 1': '#7B9BD6',
  'House 2': '#C07BAE',
  'House 3': '#A0B44C',
  'House 4': '#C4A04A',
}
const FALLBACK_COLORS = ['#7B9BD6', '#C07BAE', '#A0B44C', '#C4A04A', '#9B7BD6', '#D6A07B']

function getAgentColor(name, idx) {
  return AGENT_COLORS[name] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length]
}

/**
 * Shared dark-theme axis/grid props.
 */
const AXIS_STYLE = {
  stroke: 'rgba(255,255,255,0.2)',
  tick: { fill: 'rgba(255,255,255,0.6)', fontSize: 11 },
}
const GRID_STYLE = {
  strokeDasharray: '3 3',
  stroke: 'rgba(255,255,255,0.08)',
}
const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'rgba(30,30,30,0.95)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 6,
    color: '#fff',
    fontSize: 12,
  },
  itemStyle: { color: '#fff' },
  labelStyle: { color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
}

/**
 * Custom dot for SOC chart — filled when charging, hollow when idle.
 * Only renders on data points that have actual values (not pre-filled nulls).
 */
function ChargingDot({ cx, cy, payload, dataKey, stroke }) {
  if (cx == null || cy == null) return null
  if (payload[dataKey] == null) return null
  const agentName = dataKey.replace('_soc', '')
  const isCharging = payload[`${agentName}_charging`]
  return (
    <circle
      cx={cx} cy={cy} r={isCharging ? 4 : 3}
      fill={isCharging ? stroke : 'transparent'}
      stroke={stroke}
      strokeWidth={1.5}
    />
  )
}

/**
 * Custom dot for the violated load line — grey X marker.
 * Only renders on points that have an actual violated load value.
 */
function ViolatedLoadDot({ cx, cy, payload }) {
  if (cx == null || cy == null) return null
  if (payload.violated_load_kw == null) return null
  const size = 5
  return (
    <g>
      <line x1={cx - size} y1={cy - size} x2={cx + size} y2={cy + size}
        stroke="rgba(255,255,255,0.6)" strokeWidth={2} />
      <line x1={cx + size} y1={cy - size} x2={cx - size} y2={cy + size}
        stroke="rgba(255,255,255,0.6)" strokeWidth={2} />
    </g>
  )
}

/**
 * ViolationAreas — renders pulsating red shaded bands for steps where
 * a violation occurred (violated_load_kw is set).
 * Uses a CSS animation class for the pulsation effect.
 */
function ViolationAreas({ data, allLabels }) {
  return data
    .filter(d => d.violated_load_kw != null)
    .map((d, i) => {
      const idx = allLabels.indexOf(d.label)
      const prevLabel = idx > 0 ? allLabels[idx - 1] : d.label
      const nextLabel = idx < allLabels.length - 1 ? allLabels[idx + 1] : d.label
      return (
        <ReferenceArea
          key={`violation-${i}`}
          x1={prevLabel}
          x2={nextLabel}
          fill="rgba(204, 68, 68, 0.15)"
          strokeOpacity={0}
          className="sim-charts__violation-band"
        />
      )
    })
}

/**
 * SOCChart — one line per agent, SOC% over time, with dashed target lines.
 */
function SOCChart({ data, agentNames, targetSoc }) {
  return (
    <div className="sim-charts__card">
      <h3>EV State of Charge</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis
            dataKey="label"
            {...AXIS_STYLE}
            allowDuplicatedCategory={false}
          />
          <YAxis domain={[0, 100]} {...AXIS_STYLE}
            label={{ value: 'SOC (%)', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
          />
          <Tooltip {...TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }} />
          {/* Dashed target SOC lines per agent */}
          {agentNames.map((name, idx) => {
            const target = targetSoc[name]
            if (target == null) return null
            return (
              <ReferenceLine
                key={`target-${name}`}
                y={target}
                stroke={getAgentColor(name, idx)}
                strokeDasharray="6 3"
                strokeOpacity={0.5}
                label={false}
              />
            )
          })}
          {/* Actual SOC lines per agent */}
          {agentNames.map((name, idx) => (
            <Line
              key={name}
              type="monotone"
              dataKey={`${name}_soc`}
              name={name}
              stroke={getAgentColor(name, idx)}
              strokeWidth={2}
              dot={<ChargingDot />}
              activeDot={{ r: 5 }}
              animationDuration={300}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <p className="sim-charts__legend-note">
        Filled = charging, hollow = idle. Dashed lines = target SOC.
      </p>
    </div>
  )
}

/**
 * VoltageChart — min bus voltage over time, with threshold and violation shading.
 */
function VoltageChart({ data, allLabels }) {
  return (
    <div className="sim-charts__card">
      <h3>Grid Voltage</h3>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis
            dataKey="label"
            {...AXIS_STYLE}
            allowDuplicatedCategory={false}
          />
          <YAxis domain={[0.90, 1.05]} {...AXIS_STYLE}
            label={{ value: 'Voltage (pu)', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
          />
          <Tooltip {...TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }} />
          <ViolationAreas data={data} allLabels={allLabels} />
          <ReferenceLine
            y={0.94}
            stroke="rgba(204, 68, 68, 0.6)"
            strokeDasharray="6 4"
            label={{ value: '0.94 pu', position: 'right', fill: 'rgba(204,68,68,0.8)', fontSize: 10 }}
          />
          <Line
            type="monotone"
            dataKey="min_voltage_pu"
            name="Min Voltage (pu)"
            stroke="#7B9BD6"
            strokeWidth={2}
            dot={{ r: 3, fill: '#7B9BD6' }}
            activeDot={{ r: 5 }}
            animationDuration={300}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="sim-charts__legend-note">
        Red shading = grid constraint violated. Dashed line = 0.94 pu threshold.
      </p>
    </div>
  )
}

/**
 * LoadChart — total grid load over time.
 * Shows two lines:
 *   1. "Resolved Load" (copper) — the final load after any negotiation
 *   2. "Violated Load" (grey X markers) — the initial load that caused a violation
 * Violation steps get a pulsating red band.
 */
function LoadChart({ data, allLabels, loadLimitKw }) {
  return (
    <div className="sim-charts__card">
      <h3>Total Grid Load</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis
            dataKey="label"
            {...AXIS_STYLE}
            allowDuplicatedCategory={false}
          />
          <YAxis {...AXIS_STYLE}
            label={{ value: 'Load (kW)', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
          />
          <Tooltip {...TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }} />
          <ViolationAreas data={data} allLabels={allLabels} />
          {/* Load limit threshold line */}
          {loadLimitKw != null && (
            <ReferenceLine
              y={loadLimitKw}
              stroke="rgba(204, 68, 68, 0.6)"
              strokeDasharray="6 4"
              label={{ value: `${loadLimitKw} kW`, position: 'right', fill: 'rgba(204,68,68,0.8)', fontSize: 10 }}
            />
          )}
          {/* Violated load — grey dashed line with X markers */}
          <Line
            type="monotone"
            dataKey="violated_load_kw"
            name="Violated Load (kW)"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={<ViolatedLoadDot />}
            activeDot={{ r: 5 }}
            animationDuration={300}
            connectNulls={false}
          />
          {/* Resolved load — normal copper line */}
          <Line
            type="monotone"
            dataKey="total_load_kw"
            name="Total Load (kW)"
            stroke="#C4835A"
            strokeWidth={2}
            dot={{ r: 3, fill: '#C4835A' }}
            activeDot={{ r: 5 }}
            animationDuration={300}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="sim-charts__legend-note">
        &#x2715; = violated load before negotiation. Dashed line = load limit. Red pulsing = violation.
      </p>
    </div>
  )
}

/**
 * SimCharts — main component. Tabs between Charts and Event Log.
 *
 * Props:
 *   gridData       — array of grid snapshots (one per completed step)
 *   stepEvents     — flat array of all events for the event log tab
 *   formatEvent    — function to render an event as a string
 *   targetSoc      — { "House 1": 75, "House 2": 60, ... }
 *   timeLabels     — ["2026-03-20 18:00", "2026-03-20 18:30", ...] (all steps)
 *   totalSteps     — number of steps in the simulation (default 8)
 *   violatedLoads  — { 3: 40, 6: 40 } — step → violated load kW
 */
function SimCharts({
  gridData, stepEvents, formatEvent,
  targetSoc = {}, timeLabels = [], totalSteps = 8,
  violatedLoads = {}, loadLimitKw = null,
}) {
  const [activeTab, setActiveTab] = useState('charts')

  /**
   * Build the full chart data array.
   * Pre-fill ALL time-step slots so the X-axis is fixed from the start.
   * Merge violated loads into the data rows.
   */
  const { chartData, agentNames, allLabels } = useMemo(() => {
    const labels = []
    for (let s = 1; s <= totalSteps; s++) {
      if (timeLabels[s - 1]) {
        const parts = timeLabels[s - 1].split(' ')
        labels.push(parts[1] || `S${s}`)
      } else {
        labels.push(`S${s}`)
      }
    }

    let names = []
    if (gridData.length > 0) {
      const firstAgents = gridData[0].per_agent || {}
      names = Object.keys(firstAgents)
    }

    const stepMap = {}
    gridData.forEach(gd => {
      stepMap[gd.step] = gd
    })

    const rows = labels.map((label, i) => {
      const step = i + 1
      const gd = stepMap[step]

      const row = { label, step }

      if (gd) {
        const agents = gd.per_agent || {}
        const agentKeys = Object.keys(agents)
        row.grid_ok = gd.grid_ok
        row.total_load_kw = gd.total_load_kw
        row.min_voltage_pu = agentKeys.length > 0
          ? Math.min(...agentKeys.map(n => agents[n].bus_voltage_pu).filter(v => v != null))
          : null
        agentKeys.forEach(name => {
          row[`${name}_soc`] = agents[name].soc_pct
          row[`${name}_charging`] = agents[name].is_charging
        })
      } else {
        row.grid_ok = null
        row.total_load_kw = null
        row.min_voltage_pu = null
        names.forEach(name => {
          row[`${name}_soc`] = null
          row[`${name}_charging`] = null
        })
      }

      // Merge violated load for this step (if any)
      row.violated_load_kw = violatedLoads[step] != null ? violatedLoads[step] : null

      return row
    })

    return { chartData: rows, agentNames: names, allLabels: labels }
  }, [gridData, timeLabels, totalSteps, violatedLoads])

  return (
    <div className="sim-charts">
      {/* Tab toggle */}
      <div className="sim-charts__tabs">
        <button
          className={`sim-charts__tab${activeTab === 'charts' ? ' sim-charts__tab--active' : ''}`}
          onClick={() => setActiveTab('charts')}
        >
          Charts
        </button>
        <button
          className={`sim-charts__tab${activeTab === 'log' ? ' sim-charts__tab--active' : ''}`}
          onClick={() => setActiveTab('log')}
        >
          Event Log
        </button>
      </div>

      {/* Content area */}
      <div className="sim-charts__content">
        {activeTab === 'charts' ? (
          <>
            <SOCChart
              data={chartData}
              agentNames={agentNames}
              targetSoc={targetSoc}
            />
            <VoltageChart data={chartData} allLabels={allLabels} />
            <LoadChart data={chartData} allLabels={allLabels} loadLimitKw={loadLimitKw} />
          </>
        ) : (
          <div className="sim-charts__event-log">
            {stepEvents.length > 0 ? (
              stepEvents.map((evt, i) => (
                <div
                  key={i}
                  className={`sim-charts__event-entry${evt.event === 'grid_violation' ? ' sim-charts__event-entry--violation' : ''}${evt.event === 'agent_speech' ? ' sim-charts__event-entry--speech' : ''}`}
                >
                  {formatEvent ? formatEvent(evt) : evt.event}
                </div>
              ))
            ) : (
              <div className="sim-charts__empty">
                No events yet...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SimCharts
