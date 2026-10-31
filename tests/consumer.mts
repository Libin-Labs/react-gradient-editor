import { createElement } from 'react';
import {
  GradientEditor,
  gradientToCss,
  type Gradient,
  type GradientEditorProps,
} from '@lp-labs/react-gradient-editor';

const value: Gradient = {
  type: 'linear',
  angle: 90,
  stops: [
    { id: 'a', position: 0, color: '#fff' },
    { id: 'b', position: 100, color: '#000' },
  ],
};
const props: GradientEditorProps = {
  value,
  onChange(next, css) {
    const result: string = gradientToCss(next) + css;
    void result;
  },
};
createElement(GradientEditor, props);
// @ts-expect-error Unsupported gradient kind.
const bad: Gradient = { ...value, type: 'conic' };
void bad;
