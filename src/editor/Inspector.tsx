import type { ReactNode } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff, Lock, RotateCcw, Trash2, Unlock } from 'lucide-react';
import { useEditor } from '../core/store';
import { getComponent } from '../core/registry';
import { unionRect } from '../core/geometry';
import type { PropField, Rect } from '../core/types';

function toHex(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw;
  if (/^#[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
  }
  return '#000000';
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div className="num-wrap">
      <input
        className="text-input num-input"
        type="number"
        value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          const next = event.target.valueAsNumber;
          if (Number.isFinite(next)) onChange(next);
        }}
      />
      {suffix ? <span className="num-suffix">{suffix}</span> : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="inspector-section">
      <h3>{title}</h3>
      <div className="section-body">{children}</div>
    </section>
  );
}

function PropFieldView({
  field,
  value,
  onChange,
}: {
  field: PropField;
  value: any;
  onChange: (value: any) => void;
}) {
  const label = <span className="field-label">{field.label}</span>;
  switch (field.type) {
    case 'text':
      return (
        <label className="field">
          {label}
          <input
            className="text-input"
            value={String(value ?? '')}
            placeholder={field.placeholder}
            onChange={(event) => onChange(event.target.value)}
          />
        </label>
      );
    case 'textarea':
      return (
        <label className="field">
          {label}
          <textarea
            className={`text-input textarea ${field.key === 'data' ? 'mono' : ''}`}
            rows={field.rows ?? 4}
            value={String(value ?? '')}
            placeholder={field.placeholder}
            onChange={(event) => onChange(event.target.value)}
          />
        </label>
      );
    case 'number':
      return (
        <label className="field">
          {label}
          <NumberInput
            value={Number(value)}
            onChange={onChange}
            min={field.min}
            max={field.max}
            step={field.step}
            suffix={field.suffix}
          />
        </label>
      );
    case 'color':
      return (
        <label className="field">
          {label}
          <div className="color-row">
            <input
              type="color"
              className="color-picker"
              value={toHex(value)}
              onChange={(event) => onChange(event.target.value)}
            />
            <input
              className="text-input mono"
              value={String(value ?? '')}
              onChange={(event) => onChange(event.target.value)}
            />
          </div>
        </label>
      );
    case 'select':
      return (
        <label className="field">
          {label}
          <select className="text-input" value={String(value ?? '')} onChange={(event) => onChange(event.target.value)}>
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      );
    case 'boolean':
      return (
        <label className="toggle-row">
          <span>{field.label}</span>
          <input
            className="switch-input"
            type="checkbox"
            checked={!!value}
            onChange={(event) => onChange(event.target.checked)}
          />
          <i className="switch" />
        </label>
      );
    case 'range':
      return (
        <label className="field">
          <div className="range-head">
            <span className="field-label">{field.label}</span>
            <span className="range-value">{Number(value)}</span>
          </div>
          <input
            className="range-input"
            type="range"
            min={field.min}
            max={field.max}
            step={field.step ?? 1}
            value={Number(value) || 0}
            onChange={(event) => onChange(Number(event.target.value))}
          />
        </label>
      );
    default:
      return null;
  }
}

