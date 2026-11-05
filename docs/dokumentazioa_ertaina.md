---
title: "Powerbank Alokairu Sistema"
subtitle: "Dokumentazio teknikoa — bertsio ertaina"
author: "Xabier Lazcoz eta Aitor Mindeguia"
date: "2026ko azaroa"
version: "1.0 · bertsio ertaina"
project: "Erronka 7 · Administrazio Atala"
content_start: "Dokumentu honek Powerbank Alokairu Sistemaren dokumentazio teknikoaren bertsio ertaina eskaintzen du."
pdf_title: "Powerbank Alokairu Sistema - Dokumentazio teknikoa (ertaina)"
---

# Laburpena

Dokumentu honek Powerbank Alokairu Sistemaren dokumentazio teknikoaren bertsio ertaina eskaintzen du. Bertsio osoak baino xehetasun gutxiago ditu, baina erabiltzaile, administrazio, API, datu-base eta lizentzien ikuspegi osoa mantentzen du.

Powerbank Alokairu Sistema powerbank eramangarrien alokairua kudeatzeko aplikazioa da. Hiru interfaze ditu: erabiltzailearen web aplikazioa (`web/`), administrazio-panel angularra (`src/`) eta taquillako QR irakurgailua. APIa FastAPI bidezkoa da eta datuak PostgreSQL datu-basean gordetzen dira.

| Eremua | Balioa |
|---|---|
| Proiektua | Erronka 7 · Administrazio Atala |
| Egileak | Xabier Lazcoz eta Aitor Mindeguia |
| Arkitektura | Web estatikoa + Angular + FastAPI + PostgreSQL |
| Erabiltzaile motak | `user`, `udalerri_admin`, `admin` |
| Endpoint kopurua | 40 |
| Datu-baseko taulak | 7 |
| Unit testak | 16 |
| Lizentzia | PolyForm Noncommercial 1.0.0 |

## Dokumentuaren egitura

| Atala | Edukia |
|---|---|
| 1–3 | Sarrera, arkitektura eta biltegiko egitura |
| 4 | Datu-eredua |
| 5–6 | Funtzionalitateak eta negozio-arauak |
| 7 | APIaren erreferentzia |
| 8–9 | Instalazioa, probak eta segurtasuna |
| 10–11 | Lizentziak eta ondorioak |

# 1. Sarrera

## 1.1 Helburua

Dokumentuaren helburua da sistema ulertzeko, instalatzeko eta mantentzeko beharrezkoa den informazio teknikoa ematea, bertsio osoaren laburpen sendo bat eskainiz.

## 1.2 Norainokoa

Dokumentuak web aplikazioa, Angular panela, FastAPI APIa, PostgreSQL datu-basea, QR fluxua, probak, segurtasuna eta hirugarrenen lizentziak hartzen ditu. Ez du hartzen ekoizpen-azpiegitura, ordainketa-pasabidea edo fakturazioa.

## 1.3 Terminologia

- **Endpoint**: APIaren bide bat.
- **Payload**: HTTP eskaerako JSON edukia.
- **Cookie**: nabigatzaileko saio-informazioa.
- **Token**: QR kodea identifikatzen duen katea.
- **Taquilla**: powerbankak gordetzeko eta kargatzeko armairua.
- **Karga-postua**: taquillaren barruko gelaxka.

# 2. Sistemaren ikuspegi orokorra

## 2.1 Erabiltzaile motak

| Rola | Kodeko balioa | Baimenak |
|---|---|---|
| Erabiltzaile arrunta | `user` | Bere erreserbak sortu, ikusi eta ezeztatu; profila aldatu |
| Udalerri-administratzailea | `udalerri_admin` | Bere udalerriko kargagune, postu, powerbank eta erreserbak kudeatu |
| Administratzaile orokorra | `admin` | Sistema osoa kudeatu |

## 2.2 Funtzio nagusiak

- Erregistroa, saioa eta profila.
- Estazioen zerrenda, bilaketa, iragazkiak eta mapa.
- Erreserba sortzea, ezeztatzea eta historiala.
- QR kodea sortu, deskargatu eta inprimatu.
- Taquillan QR bidez jaso eta itzuli.
- Administrazioa: erabiltzaileak, kargaguneak, postuak, powerbankak eta erreserbak.
- Udalerri bidezko baimenak eta atzerapen-kargaren kalkulua.

