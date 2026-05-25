// magnetType/src/react/MagnetBlock.tsx — element-level or per-character cursor-proximity weight variation
'use client'

import React, { useRef, useCallback, useEffect, forwardRef, useMemo } from 'react'

export interface MagnetBlockProps {
	children: React.ReactNode
	/** HTML element to render. Default: 'p' */
	as?: React.ElementType
	className?: string
	style?: React.CSSProperties
	minWeight?: number
	maxWeight?: number
	/** Pixel distance from the element edge within which the whole-element effect activates */
	proximityRadius?: number
	/** Pixel distance from the cursor within which each character's weight rises to max */
	spreadRadius?: number
	fixedAxes?: Record<string, number>
	/**
	 * Cache character centre positions in page-relative coordinates after first render,
	 * eliminating getBoundingClientRect calls on every mousemove. The cache is rebuilt on
	 * resize and after fonts load. Disable if the block lives inside a custom scroll
	 * container (overflow: scroll on a non-window element) — page coordinates are derived
	 * from window.scrollX/Y and will be incorrect when a nested element is the scroll parent.
	 * @default true
	 */
	cachePositions?: boolean
	/**
	 * Throttle proximity updates to one per animation frame via requestAnimationFrame,
	 * capping the update rate at the display refresh rate. Disable if the ~16 ms rAF delay
	 * is perceptible — for example on 120 Hz displays or very tight, fast-moving effects.
	 * @default true
	 */
	rafThrottle?: boolean
	/**
	 * Apply compensating letter-spacing to keep line lengths stable as font weight changes.
	 * Measures the element's text width at rest and peak weight via an off-screen probe span,
	 * then applies proportional negative letter-spacing per character as weight rises,
	 * cancelling the advance-width increase that would otherwise cause text to reflow.
	 *
	 * Disable if you prefer natural bold letter-spacing, or if the font expands characters
	 * very unevenly across the weight axis (the compensation is a per-element average and
	 * may not perfectly cancel highly variable per-character expansion).
	 * @default true
	 */
	stabilizeLayout?: boolean
}

type CharPos = { cx: number; cy: number }
type ElemRect = { top: number; left: number; right: number; bottom: number }

