// simulacro-pdf.js v35
// Genera 3 PDFs del simulacro en curso:
// ACCESO RESTRINGIDO: solo disponible para el administrador.
//   1. Cuadernillo de preguntas (con opciones a/b/c/d)
//   2. Grilla con respuestas correctas marcadas
//   3. Grilla en blanco para que el alumno marque
// Se activa con el botón "📥 PDF" en la barra inferior del simulacro.

(function () {
  'use strict';

  // ── Verificación de permisos de admin ──────────────────────────────────
  var ADMIN_EMAIL = 'examenesresidenciamedica@gmail.com';

  function esAdmin() {
    // Doble verificación: rol en Firestore Y email exacto
    var datos = window._fbCurrentUserData || window._currentUserData_pub || null;
    if (datos && datos.role === 'admin') return true;
    // Fallback: verificar email directo en Firebase Auth
    try {
      var fb = window.__fb;
      if (fb && fb.auth && fb.auth().currentUser) {
        return fb.auth().currentUser.email === ADMIN_EMAIL;
      }
    } catch(e) {}
    return false;
  }

  // ── Cargar jsPDF dinámicamente ──────────────────────────────────────────
  function cargarJsPDF(callback) {
    if (window.jspdf && window.jspdf.jsPDF) { callback(); return; }
    var script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = function () { callback(); };
    script.onerror = function () {
      alert('No se pudo cargar la librería de PDF. Verificá tu conexión a internet.');
    };
    document.head.appendChild(script);
  }

  // ── Cargar docx.js dinámicamente ───────────────────────────────────────
  function cargarDocx(callback) {
    if (window.docx) { callback(); return; }
    var cdns = [
      'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js',
      'https://unpkg.com/docx@8.5.0/build/index.umd.js',
      'https://cdn.jsdelivr.net/npm/docx@7.6.0/build/index.umd.js',
      'https://unpkg.com/docx@7.6.0/build/index.umd.js'
    ];
    function intentar(i) {
      if (i >= cdns.length) {
        alert('No se pudo cargar la librería de Word. Verificá tu conexión a internet.');
        return;
      }
      var script = document.createElement('script');
      script.src = cdns[i];
      script.onload = function () {
        if (window.docx) { callback(); }
        else { intentar(i + 1); }
      };
      script.onerror = function () { intentar(i + 1); };
      document.head.appendChild(script);
    }
    intentar(0);
  }

  // ── Utilidades ──────────────────────────────────────────────────────────
  function descargarPDF(doc, nombre) {
    doc.save(nombre);
  }

  // Ajuste de texto con wrapping manual (jsPDF no hace wrap automático)
  function splitTexto(doc, texto, maxWidth) {
    return doc.splitTextToSize(String(texto || ''), maxWidth);
  }

  // Limpiar HTML básico del texto de preguntas
  function limpiarHTML(html) {
    if (!html) return '';
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    return (tmp.textContent || tmp.innerText || '').trim();
  }

  // Obtener letra de opción (0→a, 1→b, 2→c, 3→d)
  function letraOpcion(idx) {
    return ['a', 'b', 'c', 'd', 'e'][idx] || String(idx);
  }

  // ── Obtener datos del simulacro actual ─────────────────────────────────
  function obtenerDatosSimulacro() {
    var preguntas = (window.preguntasPorSeccion || {})['simulador'] || [];
    if (preguntas.length === 0) {
      alert('No hay un simulacro activo. Iniciá uno primero.');
      return null;
    }

    var resultado = [];
    preguntas.forEach(function (preg, idx) {
      var opciones = (preg.opciones || []).map(function (o) { return limpiarHTML(o); });
      // correcta es array de índices 0-based de la(s) opción(es) correcta(s)
      var correctaIdxs = preg.correcta || [0];
      resultado.push({
        numero: idx + 1,
        pregunta: limpiarHTML(preg.pregunta || preg.enunciado || ''),
        opciones: opciones,
        correctaIdxs: correctaIdxs,  // índices originales
        especialidad: preg.etiquetas ? (preg.etiquetas.especialidad || '') : ''
      });
    });
    return resultado;
  }

  // ══════════════════════════════════════════════════════════════════════
  // PDF 1 — CUADERNILLO DE PREGUNTAS
  // ══════════════════════════════════════════════════════════════════════
  function generarCuadernillo(preguntas) {
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });

    var W = doc.internal.pageSize.getWidth();   // 595
    var H = doc.internal.pageSize.getHeight();  // 842

    var marginLeft   = 36;
    var marginRight  = 36;
    var marginBottom = 36;
    var contentW     = W - marginLeft - marginRight;

    // Colores
    var COLOR_TEAL      = [8, 145, 178];
    var COLOR_TEAL_TEXT = [255, 255, 255];
    var COLOR_NUM_BG    = [8, 145, 178];
    var COLOR_GRIS      = [120, 120, 120];

    // Columnas
    var COL_GAP = 12;
    var colW    = (contentW - COL_GAP) / 2;

    // Fuentes
    var FSnum      = 7;
    var FSpregunta = 8.5;
    var FSopcion   = 8;
    var lineH      = 11.5;
    var indentOpc  = 10;

    function colX(col) {
      return marginLeft + col * (colW + COL_GAP);
    }

    // ── PASO 1: calcular la altura de cada pregunta ──────────────────────
    // (el ancho es el mismo para ambas columnas, así que calculamos una vez)
    function calcularAltura(item) {
      var numStr = String(item.numero);
      var circR  = numStr.length <= 2 ? 6.5 : 8;
      var xPreg  = circR * 2 + 4;        // offset dentro de la columna
      var pw     = colW - xPreg - 2;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(FSpregunta);
      var lineasPreg = doc.splitTextToSize(item.pregunta, pw);

      var alturaCirc  = circR * 2 + 4;
      var alturaPreg  = lineasPreg.length * lineH;
      var h = Math.max(alturaCirc, alturaPreg) + 2;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(FSopcion);
      item.opciones.forEach(function (opc, oi) {
        var lns = doc.splitTextToSize(letraOpcion(oi) + ') ' + opc, colW - indentOpc - circR * 2 - 4);
        h += lns.length * lineH + 1;
      });
      h += 8; // separador inferior
      return h;
    }

    var alturas = preguntas.map(calcularAltura);

    // ── PASO 2: distribuir preguntas en columnas por página ───────────────
    // Capacidad disponible por columna (varía según la página)
    // Pág 1: instrucciones ocupan espacio fijo en col izq, igual en col der
    // Páginas 2+: banda teal 22pt + 6pt gap = 28pt de margen superior

    var BAND_H       = 22;    // altura banda teal páginas 2+
    var PAGE2_TOP    = BAND_H + 6;  // 28

    // Calculamos el Y de inicio de preguntas en pág 1 (col izq y der son iguales)
    var titleH       = 52;
    var instrH       = 68;
    var instruccionesY = titleH + 6;
    var pieInstrY    = instruccionesY + instrH + 5;
    var PAGE1_TOP    = pieInstrY + 9 + 2 * 8 + 8; // ≈ 153 pt

    var CAP_PAGE1    = H - marginBottom - PAGE1_TOP;
    var CAP_PAGE2    = H - marginBottom - PAGE2_TOP;

    // Agrupamos preguntas en slots [página, columna]
    // Estrategia: llenar columnas en orden (izq→der→nueva pág) pero
    // BALANCEAR la última columna de cada página: si una pregunta "derramaría"
    // a la col siguiente pero cabe bien, se deja. Siempre se respeta el orden.
    var slots = [];  // [{pageIdx, col, pregs:[item,...]}]
    var pageIdx = 0;
    var col     = 0;
    var usedY   = 0;

    function capActual() {
      return pageIdx === 0 ? CAP_PAGE1 : CAP_PAGE2;
    }

    slots.push({ pageIdx: 0, col: 0, pregs: [] });

    preguntas.forEach(function (item, i) {
      var h = alturas[i];
      var cap = capActual();

      if (usedY + h <= cap) {
        // cabe en la columna actual
        slots[slots.length - 1].pregs.push(item);
        usedY += h;
      } else {
        // no cabe → avanzar columna (o página)
        if (col === 0) {
          col = 1;
        } else {
          pageIdx++;
          col = 0;
        }
        usedY = 0;
        slots.push({ pageIdx: pageIdx, col: col, pregs: [] });
        slots[slots.length - 1].pregs.push(item);
        usedY += h;
      }
    });

    // ── PASO 3: renderizar ────────────────────────────────────────────────
    function numerarPaginas() {
      var totalPages = doc.internal.getNumberOfPages();
      for (var i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(COLOR_GRIS[0], COLOR_GRIS[1], COLOR_GRIS[2]);
        doc.text('Página ' + i + ' de ' + totalPages, W / 2, H - 14, { align: 'center' });
      }
    }

    function dibujarBandaPagina() {
      doc.setFillColor(COLOR_TEAL[0], COLOR_TEAL[1], COLOR_TEAL[2]);
      doc.rect(0, 0, W, BAND_H, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(COLOR_TEAL_TEXT[0], COLOR_TEAL_TEXT[1], COLOR_TEAL_TEXT[2]);
      doc.text('SIMULACRO EXAMEN DE RESIDENCIA \u2014 Cuadernillo de Preguntas', W / 2, 15, { align: 'center' });
    }

    // Renderizar una pregunta en la posición (cx, yStart)
    function renderizarPregunta(item, cx, yStart) {
      var numStr = String(item.numero);
      var circR  = numStr.length <= 2 ? 6.5 : 8;
      var xPreg  = cx + circR * 2 + 4;
      var pw     = cx + colW - xPreg - 2;

      // Círculo número
      var circCX = cx + circR;
      var circCY = yStart + circR + 1;
      doc.setFillColor(COLOR_NUM_BG[0], COLOR_NUM_BG[1], COLOR_NUM_BG[2]);
      doc.circle(circCX, circCY, circR, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(FSnum);
      doc.setTextColor(255, 255, 255);
      doc.text(numStr, circCX, circCY + FSnum * 0.38, { align: 'center' });

      // Enunciado
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(FSpregunta);
      doc.setTextColor(30, 30, 30);
      var lineasPreg = doc.splitTextToSize(item.pregunta, pw);
      var alturaCirc = circR * 2 + 4;
      lineasPreg.forEach(function (linea, li) {
        doc.text(linea, xPreg, yStart + lineH + li * lineH);
      });

      var yOpc = yStart + Math.max(alturaCirc, lineasPreg.length * lineH) + 1;

      // Opciones
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(FSopcion);
      doc.setTextColor(50, 50, 50);
      item.opciones.forEach(function (opc, oi) {
        var texto = letraOpcion(oi) + ') ' + opc;
        var lns   = doc.splitTextToSize(texto, colW - indentOpc - circR * 2 - 4);
        lns.forEach(function (linea, li) {
          doc.text(linea, cx + indentOpc + circR * 2, yOpc + li * lineH + lineH);
        });
        yOpc += lns.length * lineH + 1;
      });

      // Línea separadora
      yOpc += 3;
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(cx, yOpc, cx + colW, yOpc);

      return yOpc + 5; // nuevo y tras el separador
    }

    // ── Página 1: encabezado grande + instrucciones ──
    doc.setFillColor(COLOR_TEAL[0], COLOR_TEAL[1], COLOR_TEAL[2]);
    doc.rect(0, 0, W, titleH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('SIMULACRO DE EXAMEN DE RESIDENCIA', W / 2, 22, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Cuadernillo de Preguntas \u2014 ' + preguntas.length + ' preguntas', W / 2, 40, { align: 'center' });

    // Instrucciones (col izquierda, debajo del título)
    doc.setFillColor(240, 249, 255);
    doc.roundedRect(colX(0), instruccionesY, colW, instrH, 5, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(10, 61, 100);
    doc.text('INSTRUCCIONES', colX(0) + 8, instruccionesY + 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(60, 60, 60);
    [
      '\u2022 Tiempo disponible: 2 horas 30 minutos.',
      '\u2022 Cada pregunta tiene una sola respuesta correcta (a, b, c o d).',
      '\u2022 Us\u00e1 la grilla de respuestas en blanco para registrar tus respuestas.',
      '\u2022 Al terminar, compar\u00e1las con la grilla de respuestas correctas.'
    ].forEach(function (ln, li) {
      doc.text(ln, colX(0) + 8, instruccionesY + 26 + li * 10.5);
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    doc.text('USE SOLAMENTE TINTA NEGRA', colX(0), pieInstrY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    var pieTexto  = 'IMPORTANTE: LA COMPRENSI\u00d3N DEL SISTEMA Y EL CONTENIDO DEL EXAMEN FORMAN PARTE DEL MISMO.';
    var pieLineas = doc.splitTextToSize(pieTexto, colW);
    pieLineas.forEach(function (ln, li) {
      doc.text(ln, colX(0), pieInstrY + 9 + li * 8);
    });

    // ── Renderizar slots ──
    var lastPageIdx = -1;
    slots.forEach(function (slot) {
      // Cambiar de página si hace falta
      if (slot.pageIdx !== lastPageIdx) {
        if (slot.pageIdx > 0) {
          doc.addPage();
          dibujarBandaPagina();
        }
        lastPageIdx = slot.pageIdx;
      }

      // Y de inicio de esta columna en esta página
      var startY = slot.pageIdx === 0 ? PAGE1_TOP : PAGE2_TOP;
      var cx     = colX(slot.col);
      var yy     = startY;

      slot.pregs.forEach(function (item) {
        yy = renderizarPregunta(item, cx, yy);
      });
    });

    numerarPaginas();
    descargarPDF(doc, 'simulacro_preguntas.pdf');
  }

  // ══════════════════════════════════════════════════════════════════════
  // FUNCIÓN COMPARTIDA — dibuja la grilla en una página de jsPDF
  // correctasMap: {pregNumero(1-based): letraCorrecta} o null para grilla vacía
  // ══════════════════════════════════════════════════════════════════════
  function dibujarGrilla(doc, preguntas, correctasMap) {
    var W = doc.internal.pageSize.getWidth();
    var H = doc.internal.pageSize.getHeight();

    // ── Dimensiones replicando la grilla original ──
    // 5 columnas × 20 filas, A4 portrait
    var marginLeft   = 23;
    var marginRight  = 23;
    var totalW       = W - marginLeft - marginRight;

    var NUM_COLS   = 5;    // columnas de la grilla
    var NUM_ROWS   = 20;   // filas por columna
    var OPCIONES   = 4;    // a,b,c,d

    // Encabezado: franja teal con título y subtítulo
    var titleBandH = 46;   // altura total de la franja de color

    var COLOR_TEAL    = [8, 145, 178];
    var COLOR_GRIS_BG = [229, 229, 229];  // gris claro para filas alternas
    var COLOR_NEGRO   = [0, 0, 0];
    var COLOR_BLANCO  = [255, 255, 255];
    var COLOR_CORREC  = [0, 0, 0];         // relleno de burbuja correcta

    // ── Título (franja teal desde y=0 hasta y=titleBandH) ──
    doc.setFillColor(COLOR_TEAL[0], COLOR_TEAL[1], COLOR_TEAL[2]);
    doc.rect(0, 0, W, titleBandH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('SIMULACRO DE EXAMEN', W / 2, 18, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    if (correctasMap) {
      doc.text('GRILLA DE RESPUESTAS CORRECTAS', W / 2, 34, { align: 'center' });
    } else {
      doc.text('GRILLA — Marcá tus respuestas con tinta negra', W / 2, 34, { align: 'center' });
    }

    // La grilla empieza después de la franja + un gap
    var gridTopMargin = titleBandH + 6;   // espacio entre fin de franja y cabecera de letras

    // ── Cabecera de columnas (a b c d) ──
    var cabeceraH = 13;
    var cabeceraY = gridTopMargin;
    // gridTop es donde empieza la primera fila de burbujas
    var gridTop   = cabeceraY + cabeceraH + 2;
    var gridBottom = H - 90;
    var gridH      = gridBottom - gridTop;

    var colW   = totalW / NUM_COLS;       // ancho de cada columna de la grilla
    var rowH   = gridH / NUM_ROWS;        // altura de cada fila

    // Medidas de burbuja
    var bubR     = Math.min(rowH * 0.28, 5.8);  // radio burbuja
    var numW     = 18;   // ancho zona número
    var bubArea  = colW - numW;
    var bubSep   = bubArea / OPCIONES;
    for (var col = 0; col < NUM_COLS; col++) {
      var colX = marginLeft + col * colW;
      // fondo gris de la cabecera de letras
      doc.setFillColor(235, 235, 235);
      doc.rect(colX + numW, cabeceraY, colW - numW, cabeceraH, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(80, 80, 80);
      var cabeceraTextY = cabeceraY + cabeceraH * 0.7;
      for (var oi = 0; oi < OPCIONES; oi++) {
        var bx = colX + numW + oi * bubSep + bubSep / 2;
        doc.text(letraOpcion(oi), bx, cabeceraTextY, { align: 'center' });
      }
    }

    // ── Filas de preguntas ──
    for (var fila = 0; fila < NUM_ROWS; fila++) {
      var rowY = gridTop + fila * rowH;
      var rowBotY = rowY + rowH;

      // Fondo alternado
      if (fila % 2 === 0) {
        doc.setFillColor(COLOR_GRIS_BG[0], COLOR_GRIS_BG[1], COLOR_GRIS_BG[2]);
        for (var c2 = 0; c2 < NUM_COLS; c2++) {
          doc.rect(marginLeft + c2 * colW, rowY, numW, rowH, 'F');
        }
      }

      for (var col2 = 0; col2 < NUM_COLS; col2++) {
        var numPregunta = col2 * NUM_ROWS + fila + 1;  // 1-based
        var colX2 = marginLeft + col2 * colW;

        // Número de pregunta
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(COLOR_NEGRO[0], COLOR_NEGRO[1], COLOR_NEGRO[2]);
        doc.text(String(numPregunta), colX2 + numW - 4, rowY + rowH / 2 + 2.5, { align: 'right' });

        // Burbujas a b c d
        for (var oi2 = 0; oi2 < OPCIONES; oi2++) {
          var bx2 = colX2 + numW + oi2 * bubSep + bubSep / 2;
          var by2 = rowY + rowH / 2;

          var estaCorrecta = false;
          if (correctasMap) {
            var letra = letraOpcion(oi2);
            estaCorrecta = (correctasMap[numPregunta] === letra);
          }

          if (estaCorrecta) {
            // Burbuja rellena (respuesta correcta)
            doc.setFillColor(COLOR_CORREC[0], COLOR_CORREC[1], COLOR_CORREC[2]);
            doc.circle(bx2, by2, bubR, 'FD');
            // Letra en blanco dentro
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(5.5);
            doc.setTextColor(COLOR_BLANCO[0], COLOR_BLANCO[1], COLOR_BLANCO[2]);
            doc.text(letraOpcion(oi2), bx2, by2 + 2, { align: 'center' });
          } else {
            // Burbuja vacía con borde
            doc.setDrawColor(130, 130, 130);
            doc.setLineWidth(0.5);
            doc.setFillColor(COLOR_BLANCO[0], COLOR_BLANCO[1], COLOR_BLANCO[2]);
            doc.circle(bx2, by2, bubR, 'FD');
            // Letra en gris dentro (solo para grilla en blanco, para guía)
            if (!correctasMap) {
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(5);
              doc.setTextColor(180, 180, 180);
              doc.text(letraOpcion(oi2), bx2, by2 + 1.8, { align: 'center' });
            }
          }
        }

        // Línea vertical separadora entre columnas
        if (col2 < NUM_COLS - 1) {
          doc.setDrawColor(190, 190, 190);
          doc.setLineWidth(0.3);
          doc.line(colX2 + colW, gridTop - cabeceraH - 2, colX2 + colW, gridBottom);
        }
      }

      // Línea horizontal entre filas
      doc.setDrawColor(190, 190, 190);
      doc.setLineWidth(0.2);
      doc.line(marginLeft, rowBotY, W - marginRight, rowBotY);
    }

    // Borde exterior de la grilla
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.6);
    doc.rect(marginLeft, cabeceraY, totalW, gridBottom - cabeceraY);

    // ── Pie: leyenda y aviso ──
    var pieY = gridBottom + 10;

    // Recuadro de marcas
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(60, 60, 60);
    doc.text('USE SOLAMENTE TINTA NEGRA', marginLeft, pieY + 8);

    // Ejemplos de marcas incorrectas y correctas
    var ejX = marginLeft + 145;
    doc.setFontSize(6.5);
    doc.text('MARCAS INCORRECTAS', ejX, pieY + 5);

    // Marcas incorrectas (aspas, medios rellenos)
    var marcasIncX = [ejX + 5, ejX + 18, ejX + 31];
    marcasIncX.forEach(function(mx, mi) {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.setFillColor(255, 255, 255);
      doc.circle(mx, pieY + 14, 5, 'FD');
    });
    // aspa en la primera
    doc.setDrawColor(0,0,0); doc.setLineWidth(0.6);
    doc.line(marcasIncX[0]-3, pieY+11, marcasIncX[0]+3, pieY+17);
    doc.line(marcasIncX[0]+3, pieY+11, marcasIncX[0]-3, pieY+17);
    // raya en la segunda
    doc.line(marcasIncX[1]-3, pieY+14, marcasIncX[1]+3, pieY+14);
    // círculo relleno parcial en la tercera
    doc.setFillColor(180,180,180);
    doc.circle(marcasIncX[2], pieY+14, 3, 'F');

    // Marcas correctas
    var ejCorrX = ejX + 85;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(60, 60, 60);
    doc.text('MARCAS CORRECTAS', ejCorrX, pieY + 5);

    var marcasCorrX = [ejCorrX + 5, ejCorrX + 18];
    // Burbuja rellena correcta
    doc.setFillColor(0, 0, 0);
    doc.circle(marcasCorrX[0], pieY + 14, 5, 'FD');
    // Burbuja rellena correcta 2
    doc.setFillColor(0, 0, 0);
    doc.circle(marcasCorrX[1], pieY + 14, 5, 'FD');

    // Aviso inferior
    var avisoY = pieY + 30;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(80, 80, 80);
    doc.text(
      'IMPORTANTE: LA COMPRENSIÓN DEL SISTEMA Y EL CONTENIDO DEL EXAMEN FORMAN PARTE DEL MISMO.',
      W / 2, avisoY, { align: 'center' }
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // WORD — CUADERNILLO DE PREGUNTAS (.docx)
  // ══════════════════════════════════════════════════════════════════════
  function generarCuadernilloWord(preguntas) {
    var D = window.docx;

    var TEAL      = '0891B2';
    var TEAL_DARK = '0E7490';
    var BLANCO    = 'FFFFFF';
    var GRIS      = '3C3C3C';

    function parrafoVacio(after) {
      return new D.Paragraph({ text: '', spacing: { after: after || 0 } });
    }

    function run(texto, opts) {
      return new D.TextRun(Object.assign({ text: String(texto || '') }, opts || {}));
    }

    var parrafos = [];

    // Título
    parrafos.push(new D.Paragraph({
      children: [ run('SIMULACRO DE EXAMEN DE RESIDENCIA',
        { bold: true, size: 32, color: BLANCO }) ],
      shading: { type: D.ShadingType.SOLID, color: TEAL },
      alignment: D.AlignmentType.CENTER,
      spacing: { before: 0, after: 0 }
    }));
    parrafos.push(new D.Paragraph({
      children: [ run('Cuadernillo de Preguntas \u2014 ' + preguntas.length + ' preguntas',
        { size: 20, color: BLANCO }) ],
      shading: { type: D.ShadingType.SOLID, color: TEAL_DARK },
      alignment: D.AlignmentType.CENTER,
      spacing: { before: 0, after: 120 }
    }));

    // Instrucciones
    parrafos.push(new D.Paragraph({
      children: [ run('INSTRUCCIONES', { bold: true, size: 18, color: TEAL }) ],
      spacing: { before: 60, after: 60 }
    }));
    [
      'Tiempo disponible: 2 horas 30 minutos.',
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
      spacing: { before: 80, after: 40 }
    }));
    parrafos.push(new D.Paragraph({
      children: [ run(
        'IMPORTANTE: LA COMPRENSI\u00d3N DEL SISTEMA Y EL CONTENIDO DEL EXAMEN FORMAN PARTE DEL MISMO.',
        { size: 14, color: '666666', italics: true }
      )],
      spacing: { before: 0, after: 180 }
    }));

    // Preguntas en columna única
    preguntas.forEach(function (item) {
      // Número + enunciado
      parrafos.push(new D.Paragraph({
        children: [
          run(String(item.numero) + '\u2003', { bold: true, size: 17, color: TEAL }),
          run(item.pregunta, { bold: true, size: 17, color: '1A1A1A' })
        ],
        spacing: { before: 80, after: 60 },
        border: { top: { style: D.BorderStyle.SINGLE, size: 4, color: 'DDDDDD' } }
      }));

      // Opciones
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

    // Construir y descargar
    var documento = new D.Document({
      sections: [{
        properties: {
          page: {
            size: { width: 11906, height: 16838 },        // A4 en twips
            margin: { top: 720, bottom: 720, left: 720, right: 720 }
          }
        },
        children: parrafos
      }]
    });

    D.Packer.toBlob(documento).then(function (blob) {
      var url = URL.createObjectURL(blob);
      var a   = document.createElement('a');
      a.href     = url;
      a.download = 'simulacro_preguntas.docx';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
    }).catch(function (err) {
      console.error('Error generando Word:', err);
      alert('Error al generar el archivo Word: ' + err.message);
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // PDF 2 — GRILLA CON RESPUESTAS CORRECTAS
  // ══════════════════════════════════════════════════════════════════════
  function generarGrillaCorrectas(preguntas) {
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });

    // Construir mapa: {numPregunta: letraCorrecta}
    var correctasMap = {};
    preguntas.forEach(function (item) {
      // correctaIdxs son los índices originales de la opción correcta
      // Para el simulacro: el orden de opciones en pantalla puede estar mezclado,
      // pero en preguntasPorSeccion['simulador'] las opciones ya están en el orden
      // original → correctaIdxs[0] es el índice en item.opciones
      var idxCorrecto = Array.isArray(item.correctaIdxs) ? item.correctaIdxs[0] : 0;
      correctasMap[item.numero] = letraOpcion(idxCorrecto);
    });

    dibujarGrilla(doc, preguntas, correctasMap);
    descargarPDF(doc, 'simulacro_respuestas_correctas.pdf');
  }

  // ══════════════════════════════════════════════════════════════════════
  // PDF 3 — GRILLA EN BLANCO
  // ══════════════════════════════════════════════════════════════════════
  function generarGrillaBlanca(preguntas) {
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
    dibujarGrilla(doc, preguntas, null);
    descargarPDF(doc, 'simulacro_grilla_en_blanco.pdf');
  }

  // ══════════════════════════════════════════════════════════════════════
  // FUNCIÓN PRINCIPAL — descarga 4 archivos:
  //   1. Word  — cuadernillo de preguntas (1 columna)
  //   2. PDF   — cuadernillo de preguntas (2 columnas, para imprimir)
  //   3. PDF   — grilla con respuestas correctas
  //   4. PDF   — grilla en blanco
  // ══════════════════════════════════════════════════════════════════════
  function descargarTodo() {
    if (!esAdmin()) {
      console.warn('[Export] Acceso denegado: función exclusiva para administradores.');
      return;
    }
    var preguntas = obtenerDatosSimulacro();
    if (!preguntas) return;

    var btn = document.getElementById('btn-export-simulacro');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Generando…'; }

    function terminar() {
      if (btn) { btn.disabled = false; btn.innerHTML = '📥 Preguntas &amp; Grillas'; }
    }

    // 1. Word (preguntas 1 columna)
    cargarDocx(function () {
      try { generarCuadernilloWord(preguntas); } catch (e) {
        console.error('Error Word:', e);
        alert('Error al generar el Word: ' + e.message);
      }

      // 2. PDF preguntas 2 columnas + 3. grilla correctas + 4. grilla blanca
      cargarJsPDF(function () {
        setTimeout(function () {
          try { generarCuadernillo(preguntas); } catch (e) {
            console.error('Error PDF cuadernillo:', e); }
          setTimeout(function () {
            try { generarGrillaCorrectas(preguntas); } catch (e) {
              console.error('Error PDF correctas:', e); }
            setTimeout(function () {
              try { generarGrillaBlanca(preguntas); } catch (e) {
                console.error('Error PDF blanco:', e); }
              terminar();
            }, 600);
          }, 600);
        }, 600);
      });
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // INYECTAR BOTÓN en la barra de "Terminar Simulacro"
  // ══════════════════════════════════════════════════════════════════════
  function inyectarBotonPDF() {
    if (!esAdmin()) return;
    var btnTerminar = document.getElementById('btn-terminar-simulacro');
    if (!btnTerminar) return;
    if (document.getElementById('btn-export-simulacro')) return;

    if (!document.getElementById('simulacro-pdf-styles')) {
      var st = document.createElement('style');
      st.id = 'simulacro-pdf-styles';
      st.textContent = [
        '#btn-export-simulacro {',
        '  display: inline-flex; align-items: center; gap: 7px;',
        '  background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%);',
        '  color: #fff; border: none; padding: 12px 22px; border-radius: 10px;',
        '  cursor: pointer; font-size: 0.92rem; font-weight: 600;',
        '  transition: all 0.2s ease;',
        '  box-shadow: 0 4px 12px rgba(8,145,178,0.28);',
        '  letter-spacing: 0.02em; white-space: nowrap; font-family: inherit;',
        '}',
        '#btn-export-simulacro:hover:not(:disabled) {',
        '  background: linear-gradient(135deg, #0e7490 0%, #155e75 100%);',
        '  box-shadow: 0 6px 18px rgba(8,145,178,0.40); transform: translateY(-1px);',
        '}',
        '#btn-export-simulacro:active { transform: translateY(0); }',
        '#btn-export-simulacro:disabled { opacity: 0.65; cursor: not-allowed; }'
      ].join('\n');
      document.head.appendChild(st);
    }

    var btn = document.createElement('button');
    btn.id       = 'btn-export-simulacro';
    btn.innerHTML = '📥 Preguntas &amp; Grillas';
    btn.title    = 'Descarga el cuadernillo de preguntas en Word (.docx) y las grillas en PDF';
    btn.addEventListener('click', descargarTodo);
    btnTerminar.parentNode.insertBefore(btn, btnTerminar);
  }

  // Exponer función para que se pueda llamar desde script.js al iniciar simulacro
  window.inyectarBotonPDFSimulacro = inyectarBotonPDF;

  // También intentar inyectar cuando el DOM ya está listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(inyectarBotonPDF, 500);
    });
  } else {
    setTimeout(inyectarBotonPDF, 500);
  }

  // Observer para detectar cuando el simulacro se vuelve visible (por si carga tarde)
  var _pdfObserver = new MutationObserver(function () {
    if (document.getElementById('btn-terminar-simulacro') &&
        !document.getElementById('btn-export-simulacro')) {
      inyectarBotonPDF();
    }
  });
  _pdfObserver.observe(document.body, { childList: true, subtree: false });

})();
