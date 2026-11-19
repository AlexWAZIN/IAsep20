"""Carga y limpieza de los cuatro archivos TXT de entrenamiento."""
import re
import unicodedata
from collections import Counter
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"

ARCHIVOS = {
    "Busqueda_Ciega": "Busqueda_Ciega_Dataset.txt",
    "Busqueda_Heuristica": "Busqueda_Heuristica_Dataset.txt",
    "Busqueda_Evolutiva": "Busqueda_Evolutiva_Dataset.txt",
    "Desconocida": "ml_for_kids_250_textos.txt",
}

# Encabezados que no son ejemplos: "=== X ===", "--- X ---", "DEFINICIONES:" ...
_RE_ENCABEZADO = re.compile(r"^(===.*|---.*|[A-ZÁÉÍÓÚÑ ]+:)$")
_RE_ESPACIOS = re.compile(r"\s+")
_RE_PREFIJOS_FIJOS = re.compile(
    r"^(cabe destacar que|conviene tener presente que|es importante recordar que|"
    r"si alguien pregunta .*?(se puede )?responder que)\s+", re.IGNORECASE)


def _normalizar(linea: str) -> str:
    return _RE_ESPACIOS.sub(" ", unicodedata.normalize("NFC", linea)).strip()


def _clave_exacta(texto: str) -> str:
    return texto.casefold()


def _prefijo(texto: str):
    """Texto antes de la primera coma/dos puntos si es corto (posible prefijo plantilla)."""
    m = re.match(r"^([^,:]{3,60})[,:]\s", texto)
    return m.group(1).casefold() if m else None


def _clave_grupo(texto: str, prefijos_plantilla: set) -> str:
    """Clave que agrupa casi-duplicados (misma frase con distinto prefijo / número).
    Se usa SOLO para dividir train/test sin fuga de datos; no altera los textos."""
    t = texto
    p = _prefijo(t)
    if p in prefijos_plantilla:
        t = re.sub(r"^[^,:]+[,:]\s*", "", t)
    t = _RE_PREFIJOS_FIJOS.sub("", t)
    t = t.casefold()
    t = re.sub(r"\d+([.,]\d+)?", "#", t)
    t = re.sub(r"[^\wáéíóúñü#]+", " ", t)
    return _RE_ESPACIOS.sub(" ", t).strip()


def cargar_datos(data_dir: Path = DATA_DIR, verbose: bool = False):
    """Devuelve (textos, etiquetas, grupos, resumen)."""
    por_clase = {}
    resumen = {}
    for etiqueta, nombre in ARCHIVOS.items():
        ruta = Path(data_dir) / nombre
        if not ruta.exists():
            raise FileNotFoundError(f"Falta el archivo de datos: {ruta}")
        with open(ruta, encoding="utf-8-sig") as f:
            crudas = [_normalizar(l) for l in f]
        vistos, limpias = set(), []
        n_cab = 0
        for l in crudas:
            if not l:
                continue
            if _RE_ENCABEZADO.match(l):
                n_cab += 1
                continue
            k = _clave_exacta(l)
            if k in vistos:
                continue
            vistos.add(k)
            limpias.append(l)
        por_clase[etiqueta] = limpias
        resumen[etiqueta] = {"lineas_archivo": len(crudas), "encabezados": n_cab,
                             "ejemplos_unicos": len(limpias)}

    # Un texto no puede pertenecer a dos clases: si ocurre, se descarta de todas.
    conteo = Counter(_clave_exacta(t) for ts in por_clase.values() for t in ts)
    comunes = {k for k, c in conteo.items() if c > 1}
    if comunes:
        for e in por_clase:
            por_clase[e] = [t for t in por_clase[e] if _clave_exacta(t) not in comunes]
    resumen["_textos_en_varias_clases_descartados"] = len(comunes)

    # Prefijos plantilla = prefijos que se repiten muchas veces en el corpus
    cont_pref = Counter(p for ts in por_clase.values() for p in map(_prefijo, ts) if p)
    prefijos = {p for p, c in cont_pref.items() if c >= 8}

    textos, etiquetas, grupos = [], [], []
    for e, ts in por_clase.items():
        for t in ts:
            textos.append(t)
            etiquetas.append(e)
            grupos.append(e + "|" + _clave_grupo(t, prefijos))
    for e in ARCHIVOS:
        resumen[e]["grupos_distintos"] = len({g for g, y in zip(grupos, etiquetas) if y == e})
    if verbose:
        for e in ARCHIVOS:
            print(f"{e:22s} {resumen[e]}")
    return textos, etiquetas, grupos, resumen


if __name__ == "__main__":
    x, y, g, r = cargar_datos(verbose=True)
    print("Total:", len(x), "| grupos:", len(set(g)))
