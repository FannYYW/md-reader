# MD Reader 📖

一个零依赖（CDN 加载）、开箱即用的网页版 **Markdown 阅读器 / 编辑器**。

> 双栏实时预览 · 自动目录 · 代码高亮 · 明暗主题 · 一键导出 HTML / PDF

## ✨ 功能

- 📝 **实时预览**：左侧编辑 Markdown，右侧即时渲染（GFM 语法）
- 📂 **打开本地 .md 文件**：点击按钮或直接 **拖拽** 文件到页面
- 🧭 **自动 TOC**：根据 `h1~h4` 标题生成可点击的侧边栏目录
- 🎨 **代码块语法高亮**：基于 [highlight.js](https://highlightjs.org/)
- 🌙 **明暗主题切换**：跟随系统偏好 + 手动切换 + localStorage 记忆
- ⬇️ **导出 HTML**：生成一个独立、带样式的 `.html` 文件
- 🖨️ **导出 PDF**：基于 html2pdf.js 在浏览器内生成 PDF

## 🚀 使用方式

无需任何构建步骤，直接打开 `index.html` 即可：

```bash
# 方式一：直接双击 index.html

# 方式二：本地起个静态服务器（推荐，避免浏览器对本地文件的限制）
python3 -m http.server 8000
# 然后访问 http://localhost:8000
```

或者部署到 **GitHub Pages**：

1. 进入仓库 `Settings` → `Pages`
2. Source 选择 `main` 分支、`/ (root)` 目录
3. 保存后即可通过 `https://<user>.github.io/md-reader/` 访问

## 🧱 技术栈

| 模块 | 实现 |
| --- | --- |
| Markdown 解析 | [marked](https://github.com/markedjs/marked) v12 |
| 语法高亮 | [highlight.js](https://highlightjs.org/) v11 |
| PDF 导出 | [html2pdf.js](https://github.com/eKoopmans/html2pdf.js) v0.10 |
| 样式 | 原生 CSS（CSS variables 主题方案） |

全部资源通过 CDN 加载，项目本身仅 3 个文件：

```
md-reader/
├── index.html   # 页面结构
├── styles.css   # 样式 / 主题变量
├── app.js       # 渲染 / TOC / 文件 / 导出 / 主题逻辑
└── README.md
```

## ⌨️ 快捷操作

| 操作 | 方式 |
| --- | --- |
| 打开文件 | 点击工具栏 `📂 打开 .md`，或拖拽 `.md` 文件到页面 |
| 切换 TOC | 工具栏 `🧭 目录` |
| 切换主题 | 工具栏 `🌙 / ☀️`（自动记忆） |
| 导出 HTML | 工具栏 `⬇️ 导出 HTML` |
| 导出 PDF | 工具栏 `🖨️ 导出 PDF` |

## 🛠️ 开发

代码结构简单，便于二次开发：

- `app.js` 内 `marked.setOptions` 可调整解析规则
- `styles.css` 顶部的 `:root` / `[data-theme="dark"]` 是主题变量入口
- 想要新增按钮：在 `index.html` 的 `.actions` 中加一个 `<button>`，再到 `app.js` 中绑定事件即可

## 📄 License

MIT
