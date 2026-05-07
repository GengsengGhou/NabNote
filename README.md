# NabNote

一款极简的桌面端快速笔记工具，解决"脑子里突然冒出一件事怕忘掉"的场景。

**打开要快、记录要快、找到要快。**

## 功能

- **快速输入** — 打开即自动聚焦，回车即刻保存
- **待办管理** — 第一行作为标题，点击查看全文，支持编辑、完成、删除和置顶
- **实时搜索** — 输入关键词即时过滤
- **Markdown 支持** — 待办和想法均支持基础 Markdown 语法
- **想法卡片** — 第一行作为标题，正文保留预览，支持图文混排编辑和置顶
- **图片插入** — 支持粘贴、拖拽、选择图片插入想法卡片
- **文件夹管理** — 多级文件夹分类，面包屑导航
- **全局快捷键** — `Ctrl+Shift+N`（macOS: `Cmd+Shift+N`）随时唤起或隐藏
- **系统托盘** — 关闭窗口最小化到托盘，不退出
- **本地存储** — 所有数据保存在本地 SQLite，重启不丢失
- **深色/浅色主题** — 一键切换，护眼与明亮兼得
- **数据迁移** — 自动检测并执行增量数据库迁移，升级不丢数据

## 截图

> 待补充

## 安装

### 直接下载（推荐）

前往 [Releases](../../releases) 页面下载对应平台的安装包：

| 平台 | 文件 |
|------|------|
| Windows | `NabNote Setup x.x.x.exe` |
| macOS | `NabNote-x.x.x.dmg` |
| Linux | `NabNote-x.x.x.AppImage` |

### 从源码运行

需要 [Node.js](https://nodejs.org/) 18+ 环境。

```bash
git clone https://github.com/gengsengghou/NabNote.git
cd NabNote
npm install
npm start
```

## 打包

```bash
npm run build:win     # Windows NSIS 安装包
npm run build:mac     # macOS DMG
npm run build:linux   # Linux AppImage
```

构建产物输出到 `dist/` 目录。

Windows 构建后常用发布文件：

- `dist/NabNote Setup 1.1.0.exe` — Windows 安装包
- `dist/win-unpacked/` — Windows 免安装目录，可压缩后作为 Release 附件

`dist/` 默认不会提交到源码仓库，发布包建议通过 GitHub Release 上传。

## 使用说明

- 待办第一行会作为列表标题，点击待办可查看完整内容。
- 想法第一行会作为卡片标题，后续内容作为卡片预览。
- 待办和想法都支持置顶，置顶项目会优先显示。
- 想法编辑器支持图文内容，可直接粘贴或拖拽图片。

## 技术栈

- **桌面框架** — Electron
- **前端** — HTML + CSS + 原生 JavaScript
- **数据库** — sql.js（SQLite WebAssembly）
- **打包** — electron-builder

## 许可证

MIT
