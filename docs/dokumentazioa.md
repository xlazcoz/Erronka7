---
title: "Powerbank Alokairu Sistema"
subtitle: "Dokumentazio teknikoa eta hirugarrenen baliabideen lizentzien erregistroa"
author: "Xabier Lazcoz eta Aitor Mindeguia"
date: "2026ko azaroa"
version: "1.0"
project: "Erronka 7 · Administrazio Atala"
content_start: "Powerbank Alokairu Sistema powerbank eramangarrien alokairua kudeatzeko web aplikazioa da."
pdf_title: "Powerbank Alokairu Sistema - Dokumentazio teknikoa"
---

# Laburpena

**Powerbank Alokairu Sistema** powerbank eramangarrien alokairua kudeatzeko web aplikazioa da. Sistemak hiru interfaze nagusi eskaintzen ditu: erabiltzaile arruntentzako web aplikazioa, administrazio-panel angularra eta taquillan QR kodea irakurtzeko pantaila. Horrez gain, FastAPI bidezko API bat eta PostgreSQL datu-base bat ditu.

Dokumentu honek sistemaren arkitektura, datu-eredua, funtzionalitateak, negozio-arauak, APIaren erreferentzia, instalazioa, probak, segurtasuna eta etorkizuneko hobekuntzak biltzen ditu. Eranskin nagusian erabilitako irudien, ikonoen eta bestelako baliabideen lizentziak zehazten dira, jatorria eta erabilera-baldintzak barne.

Dokumentua **euskara**z idatzita dago. Kodeko izenak, fitxategi-izenak eta APIaren eremuak jatorrizko forman mantendu dira, bilaketa eta mantenimendua errazteko.

## Dokumentuaren mapa

| Atala | Edukia |
|---|---|
| 1–2 | Sarrera eta sistemaren ikuspegi orokorra |
| 3–4 | Biltegiko egitura eta arkitektura |
| 5 | Datu-eredua eta datu-basearen murrizketak |
| 6–7 | Funtzionalitateak eta negozio-arauak |
| 8 | APIaren erreferentzia |
| 9–10 | Instalazioa, abiaraztea eta probak |
| 11–13 | Segurtasuna, hobekuntzak eta ondorioak |
| A | Lizentziak eta hirugarrenen baliabideak |
| B–D | Glosarioa, endpoint-en laburpena eta dokumentuaren kontrola |

# 1. Sarrera

## 1.1 Helburua

Dokumentu honen helburua da Powerbank Alokairu Sistemaren funtzionamendua ulertzeko, instalatzeko, mantentzeko eta ebaluatzeko beharrezkoa den informazio osoa ematea. Dokumentua bai garatzaileentzat bai proiektuaren ebaluatzaileentzat da erabilgarria.

## 1.2 Norainokoa

Dokumentuak biltegian dagoen kodea hartzen du oinarri. Honako hauek deskribatzen dira:

- Erabiltzailearen web aplikazioa (`web/`).
- Administrazio-panela (`admin_atala/`, Angular).
- APIa (`api_erronka/`, FastAPI).
- PostgreSQL datu-basea eta haren eredua.
- QR bidezko taquilla-fluxua.
- Instalazio-, proba- eta segurtasun-alderdiak.
- Erabilitako hirugarrenen materialen lizentziak eta atribuzioak.

Dokumentuak **ez** du hartzen azpiegitura komertziala, ordainketa-pasabidea, fakturazioa edo ekoizpen-inguruneko hedapena. Horiek etorkizuneko hobekuntzen atalean aipatzen dira.

## 1.3 Terminologia-oharrak

Kodea eta datu-basea euskaraz daude nagusiki. Hala ere, zenbait termino tekniko ez dira itzuli, ohiko erabileragatik edo liburutegien APIek hala eskatzen dutelako:

- **Endpoint**: APIaren bide bat (`/erreserbak`, `/login/me`, etab.).
- **Payload**: HTTP eskaeran edo erantzunean bidaltzen den JSON edukia.
- **Cookie**: nabigatzailean gordetzen den saio-informazioa.
- **Token**: QR kodea identifikatzen duen kate bakarra.
- **Taquilla**: powerbankak gordetzeko eta kargatzeko armairua.
- **Karga-postua**: taquillaren barruko gelaxka edo puntu fisikoa.

# 2. Sistemaren ikuspegi orokorra

## 2.1 Zer da Powerbank?

Powerbank Alokairu Sistema erabiltzaileei powerbank bat alokatzea ahalbidetzen dien aplikazioa da. Erabiltzaileak estazio bat aukeratzen du, eskuragarritasunaren arabera erreserba egiten du, QR kodea jasotzen du eta taquillan eskaneatzen du powerbanka jasotzeko. Itzultzeko, QR bera eskaneatzen du beste taquilla batean.

Sistema bi udalerritan dago pentsatuta: **Donostia** eta **Zarautz**. Kargaguneak udalerri bati esleituta daude, eta udalerri-administratzaileek beren udalerriko kargaguneak soilik kudea ditzakete.

## 2.2 Erabiltzaile motak

| Rola | Kodeko balioa | Baimenak |
|---|---|---|
| Erabiltzaile arrunta | `user` | Bere erreserbak sortu, ikusi eta ezeztatu; bere profila aldatu. |
| Udalerri-administratzailea | `udalerri_admin` | Bere udalerriko kargagune, karga-postu, powerbank eta erreserbak kudeatu. |
| Administratzaile orokorra | `admin` | Sistema osoa kudeatu, erabiltzaileak, udalerriak, taquilla eta QR fluxua barne. |

Rolak datu-basean `erabiltzaileak.rola` eremuan gordetzen dira. `udalerri_admin` rolak `udalerria_id` derrigorrezkoa du, eta datu-baseak murrizketa baten bidez egiaztatzen du.

## 2.3 Funtzio nagusiak

- Erabiltzaileen erregistroa, saioa hastea eta profila kudeatzea.
- Estazioen zerrenda, bilaketa, iragazkiak eta mapa interaktiboa.
- Estazio bakoitzaren xehetasuna, argazkiak eta erreserba-formularioa.
- Erreserba sortzea, ezeztatzea eta historiala ikustea.
- QR kodea sortzea, deskargatzea eta inprimatzea.
- Taquillan QR kodea eskaneatzea: lehen irakurketa recogida, bigarrena devolución.
- Administrazio-panela: erabiltzaileak, kargaguneak, karga-postuak, powerbankak eta erreserbak.
- Udalerri bidezko iragazketa eta udalerri-administratzaileen baimen-egiaztapena.
- Atzerapen-kargaren kalkulua.

## 2.4 Arkitektura orokorra

<div class="arch-diagram">
  <div class="arch-row">
    <div class="arch-box">
      <strong>Erabiltzailearen web</strong>
      <span>web/ · HTML, CSS, JavaScript</span>
      <span>Bootstrap · Leaflet · Font Awesome</span>
    </div>
    <div class="arch-box">
      <strong>Administrazio-panela</strong>
      <span>admin_atala/ · Angular 22</span>
      <span>ng-hub-ui-paginable</span>
    </div>
  </div>
  <div class="arch-arrow">HTTP/JSON · <code>session_id</code> cookie bidezko saioa</div>
  <div class="arch-box arch-box-wide">
    <strong>FastAPI APIa</strong>
    <span>api_erronka/ · routers, services, schemas, models</span>
    <span>Autentikazioa · baimenak · negozio-arauak · QR fluxua</span>
  </div>
  <div class="arch-arrow">SQLAlchemy ORM · psycopg · PostgreSQL protokoloa</div>
  <div class="arch-box arch-box-wide">
    <strong>PostgreSQL</strong>
    <span>alokairu_sistema · 7 taula · CHECK, UNIQUE eta EXCLUDE murrizketak</span>
  </div>
</div>

Kanpo-zerbitzuak:

- **Wikimedia Commons**: estazioen argazkiak (HTTP bidez kargatzen dira).
- **OpenStreetMap**: mapako teselak.
- **jsDelivr / cdnjs**: Bootstrap, Leaflet, Font Awesome, qrcodejs eta html5-qrcode.

## 2.5 Teknologia-pila

| Geruza | Teknologia | Bertsioa | Eginkizuna |
|---|---|---|---|
| Erabiltzailearen interfazea | HTML5, CSS3, JavaScript | — | Estazioak, erreserbak, profila, taquilla |
| CSS liburutegia | Bootstrap | 5.3.8 | Diseinu-sistema eta osagaiak |
| Mapa | Leaflet | 1.9.4 | Estazioen mapa interaktiboa |
| Ikonoak | Font Awesome Free | 6.5.2 | Interfazearen ikonoak |
| QR sorkuntza | qrcodejs | 1.0.0 | Erreserbaren QR kodea marraztea |
| QR irakurketa | html5-qrcode | 2.3.8 | Taquillako kamera bidezko irakurketa |
| Administrazio-panela | Angular | 22.2 | Kudeaketa-interfazea |
| Taulak | ng-hub-ui-paginable | 22.32 | Paginazioa eta bilaketa |
| APIa | FastAPI | ≥ 0.162 | HTTP APIa eta balidazioa |
| ORM | SQLAlchemy | ≥ 2.1.6 | Datu-basearen modeloa |
| Balidazioa | Pydantic | FastAPI-rekin | Eskema eta datu-balidazioa |
| Datu-basea | PostgreSQL | — | Datuen biltegiratze iraunkorra |
| Pasahitzen hash | pwdlib + Argon2 | — | Pasahitzen segurtasuna |
| Python | CPython | ≥ 3.14 | APIaren exekuzioa |

## 2.6 Erantzukizunen banaketa

| Osagai | Arduratzen da | Ez da arduratzen |
|---|---|---|
| Web estatikoa | Erabiltzailearen esperientzia, formularioak, QR bistaratzea | Baimenak, datuen egiaztapena |
| Angular panela | Administrazioaren formularioak eta taulak | Benetako baimenak (APIak egiaztatzen ditu) |
| FastAPI | Autentikazioa, baimenak, negozio-arauak, datuen balidazioa | Interfazearen diseinua |
| PostgreSQL | Datuen iraunkortasuna, murrizketak, indizeak | Erabiltzailearen esperientzia |
| Taquilla | QR irakurketa eta emaitzaren bistaratzea | Erreserbaren egiaztapena (APIak egiten du) |

# 3. Biltegiko egitura

## 3.1 Zuhaitza

