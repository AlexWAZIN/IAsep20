# ¿Qué es la IA?

Plataforma educativa web sobre Inteligencia Artificial, desarrollada con Flask, HTML, CSS y JavaScript. Reúne la historia de la IA, sus tipos, evidencias de actividades prácticas y un glosario ilustrado.

## Contenido

1. **Inicio:** definición de Inteligencia Artificial.
2. **Línea del Tiempo:** evolución histórica de la IA (imagen ampliable).
3. **Diagnóstico:** 10 preguntas de evaluación sobre la línea del tiempo, con su respuesta correcta.
4. **Tipos de IA:** IA débil, IA fuerte y superinteligencia, cada una con su infografía.
5. **Infografía de Algoritmos.**
6. **Entrenamiento Machine Learning for Kids.**
7. **Reporte de Scratch.**
8. **Glosario:** términos de IA con definición e imagen.

## Características

- Menú de navegación fijo que resalta la sección que se está leyendo.
- Divisiones visuales claras entre temas.
- Imágenes en tarjetas con texto breve a la izquierda y miniatura a la derecha.
- Vista ampliada de las imágenes (lightbox) con fondo desenfocado; se cierra con la X, haciendo clic fuera de la imagen o con la tecla Esc.
- Diseño adaptable a celular, tableta y escritorio.
- Respeta la preferencia de movimiento reducido del sistema.

## Tecnologías

- Python 3 y Flask (plantillas Jinja2)
- HTML5
- CSS3 (grid, flexbox, `backdrop-filter`)
- JavaScript (sin librerías externas)
- Tipografías de Google Fonts: Newsreader y Schibsted Grotesk

## Estructura del proyecto

```
proyecto/
├── app.py
├── templates/
│   └── index.html
├── static/
│   ├── style.css
│   ├── script.js
│   ├── LINEADELTIEMPO_AI.jpeg
│   ├── IADEBIL.jpeg
│   ├── IAFUERTE.jpeg
│   ├── IASUPERINTELIGENTE.jpeg
│   ├── INFOGRAFIA_ALGORITMOS.jpeg
│   ├── ML_KIDS.jpeg
│   ├── SCRATCH.jpeg
│   └── (imágenes del glosario)
└── README.md
```

## Instalación y ejecución

1. Clona o descarga el proyecto.
2. (Opcional) Crea y activa un entorno virtual:

   ```bash
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # macOS / Linux
   source venv/bin/activate
   ```

3. Instala Flask:

   ```bash
   pip install flask
   ```

4. Ejecuta la aplicación:

   ```bash
   python app.py
   ```

5. Abre en el navegador: <http://127.0.0.1:5000>

## Cómo agregar o cambiar contenido

- **Imágenes:** guárdalas en la carpeta `static/` y actualiza el nombre del archivo en `index.html`.
- **Glosario:** los términos se envían desde `app.py` como una lista llamada `terminos`. Cada término tiene `id`, `nombre`, `alias` (opcional), `definicion` e `imagen` (opcional).
- **Nuevas tarjetas de imagen:** copia un bloque `<article class="tarjeta-imagen">` y cambia el título, el texto y la imagen. El visor ampliado funciona automáticamente.
- **Nuevas secciones:** agrega un `<section class="seccion" id="...">` y un enlace en el menú con el mismo `id`.

## Autor

Proyecto académico desarrollado por _[tu nombre]_ — _[tu grupo / materia / institución]_.
