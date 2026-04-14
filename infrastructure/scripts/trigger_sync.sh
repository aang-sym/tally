#!/bin/bash
set -e

echo "🚀 Triggering TMDB Daily Sync Lambda"
echo ""

cd ../terraform
LAMBDA_NAME=$(terraform output -raw lambda_ingestion_function_name 2>/dev/null || echo "")

if [ -z "$LAMBDA_NAME" ]; then
    echo "❌ Error: Could not get Lambda function name from Terraform outputs"
    echo "Have you run 'terraform apply'?"
    exit 1
fi

echo "Invoking Lambda: $LAMBDA_NAME"
echo ""

aws lambda invoke \
    --function-name "$LAMBDA_NAME" \
    --payload '{}' \
    --cli-binary-format raw-in-base64-out \
    response.json

echo ""
echo "Response:"
cat response.json | python3 -m json.tool
echo ""

# Wait a moment for logs
echo "Waiting 5 seconds for logs..."
sleep 5

# Show recent logs
echo ""
echo "Recent logs:"
aws logs tail "/aws/lambda/$LAMBDA_NAME" --since 2m --format short

echo ""
echo "✅ Sync triggered! Check S3 for Bronze data:"
BUCKET=$(terraform output -raw datalake_bucket_name)
echo "   aws s3 ls s3://$BUCKET/bronze/tmdb/shows/ --recursive"
