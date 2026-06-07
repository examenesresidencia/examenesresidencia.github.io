// simulacro-pdf.js v3
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

    var marginLeft   = 45;
    var marginRight  = 45;
    var marginTop    = 50;
    var marginBottom = 50;
    var contentW     = W - marginLeft - marginRight;

    // Colores
    var COLOR_TITULO    = [10, 61, 100];    // azul oscuro
    var COLOR_HEADER_BG = [8, 145, 178];    // teal
    var COLOR_HEADER_FG = [255, 255, 255];
    var COLOR_NUM_BG    = [8, 145, 178];
    var COLOR_GRIS      = [120, 120, 120];
    var COLOR_LINEA     = [220, 220, 220];

    var y = marginTop;

    function nuevaPagina() {
      doc.addPage();
      y = marginTop;
      dibujarEncabezadoPagina();
    }

    function dibujarEncabezadoPagina() {
      // Franja superior
      doc.setFillColor(COLOR_HEADER_BG[0], COLOR_HEADER_BG[1], COLOR_HEADER_BG[2]);
      doc.rect(0, 0, W, 32, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(COLOR_HEADER_FG[0], COLOR_HEADER_FG[1], COLOR_HEADER_FG[2]);
      doc.text('SIMULACRO EXAMEN DE RESIDENCIA — Cuadernillo de Preguntas', W / 2, 21, { align: 'center' });
      y = Math.max(y, 42);
    }

    function numerarPaginas() {
      var totalPages = doc.internal.getNumberOfPages();
      for (var i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(COLOR_GRIS[0], COLOR_GRIS[1], COLOR_GRIS[2]);
        doc.text('Página ' + i + ' de ' + totalPages, W / 2, H - 18, { align: 'center' });
      }
    }

    // ── Portada ──
    doc.setFillColor(COLOR_HEADER_BG[0], COLOR_HEADER_BG[1], COLOR_HEADER_BG[2]);
    doc.rect(0, 0, W, 200, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('SIMULACRO', W / 2, 80, { align: 'center' });
    doc.text('EXAMEN DE RESIDENCIA', W / 2, 110, { align: 'center' });
    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    doc.text('Cuadernillo de Preguntas — ' + preguntas.length + ' preguntas', W / 2, 140, { align: 'center' });

    doc.setFillColor(240, 249, 255);
    doc.roundedRect(marginLeft, 220, contentW, 80, 8, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(COLOR_TITULO[0], COLOR_TITULO[1], COLOR_TITULO[2]);
    doc.text('INSTRUCCIONES', marginLeft + 16, 244);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    var instrucciones = [
      '• Tiempo disponible: 2 horas 30 minutos.',
      '• Cada pregunta tiene una sola respuesta correcta (a, b, c o d).',
      '• Usá la grilla de respuestas en blanco para registrar tus respuestas.',
      '• Al terminar, comparalas con la grilla de respuestas correctas.'
    ];
    instrucciones.forEach(function (linea, li) {
      doc.text(linea, marginLeft + 16, 260 + li * 13);
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(COLOR_GRIS[0], COLOR_GRIS[1], COLOR_GRIS[2]);
    doc.text('USE SOLAMENTE TINTA NEGRA', W / 2, 330, { align: 'center' });
    doc.text('IMPORTANTE: LA COMPRENSIÓN DEL SISTEMA Y EL CONTENIDO DEL EXAMEN FORMAN PARTE DEL MISMO.', W / 2, 345, { align: 'center' });

    // ── Páginas de preguntas ──
    doc.addPage();
    y = marginTop;
    dibujarEncabezadoPagina();

    preguntas.forEach(function (item) {
      var FSnum     = 7.5;
      var FSpregunta= 9;
      var FSopcion  = 8.5;
      var lineH     = 12;
      var indentOpc = 26;

      // Radio del círculo adaptado a cantidad de dígitos
      var numStr = String(item.numero);
      var circR = numStr.length <= 1 ? 7 : numStr.length === 2 ? 8 : 10;

      // Ancho disponible para el enunciado (deja espacio al círculo + margen)
      var xPreg    = marginLeft + circR * 2 + 5;
      var pregWidth = W - marginRight - xPreg - 2;

      // Estimar altura necesaria
      var lineasPreg = splitTexto(doc, item.pregunta, pregWidth);
      var alturaCirc = circR * 2 + 4;
      var alturaPreg = lineasPreg.length * lineH;
      var alturaBloque = Math.max(alturaCirc, alturaPreg) + 4;
      item.opciones.forEach(function (opc) {
        var lns = splitTexto(doc, letraOpcion(item.opciones.indexOf(opc)) + ') ' + opc, contentW - indentOpc - 4);
        alturaBloque += lns.length * lineH + 1;
      });
      alturaBloque += 12; // padding inferior

      // Nueva página si no cabe
      if (y + alturaBloque > H - marginBottom) {
        nuevaPagina();
      }

      // Círculo con número de pregunta
      var circCX = marginLeft + circR;
      var circCY = y + circR + 2;
      doc.setFillColor(COLOR_NUM_BG[0], COLOR_NUM_BG[1], COLOR_NUM_BG[2]);
      doc.circle(circCX, circCY, circR, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(FSnum);
      doc.setTextColor(255, 255, 255);
      doc.text(numStr, circCX, circCY + FSnum * 0.35, { align: 'center' });

      // Enunciado de la pregunta (alineado al top del círculo)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(FSpregunta);
      doc.setTextColor(30, 30, 30);
      var yPregStart = y + lineH;
      lineasPreg.forEach(function (linea, li) {
        doc.text(linea, xPreg, yPregStart + li * lineH);
      });

      y += Math.max(alturaCirc, lineasPreg.length * lineH) + 2;

      // Opciones
      item.opciones.forEach(function (opc, oi) {
        var letra = letraOpcion(oi);
        var textoCompleto = letra + ') ' + opc;
        var lns = splitTexto(doc, textoCompleto, contentW - indentOpc - 4);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(FSopcion);
        doc.setTextColor(50, 50, 50);

        lns.forEach(function (linea, li) {
          doc.text(linea, marginLeft + indentOpc, y + li * lineH + lineH);
        });
        y += lns.length * lineH + 1;
      });

      // Línea separadora
      y += 4;
      doc.setDrawColor(COLOR_LINEA[0], COLOR_LINEA[1], COLOR_LINEA[2]);
      doc.setLineWidth(0.4);
      doc.line(marginLeft, y, W - marginRight, y);
      y += 7;
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
    var marginTop    = 30;
    var marginLeft   = 23;
    var marginRight  = 23;
    var totalW       = W - marginLeft - marginRight;

    var NUM_COLS   = 5;    // columnas de la grilla
    var NUM_ROWS   = 20;   // filas por columna
    var OPCIONES   = 4;    // a,b,c,d

    // Encabezado
    var headerH = 26;

    // Área de grilla (cuadros de preguntas)
    var gridTop    = marginTop + headerH + 8;
    var gridBottom = H - 90;
    var gridH      = gridBottom - gridTop;

    var colW   = totalW / NUM_COLS;       // ancho de cada columna de la grilla
    var rowH   = gridH / NUM_ROWS;        // altura de cada fila

    // Medidas de burbuja
    var bubR     = Math.min(rowH * 0.28, 5.8);  // radio burbuja
    var numW     = 18;   // ancho zona número
    var bubArea  = colW - numW;
    var bubSep   = bubArea / OPCIONES;

    var COLOR_TEAL    = [8, 145, 178];
    var COLOR_GRIS_BG = [229, 229, 229];  // gris claro para filas alternas
    var COLOR_NEGRO   = [0, 0, 0];
    var COLOR_BLANCO  = [255, 255, 255];
    var COLOR_CORREC  = [0, 0, 0];         // relleno de burbuja correcta

    // ── Título ──
    doc.setFillColor(COLOR_TEAL[0], COLOR_TEAL[1], COLOR_TEAL[2]);
    doc.rect(0, 0, W, headerH + marginTop, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('SIMULACRO DE EXAMEN', W / 2, marginTop + 10, { align: 'center' });
    if (correctasMap) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('GRILLA DE RESPUESTAS CORRECTAS', W / 2, marginTop + 22, { align: 'center' });
    } else {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('GRILLA — Marcá tus respuestas con tinta negra', W / 2, marginTop + 22, { align: 'center' });
    }

    // ── Cabecera de columnas (a b c d) ──
    var cabeceraH = 13;
    var cabeceraY = gridTop - cabeceraH - 2;
    for (var col = 0; col < NUM_COLS; col++) {
      var colX = marginLeft + col * colW;
      // fondo gris de la cabecera de letras
      doc.setFillColor(235, 235, 235);
      doc.rect(colX + numW, cabeceraY, colW - numW, cabeceraH, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(80, 80, 80);
      // Centrar verticalmente: baseline = cabeceraY + cabeceraH/2 + fontSize*0.35
      var cabeceraTextY = cabeceraY + cabeceraH / 2 + 6.5 * 0.35;
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
    doc.rect(marginLeft, gridTop - cabeceraH - 2, totalW, gridBottom - gridTop + cabeceraH + 2);

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
