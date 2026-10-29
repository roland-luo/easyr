# 从零实现一个 EasyV 类大屏可视化框架

> 目标读者：准备做低代码大屏 / 数据可视化搭建平台的团队。
> 本文给出一套可落地的架构、关键取舍、后端与发布设计、里程碑估算，并对照本仓库已经跑通的骨架代码。

---

## 0. 先说结论：大多数团队不需要“再造一个 EasyV”

自建一个能商用的 EasyV 类平台，通常需要：

- 2～3 名前端（编辑器 + 组件 + 运行时）
- 1 名后端（项目、资源、数据源代理、发布）
- 3～6 个月做出内部可用版本，6～12 个月才能接近商业产品的完成度
- 之后长期投入在**组件生态、模板素材、数据源适配、稳定性**上

所以先回答三个问题：

1. **一年要做多少块大屏？** 少于 10 块，直接买 EasyV / DataV，或者用模板 + 前端代码交付，成本更低。
2. **是否需要业务方自助搭建？** 如果只有研发做大屏，不需要拖拽平台，只需要一套“大屏组件库 + 项目脚手架”。
3. **是否需要私有化、多租户、定制组件？** 需要私有化和行业组件，才值得自建平台；否则优先买。

如果答案仍然是“要自建”，建议把第一版目标压缩成：

> 一块 1920×1080 的大屏，能拖拽布局、绑定 HTTP 数据、预览、发布成链接；
> 组件可以通过插件扩展；项目能保存和回滚。

这就是本仓库正在演示的最小闭环。其余能力（模板市场、协作、权限、素材）都是在这个闭环上叠加。

---

## 1. 把 EasyV 拆成 7 件事

| 能力 | 用户看到什么 | 工程本质 | 第一版优先级 |
| --- | --- | --- | --- |
| 编辑器 | 画布、拖拽、缩放、图层、属性面板 | 文档模型 + 坐标变换 + 交互状态机 | P0 |
| 组件体系 | 文本、图表、地图、装饰、视频 | 插件协议 + 注册表 + 属性 Schema | P0 |
| 运行时 | 预览、全屏、适配 | 只读渲染器 + 屏幕适配 | P0 |
| 数据 | 静态 JSON、API、WebSocket、数据库 | 数据源适配器 + 转换管道 + 绑定 | P1 |
| 交互联动 | 点击下钻、筛选、弹窗、跳转 | 事件总线 + 动作系统 + 变量作用域 | P1 |
| 发布与后端 | 保存、版本、分享链接、嵌入 | 快照 + 资源存储 + 数据源代理 | P1 |
| 协作与生态 | 多人编辑、模板、素材、插件市场 | CRDT / 权限 / 审核 / 计费 | P2 |

**最重要的判断：EasyV 的核心不是画布库，而是“文档模型 + 组件协议 + 数据绑定 + 发布链路”。**
画布拖拽是最容易被看见的部分，也是最容易重写的部分；文档模型和组件协议一旦定错，后面所有功能都会返工。

---

## 2. 总体架构

推荐 monorepo，按“依赖方向”拆包，而不是按页面拆：

~~~text
┌──────────────────────── apps/studio ────────────────────────┐
│  Toolbar   Palette   Canvas   Layers   Inspector   DataPanel │
└───────────────┬──────────────────────────────┬──────────────┘
                │                              │
      packages/core                    packages/components
  文档模型 / 注册表 / 命令 / 历史        内置组件 + 第三方组件
                │                              │
                └──────────────┬───────────────┘
                               │
                      packages/runtime
                 播放器 / 屏幕适配 / 事件总线
                               │
                ┌──────────────┴──────────────┐
        packages/data                  packages/engine
   数据源适配 / 转换 / 调度        场景渲染 / 坐标 / 命中测试
                               │
                        server (Node / Go)
        项目 / 版本 / 资源 / 数据源代理 / 发布 / 权限
~~~

依赖规则：

