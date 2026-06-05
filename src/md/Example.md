---
name: Example: Greenvale Village
icon: 🏡
description: A tiny village at the foot of the mountains. Pick a way of life and get started.
---

## What This File Is

This file is **both a tutorial and a working example**.  Every code block below is live — the
app parses them at runtime to set up the game.  Read the explanations, then try selecting
different presets and running operations to see how each piece connects.

The markdown is organized into sections, each introduced by a `## heading`.  Code blocks are
written in TOML, YAML, or JSON5 — you can mix them freely; blocks of the same type with the
same `id` (or the same `is` key) are automatically **deep-merged**.

---

## Presets

A **preset** defines a starting state: the environment (`env`) and the characters (`actors`).
When you pick a preset in the Prepare stage, the app resets the runtime and loads the matching
env properties and actors.

Each preset is described by one or more code blocks that share the same `id`:

- The `is` field tells the parser which category the block belongs to.
  `"presets"` (or `"preset"`) means it's a preset block.
- The `id` field gives the preset a machine-readable name (used as the key for merging).
- `label` and `desc` are **human-facing**: displayed in the swipe selector as title and subtitle.
  These are stripped before being written to the runtime (they are metadata, not data).
- Every **other** key-value pair (`season`, `weather`, `trees_remaining`, ...) becomes an entry
  in `runtime.env`.
- An `actors` array inside a preset block populates `runtime.actors` with pre-made characters.

Blocks with the same `id` are merged, so you can split env and actors across different
languages or blocks.  This is demonstrated in every preset below.

---

### Woodcutting

Grab an axe and head up the northern slope.  The `actors` here are the trees themselves —
select a tree and run "Chop" to deal damage.

> **Env block (TOML)**
> TOML uses `key = value` syntax.  All keys except `is`, `id`, `label`, `desc` and `actors`
> will be placed into the env object.

```toml
is = "presets"
id = "woodcutting"
label = "Woodcutting"
desc = "Chop trees on the northern slope to gather lumber."
season = "spring"
weather = "sunny"
trees_remaining = 20
axe_durability = 100
```

> **Actors block (JSON5)**
> JSON5 is JSON with trailing commas, unquoted keys, and comments — great for structured data
> like actor lists.  These five trees become the `actors` array when you pick this preset.

```json5
{
  is: "presets",
  id: "woodcutting",
  actors: [
    { id: "oak_1",   name: "Old Oak",    type: "oak",   hp: 80,  wood_yield: 5,  age: 150 },
    { id: "pine_1",  name: "Green Pine",  type: "pine",  hp: 50,  wood_yield: 3,  age: 60  },
    { id: "oak_2",   name: "Young Oak",   type: "oak",   hp: 40,  wood_yield: 2,  age: 20  },
    { id: "birch_1", name: "Silver Birch", type: "birch", hp: 35,  wood_yield: 2,  age: 30  },
    { id: "maple_1", name: "Red Maple",   type: "maple", hp: 45,  wood_yield: 3,  age: 80  }
  ]
}
```

---

### Mining

The mine shaft is pitch dark — only the clink of pickaxes breaks the silence.

> **Env block (TOML)** supplies the environmental properties of the mine.

```toml
is = "presets"
id = "mining"
label = "Mining"
desc = "Descend into the Greenvale mine to dig up ore and gems."
depth = "30m"
cave_temperature = 18
torch_count = 3
pickaxe_durability = 80
```

> **Actors block (YAML)**
> YAML is clean and readable for hierarchical data.  Here each miner is a list item under
> `actors`.  Their fields (`STR`, `experience`, `role`, ...) will be editable in the UI
> because they match keys in the `schemas` section below.

```yaml
is: presets
id: mining
actors:
  - id: miner_boss
    name: Old Foreman
    role: Foreman
    STR: 14
    experience: 20
  - id: miner_1
    name: Iron-Arms
    role: Miner
    STR: 10
    experience: 8
  - id: miner_2
    name: Stony
    role: Miner
    STR: 12
    experience: 5
  - id: miner_3
    name: Big Haul
    role: Hauler
    STR: 15
    experience: 3
```

---

### Fishing

Weeping willows line the riverbank; the water glistens in the afternoon sun.

> Notice how the **env** comes from YAML here, while the **actors** use JSON5 — the order
> and language choice are arbitrary.  As long as `id` matches, the blocks merge.

