---
name: TOMLExample
icon: ~
description: TOML格式书写的示例
---

# 数据处理

```toml
is = "package"
name = "Batch"
```

```toml
is = "env"

[data]
mode3 = "ba3tch"
debug = false
batchSize = 100
```

```toml
is = "actors"

[data]
id = "ohh"
name = "Epoch1"
```

```toml
is = "actors"
[[data]]
id = "batch_1"
name = "Batch Item 1"
active = true
weight = 1.0

[[data]]
id = "batch_2"
name = "Batch Item 2"
active = true
weight = 0.9

[[data]]
id = "batch_3"
name = "Batch Item 3"
active = true
weight = 0.8
```

```toml
is = "ops"

[validate]
label = "验证数据"
type = "secondary"
entry = "validate"

[process]
label = "批量处理"
type = "primary"
entry = "process"

[export]
label = "导出结果"
type = "success"
entry = "export"

[batch-update]
label = "批量更新"
type = "info"
entry = "batch-update"
```

```toml
is = "pipelines"

[validate]
[[validate.steps]]
type = "log"
level = "step"
message = "验证环境配置..."

[[validate.steps]]
type = "delay"
ms = 300

[[validate.steps]]
type = "log"
level = "data"
message = "mode={env.mode}, debug={env.debug}"

[[validate.steps]]
type = "log"
level = "data"
message = "验证实体数量: {entities.length}"

[[validate.steps]]
type = "log"
level = "success"
message = "验证通过"

[process]
[[process.steps]]
type = "log"
level = "step"
message = "开始处理数据..."

[[process.steps]]
type = "delay"
ms = 300

[[process.steps]]
type = "each"
items = "entities"
body = [
  { type = "log", level = "entity", message = "处理实体: {item.name}" },
  { type = "log", level = "data", message = "  weight={item.weight}, active={item.active}" },
  { type = "delay", ms = 150 }
]

[[process.steps]]
type = "setEnv"
key = "processed"
value = "(ctx.env.processed || 0) + ctx.entities.length"

[[process.steps]]
type = "log"
level = "success"
message = "处理完成"

[export]
[[export.steps]]
type = "log"
level = "step"
message = "导出结果..."

[[export.steps]]
type = "delay"
ms = 400

[[export.steps]]
type = "log"
level = "info"
message = "生成报告..."

[[export.steps]]
type = "setEnv"
key = "lastExport"
value = "Date.now()"

[[export.steps]]
type = "log"
level = "success"
message = "导出完成: {entities.length} 条记录"

[batch-update]
[[batch-update.steps]]
type = "log"
level = "step"
message = "批量更新权重..."

[[batch-update.steps]]
type = "each"
items = "entities"
body = [
  { type = "log", level = "data", message = "更新: {item.name}" }
]

[[batch-update.steps]]
type = "setEnv"
key = "lastUpdate"
value = "new Date().toISOString()"

[[batch-update.steps]]
type = "log"
level = "success"
message = "批量更新完成"
```
