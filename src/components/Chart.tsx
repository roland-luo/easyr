import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TitleComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { ChartColumn } from 'lucide-react';
import type { ComponentDef, SceneNode } from '../core/types';

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  CanvasRenderer,
]);

const tooltipStyle = {
  backgroundColor: 'rgba(8, 20, 36, 0.94)',
  borderColor: 'rgba(70, 150, 230, 0.35)',
  borderWidth: 1,
  textStyle: { color: '#dbeafe', fontSize: 12 },
  extraCssText: 'box-shadow: 0 8px 24px rgba(0,0,0,.45); border-radius: 6px;',
};

function hexToRgba(hex: string, alpha: number): string {
  if (typeof hex !== 'string' || !hex.startsWith('#')) return hex;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6) return hex;
  const num = parseInt(h, 16);
  if (Number.isNaN(num)) return hex;
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
}

interface SeriesModel {
  categories: string[];
  series: { name: string; data: number[] }[];
}

function normalizeSeries(parsed: unknown): SeriesModel | null {
  if (Array.isArray(parsed)) {
    if (!parsed.length) return null;
    if (parsed.every((item) => item && typeof item === 'object' && 'value' in (item as object))) {
      return {
        categories: parsed.map((item: any) => String(item.name ?? '')),
        series: [{ name: '数值', data: parsed.map((item: any) => Number(item.value) || 0) }],
      };
    }
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as any;
  if (!Array.isArray(obj.series) || !obj.series.length) return null;
  const series = obj.series.map((item: any, index: number) => ({
    name: String(item?.name ?? `系列 ${index + 1}`),
    data: Array.isArray(item?.data) ? item.data.map((v: any) => Number(v) || 0) : [],
  }));
  const longest = Math.max(...series.map((s: { data: number[] }) => s.data.length));
  const categories = Array.isArray(obj.categories)
    ? obj.categories.map((c: any) => String(c))
    : Array.from({ length: longest }, (_, i) => String(i + 1));
  return { categories, series };
}

function buildOption(props: Record<string, any>, parsed: unknown): any {
  const kind = String(props.kind ?? 'bar');
  const primary = String(props.primaryColor ?? '#37a2ff');
  const secondary = String(props.secondaryColor ?? '#22d3ee');
  const palette = [primary, secondary, '#3bf0a4', '#ffb020', '#a78bfa', '#ff7a7a'];

  const title = props.title
    ? { text: String(props.title), left: 12, top: 8, textStyle: { color: '#d4e8ff', fontSize: 15, fontWeight: 600 } }
    : undefined;

  if (kind === 'pie') {
    if (!Array.isArray(parsed) || !parsed.length) throw new Error('invalid pie data');
    const data = parsed.map((item: any) => ({ name: String(item?.name ?? ''), value: Number(item?.value) || 0 }));
    return {
      backgroundColor: 'transparent',
      color: palette,
      title,
      animationDuration: 700,
      tooltip: { trigger: 'item', ...tooltipStyle },
      legend: props.showLegend
        ? {
            bottom: 2,
            left: 'center',
            icon: 'circle',
            itemWidth: 8,
            itemHeight: 8,
            itemGap: 12,
            textStyle: { color: '#7fa6c8', fontSize: 11 },
          }
        : undefined,
      series: [
        {
          type: 'pie',
          radius: ['42%', '62%'],
          center: ['50%', '48%'],
          minAngle: 4,
          itemStyle: { borderColor: 'rgba(6, 14, 26, 0.9)', borderWidth: 2, borderRadius: 3 },
          label: { color: '#9fc4e4', fontSize: 12, formatter: '{b}  {d}%' },
          labelLine: { lineStyle: { color: 'rgba(110, 160, 210, 0.4)' }, length: 8, length2: 8 },
          data,
        },
      ],
    };
  }

  const model = normalizeSeries(parsed);
  if (!model) throw new Error('invalid series data');

  const axisLabel = { color: '#6f94b4', fontSize: 11 };
  const isLine = kind === 'line';

  return {
    backgroundColor: 'transparent',
    color: palette,
    title,
    animationDuration: 700,
    grid: { left: 16, right: 22, top: title || props.showLegend ? 50 : 30, bottom: 6, containLabel: true },
    tooltip: {
      trigger: 'axis',
      confine: true,
      axisPointer: { type: 'line', lineStyle: { color: 'rgba(80, 170, 255, 0.35)' } },
      ...tooltipStyle,
    },
    legend: props.showLegend
      ? {
          top: 10,
          right: 12,
          icon: 'roundRect',
          itemWidth: 10,
          itemHeight: 4,
          itemGap: 14,
          textStyle: { color: '#7fa6c8', fontSize: 11 },
        }
      : undefined,
    xAxis: {
      type: 'category',
      data: model.categories,
      boundaryGap: !isLine,
      axisLine: { lineStyle: { color: 'rgba(90, 140, 190, 0.25)' } },
      axisTick: { show: false },
      axisLabel: { ...axisLabel, interval: 0, hideOverlap: true },
    },
    yAxis: {
      type: 'value',
      axisLabel,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: 'rgba(90, 140, 190, 0.12)', type: 'dashed' } },
    },
    series: model.series.map((item, index) => {
      const color = palette[index % palette.length];
      if (isLine) {
        return {
          type: 'line',
          name: item.name,
          data: item.data,
          smooth: true,
          symbol: 'none',
          lineStyle: { width: 2, color },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: hexToRgba(color, 0.3) },
                { offset: 1, color: hexToRgba(color, 0) },
              ],
            },
          },
          emphasis: { focus: 'series' },
        };
      }
      return {
        type: 'bar',
        name: item.name,
        data: item.data,
        barWidth: '44%',
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: hexToRgba(color, 0.95) },
              { offset: 1, color: hexToRgba(color, 0.22) },
            ],
          },
        },
        emphasis: { focus: 'series' },
      };
    }),
  };
}