## 2.3 Arkitektura

<div class="arch-diagram">
  <div class="arch-row">
    <div class="arch-box">
      <strong>Erabiltzailearen web</strong>
      <span>web/ · HTML, CSS, JavaScript</span>
      <span>Bootstrap · Leaflet · Font Awesome</span>
    </div>
    <div class="arch-box">
      <strong>Administrazio-panela</strong>
      <span>src/ · Angular 22</span>
      <span>ng-hub-ui-paginable</span>
    </div>
  </div>
  <div class="arch-arrow">HTTP/JSON · <code>session_id</code> cookie bidezko saioa</div>
  <div class="arch-box arch-box-wide">
    <strong>FastAPI APIa</strong>
    <span>routers · services · schemas · models</span>
    <span>Autentikazioa · baimenak · negozio-arauak · QR fluxua</span>
  </div>
  <div class="arch-arrow">SQLAlchemy ORM · psycopg · PostgreSQL protokoloa</div>
  <div class="arch-box arch-box-wide">
    <strong>PostgreSQL</strong>
    <span>alokairu_sistema · 7 taula · CHECK, UNIQUE eta EXCLUDE murrizketak</span>
  </div>
</div>

## 2.4 Teknologia-pila

| Geruza | Teknologia | Bertsioa |
|---|---|---|
| Web estatikoa | HTML, CSS, JavaScript | — |
| CSS | Bootstrap | 5.3.8 |
| Mapa | Leaflet + OpenStreetMap | 1.9.4 |
| Ikonoak | Font Awesome Free | 6.5.2 |
| QR sorkuntza | qrcodejs | 1.0.0 |
| QR irakurketa | html5-qrcode | 2.3.8 |
| Administrazioa | Angular | 22.2 |
| Taulak | ng-hub-ui-paginable | 22.32 |
| APIa | FastAPI | ≥ 0.162 |
| ORM | SQLAlchemy | ≥ 2.1.6 |
| Balidazioa | Pydantic | FastAPI-rekin |
| Datu-basea | PostgreSQL | 14+ |
| Pasahitzen hash | pwdlib + Argon2 | — |

## 2.5 Biltegiko egitura

```text
erronka7/
├── api_erronka/         # FastAPI APIa
│   ├── routers/         # endpoint-ak
│   ├── services/        # negozio-logika
│   ├── models/          # SQLAlchemy modeloak
│   ├── schemas/         # Pydantic eskemak
│   └── tests/           # unit testak
├── src/app/             # Angular administrazio-panela
├── web/                 # Erabiltzailearen web estatikoa
│   ├── css/
│   └── js/
├── docs/                # Dokumentazioa
├── public/favicon.ico
├── LICENSE
└── README.md
```

# 3. Arkitektura eta osagaiak

## 3.1 Erabiltzailearen web aplikazioa

| Orria | Eginkizuna |
|---|---|
| `index.html` | Estazioen zerrenda, bilaketa, iragazkiak eta mapa |
| `Login.html` | Saioa hasi eta erregistratu |
| `Erreserbak.html` | Erreserbak, QR kodea eta ezeztapena |
| `Erabiltzailea.html` | Profila eta pasahitza |
| `puesto-Carga.html` | Estazioaren xehetasuna eta erreserba |
| `locker.html` | Taquillako QR irakurgailua |

JavaScript moduluak: `api.js`, `auth.js`, `dialogos.js`, `index.js`, `login.js`, `reservas.js`, `user.js`, `puesto.js` eta `locker.js`.

## 3.2 Angular administrazio-panela

| Bidea | Konponentea | Eginkizuna |
|---|---|---|
| `/erabiltzaileak` | `Erabiltzaileak` | Erabiltzaileen kudeaketa |
| `/kargaguneak` | `Kargaguneak` | Kargaguneen kudeaketa |
| `/powerbanks` | `Powerbanks` | Powerbanken kudeaketa |
| `/erreserbak` | `Erreserbak` | Erreserben taula |
| `/saioa-hasi` | `SaioaHasi` | Administrazioaren saioa |
| `/erregistratu` | `Erregistratu` | Erabiltzaile berria |

