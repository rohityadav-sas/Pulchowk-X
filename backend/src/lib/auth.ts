import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { expo } from '@better-auth/expo'
import { eq } from 'drizzle-orm'
import { db } from './db.js'
import * as schema from '../models/auth-schema.js'
import ENV from '../config/ENV.js'
import { createAuthMiddleware } from 'better-auth/api'
import { parseStudentEmail, determineUserRole } from './student-email-parser.js'
import { createStudentProfileFromEmail } from '../services/classroom.service.js'
import { sendToUser } from '../services/notification.service.js'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  plugins: [expo()],
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'guest',
      },
    },
  },
  socialProviders: {
    google: {
      prompt: 'select_account',
      clientId: ENV.GOOGLE_CLIENT_ID,
      clientSecret: ENV.GOOGLE_CLIENT_SECRET,
      // hd: "pcampus.edu.np",
      scope: ['email'],
    },
  },
  trustedOrigins: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://smart-pulchowk.vercel.app',
    'smart-pulchowk://',
    // Expo development URLs
    'exp://',
    'exp://**',
    'exp://192.168.*.*:*/**',
    'exp://10.*.*.*:*/**',
  ],
  experimental: {
    joins: true,
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== '/callback/:id') return
      const session = ctx.context.newSession
      if (!session?.user?.email) return

      // Determine role based on email format
      const email = session.user.email
      const derivedRole = determineUserRole(email)
      const parsedEmail = parseStudentEmail(email)

      // Read the persisted role to avoid clobbering manually assigned roles on sign-in.
      const existingUser = await db.query.user.findFirst({
        where: eq(schema.user.id, session.user.id),
        columns: { role: true },
      })
      const currentRole = existingUser?.role ?? session.user.role
      const isProtectedRole = currentRole === 'admin' || currentRole === 'teacher'

      // Only auto-upgrade from guest -> student, never auto-downgrade or overwrite protected roles.
      if (!isProtectedRole && currentRole === 'guest' && derivedRole === 'student') {
        await db
          .update(schema.user)
          .set({ role: derivedRole })
          .where(eq(schema.user.id, session.user.id))
      }

      // If valid student email, auto-create student profile
      if (
        parsedEmail.isValid &&
        (currentRole === 'student' ||
          (!isProtectedRole && currentRole === 'guest' && derivedRole === 'student'))
      ) {
        try {
          await createStudentProfileFromEmail(session.user.id, parsedEmail)
        } catch (error) {
          // Log but don't fail auth if profile creation fails
          console.error('Failed to create student profile:', error)
        }
      }

      const sessionMeta = (ctx.context.newSession as any)?.session
      sendToUser(session.user.id, {
        title: 'New sign-in detected',
        body: 'Your account was signed in from a new session.',
        data: {
          type: 'security_alert',
          iconKey: 'general',
          ipAddress: sessionMeta?.ipAddress || '',
          userAgent: sessionMeta?.userAgent || '',
        },
      }).catch((error) =>
        console.error('Failed to send security alert notification:', error),
      )
    }),
  },
})
