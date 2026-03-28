# Lambda Functions Configuration

# AWS-managed pandas + pyarrow layer for bronze_to_silver ETL
# AWSSDKPandas is maintained by AWS — no build step required
# https://aws-sdk-pandas.readthedocs.io/en/stable/install.html#lambda-layer
locals {
  aws_sdk_pandas_layer_arn = "arn:aws:lambda:${var.aws_region}:336392948345:layer:AWSSDKPandas-Python310:20"
}

# SNS topic for pipeline alerts
resource "aws_sns_topic" "pipeline_alerts" {
  name = "${var.project_name}-pipeline-alerts-${var.environment}"
}

resource "aws_sns_topic_subscription" "alert_email" {
  count     = var.alert_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.pipeline_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_lambda_function" "tmdb_daily_sync" {
  filename         = "lambda_packages/tmdb_daily_sync.zip"
  function_name    = "${var.project_name}-tmdb-daily-sync-${var.environment}"
  role            = aws_iam_role.lambda_execution.arn
  handler         = "handler.lambda_handler"
  runtime         = "python3.10"
  timeout         = 300
  memory_size     = 512

  source_code_hash = filebase64sha256("lambda_packages/tmdb_daily_sync.zip")

  environment {
    variables = {
      SSM_PREFIX  = "/tally/${var.environment}"
      S3_BUCKET   = aws_s3_bucket.datalake.id
      ENVIRONMENT = var.environment
      LOG_LEVEL   = "INFO"
    }
  }
}

resource "aws_cloudwatch_log_group" "tmdb_daily_sync" {
  name              = "/aws/lambda/${aws_lambda_function.tmdb_daily_sync.function_name}"
  retention_in_days = 30
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
  runtime         = "python3.10"
  timeout         = 300
  memory_size     = 1024

  source_code_hash = filebase64sha256("lambda_packages/bronze_to_silver.zip")
  layers           = [local.aws_sdk_pandas_layer_arn]

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
  retention_in_days = 30
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
  alarm_actions     = [aws_sns_topic.pipeline_alerts.arn]
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
  alarm_actions     = [aws_sns_topic.pipeline_alerts.arn]
}
