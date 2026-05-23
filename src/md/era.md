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
kiss: |
  // #pos after aesf 1
  ctx.addLog("You kissed."+ctx._.time)
  // console.log("ctx", ctx._, ctx._.time)
  // ctx._.env.c=ctx._.time+100;
  // ctx.e("d",ctx._.time+24)
poop: |
  //#pos after kiss 2
  ctx.addLog("poop")
bean:
  - pos: prepare after 3
  - Z: 23
  - ENVAE : 23
  - A: 7
  - console.log("bur")
```
```yaml
is: env
a: b
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