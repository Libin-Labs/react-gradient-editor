import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { afterEach, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import * as api from '../dist/esm/index.js';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT: true,
});
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
const { createRoot } = await import('react-dom/client');
const roots = [];
afterEach(() => {
  for (const root of roots.splice(0)) act(() => root.unmount());
  document.body.replaceChildren();
});
const fresh = () => ({
  ...api.DEFAULT_GRADIENT,
  stops: api.DEFAULT_GRADIENT.stops.map((stop) => ({ ...stop })),
});
function mount(props = {}) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  const render = (next) => act(() => root.render(createElement(api.GradientEditor, next)));
  render(props);
  return { container, render };
}
function input(element, value) {
  act(() => {
    const prototype =
      element.tagName === 'SELECT'
        ? dom.window.HTMLSelectElement.prototype
        : dom.window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, String(value));
    element.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    element.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  });
}
function button(container, text) {
  return [...container.querySelectorAll('button')].find((element) =>
    element.textContent.includes(text),
  );
}
function click(element) {
  act(() => element.click());
}
function field(container, text) {
  return [...container.querySelectorAll('label')]
    .find((label) => label.textContent.startsWith(text))
    .querySelector('input,select,textarea');
}

test('CSS export sorts copies, supports radial and duplicate-position hard stops', () => {
  const gradient = fresh();
  gradient.stops.reverse();
  assert.equal(api.gradientToCss(gradient), 'linear-gradient(90deg, #6366f1 0%, #ec4899 100%)');
  assert.equal(gradient.stops[0].id, 'end');
  gradient.type = 'radial';
  gradient.stops[0].position = 0;
  assert.equal(api.gradientToCss(gradient), 'radial-gradient(circle, #ec4899 0%, #6366f1 0%)');
});

test('immutable stop editing enforces IDs, bounds and minimum/maximum stop counts', () => {
  const gradient = fresh();
  const added = api.addStop(gradient, { id: 'middle', color: '#abcd', position: 50 });
  assert.equal(gradient.stops.length, 2);
  assert.equal(added.stops.length, 3);
  const moved = api.updateStop(added, 'middle', { position: 75.5, color: '#ffffff00' });
  assert.equal(added.stops[2].position, 50);
  assert.equal(moved.stops[2].position, 75.5);
  assert.equal(api.removeStop(moved, 'middle').stops.length, 2);
  assert.throws(() => api.removeStop(gradient, 'start'), RangeError);
  assert.throws(() => api.removeStop(gradient, 'unknown'), RangeError);
  assert.throws(() => api.addStop(gradient, gradient.stops[0]), TypeError);
  assert.throws(() => api.updateStop(gradient, 'start', { position: Infinity }), RangeError);
  assert.throws(() => api.updateStop(gradient, 'unknown', {}), RangeError);
  assert.throws(() =>
    api.validateGradient({
      ...gradient,
      stops: Array.from({ length: 65 }, (_, i) => ({ id: String(i), color: '#fff', position: 0 })),
    }),
  );
});

test('validation rejects unsafe colors, invalid angles and malformed models', () => {
  for (const color of ['red', 'var(--x)', '#fff);background:url(x)', '#ggg']) {
    assert.throws(() => api.updateStop(fresh(), 'start', { color }));
  }
  for (const value of [
    null,
    {},
    { ...fresh(), angle: NaN },
    { ...fresh(), angle: -1 },
    { ...fresh(), type: 'conic' },
  ]) {
    assert.throws(() => api.validateGradient(value));
  }
  assert.equal(api.isHexColor('#aabbccdd'), true);
  assert.equal(api.isHexColor(12), false);
});

test('uncontrolled add, select, move, color keyboard commit, angle, radial and remove update CSS', () => {
  const changes = [];
  const { container } = mount({ onChange: (value, css) => changes.push({ value, css }) });
  click(button(container, 'Add stop'));
  assert.equal(changes.at(-1).value.stops.length, 3);
  input(field(container, 'Exact position'), 70);
  assert.match(changes.at(-1).css, /#808080 70%/);
  input(field(container, 'Stop position'), 60);
  assert.match(changes.at(-1).css, /#808080 60%/);
  const color = field(container, 'Stop color');
  input(color, '#ff000080');
  act(() =>
    color.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
  );
  assert.match(changes.at(-1).css, /#ff000080 60%/);
  input(field(container, 'Angle'), 180);
  assert.match(changes.at(-1).css, /^linear-gradient\(180deg/);
  input(field(container, 'Gradient type'), 'radial');
  assert.match(changes.at(-1).css, /^radial-gradient\(circle/);
  assert.equal(field(container, 'Angle').disabled, true);
  click(button(container, 'Remove stop'));
  assert.equal(changes.at(-1).value.stops.length, 2);
  assert.equal(button(container, 'Remove stop').disabled, true);
});

test('invalid color draft reports an accessible error without emitting', () => {
  let count = 0;
  const { container } = mount({ onChange: () => count++ });
  const color = field(container, 'Stop color');
  input(color, 'red');
  act(() =>
    color.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
  );
  assert.equal(count, 0);
  assert.equal(color.getAttribute('aria-invalid'), 'true');
  assert.ok(container.querySelector('[role="alert"]'));
  act(() =>
    color.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
  );
  assert.equal(color.value, '#6366f1');
});

test('controlled callbacks do not mutate input; parent rendering applies the proposal', () => {
  const value = fresh();
  let proposal;
  const props = {
    value,
    onChange: (next) => {
      proposal = next;
    },
  };
  const { container, render } = mount(props);
  click(button(container, 'Add stop'));
  assert.equal(value.stops.length, 2);
  assert.equal(proposal.stops.length, 3);
  assert.equal(container.querySelectorAll('[aria-pressed]').length, 2);
  render({ ...props, value: proposal });
  assert.equal(container.querySelectorAll('[aria-pressed]').length, 3);
  render({ ...props, value: api.removeStop(proposal, proposal.stops[2].id) });
  assert.ok(container.querySelector('[aria-pressed="true"]'));
});

test('disabled controls emit nothing', () => {
  let count = 0;
  const { container } = mount({ disabled: true, onChange: () => count++ });
  click(button(container, 'Add stop'));
  input(field(container, 'Exact position'), 25);
  assert.equal(count, 0);
});

test('ESM and CJS APIs match', () => {
  const cjs = createRequire(import.meta.url)('../dist/cjs/index.js');
  assert.deepEqual(Object.keys(cjs).sort(), Object.keys(api).sort());
  assert.equal(cjs.gradientToCss(fresh()), api.gradientToCss(fresh()));
});
