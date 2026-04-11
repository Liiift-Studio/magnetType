"use client"

// Interactive demo for magnetType — field mode (cursor proximity) and legibility mode
import { useState, useDeferredValue } from "react"
import { MagnetTypeText } from "@liiift-studio/magnettype"
import type { MagnetTypeModeType, FalloffType, MagnetModeType } from "@liiift-studio/magnettype"

/** Prose paragraphs for field mode demo */
const FIELD_PARAGRAPHS = [
	`Typography has always been a conversation between the reader and the page. The characters on a printed sheet are fixed — their weight, their spacing, their axis values locked at the moment of setting. But type on screen can breathe, respond, move.`,
	`Variable fonts make every letterform a dial. The weight axis can thicken a stroke from hairline to slab; the width axis can compress a condensed face or expand it to full measure. These were tools for the typesetter, applied once at design time. Magnet Type applies them continuously, in real time, driven by where the cursor happens to be.`,
	`Move your cursor through the paragraph above. Words in the field attract toward their peak weight, then settle back as the cursor passes. The effect is subtle — not animation, not distraction — just a living texture that responds to presence. The text remains entirely readable throughout.`,
]

/** Confusable character text for legibility mode */
const LEGIBILITY_TEXT = `Millennial criminal inflaming rill: distinguish il, 1I, rn, 0O at every size. Rindfleisch, millennium, ringtail, infiltration.`

/** Slider sub-component with label, value display, and aria-label */
function Slider({ label, value, min, max, step, onChange }: {
	label: string
	value: number
	min: number
	max: number
	step: number
	onChange: (v: number) => void
}) {
	return (
		<div className="flex flex-col gap-1">
			<span className="text-xs uppercase tracking-widest opacity-50">{label}</span>
			<input
				type="range"
				min={min}
				max={max}
				step={step}
				value={value}
				aria-label={label}
				onChange={e => onChange(Number(e.target.value))}
				onTouchStart={e => e.stopPropagation()}
				style={{ touchAction: 'none' }}
			/>
			<span className="tabular-nums text-xs opacity-50 text-right">{value}</span>
		</div>
	)
}

/** Toggle button row — highlights the active option */
function ToggleGroup<T extends string>({ label, options, value, onChange }: {
	label: string
	options: readonly T[]
	value: T
	onChange: (v: T) => void
}) {
	return (
		<>
			<span className="text-xs uppercase tracking-widest opacity-50">{label}</span>
			{options.map(v => (
				<button
					key={v}
					onClick={() => onChange(v)}
					aria-pressed={value === v}
					className="text-xs px-3 py-1 rounded-full border transition-opacity"
					style={{
						borderColor: 'currentColor',
						opacity: value === v ? 1 : 0.5,
						background: value === v ? 'var(--btn-bg)' : 'transparent',
					}}
				>
					{v}
				</button>
			))}
		</>
	)
}

/** Interactive magnetType demo — field and legibility modes */
export default function Demo() {
	const [mode, setMode] = useState<MagnetTypeModeType>('field')
	const [weightHigh, setWeightHigh] = useState(600)
	const [weightLow, setWeightLow] = useState(300)
	const [radius, setRadius] = useState(120)
	const [falloff, setFalloff] = useState<FalloffType>('quadratic')
	const [magnetMode, setMagnetMode] = useState<MagnetModeType>('attract')

	const dWeightHigh = useDeferredValue(weightHigh)
	const dWeightLow = useDeferredValue(weightLow)
	const dRadius = useDeferredValue(radius)

	const sampleStyle: React.CSSProperties = {
		fontFamily: "var(--font-merriweather), serif",
		fontSize: "1.125rem",
		lineHeight: "1.8",
		fontVariationSettings: '"wght" 300, "opsz" 18, "wdth" 100',
	}

	return (
		<div className="w-full">
			{/* Mode toggle */}
			<div className="flex flex-wrap items-center gap-3 mb-6">
				<ToggleGroup
					label="Mode"
					options={['field', 'legibility'] as const}
					value={mode}
					onChange={setMode}
				/>
			</div>

			{/* Field mode controls */}
			{mode === 'field' && (
				<>
					<div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-6">
						<Slider label="Weight High" value={weightHigh} min={100} max={900} step={10} onChange={setWeightHigh} />
						<Slider label="Weight Low"  value={weightLow}  min={100} max={900} step={10} onChange={setWeightLow}  />
						<Slider label="Radius"      value={radius}     min={60}  max={240} step={10} onChange={setRadius}     />
					</div>
					<div className="flex flex-wrap items-center gap-3 mb-8">
						<ToggleGroup
							label="Falloff"
							options={['linear', 'quadratic'] as const}
							value={falloff}
							onChange={setFalloff}
						/>
						<ToggleGroup
							label="Magnet"
							options={['attract', 'repel'] as const}
							value={magnetMode}
							onChange={setMagnetMode}
						/>
					</div>
					<div className="flex flex-col gap-8">
						{FIELD_PARAGRAPHS.map((para, i) => (
							<MagnetTypeText
								key={i}
								mode="field"
								axes={{ wght: [dWeightLow, dWeightHigh] }}
								radius={dRadius}
								falloff={falloff}
								magnetMode={magnetMode}
								style={sampleStyle}
							>
								{para}
							</MagnetTypeText>
						))}
					</div>
					<p className="text-xs opacity-50 italic mt-8" style={{ lineHeight: "1.8" }}>
						Move your cursor through the text. Each word responds to proximity independently — words inside the radius attract toward the peak weight, words outside hold at rest. Try switching between attract and repel, or between linear and quadratic falloff.
					</p>
				</>
			)}

			{/* Legibility mode controls + text */}
			{mode === 'legibility' && (
				<>
					<p className="text-xs opacity-50 mb-8">
						Legibility mode applies a static wdth boost to visually confusable characters (il1I, rn, 0O, bdpqce). No cursor interaction — the boost is applied once at render time.
					</p>
					<MagnetTypeText
						mode="legibility"
						wdthBoost={8}
						style={sampleStyle}
					>
						{LEGIBILITY_TEXT}
					</MagnetTypeText>
					<p className="text-xs opacity-50 italic mt-8" style={{ lineHeight: "1.8" }}>
						Characters like il, 1I, rn, and 0O receive a proportional wdth boost based on their confusion risk — the most ambiguous get the full boost, lower-risk characters get a partial boost. The result is marginally wider letterforms exactly where disambiguation matters most.
					</p>
				</>
			)}
		</div>
	)
}
