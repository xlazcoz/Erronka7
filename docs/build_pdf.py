#!/usr/bin/env python3
"""Build the Powerbank technical documentation PDF.

Usage (from the repository root):

    uv run --with markdown --with playwright --with pypdf python docs/build_pdf.py

The script converts docs/dokumentazioa.md to a styled HTML document and prints it
to A4 PDF with Google Chrome or Microsoft Edge through Playwright. It also tries
to fill the table of contents with page numbers using a two-pass pypdf analysis.
"""

from __future__ import annotations

import html
import os
import re
import sys
import unicodedata
from pathlib import Path

import markdown
from playwright.sync_api import sync_playwright
from pypdf import PdfReader, PdfWriter

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "dokumentazioa.md"
CSS_FILE = ROOT / "assets" / "estiloa.css"
OUTPUT = ROOT / "Powerbank_Dokumentazio_Teknikoa.pdf"

HEADER_TEMPLATE = """
<div style="width:100%; padding:0 17mm; font-family:'Segoe UI',Arial,sans-serif;
            font-size:7.5px; color:#64748b; display:flex; justify-content:space-between;">
  <span>Powerbank Alokairu Sistema</span>
  <span>Dokumentazio teknikoa · 1.0</span>
</div>
"""

FOOTER_TEMPLATE = """
<div style="width:100%; padding:0 17mm; font-family:'Segoe UI',Arial,sans-serif;
            font-size:7.5px; color:#64748b; text-align:center;">
  <span class="pageNumber"></span> / <span class="totalPages"></span>
</div>
"""


def find_chrome() -> str:
    """Return the path of an installed Chromium-based browser."""
    candidates = [
        os.path.join(os.environ.get("PROGRAMFILES", ""), "Google", "Chrome", "Application", "chrome.exe"),
        os.path.join(os.environ.get("PROGRAMFILES(X86)", ""), "Google", "Chrome", "Application", "chrome.exe"),
        os.path.join(os.environ.get("PROGRAMFILES", ""), "Microsoft", "Edge", "Application", "msedge.exe"),
        os.path.join(os.environ.get("PROGRAMFILES(X86)", ""), "Microsoft", "Edge", "Application", "msedge.exe"),
        os.path.join(os.environ.get("LOCALAPPDATA", ""), "Google", "Chrome", "Application", "chrome.exe"),
    ]
    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return candidate
    raise FileNotFoundError(
        "Ez da Chrome edo Edge aurkitu. Instalatu Chrome/Edge edo aldatu find_chrome()."
    )


def parse_front_matter(text: str) -> tuple[dict[str, str], str]:
    """Parse the very small YAML-like front matter used by the document."""
    if not text.startswith("---"):
        return {}, text

    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}, text

    meta: dict[str, str] = {}
    for line in parts[1].splitlines():
        line = line.strip()
        if not line or line.startswith("#") or ":" not in line:
            continue
        key, value = line.split(":", 1)
        meta[key.strip()] = value.strip().strip('"').strip("'")

    return meta, parts[2].lstrip("\n")


def strip_tags(value: str) -> str:
    return re.sub(r"<[^>]+>", "", value)


def normalize(value: str) -> str:
    """Normalise text so pypdf extraction and Markdown headings compare well."""
    value = html.unescape(strip_tags(value))
    value = unicodedata.normalize("NFKD", value)
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = value.replace("–", "-").replace("—", "-").replace("’", "'")
    value = value.replace("“", '"').replace("”", '"')
    value = re.sub(r"\s+", " ", value)
    # pypdf sometimes inserts spaces inside parentheses: "( ensure_schema )".
    value = re.sub(r"\(\s+", "(", value)
    value = re.sub(r"\s+\)", ")", value)
    return value.strip().lower()


def flatten_tokens(tokens: list[dict], level: int = 1) -> list[dict]:
    """Flatten the Markdown TOC tree, keeping h1/h2 entries only."""
    result: list[dict] = []
    for token in tokens:
        token_level = int(token.get("level", level))
        if token_level <= 2:
            result.append(
                {
                    "level": token_level,
                    "id": token["id"],
                    "text": strip_tags(token["name"]).strip(),
                }
            )
        if token.get("children"):
            result.extend(flatten_tokens(token["children"], token_level + 1))
    return result


