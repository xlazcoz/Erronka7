#!/usr/bin/env python3
"""Build the AI usage report PDF.

Usage (from the repository root):

    uv run --with markdown --with playwright --with pypdf python docs/build_ia_pdf.py

The script reuses the shared helpers and stylesheet from ``build_pdf.py`` but
has its own source, cover and output file.
"""

from __future__ import annotations

import html
import sys
from pathlib import Path

import markdown

from build_pdf import (
    CSS_FILE,
    add_metadata,
    find_chrome,
    flatten_tokens,
    normalize,
    parse_front_matter,
    render_pdf,
    render_toc,
)

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "ia_txostena.md"
OUTPUT = ROOT / "IA_Erabileraren_Txostena.pdf"

HEADER_TEMPLATE = """
<div style="width:100%; padding:0 17mm; font-family:'Segoe UI',Arial,sans-serif;
            font-size:7.5px; color:#64748b; display:flex; justify-content:space-between;">
  <span>Powerbank Alokairu Sistema</span>
  <span>IAren erabileraren txostena · 1.0</span>
</div>
"""

FOOTER_TEMPLATE = """
<div style="width:100%; padding:0 17mm; font-family:'Segoe UI',Arial,sans-serif;
            font-size:7.5px; color:#64748b; text-align:center;">
  <span class="pageNumber"></span> / <span class="totalPages"></span>
</div>
"""

# Body sentence used to skip the cover and the table of contents when
# locating headings for the page numbers.
SUMMARY_NEEDLE = normalize(
    "Txosten honek Powerbank Alokairu Sistema proiektuan taldeak IA"
)


def build_html(meta: dict[str, str], body: str, toc_html: str) -> str:
    css = CSS_FILE.read_text(encoding="utf-8")
    title = html.escape(meta.get("title", "IAren Erabileraren Txostena"))
    subtitle = html.escape(meta.get("subtitle", ""))
    author = html.escape(meta.get("author", "____________________"))
    date = html.escape(meta.get("date", ""))
    version = html.escape(meta.get("version", "1.0"))
    project = html.escape(meta.get("project", ""))

    return f"""<!doctype html>
<html lang="eu">
<head>
  <meta charset="utf-8">
  <meta name="author" content="Powerbank Inc.">
  <meta name="description" content="Powerbank Alokairu Sistemaren IA erabileraren txostena: tresnak, promptak, kodea, akatsak, zuzenketak eta hausnarketa.">
  <title>{title} — IAren erabileraren txostena</title>
  <style>{css}</style>
</head>
<body>
  <section class="cover">
    <div class="cover-top">
      <div class="cover-kicker">{project}</div>
      <h1>{title}</h1>
      <p class="cover-subtitle">{subtitle}</p>
      <p class="cover-abstract">
        Txosten honek taldeak IA nola erabili duen azaltzen du Powerbank
        Alokairu Sistemaren web aplikazioa hobetzeko: erabilitako tresnak eta
        ereduak, prompt esanguratsuak, sortutako kodea, aurkitutako akatsak,
        IAren proposamenetan egindako zuzenketak eta IA erabili gabe edo
        erabilita lan egiteko moduen arteko hausnarketa.
      </p>
      <div class="cover-highlights">
        <div><strong>Tresnak</strong><span>OpenCode, DeepSeek V4.1 Flash eta Edge DevTools</span></div>
        <div><strong>Promptak</strong><span>Sei eskaera nagusi eta haien emaitzak</span></div>
        <div><strong>Kodea</strong><span>Bateria, FLIP, mapa-sinkronia eta auto-berritzea</span></div>
        <div><strong>Hausnarketa</strong><span>IAren mugak, zuzenketak eta taldearen rola</span></div>
      </div>
      <div class="cover-meta">
        <table>
          <tr><td>Egileak</td><td>{author}</td></tr>
          <tr><td>Bertsioa</td><td>{version}</td></tr>
          <tr><td>Data</td><td>{date}</td></tr>
          <tr><td>Hizkuntza</td><td>Euskara</td></tr>
          <tr><td>Proiektua</td><td>Erronka 7 · Administrazio Atala</td></tr>
        </table>
      </div>
    </div>
    <div class="cover-bottom">
      <div>Powerbank Inc. · Donostia / Zarautz</div>
      <div class="cover-note">
        Txosten hau taldearen lana da. IAren erantzunak ez dira itsuan
        aplikatu: kodea irakurri, probatu eta zuzendu da. Taldekide guztiek
        funtzionalitateak eta kodea azaltzeko gai izan behar dute.
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


def locate_pages(pdf_path: Path, entries: list[dict]) -> dict[str, int]:
    """Best-effort search of heading text in the generated PDF."""
    try:
        from pypdf import PdfReader

        reader = PdfReader(str(pdf_path))
        page_texts = [normalize(page.extract_text() or "") for page in reader.pages]
    except Exception as exc:  # pragma: no cover - defensive
        print(f"Abisua: ezin izan dira orrialde-zenbakiak atera: {exc}", file=sys.stderr)
        return {}

    if not page_texts:
        return {}

    start_page = 0
    for index, text in enumerate(page_texts):
        if SUMMARY_NEEDLE in text:
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

    toc_html = render_toc(entries)
    html_text = build_html(meta, body, toc_html)
    render_pdf(html_text, OUTPUT, chrome, HEADER_TEMPLATE, FOOTER_TEMPLATE)

    page_numbers = locate_pages(OUTPUT, entries)
    if page_numbers:
        toc_html = render_toc(entries, page_numbers)
        html_text = build_html(meta, body, toc_html)
        render_pdf(html_text, OUTPUT, chrome, HEADER_TEMPLATE, FOOTER_TEMPLATE)

        page_numbers_2 = locate_pages(OUTPUT, entries)
        if page_numbers_2 and page_numbers_2 != page_numbers:
            toc_html = render_toc(entries, page_numbers_2)
            html_text = build_html(meta, body, toc_html)
            render_pdf(html_text, OUTPUT, chrome, HEADER_TEMPLATE, FOOTER_TEMPLATE)

    add_metadata(
        OUTPUT,
        {
            "/Title": "Powerbank Alokairu Sistema - IAren erabileraren txostena",
            "/Author": "Powerbank Inc.",
            "/Subject": (
                "IAren erabileraren txostena: tresnak, promptak, kodea, akatsak, "
                "zuzenketak eta hausnarketa"
            ),
            "/Keywords": (
                "Powerbank, IA, OpenCode, DeepSeek, FLIP, JavaScript, CSS, "
                "auto-berritzea, dokumentazioa"
            ),
            "/Creator": "docs/build_ia_pdf.py",
            "/Producer": "Playwright + Chrome/Edge",
        },
    )
    print(f"PDF sortuta: {OUTPUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
