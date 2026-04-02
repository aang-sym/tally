CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE sql;
  RETURN '{"status": "success"}'::JSONB;
END;
$$;