import type { ProjectDoc, Rect, SceneNode } from './types';
import { uid } from './id';

const rect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h, rotation: 0 });

const json = (value: unknown) => JSON.stringify(value);

const panel = {
  fill: 'rgba(8, 24, 48, 0.55)',
  border: 'rgba(64, 158, 255, 0.18)',
  borderWidth: 1,
  radius: 10,
  glow: true,
};

const barData = json({
  categories: ['华东', '华北', '华南', '西南', '西北', '东北'],
  series: [{ name: '能耗', data: [820, 742, 651, 528, 436, 318] }],
});

const lineData = json({
  categories: ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'],
  series: [
    { name: '上行流量', data: [320, 280, 240, 260, 310, 460, 680, 820, 760, 690, 610, 470] },
    { name: '下行流量', data: [180, 150, 130, 140, 190, 300, 520, 610, 580, 520, 430, 330] },
  ],
});

const pieData = json([
  { name: '设备离线', value: 128 },
  { name: '网络抖动', value: 96 },
  { name: '存储告警', value: 72 },
  { name: '服务异常', value: 45 },
  { name: '其他', value: 31 },
]);

const deviceData = json({
  categories: ['园区 A', '园区 B', '园区 C', '园区 D', '园区 E', '园区 F'],
  series: [{ name: '设备数', data: [1280, 960, 1180, 760, 540, 320] }],
});

/** 内置示例大屏：让第一次启动就有可看的效果，也是组件能力的回归用例 */
export function createSeedDoc(): ProjectDoc {
  const nodes: SceneNode[] = [];

  const add = (type: string, name: string, r: Rect, props: Record<string, any>) => {
    const node: SceneNode = {
      id: uid(),
      type,
      name,
      parentId: null,
      children: [],
      rect: r,
      props,
    };
    nodes.push(node);
    return node;
  };

  add('shape', '面板 · 区域能耗', rect(64, 184, 560, 400), { ...panel });
  add('shape', '面板 · 流量趋势', rect(648, 184, 624, 400), { ...panel });
  add('shape', '面板 · 告警分布', rect(1296, 184, 560, 400), { ...panel });
  add('shape', '面板 · 设备接入', rect(64, 608, 880, 400), { ...panel });

  add('shape', '顶部光带', rect(64, 164, 1792, 1), {
    fill: 'linear-gradient(90deg, rgba(62,166,255,0) 0%, rgba(62,166,255,.6) 12%, rgba(62,166,255,.12) 50%, rgba(62,166,255,.6) 88%, rgba(62,166,255,0) 100%)',
    border: 'transparent',
    borderWidth: 0,
    radius: 0,
    glow: false,
  });

  add('chart', '图表 · 区域能耗', rect(88, 236, 512, 324), {
    kind: 'bar',
    title: '区域能耗排行',
    data: barData,
    dataUrl: '',
    refreshInterval: 0,
    primaryColor: '#37a2ff',
    secondaryColor: '#22d3ee',
    showLegend: false,
  });

  add('chart', '图表 · 流量趋势', rect(672, 236, 576, 324), {
    kind: 'line',
    title: '24 小时流量趋势',
    data: lineData,
    dataUrl: '',
    refreshInterval: 0,
    primaryColor: '#22d3ee',
    secondaryColor: '#5b8cff',
    showLegend: true,
  });

  add('chart', '图表 · 告警分布', rect(1320, 236, 512, 324), {
    kind: 'pie',
    title: '告警类型分布',
    data: pieData,
    dataUrl: '',
    refreshInterval: 0,
    primaryColor: '#37a2ff',
    secondaryColor: '#3bf0a4',
    showLegend: true,
  });

  add('chart', '图表 · 设备接入', rect(88, 660, 832, 324), {
    kind: 'bar',
    title: '设备接入数量',
    data: deviceData,
    dataUrl: '',
    refreshInterval: 0,
    primaryColor: '#3bf0a4',
    secondaryColor: '#22d3ee',
    showLegend: false,
  });

  add('metric', '指标 · 在线设备', rect(968, 608, 432, 188), {
    label: '在线设备',
    value: '12,846',
    unit: '台',
    trend: 8.2,
    note: '较昨日',
    accent: '#22d3ee',
  });

  add('metric', '指标 · 在线率', rect(1424, 608, 432, 188), {
    label: '实时在线率',
    value: '99.26',
    unit: '%',
    trend: 0.4,
    note: '近 24 小时',
    accent: '#3bf0a4',
  });

  add('metric', '指标 · 今日告警', rect(968, 820, 432, 188), {
    label: '今日告警',
    value: '327',
    unit: '条',
    trend: -12.5,
    note: '较昨日',
    accent: '#ffb020',
  });

  add('metric', '指标 · 平均响应', rect(1424, 820, 432, 188), {
    label: '平均响应',
    value: '1.82',
    unit: 's',
    trend: -6.1,
    note: '较昨日',
    accent: '#5b8cff',
  });

  add('text', '主标题', rect(64, 40, 980, 60), {
    content: '城市运行态势监控平台',
    fontSize: 44,
    color: '#eaf6ff',
    fontWeight: 700,
    align: 'left',
    letterSpacing: 3,
    lineHeight: 1.2,
  });

  add('text', '副标题', rect(68, 106, 900, 22), {
    content: 'CITY OPERATION INTELLIGENCE CENTER · REAL-TIME',
    fontSize: 12,
    color: '#3f7fae',
    fontWeight: 500,
    align: 'left',
    letterSpacing: 5,
    lineHeight: 1.2,
  });

  add('clock', '时钟', rect(1462, 36, 396, 98), {
    showDate: true,
    fontSize: 40,
    color: '#eaf6ff',
    dateColor: '#4f83a8',
    align: 'right',
  });

  add('text', '页脚', rect(64, 1040, 1792, 22), {
    content: '数据更新 · 实时推送    采样周期 · 5s    数据源 · 设备物联平台 / 告警中心',
    fontSize: 12,
    color: '#365d78',
    fontWeight: 400,
    align: 'left',
    letterSpacing: 2,
    lineHeight: 1.2,
  });

  return {
    version: 1,
    name: '城市运行态势监控平台',
    canvas: {
      width: 1920,
      height: 1080,
      background:
        'radial-gradient(1200px 760px at 50% -10%, #0e2a52 0%, #081426 48%, #05080f 100%)',
      grid: 8,
    },
    rootIds: nodes.map((n) => n.id),
    nodes: Object.fromEntries(nodes.map((n) => [n.id, n])),
  };
}
