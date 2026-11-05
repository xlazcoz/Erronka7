"""Irudien igoeren balioztatzea.

Fitxategiaren edukia (magic bytes) egiaztatzen da, ez bezeroak bidalitako
`content-type` soilik. Horrela `.html`/`.svg` fitxategi maltzurrak ezin dira
igotzen eta ezin dira gure domeinu berean exekutatzen.
"""

from __future__ import annotations

import os

from fastapi import HTTPException, UploadFile

from config import MAX_IMAGE_UPLOAD_BYTES

_SIGNATURES: tuple[tuple[bytes, str], ...] = (
    (b"\xff\xd8\xff", ".jpg"),
    (b"\x89PNG\r\n\x1a\n", ".png"),
    (b"GIF87a", ".gif"),
    (b"GIF89a", ".gif"),
)

_ALLOWED_FORMATS = "JPG, PNG, GIF, WebP edo AVIF"


def detect_image_extension(head: bytes) -> str | None:
    """Itzuli fitxategiaren luzapen segurua magic bytes-etatik abiatuta."""
    for signature, extension in _SIGNATURES:
        if head.startswith(signature):
            return extension

    if len(head) >= 12 and head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return ".webp"

    if len(head) >= 12 and head[4:8] == b"ftyp" and head[8:12] in {b"avif", b"avis"}:
        return ".avif"

    return None


def validate_image_upload(file: UploadFile) -> str:
    """Balioztatu igoera eta itzuli gordetzeko erabiliko den luzapena."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Fitxategiak irudi bat izan behar du",
        )

    file.file.seek(0, os.SEEK_END)
    size = file.file.tell()
    file.file.seek(0)

    if size <= 0:
        raise HTTPException(status_code=400, detail="Fitxategia hutsik dago")

    if size > MAX_IMAGE_UPLOAD_BYTES:
        megabytes = MAX_IMAGE_UPLOAD_BYTES // (1024 * 1024)
        raise HTTPException(
            status_code=413,
            detail=f"Irudiak gehienez {megabytes} MB izan ditzake",
        )

    head = file.file.read(32)
    file.file.seek(0)

    extension = detect_image_extension(head)
    if extension is None:
        raise HTTPException(
            status_code=400,
            detail=f"Irudi-formatua ez da onartzen ({_ALLOWED_FORMATS})",
        )

    return extension
