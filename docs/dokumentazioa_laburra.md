---
title: "Powerbank Alokairu Sistema"
subtitle: "Dokumentazio laburra"
author: "Xabier Lazcoz eta Aitor Mindeguia"
date: "2026ko azaroa"
version: "1.0 · bertsio laburra"
project: "Erronka 7 · Administrazio Atala"
content_start: "Dokumentu honek Powerbank Alokairu Sistemaren funtsezko alderdiak laburbiltzen ditu"
pdf_title: "Powerbank Alokairu Sistema - Dokumentazio laburra"
---

# Laburpena

Dokumentu honek Powerbank Alokairu Sistemaren funtsezko alderdiak laburbiltzen ditu: zer den, nola dagoen antolatuta, zer funtzionalitate dituen, zer arau betetzen dituen eta nola instalatzen den. Xehetasun osoa bertsio tekniko osoan dago.

Powerbank Alokairu Sistema powerbank eramangarrien alokairua kudeatzeko aplikazioa da. Hiru interfaze ditu: erabiltzailearen web aplikazioa, administrazio-panel angularra eta taquillako QR irakurgailua. Atzean FastAPI API bat eta PostgreSQL datu-basea daude.

| Eremua | Balioa |
|---|---|
| Proiektua | Erronka 7 · Administrazio Atala |
| Egileak | Xabier Lazcoz eta Aitor Mindeguia |
| Arkitektura | Web estatikoa + Angular + FastAPI + PostgreSQL |
| Erabiltzaile motak | `user`, `udalerri_admin`, `admin` |
| Endpoint kopurua | 40 |
| Datu-baseko taulak | 7 |
| Lizentzia | PolyForm Noncommercial 1.0.0 |

# 1. Proiektuaren ikuspegi orokorra

## 1.1 Zer da?

Erabiltzaileak estazio bat aukeratzen du, powerbank bat erreserbatzen du, QR kodea jasotzen du eta taquillan eskaneatzen du. Itzultzeko, QR bera eskaneatzen du beste taquilla batean. Sistemak Donostia eta Zarautz udalerriak hartzen ditu.

## 1.2 Erabiltzaile motak

| Rola | Baimenak |
|---|---|
| `user` | Bere erreserbak sortu, ikusi eta ezeztatu; profila aldatu |
| `udalerri_admin` | Bere udalerriko kargagune, postu, powerbank eta erreserbak kudeatu |
| `admin` | Sistema osoa kudeatu |

## 1.3 Funtzio nagusiak

- Erregistroa, saioa eta profila.
- Estazioen zerrenda, bilaketa, iragazkiak eta mapa.
- Erreserba sortzea, ezeztatzea eta historiala.
- QR kodea sortu, deskargatu eta inprimatu.
- Taquillan QR bidez jaso eta itzuli.
- Administrazio-panela: erabiltzaileak, kargaguneak, postuak, powerbankak eta erreserbak.
- Udalerri bidezko baimenak eta atzerapen-kargaren kalkulua.

## 1.4 Arkitektura

<div class="arch-diagram">
  <div class="arch-row">
    <div class="arch-box">
      <strong>Erabiltzailearen web</strong>
      <span>web/ · HTML, CSS, JavaScript</span>
    </div>
    <div class="arch-box">
      <strong>Administrazio-panela</strong>
      <span>src/ · Angular 22</span>
    </div>
  </div>
  <div class="arch-arrow">HTTP/JSON · <code>session_id</code> cookie bidezko saioa</div>
  <div class="arch-box arch-box-wide">
    <strong>FastAPI APIa</strong>
    <span>Autentikazioa · baimenak · negozio-arauak · QR fluxua</span>
  </div>
  <div class="arch-arrow">SQLAlchemy · psycopg</div>
  <div class="arch-box arch-box-wide">
    <strong>PostgreSQL</strong>
    <span>alokairu_sistema · 7 taula</span>
  </div>
</div>

# 2. Teknologia eta egitura

## 2.1 Teknologia-pila

| Geruza | Teknologia |
|---|---|
| Erabiltzailearen interfazea | HTML, CSS, JavaScript, Bootstrap 5.3.8 |
| Mapa | Leaflet 1.9.4 + OpenStreetMap |
| Ikonoak | Font Awesome Free 6.5.2 |
| QR sorkuntza | qrcodejs 1.0.0 |
| QR irakurketa | html5-qrcode 2.3.8 |
| Administrazio-panela | Angular 22 + ng-hub-ui-paginable |
| APIa | FastAPI + SQLAlchemy + Pydantic |
| Datu-basea | PostgreSQL |
| Pasahitzen hash | pwdlib + Argon2 |

## 2.2 Karpetak

```text
erronka7/
├── api_erronka/     # FastAPI APIa (routers, services, models, schemas)
├── src/             # Angular administrazio-panela
├── web/             # Erabiltzailearen web estatikoa
├── docs/            # Dokumentazioa eta PDFak
├── public/          # Favicona
├── LICENSE
└── README.md
```

# 3. Datu-eredua

## 3.1 Entitateak

