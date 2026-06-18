# PRD: My Mind Node 前端思维导图库

文档状态：Draft  
版本：v0.12
日期：2026-06-12
产品形态：纯前端 npm package / UI library  
参考竞品：MindNode Features，https://www.mindnode.com/features（访问日期：2026-06-11）

## 0. PM Review 结论

结论：产品方向成立，但 v0.8 的范围偏大，容易把“做一个可嵌入的导图库”误解成“复刻完整 MindNode 应用”。本版 PRD 将目标收束为：先交付一个默认观感足够好、开发者 10 分钟能接入、数据和扩展边界清晰的前端 SDK；再分阶段补齐大纲、导入导出、标签、任务、AI/provider 和协作 adapter。

核心问题与处理：

- 竞品功能过宽：MindNode 当前功能覆盖导图、大纲、图片、实时协作、Apple 生态、AI、标签、任务、导入导出、主题、可访问性等。本库应对标“体验方向”，不复制账号、云同步、Apple 平台和内置 AI 服务。
- MVP 口径不够清晰：原文大量能力标记为 Must，会让 M0/M1/M2 同时背上编辑器、纲要、导入导出、标签、任务、连接线、检查器和扩展系统。本文补充分阶段口径，Must 代表 Public Beta 门槛，不代表第一个技术原型全部完成。
- “好看好用”缺少验收标准：本文增加默认体验、空状态、交互路径、主题质量和可访问性验收，避免只交付功能清单。
- 右键进入节点视图存在 Web 交互争议：建议默认右键打开上下文菜单，并在菜单中提供“进入节点视图”；若产品明确要更像内部工具的快速导航，可通过配置改为右键直接进入。
- 必须确认项集中到文末，未确认前不建议锁死公开 API、包名所有权和首发导入导出范围。

## 1. 背景与目标

My Mind Node 是一个可通过 `npm i` 安装并嵌入任意前端应用的思维导图库。它不是一个带账号、云存储和后端服务的完整 SaaS，而是一个纯前端编辑器 SDK，向开发者提供 MindNode 类似的导图编辑、纲要编辑、节点样式、标签、任务、折叠、聚焦、导入导出和扩展接口。

目标是让开发者用少量代码把高质量思维导图能力集成进自己的产品，例如知识库、笔记应用、项目管理工具、教育平台、白板工具、AI 写作产品或企业内部系统。

### 1.1 产品愿景

开发者执行 `npm i @my-mind-node/core @my-mind-node/react` 后，能在 10 分钟内渲染第一张可编辑思维导图，接入 `onChange` 保存数据，并在不理解画布、布局和快捷键细节的情况下获得接近成熟产品的默认体验。主题、导入导出、AI、协作和业务权限通过稳定 API、provider 或 adapter 逐步开放给宿主应用接管。

### 1.2 核心价值

- 开箱即用：内置可编辑导图画布、大纲视图、默认主题和快捷键。
- 纯前端：不绑定后端、不绑定账号系统、不上传用户数据。
- 可控数据：宿主应用通过受控/非受控模式管理导图数据。
- 可扩展：提供插件、事件、命令、节点渲染、自定义主题和适配器接口。
- 框架友好：优先提供 React 组件，同时保留 framework-agnostic core。
- 类型安全：所有公开 API 提供 TypeScript 类型定义。
- 体验可信：默认主题、动效、快捷键、错误状态和示例数据需要达到可直接放进产品原型的质量。

## 2. 当前假设

- 包名确定为 `@my-mind-node/core`、`@my-mind-node/react`、`@my-mind-node/importers`、`@my-mind-node/exporters`；`themes`、`plugins`、`devtools` 目录可预留，是否作为独立 npm 包发布需在 Beta 前确认。
- 首发只提供 React adapter；核心数据模型、布局、导入导出和命令系统不依赖 React，不预留 Vue/Svelte adapter 作为首发目标。
- Alpha 编辑器渲染基座采用 React Flow；自动布局采用 ELK.js 作为首发固定依赖，并默认放入 Web Worker 执行；节点关系线采用自定义贝塞尔曲线 Edge。
- 发布产物采用 ESM only，不提供 CJS 入口。
- license 采用 MIT；不提供 Pro 插件体系或商业功能分层。
- 运行环境为现代浏览器，优先支持 Chrome、Edge、Safari、Firefox 最新两个大版本。
- 不提供任何后端服务；保存、同步、权限、分享链接、AI 请求都由宿主应用实现。
- 协作能力在库内表现为可序列化操作、状态变更事件和可选 CRDT 适配器，不内置 WebSocket 服务。
- AI 能力在库内表现为 UI 入口和 provider 接口，不内置模型密钥、不直接调用第三方 API。
- 图片处理优先支持本地上传和渲染；图片存储、上传、压缩策略由宿主应用接管。
- 支持缩进文本数据格式（Indented Text）作为轻量交换格式，便于宿主应用、AI 输出和剪贴板内容快速转换为导图。

### 2.1 版本与优先级口径

- 技术原型：验证 React Flow、ELK.js、Web Worker、基础数据模型和导图交互可行性，不承诺 API 稳定。
- Alpha：第一个可安装、可嵌入、可编辑、可保存回调的版本；重点是编辑器核心体验和默认观感。
- Public Beta：面向外部开发者试用；Must 需求必须完成，公开 API 进入 semver 保护范围。
- Post-beta：AI、协作、更多图片处理、更多官方插件和更广泛格式兼容，除非用户验证显示它们是采用门槛，否则不进入 Public Beta。
- 本文功能表中的 Must 表示 Public Beta 必须满足；Should 表示 Beta 后优先候选；Could 表示保留扩展点但不承诺首发。

## 3. 目标用户

### 3.1 前端开发者

需求：快速在应用中嵌入导图编辑器。  
痛点：自研画布、布局、编辑器交互和导出能力成本高。  
成功标准：10 分钟内完成安装、渲染、编辑和保存回调接入。

### 3.2 SaaS 产品团队

需求：把导图能力接入现有知识库、项目管理、教育或 AI 产品。  
痛点：需要业务可控，不能被第三方云服务或固定 UI 限死。  
成功标准：可以自定义主题、节点渲染、工具栏、权限和存储。

### 3.3 开源/独立开发者

需求：用一个稳定 npm 包构建自己的导图产品或插件。  
痛点：需要轻量、文档清楚、bundle 可控、API 不轻易破坏。  
成功标准：包体积、API、示例、迁移文档都适合长期依赖。

### 3.4 核心 Job To Be Done

当开发者在一个已有产品里需要表达复杂层级、计划拆解或知识结构时，他希望直接嵌入一个漂亮、可编辑、可保存、可扩展的导图能力，而不是从零实现画布、布局、快捷键、导出和数据模型。

首要用户路径：

1. 开发者打开文档首页，复制 React 示例。
2. 10 分钟内在本地应用渲染默认导图。
3. 修改节点后通过 `onChange` 拿到结构化文档。
4. 调整高度、主题和只读模式，确认可以放入真实业务页面。
5. 需要更深集成时，再接入自定义节点、工具栏、导入导出或 provider。

北极星指标：从安装到保存第一次有效导图变更的成功率和耗时。Public Beta 阶段目标为 80% 新开发者在 10 分钟内完成最小集成。

## 4. 产品定位与边界

### 4.1 这个库提供什么

- 导图编辑器组件：画布、节点、连线、单选/多选、框选、成组拖动、画布缩放、节点局部放大/缩小、节点进入、面包屑导航、快捷键。
- 大纲编辑器组件：树形层级编辑，并与导图数据双向同步。
- 核心数据模型：文档、节点、连接线、标签、任务、主题、布局。
- 命令系统：新增、删除、移动、折叠、样式修改、撤销/重做。
- 导入导出：Markdown、OPML、缩进文本、JSON、PNG、SVG。
- 样式系统：主题、主题切换侧边栏、节点形状、颜色、线条、暗色模式。
- 扩展接口：自定义节点、工具栏、右键菜单、快捷键、AI provider、协作 adapter。
- 文档和示例：React、Vite、Next.js、只读模式、受控模式、自定义节点、导入导出示例、在线示例页面。

### 4.2 这个库不提供什么

- 不提供账号、登录、用户权限和组织管理。
- 不提供云端保存、数据库、文件存储和服务端 API。
- 不提供可公开访问的分享链接服务。
- 不提供内置实时协作服务器。
- 不内置 OpenAI、Apple Intelligence 或其他模型服务密钥。
- 不承诺完整复制 Apple 平台原生能力，例如 iCloud、Apple Reminders、Shortcuts、Vision Pro 空间交互。
- 不提供 Vue/Svelte adapter、CJS 构建、PDF 导出、Pro 插件体系、FreeMind/XMind 等更多导图格式兼容。

## 5. MindNode 功能对标与库内实现方式

