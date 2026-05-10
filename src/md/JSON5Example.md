---
name: JSON5Example
icon: ~
description: JSON5格式书写的示例（支持注释和尾随逗号）
---

```json5
{is: "env",
data:
{
  mode: "prod",
  debug: false,
  timeout: 30000,
}}
```

```json5
{is: "actors",
data:
[
  {
    id: "prod_entity",
    name: "Production Entity",
    active: true,
    weight: 1.0,
  },
  {
    id: "prod_entity_2",
    name: "Production Entity 2",
    active: true,
    weight: 0.8,
  },
]}
```

```json5
{is: "ops",
data:
{
  validate: {
    label: "验证",
    type: "secondary",
    entry: "validate",
  },
  process: {
    label: "处理数据",
    type: "primary",
    entry: "process",
  },
  export: {
    label: "导出结果",
    type: "success",
    entry: "export",
  },
}}
```

```json5
{is: "roles",
data:
{
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
}}
```
