"""Unit tests for silver_to_supabase Lambda handler."""

import json
import unittest
from datetime import datetime
from unittest.mock import MagicMock, patch, call
import pandas as pd

import handler


class TestBuildShowRecord(unittest.TestCase):
    def _row(self, **kwargs):
        defaults = {
            'show_id': 12345,
            'title': 'Breaking Bad',
            'overview': 'A chemistry teacher turned drug lord.',
            'poster_path': '/abc123.jpg',
            'first_air_date': '2008-01-20',
        }
        defaults.update(kwargs)
        return pd.Series(defaults)

    def test_maps_required_fields(self):
        record = handler.build_show_record(self._row(), is_popular=True)
        self.assertEqual(record['tmdb_id'], 12345)
        self.assertEqual(record['title'], 'Breaking Bad')
        self.assertTrue(record['is_popular'])

    def test_not_popular(self):
        record = handler.build_show_record(self._row(), is_popular=False)
        self.assertFalse(record['is_popular'])

    def test_maps_optional_fields(self):
        record = handler.build_show_record(self._row(), is_popular=False)
        self.assertEqual(record['overview'], 'A chemistry teacher turned drug lord.')
        self.assertEqual(record['poster_path'], '/abc123.jpg')
        self.assertEqual(record['first_air_date'], '2008-01-20')

    def test_returns_none_when_tmdb_id_missing(self):
        record = handler.build_show_record(self._row(show_id=float('nan')), is_popular=False)
        self.assertIsNone(record)

    def test_returns_none_when_title_missing(self):
        record = handler.build_show_record(self._row(title=float('nan')), is_popular=False)
        self.assertIsNone(record)

    def test_null_overview_becomes_none(self):
        record = handler.build_show_record(self._row(overview=float('nan')), is_popular=False)
        self.assertIsNone(record['overview'])

    def test_invalid_date_becomes_none(self):
        record = handler.build_show_record(self._row(first_air_date='not-a-date'), is_popular=False)
        self.assertIsNone(record['first_air_date'])

    def test_null_date_becomes_none(self):
        record = handler.build_show_record(self._row(first_air_date=float('nan')), is_popular=False)
        self.assertIsNone(record['first_air_date'])

    def test_tmdb_id_cast_to_int(self):
        record = handler.build_show_record(self._row(show_id=12345.0), is_popular=False)
        self.assertIsInstance(record['tmdb_id'], int)


class TestUpsertShows(unittest.TestCase):
    def _shows(self):
        return [{'tmdb_id': 1, 'title': 'Show A'}, {'tmdb_id': 2, 'title': 'Show B'}]

    @patch('handler.get_supabase_credentials', return_value=('https://x.supabase.co', 'key123'))
    @patch('handler.requests.post')
    def test_returns_count_on_success(self, mock_post, _mock_creds):
        mock_post.return_value = MagicMock(status_code=201)
        count = handler.upsert_shows(self._shows())
        self.assertEqual(count, 2)

    @patch('handler.get_supabase_credentials', return_value=('https://x.supabase.co', 'key123'))
    @patch('handler.requests.post')
    def test_sends_correct_headers(self, mock_post, _mock_creds):
        mock_post.return_value = MagicMock(status_code=204)
        handler.upsert_shows(self._shows())
        _, kwargs = mock_post.call_args
        self.assertEqual(kwargs['params']['on_conflict'], 'tmdb_id')
        self.assertIn('merge-duplicates', kwargs['headers']['Prefer'])
        self.assertEqual(kwargs['headers']['Content-Type'], 'application/json')

    @patch('handler.get_supabase_credentials', return_value=('https://x.supabase.co', 'key123'))
    @patch('handler.requests.post')
    def test_raises_on_http_error(self, mock_post, _mock_creds):
        mock_post.return_value = MagicMock(status_code=401, text='Unauthorized')
        with self.assertRaises(RuntimeError):
            handler.upsert_shows(self._shows())


class TestLambdaHandler(unittest.TestCase):
    def _s3_event(self, key):
        return {
            'Records': [{
                's3': {
                    'bucket': {'name': 'tally-datalake-dev'},
                    'object': {'key': key},
                }
            }]
        }

    @patch('handler.publish_metrics')
    @patch('handler.process_silver_file', return_value=(20, 0))
    def test_processes_silver_parquet(self, mock_process, mock_metrics):
        event = self._s3_event('silver/shows/popular_shows/dt=2026-04-04/data.parquet')
        result = handler.lambda_handler(event, {})
        mock_process.assert_called_once_with('tally-datalake-dev', 'silver/shows/popular_shows/dt=2026-04-04/data.parquet')
        self.assertEqual(json.loads(result['body'])['upserted'], 20)

    @patch('handler.publish_metrics')
    @patch('handler.process_silver_file')
    def test_skips_non_silver_keys(self, mock_process, mock_metrics):
        event = self._s3_event('bronze/tmdb/shows/popular_shows/dt=2026-04-04/file.json')
        handler.lambda_handler(event, {})
        mock_process.assert_not_called()

    @patch('handler.publish_metrics')
    @patch('handler.process_silver_file')
    def test_skips_non_parquet_keys(self, mock_process, mock_metrics):
        event = self._s3_event('silver/shows/popular_shows/dt=2026-04-04/README.txt')
        handler.lambda_handler(event, {})
        mock_process.assert_not_called()

    @patch('handler.publish_metrics')
    @patch('handler.process_silver_file', side_effect=Exception('S3 error'))
    def test_counts_failed_on_exception(self, mock_process, mock_metrics):
        event = self._s3_event('silver/shows/popular_shows/dt=2026-04-04/data.parquet')
        result = handler.lambda_handler(event, {})
        body = json.loads(result['body'])
        self.assertEqual(body['failed'], 1)
        self.assertEqual(body['upserted'], 0)


if __name__ == '__main__':
    unittest.main()
