# Tally AWS Data Pipeline

> Production-grade data engineering pipeline for TMDB show metadata ingestion and processing

## Overview

This infrastructure implements a **Medallion Architecture** data pipeline on AWS:

```
TMDB API → Lambda (Daily) → S3 Bronze (Raw JSON)
                                   ↓
                            Lambda ETL (Triggered)
                                   ↓
                            S3 Silver (Parquet)
                                   ↓
                            Glue Crawler
                                   ↓
                            Athena (SQL Queries)
```

### Architecture Layers

- **Bronze Layer**: Raw JSON from TMDB API (immutable audit trail)
- **Silver Layer**: Cleaned, schema-enforced Parquet (queryable)
- **Gold Layer**: Business aggregations (Phase 2)

### Key Features

- ✅ Daily automated ingestion from TMDB API
- ✅ Event-driven ETL (S3 triggers Lambda)
- ✅ Data quality checks with metrics
- ✅ Partitioned storage for efficient queries
- ✅ Infrastructure as Code (Terraform)
- ✅ CloudWatch monitoring and alarms
- ✅ Cost-optimized (Free tier eligible)

---

## Prerequisites

### Required Tools

- **AWS CLI** >= 2.0 ([Install](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html))
- **Terraform** >= 1.0 ([Install](https://developer.hashicorp.com/terraform/install))
- **Python** >= 3.11
- **pip3** (Python package manager)

### AWS Account Setup

1. Create an AWS account (or use existing)
2. Configure AWS CLI with credentials:

```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Default region: us-east-1
# Default output format: json
```

3. Verify setup:

```bash
aws sts get-caller-identity
# Should show your AWS account details
```

### TMDB API Key

1. Create account at [themoviedb.org](https://www.themoviedb.org/signup)
2. Go to [API Settings](https://www.themoviedb.org/settings/api)
3. Request API key (select "Developer" option)
4. Copy your API key (starts with a long hex string)

---

## Quick Start (15 minutes)

### Step 1: Configure Terraform

```bash
cd infrastructure/terraform

# Copy example config
cp terraform.tfvars.example terraform.tfvars

# Edit with your TMDB API key
nano terraform.tfvars
# Set: tmdb_api_key = "your-actual-key-here"
```

### Step 2: Package Lambda Functions

```bash
cd ../scripts
./package_lambdas.sh
```

This creates:

- `terraform/lambda_packages/tmdb_daily_sync.zip`
- `terraform/lambda_packages/bronze_to_silver.zip`
- `terraform/lambda_layers/data_processing.zip`

### Step 3: Deploy Infrastructure

```bash
cd ../terraform

# Initialize Terraform
terraform init

# Preview changes
terraform plan

# Deploy (type 'yes' to confirm)
terraform apply
```

This creates:

- 2 S3 buckets (data lake + Athena results)
- 2 Lambda functions (ingestion + ETL)
- 1 Lambda layer (shared dependencies)
- EventBridge schedule (daily 3 AM UTC)
- Glue database and crawler
- Athena workgroup
- IAM roles and policies
- CloudWatch alarms

**Deployment time**: ~3 minutes

### Step 4: Verify Deployment

```bash
cd ../scripts
./verify_deployment.sh
```

Expected output:

```
🔍 Verifying Tally Data Pipeline Deployment

Infrastructure
  Datalake Bucket: tally-datalake-dev
  Ingestion Lambda: tally-tmdb-daily-sync-dev
  ETL Lambda: tally-bronze-to-silver-dev
  ...

✅ Verification complete!
```

### Step 5: Trigger First Sync

```bash
./trigger_sync.sh
```

This manually invokes the TMDB ingestion Lambda. You should see:

1. Lambda execution response
2. Bronze JSON files in S3
3. Silver Parquet files in S3 (after ~30 seconds)

### Step 6: Query Data with Athena

1. Open [AWS Athena Console](https://console.aws.amazon.com/athena/)
2. Select workgroup: `tally-dev`
3. Select database: `tally_dev`
4. Run sample query:

```sql
SELECT COUNT(*) as total_shows
FROM silver_shows;

SELECT title, popularity, vote_average
FROM silver_shows
WHERE dt = (SELECT MAX(dt) FROM silver_shows)
ORDER BY popularity DESC
LIMIT 10;
```

---

## Project Structure

```
infrastructure/
├── terraform/              # Infrastructure as Code
│   ├── main.tf            # Main config, variables, outputs
│   ├── s3.tf              # S3 buckets and lifecycle
│   ├── lambda.tf          # Lambda functions and triggers
│   ├── iam.tf             # IAM roles and policies
│   ├── glue.tf            # Glue catalog and Athena
│   ├── terraform.tfvars   # Your config (not committed)
│   └── .gitignore
│
├── lambda/                 # Lambda function code
│   ├── tmdb_daily_sync/   # Bronze ingestion
│   │   ├── handler.py
│   │   └── requirements.txt
│   │
│   └── bronze_to_silver/  # ETL processing
│       ├── handler.py
│       └── requirements.txt
│
├── scripts/                # Helper scripts
│   ├── package_lambdas.sh     # Build Lambda packages
│   ├── verify_deployment.sh   # Check deployment status
│   ├── trigger_sync.sh        # Manual sync trigger
│   └── view_logs.sh           # Tail CloudWatch logs
│
├── queries/                # Sample Athena queries
│   └── sample_queries.sql
│
└── README.md               # This file
```

---

## Daily Operations

### View Logs

```bash
cd scripts
./view_logs.sh
```

Choose:

1. TMDB Ingestion logs
2. ETL logs
3. Both

### Check S3 Data

```bash
# List Bronze data
aws s3 ls s3://tally-datalake-dev/bronze/tmdb/shows/ --recursive

# List Silver data
aws s3 ls s3://tally-datalake-dev/silver/shows/ --recursive

# Download a file
aws s3 cp s3://tally-datalake-dev/bronze/tmdb/shows/popular_shows/dt=2025-01-15/abc123.json ./
```

### Run Glue Crawler

```bash
aws glue start-crawler --name tally-silver-shows-crawler

# Check status
aws glue get-crawler --name tally-silver-shows-crawler --query 'Crawler.State'
```

### Check CloudWatch Metrics

```bash
# Ingestion metrics
aws cloudwatch get-metric-statistics \
    --namespace Tally/DataPipeline \
    --metric-name TotalShowsIngested \
    --start-time $(date -u -d '1 day ago' +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 86400 \
    --statistics Sum

# Data quality metrics
aws cloudwatch get-metric-statistics \
    --namespace Tally/DataQuality \
    --metric-name DataQualityPassRate \
    --start-time $(date -u -d '1 day ago' +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 86400 \
    --statistics Average
```

---

## Data Schema

### Bronze Layer

**Location**: `s3://tally-datalake-dev/bronze/tmdb/shows/{data_type}/dt={YYYY-MM-DD}/{execution_id}.json`

**Format**: Raw JSON from TMDB API with metadata wrapper

**Partitions**:

- `data_type`: `popular_shows`, `trending_shows`, `airing_today`
- `dt`: Date partition (YYYY-MM-DD)

**Sample**:

```json
{
  "results": [
    {
      "id": 12345,
      "name": "Show Title",
      "popularity": 123.45,
      "vote_average": 8.5,
      ...
    }
  ],
  "_metadata": {
    "ingestion_timestamp": "2025-01-15T03:00:00Z",
    "execution_id": "abc-123",
    "data_type": "popular_shows"
  }
}
```

### Silver Layer

**Location**: `s3://tally-datalake-dev/silver/shows/{data_type}/dt={YYYY-MM-DD}/data.parquet`

**Format**: Parquet (Snappy compression)

**Schema**:

```
show_id: Int64                  # TMDB show ID
title: String                   # Show name
original_title: String          # Original name
popularity: Float64             # Popularity score
vote_average: Float64           # Average rating (0-10)
vote_count: Int64               # Number of ratings
first_air_date: String          # First air date
genre_ids: Array<Int64>         # Genre IDs
origin_country: Array<String>   # Countries
poster_path: String             # Poster image path
backdrop_path: String           # Backdrop image path
overview: String                # Description
original_language: String       # Original language
ingestion_date: String          # Processing timestamp
data_type: String               # Source data type
dt: String (partition)          # Date partition
```

---

## Cost Breakdown

### Estimated Monthly Cost (After Free Tier)

| Service         | Usage                     | Cost              |
| --------------- | ------------------------- | ----------------- |
| Lambda          | ~3K invocations/month     | $0.00 (free tier) |
| S3 Standard     | ~500 MB                   | $0.01             |
| S3 Requests     | ~10K reads, 100 writes    | $0.01             |
| Glue Crawler    | ~30 runs @ 10 DPU-seconds | $0.00 (free tier) |
| Athena          | ~1 GB scanned             | $0.005            |
| CloudWatch Logs | ~100 MB                   | $0.05             |
| **Total**       |                           | **~$0.10/month**  |

### Free Tier Coverage (First 12 months)

- Lambda: 1M requests, 400K GB-seconds/month
- S3: 5 GB storage, 20K GET, 2K PUT
- Glue: 1M objects stored, 1M requests
- Athena: 10 GB scanned/month (ongoing)
- CloudWatch: 5 GB logs

**Result**: Essentially free for first year, minimal cost after.

---

## Troubleshooting

### Lambda Function Fails

**Check logs**:

```bash
cd scripts
./view_logs.sh
```

**Common issues**:

- **TMDB API rate limit**: Wait 10 seconds between retries
- **Timeout**: Increase timeout in `lambda.tf` (current: 300s)
- **Memory**: Increase memory_size in `lambda.tf`

### No Silver Data Generated

**Verify Bronze data exists**:

```bash
aws s3 ls s3://tally-datalake-dev/bronze/tmdb/shows/ --recursive
```

**Check ETL Lambda logs**:

```bash
aws logs tail /aws/lambda/tally-bronze-to-silver-dev --follow
```

**Common issues**:

- S3 notification not configured (check `s3.tf` dependency)
- Lambda permission missing (check IAM policy)

### Athena Query Fails

**Error: "Table not found"**

- Run Glue crawler: `aws glue start-crawler --name tally-silver-shows-crawler`
- Wait 2-3 minutes for completion

**Error: "Access Denied"**

- Check Athena workgroup: should be `tally-dev`
- Verify S3 bucket permissions

### Terraform Apply Fails

**Error: "file not found" for Lambda packages**

- Run `./scripts/package_lambdas.sh` first
- Verify ZIP files exist in `terraform/lambda_packages/`

**Error: "ResourceConflictException: already exists"**

- Resource already exists from previous deployment
- Option 1: `terraform import` existing resource
- Option 2: Change `project_name` in `terraform.tfvars`
- Option 3: Destroy and recreate: `terraform destroy && terraform apply`

---

## Advanced Configuration

### Change Schedule

Edit `lambda.tf`:

```hcl
resource "aws_cloudwatch_event_rule" "tmdb_daily_sync" {
  schedule_expression = "cron(0 12 * * ? *)"  # Run at noon UTC
}
```

### Add More Data Sources

1. Add new function in `lambda/tmdb_daily_sync/handler.py`:

```python
def fetch_on_the_air():
    url = f"{TMDB_BASE_URL}/tv/on_the_air"
    response = requests.get(url, params={'api_key': TMDB_API_KEY}, timeout=30)
    response.raise_for_status()
    return response.json()
```

2. Update `lambda_handler()`:

```python
results = {
    'popular_shows': fetch_popular_shows(),
    'trending_shows': fetch_trending_shows(),
    'airing_today': fetch_airing_today(),
    'on_the_air': fetch_on_the_air(),  # NEW
}
```

3. Redeploy:

```bash
cd scripts
./package_lambdas.sh
cd ../terraform
terraform apply
```

### Enable SNS Alerts

Add to `lambda.tf`:

```hcl
resource "aws_sns_topic" "pipeline_alerts" {
  name = "${var.project_name}-pipeline-alerts"
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.pipeline_alerts.arn
  protocol  = "email"
  endpoint  = "your-email@example.com"
}

resource "aws_cloudwatch_metric_alarm" "tmdb_sync_errors" {
  # ... existing config ...
  alarm_actions = [aws_sns_topic.pipeline_alerts.arn]
}
```

---

## Cleanup (Destroy Infrastructure)

### Option 1: Destroy Everything

```bash
cd terraform
terraform destroy
```

**Warning**: This deletes ALL data in S3 buckets!

### Option 2: Keep Data, Destroy Compute

```bash
# Comment out Lambda functions in lambda.tf
# Then:
terraform apply
```

### Option 3: Export Data First

```bash
# Download all data
aws s3 sync s3://tally-datalake-dev ./local-backup/

# Then destroy
terraform destroy
```

---

## Next Steps

### Phase 2: Gold Layer

Create business-level aggregations:

```python
# lambda/silver_to_gold/handler.py
def create_show_popularity_trends():
    """Aggregate popularity over time"""
    ...

def create_genre_analytics():
    """Calculate genre statistics"""
    ...
```

### Phase 3: Real-Time Streaming

Add Kinesis for real-time user events:

```
iOS App → API Gateway → Kinesis → Lambda → S3
```

### Phase 4: ML Models

Use SageMaker for:

- Show recommendation engine
- Churn prediction
- Optimal subscription timing

### Phase 5: Data Visualization

Connect to:

- QuickSight dashboards
- Tableau/Looker
- Grafana for metrics

---

## Interview Talking Points

**Architecture**: "Built a medallion data lake with Bronze/Silver/Gold layers using S3, Lambda, and Glue"

**ETL**: "Implemented event-driven ETL with data quality checks, achieving 95%+ pass rate"

**Performance**: "Athena queries return in <3 seconds on Parquet-optimized Silver layer"

**Cost**: "Entire pipeline runs for ~$0.10/month after free tier, processing 80+ shows daily"

**Scalability**: "Designed for horizontal scaling - can easily add more data sources or processing steps"

**Monitoring**: "CloudWatch metrics track ingestion counts, data quality, and Lambda errors with alarms"

---

## Contributing

This infrastructure is part of the Tally project. For questions or improvements:

1. Open an issue in the main repo
2. Submit a PR with tests
3. Update this README if adding features

---

## License

Part of the Tally project - see root LICENSE file.

---

**Built with ❤️ for portfolio and learning**