- **core 不依赖 React**，只依赖纯 TypeScript 类型与工具函数，方便未来做 Vue 版、CLI、服务端渲染。
- **components 只依赖 core**，每个组件是一个独立插件，可单独发包。
- **editor 依赖 core + components + engine**，是“编辑态”的组合。
- **runtime 依赖 core + components + data**，是“播放态”的组合，发布时只打包 runtime。
- **server 不依赖前端包**，只消费 JSON 文档与资源。

本仓库为了演示，把包折叠进了一个 Vite 应用，但目录边界是按上述方式划分的：

~~~text
src/core         文档模型、注册表、store、历史、存储
src/components   6 个内置组件
src/editor       工具栏、组件库、画布、图层、属性面板
src/runtime      预览播放器
src/App.tsx      编辑态与播放态的切换
~~~

---

## 3. 六个关键设计决策

### 3.1 渲染：DOM 为主，Canvas / WebGL 局部增强

大屏组件的真实构成：

- 文本、图片、视频、iframe、边框装饰、指标卡 → DOM / CSS 最合适
- 图表 → ECharts 自己的 Canvas / SVG
- 地图、粒子、3D → WebGL（Mapbox / Three.js / PixiJS）
- 标尺、参考线、框选 → 编辑器覆盖层用 Canvas 或 SVG

因此推荐：

- 每个节点是一个绝对定位的 DOM 容器，位置和尺寸用 left / top / width / height 表达；
- 整个画板用一层 CSS transform 缩放，而不是给每个节点单独乘缩放系数；
- 选中框、缩放手柄、参考线放在画板外层，用屏幕坐标绘制，避免被缩放糊掉；
- 需要重型渲染的组件内部自带 Canvas / WebGL，不参与 DOM 布局。

为什么不用纯 Canvas 引擎（Konva / Fabric / Pixi）：

- 文本换行、字体、富文本、视频、iframe、可访问性都要自己实现；
- 图表组件本身已经是 Canvas，再嵌一层 Canvas 引擎会多一次合成；
- 业务方经常要插 iframe / 视频 / 第三方页面，DOM 天然支持。

什么时候该用 Canvas 引擎：

- 单屏上千个图元、自由绘制、滤镜、粒子、连线；
- 这时把 Canvas 引擎封装成一个“组件”，而不是替换整个渲染层。

### 3.2 文档模型：扁平节点表 + rootIds

不要用嵌套树存节点。推荐“规范化（normalized）”结构：

~~~ts
export interface ProjectDoc {
  version: 1;
  name: string;
  canvas: { width: number; height: number; background: string; grid: number };
  rootIds: string[];
  nodes: Record<string, SceneNode>;
}

export interface SceneNode {
  id: string;
  type: string;
  name: string;
  parentId: string | null;
  children: string[];
  rect: { x: number; y: number; w: number; h: number; rotation: number };
  props: Record<string, unknown>;
  hidden?: boolean;
  locked?: boolean;
}
~~~

好处：

- 按 id 更新 O(1)，不用递归找节点；
- 图层顺序就是 rootIds 的顺序，调整层级只是数组操作；
- 未来做组合、容器、弹窗，只需要用 parentId / children 扩展；
- 序列化、版本迁移、协同编辑都更容易；
- 文档里只放 JSON，不放 React 组件、函数、DOM 引用。

必须从第一天就有的字段：

- version：文档结构版本，配套迁移函数；
- id：稳定唯一，复制/粘贴/撤销都不能变；
- type：组件类型，和注册表中的 key 对应；
- rect：几何信息与业务属性分离；
- props：组件私有属性，必须可 JSON 序列化。

### 3.3 编辑事务与历史

编辑器里的每次修改都应经过同一个入口：

~~~ts
mutate(fn: (draft: ProjectDoc) => void, opts?: { record?: boolean; coalesce?: string })
~~~

两条规则：

1. **拖拽期间不记历史，松手时提交一次。**
   指针按下时保存 base 快照，移动过程只改文档，抬起时把 base 推入历史。
