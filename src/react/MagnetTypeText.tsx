// magnetType/src/react/MagnetTypeText.tsx — React component wrapper
import React, { forwardRef, useCallback } from 'react'
import { useMagnetType } from './useMagnetType'
import type { MagnetTypeOptions } from '../core/types'

/** Props for MagnetTypeText — extends all MagnetTypeOptions */
interface MagnetTypeTextProps extends MagnetTypeOptions {
	children: React.ReactNode
	/** HTML element to render. Default: 'p' */
	as?: React.ElementType
	className?: string
	style?: React.CSSProperties
}

/**
 * Drop-in component that applies the magnetType effect to its children.
 * Forwards the ref to the root element while also attaching the internal hook ref.
 */
export const MagnetTypeText = forwardRef<HTMLElement, MagnetTypeTextProps>(
	function MagnetTypeText({ children, as: Tag = 'p', className, style, ...options }, ref) {
		const innerRef = useMagnetType(options)

		/** Callback ref that satisfies both the forwarded ref and the internal hook ref */
		const mergedRef = useCallback(
			(node: HTMLElement | null) => {
				;(innerRef as React.MutableRefObject<HTMLElement | null>).current = node
				if (typeof ref === 'function') {
					ref(node)
				} else if (ref) {
					ref.current = node
				}
			},
			// eslint-disable-next-line react-hooks/exhaustive-deps
			[ref],
		)

		return (
			<Tag ref={mergedRef} className={className} style={style}>
				{children}
			</Tag>
		)
	},
)

MagnetTypeText.displayName = 'MagnetTypeText'