Oharra: `app.config.ts` fitxategiak ez du `provideHttpClient()` deitzen; beraz, Angular aplikazioa abiaraztean HTTP hornitzailea falta badaiteke.

## 3.3 APIaren egitura

| Routerra | Prefixua | Eginkizuna |
|---|---|---|
| `login.py` | `/login` | Erregistroa, saioa, profila eta pasahitza |
| `erabiltzaileak.py` | `/erabiltzaileak` | Erabiltzaileen CRUDa eta rolak |
| `kargaguneak.py` | `/kargaguneak` | Kargaguneak eta eskuragarritasuna |
| `karga_postuak.py` | `/kargapostuak` | Karga-postuak |
| `powerbanks.py` | `/powerbanks` | Powerbankak |
| `erreserbak.py` | `/erreserbak` | Erreserbak eta QR fluxua |
| `udalerriak.py` | `/udalerriak` | Udalerriak |
| `qr.py` | `/qr` | Taquillako QR eskaneatzea |

## 3.4 Konfigurazioa

| Aldagaia | Kokapena | Eginkizuna |
|---|---|---|
| `DATABASE_URL` | `database.py` | PostgreSQL konexioa |
| `CORS_ORIGINS` | `main.py` | CORS jatorri gehigarriak |
| `CORS_ORIGIN_REGEX` | `main.py` | CORS jatorrien erregela |
| `COOKIE_SECURE` | `routers/login.py` | Cookiea HTTPS bidez soilik |
| `API_BASE_URL` | `web/js/api.js` | APIaren URLaren gainidazketa |

# 4. Datu-eredua

## 4.1 Entitateak

### Erabiltzailea (`erabiltzaileak`)

| Eremua | Mota | Murrizketa |
|---|---|---|
| `id` | `INTEGER` | PK |
| `izena`, `abizena` | `VARCHAR(100)` | NOT NULL |
| `login_email` | `VARCHAR(100)` | NOT NULL, bakarra (lower) |
| `login_pasahitza` | `VARCHAR(255)` | NOT NULL, Argon2 hash |
| `rola` | `VARCHAR(100)` | CHECK: `user`, `udalerri_admin`, `admin` |
| `udalerria_id` | `INTEGER` | FK, NULL; `udalerri_admin` bada derrigorrezkoa |

### Udalerria (`udalerriak`)

| Eremua | Mota | Murrizketa |
|---|---|---|
| `id` | `INTEGER` | PK |
| `izena` | `VARCHAR(100)` | NOT NULL, UNIQUE |
| `aktiboa` | `BOOLEAN` | NOT NULL, default `true` |

### Kargagunea (`kargaguneak`)

| Eremua | Mota | Murrizketa |
|---|---|---|
| `id` | `INTEGER` | PK |
| `izena`, `helbidea` | `VARCHAR` | NOT NULL |
| `irudia1`, `irudia2`, `irudia3` | `VARCHAR(1000)` | NOT NULL |
| `egoera` | `VARCHAR(100)` | CHECK |
| `udalerria_id` | `INTEGER` | FK, NULL |
| `latitud`, `longitud` | `DOUBLE PRECISION` | NULL, CHECK |

### KargaPostua (`karga_postuak`)

| Eremua | Mota | Murrizketa |
|---|---|---|
| `id` | `INTEGER` | PK |
| `egoera` | `VARCHAR(100)` | CHECK: `hutsa`, `kargatuta`, `kargatzen` |
| `tamaina` | `VARCHAR(100)` | CHECK: `txikia`, `ertaina`, `handia`, `estandar` |
| `kargagunea_id` | `INTEGER` | FK NOT NULL, RESTRICT |

### Powerbank (`powerbanks`)

| Eremua | Mota | Murrizketa |
|---|---|---|
| `id` | `INTEGER` | PK |
| `karga_maila` | `DOUBLE PRECISION` | CHECK [0, 100] |
| `egoera` | `VARCHAR(100)` | CHECK |
| `karga_postua_id` | `INTEGER` | FK NOT NULL, UNIQUE, RESTRICT |

