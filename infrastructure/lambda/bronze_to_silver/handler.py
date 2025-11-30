"""Bronze to Silver ETL Lambda Function

Processes raw JSON from Bronze layer, applies data quality checks,
and writes cleaned Parquet files to Silver layer.
"""

import json
import os
import logging
import re
from datetime import datetime
from urllib.parse import unquote_plus

import boto3
import pandas as pd

logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

s3 = boto3.client('s3')
cloudwatch = boto3.client('cloudwatch')

S3_BUCKET = os.environ['S3_BUCKET']
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'dev')

# Silver layer schema definition
SILVER_SCHEMA = {
    'show_id': 'Int64',
    'title': 'string',
    'original_title': 'string',
    'popularity': 'float64',
    'vote_average': 'float64',
    'vote_count': 'Int64',
    'first_air_date': 'string',
    'genre_ids': 'object',
    'origin_country': 'object',
    'poster_path': 'string',
    'backdrop_path': 'string',
    'overview': 'string',
    'original_language': 'string',
    'ingestion_date': 'string',
    'data_type': 'string'
}


def lambda_handler(event, context):
    """Main Lambda handler triggered by S3 events"""
    logger.info("Starting Bronze to Silver ETL")

    try:
        processed_results = []

        for record in event['Records']:
            bucket = record['s3']['bucket']['name']
            key = unquote_plus(record['s3']['object']['key'])

            logger.info(f"Processing: s3://{bucket}/{key}")
            result = process_bronze_file(bucket, key)
            processed_results.append(result)

            logger.info(
                f"Processed {result['records_processed']} shows "
                f"(quality pass rate: {result['quality_pass_rate']:.1%})"
            )

        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'ETL completed successfully',
                'files_processed': len(processed_results),
                'results': processed_results
            })
        }

    except Exception as e:
        logger.error(f"ETL error: {str(e)}", exc_info=True)
        raise


def process_bronze_file(bucket, key):
    """Process a single Bronze JSON file"""
    # Read Bronze JSON file
    response = s3.get_object(Bucket=bucket, Key=key)
    raw_data = json.loads(response['Body'].read())

    shows = raw_data.get('results', [])
    if not shows:
        logger.warning(f"No shows found in {key}")
        return {'records_processed': 0, 'quality_pass_rate': 0.0}

    initial_count = len(shows)
    logger.info(f"Found {initial_count} shows in Bronze file")

    # Normalize each show to Silver schema
    normalized_shows = []
    for show in shows:
        try:
            normalized = normalize_show(show)
            normalized_shows.append(normalized)
        except Exception as e:
            logger.warning(f"Failed to normalize show {show.get('id')}: {str(e)}")

    # Convert to DataFrame
    df = pd.DataFrame(normalized_shows)

    # Apply data quality checks
    df, quality_metrics = apply_data_quality_checks(df, initial_count)

    # Enforce schema
    df = enforce_schema(df, SILVER_SCHEMA)

    # Extract metadata from key
    partition_date = extract_partition_date(key)
    data_type = extract_data_type(key)

    # Write to Silver layer
    silver_key = f"silver/shows/{data_type}/dt={partition_date}/data.parquet"
    write_to_silver(df, bucket, silver_key)

    # Publish quality metrics
    publish_quality_metrics(quality_metrics, data_type, partition_date)

    return {
        'records_processed': len(df),
        'quality_pass_rate': quality_metrics['pass_rate'],
        'silver_key': silver_key
    }


def normalize_show(raw_show):
    """Normalize raw TMDB show JSON to Silver schema"""
    return {
        'show_id': raw_show.get('id'),
        'title': raw_show.get('name') or raw_show.get('original_name'),
        'original_title': raw_show.get('original_name'),
        'vote_average': float(raw_show.get('vote_average', 0.0)),
        'vote_count': raw_show.get('vote_count', 0),
        'first_air_date': raw_show.get('first_air_date'),
        'genre_ids': raw_show.get('genre_ids', []),
        'origin_country': raw_show.get('origin_country', []),
        'poster_path': raw_show.get('poster_path'),
        'backdrop_path': raw_show.get('backdrop_path'),
        'overview': raw_show.get('overview'),
        'original_language': raw_show.get('original_language'),
        'popularity': raw_show.get('popularity', 0.0),
        'ingestion_date': datetime.now().isoformat(),
        'data_type': None  # Will be set from file path
    }


