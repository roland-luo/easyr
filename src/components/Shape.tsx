import { Square } from 'lucide-react';
import type { ComponentDef } from '../core/types';

export const shapeComponent: ComponentDef = {
  type: 'shape',
  name: '形状 / 面板',
  category: 'decoration',
  icon: Square,
  defaultSize: { w: 320, h: 200 },
  defaultProps: {
    fill: 'rgba(10, 30, 60, 0.6)',
    border: 'rgba(64, 158, 255, 0.25)',
    borderWidth: 1,
    radius: 10,
    glow: true,
  },
  fields: [
    { key: 'fill', label: '背景', type: 'text', placeholder: '颜色 / 渐变 / 图片' },
    { key: 'border', label: '描边颜色', type: 'color' },
    { key: 'borderWidth', label: '描边宽度', type: 'number', min: 0, max: 20, suffix: 'px' },
    { key: 'radius', label: '圆角', type: 'number', min: 0, max: 200, suffix: 'px' },
    { key: 'glow', label: '外发光', type: 'boolean' },
  ],
  render: ({ node }) => {
    const p = node.props;
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: p.fill,
          border: `${p.borderWidth}px solid ${p.border}`,
          borderRadius: p.radius,
          boxShadow: p.glow
            ? '0 0 30px rgba(38, 132, 255, 0.16), inset 0 0 30px rgba(38, 132, 255, 0.05)'
            : 'none',
        }}
      />
    );
  },
};