MindNode 的功能页按 Think、AI、Clarify、Act、Express 等场景组织，核心启发是“从捕捉想法到结构化行动再到表达风格”的完整体验。本库只承接其中适合前端 SDK 的部分：画布、大纲、结构、样式、导入导出和扩展点；涉及账号、iCloud、Apple 平台、模型能力和同步服务的功能仅保留宿主集成接口。

| MindNode 能力 | 库内目标 | 首发阶段 |
| --- | --- | --- |
| Mind Maps | 可编辑无限画布、节点树、自动布局 | Alpha |
| Outlines | 大纲视图与导图数据双向同步 | Beta |
| Images | 节点图片字段、图片渲染、宿主上传回调 | Beta |
| Stickers & Emojis | Emoji 支持、自定义图标集接口；不承诺 250+ 内置贴纸 | Post-beta |
| Live Collaboration | 操作事件、外部协作适配器、CRDT 集成点 | Post-beta |
| All Your Devices | 响应式和触控支持，由宿主跨端部署 | Beta |
| Immersive Brainstorming on Vision Pro | 不提供；宿主可基于命令和渲染接口自行扩展空间交互 | 不提供 |
| AI Brainstorming | AI provider 接口，生成/扩展节点建议 | Post-beta |
| Generate Text & Summarize | AI provider 接口，返回文本或结构化节点 | Post-beta |
| Image Background Removal | 图片处理 provider 接口 | Post-beta |
| Visual Tags | 标签、标签颜色、标签高亮模式 | Beta |
| Connections | 非层级节点连接线 | Beta |
| Notes | 节点备注字段和详情面板 | Beta |
| Focus Mode | 聚焦选中节点及上下文，支持进入节点后的面包屑导航 | Alpha |
| Folding | 分支折叠/展开 | Alpha |
| Tasks | 节点任务状态、优先级、截止日期字段 | Beta |
| Apple Shortcuts | 不提供；宿主可用命令 API 自行集成 | 不提供 |
| Link Documents | 节点链接字段、跨文档链接由宿主解析 | Beta |
| Import | JSON、缩进文本优先；Markdown、OPML 进入 Beta | Alpha/Beta |
| Share & Export | JSON、缩进文本优先；PNG、SVG、Markdown、OPML 进入 Beta；不支持 PDF、FreeMind、XMind、TextBundle、Rich Text | Alpha/Beta |
| Dynamic Themes | 主题 token、浅色/深色模式 | Alpha |
| Layout Options | right、left、horizontal、vertical、compact | Alpha/Beta |
| Node Shapes | 圆角矩形、胶囊、云朵、线条等 | Beta |
| Style & Inspector | 内置检查器组件，也允许宿主替换 | Beta |
| Secure and Private | 默认纯本地运行，不上传数据 | Alpha |
| Multilingual Support | UI 文案 i18n 字典接口 | Beta |
| Accessibility | 键盘导航、ARIA、对比度要求 | Alpha/Beta |
| Made for Apple | 不提供平台专属承诺；优先保证 Web 标准和宿主可集成能力 | 不提供 |

## 6. 使用场景

### 6.1 最小集成

开发者安装 React 包，传入初始数据，监听 `onChange`，即可得到完整导图编辑器。

```tsx
import { useState } from 'react';
import { MindMapEditor, createEmptmyocument } from '@my-mind-node/react';

export function App() {
  const [document, setDocument] = useState(() =>
    createEmptmyocument({ title: 'Product Plan' })
  );

  return (
    <MindMapEditor
      value={document}
      onChange={setDocument}
      height="100vh"
    />
  );
}
```

### 6.2 宿主应用接管保存

库本身不自动保存，宿主应用在 `onChange` 中接管保存、同步和权限逻辑。

```tsx
<MindMapEditor
  value={document}
  onChange={(next, meta) => {
    setDocument(next);
    debouncedSave(next, meta.operations);
  }}
/>
```

### 6.3 只读预览

```tsx
<MindMapViewer
  value={document}
  controls={['fullscreen', 'zoom', 'search', 'fitView']}
/>
```

### 6.4 自定义节点渲染

```tsx
<MindMapEditor
  value={document}
  onChange={setDocument}
  renderNode={({ node, selected }) => (
    <CustomTaskNode node={node} active={selected} />
  )}
/>
```

### 6.5 好看好用的体验验收

默认体验必须能让开发者在不写额外 CSS 的情况下截图展示给团队：

- 首屏就是可操作导图，不做营销式落地页；示例页面打开后立即展示样例导图、数据编辑区和预览区。
- 默认主题要有清晰层级、柔和曲线、足够留白、清楚的选中态/hover 态/拖拽态，并同时适配浅色和深色模式。
- 空状态、解析错误、导出失败、Fullscreen API 不可用等状态必须有可读反馈，不能只在控制台报错。
- 常用路径必须顺手：新建节点、编辑标题、拖拽移动、多选节点、成组拖动、节点放大/缩小、折叠分支、搜索定位、进入节点视图、返回面包屑、撤销重做、导出。
- 键盘和鼠标路径都要成立；触控设备至少支持浏览、缩放、选择和基础编辑。
- 视觉上可以参考 MindNode 的轻量、清爽、直接，但不得复制其品牌资产、贴纸、主题命名或平台专属表达。

## 7. 功能需求

功能优先级说明：Must 是 Public Beta 的发布门槛；Should 是 Beta 后优先候选；Could 是需要保留扩展点但不承诺排期。Alpha 交付以里程碑为准，不要求一次完成所有 Must。

### 7.1 包安装与模块导出

| ID | 需求 | 优先级 | 验收标准 |
| --- | --- | --- | --- |
| PKG-001 | 支持通过 npm 安装 | Must | `npm i @my-mind-node/react` 后可在 Vite/Next.js 项目中使用 |
| PKG-002 | 提供 ESM 构建 | Must | 支持现代打包器 tree shaking |
| PKG-003 | 提供 TypeScript 类型 | Must | 不需要额外安装 `@types/*` |
| PKG-004 | 样式可单独引入 | Must | 支持 `import '@my-mind-node/react/styles.css'` |
| PKG-005 | core 不依赖 React | Must | `@my-mind-node/core` 可在非 React 项目使用 |
| PKG-006 | 导入导出能力可拆包 | Should | 不需要导入导出的用户可以不引入 importers/exporters 依赖 |
| PKG-007 | 提供 ESM only 发布产物 | Must | `package.json` exports 不提供 CJS/require 入口 |
| PKG-008 | 使用 MIT license | Must | 发布包和仓库 license 元数据均标记为 MIT |

### 7.2 编辑器组件

| ID | 需求 | 优先级 | 验收标准 |
| --- | --- | --- | --- |
| EDIT-001 | 提供 `MindMapEditor` | Must | 支持受控和非受控模式 |
| EDIT-002 | 提供 `MindMapViewer` | Must | 只读查看模式不暴露编辑入口 |
| EDIT-003 | 支持无限画布缩放和平移 | Must | 鼠标、触控板、触控屏可用 |
| EDIT-004 | 支持节点增删改 | Must | Tab 新建子节点，Enter 新建同级节点 |
| EDIT-005 | 支持拖拽调整层级和顺序 | Must | 拖拽后 `onChange` 返回新文档和操作元信息 |
| EDIT-006 | 支持撤销/重做 | Must | 所有编辑命令都可进入 history |
| EDIT-007 | 支持画布多选节点 | Must | 支持 Shift / Ctrl / Cmd 点击追加或取消选择，支持 Shift + 空白区域拖拽框选；选中态在节点、连线和检查器中保持一致，并通过 `onSelectionChange` 回传 |
| EDIT-008 | 支持移动端基础编辑 | Should | 触控设备可创建、编辑、拖拽、缩放 |
| EDIT-009 | 默认在画布顶部右上角展示视图工具栏 | Must | 工具栏包含主题切换、全屏、缩小、放大和适配视图入口；可通过 `toolbar` / `controls` 配置隐藏、排序或扩展 |
| EDIT-010 | 支持画布全屏查看和编辑 | Must | 点击全屏按钮后编辑器容器进入全屏状态；再次点击或按 Esc 可退出；浏览器不支持 Fullscreen API 时返回结构化错误或由宿主接管 |
| EDIT-011 | 支持通过 `+` / `-` 按钮控制缩放 | Must | 点击放大/缩小按钮按固定步进调整 zoom，受 `minZoom` / `maxZoom` 约束，并保持当前视口中心稳定 |
| EDIT-012 | 支持 Ctrl + 鼠标滚轮缩放 | Must | 按住 Ctrl 滚动鼠标滚轮时缩放画布；缩放中心为当前鼠标所在位置对应的画布坐标，节点不应发生跳动 |
| EDIT-013 | 支持拖动画布移动视口 | Must | 在画布空白区域按住并拖动可平移视口；拖拽节点、框选或连接时不误触发画布平移 |
| EDIT-014 | 支持进入节点视图 | Must | 可通过命令、上下文菜单或配置化右键行为进入局部视图；进入后以该节点为当前视图根节点，突出展示该节点及其子树；不修改文档树结构，且通过视图命令和 `onCommand` 暴露 |
| EDIT-015 | 顶部展示面包屑导航 | Must | 进入节点视图后顶部展示从文档根节点到当前节点的面包屑；点击任意面包屑项可返回对应祖先节点，点击根节点可回到完整导图 |
| EDIT-016 | 支持多选节点成组拖动 | Must | 多选后拖动任一已选节点，所有已选节点按同一画布坐标偏移量一起移动，保持彼此相对位置；拖动过程展示整体拖拽轮廓和每个节点的拖拽态 |
| EDIT-017 | 支持多选节点拖放到目标节点 | Must | 将多选节点拖到另一个节点上时，目标节点展示可放置高亮；释放后将选中节点的顶层节点移动为目标节点的子节点或指定插入位置，禁止移动到自身、后代或根节点非法位置 |
| EDIT-018 | 支持多选批量操作 | Should | 多选后可批量删除、改样式、折叠/展开；批量命令可撤销，并在 `onChange` 中返回操作元信息 |
| EDIT-019 | 支持选中节点后放大/缩小节点 | Must | 点击节点选中后展示节点快捷工具条或检查器控件，用户可对该节点执行放大/缩小；只改变节点自身视觉尺寸，不改变画布 zoom，结果进入 `MindMapDocument` 并可撤销 |

