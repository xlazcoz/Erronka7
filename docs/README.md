# Dokumentazioa

Karpeta honetan Powerbank Alokairu Sistemaren dokumentazio teknikoa dago.

| Fitxategia | Azalpena |
|---|---|
| `Powerbank_Dokumentazio_Teknikoa.pdf` | Entrega finala, A4 formatuan |
| `dokumentazioa.md` | Dokumentuaren iturria (Markdown) |
| `IA_Erabileraren_Txostena.pdf` | IAren erabileraren txostena, A4 formatuan |
| `ia_txostena.md` | IAren txostenaren iturria (Markdown) |
| `THIRD_PARTY_NOTICES.md` | Hirugarrenen baliabideen lizentzia-oharrak |
| `assets/estiloa.css` | PDFaren estiloa |
| `build_pdf.py` | Dokumentazio teknikoa sortzeko scripta |
| `build_ia_pdf.py` | IAren erabileraren txostena sortzeko scripta |

## PDFak berriro sortzea

Proiektuaren erro-karpetatik:

```bash
uv run --with markdown --with playwright --with pypdf python docs/build_pdf.py
uv run --with markdown --with playwright --with pypdf python docs/build_ia_pdf.py
```

Scriptek Google Chrome edo Microsoft Edge erabiltzen dute PDFa sortzeko. Ez da nabigatzailerik instalatu behar Playwright bidez; lehendik instalatuta dagoen Chrome/Edge erabiltzen dute.

## Dokumentua aldatzea

1. Aldatu dagokion `.md` fitxategia (`dokumentazioa.md` edo `ia_txostena.md`).
2. Exekutatu dagokion komandoa.
3. Egiaztatu sortutako PDFa.

## Lizentziak

- Proiektuaren kodea eta dokumentazioa: **PolyForm Noncommercial License 1.0.0** (`../LICENSE`).
- Erabilera komertzialak lizentzia ordaindua behar du: `hola@powerbank.eus`.
- Hirugarrenen materialak bere lizentzia propioen pean daude: ikusi `THIRD_PARTY_NOTICES.md`.
