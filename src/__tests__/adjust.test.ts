// magnetType/src/__tests__/adjust.test.ts — core algorithm tests
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { applyMagnetType, removeMagnetType, getCleanHTML, startMagnetType } from '../core/adjust'
import { MAGNET_TYPE_CLASSES } from '../core/types'

// ─── DOM measurement mock ─────────────────────────────────────────────────────

const CONTAINER_W = 600
const CHAR_W = 10

/**
 * Mocks offsetWidth on HTMLElement.prototype so happy-dom's constructor
 * `this.offsetWidth = 0` doesn't throw — the no-op setter absorbs it.
 * Also mocks getBoundingClientRect.
 * Returns a cleanup function restoring both originals.
 */
function mockMeasurement() {
	const proto = HTMLElement.prototype
	const priorOffsetWidth = Object.getOwnPropertyDescriptor(proto, 'offsetWidth')

	Object.defineProperty(proto, 'offsetWidth', {
		configurable: true,
		get: function (this: HTMLElement) {
			if (this.classList?.contains(MAGNET_TYPE_CLASSES.probe)) return 0
			if (this.classList?.contains(MAGNET_TYPE_CLASSES.char)) return CHAR_W
			if (this.classList?.contains(MAGNET_TYPE_CLASSES.word)) return CHAR_W * 5
			return CONTAINER_W
		},
		set: () => {},
	})

	const origBCR = Element.prototype.getBoundingClientRect
	Element.prototype.getBoundingClientRect = function (this: Element) {
		const el = this as HTMLElement
		if (el.classList?.contains(MAGNET_TYPE_CLASSES.probe)) {
			return { width: 0, top: 0, left: 0, bottom: 0, right: 0, height: 0, x: 0, y: 0, toJSON: () => {} } as DOMRect
		}
		if (el.classList?.contains(MAGNET_TYPE_CLASSES.char)) {
			return { width: CHAR_W, top: 0, left: 0, bottom: 20, right: CHAR_W, height: 20, x: 0, y: 0, toJSON: () => {} } as DOMRect
		}
		if (el.classList?.contains(MAGNET_TYPE_CLASSES.word)) {
			return { width: CHAR_W * 5, top: 0, left: 0, bottom: 20, right: CHAR_W * 5, height: 20, x: 0, y: 0, toJSON: () => {} } as DOMRect
		}
		return { width: CONTAINER_W, top: 0, left: 0, bottom: 20, right: CONTAINER_W, height: 20, x: 0, y: 0, toJSON: () => {} } as DOMRect
	}

	return () => {
		if (priorOffsetWidth) Object.defineProperty(proto, 'offsetWidth', priorOffsetWidth)
		Element.prototype.getBoundingClientRect = origBCR
	}
}

