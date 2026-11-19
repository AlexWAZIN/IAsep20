"""Entrenamiento: TF-IDF (palabras + caracteres) + LinearSVC balanceado."""
import json
import sys
from pathlib import Path

import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import (accuracy_score, classification_report, confusion_matrix,
                             precision_recall_fscore_support)
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.svm import LinearSVC

from data_loader import cargar_datos

MODEL_DIR = Path(__file__).parent / "model"
MODEL_PATH = MODEL_DIR / "modelo_busqueda.joblib"
SEED = 42
CLASES = ["Busqueda_Ciega", "Busqueda_Heuristica", "Busqueda_Evolutiva", "Desconocida"]


def crear_pipeline():
    features = FeatureUnion([
        ("palabras", TfidfVectorizer(lowercase=True, ngram_range=(1, 2), sublinear_tf=True,
                                     strip_accents=None, min_df=2)),
        ("caracteres", TfidfVectorizer(lowercase=True, analyzer="char_wb", ngram_range=(3, 5),
                                       sublinear_tf=True, min_df=2)),
    ])
    # C bajo = más regularización (menos sobreajuste); class_weight compensa el desbalance
    clf = LinearSVC(C=0.5, class_weight="balanced", random_state=SEED)
    return Pipeline([("tfidf", features), ("clf", clf)])


def _scores(pipe, textos):
    return pipe.decision_function(textos)


def entrenar(verbose=True):
    textos, etiquetas, grupos, resumen = cargar_datos(verbose=verbose)
    X = np.array(textos, dtype=object)
    y = np.array(etiquetas)
    g = np.array(grupos)
    MODEL_DIR.mkdir(exist_ok=True)

    # --- 1) Hold-out 80/20 por GRUPOS (casi-duplicados nunca cruzan train/test) ---
    # StratifiedGroupKFold reparte las clases (incl. Desconocida) de forma equilibrada
    # entre pliegues sin partir nunca un grupo; el primer pliegue (~20 %) es el hold-out.
    tr, te = next(StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=SEED).split(X, y, g))
    assert not set(g[tr]) & set(g[te]), "Fuga de datos: grupos compartidos"
    assert not set(X[tr]) & set(X[te]), "Fuga de datos: textos compartidos"
    pipe = crear_pipeline().fit(X[tr], y[tr])
    pred = pipe.predict(X[te])
    acc = accuracy_score(y[te], pred)
    p, r, f, _ = precision_recall_fscore_support(y[te], pred, labels=CLASES, average="macro",
                                                 zero_division=0)
    cm = confusion_matrix(y[te], pred, labels=CLASES)
    informe_holdout = classification_report(y[te], pred, labels=CLASES, zero_division=0,
                                            digits=3)

    # --- 2) Validación cruzada agrupada y estratificada (puntuaciones fuera de muestra) ---
    skf = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=SEED)
    oof_pred = np.empty(len(y), dtype=object)
    oof_max = np.zeros(len(y))
    oof_gap = np.zeros(len(y))
    for a, b in skf.split(X, y, g):
        m = crear_pipeline().fit(X[a], y[a])
        d = _scores(m, X[b])
        ordenado = np.sort(d, axis=1)
        oof_pred[b] = m.classes_[d.argmax(axis=1)]
        oof_max[b] = ordenado[:, -1]
        oof_gap[b] = ordenado[:, -1] - ordenado[:, -2]
    acc_cv = accuracy_score(y, oof_pred)
    cm_cv = confusion_matrix(y, oof_pred, labels=CLASES)
    informe_cv = classification_report(y, oof_pred, labels=CLASES, zero_division=0, digits=3)

    # --- 3) Umbrales de incertidumbre a partir de las puntuaciones fuera de muestra ---
    # Se toma el percentil 5 de las puntuaciones de los aciertos: así ~95 % de los textos
    # bien clasificados fuera de muestra no se marcan como inciertos.
    ok = oof_pred == y
    umbral_score = float(np.percentile(oof_max[ok], 5))
    umbral_gap = float(np.percentile(oof_gap[ok], 5))

    # --- 4) Modelo final: se reentrena con TODOS los datos y se guarda ---
    final = crear_pipeline().fit(X, y)
    vocab = set(final.named_steps["tfidf"].transformer_list[0][1].vocabulary_.keys())
    joblib.dump({"pipeline": final, "clases": list(final.classes_),
                 "umbral_score": umbral_score, "umbral_gap": umbral_gap,
                 "vocab_palabras": vocab}, MODEL_PATH)

    metricas = {
        "ejemplos": {e: resumen[e] for e in CLASES},
        "holdout": {"accuracy": acc, "precision_macro": p, "recall_macro": r, "f1_macro": f,
                    "n_test": int(len(te)), "matriz_confusion": cm.tolist(), "clases": CLASES},
        "cv_agrupada_5": {"accuracy": acc_cv, "matriz_confusion": cm_cv.tolist()},
        "umbral_score": umbral_score, "umbral_gap": umbral_gap,
    }
    (MODEL_DIR / "metricas.json").write_text(json.dumps(metricas, indent=2, ensure_ascii=False),
                                             encoding="utf-8")
    _guardar_matriz(cm, cm_cv)
    if verbose:
        print("\n=== HOLD-OUT (80/20 por grupos) ===")
        print(f"accuracy={acc:.3f} precision_macro={p:.3f} recall_macro={r:.3f} f1_macro={f:.3f}")
        print(informe_holdout)
        print("Matriz de confusión (filas=real, columnas=predicho):", CLASES)
        print(cm)
        print("\n=== VALIDACIÓN CRUZADA AGRUPADA (5 pliegues) ===")
        print(f"accuracy={acc_cv:.3f}")
        print(informe_cv)
        print(cm_cv)
        print(f"\nUmbrales: puntuación mínima={umbral_score:.3f}, separación mínima={umbral_gap:.3f}")
        print("Modelo guardado en", MODEL_PATH)
    return metricas


def _guardar_matriz(cm, cm_cv):
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        return
    fig, axs = plt.subplots(1, 2, figsize=(12, 5))
    for ax, m, t in zip(axs, (cm, cm_cv), ("Hold-out 20 %", "Validación cruzada (5)")):
        ax.imshow(m, cmap="Blues")
        ax.set_xticks(range(4)); ax.set_yticks(range(4))
        ax.set_xticklabels([c.replace("Busqueda_", "") for c in CLASES], rotation=30)
        ax.set_yticklabels([c.replace("Busqueda_", "") for c in CLASES])
        ax.set_xlabel("Predicho"); ax.set_ylabel("Real"); ax.set_title(t)
        for i in range(4):
            for j in range(4):
                ax.text(j, i, m[i, j], ha="center", va="center",
                        color="white" if m[i, j] > m.max() / 2 else "black")
    fig.tight_layout()
    fig.savefig(MODEL_DIR / "matriz_confusion.png", dpi=130)


if __name__ == "__main__":
    entrenar()
