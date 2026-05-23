---
name: Era
icon: "!"
description: EraSprawl
---
```yaml
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
```
```yaml
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
```
```yaml
is: env
gold: 0
silver: 0
```
```yaml
is: com
ADD: |
  ctx._.selectedActor[dir] = (ctx._.selectedActor[dir] ?? 0) + value; console.log("add")
SET: "ctx._.selectedActor[dir] = value"
MUL: "ctx._.selectedActor[dir] = (ctx._.selectedActor[dir] ?? 1) * value"
```
```yaml
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
```
```yaml
is: schemas
entity:
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
```
```yaml
is: roles
base:
    ASense: 1
    BSense: 1
    CSense: 1
    MSense: 1
    VSense: 2
    ESense: 0
```