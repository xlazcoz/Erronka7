# Laguntzeko gida

## Ingurunea prestatu

1. Kopiatu `.env.example` → `.env` eta bete balioak.
2. Instalatu APIaren mendekotasunak:

   ```bash
   cd api_erronka
   uv sync
   ```

3. Instalatu administrazio-panelaren mendekotasunak:

   ```bash
   cd admin_atala
   npm ci
   ```

## Testak eta egiaztapenak

```bash
# API
cd api_erronka
uv run python -m unittest discover -s tests -p "test_*.py" -v

# Angular build
cd admin_atala
npm run build
```

## Estiloa

- **Python:** 4 zuriune, `snake_case` eta mota-annotazioak ahal denean.
- **TypeScript/Angular:** Prettier konfigurazioa (`admin_atala/.prettierrc`).
- **HTML/CSS/JS:** 2 zuriune, `camelCase` JavaScript-en eta CSS klaseak `pb-` aurrizkiarekin.
- Mantendu erabiltzailearentzako testuak euskaraz.

## Pull request

- Deskribatu aldaketa eta eragin-eremua.
- Gehitu testak portaera berrirako.
- Ziurtatu CIak pasatzen duela.
- Ez sartu sekreturik, `.env` fitxategirik ezta datu pertsonalik.
