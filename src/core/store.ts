import { create } from 'zustand';
import type { CanvasConfig, EditorMode, ProjectDoc, Rect, SceneNode } from './types';
import { uid } from './id';
import { getComponent } from './registry';
import { createSeedDoc } from './seed';
import { loadSaved } from './storage';
import { clamp } from './geometry';

export interface ViewState {
  x: number;
  y: number;
  scale: number;
}

interface MutateOptions {
  record?: boolean;
  coalesce?: string;
}

export interface EditorStore {
  doc: ProjectDoc;
  past: ProjectDoc[];
  future: ProjectDoc[];
  selected: string[];
  mode: EditorMode;
  view: ViewState;
  viewport: { w: number; h: number };
  showGrid: boolean;
  snap: boolean;
  clipboard: SceneNode[];

  setProjectName(name: string): void;
  setCanvas(patch: Partial<CanvasConfig>): void;
  setMode(mode: EditorMode): void;
  setShowGrid(value: boolean): void;
  setSnap(value: boolean): void;

  mutate(fn: (doc: ProjectDoc) => void, opts?: MutateOptions): void;
  commit(prev: ProjectDoc): void;
  undo(): void;
  redo(): void;

  select(ids: string[], additive?: boolean): void;
  addComponent(type: string, at?: { x: number; y: number }): void;
  removeSelected(): void;
  duplicateSelected(): void;
  copySelected(): void;
  paste(): void;
  updateNode(id: string, patch: Partial<SceneNode>): void;
  updateProps(id: string, patch: Record<string, any>, coalesce?: string): void;
  updateRect(id: string, patch: Partial<Rect>, coalesce?: string): void;
  reorder(dir: 'up' | 'down'): void;
  toggleHidden(id: string): void;
  toggleLocked(id: string): void;
  renameNode(id: string, name: string): void;

  setView(view: Partial<ViewState>): void;
  setViewportSize(w: number, h: number): void;
  zoomBy(factor: number): void;
  zoomTo(scale: number): void;
  fitView(): void;

  loadDoc(doc: ProjectDoc): void;
  resetDemo(): void;
}

const HISTORY_LIMIT = 60;

/** 属性面板连续输入时合并历史，避免每个字符一步撤销 */
let lastCoalesce = { key: '', time: 0 };

const initialDoc = (): ProjectDoc => {
  const saved = loadSaved();
  if (saved) return saved;
  return createSeedDoc();
};

