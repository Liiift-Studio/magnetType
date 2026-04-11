// vitest.config.ts — test configuration with happy-dom environment
import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		environment: 'happy-dom',
	},
})