| Taula | Eginkizuna | Eremu nagusiak |
|---|---|---|
| `erabiltzaileak` | Erabiltzaileak eta rolak | `izena`, `login_email`, `rola`, `udalerria_id` |
| `udalerriak` | Udalerriak | `izena`, `aktiboa` |
| `kargaguneak` | Kargatzeko estazioak | `izena`, `helbidea`, `egoera`, `latitud`, `longitud` |
| `karga_postuak` | Estazioko gelaxkak | `egoera`, `tamaina`, `kargagunea_id` |
| `powerbanks` | Powerbankak | `karga_maila`, `egoera`, `karga_postua_id` |
| `erreserbak` | Alokairuak | `erabiltzailea_id`, `powerbank_id`, `hasiera/amaiera`, `egoera`, `qr_token` |
| `auth_sessions` | Saioak | `id`, `erabiltzailea_id` |

## 3.2 Erlazioak

- Udalerri batek kargaguneak eta erabiltzaileak ditu.
- Kargagune batek karga-postuak ditu.
- Karga-postu bakoitzak powerbank bat du gehienez.
- Erabiltzaile batek erreserbak ditu.
- Powerbank batek erreserbak ditu.
- Erreserba batek hasierako eta bukaerako karga-postua ditu.

## 3.3 Egoerak

| Entitatea | Balioak |
|---|---|
| Kargagunea | `erabilgarri`, `mantentze-lanetan`, `zerbitzutik-kanpo` |
| KargaPostua | `hutsa`, `kargatuta`, `kargatzen` |
| Powerbank | `erabilgarri`, `erreserbatua`, `erabiltzen`, `mantentze-lanetan`, `zerbitzutik-kanpo` |
| Erreserba | `aktiboa`, `ezeztatua`, `amaitua` |

## 3.4 Murrizketa garrantzitsuenak

- Emaila bakarra da, maiuskulaz/minuskulaz independentea.
- `udalerri_admin` rolak udalerria izan behar du.
- Karga-maila 0 eta 100 artekoa da.
- Erreserba baten amaiera hasiera baino geroagokoa da.
- Erabiltzaile bakoitzeko erreserba aktibo bakarra.
- Powerbank edo erabiltzaile berean ezin dira erreserba aktiboak gainjarri.

# 4. Funtzionalitateak eta arauak

## 4.1 Erabiltzailearen fluxua

1. Erabiltzaileak kontua sortu edo saioa hasten du.
2. Estazioa aukeratzen du zerrendan edo mapan.
3. Data eta ordua hautatzen ditu.
4. Sistemak eskuragarritasuna egiaztatzen du.
5. Erreserbak QR token bat sortzen du.
6. Erabiltzaileak QR kodea deskargatzen edo inprimatzen du.
7. Taquillan lehen eskaneatzean powerbanka jasotzen du.
8. Taquillan bigarren eskaneatzean powerbanka itzultzen du.

## 4.2 Administrazioa

- Erabiltzaileak sortu, aldatu eta ezabatu.
- Kargaguneak, karga-postuak eta powerbankak kudeatu.
- Erreserbak ikusi eta kudeatu.
- Udalerri-administratzaileak bere udalerria soilik kudeatu.
- Administratzaile orokorrak taquilla eta QR fluxua erabili.

## 4.3 QR fluxua

| Egoera | HTTP | Esanahia |
|---|---|---|
| `in_use` | 200 | Taquilla ireki da; powerbanka jaso da |
| `returned` | 200 | Powerbanka ondo itzuli da |
| `returned_late` | 200 | Atzerapenarekin itzuli da |
| `too_early` | 409 | Oraindik ez da recogida-ordua |
| `expired` | 410 | QR-a iraungi da |
| `wrong_station` | 409 | Estazio okerrean eskaneatu da |
| `no_free_locker` | 409 | Ez dago taquilla librerik |
| `cancelled` | 409 | Erreserba ezeztatuta dago |

## 4.4 Negozio-arauak

| Araua | Balioa |
|---|---|
| Erreserbaren eguna | Gaurkoa soilik |
| Gehienezko aurrerapena | 6 ordu |
| Gutxieneko iraupena | 15 minutu |
| Gehienezko iraupena | 6 ordu |
| Erreserba aktiboak | Erabiltzaile bakoitzeko bat |
| Ezeztatzea | Hasiera aurretik soilik |
| Atzerapen-karga | 5 € hasitako ordu bakoitzeko |

# 5. APIaren laburpena

## 5.1 Autentikazioa

- `session_id` cookiea, `HttpOnly` eta `SameSite=Lax`.
- Iraupena: 7 egun.
- Pasahitzak Argon2 bidez hash eginda.
- Baimenak APIan egiaztatzen dira.

## 5.2 Endpoint-ak

| Routerra | Kopurua | Bide nagusiak |
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

## 5.3 Errore-kodeak

| Kodea | Esanahia |
|---|---|
| 400 | Eskakizun baliogabea |
| 401 | Saioa behar da |
| 403 | Baimenik ez |
| 404 | Ez da aurkitu |
| 409 | Gatazka |
| 410 | Iraungita |
| 422 | Balidazio-errorea |

