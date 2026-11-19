// El desplazamiento suave lo resuelve CSS (scroll-behavior: smooth).
// Este script hace cuatro cosas:
//   1. Marca en el menú la sección que se está leyendo.
//   2. Abre las imágenes en grande (visor con fondo desenfocado).
//   3. Maneja el formulario de Búsqueda Avanzada (comunicación con Flask).
//   4. Módulo Búsqueda Lineal (MEDISEARCH integrado): búsqueda secuencial
//      animada de expedientes médicos. Todo su código vive dentro de una
//      función autoejecutable y solo trabaja dentro de #busqueda-lineal.

/* ---------- 1. MENÚ: sección activa ---------- */
(function () {
  const menu = document.querySelector(".menu ul");
  const enlaces = Array.from(document.querySelectorAll(".menu a"));
  // Antes observaba ".termino"; ahora observa las secciones del menú.
  const secciones = document.querySelectorAll(".seccion");
  if (!menu || !enlaces.length || !("IntersectionObserver" in window)) return;

  const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");
  const porId = new Map(enlaces.map((a) => [a.hash.slice(1), a]));

  function marcar(enlace) {
    enlaces.forEach((a) => a.removeAttribute("aria-current"));
    enlace.setAttribute("aria-current", "true");

    // Centra el enlace activo dentro del menú horizontal.
    const izquierda = enlace.offsetLeft - (menu.clientWidth - enlace.offsetWidth) / 2;
    menu.scrollTo({
      left: izquierda,
      behavior: reducirMovimiento.matches ? "auto" : "smooth",
    });
  }

  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (entrada.isIntersecting) {
          const enlace = porId.get(entrada.target.id);
          if (enlace) marcar(enlace);
        }
      });
    },
    { rootMargin: "-20% 0px -70% 0px" }
  );

  secciones.forEach((s) => observador.observe(s));
})();

/* ---------- 2. VISOR: imagen ampliada con blur ---------- */
(function () {
  const visor = document.getElementById("visor");
  if (!visor) return;

  const visorImg = visor.querySelector(".visor__imagen");
  const btnCerrar = visor.querySelector(".visor__cerrar");
  let disparador = null; // elemento que abrió el visor, para devolverle el foco

  function abrir(img, origen) {
    disparador = origen || img;
    visorImg.src = img.currentSrc || img.src;
    visorImg.alt = img.alt;
    visor.hidden = false;
    document.body.classList.add("visor-abierto");
    requestAnimationFrame(() => visor.classList.add("visible"));
    btnCerrar.focus();
  }

  function cerrar() {
    visor.classList.remove("visible");
    document.body.classList.remove("visor-abierto");
    setTimeout(() => {
      visor.hidden = true;
      visorImg.src = "";
    }, 250);
    if (disparador) disparador.focus();
  }

  // Un solo listener para tarjetas (clic en cualquier parte) y fotos del glosario.
  document.addEventListener("click", (e) => {
    if (!visor.hidden) return;

    const tarjeta = e.target.closest(".tarjeta-imagen");
    if (tarjeta) {
      const miniatura = tarjeta.querySelector(".tarjeta-imagen__miniatura");
      const img = tarjeta.querySelector(".tarjeta-imagen__miniatura img");
      if (img) abrir(img, miniatura);
      return;
    }

    const zoom = e.target.closest("[data-ampliar]");
    if (zoom) abrir(zoom, zoom);
  });

  // Cerrar: clic en el fondo o en la X, y tecla Esc.
  visor.addEventListener("click", (e) => {
    if (e.target !== visorImg) cerrar();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !visor.hidden) cerrar();
  });
})();

