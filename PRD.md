# 家庭积分管理系统 (Family Points System) - 产品需求文档 (PRD)

## 1. 项目背景
旨在通过积分激励机制，促进家庭成员（爸爸、妈妈、姐姐、弟弟）之间的互动、任务完成和情感交流。

## 2. 核心功能
*   **任务管理**: 创建、分配、进度跟踪、多方确认。
*   **积分体系**: 任务奖励、登录奖励、留言奖励、弹幕奖励。
*   **勋章/成就**: 自动解锁成就并获得额外积分。
*   **家庭留言板**: 实时弹幕、聚合显示、特效支持。
*   **数据可视化**: 家庭总积分趋势、成员积分动态（来源细分）。
*   **奖励兑换**: 个人及全家里程碑奖励。

## 3. 最近更新 (v2.7.0)
*   **自动化测试基础设施 (P0)**:
    *   **引入 Vitest**: 集成了 Vitest 测试框架，支持单元测试和组件测试。
    *   **核心逻辑验证**: 编写了针对 `goalUtils.ts` 的测试用例，确保积分计算、预警状态（红/黄/绿灯）逻辑的准确性。
    *   **组件渲染测试**: 编写了针对 `UserAvatar.tsx` 的测试，确保头像回退逻辑和自定义头像加载正常。
    *   **Mock 环境**: 搭建了完整的测试 Mock 环境（Supabase, LocalStorage, Crypto），支持在无后端环境下运行逻辑验证。
*   **多弹幕特效循环 (P0)**:
    *   **顺序循环逻辑**: 当用户为弹幕选择多个特效时，弹幕每次从屏幕右侧重新出现时，都会按顺序切换到下一个选中的特效。
    *   **实现方式**: 通过在 `DanmakuItem` 中引入 `iteration` 状态，并结合 `setTimeout` 和 `key` 属性，实现了弹幕在每次飞行周期结束后的自动重置与特效切换。
    *   **初始延迟优化**: 确保初始延迟（Initial Delay）仅在弹幕第一次出现时生效，后续循环将无缝衔接。
*   **LocalStorage 缓存优化 (P0)**:
    *   **Quota 错误修复**: 实现了 `safeSetItem` 函数，在遇到 `QuotaExceededError` 时自动清理 `cache_` 开头的缓存项并重试。
    *   **大文件过滤**: 缓存 `profiles`、`goal_comments` 和 `messages` 时，自动过滤掉超过 20KB 的 base64 图片，防止撑爆 LocalStorage。
    *   **存储空间清理**: 在数据迁移到 Supabase 后，自动删除旧的本地存储键（如 `family_goals_data` 等），释放约 5MB 空间。
    *   **全局覆盖**: 将所有直接调用 `localStorage.setItem` 的地方替换为 `safeSetItem`。
*   **代码清理与修复 (P0)**:
    *   修复了 `App.tsx` 中的语法错误（Unexpected "}"）。
    *   移除了 `App.tsx` 中冗余的 `App` 组件声明，解决了 TypeScript 冲突。
    *   清理了 `App.tsx` 中错位的代码块，确保代码结构清晰且符合组件化设计。
*   **安全性增强 (P0)**:
    *   移除了硬编码的 Supabase 凭据，改用环境变量。
    *   引入了管理员 PIN 码登录。
    *   为家庭成员实现了 4 位 PIN 码登录机制。
*   **代码架构优化**:
    *   对 `App.tsx` 进行了大规模重构，将组件拆分为独立文件（`GoalCard`, `GoalModal`, `DanmakuBoard`, `FamilyStats` 等）。
    *   建立了 `src/components` 目录结构。
    *   提取了工具函数到 `src/utils/goalUtils.ts`。
*   **部署标准化**:
    *   移除了 Netlify 配置，统一使用 Vercel 部署。
*   **Bug 修复**:
    *   修复了“家庭任务”显示不全的问题。
    *   修复了创建家庭任务失败的问题。

## 4. 技术栈
*   Frontend: React, Tailwind CSS, Framer Motion, Recharts.
*   Backend: Supabase (PostgreSQL, Real-time).
*   Icons: Lucide React.