def render_toc(entries: list[dict], page_numbers: dict[str, int] | None = None) -> str:
    page_numbers = page_numbers or {}
    parts: list[str] = ["<ul>"]
    for entry in entries:
        number = page_numbers.get(entry["id"], "")
        parts.append(
            f'<li class="toc-level-{entry["level"]}">'
            f'<a href="#{entry["id"]}">'
            f'<span class="toc-title">{html.escape(entry["text"])}</span>'
            f'<span class="toc-page-number">{number}</span>'
            f"</a></li>"
        )
    parts.append("</ul>")
    return "".join(parts)


def build_html(meta: dict[str, str], body: str, toc_html: str) -> str:
    css = CSS_FILE.read_text(encoding="utf-8")
    title = html.escape(meta.get("title", "Powerbank Alokairu Sistema"))
    subtitle = html.escape(meta.get("subtitle", ""))
    author = html.escape(meta.get("author", "Egilea: ____________________"))
    date = html.escape(meta.get("date", ""))
    version = html.escape(meta.get("version", "1.0"))
    project = html.escape(meta.get("project", ""))

    return f"""<!doctype html>
<html lang="eu">
<head>
  <meta charset="utf-8">
  <meta name="author" content="Powerbank Inc.">
  <meta name="description" content="Powerbank Alokairu Sistemaren dokumentazio teknikoa eta lizentzien erregistroa.">
  <title>{title} — Dokumentazio teknikoa</title>
  <style>{css}</style>
</head>
<body>
  <section class="cover">
    <div class="cover-top">
      <div class="cover-kicker">{project}</div>
      <h1>{title}</h1>
      <p class="cover-subtitle">{subtitle}</p>
      <p class="cover-abstract">
        Dokumentu honek Powerbank Alokairu Sistemaren arkitektura, datu-eredua,
        funtzionalitateak, negozio-arauak, APIaren erreferentzia, instalazioa,
        segurtasuna eta hirugarrenen baliabideen lizentziak biltzen ditu.
      </p>
      <div class="cover-highlights">
        <div><strong>Arkitektura</strong><span>Web, Angular, FastAPI eta PostgreSQL</span></div>
        <div><strong>Datu-eredua</strong><span>7 taula, erlazioak eta murrizketak</span></div>
        <div><strong>APIa</strong><span>40 endpoint eta QR fluxua</span></div>
        <div><strong>Lizentziak</strong><span>Irudiak, ikonoak eta liburutegiak</span></div>
      </div>
      <div class="cover-meta">
        <table>
          <tr><td>Egilea</td><td>{author}</td></tr>
          <tr><td>Bertsioa</td><td>{version}</td></tr>
          <tr><td>Data</td><td>{date}</td></tr>
          <tr><td>Hizkuntza</td><td>Euskara</td></tr>
          <tr><td>Lizentzia</td><td>PolyForm Noncommercial 1.0.0</td></tr>
        </table>
      </div>
    </div>
    <div class="cover-bottom">
      <div>Powerbank Inc. · Donostia / Zarautz</div>
      <div class="cover-note">
        Kode eta dokumentazioaren erabilera komertzialak lizentzia ordaindua behar du:
        hola@powerbank.eus. Hirugarrenen materialak bere lizentzia propioen pean daude.
      </div>
    </div>
  </section>

  <section class="toc-page">
    <h1>Aurkibidea</h1>
    <nav class="toc">
      {toc_html}
    </nav>
  </section>

  <main class="content">
    {body}
  </main>
</body>
</html>
"""


def render_pdf(html_text: str, output: Path, chrome: str) -> None:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=chrome, headless=True)
        page = browser.new_page()
        page.set_content(html_text, wait_until="load")
        page.emulate_media(media="print")
        page.pdf(
            path=str(output),
            format="A4",
            print_background=True,
            display_header_footer=True,
            header_template=HEADER_TEMPLATE,
            footer_template=FOOTER_TEMPLATE,
            margin={"top": "20mm", "bottom": "18mm", "left": "17mm", "right": "17mm"},
        )
        browser.close()


