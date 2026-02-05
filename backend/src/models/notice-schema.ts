import { relations } from 'drizzle-orm'
import { pgTable, serial, text, varchar, timestamp } from 'drizzle-orm/pg-core'
import { user } from './auth-schema.js'

export const notice = pgTable('notice', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content').notNull(),
  section: varchar('section', { length: 50 }).notNull(), // 'results' | 'routines'
  subsection: varchar('subsection', { length: 50 }).notNull(), // 'be' | 'msc'
  attachmentUrl: text('attachment_url'),

  attachmentName: varchar('attachment_name', { length: 255 }),
  authorId: text('author_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

export const noticeRelations = relations(notice, ({ one }) => ({
  author: one(user, {
    fields: [notice.authorId],
    references: [user.id],
  }),
}))

export type Notice = typeof notice.$inferSelect
export type NewNotice = typeof notice.$inferInsert