/* ---------- 3. BÚSQUEDA AVANZADA: formulario ↔ Flask ----------
   Elementos (definidos en templates/index.html):
     #busqueda-form, #busqueda-consulta, #busqueda-contador,
     #busqueda-analizar, #busqueda-carga, #busqueda-resultados, #busqueda-mensaje
   Endpoint (definido en app.py): POST /api/busqueda-avanzada
     Petición:  { "consulta": "<texto>" }
     Respuesta: { "estado": "...", "mensaje": "..." }  (+ campos del modelo real
                en la siguiente etapa; ver mostrarResultados)
*/
(function () {
  const formulario = document.getElementById("busqueda-form");
  if (!formulario) return;

  const campo = document.getElementById("busqueda-consulta");
  const contador = document.getElementById("busqueda-contador");
  const boton = document.getElementById("busqueda-analizar");
  const carga = document.getElementById("busqueda-carga");
  const resultados = document.getElementById("busqueda-resultados");
  const mensaje = document.getElementById("busqueda-mensaje");
  if (!campo || !boton || !resultados || !mensaje) return;

  // Se lee del atributo data-endpoint del formulario si existe; si no, usa la ruta de app.py.
  const URL_API = formulario.dataset.endpoint || "/api/busqueda-avanzada";
  const LIMITE = campo.maxLength > 0 ? campo.maxLength : 1000;
  const TIEMPO_MAXIMO_MS = 30000;
  let enCurso = false;

  /* --- Contador de caracteres --- */
  function actualizarContador() {
    if (!contador) return;
    contador.textContent = campo.value.length + " / " + LIMITE;
    contador.classList.toggle("busqueda-contador--limite", campo.value.length >= LIMITE);
  }

  /* --- Estados visuales --- */
  function limpiarLista() {
    const anterior = resultados.querySelector(".busqueda-lista");
    if (anterior) anterior.remove();
  }

  function mostrarMensaje(texto, estado) {
    limpiarLista();
    mensaje.hidden = false;
    mensaje.textContent = texto;
    mensaje.classList.toggle("busqueda-resultados__mensaje--error", estado === "error");
    resultados.dataset.estado = estado || "";
  }

  function marcarInvalido(invalido) {
    if (invalido) campo.setAttribute("aria-invalid", "true");
    else campo.removeAttribute("aria-invalid");
  }

  function establecerCarga(activa) {
    enCurso = activa;
    boton.disabled = activa;
    if (carga) carga.hidden = !activa;
    resultados.setAttribute("aria-busy", activa ? "true" : "false");
  }

  /* --- Render de tarjetas de resultado ---
     PUNTO DE CONEXIÓN con el modelo (siguiente etapa).
     Si el backend devuelve un arreglo "resultados", se muestra una tarjeta por
     elemento usando los campos opcionales: titulo, descripcion y confianza
     (número entre 0 y 1, o entre 0 y 100). Ajustar los nombres de campo cuando
     se conozca la respuesta real de predict.py. Todo se inserta con textContent. */
  function crearTarjeta(item) {
    const tarjeta = document.createElement("li");
    tarjeta.className = "busqueda-tarjeta";

    const titulo = document.createElement("h4");
    titulo.className = "busqueda-tarjeta__titulo";
    titulo.textContent = String(item.titulo != null ? item.titulo : "Resultado");
    tarjeta.appendChild(titulo);

    if (item.descripcion != null) {
      const texto = document.createElement("p");
      texto.className = "busqueda-tarjeta__texto";
      texto.textContent = String(item.descripcion);
      tarjeta.appendChild(texto);
    }

    const valor = Number(item.confianza);
    if (item.confianza != null && isFinite(valor)) {
      const porcentaje = Math.max(0, Math.min(100, valor <= 1 ? valor * 100 : valor));
      const etiqueta = document.createElement("span");
      etiqueta.className = "busqueda-tarjeta__confianza";
      etiqueta.textContent = "Confianza: " + porcentaje.toFixed(1) + "%";

      const barra = document.createElement("span");
      barra.className = "busqueda-tarjeta__barra";
      const relleno = document.createElement("span");
      relleno.style.width = porcentaje + "%";
      barra.appendChild(relleno);

      tarjeta.appendChild(etiqueta);
      tarjeta.appendChild(barra);
    }
    return tarjeta;
  }

  function mostrarResultados(datos) {
    const lista = Array.isArray(datos.resultados) ? datos.resultados : [];

    if (!lista.length) {
      // Sin resultados del modelo (p. ej. estado "pendiente"): muestra el mensaje del backend.
      mostrarMensaje(datos.mensaje || "Sin resultados.", datos.estado || "");
      return;
    }

    limpiarLista();
    mensaje.hidden = !datos.mensaje;
    mensaje.textContent = datos.mensaje || "";
    mensaje.classList.remove("busqueda-resultados__mensaje--error");
    resultados.dataset.estado = datos.estado || "ok";

    const ul = document.createElement("ul");
    ul.className = "busqueda-lista";
    lista.forEach((item) => ul.appendChild(crearTarjeta(item || {})));
    resultados.appendChild(ul);
  }

  /* --- Envío al backend --- */
  async function enviar() {
    if (enCurso) return;

    const consulta = campo.value.trim();
    if (!consulta) {
      marcarInvalido(true);
      mostrarMensaje("Escribe una consulta antes de analizar.", "error");
      campo.focus();
      return;
    }
    if (consulta.length > LIMITE) {
      marcarInvalido(true);
      mostrarMensaje("La consulta no puede superar " + LIMITE + " caracteres.", "error");
      campo.focus();
      return;
    }

    marcarInvalido(false);
    establecerCarga(true);

    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), TIEMPO_MAXIMO_MS);

    try {
      const respuesta = await fetch(URL_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ consulta: consulta }),
        signal: controlador.signal,
      });

      let datos = null;
      try {
        datos = await respuesta.json();
      } catch (_) {
        datos = null; // respuesta que no es JSON
      }

      if (!respuesta.ok) {
        const texto = datos && datos.mensaje ? datos.mensaje : "El servidor respondió con un error (" + respuesta.status + ").";
        mostrarMensaje(texto, "error");
      } else if (!datos) {
        mostrarMensaje("El servidor devolvió una respuesta no válida.", "error");
      } else {
        mostrarResultados(datos);
      }
    } catch (error) {
      const texto =
        error && error.name === "AbortError"
          ? "La solicitud tardó demasiado. Inténtalo de nuevo."
          : "No se pudo conectar con el servidor. Inténtalo de nuevo.";
      mostrarMensaje(texto, "error");
    } finally {
      clearTimeout(temporizador);
      establecerCarga(false);
    }
  }

  /* --- Eventos --- */
  campo.addEventListener("input", () => {
    actualizarContador();
    if (campo.value.trim()) marcarInvalido(false);
  });

  // Clic en "Analizar" o Enter sobre el botón: ambos disparan "submit" del formulario.
  formulario.addEventListener("submit", (e) => {
    e.preventDefault();
    enviar();
  });

  // Atajo: Ctrl/Cmd + Enter dentro del área de texto.
  campo.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      enviar();
    }
  });

  actualizarContador();
})();

