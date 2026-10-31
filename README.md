# @lp-labs/react-gradient-editor

Package version: `0.1.0`.

A dependency-free React gradient editor: add, select, recolor, move and remove
stops, choose a linear angle or a circular radial gradient, and copy CSS output.
React 18.2 or 19 is the only peer. ESM, CommonJS and TypeScript declarations are
included; styles are opt-in.

## Install and use

```sh
npm install @lp-labs/react-gradient-editor react
```

```tsx
import { useState } from "react";
import {
  GradientEditor,
  type Gradient,
} from "@lp-labs/react-gradient-editor";
import "@lp-labs/react-gradient-editor/style.css";

export function BackgroundEditor() {
  const [gradient, setGradient] = useState<Gradient>({
    type: "linear",
    angle: 90,
    stops: [
      { id: "blue", color: "#2563eb", position: 0 },
      { id: "pink", color: "#ec489980", position: 100 },
    ],
  });
  return (
    <GradientEditor
      value={gradient}
      onChange={(next, css) => {
        setGradient(next);
        console.log(css);
      }}
    />
  );
}
```

For uncontrolled use, render `<GradientEditor />`, or pass `defaultValue`.
The default is a linear 90-degree gradient from `#6366f1` at 0% to `#ec4899`
at 100%, with IDs `start` and `end`. State is initialized once; later changes to
`defaultValue` do not reset it. Do not switch between controlled and uncontrolled
mode during a mount. Controlled proposals do not change the preview until
the parent supplies a new `value`. Editable color text is a local draft.

## Component API

`GradientEditor(props: GradientEditorProps)` is a named export.

| Prop | Type | Default / behavior |
| --- | --- | --- |
| `value` | `Gradient` | Omit for internal state |
| `defaultValue` | `Gradient` | Default gradient above; used on mount |
| `onChange` | `(gradient: Gradient, css: string) => void` | Called for valid edit requests, not on mount; receives an independent copy |
| `disabled` | `boolean` | `false`; disables editing |
| `label` | `string` | `"Gradient editor"`; fieldset legend |
| `className` | `string` | `""`; appended to the root |
| `style` | `React.CSSProperties` | Optional root styles |

```ts
interface GradientStop {
  id: string;
  color: string;
  position: number;
}
interface Gradient {
  type: "linear" | "radial";
  angle: number;
  stops: GradientStop[];
}
```

Stop IDs must be unique nonempty strings. A gradient has **2-64 stops**.
Positions are finite percentages in `[0, 100]`. Duplicate positions are allowed
for hard edges. Colors are only `#RGB`, `#RGBA`, `#RRGGBB` or `#RRGGBBAA`
(case insensitive). Angles are finite degrees in `[0, 360]`, including for a
radial model; radial output ignores the retained angle.

The UI adds a `#808080` stop at 50%, generating the first unused `stop-N` ID.
It selects that stop, prevents removal below two stops, and disables addition
at 64. Selection is local UI state; external removal selects the first remaining
stop. The range input moves stops in 0.1% increments; exact numeric editing
accepts any finite in-range value. Color text commits on blur or Enter; Escape
restores the current model color. Invalid drafts stay visible with an error
and do not call `onChange`. Invalid numeric edits are ignored.

## Pure helpers and exports

All helpers are named exports, do not access the DOM, and do not mutate inputs.

| Export | Signature / result |
| --- | --- |
| `DEFAULT_GRADIENT` | Deeply frozen default model; readonly stops. Copy it before using as a mutable `Gradient` |
| `isHexColor` | `(value: unknown) => value is string`; returns `false` rather than throwing |
| `validateGradient` | `(value: unknown) => asserts value is Gradient`; returns `undefined` on success |
| `cloneGradient` | `(gradient: Gradient) => Gradient`; independent object and stops |
| `gradientToCss` | `(gradient: Gradient) => string`; complete CSS background-image value |
| `addStop` | `(gradient: Gradient, stop: GradientStop) => Gradient`; appends a copy |
| `removeStop` | `(gradient: Gradient, id: string) => Gradient` |
| `updateStop` | `(gradient: Gradient, id: string, patch: Partial<Pick<GradientStop, "color" \| "position">>) => Gradient` |

`Gradient`, `GradientStop` and `GradientEditorProps` are exported types.
Validators and model helpers throw `TypeError` for malformed shapes, IDs, types
or color syntax, and `RangeError` for invalid angles, positions or stop counts.
Unknown stop IDs throw `RangeError`. Invalid component models throw during
render; use validation before accepting external input.

```ts
import {
  addStop, gradientToCss, validateGradient,
} from "@lp-labs/react-gradient-editor";

const savedGradient = JSON.stringify({
  type: "linear", angle: 90,
  stops: [
    { id: "blue", color: "#2563eb", position: 0 },
    { id: "pink", color: "#ec489980", position: 100 }
  ]
});
const data: unknown = JSON.parse(savedGradient);
validateGradient(data);
const next = addStop(data, { id: "middle", color: "#fff8", position: 50 });
const css = gradientToCss(next);
// linear-gradient(90deg, #2563eb 0%, #fff8 50%, #ec489980 100%)
```

CSS output sorts a copy by position, preserving equal-position order and the
original array. Numbers are rounded to three decimal places only at export;
model precision is retained. Linear output is `linear-gradient(Ndeg, ...)`;
radial output is `radial-gradient(circle, ...)`.

## Customization

Import `style.css` once, override the scoped classes, or supply your own styles.
The stylesheet does not style the document or unrelated components.

```css
.my-gradient {
  --lp-gradient-accent: #0369a1;
  --lp-gradient-surface: #f0f9ff;
  --lp-gradient-text: #0c4a6e;
  max-width: 44rem;
}
```

Use `className="my-gradient"`. These three CSS variables are the public theme
hooks. Root styles, preview, stops, swatch and controls use the
`lp-gradient-editor` class prefix.

## Accessibility and scope

Native labels, buttons, number/range inputs, selects, a fieldset legend, pressed
stop selection, visible focus and associated error messages support keyboard
operation. Native range controls support arrows; the exact numeric input is an
alternative to pointer movement. The CSS textarea is read-only and selectable.
Preview colors alone do not communicate selection.

This is a scoped editor, not a full CSS gradient parser. It does **not** import
gradient strings, support named/RGB/HSL colors, conic or repeating gradients,
radial size/position/ellipse controls, color-space interpolation settings, or
custom draggable stop tracks. Browser CSS rendering determines interpolation;
alpha colors can require a contrasting parent surface. No automated contrast
assessment or cross-browser/screen-reader certification is claimed.

All edits/helpers are synchronous, with no worker, timer, subscription, or
cancellation API. Parent applications own persistence. Rendering/validation scan
the stop list and CSS export sorts a copy, bounded by the 64-stop schema cap.
Import accesses no browser globals; helper-only root imports still require
React to resolve. Use your application's React renderer for the native controls.

## License

[MIT](./LICENSE).

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