```text
erronka7/
├── api_erronka/                 # FastAPI APIa
│   ├── routers/                 # HTTP endpoint-ak
│   │   ├── erabiltzaileak.py
│   │   ├── kargaguneak.py
│   │   ├── karga_postuak.py
│   │   ├── powerbanks.py
│   │   ├── erreserbak.py
│   │   ├── login.py
│   │   ├── udalerriak.py
│   │   └── qr.py
│   ├── services/                # Negozio-logika
│   │   ├── auth.py
│   │   └── erreserbak.py
│   ├── models/models.py         # SQLAlchemy modeloak
│   ├── schemas/schemas.py       # Pydantic eskemak
│   ├── tests/                   # Unit testak
│   ├── constants.py             # Egoera-balioak eta rolak
│   ├── database.py              # Konexioa eta ensure_schema
│   ├── media.py                 # Estazioen irudien URLak
│   ├── seed.py                  # Demo datuak
│   ├── main.py                  # FastAPI aplikazioa
│   └── pyproject.toml           # Python dependentziak
├── admin_atala/                 # Angular administrazio-panela
│   ├── src/
│   │   └── app/
│   │       ├── erabiltzaileak/
│   │       ├── kargaguneak/
│   │       ├── powerbanks/
│   │       ├── erreserbak/
│   │       ├── erreserben-taula/
│   │       ├── saioa-hasi/
│   │       ├── erregistratu/
│   │       ├── taula/
│   │       ├── desplegable/
│   │       ├── services/api.ts
│   │       ├── app.routes.ts
│   │       ├── app.config.ts
│   │       └── app.ts
│   ├── public/
│   ├── angular.json
│   ├── package.json
│   └── tsconfig.json
├── web/                         # Erabiltzailearen web estatikoa
│   ├── index.html               # Hasiera (Home)
│   ├── Kargaguneak.html         # Estazioak
│   ├── Login.html
│   ├── Erreserbak.html
│   ├── Erabiltzailea.html
│   ├── puesto-Carga.html
│   ├── locker.html
│   ├── css/
│   └── js/
├── docs/                        # Dokumentazioa eta PDFa
├── public/favicon.ico
├── LICENSE
├── README.md
├── package.json
└── angular.json
```

## 3.2 Fitxategi garrantzitsuenak

| Fitxategia | Eginkizuna |
|---|---|
| `api_erronka/main.py` | FastAPI aplikazioa, CORS, routerren erregistroa eta errore-globala |
| `api_erronka/database.py` | Konexio-katea, `SessionLocal`, `ensure_schema()` |
| `api_erronka/models/models.py` | 7 taulak eta haien murrizketak |
| `api_erronka/schemas/schemas.py` | Eskakizun- eta erantzun-eskemak |
| `api_erronka/services/auth.py` | Pasahitzen hash, saioak, rolak eta baimenak |
| `api_erronka/services/erreserbak.py` | Erreserba-arauak, pickup/return, atzerapen-karga |
| `api_erronka/routers/qr.py` | Taquillako QR fluxua |
| `api_erronka/seed.py` | Demo datuak sortzea |
| `web/js/api.js` | APIaren URLaren hautaketa eta eskaeren kudeaketa |
| `web/js/reservas.js` | Erreserbak, QR sorkuntza eta ezeztapena |
| `web/js/locker.js` | Taquillako kamera eta QR irakurketa |
| `admin_atala/src/app/services/api.ts` | Angularretik APIrako deiak |

## 3.3 Konbentzioak

- Fitxategi-izenak eta kodea euskaraz daude nagusiki.
- APIaren bideak pluralak dira: `/erabiltzaileak`, `/kargaguneak`, `/powerbanks`, `/erreserbak`, `/udalerriak`.
- Datu-baseko egoerak minuskulaz eta marratxoekin idazten dira: `mantentze-lanetan`, `zerbitzutik-kanpo`.
- Data-orduak tokiko ordu-eremuan gordetzen dira (naive `datetime`), frontendak bezala.
- Erantzunak JSON formatuan ematen dira; erroreek `detail` eremua erabiltzen dute.

# 4. Arkitektura eta osagaiak

## 4.1 `web/` — erabiltzailearen web aplikazioa

Web estatikoa da: ez du konpilazio-pausorik behar, eta edozein zerbitzari estatikoekin edo Live Server-ekin ireki daiteke.

| Orria | Fitxategia | Eginkizuna |
|---|---|---|
| Hasiera | `index.html` | Webgunearen aurkezpena, estatistiken laburpena eta erreserbarako sarrera |
| Estazioak | `Kargaguneak.html` | Estazioen zerrenda, bilaketa, iragazkiak, mapa eta estatistikak |
| Saioa | `Login.html` | Saioa hasi eta erregistratu |
| Erreserbak | `Erreserbak.html` | Erabiltzailearen erreserbak, QR kodea, ezeztapena |
| Nire kontua | `Erabiltzailea.html` | Profila eta pasahitza aldatzea |
| Estazioaren xehetasuna | `puesto-Carga.html` | Argazkiak, helbidea, eskuragarritasuna eta erreserba |
| Taquilla | `locker.html` | Administratzaileentzako QR irakurgailua |

JavaScript moduluak:

| Fitxategia | Eginkizuna |
|---|---|
| `api.js` | `API_BASE_URL` hautatzen du (`localhost:5500`/`4200` → `http://host:8000`, bestela `/api`) eta `apiRequest()` eskaintzen du. |
| `auth.js` | Nabigazio-barra egokitzen du: saioa, QR lasterbidea eta taquilla-esteka. |
| `dialogos.js` | `mostrarDialogo()` eta `confirmarDialogo()` funtzioak, `dialog` elementuan oinarrituta. |
| `index.js` | Estazioak kargatu, filtratu, ordenatu eta mapan marraztu. |
| `login.js` | Saioaren eta erregistroaren formularioak, balidazioa eta pasahitzaren indarra. |
| `reservas.js` | Erreserbak erakutsi, QR sortu/deskargatu/inprimatu eta ezeztatu. |
| `user.js` | Profila eta pasahitza aldatu. |
| `puesto.js` | Estazioaren datuak, eskuragarritasuna eta erreserba sortu. |
| `locker.js` | Taquillaren estazioa gorde, kamera aktibatu eta QR tokena bidali. |

## 4.2 `admin_atala/` — Angular administrazio-panela

Angular 22ko aplikazio standalone bat da. Bideak `app.routes.ts` fitxategian daude:

| Bidea | Konponentea | Eginkizuna |
|---|---|---|
| `/erabiltzaileak` | `Erabiltzaileak` | Erabiltzaileen zerrenda eta kudeaketa |
| `/kargaguneak` | `Kargaguneak` | Kargaguneak sortu, aldatu eta ezabatu |
| `/powerbanks` | `Powerbanks` | Powerbankak sortu eta postuz aldatu |
| `/erreserbak` | `Erreserbak` | Erreserben taula |
| `/saioa-hasi` | `SaioaHasi` | Administrazioaren saioa |
| `/erregistratu` | `Erregistratu` | Erabiltzaile berria sortu |

`Api` zerbitzuak (`admin_atala/src/app/services/api.ts`) HTTP deiak biltzen ditu. Oharra: `app.config.ts` fitxategiak ez du `provideHttpClient()` deitzen; beraz, Angular aplikazioa abiaraztean `HttpClient` hornitzailea falta badaiteke. Hau etorkizuneko hobekuntzen atalean jasota dago.

## 4.3 `api_erronka/` — FastAPI zerbitzua

APIak routerren bidez antolatuta dago:

| Routerra | Prefixua | Eginkizuna |
|---|---|---|
| `login.py` | `/login` | Erregistroa, saioa, saioa ixtea, profila eta pasahitza |
| `erabiltzaileak.py` | `/erabiltzaileak` | Erabiltzaileen CRUDa eta rolak |
| `kargaguneak.py` | `/kargaguneak` | Kargaguneak eta eskuragarritasuna |
| `karga_postuak.py` | `/kargapostuak` | Karga-postuak |
| `powerbanks.py` | `/powerbanks` | Powerbankak |
| `erreserbak.py` | `/erreserbak` | Erreserbak, pickup, return eta ezabaketa |
| `udalerriak.py` | `/udalerriak` | Udalerriak |
| `qr.py` | `/qr` | Taquillako QR eskaneatzea |

Geruzak:

- **Routers**: HTTP parametroak, baimenak eta erantzunak.
- **Services**: negozio-logika (`auth.py`, `erreserbak.py`).
- **Models**: SQLAlchemy taulak eta erlazioak.
- **Schemas**: Pydantic balidazioa eta erantzun-forma.
- **Constants**: rol, egoera eta tamaina baliodunak.

## 4.4 Datu-basea

Konexio-katea `api_erronka/database.py` fitxategian dago:

```python
DATABASE_URL = "postgresql+psycopg://postgres:@localhost:5432/alokairu_sistema"
```

Kodea garapen-ingurunerako prestatu da: erabiltzailea `postgres`, pasahitzik gabe, `localhost:5432` eta `alokairu_sistema` datu-basea. Ekoizpenean, balio hauek ingurune-aldagaietatik irakurtzea gomendatzen da.

`ensure_schema()` funtzioak migrazio arina egiten du: falta diren zutabeak gehitzen ditu, datu zaharrak normalizatzen ditu, indizeak eta murrizketak sortzen ditu, eta `btree_gist` luzapena gaitzen du gainjarpenak galarazteko. Ez da migrazio-tresna bat (ez du Alembic erabiltzen); beraz, aldaketak arretaz egin behar dira.

## 4.5 Eskaera baten bizi-zikloa

1. Nabigatzaileak edo Angularrek HTTP eskaera bat bidaltzen du (`fetch` edo `HttpClient`).
2. FastAPI routerrak eskaera deserializatzen du Pydantic eskemaren bidez.
3. `Depends(get_session)` bidez SQLAlchemy saio bat sortzen da.
4. Baimenak egiaztatzen dira (`get_current_user`, `require_admin`, `require_manager`).
5. Routerrak negozio-zerbitzuak deitzen ditu edo datu-baseko kontsultak egiten ditu.
6. Emaitza Pydantic erantzun-eskeman bihurtzen da.
7. SQLAlchemy saioa itxi egiten da (`get_session` generatzailearen `finally` bidez).
8. Nabigatzaileak JSON erantzuna jasotzen du eta interfazea eguneratzen du.

## 4.6 Konfigurazioa eta ingurune-aldagaiak

| Aldagaia | Kokapena | Lehentasunezko balioa | Eginkizuna |
|---|---|---|---|
| `DATABASE_URL` | `database.py` | `postgresql+psycopg://postgres:@localhost:5432/alokairu_sistema` | Datu-basearen konexioa |
| `CORS_ORIGINS` | `main.py` | hutsa | CORS jatorri gehigarriak, komaz bereizita |
| `CORS_ORIGIN_REGEX` | `main.py` | localhost/private IP erregela | CORS jatorrien erregela |
| `COOKIE_SECURE` | `routers/login.py` | `false` | Cookiea HTTPS bidez soilik bidali |
| `API_BASE_URL` | `web/js/api.js` | automatikoa | APIaren URLaren gainidazketa |
| `port` | `web/js/api.js` | 5500/4200 | Garapen-portuen detekzioa |

# 5. Datu-eredua

## 5.1 Ereduaren ikuspegia

Sistemak 7 taula ditu:

```text
Udalerria 1 ─── N Kargagunea 1 ─── N KargaPostua 1 ─── 1 Powerbank
     │                                                        │
     │ 1                                                      │ 1
     │                                                        │
     N                                                        N
Erabiltzailea 1 ─── N Erreserba N ────────────────────────────┘
     │
     │ 1
     │
     N
AuthSession
```

Erreserbak bi karga-posturekin lotzen da: hasierakoa (recogida) eta bukaerakoa (devolución). Bi eremu horiek `karga_postuak` taularekiko FKak dira.

## 5.2 Entitateak

