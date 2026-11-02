-- Additive: existing collections stay unassigned until the owner chooses.
ALTER TABLE albums ADD COLUMN chapters TEXT NOT NULL DEFAULT '[]';
ALTER TABLE albums ADD COLUMN regions TEXT NOT NULL DEFAULT '[]';