### 7.2.1 画布多选与成组拖动交互

默认交互原则：

- 单击节点会清空旧选择并选中当前节点；Shift / Ctrl / Cmd + 单击节点会追加或取消该节点选择。
- 空白画布拖拽默认用于平移视口；按住 Shift 在空白区域拖拽时进入框选模式，框选范围内的可见节点进入选择集。
- 拖动任一已选节点时，选择集内所有节点进入成组拖动；拖动偏移量以画布坐标计算，不受当前 zoom 影响，节点之间的相对位置必须保持不变。
- 拖到空白区域释放时，只更新选中节点的 `position`，不改变文档树层级；本次拖动作为一次可撤销命令进入 history。
- 拖到另一个节点上释放时，触发结构移动：只移动选择集中的顶层节点，已被选中父节点包含的子节点不重复移动；目标节点不能是任一被移动节点本身或其后代。
- 拖放到目标节点后，移动节点默认作为目标节点的末尾子节点；如果界面提供插入指示线，则可按指示线插入到目标节点子节点的指定位置。
- 成组拖动结束后，选择集保持不变；宿主应用可通过 `onSelectionChange` 和 `onChange` 同步侧栏、检查器和保存逻辑。
- 只读模式允许多选和框选用于查看、定位和侧栏联动，但不允许成组拖动、删除、改样式或结构移动。
- 自动布局不应在拖动过程中抢占用户位置；拖到空白区域产生的手动 `position` 应保留到用户显式触发重新布局。拖放到目标节点后，允许对受影响子树做轻量重排，但不能打散本次选中组的相对顺序。

### 7.2.2 节点局部放大/缩小交互

默认交互原则：

- 单击节点后，节点进入选中态，并在节点附近展示轻量快捷工具条；工具条包含放大、缩小和恢复默认大小入口。
- 放大/缩小只作用于当前选中节点；多选状态下如触发该操作，则作用于全部选中节点，并保持各节点相对比例变化一致。
- 节点放大/缩小是节点样式编辑，不是画布缩放；画布 zoom、视口中心和其它节点尺寸不应被改变。
- 默认缩放范围建议为 `0.6` 到 `2`，默认步进为 `0.1`；达到上下限时按钮置灰或返回结构化错误。
- 节点尺寸变更应写入节点 `style.scale`，通过 `onChange` 返回，并进入 undo/redo history。
- 自动布局应基于节点新尺寸重新计算受影响连线和相邻节点间距，避免放大节点后文本、节点和连线明显重叠。
- 只读模式可以展示节点当前大小，但不展示会修改节点尺寸的控件。

### 7.3 大纲视图

| ID | 需求 | 优先级 | 验收标准 |
| --- | --- | --- | --- |
| OUT-001 | 提供 `OutlineEditor` | Must | 可单独使用，也可和画布联动 |
| OUT-002 | 导图与大纲数据双向同步 | Must | 任一视图编辑后另一视图立即反映 |
| OUT-003 | 支持缩进调整层级 | Must | Tab/Shift+Tab 改变节点层级 |
| OUT-004 | 支持大纲拖拽排序 | Should | 排序结果和画布结构一致 |

### 7.4 节点能力

| ID | 需求 | 优先级 | 验收标准 |
| --- | --- | --- | --- |
| NODE-001 | 节点支持标题 | Must | 支持中文、英文、Emoji、换行和长文本 |
| NODE-002 | 节点支持备注 | Must | 备注可通过内置详情面板或自定义面板编辑 |
| NODE-003 | 节点支持链接 | Must | URL 点击行为可由宿主拦截 |
| NODE-004 | 节点支持标签 | Must | 可增删标签，并按标签高亮 |
| NODE-005 | 节点支持任务字段 | Must | 支持 todo/doing/done、优先级、截止日期 |
| NODE-006 | 节点支持图片 | Should | 图片源、上传、删除由宿主回调控制 |
| NODE-007 | 节点支持图标/Emoji | Should | 内置基础图标，允许传入自定义图标集 |

### 7.5 结构能力

| ID | 需求 | 优先级 | 验收标准 |
| --- | --- | --- | --- |
| STR-001 | 支持折叠/展开分支 | Must | 折叠状态进入文档数据，可持久化 |
| STR-002 | 支持聚焦模式 | Must | 聚焦节点及路径，弱化其他节点；进入节点视图时可仅展示当前节点子树并保留返回路径 |
| STR-003 | 支持搜索 | Must | 搜索标题、备注、标签，结果可定位 |
| STR-004 | 支持非层级连接线 | Must | 任意两个节点可建立连接并可添加标签 |
| STR-005 | 支持跨文档链接字段 | Should | 库保存链接数据，跳转逻辑由宿主实现 |

### 7.6 样式与主题

| ID | 需求 | 优先级 | 验收标准 |
| --- | --- | --- | --- |
| STYLE-001 | 提供默认主题 | Must | 引入样式后无需配置即可美观可用 |
| STYLE-002 | 支持浅色/深色模式 | Must | 可跟随系统或由 prop 控制 |
| STYLE-003 | 支持主题 token | Must | 颜色、字体、间距、阴影、线条可配置 |
| STYLE-004 | 支持布局方向 | Must | 支持 right、left、horizontal、vertical、compact |
| STYLE-005 | 支持节点形状 | Should | 支持 rounded、pill、line、cloud、hexagon |
| STYLE-006 | 支持检查器组件 | Must | 内置样式检查器，也允许宿主隐藏或替换 |
| STYLE-007 | 支持右上角主题切换侧边栏 | Must | 点击右上角主题按钮后，从右侧滑出主题侧边栏；侧边栏展示可用主题列表和预览色，点击任一主题立即切换画布主题，并通过受控状态或回调通知宿主 |

### 7.6.1 主题切换交互

默认交互原则：

- `MindMapEditor` 顶部右上角工具栏默认包含主题按钮；按钮使用图标入口并提供可访问名称。
- 点击主题按钮后，右侧滑出主题侧边栏；再次点击按钮、点击关闭按钮或按 Esc 可关闭侧边栏。
- 主题侧边栏以列表展示内置主题和宿主传入的自定义主题，每个列表项展示主题名称、浅色/深色标识和关键预览色。
- 点击主题列表项后立即应用主题到当前画布；选中项需要有清楚的 selected 状态。
- 在非受控编辑器中，主题切换应更新 `MindMapDocument.theme` 并通过 `onChange` 返回；在受控模式中，应通过 `onThemeChange` 通知宿主更新 `theme` 或 `value.theme`。
- 只读 `MindMapViewer` 可展示主题切换侧边栏用于本地查看偏好，但不得修改传入的 `MindMapDocument`。

### 7.7 导入导出

| ID | 需求 | 优先级 | 验收标准 |
| --- | --- | --- | --- |
| IO-001 | 导入 Markdown | Must | 根据标题、缩进、列表解析节点层级 |
| IO-002 | 导入 OPML | Must | 保留层级和文本 |
| IO-003 | 导入缩进文本 | Must | 根据每行缩进层级生成节点，支持空格或 Tab 缩进 |
| IO-004 | 导入/导出 JSON | Must | JSON 为库的稳定交换格式 |
| IO-005 | 导出 PNG | Must | 导出当前视图或完整导图；PNG 导出依赖浏览器 Canvas API，仅在客户端环境可用 |
| IO-006 | 导出 SVG | Must | 保持矢量可缩放；SVG 导出基于 DOM 序列化，仅在客户端环境可用 |
| IO-007 | 导出 Markdown | Must | 保留层级、任务状态、链接和备注 |
| IO-008 | 导出 OPML | Must | 可被常见大纲工具读取 |
| IO-009 | 导出缩进文本 | Must | 每行一个节点，使用缩进表达父子层级，可被再次导入 |

