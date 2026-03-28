#!/bin/bash
# Creates the S3 bucket and DynamoDB table needed for Terraform remote state.
# Run this ONCE before the first terraform init.

set -e
PROFILE="tally-dev"
REGION="ap-southeast-2"
BUCKET="tally-terraform-state-961868453843"  # Account ID suffix ensures global uniqueness
TABLE="tally-terraform-locks"

echo "Creating Terraform state S3 bucket..."
aws s3 mb s3://$BUCKET --region $REGION --profile $PROFILE

aws s3api put-bucket-versioning \
  --bucket $BUCKET \
  --versioning-configuration Status=Enabled \
  --profile $PROFILE

aws s3api put-public-access-block \
  --bucket $BUCKET \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
  --profile $PROFILE

echo "Creating DynamoDB lock table..."
aws dynamodb create-table \
  --table-name $TABLE \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region $REGION \
  --profile $PROFILE

echo ""
echo "✅ State backend ready. Now run:"
echo "  cd infrastructure/terraform && terraform init"
