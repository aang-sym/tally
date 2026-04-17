# CloudWatch dashboard for the Tally data pipeline.

resource "aws_cloudwatch_dashboard" "pipeline" {
  dashboard_name = "${var.project_name}-pipeline-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "text"
        x      = 0
        y      = 0
        width  = 24
        height = 2

        properties = {
          markdown = "# Tally Data Pipeline (${var.environment})\nBronze ingestion, Silver processing, and Supabase upsert health."
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 2
        width  = 12
        height = 6

        properties = {
          title   = "Lambda Error Rate"
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          stat    = "Sum"
          period  = 300
          yAxis = {
            left = {
              label = "Error %"
              min   = 0
            }
          }
          metrics = [
            ["AWS/Lambda", "Errors", "FunctionName", aws_lambda_function.tmdb_daily_sync.function_name, { id = "tmdb_errors", visible = false }],
            [".", "Invocations", ".", aws_lambda_function.tmdb_daily_sync.function_name, { id = "tmdb_invocations", visible = false }],
            [{ expression = "IF(tmdb_invocations>0,100*tmdb_errors/tmdb_invocations,0)", label = "TMDB daily sync", id = "tmdb_error_rate" }],
            ["AWS/Lambda", "Errors", "FunctionName", aws_lambda_function.bronze_to_silver.function_name, { id = "etl_errors", visible = false }],
            [".", "Invocations", ".", aws_lambda_function.bronze_to_silver.function_name, { id = "etl_invocations", visible = false }],
            [{ expression = "IF(etl_invocations>0,100*etl_errors/etl_invocations,0)", label = "Bronze to Silver", id = "etl_error_rate" }],
            ["AWS/Lambda", "Errors", "FunctionName", aws_lambda_function.silver_to_supabase.function_name, { id = "supabase_errors", visible = false }],
            [".", "Invocations", ".", aws_lambda_function.silver_to_supabase.function_name, { id = "supabase_invocations", visible = false }],
            [{ expression = "IF(supabase_invocations>0,100*supabase_errors/supabase_invocations,0)", label = "Silver to Supabase", id = "supabase_error_rate" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 2
        width  = 12
        height = 6

        properties = {
          title   = "Records Ingested Per Day"
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          stat    = "Sum"
          period  = 86400
          yAxis = {
            left = {
              label = "Shows"
              min   = 0
            }
          }
          metrics = [
            ["Tally/DataPipeline", "TotalShowsIngested", "Environment", var.environment, { label = "Total shows ingested" }],
            [".", "PopularShowsCount", ".", var.environment, "DataType", "popular_shows", { label = "Popular shows" }],
            [".", "TrendingShowsCount", ".", var.environment, "DataType", "trending_shows", { label = "Trending shows" }],
            [".", "AiringTodayCount", ".", var.environment, "DataType", "airing_today", { label = "Airing today" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 8
        width  = 12
        height = 6

        properties = {
          title   = "Silver Data Quality"
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          stat    = "Average"
          period  = 86400
          yAxis = {
            left = {
              label = "Pass rate %"
              min   = 0
              max   = 100
            }
          }
          metrics = [
            ["Tally/DataQuality", "DataQualityPassRate", "Environment", var.environment, "DataType", "popular_shows", { label = "Popular shows" }],
            [".", ".", ".", var.environment, ".", "trending_shows", { label = "Trending shows" }],
            [".", ".", ".", var.environment, ".", "airing_today", { label = "Airing today" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 8
        width  = 12
        height = 6

        properties = {
          title   = "Silver Records Processed / Failed"
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          stat    = "Sum"
          period  = 86400
          yAxis = {
            left = {
              label = "Records"
              min   = 0
            }
          }
          metrics = [
            ["Tally/DataQuality", "RecordsProcessed", "Environment", var.environment, "DataType", "popular_shows", { label = "Popular processed" }],
            [".", ".", ".", var.environment, ".", "trending_shows", { label = "Trending processed" }],
            [".", ".", ".", var.environment, ".", "airing_today", { label = "Airing processed" }],
            [".", "RecordsFailed", ".", var.environment, ".", "popular_shows", { label = "Popular failed" }],
            [".", ".", ".", var.environment, ".", "trending_shows", { label = "Trending failed" }],
            [".", ".", ".", var.environment, ".", "airing_today", { label = "Airing failed" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 14
        width  = 24
        height = 6

        properties = {
          title   = "Supabase Upsert Success / Failure"
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          stat    = "Sum"
          period  = 300
          yAxis = {
            left = {
              label = "Shows"
              min   = 0
            }
          }
          metrics = [
            ["Tally/Pipeline", "ShowsUpsertedToSupabase", "Environment", var.environment, { label = "Upserted" }],
            [".", "ShowsUpsertFailed", ".", var.environment, { label = "Failed" }],
          ]
        }
      },
    ]
  })
}

