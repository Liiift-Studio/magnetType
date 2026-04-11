// magnetType/src/core/types.ts — types and CSS class constants

/**
 * Known visually confusable characters with their risk level.
 * Risk 3 = high confusion (e.g. il1I), risk 1 = low confusion.
 */
export const CONFUSABLE: Record<string, number> = {
	'i': 3, 'l': 3, '1': 3, 'I': 3,  // il1I confusion
	'r': 2, 'n': 1, 'm': 1,           // rn/m similarity
	'0': 2, 'O': 2, 'o': 1,           // 0/O similarity
	'b': 1, 'd': 1, 'p': 1, 'q': 1,  // mirrored pairs
	'c': 1, 'e': 1,                    // similar bowls
}

/** Falloff curve for the cursor proximity field */
export type FalloffType = 'linear' | 'quadratic'

/** Whether cursor proximity attracts toward peak or repels toward rest */
export type MagnetModeType = 'attract' | 'repel'

/** Which mode magnetType operates in */
export type MagnetTypeModeType = 'field' | 'legibility'

/**
 * Options for the magnetType effect.
 *
 * Two modes share this options type:
 * - 'field'      — cursor proximity drives per-word variable font axis values
 * - 'legibility' — per-character wdth boost for visually confusable characters
 */
export interface MagnetTypeOptions {
	/**
	 * Operating mode. Default: 'field'
	 *
	 * - **'field'** — cursor proximity drives per-word font-variation-settings.
	 * - **'legibility'** — per-character wdth boost for confusable characters; no cursor needed.
	 */
	mode?: MagnetTypeModeType

	// ── field mode options ──────────────────────────────────────────────────────

	/**
	 * Map of axis tag → [restValue, peakValue].
	 * restValue is applied at full distance; peakValue when cursor is directly over the word.
	 * Default: { wght: [300, 500] }
	 */
	axes?: Record<string, [number, number]>

	/**
	 * Pixel radius over which the field effect fades.
	 * Words beyond this distance receive restValue. Default: 120
	 */
	radius?: number

	/**
	 * Falloff curve. Default: 'quadratic'
	 *
	 * - **'linear'** — strength decreases linearly with distance
	 * - **'quadratic'** — strength decreases as distance², giving a tighter hot zone
	 */
	falloff?: FalloffType

	/**
	 * Attraction or repulsion mode. Default: 'attract'
	 *
	 * - **'attract'** — words near cursor approach peakValue
	 * - **'repel'** — words near cursor stay at restValue; far words approach peakValue
	 */
	magnetMode?: MagnetModeType

	// ── legibility mode options ─────────────────────────────────────────────────

	/**
	 * wdth axis units to add to confusable characters. Default: 6
	 *
	 * Risk 1 characters receive wdthBoost × (1/3).
	 * Risk 2 characters receive wdthBoost × (2/3).
	 * Risk 3 characters receive wdthBoost × (3/3) = full boost.
	 */
	wdthBoost?: number
}

/** CSS class names injected by magnetType — use these to target generated markup */
export const MAGNET_TYPE_CLASSES = {
	/** Applied to each word span in field mode */
	word: 'mt-word',
	/** Applied to each character span in legibility mode */
	char: 'mt-char',
	/** Applied to measurement probe spans (never in final output) */
	probe: 'mt-probe',
} as const
