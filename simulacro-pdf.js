// simulacro-pdf.js v4
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
    var marginTop    = 36;
    var marginBottom = 36;
    var contentW     = W - marginLeft - marginRight;

    // Colores
    var COLOR_TEAL      = [8, 145, 178];
    var COLOR_TEAL_TEXT = [255, 255, 255];
    var COLOR_NUM_BG    = [8, 145, 178];
    var COLOR_GRIS      = [120, 120, 120];

    // Columnas: 2 columnas por página
    var COL_COUNT = 2;
    var COL_GAP   = 12;
    var colW      = (contentW - COL_GAP) / 2;

    // Fuentes
    var FSnum      = 7;
    var FSpregunta = 8.5;
    var FSopcion   = 8;
    var lineH      = 11.5;
    var indentOpc  = 10;   // indent de opciones respecto al margen de columna

    // Estado de columna actual
    var currentPage = 1;
    var currentCol  = 0;   // 0 = izquierda, 1 = derecha
    var y           = marginTop;
    var headerDrawn = false;
    var colStartY   = marginTop; // y de inicio compartido por ambas columnas en la página actual

    function colX(col) {
      return marginLeft + col * (colW + COL_GAP);
    }

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

    // Avanzar a la columna o página siguiente
    function avanzarColumna() {
      if (currentCol === 0) {
        // Pasar a columna derecha de la MISMA página:
        // colStartY ya fue fijado cuando empezó esta página, no lo modificamos
        currentCol = 1;
        y = colStartY;
      } else {
        // Nueva página, columna izquierda
        doc.addPage();
        currentPage++;
        currentCol = 0;
        headerDrawn = false;
        dibujarBandaPagina();  // pone y = 28
        colStartY = y;         // fijar inicio de columnas para esta nueva página
      }
    }

    function dibujarBandaPagina() {
      if (headerDrawn) return;
      // Franja superior delgada
      doc.setFillColor(COLOR_TEAL[0], COLOR_TEAL[1], COLOR_TEAL[2]);
      doc.rect(0, 0, W, 22, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(COLOR_TEAL_TEXT[0], COLOR_TEAL_TEXT[1], COLOR_TEAL_TEXT[2]);
      doc.text('SIMULACRO EXAMEN DE RESIDENCIA — Cuadernillo de Preguntas', W / 2, 15, { align: 'center' });
      y = Math.max(y, 28);
      headerDrawn = true;
    }

    // ── Página 1: Encabezado + Instrucciones (ancho completo) ──
    // Franja teal grande de título
    var titleH = 52;
    doc.setFillColor(COLOR_TEAL[0], COLOR_TEAL[1], COLOR_TEAL[2]);
    doc.rect(0, 0, W, titleH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('SIMULACRO DE EXAMEN DE RESIDENCIA', W / 2, 22, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Cuadernillo de Preguntas — ' + preguntas.length + ' preguntas', W / 2, 40, { align: 'center' });

    // Bloque de instrucciones (ancho completo, debajo del título)
    var instruccionesY = titleH + 6;
    doc.setFillColor(240, 249, 255);
    var instruccionesH = 62;
    doc.roundedRect(marginLeft, instruccionesY, contentW, instruccionesH, 5, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(10, 61, 100);
    doc.text('INSTRUCCIONES', marginLeft + 10, instruccionesY + 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    var instrucciones = [
      '• Tiempo disponible: 2 horas 30 minutos.',
      '• Cada pregunta tiene una sola respuesta correcta (a, b, c o d).',
      '• Usá la grilla de respuestas en blanco para registrar tus respuestas.',
      '• Al terminar, comparalas con la grilla de respuestas correctas.'
    ];
    instrucciones.forEach(function (linea, li) {
      doc.text(linea, marginLeft + 10, instruccionesY + 26 + li * 10);
    });

    // Pie de instrucciones
    var pieInstrY = instruccionesY + instruccionesH + 7;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    doc.text('USE SOLAMENTE TINTA NEGRA', marginLeft, pieInstrY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('IMPORTANTE: LA COMPRENSIÓN DEL SISTEMA Y EL CONTENIDO DEL EXAMEN FORMAN PARTE DEL MISMO.', marginLeft, pieInstrY + 10);

    // Las preguntas arrancan inmediatamente debajo, en 2 columnas
    y = pieInstrY + 18;
    colStartY = y;         // la columna derecha también empieza aquí en pág 1
    headerDrawn = true;   // la pág 1 ya tiene su propio header

    // ── Renderizar preguntas en 2 columnas ──
    preguntas.forEach(function (item) {
      var numStr = String(item.numero);
      var circR  = numStr.length <= 2 ? 6.5 : 8;

      // Posición x de inicio del texto del enunciado
      var xPreg    = colX(currentCol) + circR * 2 + 4;
      var pregWidth = colX(currentCol) + colW - xPreg - 2;

      // Calcular altura necesaria para este bloque
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(FSpregunta);
      var lineasPreg = doc.splitTextToSize(item.pregunta, pregWidth);

      var alturaCirc = circR * 2 + 4;
      var alturaPreg = lineasPreg.length * lineH;
      var alturaBloque = Math.max(alturaCirc, alturaPreg) + 2;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(FSopcion);
      item.opciones.forEach(function (opc, oi) {
        var ln = doc.splitTextToSize(letraOpcion(oi) + ') ' + opc, colW - indentOpc - circR * 2 - 4);
        alturaBloque += ln.length * lineH + 1;
      });
      alturaBloque += 8; // separador inferior

      // ¿Cabe en la columna actual?
      if (y + alturaBloque > H - marginBottom) {
        avanzarColumna();
        // Recalcular x con la nueva columna
        xPreg    = colX(currentCol) + circR * 2 + 4;
        pregWidth = colX(currentCol) + colW - xPreg - 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(FSpregunta);
        lineasPreg = doc.splitTextToSize(item.pregunta, pregWidth);
      }

      var cx = colX(currentCol);

      // Círculo con número
      var circCX = cx + circR;
      var circCY = y + circR + 1;
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
      var yPregStart = y + lineH;
      xPreg = cx + circR * 2 + 4;
      pregWidth = cx + colW - xPreg - 2;
      doc.setFont('helvetica', 'bold');
      lineasPreg = doc.splitTextToSize(item.pregunta, pregWidth);
      lineasPreg.forEach(function (linea, li) {
        doc.text(linea, xPreg, yPregStart + li * lineH);
      });

      y += Math.max(alturaCirc, lineasPreg.length * lineH) + 1;

      // Opciones
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(FSopcion);
      doc.setTextColor(50, 50, 50);
      item.opciones.forEach(function (opc, oi) {
        var letra = letraOpcion(oi);
        var texto = letra + ') ' + opc;
        var lns = doc.splitTextToSize(texto, colW - indentOpc - circR * 2 - 4);
        lns.forEach(function (linea, li) {
          doc.text(linea, cx + indentOpc + circR * 2, y + li * lineH + lineH);
        });
        y += lns.length * lineH + 1;
      });

      // Línea separadora
      y += 3;
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(cx, y, cx + colW, y);
      y += 5;
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
  // FUNCIÓN PRINCIPAL — descarga los 3 PDFs
  // ══════════════════════════════════════════════════════════════════════
  function descargarTodosPDFs() {
    if (!esAdmin()) {
      console.warn('[PDF] Acceso denegado: función exclusiva para administradores.');
      return;
    }
    var preguntas = obtenerDatosSimulacro();
    if (!preguntas) return;

    var btn = document.getElementById('btn-pdf-simulacro');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Generando…';
    }

    cargarJsPDF(function () {
      try {
        // Pequeño delay entre descargas para evitar que el browser bloquee
        generarCuadernillo(preguntas);
        setTimeout(function () {
          generarGrillaCorrectas(preguntas);
          setTimeout(function () {
            generarGrillaBlanca(preguntas);
            if (btn) {
              btn.disabled = false;
              btn.innerHTML = '📥 PDF';
            }
          }, 600);
        }, 600);
      } catch (err) {
        console.error('Error generando PDFs:', err);
        alert('Ocurrió un error al generar los PDFs: ' + err.message);
        if (btn) { btn.disabled = false; btn.innerHTML = '📥 PDF'; }
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // INYECTAR BOTÓN en la barra de "Terminar Simulacro"
  // ══════════════════════════════════════════════════════════════════════
  function inyectarBotonPDF() {
    // Solo para admin — no mostrar a usuarios normales
    if (!esAdmin()) return;
    // El botón se inyecta dentro del mismo div flex que #btn-terminar-simulacro
    var btnTerminar = document.getElementById('btn-terminar-simulacro');
    if (!btnTerminar) return;
    if (document.getElementById('btn-pdf-simulacro')) return; // ya existe

    // Insertar estilos del botón
    if (!document.getElementById('simulacro-pdf-styles')) {
      var st = document.createElement('style');
      st.id = 'simulacro-pdf-styles';
      st.textContent = [
        '#btn-pdf-simulacro {',
        '  display: inline-flex;',
        '  align-items: center;',
        '  gap: 7px;',
        '  background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%);',
        '  color: #fff;',
        '  border: none;',
        '  padding: 12px 22px;',
        '  border-radius: 10px;',
        '  cursor: pointer;',
        '  font-size: 0.92rem;',
        '  font-weight: 600;',
        '  transition: all 0.2s ease;',
        '  box-shadow: 0 4px 12px rgba(8,145,178,0.28);',
        '  letter-spacing: 0.02em;',
        '  white-space: nowrap;',
        '  font-family: inherit;',
        '}',
        '#btn-pdf-simulacro:hover:not(:disabled) {',
        '  background: linear-gradient(135deg, #0e7490 0%, #155e75 100%);',
        '  box-shadow: 0 6px 18px rgba(8,145,178,0.40);',
        '  transform: translateY(-1px);',
        '}',
        '#btn-pdf-simulacro:active { transform: translateY(0); }',
        '#btn-pdf-simulacro:disabled { opacity: 0.65; cursor: not-allowed; }'
      ].join('\n');
      document.head.appendChild(st);
    }

    // Crear botón
    var btn = document.createElement('button');
    btn.id = 'btn-pdf-simulacro';
    btn.innerHTML = '📥 PDF';
    btn.title = 'Descargar: cuadernillo de preguntas, grilla con respuestas correctas y grilla en blanco';
    btn.addEventListener('click', descargarTodosPDFs);

    // Insertarlo al lado de #btn-terminar-simulacro (dentro del mismo flex container)
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
        !document.getElementById('btn-pdf-simulacro')) {
      inyectarBotonPDF();
    }
  });
  _pdfObserver.observe(document.body, { childList: true, subtree: false });

})();
