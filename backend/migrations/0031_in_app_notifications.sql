DO $$ BEGIN
 CREATE TYPE "public"."notification_audience" AS ENUM('direct', 'all', 'students', 'teachers', 'admins');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" serial PRIMARY KEY NOT NULL,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "data" jsonb,
  "recipient_id" text,
  "audience" "notification_audience" DEFAULT 'direct' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "notification_reads" (
  "id" serial PRIMARY KEY NOT NULL,
  "notification_id" integer NOT NULL,
  "user_id" text NOT NULL,
  "read_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_user_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "notifications_recipient_created_idx" ON "notifications" USING btree ("recipient_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_audience_created_idx" ON "notifications" USING btree ("audience","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_type_created_idx" ON "notifications" USING btree ("type","created_at");--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "notification_reads_unique_idx" ON "notification_reads" USING btree ("notification_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_reads_user_read_idx" ON "notification_reads" USING btree ("user_id","read_at");