2. **连续输入合并历史。**
   属性面板连续输入时，用 coalesce key + 时间窗口合并，避免每个字符一步撤销。

本仓库的实现是“快照式历史”（每次提交保存整份文档）。优点是简单、可靠；缺点是文档大时内存高、无法直接做多人协同。

生产环境建议演进为“操作日志 + 逆操作”：

~~~ts
type DocOp =
  | { type: 'node.add'; node: SceneNode; index: number }
  | { type: 'node.update'; id: string; patch: Partial<SceneNode> }
  | { type: 'node.remove'; id: string }
  | { type: 'node.reorder'; id: string; index: number };
~~~

有了 op，就可以：

- 只存增量，历史更省内存；
- 把 op 发给服务端做持久化 / 协同；
- 做操作级别的权限与审计。

但不要一开始就上 CRDT。先用“单机 op + 快照历史”，等协作需求明确后再换 Yjs。

### 3.4 组件协议：一个组件就是一个插件

组件不是“在画布里写死的一个 div”，而是一个带元数据的定义：

~~~tsx
export interface ComponentDef {
  type: string;                 // 全局唯一，如 'gauge'
  name: string;                 // 组件库显示名
  category: string;             // 分组
  icon: ComponentType<any>;
  defaultSize: { w: number; h: number };
  defaultProps: Record<string, unknown>;
  fields: PropField[];          // 驱动属性面板自动生成
  render: (ctx: { node: SceneNode; mode: 'design' | 'preview' }) => ReactNode;
}
~~~

属性面板由 fields 自动生成，这是组件规模化的关键：新增组件不需要改编辑器代码。

一个最小示例：

~~~tsx
export const gaugeComponent: ComponentDef = {
  type: 'gauge',
  name: '仪表盘',
  category: 'chart',
  icon: Gauge,
  defaultSize: { w: 320, h: 240 },
  defaultProps: { value: 68, unit: '%', color: '#22d3ee' },
  fields: [
    { key: 'value', label: '数值', type: 'number', min: 0, max: 100 },
    { key: 'unit', label: '单位', type: 'text' },
    { key: 'color', label: '颜色', type: 'color' },
  ],
  render: ({ node }) => <GaugeView node={node} />,
};

registerComponent(gaugeComponent);
~~~

组件注册后，会自动出现在组件库、图层、属性面板、预览里。

生产级协议还应补充：

- dataSchema：组件期望的数据结构，用于数据面板做字段映射；
- events：组件能抛出的事件（click、legendChange、dataZoom）；
- actions：组件能执行的动作（setOption、play、reset）；
- version / author / icon / thumbnail：组件市场的元数据；
- runtime 与 editor 的分离产物：编辑器里可能需要额外的配置 UI，播放器只需要渲染。

第三方组件的三种加载方式：

| 方式 | 隔离性 | 体验 | 建议 |
| --- | --- | --- | --- |
| 构建期 npm 包 + 注册 | 无（同源 JS） | 最好 | 第一版首选 |
| 运行时 iframe + postMessage | 强 | 有通信成本 | 开放市场时用 |
| 服务端编译成 UMD 再加载 | 中 | 一般 | 有审核团队时用 |

不要直接 eval 用户上传的 JS；这是大屏平台最常见的 XSS / 供应链入口。

### 3.5 坐标、缩放与屏幕适配

编辑器里有两套坐标：

- 文档坐标：画板左上角为原点，单位是设计稿像素；
- 屏幕坐标：鼠标事件、选中框、手柄所在的坐标。

两者通过视图变换换算：

~~~ts
screenX = view.x + docX * view.scale;
docX = (screenX - view.x) / view.scale;
~~~

所有拖拽、缩放、吸附都必须先除以 scale。这是新手最常犯的错误。

运行时适配常见三种模式：

| 模式 | 算法 | 适用 |
| --- | --- | --- |
| 等比适应 contain | min(vw/W, vh/H) | 大多数大屏，留黑边 |
| 等比铺满 cover | max(vw/W, vh/H) | 拼接屏、异形屏，裁切边缘 |
| 拉伸 stretch | scaleX / scaleY 独立 | 对比例不敏感的场景 |