### Erreserba (`erreserbak`)

| Eremua | Mota | Murrizketa |
|---|---|---|
| `id` | `INTEGER` | PK |
| `erabiltzailea_id`, `powerbank_id` | `INTEGER` | FK NOT NULL, RESTRICT |
| `hasiera_data_ordua`, `amaiera_data_ordua` | `TIMESTAMP` | NOT NULL |
| `egikaritze_data_ordua`, `amaitze_data_ordua` | `TIMESTAMP` | NULL |
| `hasierako_karga_postua`, `bukaerako_karga_postua` | `INTEGER` | FK |
| `egoera` | `VARCHAR(100)` | CHECK: `aktiboa`, `ezeztatua`, `amaitua` |
| `qr_token` | `VARCHAR(64)` | NOT NULL, UNIQUE |
| `berandu`, `karga_extra` | `BOOLEAN`, `DOUBLE` | Atzerapenaren datuak |

### AuthSession (`auth_sessions`)

| Eremua | Mota | Murrizketa |
|---|---|---|
| `id` | `VARCHAR(100)` | PK, saio-tokena |
| `erabiltzailea_id` | `INTEGER` | FK NOT NULL, CASCADE |

## 4.2 Erlazioak

| Jatorria | Helburua | Kardinalitatea |
|---|---|---|
| Udalerria | Kargagunea | 1–N |
| Udalerria | Erabiltzailea | 1–N |
| Kargagunea | KargaPostua | 1–N |
| KargaPostua | Powerbank | 1–1 |
| Erabiltzailea | Erreserba | 1–N |
| Powerbank | Erreserba | 1–N |
| KargaPostua | Erreserba (hasiera/amaiera) | 1–N |
| Erabiltzailea | AuthSession | 1–N |

## 4.3 Murrizketa nagusiak

- Emaila bakarra da, maiuskulaz/minuskulaz independentea.
- `udalerri_admin` rolak udalerria izan behar du.
- Kargaguneen egoera, karga-postuen egoera eta tamaina, powerbanken egoera eta erreserben egoera balio baliodunetara mugatuta daude.
- Karga-maila 0 eta 100 artekoa da.
- Erreserba baten amaiera hasiera baino geroagokoa da.
- Erabiltzaile bakoitzeko erreserba aktibo bakarra (indize partziala).
- Powerbank edo erabiltzaile berean erreserba aktiboak ezin dira gainjarri (`EXCLUDE` murrizketak).

## 4.4 Seed datuak

`seed.py` fitxategiak datu-basea ezabatzen du eta demo datuak sortzen ditu: 11 erabiltzaile, 2 udalerri, 10 kargagune, 21 powerbank, 10 erreserba historiko eta erreserba aktibo bat. Demo03 eta Demo04 udalerri-administratzaileak dira. Pasahitzak `1234` (Xabierrek `123`).

# 5. Funtzionalitateak

## 5.1 Erabiltzailearen bidaia

1. Erregistroa edo saioa.
2. Estazioaren aukeraketa zerrendan edo mapan.
3. Data eta ordua hautatzea.
4. Eskuragarritasunaren egiaztapena.
5. Erreserbaren sorrera eta QR tokena.
6. QRaren deskarga edo inprimaketa.
7. Taquillan recogida.
8. Taquillan devolución.

## 5.2 Administrazioa

- Erabiltzaileen CRUDa eta rolak.
- Kargaguneen, karga-postuen eta powerbanken kudeaketa.
- Erreserben ikuspegia eta kudeaketa.
- Udalerri-administratzaileentzako baimen mugatuak.
- Taquilla eta QR fluxua administratzaile orokorrentzat.

## 5.3 QR fluxua