### 5.2.1 Erabiltzailea

Taula: `erabiltzaileak`

| Eremua | Mota | Murrizketa | Deskribapena |
|---|---|---|---|
| `id` | `INTEGER` | PK | Identifikatzailea |
| `izena` | `VARCHAR(100)` | NOT NULL | Izena |
| `abizena` | `VARCHAR(100)` | NOT NULL | Abizena |
| `login_email` | `VARCHAR(100)` | NOT NULL, indize bakarra (lower) | Saioaren emaila |
| `login_pasahitza` | `VARCHAR(255)` | NOT NULL | Argon2 hash-a |
| `rola` | `VARCHAR(100)` | NOT NULL, CHECK | `user`, `udalerri_admin`, `admin` |
| `udalerria_id` | `INTEGER` | FK → `udalerriak.id`, NULL | Udalerri-administratzailearen udalerria |

Murrizketa gehigarria: `rola = 'udalerri_admin'` bada, `udalerria_id` ezin da NULL izan.

### 5.2.2 Udalerria

Taula: `udalerriak`

| Eremua | Mota | Murrizketa | Deskribapena |
|---|---|---|---|
| `id` | `INTEGER` | PK | Identifikatzailea |
| `izena` | `VARCHAR(100)` | NOT NULL, UNIQUE | Udalerriaren izena |
| `aktiboa` | `BOOLEAN` | NOT NULL, default `true` | Udalerria aktiboa den |

### 5.2.3 Kargagunea

Taula: `kargaguneak`

| Eremua | Mota | Murrizketa | Deskribapena |
|---|---|---|---|
| `id` | `INTEGER` | PK | Identifikatzailea |
| `izena` | `VARCHAR(100)` | NOT NULL | Kargagunearen izena |
| `helbidea` | `VARCHAR(255)` | NOT NULL | Helbidea |
| `irudia1` | `VARCHAR(1000)` | NOT NULL | Lehen argazkiaren URL-a |
| `irudia2` | `VARCHAR(1000)` | NOT NULL | Bigarren argazkiaren URL-a |
| `irudia3` | `VARCHAR(1000)` | NOT NULL | Hirugarren argazkiaren URL-a |
| `egoera` | `VARCHAR(100)` | NOT NULL, CHECK | `erabilgarri`, `mantentze-lanetan`, `zerbitzutik-kanpo` |
| `udalerria_id` | `INTEGER` | FK → `udalerriak.id`, NULL | Udalerria |
| `latitud` | `DOUBLE PRECISION` | NULL, CHECK [-90, 90] | Latitudea |
| `longitud` | `DOUBLE PRECISION` | NULL, CHECK [-180, 180] | Longitudea |

### 5.2.4 KargaPostua

Taula: `karga_postuak`

| Eremua | Mota | Murrizketa | Deskribapena |
|---|---|---|---|
| `id` | `INTEGER` | PK | Identifikatzailea |
| `egoera` | `VARCHAR(100)` | NOT NULL, CHECK | `hutsa`, `kargatuta`, `kargatzen` |
| `tamaina` | `VARCHAR(100)` | NOT NULL, CHECK | `txikia`, `ertaina`, `handia`, `estandar` |
| `kargagunea_id` | `INTEGER` | FK → `kargaguneak.id`, NOT NULL, RESTRICT | Kargagunea |

### 5.2.5 Powerbank

Taula: `powerbanks`

| Eremua | Mota | Murrizketa | Deskribapena |
|---|---|---|---|
| `id` | `INTEGER` | PK | Identifikatzailea |
| `karga_maila` | `DOUBLE PRECISION` | NOT NULL, CHECK [0, 100] | Karga-maila ehunekotan |
| `egoera` | `VARCHAR(100)` | NOT NULL, CHECK | `erabilgarri`, `erreserbatua`, `erabiltzen`, `mantentze-lanetan`, `zerbitzutik-kanpo` |
| `karga_postua_id` | `INTEGER` | FK → `karga_postuak.id`, NOT NULL, UNIQUE, RESTRICT | Kokapen fisikoa |

`karga_postua_id` eremuak UNIQUE murrizketa du: karga-postu bakoitzean powerbank bat baino gehiago ezin da egon.

### 5.2.6 Erreserba

Taula: `erreserbak`

| Eremua | Mota | Murrizketa | Deskribapena |
|---|---|---|---|
| `id` | `INTEGER` | PK | Identifikatzailea |
| `erabiltzailea_id` | `INTEGER` | FK → `erabiltzaileak.id`, NOT NULL, RESTRICT | Erreserbaren jabea |
| `powerbank_id` | `INTEGER` | FK → `powerbanks.id`, NOT NULL, RESTRICT | Alokatutako powerbanka |
| `hasiera_data_ordua` | `TIMESTAMP` | NOT NULL | Recogida hasiera |
| `amaiera_data_ordua` | `TIMESTAMP` | NOT NULL | Itzultzeko muga |
| `egikaritze_data_ordua` | `TIMESTAMP` | NULL | Benetako recogida |
| `amaitze_data_ordua` | `TIMESTAMP` | NULL | Benetako devolución |
| `hasierako_karga_postua` | `INTEGER` | FK → `karga_postuak.id`, NOT NULL, RESTRICT | Recogida-postua |
| `bukaerako_karga_postua` | `INTEGER` | FK → `karga_postuak.id`, NULL, RESTRICT | Devolución-postua |
| `egoera` | `VARCHAR(100)` | NOT NULL, CHECK | `aktiboa`, `ezeztatua`, `amaitua` |
| `qr_token` | `VARCHAR(64)` | NOT NULL, UNIQUE | QR kodea identifikatzeko tokena |
| `berandu` | `BOOLEAN` | NOT NULL, default `false` | Atzerapenarekin itzuli den |
| `karga_extra` | `DOUBLE PRECISION` | NOT NULL, default `0` | Atzerapen-kargaren zenbatekoa |

Data-murrizketak:

- `amaiera_data_ordua > hasiera_data_ordua`.
- `egikaritze_data_ordua IS NULL OR egikaritze_data_ordua >= hasiera_data_ordua`.
- `amaitze_data_ordua IS NULL OR amaitze_data_ordua >= hasiera_data_ordua`.
- `amaitze_data_ordua >= egikaritze_data_ordua` (biak ez-null badira).

### 5.2.7 AuthSession

Taula: `auth_sessions`

| Eremua | Mota | Murrizketa | Deskribapena |
|---|---|---|---|
| `id` | `VARCHAR(100)` | PK | Saio-tokena (`secrets.token_urlsafe(32)`) |
| `erabiltzailea_id` | `INTEGER` | FK → `erabiltzaileak.id`, NOT NULL, CASCADE | Saioaren jabea |

## 5.3 Erlazioak

| Jatorria | Helburua | Kardinalitatea | FK | Ezabaketa |
|---|---|---|---|---|
| `Udalerria` | `Kargagunea` | 1–N | `kargaguneak.udalerria_id` | SET NULL |
| `Udalerria` | `Erabiltzailea` | 1–N | `erabiltzaileak.udalerria_id` | SET NULL |
| `Kargagunea` | `KargaPostua` | 1–N | `karga_postuak.kargagunea_id` | RESTRICT |
| `KargaPostua` | `Powerbank` | 1–1 | `powerbanks.karga_postua_id` | RESTRICT |
| `Erabiltzailea` | `Erreserba` | 1–N | `erreserbak.erabiltzailea_id` | RESTRICT |
| `Powerbank` | `Erreserba` | 1–N | `erreserbak.powerbank_id` | RESTRICT |
| `KargaPostua` | `Erreserba` (hasiera) | 1–N | `erreserbak.hasierako_karga_postua` | RESTRICT |
| `KargaPostua` | `Erreserba` (amaiera) | 1–N | `erreserbak.bukaerako_karga_postua` | RESTRICT |
| `Erabiltzailea` | `AuthSession` | 1–N | `auth_sessions.erabiltzailea_id` | CASCADE |

## 5.4 Egoera-balioak

| Entitatea | Balioak |
|---|---|
| Erabiltzailearen rola | `user`, `udalerri_admin`, `admin` |
| Kargagunea | `erabilgarri`, `mantentze-lanetan`, `zerbitzutik-kanpo` |
| KargaPostua | `hutsa`, `kargatuta`, `kargatzen` |
| KargaPostuaren tamaina | `txikia`, `ertaina`, `handia`, `estandar` |
| Powerbank | `erabilgarri`, `erreserbatua`, `erabiltzen`, `mantentze-lanetan`, `zerbitzutik-kanpo` |
| Erreserba | `aktiboa`, `ezeztatua`, `amaitua` |

## 5.5 Murrizketak eta indizeak

### CHECK murrizketak

- `erabiltzaileak_rola_check`: rola balio balioduna da.
- `erabiltzaileak_udalerri_admin_check`: udalerri-administratzaileak udalerria du.
- `kargaguneak_egoera_check`, `kargaguneak_latitud_check`, `kargaguneak_longitud_check`.
- `karga_postuak_egoera_check`, `karga_postuak_tamaina_check`.
- `powerbanks_karga_maila_check`, `powerbanks_egoera_check`.
- `erreserbak_data_tartea_check`, `erreserbak_egikaritze_data_check`, `erreserbak_amaitze_data_check`, `erreserbak_data_orden_check`, `erreserbak_egoera_check`.

### Indize bakunak

- `erabiltzaileak_login_email_uidx`: `lower(login_email)` bakarra.
- `udalerriak_izena_uidx`: udalerri-izena bakarra.
- `powerbanks_karga_postua_id_uidx`: karga-postu bakoitzeko powerbank bakarra.
- `erreserbak_qr_token_uidx`: QR token bakarra.
- `erreserbak_erabiltzaile_aktibo_uidx`: erabiltzaile bakoitzeko erreserba aktibo bakarra (indize partziala).
- `erreserbak_erabiltzailea_hasiera_idx`, `erreserbak_powerbank_hasiera_idx`: kontsulten errendimendua.

### EXCLUDE murrizketak

`btree_gist` luzapenarekin:

- `erreserbak_powerbank_gainjarpena_ez`: powerbank berean ezin dira erreserba aktiboak gainjarri.
- `erreserbak_erabiltzaile_gainjarpena_ez`: erabiltzaile berean ezin dira erreserba aktiboak gainjarri.

Murrizketa hauek datu-basean bertan betearazten dira, aplikazioaren balidazioaz gain.

## 5.6 Migrazio arina (`ensure_schema`)

`ensure_schema()` funtzioak `create_all`-en ondoren exekutatzen da. Hona hemen egiten duena:

1. `kargaguneak` taulari `udalerria_id`, `latitud` eta `longitud` zutabeak gehitzen dizkio, falta badira.
2. `erabiltzaileak` taulari `udalerria_id` gehitzen dio.
3. Datu zaharrak normalizatzen ditu: `Errenteria` → `Zarautz` (baldin eta Zarautz ez badago), udalerriak sortu, koordenatuak eta izenak eguneratu.
4. Demo udalerri-administratzaileak esleitzen ditu (`demo03` Donostia, `demo04` Zarautz).
5. Egoeren idazkera zaharrak zuzentzen ditu (`zerbitzutik kanpo` → `zerbitzutik-kanpo`, etab.).
6. `login_pasahitza` eta `helbidea` eremuen luzera handitzen du.
7. QR tokena, `berandu` eta `karga_extra` zutabeak gehitzen dizkio `erreserbak` taulari.
8. Indizeak eta CHECK/EXCLUDE murrizketak sortzen ditu.
9. `btree_gist` luzapena gaitzen du.

