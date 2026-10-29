import { Gauge } from 'lucide-react';
import type { ComponentDef } from '../core/types';

export const metricComponent: ComponentDef = {
  type: 'metric',
  name: '指标卡',
  category: 'basic',
  icon: Gauge,
  defaultSize: { w: 360, h: 168 },
  defaultProps: {
    label: '指标名称',
    value: '8,246',
    unit: '台',
    trend: 6.8,
    note: '较昨日',
    accent: '#22d3ee',
  },
  fields: [
    { key: 'label', label: '指标名称', type: 'text' },
    { key: 'value', label: '数值', type: 'text' },
    { key: 'unit', label: '单位', type: 'text' },
    { key: 'trend', label: '趋势 %', type: 'number', step: 0.1 },
    { key: 'note', label: '备注', type: 'text' },
    { key: 'accent', label: '强调色', type: 'color' },
  ],
  render: ({ node }) => {
    const p = node.props;
    const up = Number(p.trend) >= 0;
    return (
      <div
        className="metric-card"
        style={{
          borderColor: `${p.accent}44`,
          boxShadow: `inset 0 0 40px ${p.accent}0f`,
        }}
      >
        <div className="metric-topline" style={{ background: p.accent }} />
        <div className="metric-label">{p.label}</div>
        <div className="metric-value-row">
          <span className="metric-value">{p.value}</span>
          {p.unit ? <span className="metric-unit">{p.unit}</span> : null}
        </div>
        <div className="metric-foot">
          <span className="metric-dot" style={{ background: p.accent }} />
          <span className={up ? 'metric-trend up' : 'metric-trend down'}>
            {up ? '▲' : '▼'} {Math.abs(Number(p.trend) || 0).toFixed(1)}%
          </span>
          <span className="metric-note">{p.note}</span>
        </div>
      </div>
    );
  },
};
