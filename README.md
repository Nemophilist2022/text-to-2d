# Text-to-2D Asset Workbench

一个面向 2D 游戏开发流程的素材生成工作台。目标是让用户输入一句自然语言和少量参数，就能生成可预览、可缓存、可导出的游戏素材：角色、怪物、道具、环境物件、地图块、UI 图标等。

当前项目重点不是做完整商业美术生产系统，而是跑通一条稳定可演示的闭环：

```text
Text / Parameters
  -> AssetConcept
  -> VisualPreset
  -> PromptCompiler
  -> Pluggable Backend
  -> Cache / Postprocess
  -> Frames / Spritesheet / Atlas / Run Metadata
  -> Web Preview
```

## Demo Video

<video src="docs/assets/demo-video.mp4" controls width="720"></video>

If the inline player is not rendered by GitHub, open the video directly: [docs/assets/demo-video.mp4](docs/assets/demo-video.mp4)

## 当前能力

- 文本到资产概念：支持 `auto-detect`，可从“木屋、宝石、骑士、史莱姆、草地、红心”等文本中识别素材语义。
- 资产类型：`character`、`monster`、`item`、`environment`、`map-tile`、`ui-icon`。
- Visual Preset：内置 `knight_character`、`slime_monster`、`gem_item`、`wooden_house_environment`、`grass_tile`、`heart_ui_icon` 和 generic fallback。
- Prompt Compiler：把用户文本、资产类型、风格、尺寸、preset 规则组合成结构化 prompt 和 negative prompt。
- 可插拔后端：
  - `codex-local`：离线确定性 SVG 后端，用于稳定演示和测试。
  - `prebuilt`：本地预构建风格后端。
  - `mock-ai`：模拟 AI 后端，用于验证后端可插拔。
  - `chat-svg`：调用聊天模型生成 SVG。
  - `image-api`：调用 `gpt-image-2` 一类图像模型，并包装为可导出的 SVG frame。
- 缓存复用：同请求二次运行应命中缓存；改文本、风格、尺寸、preset、后端等会生成新缓存。
- 后处理与导出：输出单帧、spritesheet、atlas metadata、run metadata。
- Web 工作台：页面可直接输入文本、选择参数、点击生成并预览结果。

## 目录结构

```text
src/
  app/                 # 页面请求到资产任务的适配层
  backends/            # codex-local / mock-ai / chat-svg / image-api 等后端
  cache/               # cache key 与缓存存取
  core/                # 主编排链路 orchestrator
  demo/                # CLI demo 与 gallery 生成脚本
  export/              # frames / spritesheet / atlas 导出
  generation/          # GenerationPacket 与 PromptCompiler
  input/               # 文本和参数到 AssetRecipe / AssetConcept
  postprocess/         # 帧尺寸、bounds、pivot、manifest
  quality/             # SVG Quality Gate
  server/              # Web server 和 API handler
  visual/              # VisualPreset 资产语义目录
ui/
  index.html           # 静态工作台页面
  app.js               # 页面交互和生成请求
  styles.css           # Dark pixel/gaming UI 样式
  demo-gallery.json    # 静态 gallery manifest
  sample-gallery/      # 离线 demo gallery 输出

test/                  # Node test 测试用例
.env.example           # 本地 API 配置模板，不包含真实 key
```

## 环境要求

- Node.js 22+。
- Windows / PowerShell 下已验证。示例命令默认使用：

```powershell
E:\node_22\node.exe
```

如果你的 Node 在 PATH 中，也可以把命令里的 `E:\node_22\node.exe` 替换为 `node`。

## 快速开始：离线 Web 工作台

离线模式不调用任何外部 API，适合先验证 UI、缓存、导出链路。

```powershell
cd E:\七牛云\.worktrees\mvp-plus

E:\node_22\node.exe src\server\app-server.mjs `
  --workspace demo-workspace-web `
  --port 8787 `
  --backend codex-local