```yaml
is: presets
id: fishing
label: Fishing
desc: Relax by the Greenvale riverside and cast your line.
weather: "cloudy"
water_flow: "slow"
fish_active: true
bait_count: 15
```

```json5
{
  is: "presets",
  id: "fishing",
  actors: [
    { id: "fish_carp",    name: "Big Carp",    type: "carp",    weight_kg: 3.2, rarity: "common" },
    { id: "fish_bass",    name: "Bass",        type: "bass",    weight_kg: 1.8, rarity: "common" },
    { id: "fish_trout",   name: "Rainbow Trout", type: "trout",  weight_kg: 2.1, rarity: "uncommon" },
    { id: "fish_catfish", name: "Catfish",     type: "catfish", weight_kg: 4.5, rarity: "uncommon" },
    { id: "fish_koi",     name: "Koi",         type: "koi",     weight_kg: 1.2, rarity: "rare" }
  ]
}
```

---

### Cooking

Pots and pans clatter in the inn's back kitchen.

```toml
is = "presets"
id = "cooking"
label = "Cooking"
desc = "Whip up sizzling dishes in the Greenvale Inn kitchen."
time_of_day = "evening"
stove_fuel = 80
orders_pending = 5
```

```yaml
is: presets
id: cooking
actors:
  - id: chef_1
    name: Big Chef
    role: Chef
    cooking: 18
    DEX: 12
  - id: chef_2
    name: Little Helper
    role: Apprentice
    cooking: 8
    DEX: 14
```

---

### Adventure

Beyond the southern woods, shrouded in mist, lie ancient ruins.

```toml
is = "presets"
id = "adventure"
label = "Adventure"
desc = "Form a party and delve into the Misty Woods ruins in search of legendary treasure."
time = "dawn"
danger_level = 4
room_count = 12
```

```yaml
is: presets
id: adventure
actors:
  - id: warrior
    name: Tank the Wall
    role: Warrior
    STR: 16
    DEX: 10
    WIL: 12
    hp: 100
  - id: mage
    name: Starlight Lina
    role: Mage
    STR: 8
    DEX: 12
    WIL: 18
    hp: 60
    mp: 120
  - id: rogue
    name: Shadow Kai
    role: Rogue
    STR: 10
    DEX: 18
    WIL: 10
    hp: 70
```

---

## Roles

**Roles** are actor templates.  In the Prepare stage, the "Actors" panel shows a row of
`+RoleName` buttons next to the "+ Add" button.  Click one and a new actor is created with
the role's default values pre-filled.

