// ════════════════════════════════════════════════════════════════
// paginador-cuestionario.js  — V1
// ────────────────────────────────────────────────────────────────
// Divide los cuestionarios de especialidad en páginas de 50 preguntas
// para usuarios no-admin. Admin sigue viendo todo en una sola hoja.
//
// INTEGRACIÓN:
//   Agregar en index.html DESPUÉS de script.js y editor-admin.js:
//   <script src="paginador-cuestionario.js?v=1"></script>
//
//   NO modifica script.js. Intercepta window.generarCuestionario
//   para secciones de especialidad cuando el usuario no es admin.
//
// LÓGICA:
//   1. Toma el displayOrder de getDisplayOrder() (ya calcula:
//      respondidas primero en orden cronológico, sin responder
//      después en orden aleatorio congelado).
//   2. Divide en páginas de PAGE_SIZE preguntas.
//   3. Renderiza solo la página activa usando la infraestructura
//      existente de script.js (renderiza cada pregunta con todos
//      sus listeners, explicaciones, botones admin, etc.).
//   4. El estado de paginación (página activa) se persiste en
//      localStorage bajo "quiz_page_{seccionId}".
//   5. Al entrar, hace scroll a la primera pregunta sin responder.
//   6. El reinicio por página limpia solo las respuestas de esa
//      página en el estado global, sin tocar el resto.
// ════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  const PAGE_SIZE       = 50;
  const PAGE_STATE_KEY  = 'quiz_paginator_v1'; // { [seccionId]: numeroPagina }

  // ── Secciones que NO deben paginarse (exámenes, simulador) ───
  // El paginador solo actúa en especialidades puras.
  // Las mismas funciones que usa script.js para detectar el tipo.
  function _esExamenUnico(id) {
    return id && (id.startsWith('unico') || id.startsWith('uba'));
  }
  function _esCompilado(id) {
    return id && id.startsWith('compilado');
  }
  function _esExamenSimulador(id) {
    return id === 'simulador';
  }
  function _debePaginar(seccionId) {
    if (!seccionId) return false;
    if (_esExamenUnico(seccionId))   return false;
    if (_esCompilado(seccionId))     return false;
    if (_esExamenSimulador(seccionId)) return false;
    return true;
  }

  // ── Helpers de estado de página ──────────────────────────────
  function _getPaginaActiva(seccionId) {
    try {
      const raw = localStorage.getItem(PAGE_STATE_KEY);
      if (!raw) return 0;
      const obj = JSON.parse(raw);
      return (typeof obj[seccionId] === 'number') ? obj[seccionId] : 0;
    } catch (_) { return 0; }
  }

  function _setPaginaActiva(seccionId, pag) {
    try {
      const raw = localStorage.getItem(PAGE_STATE_KEY);
      const obj = raw ? JSON.parse(raw) : {};
      obj[seccionId] = pag;
      localStorage.setItem(PAGE_STATE_KEY, JSON.stringify(obj));
    } catch (_) {}
  }

  function _resetPaginaActiva(seccionId) {
    _setPaginaActiva(seccionId, 0);
  }

  // ── Calcular estadísticas de página ──────────────────────────
  function _calcPageStats(seccionId, indices) {
    const puntajes = (window.puntajesPorSeccion || {})[seccionId] || [];
    let correctas = 0, incorrectas = 0, sinResponder = 0;
    indices.forEach(idx => {
      const p = puntajes[idx];
      if (p === 1)         correctas++;
      else if (p === 0)    incorrectas++;
      else                 sinResponder++;
    });
    return { correctas, incorrectas, sinResponder, total: indices.length };
  }

  // ── Calcular estado de cada página para los indicadores ──────
  function _calcPageEstados(seccionId, totalPages, pagesIndices) {
    const estados = [];
    for (let p = 0; p < totalPages; p++) {
      const stats = _calcPageStats(seccionId, pagesIndices[p] || []);
      if (stats.sinResponder === stats.total)       estados.push('pendiente');
      else if (stats.sinResponder === 0)            estados.push('completa');
      else                                          estados.push('parcial');
    }
    return estados;
  }

  // ── Encontrar la página donde está la primera sin responder ──
  function _encontrarPaginaActiva(seccionId, pagesIndices, totalPages) {
    const puntajes = (window.puntajesPorSeccion || {})[seccionId] || [];
    for (let p = 0; p < totalPages; p++) {
      const indices = pagesIndices[p] || [];
      const tieneSinResponder = indices.some(idx => {
        const v = puntajes[idx];
        return v === null || v === undefined;
      });
      if (tieneSinResponder) return p;
    }
    // Todas respondidas → última página
    return totalPages - 1;
  }

  // ── Inyectar estilos del paginador ───────────────────────────
  function _inyectarEstilos() {
    if (document.getElementById('paginador-styles')) return;
    const st = document.createElement('style');
    st.id = 'paginador-styles';
    st.textContent = `
      /* ══ Barra de navegación ══ */
      .pag-navbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 10px 14px;
        border: 1px solid rgba(56,189,248,0.15);
        border-radius: 14px;
        background: rgba(13,33,55,0.7);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        margin-bottom: 6px;
        flex-wrap: wrap;
        position: sticky;
        top: 0;
        z-index: 100;
        box-shadow: 0 4px 20px rgba(0,0,0,0.25);
      }

      .pag-nav-left, .pag-nav-right {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      }

      .pag-nav-center {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-wrap: wrap;
        justify-content: center;
        flex: 1;
        min-width: 0;
      }

      /* ── Pills de páginas ── */
      .pag-pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 32px;
        height: 32px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.1);
        background: rgba(255,255,255,0.04);
        font-size: 13px;
        color: #94a3b8;
        padding: 0 8px;
        cursor: pointer;
        position: relative;
        transition: background 0.15s, border-color 0.15s, color 0.15s;
        font-family: inherit;
        font-weight: 500;
        user-select: none;
      }
      .pag-pill:hover:not(.pag-pill-active) {
        background: rgba(255,255,255,0.1);
        border-color: rgba(255,255,255,0.22);
        color: #e2e8f0;
      }
      .pag-pill-active {
        background: rgba(14,116,144,0.3);
        border-color: rgba(14,116,144,0.7);
        color: #38bdf8;
        font-weight: 700;
        box-shadow: 0 0 0 2px rgba(14,116,144,0.2);
      }
      .pag-pill-completa::after {
        content: '';
        position: absolute;
        bottom: 4px;
        right: 4px;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #34d399;
      }
      .pag-pill-parcial::after {
        content: '';
        position: absolute;
        bottom: 4px;
        right: 4px;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #fbbf24;
      }
      .pag-pill-elipsis {
        min-width: 20px;
        border: none;
        background: transparent;
        cursor: default;
        color: #64748b;
        padding: 0 2px;
        pointer-events: none;
      }
      .pag-pill-elipsis:hover { background: transparent; color: #64748b; }

      /* ── Botones anterior / siguiente ── */
      .pag-btn {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 7px 13px;
        border-radius: 9px;
        border: 1px solid rgba(255,255,255,0.13);
        background: rgba(255,255,255,0.05);
        color: #94a3b8;
        font-size: 13px;
        cursor: pointer;
        font-family: inherit;
        font-weight: 500;
        white-space: nowrap;
        transition: background 0.15s, border-color 0.15s, color 0.15s;
        user-select: none;
      }
      .pag-btn:hover:not(:disabled) {
        background: rgba(255,255,255,0.12);
        border-color: rgba(255,255,255,0.28);
        color: #e2e8f0;
      }
      .pag-btn:disabled {
        opacity: 0.28;
        cursor: default;
      }

      /* ── Info total ── */
      .pag-info-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
        flex-wrap: wrap;
        gap: 6px;
      }
      .pag-leyenda {
        display: flex;
        gap: 12px;
        align-items: center;
        font-size: 11px;
        color: #64748b;
        flex-wrap: wrap;
      }
      .pag-leyenda-item {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .pag-leyenda-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .pag-total-info {
        font-size: 11px;
        color: #64748b;
      }

      /* ── Barra de progreso ── */
      .pag-progress-wrap {
        height: 3px;
        border-radius: 99px;
        background: rgba(255,255,255,0.07);
        overflow: hidden;
        margin-bottom: 14px;
      }
      .pag-progress-fill {
        height: 100%;
        border-radius: 99px;
        background: linear-gradient(90deg, #0891b2, #38bdf8);
        transition: width 0.4s ease;
      }

      /* ── Cabecera de la página activa ── */
      .pag-page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 14px;
        flex-wrap: wrap;
        gap: 8px;
      }
      .pag-page-title {
        font-size: 13px;
        font-weight: 600;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .pag-page-stats {
        display: flex;
        gap: 6px;
        align-items: center;
        flex-wrap: wrap;
      }
      .pag-badge {
        font-size: 11px;
        padding: 3px 9px;
        border-radius: 20px;
        font-weight: 600;
        white-space: nowrap;
      }
      .pag-badge-ok {
        background: rgba(52,211,153,0.12);
        color: #34d399;
        border: 1px solid rgba(52,211,153,0.25);
      }
      .pag-badge-err {
        background: rgba(248,113,113,0.1);
        color: #f87171;
        border: 1px solid rgba(248,113,113,0.25);
      }
      .pag-badge-pend {
        background: rgba(251,191,36,0.1);
        color: #fbbf24;
        border: 1px solid rgba(251,191,36,0.25);
      }
      .pag-badge-total {
        background: rgba(255,255,255,0.05);
        color: #94a3b8;
        border: 1px solid rgba(255,255,255,0.1);
      }

      /* ── Footer de la página ── */
      .pag-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-top: 18px;
        padding-top: 14px;
        border-top: 1px solid rgba(255,255,255,0.07);
        flex-wrap: wrap;
      }
      .pag-btn-reiniciar-pag {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 8px 14px;
        border-radius: 9px;
        border: 1px solid rgba(230,126,34,0.3);
        background: rgba(230,126,34,0.07);
        color: #e67e22;
        font-size: 13px;
        cursor: pointer;
        font-family: inherit;
        font-weight: 500;
        transition: background 0.15s, border-color 0.15s;
      }
      .pag-btn-reiniciar-pag:hover {
        background: rgba(230,126,34,0.16);
        border-color: rgba(230,126,34,0.55);
      }

      .pag-footer-derecha {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .pag-respondidas-label {
        font-size: 12px;
        color: #64748b;
      }
      .pag-btn-siguiente {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 9px 20px;
        border-radius: 10px;
        border: none;
        background: linear-gradient(135deg, #0d7490, #0891b2);
        color: #fff;
        font-size: 0.9rem;
        font-weight: 700;
        cursor: pointer;
        font-family: inherit;
        box-shadow: 0 4px 14px rgba(13,116,144,0.35);
        transition: all 0.18s ease;
        white-space: nowrap;
      }
      .pag-btn-siguiente:hover {
        background: linear-gradient(135deg, #0e6584, #0d7490);
        box-shadow: 0 6px 20px rgba(13,116,144,0.45);
        transform: translateY(-1px);
      }
      .pag-btn-siguiente:active { transform: none; }
      .pag-btn-siguiente:disabled {
        opacity: 0.4; cursor: default;
        transform: none; box-shadow: none;
      }

      /* ── Navbar de páginas duplicada abajo ── */
      .pag-navbar-bottom {
        margin-top: 18px;
        position: static;
        box-shadow: none;
      }

      /* ── Modal de reinicio de página ── */
      #pag-modal-reinicio-overlay {
        position: fixed;
        inset: 0;
        z-index: 25000;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(10,22,40,0.85);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        animation: pagModalFadeIn 0.18s ease both;
      }
      @keyframes pagModalFadeIn { from{opacity:0} to{opacity:1} }
      #pag-modal-reinicio-box {
        background: linear-gradient(160deg, #0d2137, #0a1628);
        border: 1.5px solid rgba(255,255,255,0.1);
        border-radius: 18px;
        padding: 30px 28px 24px;
        max-width: 440px;
        width: 92%;
        box-shadow: 0 30px 80px rgba(0,0,0,0.6);
        animation: pagModalBoxIn 0.24s cubic-bezier(0.34,1.2,0.64,1) both;
        font-family: inherit;
      }
      @keyframes pagModalBoxIn {
        from { opacity:0; transform: scale(0.88) translateY(20px); }
        to   { opacity:1; transform: scale(1) translateY(0); }
      }
      #pag-modal-reinicio-box .pag-mr-icono {
        font-size: 2.2rem; text-align: center; margin-bottom: 16px;
      }
      #pag-modal-reinicio-box .pag-mr-titulo {
        font-size: 1.05rem; font-weight: 700; color: #f1f5f9;
        text-align: center; margin-bottom: 10px;
      }
      #pag-modal-reinicio-box .pag-mr-msg {
        font-size: 0.86rem; color: #94a3b8; line-height: 1.6;
        text-align: center; margin-bottom: 22px;
      }
      #pag-modal-reinicio-box .pag-mr-btns {
        display: flex; gap: 10px;
      }
      #pag-mr-btn-cancelar {
        flex: 1; padding: 10px 0; border-radius: 10px;
        border: 1.5px solid rgba(148,163,184,0.25);
        background: rgba(255,255,255,0.04);
        color: #94a3b8; font-size: 0.9rem; font-weight: 600;
        cursor: pointer; font-family: inherit;
        transition: background 0.15s;
      }
      #pag-mr-btn-cancelar:hover { background: rgba(255,255,255,0.09); }
      #pag-mr-btn-confirmar {
        flex: 1; padding: 10px 0; border-radius: 10px;
        border: none;
        background: linear-gradient(135deg, #e67e22, #ca6f1e);
        color: #fff; font-size: 0.9rem; font-weight: 700;
        cursor: pointer; font-family: inherit;
        box-shadow: 0 4px 14px rgba(230,126,34,0.3);
        transition: opacity 0.15s;
      }
      #pag-mr-btn-confirmar:hover { opacity: 0.88; }

      /* Ajuste: barra de usuario no tape la navbar sticky */
      #fb-user-bar { z-index: 9990; }
    `;
    document.head.appendChild(st);
  }

  // ── Construir el selector de páginas con ellipsis ─────────────
  function _buildPillsHTML(totalPages, current, estados) {
    // Mostrar: primera, última, current-1, current, current+1, + ellipsis
    const show = new Set([0, totalPages - 1, current - 1, current, current + 1]
      .filter(p => p >= 0 && p < totalPages));

    const pills = [];
    let prevShown = -1;
    for (let p = 0; p < totalPages; p++) {
      if (!show.has(p)) continue;
      if (prevShown !== -1 && p > prevShown + 1) {
        pills.push(`<span class="pag-pill pag-pill-elipsis">…</span>`);
      }
      const est = estados[p] || 'pendiente';
      const clases = [
        'pag-pill',
        p === current ? 'pag-pill-active' : '',
        est === 'completa' ? 'pag-pill-completa' : '',
        est === 'parcial'  ? 'pag-pill-parcial'  : ''
      ].filter(Boolean).join(' ');
      pills.push(`<button class="${clases}" data-pag="${p}" title="Página ${p + 1}">${p + 1}</button>`);
      prevShown = p;
    }
    return pills.join('');
  }

  // ── Renderizar el paginador para una sección ──────────────────
  function _renderizarPaginador(seccionId) {
    const preguntas = (window.preguntasPorSeccion || {})[seccionId];
    if (!preguntas || preguntas.length === 0) return false;

    // Verificar si hay función de getDisplayOrder expuesta
    // (la llamamos indirectamente: script.js la usa internamente en generarCuestionario)
    // En lugar de duplicar la lógica, accedemos al orden construido en el
    // último generarCuestionario() a través de un hook que exponemos.
    const displayOrder = window._paginadorDisplayOrder && window._paginadorDisplayOrder[seccionId];
    if (!displayOrder || displayOrder.length === 0) return false;

    const totalPages   = Math.ceil(displayOrder.length / PAGE_SIZE);
    if (totalPages <= 1) return false; // si caben en una sola página, no paginar

    // Dividir displayOrder en páginas
    const pagesIndices = [];
    for (let p = 0; p < totalPages; p++) {
      pagesIndices.push(displayOrder.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE));
    }

    // Determinar página activa
    // 1ro: buscar la página donde está la primera sin responder
    const paginaConSinResponder = _encontrarPaginaActiva(seccionId, pagesIndices, totalPages);
    // 2do: si el usuario había navegado manualmente, respetar esa selección solo si es válida
    let paginaGuardada = _getPaginaActiva(seccionId);
    if (paginaGuardada >= totalPages) paginaGuardada = paginaConSinResponder;

    // Preferir la página guardada (navegación manual), pero si no hay ninguna guardada,
    // ir a la que tiene la primera sin responder
    const paginaActiva = (paginaGuardada !== null && typeof paginaGuardada === 'number')
      ? paginaGuardada
      : paginaConSinResponder;

    _setPaginaActiva(seccionId, paginaActiva);

    // Calcular estadísticas totales para la barra de progreso
    const puntajes    = (window.puntajesPorSeccion || {})[seccionId] || [];
    const totalRespondidas = displayOrder.filter(idx => {
      const v = puntajes[idx];
      return v !== null && v !== undefined;
    }).length;
    const pctProgreso = Math.round((totalRespondidas / displayOrder.length) * 100);

    // ── Renderizar el contenedor principal ──────────────────────
    const cont = document.getElementById(`cuestionario-${seccionId}`);
    if (!cont) return false;
    cont.innerHTML = '';

    _inyectarEstilos();
    if (typeof window.fbInjectAuthStyles === 'function') window.fbInjectAuthStyles();

    const wrapper = document.createElement('div');
    wrapper.id = `pag-wrapper-${seccionId}`;

    // Función interna de render de una página
    function _renderPagina(pag) {
      _setPaginaActiva(seccionId, pag);
      wrapper.innerHTML = '';

      const indicesPagina = pagesIndices[pag];
      const stats         = _calcPageStats(seccionId, indicesPagina);
      const estados       = _calcPageEstados(seccionId, totalPages, pagesIndices);
      const pillsHTML     = _buildPillsHTML(totalPages, pag, estados);

      const totalRespPagina    = stats.correctas + stats.incorrectas;
      const pctProgresoPagina  = Math.round((totalRespPagina / stats.total) * 100);

      const globalPctActual = Math.round(
        (displayOrder.filter(idx => {
          const v = puntajes[idx];
          return v !== null && v !== undefined;
        }).length / displayOrder.length) * 100
      );

      // ── Barra de navegación (top) ────────────────────────────
      const navbarHTML = `
        <div class="pag-navbar" id="pag-nav-top-${seccionId}">
          <div class="pag-nav-left">
            <button class="pag-btn" id="pag-prev-top" ${pag === 0 ? 'disabled' : ''}>← Anterior</button>
          </div>
          <div class="pag-nav-center">${pillsHTML}</div>
          <div class="pag-nav-right">
            <button class="pag-btn" id="pag-next-top" ${pag === totalPages - 1 ? 'disabled' : ''}>Siguiente →</button>
          </div>
        </div>
      `;

      // ── Info row + leyenda ───────────────────────────────────
      const infoHTML = `
        <div class="pag-info-row">
          <div class="pag-leyenda">
            <div class="pag-leyenda-item">
              <span class="pag-leyenda-dot" style="background:#34d399"></span>
              <span>Completa</span>
            </div>
            <div class="pag-leyenda-item">
              <span class="pag-leyenda-dot" style="background:#fbbf24"></span>
              <span>En progreso</span>
            </div>
            <div class="pag-leyenda-item">
              <span class="pag-leyenda-dot" style="background:rgba(255,255,255,0.18)"></span>
              <span>Sin comenzar</span>
            </div>
          </div>
          <div class="pag-total-info">
            ${displayOrder.length} preguntas · ${totalPages} páginas
          </div>
        </div>
      `;

      // ── Barra de progreso global ─────────────────────────────
      const progressHTML = `
        <div class="pag-progress-wrap">
          <div class="pag-progress-fill" style="width:${globalPctActual}%"></div>
        </div>
      `;

      // ── Cabecera de la página activa ─────────────────────────
      const inicio    = pag * PAGE_SIZE + 1;
      const fin       = Math.min((pag + 1) * PAGE_SIZE, displayOrder.length);
      const statsHTML = `
        <div class="pag-page-header">
          <div class="pag-page-title">Página ${pag + 1} · Preguntas ${inicio}–${fin}</div>
          <div class="pag-page-stats">
            ${stats.correctas  > 0 ? `<span class="pag-badge pag-badge-ok">✓ ${stats.correctas} correctas</span>` : ''}
            ${stats.incorrectas > 0 ? `<span class="pag-badge pag-badge-err">✗ ${stats.incorrectas} incorrectas</span>` : ''}
            ${stats.sinResponder > 0 ? `<span class="pag-badge pag-badge-pend">${stats.sinResponder} restantes</span>` : ''}
            ${stats.sinResponder === 0 ? `<span class="pag-badge pag-badge-ok">✓ Página completada</span>` : ''}
          </div>
        </div>
      `;

      wrapper.innerHTML = navbarHTML + infoHTML + progressHTML + statsHTML;

      // ── Renderizar preguntas de esta página ──────────────────
      // Usamos la función generarCuestionario de script.js de forma parcial:
      // creamos un div temporal, llamamos la renderización individual por cada índice,
      // y los movemos al wrapper.
      // 
      // Script.js expone window._paginadorRenderPregunta (hook que instalamos abajo).
      const preguntasFrag = document.createDocumentFragment();

      // Buscar primera sin responder en esta página para el separador
      let puntajesActuales = (window.puntajesPorSeccion || {})[seccionId] || [];
      let primeraSinResponder = null;
      indicesPagina.forEach((originalIdx, posEnPagina) => {
        const v = puntajesActuales[originalIdx];
        if ((v === null || v === undefined) && primeraSinResponder === null) {
          primeraSinResponder = originalIdx;
        }
      });

      indicesPagina.forEach((originalIdx, posEnPagina) => {
        const displayPosition = pag * PAGE_SIZE + posEnPagina; // posición visual global

        // Separador "continuá desde aquí" antes de la primera sin responder
        if (originalIdx === primeraSinResponder && posEnPagina > 0) {
          const sep = document.createElement('div');
          sep.className = 'separador-progreso';
          sep.innerHTML = `
            <div class="separador-progreso-etiqueta">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
              Continuá desde aquí
            </div>`;
          preguntasFrag.appendChild(sep);
        }

        if (typeof window._paginadorRenderPregunta === 'function') {
          const div = window._paginadorRenderPregunta(seccionId, originalIdx, displayPosition);
          if (div) preguntasFrag.appendChild(div);
        }
      });

      wrapper.appendChild(preguntasFrag);

      // ── Footer de página ─────────────────────────────────────
      const totalRespPaginaActual = stats.correctas + stats.incorrectas;
      const footerEl = document.createElement('div');
      footerEl.className = 'pag-footer';
      footerEl.innerHTML = `
        <button class="pag-btn-reiniciar-pag" id="pag-btn-reiniciar">
          ↺ Reiniciar esta página
        </button>
        <div class="pag-footer-derecha">
          <span class="pag-respondidas-label">${totalRespPaginaActual}/${stats.total} respondidas</span>
          ${pag < totalPages - 1
            ? `<button class="pag-btn-siguiente" id="pag-btn-sig">Siguiente página →</button>`
            : `<button class="pag-btn-siguiente" id="pag-btn-sig" ${stats.sinResponder > 0 ? 'disabled' : ''}>Ver resultado de especialidad →</button>`
          }
        </div>
      `;
      wrapper.appendChild(footerEl);

      // ── Barra de navegación (bottom) ─────────────────────────
      const navbarBottomEl = document.createElement('div');
      navbarBottomEl.className = 'pag-navbar pag-navbar-bottom';
      navbarBottomEl.innerHTML = `
        <div class="pag-nav-left">
          <button class="pag-btn" id="pag-prev-bot" ${pag === 0 ? 'disabled' : ''}>← Anterior</button>
        </div>
        <div class="pag-nav-center">${pillsHTML}</div>
        <div class="pag-nav-right">
          <button class="pag-btn" id="pag-next-bot" ${pag === totalPages - 1 ? 'disabled' : ''}>Siguiente →</button>
        </div>
      `;
      wrapper.appendChild(navbarBottomEl);

      // ── Event listeners ──────────────────────────────────────
      function _irA(nuevaPag) {
        if (nuevaPag < 0 || nuevaPag >= totalPages) return;
        const scrollAntes = window.scrollY;
        _renderPagina(nuevaPag);
        // Restaurar state visual (verde/rojo) de preguntas ya respondidas
        if (typeof window.restoreSelectionsAndGrades === 'function') {
          window.restoreSelectionsAndGrades(seccionId);
        }
        // Scroll al top del cuestionario
        setTimeout(() => {
          const nav = document.getElementById(`pag-nav-top-${seccionId}`);
          if (nav) nav.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
        // Conectar botón de puntuación total (por si acaso)
        _conectarBotonTotal(seccionId);
      }

      // Botones anterior / siguiente (top)
      const prevTop  = wrapper.querySelector('#pag-prev-top');
      const nextTop  = wrapper.querySelector('#pag-next-top');
      if (prevTop) prevTop.addEventListener('click', () => _irA(pag - 1));
      if (nextTop) nextTop.addEventListener('click', () => _irA(pag + 1));

      // Pills (top y bottom)
      wrapper.querySelectorAll('.pag-pill[data-pag]').forEach(pill => {
        pill.addEventListener('click', () => {
          const p = parseInt(pill.getAttribute('data-pag'), 10);
          _irA(p);
        });
      });

      // Botones anterior / siguiente (bottom)
      const prevBot = wrapper.querySelector('#pag-prev-bot');
      const nextBot = wrapper.querySelector('#pag-next-bot');
      if (prevBot) prevBot.addEventListener('click', () => _irA(pag - 1));
      if (nextBot) nextBot.addEventListener('click', () => _irA(pag + 1));

      // Botón siguiente página / ver resultado
      const btnSig = wrapper.querySelector('#pag-btn-sig');
      if (btnSig) {
        if (pag < totalPages - 1) {
          btnSig.addEventListener('click', () => _irA(pag + 1));
        } else {
          // Última página: mostrar puntuación total de toda la especialidad
          btnSig.addEventListener('click', () => {
            if (typeof window.mostrarPuntuacionTotal === 'function') {
              window.mostrarPuntuacionTotal(seccionId);
            }
          });
        }
      }

      // Botón reiniciar página
      const btnReiniciar = wrapper.querySelector('#pag-btn-reiniciar');
      if (btnReiniciar) {
        btnReiniciar.addEventListener('click', () =>
          _mostrarModalReinicioPagina(seccionId, pag, indicesPagina, () => {
            _irA(pag); // re-renderizar la misma página
          })
        );
      }

      // Restaurar estado visual de las preguntas de esta página
      if (typeof window.restoreSelectionsAndGrades === 'function') {
        requestAnimationFrame(() => {
          window.restoreSelectionsAndGrades(seccionId);
        });
      }

      // Conectar botón de puntuación total
      _conectarBotonTotal(seccionId);
    } // fin _renderPagina

    _renderPagina(paginaActiva);
    cont.appendChild(wrapper);

    // Scroll a la primera pregunta sin responder de la página activa
    setTimeout(() => {
      const sep = wrapper.querySelector('.separador-progreso');
      if (sep && sep.nextElementSibling) {
        sep.nextElementSibling.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        // Si no hay separador (todas respondidas o página limpia), ir al top del nav
        const nav = document.getElementById(`pag-nav-top-${seccionId}`);
        if (nav) nav.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 120);

    return true; // indicar que el paginador tomó el control
  }

  // ── Conectar el botón "Mostrar Puntuación Total" ─────────────
  function _conectarBotonTotal(seccionId) {
    const btnTotal = document.getElementById(`mostrar-total-${seccionId}`);
    if (btnTotal && typeof window.mostrarPuntuacionTotal === 'function') {
      btnTotal.onclick = () => window.mostrarPuntuacionTotal(seccionId);
    }
  }

  // ── Modal de reinicio de página ──────────────────────────────
  function _mostrarModalReinicioPagina(seccionId, pag, indicesPagina, onConfirm) {
    if (typeof window.fbInjectAuthStyles === 'function') window.fbInjectAuthStyles();
    const existente = document.getElementById('pag-modal-reinicio-overlay');
    if (existente) existente.remove();

    const overlay = document.createElement('div');
    overlay.id = 'pag-modal-reinicio-overlay';
    overlay.innerHTML = `
      <div id="pag-modal-reinicio-box">
        <div class="pag-mr-icono">🔄</div>
        <div class="pag-mr-titulo">¿Reiniciar esta página?</div>
        <div class="pag-mr-msg">
          Se borrarán las respuestas de las <strong style="color:#f1f5f9;">${indicesPagina.length} preguntas</strong>
          de la página ${pag + 1} y quedarán disponibles para resolver de nuevo.
          <br><br>
          <span style="color:#64748b;font-size:0.82rem;">El progreso del resto de la especialidad no se ve afectado.</span>
        </div>
        <div class="pag-mr-btns">
          <button id="pag-mr-btn-cancelar">Cancelar</button>
          <button id="pag-mr-btn-confirmar">↺ Reiniciar página</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('pag-mr-btn-cancelar').onclick = () => overlay.remove();
    document.getElementById('pag-mr-btn-confirmar').onclick = () => {
      overlay.remove();
      _reiniciarPagina(seccionId, indicesPagina);
      if (onConfirm) onConfirm();
    };
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  }

  // ── Limpiar el estado de las preguntas de una página ─────────
  function _reiniciarPagina(seccionId, indicesPagina) {
    const STORAGE_KEY = window.STORAGE_KEY || 'quiz_state_v3';
    let state = {};
    try { state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (_) {}

    const s = state[seccionId];
    if (!s) return;

    const idxSet = new Set(indicesPagina);

    // Limpiar puntajesPorSeccion en memoria
    const puntajes = (window.puntajesPorSeccion || {})[seccionId];
    if (puntajes) {
      idxSet.forEach(idx => { puntajes[idx] = null; });
    }

    // Limpiar graded
    if (s.graded) {
      idxSet.forEach(idx => { delete s.graded[idx]; });
    }

    // Limpiar answers
    if (s.answers) {
      idxSet.forEach(idx => { delete s.answers[idx]; });
    }

    // Limpiar shuffleMap para que las opciones se vuelvan a mezclar
    if (s.shuffleMap) {
      idxSet.forEach(idx => { delete s.shuffleMap[idx]; });
    }

    // Quitar de answeredOrder
    if (Array.isArray(s.answeredOrder)) {
      s.answeredOrder = s.answeredOrder.filter(entry => {
        const idx = typeof entry === 'number' ? entry : (entry && entry.idx);
        return !idxSet.has(idx);
      });
    }

    // Quitar de unansweredOrder para que se remezclen
    if (Array.isArray(s.unansweredOrder)) {
      s.unansweredOrder = s.unansweredOrder.filter(idx => !idxSet.has(idx));
    }

    // Limpiar totalShown si estaba
    if (s.totalShown) {
      delete s.totalShown;
      const resultNode = document.getElementById(`resultado-total-${seccionId}`);
      if (resultNode) resultNode.innerHTML = '';
    }

    // Guardar en localStorage
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}

    // Refrescar displayOrder para que incluya los índices reiniciados como sin responder
    // (se regenera en la próxima llamada a generarCuestionario)
    if (typeof window.fbToast === 'function') {
      window.fbToast('↺ Página reiniciada', 'success');
    }
  }

  // ════════════════════════════════════════════════════════════════
  // HOOK EN generarCuestionario
  // Interceptamos la función original para usuarios no-admin.
  // ════════════════════════════════════════════════════════════════

  // Esperamos a que script.js haya definido generarCuestionario
  function _instalarHook() {
    const _generarOriginal = window.generarCuestionario;
    if (typeof _generarOriginal !== 'function') {
      // Reintentar brevemente si script.js aún no cargó
      setTimeout(_instalarHook, 50);
      return;
    }

    // También necesitamos exponer una función para renderizar una sola pregunta.
    // La inyectamos como hook en script.js a través de window._paginadorRenderPregunta.
    // Script.js ya hace esto en su renderPregunta interno — necesitamos exponerlo.
    // Lo hacemos wrapeando generarCuestionario para capturar el renderPregunta interno.
    _instalarHookRenderPregunta();

    window.generarCuestionario = function generarCuestionarioPaginado(seccionId) {
      const esAdmin = typeof window.fbIsAdmin === 'function' && window.fbIsAdmin();

      // Admin siempre ve todo en una sola hoja
      if (esAdmin) {
        return _generarOriginal.call(this, seccionId);
      }

      // Secciones sin paginación
      if (!_debePaginar(seccionId)) {
        return _generarOriginal.call(this, seccionId);
      }

      const preguntas = (window.preguntasPorSeccion || {})[seccionId];
      if (!preguntas || preguntas.length < PAGE_SIZE) {
        // Menos de 50 preguntas → sin paginación
        return _generarOriginal.call(this, seccionId);
      }

      // Necesitamos el displayOrder. Lo calculamos llamando al original en un
      // contenedor temporal (invisible), capturando el orden antes de renderizar.
      // Alternativa más limpia: script.js guarda el displayOrder en window._paginadorDisplayOrder.
      // Instalamos ese hook si aún no existe.
      if (window._paginadorDisplayOrderHookInstalled) {
        // El hook ya está instalado, el displayOrder fue capturado en el evento
        // generarCuestionario anterior. Intentar renderizar el paginador.
        const ok = _renderizarPaginador(seccionId);
        if (!ok) {
          // Si el paginador no pudo (displayOrder vacío), usar el original
          _generarOriginal.call(this, seccionId);
        }
      } else {
        // Primera vez: instalar el hook y luego llamar al original para capturar el displayOrder
        window._paginadorDisplayOrder = window._paginadorDisplayOrder || {};
        // Llamar al original primero para que genere el displayOrder (lo capturamos vía evento)
        _generarOriginal.call(this, seccionId);
        // El hook de displayOrder se instalará en _instalarHookRenderPregunta
        // y en el próximo ciclo se usará el paginador.
        // Por ahora, el original ya renderizó todo. El paginador tomará control en la próxima llamada.
      }
    };

    console.log('[PAGINADOR] Hook instalado sobre generarCuestionario');
  }

  // ── Instalar el hook que captura renderPregunta ───────────────
  // Script.js define renderPregunta como función interna (closure).
  // No podemos acceder a ella directamente.
  // Solución: usamos MutationObserver para capturar los divs .pregunta
  // que script.js inyecta, los clonamos y los usamos en el paginador.
  // 
  // Esto es transparente: script.js renderiza en el cont invisible,
  // el paginador toma esos elementos y los redistribuye en páginas.

  function _instalarHookRenderPregunta() {
    if (window._paginadorDisplayOrderHookInstalled) return;
    window._paginadorDisplayOrderHookInstalled = true;
    window._paginadorDisplayOrder = window._paginadorDisplayOrder || {};

    // Interceptar generarCuestionario para capturar el displayOrder
    // Esto lo logramos observando el DOM y leyendo los data-attrs que script.js pone.
    //
    // Estrategia limpia: en lugar de hacer renderPregunta manual,
    // dejamos que script.js renderice en el contenedor real,
    // luego capturamos todos los divs .pregunta y sus originalIdx,
    // y el paginador mueve los divs ya renderizados a las páginas correctas.

    const _generarOriginalRef = window.generarCuestionario;

    // Patch: generarCuestionario en dos fases:
    // FASE 1 (para usuario): renderizar todo → capturar → paginar
    window.generarCuestionario = function generarCuestionarioPaginadorFinal(seccionId) {
      const esAdmin = typeof window.fbIsAdmin === 'function' && window.fbIsAdmin();
      if (esAdmin || !_debePaginar(seccionId)) {
        return _generarOriginalRef.call(this, seccionId);
      }

      const preguntas = (window.preguntasPorSeccion || {})[seccionId];
      if (!preguntas || preguntas.length < PAGE_SIZE) {
        return _generarOriginalRef.call(this, seccionId);
      }

      // Fase 1: renderizar con el original en el contenedor real
      _generarOriginalRef.call(this, seccionId);

      // Fase 2: después de que script.js terminó de renderizar (usa chunks async),
      // observamos el contenedor y paginamos cuando esté listo.
      _esperarRenderYPaginar(seccionId);
    };

    console.log('[PAGINADOR] Hook de renderPregunta instalado (estrategia DOM capture)');
  }

  // ── Esperar que script.js termine el render chunked, luego paginar ──
  function _esperarRenderYPaginar(seccionId) {
    const cont = document.getElementById(`cuestionario-${seccionId}`);
    if (!cont) return;

    // Script.js usa chunks con setTimeout(renderChunk, 0).
    // Detectamos cuando terminó: desaparece el .chunk-progress spinner.
    let intentos = 0;
    const MAX_ESPERA = 300; // 30 segundos máx

    const check = setInterval(() => {
      intentos++;
      const spinner = cont.querySelector('.chunk-progress');
      const preguntas = cont.querySelectorAll('.pregunta');

      // Terminó cuando no hay spinner y hay preguntas renderizadas
      if (!spinner && preguntas.length > 0) {
        clearInterval(check);
        _capturarYPaginar(seccionId, cont, preguntas);
      } else if (intentos > MAX_ESPERA) {
        clearInterval(check);
        console.warn('[PAGINADOR] Timeout esperando render de', seccionId);
      }
    }, 100);
  }

  // ── Capturar divs renderizados por script.js y redistribuir en páginas ──
  function _capturarYPaginar(seccionId, cont, preguntasDivs) {
    // Extraer el displayOrder leyendo los IDs de los puntaje-div de cada pregunta
    // Script.js genera: id="puntaje-{seccionId}-{originalIdx}"
    const displayOrder = [];
    const divPorIdx    = new Map(); // originalIdx → div

    preguntasDivs.forEach(div => {
      const puntajeEl = div.querySelector(`[id^="puntaje-${seccionId}-"]`);
      if (!puntajeEl) return;
      const idParts   = puntajeEl.id.split(`puntaje-${seccionId}-`);
      const originalIdx = parseInt(idParts[1], 10);
      if (!isNaN(originalIdx)) {
        displayOrder.push(originalIdx);
        divPorIdx.set(originalIdx, div);
      }
    });

    if (displayOrder.length === 0) return;

    // Guardar el displayOrder para el paginador
    window._paginadorDisplayOrder = window._paginadorDisplayOrder || {};
    window._paginadorDisplayOrder[seccionId] = displayOrder;

    // Guardar el mapa de divs
    window._paginadorDivPorIdx = window._paginadorDivPorIdx || {};
    window._paginadorDivPorIdx[seccionId] = divPorIdx;

    // Instalar la función de render de pregunta individual (devuelve el div ya creado)
    window._paginadorRenderPregunta = function(sId, originalIdx, displayPosition) {
      const map = (window._paginadorDivPorIdx || {})[sId];
      if (!map) return null;
      const div = map.get(originalIdx);
      if (!div) return null;

      // Actualizar el número de posición visible
      const h3 = div.querySelector('h3');
      if (h3) {
        const textoActual  = h3.textContent || h3.innerText || '';
        // El formato es "N. Texto pregunta"
        const partes        = textoActual.match(/^[\d]+\.\s*([\s\S]*)/);
        const textoPregunta = partes ? partes[1] : textoActual;
        h3.textContent      = `${displayPosition + 1}. ${textoPregunta}`;
      }

      return div;
    };

    // Vaciar el contenedor (script.js ya renderizó todo ahí)
    cont.innerHTML = '';

    // Ahora sí: renderizar el paginador
    _renderizarPaginador(seccionId);
  }

  // ── También limpiar el displayOrder al reiniciar la sección ──
  const _reiniciarExamenOriginal = window.reiniciarExamen;
  if (typeof _reiniciarExamenOriginal === 'function') {
    window.reiniciarExamen = function(seccionId) {
      _resetPaginaActiva(seccionId);
      if (window._paginadorDisplayOrder) delete window._paginadorDisplayOrder[seccionId];
      if (window._paginadorDivPorIdx)    delete window._paginadorDivPorIdx[seccionId];
      _reiniciarExamenOriginal.call(this, seccionId);
    };
  }

  // ── Exponer para uso externo ──────────────────────────────────
  window._paginadorIrAPagina = function(seccionId, pag) {
    const wrapper = document.getElementById(`pag-wrapper-${seccionId}`);
    // Re-renderizar desde el top
    if (wrapper) {
      window.generarCuestionario(seccionId);
    }
  };

  // ── Arrancar ─────────────────────────────────────────────────
  // Esperamos a que script.js haya cargado y definido generarCuestionario
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _instalarHook);
  } else {
    _instalarHook();
  }

})();
