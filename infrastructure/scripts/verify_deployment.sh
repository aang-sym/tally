#!/bin/bash
set -e

echo "🔍 Verifying Tally Data Pipeline Deployment"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get Terraform outputs
cd ../terraform
DATALAKE_BUCKET=$(terraform output -raw datalake_bucket_name 2>/dev/null || echo "")
LAMBDA_INGESTION=$(terraform output -raw lambda_ingestion_function_name 2>/dev/null || echo "")
LAMBDA_ETL=$(terraform output -raw lambda_etl_function_name 2>/dev/null || echo "")
GLUE_DB=$(terraform output -raw glue_database_name 2>/dev/null || echo "")
ATHENA_WG=$(terraform output -raw athena_workgroup 2>/dev/null || echo "")

if [ -z "$DATALAKE_BUCKET" ]; then
    echo -e "${RED}❌ Terraform outputs not found. Have you run 'terraform apply'?${NC}"
    exit 1
fi

echo -e "${YELLOW}Infrastructure${NC}"
echo "  Datalake Bucket: $DATALAKE_BUCKET"
echo "  Ingestion Lambda: $LAMBDA_INGESTION"
echo "  ETL Lambda: $LAMBDA_ETL"
echo "  Glue Database: $GLUE_DB"
echo "  Athena Workgroup: $ATHENA_WG"
echo ""

# Check S3 buckets
echo -e "${YELLOW}Checking S3 Buckets...${NC}"
if aws s3 ls "s3://$DATALAKE_BUCKET" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Datalake bucket exists"
else
    echo -e "  ${RED}✗${NC} Datalake bucket not found"
fi

# Check Lambda functions
echo ""
echo -e "${YELLOW}Checking Lambda Functions...${NC}"

if aws lambda get-function --function-name "$LAMBDA_INGESTION" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Ingestion Lambda exists"
    INGESTION_STATE=$(aws lambda get-function --function-name "$LAMBDA_INGESTION" --query 'Configuration.State' --output text)
    echo "    State: $INGESTION_STATE"
else
    echo -e "  ${RED}✗${NC} Ingestion Lambda not found"
fi

if aws lambda get-function --function-name "$LAMBDA_ETL" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} ETL Lambda exists"
    ETL_STATE=$(aws lambda get-function --function-name "$LAMBDA_ETL" --query 'Configuration.State' --output text)
    echo "    State: $ETL_STATE"
else
    echo -e "  ${RED}✗${NC} ETL Lambda not found"
fi

# Check Glue database
echo ""
echo -e "${YELLOW}Checking Glue Database...${NC}"
if aws glue get-database --name "$GLUE_DB" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Glue database exists"
else
    echo -e "  ${RED}✗${NC} Glue database not found"
fi

# Check for Bronze data
echo ""
echo -e "${YELLOW}Checking Data Lake Contents...${NC}"
BRONZE_COUNT=$(aws s3 ls "s3://$DATALAKE_BUCKET/bronze/tmdb/shows/" --recursive 2>/dev/null | wc -l || echo "0")
SILVER_COUNT=$(aws s3 ls "s3://$DATALAKE_BUCKET/silver/shows/" --recursive 2>/dev/null | wc -l || echo "0")

echo "  Bronze files: $BRONZE_COUNT"
echo "  Silver files: $SILVER_COUNT"

if [ "$BRONZE_COUNT" -gt 0 ]; then
    echo -e "  ${GREEN}✓${NC} Bronze data exists"
else
    echo -e "  ${YELLOW}⚠${NC}  No Bronze data yet (run manual trigger)"
fi

if [ "$SILVER_COUNT" -gt 0 ]; then
    echo -e "  ${GREEN}✓${NC} Silver data exists"
else
    echo -e "  ${YELLOW}⚠${NC}  No Silver data yet (trigger ingestion first)"
fi

# Check EventBridge rule
echo ""
echo -e "${YELLOW}Checking EventBridge Schedule...${NC}"
RULE_NAME="tally-tmdb-daily-sync"
if aws events describe-rule --name "$RULE_NAME" > /dev/null 2>&1; then
    RULE_STATE=$(aws events describe-rule --name "$RULE_NAME" --query 'State' --output text)
    echo -e "  ${GREEN}✓${NC} EventBridge rule exists"
    echo "    State: $RULE_STATE"
    SCHEDULE=$(aws events describe-rule --name "$RULE_NAME" --query 'ScheduleExpression' --output text)
    echo "    Schedule: $SCHEDULE"
else
    echo -e "  ${RED}✗${NC} EventBridge rule not found"
fi

echo ""
echo -e "${GREEN}✅ Verification complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Trigger first sync: bash trigger_sync.sh"
echo "  2. Check logs: bash view_logs.sh"
echo "  3. Query data: Open Athena console and run queries"
