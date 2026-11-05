"""Deskargatu eta optimizatu kargaguneen irudiak.

Erabilera (proiektuaren erroan):

    uv run --with pillow python docs/optimize_station_images.py

Scriptak `api_erronka/media.py`-ko Wikimedia URLak deskargatzen ditu,
WebP formatura bihurtzen ditu eta `web/assets/stations/` eta
`admin_atala/public/assets/stations/` karpetetan gordetzen ditu.

Irudiak Wikimedia Commons-ekoak dira; kredituak eta lizentziak
`docs/THIRD_PARTY_NOTICES.md` fitxategian daude.
"""

from __future__ import annotations

import shutil
import urllib.request
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent

WEB_DIR = ROOT / "web" / "assets" / "stations"
ADMIN_DIR = ROOT / "admin_atala" / "public" / "assets" / "stations"

MAX_WIDTH = 960
QUALITY = 78

# Jatorrizko argazkiak (Wikimedia Commons). Kredituak eta lizentziak
# `docs/THIRD_PARTY_NOTICES.md` fitxategian daude.
SOURCE_URLS = [
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/59/Donostia-San-Sebastian-City-Hall.jpg/1280px-Donostia-San-Sebastian-City-Hall.jpg",
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b1/Donostia_Igeldotik.jpg/1280px-Donostia_Igeldotik.jpg",
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1c/San_Sebastian_Donostia_Maria_Cristina_Bridge_1190559.jpg/1280px-San_Sebastian_Donostia_Maria_Cristina_Bridge_1190559.jpg",
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7d/San_Sebastian_La_Concha-20120902-RM-125922.jpg/1280px-San_Sebastian_La_Concha-20120902-RM-125922.jpg",
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ac/San_Sebastian_Zurriola_beach_1190579.jpg/1280px-San_Sebastian_Zurriola_beach_1190579.jpg",
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f5/Beach_of_Zarautz_-_Mirador_de_los_Bancos%2C_Zarautz%2C_Spain_-_July_19%2C_2024.jpg/1280px-Beach_of_Zarautz_-_Mirador_de_los_Bancos%2C_Zarautz%2C_Spain_-_July_19%2C_2024.jpg",
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a3/Playa_de_Zarautz_%2823747%29.jpg/1280px-Playa_de_Zarautz_%2823747%29.jpg",
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ca/Zarautz_beach_from_above.jpg/1280px-Zarautz_beach_from_above.jpg",
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/88/Zarauzko_hondartza_Torreoitik_02.jpg/1280px-Zarauzko_hondartza_Torreoitik_02.jpg",
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9e/Zarautz_2023_Talaimendi.jpg/1280px-Zarautz_2023_Talaimendi.jpg",
]


def download(url: str) -> bytes:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": (
                "PowerbankImageOptimizer/1.0 "
                "(+https://powerbank.eus; hola@powerbank.eus)"
            )
        },
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def optimize(url: str, destination: Path) -> None:
    raw = download(url)
    with Image.open(BytesIO(raw)) as image:
        image = ImageOps.exif_transpose(image)
        if image.mode not in {"RGB", "RGBA"}:
            image = image.convert("RGB")

        if image.width > MAX_WIDTH:
            ratio = MAX_WIDTH / image.width
            image = image.resize(
                (MAX_WIDTH, round(image.height * ratio)),
                Image.Resampling.LANCZOS,
            )

        destination.parent.mkdir(parents=True, exist_ok=True)
        image.save(destination, "WEBP", quality=QUALITY, method=6)


def main() -> None:
    WEB_DIR.mkdir(parents=True, exist_ok=True)
    ADMIN_DIR.mkdir(parents=True, exist_ok=True)

    for index, url in enumerate(SOURCE_URLS, start=1):
        filename = f"station-{index:02d}.webp"
        web_path = WEB_DIR / filename
        admin_path = ADMIN_DIR / filename

        print(f"Deskargatzen: {filename}")
        optimize(url, web_path)
        shutil.copyfile(web_path, admin_path)
        print(f"  -> {web_path.relative_to(ROOT)} ({web_path.stat().st_size // 1024} KB)")

    print("Irudiak optimizatuta.")


if __name__ == "__main__":
    main()
