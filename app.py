from flask import Flask, render_template

app = Flask(__name__)

# ---------------------------------------------------------------------------
# Datos: el glosario vive directamente en el código (sin base de datos).
# Mapeo directo a cada archivo de imagen correspondiente dentro de /static/
# ---------------------------------------------------------------------------
glosario = [
    {
        "id": 1,
        "termino": "IA (Inteligencia Artificial)",
        "definicion": "Es una rama de la informática dedicada a crear sistemas capaces de realizar tareas que habitualmente requieren inteligencia humana. Abarca desde la lógica simbólica tradicional hasta los modelos avanzados actuales, permitiendo a las máquinas razonar, tomar decisiones y resolver problemas complejos.",
        "imagen": "iagen.jpeg"
    },
    {
        "id": 2,
        "termino": "Machine Learning (Aprendizaje Automático)",
        "definicion": "Es el enfoque dominante de la IA basado en algoritmos que detectan patrones dentro de volúmenes de datos. En lugar de ser programadas explícitamente con reglas fijas, las máquinas 'aprenden' mediante la experiencia para realizar predicciones y mejorar su precisión de manera autónoma con el tiempo.",
        "imagen": "machinel.jpeg"
    },
    {
        "id": 3,
        "termino": "Deep Learning (Aprendizaje Profundo)",
        "definicion": "Subcampo del Machine Learning inspirado en el funcionamiento del cerebro humano. Utiliza redes neuronales artificiales profundas (con múltiples capas interconectadas) para procesar datos no estructurados como imágenes, audio o texto, siendo la tecnología clave detrás de los mayores avances recientes en IA.",
        "imagen": "deepp.jpeg"
    },
    {
        "id": 4,
        "termino": "Natural Language Processing (NLP / Procesamiento del Lenguaje Natural)",
        "definicion": "Especialidad de la IA enfocada en la interacción entre computadoras y el lenguaje humano. Combina lingüística y modelos de cómputo para lograr que los sistemas procesen, comprendan, interpreten y generen texto o habla de forma contextual y fluida.",
        "imagen": "natural.png"
    },
    {
        "id": 5,
        "termino": "Computer Vision (Visión por Computadora)",
        "definicion": "Disciplina que capacita a las máquinas para extraer información útil y tomar decisiones a partir de imágenes digitales, videos e insumos visuales. Se aplica en vehículos autónomos, diagnóstico por imágenes médicas y sistemas de reconocimiento facial.",
        "imagen": "computervi.webp"
    },
    {
        "id": 6,
        "termino": "Generative AI (IA Generativa)",
        "definicion": "Modelos de IA diseñados para crear contenido original (texto, imágenes, código, audio o video) a partir de un aprendizaje previo sobre patrones de datos existentes. En lugar de limitarse a clasificar datos, sintetizan información nueva.",
        "imagen": "iagen.jpeg"
    },
    {
        "id": 7,
        "termino": "Large Language Models (LLM / Modelos Grandes de Lenguaje)",
        "definicion": "Modelos de IA de última generación entrenados con volúmenes gigantescos de texto (miles de millones de palabras). Utilizan arquitecturas profundas para comprender la estructura gramatical, el contexto y la semántica del lenguaje humano, respondiendo preguntas y redactando contenido complejo.",
        "imagen": "images.jpeg"
    },
    {
        "id": 8,
        "termino": "Foundation Models (Modelos Fundacionales)",
        "definicion": "Modelos masivos e hiperentrenados con conjuntos de datos diversos y de gran escala. Sirven como 'plataforma base' versátil que puede ser adaptada y personalizada para múltiples tareas derivadas sin necesidad de entrenar un modelo desde cero.",
        "imagen": "Foundation Models.jpeg"
    },
    {
        "id": 9,
        "termino": "Fine-tuning (Ajuste Fino)",
        "definicion": "Proceso en el cual un modelo fundacional preentrenado se somete a una fase de entrenamiento adicional con un conjunto de datos reducido y especializado. Esto adapta los conocimientos generales del modelo a un área específica (por ejemplo, legislación, medicina o soporte técnico).",
        "imagen": "Finet.jpeg"
    },
    {
        "id": 10,
        "termino": "Training (Entrenamiento)",
        "definicion": "Fase inicial e intensiva en capacidad de cómputo en la que un modelo analiza millones de ejemplos. Durante este proceso, el algoritmo ajusta sus parámetros internos de forma iterativa hasta minimizar el margen de error en sus respuestas.",
        "imagen": "training.jpeg"
    },
    {
        "id": 11,
        "termino": "Prompts (Instrucciones)",
        "definicion": "Conjunto de texto, parámetros o indicaciones que un usuario proporciona a un modelo de IA para indicarle qué tarea debe realizar o qué respuesta debe generar. La precisión del prompt determina en gran medida la calidad del resultado obtenido.",
        "imagen": "Prompts.jpeg"
    },
    {
        "id": 12,
        "termino": "Hallucinations (Alucinaciones)",
        "definicion": "Fenómeno en el que un modelo de IA generativa presenta información incorrecta, falsa o inventada con total apariencia de certeza. Ocurre debido a limitaciones en sus datos de entrenamiento o a la naturaleza probabilística con la que el modelo predice la siguiente palabra o píxel.",
        "imagen": "Hallucinations.jpeg"
    },
    {
        "id": 13,
        "termino": "Reinforcement Learning (Aprendizaje por Refuerzo)",
        "definicion": "Método de aprendizaje automático en el que un 'agente' aprende a tomar decisiones dentro de un entorno mediante un sistema de recompensas y castigos. Es la base de los sistemas que juegan al ajedrez, controlan robótica o perfeccionan la alineación de chatbots a través de retroalimentación humana (RLHF).",
        "imagen": "Reinfor.jpeg"
    },
    {
        "id": 14,
        "termino": "Neural Networks (Redes Neuronales Artificiales)",
        "definicion": "Estructuras computacionales compuestas por nodos ('neuronas') organizados en capas que transmiten y procesan señales mediante pesos matemáticos. Representan el componente fundamental para el funcionamiento del Deep Learning.",
        "imagen": "Neural.jpeg"
    },
    {
        "id": 15,
        "termino": "AI Agents (Agentes de IA)",
        "definicion": "Sistemas autónomos que no solo responden preguntas, sino que pueden percibir su entorno, tomar decisiones, utilizar herramientas externas (como navegadores o bases de datos) y ejecutar secuencias de tareas complejas para alcanzar un objetivo específico sin supervisión constante.",
        "imagen": "AI Agents.jpeg"
    },
    {
        "id": 16,
        "termino": "Inference (Inferencia)",
        "definicion": "Fase operativa en la que un modelo de IA, ya entrenado, aplica sus conocimientos aprendidos a datos completamente nuevos para realizar una predicción, clasificar una imagen o generar una respuesta en tiempo real.",
        "imagen": "Inference.jpeg"
    },
    {
        "id": 17,
        "termino": "Multimodal AI (IA Multimodal)",
        "definicion": "Sistemas capaces de procesar, combinar y relacionar simultáneamente múltiples tipos de datos o formatos de entrada, como texto, imágenes, audio y código dentro de un mismo modelo.",
        "imagen": "Multimodal AI.png"
    },
    {
        "id": 18,
        "termino": "Overfitting (Sobreajuste)",
        "definicion": "Error de entrenamiento que ocurre cuando un modelo memoriza excesivamente los datos de entrenamiento en lugar de aprender los patrones generales. Esto provoca que tenga un rendimiento perfecto con sus datos de prueba, pero falle al enfrentarse a información nueva.",
        "imagen": "Overfitting.png"
    },
    {
        "id": 19,
        "termino": "Embeddings (Vectores de Incrustación)",
        "definicion": "Representación matemática que convierte palabras, frases o imágenes en vectores numéricos dentro de un espacio multidimensional. Permite a las computadoras medir el significado contextual y la similitud semántica entre distintos conceptos.",
        "imagen": "Embeddings.jpg"
    },
    {
        "id": 20,
        "termino": "AI Ethics & Governance (Ética y Gobernanza de la IA)",
        "definicion": "Conjunto de directrices, marcos regulatorios y buenas prácticas dirigidos a asegurar que los sistemas de IA se desarrollen y utilicen de manera justa, segura, transparente, sin sesgos discriminatorios y respetando la privacidad de las personas.",
        "imagen": "Ai Eth.jpeg"
    },
]


def separar_termino(termino: str) -> tuple[str, str]:
    """Divide 'Nombre (Alias)' en ('Nombre', 'Alias'). Si no hay paréntesis, alias vacío."""
    if " (" in termino and termino.endswith(")"):
        nombre, alias = termino.split(" (", 1)
        return nombre, alias[:-1]
    return termino, ""


@app.route("/")
def index():
    # Se prepara una vista de los datos con el nombre corto (para el menú),
    # el alias (para mostrarlo bajo el título) y su campo de imagen respectivo.
    terminos = []
    for item in glosario:
        nombre, alias = separar_termino(item["termino"])
        terminos.append({**item, "nombre": nombre, "alias": alias})
    return render_template("index.html", terminos=terminos)


if __name__ == "__main__":
    app.run(debug=True)