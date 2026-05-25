# Text-to-2D Asset Workbench

参数化 2D 游戏素材工作台 MVP+：从文本和简单参数生成游戏素材请求，经过 Visual Preset、Prompt Compiler、可插拔生成后端、缓存、后处理，导出 frames / spritesheet / atlas metadata。

## 当前能力

- 文本到 `AssetConcept`：识别角色、怪物、道具、地图块、UI 图标。
- Visual Preset：内置 knight、slime、gem、grass tile、heart icon，以及 generic fallback。
- Prompt Compiler v2：生成结构化 prompt sections、negative prompt、composition/readability/SVG 约束。
- Quality Gate：输出 errors / warnings / checks，错误阻断，warning 进入 `run.json`。
- 后端：`codex-local`、`mock-ai`、`prebuilt`、`chat-svg`、`image-api`。
- 导出：individual frames、`spritesheet.svg`、`atlas.json`、`run.json`。
- Web 工作台：`src/server/app-server.mjs` 可在页面输入文本并一键生成，默认走离线 `codex-local`。
- 静态 Gallery：`ui/index.html` 在无服务模式下仍可查看 5 类 demo gallery。

## 快速验证

```powershell
cd E:\七牛云\.worktrees\mvp-plus
E:\node_22\node.exe --test "test\*.test.mjs"
```

## 运行一键生成 Web 工作台

当前 API 已可能限额，推荐先用离线后端验证页面闭环：

```powershell
E:\node_22\node.exe src\server\app-server.mjs `
  --workspace demo-workspace-web `
  --port 8787 `
  --backend codex-local
```

打开：

```text
http://127.0.0.1:8787
```

页面可直接输入：

```text
像素风宝石道具
像素风骑士角色
草地地图块
红心 UI 图标
```

点击 `Generate Asset` 后会生成：

```text
demo-workspace-web/exports/<assetId>/frames/*.svg
demo-workspace-web/exports/<assetId>/spritesheet.svg
demo-workspace-web/exports/<assetId>/atlas.json
demo-workspace-web/exports/<assetId>/run.json
```

同参数第二次点击应显示 `cache=hit`。

## 运行真实 API Web 工作台

确保 `.env.local` 内存在本地密钥配置，密钥文件不会提交：

```text
CHAT_API_BASE_URL=https://api.vip1129.cc/
CHAT_API_MODEL=gpt-5.5
CHAT_API_KEY=你的本地密钥
```

启动真实 API 模式：

```powershell
E:\node_22\node.exe src\server\app-server.mjs `
  --workspace demo-workspace-real-api `
  --port 8787 `
  --backend chat-svg
```

打开：

```text
http://127.0.0.1:8787
```

此时页面 Backend 会自动选中 `chat-svg`。点击 `Generate Asset` 会调用：

```text
/v1/chat/completions
```

如果 API 限额或密钥不可用，页面会显示结构化错误；可临时切回 `codex-local` 做离线验证。
## 运行 CLI Demo

默认后端为 `chat-svg`，需要 `.env.local` 中存在可用 `IMAGE_API_KEY` 或 `CHAT_API_KEY`。

```powershell
E:\node_22\node.exe src\demo\demo-runner.mjs `
  --workspace demo-workspace-chat-svg `
  --text "生成一个像素风宝石道具" `
  --asset-type item `
  --style pixel `
  --size 32x32 `
  --skip-backend-compare
```

离线稳定验证使用 `codex-local`：

```powershell
E:\node_22\node.exe src\demo\demo-runner.mjs `
  --workspace demo-workspace-local `
  --backend codex-local `
  --text "红心 UI 图标" `
  --asset-type ui-icon `
  --style pixel `
  --size 32x32 `
  --skip-backend-compare
```

## 生成静态 Gallery

```powershell
E:\node_22\node.exe src\demo\demo-gallery.mjs `
  --workspace ui\sample-gallery `
  --manifest ui\demo-gallery.json `
  --backend codex-local
```

打开：

```text
ui/index.html
```

页面在直接打开文件时只读取 `ui/demo-gallery.json` 和 sample exports，不会调用 API，也不会读取密钥。

## 密钥规则

- `.env.local` 被 `.gitignore` 忽略。
- 不要把 API key 写入源码、README、测试或 gallery manifest。
- 提交前可检查：

```powershell
git status --short
git diff --cached --check
```
