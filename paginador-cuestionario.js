// ════════════════════════════════════════════════════════════════
// paginador-cuestionario.js  — V25
// ────────────────────────────────────────────────────────────────
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
        border-radius:16px; min-width:176px;
        box-shadow:0 12px 40px rgba(0,0,0,0.45);
        backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);
        overflow:hidden;
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

    `;
    document.head.appendChild(st);
  }

  // ════════════════════════════════════════════════════════════════
  // FUNCIÓN PRINCIPAL: paginar una sección
  // ════════════════════════════════════════════════════════════════
  function _paginar(seccionId) {
    _estilos();

    const preguntas = (window.preguntasPorSeccion || {})[seccionId] || [];
    const cont = document.getElementById(`cuestionario-${seccionId}`);
    if (!cont || preguntas.length === 0) return false;

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
      wrapper.querySelector('#pag2-prev-t')?.addEventListener('click', () => irA(pag-1));
      wrapper.querySelector('#pag2-next-t')?.addEventListener('click', () => irA(pag+1));
      wrapper.querySelector('#pag2-prev-b')?.addEventListener('click', () => irA(pag-1));
      wrapper.querySelector('#pag2-next-b')?.addEventListener('click', () => irA(pag+1));
      wrapper.querySelector('#pag2-sig')?.addEventListener('click', () => {
        if (pag < totalPages-1) irA(pag+1);
        else if (typeof window.mostrarPuntuacionTotal === 'function')
          window.mostrarPuntuacionTotal(seccionId);
      });
      wrapper.querySelector('#pag2-reiniciar')?.addEventListener('click', () =>
        _modalReinicio(seccionId, pag, indicesPage, () => renderPagina(pag))
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

      // Si está expandido, reiniciar el auto-colapso
      const exp = document.getElementById('pag2-float-expanded');
      if (exp && exp.style.display === 'flex') {
        clearTimeout(_fw_timer);
        _fw_timer = setTimeout(_fwColapsar, 5000);
      } else {
        // Expandir brevemente para mostrar el cambio, luego colapsar
        _fwExpandir();
      }
    }

    // ── Mostrar/ocultar el widget ────────────────────────────────
    function _fwMostrar() {
      _fwInit();
      const w = document.getElementById('pag2-float-widget');
      if (w) w.style.display = 'block';
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
  // HOOK sobre generarCuestionario
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
