import unittest
from datetime import datetime, timedelta
from unittest.mock import patch

from fastapi import HTTPException

from services.erreserbak import validate_reservation_window


FIXED_NOW = datetime(2026, 11, 4, 10, 0, 0)


class ReservationWindowTests(unittest.TestCase):
    def assert_invalid(self, start, end, expected_text):
        with patch("services.erreserbak.now_local", return_value=FIXED_NOW):
            with self.assertRaises(HTTPException) as context:
                validate_reservation_window(start, end)
        self.assertIn(expected_text, context.exception.detail)

    def test_valid_reservation(self):
        start = FIXED_NOW + timedelta(minutes=30)
        end = start + timedelta(hours=2)

        with patch("services.erreserbak.now_local", return_value=FIXED_NOW):
            result_start, result_end = validate_reservation_window(start, end)

        self.assertEqual(result_start, start)
        self.assertEqual(result_end, end)

    def test_exactly_six_hours_is_allowed(self):
        start = FIXED_NOW
        end = start + timedelta(hours=6)

        with patch("services.erreserbak.now_local", return_value=FIXED_NOW):
            result_start, result_end = validate_reservation_window(start, end)

        self.assertEqual(result_start, start)
        self.assertEqual(result_end, end)

    def test_past_reservation_is_rejected(self):
        start = FIXED_NOW - timedelta(hours=1)
        end = start + timedelta(hours=1)
        self.assert_invalid(start, end, "iraganeko")

    def test_next_day_reservation_is_rejected(self):
        start = FIXED_NOW + timedelta(days=1)
        end = start + timedelta(hours=1)
        self.assert_invalid(start, end, "gaurko egunean")

    def test_more_than_six_hours_of_advance_is_rejected(self):
        start = FIXED_NOW + timedelta(hours=6, minutes=1)
        end = start + timedelta(hours=1)
        self.assert_invalid(start, end, "6 ordu aurretik")

    def test_more_than_six_hours_of_duration_is_rejected(self):
        start = FIXED_NOW + timedelta(minutes=30)
        end = start + timedelta(hours=6, minutes=1)
        self.assert_invalid(start, end, "6 ordu iraun")

    def test_less_than_fifteen_minutes_is_rejected(self):
        start = FIXED_NOW + timedelta(minutes=30)
        end = start + timedelta(minutes=10)
        self.assert_invalid(start, end, "15 minutu")

    def test_end_before_start_is_rejected(self):
        start = FIXED_NOW + timedelta(hours=1)
        end = start - timedelta(minutes=5)
        self.assert_invalid(start, end, "geroagokoa")


if __name__ == "__main__":
    unittest.main()
