// magnetType/src/core/adjust.ts — framework-agnostic magnetType algorithm
import { MAGNET_TYPE_CLASSES, CONFUSABLE, type MagnetTypeOptions } from './types'

// ─── Resolved defaults ────────────────────────────────────────────────────────

const DEFAULTS = {
	mode: 'field' as const,
	axes: { wght: [300, 500] as [number, number] },
	radius: 120,
	falloff: 'quadratic' as const,
	magnetMode: 'attract' as const,
	wdthBoost: 6,
}

// ─── Shared utilities ─────────────────────────────────────────────────────────

/**
 * Collect all text nodes in a subtree using recursive childNodes traversal.
 * Intentionally avoids createTreeWalker — it skips inline elements in happy-dom 12.
 */
function collectTextNodes(node: Node, result: Text[] = []): Text[] {
	if (node.nodeType === Node.TEXT_NODE) {
		result.push(node as Text)
	} else {
		node.childNodes.forEach((child) => collectTextNodes(child, result))
	}
	return result
}

/**
 * Override a single axis value inside a font-variation-settings string,
 * preserving all other axis values. Adds the axis if it is not already present.
 */
function overrideAxis(baseFVS: string, axis: string, value: number): string {
	if (!baseFVS || baseFVS === 'normal') return `"${axis}" ${value}`
	const pattern = new RegExp(`(["'])${axis}\\1\\s+[\\d.eE+-]+`)
	const replacement = `"${axis}" ${value}`
	return pattern.test(baseFVS)
		? baseFVS.replace(pattern, replacement)
		: `${baseFVS}, ${replacement}`
}

/**
 * Override multiple axes at once in a font-variation-settings string.
 * Applies each axis in the provided map, preserving all others.
 */
function overrideAxes(baseFVS: string, axes: Record<string, number>): string {
	let fvs = baseFVS
	for (const [axis, value] of Object.entries(axes)) {
		fvs = overrideAxis(fvs, axis, value)
	}
	return fvs
}

// ─── getCleanHTML ─────────────────────────────────────────────────────────────

/**
 * Returns the innerHTML of an element with all magnetType injected markup removed,
 * unwrapping their children in place. Safe to call multiple times — idempotent.
 */
export function getCleanHTML(el: HTMLElement): string {
	const clone = el.cloneNode(true) as HTMLElement
	const injected = clone.querySelectorAll(
		`.${MAGNET_TYPE_CLASSES.word}, .${MAGNET_TYPE_CLASSES.char}`,
	)
	// Iterate in reverse order to safely handle nested spans.
	const nodes = Array.from(injected).reverse()
	nodes.forEach((node) => {
		const parent = node.parentNode
		if (!parent) return
		while (node.firstChild) parent.insertBefore(node.firstChild, node)
		parent.removeChild(node)
	})
	return clone.innerHTML
}

// ─── removeMagnetType ─────────────────────────────────────────────────────────

/**
 * Remove magnetType markup and restore the element to its original HTML.
 *
 * @param element      - The element that was previously modified
 * @param originalHTML - The snapshot passed to applyMagnetType
 */
export function removeMagnetType(element: HTMLElement, originalHTML: string): void {
	element.innerHTML = originalHTML
}

// ─── applyMagnetType (legibility mode) ───────────────────────────────────────

/**
 * Apply per-character wdth boost to visually confusable characters (legibility mode).
 *
 * Wraps each character in a span with a boosted wdth axis value proportional to
 * the character's confusion risk level. Non-confusable characters are left unwrapped.
 *
 * @param element      - Target element (must be in the live DOM and visible)
 * @param originalHTML - Clean HTML snapshot from getCleanHTML()
 * @param options      - MagnetTypeOptions; only wdthBoost is used here
 */
