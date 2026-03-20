# Confetti Properties Reference

This project has two layers of settings:

- **Scene settings**: shared canvas/background settings.
- **Effect settings**: one confetti “emitter”. A scene can contain multiple effects.

All numeric ranges are additionally clamped/sanitized in code.

## Scene properties (`SceneConfig`)

### `background`
- **Type**: `"solid" | "transparent"`
- **What it does**:
  - `"solid"`: fills the canvas with `backgroundColor` before playing/recording.
  - `"transparent"`: clears the canvas each time (no fill).
- **Notes**:
  - For transparent captures, your output WebM still has an opaque background in many players/editors. If you need true alpha workflows, you’ll typically composite differently (outside the scope of this tool).

### `backgroundColor`
- **Type**: `string` (CSS color, typically hex like `#0b0b10`)
- **What it does**: the fill color used when `background` is `"solid"`.
- **Tips**:
  - Dark backgrounds make bright confetti colors pop and reduce compression artifacts.

### `effects`
- **Type**: `EffectConfig[]`
- **What it does**: the list of confetti effects that will run **together** when you click Play/Record.

## Effect properties (`EffectConfig`)

### `name`
- **Type**: `string`
- **What it does**: label used in the Effects dropdown and export.
- **Tips**:
  - Use names like `"Left burst"`, `"Right fountain"`, `"Top sparkle"` for clarity.

### `mode`
- **Type**: `"burst" | "fountain"`
- **What it does**:
  - `"burst"`: emits once, then waits out the remainder of the duration.
  - `"fountain"`: continuously emits for the entire duration (roughly 30 emissions/second).
- **When to use**:
  - **Burst**: quick “pop” moment (logos, reveals).
  - **Fountain**: sustained celebration / confetti rain.

### `durationSeconds`
- **Type**: `number`
- **Range**: `0.25` to `120`
- **What it does**:
  - For **burst**: total time to keep the effect “active” (emits one or more bursts over this window).
  - For **fountain**: how long to keep emitting.
- **Recording behavior**:
  - When recording multiple effects, recording lasts for the **longest** `durationSeconds` among all effects.

### `burstCount`
- **Type**: `number`
- **Range**: `1` to `50`
- **What it does**: how many **separate bursts** happen over `durationSeconds` (Burst mode only).
- **How it works**:
  - `1`: current behavior — a single burst, then wait.
  - `>1`: bursts are spaced evenly across the duration.
    - Example: `durationSeconds = 4`, `burstCount = 4` → roughly one burst every second.

### `particleCount`
- **Type**: `number`
- **Range**: `1` to `2000`
- **What it does**:
  - For **burst**: particles emitted in the single shot.
  - For **fountain**: particles emitted per emission tick (many times per second), so values add up fast.
- **Tips**:
  - Fountain particle counts often need to be much lower than burst counts.

### `spread`
- **Type**: `number`
- **Range**: `0` to `360`
- **What it does**: how wide the emission cone is.
  - Low spread: tighter stream.
  - High spread: wide spray (up to full circle).

### `startVelocity`
- **Type**: `number`
- **Range**: `0` to `200`
- **What it does**: the initial speed of particles at emission.
- **Tips**:
  - Higher velocity makes particles travel farther before gravity pulls them down.

### `gravity`
- **Type**: `number`
- **Range**: `-5` to `10`
- **What it does**: vertical acceleration applied to particles over time.
  - Higher gravity: particles fall faster.
  - Lower gravity: floatier.
  - Negative gravity: particles rise (use sparingly).

### `scalar`
- **Type**: `number`
- **Range**: `0.1` to `10`
- **What it does**: particle size multiplier.
- **Tips**:
  - If you increase `scalar`, you can usually reduce `particleCount` to keep the image readable.

### `decay`
- **Type**: `number`
- **Range**: `0.5` to `1`
- **What it does**: how quickly particle velocity slows down over time.
  - Lower decay (closer to `0.5`): slows faster, more “drag”.
  - Higher decay (closer to `1`): maintains speed longer.
- **Interaction**:
  - High `startVelocity` + high `decay` + low `gravity` = long travel / floaty.

### `fountainTicks`
- **Type**: `number`
- **Range**: `30` to `2000`
- **What it does**: particle lifetime for **Fountain** mode (how long each emitted batch keeps animating).
- **How it feels**:
  - Higher ticks: longer “streams” / longer lingering particles.
  - Lower ticks: shorter, snappier fountain.
- **Notes**:
  - This only affects **Fountain** mode; Burst uses its own default lifetime behavior.

### `angle`
- **Type**: `number`
- **Range**: `0` to `360`
- **What it does**: emission direction in degrees.
  - `90` shoots upward, `0` shoots right, `180` shoots left, `270` shoots downward.
- **Tips**:
  - For side cannons: try `10–30` (from left) or `150–170` (from right).

### `originX`
- **Type**: `number`
- **Range**: `0` to `1`
- **What it does**: horizontal spawn point as a fraction of canvas width.
  - `0` left edge, `0.5` center, `1` right edge.

### `originY`
- **Type**: `number`
- **Range**: `0` to `1`
- **What it does**: vertical spawn point as a fraction of canvas height.
  - `0` top edge, `1` bottom edge.
- **Tips**:
  - For fountains, `0.85–0.98` is common so particles start near the bottom.

### `shapes`
- **Type**: `("square" | "circle")[]`
- **What it does**: the particle shape set used by the effect.
- **Notes**:
  - If none are selected, the app falls back to a default set.

### `colors`
- **Type**: `string[]` (hex strings recommended)
- **What it does**: palette used to color particles. Each particle picks from this list.
- **Tips**:
  - Fewer colors can look more “designed” (brand palette).
  - More colors can look more “party”.

## Practical recipes (quick starting points)

### Two-sided cannons
- **Effect A**: `originX=0.05`, `angle=15`, `spread=60`, `particleCount=180`
- **Effect B**: `originX=0.95`, `angle=165`, `spread=60`, `particleCount=180`

### Burst + fountain combo
- **Effect A (burst)**: big `particleCount`, shorter `durationSeconds`
- **Effect B (fountain)**: low `particleCount`, longer `durationSeconds`, origin near bottom

