// magnetType/src/core/adjust.ts — framework-agnostic magnetType algorithm
import { MAGNET_TYPE_CLASSES, CONFUSABLE, type MagnetTypeOptions, type MagnetTypeProps } from './types'

// ─── Resolved defaults ────────────────────────────────────────────────────────

const DEFAULTS = {
	mode: 'field' as const,
	axes: { wght: [300, 500] as [number, number] },
	radius: 120,
	falloff: 'quadratic' as const,
	magnetMode: 'attract' as const,
	wdthBoost: 6,
	scope: 'document' as const,
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

/**
 * Apply additional CSS props (opacity, italic) to a span based on cursor proximity strength.
 * strength is a [0, 1] normalised proximity value.
 */
function applyProps(span: HTMLElement, props: MagnetTypeProps, strength: number): void {
	if (props.opacity !== undefined) {
		const [restOp, peakOp] = props.opacity
		span.style.opacity = String(restOp + (peakOp - restOp) * strength)
	}
	if (props.italic === true) {
		span.style.fontStyle = strength > 0.5 ? 'italic' : ''
	}
}

/**
 * Reset additional CSS props to their rest values on a span.
 */
function resetProps(span: HTMLElement, props: MagnetTypeProps): void {
	if (props.opacity !== undefined) {
		span.style.opacity = String(props.opacity[0])
	}
	if (props.italic === true) {
		span.style.fontStyle = ''
	}
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
 * @param originalHTML - The snapshot passed to applyMagnetType / startMagnetType
 */
export function removeMagnetType(element: HTMLElement, originalHTML: string): void {
	element.innerHTML = originalHTML
}

// ─── applyMagnetType (legibility mode) ───────────────────────────────────────

/**
 * Start the legibility effect on an element.
 *
 * Wraps visually confusable characters in spans, then listens for mousemove events
 * to drive per-character wdth boost based on cursor distance. Characters near the
 * cursor receive a wdth boost proportional to their confusion risk level.
 * Resets to base wdth on mouseleave.
 *
 * Defaults to listening on document (scope: 'document'), enabling cross-paragraph
 * effects when multiple elements are independently targeted.
 *
 * @param element      - Target element (must be in the live DOM and visible)
 * @param originalHTML - Clean HTML snapshot from getCleanHTML()
 * @param options      - MagnetTypeOptions; wdthBoost, radius, falloff, scope, props used
 * @returns            - A stop function. Call it to cancel listeners and restore markup.
 */
export function applyMagnetType(
	element: HTMLElement,
	originalHTML: string,
	options: MagnetTypeOptions = {},
): () => void {
	if (typeof window === 'undefined') return () => {}

	// Check prefers-reduced-motion — skip interaction entirely if requested
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
		element.innerHTML = originalHTML
		return () => {}
	}

	const wdthBoost = options.wdthBoost ?? DEFAULTS.wdthBoost
	const radius = options.radius ?? DEFAULTS.radius
	const falloff = options.falloff ?? DEFAULTS.falloff
	const scope = options.scope ?? DEFAULTS.scope
	const props = options.props

	// Save scroll position — iOS Safari does not support overflow-anchor: none
	const scrollY = window.scrollY

	// --- Pass 1: Reset (idempotent) ---
	element.innerHTML = originalHTML

	// --- Pass 2: Read base font-variation-settings ---
	const baseFVS = getComputedStyle(element).fontVariationSettings

	// Parse current wdth from baseFVS, defaulting to 100 if absent
	const wdthMatch = baseFVS.match(/"wdth"\s+([\d.eE+-]+)/)
	const baseWdth = wdthMatch ? parseFloat(wdthMatch[1]) : 100

	// --- Pass 3: Collect text nodes and wrap confusable chars ---
	const textNodes = collectTextNodes(element)

	/** Each entry tracks the span and the character's risk level (1–3). */
	const charSpans: { span: HTMLElement; riskLevel: number }[] = []

	for (const textNode of textNodes) {
		const text = textNode.textContent ?? ''
		if (!text) continue

		const hasConfusable = text.split('').some((ch) => ch in CONFUSABLE)
		if (!hasConfusable) continue

		const fragment = document.createDocumentFragment()

		for (const ch of text) {
			const riskLevel = CONFUSABLE[ch]
			if (riskLevel === undefined) {
				// Non-confusable: emit as plain text node
				const last = fragment.lastChild
				if (last && last.nodeType === Node.TEXT_NODE) {
					;(last as Text).textContent += ch
				} else {
					fragment.appendChild(document.createTextNode(ch))
				}
			} else {
				// Confusable: wrap in a char span, starting at base wdth (no boost yet)
				const span = document.createElement('span')
				span.className = MAGNET_TYPE_CLASSES.char
				span.style.fontVariationSettings = overrideAxis(baseFVS, 'wdth', baseWdth)
				span.textContent = ch
				fragment.appendChild(span)
				charSpans.push({ span, riskLevel })
			}
		}

		textNode.parentNode!.replaceChild(fragment, textNode)
	}

	// --- Pass 4: Restore scroll after DOM mutation ---
	requestAnimationFrame(() => {
		if (typeof window !== 'undefined' && Math.abs(window.scrollY - scrollY) > 2) {
			window.scrollTo({ top: scrollY, behavior: 'instant' })
		}
	})

	if (charSpans.length === 0) return () => {}

	// Apply initial props rest values
	if (props) {
		charSpans.forEach(({ span }) => resetProps(span, props))
	}

	// --- rAF loop state ---
	let cursorX = -9999
	let cursorY = -9999
	let cursorInside = false
	let rafId = 0
	let active = true

	function frame(): void {
		if (!active) return

		if (!cursorInside) {
			// Cursor left — reset all chars to base wdth
			charSpans.forEach(({ span }) => {
				span.style.fontVariationSettings = overrideAxis(baseFVS, 'wdth', baseWdth)
				if (props) resetProps(span, props)
			})
			rafId = 0
			return
		}

		// Batch-read char span rects, then write styles
		const rects = charSpans.map(({ span }) => span.getBoundingClientRect())

		charSpans.forEach(({ span, riskLevel }, i) => {
			const rect = rects[i]
			const cx = rect.left + rect.width / 2
			const cy = rect.top + rect.height / 2
			const dist = Math.sqrt((cursorX - cx) ** 2 + (cursorY - cy) ** 2)

			// Normalise: strength=1 at dist=0, strength=0 at dist>=radius
			const normalised = Math.max(0, 1 - dist / radius)
			const strength = falloff === 'quadratic' ? normalised * normalised : normalised

			const boost = wdthBoost * (riskLevel / 3) * strength
			span.style.fontVariationSettings = overrideAxis(baseFVS, 'wdth', baseWdth + boost)
			if (props) applyProps(span, props, strength)
		})

		rafId = requestAnimationFrame(frame)
	}

	function onMouseMove(e: MouseEvent): void {
		cursorX = e.clientX
		cursorY = e.clientY
		if (!cursorInside) cursorInside = true
		if (rafId === 0) rafId = requestAnimationFrame(frame)
	}

	function onMouseLeave(): void {
		cursorInside = false
		if (rafId === 0) rafId = requestAnimationFrame(frame)
	}

	const eventTarget = scope === 'document' ? document : element
	eventTarget.addEventListener('mousemove', onMouseMove as EventListener)
	eventTarget.addEventListener('mouseleave', onMouseLeave as EventListener)

	return () => {
		active = false
		cancelAnimationFrame(rafId)
		eventTarget.removeEventListener('mousemove', onMouseMove as EventListener)
		eventTarget.removeEventListener('mouseleave', onMouseLeave as EventListener)
		element.innerHTML = originalHTML
	}
}

// ─── startMagnetType (field mode) ────────────────────────────────────────────

/**
 * Start the cursor-field effect on an element.
 *
 * Wraps each word in a span, then listens for mousemove events to drive per-word
 * font-variation-settings based on cursor distance. Uses a requestAnimationFrame
 * loop for smooth axis interpolation. Resets all words to restValue on mouseleave.
 *
 * Defaults to listening on document (scope: 'document'), enabling cross-paragraph
 * effects when multiple elements are independently targeted.
 *
 * @param element      - Target element (must be in the live DOM and visible)
 * @param originalHTML - Clean HTML snapshot from getCleanHTML()
 * @param options      - MagnetTypeOptions; axes, radius, falloff, magnetMode, scope, props used
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
	const scope = options.scope ?? DEFAULTS.scope
	const props = options.props

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

	// Compute the rest FVS (applied when cursor is beyond radius or not present)
	const restFVS = overrideAxes(
		baseFVS,
		Object.fromEntries(Object.entries(axes).map(([tag, [rest]]) => [tag, rest])),
	)

	// Apply restValues and initial props immediately (before any cursor interaction)
	wordSpans.forEach((span) => {
		span.style.fontVariationSettings = restFVS
		if (props) resetProps(span, props)
	})

	// --- rAF loop state ---
	let cursorX = -9999
	let cursorY = -9999
	let cursorInside = false
	let rafId = 0
	let active = true

	function frame(): void {
		if (!active) return

		if (!cursorInside) {
			// Cursor left — reset to restValues
			wordSpans.forEach((span) => {
				span.style.fontVariationSettings = restFVS
				if (props) resetProps(span, props)
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

			// t accounts for attract vs repel polarity
			const t = magnetMode === 'repel' ? 1 - strength : strength

			const perAxisValues: Record<string, number> = {}
			for (const tag of Object.keys(axes)) {
				const [rest, peak] = axes[tag] ?? [300, 500]
				perAxisValues[tag] = rest + (peak - rest) * t
			}

			span.style.fontVariationSettings = overrideAxes(baseFVS, perAxisValues)
			if (props) applyProps(span, props, strength)
		})

		rafId = requestAnimationFrame(frame)
	}

	function onMouseMove(e: MouseEvent): void {
		cursorX = e.clientX
		cursorY = e.clientY
		if (!cursorInside) cursorInside = true
		if (rafId === 0) rafId = requestAnimationFrame(frame)
	}

	function onMouseLeave(): void {
		cursorInside = false
		if (rafId === 0) rafId = requestAnimationFrame(frame)
	}

	const eventTarget = scope === 'document' ? document : element
	eventTarget.addEventListener('mousemove', onMouseMove as EventListener)
	eventTarget.addEventListener('mouseleave', onMouseLeave as EventListener)

	return () => {
		active = false
		cancelAnimationFrame(rafId)
		eventTarget.removeEventListener('mousemove', onMouseMove as EventListener)
		eventTarget.removeEventListener('mouseleave', onMouseLeave as EventListener)
		element.innerHTML = originalHTML
	}
}
