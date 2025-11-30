# S3 Data Lake Configuration

resource "aws_s3_bucket" "datalake" {
  bucket = "${var.project_name}-datalake-${var.environment}"

  tags = {
    Name = "Tally Data Lake"
  }
}

resource "aws_s3_bucket_versioning" "datalake" {
  bucket = aws_s3_bucket.datalake.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "datalake" {
  bucket = aws_s3_bucket.datalake.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "datalake" {
  bucket = aws_s3_bucket.datalake.id

  rule {
    id     = "bronze-lifecycle"
    status = "Enabled"

    filter {
      prefix = "bronze/"
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }
  }

  rule {
    id     = "silver-lifecycle"
    status = "Enabled"

    filter {
      prefix = "silver/"
    }

    transition {
      days          = 60
      storage_class = "STANDARD_IA"
    }
  }
}

resource "aws_s3_bucket_notification" "datalake" {
  bucket = aws_s3_bucket.datalake.id

  # Important: Must depend on Lambda permission
  depends_on = [aws_lambda_permission.allow_s3_bronze_to_silver]

  lambda_function {
    lambda_function_arn = aws_lambda_function.bronze_to_silver.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "bronze/tmdb/shows/"
    filter_suffix       = ".json"
  }
}

resource "aws_lambda_permission" "allow_s3_bronze_to_silver" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.bronze_to_silver.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.datalake.arn
}

resource "aws_s3_bucket" "athena_results" {
  bucket = "${var.project_name}-athena-results-${var.environment}"
}

resource "aws_s3_bucket_public_access_block" "athena_results" {
  bucket = aws_s3_bucket.athena_results.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "athena_results" {
  bucket = aws_s3_bucket.athena_results.id

  rule {
    id     = "delete-old-results"
    status = "Enabled"

    expiration {
      days = 7
    }
  }
}
