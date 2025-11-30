#!/bin/bash

echo "📜 Viewing Lambda Logs"
echo ""
echo "Which Lambda function?"
echo "  1) TMDB Ingestion"
echo "  2) Bronze to Silver ETL"
echo "  3) Both (split view)"
echo ""
read -p "Choice (1-3): " choice

cd ../terraform

case $choice in
    1)
        LAMBDA_NAME=$(terraform output -raw lambda_ingestion_function_name 2>/dev/null)
        echo ""
        echo "Tailing logs for: $LAMBDA_NAME"
        echo "Press Ctrl+C to stop"
        echo ""
        aws logs tail "/aws/lambda/$LAMBDA_NAME" --follow --format short
        ;;
    2)
        LAMBDA_NAME=$(terraform output -raw lambda_etl_function_name 2>/dev/null)
        echo ""
        echo "Tailing logs for: $LAMBDA_NAME"
        echo "Press Ctrl+C to stop"
        echo ""
        aws logs tail "/aws/lambda/$LAMBDA_NAME" --follow --format short
        ;;
    3)
        INGESTION=$(terraform output -raw lambda_ingestion_function_name 2>/dev/null)
        ETL=$(terraform output -raw lambda_etl_function_name 2>/dev/null)
        echo ""
        echo "Opening both log streams (last 30 minutes)..."
        echo ""
        echo "=== INGESTION LOGS ==="
        aws logs tail "/aws/lambda/$INGESTION" --since 30m --format short | tail -20
        echo ""
        echo "=== ETL LOGS ==="
        aws logs tail "/aws/lambda/$ETL" --since 30m --format short | tail -20
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac
