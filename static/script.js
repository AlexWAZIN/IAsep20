// El desplazamiento suave lo resuelve CSS (scroll-behavior: smooth).
// Este script hace dos cosas:
//   1. Marca en el menú la sección que se está leyendo.
//   2. Abre las imágenes en grande (visor con fondo desenfocado).

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