### 7.8 插件与扩展

| ID | 需求 | 优先级 | 验收标准 |
| --- | --- | --- | --- |
| EXT-001 | 支持自定义工具栏 | Must | 宿主可隐藏内置按钮或添加业务按钮 |
| EXT-002 | 支持自定义右键菜单 | Must | 菜单项可基于选择状态动态生成 |
| EXT-003 | 支持自定义快捷键 | Must | 宿主可注册、覆盖或禁用快捷键 |
| EXT-004 | 支持自定义节点渲染 | Must | 节点组件可替换，仍保留选择和拖拽能力 |
| EXT-005 | 支持命令插件 | Should | 插件可注册命令、菜单、快捷键和面板 |
| EXT-006 | 支持 AI provider | Could | 宿主提供异步函数，库只负责 UI 和结果应用；Public Beta 仅保留类型扩展空间，不承诺内置 AI UI |
| EXT-007 | 支持协作 adapter | Could | 宿主接入 Yjs/Automerge/WebSocket 等方案 |

### 7.9 示例页面与部署

| ID | 需求 | 优先级 | 验收标准 |
| --- | --- | --- | --- |
| DEMO-001 | 提供在线示例页面 | Must | 示例页面可在浏览器中直接打开，无需后端服务，能展示 `MindMapEditor` / `MindMapViewer` 的核心能力 |
| DEMO-002 | 示例页面提供数据编辑区和预览区 | Must | 桌面端默认左侧为数据编辑区，右侧为导图预览区；编辑数据后预览区实时更新，并对解析错误给出可读提示 |
| DEMO-003 | 示例页面支持视图切换 | Must | 支持在“编辑 + 预览”、“仅编辑”、“仅预览”之间切换；窄屏设备默认使用标签或分段控件切换编辑区和预览区 |
| DEMO-004 | 示例页面内置可运行样例数据 | Must | 页面首次打开即加载一份示例导图数据，用户可修改、重置，并验证导入导出、缩放、全屏、进入节点和面包屑能力 |
| DEMO-005 | 示例页面可部署到 GitHub Pages | Must | 提供静态构建产物和部署命令，可发布到 GitHub Pages，例如 `https://my-mind-node.github.io`，并支持后续配置自定义域名 |

## 8. 公开 API 草案

公开 API 必须少而清晰。Alpha 阶段允许带迁移说明地调整 API；Public Beta 后进入 semver 保护范围。新增能力优先通过可选字段、插件和 adapter 扩展，不轻易改变已有字段含义。

### 8.1 核心类型

```ts
export type NodeId = string & { readonly __brand: 'NodeId' };
export type DocumentId = string & { readonly __brand: 'DocumentId' };
export type ConnectionId = string & { readonly __brand: 'ConnectionId' };
export type TagId = string & { readonly __brand: 'TagId' };
export type MindMapSchemaVersion = 1;

export interface MindMapDocument {
  schemaVersion: MindMapSchemaVersion;
  id: DocumentId;
  title: string;
  rootId: NodeId;
  nodes: Record<NodeId, MindMapNode>;
  connections?: MindMapConnection[];
  tags?: Record<TagId, MindMapTag>;
  theme?: ThemeConfig;
  layout?: LayoutConfig;
  revision?: number;
  metadata?: Record<string, unknown>;
}

export interface MindMapNode {
  id: NodeId;
  parentId?: NodeId;
  children: NodeId[];
  title: string;
  note?: string;
  links?: NodeLink[];
  tagIds?: TagId[];
  task?: NodeTask;
  icon?: string;
  image?: NodeImage;
  collapsed?: boolean;
  position?: Point;
  style?: NodeStyle;
  metadata?: Record<string, unknown>;
}

/** 节点样式——具体的 token 字段在 M2 主题系统实现时细化 */
export interface NodeStyle {
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
  fontSize?: number;
  fontWeight?: string;
  scale?: number;
  shape?: 'rounded' | 'pill' | 'line' | 'cloud' | 'hexagon';
  padding?: number | [number, number];
  borderRadius?: number;
  opacity?: number;
  [key: string]: unknown;
}

/** 连接线样式 */
export interface ConnectionStyle {
  color?: string;
  width?: number;
  strokeDasharray?: string;
  opacity?: number;
  [key: string]: unknown;
}

export interface MindMapConnection {
  id: ConnectionId;
  sourceId: NodeId;
  targetId: NodeId;
  label?: string;
  style?: ConnectionStyle;
}

export interface MindMapTag {
  id: TagId;
  label: string;
  color?: string;
}

export interface NodeLink {
  type: 'url' | 'document';
  href: string;
  title?: string;
  documentId?: DocumentId;
  nodeId?: NodeId;
  metadata?: Record<string, unknown>;
}

export interface NodeTask {
  status: 'todo' | 'doing' | 'done';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
}

export interface NodeImage {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  metadata?: Record<string, unknown>;
}

export interface Point {
  x: number;
  y: number;
}

export type MindMapNodePatch = Partial<
  Omit<MindMapNode, 'id' | 'parentId' | 'children'>
>;
```

数据模型约束：

- `schemaVersion` 表示 JSON 交换格式版本；`revision` 仅用于宿主应用做乐观更新或本地版本标记。
- `rootId` 必须指向一个存在的节点；根节点没有 `parentId`，非根节点必须有有效 `parentId`。
- `children` 数组定义同级节点顺序；`node.move` 必须拒绝会产生循环引用的移动，`node.delete` 必须拒绝删除根节点。
- `node.translate` 只更新节点 `position`，用于画布上的单节点或多节点成组位置调整；同一次成组拖动应生成一个可撤销操作。
- `node.moveMany` 用于把多个节点移动到同一目标父节点下；命令执行前必须去重选择集中的后代节点，并拒绝根节点移动、自身移动和后代目标移动。
- `node.delete` 默认级联删除子节点；如果需要在删除前保留或迁移子树，宿主应先调用 `node.move` 再删除。
- `tagIds` 引用文档级 `tags`；未知标签 ID 应在校验阶段报错或被导入器显式忽略。
- `connections` 中的 `sourceId` 和 `targetId` 必须指向已存在的节点；删除节点时必须同步清理关联的 connection。
- `links` 同时表达 URL 和跨文档链接；点击、跳转和安全校验由宿主应用处理。

### 8.2 React 组件 API

```ts
export interface MindMapEditorProps {
  value?: MindMapDocument;
  defaultValue?: MindMapDocument;
  readonly?: boolean;
  height?: number | string;
  theme?: ThemeConfig | ThemeName;
  locale?: LocaleConfig;
  plugins?: MindMapPlugin[];
  toolbar?: ToolbarConfig | false;
  breadcrumbs?: BreadcrumbConfig | false;
  viewport?: ViewportConfig;
  themePanel?: ThemePanelConfig | false;
  nodeSizing?: NodeSizingConfig | false;
  selection?: SelectionConfig;
  nodeRightClickAction?: NodeRightClickAction;
  inspector?: InspectorConfig | false;
  shortcuts?: ShortcutConfig;
  aiProvider?: MindMapAIProvider;
  imageProvider?: NodeImageProvider;
  collaboration?: CollaborationAdapter;
  renderNode?: RenderNode;
  onChange?: (document: MindMapDocument, meta: ChangeMeta) => void;
  onThemeChange?: (
    theme: ThemeConfig | ThemeName,
    context: ThemeChangeContext
  ) => void;
  onSelectionChange?: (selection: SelectionState) => void;
  onViewRootChange?: (
    nodeId: NodeId,
    breadcrumbs: BreadcrumbItem[]
  ) => void;
  onOpenLink?: (
    link: NodeLink,
    context: LinkOpenContext
  ) => void | boolean | Promise<void | boolean>;
  onCommand?: (command: MindMapCommand, result: CommandResult) => void;
  onError?: (error: MindMapError) => void;
}

export interface MindMapViewerProps {
  value: MindMapDocument;
  height?: number | string;
  theme?: ThemeConfig | ThemeName;
  locale?: LocaleConfig;
  renderNode?: RenderNode;
  controls?: ViewToolbarControl[] | false;
  breadcrumbs?: BreadcrumbConfig | false;
  viewport?: ViewportConfig;
  themePanel?: ThemePanelConfig | false;
  selection?: SelectionConfig;
  nodeRightClickAction?: NodeRightClickAction;
  onThemeChange?: (
    theme: ThemeConfig | ThemeName,
    context: ThemeChangeContext
  ) => void;
  onViewRootChange?: (
    nodeId: NodeId,
    breadcrumbs: BreadcrumbItem[]
  ) => void;
  onSelectionChange?: (selection: SelectionState) => void;
  onOpenLink?: (
    link: NodeLink,
    context: LinkOpenContext
  ) => void | boolean | Promise<void | boolean>;
  onError?: (error: MindMapError) => void;
}

export type ViewToolbarControl =
  | 'theme'
  | 'fullscreen'
  | 'zoom'
  | 'zoomOut'
  | 'zoomIn'
  | 'fitView'
  | 'search'
  | 'export';

export interface ToolbarConfig {
  placement?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  controls?: ViewToolbarControl[];
}

export interface ThemePanelConfig {
  placement?: 'right' | 'left';
  themes?: ThemePreset[];
  defaultOpen?: boolean;
  showSystemMode?: boolean;
}

export interface ThemePreset {
  name: ThemeName;
  label: string;
  mode?: 'light' | 'dark' | 'system';
  previewColors?: string[];
  theme?: ThemeConfig;
}

export interface ThemeChangeContext {
  document: MindMapDocument;
  source: 'toolbar' | 'command' | 'api';
  isReadonly: boolean;
}

export interface BreadcrumbConfig {
  placement?: 'top-left' | 'top-center';
  maxItems?: number;
}

export interface BreadcrumbItem {
  nodeId: NodeId;
  title: string;
  depth: number;
}

export type NodeRightClickAction = 'enterNode' | 'contextMenu' | false;

export interface ViewportConfig {
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
  ctrlWheelZoom?: boolean;
  panOnDrag?: boolean;
}

export interface SelectionConfig {
  multiSelect?: boolean;
  boxSelect?: boolean;
  dragSelectedNodes?: boolean;
  reparentOnNodeDrop?: boolean;
}

export interface NodeSizingConfig {
  minScale?: number;
  maxScale?: number;
  scaleStep?: number;
  showQuickControls?: boolean;
}

export interface LinkOpenContext {
  document: MindMapDocument;
  nodeId: NodeId;
  isReadonly: boolean;
}
```

