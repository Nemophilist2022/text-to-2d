# 参数化 2D 游戏素材工作台 MVP：系统骨架

基于已选方案：**离线优先的确定性演示闭环**。  
目标：支撑编码开始，不展开具体实现细节。

## 1. 模块拆分

### 1.1 Orchestrator / 主流程编排
- 接收素材请求。
- 计算缓存键。
- 判断缓存命中。
- 未命中时调用生成后端。
- 调用后处理链。
- 调用导出器。
- 输出执行结果和可追踪日志。

### 1.2 Asset Spec / 参数化素材定义
- 定义素材类型、尺寸、风格、帧信息、导出目标等参数。
- 负责参数校验和规范化。
- 不负责生成图片。

### 1.3 Cache / 预生成与缓存
- 根据规范化参数、后端标识、后处理版本生成缓存键。
- 读取预生成素材或历史生成结果。
- 写入生成结果和元数据。
- 明确记录 cache hit / miss。

### 1.4 Backend Adapter / 可插拔生成后端
- 统一封装不同生成来源。
- MVP 主后端：本地模拟后端或预生成素材后端。
- 可选后端：真实 AI 图片生成后端。
- 后端只负责“根据请求返回原始素材”，不做后处理和导出。

### 1.5 Postprocess / 后处理
- 对原始素材执行演示所需处理。
- MVP 可覆盖：尺寸归一、透明背景校验/处理、裁切、命名、帧排序、sprite sheet 拼接中的一部分。
- 输出处理后素材和处理元数据。

### 1.6 Exporter / 导出
- 将处理后素材导出为约定格式。
- MVP 推荐先支持：单图目录 + metadata。
- sprite sheet / zip / 引擎格式作为可选扩展边界。

### 1.7 Demo Entry / 演示入口
- 提供固定演示请求。
- 展示第一次执行生成/写缓存、第二次执行缓存命中。
- 展示切换后端不会破坏主流程。
- 入口形态不固定：CLI / 简单 Web UI / 脚本均可【不稳定边界】。

## 2. 建议目录结构

```text
.
├─ docs/
│  ├─ mvp-problem-definition.md
│  └─ mvp-system-skeleton.md
├─ src/
│  ├─ core/
│  │  ├─ orchestrator
│  │  ├─ asset-spec
│  │  └─ result-types
│  ├─ cache/
│  │  ├─ cache-key
│  │  └─ cache-store
│  ├─ backends/
│  │  ├─ backend-interface
│  │  ├─ prebuilt-backend
│  │  └─ ai-backend-placeholder
│  ├─ postprocess/
│  │  ├─ pipeline
│  │  └─ processors
│  ├─ export/
│  │  ├─ exporter-interface
│  │  ├─ image-directory-exporter
│  │  └─ metadata-exporter
│  └─ demo/
│     ├─ demo-requests
│     └─ demo-runner
├─ assets/
│  └─ prebuilt/
├─ cache/
│  ├─ raw/
│  ├─ processed/
│  └─ metadata/
└─ exports/
```

说明：
- 以上是逻辑目录，不绑定具体语言或框架。
- `cache/` 与 `exports/` 是运行产物目录，不应混入源码。

## 3. 核心接口 / API

### 3.1 主流程

```text
runAssetJob(request: AssetRequest): AssetJobResult
```

职责：
- 输入一个素材请求。
- 返回最终导出结果、缓存状态、后端信息、错误信息。

### 3.2 后端接口

```text
GenerateBackend.generate(input: GenerateInput): GenerateResult
```

要求：
- 每个后端必须有稳定 `backendId`。
- 后端不得直接写导出目录。
- 后端返回原始素材路径或二进制引用，以及生成元数据。

### 3.3 缓存接口

```text
CacheStore.get(cacheKey): CachedAsset | null
CacheStore.put(cacheKey, asset, metadata): CachedAsset
```

要求：
- 缓存键必须由规范化参数、后端标识、后处理版本共同决定。
- 缓存命中必须可观测。

### 3.4 后处理接口

```text
PostprocessPipeline.run(rawAsset, postprocessSpec): ProcessedAsset
```