export function applyMagnetType(
	element: HTMLElement,
	originalHTML: string,
	options: MagnetTypeOptions = {},
): void {
	if (typeof window === 'undefined') return

	// Save scroll position — iOS Safari does not support overflow-anchor: none
	const scrollY = window.scrollY

	const wdthBoost = options.wdthBoost ?? DEFAULTS.wdthBoost

	// --- Pass 1: Reset (idempotent) ---
	element.innerHTML = originalHTML

	// --- Pass 2: Collect text nodes via recursive childNodes ---
	const textNodes = collectTextNodes(element)

	// --- Pass 3: Read base wdth from computed style ---
	const baseFVS = getComputedStyle(element).fontVariationSettings

	// --- Pass 4: Wrap each character in confusable runs ---
	for (const textNode of textNodes) {
		const text = textNode.textContent ?? ''
		if (!text) continue

		// Check if any characters in this node need wrapping.
		const hasConfusable = text.split('').some((ch) => ch in CONFUSABLE)
		if (!hasConfusable) continue

		const fragment = document.createDocumentFragment()

		for (const ch of text) {
			const riskLevel = CONFUSABLE[ch]
			if (riskLevel === undefined) {
				// Non-confusable: emit as plain text node
				const last = fragment.lastChild
				if (last && last.nodeType === Node.TEXT_NODE) {
					// Append to existing trailing text node to avoid proliferating nodes
					;(last as Text).textContent += ch
				} else {
					fragment.appendChild(document.createTextNode(ch))
				}
			} else {
				// Confusable: wrap in a char span with proportional wdth boost
				const boost = wdthBoost * (riskLevel / 3)
				const span = document.createElement('span')
				span.className = MAGNET_TYPE_CLASSES.char

				// Parse current wdth from baseFVS, defaulting to 100 if absent
				const wdthMatch = baseFVS.match(/"wdth"\s+([\d.eE+-]+)/)
				const baseWdth = wdthMatch ? parseFloat(wdthMatch[1]) : 100
				const newWdth = baseWdth + boost

				span.style.fontVariationSettings = overrideAxis(baseFVS, 'wdth', newWdth)
				span.textContent = ch
				fragment.appendChild(span)
			}
		}

		textNode.parentNode!.replaceChild(fragment, textNode)
	}

	// --- Pass 5: Restore scroll via rAF ---
	requestAnimationFrame(() => {
		if (typeof window !== 'undefined' && Math.abs(window.scrollY - scrollY) > 2) {
			window.scrollTo({ top: scrollY, behavior: 'instant' })
		}
	})
}

// ─── startMagnetType (field mode) ────────────────────────────────────────────

/**
 * Start the cursor-field effect on an element.
 *
 * Wraps each word in a span, then listens for mousemove events to drive per-word
 * font-variation-settings based on cursor distance. Uses a requestAnimationFrame
 * loop for smooth axis interpolation. Resets all words to restValue on mouseleave.
 *
 * @param element      - Target element (must be in the live DOM and visible)
 * @param originalHTML - Clean HTML snapshot from getCleanHTML()
 * @param options      - MagnetTypeOptions; axes, radius, falloff, magnetMode are used
 * @returns            - A stop function. Call it to cancel the rAF loop and restore markup.
 */
