// ════════════════════════════════════════════════════════════════
// calendario-vacunacion.js  — v10
// Grid 3 columnas · Toggle independiente · Editor admin completo
// ════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  const DATA_KEY = 'vacunas2026_data_v3';

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

  // ── Caché en memoria para evitar lecturas repetidas a Firestore ──
  let _datosCache = null;

  async function cargarDatos(){
    if(_datosCache) return _datosCache;
    if(window._fbDb && window.__fb){
      try{
        const {doc, getDoc} = window.__fb;
        const snap = await getDoc(doc(window._fbDb, 'meta', 'calendarioVacunacion'));
        if(snap.exists()){
          _datosCache = snap.data();
          console.log('[VAC2026] \u2705 Datos cargados desde Firestore');
          try{ localStorage.setItem(DATA_KEY, JSON.stringify(_datosCache)); }catch(_){}
          return _datosCache;
        } else {
          console.warn('[VAC2026] \u26a0\ufe0f No existe meta/calendarioVacunacion. Ejecuta window.vac2026MigrarAFirestore()');
        }
      }catch(e){
        console.warn('[VAC2026] No se pudo leer Firestore:', e);
      }
    } else {
      console.warn('[VAC2026] Firebase no disponible. _fbDb=', !!window._fbDb, '__fb=', !!window.__fb);
    }
    try{
      const s = localStorage.getItem(DATA_KEY);
      if(s){ console.log('[VAC2026] \ud83d\udce6 Usando cache local'); _datosCache = JSON.parse(s); return _datosCache; }
    }catch(_){}
    console.warn('[VAC2026] \ud83d\udd34 Usando DATA_DEFAULT');
    _datosCache = JSON.parse(JSON.stringify(DATA_DEFAULT));
    return _datosCache;
  }

  async function guardarDatos(d){
    // Actualizar caché en memoria
    _datosCache = d;

    // Guardar en localStorage como caché offline
    try{ localStorage.setItem(DATA_KEY, JSON.stringify(d)); }catch(_){}

    // Guardar en Firestore (fuente de verdad)
    if(window._fbDb && window.__fb){
      try{
        const {doc, setDoc} = window.__fb;
        await setDoc(doc(window._fbDb, 'meta', 'calendarioVacunacion'), d);
      }catch(e){
        console.error('[VAC2026] Error al guardar en Firestore:', e);
        toast('⚠️ No se pudo guardar en la nube');
      }
    }
  }
  function esAdmin(){ return typeof window.fbIsAdmin==='function'&&window.fbIsAdmin(); }
  function meta(tipo){ return GRUPOS_META.find(x=>x.tipo===tipo)||{icon:'',color:'#64748b',bg:'rgba(100,116,139,0.06)',border:'rgba(100,116,139,0.2)'}; }

  // ════════════════════════════════════════════════════════════════
  // ESTILOS
  // ════════════════════════════════════════════════════════════════
  function inyectarEstilos(){
    if(document.getElementById('vac2026-st-v3'))return;
    const s=document.createElement('style');
    s.id='vac2026-st-v3';
    s.textContent=`
      #vac2026-panel{display:none;min-height:100vh;background:linear-gradient(160deg,#071220 0%,#0d2444 50%,#0a1628 100%);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;color:#e2e8f0;padding-bottom:100px;}
      #vac2026-panel.activo{display:block;}
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
      .v26-body{padding:24px;max-width:1100px;margin:0 auto;}

      /* Leyenda */
      .v26-legend{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px;padding:11px 16px;background:rgba(255,255,255,0.02);border-radius:10px;border:1px solid rgba(255,255,255,0.07);}
      .v26-leg-item{display:flex;align-items:center;gap:5px;font-size:0.71rem;color:#64748b;}
      .v26-leg-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}

      /* Grupo */
      .v26-grupo-wrap{margin-bottom:26px;}
      .v26-grupo-hdr{display:flex;align-items:center;gap:10px;padding:10px 16px;border-radius:10px 10px 0 0;border:1px solid;border-bottom:none;}
      .v26-grupo-icon{font-size:1rem;flex-shrink:0;}
      .v26-grupo-tit{font-size:0.68rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;flex:1;}
      .v26-grupo-cnt{font-size:0.67rem;color:#475569;background:rgba(0,0,0,0.25);padding:2px 9px;border-radius:10px;}

      /* Grid 3 columnas */
      .v26-grid{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid rgba(255,255,255,0.08);border-radius:0 0 12px 12px;overflow:hidden;}
      .v26-card{display:flex;flex-direction:column;border-right:1px solid rgba(255,255,255,0.06);border-bottom:1px solid rgba(255,255,255,0.06);}
      .v26-card:nth-child(3n){border-right:none;}

      /* Trigger */
      .v26-ctrig{display:flex;align-items:center;gap:8px;padding:12px 14px;cursor:pointer;transition:background .13s;user-select:none;-webkit-user-select:none;min-height:52px;}
      .v26-ctrig:hover{background:rgba(255,255,255,0.03);}
      .v26-ctrig.open{background:rgba(255,255,255,0.04);}
      .v26-cbadge{font-size:9.5px;font-weight:600;padding:2px 8px;border-radius:10px;white-space:nowrap;flex-shrink:0;border:1px solid;}
      .v26-cnom{flex:1;font-size:0.84rem;font-weight:600;color:#e2e8f0;line-height:1.3;}
      .v26-carr{width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:center;font-size:0.52rem;color:#64748b;flex-shrink:0;transition:transform .22s,background .14s,color .14s;}
      .v26-ctrig.open .v26-carr{transform:rotate(180deg);background:rgba(56,189,248,0.14);color:#38bdf8;}

      /* Detalle */
      .v26-cdet{padding:0 13px 13px;animation:v26fi .18s ease both;border-top:1px solid rgba(255,255,255,0.05);}
      @keyframes v26fi{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
      .v26-cdet-in{border-radius:8px;padding:12px;border:1px solid;background:rgba(0,0,0,0.22);margin-top:10px;}
      .v26-cprev{font-size:0.81rem;color:#cbd5e1;margin-bottom:10px;padding-bottom:9px;border-bottom:1px solid rgba(255,255,255,0.06);}
      .v26-clbl{font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#475569;margin-bottom:6px;}
      .v26-cdosis{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px;}
      .v26-cdpill{font-size:0.73rem;padding:3px 10px;border-radius:20px;border:1px solid;background:rgba(0,0,0,0.15);white-space:nowrap;}
      .v26-cnota{font-size:0.76rem;line-height:1.55;padding:8px 11px;border-radius:7px;border-left:3px solid;}
      .v26-cnota.warn{background:rgba(251,191,36,0.08);border-color:#fbbf24;color:#fde68a;}
      .v26-cnota.info{background:rgba(56,189,248,0.07);border-color:#38bdf8;color:#bae6fd;}
      .v26-cnota.ok{background:rgba(52,211,153,0.07);border-color:#34d399;color:#a7f3d0;}
      .v26-cnota.danger{background:rgba(248,113,113,0.08);border-color:#f87171;color:#fecaca;}

      /* Tabla por edad */
      .v26-twrap{overflow-x:auto;border-radius:12px;}
      .v26-table{width:100%;border-collapse:collapse;font-size:0.8rem;min-width:460px;}
      .v26-table thead th{background:rgba(56,189,248,0.1);color:#38bdf8;padding:10px 14px;text-align:left;border:1px solid rgba(56,189,248,0.12);font-size:0.72rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;}
      .v26-table tbody td{padding:9px 14px;border:1px solid rgba(255,255,255,0.06);color:#cbd5e1;vertical-align:top;line-height:1.5;}
      .v26-table tbody tr:nth-child(even) td{background:rgba(255,255,255,0.02);}
      .v26-table tbody tr:hover td{background:rgba(56,189,248,0.04);}
      .v26-table tbody td:first-child{font-weight:700;color:#e2e8f0;white-space:nowrap;}
      /* Drag & drop filas (solo admin) */
      .v26-handle-cell{padding:4px 6px!important;text-align:center;width:28px;}
      .v26-drag-handle{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;color:#475569;font-size:1rem;cursor:grab;border-radius:4px;transition:color .13s,background .13s;user-select:none;}
      .v26-drag-handle:hover{color:#38bdf8;background:rgba(56,189,248,0.1);}
      .v26-table tbody tr.v26-draggable{cursor:default;}
      .v26-table tbody tr.v26-draggable:focus{outline:2px solid rgba(56,189,248,0.5);outline-offset:-2px;}
      .v26-table tbody tr.v26-dragging td{opacity:0.35;}
      #v26-drop-indicator td{padding:0!important;height:3px!important;background:#38bdf8!important;border-radius:2px;}
      .v26-drag-hint{font-size:0.68rem;color:#334155;font-style:italic;margin-top:7px;padding-left:2px;}
      #v26-drag-ghost td{padding:7px 12px!important;font-size:0.78rem;}

      /* Intervalos */
      .v26-int-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:10px;margin-bottom:24px;}
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
      .v26-sec-tit{font-size:0.71rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#64748b;display:flex;align-items:center;gap:8px;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.07);}
      .v26-mnemo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;}
      .v26-mnemo-card{border-radius:10px;padding:14px 16px;background:rgba(251,191,36,0.04);border:1px solid rgba(251,191,36,0.15);}
      .v26-mnemo-tit{font-size:0.81rem;font-weight:700;color:#fcd34d;margin-bottom:7px;}
      .v26-mnemo-txt{font-size:0.77rem;color:#94a3b8;line-height:1.6;white-space:pre-line;}

      /* Botones admin */
      .v26-adm-bar{display:flex;align-items:center;gap:6px;margin-top:9px;flex-wrap:wrap;}
      .v26-abtn{display:inline-flex;align-items:center;gap:4px;padding:4px 11px;border-radius:7px;font-size:0.71rem;font-weight:600;cursor:pointer;transition:all .13s;font-family:inherit;border:1px solid;line-height:1.4;}
      .v26-abtn-edit{background:rgba(56,189,248,0.08);border-color:rgba(56,189,248,0.3);color:#38bdf8;}
      .v26-abtn-edit:hover{background:rgba(56,189,248,0.2);}
      .v26-abtn-del{background:rgba(248,113,113,0.07);border-color:rgba(248,113,113,0.28);color:#f87171;}
      .v26-abtn-del:hover{background:rgba(248,113,113,0.2);}
      .v26-abtn-add{background:rgba(52,211,153,0.07);border-color:rgba(52,211,153,0.28);color:#34d399;}
      .v26-abtn-add:hover{background:rgba(52,211,153,0.2);}
      .v26-abtn-warn{background:rgba(251,191,36,0.07);border-color:rgba(251,191,36,0.28);color:#fbbf24;}
      .v26-abtn-warn:hover{background:rgba(251,191,36,0.2);}

      /* Botón volver */
      #vac2026-btn-volver-quiz{display:none;position:fixed;bottom:28px;left:50%;transform:translateX(-50%);z-index:9900;background:linear-gradient(135deg,#0891b2,#0d7490);color:#fff;border:none;border-radius:24px;padding:12px 26px;font-size:0.88rem;font-weight:600;cursor:pointer;box-shadow:0 4px 22px rgba(8,145,178,0.45);transition:all .18s;white-space:nowrap;font-family:inherit;}
      #vac2026-btn-volver-quiz.vis{display:block;}
      #vac2026-btn-volver-quiz:hover{background:linear-gradient(135deg,#0d7490,#0e6680);transform:translateX(-50%) translateY(-2px);}
      .vac2026-ver-mas-btn{display:inline-flex;align-items:center;gap:7px;margin-top:14px;padding:9px 20px;border-radius:10px;border:1.5px solid rgba(56,189,248,0.45);background:rgba(56,189,248,0.08);color:#38bdf8;font-size:0.85rem;font-weight:600;cursor:pointer;transition:all .16s;white-space:nowrap;font-family:inherit;text-decoration:none;}
      .vac2026-ver-mas-btn:hover{background:rgba(56,189,248,0.18);border-color:rgba(56,189,248,0.7);}
      .vac2026-inject-toolbar-btn{display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:26px;background:rgba(56,189,248,0.08);border:1.5px solid rgba(56,189,248,0.3);color:#38bdf8;border-radius:5px;font-size:0.82rem;cursor:pointer;padding:0 6px;white-space:nowrap;flex-shrink:0;font-family:inherit;}

      /* Modal */
      .v26-mover{position:fixed;inset:0;z-index:99999;background:rgba(5,10,24,0.93);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:20px;}
      .v26-modal{background:#0b1c30;border:1px solid rgba(56,189,248,0.2);border-radius:16px;width:100%;max-width:560px;max-height:88vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,0.65);}
      .v26-modal-hdr{display:flex;align-items:center;gap:10px;padding:17px 22px 13px;border-bottom:1px solid rgba(255,255,255,0.07);}
      .v26-modal-hdr h3{color:#38bdf8;font-size:0.93rem;font-weight:700;margin:0;flex:1;}
      .v26-mclose{background:rgba(255,255,255,0.06);border:none;color:#64748b;width:28px;height:28px;border-radius:8px;cursor:pointer;font-size:0.9rem;display:flex;align-items:center;justify-content:center;transition:all .13s;flex-shrink:0;}
      .v26-mclose:hover{background:rgba(255,255,255,0.13);color:#e2e8f0;}
      .v26-modal-body{padding:18px 22px;overflow-y:auto;flex:1;}
      .v26-modal-ftr{padding:13px 22px;border-top:1px solid rgba(255,255,255,0.07);display:flex;gap:8px;justify-content:flex-end;}
      .v26-fgroup{margin-bottom:13px;}
      .v26-flbl{display:block;font-size:0.68rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#475569;margin-bottom:5px;}
      .v26-finput,.v26-ftextarea,.v26-fselect{width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.11);border-radius:9px;color:#e2e8f0;font-size:0.82rem;padding:9px 12px;font-family:inherit;box-sizing:border-box;line-height:1.5;transition:border-color .14s;}
      .v26-finput:focus,.v26-ftextarea:focus,.v26-fselect:focus{outline:none;border-color:rgba(56,189,248,0.5);background:rgba(56,189,248,0.04);}
      .v26-ftextarea{resize:vertical;min-height:68px;}
      .v26-fselect{cursor:pointer;}
      .v26-dosis-editor{display:flex;flex-direction:column;gap:6px;}
      .v26-dosis-row{display:flex;align-items:center;gap:6px;}
      .v26-dosis-row .v26-finput{flex:1;}
      .v26-dosis-del{width:28px;height:28px;border-radius:7px;background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.24);color:#f87171;cursor:pointer;font-size:0.8rem;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .13s;}
      .v26-dosis-del:hover{background:rgba(248,113,113,0.24);}
      .v26-dosis-add{display:inline-flex;align-items:center;gap:5px;margin-top:5px;padding:5px 13px;border-radius:8px;background:rgba(52,211,153,0.07);border:1px dashed rgba(52,211,153,0.35);color:#34d399;font-size:0.74rem;font-weight:600;cursor:pointer;transition:all .13s;font-family:inherit;}
      .v26-dosis-add:hover{background:rgba(52,211,153,0.17);}
      .v26-mcancel{padding:8px 18px;border-radius:8px;border:1px solid rgba(255,255,255,0.13);background:transparent;color:#94a3b8;font-size:0.82rem;cursor:pointer;font-family:inherit;transition:all .13s;}
      .v26-mcancel:hover{background:rgba(255,255,255,0.07);}
      .v26-msave{padding:8px 22px;border-radius:8px;border:1px solid rgba(52,211,153,0.4);background:rgba(52,211,153,0.1);color:#34d399;font-size:0.82rem;font-weight:700;cursor:pointer;font-family:inherit;transition:all .13s;}
      .v26-msave:hover{background:rgba(52,211,153,0.22);}

      /* Toast */
      .v26-toast{position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(14px);z-index:999999;background:#0d2444;border:1px solid rgba(52,211,153,0.4);color:#34d399;padding:8px 20px;border-radius:24px;font-size:0.79rem;font-weight:600;font-family:inherit;opacity:0;transition:all .28s;pointer-events:none;white-space:nowrap;}
      .v26-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}

      @media(max-width:780px){
        .v26-grid{grid-template-columns:repeat(2,1fr);}
        .v26-card:nth-child(3n){border-right:1px solid rgba(255,255,255,0.06);}
        .v26-card:nth-child(2n){border-right:none;}
      }
      @media(max-width:500px){
        .v26-grid{grid-template-columns:1fr;}
        .v26-card{border-right:none!important;}
        .v26-body{padding:12px;}
        .v26h{padding:0 12px;}
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
      </div>
      <div class="v26-toast" id="v26-toast"></div>`;
    document.body.appendChild(p);
    if(!document.getElementById('vac2026-btn-volver-quiz')){
      const b=document.createElement('button');
      b.id='vac2026-btn-volver-quiz';
      b.textContent='← Volver al Cuestionario';
      b.onclick=()=>window.vac2026VolverCuestionario();
      document.body.appendChild(b);
    }
  }

  // Toast
  function toast(msg){
    const t=document.getElementById('v26-toast');
    if(!t)return;
    t.textContent=msg; t.classList.add('show');
    setTimeout(()=>t.classList.remove('show'),2200);
  }

  // ════════════════════════════════════════════════════════════════
  // RENDER CLASIFICACIÓN — GRID 3 COLUMNAS
  // ════════════════════════════════════════════════════════════════
  async function renderClasificacion(){
    const data=await cargarDatos();
    const cont=document.getElementById('v26-t-c');
    if(!cont)return;
    const adm=esAdmin();

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

      html+=`<div class="v26-grupo-wrap">`;
      html+=`<div class="v26-grupo-hdr" style="background:${bg};border-color:${brd}">
        <span class="v26-grupo-icon">${sec.icon||m.icon}</span>
        <span class="v26-grupo-tit" style="color:${col}">${sec.tipo}</span>
        <span class="v26-grupo-cnt">${sec.vacunas.length} vacuna${sec.vacunas.length!==1?'s':''}</span>
        ${adm?`<button class="v26-abtn v26-abtn-add" onclick="window._v26AddVac(${si})">＋ Agregar vacuna</button>`:''}
      </div>`;
      html+=`<div class="v26-grid">`;

      sec.vacunas.forEach((vac,vi)=>{
        const nicon={warn:'⚠️',info:'ℹ️',ok:'✅',danger:'🔴'}[vac.notaTipo]||'';
        html+=`
          <div class="v26-card" id="vc-${si}-${vi}">
            <div class="v26-ctrig" id="ct-${si}-${vi}"
                 onclick="window._v26Tog(${si},${vi})"
                 role="button" tabindex="0"
                 onkeydown="if(event.key==='Enter'||event.key===' ')window._v26Tog(${si},${vi})">
              <span class="v26-cbadge" style="color:${col};background:${bg};border-color:${brd}">${vac.badge}</span>
              <span class="v26-cnom">${vac.nombre}</span>
              <span class="v26-carr">▾</span>
            </div>
            <div class="v26-cdet" id="cd-${si}-${vi}" style="display:none">
              <div class="v26-cdet-in" style="border-color:${brd}">
                <div class="v26-cprev">${vac.previene}</div>
                <div class="v26-clbl">Calendario de dosis</div>
                <div class="v26-cdosis">${vac.dosis.map(d=>`<span class="v26-cdpill" style="color:${col};border-color:${brd}">${d}</span>`).join('')}</div>
                <div class="v26-cnota ${vac.notaTipo}"><span style="margin-right:5px">${nicon}</span>${vac.nota}</div>
                ${adm?`<div class="v26-adm-bar">
                  <button class="v26-abtn v26-abtn-edit" onclick="window._v26EditVac(${si},${vi})">✏️ Editar</button>
                  <button class="v26-abtn v26-abtn-del"  onclick="window._v26DelVac(${si},${vi})">🗑 Eliminar</button>
                </div>`:''}
              </div>
            </div>
          </div>`;
      });

      html+=`</div></div>`;
    });

    cont.innerHTML=html;
  }

  // ════════════════════════════════════════════════════════════════
  // RENDER EDAD
  // ════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════
  // RENDER EDAD — con drag & drop, flechas de teclado y Ctrl+S
  // ═══════════════════════════════════════════════════════════════

  let _edadPendiente = false;  // true cuando hay cambios de orden sin guardar

  // Recorre el DOM actual y persiste el nuevo orden en Firestore
  async function _guardarOrdenEdad(){
    const tbody = document.querySelector('#v26-edad-table tbody');
    if(!tbody) return;
    const data = await cargarDatos();
    const snapshot = JSON.parse(JSON.stringify(data.edadTabla)); // copia actual
    const filas = Array.from(tbody.querySelectorAll('tr'));
    data.edadTabla = filas.map(tr => snapshot[parseInt(tr.dataset.idx)]);
    await guardarDatos(data);
    _edadPendiente = false;
    // Reasignar data-idx para que coincida con el nuevo orden
    filas.forEach((tr, i) => { tr.dataset.idx = i; });
    _actualizarBtnGuardar();
    toast('\u2705 Orden guardado');
  }

  function _actualizarBtnGuardar(){
    const btn = document.getElementById('v26-btn-guardar-orden');
    if(!btn) return;
    if(_edadPendiente){
      btn.style.background  = 'rgba(52,211,153,0.18)';
      btn.style.borderColor = 'rgba(52,211,153,0.7)';
      btn.style.color       = '#34d399';
      btn.title             = 'Hay cambios sin guardar \u2014 clic o Ctrl+S';
    } else {
      btn.style.background  = 'rgba(52,211,153,0.06)';
      btn.style.borderColor = 'rgba(52,211,153,0.25)';
      btn.style.color       = '#64748b';
      btn.title             = 'Sin cambios pendientes';
    }
  }

  async function renderEdad(){
    const data = await cargarDatos();
    const cont = document.getElementById('v26-t-e');
    if(!cont) return;
    const adm = esAdmin();
    _edadPendiente = false;

    let html = `<div class="v26-twrap"><table class="v26-table" id="v26-edad-table"><thead><tr>`;
    if(adm) html += `<th class="v26-handle-cell"></th>`;
    html += `<th>Edad / Grupo</th><th>Vacunas</th><th>Nota</th>`;
    if(adm) html += `<th style="width:80px;text-align:center"></th>`;
    html += `</tr></thead><tbody>`;

    data.edadTabla.forEach((r, i) => {
      html += `<tr data-idx="${i}" ${adm ? 'class="v26-draggable" tabindex="0"' : ''}>`;
      if(adm) html += `<td class="v26-handle-cell"><span class="v26-drag-handle" title="Arrastr\u00e1 para mover \u00b7 \u2191\u2193 con teclado">\u2840</span></td>`;
      html += `<td>${r.edad}</td><td>${r.vacunas}</td><td>${r.nota}</td>`;
      if(adm) html += `<td style="text-align:center;white-space:nowrap;vertical-align:middle">
        <button class="v26-abtn v26-abtn-edit" style="padding:3px 7px" onclick="window._v26EditEdad(${i})">\u270f\ufe0f</button>
        <button class="v26-abtn v26-abtn-del"  style="padding:3px 7px;margin-top:3px" onclick="window._v26DelEdad(${i})">\ud83d\uddd1</button>
      </td>`;
      html += `</tr>`;
    });

    html += `</tbody></table></div>`;
    if(adm) html += `
      <div class="v26-drag-hint">\u2840 Arrastr\u00e1 \u00b7 \u2191\u2193 con teclado \u00b7 Ctrl+S o \ud83d\udcbe para guardar el orden</div>
      <div class="v26-adm-bar" style="margin-top:10px">
        <button class="v26-abtn v26-abtn-add"  onclick="window._v26AddEdad()">\uff0b Agregar fila</button>
        <button class="v26-abtn v26-abtn-warn" onclick="window._v26EE()">\ud83d\udccb Editar JSON</button>
        <button class="v26-abtn" id="v26-btn-guardar-orden"
          style="padding:4px 14px;border:1px solid rgba(52,211,153,0.25);background:rgba(52,211,153,0.06);color:#64748b;font-size:0.75rem;cursor:pointer;"
          onclick="window._v26GuardarOrden()" title="Sin cambios pendientes">\ud83d\udcbe Guardar orden</button>
      </div>`;

    cont.innerHTML = html;
    if(adm){
      _v26IniciarDragEdad();
      _v26IniciarTecladoEdad();
      _v26IniciarCtrlS();
    }
  }

  // ── Botón guardar y Ctrl+S ───────────────────────────────────
  window._v26GuardarOrden = async function(){
    if(!_edadPendiente){ toast('Sin cambios pendientes'); return; }
    await _guardarOrdenEdad();
  };

  let _ctrlSListener = null;
  function _v26IniciarCtrlS(){
    if(_ctrlSListener) document.removeEventListener('keydown', _ctrlSListener);
    _ctrlSListener = function(e){
      const panel = document.getElementById('vac2026-panel');
      if(!panel || !panel.classList.contains('activo')) return;
      if(e.ctrlKey && e.key === 's'){
        e.preventDefault();
        if(_edadPendiente) _guardarOrdenEdad();
        else toast('Sin cambios pendientes');
      }
    };
    document.addEventListener('keydown', _ctrlSListener);
  }

  // ── Drag con mouse ────────────────────────────────────────────
  function _v26IniciarDragEdad(){
    const tbody = document.querySelector('#v26-edad-table tbody');
    if(!tbody) return;

    let dragging  = null;
    let ghost     = null;
    let indicator = null;

    function getFilaDestino(y){
      const rows = Array.from(tbody.querySelectorAll('tr:not(#v26-drop-indicator)'));
      for(let i = 0; i < rows.length; i++){
        const r = rows[i].getBoundingClientRect();
        if(y < r.top + r.height / 2) return rows[i];
      }
      return null;
    }

    tbody.addEventListener('mousedown', function(e){
      const handle = e.target.closest('.v26-drag-handle');
      if(!handle) return;
      e.preventDefault();
      dragging = handle.closest('tr');

      const rect = dragging.getBoundingClientRect();
      ghost = dragging.cloneNode(true);
      ghost.id = 'v26-drag-ghost';
      Object.assign(ghost.style, {
        position:'fixed', left:rect.left+'px', top:(e.clientY - 14)+'px',
        width:rect.width+'px', zIndex:'99999', opacity:'0.88',
        pointerEvents:'none', background:'#0d2444',
        border:'1.5px solid #38bdf8', borderRadius:'6px',
        boxShadow:'0 8px 32px rgba(0,0,0,0.55)', transition:'none'
      });
      document.body.appendChild(ghost);
      dragging.classList.add('v26-dragging');

      indicator = document.createElement('tr');
      indicator.id = 'v26-drop-indicator';
      indicator.innerHTML = '<td colspan="5"></td>';
    });

    document.addEventListener('mousemove', function(e){
      if(!dragging || !ghost) return;
      ghost.style.top = (e.clientY - 14) + 'px';
      const dest = getFilaDestino(e.clientY);
      if(indicator.parentNode) indicator.parentNode.removeChild(indicator);
      dest ? tbody.insertBefore(indicator, dest) : tbody.appendChild(indicator);
    });

    document.addEventListener('mouseup', function(e){
      if(!dragging) return;
      if(ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
      ghost = null;
      dragging.classList.remove('v26-dragging');
      if(indicator.parentNode) indicator.parentNode.removeChild(indicator);

      const dest = getFilaDestino(e.clientY);
      const rows = Array.from(tbody.querySelectorAll('tr:not(#v26-drop-indicator)'));
      const fromIdx = rows.indexOf(dragging);
      const toIdx   = dest ? rows.indexOf(dest) : rows.length;

      if(fromIdx !== toIdx && fromIdx !== toIdx - 1){
        dest ? tbody.insertBefore(dragging, dest) : tbody.appendChild(dragging);
        _edadPendiente = true;
        _actualizarBtnGuardar();
        toast('\u2195 Fila movida \u2014 guard\u00e1 con \ud83d\udcbe o Ctrl+S');
      }
      dragging = null;
    });
  }

  // ── Flechas de teclado ────────────────────────────────────────
  function _v26IniciarTecladoEdad(){
    const tbody = document.querySelector('#v26-edad-table tbody');
    if(!tbody) return;
    tbody.addEventListener('keydown', function(e){
      if(e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      const row = e.target.closest('tr');
      if(!row) return;
      e.preventDefault();
      const rows = Array.from(tbody.querySelectorAll('tr'));
      const idx  = rows.indexOf(row);
      if(e.key === 'ArrowUp' && idx > 0){
        tbody.insertBefore(row, rows[idx - 1]);
        row.focus();
        _edadPendiente = true;
        _actualizarBtnGuardar();
        toast('\u2191 Fila movida \u2014 guard\u00e1 con \ud83d\udcbe o Ctrl+S');
      } else if(e.key === 'ArrowDown' && idx < rows.length - 1){
        tbody.insertBefore(rows[idx + 1], row);
        row.focus();
        _edadPendiente = true;
        _actualizarBtnGuardar();
        toast('\u2193 Fila movida \u2014 guard\u00e1 con \ud83d\udcbe o Ctrl+S');
      }
    });
  }

  // ════════════════════════════════════════════════════════════════
  // RENDER INTERVALOS
  // ════════════════════════════════════════════════════════════════
  async function renderIntervalos(){
    const data=await cargarDatos();
    const cont=document.getElementById('v26-t-i');
    if(!cont)return;
    const adm=esAdmin();
    let html=`<div class="v26-sec-tit">⏱ Regla de oro — intervalos entre vacunas</div><div class="v26-int-grid">`;
    data.intervalos.forEach((r,i)=>{
      const t=r.tipo==='ok'?'ok':'warn';
      html+=`<div class="v26-int-card ${t}">
        <div class="v26-int-badge">${t==='ok'?'✅ COMPATIBLE':'⚠️ ATENCIÓN'}</div>
        <div class="v26-int-combo">${r.combinacion}</div>
        <div class="v26-int-regla">${r.regla}</div>
        ${adm?`<div class="v26-adm-bar" style="margin-top:8px">
          <button class="v26-abtn v26-abtn-edit" onclick="window._v26EditInt(${i})">✏️</button>
          <button class="v26-abtn v26-abtn-del"  onclick="window._v26DelInt(${i})">🗑</button>
        </div>`:''}
      </div>`;
    });
    html+=`</div>`;
    if(adm)html+=`<div class="v26-adm-bar" style="margin-bottom:24px">
      <button class="v26-abtn v26-abtn-add" onclick="window._v26AddInt()">＋ Agregar intervalo</button>
    </div>`;
    html+=`<div class="v26-sec-tit">🧠 Reglas mnemotécnicas para estudiar</div><div class="v26-mnemo-grid">`;
    data.mnemotecnia.forEach((m,i)=>{
      html+=`<div class="v26-mnemo-card">
        <div class="v26-mnemo-tit">${m.titulo}</div>
        <div class="v26-mnemo-txt">${m.texto}</div>
        ${adm?`<div class="v26-adm-bar" style="margin-top:8px">
          <button class="v26-abtn v26-abtn-edit" onclick="window._v26EditMnemo(${i})">✏️</button>
          <button class="v26-abtn v26-abtn-del"  onclick="window._v26DelMnemo(${i})">🗑</button>
        </div>`:''}
      </div>`;
    });
    html+=`</div>`;
    if(adm)html+=`<div class="v26-adm-bar" style="margin-top:12px">
      <button class="v26-abtn v26-abtn-add" onclick="window._v26AddMnemo()">＋ Agregar mnemotecnia</button>
    </div>`;
    cont.innerHTML=html;
  }

  async function renderTodo(){ await renderClasificacion(); await renderEdad(); await renderIntervalos(); }

  // ════════════════════════════════════════════════════════════════
  // TOGGLE — independiente por tarjeta
  // ════════════════════════════════════════════════════════════════
  window._v26Tog=function(si,vi){
    const det=document.getElementById(`cd-${si}-${vi}`);
    const trig=document.getElementById(`ct-${si}-${vi}`);
    if(!det||!trig)return;
    const open=det.style.display==='block';
    if(open){ det.style.display='none'; trig.classList.remove('open'); }
    else { det.style.display='block'; trig.classList.add('open'); setTimeout(()=>trig.scrollIntoView({behavior:'smooth',block:'nearest'}),80); }
  };

  // ════════════════════════════════════════════════════════════════
  // TABS
  // ════════════════════════════════════════════════════════════════
  window._v26Tab=function(btn,tid){
    document.querySelectorAll('.v26-tab').forEach(t=>t.classList.remove('on'));
    btn.classList.add('on');
    const map={clasificacion:'v26-t-c',edad:'v26-t-e',intervalos:'v26-t-i'};
    Object.keys(map).forEach(k=>{ const el=document.getElementById(map[k]); if(el)el.style.display=k===tid?'':'none'; });
  };

  // ════════════════════════════════════════════════════════════════
  // MODAL BASE
  // ════════════════════════════════════════════════════════════════
  function abrirModal(titulo, buildBody, onGuardar){
    const ov=document.createElement('div');
    ov.className='v26-mover';
    ov.innerHTML=`<div class="v26-modal">
      <div class="v26-modal-hdr"><h3>${titulo}</h3><button class="v26-mclose">✕</button></div>
      <div class="v26-modal-body" id="v26mb"></div>
      <div class="v26-modal-ftr"><button class="v26-mcancel">Cancelar</button><button class="v26-msave">💾 Guardar</button></div>
    </div>`;
    document.body.appendChild(ov);
    const body=ov.querySelector('#v26mb');
    buildBody(body);
    ov.querySelector('.v26-mclose').onclick=()=>ov.remove();
    ov.querySelector('.v26-mcancel').onclick=()=>ov.remove();
    ov.querySelector('.v26-msave').onclick=()=>onGuardar(ov,body);
    return ov;
  }

  function campo(label,id,value,tipo){
    if(tipo==='textarea')
      return `<div class="v26-fgroup"><label class="v26-flbl">${label}</label><textarea class="v26-ftextarea" id="${id}">${(value||'').replace(/</g,'&lt;')}</textarea></div>`;
    if(tipo==='nota-tipo')
      return `<div class="v26-fgroup"><label class="v26-flbl">${label}</label><select class="v26-fselect" id="${id}">
        <option value="info"${value==='info'?' selected':''}>ℹ️ Info (azul)</option>
        <option value="ok"${value==='ok'?' selected':''}>✅ Ok (verde)</option>
        <option value="warn"${value==='warn'?' selected':''}>⚠️ Advertencia (amarillo)</option>
        <option value="danger"${value==='danger'?' selected':''}>🔴 Peligro (rojo)</option>
      </select></div>`;
    if(tipo==='int-tipo')
      return `<div class="v26-fgroup"><label class="v26-flbl">${label}</label><select class="v26-fselect" id="${id}">
        <option value="ok"${value==='ok'?' selected':''}>✅ Compatible</option>
        <option value="warn"${value==='warn'?' selected':''}>⚠️ Atención</option>
      </select></div>`;
    return `<div class="v26-fgroup"><label class="v26-flbl">${label}</label><input class="v26-finput" type="text" id="${id}" value="${(value||'').replace(/"/g,'&quot;').replace(/</g,'&lt;')}"></div>`;
  }

  function val(ctx,id){ const el=ctx.querySelector?ctx.querySelector('#'+id):document.getElementById(id); return el?el.value.trim():''; }

  function buildDosisEditor(body,dosis){
    const wrap=document.createElement('div');
    wrap.className='v26-fgroup';
    wrap.innerHTML=`<label class="v26-flbl">Dosis / calendario (pills)</label>
      <div class="v26-dosis-editor" id="dosis-list"></div>
      <button type="button" class="v26-dosis-add" id="dosis-add-btn">＋ Agregar dosis</button>`;
    body.appendChild(wrap);
    const list=wrap.querySelector('#dosis-list');
    function addRow(txt){
      const row=document.createElement('div');
      row.className='v26-dosis-row';
      row.innerHTML=`<input class="v26-finput dosis-inp" type="text" value="${(txt||'').replace(/"/g,'&quot;')}" placeholder="Ej: 1ª dosis: 12 meses">
        <button type="button" class="v26-dosis-del" title="Eliminar dosis">✕</button>`;
      row.querySelector('.v26-dosis-del').onclick=()=>row.remove();
      list.appendChild(row);
    }
    (dosis||[]).forEach(d=>addRow(d));
    wrap.querySelector('#dosis-add-btn').onclick=()=>addRow('');
  }
  function getDosis(body){ return Array.from(body.querySelectorAll('.dosis-inp')).map(i=>i.value.trim()).filter(Boolean); }

  function modalConfirmDelete(titulo,desc,onConfirm){
    const ov=abrirModal(titulo,
      function(body){ body.innerHTML=`<p style="color:#94a3b8;font-size:0.84rem;line-height:1.6">${desc}<br><span style="color:#f87171;font-size:0.77rem;margin-top:6px;display:block">Esta acción no se puede deshacer.</span></p>`; },
      function(o){ onConfirm(); o.remove(); }
    );
    setTimeout(()=>{
      const b=ov.querySelector('.v26-msave');
      if(b){b.textContent='🗑 Sí, eliminar';b.style.background='rgba(248,113,113,0.15)';b.style.borderColor='rgba(248,113,113,0.5)';b.style.color='#f87171';}
    },0);
  }

  // ════════════════════════════════════════════════════════════════
  // ADMIN — VACUNAS
  // ════════════════════════════════════════════════════════════════
  window._v26EditVac=async function(si,vi){
    const data=await cargarDatos(); const vac=data.clasificacion[si].vacunas[vi];
    abrirModal('✏️ Editar vacuna', function(body){
      body.innerHTML=campo('Nombre','vnom',vac.nombre)+campo('Badge (tipo)','vbadge',vac.badge)+campo('Previene','vprev',vac.previene);
      buildDosisEditor(body,vac.dosis);
      const extra=document.createElement('div');
      extra.innerHTML=campo('Nota / advertencia','vnota',vac.nota,'textarea')+campo('Color de nota','vntipo',vac.notaTipo,'nota-tipo');
      body.appendChild(extra);
    }, async function(ov,body){
      vac.nombre=val(ov,'vnom'); vac.badge=val(ov,'vbadge'); vac.previene=val(ov,'vprev');
      vac.dosis=getDosis(body); vac.nota=val(ov,'vnota'); vac.notaTipo=val(ov,'vntipo');
      await guardarDatos(data); renderClasificacion(); ov.remove(); toast('✅ Vacuna actualizada');
    });
  };

  window._v26AddVac=async function(si){
    const data=await cargarDatos();
    abrirModal('＋ Nueva vacuna', function(body){
      body.innerHTML=campo('Nombre','vnom','')+campo('Badge (tipo)','vbadge','')+campo('Previene','vprev','');
      buildDosisEditor(body,[]);
      const extra=document.createElement('div');
      extra.innerHTML=campo('Nota / advertencia','vnota','','textarea')+campo('Color de nota','vntipo','info','nota-tipo');
      body.appendChild(extra);
    }, async function(ov,body){
      const n=val(ov,'vnom'); if(!n){alert('El nombre es obligatorio');return;}
      data.clasificacion[si].vacunas.push({nombre:n,badge:val(ov,'vbadge'),previene:val(ov,'vprev'),dosis:getDosis(body),nota:val(ov,'vnota'),notaTipo:val(ov,'vntipo')});
      await guardarDatos(data); renderClasificacion(); ov.remove(); toast('✅ Vacuna agregada');
    });
  };

  window._v26DelVac=async function(si,vi){
    const data=await cargarDatos(); const nombre=data.clasificacion[si].vacunas[vi].nombre;
    modalConfirmDelete('🗑 Eliminar vacuna',`¿Eliminar <strong style="color:#e2e8f0">${nombre}</strong>?`,async function(){
      data.clasificacion[si].vacunas.splice(vi,1); await guardarDatos(data); renderClasificacion(); toast('🗑 Vacuna eliminada');
    });
  };

  // ════════════════════════════════════════════════════════════════
  // ADMIN — TABLA EDAD
  // ════════════════════════════════════════════════════════════════
  window._v26EditEdad=async function(i){
    const data=await cargarDatos(); const r=data.edadTabla[i];
    abrirModal('✏️ Editar fila', function(body){
      body.innerHTML=campo('Edad / Grupo','edad',r.edad)+campo('Vacunas','vacunas',r.vacunas)+campo('Nota','nota',r.nota);
    }, async function(ov){
      data.edadTabla[i]={edad:val(ov,'edad'),vacunas:val(ov,'vacunas'),nota:val(ov,'nota')};
      await guardarDatos(data); renderEdad(); ov.remove(); toast('✅ Fila actualizada');
    });
  };

  window._v26AddEdad=async function(){
    const data=await cargarDatos();
    abrirModal('＋ Nueva fila', function(body){
      body.innerHTML=campo('Edad / Grupo','edad','')+campo('Vacunas','vacunas','')+campo('Nota','nota','—');
    }, async function(ov){
      const e=val(ov,'edad'); if(!e){alert('La edad es obligatoria');return;}
      data.edadTabla.push({edad:e,vacunas:val(ov,'vacunas'),nota:val(ov,'nota')});
      await guardarDatos(data); renderEdad(); ov.remove(); toast('✅ Fila agregada');
    });
  };

  window._v26DelEdad=async function(i){
    const data=await cargarDatos();
    modalConfirmDelete('🗑 Eliminar fila',`¿Eliminar la fila <strong style="color:#e2e8f0">${data.edadTabla[i].edad}</strong>?`,async function(){
      data.edadTabla.splice(i,1); await guardarDatos(data); renderEdad(); toast('🗑 Fila eliminada');
    });
  };

  window._v26EE=async function(){
    const data=await cargarDatos();
    abrirModal('📋 Editar tabla — JSON', function(body){
      body.innerHTML=campo('Array JSON','json',JSON.stringify(data.edadTabla,null,2),'textarea');
      body.querySelector('#json').style.minHeight='260px';
    }, async function(ov){
      try{data.edadTabla=JSON.parse(val(ov,'json'));await guardarDatos(data);renderEdad();ov.remove();toast('✅ Tabla actualizada');}
      catch(e){alert('JSON inválido: '+e.message);}
    });
  };

  // ════════════════════════════════════════════════════════════════
  // ADMIN — INTERVALOS
  // ════════════════════════════════════════════════════════════════
  window._v26EditInt=async function(i){
    const data=await cargarDatos(); const r=data.intervalos[i];
    abrirModal('✏️ Editar intervalo', function(body){
      body.innerHTML=campo('Combinación','combo',r.combinacion)+campo('Regla','regla',r.regla,'textarea')+campo('Tipo','tipo',r.tipo,'int-tipo');
    }, async function(ov){
      data.intervalos[i]={combinacion:val(ov,'combo'),regla:val(ov,'regla'),tipo:val(ov,'tipo')};
      await guardarDatos(data); renderIntervalos(); ov.remove(); toast('✅ Intervalo actualizado');
    });
  };

  window._v26AddInt=async function(){
    const data=await cargarDatos();
    abrirModal('＋ Nuevo intervalo', function(body){
      body.innerHTML=campo('Combinación','combo','')+campo('Regla','regla','','textarea')+campo('Tipo','tipo','ok','int-tipo');
    }, async function(ov){
      const c=val(ov,'combo'); if(!c){alert('La combinación es obligatoria');return;}
      data.intervalos.push({combinacion:c,regla:val(ov,'regla'),tipo:val(ov,'tipo')});
      await guardarDatos(data); renderIntervalos(); ov.remove(); toast('✅ Intervalo agregado');
    });
  };

  window._v26DelInt=async function(i){
    const data=await cargarDatos();
    modalConfirmDelete('🗑 Eliminar intervalo',`¿Eliminar <strong style="color:#e2e8f0">${data.intervalos[i].combinacion}</strong>?`,async function(){
      data.intervalos.splice(i,1); await guardarDatos(data); renderIntervalos(); toast('🗑 Eliminado');
    });
  };

  // ════════════════════════════════════════════════════════════════
  // ADMIN — MNEMOTECNIA
  // ════════════════════════════════════════════════════════════════
  window._v26EditMnemo=async function(i){
    const data=await cargarDatos(); const m=data.mnemotecnia[i];
    abrirModal('✏️ Editar mnemotecnia', function(body){
      body.innerHTML=campo('Título','titulo',m.titulo)+campo('Texto','texto',m.texto,'textarea');
    }, async function(ov){
      data.mnemotecnia[i]={titulo:val(ov,'titulo'),texto:val(ov,'texto')};
      await guardarDatos(data); renderIntervalos(); ov.remove(); toast('✅ Actualizado');
    });
  };

  window._v26AddMnemo=async function(){
    const data=await cargarDatos();
    abrirModal('＋ Nueva mnemotecnia', function(body){
      body.innerHTML=campo('Título','titulo','')+campo('Texto','texto','','textarea');
    }, async function(ov){
      const t=val(ov,'titulo'); if(!t){alert('El título es obligatorio');return;}
      data.mnemotecnia.push({titulo:t,texto:val(ov,'texto')});
      await guardarDatos(data); renderIntervalos(); ov.remove(); toast('✅ Mnemotecnia agregada');
    });
  };

  window._v26DelMnemo=async function(i){
    const data=await cargarDatos();
    modalConfirmDelete('🗑 Eliminar mnemotecnia',`¿Eliminar <strong style="color:#e2e8f0">${data.mnemotecnia[i].titulo}</strong>?`,async function(){
      data.mnemotecnia.splice(i,1); await guardarDatos(data); renderIntervalos(); toast('🗑 Eliminada');
    });
  };

  // ════════════════════════════════════════════════════════════════
  // NAVEGACIÓN
  // ════════════════════════════════════════════════════════════════
  let _origenHash=null;

  function _esperarFirebase(){
    return new Promise(function(resolve){
      if(window._fbDb && window.__fb){ resolve(); return; }
      var tid = setTimeout(function(){
        document.removeEventListener('firebaseReady', onReady);
        console.warn('[VAC2026] Firebase no disponible tras 6s — usando fallback');
        resolve();
      }, 6000);
      function onReady(){ clearTimeout(tid); setTimeout(resolve, 80); }
      document.addEventListener('firebaseReady', onReady, {once:true});
    });
  }

  async function mostrarPanel(opts){
    opts=opts||{};
    _datosCache = null;
    inyectarEstilos(); construirPanel();
    await _esperarFirebase();
    await renderTodo();
    document.getElementById('menu-principal')?.classList.add('oculto');
    document.querySelectorAll('.pagina-cuestionario').forEach(p=>p.classList.remove('activa'));
    const bp=document.getElementById('buscador-panel'); if(bp)bp.style.display='none';
    document.getElementById('vac2026-panel').classList.add('activo');
    window.scrollTo(0,0);
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
    if(window.location.hash==='#vacunas2026'){
      inyectarEstilos(); construirPanel();
      mostrarPanel({desde:'menu'});
    }
  });

  // ════════════════════════════════════════════════════════════════
  // MIGRACIÓN: subir DATA_DEFAULT a Firestore (solo admin, una vez)
  // Llamar desde consola: window.vac2026MigrarAFirestore()
  // ════════════════════════════════════════════════════════════════
  window.vac2026MigrarAFirestore = async function(){
    if(!window._fbDb || !window.__fb){
      alert('❌ Firebase no está disponible. Asegurate de estar logueado.');
      return;
    }
    if(typeof window.fbIsAdmin !== 'function' || !window.fbIsAdmin()){
      alert('❌ Solo el admin puede ejecutar esta migración.');
      return;
    }
    try{
      const {doc, setDoc} = window.__fb;
      await setDoc(doc(window._fbDb, 'meta', 'calendarioVacunacion'), DATA_DEFAULT);
      _datosCache = null; // limpiar caché para forzar recarga
      alert('✅ Datos del calendario migrados a Firestore correctamente.\nYa podés recargar la página.');
      console.log('[VAC2026] Migración a Firestore completada.');
    }catch(e){
      alert('❌ Error al migrar: ' + e.message);
      console.error('[VAC2026] Error en migración:', e);
    }
  };

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
