# Silver → Supabase Lambda
# Reads cleaned Parquet from S3 silver layer and upserts shows into Supabase.
# Triggered by S3 PUT events on the silver/shows/ prefix.

resource "aws_lambda_function" "silver_to_supabase" {
  filename         = "lambda_packages/silver_to_supabase.zip"
  function_name    = "${var.project_name}-silver-to-supabase-${var.environment}"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "handler.lambda_handler"
  runtime          = "python3.10"
  timeout          = 300
  memory_size      = 512

  source_code_hash = filebase64sha256("lambda_packages/silver_to_supabase.zip")
  layers           = [local.aws_sdk_pandas_layer_arn]

  environment {
    variables = {
      SSM_PREFIX  = "/tally/${var.environment}"
      ENVIRONMENT = var.environment
      LOG_LEVEL   = "INFO"
    }
  }
}

resource "aws_cloudwatch_log_group" "silver_to_supabase" {
  name              = "/aws/lambda/${aws_lambda_function.silver_to_supabase.function_name}"
  retention_in_days = 30
}

resource "aws_lambda_permission" "allow_s3_silver_to_supabase" {
  statement_id  = "AllowS3InvokeSilverToSupabase"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.silver_to_supabase.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.datalake.arn
}

# S3 → Lambda trigger on silver/ prefix
# Note: S3 bucket notifications are managed on the bucket resource.
# We extend the existing aws_s3_bucket_notification in s3.tf by adding
# a second lambda_function block — see s3.tf.

resource "aws_cloudwatch_metric_alarm" "silver_to_supabase_errors" {
  alarm_name          = "${var.project_name}-silver-to-supabase-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 1
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.silver_to_supabase.function_name
  }

  alarm_description = "Alert when Silver→Supabase upsert Lambda has errors"
  alarm_actions     = [aws_sns_topic.pipeline_alerts.arn]
}
