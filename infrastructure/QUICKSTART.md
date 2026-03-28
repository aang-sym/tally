# AWS Data Pipeline - Quick Start Guide

**Goal**: Deploy a working data pipeline in 15 minutes.

## Prerequisites ✅

```bash
# Verify you have:
aws --version          # AWS CLI 2.x
terraform --version    # Terraform 1.x
python3 --version      # Python 3.11+
```

## Step-by-Step Deployment

### 1. Get TMDB API Key (2 min)

1. Go to https://www.themoviedb.org/signup
2. Create account
3. Go to https://www.themoviedb.org/settings/api
4. Request API key (Developer option)
5. Copy your key

### 2. Configure (1 min)

```bash
cd infrastructure/terraform

cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars  # Paste your TMDB API key
```

### 3. Package Lambda Functions (2 min)

```bash
cd ../scripts
./package_lambdas.sh
```

Expected output:

```
📦 Packaging tmdb_daily_sync...
  ✓ tmdb_daily_sync.zip created
📦 Packaging bronze_to_silver...
  ✓ bronze_to_silver.zip created
📦 Creating Lambda Layer...
  ✓ data_processing.zip layer created
✅ All packages ready!
```

### 4. Deploy with Terraform (5 min)

```bash
cd ../terraform

terraform init    # Download AWS provider
terraform apply   # Type 'yes' when prompted
```

Wait for: `Apply complete! Resources: X added, 0 changed, 0 destroyed.`

### 5. Verify Deployment (1 min)

```bash
cd ../scripts
./verify_deployment.sh
```

You should see all ✓ checkmarks except data (no data yet).

### 6. Trigger First Sync (2 min)

```bash
./trigger_sync.sh
```

Watch the logs stream. You should see:

- "Starting TMDB daily sync"
- "Stored popular_shows: 20 shows"
- "Stored trending_shows: 20 shows"
- "Sync completed"

### 7. Query Data in Athena (2 min)

1. Open AWS Console → Athena
2. Select workgroup: `tally-dev`
3. Select database: `tally_dev`
4. Run this query:

```sql
SELECT
    title,
    popularity,
    vote_average
FROM silver_shows
WHERE dt = (SELECT MAX(dt) FROM silver_shows)
ORDER BY popularity DESC
LIMIT 10;
```

**Success!** 🎉 You should see a list of popular TV shows.

---

## What Just Happened?

1. **Terraform** created:
   - 2 S3 buckets (data lake + query results)
   - 2 Lambda functions (ingest + ETL)
   - EventBridge schedule (daily at 3 AM UTC)
   - Glue database + crawler
   - Athena workgroup

2. **Lambda ingestion** fetched:
   - Popular shows from TMDB
   - Trending shows
   - Shows airing today
   - Stored as JSON in S3 Bronze layer

3. **Lambda ETL** processed:
   - Read Bronze JSON
   - Applied data quality checks
   - Wrote Parquet to S3 Silver layer

4. **Glue Crawler** cataloged:
   - Discovered Parquet schema
   - Created Athena table

5. **Athena** queried:
   - SQL on S3 Parquet files
   - No database server needed!

---

## Daily Operations

### View Logs

```bash
cd scripts
./view_logs.sh
```

### Trigger Manual Sync

```bash
./trigger_sync.sh
```

### Check S3 Data

```bash
aws s3 ls s3://tally-datalake-dev/bronze/tmdb/shows/ --recursive
aws s3 ls s3://tally-datalake-dev/silver/shows/ --recursive
```

---

## Troubleshooting

### "Lambda packages not found"

- Run: `cd scripts && ./package_lambdas.sh`

### "No Silver data"

- Check ETL logs: `./view_logs.sh` → Option 2
- Verify Bronze data exists in S3

### "Table not found in Athena"

- Run Glue crawler: `aws glue start-crawler --name tally-silver-shows-crawler`
- Wait 2 minutes, then retry query

---

## Cost

**Free tier**: $0/month for first 12 months
**After free tier**: ~$0.10/month

---

## Next Steps

See full README.md for:

- Advanced configuration
- Adding more data sources
- Gold layer aggregations
- Monitoring and alerts
- ML integrations

---

## Questions?

- Check logs: `./view_logs.sh`
- Read full docs: `README.md`
- AWS Console → CloudWatch for metrics