要求：
- 输入原始素材。
- 输出处理后素材。
- 记录实际执行的处理步骤。

### 3.5 导出接口

```text
Exporter.export(processedAsset, exportSpec): ExportResult
```

要求：
- 导出结果必须包含文件路径和 metadata。
- 导出格式必须在请求中明确。

## 4. 关键数据结构

### 4.1 AssetRequest

```text
AssetRequest
- assetId: string
- assetType: character | item | tile | effect | other
- parameters: AssetParameters
- backendId: string
- postprocessSpec: PostprocessSpec
- exportSpec: ExportSpec
- forceRegenerate: boolean
```

### 4.2 AssetParameters

```text
AssetParameters
- name: string
- style: string
- size: { width, height }
- view: front | side | top | other
- frames: FrameSpec[]
- promptHints: string[]
```

不稳定边界：
- `promptHints` 是否算参数化不足以最终确认。
- 参数分类需要后续根据素材类型收敛。

### 4.3 CacheKeyParts

```text
CacheKeyParts
- normalizedAssetParameters
- backendId
- backendVersion
- postprocessVersion
- exportRelevantOptions
```

要求：
- 同一输入必须生成同一 cache key。
- 影响最终产物的变化必须进入 cache key。

### 4.4 AssetJobResult

```text
AssetJobResult
- status: success | failed
- cacheStatus: hit | miss | bypassed
- backendId: string
- rawAssetRef: string
- processedAssetRef: string
- exportRefs: string[]
- metadataRef: string
- errors: ErrorInfo[]
```

## 5. 主链路时序

```text
1. Demo Entry 提交 AssetRequest
2. Asset Spec 校验并规范化参数
3. Cache 计算 cache key
4. Cache 查找 raw / processed / metadata
5. 如果命中：
   5.1 读取缓存素材
   5.2 必要时直接进入导出
6. 如果未命中：
   6.1 Orchestrator 调用 Backend Adapter
   6.2 Backend 返回 raw asset
   6.3 Cache 写入 raw asset 与生成元数据
7. Postprocess Pipeline 处理 raw asset
8. Cache 写入 processed asset 与处理元数据
9. Exporter 导出文件
10. Orchestrator 返回 AssetJobResult
11. Demo Entry 展示结果与 cache hit/miss
```

## 6. 权限隔离与边界

### 6.1 文件边界
- `assets/prebuilt/`：只读输入。
- `cache/`：仅 Cache 模块写入。
- `exports/`：仅 Exporter 写入。
- `src/`：源码，不保存运行产物。

### 6.2 模块边界
- Backend 不直接访问 `exports/`。
- Exporter 不调用 Backend。
- Postprocess 不访问网络。
- Demo Entry 不直接读写缓存内部结构，只调用主流程。
- Cache 不理解业务参数含义，只处理规范化后的 key 和 asset refs。

### 6.3 后端边界
- 本地预生成后端是 MVP 主路径。
- 真实 AI 后端是可选扩展，不允许成为演示成败依赖。
- 后端失败时，主流程应返回结构化错误；是否 fallback 到缓存【不稳定边界】。

## 7. 仍不稳定的边界

- UI 形态：CLI、Web UI、脚本入口尚未确定。
- 参数化标准：哪些字段是强参数，哪些只是 prompt hint 尚未确定。
- 导出格式：MVP 推荐单图目录 + metadata；sprite sheet / zip / 引擎格式待定。
- 后处理范围：尺寸、透明、裁切、拼表哪些进入 MVP 待定。
- 真实 AI 后端：是否在 MVP 中真实接入待定。
- 素材类型：角色、道具、地块、特效是否全部覆盖待定；MVP 应先选择最小集合。

## 8. 编码开始前的最低确认

- 入口形态选一个：CLI / Web UI / 脚本。
- MVP 素材类型选一个或两个。
- MVP 导出格式定为：单图目录 + metadata，或加入 sprite sheet。
- MVP 后端定为：prebuilt backend 必做，真实 AI backend 是否只留接口。
- MVP 后处理最小集合定下来。
