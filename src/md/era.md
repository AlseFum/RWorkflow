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
```
```yaml
is: pipelines
kiss:
  steps:
    - ctx.log("You kissed.")
    - ctx.selectedActor.p=23
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