**Oharra:** Funtzio hau ez da migrazio-sistema bat. Aldaketak metatzen dira eta datu-basearen egoeraren arabera exekutatzen dira. Etorkizunean Alembic edo antzeko tresna bat erabiltzea gomendatzen da.

## 5.7 Seed datuak

`seed.py` fitxategiak datu-basea ezabatzen du eta demo datuak sortzen ditu:

- **11 erabiltzaile**: Alex, Ane, Demo03–Demo10 eta Xabier.
- **2 udalerri**: Donostia eta Zarautz.
- **10 kargagune**: 5 Donostian eta 5 Zarautzen.
- **21 powerbank**: karga-postuetan banatuta.
- **10 erreserba historiko** eta **1 erreserba aktibo** demo gisa.

Demo03 eta Demo04 udalerri-administratzaile bihurtzen dira. Pasahitzak: `1234` (Xabierrek `123`).

> **Kontuz:** `seed.py` exekutatzeak datu-baseko taula guztiak ezabatzen ditu. Ez erabili ekoizpen-daturik dagoen datu-basean.

# 6. Funtzionalitateak

## 6.1 Erabiltzailearen bidaia

### 6.1.1 Erregistroa eta saioa

Erabiltzaile berri batek `Login.html` orrian “Crear cuenta” aukera hautatzen du. Formularioak izena, abizena, emaila, pasahitza eta pasahitzaren errepikapena eskatzen ditu. Bezeroak balidazio hauek egiten ditu:

- Izenak gutxienez 2 karaktere izan behar ditu.
- Emailak formatu balioduna izan behar du.
- Pasahitzak gutxienez 8 karaktere izan behar ditu.
- Pasahitzaren errepikapenak bat etorri behar du.
- Erabilera-baldintzak onartu behar dira.

Zerbitzariak `POST /login/register` endpoint-a erabiltzen du. Emaila minuskulaz normalizatzen da eta Argon2 bidez hash egiten da. Emaila lehendik badago, `409` errorea itzultzen da. Erregistroa ondo amaitzen bada, bezeroak automatikoki saioa hasten du `POST /login` bidez.

Saioak `session_id` cookiean oinarritzen dira. Cookiea `HttpOnly`, `SameSite=Lax` eta 7 eguneko iraupenekoa da. `COOKIE_SECURE=true` bada, HTTPS bidez soilik bidaltzen da.

### 6.1.2 Estazioen zerrenda, bilaketa, iragazkiak eta mapa

`Kargaguneak.html` orriak `GET /kargaguneak` eta `GET /udalerriak` deitzen ditu. Emaitzekin:

- Estazioen zerrenda erakusten du.
- Estatistikak kalkulatzen ditu: estazioak, powerbank libreak, udalerriak eta sare operatiboa.
- Udalerriaren araberako iragazkia eskaintzen du.
- Testu bidezko bilaketa egiten du izenean, helbidean eta udalerrian.
- “Solo disponibles” iragazkia eta ordenatzeko aukerak eskaintzen ditu.
- Leaflet mapa marrazten du, OpenStreetMap teselak erabiliz.
- Estazio bakoitzeko markatzaileak eta popupak sortzen ditu.

Estazio baten egoera:

| Baldintza | Etiketa | Badge-a |
|---|---|---|
| `egoera = erabilgarri` eta `libres > 0` | Disponible | `pb-badge-success` |
| `egoera = erabilgarri` eta `libres = 0` | Sin stock | `pb-badge-danger` |
| `egoera = mantentze-lanetan` | Mantenimiento | `pb-badge-muted` |
| `egoera = zerbitzutik-kanpo` | Cerrada | `pb-badge-muted` |

### 6.1.3 Estazioaren xehetasuna eta erreserba

`puesto-Carga.html` orriak `GET /kargaguneak/{id}` deitzen du. Emaitzarekin argazkiak, izena, helbidea, Google Maps esteka eta uneko eskuragarritasuna erakusten ditu.

Erreserba-formularioak:

- Data eta ordua: gaurkoa soilik.
- Recogida gehienez 6 ordu aurretik.
- Devolución: gutxienez 15 minutu eta gehienez 6 ordu recogidaren ondoren.
- Eskuragarritasuna `GET /kargaguneak/{id}/erreserbagarritasuna?hasiera=...&amaiera=...` bidez egiaztatzen du.
- Erabiltzailea saioa hasita ez badago, `Login.html?next=...` orrira bidaltzen du.

Erreserba ondo sortzen bada, `POST /erreserbak` erantzunak `qr_token` bat dakar. Bezeroak `Erreserbak.html?qr={id}` orrira joaten da eta QR kodea erakusten zaio.

### 6.1.4 Nire erreserbak, QR eta ezeztapena

`Erreserbak.html` orriak `GET /login/me` deitzen du; erantzunak erabiltzailearen erreserbak dakartza. Egoerak hauek dira:

| Egoera | Etiketa | Deskribapena |
|---|---|---|
| `aktiboa`, oraindik hasi gabe | Activa | Erreserba balioduna da |
| `aktiboa`, hasita, jaso gabe | Lista para recoger | QR-a erabil daiteke |
| `aktiboa`, jaso da, epea amaitu gabe | En uso | Powerbanka erabiltzen ari da |
| `aktiboa`, jaso da, epea amaitu da | En uso · devolución pendiente | Atzerapena dago |
| `amaitua`, jaso gabe | Expirada · no recogida | Ez zen jaso |
| `amaitua`, berandu = false | Finalizada | Ondo itzuli da |
| `amaitua`, berandu = true | Devuelta con retraso | Karga extra du |
| `ezeztatua` | Cancelada | Ezeztatuta |

QR kodea `qrcodejs` bidez sortzen da. Edukia `locker.html?token={qr_token}` URL osoa da. Erabiltzaileak QR-a deskargatu (PNG) edo inprimatu dezake.

Ezeztapena `PATCH /erreserbak/{id}/egoera` bidez egiten da, `{ "egoera": "ezeztatua" }` bidalita. Erabiltzaileek powerbanka jaso aurretik ezeztatu dezakete erreserba, baita hasiera-ordua igaro ondoren ere. Administratzaile orokorrak beste egoera batzuk ere aldatu ditzake.

### 6.1.5 Profila eta pasahitza

`Erabiltzailea.html` orriak:

- `GET /login/me` bidez profila kargatzen du.
- Izena, abizena eta emaila aldatzen ditu `PATCH /login/me` bidez.
- Pasahitza aldatzen du `PATCH /login/password` bidez.
- Pasahitza aldatzean, uneko saioa ezik beste saio guztiak ezabatzen dira.

## 6.2 Administrazioaren funtzioak

### 6.2.1 Rolak eta baimenak

| Ekintza | `user` | `udalerri_admin` | `admin` |
|---|---|---|---|
| Bere profila ikusi/aldatu | Bai | Bai | Bai |
| Bere erreserbak ikusi | Bai | Bai | Bai |
| Erreserba sortu | Bai | Bai | Bai |
| Bere erreserba ezeztatu | Bai (hasiera aurretik) | Bai (hasiera aurretik) | Bai |
| Beste erreserba bat ikusi | Ez | Bere udalerria | Bai |
| Kargaguneak sortu/aldatu | Ez | Bere udalerria | Bai |
| Powerbankak kudeatu | Ez | Bere udalerria | Bai |
| Erabiltzaileak kudeatu | Ez | Ez | Bai |
| Udalerriak kudeatu | Ez | Ez | Bai |
| QR eskaneatu (taquilla) | Ez | Ez | Bai |

Baimenak APIan egiaztatzen dira beti. Angular panela ez da segurtasun-muga; interfazeak soilik errazten du lana.

### 6.2.2 Erabiltzaileen kudeaketa

Administratzaile orokorrak `GET /erabiltzaileak` bidez zerrenda osoa ikus dezake. Angularreko `Taula` konponenteak `ng-hub-ui-paginable` erabiltzen du bilaketa, ordenazioa eta paginaziorako.

Erabiltzaile bat sortzeko `POST /erabiltzaileak` erabiltzen da. Pasahitza Argon2 bidez hash egiten da. Rolak `user`, `udalerri_admin` edo `admin` izan daitezke. Udalerri-administratzaileak udalerria izan behar du.

Erabiltzaile bat ezabatzeko `DELETE /erabiltzaileak/{id}` erabiltzen da. Erabiltzaileak erreserbak baditu, `409` errorea itzultzen da.

### 6.2.3 Kargagune, karga-postu eta powerbanken kudeaketa

- Kargaguneak: `POST`, `PATCH`, `PATCH /irudia`, `DELETE`.
- Karga-postuak: `POST`, `DELETE`.
- Powerbankak: `POST`, `PATCH`.

Udalerri-administratzaileak bere udalerriko kargaguneak soilik alda ditzake. `can_manage_municipality()` funtzioak egiaztatzen du. Kargagune bat ezabatzeko, ezin du karga-posturik izan (`409`).

### 6.2.4 Erreserben kudeaketa

`GET /erreserbak` endpoint-ak:

- `admin`: erreserba guztiak.
- `udalerri_admin`: bere udalerriko estazioetako erreserbak.
- `user`: bere erreserbak.
- `propioak=true`: administratzaileak ere bere erreserbak soilik.

Administratzaileak `PATCH /erreserbak/{id}/recoger`, `/devolver` eta `/itzuli` erabil ditzake pickup eta return fluxuetarako. `DELETE /erreserbak/{id}` erreserba ezabatzen du.

## 6.3 Taquilla / QR fluxua

### 6.3.1 Lehen eskaneatzea: recogida

1. Erabiltzaileak QR kodea erakusten du.
2. Taquillako administratzaileak `locker.html` irekitzen du.
3. Lehen aldiz, estazioa aukeratu eta gorde egiten da `localStorage`-en.
4. Kamera aktibatzen da (`html5-qrcode`) edo tokena eskuz sartzen da.
5. Bezeroak `POST /qr/eskaneatu` bidaltzen du `{ token, kargagunea_id }`.
6. APIak tokena bilatzen du, estazioa egiaztatzen du eta erreserbaren egoera aztertzen du.
7. Baldintzak betetzen badira, `pickup_reservation()` deitzen da: `egikaritze_data_ordua` ezartzen da, hasierako karga-postua `hutsa` bihurtzen da eta powerbanka `erabiltzen` egoeran jartzen da.
8. Erantzunak taquillaren zenbakia eta powerbankaren zenbakia itzultzen ditu.

### 6.3.2 Bigarren eskaneatzea: devolución

1. Erabiltzaileak QR bera eskaneatzen du itzultzeko.
2. APIak `pick_return_slot()` bidez estazio horretako karga-postu huts bat bilatzen du.
3. `return_reservation()` deitzen da: powerbanka itzultzeko postura mugitzen da, `erabilgarri` bihurtzen da, postua `kargatuta` jartzen da, eta erreserba `amaitua` bihurtzen da.
4. Atzerapena badago, `berandu = true` eta `karga_extra` ezartzen dira.

