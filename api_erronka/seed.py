from datetime import datetime, timedelta

from database import SessionLocal, engine
from models.models import Base, Erabiltzailea, Erreserba, KargaPostua, Kargagunea, Powerbank
from services.auth import hash_password


IRUDIAK = [
    "https://upload.wikimedia.org/wikipedia/commons/d/de/El_Peine_del_Viento_en_Donostia-San_Sebasti%C3%A1n.jpg",
    "https://i.pinimg.com/736x/81/67/1b/81671be0a66a32abe4442b902d5b2455.jpg",
    "https://i.pinimg.com/736x/70/59/c9/7059c9b99717f630694c4f8a4320d003.jpg",
]

ERABILTZAILEAK = [
    ("Alex", "Johnson", "alex@example.com", "user"),
    ("Ane", "Garmendia", "ane@example.com", "admin"),
] + [
    (f"Demo {number:02}", "Erabiltzailea", f"demo{number:02}@example.com", "user")
    for number in range(3, 11)
]

ESTACIONES = [
    ("Kargagunea Zubieta", "Zubieta Plaza, 1", "erabilgarri", [
        ("kargatuta", 100), ("kargatuta", 80), ("hutsa", None),
        ("kargatuta", 45), ("kargatzen", 60), ("kargatuta", 100),
    ]),
    ("Kargagunea Donostia Centrico", "Askatasunaren Hiribidea, 15", "erabilgarri", [
        ("hutsa", None), ("hutsa", None),
    ]),
    ("Kargagunea Demo 03", "Easo Kalea, 10", "erabilgarri", [
        ("kargatuta", 100), ("kargatuta", 60), ("hutsa", None), ("kargatuta", 75),
    ]),
    ("Kargagunea Demo 04", "Urbieta Kalea, 25", "mantentze-lanetan", [
        ("kargatuta", 90), ("kargatuta", 50), ("hutsa", None),
    ]),
    ("Kargagunea Demo 05", "Gros Kalea, 5", "zerbitzutik kanpo", [
        ("kargatzen", 10), ("kargatuta", 100), ("hutsa", None),
    ]),
    ("Kargagunea Demo 06", "Antiguo Auzoa, 12", "erabilgarri", [
        ("kargatuta", 80), ("hutsa", None),
    ]),
    ("Kargagunea Demo 07", "Amara Kalea, 8", "mantentze-lanetan", [
        ("hutsa", None), ("hutsa", None),
    ]),
    ("Kargagunea Demo 08", "Egia Kalea, 20", "zerbitzutik kanpo", [
        ("kargatuta", 100), ("kargatuta", 100), ("hutsa", None), ("kargatuta", 35),
    ]),
    ("Kargagunea Demo 09", "Aiete Pasealekua, 3", "erabilgarri", [
        ("kargatuta", 50), ("kargatuta", 80), ("kargatuta", 100),
        ("hutsa", None), ("hutsa", None),
    ]),
    ("Kargagunea Demo 10", "Intxaurrondo Kalea, 14", "erabilgarri", [
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

        powerbank_slots = []
        for number, (name, address, status, docks) in enumerate(ESTACIONES, start=1):
            station = Kargagunea(
                izena=name,
                helbidea=address,
                irudia1=IRUDIAK[(number - 1) % len(IRUDIAK)],
                irudia2=IRUDIAK[number % len(IRUDIAK)],
                irudia3=IRUDIAK[(number + 1) % len(IRUDIAK)],
                egoera=status,
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

<<<<<<< HEAD

        p1 = KargaPostua(egoera="kargatuta", kargagunea_id=k1.id)
        p2 = KargaPostua(egoera="kargatuta", kargagunea_id=k1.id)
        p3 = KargaPostua(egoera="hutsa", kargagunea_id=k2.id)
        p4 = KargaPostua(egoera="kargatuta", kargagunea_id=k2.id)
        session.add_all([p1, p2, p3, p4])
        session.commit()


        pb1 = Powerbank( karga_postua_id=p1.id)
        pb2 = Powerbank(karga_postua_id=p2.id)
        pb3 = Powerbank(karga_postua_id=p4.id)
        session.add_all([pb1, pb2, pb3])
        session.commit()


        ahora = datetime.now()
        r1 = Erreserba(
            erabiltzailea_id=u1.id,
            powerbank_id=pb1.id,
            hasiera_data_ordua=ahora,
            amaiera_data_ordua=ahora + timedelta(hours=2),
            egikaritze_data_ordua=ahora,
            amaitze_data_ordua=ahora + timedelta(hours=2),
            hasierako_karga_postua=p1.id,
            bukaerako_karga_postua=None,
            egoera="aktiboa"
        )
        r2 = Erreserba(
            erabiltzailea_id=u1.id,
            powerbank_id=pb2.id,
            hasiera_data_ordua=ahora - timedelta(days=2),
            amaiera_data_ordua=ahora - timedelta(days=2, hours=-2),
            egikaritze_data_ordua=ahora - timedelta(days=2),
            amaitze_data_ordua=ahora - timedelta(days=2, hours=-2),
            hasierako_karga_postua=p2.id,
            bukaerako_karga_postua=p2.id,
            egoera="amaitua"
        )
        session.add_all([r1, r2])
        session.commit()

        print("Base de datos poblada con exito.")

    except Exception as e:
        session.rollback()
        print("Error al insertar datos:", e)
    finally:
        session.close()
=======
    print("Seed completado: al menos 10 usuarios, estaciones, puestos, powerbanks y reservas.")
>>>>>>> 001dfbaca6c83cdcd9ebdb2ae22cecb2f594d55b


if __name__ == "__main__":
    poblar_base_de_datos()