| `status` | HTTP | Esanahia |
|---|---|---|
| `in_use` | 200 | Taquilla ireki da; powerbanka jaso da |
| `returned` | 200 | Powerbanka ondo itzuli da |
| `returned_late` | 200 | Atzerapenarekin itzuli da |
| `too_early` | 409 | Oraindik ez da recogida-ordua |
| `expired` | 410 | QR-a iraungi da |
| `wrong_station` | 409 | Estazio okerrean eskaneatu da |
| `no_free_locker` | 409 | Ez dago taquilla librerik |
| `cancelled` | 409 | Erreserba ezeztatuta dago |
| `already_returned` | 200 | Powerbanka lehendik itzuli da |
| `invalid` | 404 | Tokena ez da existitzen |

# 6. Negozio-arauak

| Araua | Balioa |
|---|---|
| Erreserbaren eguna | Gaurkoa soilik |
| Gehienezko aurrerapena | 6 ordu |
| Gutxieneko iraupena | 15 minutu |
| Gehienezko iraupena | 6 ordu |
| Erreserba aktiboak | Erabiltzaile bakoitzeko bat |
| Ezeztatzea | Hasiera aurretik soilik |
| Atzerapen-karga | 5 € hasitako ordu bakoitzeko |

Erreserbak jaso gabe iraungitzen badira, `amaitua` egoerara pasatzen dira. Jaso diren erreserbak itzuli arte aktibo egoten dira, atzerapena erregistratu ahal izateko.

# 7. APIaren erreferentzia

## 7.1 Autentikazioa eta CORS

- `session_id` cookiea, `HttpOnly`, `SameSite=Lax`, 7 egun.
- `COOKIE_SECURE` bidez HTTPS soilik.
- CORS: 5500 eta 4200 portuak, localhost/127.0.0.1 eta sare pribatuko IPak.
- Baimenak: `get_current_user`, `require_admin`, `require_manager`, `can_manage_municipality`.

## 7.2 Endpoint-ak

### Login

| Metodoa | Bidea | Baimena | Deskribapena |
|---|---|---|---|
| POST | `/login/register` | Publikoa | Erabiltzaile berria (201) |
| POST | `/login` | Publikoa | Saioa hasi |
| POST | `/login/logout` | Aukerakoa | Saioa itxi |
| GET | `/login/me` | Saioa | Uneko erabiltzailea |
| PATCH | `/login/me` | Saioa | Profila aldatu |
| PATCH | `/login/password` | Saioa | Pasahitza aldatu |

### Erabiltzaileak

| Metodoa | Bidea | Baimena | Deskribapena |
|---|---|---|---|
| GET | `/erabiltzaileak` | Admin | Zerrenda |
| GET | `/erabiltzaileak/{id}` | Admin/jabea | Erabiltzaile bat |
| GET | `/erabiltzaileak/{id}/erreserbak` | Admin/jabea | Erreserbak |
| POST | `/erabiltzaileak` | Admin | Sortu (201) |
| PATCH | `/erabiltzaileak/{id}` | Admin | Aldatu |
| PATCH | `/erabiltzaileak/{id}/rola` | Admin | Rola aldatu |
| DELETE | `/erabiltzaileak/{id}` | Admin | Ezabatu |

### Kargaguneak

| Metodoa | Bidea | Baimena | Deskribapena |
|---|---|---|---|
| GET | `/kargaguneak` | Publikoa | Zerrenda; `?udalerria_id=` |
| GET | `/kargaguneak/{id}` | Publikoa | Kargagune bat |
| GET | `/kargaguneak/{id}/erreserbagarritasuna` | Publikoa | Eskuragarritasuna |
| POST | `/kargaguneak` | Manager | Sortu (201) |
| PATCH | `/kargaguneak/{id}` | Manager | Aldatu |
| PATCH | `/kargaguneak/{id}/irudia` | Manager | Irudiak aldatu |
| DELETE | `/kargaguneak/{id}` | Manager | Ezabatu |

### Karga-postuak, powerbankak eta udalerriak

| Metodoa | Bidea | Baimena | Deskribapena |
|---|---|---|---|
| GET | `/kargapostuak` | Publikoa | Zerrenda |
| POST | `/kargapostuak` | Manager | Sortu (201) |
| DELETE | `/kargapostuak/{id}` | Manager | Ezabatu |
| GET | `/powerbanks` | Publikoa | Zerrenda |
| POST | `/powerbanks` | Manager | Sortu (201) |
| PATCH | `/powerbanks/{id}` | Manager | Aldatu |
| GET | `/udalerriak` | Publikoa | Zerrenda |
| POST | `/udalerriak` | Admin | Sortu (201) |
| PATCH | `/udalerriak/{id}` | Admin | Aldatu |
| DELETE | `/udalerriak/{id}` | Admin | Ezabatu |

