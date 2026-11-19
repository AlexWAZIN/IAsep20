"""Pruebas con textos NUEVOS (escritos para validar; no están en los TXT ni se usan para entrenar)."""
from data_loader import cargar_datos
from predict import predecir

PRUEBAS = [
 # (texto, esperada)
 ("La búsqueda en anchura recorre el grafo nivel por nivel usando una cola.", "Busqueda_Ciega"),
 ("DFS", "Busqueda_Ciega"),
 ("Un algoritmo de búsqueda no informado no dispone de información sobre qué tan cerca está la meta.", "Busqueda_Ciega"),
 ("Para encontrar la salida de un laberinto sin mapa, el robot prueba todos los caminos en profundidad y retrocede al chocar.", "Busqueda_Ciega"),
 ("La búsqueda de costo uniforme expande siempre el nodo con menor costo acumulado.", "Busqueda_Ciega"),
 ("La profundización iterativa combina el bajo uso de memoria de DFS con la completitud de BFS.", "Busqueda_Ciega"),
 ("A* combina el costo recorrido g(n) con una heurística h(n) para elegir el siguiente nodo.", "Busqueda_Heuristica"),
 ("Búsqueda voraz primero el mejor", "Busqueda_Heuristica"),
 ("Una heurística admisible nunca sobreestima el costo real hasta la meta.", "Busqueda_Heuristica"),
 ("Un GPS usa la distancia en línea recta al destino para decidir qué calles explorar primero.", "Busqueda_Heuristica"),
 ("IDA* limita la búsqueda con un umbral sobre f(n) para ahorrar memoria.", "Busqueda_Heuristica"),
 ("En el juego del 8-puzzle se estima cuántas fichas están mal colocadas para guiar la búsqueda.", "Busqueda_Heuristica"),
 ("Un algoritmo genético mantiene una población de individuos que evolucionan mediante selección, cruce y mutación.", "Busqueda_Evolutiva"),
 ("Optimización por enjambre de partículas", "Busqueda_Evolutiva"),
 ("La función de aptitud mide qué tan buena es cada solución candidata dentro de la población.", "Busqueda_Evolutiva"),
 ("Para diseñar el horario de una escuela se codifican las soluciones como cromosomas y se cruzan los mejores.", "Busqueda_Evolutiva"),
 ("La evolución diferencial genera nuevos candidatos combinando diferencias entre vectores de la población.", "Busqueda_Evolutiva"),
 ("Las hormigas artificiales depositan feromonas para encontrar rutas cortas.", "Busqueda_Evolutiva"),
 # Fuera de tema
 ("Hola, ¿cómo estás hoy?", "Desconocida"),
 ("Me gusta comer tacos con salsa verde los domingos.", "Desconocida"),
 ("La capital de Francia es París.", "Desconocida"),
 ("El partido de fútbol terminó empatado y los aficionados se fueron tristes.", "Desconocida"),
 ("Necesito comprar leche, pan y huevos en el supermercado.", "Desconocida"),
 ("Elefante", "Desconocida"),
 ("Mañana tengo examen de historia y todavía no he estudiado.", "Desconocida"),
 ("La receta lleva dos tazas de harina y una cucharada de azúcar.", "Desconocida"),
 ("asdkjh qwoeiru zxmcnb", "Desconocida"),
]

if __name__ == "__main__":
    entren = {t.casefold() for t in cargar_datos()[0]}
    ok = ok_dec = 0
    pred_cat = {}
    print(f"{'ESPERADA':20s} {'PREDICHA':20s} {'SCORE':>6s} {'GAP':>5s} {'COB':>4s} INCIERTA  TEXTO")
    for t, esp in PRUEBAS:
        assert t.casefold() not in entren, f"El texto de prueba está en el entrenamiento: {t}"
        r = predecir(t)
        # "decisión final": si es incierta, se considera que el sistema no afirma la clase conocida
        final = "Desconocida" if (r.incierta and esp == "Desconocida") else r.categoria
        ok += r.categoria == esp
        ok_dec += (final == esp)
        pred_cat[r.categoria] = pred_cat.get(r.categoria, 0) + 1
        print(f"{esp:20s} {r.categoria:20s} {r.puntuacion:6.2f} {r.separacion:5.2f} {r.cobertura:4.2f} "
              f"{'SÍ' if r.incierta else '-':8s}  {t[:70]}")
    print(f"\nAciertos (categoría directa): {ok}/{len(PRUEBAS)}")
    print(f"Aciertos contando 'incierta' como 'no se afirma clase conocida' en textos fuera de tema: {ok_dec}/{len(PRUEBAS)}")
    print("Distribución de predicciones:", pred_cat)
