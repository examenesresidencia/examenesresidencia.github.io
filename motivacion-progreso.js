// ════════════════════════════════════════════════════════════════
// motivacion-progreso.js  — v1
// ────────────────────────────────────────────────────────────────
// MÓDULO INDEPENDIENTE que mejora dos cosas sin tocar script.js:
//
//  1. PANEL "📊 Ver mi progreso" — amplía el panel existente con
//     dos pestañas:
//       • "📅 Por día"       → preguntas totales + ✓ correctas + ✗ incorrectas
//                              por día + racha + total acumulado
//       • "📋 Intentos"      → historial de intentos (comportamiento original)
//
//  2. MENSAJES DE MOTIVACIÓN — aparecen como toasts no bloqueantes en:
//       a. Al completar una página (hoja de 50 preguntas) en el paginador
//       b. Al completar cualquier cuestionario con ≤50 preguntas
//       c. Al llegar a milestones diarios: 50, 100, 150, 200… preguntas/día
//       d. Al completar una especialidad entera (raro, merece celebración)
//
// INSTALACIÓN:
//   En index.html, agregar después de paginador-cuestionario.js:
//   <script src="motivacion-progreso.js"></script>
// ════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── Claves de localStorage ────────────────────────────────────
  const ATTEMPT_LOG_KEY   = 'quiz_attempt_log_v1';
  const STORAGE_KEY       = 'quiz_state_v3';
  const MOT_SHOWN_KEY     = 'quiz_mot_paginas_v1';    // páginas ya celebradas (por intento)
  const MOT_MILESTONE_KEY = 'quiz_mot_milestones_v1'; // milestones diarios ya disparados
  // Tally diario: registra respuestas individuales (no solo al completar un cuestionario).
  // Estructura: { "YYYY-MM-DD": { total, ok, err } }
  const DAILY_TALLY_KEY   = 'quiz_daily_tally_v1';

  // ── Helpers ───────────────────────────────────────────────────
  function _loadJSON(key, def) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') ?? def; }
    catch (_) { return def; }
  }

  function _saveJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (_) {}
  }

  function _todayISO() {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function _toLocalDateStr(iso) {
    try {
      const d = new Date(iso + (iso.includes('T') ? '' : 'T12:00:00'));
      return d.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } catch (_) { return iso; }
  }

  // ════════════════════════════════════════════════════════════════
  // 1. PANEL "📊 Ver mi progreso" — mejorado con pestañas + resumen diario
  // ════════════════════════════════════════════════════════════════

  // ── Calcular datos diarios desde dailyTally + attemptLog ────
  // dailyTally: registra cada respuesta individual (especialidades paginadas).
  // attemptLog: registra al completar cuestionarios ≤50 / simulacro.
  // Se fusionan; si un día tiene datos en tally, ese día se usa del tally.
  function _calcularDiarios() {
    const tally = _loadJSON(DAILY_TALLY_KEY, {});
    const porDia = {};
    Object.keys(tally).forEach(dia => {
      const t = tally[dia];
      if (!porDia[dia]) porDia[dia] = { total: 0, ok: 0, err: 0 };
      porDia[dia].total += t.total || 0;
      porDia[dia].ok    += t.ok    || 0;
      porDia[dia].err   += t.err   || 0;
    });
    // Agregar attemptLog solo para días sin datos en tally (evita doble conteo)
    const log = _loadJSON(ATTEMPT_LOG_KEY, []);
    log.forEach(item => {
      const dia = (item.iso || '').substring(0, 10) || _todayISO();
      if (tally[dia]) return;
      if (!porDia[dia]) porDia[dia] = { total: 0, ok: 0, err: 0 };
      porDia[dia].total += item.total || 0;
      porDia[dia].ok    += item.score || 0;
      porDia[dia].err   += (item.total - item.score) || 0;
    });
    return porDia;
  }

  // ── Calcular racha de días consecutivos ─────────────────────
  function _calcularRacha(porDia) {
    const dias = Object.keys(porDia).sort().reverse(); // más reciente primero
    if (!dias.length) return 0;
    let racha = 0;
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
    // Verificar que el primer día sea hoy o ayer (si no: racha 0)
    const primero = new Date(dias[0] + 'T12:00:00');
    primero.setHours(0,0,0,0);
    if (primero < ayer) return 0;
    for (let i = 0; i < dias.length; i++) {
      const d = new Date(dias[i] + 'T12:00:00'); d.setHours(0,0,0,0);
      const esperado = new Date(hoy); esperado.setDate(esperado.getDate() - i);
      if (d.getTime() === esperado.getTime()) racha++;
      else break;
    }
    return racha;
  }

  // ── Calcular totales globales ────────────────────────────────
  function _calcularTotales(porDia) {
    let total = 0, ok = 0, err = 0;
    Object.values(porDia).forEach(d => { total += d.total; ok += d.ok; err += d.err; });
    return { total, ok, err };
  }

  // ── Inyectar estilos del panel mejorado ─────────────────────
  function _inyectarEstilosPanel() {
    if (document.getElementById('mp-panel-styles')) return;
    const s = document.createElement('style');
    s.id = 'mp-panel-styles';
    s.textContent = `
      /* ── Panel de progreso mejorado ── */
      #panel-progreso {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 13px;
        color: #1e293b;
      }

      /* ── Resumen rápido (siempre visible arriba) ── */
      .mp-resumen {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        margin-bottom: 12px;
        padding-bottom: 12px;
        border-bottom: 1px solid #e2e8f0;
      }
      .mp-stat-card {
        background: #f8fafc;
        border-radius: 10px;
        padding: 8px 6px;
        text-align: center;
        border: 1px solid #e2e8f0;
      }
      .mp-stat-num {
        font-size: 1.3rem;
        font-weight: 800;
        line-height: 1.1;
        color: #0d7490;
      }
      .mp-stat-num.ok  { color: #059669; }
      .mp-stat-num.err { color: #dc2626; }
      .mp-stat-label {
        font-size: 10px;
        color: #64748b;
        font-weight: 500;
        margin-top: 2px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      /* ── Racha ── */
      .mp-racha {
        display: flex;
        align-items: center;
        gap: 6px;
        background: linear-gradient(135deg, #fff7ed, #ffedd5);
        border: 1px solid #fed7aa;
        border-radius: 10px;
        padding: 7px 12px;
        margin-bottom: 12px;
        font-size: 12px;
        font-weight: 600;
        color: #92400e;
      }
      .mp-racha-num { font-size: 1.1rem; font-weight: 800; color: #ea580c; }
      .mp-racha.sin-racha { background: #f8fafc; border-color: #e2e8f0; color: #94a3b8; }
      .mp-racha.sin-racha .mp-racha-num { color: #94a3b8; }

      /* ── Pestañas ── */
      .mp-tabs {
        display: flex;
        gap: 4px;
        margin-bottom: 10px;
        border-bottom: 2px solid #e2e8f0;
        padding-bottom: 0;
      }
      .mp-tab {
        padding: 6px 12px;
        border: none;
        background: none;
        font-size: 12px;
        font-weight: 600;
        color: #64748b;
        cursor: pointer;
        border-bottom: 2px solid transparent;
        margin-bottom: -2px;
        border-radius: 4px 4px 0 0;
        transition: color 0.15s, border-color 0.15s;
        font-family: inherit;
      }
      .mp-tab:hover { color: #0d7490; background: #f0f9ff; }
      .mp-tab.activa { color: #0d7490; border-bottom-color: #0d7490; }

      /* ── Contenido de la pestaña activa ── */
      .mp-tab-content { display: none; }
      .mp-tab-content.activa { display: block; }

      /* ── Entrada diaria ── */
      .mp-dia-grupo { margin-bottom: 14px; }
      .mp-dia-header {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #475569;
        margin-bottom: 6px;
      }
      .mp-dia-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 10px 12px;
      }
      .mp-dia-nums {
        display: flex;
        gap: 12px;
        align-items: center;
        margin-bottom: 6px;
        flex-wrap: wrap;
      }
      .mp-dia-pill {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 100px;
      }
      .mp-dia-pill.total { background: #e0f2fe; color: #0369a1; }
      .mp-dia-pill.ok    { background: #dcfce7; color: #166534; }
      .mp-dia-pill.err   { background: #fee2e2; color: #991b1b; }
      /* Barra de aciertos */
      .mp-dia-barra {
        height: 5px;
        background: #e2e8f0;
        border-radius: 99px;
        overflow: hidden;
      }
      .mp-dia-barra-fill {
        height: 100%;
        border-radius: 99px;
        background: linear-gradient(90deg, #059669, #10b981);
        transition: width 0.4s ease;
      }

      /* ── Fila de intento (pestaña Historial) ── */
      .mp-intento-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 8px;
        border: 1px solid #eee;
        border-radius: 8px;
        margin-bottom: 5px;
        gap: 8px;
      }
      .mp-intento-titulo {
        font-size: 12px;
        color: #334155;
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .mp-intento-score {
        font-size: 12px;
        font-weight: 700;
        white-space: nowrap;
        padding: 2px 7px;
        border-radius: 6px;
      }
      .mp-intento-score.verde { background: #dcfce7; color: #166534; }
      .mp-intento-score.rojo  { background: #fee2e2; color: #991b1b; }
      .mp-intento-score.gris  { background: #f1f5f9; color: #475569; }

      /* ── Estado vacío ── */
      .mp-vacio {
        text-align: center;
        color: #94a3b8;
        font-size: 12px;
        padding: 20px 8px;
      }
      .mp-vacio-icon { font-size: 2rem; margin-bottom: 6px; }
    `;
    document.head.appendChild(s);
  }

  // ── Reemplazar buildProgressUI cuando esté disponible ────────
  function _instalarPanelMejorado() {
    const panel = document.getElementById('panel-progreso');
    const btnProgreso = document.getElementById('btn-ver-progreso');
    if (!panel || !btnProgreso) { setTimeout(_instalarPanelMejorado, 200); return; }

    _inyectarEstilosPanel();

    // Reemplazar el listener del botón
    const nuevoBtn = btnProgreso.cloneNode(true);
    btnProgreso.parentNode.replaceChild(nuevoBtn, btnProgreso);
    nuevoBtn.addEventListener('click', () => {
      _renderPanelMejorado();
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });

    // Conectar el botón Cerrar (ya existe en buildProgressUI original)
    // Se actualizará en _renderPanelMejorado
  }

  // ── Render del panel mejorado ────────────────────────────────
  function _renderPanelMejorado() {
    const panel = document.getElementById('panel-progreso');
    if (!panel) return;

    const porDia   = _calcularDiarios();
    const totales  = _calcularTotales(porDia);
    const racha    = _calcularRacha(porDia);
    const pctGlobal = totales.total > 0
      ? Math.round((totales.ok / totales.total) * 100) : 0;

    // ── Pestaña activa guardada ──
    let tabActiva = 'dia';
    const tabActuales = panel.querySelector('.mp-tab.activa');
    if (tabActuales) tabActiva = tabActuales.dataset.tab;

    panel.innerHTML = '';

    // ── Header ──
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;';
    header.innerHTML = `
      <strong style="font-size:14px;color:#0f172a;">📊 Mi progreso</strong>
      <div style="display:flex;gap:6px;align-items:center;">
        <button id="mp-trash" title="Borrar historial"
          style="border:none;background:none;cursor:pointer;font-size:1rem;padding:3px 6px;border-radius:6px;transition:background .15s;"
          onmouseenter="this.style.background='#fee2e2'" onmouseleave="this.style.background='none'">🗑️</button>
        <button id="mp-close"
          style="border:none;background:#e0e0e0;border-radius:8px;padding:5px 10px;cursor:pointer;font-size:12px;font-weight:600;">Cerrar</button>
      </div>`;
    panel.appendChild(header);

    // ── Resumen global ──
    const resumen = document.createElement('div');
    resumen.className = 'mp-resumen';
    resumen.innerHTML = `
      <div class="mp-stat-card">
        <div class="mp-stat-num">${totales.total}</div>
        <div class="mp-stat-label">Total resp.</div>
      </div>
      <div class="mp-stat-card">
        <div class="mp-stat-num ok">${totales.ok}</div>
        <div class="mp-stat-label">Correctas</div>
      </div>
      <div class="mp-stat-card">
        <div class="mp-stat-num err">${totales.err}</div>
        <div class="mp-stat-label">Incorrectas</div>
      </div>`;
    panel.appendChild(resumen);

    // ── Racha ──
    const rachaEl = document.createElement('div');
    rachaEl.className = 'mp-racha' + (racha === 0 ? ' sin-racha' : '');
    if (racha >= 2) {
      rachaEl.innerHTML = `🔥 <span class="mp-racha-num">${racha}</span> días seguidos estudiando — ¡Seguí así!`;
    } else if (racha === 1) {
      rachaEl.innerHTML = `✅ <span class="mp-racha-num">Hoy</span> respondiste preguntas. ¡Mañana completá otro día!`;
    } else {
      rachaEl.innerHTML = `💤 <span class="mp-racha-num">0</span> días de racha — ¡Arrancá hoy!`;
    }
    panel.appendChild(rachaEl);

    // ── Porcentaje global ──
    if (totales.total > 0) {
      const pctEl = document.createElement('div');
      pctEl.style.cssText = 'margin-bottom:12px;';
      pctEl.innerHTML = `
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin-bottom:4px;">
          <span>Aciertos globales</span><span style="font-weight:700;color:${pctGlobal>=70?'#059669':'#d97706'}">${pctGlobal}%</span>
        </div>
        <div style="height:6px;background:#e2e8f0;border-radius:99px;overflow:hidden;">
          <div style="height:100%;width:${pctGlobal}%;border-radius:99px;background:linear-gradient(90deg,${pctGlobal>=70?'#059669,#10b981':'#d97706,#f59e0b'});transition:width .4s;"></div>
        </div>`;
      panel.appendChild(pctEl);
    }

    // ── Pestañas ──
    const tabs = document.createElement('div');
    tabs.className = 'mp-tabs';
    tabs.innerHTML = `
      <button class="mp-tab ${tabActiva==='dia'?'activa':''}" data-tab="dia">📅 Por día</button>
      <button class="mp-tab ${tabActiva==='intentos'?'activa':''}" data-tab="intentos">📋 Historial</button>`;
    panel.appendChild(tabs);

    // ── Contenido: Por día ──
    const contDia = document.createElement('div');
    contDia.className = 'mp-tab-content' + (tabActiva === 'dia' ? ' activa' : '');
    contDia.dataset.tab = 'dia';

    if (!Object.keys(porDia).length) {
      contDia.innerHTML = `<div class="mp-vacio"><div class="mp-vacio-icon">📭</div>Sin datos aún. Respondé preguntas para ver tu progreso diario.</div>`;
    } else {
      const diasOrdenados = Object.keys(porDia).sort().reverse();
      diasOrdenados.forEach(iso => {
        const d = porDia[iso];
        const pct = d.total > 0 ? Math.round((d.ok / d.total) * 100) : 0;
        const esToy = iso === _todayISO();
        const grupo = document.createElement('div');
        grupo.className = 'mp-dia-grupo';
        grupo.innerHTML = `
          <div class="mp-dia-header">${esToy ? '📌 Hoy — ' : ''}${_toLocalDateStr(iso)}</div>
          <div class="mp-dia-card">
            <div class="mp-dia-nums">
              <span class="mp-dia-pill total">📝 ${d.total} respondidas</span>
              <span class="mp-dia-pill ok">✓ ${d.ok} correctas</span>
              <span class="mp-dia-pill err">✗ ${d.err} incorrectas</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <div class="mp-dia-barra" style="flex:1;">
                <div class="mp-dia-barra-fill" style="width:${pct}%;"></div>
              </div>
              <span style="font-size:11px;font-weight:700;color:${pct>=70?'#059669':'#d97706'};min-width:30px;text-align:right;">${pct}%</span>
            </div>
          </div>`;
        contDia.appendChild(grupo);
      });
    }
    panel.appendChild(contDia);

    // ── Contenido: Historial de intentos ──
    const contIntentos = document.createElement('div');
    contIntentos.className = 'mp-tab-content' + (tabActiva === 'intentos' ? ' activa' : '');
    contIntentos.dataset.tab = 'intentos';
    _renderIntentos(contIntentos);
    panel.appendChild(contIntentos);

    // ── Eventos ──
    panel.querySelector('#mp-close').addEventListener('click', () => { panel.style.display = 'none'; });
    panel.querySelector('#mp-trash').addEventListener('click', () => {
      if (confirm('¿Borrar todo el historial? Esta acción no se puede deshacer.')) {
        localStorage.removeItem(ATTEMPT_LOG_KEY);
        localStorage.removeItem(DAILY_TALLY_KEY);
        localStorage.removeItem(MOT_SHOWN_KEY);
        localStorage.removeItem(MOT_MILESTONE_KEY);
        _renderPanelMejorado();
      }
    });
    tabs.querySelectorAll('.mp-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.querySelectorAll('.mp-tab').forEach(t => t.classList.remove('activa'));
        tab.classList.add('activa');
        panel.querySelectorAll('.mp-tab-content').forEach(c => {
          c.classList.toggle('activa', c.dataset.tab === tab.dataset.tab);
        });
      });
    });
  }

  function _renderIntentos(container) {
    const data = _loadJSON(ATTEMPT_LOG_KEY, []);
    if (!data.length) {
      container.innerHTML = `<div class="mp-vacio"><div class="mp-vacio-icon">📭</div>Sin intentos completados aún.</div>`;
      return;
    }
    const sorted = data.slice().sort((a, b) => {
      const da = new Date(a.iso).getTime(), db = new Date(b.iso).getTime();
      if (db !== da) return db - da;
      return a.sectionTitle?.localeCompare(b.sectionTitle) || 0;
    });
    const byDate = {};
    sorted.forEach(item => {
      const d = item.iso?.substring(0, 10) || _todayISO();
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(item);
    });
    container.innerHTML = '';
    Object.keys(byDate).forEach(iso => {
      const grupo = document.createElement('div');
      grupo.className = 'mp-dia-grupo';
      grupo.innerHTML = `<div class="mp-dia-header">${iso === _todayISO() ? '📌 Hoy — ' : ''}${_toLocalDateStr(iso)}</div>`;
      byDate[iso].forEach(item => {
        const pct = item.total > 0 ? Math.round((item.score / item.total) * 100) : 0;
        const cls = pct >= 70 ? 'verde' : pct >= 50 ? 'gris' : 'rojo';
        const row = document.createElement('div');
        row.className = 'mp-intento-row';
        row.innerHTML = `
          <div class="mp-intento-titulo" title="${item.sectionTitle}">${item.sectionTitle}</div>
          <div class="mp-intento-score ${cls}">${item.score}/${item.total} (${pct}%)</div>`;
        grupo.appendChild(row);
      });
      container.appendChild(grupo);
    });
  }


  // ════════════════════════════════════════════════════════════════
  // 2. MENSAJES DE MOTIVACIÓN — toast no bloqueante
  // ════════════════════════════════════════════════════════════════

  // ── Inyectar estilos del toast motivacional ──────────────────
  function _inyectarEstilosToast() {
    if (document.getElementById('mp-toast-styles')) return;
    const s = document.createElement('style');
    s.id = 'mp-toast-styles';
    s.textContent = `
      #mp-mot-overlay {
        position: fixed;
        inset: 0;
        z-index: 90000;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        padding: 20px;
      }
      #mp-mot-card {
        background: #fff;
        border-radius: 20px;
        box-shadow: 0 24px 64px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.1);
        padding: 28px 32px 24px;
        max-width: 380px;
        width: 100%;
        text-align: center;
        pointer-events: all;
        animation: mpMotEntrada 0.4s cubic-bezier(0.34,1.4,0.64,1) both;
        border-top: 4px solid #0891b2;
      }
      @keyframes mpMotEntrada {
        from { opacity:0; transform:scale(0.85) translateY(20px); }
        to   { opacity:1; transform:scale(1) translateY(0); }
      }
      #mp-mot-card.saliendo {
        animation: mpMotSalida 0.3s ease-in forwards;
      }
      @keyframes mpMotSalida {
        from { opacity:1; transform:scale(1) translateY(0); }
        to   { opacity:0; transform:scale(0.9) translateY(-12px); }
      }
      #mp-mot-icono {
        font-size: 2.8rem;
        line-height: 1;
        margin-bottom: 10px;
        animation: mpMotIcono 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.15s both;
      }
      @keyframes mpMotIcono {
        from { transform:scale(0.4) rotate(-15deg); opacity:0; }
        to   { transform:scale(1) rotate(0); opacity:1; }
      }
      #mp-mot-subtitulo {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #0891b2;
        margin-bottom: 6px;
      }
      #mp-mot-titulo {
        font-size: 1.05rem;
        font-weight: 800;
        color: #0f172a;
        margin-bottom: 8px;
        line-height: 1.3;
      }
      #mp-mot-frase {
        font-size: 0.88rem;
        color: #475569;
        line-height: 1.6;
        margin-bottom: 18px;
        background: #f0f9ff;
        border-left: 3px solid #0891b2;
        padding: 8px 12px;
        border-radius: 0 8px 8px 0;
        text-align: left;
      }
      #mp-mot-stats {
        display: flex;
        justify-content: center;
        gap: 16px;
        margin-bottom: 18px;
      }
      .mp-mot-stat {
        text-align: center;
      }
      .mp-mot-stat-num {
        font-size: 1.4rem;
        font-weight: 800;
        line-height: 1;
      }
      .mp-mot-stat-num.ok  { color: #059669; }
      .mp-mot-stat-num.err { color: #dc2626; }
      .mp-mot-stat-label {
        font-size: 10px;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-top: 2px;
      }
      #mp-mot-barra-wrap {
        height: 6px;
        background: #e2e8f0;
        border-radius: 99px;
        overflow: hidden;
        margin-bottom: 18px;
      }
      #mp-mot-barra-fill {
        height: 100%;
        border-radius: 99px;
        transition: width 0.6s ease;
      }
      #mp-mot-btn {
        background: linear-gradient(135deg, #0891b2, #0d7490);
        color: #fff;
        border: none;
        border-radius: 10px;
        padding: 10px 28px;
        font-size: 0.9rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.18s ease;
        box-shadow: 0 4px 14px rgba(8,145,178,0.3);
        font-family: inherit;
      }
      #mp-mot-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 18px rgba(8,145,178,0.4);
      }

      /* ── Toast liviano de milestone ── */
      #mp-milestone-toast {
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        z-index: 89999;
        background: linear-gradient(135deg, #0d7490, #0891b2);
        color: #fff;
        border-radius: 100px;
        padding: 10px 22px;
        font-size: 0.88rem;
        font-weight: 700;
        box-shadow: 0 8px 28px rgba(8,145,178,0.4);
        opacity: 0;
        transition: opacity 0.3s, transform 0.3s;
        pointer-events: none;
        white-space: nowrap;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      #mp-milestone-toast.visible {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    `;
    document.head.appendChild(s);
  }

  // ── Frases motivacionales por rango de % ────────────────────
  function _getFrase(pct) {
    if (pct === 100) return { icon: '🏆', frase: '¡Perfecto! Dominás cada concepto. Sos exactamente el médico que el sistema necesita.' };
    if (pct >= 90)  return { icon: '🌟', frase: '¡Excelente! Estás muy cerca de la cima. Un pequeño ajuste más y llegás a la perfección.' };
    if (pct >= 80)  return { icon: '💪', frase: '¡Muy bien! Tu preparación es sólida. Revisá los errores con calma y vas a subir aún más.' };
    if (pct >= 70)  return { icon: '📈', frase: '¡Buen trabajo! Tenés una base firme. Con constancia vas a seguir creciendo rápido.' };
    if (pct >= 60)  return { icon: '🔍', frase: 'Vas por buen camino. Cada error es una oportunidad de aprendizaje. ¡Seguí adelante!' };
    if (pct >= 50)  return { icon: '🌱', frase: 'Estás en la mitad del camino. La medicina se aprende paso a paso. ¡Tu esfuerzo de hoy es tu éxito de mañana!' };
    if (pct >= 40)  return { icon: '🔥', frase: 'No te rindas. Los mejores médicos también tuvieron momentos difíciles. Cada intento te hace más fuerte.' };
    if (pct >= 30)  return { icon: '💡', frase: 'Este resultado te muestra exactamente dónde enfocar tu energía. ¡Esa claridad es un regalo!' };
    if (pct >= 20)  return { icon: '❤️', frase: 'El comienzo siempre es el más duro. Lo importante no es dónde empezás, sino la decisión de seguir.' };
    return              { icon: '🌅', frase: 'Cada experto fue alguna vez un principiante. Hoy es solo el inicio de tu transformación. ¡Volvé a intentarlo!' };
  }

  // ── Mostrar modal motivacional ───────────────────────────────
  function _mostrarModal({ subtitulo, titulo, ok, total, onCerrar }) {
    _inyectarEstilosToast();

    // No mostrar si ya hay uno visible
    if (document.getElementById('mp-mot-overlay')) return;

    const pct = total > 0 ? Math.round((ok / total) * 100) : 0;
    const err = total - ok;
    const { icon, frase } = _getFrase(pct);
    const colorBarra = pct >= 70
      ? 'linear-gradient(90deg, #059669, #10b981)'
      : pct >= 50
        ? 'linear-gradient(90deg, #d97706, #f59e0b)'
        : 'linear-gradient(90deg, #dc2626, #ef4444)';

    const overlay = document.createElement('div');
    overlay.id = 'mp-mot-overlay';
    overlay.innerHTML = `
      <div id="mp-mot-card">
        <div id="mp-mot-icono">${icon}</div>
        <div id="mp-mot-subtitulo">${subtitulo}</div>
        <div id="mp-mot-titulo">${titulo}</div>
        <div id="mp-mot-stats">
          <div class="mp-mot-stat">
            <div class="mp-mot-stat-num">${total}</div>
            <div class="mp-mot-stat-label">Respondidas</div>
          </div>
          <div class="mp-mot-stat">
            <div class="mp-mot-stat-num ok">${ok}</div>
            <div class="mp-mot-stat-label">Correctas</div>
          </div>
          <div class="mp-mot-stat">
            <div class="mp-mot-stat-num err">${err}</div>
            <div class="mp-mot-stat-label">Incorrectas</div>
          </div>
        </div>
        <div id="mp-mot-barra-wrap">
          <div id="mp-mot-barra-fill" style="width:0%;background:${colorBarra};"></div>
        </div>
        <div id="mp-mot-frase">${frase}</div>
        <button id="mp-mot-btn">¡Seguir estudiando! →</button>
      </div>`;

    document.body.appendChild(overlay);

    // Animar barra con pequeño delay
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const fill = document.getElementById('mp-mot-barra-fill');
        if (fill) fill.style.width = pct + '%';
      });
    });

    function cerrar() {
      const card = document.getElementById('mp-mot-card');
      if (card) {
        card.classList.add('saliendo');
        setTimeout(() => { overlay.remove(); if (onCerrar) onCerrar(); }, 280);
      } else {
        overlay.remove();
        if (onCerrar) onCerrar();
      }
    }

    document.getElementById('mp-mot-btn').addEventListener('click', cerrar);
    overlay.addEventListener('click', e => { if (e.target === overlay) cerrar(); });

    // Auto-cerrar a los 12 segundos si el usuario no interactúa
    const autoClose = setTimeout(cerrar, 12000);
    overlay.addEventListener('click', () => clearTimeout(autoClose), { once: true });
    document.getElementById('mp-mot-btn')?.addEventListener('click', () => clearTimeout(autoClose), { once: true });
  }

  // ── Toast liviano de milestone ───────────────────────────────
  function _mostrarMilestoneToast(msg) {
    _inyectarEstilosToast();
    const existing = document.getElementById('mp-milestone-toast');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.id = 'mp-milestone-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => t.classList.add('visible'));
    });
    setTimeout(() => {
      t.classList.remove('visible');
      setTimeout(() => t.remove(), 350);
    }, 4000);
  }

  // ── Verificar milestones diarios ─────────────────────────────
  function _verificarMilestonesDiarios(totalDia) {
    const MILESTONES = [50, 100, 150, 200, 300, 400, 500];
    const hoy = _todayISO();
    const shown = _loadJSON(MOT_MILESTONE_KEY, {});
    if (!shown[hoy]) shown[hoy] = [];
    const disparados = shown[hoy];

    for (const m of MILESTONES) {
      if (totalDia >= m && !disparados.includes(m)) {
        disparados.push(m);
        _saveJSON(MOT_MILESTONE_KEY, shown);
        const emojis = { 50: '🎯', 100: '💯', 150: '🚀', 200: '⭐', 300: '🌟', 400: '💎', 500: '👑' };
        _mostrarMilestoneToast(`${emojis[m] || '🏅'} ¡${m} preguntas respondidas hoy! ¡Increíble!`);
        break; // solo uno a la vez
      }
    }
  }

  // ── Calcular stats de una página/sección ────────────────────
  function _statsDeIndices(seccionId, indices) {
    const puntajes = (window.puntajesPorSeccion || {})[seccionId] || [];
    let ok = 0, total = 0;
    indices.forEach(i => {
      const v = puntajes[i];
      if (v === 1) { ok++; total++; }
      else if (v === 0) { total++; }
    });
    return { ok, total };
  }

  // ── Clave para marcar una página como "ya celebrada" ────────
  function _clavePagina(seccionId, pagNum) {
    return seccionId + '_p' + pagNum;
  }

  // ── Baseline de respuestas al inicio de la sesión ──────────────
  // Se captura UNA SOLA VEZ cuando el paginador termina de cargar la sección.
  // Luego el tally de hoy = totalActual - _tallyBaseline.
  // Esto evita que preguntas respondidas en días anteriores se cuenten como "de hoy".
  let _tallyBaseline = null;  // null = no inicializado aún

  function _capturarBaseline() {
    if (_tallyBaseline !== null) return; // ya capturado
    const puntajes = window.puntajesPorSeccion || {};
    let total = 0, ok = 0, err = 0;
    Object.keys(puntajes).forEach(secId => {
      const arr = puntajes[secId] || [];
      arr.forEach(v => {
        if (v === 1)      { total++; ok++; }
        else if (v === 0) { total++; err++; }
      });
    });
    _tallyBaseline = { total, ok, err };
    console.log('[MOTIVACION] Baseline capturado:', _tallyBaseline);
  }

  // ── Actualizar tally diario al responder cada pregunta ────────
  // Calcula el DELTA respecto al baseline de inicio de sesión.
  // Así solo se cuentan las respuestas dadas HOY en esta sesión.
  function _actualizarDailyTally() {
    // Asegurar que el baseline esté capturado antes del primer delta
    if (_tallyBaseline === null) _capturarBaseline();

    const hoy = _todayISO();
    const puntajes = window.puntajesPorSeccion || {};
    let totalActual = 0, okActual = 0, errActual = 0;
    Object.keys(puntajes).forEach(secId => {
      const arr = puntajes[secId] || [];
      arr.forEach(v => {
        if (v === 1)      { totalActual++; okActual++; }
        else if (v === 0) { totalActual++; errActual++; }
      });
    });

    // Calcular delta respecto al baseline (respuestas nuevas de esta sesión)
    const deltaTotal = Math.max(0, totalActual - (_tallyBaseline?.total || 0));
    const deltaOk    = Math.max(0, okActual    - (_tallyBaseline?.ok    || 0));
    const deltaErr   = Math.max(0, errActual   - (_tallyBaseline?.err   || 0));

    // No guardar si no hubo respuestas nuevas en esta sesión
    if (deltaTotal === 0) return;

    // Acumular con lo que ya había en el tally de hoy (de sesiones anteriores del mismo día)
    const tally = _loadJSON(DAILY_TALLY_KEY, {});
    const prevHoy = tally[hoy] || { total: 0, ok: 0, err: 0 };
    tally[hoy] = {
      total: prevHoy.total + deltaTotal,
      ok   : prevHoy.ok   + deltaOk,
      err  : prevHoy.err  + deltaErr,
    };
    _saveJSON(DAILY_TALLY_KEY, tally);
  }

  // ── Resetear baseline al cerrar sesión ────────────────────────
  // Importante: si el usuario hace logout y login en la misma sesión del navegador,
  // el baseline debe resetearse para que no se acumule entre sesiones.
  document.addEventListener('fb:sesionCerrada', () => { _tallyBaseline = null; });

  // ── Hook sobre _pag2UpdateStats (paginador) ──────────────────
  // El paginador redefine window._pag2UpdateStats cada vez que el usuario
  // abre una nueva sección (dentro de _paginar → closure).
  // Para sobrevivir a esas redefiniciones usamos Object.defineProperty con
  // un setter que envuelve automáticamente cada nueva función asignada.
  function _hookPag2UpdateStats() {
    // Esperar a que exista por primera vez
    if (typeof window._pag2UpdateStats !== 'function') {
      setTimeout(_hookPag2UpdateStats, 100);
      return;
    }

    // Capturar baseline con la primera función disponible
    setTimeout(_capturarBaseline, 80);

    // Valor interno real (lo que _pag2UpdateStats "realmente es")
    let _innerFn = window._pag2UpdateStats;

    // Crear un wrapper que intercepta llamadas y detecta respuestas nuevas
    function _crearWrapper(fn) {
      const wrapper = function(seccionId) {
        const puntajesAntes = (window.puntajesPorSeccion || {})[seccionId] || [];
        const respondiaAntes = puntajesAntes.filter(v => v === 1 || v === 0).length;

        fn.call(this, seccionId);

        const puntajesDespues = (window.puntajesPorSeccion || {})[seccionId] || [];
        const respondeDespues = puntajesDespues.filter(v => v === 1 || v === 0).length;

        if (respondeDespues > respondiaAntes) {
          _actualizarDailyTally();
          _onRespuesta(seccionId);
        }
      };
      // Copiar flags del paginador para que _watchHookTimer no agregue otro wrapper
      wrapper._motivacionWrapper = true;
      wrapper._timerHooked = fn._timerHooked || false;
      return wrapper;
    }

    // Instalar setter para interceptar futuras redefiniciones
    try {
      Object.defineProperty(window, '_pag2UpdateStats', {
        get: function() { return _innerFn; },
        set: function(newFn) {
          if (newFn && !newFn._motivacionWrapper) {
            // Nueva función del paginador (cambio de sección) → envolver
            _innerFn = _crearWrapper(newFn);
            setTimeout(_capturarBaseline, 80); // nuevo baseline para la nueva sección
          } else {
            _innerFn = newFn;
          }
        },
        configurable: true
      });
      // Envolver la función ya existente
      _innerFn = _crearWrapper(_innerFn);
      console.log('[MOTIVACION] Hook persistente sobre _pag2UpdateStats instalado ✓');
    } catch (e) {
      // Fallback: polling cada 500ms por si defineProperty no está disponible
      console.warn('[MOTIVACION] defineProperty falló, usando polling', e);
      window._pag2UpdateStats = _crearWrapper(_innerFn);
      setInterval(() => {
        const cur = window._pag2UpdateStats;
        if (cur && !cur._motivacionWrapper) {
          window._pag2UpdateStats = _crearWrapper(cur);
          setTimeout(_capturarBaseline, 80);
        }
      }, 500);
    }
  }

  // ── Pausar el timer cuando la página queda completa con tiempo restante ─
  // Marca la página como "pagCompleta" en el localStorage del timer (quiz_timer_v1)
  // para que _timerEstaCorriendo() devuelva false → libera la navegación.
  // Detiene el interval del tick y oculta el widget flotante.
  function _pausarTimerPorPaginaCompleta(seccionId, pag) {
    const TIMER_KEY = 'quiz_timer_v1';
    let d;
    try { d = JSON.parse(localStorage.getItem(TIMER_KEY) || '{}'); } catch (_) { d = {}; }

    const k = seccionId + '__' + pag;
    // Solo actuar si el timer está realmente corriendo (inicio registrado, no agotado)
    if (!d[k] || d[k + '__agotado'] || d[k + '__pagCompleta']) return;

    // Calcular segundos restantes antes de detener
    const dur = d['duracion__' + seccionId] || 3600;
    const elapsed = Math.floor((Date.now() - d[k]) / 1000);
    const segRestantes = Math.max(0, dur - elapsed);

    // Guardar los segundos restantes para restaurar en la próxima página (info visual)
    d[k + '__segRestantes'] = segRestantes;
    // Marcar como "pagCompleta" → _timerEstaCorriendo() devolverá false
    d[k + '__pagCompleta'] = true;
    try { localStorage.setItem(TIMER_KEY, JSON.stringify(d)); } catch (_) {}

    // Detener el interval del tick
    if (window._timerInterval) {
      clearInterval(window._timerInterval);
      window._timerInterval = null;
    }

    // Ocultar el widget flotante del timer
    const w = document.getElementById('pag2-timer-widget');
    if (w) w.classList.add('timer-oculto');

    // Ocultar también el mensaje "🔒 Navegación bloqueada"
    const lockEl = document.getElementById('ptw-lock');
    if (lockEl) lockEl.style.display = 'none';

    console.log(`[MOTIVACION] Timer pausado por página completa — ${seccionId} pág ${pag + 1}, ${segRestantes}s restantes`);
  }

  // ── Lógica principal al responder una pregunta ───────────────
  function _onRespuesta(seccionId) {
    // No disparar para el simulacro (tiene su propio modal)
    if (!seccionId || seccionId === 'simulador') return;

    const PAGE_SIZE = 50;

    // ── Obtener displayOrder ──
    const total = ((window.preguntasPorSeccion || {})[seccionId] || []).length;
    if (!total) return;
    let displayOrder = [];
    try {
      if (typeof window._getDisplayOrder === 'function') {
        displayOrder = window._getDisplayOrder(seccionId, total);
      } else {
        displayOrder = Array.from({ length: total }, (_, i) => i);
      }
    } catch (_) { return; }

    // ── Calcular la página activa ──
    // Leemos el estado guardado para saber qué página estaba activa
    const PAGE_STATE_KEY = 'quiz_paginator_v1';
    let pagActiva = 0;
    try {
      const ps = JSON.parse(localStorage.getItem(PAGE_STATE_KEY) || '{}');
      pagActiva = typeof ps[seccionId] === 'number' ? ps[seccionId] : 0;
    } catch (_) {}

    const totalPages = Math.ceil(displayOrder.length / PAGE_SIZE);

    // ── Verificar si la página activa quedó COMPLETA ──
    const indicesPag = displayOrder.slice(pagActiva * PAGE_SIZE, (pagActiva + 1) * PAGE_SIZE);
    const statsPag = _statsDeIndices(seccionId, indicesPag);

    if (statsPag.total === indicesPag.length && indicesPag.length > 0) {
      // Página completa — ¿ya fue celebrada?
      const clave = _clavePagina(seccionId, pagActiva);
      const shown = _loadJSON(MOT_SHOWN_KEY, {});
      if (!shown[clave]) {
        shown[clave] = true;
        _saveJSON(MOT_SHOWN_KEY, shown);

        // ── Pausar el timer si está corriendo con tiempo restante ──
        _pausarTimerPorPaginaCompleta(seccionId, pagActiva);

        const esFinal = pagActiva === totalPages - 1;
        const subtitle = esFinal
          ? '¡ESPECIALIDAD COMPLETADA!'
          : `PÁGINA ${pagActiva + 1} DE ${totalPages} COMPLETADA`;
        const titulo = esFinal
          ? `Completaste toda la especialidad`
          : `Completaste las 50 preguntas de esta página`;

        // Pequeño delay para que el DOM del paginador se actualice antes del modal
        setTimeout(() => {
          _mostrarModal({
            subtitulo: subtitle,
            titulo: titulo,
            ok: statsPag.ok,
            total: statsPag.total,
          });
        }, 400);
      }
    }

    // ── Verificar cuestionarios SIN paginador (≤50 preguntas) ──
    // Estos llaman a mostrarResultadoFinal desde script.js; pero también
    // podemos detectarlos aquí si todasRespondidas.
    // Solo para evitar duplicar con el modal original de script.js,
    // usamos el hook sobre mostrarResultadoFinal en su lugar (ver abajo).

    // ── Verificar milestones diarios ──
    // Ahora el dailyTally se actualiza antes de llamar a _onRespuesta,
    // así que _calcularDiarios() ya incluye la respuesta actual.
    const porDia = _calcularDiarios();
    const hoy = _todayISO();
    const totalHoy = porDia[hoy]?.total || 0;
    _verificarMilestonesDiarios(totalHoy);
  }

  // ── Hook sobre mostrarResultadoFinal (cuestionarios ≤50) ────
  // Para cuestionarios sin paginador (especialmente exámenes únicos,
  // simulacro-sin-paginador, o especialidades con pocas preguntas).
  function _hookMostrarResultadoFinal() {
    const orig = window.mostrarResultadoFinal;
    if (typeof orig !== 'function') { setTimeout(_hookMostrarResultadoFinal, 200); return; }

    window.mostrarResultadoFinal = function(seccionId) {
      orig.call(this, seccionId); // ejecutar original (muestra el resultado en el DOM)

      // Solo disparar el modal si el cuestionario tiene ≤50 preguntas
      // (si tiene más, el paginador lo maneja por páginas).
      // Para exámenes únicos/simulacro siempre mostramos el modal.
      const preguntas = ((window.preguntasPorSeccion || {})[seccionId] || []);
      const esExamenUnico = typeof window.esExamenUnico === 'function'
        ? window.esExamenUnico(seccionId)
        : seccionId.startsWith('unico') || seccionId.startsWith('uba');
      const esSimulacro = seccionId === 'simulador';

      // Para especialidades paginadas (>50 preguntas) NO mostramos el modal aquí:
      // lo maneja _hookPag2UpdateStats. Evitamos duplicar.
      if (!esExamenUnico && !esSimulacro && preguntas.length > 50) return;
      // Para simulacro tiene su propio modal (mostrarModalTiempoAgotado)
      if (esSimulacro) return;

      const puntajes = (window.puntajesPorSeccion || {})[seccionId] || [];
      const ok = puntajes.filter(v => v === 1).length;
      const total = preguntas.length;

      const subtitle = esExamenUnico
        ? 'EXAMEN COMPLETADO'
        : '¡CUESTIONARIO COMPLETADO!';
      const titulo = esExamenUnico
        ? `Finalizaste el examen (${total} preguntas)`
        : `¡Respondiste las ${total} preguntas!`;

      setTimeout(() => {
        _mostrarModal({ subtitulo: subtitle, titulo, ok, total });
      }, 500);
    };
    console.log('[MOTIVACION] Hook sobre mostrarResultadoFinal instalado ✓');
  }

  // ── Instalación ───────────────────────────────────────────────
  function _instalar() {
    _instalarPanelMejorado();
    _hookPag2UpdateStats();
    _hookMostrarResultadoFinal();
    console.log('[MOTIVACION] Módulo motivacion-progreso.js cargado ✓');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _instalar);
  } else {
    // Si ya cargó el DOM, esperar un poco para que script.js y paginador terminen de instalarse
    setTimeout(_instalar, 400);
  }

})();
