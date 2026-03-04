
-- Add fixed-date booking fields to tours
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS is_fixed_date boolean NOT NULL DEFAULT false;
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS departure_date date;
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS allow_custom_dates boolean NOT NULL DEFAULT true;

-- Add trending flag to destinations
ALTER TABLE public.destinations ADD COLUMN IF NOT EXISTS is_trending boolean NOT NULL DEFAULT false;

-- Deduplicate destinations: keep the oldest record for each name, reassign tours
DO $$
DECLARE
  dup RECORD;
  canonical_id uuid;
BEGIN
  FOR dup IN
    SELECT LOWER(TRIM(name)) AS norm_name
    FROM public.destinations
    GROUP BY LOWER(TRIM(name))
    HAVING COUNT(*) > 1
  LOOP
    SELECT id INTO canonical_id
    FROM public.destinations
    WHERE LOWER(TRIM(name)) = dup.norm_name
    ORDER BY created_at ASC
    LIMIT 1;

    UPDATE public.tours
    SET destination_id = canonical_id
    WHERE destination_id IN (
      SELECT id FROM public.destinations
      WHERE LOWER(TRIM(name)) = dup.norm_name AND id != canonical_id
    );

    DELETE FROM public.destinations
    WHERE LOWER(TRIM(name)) = dup.norm_name AND id != canonical_id;
  END LOOP;
END $$;

-- Standardize destination names to title case and trim
UPDATE public.destinations SET name = INITCAP(TRIM(name));

-- Add unique constraint on destination name (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'destinations_name_unique'
  ) THEN
    ALTER TABLE public.destinations ADD CONSTRAINT destinations_name_unique UNIQUE (name);
  END IF;
END $$;

-- Enforce unique slugs on tours
DO $$
DECLARE
  dup RECORD;
  counter int;
BEGIN
  FOR dup IN
    SELECT slug, COUNT(*) FROM public.tours WHERE slug IS NOT NULL GROUP BY slug HAVING COUNT(*) > 1
  LOOP
    counter := 1;
    FOR dup IN
      SELECT id FROM public.tours WHERE slug = dup.slug ORDER BY created_at ASC OFFSET 1
    LOOP
      UPDATE public.tours SET slug = slug || '-' || counter WHERE id = dup.id;
      counter := counter + 1;
    END LOOP;
  END LOOP;
END $$;
