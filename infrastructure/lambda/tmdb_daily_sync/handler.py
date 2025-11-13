"""TMDB Daily Sync Lambda Function

Fetches show metadata from TMDB API and stores raw JSON in S3 Bronze layer.
"""

import json
import os
import logging
from datetime import datetime

import boto3
import requests

logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

s3 = boto3.client('s3')
cloudwatch = boto3.client('cloudwatch')

TMDB_API_KEY = os.environ['TMDB_API_KEY']
S3_BUCKET = os.environ['S3_BUCKET']
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'dev')
TMDB_BASE_URL = 'https://api.themoviedb.org/3'


def lambda_handler(event, context):
    """Main Lambda handler"""
    logger.info(f"Starting TMDB daily sync for environment: {ENVIRONMENT}")

    execution_id = context.request_id
    date_partition = datetime.now().strftime('%Y-%m-%d')

    try:
        # Fetch data from TMDB API
        results = {
            'popular_shows': fetch_popular_shows(),
            'trending_shows': fetch_trending_shows(),
            'airing_today': fetch_airing_today(),
        }

        # Store raw data to S3 Bronze layer
        stored_files = []
        total_shows = 0

        for data_type, data in results.items():
            if data:
                s3_key = store_to_bronze(data, data_type, date_partition, execution_id)
                stored_files.append(s3_key)
                show_count = len(data.get('results', []))
                total_shows += show_count
                logger.info(f"Stored {data_type}: {show_count} shows -> {s3_key}")

        # Publish metrics to CloudWatch
        publish_metrics(results, date_partition)

        logger.info(f"Sync completed: {total_shows} total shows across {len(stored_files)} files")

        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'TMDB sync completed successfully',
                'date': date_partition,
                'execution_id': execution_id,
                'files_stored': stored_files,
                'total_shows': total_shows
            })
        }

    except Exception as e:
        logger.error(f"Error during TMDB sync: {str(e)}", exc_info=True)
        raise


def fetch_popular_shows():
    """Fetch popular TV shows from TMDB"""
    url = f"{TMDB_BASE_URL}/tv/popular"
    response = requests.get(url, params={'api_key': TMDB_API_KEY}, timeout=30)
    response.raise_for_status()
    return response.json()


def fetch_trending_shows():
    """Fetch trending TV shows (weekly) from TMDB"""
    url = f"{TMDB_BASE_URL}/trending/tv/week"
    response = requests.get(url, params={'api_key': TMDB_API_KEY}, timeout=30)
    response.raise_for_status()
    return response.json()


def fetch_airing_today():
    """Fetch TV shows airing today from TMDB"""
    url = f"{TMDB_BASE_URL}/tv/airing_today"
    response = requests.get(url, params={'api_key': TMDB_API_KEY}, timeout=30)
    response.raise_for_status()
    return response.json()


def store_to_bronze(data, data_type, date_partition, execution_id):
    """Store raw JSON data to S3 Bronze layer with metadata"""
    # Add ingestion metadata
    enriched_data = {
        **data,
        '_metadata': {
            'ingestion_timestamp': datetime.now().isoformat(),
            'execution_id': execution_id,
            'data_type': data_type,
            'environment': ENVIRONMENT,
            'api_version': '3',
            'source': 'tmdb'
        }
    }

    # Bronze layer path: bronze/tmdb/shows/{data_type}/dt={date}/{execution_id}.json
    s3_key = f"bronze/tmdb/shows/{data_type}/dt={date_partition}/{execution_id}.json"

    s3.put_object(
        Bucket=S3_BUCKET,
        Key=s3_key,
        Body=json.dumps(enriched_data, indent=2),
        ContentType='application/json',
        Metadata={
            'data-type': data_type,
            'ingestion-date': date_partition,
            'execution-id': execution_id
        }
    )

    return s3_key


def publish_metrics(results, date):
    """Publish custom metrics to CloudWatch"""
    metric_data = []

    for data_type, data in results.items():
        show_count = len(data.get('results', []))
        metric_data.append({
            'MetricName': f'{data_type.title().replace("_", "")}Count',
            'Value': show_count,
            'Unit': 'Count',
            'Timestamp': datetime.now(),
            'Dimensions': [
                {'Name': 'Environment', 'Value': ENVIRONMENT},
                {'Name': 'DataType', 'Value': data_type}
            ]
        })

    # Total shows across all types
    total_shows = sum(len(data.get('results', [])) for data in results.values())
    metric_data.append({
        'MetricName': 'TotalShowsIngested',
        'Value': total_shows,
        'Unit': 'Count',
        'Timestamp': datetime.now(),
        'Dimensions': [
            {'Name': 'Environment', 'Value': ENVIRONMENT}
        ]
    })

    if metric_data:
        cloudwatch.put_metric_data(
            Namespace='Tally/DataPipeline',
            MetricData=metric_data
        )
        logger.info(f"Published {len(metric_data)} metrics to CloudWatch")
