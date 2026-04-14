"""Silver to Supabase Lambda

Reads cleaned Parquet files from the Silver layer and upserts
show data into Supabase so the API serves pre-processed data
instead of making live TMDB requests.

Triggered by S3 events on the silver/ prefix.
"""

import json
import os
import logging
from datetime import datetime, timezone
from urllib.parse import unquote_plus

import boto3
import pandas as pd
import requests

logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

SSM_PREFIX = os.environ.get('SSM_PREFIX', '/tally/dev')
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'dev')

# Lazy boto3 clients — initialised on first use so tests can mock easily
_s3 = None
_ssm = None
_cloudwatch = None

# Cache credentials within Lambda execution context (warm starts)
_supabase_url = None
_supabase_key = None


def utc_now():
    return datetime.now(timezone.utc)


def _get_s3():
    global _s3
    if _s3 is None:
        _s3 = boto3.client('s3')
    return _s3


def _get_ssm():
    global _ssm
    if _ssm is None:
        _ssm = boto3.client('ssm')
    return _ssm


def _get_cloudwatch():
    global _cloudwatch
    if _cloudwatch is None:
        _cloudwatch = boto3.client('cloudwatch')
    return _cloudwatch


def get_supabase_credentials():
    global _supabase_url, _supabase_key
    if _supabase_url and _supabase_key:
        return _supabase_url, _supabase_key

    params = _get_ssm().get_parameters(
        Names=[
            f'{SSM_PREFIX}/supabase_url',
            f'{SSM_PREFIX}/supabase_secret_key',
        ],
        WithDecryption=True
    )

    by_name = {p['Name']: p['Value'] for p in params['Parameters']}
    _supabase_url = by_name[f'{SSM_PREFIX}/supabase_url'].rstrip('/')
    _supabase_key = by_name[f'{SSM_PREFIX}/supabase_secret_key']
    return _supabase_url, _supabase_key


def lambda_handler(event, context):
    """Main handler — triggered by S3 PUT events on silver/ prefix."""
    logger.info("Starting Silver → Supabase upsert")

    total_upserted = 0
    total_failed = 0

    for record in event.get('Records', []):
        bucket = record['s3']['bucket']['name']
        key = unquote_plus(record['s3']['object']['key'])

        # Only process silver show parquet files
        if not key.startswith('silver/shows/') or not key.endswith('.parquet'):
            logger.info(f"Skipping non-show key: {key}")
            continue

        logger.info(f"Processing: s3://{bucket}/{key}")
        try:
            upserted, failed = process_silver_file(bucket, key)
            total_upserted += upserted
            total_failed += failed
        except Exception as e:
            logger.error(f"Failed to process {key}: {e}", exc_info=True)
            total_failed += 1

    publish_metrics(total_upserted, total_failed)
    logger.info(f"Done — upserted: {total_upserted}, failed: {total_failed}")

    return {
        'statusCode': 200,
        'body': json.dumps({
            'message': 'Silver → Supabase sync complete',
            'upserted': total_upserted,
            'failed': total_failed,
        })
    }


def process_silver_file(bucket, key):
    """Read a silver Parquet file and upsert its rows into Supabase."""
    # Determine is_popular from path (popular_shows → True, else False)
    is_popular = 'popular_shows' in key

    # Download parquet to /tmp
    local_path = '/tmp/silver_input.parquet'
    _get_s3().download_file(bucket, key, local_path)

    df = pd.read_parquet(local_path)
    logger.info(f"Loaded {len(df)} rows from {key}")

    # Build list of show dicts for Supabase upsert
    shows = []
    for _, row in df.iterrows():
        show = build_show_record(row, is_popular)
        if show:
            shows.append(show)

    if not shows:
        logger.warning(f"No valid shows in {key}")
        return 0, 0

    # Upsert in batches of 100
    upserted = 0
    failed = 0
    batch_size = 100
    for i in range(0, len(shows), batch_size):
        batch = shows[i:i + batch_size]
        try:
            count = upsert_shows(batch)
            upserted += count
        except Exception as e:
            logger.error(f"Batch upsert failed (batch {i // batch_size}): {e}")
            failed += len(batch)

    return upserted, failed


def build_show_record(row, is_popular: bool):
    """Map a silver layer row to a Supabase shows record."""
    tmdb_id = row.get('show_id')
    title = row.get('title')

    if pd.isna(tmdb_id) or pd.isna(title):
        return None

    # Parse first_air_date — Supabase expects ISO date or null
    first_air_date = None
    raw_date = row.get('first_air_date')
    if raw_date and not pd.isna(raw_date):
        try:
            # Validate it parses as a date
            datetime.strptime(str(raw_date)[:10], '%Y-%m-%d')
            first_air_date = str(raw_date)[:10]
        except ValueError:
            pass

    return {
        'tmdb_id': int(tmdb_id),
        'title': str(title),
        'overview': str(row['overview']) if row.get('overview') and not pd.isna(row.get('overview')) else None,
        'poster_path': str(row['poster_path']) if row.get('poster_path') and not pd.isna(row.get('poster_path')) else None,
        'first_air_date': first_air_date,
        'is_popular': is_popular,
        'tmdb_last_updated': utc_now().isoformat(),
        'updated_at': utc_now().isoformat(),
    }


def upsert_shows(shows: list) -> int:
    """POST to Supabase REST API with upsert (on_conflict=tmdb_id)."""
    supabase_url, supabase_key = get_supabase_credentials()

    url = f"{supabase_url}/rest/v1/shows"
    params = {
        'on_conflict': 'tmdb_id',
    }
    headers = {
        'apikey': supabase_key,
        'Authorization': f'Bearer {supabase_key}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal',
    }

    resp = requests.post(url, params=params, json=shows, headers=headers, timeout=30)
    if resp.status_code not in (200, 201, 204):
        raise RuntimeError(f"Supabase returned {resp.status_code}: {resp.text}")

    logger.info(f"Upserted batch of {len(shows)} shows (HTTP {resp.status_code})")
    return len(shows)


def publish_metrics(upserted: int, failed: int):
    """Publish upsert metrics to CloudWatch."""
    try:
        _get_cloudwatch().put_metric_data(
            Namespace='Tally/Pipeline',
            MetricData=[
                {
                    'MetricName': 'ShowsUpsertedToSupabase',
                    'Value': upserted,
                    'Unit': 'Count',
                    'Timestamp': utc_now(),
                    'Dimensions': [{'Name': 'Environment', 'Value': ENVIRONMENT}],
                },
                {
                    'MetricName': 'ShowsUpsertFailed',
                    'Value': failed,
                    'Unit': 'Count',
                    'Timestamp': utc_now(),
                    'Dimensions': [{'Name': 'Environment', 'Value': ENVIRONMENT}],
                },
            ]
        )
    except Exception as e:
        logger.warning(f"Failed to publish metrics: {e}")
