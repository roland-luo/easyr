import { useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { ProjectDoc, Rect, SceneNode } from '../core/types';
import { useEditor } from '../core/store';
import { getComponent } from '../core/registry';
import { unionRect } from '../core/geometry';

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;
type HandleDir = (typeof HANDLES)[number];

type MoveDrag = {
  kind: 'move';
  startX: number;
  startY: number;
  base: ProjectDoc;
  rects: Record<string, Rect>;
  moved: boolean;
};

type ResizeDrag = {
  kind: 'resize';
  startX: number;
  startY: number;
  base: ProjectDoc;
  rect: Rect;
  id: string;
  handle: HandleDir;
  moved: boolean;
};

type PanDrag = {
  kind: 'pan';
  startX: number;
  startY: number;
  baseView: { x: number; y: number };
  moved: boolean;
};

type DragState = MoveDrag | ResizeDrag | PanDrag;

function NodeView({
  node,
  onPointerDown,
}: {
  node: SceneNode;
  onPointerDown: (event: ReactPointerEvent, node: SceneNode) => void;
}) {
  const def = getComponent(node.type);
  return (
    <div
      className="node"
      data-node-id={node.id}
      style={{
        left: node.rect.x,
        top: node.rect.y,
        width: node.rect.w,
        height: node.rect.h,
        opacity: node.opacity ?? 1,
        transform: node.rect.rotation ? `rotate(${node.rect.rotation}deg)` : undefined,
        cursor: node.locked ? 'not-allowed' : 'move',
      }}
      onPointerDown={(event) => onPointerDown(event, node)}
    >
      <div className="node-content">
        {def ? def.render({ node, mode: 'design' }) : <div className="unknown-node">未知组件 {node.type}</div>}
      </div>
      {node.locked ? <div className="node-locked" title="已锁定" /> : null}
    </div>
  );
}

function SelectionOverlay({
  doc,
  selected,
  view,
  onResizeStart,
}: {
  doc: ProjectDoc;
  selected: string[];
  view: { x: number; y: number; scale: number };
  onResizeStart: (event: ReactPointerEvent, handle: HandleDir) => void;
}) {
  const nodes = selected.map((id) => doc.nodes[id]).filter((node) => node && !node.hidden);
  if (!nodes.length) return null;
  const box = unionRect(nodes.map((node) => node.rect));
  if (!box) return null;
  const single = nodes.length === 1 ? nodes[0] : null;
  const left = view.x + box.x * view.scale;
  const top = view.y + box.y * view.scale;

  return (
    <div
      className="selection"
      style={{
        left,
        top,
        width: Math.max(1, box.w * view.scale),
        height: Math.max(1, box.h * view.scale),
      }}
    >
      <span className="selection-size">
        {Math.round(box.w)} × {Math.round(box.h)}
      </span>
      {single && !single.locked
        ? HANDLES.map((handle) => (
            <div
              key={handle}
              className={`handle handle-${handle}`}
              onPointerDown={(event) => onResizeStart(event, handle)}
            />
          ))
        : null}
    </div>
  );
}

export function Canvas() {
  const doc = useEditor((s) => s.doc);
  const selected = useEditor((s) => s.selected);
  const view = useEditor((s) => s.view);
  const showGrid = useEditor((s) => s.showGrid);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      useEditor.getState().setViewportSize(rect.width, rect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const bounds = el.getBoundingClientRect();
      const mx = event.clientX - bounds.left;
      const my = event.clientY - bounds.top;
      const state = useEditor.getState();
      const scale = Math.min(4, Math.max(0.05, state.view.scale * Math.exp(-event.deltaY * 0.0015)));
      const k = scale / state.view.scale;
      state.setView({
        scale,
        x: mx - (mx - state.view.x) * k,
        y: my - (my - state.view.y) * k,
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const state = useEditor.getState();

      if (drag.kind === 'pan') {
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) drag.moved = true;
        state.setView({ x: drag.baseView.x + dx, y: drag.baseView.y + dy });
        return;
      }

      const scale = state.view.scale || 1;
      const dx = (event.clientX - drag.startX) / scale;
      const dy = (event.clientY - drag.startY) / scale;
      if (Math.abs(event.clientX - drag.startX) > 1 || Math.abs(event.clientY - drag.startY) > 1) {
        drag.moved = true;
      }
      const snap = state.snap && !event.altKey;
      const grid = state.doc.canvas.grid;
      const snapValue = (value: number) => (snap ? Math.round(value / grid) * grid : value);

      if (drag.kind === 'move') {
        state.mutate(
          (draft) => {
            for (const [id, base] of Object.entries(drag.rects)) {
              const node = draft.nodes[id];
              if (!node) continue;
              node.rect.x = snapValue(base.x + dx);
              node.rect.y = snapValue(base.y + dy);
            }
          },
          { record: false },
        );
        return;
      }

      const base = drag.rect;
      let x = base.x;
      let y = base.y;
      let w = base.w;
      let h = base.h;
      if (drag.handle.includes('e')) w = base.w + dx;
      if (drag.handle.includes('s')) h = base.h + dy;
      if (drag.handle.includes('w')) {
        x = base.x + dx;
        w = base.w - dx;
      }
      if (drag.handle.includes('n')) {
        y = base.y + dy;
        h = base.h - dy;
      }
      if (snap) {
        if (drag.handle.includes('w')) x = Math.round(x / grid) * grid;
        if (drag.handle.includes('n')) y = Math.round(y / grid) * grid;
        if (drag.handle.includes('e') || drag.handle.includes('w')) w = Math.round(w / grid) * grid;
        if (drag.handle.includes('n') || drag.handle.includes('s')) h = Math.round(h / grid) * grid;
      }
      const min = 8;
      if (w < min) {
        if (drag.handle.includes('w')) x = base.x + base.w - min;
        w = min;
      }
      if (h < min) {
        if (drag.handle.includes('n')) y = base.y + base.h - min;
        h = min;
      }

      state.mutate(
        (draft) => {
          const node = draft.nodes[drag.id];
          if (!node) return;
          node.rect = { ...node.rect, x, y, w, h };
        },
        { record: false },
      );
    };

    const onUp = () => {
      const drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;
      document.body.classList.remove('is-dragging');
      if (drag.moved && (drag.kind === 'move' || drag.kind === 'resize')) {
        useEditor.getState().commit(drag.base);
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);

  const handleNodePointerDown = (event: ReactPointerEvent, node: SceneNode) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    if (node.locked || node.hidden) return;
    const state = useEditor.getState();
    if (event.shiftKey) {
      state.select([node.id], true);
      return;
    }
    if (!state.selected.includes(node.id)) state.select([node.id]);
    const current = useEditor.getState();
    const rects: Record<string, Rect> = {};
    for (const id of current.selected) {
      const item = current.doc.nodes[id];
      if (item) rects[id] = { ...item.rect };
    }
    dragRef.current = {
      kind: 'move',
      startX: event.clientX,
      startY: event.clientY,
      base: structuredClone(current.doc),
      rects,
      moved: false,
    };
    document.body.classList.add('is-dragging');
  };

  const handleResizeStart = (event: ReactPointerEvent, handle: HandleDir) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    const state = useEditor.getState();
    const id = state.selected[0];
    if (!id) return;
    const node = state.doc.nodes[id];
    if (!node || node.locked) return;
    dragRef.current = {
      kind: 'resize',
      startX: event.clientX,
      startY: event.clientY,
      base: structuredClone(state.doc),
      rect: { ...node.rect },
      id,
      handle,
      moved: false,
    };
    document.body.classList.add('is-dragging');
  };

  const handleBackgroundPointerDown = (event: ReactPointerEvent) => {
    if (event.button !== 0) return;
    const state = useEditor.getState();
    if (!event.shiftKey) state.select([]);
    dragRef.current = {
      kind: 'pan',
      startX: event.clientX,
      startY: event.clientY,
      baseView: { x: state.view.x, y: state.view.y },
      moved: false,
    };
  };

  return (
    <div
      className="canvas-viewport"
      ref={viewportRef}
      onPointerDown={handleBackgroundPointerDown}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div
        className="artboard"
        style={{
          width: doc.canvas.width,
          height: doc.canvas.height,
          left: view.x,
          top: view.y,
          transform: `scale(${view.scale})`,
          background: doc.canvas.background,
        }}
      >
        {showGrid ? (
          <div
            className="grid-overlay"
            style={{
              backgroundSize: `${doc.canvas.grid}px ${doc.canvas.grid}px`,
            }}
          />
        ) : null}
        {doc.rootIds.map((id) => {
          const node = doc.nodes[id];
          if (!node || node.hidden) return null;
          return <NodeView key={id} node={node} onPointerDown={handleNodePointerDown} />;
        })}
      </div>

      <SelectionOverlay doc={doc} selected={selected} view={view} onResizeStart={handleResizeStart} />

      <div className="canvas-hud">
        <span>
          {doc.canvas.width} × {doc.canvas.height}
        </span>
        <span className="hud-divider" />
        <span>{Math.round(view.scale * 100)}%</span>
        {selected.length ? (
          <>
            <span className="hud-divider" />
            <span>已选 {selected.length}</span>
          </>
        ) : null}
      </div>
      <div className="canvas-tip">滚轮缩放 · 拖拽空白平移 · Alt 临时关闭吸附</div>
    </div>
  );
}