### 6.3.3 Egoera-kuadroa

| `status` | HTTP | Esanahia |
|---|---|---|
| `in_use` | 200 | Taquilla ireki da; powerbanka jaso da |
| `returned` | 200 | Powerbanka ondo itzuli da |
| `returned_late` | 200 | Atzerapenarekin itzuli da; karga extra |
| `too_early` | 409 | Oraindik ez da recogida-ordua |
| `expired` | 410 | QR-a iraungi da |
| `wrong_station` | 409 | Estazio okerrean eskaneatu da |
| `no_free_locker` | 409 | Ez dago taquilla librerik |
| `cancelled` | 409 | Erreserba ezeztatuta dago |
| `already_returned` | 200 | Powerbanka lehendik itzuli da |
| `invalid` | 404 | Tokena ez da existitzen |
| `invalid_station` | 404 | Taquillaren estazioa ez da existitzen |

### 6.3.4 Atzerapen-karga

Atzerapena `calculate_late_fee()` funtzioak kalkulatzen du:

- Itzultzeko unea `amaiera_data_ordua` baino lehenago edo berdin bada: ez dago kargarik.
- Bestela, atzeratutako orduak gorantz biribiltzen dira (`math.ceil`).
- Karga: **5 € hasitako ordu bakoitzeko**.

Adibidea: 1 minutu berandu → 1 ordu → 5 €. 61 minutu berandu → 2 ordu → 10 €.

## 6.4 Dialogoak eta feedbacka

Web aplikazioak `dialog` elementuan oinarritutako `mostrarDialogo()` eta `confirmarDialogo()` funtzioak erabiltzen ditu. Hauek mezuak eta baieztapenak erakusten dituzte, `bootstrap.Modal` erabili beharrean. Angular panelean `alert()` eta `console.log()` erabiltzen dira nagusiki; hau hobetzeko puntua da.

# 7. Negozio-arauak

## 7.1 Erreserba-leihoa

`validate_reservation_window()` funtzioak arau hauek betearazten ditu:

| Araua | Balioa |
|---|---|
| Erreserbaren eguna | Gaurkoa soilik |
| Gehienezko aurrerapena | 6 ordu |
| Gutxieneko iraupena | 15 minutu |
| Gehienezko iraupena | 6 ordu |
| Iraganeko erreserbak | Ez onartu (1 minutu tolerantzia) |

Arau hauek bai bezeroan (`puesto.js`) bai zerbitzarian (`services/erreserbak.py`) egiaztatzen dira. Zerbitzariaren egiaztapena da agintaria.

## 7.2 Erabilgarritasuna

Estazio bateko powerbank libreak `free_powerbanks_query()` bidez kalkulatzen dira:

- Karga-postua estazioari dagokio.
- Karga-postua `kargatuta` dago.
- Powerbanka `erabilgarri` dago.
- Ez dago erreserba aktiborik tarte horretan powerbank horrekin.

Estazioa `erabilgarri` ez bada, `libres = 0` itzultzen da.

## 7.3 Erreserba aktibo bakarra

Erabiltzaile batek ezin du erreserba aktibo bat baino gehiago izan. Hori bi mailatan betearazten da:

- Aplikazioak `POST /erreserbak` egitean egiaztatzen du.
- Datu-baseak `erreserbak_erabiltzaile_aktibo_uidx` indize partzial bakarra du.

## 7.4 Gainjartzeak

Bi erreserba aktibok ezin dute powerbank bera edo erabiltzaile bera gainjarri. Hori `EXCLUDE USING gist` murrizketekin betearazten da:

- `erreserbak_powerbank_gainjarpena_ez`.
- `erreserbak_erabiltzaile_gainjarpena_ez`.

Horrez gain, aplikazioak gainjartzeak bilatzen ditu `POST /erreserbak` egitean.

## 7.5 Ezeztatzea

- Erabiltzaileak bere erreserba ezeztatu dezake `egoera = aktiboa` bada eta oraindik hasi ez bada.
- Erreserba hasita badago, ezin da ezeztatu; itzuli egin behar da.
- Administratzaile orokorrak erreserba aktibo bat ezeztatu dezake, baina jaso bada `409` itzultzen da.
- Ezeztatzean, hasierako karga-postua `hutsa` bazen eta powerbanka bertan bazegoen, `kargatuta` bihurtzen da (datu zaharrak konpontzeko).

## 7.6 Itzulketa eta atzerapena

`return_reservation()` funtzioak:

1. Egiaztatzen du erreserba aktiboa dela eta powerbanka jaso dela.
2. Atzerapena kalkulatzen du.
3. Powerbanka itzultzeko postura mugitzen du eta `erabilgarri` jartzen du.
4. Itzultzeko postua `kargatuta` jartzen du.
5. Hasierako postua `hutsa` uzten du, han powerbankik ez badago.
6. Erreserba `amaitua` bihurtzen du, `bukaerako_karga_postua`, `amaitze_data_ordua`, `berandu` eta `karga_extra` ezarrita.

## 7.7 Erreserbaren bizitza-zikloa

```text
                 POST /erreserbak
                        │
                        ▼
                  ┌───────────┐
                  │  aktiboa  │
                  └───────────┘
                   │        │
      QR recogida  │        │  ezeztatu
                   ▼        ▼
            ┌───────────┐  ┌────────────┐
            │  erabiltzen│  │ ezeztatua  │
            └───────────┘  └────────────┘
                   │
      QR devolución│
                   ▼
            ┌───────────┐
            │  amaitua  │
            └───────────┘
```

Erreserba bat jaso gabe epea amaitzen bada, `expire_stale_reservations()` funtzioak `amaitua` egoerara pasatzen du (no-show). Jaso den erreserba ez da automatikoki amaitzen; itzuli arte aktibo egoten da, atzerapena erregistratu ahal izateko.

# 8. APIaren erreferentzia

## 8.1 Oinarrizko URL eta autentikazioa

- Garapenean: `http://127.0.0.1:8000`.
- Web estatikotik: `web/js/api.js` fitxategiak `http://{host}:8000` erabiltzen du 5500/4200 portuetan; bestela `/api`.
- Autentikazioa: `session_id` cookiea.
- Cookiearen iraupena: 7 egun.
- Cookiearen atributuak: `HttpOnly`, `SameSite=Lax`, `Secure` aukerako `COOKIE_SECURE` bidez.

## 8.2 CORS

`main.py` fitxategiak CORS konfiguratzen du:

- Jatorri baimenduak: `http://127.0.0.1:5500`, `http://localhost:5500`, `http://localhost:4200`, `http://127.0.0.1:4200`.
- `CORS_ORIGINS` ingurune-aldagaiaren bidez jatorri gehigarriak.
- Erregela: localhost, 127.0.0.1, 192.168.x.x, 10.x.x.x eta 172.16–31.x.x.
- `allow_credentials=True`.

## 8.3 Errore-kodeak

| Kodea | Esanahia | Adibidea |
|---|---|---|
| 400 | Eskakizun baliogabea | Data-tarte okerra, pasahitz okerra |
| 401 | Saioa behar da | Cookiea falta da |
| 403 | Baimenik ez | Rolak ez du ahalmenik |
| 404 | Ez da aurkitu | IDa ez da existitzen |
| 409 | Gatazka | Emaila existitzen da, erreserba aktiboa, gainjartzea |
| 410 | Iraungita | QR-a iraungi da |
| 422 | Balidazio-errorea | Pydantic eskema okerra |
| 500 | Zerbitzariaren errorea | Espero ez den salbuespena |

`IntegrityError` bat gertatzen bada, `main.py` fitxategiak `409` erantzuten du mezu orokorrarekin.

## 8.4 Endpoint-ak

### 8.4.1 Login

| Metodoa | Bidea | Baimena | Deskribapena |
|---|---|---|---|
| POST | `/login/register` | Publikoa | Erabiltzaile berria sortu (201) |
| POST | `/login` | Publikoa | Saioa hasi eta cookiea ezarri |
| POST | `/login/logout` | Aukerakoa | Saioa itxi eta cookiea ezabatu |
| GET | `/login/me` | Saioa | Uneko erabiltzailea eta erreserbak |
| PATCH | `/login/me` | Saioa | Profila aldatu |
| PATCH | `/login/password` | Saioa | Pasahitza aldatu |

### 8.4.2 Erabiltzaileak

| Metodoa | Bidea | Baimena | Deskribapena |
|---|---|---|---|
| GET | `/erabiltzaileak` | Admin | Erabiltzaile guztiak |
| GET | `/erabiltzaileak/{id}` | Admin edo jabea | Erabiltzaile bat |
| GET | `/erabiltzaileak/{id}/erreserbak` | Admin edo jabea | Erabiltzailearen erreserbak |
| POST | `/erabiltzaileak` | Admin | Erabiltzaile berria (201) |
| PATCH | `/erabiltzaileak/{id}` | Admin | Erabiltzailea aldatu |
| PATCH | `/erabiltzaileak/{id}/rola` | Admin | Rola eta udalerria aldatu |
| DELETE | `/erabiltzaileak/{id}` | Admin | Erabiltzailea ezabatu (409 erreserbak baditu) |

### 8.4.3 Kargaguneak

| Metodoa | Bidea | Baimena | Deskribapena |
|---|---|---|---|
| GET | `/kargaguneak` | Publikoa | Kargagune guztiak; `?udalerria_id=` iragazkia |
| GET | `/kargaguneak/{id}` | Publikoa | Kargagune bat |
| GET | `/kargaguneak/{id}/erreserbagarritasuna` | Publikoa | `?hasiera=&amaiera=` tartean libre dauden powerbankak |
| POST | `/kargaguneak` | Manager | Kargagunea sortu (201) |
| PATCH | `/kargaguneak/{id}` | Manager | Kargagunea aldatu |
| PATCH | `/kargaguneak/{id}/irudia` | Manager | Irudiak aldatu |
| DELETE | `/kargaguneak/{id}` | Manager | Kargagunea ezabatu (409 postuak baditu) |

### 8.4.4 Karga-postuak

| Metodoa | Bidea | Baimena | Deskribapena |
|---|---|---|---|
| GET | `/kargapostuak` | Publikoa | Karga-postu guztiak |
| POST | `/kargapostuak` | Manager | Karga-postua sortu (201) |
| DELETE | `/kargapostuak/{id}` | Manager | Karga-postua ezabatu |

### 8.4.5 Powerbankak

| Metodoa | Bidea | Baimena | Deskribapena |
|---|---|---|---|
| GET | `/powerbanks` | Publikoa | Powerbank guztiak |
| POST | `/powerbanks` | Manager | Powerbank sortu (201) |
| PATCH | `/powerbanks/{id}` | Manager | Powerbank aldatu edo postuz mugitu |

### 8.4.6 Erreserbak

