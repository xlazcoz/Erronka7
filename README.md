# Powerbank · Alokairu Sistema

Powerbank-en alokairua kudeatzeko sistema osoa: erabiltzaileentzako web aplikazioa, administrazio-panel angularra, FastAPI bidezko API bat eta PostgreSQL datu-basea.

**Egileak:** Xabier Lazcoz eta Aitor Mindeguia.

Sistemak bi udalerri (Donostia eta Zarautz), hamar kargagune, karga-postuak, powerbankak, erreserbak eta QR bidezko taquilla-fluxua kudeatzen ditu.

## Arkitektura

| Osagaia | Karpeta | Teknologia |
|---|---|---|
| Erabiltzailearen web aplikazioa | `web/` | HTML, CSS, JavaScript, Bootstrap, Leaflet |
| Administrazio-panela | `src/` | Angular 22 |
| APIa | `api_erronka/` | FastAPI, SQLAlchemy, Pydantic |
| Datu-basea | — | PostgreSQL |
| Taquilla / QR irakurgailua | `web/locker.html` | html5-qrcode, qrcodejs |

## Abiarazte azkarra

### 1. Datu-basea

PostgreSQL `localhost:5432` portuan martxan egon behar du, eta `alokairu_sistema` datu-basea sortuta egon behar da.

### 2. APIa

```bash
cd api_erronka
uv run python -m fastapi dev main.py
```

APIa `http://127.0.0.1:8000` helbidean egongo da. Swagger dokumentazioa: `http://127.0.0.1:8000/docs`.

### 3. Demo datuak

```bash
cd api_erronka
uv run python seed.py
```

> **Kontuz:** `seed.py` datu-baseko taula guztiak ezabatzen ditu eta berriro sortzen ditu.

### 4. Web aplikazioa

Ireki `web/index.html` VS Code Live Server-ekin (`http://localhost:5500`). APIa martxan egon behar da.

### 5. Administrazio-panela

```bash
npm install
npm start
```

Angular aplikazioa `http://localhost:4200` helbidean egongo da.

## Demo erabiltzaileak

| Rola | Emaila | Pasahitza |
|---|---|---|
| Erabiltzailea | `alex@example.com` | `1234` |
| Administratzaile orokorra | `ane@example.com` | `1234` |
| Donostiako udalerri-administratzailea | `demo03@example.com` | `1234` |
| Zarauzko udalerri-administratzailea | `demo04@example.com` | `1234` |
| Administratzaile orokorra | `xabier@gmail.com` | `123` |

## Erreserben arau nagusiak

- Erreserba gaurko egunean bakarrik egin daiteke.
- Gehienez 6 ordu aurretik egin daiteke erreserba.
- Iraupena: gutxienez 15 minutu, gehienez 6 ordu.
- Erabiltzaile bakoitzak erreserba aktibo bakarra izan dezake.
- Erreserba hasi aurretik soilik ezeztatu daiteke.
- Atzerapena: 5 € hasitako ordu bakoitzeko.

## Dokumentazioa

Dokumentazio teknikoa PDF formatuan:

- [`docs/Powerbank_Dokumentazio_Teknikoa.pdf`](docs/Powerbank_Dokumentazio_Teknikoa.pdf)
- Iturria: [`docs/dokumentazioa.md`](docs/dokumentazioa.md)
- Hirugarrenen baliabideak: [`docs/THIRD_PARTY_NOTICES.md`](docs/THIRD_PARTY_NOTICES.md)

## Lizentzia

Proiektu hau **PolyForm Noncommercial License 1.0.0** lizentziapean dago.

- Erabilera ez-komertziala doakoa da.
- Erabilera komertzialak (dirua irabazteko erabilera barne) **lizentzia komertzial ordaindua** behar du.
- Lizentzia komertziala eskuratzeko: `hola@powerbank.eus`.

Xehetasunak: [`LICENSE`](LICENSE).
