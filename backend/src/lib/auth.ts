import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from './db.js'
import * as schema from '../models/auth-schema.js'
import ENV from '../config/ENV.js'

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema
	}),
	emailAndPassword: {
		enabled: true
	},
	socialProviders: {
		google: {
			clientId: ENV.GOOGLE_CLIENT_ID,
			clientSecret: ENV.GOOGLE_CLIENT_SECRET
		}
	},
	trustedOrigins: ['http://localhost:5173', 'http://localhost:3000', 'https://pulchowk-x.vercel.app'],
	experimental: {
		joins: true
	}
})
