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

ALTER TABLE "notice" DROP COLUMN IF EXISTS "content";
ALTER TABLE "notice" ALTER COLUMN "subsection" DROP NOT NULL;
ALTER TABLE "notice" ADD COLUMN IF NOT EXISTS "published_date" varchar(100);
ALTER TABLE "notice" ADD COLUMN IF NOT EXISTS "source_url" text;
ALTER TABLE "notice" ADD COLUMN IF NOT EXISTS "external_ref" varchar(120);

CREATE UNIQUE INDEX IF NOT EXISTS "notice_external_ref_unique"
ON "notice" ("external_ref");
