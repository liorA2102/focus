-- Remove duplicate rows, keeping the latest (highest id) per (candidate_id, position_id)
DELETE FROM candidate_matches
WHERE id NOT IN (
  SELECT MAX(id) FROM candidate_matches GROUP BY candidate_id, position_id
);
--> statement-breakpoint
CREATE UNIQUE INDEX `candidate_matches_candidate_position_unique` ON `candidate_matches` (`candidate_id`, `position_id`);
