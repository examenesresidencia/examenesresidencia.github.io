// ════════════════════════════════════════════════════════════════
// reclasificador-preguntas.js  — V1
// ────────────────────────────────────────────────────────────────
// Permite reclasificar preguntas hacia otra especialidad con impacto
// directo en Firestore. Visible solo para admin y soloquimicayaruqui@gmail.com.
//
// LÓGICA:
//   1. Agrega un botón "🔀 Reclasificar" junto a los botones de cada pregunta.
//   2. Al hacer clic, abre un modal con un dropdown de todas las especialidades.
//   3. Al confirmar:
//      a. Lee la pregunta completa desde el caché local (preguntasPorSeccion).
//      b. Busca el próximo índice libre en la sección destino en Firestore.
//      c. Escribe la pregunta en Firestore con el nuevo docId (destino_N).
//      d. Elimina el documento original de Firestore (origen_N).
//      e. Parchea el caché local (memoria + localStorage) en ambas secciones.
//      f. Re-renderiza la sección origen.
//      g. Muestra un toast de confirmación.
// ════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── Email autorizado (además de admin) ───────────────────────
  const EMAIL_AUTORIZADO = 'soloquimicayaruqui@gmail.com';

  // ── Mapa completo de especialidades ──────────────────────────
  const ESPECIALIDADES = [
    // Clínicas
    { id: 'pediatria',       label: 'Pediatría' },
    { id: 'cardiologia',     label: 'Cardiología' },
    { id: 'neurologia',      label: 'Neurología' },
    { id: 'endocrinologia',  label: 'Endocrinología' },
    { id: 'neumonologia',    label: 'Neumonología' },
    { id: 'nefrologia',      label: 'Nefrología' },
    { id: 'digestivo',       label: 'Digestivo' },
    { id: 'hematologia',     label: 'Hematología' },
    { id: 'infectologia',    label: 'Infectología' },
    { id: 'clinicamedica',   label: 'Clínica Médica' },
    // Gineco-Obstetricia
    { id: 'ginecologia',     label: 'Ginecología' },
    { id: 'obstetricia',     label: 'Obstetricia' },
    // Quirúrgicas
    { id: 'cirugia',         label: 'Cirugía' },
    { id: 'traumatologia',   label: 'Traumatología' },
    { id: 'urologia',        label: 'Urología' },
    { id: 'of',              label: 'Oftalmología' },
    { id: 'orl',             label: 'ORL' },
    // Otras especialidades
    { id: 'dermatologia',    label: 'Dermatología' },
    { id: 'psiquiatria',     label: 'Psiquiatría' },
    { id: 'reumatologia',    label: 'Reumatología' },
    { id: 'toxicologia',     label: 'Toxicología' },
    { id: 'medicinalegal',   label: 'Medicina Legal' },
    { id: 'saludpublica',    label: 'Salud Pública' },
    { id: 'medicinafamiliar',label: 'Medicina Familiar' },
    // Exámenes / Compilados
    { id: 'simulador',       label: 'Simulacro' },
    { id: 'compilado1',      label: 'Compilado 1' },
    { id: 'compilado2',      label: 'Compilado 2' },
    { id: 'compilado3',      label: 'Compilado 3' },
    { id: 'compilado4',      label: 'Compilado 4' },
    { id: 'compilado5',      label: 'Compilado 5' },
    { id: 'compilado6',      label: 'Compilado 6' },
    { id: 'compilado7',      label: 'Compilado 7' },
    { id: 'compilado8',      label: 'Compilado 8' },
    { id: 'compilado9',      label: 'Compilado 9' },
    { id: 'compilado10',     label: 'Compilado 10' },
    { id: 'unico2025t1',     label: 'Único 2025 T1' },
    { id: 'unico2025t2',     label: 'Único 2025 T2' },
    { id: 'unico2025',       label: 'Único 2025' },
    { id: 'unico2024',       label: 'Único 2024' },
    { id: 'unico2023',       label: 'Único 2023' },
    { id: 'unico2022',       label: 'Único 2022' },
    { id: 'unico2021',       label: 'Único 2021' },
    { id: 'unico2020',       label: 'Único 2020' },
    { id: 'unico2019',       label: 'Único 2019' },
    { id: 'unico2018',       label: 'Único 2018' },
    { id: 'unico2017',       label: 'Único 2017' },
    { id: 'unico2016',       label: 'Único 2016' },
    { id: 'uba2016',         label: 'UBA 2016' },
    { id: 'uba2017',         label: 'UBA 2017' },
    { id: 'uba2018',         label: 'UBA 2018' },
    { id: 'uba2019',         label: 'UBA 2019' },
  ];

  // ── Helpers ──────────────────────────────────────────────────
  function _puedeReclasificar() {
    const esAdmin = typeof window.fbIsAdmin === 'function' && window.fbIsAdmin();
    if (esAdmin) return true;
    const user = window._currentUser;
    return !!(user && user.email && user.email.toLowerCase() === EMAIL_AUTORIZADO);
  }

  function _toast(msg, tipo) {
    if (typeof window.fbToast === 'function') window.fbToast(msg, tipo);
  }

  // ── Inyectar estilos una sola vez ────────────────────────────
  function _inyectarEstilos() {
    if (document.getElementById('reclasif-styles')) return;
    const st = document.createElement('style');
    st.id = 'reclasif-styles';
    st.textContent = `
      /* ── Botón Reclasificar ── */
      .btn-reclasificar {
        padding: 6px 14px;
        border-radius: 8px;
        border: 1.5px solid rgba(167, 139, 250, 0.4);
        background: rgba(167, 139, 250, 0.08);
        color: #a78bfa;
        font-size: 13px;
        cursor: pointer;
        font-weight: 500;
        transition: background 0.15s, border-color 0.15s;
        white-space: nowrap;
      }
      .btn-reclasificar:hover {
        background: rgba(167, 139, 250, 0.2);
        border-color: rgba(167, 139, 250, 0.7);
      }

      /* ── Overlay del modal ── */
      #reclasif-modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 99999;
        background: rgba(10, 22, 40, 0.92);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px 16px;
        box-sizing: border-box;
        font-family: 'Segoe UI', system-ui, sans-serif;
        animation: reclasifFadeIn 0.18s ease both;
      }
      @keyframes reclasifFadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
      }

      /* ── Caja del modal ── */
      #reclasif-modal-box {
        background: linear-gradient(160deg, #0d2137 0%, #0a1628 100%);
        border: 1.5px solid rgba(167, 139, 250, 0.25);
        border-radius: 16px;
        padding: 28px 28px 24px;
        max-width: 520px;
        width: 100%;
        box-sizing: border-box;
        box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
        animation: reclasifBoxIn 0.24s cubic-bezier(0.34,1.2,0.64,1) both;
      }
      @keyframes reclasifBoxIn {
        from { opacity: 0; transform: scale(0.9) translateY(20px); }
        to   { opacity: 1; transform: scale(1) translateY(0); }
      }

      /* ── Cabecera ── */
      #reclasif-modal-box h3 {
        color: #a78bfa;
        margin: 0 0 6px;
        font-size: 1.05rem;
        font-weight: 700;
      }
      #reclasif-modal-box .reclasif-origen-tag {
        display: inline-block;
        background: rgba(167,139,250,0.1);
        border: 1px solid rgba(167,139,250,0.3);
        color: #c4b5fd;
        font-size: 0.75rem;
        font-weight: 700;
        padding: 2px 9px;
        border-radius: 20px;
        margin-bottom: 14px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }

      /* ── Vista previa de la pregunta ── */
      #reclasif-preview {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 10px;
        padding: 11px 14px;
        color: #cbd5e1;
        font-size: 0.83rem;
        line-height: 1.6;
        margin-bottom: 18px;
        max-height: 110px;
        overflow-y: auto;
        word-break: break-word;
        scrollbar-width: thin;
        scrollbar-color: rgba(167,139,250,0.3) transparent;
      }
      #reclasif-preview::-webkit-scrollbar       { width: 4px; }
      #reclasif-preview::-webkit-scrollbar-thumb { background: rgba(167,139,250,0.35); border-radius:2px; }

      /* ── Label del select ── */
      #reclasif-modal-box label {
        display: block;
        color: #94a3b8;
        font-size: 0.8rem;
        font-weight: 600;
        margin-bottom: 6px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      /* ── Select de especialidades ── */
      #reclasif-select {
        width: 100%;
        padding: 10px 12px;
        background: #071220;
        border: 1.5px solid rgba(167,139,250,0.3);
        border-radius: 9px;
        color: #e2e8f0;
        font-size: 0.9rem;
        font-family: inherit;
        cursor: pointer;
        outline: none;
        transition: border-color 0.15s;
        appearance: auto;
        margin-bottom: 18px;
        box-sizing: border-box;
      }
      #reclasif-select:focus {
        border-color: rgba(167,139,250,0.7);
        box-shadow: 0 0 0 2px rgba(167,139,250,0.12);
      }
      #reclasif-select option {
        background: #0a1628;
        color: #e2e8f0;
      }
      #reclasif-select optgroup {
        color: #64748b;
        font-weight: 700;
        font-size: 0.75rem;
      }

      /* ── Mensaje de error ── */
      #reclasif-err {
        color: #f87171;
        font-size: 0.82rem;
        margin-bottom: 12px;
        display: none;
      }
      #reclasif-err.visible { display: block; }

      /* ── Botones de acción ── */
      .reclasif-btns {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      #reclasif-btn-confirm {
        flex: 1;
        padding: 11px 0;
        border-radius: 10px;
        border: none;
        background: linear-gradient(135deg, #7c3aed, #6d28d9);
        color: #fff;
        font-size: 0.92rem;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 4px 16px rgba(124,58,237,0.4);
        transition: opacity 0.15s, transform 0.15s;
        letter-spacing: 0.02em;
      }
      #reclasif-btn-confirm:hover:not(:disabled) {
        opacity: 0.9;
        transform: translateY(-1px);
      }
      #reclasif-btn-confirm:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }
      #reclasif-btn-cancel {
        flex: 1;
        padding: 11px 0;
        border-radius: 10px;
        border: 1.5px solid rgba(148,163,184,0.25);
        background: rgba(255,255,255,0.04);
        color: #94a3b8;
        font-size: 0.92rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s;
      }
      #reclasif-btn-cancel:hover { background: rgba(255,255,255,0.09); }
    `;
    document.head.appendChild(st);
  }

  // ── Bloquear / desbloquear scroll de fondo ───────────────────
  let _scrollY = 0;
  function _bloquearScroll() {
    _scrollY = window.scrollY;
    document.body.style.position  = 'fixed';
    document.body.style.top       = `-${_scrollY}px`;
    document.body.style.width     = '100%';
    document.body.style.overflowY = 'scroll';
  }
  function _desbloquearScroll() {
    document.body.style.position  = '';
    document.body.style.top       = '';
    document.body.style.width     = '';
    document.body.style.overflowY = '';
    window.scrollTo({ top: _scrollY, behavior: 'instant' });
  }

  // ── Obtener el próximo índice libre en la sección destino ────
  // Estrategia: leer todos los docs de /preguntas/{destino}/items
  // y usar el mayor índice + 1, o bien usar el caché local si ya existe.
  async function _proximoIndice(destino) {
    const { getDocs, collection } = window.__fb;
    const _fbDb = window._fbDb;

    // 1. Intentar desde caché local primero (rápido)
    const pps = window.preguntasPorSeccion || {};
    let maxLocal = -1;
    if (Array.isArray(pps[destino]) && pps[destino].length > 0) {
      maxLocal = pps[destino].length; // 0-indexed length = next index (1-indexed = length+1 - 1 = length)
    }

    // 2. Consultar Firestore para asegurarse (evita colisiones si la sección no está en caché)
    try {
      const snap = await getDocs(collection(_fbDb, 'preguntas', destino, 'items'));
      if (!snap.empty) {
        // Parsear números de los docIds: destino_1, destino_2, etc. → extraer el número
        let maxFs = 0;
        snap.forEach(d => {
          const parts = d.id.split('_');
          const n = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(n) && n > maxFs) maxFs = n;
        });
        return maxFs + 1; // próximo libre
      }
    } catch (e) {
      console.warn('[RECLASIF] No se pudo leer la colección destino desde Firestore:', e.message);
    }

    // 3. Fallback al caché local
    return maxLocal + 1;
  }

  // ── Función principal: abrir modal de reclasificación ────────
  async function abrirModalReclasificacion(seccionOrigen, qIndex) {
    if (!_puedeReclasificar()) return;

    _inyectarEstilos();
    if (typeof window.fbInjectAuthStyles === 'function') window.fbInjectAuthStyles();

    // Evitar doble apertura
    if (document.getElementById('reclasif-modal-overlay')) return;

    // Obtener la pregunta
    const pps  = window.preguntasPorSeccion || {};
    const preg = (pps[seccionOrigen] || [])[qIndex];
    if (!preg) {
      _toast('❌ No se encontró la pregunta en el caché local', 'error');
      return;
    }

    const previewTexto = (preg.pregunta || '').replace(/<[^>]+>/g, '').trim();

    // Nombre legible de la sección origen
    const origenLabel = (ESPECIALIDADES.find(e => e.id === seccionOrigen) || { label: seccionOrigen }).label;

    _bloquearScroll();

    // ── Construir el modal ────────────────────────────────────
    const overlay = document.createElement('div');
    overlay.id = 'reclasif-modal-overlay';

    // Agrupar especialidades por categoría para el select
    const grupos = [
      {
        label: 'CLÍNICAS',
        items: ['pediatria','cardiologia','neurologia','endocrinologia','neumonologia',
                'nefrologia','digestivo','hematologia','infectologia','clinicamedica']
      },
      {
        label: 'GINECO-OBSTETRICIA',
        items: ['ginecologia','obstetricia']
      },
      {
        label: 'QUIRÚRGICAS',
        items: ['cirugia','traumatologia','urologia','of','orl']
      },
      {
        label: 'OTRAS ESPECIALIDADES',
        items: ['dermatologia','psiquiatria','reumatologia','toxicologia',
                'medicinalegal','saludpublica','medicinafamiliar']
      },
      {
        label: 'EXÁMENES / COMPILADOS',
        items: ['simulador','compilado1','compilado2','compilado3','compilado4',
                'compilado5','compilado6','compilado7','compilado8','compilado9','compilado10',
                'unico2025t1','unico2025t2','unico2025','unico2024','unico2023','unico2022',
                'unico2021','unico2020','unico2019','unico2018','unico2017','unico2016',
                'uba2016','uba2017','uba2018','uba2019']
      }
    ];

    // Construir <optgroup> HTML (excluir la sección actual)
    let optsHTML = `<option value="">— Seleccioná la especialidad destino —</option>`;
    grupos.forEach(g => {
      const items = g.items
        .filter(id => id !== seccionOrigen)
        .map(id => {
          const esp = ESPECIALIDADES.find(e => e.id === id);
          return esp ? `<option value="${esp.id}">${esp.label}</option>` : '';
        })
        .join('');
      if (items) {
        optsHTML += `<optgroup label="${g.label}">${items}</optgroup>`;
      }
    });

    overlay.innerHTML = `
      <div id="reclasif-modal-box">
        <h3>🔀 Reclasificar Pregunta</h3>
        <span class="reclasif-origen-tag">Origen: ${origenLabel}</span>

        <div id="reclasif-preview">${previewTexto.length > 300 ? previewTexto.slice(0, 300) + '…' : previewTexto}</div>

        <label for="reclasif-select">Mover hacia la especialidad:</label>
        <select id="reclasif-select">${optsHTML}</select>

        <div id="reclasif-err"></div>

        <div class="reclasif-btns">
          <button id="reclasif-btn-confirm">🔀 Confirmar reclasificación</button>
          <button id="reclasif-btn-cancel">Cancelar</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    function cerrarModal() {
      _desbloquearScroll();
      overlay.remove();
    }

    function mostrarErr(msg) {
      const el = document.getElementById('reclasif-err');
      if (el) { el.textContent = msg; el.classList.add('visible'); }
    }

    document.getElementById('reclasif-btn-cancel').onclick = cerrarModal;

    // Cerrar al hacer clic fuera de la caja
    overlay.addEventListener('click', e => {
      if (e.target === overlay) cerrarModal();
    });

    // ── Confirmar reclasificación ─────────────────────────────
    document.getElementById('reclasif-btn-confirm').onclick = async () => {
      const select     = document.getElementById('reclasif-select');
      const destino    = select ? select.value.trim() : '';
      const btnConfirm = document.getElementById('reclasif-btn-confirm');
      const errEl      = document.getElementById('reclasif-err');

      if (errEl) errEl.classList.remove('visible');

      if (!destino) {
        mostrarErr('⚠️ Seleccioná una especialidad destino.');
        return;
      }
      if (destino === seccionOrigen) {
        mostrarErr('⚠️ La especialidad destino debe ser diferente al origen.');
        return;
      }

      btnConfirm.disabled    = true;
      btnConfirm.textContent = 'Procesando…';

      try {
        const { doc, setDoc, deleteDoc, getDocs, collection } = window.__fb;
        const _fbDb = window._fbDb;

        // 1. Obtener el próximo índice libre en la sección destino
        const nuevoIndice = await _proximoIndice(destino);
        const nuevoDocId  = `${destino}_${nuevoIndice}`;
        const origenDocId = `${seccionOrigen}_${qIndex + 1}`;

        console.log(`[RECLASIF] Moviendo ${origenDocId} → ${nuevoDocId}`);

        // 2. Preparar el objeto de la pregunta a escribir (clonar sin contaminar)
        const pregClonada = JSON.parse(JSON.stringify(preg));
        // Limpiar campos que podrían ser índice-específicos del origen
        // (no hay campos propios de índice en la estructura estándar)

        // 3. Escribir la pregunta en la sección destino en Firestore
        // Ruta: /preguntas/{destino}/items/{nuevoDocId}
        await setDoc(
          doc(_fbDb, 'preguntas', destino, 'items', nuevoDocId),
          pregClonada
        );

        // 4. Eliminar la pregunta original en Firestore
        // La ruta del origen depende de si usaba /questions o /preguntas
        // El sistema almacena en /preguntas/{seccion}/items/{docId}
        await deleteDoc(
          doc(_fbDb, 'preguntas', seccionOrigen, 'items', origenDocId)
        );

        // ── 5. Parche quirúrgico en caché local ──────────────
        // 5a. Quitar del caché del origen
        if (Array.isArray(pps[seccionOrigen])) {
          pps[seccionOrigen].splice(qIndex, 1);
        }
        // Parche en localStorage del origen
        const _ckOrigen = 'fb_q_cache_' + seccionOrigen;
        try {
          const _raw = localStorage.getItem(_ckOrigen);
          if (_raw) {
            const _c = JSON.parse(_raw);
            if (Array.isArray(_c?.preguntas)) {
              _c.preguntas.splice(qIndex, 1);
              _c.ts = Date.now();
              localStorage.setItem(_ckOrigen, JSON.stringify(_c));
            }
          }
        } catch (_) {
          try { localStorage.removeItem(_ckOrigen); } catch (_2) {}
        }
        try { localStorage.removeItem('fb_edits_cache_' + seccionOrigen); } catch (_) {}

        // 5b. Agregar al caché del destino (si ya está cargado en memoria)
        if (Array.isArray(pps[destino])) {
          pps[destino].push(pregClonada);
        }
        // Parche en localStorage del destino
        const _ckDestino = 'fb_q_cache_' + destino;
        try {
          const _raw2 = localStorage.getItem(_ckDestino);
          if (_raw2) {
            const _c2 = JSON.parse(_raw2);
            if (Array.isArray(_c2?.preguntas)) {
              _c2.preguntas.push(pregClonada);
              _c2.ts = Date.now();
              localStorage.setItem(_ckDestino, JSON.stringify(_c2));
            }
          }
        } catch (_) {
          // Si falla, simplemente invalidar el caché del destino
          try { localStorage.removeItem(_ckDestino); } catch (_2) {}
        }
        try { localStorage.removeItem('fb_edits_cache_' + destino); } catch (_) {}

        // 5c. Limpiar estado del quiz para la sección origen
        const STORAGE_KEY = window.STORAGE_KEY || 'quiz_state_v3';
        let state = {};
        try { state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (_) {}
        if (state[seccionOrigen]) {
          delete state[seccionOrigen];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        }

        // 6. Re-renderizar la sección origen
        const scrollAntes = _scrollY; // capturado antes de desbloquear
        cerrarModal();

        if (typeof window.generarCuestionario === 'function') {
          window.generarCuestionario(seccionOrigen);
        }

        requestAnimationFrame(() => requestAnimationFrame(() => {
          window.scrollTo({ top: scrollAntes, behavior: 'instant' });
        }));

        // 7. Toast de confirmación
        const destinoLabel = (ESPECIALIDADES.find(e => e.id === destino) || { label: destino }).label;
        _toast(`✅ Pregunta movida a ${destinoLabel} (doc: ${nuevoDocId})`, 'success');
        console.log(`[RECLASIF] ✅ ${origenDocId} → ${nuevoDocId}`);

      } catch (e) {
        console.error('[RECLASIF] Error:', e);
        const errEl2 = document.getElementById('reclasif-err');
        if (errEl2) {
          errEl2.textContent = '❌ Error: ' + e.message;
          errEl2.classList.add('visible');
        }
        if (btnConfirm) {
          btnConfirm.disabled    = false;
          btnConfirm.textContent = '🔀 Confirmar reclasificación';
        }
      }
    };
  }

  // ════════════════════════════════════════════════════════════════
  // fbInjectReclasificarButton
  // Llamado desde script.js (o desde editor-admin.js) por cada pregunta.
  // Inserta el botón "🔀 Reclasificar" en el div de botones de la pregunta.
  // ════════════════════════════════════════════════════════════════
  function fbInjectReclasificarButton(seccionId, qIndex, botonesDiv) {
    if (!_puedeReclasificar()) return;
    _inyectarEstilos();

    // Evitar duplicados
    if (botonesDiv.querySelector('[data-reclasif-btn]')) return;

    const btn = document.createElement('button');
    btn.textContent = '🔀 Reclasificar';
    btn.className   = 'btn-reclasificar';
    btn.setAttribute('data-reclasif-btn', '1');
    btn.title = 'Mover esta pregunta a otra especialidad';

    btn.addEventListener('click', () => abrirModalReclasificacion(seccionId, qIndex));
    botonesDiv.appendChild(btn);
  }

  // ── Exponer globalmente ───────────────────────────────────────
  window.fbInjectReclasificarButton   = fbInjectReclasificarButton;
  window.abrirModalReclasificacion    = abrirModalReclasificacion;

})();