function NodeInspector({ nodeId }: { nodeId: string }) {
  const doc = useEditor((s) => s.doc);
  const updateNode = useEditor((s) => s.updateNode);
  const updateRect = useEditor((s) => s.updateRect);
  const updateProps = useEditor((s) => s.updateProps);
  const renameNode = useEditor((s) => s.renameNode);
  const toggleHidden = useEditor((s) => s.toggleHidden);
  const toggleLocked = useEditor((s) => s.toggleLocked);
  const reorder = useEditor((s) => s.reorder);
  const removeSelected = useEditor((s) => s.removeSelected);

  const node = doc.nodes[nodeId];
  if (!node) return null;
  const def = getComponent(node.type);
  const Icon = def?.icon;

  return (
    <div className="inspector">
      <div className="panel-head">
        <span>属性</span>
        <span className="panel-hint">{def?.name ?? node.type}</span>
      </div>
      <div className="inspector-scroll">
        <div className="node-head">
          <div className="node-icon">{Icon ? <Icon size={17} /> : null}</div>
          <input
            className="node-name"
            value={node.name}
            onChange={(event) => renameNode(node.id, event.target.value)}
            spellCheck={false}
          />
        </div>

        <Section title="布局">
          <div className="field-grid">
            <label className="mini-field">
              <span>X</span>
              <NumberInput
                value={node.rect.x}
                onChange={(value) => updateRect(node.id, { x: value }, `rect:${node.id}:x`)}
              />
            </label>
            <label className="mini-field">
              <span>Y</span>
              <NumberInput
                value={node.rect.y}
                onChange={(value) => updateRect(node.id, { y: value }, `rect:${node.id}:y`)}
              />
            </label>
            <label className="mini-field">
              <span>W</span>
              <NumberInput
                value={node.rect.w}
                min={8}
                onChange={(value) => updateRect(node.id, { w: value }, `rect:${node.id}:w`)}
              />
            </label>
            <label className="mini-field">
              <span>H</span>
              <NumberInput
                value={node.rect.h}
                min={8}
                onChange={(value) => updateRect(node.id, { h: value }, `rect:${node.id}:h`)}
              />
            </label>
          </div>
          <label className="field">
            <div className="range-head">
              <span className="field-label">不透明度</span>
              <span className="range-value">{Math.round((node.opacity ?? 1) * 100)}%</span>
            </div>
            <input
              className="range-input"
              type="range"
              min={0}
              max={100}
              value={Math.round((node.opacity ?? 1) * 100)}
              onChange={(event) => updateNode(node.id, { opacity: Number(event.target.value) / 100 })}
            />
          </label>
        </Section>

        {def && def.fields.length ? (
          <Section title="组件属性">
            {def.fields.map((field) => (
              <PropFieldView
                key={field.key}
                field={field}
                value={node.props[field.key]}
                onChange={(value) =>
                  updateProps(node.id, { [field.key]: value }, `props:${node.id}:${field.key}`)
                }
              />
            ))}
          </Section>
        ) : null}

        <Section title="图层">
          <div className="action-grid">
            <button className="ghost-btn small" onClick={() => reorder('up')}>
              <ChevronUp size={14} /> 上移
            </button>
            <button className="ghost-btn small" onClick={() => reorder('down')}>
              <ChevronDown size={14} /> 下移
            </button>
            <button className="ghost-btn small" onClick={() => toggleHidden(node.id)}>
              {node.hidden ? <Eye size={14} /> : <EyeOff size={14} />}
              {node.hidden ? '显示' : '隐藏'}
            </button>
            <button className="ghost-btn small" onClick={() => toggleLocked(node.id)}>
              {node.locked ? <Unlock size={14} /> : <Lock size={14} />}
              {node.locked ? '解锁' : '锁定'}
            </button>
          </div>
          <button className="danger-btn" onClick={removeSelected}>
            <Trash2 size={14} /> 删除组件
          </button>
        </Section>
      </div>
    </div>
  );
}

function MultiInspector() {
  const selected = useEditor((s) => s.selected);
  const removeSelected = useEditor((s) => s.removeSelected);

  const align = (mode: 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom') => {
    const state = useEditor.getState();
    const ids = state.selected;
    state.mutate((doc) => {
      const rects: Rect[] = [];
      for (const id of ids) {
        const node = doc.nodes[id];
        if (node) rects.push(node.rect);
      }
      const box = unionRect(rects);
      if (!box) return;
      for (const id of ids) {
        const node = doc.nodes[id];
        if (!node) continue;
        const r = node.rect;
        if (mode === 'left') r.x = box.x;
        if (mode === 'hcenter') r.x = box.x + (box.w - r.w) / 2;
        if (mode === 'right') r.x = box.x + box.w - r.w;
        if (mode === 'top') r.y = box.y;
        if (mode === 'vcenter') r.y = box.y + (box.h - r.h) / 2;
        if (mode === 'bottom') r.y = box.y + box.h - r.h;
      }
    });
  };

  return (
    <div className="inspector">
      <div className="panel-head">
        <span>属性</span>
        <span className="panel-hint">多选</span>
      </div>
      <div className="inspector-scroll">
        <div className="multi-count">
          <strong>{selected.length}</strong> 个对象
          <span>按住 Shift 继续选择</span>
        </div>
        <Section title="对齐">
          <div className="align-grid">
            <button className="ghost-btn small" onClick={() => align('left')}>左对齐</button>
            <button className="ghost-btn small" onClick={() => align('hcenter')}>水平居中</button>
            <button className="ghost-btn small" onClick={() => align('right')}>右对齐</button>
            <button className="ghost-btn small" onClick={() => align('top')}>顶对齐</button>
            <button className="ghost-btn small" onClick={() => align('vcenter')}>垂直居中</button>
            <button className="ghost-btn small" onClick={() => align('bottom')}>底对齐</button>
          </div>
        </Section>
        <Section title="操作">
          <button className="danger-btn" onClick={removeSelected}>
            <Trash2 size={14} /> 删除所选
          </button>
        </Section>
      </div>
    </div>
  );
}