播放器用一个 transform 包住整个画板：

~~~ts
const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
stage.style.transform = 'translate(-50%, -50%) scale(' + scale + ')';
~~~

注意：

- DOM 文本缩放后仍然清晰（矢量）；
- ECharts 的 Canvas 在放大超过 1 倍后会模糊。解决方式：按设计尺寸渲染，初始化时设置 devicePixelRatio，尽量只缩小不放大；或者用 SVG renderer；
- 视频、iframe 外层要加遮罩，否则编辑态无法拖拽；
- 全屏 API、浏览器地址栏、任务栏都会影响可用高度，适配要以实际 clientWidth / clientHeight 为准；
- 超宽屏 / 竖屏 / 拼接屏不要只做一个固定比例，预留 per-screen 偏移配置。

### 3.6 数据引擎：数据源、转换、绑定三层分离

不要在组件里直接 fetch。推荐三层：

~~~text
DataSource (HTTP / WebSocket / SQL / 静态)
      │
      ▼
Transform (JSONPath / 字段映射 / 简单表达式)
      │
      ▼
Binding (把结果写进组件 props 的某个路径)
      │
      ▼
Component
~~~

绑定描述建议长这样：

~~~ts
interface DataBinding {
  sourceId: string;
  query?: Record<string, unknown>;
  transform?: {
    kind: 'jsonpath' | 'mapping' | 'js';
    expr?: string;
    mapping?: Record<string, string>;
  };
  refresh?: { interval: number; mode: 'poll' | 'push' };
  target: 'props';
}
~~~

运行时调度器负责：

- 轮询 / WebSocket 订阅 / 手动刷新；
- 并发去重、超时、取消（组件卸载时 abort）；
- 失败重试与错误态；
- 数据版本号，防止旧响应覆盖新响应；
- 缓存与节流（多个组件订阅同一数据源时只请求一次）。

数据源凭证绝不能放进文档 JSON。正确做法：

- 浏览器只拿到 sourceId；
- 播放器请求后端代理接口；
- 后端解密凭证、发起请求、裁剪字段、限流；
- 用短期签名 token 做鉴权。

### 3.7 交互与联动：事件 → 动作 → 变量

不要在组件里写业务回调。用声明式描述：

~~~ts
type Action =
  | { type: 'setVariable'; name: string; value: unknown }
  | { type: 'requestData'; sourceId: string }
  | { type: 'navigate'; pageId: string }
  | { type: 'openModal'; nodeId: string }
  | { type: 'callHandler'; name: string; payload?: unknown };
~~~

事件总线把“组件事件”翻译成“动作”，动作修改全局变量，绑定到变量的组件自动重新取数 / 重渲染。

要防的三件事：

- 循环联动（A 改 B，B 又改 A）→ 加深度限制与去重；
- 事件风暴（hover 触发请求）→ 防抖 + 节流；
- 作用域污染（页面级 / 组件级变量同名）→ 明确作用域链。

---

## 4. 发布、后端与权限

### 4.1 数据表（最小集）

~~~sql
create table project (
  id            uuid primary key,
  owner_id      uuid not null,
  name          text not null,
  doc           jsonb not null,
  thumbnail     text,
  updated_at    timestamptz not null default now()
);

create table project_version (
  id            uuid primary key,
  project_id    uuid not null references project(id),
  doc           jsonb not null,
  note          text,
  created_at    timestamptz not null default now()
);

create table asset (
  id            uuid primary key,
  project_id    uuid not null,
  url           text not null,
  mime          text,
  size          bigint,
  created_at    timestamptz not null default now()
);

create table datasource (
  id            uuid primary key,
  project_id    uuid not null,
  type          text not null,
  config        jsonb not null,   -- 加密存储
  created_at    timestamptz not null default now()
);

