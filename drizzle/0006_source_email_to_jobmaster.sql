-- Reclassify all "email" source candidates as "jobmaster"
-- All CV emails come through the JobMaster notification inbox
UPDATE candidates SET source = 'jobmaster' WHERE source = 'email';
