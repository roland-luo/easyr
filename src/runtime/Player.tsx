import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useEditor } from '../core/store';
import { getComponent } from '../core/registry';

export function Player() {
  const doc = useEditor((s) => s.doc);
  const setMode = useEditor((s) => s.setMode);
  const [fit, setFit] = useState<'contain' | 'cover'>('contain');
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const update = () => {
      const ratioW = window.innerWidth / doc.canvas.width;
      const ratioH = window.innerHeight / doc.canvas.height;
      setScale(fit === 'cover' ? Math.max(ratioW, ratioH) : Math.min(ratioW, ratioH));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [doc.canvas.width, doc.canvas.height, fit]);

  return (
    <div className="player">
      <div
        className="player-stage"
        style={{
          width: doc.canvas.width,
          height: doc.canvas.height,
          background: doc.canvas.background,
          transform: `translate(-50%, -50%) scale(${scale || 0.0001})`,
        }}
      >
        {doc.rootIds.map((id) => {
          const node = doc.nodes[id];
          if (!node || node.hidden) return null;
          const def = getComponent(node.type);
          return (
            <div
              key={id}
              className="node"
              style={{
                left: node.rect.x,
                top: node.rect.y,
                width: node.rect.w,
                height: node.rect.h,
                opacity: node.opacity ?? 1,
                transform: node.rect.rotation ? `rotate(${node.rect.rotation}deg)` : undefined,
              }}
            >
              <div className="node-content">
                {def ? def.render({ node, mode: 'preview' }) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="player-bar">
        <div className="player-meta">
          <span className="player-dot" />
          <span>{doc.name}</span>
          <span className="player-dim">
            {doc.canvas.width} × {doc.canvas.height}
          </span>
        </div>
        <button
          className="ghost-btn small"
          onClick={() => setFit((current) => (current === 'contain' ? 'cover' : 'contain'))}
          title="切换缩放模式"
        >
          {fit === 'contain' ? '铺满屏幕' : '适应屏幕'}
        </button>
        <button className="ghost-btn small" onClick={() => setMode('design')}>
          <X size={14} /> 退出预览 <kbd>Esc</kbd>
        </button>
      </div>
    </div>
  );
}
