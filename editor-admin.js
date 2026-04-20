// ════════════════════════════════════════════════════════════════
// editor-admin.js  — V2
// ────────────────────────────────────────────────────────────────


(function () {
  'use strict';

  // ── Helpers ───────────────────────────────────────────────────
  // Delegamos en las funciones exportadas por script.js a window.
  // Nombres internos con prefijo "_meq" para evitar colisión/recursión.
  function _meqIsAdmin()          { return typeof window.fbIsAdmin === 'function' && window.fbIsAdmin(); }
  function _meqToast(m, t)        { if (typeof window.fbToast === 'function') window.fbToast(m, t); }
  function _meqInjectAuthStyles() { if (typeof window.fbInjectAuthStyles === 'function') window.fbInjectAuthStyles(); }
  function fbShowEditErr(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.classList.add('visible'); }
  }

  // ── Bloquear / desbloquear scroll de fondo ────────────────────
  let _scrollY = 0;
  function bloquearScrollFondo() {
    _scrollY = window.scrollY;
    document.body.style.position  = 'fixed';
    document.body.style.top       = `-${_scrollY}px`;
    document.body.style.width     = '100%';
    document.body.style.overflowY = 'scroll';
  }
  function desbloquearScrollFondo() {
    document.body.style.position  = '';
    document.body.style.top       = '';
    document.body.style.width     = '';
    document.body.style.overflowY = '';
    window.scrollTo({ top: _scrollY, behavior: 'instant' });
  }

  // ── Estilos (inyectados una sola vez) ─────────────────────────
  function inyectarEstilos() {
    if (document.getElementById('meq-styles-v2')) return;
    const st = document.createElement('style');
    st.id = 'meq-styles-v2';
    st.textContent = `

      /* ── Toolbar ── */
      .meq-expl-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: linear-gradient(135deg, #0d2137, #0a1628);
        border: 1px solid rgba(56,189,248,0.18);
        border-bottom: none;
        border-radius: 8px 8px 0 0;
        padding: 6px 10px;
        gap: 6px;
        flex-wrap: wrap;
      }
      .meq-expl-label {
        color: #94a3b8;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .meq-toolbar-grupos {
        display: flex;
        gap: 3px;
        align-items: center;
        flex-wrap: wrap;
      }
      .meq-sep {
        width: 1px;
        height: 20px;
        background: rgba(255,255,255,0.12);
        margin: 0 3px;
        flex-shrink: 0;
      }

      /* ── Botones de formato ── */
      .meq-btn-fmt {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 28px;
        height: 26px;
        background: rgba(255,255,255,0.06);
        border: 1.5px solid rgba(255,255,255,0.13);
        color: #cbd5e1;
        border-radius: 5px;
        font-size: 0.82rem;
        cursor: pointer;
        transition: background 0.14s, border-color 0.14s, color 0.14s, transform 0.14s;
        padding: 0 5px;
        line-height: 1;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .meq-btn-fmt:hover {
        background: rgba(255,255,255,0.15);
        border-color: rgba(255,255,255,0.32);
        color: #f1f5f9;
        transform: translateY(-1px);
      }
      .meq-btn-fmt.activo {
        background: rgba(8,145,178,0.22);
        border-color: rgba(8,145,178,0.6);
        color: #38bdf8;
      }

      /* ── Botón imagen ── */
      .meq-btn-img {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: rgba(56,189,248,0.10);
        border: 1.5px solid rgba(56,189,248,0.32);
        color: #38bdf8;
        border-radius: 6px;
        font-size: 0.74rem;
        font-weight: 700;
        padding: 4px 9px;
        cursor: pointer;
        transition: all 0.16s;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .meq-btn-img:hover {
        background: rgba(56,189,248,0.22);
        border-color: rgba(56,189,248,0.65);
        transform: translateY(-1px);
      }

      /* ── Editor WYSIWYG (contenteditable) ── */
      #meq-editor-wysiwyg {
        min-height: 220px;
        max-height: 400px;
        overflow-y: auto;
        overflow-x: hidden;
        background: #0a1628;
        border: 1.5px solid rgba(56,189,248,0.18);
        border-top: none;
        border-radius: 0 0 8px 8px;
        padding: 12px 14px;
        color: #e2e8f0;
        font-size: 0.88rem;
        line-height: 1.7;
        outline: none;
        word-break: break-word;
        box-sizing: border-box;
        scroll-behavior: smooth;
        scrollbar-width: thin;
        scrollbar-color: rgba(56,189,248,0.35) rgba(255,255,255,0.04);
      }
      #meq-editor-wysiwyg:focus {
        border-color: rgba(8,145,178,0.55);
        box-shadow: 0 0 0 2px rgba(8,145,178,0.12);
      }
      #meq-editor-wysiwyg::-webkit-scrollbar        { width: 6px; }
      #meq-editor-wysiwyg::-webkit-scrollbar-track  { background: rgba(255,255,255,0.04); border-radius: 3px; }
      #meq-editor-wysiwyg::-webkit-scrollbar-thumb  { background: rgba(56,189,248,0.35); border-radius: 3px; }
      #meq-editor-wysiwyg::-webkit-scrollbar-thumb:hover { background: rgba(56,189,248,0.6); }

      /* Contenido dentro del editor */
      #meq-editor-wysiwyg img {
        max-width: 100%;
        border-radius: 8px;
        margin: 10px 0;
        display: block;
        box-shadow: 0 2px 10px rgba(0,0,0,0.25);
      }
      #meq-editor-wysiwyg strong, #meq-editor-wysiwyg b { font-weight: 700; }
      #meq-editor-wysiwyg em, #meq-editor-wysiwyg i     { font-style: italic; }
      #meq-editor-wysiwyg u                              { text-decoration: underline; }
      #meq-editor-wysiwyg sub  { font-size: 0.75em; vertical-align: sub; }
      #meq-editor-wysiwyg sup  { font-size: 0.75em; vertical-align: super; }
      #meq-editor-wysiwyg ul   { padding-left: 1.5em; margin: 6px 0; list-style: disc; }
      #meq-editor-wysiwyg ol   { padding-left: 1.5em; margin: 6px 0; list-style: decimal; }
      #meq-editor-wysiwyg li   { margin: 2px 0; }
      #meq-editor-wysiwyg p    { margin: 4px 0; }
      #meq-editor-wysiwyg div  { margin: 2px 0; }

      /* Placeholder */
      #meq-editor-wysiwyg:empty::before {
        content: attr(data-placeholder);
        color: #334155;
        pointer-events: none;
        font-style: italic;
      }

      /* ── Panel imagen ── */
      .meq-img-panel {
        background: #070f1c;
        border: 1.5px solid rgba(56,189,248,0.22);
        border-top: none;
        border-radius: 0 0 8px 8px;
        padding: 12px 14px;
        animation: meqPanelIn 0.2s cubic-bezier(0.34,1.2,0.64,1) both;
      }
      @keyframes meqPanelIn {
        from { opacity:0; transform:translateY(-5px); }
        to   { opacity:1; transform:translateY(0); }
      }
      .meq-img-hint {
        font-size: 0.73rem;
        color: #64748b;
        line-height: 1.5;
        margin-bottom: 10px;
        display: flex;
        gap: 6px;
        align-items: flex-start;
      }
      .meq-img-hint svg    { flex-shrink:0; margin-top:2px; color:#38bdf8; }
      .meq-img-hint strong { color: #94a3b8; }
      .meq-img-hint em     { color: #fbbf24; font-style: normal; }
      .meq-input-row {
        display: flex;
        align-items: center;
        background: #0a1628;
        border: 1.5px solid rgba(56,189,248,0.20);
        border-radius: 7px;
        overflow: hidden;
        margin-bottom: 10px;
        transition: border-color 0.15s;
        cursor: pointer;
      }
      .meq-input-row:focus-within { border-color: #0891b2; }
      .meq-prefix {
        padding: 0 10px;
        color: #38bdf8;
        font-size: 0.73rem;
        font-family: 'Courier New', monospace;
        font-weight: 700;
        white-space: nowrap;
        background: rgba(56,189,248,0.07);
        border-right: 1px solid rgba(56,189,248,0.16);
        height: 34px;
        display: flex;
        align-items: center;
        flex-shrink: 0;
      }
      .meq-input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        color: #e2e8f0;
        font-size: 0.81rem;
        font-family: 'Courier New', monospace;
        padding: 0 10px;
        height: 34px;
      }
      .meq-input::placeholder { color: #334155; }
      .meq-preview-wrap {
        background: #0a1628;
        border: 1px solid rgba(56,189,248,0.14);
        border-radius: 7px;
        padding: 10px;
        margin-bottom: 10px;
        text-align: center;
      }
      .meq-preview-img {
        max-width: 100%;
        max-height: 180px;
        border-radius: 6px;
        border: 1px solid rgba(56,189,248,0.2);
        display: block;
        margin: 0 auto 7px;
      }
      .meq-preview-status { font-size: 0.74rem; font-weight: 600; }
      .meq-actions { display: flex; gap: 8px; flex-wrap: wrap; }
      .meq-btn-verificar, .meq-btn-insertar {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        border-radius: 7px;
        font-size: 0.77rem;
        font-weight: 700;
        padding: 6px 13px;
        cursor: pointer;
        border: none;
        transition: all 0.16s;
      }
      .meq-btn-verificar {
        background: rgba(56,189,248,0.10);
        border: 1.5px solid rgba(56,189,248,0.28);
        color: #38bdf8;
      }
      .meq-btn-verificar:hover { background: rgba(56,189,248,0.20); }
      .meq-btn-insertar {
        background: linear-gradient(135deg, #0891b2, #0d7490);
        color: #fff;
        box-shadow: 0 3px 10px rgba(8,145,178,0.28);
      }
      .meq-btn-insertar:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 5px 14px rgba(8,145,178,0.4);
      }
      .meq-btn-insertar:disabled { opacity: 0.35; cursor: not-allowed; transform: none; }
    `;
    document.head.appendChild(st);
  }

  // ── execCommand helper ────────────────────────────────────────
  // Asegura el foco en el editor antes de ejecutar cualquier comando
  function cmd(command, value) {
    const ed = document.getElementById('meq-editor-wysiwyg');
    if (ed) ed.focus();
    document.execCommand(command, false, value !== undefined ? value : null);
    actualizarEstadoBotones();
  }

  // ── Actualizar estado visual (activo) de los botones ──────────
  function actualizarEstadoBotones() {
    const mapa = {
      'meq-btn-bold'      : 'bold',
      'meq-btn-italic'    : 'italic',
      'meq-btn-underline' : 'underline',
      'meq-btn-sub'       : 'subscript',
      'meq-btn-sup'       : 'superscript',
      'meq-btn-ul'        : 'insertUnorderedList',
      'meq-btn-ol'        : 'insertOrderedList',
      'meq-btn-left'      : 'justifyLeft',
      'meq-btn-center'    : 'justifyCenter',
      'meq-btn-right'     : 'justifyRight',
      'meq-btn-justify'   : 'justifyFull',
    };
    Object.entries(mapa).forEach(([id, command]) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      try { btn.classList.toggle('activo', document.queryCommandState(command)); } catch (_) {}
    });
  }

  // ── Serializar el WYSIWYG a HTML limpio para Firestore ────────
  function serializarEditor() {
    const ed = document.getElementById('meq-editor-wysiwyg');
    if (!ed) return '';
    let html = ed.innerHTML;
    // Eliminar BRs residuales al inicio y al final
    html = html.replace(/^(\s*<br\s*\/?>\s*)+/i, '').replace(/(\s*<br\s*\/?>\s*)+$/i, '').trim();
    return html;
  }

  // ── Cargar HTML guardado en el editor ─────────────────────────
  function cargarEnEditor(html) {
    const ed = document.getElementById('meq-editor-wysiwyg');
    if (!ed) return;
    // Si es texto plano (sin etiquetas), convertir \n a <br>
    if (html && !/<[a-z][\s\S]*>/i.test(html)) {
      html = html.replace(/\n/g, '<br>');
    }
    ed.innerHTML = html || '';
  }

  // ════════════════════════════════════════════════════════════════
  // abrirModalEdicionAdmin — función principal
  // ════════════════════════════════════════════════════════════════
  function abrirModalEdicionAdmin(seccionId, qIndex) {
    if (!_meqIsAdmin()) return;

    const preguntasPorSeccion = window.preguntasPorSeccion || {};
    const preg = (preguntasPorSeccion[seccionId] || [])[qIndex];
    if (!preg) return;

    _meqInjectAuthStyles();
    inyectarEstilos();

    document.getElementById('fb-modal-edit-q')?.remove();

    const GITHUB_IMAGES_BASE = window.GITHUB_IMAGES_BASE ||
      'https://examenesresidencia.github.io/imagenes/';

    // Bloquear scroll de fondo
    bloquearScrollFondo();

    const opcionesHTML = preg.opciones.map((op, i) => `
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:4px;">
        <input type="radio" name="edit-correcta" value="${i}"
          ${preg.correcta.includes(i) ? 'checked' : ''}
          style="accent-color:#0891b2;width:16px;height:16px;flex-shrink:0;">
        <textarea class="fb-input edit-opcion" data-idx="${i}"
          rows="1" style="flex:1;resize:vertical;font-size:0.85rem;padding:6px 10px;"></textarea>
      </div>`).join('');

    const overlay = document.createElement('div');
    overlay.id = 'fb-modal-edit-q';
    overlay.style.cssText = [
      'position:fixed','inset:0','z-index:99998',
      'background:rgba(10,22,40,0.88)','backdrop-filter:blur(8px)',
      '-webkit-backdrop-filter:blur(8px)',
      'display:flex','align-items:flex-start','justify-content:center',
      'padding:20px 12px','overflow-y:auto','overflow-x:hidden',
      'box-sizing:border-box',
      'font-family:Segoe UI,system-ui,sans-serif'
    ].join(';');

    overlay.innerHTML = `
      <div class="fb-card" style="max-width:640px;width:100%;box-sizing:border-box;">

        <!-- Cabecera -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
          <h3 style="color:#f1f5f9;margin:0;font-size:1.05rem;">✏️ Editar pregunta ${qIndex + 1}</h3>
          <button id="edit-q-close" style="background:none;border:none;color:#94a3b8;font-size:1.4rem;cursor:pointer;line-height:1;">✕</button>
        </div>

        <!-- Enunciado -->
        <div class="fb-field">
          <label class="fb-label">Enunciado</label>
          <textarea class="fb-input" id="edit-q-enunciado" rows="2"
            style="resize:vertical;font-size:0.88rem;"></textarea>
        </div>

        <!-- Opciones -->
        <div class="fb-field">
          <label class="fb-label">Opciones — marcá la correcta con el radio ●</label>
          ${opcionesHTML}
        </div>

        <!-- Explicación -->
        <div class="fb-field" style="margin-bottom:4px;">

          <!-- Toolbar -->
          <div class="meq-expl-toolbar">
            <span class="meq-expl-label">Explicación</span>
            <div class="meq-toolbar-grupos">

              <!-- Formato básico -->
              <button class="meq-btn-fmt" id="meq-btn-bold"      type="button" title="Negrita (Ctrl+B)"><strong>B</strong></button>
              <button class="meq-btn-fmt" id="meq-btn-italic"    type="button" title="Cursiva (Ctrl+I)"><em style="font-style:italic">I</em></button>
              <button class="meq-btn-fmt" id="meq-btn-underline" type="button" title="Subrayado (Ctrl+U)"><u>S</u></button>
              <button class="meq-btn-fmt" id="meq-btn-sub"       type="button" title="Subíndice">X<sub style="font-size:0.6em;line-height:1">₂</sub></button>
              <button class="meq-btn-fmt" id="meq-btn-sup"       type="button" title="Superíndice">X<sup style="font-size:0.6em;line-height:1">²</sup></button>

              <div class="meq-sep"></div>

              <!-- Alineación -->
              <button class="meq-btn-fmt" id="meq-btn-left"    type="button" title="Alinear izquierda" style="font-size:0.7rem;">◀≡</button>
              <button class="meq-btn-fmt" id="meq-btn-center"  type="button" title="Centrar"           style="font-size:0.7rem;">≡≡</button>
              <button class="meq-btn-fmt" id="meq-btn-right"   type="button" title="Alinear derecha"   style="font-size:0.7rem;">≡▶</button>
              <button class="meq-btn-fmt" id="meq-btn-justify" type="button" title="Justificar"        style="font-size:0.7rem;">☰</button>

              <div class="meq-sep"></div>

              <!-- Listas -->
              <button class="meq-btn-fmt" id="meq-btn-ul" type="button" title="Lista de viñetas"  style="font-size:0.68rem;">• ≡</button>
              <button class="meq-btn-fmt" id="meq-btn-ol" type="button" title="Lista numerada"    style="font-size:0.68rem;">1.≡</button>

              <div class="meq-sep"></div>

              <!-- Imagen -->
              <button class="meq-btn-img" id="meq-btn-img" type="button" title="Insertar imagen">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                🖼 Imagen
              </button>
            </div>
          </div>

          <!-- Panel imagen dinámico -->
          <div id="meq-img-panel-container"></div>

          <!-- Editor WYSIWYG -->
          <div id="meq-editor-wysiwyg"
               contenteditable="true"
               data-placeholder="Escribí la explicación aquí…"
               spellcheck="false">
          </div>
        </div>

        <div class="fb-error" id="edit-q-err" style="margin-bottom:10px;"></div>
        <button class="fb-btn-primary"   id="edit-q-save">💾 Guardar en Firestore</button>
        <button class="fb-btn-secondary" id="edit-q-cancel" style="margin-top:8px;">Cancelar</button>
      </div>`;

    document.body.appendChild(overlay);

    // ── Poblar campos ─────────────────────────────────────────────
    overlay.querySelector('#edit-q-enunciado').value = preg.pregunta || '';
    overlay.querySelectorAll('.edit-opcion').forEach((ta, i) => {
      ta.value = preg.opciones[i] || '';
    });
    cargarEnEditor(preg.explicacion || '');

    // ── Cerrar modal ──────────────────────────────────────────────
    function cerrarModal() {
      desbloquearScrollFondo();
      overlay.remove();
    }
    document.getElementById('edit-q-close').onclick  = cerrarModal;
    document.getElementById('edit-q-cancel').onclick = cerrarModal;
    overlay.addEventListener('click', e => { if (e.target === overlay) cerrarModal(); });

    // ── Ref al editor ─────────────────────────────────────────────
    const editor = overlay.querySelector('#meq-editor-wysiwyg');

    // Actualizar estado de botones al mover cursor o cambiar selección
    editor.addEventListener('keyup',   actualizarEstadoBotones);
    editor.addEventListener('mouseup', actualizarEstadoBotones);

    // ── Atajos de teclado ─────────────────────────────────────────
    // Ctrl+A y Ctrl+Z funcionan nativamente en contenteditable.
    // Solo interceptamos B, I, U para evitar que el navegador
    // use su propio comportamiento en lugar del nuestro.
    editor.addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'b': e.preventDefault(); cmd('bold');      break;
          case 'i': e.preventDefault(); cmd('italic');    break;
          case 'u': e.preventDefault(); cmd('underline'); break;
        }
      }
    });

    // ── Botones de la toolbar ─────────────────────────────────────
    overlay.querySelector('#meq-btn-bold').onclick      = () => cmd('bold');
    overlay.querySelector('#meq-btn-italic').onclick    = () => cmd('italic');
    overlay.querySelector('#meq-btn-underline').onclick = () => cmd('underline');
    overlay.querySelector('#meq-btn-sub').onclick       = () => cmd('subscript');
    overlay.querySelector('#meq-btn-sup').onclick       = () => cmd('superscript');
    overlay.querySelector('#meq-btn-left').onclick      = () => cmd('justifyLeft');
    overlay.querySelector('#meq-btn-center').onclick    = () => cmd('justifyCenter');
    overlay.querySelector('#meq-btn-right').onclick     = () => cmd('justifyRight');
    overlay.querySelector('#meq-btn-justify').onclick   = () => cmd('justifyFull');
    overlay.querySelector('#meq-btn-ul').onclick        = () => cmd('insertUnorderedList');
    overlay.querySelector('#meq-btn-ol').onclick        = () => cmd('insertOrderedList');

    // ── Panel de imagen ───────────────────────────────────────────
    const btnImg    = overlay.querySelector('#meq-btn-img');
    const panelCont = overlay.querySelector('#meq-img-panel-container');

    // Guardamos la selección (rango) para insertar la imagen en el lugar correcto
    let _savedRange = null;
    function guardarSeleccion() {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const r = sel.getRangeAt(0);
        if (editor.contains(r.commonAncestorContainer)) {
          _savedRange = r.cloneRange();
        }
      }
    }
    function restaurarSeleccion() {
      if (!_savedRange) { editor.focus(); return; }
      editor.focus();
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(_savedRange);
    }
    editor.addEventListener('mouseup', guardarSeleccion);
    editor.addEventListener('keyup',   guardarSeleccion);

    btnImg.addEventListener('click', () => {
      guardarSeleccion();
      // Toggle: si ya está abierto lo cierra
      if (panelCont.querySelector('.meq-img-panel')) {
        panelCont.innerHTML      = '';
        btnImg.style.background  = '';
        btnImg.style.borderColor = '';
        return;
      }
      btnImg.style.background  = 'rgba(56,189,248,0.22)';
      btnImg.style.borderColor = 'rgba(56,189,248,0.7)';

      const panel = document.createElement('div');
      panel.className = 'meq-img-panel';
      panel.innerHTML = `
        <div class="meq-img-hint">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>
            <strong>Local:</strong> poné la imagen en <strong>imagenes/</strong>. &nbsp;
            <strong>Producción:</strong> subila a GitHub Pages en <strong>imagenes/</strong>.
            Al guardar se usa la URL de <em>GitHub</em>.
          </span>
        </div>
        <div class="meq-input-row" id="meq-file-row" title="Clic para elegir imagen">
          <div class="meq-prefix">📁 imagenes/</div>
          <span class="meq-input" id="meq-nombre-display"
            style="color:#64748b;display:flex;align-items:center;user-select:none;">
            Clic para buscar imagen…
          </span>
          <input type="file"   id="meq-file-input" accept="image/*" style="display:none;" autocomplete="off"/>
          <input type="hidden" id="meq-nombre" value=""/>
        </div>
        <div id="meq-preview-wrap" style="display:none;" class="meq-preview-wrap">
          <img class="meq-preview-img" id="meq-preview-img" src="" alt="preview"/>
          <div class="meq-preview-status" id="meq-preview-status"></div>
        </div>
        <div class="meq-actions">
          <button class="meq-btn-verificar" id="meq-btn-verificar" type="button">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            Verificar
          </button>
          <button class="meq-btn-insertar" id="meq-btn-insertar" disabled type="button">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5"  y1="12" x2="19" y2="12"/>
            </svg>
            Insertar en explicación
          </button>
        </div>`;
      panelCont.appendChild(panel);

      const inputNombre    = panel.querySelector('#meq-nombre');
      const fileInput      = panel.querySelector('#meq-file-input');
      const fileRow        = panel.querySelector('#meq-file-row');
      const nombreDisplay  = panel.querySelector('#meq-nombre-display');
      const btnVerificar   = panel.querySelector('#meq-btn-verificar');
      const btnInsertar    = panel.querySelector('#meq-btn-insertar');
      const previewWrap    = panel.querySelector('#meq-preview-wrap');
      const previewImg     = panel.querySelector('#meq-preview-img');
      const previewStatus  = panel.querySelector('#meq-preview-status');
      let urlVerificada    = '';
      let nombreVerificado = '';

      fileRow.addEventListener('click', () => fileInput.click());

      // Al seleccionar archivo: preview inmediato con URL local temporal
      fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (!file) return;
        inputNombre.value         = file.name;
        nombreDisplay.textContent = file.name;
        nombreDisplay.style.color = '#e2e8f0';
        const localUrl = URL.createObjectURL(file);
        previewWrap.style.display = 'block';
        previewImg.src            = localUrl;
        previewImg.style.display  = 'block';
        previewStatus.innerHTML   = '📁 Imagen seleccionada — <span style="color:#fbbf24">recordá subirla a imagenes/ en GitHub</span>';
        previewStatus.style.color = '#34d399';
        btnInsertar.disabled      = false;
        urlVerificada             = localUrl;
        nombreVerificado          = file.name;
      });

      // Verificar: prueba GitHub Pages primero, luego local
      btnVerificar.addEventListener('click', () => {
        const nombre = inputNombre.value.trim();
        if (!nombre) { inputNombre.style.borderColor = '#ef4444'; return; }
        inputNombre.style.borderColor = '';
        const urlGH    = GITHUB_IMAGES_BASE + nombre;
        const urlLocal = 'imagenes/' + nombre;
        previewWrap.style.display = 'block';
        previewStatus.textContent = 'Verificando…';
        previewStatus.style.color = '#94a3b8';
        previewImg.style.display  = 'none';
        btnInsertar.disabled      = true;
        urlVerificada = ''; nombreVerificado = '';

        function probar(url, esLocal) {
          const t = new Image();
          t.onload = () => {
            previewImg.src            = url;
            previewImg.style.display  = 'block';
            previewStatus.innerHTML   = esLocal
              ? '✅ Encontrada localmente — <span style="color:#fbbf24">recordá subirla a GitHub</span>'
              : '✅ Encontrada en GitHub Pages — lista para insertar';
            previewStatus.style.color = '#34d399';
            btnInsertar.disabled      = false;
            urlVerificada             = url;
            nombreVerificado          = nombre;
          };
          t.onerror = () => {
            if (!esLocal) { probar(urlLocal + '?t=' + Date.now(), true); return; }
            previewImg.style.display  = 'none';
            previewStatus.textContent = '❌ No encontrada. Verificá el nombre y que esté en imagenes/ o GitHub.';
            previewStatus.style.color = '#fca5a5';
            btnInsertar.disabled      = true;
          };
          t.src = url;
        }
        probar(urlGH + '?t=' + Date.now(), false);
      });

      // Insertar imagen en el WYSIWYG en la posición del cursor guardada
      btnInsertar.addEventListener('click', () => {
        if (!urlVerificada || !nombreVerificado) return;
        // Siempre guardar con URL de GitHub (aunque se previsualizó en local)
        const urlFinal = GITHUB_IMAGES_BASE + nombreVerificado;
        const imgHtml  = `<img src="${urlFinal}" alt="${nombreVerificado}"
          style="max-width:100%;border-radius:8px;margin:10px 0;display:block;box-shadow:0 2px 10px rgba(0,0,0,0.18);"
          title="Clic para ampliar">`;

        // Restaurar selección y luego insertar
        restaurarSeleccion();
        document.execCommand('insertHTML', false, imgHtml);

        // Cerrar panel
        panelCont.innerHTML      = '';
        btnImg.style.background  = '';
        btnImg.style.borderColor = '';

        const esLocal = urlVerificada.startsWith('blob:') || urlVerificada.startsWith('imagenes/');
        _meqToast(
          esLocal
            ? '🖼 Imagen insertada (local). Al guardar se usará la URL de GitHub Pages.'
            : '🖼 Imagen insertada. Guardá para confirmar.',
          'success'
        );
      });
    }); // fin btnImg.addEventListener

    // ── Guardar en Firestore ──────────────────────────────────────
    document.getElementById('edit-q-save').onclick = async () => {
      const nuevaPreg      = document.getElementById('edit-q-enunciado').value.trim();
      const nuevaExpl      = serializarEditor();
      const nuevasOpciones = Array.from(overlay.querySelectorAll('.edit-opcion'))
                               .map(ta => ta.value.trim());
      const correctaRadio  = overlay.querySelector('input[name="edit-correcta"]:checked');

      if (!nuevaPreg)     { fbShowEditErr('edit-q-err', 'El enunciado no puede estar vacío.'); return; }
      if (!correctaRadio) { fbShowEditErr('edit-q-err', 'Seleccioná la opción correcta.'); return; }

      const nuevaCorrecta    = [parseInt(correctaRadio.value, 10)];
      const correctaAnterior = preg.correcta ? preg.correcta.slice() : [];
      const cambioRespuesta  = JSON.stringify(nuevaCorrecta.slice().sort()) !== JSON.stringify(correctaAnterior.slice().sort());

      const btn = document.getElementById('edit-q-save');
      btn.disabled = true; btn.textContent = 'Guardando…';

      preg.pregunta    = nuevaPreg;
      preg.opciones    = nuevasOpciones;
      preg.correcta    = nuevaCorrecta;
      preg.explicacion = nuevaExpl;

      try {
        const { doc, setDoc, serverTimestamp } = window.__fb;
        const _fbDb        = window._fbDb;
        const _currentUser = window._currentUser;

        await setDoc(doc(_fbDb, 'questions', `${seccionId}_${qIndex}`), {
          seccionId, qIndex,
          pregunta   : nuevaPreg,
          opciones   : nuevasOpciones,
          correcta   : nuevaCorrecta,
          explicacion: nuevaExpl,
          updatedAt  : serverTimestamp(),
          updatedBy  : _currentUser.uid
        }, { merge: true });

        _meqToast('✅ Pregunta guardada en Firestore', 'success');

        try { localStorage.removeItem('fb_edits_cache_' + seccionId); } catch (_) {}
        try { localStorage.removeItem('fb_q_cache_'    + seccionId); } catch (_) {}
        if (window._seccionesYaCargadas) window._seccionesYaCargadas.delete(seccionId);
        if (window.preguntasPorSeccion)  delete window.preguntasPorSeccion[seccionId];

        if (typeof window._bumpContentVersion === 'function') {
          await window._bumpContentVersion(seccionId, qIndex, cambioRespuesta ? nuevaCorrecta : null);
        }

        // Guardar la posición de scroll ANTES de desbloquear
        const scrollAntesSave = _scrollY;

        cerrarModal(); // desbloquea scroll y elimina el overlay

        if ('_scrollOnNextRender' in window) window._scrollOnNextRender = false;

        const STORAGE_KEY = window.STORAGE_KEY || 'quiz_state_v3';
        let state = {};
        try { state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (_) {}
        if (state[seccionId] && state[seccionId].explanationShown) {
          state[seccionId].explanationShown = {};
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        }

        if (typeof window.cargarSeccion === 'function')       await window.cargarSeccion(seccionId);
        if (typeof window.generarCuestionario === 'function')  window.generarCuestionario(seccionId);

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            window.scrollTo({ top: scrollAntesSave, behavior: 'instant' });
          });
        });

      } catch (e) {
        fbShowEditErr('edit-q-err', 'Error al guardar: ' + e.message);
        btn.disabled = false; btn.textContent = '💾 Guardar en Firestore';
      }
    };
  }

  // ════════════════════════════════════════════════════════════════
  // fbInjectEditButtonIfAdmin
  // ════════════════════════════════════════════════════════════════
  function fbInjectEditButtonIfAdmin(seccionId, qIndex, botonesDiv) {
    if (!_meqIsAdmin()) return;
    const btnEdit = document.createElement('button');
    btnEdit.textContent = '✏️ Editar';
    btnEdit.style.cssText = [
      'padding:6px 14px','border-radius:8px',
      'border:1.5px solid rgba(251,191,36,0.4)',
      'background:rgba(251,191,36,0.08)',
      'color:#fbbf24','font-size:13px','cursor:pointer',
      'font-weight:500','transition:background 0.15s'
    ].join(';');
    btnEdit.onmouseover = () => { btnEdit.style.background = 'rgba(251,191,36,0.18)'; };
    btnEdit.onmouseout  = () => { btnEdit.style.background = 'rgba(251,191,36,0.08)'; };
    btnEdit.addEventListener('click', () => abrirModalEdicionAdmin(seccionId, qIndex));
    botonesDiv.appendChild(btnEdit);
  }

  // ── Exponer globalmente ───────────────────────────────────────
  window.abrirModalEdicionAdmin    = abrirModalEdicionAdmin;
  window.fbInjectEditButtonIfAdmin = fbInjectEditButtonIfAdmin;

})();
