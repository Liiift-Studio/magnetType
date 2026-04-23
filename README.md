# magnetType

[![npm](https://img.shields.io/npm/v/%40liiift-studio%2Fmagnettype.svg)](https://www.npmjs.com/package/@liiift-studio/magnettype) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![part of liiift type-tools](https://img.shields.io/badge/liiift-type--tools-blueviolet)](https://github.com/Liiift-Studio/type-tools)

CSS `font-variation-settings` applies a single value to the whole element — there is no native way to drive axis values per word from cursor proximity, or to selectively widen visually confusable characters for legibility. magnetType adds both.

**[magnettype.com](https://magnettype.com)** · [npm](https://www.npmjs.com/package/@liiift-studio/magnettype) · [GitHub](https://github.com/Liiift-Studio/MagnetType)

TypeScript · Zero dependencies · React + Vanilla JS

---

## Install

```bash
npm install @liiift-studio/magnettype
```

---

## Usage

> **Next.js App Router:** this library uses browser APIs. Add `"use client"` to any component file that imports from it.

> **Variable font required:** magnetType sets `font-variation-settings` per word or per character. The target font must support the axes you specify (e.g. a font with a `wght` axis for weight-based field effects, or a `wdth` axis for legibility mode). The effect is invisible with fonts that do not have variable axis support.

### React component — field mode

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

### React hook — field mode

```tsx
import { useMagnetType } from '@liiift-studio/magnettype'

// Inside a React component:
const ref = useMagnetType({ mode: 'field', axes: { wght: [300, 700] }, radius: 150 })
return <p ref={ref}>{children}</p>
```

The hook starts the cursor-proximity rAF loop on mount and tears it down cleanly on unmount. In field mode, no `ResizeObserver` is needed — the loop reads live `getBoundingClientRect` positions on every frame. After fonts load (`document.fonts.ready`), the hook re-runs to ensure measurements are taken on the loaded font.

### React component — legibility mode

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
import type { MagnetTypeOptions, FalloffType, MagnetModeType } from '@liiift-studio/magnettype'

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

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `mode` | `'field'` | `'field'` — cursor proximity drives per-word `font-variation-settings` via a continuous rAF loop. `'legibility'` — static per-character `wdth` boost applied to visually confusable characters; no cursor interaction needed |
| `axes` | `{ wght: [300, 500] }` | *(field mode only)* Map of axis tag → `[restValue, peakValue]`. `restValue` is applied when the cursor is beyond the radius; `peakValue` when the cursor is directly over the word. Multiple axes are supported simultaneously |
| `radius` | `120` | *(field mode only)* Pixel radius over which the field effect fades. Words with their centre beyond this distance from the cursor receive `restValue` |
| `falloff` | `'quadratic'` | *(field mode only)* Falloff curve. `'linear'` — strength decreases linearly with distance. `'quadratic'` — strength decreases as distance², giving a tighter hot zone and a sharper peak feel |
| `magnetMode` | `'attract'` | *(field mode only)* `'attract'` — words near the cursor approach `peakValue`. `'repel'` — words near the cursor stay at `restValue`; words farther away approach `peakValue` |
| `wdthBoost` | `6` | *(legibility mode only)* `wdth` axis units added to confusable characters, scaled by risk level. Risk 3 characters (`i l 1 I`) receive the full boost; risk 2 characters (`r 0 O`) receive ⅔; risk 1 characters (`n m o b d p q c e`) receive ⅓ |
| `transitionMs` | `0` | Duration in milliseconds for the CSS transition back to rest values when the cursor leaves (or a touch ends). `0` preserves the existing instant snap. When > 0, `font-variation-settings` animates back over the given duration using `ease` easing. The transition is cleared immediately on the next `mousemove`/`touchmove` so live tracking is not delayed |
| `as` | `'p'` | HTML element to render, e.g. `'h1'`, `'div'`, `'span'`. Accepts any valid React element type. *(React component only)* |

---

## How it works

### Field mode

On activation, magnetType wraps each word in the element in an `mt-word` span. A `mousemove` listener records the cursor's `clientX`/`clientY` coordinates, and a `requestAnimationFrame` loop runs continuously while the cursor is inside the element. Each frame, the loop batch-reads every word span's `getBoundingClientRect`, computes the Euclidean distance from the cursor to each word's centre, and maps that distance through the falloff formula to a normalised strength value in `[0, 1]`:

```
normalised = max(0, 1 − distance / radius)
strength   = normalised² (quadratic) or normalised (linear)
```

Each word's `font-variation-settings` is then set to the interpolated axis value between `restValue` and `peakValue`, with `attract` mode mapping `strength=1` to `peakValue` and `repel` mode inverting that relationship. Reads are batched before writes on every frame to avoid layout thrashing. When the cursor leaves the element, the loop fires one final frame to reset all words to `restValue`, then idles.

The base `fontVariationSettings` string is read from the computed style of the element once at startup, and each per-word override patches only the affected axes — all parent-defined axes are preserved.

### Legibility mode

magnetType scans all text nodes in the element using recursive `childNodes` traversal and checks each character against a built-in confusable character table. Confusable characters are grouped into three risk levels: `il1I` (risk 3, high confusion), `r 0 O` and related pairs (risk 2), and `n m o b d p q c e` (risk 1, low confusion). Each confusable character is wrapped in an `mt-char` span with a `wdth` axis boost proportional to its risk level — making similar-looking characters slightly wider and more distinct. Non-confusable characters pass through as plain text nodes, with adjacent non-confusable characters consolidated into single text nodes to keep the DOM lean.

### No layout shift

In field mode, the rAF loop drives only `font-variation-settings` values on per-word spans — it does not change element widths, margins, padding, or position. If you use only a `wght` axis, advance widths are not affected and no reflow occurs. If you include a `wdth` axis, character advance widths will change, which may cause lines to reflow. To prevent this, consider constraining axis ranges or combining with a `scaleX` transform on the container.

In legibility mode, the `wdth` axis boost widens individual confusable characters, which shifts surrounding characters slightly. This is intentional — the point is to make the characters physically wider and more distinct. The shift is small by default (`wdthBoost: 6`) and does not cause line breaks to change.

### `prefers-reduced-motion`

Field mode respects `prefers-reduced-motion: reduce`. If the media query matches at the time `startMagnetType` is called, the function returns immediately without wrapping words or starting the rAF loop, and returns a no-op stop function. Legibility mode is a static DOM transformation and is not affected by this preference.

---

## Dev notes

### `next` in root devDependencies

`package.json` at the repo root lists `next` as a devDependency. This is a **Vercel detection workaround** — not a real dependency of the npm package. Vercel's build system inspects the root `package.json` to detect the framework; without `next` present it falls back to a static build and skips the Next.js pipeline, breaking the `/site` subdirectory deploy.

The package itself has zero runtime dependencies. Do not remove this entry.

---

## Future improvements

- **Custom confusable table** — allow callers to pass their own `Record<string, number>` to override or extend the built-in character risk map for language- or font-specific tuning
- **Axis clamping** — optional per-axis min/max clamp to prevent axis values from exceeding a font's supported range, avoiding undefined browser rendering behaviour
- **SSR hydration** — pre-render legibility mode markup on the server so boosted characters are present from first paint without a client-side flash

---

Current version: v1.0.7