/* ---------- 4. BÚSQUEDA LINEAL (MEDISEARCH integrado) ----------
   Búsqueda lineal (secuencial) de expedientes médicos con animación paso a paso.

   Encapsulamiento:
     - Todo vive dentro de esta función autoejecutable: no hay variables ni
       funciones globales, así que no puede chocar con las secciones 1-3.
     - Todos los elementos se buscan DENTRO del contenedor #busqueda-lineal
       (ver RAIZ). Nada fuera de ese contenedor se lee ni se modifica.
     - Los eventos se registran solo sobre elementos del módulo y solo una vez
       (hay una guarda contra doble inicialización).

   IDs esperados en el HTML (los mismos de MEDISEARCH). Si en tu HTML final los
   renombraste (p. ej. "ml-criterio"), cambia únicamente el objeto IDS de abajo.
*/
(function () {
  "use strict";

  /* =====================================================================
     0. CONTENEDOR Y REFERENCIAS
     ===================================================================== */
  const RAIZ = document.getElementById("busqueda-lineal");
  if (!RAIZ) return;                              // la sección no existe: no hace nada
  if (RAIZ.dataset.medisearchListo === "true") return; // evita doble inicialización
  RAIZ.dataset.medisearchListo = "true";

  const IDS = {
    form: "form-busqueda",
    criterio: "criterio",
    termino: "termino",
    mensaje: "mensaje-form",
    btnIniciar: "btn-iniciar",
    btnLimpiar: "btn-limpiar",
    btnPausar: "btn-pausar",
    btnContinuar: "btn-continuar",
    btnReiniciar: "btn-reiniciar",
    velocidad: "velocidad",
    barra: "barra",
    barraRelleno: "barra-relleno",
    progresoTexto: "progreso-texto",
    pEstado: "p-estado",
    pExpediente: "p-expediente",
    pPosicion: "p-posicion",
    pCriterio: "p-criterio",
    pValor: "p-valor",
    pTermino: "p-termino",
    pResultado: "p-resultado",
    chips: "lista-viz",
    registro: "registro",
    tabla: "tabla-cuerpo",
    estadoResumen: "estado-resumen",
    sTotal: "s-total",
    sExaminados: "s-examinados",
    sComparaciones: "s-comparaciones",
    sCoincidencias: "s-coincidencias",
    sNoCoinciden: "s-no-coinciden",
    sAvance: "s-avance",
    sTiempoAlg: "s-tiempo-alg",
    sTiempoAnim: "s-tiempo-anim"
  };

  // Busca por id solo dentro del contenedor del módulo.
  function buscar(id) {
    return RAIZ.querySelector("#" + id);
  }

  const el = {};
  const faltantes = [];
  Object.keys(IDS).forEach(function (clave) {
    el[clave] = buscar(IDS[clave]);
    if (!el[clave]) { faltantes.push(IDS[clave]); }
  });

  // Si falta algún elemento, se avisa en consola y el módulo no arranca
  // (así nunca rompe el resto de IASEP).
  if (faltantes.length) {
    console.warn("[Búsqueda Lineal] No se inició: faltan elementos dentro de #busqueda-lineal →", faltantes.join(", "));
    RAIZ.dataset.medisearchListo = "false";
    return;
  }

  /* =====================================================================
     1. DATOS
     ===================================================================== */
  const EXPEDIENTES = [
    { id: "EXP001", nombre: "Juan Pérez",       edad: 45, enfermedad: "Diabetes" },
    { id: "EXP002", nombre: "María López",      edad: 38, enfermedad: "Hipertensión" },
    { id: "EXP003", nombre: "Carlos Ruiz",      edad: 52, enfermedad: "Asma" },
    { id: "EXP004", nombre: "Ana Torres",       edad: 41, enfermedad: "Diabetes" },
    { id: "EXP005", nombre: "Luis García",      edad: 60, enfermedad: "Migraña" },
    { id: "EXP006", nombre: "Sofía Hernández",  edad: 35, enfermedad: "Gastritis" },
    { id: "EXP007", nombre: "Pedro Sánchez",    edad: 49, enfermedad: "Diabetes" },
    { id: "EXP008", nombre: "Laura Martínez",   edad: 29, enfermedad: "Asma" },
    { id: "EXP009", nombre: "Roberto Díaz",     edad: 56, enfermedad: "Hipertensión" },
    { id: "EXP010", nombre: "Elena Flores",     edad: 44, enfermedad: "Migraña" },
    { id: "EXP011", nombre: "Miguel Castro",    edad: 63, enfermedad: "Diabetes" },
    { id: "EXP012", nombre: "Daniela Romero",   edad: 32, enfermedad: "Gastritis" },
    { id: "EXP013", nombre: "Fernando Ortiz",   edad: 47, enfermedad: "Asma" },
    { id: "EXP014", nombre: "Gabriela Morales", edad: 51, enfermedad: "Diabetes" },
    { id: "EXP015", nombre: "Ricardo Jiménez",  edad: 39, enfermedad: "Hipertensión" },
    { id: "EXP016", nombre: "Patricia Vega",    edad: 58, enfermedad: "Gastritis" },
    { id: "EXP017", nombre: "Andrés Mendoza",   edad: 42, enfermedad: "Diabetes" },
    { id: "EXP018", nombre: "Valeria Cruz",     edad: 27, enfermedad: "Migraña" },
    { id: "EXP019", nombre: "Jorge Navarro",    edad: 55, enfermedad: "Asma" },
    { id: "EXP020", nombre: "Camila Rojas",     edad: 46, enfermedad: "Diabetes" }
  ];

  // Criterios de búsqueda: a qué campo del expediente corresponde cada uno.
  const CRITERIOS = {
    id:         { etiqueta: "ID del expediente",   campo: "id" },
    nombre:     { etiqueta: "Nombre del paciente", campo: "nombre" },
    enfermedad: { etiqueta: "Enfermedad",          campo: "enfermedad" }
  };

  // Tiempo (ms) que dura cada comparación en pantalla según la velocidad.
  const RETARDO_MS = { lenta: 1000, normal: 500, rapida: 120 };

  const PLACEHOLDERS = { id: "Ej. EXP007", nombre: "Ej. Ana Torres", enfermedad: "Ej. Diabetes" };

  /* =====================================================================
     2. ALGORITMO DE BÚSQUEDA LINEAL
     ===================================================================== */

  /** Quita espacios al inicio y al final e ignora mayúsculas/minúsculas. */
  function normalizar(texto) {
    return String(texto).trim().toLowerCase();
  }

  /**
   * Compara el dato de UN expediente con el término buscado.
   *  - ID: debe ser exactamente igual.
   *  - Nombre y enfermedad: coincide si el dato contiene el texto escrito.
   */
  function coincide(valor, termino, criterio) {
    const valorNormalizado = normalizar(valor);
    if (criterio === "id") {
      return valorNormalizado === termino;
    }
    return valorNormalizado.indexOf(termino) !== -1;
  }

  /**
   * BÚSQUEDA LINEAL (SECUENCIAL)
   *
   * Es una función generadora: hace el recorrido completo con un ciclo for,
   * pero se detiene (yield) después de cada comparación para que la interfaz
   * pueda mostrar ese paso. Así lo que se anima es exactamente lo que el
   * algoritmo hace; no hay una animación separada.
   *
   * Recibe:  la lista de expedientes, el criterio y el término ingresado.
   * Entrega: un objeto por cada comparación realizada.
   * Devuelve (al terminar): la lista de expedientes que coincidieron.
   */
  function* busquedaLineal(lista, criterio, terminoIngresado) {
    const termino = normalizar(terminoIngresado);
    const campo = CRITERIOS[criterio].campo;
    const resultados = [];
    let comparaciones = 0;

    // Se empieza en el primer expediente y se avanza de uno en uno hasta el último.
    for (let i = 0; i < lista.length; i++) {
      const expediente = lista[i];
      const valor = expediente[campo];

      // Se compara el dato del expediente actual con el término buscado.
      const hayCoincidencia = coincide(valor, termino, criterio);
      comparaciones++;

      // Si coincide se guarda como resultado; si no, se sigue con el siguiente.
      if (hayCoincidencia) {
        resultados.push(expediente);
      }

      // Se informa de este paso (la interfaz lo dibuja) y se continúa después.
      yield {
        posicion: i + 1,
        total: lista.length,
        expediente: expediente,
        valor: valor,
        termino: termino,
        coincide: hayCoincidencia,
        comparaciones: comparaciones,
        coincidencias: resultados.length
      };
    }

    return resultados;
  }

  /* =====================================================================
     3. INTERFAZ
     ===================================================================== */

  /* ---------- Estado del módulo ---------- */
  let estado = "inactivo";      // inactivo | ejecutando | pausado | finalizado
  let busqueda = null;          // { criterio, termino } de la última búsqueda iniciada
  let iterador = null;          // generador de busquedaLineal en curso
  let temporizador = null;      // setTimeout pendiente
  let fase = "examinar";        // examinar (azul) -> resolver (verde/rojo)
  let pasoActual = null;        // último paso entregado por el algoritmo
  let chipsEls = [];            // <li> de cada expediente en la visualización
  let tiempoAlgoritmo = 0;      // ms acumulados dentro del algoritmo
  let tiempoActivo = 0;         // ms de animación (sin contar pausas)
  let reanudadoEn = 0;          // marca de tiempo del último inicio/continuación

  /* ---------- Utilidades ---------- */
  function plural(n, singular, pluralTxt) {
    return n + " " + (n === 1 ? singular : pluralTxt);
  }

  function detenerTemporizador() {
    if (temporizador !== null) {
      clearTimeout(temporizador);
      temporizador = null;
    }
  }

  function programar(fraccion) {
    temporizador = setTimeout(avanzar, RETARDO_MS[el.velocidad.value] * fraccion);
  }

  /* ---------- Dibujo de la visualización ---------- */
  function crearChips() {
    el.chips.innerHTML = "";
    chipsEls = [];
    for (let i = 0; i < EXPEDIENTES.length; i++) {
      const e = EXPEDIENTES[i];
      const li = document.createElement("li");
      li.className = "chip chip--pendiente";
      li.innerHTML =
        '<span class="chip__pos">' + (i + 1) + "</span>" +
        '<span class="chip__id">' + e.id + "</span>" +
        '<span class="chip__nombre">' + e.nombre + "</span>" +
        '<span class="chip__enfermedad">' + e.enfermedad + "</span>" +
        '<span class="chip__estado">Sin examinar</span>';
      el.chips.appendChild(li);
      chipsEls.push(li);
    }
  }

  function marcarChip(indice, clase, texto) {
    const chip = chipsEls[indice];
    chip.className = "chip " + clase;
    chip.lastChild.textContent = texto;
  }

  function ponerResultadoPanel(texto, clase) {
    el.pResultado.textContent = texto;
    el.pResultado.className = clase || "";
  }

  function limpiarPanel() {
    el.pExpediente.textContent = "—";
    el.pPosicion.textContent = "—";
    el.pCriterio.textContent = "—";
    el.pValor.textContent = "—";
    el.pTermino.textContent = "—";
    ponerResultadoPanel("—", "");
  }

  function mostrarFilaVacia(texto) {
    const tr = document.createElement("tr");
    tr.className = "fila-vacia";
    const td = document.createElement("td");
    td.colSpan = 5;
    td.textContent = texto;
    tr.appendChild(td);
    el.tabla.appendChild(tr);
  }

  function quitarFilaVacia() {
    const vacia = el.tabla.querySelector(".fila-vacia");
    if (vacia) { vacia.remove(); }
  }

  function agregarFila(expediente) {
    quitarFilaVacia();
    const tr = document.createElement("tr");
    const datos = [expediente.id, expediente.nombre, expediente.edad, expediente.enfermedad];
    for (let i = 0; i < datos.length; i++) {
      const td = document.createElement("td");
      td.textContent = datos[i];
      tr.appendChild(td);
    }
    const tdEstado = document.createElement("td");
    const etiqueta = document.createElement("span");
    etiqueta.className = "etiqueta-ok";
    etiqueta.textContent = "Coincidencia encontrada";
    tdEstado.appendChild(etiqueta);
    tr.appendChild(tdEstado);
    el.tabla.appendChild(tr);
  }

  function agregarRegistro(paso) {
    const li = document.createElement("li");
    li.className = paso.coincide ? "reg--coincide" : "reg--descartado";
    li.textContent =
      "Paso " + paso.posicion + ": " + paso.expediente.id +
      " → «" + paso.valor + "» " +
      (paso.coincide ? "coincide con" : "no coincide con") +
      " «" + paso.termino + "»";
    el.registro.appendChild(li);
    el.registro.scrollTop = el.registro.scrollHeight;
  }

  /* ---------- Estadísticas ---------- */
  function actualizarEstadisticas(paso) {
    const total = EXPEDIENTES.length;
    const examinados = paso ? paso.posicion : 0;
    const comparaciones = paso ? paso.comparaciones : 0;
    const coincidencias = paso ? paso.coincidencias : 0;
    const avance = Math.round((examinados / total) * 100);

    el.sTotal.textContent = total;
    el.sExaminados.textContent = examinados;
    el.sComparaciones.textContent = comparaciones;
    el.sCoincidencias.textContent = coincidencias;
    el.sNoCoinciden.textContent = comparaciones - coincidencias;
    el.sAvance.textContent = avance + " %";

    el.barraRelleno.style.width = avance + "%";
    el.barra.setAttribute("aria-valuenow", avance);
    el.progresoTexto.textContent = examinados + " de " + total + " expedientes (" + avance + " %)";
  }

  function mostrarTiempos() {
    el.sTiempoAlg.textContent = tiempoAlgoritmo.toFixed(3) + " ms";
    el.sTiempoAnim.textContent = (tiempoActivo / 1000).toFixed(1) + " s";
  }

  /* ---------- Textos de estado y controles ---------- */
  function actualizarEstadoTexto() {
    const etiquetas = {
      inactivo: "Sin iniciar", ejecutando: "En curso",
      pausado: "En pausa", finalizado: "Finalizada"
    };
    el.pEstado.textContent = etiquetas[estado];

    const total = EXPEDIENTES.length;
    let texto = "";
    if (estado === "inactivo") {
      texto = "Sin búsqueda en curso. Elige un criterio y pulsa «Iniciar búsqueda».";
    } else if (estado === "ejecutando") {
      texto = "Búsqueda en curso: " + CRITERIOS[busqueda.criterio].etiqueta +
              " · término «" + busqueda.termino.trim() + "».";
    } else if (estado === "pausado") {
      const pos = pasoActual ? pasoActual.posicion : 0;
      texto = "Búsqueda en pausa en el expediente " + pos + " de " + total + ".";
    } else {
      const n = pasoActual ? pasoActual.coincidencias : 0;
      texto = n === 0
        ? "Búsqueda finalizada: ningún expediente coincide con «" + busqueda.termino.trim() +
          "». Se revisaron los " + total + " expedientes."
        : "Búsqueda finalizada: " + plural(n, "coincidencia", "coincidencias") +
          " en " + total + " expedientes revisados.";
    }
    el.estadoResumen.textContent = texto;
  }

  function actualizarControles() {
    const activa = estado === "ejecutando" || estado === "pausado";
    el.btnIniciar.disabled = activa;
    el.btnPausar.disabled = estado !== "ejecutando";
    el.btnContinuar.disabled = estado !== "pausado";
    el.btnReiniciar.disabled = estado === "inactivo";
    el.criterio.disabled = activa;
    el.termino.disabled = activa;
  }

  /* ---------- Vista inicial / reinicio de la vista ---------- */
  function reiniciarVista(criterio) {
    crearChips();
    el.chips.dataset.criterio = criterio;
    el.registro.innerHTML = "";
    el.tabla.innerHTML = "";
    mostrarFilaVacia("Aún no hay resultados. Elige un criterio y pulsa «Iniciar búsqueda».");
    limpiarPanel();
    actualizarEstadisticas(null);
    el.sTiempoAlg.textContent = "—";
    el.sTiempoAnim.textContent = "—";
  }

  /* ---------- Ciclo de animación: un paso = dos fases ---------- */
  /*
     Fase "examinar": se le pide al algoritmo la siguiente comparación (next())
     y el expediente se marca en azul.
     Fase "resolver": se muestra el resultado de esa misma comparación (verde o
     rojo) y se actualizan contadores, tabla y registro.
  */
  function avanzar() {
    temporizador = null;
    if (estado !== "ejecutando") { return; }

    if (fase === "examinar") {
      const t0 = performance.now();
      const siguiente = iterador.next();          // el algoritmo hace UNA comparación
      tiempoAlgoritmo += performance.now() - t0;

      pasoActual = siguiente.value;
      marcarChip(pasoActual.posicion - 1, "chip--examinando", "Examinando…");
      el.pExpediente.textContent = pasoActual.expediente.id;
      el.pPosicion.textContent = pasoActual.posicion + " de " + pasoActual.total;
      el.pCriterio.textContent = CRITERIOS[busqueda.criterio].etiqueta;
      el.pValor.textContent = pasoActual.valor;
      el.pTermino.textContent = pasoActual.termino;
      ponerResultadoPanel("Comparando…", "res--examinando");

      fase = "resolver";
      programar(0.5);
      return;
    }

    // fase === "resolver"
    const paso = pasoActual;
    if (paso.coincide) {
      marcarChip(paso.posicion - 1, "chip--coincide", "Coincide");
      ponerResultadoPanel("Coincide", "res--coincide");
      agregarFila(paso.expediente);
    } else {
      marcarChip(paso.posicion - 1, "chip--descartado", "No coincide");
      ponerResultadoPanel("No coincide", "res--descartado");
    }
    agregarRegistro(paso);
    actualizarEstadisticas(paso);

    fase = "examinar";
    if (paso.posicion === paso.total) {
      finalizar();
    } else {
      programar(0.5);
    }
  }

  function finalizar() {
    // Al pedir el siguiente valor, el generador termina y devuelve la lista final.
    const fin = iterador.next();
    const resultados = fin.value;

    estado = "finalizado";
    tiempoActivo += performance.now() - reanudadoEn;
    detenerTemporizador();

    if (resultados.length === 0) {
      quitarFilaVacia();
      mostrarFilaVacia("Ningún expediente coincide con la búsqueda.");
    }
    mostrarTiempos();
    actualizarEstadoTexto();
    actualizarControles();
  }

  /* ---------- Acciones de los botones ---------- */
  function iniciarBusqueda(criterio, termino) {
    detenerTemporizador();
    busqueda = { criterio: criterio, termino: termino };
    iterador = busquedaLineal(EXPEDIENTES, criterio, termino);
    fase = "examinar";
    pasoActual = null;
    tiempoAlgoritmo = 0;
    tiempoActivo = 0;

    reiniciarVista(criterio);
    estado = "ejecutando";
    reanudadoEn = performance.now();
    actualizarEstadoTexto();
    actualizarControles();
    avanzar();
  }

  function pausar() {
    if (estado !== "ejecutando") { return; }
    detenerTemporizador();
    tiempoActivo += performance.now() - reanudadoEn;
    estado = "pausado";
    actualizarEstadoTexto();
    actualizarControles();
  }

  function continuar() {
    if (estado !== "pausado") { return; }
    estado = "ejecutando";
    reanudadoEn = performance.now();
    actualizarEstadoTexto();
    actualizarControles();
    avanzar();
  }

  function reiniciar() {
    if (!busqueda) { return; }
    iniciarBusqueda(busqueda.criterio, busqueda.termino);
  }

  function limpiar() {
    detenerTemporizador();
    estado = "inactivo";
    iterador = null;
    busqueda = null;
    pasoActual = null;
    el.termino.value = "";
    el.mensaje.textContent = "";
    reiniciarVista(el.criterio.value);
    actualizarEstadoTexto();
    actualizarControles();
    el.termino.focus();
  }

  /* ---------- Eventos (todos sobre elementos del módulo) ---------- */
  el.form.addEventListener("submit", function (evento) {
    evento.preventDefault();
    if (estado === "ejecutando" || estado === "pausado") { return; }

    const termino = el.termino.value;
    if (normalizar(termino) === "") {
      el.mensaje.textContent = "Escribe un término de búsqueda para iniciar.";
      el.termino.focus();
      return;
    }
    el.mensaje.textContent = "";
    iniciarBusqueda(el.criterio.value, termino);
  });

  el.btnLimpiar.addEventListener("click", limpiar);
  el.btnPausar.addEventListener("click", pausar);
  el.btnContinuar.addEventListener("click", continuar);
  el.btnReiniciar.addEventListener("click", reiniciar);

  el.criterio.addEventListener("change", function () {
    el.termino.placeholder = PLACEHOLDERS[el.criterio.value];
    el.mensaje.textContent = "";
    if (estado === "inactivo" || estado === "finalizado") {
      el.chips.dataset.criterio = el.criterio.value;
    }
  });

  /* ---------- Estado inicial ---------- */
  reiniciarVista(el.criterio.value);
  actualizarEstadoTexto();
  actualizarControles();
})();