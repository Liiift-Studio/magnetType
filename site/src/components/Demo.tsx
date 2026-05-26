"use client"

// Interactive demo for magnetType — word mode, legibility mode, and character mode
import { useState, useDeferredValue, useEffect } from "react"
import { MagnetTypeText, MagnetChar } from "@liiift-studio/magnettype"
import type { MagnetTypeModeType, FalloffType, MagnetModeType } from "@liiift-studio/magnettype"

/** Prose paragraphs for word mode demo */
const FIELD_PARAGRAPHS = [
	`Typography has always been a conversation between the reader and the page. The characters on a printed sheet are fixed — their weight, their spacing, their axis values locked at the moment of setting. But type on screen can breathe, respond, move.`,
	`Variable fonts make every letterform a dial. The weight axis can thicken a stroke from hairline to slab; the width axis can compress a condensed face or expand it to full measure. These were tools for the typesetter, applied once at design time. Magnet Type applies them continuously, in real time, driven by where the cursor happens to be.`,
	`Move your cursor through the paragraph above. Words in the field attract toward their peak weight, then settle back as the cursor passes. The effect is subtle — not animation, not distraction — just a living texture that responds to presence. The text remains entirely readable throughout.`,
]

/** Confusable character text for legibility mode */
const LEGIBILITY_TEXT = `Millennial criminal inflaming rill: distinguish il, 1I, rn, 0O at every size. Rindfleisch, millennium, ringtail, infiltration.`

/** Gyro icon — spinning dial indicating device orientation control */
function GyroIcon() {
	return (
		<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden>
			<circle cx="7" cy="7" r="5.5" />
			<circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none" />
			<path d="M7 1.5 A5.5 5.5 0 0 1 12.5 7" strokeWidth="1.4" />
			<path d="M11.5 5.5 L12.5 7 L13.8 6" strokeWidth="1.2" />
		</svg>
	)
}

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

/** Boolean toggle button — highlights when active */
function ToggleButton({ label, value, onChange, icon, title }: {
	label: React.ReactNode
	value: boolean
	onChange: (v: boolean) => void
	icon?: React.ReactNode
	title?: string
}) {
	return (
		<button
			onClick={() => onChange(!value)}
			aria-pressed={value}
			title={title}
			className="text-xs px-3 py-1 rounded-full border transition-opacity flex items-center gap-1.5"
			style={{
				borderColor: 'currentColor',
				opacity: value ? 1 : 0.5,
				background: value ? 'var(--btn-bg)' : 'transparent',
			}}
		>
			{icon}{label}
		</button>
	)
}

/** Prose paragraphs for character mode demo */
const CHAR_PARAGRAPHS = [
	`Typography has always been a conversation between the reader and the page. Each word on a printed sheet is fixed — its weight locked at the moment of setting. But type on screen can breathe, respond, and shift its gravity as the cursor passes through.`,
	`Move your cursor slowly across the paragraphs. Characters nearest the cursor rise toward their peak weight, fading back as you move away. The result is a living texture that responds to presence — not animation for its own sake, but legibility shaped by attention.`,
	`Character mode works per-character across any block element — including mixed content with inline code, links, or other elements. The weight gradient follows the cursor continuously, adjusted on scroll so the effect never drifts.`,
]

