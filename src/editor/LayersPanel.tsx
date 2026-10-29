import { ChevronDown, ChevronUp, Eye, EyeOff, Lock, Square, Trash2, Unlock } from 'lucide-react';
import { useEditor } from '../core/store';
import { getComponent } from '../core/registry';

export function LayersPanel() {
  const doc = useEditor((s) => s.doc);
  const selected = useEditor((s) => s.selected);
  const select = useEditor((s) => s.select);
  const toggleHidden = useEditor((s) => s.toggleHidden);
  const toggleLocked = useEditor((s) => s.toggleLocked);
  const reorder = useEditor((s) => s.reorder);
  const removeSelected = useEditor((s) => s.removeSelected);

  const ordered = [...doc.rootIds].reverse();
  const single = selected.length === 1;

  return (
    <div className="layers">
      <div className="panel-head">
        <span>图层</span>
        <span className="panel-hint">{ordered.length}</span>
      </div>
      <div className="layer-list">
        {ordered.map((id) => {
          const node = doc.nodes[id];
          if (!node) return null;
          const def = getComponent(node.type);
          const Icon = def?.icon ?? Square;
          const active = selected.includes(id);
          return (
            <div
              key={id}
              className={`layer-row ${active ? 'is-active' : ''} ${node.hidden ? 'is-hidden' : ''}`}
              onClick={(event) => select([id], event.shiftKey)}
              title={`${node.name} · ${def?.name ?? node.type}`}
            >
              <button
                className="layer-toggle"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleHidden(id);
                }}
                title={node.hidden ? '显示' : '隐藏'}
              >
                {node.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
              <button
                className="layer-toggle"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleLocked(id);
                }}
                title={node.locked ? '解锁' : '锁定'}
              >
                {node.locked ? <Lock size={12} /> : <Unlock size={12} />}
              </button>
              <Icon size={14} className="layer-icon" />
              <span className="layer-name">{node.name}</span>
            </div>
          );
        })}
      </div>
      <div className="layers-footer">
        <button className="icon-btn tiny" disabled={!single} onClick={() => reorder('up')} title="上移一层 (])">
          <ChevronUp size={14} />
        </button>
        <button className="icon-btn tiny" disabled={!single} onClick={() => reorder('down')} title="下移一层 ([)">
          <ChevronDown size={14} />
        </button>
        <div className="layers-footer-spacer" />
        <button
          className="icon-btn tiny danger"
          disabled={!selected.length}
          onClick={removeSelected}
          title="删除选中 (Delete)"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
