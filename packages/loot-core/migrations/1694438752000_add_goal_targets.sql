BEGIN TRANSACTION;

ALTER TABLE zero_budgets ADD column goal INTEGER DEFAULT null;

COMMIT;