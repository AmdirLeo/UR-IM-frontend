# UR-IM 前端项目架构文档

## 项目概述

UR-IM 是一个即时通讯（Instant Messaging）应用的前端项目，基于 React + TypeScript + Vite 构建。该项目提供了用户注册登录、好友管理、实时聊天等功能。

## 技术栈

- **前端框架**: React 18
- **开发语言**: TypeScript
- **构建工具**: Vite
- **样式方案**: Tailwind CSS + PostCSS
- **HTTP 客户端**: Axios
- **图标库**: Lucide React
- **代码质量**: ESLint + TypeScript ESLint

## 项目结构

```
UR-IM-frontend/
├── backend_api.json          # 后端 API 文档 (OpenAPI 规范)
├── index.html               # HTML 入口文件
├── package.json             # 项目配置和依赖
├── postcss.config.js        # PostCSS 配置
├── tailwind.config.js       # Tailwind CSS 配置
├── tsconfig.json            # TypeScript 配置
├── tsconfig.node.json       # Node.js TypeScript 配置
├── vite.config.ts           # Vite 构建配置
└── src/                     # 源代码目录
    ├── api.ts               # 全局 API 配置
    ├── App.tsx              # 主应用组件
    ├── friend.ts            # 好友相关类型定义
    ├── index.css            # 全局样式
    ├── main.tsx             # 应用入口点
    ├── vite-env.d.ts        # Vite 环境类型定义
    ├── api/                 # API 模块
    │   ├── friend.ts        # 好友 API
    │   └── user.ts          # 用户 API
    ├── components/          # 组件目录
    │   ├── Auth.module.css  # 认证组件样式
    │   ├── Auth.tsx         # 认证组件 (登录/注册)
    │   └── layout/          # 布局组件
    │       ├── AddFriendModal.tsx    # 添加好友模态框
    │       ├── ChatList.tsx          # 聊天列表
    │       ├── ChatPanel.tsx         # 聊天面板
    │       ├── ContactDetail.tsx     # 联系人详情
    │       ├── ContactList.tsx       # 联系人列表
    │       ├── MainLayout.tsx        # 主布局组件
    │       ├── SettingsOverlay.tsx   # 设置覆盖层
    │       ├── Sidebar.tsx           # 侧边栏
    │       └── UserProfile.tsx       # 用户资料
    ├── context/              # React Context
    │   └── UserContext.tsx   # 用户状态管理
    ├── hooks/                # 自定义 Hooks
    │   └── useWebSocket.ts   # WebSocket 连接 Hook
    ├── styles/               # 样式文件
    │   ├── colors.css        # 颜色系统
    │   └── typography.css    # 字体样式
    └── utils/                # 工具函数
        └── url.ts            # URL 处理工具
```

## 核心文件说明

### 入口文件

- **main.tsx**: 应用入口点，设置 React 根组件，包裹 UserProvider 上下文提供者
- **App.tsx**: 主应用组件，处理认证状态路由和主题切换

### 配置和构建

- **vite.config.ts**: Vite 构建配置，使用 React 插件
- **tsconfig.json**: TypeScript 编译配置，目标 ES2020，启用严格模式
- **tailwind.config.js**: Tailwind CSS 配置
- **postcss.config.js**: PostCSS 配置，包含 Autoprefixer

### API 和数据管理

- **api.ts**: Axios 实例配置，包含请求拦截器（自动添加 JWT token）和响应拦截器（处理 401 错误）
- **api/user.ts**: 用户相关 API 调用
- **api/friend.ts**: 好友相关 API 调用
- **context/UserContext.tsx**: 用户状态管理 Context，提供用户信息、认证状态、登录/登出方法

### 组件架构

#### 认证组件
- **Auth.tsx**: 处理用户登录和注册界面

#### 布局组件
- **MainLayout.tsx**: 主布局组件，管理侧边栏、聊天列表、聊天面板的布局和状态
- **Sidebar.tsx**: 侧边栏，包含导航和用户菜单
- **ChatList.tsx**: 聊天会话列表
- **ChatPanel.tsx**: 聊天消息面板
- **ContactList.tsx**: 联系人列表（好友和群组）
- **ContactDetail.tsx**: 联系人详细信息面板

#### 功能组件
- **AddFriendModal.tsx**: 添加好友的模态框
- **SettingsOverlay.tsx**: 设置界面覆盖层
- **UserProfile.tsx**: 用户资料组件

### 工具和 Hooks

- **useWebSocket.ts**: WebSocket 连接管理 Hook，处理实时消息
- **utils/url.ts**: URL 处理工具函数

### 样式系统

- **styles/colors.css**: 颜色变量定义，支持主题切换（默认、暗色、紫色主题）
- **styles/typography.css**: 字体和排版样式

## 数据流和状态管理

1. **用户认证**: 通过 UserContext 管理全局用户状态
2. **API 调用**: 所有后端请求通过 api.ts 配置的 Axios 实例
3. **实时通信**: 使用 WebSocket 进行实时消息传递
4. **主题切换**: 通过 localStorage 和 CSS 类实现主题持久化

## 后端 API 集成

项目通过 `backend_api.json` 文档化的 OpenAPI 规范与后端交互，主要 API 包括：

- **用户管理**: 注册、登录、登出、用户信息修改
- **好友管理**: 搜索用户、发送好友申请、处理申请、好友列表管理、好友标签
- **消息**: 获取历史消息（当前为 Mock 阶段）
- **健康检查**: 后端服务状态检查

## 开发和构建

### 开发环境
```bash
npm run dev      # 启动开发服务器
npm run lint     # 代码检查
```

### 生产构建
```bash
npm run build    # 构建生产版本
npm run preview  # 预览生产构建
```

### 环境变量
- `VITE_API_BASE_URL`: 后端 API 基础 URL

## 主题系统

支持三种主题：
- 默认主题
- 暗色主题 (`dark`)
- 紫色主题 (`theme-purple`)

主题通过 CSS 变量和类名切换，在 localStorage 中持久化。

## WebSocket 集成

使用自定义 Hook `useWebSocket` 管理 WebSocket 连接，用于实时消息接收和发送。

## 注意事项

1. 当前消息历史 API 处于 Mock 阶段
2. 项目使用 JWT token 进行身份验证
3. 支持响应式布局和主题切换
4. 代码遵循 TypeScript 严格模式，确保类型安全</content>
<parameter name="filePath">/mnt/d/LEO2026/SE/workspace/UR-IM-frontend/architecture.md