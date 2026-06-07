// cuestionario-pdf.js v1
// Genera PDFs y Word de cualquier cuestionario (no simulacro).
// ACCESO RESTRINGIDO: solo disponible para el administrador.
// Descarga 4 archivos al hacer clic en "📥 Preguntas & Grillas":
//   1. simulacro_preguntas.docx  — preguntas en 1 columna (Word)
//   2. simulacro_preguntas.pdf   — preguntas en 2 columnas (PDF, para imprimir)
//   3. grilla_correctas.pdf      — grilla con respuestas correctas
//   4. grilla_en_blanco.pdf      — grilla en blanco para el alumno

(function () {
  'use strict';

  // ── Helpers de admin ────────────────────────────────────────────────────
  function esAdmin() {
    const d = window._fbCurrentUserData;
    return d && d.role === 'admin';
  }

  // ── Obtener preguntas de la sección activa ──────────────────────────────
  // Devuelve array [{numero, pregunta, opciones[], correcta[]}] o null
  function obtenerDatosSeccion(seccionId) {
    const raw = window.preguntasPorSeccion && window.preguntasPorSeccion[seccionId];
    if (!raw || !raw.length) {
      alert('No hay preguntas cargadas para esta sección.');
      return null;
    }
    return raw.map(function (p, i) {
      // opciones: array de strings
      const opts = (p.opciones || []).map(function (o) {
        return typeof o === 'object' ? (o.texto || String(o)) : String(o || '');
      });
      return {
        numero   : i + 1,
        pregunta : limpiarHTML(p.pregunta || ''),
        opciones : opts,
        correcta : p.correcta || []   // array de índices correctos (originales)
      };
    });
  }

  function limpiarHTML(html) {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return (tmp.textContent || tmp.innerText || '').trim();
  }

  function letraOpcion(i) {
    return ['a', 'b', 'c', 'd', 'e'][i] || String(i);
  }

  // ── Carga dinámica de librerías ─────────────────────────────────────────
  function cargarJsPDF(callback) {
    if (window.jspdf && window.jspdf.jsPDF) { callback(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = callback;
    s.onerror = function () { alert('No se pudo cargar jsPDF. Verificá tu conexión.'); };
    document.head.appendChild(s);
  }

  function cargarDocx(callback) {
    if (window.docx) { callback(); return; }
    const cdns = [
      'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js',
      'https://unpkg.com/docx@8.5.0/build/index.umd.js',
      'https://cdn.jsdelivr.net/npm/docx@7.6.0/build/index.umd.js',
      'https://unpkg.com/docx@7.6.0/build/index.umd.js'
    ];
    function intentar(i) {
      if (i >= cdns.length) { alert('No se pudo cargar docx.js. Verificá tu conexión.'); return; }
      const s = document.createElement('script');
      s.src = cdns[i];
      s.onload = function () { if (window.docx) callback(); else intentar(i + 1); };
      s.onerror = function () { intentar(i + 1); };
      document.head.appendChild(s);
    }
    intentar(0);
  }

  function descargarPDF(doc, nombre) { doc.save(nombre); }

  // ════════════════════════════════════════════════════════════════════════
  // PDF — CUADERNILLO DE PREGUNTAS (2 columnas, para imprimir)
  // ════════════════════════════════════════════════════════════════════════
  function generarCuadernilloPDF(preguntas, titulo) {
    const jsPDF = window.jspdf.jsPDF;
    const doc   = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });

    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    const marginLeft   = 36;
    const marginRight  = 36;
    const marginBottom = 36;
    const contentW     = W - marginLeft - marginRight;

    const COLOR_TEAL      = [8, 145, 178];
    const COLOR_TEAL_TEXT = [255, 255, 255];
    const COLOR_NUM_BG    = [8, 145, 178];
    const COLOR_GRIS      = [120, 120, 120];

    const COL_GAP = 12;
    const colW    = (contentW - COL_GAP) / 2;

    const FSnum      = 7;
    const FSpregunta = 8.5;
    const FSopcion   = 8;
    const lineH      = 11.5;
    const indentOpc  = 10;

    function colX(col) { return marginLeft + col * (colW + COL_GAP); }

    function calcularAltura(item) {
      const numStr = String(item.numero);
      const circR  = numStr.length <= 2 ? 6.5 : 8;
      const pw     = colW - circR * 2 - 4 - 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(FSpregunta);
      const lineasPreg = doc.splitTextToSize(item.pregunta, pw);
      let h = Math.max(circR * 2 + 4, lineasPreg.length * lineH) + 2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(FSopcion);
      item.opciones.forEach(function (opc, oi) {
        const lns = doc.splitTextToSize(letraOpcion(oi) + ') ' + opc, colW - indentOpc - circR * 2 - 4);
        h += lns.length * lineH + 1;
      });
      h += 8;
      return h;
    }

    const alturas = preguntas.map(calcularAltura);

    const BAND_H    = 22;
    const PAGE2_TOP = BAND_H + 6;
    const titleH    = 52;
    const instrH    = 68;
    const instrY    = titleH + 6;
    const pieInstrY = instrY + instrH + 5;
    const PAGE1_TOP = pieInstrY + 9 + 2 * 8 + 8;

    const CAP_PAGE1 = H - marginBottom - PAGE1_TOP;
    const CAP_PAGE2 = H - marginBottom - PAGE2_TOP;

    const slots = [];
    let pageIdx = 0, col = 0, usedY = 0;
    slots.push({ pageIdx: 0, col: 0, pregs: [] });

    preguntas.forEach(function (item, i) {
      const h   = alturas[i];
      const cap = pageIdx === 0 ? CAP_PAGE1 : CAP_PAGE2;
      if (usedY + h <= cap) {
        slots[slots.length - 1].pregs.push(item);
        usedY += h;
      } else {
        if (col === 0) { col = 1; }
        else { pageIdx++; col = 0; }
        usedY = 0;
        slots.push({ pageIdx: pageIdx, col: col, pregs: [] });
        slots[slots.length - 1].pregs.push(item);
        usedY += h;
      }
    });

    function numerarPaginas() {
      const total = doc.internal.getNumberOfPages();
      for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(COLOR_GRIS[0], COLOR_GRIS[1], COLOR_GRIS[2]);
        doc.text('Página ' + i + ' de ' + total, W / 2, H - 14, { align: 'center' });
      }
    }

    function dibujarBandaPagina() {
      doc.setFillColor(COLOR_TEAL[0], COLOR_TEAL[1], COLOR_TEAL[2]);
      doc.rect(0, 0, W, BAND_H, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(titulo + ' \u2014 Cuadernillo de Preguntas', W / 2, 15, { align: 'center' });
    }

    function renderizarPregunta(item, cx, yStart) {
      const numStr = String(item.numero);
      const circR  = numStr.length <= 2 ? 6.5 : 8;
      const xPreg  = cx + circR * 2 + 4;
      const pw     = cx + colW - xPreg - 2;

      const circCX = cx + circR;
      const circCY = yStart + circR + 1;
      doc.setFillColor(COLOR_NUM_BG[0], COLOR_NUM_BG[1], COLOR_NUM_BG[2]);
      doc.circle(circCX, circCY, circR, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(FSnum);
      doc.setTextColor(255, 255, 255);
      doc.text(numStr, circCX, circCY + FSnum * 0.38, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(FSpregunta);
      doc.setTextColor(30, 30, 30);
      const lineasPreg = doc.splitTextToSize(item.pregunta, pw);
      const alturaCirc = circR * 2 + 4;
      lineasPreg.forEach(function (linea, li) {
        doc.text(linea, xPreg, yStart + lineH + li * lineH);
      });

      let yOpc = yStart + Math.max(alturaCirc, lineasPreg.length * lineH) + 1;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(FSopcion);
      doc.setTextColor(50, 50, 50);
      item.opciones.forEach(function (opc, oi) {
        const lns = doc.splitTextToSize(letraOpcion(oi) + ') ' + opc, colW - indentOpc - circR * 2 - 4);
        lns.forEach(function (linea, li) {
          doc.text(linea, cx + indentOpc + circR * 2, yOpc + li * lineH + lineH);
        });
        yOpc += lns.length * lineH + 1;
      });

      yOpc += 3;
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(cx, yOpc, cx + colW, yOpc);
      return yOpc + 5;
    }

    // Página 1: título grande
    doc.setFillColor(COLOR_TEAL[0], COLOR_TEAL[1], COLOR_TEAL[2]);
    doc.rect(0, 0, W, titleH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(titulo.toUpperCase(), W / 2, 22, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Cuadernillo de Preguntas \u2014 ' + preguntas.length + ' preguntas', W / 2, 40, { align: 'center' });

    // Instrucciones
    doc.setFillColor(240, 249, 255);
    doc.roundedRect(colX(0), instrY, colW, instrH, 5, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(10, 61, 100);
    doc.text('INSTRUCCIONES', colX(0) + 8, instrY + 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(60, 60, 60);
    [
      '\u2022 Cada pregunta tiene una sola respuesta correcta (a, b, c o d).',
      '\u2022 Us\u00e1 la grilla de respuestas en blanco para registrar tus respuestas.',
      '\u2022 Al terminar, compar\u00e1las con la grilla de respuestas correctas.',
      '\u2022 USE SOLAMENTE TINTA NEGRA.'
    ].forEach(function (ln, li) {
      doc.text(ln, colX(0) + 8, instrY + 26 + li * 10.5);
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    doc.text('USE SOLAMENTE TINTA NEGRA', colX(0), pieInstrY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    const pieLineas = doc.splitTextToSize(
      'IMPORTANTE: LA COMPRENSI\u00d3N DEL SISTEMA Y EL CONTENIDO DEL EXAMEN FORMAN PARTE DEL MISMO.', colW
    );
    pieLineas.forEach(function (ln, li) { doc.text(ln, colX(0), pieInstrY + 9 + li * 8); });

    // Renderizar slots
    let lastPageIdx = -1;
    slots.forEach(function (slot) {
      if (slot.pageIdx !== lastPageIdx) {
        if (slot.pageIdx > 0) { doc.addPage(); dibujarBandaPagina(); }
        lastPageIdx = slot.pageIdx;
      }
      const startY = slot.pageIdx === 0 ? PAGE1_TOP : PAGE2_TOP;
      let yy = startY;
      slot.pregs.forEach(function (item) { yy = renderizarPregunta(item, colX(slot.col), yy); });
    });

    numerarPaginas();
    descargarPDF(doc, _nombreBase + '_preguntas.pdf');
  }

  // ════════════════════════════════════════════════════════════════════════
  // WORD — CUADERNILLO DE PREGUNTAS (1 columna)
  // ════════════════════════════════════════════════════════════════════════
  function generarCuadernilloWord(preguntas, titulo) {
    const D         = window.docx;
    const TEAL      = '0891B2';
    const TEAL_DARK = '0E7490';
    const BLANCO    = 'FFFFFF';
    const GRIS      = '3C3C3C';

    function parrafoVacio(after) {
      return new D.Paragraph({ text: '', spacing: { after: after || 0 } });
    }
    function run(texto, opts) {
      return new D.TextRun(Object.assign({ text: String(texto || '') }, opts || {}));
    }

    const parrafos = [];

    parrafos.push(new D.Paragraph({
      children: [ run(titulo.toUpperCase(), { bold: true, size: 32, color: BLANCO }) ],
      shading: { type: D.ShadingType.SOLID, color: TEAL },
      alignment: D.AlignmentType.CENTER,
      spacing: { before: 0, after: 0 }
    }));
    parrafos.push(new D.Paragraph({
      children: [ run('Cuadernillo de Preguntas \u2014 ' + preguntas.length + ' preguntas', { size: 20, color: BLANCO }) ],
      shading: { type: D.ShadingType.SOLID, color: TEAL_DARK },
      alignment: D.AlignmentType.CENTER,
      spacing: { before: 0, after: 120 }
    }));

    parrafos.push(new D.Paragraph({
      children: [ run('INSTRUCCIONES', { bold: true, size: 18, color: TEAL }) ],
      spacing: { before: 60, after: 60 }
    }));
    [
      'Cada pregunta tiene una sola respuesta correcta (a, b, c o d).',
      'Us\u00e1 la grilla de respuestas en blanco para registrar tus respuestas.',
      'Al terminar, compar\u00e1las con la grilla de respuestas correctas.'
    ].forEach(function (txt) {
      parrafos.push(new D.Paragraph({
        children: [ run('\u2022 ' + txt, { size: 16, color: GRIS }) ],
        spacing: { before: 20, after: 20 },
        indent: { left: 360 }
      }));
    });
    parrafos.push(new D.Paragraph({
      children: [ run('USE SOLAMENTE TINTA NEGRA', { bold: true, size: 16, color: TEAL }) ],
      spacing: { before: 80, after: 180 }
    }));

    preguntas.forEach(function (item) {
      parrafos.push(new D.Paragraph({
        children: [
          run(String(item.numero) + '\u2003', { bold: true, size: 17, color: TEAL }),
          run(item.pregunta, { bold: true, size: 17, color: '1A1A1A' })
        ],
        spacing: { before: 80, after: 60 },
        border: { top: { style: D.BorderStyle.SINGLE, size: 4, color: 'DDDDDD' } }
      }));
      item.opciones.forEach(function (opc, oi) {
        parrafos.push(new D.Paragraph({
          children: [
            run(letraOpcion(oi) + ') ', { bold: true, size: 16, color: TEAL_DARK }),
            run(opc, { size: 16, color: GRIS })
          ],
          spacing: { before: 18, after: 18 },
          indent: { left: 300 }
        }));
      });
    });

    const documento = new D.Document({
      sections: [{
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 720, bottom: 720, left: 720, right: 720 }
          }
        },
        children: parrafos
      }]
    });

    D.Packer.toBlob(documento).then(function (blob) {
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = _nombreBase + '_preguntas.docx';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
    }).catch(function (err) {
      console.error('Error generando Word:', err);
      alert('Error al generar el Word: ' + err.message);
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // PDF — GRILLA CON RESPUESTAS CORRECTAS
  // ════════════════════════════════════════════════════════════════════════
  function generarGrillaCorrectas(preguntas, titulo) {
    const jsPDF = window.jspdf.jsPDF;
    const doc   = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    _renderGrilla(doc, preguntas, titulo, true, W, H);
    descargarPDF(doc, _nombreBase + '_grilla_correctas.pdf');
  }

  // ════════════════════════════════════════════════════════════════════════
  // PDF — GRILLA EN BLANCO
  // ════════════════════════════════════════════════════════════════════════
  function generarGrillaBlanca(preguntas, titulo) {
    const jsPDF = window.jspdf.jsPDF;
    const doc   = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    _renderGrilla(doc, preguntas, titulo, false, W, H);
    descargarPDF(doc, _nombreBase + '_grilla_blanco.pdf');
  }

  // ── Renderizado común de grilla ─────────────────────────────────────────
  function _renderGrilla(doc, preguntas, titulo, mostrarCorrectas, W, H) {
    const COLOR_TEAL = [8, 145, 178];
    const COLOR_GRIS = [120, 120, 120];

    const COLS_GRILLA = 5;
    const marginL = 40, marginR = 40, marginT = 28, marginB = 36;
    const gridW   = W - marginL - marginR;
    const colGW   = gridW / COLS_GRILLA;

    const OPTS       = ['a', 'b', 'c', 'd'];
    const bubR       = 6;
    const rowH       = 32;
    const headerH    = 60;
    const tituloH    = 50;
    const subTitH    = 26;
    const instrGH    = 26;

    function encabezado(pageNum, totalPages) {
      doc.setFillColor(COLOR_TEAL[0], COLOR_TEAL[1], COLOR_TEAL[2]);
      doc.rect(0, 0, W, tituloH, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.text(titulo, W / 2, 20, { align: 'center' });
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const subtitulo = mostrarCorrectas
        ? 'Grilla de Respuestas Correctas'
        : 'Grilla de Respuestas — Nombre: ___________________________';
      doc.text(subtitulo, W / 2, 36, { align: 'center' });

      if (!mostrarCorrectas) {
        doc.setFontSize(7.5);
        doc.setTextColor(220, 220, 220);
        doc.text('USE SOLAMENTE TINTA NEGRA  |  ' + preguntas.length + ' preguntas', W / 2, 48, { align: 'center' });
      }

      // cabecera de columnas
      const headerY = tituloH + 4;
      for (let c = 0; c < COLS_GRILLA; c++) {
        const cx = marginL + c * colGW + colGW / 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(COLOR_TEAL[0], COLOR_TEAL[1], COLOR_TEAL[2]);
        doc.text('Nº', cx - colGW * 0.28, headerY + 14, { align: 'center' });
        OPTS.forEach(function (letra, li) {
          doc.text(letra, cx - colGW * 0.05 + li * 13, headerY + 14, { align: 'center' });
        });
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(COLOR_GRIS[0], COLOR_GRIS[1], COLOR_GRIS[2]);
      doc.text('Pág. ' + pageNum + ' / ' + totalPages, W - marginR, H - 14, { align: 'right' });
    }

    // Pre-calcular páginas
    const startY  = tituloH + 4 + 20;
    const maxRows = Math.floor((H - marginB - startY) / rowH);
    const totalRows = Math.ceil(preguntas.length / COLS_GRILLA);
    const totalPages = Math.ceil(totalRows / maxRows);

    for (let pg = 0; pg < totalPages; pg++) {
      if (pg > 0) doc.addPage();
      encabezado(pg + 1, totalPages);

      const rowStart = pg * maxRows;
      const rowEnd   = Math.min(rowStart + maxRows, totalRows);

      for (let r = rowStart; r < rowEnd; r++) {
        const y = startY + (r - rowStart) * rowH;
        for (let c = 0; c < COLS_GRILLA; c++) {
          const idx = r + c * totalRows;
          if (idx >= preguntas.length) continue;
          const item = preguntas[idx];
          const cx   = marginL + c * colGW + colGW / 2;
          const numStr = String(item.numero);

          // Número de pregunta
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(30, 30, 30);
          doc.text(numStr, cx - colGW * 0.28, y + rowH / 2 + 3, { align: 'center' });

          // Burbujas a/b/c/d
          OPTS.forEach(function (_, li) {
            const bx = cx - colGW * 0.05 + li * 13;
            const by = y + rowH / 2;
            const esCorrecta = mostrarCorrectas && item.correcta.includes(li);
            if (esCorrecta) {
              doc.setFillColor(COLOR_TEAL[0], COLOR_TEAL[1], COLOR_TEAL[2]);
              doc.circle(bx, by, bubR, 'F');
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(6.5);
              doc.setTextColor(255, 255, 255);
              doc.text(OPTS[li], bx, by + 2.5, { align: 'center' });
            } else {
              doc.setDrawColor(180, 180, 180);
              doc.setLineWidth(0.6);
              doc.circle(bx, by, bubR, 'S');
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(6.5);
              doc.setTextColor(150, 150, 150);
              doc.text(OPTS[li], bx, by + 2.5, { align: 'center' });
            }
          });

          // Línea separadora entre filas
          doc.setDrawColor(230, 230, 230);
          doc.setLineWidth(0.3);
          doc.line(marginL + c * colGW, y + rowH, marginL + (c + 1) * colGW - 4, y + rowH);
        }
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // NOMBRE BASE para los archivos (se calcula al hacer clic)
  // ════════════════════════════════════════════════════════════════════════
  let _nombreBase = 'cuestionario';

  // ════════════════════════════════════════════════════════════════════════
  // FUNCIÓN PRINCIPAL — descarga 4 archivos
  // ════════════════════════════════════════════════════════════════════════
  function descargarTodo(seccionId, titulo) {
    if (!esAdmin()) {
      console.warn('[Export] Acceso denegado.');
      return;
    }
    const preguntas = obtenerDatosSeccion(seccionId);
    if (!preguntas) return;

    // Nombre de archivo basado en el ID de sección
    _nombreBase = seccionId.replace(/[^a-z0-9]/gi, '_');

    const btn = document.getElementById('btn-export-cuestionario-' + seccionId);
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Generando…'; }

    function terminar() {
      if (btn) { btn.disabled = false; btn.innerHTML = '📥 Preguntas &amp; Grillas'; }
    }

    // 1. Word
    cargarDocx(function () {
      try { generarCuadernilloWord(preguntas, titulo); }
      catch (e) { console.error('Error Word:', e); alert('Error Word: ' + e.message); }

      // 2-4. PDFs
      cargarJsPDF(function () {
        setTimeout(function () {
          try { generarCuadernilloPDF(preguntas, titulo); } catch (e) { console.error('Error PDF:', e); }
          setTimeout(function () {
            try { generarGrillaCorrectas(preguntas, titulo); } catch (e) { console.error('Error PDF correctas:', e); }
            setTimeout(function () {
              try { generarGrillaBlanca(preguntas, titulo); } catch (e) { console.error('Error PDF blanco:', e); }
              terminar();
            }, 600);
          }, 600);
        }, 600);
      });
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // INYECCIÓN DE BOTONES
  // Busca cada .pagina-cuestionario e inyecta el botón en el div de controles
  // ════════════════════════════════════════════════════════════════════════
  function inyectarBotones() {
    if (!esAdmin()) return;

    // Estilos (una sola vez)
    if (!document.getElementById('cuestionario-pdf-styles')) {
      const st = document.createElement('style');
      st.id = 'cuestionario-pdf-styles';
      st.textContent = [
        '.btn-export-cuestionario {',
        '  display:inline-flex; align-items:center; gap:7px;',
        '  background:linear-gradient(135deg,#0891b2 0%,#0e7490 100%);',
        '  color:#fff; border:none; padding:11px 20px; border-radius:10px;',
        '  cursor:pointer; font-size:0.88rem; font-weight:600;',
        '  box-shadow:0 4px 12px rgba(8,145,178,0.28);',
        '  transition:all 0.2s ease; white-space:nowrap; font-family:inherit;',
        '}',
        '.btn-export-cuestionario:hover:not(:disabled) {',
        '  background:linear-gradient(135deg,#0e7490 0%,#155e75 100%);',
        '  box-shadow:0 6px 18px rgba(8,145,178,0.40); transform:translateY(-1px);',
        '}',
        '.btn-export-cuestionario:active { transform:translateY(0); }',
        '.btn-export-cuestionario:disabled { opacity:0.65; cursor:not-allowed; }'
      ].join('\n');
      document.head.appendChild(st);
    }

    // Inyectar en cada pagina-cuestionario (excepto simulador, que ya tiene su botón)
    document.querySelectorAll('.pagina-cuestionario').forEach(function (pagina) {
      const seccionId = pagina.id;
      if (!seccionId || seccionId === 'simulador') return;
      if (document.getElementById('btn-export-cuestionario-' + seccionId)) return; // ya existe

      // Buscar el div flex inferior (el que tiene btn-volver + btn-reiniciar)
      const divControles = pagina.querySelector('div[style*="display:flex"]');
      if (!divControles) return;

      // Obtener el título de la sección desde el <h1>
      const h1 = pagina.querySelector('h1');
      const titulo = h1 ? h1.textContent.trim() : seccionId;

      const btn = document.createElement('button');
      btn.id        = 'btn-export-cuestionario-' + seccionId;
      btn.className = 'btn-export-cuestionario';
      btn.innerHTML = '📥 Preguntas &amp; Grillas';
      btn.title     = 'Descargar cuadernillo Word + PDF y grillas PDF para ' + titulo;
      btn.addEventListener('click', function () { descargarTodo(seccionId, titulo); });
      divControles.appendChild(btn);
    });
  }

  // ── Observar el DOM para inyectar cuando aparecen las secciones ─────────
  // (el admin puede no estar logueado todavía cuando corre este script)
  function iniciar() {
    inyectarBotones();
    // Re-inyectar si el DOM cambia (login tardío o secciones generadas dinámicamente)
    const obs = new MutationObserver(function () {
      if (esAdmin()) inyectarBotones();
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }

})();
