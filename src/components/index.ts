import { registerComponent } from '../core/registry';
import { textComponent } from './Text';
import { shapeComponent } from './Shape';
import { metricComponent } from './Metric';
import { clockComponent } from './ClockView';
import { chartComponent } from './Chart';
import { imageComponent } from './ImageBox';

/**
 * 注册内置组件。第三方组件只需要实现 ComponentDef 并调用 registerComponent，
 * 即可自动出现在左侧组件库、属性面板、图层和预览中。
 */
export const builtinComponents = [
  textComponent,
  metricComponent,
  clockComponent,
  shapeComponent,
  chartComponent,
  imageComponent,
];

for (const def of builtinComponents) registerComponent(def);