### Erreserbak eta QR

| Metodoa | Bidea | Baimena | Deskribapena |
|---|---|---|---|
| GET | `/erreserbak` | Saioa | Rolaren araberako zerrenda |
| GET | `/erreserbak/{id}` | Jabea/manager | Erreserba bat |
| POST | `/erreserbak` | Saioa | Sortu (201) |
| PATCH | `/erreserbak/{id}/egoera` | Jabea/manager | Egoera aldatu |
| PATCH | `/erreserbak/{id}/recoger` | Admin | Recogida markatu |
| PATCH | `/erreserbak/{id}/devolver` | Admin | Devolución |
| PATCH | `/erreserbak/{id}/itzuli` | Admin | Devolución postu jakin batean |
| DELETE | `/erreserbak/{id}` | Admin | Ezabatu |
| POST | `/qr/eskaneatu` | Admin | QR irakurri |

## 7.3 Errore-kodeak

| Kodea | Esanahia |
|---|---|
| 400 | Eskakizun baliogabea |
| 401 | Saioa behar da |
| 403 | Baimenik ez |
| 404 | Ez da aurkitu |
| 409 | Gatazka |
| 410 | Iraungita |
| 422 | Balidazio-errorea |
| 500 | Zerbitzariaren errorea |

# 8. Instalazioa eta probak

## 8.1 Baldintzak

Python ≥ 3.14, uv, PostgreSQL, Node.js/npm eta nabigatzaile modernoa.

## 8.2 Abiaraztea

```bash
# Datu-basea
createdb -U postgres alokairu_sistema

# APIa
cd api_erronka
uv run python seed.py
uv run python -m fastapi dev main.py

# Web estatikoa
cd web
python -m http.server 5500

# Angular panela
npm install
npm start
```

## 8.3 Demo erabiltzaileak

| Rola | Emaila | Pasahitza |
|---|---|---|
| Erabiltzailea | `alex@example.com` | `1234` |
| Admin orokorra | `ane@example.com` | `1234` |
| Donostiako udalerri-admin | `demo03@example.com` | `1234` |
| Zarauzko udalerri-admin | `demo04@example.com` | `1234` |
| Admin orokorra | `xabier@gmail.com` | `123` |

## 8.4 Probak

```bash
cd api_erronka
uv run python -m unittest discover -s tests -p "test_*.py"
```

16 unit test: erreserba-leihoa (8), atzerapen-karga (4) eta rolak (4).

# 9. Segurtasuna eta mugak

## 9.1 Segurtasuna

- Pasahitzak Argon2 bidez hash eginda.
- Saio-tokena `secrets.token_urlsafe(32)` bidez sortuta.
- Cookiea `HttpOnly` eta `SameSite=Lax`.
- Baimenak APIan egiaztatzen dira.
- Datu-baseak CHECK, UNIQUE eta EXCLUDE murrizketak ditu.

## 9.2 Muga nagusiak

| Gaia | Egoera |
|---|---|
| `provideHttpClient()` falta da Angularrean | Konpondu gabe |
| Datu-basearen URLa kodea | Konpondu gabe |
| Ez dago migrazio-tresnarik | `ensure_schema()` erabiltzen da |
| Saioen garbiketa automatikoa | Ez dago |
| CSRF tokena eta rate limiting | Ez dago |
| `public/favicon.ico` | Angularren lehenetsia |
| `angular-dropdown-search` | Erabili gabe |

# 10. Lizentziak

## 10.1 Proiektuaren lizentzia

Proiektua **PolyForm Noncommercial License 1.0.0** lizentziapean dago.

- Erabilera ez-komertziala doakoa da.
- Erabilera komertzialak **lizentzia ordaindua** behar du: `hola@powerbank.eus`.
- Fitxategia: `LICENSE`.

## 10.2 Irudiak