function ChartView({ node }: { node: SceneNode }) {
  const elRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof echarts.init> | null>(null);
  const [remote, setRemote] = useState<unknown>(null);
  const [error, setError] = useState('');
  const props = node.props;
  const dataUrl = String(props.dataUrl ?? '').trim();
  const refreshInterval = Number(props.refreshInterval) || 0;

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const chart = echarts.init(el);
    chartRef.current = chart;
    const observer = new ResizeObserver(() => {
      if (!chart.isDisposed()) chart.resize();
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!dataUrl) {
      setRemote(null);
      setError('');
      return;
    }
    let alive = true;
    let timer: number | undefined;
    const load = async () => {
      try {
        const response = await fetch(dataUrl, { headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        if (!alive) return;
        setRemote(json);
        setError('');
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? `数据源请求失败：${err.message}` : '数据源请求失败');
      }
    };
    void load();
    if (refreshInterval > 0) timer = window.setInterval(() => void load(), refreshInterval * 1000);
    return () => {
      alive = false;
      if (timer) window.clearInterval(timer);
    };
  }, [dataUrl, refreshInterval]);

  const signature = JSON.stringify([props, remote]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || chart.isDisposed()) return;
    let parsed: unknown = remote ?? props.data;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        setError('数据 JSON 解析失败');
        chart.clear();
        return;
      }
    }
    if (!parsed) {
      setError('暂无数据');
      chart.clear();
      return;
    }
    try {
      chart.setOption(buildOption(props, parsed), true);
      setError('');
    } catch {
      setError('数据格式与图表类型不匹配');
      chart.clear();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return (
    <div className="chart-root">
      <div ref={elRef} className="chart-canvas" />
      {error ? <div className="chart-error">{error}</div> : null}
    </div>
  );
}

const defaultData = JSON.stringify({
  categories: ['一月', '二月', '三月', '四月', '五月', '六月'],
  series: [{ name: '数据', data: [120, 200, 150, 80, 70, 110] }],
});

export const chartComponent: ComponentDef = {
  type: 'chart',
  name: '图表',
  category: 'chart',
  icon: ChartColumn,
  defaultSize: { w: 560, h: 340 },
  defaultProps: {
    kind: 'bar',
    title: '图表标题',
    data: defaultData,
    dataUrl: '',
    refreshInterval: 0,
    primaryColor: '#37a2ff',
    secondaryColor: '#22d3ee',
    showLegend: false,
  },
  fields: [
    {
      key: 'kind',
      label: '图表类型',
      type: 'select',
      options: [
        { label: '柱状图', value: 'bar' },
        { label: '折线图', value: 'line' },
        { label: '饼图 / 环图', value: 'pie' },
      ],
    },
    { key: 'title', label: '标题', type: 'text' },
    {
      key: 'data',
      label: '静态数据',
      type: 'textarea',
      rows: 8,
      placeholder: '柱 / 线：{ categories, series }；饼图：[{ name, value }]',
    },
    { key: 'dataUrl', label: '接口地址', type: 'text', placeholder: 'https://api.example.com/data' },
    { key: 'refreshInterval', label: '刷新间隔', type: 'number', min: 0, step: 1, suffix: 's' },
    { key: 'primaryColor', label: '主色', type: 'color' },
    { key: 'secondaryColor', label: '辅色', type: 'color' },
    { key: 'showLegend', label: '显示图例', type: 'boolean' },
  ],
  render: ({ node }) => <ChartView node={node} />,
};
