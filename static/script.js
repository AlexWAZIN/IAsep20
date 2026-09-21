// El desplazamiento suave lo resuelve CSS (scroll-behavior: smooth).
// Este script solo marca en el menú el término que se está leyendo.
(function () {
  const menu = document.querySelector(".menu ul");
  const enlaces = Array.from(document.querySelectorAll(".menu a"));
  const secciones = document.querySelectorAll(".termino");
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