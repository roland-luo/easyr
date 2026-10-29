import type { ComponentType, ReactNode } from 'react';

export type NodeId = string;
export type EditorMode = 'design' | 'preview';

/** 节点矩形，坐标系原点在画布左上角，单位为设计稿像素 */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
}

export interface SceneNode {
  id: NodeId;
  type: string;
  name: string;
  parentId: NodeId | null;
  children: NodeId[];
  rect: Rect;
  props: Record<string, any>;
  hidden?: boolean;
  locked?: boolean;
  opacity?: number;
}

export interface CanvasConfig {
  width: number;
  height: number;
  background: string;
  grid: number;
}

/** 项目文档：可序列化、可版本迁移，是编辑器 / 播放器 / 后端共用的唯一数据源 */
export interface ProjectDoc {
  version: 1;
  name: string;
  canvas: CanvasConfig;
  rootIds: NodeId[];
  nodes: Record<NodeId, SceneNode>;
}

export type PropField =
  | { key: string; label: string; type: 'text' | 'textarea'; placeholder?: string; rows?: number }
  | {
      key: string;
      label: string;
      type: 'number';
      min?: number;
      max?: number;
      step?: number;
      suffix?: string;
    }
  | { key: string; label: string; type: 'color' }
  | { key: string; label: string; type: 'select'; options: { label: string; value: string }[] }
  | { key: string; label: string; type: 'boolean' }
  | { key: string; label: string; type: 'range'; min: number; max: number; step?: number };

export interface ComponentDef {
  type: string;
  name: string;
  category: string;
  icon: ComponentType<any>;
  defaultSize: { w: number; h: number };
  defaultProps: Record<string, any>;
  /** 属性面板由 schema 自动生成，不需要为每个组件手写表单 */
  fields: PropField[];
  render: (ctx: { node: SceneNode; mode: EditorMode }) => ReactNode;
}
