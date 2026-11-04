# Dokumentazioa

Karpeta honetan Powerbank Alokairu Sistemaren dokumentazio teknikoa dago.

| Fitxategia | Azalpena |
|---|---|
| `Powerbank_Dokumentazio_Teknikoa.pdf` | Entrega finala, A4 formatuan |
| `dokumentazioa.md` | Dokumentuaren iturria (Markdown) |
| `THIRD_PARTY_NOTICES.md` | Hirugarrenen baliabideen lizentzia-oharrak |
| `assets/estiloa.css` | PDFaren estiloa |
| `build_pdf.py` | PDFa sortzeko scripta |

## PDFa berriro sortzea

Proiektuaren erro-karpetatik:

```bash
uv run --with markdown --with playwright --with pypdf python docs/build_pdf.py
```

Scriptak Google Chrome edo Microsoft Edge erabiltzen du PDFa sortzeko. Ez da nabigatzailerik instalatu behar Playwright bidez; lehendik instalatuta dagoen Chrome/Edge erabiltzen du.

## Dokumentua aldatzea

1. Aldatu `dokumentazioa.md`.
2. Exekutatu aurreko komandoa.
3. Egiaztatu `Powerbank_Dokumentazio_Teknikoa.pdf`.

## Lizentziak

- Proiektuaren kodea eta dokumentazioa: **PolyForm Noncommercial License 1.0.0** (`../LICENSE`).
- Erabilera komertzialak lizentzia ordaindua behar du: `hola@powerbank.eus`.
- Hirugarrenen materialak bere lizentzia propioen pean daude: ikusi `THIRD_PARTY_NOTICES.md`.