export const useEditor = create<EditorStore>()((set, get) => ({
  doc: initialDoc(),
  past: [],
  future: [],
  selected: [],
  mode: 'design',
  view: { x: 0, y: 0, scale: 1 },
  viewport: { w: 0, h: 0 },
  showGrid: false,
  snap: true,
  clipboard: [],

  setProjectName: (name) => get().mutate((doc) => { doc.name = name; }, { coalesce: 'project:name' }),

  setCanvas: (patch) => {
    get().mutate((doc) => {
      if (patch.width !== undefined) doc.canvas.width = clamp(Math.round(patch.width), 320, 7680);
      if (patch.height !== undefined) doc.canvas.height = clamp(Math.round(patch.height), 240, 7680);
      if (patch.background !== undefined) doc.canvas.background = patch.background;
      if (patch.grid !== undefined) doc.canvas.grid = clamp(Math.round(patch.grid), 2, 80);
    }, { coalesce: 'canvas' });
  },

  setMode: (mode) => set({ mode }),
  setShowGrid: (showGrid) => set({ showGrid }),
  setSnap: (snap) => set({ snap }),

  mutate: (fn, opts) => {
    const { doc, past } = get();
    const next = structuredClone(doc);
    fn(next);
    const record = opts?.record !== false;
    let nextPast = past;
    if (record) {
      const now = Date.now();
      const same =
        !!opts?.coalesce && lastCoalesce.key === opts.coalesce && now - lastCoalesce.time < 700;
      if (!same) nextPast = [...past, doc].slice(-HISTORY_LIMIT);
      lastCoalesce = { key: opts?.coalesce ?? '', time: now };
    }
    set({ doc: next, past: nextPast, future: record ? [] : get().future });
  },

  commit: (prev) => {
    lastCoalesce = { key: '', time: 0 };
    set({ past: [...get().past, prev].slice(-HISTORY_LIMIT), future: [] });
  },

  undo: () => {
    const { past, future, doc, selected } = get();
    if (!past.length) return;
    const prev = past[past.length - 1];
    lastCoalesce = { key: '', time: 0 };
    set({
      doc: prev,
      past: past.slice(0, -1),
      future: [doc, ...future].slice(0, HISTORY_LIMIT),
      selected: selected.filter((id) => !!prev.nodes[id]),
    });
  },

  redo: () => {
    const { past, future, doc, selected } = get();
    if (!future.length) return;
    const next = future[0];
    lastCoalesce = { key: '', time: 0 };
    set({
      doc: next,
      past: [...past, doc].slice(-HISTORY_LIMIT),
      future: future.slice(1),
      selected: selected.filter((id) => !!next.nodes[id]),
    });
  },

  select: (ids, additive = false) => {
    const { doc, selected } = get();
    const valid = ids.filter((id) => !!doc.nodes[id]);
    if (!additive) {
      set({ selected: valid });
      return;
    }
    const next = [...selected];
    for (const id of valid) {
      const index = next.indexOf(id);
      if (index >= 0) next.splice(index, 1);
      else next.push(id);
    }
    set({ selected: next });
  },

  addComponent: (type, at) => {
    const def = getComponent(type);
    if (!def) return;
    const { doc, view, viewport, snap } = get();
    const w = def.defaultSize.w;
    const h = def.defaultSize.h;

    let cx: number;
    let cy: number;
    if (at) {
      cx = at.x;
      cy = at.y;
    } else if (viewport.w > 0) {
      cx = (viewport.w / 2 - view.x) / view.scale;
      cy = (viewport.h / 2 - view.y) / view.scale;
    } else {
      cx = doc.canvas.width / 2;
      cy = doc.canvas.height / 2;
    }

    let x = cx - w / 2;
    let y = cy - h / 2;
    if (snap) {
      x = Math.round(x / doc.canvas.grid) * doc.canvas.grid;
      y = Math.round(y / doc.canvas.grid) * doc.canvas.grid;
    }
    x = clamp(x, -w * 0.5, doc.canvas.width - w * 0.5);
    y = clamp(y, -h * 0.5, doc.canvas.height - h * 0.5);

    const count = Object.values(doc.nodes).filter((n) => n.type === type).length + 1;
    const node: SceneNode = {
      id: uid(),
      type,
      name: `${def.name} ${count}`,
      parentId: null,
      children: [],
      rect: { x, y, w, h, rotation: 0 },
      props: structuredClone(def.defaultProps),
    };

    get().mutate((draft) => {
      draft.nodes[node.id] = node;
      draft.rootIds.push(node.id);
    });
    set({ selected: [node.id] });
  },

  removeSelected: () => {
    const ids = new Set(get().selected);
    if (!ids.size) return;
    get().mutate((doc) => {
      doc.rootIds = doc.rootIds.filter((id) => !ids.has(id));
      for (const id of ids) delete doc.nodes[id];
    });
    set({ selected: [] });
  },

  duplicateSelected: () => {
    const { selected, doc } = get();
    const ordered = doc.rootIds.filter((id) => selected.includes(id));
    if (!ordered.length) return;
    const created: string[] = [];
    get().mutate((draft) => {
      for (const id of ordered) {
        const src = draft.nodes[id];
        if (!src) continue;
        const copy: SceneNode = structuredClone(src);
        copy.id = uid();
        copy.name = `${src.name} 副本`;
        copy.rect.x += 24;
        copy.rect.y += 24;
        draft.nodes[copy.id] = copy;
        draft.rootIds.push(copy.id);
        created.push(copy.id);
      }
    });
    set({ selected: created });
  },

  copySelected: () => {
    const { doc, selected } = get();
    const nodes = selected.map((id) => doc.nodes[id]).filter(Boolean);
    if (!nodes.length) return;
    set({ clipboard: structuredClone(nodes) });
  },

  paste: () => {
    const { clipboard } = get();
    if (!clipboard.length) return;
    const created: string[] = [];
    get().mutate((draft) => {
      for (const src of clipboard) {
        const copy: SceneNode = structuredClone(src);
        copy.id = uid();
        copy.rect.x += 24;
        copy.rect.y += 24;
        draft.nodes[copy.id] = copy;
        draft.rootIds.push(copy.id);
        created.push(copy.id);
      }
    });
    set({ selected: created });
  },

  updateNode: (id, patch) => {
    get().mutate((doc) => {
      const node = doc.nodes[id];
      if (!node) return;
      Object.assign(node, patch);
    }, { coalesce: `node:${id}` });
  },

  updateProps: (id, patch, coalesce) => {
    get().mutate((doc) => {
      const node = doc.nodes[id];
      if (!node) return;
      node.props = { ...node.props, ...patch };
    }, { coalesce: coalesce ?? `props:${id}` });
  },

  updateRect: (id, patch, coalesce) => {
    get().mutate((doc) => {
      const node = doc.nodes[id];
      if (!node) return;
      const next = { ...node.rect, ...patch };
      next.w = Math.max(8, next.w);
      next.h = Math.max(8, next.h);
      node.rect = next;
    }, { coalesce: coalesce ?? `rect:${id}` });
  },

  reorder: (dir) => {
    const { selected } = get();
    if (selected.length !== 1) return;
    const id = selected[0];
    get().mutate((doc) => {
      const index = doc.rootIds.indexOf(id);
      if (index < 0) return;
      const target = dir === 'up' ? Math.min(doc.rootIds.length - 1, index + 1) : Math.max(0, index - 1);
      if (target === index) return;
      doc.rootIds.splice(index, 1);
      doc.rootIds.splice(target, 0, id);
    });
  },

  toggleHidden: (id) => {
    get().mutate((doc) => {
      const node = doc.nodes[id];
      if (node) node.hidden = !node.hidden;
    });
  },

  toggleLocked: (id) => {
    get().mutate((doc) => {
      const node = doc.nodes[id];
      if (node) node.locked = !node.locked;
    });
  },

  renameNode: (id, name) => {
    get().mutate((doc) => {
      const node = doc.nodes[id];
      if (node) node.name = name;
    }, { coalesce: `rename:${id}` });
  },

  setView: (view) => set({ view: { ...get().view, ...view } }),

  setViewportSize: (w, h) => {
    const first = get().viewport.w === 0 && get().viewport.h === 0;
    set({ viewport: { w, h } });
    if (first && w > 0 && h > 0) get().fitView();
  },

  zoomBy: (factor) => {
    const { view, viewport } = get();
    const ax = viewport.w / 2;
    const ay = viewport.h / 2;
    const scale = clamp(view.scale * factor, 0.05, 4);
    const k = scale / view.scale;
    set({ view: { scale, x: ax - (ax - view.x) * k, y: ay - (ay - view.y) * k } });
  },

  zoomTo: (scale) => {
    const { view, viewport } = get();
    const next = clamp(scale, 0.05, 4);
    const ax = viewport.w / 2;
    const ay = viewport.h / 2;
    const k = next / view.scale;
    set({ view: { scale: next, x: ax - (ax - view.x) * k, y: ay - (ay - view.y) * k } });
  },

  fitView: () => {
    const { doc, viewport } = get();
    if (!viewport.w || !viewport.h) return;
    const pad = 72;
    const scale = clamp(
      Math.min(
        (viewport.w - pad * 2) / doc.canvas.width,
        (viewport.h - pad * 2) / doc.canvas.height,
      ),
      0.05,
      1,
    );
    set({
      view: {
        scale,
        x: (viewport.w - doc.canvas.width * scale) / 2,
        y: (viewport.h - doc.canvas.height * scale) / 2,
      },
    });
  },

  loadDoc: (doc) => {
    const nodes: Record<string, SceneNode> = {};
    for (const [id, node] of Object.entries(doc.nodes)) {
      const source = node.rect ?? { x: 0, y: 0, w: 240, h: 160, rotation: 0 };
      nodes[id] = {
        ...node,
        id,
        parentId: node.parentId ?? null,
        children: Array.isArray(node.children) ? node.children : [],
        rect: {
          x: Number(source.x) || 0,
          y: Number(source.y) || 0,
          w: Number(source.w) || 240,
          h: Number(source.h) || 160,
          rotation: Number(source.rotation) || 0,
        },
      };
    }
    const next: ProjectDoc = {
      ...doc,
      version: 1,
      nodes,
      rootIds: doc.rootIds.filter((id) => !!nodes[id]),
    };
    lastCoalesce = { key: '', time: 0 };
    set({ doc: next, selected: [], past: [], future: [], mode: 'design' });
    get().fitView();
  },

  resetDemo: () => {
    lastCoalesce = { key: '', time: 0 };
    set({
      doc: createSeedDoc(),
      selected: [],
      past: [],
      future: [],
      mode: 'design',
    });
    get().fitView();
  },
}));
