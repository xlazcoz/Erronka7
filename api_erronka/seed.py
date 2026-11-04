from datetime import datetime, timedelta

from database import SessionLocal, engine
from models.models import Base, Erabiltzailea, Erreserba, KargaPostua, Kargagunea, Powerbank, Udalerria
from services.auth import hash_password


IRUDIAK = [
    "https://upload.wikimedia.org/wikipedia/commons/d/de/El_Peine_del_Viento_en_Donostia-San_Sebasti%C3%A1n.jpg",
    "https://i.pinimg.com/736x/81/67/1b/81671be0a66a32abe4442b902d5b2455.jpg",
    "https://i.pinimg.com/736x/70/59/c9/7059c9b99717f630694c4f8a4320d003.jpg",
]

UDALERRIAK = ["Donostia", "Bilbo"]

ERABILTZAILEAK = [
    ("Alex", "Johnson", "alex@example.com", "user", None),
    ("Ane", "Garmendia", "ane@example.com", "admin", "Donostia"),
    ("Gorka", "Bilbao", "gorka@example.com", "admin", "Bilbo"),
    ("Sistema", "Admin", "superadmin@example.com", "superadmin", None),
] + [
    (f"Demo {number:02}", "Erabiltzailea", f"demo{number:02}@example.com", "user", None)
    for number in range(3, 11)
]

ESTAZIOAK = [
    ("Kargagunea Zubieta", "Zubieta Plaza, 1", "Donostia", 43.2925, -1.9735, "Erabilgarri", [
        ("kargatuta", 100), ("kargatuta", 80), ("hutsa", None),
        ("kargatuta", 45), ("kargatzen", 60), ("kargatuta", 100),
    ]),
    ("Kargagunea Donostia Centrico", "Askatasunaren Hiribidea, 15", "Donostia", 43.3208, -1.9812, "Erabilgarri", [
        ("hutsa", None), ("hutsa", None),
    ]),
    ("Kargagunea Demo 03", "Easo Kalea, 10", "Donostia", 43.3189, -1.9778, "Erabilgarri", [
        ("kargatuta", 100), ("kargatuta", 60), ("hutsa", None), ("kargatuta", 75),
    ]),
    ("Kargagunea Demo 04", "Urbieta Kalea, 25", "Donostia", 43.3202, -1.9822, "Mantentze-lanetan", [
        ("kargatuta", 90), ("kargatuta", 50), ("hutsa", None),
    ]),
    ("Kargagunea Demo 05", "Gros Kalea, 5", "Donostia", 43.3235, -1.9760, "Zerbitzutik kanpo", [
        ("kargatzen", 10), ("kargatuta", 100), ("hutsa", None),
    ]),
    ("Kargagunea Demo 06", "Antiguo Auzoa, 12", "Donostia", 43.3150, -1.9940, "Erabilgarri", [
        ("kargatuta", 80), ("hutsa", None),
    ]),
    ("Kargagunea Demo 07", "Abando Indalecio Prieto, 8", "Bilbo", 43.2630, -2.9350, "Mantentze-lanetan", [
        ("hutsa", None), ("hutsa", None),
    ]),
    ("Kargagunea Demo 08", "Gran Via, 20", "Bilbo", 43.2570, -2.9240, "Zerbitzutik kanpo", [
        ("kargatuta", 100), ("kargatuta", 100), ("hutsa", None), ("kargatuta", 35),
    ]),
    ("Kargagunea Demo 09", "Casco Viejo, 3", "Bilbo", 43.2670, -2.9410, "Erabilgarri", [
        ("kargatuta", 50), ("kargatuta", 80), ("kargatuta", 100),
        ("hutsa", None), ("hutsa", None),
    ]),
    ("Kargagunea Demo 10", "Deusto, 14", "Bilbo", 43.2520, -2.9290, "Erabilgarri", [
        ("kargatuta", 70), ("kargatuta", 30), ("hutsa", None),
    ]),
]


def poblar_base_de_datos():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)

    with SessionLocal.begin() as session:
        udalerriak = {}
        for udalerria_izena in UDALERRIAK:
            udalerria = Udalerria(izena=udalerria_izena, aktiboa=True)
            session.add(udalerria)
            session.flush()
            udalerriak[udalerria_izena] = udalerria

        user_ids = []
        for izena, abizena, email, rola, udalerria_izena in ERABILTZAILEAK:
            udalerria = udalerriak.get(udalerria_izena) if udalerria_izena else None
            erabiltzailea = Erabiltzailea(
                izena=izena,
                abizena=abizena,
                login_email=email,
                login_pasahitza=hash_password("1234"),
                rola=rola,
                udalerria_id=udalerria.id if udalerria else None,
            )
            session.add(erabiltzailea)
            session.flush()
            user_ids.append(erabiltzailea.id)

        powerbank_slots = []
        for number, (
            name,
            address,
            udalerria_izena,
            latitude,
            longitude,
            status,
            docks,
        ) in enumerate(ESTAZIOAK, start=1):
            station = Kargagunea(
                izena=name,
                helbidea=address,
                irudia1=IRUDIAK[(number - 1) % len(IRUDIAK)],
                irudia2=IRUDIAK[number % len(IRUDIAK)],
                irudia3=IRUDIAK[(number + 1) % len(IRUDIAK)],
                egoera=status,
                udalerria_id=udalerriak[udalerria_izena].id,
                latitude=latitude,
                longitude=longitude,
            )
            session.add(station)
            session.flush()
            for dock_status, charge in docks:
                slot = KargaPostua(
                    egoera=dock_status,
                    kargagunea_id=station.id,
                )
                session.add(slot)
                session.flush()
                if charge is not None:
                    powerbank = Powerbank(
                        karga_maila=charge,
                        karga_postua_id=slot.id,
                    )
                    session.add(powerbank)
                    session.flush()
                    powerbank_slots.append((powerbank.id, slot.id))

        now = datetime.now()
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

    print("Seed completado: udalerriak, usuarios, kargaguneak, karga postuak, powerbanks y erreserbak.")


if __name__ == "__main__":
    poblar_base_de_datos()
