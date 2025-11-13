# AWS Glue and Athena Configuration

resource "aws_glue_catalog_database" "tally" {
  name        = "${var.project_name}_${var.environment}"
  description = "Data catalog for Tally show metadata and user analytics"
}

resource "aws_glue_crawler" "silver_shows" {
  name          = "${var.project_name}-silver-shows-crawler"
  database_name = aws_glue_catalog_database.tally.name
  role          = aws_iam_role.glue_crawler.arn

  s3_target {
    path = "s3://${aws_s3_bucket.datalake.id}/silver/shows/"
  }

  schema_change_policy {
    update_behavior = "UPDATE_IN_DATABASE"
    delete_behavior = "LOG"
  }

  # Run daily at 5 AM UTC (after TMDB sync at 3 AM)
  schedule = "cron(0 5 * * ? *)"
}

resource "aws_athena_workgroup" "tally" {
  name = "${var.project_name}-${var.environment}"

  configuration {
    enforce_workgroup_configuration    = true
    publish_cloudwatch_metrics_enabled = true

    result_configuration {
      output_location = "s3://${aws_s3_bucket.athena_results.id}/"

      encryption_configuration {
        encryption_option = "SSE_S3"
      }
    }

    engine_version {
      selected_engine_version = "Athena engine version 3"
    }
  }
}

resource "aws_athena_named_query" "popular_shows" {
  name      = "Popular Shows - Latest Partition"
  workgroup = aws_athena_workgroup.tally.id
  database  = aws_glue_catalog_database.tally.name
  query     = <<-EOT
    SELECT
      title,
      popularity,
      vote_average,
      vote_count,
      first_air_date
    FROM silver_shows
    WHERE dt = (SELECT MAX(dt) FROM silver_shows)
    ORDER BY popularity DESC
    LIMIT 20;
  EOT
}

resource "aws_athena_named_query" "data_quality_check" {
  name      = "Data Quality - Null Checks"
  workgroup = aws_athena_workgroup.tally.id
  database  = aws_glue_catalog_database.tally.name
  query     = <<-EOT
    SELECT
      dt as partition_date,
      COUNT(*) as total_records,
      SUM(CASE WHEN show_id IS NULL THEN 1 ELSE 0 END) as missing_show_id,
      SUM(CASE WHEN title IS NULL OR title = '' THEN 1 ELSE 0 END) as missing_title,
      SUM(CASE WHEN popularity < 0 THEN 1 ELSE 0 END) as invalid_popularity
    FROM silver_shows
    GROUP BY dt
    ORDER BY dt DESC;
  EOT
}