def add_metadata(pdf_path: Path) -> None:
    """Add document metadata that Chrome's print-to-PDF does not expose."""
    reader = PdfReader(str(pdf_path))
    writer = PdfWriter()
    writer.append(reader)
    writer.add_metadata(
        {
            "/Title": "Powerbank Alokairu Sistema - Dokumentazio teknikoa",
            "/Author": "Powerbank Inc.",
            "/Subject": (
                "Dokumentazio teknikoa eta hirugarrenen baliabideen lizentzien erregistroa"
            ),
            "/Keywords": (
                "Powerbank, FastAPI, Angular, PostgreSQL, dokumentazioa, lizentziak"
            ),
            "/Creator": "docs/build_pdf.py",
            "/Producer": "Playwright + Chrome/Edge",
        }
    )
    with pdf_path.open("wb") as handle:
        writer.write(handle)


def locate_pages(pdf_path: Path, entries: list[dict]) -> dict[str, int]:
    """Best-effort search of heading text in the generated PDF."""
    try:
        reader = PdfReader(str(pdf_path))
        page_texts = [normalize(page.extract_text() or "") for page in reader.pages]
    except Exception as exc:  # pragma: no cover - defensive
        print(f"Abisua: ezin izan dira orrialde-zenbakiak atera: {exc}", file=sys.stderr)
        return {}

    if not page_texts:
        return {}

    # The summary sentence appears only in the body, not in the TOC.
    summary_needle = normalize(
        "Powerbank Alokairu Sistema powerbank eramangarrien alokairua kudeatzeko web aplikazioa da."
    )
    start_page = 0
    for index, text in enumerate(page_texts):
        if summary_needle in text:
            start_page = index
            break

    page_numbers: dict[str, int] = {}
    last_page = start_page

    for entry in entries:
        needle = normalize(entry["text"])
        if not needle:
            continue

        found_page = None
        for index in range(last_page, len(page_texts)):
            if needle in page_texts[index]:
                found_page = index
                break

        if found_page is not None:
            page_numbers[entry["id"]] = found_page + 1
            last_page = found_page
        else:
            # Try a shorter prefix; some headings wrap across lines.
            short = needle[:60]
            if short and short != needle:
                for index in range(last_page, len(page_texts)):
                    if short in page_texts[index]:
                        found_page = index
                        break
                if found_page is not None:
                    page_numbers[entry["id"]] = found_page + 1
                    last_page = found_page

    return page_numbers


def main() -> int:
    if not SOURCE.is_file():
        print(f"Ez da iturria aurkitu: {SOURCE}", file=sys.stderr)
        return 1
    if not CSS_FILE.is_file():
        print(f"Ez da CSS fitxategia aurkitu: {CSS_FILE}", file=sys.stderr)
        return 1

    raw = SOURCE.read_text(encoding="utf-8")
    meta, markdown_text = parse_front_matter(raw)

    md = markdown.Markdown(
        extensions=["extra", "toc", "sane_lists"],
        extension_configs={"toc": {"permalink": False, "toc_depth": "1-2"}},
    )
    body = md.convert(markdown_text)
    entries = flatten_tokens(md.toc_tokens)

    if not entries:
        print("Abisua: ez da aurkibiderik sortu.", file=sys.stderr)

    chrome = find_chrome()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    # First pass: TOC without page numbers.
    toc_html = render_toc(entries)
    html_text = build_html(meta, body, toc_html)
    render_pdf(html_text, OUTPUT, chrome)

    # Second pass: fill page numbers and regenerate if we found any.
    page_numbers = locate_pages(OUTPUT, entries)
    if page_numbers:
        toc_html = render_toc(entries, page_numbers)
        html_text = build_html(meta, body, toc_html)
        render_pdf(html_text, OUTPUT, chrome)

        # A third pass corrects small pagination shifts, if any.
        page_numbers_2 = locate_pages(OUTPUT, entries)
        if page_numbers_2 and page_numbers_2 != page_numbers:
            toc_html = render_toc(entries, page_numbers_2)
            html_text = build_html(meta, body, toc_html)
            render_pdf(html_text, OUTPUT, chrome)

    add_metadata(OUTPUT)
    print(f"PDF sortuta: {OUTPUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
