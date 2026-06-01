// magnetType/src/__tests__/react.test.tsx — React hook and component tests
import React, { useRef } from 'react'
import { render, renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useMagnetType } from '../react/useMagnetType'
import { MagnetTypeText } from '../react/MagnetTypeText'
import { MAGNET_TYPE_CLASSES } from '../core/types'

// ─── DOM measurement mock ─────────────────────────────────────────────────────

const CONTAINER_W = 600
const CHAR_W = 10

/**
 * Mocks offsetWidth and getBoundingClientRect on element prototypes so that
 * happy-dom's zero-layout environment doesn't cause measurement failures.
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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useMagnetType', () => {
	let cleanupMeasurement: (() => void) | null = null

	beforeEach(() => {
		document.body.innerHTML = ''
		cleanupMeasurement = mockMeasurement()
	})

	afterEach(() => {
		cleanupMeasurement?.()
		cleanupMeasurement = null
		vi.restoreAllMocks()
	})

	it('mounts and unmounts without throwing', () => {
		/** Wrapper that attaches the hook ref to a real DOM element */
		function Wrapper() {
			const ref = useMagnetType({})
			return <p ref={ref as React.RefObject<HTMLParagraphElement>}>Hello world</p>
		}

		let unmount: (() => void) | undefined
		expect(() => {
			const result = render(<Wrapper />)
			unmount = result.unmount
		}).not.toThrow()
		expect(() => unmount?.()).not.toThrow()
	})

	it('accepts default options and returns a ref', () => {
		const { result } = renderHook(() => useMagnetType({}))
		// The hook always returns a ref object
		expect(result.current).toHaveProperty('current')
	})

	it('accepts all documented options without throwing', () => {
		function Wrapper() {
			const ref = useMagnetType({
				mode: 'field',
				radius: 150,
				axes: { wght: [300, 700] },
				scope: 'document',
				falloff: 'quadratic',
				magnetMode: 'attract',
				wdthBoost: 6,
				cachePositions: false,
				stabilizeLayout: false,
				transitionMs: 200,
				props: { opacity: [1, 0.6] },
			})
			return <p ref={ref as React.RefObject<HTMLParagraphElement>}>Typography</p>
		}

		expect(() => render(<Wrapper />)).not.toThrow()
	})

	it('re-runs when options change without throwing', () => {
		function Wrapper({ radius }: { radius: number }) {
			const ref = useMagnetType({ radius })
			return <p ref={ref as React.RefObject<HTMLParagraphElement>}>Hello world</p>
		}

		const { rerender } = render(<Wrapper radius={100} />)
		expect(() => rerender(<Wrapper radius={200} />)).not.toThrow()
		expect(() => rerender(<Wrapper radius={50} />)).not.toThrow()
	})

	it('re-runs when mode changes without throwing', () => {
		function Wrapper({ mode }: { mode: 'word' | 'legibility' }) {
			const ref = useMagnetType({ mode })
			return <p ref={ref as React.RefObject<HTMLParagraphElement>}>il1I fish</p>
		}

		const { rerender } = render(<Wrapper mode="word" />)
		expect(() => rerender(<Wrapper mode="legibility" />)).not.toThrow()
		expect(() => rerender(<Wrapper mode="word" />)).not.toThrow()
	})

	it('re-runs when axes change without throwing', () => {
		function Wrapper({ axes }: { axes: Record<string, [number, number]> }) {
			const ref = useMagnetType({ axes })
			return <p ref={ref as React.RefObject<HTMLParagraphElement>}>Hello world</p>
		}

		const { rerender } = render(<Wrapper axes={{ wght: [300, 500] }} />)
		expect(() => rerender(<Wrapper axes={{ wght: [200, 700] }} />)).not.toThrow()
	})

	it('works in legibility mode without throwing', () => {
		function Wrapper() {
			const ref = useMagnetType({ mode: 'legibility', wdthBoost: 6 })
			return <p ref={ref as React.RefObject<HTMLParagraphElement>}>il1I fish</p>
		}

		let unmount: (() => void) | undefined
		expect(() => {
			const result = render(<Wrapper />)
			unmount = result.unmount
		}).not.toThrow()
		expect(() => unmount?.()).not.toThrow()
	})

	it('scope: element option does not throw', () => {
		function Wrapper() {
			const ref = useMagnetType({ scope: 'element', mode: 'word' })
			return <p ref={ref as React.RefObject<HTMLParagraphElement>}>Hello world</p>
		}

		expect(() => render(<Wrapper />)).not.toThrow()
	})
})