# 6. Instalazioa eta probak

## 6.1 Abiarazte azkarra

```bash
# Datu-basea: PostgreSQL localhost:5432, alokairu_sistema

cd api_erronka
uv run python seed.py
uv run python -m fastapi dev main.py

# Beste terminal batean:
cd web
python -m http.server 5500

# Angular panela:
npm install
npm start
```

## 6.2 Demo erabiltzaileak

| Rola | Emaila | Pasahitza |
|---|---|---|
| Erabiltzailea | `alex@example.com` | `1234` |
| Admin orokorra | `ane@example.com` | `1234` |
| Donostiako udalerri-admin | `demo03@example.com` | `1234` |
| Zarauzko udalerri-admin | `demo04@example.com` | `1234` |

## 6.3 Probak

```bash
cd api_erronka
uv run python -m unittest discover -s tests -p "test_*.py"
```

16 unit test daude: erreserba-arauak, atzerapen-karga eta rolak.

## 6.4 Segurtasuna eta mugak

- Pasahitzak Argon2 bidez hash eginda.
- Cookiea `HttpOnly` eta `SameSite=Lax`.
- Rolak eta udalerri-baimenak APIan egiaztatzen dira.
- Datu-baseak CHECK, UNIQUE eta EXCLUDE murrizketak ditu.
- Muga nagusiak: `provideHttpClient()` falta da Angularrean, datu-basearen URLa kodea dago, eta ez dago migrazio-tresnarik.

# 7. Lizentziak

## 7.1 Proiektuaren lizentzia

Proiektua **PolyForm Noncommercial License 1.0.0** lizentziapean dago.

- Erabilera ez-komertziala doakoa da.
- Erabilera komertzialak **lizentzia ordaindua** behar du: `hola@powerbank.eus`.
- Fitxategia: `LICENSE`.

## 7.2 Irudiak

| # | Fitxategia | Egilea | Lizentzia |
|---:|---|---|---|
| 1 | `Donostia-San-Sebastian-City-Hall.jpg` | Acediscovery | CC BY 4.0 |
| 2 | `Donostia_Igeldotik.jpg` | Keta | CC BY-SA 2.5 |
| 3 | `San_Sebastian_Donostia_Maria_Cristina_Bridge_1190559.jpg` | Ermell (Reinhold Möller) | CC BY-SA 4.0 |
| 4 | `San_Sebastian_La_Concha-20120902-RM-125922.jpg` | Ermell (Reinhold Möller) | CC BY-SA 4.0 |
| 5 | `San_Sebastian_Zurriola_beach_1190579.jpg` | Ermell (Reinhold Möller) | CC BY-SA 4.0 |
| 6 | `Beach_of_Zarautz_-_Mirador_de_los_Bancos,_Zarautz,_Spain_-_July_19,_2024.jpg` | Giorgio Galeotti | CC BY-SA 4.0 |
| 7 | `Playa_de_Zarautz_(23747).jpg` | Mentxuwiki | CC BY-SA 4.0 |
| 8 | `Zarautz_beach_from_above.jpg` | Einaz80 | CC BY-SA 4.0 |
| 9 | `Zarauzko_hondartza_Torreoitik_02.jpg` | Theklan | CC BY-SA 4.0 |
| 10 | `Zarautz_2023_Talaimendi.jpg` | Urkoretegi | CC BY-SA 4.0 |

Atribuzio osoa: `docs/THIRD_PARTY_NOTICES.md` eta dokumentazio osoaren A eranskina.

## 7.3 Ikonoak eta liburutegiak

| Baliabidea | Lizentzia |
|---|---|
| Font Awesome Free 6.5.2 | Iconos: CC BY 4.0 · Fonts: SIL OFL 1.1 · Code: MIT |
| Bootstrap 5.3.8 | MIT |
| Leaflet 1.9.4 | BSD-2-Clause |
| qrcodejs 1.0.0 | MIT |
| html5-qrcode 2.3.8 | Apache-2.0 |
| OpenStreetMap teselak | ODbL 1.0 |
| Angular 22 | MIT |
| FastAPI / SQLAlchemy / Pydantic | MIT |
| psycopg | LGPL-3.0-only |

## 7.4 Oharrak

- `web/img/flores.png` kendu zen 2026-11-04an, jatorria ezezaguna zelako.
- `public/favicon.ico` Angular CLI-ren lehenetsia da; ekoizpenerako aldatu.
- Irudiak Wikimedia Commons-etik kargatzen dira; argitaratu aurretik lizentziak berriro egiaztatzea gomendatzen da.

# 8. Ondorioak

Sistemak erabiltzaileen beharrizan nagusiak betetzen ditu: estazioak kontsultatu, erreserba egin, QR bidez jaso eta itzuli, eta administrazioa kudeatu. Arkitektura argia da eta negozio-arauak zerbitzarian zein datu-basean babestuta daude.

Dokumentazio osoak xehetasun guztiak biltzen ditu; dokumentu honek, berriz, ikuspegi laburra ematen du, aurkezpen eta entrega azkarretarako.
