// vitest.config.ts — test configuration with happy-dom environment and React JSX transform
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
	plugins: [react()],
	test: {
		environment: 'happy-dom',
	},
})
