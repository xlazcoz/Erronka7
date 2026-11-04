import unittest
from datetime import datetime, timedelta
from types import SimpleNamespace

from services.erreserbak import LATE_FEE_PER_HOUR, calculate_late_fee


class LateFeeTests(unittest.TestCase):
    def setUp(self):
        self.end = datetime(2026, 11, 4, 12, 0, 0)
        self.reserva = SimpleNamespace(amaiera_data_ordua=self.end)

    def test_on_time_has_no_fee(self):
        late, hours, fee = calculate_late_fee(
            self.reserva, self.end - timedelta(minutes=1)
        )
        self.assertFalse(late)
        self.assertEqual(hours, 0)
        self.assertEqual(fee, 0.0)

    def test_exactly_at_end_has_no_fee(self):
        late, hours, fee = calculate_late_fee(self.reserva, self.end)
        self.assertFalse(late)
        self.assertEqual(hours, 0)
        self.assertEqual(fee, 0.0)

    def test_one_minute_late_counts_as_one_started_hour(self):
        late, hours, fee = calculate_late_fee(
            self.reserva, self.end + timedelta(minutes=1)
        )
        self.assertTrue(late)
        self.assertEqual(hours, 1)
        self.assertEqual(fee, LATE_FEE_PER_HOUR)

    def test_sixty_one_minutes_counts_as_two_started_hours(self):
        late, hours, fee = calculate_late_fee(
            self.reserva, self.end + timedelta(hours=1, minutes=1)
        )
        self.assertTrue(late)
        self.assertEqual(hours, 2)
        self.assertEqual(fee, 2 * LATE_FEE_PER_HOUR)


if __name__ == "__main__":
    unittest.main()
