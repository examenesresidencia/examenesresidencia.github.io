//PRUEBA 22  <--  MODIFICAR ESTA LíNEA, EL NÚMERO CRECIENTE CON CADA ACTUALIZACIÓN
// Fix v22: LIMPIEZA automática en getDisplayOrder — 4 correcciones en un solo bloque:
//   1. Elimina de answeredOrder entradas sin graded=true (corrupción por reordenamiento)
//   2. Elimina duplicados en answeredOrder (mismo idx dos veces)
//   3. Corrige _contarRespuestas: cuenta solo graded===true (evita que Firestore gane merge)
//   4. Elimina índices fuera de rango (preguntas "fantasma" borradas que dejaron huérfanos)
//      También limpia graded/answers/shuffleMap de esos índices fantasma.
// Fix v9: unansweredOrder ya no se borra al usarse — se persiste permanentemente durante el intento.
//         Así las preguntas sin responder conservan su lugar, número y orden de opciones en TODA
//         recarga posible (F5, login, volver al menú, recarga por edición del admin, etc.).
//         El orden aleatorio se genera UNA SOLA VEZ al primer ingreso y queda congelado.
// Fix v9: se elimina toda la lógica de extrapolación de preguntas desde exámenes únicos/UBA/compilados
//         hacia especialidades. Cada cuestionario de especialidad ahora solo contiene sus propias preguntas.
// Fix: preguntas sin responder se re-mezclan en cada entrada a la sección (nuevo orden aleatorio
//      cada vez que se recarga o se vuelve desde el menú/otra sección). Las preguntas respondidas
//      permanecen fijas arriba con sus respuestas correctamente restauradas.
// Fix: pérdida de progreso al cerrar pestaña/navegador — beforeunload sella state+timestamp en localStorage
// Fix: próximo login no descartaba la nube por quiz_progress_ts desincronizado — ahora se limpia en logout
// Fix: fbSyncProgressFromCloud usa comparación por contenido (cantidad de respuestas) además del timestamp
// Fix: si local gana el merge, sube inmediatamente a Firestore en vez de esperar al logout
// Fix: quiz_beforeunload_pending se procesa en fbSyncProgressFromCloud y no se borra antes en el evento
// Fix: window._contentVersionUnsubscribes → _contentVersionUnsubscribes (usar variable del closure)
// Fix: progreso no se pierde al cerrar sesión por sesión duplicada en otro dispositivo
// Fix: _fbLogoutSilencioso ahora guarda debounce pendiente antes del signOut
// Fix: progreso no se pierde al cerrar sesión por inactividad
// Fix: _inactCerrar ahora usa window.fbLogout (wrapper completo) en lugar del fbLogout del closure
// Fix: fbLogoutConModulos fuerza el guardado en Firestore si hay debounce pendiente al cerrar sesión
// Fix: panel de debug movido a Admin como switch ON/OFF (apagado por defecto)
// NUEVO: permiso de selección/copia de texto para admin y email autorizado
// Fix: panel admin sin estilos al recargar página con sesión activa
// Fix: módulo exportar/importar progreso eliminado
// Fix: imagen en explicación muestra error visible si no se encuentra en GitHub Pages
// Fix: scroll preservado al guardar desde admin (no salta a posición del admin)
// Fix: explicaciones se cierran al iniciar sesión, cerrar sesión, recargar, volver al menú
// Fix: modal de edición admin se veía roto al recargar página con sesión activa
// NUEVO: buscador de preguntas duplicadas en Firestore con eliminación directa
// Optimizaciones Firebase: caché localStorage 24h para preguntas, sync automático en tiempo real (debounce 1.5s)
/* ========== script.js ========== */
/* Requisitos:
   1) Orden de preguntas ALEATORIO al inicio; orden de opciones aleatorio por pregunta.
      - Las preguntas se mezclan al inicio de cada intento
      - Las preguntas respondidas quedan arriba
      - Las preguntas sin responder se mantienen abajo en orden aleatorio
   2) Progreso y selecciones persistentes en localStorage hasta completar el cuestionario.
   3) "Mostrar puntuación total": exige todas respondidas; si faltan, lista cuáles faltan.
   4) Al completar y presionar "Mostrar puntuación total" y luego "Volver al menú principal",
      se limpia el estado para permitir un nuevo intento.
   5) Cada pregunta tiene botón "Responder"; pinta verde/rojo y marca "✅/❌".
   6) Botón flotante "Ver mi progreso" con ventana flotante.
   7) Mantener posición de scroll al regresar al menú principal.
   8) Navegación con botones del navegador (atrás/adelante).
*/

(function () {
  // ── Lightbox de imágenes ────────────────────────────────────────────
  function abrirLightboxImagen(src) {
    // Inyectar estilos una vez
    if (!document.getElementById('lightbox-img-styles')) {
      const st = document.createElement('style');
      st.id = 'lightbox-img-styles';
      st.textContent = `
        #lightbox-img-overlay {
          position: fixed;
          inset: 0;
          z-index: 999999;
          background: rgba(5,10,20,0.94);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: lbFadeIn 0.18s ease both;
          cursor: zoom-out;
          user-select: none;
        }
        @keyframes lbFadeIn { from{opacity:0} to{opacity:1} }

        #lightbox-img-close {
          position: fixed;
          top: 16px;
          right: 18px;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: rgba(255,255,255,0.15);
          border: 1.5px solid rgba(255,255,255,0.3);
          color: #fff;
          font-size: 1.2rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000000;
          transition: background 0.15s, transform 0.15s;
          line-height: 1;
          backdrop-filter: blur(4px);
        }
        #lightbox-img-close:hover {
          background: rgba(255,255,255,0.28);
          transform: scale(1.1);
        }

        #lightbox-img-hint {
          position: fixed;
          bottom: 18px;
          left: 50%;
          transform: translateX(-50%);
          color: rgba(255,255,255,0.45);
          font-size: 0.75rem;
          pointer-events: none;
          z-index: 1000000;
          letter-spacing: 0.02em;
          white-space: nowrap;
        }

        #lightbox-img-overlay img {
          max-width: 92vw;
          max-height: 88vh;
          object-fit: contain;
          border-radius: 10px;
          box-shadow: 0 30px 90px rgba(0,0,0,0.8);
          animation: lbImgIn 0.22s cubic-bezier(0.34,1.2,0.64,1) both;
          cursor: default;
          user-select: none;
          transition: transform 0.15s ease;
        }
        @keyframes lbImgIn {
          from { opacity:0; transform:scale(0.86) }
          to   { opacity:1; transform:scale(1) }
        }

        /* Cursor cuando la imagen puede hacer zoom */
        #lightbox-img-overlay img.lb-zoom-in  { cursor: zoom-in;  }
        #lightbox-img-overlay img.lb-zoom-out { cursor: zoom-out; }
      `;
      document.head.appendChild(st);
    }

    const existing = document.getElementById('lightbox-img-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'lightbox-img-overlay';

    const btnClose = document.createElement('button');
    btnClose.id = 'lightbox-img-close';
    btnClose.innerHTML = '✕';
    btnClose.title = 'Cerrar (ESC)';

    const hint = document.createElement('div');
    hint.id = 'lightbox-img-hint';
    hint.textContent = 'ESC o clic afuera para cerrar · Rueda para hacer zoom';

    const img = document.createElement('img');
    img.src = src;
    img.alt = 'Imagen ampliada';
    img.className = 'lb-zoom-in';

    // ── Zoom con rueda del mouse ──
    let scale = 1;
    const SCALE_MIN = 1;
    const SCALE_MAX = 4;
    img.addEventListener('wheel', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY < 0 ? 0.2 : -0.2;
      scale = Math.min(SCALE_MAX, Math.max(SCALE_MIN, scale + delta));
      img.style.transform = scale > 1 ? `scale(${scale})` : '';
      img.className = scale >= SCALE_MAX ? 'lb-zoom-out' : 'lb-zoom-in';
    }, { passive: false });

    // Doble clic para zoom rápido
    img.addEventListener('dblclick', function(e) {
      e.stopPropagation();
      if (scale > 1) {
        scale = 1;
        img.style.transform = '';
        img.className = 'lb-zoom-in';
      } else {
        scale = 2;
        img.style.transform = 'scale(2)';
        img.className = 'lb-zoom-out';
      }
    });

    function cerrar() {
      overlay.style.animation = 'lbFadeIn 0.15s ease reverse both';
      setTimeout(() => overlay.remove(), 140);
    }

    btnClose.addEventListener('click', function(e) { e.stopPropagation(); cerrar(); });
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) cerrar();
    });
    img.addEventListener('click', function(e) { e.stopPropagation(); });

    // Cerrar con ESC
    function onKey(e) {
      if (e.key === 'Escape') {
        cerrar();
        document.removeEventListener('keydown', onKey);
      }
    }
    document.addEventListener('keydown', onKey);

    // Limpiar listener al cerrar manualmente
    overlay.addEventListener('remove', function() {
      document.removeEventListener('keydown', onKey);
    });

    overlay.appendChild(btnClose);
    overlay.appendChild(img);
    overlay.appendChild(hint);
    document.body.appendChild(overlay);
  }
  window.abrirLightboxImagen = abrirLightboxImagen;

  // Listener global en fase de CAPTURA para imágenes en explicaciones
  // useCapture=true garantiza que se ejecuta ANTES que cualquier otro handler
  document.addEventListener('click', function(e) {
    // Obtener la imagen clickeada (puede ser el target directo o un ancestro img)
    let img = null;
    if (e.target.tagName === 'IMG') {
      img = e.target;
    } else if (e.target.closest && e.target.closest('img')) {
      img = e.target.closest('img');
    }
    if (!img || !img.src) return;

    // Activar lightbox si la imagen está dentro de .explicacion-contenedor
    // O si tiene el atributo title de ampliar (imágenes de explicación creadas dinámicamente)
    const enExplicacion = img.closest('.explicacion-contenedor');
    const esDeExplicacion = img.title === 'Clic para ampliar' || img.getAttribute('data-lightbox') === '1';

    if (!enExplicacion && !esDeExplicacion) return;

    e.stopPropagation();
    e.preventDefault();
    abrirLightboxImagen(img.src);
  }, true); // true = fase de captura
  // ======== Claves de almacenamiento ========
  const STORAGE_KEY = "quiz_state_v3";

  // ════════════════════════════════════════════════════════════════
  // DEBUG PANEL — controlado desde el panel Admin (switch ON/OFF)
  // Por defecto siempre APAGADO. Al cerrar el panel vuelve a ocultarse.
  // ════════════════════════════════════════════════════════════════
  let _debugPanelEnabled = false; // apagado por defecto

  function _debugLog(msg) {
    console.log('[DEBUG]', msg);
    if (!_debugPanelEnabled) return; // no mostrar si el switch está off
    let panel = document.getElementById('_debug_panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = '_debug_panel';
      panel.style.cssText = `
        position:fixed; bottom:60px; left:8px; right:8px; z-index:999999;
        background:rgba(0,0,0,0.88); color:#0f0; font-family:monospace;
        font-size:11px; padding:8px 10px; border-radius:10px;
        max-height:200px; overflow-y:auto; line-height:1.6;
        border:1px solid #0f0;
      `;
      const btnCerrar = document.createElement('button');
      btnCerrar.textContent = '\u2715 cerrar';
      btnCerrar.style.cssText = 'position:absolute;top:4px;right:6px;background:none;border:1px solid #0f0;color:#0f0;font-size:10px;cursor:pointer;border-radius:4px;padding:2px 6px;';
      btnCerrar.onclick = () => {
        panel.remove();
        // Al cerrar la ventana del panel, apagar el switch también
        _debugPanelEnabled = false;
        _actualizarBtnDebugEnAdmin();
      };
      panel.appendChild(btnCerrar);
      document.body.appendChild(panel);
    }
    const line = document.createElement('div');
    const time = new Date().toLocaleTimeString('es-AR', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
    line.textContent = time + ' \u2192 ' + msg;
    panel.appendChild(line);
    panel.scrollTop = panel.scrollHeight;
  }

  // Actualiza el aspecto del botón switch en el panel admin según estado actual
  function _actualizarBtnDebugEnAdmin() {
    const btn = document.getElementById('admin-btn-debug-toggle');
    if (!btn) return;
    if (_debugPanelEnabled) {
      btn.textContent = '\uD83D\uDFE2 Panel de debug: ON';
      btn.style.background = 'linear-gradient(135deg,#065f46,#047857)';
      btn.style.boxShadow = '0 4px 14px rgba(5,150,105,0.35)';
    } else {
      btn.textContent = '\u26AB Panel de debug: OFF';
      btn.style.background = 'linear-gradient(135deg,#1e293b,#334155)';
      btn.style.boxShadow = '0 4px 14px rgba(0,0,0,0.25)';
    }
  }

  window._debugLog = _debugLog;


  const ATTEMPT_LOG_KEY = "quiz_attempt_log_v1";
  const SCROLL_POSITION_KEY = "quiz_scroll_position_v1";
  const TIMER_STORAGE_KEY = "simulacro_timer_v1";

  // ======== Exámenes únicos ========
  // Secciones con orden FIJO de preguntas y opciones sin mezclar.
  // Las etiquetas 2 y 3 NO se muestran aquí (evitar redundancia con el nombre del archivo).
  const EXAMENES_UNICOS = [
    'unico2016','unico2017','unico2018','unico2019','unico2020','unico2021','unico2022','unico2023','unico2024','unico2025','unico2025t1','unico2025t2'
  ];
  function esExamenUnico(seccionId) {
    return EXAMENES_UNICOS.includes(seccionId);
  }

  // ======== Exámenes UBA ========
  // Mismo comportamiento que Examen Único:
  //   • Orden fijo de preguntas y opciones (sin aleatorizar)
  //   • Preguntas respondidas NO se mueven al principio
  //   • Etiqueta 1 (especialidad) visible en el propio cuestionario UBA
  //   • Etiquetas 2 y 3 visibles solo en especialidades y simulacro
  //   • Extrapolación hacia especialidades idéntica a la de exámenes únicos
  //   • Botón ✏️ Reetiquetado disponible en cada pregunta
  const EXAMENES_UBA = [
    'uba2016','uba2017','uba2018','uba2019'
  ];
  function esExamenUBA(seccionId) {
    return EXAMENES_UBA.includes(seccionId);
  }
  // Helper unificado: devuelve true si es cualquier examen de tipo "origen oficial"
  // (único o UBA), es decir, cuestionarios con orden fijo y reetiquetado habilitado.
  function esExamenOficial(seccionId) {
    return esExamenUnico(seccionId) || esExamenUBA(seccionId);
  }

  // Compilados (sección OTROS): orden fijo, las preguntas no se mueven
  const COMPILADOS = [
    'compilado1','compilado2','compilado3','compilado4','compilado5',
    'compilado6','compilado7','compilado8','compilado9','compilado10'
  ];
  function esCompilado(seccionId) {
    return COMPILADOS.includes(seccionId);
  }

  // ======== Estado en memoria (se sincroniza con localStorage) ========
  // Estructura por sección:
  // state[seccionId] = {
  //   shuffleFrozen: false,
  //   shuffleMap: { [qIndex]: { [mixedIndex]: originalIndex } },
  //   questionOrder: [array de índices de preguntas mezclados],
  //   answers: { [qIndex]: [mixedIndicesSeleccionados] },
  //   graded: { [qIndex]: true|false },
  //   totalShown: false,
  //   explanationShown: { [qIndex]: true|false }  // si se mostró la explicación
  // }
  let state = loadJSON(STORAGE_KEY, {});
  let attemptLog = loadJSON(ATTEMPT_LOG_KEY, []);
  let _scrollOnNextRender = false; // Activar scroll solo al ingresar al cuestionario

  // ======== Variables del temporizador del simulacro ========
  let timerInterval = null;
  let timerStartTime = null;
  let timerDuration = 2.5 * 60 * 60 * 1000; // 2.5 horas = 2h 30min en milisegundos
  let alertasRealizadas = {
    '1h': false,
    '30min': false,
    '15min': false,
    '5min': false
  };

  // ======== MANEJO DE NAVEGACIÓN DEL NAVEGADOR ========
  let currentSection = null;
  let _modoEditarRespuestas = false;


  // ======== Utilidades ========
  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }
  function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    // Ya NO sincronizamos automáticamente con Firestore en cada cambio.
    // El progreso se guarda en la nube:
    //   • Al cerrar sesión  → fbLogout() llama fbSaveProgressToCloud() antes del signOut
    //   • Al iniciar sesión → fbSyncProgressFromCloud() trae el más reciente (por timestamp)
    // Esto elimina decenas de escrituras/lecturas por sesión.
  }
  function cap(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
  }
  function todayISO() {
    return new Date().toISOString();
  }
  function toLocalDateStr(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString();
  }

  // ======== Scroll inteligente: guardar el cuestionario de origen para volver a él ========
  const LAST_SECTION_KEY = "quiz_last_section_v1";

  function saveLastSection(seccionId) {
    localStorage.setItem(LAST_SECTION_KEY, seccionId);
    // También guardar la posición del scroll del menú/submenú actual (como fallback)
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    localStorage.setItem(SCROLL_POSITION_KEY, scrollPosition.toString());
  }

  function scrollToSectionItem(seccionId) {
    if (!seccionId) {
      // Fallback: restaurar posición guardada
      const savedPosition = localStorage.getItem(SCROLL_POSITION_KEY);
      if (savedPosition) {
        requestAnimationFrame(() => {
          window.scrollTo({ top: parseInt(savedPosition, 10), behavior: 'smooth' });
        });
      }
      return;
    }

    // Buscar el <li> que lanza este cuestionario en el menú o submenú visible
    requestAnimationFrame(() => {
      // Esperar un frame extra para que el menú/submenú esté visible
      requestAnimationFrame(() => {
        const allLis = document.querySelectorAll('li[onclick]');
        let targetLi = null;
        for (const li of allLis) {
          const onclick = li.getAttribute('onclick') || '';
          if (onclick.includes(`'${seccionId}'`) || onclick.includes(`"${seccionId}"`)) {
            targetLi = li;
            break;
          }
        }
        if (targetLi) {
          targetLi.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Resaltar brevemente el ítem
          const originalBg = targetLi.style.backgroundColor;
          const originalTransition = targetLi.style.transition;
          targetLi.style.transition = 'background-color 0.15s ease';
          targetLi.style.backgroundColor = 'rgba(255, 220, 80, 0.55)';
          setTimeout(() => {
            targetLi.style.backgroundColor = originalBg || '';
            setTimeout(() => {
              targetLi.style.transition = originalTransition || '';
            }, 600);
          }, 900);
        } else {
          // Si no se encuentra el li (ej: submenú dentro de submenú), fallback a posición guardada
          const savedPosition = localStorage.getItem(SCROLL_POSITION_KEY);
          if (savedPosition) {
            window.scrollTo({ top: parseInt(savedPosition, 10), behavior: 'smooth' });
          }
        }
        localStorage.removeItem(LAST_SECTION_KEY);
      });
    });
  }

  function saveScrollPosition() {
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    localStorage.setItem(SCROLL_POSITION_KEY, scrollPosition.toString());
  }

  function restoreScrollPosition() {
    const lastSection = localStorage.getItem(LAST_SECTION_KEY);
    scrollToSectionItem(lastSection);
  }

  function clearScrollPosition() {
    localStorage.removeItem(SCROLL_POSITION_KEY);
    localStorage.removeItem(LAST_SECTION_KEY);
  }

  // ======== Función para manejar el historial del navegador ========
  function setupBrowserNavigation() {
    window.addEventListener('popstate', function(event) {
      if (event.state && event.state.section) {
        // Volver a una sección/cuestionario
        showSection(event.state.section);
      } else if (event.state && event.state.submenu) {
        // Volver al submenú
        const submenuId = event.state.submenu;
        const lastSec = localStorage.getItem(LAST_SECTION_KEY);
        currentSection = null;
        document.getElementById("menu-principal")?.classList.add("oculto");
        document.querySelectorAll(".menu-principal[id$='-submenu']").forEach(s => s.style.display = "none");
        document.querySelectorAll(".pagina-cuestionario").forEach(p => p.classList.remove("activa"));
        const submenu = document.getElementById(submenuId);
        if (submenu) submenu.style.display = "block";
        // Hacer scroll al ítem del cuestionario dentro del submenú
        scrollToSectionItem(lastSec);
      } else {
        // Volver al menú principal
        showMenu();
      }
    });
    
    if (window.location.hash === '' || window.location.hash === '#menu') {
      history.replaceState({ section: null }, 'Menú Principal', '#menu');
    }
  }

  // ======== EXTRAPOLACIÓN: proyectar preguntas de exámenes únicos hacia especialidades ========
  // Las preguntas de exámenes únicos que tienen etiquetas.especialidad se copian
  // al cuestionario de la especialidad correspondiente (al final, sin mezclar opciones).
  // Se ejecuta una sola vez por sesión de página.

  // Mapa: valor de etiquetas.especialidad → key en preguntasPorSeccion
  const MAPA_ESPECIALIDAD_KEY = {
    'Pediatría'       : 'pediatria',
    'Pediatria'       : 'pediatria',
    'Cardiología'     : 'cardiologia',
    'Cardiologia'     : 'cardiologia',
    'Neurología'      : 'neurologia',
    'Neurologia'      : 'neurologia',
    'Endocrinología'  : 'endocrinologia',
    'Endocrinologia'  : 'endocrinologia',
    'Neumonología'    : 'neumonologia',
    'Neumonologia'    : 'neumonologia',
    'Nefrología'      : 'nefrologia',
    'Nefrologia'      : 'nefrologia',
    'Digestivo'       : 'digestivo',
    'Hematología'     : 'hematologia',
    'Hematologia'     : 'hematologia',
    'Infectología'    : 'infectologia',
    'Infectologia'    : 'infectologia',
    'Clínica Médica'  : 'clinicamedica',
    'Clinica Medica'  : 'clinicamedica',
    'Clínica médica'  : 'clinicamedica',
    'Ginecología'     : 'ginecologia',
    'Ginecologia'     : 'ginecologia',
    'Obstetricia'     : 'obstetricia',
    'Cirugía'         : 'cirugia',
    'Cirugia'         : 'cirugia',
    'Traumatología'   : 'traumatologia',
    'Traumatologia'   : 'traumatologia',
    'Urología'        : 'urologia',
    'Urologia'        : 'urologia',
    'Oftalmología'    : 'oftalmologia',
    'Oftalmologia'    : 'oftalmologia',
    'ORL'             : 'orl',
    'Dermatología'    : 'dermatologia',
    'Dermatologia'    : 'dermatologia',
    'Psiquiatría'     : 'psiquiatria',
    'Psiquiatria'     : 'psiquiatria',
    'Reumatología'    : 'reumatologia',
    'Reumatologia'    : 'reumatologia',
    'Toxicología'     : 'toxicologia',
    'Toxicologia'     : 'toxicologia',
    'Medicina Legal'  : 'medicinalegal',
    'Salud Pública'   : 'saludpublica',
    'Salud Publica'   : 'saludpublica',
    'Medicina Familiar': 'medicinafamiliar',
  };

  // ── Helper interno: formatea el nombreArchivo legible según el tipo de examen
  function formatearNombreArchivo(seccionId) {
    if (esExamenUnico(seccionId))
      return seccionId.replace('unico', 'Único ');   // "unico2023" → "Único 2023"
    if (esExamenUBA(seccionId))
      return seccionId.replace('uba', 'UBA ');       // "uba2019"   → "UBA 2019"
    if (esCompilado(seccionId))
      return seccionId.replace('compilado', 'Compilado '); // "compilado3" → "Compilado 3"
    return seccionId;
  }

  // ── EXTRAPOLACIÓN DESACTIVADA (v9) ─────────────────────────────────────────
  // La función aplicarExtrapolacion fue desactivada. Cada cuestionario de especialidad
  // contiene únicamente sus propias preguntas subidas directamente a Firestore.
  // La función se conserva como no-op para compatibilidad con cualquier llamada residual.
  if (!window._extrapolacionPorPar) window._extrapolacionPorPar = new Set();

  function aplicarExtrapolacion(soloSeccion, opciones) {
    // No-op: la extrapolación fue eliminada en v9.
    // Las preguntas de exámenes únicos/UBA/compilados ya NO se copian a especialidades.
    console.log('[EXTRAPOLACIÓN] Desactivada en v9 — función llamada pero ignorada');
  }

  // ── Carga dinámica de secciones ─────────────────────────────────────────────
  // En lugar de cargar preguntas.js completo al inicio, cada sección se carga
  // solo cuando el usuario la abre. Esto reduce drásticamente el tiempo de
  // carga inicial (especialmente en GitHub Pages y conexiones lentas).
  //
  // REQUISITO: Antes de usar esto, correr: node dividir-preguntas.js
  // Eso genera la carpeta /data/ con un archivo .js por sección.
  // En index.html reemplazar:
  //   <script src="preguntas.js"></script>
  // por:
  //   <script>window.preguntasPorSeccion = {};</script>

  // ── Migración v9: limpiar cachés de especialidades con preguntas extrapoladas ──
  // La extrapolación fue eliminada en v9. Esta migración limpia, UNA SOLA VEZ,
  // cualquier caché que contenga preguntas clonadas (_origenExamen) de sesiones anteriores.
  (function limpiarCacheEspecialidadesConDuplicados() {
    const MIGRATION_KEY = 'quiz_cache_dedup_migration_v2'; // v2 = migración para v9
    if (localStorage.getItem(MIGRATION_KEY)) return;
    const especialidades = Object.values(MAPA_ESPECIALIDAD_KEY).filter((v, i, a) => a.indexOf(v) === i);
    let limpiadas = 0;
    especialidades.forEach(seccionId => {
      try {
        const cacheKey = 'fb_q_cache_' + seccionId;
        const raw = localStorage.getItem(cacheKey);
        if (!raw) return;
        const cached = JSON.parse(raw);
        if (!cached || !cached.preguntas) return;
        // Quitar clones extrapolados (marcados con _origenExamen)
        const limpias = cached.preguntas.filter(p => !p._origenExamen);
        if (limpias.length !== cached.preguntas.length) {
          // Forzar recarga desde Firestore eliminando la caché obsoleta
          localStorage.removeItem(cacheKey);
          limpiadas++;
        }
      } catch (_) {}
    });
    localStorage.setItem(MIGRATION_KEY, '1');
    if (limpiadas > 0)
      console.log('🧹 Migración v9: se limpió caché de', limpiadas, 'especialidades con preguntas extrapoladas');
  })();

  const _seccionesYaCargadas = new Set();
  const _seccionesEnCarga = new Set(); // 🔒 Cargas activas desde Firestore

  /**
   * Carga las preguntas de una sección desde Firestore.
   * Estructura: preguntas/{seccionId}/items/{docId}
   * Devuelve una Promise que resuelve cuando las preguntas están listas.
   */
  const PREGUNTAS_CACHE_PREFIX = 'fb_q_cache_';
  const PREGUNTAS_CACHE_TTL    = 24 * 60 * 60 * 1000; // 24 horas

  function cargarSeccion(seccionId) {
    if (_seccionesYaCargadas.has(seccionId) ||
        (window.preguntasPorSeccion?.[seccionId]?.length > 0)) {
      _seccionesYaCargadas.add(seccionId);
      _debugLog('⚡ Ya cargada en memoria: ' + seccionId + ' → ' + (window.preguntasPorSeccion?.[seccionId]?.length || 0) + ' pregs');
      return Promise.resolve();
    }

    // ── Intentar desde caché localStorage primero ──────────────────
    _debugLog('cargarSeccion("' + seccionId + '") iniciada');
    try {
      const cached = JSON.parse(localStorage.getItem(PREGUNTAS_CACHE_PREFIX + seccionId) || 'null');
      _debugLog('caché encontrado: ' + (cached ? cached.preguntas?.length + ' pregs, ts=' + new Date(cached.ts).toLocaleTimeString() : 'null'));
      if (cached && cached.preguntas && cached.preguntas.length > 5 && cached.ts &&
          (Date.now() - cached.ts) < PREGUNTAS_CACHE_TTL) {
        if (!window.preguntasPorSeccion) window.preguntasPorSeccion = {};
        // Filtrar clones extrapolados que pudieran haberse guardado en caché en sesiones
        // anteriores. Los clones se identifican por tener _origenExamen definido.
        const preguntasLimpias = cached.preguntas.filter(p => !p._origenExamen);

        window.preguntasPorSeccion[seccionId] = preguntasLimpias;
        _seccionesYaCargadas.add(seccionId);
        _debugLog('✅ Caché OK: ' + seccionId + ' → ' + preguntasLimpias.length + ' pregs');
        console.log('📦 Caché local:', seccionId, '→', preguntasLimpias.length, 'preguntas');
        return Promise.resolve();
      }
    } catch (_) { /* caché corrupto → ignorar y cargar desde Firestore */ }

    // ── Cargar desde Firestore ──────────────────────────────────────
    _debugLog('⬇️ Bajando de Firestore: ' + seccionId);
    _seccionesEnCarga.add(seccionId); // 🔒 marcar inicio de carga
    return new Promise((resolve) => {
      function intentarCarga() {
        if (!window.__firebaseReady || !window.__firebase_firestore) {
          document.addEventListener('firebaseReady', intentarCarga, { once: true });
          return;
        }
        if (typeof fbInit === 'function') fbInit();

        setTimeout(async () => {
          try {
            const { collection, getDocs, query, orderBy } = window.__firebase_firestore;
            const db = _fbDb;
            if (!db) {
              console.warn('⚠️ Firestore no inicializado al cargar:', seccionId);
              resolve(); return;
            }
            const itemsRef = collection(db, 'preguntas', seccionId, 'items');
            const q = query(itemsRef, orderBy('_idx'));
            const snap = await getDocs(q);
            if (snap.empty) {
              console.warn('⚠️ Sin preguntas en Firestore para:', seccionId);
              resolve(); return;
            }
            let preguntas = snap.docs.map(d => {
              const { _idx, ...pregunta } = d.data();
              pregunta._firestoreIdx  = _idx; // preservar para el buscador de duplicados
              pregunta._firestoreDocId = d.id; // ID único del documento — ancla primaria para progreso
              return pregunta;
            });

            if (!window.preguntasPorSeccion) window.preguntasPorSeccion = {};
            window.preguntasPorSeccion[seccionId] = preguntas;

            // ── Aplicar ediciones de admin (con caché de 1 hora) ──────
            try {
              const EDIT_CACHE_KEY = 'fb_edits_cache_' + seccionId;
              let ediciones = null;
              try {
                const ec = JSON.parse(localStorage.getItem(EDIT_CACHE_KEY) || 'null');
                if (ec && ec.ts && (Date.now() - ec.ts) < 60 * 60 * 1000) {
                  ediciones = ec.data; // usar caché de ediciones (< 1 hora)
                  console.log('📦 Ediciones admin desde caché:', seccionId);
                }
              } catch (_) {}

              if (ediciones === null) {
                // Leer ediciones desde Firestore y cachear
                const { collection: col2, query: q2, where: w2, getDocs: gd2 } = window.__firebase_firestore;
                const editQ = q2(col2(db, 'questions'), w2('seccionId', '==', seccionId));
                const editSnap = await gd2(editQ);
                ediciones = [];
                editSnap.forEach(d => ediciones.push(d.data()));
                try {
                  localStorage.setItem(EDIT_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: ediciones }));
                } catch (_) {}
                if (ediciones.length > 0)
                  console.log('✏️ Ediciones admin cargadas y cacheadas:', seccionId, '→', ediciones.length);
              }

              // ed.qIndex es base 1 (Firestore) → convertir a base 0 para el array interno
              ediciones.forEach(ed => {
                const idx = ed.qIndex - 1;
                if (!preguntas[idx]) return;
                if (ed.pregunta    !== undefined) preguntas[idx].pregunta    = ed.pregunta;
                if (ed.opciones    !== undefined) {
                  // FIX Bug 2: sanear el array de opciones — si algún elemento es un objeto
                  // (p.ej. un Timestamp de Firestore guardado por error), convertirlo a string
                  // vacío y filtrar, evitando que aparezca como "2026-12-18 00:00:00" en el UI.
                  preguntas[idx].opciones = ed.opciones.map(o =>
                    (o === null || o === undefined) ? '' :
                    (typeof o === 'object')         ? (typeof o.toDate === 'function' ? o.toDate().toISOString() : '') :
                    String(o)
                  ).filter(o => o !== '');
                }
                if (ed.correcta    !== undefined) preguntas[idx].correcta    = ed.correcta;
                if (ed.explicacion !== undefined) preguntas[idx].explicacion = ed.explicacion;
                if (ed.imagen      !== undefined) preguntas[idx].imagen      = ed.imagen;
              });
            } catch (editErr) {
              console.warn('No se pudieron cargar ediciones de admin:', editErr.message);
            }

            // ── Guardar preguntas en caché localStorage ───────────────
            try {
              localStorage.setItem(
                PREGUNTAS_CACHE_PREFIX + seccionId,
                JSON.stringify({ ts: Date.now(), preguntas })
              );
            } catch (_) {
              // Quota exceeded: eliminar el caché más viejo para hacer espacio y reintentar
              try {
                const cacheKeys = Object.keys(localStorage).filter(k => k.startsWith(PREGUNTAS_CACHE_PREFIX));
                if (cacheKeys.length > 0) {
                  cacheKeys.sort((a, b) => {
                    try {
                      const ta = JSON.parse(localStorage.getItem(a))?.ts || 0;
                      const tb = JSON.parse(localStorage.getItem(b))?.ts || 0;
                      return ta - tb;
                    } catch { return 0; }
                  });
                  localStorage.removeItem(cacheKeys[0]);
                  console.log('🧹 Caché lleno: se eliminó el más viejo (' + cacheKeys[0] + ') para hacer espacio');
                }
                localStorage.setItem(
                  PREGUNTAS_CACHE_PREFIX + seccionId,
                  JSON.stringify({ ts: Date.now(), preguntas })
                );
              } catch (_2) { /* si aun así falla, continuar sin caché */ }
            }

            _seccionesYaCargadas.add(seccionId);
            _seccionesEnCarga.delete(seccionId); // 🔓 desmarcar
            _debugLog('✅ Firestore OK: ' + seccionId + ' → ' + preguntas.length + ' pregs');
            console.log('✅ Firestore→caché:', seccionId, '→', preguntas.length, 'preguntas');
            if (esCompilado(seccionId) && window._extrapolacionAplicada) {
                aplicarExtrapolacion(seccionId);
              }
            resolve();
          } catch (e) {
            _seccionesEnCarga.delete(seccionId); // 🔓 desmarcar en error
            _debugLog('❌ ERROR Firestore: ' + seccionId + ' — ' + e.message);
            console.error('❌ Error cargando desde Firestore:', seccionId, e);
            resolve();
          }
        }, 0);
      }
      intentarCarga();
    });
  }

  /**
   * Muestra un spinner mientras se descarga el archivo de la sección.
   */
  function mostrarSpinnerCarga(seccionId) {
    const cont = document.getElementById(`cuestionario-${seccionId}`);
    if (cont) {
      cont.innerHTML = `
        <div style="text-align:center;padding:60px 20px;color:#64748b;">
          <div style="width:42px;height:42px;border:4px solid #e2e8f0;
            border-top-color:#0891b2;border-radius:50%;
            animation:spin 0.7s linear infinite;margin:0 auto 16px;"></div>
          <p style="font-size:0.95rem;">Cargando preguntas…</p>
        </div>
        <style>@keyframes spin{to{transform:rotate(360deg);}}</style>`;
    }
  }

  function showSection(seccionId) {
    currentSection = seccionId;
    document.getElementById("menu-principal")?.classList.add("oculto");
    // Ocultar todos los submenús
    document.querySelectorAll(".menu-principal[id$='-submenu']").forEach(s => s.style.display = "none");
    document.querySelectorAll(".pagina-cuestionario").forEach(p => p.classList.remove("activa"));

    const page = document.getElementById(seccionId);
    if (!page) return;

    page.classList.add("activa");
    window.scrollTo(0, 0);

    // Mostrar spinner mientras se descarga el archivo de la sección
    mostrarSpinnerCarga(seccionId);

    cargarSeccion(seccionId).then(() => {
      // El simulador necesita TODAS las especialidades para armar el examen combinado
      if (seccionId === 'simulador') {
        const especialidades = [
          'pediatria','cardiologia','neurologia','endocrinologia','neumonologia',
          'nefrologia','digestivo','hematologia','infectologia','clinicamedica',
          'ginecologia','obstetricia','cirugia','traumatologia','urologia',
          'of','orl','dermatologia','psiquiatria','reumatologia',
          'toxicologia','medicinalegal','saludpublica','medicinafamiliar'
        ];
        return Promise.all(especialidades.map(cargarSeccion));
      }
      return Promise.resolve();
    }).then(() => {
      // Guard: si el usuario volvio al menu o abrio otra seccion mientras
      // Firestore cargaba, cancelar el render para que no aparezca debajo del menu.
      if (currentSection !== seccionId) return;

      aplicarExtrapolacion(esCompilado(seccionId) ? seccionId : undefined);
      // Si es una especialidad (no compilado, no simulador), forzar re-extrapolación
      // de todas las fuentes ya en memoria (Únicos, UBA y compilados) hacia esta
      // especialidad. Esto cubre el caso en que esas fuentes se cargaron en caché
      // ANTES de que la especialidad estuviera en memoria, por lo que la extrapolación
      // global no pudo inyectarlas (preguntasPorSeccion[key] no existía aún).
      if (!esCompilado(seccionId) && !esExamenOficial(seccionId) && seccionId !== 'simulador') {
        aplicarExtrapolacion(undefined, { hacia: seccionId });
      }
      if (seccionId === 'simulador') {
        const preguntasSimulacro = obtenerPreguntasSimulacro();
        preguntasPorSeccion['simulador'] = preguntasSimulacro.map(item => item.pregunta);
      }

      _scrollOnNextRender = true;
      (window.generarCuestionario || generarCuestionario)(seccionId);

      if (seccionId === 'simulador') {
        const timerState = loadJSON(TIMER_STORAGE_KEY, null);
        if (timerState && timerState.startTime) {
          iniciarTemporizador();
        }
      }
    });
  }


  function _ejecutarShowMenu() {
    // Detener el temporizador si estábamos en el simulacro
    if (currentSection === 'simulador') {
      detenerTemporizador();
    }

    if (currentSection && preguntasPorSeccion[currentSection]) {
      // Limpiar el estado solo si el cuestionario ya fue completado (totalShown)
      clearSectionStateIfCompletedAndBack(currentSection);

      // Si es el simulacro con progreso: ya se maneja en volverAlMenuSimulacro
      // Para todos los demás: PRESERVAR el estado (no limpiar nada)
      // Las respuestas ya están guardadas en localStorage desde responderPregunta()
      // Re-mezclar preguntas sin responder para que al volver el orden sea nuevo
      const _s = state[currentSection];
      if (_s && Array.isArray(_s.unansweredOrder) && !_s.totalShown &&
          currentSection !== 'simulador' &&
          !esExamenUnico(currentSection) && !esExamenUBA(currentSection) &&
          !esCompilado(currentSection) &&
          !(_currentUserData && _currentUserData.role === 'admin')) {
        _s.unansweredOrder = [];
        saveJSON(STORAGE_KEY, state);
      }
    }

    sessionStorage.removeItem('quiz_active_section'); // Ya no hay sección activa
    currentSection = null;
    // Siempre asegurar que la URL quede en #menu
    history.replaceState({ section: null }, 'Menú Principal', '#menu');
    document.getElementById("menu-principal")?.classList.remove("oculto");
    document.querySelectorAll(".menu-principal[id$='-submenu']").forEach(s => s.style.display = "none");
    document.querySelectorAll(".pagina-cuestionario").forEach(p => p.classList.remove("activa"));

    restoreScrollPosition();
  }

  function showMenu() {
    cerrarTodasLasExplicaciones();
    _ejecutarShowMenu();
  }

  let lastShuffleTemp = {};

  // ── Cierra todas las explicaciones abiertas en todas las secciones ──
  // Actúa tanto en el DOM como en el estado persistido.
  function cerrarTodasLasExplicaciones() {
    // 1. Limpiar el estado persistido
    let cambio = false;
    Object.keys(state).forEach(seccionId => {
      if (state[seccionId] && state[seccionId].explanationShown) {
        const tieneAbiertas = Object.values(state[seccionId].explanationShown).some(v => v);
        if (tieneAbiertas) {
          state[seccionId].explanationShown = {};
          cambio = true;
        }
      }
    });
    if (cambio) saveJSON(STORAGE_KEY, state);

    // 2. Ocultar en el DOM todos los divs de explicación visibles
    document.querySelectorAll('[id^="explicacion-"]').forEach(el => {
      if (el.style.display !== 'none' && el.style.display !== '') {
        el.style.display = 'none';
        // Restaurar texto del botón correspondiente
        // id formato: "explicacion-{seccionId}-{qIndex}"
        const prefijo = 'explicacion-';
        const sinPrefijo = el.id.slice(prefijo.length); // "{seccionId}-{qIndex}"
        const ultimoGuion = sinPrefijo.lastIndexOf('-');
        if (ultimoGuion !== -1) {
          const secId = sinPrefijo.slice(0, ultimoGuion);
          const btn = document.getElementById(`btn-explicacion-${secId}-${sinPrefijo.slice(ultimoGuion + 1)}`);
          if (btn) {
            const tieneContenido = el.dataset.tieneContenido === '1';
            btn.textContent = tieneContenido ? 'Ver explicación' : '➕ Agregar explicación';
          }
        }
      }
    });
  }
  window.cerrarTodasLasExplicaciones = cerrarTodasLasExplicaciones;

  // ======== Helper: limpiar sección con o sin aleatorización de opciones ========
  // aleatorizar=true  → borra shuffleMap → las opciones se re-mezclan al regenerar
  // aleatorizar=false → conserva shuffleMap → las opciones mantienen el orden previo
  function limpiarSeccion(seccionId, aleatorizar) {
    const s = state[seccionId];

    if (aleatorizar) {
      // Borrar completamente → nueva aleatorización de preguntas y opciones al regenerar
      delete state[seccionId];
    } else {
      // Conservar shuffleMap (orden de opciones) y unansweredOrder (orden de preguntas)
      const shuffleMapGuardado = (s && s.shuffleMap)
        ? JSON.parse(JSON.stringify(s.shuffleMap))
        : {};
      const answeredOrderGuardado = s && s.answeredOrder ? s.answeredOrder.slice() : [];
      const unansweredOrderGuardado = s && s.unansweredOrder ? s.unansweredOrder.slice() : [];

      state[seccionId] = {
        shuffleFrozen: true,
        shuffleMap: shuffleMapGuardado,
        answeredOrder: [],
        // Restaurar todas las preguntas al orden no-respondido, preservando su secuencia
        unansweredOrder: [...answeredOrderGuardado, ...unansweredOrderGuardado],
        answers: {},
        graded: {},
        totalShown: false,
        explanationShown: {}
      };
    }

    saveJSON(STORAGE_KEY, state);

    if (window.puntajesPorSeccion && window.puntajesPorSeccion[seccionId]) {
      window.puntajesPorSeccion[seccionId] = Array(
        (preguntasPorSeccion[seccionId] || []).length
      ).fill(null);
    }

    const resultadoTotal = document.getElementById(`resultado-total-${seccionId}`);
    if (resultadoTotal) {
      resultadoTotal.innerHTML = "";
      resultadoTotal.className = "resultado-final";
    }
  }

  function shuffle(arr, qKey = null) {
    const a = arr.slice();

    let seed = Date.now();
    function random() {
      seed ^= seed << 13;
      seed ^= seed >> 17;
      seed ^= seed << 5;
      return Math.abs(seed) / 0xFFFFFFFF;
    }

    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }

    if (qKey) {
      const prev = lastShuffleTemp[qKey];
      let attempts = 0;
      while (prev && JSON.stringify(prev) === JSON.stringify(a) && attempts < 10) {
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(random() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        attempts++;
      }
      lastShuffleTemp[qKey] = a.slice();
    }

    return a;
  }

  function ensureSectionState(seccionId, preguntasLen) {
    if (!state[seccionId]) {
      console.log('🆕 Inicializando estado para:', seccionId);
      state[seccionId] = {
        shuffleFrozen: false,
        shuffleMap: {},
        answeredOrder: [], // Solo guardamos el orden de las respondidas
        unansweredOrder: [], // Orden aleatorizado de las sin responder (se mantiene durante la sesión)
        answers: {},
        graded: {},
        totalShown: false,
        explanationShown: {}  // tracking de explicaciones mostradas
      };
    }
    
    // Asegurar que exista unansweredOrder si no está (compatibilidad con estados antiguos)
    if (!state[seccionId].unansweredOrder) {
      state[seccionId].unansweredOrder = [];
    }

    // Si hay preguntas nuevas que el estado guardado no conocía (añadidas por el admin
    // después de que el usuario inició el intento), agregarlas a unansweredOrder en
    // posición aleatoria para que aparezcan en el cuestionario sin alterar el resto.
    // IMPORTANTE: usar graded como fuente de verdad (no unansweredOrder que puede llegar vacío
    // desde la nube), para no corromper el state recién sincronizado ni disparar un saveJSON
    // que pisaría Firestore con datos incorrectos.
    // FIX: verificar cada índice individualmente para no re-insertar preguntas ya respondidas
    // (que vienen en answeredOrder o graded) cuando unansweredOrder llega vacío desde la nube.
    {
      const answeredSet   = new Set((state[seccionId].answeredOrder || []).map(e => typeof e === 'number' ? e : e.idx));      
      const gradedSet     = new Set(Object.keys(state[seccionId].graded || {}).map(Number));
      const unansweredSet = new Set(state[seccionId].unansweredOrder || []);
      let huboNuevas = false;
      for (let i = 0; i < preguntasLen; i++) {
        if (answeredSet.has(i) || gradedSet.has(i) || unansweredSet.has(i)) continue;
        // Índice genuinamente nuevo (no estaba en ninguna lista): insertar en posición aleatoria
        const pos = Math.floor(Math.random() * (state[seccionId].unansweredOrder.length + 1));
        state[seccionId].unansweredOrder.splice(pos, 0, i);
        unansweredSet.add(i);
        huboNuevas = true;
      }
      // Solo guardar localmente si hubo cambios y NO estamos en medio de una sync desde la nube
      if (huboNuevas && !window._fbSyncInProgress) {
        saveJSON(STORAGE_KEY, state);
      }
    }
    
    if (!window.puntajesPorSeccion) window.puntajesPorSeccion = {};
    if (!window.puntajesPorSeccion[seccionId]) {
      window.puntajesPorSeccion[seccionId] = Array(preguntasLen).fill(null);
    }
  }

  function getSectionTitle(seccionId) {
    const page = document.getElementById(seccionId);
    if (!page) return cap(seccionId);
    const h1 = page.querySelector("h1, h2, .titulo-seccion");
    return (h1 && h1.textContent.trim()) || cap(seccionId);
  }

  // Devuelve mapping inverso mezclado -> original y opciones mezcladas
  function getOrBuildShuffleForQuestion(seccionId, qIndex, opciones) {
    const s = state[seccionId];

    // En exámenes únicos, UBA y compilados (cuestionarios de origen): opciones en orden original.
    // Las preguntas extrapoladas hacia especialidades se mezclan normalmente.
    // Admin: también opciones en orden original en especialidades (para editar sin que cambien de lugar).
    const preg = (preguntasPorSeccion[seccionId] || [])[qIndex];
    if (esExamenUnico(seccionId) || esExamenUBA(seccionId) || esCompilado(seccionId) ||
        (_currentUserData && _currentUserData.role === 'admin')) {
      const inv = {};
      opciones.forEach((_, i) => { inv[i] = i; });
      return { inv, opcionesMezcladas: opciones.slice() };
    }

    if (s.shuffleMap[qIndex]) {
      const inv = s.shuffleMap[qIndex];
      const opcionesMezcladas = [];
      Object.keys(inv).forEach(mixed => {
        const original = inv[mixed];
        opcionesMezcladas[mixed] = opciones[original];
      });
      return { inv, opcionesMezcladas };
    }
    
    const indices = opciones.map((_, i) => i);
    const shuffled = shuffle(indices, seccionId + "-" + qIndex);
    const inv = {};
    shuffled.forEach((origIdx, mixedIdx) => {
      inv[mixedIdx] = origIdx;
    });
    const opcionesMezcladas = shuffled.map(i => opciones[i]);
    return { inv, opcionesMezcladas };
  }

  // Congela el shuffle de las opciones de UNA pregunta específica
  function freezeShuffleForQuestion(seccionId, qIndex) {
    const s = state[seccionId];
    const cont = document.getElementById(`cuestionario-${seccionId}`);
    if (!cont) return;

    // Solo congelar esta pregunta específica
    const inputs = cont.querySelectorAll(`input[name="pregunta${seccionId}${qIndex}"]`);
    const inv = {};
    inputs.forEach((input, mixedIdx) => {
      const original = parseInt(input.getAttribute("data-original-index"), 10);
      inv[mixedIdx] = isNaN(original) ? mixedIdx : original;
    });
    s.shuffleMap[qIndex] = inv;
    console.log('🔒 Opciones congeladas para pregunta', qIndex, ':', inv);
    saveJSON(STORAGE_KEY, state);
  }

  // Función legacy mantenida por compatibilidad
  function freezeCurrentShuffle(seccionId) {
    // Ya no congela todas, solo marca como congelado
    const s = state[seccionId];
    s.shuffleFrozen = true;
    saveJSON(STORAGE_KEY, state);
  }

  function clearSectionStateIfCompletedAndBack(seccionId) {
    const s = state[seccionId];
    if (!s) return;
    if (s.totalShown) {
      delete state[seccionId];
      saveJSON(STORAGE_KEY, state);
      if (window.puntajesPorSeccion && window.puntajesPorSeccion[seccionId]) {
        window.puntajesPorSeccion[seccionId] = Array(
          (preguntasPorSeccion[seccionId] || []).length
        ).fill(null);
      }
      const resultadoTotal = document.getElementById(`resultado-total-${seccionId}`);
      if (resultadoTotal) {
        resultadoTotal.textContent = "";
        resultadoTotal.className = "resultado-final";
      }
    }
  }

  // ======== Función para mostrar/ocultar explicación ========
  function mostrarExplicacion(seccionId, qIndex) {
    // Solo permitir ver la explicación si ya se respondió la pregunta
    if (!state[seccionId].graded || !state[seccionId].graded[qIndex]) {
      alert("Debes responder la pregunta primero para ver la explicación.");
      return;
    }

    const explicacionDiv = document.getElementById(`explicacion-${seccionId}-${qIndex}`);
    const btnExplicacion = document.getElementById(`btn-explicacion-${seccionId}-${qIndex}`);
    if (!explicacionDiv) return;
    
    const _tieneContenido = explicacionDiv.dataset.tieneContenido === '1';
    
    if (explicacionDiv.style.display === "none" || explicacionDiv.style.display === "") {
      // Mostrar explicación
      explicacionDiv.style.display = "block";
      if (btnExplicacion) btnExplicacion.textContent = "Ocultar explicación";
      
      // Marcar como mostrada
      if (!state[seccionId].explanationShown) state[seccionId].explanationShown = {};
      state[seccionId].explanationShown[qIndex] = true;
      saveJSON(STORAGE_KEY, state);
    } else {
      // Ocultar explicación
      explicacionDiv.style.display = "none";
      if (btnExplicacion) {
        btnExplicacion.textContent = _tieneContenido ? "Ver explicación" : "➕ Agregar explicación";
      }
      
      // Marcar como oculta
      if (state[seccionId].explanationShown) state[seccionId].explanationShown[qIndex] = false;
      saveJSON(STORAGE_KEY, state);
    }
  }

  function restoreSelectionsAndGrades(seccionId) {
    const s = state[seccionId];
    if (!s) return;

    const preguntas = preguntasPorSeccion[seccionId] || [];
    // Solo restaurar preguntas que ya están renderizadas en el DOM
    const idxEnDOM = new Set();
    const cont = document.getElementById(`cuestionario-${seccionId}`);
    if (cont) {
      cont.querySelectorAll('[id^="puntaje-' + seccionId + '-"]').forEach(el => {
        const idx = parseInt(el.id.replace(`puntaje-${seccionId}-`, ''), 10);
        if (!isNaN(idx)) idxEnDOM.add(idx);
      });
    }

    preguntas.forEach((preg, idx) => {
      if (!idxEnDOM.has(idx)) return; // aún no renderizada, saltar
      const name = `pregunta${seccionId}${idx}`;
      const inputs = Array.from(document.getElementsByName(name));
      // Usar el índice resuelto por texto (getDisplayOrder ya actualizó s.answers al índice correcto)
      const guardadas = (s.answers && s.answers[idx]) || [];
      guardadas.forEach(mixedIdx => {
        if (inputs[mixedIdx]) inputs[mixedIdx].checked = true;
      });

      if (s.graded && s.graded[idx]) {
        const puntajeElem = document.getElementById(`puntaje-${seccionId}-${idx}`);
        // shuffleMap puede no existir para exámenes únicos/UBA (orden original) → usar identity
        let mInv = state[seccionId].shuffleMap[idx];
        if (!mInv) {
          mInv = {};
          (preg.opciones || []).forEach((_, i) => { mInv[i] = i; });
        }
        const seleccionOriginal = guardadas.map(i => mInv[i]).sort();
        const correctaOriginal = preg.correcta.slice().sort();

        const isCorrect = JSON.stringify(seleccionOriginal) === JSON.stringify(correctaOriginal);
        if (isCorrect) {
          puntajeElem.textContent = "✅ Correcto (+1)";
        } else {
          puntajeElem.textContent = "❌ Incorrecto (0)";
        }

        const correctasMezcladas = correctaOriginal.map(ori =>
          parseInt(Object.keys(mInv).find(k => mInv[k] === ori), 10)
        );
        correctasMezcladas.forEach(i => {
          if (!isNaN(i) && inputs[i]) {
            inputs[i].parentElement.style.backgroundColor = "#eafaf1";
            inputs[i].parentElement.style.borderColor = "#1e7e34";
          }
        });
        guardadas.forEach(i => {
          const idxOriginal = mInv[i];
          if (!preg.correcta.includes(idxOriginal) && inputs[i]) {
            inputs[i].parentElement.style.backgroundColor = "#fdecea";
            inputs[i].parentElement.style.borderColor = "#c0392b";
          }
        });

        inputs.forEach(inp => (inp.disabled = true));
        const btn = inputs[0]?.closest(".pregunta")?.querySelector("button.btn-responder");
        if (btn) btn.disabled = true;

        if (!window.puntajesPorSeccion[seccionId]) window.puntajesPorSeccion[seccionId] = [];
        window.puntajesPorSeccion[seccionId][idx] = isCorrect ? 1 : 0;
      }

      // Restaurar estado de explicación si estaba mostrada
      if (s.explanationShown && s.explanationShown[idx]) {
        const explicacionDiv = document.getElementById(`explicacion-${seccionId}-${idx}`);
        const btnExplicacion = document.getElementById(`btn-explicacion-${seccionId}-${idx}`);
        if (explicacionDiv && btnExplicacion) {
          explicacionDiv.style.display = "block";
          btnExplicacion.textContent = "Ocultar explicación";
        }
      }
    });
  }

  // ======== FUNCIONES DEL TEMPORIZADOR DEL SIMULACRO ========
  
  function iniciarTemporizador() {
    // Solo iniciar si estamos en el simulacro
    if (currentSection !== 'simulador') return;
    
    // Si ya hay un temporizador corriendo, no iniciar otro
    if (timerInterval) return;
    
    // Cargar estado del temporizador desde localStorage
    const timerState = loadJSON(TIMER_STORAGE_KEY, null);
    
    if (timerState && timerState.startTime) {
      // Recuperar temporizador existente
      timerStartTime = timerState.startTime;
      alertasRealizadas = timerState.alertas || alertasRealizadas;
      console.log('⏰ Temporizador recuperado:', new Date(timerStartTime));
    } else {
      // Iniciar nuevo temporizador
      timerStartTime = Date.now();
      alertasRealizadas = {
        '1h': false,
        '30min': false,
        '15min': false,
        '5min': false
      };
      saveJSON(TIMER_STORAGE_KEY, {
        startTime: timerStartTime,
        alertas: alertasRealizadas
      });
      console.log('⏰ Temporizador iniciado:', new Date(timerStartTime));
    }
    
    // Crear el elemento del temporizador si no existe
    crearElementoTemporizador();
    
    // Iniciar el intervalo
    timerInterval = setInterval(actualizarTemporizador, 1000);
    actualizarTemporizador(); // Actualizar inmediatamente
  }
  
  function crearElementoTemporizador() {
    // Verificar si ya existe
    if (document.getElementById('timer-simulacro')) return;
    
    // Inyectar estilos del temporizador si no existen
    if (!document.getElementById('timer-simulacro-styles')) {
      const style = document.createElement('style');
      style.id = 'timer-simulacro-styles';
      style.textContent = `
        #timer-simulacro {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 9998;
          background: linear-gradient(145deg, rgba(13,116,144,0.97) 0%, rgba(8,91,114,0.97) 100%);
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.22), 0 2px 8px rgba(13,116,144,0.3), inset 0 1px 0 rgba(255,255,255,0.15);
          padding: 14px 22px 16px;
          min-width: 170px;
          text-align: center;
          color: #fff;
          border: 1px solid rgba(255,255,255,0.12);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          transition: background 0.8s ease, box-shadow 0.5s ease;
          cursor: default;
          user-select: none;
        }
        #timer-simulacro.timer-amarillo {
          background: linear-gradient(145deg, rgba(202,138,4,0.97) 0%, rgba(161,110,0,0.97) 100%);
          box-shadow: 0 8px 32px rgba(0,0,0,0.22), 0 2px 8px rgba(202,138,4,0.35);
        }
        #timer-simulacro.timer-naranja {
          background: linear-gradient(145deg, rgba(234,88,12,0.97) 0%, rgba(194,65,12,0.97) 100%);
          box-shadow: 0 8px 32px rgba(0,0,0,0.22), 0 2px 8px rgba(234,88,12,0.35);
        }
        #timer-simulacro.timer-marron {
          background: linear-gradient(145deg, rgba(120,53,15,0.97) 0%, rgba(92,40,10,0.97) 100%);
          box-shadow: 0 8px 32px rgba(0,0,0,0.22), 0 2px 8px rgba(120,53,15,0.35);
        }
        #timer-simulacro.timer-rojo {
          background: linear-gradient(145deg, rgba(220,38,38,0.97) 0%, rgba(185,28,28,0.97) 100%);
          box-shadow: 0 8px 32px rgba(0,0,0,0.22), 0 2px 8px rgba(220,38,38,0.4);
          animation: timerPulso 1.5s infinite;
        }
        @keyframes timerPulso {
          0%, 100% { box-shadow: 0 8px 32px rgba(0,0,0,0.22), 0 2px 8px rgba(220,38,38,0.4); }
          50% { box-shadow: 0 8px 32px rgba(0,0,0,0.22), 0 4px 20px rgba(220,38,38,0.7); }
        }
        #timer-simulacro .timer-label {
          font-size: 0.68rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          opacity: 0.75;
          margin-bottom: 4px;
        }
        #timer-simulacro .timer-icon {
          font-size: 1rem;
          margin-bottom: 2px;
          opacity: 0.85;
        }
        #timer-display {
          font-family: 'Courier New', 'Lucida Console', monospace;
          font-size: 1.55rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          line-height: 1.1;
          text-shadow: 0 1px 4px rgba(0,0,0,0.25);
        }
        #timer-simulacro .timer-barra-wrap {
          margin-top: 8px;
          height: 3px;
          background: rgba(255,255,255,0.2);
          border-radius: 99px;
          overflow: hidden;
        }
        #timer-barra {
          height: 100%;
          border-radius: 99px;
          background: rgba(255,255,255,0.7);
          transition: width 1s linear;
        }
        @keyframes timerEntrada {
          0% { opacity: 0; transform: translateY(-16px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        #timer-simulacro { animation: timerEntrada 0.45s cubic-bezier(0.34,1.56,0.64,1) both; }

        /* ===== ALERTAS FLOTANTES DE TIEMPO ===== */
        .simulacro-alerta {
          position: fixed;
          top: 90px;
          right: 20px;
          z-index: 10001;
          min-width: 280px;
          max-width: 340px;
          border-radius: 14px;
          padding: 16px 22px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.1);
          color: #fff;
          font-weight: 600;
          font-size: 0.95rem;
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid rgba(255,255,255,0.18);
          pointer-events: none;
          animation: alertaEntrada 0.4s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        .simulacro-alerta.saliendo {
          animation: alertaSalida 0.45s ease-in forwards;
        }
        @keyframes alertaEntrada {
          0% { opacity: 0; transform: translateX(40px) scale(0.92); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes alertaSalida {
          0% { opacity: 1; transform: translateX(0) scale(1); }
          100% { opacity: 0; transform: translateX(40px) scale(0.92); }
        }
        .simulacro-alerta .alerta-icono {
          font-size: 1.5rem;
          flex-shrink: 0;
        }
        .simulacro-alerta .alerta-texto-titulo {
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          opacity: 0.82;
          margin-bottom: 2px;
        }
        .simulacro-alerta .alerta-texto-cuerpo {
          font-size: 1rem;
          font-weight: 700;
          line-height: 1.25;
        }
        .simulacro-alerta .alerta-texto-sub {
          font-size: 0.78rem;
          opacity: 0.78;
          margin-top: 2px;
        }

        /* ===== MODAL TERMINAR SIMULACRO ===== */
        #modal-terminar-simulacro {
          position: fixed;
          inset: 0;
          z-index: 20000;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(15,23,42,0.6);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          animation: overlayEntrada 0.2s ease both;
        }
        @keyframes overlayEntrada {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        #modal-terminar-simulacro .modal-caja {
          background: #fff;
          border-radius: 20px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.1);
          padding: 38px 40px 32px;
          max-width: 460px;
          width: 90%;
          text-align: center;
          animation: modalEntrada 0.35s cubic-bezier(0.34,1.56,0.64,1) both;
          position: relative;
        }
        @keyframes modalEntrada {
          from { opacity: 0; transform: scale(0.88) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        #modal-terminar-simulacro .modal-icono {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #fee2e2, #fecaca);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.7rem;
          margin: 0 auto 18px;
        }
        #modal-terminar-simulacro .modal-titulo {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 10px;
          line-height: 1.3;
        }
        #modal-terminar-simulacro .modal-mensaje {
          font-size: 0.92rem;
          color: #64748b;
          line-height: 1.6;
          margin-bottom: 28px;
        }
        #modal-terminar-simulacro .modal-btns {
          display: flex;
          gap: 12px;
          justify-content: center;
        }
        #modal-terminar-simulacro .modal-btns button {
          padding: 12px 28px;
          border-radius: 10px;
          font-size: 0.92rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.18s ease;
          min-width: 130px;
        }
        #modal-terminar-simulacro .btn-modal-cancelar {
          background: #f1f5f9;
          color: #475569;
        }
        #modal-terminar-simulacro .btn-modal-cancelar:hover {
          background: #e2e8f0;
        }
        #modal-terminar-simulacro .btn-modal-aceptar {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          color: #fff;
          box-shadow: 0 4px 12px rgba(220,38,38,0.3);
        }
        #modal-terminar-simulacro .btn-modal-aceptar:hover {
          background: linear-gradient(135deg, #b91c1c, #991b1b);
          box-shadow: 0 6px 18px rgba(220,38,38,0.4);
          transform: translateY(-1px);
        }

        /* ===== MODAL TIEMPO AGOTADO ===== */
        #modal-tiempo-agotado {
          position: fixed;
          inset: 0;
          z-index: 20000;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(15,23,42,0.7);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          animation: overlayEntrada 0.3s ease both;
        }
        #modal-tiempo-agotado .modal-caja {
          background: #fff;
          border-radius: 20px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.3);
          padding: 42px 44px 36px;
          max-width: 480px;
          width: 90%;
          text-align: center;
          animation: modalEntrada 0.4s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        #modal-tiempo-agotado .modal-icono-grande {
          font-size: 3.5rem;
          margin-bottom: 16px;
          animation: iconoBounce 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.3s both;
        }
        @keyframes iconoBounce {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
        #modal-tiempo-agotado .modal-titulo {
          font-size: 1.6rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 8px;
        }
        #modal-tiempo-agotado .modal-subtitulo {
          font-size: 0.95rem;
          color: #64748b;
          margin-bottom: 24px;
          line-height: 1.5;
        }
        #modal-tiempo-agotado .modal-score {
          background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
          border: 1px solid #bae6fd;
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 24px;
        }
        #modal-tiempo-agotado .modal-score-label {
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #0d7490;
          font-weight: 600;
          margin-bottom: 4px;
        }
        #modal-tiempo-agotado .modal-score-num {
          font-size: 2rem;
          font-weight: 800;
          color: #0d7490;
        }
        #modal-tiempo-agotado .modal-btns {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        #modal-tiempo-agotado .btn-revisar {
          padding: 14px 24px;
          border-radius: 10px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          background: linear-gradient(135deg, #0d7490, #0891b2);
          color: #fff;
          box-shadow: 0 4px 12px rgba(13,116,144,0.3);
          transition: all 0.18s ease;
        }
        #modal-tiempo-agotado .btn-revisar:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(13,116,144,0.4);
        }
        #modal-tiempo-agotado .btn-salir-revision {
          padding: 12px 24px;
          border-radius: 10px;
          font-size: 0.92rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          background: #f1f5f9;
          color: #475569;
          transition: all 0.18s ease;
        }
        #modal-tiempo-agotado .btn-salir-revision:hover { background: #e2e8f0; }

        /* ===== BOTÓN TERMINAR SIMULACRO ===== */
        #btn-terminar-simulacro {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
          color: #fff;
          border: none;
          padding: 12px 26px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 600;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(220,38,38,0.25);
          letter-spacing: 0.02em;
        }
        #btn-terminar-simulacro:hover {
          background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%);
          box-shadow: 0 6px 18px rgba(220,38,38,0.38);
          transform: translateY(-1px);
        }
        #btn-terminar-simulacro:active { transform: translateY(0); }

        /* ===== MODO REVISIÓN ===== */
        .modo-revision-banner {
          background: linear-gradient(135deg, #1e293b, #0f172a);
          color: #e2e8f0;
          text-align: center;
          padding: 12px 20px;
          font-size: 0.88rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
      `;
      document.head.appendChild(style);
    }
    
    const timerDiv = document.createElement('div');
    timerDiv.id = 'timer-simulacro';
    timerDiv.innerHTML = `
      <div class="timer-icon">⏱</div>
      <div class="timer-label">Tiempo restante</div>
      <div id="timer-display">04:00:00</div>
      <div class="timer-barra-wrap"><div id="timer-barra" style="width:100%"></div></div>
    `;
    document.body.appendChild(timerDiv);
  }
  
  function actualizarTemporizador() {
    if (!timerStartTime || currentSection !== 'simulador') {
      detenerTemporizador();
      return;
    }
    
    const tiempoTranscurrido = Date.now() - timerStartTime;
    const tiempoRestante = Math.max(0, timerDuration - tiempoTranscurrido);
    
    // Actualizar display
    const display = document.getElementById('timer-display');
    if (display) {
      const horas = Math.floor(tiempoRestante / (60 * 60 * 1000));
      const minutos = Math.floor((tiempoRestante % (60 * 60 * 1000)) / (60 * 1000));
      const segundos = Math.floor((tiempoRestante % (60 * 1000)) / 1000);
      display.textContent = `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
      
      // Actualizar barra de progreso
      const barra = document.getElementById('timer-barra');
      if (barra) {
        const pct = Math.max(0, (tiempoRestante / timerDuration) * 100);
        barra.style.width = pct + '%';
      }
      
      // Cambiar clase de color según tiempo restante (usando clases CSS)
      const timerDiv = document.getElementById('timer-simulacro');
      if (timerDiv) {
        timerDiv.classList.remove('timer-amarillo','timer-naranja','timer-marron','timer-rojo');
        if (tiempoRestante <= 5 * 60 * 1000) {
          timerDiv.classList.add('timer-rojo');
        } else if (tiempoRestante <= 15 * 60 * 1000) {
          timerDiv.classList.add('timer-marron');
        } else if (tiempoRestante <= 30 * 60 * 1000) {
          timerDiv.classList.add('timer-naranja');
        } else if (tiempoRestante <= 60 * 60 * 1000) {
          timerDiv.classList.add('timer-amarillo');
        }
      }
    }
    
    // Verificar si el tiempo se acabó
    if (tiempoRestante === 0) {
      finalizarPorTiempo();
      return;
    }
    
    // Mostrar alertas
    verificarAlertas(tiempoRestante);
    
    // Guardar estado
    saveJSON(TIMER_STORAGE_KEY, {
      startTime: timerStartTime,
      alertas: alertasRealizadas
    });
  }
  
  function verificarAlertas(tiempoRestante) {
    const alertas = [
      {
        nombre: '1h',
        tiempo: 1 * 60 * 60 * 1000,
        icono: '⏳',
        titulo: 'Tiempo restante',
        mensaje: 'Queda 1 hora',
        sub: 'Revisá las preguntas pendientes.',
        color: 'rgba(202,138,4,0.97)',
        sombra: 'rgba(202,138,4,0.3)'
      },
      {
        nombre: '30min',
        tiempo: 30 * 60 * 1000,
        icono: '⚠️',
        titulo: 'Atención',
        mensaje: 'Quedan 30 minutos',
        sub: 'Es momento de acelerar el ritmo.',
        color: 'rgba(234,88,12,0.97)',
        sombra: 'rgba(234,88,12,0.32)'
      },
      {
        nombre: '15min',
        tiempo: 15 * 60 * 1000,
        icono: '🕐',
        titulo: 'Poco tiempo',
        mensaje: 'Quedan 15 minutos',
        sub: 'Priorizá las preguntas que faltan.',
        color: 'rgba(120,53,15,0.97)',
        sombra: 'rgba(120,53,15,0.32)'
      },
      {
        nombre: '5min',
        tiempo: 5 * 60 * 1000,
        icono: '🚨',
        titulo: '¡Últimos minutos!',
        mensaje: 'Quedan solo 5 minutos',
        sub: 'Respondé todo lo que puedas.',
        color: 'rgba(220,38,38,0.97)',
        sombra: 'rgba(220,38,38,0.38)'
      }
    ];
    
    alertas.forEach(alerta => {
      if (!alertasRealizadas[alerta.nombre] && tiempoRestante <= alerta.tiempo && tiempoRestante > alerta.tiempo - 1000) {
        mostrarAlertaFluida(alerta);
        alertasRealizadas[alerta.nombre] = true;
      }
    });
  }
  
  function mostrarAlertaFluida(alerta) {
    const el = document.createElement('div');
    el.className = 'simulacro-alerta';
    el.style.background = alerta.color;
    el.style.boxShadow = `0 12px 40px rgba(0,0,0,0.22), 0 2px 12px ${alerta.sombra}`;
    el.innerHTML = `
      <div class="alerta-icono">${alerta.icono}</div>
      <div>
        <div class="alerta-texto-titulo">${alerta.titulo}</div>
        <div class="alerta-texto-cuerpo">${alerta.mensaje}</div>
        <div class="alerta-texto-sub">${alerta.sub}</div>
      </div>
    `;
    document.body.appendChild(el);
    
    const duracion = 4200; // ms visible
    const fadeOut = 450;   // ms animación de salida
    
    setTimeout(() => {
      el.classList.add('saliendo');
      setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, fadeOut);
    }, duracion);
  }

  // Función legacy - mantenida por compatibilidad interna
  function mostrarAlertaTemporal(mensaje) {
    mostrarAlertaFluida({
      icono: '⏱',
      titulo: 'Aviso de tiempo',
      mensaje: mensaje,
      sub: '',
      color: 'rgba(13,116,144,0.97)',
      sombra: 'rgba(13,116,144,0.3)'
    });
  }
  
  function finalizarPorTiempo() {
    detenerTemporizador();
    
    // Deshabilitar todas las preguntas no respondidas
    const preguntas = preguntasPorSeccion['simulador'] || [];
    preguntas.forEach((preg, idx) => {
      if (!state['simulador'] || !state['simulador'].graded || !state['simulador'].graded[idx]) {
        const name = `preguntasimulador${idx}`;
        const inputs = Array.from(document.getElementsByName(name));
        inputs.forEach(inp => inp.disabled = true);
        const btn = inputs[0]?.closest(".pregunta")?.querySelector("button.btn-responder");
        if (btn) btn.disabled = true;
      }
    });
    
    // Calcular puntaje
    const puntajes = window.puntajesPorSeccion && window.puntajesPorSeccion['simulador'];
    const totalScore = puntajes ? puntajes.reduce((a, b) => a + (b || 0), 0) : 0;
    const total = preguntas.length;
    const pct = total > 0 ? Math.round((totalScore / total) * 100) : 0;
    
    // Guardar en estado
    if (state['simulador']) {
      state['simulador'].totalShown = true;
      saveJSON(STORAGE_KEY, state);
    }
    
    // Guardar en historial
    attemptLog.push({
      sectionId: 'simulador',
      sectionTitle: 'Simulacro Examen de Residencia',
      iso: todayISO(),
      score: totalScore,
      total: total
    });
    saveJSON(ATTEMPT_LOG_KEY, attemptLog);
    
    // Esperar breve momento y mostrar modal de tiempo agotado
    setTimeout(() => {
      mostrarModalTiempoAgotado(totalScore, total, pct);
    }, 800);
  }
  
  function mostrarModalTiempoAgotado(score, total, pct) {
    // Remover modal anterior si existe
    const existing = document.getElementById('modal-tiempo-agotado');
    if (existing) existing.remove();
    
    const overlay = document.createElement('div');
    overlay.id = 'modal-tiempo-agotado';
    overlay.innerHTML = `
      <div class="modal-caja">
        <div class="modal-icono-grande">⏱️</div>
        <div class="modal-titulo">¡Tiempo agotado!</div>
        <div class="modal-subtitulo">El tiempo del simulacro ha finalizado.<br>Ya no es posible responder más preguntas.</div>
        <div class="modal-score">
          <div class="modal-score-label">Tu puntaje final</div>
          <div class="modal-score-num">${score} / ${total} <span style="font-size:1rem;font-weight:400;color:#475569;">(${pct}%)</span></div>
        </div>
        <div class="modal-btns">
          <button class="btn-revisar" id="btn-revisar-examen">📋 Revisar el examen</button>
          <button class="btn-salir-revision" id="btn-salir-sin-revision">🏠 Volver al menú principal</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    
    document.getElementById('btn-revisar-examen').onclick = function() {
      overlay.remove();
      activarModoRevision();
    };
    document.getElementById('btn-salir-sin-revision').onclick = function() {
      overlay.remove();
      volverAlMenu();
    };
  }
  
  function activarModoRevision() {
    // Mostrar banner de modo revisión
    if (!document.getElementById('banner-modo-revision')) {
      const banner = document.createElement('div');
      banner.id = 'banner-modo-revision';
      banner.className = 'modo-revision-banner';
      banner.innerHTML = `
        📋 <strong>Modo revisión</strong> — Solo lectura, las respuestas no pueden modificarse.
        &nbsp;&nbsp;
        <button onclick="salirModoRevision()" style="
          background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);
          color:#fff;padding:5px 14px;border-radius:6px;cursor:pointer;font-size:0.82rem;
          font-weight:600;transition:background 0.15s;margin-left:10px;">
          Salir de revisión
        </button>
      `;
      const pagina = document.getElementById('simulador');
      if (pagina) pagina.insertBefore(banner, pagina.firstChild);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  
  window.salirModoRevision = function() {
    const banner = document.getElementById('banner-modo-revision');
    if (banner) banner.remove();
    volverAlMenu();
  };
  
  function detenerTemporizador() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    
    // Remover elemento del DOM
    const timerDiv = document.getElementById('timer-simulacro');
    if (timerDiv && timerDiv.parentNode) {
      document.body.removeChild(timerDiv);
    }
  }
  
  function reiniciarTemporizador() {
    detenerTemporizador();
    
    // Limpiar estado del temporizador
    localStorage.removeItem(TIMER_STORAGE_KEY);
    timerStartTime = null;
    alertasRealizadas = {
      '1h': false,
      '30min': false,
      '15min': false,
      '5min': false
    };
    
    console.log('🔄 Temporizador reiniciado');
  }

  // ======== Obtener orden de visualización ========
  // Reglas:
  //   • Simulacro / Examen Único / UBA → orden secuencial fijo siempre
  //   • Especialidades y compilados:
  //       - Preguntas respondidas: fijas al principio, en el orden en que se respondieron
  //       - Preguntas sin responder: se reordenan aleatoriamente CADA VEZ que se entra
  //         al cuestionario o se recarga la página (semilla con Date.now())
  function getDisplayOrder(seccionId, preguntasLen) {
    const s = state[seccionId];

    // Inicializar answeredOrder si no existe
    if (!s.answeredOrder) {
      s.answeredOrder = [];
    }

    // ── LIMPIEZA: eliminar de answeredOrder entradas sin graded=true ────────────
    // Ocurre cuando answeredOrder quedó inflado por un bug previo (p.ej. reordenamiento
    // numérico tras borrar/reclasificar preguntas). graded es la fuente de verdad:
    // si una entrada no tiene graded=true, no debería estar en answeredOrder.
    // Esta limpieza se ejecuta ANTES de la reparación para que el recuento sea correcto.
    // Fix 4: también elimina entradas cuyo índice supera el total actual de preguntas
    // (preguntas "fantasma" que fueron borradas y dejaron un índice huérfano).
    {
      const _gradedTrue = new Set(
        Object.keys(s.graded || {})
          .map(k => parseInt(k, 10))
          .filter(k => !isNaN(k) && s.graded[k] === true)
      );
      const _antesLimpieza = s.answeredOrder.length;
      // Filtrar por graded=true, sin duplicados, y dentro del rango válido de preguntas
      const _idxVistos = new Set();
      s.answeredOrder = s.answeredOrder.filter(e => {
        const idx = typeof e === 'number' ? e : e.idx;
        if (!_gradedTrue.has(idx) || _idxVistos.has(idx)) return false;
        if (idx >= preguntasLen) return false; // Fix 4: índice fuera de rango (pregunta borrada)
        _idxVistos.add(idx);
        return true;
      });
      // Fix 4: también limpiar graded, answers y shuffleMap de índices fuera de rango
      ['graded', 'answers', 'shuffleMap'].forEach(campo => {
        if (!s[campo]) return;
        Object.keys(s[campo]).forEach(k => {
          if (parseInt(k, 10) >= preguntasLen) delete s[campo][k];
        });
      });
      if (s.answeredOrder.length !== _antesLimpieza) {
        console.log('[LIMPIEZA] answeredOrder depurado: '
          + _antesLimpieza + ' → ' + s.answeredOrder.length
          + ' (graded=true, sin duplicados, sin índices fuera de rango)');
        if (!window._fbSyncInProgress) saveJSON(STORAGE_KEY, state);
      }
    }
    // ── FIN LIMPIEZA ────────────────────────────────────────────────────────────

    // ── REPARACIÓN AUTOMÁTICA: reconstruir answeredOrder desde graded ──────────
    // Ocurre cuando el progreso se restaura desde Firestore pero answeredOrder
    // quedó incompleto (ej: solo 7 de 138 entradas). graded es la fuente de verdad.
    // Cualquier índice marcado en graded que no esté ya en answeredOrder se agrega al final.
    {
      const _gradedKeys = Object.keys(s.graded || {})
        .map(k => parseInt(k, 10))
        .filter(k => !isNaN(k) && s.graded[k] === true);

      if (_gradedKeys.length > 0) {
        const _idxEnAnswered = new Set(
          s.answeredOrder.map(e => typeof e === 'number' ? e : e.idx)
        );
        const _pregsLocales = preguntasPorSeccion[seccionId] || [];
        let _huboReparacion = false;
        _gradedKeys.forEach(idx => {
          if (!_idxEnAnswered.has(idx) && idx < _pregsLocales.length) {
            const p = _pregsLocales[idx];
            const _textoN = (p ? (p.pregunta || '') : '').trim()
              .replace(/^\d+[.\-\)]\s*/, '').replace(/\s+/g, ' ').toLowerCase();
            s.answeredOrder.push({ idx, docId: p?._firestoreDocId || null, texto: _textoN });
            _idxEnAnswered.add(idx);
            _huboReparacion = true;
          }
        });
        if (_huboReparacion) {
          console.log('[REPARACIÓN] answeredOrder reconstruido desde graded: '
            + _gradedKeys.length + ' respondidas → ' + s.answeredOrder.length + ' en answeredOrder');
          if (!window._fbSyncInProgress) saveJSON(STORAGE_KEY, state);
        }
      }
    }
    // ── FIN REPARACIÓN ──────────────────────────────────────────────────────────

    // Verificar tipo de sección
    const esSimulacro = seccionId === 'simulador';
    const esUnico     = esExamenUnico(seccionId);
    const esUBA       = esExamenUBA(seccionId);
    const esComp      = esCompilado(seccionId);

    // Simulacro, Único, UBA y Compilados: orden secuencial fijo — las preguntas NO se mueven nunca
    // Admin: también orden secuencial fijo en especialidades (para editar sin que cambien de lugar)
    if (esSimulacro || esUnico || esUBA || esComp || (_currentUserData && _currentUserData.role === 'admin')) {
      const ordenSecuencial = [];
      for (let i = 0; i < preguntasLen; i++) ordenSecuencial.push(i);
      return ordenSecuencial;
    }

    // Especialidades / compilados (usuarios no-admin):
    // 1) Respondidas: orden fijo (el orden cronológico en que se respondieron)
    //
    // RESOLUCIÓN POR TEXTO (Opción B):
    // answeredOrder puede contener entradas antiguas (solo número) o nuevas ({ idx, texto }).
    // Para cada entrada, verificamos si el texto sigue coincidiendo con el índice guardado.
    // Si no coincide, buscamos en todo el array de preguntas la que tenga ese texto
    // y reemplazamos el índice. Así las preguntas respondidas siempre ocupan su lugar
    // original sin importar cuántas preguntas se agreguen, extrapoLen o reordenen.
    const preguntas = preguntasPorSeccion[seccionId] || [];
    function _normTexto(t) {
      return (t || '').trim().replace(/^\d+[.\-\)]\s*/, '').replace(/\s+/g, ' ').toLowerCase();
    }
    // Migrar entradas antiguas al nuevo formato { idx, docId, texto }
    // - Entradas que son solo número → convertir al formato nuevo
    // - Entradas { idx, texto } sin docId → agregar docId si la pregunta lo tiene
    let _cambioDeMigracion = false;
    s.answeredOrder = s.answeredOrder.map(entry => {
      if (typeof entry === 'number') {
        const p = preguntas[entry];
        _cambioDeMigracion = true;
        return { idx: entry, docId: p?._firestoreDocId || null, texto: p ? _normTexto(p.pregunta) : '' };
      }
      // Completar docId si faltaba (sesiones anteriores sin ancla doble)
      if (typeof entry === 'object' && !entry.docId && entry.idx < preguntas.length) {
        const p = preguntas[entry.idx];
        if (p && p._firestoreDocId) {
          entry.docId = p._firestoreDocId;
          _cambioDeMigracion = true;
        }
      }
      return entry;
    });
    if (_cambioDeMigracion && !window._fbSyncInProgress) saveJSON(STORAGE_KEY, state);

    // Construir mapas de búsqueda rápida: docId→índice y texto→índice
    const _docIdAIdx = new Map();
    const _textoAIdx = new Map();
    preguntas.forEach((p, i) => {
      if (p._firestoreDocId) _docIdAIdx.set(p._firestoreDocId, i);
      _textoAIdx.set(_normTexto(p.pregunta), i);
    });

    // Resolver cada entrada usando ANCLA DOBLE:
    // 1° buscar por docId (sobrevive ediciones de texto del admin)
    // 2° si no hay docId, buscar por texto (fallback para preguntas extrapoladas)
    // Si ninguna ancla resuelve, mantener el índice guardado como último recurso.
    let _cambioDeResolucion = false;
    const answered = [];
    const _indicesYaUsados = new Set();
    s.answeredOrder.forEach(entry => {
      const textoGuardado = entry.texto || '';
      const docIdGuardado = entry.docId || null;
      let idxActual = entry.idx;
      let idxResuelto = undefined;

      // Ancla primaria: docId
      if (docIdGuardado) {
        const porDocId = _docIdAIdx.get(docIdGuardado);
        if (porDocId !== undefined && !_indicesYaUsados.has(porDocId)) {
          idxResuelto = porDocId;
        }
      }
      // Ancla secundaria: texto (solo si no resolvió por docId)
      if (idxResuelto === undefined && textoGuardado) {
        const porTexto = _textoAIdx.get(textoGuardado);
        if (porTexto !== undefined && !_indicesYaUsados.has(porTexto)) {
          idxResuelto = porTexto;
        }
      }

      if (idxResuelto !== undefined && idxResuelto !== idxActual) {
        console.log('[ANCLA] Pregunta reubicada:', idxActual, '→', idxResuelto,
          '| docId:', docIdGuardado, '| texto:', textoGuardado.slice(0, 50));
        entry.idx = idxResuelto;
        // Reubicar graded, answers y shuffleMap al nuevo índice
        if (s.graded[idxActual] !== undefined && s.graded[idxResuelto] === undefined) {
          s.graded[idxResuelto] = s.graded[idxActual];
          delete s.graded[idxActual];
        }
        if (s.answers && s.answers[idxActual] !== undefined && s.answers[idxResuelto] === undefined) {
          s.answers[idxResuelto] = s.answers[idxActual];
          delete s.answers[idxActual];
        }
        if (s.shuffleMap && s.shuffleMap[idxActual] !== undefined && s.shuffleMap[idxResuelto] === undefined) {
          s.shuffleMap[idxResuelto] = s.shuffleMap[idxActual];
          delete s.shuffleMap[idxActual];
        }
        idxActual = idxResuelto;
        _cambioDeResolucion = true;
      } else if (idxResuelto !== undefined) {
        idxActual = idxResuelto;
      }

      // Actualizar también el texto guardado si el admin lo editó
      // (así la próxima vez el texto refleja el estado actual)
      if (idxActual < preguntasLen && preguntas[idxActual]) {
        const textoActual = _normTexto(preguntas[idxActual].pregunta);
        if (textoActual && textoActual !== textoGuardado) {
          entry.texto = textoActual;
          _cambioDeResolucion = true;
        }
      }

      if (!_indicesYaUsados.has(idxActual) && idxActual < preguntasLen) {
        answered.push(idxActual);
        _indicesYaUsados.add(idxActual);
      }
    });
    if (_cambioDeResolucion && !window._fbSyncInProgress) saveJSON(STORAGE_KEY, state);

    // Construir el conjunto de índices aún sin responder
    const unanswered = [];
    const graded = s.graded || {}; // protección: puede ser undefined al recargar
    for (let i = 0; i < preguntasLen; i++) {
      if (!graded[i] && !_indicesYaUsados.has(i)) unanswered.push(i);
    }

    // 2) Sin responder: el orden se genera UNA SOLA VEZ (primer ingreso al intento)
    //    y queda CONGELADO en s.unansweredOrder para toda la duración del intento.
    //    Así la "pregunta 10 sin responder" siempre es la misma pregunta en cualquier
    //    recarga: F5, login, volver al menú, recarga por edición del admin, etc.
    //    Solo se regenera cuando unansweredOrder está genuinamente vacío (intento nuevo).
    // ── Construir shuffledUnanswered ─────────────────────────────────────────────
    // unansweredSet contiene SOLO los índices verdaderamente sin responder (no en graded ni en answered).
    // Es la fuente de verdad: cualquier índice que esté aquí y también en unansweredOrder se conserva;
    // el resto se descarta. Si unansweredOrder llegó vacío (primer ingreso o limpieza por consolidador),
    // se genera un orden aleatorio nuevo.
    const unansweredSet = new Set(unanswered);

    let shuffledUnanswered;
    if (s.unansweredOrder && s.unansweredOrder.length > 0) {
      // Filtrar: solo conservar los que realmente están sin responder
      const ordenFiltrado = s.unansweredOrder.filter(i => unansweredSet.has(i));
      // Agregar al final cualquier pregunta nueva (añadida por el admin después del inicio del intento)
      const enOrden = new Set(ordenFiltrado);
      unanswered.forEach(i => { if (!enOrden.has(i)) ordenFiltrado.push(i); });
      shuffledUnanswered = ordenFiltrado;
      // Actualizar el orden persistido si cambió
      if (JSON.stringify(shuffledUnanswered) !== JSON.stringify(s.unansweredOrder)) {
        s.unansweredOrder = shuffledUnanswered.slice();
        if (!window._fbSyncInProgress) saveJSON(STORAGE_KEY, state);
      }
    } else {
      // unansweredOrder vacío → primer ingreso o limpieza por consolidador: generar orden aleatorio
      shuffledUnanswered = shuffle(unanswered, seccionId + '-' + Date.now());
      s.unansweredOrder = shuffledUnanswered.slice();
      if (!window._fbSyncInProgress) saveJSON(STORAGE_KEY, state);
    }
    // NOTA: unansweredOrder queda congelado para toda la duración del intento.
    // Solo se limpia en limpiarSeccion() al iniciar un intento nuevo, o con el consolidador.

    // ── Garantía final: sin solapamiento entre respondidas y sin responder ─────────
    // Si por cualquier razón (Firestore viejo, bug previo) shuffledUnanswered tiene
    // índices que ya están en answered, los eliminamos aquí como última línea de defensa.
    // Esto garantiza que displayOrder = [todas las respondidas][todas las sin responder]
    // sin ningún índice duplicado ni solapamiento, sin importar qué haya en Firestore.
    // IMPORTANTE: cuando se detecta solapamiento, se guarda en localStorage Y se sube
    // a Firestore de inmediato, para que cualquier otro dispositivo reciba el estado limpio.
    {
      const _answeredSet = new Set(answered);
      const _unansweredLimpio = shuffledUnanswered.filter(i => !_answeredSet.has(i));
      if (_unansweredLimpio.length !== shuffledUnanswered.length) {
        shuffledUnanswered = _unansweredLimpio;
        s.unansweredOrder  = _unansweredLimpio.slice();
        console.log('[DISPLAY-ORDER] Solapamiento detectado y corregido en', seccionId,
          '— answered:', answered.length, ', unanswered limpio:', _unansweredLimpio.length);
        if (!window._fbSyncInProgress) {
          saveJSON(STORAGE_KEY, state);
          // Subir a Firestore con un pequeño delay para no bloquear el render
          // Esto garantiza que otros dispositivos también reciban el estado limpio
          setTimeout(() => {
            if (typeof window._fbSaveProgressToCloud === 'function') {
              window._fbSaveProgressToCloud();
              console.log('[DISPLAY-ORDER] Estado limpio subido a Firestore desde', seccionId);
            }
          }, 2000);
        }
      }
    }
    // ── FIN GARANTÍA ──────────────────────────────────────────────────────────────

    // Concatenar: respondidas primero (fijas), luego sin responder
    _debugLog('getDisplayOrder: ' + seccionId + ' → answered=' + answered.length + ' unanswered=' + shuffledUnanswered.length);
    return [...answered, ...shuffledUnanswered];
  }

  // ======== Render del cuestionario ========
  function generarCuestionario(seccionId) {
    const preguntas = preguntasPorSeccion[seccionId];
    if (!preguntas) return;

    ensureSectionState(seccionId, preguntas.length);

    const cont = document.getElementById(`cuestionario-${seccionId}`);
    if (!cont) return;
    cont.innerHTML = "";

    // Obtener orden de visualización (respondidas arriba fijas, no respondidas abajo aleatorias)
    const displayOrder = getDisplayOrder(seccionId, preguntas.length);

    // Renderizar preguntas en lotes para no bloquear el hilo principal
    const CHUNK_SIZE = 50;
    let chunkIndex = 0;

    const renderChunk = () => {
      const end = Math.min(chunkIndex + CHUNK_SIZE, displayOrder.length);
      for (let i = chunkIndex; i < end; i++) {
        const originalIdx = displayOrder[i];
        const displayPosition = i;
        window._renderPregunta(seccionId, originalIdx, displayPosition);
      }
      chunkIndex = end;

      if (chunkIndex < displayOrder.length) {
        // Actualizar spinner con progreso
        const spinner = cont.querySelector('.chunk-progress');
        if (spinner) spinner.textContent = `Cargando preguntas… ${chunkIndex} / ${displayOrder.length}`;
        // Restaurar solo el último lote renderizado (no todo desde el principio)
        setTimeout(renderChunk, 0);
      } else {
        // Todo renderizado: eliminar spinner, conectar botón total, restaurar estado y scroll
        const spinner = cont.querySelector('.chunk-progress');
        if (spinner) {
          const spinnerParent = spinner.closest('div') || spinner.parentElement;
          if (spinnerParent && spinnerParent !== cont) spinnerParent.remove();
          else spinner.remove();
        }
        const btnTotal = document.getElementById(`mostrar-total-${seccionId}`);
        if (btnTotal) btnTotal.onclick = () => mostrarPuntuacionTotal(seccionId);
        restoreSelectionsAndGrades(seccionId);
        // Actualizar el separador DESPUÉS de restaurar el estado visual de todas las preguntas.
        // Si se llama antes, el separador queda en posición incorrecta porque los puntajeEl
        // aún tienen textContent vacío (todavía no fueron pintados por restoreSelectionsAndGrades).
        if (!esExamenUnico(seccionId) && !esExamenUBA(seccionId) && seccionId !== 'simulador') {
          actualizarSeparador(seccionId, cont);
        }
        if (_scrollOnNextRender) {
          _scrollOnNextRender = false;
          scrollToFirstUnanswered(seccionId);
        }
      }
    };

    // Mostrar spinner de progreso mientras se renderizan los lotes
    if (displayOrder.length > CHUNK_SIZE) {
      const progressDiv = document.createElement('div');
      progressDiv.style.cssText = 'text-align:center;padding:16px 20px 8px;color:#64748b;font-size:0.9rem;';
      progressDiv.innerHTML = `<span class="chunk-progress">Cargando preguntas… 0 / ${displayOrder.length}</span>`;
      cont.appendChild(progressDiv);
    }

    // window._renderPregunta: usar siempre _renderPreguntaUnica (standalone, correcta)
    window._renderPregunta = _renderPreguntaUnica; // fin renderPregunta

    renderChunk();
  }

  // ── Inyectar estilos de etiquetas de origen ─────────────────────
  function inyectarEstilosEtiquetas() {
    if (document.getElementById('etiquetas-origen-styles')) return;
    const style = document.createElement('style');
    style.id = 'etiquetas-origen-styles';
    style.textContent = `
      /* ===== WRAPPER de etiquetas ===== */
      .etiquetas-origen-wrapper {
        margin: 14px 0 10px;
      }

      /* Línea separadora sutil */
      .etiquetas-separador {
        height: 1px;
        background: linear-gradient(90deg, transparent, #e2e8f0 30%, #e2e8f0 70%, transparent);
        margin-bottom: 10px;
        border-radius: 1px;
      }

      /* Contenedor de pills alineado a la derecha */
      .etiquetas-origen {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        justify-content: flex-end;
        align-items: center;
      }

      /* Base de todas las pills */
      .etiqueta-pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        border-radius: 20px;
        padding: 3px 11px 3px 8px;
        font-size: 11.5px;
        font-weight: 500;
        white-space: nowrap;
        letter-spacing: 0.02em;
        border: 1px solid transparent;
        transition: opacity 0.15s ease;
        user-select: none;
      }
      .etiqueta-pill:hover { opacity: 0.82; }

      .etiqueta-pill-icono {
        font-size: 11px;
        line-height: 1;
        flex-shrink: 0;
      }
      .etiqueta-pill-texto {
        line-height: 1.2;
      }

      /* Variante: archivo (violeta) */
      .etiqueta-pill--archivo {
        background: #7c3aed18;
        color: #6d28d9;
        border-color: #7c3aed35;
      }

      /* Variante: especialidad (azul/teal) */
      .etiqueta-pill--especialidad {
        background: #0891b218;
        color: #0369a1;
        border-color: #0891b235;
      }

      /* Variante: número de pregunta (verde) */
      .etiqueta-pill--numero {
        background: #05966918;
        color: #047857;
        border-color: #05966935;
      }

      /* Responsive: en pantallas chicas alinear a la izquierda */
      @media (max-width: 500px) {
        .etiquetas-origen { justify-content: flex-start; }
      }
    `;
    document.head.appendChild(style);
  }

  // ── Inyectar estilos del separador "Continuá desde aquí" ────────
  function inyectarEstilosSeparador() {
    if (document.getElementById('separador-progreso-styles')) return;
    const style = document.createElement('style');
    style.id = 'separador-progreso-styles';
    style.textContent = `
      .separador-progreso {
        display: flex;
        align-items: center;
        gap: 14px;
        margin: 28px 0 22px;
        padding: 0 4px;
        opacity: 0;
        animation: separadorEntrada 0.45s ease 0.15s both;
      }
      @keyframes separadorEntrada {
        from { opacity: 0; transform: translateY(10px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .separador-progreso::before,
      .separador-progreso::after {
        content: '';
        flex: 1;
        height: 2px;
        background: linear-gradient(90deg, transparent, #0d7490 60%, #0891b2);
        border-radius: 2px;
        opacity: 0.35;
      }
      .separador-progreso::after {
        background: linear-gradient(90deg, #0891b2, #0d7490 40%, transparent);
      }
      .separador-progreso-etiqueta {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: linear-gradient(135deg, #0d7490, #0891b2);
        color: #fff;
        border-radius: 100px;
        padding: 7px 18px 7px 14px;
        font-size: 0.82rem;
        font-weight: 700;
        letter-spacing: 0.03em;
        white-space: nowrap;
        box-shadow: 0 4px 14px rgba(13,116,144,0.28), 0 1px 4px rgba(0,0,0,0.08);
        user-select: none;
      }
      .separador-progreso-etiqueta svg {
        flex-shrink: 0;
        opacity: 0.92;
      }
    `;
    document.head.appendChild(style);
  }

  function scrollToFirstUnanswered(seccionId) {
    const s = state[seccionId];
    if (!s || !s.graded) return;

    const preguntasRespondidas = Object.keys(s.graded).filter(k => s.graded[k]).length;
    if (preguntasRespondidas === 0) return;

    const totalPreguntas = (preguntasPorSeccion[seccionId] || []).length;
    if (preguntasRespondidas >= totalPreguntas) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const cont = document.getElementById(`cuestionario-${seccionId}`);
        if (!cont) return;

        // Crear/mover el separador a la posición correcta
        actualizarSeparador(seccionId, cont);

        // Scroll a la primera pregunta sin responder
        const primeraNoRespondida = cont.querySelector('.separador-progreso')?.nextElementSibling;
        if (!primeraNoRespondida) return;

        primeraNoRespondida.scrollIntoView({ behavior: 'smooth', block: 'start' });

        const prev = primeraNoRespondida.style.transition;
        primeraNoRespondida.style.transition = 'box-shadow 0.25s ease';
        primeraNoRespondida.style.boxShadow = '0 0 0 3px rgba(13,116,144,0.35), 0 4px 20px rgba(13,116,144,0.18)';
        setTimeout(() => {
          primeraNoRespondida.style.boxShadow = '';
          primeraNoRespondida.style.transition = prev || '';
        }, 1800);
      });
    });
  }

  // Mueve (o crea) el separador "Continuá desde aquí" para que siempre quede
  // justo antes de la primera pregunta sin responder en el DOM.
  function actualizarSeparador(seccionId, cont) {
    if (!cont) cont = document.getElementById(`cuestionario-${seccionId}`);
    if (!cont) return;

    inyectarEstilosSeparador();

    // Encontrar la primera pregunta-div SIN responder
    let primeraNoRespondida = null;
    for (const div of cont.querySelectorAll('.pregunta')) {
      const puntajeEl = div.querySelector('[id^="puntaje-"]');
      if (puntajeEl && puntajeEl.textContent.trim() === '') {
        primeraNoRespondida = div;
        break;
      }
    }

    let separador = cont.querySelector('.separador-progreso');

    if (!primeraNoRespondida) {
      // Todas respondidas: quitar separador si existe
      if (separador) separador.remove();
      return;
    }

    if (!separador) {
      separador = document.createElement('div');
      separador.className = 'separador-progreso';
      separador.innerHTML = `
        <div class="separador-progreso-etiqueta">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          Continuá desde aquí
        </div>
      `;
    }

    // Insertar/mover el separador justo antes de la primera no respondida
    cont.insertBefore(separador, primeraNoRespondida);
  }

  function persistSelectionsForQuestion(seccionId, qIndex) {
    const name = `pregunta${seccionId}${qIndex}`;
    const inputs = Array.from(document.getElementsByName(name));
    const seleccionadas = inputs
      .map((inp, i) => (inp.checked ? i : null))
      .filter(v => v !== null);

    if (!state[seccionId].answers) state[seccionId].answers = {};
    state[seccionId].answers[qIndex] = seleccionadas;
    saveJSON(STORAGE_KEY, state);
  }

  function responderPregunta(seccionId, qIndex) {
    const preguntas = preguntasPorSeccion[seccionId];
    const preg = preguntas[qIndex];

    const name = `pregunta${seccionId}${qIndex}`;
    const inputs = Array.from(document.getElementsByName(name));

    const seleccionMixed = inputs
      .map((inp, i) => (inp.checked ? i : null))
      .filter(v => v !== null);

    if (seleccionMixed.length === 0) {
      alert("Por favor, selecciona al menos una opción antes de responder.");
      return;
    }

    // NUEVO: Si es el simulacro y es la primera respuesta, iniciar el temporizador
    if (seccionId === 'simulador' && !timerInterval) {
      const s = state[seccionId];
      const preguntasRespondidas = s && s.graded ? Object.keys(s.graded).filter(k => s.graded[k]).length : 0;
      if (preguntasRespondidas === 0) {
        console.log('⏰ Iniciando temporizador del simulacro');
        iniciarTemporizador();
      }
    }

    // Congelar las opciones de ESTA pregunta específica (si no está ya congelada)
    if (!state[seccionId].shuffleMap[qIndex]) {
      // Para exámenes únicos/UBA: guardar mapa identity directamente (no hay inputs en DOM para leer)
      if (esExamenUnico(seccionId) || esExamenUBA(seccionId)) {
        const inv = {};
        (preg.opciones || []).forEach((_, i) => { inv[i] = i; });
        state[seccionId].shuffleMap[qIndex] = inv;
        saveJSON(STORAGE_KEY, state);
      } else {
        freezeShuffleForQuestion(seccionId, qIndex);
      }
    }
    const mInv = state[seccionId].shuffleMap[qIndex];

    const seleccionOriginal = seleccionMixed.map(i => mInv[i]).sort();
    const correctaOriginal = preg.correcta.slice().sort();
    const isCorrect = JSON.stringify(seleccionOriginal) === JSON.stringify(correctaOriginal);

    const puntajeElem = document.getElementById(`puntaje-${seccionId}-${qIndex}`);
    if (isCorrect) {
      window.puntajesPorSeccion[seccionId][qIndex] = 1;
      puntajeElem.textContent = "✅ Correcto (+1)";
    } else {
      window.puntajesPorSeccion[seccionId][qIndex] = 0;
      puntajeElem.textContent = "❌ Incorrecto (0)";
    }

    const correctasMezcladas = correctaOriginal.map(ori =>
      parseInt(Object.keys(mInv).find(k => mInv[k] === ori), 10)
    );
    correctasMezcladas.forEach(i => {
      if (!isNaN(i) && inputs[i]) {
        inputs[i].parentElement.style.backgroundColor = "#eafaf1";
        inputs[i].parentElement.style.borderColor = "#1e7e34";
      }
    });
    seleccionMixed.forEach(i => {
      const ori = mInv[i];
      if (!preg.correcta.includes(ori) && inputs[i]) {
        inputs[i].parentElement.style.backgroundColor = "#fdecea";
        inputs[i].parentElement.style.borderColor = "#c0392b";
      }
    });

    inputs.forEach(inp => (inp.disabled = true));
    const btn = inputs[0]?.closest(".pregunta")?.querySelector("button.btn-responder");
    if (btn) btn.disabled = true;

    persistSelectionsForQuestion(seccionId, qIndex);
    state[seccionId].graded[qIndex] = true;
    
    // IMPORTANTE: Solo para cuestionarios NO-Simulacro, agregar a answeredOrder
    const esSimulacro = seccionId === 'simulador';
    
    if (!esSimulacro) {
      // Para cuestionarios normales: agregar esta pregunta al orden de respondidas (si no está ya)
      if (!state[seccionId].answeredOrder) {
        state[seccionId].answeredOrder = [];
      }
      // ANCLA DOBLE: guardar { idx, docId, texto }
      // - docId: ID único del documento Firestore → sobrevive cambios de texto por edición admin
      // - texto: fallback si el docId no está disponible (preguntas extrapoladas sin docId propio)
      const _textoNormResp = (preg.pregunta || '').trim()
        .replace(/^\d+[.\-\)]\s*/, '').replace(/\s+/g, ' ').toLowerCase();
      const _docIdResp = preg._firestoreDocId || null;
      const _yaEnAnswered = state[seccionId].answeredOrder.some(
        e => (typeof e === 'object' ? e.idx : e) === qIndex
      );
      if (!_yaEnAnswered) {
        state[seccionId].answeredOrder.push({ idx: qIndex, docId: _docIdResp, texto: _textoNormResp });
        console.log('📌 Pregunta', qIndex, 'agregada a answeredOrder con ancla doble (docId + texto)');
      }
      
      // Eliminar de unansweredOrder
      if (state[seccionId].unansweredOrder) {
        const indexInUnanswered = state[seccionId].unansweredOrder.indexOf(qIndex);
        if (indexInUnanswered !== -1) {
          state[seccionId].unansweredOrder.splice(indexInUnanswered, 1);
          console.log('🗑️ Pregunta', qIndex, 'eliminada de unansweredOrder');
        }
      }
    } else if (esSimulacro) {
      console.log('✅ SIMULACRO - Pregunta', qIndex, 'respondida sin cambiar orden de visualización');
    }
    
    // Guardar el estado completo
    saveJSON(STORAGE_KEY, state);
    console.log('💾 Estado guardado');

    // ── Migrar respuesta fuera de secuencia a su posición secuencial ─────────────
    // Si el usuario responde una pregunta de una página "lejana" (ej: pág 11 cuando
    // solo completó hasta la pág 2), movemos su entrada en answeredOrder para que
    // quede al final del bloque secuencial y no dispersa. El próximo render mostrará
    // esa pregunta en la posición secuencial correcta.
    if (!esSimulacro && !esExamenUnico(seccionId) && !esExamenUBA(seccionId) && !esCompilado(seccionId)) {
      try {
        const _n = (window.preguntasPorSeccion?.[seccionId] || []).length;
        if (_n > 50 && state[seccionId] && state[seccionId].answeredOrder) {
          const _s2        = state[seccionId];
          const _graded2   = _s2.graded || {};
          const _PAGE_SIZE = 50;
          // displayOrder recién calculado (ya incluye qIndex en answered)
          const _displayOrd = getDisplayOrder(seccionId, _n);
          const _totalPages = Math.ceil(_n / _PAGE_SIZE);

          // Calcular última página completa de forma secuencial (desde pág 0)
          let _ultimaSeq = -1;
          for (let _p = 0; _p < _totalPages; _p++) {
            const _desde = _p * _PAGE_SIZE;
            const _hasta = Math.min(_desde + _PAGE_SIZE, _n);
            const _todos = _displayOrd.slice(_desde, _hasta).every(i => _graded2[i]);
            if (_todos) _ultimaSeq = _p; else break;
          }
          const _paginaSeq     = _ultimaSeq + 1;            // próxima página a completar
          const _posEnDisplay  = _displayOrd.indexOf(qIndex);
          const _paginaDeEsta  = Math.floor(_posEnDisplay / _PAGE_SIZE);

          if (_paginaDeEsta > _paginaSeq && _posEnDisplay !== -1) {
            // La pregunta quedó fuera de secuencia: moverla al final del bloque secuencial.
            // Eliminamos su entrada de donde esté y la reinsertamos justo después de la
            // última respondida secuencialmente (= al inicio del bloque no-secuencial).
            const _posSecAbsoluta = _paginaSeq * _PAGE_SIZE; // primera pos de la página secuencial
            // Contar cuántas respondidas hay antes de esa posición en el displayOrder actual
            const _respondAntesDeSeq = _displayOrd.slice(0, _posSecAbsoluta).filter(i => _graded2[i]).length;

            // Reordenar answeredOrder: poner qIndex en la posición _respondAntesDeSeq
            const _aO = _s2.answeredOrder;
            const _entryIdx = _aO.findIndex(e => (typeof e === 'number' ? e : e.idx) === qIndex);
            if (_entryIdx !== -1) {
              const [_entry] = _aO.splice(_entryIdx, 1);
              // Insertar en la posición secuencial correcta
              const _insertPos = Math.min(_respondAntesDeSeq, _aO.length);
              _aO.splice(_insertPos, 0, _entry);
              if (!window._fbSyncInProgress) saveJSON(STORAGE_KEY, state);
              console.log('[MIGRACIÓN] Pregunta', qIndex, 'movida a posición secuencial', _insertPos,
                '(pág.', _paginaSeq + 1, ')');
            }

            // Toast informativo
            const _numEnBloque = _respondAntesDeSeq + 1; // 1-based
            const _msg = `📌 Pregunta respondida → reubicada como nº ${_numEnBloque} (pág. ${_paginaSeq + 1})`;
            if (typeof window.fbToast === 'function') window.fbToast(_msg, 'info');
            else if (typeof fbToast === 'function') fbToast(_msg, 'info');
          }
        }
      } catch (_e) { console.warn('[MIGRACIÓN] Error no crítico:', _e.message); }
    }
    
    // ── Mover físicamente el div de la pregunta al área de respondidas ──────────
    // Solo en cuestionarios con orden dinámico (no simulacro, no exámenes fijos)
    if (!esSimulacro && !esExamenUnico(seccionId) && !esExamenUBA(seccionId) && !esCompilado(seccionId)) {
      const cont = document.getElementById(`cuestionario-${seccionId}`);
      if (cont) {
        // Primero actualizar/crear el separador en su posición correcta
        actualizarSeparador(seccionId, cont);

        // Luego mover el div de ESTA pregunta justo ANTES del separador
        const puntajeEl = document.getElementById(`puntaje-${seccionId}-${qIndex}`);
        const pregDiv = puntajeEl ? puntajeEl.closest('.pregunta') : null;
        const separador = cont.querySelector('.separador-progreso');
        if (pregDiv && separador) {
          cont.insertBefore(pregDiv, separador);
        }
      }
    }

    // Actualizar la posición del separador "Continuá desde aquí"
    // Para secciones dinámicas (especialidades) ya se actualizó y movió el div arriba.
    // Para compilados/únicos/UBA (orden fijo) actualizamos aquí el separador sin mover divs.
    if (!esSimulacro && (esCompilado(seccionId) || esExamenUnico(seccionId) || esExamenUBA(seccionId))) {
      actualizarSeparador(seccionId);
    }
    // Nota: para especialidades el separador ya fue actualizado dentro del bloque de movimiento.

    // ── Actualizar contador de stats y pills en tiempo real ─────────────────────
    // El paginador renderiza stats y pills solo al llamar renderPagina(). Aquí
    // actualizamos ambos widgets directamente en el DOM sin re-renderizar la página,
    // para que el usuario vea el cambio inmediatamente al responder cada pregunta.
    if (typeof window._pag2UpdateStats === 'function') {
      window._pag2UpdateStats(seccionId);
    }

    // ===== Verificar si se respondió la ÚLTIMA pregunta y mostrar puntuación automáticamente =====
    const todasRespondidas = preguntas.every((_, idx) => 
      window.puntajesPorSeccion[seccionId]?.[idx] !== null && 
      window.puntajesPorSeccion[seccionId]?.[idx] !== undefined
    );
    if (todasRespondidas && !state[seccionId]?.totalShown) {
      // Pequeño delay para que el DOM se actualice primero
      setTimeout(() => mostrarResultadoFinal(seccionId), 300);
    }
  }

  // ======== Frases motivacionales por rango de porcentaje ========
  function getFraseMotivacional(score, total) {
    const pct = total > 0 ? (score / total) * 100 : 0;
    if (pct === 100) {
      return "🏆 ¡Perfecto! Dominás cada concepto con maestría. Sos exactamente el médico que el sistema necesita.";
    } else if (pct >= 91) {
      return "🌟 ¡Excelente resultado! Estás muy cerca de la cima. Un pequeño ajuste más y alcanzarás la perfección.";
    } else if (pct >= 81) {
      return "💪 ¡Muy bien! Tu preparación es sólida. Revisá los errores con calma y vas a llegar más alto todavía.";
    } else if (pct >= 71) {
      return "📈 ¡Buen trabajo! Tenés una base firme. Con constancia y repaso vas a seguir creciendo rápidamente.";
    } else if (pct >= 61) {
      return "🔍 Vas por buen camino. Cada error es una oportunidad de aprendizaje. ¡Seguí adelante con determinación!";
    } else if (pct >= 51) {
      return "🌱 Estás en la mitad del camino. La medicina se aprende paso a paso. ¡Tu esfuerzo de hoy es tu éxito de mañana!";
    } else if (pct >= 41) {
      return "🔥 No te rindas. Los mejores médicos también tuvieron momentos difíciles. Cada intento te hace más fuerte.";
    } else if (pct >= 31) {
      return "💡 Este resultado te muestra exactamente dónde enfocar tu energía. ¡Esa claridad es un regalo valioso!";
    } else if (pct >= 21) {
      return "❤️ El comienzo siempre es el más duro. Lo importante no es dónde empezás, sino la decisión de seguir intentándolo.";
    } else {
      return "🌅 Cada experto fue alguna vez un principiante. Hoy es solo el inicio de tu transformación. ¡Volvé a intentarlo con confianza!";
    }
  }

  // ======== Mostrar resultado final con frase motivacional ========
  function mostrarResultadoFinal(seccionId) {
    const preguntas = preguntasPorSeccion[seccionId] || [];
    const resultNode = document.getElementById(`resultado-total-${seccionId}`);
    if (!resultNode) return;

    const totalScore = window.puntajesPorSeccion[seccionId].reduce((a, b) => a + (b || 0), 0);
    const frase = getFraseMotivacional(totalScore, preguntas.length);

    resultNode.className = "resultado-final";
    resultNode.innerHTML = `
      <div style="font-size:1.3rem;font-weight:bold;margin-bottom:8px;">
        Puntuación total: ${totalScore} / ${preguntas.length}
      </div>
      <div style="font-size:1rem;margin-top:6px;padding:10px 14px;background:#f0f8ff;border-left:4px solid #0d7490;border-radius:6px;line-height:1.5;color:#1a1a2e;">
        ${frase}
      </div>`;

    state[seccionId].totalShown = true;
    saveJSON(STORAGE_KEY, state);

    attemptLog.push({
      sectionId: seccionId,
      sectionTitle: getSectionTitle(seccionId),
      iso: todayISO(),
      score: totalScore,
      total: preguntas.length
    });
    saveJSON(ATTEMPT_LOG_KEY, attemptLog);

    // Scroll suave hacia el resultado
    resultNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function mostrarPuntuacionTotal(seccionId) {
    const preguntas = preguntasPorSeccion[seccionId] || [];
    const resultNode = document.getElementById(`resultado-total-${seccionId}`);
    if (!resultNode) return;

    // Verificar si hay preguntas sin responder
    const faltan = preguntas
      .map((_, idx) => (window.puntajesPorSeccion[seccionId]?.[idx] === null ? idx + 1 : null))
      .filter(v => v !== null);

    if (faltan.length > 0) {
      // Solo mostrar advertencia, NO mostrar puntuación
      resultNode.className = "mensaje-error";
      resultNode.textContent =
        faltan.length === 1
          ? `Falta responder la pregunta ${faltan[0]}`
          : `Faltan responder las preguntas ${faltan.join(", ")}`;
      return;
    }

    // Todas respondidas: mostrar resultado final (si no estaba ya mostrado)
    if (!state[seccionId]?.totalShown) {
      mostrarResultadoFinal(seccionId);
    }
    // Si ya está mostrado, el botón no hace nada (el resultado ya está visible)
  }

  // ======== Estilos compartidos para modales (reinicio, etc.) ========
  function inyectarEstilosModalSalida() {
    if (document.getElementById('modal-salida-styles')) return;
    const style = document.createElement('style');
    style.id = 'modal-salida-styles';
    style.textContent = `
      @keyframes modalSalidaOverlay {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes modalSalidaEntrada {
        from { opacity: 0; transform: scale(0.88) translateY(22px); }
        to   { opacity: 1; transform: scale(1) translateY(0); }
      }
      .ms-caja {
        background: #fff;
        border-radius: 20px;
        box-shadow: 0 28px 70px rgba(0,0,0,0.22), 0 4px 18px rgba(0,0,0,0.09);
        padding: 38px 40px 32px;
        max-width: 460px;
        width: 92%;
        text-align: center;
        animation: modalSalidaEntrada 0.34s cubic-bezier(0.34,1.56,0.64,1) both;
        position: relative;
      }
      .ms-icono {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: linear-gradient(135deg, #e0f2fe, #bae6fd);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.9rem;
        margin: 0 auto 20px;
        box-shadow: 0 4px 14px rgba(13,116,144,0.15);
      }
      .ms-titulo {
        font-size: 1.22rem;
        font-weight: 700;
        color: #0f172a;
        margin-bottom: 10px;
        line-height: 1.3;
      }
      .ms-mensaje {
        font-size: 0.91rem;
        color: #475569;
        line-height: 1.65;
        margin-bottom: 10px;
      }
      .ms-badge {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        background: linear-gradient(135deg, #f0fdf4, #dcfce7);
        border: 1px solid #86efac;
        color: #166534;
        border-radius: 100px;
        padding: 6px 16px;
        font-size: 0.84rem;
        font-weight: 600;
        margin-bottom: 24px;
        letter-spacing: 0.01em;
      }
      .ms-btns {
        display: flex;
        gap: 12px;
        justify-content: center;
      }
      .ms-btn-quedar {
        flex: 1;
        padding: 12px 20px;
        border-radius: 10px;
        font-size: 0.92rem;
        font-weight: 600;
        cursor: pointer;
        border: 1.5px solid #e2e8f0;
        background: #f8fafc;
        color: #475569;
        transition: all 0.18s ease;
        min-width: 120px;
      }
      .ms-btn-quedar:hover {
        background: #e2e8f0;
        border-color: #cbd5e1;
      }
      .ms-btn-salir {
        flex: 1;
        padding: 12px 20px;
        border-radius: 10px;
        font-size: 0.92rem;
        font-weight: 600;
        cursor: pointer;
        border: none;
        background: linear-gradient(135deg, #0d7490, #0891b2);
        color: #fff;
        box-shadow: 0 4px 14px rgba(13,116,144,0.28);
        transition: all 0.18s ease;
        min-width: 120px;
      }
      .ms-btn-salir:hover {
        background: linear-gradient(135deg, #0e6584, #0d7490);
        box-shadow: 0 6px 20px rgba(13,116,144,0.38);
        transform: translateY(-1px);
      }
      .ms-btn-salir:active { transform: translateY(0); }
    `;
    document.head.appendChild(style);
  }

  // ======== Modal de reinicio ========
  function mostrarModalReinicio(seccionId, hayRespuestas) {
    inyectarEstilosModalSalida(); // reutiliza los mismos estilos base

    const existente = document.getElementById('modal-reinicio-cuestionario');
    if (existente) existente.remove();

    const overlay = document.createElement('div');
    overlay.id = 'modal-reinicio-cuestionario';
    // Reutilizar estilos del modal de salida cambiando el ID
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:25000;display:flex;align-items:center;
      justify-content:center;background:rgba(15,23,42,0.62);
      backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);
    `;

    overlay.innerHTML = `
      <div class="ms-caja" style="animation:modalSalidaEntrada 0.34s cubic-bezier(0.34,1.56,0.64,1) both;">
        <div class="ms-icono" style="background:linear-gradient(135deg,#fff7ed,#fed7aa);">🔄</div>
        <div class="ms-titulo">¿Reiniciar el cuestionario?</div>
        <div class="ms-mensaje">
          ${hayRespuestas
            ? 'Se borrarán <strong>todas tus respuestas y puntuación</strong> y las preguntas aparecerán en un nuevo orden aleatorio.'
            : 'Las preguntas aparecerán en un nuevo orden aleatorio.'}
        </div>
        <div class="ms-badge" style="background:linear-gradient(135deg,#fff7ed,#fed7aa);border-color:#fdba74;color:#9a3412;">
          ⚠️ Esta acción no se puede deshacer
        </div>
        <div class="ms-btns">
          <button class="ms-btn-quedar" id="mr-btn-cancelar">Cancelar</button>
          <button class="ms-btn-salir" id="mr-btn-confirmar" style="background:linear-gradient(135deg,#e67e22,#ca6f1e);box-shadow:0 4px 14px rgba(230,126,34,0.28);">Reiniciar</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('mr-btn-cancelar').addEventListener('click', () => overlay.remove());
    document.getElementById('mr-btn-confirmar').addEventListener('click', () => {
      overlay.remove();
      limpiarSeccion(seccionId, true);
      (window.generarCuestionario || generarCuestionario)(seccionId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  }

  // ======== Reiniciar Examen ========
  window.reiniciarExamen = function(seccionId) {
    const s = state[seccionId];
    const hayRespuestas = s && s.graded && Object.keys(s.graded).some(k => s.graded[k]);
    mostrarModalReinicio(seccionId, hayRespuestas);
  };

  function hasAnySelection(seccionId, qIndex) {
    const name = `pregunta${seccionId}${qIndex}`;
    const inputs = Array.from(document.getElementsByName(name));
    return inputs.some(inp => inp.checked);
  }

  // ======== Navegación (mostrar/ocultar páginas) ========
  window.mostrarCuestionario = function (seccionId) {
    saveScrollPosition();
    saveLastSection(seccionId);  // Guardar para volver al ítem correcto al regresar
    sessionStorage.setItem('quiz_active_section', seccionId); // Persistir para F5
    history.pushState({ section: seccionId }, `Cuestionario ${seccionId}`, `#${seccionId}`);
    showSection(seccionId);
  };

  window.mostrarSubmenu = function (submenuId) {
    saveScrollPosition();
    saveLastSection(submenuId);  // Al volver al menú principal, resaltar el ítem del submenú
    // Ocultar el menú principal
    document.getElementById("menu-principal")?.classList.add("oculto");
    // Ocultar todos los submenús y cuestionarios
    document.querySelectorAll(".menu-principal[id$='-submenu']").forEach(s => s.style.display = "none");
    document.querySelectorAll(".pagina-cuestionario").forEach(p => p.classList.remove("activa"));
    // Mostrar el submenú específico
    const submenu = document.getElementById(submenuId);
    if (submenu) {
      submenu.style.display = "block";
    }
    // Agregar al historial del navegador para que "atrás" vuelva al menú principal
    history.pushState({ submenu: submenuId }, submenuId, `#${submenuId}`);
    window.scrollTo(0, 0);
  };

  window.volverAlSubmenu = function(submenuId) {
    if (currentSection && state[currentSection] && state[currentSection].totalShown) {
      // Cuestionario completado: limpiar todo y aleatorizar para próximo intento
      limpiarSeccion(currentSection, true);
      currentSection = null;
      document.querySelectorAll(".pagina-cuestionario").forEach(p => p.classList.remove("activa"));
      mostrarSubmenu(submenuId);
      return;
    }

    if (currentSection && state[currentSection] && !state[currentSection].totalShown) {
      const s = state[currentSection];
      // Sin respuestas: aleatorizar de nuevo
      if (!s || !s.graded || !Object.keys(s.graded).some(k => s.graded[k])) {
        limpiarSeccion(currentSection, true);
      } else {
        // Con progreso parcial: re-mezclar sin responder igual que _ejecutarShowMenu
        if (Array.isArray(s.unansweredOrder) &&
            !esExamenUnico(currentSection) && !esExamenUBA(currentSection) &&
            !esCompilado(currentSection) && currentSection !== 'simulador' &&
            !(_currentUserData && _currentUserData.role === 'admin')) {
          s.unansweredOrder = [];
          saveJSON(STORAGE_KEY, state);
        }
      }
    }

    currentSection = null;
    document.querySelectorAll(".pagina-cuestionario").forEach(p => p.classList.remove("activa"));
    mostrarSubmenu(submenuId);
  };

  window.volverAlMenu = function () {
    // Siempre forzar URL a #menu sin importar desde dónde se venga
    history.replaceState({ section: null }, 'Menú Principal', '#menu');
    document.querySelectorAll(".menu-principal[id$='-submenu']").forEach(s => s.style.display = "none");
    showMenu();
  };

  // ======== Botón flotante "Ver mi progreso" ========
  function buildProgressUI() {
    // Botón "Ver mi progreso" — se crea pero se oculta;
    // se muestra en la barra de usuario (fb-user-bar)
    const btn = document.createElement("button");
    btn.id = "btn-ver-progreso";
    btn.textContent = "Ver mi progreso";
    btn.style.display = "none"; // oculto; se activa desde la barra de usuario
    document.body.appendChild(btn);

    const panel = document.createElement("div");
    panel.id = "panel-progreso";
    panel.style.position = "fixed";
    panel.style.right = "16px";
    panel.style.bottom = "70px";
    panel.style.width = "320px";
    panel.style.maxWidth = "92vw";
    panel.style.maxHeight = "60vh";
    panel.style.overflow = "auto";
    panel.style.background = "#fff";
    panel.style.border = "1px solid #dee2e6";
    panel.style.borderRadius = "12px";
    panel.style.boxShadow = "0 8px 24px rgba(0,0,0,.2)";
    panel.style.padding = "12px";
    panel.style.display = "none";
    panel.style.zIndex = "1001";

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";
    header.style.gap = "8px";

    const title = document.createElement("strong");
    title.textContent = "Historial de intentos";
    title.style.flex = "1";

    // Botón basurero
    const trash = document.createElement("button");
    trash.title = "Borrar historial";
    trash.innerHTML = "🗑️";
    trash.style.border = "none";
    trash.style.background = "none";
    trash.style.cursor = "pointer";
    trash.style.fontSize = "1.1rem";
    trash.style.padding = "4px 6px";
    trash.style.borderRadius = "6px";
    trash.style.transition = "background 0.15s";
    trash.onmouseenter = () => trash.style.background = "#fee2e2";
    trash.onmouseleave = () => trash.style.background = "none";
    trash.addEventListener("click", () => {
      if (confirm("¿Borrar todo el historial de intentos?")) {
        localStorage.removeItem(ATTEMPT_LOG_KEY);
        attemptLog = [];
        renderProgress(content);
      }
    });

    const close = document.createElement("button");
    close.textContent = "Cerrar";
    close.style.border = "none";
    close.style.background = "#e0e0e0";
    close.style.borderRadius = "8px";
    close.style.padding = "6px 10px";
    close.style.cursor = "pointer";

    header.appendChild(title);
    header.appendChild(trash);
    header.appendChild(close);

    const content = document.createElement("div");
    content.id = "contenido-progreso";
    content.style.marginTop = "10px";
    content.innerHTML = "<em>Sin intentos aún.</em>";

    panel.appendChild(header);
    panel.appendChild(content);
    document.body.appendChild(panel);

    btn.addEventListener("click", () => {
      renderProgress(content);
      panel.style.display = "block";
    });
    close.addEventListener("click", () => (panel.style.display = "none"));
  }

  function renderProgress(container) {
    const data = loadJSON(ATTEMPT_LOG_KEY, []);
    if (!data.length) {
      container.innerHTML = "<em>Sin intentos aún.</em>";
      return;
    }

    const sorted = data.slice().sort((a, b) => {
      const da = new Date(a.iso).getTime();
      const db = new Date(b.iso).getTime();
      if (db !== da) return db - da;
      if (a.sectionTitle !== b.sectionTitle) return a.sectionTitle.localeCompare(b.sectionTitle);
      return db - da;
    });

    const byDate = {};
    sorted.forEach(item => {
      const d = toLocalDateStr(item.iso);
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(item);
    });

    container.innerHTML = "";
    Object.keys(byDate).forEach(dateLabel => {
      const group = document.createElement("div");
      group.style.marginBottom = "12px";
      const h = document.createElement("div");
      h.style.fontWeight = "bold";
      h.style.marginBottom = "6px";
      h.textContent = dateLabel;
      group.appendChild(h);

      byDate[dateLabel].forEach(item => {
        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.justifyContent = "space-between";
        row.style.alignItems = "center";
        row.style.padding = "6px 8px";
        row.style.border = "1px solid #eee";
        row.style.borderRadius = "8px";
        row.style.marginBottom = "6px";
        const left = document.createElement("div");
        left.textContent = item.sectionTitle;
        const right = document.createElement("div");
        right.textContent = `${item.score}/${item.total}`;
        right.style.fontWeight = "bold";
        row.appendChild(left);
        row.appendChild(right);
        group.appendChild(row);
      });

      container.appendChild(group);
    });
  }

  // ======== Inicio ========
  // Detectar si la página fue recargada (F5 / CTRL+SHIFT+R / botón recargar del navegador).
  // performance.navigation.type === 1 indica recarga. En navegadores modernos se usa
  // PerformanceNavigationTiming. En ambos casos marcamos _isPageReload=true para que
  // DOMContentLoaded no restaure la sección anterior y siempre vuelva al menú.
  window._isPageReload = false;
  try {
    if (window.performance) {
      const navEntries = performance.getEntriesByType('navigation');
      if (navEntries.length > 0) {
        window._isPageReload = navEntries[0].type === 'reload';
      } else if (performance.navigation) {
        window._isPageReload = performance.navigation.type === 1;
      }
    }
  } catch (_) {}

  document.addEventListener("DOMContentLoaded", () => {
    // Cerrar todas las explicaciones al cargar la página (recarga/F5)
    Object.keys(state).forEach(sid => {
      if (state[sid] && state[sid].explanationShown) state[sid].explanationShown = {};
    });
    saveJSON(STORAGE_KEY, state);

    buildProgressUI();
    setupBrowserNavigation();
    clearScrollPosition();
    // Los editores de contenido/explicaciones son exclusivos del admin.
    // Se activan después de que Firebase confirme que el usuario es admin.
    window._buildEditoresAdminPendiente = true;

    // NO restaurar la sección aquí: onAuthStateChanged lo hace DESPUÉS de que
    // Firebase autentica al usuario y sincroniza el progreso desde la nube.
    // Si lo hacemos acá también, generarCuestionario se llama dos veces en mobile
    // (una vez sin progreso y otra con progreso), la segunda borra el render de la primera
    // y el cuestionario queda vaciado con el contador en 0/646.
    // onAuthStateChanged ya maneja correctamente el hash en la línea ~6574.
  });

  // ======== MEDIDAS DE SEGURIDAD ========
  
  document.addEventListener('contextmenu', function(e) {
      e.preventDefault();
      return false;
  });

  document.addEventListener('keydown', function(e) {
      if (e.keyCode === 123 ||
          (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) ||
          (e.ctrlKey && e.keyCode === 85) ||
          (e.ctrlKey && e.keyCode === 83) ||
          (e.ctrlKey && e.keyCode === 80) ||
          (e.ctrlKey && e.keyCode === 65)) {
          e.preventDefault();
          return false;
      }
  });

  // DESACTIVADO — el detector de DevTools está controlado desde index.html (comentado allí).
  // Activarlo aquí causaba recargas en móviles donde el teclado virtual cambia el tamaño
  // de la ventana, lo que impedía que los cuestionarios se abrieran correctamente.
  /* let devtools = {open: false, orientation: null};
  setInterval(function() {
      if (document.body.classList.contains('can-select')) { devtools.open = false; return; }
      if (window.outerHeight - window.innerHeight > 160 || 
          window.outerWidth - window.innerWidth > 160) {
          if (!devtools.open) {
              devtools.open = true;
              alert('Por favor, cierre las herramientas de desarrollo para continuar.');
              window.location.reload();
          }
      } else {
          devtools.open = false;
      }
  }, 500); */

  document.addEventListener('dragstart', function(e) {
      e.preventDefault();
      return false;
  });

  document.addEventListener('selectstart', function(e) {
      if (document.body.classList.contains('can-select')) return; // admin/autorizado
      if (!e.target.matches('input, textarea')) {
          e.preventDefault();
          return false;
      }
  });

  window.addEventListener('beforeprint', function(e) {
      e.preventDefault();
      alert('La impresión no está permitida en esta aplicación.');
      return false;
  });

  console.log('%cADVERTENCIA!', 'color: red; font-size: 50px; font-weight: bold;');
  console.log('%cEsta función del navegador está destinada a desarrolladores. Si alguien te pidió copiar y pegar algo aquí, es una estafa.', 'color: red; font-size: 16px;');
  
  // DESACTIVADO — limpiar la consola cada 3s impedía ver errores durante el debug.
  // setInterval(function() { console.clear(); }, 3000);

  // ======== FUNCIONES PARA SIMULACRO DE EXAMEN ========
  
  const SIMULACRO_STORAGE_KEY = "simulacro_preguntas_v1";
  
  // Distribución objetivo de preguntas por especialidad (total 100)
  const distribucionObjetivo = {
    pediatria: 18,
    ginecologia: 11,
    obstetricia: 11,
    cardiologia: 11,
    saludpublica: 11,
    infectologia: 8,
    endocrinologia: 6,
    neumonologia: 4,
    cirugia: 4,
    hematologia: 2,
    digestivo: 2,
    neurologia: 2,
    nefrologia: 2,
    dermatologia: 2,
    psiquiatria: 2,
    medicinalegal: 2,
    medicinafamiliar: 2
  };
  
  function obtenerPreguntasSimulacro() {
    // Intentar cargar preguntas guardadas
    const saved = localStorage.getItem(SIMULACRO_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error al cargar preguntas guardadas:', e);
      }
    }
    
    // Si no hay preguntas guardadas, generar nuevas
    return generarNuevasPreguntasSimulacro();
  }
  
  function generarNuevasPreguntasSimulacro() {
    console.log('🎲 Generando nuevo simulacro de 100 preguntas...');
    
    const preguntasSeleccionadas = [];
    
    // Para cada especialidad en la distribución
    for (const [especialidad, cantidad] of Object.entries(distribucionObjetivo)) {
      // Verificar que la especialidad existe en preguntasPorSeccion
      if (!preguntasPorSeccion[especialidad]) {
        console.warn(`⚠️ Especialidad ${especialidad} no encontrada en preguntasPorSeccion`);
        continue;
      }
      
      const preguntasDisponibles = preguntasPorSeccion[especialidad];
      
      if (preguntasDisponibles.length === 0) {
        console.warn(`⚠️ No hay preguntas disponibles para ${especialidad}`);
        continue;
      }
      
      console.log(`📝 ${especialidad}: solicitadas=${cantidad}, disponibles=${preguntasDisponibles.length}`);
      
      // Crear array de índices disponibles
      const indicesDisponibles = preguntasDisponibles.map((_, idx) => idx);
      
      // Mezclar los índices
      const indicesMezclados = shuffle(indicesDisponibles, 'simulacro-' + especialidad + '-' + Date.now());
      
      // Tomar exactamente la cantidad especificada
      // Si hay menos disponibles, repetir índices de manera circular
      for (let i = 0; i < cantidad; i++) {
        const indice = indicesMezclados[i % indicesMezclados.length];
        preguntasSeleccionadas.push({
          especialidad: especialidad,
          indiceOriginal: indice,
          pregunta: preguntasDisponibles[indice]
        });
      }
    }
    
    console.log(`📊 Total de preguntas seleccionadas: ${preguntasSeleccionadas.length}`);
    
    // Verificar que tenemos exactamente 100
    if (preguntasSeleccionadas.length !== 100) {
      console.error(`❌ ERROR: Se generaron ${preguntasSeleccionadas.length} preguntas en lugar de 100`);
      console.error('Distribución objetivo:', distribucionObjetivo);
      console.error('Total objetivo:', Object.values(distribucionObjetivo).reduce((a, b) => a + b, 0));
    }
    
    // Mezclar todas las preguntas seleccionadas
    const preguntasMezcladas = shuffle(preguntasSeleccionadas, 'simulacro-final-' + Date.now());
    
    console.log(`✅ Simulacro generado con ${preguntasMezcladas.length} preguntas`);
    
    // Guardar en localStorage
    localStorage.setItem(SIMULACRO_STORAGE_KEY, JSON.stringify(preguntasMezcladas));
    
    return preguntasMezcladas;
  }
  
  window.crearNuevoSimulacro = function() {
    // Mostrar diálogo de confirmación personalizado
    mostrarDialogoConfirmacion(
      '¿Deseas crear un nuevo simulacro?',
      'Se generarán 100 preguntas nuevas y se perderá el progreso actual.',
      function() {
        // Al aceptar: crear nuevo simulacro
        ejecutarCrearNuevoSimulacro();
      },
      function() {
        // Al cancelar: no hacer nada, mantener estado actual
        console.log('✖️ Creación de nuevo simulacro cancelada');
      }
    );
  };
  
  function ejecutarCrearNuevoSimulacro() {
    // Reiniciar el temporizador
    reiniciarTemporizador();
    
    // Limpiar el estado del simulacro actual
    delete state['simulador'];
    saveJSON(STORAGE_KEY, state);
    
    // Limpiar las preguntas guardadas en localStorage
    localStorage.removeItem(SIMULACRO_STORAGE_KEY);
    console.log('🗑️ localStorage limpiado, se generarán nuevas preguntas');
    
    // Limpiar puntajes
    if (window.puntajesPorSeccion && window.puntajesPorSeccion['simulador']) {
      window.puntajesPorSeccion['simulador'] = [];
    }
    
    // Limpiar resultado visual
    const resultadoTotal = document.getElementById('resultado-total-simulador');
    if (resultadoTotal) {
      resultadoTotal.textContent = "";
      resultadoTotal.className = "resultado-final";
    }
    
    // Generar nuevas preguntas (esto creará un nuevo conjunto)
    const nuevasPreguntas = generarNuevasPreguntasSimulacro();
    
    // Actualizar preguntasPorSeccion con las nuevas preguntas
    preguntasPorSeccion['simulador'] = nuevasPreguntas.map(item => item.pregunta);
    
    // Regenerar el cuestionario
    generarCuestionario('simulador');
    
    // Scroll al inicio
    window.scrollTo(0, 0);
  }
  
  window.repetirSimulacro = function() {
    // Mostrar diálogo de confirmación personalizado
    mostrarDialogoConfirmacion(
      '¿Estás seguro de que deseas repetir el simulacro actual?',
      'Se mantendrán las mismas 100 preguntas en el mismo orden. Se borrarán todas las respuestas marcadas y se aleatorizarán nuevamente las opciones de cada pregunta.',
      function() {
        // Al aceptar: repetir simulacro
        ejecutarRepetirSimulacro();
      },
      function() {
        // Al cancelar: no hacer nada, mantener estado actual
        console.log('✖️ Repetición de simulacro cancelada');
      }
    );
  };
  
  function ejecutarRepetirSimulacro() {
    // Reiniciar el temporizador
    reiniciarTemporizador();
    
    // Limpiar el estado del simulacro actual pero mantener las preguntas
    delete state['simulador'];
    saveJSON(STORAGE_KEY, state);
    
    // Limpiar puntajes
    if (window.puntajesPorSeccion && window.puntajesPorSeccion['simulador']) {
      window.puntajesPorSeccion['simulador'] = Array(
        preguntasPorSeccion['simulador'].length
      ).fill(null);
    }
    
    // Limpiar resultado visual
    const resultadoTotal = document.getElementById('resultado-total-simulador');
    if (resultadoTotal) {
      resultadoTotal.textContent = "";
      resultadoTotal.className = "resultado-final";
    }
    
    // Regenerar el cuestionario (esto aleatorizará las opciones nuevamente)
    generarCuestionario('simulador');
    
    // Scroll al inicio
    window.scrollTo(0, 0);
  }
  
  function mostrarDialogoConfirmacion(titulo, mensaje, onAceptar, onCancelar) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:19999;display:flex;align-items:center;
      justify-content:center;background:rgba(15,23,42,0.55);
      backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);
      animation:overlayEntrada 0.2s ease both;
    `;
    
    const dialogo = document.createElement('div');
    dialogo.style.cssText = `
      background:#fff;padding:36px 38px 30px;border-radius:20px;
      box-shadow:0 24px 64px rgba(0,0,0,0.2),0 4px 16px rgba(0,0,0,0.08);
      max-width:440px;width:90%;text-align:center;
      animation:modalEntrada 0.35s cubic-bezier(0.34,1.56,0.64,1) both;
    `;
    
    const tituloEl = document.createElement('h3');
    tituloEl.textContent = titulo;
    tituloEl.style.cssText = `
      margin-bottom:12px;color:#0f172a;font-size:1.2rem;font-weight:700;line-height:1.3;
    `;
    
    const mensajeEl = document.createElement('p');
    mensajeEl.textContent = mensaje;
    mensajeEl.style.cssText = `
      margin-bottom:28px;color:#64748b;line-height:1.6;font-size:0.92rem;
    `;
    
    const botonesDiv = document.createElement('div');
    botonesDiv.style.cssText = `display:flex;gap:12px;justify-content:center;`;
    
    const btnAceptar = document.createElement('button');
    btnAceptar.textContent = 'Aceptar';
    btnAceptar.style.cssText = `
      min-width:130px;padding:12px 24px;border-radius:10px;border:none;cursor:pointer;
      font-size:0.92rem;font-weight:600;
      background:linear-gradient(135deg,#0d7490,#0891b2);color:#fff;
      box-shadow:0 4px 12px rgba(13,116,144,0.28);transition:all 0.18s ease;
    `;
    btnAceptar.onmouseenter = () => { btnAceptar.style.transform='translateY(-1px)'; btnAceptar.style.boxShadow='0 6px 18px rgba(13,116,144,0.38)'; };
    btnAceptar.onmouseleave = () => { btnAceptar.style.transform=''; btnAceptar.style.boxShadow='0 4px 12px rgba(13,116,144,0.28)'; };
    btnAceptar.onclick = () => { document.body.removeChild(overlay); if (onAceptar) onAceptar(); };
    
    const btnCancelar = document.createElement('button');
    btnCancelar.textContent = 'Cancelar';
    btnCancelar.style.cssText = `
      min-width:130px;padding:12px 24px;border-radius:10px;border:none;cursor:pointer;
      font-size:0.92rem;font-weight:600;background:#f1f5f9;color:#475569;
      transition:all 0.18s ease;
    `;
    btnCancelar.onmouseenter = () => { btnCancelar.style.background='#e2e8f0'; };
    btnCancelar.onmouseleave = () => { btnCancelar.style.background='#f1f5f9'; };
    btnCancelar.onclick = () => { document.body.removeChild(overlay); if (onCancelar) onCancelar(); };
    
    botonesDiv.appendChild(btnAceptar);
    botonesDiv.appendChild(btnCancelar);
    dialogo.appendChild(tituloEl);
    dialogo.appendChild(mensajeEl);
    dialogo.appendChild(botonesDiv);
    overlay.appendChild(dialogo);
    document.body.appendChild(overlay);
  }
  
  // ======== TERMINAR SIMULACRO (botón inferior) ========
  window.terminarSimulacro = function() {
    const s = state['simulador'];
    const hasProgress = s && Object.keys(s.graded || {}).length > 0;
    const totalShown = s && s.totalShown;
    
    // Si ya terminó, mostrar el diálogo de finalizado
    if (totalShown) {
      mostrarDialogoFinalizado('simulador');
      return;
    }
    
    // Mostrar modal de confirmación para salir
    const overlay = document.createElement('div');
    overlay.id = 'modal-terminar-simulacro';
    
    const progresoPct = hasProgress && preguntasPorSeccion['simulador']
      ? Math.round((Object.keys(s.graded || {}).length / preguntasPorSeccion['simulador'].length) * 100)
      : 0;
    
    overlay.innerHTML = `
      <div class="modal-caja">
        <div class="modal-icono">⚠️</div>
        <div class="modal-titulo">¿Salir del simulacro?</div>
        <div class="modal-mensaje">
          Vas a salir del simulacro en curso.${hasProgress
            ? ` Llevás respondido el ${progresoPct}% del examen.`
            : ''}<br><br>
          <strong>Si salís ahora y volvés a entrar, se perderá todo el progreso.</strong>
        </div>
        <div class="modal-btns">
          <button class="btn-modal-cancelar" id="btn-cancel-terminar">Cancelar</button>
          <button class="btn-modal-aceptar" id="btn-ok-terminar">Sí, salir</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    
    document.getElementById('btn-cancel-terminar').onclick = function() {
      overlay.remove();
    };
    document.getElementById('btn-ok-terminar').onclick = function() {
      overlay.remove();
      // Limpiar completamente el estado del simulacro al salir
      detenerTemporizador();
      delete state['simulador'];
      saveJSON(STORAGE_KEY, state);
      localStorage.removeItem(SIMULACRO_STORAGE_KEY);
      localStorage.removeItem(TIMER_STORAGE_KEY);
      if (window.puntajesPorSeccion) window.puntajesPorSeccion['simulador'] = [];
      const banner = document.getElementById('banner-modo-revision');
      if (banner) banner.remove();
      currentSection = null;
      document.querySelectorAll(".pagina-cuestionario").forEach(p => p.classList.remove("activa"));
      document.getElementById("menu-principal")?.classList.remove("oculto");
      restoreScrollPosition();
    };
    
    // Cerrar con Escape
    const onKey = (e) => { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onKey); } };
    document.addEventListener('keydown', onKey);
  };

  window.volverAlMenuSimulacro = function(seccionId) {
    // Verificar si hay progreso en el simulacro
    const s = state[seccionId];
    const totalShown = s && s.totalShown;
    const hasProgress = s && Object.keys(s.graded || {}).length > 0;
    
    if (hasProgress && !totalShown) {
      // Mostrar ventana emergente con opciones
      mostrarDialogoVolverMenu(seccionId);
    } else if (totalShown) {
      // Si ya mostró el total, preguntar entre repetir o crear nuevo
      mostrarDialogoFinalizado(seccionId);
    } else {
      // No hay progreso, volver directamente
      volverAlMenu();
    }
  };
  
  function mostrarDialogoVolverMenu(seccionId) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:19999;display:flex;align-items:center;
      justify-content:center;background:rgba(15,23,42,0.55);
      backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);
    `;
    
    const dialogo = document.createElement('div');
    dialogo.style.cssText = `
      background:#fff;padding:36px 38px 30px;border-radius:20px;
      box-shadow:0 24px 64px rgba(0,0,0,0.2),0 4px 16px rgba(0,0,0,0.08);
      max-width:420px;width:90%;text-align:center;
      animation:modalEntrada 0.35s cubic-bezier(0.34,1.56,0.64,1) both;
    `;
    
    dialogo.innerHTML = `
      <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#fef3c7,#fde68a);
        display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin:0 auto 16px;">⚠️</div>
      <h3 style="margin-bottom:10px;color:#0f172a;font-size:1.18rem;font-weight:700;">Simulacro en curso</h3>
      <p style="margin-bottom:24px;color:#64748b;line-height:1.6;font-size:0.91rem;">
        Tenés progreso sin finalizar en este simulacro. ¿Qué deseas hacer?
      </p>
    `;
    
    const botonesDiv = document.createElement('div');
    botonesDiv.style.cssText = `display:flex;flex-direction:column;gap:10px;`;
    
    const btns = [
      { texto: '↩️ Continuar el simulacro', color: 'linear-gradient(135deg,#0d7490,#0891b2)', sombra: 'rgba(13,116,144,0.3)', accion: () => document.body.removeChild(overlay) },
      { texto: '🔄 Crear nuevo simulacro', color: 'linear-gradient(135deg,#6366f1,#4f46e5)', sombra: 'rgba(99,102,241,0.28)', accion: () => { document.body.removeChild(overlay); ejecutarCrearNuevoSimulacro(); } },
      { texto: '🔁 Repetir este simulacro', color: 'linear-gradient(135deg,#0891b2,#0e7490)', sombra: 'rgba(8,145,178,0.28)', accion: () => { document.body.removeChild(overlay); ejecutarRepetirSimulacro(); } },
      { texto: '🏠 Volver al menú principal', color: '#f1f5f9', colorTexto: '#475569', sombra: 'none', accion: () => { document.body.removeChild(overlay); volverAlMenu(); } }
    ];
    
    btns.forEach(b => {
      const btn = document.createElement('button');
      btn.textContent = b.texto;
      btn.style.cssText = `
        width:100%;padding:12px 20px;border-radius:10px;border:none;cursor:pointer;
        font-size:0.92rem;font-weight:600;transition:all 0.18s ease;
        background:${b.color};color:${b.colorTexto||'#fff'};
        box-shadow:${b.sombra === 'none' ? 'none' : '0 4px 12px ' + b.sombra};
      `;
      btn.onmouseenter = () => { btn.style.transform='translateY(-1px)'; btn.style.filter='brightness(1.05)'; };
      btn.onmouseleave = () => { btn.style.transform=''; btn.style.filter=''; };
      btn.onclick = b.accion;
      botonesDiv.appendChild(btn);
    });
    
    dialogo.appendChild(botonesDiv);
    overlay.appendChild(dialogo);
    document.body.appendChild(overlay);
  }
  
  function mostrarDialogoFinalizado(seccionId) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:19999;display:flex;align-items:center;
      justify-content:center;background:rgba(15,23,42,0.55);
      backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);
    `;
    
    const dialogo = document.createElement('div');
    dialogo.style.cssText = `
      background:#fff;padding:36px 38px 30px;border-radius:20px;
      box-shadow:0 24px 64px rgba(0,0,0,0.2),0 4px 16px rgba(0,0,0,0.08);
      max-width:420px;width:90%;text-align:center;
      animation:modalEntrada 0.35s cubic-bezier(0.34,1.56,0.64,1) both;
    `;
    
    dialogo.innerHTML = `
      <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#d1fae5,#a7f3d0);
        display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin:0 auto 16px;">✅</div>
      <h3 style="margin-bottom:24px;color:#0f172a;font-size:1.18rem;font-weight:700;">Simulacro finalizado</h3>
    `;
    
    const botonesDiv = document.createElement('div');
    botonesDiv.style.cssText = `display:flex;flex-direction:column;gap:10px;`;
    
    const btns = [
      { texto: '🔄 Crear nuevo simulacro', color: 'linear-gradient(135deg,#6366f1,#4f46e5)', sombra: 'rgba(99,102,241,0.28)', accion: () => { document.body.removeChild(overlay); ejecutarCrearNuevoSimulacro(); volverAlMenu(); } },
      { texto: '🔁 Repetir simulacro', color: 'linear-gradient(135deg,#0891b2,#0e7490)', sombra: 'rgba(8,145,178,0.28)', accion: () => { document.body.removeChild(overlay); ejecutarRepetirSimulacro(); } },
      { texto: '🏠 Volver al menú principal', color: '#f1f5f9', colorTexto: '#475569', sombra: 'none', accion: () => { document.body.removeChild(overlay); volverAlMenu(); } }
    ];
    
    btns.forEach(b => {
      const btn = document.createElement('button');
      btn.textContent = b.texto;
      btn.style.cssText = `
        width:100%;padding:12px 20px;border-radius:10px;border:none;cursor:pointer;
        font-size:0.92rem;font-weight:600;transition:all 0.18s ease;
        background:${b.color};color:${b.colorTexto||'#fff'};
        box-shadow:${b.sombra === 'none' ? 'none' : '0 4px 12px ' + b.sombra};
      `;
      btn.onmouseenter = () => { btn.style.transform='translateY(-1px)'; btn.style.filter='brightness(1.05)'; };
      btn.onmouseleave = () => { btn.style.transform=''; btn.style.filter=''; };
      btn.onclick = b.accion;
      botonesDiv.appendChild(btn);
    });
    
    dialogo.appendChild(botonesDiv);
    overlay.appendChild(dialogo);
    document.body.appendChild(overlay);
  }
  
  // Inicializar preguntas del simulacro cuando se carga la página
  document.addEventListener('DOMContentLoaded', function() {
    // Si entramos directamente a simulador, cargar o generar preguntas
    if (window.location.hash === '#simulador') {
      const preguntasSimulacro = obtenerPreguntasSimulacro();
      preguntasPorSeccion['simulador'] = preguntasSimulacro.map(item => item.pregunta);
    }
  });
  
  // Modificar la función mostrarCuestionario para manejar el simulacro
  const mostrarCuestionarioOriginal = window.mostrarCuestionario;
  window.mostrarCuestionario = function(seccionId) {
    if (seccionId === 'simulador') {
      // Cargar o generar preguntas del simulacro
      const preguntasSimulacro = obtenerPreguntasSimulacro();
      preguntasPorSeccion['simulador'] = preguntasSimulacro.map(item => item.pregunta);
    }
    mostrarCuestionarioOriginal(seccionId);
  };




  // ════════════════════════════════════════════════════════════════
  // MÓDULO BUSCADOR GLOBAL
  // ════════════════════════════════════════════════════════════════

  const BUSCADOR_QUERY_KEY   = 'buscador_last_query_v1';
  const BUSCADOR_SCROLL_KEY  = 'buscador_scroll_v1';
  const BUSCADOR_CARD_KEY    = 'buscador_last_card_v1';
  const BUSCADOR_VISITED_KEY = 'buscador_visited_v1';  // sessionStorage

  let searchIndex   = [];
  let indexBuilt    = false;
  let indexBuilding = false;
  let debounceTimer = null;

  // ── Normalización (ignora tildes y mayúsculas) ──────────────────
  function bNormalize(str) {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  // ── Escape HTML seguro ──────────────────────────────────────────
  function bEscape(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Resaltar coincidencias ──────────────────────────────────────
  function bHighlight(text, query) {
    if (!query || query.length < 2) return bEscape(text);
    const nq  = bNormalize(query);
    const nt  = bNormalize(text);
    let result = '';
    let i = 0;
    while (i < text.length) {
      const idx = nt.indexOf(nq, i);
      if (idx === -1) { result += bEscape(text.slice(i)); break; }
      result += bEscape(text.slice(i, idx));
      result += `<mark class="bh">${bEscape(text.slice(idx, idx + nq.length))}</mark>`;
      i = idx + nq.length;
    }
    return result;
  }

  // ── Label legible de sección ────────────────────────────────────
  function bGetLabel(seccionId) {
    const page = document.getElementById(seccionId);
    if (page) {
      const h1 = page.querySelector('h1');
      if (h1) return h1.textContent.trim();
    }
    return seccionId;
  }

  // ── Año de la sección (para ordenar recientes primero) ──────────
  function bGetYear(label) {
    const m = label.match(/(\d{4})/);
    return m ? parseInt(m[1]) : 0;
  }

  // ── Tarjetas visitadas (sessionStorage) ─────────────────────────
  function bGetVisited() {
    try { return JSON.parse(sessionStorage.getItem(BUSCADOR_VISITED_KEY) || '{}'); }
    catch { return {}; }
  }
  function bMarkVisited(cardId) {
    const v = bGetVisited();
    v[cardId] = true;
    sessionStorage.setItem(BUSCADOR_VISITED_KEY, JSON.stringify(v));
  }

  // ── Lista completa de secciones buscables (todas las de Firestore) ──
  const TODAS_SECCIONES_BUSCADOR = [
    // Especialidades clínicas
    'pediatria','cardiologia','neurologia','endocrinologia','neumonologia',
    'nefrologia','digestivo','hematologia','infectologia','clinicamedica',
    // Gineco-obstétricas
    'ginecologia','obstetricia',
    // Quirúrgicas
    'cirugia','traumatologia','urologia','of','orl',
    // Otras especialidades
    'dermatologia','psiquiatria','reumatologia','toxicologia',
    'medicinalegal','saludpublica','medicinafamiliar',
    // Examen Único
    'unico2016','unico2017','unico2018','unico2019','unico2020','unico2021','unico2022','unico2023','unico2024','unico2025','unico2025t1','unico2025t2',
    // Examen UBA
    'uba2016','uba2017','uba2018','uba2019',
    // Compilados (OTROS)
    'compilado1','compilado2','compilado3','compilado4','compilado5',
    'compilado6','compilado7','compilado8','compilado9','compilado10'
  ];

  // ── Construir índice: carga todas las secciones desde Firestore primero ──
  function bBuildIndex(onProgress, onDone) {
    if (indexBuilt) { onDone(); return; }
    if (indexBuilding) return;
    indexBuilding = true;
    searchIndex = [];

    // Secciones que todavía no están en memoria → cargar desde Firestore
    const porCargar = TODAS_SECCIONES_BUSCADOR.filter(s =>
      !_seccionesYaCargadas.has(s) &&
      !(window.preguntasPorSeccion && window.preguntasPorSeccion[s] &&
        window.preguntasPorSeccion[s].length > 0)
    );
    const totalCarga = porCargar.length;
    let cargadas = 0;

    function indexarTodo() {
      // Indexar todas las secciones disponibles (las ya cargadas + las recién traídas)
      const secciones = TODAS_SECCIONES_BUSCADOR.filter(s =>
        window.preguntasPorSeccion && window.preguntasPorSeccion[s] &&
        window.preguntasPorSeccion[s].length > 0
      );
      const total = secciones.length;
      let done = 0;

      function batch(start) {
        const BATCH = 8;
        const end = Math.min(start + BATCH, total);
        for (let si = start; si < end; si++) {
          const seccionId = secciones[si];
          const preguntas = preguntasPorSeccion[seccionId] || [];
          const label = bGetLabel(seccionId);
          preguntas.forEach((preg, qIndex) => {
            searchIndex.push({ seccionId, label, qIndex, type: 'enunciado',
              texto: preg.pregunta || '', enunciadoCorto: '' });
            (preg.opciones || []).forEach((opc, opcionIdx) => {
              searchIndex.push({ seccionId, label, qIndex, type: 'opcion',
                opcionIdx, texto: opc || '',
                enunciadoCorto: (preg.pregunta || '').substring(0, 90) });
            });
          });
          done++;
        }
        onProgress(done, total);
        if (end < total) setTimeout(() => batch(end), 0);
        else { indexBuilt = true; indexBuilding = false; onDone(); }
      }
      if (total === 0) { indexBuilt = true; indexBuilding = false; onDone(); }
      else batch(0);
    }

    if (totalCarga === 0) {
      // Todo ya estaba en memoria
      indexarTodo();
    } else {
      // Cargar en paralelo desde Firestore, reportando progreso
      let completadas = 0;
      onProgress(0, totalCarga);
      Promise.all(
        porCargar.map(seccionId =>
          cargarSeccion(seccionId).then(() => {
            completadas++;
            onProgress(completadas, totalCarga);
          }).catch(() => { completadas++; onProgress(completadas, totalCarga); })
        )
      ).then(() => indexarTodo());
    }
  }

  // ── Ejecutar búsqueda ───────────────────────────────────────────
  function bSearch(query) {
    if (!query || query.length < 2) return [];
    const nq = bNormalize(query);
    const enunciados = [], opciones = [];
    searchIndex.forEach(item => {
      if (bNormalize(item.texto).includes(nq)) {
        (item.type === 'enunciado' ? enunciados : opciones).push(item);
      }
    });
    const byDate = (a, b) => {
      const diff = bGetYear(b.label) - bGetYear(a.label);
      return diff !== 0 ? diff : a.qIndex - b.qIndex;
    };
    enunciados.sort(byDate);
    opciones.sort(byDate);
    return [...enunciados, ...opciones];
  }

  // ── ID único para una tarjeta ───────────────────────────────────
  function bCardId(item) {
    return `${item.seccionId}__${item.qIndex}__${item.type}__${item.opcionIdx ?? ''}`;
  }

  // ── Renderizar resultados ───────────────────────────────────────
  function bRenderResults(results, query) {
    const container = document.getElementById('buscador-results');
    if (!container) return;

    if (results.length === 0) {
      container.innerHTML = `<div class="buscador-empty">No se encontraron resultados para <strong>"${bEscape(query)}"</strong></div>`;
      return;
    }

    const visited = bGetVisited();
    let html = '';
    let lastType = null;

    results.forEach((item, i) => {
      if (item.type !== lastType) {
        html += `<div class="buscador-group-title">${item.type === 'enunciado' ? '📋 Enunciados' : '💬 Opciones'}</div>`;
        lastType = item.type;
      }

      const cardId  = bCardId(item);
      const isVisit = !!visited[cardId];
      const visClass = isVisit ? ' visitada' : '';

      const badgeVisit = isVisit ? `<span class="buscador-badge buscador-badge-visitada">✓ Visitada</span>` : '';
      const badgeType  = item.type === 'enunciado'
        ? `<span class="buscador-badge buscador-badge-enunciado">Enunciado</span>`
        : `<span class="buscador-badge buscador-badge-opcion">Opción</span>`;

      const textoHL = bHighlight(item.texto, query);
      const enuncHL = item.enunciadoCorto
        ? `<div class="buscador-card-enunciado">↳ ${bEscape(item.enunciadoCorto)}${item.enunciadoCorto.length >= 90 ? '…' : ''}</div>`
        : '';

      html += `
<div class="buscador-card${visClass}" data-card-id="${cardId}"
     data-seccion="${item.seccionId}" data-qindex="${item.qIndex}"
     onclick="buscadorNavegar(this)">
  <div>
    ${badgeType}${badgeVisit}
    <span class="buscador-card-meta">${bEscape(item.label)} · Pregunta Nº ${item.qIndex + 1}</span>
  </div>
  <div class="buscador-card-text">${textoHL}</div>
  ${enuncHL}
  <span class="buscador-card-arrow">→</span>
</div>`;
    });

    container.innerHTML = html;
  }

  // ── Actualizar status ───────────────────────────────────────────
  function bSetStatus(msg) {
    const el = document.getElementById('buscador-status');
    if (el) el.textContent = msg;
  }

  // ── Mostrar/ocultar botón ✕ ─────────────────────────────────────
  function bToggleClear(show) {
    const btn = document.getElementById('buscador-clear');
    if (btn) btn.style.display = show ? 'inline-block' : 'none';
  }

  // ── Handler del input ───────────────────────────────────────────
  function bOnInput() {
    const input = document.getElementById('buscador-input');
    const query = input ? input.value : '';
    bToggleClear(query.length > 0);
    localStorage.setItem(BUSCADOR_QUERY_KEY, query);

    clearTimeout(debounceTimer);

    if (query.length < 2) {
      bSetStatus(query.length === 0 ? '' : 'Escribe al menos 2 caracteres…');
      const container = document.getElementById('buscador-results');
      if (container) container.innerHTML = '';
      return;
    }

    debounceTimer = setTimeout(() => {
      if (!indexBuilt) {
        bSetStatus('⏳ Cargando base de datos completa…');
        bBuildIndex(
          (done, total) => bSetStatus(`⏳ Cargando secciones desde Firestore (${done}/${total})…`),
          () => {
            const results = bSearch(query);
            bSetStatus(`${results.length} resultado${results.length !== 1 ? 's' : ''} para "${query}"`);
            bRenderResults(results, query);
          }
        );
      } else {
        const results = bSearch(query);
        bSetStatus(`${results.length} resultado${results.length !== 1 ? 's' : ''} para "${query}"`);
        bRenderResults(results, query);
      }
    }, 220);
  }

  // ── Mostrar panel buscador ──────────────────────────────────────
  window.mostrarBuscador = function () {
    saveScrollPosition();
    // Ocultar todo
    document.getElementById('menu-principal')?.classList.add('oculto');
    document.querySelectorAll('.menu-principal[id$="-submenu"]').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.pagina-cuestionario').forEach(p => p.classList.remove('activa'));

    const panel = document.getElementById('buscador-panel');
    if (panel) panel.style.display = 'block';

    // Restaurar última búsqueda
    const lastQuery = localStorage.getItem(BUSCADOR_QUERY_KEY) || '';
    const input = document.getElementById('buscador-input');
    if (input) {
      input.value = lastQuery;
      bToggleClear(lastQuery.length > 0);
      setTimeout(() => input.focus(), 80);
    }

    // Si había búsqueda, restaurar resultados
    if (lastQuery.length >= 2) {
      if (!indexBuilt) {
        bSetStatus(`⏳ Cargando base de datos completa…`);
        bBuildIndex(
          (done, total) => bSetStatus(`⏳ Cargando secciones desde Firestore (${done}/${total})…`),
          () => {
            const results = bSearch(lastQuery);
            bSetStatus(`${results.length} resultado${results.length !== 1 ? 's' : ''} para "${lastQuery}"`);
            bRenderResults(results, lastQuery);
            bRestoreScrollAndHighlight();
          }
        );
      } else {
        const results = bSearch(lastQuery);
        bSetStatus(`${results.length} resultado${results.length !== 1 ? 's' : ''} para "${lastQuery}"`);
        bRenderResults(results, lastQuery);
        bRestoreScrollAndHighlight();
      }
    } else {
      bSetStatus('');
      const container = document.getElementById('buscador-results');
      if (container) container.innerHTML = '';
      // Pre-cargar índice en background
      if (!indexBuilt && !indexBuilding) {
        bBuildIndex(
          (done, total) => {
            const panel2 = document.getElementById('buscador-panel');
            if (panel2 && panel2.style.display !== 'none') {
              bSetStatus(`⏳ Cargando secciones desde Firestore (${done}/${total})…`);
            }
          },
          () => {
            const panel2 = document.getElementById('buscador-panel');
            const q = (document.getElementById('buscador-input') || {}).value || '';
            if (panel2 && panel2.style.display !== 'none' && q.length < 2) bSetStatus('');
          }
        );
      }
    }

    history.pushState({ buscador: true }, 'Buscador', '#buscador');
  };

  // ── Restaurar scroll y resaltar tarjeta al volver ───────────────
  function bRestoreScrollAndHighlight() {
    const savedScroll = sessionStorage.getItem(BUSCADOR_SCROLL_KEY);
    const lastCardId  = sessionStorage.getItem(BUSCADOR_CARD_KEY);

    if (savedScroll) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: parseInt(savedScroll, 10) });
        sessionStorage.removeItem(BUSCADOR_SCROLL_KEY);
      });
    }

    if (lastCardId) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const card = document.querySelector(`[data-card-id="${lastCardId}"]`);
          if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.classList.add('highlight-return');
            setTimeout(() => card.classList.remove('highlight-return'), 1400);
          }
          sessionStorage.removeItem(BUSCADOR_CARD_KEY);
        });
      });
    }
  }

  // ── Navegar desde tarjeta al examen/pregunta ────────────────────
  window.buscadorNavegar = function (cardEl) {
    const seccionId = cardEl.dataset.seccion;
    const qIndex    = parseInt(cardEl.dataset.qindex, 10);
    const cardId    = cardEl.dataset.cardId;

    // Guardar estado del buscador
    sessionStorage.setItem(BUSCADOR_SCROLL_KEY, (window.pageYOffset || 0).toString());
    sessionStorage.setItem(BUSCADOR_CARD_KEY, cardId);
    bMarkVisited(cardId);

    // Mostrar botón flotante
    const btnFloat = document.getElementById('btn-volver-buscador');
    if (btnFloat) btnFloat.style.display = 'block';

    // Ocultar panel buscador
    const panel = document.getElementById('buscador-panel');
    if (panel) panel.style.display = 'none';

    // Navegar al examen
    saveLastSection(seccionId);
    history.pushState({ section: seccionId, fromBuscador: true }, seccionId, `#${seccionId}`);
    showSection(seccionId);

    // Hacer scroll y resaltar la palabra buscada en la pregunta destino
    const bQuery = localStorage.getItem(BUSCADOR_QUERY_KEY) || '';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const puntajeEl = document.getElementById(`puntaje-${seccionId}-${qIndex}`);
        if (!puntajeEl) return;
        const pregDiv = puntajeEl.closest('.pregunta');
        if (!pregDiv) return;

        // Resaltar la palabra buscada dentro del texto del div
        if (bQuery.length >= 2) {
          bResaltarEnDiv(pregDiv, bQuery);
        }

        // Scroll suave + highlight de borde
        pregDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const prev = pregDiv.style.boxShadow;
        pregDiv.style.transition = 'box-shadow 0.2s';
        pregDiv.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.5), 0 4px 16px rgba(37,99,235,0.25)';
        setTimeout(() => { pregDiv.style.boxShadow = prev; }, 2200);
      });
    });
  };

  // ── Inyectar <mark> sobre texto de nodos de texto dentro de un elemento ──
  function bResaltarEnDiv(container, query) {
    const nq = bNormalize(query);
    // Recorrer solo nodos de texto dentro de h3 y label.opcion
    const targets = [...container.querySelectorAll('h3, label.opcion')];
    targets.forEach(el => {
      // Solo primer nivel de texto (no afectar inputs dentro de label)
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
      const textNodes = [];
      let node;
      while ((node = walker.nextNode())) textNodes.push(node);
      textNodes.forEach(tn => {
        const txt = tn.nodeValue || '';
        if (!bNormalize(txt).includes(nq)) return;
        // Construir HTML con marks
        let html = '';
        let i = 0;
        const nt = bNormalize(txt);
        while (i < txt.length) {
          const idx = nt.indexOf(nq, i);
          if (idx === -1) { html += bEscape(txt.slice(i)); break; }
          html += bEscape(txt.slice(i, idx));
          html += `<mark class="bh bh-nav">${bEscape(txt.slice(idx, idx + nq.length))}</mark>`;
          i = idx + nq.length;
        }
        // Reemplazar nodo de texto con el HTML
        const span = document.createElement('span');
        span.innerHTML = html;
        tn.parentNode.replaceChild(span, tn);
      });
    });
  }

  // ── Volver al buscador ──────────────────────────────────────────
  window.volverAlBuscador = function () {
    // Ocultar botón flotante
    const btnFloat = document.getElementById('btn-volver-buscador');
    if (btnFloat) btnFloat.style.display = 'none';

    // Limpiar sección actual solo si ya fue completada; preservar progreso parcial
    if (currentSection) {
      clearSectionStateIfCompletedAndBack(currentSection);
      // NO llamar limpiarSeccion: las respuestas parciales deben persistir
      currentSection = null;
    }

    // Ocultar todo
    document.querySelectorAll('.pagina-cuestionario').forEach(p => p.classList.remove('activa'));
    document.getElementById('menu-principal')?.classList.add('oculto');

    // Mostrar panel buscador
    const panel = document.getElementById('buscador-panel');
    if (panel) panel.style.display = 'block';

    // Restaurar query y resultados
    const lastQuery = localStorage.getItem(BUSCADOR_QUERY_KEY) || '';
    const input = document.getElementById('buscador-input');
    if (input) {
      input.value = lastQuery;
      bToggleClear(lastQuery.length > 0);
    }

    if (lastQuery.length >= 2 && indexBuilt) {
      const results = bSearch(lastQuery);
      bSetStatus(`${results.length} resultado${results.length !== 1 ? 's' : ''} para "${lastQuery}"`);
      bRenderResults(results, lastQuery);
    }

    bRestoreScrollAndHighlight();
    history.pushState({ buscador: true }, 'Buscador', '#buscador');
  };

  // ── Inicializar el módulo al DOMContentLoaded ───────────────────
  document.addEventListener('DOMContentLoaded', () => {
    const input    = document.getElementById('buscador-input');
    const clearBtn = document.getElementById('buscador-clear');

    if (input) {
      input.addEventListener('input', bOnInput);
      // Prevenir que el bloqueo de selección de texto afecte al input
      input.addEventListener('mousedown', e => e.stopPropagation());
      input.addEventListener('selectstart', e => e.stopPropagation());
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        const inp = document.getElementById('buscador-input');
        if (inp) { inp.value = ''; inp.focus(); }
        localStorage.removeItem(BUSCADOR_QUERY_KEY);
        bToggleClear(false);
        bSetStatus('');
        const container = document.getElementById('buscador-results');
        if (container) container.innerHTML = '';
      });
    }

    // Manejar popstate para el panel buscador
    window.addEventListener('popstate', (event) => {
      if (event.state && event.state.buscador) {
        // Ocultar cuestionarios y mostrar buscador
        document.querySelectorAll('.pagina-cuestionario').forEach(p => p.classList.remove('activa'));
        document.getElementById('menu-principal')?.classList.add('oculto');
        document.querySelectorAll('.menu-principal[id$="-submenu"]').forEach(s => s.style.display = 'none');
        const panel = document.getElementById('buscador-panel');
        if (panel) panel.style.display = 'block';
        const btnFloat = document.getElementById('btn-volver-buscador');
        if (btnFloat) btnFloat.style.display = 'none';
        currentSection = null;
      } else {
        // Ocultar panel si navegamos fuera
        const panel = document.getElementById('buscador-panel');
        if (panel) panel.style.display = 'none';
      }
    });

    // Ocultar botón flotante al volver al menú principal + limpiar buscador

    function limpiarUIBuscador() {
      const btnFloat = document.getElementById('btn-volver-buscador');
      if (btnFloat) btnFloat.style.display = 'none';
      const panel = document.getElementById('buscador-panel');
      if (panel) panel.style.display = 'none';
      localStorage.removeItem(BUSCADOR_QUERY_KEY);
      sessionStorage.removeItem(BUSCADOR_SCROLL_KEY);
      sessionStorage.removeItem(BUSCADOR_CARD_KEY);
      const inp = document.getElementById('buscador-input');
      if (inp) inp.value = '';
      bToggleClear(false);
      bSetStatus('');
      const resultsEl = document.getElementById('buscador-results');
      if (resultsEl) resultsEl.innerHTML = '';
    }

    window.volverAlMenu = function () {
      limpiarUIBuscador();
      history.replaceState({ section: null }, 'Menú Principal', '#menu');
      _ejecutarShowMenu();
    };
  });

  // ════════════════════════════════════════════════════════════════
  // FIN MÓDULO BUSCADOR
  // ════════════════════════════════════════════════════════════════

  // ════════════════════════════════════════════════════════════════
  // MÓDULO: EDITOR DE EXPLICACIONES
  // ════════════════════════════════════════════════════════════════

  const EDITOR_SERVER = 'http://localhost:3000';
  let editorServerDisponible = null; // null=sin verificar, true/false

  async function verificarServidor() {
    if (editorServerDisponible !== null) return editorServerDisponible;
    try {
      const r = await fetch(EDITOR_SERVER + '/api/ping', { signal: AbortSignal.timeout(1500) });
      const j = await r.json();
      editorServerDisponible = j.ok === true;
    } catch {
      editorServerDisponible = false;
    }
    return editorServerDisponible;
  }

  function inyectarEstilosEditor() {
    if (document.getElementById('editor-explicacion-styles')) return;
    const style = document.createElement('style');
    style.id = 'editor-explicacion-styles';
    style.textContent = `
      /* ── Botón "Editar explicación" ── */
      .btn-editar-explicacion {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: none;
        border: 1.5px solid #cbd5e1;
        border-radius: 7px;
        color: #64748b;
        font-size: 0.8rem;
        font-weight: 600;
        padding: 5px 12px;
        cursor: pointer;
        transition: all 0.18s ease;
        margin-top: 10px;
        letter-spacing: 0.01em;
      }
      .btn-editar-explicacion:hover {
        border-color: #0d7490;
        color: #0d7490;
        background: #f0f9ff;
      }
      .btn-editar-explicacion svg { flex-shrink: 0; }

      /* Botón "➕ Agregar explicación" — para preguntas sin explicación aún */
      .btn-explicacion--vacia {
        background: rgba(8,145,178,0.07) !important;
        border: 1.5px dashed #0891b2 !important;
        color: #0d7490 !important;
        font-style: italic;
      }
      .btn-explicacion--vacia:hover {
        background: rgba(8,145,178,0.14) !important;
        border-style: solid !important;
      }

      /* ── Imágenes dentro de la explicación visible ── */
      .explicacion-contenedor img {
        max-width: 100% !important;
        width: auto !important;
        height: auto !important;
        display: block;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.12);
        margin: 12px 0;
        cursor: zoom-in;
        box-sizing: border-box;
        transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
      }
      .explicacion-contenedor img:hover {
        box-shadow: 0 6px 22px rgba(13,116,144,0.35);
        transform: scale(1.015);
        opacity: 0.93;
      }
      /* Párrafos dentro de la explicación */
      .explicacion-contenedor p { margin: 0 0 0.6em 0; }
      .explicacion-contenedor p:last-child { margin-bottom: 0; }

      /* ── Contenedor de edición ── */
      .editor-explicacion-wrap {
        margin-top: 14px;
        border: 2px solid #0d7490;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 20px rgba(13,116,144,0.15);
        animation: editorEntrada 0.28s cubic-bezier(0.34,1.2,0.64,1) both;
      }
      @keyframes editorEntrada {
        from { opacity: 0; transform: translateY(8px) scale(0.98); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }

      /* ── Barra superior del editor ── */
      .editor-explicacion-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: linear-gradient(135deg, #0d7490, #0891b2);
        padding: 10px 14px;
        gap: 8px;
      }
      .editor-explicacion-titulo {
        color: #fff;
        font-size: 0.82rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        display: flex;
        align-items: center;
        gap: 7px;
        opacity: 0.95;
      }
      .editor-toolbar-acciones {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .editor-btn-toolbar {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        border: none;
        border-radius: 7px;
        cursor: pointer;
        font-size: 0.8rem;
        font-weight: 700;
        padding: 6px 12px;
        transition: all 0.16s ease;
        white-space: nowrap;
      }
      .editor-btn-guardar {
        background: #fff;
        color: #0d7490;
        box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      }
      .editor-btn-guardar:hover {
        background: #f0f9ff;
        box-shadow: 0 4px 12px rgba(0,0,0,0.18);
        transform: translateY(-1px);
      }
      .editor-btn-imagen {
        background: rgba(255,255,255,0.18);
        color: #fff;
        border: 1.5px solid rgba(255,255,255,0.35);
      }
      .editor-btn-imagen:hover {
        background: rgba(255,200,50,0.35);
        border-color: rgba(255,220,80,0.6);
      }

      /* ── Barra de formato WYSIWYG ── */
      .editor-formato-bar {
        display: flex;
        align-items: center;
        gap: 3px;
        padding: 6px 12px;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
        flex-wrap: wrap;
      }
      .efmt-btn {
        background: #fff;
        border: 1px solid #cbd5e1;
        border-radius: 5px;
        padding: 3px 9px;
        font-size: 13px;
        cursor: pointer;
        color: #334155;
        transition: background 0.15s, border-color 0.15s;
        line-height: 1.4;
        min-width: 28px;
        text-align: center;
      }
      .efmt-btn:hover {
        background: #e0f2fe;
        border-color: #0891b2;
        color: #0369a1;
      }
      .efmt-sep {
        width: 1px;
        height: 20px;
        background: #cbd5e1;
        margin: 0 4px;
      }

      /* ── Área editable WYSIWYG ── */
      .editor-wysiwyg {
        width: 100%;
        min-height: 160px;
        max-height: 460px;
        overflow-y: auto;
        padding: 16px 18px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 0.91rem;
        line-height: 1.65;
        color: #1e293b;
        background: #fff;
        box-sizing: border-box;
        outline: none;
        white-space: pre-wrap;
      }
      .editor-wysiwyg:focus {
        box-shadow: inset 0 0 0 2px #0891b220;
      }
      .editor-wysiwyg img {
        max-width: 100%;
        border-radius: 8px;
        margin: 10px 0;
        display: block;
        cursor: pointer;
        border: 1px solid #bae6fd;
      }
      .editor-wysiwyg b, .editor-wysiwyg strong { font-weight: 700; }
      .editor-wysiwyg i, .editor-wysiwyg em     { font-style: italic; }
      .editor-wysiwyg u                          { text-decoration: underline; }
      .editor-btn-cerrar {
        background: rgba(255,255,255,0.18);
        color: #fff;
        border: 1.5px solid rgba(255,255,255,0.35);
      }
      .editor-btn-cerrar:hover {
        background: rgba(255,255,255,0.3);
      }

      /* textarea reemplazado por editor WYSIWYG */
      .editor-explicacion-textarea:focus {
        background: #fff;
      }

      /* ── Barra de estado ── */
      .editor-status-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #f1f5f9;
        border-top: 1px solid #e2e8f0;
        padding: 6px 14px;
        font-size: 0.76rem;
        color: #64748b;
        gap: 8px;
      }
      .editor-status-chars { font-variant-numeric: tabular-nums; }
      .editor-status-aviso {
        display: flex;
        align-items: center;
        gap: 4px;
        color: #0d7490;
        font-weight: 600;
      }

      /* ── Sin servidor ── */
      .editor-sin-servidor {
        background: #fff7ed;
        border: 1.5px solid #fed7aa;
        border-radius: 10px;
        padding: 14px 16px;
        margin-top: 12px;
        font-size: 0.84rem;
        color: #9a3412;
        line-height: 1.5;
        display: flex;
        gap: 10px;
        align-items: flex-start;
      }
      .editor-sin-servidor .sin-servidor-icono { font-size: 1.2rem; flex-shrink: 0; }

      /* ── Modal de confirmación guardar / cerrar ── */
      .editor-modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 30000;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(15,23,42,0.55);
        backdrop-filter: blur(4px);
        animation: editorOverlayIn 0.18s ease both;
      }
      @keyframes editorOverlayIn {
        from { opacity: 0; } to { opacity: 1; }
      }
      .editor-modal-caja {
        background: #fff;
        border-radius: 16px;
        box-shadow: 0 24px 60px rgba(0,0,0,0.2);
        padding: 32px 36px 26px;
        max-width: 400px;
        width: 92%;
        text-align: center;
        animation: editorModalIn 0.3s cubic-bezier(0.34,1.4,0.64,1) both;
      }
      @keyframes editorModalIn {
        from { opacity:0; transform:scale(0.9) translateY(16px); }
        to   { opacity:1; transform:scale(1) translateY(0); }
      }
      .editor-modal-icono {
        font-size: 2rem;
        margin-bottom: 12px;
      }
      .editor-modal-titulo {
        font-size: 1.05rem;
        font-weight: 700;
        color: #0f172a;
        margin-bottom: 8px;
      }
      .editor-modal-msg {
        font-size: 0.88rem;
        color: #475569;
        line-height: 1.55;
        margin-bottom: 24px;
      }
      .editor-modal-btns {
        display: flex;
        gap: 10px;
        justify-content: center;
      }
      .editor-modal-btn-cancelar {
        flex: 1;
        padding: 10px 16px;
        border-radius: 9px;
        font-size: 0.88rem;
        font-weight: 600;
        border: 1.5px solid #e2e8f0;
        background: #f8fafc;
        color: #475569;
        cursor: pointer;
        transition: all 0.15s;
      }
      .editor-modal-btn-cancelar:hover { background: #e2e8f0; }
      .editor-modal-btn-aceptar {
        flex: 1;
        padding: 10px 16px;
        border-radius: 9px;
        font-size: 0.88rem;
        font-weight: 600;
        border: none;
        cursor: pointer;
        transition: all 0.15s;
        color: #fff;
      }
      .editor-modal-btn-aceptar.guardar {
        background: linear-gradient(135deg, #0d7490, #0891b2);
        box-shadow: 0 4px 12px rgba(13,116,144,0.28);
      }
      .editor-modal-btn-aceptar.guardar:hover { 
        background: linear-gradient(135deg,#0b6478,#0d7490);
        transform: translateY(-1px);
      }
      .editor-modal-btn-aceptar.cerrar {
        background: linear-gradient(135deg,#64748b,#475569);
        box-shadow: 0 4px 12px rgba(71,85,105,0.2);
      }
      .editor-modal-btn-aceptar.cerrar:hover {
        background: linear-gradient(135deg,#475569,#334155);
      }

      /* ── Toast de éxito/error ── */
      .editor-toast {
        position: fixed;
        bottom: 28px;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        background: #0f172a;
        color: #fff;
        border-radius: 100px;
        padding: 10px 22px;
        font-size: 0.88rem;
        font-weight: 600;
        z-index: 40000;
        box-shadow: 0 8px 30px rgba(0,0,0,0.25);
        display: flex;
        align-items: center;
        gap: 8px;
        opacity: 0;
        transition: opacity 0.25s, transform 0.25s;
        white-space: nowrap;
      }
      .editor-toast.visible {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
      .editor-toast.exito { background: linear-gradient(135deg,#0d7490,#0891b2); }
      .editor-toast.error { background: linear-gradient(135deg,#dc2626,#b91c1c); }

      /* ═══════════════════════════════════════════════
         PANEL INSERTAR IMAGEN DESDE GITHUB PAGES
         ═══════════════════════════════════════════════ */
      .img-picker-panel {
        border-top: 1px solid rgba(8,145,178,0.25);
        background: linear-gradient(135deg, #0d1f2d 0%, #0a1628 100%);
        animation: ippEntrada 0.22s cubic-bezier(0.34,1.2,0.64,1) both;
      }
      @keyframes ippEntrada {
        from { opacity:0; transform:translateY(-6px); }
        to   { opacity:1; transform:translateY(0); }
      }
      .ipp-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px 8px;
        border-bottom: 1px solid rgba(255,255,255,0.06);
      }
      .ipp-title {
        display: flex;
        align-items: center;
        gap: 7px;
        color: #38bdf8;
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .ipp-title svg { opacity: 0.85; }
      .ipp-close {
        background: none;
        border: none;
        color: #64748b;
        cursor: pointer;
        font-size: 0.9rem;
        padding: 2px 6px;
        border-radius: 5px;
        transition: all 0.15s;
        line-height: 1;
      }
      .ipp-close:hover { background: rgba(239,68,68,0.15); color: #fca5a5; }
      .ipp-body {
        padding: 12px 14px 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .ipp-hint {
        display: flex;
        align-items: flex-start;
        gap: 7px;
        background: rgba(8,145,178,0.08);
        border: 1px solid rgba(8,145,178,0.18);
        border-radius: 8px;
        padding: 9px 12px;
        font-size: 0.78rem;
        color: #94a3b8;
        line-height: 1.5;
      }
      .ipp-hint svg { flex-shrink: 0; margin-top: 1px; color: #38bdf8; }
      .ipp-hint strong { color: #e2e8f0; }
      .ipp-label {
        font-size: 0.73rem;
        font-weight: 700;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        margin-bottom: -4px;
      }
      .ipp-input-row {
        display: flex;
        align-items: center;
        border: 1.5px solid rgba(8,145,178,0.3);
        border-radius: 9px;
        overflow: hidden;
        background: rgba(255,255,255,0.04);
        transition: border-color 0.2s;
      }
      .ipp-input-row:focus-within { border-color: #0891b2; }
      .ipp-url-prefix {
        padding: 9px 10px;
        font-size: 0.77rem;
        color: #38bdf8;
        background: rgba(8,145,178,0.1);
        border-right: 1px solid rgba(8,145,178,0.2);
        white-space: nowrap;
        font-weight: 600;
        font-family: monospace;
        letter-spacing: 0.01em;
      }
      .ipp-input {
        flex: 1;
        background: none;
        border: none;
        outline: none;
        padding: 9px 12px;
        font-size: 0.88rem;
        color: #f1f5f9;
        font-family: monospace;
        -webkit-user-select: text;
        user-select: text;
      }
      .ipp-input::placeholder { color: #475569; }
      .ipp-preview-wrap {
        border-radius: 10px;
        overflow: hidden;
        border: 1.5px solid rgba(255,255,255,0.07);
        background: rgba(255,255,255,0.02);
      }
      .ipp-preview-label {
        font-size: 0.7rem;
        font-weight: 700;
        color: #475569;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        padding: 6px 12px 4px;
        border-bottom: 1px solid rgba(255,255,255,0.05);
      }
      .ipp-preview-img {
        display: block;
        max-width: 100%;
        max-height: 220px;
        margin: 10px auto;
        border-radius: 7px;
        box-shadow: 0 2px 14px rgba(0,0,0,0.25);
        object-fit: contain;
      }
      .ipp-preview-status {
        font-size: 0.78rem;
        padding: 6px 12px 10px;
        font-weight: 500;
        line-height: 1.4;
      }
      .ipp-actions {
        display: flex;
        gap: 8px;
      }
      .ipp-btn-preview, .ipp-btn-insertar {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.82rem;
        font-weight: 700;
        padding: 8px 16px;
        transition: all 0.17s ease;
      }
      .ipp-btn-preview {
        background: rgba(8,145,178,0.12);
        color: #38bdf8;
        border: 1.5px solid rgba(8,145,178,0.3);
        flex: 1;
      }
      .ipp-btn-preview:hover { background: rgba(8,145,178,0.22); border-color: rgba(8,145,178,0.6); }
      .ipp-btn-insertar {
        background: linear-gradient(135deg, #0891b2, #0d7490);
        color: #fff;
        box-shadow: 0 3px 10px rgba(8,145,178,0.3);
        flex: 1.4;
      }
      .ipp-btn-insertar:hover:not(:disabled) { background: linear-gradient(135deg,#0d7490,#0b5e78); transform:translateY(-1px); box-shadow:0 5px 14px rgba(8,145,178,0.4); }
      .ipp-btn-insertar:disabled { opacity: 0.38; cursor: not-allowed; transform: none; }
    `;
    document.head.appendChild(style);
  }

  function mostrarToast(msg, tipo = 'exito', duracion = 3000) {
    const existing = document.getElementById('editor-toast-global');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'editor-toast-global';
    toast.className = `editor-toast ${tipo}`;
    toast.innerHTML = (tipo === 'exito' ? '✅ ' : '❌ ') + msg;
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add('visible'));
    });
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, duracion);
  }

  function mostrarModalEditor(opciones) {
    // opciones: { icono, titulo, msg, labelAceptar, claseAceptar, onAceptar }
    const overlay = document.createElement('div');
    overlay.className = 'editor-modal-overlay';
    overlay.innerHTML = `
      <div class="editor-modal-caja">
        <div class="editor-modal-icono">${opciones.icono}</div>
        <div class="editor-modal-titulo">${opciones.titulo}</div>
        <div class="editor-modal-msg">${opciones.msg}</div>
        <div class="editor-modal-btns">
          <button class="editor-modal-btn-cancelar">Cancelar</button>
          <button class="editor-modal-btn-aceptar ${opciones.claseAceptar}">${opciones.labelAceptar}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('.editor-modal-btn-cancelar').addEventListener('click', () => overlay.remove());
    overlay.querySelector('.editor-modal-btn-aceptar').addEventListener('click', () => {
      overlay.remove();
      opciones.onAceptar();
    });
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    return overlay;
  }

  // Reconstruye el texto completo de preguntas.js actualizando una explicación
  // sobreescrituras: objeto { pregunta?, opciones?, explicacion? } — se aplica solo
  // a la pregunta seccionId[qIndex]; el resto se serializa desde memoria.
  function reconstruirPreguntasJs(seccionId, qIndex, nuevaExplicacion, sobreescrituras = {}) {
    // Tomamos la fuente viva del objeto en memoria y serializamos
    // de forma compatible con el formato original
    const lineas = [];
    lineas.push('// ===== BASE DE DATOS DE PREGUNTAS =====');
    lineas.push('// Archivo separado para mantener la estructura de preguntas');
    lineas.push('// Este archivo debe ser mantenido de forma segura y puede ser ofuscado');
    lineas.push('');
    lineas.push('const preguntasPorSeccion = {');

    const secciones = Object.keys(preguntasPorSeccion);
    secciones.forEach((seccion, si) => {
      lineas.push(`            ${seccion}: [`);
      const pregs = preguntasPorSeccion[seccion];
      pregs.forEach((p, pi) => {
        // Si es la pregunta a modificar, usar la nueva explicación
        const explicacionFinal = (seccion === seccionId && pi === qIndex)
          ? nuevaExplicacion
          : (p.explicacion || '');

        const esPreguntaTarget = (seccion === seccionId && pi === qIndex);
        const preguntaFinal = esPreguntaTarget && sobreescrituras.pregunta !== undefined
          ? sobreescrituras.pregunta : p.pregunta;
        const opcionesFinal = esPreguntaTarget && sobreescrituras.opciones !== undefined
          ? sobreescrituras.opciones : p.opciones;

        lineas.push('                {');
        lineas.push(`                    "pregunta": ${JSON.stringify(preguntaFinal)},`);
        lineas.push('                    "opciones": [');
        opcionesFinal.forEach((op, oi) => {
          const coma = oi < opcionesFinal.length - 1 ? ',' : '';
          lineas.push(`                    ${JSON.stringify(op)}${coma}`);
        });
        lineas.push('                    ],');
        lineas.push(`                    "correcta": [`);
        p.correcta.forEach((c, ci) => {
          const coma = ci < p.correcta.length - 1 ? ',' : '';
          lineas.push(`                    ${c}${coma}`);
        });
        lineas.push('                    ],');
        lineas.push(`                    "multiple": ${p.multiple || false},`);
        // Serializar etiquetas si existen (Especialidad, Nombre del archivo, Nº pregunta)
        if (p.etiquetas && Object.keys(p.etiquetas).length > 0) {
          lineas.push(`                    "explicacion": ${JSON.stringify(explicacionFinal)},`);
          lineas.push(`                    "etiquetas": ${JSON.stringify(p.etiquetas)}`);
        } else {
          lineas.push(`                    "explicacion": ${JSON.stringify(explicacionFinal)}`);
        }
        const coma = pi < pregs.length - 1 ? ',' : '';
        lineas.push(`                }${coma}`);
      });
      const coma = si < secciones.length - 1 ? ',' : '';
      lineas.push(`            ]${coma}`);
    });

    lineas.push('};');
    lineas.push('');
    // Preservar funciones auxiliares del archivo original
    lineas.push(`// Función para ofuscar las preguntas (básica)`);
    lineas.push(`function ofuscarPreguntas(preguntas) {`);
    lineas.push(`    return preguntas;`);
    lineas.push(`}`);
    lineas.push('');
    lineas.push(`function validarIntegridadPreguntas() {`);
    lineas.push(`    const secciones = Object.keys(preguntasPorSeccion);`);
    lineas.push(`    let valido = true;`);
    lineas.push(`    secciones.forEach(seccion => {`);
    lineas.push(`        const pregs = preguntasPorSeccion[seccion];`);
    lineas.push(`        if (!Array.isArray(pregs)) { valido = false; return; }`);
    lineas.push(`        pregs.forEach((p, i) => {`);
    lineas.push(`            if (!p.pregunta || !p.opciones || !p.correcta) {`);
    lineas.push(`                console.warn('Pregunta inválida en ' + seccion + ' índice ' + i);`);
    lineas.push(`                valido = false;`);
    lineas.push(`            }`);
    lineas.push(`        });`);
    lineas.push(`    });`);
    lineas.push(`    return valido;`);
    lineas.push(`}`);
    lineas.push('');
    lineas.push(`function obtenerEstadisticasPreguntas() {`);
    lineas.push(`    const stats = {};`);
    lineas.push(`    Object.keys(preguntasPorSeccion).forEach(s => {`);
    lineas.push(`        stats[s] = preguntasPorSeccion[s].length;`);
    lineas.push(`    });`);
    lineas.push(`    return stats;`);
    lineas.push(`}`);
    lineas.push('');
    lineas.push(`// Validar integridad al cargar`);
    lineas.push(`document.addEventListener('DOMContentLoaded', function() {`);
    lineas.push(`    if (!validarIntegridadPreguntas()) {`);
    lineas.push(`        console.error('ADVERTENCIA: Se detectaron errores en la base de datos de preguntas');`);
    lineas.push(`    }`);
    lineas.push(`});`);
    lineas.push('');
    lineas.push('');
    lineas.push(`// Exportar funciones para uso externo (si es necesario)`);
    lineas.push(`if (typeof module !== 'undefined' && module.exports) {`);
    lineas.push(`    module.exports = {`);
    lineas.push(`        preguntasPorSeccion,`);
    lineas.push(`        ofuscarPreguntas,`);
    lineas.push(`        validarIntegridadPreguntas,`);
    lineas.push(`        obtenerEstadisticasPreguntas`);
    lineas.push(`    };`);
    lineas.push(`}`);

    return lineas.join('\n');
  }

  // URL base de GitHub Pages donde se alojan las imágenes
  const GITHUB_IMAGES_BASE = 'https://examenesresidencia.github.io/imagenes/';

  async function guardarExplicacion(seccionId, qIndex, nuevaExplicacion, wrap) {
    // Aplicar el cambio en memoria
    const anterior = (preguntasPorSeccion[seccionId][qIndex].explicacion) || '';
    preguntasPorSeccion[seccionId][qIndex].explicacion = nuevaExplicacion;

    // Guardar en Firestore (colección 'questions', mismo patrón que abrirModalEdicionAdmin)
    if (window.__fb && _currentUser) {
      try {
        const { doc, setDoc, serverTimestamp } = window.__fb;
        await setDoc(doc(_fbDb, 'questions', `${seccionId}_${qIndex + 1}`), {
          seccionId, qIndex: qIndex + 1,
          explicacion: nuevaExplicacion,
          updatedAt  : serverTimestamp(),
          updatedBy  : _currentUser.uid
        }, { merge: true });
        fbToast('✅ Explicación guardada en Firestore', 'success');
        // Notificar a todos los clientes (incluido el admin) del cambio de contenido
        await _bumpContentVersion(seccionId, qIndex, null);
        // Invalidar caché local de ediciones y preguntas para esta sección
        try { localStorage.removeItem('fb_edits_cache_' + seccionId); } catch (_) {}
        try { localStorage.removeItem('fb_q_cache_' + seccionId); } catch (_) {}
        if (wrap) wrap.remove();
        // Actualizar el dataset del div y el texto del botón sin regenerar todo
        const expDiv = document.getElementById(`explicacion-${seccionId}-${qIndex}`);
        const expBtn = document.getElementById(`btn-explicacion-${seccionId}-${qIndex}`);
        if (expDiv) {
          expDiv.dataset.tieneContenido = nuevaExplicacion.trim() ? '1' : '0';
          // Resetear editorListo para que buildEditorExplicaciones re-inyecte el botón editar
          delete expDiv.dataset.editorListo;
        }
        if (expBtn) {
          expBtn.textContent = nuevaExplicacion.trim() ? 'Ver explicación' : '➕ Agregar explicación';
          expBtn.className = 'btn-explicacion' + (nuevaExplicacion.trim() ? '' : ' btn-explicacion--vacia');
        }
        (window.generarCuestionario || generarCuestionario)(seccionId);
      } catch(e) {
        preguntasPorSeccion[seccionId][qIndex].explicacion = anterior;
        fbToast('\u274C Error al guardar: ' + e.message, 'error');
      }
    } else {
      mostrarToast('No hay sesión activa. Iniciá sesión como admin.', 'error', 4000);
      preguntasPorSeccion[seccionId][qIndex].explicacion = anterior;
    }
  }

  // Abre el editor de explicación WYSIWYG para una pregunta
  function abrirEditorExplicacion(seccionId, qIndex, contenedorExplicacion) {
    inyectarEstilosEditor();

    // Evitar abrir dos editores
    if (contenedorExplicacion.querySelector('.editor-explicacion-wrap')) return;

    const htmlActual = (preguntasPorSeccion[seccionId]?.[qIndex]?.explicacion) || '';

    const wrap = document.createElement('div');
    wrap.className = 'editor-explicacion-wrap';

    const uid = `${seccionId}-${qIndex}`;

    wrap.innerHTML = `
      <div class="editor-explicacion-toolbar">
        <div class="editor-explicacion-titulo">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Editar explicación
        </div>
        <div class="editor-toolbar-acciones">
          <button class="editor-btn-toolbar editor-btn-imagen" id="ebtn-imagen-${uid}" title="Insertar imagen desde GitHub Pages">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            🖼 Imagen
          </button>
          <button class="editor-btn-toolbar editor-btn-guardar" id="ebtn-guardar-${uid}" title="Guardar en preguntas.js">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            Guardar
          </button>
          <button class="editor-btn-toolbar editor-btn-cerrar" id="ebtn-cerrar-${uid}" title="Cerrar editor">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            Cerrar
          </button>
        </div>
      </div>

      <!-- Barra de formato WYSIWYG -->
      <div class="editor-formato-bar" id="efmt-bar-${uid}">
        <button class="efmt-btn" data-cmd="bold"        title="Negrita (Ctrl+B)"><b>N</b></button>
        <button class="efmt-btn" data-cmd="italic"      title="Cursiva (Ctrl+I)"><i>C</i></button>
        <button class="efmt-btn" data-cmd="underline"   title="Subrayado (Ctrl+U)"><u>S</u></button>
        <span class="efmt-sep"></span>
        <button class="efmt-btn" data-cmd="insertUnorderedList" title="Lista con viñetas">☰</button>
        <button class="efmt-btn" data-cmd="insertOrderedList"   title="Lista numerada">1.</button>
        <span class="efmt-sep"></span>
        <button class="efmt-btn" data-cmd="removeFormat" title="Quitar formato">✕ fmt</button>
      </div>

      <!-- Editor WYSIWYG (contenteditable) -->
      <div class="editor-wysiwyg" id="ewysiwyg-${uid}" contenteditable="true" spellcheck="true"></div>

      <div class="editor-status-bar">
        <span class="editor-status-chars" id="estatus-chars-${uid}">0 caracteres</span>
        <span class="editor-status-aviso">
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Los cambios se guardan en Firestore
        </span>
      </div>
    `;

    contenedorExplicacion.appendChild(wrap);

    const editor    = wrap.querySelector(`#ewysiwyg-${uid}`);
    const charCount = wrap.querySelector(`#estatus-chars-${uid}`);

    // Cargar el HTML actual en el editor (se ve como texto formateado)
    editor.innerHTML = htmlActual;

    // Hacer las imágenes dentro del editor clickeables para ampliar, no editables por arrastre
    editor.querySelectorAll('img').forEach(img => {
      img.style.maxWidth = '100%';
      img.style.cursor = 'pointer';
      img.draggable = false;
    });

    function actualizarCharCount() {
      charCount.textContent = editor.innerHTML.length + ' caracteres';
    }
    actualizarCharCount();

    // Eventos del editor
    editor.addEventListener('mousedown', e => e.stopPropagation());
    editor.addEventListener('selectstart', e => e.stopPropagation());
    editor.addEventListener('input', actualizarCharCount);
    editor.addEventListener('keydown', e => {
      e.stopPropagation();
      // Enter → insertar <br> en vez de <div> (comportamiento más limpio)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.execCommand('insertHTML', false, '<br><br>');
      }
    });

    // Botones de formato
    wrap.querySelector(`#efmt-bar-${uid}`).addEventListener('mousedown', e => {
      const btn = e.target.closest('.efmt-btn');
      if (!btn) return;
      e.preventDefault(); // no perder el foco del editor
      document.execCommand(btn.dataset.cmd, false, null);
      editor.focus();
      actualizarCharCount();
    });

    // ── Botón INSERTAR IMAGEN — panel GitHub Pages ─────────────────
    const btnImagen = wrap.querySelector(`#ebtn-imagen-${uid}`);

    btnImagen.addEventListener('click', () => {
      // Evitar abrir dos paneles
      if (wrap.querySelector('.img-picker-panel')) return;

      const panel = document.createElement('div');
      panel.className = 'img-picker-panel';
      panel.innerHTML = `
        <div class="ipp-header">
          <span class="ipp-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            Insertar imagen desde GitHub
          </span>
          <button class="ipp-close" title="Cerrar">✕</button>
        </div>
        <div class="ipp-body">
          <div class="ipp-hint">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Para <strong>pruebas locales</strong>: poné la imagen en la carpeta <strong>imagenes/</strong> del proyecto.<br>
            Para <strong>producción</strong>: subila al repo <em>examenesresidencia.github.io</em> en la carpeta <strong>imagenes/</strong>.
          </div>
          <label class="ipp-label">Nombre del archivo</label>
          <div class="ipp-input-row">
            <div class="ipp-url-prefix">imagenes/</div>
            <input class="ipp-input" id="ipp-nombre-${uid}" type="text"
              placeholder="ej: pediatria_intususcepcion.jpg"
              autocomplete="off" spellcheck="false"/>
          </div>
          <div class="ipp-preview-wrap" id="ipp-preview-wrap-${uid}" style="display:none;">
            <div class="ipp-preview-label">Vista previa</div>
            <img class="ipp-preview-img" id="ipp-preview-img-${uid}" src="" alt="preview"/>
            <div class="ipp-preview-status" id="ipp-preview-status-${uid}"></div>
          </div>
          <div class="ipp-actions">
            <button class="ipp-btn-preview" id="ipp-btn-preview-${uid}">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              Verificar
            </button>
            <button class="ipp-btn-insertar" id="ipp-btn-insertar-${uid}" disabled>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Insertar
            </button>
          </div>
        </div>
      `;

      // Insertar panel debajo del toolbar
      wrap.querySelector('.editor-explicacion-toolbar').insertAdjacentElement('afterend', panel);

      const inputNombre  = panel.querySelector(`#ipp-nombre-${uid}`);
      const btnPreview   = panel.querySelector(`#ipp-btn-preview-${uid}`);
      const btnInsertar  = panel.querySelector(`#ipp-btn-insertar-${uid}`);
      const previewWrap  = panel.querySelector(`#ipp-preview-wrap-${uid}`);
      const previewImg   = panel.querySelector(`#ipp-preview-img-${uid}`);
      const previewStatus = panel.querySelector(`#ipp-preview-status-${uid}`);

      let urlVerificada = '';

      // Cerrar panel
      panel.querySelector('.ipp-close').addEventListener('click', () => panel.remove());
      inputNombre.addEventListener('mousedown', e => e.stopPropagation());
      inputNombre.addEventListener('selectstart', e => e.stopPropagation());
      inputNombre.addEventListener('keydown', e => e.stopPropagation());

      // Enter en el input → verificar
      inputNombre.addEventListener('keydown', e => {
        e.stopPropagation();
        if (e.key === 'Enter') { e.preventDefault(); btnPreview.click(); }
      });

      // Verificar imagen — intenta GitHub primero, luego carpeta local
      btnPreview.addEventListener('click', () => {
        const nombre = inputNombre.value.trim();
        if (!nombre) {
          inputNombre.style.borderColor = '#ef4444';
          inputNombre.focus();
          return;
        }
        inputNombre.style.borderColor = '';
        const urlGitHub = GITHUB_IMAGES_BASE + nombre;
        const urlLocal  = 'imagenes/' + nombre;
        previewWrap.style.display = 'block';
        previewStatus.textContent = 'Verificando…';
        previewStatus.style.color = '#94a3b8';
        previewImg.style.display = 'none';
        btnInsertar.disabled = true;
        urlVerificada = '';

        function intentarConUrl(url, esLocal) {
          const testImg = new Image();
          testImg.onload = () => {
            previewImg.src = url;
            previewImg.style.display = 'block';
            previewStatus.innerHTML = esLocal
              ? '✅ Imagen encontrada <em style="color:#fbbf24">(local — recordá subirla a GitHub)</em>'
              : '✅ Imagen encontrada en GitHub — podés insertarla';
            previewStatus.style.color = '#34d399';
            btnInsertar.disabled = false;
            urlVerificada = url;
          };
          testImg.onerror = () => {
            if (!esLocal) {
              // GitHub falló → intentar local
              intentarConUrl(urlLocal + '?t=' + Date.now(), true);
            } else {
              // Ambas fallaron
              previewImg.style.display = 'none';
              previewStatus.textContent = '❌ No se encontró la imagen. Verificá el nombre y que esté en la carpeta imagenes/ o subida a GitHub.';
              previewStatus.style.color = '#fca5a5';
              btnInsertar.disabled = true;
              urlVerificada = '';
            }
          };
          testImg.src = url;
        }
        intentarConUrl(urlGitHub + '?t=' + Date.now(), false);
      });

      // Insertar imagen en el editor
      btnInsertar.addEventListener('click', () => {
        if (!urlVerificada) return;
        const nombre = inputNombre.value.trim();
        // Si la URL verificada es local, el src que guardamos es la URL de GitHub
        // (para que funcione en producción cuando se suba la imagen)
        const urlParaGuardar = urlVerificada.startsWith('imagenes/')
          ? GITHUB_IMAGES_BASE + nombre
          : urlVerificada.split('?')[0]; // quitar cache-buster
        editor.focus();
        const imgHtml = `<img src="${urlParaGuardar}" alt="${nombre}" title="Clic para ampliar" style="max-width:100%;border-radius:8px;margin:12px 0;display:block;box-shadow:0 2px 10px rgba(0,0,0,0.12);">`;
        document.execCommand('insertHTML', false, imgHtml);
        actualizarCharCount();
        panel.remove();
        const esLocal = urlVerificada.startsWith('imagenes/');
        fbToast(
          esLocal
            ? '🖼 Imagen insertada (local). Al guardar se usará la URL de GitHub.'
            : '🖼 Imagen insertada. Guardá para confirmar.',
          'success'
        );
      });

      // Foco automático al input
      requestAnimationFrame(() => inputNombre.focus());
    });

    // ── Obtener HTML limpio del editor para guardar ──────────────────
    function obtenerHTMLParaGuardar() {
      // Clonar el nodo para no modificar el editor en vivo
      const clon = editor.cloneNode(true);
      // Restaurar el onclick en imágenes (execCommand lo elimina)
      clon.querySelectorAll('img').forEach(img => {
        img.removeAttribute('style');
        img.setAttribute('onclick', "window.open(this.src,'_blank')");
        img.setAttribute('title', 'Clic para ampliar');
      });
      // Limpiar párrafos vacíos del final
      let html = clon.innerHTML
        .replace(/<p>\s*<\/p>/g, '')
        .replace(/<div><br><\/div>/g, '<br>')
        .trim();
      return html;
    }

    // Botón GUARDAR
    wrap.querySelector(`#ebtn-guardar-${uid}`).addEventListener('click', () => {
      const nuevo    = obtenerHTMLParaGuardar();
      const original = htmlActual.trim();
      if (nuevo === original) {
        mostrarToast('No hay cambios para guardar.', 'error', 2500);
        return;
      }
      mostrarModalEditor({
        icono        : '💾',
        titulo       : '¿Guardar cambios?',
        msg          : 'Se reescribirá <strong>preguntas.js</strong> con la nueva explicación. Se creará un backup automático (<em>.bak</em>).',
        labelAceptar : 'Guardar',
        claseAceptar : 'guardar',
        onAceptar    : () => guardarExplicacion(seccionId, qIndex, nuevo, wrap),
      });
    });

    // Botón CERRAR
    wrap.querySelector(`#ebtn-cerrar-${uid}`).addEventListener('click', () => {
      const nuevo    = obtenerHTMLParaGuardar();
      const original = htmlActual.trim();
      if (nuevo !== original) {
        mostrarModalEditor({
          icono        : '⚠️',
          titulo       : '¿Salir sin guardar?',
          msg          : 'Tenés cambios sin guardar. Si salís ahora, se perderán.',
          labelAceptar : 'Salir sin guardar',
          claseAceptar : 'cerrar',
          onAceptar    : () => wrap.remove(),
        });
      } else {
        wrap.remove();
      }
    });

    // Scroll suave al editor y foco
    requestAnimationFrame(() => {
      wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      editor.focus();
      // Colocar cursor al final
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });
  }

  // Agrega el botón "Editar explicación" dentro del contenedor de explicación
  function agregarBotonEditar(seccionId, qIndex, contenedorExplicacion) {
    inyectarEstilosEditor();
    if (contenedorExplicacion.querySelector('.btn-editar-explicacion')) return;

    const btn = document.createElement('button');
    btn.className = 'btn-editar-explicacion';
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
      Editar explicación
    `;
    btn.addEventListener('click', () => {
      abrirEditorExplicacion(seccionId, qIndex, contenedorExplicacion);
    });
    contenedorExplicacion.appendChild(btn);
  }

  // Hook: se llama desde mostrarExplicacion() para inyectar el botón editar
  function buildEditorExplicaciones() {
    // Función central: inyectar botón editar en todos los contenedores de explicación
    function inyectarBotonesEditar() {
      if (typeof fbIsAdmin !== 'function' || !fbIsAdmin()) return;
      document.querySelectorAll('.explicacion-contenedor').forEach(cont => {
        if (cont.dataset.editorListo) return;
        cont.dataset.editorListo = '1';
        // id formato: "explicacion-{seccionId}-{qIndex}"
        const idParts = cont.id ? cont.id.replace('explicacion-', '').split('-') : [];
        if (idParts.length < 2) return;
        const qIndex    = parseInt(idParts[idParts.length - 1], 10);
        const seccionId = idParts.slice(0, -1).join('-');
        if (isNaN(qIndex) || !seccionId) return;
        agregarBotonEditar(seccionId, qIndex, cont);
      });
    }

    // MutationObserver: detecta cuando se agregan nuevos contenedores al DOM
    const observer = new MutationObserver(inyectarBotonesEditar);
    observer.observe(document.body, { childList: true, subtree: true });

    // También correr inmediatamente y al detectar login de admin
    // (el observer puede haberse disparado antes de que fbIsAdmin() sea true)
    document.addEventListener('firebaseReady', () => {
      setTimeout(inyectarBotonesEditar, 800);
    });
    // Polling liviano: los primeros 10s después de login (para capturar el momento exacto)
    let _adminPollCount = 0;
    const _adminPoll = setInterval(() => {
      if (typeof fbIsAdmin === 'function' && fbIsAdmin()) {
        inyectarBotonesEditar();
        clearInterval(_adminPoll);
      }
      if (++_adminPollCount > 20) clearInterval(_adminPoll); // máx 10s
    }, 500);
  }


  // ════════════════════════════════════════════════════════════════
  // MÓDULO: EDITOR DE PREGUNTA Y OPCIONES
  // Permite editar el texto de la pregunta y cada opción directamente
  // desde el cuestionario. Impacta en preguntas.js igual que el editor
  // de explicaciones. Disponible en todas las preguntas.
  // ════════════════════════════════════════════════════════════════

  function inyectarEstilosEditorContenido() {
    if (document.getElementById('editor-contenido-styles')) return;
    const style = document.createElement('style');
    style.id = 'editor-contenido-styles';
    style.textContent = `
      /* ── Ícono editar pregunta (junto al texto del h3) ── */
      .btn-editar-pregunta-ico,
      .btn-editar-opcion-ico {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: none;
        border: none;
        cursor: pointer;
        color: #94a3b8;
        padding: 2px 4px;
        border-radius: 5px;
        transition: color 0.15s, background 0.15s;
        vertical-align: middle;
        flex-shrink: 0;
        line-height: 1;
      }
      .btn-editar-pregunta-ico:hover { color: #0891b2; background: #e0f2fe; }
      .btn-editar-opcion-ico  { margin-left: 6px; }
      .btn-editar-opcion-ico:hover  { color: #7c3aed; background: #ede9fe; }

      /* ── Panel inline de edición (pregunta o una opción) ── */
      .ec-panel {
        margin-top: 8px;
        border: 2px solid #0891b2;
        border-radius: 11px;
        overflow: hidden;
        box-shadow: 0 4px 18px rgba(8,145,178,0.13);
        animation: ecPanelIn 0.24s cubic-bezier(0.34,1.2,0.64,1) both;
      }
      .ec-panel--opcion {
        border-color: #7c3aed;
        box-shadow: 0 4px 18px rgba(124,58,237,0.13);
      }
      @keyframes ecPanelIn {
        from { opacity:0; transform:translateY(6px) scale(0.98); }
        to   { opacity:1; transform:translateY(0) scale(1); }
      }
      .ec-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 13px;
        background: linear-gradient(135deg, #0d7490, #0891b2);
        gap: 8px;
      }
      .ec-panel--opcion .ec-toolbar {
        background: linear-gradient(135deg, #6d28d9, #7c3aed);
      }
      .ec-toolbar-titulo {
        color: #fff;
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        display: flex;
        align-items: center;
        gap: 6px;
        opacity: 0.95;
      }
      .ec-toolbar-btns { display: flex; gap: 6px; }
      .ec-btn-guardar {
        display: inline-flex; align-items: center; gap: 5px;
        background: #fff; color: #0d7490;
        border: none; border-radius: 6px;
        font-size: 0.76rem; font-weight: 700;
        padding: 5px 11px; cursor: pointer;
        box-shadow: 0 2px 6px rgba(0,0,0,0.12);
        transition: all 0.15s;
      }
      .ec-panel--opcion .ec-btn-guardar { color: #6d28d9; }
      .ec-btn-guardar:hover { background:#f0f9ff; transform:translateY(-1px); }
      .ec-panel--opcion .ec-btn-guardar:hover { background:#ede9fe; }
      .ec-btn-cerrar {
        display: inline-flex; align-items: center; justify-content: center;
        background: rgba(255,255,255,0.18);
        border: 1.5px solid rgba(255,255,255,0.32);
        color: #fff; border-radius: 6px;
        padding: 4px 8px; cursor: pointer;
        font-size: 0.76rem; font-weight: 700;
        transition: background 0.15s;
      }
      .ec-btn-cerrar:hover { background: rgba(255,255,255,0.3); }

      /* ── Textarea del panel ── */
      .ec-textarea {
        width: 100%;
        box-sizing: border-box;
        min-height: 72px;
        max-height: 260px;
        padding: 12px 15px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 0.91rem;
        line-height: 1.6;
        color: #1e293b;
        background: #fff;
        border: none;
        outline: none;
        resize: vertical;
        display: block;
      }
      .ec-textarea:focus { box-shadow: inset 0 0 0 2px #0891b220; }
      .ec-panel--opcion .ec-textarea:focus { box-shadow: inset 0 0 0 2px #7c3aed20; }

      /* ── Barra de estado inferior ── */
      .ec-statusbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 5px 13px;
        background: #f8fafc;
        border-top: 1px solid #e2e8f0;
        font-size: 0.73rem;
        color: #64748b;
      }
      .ec-statusbar-aviso {
        color: #0d7490; font-weight: 600;
        display: flex; align-items: center; gap: 4px;
      }
      .ec-panel--opcion .ec-statusbar-aviso { color: #6d28d9; }
    `;
    document.head.appendChild(style);
  }

  // Abre un panel inline para editar el texto de pregunta o una opción
  function abrirEditorTexto({ tipo, anchorEl, textoActual, seccionId, qIndex, opcionIdx }) {
    inyectarEstilosEditorContenido();
    inyectarEstilosEditor(); // reutilizar toast y modal de confirmación

    // Si ya hay un panel abierto en este anchor, cerrarlo
    const existing = anchorEl.parentElement.querySelector('.ec-panel');
    if (existing) { existing.remove(); return; }

    const esOpcion = (tipo === 'opcion');
    const uid = `ec-${seccionId}-${qIndex}${esOpcion ? '-op' + opcionIdx : ''}`;

    const panel = document.createElement('div');
    panel.className = 'ec-panel' + (esOpcion ? ' ec-panel--opcion' : '');
    panel.id = uid;

    const tituloLabel = esOpcion
      ? `Opción ${String.fromCharCode(65 + opcionIdx)}`
      : 'Texto de la pregunta';
    const iconoSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>`;

    panel.innerHTML = `
      <div class="ec-toolbar">
        <span class="ec-toolbar-titulo">${iconoSVG} Editar ${tituloLabel}</span>
        <div class="ec-toolbar-btns">
          <button class="ec-btn-guardar" id="${uid}-guardar">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
            </svg>
            Guardar
          </button>
          <button class="ec-btn-cerrar" id="${uid}-cerrar">✕ Cerrar</button>
        </div>
      </div>
      <textarea class="ec-textarea" id="${uid}-ta" spellcheck="true">${textoActual.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</textarea>
      <div class="ec-statusbar">
        <span id="${uid}-chars">${textoActual.length} caracteres</span>
        <span class="ec-statusbar-aviso">
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Guarda en preguntas.js
        </span>
      </div>
    `;

    // Insertar el panel debajo del anchor
    anchorEl.insertAdjacentElement('afterend', panel);

    const ta      = panel.querySelector(`#${uid}-ta`);
    const charEl  = panel.querySelector(`#${uid}-chars`);
    ta.addEventListener('input', () => { charEl.textContent = ta.value.length + ' caracteres'; });
    // Bloquear eventos globales de seguridad en el textarea
    ta.addEventListener('mousedown',   e => e.stopPropagation());
    ta.addEventListener('selectstart', e => e.stopPropagation());
    ta.addEventListener('keydown',     e => e.stopPropagation());

    // Guardar
    panel.querySelector(`#${uid}-guardar`).addEventListener('click', async () => {
      const nuevoTexto = ta.value.trim();
      if (!nuevoTexto) {
        mostrarToast('El campo no puede quedar vacío.', 'error', 2500);
        return;
      }
      if (nuevoTexto === textoActual) {
        mostrarToast('No hay cambios para guardar.', 'error', 2500);
        return;
      }

      mostrarModalEditor({
        icono        : '💾',
        titulo       : '¿Guardar cambios?',
        msg          : `Se actualizará <strong>data/${seccionId}.js</strong> con el nuevo texto.<br>Se creará un backup automático (<em>.bak</em>).`,
        labelAceptar : 'Guardar',
        claseAceptar : 'guardar',
        onAceptar    : async () => {
          const disponible = await verificarServidor();
          if (!disponible) {
            mostrarToast('Servidor local no disponible. ¿Corriste node servidor.js?', 'error', 5000);
            return;
          }

          // Aplicar el cambio en memoria primero
          const pregObj = preguntasPorSeccion[seccionId][qIndex];
          if (esOpcion) {
            const nuevasOpciones = pregObj.opciones.slice();
            nuevasOpciones[opcionIdx] = nuevoTexto;
            pregObj.opciones = nuevasOpciones;
          } else {
            pregObj.pregunta = nuevoTexto;
          }

          try {
            const r = await fetch(EDITOR_SERVER + '/api/guardar-seccion', {
              method : 'POST',
              headers: { 'Content-Type': 'application/json' },
              body   : JSON.stringify({
                seccion   : seccionId,
                preguntas : preguntasPorSeccion[seccionId],
              }),
            });
            const j = await r.json();
            if (j.ok) {
              mostrarToast(
                esOpcion ? `Opción guardada en data/${seccionId}.js ✓` : `Pregunta guardada en data/${seccionId}.js ✓`,
                'exito'
              );
              panel.remove();
              // Re-renderizar el cuestionario para reflejar el cambio en pantalla
              (window.generarCuestionario || generarCuestionario)(seccionId);
            } else {
              // Revertir cambio en memoria si el servidor falló
              if (esOpcion) {
                pregObj.opciones[opcionIdx] = textoActual;
              } else {
                pregObj.pregunta = textoActual;
              }
              mostrarToast('Error al guardar: ' + (j.error || 'desconocido'), 'error', 5000);
            }
          } catch {
            if (esOpcion) pregObj.opciones[opcionIdx] = textoActual;
            else pregObj.pregunta = textoActual;
            mostrarToast('No se pudo conectar con el servidor local.', 'error', 5000);
          }
        }
      });
    });

    // Cerrar
    panel.querySelector(`#${uid}-cerrar`).addEventListener('click', () => {
      const nuevoTexto = ta.value.trim();
      if (nuevoTexto !== textoActual) {
        mostrarModalEditor({
          icono        : '⚠️',
          titulo       : '¿Salir sin guardar?',
          msg          : 'Tenés cambios sin guardar. Si cerrás, se perderán.',
          labelAceptar : 'Salir sin guardar',
          claseAceptar : 'cerrar',
          onAceptar    : () => panel.remove(),
        });
      } else {
        panel.remove();
      }
    });

    // Foco y cursor al final
    requestAnimationFrame(() => {
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
    });
  }

  // SVG del ícono lápiz (compartido)
  const EDIT_ICO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>`;

  // Inyecta los íconos de edición en TODAS las preguntas ya renderizadas.
  // Se llama vía MutationObserver (igual que buildEditorExplicaciones).
  function buildEditorContenido() {
    inyectarEstilosEditorContenido();

    const observer = new MutationObserver(() => {
      if (typeof fbIsAdmin !== 'function' || !fbIsAdmin()) return; // Solo admin
      document.querySelectorAll('.pregunta').forEach(divPregunta => {
        if (divPregunta.dataset.editorContenidoListo) return;
        divPregunta.dataset.editorContenidoListo = '1';

        // ── Obtener seccionId y originalIdx desde el id del puntaje ──────
        const puntajeEl = divPregunta.querySelector('[id^="puntaje-"]');
        if (!puntajeEl) return;
        const partes   = puntajeEl.id.replace('puntaje-', '').split('-');
        const qIndex   = parseInt(partes[partes.length - 1], 10);
        const seccionId = partes.slice(0, -1).join('-');
        if (isNaN(qIndex) || !seccionId) return;

        // ── Ícono editar junto al h3 (texto de pregunta) ─────────────────
        const h3 = divPregunta.querySelector('h3');
        if (h3 && !h3.querySelector('.btn-editar-pregunta-ico')) {
          const btnP = document.createElement('button');
          btnP.className = 'btn-editar-pregunta-ico';
          btnP.title     = 'Editar texto de la pregunta';
          btnP.innerHTML = EDIT_ICO_SVG;
          btnP.addEventListener('click', e => {
            e.stopPropagation();
            const pregObj = (preguntasPorSeccion[seccionId] || [])[qIndex];
            if (!pregObj) return;
            abrirEditorTexto({
              tipo        : 'pregunta',
              anchorEl    : h3,
              textoActual : pregObj.pregunta,
              seccionId, qIndex,
            });
          });
          h3.appendChild(btnP);
        }

        // ── Ícono editar al final de cada opción (label) ──────────────────
        const labels = divPregunta.querySelectorAll('label.opcion');
        labels.forEach((label, mixedIdx) => {
          if (label.querySelector('.btn-editar-opcion-ico')) return;
          const input = label.querySelector('input');
          if (!input) return;
          const originalIdx = parseInt(input.getAttribute('data-original-index'), 10);
          if (isNaN(originalIdx)) return;

          const btnO = document.createElement('button');
          btnO.className = 'btn-editar-opcion-ico';
          btnO.title     = `Editar opción ${String.fromCharCode(65 + mixedIdx)}`;
          btnO.innerHTML = EDIT_ICO_SVG;
          btnO.addEventListener('click', e => {
            e.stopPropagation();
            const pregObj = (preguntasPorSeccion[seccionId] || [])[qIndex];
            if (!pregObj) return;
            abrirEditorTexto({
              tipo        : 'opcion',
              anchorEl    : label,
              textoActual : pregObj.opciones[originalIdx],
              seccionId, qIndex,
              opcionIdx   : originalIdx,
            });
          });
          label.appendChild(btnO);
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ════════════════════════════════════════════════════════════════
  // MÓDULO: BOTÓN LIMPIAR LOCALSTORAGE
  // ════════════════════════════════════════════════════════════════

  function buildBotonLimpiarStorage() {
    // Inyectar estilos
    if (!document.getElementById('btn-limpiar-storage-styles')) {
      const st = document.createElement('style');
      st.id = 'btn-limpiar-storage-styles';
      st.textContent = `
        #btn-limpiar-storage {
          position: fixed;
          left: 16px;
          bottom: 16px;
          z-index: 1000;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: #fff;
          border: 1.5px solid #e2e8f0;
          border-radius: 100px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          color: #64748b;
          font-size: 0.78rem;
          font-weight: 600;
          padding: 8px 14px;
          cursor: pointer;
          transition: all 0.18s ease;
          letter-spacing: 0.01em;
        }
        #btn-limpiar-storage:hover {
          border-color: #dc2626;
          color: #dc2626;
          background: #fff5f5;
          box-shadow: 0 4px 14px rgba(220,38,38,0.15);
        }

        /* Modal limpiar */
        #modal-limpiar-storage {
          position: fixed;
          inset: 0;
          z-index: 30000;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(15,23,42,0.55);
          backdrop-filter: blur(4px);
        }
        #modal-limpiar-storage .mls-caja {
          background: #fff;
          border-radius: 18px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.2);
          padding: 34px 36px 28px;
          max-width: 420px;
          width: 92%;
          text-align: center;
          animation: editorModalIn 0.28s cubic-bezier(0.34,1.4,0.64,1) both;
        }
        #modal-limpiar-storage .mls-icono { font-size: 2.2rem; margin-bottom: 14px; }
        #modal-limpiar-storage .mls-titulo {
          font-size: 1.05rem; font-weight: 700; color: #0f172a; margin-bottom: 8px;
        }
        #modal-limpiar-storage .mls-msg {
          font-size: 0.87rem; color: #475569; line-height: 1.55; margin-bottom: 8px;
        }
        #modal-limpiar-storage .mls-detalle {
          font-size: 0.8rem; color: #94a3b8; margin-bottom: 22px; line-height: 1.4;
        }
        #modal-limpiar-storage .mls-btns {
          display: flex; gap: 10px; justify-content: center;
        }
        #modal-limpiar-storage .mls-btn-cancelar {
          flex:1; padding:10px; border-radius:9px; font-size:0.88rem;
          font-weight:600; border:1.5px solid #e2e8f0; background:#f8fafc;
          color:#475569; cursor:pointer; transition:all 0.15s;
        }
        #modal-limpiar-storage .mls-btn-cancelar:hover { background:#e2e8f0; }
        #modal-limpiar-storage .mls-btn-limpiar {
          flex:1; padding:10px; border-radius:9px; font-size:0.88rem;
          font-weight:600; border:none; cursor:pointer; color:#fff;
          background:linear-gradient(135deg,#dc2626,#b91c1c);
          box-shadow:0 4px 12px rgba(220,38,38,0.25); transition:all 0.15s;
        }
        #modal-limpiar-storage .mls-btn-limpiar:hover {
          background:linear-gradient(135deg,#b91c1c,#991b1b);
          transform:translateY(-1px);
        }
      `;
      document.head.appendChild(st);
    }

    const btn = document.createElement('button');
    btn.id = 'btn-limpiar-storage';
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2.2"
        stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        <path d="M10 11v6"/><path d="M14 11v6"/>
        <path d="M9 6V4h6v2"/>
      </svg>
      Limpiar progreso
    `;
    document.body.appendChild(btn);

    btn.addEventListener('click', () => {
      // Contar cuántas secciones tienen progreso guardado
      const claves = Object.keys(localStorage).filter(k =>
        k === STORAGE_KEY || k === ATTEMPT_LOG_KEY
      );
      const estadoActual = loadJSON(STORAGE_KEY, {});
      const seccionesConProgreso = Object.keys(estadoActual).filter(s =>
        estadoActual[s] && estadoActual[s].graded &&
        Object.keys(estadoActual[s].graded).some(k => estadoActual[s].graded[k])
      );

      const modal = document.createElement('div');
      modal.id = 'modal-limpiar-storage';
      modal.innerHTML = `
        <div class="mls-caja">
          <div class="mls-icono">🗑️</div>
          <div class="mls-titulo">Limpiar progreso guardado</div>
          <div class="mls-msg">
            ${seccionesConProgreso.length > 0
              ? `Tenés progreso guardado en <strong>${seccionesConProgreso.length} cuestionario${seccionesConProgreso.length !== 1 ? 's' : ''}</strong>.<br>Todo se borrará y los cuestionarios empezarán desde cero.`
              : 'No hay progreso guardado actualmente. Solo se limpiará el historial de intentos.'}
          </div>
          <div class="mls-detalle">
            Útil para testear desde cero. Esta acción no se puede deshacer.
          </div>
          <div class="mls-btns">
            <button class="mls-btn-cancelar">Cancelar</button>
            <button class="mls-btn-limpiar">Limpiar todo</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('.mls-btn-cancelar').addEventListener('click', () => modal.remove());
      modal.querySelector('.mls-btn-limpiar').addEventListener('click', () => {
        modal.remove();
        // Limpiar solo las claves del quiz (no tocar otras cosas del navegador)
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(ATTEMPT_LOG_KEY);
        localStorage.removeItem(SCROLL_POSITION_KEY);
        localStorage.removeItem(TIMER_STORAGE_KEY);
        // Reiniciar estado en memoria
        state = {};
        attemptLog = [];
        if (window.puntajesPorSeccion) window.puntajesPorSeccion = {};
        mostrarToast('Progreso limpiado correctamente', 'exito');
      });
      modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    });
  }


  // ════════════════════════════════════════════════════════════════
  // MÓDULO DE REETIQUETADO
  // Permite cambiar la especialidad de cualquier pregunta de examen único.
  // El cambio se escribe directamente en preguntas.js a través del mismo
  // endpoint POST /api/guardar-preguntas que usa el editor de explicaciones.
  // Requiere que el servidor local (node servidor.js) esté corriendo.
  // ════════════════════════════════════════════════════════════════

  // Lista completa de especialidades disponibles
  const ESPECIALIDADES_DISPONIBLES = [
    'Pediatría','Cardiología','Neurología','Endocrinología','Neumonología',
    'Nefrología','Digestivo','Hematología','Infectología','Clínica Médica',
    'Ginecología','Obstetricia',
    'Cirugía','Traumatología','Urología','Oftalmología','ORL',
    'Dermatología','Psiquiatría','Reumatología','Toxicología',
    'Medicina Legal','Salud Pública','Medicina Familiar'
  ];

  // Aplica al arranque los reetiquetados que ya están en preguntas.js
  // (no se necesita localStorage: el archivo es la fuente de verdad)
  function getEspecialidad(seccionId, qIndex, preg) {
    return (preg.etiquetas && preg.etiquetas.especialidad)
      ? preg.etiquetas.especialidad
      : '';
  }

  // Guarda el reetiquetado en preguntas.js via servidor
  async function guardarReetiquetado(seccionId, qIndex, nuevaEspecialidad, onExito) {
    const disponible = await verificarServidor();
    if (!disponible) {
      mostrarToast('El servidor local no está disponible. ¿Corriste node servidor.js?', 'error', 5000);
      return;
    }

    // Aplicar el cambio en memoria
    const preg = preguntasPorSeccion[seccionId][qIndex];
    const especialidadAnterior = preg.etiquetas?.especialidad;
    if (!preg.etiquetas) preg.etiquetas = {};
    preg.etiquetas.especialidad = nuevaEspecialidad;

    // Guardar solo el archivo de la sección afectada (sistema dividido)
    try {
      const r = await fetch(EDITOR_SERVER + '/api/guardar-seccion', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({
          seccion   : seccionId,
          preguntas : preguntasPorSeccion[seccionId],
        }),
      });
      const j = await r.json();
      if (j.ok) {
        mostrarToast(`Especialidad guardada en data/${seccionId}.js → ${nuevaEspecialidad} ✓`, 'exito', 3500);
        if (onExito) onExito();
        (window.generarCuestionario || generarCuestionario)(seccionId);
      } else {
        // Revertir el cambio en memoria si el servidor falló
        preg.etiquetas.especialidad = especialidadAnterior;
        mostrarToast('Error al guardar: ' + (j.error || 'desconocido'), 'error', 5000);
      }
    } catch (err) {
      preg.etiquetas.especialidad = especialidadAnterior;
      mostrarToasttoast('No se pudo conectar con el servidor local.', 'error', 5000);
    }
  }

  // Abre el modal de reetiquetado para una pregunta
  function abrirModalReetiquetado(seccionId, qIndex, preg) {
    const especialidadActual = getEspecialidad(seccionId, qIndex, preg);

    document.getElementById('modal-retag')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'modal-retag';
    overlay.style.cssText = [
      'position:fixed','inset:0','background:rgba(0,0,0,0.55)',
      'z-index:9999','display:flex','align-items:center','justify-content:center',
      'padding:16px'
    ].join(';');

    const caja = document.createElement('div');
    caja.style.cssText = [
      'background:#fff','border-radius:16px','padding:28px 24px',
      'max-width:420px','width:100%','box-shadow:0 8px 32px rgba(0,0,0,0.18)',
      'display:flex','flex-direction:column','gap:14px'
    ].join(';');

    const titulo = document.createElement('h3');
    titulo.textContent = 'Reetiquetado de especialidad';
    titulo.style.cssText = 'margin:0;font-size:17px;color:#1e293b;';
    caja.appendChild(titulo);

    const info = document.createElement('p');
    info.style.cssText = 'margin:0;font-size:13px;color:#64748b;line-height:1.5;';
    info.textContent = `"${preg.pregunta.length > 80 ? preg.pregunta.slice(0, 80) + '…' : preg.pregunta}"`;
    caja.appendChild(info);

    const actual = document.createElement('p');
    actual.style.cssText = 'margin:0;font-size:13px;color:#0891b2;font-weight:500;';
    actual.textContent = `Especialidad actual: ${especialidadActual || '(sin asignar)'}`;
    caja.appendChild(actual);

    // Aviso servidor
    const aviso = document.createElement('p');
    aviso.style.cssText = 'margin:0;font-size:12px;color:#92400e;background:#fef3c7;padding:8px 12px;border-radius:8px;';
    aviso.textContent = '⚠️ Requiere servidor local activo (node servidor.js). El cambio se guarda directamente en preguntas.js.';
    caja.appendChild(aviso);

    const lbl = document.createElement('label');
    lbl.textContent = 'Nueva especialidad:';
    lbl.style.cssText = 'font-size:14px;font-weight:500;color:#374151;';
    caja.appendChild(lbl);

    const select = document.createElement('select');
    select.style.cssText = [
      'padding:8px 12px','border-radius:8px','border:1.5px solid #cbd5e1',
      'font-size:14px','color:#1e293b','background:#f8fafc',
      'width:100%','cursor:pointer','outline:none'
    ].join(';');

    const optVacia = document.createElement('option');
    optVacia.value = '';
    optVacia.textContent = '— Elegir especialidad —';
    select.appendChild(optVacia);

    ESPECIALIDADES_DISPONIBLES.forEach(esp => {
      const opt = document.createElement('option');
      opt.value = esp;
      opt.textContent = esp;
      if (esp === especialidadActual) opt.selected = true;
      select.appendChild(opt);
    });
    caja.appendChild(select);

    const btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;margin-top:4px;';

    const btnCancelar = document.createElement('button');
    btnCancelar.textContent = 'Cancelar';
    btnCancelar.style.cssText = [
      'padding:8px 18px','border-radius:8px','border:1.5px solid #e2e8f0',
      'background:#f8fafc','color:#64748b','font-size:14px','cursor:pointer'
    ].join(';');
    btnCancelar.onclick = () => overlay.remove();

    const btnGuardar = document.createElement('button');
    btnGuardar.textContent = '💾 Guardar en preguntas.js';
    btnGuardar.style.cssText = [
      'padding:8px 18px','border-radius:8px','border:none',
      'background:#0891b2','color:#fff','font-size:14px',
      'font-weight:600','cursor:pointer'
    ].join(';');

    btnGuardar.onclick = async () => {
      const nueva = select.value;
      if (!nueva) { select.style.borderColor = '#ef4444'; return; }
      btnGuardar.textContent = 'Guardando…';
      btnGuardar.disabled = true;
      await guardarReetiquetado(seccionId, qIndex, nueva, () => overlay.remove());
      btnGuardar.textContent = '💾 Guardar en preguntas.js';
      btnGuardar.disabled = false;
    };

    btns.appendChild(btnCancelar);
    btns.appendChild(btnGuardar);
    caja.appendChild(btns);

    overlay.appendChild(caja);
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    select.focus();
  }

  window.abrirModalReetiquetado = abrirModalReetiquetado;

  // ════════════════════════════════════════════════════════════════
  // MÓDULO FIREBASE — Auth + Progreso en la nube + Admin
  // ════════════════════════════════════════════════════════════════

  const ADMIN_EMAIL = 'examenesresidenciamedica@gmail.com';
  let _fbApp, _fbAuth, _fbDb;
  let _currentUser     = null;   // objeto Firebase User
  let _currentUserData = null;   // datos del doc users/{uid}
  let _progressUnsubscribe = null;

  // ── Inicialización lazy de Firebase ──────────────────────────
  function fbInit() {
    if (_fbApp) return;
    const { initializeApp }          = window.__firebase_app;
    const { getAuth, onAuthStateChanged,
            createUserWithEmailAndPassword,
            signInWithEmailAndPassword,
            signOut: fbSignOut,
            sendPasswordResetEmail }  = window.__firebase_auth;
    const { getFirestore, doc, setDoc,
            getDoc, getDocs, collection, query,
            where, onSnapshot, updateDoc,
            serverTimestamp, orderBy,
            deleteDoc, writeBatch }               = window.__firebase_firestore;

    _fbApp  = initializeApp({
      apiKey           : "AIzaSyAzbaxkDieSfiepIje0zkvheHmdRU2P18I",
      authDomain       : "examen-residencias-medicas.firebaseapp.com",
      projectId        : "examen-residencias-medicas",
      storageBucket    : "examen-residencias-medicas.firebasestorage.app",
      messagingSenderId: "1047294253435",
      appId            : "1:1047294253435:web:8beefa92f3960e323745de"
    });
    _fbAuth = getAuth(_fbApp);
    _fbDb        = getFirestore(_fbApp);
    window._fbDb = _fbDb;  // exponer globalmente para buscador-duplicados.js

    // Guardar helpers en closure
    window.__fb = {
      createUserWithEmailAndPassword,
      signInWithEmailAndPassword,
      fbSignOut,
      sendPasswordResetEmail,
      onAuthStateChanged,
      doc, setDoc, getDoc, getDocs, collection,
      query, where, onSnapshot, updateDoc,
      serverTimestamp, orderBy, deleteDoc, writeBatch
    };

    // Observer de sesión
    onAuthStateChanged(_fbAuth, async (user) => {
      if (user) {
        _currentUser = user;
        window._fbCurrentUser = user;
        try {
          const snap = await getDoc(doc(_fbDb, 'users', user.uid));
          if (snap.exists()) {
            _currentUserData = snap.data();
            window._fbCurrentUserData = _currentUserData;
            const status = _currentUserData.status;
            if (status === 'approved') {
              fbHideAuthScreen();
              quitarLoadingShield();
              // Esperar a que el progreso de la nube cargue ANTES de mostrar el menú
              // Así la nube siempre gana sobre cualquier dato local desactualizado
              await fbSyncProgressFromCloud();
              // Restaurar la sección del hash si existe, o mostrar el menú principal.
              // Esto permite que al recargar la página se vuelva a la sección que estaba activa.
              const _hashAlAuth = window.location.hash.substring(1);
              if (_hashAlAuth && _hashAlAuth !== 'menu') {
                history.replaceState({ section: _hashAlAuth }, _hashAlAuth, '#' + _hashAlAuth);
                // Si hay hash (recarga de página), esperar a que las fuentes de
                // extrapolación (Únicos, UBA, compilados) estén listas antes de
                // mostrar la especialidad. Así la extrapolación siempre tiene
                // todos los datos disponibles, incluso al recargar.
                const mostrarConFuentes = () => {
                  showSection(_hashAlAuth);
                  currentSection = _hashAlAuth;
                };
                if (window._fuentesExtrapolacionListas) {
                  window._fuentesExtrapolacionListas.then(mostrarConFuentes);
                } else {
                  mostrarConFuentes();
                }
              } else {
                history.replaceState({ section: null }, 'Menú Principal', '#menu');
                showMenu();
              }
              // Inyectar estilos de auth/admin (normalmente los inyecta fbShowAuthScreen,
              // pero al recargar con sesión activa esa función no se ejecuta)
              fbInjectAuthStyles();
              // Mostrar la barra de usuario siempre, inmediatamente
              fbShowUserBar();
              requestAnimationFrame(() => requestAnimationFrame(() => fbUpdateAdminButton()));
            } else if (status === 'pending') {
              quitarLoadingShield();
              fbShowPendingScreen();
            } else if (status === 'rejected') {
              quitarLoadingShield();
              fbShowRejectedScreen();
            }
          } else {
            console.warn('Firebase: usuario sin documento en Firestore. UID:', user.uid);
            quitarLoadingShield();
            fbShowAuthScreen('login');
          }
        } catch(e) {
          console.error('Firebase Firestore error:', e);
          quitarLoadingShield();
          fbShowAuthScreen('login');
        }
      } else {
        _currentUser = null;
        _currentUserData = null;
        window._fbCurrentUser = null;
        window._fbCurrentUserData = null;
        quitarLoadingShield();
        fbShowAuthScreen('login');
      }
    });
  }

  // ── Mostrar / ocultar pantalla de auth ───────────────────────
  function fbShowAuthScreen(vista = 'login') {
    fbEnsureOverlay();
    const ov = document.getElementById('fb-auth-overlay');
    // Guardia: si ya se muestra esta misma vista, no re-renderizar
    // (evita el doble render al inicio y el bucle en dispositivos lentos)
    if (ov.style.display === 'flex' && ov.dataset.vistaActual === vista) return;
    ov.dataset.vistaActual = vista;
    ov.style.display = 'flex';
    // Ocultar contenido principal
    document.querySelectorAll('body > div:not(#fb-auth-overlay), body > button').forEach(el => {
      el.style.visibility = 'hidden';
      el.style.pointerEvents = 'none';
    });
    if (vista === 'login')    fbRenderLogin();
    if (vista === 'register') fbRenderRegister();
    if (vista === 'reset')    fbRenderReset();
  }

  function fbHideAuthScreen() {
    const ov = document.getElementById('fb-auth-overlay');
    if (ov) ov.style.display = 'none';
    document.querySelectorAll('body > div:not(#fb-auth-overlay), body > button').forEach(el => {
      el.style.visibility = '';
      el.style.pointerEvents = '';
    });
  }

  function fbShowPendingScreen() {
    fbEnsureOverlay();
    const ov = document.getElementById('fb-auth-overlay');
    ov.style.display = 'flex';
    document.querySelectorAll('body > div:not(#fb-auth-overlay), body > button').forEach(el => {
      el.style.visibility = 'hidden';
      el.style.pointerEvents = 'none';
    });
    ov.innerHTML = `
      <div class="fb-card">
        <div class="fb-logo-wrap"><div class="fb-logo-icon">🕐</div></div>
        <h2 class="fb-title">Solicitud en revisión</h2>
        <p class="fb-subtitle">Tu cuenta fue creada correctamente. Un administrador revisará tu solicitud y recibirás acceso en breve.</p>
        <div class="fb-pending-badge">
          <span>⏳</span>
          <span>Pendiente de aprobación</span>
        </div>
        <p style="font-size:0.82rem;color:#94a3b8;text-align:center;margin-top:16px;">
          Si creés que es un error, contactá al administrador.
        </p>
        <button class="fb-btn-secondary" id="fb-btn-logout-pending">Cerrar sesión</button>
      </div>`;
    document.getElementById('fb-btn-logout-pending').onclick = () => fbLogout();
  }

  function fbShowRejectedScreen() {
    fbEnsureOverlay();
    const ov = document.getElementById('fb-auth-overlay');
    ov.style.display = 'flex';
    document.querySelectorAll('body > div:not(#fb-auth-overlay), body > button').forEach(el => {
      el.style.visibility = 'hidden';
      el.style.pointerEvents = 'none';
    });
    ov.innerHTML = `
      <div class="fb-card">
        <div class="fb-logo-wrap"><div class="fb-logo-icon">❌</div></div>
        <h2 class="fb-title">Acceso denegado</h2>
        <p class="fb-subtitle">Tu solicitud de acceso fue rechazada por el administrador. Si creés que es un error, comunicate con el administrador.</p>
        <button class="fb-btn-secondary" id="fb-btn-logout-rejected">Volver al inicio</button>
      </div>`;
    document.getElementById('fb-btn-logout-rejected').onclick = () => fbLogout();
  }

  // ── Overlay base ─────────────────────────────────────────────
  function fbEnsureOverlay() {
    if (document.getElementById('fb-auth-overlay')) return;
    const ov = document.createElement('div');
    ov.id = 'fb-auth-overlay';
    ov.style.cssText = `
      display:none;position:fixed;inset:0;z-index:99999;
      background:linear-gradient(135deg,#0a1628 0%,#0d2444 50%,#071220 100%);
      align-items:center;justify-content:center;padding:20px;
      font-family:'Segoe UI',system-ui,sans-serif;
    `;
    document.body.appendChild(ov);
    fbInjectAuthStyles();
  }

  function fbInjectAuthStyles() {
    if (document.getElementById('fb-auth-styles')) return;
    const s = document.createElement('style');
    s.id = 'fb-auth-styles';
    s.textContent = `
      .fb-card {
        background: rgba(255,255,255,0.04);
        backdrop-filter: blur(24px);
        border: 1px solid rgba(255,255,255,0.10);
        border-radius: 24px;
        padding: 44px 40px 36px;
        width: 100%;
        max-width: 420px;
        box-shadow: 0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05);
        animation: fbCardIn 0.45s cubic-bezier(0.34,1.4,0.64,1) both;
      }
      @keyframes fbCardIn {
        from { opacity:0; transform:translateY(28px) scale(0.96); }
        to   { opacity:1; transform:translateY(0) scale(1); }
      }
      .fb-logo-wrap {
        display:flex; justify-content:center; margin-bottom:24px;
      }
      .fb-logo-icon {
        width:64px; height:64px; border-radius:18px;
        background:linear-gradient(135deg,#0891b2,#0d7490);
        display:flex; align-items:center; justify-content:center;
        font-size:1.8rem;
        box-shadow: 0 8px 24px rgba(8,145,178,0.4);
      }
      .fb-title {
        color:#f1f5f9; font-size:1.5rem; font-weight:700;
        text-align:center; margin:0 0 8px;
        letter-spacing:-0.02em;
      }
      .fb-subtitle {
        color:#94a3b8; font-size:0.88rem; text-align:center;
        margin:0 0 28px; line-height:1.6;
      }
      .fb-field { margin-bottom:16px; }
      .fb-label {
        display:block; color:#cbd5e1; font-size:0.8rem;
        font-weight:600; margin-bottom:6px; letter-spacing:0.04em;
        text-transform:uppercase;
      }
      .fb-input {
        width:100%; box-sizing:border-box;
        background:rgba(255,255,255,0.06);
        border:1.5px solid rgba(255,255,255,0.12);
        border-radius:10px; padding:12px 14px;
        color:#f1f5f9; font-size:0.95rem; outline:none;
        transition:border-color 0.2s, background 0.2s;
        -webkit-user-select:text; user-select:text;
      }
      .fb-input:focus {
        border-color:#0891b2;
        background:rgba(8,145,178,0.08);
      }
      .fb-input.error { border-color:#ef4444; }
      .fb-error {
        color:#fca5a5; font-size:0.78rem; margin-top:5px;
        display:none; animation:fbShake 0.35s ease;
      }
      .fb-error.visible { display:block; }
      @keyframes fbShake {
        0%,100%{transform:translateX(0)}
        25%{transform:translateX(-5px)}
        75%{transform:translateX(5px)}
      }
      .fb-btn-primary {
        width:100%; padding:13px; border:none; border-radius:10px;
        background:linear-gradient(135deg,#0891b2,#0d7490);
        color:#fff; font-size:1rem; font-weight:700;
        cursor:pointer; margin-top:8px; letter-spacing:0.01em;
        transition:all 0.2s; box-shadow:0 4px 16px rgba(8,145,178,0.35);
      }
      .fb-btn-primary:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(8,145,178,0.45); }
      .fb-btn-primary:active { transform:translateY(0); }
      .fb-btn-primary:disabled { opacity:0.6; cursor:not-allowed; transform:none; }
      .fb-btn-secondary {
        width:100%; padding:11px; border:1.5px solid rgba(255,255,255,0.14);
        border-radius:10px; background:transparent;
        color:#94a3b8; font-size:0.9rem; cursor:pointer;
        margin-top:10px; transition:all 0.2s;
      }
      .fb-btn-secondary:hover { border-color:rgba(255,255,255,0.3); color:#cbd5e1; }
      .fb-divider {
        display:flex; align-items:center; gap:12px;
        margin:20px 0; color:#475569; font-size:0.8rem;
      }
      .fb-divider::before,.fb-divider::after {
        content:''; flex:1; height:1px;
        background:rgba(255,255,255,0.08);
      }
      .fb-link {
        color:#38bdf8; cursor:pointer; font-size:0.85rem;
        text-align:center; display:block; margin-top:14px;
        text-decoration:none; transition:color 0.2s;
      }
      .fb-link:hover { color:#7dd3fc; }
      .fb-toast {
        position:fixed; bottom:32px; left:50%; transform:translateX(-50%);
        background:#1e293b; color:#f1f5f9; padding:12px 24px;
        border-radius:100px; font-size:0.88rem; font-weight:500;
        z-index:100001; box-shadow:0 8px 24px rgba(0,0,0,0.4);
        border:1px solid rgba(255,255,255,0.1);
        animation:fbToastIn 0.3s ease both;
        white-space:nowrap;
      }
      @keyframes fbToastIn {
        from{opacity:0;transform:translateX(-50%) translateY(12px)}
        to{opacity:1;transform:translateX(-50%) translateY(0)}
      }
      .fb-pending-badge {
        display:flex; align-items:center; justify-content:center; gap:8px;
        background:rgba(251,191,36,0.12); border:1px solid rgba(251,191,36,0.3);
        color:#fbbf24; border-radius:100px; padding:10px 20px;
        font-size:0.88rem; font-weight:600; margin:16px 0;
      }
      /* ── PANEL ADMIN ── */
      #fb-admin-panel {
        position:fixed; inset:0; z-index:50000;
        background:linear-gradient(135deg,#0a1628 0%,#0d2444 100%);
        overflow-y:auto; display:none;
        font-family:'Segoe UI',system-ui,sans-serif;
        padding:32px 20px;
      }
      .admin-header {
        max-width:860px; margin:0 auto 32px;
        display:flex; align-items:center; justify-content:space-between;
      }
      .admin-title {
        color:#f1f5f9; font-size:1.6rem; font-weight:800;
        letter-spacing:-0.02em;
      }
      .admin-title span { color:#0891b2; }
      .admin-close {
        width:40px; height:40px; border-radius:50%;
        background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.12);
        color:#94a3b8; font-size:1.2rem; cursor:pointer;
        display:flex; align-items:center; justify-content:center;
        transition:all 0.2s;
      }
      .admin-close:hover { background:rgba(239,68,68,0.2); color:#fca5a5; border-color:rgba(239,68,68,0.3); }
      .admin-section {
        max-width:860px; margin:0 auto 28px;
      }
      .admin-section-title {
        color:#94a3b8; font-size:0.75rem; font-weight:700;
        text-transform:uppercase; letter-spacing:0.1em;
        margin-bottom:14px; padding-bottom:10px;
        border-bottom:1px solid rgba(255,255,255,0.07);
      }
      .admin-card {
        background:rgba(255,255,255,0.04);
        border:1px solid rgba(255,255,255,0.08);
        border-radius:16px; padding:20px 22px;
        margin-bottom:12px; display:flex;
        align-items:center; justify-content:space-between;
        gap:16px; flex-wrap:wrap;
        transition:border-color 0.2s;
      }
      .admin-card:hover { border-color:rgba(8,145,178,0.3); }
      .admin-card-info { flex:1; min-width:200px; }
      .admin-card-name {
        color:#f1f5f9; font-weight:600; font-size:1rem; margin-bottom:3px;
      }
      .admin-card-email { color:#64748b; font-size:0.83rem; }
      .admin-card-date { color:#475569; font-size:0.78rem; margin-top:3px; }
      .admin-card-actions { display:flex; gap:8px; flex-shrink:0; }
      .admin-btn-approve {
        padding:8px 18px; border:none; border-radius:8px;
        background:linear-gradient(135deg,#059669,#047857);
        color:#fff; font-size:0.85rem; font-weight:600;
        cursor:pointer; transition:all 0.2s;
        box-shadow:0 3px 10px rgba(5,150,105,0.3);
      }
      .admin-btn-approve:hover { transform:translateY(-1px); box-shadow:0 5px 14px rgba(5,150,105,0.4); }
      .admin-btn-reject {
        padding:8px 18px; border:1.5px solid rgba(239,68,68,0.35);
        border-radius:8px; background:rgba(239,68,68,0.08);
        color:#fca5a5; font-size:0.85rem; font-weight:600;
        cursor:pointer; transition:all 0.2s;
      }
      .admin-btn-reject:hover { background:rgba(239,68,68,0.18); border-color:rgba(239,68,68,0.6); }
      .admin-empty {
        color:#475569; text-align:center; padding:40px 20px;
        font-size:0.9rem;
      }
      .admin-badge-count {
        display:inline-flex; align-items:center; justify-content:center;
        background:#ef4444; color:#fff; border-radius:50%;
        width:18px; height:18px; font-size:0.7rem; font-weight:700;
        margin-left:6px; vertical-align:middle;
      }
      .admin-user-status {
        display:inline-flex; align-items:center; gap:5px;
        border-radius:100px; padding:3px 10px;
        font-size:0.75rem; font-weight:600;
      }
      .status-approved { background:rgba(5,150,105,0.15); color:#34d399; border:1px solid rgba(5,150,105,0.3); }
      .status-pending  { background:rgba(251,191,36,0.12); color:#fbbf24; border:1px solid rgba(251,191,36,0.25); }
      .status-rejected { background:rgba(239,68,68,0.12);  color:#fca5a5; border:1px solid rgba(239,68,68,0.25); }
      /* botón admin en menú */
      .li-admin {
        background:linear-gradient(135deg,rgba(8,145,178,0.15),rgba(8,145,178,0.08)) !important;
        border:1px solid rgba(8,145,178,0.25) !important;
        color:#38bdf8 !important; font-weight:700 !important;
        position:relative;
      }
      /* User info bar */
      #fb-user-bar {
        position:fixed; bottom:0; left:0; right:0; z-index:9990;
        background:rgba(10,22,40,0.95); backdrop-filter:blur(12px);
        border-top:1px solid rgba(255,255,255,0.07);
        padding:8px 20px; display:flex; align-items:center;
        justify-content:space-between; font-size:0.82rem;
        font-family:'Segoe UI',system-ui,sans-serif;
      }
      #fb-user-bar .ub-info { color:#64748b; }
      #fb-user-bar .ub-email { color:#94a3b8; font-weight:500; }
      #fb-user-bar .ub-logout {
        color:#ef4444; cursor:pointer; font-size:0.8rem;
        background:none; border:none; padding:4px 8px;
        border-radius:6px; transition:background 0.15s;
      }
      #fb-user-bar .ub-logout:hover { background:rgba(239,68,68,0.12); }
      #fb-user-bar .ub-ver-progreso {
        color:#34d399; cursor:pointer; font-size:0.8rem;
        background:none; border:1px solid rgba(52,211,153,0.3);
        padding:4px 10px; border-radius:6px; transition:all 0.15s;
        font-weight:500;
      }
      #fb-user-bar .ub-ver-progreso:hover { background:rgba(52,211,153,0.1); border-color:rgba(52,211,153,0.6); }
    `;
    document.head.appendChild(s);
  }

  // ── Render Login ─────────────────────────────────────────────
  function fbRenderLogin() {
    const ov = document.getElementById('fb-auth-overlay');
    ov.innerHTML = `
      <div class="fb-card">
        <div class="fb-logo-wrap">
          <div class="fb-logo-icon">🩺</div>
        </div>
        <h2 class="fb-title">Bienvenido</h2>
        <p class="fb-subtitle">Ingresá tus credenciales para acceder al sistema de preparación</p>
        <div class="fb-field">
          <label class="fb-label">Email</label>
          <input class="fb-input" id="fb-login-email" type="email" placeholder="tu@email.com" autocomplete="email"/>
          <div class="fb-error" id="fb-login-email-err"></div>
        </div>
        <div class="fb-field">
          <label class="fb-label">Contraseña</label>
          <input class="fb-input" id="fb-login-pass" type="password" placeholder="••••••••" autocomplete="current-password"/>
          <div class="fb-error" id="fb-login-pass-err"></div>
        </div>
        <div class="fb-error" id="fb-login-general-err" style="margin-bottom:10px;"></div>
        <button class="fb-btn-primary" id="fb-login-btn">Iniciar sesión</button>
        <a class="fb-link" id="fb-goto-reset">¿Olvidaste tu contraseña?</a>
        <div class="fb-divider">o</div>
        <button class="fb-btn-secondary" id="fb-goto-register">Crear cuenta nueva</button>
      </div>`;

    document.getElementById('fb-login-btn').onclick = fbDoLogin;
    document.getElementById('fb-goto-register').onclick = () => fbShowAuthScreen('register');
    document.getElementById('fb-goto-reset').onclick   = () => fbShowAuthScreen('reset');
    ['fb-login-email','fb-login-pass'].forEach(id => {
      document.getElementById(id).addEventListener('keydown', e => { if(e.key==='Enter') fbDoLogin(); });
    });
  }

  // ── Render Register ──────────────────────────────────────────
  function fbRenderRegister() {
    const ov = document.getElementById('fb-auth-overlay');
    ov.innerHTML = `
      <div class="fb-card">
        <div class="fb-logo-wrap"><div class="fb-logo-icon">✍️</div></div>
        <h2 class="fb-title">Crear cuenta</h2>
        <p class="fb-subtitle">Completá el formulario. Tu solicitud será revisada por el administrador antes de obtener acceso.</p>
        <div class="fb-field">
          <label class="fb-label">Nombre completo</label>
          <input class="fb-input" id="fb-reg-name" type="text" placeholder="Juan Pérez" autocomplete="name"/>
          <div class="fb-error" id="fb-reg-name-err"></div>
        </div>
        <div class="fb-field">
          <label class="fb-label">Email</label>
          <input class="fb-input" id="fb-reg-email" type="email" placeholder="tu@email.com" autocomplete="email"/>
          <div class="fb-error" id="fb-reg-email-err"></div>
        </div>
        <div class="fb-field">
          <label class="fb-label">Contraseña</label>
          <input class="fb-input" id="fb-reg-pass" type="password" placeholder="Mínimo 6 caracteres" autocomplete="new-password"/>
          <div class="fb-error" id="fb-reg-pass-err"></div>
        </div>
        <div class="fb-field">
          <label class="fb-label">Confirmar contraseña</label>
          <input class="fb-input" id="fb-reg-pass2" type="password" placeholder="Repetí la contraseña" autocomplete="new-password"/>
          <div class="fb-error" id="fb-reg-pass2-err"></div>
        </div>
        <div class="fb-error" id="fb-reg-general-err" style="margin-bottom:10px;"></div>
        <button class="fb-btn-primary" id="fb-reg-btn">Enviar solicitud</button>
        <button class="fb-btn-secondary" id="fb-goto-login-from-reg">Ya tengo cuenta</button>
      </div>`;

    document.getElementById('fb-reg-btn').onclick = fbDoRegister;
    document.getElementById('fb-goto-login-from-reg').onclick = () => fbShowAuthScreen('login');
  }

  // ── Render Reset Password ────────────────────────────────────
  function fbRenderReset() {
    const ov = document.getElementById('fb-auth-overlay');
    ov.innerHTML = `
      <div class="fb-card">
        <div class="fb-logo-wrap"><div class="fb-logo-icon">🔑</div></div>
        <h2 class="fb-title">Recuperar contraseña</h2>
        <p class="fb-subtitle">Ingresá tu email y te enviaremos un enlace para restablecer tu contraseña.</p>
        <div class="fb-field">
          <label class="fb-label">Email</label>
          <input class="fb-input" id="fb-reset-email" type="email" placeholder="tu@email.com" autocomplete="email"/>
          <div class="fb-error" id="fb-reset-email-err"></div>
        </div>
        <div class="fb-error" id="fb-reset-general-err" style="margin-bottom:10px;"></div>
        <button class="fb-btn-primary" id="fb-reset-btn">Enviar enlace</button>
        <button class="fb-btn-secondary" id="fb-goto-login-from-reset">Volver al inicio de sesión</button>
      </div>`;

    document.getElementById('fb-reset-btn').onclick = fbDoReset;
    document.getElementById('fb-goto-login-from-reset').onclick = () => fbShowAuthScreen('login');
    document.getElementById('fb-reset-email').addEventListener('keydown', e => { if(e.key==='Enter') fbDoReset(); });
  }

  // ── Helpers de UI ────────────────────────────────────────────
  function fbShowErr(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg; el.classList.add('visible');
  }
  function fbClearErrs(...ids) {
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = ''; el.classList.remove('visible'); el.closest?.('.fb-input')?.classList.remove('error'); }
    });
  }
  function fbMarkInputErr(inputId) {
    const el = document.getElementById(inputId);
    if (el) el.classList.add('error');
  }
  function fbSetBtnLoading(btnId, loading, label = '') {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;
    if (loading) { btn.dataset.orig = btn.textContent; btn.textContent = 'Procesando…'; }
    else btn.textContent = label || btn.dataset.orig || btn.textContent;
  }
  function fbToast(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = 'fb-toast';
    t.style.borderColor = type === 'success' ? 'rgba(5,150,105,0.4)' : type === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity='0'; t.style.transition='opacity 0.4s'; setTimeout(()=>t.remove(),400); }, 3500);
  }

  // ── Acciones de Auth ─────────────────────────────────────────
  async function fbDoLogin() {
    const { signInWithEmailAndPassword } = window.__fb;
    fbClearErrs('fb-login-email-err','fb-login-pass-err','fb-login-general-err');
    const email = document.getElementById('fb-login-email')?.value?.trim() || '';
    const pass  = document.getElementById('fb-login-pass')?.value || '';
    let ok = true;
    if (!email) { fbShowErr('fb-login-email-err','Ingresá tu email'); fbMarkInputErr('fb-login-email'); ok=false; }
    if (!pass)  { fbShowErr('fb-login-pass-err','Ingresá tu contraseña'); fbMarkInputErr('fb-login-pass'); ok=false; }
    if (!ok) return;

    fbSetBtnLoading('fb-login-btn', true);
    try {
      await signInWithEmailAndPassword(_fbAuth, email, pass);
      // onAuthStateChanged se encarga del resto
    } catch(e) {
      const msg = fbAuthError(e.code);
      fbShowErr('fb-login-general-err', msg);
      fbMarkInputErr('fb-login-email'); fbMarkInputErr('fb-login-pass');
    }
    fbSetBtnLoading('fb-login-btn', false, 'Iniciar sesión');
  }

  async function fbDoRegister() {
    const { createUserWithEmailAndPassword, doc, setDoc, serverTimestamp } = window.__fb;
    fbClearErrs('fb-reg-name-err','fb-reg-email-err','fb-reg-pass-err','fb-reg-pass2-err','fb-reg-general-err');
    const name  = document.getElementById('fb-reg-name')?.value?.trim() || '';
    const email = document.getElementById('fb-reg-email')?.value?.trim() || '';
    const pass  = document.getElementById('fb-reg-pass')?.value || '';
    const pass2 = document.getElementById('fb-reg-pass2')?.value || '';
    let ok = true;
    if (!name)          { fbShowErr('fb-reg-name-err','Ingresá tu nombre'); fbMarkInputErr('fb-reg-name'); ok=false; }
    if (!email)         { fbShowErr('fb-reg-email-err','Ingresá tu email'); fbMarkInputErr('fb-reg-email'); ok=false; }
    if (pass.length<6)  { fbShowErr('fb-reg-pass-err','La contraseña debe tener al menos 6 caracteres'); fbMarkInputErr('fb-reg-pass'); ok=false; }
    if (pass !== pass2) { fbShowErr('fb-reg-pass2-err','Las contraseñas no coinciden'); fbMarkInputErr('fb-reg-pass2'); ok=false; }
    if (!ok) return;

    fbSetBtnLoading('fb-reg-btn', true);
    try {
      const cred = await createUserWithEmailAndPassword(_fbAuth, email, pass);
      const uid  = cred.user.uid;
      const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      await setDoc(doc(_fbDb,'users',uid), {
        uid, name, email,
        status   : isAdmin ? 'approved' : 'pending',
        role     : isAdmin ? 'admin' : 'user',
        createdAt: serverTimestamp()
      });
      if (!isAdmin) {
        // Crear solicitud de registro
        await setDoc(doc(_fbDb,'registration_requests',uid), {
          uid, name, email,
          status   : 'pending',
          createdAt: serverTimestamp()
        });
      }
      // onAuthStateChanged se encarga del resto
    } catch(e) {
      fbShowErr('fb-reg-general-err', fbAuthError(e.code));
    }
    fbSetBtnLoading('fb-reg-btn', false, 'Enviar solicitud');
  }

  async function fbDoReset() {
    const { sendPasswordResetEmail } = window.__fb;
    fbClearErrs('fb-reset-email-err','fb-reset-general-err');
    const email = document.getElementById('fb-reset-email')?.value?.trim() || '';
    if (!email) { fbShowErr('fb-reset-email-err','Ingresá tu email'); fbMarkInputErr('fb-reset-email'); return; }

    fbSetBtnLoading('fb-reset-btn', true);
    try {
      await sendPasswordResetEmail(_fbAuth, email);
      fbToast('✉️ Email enviado. Revisá tu casilla.','success');
      setTimeout(() => fbShowAuthScreen('login'), 2500);
    } catch(e) {
      fbShowErr('fb-reset-general-err', fbAuthError(e.code));
    }
    fbSetBtnLoading('fb-reset-btn', false, 'Enviar enlace');
  }

  async function fbLogout() {
    // Cerrar todas las explicaciones abiertas antes de guardar/salir
    cerrarTodasLasExplicaciones();

    // ── 1. Cancelar listeners en tiempo real ────────────────────────
    if (typeof _fbProgressUnsubscribe !== 'undefined' && _fbProgressUnsubscribe) {
      _fbProgressUnsubscribe();
      _fbProgressUnsubscribe = null;
    }
    if (_progressUnsubscribe) {
      _progressUnsubscribe();
      _progressUnsubscribe = null;
    }

    // ── 2. Guardar progreso en Firestore ANTES de cerrar sesión ──────
    if (_currentUser && _fbDb && window.__fb) {
      // Tomar el state más reciente: memoria o localStorage (el que tenga más datos)
      let stateParaGuardar = state;
      try {
        const localState = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const localKeys  = Object.keys(localState).length;
        const memKeys    = Object.keys(state).length;
        // Usar el que tenga más secciones respondidas
        if (localKeys > memKeys) {
          stateParaGuardar = localState;
          console.log('[FB-LOGOUT] Usando state de localStorage (más completo):', localKeys, 'vs', memKeys, 'secciones');
        }
      } catch (_) {}

      // Solo guardar si hay algo real — proteger contra sobreescribir con estado vacío
      const hayProgreso = Object.keys(stateParaGuardar).some(sid => {
        const s = stateParaGuardar[sid];
        return s && s.graded && Object.keys(s.graded).length > 0;
      });

      if (hayProgreso) {
        try {
          fbToast('Guardando progreso…', 'info');
          const { doc, setDoc, serverTimestamp } = window.__fb;
          await setDoc(doc(_fbDb, 'progress', _currentUser.uid), {
            state      : stateParaGuardar,
            attemptLog,
            updatedAt  : serverTimestamp()
          });
          localStorage.setItem('quiz_progress_ts', String(Date.now()));
          fbToast('✅ Progreso guardado en la nube', 'success');
        } catch (e) {
          console.error('[FB-LOGOUT] Error al guardar progreso antes de cerrar sesión:', e);
          fbToast('⚠️ No se pudo guardar el progreso en la nube', 'error');
        }
      } else {
        console.log('[FB-LOGOUT] state vacío o sin respuestas — no se sobreescribe Firestore');
      }
    }

    // ── 3. Cerrar sesión en Firebase Auth ───────────────────────────
    const { fbSignOut } = window.__fb;
    await fbSignOut(_fbAuth);

    // ── 4. Limpiar DOM y estado local ───────────────────────────────
    document.getElementById('fb-user-bar')?.remove();
    document.getElementById('li-admin-btn')?.remove();
    document.getElementById('li-edit-respuestas')?.remove();
    document.getElementById('fb-admin-panel')?.remove();
    state = {};
    attemptLog = [];
    searchIndex = [];
    indexBuilt = false;
    indexBuilding = false;
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    try { localStorage.removeItem(ATTEMPT_LOG_KEY); } catch {}
    try { localStorage.removeItem(TIMER_STORAGE_KEY); } catch {}
    try { localStorage.removeItem(SCROLL_POSITION_KEY); } catch {}
    try { localStorage.removeItem(LAST_SECTION_KEY); } catch {}
    // Limpiar el timestamp de progreso para que el próximo login
    // no descarte la nube por creer que el local es más reciente.
    try { localStorage.removeItem('quiz_progress_ts'); } catch {}
    try { localStorage.removeItem('quiz_beforeunload_pending'); } catch {}
    // Limpiar secciones en memoria (se recargarán desde caché o Firestore en el próximo login)
    _seccionesYaCargadas.clear();
    if (window.preguntasPorSeccion) window.preguntasPorSeccion = {};
    window._extrapolacionAplicada = false;
    window._fbAdminButtonsSetup = false;
    window._fbCurrentUser = null;
    window._fbCurrentUserData = null;
    _modoEditarRespuestas = false;
    // Notificar al resto de la página que la sesión se cerró (limpia permisos de copia, etc.)
    document.dispatchEvent(new CustomEvent('fb:sesionCerrada'));
  }

  function fbAuthError(code) {
    const map = {
      'auth/user-not-found'      : 'No existe una cuenta con ese email.',
      'auth/wrong-password'      : 'Contraseña incorrecta.',
      'auth/invalid-credential'  : 'Email o contraseña incorrectos.',
      'auth/email-already-in-use': 'Ya existe una cuenta con ese email.',
      'auth/weak-password'       : 'La contraseña debe tener al menos 6 caracteres.',
      'auth/invalid-email'       : 'El formato del email no es válido.',
      'auth/too-many-requests'   : 'Demasiados intentos fallidos. Esperá un momento.',
      'auth/network-request-failed': 'Error de conexión. Verificá tu internet.',
    };
    return map[code] || 'Ocurrió un error. Intentá nuevamente.';
  }

  // ── Barra de usuario (pie de página) ─────────────────────────
  function fbShowUserBar() {
    if (!_currentUserData) return;
    let bar = document.getElementById('fb-user-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'fb-user-bar';
      document.body.appendChild(bar);
    }
    const isAdmin = _currentUserData.role === 'admin';
    // FIX: el botón "🔧 Reordenar" se inyecta directamente en el HTML de la barra
    // para que sobreviva cualquier re-renderizado de la barra (antes se inyectaba
    // vía evento y desaparecía al recrear la barra con innerHTML).
    const _esCoadminConsolid = (_currentUserData.email || '').toLowerCase() === EMAIL_COADMIN_CONSOLIDACION;
    const _btnReordenarHTML = _esCoadminConsolid
      ? `<button id="btn-consolidar-progreso"
           title="Reordenar las preguntas respondidas para que queden todas juntas al inicio"
           style="color:#fbbf24;cursor:pointer;font-size:0.8rem;background:none;
                  border:1px solid rgba(251,191,36,0.4);padding:4px 10px;
                  border-radius:6px;font-weight:600;transition:all 0.15s;">
           🔧 Reordenar
         </button>`
      : '';
    bar.innerHTML = `
      <span class="ub-info">
        ${isAdmin ? '👑 ' : ''}
        <span class="ub-email">${_currentUserData.email}</span>
        ${isAdmin ? ' <span style="color:#0891b2;font-size:0.75rem;">(Admin)</span>' : ''}
      </span>
      <div style="display:flex;gap:8px;align-items:center;">
        <button class="ub-ver-progreso" id="fb-bar-ver-progreso">📊 Ver mi progreso</button>
        ${_btnReordenarHTML}
        <button class="ub-logout" id="fb-bar-logout">Cerrar sesión</button>
      </div>`;
    bar.classList.add('visible');
    document.getElementById('fb-bar-logout').onclick = fbLogout;
    document.getElementById('fb-bar-ver-progreso').onclick = () => {
      const btn = document.getElementById('btn-ver-progreso');
      if (btn) btn.click();
    };
    // Reconectar onclick del botón de reordenar (si existe)
    const _btnConsol = document.getElementById('btn-consolidar-progreso');
    if (_btnConsol) {
      _btnConsol.onclick = _ejecutarConsolidacion;
      _btnConsol.onmouseenter = () => { _btnConsol.style.background = 'rgba(251,191,36,0.12)'; };
      _btnConsol.onmouseleave = () => { _btnConsol.style.background = 'none'; };
    }
  }

  // ── Botón ADMIN en menú ───────────────────────────────────────
  function fbUpdateAdminButton() {
    if (!_currentUserData) return;
    fbShowUserBar();
    if (_currentUserData.role !== 'admin') return;

    // Agregar botón admin al menú si no existe
    if (document.getElementById('li-admin-btn')) return;
    const ul = document.querySelector('#menu-principal .columna:last-child ul');
    if (!ul) return;
    const li = document.createElement('li');
    li.id = 'li-admin-btn';
    li.className = 'li-admin';
    li.textContent = '⚙️ ADMIN';
    li.onclick = () => fbShowAdminPanel();
    ul.appendChild(li);
  }

  // ── Panel Admin ───────────────────────────────────────────────
  function fbShowAdminPanel() {
    let panel = document.getElementById('fb-admin-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'fb-admin-panel';
      document.body.appendChild(panel);
    }
    panel.style.display = 'block';
    panel.innerHTML = `
      <div class="admin-header">
        <div class="admin-title">⚙️ Panel de <span>Administración</span></div>
        <button class="admin-close" id="fb-admin-close">✕</button>
      </div>
      <div class="admin-section">
        <div class="admin-section-title">🔍 Herramientas de contenido</div>
        <div style="padding:0 0 12px;">
          <button id="btn-buscar-duplicados" style="
            width:100%;padding:12px 16px;border:none;border-radius:10px;
            background:linear-gradient(135deg,#7c3aed,#6d28d9);
            color:#fff;font-size:0.9rem;font-weight:700;cursor:pointer;
            box-shadow:0 4px 14px rgba(124,58,237,0.35);
            transition:all 0.2s;letter-spacing:0.02em;">
            🔁 Buscar preguntas duplicadas en Firestore
          </button>
        </div>
        <div style="padding:0 0 4px;">
          <button id="admin-btn-debug-toggle" style="
            width:100%;padding:12px 16px;border:none;border-radius:10px;
            background:linear-gradient(135deg,#1e293b,#334155);
            color:#fff;font-size:0.9rem;font-weight:700;cursor:pointer;
            box-shadow:0 4px 14px rgba(0,0,0,0.25);
            transition:all 0.2s;letter-spacing:0.02em;">
            ⚫ Panel de debug: OFF
          </button>
        </div>
        <div style="padding:0 0 4px;">
          <button id="btn-subir-preguntas" style="
            width:100%;padding:12px 16px;border:none;border-radius:10px;
            background:linear-gradient(135deg,#0284c7,#0891b2);
            color:#fff;font-size:0.9rem;font-weight:700;cursor:pointer;
            box-shadow:0 4px 14px rgba(8,145,178,0.35);
            transition:all 0.2s;letter-spacing:0.02em;">
            📤 Subir preguntas nuevas
          </button>
        </div>
        <div style="padding:0 0 4px;">
          <button id="btn-forzar-actualizacion" style="
            width:100%;padding:12px 16px;border:none;border-radius:10px;
            background:linear-gradient(135deg,#059669,#047857);
            color:#fff;font-size:0.9rem;font-weight:700;cursor:pointer;
            box-shadow:0 4px 14px rgba(5,150,105,0.35);
            transition:all 0.2s;letter-spacing:0.02em;">
            🔄 Forzar actualización para todos los usuarios
          </button>
          <div style="color:#64748b;font-size:0.75rem;padding:5px 4px 0;">
            Los usuarios verán las preguntas nuevas la próxima vez que abran la app o recarguen.
          </div>
        </div>
      </div>
      <div class="admin-section">
        <div class="admin-section-title">Solicitudes pendientes <span id="admin-badge-pending"></span></div>
        <div id="admin-requests-list"><div class="admin-empty">Cargando…</div></div>
      </div>
      <div class="admin-section">
        <div class="admin-section-title" style="display:flex;align-items:center;justify-content:space-between;">
          Todos los usuarios
          <button id="btn-refresh-users" style="padding:4px 10px;border:none;border-radius:6px;
            background:rgba(255,255,255,0.08);color:#94a3b8;font-size:0.75rem;cursor:pointer;">
            🔄 Actualizar
          </button>
        </div>
        <div id="admin-users-list"><div class="admin-empty">Cargando…</div></div>
      </div>`

    document.getElementById('fb-admin-close').onclick = () => { panel.style.display = 'none'; };
    document.getElementById('btn-buscar-duplicados').onclick = () => fbAbrirBuscadorDuplicados();
    document.getElementById('btn-forzar-actualizacion').onclick = () => _forzarActualizacionGlobal();
    document.getElementById('btn-refresh-users').onclick = () => fbCargarUsuarios();
    document.getElementById('btn-subir-preguntas').onclick = () => {
      if (typeof window.fbAbrirSubirPreguntas === 'function') {
        window.fbAbrirSubirPreguntas();
      } else {
        // Cargar el módulo dinámicamente si no fue incluido en el HTML
        const existing = document.querySelector('script[src*="subir-preguntas-admin"]');
        if (existing) {
          _toast('⏳ Módulo cargando, intentá de nuevo en un segundo…', 'info');
          return;
        }
        const s = document.createElement('script');
        s.src = 'subir-preguntas-admin.js';
        s.onload = () => {
          if (typeof window.fbAbrirSubirPreguntas === 'function') {
            window.fbAbrirSubirPreguntas();
          } else {
            _toast('❌ No se pudo cargar el módulo subir-preguntas-admin.js', 'error');
          }
        };
        s.onerror = () => _toast('❌ No se encontró subir-preguntas-admin.js', 'error');
        document.head.appendChild(s);
      }
    };

    document.getElementById('admin-btn-debug-toggle').onclick = () => {
      _debugPanelEnabled = !_debugPanelEnabled;
      _actualizarBtnDebugEnAdmin();
      if (!_debugPanelEnabled) {
        // Apagar: cerrar el panel si estaba abierto
        document.getElementById('_debug_panel')?.remove();
      }
    };

    fbListenAdminRequests();
    fbListenAllUsers();
  }

  // ════════════════════════════════════════════════════════════════
  // BUSCADOR DE PREGUNTAS DUPLICADAS
  // Las funciones fbAbrirBuscadorDuplicados() y _dupForzarRescan()
  // fueron movidas al archivo independiente: buscador-duplicados.js
  // Ese archivo se carga DESPUÉS de este script en index.html y
  // expone ambas funciones en window.* para que el resto del código
  // (el botón en el panel admin) las pueda llamar igual que antes.
  // ════════════════════════════════════════════════════════════════


  // ════════════════════════════════════════════════════════════════
  // FORZAR ACTUALIZACIÓN GLOBAL (botón admin)
  // Escribe en meta/forceRefresh_{seccion} para cada sección que
  // tenga un contentVersion vigente. Los usuarios lo detectan al
  // arrancar y descargan solo las preguntas nuevas.
  // Costo: 1 escritura por sección afectada (típicamente 1-3).
  // ════════════════════════════════════════════════════════════════
  async function _forzarActualizacionGlobal(seccionId) {
    if (!window.__fb || !_fbDb) return;
    const { doc, setDoc, serverTimestamp } = window.__fb;

    const btn = document.getElementById('btn-forzar-actualizacion');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Publicando ediciones…'; }

    try {
      // ── Leer ediciones pendientes registradas por editor-admin.js ──
      let pendientes = {};
      try { pendientes = JSON.parse(localStorage.getItem(_EDICIONES_PENDIENTES_KEY) || '{}'); } catch (_) {}

      // Filtrar por sección si se pasó una específica
      const seccionesConEdiciones = Object.keys(pendientes)
        .filter(s => !seccionId || s === seccionId);

      if (seccionesConEdiciones.length > 0) {
        // ── MODO EFICIENTE: 1 sola escritura por sección ──
        // Publica todos los qIndexes editados en un solo documento.
        // Los usuarios descargan solo esas preguntas (ceil(N/30) consultas),
        // no toda la sección. 1 sola re-renderización al final.
        let totalPreguntas = 0;

        for (const s of seccionesConEdiciones) {
          const ediciones = pendientes[s] || [];
          if (ediciones.length === 0) continue;

          const qIndexes       = ediciones.map(e => e.qIndex);
          const nuevasCorrectas = ediciones
            .filter(e => e.nuevaCorrecta !== null)
            .map(e => ({ qIndex: e.qIndex, correcta: e.nuevaCorrecta }));

          // 1 sola escritura para todas las ediciones de esta sección
          await setDoc(doc(_fbDb, 'meta', 'contentVersion'), {
            version         : Date.now(),
            seccionId       : s,
            qIndex          : null,           // legacy — ya no se usa
            qIndexes        : qIndexes,       // array completo de editadas
            nuevasCorrectas : nuevasCorrectas, // para recalificación
            nuevaCorrecta   : null,           // legacy
            esEdicionPuntual: true,
            updatedAt       : serverTimestamp()
          });

          totalPreguntas += ediciones.length;
          console.log(`[FORCE-REFRESH] "${s}" → ${ediciones.length} pregunta(s) publicada(s) en 1 escritura`);
        }

        // Limpiar solo las secciones publicadas
        seccionesConEdiciones.forEach(s => delete pendientes[s]);
        try {
          if (Object.keys(pendientes).length > 0) {
            localStorage.setItem(_EDICIONES_PENDIENTES_KEY, JSON.stringify(pendientes));
          } else {
            localStorage.removeItem(_EDICIONES_PENDIENTES_KEY);
          }
        } catch (_) {}

        fbToast(
          `✅ ${totalPreguntas} pregunta(s) publicada(s) en ${seccionesConEdiciones.length} sección(es). Los usuarios las ven al instante.`,
          'success'
        );

      } else {
        // ── MODO GLOBAL: sin ediciones puntuales pendientes ──
        // Se usa cuando se quiere forzar recarga completa (ej: después de subir preguntas nuevas).
        const seccionesEnCache = (seccionId ? [seccionId] :
          Object.keys(localStorage)
            .filter(k => k.startsWith(PREGUNTAS_CACHE_PREFIX))
            .map(k => k.replace(PREGUNTAS_CACHE_PREFIX, ''))
        );

        let actualizadas = 0;
        for (const s of seccionesEnCache) {
          try {
            await setDoc(doc(_fbDb, 'meta', 'contentVersion'), {
              version         : Date.now(),
              seccionId       : s,
              qIndex          : null,
              qIndexes        : [],
              nuevasCorrectas : [],
              nuevaCorrecta   : null,
              esEdicionPuntual: false,
              updatedAt       : serverTimestamp(),
              forzado         : true
            });
            actualizadas++;
            await new Promise(r => setTimeout(r, 80));
          } catch (e) {
            console.warn('[FORCE-REFRESH] Error en sección', s, ':', e.message);
          }
        }

        fbToast(
          `✅ Actualización global enviada — ${actualizadas} sección(es). Los usuarios verán las novedades al abrir la app.`,
          'success'
        );
        console.log('[FORCE-REFRESH] Forzado global completado:', actualizadas, 'secciones');
      }

    } catch (e) {
      fbToast('❌ Error al forzar actualización: ' + e.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '🔄 Forzar actualización para todos los usuarios'; }
    }
  }

  function fbListenAdminRequests() {
    const { collection, query, where, onSnapshot, doc,
            updateDoc, deleteDoc, serverTimestamp } = window.__fb;
    const q = query(collection(_fbDb,'registration_requests'), where('status','==','pending'));
    onSnapshot(q, (snap) => {
      const list = document.getElementById('admin-requests-list');
      const badge = document.getElementById('admin-badge-pending');
      if (!list) return;
      if (badge) badge.innerHTML = snap.size > 0
        ? `<span class="admin-badge-count">${snap.size}</span>` : '';
      if (snap.empty) { list.innerHTML = '<div class="admin-empty">✅ No hay solicitudes pendientes</div>'; return; }
      list.innerHTML = '';
      snap.forEach(docSnap => {
        const d = docSnap.data();
        const card = document.createElement('div');
        card.className = 'admin-card';
        const fecha = d.createdAt?.toDate?.()?.toLocaleDateString('es-AR') || '—';
        card.innerHTML = `
          <div class="admin-card-info">
            <div class="admin-card-name">${d.name || '(sin nombre)'}</div>
            <div class="admin-card-email">${d.email}</div>
            <div class="admin-card-date">Solicitado: ${fecha}</div>
          </div>
          <div class="admin-card-actions">
            <button class="admin-btn-approve" data-uid="${d.uid}">✓ Aprobar</button>
            <button class="admin-btn-reject"  data-uid="${d.uid}">✕ Rechazar</button>
          </div>`;
        card.querySelector('.admin-btn-approve').onclick = async () => {
          const uid = d.uid;
          await updateDoc(doc(_fbDb,'users',uid), { status:'approved', approvedAt: serverTimestamp() });
          await updateDoc(doc(_fbDb,'registration_requests',uid), { status:'approved' });
          fbToast(`✅ ${d.name} aprobado/a`, 'success');
        };
        card.querySelector('.admin-btn-reject').onclick = async () => {
          if (!confirm(`¿Rechazar la solicitud de ${d.name}?`)) return;
          await updateDoc(doc(_fbDb,'users',uid), { status:'rejected' });
          await updateDoc(doc(_fbDb,'registration_requests',uid), { status:'rejected' });
          fbToast(`❌ ${d.name} rechazado/a`, 'error');
        };
        list.appendChild(card);
      });
    });
  }

  // getDocs en lugar de onSnapshot — 1 lectura al abrir el panel,
  // no una conexión permanente que cobra lecturas cada vez que algo cambia.
  async function fbCargarUsuarios() {
    const list = document.getElementById('admin-users-list');
    if (!list) return;
    list.innerHTML = '<div class="admin-empty">Cargando…</div>';
    const btn = document.getElementById('btn-refresh-users');
    if (btn) { btn.disabled = true; btn.textContent = '⏳'; }
    try {
      const { collection, getDocs } = window.__fb;
      const snap = await getDocs(collection(_fbDb, 'users'));
      if (snap.empty) { list.innerHTML = '<div class="admin-empty">No hay usuarios registrados</div>'; return; }
      list.innerHTML = '';
      snap.forEach(docSnap => {
        const d = docSnap.data();
        const statusLabel = { approved:'Aprobado', pending:'Pendiente', rejected:'Rechazado' }[d.status] || d.status;
        const statusClass = { approved:'status-approved', pending:'status-pending', rejected:'status-rejected' }[d.status] || '';
        const fecha = d.createdAt?.toDate?.()?.toLocaleDateString('es-AR') || '—';
        const card = document.createElement('div');
        card.className = 'admin-card';
        card.innerHTML = `
          <div class="admin-card-info">
            <div class="admin-card-name">${d.name || '(sin nombre)'} ${d.role==='admin'?'<span style="color:#0891b2;font-size:0.78rem;">Admin</span>':''}</div>
            <div class="admin-card-email">${d.email}</div>
            <div class="admin-card-date">Registrado: ${fecha}</div>
          </div>
          <span class="admin-user-status ${statusClass}">${statusLabel}</span>`;
        list.appendChild(card);
      });
    } catch(e) {
      list.innerHTML = '<div class="admin-empty">❌ Error al cargar usuarios</div>';
      console.warn('[ADMIN] Error cargando usuarios:', e.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '🔄 Actualizar'; }
    }
  }
  // Alias para compatibilidad con el panel (lo llamamos igual que antes en el init)
  function fbListenAllUsers() { fbCargarUsuarios(); }

  // ── Sincronización de progreso con Firestore ─────────────────
let _fbProgressUnsubscribe = null;

// Cuenta el total de preguntas respondidas en un objeto state
function _contarRespuestas(s) {
  if (!s || typeof s !== 'object') return 0;
  // Fix v22: contar solo graded===true — evita que answeredOrder corrupto (con entradas sin graded=true)
  // infle el conteo de la nube y haga que siempre gane sobre el estado reparado local.
  return Object.values(s).reduce((n, sec) => {
    const g = sec?.graded || {};
    return n + Object.keys(g).filter(k => g[k] === true).length;
  }, 0);
}

async function fbSyncProgressFromCloud() {
  if (!_currentUser || !_fbDb) {
    fbToast('⚠️ Error interno: Firebase no inicializado', 'error');
    return;
  }

  const { doc, getDoc, setDoc, serverTimestamp } = window.__firebase_firestore || window.__fb;
  const uid = _currentUser.uid;

  try {
    fbToast('☁️ Cargando progreso…', 'info');
    const snap = await getDoc(doc(_fbDb, 'progress', uid));

    // ── Caso: no existe documento en la nube ─────────────────────────
    if (!snap.exists() || !snap.data()?.state) {
      // Si hay progreso local válido, subirlo a la nube ahora
      const localAntes = _contarRespuestas(state);
      if (localAntes > 0) {
        console.log('[FB-SYNC] Nube vacía pero hay progreso local —', localAntes, 'respuestas — subiendo a la nube');
        try {
          await setDoc(doc(_fbDb, 'progress', uid), {
            state,
            attemptLog,
            updatedAt: serverTimestamp()
          });
          localStorage.setItem('quiz_progress_ts', String(Date.now()));
          fbToast('☁️ Progreso local subido a la nube', 'success');
        } catch (e) {
          console.error('[FB-SYNC] Error subiendo progreso local a nube vacía:', e.message);
          fbToast('⚠️ No se pudo subir el progreso a la nube', 'error');
        }
      } else {
        fbToast('☁️ Primera vez: sin progreso guardado aún', 'info');
      }
      try { localStorage.removeItem('quiz_beforeunload_pending'); } catch (_) {}
      return;
    }

    const data     = snap.data();
    const cloudTs  = data.updatedAt?.toMillis?.() || 0;
    const localTs  = parseInt(localStorage.getItem('quiz_progress_ts') || '0', 10);

    // ── Contar respuestas de cada fuente ──────────────────────────────
    const cloudAnswers = _contarRespuestas(data.state);
    const localAnswers = _contarRespuestas(state);

    // ── Detectar si el usuario cerró la pestaña con respuestas sin sincronizar ──
    const hayPendienteLocal = localStorage.getItem('quiz_beforeunload_pending') === '1';

    console.log('[FB-SYNC] cloudTs=%d localTs=%d | cloud=%d resps, local=%d resps | pendiente=%s',
      cloudTs, localTs, cloudAnswers, localAnswers, hayPendienteLocal);

    // ── Regla de merge: usar la fuente MÁS COMPLETA ──────────────────
    // Criterio 1: si hay flag de beforeunload pendiente Y el local tiene ≥ respuestas que la nube → local gana
    // Criterio 2: si la nube tiene MÁS respuestas que el local → nube gana (independientemente del timestamp)
    // Criterio 3: si tienen igual cantidad de respuestas → timestamp decide
    // En todos los casos: nunca se sobreescribe progreso real con un state vacío.

    let usarNube;
    if (cloudAnswers === 0 && localAnswers > 0) {
      // Nube vacía, local tiene datos → preservar local y subir a nube
      usarNube = false;
      console.warn('[FB-SYNC] Nube tiene state vacío pero local tiene progreso — preservando local');
    } else if (hayPendienteLocal && localAnswers >= cloudAnswers) {
      // El usuario cerró la pestaña con progreso no sincronizado y el local es igual o más completo
      usarNube = false;
      console.log('[FB-SYNC] beforeunload_pending: local tiene', localAnswers, 'vs nube', cloudAnswers, '— preservando local');
    } else if (cloudAnswers > localAnswers) {
      // La nube tiene más respuestas → siempre ganar, sin importar el timestamp
      usarNube = true;
      console.log('[FB-SYNC] Nube más completa (', cloudAnswers, 'vs', localAnswers, ') → usando nube');
    } else {
      // Misma cantidad (o local tiene más) → el timestamp desempata
      // Fix v22: si localTs > cloudTs el local gana (estado reparado manualmente tiene ts futuro)
      usarNube = cloudTs > localTs;
      console.log('[FB-SYNC] Misma cantidad de respuestas → timestamp decide → cloudTs=%d localTs=%d usarNube=%s', cloudTs, localTs, usarNube);
    }

    if (usarNube) {
      // ── Aplicar progreso de la nube ───────────────────────────────
      state      = data.state;
      attemptLog = data.attemptLog || [];
      // Cerrar todas las explicaciones al cargar progreso (login/recarga)
      Object.keys(state).forEach(sid => {
        if (state[sid] && state[sid].explanationShown) state[sid].explanationShown = {};
      });
      localStorage.setItem(STORAGE_KEY,    JSON.stringify(state));
      localStorage.setItem(ATTEMPT_LOG_KEY, JSON.stringify(attemptLog));
      localStorage.setItem('quiz_progress_ts', String(cloudTs));
      window._fbCloudUpdatedAt = cloudTs;
      fbToast('☁️ Progreso cargado desde la nube (' + cloudAnswers + ' respuestas)', 'success');
    } else {
      // ── El local es la fuente de verdad — subir a la nube ────────
      // En vez de esperar al logout, subir ahora para no arriesgar otra pérdida
      if (localAnswers > 0) {
        console.log('[FB-SYNC] Local gana con', localAnswers, 'respuestas — subiendo a la nube de inmediato');
        try {
          window._fbSyncInProgress = true;
          await setDoc(doc(_fbDb, 'progress', uid), {
            state,
            attemptLog,
            updatedAt: serverTimestamp()
          });
          const nuevoTs = Date.now();
          localStorage.setItem('quiz_progress_ts', String(nuevoTs));
          window._fbCloudUpdatedAt = nuevoTs;
          setTimeout(() => { window._fbSyncInProgress = false; }, 200);
          fbToast('📱 Progreso local subido a la nube (' + localAnswers + ' respuestas)', 'success');
        } catch (e) {
          window._fbSyncInProgress = false;
          console.error('[FB-SYNC] Error subiendo progreso local:', e.message);
          fbToast('📱 Progreso local más reciente — se sincronizará al cerrar sesión', 'info');
        }
      } else {
        fbToast('📱 Sin cambios locales pendientes', 'info');
      }
    }

    // Limpiar el flag de pendiente en todos los casos — ya fue procesado
    try { localStorage.removeItem('quiz_beforeunload_pending'); } catch (_) {}

  } catch (e) {
    console.error('[FB-SYNC] Error en fbSyncProgressFromCloud:', e);
    fbToast('❌ Error leyendo Firestore: ' + (e.code || e.message), 'error');
    try { localStorage.removeItem('quiz_beforeunload_pending'); } catch (_) {}
  }
}

function fbSaveProgressToCloud() {
  console.log('[FB-SYNC] fbSaveProgressToCloud() llamada — _currentUser=' + !!_currentUser + ', _fbDb=' + !!_fbDb + ', __fb=' + !!window.__fb + ', _fbSyncInProgress=' + window._fbSyncInProgress);
  if (!_currentUser || !window.__fb) {
    console.warn('[FB-SYNC] ABORTADO: falta _currentUser o __fb');
    return;
  }
  if (!_fbDb) {
    console.warn('[FB-SYNC] ABORTADO: _fbDb es null/undefined');
    return;
  }
  // No guardar si estamos procesando un sync entrante (evita el ciclo A->nube->A)
  if (window._fbSyncInProgress) {
    console.warn('[FB-SYNC] ABORTADO: _fbSyncInProgress=true');
    return;
  }

  const { doc, setDoc, serverTimestamp } = window.__fb;

  // Marcar que somos nosotros quienes escribimos, para ignorar el eco del snapshot
  window._fbSyncInProgress = true;
  console.log('[FB-SYNC] Escribiendo en Firestore progress/' + _currentUser.uid + ' — state keys:', Object.keys(state));

  setDoc(doc(_fbDb, 'progress', _currentUser.uid), {
    state,
    attemptLog,
    updatedAt: serverTimestamp()
  })
    .then(function() {
      console.log('[FB-SYNC] OK: Progreso guardado en Firestore');
      localStorage.setItem('quiz_progress_ts', String(Date.now()));
      // Sin toast en guardado automático (ocurre cada 1.5s — sería molesto para el usuario)
      // Liberar el flag en 200ms (suficiente para que llegue el eco del snapshot local)
      setTimeout(function() { window._fbSyncInProgress = false; }, 200);
    })
    .catch(function(e) {
      window._fbSyncInProgress = false;
      console.error('[FB-SYNC] ERROR al guardar:', e.code, e.message);
      if (e.code === 'permission-denied') {
        fbToast('Sin permisos para guardar el progreso en la nube', 'error');
      }
    });
}

  // Asignar AQUÍ, dentro del IIFE y justo después de definir la función,
  // para que saveJSON() siempre la encuentre aunque se llame antes de fbInit()
  window._fbSaveProgressToCloud = fbSaveProgressToCloud;

  // saveJSON ya incluye sincronización con Firestore (ver definición arriba)

  // ── Arranque ─────────────────────────────────────────────────
  // Esperar a que los módulos Firebase estén disponibles
  function fbWaitAndInit() {
    if (window.__firebase_app && window.__firebase_auth && window.__firebase_firestore) {
      fbInit();
    } else {
     // Escuchar el evento en lugar de hacer polling con setTimeout
    document.addEventListener('firebaseReady', () => fbInit(), { once: true });
    }
  }

  // Quitar el shield: elimina la clase fb-cargando del body y hace fade-out del div
  function quitarLoadingShield() {
    document.body.classList.remove('fb-cargando');
    const shield = document.getElementById('fb-loading-shield');
    if (!shield) return;
    shield.classList.add('fade-out');
    setTimeout(() => shield.remove(), 320);
  }

  // El login lo muestra onAuthStateChanged una única vez.
  // mostrarLoginInmediato() fue eliminado para evitar el doble render
  // que causaba que los botones quedaran sin función en algunos dispositivos.

  fbWaitAndInit();

  // Safety net: si Firebase no resuelve en 10s, quitar el shield.
  // Solo mostrar el login si el overlay todavía no está visible
  // (evita el bucle de re-render en dispositivos con red lenta).
  setTimeout(() => {
    quitarLoadingShield();
    if (!_currentUser) {
      const ov = document.getElementById('fb-auth-overlay');
      if (!ov || ov.style.display !== 'flex') {
        fbShowAuthScreen('login');
      }
    }
  }, 10000);

  window.fbLogout        = fbLogout;
  window.fbShowAdminPanel = fbShowAdminPanel;

  // ════════════════════════════════════════════════════════════════
  // MÓDULO: MODO "EDITAR RESPUESTAS"
  // Permite al admin cambiar qué opción es correcta directamente
  // desde el cuestionario, con selector Correcta / Incorrecta.
  // No disponible en el simulacro.
  // ════════════════════════════════════════════════════════════════


  function fbToggleModoEditarRespuestas() {
    if (!fbIsAdmin()) return;
    _modoEditarRespuestas = !_modoEditarRespuestas;
    const btn = document.getElementById('li-edit-respuestas');
    if (btn) btn.textContent = _modoEditarRespuestas
      ? '✅ Salir de Edición' : '✏️ Editar Respuestas';
    fbRenderEditRespuestasOverlays();
  }

  function fbRenderEditRespuestasOverlays() {
    document.querySelectorAll('.fb-edit-resp-overlay').forEach(el => el.remove());
    if (!_modoEditarRespuestas) return;

    const seccionId = currentSection;
    if (!seccionId || seccionId === 'simulador') return;
    const preguntas = preguntasPorSeccion[seccionId] || [];

    // Inyectar estilos del modo edición si no existen
    if (!document.getElementById('fb-edit-resp-styles')) {
      const s = document.createElement('style');
      s.id = 'fb-edit-resp-styles';
      s.textContent = `
        .fb-edit-resp-overlay {
          margin-top: 12px;
          border-radius: 12px;
          overflow: hidden;
          border: 1.5px solid rgba(251,191,36,0.3);
          box-shadow: 0 2px 12px rgba(251,191,36,0.08);
        }
        .fb-edit-resp-header {
          background: linear-gradient(135deg,rgba(251,191,36,0.18),rgba(251,191,36,0.08));
          padding: 8px 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid rgba(251,191,36,0.2);
        }
        .fb-edit-resp-header span {
          color: #fbbf24;
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .fb-edit-resp-body {
          padding: 10px 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          background: rgba(15,23,42,0.5);
        }
        .fb-edit-resp-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 7px 10px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.05);
          background: rgba(255,255,255,0.02);
          transition: background 0.15s;
        }
        .fb-edit-resp-row:hover { background: rgba(255,255,255,0.04); }
        .fb-edit-resp-row.es-correcta {
          background: rgba(16,185,129,0.08);
          border-color: rgba(16,185,129,0.25);
        }
        .fb-edit-resp-optext {
          font-size: 0.83rem;
          color: #cbd5e1;
          flex: 1;
          line-height: 1.4;
        }
        .fb-edit-resp-optext.correcta { color: #34d399; font-weight: 600; }
        .fb-edit-resp-select {
          padding: 5px 10px 5px 8px;
          border-radius: 8px;
          border: 1.5px solid rgba(251,191,36,0.35);
          background: #1e293b;
          color: #f1f5f9;
          font-size: 0.82rem;
          cursor: pointer;
          min-width: 130px;
          appearance: none;
          -webkit-appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23fbbf24' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 8px center;
          padding-right: 28px;
          transition: border-color 0.15s;
          font-weight: 600;
        }
        .fb-edit-resp-select:hover { border-color: rgba(251,191,36,0.7); }
        .fb-edit-resp-select option[value="1"] { color: #34d399; }
        .fb-edit-resp-select option[value="0"] { color: #94a3b8; }
        .fb-edit-resp-saving {
          font-size: 0.72rem; color: #fbbf24;
          animation: fbPulse 0.8s ease infinite alternate;
        }
        @keyframes fbPulse { from{opacity:0.4} to{opacity:1} }
      `;
      document.head.appendChild(s);
    }

    preguntas.forEach((preg, qIndex) => {
      const puntajeEl = document.getElementById(`puntaje-${seccionId}-${qIndex}`);
      if (!puntajeEl) return;
      const pregDiv = puntajeEl.closest('.pregunta');
      if (!pregDiv) return;

      // Ocultar botón ✏️ Editar en modo editar respuestas
      pregDiv.querySelectorAll('button').forEach(btn => {
        if (btn.textContent.trim().startsWith('✏️ Editar')) btn.style.display = 'none';
      });

      const wrap = document.createElement('div');
      wrap.className = 'fb-edit-resp-overlay';

      const header = document.createElement('div');
      header.className = 'fb-edit-resp-header';
      header.innerHTML = '<span>✏️ Modo edición — Pregunta ' + (qIndex + 1) + '</span>';
      wrap.appendChild(header);

      const body = document.createElement('div');
      body.className = 'fb-edit-resp-body';

      preg.opciones.forEach((op, i) => {
        const esCorrecta = preg.correcta && preg.correcta.includes(i);
        const row = document.createElement('div');
        row.className = 'fb-edit-resp-row' + (esCorrecta ? ' es-correcta' : '');

        const opText = document.createElement('span');
        opText.className = 'fb-edit-resp-optext' + (esCorrecta ? ' correcta' : '');
        opText.textContent = (esCorrecta ? '✔ ' : '') + String.fromCharCode(65 + i) + '. ' + op;
        row.appendChild(opText);

        const savingSpan = document.createElement('span');
        savingSpan.className = 'fb-edit-resp-saving';
        savingSpan.style.display = 'none';
        savingSpan.textContent = 'Guardando…';

        const sel = document.createElement('select');
        sel.className = 'fb-edit-resp-select';
        sel.style.borderColor = esCorrecta ? 'rgba(16,185,129,0.6)' : 'rgba(251,191,36,0.35)';
        sel.style.color = esCorrecta ? '#34d399' : '#94a3b8';

        const optCorrecta = document.createElement('option');
        optCorrecta.value = '1'; optCorrecta.textContent = '✔ Correcta';
        const optIncorrecta = document.createElement('option');
        optIncorrecta.value = '0'; optIncorrecta.textContent = '✗ Incorrecta';
        if (esCorrecta) optCorrecta.selected = true;
        else optIncorrecta.selected = true;
        sel.appendChild(optCorrecta);
        sel.appendChild(optIncorrecta);

        sel.onchange = async () => {
          const ahora = parseInt(sel.value) === 1;
          if (ahora) {
            preg.correcta = [i];
          } else {
            preg.correcta = (preg.correcta || []).filter(c => c !== i);
          }
          // Actualizar UI visual de todas las filas de esta pregunta
          body.querySelectorAll('.fb-edit-resp-row').forEach((r, ri) => {
            const esC = preg.correcta.includes(ri);
            r.className = 'fb-edit-resp-row' + (esC ? ' es-correcta' : '');
            const t = r.querySelector('.fb-edit-resp-optext');
            if (t) {
              t.className = 'fb-edit-resp-optext' + (esC ? ' correcta' : '');
              const letra = String.fromCharCode(65 + ri);
              t.textContent = (esC ? '✔ ' : '') + letra + '. ' + preg.opciones[ri];
            }
            const s2 = r.querySelector('.fb-edit-resp-select');
            if (s2) {
              s2.style.borderColor = esC ? 'rgba(16,185,129,0.6)' : 'rgba(251,191,36,0.35)';
              s2.style.color = esC ? '#34d399' : '#94a3b8';
              s2.value = esC ? '1' : '0';
            }
          });
          // Guardar en Firestore
          if (window.__fb && _currentUser) {
            savingSpan.style.display = 'inline';
            try {
              const { doc, setDoc, serverTimestamp } = window.__fb;
              await setDoc(doc(_fbDb, 'questions', `${seccionId}_${qIndex + 1}`), {
                seccionId, qIndex: qIndex + 1,
                correcta  : preg.correcta,
                updatedAt : serverTimestamp(),
                updatedBy : _currentUser.uid
              }, { merge: true });
              savingSpan.style.display = 'none';
              fbToast(`✅ Preg. ${qIndex+1} — respuesta correcta actualizada`, 'success');
              // Notificar a todos los clientes via onSnapshot
              await _bumpContentVersion(seccionId, qIndex, preg.correcta);
            } catch(e) {
              savingSpan.style.display = 'none';
              fbToast(`❌ Error al guardar: ${e.message}`, 'error');
            }
          }
        };

        row.appendChild(sel);
        row.appendChild(savingSpan);
        body.appendChild(row);
      });

      wrap.appendChild(body);
      pregDiv.appendChild(wrap);
    });
  }

  // Agregar botón "Editar Respuestas" al menú si es admin
  function fbAddEditRespuestasButton() {
    if (!fbIsAdmin()) return;
    if (document.getElementById('li-edit-respuestas')) return;
    const ul = document.querySelector('#menu-principal .columna:last-child ul');
    if (!ul) return;
    const li = document.createElement('li');
    li.id = 'li-edit-respuestas';
    li.textContent = '✏️ Editar Respuestas';
    li.style.cssText = [
      'background:linear-gradient(135deg,rgba(251,191,36,0.12),rgba(251,191,36,0.06)) !important',
      'border:1px solid rgba(251,191,36,0.25) !important',
      'color:#fbbf24 !important','font-weight:700 !important'
    ].join(';');
    li.onclick = fbToggleModoEditarRespuestas;
    ul.appendChild(li);
  }

  // Hook: activar overlays al entrar a un cuestionario
  const _origShowSection = window.mostrarCuestionario;
  window.mostrarCuestionario = function(seccionId) {
    if (_origShowSection) _origShowSection(seccionId);
    if (_modoEditarRespuestas && seccionId !== 'simulador') {
      setTimeout(() => fbRenderEditRespuestasOverlays(), 500);
    }
  };

  // Extender fbUpdateAdminButton: agregar botón editar respuestas además del admin
  // Guardamos referencia ANTES de redefinir para evitar recursión
  const _origFbUpdateAdmin = fbUpdateAdminButton.bind({});
  window.fbUpdateAdminButton = function fbUpdateAdminButtonExtended() {
    if (!_currentUserData) return;
    fbShowUserBar();
    if (_currentUserData.role !== 'admin') return;
    if (!document.getElementById('li-admin-btn')) {
      const ul = document.querySelector('#menu-principal .columna:last-child ul');
      if (ul) {
        const li = document.createElement('li');
        li.id = 'li-admin-btn';
        li.className = 'li-admin';
        li.textContent = '⚙️ ADMIN';
        li.onclick = () => fbShowAdminPanel();
        ul.appendChild(li);
      }
    }
    fbAddEditRespuestasButton();
    // Activar editores de contenido/explicaciones solo si es admin (primera vez)
    if (window._buildEditoresAdminPendiente) {
      window._buildEditoresAdminPendiente = false;
      buildEditorExplicaciones();
      buildEditorContenido();
    }
  };

  window.fbToggleModoEditarRespuestas = fbToggleModoEditarRespuestas;

  // ════════════════════════════════════════════════════════════════
  // MÓDULO 0: SINCRONIZACIÓN DE CONTENIDO EN TIEMPO REAL
  // ════════════════════════════════════════════════════════════════
  // LÓGICA:
  //   - Admin guarda cualquier edición → llama _bumpContentVersion()
  //     que escribe {version: timestamp} en Firestore meta/contentVersion.
  //   - Todos los clientes (incluso el admin) tienen un onSnapshot sobre
  //     ese único documento liviano.
  //   - Cuando cambia → se invalida la caché de esa sección, se recargan
  //     las preguntas desde Firestore y se recalifica al usuario si corresponde.
  //   - Costo: 1 lectura/usuario al conectarse + 1 lectura/usuario por cada
  //     edición del admin. Con 3 usuarios y 20 ediciones/día = ~63 lecturas/día
  //     sobre 50.000 disponibles. Impacto mínimo.

  let _contentVersionUnsubscribe = null;
  let _contentVersionUnsubscribes = []; // listeners por sección (subidas incrementales)

  // ── Escribe la nueva versión en Firestore al guardar cualquier edición ──
  async function _bumpContentVersion(seccionId, qIndex, nuevaCorrecta, opciones = {}) {
    if (!window.__fb || !_fbDb) return;
    try {
      const { doc, setDoc, serverTimestamp } = window.__fb;
      const esSubidaNueva    = opciones.startIdx !== undefined && opciones.startIdx !== null;
      const esEdicionPuntual = opciones.esEdicionPuntual === true;
      const docId = esSubidaNueva
        ? 'contentVersion_' + seccionId
        : 'contentVersion';
      await setDoc(doc(_fbDb, 'meta', docId), {
        version         : Date.now(),
        seccionId,
        qIndex          : qIndex ?? null,
        nuevaCorrecta   : nuevaCorrecta ?? null,
        startIdx        : opciones.startIdx ?? null,
        esEdicionPuntual: esEdicionPuntual,
        // Datos embebidos: el cliente los aplica directamente (0 lecturas extra a Firestore)
        preguntaData    : opciones.preguntaData ?? null,
        updatedAt       : serverTimestamp()
      });
      console.log('[CONTENT-SYNC] Versión actualizada → sección:', seccionId,
        esSubidaNueva    ? '| subida incremental desde idx:' + opciones.startIdx :
        esEdicionPuntual ? '| edición puntual embebida (0 lecturas en clientes)' :
                           '| edición');
    } catch (e) {
      console.warn('[CONTENT-SYNC] Error al actualizar versión:', e.message);
    }
  }

  // ── Recalifica una pregunta ya respondida si cambió la correcta ──
  function _recalificarPregunta(seccionId, qIndex, nuevaCorrecta) {
    const s = state[seccionId];
    if (!s || !s.graded || !s.graded[qIndex]) return; // no respondida aún
    if (!nuevaCorrecta || !Array.isArray(nuevaCorrecta)) return;

    const shuffleMap = s.shuffleMap && s.shuffleMap[qIndex]; // mapa mixed→original
    const respuestasUsuario = s.answers[qIndex] || [];       // índices que eligió el usuario

    // Convertir respuestas del usuario (índices mezclados) a índices originales
    let respuestasOriginales;
    if (shuffleMap) {
      respuestasOriginales = respuestasUsuario.map(mixedIdx => {
        const entry = Object.entries(shuffleMap).find(([, orig]) => orig === mixedIdx);
        return entry ? parseInt(entry[0]) : mixedIdx;
      });
    } else {
      respuestasOriginales = respuestasUsuario.slice();
    }

    // Determinar si el usuario acertó con la nueva clave
    const acerto = nuevaCorrecta.every(c => respuestasOriginales.includes(c)) &&
                   respuestasOriginales.every(r => nuevaCorrecta.includes(r));

    const eraCorrecta = s.graded[qIndex] === true;
    if (acerto === eraCorrecta) return; // no cambió nada para este usuario

    // Actualizar el estado
    s.graded[qIndex] = acerto;
    saveJSON(STORAGE_KEY, state);

    // Actualizar el puntaje visual si la pregunta está renderizada
    const puntajeEl = document.getElementById(`puntaje-${seccionId}-${qIndex}`);
    if (puntajeEl) {
      // Repintar el div de la pregunta completo
      const pregDiv = puntajeEl.closest('.pregunta');
      if (pregDiv) {
        pregDiv.classList.remove('correcta', 'incorrecta');
        pregDiv.classList.add(acerto ? 'correcta' : 'incorrecta');
      }
      // Actualizar el ícono ✅/❌
      const checkEl = pregDiv?.querySelector('.check-respuesta');
      if (checkEl) checkEl.textContent = acerto ? '✅' : '❌';
    }

    const msg = acerto
      ? '✅ ¡Tu respuesta es ahora correcta! El admin corrigió la pregunta.'
      : '❌ Tu respuesta quedó incorrecta tras la corrección del admin.';
    fbToast(msg, acerto ? 'success' : 'info');
    console.log(`[CONTENT-SYNC] Preg. ${qIndex + 1} de "${seccionId}" recalificada → ${acerto ? 'CORRECTA' : 'INCORRECTA'}`);
  }

  // ── Invalida caché de una sección y recarga en segundo plano ──
  async function _invalidarYRecargarSeccion(seccionId, qIndex, nuevaCorrecta) {
    // 🔒 Si la sección está siendo cargada ahora mismo, no interrumpir
    if (_seccionesEnCarga.has(seccionId)) {
      console.log('[CONTENT-SYNC] Ignorando invalidación: sección en carga activa para', seccionId);
      return;
    }
    // Si ya fue cargada pero el usuario NO la está viendo ahora:
    // solo limpiar el caché para que la próxima entrada traiga datos frescos.
    // Si SÍ la está viendo: continuar y rerenderizar en tiempo real (ver paso 4 abajo).
    if (_seccionesYaCargadas.has(seccionId) && currentSection !== seccionId) {
      console.log('[CONTENT-SYNC] Sección cargada pero no visible → limpiando caché para próxima entrada:', seccionId);
      try { localStorage.removeItem('fb_q_cache_'    + seccionId); } catch (_) {}
      try { localStorage.removeItem('fb_edits_cache_' + seccionId); } catch (_) {}
      _seccionesYaCargadas.delete(seccionId);
      if (window.preguntasPorSeccion) delete window.preguntasPorSeccion[seccionId];
      window._extrapolacionAplicada = false;
      return;
    }
    // ── PASO 1: Capturar estado visual ANTES de tocar nada ──────────────────────
    // Hacerlo aquí garantiza que los índices del DOM todavía son válidos.
    const _estaViendo = (currentSection === seccionId);
    const scrollAntes = _estaViendo
      ? (window.pageYOffset || document.documentElement.scrollTop)
      : 0;

    // Capturar orden visual de las sin responder desde el DOM (antes de borrar el array)
    let _unansweredOrdenDOM = [];
    if (_estaViendo && state[seccionId]) {
      const _cont0 = document.getElementById(`cuestionario-${seccionId}`);
      if (_cont0) {
        const _s0 = state[seccionId];
        _cont0.querySelectorAll('[id^="puntaje-' + seccionId + '-"]').forEach(el => {
          const idx = parseInt(el.id.replace(`puntaje-${seccionId}-`, ''), 10);
          if (!isNaN(idx) && (!_s0.graded || !_s0.graded[idx])) _unansweredOrdenDOM.push(idx);
        });
      }
    }

    // Capturar selecciones en curso (opciones marcadas pero no confirmadas)
    const _seleccionesEnCurso = {};
    if (_estaViendo && state[seccionId]) {
      const _contSel = document.getElementById(`cuestionario-${seccionId}`);
      const _sSel    = state[seccionId];
      const _pregsSel = window.preguntasPorSeccion?.[seccionId] || [];
      _pregsSel.forEach((_, idx) => {
        if (_sSel.graded && _sSel.graded[idx]) return;
        const inputs  = Array.from(document.getElementsByName(`pregunta${seccionId}${idx}`));
        const marcados = inputs.map((inp, i) => inp.checked ? i : null).filter(v => v !== null);
        if (marcados.length > 0) _seleccionesEnCurso[idx] = marcados;
      });
    }

    // ── PASO 2: Limpiar caché e invalidar sección ─────────────────────────────
    try { localStorage.removeItem('fb_q_cache_'    + seccionId); } catch (_) {}
    try { localStorage.removeItem('fb_edits_cache_' + seccionId); } catch (_) {}
    _seccionesYaCargadas.delete(seccionId);
    if (window.preguntasPorSeccion) delete window.preguntasPorSeccion[seccionId];

    // ── PASO 3: Recargar preguntas frescas desde Firestore ───────────────────
    await cargarSeccion(seccionId);
    // Nota: la extrapolación fue eliminada en v9 — no se llama aplicarExtrapolacion.

    // ── PASO 4: Recalificar si cambió la respuesta correcta ──────────────────
    if (qIndex !== null && qIndex !== undefined && nuevaCorrecta) {
      _recalificarPregunta(seccionId, qIndex, nuevaCorrecta);
    }

    // ── PASO 5: Re-renderizar si el usuario está viendo la sección ───────────
    if (_estaViendo) {
      _scrollOnNextRender = false;

      // Cerrar explicaciones abiertas
      if (state[seccionId] && state[seccionId].explanationShown) {
        state[seccionId].explanationShown = {};
      }

      // Preservar el orden de las sin responder tras la edición del admin.
      // FIX: el paginador solo renderiza la página activa, por lo que _unansweredOrdenDOM
      // contiene SOLO las pendientes visibles en pantalla. Reemplazar directamente
      // unansweredOrder con ese array borraría el orden de las pendientes de las otras
      // páginas, forzando una re-aleatorización en el próximo getDisplayOrder.
      // Solución: FUSIONAR — las pendientes del DOM (página visible) mantienen su orden
      // relativo, y las pendientes de las demás páginas (ya en unansweredOrder) se
      // insertan al final en su orden previo, excluyendo las que ya fueron respondidas.
      if (state[seccionId]) {
        const _s      = state[seccionId];
        const _graded = _s.graded || {};

        if (_unansweredOrdenDOM.length > 0) {
          // Índices visibles en el DOM que siguen sin responder
          const _domSet = new Set(_unansweredOrdenDOM);

          // Del unansweredOrder anterior conservar solo los que NO están en el DOM
          // (son las páginas no visibles) y que además siguen sin responder
          const _restoPaginas = (_s.unansweredOrder || []).filter(
            i => !_domSet.has(i) && !_graded[i]
          );

          // Resultado: primero las del DOM (orden visual preservado), luego el resto
          _s.unansweredOrder = [..._unansweredOrdenDOM, ..._restoPaginas];
        } else {
          // No hay pendientes en el DOM (página completamente respondida o sección no visible).
          // Limpiar solo los índices ya respondidos del unansweredOrder existente.
          _s.unansweredOrder = (_s.unansweredOrder || []).filter(i => !_graded[i]);
        }

        saveJSON(STORAGE_KEY, state);
      }

      // Renderizar — generarCuestionario llama getDisplayOrder que usa las anclas
      // de docId+texto para ubicar las respondidas en su lugar correcto
      (window.generarCuestionario || generarCuestionario)(seccionId);

      // Restaurar selecciones en curso y scroll DESPUÉS de que todos los chunks terminen.
      // Usamos un flag en el contenedor para saber cuándo terminó el último chunk.
      const _contFinal = document.getElementById(`cuestionario-${seccionId}`);
      const _esperarRender = (cb) => {
        if (!_contFinal) { cb(); return; }
        // Observar hasta que el spinner de carga desaparezca (indica fin de chunks)
        const _obs = new MutationObserver(() => {
          if (!_contFinal.querySelector('.chunk-progress')) {
            _obs.disconnect();
            cb();
          }
        });
        _obs.observe(_contFinal, { childList: true, subtree: true });
        // Fallback: si no hay spinner (pocas preguntas), ejecutar en el próximo frame
        requestAnimationFrame(() => {
          if (!_contFinal.querySelector('.chunk-progress')) {
            _obs.disconnect();
            cb();
          }
        });
      };

      _esperarRender(() => {
        // Restaurar selecciones en curso
        if (Object.keys(_seleccionesEnCurso).length > 0) {
          Object.entries(_seleccionesEnCurso).forEach(([idx, marcados]) => {
            const inputs = Array.from(document.getElementsByName(`pregunta${seccionId}${idx}`));
            marcados.forEach(i => { if (inputs[i]) inputs[i].checked = true; });
          });
        }
        // Restaurar scroll exactamente donde estaba
        window.scrollTo({ top: scrollAntes, behavior: 'instant' });
      });

      fbToast('📥 Contenido actualizado por el admin', 'info');
    }

    console.log('[CONTENT-SYNC] Sección recargada:', seccionId);
  }





  // ════════════════════════════════════════════════════════════════
  // CHEQUEO DE VERSIÓN AL ARRANCAR
  // Compara la versión local de cada sección en caché contra
  // meta/contentVersion_{seccion} en Firestore.
  // Si hay diferencia → invalida el caché para que la próxima entrada
  // descargue todo limpio desde Firestore (sin lógica incremental).
  // Costo: 1 lectura por sección en caché al arrancar.
  // ════════════════════════════════════════════════════════════════
  async function _chequearVersionesAlArrancar() {
    if (!window.__firebase_firestore || !_fbDb) return;
    const { doc, getDoc, collection, getDocs, query, where, orderBy } = window.__firebase_firestore;

    // Obtener todas las secciones que el usuario tiene en caché local
    let seccionesEnCache = [];
    try {
      seccionesEnCache = Object.keys(localStorage)
        .filter(k => k.startsWith(PREGUNTAS_CACHE_PREFIX))
        .map(k => k.replace(PREGUNTAS_CACHE_PREFIX, ''));
    } catch (_) { return; }

    if (seccionesEnCache.length === 0) return;

    console.log('[VERSION-CHECK] Chequeando', seccionesEnCache.length, 'secciones en caché…');

    for (const seccionId of seccionesEnCache) {
      try {
        // 1 lectura: leer el "cartelito" de la sección
        const snap = await getDoc(doc(_fbDb, 'meta', 'contentVersion_' + seccionId));
        if (!snap.exists()) continue;

        const data       = snap.data();
        const version    = data.version  ?? null;
        const startIdx   = data.startIdx ?? null;

        // Versión que el usuario ya conoce (guardada en su localStorage)
        let versionConocida = null;
        try { versionConocida = localStorage.getItem(_CONTENT_VERSION_KEY + '_' + seccionId); } catch (_) {}

        const hayNovedades = version && String(version) !== String(versionConocida);
        if (!hayNovedades) {
          console.log('[VERSION-CHECK] Sin cambios en', seccionId);
          continue;
        }

        // Hay novedades — ver desde qué índice
        console.log('[VERSION-CHECK] Novedades en', seccionId, '| startIdx:', startIdx);

        // Hay novedades (subida nueva O edición): siempre invalidar caché.
        // La carga incremental causaba acumulación de preguntas repetidas en cada recarga.
        // Al invalidar, la próxima entrada a la sección baja todo limpio desde Firestore.
        try {
          localStorage.removeItem(PREGUNTAS_CACHE_PREFIX + seccionId);
          if (window.preguntasPorSeccion) delete window.preguntasPorSeccion[seccionId];
          _seccionesYaCargadas.delete(seccionId);
        } catch (_) {}
        console.log('[VERSION-CHECK] Cambio detectado en', seccionId, '— caché invalidado, se descargaá fresco al próximo acceso');

        // Guardar versión conocida para no volver a chequear hasta la próxima subida
        try { localStorage.setItem(_CONTENT_VERSION_KEY + '_' + seccionId, String(version)); } catch (_) {}

      } catch (err) {
        console.warn('[VERSION-CHECK] Error chequeando', seccionId, ':', err.message);
      }
    }

    console.log('[VERSION-CHECK] Chequeo completo.');
  }

  // ════════════════════════════════════════════════════════════════
  // PARCHE PUNTUAL DE EDICIÓN — batch de hasta 30 preguntas por consulta
  // Descarga solo los documentos questions/{seccionId}_{qIndex} editados
  // usando whereIn (1 consulta por cada 30 preguntas).
  // Costo: ceil(N/30) lecturas por usuario, en vez de recargar toda la sección.
  // ════════════════════════════════════════════════════════════════
  function _chunkArray(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
    return chunks;
  }

  // Update quirúrgico: toca solo los nodos DOM de la pregunta editada.
  // No re-renderiza el cuestionario completo — preserva scroll, selecciones y explicaciones abiertas.
  function _updatePreguntaEnDOM(seccionId, qIndex, ed) {
    const puntajeEl = document.getElementById(`puntaje-${seccionId}-${qIndex}`);
    if (!puntajeEl) return; // la pregunta no está visible en pantalla

    const pregDiv = puntajeEl.closest('.pregunta');
    if (!pregDiv) return;

    // 1. Enunciado — el h3 es el elemento que contiene el texto de la pregunta
    //    (no existe .enunciado-texto en este sistema — se usa directamente h3)
    if (ed.pregunta !== undefined) {
      const h3El = pregDiv.querySelector('h3');
      if (h3El) {
        // Preservar el número de posición que está al inicio del h3 (ej: "42. ")
        const textoCompleto = h3El.textContent || '';
        const match = textoCompleto.match(/^(\d+\.\s*)/);
        const prefijo = match ? match[1] : '';
        h3El.textContent = prefijo + ed.pregunta;
      }
    }

    // 2. Opciones — solo si la pregunta no fue respondida aún
    //    Las labels tienen el texto directamente como nodo de texto (después del input)
    const sState = state[seccionId];
    const yaRespondida = sState?.graded?.[qIndex];
    if (!yaRespondida && ed.opciones !== undefined) {
      const inputs = Array.from(document.getElementsByName(`pregunta${seccionId}${qIndex}`));
      inputs.forEach((inp, mixedIdx) => {
        const label = inp.closest('label') || inp.parentElement;
        if (!label) return;
        // El texto de la opción es un nodo de texto suelto dentro del label (después del input)
        const nodoTexto = Array.from(label.childNodes)
          .find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
        const originalIdx = parseInt(inp.getAttribute('data-original-index') ?? mixedIdx, 10);
        if (nodoTexto && ed.opciones[originalIdx] !== undefined) {
          nodoTexto.textContent = ' ' + ed.opciones[originalIdx];
        }
      });
    }

    // 3. Explicación — solo si está abierta en este momento
    //    FIX: actualizar solo el div interno de texto, no reemplazar el contenedor entero.
    //    Así se preservan los estilos del contenedor (.explicacion-contenedor) que controlan
    //    el ancho y box-sizing de las imágenes.
    if (ed.explicacion !== undefined) {
      const explContainer = document.getElementById(`explicacion-${seccionId}-${qIndex}`);
      if (explContainer && explContainer.style.display !== 'none') {
        // Buscar el div de texto dentro del contenedor (segundo hijo, después del <strong>)
        const textoDiv = explContainer.querySelector('div');
        if (textoDiv) {
          const htmlDetectado = /<(p|b|i|u|br|img|strong|em)[^>]*>/i.test(ed.explicacion);
          if (htmlDetectado) {
            textoDiv.innerHTML = ed.explicacion
              .replace(/<p>\s*<\/p>/g, '')
              .replace(/\n/g, '<br>')
              .trim();
          } else {
            textoDiv.textContent = ed.explicacion;
          }
          // Aplicar estilos de imagen dentro del div de texto también
          textoDiv.querySelectorAll('img').forEach(img => {
            img.style.maxWidth  = '100%';
            img.style.width     = 'auto';
            img.style.height    = 'auto';
            img.style.display   = 'block';
            img.style.boxSizing = 'border-box';
          });
        }
        if (typeof window.fbInjectVacunasButtonIfAdmin === 'function') {
          window.fbInjectVacunasButtonIfAdmin(seccionId, explContainer);
        }
      }
      // Actualizar también el dataset (por si la pregunta tenía/no tenía explicación antes)
      if (explContainer) {
        explContainer.dataset.tieneContenido = (ed.explicacion && ed.explicacion.trim()) ? '1' : '0';
      }
      // Actualizar el botón de explicación si la pregunta no estaba abierta
      const btnExpl = document.getElementById(`btn-explicacion-${seccionId}-${qIndex}`);
      if (btnExpl && (!explContainer || explContainer.style.display === 'none')) {
        const tieneContenido = ed.explicacion && ed.explicacion.trim();
        btnExpl.textContent = tieneContenido ? 'Ver explicación' : '➕ Agregar explicación';
      }
    }

    // 4. Destello sutil de borde celeste para que el usuario note el cambio
    pregDiv.style.transition  = 'box-shadow 0.4s ease, border-color 0.4s ease';
    pregDiv.style.boxShadow   = '0 0 0 2px rgba(56,189,248,0.55)';
    pregDiv.style.borderColor = 'rgba(56,189,248,0.45)';
    setTimeout(() => {
      pregDiv.style.boxShadow   = '';
      pregDiv.style.borderColor = '';
    }, 1800);
  }

  async function _aplicarEdicionPuntual(seccionId, qIndexes, nuevasCorrectas, datosEmbebidos = null) {
    if (!_fbDb) return;
    const indices = Array.isArray(qIndexes) ? qIndexes : [qIndexes];
    if (indices.length === 0) return;

    try {
      let edicionesDescargadas = [];

      // ── CAMINO RÁPIDO: datos embebidos en el snapshot (0 lecturas a Firestore) ──
      // El admin guarda → los datos viajan dentro del propio meta/contentVersion
      // → el cliente los aplica directamente al DOM en < 1 segundo.
      if (datosEmbebidos && indices.length === 1) {
        edicionesDescargadas = [{ qIndex: indices[0] + 1, ...datosEmbebidos }];
        console.log('[EDIT-PATCH] Usando datos embebidos del snapshot (0 lecturas a Firestore)');
      } else {
        // ── CAMINO NORMAL: descargar desde Firestore (botón Forzar actualización) ──
        if (!window.__fb) return;
        const { collection, query, where, getDocs } = window.__fb;
        const lotes = _chunkArray(indices, 30);
        for (const lote of lotes) {
          const loteBase1 = lote.map(i => i + 1);
          const q = query(
            collection(_fbDb, 'questions'),
            where('seccionId', '==', seccionId),
            where('qIndex', 'in', loteBase1)
          );
          const snap = await getDocs(q);
          snap.forEach(d => edicionesDescargadas.push(d.data()));
        }
      }

      if (edicionesDescargadas.length === 0) {
        console.warn('[EDIT-PATCH] Ningún dato encontrado para', seccionId, indices);
        return;
      }

      // ── Parchar en memoria (ed.qIndex base 1 → array base 0) ──
      edicionesDescargadas.forEach(ed => {
        const idx = ed.qIndex - 1;
        if (window.preguntasPorSeccion?.[seccionId]?.[idx]) {
          const p = window.preguntasPorSeccion[seccionId][idx];
          if (ed.pregunta    !== undefined) p.pregunta    = ed.pregunta;
          if (ed.opciones    !== undefined) p.opciones    = ed.opciones;
          if (ed.correcta    !== undefined) p.correcta    = ed.correcta;
          if (ed.explicacion !== undefined) p.explicacion = ed.explicacion;
          if (ed.imagen      !== undefined) p.imagen      = ed.imagen;
        }
      });

      // ── Parchar en caché localStorage (ed.qIndex base 1 → array base 0) ──
      try {
        const cacheKey = PREGUNTAS_CACHE_PREFIX + seccionId;
        const raw = localStorage.getItem(cacheKey);
        if (raw) {
          const cached = JSON.parse(raw);
          if (cached?.preguntas) {
            edicionesDescargadas.forEach(ed => {
              const idx = ed.qIndex - 1;
              if (!cached.preguntas[idx]) return;
              if (ed.pregunta    !== undefined) cached.preguntas[idx].pregunta    = ed.pregunta;
              if (ed.opciones    !== undefined) cached.preguntas[idx].opciones    = ed.opciones;
              if (ed.correcta    !== undefined) cached.preguntas[idx].correcta    = ed.correcta;
              if (ed.explicacion !== undefined) cached.preguntas[idx].explicacion = ed.explicacion;
              if (ed.imagen      !== undefined) cached.preguntas[idx].imagen      = ed.imagen;
            });
            cached.ts = Date.now();
            localStorage.setItem(cacheKey, JSON.stringify(cached));
          }
        }
        localStorage.removeItem('fb_edits_cache_' + seccionId);
      } catch (_) {}

      // ── Recalificar si cambió la respuesta correcta ──
      if (Array.isArray(nuevasCorrectas)) {
        nuevasCorrectas.forEach(({ qIndex, correcta }) => {
          if (correcta && Array.isArray(correcta)) _recalificarPregunta(seccionId, qIndex, correcta);
        });
      }

      // ── Actualizar el DOM ──
      if (currentSection === seccionId) {
        if (datosEmbebidos && indices.length === 1) {
          // Update quirúrgico: solo los nodos de esa pregunta.
          // El usuario no pierde scroll ni selecciones en curso.
          _updatePreguntaEnDOM(seccionId, indices[0], edicionesDescargadas[0]);
          if (typeof fbToast === 'function') fbToast('✏️ Pregunta actualizada por el admin', 'info');
        } else {
          // Lote: re-renderizar una sola vez
          if (typeof window.generarCuestionario === 'function') {
            window.generarCuestionario(seccionId);
          }
        }
      } else {
        if (typeof fbToast === 'function') fbToast(`✏️ Se actualizó una pregunta de ${seccionId}`, 'info');
      }

      const via = datosEmbebidos
        ? '0 lecturas (datos embebidos)'
        : Math.ceil(indices.length / 30) + ' consulta(s) a Firestore';
      console.log(`[EDIT-PATCH] ✅ ${edicionesDescargadas.length} pregunta(s) parcheada(s) en "${seccionId}" | ${via}`);

    } catch (e) {
      console.warn('[EDIT-PATCH] Error en parche, fallback a recarga completa:', e.message);
      _invalidarYRecargarSeccion(seccionId, null, null);
    }
  }

  // ── Registra ediciones pendientes de publicar en localStorage del admin ──
  // Formato guardado: { pediatria: [{qIndex:5, nuevaCorrecta:[2]}, ...], ginecologia: [...] }
  // El botón "Forzar actualización" lee este mapa y publica todo en 1 sola escritura.
  const _EDICIONES_PENDIENTES_KEY = 'fb_ediciones_pendientes_admin';

  function _registrarEdicionPendiente(seccionId, qIndex, nuevaCorrecta) {
    try {
      let pendientes = {};
      try { pendientes = JSON.parse(localStorage.getItem(_EDICIONES_PENDIENTES_KEY) || '{}'); } catch (_) {}
      if (!pendientes[seccionId]) pendientes[seccionId] = [];
      const entrada = { qIndex, nuevaCorrecta: nuevaCorrecta ?? null, ts: Date.now() };
      // Reemplazar si ya había edición del mismo qIndex (la más nueva prevalece)
      const existente = pendientes[seccionId].findIndex(e => e.qIndex === qIndex);
      if (existente >= 0) pendientes[seccionId][existente] = entrada;
      else pendientes[seccionId].push(entrada);
      localStorage.setItem(_EDICIONES_PENDIENTES_KEY, JSON.stringify(pendientes));
      console.log('[EDIT-PENDING] Registrada como pendiente → sección:', seccionId, '| qIndex:', qIndex);
    } catch (_) {}
  }

  // ── Inicia el listener en tiempo real sobre meta/contentVersion ──
  const _CONTENT_VERSION_KEY = 'fb_content_version_known'; // versión conocida por el cliente

  function _startContentVersionWatcher() {
    if (_contentVersionUnsubscribe) return; // ya activo
    if (!window.__firebase_firestore || !_fbDb) {
      document.addEventListener('firebaseReady', _startContentVersionWatcher, { once: true });
      return;
    }

    const { doc, onSnapshot } = window.__firebase_firestore;

    // ── Listener 1: documento único (ediciones del admin — comportamiento actual) ──
    let primeraLectura = true;
    _contentVersionUnsubscribe = onSnapshot(
      doc(_fbDb, 'meta', 'contentVersion'),
      (snap) => {
        if (!snap.exists()) { primeraLectura = false; return; }
        const data          = snap.data();
        const versionRemota = data.version       ?? null;
        const seccionId     = data.seccionId     ?? null;
        const qIndex        = data.qIndex        ?? null;
        const nuevaCorrecta = data.nuevaCorrecta ?? null;

        // Helper: despacha el cambio según si es edición puntual o forzado global
        const _despacharCambio = (motivo) => {
          const esEdicionPuntual = data.esEdicionPuntual === true;
          const qIndexes        = data.qIndexes ?? (qIndex !== null && qIndex !== undefined ? [qIndex] : []);
          const nuevasCorrectas = data.nuevasCorrectas ?? [];
          // Datos embebidos: viajan dentro del snapshot, 0 lecturas extra a Firestore
          const preguntaData    = data.preguntaData ?? null;
          if (!seccionId) return;
          if (esEdicionPuntual && qIndexes.length > 0) {
            // ✅ EFICIENTE: descarga solo las N preguntas editadas
            // ceil(N/30) consultas a Firestore, 1 sola re-renderización
            console.log(`[CONTENT-SYNC] ${motivo} → parche batch: ${qIndexes.length} pregunta(s) en "${seccionId}" | consultas: ${Math.ceil(qIndexes.length / 30)}`);
            _aplicarEdicionPuntual(seccionId, qIndexes, nuevasCorrectas, preguntaData);
          } else {
            // Forzado global o subida masiva → recargar sección completa
            console.log(`[CONTENT-SYNC] ${motivo} → forzado global: recargando "${seccionId}"`);
            _invalidarYRecargarSeccion(seccionId, qIndex, nuevaCorrecta);
          }
        };

        if (primeraLectura) {
          primeraLectura = false;
          let versionConocida = null;
          try { versionConocida = localStorage.getItem(_CONTENT_VERSION_KEY); } catch (_) {}
          const hayVersionNueva = versionRemota && String(versionRemota) !== String(versionConocida);
          console.log('[CONTENT-SYNC] Versión remota:', versionRemota, '| conocida:', versionConocida, '| cambio pendiente:', hayVersionNueva);
          if (hayVersionNueva && seccionId) {
            if (_seccionesYaCargadas.has(seccionId) || _seccionesEnCarga.has(seccionId)) {
              console.log('[CONTENT-SYNC] Primera lectura: sección ya cargada, omitiendo para', seccionId);
            } else {
              _despacharCambio('Primera lectura');
            }
          }
          try { if (versionRemota) localStorage.setItem(_CONTENT_VERSION_KEY, String(versionRemota)); } catch (_) {}
          return;
        }

        // Cambio en tiempo real (post primera lectura)
        try { if (versionRemota) localStorage.setItem(_CONTENT_VERSION_KEY, String(versionRemota)); } catch (_) {}
        _despacharCambio('Tiempo real');
      },
      (err) => { console.warn('[CONTENT-SYNC] Error en listener principal:', err.message); }
    );

    // ── Listener 2: uno por cada sección que el usuario tiene en caché ──
    // Solo escucha secciones que el usuario ya descargó — cero lecturas innecesarias
    _contentVersionUnsubscribes = _contentVersionUnsubscribes || [];
    const seccionesEnCache = [];
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith(PREGUNTAS_CACHE_PREFIX))
        .forEach(k => seccionesEnCache.push(k.replace(PREGUNTAS_CACHE_PREFIX, '')));
    } catch (_) {}

    seccionesEnCache.forEach(seccionId => {
      const unsub = onSnapshot(
        doc(_fbDb, 'meta', 'contentVersion_' + seccionId),
        (snap) => {
          if (!snap.exists()) return;
          const data       = snap.data();
          const version    = data.version  ?? null;
          const startIdx   = data.startIdx ?? null;

          // Versión conocida por sección
          let versionConocida = null;
          try { versionConocida = localStorage.getItem(_CONTENT_VERSION_KEY + '_' + seccionId); } catch (_) {}
          const esNueva = version && String(version) !== String(versionConocida);
          if (!esNueva) return;

          console.log('[CONTENT-SYNC] Subida nueva detectada → sección:', seccionId, '| startIdx:', startIdx);
          try { localStorage.setItem(_CONTENT_VERSION_KEY + '_' + seccionId, String(version)); } catch (_) {}

          // Invalidar caché y recargar la sección completa
          _invalidarYRecargarSeccion(seccionId, null, null);
        },
        (err) => { console.warn('[CONTENT-SYNC] Error en listener de', seccionId, ':', err.message); }
      );
      _contentVersionUnsubscribes.push(unsub);
    });

    console.log('[CONTENT-SYNC] Listeners activos: 1 global +', seccionesEnCache.length, 'por sección');
  }

  // ── Detiene el listener (al cerrar sesión) ──
  function _stopContentVersionWatcher() {
    if (_contentVersionUnsubscribe) {
      _contentVersionUnsubscribe();
      _contentVersionUnsubscribe = null;
    }
    if (_contentVersionUnsubscribes) {
      _contentVersionUnsubscribes.forEach(fn => { try { fn(); } catch (_) {} });
      _contentVersionUnsubscribes = [];
    }
    console.log('[CONTENT-SYNC] Todos los listeners detenidos');
  }

  // ════════════════════════════════════════════════════════════════
  // MÓDULO 1: GUARDADO INMEDIATO EN FIRESTORE (debounce 1.5s)
  // + GUARDADO INMEDIATO AL CERRAR SESIÓN / PESTAÑA
  // ════════════════════════════════════════════════════════════════
  // LÓGICA: Cada vez que saveJSON() guarda en localStorage, se programa
  // un guardado en Firestore con 1.5s de debounce.
  // Esto significa: si el usuario responde varias preguntas en ráfaga,
  // solo se hace UNA escritura en Firestore (al 1.5s de la última respuesta).
  // Resultado: progreso en la nube actualizado en 1-2 segundos por respuesta.

  let _fbSaveDebounceTimer = null;
  const FB_SAVE_DEBOUNCE_MS = 1500; // 1.5 segundos — guardado casi inmediato

  function _fbScheduleCloudSave() {
    if (!_currentUser || !window.__fb) return;
    // Si hay un timer pendiente, cancelarlo (debounce: resetear el plazo)
    if (_fbSaveDebounceTimer) clearTimeout(_fbSaveDebounceTimer);
    _fbSaveDebounceTimer = setTimeout(() => {
      _fbSaveDebounceTimer = null;
      fbSaveProgressToCloud();
    }, FB_SAVE_DEBOUNCE_MS);
  }

  // Interceptar cada llamada a saveJSON() dentro del IIFE vía el evento storage.
  // saveJSON() escribe en localStorage → dispara 'storage' en otras pestañas Y
  // también activamos _fbScheduleCloudSave directamente tras el write local.
  const _storagePatcher = function(e) {
    if (e && (e.key === STORAGE_KEY || e.key === ATTEMPT_LOG_KEY)) {
      if (_currentUser && window.__fb) _fbScheduleCloudSave();
    }
  };
  window.addEventListener('storage', _storagePatcher);

  // Parche directo: reemplazar saveJSON en el closure para capturar writes
  // de la misma pestaña (el evento 'storage' NO se dispara en la misma pestaña).
  const _origSaveJSONForCloud = saveJSON;
  saveJSON = function saveJSONInmediato(key, value) {
    _origSaveJSONForCloud(key, value);
    if ((key === STORAGE_KEY || key === ATTEMPT_LOG_KEY) && _currentUser && window.__fb) {
      _fbScheduleCloudSave();
    }
  };
  // Exponer para módulos que usen window.saveJSON
  window._saveJSONConCloud = saveJSON;
  window._fbOnSaveJSON = function(key) {
    if ((key === STORAGE_KEY || key === ATTEMPT_LOG_KEY) && _currentUser) {
      _fbScheduleCloudSave();
    }
  };

  // Guardar INMEDIATAMENTE al cerrar pestaña/ventana
  window.addEventListener('beforeunload', () => {
    // No podemos ejecutar operaciones async en beforeunload,
    // pero sí podemos sellar el estado en localStorage y dejar
    // una marca para que el próximo login lo suba a Firestore.
    if (!_currentUser) return; // Sin sesión activa no hay nada que preservar

    // 1. Cancelar el debounce pendiente (lo vamos a manejar nosotros)
    if (_fbSaveDebounceTimer) {
      clearTimeout(_fbSaveDebounceTimer);
      _fbSaveDebounceTimer = null;
    }

    try {
      // 2. Sellar el estado más completo disponible en localStorage.
      //    Comparar state en memoria vs. localStorage y guardar el que tenga más respuestas.
      const localRaw  = localStorage.getItem(STORAGE_KEY);
      const localState = localRaw ? JSON.parse(localRaw) : {};
      const memAnswers   = Object.values(state).reduce((n, s) => n + Object.keys(s?.graded || {}).length, 0);
      const localAnswers = Object.values(localState).reduce((n, s) => n + Object.keys(s?.graded || {}).length, 0);
      const bestState = memAnswers >= localAnswers ? state : localState;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bestState));

      // 3. Avanzar quiz_progress_ts a NOW para que en el próximo login
      //    la lógica de comparación elija el local sobre la nube
      //    (la nube se sincronizará desde este local al volver a entrar).
      const tsAhora = Date.now();
      localStorage.setItem('quiz_progress_ts', String(tsAhora));

      // 4. Marcar que hay progreso local pendiente de subir a Firestore
      localStorage.setItem('quiz_beforeunload_pending', '1');

      console.log('[BEFOREUNLOAD] Estado sellado en localStorage —', Object.keys(bestState).length, 'secciones,', Math.max(memAnswers, localAnswers), 'respuestas');
    } catch (_) {
      // Si localStorage falla (cuota excedida, etc.) no podemos hacer nada más
    }
  });

  // ════════════════════════════════════════════════════════════════
  // MÓDULO 2: PANTALLA DE CARGA PROFESIONAL AL SINCRONIZAR PROGRESO
  // ════════════════════════════════════════════════════════════════

  function _fbInjectLoadingStyles() {
    if (document.getElementById('fb-progress-loading-styles')) return;
    const s = document.createElement('style');
    s.id = 'fb-progress-loading-styles';
    s.textContent = `
      #fb-progress-loading-overlay {
        position: fixed;
        inset: 0;
        z-index: 99992;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 18px;
        background: linear-gradient(135deg, #0a1628 0%, #0d2444 55%, #071220 100%);
        animation: fbPlFadeIn 0.22s ease both;
        font-family: 'Segoe UI', system-ui, sans-serif;
      }
      @keyframes fbPlFadeIn { from{opacity:0} to{opacity:1} }
      .fb-pl-logo {
        width: 58px; height: 58px;
        border-radius: 16px;
        background: linear-gradient(135deg, #0891b2, #0d7490);
        display: flex; align-items: center; justify-content: center;
        font-size: 1.8rem;
        box-shadow: 0 8px 28px rgba(8,145,178,0.45);
        margin-bottom: 6px;
        animation: fbPlLogoBounce 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both;
      }
      @keyframes fbPlLogoBounce {
        from { opacity:0; transform:scale(0.7) translateY(10px); }
        to   { opacity:1; transform:scale(1) translateY(0); }
      }
      .fb-pl-spinner {
        width: 46px; height: 46px;
        border: 4px solid rgba(8,145,178,0.18);
        border-top-color: #0891b2;
        border-radius: 50%;
        animation: fbPlSpin 0.72s linear infinite;
      }
      @keyframes fbPlSpin { to { transform: rotate(360deg); } }
      .fb-pl-title {
        color: #f1f5f9;
        font-size: 1.05rem;
        font-weight: 700;
        letter-spacing: -0.01em;
        animation: fbPlFadeUp 0.4s ease 0.15s both;
      }
      .fb-pl-sub {
        color: #475569;
        font-size: 0.82rem;
        margin-top: -8px;
        animation: fbPlFadeUp 0.4s ease 0.25s both;
      }
      @keyframes fbPlFadeUp {
        from { opacity:0; transform:translateY(6px); }
        to   { opacity:1; transform:translateY(0); }
      }
    `;
    document.head.appendChild(s);
  }

  function _fbShowProgressLoading() {
    _fbInjectLoadingStyles();
    if (document.getElementById('fb-progress-loading-overlay')) return;
    const el = document.createElement('div');
    el.id = 'fb-progress-loading-overlay';
    el.innerHTML = `
      <div class="fb-pl-logo">🩺</div>
      <div class="fb-pl-spinner"></div>
      <div class="fb-pl-title">Cargando tu progreso…</div>
      <div class="fb-pl-sub">Sincronizando con la nube</div>
    `;
    document.body.appendChild(el);
  }

  function _fbHideProgressLoading() {
    const el = document.getElementById('fb-progress-loading-overlay');
    if (!el) return;
    el.style.transition = 'opacity 0.28s ease';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }

  // Envolver fbSyncProgressFromCloud para mostrar/ocultar overlay
  const _origFbSync = fbSyncProgressFromCloud;
  fbSyncProgressFromCloud = async function fbSyncProgressFromCloudConOverlay() {
    _fbShowProgressLoading();
    try {
      await _origFbSync();
    } finally {
      _fbHideProgressLoading();
      // Disparar evento para iniciar módulos de sesión/heartbeat/inactividad
      document.dispatchEvent(new CustomEvent('fb:usuarioAprobadoActivo'));
    }
  };

  // ════════════════════════════════════════════════════════════════
  // MÓDULO 3: SESIÓN ÚNICA POR DISPOSITIVO
  // ════════════════════════════════════════════════════════════════
  // LÓGICA: "el último en registrarse gana, siempre".
  //   - sessionStorage: cada pestaña/ventana/dispositivo tiene su propio deviceId único.
  //   - Al cargar, SIEMPRE escribimos nuestro deviceId en Firestore (sessions/{uid}).
  //   - Todas las instancias escuchan ese doc con onSnapshot.
  //   - Si el deviceId en Firestore cambia (otra pestaña/dispositivo se registró),
  //     mostramos el modal y cerramos la sesión.
  //   - El primer disparo del snapshot (fromCache o nuestro propio write) se ignora
  //     comparando fromCache y metadata.hasPendingWrites.

  let _fbSessionUnsubscribeLocal = null;

  function _fbGetOrCreateDeviceId() {
    // sessionStorage: único por pestaña/ventana. No se comparte entre pestañas.
    let id = sessionStorage.getItem('fb_device_id');
    if (!id) {
      id = 'dev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
      sessionStorage.setItem('fb_device_id', id);
    }
    return id;
  }

  async function _fbRegisterSession(uid) {
    if (!window.__fb || !_fbDb) return;
    // Admin está exento del bloqueo por sesión duplicada
    if (_currentUser && _currentUser.email === ADMIN_EMAIL) {
      console.log('[SESSION] Admin exento del control de sesión única');
      return;
    }
    const { doc, setDoc, serverTimestamp } = window.__fb;
    const deviceId = _fbGetOrCreateDeviceId();

    try {
      // Siempre sobreescribir: el último en registrarse es el dueño legítimo.
      // Cualquier otra instancia que estaba activa verá el cambio vía onSnapshot
      // y recibirá el modal de expulsión.
      await setDoc(doc(_fbDb, 'sessions', uid), {
        deviceId,
        registeredAt: serverTimestamp(),
        updatedAt   : serverTimestamp()
      });
      console.log('[SESSION] Sesion registrada - deviceId:', deviceId);
      _fbEscucharSesion(uid, deviceId);
    } catch (e) {
      console.warn('[SESSION] Error al registrar sesion:', e.message);
    }
  }

  function _fbEscucharSesion(uid, myDeviceId) {
    // Admin exento: no escuchar cambios de sesión
    if (_currentUser && _currentUser.email === ADMIN_EMAIL) return;
    const { doc, onSnapshot } = window.__fb;
    if (_fbSessionUnsubscribeLocal) _fbSessionUnsubscribeLocal();

    // Ignoramos el primer snapshot que llega desde caché local o con escrituras pendientes
    // (ese es nuestro propio write). Solo reaccionamos a cambios confirmados del servidor
    // que tengan un deviceId diferente al nuestro.
    _fbSessionUnsubscribeLocal = onSnapshot(
      doc(_fbDb, 'sessions', uid),
      { includeMetadataChanges: true },
      (snap) => {
        if (!snap.exists() || !_currentUser) return;

        const meta = snap.metadata;
        // Ignorar eventos que vienen de caché local o que aún tienen escrituras pendientes
        if (meta.fromCache || meta.hasPendingWrites) return;

        const data     = snap.data();
        const myDevice = sessionStorage.getItem('fb_device_id');

        if (data.deviceId && data.deviceId !== myDevice) {
          console.warn('[SESSION] Sesion desplazada por otro dispositivo:', data.deviceId);
          if (_fbSessionUnsubscribeLocal) {
            _fbSessionUnsubscribeLocal();
            _fbSessionUnsubscribeLocal = null;
          }
          _fbMostrarModalSesionDuplicada();
        }
      }
    );
  }

  // Logout silencioso: se usa cuando la sesión fue desplazada por otro dispositivo.
  // Guardamos en Firestore si había un debounce pendiente (respuestas recientes sin sincronizar)
  // ANTES de hacer el signOut, para no perder el progreso del usuario en este dispositivo.
  async function _fbLogoutSilencioso() {
    // Si hay un guardado pendiente por debounce, ejecutarlo ahora mientras _currentUser es válido
    if (_fbSaveDebounceTimer) {
      clearTimeout(_fbSaveDebounceTimer);
      _fbSaveDebounceTimer = null;
      try { await new Promise(resolve => {
        const { doc, setDoc, serverTimestamp } = window.__fb;
        setDoc(doc(_fbDb, 'progress', _currentUser.uid), {
          state,
          attemptLog,
          updatedAt: serverTimestamp()
        }).then(() => {
          localStorage.setItem('quiz_progress_ts', String(Date.now()));
          resolve();
        }).catch(() => resolve()); // no bloquear el logout si falla
      }); } catch (_) {}
    }
    try {
      if (_progressUnsubscribe) { _progressUnsubscribe(); _progressUnsubscribe = null; }
      const { fbSignOut } = window.__fb;
      await fbSignOut(_fbAuth);
    } catch (_) {}
    document.getElementById('fb-user-bar')?.remove();
    document.getElementById('li-admin-btn')?.remove();
    document.getElementById('li-edit-respuestas')?.remove();
    document.getElementById('fb-admin-panel')?.remove();
    state = {};
    attemptLog = [];
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
    try { localStorage.removeItem(ATTEMPT_LOG_KEY); } catch (_) {}
    try { localStorage.removeItem(TIMER_STORAGE_KEY); } catch (_) {}
    try { localStorage.removeItem(SCROLL_POSITION_KEY); } catch (_) {}
    try { localStorage.removeItem(LAST_SECTION_KEY); } catch (_) {}
    // Limpiar el timestamp de progreso para que el próximo login
    // no descarte la nube por creer que el local es más reciente.
    try { localStorage.removeItem('quiz_progress_ts'); } catch (_) {}
    try { localStorage.removeItem('quiz_beforeunload_pending'); } catch (_) {}
    _seccionesYaCargadas.clear();
    if (window.preguntasPorSeccion) window.preguntasPorSeccion = {};
    window._fbCurrentUser = null;
    window._fbCurrentUserData = null;
    _currentUser = null;
    _currentUserData = null;
  }

  function _fbMostrarModalSesionDuplicada() {
    _fbInjectSessionStyles();
    if (document.getElementById('fb-modal-sesion-duplicada')) return;

    const overlay = document.createElement('div');
    overlay.id = 'fb-modal-sesion-duplicada';
    overlay.innerHTML = `
      <div class="fbsd-caja">
        <div class="fbsd-icono">⚠️</div>
        <div class="fbsd-titulo">Sesión abierta en otro lugar</div>
        <div class="fbsd-mensaje">
          Tu cuenta fue iniciada en otro dispositivo o pestaña.<br>
          Por seguridad, esta sesión se cerrará automáticamente.<br>
          <span style="font-size:0.82rem;color:#94a3b8;">Tu progreso ya está guardado en la nube.</span>
        </div>
        <div class="fbsd-countdown" id="fbsd-countdown">30</div>
        <button class="fbsd-btn" id="fbsd-btn-cerrar">Entendido — Cerrar sesión</button>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('fbsd-btn-cerrar').onclick = () => {
      overlay.remove();
      _fbLogoutSilencioso();
    };

    // Cuenta regresiva de 30 segundos
    let segs = 30;
    const cdEl = document.getElementById('fbsd-countdown');
    const cdInterval = setInterval(() => {
      segs--;
      if (cdEl) cdEl.textContent = segs;
      if (segs <= 0) {
        clearInterval(cdInterval);
        overlay.remove();
        _fbLogoutSilencioso();
      }
    }, 1000);
  }

  function _fbInjectSessionStyles() {
    if (document.getElementById('fb-session-styles')) return;
    const s = document.createElement('style');
    s.id = 'fb-session-styles';
    s.textContent = `
      #fb-modal-sesion-duplicada {
        position: fixed; inset: 0; z-index: 200000;
        display: flex; align-items: center; justify-content: center;
        background: rgba(10,22,40,0.88);
        backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
        padding: 20px; font-family: 'Segoe UI', system-ui, sans-serif;
      }
      #fb-modal-sesion-duplicada .fbsd-caja {
        background: rgba(15,23,42,0.97);
        border: 1px solid rgba(239,68,68,0.3);
        border-radius: 22px; padding: 42px 40px 34px;
        max-width: 420px; width: 100%; text-align: center;
        box-shadow: 0 32px 80px rgba(0,0,0,0.6);
        animation: fbsdIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both;
        /* Glassmorphism */
        backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      }
      @keyframes fbsdIn {
        from { opacity:0; transform:scale(0.88) translateY(20px); }
        to   { opacity:1; transform:scale(1) translateY(0); }
      }
      #fb-modal-sesion-duplicada .fbsd-icono {
        font-size: 3rem; margin-bottom: 16px; display: block;
      }
      #fb-modal-sesion-duplicada .fbsd-titulo {
        color: #f1f5f9; font-size: 1.3rem; font-weight: 800;
        margin-bottom: 12px; letter-spacing: -0.02em;
      }
      #fb-modal-sesion-duplicada .fbsd-mensaje {
        color: #94a3b8; font-size: 0.9rem; line-height: 1.65; margin-bottom: 20px;
      }
      #fb-modal-sesion-duplicada .fbsd-countdown {
        display: inline-flex; align-items: center; justify-content: center;
        width: 46px; height: 46px; border-radius: 50%;
        background: rgba(239,68,68,0.15);
        border: 2px solid rgba(239,68,68,0.4);
        color: #fca5a5; font-size: 1.3rem; font-weight: 800;
        margin-bottom: 20px;
        animation: fbsdPulse 1s ease infinite;
      }
      @keyframes fbsdPulse {
        0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.3); }
        50%     { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
      }
      #fb-modal-sesion-duplicada .fbsd-btn {
        width: 100%; padding: 13px; border: none; border-radius: 11px;
        background: linear-gradient(135deg, #dc2626, #b91c1c);
        color: #fff; font-size: 0.95rem; font-weight: 700; cursor: pointer;
        box-shadow: 0 4px 16px rgba(220,38,38,0.35);
        transition: all 0.18s ease; letter-spacing: 0.01em;
      }
      #fb-modal-sesion-duplicada .fbsd-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(220,38,38,0.45);
      }
    `;
    document.head.appendChild(s);
  }

  // ════════════════════════════════════════════════════════════════
  // MÓDULO 4: HEARTBEAT (lastActivity cada 60 segundos)
  // Pausa cuando la pestaña no es visible
  // ════════════════════════════════════════════════════════════════

  let _fbHeartbeatIntervalLocal = null;

  async function _fbSendHeartbeat() {
    if (!_currentUser || !window.__fb || !_fbDb) return;
    if (document.hidden) return; // Pestaña oculta → no gastar lecturas/escrituras

    try {
      const { doc, updateDoc, serverTimestamp } = window.__fb;
      await updateDoc(doc(_fbDb, 'sessions', _currentUser.uid), {
        lastActivity: serverTimestamp()
      });
    } catch (_) {
      // Silencioso: puede fallar si el doc de sesión no existe aún
    }
  }

  function _fbStartHeartbeat() {
    if (_fbHeartbeatIntervalLocal) return;
    _fbHeartbeatIntervalLocal = setInterval(_fbSendHeartbeat, 60 * 1000);
    console.log('[HEARTBEAT] Iniciado');

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('[HEARTBEAT] Pestaña visible → enviando heartbeat');
        _fbSendHeartbeat();
      }
    });
  }

  function _fbStopHeartbeat() {
    if (_fbHeartbeatIntervalLocal) {
      clearInterval(_fbHeartbeatIntervalLocal);
      _fbHeartbeatIntervalLocal = null;
    }
  }

  // ════════════════════════════════════════════════════════════════
  // MÓDULO 5: CIERRE POR INACTIVIDAD (30 min, NO para admin)
  // Avisos a 20 min, 25 min, 29 min — botón "SEGUIR USANDO"
  // ════════════════════════════════════════════════════════════════

  const _INACT_MAX      = 30 * 60 * 1000;
  const _INACT_AVISO_1  = 20 * 60 * 1000; // 20 min → aviso "quedan 10 min"
  const _INACT_AVISO_2  = 25 * 60 * 1000; // 25 min → aviso "quedan 5 min"
  const _INACT_AVISO_3  = 29 * 60 * 1000; // 29 min → aviso "queda 1 min" + cuenta regresiva 60s

  let _inactTimers    = { t1: null, t2: null, t3: null, cierre: null };
  let _inactCdInterval = null;
  const _INACT_EVENTS = ['mousemove', 'click', 'keydown', 'touchstart', 'scroll'];

  function _inactReset() {
    // Cerrar modal de aviso si está abierto
    const m = document.getElementById('fb-modal-inactividad');
    if (m) m.remove();
    if (_inactCdInterval) { clearInterval(_inactCdInterval); _inactCdInterval = null; }

    // Cancelar timers anteriores
    Object.values(_inactTimers).forEach(t => t && clearTimeout(t));

    // Programar nuevos timers
    _inactTimers.t1    = setTimeout(() => _inactAviso(10, false), _INACT_AVISO_1);
    _inactTimers.t2    = setTimeout(() => _inactAviso(5, false),  _INACT_AVISO_2);
    _inactTimers.t3    = setTimeout(() => _inactAviso(1, true),   _INACT_AVISO_3);
    _inactTimers.cierre = setTimeout(() => _inactCerrar(),         _INACT_MAX);
  }

  function _inactStart() {
    if (_currentUserData?.role === 'admin') return; // Nunca para admin
    _INACT_EVENTS.forEach(ev => window.addEventListener(ev, _inactReset, { passive: true }));
    _inactReset();
    console.log('[INACTIVIDAD] Watcher iniciado (30 min)');
  }

  function _inactStop() {
    _INACT_EVENTS.forEach(ev => window.removeEventListener(ev, _inactReset));
    Object.values(_inactTimers).forEach(t => t && clearTimeout(t));
    _inactTimers = { t1: null, t2: null, t3: null, cierre: null };
    if (_inactCdInterval) { clearInterval(_inactCdInterval); _inactCdInterval = null; }
    document.getElementById('fb-modal-inactividad')?.remove();
  }

  function _inactAviso(minsRestantes, conCuentaRegresiva) {
    if (_currentUserData?.role === 'admin') return;
    if (!_currentUser) return;

    _fbInjectInactividadStyles();
    document.getElementById('fb-modal-inactividad')?.remove();
    if (_inactCdInterval) { clearInterval(_inactCdInterval); _inactCdInterval = null; }

    const overlay = document.createElement('div');
    overlay.id = 'fb-modal-inactividad';
    const tiempoStr = minsRestantes === 1 ? '1 minuto' : `${minsRestantes} minutos`;

    overlay.innerHTML = `
      <div class="fbinact-caja">
        <div class="fbinact-icono">${minsRestantes <= 1 ? '🚨' : '⏰'}</div>
        <div class="fbinact-titulo">${minsRestantes <= 1 ? '¡Sesión a punto de cerrarse!' : 'Aviso de inactividad'}</div>
        <div class="fbinact-mensaje">
          Tu sesión se cerrará en <strong>${tiempoStr}</strong> por inactividad.
          ${conCuentaRegresiva ? '<br><span class="fbinact-cd" id="fbinact-cd">60</span>' : ''}
        </div>
        <button class="fbinact-btn" id="fbinact-btn-seguir">✋ SEGUIR USANDO</button>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('fbinact-btn-seguir').onclick = () => {
      overlay.remove();
      if (_inactCdInterval) { clearInterval(_inactCdInterval); _inactCdInterval = null; }
      _inactReset();
    };

    if (conCuentaRegresiva) {
      let segs = 60;
      _inactCdInterval = setInterval(() => {
        segs--;
        const cdEl = document.getElementById('fbinact-cd');
        if (cdEl) cdEl.textContent = segs;
        if (segs <= 0) { clearInterval(_inactCdInterval); _inactCdInterval = null; }
      }, 1000);
    }
  }

  function _inactCerrar() {
    if (_currentUserData?.role === 'admin') return;
    if (!_currentUser) return;
    console.log('[INACTIVIDAD] Cerrando sesión por inactividad (30 min)');
    _inactStop();
    // Usar window.fbLogout para pasar por fbLogoutConModulos,
    // que garantiza que el progreso pendiente se guarda antes del signOut.
    window.fbLogout();
  }

  function _fbInjectInactividadStyles() {
    if (document.getElementById('fb-inactividad-styles')) return;
    const s = document.createElement('style');
    s.id = 'fb-inactividad-styles';
    s.textContent = `
      #fb-modal-inactividad {
        position: fixed; inset: 0; z-index: 150000;
        display: flex; align-items: center; justify-content: center;
        background: rgba(10,22,40,0.78);
        backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
        padding: 20px; font-family: 'Segoe UI', system-ui, sans-serif;
        animation: fbInactIn 0.25s ease both;
      }
      @keyframes fbInactIn { from{opacity:0} to{opacity:1} }
      #fb-modal-inactividad .fbinact-caja {
        background: rgba(15,23,42,0.97);
        /* Glassmorphism */
        backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
        border: 1px solid rgba(255,255,255,0.09);
        border-radius: 24px; padding: 44px 40px 36px;
        max-width: 420px; width: 100%; text-align: center;
        box-shadow: 0 32px 80px rgba(0,0,0,0.55),
                    0 0 0 1px rgba(255,255,255,0.04),
                    inset 0 1px 0 rgba(255,255,255,0.06);
        animation: fbInactEntrada 0.38s cubic-bezier(0.34,1.56,0.64,1) both;
      }
      @keyframes fbInactEntrada {
        from { opacity:0; transform:scale(0.88) translateY(24px); }
        to   { opacity:1; transform:scale(1) translateY(0); }
      }
      #fb-modal-inactividad .fbinact-icono {
        font-size: 3rem; margin-bottom: 18px; display: block;
        animation: fbInactIcono 0.42s cubic-bezier(0.34,1.56,0.64,1) 0.1s both;
      }
      @keyframes fbInactIcono {
        from { opacity:0; transform:scale(0.4) rotate(-12deg); }
        to   { opacity:1; transform:scale(1) rotate(0); }
      }
      #fb-modal-inactividad .fbinact-titulo {
        color: #f1f5f9; font-size: 1.28rem; font-weight: 800;
        margin-bottom: 14px; letter-spacing: -0.02em;
      }
      #fb-modal-inactividad .fbinact-mensaje {
        color: #94a3b8; font-size: 0.92rem; line-height: 1.65; margin-bottom: 26px;
      }
      #fb-modal-inactividad .fbinact-mensaje strong { color: #fbbf24; }
      #fb-modal-inactividad .fbinact-cd {
        display: inline-flex; align-items: center; justify-content: center;
        width: 50px; height: 50px; border-radius: 50%;
        background: rgba(220,38,38,0.18);
        border: 2px solid rgba(220,38,38,0.42);
        color: #fca5a5; font-size: 1.4rem; font-weight: 800;
        font-variant-numeric: tabular-nums;
        margin: 10px auto 0; animation: fbInactCdPulse 1s ease infinite;
      }
      @keyframes fbInactCdPulse {
        0%,100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.3); }
        50%     { box-shadow: 0 0 0 10px rgba(220,38,38,0); }
      }
      #fb-modal-inactividad .fbinact-btn {
        width: 100%; padding: 14px 20px; border: none; border-radius: 12px;
        background: linear-gradient(135deg, #0891b2, #0d7490);
        color: #fff; font-size: 1rem; font-weight: 800;
        cursor: pointer; letter-spacing: 0.06em; text-transform: uppercase;
        box-shadow: 0 4px 20px rgba(8,145,178,0.42),
                    inset 0 1px 0 rgba(255,255,255,0.15);
        transition: all 0.2s ease;
      }
      #fb-modal-inactividad .fbinact-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 28px rgba(8,145,178,0.52), inset 0 1px 0 rgba(255,255,255,0.15);
      }
      #fb-modal-inactividad .fbinact-btn:active { transform: translateY(0); }
    `;
    document.head.appendChild(s);
  }

  // ════════════════════════════════════════════════════════════════
  // INTEGRACIÓN: Arrancar/parar módulos con el ciclo de vida de auth
  // ════════════════════════════════════════════════════════════════

  // Cuando el usuario está aprobado y su progreso cargó, iniciamos todo
  // La extrapolación de preguntas desde exámenes únicos/UBA/compilados hacia especialidades
  // fue ELIMINADA en v9. Cada especialidad solo contiene sus propias preguntas.
  window._fuentesExtrapolacionListas = Promise.resolve(); // compatibilidad: resuelve inmediatamente

  document.addEventListener('fb:usuarioAprobadoActivo', () => {
    if (!_currentUser || !_currentUserData) return;
    // Registrar sesión única
    _fbRegisterSession(_currentUser.uid);
    // Iniciar heartbeat
    _fbStartHeartbeat();
    // Iniciar watcher de inactividad (no para admin)
    _inactStart();
    // Iniciar sincronización de contenido en tiempo real (todos los usuarios, incluso admin)
    _startContentVersionWatcher();
    // Chequear si hay preguntas nuevas desde la última visita (incremental, sin borrar caché)
    _chequearVersionesAlArrancar();
    // NOTA: quiz_beforeunload_pending se limpia dentro de fbSyncProgressFromCloud
    // (que ya fue llamado antes de disparar este evento), por lo que NO lo limpiamos aquí.

    console.log('[MÓDULOS FB] Sesión única, heartbeat, inactividad y content-sync activos');
  });

  // Limpiar módulos al cerrar sesión: parchamos fbLogout para que también detenga módulos
  // fbLogout ya está definido arriba en el IIFE; lo envolvemos
  const _fbLogoutOriginal = window.fbLogout;
  window.fbLogout = async function fbLogoutConModulos() {
    // 1. Si hay un guardado de progreso pendiente en debounce, ejecutarlo AHORA
    //    (no simplemente cancelarlo — eso perdería el último progreso)
    if (_fbSaveDebounceTimer) {
      clearTimeout(_fbSaveDebounceTimer);
      _fbSaveDebounceTimer = null;
      // Forzar el guardado en Firestore AHORA con await — evita race condition
      // donde el setDoc llega después del signOut y falla con permission-denied.
      if (_currentUser && _fbDb && window.__fb) {
        try {
          const { doc, setDoc, serverTimestamp } = window.__fb;
          await setDoc(doc(_fbDb, 'progress', _currentUser.uid), {
            state,
            attemptLog,
            updatedAt: serverTimestamp()
          });
          localStorage.setItem('quiz_progress_ts', String(Date.now()));
          console.log('[FB-LOGOUT] Debounce pendiente guardado antes del signOut');
        } catch (e) {
          console.error('[FB-LOGOUT] Error guardando debounce pendiente:', e.message);
        }
      }
    }
    // 2. Detener sesión única
    if (_fbSessionUnsubscribeLocal) {
      _fbSessionUnsubscribeLocal();
      _fbSessionUnsubscribeLocal = null;
    }
    // 3. Detener heartbeat
    _fbStopHeartbeat();
    // 4. Detener watcher de inactividad
    _inactStop();
    // 5. Detener sincronización de contenido en tiempo real
    _stopContentVersionWatcher();
    // 6. Limpiar flag de beforeunload
    try { localStorage.removeItem('quiz_beforeunload_pending'); } catch (_) {}
    // 6b. Esperar a que termine cualquier setDoc en vuelo antes del signOut
    if (window._fbSyncInProgress) {
      await new Promise(resolve => {
        const check = setInterval(() => {
          if (!window._fbSyncInProgress) { clearInterval(check); resolve(); }
        }, 50);
        setTimeout(() => { clearInterval(check); resolve(); }, 2000); // máximo 2s de espera
      });
      console.log('[FB-LOGOUT] Esperó a que terminara el setDoc en vuelo antes del signOut');
    }
    // 7. Ejecutar logout original (que ya guarda en Firestore)
    await _fbLogoutOriginal();
  };

  // Exponer para uso desde index.html si fuera necesario
  window._fbStartHeartbeat   = _fbStartHeartbeat;
  window._fbStopHeartbeat    = _fbStopHeartbeat;
  window._inactReset         = _inactReset;
  window._inactStop          = _inactStop;

  // ════════════════════════════════════════════════════════════════
  // MÓDULO: CONSOLIDACIÓN SECUENCIAL DE PROGRESO
  // ════════════════════════════════════════════════════════════════
  // Cuando el usuario "soloquimicayaruqui" tiene preguntas respondidas
  // dispersas (consecuencia de un bug anterior al borrar/reclasificar),
  // este módulo permite reordenar el progreso de forma que todas las
  // respondidas queden compactadas al inicio.
  //
  // También muestra un toast informativo cuando el usuario responde
  // una pregunta fuera de la secuencia activa (en una página no contigua).
  // ════════════════════════════════════════════════════════════════

  const EMAIL_COADMIN_CONSOLIDACION = 'soloquimicayaruqui@gmail.com';

  /**
   * Retorna la "posición secuencial" de un índice respondido:
   * cuántas preguntas respondidas hay antes de él en el displayOrder de la sección.
   * Útil para mostrar "tu pregunta pasó a ser la #N".
   */
  function _posicionSecuencialEnRespondidas(seccionId, qIndex) {
    const s = state[seccionId];
    if (!s || !s.answeredOrder) return -1;
    const posicion = s.answeredOrder.findIndex(e =>
      (typeof e === 'number' ? e : e.idx) === qIndex
    );
    return posicion; // 0-based, -1 si no está
  }

  /**
   * Detecta si el usuario respondió en una página "fuera de secuencia":
   * Si hay páginas intermedias sin completar entre la última página llena
   * de respondidas y la página donde acaba de responder.
   *
   * Devuelve { fueraDeSecuencia, paginaSecuencial, numeroFinal } o null.
   */
  function _detectarFueraDeSecuencia(seccionId, qIndex) {
    // Solo para cuestionarios paginados (especialidades)
    const n = (window.preguntasPorSeccion?.[seccionId] || []).length;
    if (n <= 50) return null;

    const s = state[seccionId];
    if (!s) return null;

    const SK = window.STORAGE_KEY || 'quiz_state_v3';
    let graded = {};
    try { graded = (JSON.parse(localStorage.getItem(SK) || '{}')[seccionId] || {}).graded || {}; } catch (_) {}

    // Calcular displayOrder actual
    const displayOrder = getDisplayOrder(seccionId, n);
    const totalRespondidas = Object.keys(graded).filter(k => graded[k]).length;

    // Página donde está esta pregunta respondida en el displayOrder actual
    const posEnDisplay = displayOrder.indexOf(qIndex);
    if (posEnDisplay === -1) return null;

    const PAGE_SIZE = 50;
    const paginaDeLaPregunta = Math.floor(posEnDisplay / PAGE_SIZE);

    // Última página completamente llena de respondidas
    let ultimaPaginaLlena = -1;
    const totalPages = Math.ceil(n / PAGE_SIZE);
    for (let p = 0; p < totalPages; p++) {
      const desde = p * PAGE_SIZE;
      const hasta = Math.min(desde + PAGE_SIZE, n);
      const indicesDePagina = displayOrder.slice(desde, hasta);
      const todasRespondidas = indicesDePagina.every(i => graded[i]);
      if (todasRespondidas) ultimaPaginaLlena = p;
      else break;
    }

    // La página secuencial es la siguiente a la última completamente llena
    const paginaSecuencial = ultimaPaginaLlena + 1;

    // Si la pregunta está en la página secuencial o antes, no está fuera de secuencia
    if (paginaDeLaPregunta <= paginaSecuencial) return null;

    return {
      fueraDeSecuencia: true,
      paginaSecuencial: paginaSecuencial + 1,    // 1-based para el usuario
      numeroPreguntaEnSecuencia: totalRespondidas // posición en el bloque de respondidas
    };
  }

  /**
   * Muestra un toast informativo cuando se detecta que se respondió
   * fuera de la secuencia activa.
   */
  function _notificarConsolidacion(info) {
    if (!info || !info.fueraDeSecuencia) return;
    const msg = `📌 Pregunta respondida → reubicada en pág. ${info.paginaSecuencial} como #${info.numeroPreguntaEnSecuencia}`;
    if (typeof window.fbToast === 'function') {
      window.fbToast(msg, 'info');
    } else if (typeof fbToast === 'function') {
      fbToast(msg, 'info');
    }
  }

  /**
   * Inyecta en la barra de usuario un botón "🔧 Reordenar progreso"
   * solo para el usuario coadmin con preguntas dispersas.
   * Al presionarlo, compacta el answeredOrder de todas las secciones
   * y actualiza Firestore + localStorage.
   */
  function _inyectarBotonConsolidacion() {
    const user = window._currentUser;
    if (!user || !user.email) return;
    if (user.email.toLowerCase() !== EMAIL_COADMIN_CONSOLIDACION) return;
    if (document.getElementById('btn-consolidar-progreso')) return;

    const bar = document.getElementById('fb-user-bar');
    if (!bar) return;

    const btn = document.createElement('button');
    btn.id = 'btn-consolidar-progreso';
    btn.title = 'Reordenar las preguntas respondidas para que estén todas juntas al inicio';
    btn.style.cssText = [
      'color:#fbbf24', 'cursor:pointer', 'font-size:0.8rem',
      'background:none', 'border:1px solid rgba(251,191,36,0.4)',
      'padding:4px 10px', 'border-radius:6px', 'transition:all 0.15s',
      'font-weight:600'
    ].join(';');
    btn.textContent = '🔧 Reordenar';
    btn.onmouseenter = () => { btn.style.background = 'rgba(251,191,36,0.12)'; };
    btn.onmouseleave = () => { btn.style.background = 'none'; };
    btn.onclick = _ejecutarConsolidacion;

    // Insertar antes del botón de logout
    const logoutBtn = bar.querySelector('.ub-logout');
    if (logoutBtn) bar.insertBefore(btn, logoutBtn);
    else bar.appendChild(btn);
  }

  async function _ejecutarConsolidacion() {
    const SK = window.STORAGE_KEY || 'quiz_state_v3';
    const user = window._currentUser;
    if (!user) { fbToast('⚠️ No hay sesión activa', 'error'); return; }

    fbToast('🔄 Reordenando progreso…', 'info');

    // Compactar answeredOrder de cada sección: ordenar por índice numérico.
    // Esto garantiza que las respondidas queden en orden secuencial y el paginador
    // las agrupe todas en las primeras páginas (sin huecos ni dispersión).
    // También se limpia unansweredOrder para que se regenere desde cero en el
    // próximo render (sin índices fantasma de preguntas ya respondidas).
    let cambios = 0;
    const seccionesConProgreso = Object.keys(state).filter(sid => {
      const s = state[sid];
      return s && s.answeredOrder && s.answeredOrder.length > 0;
    });

    seccionesConProgreso.forEach(sid => {
      const s = state[sid];
      // CORRECCIÓN: NO ordenar por índice numérico (eso dispersaría las preguntas en páginas
      // según su posición original, no según su posición compacta en el cuestionario).
      // answeredOrder ya conserva el orden cronológico de respuesta con reubicaciones
      // secuenciales aplicadas al momento de responder. Ese orden garantiza que las
      // respondidas ocupen las primeras N posiciones de displayOrder de forma compacta.
      // Lo que SÍ debemos hacer: limpiar unansweredOrder de índices ya respondidos y
      // forzar re-render para que se muestre el orden correcto.
      if (s.answeredOrder && s.answeredOrder.length > 0) {
        const respondidosSet = new Set(s.answeredOrder.map(e => typeof e === 'number' ? e : e.idx));
        cambios++;
        // Limpiar unansweredOrder de índices ya respondidos
        if (Array.isArray(s.unansweredOrder)) {
          s.unansweredOrder = s.unansweredOrder.filter(i => !respondidosSet.has(i));
        } else {
          s.unansweredOrder = [];
        }
        // Eliminar shuffleFrozen residual que pudiera bloquear el re-mezclado
        delete s.shuffleFrozen;
      }
    });

    if (cambios === 0) {
      fbToast('ℹ️ No hay progreso guardado para reordenar', 'info');
      return;
    }

    // Guardar en localStorage PRIMERO (funciona aunque Firestore falle)
    saveJSON(SK, state);
    // Marcar timestamp local como MÁS RECIENTE que la nube para que gane en el próximo sync
    const _consolidTs = Date.now() + 5000; // +5s para asegurar que supere el cloudTs
    localStorage.setItem('quiz_progress_ts', String(_consolidTs));
    window._fbCloudUpdatedAt = 0; // forzar que el local sea más reciente que la nube

    // Re-renderizar INMEDIATAMENTE (no esperar a Firestore)
    if (window.currentSection && typeof window.generarCuestionario === 'function') {
      setTimeout(() => window.generarCuestionario(window.currentSection), 200);
    }

    // Intentar guardar en Firestore (no bloquea si falla)
    try {
      if (window.__fb && window._fbDb) {
        const { doc, setDoc, serverTimestamp } = window.__fb;
        await setDoc(doc(window._fbDb, 'progress', user.uid), {
          state,
          updatedAt: serverTimestamp()
        });
        fbToast(`✅ Reordenado y guardado en la nube (${cambios} sección${cambios !== 1 ? 'es' : ''} corregidas)`, 'success');
      } else {
        fbToast(`✅ Reordenado localmente (${cambios} sección${cambios !== 1 ? 'es' : ''} corregidas) — se sincronizará al cerrar sesión`, 'success');
      }
    } catch (e) {
      // Firestore falló pero el localStorage ya tiene el estado correcto
      // Al cerrar sesión, fbLogout intentará subir el estado local a la nube
      fbToast('✅ Reordenado localmente — se guardará en la nube al cerrar sesión', 'success');
      console.warn('[CONSOLIDACIÓN] Firestore no disponible, guardado solo en localStorage:', e.message);
    }
  }

  // Exponer globalmente para llamarla desde otros módulos
  window._inyectarBotonConsolidacion   = _inyectarBotonConsolidacion;
  window._detectarFueraDeSecuencia     = _detectarFueraDeSecuencia;
  window._notificarConsolidacion       = _notificarConsolidacion;
  window._ejecutarConsolidacion        = _ejecutarConsolidacion;

  // ── Función de reparación de emergencia ejecutable desde consola ──────────────
  // Uso: pegar en la consola del navegador → _repararProgreso()
  window._repararProgreso = function() {
    const SK = window.STORAGE_KEY || 'quiz_state_v3';
    let st;
    try { st = JSON.parse(localStorage.getItem(SK) || '{}'); } catch(_) { st = {}; }
    let cambios = 0;
    Object.keys(st).forEach(sid => {
      const s = st[sid];
      if (!s || !s.answeredOrder || s.answeredOrder.length === 0) return;
      const respondidosSet = new Set(s.answeredOrder.map(e => typeof e === 'number' ? e : e.idx));
      if (Array.isArray(s.unansweredOrder)) {
        s.unansweredOrder = s.unansweredOrder.filter(i => !respondidosSet.has(i));
      } else {
        s.unansweredOrder = [];
      }
      delete s.shuffleFrozen;
      cambios++;
    });
    localStorage.setItem(SK, JSON.stringify(st));
    localStorage.setItem('quiz_progress_ts', String(Date.now() + 10000));
    console.log('[REPARACIÓN] ' + cambios + ' secciones limpiadas. Recargá la página (F5).');
    alert('✅ Reparación aplicada en ' + cambios + ' secciones.\nAhora recargá la página (F5) para ver el resultado.');
  };

  // NOTA: el botón "🔧 Reordenar" ya se inyecta directamente en fbShowUserBar()
  // para que sobreviva cualquier re-renderizado de la barra. El listener de evento
  // queda como respaldo de compatibilidad (no-op si el botón ya existe).
  document.addEventListener('fb:usuarioAprobadoActivo', () => {
    setTimeout(() => {
      // Solo inyectar si por algún motivo fbShowUserBar no lo incluyó
      if (!document.getElementById('btn-consolidar-progreso')) {
        _inyectarBotonConsolidacion();
      }
    }, 600);
  });

  // ════════════════════════════════════════════════════════════════
  // FIN MÓDULO CONSOLIDACIÓN SECUENCIAL
  // ════════════════════════════════════════════════════════════════
  window.fbInjectAuthStyles = fbInjectAuthStyles;
  window.fbIsAdmin = function () {
    return !!(_currentUserData && _currentUserData.role === 'admin');
  };
  Object.defineProperty(window, '_fbDb', {
    get: function () { return _fbDb; },
    configurable: true
  });
  Object.defineProperty(window, '_currentUser', {
    get: function () { return _currentUser; },
    configurable: true
  });
  window._bumpContentVersion         = _bumpContentVersion;
  window._registrarEdicionPendiente  = _registrarEdicionPendiente;
  window._aplicarEdicionPuntual      = _aplicarEdicionPuntual;
  window._seccionesYaCargadas = _seccionesYaCargadas;
  window.STORAGE_KEY          = STORAGE_KEY;
  window.GITHUB_IMAGES_BASE   = GITHUB_IMAGES_BASE;
  window.cargarSeccion        = cargarSeccion;
  window.generarCuestionario  = generarCuestionario;
  window.showSection          = showSection;
  Object.defineProperty(window, 'currentSection', {
    get: function () { return currentSection; },
    configurable: true
  });

  // ── Exponer para paginador-cuestionario.js ────────────────────
  window._getDisplayOrder = function(seccionId, total) {
    ensureSectionState(seccionId, total);
    return getDisplayOrder(seccionId, total);
  };

  // _renderPreguntaUnica: función standalone que no depende de variables
  // locales de generarCuestionario — accede todo por parámetro o por window.
  function _renderPreguntaUnica(seccionId, originalIdx, displayPosition) {
    var preguntas = preguntasPorSeccion[seccionId] || [];
    var preg = preguntas[originalIdx];
    if (!preg) return;
    var cont = document.getElementById('cuestionario-' + seccionId);
    if (!cont) return;

    var div = document.createElement('div');
    div.className = 'pregunta';

    var resultado = document.createElement('div');
    resultado.id = 'puntaje-' + seccionId + '-' + originalIdx;
    resultado.className = 'resultado-pregunta';
    resultado.textContent = '';
    div.appendChild(resultado);

    var h3 = document.createElement('h3');
    h3.textContent = (displayPosition + 1) + '. ' + preg.pregunta;
    div.appendChild(h3);

    if (preg.imagen) {
      var imgContainer = document.createElement('div');
      imgContainer.style.marginTop = '15px';
      imgContainer.style.marginBottom = '15px';
      imgContainer.style.textAlign = 'center';
      var img = document.createElement('img');
      img.src = preg.imagen;
      img.alt = 'Imagen';
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.border = '2px solid #ddd';
      img.style.borderRadius = '8px';
      img.style.cursor = 'pointer';
      img.onclick = function() { window.open(this.src, '_blank'); };
      imgContainer.appendChild(img);
      div.appendChild(imgContainer);
    }

    var tipoInput = preg.multiple ? 'checkbox' : 'radio';
    var shuffleResult = getOrBuildShuffleForQuestion(seccionId, originalIdx, preg.opciones);
    var inv = shuffleResult.inv;
    var opcionesMezcladas = shuffleResult.opcionesMezcladas;

    opcionesMezcladas.forEach(function(opc, mixedIdx) {
      var label = document.createElement('label');
      label.className = 'opcion';
      var input = document.createElement('input');
      input.type = tipoInput;
      input.name = 'pregunta' + seccionId + originalIdx;
      input.value = mixedIdx;
      input.setAttribute('data-original-index', inv[mixedIdx]);
      input.addEventListener('change', function() {
        if (!state[seccionId].shuffleMap[originalIdx]) {
          freezeShuffleForQuestion(seccionId, originalIdx);
        }
        persistSelectionsForQuestion(seccionId, originalIdx);
      });
      label.appendChild(input);
      label.appendChild(document.createTextNode(' ' + opc));
      div.appendChild(label);
    });

    inyectarEstilosEtiquetas();
    var etq = preg.etiquetas || {};
    var esSimulacroCtx = (seccionId === 'simulador');
    var esUnicoCtx = esExamenUnico(seccionId);
    var esUBACtx = esExamenUBA(seccionId);
    var esCompCtx = esCompilado(seccionId);
    var esOrigenOficial = esUnicoCtx || esUBACtx || esCompCtx;
    var nombreArchivoFinal = etq.nombreArchivo || preg.nombreArchivo || '';
    var mostrarEspecialidad = (esOrigenOficial || esSimulacroCtx) && !!etq.especialidad;
    var mostrarNombreArchivo = !esOrigenOficial && !!nombreArchivoFinal;
    var mostrarNumeroPregunta = !esOrigenOficial && !!etq.numeroPregunta;
    if (mostrarEspecialidad || mostrarNombreArchivo || mostrarNumeroPregunta) {
      var wrapper = document.createElement('div');
      wrapper.className = 'etiquetas-origen-wrapper';
      var sep = document.createElement('div');
      sep.className = 'etiquetas-separador';
      var pillsDiv = document.createElement('div');
      pillsDiv.className = 'etiquetas-origen';
      var crearPill = function(icono, texto, variante) {
        var span = document.createElement('span');
        span.className = 'etiqueta-pill etiqueta-pill--' + variante;
        span.innerHTML = '<span class="etiqueta-pill-icono">' + icono + '</span><span class="etiqueta-pill-texto">' + texto + '</span>';
        return span;
      };
      if (mostrarEspecialidad) pillsDiv.appendChild(crearPill('🏥', etq.especialidad, 'especialidad'));
      if (mostrarNombreArchivo) pillsDiv.appendChild(crearPill('📂', nombreArchivoFinal, 'archivo'));
      if (mostrarNumeroPregunta) pillsDiv.appendChild(crearPill('🔢', etq.numeroPregunta, 'numero'));
      wrapper.appendChild(sep);
      wrapper.appendChild(pillsDiv);
      div.appendChild(wrapper);
    }

    var botonesDiv = document.createElement('div');
    botonesDiv.style.marginTop = '10px';
    botonesDiv.style.display = 'flex';
    botonesDiv.style.gap = '8px';
    botonesDiv.style.flexWrap = 'wrap';

    var btn = document.createElement('button');
    btn.textContent = 'Responder';
    btn.className = 'btn-responder';
    btn.addEventListener('click', function() { responderPregunta(seccionId, originalIdx); });
    botonesDiv.appendChild(btn);

    var _hayExplicacion = preg.explicacion && preg.explicacion.trim() !== '';
    if (_hayExplicacion || (window.fbIsAdmin && window.fbIsAdmin())) {
      var btnExplicacion = document.createElement('button');
      btnExplicacion.textContent = _hayExplicacion ? 'Ver explicación' : '➕ Agregar explicación';
      btnExplicacion.className = 'btn-explicacion' + (_hayExplicacion ? '' : ' btn-explicacion--vacia');
      btnExplicacion.id = 'btn-explicacion-' + seccionId + '-' + originalIdx;
      btnExplicacion.addEventListener('click', function() { mostrarExplicacion(seccionId, originalIdx); });
      botonesDiv.appendChild(btnExplicacion);
    }

    if (esExamenOficial(seccionId)) {
      var btnRetag = document.createElement('button');
      btnRetag.textContent = '✏️ Reetiquetado';
      btnRetag.className = 'btn-retag';
      btnRetag.style.cssText = 'padding:6px 14px;border-radius:8px;border:1.5px solid #0891b240;background:#0891b210;color:#0891b2;font-size:13px;cursor:pointer;font-weight:500;';
      btnRetag.addEventListener('click', function() { abrirModalReetiquetado(seccionId, originalIdx, preg); });
      botonesDiv.appendChild(btnRetag);
    }

    if (window.fbInjectEditButtonIfAdmin) window.fbInjectEditButtonIfAdmin(seccionId, originalIdx, botonesDiv);
    if (window.fbInjectReclasificarButton) window.fbInjectReclasificarButton(seccionId, originalIdx, botonesDiv);

    div.appendChild(botonesDiv);

    var _tieneExplicacion = preg.explicacion && preg.explicacion.trim() !== '';
    var explicacionDiv = document.createElement('div');
    explicacionDiv.id = 'explicacion-' + seccionId + '-' + originalIdx;
    explicacionDiv.className = 'explicacion-contenedor';
    explicacionDiv.style.display = 'none';
    explicacionDiv.style.marginTop = '15px';
    explicacionDiv.style.padding = '18px 20px';
    explicacionDiv.style.backgroundColor = '#f0f9ff';
    explicacionDiv.style.borderLeft = '4px solid #0891b2';
    explicacionDiv.style.borderRadius = '10px';
    explicacionDiv.style.boxSizing = 'border-box';
    explicacionDiv.style.width = '100%';
    explicacionDiv.style.overflow = 'hidden';  // FIX: evita que imágenes se salgan del contenedor
    explicacionDiv.style.maxWidth = '100%';    // FIX: garantía adicional de contención
    explicacionDiv.dataset.tieneContenido = _tieneExplicacion ? '1' : '0';
    var explicacionTitulo = document.createElement('strong');
    explicacionTitulo.textContent = 'Explicación:';
    explicacionTitulo.style.display = 'block';
    explicacionTitulo.style.marginBottom = '8px';
    explicacionTitulo.style.color = '#0d7490';
    var explicacionTexto = document.createElement('div');
    explicacionTexto.style.overflow = 'hidden';
    explicacionTexto.style.boxSizing = 'border-box';
    explicacionTexto.style.maxWidth = '100%';
    if (_tieneExplicacion) {
      var htmlDetectado = /<(p|b|i|u|br|img|strong|em)[^>]*>/i.test(preg.explicacion);
      if (htmlDetectado) {
        explicacionTexto.innerHTML = preg.explicacion.replace(/<p>\s*<\/p>/g,'').replace(/\n/g,'<br>').trim();
        // FIX: limitar el ancho de todas las imágenes insertadas vía innerHTML
        explicacionTexto.querySelectorAll('img').forEach(function(img) {
          img.style.maxWidth  = '100%';
          img.style.width     = 'auto';
          img.style.height    = 'auto';
          img.style.display   = 'block';
          img.style.boxSizing = 'border-box';
        });
      } else {
        explicacionTexto.textContent = preg.explicacion;
      }
    }
    explicacionTexto.style.margin = '0';
    explicacionTexto.style.lineHeight = '1.6';
    explicacionDiv.appendChild(explicacionTitulo);
    explicacionDiv.appendChild(explicacionTexto);
    div.appendChild(explicacionDiv);

    if (typeof window.fbInjectVacunasButtonIfAdmin === 'function') {
      window.fbInjectVacunasButtonIfAdmin(seccionId, explicacionDiv);
    }

    cont.appendChild(div);
  }

  window._renderPregunta = _renderPreguntaUnica;

  window._renderIndicesToCont = function(seccionId, indices, posOffset) {
    if (!Array.isArray(indices) || indices.length === 0) return;
    posOffset = (typeof posOffset === 'number') ? posOffset : 0;
    var preguntas = preguntasPorSeccion[seccionId];
    if (!preguntas || preguntas.length === 0) return;
    ensureSectionState(seccionId, preguntas.length);
    var cont = document.getElementById('cuestionario-' + seccionId);
    if (!cont) return;
    indices.forEach(function(originalIdx, localPos) {
      _renderPreguntaUnica(seccionId, originalIdx, posOffset + localPos);
    });
    restoreSelectionsAndGrades(seccionId);
  };

})();