```

打开：

```text
http://127.0.0.1:8787
```

推荐表单配置：

```text
Asset Type: auto-detect
Backend: codex-local
Style: pixel
Size: 64x64
```

可尝试输入：

```text
一座中世纪木屋，正面视角，2D 横版游戏场景素材，手绘卡通风格
生成一个像素风宝石道具
生成一个像素风骑士角色
生成一个像素风史莱姆怪物
红心 UI 图标
草地地图块
```

生成后会输出到：

```text
demo-workspace-web/exports/<assetId>/frames/*.svg
demo-workspace-web/exports/<assetId>/spritesheet.svg
demo-workspace-web/exports/<assetId>/atlas.json
demo-workspace-web/exports/<assetId>/run.json
```

同参数再次生成应显示 `cache=hit`。如果你想强制重新生成，勾选页面里的 `Force regenerate`。

## 真实图像 API 模式：image-api

`image-api` 用于调用图像模型，例如 `gpt-image-2`。真实密钥只放在本地 `.env.local`，不要提交到 Git。

复制模板：

```powershell
Copy-Item .env.example .env.local
```

然后编辑 `.env.local`：

```text
IMAGE_API_BASE_URL=http://216.234.142.96:3000
IMAGE_API_ENDPOINT_PROTOCOL=chat-completions
IMAGE_API_MODEL=gpt-image-2
IMAGE_API_REQUEST_SIZE=1024x1024
IMAGE_API_KEY=replace-with-your-local-key
```

启动：

```powershell
E:\node_22\node.exe src\server\app-server.mjs `
  --workspace demo-workspace-image-api `
  --port 8787 `
  --backend image-api
```

打开页面后选择：

```text
Backend: image-api
Asset Type: auto-detect
```

如果之前生成过错误结果，建议勾选 `Force regenerate`，避免读取旧缓存。

## SVG 聊天模型模式：chat-svg

`chat-svg` 走 `/v1/chat/completions`，要求模型直接返回 SVG JSON。它适合验证“模型按 PromptCompiler 生成矢量素材”的链路。

`.env.local` 示例：

```text
CHAT_API_BASE_URL=https://api.example.com
CHAT_API_MODEL=gpt-5.5
CHAT_API_KEY=replace-with-your-local-key
```

启动：

```powershell
E:\node_22\node.exe src\server\app-server.mjs `
  --workspace demo-workspace-chat-svg `
  --port 8787 `
  --backend chat-svg
```

如果 API 限额、密钥不可用或上游超时，页面会显示结构化错误。此时可切回 `codex-local` 做离线验证。

## CLI Demo

离线稳定验证：

```powershell
E:\node_22\node.exe src\demo\demo-runner.mjs `
  --workspace demo-workspace-local `
  --backend codex-local `
  --text "一座中世纪木屋，正面视角，2D 横版游戏场景素材" `
  --asset-type auto `
  --style pixel `
  --size 64x64 `
  --skip-backend-compare
```

真实 image-api：

```powershell
E:\node_22\node.exe src\demo\demo-runner.mjs `
  --workspace demo-workspace-image-api `
  --backend image-api `
  --text "生成一个像素风宝石道具" `
  --asset-type auto `
  --style pixel `
  --size 32x32 `
  --skip-backend-compare
```

CLI 会打印 recipe、generation packet、第一次生成、第二次缓存命中等信息。

## Demo Gallery

生成静态 gallery：

```powershell
E:\node_22\node.exe src\demo\demo-gallery.mjs `
  --workspace ui\sample-gallery `
  --manifest ui\demo-gallery.json `
  --backend codex-local
```

随后可以直接打开：

```text
ui/index.html
```

直接打开静态页面时只读取 `ui/demo-gallery.json` 和 `ui/sample-gallery`，不会调用 API，也不会读取 `.env.local`。

## 测试

运行完整测试：

```powershell
E:\node_22\node.exe --test "test\*.test.mjs"
```

当前测试覆盖：

- 文本到 `AssetConcept` / `VisualPreset` 的识别。
- `auto-detect` 对木屋等 environment 素材的识别。
- PromptCompiler 输出结构化 prompt 和 negative prompt。
- `codex-local`、`mock-ai`、`prebuilt`、`chat-svg`、`image-api` 后端 contract。
- 缓存 miss / hit / force regenerate。
- 后处理 manifest、atlas 坐标、spritesheet 导出。
- Web server 的 `/api/health`、`/api/generate` 和输出文件服务。

## 导出格式

每个素材导出目录类似：

```text
exports/<assetId>/
  frames/
    idle_0.svg
    idle_1.svg
  spritesheet.svg
  atlas.json
  run.json
```

`atlas.json` 用于游戏引擎接入，包含帧坐标、尺寸、pivot 和 source 路径。`run.json` 记录后端、缓存状态、版本、事件和质量检查结果。

## 密钥和安全

- `.env.local` 已被 `.gitignore` 忽略。
- 不要把 API key 写入源码、README、测试、issue、commit message 或 gallery manifest。
- 提交前建议检查：

```powershell
git status --short
git diff --cached --check
git diff --cached | Select-String -Pattern "sk-"
```

## 常见问题

### 为什么生成木屋却变成角色？

请把 `Asset Type` 设为 `auto-detect` 或 `environment`。如果手动选择 `character`，系统会尊重你的选择，把文本按角色素材处理。

### 为什么还是显示旧结果？

可能命中了缓存。勾选 `Force regenerate`，或换一个 workspace，例如：

```powershell
--workspace demo-workspace-image-api-v2
```

### image-api 和 chat-svg 有什么区别？

- `image-api`：调用图像模型生成位图，再包装成 SVG frame，适合看真实生图效果。
- `chat-svg`：调用聊天模型直接生成 SVG 代码，适合验证矢量生成和 Quality Gate。
- `codex-local`：完全离线，适合稳定测试系统链路。

## 当前边界

- 生成质量依赖后端模型能力，项目主要保证请求编译、缓存、后处理、导出和展示链路稳定。
- 当前没有复杂 PNG 透明像素裁切和视觉识别，仅做稳定可测的结构化 Quality Gate。
- 真实 API 可能受额度、上游超时、模型返回格式影响；离线后端可用于不依赖网络的演示。

## License

当前仓库尚未声明开源许可证。公开复用前请先补充明确的 LICENSE。
