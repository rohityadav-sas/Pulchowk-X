import { toNodeHandler } from 'better-auth/node'
import express from 'express'
import path from 'path'
import { createServer } from 'http'
import compression from 'compression'
import { sql } from 'drizzle-orm'
import { auth } from './lib/auth.js'
import ENV from './config/ENV.js'
import { db } from './lib/db.js'
import eventRoutes from './routes/events.route.js'
import clubProfileRoutes from './routes/clubProfile.route.js'
import chatBotRoutes from './routes/chatBot.route.js'
import userRoutes from './routes/user.route.js'
import bookRoutes from './routes/books.route.js'
import classroomRoutes from './routes/classroom.route.js'
import chatRoutes from './routes/chat.route.js'
import noticeRoutes from './routes/notice.route.js'
import adminRoutes from './routes/admin.route.js'
import searchRoutes from './routes/search.route.js'
import notificationsRoutes from './routes/notifications.route.js'
import { startNotificationReminderJobs } from './services/notification-jobs.service.js'

const app = express()
const httpServer = createServer(app)

const __dirname = import.meta.dirname

app.all('/api/auth/{*any}', toNodeHandler(auth))
app.use(compression())
app.use(express.json({ limit: '1mb' }))
app.use("/api/events", eventRoutes)
app.use("/api/clubs", clubProfileRoutes)
app.use("/api/chatbot", chatBotRoutes);
app.use("/api/users", userRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/classroom", classroomRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/notifications", notificationsRoutes);

app.use(
  express.static(path.join(__dirname, '../../frontend/dist'), {
    etag: true,
    setHeaders: (res, filePath) => {
      const fileName = path.basename(filePath)

      if (fileName === 'index.html') {
        res.setHeader('Cache-Control', 'no-cache')
        return
      }

      const isHashedAsset =
        /\.[A-Za-z0-9_-]{8,}\.(js|css|woff2?|ttf|png|jpe?g|svg)$/.test(fileName)

      if (isHashedAsset) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      } else {
        res.setHeader('Cache-Control', 'public, max-age=3600')
      }
    },
  }),
)

app.get('/{*splat}', async (_, res) => {
  res.setHeader('Cache-Control', 'no-cache')
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'))
})

async function ensureRuntimeSchema() {
  await db.execute(sql`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'notice' AND column_name = 'section'
      ) THEN
        ALTER TABLE "notice" RENAME COLUMN "section" TO "category";
      END IF;
    END $$;
  `)
  await db.execute(sql`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'notice' AND column_name = 'subsection'
      ) THEN
        ALTER TABLE "notice" RENAME COLUMN "subsection" TO "level";
      END IF;
    END $$;
  `)
  await db.execute(sql`ALTER TABLE "notice" DROP COLUMN IF EXISTS "content"`)
  await db.execute(sql`ALTER TABLE "notice" ALTER COLUMN "level" DROP NOT NULL`)
  await db.execute(sql`ALTER TABLE "notice" ADD COLUMN IF NOT EXISTS "published_date" varchar(100)`)
  await db.execute(sql`ALTER TABLE "notice" ADD COLUMN IF NOT EXISTS "source_url" text`)
  await db.execute(sql`ALTER TABLE "notice" ADD COLUMN IF NOT EXISTS "external_ref" varchar(120)`)
  await db.execute(sql`ALTER TABLE "notice" DROP COLUMN IF EXISTS "author_id"`)
  await db.execute(sql`ALTER TABLE "notice" DROP COLUMN IF EXISTS "attachment_name"`)
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "notice_external_ref_unique"
    ON "notice" ("external_ref")
  `)

  await db.execute(sql`
    ALTER TABLE "user"
    ADD COLUMN IF NOT EXISTS "notification_preferences" jsonb
    DEFAULT '{"eventReminders":true,"marketplaceAlerts":true,"noticeUpdates":true,"classroomAlerts":true,"chatAlerts":true,"adminAlerts":true}'::jsonb
    NOT NULL
  `)
  await db.execute(sql`
    ALTER TABLE "user"
    ALTER COLUMN "notification_preferences"
    SET DEFAULT '{"eventReminders":true,"marketplaceAlerts":true,"noticeUpdates":true,"classroomAlerts":true,"chatAlerts":true,"adminAlerts":true}'::jsonb
  `)
  await db.execute(sql`
    UPDATE "user"
    SET "notification_preferences" = coalesce("notification_preferences", '{}'::jsonb)
      - 'inApp'
      - 'emailDigest'
      - 'soundEffects'
      || '{"classroomAlerts":true,"chatAlerts":true,"adminAlerts":true}'::jsonb
    WHERE "notification_preferences" ? 'inApp'
       OR "notification_preferences" ? 'emailDigest'
       OR "notification_preferences" ? 'soundEffects'
       OR NOT ("notification_preferences" ? 'classroomAlerts')
       OR NOT ("notification_preferences" ? 'chatAlerts')
       OR NOT ("notification_preferences" ? 'adminAlerts')
  `)
}

async function startServer() {
  try {
    await ensureRuntimeSchema()
  } catch (error) {
    console.error('Failed to apply runtime schema checks:', error)
  }

  if (ENV.MODE === "DEV") {
    httpServer.listen(3000, () =>
      console.log(`Server is running on port 3000 in ${ENV.MODE} mode`),
    )
  }

  startNotificationReminderJobs()
}

void startServer()

export default app
