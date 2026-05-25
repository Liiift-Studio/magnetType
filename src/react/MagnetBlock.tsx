// magnetType/src/react/MagnetBlock.tsx — element-level or per-word cursor-proximity weight variation
'use client'

import { useRef, useCallback, useEffect, forwardRef } from 'react'

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
	/** Pixel distance from the cursor within which each word's weight rises to max */
	spreadRadius?: number
	fixedAxes?: Record<string, number>
}

/**
 * Drop-in block element with cursor-proximity variable font weight variation.
 * Accepts any ReactNode — use spreadRadius for per-word spread, proximityRadius
 * for a whole-element proximity gate, or combine both.
 */
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
		},
		forwardedRef,
	) {
		const innerRef = useRef<HTMLElement>(null)
		const lastPos = useRef<{ x: number; y: number } | null>(null)
		const wordSpansRef = useRef<HTMLSpanElement[]>([])

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

		// Post-mount: walk text nodes and wrap each word in a span for per-word proximity
		useEffect(() => {
			if (!spreadRadius) return
			const el = innerRef.current
			if (!el) return

			const spans: HTMLSpanElement[] = []
			const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
			const textNodes: Text[] = []
			let node: Node | null
			while ((node = walker.nextNode())) textNodes.push(node as Text)

			for (const textNode of textNodes) {
				const text = textNode.textContent ?? ''
				if (!/\S/.test(text)) continue
				const parts = text.split(/(\s+)/)
				const fragment = document.createDocumentFragment()
				for (const part of parts) {
					if (part === '') continue
					if (/^\s+$/.test(part)) {
						fragment.appendChild(document.createTextNode(part))
					} else {
						const span = document.createElement('span')
						span.style.fontVariationSettings = buildVS(minWeight)
						span.textContent = part
						spans.push(span)
						fragment.appendChild(span)
					}
				}
				textNode.parentNode?.replaceChild(fragment, textNode)
			}
			wordSpansRef.current = spans
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [])

		function applyProximity(clientX: number, clientY: number) {
			const el = innerRef.current
			if (!el) return

			const rect = el.getBoundingClientRect()
			const dx = Math.max(rect.left - clientX, 0, clientX - rect.right)
			const dy = Math.max(rect.top - clientY, 0, clientY - rect.bottom)
			const distToEdge = Math.sqrt(dx * dx + dy * dy)

			// Whole-element effect (no per-word spread)
			if (proximityRadius !== undefined && !spreadRadius) {
				const proximity = Math.max(0, 1 - distToEdge / proximityRadius)
				const eased = 1 - (1 - proximity) ** 2
				el.style.fontVariationSettings = buildVS(minWeight + (maxWeight - minWeight) * eased)
				return
			}

			// Per-word spread, with optional proximity gate
			if (spreadRadius) {
				if (proximityRadius !== undefined && distToEdge > proximityRadius) {
					el.style.fontVariationSettings = buildVS(minWeight)
					for (const span of wordSpansRef.current) span.style.fontVariationSettings = buildVS(minWeight)
					return
				}
				for (const span of wordSpansRef.current) {
					const sr = span.getBoundingClientRect()
					const cx = (sr.left + sr.right) / 2
					const cy = (sr.top + sr.bottom) / 2
					const dist = Math.sqrt((clientX - cx) ** 2 + (clientY - cy) ** 2)
					const proximity = Math.max(0, 1 - dist / spreadRadius)
					const eased = 1 - (1 - proximity) ** 2
					span.style.fontVariationSettings = buildVS(minWeight + (maxWeight - minWeight) * eased)
				}
			}
		}

		const handleMouseMove = useCallback(
			(e: MouseEvent) => {
				lastPos.current = { x: e.clientX, y: e.clientY }
				applyProximity(e.clientX, e.clientY)
				// eslint-disable-next-line react-hooks/exhaustive-deps
			},
			[minWeight, maxWeight, proximityRadius, spreadRadius],
		)

		const handleScroll = useCallback(
			() => {
				if (lastPos.current) applyProximity(lastPos.current.x, lastPos.current.y)
				// eslint-disable-next-line react-hooks/exhaustive-deps
			},
			[minWeight, maxWeight, proximityRadius, spreadRadius],
		)

		const handleMouseLeave = useCallback(
			() => {
				lastPos.current = null
				const el = innerRef.current
				if (el) el.style.fontVariationSettings = buildVS(minWeight)
				for (const span of wordSpansRef.current) span.style.fontVariationSettings = buildVS(minWeight)
				// eslint-disable-next-line react-hooks/exhaustive-deps
			},
			[minWeight],
		)

		useEffect(() => {
			window.addEventListener('mousemove', handleMouseMove, { passive: true })
			window.addEventListener('scroll', handleScroll, { passive: true, capture: true })
			document.documentElement.addEventListener('mouseleave', handleMouseLeave)
			return () => {
				window.removeEventListener('mousemove', handleMouseMove)
				window.removeEventListener('scroll', handleScroll, { capture: true })
				document.documentElement.removeEventListener('mouseleave', handleMouseLeave)
			}
		}, [handleMouseMove, handleScroll, handleMouseLeave])

		return (
			<Tag
				ref={mergedRef}
				className={className}
				style={{ fontVariationSettings: buildVS(minWeight), ...style }}
			>
				{children}
			</Tag>
		)
	},
)

MagnetBlock.displayName = 'MagnetBlock'