`MindMapEditor` 默认在画布顶部右上角展示内置工具栏。`ViewToolbarControl` 中的 `theme` 表示展示主题切换按钮，点击后打开主题侧边栏；`zoom` 表示同时展示 `zoomOut` 和 `zoomIn` 两个按钮；如果宿主需要更细控制，可显式传入 `zoomOut` / `zoomIn`。`ViewportConfig.ctrlWheelZoom` 默认启用，并要求 Ctrl + 鼠标滚轮以当前鼠标位置为中心缩放。`ViewportConfig.panOnDrag` 默认启用，并要求空白画布拖拽时移动视口。

`ThemePanelConfig` 用于配置主题切换侧边栏。默认 `placement` 为 `right`，默认主题列表包含库内置浅色、深色和系统跟随主题；宿主可以通过 `themes` 替换或追加主题。编辑器非受控模式下点击主题项会更新 `MindMapDocument.theme` 并触发 `onChange`；受控模式下必须触发 `onThemeChange`，由宿主决定是否更新 `theme` prop 或 `value.theme`。Viewer 中的主题切换只改变本地显示状态，不修改传入文档。

`NodeSizingConfig` 用于配置节点局部放大/缩小能力。默认 `minScale` 为 `0.6`，`maxScale` 为 `2`，`scaleStep` 为 `0.1`，`showQuickControls` 启用。点击节点后展示的快捷工具条应优先使用图标按钮，按钮需要可访问名称，并与画布缩放工具在视觉上区分。

`SelectionConfig.multiSelect`、`boxSelect` 和 `dragSelectedNodes` 在 `MindMapEditor` 中默认启用；`boxSelect` 默认通过 Shift + 空白拖拽触发，以避免和空白画布拖拽平移冲突。`reparentOnNodeDrop` 在编辑器中默认启用：多选节点拖放到另一个节点上时执行结构移动。`MindMapViewer` 可复用多选和框选用于只读联动，但必须忽略会修改文档的拖拽和 reparent 行为。

`MindMapEditor` 和 `MindMapViewer` 默认在顶部展示面包屑导航，并默认将节点右击行为设为 `contextMenu`。默认上下文菜单需要提供“进入节点”入口；进入节点视图时，只改变当前视图根节点，不修改 `MindMapDocument`。若宿主需要更快的导航交互，可将 `nodeRightClickAction` 设置为 `enterNode`，右击节点后直接进入局部视图。

`MindMapViewer` 复用只读渲染能力，默认隐藏编辑命令、检查器和会修改文档的快捷键。Viewer 仍应支持 `theme`、`locale`、`renderNode`、`onOpenLink`、`onSelectionChange`、搜索、缩放、全屏、进入节点、面包屑和导出相关配置。`onSelectionChange` 用于宿主应用在只读模式下做侧栏联动、详情面板联动等场景。

### 8.3 命令 API

```ts
export type ImportFormat = 'json' | 'markdown' | 'opml' | 'indented-text';
export type ExportFormat = ImportFormat | 'png' | 'svg';

export interface MindMapController {
  getDocument(): MindMapDocument;
  getViewRoot(): NodeId;
  getSelection(): SelectionState;
  setTheme(theme: ThemeConfig | ThemeName): CommandResult;
  dispatch(command: MindMapCommand): CommandResult;
  undo(): void;
  redo(): void;
  focusNode(nodeId: NodeId): void;
  enterNode(nodeId: NodeId): void;
  resetViewRoot(): void;
  fitView(options?: FitViewOptions): void;
  zoomIn(options?: ViewportZoomOptions): void;
  zoomOut(options?: ViewportZoomOptions): void;
  setZoom(zoom: number, options?: ViewportZoomOptions): void;
  toggleFullscreen(): Promise<boolean>;
  export(format: ExportFormat, options?: ExportOptions): Promise<Blob | string>;
}

export interface ViewportZoomOptions {
  origin?: Point;
}

export type MindMapCommand =
  | { type: 'node.create'; parentId: NodeId; title?: string; index?: number; id?: NodeId }
  | { type: 'node.update'; nodeId: NodeId; patch: MindMapNodePatch }
  | { type: 'node.delete'; nodeId: NodeId }
  | { type: 'node.move'; nodeId: NodeId; parentId: NodeId; index: number }
  | { type: 'node.moveMany'; nodeIds: NodeId[]; parentId: NodeId; index?: number }
  | { type: 'node.translate'; nodeIds: NodeId[]; delta: Point }
  | { type: 'node.resize'; nodeIds: NodeId[]; scale: number }
  | { type: 'node.toggleCollapse'; nodeId: NodeId }
  | { type: 'tag.create'; label: string; color?: string; id?: TagId }
  | { type: 'tag.update'; tagId: TagId; patch: Partial<Pick<MindMapTag, 'label' | 'color'>> }
  | { type: 'tag.delete'; tagId: TagId }
  | { type: 'connection.create'; sourceId: NodeId; targetId: NodeId; label?: string }
  | { type: 'connection.update'; connectionId: ConnectionId; patch: Partial<Pick<MindMapConnection, 'label' | 'style'>> }
  | { type: 'connection.delete'; connectionId: ConnectionId }
  | { type: 'style.apply'; nodeIds: NodeId[]; style: NodeStyle }
  | { type: 'theme.set'; theme: ThemeConfig | ThemeName }
  | { type: 'selection.set'; nodeIds: NodeId[]; connectionIds?: ConnectionId[] }
  | { type: 'selection.toggleNode'; nodeId: NodeId }
  | { type: 'view.focusNode'; nodeId: NodeId }
  | { type: 'view.enterNode'; nodeId: NodeId }
  | { type: 'view.resetViewRoot' }
  | { type: 'view.fitView' }
  | { type: 'view.zoomIn'; origin?: Point }
  | { type: 'view.zoomOut'; origin?: Point }
  | { type: 'view.setZoom'; zoom: number; origin?: Point }
  | { type: 'view.toggleFullscreen' };
```

`node.create` 的可选 `id` 字段用于协作场景下的幂等创建和 ID 预分配；未传入时由库自动生成。

`node.translate` 用于表达画布上的视觉位置调整，拖动到空白区域时应对所有选中节点应用同一个 `delta`。`node.moveMany` 用于表达拖放到目标节点后的结构移动，命令实现必须只移动选择集中的顶层节点，并保留这些节点在原选择集中的相对顺序。`selection.toggleNode` 用于 Shift / Ctrl / Cmd 点击时追加或取消单个节点选择。

`node.resize` 用于表达节点自身尺寸调整，通常由点击节点后的快捷工具条或检查器触发。命令应写入每个节点的 `style.scale`，默认受 `NodeSizingConfig.minScale`、`maxScale` 和 `scaleStep` 约束；该命令修改文档并必须支持撤销/重做。`node.resize` 不得改变视口 zoom。

