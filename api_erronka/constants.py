"""Datu-basean eta APIan erabiltzen diren balio baliodunak."""

ROLAK = ("user", "udalerri_admin", "admin")

KARGAGUNEA_EGOERAK = (
    "erabilgarri",
    "mantentze-lanetan",
    "zerbitzutik-kanpo",
)

KARGA_POSTUA_EGOERAK = (
    "hutsa",
    "kargatuta",
    "kargatzen",
)

KARGA_POSTU_TAMAINAK = (
    "txikia",
    "ertaina",
    "handia",
    "estandar",
)

POWERBANK_EGOERAK = (
    "erabilgarri",
    "erreserbatua",
    "erabiltzen",
    "mantentze-lanetan",
    "zerbitzutik-kanpo",
)

ERRESERBA_EGOERAK = (
    "aktiboa",
    "ezeztatua",
    "amaitua",
)


def sql_balioak(balioak: tuple[str, ...]) -> str:
    """SQL CHECK murrizketetarako balioen zerrenda sortzen du."""
    return ", ".join(f"'{balioa}'" for balioa in balioak)
