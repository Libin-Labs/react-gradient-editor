export interface GradientStop {
  id: string;
  color: string;
  position: number;
}

export interface Gradient {
  type: 'linear' | 'radial';
  angle: number;
  stops: GradientStop[];
}

export const DEFAULT_GRADIENT: Readonly<{
  type: 'linear';
  angle: number;
  stops: readonly Readonly<GradientStop>[];
}> = Object.freeze({
  type: 'linear',
  angle: 90,
  stops: Object.freeze([
    Object.freeze({ id: 'start', color: '#6366f1', position: 0 }),
    Object.freeze({ id: 'end', color: '#ec4899', position: 100 }),
  ]),
});

export function isHexColor(value: unknown): value is string {
  return (
    typeof value === 'string' && /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(value)
  );
}

export function validateGradient(value: unknown): asserts value is Gradient {
  if (!value || typeof value !== 'object') throw new TypeError('Expected a gradient object.');
  const gradient = value as Gradient;
  if (gradient.type !== 'linear' && gradient.type !== 'radial')
    throw new TypeError('Unknown gradient type.');
  if (!Number.isFinite(gradient.angle) || gradient.angle < 0 || gradient.angle > 360) {
    throw new RangeError('Angle must be from 0 to 360.');
  }
  if (!Array.isArray(gradient.stops) || gradient.stops.length < 2 || gradient.stops.length > 64) {
    throw new RangeError('A gradient needs 2 to 64 stops.');
  }
  const ids = new Set<string>();
  for (const stop of gradient.stops) {
    if (!stop || typeof stop.id !== 'string' || !stop.id || ids.has(stop.id)) {
      throw new TypeError('Stop IDs must be nonempty and unique.');
    }
    ids.add(stop.id);
    if (!isHexColor(stop.color)) throw new TypeError('Stop colors must be HEX colors.');
    if (!Number.isFinite(stop.position) || stop.position < 0 || stop.position > 100) {
      throw new RangeError('Stop positions must be from 0 to 100.');
    }
  }
}

export function cloneGradient(gradient: Gradient): Gradient {
  validateGradient(gradient);
  return { ...gradient, stops: gradient.stops.map((stop) => ({ ...stop })) };
}

export function gradientToCss(gradient: Gradient): string {
  validateGradient(gradient);
  const stops = [...gradient.stops]
    .sort((a, b) => a.position - b.position)
    .map((stop) => `${stop.color} ${Number(stop.position.toFixed(3))}%`)
    .join(', ');
  return gradient.type === 'linear'
    ? `linear-gradient(${Number(gradient.angle.toFixed(3))}deg, ${stops})`
    : `radial-gradient(circle, ${stops})`;
}

export function addStop(gradient: Gradient, stop: GradientStop): Gradient {
  const next = cloneGradient(gradient);
  next.stops.push({ ...stop });
  validateGradient(next);
  return next;
}

export function removeStop(gradient: Gradient, id: string): Gradient {
  const next = cloneGradient(gradient);
  const index = next.stops.findIndex((stop) => stop.id === id);
  if (index === -1) throw new RangeError('Unknown stop ID.');
  next.stops.splice(index, 1);
  validateGradient(next);
  return next;
}

export function updateStop(
  gradient: Gradient,
  id: string,
  patch: Partial<Pick<GradientStop, 'color' | 'position'>>,
): Gradient {
  const next = cloneGradient(gradient);
  const index = next.stops.findIndex((stop) => stop.id === id);
  if (index === -1) throw new RangeError('Unknown stop ID.');
  next.stops[index] = { ...next.stops[index], ...patch };
  validateGradient(next);
  return next;
}
