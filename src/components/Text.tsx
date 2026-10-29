import { Type } from 'lucide-react';
import type { ComponentDef } from '../core/types';

export const textComponent: ComponentDef = {
  type: 'text',
  name: '文本',
  category: 'basic',
  icon: Type,
  defaultSize: { w: 360, h: 48 },
  defaultProps: {
    content: '在这里输入文本',
    fontSize: 24,
    color: '#e6f0ff',
    fontWeight: 500,
    align: 'left',
    letterSpacing: 0,
    lineHeight: 1.4,
  },
  fields: [
    { key: 'content', label: '内容', type: 'textarea', rows: 3 },
    { key: 'fontSize', label: '字号', type: 'number', min: 8, max: 240, suffix: 'px' },
    { key: 'color', label: '颜色', type: 'color' },
    {
      key: 'fontWeight',
      label: '字重',
      type: 'select',
      options: [
        { label: '细体 300', value: '300' },
        { label: '常规 400', value: '400' },
        { label: '中等 500', value: '500' },
        { label: '半粗 600', value: '600' },
        { label: '粗体 700', value: '700' },
      ],
    },
    {
      key: 'align',
      label: '对齐',
      type: 'select',
      options: [
        { label: '左对齐', value: 'left' },
        { label: '居中', value: 'center' },
        { label: '右对齐', value: 'right' },
      ],
    },
    { key: 'letterSpacing', label: '字间距', type: 'number', step: 0.5, suffix: 'px' },
    { key: 'lineHeight', label: '行高', type: 'number', step: 0.1 },
  ],
  render: ({ node }) => {
    const p = node.props;
    const justify = p.align === 'center' ? 'center' : p.align === 'right' ? 'flex-end' : 'flex-start';
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: justify,
          fontSize: p.fontSize,
          color: p.color,
          fontWeight: p.fontWeight,
          letterSpacing: p.letterSpacing,
          lineHeight: p.lineHeight,
          textAlign: p.align,
          whiteSpace: 'pre-wrap',
          overflow: 'hidden',
        }}
      >
        {p.content}
      </div>
    );
  },
};
