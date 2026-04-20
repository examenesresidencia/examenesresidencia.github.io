// ════════════════════════════════════════════════════════════════
// calendario-vacunacion.js  — v2
// Rediseño completo: bug de tarjetas en blanco corregido,
// diseño profesional con acordeón de una columna por grupo
// ════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  const DATA_KEY = 'vacunas2026_data_v2';

  const GRUPOS_META = [
    { tipo:'VÍRICAS — VIVAS ATENUADAS',          icon:'🦠', color:'#16a34a', bg:'rgba(22,163,74,0.07)',   border:'rgba(22,163,74,0.28)'  },
    { tipo:'VÍRICAS — INACTIVAS — VIRUS ENTEROS', icon:'🧬', color:'#2563eb', bg:'rgba(37,99,235,0.07)',   border:'rgba(37,99,235,0.28)'  },
    { tipo:'VÍRICAS — INACTIVAS — SUBUNIDADES',   icon:'🔬', color:'#0891b2', bg:'rgba(8,145,178,0.07)',   border:'rgba(8,145,178,0.28)'  },
    { tipo:'BACTERIANAS — VIVAS ATENUADAS',        icon:'🧫', color:'#7c3aed', bg:'rgba(124,58,237,0.07)',  border:'rgba(124,58,237,0.28)' },
    { tipo:'BACTERIANAS — MUERTAS / INACTIVAS',    icon:'⚗️', color:'#d97706', bg:'rgba(217,119,6,0.07)',   border:'rgba(217,119,6,0.28)'  },
    { tipo:'ZONA DE RIESGO EXCLUSIVO',             icon:'⚠️', color:'#dc2626', bg:'rgba(220,38,38,0.07)',   border:'rgba(220,38,38,0.28)'  }
  ];

  const DATA_DEFAULT = {
    clasificacion: [
      { tipo:'VÍRICAS — VIVAS ATENUADAS', icon:'🦠', color:'#16a34a', vacunas:[
        { nombre:'Triple Viral (SPR)',    badge:'Viva atenuada',       previene:'Sarampión, rubéola y parotiditis.',
          dosis:['1ª dosis: 12 meses','2ª dosis: 18 meses','Recupero: 15 años+'],
          nota:'4 semanas entre dosis. Si no se da el mismo día que otra viva inyectable, esperar 4 semanas. Ig: esperar 3–11 meses ANTES de vacunar según dosis de Ig.', notaTipo:'warn' },
        { nombre:'Varicela',              badge:'Viva atenuada',       previene:'Varicela.',
          dosis:['1ª: 15 meses','2ª: al cumplir 5 años (nac. 2021–24)','2° refuerzo: nac. 2015'],
          nota:'Mismas restricciones que Triple Viral. Mínimo 4 semanas entre dosis.', notaTipo:'warn' },
        { nombre:'Rotavirus',             badge:'Viva oral',           previene:'Gastroenteritis grave por rotavirus.',
          dosis:['1ª: 2 meses (antes 14 sem 6 días)','2ª: 4 meses (antes 6 meses)'],
          nota:'ORAL: sin restricción de intervalo con inyectables ni Ig. Ventana de edad estricta.', notaTipo:'ok' },
        { nombre:'Fiebre Amarilla',       badge:'Viva atenuada',       previene:'Fiebre amarilla.',
          dosis:['1ª: 18 meses','Refuerzo: nac. 2015','Adultos zona riesgo: única dosis'],
          nota:'Contraindicada en embarazadas e inmunocomprometidos. 4 semanas con otras vivas inyectables.', notaTipo:'warn' }
      ]},
      { tipo:'VÍRICAS — INACTIVAS — VIRUS ENTEROS', icon:'🧬', color:'#2563eb', vacunas:[
        { nombre:'IPV (Polio inyectable)', badge:'Inactiva',           previene:'Poliomielitis.',
          dosis:['1ª: 2 m','2ª: 4 m','3ª: 6 m','Refuerzo: 18 meses'],
          nota:'Inactivada: sin restricción de intervalo con ningún otro biológico.', notaTipo:'info' },
        { nombre:'Antigripal',             badge:'Inactiva',           previene:'Influenza estacional.',
          dosis:['Anual: desde 6 meses hasta 24 meses','2 dosis si es la 1ª vez (sep. 4 semanas)','Embarazadas · Puérperas · Personal salud · 65+'],
          nota:'Inactivada. Compatible con otras vacunas y con gammaglobulinas.', notaTipo:'info' },
        { nombre:'Hepatitis A',            badge:'Inactiva',           previene:'Hepatitis A.',
          dosis:['Única dosis: 12 meses','Recupero: desde 15 años'],
          nota:'Inactivada. Sin restricciones de intervalo.', notaTipo:'info' },
        { nombre:'Meningococo ACYW',       badge:'Inactiva conjugada', previene:'Meningitis y sepsis meningocócica.',
          dosis:['1ª: 3 m','2ª: 5 m','Refuerzo: 15 m','Única: nac. 2015'],
          nota:'Conjugada inactivada. Sin restricciones de intervalo.', notaTipo:'info' }
      ]},
      { tipo:'VÍRICAS — INACTIVAS — SUBUNIDADES', icon:'🔬', color:'#0891b2', vacunas:[
        { nombre:'Hepatitis B',            badge:'Subunidad',          previene:'Hepatitis B.',
          dosis:['Neonatal: primeras 12 hs de vida','Adultos: iniciar o completar esquema'],
          nota:'Puede coincidir con Ig anti-HepB al nacer (sitios distintos). Sin restricción con otras inactivadas.', notaTipo:'info' },
        { nombre:'VPH',                    badge:'Subunidad (VLP)',    previene:'Virus Papiloma Humano.',
          dosis:['Nac. 2015: única dosis','Adultos: refuerzo cada 10 años'],
          nota:'Sin restricciones de intervalo ni con Ig.', notaTipo:'info' },
        { nombre:'Doble Bacteriana (dT)',  badge:'Toxoide',            previene:'Difteria y tétanos.',
          dosis:['Refuerzo cada 10 años en adultos'],
          nota:'Compatible con Ig antitetánica (sitios distintos). Toxoide = inactivada.', notaTipo:'info' },
        { nombre:'VSR (nirsevimab)',        badge:'Biológico',          previene:'Bronquiolitis y neumonía por VSR hasta los 6 meses.',
          dosis:['Embarazadas: 1 dosis (sem 32–36,6 en temporada VSR)','Nac. 2021–24: según esquema'],
          nota:'Anticuerpo monoclonal (no vacuna clásica). Consultar contraindicaciones con el equipo de salud.', notaTipo:'warn' }
      ]},
      { tipo:'BACTERIANAS — VIVAS ATENUADAS', icon:'🧫', color:'#7c3aed', vacunas:[
        { nombre:'BCG',                    badge:'Bacteria viva',      previene:'Formas graves de tuberculosis.',
          dosis:['Única dosis: recién nacido (antes de egresar maternidad)'],
          nota:'Bacteriana viva. Contraindicada en inmunocomprometidos. Sin restricción especial con otras vacunas neonatales.', notaTipo:'warn' }
      ]},
      { tipo:'BACTERIANAS — MUERTAS / INACTIVAS', icon:'⚗️', color:'#d97706', vacunas:[
        { nombre:'Neumococo conjugada',    badge:'Bacteria inactiva',  previene:'Meningitis, neumonía y sepsis por neumococo.',
          dosis:['1ª: 2 m','2ª: 4 m','3ª: 6 m','Refuerzo: 12 m','65+: única dosis'],
          nota:'Conjugada inactivada. Sin restricciones.', notaTipo:'info' },
        { nombre:'Quíntuple / Pentavalente',badge:'Bacteria inactiva', previene:'Difteria, Tétanos, Tos convulsa, HepB, Hib.',
          dosis:['1ª: 2 m','2ª: 4 m','3ª: 6 m','Refuerzo: 18 meses'],
          nota:'Inactivada combinada. Sin restricciones.', notaTipo:'info' },
        { nombre:'Triple Bact. Celular (DTP)',badge:'Bacteria inactiva',previene:'Difteria, Tétanos y Tos convulsa.',
          dosis:['Refuerzo: nac. 2021 (6 años)','2° refuerzo: nac. 2015'],
          nota:'Inactivada. Sin restricciones.', notaTipo:'info' },
        { nombre:'Triple Bact. Acelular (TDPa)',badge:'Toxoide acelular',previene:'Difteria, Tétanos y Tos convulsa (acelular).',
          dosis:['Embarazadas: 1 dosis por embarazo (desde sem. 20)','Puérperas: 1 dosis si no recibieron antes del parto','Personal salud: 1 dosis'],
          nota:'En CADA embarazo desde sem. 20, independientemente de dosis previas. Los anticuerpos maternos protegen al recién nacido.', notaTipo:'warn' }
      ]},
      { tipo:'ZONA DE RIESGO EXCLUSIVO', icon:'⚠️', color:'#dc2626', vacunas:[
        { nombre:'Fiebre Hemorrágica Argentina',badge:'Zona de riesgo', previene:'Fiebre Hemorrágica Argentina.',
          dosis:['1 dosis: personas 2–59 años en zona endémica','Córdoba, Santa Fe, Bs As, La Pampa'],
          nota:'Viva atenuada. NO en embarazadas ni inmunocomprometidos. Misma regla de intervalo que otras vivas inyectables.', notaTipo:'danger' }
      ]}
    ],
    edadTabla:[
      {edad:'Recién nacido',  vacunas:'BCG  ·  Hepatitis B neonatal',                                          nota:'BCG antes de egresar; HepB en 1as 12 hs'},
      {edad:'2 meses',        vacunas:'Neumococo 1ª · Quíntuple 1ª · IPV 1ª · Rotavirus 1ª',                  nota:'Rota: antes 14 sem 6 días'},
      {edad:'3 meses',        vacunas:'Meningococo ACYW 1ª',                                                    nota:'—'},
      {edad:'4 meses',        vacunas:'Neumococo 2ª · Quíntuple 2ª · IPV 2ª · Rotavirus 2ª',                  nota:'Rota: antes 6 meses'},
      {edad:'5 meses',        vacunas:'Meningococo ACYW 2ª',                                                    nota:'—'},
      {edad:'6 meses',        vacunas:'Neumococo 3ª · Quíntuple 3ª · IPV 3ª',                                  nota:'—'},
      {edad:'12 meses',       vacunas:'Neumococo ref. · Hepatitis A · Triple Viral 1ª',                        nota:'—'},
      {edad:'15 meses',       vacunas:'Meningococo ref. · Varicela 1ª · Antigripal inicio',                    nota:'—'},
      {edad:'18 meses',       vacunas:'Quíntuple ref. · IPV ref. · Fiebre Amarilla · Triple Viral 2ª',        nota:'—'},
      {edad:'Nacidos 2021',   vacunas:'Quínt. ref. · Triple Viral 2ª · Varicela 2ª · DTP ref.',               nota:'Varicela 2ª al cumplir 5 años'},
      {edad:'Nacidos 2015',   vacunas:'Meningo · DTP 2° ref. · Doble Bact. · VPH · FA ref.',                   nota:'—'},
      {edad:'Desde 15 años',  vacunas:'Triple Viral (recupero) · Hepatitis A (recupero)',                      nota:'Si no completó esquema previo'},
      {edad:'Adultos',        vacunas:'HepB · Antigripal anual (65+) · Doble Bact. c/10a · Neumococo 65+',    nota:'HepB si no vacunado'},
      {edad:'Embarazadas',    vacunas:'Antigripal · TDPa · VSR (sem 32–36,6)',                                 nota:'TDPa en c/embarazo desde sem. 20'},
      {edad:'Puérperas',      vacunas:'Antigripal · TDPa',                                                     nota:'Hasta 10 días postparto'},
      {edad:'Personal salud', vacunas:'Antigripal anual · TDPa · DTP zona riesgo',                             nota:'Varones y mujeres'}
    ],
    intervalos:[
      {combinacion:'Viva iny. + Viva iny.',        regla:'Si NO es el mismo día: 4 SEMANAS mínimo. Si es el mismo día en sitios distintos: sin problema.',tipo:'warn'},
      {combinacion:'Viva oral + cualquier vac.',   regla:'SIN restricción (Rotavirus oral).',tipo:'ok'},
      {combinacion:'Inactivada + cualquier vac.',  regla:'SIN restricción. Cualquier orden y momento.',tipo:'ok'},
      {combinacion:'Ig → Vacuna VIVA (Ig primero)',regla:'IM estándar: 3 m. IV 0,1 g/kg: 3 m. IV 0,3–0,5 g/kg: 6 m. IV 1–2 g/kg: 11 MESES.',tipo:'warn'},
      {combinacion:'Vacuna VIVA → Ig (vac. prim.)',regla:'Esperar mínimo 2 SEMANAS antes de dar Ig. Si no fue posible: puede requerir revacunación.',tipo:'warn'},
      {combinacion:'Ig anti-HepB + HepB al nacer', regla:'COMPATIBLE. Sitios distintos. HepB es subunidad (inactivada).',tipo:'ok'},
      {combinacion:'Ig antitetánica + dT/TDPa',    regla:'COMPATIBLE. Sitios distintos. Toxoide = inactivada.',tipo:'ok'},
      {combinacion:'Ig + INACTIVADA',              regla:'SIN restricción. Las Ig no interfieren con vacunas inactivadas.',tipo:'ok'}
    ],
    mnemotecnia:[
      {titulo:'Vivas inyectables del calendario', texto:'Triple Viral · Varicela · Fiebre Amarilla · BCG · F. Hemorrágica Arg.\nSolo entre ellas aplica la regla de 4 semanas.\nSolo con ellas las Ig son un problema.'},
      {titulo:'"Gripe – Tos – VSR"',              texto:'Las 3 vacunas del embarazo.\nLas 3 protegen al recién nacido por inmunidad pasiva materna.'},
      {titulo:'INACTIVADA = SIN restricción',     texto:'Con Ig, con otras vacunas, en cualquier orden.\nSiempre compatible. Sin excepciones.'},
      {titulo:'Resumen de intervalos con Ig',     texto:'Ig → viva: 3 a 11 meses según dosis\nViva → Ig: 2 semanas\nIg + inactivada: sin restricción'}
    ]
  };

  function cargarDatos(){ try{const s=localStorage.getItem(DATA_KEY);return s?JSON.parse(s):JSON.parse(JSON.stringify(DATA_DEFAULT));}catch(_){return JSON.parse(JSON.stringify(DATA_DEFAULT));} }
  function guardarDatos(d){ try{localStorage.setItem(DATA_KEY,JSON.stringify(d));}catch(_){} }
  function esAdmin(){ return typeof window.fbIsAdmin==='function'&&window.fbIsAdmin(); }
  function meta(tipo){ return GRUPOS_META.find(x=>x.tipo===tipo)||{icon:'',color:'#64748b',bg:'rgba(100,116,139,0.06)',border:'rgba(100,116,139,0.2)'}; }

  // ════════════════════════════════════════════════════════════════
  // ESTILOS
  // ════════════════════════════════════════════════════════════════
  function inyectarEstilos(){
    if(document.getElementById('vac2026-st-v2'))return;
    const s=document.createElement('style');
    s.id='vac2026-st-v2';
    s.textContent=`
      #vac2026-panel{display:none;min-height:100vh;background:linear-gradient(160deg,#071220 0%,#0d2444 50%,#0a1628 100%);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;color:#e2e8f0;padding-bottom:100px;}
      #vac2026-panel.activo{display:block;}

      /* Header */
      .v26h{position:sticky;top:0;z-index:200;background:rgba(7,18,32,0.97);backdrop-filter:blur(18px);border-bottom:1px solid rgba(255,255,255,0.08);padding:0 24px;}
      .v26h-r1{display:flex;align-items:center;gap:12px;padding:13px 0 10px;flex-wrap:wrap;}
      .v26-back{display:inline-flex;align-items:center;gap:5px;padding:7px 15px;border-radius:8px;border:1px solid rgba(255,255,255,0.14);background:rgba(255,255,255,0.04);color:#94a3b8;font-size:0.83rem;font-weight:500;cursor:pointer;transition:all .15s;white-space:nowrap;font-family:inherit;}
      .v26-back:hover{background:rgba(255,255,255,0.1);color:#f1f5f9;}
      .v26-ttl{font-size:1.05rem;font-weight:700;color:#38bdf8;flex:1;letter-spacing:.01em;}
      .v26-sub{font-size:0.74rem;color:#475569;white-space:nowrap;}
      .v26-tabs{display:flex;gap:0;overflow-x:auto;scrollbar-width:none;border-top:1px solid rgba(255,255,255,0.05);}
      .v26-tabs::-webkit-scrollbar{display:none;}
      .v26-tab{padding:10px 22px;font-size:0.82rem;font-weight:500;color:#64748b;background:transparent;border:none;border-bottom:2px solid transparent;cursor:pointer;transition:all .15s;white-space:nowrap;font-family:inherit;}
      .v26-tab:hover{color:#94a3b8;}
      .v26-tab.on{color:#38bdf8;border-bottom-color:#38bdf8;}

      /* Body */
      .v26-body{padding:24px;max-width:960px;margin:0 auto;}

      /* Leyenda */
      .v26-legend{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:22px;padding:12px 16px;background:rgba(255,255,255,0.02);border-radius:10px;border:1px solid rgba(255,255,255,0.07);}
      .v26-leg-item{display:flex;align-items:center;gap:5px;font-size:0.71rem;color:#64748b;}
      .v26-leg-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}

      /* Grupo */
      .v26-grupo{margin-bottom:24px;border-radius:14px;overflow:hidden;border:1px solid;}
      .v26-grupo-hdr{display:flex;align-items:center;gap:10px;padding:12px 18px;border-bottom:1px solid rgba(255,255,255,0.06);}
      .v26-grupo-icon{font-size:1rem;flex-shrink:0;}
      .v26-grupo-tit{font-size:0.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;flex:1;}
      .v26-grupo-cnt{font-size:0.68rem;color:#475569;background:rgba(0,0,0,0.2);padding:2px 9px;border-radius:10px;}

      /* Acordeón — clave del bug fix:
         Las filas son flex-direction:column → cada fila ocupa su propio espacio.
         El detalle se controla con JS (display:block/none inline),
         NO con CSS de clase padre, evitando que el grid estire filas vecinas. */
      .v26-lista{display:flex;flex-direction:column;}
      .v26-vrow{border-bottom:1px solid rgba(255,255,255,0.05);}
      .v26-vrow:last-child{border-bottom:none;}

      .v26-vtrig{display:flex;align-items:center;gap:10px;padding:12px 18px;cursor:pointer;transition:background .13s;user-select:none;-webkit-user-select:none;}
      .v26-vtrig:hover{background:rgba(255,255,255,0.03);}
      .v26-vtrig.open{background:rgba(255,255,255,0.04);}

      .v26-vbadge{font-size:10px;font-weight:600;padding:2px 9px;border-radius:10px;white-space:nowrap;flex-shrink:0;border:1px solid;}
      .v26-vnom{flex:1;font-size:0.88rem;font-weight:600;color:#e2e8f0;}
      .v26-varr{width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:center;font-size:0.58rem;color:#64748b;flex-shrink:0;transition:transform .22s,background .14s,color .14s;}
      .v26-vtrig.open .v26-varr{transform:rotate(180deg);background:rgba(56,189,248,0.14);color:#38bdf8;}

      /* detalle: display se maneja 100% con JS, sin ninguna regla CSS de display */
      .v26-vdet{padding:0 18px 16px;animation:v26fi .18s ease both;}
      @keyframes v26fi{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:none}}
      .v26-vdet-in{border-radius:10px;padding:16px;border:1px solid;background:rgba(0,0,0,0.22);}
      .v26-vprev{font-size:0.84rem;color:#cbd5e1;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.06);}
      .v26-vlbl{font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#475569;margin-bottom:6px;}
      .v26-vdosis{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;}
      .v26-vdpill{font-size:0.77rem;padding:4px 12px;border-radius:20px;border:1px solid;background:rgba(0,0,0,0.15);white-space:nowrap;}
      .v26-vnota{font-size:0.79rem;line-height:1.55;padding:10px 13px;border-radius:8px;border-left:3px solid;}
      .v26-vnota.warn{background:rgba(251,191,36,0.08);border-color:#fbbf24;color:#fde68a;}
      .v26-vnota.info{background:rgba(56,189,248,0.07);border-color:#38bdf8;color:#bae6fd;}
      .v26-vnota.ok{background:rgba(52,211,153,0.07);border-color:#34d399;color:#a7f3d0;}
      .v26-vnota.danger{background:rgba(248,113,113,0.08);border-color:#f87171;color:#fecaca;}

      /* Tabla por edad */
      .v26-twrap{overflow-x:auto;border-radius:12px;}
      .v26-table{width:100%;border-collapse:collapse;font-size:0.8rem;min-width:460px;}
      .v26-table thead th{background:rgba(56,189,248,0.1);color:#38bdf8;padding:10px 14px;text-align:left;border:1px solid rgba(56,189,248,0.12);font-size:0.72rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;}
      .v26-table tbody td{padding:9px 14px;border:1px solid rgba(255,255,255,0.06);color:#cbd5e1;vertical-align:top;line-height:1.5;}
      .v26-table tbody tr:nth-child(even) td{background:rgba(255,255,255,0.02);}
      .v26-table tbody tr:hover td{background:rgba(56,189,248,0.04);}
      .v26-table tbody td:first-child{font-weight:700;color:#e2e8f0;white-space:nowrap;}

      /* Intervalos */
      .v26-int-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:10px;margin-bottom:28px;}
      .v26-int-card{border-radius:10px;padding:14px 16px;border:1px solid;}
      .v26-int-card.ok{background:rgba(52,211,153,0.05);border-color:rgba(52,211,153,0.22);}
      .v26-int-card.warn{background:rgba(251,191,36,0.05);border-color:rgba(251,191,36,0.22);}
      .v26-int-badge{display:inline-block;font-size:10px;font-weight:700;padding:2px 8px;border-radius:8px;margin-bottom:6px;letter-spacing:.04em;}
      .v26-int-card.ok .v26-int-badge{background:rgba(52,211,153,0.15);color:#34d399;}
      .v26-int-card.warn .v26-int-badge{background:rgba(251,191,36,0.14);color:#fbbf24;}
      .v26-int-combo{font-size:0.8rem;font-weight:700;margin-bottom:5px;}
      .v26-int-card.ok .v26-int-combo{color:#34d399;}
      .v26-int-card.warn .v26-int-combo{color:#fbbf24;}
      .v26-int-regla{font-size:0.77rem;line-height:1.55;color:#94a3b8;}

      /* Sección título */
      .v26-sec-tit{font-size:0.71rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#64748b;display:flex;align-items:center;gap:8px;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.07);}

      /* Mnemotecnia */
      .v26-mnemo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;}
      .v26-mnemo-card{border-radius:10px;padding:14px 16px;background:rgba(251,191,36,0.04);border:1px solid rgba(251,191,36,0.15);}
      .v26-mnemo-tit{font-size:0.81rem;font-weight:700;color:#fcd34d;margin-bottom:7px;}
      .v26-mnemo-txt{font-size:0.77rem;color:#94a3b8;line-height:1.6;white-space:pre-line;}

      /* Botón admin editar */
      .v26-bedit{display:none;margin-top:10px;padding:4px 11px;border-radius:7px;border:1px solid rgba(251,191,36,0.3);background:rgba(251,191,36,0.06);color:#fbbf24;font-size:0.74rem;cursor:pointer;transition:all .13s;font-family:inherit;}
      .v26-bedit.v{display:inline-block;}
      .v26-bedit:hover{background:rgba(251,191,36,0.14);}

      /* Botón flotante volver al cuestionario */
      #vac2026-btn-volver-quiz{display:none;position:fixed;bottom:28px;left:50%;transform:translateX(-50%);z-index:9900;background:linear-gradient(135deg,#0891b2,#0d7490);color:#fff;border:none;border-radius:24px;padding:12px 26px;font-size:0.88rem;font-weight:600;cursor:pointer;box-shadow:0 4px 22px rgba(8,145,178,0.45);transition:all .18s;white-space:nowrap;font-family:inherit;}
      #vac2026-btn-volver-quiz.vis{display:block;}
      #vac2026-btn-volver-quiz:hover{background:linear-gradient(135deg,#0d7490,#0e6680);box-shadow:0 6px 28px rgba(8,145,178,0.6);transform:translateX(-50%) translateY(-2px);}

      /* Botón VER MÁS SOBRE VACUNAS en explicaciones */
      .vac2026-ver-mas-btn{display:inline-flex;align-items:center;gap:7px;margin-top:14px;padding:9px 20px;border-radius:10px;border:1.5px solid rgba(56,189,248,0.45);background:rgba(56,189,248,0.08);color:#38bdf8;font-size:0.85rem;font-weight:600;cursor:pointer;transition:all .16s;white-space:nowrap;font-family:inherit;text-decoration:none;}
      .vac2026-ver-mas-btn:hover{background:rgba(56,189,248,0.18);border-color:rgba(56,189,248,0.7);transform:translateY(-1px);box-shadow:0 4px 14px rgba(56,189,248,0.2);}

      /* Toolbar editor */
      .vac2026-inject-toolbar-btn{display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:26px;background:rgba(56,189,248,0.08);border:1.5px solid rgba(56,189,248,0.3);color:#38bdf8;border-radius:5px;font-size:0.82rem;cursor:pointer;transition:background .14s,border-color .14s;padding:0 6px;line-height:1;white-space:nowrap;flex-shrink:0;font-family:inherit;}
      .vac2026-inject-toolbar-btn:hover{background:rgba(56,189,248,0.18);border-color:rgba(56,189,248,0.6);}

      /* Modal */
      .v26-mover{position:fixed;inset:0;z-index:99999;background:rgba(5,10,24,0.9);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:20px;}
      .v26-modal{background:#0d1f35;border:1px solid rgba(56,189,248,0.22);border-radius:14px;padding:24px;width:100%;max-width:520px;max-height:80vh;overflow-y:auto;}
      .v26-modal h3{color:#38bdf8;font-size:1rem;margin:0 0 16px;}
      .v26-modal label{display:block;font-size:0.74rem;color:#64748b;margin-bottom:4px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;}
      .v26-modal textarea,.v26-modal input[type=text]{width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.13);border-radius:8px;color:#e2e8f0;font-size:0.81rem;padding:8px 12px;margin-bottom:12px;resize:vertical;font-family:inherit;box-sizing:border-box;line-height:1.5;}
      .v26-modal textarea:focus,.v26-modal input[type=text]:focus{outline:none;border-color:rgba(56,189,248,0.5);}
      .v26-mbtns{display:flex;gap:8px;justify-content:flex-end;margin-top:4px;}
      .v26-mcancel{padding:8px 18px;border-radius:8px;border:1px solid rgba(255,255,255,0.13);background:transparent;color:#94a3b8;font-size:0.82rem;cursor:pointer;font-family:inherit;}
      .v26-mcancel:hover{background:rgba(255,255,255,0.07);}
      .v26-msave{padding:8px 18px;border-radius:8px;border:1px solid rgba(52,211,153,0.4);background:rgba(52,211,153,0.1);color:#34d399;font-size:0.82rem;font-weight:600;cursor:pointer;font-family:inherit;}
      .v26-msave:hover{background:rgba(52,211,153,0.2);}

      @media(max-width:600px){
        .v26-body{padding:14px;}
        .v26h{padding:0 14px;}
        .v26-grupo-hdr,.v26-vtrig,.v26-vdet{padding-left:14px;padding-right:14px;}
      }
    `;
    document.head.appendChild(s);
  }

  // ════════════════════════════════════════════════════════════════
  // CONSTRUIR PANEL
  // ════════════════════════════════════════════════════════════════
  function construirPanel(){
    if(document.getElementById('vac2026-panel'))return;
    const p=document.createElement('div');
    p.id='vac2026-panel';
    p.innerHTML=`
      <div class="v26h">
        <div class="v26h-r1">
          <button class="v26-back" onclick="window.vac2026VolverMenu()">← Volver al Menú</button>
          <span class="v26-ttl">💉 Calendario Nacional de Vacunación 2026</span>
          <span class="v26-sub">Argentina · Ministerio de Salud</span>
        </div>
        <div class="v26-tabs">
          <button class="v26-tab on"  data-tab="clasificacion" onclick="window._v26Tab(this,'clasificacion')">🧬 Clasificación</button>
          <button class="v26-tab"     data-tab="edad"          onclick="window._v26Tab(this,'edad')">📅 Por edad</button>
          <button class="v26-tab"     data-tab="intervalos"    onclick="window._v26Tab(this,'intervalos')">⏱ Intervalos e Ig</button>
        </div>
      </div>
      <div class="v26-body">
        <div id="v26-t-c"></div>
        <div id="v26-t-e" style="display:none"></div>
        <div id="v26-t-i" style="display:none"></div>
      </div>`;
    document.body.appendChild(p);
    if(!document.getElementById('vac2026-btn-volver-quiz')){
      const b=document.createElement('button');
      b.id='vac2026-btn-volver-quiz';
      b.textContent='← Volver al Cuestionario';
      b.onclick=()=>window.vac2026VolverCuestionario();
      document.body.appendChild(b);
    }
  }

  // ════════════════════════════════════════════════════════════════
  // RENDER CLASIFICACIÓN
  // ════════════════════════════════════════════════════════════════
  function renderClasificacion(){
    const data=cargarDatos();
    const cont=document.getElementById('v26-t-c');
    if(!cont)return;
    const adm=esAdmin();

    // leyenda
    let html='<div class="v26-legend">';
    data.clasificacion.forEach(sec=>{
      const m=meta(sec.tipo);
      html+=`<div class="v26-leg-item"><span class="v26-leg-dot" style="background:${sec.color||m.color}"></span><span>${sec.icon||m.icon} ${sec.tipo}</span></div>`;
    });
    html+='</div>';

    data.clasificacion.forEach((sec,si)=>{
      const m=meta(sec.tipo);
      const col=sec.color||m.color;
      const bg=m.bg; const brd=m.border;
      html+=`<div class="v26-grupo" style="border-color:${brd}">
        <div class="v26-grupo-hdr" style="background:${bg}">
          <span class="v26-grupo-icon">${sec.icon||m.icon}</span>
          <span class="v26-grupo-tit" style="color:${col}">${sec.tipo}</span>
          <span class="v26-grupo-cnt">${sec.vacunas.length} vacuna${sec.vacunas.length!==1?'s':''}</span>
        </div>
        <div class="v26-lista">`;

      sec.vacunas.forEach((vac,vi)=>{
        const nicon={warn:'⚠️',info:'ℹ️',ok:'✅',danger:'🔴'}[vac.notaTipo]||'';
        html+=`
          <div class="v26-vrow">
            <div class="v26-vtrig" id="vt-${si}-${vi}"
                 onclick="window._v26Tog(${si},${vi})"
                 role="button" tabindex="0"
                 onkeydown="if(event.key==='Enter'||event.key===' ')window._v26Tog(${si},${vi})">
              <span class="v26-vbadge" style="color:${col};background:${bg};border-color:${brd}">${vac.badge}</span>
              <span class="v26-vnom">${vac.nombre}</span>
              <span class="v26-varr">▾</span>
            </div>
            <div class="v26-vdet" id="vd-${si}-${vi}" style="display:none">
              <div class="v26-vdet-in" style="border-color:${brd}">
                <div class="v26-vprev">${vac.previene}</div>
                <div class="v26-vlbl">Calendario de dosis</div>
                <div class="v26-vdosis">${vac.dosis.map(d=>`<span class="v26-vdpill" style="color:${col};border-color:${brd}">${d}</span>`).join('')}</div>
                <div class="v26-vnota ${vac.notaTipo}"><span style="margin-right:5px">${nicon}</span>${vac.nota}</div>
                ${adm?`<button class="v26-bedit v" onclick="window._v26EV(${si},${vi})">✏️ Editar</button>`:''}
              </div>
            </div>
          </div>`;
      });
      html+='</div></div>';
    });
    cont.innerHTML=html;
  }

  // ════════════════════════════════════════════════════════════════
  // RENDER EDAD
  // ════════════════════════════════════════════════════════════════
  function renderEdad(){
    const data=cargarDatos();
    const cont=document.getElementById('v26-t-e');
    if(!cont)return;
    const adm=esAdmin();
    let html=`<div class="v26-twrap"><table class="v26-table"><thead><tr><th>Edad / Grupo</th><th>Vacunas</th><th>Nota</th></tr></thead><tbody>`;
    data.edadTabla.forEach(r=>{ html+=`<tr><td>${r.edad}</td><td>${r.vacunas}</td><td>${r.nota}</td></tr>`; });
    html+=`</tbody></table></div>`;
    if(adm)html+=`<button class="v26-bedit v" style="margin-top:14px" onclick="window._v26EE()">✏️ Editar tabla (JSON)</button>`;
    cont.innerHTML=html;
  }

  // ════════════════════════════════════════════════════════════════
  // RENDER INTERVALOS
  // ════════════════════════════════════════════════════════════════
  function renderIntervalos(){
    const data=cargarDatos();
    const cont=document.getElementById('v26-t-i');
    if(!cont)return;
    const adm=esAdmin();
    let html=`<div class="v26-sec-tit">⏱ Regla de oro — intervalos entre vacunas</div><div class="v26-int-grid">`;
    data.intervalos.forEach(r=>{
      const t=r.tipo==='ok'?'ok':'warn';
      html+=`<div class="v26-int-card ${t}"><div class="v26-int-badge">${t==='ok'?'✅ COMPATIBLE':'⚠️ ATENCIÓN'}</div><div class="v26-int-combo">${r.combinacion}</div><div class="v26-int-regla">${r.regla}</div></div>`;
    });
    html+='</div>';
    if(adm)html+=`<button class="v26-bedit v" style="margin-bottom:24px" onclick="window._v26EI()">✏️ Editar intervalos (JSON)</button>`;
    html+=`<div class="v26-sec-tit">🧠 Reglas mnemotécnicas para estudiar</div><div class="v26-mnemo-grid">`;
    data.mnemotecnia.forEach((m,i)=>{
      html+=`<div class="v26-mnemo-card"><div class="v26-mnemo-tit">${m.titulo}</div><div class="v26-mnemo-txt">${m.texto}</div>${adm?`<button class="v26-bedit v" onclick="window._v26EM(${i})">✏️ Editar</button>`:''}</div>`;
    });
    html+='</div>';
    cont.innerHTML=html;
  }

  function renderTodo(){ renderClasificacion(); renderEdad(); renderIntervalos(); }

  // ════════════════════════════════════════════════════════════════
  // UI GLOBAL
  // ════════════════════════════════════════════════════════════════
  window._v26Tab=function(btn,tid){
    document.querySelectorAll('.v26-tab').forEach(t=>t.classList.remove('on'));
    btn.classList.add('on');
    const map={clasificacion:'v26-t-c',edad:'v26-t-e',intervalos:'v26-t-i'};
    Object.keys(map).forEach(k=>{
      const el=document.getElementById(map[k]);
      if(el)el.style.display=k===tid?'':'none';
    });
  };

  // ── Toggle acordeón — múltiples filas abiertas simultáneamente ──
  // Cada fila opera de forma independiente: abre o cierra solo su
  // propio detalle, sin afectar al resto del panel.
  window._v26Tog=function(si,vi){
    const det=document.getElementById(`vd-${si}-${vi}`);
    const trig=document.getElementById(`vt-${si}-${vi}`);
    if(!det||!trig)return;

    const yaAbierta=det.style.display==='block';

    if(yaAbierta){
      // Cerrar solo esta fila
      det.style.display='none';
      trig.classList.remove('open');
    } else {
      // Abrir solo esta fila
      det.style.display='block';
      trig.classList.add('open');
      setTimeout(()=>{ trig.scrollIntoView({behavior:'smooth',block:'nearest'}); },80);
    }
  };

  // ── Edición admin ────────────────────────────────────────────────
  window._v26EV=function(si,vi){
    const data=cargarDatos(); const vac=data.clasificacion[si].vacunas[vi];
    abrirModal('Editar vacuna',[
      {label:'Nombre',key:'nombre',val:vac.nombre,type:'text'},
      {label:'Badge',key:'badge',val:vac.badge,type:'text'},
      {label:'Previene',key:'previene',val:vac.previene,type:'text'},
      {label:'Dosis (una por línea)',key:'dosis',val:vac.dosis.join('\n'),type:'textarea',rows:4},
      {label:'Nota',key:'nota',val:vac.nota,type:'textarea',rows:3},
      {label:'Tipo (warn/info/ok/danger)',key:'notaTipo',val:vac.notaTipo,type:'text'}
    ],function(v){
      vac.nombre=v.nombre; vac.badge=v.badge; vac.previene=v.previene;
      vac.dosis=v.dosis.split('\n').map(s=>s.trim()).filter(Boolean);
      vac.nota=v.nota; vac.notaTipo=v.notaTipo;
      guardarDatos(data); renderClasificacion();
    });
  };
  window._v26EE=function(){
    const data=cargarDatos();
    abrirModal('Editar tabla por edad (JSON)',[{label:'Array JSON',key:'json',val:JSON.stringify(data.edadTabla,null,2),type:'textarea',rows:18}],
      function(v){try{data.edadTabla=JSON.parse(v.json);guardarDatos(data);renderEdad();}catch(e){alert('JSON inválido: '+e.message);}});
  };
  window._v26EI=function(){
    const data=cargarDatos();
    abrirModal('Editar intervalos (JSON)',[{label:'Array JSON',key:'json',val:JSON.stringify(data.intervalos,null,2),type:'textarea',rows:18}],
      function(v){try{data.intervalos=JSON.parse(v.json);guardarDatos(data);renderIntervalos();}catch(e){alert('JSON inválido: '+e.message);}});
  };
  window._v26EM=function(i){
    const data=cargarDatos(); const m=data.mnemotecnia[i];
    abrirModal('Editar mnemotecnia',[
      {label:'Título',key:'titulo',val:m.titulo,type:'text'},
      {label:'Texto',key:'texto',val:m.texto,type:'textarea',rows:4}
    ],function(v){data.mnemotecnia[i].titulo=v.titulo;data.mnemotecnia[i].texto=v.texto;guardarDatos(data);renderIntervalos();});
  };

  function abrirModal(titulo,campos,onGuardar){
    const ov=document.createElement('div'); ov.className='v26-mover';
    let fh='';
    campos.forEach(c=>{
      if(c.type==='textarea')fh+=`<label>${c.label}</label><textarea rows="${c.rows||4}" data-key="${c.key}">${c.val.replace(/</g,'&lt;')}</textarea>`;
      else fh+=`<label>${c.label}</label><input type="text" data-key="${c.key}" value="${c.val.replace(/"/g,'&quot;').replace(/</g,'&lt;')}">`;
    });
    ov.innerHTML=`<div class="v26-modal"><h3>✏️ ${titulo}</h3>${fh}<div class="v26-mbtns"><button class="v26-mcancel">Cancelar</button><button class="v26-msave">💾 Guardar</button></div></div>`;
    document.body.appendChild(ov);
    ov.querySelector('.v26-mcancel').onclick=()=>ov.remove();
    ov.querySelector('.v26-msave').onclick=()=>{
      const vals={}; ov.querySelectorAll('[data-key]').forEach(el=>{vals[el.dataset.key]=el.value;}); onGuardar(vals); ov.remove();
    };
    ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
  }

  // ════════════════════════════════════════════════════════════════
  // NAVEGACIÓN
  // ════════════════════════════════════════════════════════════════
  let _origenHash=null;

  function mostrarPanel(opts){
    opts=opts||{};
    inyectarEstilos(); construirPanel(); renderTodo();
    document.getElementById('menu-principal')?.classList.add('oculto');
    document.querySelectorAll('.pagina-cuestionario').forEach(p=>p.classList.remove('activa'));
    const bp=document.getElementById('buscador-panel'); if(bp)bp.style.display='none';
    document.getElementById('vac2026-panel').classList.add('activo');
    window.scrollTo(0,0);

    // Reset al tab de clasificación
    document.querySelectorAll('.v26-tab').forEach(t=>t.classList.remove('on'));
    document.querySelector('.v26-tab[data-tab="clasificacion"]')?.classList.add('on');
    const map={clasificacion:'v26-t-c',edad:'v26-t-e',intervalos:'v26-t-i'};
    Object.keys(map).forEach(k=>{ const el=document.getElementById(map[k]); if(el)el.style.display=k==='clasificacion'?'':'none'; });

    const btnV=document.getElementById('vac2026-btn-volver-quiz');
    if(btnV){
      if(opts.desde==='cuestionario'&&opts.origenHash){_origenHash=opts.origenHash;btnV.classList.add('vis');}
      else{_origenHash=null;btnV.classList.remove('vis');}
    }
    history.pushState({vacunas2026:true,desde:opts.desde,origenHash:opts.origenHash},'Vacunas 2026','#vacunas2026');
  }

  function ocultarPanel(){
    document.getElementById('vac2026-panel')?.classList.remove('activo');
    document.getElementById('vac2026-btn-volver-quiz')?.classList.remove('vis');
    _origenHash=null;
  }

  window.vac2026VolverMenu=function(){
    ocultarPanel();
    if(typeof window.volverAlMenu==='function')window.volverAlMenu();
    else history.replaceState({section:null},'Menú Principal','#menu');
  };
  window.vac2026VolverCuestionario=function(){
    const hash=_origenHash; ocultarPanel();
    if(hash){const sec=hash.replace(/^#/,'');if(typeof window.mostrarCuestionario==='function')window.mostrarCuestionario(sec);else history.replaceState({section:sec},sec,'#'+sec);}
  };
  window.mostrarVacunas2026=function(){mostrarPanel({desde:'menu'});};
  window.mostrarVacunas2026DesdeCuestionario=function(seccionId){mostrarPanel({desde:'cuestionario',origenHash:'#'+seccionId});};

  window.addEventListener('popstate',function(e){
    if(e.state&&e.state.vacunas2026){mostrarPanel({desde:e.state.desde,origenHash:e.state.origenHash});}
    else{const p=document.getElementById('vac2026-panel');if(p&&p.classList.contains('activo'))ocultarPanel();}
  });

  document.addEventListener('DOMContentLoaded',function(){
    if(window.location.hash==='#vacunas2026'){inyectarEstilos();construirPanel();renderTodo();mostrarPanel({desde:'menu'});}
  });

  // ════════════════════════════════════════════════════════════════
  // INTEGRACIÓN CON EXPLICACIONES Y EDITOR ADMIN
  // ════════════════════════════════════════════════════════════════
  window.fbInjectVacunasButton=function(seccionId,explicacionDiv){
    if(explicacionDiv.querySelector('.vac2026-ver-mas-btn'))return;
    const btn=document.createElement('button');
    btn.className='vac2026-ver-mas-btn';
    btn.innerHTML='💉 VER MÁS SOBRE VACUNAS';
    btn.title='Ir al Calendario Nacional de Vacunación 2026';
    btn.addEventListener('click',function(e){e.stopPropagation();window.mostrarVacunas2026DesdeCuestionario(seccionId);});
    explicacionDiv.appendChild(btn);
  };

  window.fbInjectVacunasToolbarBtn=function(toolbarGrupos,seccionId){
    if(toolbarGrupos.querySelector('.vac2026-inject-toolbar-btn'))return;
    inyectarEstilos();
    const sep=document.createElement('span'); sep.className='meq-sep'; toolbarGrupos.appendChild(sep);
    const btn=document.createElement('button');
    btn.className='meq-btn-fmt vac2026-inject-toolbar-btn';
    btn.type='button'; btn.title='Insertar botón VER MÁS SOBRE VACUNAS';
    btn.innerHTML='💉 Ver vacunas';
    btn.addEventListener('click',function(e){
      e.preventDefault();
      const m=`<br><a href="#vacunas2026" data-vacunas-btn="1" style="display:inline-flex;align-items:center;gap:7px;margin-top:14px;padding:9px 20px;border-radius:10px;border:1.5px solid rgba(56,189,248,0.45);background:rgba(56,189,248,0.08);color:#38bdf8;font-size:0.85rem;font-weight:600;text-decoration:none;cursor:pointer;">💉 VER MÁS SOBRE VACUNAS</a>`;
      document.execCommand('insertHTML',false,m);
    });
    toolbarGrupos.appendChild(btn);
  };

})();
