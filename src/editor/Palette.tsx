import { componentGroups } from '../core/registry';
import { useEditor } from '../core/store';

export function Palette() {
  const addComponent = useEditor((s) => s.addComponent);
  const groups = componentGroups();

  return (
    <div className="palette">
      <div className="panel-head">
        <span>组件库</span>
        <span className="panel-hint">点击添加</span>
      </div>
      <div className="palette-scroll">
        {groups.map((group) => (
          <section className="palette-group" key={group.key}>
            <h4 className="palette-caption">{group.label}</h4>
            <div className="palette-grid">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.type}
                    className="palette-item"
                    onClick={() => addComponent(item.type)}
                    title={`添加${item.name}`}
                  >
                    <Icon size={18} strokeWidth={1.6} />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