| Metodoa | Bidea | Baimena | Deskribapena |
|---|---|---|---|
| GET | `/erreserbak` | Saioa | Rolaren araberako zerrenda; `?propioak=true` |
| GET | `/erreserbak/{id}` | Jabea/manager | Erreserba bat |
| POST | `/erreserbak` | Saioa | Erreserba sortu (201) |
| PATCH | `/erreserbak/{id}/egoera` | Jabea/manager | Egoera aldatu (ezeztatu) |
| PATCH | `/erreserbak/{id}/recoger` | Admin | Recogida markatu |
| PATCH | `/erreserbak/{id}/devolver` | Admin | Devolución hasierako estazioan |
| PATCH | `/erreserbak/{id}/itzuli` | Admin | Devolución postu jakin batean |
| DELETE | `/erreserbak/{id}` | Admin | Erreserba ezabatu |

### 8.4.7 QR

| Metodoa | Bidea | Baimena | Deskribapena |
|---|---|---|---|
| POST | `/qr/eskaneatu` | Admin | Taquillan QR kodea irakurri |

### 8.4.8 Udalerriak

| Metodoa | Bidea | Baimena | Deskribapena |
|---|---|---|---|
| GET | `/udalerriak` | Publikoa | Udalerri guztiak |
| POST | `/udalerriak` | Admin | Udalerria sortu (201) |
| PATCH | `/udalerriak/{id}` | Admin | Udalerria aldatu |
| DELETE | `/udalerriak/{id}` | Admin | Udalerria ezabatu (409 kargaguneak baditu) |

### 8.4.9 Root

| Metodoa | Bidea | Baimena | Deskribapena |
|---|---|---|---|
| GET | `/` | Publikoa | Ongi etorri mezua |

## 8.5 Adibideak

### Saioa hasi

```bash
curl -i -c cookies.txt -X POST http://127.0.0.1:8000/login \
  -H "Content-Type: application/json" \
  -d '{"login_email":"alex@example.com","login_pasahitza":"1234"}'
```

### Erreserba sortu

```bash
curl -i -b cookies.txt -X POST http://127.0.0.1:8000/erreserbak \
  -H "Content-Type: application/json" \
  -d '{
    "kargagunea_id": 1,
    "hasiera_data_ordua": "2026-11-04T11:00:00",
    "amaiera_data_ordua": "2026-11-04T13:00:00"
  }'
```

### QR eskaneatu

```bash
curl -i -b cookies.txt -X POST http://127.0.0.1:8000/qr/eskaneatu \
  -H "Content-Type: application/json" \
  -d '{"token":"<32 karaktereko tokena>","kargagunea_id":1}'
```

## 8.6 OpenAPI/Swagger

FastAPI-k automatikoki sortzen ditu:

- Swagger UI: `http://127.0.0.1:8000/docs`.
- ReDoc: `http://127.0.0.1:8000/redoc`.
- OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`.

# 9. Instalazioa eta abiaraztea

## 9.1 Baldintzak

| Tresna | Bertsioa | Oharra |
|---|---|---|
| Python | ≥ 3.14 | `pyproject.toml`-en zehaztua |
| uv | Azkena | Python ingurunea eta dependentziak kudeatzeko |
| PostgreSQL | 14+ | `localhost:5432` |
| Node.js | Angular 22rekin bateragarria | Angular panelerako |
| npm | 11+ | `package.json`-en `packageManager` |
| Nabigatzailea | Modernoa | Web aplikaziorako |

## 9.2 Datu-basea

PostgreSQL instalatuta eta martxan egon behar da. Datu-basea sortzeko:

```bash
createdb -U postgres alokairu_sistema
```

Edo `psql` bidez:

```sql
CREATE DATABASE alokairu_sistema;
```

Konexio-katea `api_erronka/database.py` fitxategian alda daiteke. Ekoizpenean, ingurune-aldagai bat erabiltzea gomendatzen da.

## 9.3 APIa

```bash
cd api_erronka
uv run python -m fastapi dev main.py
```

Lehen exekuzioan `uv`-k dependentziak instalatuko ditu. APIa `http://127.0.0.1:8000` helbidean egongo da.

## 9.4 Seed

```bash
cd api_erronka
uv run python seed.py
```

> **Kontuz:** Datu-baseko taula guztiak ezabatzen ditu.

## 9.5 Web estatikoa

Aukerak:

- VS Code Live Server: `web/index.html` (Hasiera) edo `web/` → `http://localhost:5500`.
- Edozein zerbitzari estatiko: `python -m http.server 5500` `web/` karpetan.

APIa martxan egon behar da. `web/js/api.js` fitxategiak automatikoki hautatzen du `http://host:8000`.

## 9.6 Angular panela

```bash
cd admin_atala
npm install
npm start
```

Angular aplikazioa `http://localhost:4200` helbidean egongo da. APIaren CORSak 4200 portua onartzen du.

## 9.7 Demo erabiltzaileak

| Rola | Emaila | Pasahitza |
|---|---|---|
| Erabiltzailea | `alex@example.com` | `1234` |
| Administratzaile orokorra | `ane@example.com` | `1234` |
| Donostiako udalerri-administratzailea | `demo03@example.com` | `1234` |
| Zarauzko udalerri-administratzailea | `demo04@example.com` | `1234` |
| Administratzaile orokorra | `xabier@gmail.com` | `123` |

## 9.8 Arazo arruntak

| Arazoa | Ziurrenikako kausa | Konponbidea |
|---|---|---|
| `401` APIaren dei guztietan | Saio-cookiea falta da | Saioa hasi eta `credentials: "include"` erabili |
| CORS errorea | Jatorria ez dago baimenduta | `CORS_ORIGINS` gehitu edo 5500/4200 erabili |
| Datu-basearen konexio-errorea | PostgreSQL ez dago martxan | Zerbitzua abiarazi eta datu-basea sortu |
| `ModuleNotFoundError` | Dependentziak falta dira | `uv sync` edo `uv run` erabili |
| Kamera ez da irekitzen | HTTPS ez da erabiltzen | `localhost` erabili edo tokena eskuz sartu |
| Angular panela huts egiten du | `provideHttpClient()` falta da | `app.config.ts` fitxategian hornitzailea gehitu |
| Seed ondoren datuak galdu | `seed.py` suntsitzailea da | Ekoizpen-datu-basean ez exekutatu |

# 10. Probak eta kalitatea

## 10.1 Unit testak

APIak `unittest` erabiltzen du. Testak `api_erronka/tests/` karpetan daude:

| Fitxategia | Test kopurua | Estaldura |
|---|---:|---|
| `test_reservation_rules.py` | 8 | Erreserba-leihoaren balidazioa |
| `test_qr_flow.py` | 4 | Atzerapen-kargaren kalkulua |
| `test_roles.py` | 4 | Rolak eta udalerri-baimenak |
| **Guztira** | **16** | |

Exekuzioa:

```bash
cd api_erronka
uv run python -m unittest discover -s tests -p "test_*.py"
```

## 10.2 Estaldura

Testek negozio-arau kritikoak estaltzen dituzte:

- Erreserba balioduna onartzen da.
- 6 orduko iraupena onartzen da.
- Iraganeko erreserbak baztertzen dira.
- Hurrengo eguneko erreserbak baztertzen dira.
- 6 ordu baino gehiagoko aurrerapena baztertzen da.
- 6 ordu baino gehiagoko iraupena baztertzen da.
- 15 minutu baino gutxiagoko iraupena baztertzen da.
- Amaiera hasiera baino lehenagokoa bada, baztertzen da.
- Atzerapenik gabeko itzulketak ez du kargarik.
- 1 minutu berandu = 1 hasitako ordu.
- 61 minutu berandu = 2 hasitako ordu.
- Administratzaile orokorrak udalerri guztiak kudea ditzake.
- Udalerri-administratzaileak bere udalerria soilik kudea dezake.
- Udalerria gabeko udalerri-administratzaileak ezin du kudeatu.
- Erabiltzaile arruntak ezin du kudeatu.

Ez daude estalita: APIaren integrazio-testak, datu-basearen murrizketen testak, frontendaren testak eta QR fluxu osoaren testak. Horiek etorkizuneko hobekuntzak dira.

## 10.3 Eskuzko proba-checklista

- [ ] Erregistroa email berriarekin.
- [ ] Erregistroa email errepikatuarekin → `409`.
- [ ] Saioa pasahitz okerrarekin → `401`.
- [ ] Saioa ondo eta cookiea ezartzen da.
- [ ] Estazioen zerrenda eta mapa kargatzen dira.
- [ ] Udalerri-iragazkia eta bilaketa.
- [ ] Estazioaren xehetasuna eta argazkiak.
- [ ] Erreserba sortu ordu baliodun batekin.
- [ ] Erreserba sortu iraganeko orduarekin → `400`.
- [ ] Bi erreserba aktibo → `409`.
- [ ] QR kodea sortu, deskargatu eta inprimatu.
- [ ] Taquillan lehen eskaneatzea → `in_use`.
- [ ] Taquillan bigarren eskaneatzea → `returned`.
- [ ] Atzerapenarekin itzuli → `returned_late` eta karga extra.
- [ ] Estazio okerrean eskaneatu → `wrong_station`.
- [ ] Erreserba ezeztatu hasiera aurretik.
- [ ] Erreserba ezeztatzen saiatu hasi ondoren → `409`.
- [ ] Profila aldatu eta pasahitza aldatu.
- [ ] Administratzaileak erabiltzaileak, kargaguneak eta powerbankak kudeatu.
- [ ] Udalerri-administratzaileak bere udalerria soilik kudeatu.

## 10.4 Ezagututako akatsak eta mugak

| Gaia | Egoera | Eragina |
|---|---|---|
| `provideHttpClient()` falta da `app.config.ts` fitxategian | Ez da konpondu | Angular panelaren HTTP deiak huts egin dezakete |
| Datu-basearen URL finkoa kodea | Ez da konpondu | Ekoizpenean konfigurazioa zailtzen du |
| Ez dago migrazio-tresnarik | `ensure_schema()` erabiltzen da | Aldaketak arriskutsuak izan daitezke |
| `web/img/flores.png` | Kenduta | Jatorria ezezaguna zelako |
| `public/favicon.ico` | Angularren lehenetsia | Marka-ondorioak; ekoizpenerako aldatu |
| `angular-dropdown-search` | Deklaratuta, erabili gabe | Dependentzia hilik |
| Ignite UI for Angular | Ez da erabiltzen runtimean | Lizentzia duala; ez da arazorik oraingoz |
| Angular bideetan guard-ik ez | Ez da konpondu | APIak babesten du, baina UXa hobetu daiteke |
| `alert()` eta `console.log()` Angularrean | Ez da konpondu | Feedback pobreagoa |
| Kodea eta dokumentazioa ez daude banatuta argi | `LICENSE` gehitu da | Lizentzia argia da orain |

# 11. Segurtasuna

## 11.1 Pasahitzen hash

Pasahitzak `pwdlib` eta Argon2 erabiliz hash egiten dira:

```python
password_hash = PasswordHash.recommended()
```

Pasahitzak ez dira inoiz testu hutsean gordetzen. Hash-ak `login_pasahitza` eremuan gordetzen dira (`VARCHAR(255)`).

## 11.2 Saioak