export const MagnetBlock = forwardRef<HTMLElement, MagnetBlockProps>(
	function MagnetBlock(
		{
			children,
			as: Tag = 'p',
			className,
			style,
			minWeight = 300,
			maxWeight = 600,
			proximityRadius,
			spreadRadius,
			fixedAxes = {},
			cachePositions = true,
			rafThrottle = true,
			stabilizeLayout = true,
		},
		forwardedRef,
	) {
		const innerRef = useRef<HTMLElement>(null)
		const lastPos = useRef<{ x: number; y: number } | null>(null)
		const charSpansRef = useRef<(HTMLSpanElement | null)[]>([])

		// Position cache — page-relative centres, invalidated on resize/font-load/content change
		const charCacheRef = useRef<CharPos[]>([])
		const elemCacheRef = useRef<ElemRect | null>(null)
		const cacheValidRef = useRef(false)

		// rAF handle — one pending frame at a time
		const rafIdRef = useRef<number | null>(null)

		// Per-character advance-width delta between minWeight and maxWeight (px)
		const perCharDeltaRef = useRef(0)

		const mergedRef = useCallback(
			(node: HTMLElement | null) => {
				;(innerRef as React.MutableRefObject<HTMLElement | null>).current = node
				if (typeof forwardedRef === 'function') forwardedRef(node)
				else if (forwardedRef) forwardedRef.current = node
			},
			// eslint-disable-next-line react-hooks/exhaustive-deps
			[forwardedRef],
		)

		function buildVS(weight: number) {
			const parts = [`'wght' ${weight.toFixed(0)}`]
			for (const [tag, val] of Object.entries(fixedAxes)) parts.push(`'${tag}' ${val}`)
			return parts.join(', ')
		}

		function buildCache() {
			const el = innerRef.current
			if (!el) return
			const sx = window.scrollX
			const sy = window.scrollY
			const er = el.getBoundingClientRect()
			elemCacheRef.current = {
				top:    er.top    + sy,
				left:   er.left   + sx,
				right:  er.right  + sx,
				bottom: er.bottom + sy,
			}
			charCacheRef.current = charSpansRef.current.map(span => {
				if (!span) return { cx: 0, cy: 0 }
				const r = span.getBoundingClientRect()
				return {
					cx: (r.left + r.right) / 2 + sx,
					cy: (r.top  + r.bottom) / 2 + sy,
				}
			})
			cacheValidRef.current = true
		}

		function applyProximity(clientX: number, clientY: number) {
			const el = innerRef.current
			if (!el) return

			if (cachePositions && !cacheValidRef.current) buildCache()

			// Resolve cursor and element bounds in a common coordinate space.
			// With cache: page-relative (cursor adjusted by scroll). Without: viewport-relative.
			let elTop: number, elLeft: number, elRight: number, elBottom: number
			let curX: number, curY: number

			if (cachePositions && elemCacheRef.current) {
				curX = clientX + window.scrollX
				curY = clientY + window.scrollY
				;({ top: elTop, left: elLeft, right: elRight, bottom: elBottom } = elemCacheRef.current)
			} else {
				const rect = el.getBoundingClientRect()
				curX = clientX; curY = clientY
				elTop = rect.top; elLeft = rect.left; elRight = rect.right; elBottom = rect.bottom
			}

			const dx = Math.max(elLeft - curX, 0, curX - elRight)
			const dy = Math.max(elTop  - curY, 0, curY - elBottom)
			const distToEdge = Math.sqrt(dx * dx + dy * dy)

			// Whole-element effect only (no spreadRadius)
			if (proximityRadius !== undefined && !spreadRadius) {
				const proximity = Math.max(0, 1 - distToEdge / proximityRadius)
				const eased = 1 - (1 - proximity) ** 2
				el.style.fontVariationSettings = buildVS(minWeight + (maxWeight - minWeight) * eased)
				return
			}

			if (spreadRadius) {
				// proximityRadius gate
				if (proximityRadius !== undefined && distToEdge > proximityRadius) {
					el.style.fontVariationSettings = buildVS(minWeight)
					for (const span of charSpansRef.current) {
						if (!span) continue
						span.style.fontVariationSettings = buildVS(minWeight)
						if (stabilizeLayout) span.style.letterSpacing = ''
					}
					return
				}

				// Element-level pre-filter: when the cursor is farther than spreadRadius from
				// the element edge, every character is guaranteed to be out of range too —
				// skip all per-character work.
				if (distToEdge > spreadRadius) {
					for (const span of charSpansRef.current) {
						if (!span) continue
						span.style.fontVariationSettings = buildVS(minWeight)
						if (stabilizeLayout) span.style.letterSpacing = ''
					}
					return
				}

				const spans = charSpansRef.current
				if (cachePositions && charCacheRef.current.length === spans.length) {
					// Fast path: zero getBoundingClientRect calls, pure array math
					for (let i = 0; i < spans.length; i++) {
						const span = spans[i]
						if (!span) continue
						const { cx, cy } = charCacheRef.current[i]
						const dist = Math.sqrt((curX - cx) ** 2 + (curY - cy) ** 2)
						const proximity = Math.max(0, 1 - dist / spreadRadius)
						const eased = 1 - (1 - proximity) ** 2
						span.style.fontVariationSettings = buildVS(minWeight + (maxWeight - minWeight) * eased)
						if (stabilizeLayout && perCharDeltaRef.current !== 0) {
							span.style.letterSpacing = `${(-perCharDeltaRef.current * eased).toFixed(3)}px`
						}
					}
				} else {
					// Fallback: live getBoundingClientRect per span (cachePositions=false or cache length mismatch)
					for (const span of spans) {
						if (!span) continue
						const sr = span.getBoundingClientRect()
						const cx = (sr.left + sr.right) / 2
						const cy = (sr.top  + sr.bottom) / 2
						const dist = Math.sqrt((clientX - cx) ** 2 + (clientY - cy) ** 2)
						const proximity = Math.max(0, 1 - dist / spreadRadius)
						const eased = 1 - (1 - proximity) ** 2
						span.style.fontVariationSettings = buildVS(minWeight + (maxWeight - minWeight) * eased)
						if (stabilizeLayout && perCharDeltaRef.current !== 0) {
							span.style.letterSpacing = `${(-perCharDeltaRef.current * eased).toFixed(3)}px`
						}
					}
				}
			}
		}

		const handleMouseMove = useCallback(
			(e: MouseEvent) => {
				lastPos.current = { x: e.clientX, y: e.clientY }
				if (rafThrottle) {
					// Only schedule one frame at a time; use lastPos so we always get the newest coords
					if (rafIdRef.current === null) {
						rafIdRef.current = requestAnimationFrame(() => {
							rafIdRef.current = null
							if (lastPos.current) applyProximity(lastPos.current.x, lastPos.current.y)
						})
					}
				} else {
					applyProximity(e.clientX, e.clientY)
				}
			},
			// eslint-disable-next-line react-hooks/exhaustive-deps
			[minWeight, maxWeight, proximityRadius, spreadRadius, cachePositions, rafThrottle, stabilizeLayout, JSON.stringify(fixedAxes)],
		)

		const handleScroll = useCallback(
			() => {
				if (lastPos.current) applyProximity(lastPos.current.x, lastPos.current.y)
			},
			// eslint-disable-next-line react-hooks/exhaustive-deps
			[minWeight, maxWeight, proximityRadius, spreadRadius, cachePositions, stabilizeLayout, JSON.stringify(fixedAxes)],
		)

		const handleMouseLeave = useCallback(
			() => {
				lastPos.current = null
				if (rafIdRef.current !== null) {
					cancelAnimationFrame(rafIdRef.current)
					rafIdRef.current = null
				}
				const el = innerRef.current
				if (el) el.style.fontVariationSettings = buildVS(minWeight)
				for (const span of charSpansRef.current) {
					if (!span) continue
					span.style.fontVariationSettings = buildVS(minWeight)
					if (stabilizeLayout) span.style.letterSpacing = ''
				}
			},
			// eslint-disable-next-line react-hooks/exhaustive-deps
			[minWeight, stabilizeLayout, JSON.stringify(fixedAxes)],
		)

		useEffect(() => {
			window.addEventListener('mousemove', handleMouseMove, { passive: true })
			window.addEventListener('scroll', handleScroll, { passive: true, capture: true })
			document.documentElement.addEventListener('mouseleave', handleMouseLeave)
			return () => {
				window.removeEventListener('mousemove', handleMouseMove)
				window.removeEventListener('scroll', handleScroll, { capture: true })
				document.documentElement.removeEventListener('mouseleave', handleMouseLeave)
				if (rafIdRef.current !== null) {
					cancelAnimationFrame(rafIdRef.current)
					rafIdRef.current = null
				}
			}
		}, [handleMouseMove, handleScroll, handleMouseLeave])

		// ResizeObserver + font-load cache invalidation
		useEffect(() => {
			if (!cachePositions || !spreadRadius) return
			cacheValidRef.current = false
			const el = innerRef.current
			if (!el) return
			const ro = new ResizeObserver(() => { cacheValidRef.current = false })
			ro.observe(el)
			document.fonts?.ready?.then(() => { cacheValidRef.current = false })
			return () => ro.disconnect()
		}, [cachePositions, spreadRadius])

		// Invalidate cache when children or spreadRadius change (spans are re-rendered)
		useEffect(() => {
			cacheValidRef.current = false
		}, [children, spreadRadius])

		// Measure per-character advance-width delta for layout stabilization.
		// Uses an off-screen probe span so character spans' inline FVS don't interfere.
		useEffect(() => {
			if (!stabilizeLayout || !spreadRadius) {
				perCharDeltaRef.current = 0
				return
			}
			const el = innerRef.current
			if (!el) return
			const rawText = el.textContent ?? ''
			const nonSpaceCount = rawText.replace(/\s/g, '').length
			if (nonSpaceCount === 0) return
			const cs = getComputedStyle(el)
			const probe = document.createElement('span')
			probe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;visibility:hidden;white-space:nowrap;pointer-events:none;'
			probe.style.fontFamily = cs.fontFamily
			probe.style.fontSize = cs.fontSize
			probe.style.fontWeight = cs.fontWeight
			probe.style.lineHeight = cs.lineHeight
			probe.style.letterSpacing = cs.letterSpacing
			probe.textContent = rawText
			document.body.appendChild(probe)
			const buildFVS = (w: number) => {
				const parts = [`'wght' ${w.toFixed(0)}`]
				for (const [tag, val] of Object.entries(fixedAxes)) parts.push(`'${tag}' ${val}`)
				return parts.join(', ')
			}
			probe.style.fontVariationSettings = buildFVS(maxWeight)
			const wMax = probe.scrollWidth
			probe.style.fontVariationSettings = buildFVS(minWeight)
			const wMin = probe.scrollWidth
			document.body.removeChild(probe)
			perCharDeltaRef.current = wMax > wMin ? (wMax - wMin) / nonSpaceCount : 0
		// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [stabilizeLayout, spreadRadius, minWeight, maxWeight, children, JSON.stringify(fixedAxes)])

		const processedChildren = useMemo(() => {
			if (!spreadRadius) return children

			charSpansRef.current = []
			let idx = 0

			function processNode(node: React.ReactNode): React.ReactNode {
				if (typeof node === 'string') {
					return [...node].map(char => {
						if (/\s/.test(char)) return char
						const i = idx++
						return (
							<span
								key={i}
								ref={el => { charSpansRef.current[i] = el }}
								style={{ fontVariationSettings: buildVS(minWeight) }}
							>
								{char}
							</span>
						)
					})
				}
				if (Array.isArray(node)) return node.map((n, i) => <React.Fragment key={i}>{processNode(n)}</React.Fragment>)
				if (React.isValidElement(node)) {
					const el = node as React.ReactElement<{ children?: React.ReactNode }>
					if (el.props.children !== undefined) {
						return React.cloneElement(el, {}, processNode(el.props.children))
					}
				}
				return node
			}

			return processNode(children)
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [children, spreadRadius, minWeight, JSON.stringify(fixedAxes)])

		return (
			<Tag
				ref={mergedRef}
				className={className}
				style={{ fontVariationSettings: buildVS(minWeight), ...style }}
			>
				{processedChildren}
			</Tag>
		)
	},
)

MagnetBlock.displayName = 'MagnetBlock'
