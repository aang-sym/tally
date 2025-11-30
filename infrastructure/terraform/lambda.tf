# Lambda Functions Configuration

resource "aws_lambda_layer_version" "data_processing" {
  filename            = "lambda_layers/data_processing.zip"
  layer_name          = "${var.project_name}-data-processing"
  compatible_runtimes = ["python3.11"]

  description = "Shared libraries: pandas, pyarrow, requests"

  source_code_hash = filebase64sha256("lambda_layers/data_processing.zip")
}

resource "aws_lambda_function" "tmdb_daily_sync" {
  filename         = "lambda_packages/tmdb_daily_sync.zip"
  function_name    = "${var.project_name}-tmdb-daily-sync-${var.environment}"
  role            = aws_iam_role.lambda_execution.arn
  handler         = "handler.lambda_handler"
  runtime         = "python3.11"
  timeout         = 300
  memory_size     = 512

  source_code_hash = filebase64sha256("lambda_packages/tmdb_daily_sync.zip")

  layers = [aws_lambda_layer_version.data_processing.arn]

  environment {
    variables = {
      TMDB_API_KEY = var.tmdb_api_key
      S3_BUCKET    = aws_s3_bucket.datalake.id
      ENVIRONMENT  = var.environment
      LOG_LEVEL    = "INFO"
    }
  }
}

resource "aws_cloudwatch_log_group" "tmdb_daily_sync" {
  name              = "/aws/lambda/${aws_lambda_function.tmdb_daily_sync.function_name}"
  retention_in_days = 7
}

resource "aws_cloudwatch_event_rule" "tmdb_daily_sync" {
  name                = "${var.project_name}-tmdb-daily-sync"
  description         = "Trigger TMDB sync Lambda daily at 3 AM UTC"
  schedule_expression = "cron(0 3 * * ? *)"
}

resource "aws_cloudwatch_event_target" "tmdb_daily_sync" {
  rule      = aws_cloudwatch_event_rule.tmdb_daily_sync.name
  target_id = "TallyTmdbSync"
  arn       = aws_lambda_function.tmdb_daily_sync.arn
}

resource "aws_lambda_permission" "allow_eventbridge_tmdb_sync" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.tmdb_daily_sync.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.tmdb_daily_sync.arn
}

resource "aws_lambda_function" "bronze_to_silver" {
  filename         = "lambda_packages/bronze_to_silver.zip"
  function_name    = "${var.project_name}-bronze-to-silver-${var.environment}"
  role            = aws_iam_role.lambda_execution.arn
  handler         = "handler.lambda_handler"
  runtime         = "python3.11"
  timeout         = 300
  memory_size     = 1024

  source_code_hash = filebase64sha256("lambda_packages/bronze_to_silver.zip")

  layers = [aws_lambda_layer_version.data_processing.arn]

  environment {
    variables = {
      S3_BUCKET   = aws_s3_bucket.datalake.id
      ENVIRONMENT = var.environment
      LOG_LEVEL   = "INFO"
    }
  }
}

resource "aws_cloudwatch_log_group" "bronze_to_silver" {
  name              = "/aws/lambda/${aws_lambda_function.bronze_to_silver.function_name}"
  retention_in_days = 7
}

resource "aws_cloudwatch_metric_alarm" "tmdb_sync_errors" {
  alarm_name          = "${var.project_name}-tmdb-sync-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 1
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.tmdb_daily_sync.function_name
  }

  alarm_description = "Alert when TMDB sync Lambda has errors"
}

resource "aws_cloudwatch_metric_alarm" "etl_errors" {
  alarm_name          = "${var.project_name}-etl-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 3
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.bronze_to_silver.function_name
  }

  alarm_description = "Alert when ETL Lambda has multiple errors"
}
