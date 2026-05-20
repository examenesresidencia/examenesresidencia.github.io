// ════════════════════════════════════════════════════════════════
// editor-admin.js  — V23
// ────────────────────────────────────────────────────────────────
// V18: se agrega _eaCanDelete() para que soloquimicayaruqui@gmail.com
//      también pueda ver el botón 🗑 y eliminar preguntas repetidas,
//      igual que admin. El botón ✏️ Editar sigue siendo solo admin.
// V20: se agrega gestión dinámica de opciones en el modal de edición.
//      Admin puede agregar opciones (botón ＋, máx. 6) y eliminar
//      opciones individuales (botón ✕, mín. 2). Los cambios se
//      guardan en Firestore y se propagan al caché local y a los
//      usuarios igual que cualquier otra edición.


(function () {
  'use strict';

  // ── Email con permiso de eliminación (sin ser admin completo) ─
  const EMAIL_PUEDE_ELIMINAR = 'soloquimicayaruqui@gmail.com';

  // ── Helpers ───────────────────────────────────────────────────
  function _eaIsAdmin()   { return typeof window.fbIsAdmin === 'function' && window.fbIsAdmin(); }
  function _eaToast(m, t) { if (typeof window.fbToast === 'function') window.fbToast(m, t); }
  function _eaAuthStyles(){ if (typeof window.fbInjectAuthStyles === 'function') window.fbInjectAuthStyles(); }

  // Puede eliminar: admin O la cuenta autorizada
  function _eaCanDelete() {
    if (_eaIsAdmin()) return true;
    const user = window._currentUser;
    return !!(user && user.email && user.email.toLowerCase() === EMAIL_PUEDE_ELIMINAR);
  }
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
        overflow-y: scroll;
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
        scroll-behavior: auto;
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

      /* ── FIX: mismos estilos para los contenedores de explicación renderizada ── */
      /* Cubre [id^="explicacion-"], .explicacion-contenido y .fb-explicacion */
      [id^="explicacion-"] ul, .explicacion-contenido ul, .fb-explicacion ul,
      .explicacion ul, [class*="explicacion"] ul {
        padding-left: 1.5em; margin: 6px 0; list-style: disc;
      }
      [id^="explicacion-"] ol, .explicacion-contenido ol, .fb-explicacion ol,
      .explicacion ol, [class*="explicacion"] ol {
        padding-left: 1.5em; margin: 6px 0; list-style: decimal;
      }
      [id^="explicacion-"] li, .explicacion-contenido li, .fb-explicacion li,
      .explicacion li, [class*="explicacion"] li {
        margin: 2px 0;
      }
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
      .meq-insert-status {
        font-size: 0.74rem;
        font-weight: 600;
        color: #34d399;
        margin-top: 6px;
        min-height: 18px;
      }
    `;
    document.head.appendChild(st);
  }

  // ════════════════════════════════════════════════════════════════
  // SISTEMA DE MULTI-SELECCIÓN CON CTRL
  // ────────────────────────────────────────────────────────────────
  // Permite acumular fragmentos de texto seleccionados manteniendo
  // Ctrl presionado. Cada fragmento se resalta con un <span>
  // temporal (data-meq-hl). Al aplicar un formato (toolbar o atajo)
  // se aplica sobre todos los fragmentos acumulados y se limpian
  // los highlights. Al soltar Ctrl se aplica el último formato usado.
  // ════════════════════════════════════════════════════════════════

  // Clase CSS para el highlight temporal
  const MEQ_HL_CLASS   = 'meq-multisel-hl';
  const MEQ_HL_ATTR    = 'data-meq-hl';
  const MEQ_HL_STYLE   = 'background:rgba(56,189,248,0.28);border-radius:2px;';

  // Inyectar estilos del highlight una sola vez
  (function () {
    if (document.getElementById('meq-multisel-styles')) return;
    const st = document.createElement('style');
    st.id = 'meq-multisel-styles';
    st.textContent = `
      [${MEQ_HL_ATTR}] {
        background: rgba(56,189,248,0.28) !important;
        border-radius: 2px;
        outline: 1.5px solid rgba(56,189,248,0.5);
        outline-offset: 0px;
      }
      .meq-multisel-badge {
        position: absolute;
        top: -8px;
        right: 6px;
        background: #0891b2;
        color: #fff;
        font-size: 0.65rem;
        font-weight: 700;
        padding: 1px 6px;
        border-radius: 10px;
        pointer-events: none;
        z-index: 10;
        letter-spacing: 0.04em;
        white-space: nowrap;
      }
    `;
    document.head.appendChild(st);
  })();

  // ── execCommand helper — siempre restaura la selección guardada ─
  // El problema general: al hacer clic en un botón de la toolbar,
  // el foco sale del editor y la selección se pierde o colapsa.
  // focus() por sí solo no la restaura — hay que volver a poner
  // el rango en el Selection explícitamente antes de execCommand.
  // Esto afecta a TODOS los comandos, no solo a listas.
  function cmd(command, value, savedRangeRef) {
    const ed = document.getElementById('meq-editor-wysiwyg');
    if (!ed) return;
    ed.focus();
    // Restaurar rango guardado si pertenece al editor
    if (savedRangeRef && savedRangeRef.current) {
      try {
        const r = savedRangeRef.current;
        if (ed.contains(r.commonAncestorContainer)) {
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(r);
        }
      } catch (_) {}
    }
    document.execCommand(command, false, value !== undefined ? value : null);
    actualizarEstadoBotones();
  }

  // cmdList es ahora un alias de cmd (misma lógica unificada)
  function cmdList(command, savedRangeRef) {
    cmd(command, undefined, savedRangeRef);
  }

  // ════════════════════════════════════════════════════════════════
  // FORMATO INLINE DIRECTO SOBRE DOM
  // ────────────────────────────────────────────────────────────────
  // Para bold/italic/underline: manipula el DOM directamente con
  // <strong>/<em>/<u>, igual que Word/Google Docs.
  // Ventaja clave: los highlights de multi-selección NO se limpian
  // entre formatos — el admin puede aplicar B, luego I, luego U
  // sobre los mismos fragmentos sin volver a seleccionarlos.
  // ════════════════════════════════════════════════════════════════

  const _FMT_TAG = { bold: 'STRONG', italic: 'EM', underline: 'U' };

  // ¿Todos los nodos de texto dentro de `node` tienen el tag `tag`?
  function _fmtIsActive(tag, node) {
    function tieneTag(n) {
      let cur = n.nodeType === 3 ? n.parentNode : n;
      while (cur && cur.getAttribute && !cur.getAttribute('contenteditable')) {
        if (cur.nodeName === tag) return true;
        cur = cur.parentNode;
      }
      return false;
    }
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);
    let t; let todos = true; let hayTexto = false;
    while ((t = walker.nextNode())) {
      if (!t.textContent.trim()) continue;
      hayTexto = true;
      if (!tieneTag(t)) { todos = false; break; }
    }
    return hayTexto && todos;
  }

  // Quitar todas las ocurrencias de `tag` dentro de `node` (unwrap)
  function _fmtUnwrapAll(node, tag) {
    Array.from(node.querySelectorAll ? node.querySelectorAll(tag) : []).forEach(el => {
      const p = el.parentNode; if (!p) return;
      while (el.firstChild) p.insertBefore(el.firstChild, el);
      p.removeChild(el);
    });
  }

  // Toggle de un formato inline sobre un Range nativo
  function _fmtToggleRange(range, tag, ed) {
    const r = range.cloneRange();
    // Inspeccionar contenido
    const tmp = document.createElement('span');
    tmp.appendChild(r.cloneContents());
    // También verificar si el ancestro común ya tiene el tag
    let anc = r.commonAncestorContainer;
    if (anc.nodeType === 3) anc = anc.parentNode;
    let ancTiene = false;
    let cur = anc;
    while (cur && !cur.getAttribute('contenteditable')) {
      if (cur.nodeName === tag) { ancTiene = true; break; }
      cur = cur.parentNode;
    }
    const activo = ancTiene || _fmtIsActive(tag, tmp);

    if (activo) {
      // Quitar: envolver en marker, quitar tags dentro, desenvolver marker
      const marker = document.createElement('span');
      marker.setAttribute('data-meq-fmt-tmp', '1');
      try { r.surroundContents(marker); }
      catch (_) { const f = r.extractContents(); marker.appendChild(f); r.insertNode(marker); }
      _fmtUnwrapAll(marker, tag);
      const p = marker.parentNode;
      if (p) { while (marker.firstChild) p.insertBefore(marker.firstChild, marker); p.removeChild(marker); }
    } else {
      // Aplicar: envolver en tag
      const wrapper = document.createElement(tag);
      try { r.surroundContents(wrapper); }
      catch (_) { const f = r.extractContents(); wrapper.appendChild(f); r.insertNode(wrapper); }
    }
    ed.normalize();
  }

  // ── Aplicar formato sobre todos los spans de highlight ──────────
  // Para comandos inline (bold/italic/underline): usa DOM directo y
  // NO limpia los highlights, para poder acumular múltiples formatos.
  // Para comandos de bloque (justify): usa execCommand y sí limpia.
  function _meqAplicarFormato(command, value, ed) {
    const spans = ed.querySelectorAll(`[${MEQ_HL_ATTR}]`);
    if (!spans.length) return false;

    const INLINE_DOM  = ['bold', 'italic', 'underline'];
    const INLINE_EXEC = ['subscript', 'superscript', 'strikeThrough'];
    const BLOCK_CMDS  = ['justifyLeft','justifyCenter','justifyRight','justifyFull',
                         'insertUnorderedList','insertOrderedList'];

    if (INLINE_DOM.includes(command)) {
      // DOM directo — los highlights persisten para seguir acumulando formatos
      spans.forEach(span => {
        const r = document.createRange();
        r.selectNodeContents(span);
        _fmtToggleRange(r, _FMT_TAG[command], ed);
      });
      // NO limpiar highlights aquí — el admin puede seguir aplicando más formatos
      actualizarEstadoBotones();
      return true;
    }

    if (INLINE_EXEC.includes(command)) {
      spans.forEach(span => {
        const range = document.createRange();
        range.selectNodeContents(span);
        const sel = window.getSelection();
        sel.removeAllRanges(); sel.addRange(range); ed.focus();
        document.execCommand(command, false, value !== undefined ? value : null);
      });
      _meqLimpiarHighlights(ed);
      actualizarEstadoBotones();
      return true;
    }

    if (BLOCK_CMDS.includes(command)) {
      spans.forEach(span => {
        const range = document.createRange();
        range.setStart(span, 0); range.collapse(true);
        const sel = window.getSelection();
        sel.removeAllRanges(); sel.addRange(range); ed.focus();
        document.execCommand(command, false, null);
      });
      _meqLimpiarHighlights(ed);
      actualizarEstadoBotones();
      return true;
    }

    return false;
  }

  // ── Limpiar todos los spans de highlight (desenvuelve el span) ─
  function _meqLimpiarHighlights(ed) {
    if (!ed) ed = document.getElementById('meq-editor-wysiwyg');
    if (!ed) return;
    ed.querySelectorAll(`[${MEQ_HL_ATTR}]`).forEach(span => {
      // Reemplazar el span por sus hijos (unwrap)
      const parent = span.parentNode;
      if (!parent) return;
      while (span.firstChild) parent.insertBefore(span.firstChild, span);
      parent.removeChild(span);
    });
    // Actualizar badge
    _meqActualizarBadge(ed, 0);
  }

  // ── Mostrar/ocultar badge de cuenta de fragmentos ──────────────
  function _meqActualizarBadge(ed, count) {
    const toolbar = ed ? ed.previousElementSibling : null;
    if (!toolbar) return;
    let badge = toolbar.querySelector('.meq-multisel-badge');
    if (count > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'meq-multisel-badge';
        toolbar.style.position = 'relative';
        toolbar.appendChild(badge);
      }
      badge.textContent = `${count} fragmento${count > 1 ? 's' : ''} seleccionado${count > 1 ? 's' : ''}`;
    } else {
      if (badge) badge.remove();
    }
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
    if (!_eaIsAdmin()) return;

    const preguntasPorSeccion = window.preguntasPorSeccion || {};
    const preg = (preguntasPorSeccion[seccionId] || [])[qIndex];
    if (!preg) return;

    _eaAuthStyles();
    inyectarEstilos();

    document.getElementById('fb-modal-edit-q')?.remove();

    const GITHUB_IMAGES_BASE = window.GITHUB_IMAGES_BASE ||
      'https://examenesresidencia.github.io/imagenes/';

    // Bloquear scroll de fondo
    bloquearScrollFondo();

    // ── Renderizador dinámico de opciones ────────────────────────
    // Se llama cada vez que se agrega o elimina una opción.
    // Mantiene el radio marcado en el índice correcto tras reordenar.
    function renderizarOpciones(opciones, correctaIdx) {
      const cont = document.getElementById('edit-opciones-cont');
      if (!cont) return;
      cont.innerHTML = '';
      opciones.forEach((op, i) => {
        const fila = document.createElement('div');
        fila.style.cssText = 'display:flex;gap:8px;align-items:flex-start;margin-bottom:6px;';
        fila.dataset.opIdx = i;

        // Radio
        const radio = document.createElement('input');
        radio.type  = 'radio';
        radio.name  = 'edit-correcta';
        radio.value = i;
        radio.checked = (i === correctaIdx);
        radio.style.cssText = 'accent-color:#0891b2;width:16px;height:16px;flex-shrink:0;margin-top:9px;';

        // Textarea
        const ta = document.createElement('textarea');
        ta.className = 'fb-input edit-opcion';
        ta.dataset.idx = i;
        ta.rows = 1;
        ta.style.cssText = 'flex:1;resize:vertical;font-size:0.85rem;padding:6px 10px;';
        ta.value = op;

        // Botón eliminar opción (solo si hay más de 2)
        const btnDel = document.createElement('button');
        btnDel.type  = 'button';
        btnDel.title = 'Eliminar esta opción';
        btnDel.textContent = '✕';
        btnDel.style.cssText = [
          'flex-shrink:0','margin-top:5px',
          'width:26px','height:26px',
          'border-radius:6px',
          'border:1.5px solid rgba(239,68,68,0.35)',
          'background:rgba(239,68,68,0.07)',
          'color:#f87171','font-size:0.8rem',
          'cursor:pointer','transition:background 0.15s',
          'display:flex','align-items:center','justify-content:center'
        ].join(';');
        btnDel.onmouseover = () => { btnDel.style.background = 'rgba(239,68,68,0.22)'; btnDel.style.borderColor = 'rgba(239,68,68,0.65)'; };
        btnDel.onmouseout  = () => { btnDel.style.background = 'rgba(239,68,68,0.07)'; btnDel.style.borderColor = 'rgba(239,68,68,0.35)'; };
        btnDel.addEventListener('click', () => {
          if (_opcionesActuales.length <= 2) {
            _eaToast('⚠️ La pregunta debe tener al menos 2 opciones.', 'error');
            return;
          }
          // Guardar textos actuales antes de eliminar
          _sincronizarOpciones();
          const correctaActual = _getCorrectaActual();
          _opcionesActuales.splice(i, 1);
          // Ajustar índice correcta si es necesario
          let nuevaCorrecta = correctaActual;
          if (correctaActual === i)         nuevaCorrecta = 0;
          else if (correctaActual > i)      nuevaCorrecta = correctaActual - 1;
          renderizarOpciones(_opcionesActuales, nuevaCorrecta);
        });

        // Solo mostrar botón eliminar si hay más de 2 opciones
        fila.appendChild(radio);
        fila.appendChild(ta);
        if (opciones.length > 2) fila.appendChild(btnDel);
        cont.appendChild(fila);
      });

      // Botón "Agregar opción" al final
      const btnAgregar = document.createElement('button');
      btnAgregar.type  = 'button';
      btnAgregar.textContent = '＋ Agregar opción';
      btnAgregar.style.cssText = [
        'margin-top:4px','padding:5px 14px',
        'border-radius:7px',
        'border:1.5px dashed rgba(56,189,248,0.4)',
        'background:rgba(56,189,248,0.06)',
        'color:#38bdf8','font-size:0.82rem',
        'font-weight:600','cursor:pointer',
        'transition:background 0.15s,border-color 0.15s',
        'width:100%'
      ].join(';');
      btnAgregar.onmouseover = () => { btnAgregar.style.background = 'rgba(56,189,248,0.14)'; btnAgregar.style.borderColor = 'rgba(56,189,248,0.7)'; };
      btnAgregar.onmouseout  = () => { btnAgregar.style.background = 'rgba(56,189,248,0.06)'; btnAgregar.style.borderColor = 'rgba(56,189,248,0.4)'; };
      btnAgregar.addEventListener('click', () => {
        if (_opcionesActuales.length >= 6) {
          _eaToast('⚠️ Máximo 6 opciones por pregunta.', 'error');
          return;
        }
        _sincronizarOpciones();
        const correctaActual = _getCorrectaActual();
        _opcionesActuales.push('');
        renderizarOpciones(_opcionesActuales, correctaActual);
        // Foco en la nueva textarea
        const nuevaTa = cont.querySelectorAll('.edit-opcion');
        if (nuevaTa.length) nuevaTa[nuevaTa.length - 1].focus();
      });
      cont.appendChild(btnAgregar);
    }

    // Estado mutable de opciones (se actualiza al agregar/eliminar)
    let _opcionesActuales = preg.opciones ? preg.opciones.slice() : ['', ''];

    // Leer los valores actuales del DOM hacia _opcionesActuales
    function _sincronizarOpciones() {
      const cont = document.getElementById('edit-opciones-cont');
      if (!cont) return;
      cont.querySelectorAll('.edit-opcion').forEach((ta, i) => {
        _opcionesActuales[i] = ta.value;
      });
    }

    // Obtener el índice de la opción correcta seleccionada en el DOM
    function _getCorrectaActual() {
      const cont = document.getElementById('edit-opciones-cont');
      if (!cont) return 0;
      const radio = cont.querySelector('input[name="edit-correcta"]:checked');
      return radio ? parseInt(radio.value, 10) : 0;
    }

    const correctaInicial = Array.isArray(preg.correcta) && preg.correcta.length > 0
      ? preg.correcta[0] : 0;

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
          <div id="edit-opciones-cont"></div>
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

              <div class="meq-sep"></div>

              <!-- Botón vacunas -->
              <button class="meq-btn-fmt" id="meq-btn-vacunas" type="button"
                title="Insertar botón 'VER MÁS SOBRE VACUNAS' en la explicación"
                style="background:rgba(56,189,248,0.08);border-color:rgba(56,189,248,0.3);color:#38bdf8;padding:0 8px;">
                💉
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
    // Renderizar opciones dinámicas (soporta agregar/eliminar)
    renderizarOpciones(_opcionesActuales, correctaInicial);
    cargarEnEditor(preg.explicacion || '');

    // ── Cerrar modal ──────────────────────────────────────────────
    function cerrarModal() {
      desbloquearScrollFondo();
      overlay.remove();
    }
    document.getElementById('edit-q-close').onclick  = cerrarModal;
    document.getElementById('edit-q-cancel').onclick = cerrarModal;
    // No cerrar al hacer clic fuera del modal — evita pérdida accidental de edición

    // ── Ref al editor ─────────────────────────────────────────────
    const editor = overlay.querySelector('#meq-editor-wysiwyg');

    // Scroll suave con rueda del ratón — evita el salto por bloques
    // que ocurre en contenteditable con overflow-y nativo.
    editor.addEventListener('wheel', function(e) {
      e.preventDefault();
      editor.scrollBy({ top: e.deltaY * 0.8, behavior: 'smooth' });
    }, { passive: false });

    // ── Estado de multi-selección (local a este modal) ────────────
    let _multiFragmentos  = [];   // array de { range, span } acumulados con Ctrl
    let _ctrlPresionado   = false;
    let _ultimoComando    = null; // último comando aplicado (para "soltar Ctrl → aplicar")

    // Actualizar estado de botones al mover cursor o cambiar selección
    editor.addEventListener('keyup',   actualizarEstadoBotones);
    editor.addEventListener('mouseup', actualizarEstadoBotones);

    // ── Detectar Ctrl presionado / suelto ─────────────────────────
    // keydown global para detectar Ctrl incluso si el foco está en toolbar
    function _onKeydownCtrl(e) {
      if (e.key === 'Control' || e.key === 'Meta') _ctrlPresionado = true;
    }
    function _onKeyupCtrl(e) {
      if (e.key !== 'Control' && e.key !== 'Meta') return;
      _ctrlPresionado = false;
      // Al soltar Ctrl los highlights SE MANTIENEN siempre.
      // El usuario puede seguir aplicando formatos (B, I, U) con los botones
      // de la toolbar o volviendo a presionar Ctrl+B/I/U.
      // Los highlights solo se limpian al hacer clic sin selección (mousedown sin Ctrl)
      // o al presionar Escape.
    }
    document.addEventListener('keydown', _onKeydownCtrl);
    document.addEventListener('keyup',   _onKeyupCtrl);

    // ── Acumular fragmento al hacer mouseup con Ctrl ───────────────
    editor.addEventListener('mouseup', function(e) {
      const sel = window.getSelection();

      if (!_ctrlPresionado) {
        // Sin Ctrl y sin selección real (simple click): limpiar highlights SIEMPRE
        if (!sel || sel.isCollapsed) {
          _meqLimpiarHighlights(editor);
          _multiFragmentos = [];
          _ultimoComando   = null;
          return;
        }
        // Sin Ctrl pero CON selección: guardar el rango para que los botones
        // B/I/U puedan aplicar el formato directamente sin necesitar Ctrl.
        // El texto queda visualmente seleccionado; no se crea highlight.
        if (sel.rangeCount > 0) {
          const r = sel.getRangeAt(0);
          if (editor.contains(r.commonAncestorContainer)) {
            _savedRange = r.cloneRange();
            savedRangeRef.current = _savedRange;
          }
        }
        return;
      }

      if (!sel || sel.isCollapsed) return; // con Ctrl pero sin selección real

      // Con Ctrl: capturar el rango actual y envolverlo en un span de highlight
      if (sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0).cloneRange();
      if (!editor.contains(range.commonAncestorContainer)) return;
      if (range.collapsed) return;

      // Crear span highlight
      const span = document.createElement('span');
      span.setAttribute(MEQ_HL_ATTR, '1');

      try {
        // surroundContents falla si el rango cruza nodos de bloque distintos;
        // en ese caso usamos extractContents + insertNode
        range.surroundContents(span);
      } catch (_) {
        try {
          const frag = range.extractContents();
          span.appendChild(frag);
          range.insertNode(span);
        } catch (_2) { return; } // rango inválido, ignorar
      }

      _multiFragmentos.push({ span });
      _meqActualizarBadge(editor, _multiFragmentos.length);

      // Colapsar selección visible para no confundir al usuario
      sel.removeAllRanges();
    });

    // ── Atajos de teclado ─────────────────────────────────────────
    editor.addEventListener('keydown', e => {
      // Escape: limpiar highlights acumulados
      if (e.key === 'Escape' && _multiFragmentos.length > 0) {
        _meqLimpiarHighlights(editor);
        _multiFragmentos = [];
        _ultimoComando   = null;
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        let command = null;
        switch (e.key.toLowerCase()) {
          case 'b': command = 'bold';      break;
          case 'i': command = 'italic';    break;
          case 'u': command = 'underline'; break;
        }
        if (!command) return;
        e.preventDefault();

        // Capturar el rango AHORA (keydown) antes de que cualquier cosa lo colapse.
        // guardarSeleccion() se dispara en keyup, o sea DESPUÉS — demasiado tarde.
        const selAhora = window.getSelection();
        if (selAhora && selAhora.rangeCount > 0) {
          const rAhora = selAhora.getRangeAt(0);
          if (editor.contains(rAhora.commonAncestorContainer)) {
            _savedRange = rAhora.cloneRange();
            savedRangeRef.current = _savedRange;
          }
        }

        _ultimoComando = command;

        if (_multiFragmentos.length > 0) {
          // Con highlights: aplicar DOM directo, NO limpiar highlights
          _meqAplicarFormato(command, undefined, editor);
          // No resetear _multiFragmentos — el admin sigue acumulando formatos
        } else {
          // Sin highlights: aplicar sobre la selección nativa actual
          _fmtInlineNativo(command, editor, savedRangeRef);
        }
      }
    });

    // ── Aplicar formato inline sobre la selección nativa del editor ─
    // Usado cuando NO hay multi-selección activa.
    function _fmtInlineNativo(command, ed, rangeRef) {
      const INLINE_DOM = ['bold', 'italic', 'underline'];
      if (!INLINE_DOM.includes(command)) {
        cmd(command, undefined, rangeRef);
        return;
      }
      // Asegurar foco en el editor
      ed.focus();
      // Restaurar selección guardada (crítico cuando se viene de un clic en toolbar)
      let rangeToUse = null;
      if (rangeRef && rangeRef.current) {
        try {
          const r = rangeRef.current;
          if (ed.contains(r.commonAncestorContainer)) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(r);
            rangeToUse = r;
          }
        } catch (_) {}
      }
      const sel = window.getSelection();
      if (!rangeToUse) {
        if (!sel || sel.isCollapsed) { cmd(command, undefined, rangeRef); return; }
        rangeToUse = sel.getRangeAt(0);
      }
      if (!ed.contains(rangeToUse.commonAncestorContainer)) { cmd(command, undefined, rangeRef); return; }

      // Aplicar el formato — _fmtToggleRange muta el DOM, así que el rango
      // clonado ANTES quedaría apuntando a nodos obsoletos. Guardamos el
      // ancestro común para poder reseleccionar el nodo wrapper resultante.
      const ancAntes = rangeToUse.commonAncestorContainer;
      _fmtToggleRange(rangeToUse, _FMT_TAG[command], ed);

      // Restaurar la selección visual tras el formato:
      // buscar el nodo wrapper que _fmtToggleRange insertó (o el ancestro si se quitó)
      // para que el texto quede visualmente marcado y se puedan aplicar más formatos.
      try {
        // Encontrar el nodo más cercano que contiene el texto formateado
        let nodoResultante = ancAntes;
        if (nodoResultante.nodeType === 3) nodoResultante = nodoResultante.parentNode;
        // Si el nodo es el editor mismo, buscar un hijo más específico
        if (nodoResultante === ed) {
          const sel2 = window.getSelection();
          if (sel2 && sel2.rangeCount > 0) {
            nodoResultante = sel2.getRangeAt(0).commonAncestorContainer;
            if (nodoResultante.nodeType === 3) nodoResultante = nodoResultante.parentNode;
          }
        }
        const rangePost = document.createRange();
        rangePost.selectNodeContents(nodoResultante);
        const selAfter = window.getSelection();
        selAfter.removeAllRanges();
        selAfter.addRange(rangePost);
        // Actualizar savedRange para la siguiente operación
        _savedRange = rangePost.cloneRange();
        if (rangeRef) rangeRef.current = _savedRange;
      } catch (_) {}

      actualizarEstadoBotones();
    }

    // ── Helper interno: aplicar formato respetando multi-selección ─
    function _cmdConMulti(command, value) {
      _ultimoComando = command;
      const INLINE_DOM = ['bold', 'italic', 'underline'];
      if (_multiFragmentos.length > 0) {
        _meqAplicarFormato(command, value, editor);
        // Para inline DOM: mantener highlights vivos para acumular más formatos
        if (!INLINE_DOM.includes(command)) {
          _multiFragmentos = [];
          _ultimoComando   = null;
        }
      } else {
        if (INLINE_DOM.includes(command)) {
          _fmtInlineNativo(command, editor, savedRangeRef);
        } else {
          cmd(command, value, savedRangeRef);
        }
      }
    }
    function _cmdListConMulti(command) {
      _ultimoComando = command;
      if (_multiFragmentos.length > 0) {
        _meqAplicarFormato(command, undefined, editor);
        _multiFragmentos = [];
        _ultimoComando   = null;
      } else {
        cmd(command, undefined, savedRangeRef);
      }
    }

    // ── Limpiar listeners globales al cerrar el modal ─────────────
    const _cerrarModalOriginal = cerrarModal;
    cerrarModal = function() {
      document.removeEventListener('keydown', _onKeydownCtrl);
      document.removeEventListener('keyup',   _onKeyupCtrl);
      document.removeEventListener('selectionchange', guardarSeleccion);
      _meqLimpiarHighlights(editor);
      _cerrarModalOriginal();
    };

    // ── Botones de la toolbar ─────────────────────────────────────
    // CRÍTICO: preventDefault en mousedown evita que el botón robe el foco
    // del editor y colapse la selección antes de que se ejecute el onclick.
    // Esto es lo que mantiene el texto seleccionado al hacer clic en B/I/U.
    const _fmtBtns = [
      { id: '#meq-btn-bold',      fn: () => _cmdConMulti('bold') },
      { id: '#meq-btn-italic',    fn: () => _cmdConMulti('italic') },
      { id: '#meq-btn-underline', fn: () => _cmdConMulti('underline') },
      { id: '#meq-btn-sub',       fn: () => _cmdConMulti('subscript') },
      { id: '#meq-btn-sup',       fn: () => _cmdConMulti('superscript') },
      { id: '#meq-btn-left',      fn: () => _cmdConMulti('justifyLeft') },
      { id: '#meq-btn-center',    fn: () => _cmdConMulti('justifyCenter') },
      { id: '#meq-btn-right',     fn: () => _cmdConMulti('justifyRight') },
      { id: '#meq-btn-justify',   fn: () => _cmdConMulti('justifyFull') },
      { id: '#meq-btn-ul',        fn: () => _cmdListConMulti('insertUnorderedList') },
      { id: '#meq-btn-ol',        fn: () => _cmdListConMulti('insertOrderedList') },
    ];
    _fmtBtns.forEach(({ id, fn }) => {
      const btn = overlay.querySelector(id);
      if (!btn) return;
      // Evitar pérdida de foco/selección al hacer clic en la toolbar
      btn.addEventListener('mousedown', e => e.preventDefault());
      btn.addEventListener('click', fn);
    });

    // ── Botón 💉 Vacunas ──────────────────────────────────────────
    overlay.querySelector('#meq-btn-vacunas').addEventListener('mousedown', e => e.preventDefault());
    overlay.querySelector('#meq-btn-vacunas').addEventListener('click', function(e) {
      e.preventDefault();
      // Enfocar editor y restaurar selección si la hay
      editor.focus();
      const sel = window.getSelection();
      if (_savedRange) {
        sel.removeAllRanges();
        sel.addRange(_savedRange);
      }
      // Insertar marcador HTML del botón de vacunas al final de la explicación
      const marcador = `<br><a href="#vacunas2026" data-vacunas-btn="1" style="display:inline-flex;align-items:center;gap:7px;margin-top:14px;padding:9px 18px;border-radius:10px;border:1.5px solid #0891b2;background:rgba(56,189,248,0.08);color:#0891b2;font-size:0.85rem;font-weight:600;text-decoration:none;cursor:pointer;">💉 VER MÁS SOBRE VACUNAS</a>`;
      document.execCommand('insertHTML', false, marcador);
      _eaToast('💉 Botón "VER MÁS SOBRE VACUNAS" insertado', 'success');
    });

    // ── Panel de imagen ───────────────────────────────────────────
    const btnImg    = overlay.querySelector('#meq-btn-img');
    const panelCont = overlay.querySelector('#meq-img-panel-container');

    // Guardamos la selección (rango) para insertar la imagen en el lugar correcto
    let _savedRange = null;
    // Objeto ref mutable para que cmdList (scope externo) acceda al rango actual
    const savedRangeRef = { current: null };
    function guardarSeleccion() {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const r = sel.getRangeAt(0);
        if (editor.contains(r.commonAncestorContainer)) {
          _savedRange = r.cloneRange();
          savedRangeRef.current = _savedRange;
        }
      }
    }
    function restaurarSeleccion() {
      editor.focus();
      const sel = window.getSelection();
      sel.removeAllRanges();
      if (_savedRange) {
        sel.addRange(_savedRange);
      } else {
        const r = document.createRange();
        r.selectNodeContents(editor);
        r.collapse(false);
        sel.addRange(r);
        _savedRange = r.cloneRange();
      }
    }
    editor.addEventListener('mouseup', guardarSeleccion);
    editor.addEventListener('keyup',   guardarSeleccion);
    // También guardar en selectionchange para capturar selecciones que no terminan con mouseup/keyup
    document.addEventListener('selectionchange', function() {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const r = sel.getRangeAt(0);
      if (editor.contains(r.commonAncestorContainer)) {
        _savedRange = r.cloneRange();
        savedRangeRef.current = _savedRange;
      }
    });

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
          <input type="file" id="meq-file-input" accept="image/*" style="display:none;" autocomplete="off"/>
        </div>
        <div class="meq-insert-status" id="meq-insert-status"></div>`;
      panelCont.appendChild(panel);

      const fileInput     = panel.querySelector('#meq-file-input');
      const fileRow       = panel.querySelector('#meq-file-row');
      const nombreDisplay = panel.querySelector('#meq-nombre-display');
      const insertStatus  = panel.querySelector('#meq-insert-status');

      fileRow.addEventListener('click', () => fileInput.click());

      // Al seleccionar archivo: insertar directamente al final del editor
      fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (!file) return;

        nombreDisplay.textContent = file.name;
        nombreDisplay.style.color = '#e2e8f0';

        const nombreVerificado = file.name;
        const urlFinal         = GITHUB_IMAGES_BASE + nombreVerificado;
        const imgHtml          = `<br><img src="${urlFinal}" alt="${nombreVerificado}"
          style="max-width:100%;border-radius:8px;margin:10px 0;display:block;box-shadow:0 2px 10px rgba(0,0,0,0.18);"
          title="Clic para ampliar">`;

        // Mover el cursor al final del editor e insertar
        editor.focus();
        const sel = window.getSelection();
        const r   = document.createRange();
        r.selectNodeContents(editor);
        r.collapse(false);
        sel.removeAllRanges();
        sel.addRange(r);
        document.execCommand('insertHTML', false, imgHtml);

        insertStatus.innerHTML = `✅ <strong style="color:#e2e8f0">${nombreVerificado}</strong> insertada — <span style="color:#fbbf24">recordá subirla a imagenes/ en GitHub</span>`;

        // Cerrar panel tras un breve instante para que el usuario vea el feedback
        setTimeout(() => {
          panelCont.innerHTML      = '';
          btnImg.style.background  = '';
          btnImg.style.borderColor = '';
        }, 1400);

        _eaToast('🖼 Imagen insertada. Al guardar se usará la URL de GitHub Pages.', 'success');
      });
    }); // fin btnImg.addEventListener

    // ── Guardar en Firestore ──────────────────────────────────────
    document.getElementById('edit-q-save').onclick = async () => {
      const nuevaPreg      = document.getElementById('edit-q-enunciado').value.trim();
      const nuevaExpl      = serializarEditor();
      // Sincronizar valores del DOM hacia _opcionesActuales antes de leer
      _sincronizarOpciones();
      const nuevasOpciones = _opcionesActuales.map(o => o.trim());
      const correctaRadio  = document.getElementById('edit-opciones-cont')
                               ?.querySelector('input[name="edit-correcta"]:checked');

      if (!nuevaPreg)     { fbShowEditErr('edit-q-err', 'El enunciado no puede estar vacío.'); return; }
      if (nuevasOpciones.some(o => !o)) { fbShowEditErr('edit-q-err', 'Todas las opciones deben tener texto.'); return; }
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

        await setDoc(doc(_fbDb, 'questions', `${seccionId}_${qIndex + 1}`), {
          seccionId, qIndex: qIndex + 1,
          pregunta   : nuevaPreg,
          opciones   : nuevasOpciones,
          correcta   : nuevaCorrecta,
          explicacion: nuevaExpl,
          updatedAt  : serverTimestamp(),
          updatedBy  : _currentUser.uid
        }, { merge: true });

        _eaToast('✅ Pregunta guardada en Firestore', 'success');

        // ── Parche quirúrgico en caché IDB: actualizar SOLO esa pregunta ─────
        // 0 lecturas de Firestore. Actualiza IndexedDB directamente.
        const _ck = 'fb_q_cache_' + seccionId;
        try {
          const _cached = await window._idbCache.get(_ck);
          if (_cached?.preguntas?.[qIndex]) {
            _cached.preguntas[qIndex].pregunta    = nuevaPreg;
            _cached.preguntas[qIndex].opciones    = nuevasOpciones;
            _cached.preguntas[qIndex].correcta    = nuevaCorrecta;
            _cached.preguntas[qIndex].explicacion = nuevaExpl;
            _cached.ts = Date.now(); // renovar vigencia 24hs
            await window._idbCache.set(_ck, _cached);
            console.log('[EDITOR] Caché IDB parcheado → sección:', seccionId, '| qIndex:', qIndex);
          }
        } catch (_idbErr) {
          // Si IDB falla, invalidar el caché para forzar recarga desde Firestore
          try { await window._idbCache.remove(_ck); } catch (_) {}
          console.warn('[EDITOR] No se pudo parchar IDB, caché invalidado:', _idbErr.message);
        }

        // También parchear la memoria (preguntasPorSeccion) en tiempo real
        if (window.preguntasPorSeccion?.[seccionId]?.[qIndex]) {
          window.preguntasPorSeccion[seccionId][qIndex].pregunta    = nuevaPreg;
          window.preguntasPorSeccion[seccionId][qIndex].opciones    = nuevasOpciones;
          window.preguntasPorSeccion[seccionId][qIndex].correcta    = nuevaCorrecta;
          window.preguntasPorSeccion[seccionId][qIndex].explicacion = nuevaExpl;
        }

        try { localStorage.removeItem('fb_edits_cache_' + seccionId); } catch (_) {}

        // ── Actualización quirúrgica del DOM: solo esa pregunta ──────────────
        // En vez de re-renderizar toda la página (cargarSeccion + generarCuestionario),
        // actualizamos directamente los elementos del DOM de esa pregunta.
        // 0 lecturas de Firestore, sin re-shuffle, sin perder el scroll.
        const _pregEl = document.getElementById(`puntaje-${seccionId}-${qIndex}`)?.closest('.pregunta');
        if (_pregEl) {
          // Actualizar enunciado
          const _enunciadoEl = _pregEl.querySelector('.pregunta-texto, .enunciado, p.pregunta, .pregunta-enunciado');
          if (_enunciadoEl) _enunciadoEl.innerHTML = nuevaPreg;

          // Actualizar opciones
          const _opcionesEls = _pregEl.querySelectorAll('.opcion-label, label.opcion, .opcion-texto');
          if (_opcionesEls.length === nuevasOpciones.length) {
            _opcionesEls.forEach((el, i) => { el.textContent = nuevasOpciones[i]; });
          }

          // Actualizar explicación si está visible
          const _explEl = document.getElementById(`explicacion-${seccionId}-${qIndex}`);
          if (_explEl && _explEl.style.display !== 'none') {
            _explEl.innerHTML = nuevaExpl || '';
          }

          console.log('[EDITOR] DOM actualizado quirúrgicamente para qIndex:', qIndex);

          // Notificar al paginador para que actualice stats (si cambió la correcta)
          if (cambioRespuesta && typeof window._pag2UpdateStats === 'function') {
            window._pag2UpdateStats(seccionId);
          }
        } else {
          // La pregunta no está en el DOM visible (otra página del paginador)
          // Solo re-renderizar si es necesario (sin re-shuffle)
          const STORAGE_KEY = window.STORAGE_KEY || 'quiz_state_v3';
          let state = {};
          try { state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (_) {}
          if (state[seccionId]) {
            const contDOM = document.getElementById(`cuestionario-${seccionId}`);
            const sState  = state[seccionId];
            if (contDOM) {
              const puntajeEls = contDOM.querySelectorAll('[id^="puntaje-' + seccionId + '-"]');
              const ordenDOM = [];
              puntajeEls.forEach(el => {
                const idx = parseInt(el.id.replace(`puntaje-${seccionId}-`, ''), 10);
                if (!isNaN(idx) && (!sState.graded || !sState.graded[idx])) ordenDOM.push(idx);
              });
              if (ordenDOM.length > 0) {
                sState.unansweredOrder = ordenDOM;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
              }
            }
          }
          if (typeof window.generarCuestionario === 'function') window.generarCuestionario(seccionId);
        }

        // ── Notificación en tiempo real a otros usuarios ─────────────────────
        // Los datos viajan embebidos en el snapshot de meta/contentVersion →
        // el cliente los aplica directamente al DOM (0 lecturas extra a Firestore).
        if (typeof window._bumpContentVersion === 'function') {
          window._bumpContentVersion(seccionId, qIndex, cambioRespuesta ? nuevaCorrecta : null, {
            esEdicionPuntual: true,
            preguntaData: {
              pregunta   : nuevaPreg,
              opciones   : nuevasOpciones,
              correcta   : nuevaCorrecta,
              explicacion: nuevaExpl,
            }
          });
        }

        cerrarModal();
      } catch (e) {
        fbShowEditErr('edit-q-err', 'Error al guardar: ' + e.message);
        btn.disabled = false; btn.textContent = '💾 Guardar en Firestore';
      }
    };
  }

  // fbInjectEditButtonIfAdmin
  // ════════════════════════════════════════════════════════════════
  // Botón ✏️ Editar    → solo admin
  // Botón 🗑 Eliminar → admin + soloquimicayaruqui@gmail.com
  // ════════════════════════════════════════════════════════════════
  function fbInjectEditButtonIfAdmin(seccionId, qIndex, botonesDiv) {
    const puedeEliminar = _eaCanDelete();
    const esAdmin       = _eaIsAdmin();

    // Si no tiene ninguno de los dos permisos, no inyectar nada
    if (!esAdmin && !puedeEliminar) return;

    // ── Botón Editar (solo admin) ─────────────────────────────────
    if (esAdmin) {
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

    // ── Botón Eliminar (admin + cuenta autorizada) ────────────────
    if (puedeEliminar) {
      const btnDel = document.createElement('button');
      btnDel.textContent = '🗑';
      btnDel.title = 'Eliminar pregunta';
      btnDel.style.cssText = [
        'padding:6px 10px','border-radius:8px',
        'border:1.5px solid rgba(239,68,68,0.35)',
        'background:rgba(239,68,68,0.07)',
        'color:#f87171','font-size:15px','cursor:pointer',
        'font-weight:500','transition:background 0.15s,border-color 0.15s',
        'line-height:1'
      ].join(';');
      btnDel.onmouseover = () => {
        btnDel.style.background  = 'rgba(239,68,68,0.18)';
        btnDel.style.borderColor = 'rgba(239,68,68,0.65)';
      };
      btnDel.onmouseout = () => {
        btnDel.style.background  = 'rgba(239,68,68,0.07)';
        btnDel.style.borderColor = 'rgba(239,68,68,0.35)';
      };
      btnDel.addEventListener('click', () => eliminarPreguntaAdmin(seccionId, qIndex));
      botonesDiv.appendChild(btnDel);
    }
  }

  // ════════════════════════════════════════════════════════════════
  // eliminarPreguntaAdmin
  // Muestra confirmación, elimina de Firestore y parchea el caché
  // local quirúrgicamente (sin releer la sección completa).
  // ════════════════════════════════════════════════════════════════
  async function eliminarPreguntaAdmin(seccionId, qIndex) {
    if (!_eaCanDelete()) return;

    const preguntasPorSeccion = window.preguntasPorSeccion || {};
    const preg = (preguntasPorSeccion[seccionId] || [])[qIndex];
    const enunciado = preg ? preg.pregunta : `#${qIndex + 1}`;

    // ── Modal de confirmación ─────────────────────────────────────
    _eaAuthStyles();

    // Evitar doble apertura
    if (document.getElementById('fb-modal-delete-q')) return;

    // Bloquear scroll de fondo
    bloquearScrollFondo();

    const dlg = document.createElement('div');
    dlg.id = 'fb-modal-delete-q';
    dlg.style.cssText = [
      'position:fixed','inset:0','z-index:99999',
      'background:rgba(10,22,40,0.92)','backdrop-filter:blur(10px)',
      '-webkit-backdrop-filter:blur(10px)',
      'display:flex','align-items:center','justify-content:center',
      'padding:20px 16px','box-sizing:border-box',
      'font-family:Segoe UI,system-ui,sans-serif'
    ].join(';');

    dlg.innerHTML = `
      <div class="fb-card" style="max-width:500px;width:100%;box-sizing:border-box;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          <span style="font-size:2rem;line-height:1;">🗑</span>
          <div>
            <h3 style="color:#f87171;margin:0 0 4px;font-size:1.05rem;">Eliminar pregunta</h3>
            <p style="color:#94a3b8;margin:0;font-size:0.8rem;">Sección: <strong style="color:#e2e8f0;">${seccionId}</strong> · Índice: <strong style="color:#e2e8f0;">${qIndex}</strong></p>
          </div>
        </div>

        <div style="background:rgba(239,68,68,0.07);border:1.5px solid rgba(239,68,68,0.25);border-radius:10px;padding:12px 14px;margin-bottom:18px;">
          <p style="color:#fca5a5;margin:0 0 8px;font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">⚠️ Esta acción es irreversible</p>
          <p style="color:#e2e8f0;margin:0;font-size:0.86rem;line-height:1.6;word-break:break-word;">
            ${enunciado.length > 180 ? enunciado.slice(0, 180) + '…' : enunciado}
          </p>
        </div>

        <p style="color:#94a3b8;font-size:0.82rem;margin:0 0 18px;line-height:1.5;">
          Se eliminará el documento <code style="color:#38bdf8;background:rgba(56,189,248,0.08);padding:1px 5px;border-radius:4px;">${seccionId}_${qIndex + 1}</code> de Firestore
          y se actualizará el caché local sin necesidad de recargar la sección.
        </p>

        <p style="color:#64748b;font-size:0.78rem;margin:0 0 18px;">
          ℹ️ Los índices de las preguntas siguientes no se renumeran en Firestore (solo en memoria y caché).
          Si necesitás compactar los índices, hacélo desde la consola de Firebase.
        </p>

        <div id="fb-del-err" style="color:#f87171;font-size:0.82rem;margin-bottom:10px;display:none;"></div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button id="fb-del-confirm" style="
            flex:1;padding:10px 0;border-radius:9px;border:none;
            background:linear-gradient(135deg,#dc2626,#b91c1c);
            color:#fff;font-size:0.9rem;font-weight:700;cursor:pointer;
            box-shadow:0 3px 12px rgba(220,38,38,0.35);transition:opacity 0.15s;
          ">🗑 Sí, eliminar</button>
          <button id="fb-del-cancel" style="
            flex:1;padding:10px 0;border-radius:9px;
            border:1.5px solid rgba(148,163,184,0.3);
            background:rgba(255,255,255,0.04);
            color:#94a3b8;font-size:0.9rem;font-weight:600;cursor:pointer;
            transition:background 0.15s;
          ">Cancelar</button>
        </div>
      </div>`;

    document.body.appendChild(dlg);

    function cerrarDlg() {
      desbloquearScrollFondo();
      dlg.remove();
    }

    document.getElementById('fb-del-cancel').onclick = cerrarDlg;

    document.getElementById('fb-del-confirm').onclick = async () => {
      const btnConfirm = document.getElementById('fb-del-confirm');
      const errEl      = document.getElementById('fb-del-err');
      btnConfirm.disabled = true;
      btnConfirm.textContent = 'Eliminando…';
      errEl.style.display = 'none';

      try {
        const { doc, deleteDoc } = window.__fb;
        const _fbDb = window._fbDb;

        // 1. Eliminar documento de Firestore
        await deleteDoc(doc(_fbDb, 'questions', `${seccionId}_${qIndex + 1}`));

        // 2. Parche quirúrgico en caché de la sección actual:
        //    Quitar la pregunta del array en memoria y en localStorage
        //    sin tocar ningún otro índice de Firestore.
        const pps = window.preguntasPorSeccion || {};
        if (Array.isArray(pps[seccionId])) {
          pps[seccionId].splice(qIndex, 1);
        }

        // Parche en localStorage
        const _ck  = 'fb_q_cache_' + seccionId;
        try {
          const _raw = localStorage.getItem(_ck);
          if (_raw) {
            const _c = JSON.parse(_raw);
            if (Array.isArray(_c?.preguntas)) {
              _c.preguntas.splice(qIndex, 1);
              _c.ts = Date.now();
              localStorage.setItem(_ck, JSON.stringify(_c));
            }
          }
        } catch (_) {
          try { localStorage.removeItem(_ck); } catch (_2) {}
        }

        // Invalidar caché de ediciones pendientes de la sección
        try { localStorage.removeItem('fb_edits_cache_' + seccionId); } catch (_) {}

        // 3. Re-renderizar la sección sin recargar desde Firestore
        const scrollAntes = window.scrollY;
        cerrarDlg();

        // Parche quirúrgico en localStorage del admin (su propia sesión):
        // Reindexar en lugar de borrar preserva answeredOrder y unansweredOrder.
        const STORAGE_KEY = window.STORAGE_KEY || 'quiz_state_v3';
        let state = {};
        try { state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (_) {}
        if (state[seccionId]) {
          _reindexSectionState(state[seccionId], qIndex);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        }

        // Parche en Firestore: reindexar unansweredOrder de TODOS los usuarios.
        // answeredOrder sobrevive por la ancla doble (docId+texto), pero
        // unansweredOrder son índices crudos que quedan desfasados en -1.
        try {
          await _reindexAllUsersProgress(seccionId, qIndex);
        } catch (_reindexErr) {
          console.warn('[EA] Error reindexando progress de usuarios:', _reindexErr.message);
        }

        if (typeof window.generarCuestionario === 'function') {
          window.generarCuestionario(seccionId);
        }

        requestAnimationFrame(() => requestAnimationFrame(() => {
          window.scrollTo({ top: scrollAntes, behavior: 'instant' });
        }));

        _eaToast('🗑 Pregunta eliminada correctamente', 'success');
        console.log(`🗑 Pregunta eliminada: ${seccionId}_${qIndex + 1}`);

      } catch (e) {
        const errEl2 = document.getElementById('fb-del-err');
        if (errEl2) { errEl2.textContent = 'Error al eliminar: ' + e.message; errEl2.style.display = 'block'; }
        if (btnConfirm) { btnConfirm.disabled = false; btnConfirm.textContent = '🗑 Sí, eliminar'; }
      }
    };
  }

  // ════════════════════════════════════════════════════════════════
  // fbInjectVacunasButtonIfAdmin
  // Inyecta el botón "VER MÁS SOBRE VACUNAS" a la derecha de la imagen
  // en el contenedor de la explicación (llamado desde script.js).
  // Para TODOS los usuarios (no solo admin): el botón es visible para todos.
  // ════════════════════════════════════════════════════════════════
  function fbInjectVacunasButtonIfAdmin(seccionId, explicacionDiv) {
    // No duplicar
    if (explicacionDiv.querySelector('[data-vacunas-btn-live]')) return;

    // Activar clicks en marcadores data-vacunas-btn que vengan del WYSIWYG guardado
    explicacionDiv.querySelectorAll('[data-vacunas-btn]').forEach(function(a) {
      a.removeAttribute('href');
      a.style.cursor = 'pointer';
      a.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof window.mostrarVacunas2026DesdeCuestionario === 'function') {
          window.mostrarVacunas2026DesdeCuestionario(seccionId);
        } else if (typeof window.mostrarVacunas2026 === 'function') {
          window.mostrarVacunas2026();
        }
      });
      a.setAttribute('data-vacunas-btn-live', '1');
    });

    // Si no había marcador guardado, no inyectamos nada automáticamente.
    // El admin lo inserta manualmente con el botón 💉 de la toolbar.
  }

  // ════════════════════════════════════════════════════════════════
  // _reindexSectionState
  // Reindexar en memoria el estado de UNA sección tras eliminar la
  // pregunta en removedIdx. Decrementamos en 1 todos los índices > removedIdx.
  // ════════════════════════════════════════════════════════════════
  function _reindexSectionState(sectionState, removedIdx) {
    if (!sectionState) return;
    const s = sectionState;
    const shift = i => i > removedIdx ? i - 1 : i;
    if (Array.isArray(s.answeredOrder)) {
      s.answeredOrder = s.answeredOrder
        .filter(e => (typeof e === 'number' ? e : e.idx) !== removedIdx)
        .map(e => typeof e === 'number' ? shift(e) : { ...e, idx: shift(e.idx) });
    }
    if (Array.isArray(s.unansweredOrder)) {
      s.unansweredOrder = s.unansweredOrder.filter(i => i !== removedIdx).map(shift);
    }
    ['graded', 'answers', 'shuffleMap'].forEach(campo => {
      if (!s[campo]) return;
      const nuevo = {};
      Object.entries(s[campo]).forEach(([k, v]) => {
        const ki = parseInt(k, 10);
        if (isNaN(ki) || ki === removedIdx) return;
        nuevo[ki > removedIdx ? ki - 1 : ki] = v;
      });
      s[campo] = nuevo;
    });
  }

  // ════════════════════════════════════════════════════════════════
  // _reindexAllUsersProgress
  // Lee todos los progress/{uid} de Firestore y reindexea unansweredOrder
  // (e indices legacy en answeredOrder) para la sección afectada.
  // Solo escribe los documentos que tienen índices que corregir.
  // ════════════════════════════════════════════════════════════════
  async function _reindexAllUsersProgress(seccionId, removedIdx) {
    const { getDocs, collection, writeBatch, doc } = window.__fb;
    const _fbDb = window._fbDb;
    if (!getDocs || !_fbDb) return;

    const snap = await getDocs(collection(_fbDb, 'progress'));
    if (snap.empty) return;

    const BATCH_LIMIT = 500;
    let batch = writeBatch(_fbDb);
    let opsInBatch = 0;
    let totalActualizados = 0;

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      if (!data?.state?.[seccionId]) continue;
      const sOrig = data.state[seccionId];
      const unanswered = sOrig.unansweredOrder || [];
      const answered   = sOrig.answeredOrder   || [];
      const necesita =
        unanswered.some(i => i >= removedIdx) ||
        answered.some(e => (typeof e === 'number' ? e : e.idx) >= removedIdx);
      if (!necesita) continue;

      const newState = { ...data.state };
      newState[seccionId] = JSON.parse(JSON.stringify(sOrig));
      _reindexSectionState(newState[seccionId], removedIdx);

      const ref = doc(_fbDb, 'progress', docSnap.id);
      batch.update(ref, { [`state.${seccionId}`]: newState[seccionId] });
      opsInBatch++;
      totalActualizados++;

      if (opsInBatch >= BATCH_LIMIT) {
        await batch.commit();
        batch = writeBatch(_fbDb);
        opsInBatch = 0;
      }
    }
    if (opsInBatch > 0) await batch.commit();
    console.log(`[EA] _reindexAllUsersProgress: ${totalActualizados} docs actualizados en "${seccionId}" (removedIdx=${removedIdx})`);
  }

  // ── Exponer globalmente ───────────────────────────────────────
  window.abrirModalEdicionAdmin       = abrirModalEdicionAdmin;
  window.fbInjectEditButtonIfAdmin    = fbInjectEditButtonIfAdmin;
  window.fbInjectVacunasButtonIfAdmin = fbInjectVacunasButtonIfAdmin;
  window.eliminarPreguntaAdmin        = eliminarPreguntaAdmin;

})();
