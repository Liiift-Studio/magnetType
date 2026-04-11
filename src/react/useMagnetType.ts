// magnetType/src/react/useMagnetType.ts — React hook for magnetType
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { startMagnetType, applyMagnetType, getCleanHTML } from '../core/adjust'
import type { MagnetTypeOptions } from '../core/types'

/**
 * React hook that applies the magnetType effect to a ref'd element.
 *
 * For mode: 'field' — starts the cursor proximity rAF loop via startMagnetType.
 * The stop function is called on unmount and when options change.
 * No ResizeObserver needed — the rAF loop reads live getBoundingClientRect each frame.
 *
 * For mode: 'legibility' — applies the static per-character wdth boost via applyMagnetType.
 * Re-runs on container width changes via ResizeObserver, and after fonts load.
 *
 * Defaults to 'field' mode if mode is undefined.
 */
export function useMagnetType(options: MagnetTypeOptions) {
	const ref = useRef<HTMLElement>(null)
	const originalHTMLRef = useRef<string | null>(null)
	const optionsRef = useRef(options)
	optionsRef.current = options
	const stopRef = useRef<(() => void) | null>(null)

	// Determine which mode we're in — default to 'field'
	const mode = options.mode ?? 'field'

	// Destructure options that should trigger a re-run when changed
	const { axes, radius, falloff, magnetMode, wdthBoost } = options
	// Serialise axes for dependency comparison (object identity would always trigger)
	const axesKey = axes ? JSON.stringify(axes) : undefined

	const run = useCallback(() => {
		const el = ref.current
		if (!el) return

		if (originalHTMLRef.current === null) {
			originalHTMLRef.current = getCleanHTML(el)
		}

		// Stop any running field loop before re-running
		if (stopRef.current) {
			stopRef.current()
			stopRef.current = null
		}

		const currentMode = optionsRef.current.mode ?? 'field'

		if (currentMode === 'field') {
			stopRef.current = startMagnetType(el, originalHTMLRef.current, optionsRef.current)
		} else {
			applyMagnetType(el, originalHTMLRef.current, optionsRef.current)
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [mode, axesKey, radius, falloff, magnetMode, wdthBoost])

	useLayoutEffect(() => {
		run()

		if (typeof ResizeObserver === 'undefined') {
			return () => {
				if (stopRef.current) {
					stopRef.current()
					stopRef.current = null
				}
			}
		}

		// Field mode: no ResizeObserver — rAF loop reads live positions each frame
		if ((optionsRef.current.mode ?? 'field') === 'field') {
			return () => {
				if (stopRef.current) {
					stopRef.current()
					stopRef.current = null
				}
			}
		}

		// Legibility mode: re-run on container width changes
		let lastWidth = 0
		let rafId = 0
		const ro = new ResizeObserver((entries) => {
			const w = Math.round(entries[0].contentRect.width)
			if (w === lastWidth) return
			lastWidth = w
			cancelAnimationFrame(rafId)
			rafId = requestAnimationFrame(run)
		})
		ro.observe(ref.current!)

		return () => {
			ro.disconnect()
			cancelAnimationFrame(rafId)
			if (stopRef.current) {
				stopRef.current()
				stopRef.current = null
			}
		}
	}, [run])

	// Re-run after fonts load — ensures measurements are taken on the loaded font
	useEffect(() => {
		document.fonts.ready.then(run)
	}, [run])

	return ref
}
