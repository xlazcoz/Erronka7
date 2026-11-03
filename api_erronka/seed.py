from datetime import datetime, timedelta
from database import SessionLocal, engine
from models.models import Base, Erabiltzailea, Kargagunea, KargaPostua, Powerbank, Erreserba
from services.auth import hash_password


def poblar_base_de_datos():
    Base.metadata.create_all(engine)
    session = SessionLocal()

    try:
        print("Insertando datos de prueba...")

        # 1. Crear Usuarios de prueba
        u1 = Erabiltzailea(
            izena="Alex",
            abizena="Johnson",
            login_email="alex@example.com",
            login_pasahitza=hash_password("1234"),
            rola="user"
        )
        u2 = Erabiltzailea(
            izena="Ane",
            abizena="Garmendia",
            login_email="ane@example.com",
            login_pasahitza=hash_password("1234"),
            rola="admin"
        )
        session.add_all([u1, u2])
        session.commit()

        # 2. Crear Kargaguneak (Estaciones)
        k1 = Kargagunea(
            izena="Kargagunea Zubieta",
            helbidea="Zubieta Plaza, 1",
            irudia1="https://upload.wikimedia.org/wikipedia/commons/d/de/El_Peine_del_Viento_en_Donostia-San_Sebasti%C3%A1n.jpg",
            irudia2="https://i.pinimg.com/736x/81/67/1b/81671be0a66a32abe4442b902d5b2455.jpg",
            irudia3="https://i.pinimg.com/736x/70/59/c9/7059c9b99717f630694c4f8a4320d003.jpg",
            egoera="erabilgarri"
        )
        k2 = Kargagunea(
            izena="Kargagunea Donostia Centrico",
            helbidea="Askatasunaren Hiribidea, 15",
            irudia1="https://i.pinimg.com/736x/70/59/c9/7059c9b99717f630694c4f8a4320d003.jpg",
            irudia2="https://upload.wikimedia.org/wikipedia/commons/d/de/El_Peine_del_Viento_en_Donostia-San_Sebasti%C3%A1n.jpg",
            irudia3="https://i.pinimg.com/736x/81/67/1b/81671be0a66a32abe4442b902d5b2455.jpg",
            egoera="erabilgarri"
        )
        session.add_all([k1, k2])
        session.commit()


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


if __name__ == "__main__":
    poblar_base_de_datos()