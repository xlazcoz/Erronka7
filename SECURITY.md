# Segurtasun-politika

## Bertsio onartuak

Segurtasun-konponketak azken `main` adarrean eta azken argitaratutako bertsioan
aplikatzen dira.

## Ahultasun bat jakinaraztea

Mesedez, **ez** ireki issue publiko bat ahultasun bat aurkitu baduzu.
Idatzi `hola@powerbank.eus` helbidera eta sartu:

- Arazoaren deskribapena eta eragina.
- Erreproduzitzeko urratsak (baimendutako ingurune batean).
- Kaltetutako bertsioa edo commit-a.
- Ahal bada, konponketa-proposamena.

24 orduko epean jasoko duzu erantzuna eta 90 eguneko epean konponketa
argitaratzeko konpromisoa hartzen dugu, larritasunaren arabera.

## Praktika onak

- Ez igo `.env` fitxategirik ezta sekreturik biltegira.
- Erabili pasahitz sendoak eta `COOKIE_SECURE=true` produkzioan.
- Mantendu `uv.lock` eta `package-lock.json` eguneratuta.
- Exekutatu testak eta build-a PR bakoitzean (CIak automatikoki egiten du).
