import { useEffect } from 'react';
import { Toolbar } from './editor/Toolbar';
import { Palette } from './editor/Palette';
import { LayersPanel } from './editor/LayersPanel';
import { Canvas } from './editor/Canvas';
import { Inspector } from './editor/Inspector';
import { Player } from './runtime/Player';
import { useEditor } from './core/store';
import { saveDoc } from './core/storage';

export default function App() {
  const mode = useEditor((s) => s.mode);

  useEffect(() => {
    let timer: number | undefined;
    let previous = useEditor.getState().doc;
    const unsubscribe = useEditor.subscribe((state) => {
      if (state.doc === previous) return;
      previous = state.doc;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => saveDoc(previous), 500);
    });
    const flush = () => saveDoc(useEditor.getState().doc);
    window.addEventListener('beforeunload', flush);
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
      window.removeEventListener('beforeunload', flush);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      const state = useEditor.getState();

      if (event.key === 'Escape') {
        if (state.mode === 'preview') state.setMode('design');
        else state.select([]);
        return;
      }
      if (typing) return;

      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (mod && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) state.redo();
        else state.undo();
        return;
      }
      if (mod && key === 'y') {
        event.preventDefault();
        state.redo();
        return;
      }
      if (mod && key === 'c') {
        state.copySelected();
        return;
      }
      if (mod && key === 'v') {
        state.paste();
        return;
      }
      if (mod && key === 'd') {
        event.preventDefault();
        state.duplicateSelected();
        return;
      }
      if (mod && key === 's') {
        event.preventDefault();
        saveDoc(state.doc);
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (state.selected.length) {
          event.preventDefault();
          state.removeSelected();
        }
        return;
      }
      if (event.key === '[') {
        state.reorder('down');
        return;
      }
      if (event.key === ']') {
        state.reorder('up');
        return;
      }
      if (event.key.startsWith('Arrow') && state.selected.length) {
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
        const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
        state.mutate(
          (doc) => {
            for (const id of state.selected) {
              const node = doc.nodes[id];
              if (!node || node.locked) continue;
              node.rect.x += dx;
              node.rect.y += dy;
            }
          },
          { coalesce: 'nudge' },
        );
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="app">
      <Toolbar />
      <div className="workspace">
        <aside className="sidebar sidebar-left">
          <Palette />
          <LayersPanel />
        </aside>
        <Canvas />
        <aside className="sidebar sidebar-right">
          <Inspector />
        </aside>
      </div>
      {mode === 'preview' ? <Player /> : null}
    </div>
  );
}