def apply_data_quality_checks(df, initial_count):
    """Apply data quality rules and return cleaned DataFrame with metrics"""
    checks = {
        'initial_count': initial_count,
        'missing_show_id': 0,
        'missing_title': 0,
        'invalid_popularity': 0,
        'duplicates': 0
    }

    # Check for missing show_id
    checks['missing_show_id'] = df['show_id'].isna().sum()
    df = df[df['show_id'].notna()]

    # Check for missing title
    checks['missing_title'] = df['title'].isna().sum()
    df = df[df['title'].notna()]

    # Check for invalid popularity
    checks['invalid_popularity'] = (df['popularity'] < 0).sum()
    df = df[df['popularity'] >= 0]

    # Remove duplicates (keep first occurrence)
    pre_dedup_count = len(df)
    df = df.drop_duplicates(subset=['show_id'], keep='first')
    checks['duplicates'] = pre_dedup_count - len(df)

    # Calculate pass rate
    final_count = len(df)
    checks['final_count'] = final_count
    checks['failed_count'] = initial_count - final_count
    checks['pass_rate'] = final_count / initial_count if initial_count > 0 else 0.0

    logger.info(
        f"Data quality: {final_count}/{initial_count} passed "
        f"({checks['pass_rate']:.1%})"
    )

    return df, checks


def enforce_schema(df, schema):
    """Enforce column presence and data types"""
    # Add missing columns with None
    for col in schema.keys():
        if col not in df.columns:
            df[col] = None

    # Reorder columns to match schema
    df = df[list(schema.keys())]

    # Cast to appropriate types
    for col, dtype in schema.items():
        try:
            if dtype in ['Int64', 'float64', 'string']:
                df[col] = df[col].astype(dtype, errors='ignore')
        except Exception as e:
            logger.warning(f"Could not cast {col} to {dtype}: {str(e)}")

    return df


def write_to_silver(df, bucket, key):
    """Write DataFrame to S3 Silver layer as Parquet"""
    temp_file = '/tmp/silver_data.parquet'

    df.to_parquet(
        temp_file,
        engine='pyarrow',
        compression='snappy',
        index=False
    )

    s3.upload_file(temp_file, bucket, key)
    logger.info(f"Wrote Silver data: s3://{bucket}/{key}")

    # Clean up temp file
    try:
        os.remove(temp_file)
    except:
        pass


def extract_partition_date(key):
    """Extract date partition from S3 key"""
    match = re.search(r'dt=(\d{4}-\d{2}-\d{2})', key)
    if match:
        return match.group(1)
    else:
        logger.warning(f"Could not extract date from {key}, using today")
        return datetime.now().strftime('%Y-%m-%d')


def extract_data_type(key):
    """Extract data type from S3 key"""
    match = re.search(r'shows/(\w+)/', key)
    if match:
        return match.group(1)
    else:
        logger.warning(f"Could not extract data type from {key}")
        return 'unknown'


def publish_quality_metrics(metrics, data_type, date):
    """Publish data quality metrics to CloudWatch"""
    metric_data = [
        {
            'MetricName': 'DataQualityPassRate',
            'Value': metrics['pass_rate'] * 100,
            'Unit': 'Percent',
            'Timestamp': datetime.now(),
            'Dimensions': [
                {'Name': 'Environment', 'Value': ENVIRONMENT},
                {'Name': 'DataType', 'Value': data_type}
            ]
        },
        {
            'MetricName': 'RecordsProcessed',
            'Value': metrics['final_count'],
            'Unit': 'Count',
            'Timestamp': datetime.now(),
            'Dimensions': [
                {'Name': 'Environment', 'Value': ENVIRONMENT},
                {'Name': 'DataType', 'Value': data_type}
            ]
        },
        {
            'MetricName': 'RecordsFailed',
            'Value': metrics['failed_count'],
            'Unit': 'Count',
            'Timestamp': datetime.now(),
            'Dimensions': [
                {'Name': 'Environment', 'Value': ENVIRONMENT},
                {'Name': 'DataType', 'Value': data_type}
            ]
        }
    ]

    cloudwatch.put_metric_data(
        Namespace='Tally/DataQuality',
        MetricData=metric_data
    )

    logger.info(f"Published {len(metric_data)} quality metrics to CloudWatch")