create table publish (
  id            uuid primary key,
  project_id    uuid not null,
  version_id    uuid not null,
  public_id     text unique not null,
  status        text not null,
  published_at  timestamptz
);
~~~

### 4.2 发布链路

~~~text
编辑器保存
  → 生成版本快照（doc + 组件版本 + 资源清单 + 数据源引用）
  → 服务端校验 schema、解析资源、替换数据源为代理地址
  → 生成播放器配置（只含 runtime 需要的字段）
  → 上传 CDN / OSS
  → 返回公开链接 / iframe 嵌入代码
~~~

关键点：

- **播放器不打包编辑器**。发布产物只包含 runtime + 用到的组件，首屏才可控；
- **快照不可变**。发布后修改项目不影响已发布版本，回滚只是切换 version；
- **资源走 CDN**，文档里只存 URL，不存 base64；
- **公开链接用 publicId**，不要暴露内部项目 id；
- **嵌入用 iframe + sandbox**，避免和宿主页面样式 / 脚本互相污染。

### 4.3 权限

最小 RBAC：

- 平台管理员：用户、配额、模板审核；
- 项目所有者：编辑、发布、删除、成员管理；
- 编辑者：编辑，不能发布；
- 查看者：只能看已发布链接。

再加：分享密码、有效期、水印、访问日志、IP 白名单。大屏经常投在展厅，水印和防截屏是真实需求。

---

## 5. 性能与稳定性

编辑器性能的三个大头：

1. **拖拽时整棵组件树重渲染。**
   本仓库为了简单，拖拽时克隆整份文档，所有节点都会重渲染。100 个节点以内没问题；上千节点要改成：
   - 每个节点单独订阅自己的 rect（zustand selector / useSyncExternalStore）；
   - 拖拽只更新被拖节点；
   - 或者用 CSS transform 做临时位移，松手再写回文档。

2. **历史快照太大。**
   文档里如果有大量 base64 图片，历史会迅速爆内存。资源必须外链，历史只存引用。

3. **ECharts 重复 setOption。**
   依赖项要用序列化后的数据签名，而不是 props 对象引用；否则拖拽别的节点也会触发所有图表重绘。

运行时性能：

- 重型组件（地图、3D、视频）懒加载；
- 图表大数据集降采样（sampling: 'lttb'）；
- 离屏 / 不可见页面暂停动画与轮询；
- 字体做子集化，避免中文字体几 MB；
- 首屏预算：HTML + JS + 首屏数据 < 1.5 MB（gzip），否则展厅网络会白屏。

稳定性：

- 组件渲染错误要用 ErrorBoundary 包住，单组件崩溃不能拖垮整屏；
- 数据源失败要有骨架屏 / 错误态，不能一直空白；
- 发布前做 schema 校验和截图回归（Playwright 截图对比非常有效）；
- 文档迁移函数要幂等，老项目升级不能丢数据。

---

## 6. 多人协作：什么时候上，怎么上

不要在第一版做实时协作。它会同时改变：

- 文档模型（需要 CRDT / OT）；
- 历史模型（每用户撤销）；
- 权限模型（节点级锁）；
- 后端（WebSocket、房间、持久化）。

如果确定要做，推荐 Yjs：

- 每个项目一个 Y.Doc；
- nodes 用 Y.Map，rootIds 用 Y.Array；
- 选区 / 光标用 Awareness；
- 撤销用 Y.UndoManager，按用户隔离；
- 服务端只做中继与持久化，不做冲突合并。

如果只是“几个人不要同时改同一个项目”，用悲观锁 + 版本号（乐观并发）更便宜。

---

## 7. 本仓库实现了什么

技术栈：React 18 + TypeScript + Vite 5 + Zustand 5 + ECharts 5。