| # | Fitxategia | Egilea | Lizentzia | Iturria |
|---:|---|---|---|---|
| 1 | `Donostia-San-Sebastian-City-Hall.jpg` | Acediscovery | CC BY 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:Donostia-San-Sebastian-City-Hall.jpg) |
| 2 | `Donostia_Igeldotik.jpg` | Keta | CC BY-SA 2.5 | [Commons](https://commons.wikimedia.org/wiki/File:Donostia_Igeldotik.jpg) |
| 3 | `San_Sebastian_Donostia_Maria_Cristina_Bridge_1190559.jpg` | Ermell (Reinhold Möller) | CC BY-SA 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:San_Sebastian_Donostia_Maria_Cristina_Bridge_1190559.jpg) |
| 4 | `San_Sebastian_La_Concha-20120902-RM-125922.jpg` | Ermell (Reinhold Möller) | CC BY-SA 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:San_Sebastian_La_Concha-20120902-RM-125922.jpg) |
| 5 | `San_Sebastian_Zurriola_beach_1190579.jpg` | Ermell (Reinhold Möller) | CC BY-SA 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:San_Sebastian_Zurriola_beach_1190579.jpg) |
| 6 | `Beach_of_Zarautz_-_Mirador_de_los_Bancos,_Zarautz,_Spain_-_July_19,_2024.jpg` | Giorgio Galeotti | CC BY-SA 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:Beach_of_Zarautz_-_Mirador_de_los_Bancos,_Zarautz,_Spain_-_July_19,_2024.jpg) |
| 7 | `Playa_de_Zarautz_(23747).jpg` | Mentxuwiki | CC BY-SA 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:Playa_de_Zarautz_(23747).jpg) |
| 8 | `Zarautz_beach_from_above.jpg` | Einaz80 | CC BY-SA 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:Zarautz_beach_from_above.jpg) |
| 9 | `Zarauzko_hondartza_Torreoitik_02.jpg` | Theklan | CC BY-SA 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:Zarauzko_hondartza_Torreoitik_02.jpg) |
| 10 | `Zarautz_2023_Talaimendi.jpg` | Urkoretegi | CC BY-SA 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:Zarautz_2023_Talaimendi.jpg) |

CC BY 4.0: egilea eta lizentzia aipatu behar dira. CC BY-SA 2.5 eta 4.0: egilea eta lizentzia aipatu behar dira, eta lan eratorriak lizentzia berean partekatu.

## 10.3 Ikonoak eta liburutegiak

| Baliabidea | Lizentzia |
|---|---|
| Font Awesome Free 6.5.2 | Iconos: CC BY 4.0 · Fonts: SIL OFL 1.1 · Code: MIT |
| Bootstrap 5.3.8 | MIT |
| Leaflet 1.9.4 | BSD-2-Clause |
| qrcodejs 1.0.0 | MIT |
| html5-qrcode 2.3.8 | Apache-2.0 |
| OpenStreetMap teselak | ODbL 1.0 |
| Angular 22 | MIT |
| ng-hub-ui-paginable | MIT |
| FastAPI / SQLAlchemy / Pydantic | MIT |
| psycopg | LGPL-3.0-only |

## 10.4 Oharrak

- `web/img/flores.png` kendu zen 2026-11-04an, jatorria ezezaguna zelako.
- `public/favicon.ico` Angular CLI-ren lehenetsia da; ekoizpenerako aldatu.
- Irudiak Wikimedia Commons-etik kargatzen dira; argitaratu aurretik lizentziak berriro egiaztatzea gomendatzen da.

# 11. Ondorioak

Sistemak erabiltzaileen beharrizan nagusiak betetzen ditu: estazioak kontsultatu, erreserba egin, QR bidez jaso eta itzuli, eta administrazioa kudeatu. Arkitektura argia da eta negozio-arauak zerbitzarian zein datu-basean babestuta daude.

Bertsio honek dokumentazio osoaren laburpen sendoa ematen du, xehetasun guztiak galdu gabe. Dokumentazio osoak erreferentzia osoa eskaintzen du; bertsio laburrak, berriz, aurkezpenerako ikuspegi azkarra.
