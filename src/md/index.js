/** 由 index.sh 自动生成 不要手动修改*/

export const presets = {
  'empty': {
    name: '空模板',
    icon: '📄',
    description: '什么都没有。',
    md: `
---
name: 空模板
icon: 📄
description: 什么都没有。
---`
  },
  'Example': {
    name: 'Example',
    icon: '📄',
    description: '一份使用多种数据格式进行表达的示例',
    md: `
---
name: Example
icon: "📄"
description: 一份使用多种数据格式进行表达的示例
---

## ENV变量
\`\`\`toml
is = "env"

wood = 0
iron = 0
gold = 100
quest_points = 0
day = 1
\`\`\`
\`\`\`json5
{
  is: "env",
  envFromJSON5:true
}
\`\`\`
\`\`\`yaml
is: env
mode: yaml
debug: false
timeout: 30000
\`\`\`

## A ctors变量

\`\`\`toml
is = "actors"

[[actors]]
id = "char_001"
name = "猎人 Tom"
class = "hunter"
level = 8
health = 100
mana = 50
attack = 25

[[actors]]
id = "char_002"
name = "法师 Emma"
class = "mage"
level = 6
health = 80
mana = 120
attack = 15
\`\`\`


\`\`\`json5
{
    is: "actors",
    actors: [
    {
        id: "char_001",
        name: "矿工 Jack",
        class: "miner",
        level: 5,
        health: 100,
        stamina: 80,
        
    },
    {
        id: "char_002",
        name: "铁匠 Mary",
        class: "smith",
        level: 3,
        health: 100,
        stamina: 60,
    },
    ]
}
\`\`\`

\`\`\`yaml
is: actors
data:
  - id: prod_entity
    name: Production Entity
    active: true
    weight: 1.0
  - id: prod_entity_2
    name: Production Entity 2
    active: true
    weight: 0.8
\`\`\`

## roles
\`\`\`yaml
is: roles
base:
    ASense: 1
    BSense: 1
    CSense: 1
    MSense: 1
    VSense: 2
    ESense: 0
\`\`\`
\`\`\`json5
{
  is: "roles",
  user: {
      name: "用户",
      weight: 1.0,
      active: true,
  },
  admin: {
    name: "管理员",
    weight: 1.0,
    active: true,
  },
  guest: {
    name: "访客",
    weight: 0.5,
    active: false,
  },
}
\`\`\`
## OP

\`\`\`yaml
is: ops
kiss:
  entry: kiss
  label: kiss
poop:
  entry: poop
  label: poop
bean:
  entry: bean
  label: bean
\`\`\`

\`\`\`toml
is = "ops"

[gather]
label = "采集资源"
type = "primary"
entry = "gather"

[craft]
label = "制作物品"
type = "secondary"
entry = "craft"

[trade]
label = "交易"
type = "info"
entry = "trade"

[quest]
label = "接受任务"
type = "success"
entry = "quest"
\`\`\`
## pipeline


\`\`\`yaml
is: pipelines
kiss: |
  ctx.addLog("You kissed."+ctx._.time)
poop: |
  ctx.addLog("poop")
  if(ctx._.selectedActor){
    ctx._.selectedActor.c=23
  }
bean:
  - TRANSFER ENV: gold 10 silver 1
  - ADD health: 50
  - SET health: 100
  - console.log("ctx._.env:", ctx._.env)
\`\`\`

## COM

\`\`\`json5
{
    is:"com",
    ADD: "ctx._.selectedActor[dir] = (ctx._.selectedActor[dir] ?? 0) + value",
    SET: "ctx._.selectedActor[dir] = value",
    GAIN: "ctx._.selectedActor[dir] = (ctx._.selectedActor[dir] ?? 0) * value + 10",
}
\`\`\`

\`\`\`yaml
is: com
ADD: |
  ctx._.selectedActor[dir] = (ctx._.selectedActor[dir] ?? 0) + value; console.log("add")
SET: "ctx._.selectedActor[dir] = value"
MUL: "ctx._.selectedActor[dir] = (ctx._.selectedActor[dir] ?? 1) * value"
\`\`\`
## ENUM

\`\`\`yaml
is: enum
role:
  warrior: 战士
  mage: 法师
  rogue: 盗贼
\`\`\`

\`\`\`yaml
is: enums
role:
  warrior: 战士
  mage: 法师
  rogue: 盗贼
rank:
  common: 普通
  rare: 稀有
  epic: 史诗
  legendary: 传说
\`\`\`
## schemas
\`\`\`yaml
is: schemas
actor:
  id:
    type: string
    label: ID
  name:
    type: string
    label: 名称
  role:
    type: enum:role
    label: 职业
  rank:
    type: enum:rank
    label: 品阶
  health:
    type: int
    label: 生命值
  StrangeValue:
    type: int
    label: 一些莫名其妙的值
\`\`\`
`
  }
}

export const docs = {
}
