import Demo from "@/components/Demo"
import CopyInstall from "@/components/CopyInstall"
import CodeBlock from "@/components/CodeBlock"
import ToolDirectory from "@/components/ToolDirectory"
import { version } from "../../../package.json"
import { version as siteVersion } from "../../package.json"
import SiteFooter from "../components/SiteFooter"

export default function Home() {
	return (
		<main className="flex flex-col items-center px-6 py-20 gap-24">

			{/* Hero */}
			<section className="w-full max-w-2xl lg:max-w-5xl flex flex-col gap-6">
				<div className="flex flex-col gap-2">
					<p className="text-xs uppercase tracking-widest opacity-50">magnettype</p>
					<h1 className="text-4xl lg:text-8xl xl:text-9xl" style={{ fontFamily: "var(--font-merriweather), serif", fontVariationSettings: '"wght" 300, "opsz" 144', lineHeight: "1.05em" }}>
						Per-word axis<br />
						<span style={{ opacity: 0.5, fontStyle: "italic" }}>variation.</span>
					</h1>
				</div>
				<div className="flex items-center gap-4">
					<CopyInstall />
					<a href="https://github.com/Liiift-Studio/MagnetType" className="text-sm opacity-50 hover:opacity-100 transition-opacity">GitHub</a>
				</div>
				<div className="flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-50 tracking-wide">
					<span>TypeScript</span><span>·</span><span>Zero dependencies</span><span>·</span><span>React + Vanilla JS</span>
				</div>
				<p className="text-base opacity-60 leading-relaxed max-w-lg">
					CSS applies font-variation-settings to an entire element. Magnet Type applies them word by word — driven by cursor proximity. Words inside the field attract toward a peak axis value; words outside hold at rest. Move your mouse through a paragraph and watch each word respond independently.
				</p>
			</section>

			{/* Demo */}
			<section className="w-full max-w-2xl lg:max-w-5xl flex flex-col gap-4">
				<p className="text-xs uppercase tracking-widest opacity-50">Live demo — move your cursor through the text</p>
				<div className="rounded-xl -mx-8 px-8 py-8" style={{ background: "rgba(0,0,0,0.25)", overflow: 'hidden' }}>
					<Demo />
				</div>
			</section>

			{/* Explanation */}
			<section className="w-full max-w-2xl lg:max-w-5xl flex flex-col gap-6">
				<p className="text-xs uppercase tracking-widest opacity-50">How it works</p>
				<div className="prose-grid grid grid-cols-1 sm:grid-cols-2 gap-12 text-sm leading-relaxed opacity-70">
					<div className="flex flex-col gap-3">
						<p className="font-semibold opacity-100 text-base">The cursor field</p>
						<p>Each word gets a span. On every animation frame, the distance from the cursor to each word&rsquo;s center is measured. Words within the radius receive a font-variation-settings value interpolated between rest and peak — closer words get more of the peak value.</p>
					</div>
					<div className="flex flex-col gap-3">
						<p className="font-semibold opacity-100 text-base">Attract and repel</p>
						<p>In attract mode, nearby words approach the peak axis value and far words hold at rest. In repel mode, the logic inverts — words near the cursor stay at rest while words in the outer ring of the field approach peak. Each creates a different reading texture.</p>
					</div>
					<div className="flex flex-col gap-3">
						<p className="font-semibold opacity-100 text-base">Field mode vs legibility mode</p>
						<p>Field mode runs a requestAnimationFrame loop driven by cursor position. Legibility mode is static — it wraps visually confusable characters (il1I, rn, 0O) in spans with a boosted wdth axis, improving disambiguation at small sizes without cursor interaction.</p>
					</div>
					<div className="flex flex-col gap-3">
						<p className="font-semibold opacity-100 text-base">Performance via rAF batching</p>
						<p>The field loop reads word positions with <code className="text-xs font-mono">getBoundingClientRect</code> in a single batch pass, then writes all font-variation-settings in a second pass. No layout thrashing. The loop is cancelled on unmount and restarted when options change.</p>
					</div>
				</div>
			</section>

			{/* Usage */}
			<section className="w-full max-w-2xl lg:max-w-5xl flex flex-col gap-6">
				<div className="flex items-baseline gap-4">
					<p className="text-xs uppercase tracking-widest opacity-50">Usage</p>
					<p className="text-xs opacity-50 tracking-wide">TypeScript + React · Vanilla JS</p>
				</div>
				<div className="flex flex-col gap-8 text-sm">
					<div className="flex flex-col gap-3">
						<p className="opacity-50">Drop-in component</p>
						<CodeBlock code={`import { MagnetTypeText } from '@liiift-studio/magnettype'

<MagnetTypeText mode="word" axes={{ wght: [300, 600] }} radius={120}>
  Your paragraph text here...
</MagnetTypeText>`} />
					</div>
					<div className="flex flex-col gap-3">
						<p className="opacity-50">Hook — attach to any element</p>
						<CodeBlock code={`import { useMagnetType } from '@liiift-studio/magnettype'

const ref = useMagnetType({ mode: 'word', axes: { wght: [300, 600] }, radius: 120 })
<p ref={ref}>{children}</p>`} />
					</div>
					<div className="flex flex-col gap-3">
						<p className="opacity-50">Vanilla JS</p>
						<CodeBlock code={`import { startMagnetType, getCleanHTML } from '@liiift-studio/magnettype'

const el = document.querySelector('p')
const original = getCleanHTML(el)
const stop = startMagnetType(el, original, { axes: { wght: [300, 600] }, radius: 120 })
// call stop() to cancel the rAF loop and restore markup`} />
					</div>
					<div className="flex flex-col gap-3">
						<p className="opacity-50">Options</p>
						<table className="w-full text-xs">
							<thead><tr className="opacity-50 text-left"><th className="pb-2 pr-6 font-normal">Option</th><th className="pb-2 pr-6 font-normal">Default</th><th className="pb-2 font-normal">Description</th></tr></thead>
							<tbody className="opacity-70">
								<tr className="border-t border-white/10 hover:bg-white/5 transition-colors"><td className="py-2 pr-6 font-mono">mode</td><td className="py-2 pr-6">&apos;word&apos;</td><td className="py-2">&apos;word&apos; — cursor proximity drives per-word font-variation-settings. &apos;legibility&apos; — static per-character wdth boost for confusable characters.</td></tr>
								<tr className="border-t border-white/10 hover:bg-white/5 transition-colors"><td className="py-2 pr-6 font-mono">axes</td><td className="py-2 pr-6">&#123; wght: [300, 500] &#125;</td><td className="py-2">Map of axis tag → [restValue, peakValue]. restValue applies at full distance; peakValue when cursor is directly over the word.</td></tr>
								<tr className="border-t border-white/10 hover:bg-white/5 transition-colors"><td className="py-2 pr-6 font-mono">radius</td><td className="py-2 pr-6">120</td><td className="py-2">Pixel radius over which the field effect fades. Words beyond this distance receive restValue.</td></tr>
								<tr className="border-t border-white/10 hover:bg-white/5 transition-colors"><td className="py-2 pr-6 font-mono">falloff</td><td className="py-2 pr-6">&apos;quadratic&apos;</td><td className="py-2">&apos;linear&apos; — strength decreases linearly with distance. &apos;quadratic&apos; — decreases as distance², giving a tighter hot zone.</td></tr>
								<tr className="border-t border-white/10 hover:bg-white/5 transition-colors"><td className="py-2 pr-6 font-mono">magnetMode</td><td className="py-2 pr-6">&apos;attract&apos;</td><td className="py-2">&apos;attract&apos; — words near cursor approach peakValue. &apos;repel&apos; — words near cursor stay at restValue; far words approach peakValue.</td></tr>
								<tr className="border-t border-white/10 hover:bg-white/5 transition-colors"><td className="py-2 pr-6 font-mono">wdthBoost</td><td className="py-2 pr-6">6</td><td className="py-2">wdth axis units added to confusable characters in legibility mode. Risk-proportional — highest-risk characters receive the full boost.</td></tr>
							</tbody>
						</table>
					</div>
				</div>
			</section>

			<SiteFooter current="magnetType" npmVersion={version} siteVersion={siteVersion} />

		</main>
	)
}
