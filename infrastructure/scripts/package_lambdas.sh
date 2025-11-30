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

# Create Lambda Layer (shared dependencies)
echo "📦 Creating Lambda Layer..."
cd "$TERRAFORM_DIR"
rm -rf lambda_layers/python
mkdir -p lambda_layers/python/lib/python3.11/site-packages

pip3 install \
    pandas==2.1.4 \
    pyarrow==14.0.2 \
    requests==2.31.0 \
    -t lambda_layers/python/lib/python3.11/site-packages/ \
    --quiet \
    --platform manylinux2014_x86_64 \
    --only-binary=:all:

cd lambda_layers
zip -r data_processing.zip python/ > /dev/null
echo "  ✓ data_processing.zip layer created"

cd "$SCRIPT_DIR"
echo ""
echo "✅ All packages ready for Terraform deployment!"
echo ""
echo "Package locations:"
echo "  - $TERRAFORM_DIR/lambda_packages/tmdb_daily_sync.zip"
echo "  - $TERRAFORM_DIR/lambda_packages/bronze_to_silver.zip"
echo "  - $TERRAFORM_DIR/lambda_layers/data_processing.zip"
