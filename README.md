# magnetType

[![npm](https://img.shields.io/npm/v/%40liiift-studio%2Fmagnettype.svg)](https://www.npmjs.com/package/@liiift-studio/magnettype) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![part of liiift type-tools](https://img.shields.io/badge/liiift-type--tools-blueviolet)](https://github.com/Liiift-Studio/type-tools)

CSS `font-variation-settings` applies a single value to the whole element — there is no native way to drive axis values per word from cursor proximity, to selectively widen visually confusable characters for legibility, or to vary weight per-character across a block element. magnetType adds all three.

**[magnettype.com](https://magnettype.com)** · [npm](https://www.npmjs.com/package/@liiift-studio/magnettype) · [GitHub](https://github.com/Liiift-Studio/MagnetType)

TypeScript · Zero dependencies · React + Vanilla JS

---

## Install

```bash
npm install @liiift-studio/magnettype
```

> **Variable font required:** magnetType sets `font-variation-settings` per word or per character. The target font must support the axes you specify (e.g. a font with a `wght` axis for weight-based effects, or a `wdth` axis for legibility mode). The effect is invisible with non-variable fonts.

---

## Usage

### React — field mode (`MagnetTypeText`)

Per-word cursor-proximity weight variation driven by a continuous rAF loop.

```tsx
import { MagnetTypeText } from '@liiift-studio/magnettype'

<MagnetTypeText
  mode="field"
  axes={{ wght: [300, 700] }}
  radius={150}
  falloff="quadratic"
  magnetMode="attract"
>
  Your paragraph text here...
</MagnetTypeText>
```

### React — block mode (`MagnetBlock`)

Per-character cursor-proximity weight variation. Works with mixed content (inline elements, links, `<code>`, etc.) inside any block element. Characters are wrapped as React elements — no DOM mutation.

```tsx
import { MagnetBlock } from '@liiift-studio/magnettype'

// Per-character spread — each character responds to cursor distance
<MagnetBlock
  spreadRadius={200}
  minWeight={300}
  maxWeight={700}
>
  Typography that responds to presence.
</MagnetBlock>

// Whole-element gate — the effect only activates when the cursor is within proximityRadius of the element edge
<MagnetBlock
  proximityRadius={120}
  minWeight={300}
  maxWeight={700}
>
  Weight rises when the cursor enters.
</MagnetBlock>

// Both combined — proximity gates the spread effect
<MagnetBlock
  proximityRadius={200}
  spreadRadius={120}
  minWeight={300}
  maxWeight={700}
>
  Only spreads when the cursor is close.
</MagnetBlock>
```

**`MagnetBlock` props:**

| Prop | Default | Description |
|------|---------|-------------|
| `as` | `'p'` | HTML element to render — `'h1'`, `'div'`, `'span'`, etc. |
| `minWeight` | `300` | `wght` axis value at rest (cursor beyond any radius) |
| `maxWeight` | `600` | `wght` axis value at peak (cursor directly over the character) |
| `spreadRadius` | — | Pixel distance from the cursor within which each **character's** weight rises to `maxWeight`. When omitted, per-character splitting is skipped |
| `proximityRadius` | — | Pixel distance from the element **edge** that gates the effect. Without `spreadRadius`, drives a whole-element weight ramp. With `spreadRadius`, acts as an outer gate — the spread only fires while the cursor is within this distance |
| `fixedAxes` | `{}` | Additional axis values to hold constant in every `font-variation-settings` string (e.g. `{ opsz: 144 }`) |
| `stabilizeLayout` | `true` | Apply compensating letter-spacing to prevent text reflow as weight rises. Measures the element's width at rest and peak weight via an off-screen probe and applies proportional negative letter-spacing per character. Disable if you want natural bold spacing, or if your font expands glyphs very unevenly (compensation is a per-element average) |
| `cachePositions` | `true` | Cache character centre positions in page-relative coordinates, eliminating `getBoundingClientRect` calls on every `mousemove`. Rebuilt on resize and after fonts load. Disable if the element is inside a custom scroll container (`overflow: scroll` on a non-window element) |
| `rafThrottle` | `true` | Throttle proximity updates to one per animation frame (≈ 60 fps on most displays). Disable for lowest input latency on 120 Hz displays or very fast-moving effects |
| `className` | — | Forwarded to the root element |
| `style` | — | Merged with the root element's style; `fontVariationSettings` at `minWeight` is set as the base |

### React hook — field mode

```tsx
import { useMagnetType } from '@liiift-studio/magnettype'

const ref = useMagnetType({ mode: 'field', axes: { wght: [300, 700] }, radius: 150 })
return <p ref={ref}>{children}</p>
```

The hook starts the cursor-proximity rAF loop on mount and tears it down cleanly on unmount. After fonts load (`document.fonts.ready`), the hook re-runs to ensure measurements are taken on the loaded font.

### React — legibility mode

```tsx
import { MagnetTypeText } from '@liiift-studio/magnettype'

<MagnetTypeText mode="legibility" wdthBoost={8}>
  Visually confusable characters like il1I and 0O are subtly widened.
</MagnetTypeText>
```

### Vanilla JS — field mode

```ts
import { startMagnetType, removeMagnetType, getCleanHTML } from '@liiift-studio/magnettype'

const el = document.querySelector('p')
const original = getCleanHTML(el)
const opts = { mode: 'field', axes: { wght: [300, 700] }, radius: 150 }

let stop

function run() {
  if (stop) stop()
  stop = startMagnetType(el, original, opts)
}

document.fonts.ready.then(run)

// Later — cancel the loop and restore original markup:
// stop()
// removeMagnetType(el, original)
```

### Vanilla JS — legibility mode

```ts
import { applyMagnetType, removeMagnetType, getCleanHTML } from '@liiift-studio/magnettype'

const el = document.querySelector('p')
const original = getCleanHTML(el)
const opts = { mode: 'legibility', wdthBoost: 8 }

function run() {
  applyMagnetType(el, original, opts)
}

run()
document.fonts.ready.then(run)

const ro = new ResizeObserver(() => run())
ro.observe(el)

// Later — disconnect and restore original markup:
// ro.disconnect()
// removeMagnetType(el, original)
```

### TypeScript

```ts
import type { MagnetTypeOptions, FalloffType, MagnetModeType, MagnetBlockProps } from '@liiift-studio/magnettype'

const fieldOpts: MagnetTypeOptions = {
  mode: 'field',
  axes: { wght: [300, 700], wdth: [90, 110] },
  radius: 120,
  falloff: 'quadratic' as FalloffType,
  magnetMode: 'attract' as MagnetModeType,
}

const legibilityOpts: MagnetTypeOptions = {
  mode: 'legibility',
  wdthBoost: 6,
}
```

---

## Field mode options (`MagnetTypeText` / `useMagnetType` / vanilla JS)

| Option | Default | Description |
|--------|---------|-------------|
| `mode` | `'field'` | `'field'` — cursor proximity drives per-word `font-variation-settings` via a continuous rAF loop. `'legibility'` — static per-character `wdth` boost on visually confusable characters |
| `axes` | `{ wght: [300, 500] }` | *(field mode)* Map of axis tag → `[restValue, peakValue]` |
| `radius` | `120` | *(field mode)* Pixel radius over which the field effect fades from each word's centre |
| `falloff` | `'quadratic'` | *(field mode)* `'linear'` or `'quadratic'` falloff curve |
| `magnetMode` | `'attract'` | *(field mode)* `'attract'` — near words approach `peakValue`. `'repel'` — near words stay at `restValue`, far words approach `peakValue` |
| `wdthBoost` | `6` | *(legibility mode)* `wdth` units added to confusable characters, scaled by risk: `il1I` (risk 3) get the full boost; `r 0 O` (risk 2) get ⅔; `n m o b d p q c e` (risk 1) get ⅓ |
| `transitionMs` | `0` | Duration in ms for CSS transition back to rest when cursor leaves. `0` = instant snap. Cleared on the next `mousemove` so live tracking is not delayed |
| `as` | `'p'` | HTML element to render. *(React component only)* |

---

## How it works

### Field mode

On activation, magnetType wraps each word in an `mt-word` span. A `mousemove` listener records cursor coordinates, and a `requestAnimationFrame` loop runs while the cursor is inside the element. Each frame, the loop batch-reads every word span's `getBoundingClientRect`, computes Euclidean distance from cursor to word centre, and maps it through the falloff formula:

```
normalised = max(0, 1 − distance / radius)
strength   = normalised² (quadratic) or normalised (linear)
```

Each word's `font-variation-settings` interpolates between `restValue` and `peakValue` at that strength. Reads are batched before writes on every frame to avoid layout thrashing. When the cursor leaves, one final frame resets all words to `restValue`.

### Block mode (`MagnetBlock`)

`MagnetBlock` splits string children into per-character `<span>` elements during the React render pass using `useMemo` — no DOM mutation. Callback refs collect each span element. On `mousemove` (and on `scroll`, using the stored last position), the component reads each span's `getBoundingClientRect`, computes cursor-to-character-centre distance, and sets `font-variation-settings` directly on the span's style. This is passive and batched per frame via the event handler.

`proximityRadius` measures cursor distance to the element **edge** (not its centre) — useful as an outer gate so the effect only fires when the cursor is actually near the block. `spreadRadius` measures cursor distance to each **character centre** — controls how wide the weight gradient spreads around the cursor within the block. Both are independent and combinable.

### Legibility mode

magnetType scans text nodes recursively and checks each character against a built-in confusable character table. Confusable characters are wrapped in `mt-char` spans with a `wdth` boost proportional to risk level. Non-confusable characters pass through as plain text nodes.

### No layout shift

Field mode and block mode drive only `font-variation-settings` on per-word or per-character spans. If you use only a `wght` axis, advance widths are unaffected and no reflow occurs. If you include a `wdth` axis, character advance widths change and lines may reflow — consider constraining axis ranges or pairing with a `scaleX` transform.

### `prefers-reduced-motion`

Field mode respects `prefers-reduced-motion: reduce`. If the media query matches at activation time, the function returns immediately without wrapping words or starting the rAF loop. Legibility mode and block mode are not affected.

---

## Dev notes

### `next` in root devDependencies

`package.json` at the repo root lists `next` as a devDependency. This is a **Vercel detection workaround** — not a real dependency of the npm package. Vercel's build system inspects the root `package.json` to detect the framework; without `next` present it falls back to a static build and skips the Next.js pipeline, breaking the `/site` subdirectory deploy.

The package itself has zero runtime dependencies. Do not remove this entry.

---

## Future improvements

- **Custom confusable table** — allow callers to pass their own `Record<string, number>` to override or extend the built-in character risk map
- **Axis clamping** — optional per-axis min/max clamp to prevent values from exceeding a font's supported range
- **SSR hydration** — pre-render legibility mode markup on the server so boosted characters are present from first paint

---

Current version: 1.1.6
