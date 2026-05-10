---
name: YAMLExample
icon: ~
description: YAML格式书写的示例
---

```yaml
is: env
data:
  mode: prod
  debug: false
  timeout: 30000
```

```yaml
is: entities
data:
  - id: prod_entity
    name: Production Entity
    active: true
    weight: 1.0
  - id: prod_entity_2
    name: Production Entity 2
    active: true
    weight: 0.8
```

```yaml
is: ops
data:
  validate:
    label: 验证
    type: secondary
    entry: validate
  process:
    label: 处理数据
    type: primary
    entry: process
  export:
    label: 导出结果
    type: success
    entry: export
  hit:
    label: 测试
    type: success
    entry: test
```

```yaml
is: roles
data:
  user:
    name: 用户
    weight: 1.0
    active: true
  admin:
    name: 管理员
    weight: 1.0
    active: true
  guest:
    name: 访客
    weight: 0.5
    active: false
    inventory:
      size: 20
```
```yaml
is: entities
data:
  - id: char_001
    name: Alice
    level: 42
    health: 0.95
    role: warrior
    faction: "@faction_01"
    inventory:
      size: 20
    status: true
    score: 102400
schema:
  id:
    type: string
    label: ID
  name:
    type: string
    label: 名称
  level:
    type: int
    label: 等级
  health:
    type: real
    label: 生命值
  role:
    type: enum
    label: 职业
    values:
      - warrior
      - mage
      - rogue
      - healer
  faction:
    type: objectref
    label: 所属阵营
  inventory:
    type: object
    label: 背包
  status:
    type: boolean
    label: 在线
  score:
    type: int
    label: 积分
    depend:
      status: true
  tags:
    type: vector
    label: 标签
```
```yaml
is: entities
data:
  - id: weapon_01
    name: 火焰剑
    type: weapon
    damage: 100
  - id: potion_01
    name: 治疗药水
    type: consumable
    heal: 50
schema:
  id:
    type: string
    label: ID
  name:
    type: string
    label: 名称
  type:
    type: enum
    label: 类型
    values:
      - value: weapon
        label: 武器
      - value: armor
        label: 护甲
      - value: consumable
        label: 消耗品
  damage:
    type: int
    label: 伤害
    depend:
      type: weapon
  heal:
    type: int
    label: 治疗量
    depend:
      type: consumable
  defense:
    type: int
    label: 防御
    depend:
      type: armor
```

```yaml
is: pipelines
data:
  init:
    steps:
      - type: log
        level: step
        message: 初始化环境...
      - type: delay
        ms: 200
      - type: log
        level: info
        message: "mode={env.mode}, timeout={env.timeout}"
      - type: log
        level: success
        message: 初始化完成 ✓
  fetch:
    steps:
      - type: log
        level: step
        message: 获取数据源...
      - type: delay
        ms: 300
      - type: log
        level: data
        message: "实体数量: {entities.length}"
      - type: log
        level: success
        message: 获取完成
  transform:
    steps:
      - type: log
        level: step
        message: 转换数据格式...
      - type: each
        items: entities
        body:
          - type: log
            level: entity
            message: "转换: {item.name}"
          - type: delay
            ms: 100
      - type: log
        level: success
        message: 转换完成
  aggregate:
    steps:
      - type: log
        level: step
        message: 聚合统计数据...
      - type: delay
        ms: 400
      - type: setEnv
        key: totalWeight
        value: "entities.reduce((sum, e) => sum + e.weight, 0)"
      - type: log
        level: data
        message: "总权重: {totalWeight}"
      - type: log
        level: success
        message: 聚合完成
  output:
    steps:
      - type: log
        level: step
        message: 生成输出报告...
      - type: delay
        ms: 300
      - type: log
        level: info
        message: "报告内容: {env.mode}"
      - type: setEnv
        key: lastOutput
        value: Date.now()
      - type: log
        level: success
        message: 输出完成
```

```yaml
is: pipelines
data:
  scan:
    steps:
      - type: log
        level: step
        message: 扫描可用资源...
      - type: delay
        ms: 250
      - type: log
        level: data
        message: "扫描路径: /app/resources"
      - type: log
        level: success
        message: "扫描完成, 发现 {entities.length} 个资源"
  parse:
    steps:
      - type: log
        level: step
        message: 解析配置文件...
      - type: delay
        ms: 200
      - type: log
        level: data
        message: "配置模式: {env.mode}"
      - type: log
        level: success
        message: 解析成功
  build:
    steps:
      - type: log
        level: step
        message: 构建 Docker 镜像...
      - type: each
        items: entities
        body:
          - type: log
            level: entity
            message: "构建: {item.name}"
          - type: delay
            ms: 200
      - type: log
        level: success
        message: 镜像构建完成
  deploy:
    steps:
      - type: log
        level: step
        message: 部署到集群...
      - type: delay
        ms: 500
      - type: setEnv
        key: deploymentTime
        value: Date.now()
      - type: log
        level: success
        message: 部署完成
  verify:
    steps:
      - type: log
        level: step
        message: 执行健康检查...
      - type: delay
        ms: 300
      - type: log
        level: info
        message: "检查端点: /health"
      - type: log
        level: success
        message: 健康检查通过 ✓
```
```yaml
is: pipelines
test:
  steps:
    - return "hit"
    - console.log(ctx)
    - ctx.env.timeout=1234
    - ctx.stat('gettinggold', 42)
    - return ctx.env.timeout
bb:
  pos: test append 1
  do:
    - console.log("yes")
```
```yaml
is: pipelines
data:
  extract:
    steps:
      - type: log
        level: step
        message: 从文本提取信息...
      - type: delay
        ms: 300
      - type: log
        level: data
        message: "处理实体: {entities.length}"
      - type: log
        level: success
        message: 提取完成
  classify:
    steps:
      - type: log
        level: step
        message: 分类文本...
      - type: each
        items: entities
        body:
          - type: log
            level: entity
            message: "分类: {item.name} -> {item.weight > 0.5 ? 'A类' : 'B类'}"
          - type: delay
            ms: 150
      - type: log
        level: success
        message: 分类完成
  summarize:
    steps:
      - type: log
        level: step
        message: 生成摘要...
      - type: delay
        ms: 400
      - type: log
        level: info
        message: "摘要: 共处理 {entities.length} 个实体"
      - type: log
        level: success
        message: 摘要生成完成
  store:
    steps:
      - type: log
        level: step
        message: 存储结果到数据库...
      - type: delay
        ms: 350
      - type: setEnv
        key: lastStore
        value: Date.now()
      - type: log
        level: success
        message: 存储完成 ✓
```
