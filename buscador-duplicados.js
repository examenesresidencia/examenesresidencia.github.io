// ════════════════════════════════════════════════════════════════
// buscador-duplicados.js - V4
// ────────────────────────────────────────────────────────────────


(function () {
  'use strict';

  // ── Lista completa de secciones a escanear (orden A-Z) ───────
  const TODAS_LAS_SECCIONES = [
    'unico2016','unico2017','unico2018','unico2019','unico2020',
    'unico2021','unico2022','unico2023','unico2024','unico2025','unico2025t1','unico2025t2',
    'uba2016','uba2017','uba2018','uba2019',
    'compilado1','compilado2','compilado3','compilado4','compilado5',
    'compilado6','compilado7','compilado8','compilado9','compilado10',
    'pediatria','cardiologia','neurologia','endocrinologia','neumonologia',
    'nefrologia','digestivo','hematologia','infectologia','clinicamedica',
    'ginecologia','obstetricia','cirugia','traumatologia','urologia',
    'of','orl','dermatologia','psiquiatria','reumatologia',
    'toxicologia','medicinalegal','saludpublica','medicinafamiliar'
  ].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

  // ── Helpers locales ────────────────────────────────────────────
  function _bdToast(m, t)        { if (typeof window.fbToast === 'function') window.fbToast(m, t); }
  function _bdAuthStyles()       { if (typeof window.fbInjectAuthStyles === 'function') window.fbInjectAuthStyles(); }

  // ── Cache del último escaneo ───────────────────────────────────
  let _dupGruposCache = [];
  let _dupGruposInternoCache = []; // duplicados dentro de la misma sección
  let _dupTotalPreguntasCache = 0; // total de preguntas escaneadas (para actualizar el contador)
  const _DUP_CACHE_KEY = 'fb_dup_scan_cache_v2';
  const _DUP_CACHE_TTL = Infinity; // "nunca expira"

  // ── Normalización de enunciados (para comparación exacta) ──────
  function _normalizarEnunciado(texto) {
    if (!texto) return '';
    // Solo lowercase + colapsar espacios + trim.
    // NO se quitan tildes ni puntuación para evitar falsos positivos.
    return texto
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ════════════════════════════════════════════════════════════════
  // fbAbrirBuscadorDuplicados — abre el modal principal
  // ════════════════════════════════════════════════════════════════
  async function fbAbrirBuscadorDuplicados() {
    _bdAuthStyles();
    _fbInjectDuplicadosStyles();

    document.getElementById('fb-modal-duplicados')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'fb-modal-duplicados';
    overlay.style.cssText = [
      'position:fixed','inset:0','z-index:200000',
      'background:rgba(5,10,20,0.92)','backdrop-filter:blur(10px)',
      '-webkit-backdrop-filter:blur(10px)',
      'display:flex','align-items:flex-start','justify-content:center',
      'padding:24px 12px','overflow-y:auto','box-sizing:border-box',
      'font-family:Segoe UI,system-ui,sans-serif'
    ].join(';');

    overlay.innerHTML = `
      <div style="max-width:780px;width:100%;background:rgba(15,23,42,0.98);
        border:1px solid rgba(124,58,237,0.3);border-radius:20px;
        box-shadow:0 32px 80px rgba(0,0,0,0.6);overflow:hidden;">

        <div style="background:linear-gradient(135deg,#4c1d95,#6d28d9);
          padding:20px 24px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="color:#fff;font-size:1.1rem;font-weight:800;letter-spacing:-0.01em;">
              🔁 Buscador de preguntas duplicadas
            </div>
            <div style="color:rgba(255,255,255,0.65);font-size:0.8rem;margin-top:3px;">
              Escanea Firestore en tiempo real — las eliminaciones son permanentes
            </div>
          </div>
          <button id="dup-close" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);
            color:#fff;border-radius:50%;width:36px;height:36px;font-size:1.1rem;
            cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>
        </div>

        <!-- Filtros -->
        <div style="padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.07);
          display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
          <input id="dup-filtro-texto" type="text" placeholder="Filtrar por texto del enunciado…"
            style="flex:1;min-width:180px;padding:9px 13px;border-radius:8px;
            border:1.5px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.06);
            color:#f1f5f9;font-size:0.85rem;outline:none;box-sizing:border-box;">
          <select id="dup-filtro-seccion"
            style="padding:9px 13px;border-radius:8px;border:1.5px solid rgba(255,255,255,0.12);
            background:rgba(30,41,59,0.9);color:#f1f5f9;font-size:0.85rem;outline:none;cursor:pointer;">
            <option value="">Todas las secciones</option>
            ${TODAS_LAS_SECCIONES.map(s => `<option value="${s}">${s}</option>`).join('')}
          </select>
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:7px 13px;">
            <span style="color:#94a3b8;font-size:0.78rem;font-weight:600;white-space:nowrap;">Buscar duplicados:</span>
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer;color:#e2e8f0;font-size:0.82rem;white-space:nowrap;">
              <input type="radio" name="dup-modo" id="dup-modo-global" value="global" checked
                style="accent-color:#7c3aed;cursor:pointer;">
              🌐 Entre secciones
            </label>
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer;color:#e2e8f0;font-size:0.82rem;white-space:nowrap;">
              <input type="radio" name="dup-modo" id="dup-modo-interna" value="interna"
                style="accent-color:#7c3aed;cursor:pointer;">
              📂 Dentro de un cuestionario
            </label>
          </div>
          <button id="dup-btn-scan" style="padding:9px 18px;border:none;border-radius:8px;
            background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;
            font-size:0.85rem;font-weight:700;cursor:pointer;white-space:nowrap;">
            🔍 Escanear
          </button>
          <button id="dup-btn-eliminar-todas" style="padding:9px 18px;border:none;border-radius:8px;
            background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff;
            font-size:0.85rem;font-weight:700;cursor:pointer;white-space:nowrap;
            box-shadow:0 3px 12px rgba(220,38,38,0.35);">
            🗑 Eliminar TODAS las duplicadas
          </button>
        </div>

        <!-- Barra de acciones masivas (oculta hasta que haya selección) -->
        <div id="dup-barra-masiva" style="display:none;padding:10px 24px;
          background:rgba(239,68,68,0.1);border-bottom:1px solid rgba(239,68,68,0.25);
          align-items:center;gap:12px;flex-wrap:wrap;">
          <span id="dup-sel-count" style="color:#fca5a5;font-size:0.85rem;font-weight:700;flex:1;"></span>
          <button id="dup-btn-deselect-all" style="padding:6px 14px;border:1px solid rgba(148,163,184,0.3);
            border-radius:7px;background:rgba(255,255,255,0.06);color:#94a3b8;
            font-size:0.78rem;font-weight:600;cursor:pointer;white-space:nowrap;">
            ✕ Deseleccionar todo
          </button>
          <button id="dup-btn-eliminar-sel" style="padding:7px 16px;border:none;border-radius:7px;
            background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff;
            font-size:0.82rem;font-weight:700;cursor:pointer;white-space:nowrap;
            box-shadow:0 3px 12px rgba(220,38,38,0.4);">
            🗑 Eliminar seleccionadas
          </button>
        </div>

        <!-- Nota explicativa -->
        <div style="padding:10px 24px 0;font-size:0.78rem;color:#64748b;line-height:1.6;">
          ℹ️ <strong style="color:#94a3b8;">¿Por qué el número de pregunta no coincide con el cuestionario?</strong>
          El cuestionario aplica deduplicación automática al cargar — si una pregunta ya aparece repetida, omite las copias y recorre la numeración.
          Las entradas que ves aquí <em>sí existen en la base de datos</em> y son las que están generando la redundancia.
        </div>

        <!-- Resumen -->
        <div id="dup-resumen" style="padding:10px 24px 4px;font-size:0.82rem;color:#94a3b8;min-height:32px;"></div>

        <!-- Lista de grupos -->
        <div id="dup-lista" style="padding:16px 24px;max-height:60vh;overflow-y:auto;"></div>
      </div>`;

    document.body.appendChild(overlay);

    document.getElementById('dup-close').onclick = () => overlay.remove();

    document.getElementById('dup-btn-scan').onclick = () => _escanearDuplicados();
    document.getElementById('dup-btn-eliminar-todas').onclick = async () => {
      const modoInterna  = document.querySelector('input[name="dup-modo"]:checked')?.value === 'interna';
      const filtroSecc   = document.getElementById('dup-filtro-seccion')?.value || '';
      const filtroTexto  = (document.getElementById('dup-filtro-texto')?.value || '').toLowerCase();

      // Usar los mismos grupos que están VISIBLES en pantalla (respeta filtros)
      let gruposBase = modoInterna ? _dupGruposInternoCache : _dupGruposCache;
      if (filtroTexto) {
        gruposBase = gruposBase.filter(g =>
          g.some(item => item.pregunta.toLowerCase().includes(filtroTexto))
        );
      }
      if (filtroSecc) {
        gruposBase = gruposBase.filter(g => g.some(item => item.seccionId === filtroSecc));
      }

      const paraEliminar = gruposBase.flatMap(g => g.slice(1)); // todos menos el primero de cada grupo
      if (paraEliminar.length === 0) { _bdToast('✅ No hay duplicados para eliminar', 'info'); return; }
      const contexto = filtroSecc ? ` en "${filtroSecc}"` : '';
      if (!confirm(
        `¿Eliminar ${paraEliminar.length} pregunta(s) duplicada(s) de ${gruposBase.length} grupo(s)${contexto}?\n\n` +
        `Se conservará 1 copia de cada grupo.\n` +
        `Esta acción es permanente y actualiza la base de datos para todos los usuarios.`
      )) return;
      await _eliminarDuplicadosEnFirestore(paraEliminar, null);
      // Refrescar la lista completa
      _aplicarFiltrosDuplicados();
    };
    document.getElementById('dup-filtro-texto').addEventListener('input', _aplicarFiltrosDuplicados);
    document.getElementById('dup-filtro-seccion').addEventListener('change', _aplicarFiltrosDuplicados);
    document.querySelectorAll('input[name="dup-modo"]').forEach(radio => {
      radio.addEventListener('change', _aplicarFiltrosDuplicados);
    });

    document.getElementById('dup-btn-deselect-all').onclick = () => {
      document.querySelectorAll('.dup-checkbox:checked').forEach(cb => { cb.checked = false; });
      _actualizarBarraMasiva();
    };
    document.getElementById('dup-btn-eliminar-sel').onclick = async () => {
      const seleccionados = _obtenerItemsSeleccionados();
      if (seleccionados.length === 0) return;
      if (!confirm(`¿Eliminar ${seleccionados.length} pregunta(s) seleccionada(s)?\nEsta acción no se puede deshacer.`)) return;
      await _eliminarDuplicadosEnFirestore(seleccionados, null);
      _actualizarBarraMasiva();
    };

    // Escanear automáticamente al abrir
    _escanearDuplicados();
  }

  // ════════════════════════════════════════════════════════════════
  // _escanearDuplicados — lee Firestore y agrupa por enunciado
  // ════════════════════════════════════════════════════════════════
  // ── Helper: indexar una lista de preguntas en mapa y mapaInterna ──
  function _indexarPreguntas(seccionId, preguntas, mapa, mapaInterna, contador) {
    let total = contador;
    preguntas.forEach((data, idx) => {
      total++;
      const clave = _normalizarEnunciado(data.pregunta);
      if (!clave) return;
      const item = {
        seccionId,
        docId   : data._firestoreDocId || data.docId || null,
        idx     : data._firestoreIdx ?? data._idx ?? idx,
        pregunta: data.pregunta || '(sin enunciado)',
        huerfana: !data.opciones || data.opciones.length === 0 || data.correcta === undefined
      };
      if (!mapa.has(clave)) mapa.set(clave, []);
      mapa.get(clave).push(item);
      const claveInterna = seccionId + '::' + clave;
      if (!mapaInterna.has(claveInterna)) mapaInterna.set(claveInterna, []);
      mapaInterna.get(claveInterna).push(item);
    });
    return total;
  }

  // ── Helper: construir grupos y renderizar resultado ─────────────
  function _procesarResultadosDuplicados(mapa, mapaInterna, totalPreguntas, seccionesEscaneadas, erroresSecciones, lista, resumen, fuenteLabel) {
    if (totalPreguntas === 0) {
      const tieneErrores = erroresSecciones.length > 0;
      lista.innerHTML = `<div style="color:#f87171;background:rgba(239,68,68,0.1);
        border:1px solid rgba(239,68,68,0.3);border-radius:10px;padding:18px 20px;">
        ❌ <strong>No se pudo leer ninguna pregunta.</strong><br><br>
        ${tieneErrores ? `<strong style="color:#fbbf24;">Errores:</strong><br>
        <code style="font-size:0.75rem;color:#fca5a5;display:block;margin-top:6px;">
          ${erroresSecciones.slice(0,8).join('<br>')}
        </code><br>` : ''}
        <strong style="color:#94a3b8;font-size:0.82rem;">Posibles causas:</strong>
        <ul style="color:#94a3b8;font-size:0.8rem;margin-top:6px;padding-left:18px;line-height:1.8;">
          <li>Sin caché en disco — hacé "Forzar nuevo escaneo" en el panel de admin</li>
          <li>Las reglas de Firestore no permiten leer como este usuario</li>
          <li>La colección <code>preguntas/{seccion}/items</code> no existe o está vacía</li>
        </ul>
      </div>`;
      resumen.innerHTML = `<span style="color:#f87171;">⚠️ Sin datos</span>`;
      return;
    }

    if (erroresSecciones.length > 0) {
      lista.innerHTML = `<div style="color:#fbbf24;background:rgba(251,191,36,0.08);
        border:1px solid rgba(251,191,36,0.3);border-radius:10px;padding:14px 18px;margin-bottom:14px;">
        ⚠️ <strong>Errores en ${erroresSecciones.length} sección(es):</strong><br>
        <code style="font-size:0.75rem;color:#fca5a5;">${erroresSecciones.slice(0,5).join('<br>')}</code>
        ${erroresSecciones.length > 5 ? `<br>…y ${erroresSecciones.length - 5} más` : ''}
      </div>`;
    } else {
      lista.innerHTML = '';
    }

    _dupGruposCache = [];
    mapa.forEach(items => { if (items.length > 1) _dupGruposCache.push(items); });
    _dupGruposCache.sort((a, b) => b.length - a.length);

    _dupGruposInternoCache = [];
    mapaInterna.forEach(items => { if (items.length > 1) _dupGruposInternoCache.push(items); });
    _dupGruposInternoCache.sort((a, b) => b.length - a.length);

    _dupTotalPreguntasCache = totalPreguntas;

    // Intentar guardar grupos en localStorage (pequeño — solo los grupos duplicados, no todas las preguntas)
    try {
      localStorage.setItem(_DUP_CACHE_KEY, JSON.stringify({
        ts: Date.now(), grupos: _dupGruposCache,
        gruposInternos: _dupGruposInternoCache, totalPreguntas, seccionesEscaneadas
      }));
    } catch (_) { /* quota excedida — no crítico */ }

    const btnRescan = `<button onclick="window._dupForzarRescan()" style="background:none;border:none;color:#7dd3fc;font-size:0.75rem;cursor:pointer;padding:0;text-decoration:underline;">🔄 Forzar nuevo escaneo</button>`;
    const etiqueta = fuenteLabel || `<span style="color:#475569;font-size:0.75rem;">✅ Leído desde Firestore — ${btnRescan}</span>`;

    resumen.innerHTML = `
      Escaneadas: <strong style="color:#f1f5f9">${seccionesEscaneadas}</strong> secciones ·
      <strong style="color:#f1f5f9">${totalPreguntas.toLocaleString()}</strong> preguntas totales ·
      Entre secciones: <strong style="color:${_dupGruposCache.length > 0 ? '#f87171' : '#4ade80'}">${_dupGruposCache.length}</strong> grupos ·
      Dentro de cuestionario: <strong style="color:${_dupGruposInternoCache.length > 0 ? '#fb923c' : '#4ade80'}">${_dupGruposInternoCache.length}</strong> grupos
      <br><span class="dup-modo-badge" style="color:#a78bfa;font-size:0.75rem;">🌐 Modo: entre secciones — ${_dupGruposCache.length} grupos</span>
      <span style="margin-left:8px;">${etiqueta}</span>`;

    _aplicarFiltrosDuplicados();
  }

  async function _escanearDuplicados(forzar = false) {
    const lista   = document.getElementById('dup-lista');
    const resumen = document.getElementById('dup-resumen');
    const btnScan = document.getElementById('dup-btn-scan');
    if (!lista || !resumen) return;

    // ── Fuente 0: grupos ya calculados en localStorage (el más rápido) ─────────
    // Solo guarda los grupos duplicados — es liviano y entra en localStorage.
    if (!forzar) {
      try {
        const cached = JSON.parse(localStorage.getItem(_DUP_CACHE_KEY) || 'null');
        if (cached && cached.ts && (Date.now() - cached.ts) < _DUP_CACHE_TTL && cached.seccionesEscaneadas > 0) {
          _dupGruposCache = cached.grupos;
          _dupGruposInternoCache = cached.gruposInternos || [];
          _dupTotalPreguntasCache = cached.totalPreguntas || 0;
          const edad = Math.round((Date.now() - cached.ts) / 60000);
          const edadTexto = edad < 60 ? `${edad} min` : `${Math.round(edad / 60)} hs`;
          const btnRescan = `<button onclick="window._dupForzarRescan()" style="background:none;border:none;color:#7dd3fc;font-size:0.75rem;cursor:pointer;padding:0;text-decoration:underline;">🔄 Forzar nuevo escaneo</button>`;
          resumen.innerHTML = `
            Escaneadas: <strong style="color:#f1f5f9">${cached.seccionesEscaneadas}</strong> secciones ·
            <strong style="color:#f1f5f9">${cached.totalPreguntas.toLocaleString()}</strong> preguntas totales ·
            Entre secciones: <strong style="color:${_dupGruposCache.length > 0 ? '#f87171' : '#4ade80'}">${_dupGruposCache.length}</strong> grupos ·
            Dentro de cuestionario: <strong style="color:${_dupGruposInternoCache.length > 0 ? '#fb923c' : '#4ade80'}">${_dupGruposInternoCache.length}</strong> grupos
            <br><span class="dup-modo-badge" style="color:#a78bfa;font-size:0.75rem;">🌐 Modo: entre secciones — ${_dupGruposCache.length} grupos</span>
            <span style="color:#475569;font-size:0.75rem;margin-left:8px;">📦 Desde caché (hace ${edadTexto}) — ${btnRescan}</span>`;
          _aplicarFiltrosDuplicados();
          console.log(`[DUP-SCAN] Usando caché localStorage (${edad} min, ${_dupGruposCache.length} grupos)`);
          return;
        }
      } catch (_) {}
    }

    btnScan.disabled    = true;
    btnScan.textContent = '⏳ Escaneando…';
    resumen.textContent = '';

    const mapa        = new Map();
    const mapaInterna = new Map();
    let totalPreguntas    = 0;
    let seccionesEscaneadas = 0;
    const erroresSecciones  = [];

    // ── Fuente 1: memoria RAM (window.preguntasPorSeccion) ─────────────────────
    // Poblada al arrancar (desde IndexedDB) o tras rescan manual — 0 lecturas Firebase.
    const memCache = window.preguntasPorSeccion;
    const seccionesEnMem = memCache
      ? Object.keys(memCache).filter(k => Array.isArray(memCache[k]) && memCache[k].length > 0)
      : [];
    const umbral = Math.floor(TODAS_LAS_SECCIONES.length * 0.8);

    if (!forzar && seccionesEnMem.length >= umbral) {
      lista.innerHTML = `<div style="text-align:center;padding:20px;color:#94a3b8;font-size:0.85rem;">⚡ Analizando desde memoria… (0 lecturas Firebase)</div>`;
      console.log(`[DUP-SCAN] RAM: ${seccionesEnMem.length} secciones — 0 lecturas`);
      for (const seccionId of TODAS_LAS_SECCIONES) {
        const preguntas = memCache[seccionId];
        if (!Array.isArray(preguntas) || preguntas.length === 0) continue;
        seccionesEscaneadas++;
        totalPreguntas = _indexarPreguntas(seccionId, preguntas, mapa, mapaInterna, totalPreguntas - preguntas.length) + preguntas.length - (totalPreguntas - totalPreguntas);
        // contar correctamente
        totalPreguntas = 0;
      }
      // recontar limpio
      mapa.clear(); mapaInterna.clear(); seccionesEscaneadas = 0; totalPreguntas = 0;
      for (const seccionId of TODAS_LAS_SECCIONES) {
        const preguntas = memCache[seccionId];
        if (!Array.isArray(preguntas) || preguntas.length === 0) continue;
        seccionesEscaneadas++;
        preguntas.forEach((data, idx) => {
          totalPreguntas++;
          const clave = _normalizarEnunciado(data.pregunta);
          if (!clave) return;
          const item = { seccionId, docId: data._firestoreDocId || null,
            idx: data._firestoreIdx ?? idx, pregunta: data.pregunta || '(sin enunciado)',
            huerfana: !data.opciones || data.opciones.length === 0 || data.correcta === undefined };
          if (!mapa.has(clave)) mapa.set(clave, []);
          mapa.get(clave).push(item);
          const ci = seccionId + '::' + clave;
          if (!mapaInterna.has(ci)) mapaInterna.set(ci, []);
          mapaInterna.get(ci).push(item);
        });
      }
      _procesarResultadosDuplicados(mapa, mapaInterna, totalPreguntas, seccionesEscaneadas,
        erroresSecciones, lista, resumen,
        `<span style="color:#4ade80;font-size:0.75rem;">⚡ Desde memoria RAM (0 lecturas Firebase) — <button onclick="window._dupForzarRescan()" style="background:none;border:none;color:#7dd3fc;font-size:0.75rem;cursor:pointer;padding:0;text-decoration:underline;">🔄 Forzar nuevo escaneo</button></span>`);
      if (btnScan) { btnScan.disabled = false; btnScan.textContent = '🔍 Escanear'; }
      return;
    }

    // ── Fuente 2: IndexedDB / CacheDisk (disco, persiste entre sesiones) ───────
    if (!forzar && window.CacheDisk) {
      lista.innerHTML = `<div style="text-align:center;padding:20px;color:#94a3b8;font-size:0.85rem;">💾 Leyendo caché del disco… (0 lecturas Firebase)</div>`;
      let seccionesEnDisco = 0;
      for (const seccionId of TODAS_LAS_SECCIONES) {
        try {
          const cached = await window.CacheDisk.get(seccionId);
          if (!cached || !Array.isArray(cached.preguntas) || cached.preguntas.length === 0) continue;
          seccionesEnDisco++;
          cached.preguntas.forEach((data, idx) => {
            totalPreguntas++;
            const clave = _normalizarEnunciado(data.pregunta);
            if (!clave) return;
            const item = { seccionId, docId: data._firestoreDocId || null,
              idx: data._firestoreIdx ?? idx, pregunta: data.pregunta || '(sin enunciado)',
              huerfana: !data.opciones || data.opciones.length === 0 || data.correcta === undefined };
            if (!mapa.has(clave)) mapa.set(clave, []);
            mapa.get(clave).push(item);
            const ci = seccionId + '::' + clave;
            if (!mapaInterna.has(ci)) mapaInterna.set(ci, []);
            mapaInterna.get(ci).push(item);
          });
        } catch (_) {}
      }
      if (seccionesEnDisco >= umbral) {
        console.log(`[DUP-SCAN] IndexedDB: ${seccionesEnDisco} secciones — 0 lecturas`);
        _procesarResultadosDuplicados(mapa, mapaInterna, totalPreguntas, seccionesEnDisco,
          erroresSecciones, lista, resumen,
          `<span style="color:#60a5fa;font-size:0.75rem;">💾 Desde disco (0 lecturas Firebase) — <button onclick="window._dupForzarRescan()" style="background:none;border:none;color:#7dd3fc;font-size:0.75rem;cursor:pointer;padding:0;text-decoration:underline;">🔄 Forzar nuevo escaneo</button></span>`);
        if (btnScan) { btnScan.disabled = false; btnScan.textContent = '🔍 Escanear'; }
        return;
      }
      mapa.clear(); mapaInterna.clear(); totalPreguntas = 0;
    }

    // ── Fuente 3: Firestore (último recurso — consume lecturas) ────────────────
    lista.innerHTML = `<div style="text-align:center;padding:30px;color:#94a3b8;">
      Sin caché disponible — leyendo desde Firestore…<br>
      <small style="color:#64748b;">Podés evitarlo haciendo "Forzar nuevo escaneo" en el panel de admin.</small>
    </div>`;

    try {
      const _fsModule = window.__fb || window.__firebase_firestore;
      if (!_fsModule || typeof _fsModule.collection !== 'function') {
        lista.innerHTML = `<div style="color:#f87171;padding:20px;">❌ <strong>Firestore no disponible.</strong><br>Iniciá sesión primero.</div>`;
        return;
      }
      const { collection, getDocs } = _fsModule;
      const db = window._fbDb;
      if (!db) {
        lista.innerHTML = `<div style="color:#f87171;padding:20px;">❌ <strong>Base de datos no inicializada.</strong><br>Iniciá sesión primero.</div>`;
        return;
      }

      lista.innerHTML = `<div id="dup-progreso" style="text-align:center;padding:20px;color:#94a3b8;font-size:0.85rem;">
        Leyendo sección 1 de ${TODAS_LAS_SECCIONES.length}…
      </div>`;

      for (let i = 0; i < TODAS_LAS_SECCIONES.length; i++) {
        const seccionId = TODAS_LAS_SECCIONES[i];
        const progresoEl = document.getElementById('dup-progreso');
        if (progresoEl) progresoEl.textContent = `Leyendo ${seccionId} (${i+1}/${TODAS_LAS_SECCIONES.length})… ${totalPreguntas} preguntas`;
        try {
          const snap = await getDocs(collection(db, 'preguntas', seccionId, 'items'));
          if (snap.empty) continue;
          seccionesEscaneadas++;
          snap.forEach(docSnap => {
            totalPreguntas++;
            const data = docSnap.data();
            const clave = _normalizarEnunciado(data.pregunta);
            if (!clave) return;
            const item = { seccionId, docId: docSnap.id, idx: data._idx ?? null,
              pregunta: data.pregunta || '(sin enunciado)',
              huerfana: !data.opciones || data.opciones.length === 0 || data.correcta === undefined };
            if (!mapa.has(clave)) mapa.set(clave, []);
            mapa.get(clave).push(item);
            const ci = seccionId + '::' + clave;
            if (!mapaInterna.has(ci)) mapaInterna.set(ci, []);
            mapaInterna.get(ci).push(item);
          });
        } catch (errSec) {
          console.error(`[DUP-SCAN] Error en ${seccionId}:`, errSec);
          erroresSecciones.push(`${seccionId}: ${errSec.code || 'error'} — ${errSec.message}`);
        }
      }

      _procesarResultadosDuplicados(mapa, mapaInterna, totalPreguntas, seccionesEscaneadas,
        erroresSecciones, lista, resumen, null);

    } catch (e) {
      lista.innerHTML = `<div style="color:#f87171;padding:20px;">❌ Error al escanear: ${e.message}<br><small style="color:#64748b;">${e.stack || ''}</small></div>`;
    } finally {
      if (btnScan) { btnScan.disabled = false; btnScan.textContent = '🔍 Escanear'; }
    }
  }

  // ════════════════════════════════════════════════════════════════
  // Helpers de la barra masiva
  // ════════════════════════════════════════════════════════════════
  function _actualizarBarraMasiva() {
    const barra   = document.getElementById('dup-barra-masiva');
    const countEl = document.getElementById('dup-sel-count');
    if (!barra || !countEl) return;
    const checked = document.querySelectorAll('.dup-checkbox:checked');
    if (checked.length > 0) {
      barra.style.display = 'flex';
      countEl.textContent = `${checked.length} pregunta${checked.length > 1 ? 's' : ''} seleccionada${checked.length > 1 ? 's' : ''}`;
    } else {
      barra.style.display = 'none';
    }
  }

  function _obtenerItemsSeleccionados() {
    const result = [];
    document.querySelectorAll('.dup-checkbox:checked').forEach(cb => {
      result.push({
        docId    : cb.dataset.docid,
        seccionId: cb.dataset.seccion,
        cardId   : cb.dataset.cardid
      });
    });
    return result;
  }

  // ════════════════════════════════════════════════════════════════
  // _aplicarFiltrosDuplicados — filtra el cache sin re-escanear
  // ════════════════════════════════════════════════════════════════
  function _aplicarFiltrosDuplicados() {
    const lista       = document.getElementById('dup-lista');
    const filtroTexto = (document.getElementById('dup-filtro-texto')?.value || '').toLowerCase();
    const filtroSecc  = document.getElementById('dup-filtro-seccion')?.value || '';
    const modoInterna = document.querySelector('input[name="dup-modo"]:checked')?.value === 'interna';
    if (!lista) return;

    // Elegir la fuente de datos según el modo seleccionado
    let grupos = modoInterna ? _dupGruposInternoCache : _dupGruposCache;

    // Actualizar el badge de modo en el resumen
    const resumen = document.getElementById('dup-resumen');
    if (resumen) {
      const badge = resumen.querySelector('.dup-modo-badge');
      if (badge) {
        badge.textContent = modoInterna
          ? `📂 Modo: dentro del mismo cuestionario — ${_dupGruposInternoCache.length} grupos`
          : `🌐 Modo: entre secciones — ${_dupGruposCache.length} grupos`;
        badge.style.color = modoInterna ? '#7dd3fc' : '#a78bfa';
      }
    }

    if (filtroTexto) {
      grupos = grupos.filter(g =>
        g.some(item => item.pregunta.toLowerCase().includes(filtroTexto))
      );
    }
    if (filtroSecc) {
      if (modoInterna) {
        // En modo interno, la sección ya está implícita en la clave; filtrar igual
        grupos = grupos.filter(g => g.some(item => item.seccionId === filtroSecc));
      } else {
        grupos = grupos.filter(g => g.some(item => item.seccionId === filtroSecc));
      }
    }

    if (grupos.length === 0) {
      const modoLabel = modoInterna ? 'dentro del mismo cuestionario' : 'entre secciones';
      lista.innerHTML = `<div style="text-align:center;padding:40px;color:#4ade80;font-size:1.05rem;">✅ No se encontraron duplicados ${modoLabel} con estos filtros.</div>`;
      return;
    }

    lista.innerHTML = '';
    grupos.forEach((items, grupoIdx) => {
      const cardId = `dup-card-${grupoIdx}`;
      const card = document.createElement('div');
      card.id = cardId;
      card.style.cssText = 'background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);border-radius:12px;margin-bottom:16px;overflow:hidden;transition:opacity 0.3s;';

      // Cabecera del grupo
      const header = document.createElement('div');
      header.style.cssText = 'background:rgba(124,58,237,0.15);padding:10px 16px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;';
      header.innerHTML = `
        <div style="color:#c4b5fd;font-size:0.78rem;font-weight:700;letter-spacing:0.04em;">
          GRUPO ${grupoIdx + 1} — ${items.length} copias con enunciado idéntico${items[0] && items.every(i => i.seccionId === items[0].seccionId) ? ` <span style="background:rgba(251,146,60,0.2);border:1px solid rgba(251,146,60,0.4);color:#fb923c;font-size:0.68rem;padding:1px 6px;border-radius:10px;margin-left:6px;">📂 ${items[0].seccionId}</span>` : ''}
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
          <button class="dup-btn-toggle-opciones" style="
            padding:4px 10px;border:1px solid rgba(148,163,184,0.3);border-radius:6px;
            background:rgba(255,255,255,0.06);color:#94a3b8;font-size:0.72rem;font-weight:600;cursor:pointer;">
            👁 Ver opciones
          </button>
          <button class="dup-btn-eliminar-grupo" style="
            padding:5px 12px;border:none;border-radius:6px;
            background:rgba(239,68,68,0.18);border:1px solid rgba(239,68,68,0.35);
            color:#fca5a5;font-size:0.75rem;font-weight:700;cursor:pointer;">
            🗑 Eliminar todas menos 1
          </button>
          <button class="dup-btn-descartar-card" title="Descartar esta tarjeta (no elimina de Firestore)" style="
            padding:0;width:26px;height:26px;border:1px solid rgba(148,163,184,0.25);border-radius:50%;
            background:rgba(255,255,255,0.06);color:#64748b;font-size:0.85rem;
            cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            ✕
          </button>
        </div>`;
      card.appendChild(header);

      // Enunciado compartido
      const enunciadoEl = document.createElement('div');
      enunciadoEl.style.cssText = 'padding:10px 16px 8px;color:#e2e8f0;font-size:0.86rem;line-height:1.6;border-bottom:1px solid rgba(255,255,255,0.06);font-style:italic;';
      enunciadoEl.textContent = `"${items[0].pregunta}"`;
      card.appendChild(enunciadoEl);

      // Panel de opciones (oculto por defecto)
      const panelOpciones = document.createElement('div');
      panelOpciones.style.cssText = 'display:none;padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.06);';
      const tieneOpciones = Array.isArray(items[0].opciones) && items[0].opciones.length > 0;
      if (tieneOpciones) {
        const opcionesHtml = items[0].opciones.map((op, i) => {
          const esCorrecta = items[0].correcta.includes(i);
          return `<div style="padding:3px 0;color:${esCorrecta ? '#4ade80' : '#94a3b8'};font-size:0.78rem;">
            ${esCorrecta ? '✅' : '○'} ${op}
          </div>`;
        }).join('');
        panelOpciones.innerHTML = `<div style="color:#7dd3fc;font-size:0.72rem;font-weight:700;margin-bottom:6px;letter-spacing:0.04em;">OPCIONES (primera copia):</div>${opcionesHtml}`;
      } else {
        panelOpciones.innerHTML = `<div style="color:#64748b;font-size:0.78rem;font-style:italic;">Las opciones no están disponibles en caché — forzá un nuevo escaneo para verlas.</div>`;
      }
      card.appendChild(panelOpciones);

      header.querySelector('.dup-btn-toggle-opciones').onclick = (e) => {
        const visible = panelOpciones.style.display !== 'none';
        panelOpciones.style.display = visible ? 'none' : 'block';
        e.target.textContent = visible ? '👁 Ver opciones' : '🙈 Ocultar opciones';
      };

      // Filas de cada copia
      items.forEach((item, itemIdx) => {
        const fila = document.createElement('div');
        fila.id = `dup-fila-${item.docId}`;
        fila.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 16px;border-bottom:1px solid rgba(255,255,255,0.04);gap:10px;flex-wrap:wrap;';

        const opcionesIguales = !tieneOpciones || JSON.stringify(item.opciones) === JSON.stringify(items[0].opciones);
        const correctaIgual   = !tieneOpciones || JSON.stringify(item.correcta)  === JSON.stringify(items[0].correcta);
        const esExacta = opcionesIguales && correctaIgual;

        fila.innerHTML = `
          ${itemIdx > 0 ? `
          <input type="checkbox" class="dup-checkbox"
            data-docid="${item.docId}" data-seccion="${item.seccionId}" data-cardid="${cardId}"
            style="width:16px;height:16px;cursor:pointer;flex-shrink:0;accent-color:#7c3aed;">
          ` : '<div style="width:16px;flex-shrink:0;"></div>'}
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;flex:1;min-width:0;">
            ${itemIdx === 0
              ? '<span style="background:rgba(74,222,128,0.15);border:1px solid rgba(74,222,128,0.3);color:#4ade80;font-size:0.68rem;font-weight:700;padding:2px 7px;border-radius:20px;white-space:nowrap;">MANTENER</span>'
              : ''}
            ${!esExacta && itemIdx > 0
              ? '<span title="Las opciones o la respuesta correcta difieren de la primera copia" style="background:rgba(251,191,36,0.15);border:1px solid rgba(251,191,36,0.3);color:#fbbf24;font-size:0.68rem;font-weight:700;padding:2px 7px;border-radius:20px;white-space:nowrap;cursor:help;">⚠️ Opciones distintas</span>'
              : ''}
            ${item.huerfana
              ? '<span title="Este documento no tiene opciones o respuesta correcta — probablemente nunca apareció en el cuestionario" style="background:rgba(148,163,184,0.15);border:1px solid rgba(148,163,184,0.3);color:#94a3b8;font-size:0.68rem;font-weight:700;padding:2px 7px;border-radius:20px;white-space:nowrap;cursor:help;">👻 Huérfana</span>'
              : ''}
            <span style="color:#94a3b8;font-size:0.78rem;white-space:nowrap;">
              📂 <strong style="color:#e2e8f0;">${item.seccionId}</strong>
              · doc: <code style="color:#7dd3fc;font-size:0.75rem;user-select:all;">${item.docId}</code>
              ${item.idx !== null ? `· posición: <strong style="color:#fbbf24;">${item.idx + 1}</strong>` : '· <em style="color:#64748b;">sin índice</em>'}
            </span>
            <button class="dup-btn-ir-seccion"
              data-seccion="${item.seccionId}" data-idx="${item.idx}"
              style="color:#38bdf8;font-size:0.72rem;background:rgba(56,189,248,0.07);border:1px solid rgba(56,189,248,0.3);
              border-radius:4px;padding:2px 8px;cursor:pointer;white-space:nowrap;"
              title="Ir a esta sección y buscar la pregunta">
              🔗 Ir a la sección
            </button>
          </div>
          ${itemIdx > 0 ? `
          <button class="dup-btn-eliminar-uno" data-docid="${item.docId}" data-seccion="${item.seccionId}"
            style="padding:5px 12px;border:none;border-radius:6px;flex-shrink:0;
            background:rgba(239,68,68,0.18);border:1px solid rgba(239,68,68,0.35);
            color:#fca5a5;font-size:0.75rem;font-weight:700;cursor:pointer;white-space:nowrap;">
            🗑 Eliminar esta
          </button>` : ''}`;
        card.appendChild(fila);
      });

      // Nota aclaratoria
      const nota = document.createElement('div');
      nota.style.cssText = 'padding:6px 16px 8px;color:#475569;font-size:0.72rem;';
      nota.textContent = 'Usá los checkboxes para seleccionar múltiples y eliminarlas a la vez, o la ✕ para descartar esta tarjeta de la vista.';
      card.appendChild(nota);

      // Botón ✕ descartar tarjeta (solo oculta visualmente)
      header.querySelector('.dup-btn-descartar-card').onclick = () => {
        card.querySelectorAll('.dup-checkbox:checked').forEach(cb => { cb.checked = false; });
        _actualizarBarraMasiva();
        card.style.opacity = '0';
        setTimeout(() => card.remove(), 300);
      };

      // Botón eliminar grupo (mantiene la primera, borra las demás)
      header.querySelector('.dup-btn-eliminar-grupo').onclick = async () => {
        const paraEliminar = items.slice(1);
        if (!confirm(`¿Eliminar ${paraEliminar.length} copia(s) duplicada(s)?\n\nSe conservará la de "${items[0].seccionId}" (idx Firestore: ${items[0].idx}).\nEsta acción no se puede deshacer.`)) return;
        await _eliminarDuplicadosEnFirestore(paraEliminar, card);
      };

      // Botones eliminar individual
      card.querySelectorAll('.dup-btn-eliminar-uno').forEach(btn => {
        btn.onclick = async () => {
          const docId   = btn.dataset.docid;
          const seccion = btn.dataset.seccion;
          const item    = items.find(i => i.docId === docId);
          if (!item) return;
          if (!confirm(`¿Eliminar esta pregunta de "${seccion}" (doc: ${docId})?\nEsta acción no se puede deshacer.`)) return;
          await _eliminarDuplicadosEnFirestore([item], card, docId);
        };
      });

      // Botón "Ir a la sección"
      card.querySelectorAll('.dup-btn-ir-seccion').forEach(btn => {
        btn.onclick = () => {
          const seccionId    = btn.dataset.seccion;
          const firestoreIdx = parseInt(btn.dataset.idx, 10);
          const enunciado    = items[0].pregunta;
          _irASeccionYScrollear(seccionId, firestoreIdx, enunciado);
        };
      });

      // Listener en checkboxes
      card.querySelectorAll('.dup-checkbox').forEach(cb => {
        cb.addEventListener('change', _actualizarBarraMasiva);
      });

      lista.appendChild(card);
    });
  }

  // ════════════════════════════════════════════════════════════════
  // _eliminarDuplicadosEnFirestore
  // ════════════════════════════════════════════════════════════════
  async function _eliminarDuplicadosEnFirestore(items, cardEl, soloDocId = null) {
    const { deleteDoc, doc } = window.__fb;
    const db = window._fbDb;
    if (!db) { _bdToast('❌ Firestore no inicializado', 'error'); return; }

    let eliminados = 0;
    const errores = [];

    for (const item of items) {
      try {
        const rutaDoc = `preguntas/${item.seccionId}/items/${item.docId}`;
        console.log('[DUPLICADOS] Eliminando:', rutaDoc);
        await deleteDoc(doc(db, 'preguntas', item.seccionId, 'items', item.docId));
        eliminados++;
        console.log('[DUPLICADOS] ✅ Eliminado:', rutaDoc);

        // Invalidar caché de esa sección — localStorage, IndexedDB y RAM
        try { localStorage.removeItem('fb_q_cache_' + item.seccionId); } catch (_) {}
        try { localStorage.removeItem('fb_edits_cache_' + item.seccionId); } catch (_) {}
        if (window._seccionesYaCargadas) window._seccionesYaCargadas.delete(item.seccionId);
        // Quitar la pregunta eliminada también de la caché en RAM
        if (window.preguntasPorSeccion && Array.isArray(window.preguntasPorSeccion[item.seccionId])) {
          window.preguntasPorSeccion[item.seccionId] = window.preguntasPorSeccion[item.seccionId]
            .filter(p => (p._firestoreDocId || p.docId) !== item.docId);
        }
        // Quitar también de IndexedDB (CacheDisk)
        if (window.CacheDisk) {
          try {
            const cached = await window.CacheDisk.get(item.seccionId);
            if (cached && Array.isArray(cached.preguntas)) {
              cached.preguntas = cached.preguntas.filter(
                p => (p._firestoreDocId || p.docId) !== item.docId
              );
              await window.CacheDisk.set(item.seccionId, cached);
            }
          } catch (_) {}
        }

        // Quitar fila del DOM con animación
        const fila = document.getElementById(`dup-fila-${item.docId}`);
        if (fila) {
          fila.style.transition = 'opacity 0.3s';
          fila.style.opacity = '0';
          setTimeout(() => fila.remove(), 320);
        }
      } catch (e) {
        console.error('[DUPLICADOS] ❌ Error eliminando:', item.docId, e);
        errores.push({ docId: item.docId, seccion: item.seccionId, msg: e.message, code: e.code });
      }
    }

    // Actualizar cache interno removiendo los eliminados
    const eliminadosIds = new Set(
      items.filter((_, i) => !errores.find(e => e.docId === items[i].docId)).map(i => i.docId)
    );
    _dupGruposCache = _dupGruposCache
      .map(g => g.filter(i => !eliminadosIds.has(i.docId)))
      .filter(g => g.length > 1);
    _dupGruposInternoCache = _dupGruposInternoCache
      .map(g => g.filter(i => !eliminadosIds.has(i.docId)))
      .filter(g => g.length > 1);

    // Actualizar totalPreguntas global y el resumen
    _dupTotalPreguntasCache -= eliminados;
    const resumen = document.getElementById('dup-resumen');
    if (resumen) {
      resumen.innerHTML = resumen.innerHTML.replace(
        /<strong style="color:#f1f5f9">[\d.,]+<\/strong> preguntas totales/,
        `<strong style="color:#f1f5f9">${_dupTotalPreguntasCache.toLocaleString()}</strong> preguntas totales`
      );
      resumen.innerHTML = resumen.innerHTML.replace(
        /Entre secciones: <strong style="color:[^"]+">[\d]+<\/strong> grupos/,
        `Entre secciones: <strong style="color:${_dupGruposCache.length > 0 ? '#f87171' : '#4ade80'}">${_dupGruposCache.length}</strong> grupos`
      );
      const badge = resumen.querySelector('.dup-modo-badge');
      if (badge) {
        const modoInterna = document.querySelector('input[name="dup-modo"]:checked')?.value === 'interna';
        badge.textContent = modoInterna
          ? `📂 Modo: dentro del mismo cuestionario — ${_dupGruposInternoCache.length} grupos`
          : `🌐 Modo: entre secciones — ${_dupGruposCache.length} grupos`;
      }
    }

    if (errores.length === 0) {
      _bdToast(`✅ ${eliminados} pregunta(s) eliminada(s) de Firestore`, 'success');
      // Persistir el caché actualizado (grupos sin las eliminadas, total actualizado)
      try {
        const cached = JSON.parse(localStorage.getItem(_DUP_CACHE_KEY) || 'null');
        if (cached) {
          cached.grupos = _dupGruposCache;
          cached.gruposInternos = _dupGruposInternoCache;
          cached.totalPreguntas = _dupTotalPreguntasCache;
          localStorage.setItem(_DUP_CACHE_KEY, JSON.stringify(cached));
        }
      } catch (_) {}

      // ── Notificar a todos los usuarios vía contentVersion ──────────────────
      // Agrupar los docIds eliminados por sección y emitir un bump por sección
      // para que el listener onSnapshot en cada cliente aplique la eliminación quirúrgicamente.
      if (typeof window._bumpContentVersion === 'function' && window._fbDb) {
        const porSeccion = {};
        items.filter(it => !errores.find(e => e.docId === it.docId)).forEach(it => {
          if (!porSeccion[it.seccionId]) porSeccion[it.seccionId] = [];
          porSeccion[it.seccionId].push(it.docId);
        });
        for (const [seccionId, docIds] of Object.entries(porSeccion)) {
          try {
            await window._bumpContentVersion(seccionId, null, null, {
              esEliminacionDuplicados: true,
              docIdsEliminados: docIds
            });
            console.log('[DUPLICADOS] contentVersion bumped para', seccionId, '→', docIds.length, 'eliminadas');
          } catch (e) {
            console.warn('[DUPLICADOS] No se pudo bumpar contentVersion para', seccionId, e.message);
          }
        }
      }

      if (cardEl && eliminados > 0) {
        const botonesSobrantes = cardEl.querySelectorAll('.dup-btn-eliminar-uno');
        if (botonesSobrantes.length === 0) {
          cardEl.style.transition = 'opacity 0.4s';
          cardEl.style.opacity = '0';
          setTimeout(() => cardEl.remove(), 420);
        }
      }
    } else {
      const lista = document.getElementById('dup-lista');
      const errDiv = document.createElement('div');
      errDiv.style.cssText = 'background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.4);border-radius:10px;padding:14px 18px;margin-bottom:14px;';
      const esPermisos = errores.some(e => e.code === 'permission-denied');
      errDiv.innerHTML = `
        <div style="color:#fca5a5;font-weight:700;font-size:0.88rem;margin-bottom:8px;">
          ❌ No se pudo${errores.length > 1 ? 'n' : ''} eliminar ${errores.length} documento(s)
        </div>
        ${esPermisos ? `
        <div style="color:#fbbf24;font-size:0.82rem;margin-bottom:8px;line-height:1.6;">
          ⚠️ <strong>Error de permisos.</strong> Las reglas de Firestore no permiten eliminar desde el cliente.
          Necesitás agregar esta regla en la consola de Firebase → Firestore → Reglas:<br>
          <code style="display:block;margin-top:6px;background:rgba(0,0,0,0.3);padding:8px;border-radius:6px;font-size:0.78rem;user-select:all;">
            match /preguntas/{seccionId}/items/{itemId} {<br>
            &nbsp;&nbsp;allow delete: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';<br>
            }
          </code>
        </div>` : ''}
        ${errores.map(e => `<div style="color:#94a3b8;font-size:0.76rem;">${e.seccion}/${e.docId}: <em>${e.msg}</em></div>`).join('')}
      `;
      lista?.prepend(errDiv);
      if (eliminados > 0) _bdToast(`⚠️ Eliminados ${eliminados}, fallaron ${errores.length}`, 'info');
    }
  }

  // ════════════════════════════════════════════════════════════════
  // _irASeccionYScrollear — navega sin cerrar el modal (lo minimiza)
  // ════════════════════════════════════════════════════════════════
  function _irASeccionYScrollear(seccionId, firestoreIdx, enunciado) {
    const modal = document.getElementById('fb-modal-duplicados');
    if (modal) {
      modal.style.display = 'none';
      if (!document.getElementById('dup-barra-retorno')) {
        const barra = document.createElement('div');
        barra.id = 'dup-barra-retorno';
        barra.style.cssText = [
          'position:fixed','bottom:70px','left:50%','transform:translateX(-50%)',
          'z-index:300000','background:linear-gradient(135deg,#4c1d95,#6d28d9)',
          'color:#fff','padding:10px 20px','border-radius:50px',
          'font-size:0.82rem','font-weight:700','cursor:pointer',
          'box-shadow:0 4px 20px rgba(124,58,237,0.5)',
          'display:flex','align-items:center','gap:10px','white-space:nowrap',
          'border:1px solid rgba(255,255,255,0.2)'
        ].join(';');
        barra.innerHTML = '🔁 <span>Volver al buscador de duplicados</span>';
        barra.onclick = () => {
          modal.style.display = 'flex';
          barra.remove();
        };
        document.body.appendChild(barra);
      }
    }

    if (window.currentSection === seccionId) {
      _scrollearAPreguntaIdx(seccionId, firestoreIdx, enunciado);
      return;
    }

    if (typeof window.showSection === 'function') window.showSection(seccionId);

    let intentos = 0;
    const MAX_INTENTOS = 50;
    const intervalo = setInterval(() => {
      intentos++;
      const encontrado = _scrollearAPreguntaIdx(seccionId, firestoreIdx, enunciado);
      if (encontrado || intentos >= MAX_INTENTOS) {
        clearInterval(intervalo);
        if (!encontrado && intentos >= MAX_INTENTOS) {
          _bdToast('⚠️ La pregunta no aparece en el cuestionario — puede ser una entrada huérfana o ya fue eliminada', 'info');
        }
      }
    }, 100);
  }

  function _scrollearAPreguntaIdx(seccionId, firestoreIdx, enunciado) {
    const preguntas = window.preguntasPorSeccion?.[seccionId];
    let originalIdx = null;

    if (preguntas) {
      if (firestoreIdx !== null && firestoreIdx !== undefined && !isNaN(firestoreIdx)) {
        const encontrado = preguntas.findIndex(p => p._firestoreIdx === firestoreIdx);
        if (encontrado !== -1) originalIdx = encontrado;
      }
      if (originalIdx === null && enunciado) {
        const normalizado = enunciado.toLowerCase().replace(/\s+/g, ' ').trim();
        const encontrado = preguntas.findIndex(p =>
          (p.pregunta || '').toLowerCase().replace(/\s+/g, ' ').trim() === normalizado
        );
        if (encontrado !== -1) originalIdx = encontrado;
      }
    }

    if (originalIdx === null) return false;

    const puntajeEl = document.getElementById(`puntaje-${seccionId}-${originalIdx}`);
    if (!puntajeEl) return false;

    const pregDiv = puntajeEl.closest('.pregunta') || puntajeEl;
    pregDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    pregDiv.style.transition = 'outline 0.1s, box-shadow 0.1s';
    pregDiv.style.outline = '3px solid #7c3aed';
    pregDiv.style.boxShadow = '0 0 0 6px rgba(124,58,237,0.15)';
    pregDiv.style.borderRadius = '12px';
    setTimeout(() => {
      pregDiv.style.outline = '';
      pregDiv.style.boxShadow = '';
    }, 2500);
    return true;
  }

  // ════════════════════════════════════════════════════════════════
  // Estilos del modal
  // ════════════════════════════════════════════════════════════════
  function _fbInjectDuplicadosStyles() {
    if (document.getElementById('fb-duplicados-styles')) return;
    const s = document.createElement('style');
    s.id = 'fb-duplicados-styles';
    s.textContent = `
      #fb-modal-duplicados ::-webkit-scrollbar { width:6px; }
      #fb-modal-duplicados ::-webkit-scrollbar-track { background:rgba(255,255,255,0.04); }
      #fb-modal-duplicados ::-webkit-scrollbar-thumb { background:rgba(124,58,237,0.4); border-radius:3px; }
      #dup-filtro-texto:focus { border-color:#7c3aed !important; background:rgba(124,58,237,0.08) !important; }
      .dup-btn-eliminar-uno:hover, .dup-btn-eliminar-grupo:hover {
        background:rgba(239,68,68,0.32) !important;
        border-color:rgba(239,68,68,0.6) !important;
        color:#fff !important;
      }
    `;
    document.head.appendChild(s);
  }

  // ════════════════════════════════════════════════════════════════
  // Exponer al ámbito global
  // ════════════════════════════════════════════════════════════════
  // ── Escuchar subidas nuevas desde subir-preguntas-admin.js ──
  // Actualiza el caché en memoria sin releer Firestore
  window.addEventListener('sp:preguntasSubidas', ({ detail }) => {
    const { seccionId, nuevas } = detail;
    // Solo actuar si ya hay un escaneo cargado en memoria o en localStorage
    const hayCache = _dupGruposCache.length > 0 || !!localStorage.getItem(_DUP_CACHE_KEY);
    if (!hayCache) return;

    // Para cada pregunta nueva, ver si su enunciado ya existe en algún grupo
    nuevas.forEach(item => {
      const clave = _normalizarEnunciado(item.pregunta);
      if (!clave) return;
      const grupoExistente = _dupGruposCache.find(g =>
        g.length > 0 && _normalizarEnunciado(g[0].pregunta) === clave
      );
      if (grupoExistente) {
        // Era duplicado — agregar al grupo existente
        grupoExistente.push(item);
      }
      // Si es pregunta nueva única, no genera grupo → no hace falta agregar
    });

    // Actualizar caché localStorage con los grupos actualizados
    try {
      const cached = JSON.parse(localStorage.getItem(_DUP_CACHE_KEY) || 'null');
      if (cached) {
        cached.grupos        = _dupGruposCache;
        cached.totalPreguntas = (cached.totalPreguntas || 0) + nuevas.length;
        localStorage.setItem(_DUP_CACHE_KEY, JSON.stringify(cached));
        console.log('[DUP-SCAN] Caché actualizado por subida nueva en', seccionId,
          '+' + nuevas.length + ' preguntas');
      }
    } catch (_) {}
  });
  
  window.fbAbrirBuscadorDuplicados = fbAbrirBuscadorDuplicados;
  window._dupForzarRescan          = () => _escanearDuplicados(true);

})();