/** Interactive magnetType demo — word, legibility, and character modes */
export default function Demo() {
	const [mode, setMode] = useState<MagnetTypeModeType | 'char'>('char')
	const [weightHigh, setWeightHigh] = useState(900)
	const [weightLow, setWeightLow] = useState(300)
	const [radius, setRadius] = useState(120)
	const [falloff, setFalloff] = useState<FalloffType>('quadratic')
	const [magnetMode, setMagnetMode] = useState<MagnetModeType>('attract')

	// Character mode state
	const [blockSpreadRadius, setBlockSpreadRadius] = useState(80)
	const [blockWeightHigh, setBlockWeightHigh] = useState(900)
	const [blockWeightLow, setBlockWeightLow] = useState(300)
	const dBlockSpreadRadius = useDeferredValue(blockSpreadRadius)
	const dBlockWeightHigh = useDeferredValue(blockWeightHigh)
	const dBlockWeightLow = useDeferredValue(blockWeightLow)

	// Props toggles for word mode
	const [opacityProp, setOpacityProp] = useState(false)
	const [italicProp, setItalicProp] = useState(false)

	// Gyro state
	const [gyroMode, setGyroMode] = useState(false)
	const [showGyro, setShowGyro] = useState(false)

	// Detect touch/gyro-capable devices after mount
	useEffect(() => {
		const hasHoverNone = window.matchMedia('(hover: none)').matches
		const hasOrientation = typeof DeviceOrientationEvent !== 'undefined'
		setShowGyro(hasHoverNone && hasOrientation)
	}, [])

	// Gyro → synthetic mousemove on document
	useEffect(() => {
		if (!gyroMode) return
		let rafId: number | null = null
		const handleOrientation = (e: DeviceOrientationEvent) => {
			if (rafId !== null) return
			rafId = requestAnimationFrame(() => {
				rafId = null
				if (e.gamma !== null && e.beta !== null) {
					const x = Math.round(((e.gamma + 90) / 180) * window.innerWidth)
					const clamped = Math.max(15, Math.min(90, e.beta))
					const y = Math.round(((clamped - 15) / 75) * window.innerHeight)
					document.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y, bubbles: true }))
				}
			})
		}
		window.addEventListener('deviceorientation', handleOrientation)
		return () => {
			window.removeEventListener('deviceorientation', handleOrientation)
			if (rafId !== null) cancelAnimationFrame(rafId)
		}
	}, [gyroMode])

	/** Toggle gyro — requests iOS permission if needed */
	const toggleGyro = async () => {
		if (gyroMode) {
			setGyroMode(false)
			return
		}
		// iOS 13+ requires permission
		const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }
		if (typeof DOE.requestPermission === 'function') {
			try {
				const permission = await DOE.requestPermission()
				if (permission === 'granted') setGyroMode(true)
			} catch {
				// permission denied or unavailable
			}
		} else {
			setGyroMode(true)
		}
	}

	const dWeightHigh = useDeferredValue(weightHigh)
	const dWeightLow = useDeferredValue(weightLow)
	const dRadius = useDeferredValue(radius)

	const sampleStyle: React.CSSProperties = {
		fontFamily: "var(--font-merriweather), serif",
		fontSize: "1.125rem",
		lineHeight: "1.8",
		fontVariationSettings: '"wght" 300, "opsz" 18, "wdth" 100',
	}

	// Build merged props object for word mode
	const fieldProps = opacityProp || italicProp
		? {
			...(opacityProp ? { opacity: [0.5, 1.0] as [number, number] } : {}),
			...(italicProp ? { italic: true } : {}),
		}
		: undefined

	return (
		<div className="w-full">
			{/* Mode toggle */}
			<div className="flex flex-wrap items-center gap-3 mb-6">
				<ToggleGroup
					label="Mode"
					options={['char', 'word', 'legibility'] as const}
					value={mode}
					onChange={setMode}
				/>
			</div>

			{/* Word mode controls */}
			{mode === 'word' && (
				<>
					<div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-6">
						<Slider label="Weight High" value={weightHigh} min={100} max={900} step={10} onChange={setWeightHigh} />
						<Slider label="Weight Low"  value={weightLow}  min={100} max={900} step={10} onChange={setWeightLow}  />
						<Slider label="Radius"      value={radius}     min={60}  max={240} step={10} onChange={setRadius}     />
					</div>
					<div className="flex flex-wrap items-center gap-3 mb-4">
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
					<div className="flex flex-wrap items-center gap-3 mb-8">
						<span className="text-xs uppercase tracking-widest opacity-50">Props</span>
						<ToggleButton label="opacity" value={opacityProp} onChange={setOpacityProp} />
						<ToggleButton label="italic" value={italicProp} onChange={setItalicProp} />
						{showGyro && (
							<ToggleButton
								label={gyroMode ? "Gaze active" : "gyro"}
								value={gyroMode}
								onChange={toggleGyro}
								icon={<GyroIcon />}
								title="On glasses: head orientation = gaze position. Tilt to simulate."
							/>
						)}
					</div>
					<p className="text-xs opacity-50 mb-2" style={{ lineHeight: "1.6" }}>
						Word mode — each word pulls toward its nearest magnetic pole (gaze direction on glasses).
					</p>
					<div className="flex flex-col gap-8">
						{FIELD_PARAGRAPHS.map((para, i) => (
							<MagnetTypeText
								key={i}
								mode="word"
								axes={{ wght: [dWeightLow, dWeightHigh] }}
								radius={dRadius}
								falloff={falloff}
								magnetMode={magnetMode}
								props={fieldProps}
								style={sampleStyle}
							>
								{para}
							</MagnetTypeText>
						))}
					</div>
					<p className="text-xs opacity-50 italic mt-8" style={{ lineHeight: "1.8" }}>
						{gyroMode
							? "On smart glasses, head orientation maps directly to gaze. magnetType responds to where you’re looking — axis variation follows your gaze across the text. Each word responds to proximity independently: words inside the radius attract toward the peak weight, words outside hold at rest."
							: "Move your cursor through the text — on glasses, this is gaze. Each word responds to proximity independently: words inside the radius attract toward the peak weight, words outside hold at rest. Try switching between attract and repel, or between linear and quadratic falloff. Cross-paragraph by default: all paragraphs respond to the same cursor."
						}
					</p>
				</>
			)}

			{/* Legibility mode controls + text */}
			{mode === 'legibility' && (
				<>
					<p className="text-xs opacity-50 mb-8">
						Legibility mode boosts the wdth axis on visually confusable characters (il1I, rn, 0O) in proportion to their confusion risk. Move your cursor over the text — characters near the cursor receive the full boost, fading out by distance. On touch devices the boost is always active.
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

			{/* Character mode */}
			{mode === 'char' && (
				<>
					<div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-8">
						<Slider label="Spread Radius" value={blockSpreadRadius} min={20} max={300} step={10} onChange={setBlockSpreadRadius} />
						<Slider label="Weight High"   value={blockWeightHigh}   min={100} max={900} step={10} onChange={setBlockWeightHigh}   />
						<Slider label="Weight Low"    value={blockWeightLow}    min={100} max={900} step={10} onChange={setBlockWeightLow}    />
					</div>
					<p className="text-xs opacity-50 mb-6" style={{ lineHeight: "1.6" }}>
						Character mode — per-character weight gradient across any block element. Works with mixed content (inline code, links, etc). Move your cursor through the paragraphs below.
					</p>
					<div className="flex flex-col gap-8">
						{CHAR_PARAGRAPHS.map((para, i) => (
							<MagnetChar
								key={i}
								spreadRadius={dBlockSpreadRadius}
								minWeight={dBlockWeightLow}
								maxWeight={dBlockWeightHigh}
								style={sampleStyle}
							>
								{para}
							</MagnetChar>
						))}
					</div>
					<p className="text-xs opacity-50 italic mt-8" style={{ lineHeight: "1.8" }}>
						spreadRadius controls how far from the cursor each character's weight fades to its minimum. Use proximityRadius to gate the effect to when the cursor is near the element edge, or omit it to always respond. Both props are independent and combinable.
					</p>
				</>
			)}
		</div>
	)
}
