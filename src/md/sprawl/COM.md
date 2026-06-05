```yaml
is: com
CHOOSE: |
    //这里不好区分，只能默认传到ctx
    let choices=value.split(/[ ,]/g).map(i=>Number(i))
    ctx[dir]=choices[Math.floor(Math.random()*choices.length)]
LOG: |
    ctx.log(value,dir??"INFO")
FLIP: |
    let obj=(dir == "ACTOR")?ctx._.selectedActor:ctx._
    obj[value]= !obj[value]
    if (obj[value] == false){
        obj[value] = undefined
    }
SETALL: |
    //仅用于初始化
    for(let n of ctx._.actors){
        n[dir]=value
    }
CLEAR_UPPER: |
    // 清除所有actor中的临时变量（以_开头或全大写的属性）
    for(let n of ctx._.actors){
        for(let k of Object.keys(n)){
            if(k.startsWith('_') || k === k.toUpperCase()){
                delete n[k]
            }
        }
    }
```