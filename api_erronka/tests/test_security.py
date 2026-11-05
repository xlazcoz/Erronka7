import io
import unittest
from unittest.mock import patch

from fastapi import HTTPException, UploadFile
from starlette.datastructures import Headers

from services.rate_limit import LoginRateLimiter
from services.uploads import detect_image_extension, validate_image_upload


def build_upload(content: bytes, content_type: str = "image/png") -> UploadFile:
    return UploadFile(
        io.BytesIO(content),
        filename="fitxategia.bin",
        headers=Headers({"content-type": content_type}),
    )


class LoginRateLimiterTests(unittest.TestCase):
    def setUp(self):
        self.limiter = LoginRateLimiter(
            max_attempts=2,
            window_seconds=60,
            block_seconds=120,
        )

    def test_blocks_after_max_attempts(self):
        with patch("services.rate_limit.time.monotonic") as clock:
            clock.return_value = 1000.0
            self.limiter.record_failure("ip:email")
            clock.return_value = 1001.0
            self.limiter.record_failure("ip:email")

            clock.return_value = 1002.0
            self.assertEqual(self.limiter.blocked_for("ip:email"), 119)

    def test_reset_clears_failures(self):
        self.limiter.record_failure("ip:email")
        self.limiter.record_failure("ip:email")
        self.limiter.reset("ip:email")
        self.assertEqual(self.limiter.blocked_for("ip:email"), 0)

    def test_old_failures_expire_from_window(self):
        with patch("services.rate_limit.time.monotonic") as clock:
            clock.return_value = 1000.0
            self.limiter.record_failure("ip:email")
            clock.return_value = 1100.0
            self.limiter.record_failure("ip:email")

            clock.return_value = 1101.0
            self.assertEqual(self.limiter.blocked_for("ip:email"), 0)


class UploadValidationTests(unittest.TestCase):
    def test_detects_supported_formats(self):
        self.assertEqual(detect_image_extension(b"\xff\xd8\xff\xe0" + b"0" * 20), ".jpg")
        self.assertEqual(detect_image_extension(b"\x89PNG\r\n\x1a\n" + b"0" * 20), ".png")
        self.assertEqual(detect_image_extension(b"RIFF\x00\x00\x00\x00WEBP" + b"0" * 20), ".webp")
        self.assertIsNone(detect_image_extension(b"<html>maltzurra</html>"))

    def test_accepts_real_image(self):
        upload = build_upload(b"\x89PNG\r\n\x1a\n" + b"0" * 40)
        self.assertEqual(validate_image_upload(upload), ".png")

    def test_rejects_html_disguised_as_image(self):
        upload = build_upload(b"<html><script>alert(1)</script></html>")
        with self.assertRaises(HTTPException) as context:
            validate_image_upload(upload)
        self.assertEqual(context.exception.status_code, 400)

    def test_rejects_non_image_content_type(self):
        upload = build_upload(b"\x89PNG\r\n\x1a\n", content_type="text/html")
        with self.assertRaises(HTTPException) as context:
            validate_image_upload(upload)
        self.assertEqual(context.exception.status_code, 400)


if __name__ == "__main__":
    unittest.main()
