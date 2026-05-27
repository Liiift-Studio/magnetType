import type { Metadata } from "next"
import "./globals.css"
import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
	title: "Magnet Type — Cursor-field variable font axis variation",
	icons: { icon: "/icon.svg", shortcut: "/icon.svg", apple: "/icon.svg" },
	description: "Drive per-word variable font axes with cursor proximity. Words near the cursor attract toward a peak value; far words hold at rest. React and vanilla JS.",
	keywords: ["magnet type", "variable font", "cursor", "mouse", "proximity", "wght", "wdth", "typography", "TypeScript", "npm", "react"],
	openGraph: {
		title: "Magnet Type — Cursor-field variable font axis variation",
		description: "Drive per-word variable font axes with cursor proximity. A typographic interaction technique, now in one npm package.",
		url: "https://magnettype.com",
		siteName: "Magnet Type",
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: "Magnet Type — Cursor-field variable font axis variation",
		description: "Drive per-word variable font axes with cursor proximity. A typographic interaction technique, now in one npm package.",
	},
	metadataBase: new URL("https://magnettype.com"),
	alternates: { canonical: "https://magnettype.com" },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" className={`h-full antialiased ${inter.variable}`}>
			<body className="min-h-full flex flex-col">{children}</body>
		</html>
	)
}
