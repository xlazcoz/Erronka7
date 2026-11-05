# Dokumentazioa

Karpeta honetan Powerbank Alokairu Sistemaren dokumentazio teknikoa dago.

| Fitxategia | Azalpena |
|---|---|
| `Powerbank_Dokumentazio_Teknikoa.pdf` | Dokumentazio osoa, A4 formatuan (44 orrialde) |
| `Powerbank_Dokumentazio_Teknikoa_Ertaina.pdf` | Bertsio ertaina (20–24 orrialde) |
| `Powerbank_Dokumentazio_Teknikoa_Laburra.pdf` | Bertsio laburra (12–15 orrialde) |
| `dokumentazioa.md` | Dokumentazio osoaren iturria |
| `dokumentazioa_ertaina.md` | Bertsio ertainaren iturria |
| `dokumentazioa_laburra.md` | Bertsio laburraren iturria |
| `IA_Erabileraren_Txostena.pdf` | IAren erabileraren txostena, A4 formatuan |
| `ia_txostena.md` | IAren txostenaren iturria (Markdown) |
| `THIRD_PARTY_NOTICES.md` | Hirugarrenen baliabideen lizentzia-oharrak |
| `assets/estiloa.css` | PDFaren estiloa |
| `build_pdf.py` | Hiru dokumentazio-bertsioak sortzeko scripta |
| `build_ia_pdf.py` | IAren erabileraren txostena sortzeko scripta |
| `optimize_station_images.py` | Kargaguneen irudiak deskargatu eta WebP formatura optimizatzeko scripta |

## PDFak berriro sortzea

Proiektuaren erro-karpetatik:

```bash
uv run --with markdown --with playwright --with pypdf python docs/build_pdf.py
uv run --with markdown --with playwright --with pypdf python docs/build_ia_pdf.py
```

Dokumentazioaren bertsio bakarra sortzeko:

```bash
uv run --with markdown --with playwright --with pypdf python docs/build_pdf.py --only short
```

`--only` balioak: `full`, `medium`, `short`.

Scriptek Google Chrome edo Microsoft Edge erabiltzen dute PDFa sortzeko. Ez da nabigatzailerik instalatu behar Playwright bidez; lehendik instalatuta dagoen Chrome/Edge erabiltzen dute.

## Dokumentua aldatzea

1. Aldatu dagokion `.md` fitxategia (`dokumentazioa.md`, `dokumentazioa_ertaina.md`, `dokumentazioa_laburra.md` edo `ia_txostena.md`).
2. Exekutatu dagokion komandoa.
3. Egiaztatu sortutako PDFa.

## Lizentziak

- Proiektuaren kodea eta dokumentazioa: **PolyForm Noncommercial License 1.0.0** (`../LICENSE`).
- Erabilera komertzialak lizentzia ordaindua behar du: `hola@powerbank.eus`.
- Hirugarrenen materialak bere lizentzia propioen pean daude: ikusi `THIRD_PARTY_NOTICES.md`.
