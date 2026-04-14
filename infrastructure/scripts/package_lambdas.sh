#!/bin/bash
set -e

echo "🚀 Packaging Lambda Functions..."

# Navigate to scripts directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TERRAFORM_DIR="$PROJECT_ROOT/terraform"
LAMBDA_DIR="$PROJECT_ROOT/lambda"

# Create necessary directories
mkdir -p "$TERRAFORM_DIR/lambda_packages"
mkdir -p "$TERRAFORM_DIR/lambda_layers"

# Package tmdb_daily_sync
echo "📦 Packaging tmdb_daily_sync..."
cd "$LAMBDA_DIR/tmdb_daily_sync"
rm -rf package
mkdir package
pip3 install -r requirements.txt -t package/ --quiet --platform manylinux2014_x86_64 --only-binary=:all:
cp handler.py package/
cd package
zip -r "$TERRAFORM_DIR/lambda_packages/tmdb_daily_sync.zip" . > /dev/null
cd ..
rm -rf package
echo "  ✓ tmdb_daily_sync.zip created"

# Package bronze_to_silver
echo "📦 Packaging bronze_to_silver..."
cd "$LAMBDA_DIR/bronze_to_silver"
rm -rf package
mkdir package
pip3 install -r requirements.txt -t package/ --quiet --platform manylinux2014_x86_64 --only-binary=:all:
cp handler.py package/
cd package
zip -r "$TERRAFORM_DIR/lambda_packages/bronze_to_silver.zip" . > /dev/null
cd ..
rm -rf package
echo "  ✓ bronze_to_silver.zip created"

cd "$SCRIPT_DIR"
echo ""
echo "✅ All packages ready for Terraform deployment!"
echo "   Note: pandas/pyarrow provided via AWS-managed AWSSDKPandas layer (no build needed)"
echo ""
echo "Package locations:"
echo "  - $TERRAFORM_DIR/lambda_packages/tmdb_daily_sync.zip"
echo "  - $TERRAFORM_DIR/lambda_packages/bronze_to_silver.zip"
