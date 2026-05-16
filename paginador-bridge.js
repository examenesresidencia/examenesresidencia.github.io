// paginador-bridge.js — V2
// ────────────────────────────────────────────────────────────────
// Expone las dos funciones que paginador-cuestionario.js necesita
// y que script.js no define:
//
//   window._getDisplayOrder(seccionId, total)      → Array de índices
//   window._renderIndicesToCont(seccionId, indices, posOffset)
//
// INSTRUCCIONES DE USO EN index.html
// ───────────────────────────────────
// Agregá este <script> ENTRE script.js y paginador-cuestionario.js:
//
//   <script src="script.js?v=16"></script>
//   <script src="paginador-bridge.js?v=2"></script>   ← acá
//   <script src="paginador-cuestionario.js?v=1"></script>
// ────────────────────────────────────────────────────────────────

(function () {
  'use strict';

  var STORAGE_KEY_LOCAL = 'quiz_state_v3'; // mismo que script.js

  // Secciones con orden fijo (sin aleatorización, sin mover respondidas)
  var SECCIONES_FIJAS = new Set([
    'simulador',
    'unico2016','unico2017','unico2018','unico2019','unico2020',
    'unico2021','unico2022','unico2023','unico2024','unico2025',
    'unico2025t1','unico2025t2',
    'uba2016','uba2017','uba2018','uba2019',
    'compilado1','compilado2','compilado3','compilado4','compilado5',
    'compilado6','compilado7','compilado8','compilado9','compilado10'
  ]);

  function _loadState() {
    try {
      return JSON.parse(localStorage.getItem(
        (window.STORAGE_KEY || STORAGE_KEY_LOCAL)
      ) || '{}');
    } catch (_) { return {}; }
  }

  function _esAdmin() {
    return typeof window.fbIsAdmin === 'function' && window.fbIsAdmin();
  }

  // ── _getDisplayOrder ─────────────────────────────────────────────
  window._getDisplayOrder = function (seccionId, total) {
    if (_esAdmin() || SECCIONES_FIJAS.has(seccionId)) {
      var seq = [];
      for (var i = 0; i < total; i++) seq.push(i);
      return seq;
    }

    var state = _loadState();
    var s = state[seccionId];

    if (!s) {
      var plain = [];
      for (var j = 0; j < total; j++) plain.push(j);
      return plain;
    }

    var graded          = s.graded          || {};
    var answeredOrder   = s.answeredOrder   || [];
    var unansweredOrder = s.unansweredOrder || [];

    var answered = [];
    var answeredSet = new Set();
    answeredOrder.forEach(function (e) {
      var idx = (typeof e === 'number') ? e : (e && typeof e.idx === 'number' ? e.idx : -1);
      if (idx >= 0 && idx < total && !answeredSet.has(idx)) {
        answered.push(idx);
        answeredSet.add(idx);
      }
    });

    var unansweredSet = new Set();
    var unanswered = [];
    unansweredOrder.forEach(function (idx) {
      if (typeof idx !== 'number' || isNaN(idx)) return;
      if (idx >= total) return;
      if (answeredSet.has(idx) || graded[idx]) return;
      if (!unansweredSet.has(idx)) {
        unanswered.push(idx);
        unansweredSet.add(idx);
      }
    });

    for (var k = 0; k < total; k++) {
      if (!answeredSet.has(k) && !unansweredSet.has(k) && !graded[k]) {
        unanswered.push(k);
        unansweredSet.add(k);
      }
    }

    return answered.concat(unanswered);
  };

  // ── _renderIndicesToCont ─────────────────────────────────────────
  window._renderIndicesToCont = function (seccionId, indices, posOffset) {
    if (!Array.isArray(indices) || indices.length === 0) return;
    posOffset = (typeof posOffset === 'number') ? posOffset : 0;

    var preguntas = (window.preguntasPorSeccion || {})[seccionId];
    if (!preguntas || preguntas.length === 0) return;

    var SK = window.STORAGE_KEY || STORAGE_KEY_LOCAL;
    var stateAll = _loadState();
    var sReal = stateAll[seccionId]
      ? JSON.parse(JSON.stringify(stateAll[seccionId]))
      : null;

    var graded     = (sReal && sReal.graded)     || {};
    var shuffleMap = (sReal && sReal.shuffleMap)  || {};
    var answers    = (sReal && sReal.answers)     || {};
    var explShown  = (sReal && sReal.explanationShown) || {};

    var respondidas = indices.filter(function (i) { return !!graded[i]; });
    var sinResp     = indices.filter(function (i) { return !graded[i]; });

    var tempState = {
      shuffleFrozen   : true,
      shuffleMap      : shuffleMap,
      answeredOrder   : respondidas.map(function (i) {
        var p = preguntas[i];
        return {
          idx  : i,
          docId: (p && p._firestoreDocId) || null,
          texto: (p && p.pregunta
            ? p.pregunta.trim().replace(/^\d+[\.\-\)]\s*/, '').replace(/\s+/g, ' ').toLowerCase()
            : '')
        };
      }),
      unansweredOrder : sinResp.slice(),
      answers         : answers,
      graded          : graded,
      totalShown      : false,
      explanationShown: explShown
    };

    stateAll[seccionId] = tempState;
    try { localStorage.setItem(SK, JSON.stringify(stateAll)); } catch (_) {}

    if (!window.puntajesPorSeccion) window.puntajesPorSeccion = {};
    if (!window.puntajesPorSeccion[seccionId]) {
      window.puntajesPorSeccion[seccionId] = new Array(preguntas.length).fill(null);
    }

    if (typeof window.generarCuestionario === 'function') {
      window.generarCuestionario(seccionId);
    }

    // Restaurar estado real
    if (sReal) {
      stateAll[seccionId] = sReal;
    } else {
      delete stateAll[seccionId];
    }
    try { localStorage.setItem(SK, JSON.stringify(stateAll)); } catch (_) {}

    // Ajustar numeración visual (posOffset > 0 solo en págs 2+)
    if (posOffset > 0) {
      requestAnimationFrame(function () {
        var cont = document.getElementById('cuestionario-' + seccionId);
        if (!cont) return;
        cont.querySelectorAll('.pregunta').forEach(function (div, localPos) {
          var h3 = div.querySelector('h3');
          if (!h3) return;
          var newNum = posOffset + localPos + 1;
          h3.textContent = h3.textContent.replace(/^\d+\.?\s*/, newNum + '. ');
        });
      });
    }
  };

  console.log('[PAGINADOR-BRIDGE V2] ✓ _getDisplayOrder y _renderIndicesToCont expuestos');

})();
