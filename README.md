# NabNote

一款极简的桌面端快速笔记工具，解决"脑子里突然冒出一件事怕忘掉"的场景。

**打开要快、记录要快、找到要快。**

## 功能

- **快速输入** — 打开即自动聚焦，回车即刻保存
- **完成标记** — 勾选已完成，自动置灰并移到底部
- **实时搜索** — 输入关键词即时过滤
- **删除确认** — 二次确认，防误删
- **全局快捷键** — `Ctrl+Shift+N`（macOS: `Cmd+Shift+N`）随时唤起或隐藏
- **系统托盘** — 关闭窗口最小化到托盘，不退出
- **本地存储** — 所有数据保存在本地 SQLite，重启不丢失
- **深色主题** — 护眼现代的暗色界面

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

## 技术栈

- **桌面框架** — Electron
- **前端** — HTML + CSS + 原生 JavaScript
- **数据库** — sql.js（SQLite WebAssembly）
- **打包** — electron-builder

## 许可证

MIT
