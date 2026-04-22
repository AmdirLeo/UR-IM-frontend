# UR-IM Frontend

UR-IM 是一个基于 React 和 Vite 构建的现代化即时通讯（IM）Web 客户端。本项目提供了一个流畅、响应式且功能丰富的聊天界面，致力于带来优秀的沟通体验。

## 🌟 主要特性 (Features)

- **账号管理体系**：支持用户注册、登录、通过邮箱验证码找回密码等基础功能。
- **实时聊天系统**：
  - 基于 WebSocket 的低延迟实时消息收发。
  - 支持历史漫游消息的拉取与展示。
  - 内置“系统助手”提供系统级通知和服务。
- **好友与联系人系统**：
  - 支持全局模糊搜索添加好友。
  - 完整的好友申请、同意/拒绝处理流程。
  - 好友分组管理（创建标签、添加好友到标签、按标签分类查看）。
  - 支持删除好友双向解除关系。
- **个性化与界面 (UI/UX)**：
  - 完美支持 **深色模式 (Dark Mode)** 与浅色主题切换。
  - 支持用户修改个人信息、修改密码及自定义头像上传与裁剪。
  - 响应式设计，适配不同尺寸屏幕。

## 🛠 技术栈 (Tech Stack)

- **前端框架**: [React 18](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **构建工具**: [Vite](https://vitejs.dev/)
- **样式方案**: [Tailwind CSS](https://tailwindcss.com/) + CSS Variables (支持主题定制)
- **图标库**: [Lucide React](https://lucide.dev/)
- **网络请求**: [Axios](https://axios-http.com/) (REST API) + 原生 WebSocket (实时通信)
- **状态管理**: 基于 React Context API (`UserContext`, `ChatContext`, `ContactContext` 等)
- **其他库**: `react-easy-crop` (用于头像裁剪)

## 📁 目录结构说明 (Directory Structure)

核心代码均位于 `src/` 目录下：

```text
src/
├── api/            # REST API 接口定义与 Axios 封装 (包含 friend, user 等模块)
├── assets/         # 静态资源 (图片、图标等)
├── components/     # React UI 组件 (按功能模块划分，如 layout, common, Auth)
├── context/        # 全局状态管理 (User, Chat, Contact, Conversation 等 Context)
├── hooks/          # 自定义 React Hooks (如 useChat, useWebSocket 等)
├── styles/         # 全局样式文件与 CSS 变量定义 (如 colors.css 配合 Tailwind)
├── utils/          # 工具函数库 (如 avatarDB 用于 IndexedDB 缓存头像)
├── App.tsx         # 应用主入口与路由状态分发
└── main.tsx        # React 根节点挂载点
```

## 🚀 本地运行指南 (Quick Start)

### 1. 环境准备

确保您的本地已安装 [Node.js](https://nodejs.org/) (建议版本 18+)。

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

项目根目录下有一个 `.env.example` 文件。请在本地新建一个 `.env` 文件，并参考示例配置必需的环境变量：

```bash
cp .env.example .env
```

在 `.env` 中，主要需要配置后端 API 的基础地址：
```env
VITE_API_BASE_URL=http://localhost:8000/api
# 如果有 WebSocket 的特定地址也可以配置
```

### 4. 启动本地开发服务

```bash
npm run dev
```

启动成功后，控制台会输出本地访问地址 (通常为 `http://localhost:5173`)。请注意，**本项目依赖后端 API 服务**，请确保配套的后端服务已在对应端口（如 8000）成功启动。

## 📜 可用命令 (Available Scripts)

- `npm run dev`: 启动 Vite 本地开发服务器，支持热更新 (HMR)。
- `npm run build`: 使用 TypeScript 进行类型检查，并使用 Vite 将项目打包为生产环境静态文件。
- `npm run lint`: 运行 ESLint 进行代码规范检查。
- `npm run preview`: 启动一个本地静态服务器，预览 `dist/` 目录下的打包产物。

## 💡 开发注意事项

- **本地缓存**: 项目广泛使用了 `localStorage` 和 `IndexedDB` (用于缓存 Base64 头像，绕过 localStorage 容量限制)。在调试状态异常时，可以尝试清除浏览器缓存。
- **UI 规范**: 颜色体系通过 `src/styles/colors.css` 中的 CSS 变量配合 `tailwind.config.js` 进行管理。在开发新组件时，请优先使用预设的语义化颜色类名 (如 `text-primary`, `bg-brand`)，避免硬编码具体的颜色值。
