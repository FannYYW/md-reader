/* MD Reader - 主要逻辑
 * 功能：实时渲染 / 文件打开 / TOC 生成 / 主题切换 / 导出 HTML & PDF
 */

(function () {
  'use strict';

  // ---------- DOM 引用 ----------
  const editor = document.getElementById('editor');
  const preview = document.getElementById('preview');
  const tocEl = document.getElementById('toc');
  const tocPanel = document.getElementById('toc-panel');
  const layout = document.querySelector('.layout');
  const fileInput = document.getElementById('file-input');
  const btnToc = document.getElementById('btn-toc');
  const btnExportHtml = document.getElementById('btn-export-html');
  const btnExportPdf = document.getElementById('btn-export-pdf');
  const btnTheme = document.getElementById('btn-theme');
  const hljsLight = document.getElementById('hljs-light');
  const hljsDark = document.getElementById('hljs-dark');

  // ---------- marked 配置 ----------
  // 自定义 renderer：为标题生成 id（用于 TOC 锚点）
  const renderer = new marked.Renderer();
  const usedSlugs = new Map();
  function slugify(text) {
    const base = text
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[\s]+/g, '-')
      .replace(/[^\p{L}\p{N}\-_]/gu, '')
      .replace(/^-+|-+$/g, '') || 'section';
    const count = usedSlugs.get(base) || 0;
    usedSlugs.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  }
  renderer.heading = function ({ tokens, depth }) {
    const text = this.parser.parseInline(tokens);
    const raw = tokens.map(t => t.raw || t.text || '').join('');
    const id = slugify(raw);
    return `<h${depth} id="${id}">${text}</h${depth}>\n`;
  };

  marked.setOptions({
    renderer,
    gfm: true,
    breaks: false,
    highlight: function (code, lang) {
      try {
        if (lang && hljs.getLanguage(lang)) {
          return hljs.highlight(code, { language: lang }).value;
        }
        return hljs.highlightAuto(code).value;
      } catch (_) {
        return code;
      }
    },
  });

  // ---------- 渲染 ----------
  function render() {
    usedSlugs.clear();
    const src = editor.value;
    const html = marked.parse(src);
    preview.innerHTML = html;
    // 兜底再走一遍 highlight（兼容 marked v12 highlight 选项变动）
    preview.querySelectorAll('pre code').forEach((block) => {
      if (!block.classList.contains('hljs')) {
        try { hljs.highlightElement(block); } catch (_) {}
      }
    });
    buildToc();
  }

  // 防抖
  let renderTimer = null;
  editor.addEventListener('input', () => {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 80);
  });

  // ---------- TOC 生成 ----------
  function buildToc() {
    const headings = preview.querySelectorAll('h1, h2, h3, h4');
    if (headings.length === 0) {
      tocEl.innerHTML = '<p style="color: var(--text-muted); font-size: 13px;">（无标题）</p>';
      return;
    }
    // 构建嵌套结构
    const root = { level: 0, children: [], el: null };
    const stack = [root];
    headings.forEach((h) => {
      const level = Number(h.tagName.substring(1));
      const node = { level, text: h.textContent, id: h.id, children: [] };
      while (stack.length && stack[stack.length - 1].level >= level) {
        stack.pop();
      }
      stack[stack.length - 1].children.push(node);
      stack.push(node);
    });

    function toHtml(node) {
      if (!node.children.length) return '';
      const items = node.children.map((c) => {
        const sub = toHtml(c);
        return `<li><a href="#${c.id}" data-id="${c.id}">${escapeHtml(c.text)}</a>${sub}</li>`;
      }).join('');
      return `<ul>${items}</ul>`;
    }
    tocEl.innerHTML = toHtml(root);

    // 点击平滑滚动
    tocEl.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const id = a.getAttribute('data-id');
        const target = preview.querySelector(`[id="${CSS.escape(id)}"]`);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  // ---------- 文件打开 ----------
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      editor.value = reader.result;
      render();
    };
    reader.readAsText(file, 'utf-8');
    fileInput.value = '';
  });

  // 拖拽打开
  ['dragover', 'drop'].forEach((evt) => {
    window.addEventListener(evt, (e) => {
      e.preventDefault();
    });
  });
  window.addEventListener('drop', (e) => {
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { editor.value = reader.result; render(); };
    reader.readAsText(file, 'utf-8');
  });

  // ---------- TOC 切换 ----------
  btnToc.addEventListener('click', () => {
    layout.classList.toggle('no-toc');
  });

  // ---------- 主题 ----------
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    btnTheme.textContent = theme === 'dark' ? '☀️' : '🌙';
    if (theme === 'dark') {
      hljsLight.disabled = true;
      hljsDark.disabled = false;
    } else {
      hljsLight.disabled = false;
      hljsDark.disabled = true;
    }
    try { localStorage.setItem('md-reader-theme', theme); } catch (_) {}
  }
  btnTheme.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  });
  // 初始主题：localStorage > 系统偏好 > light
  (function initTheme() {
    let theme = 'light';
    try { theme = localStorage.getItem('md-reader-theme') || theme; } catch (_) {}
    if (!localStorage.getItem('md-reader-theme') &&
        window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      theme = 'dark';
    }
    applyTheme(theme);
  })();

  // ---------- 导出 HTML ----------
  btnExportHtml.addEventListener('click', () => {
    const cssLink = 'https://cdn.jsdelivr.net/npm/github-markdown-css@5.5.1/github-markdown-light.css';
    const hljsCss = 'https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github.min.css';
    const title = (editor.value.match(/^#\s+(.+)$/m) || [, 'Markdown'])[1].trim();
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="${cssLink}">
<link rel="stylesheet" href="${hljsCss}">
<style>
  body { box-sizing: border-box; min-width: 200px; max-width: 900px; margin: 0 auto; padding: 32px; }
  pre code.hljs { padding: 14px 16px; border-radius: 6px; display: block; overflow-x: auto; }
</style>
</head>
<body class="markdown-body">
${preview.innerHTML}
</body>
</html>`;
    downloadBlob(html, `${sanitizeFilename(title)}.html`, 'text/html;charset=utf-8');
  });

  // ---------- 导出 PDF ----------
  btnExportPdf.addEventListener('click', () => {
    const title = (editor.value.match(/^#\s+(.+)$/m) || [, 'Markdown'])[1].trim();
    const clone = preview.cloneNode(true);
    // 给 clone 一个白底打印样式，避免暗色主题影响
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'background:#fff;color:#24292f;padding:24px;max-width:800px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Helvetica Neue",Arial,sans-serif;';
    wrapper.appendChild(clone);
    const opt = {
      margin: [10, 12, 10, 12],
      filename: `${sanitizeFilename(title)}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    };
    html2pdf().set(opt).from(wrapper).save();
  });

  function sanitizeFilename(name) {
    return (name || 'document').replace(/[\\/:*?"<>|]/g, '_').slice(0, 80);
  }

  function downloadBlob(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ---------- 初始示例 ----------
  const SAMPLE = `# 欢迎使用 MD Reader 📖

这是一个轻量的 **Markdown 阅读器**，支持实时预览、TOC、主题切换以及导出。

## ✨ 功能特性

- 左右分栏 **实时预览**
- 打开本地 \`.md\` 文件（也支持拖拽）
- 自动生成 **目录（TOC）**
- 代码块语法高亮
- 一键导出 **HTML / PDF**
- 明暗主题切换 🌙 / ☀️

## 🚀 快速开始

1. 在左边编辑区输入 Markdown
2. 右边会实时渲染
3. 通过顶部按钮打开文件或导出

## 💻 代码示例

\`\`\`javascript
function greet(name) {
  console.log(\`Hello, \${name}!\`);
  return { ok: true, name };
}

greet('MD Reader');
\`\`\`

\`\`\`python
def fib(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a

print([fib(i) for i in range(10)])
\`\`\`

## 📊 表格

| 功能 | 状态 |
| ---- | ---- |
| 实时预览 | ✅ |
| TOC | ✅ |
| 导出 PDF | ✅ |
| 暗色模式 | ✅ |

## 引用

> "Talk is cheap. Show me the code."
> — Linus Torvalds

## 链接 & 图片

访问 [GitHub](https://github.com/FannYYW/md-reader) 查看源码。

---

Made with ❤️
`;
  editor.value = SAMPLE;
  render();
})();
