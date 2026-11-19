"""Predicción con el modelo guardado (no reentrena)."""
import re
from dataclasses import dataclass
from functools import lru_cache

import joblib
import numpy as np

from train import MODEL_PATH, entrenar

MIN_COBERTURA_VOCAB = 0.60  # fracción mínima de palabras del texto conocidas por el modelo


@dataclass
class Resultado:
    categoria: str          # una de las cuatro categorías (la más probable)
    puntuacion: float       # margen de decisión de LinearSVC (NO es una probabilidad)
    separacion: float       # diferencia entre la 1.ª y la 2.ª clase
    cobertura: float        # fracción de palabras reconocidas
    incierta: bool
    motivo: str
    puntuaciones: dict


@lru_cache(maxsize=1)
def cargar_modelo(entrenar_si_falta=True):
    if not MODEL_PATH.exists():
        if not entrenar_si_falta:
            raise FileNotFoundError("No existe el modelo. Ejecuta: python train.py")
        entrenar(verbose=False)
    return joblib.load(MODEL_PATH)


def predecir(texto: str) -> Resultado:
    m = cargar_modelo()
    texto = " ".join(texto.split())
    if not texto:
        raise ValueError("El texto está vacío.")
    d = m["pipeline"].decision_function([texto])[0]
    orden = np.argsort(d)[::-1]
    clases = m["clases"]
    top, segundo = d[orden[0]], d[orden[1]]
    palabras = re.findall(r"\w+", texto.casefold())
    cobertura = (sum(p in m["vocab_palabras"] for p in palabras) / len(palabras)) if palabras else 0.0

    motivos = []
    if top < m["umbral_score"]:
        motivos.append("ninguna categoría obtiene una puntuación suficiente")
    if top - segundo < m["umbral_gap"]:
        motivos.append("dos categorías obtienen puntuaciones muy parecidas")
    if cobertura < MIN_COBERTURA_VOCAB:
        motivos.append("el texto contiene pocas palabras vistas durante el entrenamiento")
    return Resultado(str(clases[orden[0]]), float(top), float(top - segundo), float(cobertura),
                     bool(motivos), "; ".join(motivos),
                     {str(c): float(v) for c, v in zip(clases, d)})


if __name__ == "__main__":
    import sys
    r = predecir(" ".join(sys.argv[1:]) or "BFS explora por niveles")
    print(r)
