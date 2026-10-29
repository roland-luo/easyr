import type { ComponentDef } from './types';

const registry = new Map<string, ComponentDef>();

export function registerComponent(def: ComponentDef): void {
  if (registry.has(def.type)) {
    console.warn(`[easyv] component type duplicated: ${def.type}`);
  }
  registry.set(def.type, def);
}

export function getComponent(type: string): ComponentDef | undefined {
  return registry.get(type);
}

export function listComponents(): ComponentDef[] {
  return Array.from(registry.values());
}

const CATEGORY_ORDER = ['basic', 'chart', 'media', 'decoration'];
const CATEGORY_LABELS: Record<string, string> = {
  basic: '基础组件',
  chart: '图表组件',
  media: '媒体组件',
  decoration: '装饰组件',
};

export function componentGroups() {
  const all = listComponents();
  const categories = [...new Set([...CATEGORY_ORDER, ...all.map((c) => c.category)])];
  return categories
    .map((key) => ({
      key,
      label: CATEGORY_LABELS[key] ?? key,
      items: all.filter((c) => c.category === key),
    }))
    .filter((g) => g.items.length > 0);
}