export function startMagnetType(
	element: HTMLElement,
	originalHTML: string,
	options: MagnetTypeOptions = {},
): () => void {
	if (typeof window === 'undefined') return () => {}

	// Check prefers-reduced-motion — skip animation entirely if requested
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
		element.innerHTML = originalHTML
		return () => {}
	}

	const axes: Record<string, [number, number]> = options.axes ?? DEFAULTS.axes
	const radius = options.radius ?? DEFAULTS.radius
	const falloff = options.falloff ?? DEFAULTS.falloff
	const magnetMode = options.magnetMode ?? DEFAULTS.magnetMode

	// Save scroll — iOS Safari does not support overflow-anchor: none
	const scrollY = window.scrollY

	// --- Pass 1: Reset (idempotent) ---
	element.innerHTML = originalHTML

	// --- Pass 2: Wrap each word in a span ---
	const textNodes = collectTextNodes(element)
	const wordSpans: HTMLElement[] = []

	for (const textNode of textNodes) {
		const text = textNode.textContent ?? ''
		if (!text.trim()) continue

		// Split into alternating [whitespace, word, whitespace, word, …] tokens
		const tokens = text.split(/(\S+)/)
		const fragment = document.createDocumentFragment()

		for (let i = 0; i < tokens.length; i += 2) {
			const space = tokens[i]
			const word = tokens[i + 1]
			if (!word) continue

			// Include trailing whitespace in the last word of this text node
			const isLastWord = tokens[i + 3] === undefined
			const trailingSpace = isLastWord ? (tokens[i + 2] ?? '') : ''

			const span = document.createElement('span')
			span.className = MAGNET_TYPE_CLASSES.word
			span.textContent = space + word + trailingSpace
			fragment.appendChild(span)
			wordSpans.push(span)
		}

		textNode.parentNode!.replaceChild(fragment, textNode)
	}

	// --- Pass 3: Restore scroll after DOM mutation ---
	requestAnimationFrame(() => {
		if (typeof window !== 'undefined' && Math.abs(window.scrollY - scrollY) > 2) {
			window.scrollTo({ top: scrollY, behavior: 'instant' })
		}
	})

	if (wordSpans.length === 0) return () => {}

	// Read base fontVariationSettings from element once (preserves parent axes)
	const baseFVS = getComputedStyle(element).fontVariationSettings

	// Apply restValues immediately (before any cursor interaction)
	const restFVS = overrideAxes(
		baseFVS,
		Object.fromEntries(Object.entries(axes).map(([tag, [rest]]) => [tag, rest])),
	)
	wordSpans.forEach((span) => {
		span.style.fontVariationSettings = restFVS
	})

	// --- rAF loop state ---
	let cursorX = -9999
	let cursorY = -9999
	let cursorInside = false
	let rafId = 0
	let active = true

	/**
	 * Map a [0,1] normalised strength to the per-axis value,
	 * accounting for attract vs repel mode.
	 */
	function axisValue(tag: string, strength: number): number {
		const [rest, peak] = axes[tag] ?? [300, 500]
		// strength=1 = cursor is directly over word, strength=0 = beyond radius
		const t = magnetMode === 'repel' ? 1 - strength : strength
		return rest + (peak - rest) * t
	}

	function frame(): void {
		if (!active) return

		if (!cursorInside) {
			// Cursor left — reset to restValues
			wordSpans.forEach((span) => {
				span.style.fontVariationSettings = restFVS
			})
			rafId = 0
			return
		}

		// Batch-read word span centers, then write fontVariationSettings
		const rects = wordSpans.map((span) => span.getBoundingClientRect())

		wordSpans.forEach((span, i) => {
			const rect = rects[i]
			const cx = rect.left + rect.width / 2
			const cy = rect.top + rect.height / 2
			const dist = Math.sqrt((cursorX - cx) ** 2 + (cursorY - cy) ** 2)

			// Normalise: strength=1 at dist=0, strength=0 at dist>=radius
			const normalised = Math.max(0, 1 - dist / radius)
			const strength = falloff === 'quadratic' ? normalised * normalised : normalised

			const perAxisValues: Record<string, number> = {}
			for (const tag of Object.keys(axes)) {
				perAxisValues[tag] = axisValue(tag, strength)
			}

			span.style.fontVariationSettings = overrideAxes(baseFVS, perAxisValues)
		})

		rafId = requestAnimationFrame(frame)
	}

	function onMouseMove(e: MouseEvent): void {
		cursorX = e.clientX
		cursorY = e.clientY
		if (!cursorInside) {
			cursorInside = true
		}
		if (rafId === 0) {
			rafId = requestAnimationFrame(frame)
		}
	}

	function onMouseLeave(): void {
		cursorInside = false
		// frame() will handle the reset on the next tick
		if (rafId === 0) {
			rafId = requestAnimationFrame(frame)
		}
	}

	element.addEventListener('mousemove', onMouseMove)
	element.addEventListener('mouseleave', onMouseLeave)

	return () => {
		active = false
		cancelAnimationFrame(rafId)
		element.removeEventListener('mousemove', onMouseMove)
		element.removeEventListener('mouseleave', onMouseLeave)
		element.innerHTML = originalHTML
	}
}
