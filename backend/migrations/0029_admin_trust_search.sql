ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "is_verified_seller" boolean DEFAULT false NOT NULL;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "seller_ratings" (
  "id" serial PRIMARY KEY NOT NULL,
  "seller_id" text NOT NULL,
  "rater_id" text NOT NULL,
  "listing_id" integer NOT NULL,
  "rating" integer NOT NULL,
  "review" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "user_blocks" (
  "id" serial PRIMARY KEY NOT NULL,
  "blocker_id" text NOT NULL,
  "blocked_user_id" text NOT NULL,
  "reason" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "marketplace_reports" (
  "id" serial PRIMARY KEY NOT NULL,
  "reporter_id" text NOT NULL,
  "reported_user_id" text NOT NULL,
  "listing_id" integer,
  "category" varchar(50) NOT NULL,
  "description" text NOT NULL,
  "status" varchar(20) DEFAULT 'open' NOT NULL,
  "resolution_notes" text,
  "reviewed_by" text,
  "reviewed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "seller_ratings" ADD CONSTRAINT "seller_ratings_seller_id_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "seller_ratings" ADD CONSTRAINT "seller_ratings_rater_id_user_id_fk" FOREIGN KEY ("rater_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "seller_ratings" ADD CONSTRAINT "seller_ratings_listing_id_book_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."book_listings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_id_user_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_user_id_user_id_fk" FOREIGN KEY ("blocked_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "marketplace_reports" ADD CONSTRAINT "marketplace_reports_reporter_id_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "marketplace_reports" ADD CONSTRAINT "marketplace_reports_reported_user_id_user_id_fk" FOREIGN KEY ("reported_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "marketplace_reports" ADD CONSTRAINT "marketplace_reports_listing_id_book_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."book_listings"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "marketplace_reports" ADD CONSTRAINT "marketplace_reports_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "seller_ratings_unique_idx" ON "seller_ratings" USING btree ("seller_id","rater_id","listing_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "seller_ratings_seller_idx" ON "seller_ratings" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "seller_ratings_rater_idx" ON "seller_ratings" USING btree ("rater_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "seller_ratings_listing_idx" ON "seller_ratings" USING btree ("listing_id");--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "user_blocks_unique_idx" ON "user_blocks" USING btree ("blocker_id","blocked_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_blocks_blocker_idx" ON "user_blocks" USING btree ("blocker_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_blocks_blocked_idx" ON "user_blocks" USING btree ("blocked_user_id");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "marketplace_reports_status_idx" ON "marketplace_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "marketplace_reports_reporter_idx" ON "marketplace_reports" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "marketplace_reports_reported_idx" ON "marketplace_reports" USING btree ("reported_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "marketplace_reports_listing_idx" ON "marketplace_reports" USING btree ("listing_id");

