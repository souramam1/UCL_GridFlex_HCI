import { useState } from 'react'
import './FormControls.css'

/**
 * FormLabel — Highlighted section heading above a control group.
 */
function FormLabel({ children }) {
  return <span className="form-label">{children}</span>
}

/**
 * FormAttr — Key-value attribute row.
 */
function FormAttr({ label, value }) {
  return (
    <div className="form-attr">
      <span className="form-attr__key">{label}:</span>
      <span className="form-attr__value">{value}</span>
    </div>
  )
}

/**
 * RangeSlider — Single-handle range slider with value display.
 *
 * Supports both controlled (value + onChange) and uncontrolled modes.
 *   Controlled:   <RangeSlider value={val} onChange={setVal} min={0} max={7} />
 *   Uncontrolled:  <RangeSlider min={0} max={7} defaultValue={5} />
 */
function RangeSlider({ min = 0, max = 100, step = 1, defaultValue = 50, unit = '', value, onChange }) {
  const [internal, setInternal] = useState(defaultValue)
  const current = value !== undefined ? value : internal
  const handleChange = e => {
    const v = Number(e.target.value)
    if (onChange) onChange(v)
    else setInternal(v)
  }

  return (
    <div className="form-range">
      <div className="form-range__track-row">
        <input
          type="range"
          className="form-range__input"
          min={min}
          max={max}
          step={step}
          value={current}
          onChange={handleChange}
        />
        <span className="form-range__value">{current}{unit}</span>
      </div>
    </div>
  )
}

/**
 * DualRangeSlider — Two-handle range slider (e.g. Time of Use).
 *
 * Supports both controlled and uncontrolled modes.
 *   Controlled:   <DualRangeSlider valueLow={low} valueHigh={high} onChangeLow={setLow} onChangeHigh={setHigh} />
 *   Uncontrolled:  <DualRangeSlider defaultLow={8} defaultHigh={17} />
 */
function DualRangeSlider({
  min = 0,
  max = 24,
  step = 1,
  defaultLow = 8,
  defaultHigh = 17,
  formatLabel,
  valueLow,
  valueHigh,
  onChangeLow,
  onChangeHigh,
}) {
  const [internalLow, setInternalLow] = useState(defaultLow)
  const [internalHigh, setInternalHigh] = useState(defaultHigh)

  const low = valueLow !== undefined ? valueLow : internalLow
  const high = valueHigh !== undefined ? valueHigh : internalHigh

  const fmt = formatLabel || (v => v)

  const pctLow = ((low - min) / (max - min)) * 100
  const pctHigh = ((high - min) / (max - min)) * 100

  const handleLow = e => {
    const v = Number(e.target.value)
    if (v <= high) {
      if (onChangeLow) onChangeLow(v)
      else setInternalLow(v)
    }
  }

  const handleHigh = e => {
    const v = Number(e.target.value)
    if (v >= low) {
      if (onChangeHigh) onChangeHigh(v)
      else setInternalHigh(v)
    }
  }

  return (
    <div className="form-dual-range">
      <div className="form-dual-range__track">
        <div
          className="form-dual-range__fill"
          style={{ left: `${pctLow}%`, width: `${pctHigh - pctLow}%` }}
        />
        <input
          type="range"
          className="form-dual-range__input"
          min={min}
          max={max}
          step={step}
          value={low}
          onChange={handleLow}
        />
        <input
          type="range"
          className="form-dual-range__input"
          min={min}
          max={max}
          step={step}
          value={high}
          onChange={handleHigh}
        />
      </div>
      <div className="form-dual-range__labels">
        <span>{fmt(low)}</span>
        <span>{fmt(high)}</span>
      </div>
    </div>
  )
}

/**
 * PercentInput — Small numeric input with % symbol.
 *
 * Supports both controlled (value + onChange) and uncontrolled modes.
 */
function PercentInput({ defaultValue = '', value, onChange }) {
  const [internal, setInternal] = useState(defaultValue)
  const current = value !== undefined ? value : internal
  const handleChange = e => {
    const v = e.target.value
    if (onChange) onChange(v)
    else setInternal(v)
  }

  return (
    <div className="form-percent">
      <input
        type="number"
        className="form-percent__input"
        min={0}
        max={100}
        value={current}
        onChange={handleChange}
        placeholder=""
      />
      <span className="form-percent__symbol">%</span>
    </div>
  )
}

/**
 * CooperationToggle — Binary toggle: Co-operative / Non co-operative.
 *
 * Supports both controlled (value + onChange) and uncontrolled modes.
 */
function CooperationToggle({ value, onChange }) {
  const [internal, setInternal] = useState(null)
  const selected = value !== undefined ? value : internal
  const handleChange = v => {
    if (onChange) onChange(v)
    else setInternal(v)
  }

  return (
    <div className="form-toggle">
      <div className="form-toggle__options">
        <button
          type="button"
          className={`form-toggle__option ${selected === 'cooperative' ? 'form-toggle__option--active' : ''}`}
          onClick={() => handleChange('cooperative')}
        >
          X
        </button>
        <button
          type="button"
          className={`form-toggle__option ${selected === 'non-cooperative' ? 'form-toggle__option--active' : ''}`}
          onClick={() => handleChange('non-cooperative')}
        >
          X
        </button>
      </div>
      <div className="form-toggle__sublabels">
        <span>Co-operative</span>
        <span>Non co-operative</span>
      </div>
    </div>
  )
}

/**
 * AgentTextArea — Text area for describing agent behaviour.
 *
 * Supports both controlled (value + onChange) and uncontrolled modes.
 */
function AgentTextArea({ value, onChange, placeholder = '' }) {
  const [internal, setInternal] = useState('')
  const current = value !== undefined ? value : internal
  const handleChange = e => {
    const v = e.target.value
    if (onChange) onChange(v)
    else setInternal(v)
  }

  return (
    <div className="form-textarea">
      <textarea
        className="form-textarea__input"
        value={current}
        onChange={handleChange}
        placeholder={placeholder}
      />
    </div>
  )
}

/**
 * ChartPlaceholder — Placeholder box for energy demand profile chart.
 */
function ChartPlaceholder() {
  return (
    <div className="form-chart-placeholder">
      Energy Demand Profile
    </div>
  )
}

export {
  FormLabel,
  FormAttr,
  RangeSlider,
  DualRangeSlider,
  PercentInput,
  CooperationToggle,
  AgentTextArea,
  ChartPlaceholder,
}