`theme.set` 用于表达用户从主题侧边栏或宿主 UI 中切换主题。该命令应在编辑模式下更新 `MindMapDocument.theme` 并进入 history；在只读 Viewer 中只能作为本地视图状态变化，不生成文档操作。

所有会修改文档的命令必须生成可撤销的 `MindMapOperation`。视图命令可以不进入文档 history，但必须通过 `onCommand` 暴露执行结果。`view.enterNode` 与 `view.resetViewRoot` 只改变当前视图根节点和面包屑状态，不修改文档树结构。`view.zoom*` 命令的 `origin` 表示相对编辑器容器的屏幕坐标；未传入时使用当前视口中心，Ctrl + 鼠标滚轮触发时必须传入当前鼠标位置。

### 8.4 AI Provider API

```ts
export interface MindMapAIProvider {
  brainstorm(input: BrainstormInput): Promise<BrainstormResult>;
  expandNode?(input: ExpandNodeInput): Promise<ExpandNodeResult>;
  summarize?(input: SummarizeInput): Promise<SummarizeResult>;
  generateText?(input: GenerateTextInput): Promise<GenerateTextResult>;
}
```

原则：库不保存 API key，不直接上传数据。宿主应用决定是否调用模型、发送哪些上下文、如何展示隐私提示。

### 8.5 协作 Adapter API

```ts
export interface CollaborationAdapter {
  connect(document: MindMapDocument): Promise<void>;
  disconnect(): Promise<void>;
  send(operations: MindMapOperation[]): void;
  subscribe(listener: (operations: MindMapOperation[]) => void): () => void;
  getPresence?(): PresenceState[];
}
```

原则：库只定义操作流和 presence 显示接口，不提供协作服务器。

### 8.6 变更元信息与操作流

```ts
export interface ChangeMeta {
  operations: MindMapOperation[];
  source: 'user' | 'command' | 'import' | 'history' | 'collaboration';
  timestamp: number;
}

export interface MindMapOperation {
  id: string;
  commandType: MindMapCommand['type'];
  inverse?: MindMapCommand;
  patch?: unknown;
  metadata?: Record<string, unknown>;
}
```

原则：`MindMapOperation` 用于本地 history、宿主保存和协作 adapter。具体 patch 结构可在 M1 中细化，但必须可序列化、可测试，并能支持撤销/重做。

### 8.6.1 工厂函数与辅助类型

以下函数和类型在示例代码中使用，必须在对应包的公开 API 中定义：

```ts
/** 创建空文档，自动生成 id 和 rootId */
export function createEmptmyocument(options?: {
  title?: string;
  rootTitle?: string;
  theme?: ThemeConfig | ThemeName;
  layout?: LayoutConfig;
}): MindMapDocument;

/** 从 JSON 字符串安全解析文档，返回结构化错误或文档 */
export function parseDocument(json: string): ParseResult<MindMapDocument>;

/** 文档校验结果 */
export interface ParseResult<T> {
  ok: boolean;
  data?: T;
  errors?: MindMapError[];
}

/** 自定义节点渲染函数签名 */
export type RenderNode = (props: RenderNodeProps) => React.ReactNode;

export interface RenderNodeProps {
  node: MindMapNode;
  selected: boolean;
  dragging: boolean;
  readonly: boolean;
}

/** 适配视图选项 */
export interface FitViewOptions {
  padding?: number;
  duration?: number;
  includeHiddenNodes?: boolean;
}

/** 导出选项 */
export interface ExportOptions {
  /** PNG/SVG: 是否导出完整导图而非当前视图 */
  fullDocument?: boolean;
  /** PNG: 像素倍率，默认 2 */
  pixelRatio?: number;
  /** PNG/SVG: 背景色覆盖主题默认值 */
  backgroundColor?: string;
  /** Markdown/OPML/IndentedText: 是否包含备注、标签等元信息 */
  includeMetadata?: boolean;
}

/** 结构化错误 */
export interface MindMapError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/** 错误码枚举——在里程碑实现时扩展完整列表 */
export type MindMapErrorCode =
  | 'INVALID_DOCUMENT'
  | 'NODE_NOT_FOUND'
  | 'CIRCULAR_REFERENCE'
  | 'ROOT_DELETE_FORBIDDEN'
  | 'CONNECTION_INVALID'
  | 'IMPORT_PARSE_FAILED'
  | 'EXPORT_FAILED'
  | 'LAYOUT_TIMEOUT'
  | 'LAYOUT_WORKER_ERROR'
  | 'FULLSCREEN_NOT_SUPPORTED'
  | 'DROP_TARGET_INVALID'
  | 'MULTI_MOVE_INVALID'
  | 'NODE_SCALE_OUT_OF_RANGE';

/** 选择状态 */
export interface SelectionState {
  nodeIds: NodeId[];
  connectionIds: ConnectionId[];
  primaryNodeId?: NodeId;
  mode?: 'single' | 'multiple';
}

/** 命令执行结果 */
export interface CommandResult {
  success: boolean;
  document?: MindMapDocument;
  operations?: MindMapOperation[];
  error?: MindMapError;
}
```

以下类型为前向引用，在对应里程碑实现时完善字段定义：

- `ThemeConfig` / `ThemeName` —— M2 主题系统实现时定义。
- `LayoutConfig` —— M1 布局适配实现时定义。
- `LocaleConfig` —— M2 i18n 实现时定义。
- `MindMapPlugin` —— M2 插件系统实现时定义。
- `ShortcutConfig` —— M2 快捷键系统实现时定义。
- `InspectorConfig` —— M2 检查器实现时定义。
- `MindMapAIProvider` 完整入参/出参类型 —— Beta 后按需定义。
- `CollaborationAdapter` presence 类型 —— Beta 后按需定义。

### 8.7 图片 Provider API

```ts
export interface NodeImageProvider {
  upload?(file: File, context: NodeImageContext): Promise<NodeImage>;
  remove?(image: NodeImage, context: NodeImageContext): Promise<void>;
  transform?(
    image: NodeImage,
    action: 'removeBackground' | 'resize' | string,
    context: NodeImageContext
  ): Promise<NodeImage>;
}

export interface NodeImageContext {
  document: MindMapDocument;
  nodeId: NodeId;
  signal?: AbortSignal;
}
```

原则：库只负责选择文件、渲染图片和应用返回结果；存储、上传、压缩、鉴权和 AI 图片处理都由宿主 provider 决定。

### 8.8 缩进文本数据格式

缩进文本（Indented Text）是库支持的轻量导入导出格式。它适合 AI 生成结果、剪贴板粘贴、普通文本编辑器和宿主应用快速构造导图。

```text
Product Plan
  Research
    Customer interviews
    Competitor review
  Build
    Core package
    React adapter
  Launch
    Documentation
    Beta release
```

```ts
export interface IndentedTextOptions {
  indentSize?: number;
  allowTabs?: boolean;
  stripBullets?: boolean;
}
```

格式规则：

- 每个非空行表示一个节点，首个有效行作为根节点；如果输入包含多个顶层行，导入器应创建一个默认根节点并把这些行作为子节点。
- 缩进层级表示父子关系；默认 2 个空格为一级缩进，Tab 视为一级缩进，并允许通过导入选项覆盖 `indentSize`。
- 同一文档内不允许混用不一致的缩进宽度；解析失败时返回结构化错误，而不是静默生成错误层级。
- 行首项目符号 `-`、`*`、`+` 可被兼容性移除，但导出缩进文本时默认不输出项目符号。
- 缩进文本只保留节点标题和层级；备注、标签、任务、链接、样式、图片等富信息应使用 JSON、Markdown 或 OPML 格式。

## 9. 技术栈建议

当前仓库尚未初始化代码。技术方向如下：

- Language: TypeScript
- Package manager: pnpm
- Monorepo: pnpm workspaces
- Build: tsup 或 rollup
- UI framework adapter: React only
- Editor foundation: React Flow
- Auto layout: ELK.js，首发固定依赖，默认通过 Web Worker 执行
- Edge rendering: 自定义贝塞尔曲线 Edge，基于 React Flow custom edge 扩展
- Module format: ESM only
- License: MIT
- Rendering model: React Flow 负责画布、节点、边、缩放、单选/多选、框选和成组拖动；`@my-mind-node/core` 只负责数据模型、命令、布局输入输出和序列化，不直接依赖 React Flow
- Tests: Vitest、Testing Library、Playwright
- Docs: VitePress 或 Storybook
- Example hosting: GitHub Pages，默认目标为静态站点部署
- Release: Changesets

### 9.1 React Flow 集成原则

