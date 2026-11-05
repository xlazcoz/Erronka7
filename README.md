# Powerbank · Alokairu Sistema

Powerbank-en alokairua kudeatzeko sistema osoa: erabiltzaileentzako web aplikazioa, administrazio-panel angularra, FastAPI bidezko API bat eta PostgreSQL datu-basea.

**Egileak:** Xabier Lazcoz eta Aitor Mindeguia.

Sistemak bi udalerri (Donostia eta Zarautz), hamar kargagune, karga-postuak, powerbankak, erreserbak eta QR bidezko taquilla-fluxua kudeatzen ditu.

## Arkitektura

| Osagaia | Karpeta | Teknologia |
|---|---|---|
| Erabiltzailearen web aplikazioa | `web/` | HTML, CSS, JavaScript, Bootstrap, Leaflet |
| Administrazio-panela | `admin_atala/` | Angular 22 |
| APIa | `api_erronka/` | FastAPI, SQLAlchemy, Pydantic |
| Datu-basea | — | PostgreSQL |
| Taquilla / QR irakurgailua | `web/locker.html` | html5-qrcode, qrcodejs |

## Konfigurazioa

Kopiatu `.env.example` fitxategia `.env` gisa eta bete balioak:

```powershell
Copy-Item .env.example .env
```

| Aldagaia | Lehenetsia | Azalpena |
|---|---|---|
| `APP_ENV` | `development` | `production` ezartzean CORS eta cookieak gogortzen dira. |
| `DATABASE_URL` | `postgresql+psycopg://postgres:@localhost:5432/alokairu_sistema` | PostgreSQL konexioa. |
| `COOKIE_SECURE` | `true` produkzioan | Cookiea HTTPS bidez bakarrik bidaltzea. |
| `DOCS_ENABLED` | `true` garapenean | Swagger/OpenAPI dokumentazioa. |
| `CORS_ORIGINS` | — | Baimendutako jatorriak, komaz banatuta. |
| `CORS_ORIGIN_REGEX` | garapenean sare lokala | Produkzioan ez da automatikoki onartzen. |
| `LOGIN_MAX_ATTEMPTS` | `5` | Saio-hasieraren saiakera kopurua blokeatu aurretik. |
| `LOGIN_WINDOW_SECONDS` | `900` | Saiakerak zenbatzeko leihoa. |
| `LOGIN_BLOCK_SECONDS` | `900` | Blokeoaren iraupena. |
| `SESSION_MAX_AGE_SECONDS` | `604800` | Saioaren iraupena zerbitzarian (7 egun). |
| `MAX_IMAGE_UPLOAD_BYTES` | `5242880` | Irudien igoeraren muga (5 MB). |

> **Inportantea:** `.env` ez da inoiz git-era igo behar. `.gitignore` fitxategiak jada baztertzen du.

## Abiarazte azkarra

### 0. Ingurune-aldagaiak

Sortu `.env` fitxategia aurreko atalean azaldu bezala. Garapenean balio lehenetsiek
funtzionatzen dute PostgreSQL tokiko instalazioarekin.

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

Ireki `web/index.html` (Hasiera) VS Code Live Server-ekin (`http://localhost:5500`). Estazioak `web/Kargaguneak.html` orrian daude. APIa martxan egon behar da.

### 5. Administrazio-panela

```bash
cd admin_atala
npm install
npm start
```

Angular aplikazioa `http://localhost:4200` helbidean egongo da.

## Produkzioan jartzea (Docker)

Proiektuak `docker-compose.yml`, `deploy/nginx.conf` eta `deploy/nginx-admin.conf`
barne hartzen ditu: PostgreSQL, FastAPI, web estatikoa eta administrazio-panelaren
build-a, nginx bidez zerbitzatuta eta `/api` proxy-arekin.

```bash
Copy-Item .env.example .env
# Editatu .env: APP_ENV=production, COOKIE_SECURE=true, POSTGRES_PASSWORD sendoa...
docker compose up -d --build
```

- Web publikoa: `http://localhost:8080`
- Administrazio-panela: `http://localhost:8081`

Benetako produkzioan:

