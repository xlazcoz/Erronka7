# Changelog

Formatu hau [Keep a Changelog](https://keepachangelog.com/eu/1.1.0/) estandarrean oinarritzen da.

## [1.0.0] - 2026-11-06

### Gehitua

- Lege-informazioa (`web/legala.html`): aviso legal, pribatutasuna, cookieak eta baldintzak.
- Laguntza-zentroa (`web/Laguntza.html`) ohiko galdera eta kontaktuarekin.
- 404 orria, favicon SVG, manifest, `robots.txt` eta `sitemap.xml`.
- Open Graph / Twitter meta etiketak eta `web/assets/og-image.png`.
- `.env.example` eta konfigurazio-modulu zentralizatua (`api_erronka/config.py`).
- Saio-hasieraren abiadura-muga (`api_erronka/services/rate_limit.py`).
- Irudien igoeren balioztatzea magic bytes eta tamaina-mugarekin (`api_erronka/services/uploads.py`).
- Segurtasun-cabeceras eta `/health` osasun-egiaztapena APIan.
- Saioen zerbitzari-aldeko iraungitzea (`SESSION_MAX_AGE_SECONDS`).
- Docker Compose, nginx konfigurazioa eta CI workflow-a.
- Administrazio-panelaren 401 interceptorra.
- Test berriak segurtasun-zerbitzuetarako.
- Alembic migrazioak eta `bootstrap_database()` (baseline + irudi lokaletarako migrazioa).
- APIaren integrazio-testak PostgreSQL-rekin eta CIko Postgres zerbitzua.
- Ruff, ESLint eta Prettier konfigurazioak eta CI egiaztapenak.
- Header/footer partialak eta `web/scripts/sync-layout.js` sinkronizazio-scripta.
- Kargaguneen irudi lokalak WebP formatuan (`docs/optimize_station_images.py`).

### Aldatuta

- CORS produkzioan jatorri esplizituetara mugatzen da.
- Cookieak `Secure` eta `Path=/` atributuekin ezartzen dira.
- APIaren Swagger metadatuak eta dokumentazioaren aktibazio/desaktibazioa konfiguragarria.
- Footerretako esteka hildakoak benetako orrietara aldatu dira.
- `base.css`-ri skip-link, foku-visible eta akordeoi estiloak gehitu zaizkio.

### Konpondua

- `.env` fitxategiak git-etik baztertuta.
- Irudi maltzurren igoera (HTML/SVG) eragotzita.