- `@my-mind-node/react` 封装 React Flow，不把 React Flow 的内部状态直接暴露为主数据模型。
- 对外稳定数据格式仍是 `MindMapDocument`，React Flow 的 `nodes` / `edges` 只作为渲染适配层。
- 自定义节点组件必须兼容 React Flow 的拖拽、选择、连接和 viewport 行为。
- 多选、框选和成组拖动可以复用 React Flow selection 能力，但对外必须转换为稳定的 `SelectionState`、`node.translate` 和 `node.moveMany` 命令。
- 自定义贝塞尔曲线 Edge 需要支持主题 token、选中态、hover 态、连接标签和可访问点击区域。
- 宿主应用可以通过插件覆盖 edge renderer，但默认导图关系线应保持 MindNode 类产品的柔和曲线观感。

### 9.2 ELK.js 布局原则

- ELK.js 只作为自动布局引擎，不作为公开 API 的直接数据结构。
- 布局输入由 `MindMapDocument` 转换为 ELK graph，布局输出再转换为节点 `position`。
- 支持 right、left、horizontal、vertical、compact 等布局模式时，应优先通过 ELK 参数和轻量后处理实现。
- 自动布局必须默认在 Web Worker 中执行，并支持取消、超时或防抖，避免大型导图频繁编辑时阻塞主线程。
- 若 500+ 节点布局出现明显卡顿，应优先优化 worker 消息体、子树缓存和增量布局策略。

## 10. 建议包结构

```text
packages/
  core/              # 数据模型、命令、历史、布局适配、选择、序列化
  react/             # React Flow 封装、Editor/Viewer/Outline 组件
  importers/         # Markdown、OPML、Indented Text、JSON 导入
  exporters/         # PNG、SVG、Markdown、OPML、Indented Text、JSON 导出
  themes/            # 内置主题和 token
  plugins/           # 可选官方插件
  devtools/          # 调试工具，非 Public Beta
apps/
  docs/              # 文档站点
  playground/        # 本地开发和手动 QA
  example/           # 在线示例页面：左侧数据编辑，右侧导图预览，可部署到 GitHub Pages
  examples/          # Vite、Next.js、readonly、custom-node 示例
tests/
  fixtures/          # 大文档、导入导出样例
  e2e/               # 浏览器端测试
```

## 11. 预期命令

```bash
pnpm install
pnpm dev
pnpm build
pnpm test
pnpm test:e2e
pnpm lint
pnpm typecheck
pnpm example:dev
pnpm example:build
pnpm example:deploy
pnpm changeset
```

## 12. 非功能需求

### 12.1 默认快捷键

以下为内置默认快捷键，宿主可通过 `ShortcutConfig` 注册、覆盖或禁用：

| 快捷键 | 行为 | 对应命令 |
| --- | --- | --- |
| `Tab` | 新建子节点 | `node.create` |
| `Enter` | 新建同级节点 | `node.create`（index 为当前节点 index + 1） |
| `Delete` / `Backspace` | 删除选中节点 | `node.delete` |
| `F2` | 进入节点标题编辑 | — (UI 状态) |
| `Space` | 折叠/展开选中节点 | `node.toggleCollapse` |
| `Ctrl/Cmd + Z` | 撤销 | `undo()` |
| `Ctrl/Cmd + Shift + Z` | 重做 | `redo()` |
| `Ctrl/Cmd + A` | 全选当前视图节点 | `selection.set` |
| `Ctrl/Cmd + F` | 打开搜索面板 | — (UI 状态) |
| `Esc` | 退出编辑/全屏/搜索 | — (UI 状态) |

### 12.1.1 鼠标与触控板选择交互

| 交互 | 行为 | 对应命令 |
| --- | --- | --- |
| 单击节点 | 选中单个节点，清空旧选择 | `selection.set` |
| Shift / Ctrl / Cmd + 单击节点 | 追加或取消选择单个节点 | `selection.toggleNode` |
| Shift + 空白区域拖拽 | 框选可见节点 | `selection.set` |
| 拖动已选节点到空白区域 | 选中节点整体平移，保持相对位置 | `node.translate` |
| 拖动已选节点到另一个节点 | 将选中顶层节点移动为目标节点子节点或插入到指示位置 | `node.moveMany` |

### 12.2 性能

- 100 个节点以内：编辑、拖拽、折叠、搜索体感即时。
- 500 个节点以内：搜索 P95 < 300ms，画布操作无明显卡顿。
- 1000 个节点以内：缩放和平移可用，避免超过 100ms 的长任务频繁出现。
- 50 个节点以内的多选成组拖动应保持无明显卡顿；拖动过程中不得频繁触发全量自动布局。
- 初始渲染 100 节点导图 P95 < 1s。
- 核心包 gzip 后目标 < 80KB，React 包 gzip 后目标 < 160KB（含 React Flow 依赖，React Flow 自身 gzip 约 80–100KB，库自有代码目标 < 60KB），不含 importers/exporters 可选包。

### 12.3 可用性

- 默认组件可直接使用，不要求宿主实现工具栏。
- 所有编辑操作都有命令 API，可被宿主 UI 调用。
- 所有破坏性操作可撤销。
- 错误通过 `onError` 和结构化错误对象暴露，不只 `console.error`。

### 12.4 可访问性

- 支持键盘导航、节点选择和基础编辑。
- 按钮、菜单、节点交互区域提供 ARIA 标签。
- 默认主题主要文本对比度满足 WCAG AA。
- 颜色不作为标签、任务状态的唯一表达。

### 12.5 安全与隐私

- 默认不发起任何网络请求。
- 默认不读取 cookie、localStorage 或宿主应用认证信息。
- 导入内容按不可信输入处理，渲染文本必须避免 XSS。
- URL 点击需可由宿主拦截和校验。
- AI、图片上传、协作同步都必须由宿主显式配置 provider/adapter。

### 12.6 兼容性

- 支持 Vite、Next.js、Webpack 5。
- 支持 React 18+。
- 产物采用 ESM only，不提供 CJS 入口。
- 支持服务端渲染场景下安全 import，浏览器 API 延迟到客户端执行。

## 13. 测试策略

- Core 单元测试：数据模型、命令、撤销/重做、布局、序列化。
- Layout Worker 测试：ELK.js worker 的取消、防抖、超时、异常回传和大图 fixture。
- Import/Export 测试：Markdown、OPML、缩进文本、JSON 往返测试和异常输入测试。
- React 组件测试：编辑、单选/多选、框选、成组拖动、节点局部放大/缩小、快捷键、顶部右上角工具栏、主题切换侧边栏、顶部面包屑、只读模式。
- E2E 测试：真实浏览器中的节点拖拽、多选节点成组拖动、拖放到另一个节点、点击节点后使用快捷工具条放大/缩小节点、画布拖拽平移、`+` / `-` 缩放、Ctrl + 鼠标滚轮按鼠标位置缩放、右上角主题按钮打开侧边栏并切换主题、全屏切换、上下文菜单进入节点视图、点击面包屑返回祖先节点、文本编辑、导出。
- 示例页面测试：数据编辑区修改后预览实时更新，编辑/预览切换可用，解析错误可见，静态构建产物可部署。
- 性能基准：100/500/1000 节点 fixture 的渲染、搜索、拖拽、导出耗时。
- 类型测试：公开 API 的 TypeScript 类型示例必须可编译。
- Bundle 测试：监控包体积，防止可选依赖进入核心包。

## 14. 里程碑

### M0: 技术原型

- 用 React Flow 完成最小画布原型。
- 用 ELK.js + Web Worker 完成树形自动布局原型。
- 完成自定义贝塞尔曲线 Edge 原型，覆盖默认、hover、selected、label 状态。
- 完成最小 core 数据模型。
- 完成 React 画布原型：创建、编辑、节点拖拽、画布拖拽平移、顶部右上角工具栏、顶部面包屑、`+` / `-` 缩放、Ctrl + 鼠标滚轮按鼠标位置缩放、全屏切换、上下文菜单进入节点视图。
- 退出标准：能用本地 fixture 渲染 100 节点导图，并证明主线程没有被布局长时间阻塞。

### M1: Core Alpha

- 完成 `@my-mind-node/core`。
- 支持文档 schema、校验、命令系统、历史、选择、折叠、基础标签/任务/连接线数据结构。
- 完成 JSON 序列化、缩进文本导入导出和 Web Worker 布局适配。
- 退出标准：核心命令、撤销/重做、序列化和布局转换具备单元测试；core 不依赖 React、React Flow 或 DOM。

### M2: React Alpha

- 发布 `MindMapEditor`、`MindMapViewer`。
- 支持默认主题、右上角主题切换侧边栏、节点局部放大/缩小、工具栏、面包屑、进入节点视图、全屏、缩放控制、只读模式和快捷键。
- 完成 Vite 最小示例，以及左侧数据编辑区、右侧预览区的在线示例页面原型。
- 退出标准：新项目 10 分钟内能完成最小集成，编辑节点后能通过 `onChange` 保存文档。

### M2.5: Product Polish

