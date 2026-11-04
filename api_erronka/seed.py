from datetime import datetime, timedelta

from database import SessionLocal, engine
from media import IRUDIAK
from models.models import Base, Erabiltzailea, Erreserba, KargaPostua, Kargagunea, Powerbank, Udalerria
from services.auth import hash_password

ERABILTZAILEAK = [
    ("Alex", "Johnson", "alex@example.com", "user"),
    ("Ane", "Garmendia", "ane@example.com", "admin"),
] + [
    (f"Demo {number:02}", "Erabiltzailea", f"demo{number:02}@example.com", "user")
    for number in range(3, 11)
]

ESTACIONES = [
    ("Kargagunea Zubieta", "Zubieta Plaza, 1", "erabilgarri", "Donostia", 43.3078, -1.9566, [
        ("kargatuta", 100), ("kargatuta", 80), ("hutsa", None),
        ("kargatuta", 45), ("kargatzen", 60), ("kargatuta", 100),
    ]),
    ("Kargagunea Donostia Centrico", "Askatasunaren Hiribidea, 15", "erabilgarri", "Donostia", 43.3210, -1.9850, [
        ("hutsa", None), ("hutsa", None),
    ]),
    ("Kargagunea Easo", "Easo Kalea, 10", "erabilgarri", "Donostia", 43.3195, -1.9830, [
        ("kargatuta", 100), ("kargatuta", 60), ("hutsa", None), ("kargatuta", 75),
    ]),
    ("Kargagunea Urbieta", "Urbieta Kalea, 25", "mantentze-lanetan", "Donostia", 43.3170, -1.9820, [
        ("kargatuta", 90), ("kargatuta", 50), ("hutsa", None),
    ]),
    ("Kargagunea Gros", "Gros Kalea, 5", "zerbitzutik-kanpo", "Donostia", 43.3240, -1.9760, [
        ("kargatzen", 10), ("kargatuta", 100), ("hutsa", None),
    ]),
    ("Kargagunea Zarautz Antiguo", "Antiguo Auzoa, 12", "erabilgarri", "Zarautz", 43.2845, -2.1695, [
        ("kargatuta", 80), ("hutsa", None),
    ]),
    ("Kargagunea Zarautz Amara", "Amara Kalea, 8", "mantentze-lanetan", "Zarautz", 43.2820, -2.1720, [
        ("hutsa", None), ("hutsa", None),
    ]),
    ("Kargagunea Zarautz Egia", "Egia Kalea, 20", "zerbitzutik-kanpo", "Zarautz", 43.2860, -2.1660, [
        ("kargatuta", 100), ("kargatuta", 100), ("hutsa", None), ("kargatuta", 35),
    ]),
    ("Kargagunea Zarautz Aiete", "Aiete Pasealekua, 3", "erabilgarri", "Zarautz", 43.2800, -2.1740, [
        ("kargatuta", 50), ("kargatuta", 80), ("kargatuta", 100),
        ("hutsa", None), ("hutsa", None),
    ]),
    ("Kargagunea Zarautz Intxaurrondo", "Intxaurrondo Kalea, 14", "erabilgarri", "Zarautz", 43.2880, -2.1640, [
        ("kargatuta", 70), ("kargatuta", 30), ("hutsa", None),
    ]),
]


def poblar_base_de_datos():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)

    with SessionLocal.begin() as session:
        user_ids = []
        for izena, abizena, email, rola in ERABILTZAILEAK:
            erabiltzailea = Erabiltzailea(
                izena=izena,
                abizena=abizena,
                login_email=email,
                login_pasahitza=hash_password("1234"),
                rola=rola,
            )
            session.add(erabiltzailea)
            session.flush()
            user_ids.append(erabiltzailea.id)

        udalerriak = {}
        for izena in ("Donostia", "Zarautz"):
            udalerria = Udalerria(izena=izena, aktiboa=True)
            session.add(udalerria)
            session.flush()
            udalerriak[izena] = udalerria

        # Udalerri-administratzaile demoak.
        demo_donostia = session.get(Erabiltzailea, user_ids[2])
        demo_donostia.rola = "udalerri_admin"
        demo_donostia.udalerria_id = udalerriak["Donostia"].id

        demo_zarautz = session.get(Erabiltzailea, user_ids[3])
        demo_zarautz.rola = "udalerri_admin"
        demo_zarautz.udalerria_id = udalerriak["Zarautz"].id

        powerbank_slots = []
        for number, (name, address, status, udalerria_izena, latitud, longitud, docks) in enumerate(ESTACIONES, start=1):
            station = Kargagunea(
                izena=name,
                helbidea=address,
                irudia1=IRUDIAK[(number - 1) % len(IRUDIAK)],
                irudia2=IRUDIAK[number % len(IRUDIAK)],
                irudia3=IRUDIAK[(number + 1) % len(IRUDIAK)],
                egoera=status,
                udalerria_id=udalerriak[udalerria_izena].id,
                latitud=latitud,
                longitud=longitud,
            )
            session.add(station)
            session.flush()
            for dock_number, (dock_status, charge) in enumerate(docks):
                slot = KargaPostua(
                    egoera=dock_status,
                    tamaina=("txikia", "ertaina", "handia")[dock_number % 3],
                    kargagunea_id=station.id,
                )
                session.add(slot)
                session.flush()
                if charge is not None:
                    powerbank = Powerbank(
                        karga_maila=charge,
                        egoera="erabilgarri",
                        karga_postua_id=slot.id,
                    )
                    session.add(powerbank)
                    session.flush()
                    powerbank_slots.append((powerbank.id, slot.id))

        now = datetime.now()

        # Erreserba historikoak.
        for number, (powerbank_id, slot_id) in enumerate(powerbank_slots[:10]):
            start = now - timedelta(days=30 - number)
            end = start + timedelta(hours=2)
            session.add(Erreserba(
                erabiltzailea_id=user_ids[number % len(user_ids)],
                powerbank_id=powerbank_id,
                hasiera_data_ordua=start,
                amaiera_data_ordua=end,
                egikaritze_data_ordua=start,
                amaitze_data_ordua=end,
                hasierako_karga_postua=slot_id,
                bukaerako_karga_postua=slot_id,
                egoera="amaitua",
            ))

        # Demo-erreserba aktibo bat, gaur bertan.
        if powerbank_slots:
            powerbank_id, slot_id = powerbank_slots[0]
            start = now + timedelta(hours=1)
            end = start + timedelta(hours=2)
            session.add(Erreserba(
                erabiltzailea_id=user_ids[0],
                powerbank_id=powerbank_id,
                hasiera_data_ordua=start,
                amaiera_data_ordua=end,
                egikaritze_data_ordua=start,
                amaitze_data_ordua=end,
                hasierako_karga_postua=slot_id,
                bukaerako_karga_postua=None,
                egoera="aktiboa",
            ))

    print("Seed completado: usuarios, estaciones, puestos, powerbanks y reservas.")


if __name__ == "__main__":
    poblar_base_de_datos()