1. Jarri nginx atzean HTTPS (Let's Encrypt / Caddy) eta aktibatu `Strict-Transport-Security`.
2. Ezarri `COOKIE_SECURE=true` eta `APP_ENV=production`.
3. Erabili `CORS_ORIGINS` jatorri zehatzekin eta utzi `CORS_ORIGIN_REGEX` hutsik.
4. Aldatu `POSTGRES_PASSWORD` eta ez erabili demo pasahitzik.
5. Egin `db_data` bolumenaren babeskopiak.
6. Exekutatu `seed.py` soilik demo ingurune batean.

> **Oharra:** `api_erronka/seed.py` fitxategiak taula guztiak ezabatzen ditu. Ez exekutatu produkzioan.

## Kalitatea eta segurtasuna

- Saio-hasierak abiadura-muga du (`LOGIN_MAX_ATTEMPTS`).
- Irudien igoerak magic bytes bidez balioztatzen dira (JPG, PNG, GIF, WebP, AVIF) eta tamaina-muga dute.
- Erantzunek `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` eta `Permissions-Policy` cabeceras dituzte.
- APIak `/health` osasun-egiaztapena du.
- CIak APIaren testak, webaren lint/layout-a eta Angular build-a exekutatzen ditu (`.github/workflows/ci.yml`).

## Garapena eta mantentze-lanak

### Datu-basearen migrazioak (Alembic)

```bash
cd api_erronka
uv run alembic upgrade head
```

Migrazio berri bat sortzeko:

```bash
uv run alembic revision --autogenerate -m "aldaketaren deskribapena"
```

Aplikazioa abiaraztean `bootstrap_database()` funtzioak automatikoki aplikatzen
ditu migrazioak. Lehendik `create_all`/`ensure_schema` erabili zuen datu-basea
badago, eskema normalizatu eta `stamp head` egiten du.

### Testak

```bash
cd api_erronka
uv run python -m unittest discover -s tests -p "test_*.py" -v
```

Integrazio-testek PostgreSQL behar dute. Docker bidez:

```bash
docker compose -f docker-compose.test.yml up -d
```

PowerShell:

```powershell
$env:TEST_DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5433/alokairu_test"
cd api_erronka
uv run python -m unittest discover -s tests -p "test_*.py" -v
```

`TEST_DATABASE_URL` ez badago, integrazio-testak saltatzen dira.

### Web publikoa

Header/footer partialak `web/partials/` karpetan daude. Orriak sinkronizatzeko:

```bash
cd web
npm ci
npm run layout
npm run lint
npm run format
```

`npm run layout:check` CIan erabiltzen da partialekin desinkronizatuta dauden
orriak detektatzeko.

### Kargaguneen irudiak

Irudiak WebP formatuan daude `web/assets/stations/` eta
`admin_atala/public/assets/stations/` karpetetan. Berriz sortzeko:

```bash
uv run --with pillow python docs/optimize_station_images.py
```

## Demo erabiltzaileak

> **Kontuz:** hauek demo inguruneko kontuak dira. Produkzioan ezabatu edo aldatu pasahitzak.

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
- Erreserbak powerbanka jaso aurretik ezeztatu daitezke, baita hasiera-ordua igaro ondoren ere.
- Atzerapena: 5 € hasitako ordu bakoitzeko.

## Dokumentazioa

Dokumentazio teknikoa PDF formatuan:

- [`docs/Powerbank_Dokumentazio_Teknikoa.pdf`](docs/Powerbank_Dokumentazio_Teknikoa.pdf) — dokumentazio osoa (44 orrialde)
- [`docs/Powerbank_Dokumentazio_Teknikoa_Ertaina.pdf`](docs/Powerbank_Dokumentazio_Teknikoa_Ertaina.pdf) — bertsio ertaina (20–24 orrialde)
- [`docs/Powerbank_Dokumentazio_Teknikoa_Laburra.pdf`](docs/Powerbank_Dokumentazio_Teknikoa_Laburra.pdf) — bertsio laburra (12–15 orrialde)
- Iturriak: `docs/dokumentazioa.md`, `docs/dokumentazioa_ertaina.md`, `docs/dokumentazioa_laburra.md`
- IAren erabileraren txostena: [`docs/IA_Erabileraren_Txostena.pdf`](docs/IA_Erabileraren_Txostena.pdf)
- Hirugarrenen baliabideak: [`docs/THIRD_PARTY_NOTICES.md`](docs/THIRD_PARTY_NOTICES.md)
- Lege-informazioa (web): [`web/legala.html`](web/legala.html)
- Laguntza-zentroa (web): [`web/Laguntza.html`](web/Laguntza.html)
- Segurtasun-politika: [`SECURITY.md`](SECURITY.md)
- Laguntzeko gida: [`CONTRIBUTING.md`](CONTRIBUTING.md)
- Aldaketen erregistroa: [`CHANGELOG.md`](CHANGELOG.md)

> **Oharra:** `web/legala.html` fitxategiko testua txantiloi bat da. Produkzioan jarri aurretik,
> bete titularraren datuak eta berrikusi eduki juridikoa profesional batekin.

## Lizentzia

Proiektu hau **PolyForm Noncommercial License 1.0.0** lizentziapean dago.

- Erabilera ez-komertziala doakoa da.
- Erabilera komertzialak (dirua irabazteko erabilera barne) **lizentzia komertzial ordaindua** behar du.
- Lizentzia komertziala eskuratzeko: `hola@powerbank.eus`.

Xehetasunak: [`LICENSE`](LICENSE).