- 发布 `OutlineEditor`，支持与画布双向同步。
- 完成搜索功能（标题、备注、标签，结果可定位）。
- 完成默认检查器、备注/链接/标签/任务的基础编辑 UI。
- 完善画布多选、框选、成组拖动、拖放到目标节点、批量操作、大纲拖拽排序、空状态、错误状态、移动端基础浏览和触控缩放。
- 退出标准：默认样例无需额外 CSS 即可用于产品演示；核心路径具备浏览器 E2E 覆盖。

### M3: Import/Export Beta

- 支持 Markdown、OPML、缩进文本、JSON 导入。
- 支持 PNG、SVG、Markdown、OPML、缩进文本、JSON 导出。
- 完成 Next.js 示例、只读模式示例、自定义节点示例和 GitHub Pages 在线示例页面。
- 退出标准：导入失败能返回结构化错误；导出在真实浏览器中通过 E2E 验证。

### M4: Public Beta

- 完成文档站点、API reference、示例项目和 GitHub Pages 在线示例页面。
- 完成性能基准和浏览器兼容性测试。
- 完成可访问性检查、bundle 预算检查和公开 API 迁移说明。
- 使用 Changesets 发布 beta 版本。

## 15. 成功标准

### 15.1 Alpha 成功标准

- 新项目安装后 10 分钟内能完成最小集成。
- 文档首页提供可复制运行的 React 示例。
- 编辑节点后，宿主能通过 `onChange` 拿到可保存的 `MindMapDocument`。
- 默认主题无需额外 CSS 即可达到可演示质量。
- 右上角主题按钮可打开侧边栏，点击主题列表项后画布主题立即切换。
- 点击节点后可对该节点放大或缩小，节点尺寸变化可保存、撤销和重做，且不影响画布 zoom。
- `@my-mind-node/core` 不依赖 React。
- 默认不发起网络请求。
- 100 节点测试导图可流畅浏览、编辑、折叠和缩放。
- 每个破坏性编辑命令都可撤销/重做。

### 15.2 Public Beta 成功标准

- 在线示例页面可公开访问，支持左侧数据编辑、右侧实时预览和编辑/预览切换。
- 包名使用 `@my-mind-node/*`，发布格式为 ESM only，license 为 MIT。
- 所有公开 API 都有 TypeScript 类型和说明，并标记稳定/实验状态。
- 1000 节点测试导图仍可浏览、搜索、折叠和缩放。
- 支持在画布上多选节点并成组拖动；拖到空白处能整体调整位置，拖到目标节点能完成结构移动，且两类操作都可撤销。
- 导入导出至少覆盖 Markdown、OPML、缩进文本、JSON、PNG、SVG。
- 缩进文本可导入并导出，且导出结果能再次导入为等价节点层级。
- 默认主题主要文本对比度满足 WCAG AA；颜色不是标签和任务状态的唯一表达。
- Public Beta 试用中，80% 新开发者能在 10 分钟内完成最小集成。

## 16. 边界规则

### Always

- 公开 API 先写类型和文档，再实现。
- 包名使用 `@my-mind-node/*`，发布产物保持 ESM only，license 保持 MIT。
- ELK.js 布局默认在 Web Worker 中执行。
- 所有外部输入导入前必须校验和转义。
- 核心包保持 framework-agnostic。
- 可选重依赖必须拆包，不进入核心路径。
- 所有功能必须有受控模式下的状态回传。

### Ask First

- 改变公开类型字段含义。
- 移除或重命名公开 API。
- 引入新的大型渲染、布局或协作依赖。
- 放宽本 PRD 已确认的首发边界，例如重新引入 PDF、CJS、非 React adapter、Pro 插件或更多导图格式兼容。

### Never

- 在库内硬编码后端地址。
- 在库内保存或上传用户数据。
- 在库内内置第三方 AI API key。
- 把 React 依赖引入 `@my-mind-node/core`。
- 把 Vue/Svelte adapter、CJS、PDF 导出、Pro 插件体系、FreeMind/XMind 兼容纳入首发范围。
- 无迁移说明地发布破坏性变更。

## 17. 风险与对策

| 风险 | 影响 | 对策 |
| --- | --- | --- |
| MindNode 功能面过大 | MVP 失控 | 以编辑器核心、样式、导入导出为首发，协作/AI/provider 后置；PDF、Pro、更多格式兼容不进首发 |
| 默认观感不够精致 | 开发者试用时无法感知“好看好用” | M2 起把默认主题、样例数据、空状态、选中态、hover 态纳入验收，并用截图做设计 QA |
| React Flow 大图性能不足 | 大型导图不可用 | M0 阶段压测 100/500/1000 节点，必要时做节点虚拟化、分层渲染或降级交互 |
| 多选拖拽与自动布局冲突 | 用户刚调整的位置被布局覆盖 | 拖动过程中暂停自动布局，空白释放时保留手动 `position`，拖放到目标节点时只重排受影响子树 |
| ELK.js 布局阻塞主线程 | 编辑时卡顿 | 首发默认在 Web Worker 执行，布局防抖，并缓存稳定子树布局 |
| 自定义 Edge 复杂度过高 | 连线显示、点击和导出不稳定 | 先实现单一贝塞尔曲线策略，保证选中态、标签、导出和测试覆盖 |
| API 设计过早锁死 | 后续扩展困难 | 命令、插件、metadata、provider 设计为扩展点 |
| 包体积过大 | 开发者不愿集成 | 拆分 core/react/importers/exporters，可选依赖延迟引入 |
| 包名或 npm scope 未确认 | 发布前被迫改名，影响文档和示例 | M0 前确认 npm scope 所有权或准备备选包名 |
| SSR 不兼容 | Next.js 用户踩坑 | import 安全，DOM 操作只在客户端生命周期执行 |
| 导入格式复杂 | 兼容性问题多 | 先支持标准 Markdown/OPML，提供解析错误详情；不兼容 FreeMind/XMind 等更多格式 |
| 自定义渲染破坏交互 | 扩展难用 | 自定义节点仍由库管理 selection、drag handle、keyboard focus |
| 右键交互与 Web 习惯冲突 | 用户误触或无法打开业务菜单 | 默认右键打开上下文菜单，菜单提供“进入节点”；通过配置支持右键直接进入 |

## 18. 必须确认项

以下问题不影响继续做 M0 原型，但建议在进入 M1/M2 前确认，否则会影响 API、包名、示例和发布策略。

| 问题 | 推荐选择 | 不确认的风险 |
| --- | --- | --- |
| 产品形态是否只做 library，还是同时做可独立使用的 Web App？ | 首发只做 library，在线示例只承担 demo 和文档作用 | 范围膨胀到账号、文件管理、分享和存储 |
| npm scope `@my-mind-node` 是否已可用并归项目方控制？ | M0 前确认 scope；不可用则尽早换名 | 后期重命名会破坏文档、示例和包引用 |
| 右键默认行为是否接受“上下文菜单优先”？ | 默认上下文菜单，菜单里提供进入节点；需要时可配置右键直接进入 | 直接右键进入会牺牲常见 Web 习惯和业务菜单扩展 |
| Public Beta 是否必须包含 Markdown、OPML、PNG、SVG 全量导入导出？ | Beta 包含；Alpha 只做 JSON 和缩进文本 | 导入导出会显著推迟首个可试用版本 |
| 首发视觉是否需要明确品牌风格？ | 先做中性、清爽、专业的默认主题，不绑定强品牌 | 过早品牌化会降低被宿主产品嵌入的适配性 |
| 目标浏览器是否包含移动 Safari 的编辑体验？ | Beta 保证移动浏览和基础编辑，复杂拖拽可后置 | 移动端交互测试成本可能被低估 |
| 是否需要中文文档作为首发文档？ | 中文 PRD，英文 API 文档和示例优先，中文指南可同步补充 | 如果只做中文文档，会降低 npm 开发者采用面 |
| `themes`、`plugins`、`devtools` 是否作为独立 npm 包首发发布？ | 目录可预留；是否独立发布放到 Beta 前确认 | 太早拆包会增加构建、文档和版本管理成本 |

## 19. 已确认决策

- 包名确定为 `@my-mind-node/*`。
- 首发只提供 React adapter，不提供 Vue/Svelte adapter。
- React Flow 与 ELK.js 作为首发固定依赖。
- ELK.js 布局首发默认放入 Web Worker 执行。
- 不提供 PDF 导出。
- 发布产物采用 ESM only，不提供 CJS。
- license 采用 MIT。
- 不提供 Pro 插件体系或商业功能分层。
- 不兼容 FreeMind、XMind 等更多导图格式。
- 支持缩进文本数据格式（Indented Text）的导入和导出。
- `themes`、`plugins`、`devtools` 目录可随主仓库一起维护，首发不强依赖；是否作为独立 npm 包发布需在 Beta 前确认。
