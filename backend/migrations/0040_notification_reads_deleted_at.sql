ALTER TABLE "notification_reads"
ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;

CREATE INDEX IF NOT EXISTS "notification_reads_user_deleted_idx"
ON "notification_reads" USING btree ("user_id","deleted_at");
