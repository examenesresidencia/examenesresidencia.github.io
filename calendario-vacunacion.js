// ════════════════════════════════════════════════════════════════
// calendario-vacunacion.js  — v1
// Módulo autónomo: Calendario Nacional de Vacunación 2026 Argentina
// Accesible desde:
//   - Menú principal → botón "Vacunas 2026" → hash #vacunas2026
//   - Explicación de pregunta → botón "VER MÁS SOBRE VACUNAS" → hash #vacunas2026
//     En ese caso aparece un botón flotante "← Volver al Cuestionario"
// ════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── Datos de vacunas (editables por admin) ──────────────────────
  // Estructura guardada en localStorage con clave 'vacunas2026_data'
  const DATA_KEY = 'vacunas2026_data';

  const DATA_DEFAULT = {
    clasificacion: [
      {
        tipo: 'VÍRICAS — VIVAS ATENUADAS',
        color: '#166534',
        colorClar: '#dcfce7',
        vacunas: [
          {
            nombre: 'Triple Viral (SPR)',
            badge: 'Viva atenuada',
            previene: 'Sarampión, rubéola y parotiditis.',
            dosis: ['1ª dosis: 12 meses', '2ª dosis: 18 meses', 'Recupero: 15 años+'],
            nota: '⚠️ 4 semanas entre dosis. Si no se da el mismo día que otra viva inyectable, esperar 4 sem. Ig: esperar 3–11 meses ANTES de vacunar según dosis de Ig.',
            notaTipo: 'warn'
          },
          {
            nombre: 'Varicela',
            badge: 'Viva atenuada',
            previene: 'Varicela.',
            dosis: ['1ª: 15 meses', '2ª: al cumplir 5 años (nac. 2021–24)', '2° refuerzo: nac. 2015'],
            nota: '⚠️ Mismas restricciones que Triple Viral. 4 semanas entre dosis.',
            notaTipo: 'warn'
          },
          {
            nombre: 'Rotavirus (oral)',
            badge: 'Viva atenuada oral',
            previene: 'Gastroenteritis grave por rotavirus.',
            dosis: ['1ª: 2 meses (antes 14 sem 6 días)', '2ª: 4 meses (antes 6 meses)'],
            nota: '✅ ORAL: sin restricción de intervalo con inyectables ni Ig. Atención: ventana de edad estricta.',
            notaTipo: 'ok'
          },
          {
            nombre: 'Fiebre Amarilla',
            badge: 'Viva atenuada',
            previene: 'Fiebre amarilla.',
            dosis: ['1ª: 18 meses', 'Refuerzo: nac. 2015', 'Adultos zona riesgo: única dosis'],
            nota: '⚠️ Contraindicada en embarazadas e inmunocomp. 4 semanas con otras vivas inyectables.',
            notaTipo: 'warn'
          }
        ]
      },
      {
        tipo: 'VÍRICAS — INACTIVAS — VIRUS ENTEROS',
        color: '#2563a8',
        colorClar: '#dbeafe',
        vacunas: [
          {
            nombre: 'IPV (Polio inyectable)',
            badge: 'Inactiva',
            previene: 'Poliomielitis.',
            dosis: ['1ª: 2 m', '2ª: 4 m', '3ª: 6 m', 'Refuerzo: 18 meses'],
            nota: 'ℹ️ Inactivada: sin restricción de intervalo con ningún otro biológico.',
            notaTipo: 'info'
          },
          {
            nombre: 'Antigripal',
            badge: 'Inactiva',
            previene: 'Influenza estacional.',
            dosis: ['Anual: desde 6 meses hasta 24 meses', '2 dosis si es la 1ª vez (sep. 4 sem)', 'Embarazadas | Puérperas | Personal salud | 65+'],
            nota: 'ℹ️ Inactivada. Compatible con otras vacunas y con gammaglobulinas.',
            notaTipo: 'info'
          },
          {
            nombre: 'Hepatitis A',
            badge: 'Inactiva',
            previene: 'Hepatitis A.',
            dosis: ['Única dosis: 12 meses', 'Recupero: desde 15 años'],
            nota: 'ℹ️ Inactivada. Sin restricciones de intervalo.',
            notaTipo: 'info'
          },
          {
            nombre: 'Meningococo ACYW',
            badge: 'Inactiva conjugada',
            previene: 'Meningitis y sepsis meningocócica.',
            dosis: ['1ª: 3 m', '2ª: 5 m', 'Refuerzo: 15 m', 'Única: nac. 2015'],
            nota: 'ℹ️ Conjugada inactivada. Sin restricciones de intervalo.',
            notaTipo: 'info'
          }
        ]
      },
      {
        tipo: 'VÍRICAS — INACTIVAS — SUBUNIDADES',
        color: '#0f766e',
        colorClar: '#ccfbf1',
        vacunas: [
          {
            nombre: 'Hepatitis B',
            badge: 'Subunidad',
            previene: 'Hepatitis B.',
            dosis: ['Neonatal: primeras 12 hs de vida', 'Adultos: iniciar o completar esquema'],
            nota: 'ℹ️ Puede coincidir con Ig anti-HepB al nacer (sitios distintos). Subunidad recombinante = sin restricción.',
            notaTipo: 'info'
          },
          {
            nombre: 'VPH',
            badge: 'Subunidad',
            previene: 'Virus Papiloma Humano.',
            dosis: ['Nac. 2015: única dosis', 'Adultos: refuerzo cada 10 años'],
            nota: 'ℹ️ Subunidad (VLP). Sin restricciones de intervalo ni con Ig.',
            notaTipo: 'info'
          },
          {
            nombre: 'Doble Bacteriana (dT)',
            badge: 'Toxoide',
            previene: 'Difteria y tétanos.',
            dosis: ['Refuerzo cada 10 años en adultos'],
            nota: 'ℹ️ Toxoide (inactivado). Compatible con Ig antitetánica (sitios distintos).',
            notaTipo: 'info'
          },
          {
            nombre: 'VSR (nirsevimab)',
            badge: 'Biológico',
            previene: 'Bronquiolitis y neumonía por VSR hasta los 6 meses.',
            dosis: ['Embarazadas: 1 dosis (sem 32–36,6 en temporada)', 'Nac. 2021–24: según esquema'],
            nota: '⚠️ Anticuerpo monoclonal (no vacuna clásica). Consultar contraindicaciones con el equipo de salud.',
            notaTipo: 'warn'
          }
        ]
      },
      {
        tipo: 'BACTERIANAS — VIVAS ATENUADAS',
        color: '#6d28d9',
        colorClar: '#ede9fe',
        vacunas: [
          {
            nombre: 'BCG',
            badge: 'Bacteria viva',
            previene: 'Formas graves de tuberculosis.',
            dosis: ['Única dosis: recién nacido (antes de egresar maternidad)'],
            nota: '⚠️ Bacteriana viva. Contraindicada en inmunocomprometidos. Sin restricción especial con otras vacunas neonatales.',
            notaTipo: 'warn'
          }
        ]
      },
      {
        tipo: 'BACTERIANAS — MUERTAS / INACTIVAS',
        color: '#92400e',
        colorClar: '#fef3c7',
        vacunas: [
          {
            nombre: 'Neumococo conjugada',
            badge: 'Bacteria inactiva',
            previene: 'Meningitis, neumonía y sepsis por neumococo.',
            dosis: ['1ª: 2 m', '2ª: 4 m', '3ª: 6 m', 'Refuerzo: 12 m', '65+: única dosis'],
            nota: 'ℹ️ Conjugada inactivada. Sin restricciones.',
            notaTipo: 'info'
          },
          {
            nombre: 'Quíntuple / Pentavalente',
            badge: 'Bacteria inactiva',
            previene: 'Difteria, Tétanos, Tos convulsa, HepB, Hib.',
            dosis: ['1ª: 2 m', '2ª: 4 m', '3ª: 6 m', 'Refuerzo: 18 meses'],
            nota: 'ℹ️ Inactivada combinada. Sin restricciones.',
            notaTipo: 'info'
          },
          {
            nombre: 'Triple Bacteriana Celular (DTP)',
            badge: 'Bacteria inactiva',
            previene: 'Difteria, Tétanos y Tos convulsa.',
            dosis: ['Refuerzo: nac. 2021 (6 años)', '2° refuerzo: nac. 2015'],
            nota: 'ℹ️ Inactivada. Sin restricciones.',
            notaTipo: 'info'
          },
          {
            nombre: 'Triple Bacteriana Acelular (TDPa)',
            badge: 'Toxoide acelular',
            previene: 'Difteria, Tétanos y Tos convulsa (acelular).',
            dosis: ['Embarazadas: 1 dosis por embarazo (desde sem. 20)', 'Puérperas: 1 dosis si no recibieron antes del parto', 'Personal salud: 1 dosis'],
            nota: '⚠️ En CADA embarazo desde sem. 20, independientemente de dosis previas. Anticuerpos maternos protegen al recién nacido.',
            notaTipo: 'warn'
          }
        ]
      },
      {
        tipo: 'ZONA DE RIESGO EXCLUSIVO',
        color: '#9d174d',
        colorClar: '#fce7f3',
        vacunas: [
          {
            nombre: 'Fiebre Hemorrágica Argentina',
            badge: 'Zona de riesgo',
            previene: 'Fiebre Hemorrágica Argentina.',
            dosis: ['1 dosis: personas 2–59 años en zona endémica', '(Córdoba, Santa Fe, Bs As, La Pampa)'],
            nota: '🔴 Viva atenuada. NO en embarazadas ni inmunocomp. Misma regla de intervalo que otras vivas inyectables.',
            notaTipo: 'danger'
          }
        ]
      }
    ],

    edadTabla: [
      { edad: 'Recién nacido',   vacunas: 'BCG  |  Hepatitis B neonatal',                                      nota: 'BCG antes de egresar; HepB en 1as 12 hs' },
      { edad: '2 meses',         vacunas: 'Neumococo 1ª | Quíntuple 1ª | IPV 1ª | Rotavirus 1ª',              nota: 'Rota: antes 14 sem 6 días' },
      { edad: '3 meses',         vacunas: 'Meningococo ACYW 1ª',                                               nota: '—' },
      { edad: '4 meses',         vacunas: 'Neumococo 2ª | Quíntuple 2ª | IPV 2ª | Rotavirus 2ª',              nota: 'Rota: antes 6 meses' },
      { edad: '5 meses',         vacunas: 'Meningococo ACYW 2ª',                                               nota: '—' },
      { edad: '6 meses',         vacunas: 'Neumococo 3ª | Quíntuple 3ª | IPV 3ª',                             nota: '—' },
      { edad: '12 meses',        vacunas: 'Neumococo ref. | Hepatitis A | Triple Viral 1ª',                    nota: '—' },
      { edad: '15 meses',        vacunas: 'Meningococo ref. | Varicela 1ª | Antigripal inicio',                nota: '—' },
      { edad: '18 meses',        vacunas: 'Quíntuple ref. | IPV ref. | Fiebre Amarilla | Triple Viral 2ª',    nota: '—' },
      { edad: 'Nacidos 2021',    vacunas: 'Quínt. ref. | Triple Viral 2ª | Varicela 2ª | DTP ref.',           nota: 'Varicela 2ª al cumplir 5 años' },
      { edad: 'Nacidos 2015',    vacunas: 'Meningo | DTP 2° ref. | Doble Bact. | VPH | FA ref.',               nota: '—' },
      { edad: 'Desde 15 años',   vacunas: 'Triple Viral (recupero) | Hepatitis A (recupero)',                  nota: 'Si no completó esquema previo' },
      { edad: 'Adultos',         vacunas: 'HepB | Antigripal anual (65+) | Doble Bact. c/10a | Neumococo 65+', nota: 'HepB si no vacunado' },
      { edad: 'Embarazadas',     vacunas: 'Antigripal | TDPa | VSR (sem 32–36,6)',                             nota: 'TDPa en c/embarazo desde sem. 20' },
      { edad: 'Puérperas',       vacunas: 'Antigripal | TDPa',                                                 nota: 'Hasta 10 días postparto' },
      { edad: 'Personal salud',  vacunas: 'Antigripal anual | TDPa | DTP zona riesgo',                        nota: 'Varones y mujeres' }
    ],

    intervalos: [
      { combinacion: 'Viva iny. + Viva iny.',       regla: '⚠️ Si NO es el mismo día: 4 SEMANAS mínimo. Mismo día, sitios distintos: sin problema.',   tipo: 'warn' },
      { combinacion: 'Viva oral + cualquier vac.',   regla: '✅ SIN restricción (Rotavirus oral).',                                                       tipo: 'ok'   },
      { combinacion: 'Inactivada + cualquier vac.',  regla: '✅ SIN restricción. Cualquier orden y momento.',                                             tipo: 'ok'   },
      { combinacion: 'Ig → Vacuna VIVA (Ig primero)',regla: '⚠️ IM estándar: 3 m. IV 0,1 g/kg: 3 m. IV 0,3–0,5 g/kg: 6 m. IV 1–2 g/kg: 11 MESES.',   tipo: 'warn' },
      { combinacion: 'Vacuna VIVA → Ig (vac. prim.)',regla: '⚠️ Esperar mínimo 2 SEMANAS antes de dar Ig. Si no fue posible: puede requerir revacunación.',tipo:'warn'},
      { combinacion: 'Ig anti-HepB + HepB al nacer', regla: '✅ COMPATIBLE. Sitios distintos. HepB es subunidad (inactivada).',                          tipo: 'ok'   },
      { combinacion: 'Ig antitetánica + dT/TDPa',    regla: '✅ COMPATIBLE. Sitios distintos. Toxoide = inactivada.',                                    tipo: 'ok'   },
      { combinacion: 'Ig + INACTIVADA',              regla: '✅ SIN restricción. Las Ig no interfieren con vacunas inactivadas.',                          tipo: 'ok'   }
    ],

    mnemotecnia: [
      { titulo: 'Vivas inyectables del calendario', texto: 'Triple Viral | Varicela | Fiebre Amarilla | BCG | F. Hemorrágica Arg.\nSolo entre ellas aplica la regla de 4 semanas. Solo con ellas las Ig son un problema.' },
      { titulo: '"Gripe – Tos – VSR"', texto: 'Las 3 vacunas del embarazo. Las 3 protegen al recién nacido por inmunidad pasiva materna.' },
      { titulo: 'INACTIVADA = SIN restricción', texto: 'Con Ig, con otras vac., en cualquier orden, siempre compatible.' },
      { titulo: 'Resumen Ig', texto: 'Ig → viva: 3 a 11 meses según dosis  |  Viva → Ig: 2 semanas  |  Ig + inactivada: sin restricción' }
    ]
  };

  // ── Cargar / guardar datos ──────────────────────────────────────
  function cargarDatos() {
    try {
      const saved = localStorage.getItem(DATA_KEY);
      return saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(DATA_DEFAULT));
    } catch (_) {
      return JSON.parse(JSON.stringify(DATA_DEFAULT));
    }
  }
  function guardarDatos(data) {
    try { localStorage.setItem(DATA_KEY, JSON.stringify(data)); } catch (_) {}
  }

  // ── Helpers admin ───────────────────────────────────────────────
  function esAdmin() { return typeof window.fbIsAdmin === 'function' && window.fbIsAdmin(); }

  // ══════════════════════════════════════════════════════════════════
  // INYECTAR ESTILOS
  // ══════════════════════════════════════════════════════════════════
  function inyectarEstilos() {
    if (document.getElementById('vac2026-styles')) return;
    const st = document.createElement('style');
    st.id = 'vac2026-styles';
    st.textContent = `
      /* ── Panel principal ── */
      #vac2026-panel {
        display: none;
        position: relative;
        min-height: 100vh;
        background: linear-gradient(135deg, #0a1628 0%, #0d2444 60%, #071220 100%);
        padding: 0 0 80px;
        font-family: 'Segoe UI', system-ui, sans-serif;
        color: #e2e8f0;
      }
      #vac2026-panel.activo { display: block; }

      /* ── Header ── */
      .vac2026-header {
        position: sticky;
        top: 0;
        z-index: 100;
        background: rgba(10,22,40,0.96);
        backdrop-filter: blur(14px);
        border-bottom: 1px solid rgba(56,189,248,0.18);
        padding: 14px 20px 10px;
      }
      .vac2026-header-top {
        display: flex;
        align-items: center;
        gap: 14px;
        flex-wrap: wrap;
        margin-bottom: 10px;
      }
      .vac2026-btn-volver {
        background: rgba(255,255,255,0.07);
        border: 1px solid rgba(255,255,255,0.18);
        color: #94a3b8;
        padding: 7px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.88rem;
        font-weight: 500;
        transition: all 0.15s;
        white-space: nowrap;
      }
      .vac2026-btn-volver:hover { background: rgba(255,255,255,0.13); color: #f1f5f9; }
      .vac2026-titulo {
        font-size: 1.15rem;
        font-weight: 700;
        color: #38bdf8;
        letter-spacing: 0.01em;
        flex: 1;
      }
      .vac2026-subtitulo {
        font-size: 0.78rem;
        color: #64748b;
        margin-left: auto;
        white-space: nowrap;
      }

      /* ── Tabs ── */
      .vac2026-tabs {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .vac2026-tab {
        padding: 6px 16px;
        border-radius: 20px;
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.04);
        color: #94a3b8;
        font-size: 0.82rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s;
        white-space: nowrap;
      }
      .vac2026-tab:hover { background: rgba(255,255,255,0.09); color: #e2e8f0; }
      .vac2026-tab.activo {
        background: rgba(56,189,248,0.15);
        border-color: rgba(56,189,248,0.45);
        color: #38bdf8;
      }

      /* ── Contenido ── */
      .vac2026-content { padding: 20px; max-width: 1100px; margin: 0 auto; }

      /* ── Sección ── */
      .vac2026-seccion { margin-bottom: 28px; }
      .vac2026-sec-titulo {
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.07em;
        text-transform: uppercase;
        color: #94a3b8;
        margin-bottom: 10px;
        padding-bottom: 5px;
        border-bottom: 1px solid rgba(255,255,255,0.08);
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .vac2026-sec-dot {
        width: 10px; height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      /* ── Grid de tarjetas ── */
      .vac2026-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 10px;
      }

      /* ── Tarjeta ── */
      .vac2026-card {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px;
        overflow: hidden;
        transition: border-color 0.15s;
      }
      .vac2026-card.expandida { border-color: rgba(56,189,248,0.4); }
      .vac2026-card-header {
        padding: 11px 14px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 9px;
        user-select: none;
        -webkit-user-select: none;
      }
      .vac2026-card-header:hover { background: rgba(255,255,255,0.04); }
      .vac2026-badge {
        font-size: 10.5px;
        font-weight: 600;
        padding: 2px 9px;
        border-radius: 10px;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .vac2026-card-nombre {
        font-size: 0.9rem;
        font-weight: 600;
        color: #e2e8f0;
        flex: 1;
      }
      .vac2026-card-chevron {
        font-size: 0.7rem;
        color: #64748b;
        transition: transform 0.2s;
        flex-shrink: 0;
      }
      .vac2026-card.expandida .vac2026-card-chevron { transform: rotate(180deg); }

      .vac2026-card-body {
        display: none;
        padding: 0 14px 14px;
        font-size: 0.82rem;
        line-height: 1.55;
        color: #94a3b8;
        border-top: 1px solid rgba(255,255,255,0.07);
      }
      .vac2026-card.expandida .vac2026-card-body { display: block; }
      .vac2026-card-previene {
        margin: 10px 0 6px;
        color: #cbd5e1;
      }
      .vac2026-row-label {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #64748b;
        margin: 10px 0 5px;
      }
      .vac2026-pills {
        display: flex; flex-wrap: wrap; gap: 5px;
      }
      .vac2026-pill {
        font-size: 11px;
        padding: 3px 9px;
        border-radius: 10px;
        background: rgba(255,255,255,0.07);
        border: 1px solid rgba(255,255,255,0.12);
        color: #94a3b8;
      }
      .vac2026-nota {
        border-radius: 8px;
        padding: 9px 12px;
        margin-top: 10px;
        font-size: 0.79rem;
        line-height: 1.5;
      }
      .vac2026-nota.warn   { background: rgba(254,243,199,0.08); border: 1px solid rgba(251,191,36,0.22); color: #fcd34d; }
      .vac2026-nota.info   { background: rgba(219,234,254,0.06); border: 1px solid rgba(96,165,250,0.22); color: #93c5fd; }
      .vac2026-nota.ok     { background: rgba(209,250,229,0.06); border: 1px solid rgba(52,211,153,0.22); color: #6ee7b7; }
      .vac2026-nota.danger { background: rgba(254,226,226,0.07); border: 1px solid rgba(252,165,165,0.22); color: #fca5a5; }

      /* ── Tabla ── */
      .vac2026-table-wrap { overflow-x: auto; }
      .vac2026-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.8rem;
        min-width: 480px;
      }
      .vac2026-table th {
        background: rgba(56,189,248,0.12);
        color: #38bdf8;
        padding: 8px 12px;
        text-align: left;
        border: 1px solid rgba(56,189,248,0.15);
        font-weight: 600;
        font-size: 0.75rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .vac2026-table td {
        padding: 8px 12px;
        border: 1px solid rgba(255,255,255,0.07);
        color: #cbd5e1;
        vertical-align: top;
        line-height: 1.5;
      }
      .vac2026-table tr:nth-child(even) td { background: rgba(255,255,255,0.025); }
      .vac2026-table tr:hover td { background: rgba(56,189,248,0.05); }
      .vac2026-table td:first-child { font-weight: 600; color: #e2e8f0; white-space: nowrap; }

      /* Tabla intervalos */
      .vac2026-int-warn { color: #fcd34d; }
      .vac2026-int-ok   { color: #6ee7b7; }

      /* ── Mnemotecnia ── */
      .vac2026-mnemo-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 10px;
      }
      .vac2026-mnemo-card {
        background: rgba(254,243,199,0.05);
        border: 1px solid rgba(251,191,36,0.18);
        border-radius: 10px;
        padding: 14px;
      }
      .vac2026-mnemo-titulo {
        font-size: 0.82rem;
        font-weight: 700;
        color: #fcd34d;
        margin-bottom: 6px;
      }
      .vac2026-mnemo-texto {
        font-size: 0.79rem;
        color: #94a3b8;
        line-height: 1.55;
        white-space: pre-line;
      }

      /* ── Botón admin editar ── */
      .vac2026-btn-editar {
        display: none;
        margin-top: 8px;
        padding: 4px 12px;
        border-radius: 7px;
        border: 1px solid rgba(251,191,36,0.35);
        background: rgba(251,191,36,0.07);
        color: #fbbf24;
        font-size: 0.75rem;
        cursor: pointer;
        transition: background 0.14s;
      }
      .vac2026-btn-editar.visible { display: inline-block; }
      .vac2026-btn-editar:hover { background: rgba(251,191,36,0.15); }

      /* ── Modal edición admin ── */
      .vac2026-modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 99999;
        background: rgba(5,10,24,0.88);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      .vac2026-modal {
        background: #0d1f35;
        border: 1px solid rgba(56,189,248,0.25);
        border-radius: 14px;
        padding: 24px;
        width: 100%;
        max-width: 520px;
        max-height: 80vh;
        overflow-y: auto;
      }
      .vac2026-modal h3 {
        color: #38bdf8;
        font-size: 1rem;
        margin: 0 0 16px;
      }
      .vac2026-modal label {
        display: block;
        font-size: 0.78rem;
        color: #64748b;
        margin-bottom: 4px;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .vac2026-modal textarea,
      .vac2026-modal input[type="text"] {
        width: 100%;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 8px;
        color: #e2e8f0;
        font-size: 0.83rem;
        padding: 8px 12px;
        margin-bottom: 12px;
        resize: vertical;
        font-family: inherit;
        box-sizing: border-box;
        line-height: 1.5;
      }
      .vac2026-modal textarea:focus,
      .vac2026-modal input[type="text"]:focus {
        outline: none;
        border-color: rgba(56,189,248,0.5);
      }
      .vac2026-modal-btns {
        display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px;
      }
      .vac2026-modal-btn-cancel {
        padding: 8px 18px; border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.15);
        background: transparent; color: #94a3b8;
        font-size: 0.84rem; cursor: pointer; transition: all 0.14s;
      }
      .vac2026-modal-btn-cancel:hover { background: rgba(255,255,255,0.07); }
      .vac2026-modal-btn-save {
        padding: 8px 18px; border-radius: 8px;
        border: 1px solid rgba(52,211,153,0.4);
        background: rgba(52,211,153,0.1); color: #34d399;
        font-size: 0.84rem; font-weight: 600; cursor: pointer; transition: all 0.14s;
      }
      .vac2026-modal-btn-save:hover { background: rgba(52,211,153,0.2); }

      /* ── Botón flotante volver al cuestionario ── */
      #vac2026-btn-volver-cuestionario {
        display: none;
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9000;
        background: linear-gradient(135deg, #0891b2, #0d7490);
        color: #fff;
        border: none;
        border-radius: 24px;
        padding: 11px 24px;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(8,145,178,0.45);
        transition: all 0.18s;
        white-space: nowrap;
      }
      #vac2026-btn-volver-cuestionario.visible { display: block; }
      #vac2026-btn-volver-cuestionario:hover {
        background: linear-gradient(135deg, #0d7490, #0e6680);
        box-shadow: 0 6px 24px rgba(8,145,178,0.6);
        transform: translateX(-50%) translateY(-2px);
      }

      /* ── Botón "VER MÁS SOBRE VACUNAS" en explicaciones ── */
      .vac2026-ver-mas-btn {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        margin-top: 14px;
        padding: 9px 18px;
        border-radius: 10px;
        border: 1.5px solid rgba(56,189,248,0.4);
        background: rgba(56,189,248,0.08);
        color: #38bdf8;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.16s;
        white-space: nowrap;
        font-family: inherit;
      }
      .vac2026-ver-mas-btn:hover {
        background: rgba(56,189,248,0.16);
        border-color: rgba(56,189,248,0.7);
        transform: translateY(-1px);
        box-shadow: 0 4px 14px rgba(56,189,248,0.2);
      }

      /* ── Botón ícono 💉 en toolbar admin ── */
      .vac2026-inject-toolbar-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 28px;
        height: 26px;
        background: rgba(56,189,248,0.08);
        border: 1.5px solid rgba(56,189,248,0.3);
        color: #38bdf8;
        border-radius: 5px;
        font-size: 0.82rem;
        cursor: pointer;
        transition: background 0.14s, border-color 0.14s;
        padding: 0 6px;
        line-height: 1;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .vac2026-inject-toolbar-btn:hover {
        background: rgba(56,189,248,0.18);
        border-color: rgba(56,189,248,0.6);
      }
    `;
    document.head.appendChild(st);
  }

  // ══════════════════════════════════════════════════════════════════
  // CONSTRUIR PANEL HTML
  // ══════════════════════════════════════════════════════════════════
  function construirPanel() {
    if (document.getElementById('vac2026-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'vac2026-panel';
    panel.innerHTML = `
      <div class="vac2026-header">
        <div class="vac2026-header-top">
          <button class="vac2026-btn-volver" onclick="window.mostrarVacunas2026VolverMenu()">← Volver al Menú</button>
          <span class="vac2026-titulo">💉 Calendario Nacional de Vacunación 2026</span>
          <span class="vac2026-subtitulo">Argentina · Ministerio de Salud</span>
        </div>
        <div class="vac2026-tabs">
          <button class="vac2026-tab activo" onclick="window._vac2026Tab('clasificacion',this)">Clasificación</button>
          <button class="vac2026-tab" onclick="window._vac2026Tab('edad',this)">Tabla por edad</button>
          <button class="vac2026-tab" onclick="window._vac2026Tab('intervalos',this)">Intervalos e interacciones</button>
        </div>
      </div>
      <div class="vac2026-content">
        <div id="vac2026-tab-clasificacion"></div>
        <div id="vac2026-tab-edad"        style="display:none"></div>
        <div id="vac2026-tab-intervalos"  style="display:none"></div>
      </div>
    `;
    document.body.appendChild(panel);

    // Botón flotante volver al cuestionario
    if (!document.getElementById('vac2026-btn-volver-cuestionario')) {
      const btnVolver = document.createElement('button');
      btnVolver.id = 'vac2026-btn-volver-cuestionario';
      btnVolver.textContent = '← Volver al Cuestionario';
      btnVolver.onclick = () => window.volverDesdVacunas2026AlCuestionario();
      document.body.appendChild(btnVolver);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // RENDERIZAR TABS
  // ══════════════════════════════════════════════════════════════════
  function renderClasificacion() {
    const data = cargarDatos();
    const cont = document.getElementById('vac2026-tab-clasificacion');
    if (!cont) return;
    const admin = esAdmin();
    let html = '';
    data.clasificacion.forEach((sec, si) => {
      html += `<div class="vac2026-seccion">
        <div class="vac2026-sec-titulo">
          <span class="vac2026-sec-dot" style="background:${sec.color}"></span>
          ${sec.tipo}
        </div>
        <div class="vac2026-grid">`;
      sec.vacunas.forEach((vac, vi) => {
        const badgeBg  = sec.colorClar;
        const badgeTxt = sec.color;
        html += `
          <div class="vac2026-card" id="vac-card-${si}-${vi}">
            <div class="vac2026-card-header" onclick="window._vac2026Toggle(${si},${vi})">
              <span class="vac2026-badge" style="background:${badgeBg};color:${badgeTxt}">${vac.badge}</span>
              <span class="vac2026-card-nombre">${vac.nombre}</span>
              <span class="vac2026-card-chevron">▼</span>
            </div>
            <div class="vac2026-card-body">
              <div class="vac2026-card-previene">${vac.previene}</div>
              <div class="vac2026-row-label">Calendario</div>
              <div class="vac2026-pills">${vac.dosis.map(d => `<span class="vac2026-pill">${d}</span>`).join('')}</div>
              <div class="vac2026-nota ${vac.notaTipo}">${vac.nota}</div>
              ${admin ? `<button class="vac2026-btn-editar visible" onclick="window._vac2026EditarVacuna(${si},${vi})">✏️ Editar</button>` : ''}
            </div>
          </div>`;
      });
      html += '</div></div>';
    });
    cont.innerHTML = html;
  }

  function renderEdad() {
    const data = cargarDatos();
    const cont = document.getElementById('vac2026-tab-edad');
    if (!cont) return;
    const admin = esAdmin();
    let html = `<div class="vac2026-table-wrap">
      <table class="vac2026-table">
        <thead><tr><th>Edad / Grupo</th><th>Vacunas</th><th>Nota clave</th></tr></thead>
        <tbody>`;
    data.edadTabla.forEach((row, i) => {
      html += `<tr>
        <td>${row.edad}</td>
        <td>${row.vacunas}</td>
        <td>${row.nota}</td>
      </tr>`;
    });
    html += '</tbody></table></div>';
    if (admin) {
      html += `<button class="vac2026-btn-editar visible" style="margin-top:14px" onclick="window._vac2026EditarTablaEdad()">✏️ Editar tabla de edades (JSON)</button>`;
    }
    cont.innerHTML = html;
  }

  function renderIntervalos() {
    const data = cargarDatos();
    const cont = document.getElementById('vac2026-tab-intervalos');
    if (!cont) return;
    const admin = esAdmin();
    let html = `
      <div class="vac2026-seccion">
        <div class="vac2026-sec-titulo">⏱ Regla de oro: intervalos entre tipos de vacunas</div>
        <div class="vac2026-table-wrap">
          <table class="vac2026-table">
            <thead><tr><th>Combinación</th><th>Regla / Intervalo</th></tr></thead>
            <tbody>`;
    data.intervalos.forEach((row, i) => {
      html += `<tr>
        <td>${row.combinacion}</td>
        <td class="vac2026-int-${row.tipo}">${row.regla}</td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
    if (admin) {
      html += `<button class="vac2026-btn-editar visible" style="margin-top:14px" onclick="window._vac2026EditarIntervalos()">✏️ Editar intervalos (JSON)</button>`;
    }
    html += '</div>';

    html += `<div class="vac2026-seccion">
      <div class="vac2026-sec-titulo">🧠 Reglas mnemotécnicas</div>
      <div class="vac2026-mnemo-grid">`;
    data.mnemotecnia.forEach((m, i) => {
      html += `<div class="vac2026-mnemo-card">
        <div class="vac2026-mnemo-titulo">${m.titulo}</div>
        <div class="vac2026-mnemo-texto">${m.texto}</div>
        ${admin ? `<button class="vac2026-btn-editar visible" onclick="window._vac2026EditarMnemo(${i})">✏️ Editar</button>` : ''}
      </div>`;
    });
    html += '</div></div>';
    cont.innerHTML = html;
  }

  function renderTodo() {
    renderClasificacion();
    renderEdad();
    renderIntervalos();
  }

  // ══════════════════════════════════════════════════════════════════
  // FUNCIONES GLOBALES DE UI
  // ══════════════════════════════════════════════════════════════════
  window._vac2026Tab = function(tabId, btn) {
    document.querySelectorAll('.vac2026-tab').forEach(t => t.classList.remove('activo'));
    btn.classList.add('activo');
    ['clasificacion','edad','intervalos'].forEach(id => {
      const el = document.getElementById(`vac2026-tab-${id}`);
      if (el) el.style.display = id === tabId ? '' : 'none';
    });
  };

  window._vac2026Toggle = function(si, vi) {
    const card = document.getElementById(`vac-card-${si}-${vi}`);
    if (!card) return;
    // Cerrar todas las demás tarjetas de la misma sección
    document.querySelectorAll('.vac2026-card.expandida').forEach(c => {
      if (c !== card) c.classList.remove('expandida');
    });
    card.classList.toggle('expandida');
  };

  // ── Edición admin — vacuna individual ────────────────────────────
  window._vac2026EditarVacuna = function(si, vi) {
    const data = cargarDatos();
    const vac  = data.clasificacion[si].vacunas[vi];
    abrirModal('Editar vacuna', [
      { label: 'Nombre',   key: 'nombre',   val: vac.nombre,   type: 'text'     },
      { label: 'Badge',    key: 'badge',    val: vac.badge,    type: 'text'     },
      { label: 'Previene', key: 'previene', val: vac.previene, type: 'text'     },
      { label: 'Dosis (una por línea)', key: 'dosis', val: vac.dosis.join('\n'), type: 'textarea', rows: 4 },
      { label: 'Nota',     key: 'nota',     val: vac.nota,     type: 'textarea', rows: 3 },
      { label: 'Tipo nota (warn/info/ok/danger)', key: 'notaTipo', val: vac.notaTipo, type: 'text' }
    ], function(vals) {
      data.clasificacion[si].vacunas[vi].nombre   = vals.nombre;
      data.clasificacion[si].vacunas[vi].badge    = vals.badge;
      data.clasificacion[si].vacunas[vi].previene = vals.previene;
      data.clasificacion[si].vacunas[vi].dosis    = vals.dosis.split('\n').map(s => s.trim()).filter(Boolean);
      data.clasificacion[si].vacunas[vi].nota     = vals.nota;
      data.clasificacion[si].vacunas[vi].notaTipo = vals.notaTipo;
      guardarDatos(data);
      renderClasificacion();
    });
  };

  window._vac2026EditarMnemo = function(i) {
    const data = cargarDatos();
    const m    = data.mnemotecnia[i];
    abrirModal('Editar mnemotecnia', [
      { label: 'Título', key: 'titulo', val: m.titulo, type: 'text' },
      { label: 'Texto',  key: 'texto',  val: m.texto,  type: 'textarea', rows: 4 }
    ], function(vals) {
      data.mnemotecnia[i].titulo = vals.titulo;
      data.mnemotecnia[i].texto  = vals.texto;
      guardarDatos(data);
      renderIntervalos();
    });
  };

  window._vac2026EditarTablaEdad = function() {
    const data = cargarDatos();
    abrirModal('Editar tabla por edad (JSON)', [
      { label: 'Array JSON (edad, vacunas, nota)', key: 'json', val: JSON.stringify(data.edadTabla, null, 2), type: 'textarea', rows: 18 }
    ], function(vals) {
      try {
        data.edadTabla = JSON.parse(vals.json);
        guardarDatos(data);
        renderEdad();
      } catch(e) { alert('JSON inválido: ' + e.message); }
    });
  };

  window._vac2026EditarIntervalos = function() {
    const data = cargarDatos();
    abrirModal('Editar intervalos (JSON)', [
      { label: 'Array JSON (combinacion, regla, tipo)', key: 'json', val: JSON.stringify(data.intervalos, null, 2), type: 'textarea', rows: 18 }
    ], function(vals) {
      try {
        data.intervalos = JSON.parse(vals.json);
        guardarDatos(data);
        renderIntervalos();
      } catch(e) { alert('JSON inválido: ' + e.message); }
    });
  };

  // ── Modal genérico de edición ─────────────────────────────────────
  function abrirModal(titulo, campos, onGuardar) {
    const overlay = document.createElement('div');
    overlay.className = 'vac2026-modal-overlay';
    let fieldsHtml = '';
    campos.forEach(c => {
      if (c.type === 'textarea') {
        fieldsHtml += `<label>${c.label}</label><textarea rows="${c.rows||4}" data-key="${c.key}">${c.val.replace(/</g,'&lt;')}</textarea>`;
      } else {
        fieldsHtml += `<label>${c.label}</label><input type="text" data-key="${c.key}" value="${c.val.replace(/"/g,'&quot;')}">`;
      }
    });
    overlay.innerHTML = `
      <div class="vac2026-modal">
        <h3>✏️ ${titulo}</h3>
        ${fieldsHtml}
        <div class="vac2026-modal-btns">
          <button class="vac2026-modal-btn-cancel">Cancelar</button>
          <button class="vac2026-modal-btn-save">💾 Guardar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('.vac2026-modal-btn-cancel').onclick = () => overlay.remove();
    overlay.querySelector('.vac2026-modal-btn-save').onclick = () => {
      const vals = {};
      overlay.querySelectorAll('[data-key]').forEach(el => { vals[el.dataset.key] = el.value; });
      onGuardar(vals);
      overlay.remove();
    };
    // click fuera cierra
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  }

  // ══════════════════════════════════════════════════════════════════
  // NAVEGACIÓN — hash #vacunas2026
  // ══════════════════════════════════════════════════════════════════
  // _origenCuestionario: hash del cuestionario desde donde se accedió
  let _origenCuestionario = null;

  function mostrarPanel(opts) {
    // opts: { desde: 'menu' | 'cuestionario', origenHash: '#pediatria' }
    opts = opts || {};

    inyectarEstilos();
    construirPanel();
    renderTodo();

    // Ocultar todo lo demás
    document.getElementById('menu-principal')?.classList.add('oculto');
    document.querySelectorAll('.pagina-cuestionario').forEach(p => p.classList.remove('activa'));
    const buscador = document.getElementById('buscador-panel');
    if (buscador) buscador.style.display = 'none';

    document.getElementById('vac2026-panel').classList.add('activo');
    window.scrollTo(0, 0);

    // Botón volver al cuestionario solo si se llegó desde un cuestionario
    const btnVolver = document.getElementById('vac2026-btn-volver-cuestionario');
    if (btnVolver) {
      if (opts.desde === 'cuestionario' && opts.origenHash) {
        _origenCuestionario = opts.origenHash;
        btnVolver.classList.add('visible');
      } else {
        _origenCuestionario = null;
        btnVolver.classList.remove('visible');
      }
    }

    // Resetear al tab clasificacion
    document.querySelectorAll('.vac2026-tab').forEach(t => t.classList.remove('activo'));
    const tabClasif = document.querySelector('.vac2026-tab');
    if (tabClasif) tabClasif.classList.add('activo');
    ['clasificacion','edad','intervalos'].forEach(id => {
      const el = document.getElementById(`vac2026-tab-${id}`);
      if (el) el.style.display = id === 'clasificacion' ? '' : 'none';
    });

    history.pushState({ vacunas2026: true, desde: opts.desde, origenHash: opts.origenHash }, 'Vacunas 2026', '#vacunas2026');
  }

  function ocultarPanel() {
    const panel = document.getElementById('vac2026-panel');
    if (panel) panel.classList.remove('activo');
    const btnVolver = document.getElementById('vac2026-btn-volver-cuestionario');
    if (btnVolver) btnVolver.classList.remove('visible');
    _origenCuestionario = null;
  }

  // Volver al menú principal
  window.mostrarVacunas2026VolverMenu = function() {
    ocultarPanel();
    if (typeof window.volverAlMenu === 'function') window.volverAlMenu();
    else history.replaceState({ section: null }, 'Menú Principal', '#menu');
  };

  // Volver al cuestionario de origen
  window.volverDesdVacunas2026AlCuestionario = function() {
    const hash = _origenCuestionario;
    ocultarPanel();
    if (hash) {
      const seccionId = hash.replace(/^#/, '');
      if (typeof window.mostrarCuestionario === 'function') {
        window.mostrarCuestionario(seccionId);
      } else {
        history.replaceState({ section: seccionId }, seccionId, '#' + seccionId);
      }
    }
  };

  // Punto de entrada público: desde menú
  window.mostrarVacunas2026 = function() {
    mostrarPanel({ desde: 'menu' });
  };

  // Punto de entrada: desde botón en explicación
  window.mostrarVacunas2026DesdeCuestionario = function(seccionId) {
    mostrarPanel({ desde: 'cuestionario', origenHash: '#' + seccionId });
  };

  // ── Integración con popstate ──────────────────────────────────────
  window.addEventListener('popstate', function(e) {
    if (e.state && e.state.vacunas2026) {
      mostrarPanel({ desde: e.state.desde, origenHash: e.state.origenHash });
    } else {
      // Si estábamos en vacunas y se hace back, ocultar panel
      const panel = document.getElementById('vac2026-panel');
      if (panel && panel.classList.contains('activo')) {
        ocultarPanel();
      }
    }
  });

  // ── Manejar hash directo en la URL al cargar ─────────────────────
  document.addEventListener('DOMContentLoaded', function() {
    if (window.location.hash === '#vacunas2026') {
      inyectarEstilos();
      construirPanel();
      renderTodo();
      mostrarPanel({ desde: 'menu' });
    }
  });

  // ══════════════════════════════════════════════════════════════════
  // INYECTAR BOTÓN "VER MÁS SOBRE VACUNAS" EN EXPLICACIONES
  // Llamado desde editor-admin.js (fbInjectVacunasButtonIfAdmin)
  // y también desde script.js cuando se renderiza una explicación
  // ══════════════════════════════════════════════════════════════════
  window.fbInjectVacunasButton = function(seccionId, explicacionDiv) {
    // No duplicar
    if (explicacionDiv.querySelector('.vac2026-ver-mas-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'vac2026-ver-mas-btn';
    btn.innerHTML = '💉 VER MÁS SOBRE VACUNAS';
    btn.title = 'Ir al Calendario Nacional de Vacunación 2026';
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      window.mostrarVacunas2026DesdeCuestionario(seccionId);
    });
    explicacionDiv.appendChild(btn);
  };

  // ══════════════════════════════════════════════════════════════════
  // INYECTAR BOTÓN 💉 EN TOOLBAR DEL EDITOR ADMIN
  // Se llama desde editor-admin.js después de construir la toolbar
  // ══════════════════════════════════════════════════════════════════
  window.fbInjectVacunasToolbarBtn = function(toolbarGrupos, seccionId) {
    // No duplicar
    if (toolbarGrupos.querySelector('.vac2026-inject-toolbar-btn')) return;
    inyectarEstilos();
    const sep = document.createElement('span');
    sep.className = 'meq-sep';
    toolbarGrupos.appendChild(sep);

    const btn = document.createElement('button');
    btn.className = 'meq-btn-fmt vac2026-inject-toolbar-btn';
    btn.type = 'button';
    btn.title = 'Insertar botón "VER MÁS SOBRE VACUNAS" en la explicación';
    btn.innerHTML = '💉 Ver vacunas';
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      // Insertar HTML del botón directamente en el WYSIWYG
      const marcador = `<a href="#vacunas2026" class="vac2026-ver-mas-btn" data-vacunas-btn="1" style="display:inline-flex;align-items:center;gap:7px;margin-top:14px;padding:9px 18px;border-radius:10px;border:1.5px solid rgba(56,189,248,0.4);background:rgba(56,189,248,0.08);color:#0891b2;font-size:0.85rem;font-weight:600;text-decoration:none;">💉 VER MÁS SOBRE VACUNAS</a>`;
      document.execCommand('insertHTML', false, marcador);
    });
    toolbarGrupos.appendChild(btn);
  };

})();
