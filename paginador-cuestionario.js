// ════════════════════════════════════════════════════════════════
// paginador-cuestionario.js  — V27
// ────────────────────────────────────────────────────────────────
// V26: Corregido bug crítico: el contador 📊 y los colores de las pills
//      de páginas no visitadas se calculaban sobre puntajesPorSeccion,
//      que solo se popula al RENDERIZAR cada página. Las páginas no
//      visitadas aparecían como "pendiente" (azul) aunque estuvieran
//      completas, y el total global solo sumaba la página activa.
//      Fix: _prePoblarPuntajes() lee graded del state (localStorage)
//      y pre-rellena puntajesPorSeccion para TODOS los índices antes
//      de cualquier cálculo de stats. Costo: 0 lecturas de Firestore,
//      solo acceso a localStorage.
// V8: Al entrar al cuestionario siempre abre la primera página con preguntas pendientes.
//     Al navegar entre páginas (flechas, pills, botón Siguiente) hace scroll automático
//     al separador "> Continuá desde aquí" de la nueva página. Si la página está completa
//     o sin comenzar (sin separador), el scroll va al navbar top.
// para usuarios no-admin. Admin sigue viendo todo en una sola hoja.
//
// ARQUITECTURA V2:
//   Requiere que script.js exponga (agregado en script.js v17+):
//     window._getDisplayOrder(seccionId, total)      → array de índices
//     window._renderIndicesToCont(seccionId, indices) → renderiza esos índices
//   El paginador intercepta generarCuestionario(), calcula el displayOrder,
//   divide en páginas y llama _renderIndicesToCont con los índices
//   de la página activa. script.js hace el render real en el contenedor.
// ════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  const PAGE_SIZE      = 50;
  const PAGE_STATE_KEY = 'quiz_paginator_v1';

  // ── Secciones que NO se paginan ──────────────────────────────
  function _debePaginar(id) {
    if (!id) return false;
    if (id.startsWith('unico'))     return false;
    if (id.startsWith('uba'))       return false;
    if (id.startsWith('compilado')) return false;
    if (id === 'simulador')         return false;
    return true;
  }

  // ── Persistir página activa ───────────────────────────────────
  function _getPagina(seccionId) {
    try {
      const obj = JSON.parse(localStorage.getItem(PAGE_STATE_KEY) || '{}');
      return typeof obj[seccionId] === 'number' ? obj[seccionId] : 0;
    } catch (_) { return 0; }
  }
  function _setPagina(seccionId, p) {
    try {
      const obj = JSON.parse(localStorage.getItem(PAGE_STATE_KEY) || '{}');
      obj[seccionId] = p;
      localStorage.setItem(PAGE_STATE_KEY, JSON.stringify(obj));
    } catch (_) {}
  }

  // ── Estadísticas de una lista de índices ─────────────────────
  function _stats(seccionId, indices) {
    const puntajes = (window.puntajesPorSeccion || {})[seccionId] || [];
    let ok = 0, err = 0, pend = 0;
    indices.forEach(idx => {
      const v = puntajes[idx];
      if (v === 1) ok++; else if (v === 0) err++; else pend++;
    });
    return { ok, err, pend, total: indices.length };
  }

  function _estadoPagina(seccionId, indices) {
    const s = _stats(seccionId, indices);
    if (s.pend === s.total) return 'pendiente';
    if (s.pend === 0)       return 'completa';
    return 'parcial';
  }

  function _paginaLogica(seccionId, pages) {
    // Usar graded del state (disponible antes del render) en lugar de
    // puntajesPorSeccion, que se popula DESPUÉS de renderizar la página.
    // Esto garantiza que al entrar desde otro dispositivo o con localStorage
    // limpio se abra directamente la primera página con preguntas pendientes.
    const SK = window.STORAGE_KEY || 'quiz_state_v3';
    let graded = {};
    try {
      const s = JSON.parse(localStorage.getItem(SK) || '{}');
      graded = (s[seccionId] && s[seccionId].graded) ? s[seccionId].graded : {};
    } catch (_) {}
    for (let p = 0; p < pages.length; p++) {
      if (pages[p].some(i => !graded[i]))
        return p;
    }
    return pages.length - 1;
  }

  // ── Pills con ellipsis ────────────────────────────────────────
  function _pillsHTML(total, actual, estados) {
    const show = new Set(
      [0, total-1, actual-1, actual, actual+1].filter(p => p >= 0 && p < total)
    );
    const out = []; let prev = -1;
    for (let p = 0; p < total; p++) {
      if (!show.has(p)) continue;
      if (prev !== -1 && p > prev + 1)
        out.push(`<span class="pag2-pill pag2-pill-elipsis">…</span>`);
      const est = estados[p] || 'pendiente';
      const cls = ['pag2-pill',
        p === actual        ? 'pag2-pill-activa'   : '',
        est === 'completa'  ? 'pag2-pill-completa'  : '',
        est === 'parcial'   ? 'pag2-pill-parcial'   : ''
      ].filter(Boolean).join(' ');
      out.push(`<button class="${cls}" data-pag="${p}" title="Página ${p+1}">${p+1}</button>`);
      prev = p;
    }
    return out.join('');
  }

  // ── Reiniciar respuestas de una página ────────────────────────
  function _reiniciarPagina(seccionId, indices) {
    const SK = window.STORAGE_KEY || 'quiz_state_v3';
    let state = {};
    try { state = JSON.parse(localStorage.getItem(SK) || '{}'); } catch (_) {}
    const s = state[seccionId];
    if (!s) return;
    const set = new Set(indices);
    const puntajes = (window.puntajesPorSeccion || {})[seccionId];
    if (puntajes) set.forEach(i => { puntajes[i] = null; });
    ['graded','answers','shuffleMap'].forEach(k => {
      if (s[k]) set.forEach(i => { delete s[k][i]; });
    });
    if (Array.isArray(s.answeredOrder)) {
      s.answeredOrder = s.answeredOrder.filter(e => {
        const idx = typeof e === 'number' ? e : (e?.idx ?? -1);
        return !set.has(idx);
      });
    }
    // FIX: al reiniciar, congelar el orden actual de las preguntas de esta página
    // (agregar los índices de vuelta a unansweredOrder en el orden que ya tenían,
    //  para que no se re-aleatoricen hasta que se completen las 50 preguntas).
    if (Array.isArray(s.unansweredOrder)) {
      // Quitar del unansweredOrder los índices que vamos a reinsertar
      s.unansweredOrder = s.unansweredOrder.filter(i => !set.has(i));
    } else {
      s.unansweredOrder = [];
    }
    // Insertar los índices de la página en el mismo orden que los venía mostrando el paginador
    // (los recibimos ya ordenados en el array `indices` que pasó el paginador)
    s.unansweredOrder = [...indices, ...s.unansweredOrder];
    // Marcar que este unansweredOrder está congelado para esta página específica
    // (el flag shuffleFrozen evita que getDisplayOrder vuelva a aleatorizar)
    s.shuffleFrozen = true;

    try { localStorage.setItem(SK, JSON.stringify(state)); } catch (_) {}
    if (typeof window.fbToast === 'function') window.fbToast('↺ Página reiniciada — el orden de preguntas se mantuvo', 'success');
  }

  // ── Modal de reinicio ─────────────────────────────────────────
  function _modalReinicio(seccionId, pag, indices, onConfirm) {
    // FIX: solo permitir reiniciar si la página fue completamente respondida
    const s = _stats(seccionId, indices);
    if (s.pend > 0) {
      if (typeof window.fbToast === 'function') {
        window.fbToast(
          `⚠️ Debés completar las ${s.pend} preguntas restantes antes de reiniciar esta página`,
          'error'
        );
      }
      return; // no abrir el modal
    }

    if (typeof window.fbInjectAuthStyles === 'function') window.fbInjectAuthStyles();
    document.getElementById('pag2-modal-overlay')?.remove();
    const ov = document.createElement('div');
    ov.id = 'pag2-modal-overlay';
    ov.innerHTML = `
      <div id="pag2-modal-box">
        <div class="pag2-mr-icono">🔄</div>
        <div class="pag2-mr-titulo">¿Reiniciar esta página?</div>
        <div class="pag2-mr-msg">
          Se borrarán las respuestas de las
          <strong style="color:#f1f5f9">${indices.length} preguntas</strong>
          de la página ${pag+1}.<br><br>
          <span style="color:#64748b;font-size:0.82rem">El progreso del resto de la especialidad no se ve afectado.</span>
        </div>
        <div class="pag2-mr-btns">
          <button id="pag2-mr-cancelar">Cancelar</button>
          <button id="pag2-mr-confirmar">↺ Reiniciar página</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    document.getElementById('pag2-mr-cancelar').onclick  = () => ov.remove();
    document.getElementById('pag2-mr-confirmar').onclick = () => {
      ov.remove();
      _reiniciarPagina(seccionId, indices);
      if (onConfirm) onConfirm();
    };
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
  }

  // ── Inyectar estilos ──────────────────────────────────────────
  function _estilos() {
    if (document.getElementById('pag2-styles')) return;
    const st = document.createElement('style');
    st.id = 'pag2-styles';
    st.textContent = `
      .pag2-wrapper { width:100%; }

      /* ── Navbar: SIEMPRE estático (top y bottom iguales) ── */
      .pag2-navbar {
        display:flex; align-items:center; justify-content:space-between;
        gap:8px; padding:10px 14px;
        border:1px solid rgba(56,189,248,0.18); border-radius:14px;
        background:rgba(13,33,55,0.95);
        margin-bottom:6px; flex-wrap:wrap;
        box-shadow:0 2px 12px rgba(0,0,0,0.25); box-sizing:border-box;
        position:static;
      }
      .pag2-nav-left,.pag2-nav-right { display:flex;align-items:center;gap:6px;flex-shrink:0; }
      .pag2-nav-center { display:flex;align-items:center;gap:4px;flex-wrap:wrap;justify-content:center;flex:1;min-width:0; }

      /* ── Pills: color de fondo completo según estado ── */
      .pag2-pill {
        display:inline-flex;align-items:center;justify-content:center;
        min-width:32px;height:32px;border-radius:8px;
        border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);
        font-size:13px;color:#94a3b8;padding:0 8px;cursor:pointer;
        transition:background .15s,border-color .15s,color .15s,transform .1s;
        font-family:inherit;font-weight:600;user-select:none;
      }
      .pag2-pill:hover:not(.pag2-pill-activa):not(.pag2-pill-completa):not(.pag2-pill-parcial) {
        background:rgba(255,255,255,0.12);border-color:rgba(255,255,255,0.28);color:#e2e8f0;
      }
      /* Página activa: azul teal sólido */
      .pag2-pill-activa {
        background:linear-gradient(135deg,#0d7490,#0891b2);
        border-color:#0891b2;color:#fff;font-weight:700;
        box-shadow:0 3px 10px rgba(8,145,178,0.45);
        transform:scale(1.08);
      }
      /* Página completamente respondida: verde sólido */
      .pag2-pill-completa {
        background:linear-gradient(135deg,#059669,#10b981);
        border-color:#10b981;color:#fff;font-weight:700;
      }
      .pag2-pill-completa:hover { filter:brightness(1.1); }
      /* Página en progreso: amarillo/ámbar sólido */
      .pag2-pill-parcial {
        background:linear-gradient(135deg,#b45309,#d97706);
        border-color:#d97706;color:#fff;font-weight:700;
      }
      .pag2-pill-parcial:hover { filter:brightness(1.1); }
      /* Activa sobre completa o parcial: borde blanco extra para destacarla */
      .pag2-pill-activa.pag2-pill-completa,
      .pag2-pill-activa.pag2-pill-parcial {
        box-shadow:0 0 0 2.5px #fff, 0 3px 12px rgba(0,0,0,0.4);
        transform:scale(1.1);
      }
      .pag2-pill-elipsis {
        min-width:20px;border:none;background:transparent;
        cursor:default;color:#64748b;padding:0 2px;pointer-events:none;
      }

      .pag2-btn {
        display:inline-flex;align-items:center;gap:5px;padding:7px 13px;
        border-radius:9px;border:1px solid rgba(255,255,255,0.13);
        background:rgba(255,255,255,0.05);color:#94a3b8;
        font-size:13px;cursor:pointer;font-family:inherit;font-weight:500;
        white-space:nowrap;transition:background .15s,border-color .15s,color .15s;user-select:none;
      }
      .pag2-btn:hover:not(:disabled) { background:rgba(255,255,255,0.12);border-color:rgba(255,255,255,0.28);color:#e2e8f0; }
      .pag2-btn:disabled { opacity:.28;cursor:default; }
      .pag2-info-row { display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:6px; }
      .pag2-leyenda { display:flex;gap:12px;align-items:center;font-size:11px;color:#64748b;flex-wrap:wrap; }
      .pag2-leyenda-item { display:flex;align-items:center;gap:4px; }
      .pag2-leyenda-dot { width:7px;height:7px;border-radius:50%;flex-shrink:0; }
      .pag2-total-info { font-size:11px;color:#64748b; }
      .pag2-progress-wrap { height:3px;border-radius:99px;background:rgba(255,255,255,0.07);overflow:hidden;margin-bottom:14px; }
      .pag2-progress-fill { height:100%;border-radius:99px;background:linear-gradient(90deg,#0891b2,#38bdf8);transition:width .4s ease; }
      .pag2-page-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px; }
      .pag2-page-title { font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em; }
      .pag2-page-stats { display:flex;gap:6px;align-items:center;flex-wrap:wrap; }
      .pag2-badge { font-size:11px;padding:3px 9px;border-radius:20px;font-weight:600;white-space:nowrap; }
      .pag2-badge-ok   { background:rgba(52,211,153,.12);color:#34d399;border:1px solid rgba(52,211,153,.25); }
      .pag2-badge-err  { background:rgba(248,113,113,.10);color:#f87171;border:1px solid rgba(248,113,113,.25); }
      .pag2-badge-pend { background:rgba(251,191,36,.10);color:#fbbf24;border:1px solid rgba(251,191,36,.25); }

      /* ── Separador "Continuá desde aquí": centrado y vistoso ── */
      .pag2-separador {
        display:flex; align-items:center; justify-content:center;
        gap:10px; margin:28px 0 22px;
        animation:pag2SepIn .4s ease .1s both;
      }
      @keyframes pag2SepIn {
        from { opacity:0; transform:translateY(8px); }
        to   { opacity:1; transform:translateY(0); }
      }
      .pag2-separador::before,
      .pag2-separador::after {
        content:''; flex:1; height:2px;
        background:linear-gradient(90deg,transparent,rgba(251,191,36,0.5));
        border-radius:2px;
      }
      .pag2-separador::after {
        background:linear-gradient(90deg,rgba(251,191,36,0.5),transparent);
      }
      .pag2-sep-etiqueta {
        display:inline-flex; align-items:center; gap:8px;
        background:linear-gradient(135deg,#92400e,#b45309);
        color:#fef3c7; border-radius:100px;
        padding:8px 20px 8px 16px;
        font-size:0.82rem; font-weight:700;
        letter-spacing:0.04em; white-space:nowrap;
        box-shadow:0 4px 16px rgba(180,83,9,0.45), 0 1px 4px rgba(0,0,0,0.2);
        user-select:none;
      }
      .pag2-sep-etiqueta svg { flex-shrink:0; opacity:0.9; }

      .pag2-footer {
        display:flex;align-items:center;justify-content:space-between;
        gap:10px;margin-top:18px;padding-top:14px;
        border-top:1px solid rgba(255,255,255,.07);flex-wrap:wrap;
      }
      .pag2-btn-reiniciar {
        display:inline-flex;align-items:center;gap:5px;padding:8px 14px;
        border-radius:9px;border:1px solid rgba(230,126,34,.3);background:rgba(230,126,34,.07);
        color:#e67e22;font-size:13px;cursor:pointer;font-family:inherit;font-weight:500;
        transition:background .15s,border-color .15s;
      }
      .pag2-btn-reiniciar:hover { background:rgba(230,126,34,.16);border-color:rgba(230,126,34,.55); }
      .pag2-footer-der { display:flex;align-items:center;gap:8px;flex-wrap:wrap; }
      .pag2-resp-label { font-size:12px;color:#64748b; }
      .pag2-btn-siguiente {
        display:inline-flex;align-items:center;gap:5px;padding:9px 20px;
        border-radius:10px;border:none;background:linear-gradient(135deg,#0d7490,#0891b2);
        color:#fff;font-size:.9rem;font-weight:700;cursor:pointer;font-family:inherit;
        box-shadow:0 4px 14px rgba(13,116,144,.35);transition:all .18s ease;white-space:nowrap;
      }
      .pag2-btn-siguiente:hover { opacity:.88;transform:translateY(-1px);box-shadow:0 6px 20px rgba(13,116,144,.45); }
      .pag2-btn-siguiente:disabled { opacity:.4;cursor:default;transform:none;box-shadow:none; }
      /* Navbar bottom: igual al top (ambos estáticos) */
      .pag2-navbar-bottom { margin-top:18px; }
      #pag2-modal-overlay {
        position:fixed;inset:0;z-index:25000;display:flex;align-items:center;justify-content:center;
        background:rgba(10,22,40,.88);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);
        animation:pag2FI .18s ease both;
      }
      @keyframes pag2FI { from{opacity:0} to{opacity:1} }
      #pag2-modal-box {
        background:linear-gradient(160deg,#0d2137,#0a1628);border:1.5px solid rgba(255,255,255,.1);
        border-radius:18px;padding:30px 28px 24px;max-width:440px;width:92%;box-sizing:border-box;
        box-shadow:0 30px 80px rgba(0,0,0,.6);animation:pag2BI .24s cubic-bezier(.34,1.2,.64,1) both;font-family:inherit;
      }
      @keyframes pag2BI { from{opacity:0;transform:scale(.88) translateY(20px)} to{opacity:1;transform:scale(1) translateY(0)} }
      #pag2-modal-box .pag2-mr-icono { font-size:2.2rem;text-align:center;margin-bottom:16px; }
      #pag2-modal-box .pag2-mr-titulo { font-size:1.05rem;font-weight:700;color:#f1f5f9;text-align:center;margin-bottom:10px; }
      #pag2-modal-box .pag2-mr-msg { font-size:.86rem;color:#94a3b8;line-height:1.6;text-align:center;margin-bottom:22px; }
      #pag2-modal-box .pag2-mr-btns { display:flex;gap:10px; }
      #pag2-mr-cancelar {
        flex:1;padding:10px 0;border-radius:10px;border:1.5px solid rgba(148,163,184,.25);
        background:rgba(255,255,255,.04);color:#94a3b8;font-size:.9rem;font-weight:600;
        cursor:pointer;font-family:inherit;transition:background .15s;
      }
      #pag2-mr-cancelar:hover { background:rgba(255,255,255,.09); }
      #pag2-mr-confirmar {
        flex:1;padding:10px 0;border-radius:10px;border:none;
        background:linear-gradient(135deg,#e67e22,#ca6f1e);
        color:#fff;font-size:.9rem;font-weight:700;cursor:pointer;font-family:inherit;
        box-shadow:0 4px 14px rgba(230,126,34,.3);transition:opacity .15s;
      }
      #pag2-mr-confirmar:hover { opacity:.88; }

      /* ════ WIDGET FLOTANTE por página ════ */
      #pag2-float-widget {
        position:fixed; bottom:56px; right:14px; z-index:9989;
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
        user-select:none;
        resize:none;
        touch-action:none;
      }
      #pag2-float-widget * {
        resize:none;
        box-sizing:border-box;
      }
      #pag2-float-collapsed {
        display:flex; align-items:center; gap:6px;
        background:rgba(13,33,55,0.96);
        border:1px solid rgba(56,189,248,0.28);
        border-radius:100px; padding:7px 13px 7px 10px;
        cursor:pointer;
        box-shadow:0 4px 18px rgba(0,0,0,0.35);
        backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px);
        transition:border-color .2s,box-shadow .2s,transform .1s;
        white-space:nowrap;
      }
      #pag2-float-collapsed:active { transform:scale(0.95); }
      #pag2-float-collapsed.pag2-fw-pulse {
        border-color:rgba(56,189,248,0.75);
        box-shadow:0 0 0 3px rgba(56,189,248,0.18),0 4px 18px rgba(0,0,0,0.35);
      }
      .pag2-fw-page-pill { font-size:11px;font-weight:700;color:#7dd3fc;letter-spacing:.02em; }
      .pag2-fw-sep       { color:rgba(148,163,184,0.35);font-size:10px; }
      .pag2-fw-ok-mini   { font-size:12px;font-weight:800;color:#34d399; }
      .pag2-fw-err-mini  { font-size:12px;font-weight:800;color:#f87171; }

      #pag2-float-expanded {
        display:none; flex-direction:column;
        background:rgba(10,22,40,0.97);
        border:1px solid rgba(56,189,248,0.22);
        border-radius:16px; width:176px; min-width:176px; max-width:176px;
        box-shadow:0 12px 40px rgba(0,0,0,0.45);
        backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);
        overflow:hidden;
        resize:none;
        transform-origin:bottom right;
        animation:pag2FwIn .22s cubic-bezier(.34,1.3,.64,1) both;
      }
      @keyframes pag2FwIn {
        from{opacity:0;transform:scale(.82) translateY(8px);}
        to  {opacity:1;transform:scale(1)   translateY(0);}
      }
      #pag2-float-expanded.pag2-fw-out {
        animation:pag2FwOut .16s ease-in forwards;
      }
      @keyframes pag2FwOut {
        from{opacity:1;transform:scale(1)   translateY(0);}
        to  {opacity:0;transform:scale(.86) translateY(6px);}
      }
      .pag2-fw-header {
        display:flex; align-items:center; justify-content:space-between;
        padding:10px 12px 8px;
        border-bottom:1px solid rgba(255,255,255,0.06); cursor:pointer;
      }
      .pag2-fw-titulo  { font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#475569; }
      .pag2-fw-pagina  { font-size:14px;font-weight:800;color:#7dd3fc;line-height:1.1; }
      .pag2-fw-xbtn {
        background:rgba(255,255,255,0.06); border:none; border-radius:6px;
        color:#64748b; font-size:13px; line-height:1; padding:3px 6px;
        cursor:pointer; transition:background .15s,color .15s; font-family:inherit;
      }
      .pag2-fw-xbtn:hover { background:rgba(255,255,255,0.12);color:#94a3b8; }
      /* ── Scroll-based visibility ── */
      #pag2-float-widget {
        transition: opacity .25s ease, transform .25s ease, visibility .25s;
      }
      #pag2-float-widget.pag2-fw-hidden {
        opacity: 0;
        transform: translateY(12px);
        pointer-events: none;
        visibility: hidden;
      }

      .pag2-fw-body { padding:10px 12px 12px; display:flex; flex-direction:column; gap:8px; }
      .pag2-fw-stats-row { display:grid; grid-template-columns:1fr 1fr 1fr; gap:5px; }
      .pag2-fw-stat {
        background:rgba(255,255,255,0.04); border-radius:8px; padding:6px 4px;
        text-align:center; border:1px solid rgba(255,255,255,0.06);
      }
      .pag2-fw-num       { font-size:1.1rem;font-weight:800;line-height:1; }
      .pag2-fw-num.total { color:#7dd3fc; }
      .pag2-fw-num.ok    { color:#34d399; }
      .pag2-fw-num.err   { color:#f87171; }
      .pag2-fw-lbl { font-size:9px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:.05em;margin-top:2px; }
      .pag2-fw-barra-wrap { height:5px;background:rgba(255,255,255,0.07);border-radius:99px;overflow:hidden; }
      .pag2-fw-barra-fill {
        height:100%; border-radius:99px;
        background:linear-gradient(90deg,#0891b2,#38bdf8);
        transition:width .4s ease;
      }
      .pag2-fw-barra-fill.done { background:linear-gradient(90deg,#059669,#34d399); }
      .pag2-fw-fraccion { font-size:10px;color:#475569;text-align:center;font-weight:600;margin-top:-2px; }
      .pag2-fw-fraccion b { color:#94a3b8; }

      /* ── Botón Tempo ── */
      .pag2-btn-tempo {
        display:inline-flex;align-items:center;gap:4px;padding:2px 9px;
        border-radius:5px;border:1px solid rgba(239,68,68,0.5);
        background:rgba(239,68,68,0.1);color:#ef4444;font-size:11px;font-weight:600;
        cursor:pointer;font-family:inherit;letter-spacing:.01em;
        transition:background .15s,border-color .15s,color .15s;white-space:nowrap;
      }
      .pag2-btn-tempo:hover { background:rgba(239,68,68,0.2);border-color:rgba(239,68,68,.75); }
      .pag2-btn-tempo.tempo-activo {
        border-color:rgba(34,197,94,0.6);background:rgba(34,197,94,0.12);color:#22c55e;
      }
      .pag2-btn-tempo.tempo-activo:hover { background:rgba(34,197,94,0.22);border-color:rgba(34,197,94,.85); }

      /* ── Ventana flotante del temporizador ── */
      #pag2-timer-widget {
        position:fixed;top:8px;right:8px;z-index:9500;
        width:auto;
        background:rgba(10,22,40,0.88);
        border:1px solid rgba(56,189,248,0.18);
        border-radius:10px;
        box-shadow:0 2px 12px rgba(0,0,0,0.45);
        font-family:inherit;
        overflow:hidden;
        transition:opacity .22s, transform .22s, visibility .22s;
        user-select:none;
        backdrop-filter:blur(8px);
        -webkit-backdrop-filter:blur(8px);
      }
      #pag2-timer-widget.timer-oculto {
        opacity:0;transform:translateY(-6px) scale(0.94);pointer-events:none;visibility:hidden;
      }
      .ptw-header {
        display:flex;align-items:center;justify-content:space-between;gap:8px;
        padding:4px 8px 3px;
        border-bottom:1px solid rgba(255,255,255,0.05);
        cursor:move;
      }
      .ptw-titulo { font-size:8px;font-weight:700;color:#3d5a6e;text-transform:uppercase;letter-spacing:.08em; }
      .ptw-drag-hint { font-size:7px;color:#1a3040;letter-spacing:.02em; }
      .ptw-body { padding:3px 10px 6px;text-align:center; }
      .ptw-display {
        font-size:1.05rem;font-weight:800;letter-spacing:.04em;line-height:1;
        font-variant-numeric:tabular-nums;
        transition:color .4s;
        color:#38bdf8;
        white-space:nowrap;
      }
      .ptw-display.timer-verde   { color:#34d399; }
      .ptw-display.timer-naranja { color:#fb923c; }
      .ptw-display.timer-rojo    { color:#f87171; }
      .ptw-display.timer-critico {
        color:#ef4444;
        animation:timerParpadeo .6s step-end infinite;
      }
      @keyframes timerParpadeo { 0%,100%{opacity:1} 50%{opacity:.35} }
      .ptw-label { font-size:7px;color:#2d4455;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin-top:1px; }
      .ptw-barra-wrap { height:2px;background:rgba(255,255,255,0.07);border-radius:99px;overflow:hidden;margin-top:5px; }
      .ptw-barra-fill {
        height:100%;border-radius:99px;
        background:linear-gradient(90deg,#0891b2,#38bdf8);
        transition:width .9s linear, background .5s;
      }
      .ptw-barra-fill.verde   { background:linear-gradient(90deg,#059669,#34d399); }
      .ptw-barra-fill.naranja { background:linear-gradient(90deg,#b45309,#fb923c); }
      .ptw-barra-fill.rojo    { background:linear-gradient(90deg,#b91c1c,#f87171); }
      .ptw-pagina { font-size:7px;color:#1e3345;text-align:center;margin-top:3px;font-weight:600; }
      .ptw-lock-msg {
        font-size:7px;color:#fbbf24;text-align:center;margin-top:2px;
        display:none;
        animation:ptwLockPulse 2s ease-in-out infinite;
      }
      @keyframes ptwLockPulse { 0%,100%{opacity:.7} 50%{opacity:1} }

      /* ── Modal tiempo agotado ── */
      #pag2-timer-modal {
        position:fixed;inset:0;z-index:26000;display:flex;align-items:center;justify-content:center;
        background:rgba(5,10,20,.92);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
        animation:pag2FI .2s ease both;
      }
      #pag2-timer-modal-box {
        background:linear-gradient(160deg,#0d2137,#0a1628);
        border:1.5px solid rgba(239,68,68,0.35);
        border-radius:20px;padding:32px 28px 26px;max-width:420px;width:92%;box-sizing:border-box;
        box-shadow:0 30px 80px rgba(0,0,0,.7), 0 0 40px rgba(239,68,68,0.15);
        animation:pag2BI .26s cubic-bezier(.34,1.2,.64,1) both;font-family:inherit;
        text-align:center;
      }
      .ptm-icono { font-size:2.8rem;margin-bottom:14px; }
      .ptm-titulo { font-size:1.1rem;font-weight:800;color:#f1f5f9;margin-bottom:8px; }
      .ptm-sub { font-size:.84rem;color:#94a3b8;line-height:1.6;margin-bottom:22px; }
      .ptm-btns { display:flex;flex-direction:column;gap:10px; }
      .ptm-btn-continuar {
        padding:12px 20px;border-radius:11px;border:1.5px solid rgba(251,191,36,0.35);
        background:rgba(251,191,36,0.08);color:#fbbf24;
        font-size:.88rem;font-weight:700;cursor:pointer;font-family:inherit;
        transition:background .15s,border-color .15s;
      }
      .ptm-btn-continuar:hover { background:rgba(251,191,36,0.18);border-color:rgba(251,191,36,.65); }
      .ptm-btn-reiniciar {
        padding:12px 20px;border-radius:11px;border:1.5px solid rgba(239,68,68,0.35);
        background:rgba(239,68,68,0.08);color:#f87171;
        font-size:.88rem;font-weight:700;cursor:pointer;font-family:inherit;
        transition:background .15s,border-color .15s;
      }
      .ptm-btn-reiniciar:hover { background:rgba(239,68,68,0.18);border-color:rgba(239,68,68,.65); }

      /* ── Toast de advertencia del timer ── */
      .pag2-timer-toast {
        position:fixed;top:18px;left:50%;transform:translateX(-50%) translateY(-80px);
        z-index:27000;
        padding:12px 22px;border-radius:12px;
        font-family:inherit;font-size:.9rem;font-weight:700;
        box-shadow:0 8px 32px rgba(0,0,0,.5);
        transition:transform .35s cubic-bezier(.34,1.2,.64,1), opacity .35s;
        opacity:0;pointer-events:none;white-space:nowrap;
        border:1.5px solid transparent;
      }
      .pag2-timer-toast.visible {
        transform:translateX(-50%) translateY(0);opacity:1;
      }
      .pag2-timer-toast.t-verde   { background:#064e3b;color:#34d399;border-color:rgba(52,211,153,.3); }
      .pag2-timer-toast.t-naranja { background:#431407;color:#fb923c;border-color:rgba(251,146,60,.3); }
      .pag2-timer-toast.t-rojo    { background:#450a0a;color:#f87171;border-color:rgba(248,113,113,.3); }

    `;
    document.head.appendChild(st);
  }

  // ════════════════════════════════════════════════════════════════
  // _prePoblarPuntajes
  // Lee el estado graded desde localStorage y pre-rellena
  // puntajesPorSeccion para todos los índices de la sección.
  // Esto permite calcular stats y colores de pills correctamente
  // para páginas que aún no fueron renderizadas (no visitadas).
  // Costo: 0 lecturas de Firestore. Solo usa localStorage.
  // ════════════════════════════════════════════════════════════════
  function _prePoblarPuntajes(seccionId, totalPreguntas) {
    const SK = window.STORAGE_KEY || 'quiz_state_v3';
    let graded = {}, answers = {}, shuffleMap = {};
    try {
      const s = JSON.parse(localStorage.getItem(SK) || '{}');
      const sec = s[seccionId] || {};
      graded    = sec.graded    || {};
      answers   = sec.answers   || {};
      shuffleMap = sec.shuffleMap || {};
    } catch (_) { return; }

    if (!window.puntajesPorSeccion) window.puntajesPorSeccion = {};
    if (!window.puntajesPorSeccion[seccionId]) {
      window.puntajesPorSeccion[seccionId] = Array(totalPreguntas).fill(null);
    }

    const preguntas = (window.preguntasPorSeccion || {})[seccionId] || [];
    const puntajes  = window.puntajesPorSeccion[seccionId];

    for (let idx = 0; idx < totalPreguntas; idx++) {
      // Si ya tiene valor (fue renderizada y restaurada), no sobreescribir
      if (puntajes[idx] !== null && puntajes[idx] !== undefined) continue;
      // Si no está en graded, sigue pendiente
      if (!graded[idx]) continue;

      // Determinar si fue correcta o incorrecta
      const preg = preguntas[idx];
      if (!preg) continue;

      const respGuardadas = answers[idx] || [];   // índices mezclados elegidos
      const mInv = shuffleMap[idx];               // mapa mixed→original

      let seleccionOriginal;
      if (mInv) {
        seleccionOriginal = respGuardadas.map(i => mInv[i] ?? i).sort((a, b) => a - b);
      } else {
        // Sin shuffleMap → examen único/UBA o identidad
        seleccionOriginal = respGuardadas.slice().sort((a, b) => a - b);
      }

      const correctaOriginal = (preg.correcta || []).slice().sort((a, b) => a - b);
      const isCorrect = JSON.stringify(seleccionOriginal) === JSON.stringify(correctaOriginal);
      puntajes[idx] = isCorrect ? 1 : 0;
    }
  }

  // ════════════════════════════════════════════════════════════════
  // FUNCIÓN PRINCIPAL: paginar una sección
  // ════════════════════════════════════════════════════════════════
  function _paginar(seccionId) {
    _estilos();

    const preguntas = (window.preguntasPorSeccion || {})[seccionId] || [];
    const cont = document.getElementById(`cuestionario-${seccionId}`);
    if (!cont || preguntas.length === 0) return false;

    // ── Pre-poblar puntajesPorSeccion desde graded del state ────────────────
    // Esto garantiza que los colores de pills y el contador 📊 sean correctos
    // ANTES de renderizar, incluso para páginas que el usuario no visitó aún.
    _prePoblarPuntajes(seccionId, preguntas.length);

    // Obtener displayOrder desde script.js (respondidas primero + aleatorias)
    const displayOrder = window._getDisplayOrder(seccionId, preguntas.length);
    if (!displayOrder || displayOrder.length === 0) return false;

    const totalPages = Math.ceil(displayOrder.length / PAGE_SIZE);
    if (totalPages <= 1) return false;

    // Dividir en páginas
    const pages = [];
    for (let p = 0; p < totalPages; p++)
      pages.push(displayOrder.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE));

    // Página inicial: SIEMPRE la primera con preguntas pendientes al entrar al cuestionario.
    const paginaInicial = _paginaLogica(seccionId, pages);

    // ── Render de una página ─────────────────────────────────────
    function renderPagina(pag) {
      _setPagina(seccionId, pag);

      const indicesPage = pages[pag];
      const puntajes    = (window.puntajesPorSeccion || {})[seccionId] || [];
      const estados     = pages.map(pg => _estadoPagina(seccionId, pg));
      const st          = _stats(seccionId, indicesPage);

      const totalResp = displayOrder.filter(i => {
        const v = puntajes[i]; return v !== null && v !== undefined;
      }).length;
      const pctGlobal = Math.round((totalResp / displayOrder.length) * 100);
      const inicio    = pag * PAGE_SIZE + 1;
      const fin       = Math.min((pag + 1) * PAGE_SIZE, displayOrder.length);
      const respEnPag = st.ok + st.err;

      // ── Vaciar contenedor ──
      cont.innerHTML = '';

      // ── Wrapper principal ──
      const wrapper = document.createElement('div');
      wrapper.className = 'pag2-wrapper';
      wrapper.id = `pag2-wrapper-${seccionId}`;
      cont.appendChild(wrapper);

      // ── Navbar top ──
      const navTop = document.createElement('div');
      navTop.className = 'pag2-navbar';
      navTop.id = `pag2-nav-${seccionId}`;
      navTop.innerHTML = `
        <div class="pag2-nav-left">
          <button class="pag2-btn" id="pag2-prev-t" ${pag===0?'disabled':''}>← Anterior</button>
        </div>
        <div class="pag2-nav-center">${_pillsHTML(totalPages,pag,estados)}</div>
        <div class="pag2-nav-right">
          <button class="pag2-btn" id="pag2-next-t" ${pag===totalPages-1?'disabled':''}>Siguiente →</button>
        </div>`;
      wrapper.appendChild(navTop);

      // ── Info + leyenda ──
      const infoEl = document.createElement('div');
      infoEl.className = 'pag2-info-row';
      infoEl.innerHTML = `
        <div class="pag2-leyenda">
          <div class="pag2-leyenda-item"><span class="pag2-leyenda-dot" style="background:linear-gradient(135deg,#059669,#10b981)"></span><span>Completa</span></div>
          <div class="pag2-leyenda-item"><span class="pag2-leyenda-dot" style="background:linear-gradient(135deg,#b45309,#d97706)"></span><span>En progreso</span></div>
          <div class="pag2-leyenda-item"><span class="pag2-leyenda-dot" style="background:rgba(255,255,255,.18)"></span><span>Sin comenzar</span></div>
          <button id="pag2-reordenar-${seccionId}" title="Reordenar las preguntas respondidas para que queden todas juntas al inicio"
            style="display:inline-flex;align-items:center;gap:4px;padding:2px 9px;
                   border-radius:5px;border:1px solid rgba(251,191,36,0.35);
                   background:none;color:#fbbf24;font-size:11px;font-weight:600;
                   cursor:pointer;font-family:inherit;letter-spacing:.01em;
                   transition:background .15s,border-color .15s;white-space:nowrap;">
            🔧 Reordenar
          </button>
          <button id="pag2-tempo-btn-${seccionId}"
            class="pag2-btn-tempo${_timerEsActivo(seccionId) ? ' tempo-activo' : ''}"
            title="${_timerEsActivo(seccionId) ? 'Temporizador activo — clic para desactivar' : 'Activar temporizador de 60 min'}">
            ⏱️ Tempo
          </button>
        </div>
        <div class="pag2-total-info">${displayOrder.length} preguntas · ${totalPages} páginas</div>`;
      wrapper.appendChild(infoEl);

      // ── Progreso global ──
      const progEl = document.createElement('div');
      progEl.className = 'pag2-progress-wrap';
      progEl.innerHTML = `<div class="pag2-progress-fill" style="width:${pctGlobal}%"></div>`;
      wrapper.appendChild(progEl);

      // ── Cabecera de página ──
      // NOTA: st se recalcula DESPUÉS del render (ver más abajo) porque
      // puntajesPorSeccion se popula dentro de _renderIndicesToCont →
      // restoreSelectionsAndGrades. Si usamos st aquí el badge siempre
      // mostraría "50 restantes" aunque las preguntas ya estén respondidas.
      const headerEl = document.createElement('div');
      headerEl.className = 'pag2-page-header';
      headerEl.innerHTML = `
        <div class="pag2-page-title">Página ${pag+1} · Preguntas ${inicio}–${fin}</div>
        <div class="pag2-page-stats" id="pag2-stats-${seccionId}">
          <span class="pag2-badge pag2-badge-pend">…</span>
        </div>`;
      wrapper.appendChild(headerEl);

      // ── Zona de preguntas con separador ──
      // Crear contenedor temporal que recibirá los divs de script.js
      // script.js agrega los divs directamente a cont mediante cont.appendChild
      // Capturamos los divs ANTES y DESPUÉS de la llamada
      const antesRender = cont.children.length;

      // Llamar a script.js para renderizar estos índices
      // posOffset: preguntas antes de esta página, para numeración correlativa (pág 4 → 151-200)
      window._renderIndicesToCont(seccionId, indicesPage, pag * PAGE_SIZE);

      // Los nuevos divs fueron agregados por script.js al final de cont
      const nuevosHijos = Array.from(cont.children).slice(antesRender);

      // Ahora puntajesPorSeccion está populado por restoreSelectionsAndGrades.
      // Recalcular stats con valores reales y actualizar el header.
      const puntajesActualizados = (window.puntajesPorSeccion || {})[seccionId] || [];
      const stReal = _stats(seccionId, indicesPage);
      const statsDiv = document.getElementById(`pag2-stats-${seccionId}`);
      if (statsDiv) {
        statsDiv.innerHTML =
          (stReal.ok   > 0 ? `<span class="pag2-badge pag2-badge-ok">✓ ${stReal.ok} correctas</span>`    : '') +
          (stReal.err  > 0 ? `<span class="pag2-badge pag2-badge-err">✗ ${stReal.err} incorrectas</span>` : '') +
          (stReal.pend > 0 ? `<span class="pag2-badge pag2-badge-pend">${stReal.pend} restantes</span>`   : '') +
          (stReal.pend === 0 ? `<span class="pag2-badge pag2-badge-ok">✓ Página completada</span>`         : '');
      }
      // ── Inicializar widget flotante con esta página ──
      if (typeof window._fwSetContext === 'function') {
        window._fwSetContext(seccionId, pag, totalPages, pages);
      }
      if (typeof window._fwActualizarStats === 'function') {
        window._fwActualizarStats(seccionId);
      }

      // ── Restaurar timer si estaba activo ──
      if (_timerEsActivo(seccionId)) {
        _timerWidgetMostrar(seccionId);
        const d = _timerLoad();
        const k = _timerKey(seccionId, pag);
        if (d[k] && !d[k + '__agotado']) {
          const seg = _timerSegundosRestantes(seccionId, pag);
          _timerWidgetActualizar(seccionId, pag, seg);
          if (!window._timerInterval && seg > 0) _timerIniciarTick(seccionId, pag);
          else if (seg === 0) _timerModalAgotado(seccionId, pag);
        } else if (!d[k]) {
          // Página nueva: resetear display
          _timerWidgetActualizar(seccionId, pag, TIMER_DURACION);
        }
      } else {
        _timerWidgetOcultar();
      }

      const primeraSinRespPos = indicesPage.findIndex(i => {
        const v = puntajesActualizados[i]; return v === null || v === undefined;
      });

      // Crear zona de preguntas
      const pregsZona = document.createElement('div');
      pregsZona.id = `pag2-pregs-${seccionId}`;

      nuevosHijos.forEach((div, pos) => {
        // Insertar separador antes de la primera sin responder (si no es la pos 0)
        if (pos === primeraSinRespPos && primeraSinRespPos > 0) {
          const sep = document.createElement('div');
          sep.className = 'pag2-separador';
          sep.setAttribute('id', `pag2-sep-${seccionId}`);
          sep.innerHTML = `
            <div class="pag2-sep-etiqueta">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
              Continuá desde aquí
            </div>`;
          pregsZona.appendChild(sep);
        }
        pregsZona.appendChild(div); // mover el div desde cont al pregsZona
      });

      wrapper.appendChild(pregsZona);

      // ── Footer ──
      const footerEl = document.createElement('div');
      footerEl.className = 'pag2-footer';
      footerEl.innerHTML = `
        <button class="pag2-btn-reiniciar" id="pag2-reiniciar">↺ Reiniciar esta página</button>
        <div class="pag2-footer-der">
          <span class="pag2-resp-label">${respEnPag}/${st.total} respondidas</span>
          ${pag < totalPages-1
            ? `<button class="pag2-btn-siguiente" id="pag2-sig">Siguiente página →</button>`
            : `<button class="pag2-btn-siguiente" id="pag2-sig" ${st.pend>0?'disabled':''}>Ver resultado de especialidad →</button>`
          }
        </div>`;
      wrapper.appendChild(footerEl);

      // ── Navbar bottom ──
      const navBot = document.createElement('div');
      navBot.className = 'pag2-navbar pag2-navbar-bottom';
      navBot.innerHTML = `
        <div class="pag2-nav-left">
          <button class="pag2-btn" id="pag2-prev-b" ${pag===0?'disabled':''}>← Anterior</button>
        </div>
        <div class="pag2-nav-center">${_pillsHTML(totalPages,pag,estados)}</div>
        <div class="pag2-nav-right">
          <button class="pag2-btn" id="pag2-next-b" ${pag===totalPages-1?'disabled':''}>Siguiente →</button>
        </div>`;
      wrapper.appendChild(navBot);

      // ── Conectar eventos ──
      function irA(p) {
        if (p < 0 || p >= totalPages) return;
        renderPagina(p);
        // Scroll automático al separador "> Continuá desde aquí" de la nueva página.
        // Si no hay separador (página completa o sin responder), scroll al navbar top.
        setTimeout(() => _scrollAlSeparador(8), 80);
      }

      // ── Recalcular estados de pills DESPUÉS de restoreSelectionsAndGrades ──
      // puntajesPorSeccion ya fue poblado por el render; recalculamos los colores
      // de los botones de todas las páginas (correcto tanto desde menú como desde F5).
      const estadosActualizados = pages.map(pg => _estadoPagina(seccionId, pg));
      const pillsNuevo = _pillsHTML(totalPages, pag, estadosActualizados);
      [navTop, navBot].forEach(nav => {
        const center = nav.querySelector('.pag2-nav-center');
        if (center) center.innerHTML = pillsNuevo;
      });

      // ── Conectar clicks en todas las pills (top + bottom) ──
      wrapper.querySelectorAll('.pag2-pill[data-pag]').forEach(pill =>
        pill.addEventListener('click', () => irA(parseInt(pill.dataset.pag, 10)))
      );
      wrapper.querySelector('#pag2-prev-t')?.addEventListener('click', () => _irAConLock(pag-1));
      wrapper.querySelector('#pag2-next-t')?.addEventListener('click', () => _irAConLock(pag+1));
      wrapper.querySelector('#pag2-prev-b')?.addEventListener('click', () => _irAConLock(pag-1));
      wrapper.querySelector('#pag2-next-b')?.addEventListener('click', () => _irAConLock(pag+1));
      wrapper.querySelector('#pag2-sig')?.addEventListener('click', () => {
        if (pag < totalPages-1) {
          _irAConLock(pag+1);
        } else if (typeof window.mostrarPuntuacionTotal === 'function')
          window.mostrarPuntuacionTotal(seccionId);
      });
      wrapper.querySelector('#pag2-reiniciar')?.addEventListener('click', () =>
        _modalReinicio(seccionId, pag, indicesPage, () => renderPagina(pag))
      );

      // ── Conectar botón "Tempo⏱️" ──
      const btnTempo = wrapper.querySelector(`#pag2-tempo-btn-${seccionId}`);
      if (btnTempo) {
        btnTempo.addEventListener('click', () => {
          if (_timerEsActivo(seccionId)) {
            _timerDesactivar(seccionId);
          } else {
            _timerActivar(seccionId);
          }
          // Re-render solo el botón sin recargar página
          const activo = _timerEsActivo(seccionId);
          btnTempo.className = 'pag2-btn-tempo' + (activo ? ' tempo-activo' : '');
          btnTempo.title = activo ? 'Temporizador activo — clic para desactivar' : 'Activar temporizador de 60 min';
          // Sincronizar todos los botones Tempo de la página (top e info)
          document.querySelectorAll(`[id^="pag2-tempo-btn-"]`).forEach(b => {
            b.className = 'pag2-btn-tempo' + (activo ? ' tempo-activo' : '');
          });
        });
      }

      // ── Bloquear navegación entre páginas si el timer está corriendo ──
      function _irAConLock(p) {
        if (_timerEstaCorriendo(seccionId)) {
          if (typeof window.fbToast === 'function')
            window.fbToast('⏱️ El temporizador está activo — no podés navegar a otra página hasta que termine', 'error');
          return;
        }
        irA(p);
      }
      wrapper.querySelectorAll('.pag2-pill[data-pag]').forEach(pill =>
        pill.addEventListener('click', (e) => {
          e.stopImmediatePropagation();
          _irAConLock(parseInt(pill.dataset.pag, 10));
        }, true)
      );

      // ── Conectar botón "🔧 Reordenar" de la leyenda ──
      const btnReordenarLeyenda = wrapper.querySelector(`#pag2-reordenar-${seccionId}`);
      if (btnReordenarLeyenda) {
        btnReordenarLeyenda.addEventListener('mouseenter', () => {
          btnReordenarLeyenda.style.background = 'rgba(251,191,36,0.12)';
          btnReordenarLeyenda.style.borderColor = 'rgba(251,191,36,0.65)';
        });
        btnReordenarLeyenda.addEventListener('mouseleave', () => {
          btnReordenarLeyenda.style.background = 'none';
          btnReordenarLeyenda.style.borderColor = 'rgba(251,191,36,0.35)';
        });
        btnReordenarLeyenda.addEventListener('click', () => {
          if (typeof window._ejecutarConsolidacion === 'function') {
            window._ejecutarConsolidacion();
          } else if (typeof _ejecutarConsolidacion === 'function') {
            _ejecutarConsolidacion();
          }
        });
      }

      // ── Actualizar label del botón "📊" en la barra inferior ──
      // FIX: usar el total GLOBAL de la sección, no solo el de la página actual
      if (typeof window._ubActualizarLabelProgreso === 'function') {
        const stGlobal = _stats(seccionId, displayOrder);
        window._ubActualizarLabelProgreso(stGlobal.ok + stGlobal.err, stGlobal.total);
      }

    } // fin renderPagina

    // ── _pag2UpdateStats: actualiza stats y pills SIN re-renderizar la página ──
    // Llamado desde script.js después de cada respuesta (window._pag2UpdateStats).
    // Solo actualiza los widgets del DOM en la página activa.
    window._pag2UpdateStats = function(sid) {
      if (sid !== seccionId) return;

      // Recalcular stats de la página actual
      const indicesActuales = pages[_getPagina(seccionId)] || [];
      const stAct = _stats(sid, indicesActuales);

      // Actualizar badge de stats
      const statsDiv = document.getElementById(`pag2-stats-${sid}`);
      if (statsDiv) {
        statsDiv.innerHTML =
          (stAct.ok   > 0 ? `<span class="pag2-badge pag2-badge-ok">✓ ${stAct.ok} correctas</span>`    : '') +
          (stAct.err  > 0 ? `<span class="pag2-badge pag2-badge-err">✗ ${stAct.err} incorrectas</span>` : '') +
          (stAct.pend > 0 ? `<span class="pag2-badge pag2-badge-pend">${stAct.pend} restantes</span>`   : '') +
          (stAct.pend === 0 ? `<span class="pag2-badge pag2-badge-ok">✓ Página completada</span>`        : '');
      }

      // Actualizar label del footer
      const respLabel = document.querySelector(`#pag2-wrapper-${sid} .pag2-resp-label`);
      if (respLabel) respLabel.textContent = `${stAct.ok + stAct.err}/${stAct.total} respondidas`;

      // ── FIX: reposicionar el separador "Continuá desde aquí" ──
      // Al responder una pregunta, la primera sin responder cambia de posición.
      const pregsZona = document.getElementById(`pag2-pregs-${sid}`);
      if (pregsZona) {
        // Quitar el separador anterior si existe
        const sepViejo = document.getElementById(`pag2-sep-${sid}`);
        if (sepViejo) sepViejo.remove();

        const puntajesActuales = (window.puntajesPorSeccion || {})[sid] || [];
        const primeraSinRespPos = indicesActuales.findIndex(i => {
          const v = puntajesActuales[i]; return v === null || v === undefined;
        });

        // Solo insertar separador si hay una primera sin responder y no es la pos 0
        if (primeraSinRespPos > 0) {
          // Los hijos de pregsZona son los divs de pregunta (pueden tener el sep ya removido)
          // Filtrar solo los divs de pregunta (excluir el separador)
          const divPregs = Array.from(pregsZona.children).filter(el => !el.classList.contains('pag2-separador'));
          const divDestino = divPregs[primeraSinRespPos];
          if (divDestino) {
            const sep = document.createElement('div');
            sep.className = 'pag2-separador';
            sep.setAttribute('id', `pag2-sep-${sid}`);
            sep.innerHTML = `
              <div class="pag2-sep-etiqueta">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" stroke-width="2.5"
                  stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
                Continuá desde aquí
              </div>`;
            pregsZona.insertBefore(sep, divDestino);
          }
        }
      }

      // Recalcular estados de todas las páginas y repintar pills (top + bottom)
      const estadosNuevos = pages.map(pg => _estadoPagina(sid, pg));
      const pagActiva = _getPagina(sid);
      const pillsNuevoHTML = _pillsHTML(totalPages, pagActiva, estadosNuevos);
      document.querySelectorAll(`#pag2-wrapper-${sid} .pag2-nav-center`).forEach(c => {
        c.innerHTML = pillsNuevoHTML;
        c.querySelectorAll('.pag2-pill[data-pag]').forEach(pill =>
          pill.addEventListener('click', () => {
            const p = parseInt(pill.dataset.pag, 10);
            if (p < 0 || p >= totalPages) return;
            if (_timerEstaCorriendo(sid)) {
              if (typeof window.fbToast === 'function')
                window.fbToast('⏱️ El temporizador está activo — no podés navegar a otra página hasta que termine', 'error');
              return;
            }
            renderPagina(p);
            setTimeout(() => _scrollAlSeparador(8), 80);
          })
        );
      });

      // ── Actualizar label "📊 N/50" en la barra inferior ──
      // FIX: usar el total GLOBAL de la sección, no solo el de la página actual
      if (typeof window._ubActualizarLabelProgreso === 'function') {
        const stGlobal = _stats(sid, displayOrder);
        window._ubActualizarLabelProgreso(stGlobal.ok + stGlobal.err, stGlobal.total);
      }

      // ── Actualizar widget flotante ──
      if (typeof window._fwActualizarStats === 'function') {
        window._fwActualizarStats(sid);
      }
    };

    // ── _pag2IrAQIndex: API pública para navegar a una pregunta por qIndex ────
    // Usado por el buscador global (buscadorNavegar) para ir a la página correcta
    // del paginador antes de hacer scroll a la pregunta destino.
    // Devuelve true si navegó, false si qIndex no está en displayOrder.
    window._pag2IrAQIndex = function(sid, qIndex, onReady) {
      if (sid !== seccionId) return false;
      // Buscar en qué página del displayOrder está este qIndex
      const posEnDisplay = displayOrder.indexOf(qIndex);
      if (posEnDisplay === -1) return false;
      const paginaDestino = Math.floor(posEnDisplay / PAGE_SIZE);
      renderPagina(paginaDestino);
      // Llamar onReady después de que el DOM se haya actualizado
      setTimeout(() => { if (typeof onReady === 'function') onReady(); }, 120);
      return true;
    };

    renderPagina(paginaInicial);

    // Scroll automático a la primera sin responder — funciona en TODOS los casos
    // de entrada: navegación desde menú, F5, recarga directa por URL/hash.
    // Usamos un retry con delays crecientes porque _renderIndicesToCont es asíncrono
    // (renderiza en lotes con setTimeout) y el separador puede no estar en el DOM aún.
    function _scrollAlSeparador(intentos) {
      const sep = document.getElementById(`pag2-sep-${seccionId}`);
      if (sep) {
        sep.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      // Sin separador pero aún esperando el render completo: reintentar
      if (intentos > 0) {
        setTimeout(() => _scrollAlSeparador(intentos - 1), 200);
        return;
      }
      // Sin separador definitivo: o todas respondidas, o ninguna respondida aún.
      const nav = document.getElementById(`pag2-nav-${seccionId}`);
      if (nav) nav.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setTimeout(() => _scrollAlSeparador(6), 120);  // hasta ~1.3s de espera total

    return true;
  }


  // ════════════════════════════════════════════════════════════════
  // WIDGET FLOTANTE — mini contador por página
  // Muestra página actual + correctas/incorrectas/respondidas.
  // Colapsado por defecto; se expande al tocar; se auto-colapsa.
  // Se actualiza en tiempo real desde _pag2UpdateStats.
  // ════════════════════════════════════════════════════════════════
  (function () {
    let _fw_timer   = null;  // auto-colapso
    let _fw_seccion = null;  // sección activa
    let _fw_pag     = 0;
    let _fw_total   = 0;
    let _fw_pages   = null;

    // ── Crear DOM del widget (una sola vez) ───────────────────
    function _fwInit() {
      if (document.getElementById('pag2-float-widget')) return;
      const w = document.createElement('div');
      w.id = 'pag2-float-widget';
      w.innerHTML = `
        <div id="pag2-float-collapsed" title="Ver stats de esta página">
          <span class="pag2-fw-page-pill" id="pag2-fw-col-pag">Pág 1</span>
          <span class="pag2-fw-sep">|</span>
          <span class="pag2-fw-ok-mini"  id="pag2-fw-col-ok">0✓</span>
          <span class="pag2-fw-err-mini" id="pag2-fw-col-err">0✗</span>
        </div>
        <div id="pag2-float-expanded">
          <div class="pag2-fw-header" id="pag2-fw-hdr">
            <div>
              <div class="pag2-fw-titulo">Esta página</div>
              <div class="pag2-fw-pagina" id="pag2-fw-pagina">Pág 1 / 1</div>
            </div>
            <button class="pag2-fw-xbtn" id="pag2-fw-close">✕</button>
          </div>
          <div class="pag2-fw-body">
            <div class="pag2-fw-stats-row">
              <div class="pag2-fw-stat">
                <div class="pag2-fw-num total" id="pag2-fw-resp">0</div>
                <div class="pag2-fw-lbl">Resp.</div>
              </div>
              <div class="pag2-fw-stat">
                <div class="pag2-fw-num ok"  id="pag2-fw-ok">0</div>
                <div class="pag2-fw-lbl">Correctas</div>
              </div>
              <div class="pag2-fw-stat">
                <div class="pag2-fw-num err" id="pag2-fw-err">0</div>
                <div class="pag2-fw-lbl">Incorrectas</div>
              </div>
            </div>
            <div class="pag2-fw-barra-wrap">
              <div class="pag2-fw-barra-fill" id="pag2-fw-barra" style="width:0%"></div>
            </div>
            <div class="pag2-fw-fraccion" id="pag2-fw-fraccion">0 / 50</div>
          </div>
        </div>`;
      document.body.appendChild(w);

      // Toggle al tocar el colapsado
      document.getElementById('pag2-float-collapsed').addEventListener('click', _fwToggle);
      // Cerrar desde el header expandido
      document.getElementById('pag2-fw-hdr').addEventListener('click', _fwColapsar);
      document.getElementById('pag2-fw-close').addEventListener('click', e => {
        e.stopPropagation();
        _fwColapsar();
      });
    }

    // ── Scroll: mostrar al bajar, ocultar al subir ───────────────
    let _fw_lastScrollY = window.scrollY;
    let _fw_scrollBound = false;

    function _fwInitScroll() {
      if (_fw_scrollBound) return;
      _fw_scrollBound = true;
      window.addEventListener('scroll', () => {
        const w = document.getElementById('pag2-float-widget');
        if (!w || w.style.display === 'none') return;
        const currentY = window.scrollY;
        if (currentY > _fw_lastScrollY) {
          // Bajando → mostrar
          w.classList.remove('pag2-fw-hidden');
        } else {
          // Subiendo → ocultar
          w.classList.add('pag2-fw-hidden');
        }
        _fw_lastScrollY = currentY;
      }, { passive: true });
    }

    // ── Expandir ────────────────────────────────────────────────
    function _fwExpandir() {
      const col = document.getElementById('pag2-float-collapsed');
      const exp = document.getElementById('pag2-float-expanded');
      if (!col || !exp) return;
      col.style.display = 'none';
      exp.style.display = 'flex';
      exp.classList.remove('pag2-fw-out');
      // Auto-colapso a los 5 segundos
      clearTimeout(_fw_timer);
      _fw_timer = setTimeout(_fwColapsar, 5000);
    }

    // ── Colapsar ────────────────────────────────────────────────
    function _fwColapsar() {
      clearTimeout(_fw_timer);
      const exp = document.getElementById('pag2-float-expanded');
      const col = document.getElementById('pag2-float-collapsed');
      if (!exp || !col) return;
      exp.classList.add('pag2-fw-out');
      setTimeout(() => {
        exp.style.display = 'none';
        exp.classList.remove('pag2-fw-out');
        col.style.display = 'flex';
      }, 160);
    }

    // ── Toggle ──────────────────────────────────────────────────
    function _fwToggle() {
      const exp = document.getElementById('pag2-float-expanded');
      if (!exp) return;
      if (exp.style.display === 'flex') _fwColapsar();
      else _fwExpandir();
    }

    // ── Actualizar datos ────────────────────────────────────────
    function _fwActualizar(ok, err, total, pagNum, totalPags) {
      const resp = ok + err;
      const pct  = total > 0 ? Math.round((resp / total) * 100) : 0;

      // Colapsado
      const colPag = document.getElementById('pag2-fw-col-pag');
      const colOk  = document.getElementById('pag2-fw-col-ok');
      const colErr = document.getElementById('pag2-fw-col-err');
      if (colPag) colPag.textContent = `Pág ${pagNum}/${totalPags}`;
      if (colOk)  colOk.textContent  = `${ok}✓`;
      if (colErr) colErr.textContent = `${err}✗`;

      // Expandido
      const elPag  = document.getElementById('pag2-fw-pagina');
      const elResp = document.getElementById('pag2-fw-resp');
      const elOk   = document.getElementById('pag2-fw-ok');
      const elErr  = document.getElementById('pag2-fw-err');
      const elBar  = document.getElementById('pag2-fw-barra');
      const elFrac = document.getElementById('pag2-fw-fraccion');
      if (elPag)  elPag.textContent  = `Pág ${pagNum} / ${totalPags}`;
      if (elResp) elResp.textContent = resp;
      if (elOk)   elOk.textContent   = ok;
      if (elErr)  elErr.textContent  = err;
      if (elBar)  {
        elBar.style.width = pct + '%';
        elBar.classList.toggle('done', resp === total && total > 0);
      }
      if (elFrac) elFrac.innerHTML = `<b>${resp}</b> / ${total} respondidas`;

      // Pulso en el colapsado para indicar cambio
      const col = document.getElementById('pag2-float-collapsed');
      if (col) {
        col.classList.add('pag2-fw-pulse');
        setTimeout(() => col.classList.remove('pag2-fw-pulse'), 600);
      }

      // Si ya está expandido, reiniciar el auto-colapso; si no, NO expandir
      const exp = document.getElementById('pag2-float-expanded');
      if (exp && exp.style.display === 'flex') {
        clearTimeout(_fw_timer);
        _fw_timer = setTimeout(_fwColapsar, 5000);
      }
    }

    // ── Mostrar/ocultar el widget ────────────────────────────────
    function _fwMostrar() {
      _fwInit();
      const w = document.getElementById('pag2-float-widget');
      if (w) {
        w.style.display = 'block';
        // Sincronizar estado inicial: oculto si el usuario está al tope de la página
        _fw_lastScrollY = window.scrollY;
        if (window.scrollY <= 10) {
          w.classList.add('pag2-fw-hidden');
        } else {
          w.classList.remove('pag2-fw-hidden');
        }
        _fwInitScroll();
      }
    }
    function _fwOcultar() {
      clearTimeout(_fw_timer);
      const w = document.getElementById('pag2-float-widget');
      if (w) { w.style.display = 'none'; }
    }

    // ── API pública (usada desde _pag2UpdateStats y renderPagina) ─
    window._fwSetContext = function(seccionId, pagNum, totalPags, pagesArr) {
      _fw_seccion = seccionId;
      _fw_pag     = pagNum;
      _fw_total   = totalPags;
      _fw_pages   = pagesArr;
      _fwMostrar();
    };

    window._fwActualizarStats = function(seccionId) {
      if (seccionId !== _fw_seccion || !_fw_pages) return;
      const indicesActuales = _fw_pages[_fw_pag] || [];
      const puntajes = (window.puntajesPorSeccion || {})[seccionId] || [];
      let ok = 0, err = 0;
      indicesActuales.forEach(i => {
        const v = puntajes[i];
        if (v === 1) ok++; else if (v === 0) err++;
      });
      _fwActualizar(ok, err, indicesActuales.length, _fw_pag + 1, _fw_total);
    };

    window._fwOcultar = _fwOcultar;
  })();

  // ════════════════════════════════════════════════════════════════
  // MOTOR DE TEMPORIZADOR — 60 min por página, por sección
  // ════════════════════════════════════════════════════════════════
  const TIMER_KEY = 'quiz_timer_v1';
  const TIMER_DURACION = 60 * 60; // segundos

  function _timerLoad() {
    try { return JSON.parse(localStorage.getItem(TIMER_KEY) || '{}'); }
    catch (_) { return {}; }
  }
  function _timerSave(obj) {
    try { localStorage.setItem(TIMER_KEY, JSON.stringify(obj)); } catch (_) {}
  }

  // Estado del timer para una sección + página
  function _timerKey(seccionId, pag) { return `${seccionId}__${pag}`; }

  // ¿Está el timer habilitado (botón verde) para esta sección?
  function _timerEsActivo(seccionId) {
    const d = _timerLoad();
    return !!(d['habilitado__' + seccionId]);
  }

  // ¿Está corriendo (inicio registrado) para seccion+pag?
  function _timerEstaCorriendo(seccionId) {
    const d = _timerLoad();
    const pagActual = _getPagina(seccionId);
    const k = _timerKey(seccionId, pagActual);
    return !!d[k] && !d[k + '__agotado'];
  }

  function _timerActivar(seccionId) {
    const d = _timerLoad();
    d['habilitado__' + seccionId] = true;
    _timerSave(d);
    _timerWidgetMostrar(seccionId);
  }

  function _timerDesactivar(seccionId) {
    const d = _timerLoad();
    delete d['habilitado__' + seccionId];
    // Detener tick activo
    if (window._timerInterval) { clearInterval(window._timerInterval); window._timerInterval = null; }
    _timerSave(d);
    _timerWidgetOcultar();
  }

  // Iniciar conteo para página actual (llamado al responder primera pregunta)
  function _timerIniciarSiCorresponde(seccionId) {
    if (!_timerEsActivo(seccionId)) return;
    const pagActual = _getPagina(seccionId);
    const k = _timerKey(seccionId, pagActual);
    const d = _timerLoad();
    if (d[k]) return; // ya iniciado
    d[k] = Date.now();
    _timerSave(d);
    _timerWidgetMostrar(seccionId);
    _timerIniciarTick(seccionId, pagActual);
  }

  // Segundos restantes para la página actual
  function _timerSegundosRestantes(seccionId, pag) {
    const d = _timerLoad();
    const k = _timerKey(seccionId, pag);
    if (!d[k]) return TIMER_DURACION;
    const elapsed = Math.floor((Date.now() - d[k]) / 1000);
    return Math.max(0, TIMER_DURACION - elapsed);
  }

  function _timerFmt(seg) {
    const h = Math.floor(seg / 3600);
    const m = Math.floor((seg % 3600) / 60);
    const s = seg % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  // Advertencias ya mostradas (para no repetir)
  const _timerAdvMostradas = {};

  function _timerToast(msg, cls) {
    let t = document.getElementById('pag2-timer-toast-el');
    if (!t) {
      t = document.createElement('div');
      t.id = 'pag2-timer-toast-el';
      t.className = 'pag2-timer-toast';
      document.body.appendChild(t);
    }
    t.className = `pag2-timer-toast ${cls}`;
    t.textContent = msg;
    // Forzar reflow
    void t.offsetWidth;
    t.classList.add('visible');
    clearTimeout(t._tt);
    t._tt = setTimeout(() => t.classList.remove('visible'), 4500);
  }

  function _timerIniciarTick(seccionId, pag) {
    if (window._timerInterval) clearInterval(window._timerInterval);
    const advKey = seccionId + '__' + pag;
    if (!_timerAdvMostradas[advKey]) _timerAdvMostradas[advKey] = {};

    window._timerInterval = setInterval(() => {
      const seg = _timerSegundosRestantes(seccionId, pag);
      _timerWidgetActualizar(seccionId, pag, seg);

      // Advertencias
      if (seg <= 30*60 && seg > 30*60-5 && !_timerAdvMostradas[advKey][30]) {
        _timerAdvMostradas[advKey][30] = true;
        _timerToast('⏱️ Quedan 30 minutos', 't-verde');
      }
      if (seg <= 15*60 && seg > 15*60-5 && !_timerAdvMostradas[advKey][15]) {
        _timerAdvMostradas[advKey][15] = true;
        _timerToast('⚠️ Quedan 15 minutos', 't-naranja');
      }
      if (seg <= 5*60 && seg > 5*60-5 && !_timerAdvMostradas[advKey][5]) {
        _timerAdvMostradas[advKey][5] = true;
        _timerToast('🔴 ¡Solo quedan 5 minutos!', 't-rojo');
      }

      if (seg === 0) {
        clearInterval(window._timerInterval);
        window._timerInterval = null;
        // Marcar como agotado
        const d = _timerLoad();
        d[_timerKey(seccionId, pag) + '__agotado'] = true;
        _timerSave(d);
        _timerWidgetActualizar(seccionId, pag, 0);
        _timerModalAgotado(seccionId, pag);
      }
    }, 1000);
  }

  // Crear / mostrar el widget flotante del timer
  function _timerWidgetMostrar(seccionId) {
    let w = document.getElementById('pag2-timer-widget');
    if (!w) {
      w = document.createElement('div');
      w.id = 'pag2-timer-widget';
      w.innerHTML = `
        <div class="ptw-header" id="ptw-header">
          <span class="ptw-titulo">⏱️ Tiempo</span>
          <span class="ptw-drag-hint">⠿ mover</span>
        </div>
        <div class="ptw-body">
          <div class="ptw-display" id="ptw-display">01:00:00</div>
          <div class="ptw-label">tiempo restante</div>
          <div class="ptw-barra-wrap"><div class="ptw-barra-fill" id="ptw-barra" style="width:100%"></div></div>
          <div class="ptw-pagina" id="ptw-pagina">Página —</div>
          <div class="ptw-lock-msg" id="ptw-lock">🔒 Navegación bloqueada</div>
        </div>`;
      document.body.appendChild(w);
      _timerWidgetDrag(w);
    }
    w.classList.remove('timer-oculto');

    // Si ya hay un tick activo para esta sección/pag, reiniciarlo
    const pagActual = _getPagina(seccionId);
    const d = _timerLoad();
    const k = _timerKey(seccionId, pagActual);
    if (d[k] && !d[k + '__agotado']) {
      const seg = _timerSegundosRestantes(seccionId, pagActual);
      _timerWidgetActualizar(seccionId, pagActual, seg);
      if (!window._timerInterval) _timerIniciarTick(seccionId, pagActual);
    } else {
      _timerWidgetActualizar(seccionId, pagActual, TIMER_DURACION);
    }
  }

  function _timerWidgetOcultar() {
    const w = document.getElementById('pag2-timer-widget');
    if (w) w.classList.add('timer-oculto');
  }

  function _timerWidgetActualizar(seccionId, pag, seg) {
    const disp = document.getElementById('ptw-display');
    const barra = document.getElementById('ptw-barra');
    const pagEl = document.getElementById('ptw-pagina');
    const lockEl = document.getElementById('ptw-lock');
    if (!disp) return;

    disp.textContent = _timerFmt(seg);
    const pct = (seg / TIMER_DURACION) * 100;
    if (barra) { barra.style.width = pct + '%'; }

    // Color del display y barra
    disp.className = 'ptw-display';
    if (barra) barra.className = 'ptw-barra-fill';
    if (seg > 30*60) {
      disp.classList.add('timer-verde');
      if (barra) barra.classList.add('verde');
    } else if (seg > 15*60) {
      disp.classList.add('timer-verde');
      if (barra) barra.classList.add('verde');
    } else if (seg > 5*60) {
      disp.classList.add('timer-naranja');
      if (barra) barra.classList.add('naranja');
    } else if (seg > 0) {
      disp.classList.add('timer-critico');
      if (barra) barra.classList.add('rojo');
    } else {
      disp.classList.add('timer-rojo');
      if (barra) barra.classList.add('rojo');
    }

    if (pagEl) pagEl.textContent = `Página ${pag + 1}`;
    if (lockEl) {
      lockEl.style.display = _timerEstaCorriendo(seccionId) ? 'block' : 'none';
    }
  }

  // Drag para mover el widget
  function _timerWidgetDrag(w) {
    const header = w.querySelector('#ptw-header');
    if (!header) return;
    let ox = 0, oy = 0, sx = 0, sy = 0;
    header.addEventListener('mousedown', e => {
      sx = e.clientX; sy = e.clientY;
      const rect = w.getBoundingClientRect();
      ox = rect.left; oy = rect.top;
      w.style.right = 'auto';
      w.style.bottom = 'auto';
      w.style.left = ox + 'px';
      w.style.top  = oy + 'px';
      const onMove = ev => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        w.style.left = (ox + dx) + 'px';
        w.style.top  = (oy + dy) + 'px';
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
    // Touch support
    header.addEventListener('touchstart', e => {
      const t = e.touches[0];
      sx = t.clientX; sy = t.clientY;
      const rect = w.getBoundingClientRect();
      ox = rect.left; oy = rect.top;
      w.style.right = 'auto'; w.style.bottom = 'auto';
      w.style.left = ox + 'px'; w.style.top = oy + 'px';
    }, { passive: true });
    header.addEventListener('touchmove', e => {
      const t = e.touches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      w.style.left = (ox + dx) + 'px';
      w.style.top  = (oy + dy) + 'px';
    }, { passive: true });
  }

  // Modal de tiempo agotado
  function _timerModalAgotado(seccionId, pag) {
    document.getElementById('pag2-timer-modal')?.remove();
    const ov = document.createElement('div');
    ov.id = 'pag2-timer-modal';
    ov.innerHTML = `
      <div id="pag2-timer-modal-box">
        <div class="ptm-icono">⏰</div>
        <div class="ptm-titulo">¡Se acabó el tiempo!</div>
        <div class="ptm-sub">
          Los 60 minutos para la <strong style="color:#f1f5f9">página ${pag + 1}</strong> terminaron.<br>
          Las preguntas que respondas a partir de ahora quedarán <em style="color:#fbbf24">fuera del tiempo del simulacro</em>.<br><br>
          ¿Qué querés hacer?
        </div>
        <div class="ptm-btns">
          <button class="ptm-btn-continuar" id="ptm-continuar">
            ✏️ Terminar de responder las preguntas restantes<br>
            <span style="font-size:.78rem;font-weight:400;opacity:.75">(fuera de tiempo — la página queda completa)</span>
          </button>
          <button class="ptm-btn-reiniciar" id="ptm-reiniciar">
            ↺ Reiniciar esta página<br>
            <span style="font-size:.78rem;font-weight:400;opacity:.75">(borra respuestas y vuelve a empezar)</span>
          </button>
        </div>
      </div>`;
    document.body.appendChild(ov);

    document.getElementById('ptm-continuar').onclick = () => {
      ov.remove();
      // Permitir seguir respondiendo — el timer queda en 00:00
      _timerWidgetActualizar(seccionId, pag, 0);
    };

    document.getElementById('ptm-reiniciar').onclick = () => {
      ov.remove();
      // Limpiar el estado del timer para esta página
      const d = _timerLoad();
      const k = _timerKey(seccionId, pag);
      delete d[k];
      delete d[k + '__agotado'];
      _timerSave(d);
      // Reiniciar respuestas de la página usando la función del paginador
      // Necesitamos la lista de índices — la obtenemos re-paginando
      const preguntas = (window.preguntasPorSeccion || {})[seccionId] || [];
      const displayOrder = window._getDisplayOrder ? window._getDisplayOrder(seccionId, preguntas.length) : [];
      const indices = displayOrder.slice(pag * PAGE_SIZE, (pag + 1) * PAGE_SIZE);
      _reiniciarPagina(seccionId, indices);
      // Resetear el timer del widget
      _timerWidgetActualizar(seccionId, pag, TIMER_DURACION);
      // Recargar la página del cuestionario
      if (typeof window.generarCuestionario === 'function') window.generarCuestionario(seccionId);
    };
  }

  // Hook sobre responderPregunta para iniciar el timer al responder primera pregunta
  function _instalarHookTimer() {
    const _origResp = window.responderPregunta;
    if (typeof _origResp !== 'function') { setTimeout(_instalarHookTimer, 50); return; }
    window.responderPregunta = function(seccionId, idx) {
      _origResp.call(this, seccionId, idx);
      _timerIniciarSiCorresponde(seccionId);
    };
  }
  _instalarHookTimer();

  // Al cambiar de sección / recargar, restaurar el timer si estaba activo
  window._timerRestaurarSiActivo = function(seccionId) {
    if (!_timerEsActivo(seccionId)) { _timerWidgetOcultar(); return; }
    _timerWidgetMostrar(seccionId);
    const pagActual = _getPagina(seccionId);
    const d = _timerLoad();
    const k = _timerKey(seccionId, pagActual);
    if (d[k] && !d[k + '__agotado']) {
      const seg = _timerSegundosRestantes(seccionId, pagActual);
      if (seg > 0) _timerIniciarTick(seccionId, pagActual);
      else _timerModalAgotado(seccionId, pagActual);
    }
  };

  // ════════════════════════════════════════════════════════════════
  // CIERRE AUTOMÁTICO DE EXPLICACIONES AL HACER SCROLL
  // Se aplica globalmente a todos los cuestionarios.
  // ════════════════════════════════════════════════════════════════
  (function() {
    let _explScroll = false;

    function _cerrarExplicacionesOcultas() {
      const explicaciones = document.querySelectorAll('.explicacion-contenedor[style*="block"]');
      if (!explicaciones.length) return;

      const vpTop    = window.scrollY;
      const vpBottom = vpTop + window.innerHeight;

      explicaciones.forEach(div => {
        const rect = div.getBoundingClientRect();
        const absTop    = rect.top + window.scrollY;
        const absBottom = absTop + rect.height;

        // ¿Está completamente fuera de la pantalla (por arriba)?
        if (absBottom < vpTop - 80) {
          div.style.display = 'none';
          // Actualizar el botón correspondiente
          const btnId = div.id.replace('explicacion-', 'btn-explicacion-');
          const btn = document.getElementById(btnId);
          if (btn && btn.textContent.includes('Ocultar')) {
            btn.textContent = 'Ver explicación';
          }
        }
      });
    }

    function _initExplScroll() {
      if (_explScroll) return;
      _explScroll = true;
      let ticking = false;
      window.addEventListener('scroll', () => {
        if (!ticking) {
          requestAnimationFrame(() => {
            _cerrarExplicacionesOcultas();
            ticking = false;
          });
          ticking = true;
        }
      }, { passive: true });
    }

    // Instalar cuando el DOM esté listo
    if (document.readyState === 'loading')
      document.addEventListener('DOMContentLoaded', _initExplScroll);
    else
      _initExplScroll();
  })();

  // ════════════════════════════════════════════════════════════════
  // FIX: "Continuá desde aquí" en Simulacro de Exámenes de Residencia
  // El simulador no pasa por _paginar(), su separador debe inyectarse
  // desde script.js. Parcheamos _pag2UpdateStats para cubrir también
  // las secciones sin paginación (simulador, unicos, uba).
  // ════════════════════════════════════════════════════════════════
  (function() {
    function _inyectarSepSimulacro(seccionId) {
      const cont = document.getElementById('cuestionario-' + seccionId);
      if (!cont) return;

      const preguntas = (window.preguntasPorSeccion || {})[seccionId] || [];
      if (!preguntas.length) return;

      const puntajes = (window.puntajesPorSeccion || {})[seccionId] || [];
      const displayOrder = window._getDisplayOrder ? window._getDisplayOrder(seccionId, preguntas.length) : [];
      if (!displayOrder.length) return;

      // Quitar separador existente
      const sepViejo = document.getElementById('sim-sep-' + seccionId);
      if (sepViejo) sepViejo.remove();

      // Encontrar primera pregunta sin responder
      const primeraSinRespIdx = displayOrder.findIndex(i => {
        const v = puntajes[i]; return v === null || v === undefined;
      });

      if (primeraSinRespIdx <= 0) return; // nada respondido aún, o todo completo

      // Encontrar el div de esa pregunta en el DOM
      const divDestino = cont.querySelector(`[id$="-${seccionId}-${displayOrder[primeraSinRespIdx]}"]`)
                      || cont.querySelector(`[data-idx="${displayOrder[primeraSinRespIdx]}"]`);
      if (!divDestino) return;

      const sep = document.createElement('div');
      sep.className = 'pag2-separador';
      sep.id = 'sim-sep-' + seccionId;
      sep.innerHTML = `
        <div class="pag2-sep-etiqueta">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          Continuá desde aquí
        </div>`;
      cont.insertBefore(sep, divDestino.closest('.pregunta-bloque') || divDestino);
    }

    // Parchear _pag2UpdateStats para secciones sin paginación
    const _orig2 = window._pag2UpdateStats;
    // Intentar parchear una vez que _pag2UpdateStats esté disponible
    function _parcharUpdateStats() {
      if (typeof window._pag2UpdateStats !== 'function') {
        setTimeout(_parcharUpdateStats, 50); return;
      }
      const _origU = window._pag2UpdateStats;
      window._pag2UpdateStats = function(seccionId) {
        _origU.call(this, seccionId);
        // Si la sección NO usa paginador, inyectar separador manualmente
        if (!_debePaginar(seccionId)) {
          _inyectarSepSimulacro(seccionId);
        }
      };
    }
    _parcharUpdateStats();
  })();

  // ════════════════════════════════════════════════════════════════
  // ════════════════════════════════════════════════════════════════
  function _instalarHook() {
    if (typeof window.generarCuestionario   !== 'function' ||
        typeof window._getDisplayOrder      !== 'function' ||
        typeof window._renderIndicesToCont  !== 'function') {
      setTimeout(_instalarHook, 30);
      return;
    }

    const _orig = window.generarCuestionario;

    window.generarCuestionario = function(seccionId) {
      // Ocultar widget flotante al cambiar de sección
      if (typeof window._fwOcultar === 'function') window._fwOcultar();
      // Ocultar timer si la nueva sección no lo tiene activo
      // y detener el tick del timer anterior
      if (window._timerInterval) { clearInterval(window._timerInterval); window._timerInterval = null; }
      _timerWidgetOcultar();
      const esAdmin = typeof window.fbIsAdmin === 'function' && window.fbIsAdmin();
      if (esAdmin)                return _orig.call(this, seccionId);
      if (!_debePaginar(seccionId)) return _orig.call(this, seccionId);
      const n = ((window.preguntasPorSeccion || {})[seccionId] || []).length;
      if (n <= PAGE_SIZE)         return _orig.call(this, seccionId);
      if (!_paginar(seccionId))   _orig.call(this, seccionId);
    };

    // Limpiar página guardada al reiniciar examen
    const _origRein = window.reiniciarExamen;
    if (typeof _origRein === 'function') {
      window.reiniciarExamen = function(seccionId) {
        try {
          const obj = JSON.parse(localStorage.getItem(PAGE_STATE_KEY) || '{}');
          delete obj[seccionId];
          localStorage.setItem(PAGE_STATE_KEY, JSON.stringify(obj));
        } catch (_) {}
        _origRein.call(this, seccionId);
      };
    }

    console.log('[PAGINADOR V2] ✓ Hook instalado');
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', _instalarHook);
  else
    _instalarHook();

})();
