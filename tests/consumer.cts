import { createElement } from 'react';
import {
  GradientEditor,
  gradientToCss,
  type GradientEditorProps,
} from '@lp-labs/react-gradient-editor';

const props: GradientEditorProps = {
  onChange(value, css) {
    const output: string = gradientToCss(value) + css;
    void output;
  },
};
createElement(GradientEditor, props);