function CanvasSettings() {
  const doc = useEditor((s) => s.doc);
  const showGrid = useEditor((s) => s.showGrid);
  const snap = useEditor((s) => s.snap);
  const setShowGrid = useEditor((s) => s.setShowGrid);
  const setSnap = useEditor((s) => s.setSnap);
  const setCanvas = useEditor((s) => s.setCanvas);
  const setProjectName = useEditor((s) => s.setProjectName);
  const resetDemo = useEditor((s) => s.resetDemo);

  return (
    <div className="inspector">
      <div className="panel-head">
        <span>页面设置</span>
        <span className="panel-hint">未选中组件</span>
      </div>
      <div className="inspector-scroll">
        <Section title="项目">
          <label className="field">
            <span className="field-label">项目名称</span>
            <input
              className="text-input"
              value={doc.name}
              onChange={(event) => setProjectName(event.target.value)}
            />
          </label>
        </Section>

        <Section title="画布">
          <div className="field-grid">
            <label className="mini-field">
              <span>宽度</span>
              <NumberInput value={doc.canvas.width} min={320} onChange={(value) => setCanvas({ width: value })} />
            </label>
            <label className="mini-field">
              <span>高度</span>
              <NumberInput value={doc.canvas.height} min={240} onChange={(value) => setCanvas({ height: value })} />
            </label>
            <label className="mini-field">
              <span>网格</span>
              <NumberInput value={doc.canvas.grid} min={2} max={80} onChange={(value) => setCanvas({ grid: value })} />
            </label>
          </div>
          <label className="field">
            <span className="field-label">背景</span>
            <textarea
              className="text-input textarea mono"
              rows={3}
              value={doc.canvas.background}
              onChange={(event) => setCanvas({ background: event.target.value })}
            />
          </label>
        </Section>

        <Section title="辅助">
          <label className="toggle-row">
            <span>显示网格</span>
            <input
              className="switch-input"
              type="checkbox"
              checked={showGrid}
              onChange={(event) => setShowGrid(event.target.checked)}
            />
            <i className="switch" />
          </label>
          <label className="toggle-row">
            <span>移动吸附网格</span>
            <input
              className="switch-input"
              type="checkbox"
              checked={snap}
              onChange={(event) => setSnap(event.target.checked)}
            />
            <i className="switch" />
          </label>
        </Section>

        <Section title="示例">
          <button
            className="ghost-btn wide"
            onClick={() => {
              if (window.confirm('重置为示例项目？当前修改将丢失。')) resetDemo();
            }}
          >
            <RotateCcw size={14} /> 重置为示例项目
          </button>
          <p className="hint-text">
            修改会自动保存在浏览器本地。选中组件后可编辑属性；Shift 多选，Delete 删除，Ctrl+Z 撤销。
          </p>
        </Section>
      </div>
    </div>
  );
}

export function Inspector() {
  const selected = useEditor((s) => s.selected);
  if (!selected.length) return <CanvasSettings />;
  if (selected.length > 1) return <MultiInspector />;
  return <NodeInspector nodeId={selected[0]} />;
}