function makeElement(html: string): HTMLElement {
	const el = document.createElement('p')
	el.innerHTML = html
	el.style.width = `${CONTAINER_W}px`
	document.body.appendChild(el)
	return el
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('magnetType', () => {
	let cleanup: (() => void) | null = null

	beforeEach(() => {
		document.body.innerHTML = ''
		cleanup = mockMeasurement()
	})

	afterEach(() => {
		cleanup?.()
		cleanup = null
	})

	// ── getCleanHTML ────────────────────────────────────────────────────────────

	it('getCleanHTML is idempotent — same result when called twice on clean element', () => {
		const el = makeElement('<em>Hello</em> world')
		const html1 = getCleanHTML(el)
		const html2 = getCleanHTML(el)
		expect(html1).toBe(html2)
	})

	it('getCleanHTML strips injected char spans after applyMagnetType', () => {
		const el = makeElement('il1I fish')
		const original = getCleanHTML(el)
		applyMagnetType(el, original, { mode: 'legibility', wdthBoost: 6 })
		const cleaned = getCleanHTML(el)
		expect(cleaned).not.toContain(MAGNET_TYPE_CLASSES.char)
		expect(cleaned).toBe(original)
	})

	it('getCleanHTML strips injected word spans after startMagnetType', () => {
		const el = makeElement('Hello world')
		const original = getCleanHTML(el)
		const stop = startMagnetType(el, original, { mode: 'field' })
		const cleaned = getCleanHTML(el)
		stop()
		expect(cleaned).not.toContain(MAGNET_TYPE_CLASSES.word)
	})

	// ── applyMagnetType — legibility mode ───────────────────────────────────────

	it('applyMagnetType does not throw on empty element', () => {
		const el = makeElement('')
		const original = getCleanHTML(el)
		expect(() => applyMagnetType(el, original, { mode: 'legibility' })).not.toThrow()
	})

	it('applyMagnetType does not throw on single word', () => {
		const el = makeElement('Hello')
		const original = getCleanHTML(el)
		expect(() => applyMagnetType(el, original, { mode: 'legibility' })).not.toThrow()
	})

	it('applyMagnetType wraps confusable characters in char spans', () => {
		// 'i', 'l', '1', 'I' are all risk-3 confusable
		const el = makeElement('il1I')
		const original = getCleanHTML(el)
		applyMagnetType(el, original, { mode: 'legibility', wdthBoost: 6 })
		const charSpans = el.querySelectorAll(`.${MAGNET_TYPE_CLASSES.char}`)
		// All 4 characters should be wrapped
		expect(charSpans.length).toBe(4)
	})

	it('applyMagnetType applies full wdthBoost to risk-3 chars', () => {
		const el = makeElement('i')
		const original = getCleanHTML(el)
		applyMagnetType(el, original, { mode: 'legibility', wdthBoost: 6 })
		const span = el.querySelector<HTMLElement>(`.${MAGNET_TYPE_CLASSES.char}`)
		expect(span).toBeTruthy()
		// Risk 3 gets full boost: base 100 + 6 * (3/3) = 106
		expect(span?.style.fontVariationSettings).toContain('"wdth" 106')
	})

	it('applyMagnetType applies 2/3 wdthBoost to risk-2 chars', () => {
		const el = makeElement('0')
		const original = getCleanHTML(el)
		applyMagnetType(el, original, { mode: 'legibility', wdthBoost: 6 })
		const span = el.querySelector<HTMLElement>(`.${MAGNET_TYPE_CLASSES.char}`)
		expect(span).toBeTruthy()
		// Risk 2 gets 2/3 boost: base 100 + 6 * (2/3) = 104
		expect(span?.style.fontVariationSettings).toContain('"wdth" 104')
	})

	it('applyMagnetType applies 1/3 wdthBoost to risk-1 chars', () => {
		const el = makeElement('n')
		const original = getCleanHTML(el)
		applyMagnetType(el, original, { mode: 'legibility', wdthBoost: 6 })
		const span = el.querySelector<HTMLElement>(`.${MAGNET_TYPE_CLASSES.char}`)
		expect(span).toBeTruthy()
		// Risk 1 gets 1/3 boost: base 100 + 6 * (1/3) = 102
		expect(span?.style.fontVariationSettings).toContain('"wdth" 102')
	})

	it('applyMagnetType does not wrap non-confusable characters', () => {
		// 'x', 'y', 'z' are not in CONFUSABLE
		const el = makeElement('xyz')
		const original = getCleanHTML(el)
		applyMagnetType(el, original, { mode: 'legibility', wdthBoost: 6 })
		const charSpans = el.querySelectorAll(`.${MAGNET_TYPE_CLASSES.char}`)
		expect(charSpans.length).toBe(0)
	})

	it('applyMagnetType mixed: wraps only confusable chars in mixed string', () => {
		// 'a' is not confusable, 'i' is risk-3
		const el = makeElement('ai')
		const original = getCleanHTML(el)
		applyMagnetType(el, original, { mode: 'legibility', wdthBoost: 6 })
		const charSpans = el.querySelectorAll(`.${MAGNET_TYPE_CLASSES.char}`)
		// Only 'i' should be wrapped
		expect(charSpans.length).toBe(1)
		expect(charSpans[0].textContent).toBe('i')
	})

	it('applyMagnetType preserves <em> and <strong> elements', () => {
		const el = makeElement('<em>italic</em> and <strong>bold</strong>')
		const original = getCleanHTML(el)
		applyMagnetType(el, original, { mode: 'legibility', wdthBoost: 6 })
		expect(el.querySelector('em')).toBeTruthy()
		expect(el.querySelector('strong')).toBeTruthy()
	})

	it('applyMagnetType is idempotent — applying twice produces the same output', () => {
		const el = makeElement('il fish')
		const original = getCleanHTML(el)
		applyMagnetType(el, original, { mode: 'legibility', wdthBoost: 6 })
		const afterFirst = el.innerHTML

		applyMagnetType(el, original, { mode: 'legibility', wdthBoost: 6 })
		const afterSecond = el.innerHTML

		expect(afterSecond).toBe(afterFirst)
	})

	// ── removeMagnetType ────────────────────────────────────────────────────────

	it('removeMagnetType restores original HTML after legibility apply', () => {
		const el = makeElement('<em>ill</em> fish')
		const original = getCleanHTML(el)
		applyMagnetType(el, original, { mode: 'legibility', wdthBoost: 6 })
		removeMagnetType(el, original)
		expect(el.innerHTML).toBe(original)
	})

	// ── startMagnetType — field mode ────────────────────────────────────────────

	it('startMagnetType returns a stop function without throwing', () => {
		const el = makeElement('Hello world typography')
		const original = getCleanHTML(el)
		let stop: (() => void) | undefined
		expect(() => {
			stop = startMagnetType(el, original, { mode: 'field' })
		}).not.toThrow()
		expect(typeof stop).toBe('function')
		stop?.()
	})

	it('startMagnetType wraps words in word spans', () => {
		const el = makeElement('Hello world')
		const original = getCleanHTML(el)
		const stop = startMagnetType(el, original, { mode: 'field' })
		const wordSpans = el.querySelectorAll(`.${MAGNET_TYPE_CLASSES.word}`)
		expect(wordSpans.length).toBe(2)
		stop()
	})

	it('startMagnetType stop function restores original HTML', () => {
		const el = makeElement('Hello world')
		const original = getCleanHTML(el)
		const stop = startMagnetType(el, original, { mode: 'field' })
		stop()
		expect(el.innerHTML).toBe(original)
	})

	it('startMagnetType does not crash on empty element', () => {
		const el = makeElement('')
		const original = getCleanHTML(el)
		let stop: (() => void) | undefined
		expect(() => {
			stop = startMagnetType(el, original, { mode: 'field' })
		}).not.toThrow()
		stop?.()
	})

	it('startMagnetType does not crash on single word', () => {
		const el = makeElement('Hello')
		const original = getCleanHTML(el)
		let stop: (() => void) | undefined
		expect(() => {
			stop = startMagnetType(el, original, { mode: 'field' })
		}).not.toThrow()
		stop?.()
	})
})
