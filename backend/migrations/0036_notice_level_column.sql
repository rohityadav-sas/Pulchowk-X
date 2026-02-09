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

ALTER TABLE "notice" ALTER COLUMN "level" DROP NOT NULL;
