import { pgTable, serial, text, varchar, timestamp } from 'drizzle-orm/pg-core'

export const notice = pgTable('notice', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 500 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  level: varchar('level', { length: 50 }),
  attachmentUrl: text('attachment_url'),
  publishedDate: varchar('published_date', { length: 100 }),
  sourceUrl: text('source_url'),
  externalRef: varchar('external_ref', { length: 120 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

export type Notice = typeof notice.$inferSelect
export type NewNotice = typeof notice.$inferInsert
