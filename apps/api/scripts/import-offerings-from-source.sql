-- =============================================================================
-- Import offerings from source DB into target `offering` table
-- Run this script on the TARGET database (tutorix dev).
-- Assumes: (1) `offering` table already exists and is empty
--          (2) You have exported source data and loaded it into offering_import_raw
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1: Create staging table (run once)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS offering_import_raw (
  id                     integer,
  name                   text NOT NULL,
  display_name           text NOT NULL,
  level                  integer NOT NULL DEFAULT 0,
  display_order          integer NOT NULL DEFAULT 99,
  medium_of_instruction  smallint,          -- source values 1..20; we map to 1, 2, 3
  parent_offering_id     integer,
  root_offering_id       integer
);

-- -----------------------------------------------------------------------------
-- STEP 2: Load data from source into offering_import_raw
-- In pgAdmin (source DB), export result of:
--
--   SELECT id, name, display_name, level, "order" AS display_order,
--          medium_of_instruction, parent_offering_id, root_offering_id
--   FROM offerings;
--
-- Then in TARGET DB: use pgAdmin Import on offering_import_raw (or \copy).
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- STEP 3: Map medium_of_instruction to 1=English, 2=Hindi, 3=Others
-- (Run after staging table is loaded.)
-- -----------------------------------------------------------------------------
UPDATE offering_import_raw
SET medium_of_instruction = CASE
  WHEN medium_of_instruction = 1 THEN 1   -- English
  WHEN medium_of_instruction = 2 THEN 2   -- Hindi
  ELSE 3                                   -- Others (any other source value)
END
WHERE medium_of_instruction IS NOT NULL;

-- Optional: set NULL to default English (1)
-- UPDATE offering_import_raw SET medium_of_instruction = 1 WHERE medium_of_instruction IS NULL;

-- -----------------------------------------------------------------------------
-- STEP 4: Validate staging (optional)
-- -----------------------------------------------------------------------------
-- Row count:
-- SELECT COUNT(*) AS staging_count FROM offering_import_raw;

-- Orphan parent/root IDs (should return 0 rows):
-- SELECT parent_offering_id FROM offering_import_raw
-- WHERE parent_offering_id IS NOT NULL
--   AND parent_offering_id NOT IN (SELECT id FROM offering_import_raw);
-- SELECT root_offering_id FROM offering_import_raw
-- WHERE root_offering_id IS NOT NULL
--   AND root_offering_id NOT IN (SELECT id FROM offering_import_raw);

-- -----------------------------------------------------------------------------
-- STEP 5: Insert into offering (base columns get DB/column defaults)
-- -----------------------------------------------------------------------------
INSERT INTO offering (
  id,
  name,
  display_name,
  level,
  display_order,
  medium_of_instruction,
  parent_offering_id,
  root_offering_id
)
SELECT
  id,
  name,
  display_name,
  level,
  display_order,
  medium_of_instruction,
  parent_offering_id,
  root_offering_id
FROM offering_import_raw;

-- -----------------------------------------------------------------------------
-- STEP 6: Advance sequence so next INSERT gets a new id
-- -----------------------------------------------------------------------------
SELECT setval(
  pg_get_serial_sequence('offering', 'id'),
  COALESCE((SELECT MAX(id) FROM offering), 1)
);

-- -----------------------------------------------------------------------------
-- STEP 7: Verify
-- -----------------------------------------------------------------------------
-- SELECT COUNT(*) AS offering_count FROM offering;
-- SELECT id, name, display_name, level, display_order, medium_of_instruction,
--        parent_offering_id, root_offering_id FROM offering LIMIT 10;

-- -----------------------------------------------------------------------------
-- STEP 8: Drop staging table when done (optional)
-- -----------------------------------------------------------------------------
-- DROP TABLE IF EXISTS offering_import_raw;