// ─── MagnetTypeText ───────────────────────────────────────────────────────────

describe('MagnetTypeText', () => {
	let cleanupMeasurement: (() => void) | null = null

	beforeEach(() => {
		document.body.innerHTML = ''
		cleanupMeasurement = mockMeasurement()
	})

	afterEach(() => {
		cleanupMeasurement?.()
		cleanupMeasurement = null
		vi.restoreAllMocks()
	})

	it('renders children without throwing', () => {
		// The hook immediately wraps text into word spans, so we check container text content
		const { container } = render(
			<MagnetTypeText>Hello world</MagnetTypeText>,
		)
		expect(container.textContent).toContain('Hello')
		expect(container.textContent).toContain('world')
	})

	it('renders a <p> element by default', () => {
		const { container } = render(
			<MagnetTypeText>Hello world</MagnetTypeText>,
		)
		expect(container.querySelector('p')).toBeTruthy()
	})

	it('renders a custom element via the as prop', () => {
		const { container } = render(
			<MagnetTypeText as="div">Hello world</MagnetTypeText>,
		)
		expect(container.querySelector('div')).toBeTruthy()
		expect(container.querySelector('p')).toBeNull()
	})

	it('forwards className prop to the root element', () => {
		const { container } = render(
			<MagnetTypeText className="my-class">Hello world</MagnetTypeText>,
		)
		const el = container.querySelector('p')
		expect(el?.className).toContain('my-class')
	})

	it('forwards style prop to the root element', () => {
		const { container } = render(
			<MagnetTypeText style={{ color: 'red' }}>Hello world</MagnetTypeText>,
		)
		const el = container.querySelector<HTMLElement>('p')
		expect(el?.style.color).toBe('red')
	})

	it('forwards a ref to the root element', () => {
		const ref = React.createRef<HTMLElement>()
		render(
			<MagnetTypeText ref={ref}>Hello world</MagnetTypeText>,
		)
		expect(ref.current).toBeTruthy()
		expect(ref.current?.tagName.toLowerCase()).toBe('p')
	})

	it('accepts all MagnetTypeOptions props without throwing', () => {
		expect(() =>
			render(
				<MagnetTypeText
					mode="field"
					radius={120}
					axes={{ wght: [300, 600] }}
					scope="document"
					falloff="linear"
					magnetMode="repel"
					cachePositions={false}
					stabilizeLayout={false}
					transitionMs={150}
					props={{ opacity: [1, 0.7] }}
				>
					Hello typography
				</MagnetTypeText>,
			),
		).not.toThrow()
	})

	it('mounts and unmounts cleanly', () => {
		const { unmount } = render(
			<MagnetTypeText>Hello world</MagnetTypeText>,
		)
		expect(() => unmount()).not.toThrow()
	})

	it('re-renders with changed props without throwing', () => {
		const { rerender } = render(
			<MagnetTypeText radius={100}>Hello world</MagnetTypeText>,
		)
		expect(() =>
			rerender(<MagnetTypeText radius={200}>Hello world</MagnetTypeText>),
		).not.toThrow()
	})

	it('has displayName set', () => {
		expect(MagnetTypeText.displayName).toBe('MagnetTypeText')
	})
})
