import { useEffect, useId, useState, type CSSProperties } from 'react';
import {
  addStop,
  cloneGradient,
  DEFAULT_GRADIENT,
  gradientToCss,
  isHexColor,
  removeStop,
  updateStop,
  validateGradient,
  type Gradient,
  type GradientStop,
} from './gradient.js';

export interface GradientEditorProps {
  value?: Gradient;
  defaultValue?: Gradient;
  onChange?: (gradient: Gradient, css: string) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

function StopColor({
  color,
  disabled,
  onChange,
}: {
  color: string;
  disabled: boolean;
  onChange: (color: string) => void;
}) {
  const [draft, setDraft] = useState(color);
  const [error, setError] = useState(false);
  const id = useId();
  useEffect(() => {
    setDraft(color);
    setError(false);
  }, [color]);
  function commit() {
    if (!isHexColor(draft)) {
      setError(true);
      return;
    }
    setError(false);
    onChange(draft);
  }
  return (
    <label>
      Stop color
      <input
        value={draft}
        disabled={disabled}
        aria-invalid={error}
        aria-describedby={error ? id : undefined}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
          }
          if (event.key === 'Escape') {
            setDraft(color);
            setError(false);
          }
        }}
      />
      {error && (
        <span id={id} role="alert">
          Use #RGB, #RGBA, #RRGGBB or #RRGGBBAA.
        </span>
      )}
    </label>
  );
}

export function GradientEditor({
  value,
  defaultValue,
  onChange,
  disabled = false,
  label = 'Gradient editor',
  className = '',
  style,
}: GradientEditorProps) {
  const [internal, setInternal] = useState<Gradient>(() =>
    cloneGradient(
      defaultValue ?? {
        ...DEFAULT_GRADIENT,
        stops: DEFAULT_GRADIENT.stops.map((stop) => ({ ...stop })),
      },
    ),
  );
  const gradient = value ?? internal;
  validateGradient(gradient);
  const css = gradientToCss(gradient);
  const [selected, setSelected] = useState(gradient.stops[0].id);
  const active = gradient.stops.some((stop) => stop.id === selected)
    ? selected
    : gradient.stops[0].id;

  function change(next: Gradient) {
    if (disabled) return;
    if (value === undefined) setInternal(cloneGradient(next));
    onChange?.(cloneGradient(next), gradientToCss(next));
  }

  function append() {
    let number = 1;
    while (gradient.stops.some((stop) => stop.id === `stop-${number}`)) number += 1;
    const stop: GradientStop = { id: `stop-${number}`, position: 50, color: '#808080' };
    change(addStop(gradient, stop));
    setSelected(stop.id);
  }

  return (
    <fieldset className={`lp-gradient-editor ${className}`} style={style} disabled={disabled}>
      <legend>{label}</legend>
      <div
        className="lp-gradient-editor__preview"
        style={{ backgroundImage: css }}
        role="img"
        aria-label="Gradient preview"
      />
      <label>
        Gradient type
        <select
          value={gradient.type}
          onChange={(event) =>
            change({ ...gradient, type: event.target.value as Gradient['type'] })
          }
        >
          <option value="linear">Linear</option>
          <option value="radial">Radial (circle)</option>
        </select>
      </label>
      <label>
        Angle (degrees)
        <input
          type="number"
          min={0}
          max={360}
          step={1}
          value={gradient.angle}
          disabled={gradient.type === 'radial' || disabled}
          onChange={(event) => {
            const angle = event.target.valueAsNumber;
            if (Number.isFinite(angle) && angle >= 0 && angle <= 360)
              change({ ...gradient, angle });
          }}
        />
      </label>
      <div role="group" aria-label="Select stop" className="lp-gradient-editor__stops">
        {gradient.stops.map((stop, index) => (
          <button
            type="button"
            key={stop.id}
            aria-pressed={stop.id === active}
            onClick={() => setSelected(stop.id)}
          >
            <span className="lp-gradient-editor__swatch" style={{ background: stop.color }} />
            Stop {index + 1} ({stop.position}%)
          </button>
        ))}
      </div>
      {gradient.stops
        .filter((stop) => stop.id === active)
        .map((stop) => (
          <div key={stop.id} className="lp-gradient-editor__controls">
            <StopColor
              color={stop.color}
              disabled={disabled}
              onChange={(color) => change(updateStop(gradient, stop.id, { color }))}
            />
            <label>
              Stop position (%)
              <input
                type="range"
                min={0}
                max={100}
                step={0.1}
                value={stop.position}
                onChange={(event) =>
                  change(updateStop(gradient, stop.id, { position: event.target.valueAsNumber }))
                }
              />
              <output>{stop.position}%</output>
            </label>
            <label>
              Exact position (%)
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={stop.position}
                onChange={(event) => {
                  const position = event.target.valueAsNumber;
                  if (Number.isFinite(position) && position >= 0 && position <= 100) {
                    change(updateStop(gradient, stop.id, { position }));
                  }
                }}
              />
            </label>
            <button
              type="button"
              disabled={disabled || gradient.stops.length <= 2}
              onClick={() => change(removeStop(gradient, stop.id))}
            >
              Remove stop
            </button>
          </div>
        ))}
      <button type="button" disabled={disabled || gradient.stops.length >= 64} onClick={append}>
        Add stop
      </button>
      <label>
        CSS gradient
        <textarea readOnly value={css} rows={3} />
      </label>
    </fieldset>
  );
}