- Saio-tokena `secrets.token_urlsafe(32)` bidez sortzen da.
- Cookiea `HttpOnly` da, JavaScriptek ezin du irakurri.
- `SameSite=Lax` da, CSRF arriskua murrizteko.
- `Secure` atributua `COOKIE_SECURE` bidez gaitzen da.
- Cookiearen iraupena 7 egunekoa da.
- Pasahitza aldatzean, uneko saioa ezik beste saio guztiak ezabatzen dira.

Muga: `auth_sessions` taulan ez dago saioen iraungipen-data espliziturik. Cookiea iraungitzean, saioa datu-basean geratzen da. Etorkizunean garbiketa-lana gehitu beharko litzateke.

## 11.3 Baimenak

Baimenak APIan egiaztatzen dira:

- `get_current_user()`: cookiea eta saioa baliozkoak direla.
- `require_admin()`: rola `admin` dela.
- `require_manager()`: rola `admin` edo `udalerri_admin` dela.
- `can_manage_municipality()`: udalerri-administratzaileak bere udalerria soilik kudea dezakeela.

Frontendak ez du segurtasunik ematen; soilik erabiltzailearen esperientzia hobetzen du.

## 11.4 CORS

CORSak jatorri lokalak eta sare pribatuko IPak onartzen ditu, garapena errazteko. Ekoizpenean, `CORS_ORIGINS` eta `CORS_ORIGIN_REGEX` murriztu behar dira jatorri zehatzetara.

## 11.5 Datu-basearen murrizketak

Datu-baseak berak babesten ditu:

- Rol baliodunak.
- Udalerri-administratzailearen udalerria.
- Egoera baliodunak.
- Karga-mailaren muga.
- Data-tarteen ordena.
- Powerbank bakoitzeko erreserba aktibo bakarra.
- Erabiltzaile bakoitzeko erreserba aktibo bakarra.
- Gainjarpenak EXCLUDE murrizketekin.

Honek aplikazioaren akats bat egon arren datu koherenteak mantentzen laguntzen du.

## 11.6 Arriskuak eta gomendioak

| Arriskua | Maila | Gomendioa |
|---|---|---|
| Datu-basearen kredentzialak kodea | Altua | Ingurune-aldagaietara pasa |
| CSRF tokenik ez | Ertaina | SameSite=Lax nahikoa da kasu askotan; tokena gehitu |
| Rate limiting ez | Ertaina | Login saiakuntzetan muga ezarri |
| Saioen garbiketa ez | Baxua | Iraungitako saioak ezabatzeko lana |
| CORS zabala garapenean | Baxua | Ekoizpenean murriztu |
| HTTPS ez derrigorrezkoa | Ertaina | Ekoizpenean `COOKIE_SECURE=true` eta HTTPS |
| Irudiak kanpo-zerbitzarietatik | Baxua | Kopia lokalak eta kredituak |
| Angular panelaren HTTP hornitzailea | Altua | `provideHttpClient()` gehitu |

# 12. Etorkizuneko hobekuntzak

| Lehentasuna | Hobekuntza | Eragina |
|---|---|---|
| Altua | `provideHttpClient()` gehitzea `app.config.ts` fitxategian | Angular panela funtzionala izatea |
| Altua | Datu-basearen URLa ingurune-aldagaira eramatea | Segurtasuna eta hedapena |
| Altua | `LICENSE` eta `THIRD_PARTY_NOTICES.md` mantentzea | Lizentzia-betekizuna |
| Altua | Angular bideetarako guard-ak | UXa eta segurtasun-geruza |
| Ertaina | Alembic migrazioak | Datu-basearen bilakaera segurua |
| Ertaina | APIaren integrazio-testak | Konfiantza |
| Ertaina | Rate limiting eta CSRF tokena | Segurtasuna |
| Ertaina | Saioen garbiketa automatikoa | Segurtasuna |
| Ertaina | Argazkiak lokalizatzea eta kredituen orria | Lizentzia eta erabilgarritasuna |
| Baxua | Angularreko feedback-sistema (`alert` ordez) | UXa |
| Baxua | Kode hila kentzea (`mockDatabase`, `loadServerData`) | Mantenimendua |
| Baxua | `angular-dropdown-search` kentzea | Dependentzia garbiketa |
| Baxua | Favicon propio bat | Marka |
| Baxua | Nazioartekotzea (eu/es/en) | Erabilgarritasuna |

# 13. Ondorioak

Powerbank Alokairu Sistemak erabiltzaileen beharrizan nagusiak betetzen ditu: estazioak kontsultatu, erreserba egin, QR bidez jaso eta itzuli, eta administrazioa kudeatu. Arkitektura argia da: web estatikoa, Angular panela, FastAPI APIa eta PostgreSQL datu-basea. Negozio-arauak zerbitzarian eta datu-basean bertan babestuta daude.

Dokumentazio honek sistema ulertzeko, instalatzeko eta mantentzeko beharrezkoa den informazioa ematen du. Era berean, hirugarrenen baliabideen lizentziak egiaztatu eta dokumentatu dira, legezko betebeharrak betetzeko.

Etorkizunean, lehentasunezko hobekuntzak hauek dira: Angular panelaren HTTP konfigurazioa zuzentzea, datu-basearen konfigurazioa ingurune-aldagaietara eramatea, migrazio-tresnak gehitzea eta segurtasun-neurriak indartzea.

Azkenik, lizentzien erregistroa ez da dokumentu estatiko bat: material berria gehituz gero, haren jatorria eta erabilera-baldintzak erantsi beharko dira. Dokumentu hau proiektuarekin batera eguneratu behar den tresna da.

# A eranskina. Lizentziak eta hirugarrenen baliabideak

## A.1 Lizentzia-printzipioa

Proiektuaren baldintza orokorra:

> **Erabilitako irudien, ikonoen eta bestelako baliabideen lizentziak egiaztatu beharko dira. Lizentziadun materiala erabiltzen bada, jatorria eta erabilera-baldintzak adierazi beharko dira.**

Printzipio hori betez, eranskin honek erabilitako material guztia zerrendatzen du, egilea, lizentzia, iturria eta atribuzio-testua barne. Lizentzien egiaztapena **2026ko azaroaren 4an** egin zen, Wikimedia Commons APIa eta pakete-erregistroak erabiliz. Lizentziak aldatu daitezke; beraz, argitaratu aurretik berriro egiaztatzea gomendatzen da.

## A.2 Proiektuaren lizentzia

Proiektuaren kodea eta dokumentazioa **PolyForm Noncommercial License 1.0.0** lizentziapean daude.

| Elementua | Balioa |
|---|---|
| Lizentzia | PolyForm Noncommercial License 1.0.0 |
| Copyright | © 2026 Powerbank Inc. |
| Erabilera ez-komertziala | Baimenduta |
| Erabilera komertziala | Debekatuta, lizentzia komertzial ordaindua behar da |
| Lizentzia komertziala | `hola@powerbank.eus` |
| Fitxategia | `LICENSE` |
| Lizentzia-testua | https://polyformproject.org/licenses/noncommercial/1.0.0 |

PolyForm Noncommercial lizentziak erabilera ez-komertziala soilik baimetzen du. Norbait proiektuak sortutako kodea erabili nahi badu dirua irabazteko, **lizentzia komertzial ordaindu bat** eskatu behar du. Lizentzia hau softwarearentzat diseinatuta dago, eta dokumentazioari ere aplikatzen zaio, hirugarrenen materiala salbu.

Hirugarrenen materialak bere lizentzia propioak ditu; atal hauetan zehazten dira.

## A.3 Irudiak

Proiektuak Wikimedia Commons-eko 10 argazki erabiltzen ditu estazioen aurkezpenean. Irudiak `thumb.wikimedia.org` zerbitzaritik kargatzen dira zuzenean; proiektuak ez ditu kopiak biltegiratzen.

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

### A.3.1 Baldintzak

- **CC BY 4.0**: egilea eta lizentzia aipatu behar dira. Lanaren aldaketak adieraztea gomendatzen da.
- **CC BY-SA 2.5 eta 4.0**: egilea eta lizentzia aipatu behar dira, eta lan eratorriak lizentzia berean partekatu behar dira.
- Irudiak Wikimedia Commons-en thumbnail zerbitzuaren bidez erakusten dira. Thumbnail-aren tamaina Wikimedia-k egokitzen du; proiektuak ez du irudia aldatzen.
- Irudiak ez dira PDF honetan txertatzen; PDFak soilik erreferentzia eta atribuzio-testua biltzen ditu.
- Webgunea publikoa bada, erabiltzaileentzako kreditu-orri bat gehitzea gomendatzen da.

Lizentzia-testuak:

- **CC BY 4.0**: https://creativecommons.org/licenses/by/4.0/
- **CC BY-SA 2.5**: https://creativecommons.org/licenses/by-sa/2.5/
- **CC BY-SA 4.0**: https://creativecommons.org/licenses/by-sa/4.0/

### A.3.2 Atribuzio-testuak

```text
Acediscovery, "Donostia-San-Sebastian-City-Hall", CC BY 4.0,
https://commons.wikimedia.org/wiki/File:Donostia-San-Sebastian-City-Hall.jpg

Keta, "Donostia Igeldotik", CC BY-SA 2.5,
https://commons.wikimedia.org/wiki/File:Donostia_Igeldotik.jpg

Ermell (Reinhold Möller), "San Sebastian Donostia Maria Cristina Bridge 1190559",
CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:San_Sebastian_Donostia_Maria_Cristina_Bridge_1190559.jpg

Ermell (Reinhold Möller), "San Sebastian La Concha-20120902-RM-125922",
CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:San_Sebastian_La_Concha-20120902-RM-125922.jpg

Ermell (Reinhold Möller), "San Sebastian Zurriola beach 1190579",
CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:San_Sebastian_Zurriola_beach_1190579.jpg

Giorgio Galeotti, "Beach of Zarautz - Mirador de los Bancos, Zarautz, Spain - July 19, 2024",
CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Beach_of_Zarautz_-_Mirador_de_los_Bancos,_Zarautz,_Spain_-_July_19,_2024.jpg

Mentxuwiki, "Playa de Zarautz (23747)", CC BY-SA 4.0,
https://commons.wikimedia.org/wiki/File:Playa_de_Zarautz_(23747).jpg

Einaz80, "Zarautz beach from above", CC BY-SA 4.0,
https://commons.wikimedia.org/wiki/File:Zarautz_beach_from_above.jpg

Theklan, "Zarauzko hondartza Torreoitik 02", CC BY-SA 4.0,
https://commons.wikimedia.org/wiki/File:Zarauzko_hondartza_Torreoitik_02.jpg

Urkoretegi, "Zarautz 2023 Talaimendi", CC BY-SA 4.0,
https://commons.wikimedia.org/wiki/File:Zarautz_2023_Talaimendi.jpg
```

## A.4 Ikonoak

| Baliabidea | Bertsioa | Lizentzia | Erabilera |
|---|---|---|---|
| Font Awesome Free | 6.5.2 | Iconos: CC BY 4.0 · Fonts: SIL OFL 1.1 · Code: MIT | Interfazearen ikonoak (`fa-bolt`, `fa-qrcode`, etab.) |
| Angular favicon | Angular CLI lehenetsia | Angular kodea: MIT; logoa: marka | `public/favicon.ico` |
| Unicode biderketa-zeinua | — | Ez du lizentzia berezirik | Itxi botoia |

