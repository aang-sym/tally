# Tally Data Pipeline - Main Terraform Configuration

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "Tally"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "tally"
}

variable "tmdb_api_key" {
  description = "TMDB API key for fetching show data"
  type        = string
  sensitive   = true
}

output "datalake_bucket_name" {
  description = "Name of the S3 data lake bucket"
  value       = aws_s3_bucket.datalake.id
}

output "lambda_ingestion_function_name" {
  description = "Name of the TMDB ingestion Lambda function"
  value       = aws_lambda_function.tmdb_daily_sync.function_name
}

output "lambda_etl_function_name" {
  description = "Name of the Bronze->Silver ETL Lambda function"
  value       = aws_lambda_function.bronze_to_silver.function_name
}

output "glue_database_name" {
  description = "Name of the Glue catalog database"
  value       = aws_glue_catalog_database.tally.name
}

output "athena_workgroup" {
  description = "Athena workgroup for queries"
  value       = aws_athena_workgroup.tally.name
}

output "manual_test_command" {
  description = "Command to manually trigger TMDB sync"
  value       = "aws lambda invoke --function-name ${aws_lambda_function.tmdb_daily_sync.function_name} --payload '{}' response.json"
}
