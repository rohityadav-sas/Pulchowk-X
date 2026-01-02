import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import ENV from '../config/ENV.js'
import * as schema from '../models/auth-schema.js'

const sql = neon(ENV.DATABASE_URL)

export const db = drizzle({ client: sql, schema })