| 文件 | 职责 |
| --- | --- |
| src/core/types.ts | 文档、节点、组件协议的 TypeScript 定义 |
| src/core/registry.ts | 组件注册表与分组 |
| src/core/store.ts | 编辑器状态、文档变更、历史、选择、视图 |
| src/core/seed.ts | 内置示例大屏（17 个节点） |
| src/core/storage.ts | localStorage 自动保存、JSON 导入导出 |
| src/core/geometry.ts | 矩形并集、数值 clamp |
| src/components/* | 文本、指标卡、时钟、形状、图表、图片 |
| src/editor/Canvas.tsx | 画板、拖拽、缩放、平移、吸附、选中框 |
| src/editor/Inspector.tsx | Schema 驱动的属性面板、多选对齐 |
| src/editor/Toolbar.tsx | 撤销重做、缩放、网格、导入导出、预览 |
| src/editor/Palette.tsx | 组件库 |
| src/editor/LayersPanel.tsx | 图层、显隐、锁定、层级调整 |
| src/runtime/Player.tsx | 只读播放器，contain / cover 适配 |
| src/App.tsx | 布局、快捷键、自动保存 |

已实现：

- 1920×1080 画板，滚轮缩放、空白拖拽平移、适应画布；
- 组件拖拽移动、八向缩放、网格吸附（Alt 临时关闭）；
- 图层选择、显隐、锁定、上移 / 下移、删除；
- Schema 驱动的属性编辑，位置 / 尺寸 / 透明度 / 组件属性；
- Shift 多选、六种对齐、批量删除；
- 撤销 / 重做（快照历史，拖拽合并为一步）；
- 复制 / 粘贴 / 复制副本、方向键微调；
- 预览模式，contain / cover 切换，Esc 退出；
- localStorage 自动保存、JSON 导入导出、示例重置；
- ECharts 图表支持静态 JSON 与 HTTP 轮询数据源。

刻意简化、尚未实现（生产前必须补）：

- 没有后端：项目只存在浏览器 localStorage；
- 只有单层节点，没有组合 / 容器 / 弹窗；
- 没有标尺、参考线、框选、图层面板拖拽排序；
- 没有数据源管理面板、字段映射、变量系统；
- 没有事件 / 联动配置；
- 没有发布、版本、权限、模板、素材；
- 没有组件沙箱与第三方组件加载；
- 没有协同编辑；
- 拖拽采用整文档快照，节点多时需要优化。

---

## 8. 如何新增一个组件

三步：

1. 实现一个 React 组件（只负责渲染，不要改文档）；
2. 写 ComponentDef，声明默认尺寸、默认属性、属性 Schema；
3. 调用 registerComponent 注册。

~~~tsx
// src/components/Gauge.tsx
import { Gauge } from 'lucide-react';
import type { ComponentDef } from '../core/types';

export const gaugeComponent: ComponentDef = {
  type: 'gauge',
  name: '仪表盘',
  category: 'chart',
  icon: Gauge,
  defaultSize: { w: 320, h: 240 },
  defaultProps: { value: 68, unit: '%', color: '#22d3ee' },
  fields: [
    { key: 'value', label: '数值', type: 'number', min: 0, max: 100 },
    { key: 'unit', label: '单位', type: 'text' },
    { key: 'color', label: '颜色', type: 'color' },
  ],
  render: ({ node }) => {
    const p = node.props;
    return (
      <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
        <div style={{ fontSize: 40, color: p.color }}>
          {p.value}
          <small>{p.unit}</small>
        </div>
      </div>
    );
  },
};
~~~

~~~ts
// src/components/index.ts
import { registerComponent } from '../core/registry';
import { gaugeComponent } from './Gauge';

registerComponent(gaugeComponent);
~~~

约束：

- render 必须是纯函数，不能在渲染期间发请求或改 store；
- 组件尺寸由外层容器决定，内部用 100% 宽高自适应；
- 数据请求放在组件内的 useEffect，并处理卸载取消；
- 需要区分编辑态与播放态时，使用 render 参数里的 mode；
- 不要在组件里读全局 store，否则组件无法在播放器 / 第三方页面复用。

---

## 9. 路线图与人力估算

以 2 名前端 + 1 名后端、已有设计稿为前提：

| 阶段 | 内容 | 工期 | 出口标准 |
| --- | --- | --- | --- |
| M0 编辑器骨架 | 文档模型、画板、拖拽缩放、图层、属性、撤销 | 3～4 周 | 能搭出一块静态大屏并保存 JSON |
| M1 组件体系 | 组件协议、10～15 个内置组件、属性 Schema | 3～4 周 | 新组件不改编辑器即可接入 |
| M2 数据与交互 | 数据源、轮询、字段映射、变量、联动 | 3～4 周 | 能接一个真实 HTTP 接口并下钻 |
| M3 后端与发布 | 项目 / 版本 / 资源 / 发布 / 权限 | 3～4 周 | 能生成公开链接和 iframe |
| M4 模板与素材 | 模板、主题、素材库、缩略图 | 2～3 周 | 业务方能从模板起步 |
| M5 协作与生态 | 多人协作、插件市场、审核、计费 | 4～6 周 | 可对外商业化 |

内部可用版本（M0～M3）大约 3～4 个月；达到商业产品完成度通常 6～12 个月。

如果前端只有 1 人，建议砍掉 M4/M5，先做“单项目 + 固定组件 + 发布”，用模板弥补组件数量。

---

## 10. 常见坑清单

1. **缩放后忘记除 scale**：拖拽位移、手柄尺寸、吸附阈值都会错位。
2. **ECharts 放大模糊**：Canvas 按 CSS 像素渲染，父级放大后失真；尽量只缩小，或设置 devicePixelRatio / 用 SVG。
3. **组件内的 iframe / 视频抢事件**：编辑态加透明遮罩，播放态再去掉。
4. **pointerdown 后没有全局监听 pointerup**：鼠标移出画布后拖拽状态卡死。
5. **拖拽过程中触发 undo**：历史里会出现半截状态；拖拽期间禁用快捷键。
6. **transform 创建新的 stacking context**：画板缩放后，内部 z-index 与外部浮层的关系会变，选中框必须放在画板外层。
7. **base64 图片进文档**：localStorage 5 MB 很快爆，历史也会翻倍；资源一律外链。
8. **数据源 CORS / 凭证泄露**：浏览器直连第三方接口通常失败；凭证必须放后端代理。
9. **轮询请求泄漏**：组件卸载、数据源切换时要 abort，否则旧响应会覆盖新数据。
10. **文档 schema 漂移**：老项目缺少新字段时组件崩溃；每个版本都要有迁移函数与默认值兜底。
11. **自定义组件 XSS**：文本组件如果支持 HTML，必须 sanitize；第三方组件必须隔离。
12. **全屏 / 拼接屏适配**：不要假设 16:9；用实际 clientWidth / clientHeight，并预留偏移配置。
13. **字体缺失**：大屏机器可能没有设计字体；做字体子集化并随项目发布。
14. **首屏过大**：ECharts + 地图 + 3D 一起上，很容易 3 MB 起步；按需加载组件。
15. **撤销只做了一半**：选择、图层顺序、属性、数据绑定都要能被撤销，否则用户不敢用。

---

## 11. 参考

- Apache ECharts：图表能力与大数据量优化
- Yjs：多人协作的 CRDT 基础设施
- DataV（React）、GoView（Vue3）、FlyFish、AJ-Report：开源大屏 / 报表平台的实现思路，注意各自 License
- 袋鼠云 EasyV、阿里云 DataV：商业产品的能力边界与交互参考

---

## 12. 建议的下一步（按投入产出排序）

1. **把文档搬到后端**：项目表 + 版本表 + 资源上传，先解决“刷新/换机器就丢”的问题。
2. **做数据源面板**：数据源 CRUD、测试连接、字段预览、绑定到组件属性；这是从“画图工具”变成“数据平台”的分水岭。
3. **补组件协议**：dataSchema、events、actions，为联动和组件市场打基础。
4. **做发布链路**：版本快照 + 独立播放器包 + 公开链接；这是业务方真正要的交付物。
5. **最后做协作**：等单机体验稳定、权限模型清晰之后，再引入 Yjs。
