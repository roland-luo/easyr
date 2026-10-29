import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import type { ComponentDef, SceneNode } from '../core/types';

const pad = (n: number) => String(n).padStart(2, '0');
const WEEK = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

function ClockView({ node }: { node: SceneNode }) {
  const p = node.props;
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const align = p.align === 'center' ? 'center' : p.align === 'right' ? 'flex-end' : 'flex-start';

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: align,
        justifyContent: 'center',
        gap: 4,
        color: p.color,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <div style={{ fontSize: p.fontSize, fontWeight: 600, letterSpacing: 2, lineHeight: 1.1 }}>
        {pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}
      </div>
      {p.showDate ? (
        <div
          style={{
            fontSize: Math.max(11, Math.round(p.fontSize * 0.3)),
            color: p.dateColor,
            letterSpacing: 1.5,
          }}
        >
          {now.getFullYear()}年{pad(now.getMonth() + 1)}月{pad(now.getDate())}日 {WEEK[now.getDay()]}
        </div>
      ) : null}
    </div>
  );
}

export const clockComponent: ComponentDef = {
  type: 'clock',
  name: '时钟',
  category: 'basic',
  icon: Clock,
  defaultSize: { w: 320, h: 90 },
  defaultProps: {
    showDate: true,
    fontSize: 40,
    color: '#eaf6ff',
    dateColor: '#4f83a8',
    align: 'right',
  },
  fields: [
    { key: 'showDate', label: '显示日期', type: 'boolean' },
    { key: 'fontSize', label: '时间字号', type: 'number', min: 12, max: 160, suffix: 'px' },
    { key: 'color', label: '时间颜色', type: 'color' },
    { key: 'dateColor', label: '日期颜色', type: 'color' },
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
  ],
  render: ({ node }) => <ClockView node={node} />,
};
