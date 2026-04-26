//V4 <-- SIN EXTRAPOLACIÓN - RECONOCIMIENTO DE DUPLICADOS POR SECCIÓN Y GLOBAL
// ════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  // ── Constantes ────────────────────────────────────────────────
  const CACHE_KEY_PREFIX = 'fb_q_cache_';
  const UPLOAD_LOG_KEY   = 'fb_upload_log';

  const TODAS_LAS_SECCIONES = [
    // ── Especialidades (A-Z) ──────────────────────────────────────
    { id: 'cardiologia',    label: 'Cardiología',       grupo: 'Especialidades' },
    { id: 'cirugia',        label: 'Cirugía',           grupo: 'Especialidades' },
    { id: 'clinicamedica',  label: 'Clínica Médica',    grupo: 'Especialidades' },
    { id: 'dermatologia',   label: 'Dermatología',      grupo: 'Especialidades' },
    { id: 'digestivo',      label: 'Digestivo',         grupo: 'Especialidades' },
    { id: 'endocrinologia', label: 'Endocrinología',    grupo: 'Especialidades' },
    { id: 'ginecologia',    label: 'Ginecología',       grupo: 'Especialidades' },
    { id: 'hematologia',    label: 'Hematología',       grupo: 'Especialidades' },
    { id: 'infectologia',   label: 'Infectología',      grupo: 'Especialidades' },
    { id: 'medicinalegal',  label: 'Medicina Legal',    grupo: 'Especialidades' },
    { id: 'medicinafamiliar', label: 'Medicina Familiar', grupo: 'Especialidades' },
    { id: 'nefrologia',     label: 'Nefrología',        grupo: 'Especialidades' },
    { id: 'neurologia',     label: 'Neurología',        grupo: 'Especialidades' },
    { id: 'neumonologia',   label: 'Neumonología',      grupo: 'Especialidades' },
    { id: 'obstetricia',    label: 'Obstetricia',       grupo: 'Especialidades' },
    { id: 'of',             label: 'Oftalmología',      grupo: 'Especialidades' },
    { id: 'orl',            label: 'ORL',               grupo: 'Especialidades' },
    { id: 'pediatria',      label: 'Pediatría',         grupo: 'Especialidades' },
    { id: 'psiquiatria',    label: 'Psiquiatría',       grupo: 'Especialidades' },
    { id: 'reumatologia',   label: 'Reumatología',      grupo: 'Especialidades' },
    { id: 'saludpublica',   label: 'Salud Pública',     grupo: 'Especialidades' },
    { id: 'toxicologia',    label: 'Toxicología',       grupo: 'Especialidades' },
    { id: 'traumatologia',  label: 'Traumatología',     grupo: 'Especialidades' },
    { id: 'urologia',       label: 'Urología',          grupo: 'Especialidades' },
    // ── Exámenes Único ────────────────────────────────────────────
    { id: 'unico2016',      label: 'Único 2016',        grupo: 'Exámenes Único' },
    { id: 'unico2017',      label: 'Único 2017',        grupo: 'Exámenes Único' },
    { id: 'unico2018',      label: 'Único 2018',        grupo: 'Exámenes Único' },
    { id: 'unico2019',      label: 'Único 2019',        grupo: 'Exámenes Único' },
    { id: 'unico2020',      label: 'Único 2020',        grupo: 'Exámenes Único' },
    { id: 'unico2021',      label: 'Único 2021',        grupo: 'Exámenes Único' },
    { id: 'unico2022',      label: 'Único 2022',        grupo: 'Exámenes Único' },
    { id: 'unico2023',      label: 'Único 2023',        grupo: 'Exámenes Único' },
    { id: 'unico2024',      label: 'Único 2024',        grupo: 'Exámenes Único' },
    { id: 'unico2025',      label: 'Único 2025',        grupo: 'Exámenes Único' },
    // ── Exámenes UBA ──────────────────────────────────────────────
    { id: 'uba2016',        label: 'UBA 2016',          grupo: 'Exámenes UBA' },
    { id: 'uba2017',        label: 'UBA 2017',          grupo: 'Exámenes UBA' },
    { id: 'uba2018',        label: 'UBA 2018',          grupo: 'Exámenes UBA' },
    { id: 'uba2019',        label: 'UBA 2019',          grupo: 'Exámenes UBA' },
    // ── Compilados ────────────────────────────────────────────────
    { id: 'compilado1',     label: 'Compilado 1',       grupo: 'Compilados' },
    { id: 'compilado2',     label: 'Compilado 2',       grupo: 'Compilados' },
    { id: 'compilado3',     label: 'Compilado 3',       grupo: 'Compilados' },
    { id: 'compilado4',     label: 'Compilado 4',       grupo: 'Compilados' },
    { id: 'compilado5',     label: 'Compilado 5',       grupo: 'Compilados' },
    { id: 'compilado6',     label: 'Compilado 6',       grupo: 'Compilados' },
    { id: 'compilado7',     label: 'Compilado 7',       grupo: 'Compilados' },
    { id: 'compilado8',     label: 'Compilado 8',       grupo: 'Compilados' },
    { id: 'compilado9',     label: 'Compilado 9',       grupo: 'Compilados' },
    { id: 'compilado10',    label: 'Compilado 10',      grupo: 'Compilados' },
  ];

  // ── Estado del módulo ─────────────────────────────────────────
  let _preguntasCargadas       = [];   // preguntas parseadas de los archivos .js
  let _seccionDestino          = '';
  let _preguntasNuevas         = [];   // sin duplicados — listas para subir
  let _preguntasDuplicadas     = [];   // (legacy — ya no se usa directamente)
  let _dupEnDestino            = [];   // repetidas exactamente en el cuestionario destino (bloqueadas)
  let _dupEnOtros              = [];   // repetidas en otros cuestionarios pero NO en destino (checklist)
  let _cacheEnunciados         = null; // Set de enunciados normalizados de TODOS los cuestionarios
  let _modoComparacion         = 'destino'; // 'destino' | 'todo'
  let _dupSeleccionadas        = new Set(); // índices de _dupEnOtros seleccionadas para subir

  // ── Normalizar enunciado ──────────────────────────────────────
  function _norm(texto) {
    if (!texto) return '';
    return texto.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  // ── Toast ─────────────────────────────────────────────────────
  function _toast(msg, tipo) {
    if (typeof window.fbToast === 'function') window.fbToast(msg, tipo);
  }

  // ════════════════════════════════════════════════════════════════
  // Inyectar estilos
  // ════════════════════════════════════════════════════════════════
  function _inyectarEstilos() {
    if (document.getElementById('sp-admin-styles')) return;
    const s = document.createElement('style');
    s.id = 'sp-admin-styles';
    s.textContent = `
      /* ── Modal overlay ── */
      #sp-modal-overlay {
        position: fixed; inset: 0; z-index: 210000;
        background: rgba(2, 6, 15, 0.94);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        display: flex; align-items: flex-start; justify-content: center;
        padding: 20px 12px 40px; overflow-y: auto; box-sizing: border-box;
        font-family: 'Segoe UI', system-ui, sans-serif;
        animation: spFadeIn 0.22s ease both;
      }
      @keyframes spFadeIn { from { opacity:0 } to { opacity:1 } }

      /* ── Contenedor principal ── */
      #sp-modal-box {
        max-width: 860px; width: 100%;
        background: rgba(8, 14, 28, 0.98);
        border: 1px solid rgba(14, 165, 233, 0.2);
        border-radius: 24px;
        box-shadow: 0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(14,165,233,0.06) inset;
        overflow: hidden;
        animation: spSlideIn 0.3s cubic-bezier(0.34, 1.2, 0.64, 1) both;
      }
      @keyframes spSlideIn {
        from { opacity:0; transform: translateY(32px) scale(0.97) }
        to   { opacity:1; transform: translateY(0) scale(1) }
      }

      /* ── Header ── */
      #sp-header {
        background: linear-gradient(135deg, rgba(2,132,199,0.18), rgba(6,182,212,0.08));
        border-bottom: 1px solid rgba(14,165,233,0.15);
        padding: 22px 28px;
        display: flex; justify-content: space-between; align-items: center;
      }
      #sp-header-left { display: flex; align-items: center; gap: 14px; }
      #sp-header-icon {
        width: 44px; height: 44px; border-radius: 12px;
        background: linear-gradient(135deg, #0284c7, #0891b2);
        display: flex; align-items: center; justify-content: center;
        font-size: 1.3rem;
        box-shadow: 0 4px 16px rgba(8,145,178,0.4);
      }
      #sp-header-title {
        color: #f0f9ff; font-size: 1.1rem; font-weight: 800;
        letter-spacing: -0.02em;
      }
      #sp-header-sub {
        color: rgba(148,163,184,0.7); font-size: 0.76rem; margin-top: 2px;
      }
      #sp-btn-close {
        background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12);
        color: #94a3b8; border-radius: 50%; width: 36px; height: 36px;
        font-size: 1rem; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.15s;
      }
      #sp-btn-close:hover { background: rgba(239,68,68,0.15); color: #f87171; border-color: rgba(239,68,68,0.3); }

      /* ── Steps indicator ── */
      #sp-steps {
        display: flex; gap: 0; border-bottom: 1px solid rgba(255,255,255,0.06);
        overflow: hidden;
      }
      .sp-step {
        flex: 1; padding: 12px 8px; text-align: center;
        font-size: 0.72rem; font-weight: 700; letter-spacing: 0.06em;
        text-transform: uppercase; color: #334155;
        border-right: 1px solid rgba(255,255,255,0.05);
        transition: all 0.25s; position: relative;
      }
      .sp-step:last-child { border-right: none; }
      .sp-step.activo {
        color: #38bdf8;
        background: rgba(14,165,233,0.07);
      }
      .sp-step.activo::after {
        content: '';
        position: absolute; bottom: 0; left: 0; right: 0;
        height: 2px; background: linear-gradient(90deg, #0284c7, #06b6d4);
      }
      .sp-step.completado { color: #34d399; }
      .sp-step-num {
        display: inline-flex; align-items: center; justify-content: center;
        width: 20px; height: 20px; border-radius: 50%;
        background: rgba(255,255,255,0.06);
        font-size: 0.68rem; margin-right: 5px;
        transition: all 0.25s;
      }
      .sp-step.activo .sp-step-num { background: #0284c7; color: #fff; }
      .sp-step.completado .sp-step-num { background: #059669; color: #fff; }

      /* ── Contenido ── */
      #sp-content { padding: 24px 28px; }

      /* ── Sección card ── */
      .sp-card {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 14px; padding: 20px; margin-bottom: 16px;
      }
      .sp-card-title {
        font-size: 0.68rem; font-weight: 700; letter-spacing: 0.1em;
        text-transform: uppercase; color: #475569;
        margin-bottom: 14px; padding-bottom: 10px;
        border-bottom: 1px solid rgba(255,255,255,0.05);
        display: flex; align-items: center; gap: 8px;
      }
      .sp-card-title span { color: #0ea5e9; }

      /* ── Zona de drop de archivos ── */
      #sp-dropzone {
        border: 2px dashed rgba(14,165,233,0.25);
        border-radius: 12px; padding: 32px 20px;
        text-align: center; cursor: pointer;
        transition: all 0.2s;
        background: rgba(14,165,233,0.03);
      }
      #sp-dropzone:hover, #sp-dropzone.drag-over {
        border-color: #0284c7;
        background: rgba(14,165,233,0.08);
      }
      #sp-dropzone-icon { font-size: 2.2rem; margin-bottom: 10px; }
      #sp-dropzone-txt { color: #64748b; font-size: 0.85rem; line-height: 1.6; }
      #sp-dropzone-txt strong { color: #94a3b8; }
      #sp-input-file { display: none; }

      /* ── Archivos cargados ── */
      #sp-archivos-lista { display: flex; flex-direction: column; gap: 6px; margin-top: 12px; }
      .sp-archivo-item {
        display: flex; align-items: center; gap: 10px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 8px; padding: 9px 12px;
      }
      .sp-archivo-icon { font-size: 1rem; flex-shrink: 0; }
      .sp-archivo-nombre { color: #e2e8f0; font-size: 0.82rem; font-weight: 500; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .sp-archivo-cnt { color: #0ea5e9; font-size: 0.75rem; font-weight: 700; flex-shrink: 0; }
      .sp-archivo-remove { background: none; border: none; color: #475569; cursor: pointer; font-size: 0.9rem; padding: 2px 4px; border-radius: 4px; transition: color 0.15s; }
      .sp-archivo-remove:hover { color: #f87171; }

      /* ── Select destino ── */
      #sp-select-destino {
        width: 100%; padding: 11px 14px;
        background: rgba(255,255,255,0.06);
        border: 1.5px solid rgba(255,255,255,0.1);
        border-radius: 10px; color: #f1f5f9; font-size: 0.88rem;
        outline: none; cursor: pointer; transition: border-color 0.2s;
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2364748b' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 14px center;
        padding-right: 36px;
      }
      #sp-select-destino:focus { border-color: #0284c7; }
      #sp-select-destino option, #sp-select-destino optgroup {
        background: #0f172a; color: #e2e8f0;
      }

      /* ── Info destino ── */
      #sp-destino-info {
        margin-top: 10px; padding: 10px 14px;
        background: rgba(14,165,233,0.07);
        border: 1px solid rgba(14,165,233,0.15);
        border-radius: 8px; font-size: 0.8rem; color: #7dd3fc;
        display: none;
      }

      /* ── Botón analizar ── */
      #sp-btn-analizar {
        width: 100%; padding: 13px 20px; border: none; border-radius: 12px;
        background: linear-gradient(135deg, #0284c7, #0891b2);
        color: #fff; font-size: 0.92rem; font-weight: 700; cursor: pointer;
        letter-spacing: 0.03em;
        box-shadow: 0 4px 20px rgba(8,145,178,0.4);
        transition: all 0.2s; margin-top: 4px;
      }
      #sp-btn-analizar:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(8,145,178,0.5); }
      #sp-btn-analizar:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

      /* ── Botón forzar rescan ── */
      #sp-btn-rescan {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 7px 14px; border-radius: 8px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        color: #7dd3fc; font-size: 0.78rem; font-weight: 600; cursor: pointer;
        transition: all 0.15s;
      }
      #sp-btn-rescan:hover { background: rgba(14,165,233,0.1); border-color: rgba(14,165,233,0.3); }
      #sp-btn-rescan.cargando { opacity: 0.6; pointer-events: none; }

      /* ── Estado caché ── */
      #sp-cache-estado {
        font-size: 0.75rem; color: #475569; margin-top: 8px; min-height: 20px;
      }

      /* ── Panel de resultados ── */
      #sp-panel-resultados { display: none; }
      #sp-resumen-bar {
        display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px;
      }
      .sp-stat {
        flex: 1; min-width: 120px; padding: 14px 16px;
        border-radius: 12px; text-align: center;
      }
      .sp-stat.verde { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); }
      .sp-stat.roja  { background: rgba(239,68,68,0.1);  border: 1px solid rgba(239,68,68,0.2);  }
      .sp-stat.azul  { background: rgba(14,165,233,0.1); border: 1px solid rgba(14,165,233,0.2); }
      .sp-stat-num { font-size: 1.8rem; font-weight: 800; line-height: 1; margin-bottom: 4px; }
      .sp-stat.verde .sp-stat-num { color: #34d399; }
      .sp-stat.roja  .sp-stat-num { color: #f87171; }
      .sp-stat.azul  .sp-stat-num { color: #38bdf8; }
      .sp-stat-lbl { font-size: 0.72rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }

      /* ── Tabs nuevas/duplicadas ── */
      #sp-tabs { display: flex; gap: 6px; margin-bottom: 12px; }
      .sp-tab {
        padding: 7px 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);
        background: rgba(255,255,255,0.04); color: #64748b;
        font-size: 0.8rem; font-weight: 600; cursor: pointer;
        transition: all 0.15s;
      }
      .sp-tab.activo.verde { background: rgba(16,185,129,0.12); border-color: rgba(16,185,129,0.3); color: #34d399; }
      .sp-tab.activo.roja  { background: rgba(239,68,68,0.12);  border-color: rgba(239,68,68,0.3);  color: #f87171; }

      /* ── Lista de preguntas ── */
      #sp-lista-preguntas {
        max-height: 300px; overflow-y: auto;
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 10px;
      }
      #sp-lista-preguntas::-webkit-scrollbar { width: 5px; }
      #sp-lista-preguntas::-webkit-scrollbar-track { background: transparent; }
      #sp-lista-preguntas::-webkit-scrollbar-thumb { background: rgba(14,165,233,0.3); border-radius: 3px; }

      .sp-pregunta-item {
        padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.04);
        display: flex; align-items: flex-start; gap: 10px;
        transition: background 0.1s;
      }
      .sp-pregunta-item:last-child { border-bottom: none; }
      .sp-pregunta-item:hover { background: rgba(255,255,255,0.02); }
      .sp-pregunta-badge {
        flex-shrink: 0; margin-top: 2px; width: 7px; height: 7px;
        border-radius: 50%; margin-top: 5px;
      }
      .sp-pregunta-badge.verde { background: #34d399; }
      .sp-pregunta-badge.roja  { background: #f87171; }
      .sp-pregunta-num { color: #475569; font-size: 0.72rem; flex-shrink: 0; margin-top: 3px; font-family: monospace; }
      .sp-pregunta-txt { color: #cbd5e1; font-size: 0.82rem; line-height: 1.5; flex: 1; }
      .sp-pregunta-meta { color: #475569; font-size: 0.7rem; margin-top: 2px; }
      .sp-dup-origen {
        display: inline-block; padding: 1px 7px; border-radius: 20px;
        background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.25);
        color: #fca5a5; font-size: 0.68rem; font-weight: 600;
        margin-top: 4px;
      }

      /* ── Botón subir ── */
      #sp-btn-subir {
        width: 100%; padding: 15px 24px; border: none; border-radius: 14px;
        background: linear-gradient(135deg, #059669, #047857);
        color: #fff; font-size: 1rem; font-weight: 800; cursor: pointer;
        letter-spacing: 0.04em; text-transform: uppercase;
        box-shadow: 0 5px 24px rgba(5,150,105,0.45);
        transition: all 0.2s; margin-top: 16px;
        display: flex; align-items: center; justify-content: center; gap: 10px;
      }
      #sp-btn-subir:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(5,150,105,0.55); }
      #sp-btn-subir:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

      /* ── Panel de log ── */
      #sp-log-wrap { display: none; margin-top: 16px; }
      #sp-log-titulo {
        font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em;
        text-transform: uppercase; color: #475569;
        margin-bottom: 8px; display: flex; align-items: center; gap: 8px;
      }
      #sp-log-spinner {
        width: 12px; height: 12px; border: 2px solid rgba(14,165,233,0.3);
        border-top-color: #0ea5e9; border-radius: 50%;
        animation: spSpin 0.6s linear infinite; display: none;
      }
      @keyframes spSpin { to { transform: rotate(360deg); } }
      #sp-log-box {
        background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.06);
        border-radius: 10px; padding: 12px 14px;
        max-height: 220px; overflow-y: auto;
        font-family: 'Cascadia Code', 'Fira Code', monospace;
        font-size: 0.75rem; color: #475569; line-height: 1.7;
      }
      #sp-log-box::-webkit-scrollbar { width: 4px; }
      #sp-log-box::-webkit-scrollbar-thumb { background: rgba(14,165,233,0.25); border-radius: 2px; }
      .sp-log-ok   { color: #34d399; }
      .sp-log-err  { color: #f87171; }
      .sp-log-warn { color: #fbbf24; }
      .sp-log-info { color: #38bdf8; }
      .sp-log-dim  { color: #334155; }

      /* ── Barra de progreso subida ── */
      #sp-progress-wrap { margin-top: 14px; display: none; }
      #sp-progress-labels { display: flex; justify-content: space-between; font-size: 0.76rem; color: #475569; margin-bottom: 6px; }
      #sp-progress-bg { height: 6px; background: rgba(255,255,255,0.06); border-radius: 99px; overflow: hidden; }
      #sp-progress-bar { height: 100%; background: linear-gradient(90deg, #0284c7, #34d399); border-radius: 99px; width: 0%; transition: width 0.4s ease; }

      /* ── Resultado final ── */
      #sp-resultado-final {
        display: none; padding: 20px; border-radius: 14px;
        text-align: center; margin-top: 16px;
      }
      #sp-resultado-final.exito { background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.2); }
      #sp-resultado-final.error { background: rgba(239,68,68,0.08);  border: 1px solid rgba(239,68,68,0.2);  }
      #sp-resultado-icon { font-size: 2.4rem; margin-bottom: 10px; }
      #sp-resultado-msg  { color: #e2e8f0; font-size: 1rem; font-weight: 700; margin-bottom: 6px; }
      #sp-resultado-sub  { color: #64748b; font-size: 0.82rem; }

      /* ── Panel de limpiar caché ── */
      #sp-cache-panel {
        margin-top: 28px;
        border-top: 1px solid rgba(255,255,255,0.06);
        padding-top: 20px;
      }
      #sp-cache-toggle {
        display: flex; align-items: center; gap: 10px;
        background: none; border: none;
        color: #475569; font-size: 0.78rem; font-weight: 600;
        cursor: pointer; padding: 0; letter-spacing: 0.04em;
        text-transform: uppercase; transition: color 0.2s;
        width: 100%; text-align: left;
      }
      #sp-cache-toggle:hover { color: #38bdf8; }
      #sp-cache-toggle-icon {
        width: 22px; height: 22px; border-radius: 6px;
        background: rgba(14,165,233,0.12);
        border: 1px solid rgba(14,165,233,0.25);
        display: flex; align-items: center; justify-content: center;
        font-size: 0.8rem; flex-shrink: 0;
        transition: background 0.2s;
      }
      #sp-cache-toggle:hover #sp-cache-toggle-icon {
        background: rgba(14,165,233,0.22);
      }
      #sp-cache-toggle-chevron {
        margin-left: auto; font-size: 0.65rem; color: #334155;
        transition: transform 0.2s;
      }
      #sp-cache-toggle.abierto #sp-cache-toggle-chevron { transform: rotate(180deg); }

      #sp-cache-contenido {
        display: none; margin-top: 14px;
        background: rgba(14,165,233,0.04);
        border: 1px solid rgba(14,165,233,0.15);
        border-radius: 12px; padding: 18px 20px;
      }
      #sp-cache-contenido.visible { display: block; }

      #sp-cache-select-wrap { margin-bottom: 14px; }
      #sp-cache-select-label {
        font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em;
        text-transform: uppercase; color: #475569; margin-bottom: 8px;
        display: block;
      }
      #sp-cache-select {
        width: 100%; padding: 10px 14px;
        background: rgba(255,255,255,0.05);
        border: 1.5px solid rgba(14,165,233,0.2);
        border-radius: 10px; color: #f1f5f9; font-size: 0.88rem;
        outline: none; cursor: pointer; transition: border-color 0.2s;
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2364748b' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 14px center;
        padding-right: 36px;
      }
      #sp-cache-select:focus { border-color: #38bdf8; }
      #sp-cache-select option, #sp-cache-select optgroup { background: #0f172a; color: #e2e8f0; }

      #sp-cache-info {
        font-size: 0.78rem; color: #475569; margin-bottom: 14px;
        min-height: 18px; transition: color 0.2s; line-height: 1.6;
        padding: 8px 12px; border-radius: 8px;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.06);
        display: none;
      }
      #sp-cache-info.visible { display: block; }
      #sp-cache-info.ok { color: #34d399; border-color: rgba(52,211,153,0.2); background: rgba(52,211,153,0.05); }
      #sp-cache-info.warn { color: #fbbf24; border-color: rgba(251,191,36,0.2); background: rgba(251,191,36,0.05); }

      #sp-btn-cache-limpiar {
        width: 100%; padding: 12px 20px; border: none; border-radius: 10px;
        background: linear-gradient(135deg, #0284c7, #0891b2);
        color: #fff; font-size: 0.88rem; font-weight: 800; cursor: pointer;
        letter-spacing: 0.05em; text-transform: uppercase;
        box-shadow: 0 4px 18px rgba(8,145,178,0.35);
        transition: all 0.2s;
        display: flex; align-items: center; justify-content: center; gap: 8px;
      }
      #sp-btn-cache-limpiar:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 6px 24px rgba(8,145,178,0.48);
      }
      #sp-btn-cache-limpiar:disabled { opacity: 0.35; cursor: not-allowed; transform: none; }

      /* ── Panel de vaciado ── */
      #sp-vaciar-panel {
        margin-top: 28px;
        border-top: 1px solid rgba(255,255,255,0.06);
        padding-top: 20px;
      }
      #sp-vaciar-toggle {
        display: flex; align-items: center; gap: 10px;
        background: none; border: none;
        color: #475569; font-size: 0.78rem; font-weight: 600;
        cursor: pointer; padding: 0; letter-spacing: 0.04em;
        text-transform: uppercase; transition: color 0.2s;
        width: 100%; text-align: left;
      }
      #sp-vaciar-toggle:hover { color: #f87171; }
      #sp-vaciar-toggle-icon {
        width: 22px; height: 22px; border-radius: 6px;
        background: rgba(239,68,68,0.12);
        border: 1px solid rgba(239,68,68,0.25);
        display: flex; align-items: center; justify-content: center;
        font-size: 0.8rem; flex-shrink: 0;
        transition: background 0.2s;
      }
      #sp-vaciar-toggle:hover #sp-vaciar-toggle-icon {
        background: rgba(239,68,68,0.22);
      }
      #sp-vaciar-toggle-chevron {
        margin-left: auto; font-size: 0.65rem; color: #334155;
        transition: transform 0.2s;
      }
      #sp-vaciar-toggle.abierto #sp-vaciar-toggle-chevron { transform: rotate(180deg); }

      #sp-vaciar-contenido {
        display: none; margin-top: 14px;
        background: rgba(239,68,68,0.04);
        border: 1px solid rgba(239,68,68,0.15);
        border-radius: 12px; padding: 18px 20px;
      }
      #sp-vaciar-contenido.visible { display: block; }

      #sp-vaciar-aviso {
        display: flex; gap: 12px; align-items: flex-start;
        margin-bottom: 16px;
      }
      #sp-vaciar-aviso-icon {
        font-size: 1.5rem; flex-shrink: 0; margin-top: 1px;
      }
      #sp-vaciar-aviso-txt {
        color: #94a3b8; font-size: 0.82rem; line-height: 1.65;
      }
      #sp-vaciar-aviso-txt strong { color: #fca5a5; }

      #sp-vaciar-select-wrap {
        margin-bottom: 14px;
      }
      #sp-vaciar-select-label {
        font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em;
        text-transform: uppercase; color: #475569; margin-bottom: 8px;
        display: block;
      }
      #sp-vaciar-select {
        width: 100%; padding: 10px 14px;
        background: rgba(255,255,255,0.05);
        border: 1.5px solid rgba(239,68,68,0.2);
        border-radius: 10px; color: #f1f5f9; font-size: 0.88rem;
        outline: none; cursor: pointer; transition: border-color 0.2s;
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2364748b' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 14px center;
        padding-right: 36px;
      }
      #sp-vaciar-select:focus { border-color: #f87171; }
      #sp-vaciar-select option, #sp-vaciar-select optgroup { background: #0f172a; color: #e2e8f0; }

      #sp-vaciar-confirm-wrap {
        display: none; margin-bottom: 14px;
      }
      #sp-vaciar-confirm-wrap.visible { display: block; }
      #sp-vaciar-confirm-label {
        font-size: 0.75rem; color: #fca5a5; margin-bottom: 7px; display: block;
        font-weight: 600;
      }
      #sp-vaciar-confirm-input {
        width: 100%; padding: 9px 13px; box-sizing: border-box;
        background: rgba(239,68,68,0.07);
        border: 1.5px solid rgba(239,68,68,0.25);
        border-radius: 8px; color: #f87171; font-size: 0.88rem;
        outline: none; font-family: monospace; letter-spacing: 0.05em;
        transition: border-color 0.2s;
      }
      #sp-vaciar-confirm-input:focus { border-color: #f87171; }
      #sp-vaciar-confirm-input.ok { border-color: #34d399; color: #34d399; }

      #sp-vaciar-info {
        font-size: 0.75rem; color: #475569; margin-bottom: 12px;
        min-height: 18px; transition: color 0.2s;
      }
      #sp-vaciar-info.listo { color: #34d399; }
      #sp-vaciar-info.error { color: #f87171; }

      #sp-btn-vaciar {
        width: 100%; padding: 12px 20px; border: none; border-radius: 10px;
        background: linear-gradient(135deg, #dc2626, #b91c1c);
        color: #fff; font-size: 0.88rem; font-weight: 800; cursor: pointer;
        letter-spacing: 0.05em; text-transform: uppercase;
        box-shadow: 0 4px 18px rgba(220,38,38,0.35);
        transition: all 0.2s;
        display: flex; align-items: center; justify-content: center; gap: 8px;
      }
      #sp-btn-vaciar:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 6px 24px rgba(220,38,38,0.48);
      }
      #sp-btn-vaciar:disabled { opacity: 0.35; cursor: not-allowed; transform: none; }

      #sp-vaciar-log-wrap { display: none; margin-top: 14px; }
      #sp-vaciar-progress-wrap { margin-top: 10px; display: none; }
      #sp-vaciar-progress-labels {
        display: flex; justify-content: space-between;
        font-size: 0.74rem; color: #475569; margin-bottom: 5px;
      }
      #sp-vaciar-progress-bg {
        height: 5px; background: rgba(255,255,255,0.06);
        border-radius: 99px; overflow: hidden;
      }
      #sp-vaciar-progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #dc2626, #f87171);
        border-radius: 99px; width: 0%; transition: width 0.3s ease;
      }

      #sp-btn-vaciar-reset {
        width: 100%; margin-top: 10px;
        padding: 10px 20px; border-radius: 10px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.12);
        color: #94a3b8; font-size: 0.82rem; font-weight: 700; cursor: pointer;
        letter-spacing: 0.04em; text-transform: uppercase;
        transition: all 0.2s;
        display: none; align-items: center; justify-content: center; gap: 8px;
      }
      #sp-btn-vaciar-reset:hover {
        background: rgba(14,165,233,0.1);
        border-color: rgba(14,165,233,0.3);
        color: #7dd3fc;
      }

      #sp-btn-subir-reset {
        width: 100%; margin-top: 12px;
        padding: 12px 20px; border-radius: 12px;
        background: rgba(14,165,233,0.08);
        border: 1px solid rgba(14,165,233,0.25);
        color: #38bdf8; font-size: 0.88rem; font-weight: 700; cursor: pointer;
        letter-spacing: 0.04em; text-transform: uppercase;
        transition: all 0.2s;
        display: none; align-items: center; justify-content: center; gap: 10px;
      }
      #sp-btn-subir-reset:hover {
        background: rgba(14,165,233,0.15);
        border-color: rgba(14,165,233,0.45);
        transform: translateY(-1px);
      }

      /* ── Modo de comparación ── */
      #sp-modo-wrap {
        display: flex; gap: 10px; margin-bottom: 14px;
      }
      .sp-modo-btn {
        flex: 1; padding: 12px 14px; border-radius: 12px; cursor: pointer;
        border: 1.5px solid rgba(255,255,255,0.08);
        background: rgba(255,255,255,0.03);
        text-align: left; transition: all 0.2s;
        display: flex; align-items: flex-start; gap: 10px;
      }
      .sp-modo-btn:hover { background: rgba(255,255,255,0.06); }
      .sp-modo-btn.activo.destino {
        background: rgba(14,165,233,0.1);
        border-color: rgba(14,165,233,0.4);
      }
      .sp-modo-btn.activo.todo {
        background: rgba(251,191,36,0.08);
        border-color: rgba(251,191,36,0.35);
      }
      .sp-modo-radio {
        width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0; margin-top: 3px;
        border: 2px solid rgba(255,255,255,0.2);
        display: flex; align-items: center; justify-content: center;
        transition: all 0.2s;
      }
      .sp-modo-btn.activo.destino .sp-modo-radio { border-color: #0ea5e9; background: rgba(14,165,233,0.2); }
      .sp-modo-btn.activo.todo .sp-modo-radio    { border-color: #fbbf24; background: rgba(251,191,36,0.2); }
      .sp-modo-radio::after {
        content: ''; width: 7px; height: 7px; border-radius: 50%;
        background: transparent; transition: background 0.15s;
      }
      .sp-modo-btn.activo.destino .sp-modo-radio::after { background: #0ea5e9; }
      .sp-modo-btn.activo.todo    .sp-modo-radio::after { background: #fbbf24; }
      .sp-modo-label { font-size: 0.84rem; font-weight: 700; color: #94a3b8; transition: color 0.2s; }
      .sp-modo-btn.activo.destino .sp-modo-label { color: #7dd3fc; }
      .sp-modo-btn.activo.todo    .sp-modo-label { color: #fde68a; }
      .sp-modo-desc { font-size: 0.72rem; color: #475569; margin-top: 3px; line-height: 1.5; }

      /* ── Nuevas stats cards (3 columnas) ── */
      .sp-stat.amarilla { background: rgba(251,191,36,0.08); border: 1px solid rgba(251,191,36,0.2); }
      .sp-stat.amarilla .sp-stat-num { color: #fbbf24; }
      .sp-stat.gris { background: rgba(100,116,139,0.1); border: 1px solid rgba(100,116,139,0.2); }
      .sp-stat.gris .sp-stat-num { color: #94a3b8; }

      /* ── Tabs (tres columnas) ── */
      .sp-tab.activo.amarilla { background: rgba(251,191,36,0.1); border-color: rgba(251,191,36,0.3); color: #fbbf24; }
      .sp-tab.activo.gris     { background: rgba(100,116,139,0.12); border-color: rgba(100,116,139,0.3); color: #94a3b8; }

      /* ── Descripción debajo de tab activo ── */
      #sp-tab-desc {
        font-size: 0.75rem; color: #475569; margin-bottom: 10px;
        padding: 8px 12px; background: rgba(255,255,255,0.02);
        border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);
        line-height: 1.55;
      }

      /* ── Barra de seleccionar todas (duplicadas en otros) ── */
      #sp-dup-otros-controls {
        display: none; align-items: center; justify-content: space-between;
        padding: 9px 14px; background: rgba(251,191,36,0.06);
        border: 1px solid rgba(251,191,36,0.15);
        border-radius: 9px; margin-bottom: 8px;
        gap: 10px;
      }
      #sp-dup-otros-controls.visible { display: flex; }
      #sp-dup-check-all-label {
        display: flex; align-items: center; gap: 8px; cursor: pointer;
        font-size: 0.79rem; color: #fde68a; font-weight: 600;
        user-select: none;
      }
      #sp-dup-check-all { width: 15px; height: 15px; accent-color: #fbbf24; cursor: pointer; }
      #sp-dup-otros-selcnt {
        font-size: 0.73rem; color: #92400e; background: rgba(251,191,36,0.15);
        padding: 3px 9px; border-radius: 20px; font-weight: 700;
      }

      /* ── Checkbox en items de duplicadas en otros ── */
      .sp-pregunta-item.seleccionable { cursor: pointer; }
      .sp-pregunta-item.seleccionable:hover { background: rgba(251,191,36,0.04); }
      .sp-pregunta-item.seleccionada { background: rgba(251,191,36,0.06) !important; }
      .sp-item-check {
        flex-shrink: 0; width: 16px; height: 16px;
        accent-color: #fbbf24; cursor: pointer; margin-top: 3px;
      }
      .sp-dup-otros-badge {
        display: inline-block; padding: 1px 7px; border-radius: 20px;
        background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.25);
        color: #fbbf24; font-size: 0.68rem; font-weight: 700; margin-top: 4px;
      }
    `;
    document.head.appendChild(s);
  }

  // ════════════════════════════════════════════════════════════════
  // Parsear archivo .js de preguntas
  // ════════════════════════════════════════════════════════════════
  function _parsearArchivoJS(contenido, nombreArchivo) {
    // Limpiar comentarios de línea (ej: los que inserta QDuplicator).
    // Problema: QDuplicator reemplaza la coma separadora del array con el comentario,
    // dejando  }  \n  // comentario  \n  {  sin coma → JSON inválido.
    // Solución: reemplazar cada línea de comentario por una coma si el contexto lo requiere.
    const contenidoLimpio = contenido
      // Primero reemplazar líneas que son SOLO un comentario // por nada (línea vacía)
      .replace(/^[ \t]*\/\/[^\n]*$/gm, '')
      // Luego asegurarse de que entre  }  y  {  haya siempre una coma
      .replace(/\}\s*\n(\s*)\{/g, '},\n$1{');

    // Intentar varios patrones comunes
    const patrones = [
      /preguntasPorSeccion\[["']\w+["']\]\s*=\s*(\[[\s\S]*?\]);\s*$/m,
      /preguntasPorSeccion\[["']\w+["']\]\s*=\s*(\[[\s\S]*\])/,
      /=\s*(\[\s*\{[\s\S]*\}\s*\])/,
    ];
    for (const pat of patrones) {
      const m = contenidoLimpio.match(pat);
      if (m) {
        try {
          return JSON.parse(m[1]);
        } catch (e) {
          // Intentar eval seguro como fallback
          try {
            // eslint-disable-next-line no-new-func
            const fn = new Function(`
              const preguntasPorSeccion = {};
              ${contenidoLimpio}
              const keys = Object.keys(preguntasPorSeccion);
              return keys.length > 0 ? preguntasPorSeccion[keys[0]] : null;
            `);
            const result = fn();
            if (result) return result;
          } catch (_) {}
        }
      }
    }
    // Fallback: intentar eval del archivo completo (limpio)
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function(`
        const preguntasPorSeccion = {};
        ${contenidoLimpio}
        const keys = Object.keys(preguntasPorSeccion);
        return keys.length > 0 ? preguntasPorSeccion[keys[0]] : null;
      `);
      const result = fn();
      if (Array.isArray(result) && result.length > 0) return result;
    } catch (_) {}
    throw new Error(`No se pudo parsear "${nombreArchivo}". Verificá que el archivo contenga una asignación a preguntasPorSeccion.`);
  }

  // ════════════════════════════════════════════════════════════════
  // Construir Set de enunciados solo del cuestionario destino
  // ════════════════════════════════════════════════════════════════
  function _construirCacheDestino(seccionId) {
    const enunciados = new Set();
    try {
      const raw = localStorage.getItem(CACHE_KEY_PREFIX + seccionId);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached?.preguntas) {
          for (const p of cached.preguntas) {
            const n = _norm(p.pregunta);
            if (n) enunciados.add(n);
          }
        }
      }
    } catch (_) {}
    if (window.preguntasPorSeccion?.[seccionId]) {
      for (const p of window.preguntasPorSeccion[seccionId]) {
        const n = _norm(p.pregunta);
        if (n) enunciados.add(n);
      }
    }
    return enunciados;
  }

  // ════════════════════════════════════════════════════════════════
  // Construir caché de enunciados desde localStorage
  // ════════════════════════════════════════════════════════════════
  function _construirCacheEnunciados() {
    const enunciados = new Set();
    let seccionesConDatos = 0;
    let totalPreguntas = 0;

    for (const sec of TODAS_LAS_SECCIONES) {
      try {
        const raw = localStorage.getItem(CACHE_KEY_PREFIX + sec.id);
        if (!raw) continue;
        const cached = JSON.parse(raw);
        if (!cached || !cached.preguntas || !Array.isArray(cached.preguntas)) continue;
        for (const p of cached.preguntas) {
          const n = _norm(p.pregunta);
          if (n) { enunciados.add(n); totalPreguntas++; }
        }
        seccionesConDatos++;
      } catch (_) {}
    }

    // También revisar window.preguntasPorSeccion (en memoria)
    if (window.preguntasPorSeccion) {
      for (const secId of Object.keys(window.preguntasPorSeccion)) {
        const pregs = window.preguntasPorSeccion[secId];
        if (!Array.isArray(pregs)) continue;
        for (const p of pregs) {
          const n = _norm(p.pregunta);
          if (n) enunciados.add(n);
        }
      }
    }

    return { enunciados, seccionesConDatos, totalPreguntas };
  }

  // ════════════════════════════════════════════════════════════════
  // Descargar caché desde Firestore (todas las secciones)
  // ════════════════════════════════════════════════════════════════
  async function _descargarCacheFirestore(onProgress) {
    const fsModule = window.__fb || window.__firebase_firestore;
    if (!fsModule || typeof fsModule.collection !== 'function') {
      throw new Error('Firestore no disponible. Iniciá sesión primero.');
    }
    const { collection, getDocs, query, orderBy } = fsModule;
    const db = window._fbDb;
    if (!db) throw new Error('Base de datos no inicializada.');

    let totalDescargadas = 0;
    for (let i = 0; i < TODAS_LAS_SECCIONES.length; i++) {
      const sec = TODAS_LAS_SECCIONES[i];
      if (onProgress) onProgress(i + 1, TODAS_LAS_SECCIONES.length, sec.id);
      try {
        const itemsRef = collection(db, 'preguntas', sec.id, 'items');
        const q = query(itemsRef, orderBy('_idx'));
        const snap = await getDocs(q);
        if (snap.empty) continue;
        const preguntas = snap.docs.map(d => {
          const { _idx, ...p } = d.data();
          p._firestoreIdx = _idx;
          return p;
        });
        localStorage.setItem(CACHE_KEY_PREFIX + sec.id, JSON.stringify({
          ts: Date.now(), preguntas
        }));
        if (!window.preguntasPorSeccion) window.preguntasPorSeccion = {};
        window.preguntasPorSeccion[sec.id] = preguntas;
        totalDescargadas += preguntas.length;
      } catch (e) {
        console.warn('[SP] Error descargando', sec.id, e.message);
      }
    }
    return totalDescargadas;
  }

  // ════════════════════════════════════════════════════════════════
  // Abrir modal principal
  // ════════════════════════════════════════════════════════════════
  function fbAbrirSubirPreguntas() {
    if (!window.fbIsAdmin || !window.fbIsAdmin()) {
      _toast('⛔ Solo el administrador puede acceder a esta función', 'error');
      return;
    }
    _inyectarEstilos();
    document.getElementById('sp-modal-overlay')?.remove();

    // Reset estado
    _preguntasCargadas   = [];
    _seccionDestino      = '';
    _preguntasNuevas     = [];
    _preguntasDuplicadas = [];
    _dupEnDestino        = [];
    _dupEnOtros          = [];
    _dupSeleccionadas    = new Set();
    _modoComparacion     = 'destino';
    _cacheEnunciados     = null;

    const overlay = document.createElement('div');
    overlay.id = 'sp-modal-overlay';
    overlay.innerHTML = `
      <div id="sp-modal-box">

        <!-- Header -->
        <div id="sp-header">
          <div id="sp-header-left">
            <div id="sp-header-icon">📤</div>
            <div>
              <div id="sp-header-title">Subir Preguntas</div>
              <div id="sp-header-sub">Solo se suben al final del cuestionario destino · Sin afectar el progreso de usuarios</div>
            </div>
          </div>
          <button id="sp-btn-close">✕</button>
        </div>

        <!-- Steps -->
        <div id="sp-steps">
          <div class="sp-step activo" id="sp-step-1"><span class="sp-step-num">1</span>Origen</div>
          <div class="sp-step"       id="sp-step-2"><span class="sp-step-num">2</span>Destino</div>
          <div class="sp-step"       id="sp-step-3"><span class="sp-step-num">3</span>Análisis</div>
          <div class="sp-step"       id="sp-step-4"><span class="sp-step-num">4</span>Subida</div>
        </div>

        <!-- Contenido -->
        <div id="sp-content">

          <!-- ── PASO A: Origen ─────────────────────────────────── -->
          <div class="sp-card">
            <div class="sp-card-title">📂 <span>A</span> — Archivos a subir</div>
            <div id="sp-dropzone">
              <div id="sp-dropzone-icon">🗂</div>
              <div id="sp-dropzone-txt">
                <strong>Arrastrá archivos .js aquí</strong> o hacé clic para seleccionar<br>
                <span style="font-size:0.78rem;color:#334155;">Podés seleccionar múltiples archivos o una carpeta completa</span>
              </div>
            </div>
            <input type="file" id="sp-input-file" accept=".js" multiple>
            <div id="sp-archivos-lista"></div>
          </div>

          <!-- ── PASO B: Destino ────────────────────────────────── -->
          <div class="sp-card">
            <div class="sp-card-title">🎯 <span>B</span> — Cuestionario destino</div>
            <select id="sp-select-destino">
              <option value="">Seleccioná el cuestionario destino…</option>
              ${_buildSelectOptions()}
            </select>
            <div id="sp-destino-info"></div>
          </div>

          <!-- ── Cache status + modo + botón analizar ──────────── -->
          <div class="sp-card">
            <div class="sp-card-title" style="margin-bottom:12px;">🔍 <span>C</span> — Modo de comparación</div>

            <div id="sp-modo-wrap">
              <button class="sp-modo-btn activo destino" id="sp-modo-destino" type="button">
                <div class="sp-modo-radio"></div>
                <div>
                  <div class="sp-modo-label">🎯 Solo cuestionario destino</div>
                  <div class="sp-modo-desc">Marca como nueva cualquier pregunta que no esté <em>en este cuestionario</em>. Ideal para especialidades donde las mismas preguntas aparecen en varios cuestionarios a la vez.</div>
                </div>
              </button>
              <button class="sp-modo-btn todo" id="sp-modo-todo" type="button">
                <div class="sp-modo-radio"></div>
                <div>
                  <div class="sp-modo-label">🌐 Toda la base de datos</div>
                  <div class="sp-modo-desc">Marca como duplicada cualquier pregunta que ya exista en <em>cualquier cuestionario</em>. Ideal para exámenes únicos, UBA o compilados donde no querés ninguna repetición.</div>
                </div>
              </button>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
              <div id="sp-cache-estado">Verificando caché local…</div>
              <button id="sp-btn-rescan">🔄 Forzar nuevo escaneo desde Firebase</button>
            </div>
            <button id="sp-btn-analizar" disabled>🔍 Analizar preguntas</button>
            <div style="font-size:0.72rem;color:#334155;margin-top:7px;text-align:center;">Compará antes de subir · El análisis usa el caché local y no modifica nada en Firebase</div>
          </div>

          <!-- ── Panel resultados ───────────────────────────────── -->
          <div id="sp-panel-resultados">
            <div id="sp-resumen-bar">
              <div class="sp-stat azul">
                <div class="sp-stat-num" id="sp-cnt-total">0</div>
                <div class="sp-stat-lbl">Total cargadas</div>
              </div>
              <div class="sp-stat verde">
                <div class="sp-stat-num" id="sp-cnt-nuevas">0</div>
                <div class="sp-stat-lbl">✅ Nuevas</div>
              </div>
              <div class="sp-stat gris">
                <div class="sp-stat-num" id="sp-cnt-dup-destino">0</div>
                <div class="sp-stat-lbl">🔁 En este cuestionario</div>
              </div>
              <div class="sp-stat amarilla">
                <div class="sp-stat-num" id="sp-cnt-dup-otros">0</div>
                <div class="sp-stat-lbl">⚠️ En otros cuestionarios</div>
              </div>
            </div>

            <div id="sp-tabs">
              <button class="sp-tab activo verde"  id="sp-tab-nuevas">✅ Nuevas (<span id="sp-tab-cnt-nuevas">0</span>)</button>
              <button class="sp-tab gris"  id="sp-tab-dup-destino">🔁 En este cuest. (<span id="sp-tab-cnt-dup-destino">0</span>)</button>
              <button class="sp-tab amarilla" id="sp-tab-dup-otros">⚠️ En otros (<span id="sp-tab-cnt-dup-otros">0</span>)</button>
            </div>
            <div id="sp-tab-desc"></div>

            <!-- Controles para seleccionar duplicadas en otros -->
            <div id="sp-dup-otros-controls">
              <label id="sp-dup-check-all-label">
                <input type="checkbox" id="sp-dup-check-all">
                Seleccionar todas para subir
              </label>
              <span id="sp-dup-otros-selcnt">0 seleccionadas</span>
            </div>

            <div id="sp-lista-preguntas"></div>

            <!-- Botón subir -->
            <button id="sp-btn-subir" disabled>
              <span>⬆️</span>
              <span id="sp-btn-subir-txt">SUBIR AL FINAL DEL CUESTIONARIO</span>
            </button>
            <div style="font-size:0.72rem;color:#334155;margin-top:7px;text-align:center;" id="sp-btn-subir-hint">Las preguntas ✅ nuevas se suben siempre · Las ⚠️ que hayas tildado se suman al lote</div>
          </div>

          <!-- ── Log de subida ──────────────────────────────────── -->
          <div id="sp-log-wrap">
            <div id="sp-log-titulo">
              <div id="sp-log-spinner"></div>
              <span>📋 Registro de operaciones</span>
            </div>
            <div id="sp-log-box"></div>
            <div id="sp-progress-wrap">
              <div id="sp-progress-labels">
                <span id="sp-progress-txt">Preparando…</span>
                <span id="sp-progress-pct">0%</span>
              </div>
              <div id="sp-progress-bg"><div id="sp-progress-bar"></div></div>
            </div>
          </div>

          <!-- ── Resultado final ────────────────────────────────── -->
          <div id="sp-resultado-final">
            <button id="sp-btn-subir-reset">
              🔄 Subir otro cuestionario
            </button>
            <div id="sp-resultado-icon"></div>
            <div id="sp-resultado-msg"></div>
            <div id="sp-resultado-sub"></div>
          </div>

          <!-- ══════════════════════════════════════════════════════
               LIMPIAR CACHÉ — Forzar recarga de una sección
               ══════════════════════════════════════════════════════ -->
          <div id="sp-cache-panel">
            <button id="sp-cache-toggle">
              <span id="sp-cache-toggle-icon">🗑️</span>
              Limpiar caché de un cuestionario
              <span id="sp-cache-toggle-chevron">▼</span>
            </button>
            <div id="sp-cache-contenido">
              <div style="color:#94a3b8;font-size:0.82rem;line-height:1.65;margin-bottom:16px;">
                Elimina el caché local del cuestionario seleccionado. La próxima vez que
                alguien entre a ese cuestionario, se descargarán <strong style="color:#7dd3fc;">
                todas sus preguntas desde Firestore</strong> — sin tocar el resto de la base de datos.
              </div>
              <div id="sp-cache-select-wrap">
                <label id="sp-cache-select-label" for="sp-cache-select">Cuestionario a limpiar</label>
                <select id="sp-cache-select">
                  <option value="">Seleccioná el cuestionario…</option>
                  ${_buildSelectOptions()}
                </select>
              </div>
              <div id="sp-cache-info"></div>
              <button id="sp-btn-cache-limpiar" disabled>
                <span>🗑️</span>
                <span id="sp-btn-cache-limpiar-txt">LIMPIAR CACHÉ</span>
              </button>
            </div>
          </div>

          <!-- ══════════════════════════════════════════════════════
               ZONA DE PELIGRO — Vaciar cuestionario
               ══════════════════════════════════════════════════════ -->
          <div id="sp-vaciar-panel">
            <button id="sp-vaciar-toggle">
              <span id="sp-vaciar-toggle-icon">🗑</span>
              Zona de peligro — Vaciar cuestionario completo
              <span id="sp-vaciar-toggle-chevron">▼</span>
            </button>
            <div id="sp-vaciar-contenido">
              <div id="sp-vaciar-aviso">
                <span id="sp-vaciar-aviso-icon">⚠️</span>
                <div id="sp-vaciar-aviso-txt">
                  Esta acción <strong>elimina permanentemente todas las preguntas</strong> del cuestionario
                  seleccionado en Firestore. El cuestionario seguirá existiendo en la app (su lugar en el
                  menú se mantiene), pero quedará vacío hasta que se suban preguntas nuevas.<br><br>
                  El <strong>progreso de los usuarios no se ve afectado</strong>. Las preguntas de
                  especialidades extrapoladas desde este cuestionario también se eliminarán del caché.
                </div>
              </div>

              <div id="sp-vaciar-select-wrap">
                <label id="sp-vaciar-select-label" for="sp-vaciar-select">Cuestionario a vaciar</label>
                <select id="sp-vaciar-select">
                  <option value="">Seleccioná el cuestionario a vaciar…</option>
                  ${_buildSelectOptions()}
                </select>
              </div>

              <div id="sp-vaciar-confirm-wrap">
                <label id="sp-vaciar-confirm-label" for="sp-vaciar-confirm-input">
                  Escribí el ID del cuestionario para confirmar (ej: <span id="sp-vaciar-confirm-hint">compilado1</span>)
                </label>
                <input type="text" id="sp-vaciar-confirm-input"
                  placeholder="Escribí el ID para confirmar…"
                  autocomplete="off" spellcheck="false">
              </div>

              <div id="sp-vaciar-info"></div>

              <button id="sp-btn-vaciar" disabled>
                <span>🗑</span>
                <span id="sp-btn-vaciar-txt">VACIAR CUESTIONARIO</span>
              </button>

              <button id="sp-btn-vaciar-reset">
                🔄 Nueva operación de vaciado
              </button>

              <div id="sp-vaciar-log-wrap">
                <div id="sp-log-titulo" style="margin-top:14px;">
                  <div id="sp-vaciar-log-spinner" style="
                    width:12px;height:12px;border:2px solid rgba(239,68,68,0.3);
                    border-top-color:#f87171;border-radius:50%;
                    animation:spSpin 0.6s linear infinite;display:none;
                  "></div>
                  <span style="font-size:0.7rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#475569;">📋 Registro de vaciado</span>
                </div>
                <div id="sp-vaciar-log-box" style="
                  background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.06);
                  border-radius:10px;padding:12px 14px;max-height:180px;overflow-y:auto;
                  font-family:'Cascadia Code','Fira Code',monospace;
                  font-size:0.75rem;color:#475569;line-height:1.7;margin-top:8px;
                "></div>
                <div id="sp-vaciar-progress-wrap">
                  <div id="sp-vaciar-progress-labels">
                    <span id="sp-vaciar-progress-txt">Eliminando…</span>
                    <span id="sp-vaciar-progress-pct">0%</span>
                  </div>
                  <div id="sp-vaciar-progress-bg">
                    <div id="sp-vaciar-progress-bar"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>`;

    document.body.appendChild(overlay);
    document.getElementById('sp-btn-close').onclick = () => overlay.remove();

    _inicializarEventos();
    _actualizarCacheEstado();
  }

  // ── Construir options del select ──────────────────────────────
  function _buildSelectOptions() {
    const grupos = {};
    for (const s of TODAS_LAS_SECCIONES) {
      if (!grupos[s.grupo]) grupos[s.grupo] = [];
      grupos[s.grupo].push(s);
    }
    return Object.entries(grupos).map(([grupo, secs]) => {
      return `
      <optgroup label="${grupo}">
        ${secs.map(s => `<option value="${s.id}">${s.label}</option>`).join('')}
      </optgroup>
    `;
    }).join('');
  }

  // ── Actualizar estado del caché en pantalla ───────────────────
  function _actualizarCacheEstado() {
    const { enunciados, seccionesConDatos, totalPreguntas } = _construirCacheEnunciados();
    const el = document.getElementById('sp-cache-estado');
    if (!el) return;
    if (seccionesConDatos === 0) {
      el.innerHTML = `<span style="color:#f87171;">⚠️ No hay caché local — necesitás forzar un escaneo para comparar duplicados</span>`;
    } else {
      el.innerHTML = `<span style="color:#34d399;">✅ Caché disponible</span> <span style="color:#475569;">— ${seccionesConDatos} secciones · ${totalPreguntas.toLocaleString()} preguntas</span>`;
    }
    _cacheEnunciados = enunciados;
  }

  // ── Inicializar eventos ───────────────────────────────────────
  function _inicializarEventos() {
    const dropzone  = document.getElementById('sp-dropzone');
    const inputFile = document.getElementById('sp-input-file');

    // Drag & drop
    dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
    dropzone.addEventListener('drop', e => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      _procesarArchivos(Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.js')));
    });
    dropzone.addEventListener('click', () => inputFile.click());
    inputFile.addEventListener('change', e => {
      _procesarArchivos(Array.from(e.target.files));
      inputFile.value = '';
    });

    // Select destino
    document.getElementById('sp-select-destino').addEventListener('change', function () {
      _seccionDestino = this.value;
      _actualizarDestinoInfo();
      _verificarListoParaAnalizar();
    });

    // Analizar
    document.getElementById('sp-btn-analizar').addEventListener('click', _analizarPreguntas);

    // Tabs
    document.getElementById('sp-tab-nuevas').addEventListener('click',      () => _mostrarTab('nuevas'));
    document.getElementById('sp-tab-dup-destino').addEventListener('click', () => _mostrarTab('dup-destino'));
    document.getElementById('sp-tab-dup-otros').addEventListener('click',   () => _mostrarTab('dup-otros'));

    // Checkbox "seleccionar todas" en dup-otros
    document.getElementById('sp-dup-check-all').addEventListener('change', function () {
      if (this.checked) {
        _dupEnOtros.forEach((_, i) => _dupSeleccionadas.add(i));
      } else {
        _dupSeleccionadas.clear();
      }
      // Re-renderizar la tab para reflejar cambios
      _mostrarTab('dup-otros');
      _actualizarBotonSubir();
    });

    // Botones de modo de comparación
    document.getElementById('sp-modo-destino').addEventListener('click', () => {
      _modoComparacion = 'destino';
      document.getElementById('sp-modo-destino').classList.add('activo','destino');
      document.getElementById('sp-modo-todo').classList.remove('activo','todo');
    });
    document.getElementById('sp-modo-todo').addEventListener('click', () => {
      _modoComparacion = 'todo';
      document.getElementById('sp-modo-todo').classList.add('activo','todo');
      document.getElementById('sp-modo-destino').classList.remove('activo','destino');
    });

    // Subir
    document.getElementById('sp-btn-subir').addEventListener('click', _subirPreguntas);

    // Forzar rescan
    document.getElementById('sp-btn-rescan').addEventListener('click', async () => {
      const btn = document.getElementById('sp-btn-rescan');
      btn.classList.add('cargando');
      btn.textContent = '⏳ Descargando desde Firebase…';
      const logWrap = document.getElementById('sp-log-wrap');
      logWrap.style.display = 'block';
      _log('info', 'Iniciando descarga de todas las secciones desde Firebase…');
      try {
        const total = await _descargarCacheFirestore((actual, maximo, secId) => {
          _log('dim', `→ Descargando ${secId} (${actual}/${maximo})…`);
        });
        _log('ok', `✅ Descarga completa: ${total.toLocaleString()} preguntas en caché`);
        _actualizarCacheEstado();
        _toast('✅ Caché actualizado desde Firebase', 'success');
      } catch (e) {
        _log('err', '❌ Error: ' + e.message);
        _toast('❌ Error al descargar: ' + e.message, 'error');
      }
      btn.classList.remove('cargando');
      btn.innerHTML = '🔄 Forzar nuevo escaneo desde Firebase';
    });

    // ── Zona de peligro: Vaciar cuestionario ──────────────────────
    _inicializarEventosVaciar();

    // ── Limpiar caché de sección ───────────────────────────────────
    _inicializarEventosCache();
  }

  // ── Procesar archivos seleccionados ───────────────────────────
  async function _procesarArchivos(files) {
    if (!files.length) return;
    for (const file of files) {
      try {
        const contenido = await file.text();
        const preguntas = _parsearArchivoJS(contenido, file.name);
        if (!Array.isArray(preguntas) || preguntas.length === 0) {
          _toast(`⚠️ "${file.name}" no contiene preguntas válidas`, 'info');
          continue;
        }
        // Evitar cargar el mismo archivo dos veces
        const yaExiste = _preguntasCargadas.some(p => p._archivo === file.name);
        if (!yaExiste) {
          preguntas.forEach(p => p._archivo = file.name);
          _preguntasCargadas.push(...preguntas);
        }
        _renderArchivoItem(file.name, preguntas.length);
      } catch (e) {
        _toast(`❌ Error en "${file.name}": ${e.message}`, 'error');
      }
    }
    _verificarListoParaAnalizar();
    _actualizarStep(1);
  }

  // ── Renderizar ítem de archivo cargado ────────────────────────
  function _renderArchivoItem(nombre, cantidad) {
    const lista = document.getElementById('sp-archivos-lista');
    // Evitar duplicados visuales
    if (lista.querySelector(`[data-archivo="${nombre}"]`)) return;
    const item = document.createElement('div');
    item.className = 'sp-archivo-item';
    item.dataset.archivo = nombre;
    item.innerHTML = `
      <span class="sp-archivo-icon">📄</span>
      <span class="sp-archivo-nombre">${nombre}</span>
      <span class="sp-archivo-cnt">${cantidad} pregs.</span>
      <button class="sp-archivo-remove" title="Quitar archivo">✕</button>
    `;
    item.querySelector('.sp-archivo-remove').onclick = () => {
      _preguntasCargadas = _preguntasCargadas.filter(p => p._archivo !== nombre);
      item.remove();
      _verificarListoParaAnalizar();
    };
    lista.appendChild(item);
  }

  // ── Actualizar info del destino ───────────────────────────────
  function _actualizarDestinoInfo() {
    const info = document.getElementById('sp-destino-info');
    if (!_seccionDestino) { info.style.display = 'none'; return; }
    const sec = TODAS_LAS_SECCIONES.find(s => s.id === _seccionDestino);
    let cantActual = 0;
    try {
      const raw = localStorage.getItem(CACHE_KEY_PREFIX + _seccionDestino);
      if (raw) {
        const c = JSON.parse(raw);
        cantActual = c?.preguntas?.length || 0;
      }
    } catch (_) {}
    if (!cantActual && window.preguntasPorSeccion?.[_seccionDestino]) {
      cantActual = window.preguntasPorSeccion[_seccionDestino].length;
    }
    info.style.display = 'block';
    info.innerHTML = `📋 <strong>${sec?.label}</strong> — ${cantActual > 0 ? `<strong>${cantActual}</strong> preguntas actuales en el cuestionario` : `<span style="color:#fbbf24;">Sin datos en caché local — las preguntas nuevas se posicionarán al final según Firebase</span>`}`;
    _actualizarStep(2);
  }

  // ── Verificar si se puede analizar ───────────────────────────
  function _verificarListoParaAnalizar() {
    const btn = document.getElementById('sp-btn-analizar');
    if (!btn) return;
    btn.disabled = !(_preguntasCargadas.length > 0 && _seccionDestino);
  }

  // ── Actualizar indicador de pasos ─────────────────────────────
  function _actualizarStep(paso) {
    for (let i = 1; i <= 4; i++) {
      const el = document.getElementById('sp-step-' + i);
      if (!el) continue;
      el.classList.remove('activo', 'completado');
      if (i < paso) el.classList.add('completado');
      else if (i === paso) el.classList.add('activo');
    }
  }

  // ── Analizar preguntas ────────────────────────────────────────
  function _analizarPreguntas() {
    if (!_preguntasCargadas.length || !_seccionDestino) return;

    // Construir ambos cachés
    const { enunciados: enunciadosTodo } = _construirCacheEnunciados();
    const enunciadosDestino = _construirCacheDestino(_seccionDestino);
    _cacheEnunciados = enunciadosTodo;

    _preguntasNuevas = [];
    _dupEnDestino    = [];
    _dupEnOtros      = [];
    _dupSeleccionadas = new Set();

    for (const p of _preguntasCargadas) {
      const n = _norm(p.pregunta);
      if (!n) continue;

      const estaEnDestino = enunciadosDestino.has(n);
      const estaEnOtros   = enunciadosTodo.has(n) && !estaEnDestino;

      if (estaEnDestino) {
        // Bloqueada: ya está exactamente en el cuestionario destino
        _dupEnDestino.push(p);
      } else if (_modoComparacion === 'todo' && estaEnOtros) {
        // En modo "todo": la encontró en otro cuestionario → checklist
        _dupEnOtros.push(p);
      } else {
        // Nueva: no está en destino (modo destino) o no está en ningún lado (modo todo)
        _preguntasNuevas.push(p);
      }
    }

    // Actualizar UI — counters
    document.getElementById('sp-cnt-total').textContent          = _preguntasCargadas.length;
    document.getElementById('sp-cnt-nuevas').textContent         = _preguntasNuevas.length;
    document.getElementById('sp-cnt-dup-destino').textContent    = _dupEnDestino.length;
    document.getElementById('sp-cnt-dup-otros').textContent      = _dupEnOtros.length;
    document.getElementById('sp-tab-cnt-nuevas').textContent     = _preguntasNuevas.length;
    document.getElementById('sp-tab-cnt-dup-destino').textContent = _dupEnDestino.length;
    document.getElementById('sp-tab-cnt-dup-otros').textContent  = _dupEnOtros.length;

    // Botón ⚠️ tab — ocultar si modo destino y no hay ninguna en otros
    const tabOtros = document.getElementById('sp-tab-dup-otros');
    tabOtros.style.display = (_modoComparacion === 'todo' || _dupEnOtros.length > 0) ? '' : 'none';

    document.getElementById('sp-panel-resultados').style.display = 'block';
    _actualizarBotonSubir();

    _mostrarTab('nuevas');
    _actualizarStep(3);
    document.getElementById('sp-panel-resultados').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ── Actualizar texto y estado del botón subir ─────────────────
  function _actualizarBotonSubir() {
    const btnSubir = document.getElementById('sp-btn-subir');
    const txtBtn   = document.getElementById('sp-btn-subir-txt');
    if (!btnSubir) return;
    const sec = TODAS_LAS_SECCIONES.find(s => s.id === _seccionDestino);
    const totalSubir = _preguntasNuevas.length + _dupSeleccionadas.size;
    btnSubir.disabled = totalSubir === 0;
    if (totalSubir > 0) {
      let txt = `SUBIR ${totalSubir} PREGUNTA${totalSubir > 1 ? 'S' : ''} → ${sec?.label}`;
      if (_dupSeleccionadas.size > 0) txt += ` (${_preguntasNuevas.length} nuevas + ${_dupSeleccionadas.size} ⚠️ seleccionadas)`;
      txtBtn.textContent = txt;
    } else {
      txtBtn.textContent = 'NO HAY PREGUNTAS PARA SUBIR';
    }
  }

  // ── Mostrar tab ───────────────────────────────────────────────
  function _mostrarTab(cual) {
    const lista   = document.getElementById('sp-lista-preguntas');
    const tabN    = document.getElementById('sp-tab-nuevas');
    const tabD    = document.getElementById('sp-tab-dup-destino');
    const tabO    = document.getElementById('sp-tab-dup-otros');
    const descEl  = document.getElementById('sp-tab-desc');
    const ctrlEl  = document.getElementById('sp-dup-otros-controls');

    [tabN, tabD, tabO].forEach(t => { if(t) t.classList.remove('activo','verde','gris','amarilla','roja'); });
    ctrlEl.classList.remove('visible');

    if (cual === 'nuevas') {
      tabN.classList.add('activo', 'verde');
      descEl.textContent = '✅ Estas preguntas no existen en el cuestionario destino — se subirán automáticamente al hacer clic en "Subir".';
      lista.innerHTML = '';
      if (_preguntasNuevas.length === 0) {
        lista.innerHTML = '<div style="padding:20px;text-align:center;color:#475569;font-size:0.85rem;">No hay preguntas nuevas.</div>';
        return;
      }
      _preguntasNuevas.forEach((p, i) => {
        const div = document.createElement('div');
        div.className = 'sp-pregunta-item';
        div.innerHTML = `
          <div class="sp-pregunta-badge verde"></div>
          <span class="sp-pregunta-num">#${i + 1}</span>
          <div>
            <div class="sp-pregunta-txt">${_escapeHtml(p.pregunta || '(sin enunciado)')}</div>
            <div class="sp-pregunta-meta">${p.opciones?.length || 0} opciones · ${p._archivo || ''}</div>
          </div>`;
        lista.appendChild(div);
      });

    } else if (cual === 'dup-destino') {
      tabD.classList.add('activo', 'gris');
      descEl.textContent = '🔁 Estas preguntas ya existen exactamente en este cuestionario — están bloqueadas y no se subirán. Si querés reemplazarlas, primero vaciarlas desde "Zona de peligro".';
      lista.innerHTML = '';
      if (_dupEnDestino.length === 0) {
        lista.innerHTML = '<div style="padding:20px;text-align:center;color:#475569;font-size:0.85rem;">Ninguna pregunta repetida en este cuestionario. ✅</div>';
        return;
      }
      _dupEnDestino.forEach((p, i) => {
        const div = document.createElement('div');
        div.className = 'sp-pregunta-item';
        div.innerHTML = `
          <div class="sp-pregunta-badge" style="background:#475569"></div>
          <span class="sp-pregunta-num">#${i + 1}</span>
          <div>
            <div class="sp-pregunta-txt">${_escapeHtml(p.pregunta || '(sin enunciado)')}</div>
            <div class="sp-pregunta-meta">${p.opciones?.length || 0} opciones · ${p._archivo || ''}</div>
            <div class="sp-dup-origen">🔁 Ya está en este cuestionario — bloqueada</div>
          </div>`;
        lista.appendChild(div);
      });

    } else { // dup-otros
      tabO.classList.add('activo', 'amarilla');
      descEl.textContent = '⚠️ Estas preguntas ya existen en otro cuestionario pero NO en el destino. Podés tildar las que igual querés subir — por ejemplo, si la misma pregunta de Único 2023 también debe aparecer en Cardiología.';

      if (_dupEnOtros.length > 0) ctrlEl.classList.add('visible');

      lista.innerHTML = '';
      if (_dupEnOtros.length === 0) {
        lista.innerHTML = '<div style="padding:20px;text-align:center;color:#475569;font-size:0.85rem;">No hay preguntas repetidas en otros cuestionarios.</div>';
        return;
      }

      _dupEnOtros.forEach((p, i) => {
        const esSel = _dupSeleccionadas.has(i);
        const div = document.createElement('div');
        div.className = 'sp-pregunta-item seleccionable' + (esSel ? ' seleccionada' : '');
        div.dataset.idx = i;
        div.innerHTML = `
          <input type="checkbox" class="sp-item-check" ${esSel ? 'checked' : ''} title="Incluir en la subida">
          <span class="sp-pregunta-num">#${i + 1}</span>
          <div>
            <div class="sp-pregunta-txt">${_escapeHtml(p.pregunta || '(sin enunciado)')}</div>
            <div class="sp-pregunta-meta">${p.opciones?.length || 0} opciones · ${p._archivo || ''}</div>
            <div class="sp-dup-otros-badge">⚠️ Existe en otro cuestionario</div>
          </div>`;
        // Toggle al hacer clic
        div.addEventListener('click', (e) => {
          if (e.target.tagName === 'INPUT') return; // handled below
          const cb = div.querySelector('.sp-item-check');
          cb.checked = !cb.checked;
          _toggleDupOtra(i, cb.checked, div);
        });
        div.querySelector('.sp-item-check').addEventListener('change', (e) => {
          _toggleDupOtra(i, e.target.checked, div);
        });
        lista.appendChild(div);
      });

      _actualizarContadorOtras();
    }
  }

  // ── Toggle selección de una "dup en otros" ────────────────────
  function _toggleDupOtra(idx, checked, divEl) {
    if (checked) _dupSeleccionadas.add(idx);
    else         _dupSeleccionadas.delete(idx);
    if (divEl) divEl.classList.toggle('seleccionada', checked);
    _actualizarContadorOtras();
    _actualizarBotonSubir();
  }

  // ── Actualizar contador de seleccionadas ──────────────────────
  function _actualizarContadorOtras() {
    const el = document.getElementById('sp-dup-otros-selcnt');
    if (el) el.textContent = `${_dupSeleccionadas.size} seleccionada${_dupSeleccionadas.size !== 1 ? 's' : ''}`;
    const chkAll = document.getElementById('sp-dup-check-all');
    if (chkAll) chkAll.checked = _dupSeleccionadas.size === _dupEnOtros.length && _dupEnOtros.length > 0;
  }

  // ── Log helper ────────────────────────────────────────────────
  function _log(tipo, msg) {
    const box = document.getElementById('sp-log-box');
    if (!box) return;
    const line = document.createElement('div');
    line.className = `sp-log-${tipo}`;
    const hora = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    line.innerHTML = `<span style="color:#1e293b">[${hora}]</span> ${_escapeHtml(msg)}`;
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
  }

  // ── Actualizar barra de progreso ──────────────────────────────
  function _setProgreso(actual, total, texto) {
    const pct = total > 0 ? Math.round((actual / total) * 100) : 0;
    const bar = document.getElementById('sp-progress-bar');
    const txt = document.getElementById('sp-progress-txt');
    const num = document.getElementById('sp-progress-pct');
    if (bar) bar.style.width = pct + '%';
    if (txt) txt.textContent = texto || `Subiendo ${actual} de ${total}…`;
    if (num) num.textContent = pct + '%';
  }

  // ── Subir preguntas a Firestore ───────────────────────────────
  async function _subirPreguntas() {
    // Construir lista final: nuevas + duplicadas-en-otros seleccionadas
    const dupSelArray = Array.from(_dupSeleccionadas).sort((a,b) => a-b).map(i => _dupEnOtros[i]);
    const preguntasASubir = [..._preguntasNuevas, ...dupSelArray];

    if (preguntasASubir.length === 0) return;

    const fsModule = window.__fb || window.__firebase_firestore;
    if (!fsModule) { _toast('❌ Firestore no disponible', 'error'); return; }
    const { collection, getDocs, query, orderBy, writeBatch, doc, where } = fsModule;
    const db = window._fbDb;
    if (!db) { _toast('❌ Base de datos no inicializada', 'error'); return; }

    // Bloquear botón
    const btnSubir = document.getElementById('sp-btn-subir');
    btnSubir.disabled = true;
    btnSubir.innerHTML = '<span>⏳</span><span>Subiendo…</span>';

    // Mostrar log y progreso
    const logWrap = document.getElementById('sp-log-wrap');
    logWrap.style.display = 'block';
    document.getElementById('sp-log-spinner').style.display = 'block';
    document.getElementById('sp-progress-wrap').style.display = 'block';
    _actualizarStep(4);

    // Scroll al log de progreso
    setTimeout(() => {
      logWrap.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 80);

    try {
      const seccionId = _seccionDestino;
      const sec = TODAS_LAS_SECCIONES.find(s => s.id === seccionId);
      _log('info', `Iniciando subida a "${sec?.label}" (${seccionId})`);
      _log('info', `${preguntasASubir.length} preguntas a subir (${_preguntasNuevas.length} nuevas + ${dupSelArray.length} ⚠️ seleccionadas de otros cuestionarios)`);

      // 1. Obtener el _idx máximo actual — leyendo solo el metadato (1 lectura)
      //    En vez de descargar todas las preguntas para encontrar el número más alto,
      //    leemos el campo 'total' del documento preguntas/{seccionId} que ya existe.
      _log('info', 'Consultando el índice máximo actual en Firebase (1 lectura)…');
      const { getDoc: getDocFn, doc: docRef2 } = fsModule;
      let totalActual = 0;
      try {
        const metaSnap = await getDocFn(docRef2(db, 'preguntas', seccionId));
        if (metaSnap.exists()) {
          totalActual = metaSnap.data()?.total ?? 0;
        } else {
          // Primera subida a esta sección — no existe el metadato todavía
          totalActual = 0;
        }
      } catch (metaErr) {
        // Si falla la lectura del metadato, fallback seguro: empezar desde 0
        _log('warn', `⚠️ No se pudo leer el metadato, se usará idx 0: ${metaErr.message}`);
        totalActual = 0;
      }
      const maxIdx   = totalActual - 1;   // total=700 → maxIdx=699
      const startIdx = totalActual;        // las nuevas empiezan desde 700
      _log('ok', `Índice máximo actual: ${maxIdx} → nuevas preguntas desde _idx: ${startIdx}`);
      _log('info', `Total preguntas actuales en Firebase (desde metadato): ${totalActual}`);
      // Necesitamos snap.size para actualizar el metadato más abajo — usamos totalActual
      const snapSize = totalActual;

      // 2. Subir en lotes de 400
      const BATCH_SIZE = 400;
      let subidas = 0;
      const errores = [];

      for (let i = 0; i < preguntasASubir.length; i += BATCH_SIZE) {
        const lote = preguntasASubir.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);

        lote.forEach((p, j) => {
          const idx = startIdx + i + j;
          const docId = String(idx).padStart(5, '0');
          // Limpiar campo interno antes de subir
          const { _archivo, _firestoreIdx, ...pregLimpia } = p;
          const docRef = doc(db, 'preguntas', seccionId, 'items', docId);
          batch.set(docRef, { ...pregLimpia, _idx: idx });
        });

        await batch.commit();
        subidas += lote.length;
        _setProgreso(subidas, preguntasASubir.length, `Subiendo lote… ${subidas}/${preguntasASubir.length}`);
        _log('ok', `✅ Lote ${Math.ceil((i + BATCH_SIZE) / BATCH_SIZE)}: ${lote.length} preguntas subidas (idx ${startIdx + i} → ${startIdx + i + lote.length - 1})`);
      }

      // 3. Actualizar metadato de la sección
      try {
        const { setDoc, doc: docFn, serverTimestamp } = fsModule;
        if (setDoc && docFn) {
          await setDoc(docFn(db, 'preguntas', seccionId), {
            seccionId,
            total: snapSize + subidas,
            updatedAt: serverTimestamp ? serverTimestamp() : new Date()
          }, { merge: true });
          _log('info', `Metadato de sección actualizado (total: ${snapSize + subidas})`);
        }
      } catch (_) {}

      // 4. Actualizar caché local con las nuevas preguntas
      //    REGLA: solo se actualiza si ya existe un caché completo de esta sección.
      //    Si no existe caché → no guardar nada. Cuando el usuario entre al cuestionario
      //    descargará todo completo desde Firestore. Así evitamos un caché incompleto
      //    (solo las nuevas sin las anteriores) que haría parecer que faltan preguntas.
      _log('info', 'Actualizando caché local…');
      try {
        const rawCache = localStorage.getItem(CACHE_KEY_PREFIX + seccionId);

        // ── ¿Existe caché local completo? ──────────────────────────
        let cacheExistente = null;
        if (rawCache) {
          try { cacheExistente = JSON.parse(rawCache); } catch (_) {}
        }
        // Fallback: si está en memoria (window.preguntasPorSeccion) pero no en localStorage
        const enMemoria = window.preguntasPorSeccion?.[seccionId];

        if (!cacheExistente && !enMemoria) {
          // No hay caché — no guardar nada para no crear un caché incompleto
          _log('info', 'Sin caché local previo — se omite la actualización. ' +
            'El usuario descargará todo completo al entrar al cuestionario.');
        } else {
          // Hay caché existente — agregar solo las nuevas al final
          const preguntasActuales = cacheExistente?.preguntas || enMemoria || [];
          const preguntasNuevasConIdx = preguntasASubir.map((p, i) => {
            const { _archivo, ...limpia } = p;
            return { ...limpia, _firestoreIdx: startIdx + i };
          });
          const preguntasActualizadas = [...preguntasActuales, ...preguntasNuevasConIdx];

          try {
            localStorage.setItem(CACHE_KEY_PREFIX + seccionId, JSON.stringify({
              ts       : Date.now(),
              preguntas: preguntasActualizadas
            }));
            if (!window.preguntasPorSeccion) window.preguntasPorSeccion = {};
            window.preguntasPorSeccion[seccionId] = preguntasActualizadas;
            _log('ok', `✅ Caché local actualizado: ${preguntasActuales.length} anteriores + ` +
              `${preguntasNuevasConIdx.length} nuevas = ${preguntasActualizadas.length} totales`);
          } catch (storageErr) {
            // localStorage lleno — limpiar el caché de esta sección para forzar
            // descarga completa la próxima vez (mejor que un caché parcial)
            try {
              localStorage.removeItem(CACHE_KEY_PREFIX + seccionId);
              if (window.preguntasPorSeccion) delete window.preguntasPorSeccion[seccionId];
              _log('warn', '⚠️ localStorage lleno — caché de ' + seccionId +
                ' eliminado. Se descargará completo al entrar al cuestionario.');
            } catch (_) {}
          }
        }
      } catch (cacheErr) {
        _log('warn', `⚠️ Error inesperado al actualizar caché local: ${cacheErr.message}`);
      }

      // 5. Invalidar caché del buscador de duplicados para que refleje los cambios
      try { localStorage.removeItem('fb_dup_scan_cache_v2'); } catch (_) {}

      // 6. Notificar a usuarios conectados (carga incremental — solo las nuevas)
      try {
        if (typeof window._bumpContentVersion === 'function') {
          await window._bumpContentVersion(seccionId, null, null, { startIdx });
          _log('ok', '🔔 Usuarios conectados notificados — recibirán solo las preguntas nuevas');
        }
      } catch (bumpErr) {
        _log('warn', `⚠️ No se pudo notificar content version: ${bumpErr.message}`);
      }

      // 7. Emitir evento para que buscador-duplicados actualice su caché en memoria
      try {
        const preguntasParaBuscador = preguntasASubir.map((p, i) => ({
          seccionId,
          docId   : String(startIdx + i).padStart(5, '0'),
          idx     : startIdx + i,
          pregunta: p.pregunta || '',
          huerfana: false
        }));
        window.dispatchEvent(new CustomEvent('sp:preguntasSubidas', {
          detail: { seccionId, startIdx, nuevas: preguntasParaBuscador }
        }));
      } catch (_) {}

      _setProgreso(preguntasASubir.length, preguntasASubir.length, '¡Subida completa!');
      _log('ok', `🎉 Subida finalizada: ${subidas} preguntas añadidas a "${sec?.label}"`);
      if (errores.length > 0) _log('warn', `⚠️ ${errores.length} errores durante la subida`);

      // Mostrar resultado
      document.getElementById('sp-log-spinner').style.display = 'none';
      const rfinal = document.getElementById('sp-resultado-final');
      rfinal.style.display = 'block';
      rfinal.className = 'exito';
      document.getElementById('sp-resultado-icon').textContent = '🎉';
      document.getElementById('sp-resultado-msg').textContent  = `${subidas} pregunta${subidas > 1 ? 's' : ''} subida${subidas > 1 ? 's' : ''} correctamente`;
      document.getElementById('sp-resultado-sub').innerHTML    = `Añadidas al final de <strong>${sec?.label}</strong> · Caché local actualizado · Progreso de usuarios intacto`;

      // Mostrar botón para subir otro cuestionario
      const btnSubirReset = document.getElementById('sp-btn-subir-reset');
      if (btnSubirReset) {
        btnSubirReset.style.display = 'flex';
        btnSubirReset.onclick = () => _resetearPanelSubir();
      }

      _toast(`✅ ${subidas} preguntas subidas a ${sec?.label}`, 'success');

    } catch (e) {
      _log('err', '❌ Error crítico: ' + e.message);
      document.getElementById('sp-log-spinner').style.display = 'none';
      const rfinal = document.getElementById('sp-resultado-final');
      rfinal.style.display = 'block';
      rfinal.className = 'error';
      document.getElementById('sp-resultado-icon').textContent = '❌';
      document.getElementById('sp-resultado-msg').textContent  = 'Error durante la subida';
      document.getElementById('sp-resultado-sub').textContent  = e.message;
      _toast('❌ Error al subir: ' + e.message, 'error');
      btnSubir.disabled = false;
      btnSubir.innerHTML = '<span>⬆️</span><span>REINTENTAR SUBIDA</span>';
    }
  }

  // ════════════════════════════════════════════════════════════════
  // ════════════════════════════════════════════════════════════════
  // Limpiar caché de sección
  // ════════════════════════════════════════════════════════════════

  function _inicializarEventosCache() {
    const toggle    = document.getElementById('sp-cache-toggle');
    const contenido = document.getElementById('sp-cache-contenido');
    toggle.addEventListener('click', () => {
      const abierto = contenido.classList.toggle('visible');
      toggle.classList.toggle('abierto', abierto);
    });

    const selectCache = document.getElementById('sp-cache-select');
    const infoEl      = document.getElementById('sp-cache-info');
    const btnLimpiar  = document.getElementById('sp-btn-cache-limpiar');
    const btnTxt      = document.getElementById('sp-btn-cache-limpiar-txt');

    selectCache.addEventListener('change', function () {
      const secId = this.value;
      if (!secId) {
        infoEl.className = 'sp-cache-info';
        infoEl.classList.remove('visible');
        btnLimpiar.disabled = true;
        return;
      }

      const sec = TODAS_LAS_SECCIONES.find(s => s.id === secId);
      const cacheKey   = CACHE_KEY_PREFIX + secId;
      const editsKey   = 'fb_edits_cache_' + secId;
      const tienePrincipal = !!localStorage.getItem(cacheKey);
      const tieneEdits     = !!localStorage.getItem(editsKey);

      let cantPreguntas = 0;
      try {
        const raw = localStorage.getItem(cacheKey);
        if (raw) cantPreguntas = JSON.parse(raw)?.preguntas?.length || 0;
      } catch (_) {}

      infoEl.classList.add('visible');
      if (tienePrincipal) {
        infoEl.className = 'sp-cache-info visible ok';
        infoEl.innerHTML = `✅ Caché encontrado: <strong>${sec?.label}</strong> — ${cantPreguntas.toLocaleString()} preguntas almacenadas localmente${tieneEdits ? ' · más caché de ediciones admin' : ''}.<br>Al limpiar, la próxima vez que alguien entre al cuestionario se descargarán todas las preguntas desde Firestore.`;
      } else {
        infoEl.className = 'sp-cache-info visible warn';
        infoEl.innerHTML = `⚠️ No hay caché local para <strong>${sec?.label}</strong>. Ya se descargará desde Firestore la próxima vez que alguien entre.`;
      }

      btnLimpiar.disabled = !tienePrincipal && !tieneEdits;
      btnTxt.textContent  = `LIMPIAR CACHÉ DE ${sec?.label?.toUpperCase()}`;
    });

    btnLimpiar.addEventListener('click', function () {
      const secId = selectCache.value;
      if (!secId) return;

      const sec      = TODAS_LAS_SECCIONES.find(s => s.id === secId);
      const cacheKey = CACHE_KEY_PREFIX + secId;
      const editsKey = 'fb_edits_cache_' + secId;

      // Eliminar caché de preguntas y de ediciones admin
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(editsKey);

      // Si la sección ya estaba cargada en memoria, también limpiarla
      // para que la próxima llamada a cargarSeccion() vaya a Firestore
      if (window.preguntasPorSeccion) {
        delete window.preguntasPorSeccion[secId];
      }
      if (window._seccionesYaCargadas) {
        window._seccionesYaCargadas.delete(secId);
      }

      // Feedback
      infoEl.className = 'sp-cache-info visible ok';
      infoEl.innerHTML = `✅ Caché de <strong>${sec?.label}</strong> eliminado correctamente. La próxima vez que alguien entre al cuestionario se descargarán todas las preguntas desde Firestore.`;
      btnLimpiar.disabled = true;
      btnLimpiar.innerHTML = '<span>✅</span><span>CACHÉ ELIMINADO</span>';

      _toast(`🗑️ Caché de "${sec?.label}" eliminado — se descargará completo al entrar`, 'success');
      _actualizarCacheEstado();

      // Restaurar botón tras 3 segundos
      setTimeout(() => {
        btnLimpiar.innerHTML = `<span>🗑️</span><span id="sp-btn-cache-limpiar-txt">LIMPIAR CACHÉ DE ${sec?.label?.toUpperCase()}</span>`;
        selectCache.value = '';
        infoEl.classList.remove('visible');
        btnLimpiar.disabled = true;
      }, 3000);
    });
  }

  // ════════════════════════════════════════════════════════════════
  // Zona de peligro — Vaciar cuestionario
  // ════════════════════════════════════════════════════════════════

  function _inicializarEventosVaciar() {
    // Toggle panel
    const toggle    = document.getElementById('sp-vaciar-toggle');
    const contenido = document.getElementById('sp-vaciar-contenido');
    toggle.addEventListener('click', () => {
      const abierto = contenido.classList.toggle('visible');
      toggle.classList.toggle('abierto', abierto);
    });

    // Selección de cuestionario
    const selectVaciar = document.getElementById('sp-vaciar-select');
    const confirmWrap  = document.getElementById('sp-vaciar-confirm-wrap');
    const confirmInput = document.getElementById('sp-vaciar-confirm-input');
    const confirmHint  = document.getElementById('sp-vaciar-confirm-hint');
    const infoEl       = document.getElementById('sp-vaciar-info');
    const btnVaciar    = document.getElementById('sp-btn-vaciar');
    const btnTxt       = document.getElementById('sp-btn-vaciar-txt');

    selectVaciar.addEventListener('change', function () {
      const seccionId = this.value;
      confirmInput.value = '';
      confirmInput.classList.remove('ok');
      infoEl.className = 'sp-vaciar-info';
      infoEl.textContent = '';
      btnVaciar.disabled = true;

      if (!seccionId) {
        confirmWrap.classList.remove('visible');
        btnTxt.textContent = 'VACIAR CUESTIONARIO';
        return;
      }

      // Mostrar cuántas preguntas hay actualmente
      let cantActual = 0;
      try {
        const raw = localStorage.getItem(CACHE_KEY_PREFIX + seccionId);
        if (raw) cantActual = JSON.parse(raw)?.preguntas?.length || 0;
      } catch (_) {}
      if (!cantActual && window.preguntasPorSeccion?.[seccionId]) {
        cantActual = window.preguntasPorSeccion[seccionId].length;
      }

      const sec = TODAS_LAS_SECCIONES.find(s => s.id === seccionId);
      confirmHint.textContent = seccionId;
      confirmWrap.classList.add('visible');
      infoEl.className = 'sp-vaciar-info';
      infoEl.textContent = cantActual > 0
        ? `📋 ${sec?.label} tiene aprox. ${cantActual} preguntas en caché local.`
        : `⚠️ No hay datos en caché local para esta sección.`;
      btnTxt.textContent = `VACIAR "${sec?.label?.toUpperCase()}"`;
    });

    // Validación del campo de confirmación
    confirmInput.addEventListener('input', function () {
      const seccionId = selectVaciar.value;
      const ok = this.value.trim() === seccionId;
      this.classList.toggle('ok', ok);
      btnVaciar.disabled = !ok;
      infoEl.className = 'sp-vaciar-info' + (ok ? ' listo' : '');
      infoEl.textContent = ok
        ? '✅ Confirmación correcta. Podés proceder.'
        : seccionId ? `Escribí exactamente: ${seccionId}` : '';
    });

    // Acción de vaciado
    btnVaciar.addEventListener('click', () => _vaciarCuestionario(selectVaciar.value));
  }

  // ── Lógica de vaciado en Firestore ────────────────────────────
  async function _vaciarCuestionario(seccionId) {
    if (!seccionId) return;

    const fsModule = window.__fb || window.__firebase_firestore;
    if (!fsModule) { _toast('❌ Firestore no disponible', 'error'); return; }
    const { collection, getDocs, query, orderBy, writeBatch, doc, deleteDoc } = fsModule;
    const db = window._fbDb;
    if (!db) { _toast('❌ Base de datos no inicializada', 'error'); return; }

    const sec      = TODAS_LAS_SECCIONES.find(s => s.id === seccionId);
    const btnVaciar = document.getElementById('sp-btn-vaciar');
    const logWrap   = document.getElementById('sp-vaciar-log-wrap');
    const logBox    = document.getElementById('sp-vaciar-log-box');
    const spinner   = document.getElementById('sp-vaciar-log-spinner');
    const progWrap  = document.getElementById('sp-vaciar-progress-wrap');
    const progBar   = document.getElementById('sp-vaciar-progress-bar');
    const progTxt   = document.getElementById('sp-vaciar-progress-txt');
    const progPct   = document.getElementById('sp-vaciar-progress-pct');
    const confirmInput = document.getElementById('sp-vaciar-confirm-input');
    const selectVaciar = document.getElementById('sp-vaciar-select');

    function logV(tipo, msg) {
      if (!logBox) return;
      const line = document.createElement('div');
      line.className = `sp-log-${tipo}`;
      const hora = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      line.innerHTML = `<span style="color:#1e293b">[${hora}]</span> ${_escapeHtml(msg)}`;
      logBox.appendChild(line);
      logBox.scrollTop = logBox.scrollHeight;
    }

    function setProgV(actual, total, texto) {
      const pct = total > 0 ? Math.round((actual / total) * 100) : 0;
      if (progBar) progBar.style.width = pct + '%';
      if (progTxt) progTxt.textContent = texto || `Eliminando ${actual} de ${total}…`;
      if (progPct) progPct.textContent = pct + '%';
    }

    // Bloquear UI
    btnVaciar.disabled = true;
    btnVaciar.innerHTML = '<span>⏳</span><span>Vaciando…</span>';
    confirmInput.disabled = true;
    selectVaciar.disabled = true;
    logWrap.style.display   = 'block';
    progWrap.style.display  = 'block';
    spinner.style.display   = 'block';

    try {
      logV('info', `Iniciando vaciado de "${sec?.label}" (${seccionId})…`);

      // 1. Obtener todos los documentos de items/
      logV('info', 'Consultando documentos en Firestore…');
      const itemsRef = collection(db, 'preguntas', seccionId, 'items');
      const snap     = await getDocs(query(itemsRef, orderBy('_idx')));

      if (snap.empty) {
        logV('warn', '⚠️ La sección ya está vacía en Firestore.');
        spinner.style.display = 'none';
        btnVaciar.innerHTML = '<span>✅</span><span>YA ESTABA VACÍO</span>';
        const btnReset = document.getElementById('sp-btn-vaciar-reset');
        if (btnReset) { btnReset.style.display = 'flex'; btnReset.onclick = () => _resetearPanelVaciar(); }
        _toast(`ℹ️ "${sec?.label}" ya estaba vacía en Firestore`, 'info');
        return;
      }

      const total = snap.size;
      logV('info', `Se encontraron ${total} preguntas. Eliminando en lotes…`);
      setProgV(0, total, `0 de ${total} eliminadas…`);

      // 2. Eliminar en lotes de 400 (límite de Firestore writeBatch)
      const BATCH_SIZE = 400;
      const docs       = snap.docs;
      let   eliminadas = 0;

      for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const lote  = docs.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);
        lote.forEach(d => batch.delete(d.ref));
        await batch.commit();
        eliminadas += lote.length;
        setProgV(eliminadas, total, `${eliminadas} de ${total} eliminadas…`);
        logV('ok', `✅ Lote eliminado: ${eliminadas}/${total}`);
      }

      // 3. Actualizar metadato de la sección (total = 0)
      try {
        const { setDoc: setDocFn, doc: docFn, serverTimestamp } = fsModule;
        if (setDocFn && docFn) {
          await setDocFn(docFn(db, 'preguntas', seccionId), {
            seccionId,
            total    : 0,
            updatedAt: serverTimestamp ? serverTimestamp() : new Date()
          }, { merge: true });
          logV('info', 'Metadato de sección actualizado (total: 0)');
        }
      } catch (_) {}

      // 4. Limpiar caché local
      try {
        localStorage.removeItem(CACHE_KEY_PREFIX + seccionId);
        if (window.preguntasPorSeccion) {
          delete window.preguntasPorSeccion[seccionId];
        }
        // Limpiar también el caché del buscador de duplicados
        localStorage.removeItem('fb_dup_scan_cache_v2');
        // Limpiar caché de especialidades que pudieran tener extrapoladas de esta sección
        const especialidadesAfectadas = new Set(
          Object.values(window.MAPA_ESPECIALIDAD_KEY || {})
        );
        especialidadesAfectadas.forEach(espId => {
          try { localStorage.removeItem(CACHE_KEY_PREFIX + espId); } catch (_) {}
          if (window.preguntasPorSeccion) {
            delete window.preguntasPorSeccion[espId];
          }
        });
        logV('ok', '✅ Caché local limpiado (sección + especialidades extrapoladas)');
      } catch (cacheErr) {
        logV('warn', `⚠️ No se pudo limpiar el caché local: ${cacheErr.message}`);
      }

      // 5. Notificar a usuarios conectados
      try {
        if (typeof window._bumpContentVersion === 'function') {
          await window._bumpContentVersion(seccionId, null, null, { vaciado: true });
          logV('ok', '🔔 Usuarios conectados notificados del vaciado');
        }
      } catch (bumpErr) {
        logV('warn', `⚠️ No se pudo notificar content version: ${bumpErr.message}`);
      }

      // 6. Finalizar UI
      setProgV(total, total, '¡Vaciado completo!');
      spinner.style.display = 'none';
      logV('ok', `🎉 Vaciado finalizado: ${eliminadas} preguntas eliminadas de "${sec?.label}"`);

      btnVaciar.innerHTML   = '<span>✅</span><span>VACIADO COMPLETADO</span>';
      confirmInput.value    = '';
      confirmInput.classList.remove('ok');
      selectVaciar.value    = '';
      document.getElementById('sp-vaciar-confirm-wrap').classList.remove('visible');
      document.getElementById('sp-vaciar-info').textContent = '';

      // Mostrar botón de reinicio para una nueva operación
      const btnReset = document.getElementById('sp-btn-vaciar-reset');
      if (btnReset) {
        btnReset.style.display = 'flex';
        btnReset.onclick = () => _resetearPanelVaciar();
      }

      _toast(`🗑 "${sec?.label}" vaciada — ${eliminadas} preguntas eliminadas`, 'success');
      _actualizarCacheEstado();

    } catch (e) {
      spinner.style.display = 'none';
      logV('err', '❌ Error crítico: ' + e.message);
      btnVaciar.disabled  = false;
      btnVaciar.innerHTML = '<span>🗑</span><span>REINTENTAR</span>';
      confirmInput.disabled  = false;
      selectVaciar.disabled  = false;
      _toast('❌ Error al vaciar: ' + e.message, 'error');
    }
  }

  // ── Resetear panel de subida para nueva operación ────────────
  function _resetearPanelSubir() {
    // Reset estado del módulo
    _preguntasCargadas   = [];
    _seccionDestino      = '';
    _preguntasNuevas     = [];
    _preguntasDuplicadas = [];
    _dupEnDestino        = [];
    _dupEnOtros          = [];
    _dupSeleccionadas    = new Set();
    _modoComparacion     = 'destino';
    _cacheEnunciados     = null;

    // Limpiar lista de archivos cargados
    const listaArchivos = document.getElementById('sp-archivos-lista');
    if (listaArchivos) listaArchivos.innerHTML = '';

    // Resetear selector de destino e info
    const selectDestino = document.getElementById('sp-select-destino');
    if (selectDestino) selectDestino.value = '';
    const destinoInfo = document.getElementById('sp-destino-info');
    if (destinoInfo) destinoInfo.style.display = 'none';

    // Ocultar y limpiar panel de resultados
    const panelResultados = document.getElementById('sp-panel-resultados');
    if (panelResultados) panelResultados.style.display = 'none';

    // Ocultar y limpiar log + progreso
    const logWrap = document.getElementById('sp-log-wrap');
    if (logWrap) logWrap.style.display = 'none';
    const logBox = document.getElementById('sp-log-box');
    if (logBox) logBox.innerHTML = '';
    const progWrap = document.getElementById('sp-progress-wrap');
    if (progWrap) progWrap.style.display = 'none';
    const progBar = document.getElementById('sp-progress-bar');
    if (progBar) progBar.style.width = '0%';

    // Ocultar resultado final y reset button
    const rfinal = document.getElementById('sp-resultado-final');
    if (rfinal) { rfinal.style.display = 'none'; rfinal.className = ''; }
    const btnSubirReset = document.getElementById('sp-btn-subir-reset');
    if (btnSubirReset) btnSubirReset.style.display = 'none';

    // Resetear botón subir
    const btnSubir = document.getElementById('sp-btn-subir');
    if (btnSubir) {
      btnSubir.disabled = true;
      btnSubir.innerHTML = '<span>⬆️</span><span id="sp-btn-subir-txt">SUBIR AL FINAL DEL CUESTIONARIO</span>';
    }

    // Deshabilitar botón analizar
    const btnAnalizar = document.getElementById('sp-btn-analizar');
    if (btnAnalizar) btnAnalizar.disabled = true;

    // Resetear modo de comparación a "destino"
    const modoDestino = document.getElementById('sp-modo-destino');
    const modoTodo    = document.getElementById('sp-modo-todo');
    if (modoDestino) { modoDestino.classList.add('activo','destino'); }
    if (modoTodo)    { modoTodo.classList.remove('activo','todo'); }

    // Actualizar steps al inicio
    _actualizarStep(1);
    _actualizarCacheEstado();

    // Scroll arriba del modal
    document.getElementById('sp-content')?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Resetear panel de vaciado para nueva operación ───────────
  function _resetearPanelVaciar() {
    const btnVaciar    = document.getElementById('sp-btn-vaciar');
    const btnReset     = document.getElementById('sp-btn-vaciar-reset');
    const confirmInput = document.getElementById('sp-vaciar-confirm-input');
    const selectVaciar = document.getElementById('sp-vaciar-select');
    const logWrap      = document.getElementById('sp-vaciar-log-wrap');
    const progWrap     = document.getElementById('sp-vaciar-progress-wrap');
    const progBar      = document.getElementById('sp-vaciar-progress-bar');
    const progTxt      = document.getElementById('sp-vaciar-progress-txt');
    const progPct      = document.getElementById('sp-vaciar-progress-pct');
    const logBox       = document.getElementById('sp-vaciar-log-box');
    const infoEl       = document.getElementById('sp-vaciar-info');
    const confirmWrap  = document.getElementById('sp-vaciar-confirm-wrap');

    // Limpiar y restaurar estado inicial
    if (btnVaciar) {
      btnVaciar.disabled = true;
      btnVaciar.innerHTML = '<span>🗑</span><span id="sp-btn-vaciar-txt">VACIAR CUESTIONARIO</span>';
    }
    if (btnReset)     { btnReset.style.display = 'none'; }
    if (confirmInput) { confirmInput.value = ''; confirmInput.classList.remove('ok'); confirmInput.disabled = false; }
    if (selectVaciar) { selectVaciar.value = ''; selectVaciar.disabled = false; }
    if (confirmWrap)  { confirmWrap.classList.remove('visible'); }
    if (infoEl)       { infoEl.className = 'sp-vaciar-info'; infoEl.textContent = ''; }
    if (logBox)       { logBox.innerHTML = ''; }
    if (logWrap)      { logWrap.style.display = 'none'; }
    if (progWrap)     { progWrap.style.display = 'none'; }
    if (progBar)      { progBar.style.width = '0%'; }
    if (progTxt)      { progTxt.textContent = 'Eliminando…'; }
    if (progPct)      { progPct.textContent = '0%'; }
  }

  // ── Escape HTML ───────────────────────────────────────────────
  function _escapeHtml(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ════════════════════════════════════════════════════════════════
  // Exponer globalmente
  // ════════════════════════════════════════════════════════════════
  window.fbAbrirSubirPreguntas = fbAbrirSubirPreguntas;

})();