The keys under `is: roles` become the button labels (and the `name` field becomes the
new actor's display name).  Every other field is copied as-is onto the new actor instance.

```yaml
is: roles
Miner:
  name: Miner
  STR: 10
  DEX: 8
  role: Miner
  tool: tools.pickaxe
Foreman:
  name: Foreman
  STR: 13
  DEX: 9
  WIL: 12
  role: Foreman
  tool: tools.hammer
Hauler:
  name: Hauler
  STR: 14
  DEX: 7
  role: Hauler
  tool: tools.cart
Chef:
  name: Chef
  DEX: 12
  WIL: 10
  role: Chef
Apprentice:
  name: Apprentice
  DEX: 10
  role: Apprentice
Warrior:
  name: Warrior
  STR: 14
  DEX: 11
  WIL: 10
  role: Warrior
Mage:
  name: Mage
  STR: 7
  DEX: 10
  WIL: 16
  role: Mage
Rogue:
  name: Rogue
  STR: 9
  DEX: 16
  WIL: 9
  role: Rogue
```

---

## OP — Operations

**Ops** are the action buttons you see in the Run stage.  Each op links to a **pipeline**
of the same name via the `entry` field.

| Field | Meaning |
|-------|---------|
| `label` | The text shown on the button |
| `entry` | The **pipeline name** to execute when clicked |
| `type`  | Visual style: `primary` (blue), `secondary` (gray), `info` (green), `success` (green), `error` (red) |

Ops can be defined in any language.  Here we split them into YAML (primary actions) and
TOML (secondary / info actions) just to show that merging works for ops too.

```yaml
is: ops
chop:
  label: Chop
  entry: chop
  type: primary
mine:
  label: Mine
  entry: mine
  type: primary
fish:
  label: Fish
  entry: fish
  type: primary
cook:
  label: Cook
  entry: cook
  type: primary
explore:
  label: Explore
  entry: explore
  type: primary
```

```toml
is = "ops"

[rest]
label = "Rest"
type = "secondary"
entry = "rest"

[trade_items]
label = "Trade"
type = "info"
entry = "trade_items"

[inspect]
label = "Inspect"
type = "info"
entry = "inspect"
```

---

## Pipeline

A **pipeline** is a sequence of steps that executes when the corresponding op is clicked.
Each step is a line of code — it can be a COM command (see below), a `ctx` helper call,
or raw JavaScript.

### Available helpers

| Helper | What it does |
|--------|-------------|
| `ctx.log(msg, type)` | Pushes a log entry (visible in the Log stage). `type` colours it: `"info"`, `"success"`, `"error"`, `"step"`, `"entity"`, `"data"`. |
| `ctx.tlog(msg, type)` | Like `ctx.log` but prepends a timestamp. |
| `ctx.stat(name, value?)` | Records a counter.  The Log stage shows each stat's **count** (how many times it was called) and **total** (sum of values).  If `value` is omitted, only the count increments. |

### The `ctx._` namespace

Every pipeline step runs with access to `ctx._`, a snapshot of the entire runtime:

| Path | Description |
|------|-------------|
| `ctx._.env` | The current environment object |
| `ctx._.actors` | All actor instances |
| `ctx._.selectedActor` | The **currently selected** actor (picked in the Run stage) |
| `ctx._.selectedOp` | The name of the running operation |
| `ctx._.messages` | Cross-pipeline message store |

The examples below target `ctx._.selectedActor` — so clicking "Chop" while a tree is selected
damages **that specific tree**, and clicking "Mine" while a miner is selected adds experience
to that miner.

```yaml
is: pipelines
pre: |
  ctx.stat("Total actions")
  ctx.log("--- Before action ---", "step")
post: |
  ctx.log("--- After action ---", "step")
chop:
  - DAMAGE hp: 20
  - ctx.stat("Chops")
  - ctx.stat("Wood gained", ctx._.selectedActor.wood_yield ?? 0)
  - ctx.log("Timber! The tree comes crashing down.", "success")
mine:
  - ADD experience: 3
  - ctx.stat("Digs")
  - ctx.log("Ore glimmers in the darkness.", "success")
fish:
  - ctx.stat("Casts")
  - ctx.stat("Catch (kg)", ctx._.selectedActor.weight_kg ?? 0)
  - ctx.log("Got a bite!", "success")
cook:
  - ADD cooking: 2
  - ctx.stat("Dishes served")
  - ctx.log("A steaming dish is ready to serve.", "success")
explore:
  - DAMAGE hp: 15
  - ctx.stat("Rooms explored")
  - ctx.log("The path ahead slowly clears...", "step")
rest:
  - HEAL hp: 20
  - ctx.log("You sit down and catch your breath.", "info")
# Named pipelines with //#pos — mount before / after "explore":
# Inside a string pipeline, use raw JS (NOT COM macros like HEAL / DAMAGE).
bless: |
  //#pos 5 before explore
  ctx.log(ctx._.selectedActor.name + " is blessed with courage!", "info")
  ctx._.selectedActor.hp = Math.min(ctx._.selectedActor.max_hp ?? 100, (ctx._.selectedActor.hp ?? 0) + 10)
aftermath: |
  //#pos 5 after explore
  ctx.stat("Dungeon cleared")
  ctx.log("The dust settles. " + (ctx._.env.room_count ?? "?") + " rooms remain.", "step")
# pos can also be set via a bare object step in a **batch** pipeline (no | indicator):
ready_gear:
  - pos: "10 before explore"
  - "ctx.log('Checking equipment...', 'step')"
```

> Pipelines can also be written in JSON5.  Strings here use standard JSON escaping.

```json5
{
  is: "pipelines",
  "trade_items": [
    "ctx.stat(\"Trades\")",
    "ctx.log(\"Trade complete.\", \"info\")"
  ],
  "inspect": [
    "ctx.log(\"You take a careful look around.\", \"step\")"
  ]
}
```

---

### Pipeline Ordering — `pos` and Hooks

By default every pipeline runs **after** a virtual pipeline called `prepare`.  You can
change when a pipeline executes by setting its **position** (`pos`).

The `pos` value is a string of whitespace-separated tokens:

```
pos = "<priority> <after|before|append|prepend> <target pipeline>"
```

| Token | Meaning | Default |
|-------|---------|---------|
| `<number>` | Priority (lower = earlier when multiple share the same mount point) | `16` |
| `after` / `append` | Mount **after** the target | `after` |
| `before` / `prepend` | Mount **before** the target | — |
| `<name>` | Target pipeline to hook onto | `prepare` |

#### Two ways to set `pos`

**Method 1 — `//#pos` comment in a string pipeline (`|` indicator):**

```yaml
bless: |
  //#pos 5 before explore
  ctx.log(ctx._.selectedActor.name + " is blessed!", "info")
  ctx._.selectedActor.hp = Math.min(ctx._.selectedActor.max_hp ?? 100, (ctx._.selectedActor.hp ?? 0) + 10)
```

The `//#pos` line is recognized during registration, then ignored at runtime
(it's a JavaScript comment).  The rest of the string is evaluated as raw JavaScript
by `new Function` — so you write plain JS, **NOT** COM macros.

**Method 2 — bare object step in a batch pipeline (NO `|` indicator):**

```yaml
ready_gear:
  - pos: "10 before explore"
  - "ctx.log('Checking equipment...', 'step')"
```

Without `|`, the value is a YAML list → the runtime treats it as a **batch** pipeline.
An item with only a `pos` key is treated as a position directive during registration
and silently skipped during execution (it is not a COM command).  Subsequent items are
string or object steps executed normally.

> **Key difference:** `|` makes the value a **string pipeline** (one `new Function` call
> wrapping the entire text — COM macros CANNOT be used here).  Omitting `|` makes it a
> **batch pipeline** (list of steps, each processed individually — COM macros like
> `DAMAGE hp: 15` are recognized via `ExecKeyValue`).

#### The `pre` and `post` hooks

Two special pipelines run **before and after every operation**:

| Pipeline | When it runs |
|----------|-------------|
| `pre`    | Before **every** op's main pipeline |
| `post`   | After **every** op's main pipeline |

They are always created as pass-throughs unless you define them.  Here we define both
to add a stat counter and log bookend messages:

```yaml
pre: |
  ctx.stat("Total actions")
  ctx.log("--- Before action ---", "step")
post: |
  ctx.log("--- After action ---", "step")
```

#### Execution order for "Explore"

With all the hooks defined, clicking **Explore** runs this sequence:

```
pre                              (inherited pre-hook)
  → ready_gear  (priority 10, before explore)
  → bless       (priority  5, before explore)
  → explore     (the main pipeline)
  → aftermath   (priority  5, after  explore)
post                             (inherited post-hook)
```

> **Tip:** `pos` is purely about **when**, not **what**.  The pipeline body is never
> altered — `pos` simply changes the order in which pipelines are concatenated.

```json5

---

## COM — Convenience Macros

**COM** commands are shortcuts that expand into JavaScript at runtime.  When a pipeline
step like `DAMAGE hp: 20` is encountered, the runtime:

1. Looks up `DAMAGE` in the COM registry.
2. Replaces `dir` with the key (`hp`) and `value` with the number (`20`).
3. Evaluates the resulting JavaScript in the pipeline context.

This lets you write compact, readable pipeline steps instead of raw JS every time.

| Macro | Meaning |
|-------|---------|
| `ADD`    | `selectedActor[dir] += value` |
| `SET`    | `selectedActor[dir]  = value` |
| `MUL`    | `selectedActor[dir] *= value` |
| `DAMAGE` | `selectedActor[dir] -= value` (generic — can target any numeric property) |
| `HEAL`   | `selectedActor.hp += value`, capped at `max_hp` (hardcoded to `hp` on purpose) |

The COM definitions themselves are YAML/JSON5 blocks with `is: com`.  Each key is the
macro name; each value is the JavaScript body (use `dir` for the property and `value`
for the number).

```yaml
is: com
ADD: |
  ctx._.selectedActor[dir] = (ctx._.selectedActor[dir] ?? 0) + value
SET: "ctx._.selectedActor[dir] = value"
MUL: "ctx._.selectedActor[dir] = (ctx._.selectedActor[dir] ?? 1) * value"
```

```json5
{
  is: "com",
  DAMAGE: "ctx._.selectedActor[dir] = (ctx._.selectedActor[dir] ?? 0) - value",
  HEAL:   "ctx._.selectedActor.hp = Math.min(ctx._.selectedActor.max_hp ?? 100, (ctx._.selectedActor.hp ?? 0) + value)"
}
```

---

## Enums

**Enums** define selectable value sets.  They are lookup tables where the **key** is the
stored value and the **value** is the human-readable label shown in dropdowns.

### Binding enums to fields

1. Define the enum set in an `is: enums` block (any language).
2. In an `is: schemas` block, set a field's `type` to `enum:<EnumName>`.

The field stores the **key**, and the UI displays the **label**.

```yaml
is: enums
role:
  Miner: Miner
  Foreman: Foreman
  Hauler: Hauler
  Chef: Chef
  Apprentice: Apprentice
  Warrior: Warrior
  Mage: Mage
  Rogue: Rogue
seasons:
  spring: Spring
  summer: Summer
  autumn: Autumn
  winter: Winter
weathers:
  sunny: Sunny
  cloudy: Cloudy
  rainy: Rainy
  stormy: Stormy
danger:
  1: Safe
  2: Cautious
  3: Risky
  4: Deadly
  5: Hopeless
```

```json5
{
  is: "enums",
  rarity: { common: "Common", uncommon: "Uncommon", rare: "Rare", legendary: "Legendary" }
}
```

---

## Data — Object References

**Data blocks** are reference datasets.  They work like enums, but each entry is a full
object with a `title` and `desc` plus any extra fields.  Use them for items, locations,
spells, etc.

### Binding data to fields

1. Define the data block with `is: <BlockName>`.
2. In a schema, set a field's `type` to `objectref:<BlockName>`.

The field stores a key into the block (e.g. `tools.pickaxe` or just `pickaxe`).

```yaml
is: tools
axe:
  title: Iron Axe
  desc: A lumberjack's trusted companion
  durability: 100
  efficiency: 1.0
pickaxe:
  title: Iron Pickaxe
  desc: A miner's essential tool
  durability: 80
  efficiency: 1.0
fishing_rod:
  title: Bamboo Rod
  desc: A classic gear for riverside fishing
  durability: 60
  efficiency: 1.0
```

```json5
{
  is: "locations",
  north_forest: { title: "North Slope",    desc: "A lush wooded slope, perfect for chopping firewood" },
  mine_cave:    { title: "Greenvale Mine", desc: "A winding shaft rich in iron ore" },
  riverside:    { title: "Riverside",      desc: "Clear waters teeming with fish" },
  inn_kitchen:  { title: "Inn Kitchen",    desc: "A fully stocked kitchen ready for action" },
  mist_forest:  { title: "Misty Woods",    desc: "An ominous forest shrouded in perpetual fog" }
}
```

---

## Schemas

**Schemas** define how properties are displayed and edited in the UI.  Each schema entry
describes a single field.

### Available types

| Type | Renders as |
|------|-----------|
| `string`  | Text input |
| `int`     | Number input (integer) |
| `float`   | Number input (decimal) |
| `boolean` | Checkbox / toggle |
| `enum:<Name>` | Dropdown, values from `is: enums` block named `<Name>` |
| `objectref:<Name>` | Dropdown, entries from `is: <Name>` data block |

### Special flags

| Flag | Effect |
|------|--------|
| `readOnly: true` | Field is visible but not editable |

Schemas for `env` and `actor` are placed under their respective keys.  Blocks in different
languages merge: the YAML block below defines the core fields, while the TOML block adds
supplementary fields (`weight_kg`, `wood_yield`, `age`, ...).

```yaml
is: schemas
env:
  season:
    type: enum:seasons
    label: Season
  weather:
    type: enum:weathers
    label: Weather
  danger_level:
    type: enum:danger
    label: Danger
  location:
    type: objectref:locations
    label: Location

actor:
  id:
    type: string
    label: ID
    readOnly: true
  name:
    type: string
    label: Name
  role:
    type: enum:role
    label: Role
  tool:
    type: objectref:tools
    label: Tool
  STR:
    type: int
    label: Strength
  DEX:
    type: int
    label: Dexterity
  WIL:
    type: int
    label: Willpower
  hp:
    type: int
    label: HP
  experience:
    type: int
    label: EXP
```

```toml
is = "schemas"

[actor.weight_kg]
type = "float"
label = "Weight (kg)"

[actor.wood_yield]
type = "int"
label = "Wood Yield"

[actor.age]
type = "int"
label = "Age"

[actor.rarity]
type = "enum:rarity"
label = "Rarity"

[actor.cooking]
type = "int"
label = "Cooking"

[actor.mp]
type = "int"
label = "MP"
```
