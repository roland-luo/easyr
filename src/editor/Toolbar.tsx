import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import {
  Download,
  LayoutGrid,
  Maximize,
  Play,
  Redo2,
  Undo2,
  Upload,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useEditor } from '../core/store';
import { downloadDoc, isProjectDoc } from '../core/storage';

export function Toolbar() {
  const doc = useEditor((s) => s.doc);
  const view = useEditor((s) => s.view);
  const showGrid = useEditor((s) => s.showGrid);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const setProjectName = useEditor((s) => s.setProjectName);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const zoomBy = useEditor((s) => s.zoomBy);
  const zoomTo = useEditor((s) => s.zoomTo);
  const fitView = useEditor((s) => s.fitView);
  const setShowGrid = useEditor((s) => s.setShowGrid);
  const setMode = useEditor((s) => s.setMode);
  const loadDoc = useEditor((s) => s.loadDoc);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!isProjectDoc(parsed)) throw new Error('文件不是有效的 EasyV Lite 项目');
      loadDoc(parsed);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '项目导入失败');
    }
  };

  return (
    <header className="toolbar">
      <div className="brand">
        <div className="brand-mark">E</div>
        <div className="brand-text">
          <span className="brand-name">EasyV Lite</span>
          <span className="brand-sub">可视化大屏框架</span>
        </div>
      </div>

      <div className="toolbar-divider" />

      <input
        className="project-name"
        value={doc.name}
        onChange={(event) => setProjectName(event.target.value)}
        spellCheck={false}
        aria-label="项目名称"
      />

      <div className="toolbar-spacer" />

      <div className="toolbar-group">
        <button className="icon-btn" onClick={undo} disabled={!canUndo} title="撤销 (Ctrl+Z)">
          <Undo2 size={16} />
        </button>
        <button className="icon-btn" onClick={redo} disabled={!canRedo} title="重做 (Ctrl+Shift+Z)">
          <Redo2 size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group zoom-group">
        <button className="icon-btn" onClick={() => zoomBy(0.85)} title="缩小">
          <ZoomOut size={16} />
        </button>
        <button className="zoom-value" onClick={() => zoomTo(1)} title="重置为 100%">
          {Math.round(view.scale * 100)}%
        </button>
        <button className="icon-btn" onClick={() => zoomBy(1.18)} title="放大">
          <ZoomIn size={16} />
        </button>
        <button className="icon-btn" onClick={fitView} title="适应画布">
          <Maximize size={15} />
        </button>
      </div>

      <div className="toolbar-divider" />

      <button
        className={`ghost-btn ${showGrid ? 'is-active' : ''}`}
        onClick={() => setShowGrid(!showGrid)}
        title="显示 / 隐藏网格"
      >
        <LayoutGrid size={15} />
        网格
      </button>

      <div className="toolbar-spacer" />

      <button className="ghost-btn" onClick={() => fileRef.current?.click()} title="导入 JSON 项目">
        <Upload size={15} />
        导入
      </button>
      <button className="ghost-btn" onClick={() => downloadDoc(doc)} title="导出 JSON 项目">
        <Download size={15} />
        导出
      </button>
      <button className="preview-btn" onClick={() => setMode('preview')} title="进入预览 (Esc 退出)">
        <Play size={14} fill="currentColor" />
        预览
      </button>

      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={handleImport} />
    </header>
  );
}