Font Awesome atribuzio-testua:

```text
Font Awesome Free 6.5.2 by @fontawesome — https://fontawesome.com
Icons: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
Fonts: SIL OFL 1.1 — https://scripts.sil.org/OFL
Code: MIT — https://opensource.org/licenses/MIT
```

Oharra: `public/favicon.ico` Angular CLI-k sortutako fitxategi lehenetsia da. Angular kodea MIT lizentziapean dago, baina Angular logoa Google-ren marka da. Ekoizpenerako favicon propio bat erabiltzea gomendatzen da.

## A.5 CDN bidezko liburutegiak

| Liburutegia | Bertsioa | Lizentzia | Erabilera |
|---|---|---|---|
| Bootstrap | 5.3.8 | MIT | CSS eta JS osagaiak |
| Leaflet | 1.9.4 | BSD-2-Clause | Mapa interaktiboa |
| qrcodejs | 1.0.0 | MIT | QR kodea sortzea |
| html5-qrcode | 2.3.8 | Apache-2.0 | Kamera bidezko QR irakurketa |
| Font Awesome Free | 6.5.2 | CC BY 4.0 / SIL OFL 1.1 / MIT | Ikonoak |
| OpenStreetMap teselak | — | ODbL 1.0 | Mapako oinarrizko mapa |

OpenStreetMap atribuzio-testua:

```text
© OpenStreetMap contributors — https://www.openstreetmap.org/copyright
Data: Open Database License (ODbL) 1.0 — https://opendatacommons.org/licenses/odbl/
```

OpenStreetMap-en teselen erabilera-politika ere bete behar da: https://operations.osmfoundation.org/policies/tiles/

## A.6 npm dependentziak

| Paketea | Bertsioa | Lizentzia | Egoera |
|---|---|---|---|
| `@angular/*` | 22.2 | MIT | Erabilita |
| `ng-hub-ui-paginable` | 22.32 | MIT | Erabilita |
| `bootstrap` | 5.3.8 | MIT | Erabilita |
| `igniteui-angular` | 22.2.4 | Dual: MIT + komertziala | Ez da runtimean erabiltzen; CSS soilik test-konfigurazioan |
| `@igniteui/material-icons-extended` | 3.1.0 | MIT | Deklaratuta, ez da erabiltzen |
| `angular-dropdown-search` | 2.0.0 | Ez dago adierazita | Deklaratuta, ez da erabiltzen; kentzea gomendatua |
| `rxjs` | 7.8 | Apache-2.0 | Angularrek erabilita |
| `tslib` | 2.x | 0BSD | Angularrek erabilita |
| `typescript` | 6.0 | Apache-2.0 | Garapen-dependentzia |
| `vitest` | 5.0 | MIT | Garapen-dependentzia |
| `jsdom` | 30.0 | MIT | Garapen-dependentzia |
| `prettier` | 3.8 | MIT | Garapen-dependentzia |

Ignite UI for Angular: paketeak lizentzia duala du. MIT lizentzia soilik zerrendatutako konponente, direktiba eta zerbitzuetarako da; gainerakoak Infragistics lizentzia komertzialpean daude. Proiektuak ez du Ignite UI konponenterik erabiltzen runtimean; `angular.json` fitxategiko test-estiloetan soilik agertzen da. Etorkizunean erabiltzekotan, lizentzia komertziala beharrezkoa izan daiteke.

## A.7 Python dependentziak

| Paketea | Bertsioa | Lizentzia | Erabilera |
|---|---|---|---|
| FastAPI | ≥ 0.162 | MIT | APIa |
| SQLAlchemy | ≥ 2.1.6 | MIT | ORM |
| psycopg | ≥ 3.3.6 | LGPL-3.0-only | PostgreSQL driverra |
| pwdlib | ≥ 0.3 | MIT | Pasahitzen hash |
| argon2-cffi | ≥ 25.1 | MIT | Argon2 algoritmoa |
| uvicorn | ≥ 0.54 | BSD-3-Clause | ASGI zerbitzaria |
| Pydantic | ≥ 2.14 | MIT | Balidazioa |
| PostgreSQL | 14+ | PostgreSQL License | Datu-basea |
| Python | ≥ 3.14 | PSF License | Exekuzio-ingurunea |

Oharra: `psycopg` LGPL-3.0 lizentziapean dago. Banaketetan, lizentzia-testua eta egile-oharrak mantendu behar dira. LGPLak ez du proiektu osoa LGPL bihurtzen, baina baldintza batzuk bete behar dira.

## A.8 Beste baliabide batzuk

| Baliabidea | Egoera | Oharra |
|---|---|---|
| `web/img/flores.png` | **Kenduta** (2026-11-04) | Jatorria eta lizentzia ezezagunak zirenez, ez da proiektuan mantendu |
| `public/favicon.ico` | Mantenduta | Angular CLI lehenetsia; ekoizpenerako aldatu |
| PDFko tipografiak | Sistema-tipografiak | Segoe UI, Arial eta Consolas; ez dira PDFan txertatzen |
| Dokumentuaren testua | Originala | PolyForm Noncommercial 1.0.0 pean |

`web/img/flores.png` fitxategia ezabatua izan da. Ez dago erreferentzia gehiagorik kodean. Etorkizunean irudi bat gehituz gero, haren jatorria, egilea eta lizentzia dokumentatu beharko dira.

## A.9 Egoera eta ekintzak

| Gaia | Egoera | Ekintza |
|---|---|---|
| 10 Wikimedia irudiak | Egiaztatuta | Atribuzio-testuak mantendu |
| Font Awesome | Egiaztatuta | Atribuzio-testua mantendu |
| OpenStreetMap | Egiaztatuta | Mapan atribuzioa dago |
| Bootstrap / Leaflet / qrcodejs / html5-qrcode | Egiaztatuta | Ez da ekintzarik behar |
| Proiektuaren lizentzia | Erabakita | PolyForm Noncommercial 1.0.0; `LICENSE` fitxategia sortu da |
| `flores.png` | Kenduta | Ez da ekintzarik behar |
| `favicon.ico` | Pendiente | Favicon propio bat sortu |
| `angular-dropdown-search` | Pendiente | Kendu edo lizentzia egiaztatu |
| Ignite UI | Pendiente | Erabilera berrikusi; komertziala bada, lizentzia |
| Irudiak lokalizatzea | Gomendatua | Kreditu-orria gehitu |

## A.10 Gomendioak

1. Mantendu `LICENSE` eta `THIRD_PARTY_NOTICES.md` biltegian.
2. Argitaratu aurretik, berriro egiaztatu Wikimedia irudien lizentziak.
3. Webgunean kreditu-orri bat gehitu, erabiltzaileek atribuzioak ikus ditzaten.
4. Ekoizpenean, kopiatu irudiak zerbitzari lokalera eta mantendu atribuzioak.
5. Kendu erabili gabeko dependentziak (`angular-dropdown-search`) edo egiaztatu haien lizentziak.
6. Ez erabili Ignite UI komertziala den konponenterik lizentzia egokirik gabe.
7. Favicon propioa sortu, Angular marka saihesteko.
8. Dokumentazioa eguneratu material berria gehituz gero.

# B eranskina. Glosarioa

| Terminoa | Azalpena | Gaztelania | Ingelesa |
|---|---|---|---|
| Kargagunea | Powerbankak mailegatzeko estazioa | Estación de carga | Charging station |
| Karga-postua | Estazioaren barruko gelaxka | Puesto de carga | Charging slot |
| Powerbank | Eramangarria den bateria kanpoko gailua | Batería externa | Power bank |
| Erreserba | Powerbank bat alokatzeko eskubidea | Reserva | Reservation |
| Taquilla | Powerbankak gordetzeko armairua | Taquilla | Locker |
| QR tokena | Erreserba identifikatzen duen katea | Token QR | QR token |
| Recogida | Powerbankaren jasoera | Recogida | Pickup |
| Devolución | Powerbankaren itzulera | Devolución | Return |
| Atzerapena | Epea gainditzea | Retraso | Delay |
| Karga extra | Atzerapenagatiko karga | Cargo extra | Late fee |
| Udalerria | Herria edo udalerria | Municipio | Municipality |
| Udalerri-administratzailea | Udalerri bateko kudeatzailea | Administrador municipal | Municipal admin |
| Administratzaile orokorra | Sistema osoaren kudeatzailea | Administrador general | General admin |
| Endpoint | APIaren bide bat | Endpoint | Endpoint |
| Cookie | Nabigatzaileko saio-informazioa | Cookie | Cookie |
| Hash | Pasahitzaren aztarna kriptografikoa | Hash | Hash |
| CORS | Jatorri gurutzatuen baliabideen partekatzea | CORS | CORS |
| Seed | Demo datuak sortzeko scripta | Semilla | Seed |
| Migrazioa | Datu-basearen egitura-aldaketa | Migración | Migration |

# C eranskina. Endpoint-en laburpena

| Routerra | Endpoint kopurua | Bide nagusiak |
|---|---:|---|
| `/login` | 6 | `register`, `login`, `logout`, `me`, `password` |
| `/erabiltzaileak` | 7 | CRUD, rola, erreserbak |
| `/kargaguneak` | 7 | CRUD, irudiak, eskuragarritasuna |
| `/kargapostuak` | 3 | Zerrenda, sortu, ezabatu |
| `/powerbanks` | 3 | Zerrenda, sortu, aldatu |
| `/erreserbak` | 8 | CRUD, egoera, recoger, devolver, itzuli |
| `/qr` | 1 | `eskaneatu` |
| `/udalerriak` | 4 | CRUD |
| `/` | 1 | Ongi etorri mezua |
| **Guztira** | **40** | |

# D eranskina. Dokumentuaren kontrola

| Eremua | Balioa |
|---|---|
| Izenburua | Powerbank Alokairu Sistema — Dokumentazio teknikoa |
| Egileak | Xabier Lazcoz eta Aitor Mindeguia |
| Bertsioa | 1.0 |
| Data | 2026ko azaroa |
| Proiektua | Erronka 7 · Administrazio Atala |
| Hizkuntza | Euskara |
| Formatua | Markdown → HTML → PDF (A4) |
| PDFaren sorgailua | Playwright + Chrome/Edge |
| Lizentziak egiaztatze-data | 2026-11-04 |
| Dokumentuaren lizentzia | PolyForm Noncommercial 1.0.0 |

## Aldaketen historiala

| Bertsioa | Data | Aldaketa |
|---|---|---|
| 1.0 | 2026-11-04 | Dokumentazio osoa sortu, lizentziak egiaztatu eta PDFa sortu |

## Oharrak

- Dokumentua euskaraz idatzita dago; kode-izenak eta APIaren eremuak jatorrizko forman mantendu dira.
- Irudiak ez dira PDFan txertatu; kanpo-estekak eta atribuzioak baino ez dira sartu.
- Lizentzien informazioa 2026-11-04an egiaztatu zen. Argitaratu aurretik berriro egiaztatzea gomendatzen da.
- Dokumentu hau ez da aholku juridikoa; lizentzia-betekizunak betetzeko gida da.
