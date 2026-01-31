ALTER TABLE "conversations" ADD COLUMN "buyer_deleted" text DEFAULT 'false' NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "seller_deleted" text DEFAULT 'false' NOT NULL;