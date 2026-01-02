import { defineConfig } from 'drizzle-kit'
import ENV from './src/config/ENV.js'

export default defineConfig({
	schema: './models/auth-schema.ts',
	out: './migrations',
	dialect: 'postgresql',
	dbCredentials: {
		url: ENV.DATABASE_URL
	}
})
