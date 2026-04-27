// V4 — Firebase + UI mejorada
/* ══════════════════════════════════════════════════════════════════
   HITOS DEL DESARROLLO INFANTIL — Módulo independiente
   Depende de: script.js (window.fbIsAdmin, window.showSection,
               window._fbDb, window.__fb)
   Fuentes: Nelson Pediatría 21ª ed. · Fejerman & Fernández Álvarez
            Guías de supervisión de salud SAP · PRONAP · DSM-5
            Denver II (DDST)
   ══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const FIRESTORE_DOC = 'hitosDesarrollo';   // meta/hitosDesarrollo
  const CACHE_KEY     = 'hitos_cache_v2';

  /* ── 1. GLOSARIO DE SIGLAS ─────────────────────────────────────── */
  const GLOSARIO = [
    { sigla: 'SA',    def: 'Semanas de Amenorrea (edad gestacional)' },
    { sigla: 'RN',    def: 'Recién Nacido (0–28 días de vida)' },
    { sigla: 'RNTEG', def: 'Recién Nacido de Término en buen estado general' },
    { sigla: 'SNC',   def: 'Sistema Nervioso Central' },
    { sigla: 'TDL',   def: 'Trastorno del Desarrollo del Lenguaje' },
    { sigla: 'TEA',   def: 'Trastorno del Espectro Autista' },
    { sigla: 'TDAH',  def: 'Trastorno por Déficit de Atención e Hiperactividad' },
    { sigla: 'PC',    def: 'Parálisis Cerebral' },
    { sigla: 'SAP',   def: 'Sociedad Argentina de Pediatría' },
    { sigla: 'PRONAP',def: 'Programa Nacional de Actualización Pediátrica (SAP)' },
    { sigla: 'm',     def: 'Mes(es) de vida' },
    { sigla: 'A',     def: 'Año(s) de vida' },
    { sigla: 'CI',    def: 'Cociente Intelectual' },
    { sigla: 'AVD',   def: 'Actividades de la Vida Diaria' },
    { sigla: 'R°',    def: 'Reflejo(s)' },
    { sigla: 'BSID',  def: 'Bayley Scales of Infant and Toddler Development' },
    { sigla: 'DDST',  def: 'Denver Developmental Screening Test (Denver II)' },
    { sigla: 'OPG',   def: 'Objeto Pequeño y de Gran Precisión (pinza)' },
  ];

  /* ── 2. DATOS DE HITOS (fuente de verdad local / seed) ─────────── */
  const HITOS_DEFAULT = [
    {
      id: 'rn', edad: 'RN', label: 'Recién Nacido',
      motGrueso: 'Hipotonía fisiológica axial. Reflejos arcaicos presentes: Moro, prensión palmar/plantar, búsqueda, succión, Babinski. Postura en flexión.',
      motFino:   'Prensión palmar refleja. Puños cerrados la mayor parte del tiempo.',
      dibujo:    '—',
      lenguaje:  'Llanto como única forma de comunicación. Respuesta a la voz humana (preferencia por voz materna). Orientación a sonidos de alta frecuencia.',
      social:    'Reconoce el rostro humano. Preferencia por el olor materno. Inicio del vínculo de apego.',
      alertas:   'Ausencia de respuesta a la voz. Hipotonía severa ("bebé fláccido"). Ausencia de reflejos arcaicos. Falta de reflejo de succión eficaz.',
    },
    {
      id: 'm1', edad: '1m', label: '1 mes',
      motGrueso: 'En decúbito ventral: eleva el mentón brevemente. Sostén cefálico incompleto al sentar (cabeza cae hacia atrás).',
      motFino:   'Manos cerradas en puño. Reflejo de prensión palmar activo.',
      dibujo:    '—',
      lenguaje:  'Vocalización refleja. Detiene el llanto al escuchar la voz de la madre. Diferencia llanto de hambre, dolor y cansancio.',
      social:    'Fijación visual de rostro humano a 20–25 cm. Inicio de la "sonrisa refleja" (no social).',
      alertas:   'No fija la mirada. No se calma con la voz. Persistencia de postura asimétrica intensa.',
    },
    {
      id: 'm2', edad: '2m', label: '2 meses',
      motGrueso: 'Sostén cefálico en posición ventral (eleva cabeza 45°). En decúbito prono levanta el tórax apoyando en antebrazos.',
      motFino:   'Puños comienzan a abrirse. Sigue objetos horizontalmente 180°.',
      dibujo:    '—',
      lenguaje:  'Gorjeos y vocalizaciones ("aa", "uu"). Responde a la voz con vocalización.',
      social:    '<strong>Sonrisa social</strong> (responde a rostro humano). Contacto ocular sostenido. Sigue objetos con la mirada.',
      alertas:   'Ausencia de sonrisa social. No sigue objetos con la mirada. No vocaliza.',
    },
    {
      id: 'm3', edad: '3m', label: '3 meses',
      motGrueso: 'Cabeza ya no se retrasa al sentar (tracción cefálica). Eleva cabeza y tórax en prono con brazos extendidos. Control cefálico completo.',
      motFino:   'Manos abiertas. Lleva manos a la línea media. Intenta alcanzar objetos.',
      dibujo:    '—',
      lenguaje:  'Gorjeos prolongados ("aaa, gaga"). Reconoce voz de la madre. Ríe a carcajadas.',
      social:    'Contacto social activo y mantenido. Responde al juego cara a cara. Escucha música con interés. Reconoce a cuidadores principales.',
      alertas:   'No sostiene la cabeza. No sonríe. No vocaliza. Ausencia de seguimiento visual.',
    },
    {
      id: 'm4', edad: '4m', label: '4 meses',
      motGrueso: 'Buen sostén cefálico sentado con apoyo. En prono: apoyo en antebrazos con cabeza a 90°. Inicia volteo.',
      motFino:   'Prensión voluntaria: intenta alcanzar y asir objetos. Lleva objetos a la boca. Inspecciona sus manos.',
      dibujo:    '—',
      lenguaje:  'Vocaliza con variaciones de tono y ritmo. Ríe espontáneamente. Responde a su nombre.',
      social:    'Diferencia familiares de extraños. Juega con sus manos mirándolas. Muestra placer y displacer claramente.',
      alertas:   'No sostiene objetos. No lleva manos a línea media. No vocaliza. Llanto excesivo sin causa.',
    },
    {
      id: 'm6', edad: '6m', label: '6 meses',
      motGrueso: '<strong>Se sienta sin apoyo</strong> (o con mínimo apoyo). Volteo completo (decúbito prono ↔ supino). Sostén completo en prono. Carga peso en miembros inferiores al sostenerse de pie.',
      motFino:   'Prensión palmar voluntaria bilateral. Pasa objetos de una mano a otra. Agarra objetos con toda la mano.',
      dibujo:    '—',
      lenguaje:  'Balbucea (ma, ba, da). Localiza la fuente del sonido. Responde a su nombre. Comprende el "no" con tono firme.',
      social:    'Ansiedad ante extraños (inicio). Juego social con adultos. Busca a la madre visualmente. Imita expresiones faciales.',
      alertas:   'No se sienta con apoyo. No balbucea. No sigue objetos. Pérdida de habilidades previas (regresión).',
    },
    {
      id: 'm7', edad: '7m', label: '7 meses',
      motGrueso: 'Gatea y rueda sobre sí mismo. Se sienta sin apoyo establemente. Soporte bípedo con ayuda.',
      motFino:   '<strong>Prensión palmar</strong>. Pasa objetos de una mano a otra con destreza.',
      dibujo:    '—',
      lenguaje:  'Silabeo y balbucea. Disfruta mirándose en el espejo. <strong>Se inhibe ante el "no"</strong> (comprende la negación con entonación).',
      social:    'Preferencia clara por la madre/cuidador principal. Ansiedad ante extraños establecida. Responde a cambios en el contenido emocional del otro.',
      alertas:   'No se sienta solo. No balbucea. No muestra preferencia por cuidadores. No se inhibe ante el "no".',
    },
    {
      id: 'm9', edad: '9m', label: '9 meses',
      motGrueso: 'Gatea en cuatro puntos (alternando brazos y piernas). Se sienta solo con total estabilidad. Se pone de pie sujetándose de muebles.',
      motFino:   'Inicio de <strong>pinza radial inferior</strong> (dedo índice + lateral del pulgar). Golpea dos objetos entre sí.',
      dibujo:    '—',
      lenguaje:  'Silabeo canónico (ma-ma, pa-pa, da-da) sin significado específico. Comprende palabras simples en contexto. Sigue instrucciones con gesto ("dame").',
      social:    'Juego imitativo (palmadas, cucú-trás). Señala con el índice para pedir. Busca objetos escondidos (permanencia del objeto).',
      alertas:   'No gatea ni se arrastra. No hace pinza. No balbucea con sílabas canónicas. No señala ni muestra objetos.',
    },
    {
      id: 'm10', edad: '10m', label: '10 meses',
      motGrueso: 'Permanece sentado sin soporte establemente. Alcanza <strong>bipedestación</strong> sujetándose de un mueble. Camina lateral sujetándose (crucero).',
      motFino:   '<strong>Pinza radial inferior</strong> activa. Movimiento de tijera para tomar objetos pequeños.',
      dibujo:    '—',
      lenguaje:  '<strong>Silabeo canónico</strong> (ma-ma-ma, pa-pa-pa, da-da-da). Responde a su nombre de forma consistente. Saluda con la mano ("chau").',
      social:    'Responde a su nombre. Dice "chau" con la mano. Juega a dar palmadas (juego social). Imita gestos simples.',
      alertas:   'No balbucea con consonantes (m, b, d). No responde a su nombre. No realiza imitación gestual. No señala.',
    },
    {
      id: 'm12', edad: '12m<br>1 año', label: '12 meses (1 año)',
      motGrueso: '<strong>Camina con ayuda</strong> (tomado de las manos). Se pone de pie solo. Sube escalones gateando.',
      motFino:   '<strong>Pinza radial superior</strong> (pulgar + índice en oposición). Toma objetos pequeños con precisión. Introduce objetos en recipientes.',
      dibujo:    'Garabateo espontáneo si se le da un lápiz (trayectorias sin intención).',
      lenguaje:  '<strong>Primeras palabras con significado</strong> (además de "mamá" y "papá"). 1–3 palabras funcionales. Comprende órdenes simples con gesto. Jerga con entonación.',
      social:    'Ajusta la postura al vestirlo. Colabora al sostener el biberón. Imita acciones simples. Juego exploratorio con objetos.',
      alertas:   '⚠️ <strong>ALARMA:</strong> No dice ninguna palabra con significado. No señala con el índice. No hace gestos (saludar, dar palmadas). No camina con ayuda. No busca objetos escondidos.',
    },
    {
      id: 'm15', edad: '15m', label: '15 meses',
      motGrueso: '<strong>Camina solo</strong> de forma estable. Sube escaleras gateando o con ayuda. Corre torpemente.',
      motFino:   'Torre de 2 cubos. Introduce objetos en orificios. Agarra la cuchara (sin usar bien).',
      dibujo:    'Garabateo irregular espontáneo.',
      lenguaje:  'Obedece órdenes simples sin gesto ("dame la pelota"). <strong>Nombra objetos familiares</strong>. Vocabulario de 5–10 palabras. Señala partes del cuerpo nombradas.',
      social:    'Abraza y busca a los padres activamente. <strong>Indica deseos señalando</strong> con el índice. Juego de exploración solitaria. Lleva libros a adultos para que lean.',
      alertas:   '⚠️ <strong>ALARMA:</strong> No camina solo. No señala con el índice. No dice al menos 5 palabras. No busca objetos escondidos.',
    },
    {
      id: 'm18', edad: '18m', label: '18 meses',
      motGrueso: '<strong>Corre rígido</strong> (tronco en bloque). Sube escaleras con apoyo. Empuja y arrastra juguetes.',
      motFino:   'Torre de 3–4 cubos. Pasa páginas de libro (gruesas). Usa la cuchara con derrames. Tira pelota sentado.',
      dibujo:    '<strong>Garabateo irregular</strong> (trazos sin forma definida).',
      lenguaje:  '<strong>10 palabras o más</strong>. Identifica partes del cuerpo. Nombra imágenes en libros. Imita palabras nuevas. Comprende frases cortas de dos pasos.',
      social:    'Come solo (con cuchara, con derrames). Se queja señalando. Besa y abraza a los padres. Muestra objetos con orgullo. Juego paralelo (junto a otros niños, no con ellos).',
      alertas:   '⚠️ <strong>ALARMA:</strong> Vocabulario < 10 palabras. No señala para pedir. No imita acciones de adultos. Pérdida de palabras ya adquiridas (regresión → descartar TEA).',
    },
    {
      id: 'm24', edad: '24m<br>2 años', label: '2 años',
      motGrueso: '<strong>Corre bien</strong>. Sube y baja escaleras <strong>de a un escalón</strong> (mismo pie adelante). Patea pelota grande. Salta con los dos pies juntos.',
      motFino:   'Torre de 6 cubos. Maneja la cuchara sin derrames. Abre puertas girando perilla. Imita trazos verticales.',
      dibujo:    '<strong>Garabateo circular</strong>. Imita línea vertical. Trazos con intención pero sin forma reconocible.',
      lenguaje:  '<strong>Une 2–3 palabras</strong> ("mamá agua", "nene no"). Vocabulario de 50+ palabras. Comprende conceptos espaciales simples (arriba/abajo). Refiere a sí mismo por el nombre.',
      social:    'Toma la cuchara correctamente. Cuenta experiencias inmediatas. Ayuda a desvestirse. Juego paralelo consolidado. Muestra posesividad ("mío").',
      alertas:   '⚠️ <strong>ALARMA:</strong> No une 2 palabras espontáneamente. Vocabulario < 50 palabras. No señala partes del cuerpo. Ausencia de juego funcional con objetos. No imita acciones.',
    },
    {
      id: 'm30', edad: '30m', label: '30 meses',
      motGrueso: '<strong>Sube escaleras alternando pies</strong>. Salta desde altura pequeña. Corre con buen equilibrio. Pedalea triciclo con ayuda.',
      motFino:   'Torre de 8 cubos. Enhebra cuentas grandes. Sostiene lápiz con tres dedos (agarre tridigital).',
      dibujo:    '<strong>Imita un círculo (◎)</strong>. Trazos horizontales y verticales deliberados.',
      lenguaje:  'Se refiere a sí mismo con <strong>"yo"</strong>. Conoce su nombre completo y apellido. Frases de 3 palabras. Comprende "grande/chico", "arriba/abajo". Hace preguntas ("¿qué es eso?").',
      social:    'Ayuda a recoger juguetes. <strong>Juego simbólico</strong> (finge hablar por teléfono, alimentar muñecos). Juega junto a otros niños. Imita actividades domésticas.',
      alertas:   '⚠️ <strong>ALARMA:</strong> No hace frases de 2 palabras. No usa "yo" o su nombre. No realiza juego simbólico. Estereotipias o conductas repetitivas llamativas.',
    },
    {
      id: 'a3', edad: '3 A', label: '3 años',
      motGrueso: 'Anda en <strong>triciclo</strong>. <strong>Se mantiene en un pie</strong> 1–2 segundos. Sube y baja escaleras alternando pies con apoyo. Salta desde un escalón.',
      motFino:   'Torre de 9 cubos. Enhebra cuentas pequeñas. Usa tijeras con ayuda. Construye un puente de cubos imitando modelo.',
      dibujo:    '<strong>Copia un círculo (◎)</strong> sin modelo presente. Dibuja figura humana rudimentaria (cabeza con trazos).',
      lenguaje:  '<strong>Sabe su edad y sexo</strong>. Cuenta 3 objetos. Frases de 4–5 palabras. Comprende el concepto de "uno". Narra cuentos simples. Conoce colores básicos.',
      social:    '<strong>Juega juegos sencillos con otros niños</strong> (juego asociativo). Comprende turnos. Relata lo que hizo durante el día. Conoce su nombre completo y edad.',
      alertas:   '⚠️ <strong>ALARMA:</strong> No forma oraciones de 3 palabras. No reconoce su nombre. No hace juego de roles. Juego exclusivamente solitario. No comprende instrucciones de 2 pasos.',
    },
    {
      id: 'a4', edad: '4 A', label: '4 años',
      motGrueso: '<strong>Salta en un pie</strong> (varios saltos consecutivos). <strong>Patea la pelota</strong> con dirección. Lanza y atrapa pelota. Sube y baja escaleras sin apoyo.',
      motFino:   'Corta papel con tijeras en línea recta. Agarre tridigital del lápiz establecido. Abotona ropa. Construye torres de 10 cubos.',
      dibujo:    '<strong>Copia X y cuadrado (▣)</strong>. Dibuja persona con cabeza, tronco y extremidades ("monigote de cuatro partes").',
      lenguaje:  'Cuenta hasta 4. <strong>Narra una historia</strong> con inicio y final. Hace preguntas sobre el por qué. Comprende conceptos de tiempo (ayer, hoy, mañana). Articula correctamente la mayoría de los fonemas.',
      social:    '<strong>Juego cooperativo</strong> con varios niños. Comprende reglas simples de juego. Interacción social compleja. Empatía básica presente. Dramatización de roles.',
      alertas:   '⚠️ <strong>ALARMA:</strong> No comprende instrucciones de 3 pasos. No se hace entender por extraños. No realiza juego de roles. No salta en un pie.',
    },
    {
      id: 'a5', edad: '5 A', label: '5 años',
      motGrueso: 'Salta, corre y trepa con coordinación. Salta en un pie de forma sostenida. Camina en línea recta. Equilibrio estático y dinámico consolidado.',
      motFino:   'Usa tijeras con destreza. Escribe su nombre. Agarre del lápiz maduro. Copia figuras geométricas complejas.',
      dibujo:    '<strong>Copia triángulo (△)</strong>. <strong>Dibuja persona reconocible</strong> (cabeza, tronco, extremidades, rasgos faciales, ropa).',
      lenguaje:  '<strong>Cuenta hasta 10</strong>. Repite frases largas. <strong>Nombra colores</strong> básicos y algunos secundarios. Pregunta el significado de palabras. Relata cuentos en secuencia. Comprende analogías simples.',
      social:    'Pregunta significado de palabras nuevas. Comprende reglas sociales básicas. Amistades preferidas. Conciencia de género consolidada. Comprende la muerte como concepto (inicio).',
      alertas:   '⚠️ <strong>ALARMA:</strong> No dibuja persona reconocible. No cuenta hasta 10. No se entiende con extraños. Dificultades graves de atención o conducta. No juega con pares de su edad.',
    },
  ];

  /* ── 3. COLUMNAS DE LA TABLA ──────────────────────────────────── */
  const COLUMNAS_DEFAULT = [
    { key: 'motGrueso', label: 'Motor Grueso',            color: '#0d7490', emoji: '🏃' },
    { key: 'motFino',   label: 'Motor Fino',              color: '#0891b2', emoji: '✋' },
    { key: 'dibujo',    label: 'Dibujo / Grafomotricidad', color: '#0e7490', emoji: '✏️' },
    { key: 'lenguaje',  label: 'Lenguaje / Comunicación', color: '#155e75', emoji: '💬' },
    { key: 'social',    label: 'Social / Cognitivo',      color: '#164e63', emoji: '🧠' },
  ];

  /* ══════════════════════════════════════════════════════════════════
     FIREBASE — carga y guardado (igual que calendario-vacunacion.js)
  ══════════════════════════════════════════════════════════════════ */
  let _hitosCache = null;

  async function hitosCargarDatos() {
    if (_hitosCache) { estado.hitosData = _hitosCache; return; }

    // 1. Firestore
    if (window._fbDb && window.__fb) {
      try {
        const { doc, getDoc } = window.__fb;
        const snap = await getDoc(doc(window._fbDb, 'meta', FIRESTORE_DOC));
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data.hitos) && data.hitos.length) {
            _hitosCache = data.hitos;
            estado.hitosData = _hitosCache;
            if (Array.isArray(data.columnas) && data.columnas.length) {
              estado.columnas = data.columnas;
            }
            if (data.configTabla) estado.configTabla = Object.assign(estado.configTabla, data.configTabla);
            console.log('[HITOS] ✅ Datos cargados desde Firestore');
            try { localStorage.setItem(CACHE_KEY, JSON.stringify({ hitos: _hitosCache, columnas: estado.columnas, configTabla: estado.configTabla })); } catch (_) {}
            return;
          }
          console.warn('[HITOS] ⚠️ meta/hitosDesarrollo vacío. Ejecutá window.hitosMigrarAFirestore()');
        } else {
          console.warn('[HITOS] ⚠️ No existe meta/hitosDesarrollo. Ejecutá window.hitosMigrarAFirestore()');
        }
      } catch (e) {
        console.warn('[HITOS] No se pudo leer Firestore:', e);
      }
    } else {
      console.warn('[HITOS] Firebase no disponible. _fbDb=', !!window._fbDb, '__fb=', !!window.__fb);
    }

    // 2. localStorage (cache offline)
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.hitos) && parsed.hitos.length) {
          _hitosCache = parsed.hitos;
          estado.hitosData = _hitosCache;
          if (Array.isArray(parsed.columnas)) estado.columnas = parsed.columnas;
          if (parsed.configTabla) estado.configTabla = Object.assign(estado.configTabla, parsed.configTabla);
          console.log('[HITOS] 📦 Usando caché local');
          return;
        }
      }
    } catch (_) {}

    // 3. Datos por defecto (ya están en estado)
    console.warn('[HITOS] 🔴 Usando datos por defecto (hardcoded)');
  }

  async function hitosGuardarDatos() {
    const payload = {
      hitos: estado.hitosData,
      columnas: estado.columnas,
      configTabla: estado.configTabla,
    };
    _hitosCache = estado.hitosData;

    try { localStorage.setItem(CACHE_KEY, JSON.stringify(payload)); } catch (_) {}

    if (window._fbDb && window.__fb) {
      try {
        const { doc, setDoc } = window.__fb;
        await setDoc(doc(window._fbDb, 'meta', FIRESTORE_DOC), payload);
        console.log('[HITOS] 💾 Guardado en Firestore');
      } catch (e) {
        console.error('[HITOS] Error al guardar en Firestore:', e);
        hitosToast('⚠️ No se pudo guardar en la nube');
      }
    }
  }

  /* Migración inicial: subir HITOS_DEFAULT a Firestore (admin, una vez)
     Llamar desde consola: window.hitosMigrarAFirestore()            */
  window.hitosMigrarAFirestore = async function () {
    if (!window._fbDb || !window.__fb) { alert('❌ Firebase no disponible. Asegurate de estar logueado.'); return; }
    if (typeof window.fbIsAdmin !== 'function' || !window.fbIsAdmin()) { alert('❌ Solo el admin puede ejecutar esta migración.'); return; }
    try {
      const { doc, setDoc } = window.__fb;
      await setDoc(doc(window._fbDb, 'meta', FIRESTORE_DOC), {
        hitos: HITOS_DEFAULT,
        columnas: COLUMNAS_DEFAULT,
        configTabla: { fontSize: 0.84, colWidths: {}, headerWrap: {} },
      });
      _hitosCache = null;
      alert('✅ Hitos migrados a Firestore.\nYa podés recargar la página.');
      console.log('[HITOS] Migración a Firestore completada.');
    } catch (e) {
      alert('❌ Error al migrar: ' + e.message);
      console.error('[HITOS] Error en migración:', e);
    }
  };

  function esAdmin() { return typeof window.fbIsAdmin === 'function' && window.fbIsAdmin(); }

  function hitosToast(msg) {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1e293b;color:#f1f5f9;padding:10px 20px;border-radius:8px;font-size:0.85rem;z-index:99999;box-shadow:0 4px 16px rgba(0,0,0,0.3);pointer-events:none;';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  /* ── 5. ESTADO DEL MÓDULO ──────────────────────────────────────── */
  let estado = {
    vista: 'tabla',
    busqueda: '',
    hitosData: JSON.parse(JSON.stringify(HITOS_DEFAULT)),
    columnas: JSON.parse(JSON.stringify(COLUMNAS_DEFAULT)),
    configTabla: {
      fontSize: 0.84,     // rem
      colWidths: {},      // { motGrueso: 160, ... }  px
      headerWrap: {},     // { motGrueso: true } = wrapping permitido
    },
  };

  /* ── 4. INYECTAR ESTILOS ────────────────────────────────────────── */
  function inyectarEstilos() {
    if (document.getElementById('hitos-styles-v2')) return;
    const st = document.createElement('style');
    st.id = 'hitos-styles-v2';
    st.textContent = `
      /* ══ Pantalla principal ══ */
      #hitos-panel {
        display: none;
        max-width: 1400px;
        margin: 0 auto;
        padding: 20px 16px 80px;
        animation: fadeIn 0.3s ease-out;
      }
      #hitos-panel.activo { display: block; }

      /* ══ Header ══ */
      .hitos-header {
        background: linear-gradient(135deg, #155e75 0%, #0d7490 60%, #0891b2 100%);
        color: #fff;
        border-radius: 10px;
        padding: 22px 32px;
        margin: 0 0 24px;
        width: 100%;
        box-sizing: border-box;
        text-align: center;
        box-shadow: 0 6px 20px rgba(13,116,144,0.2);
        position: relative;
        overflow: hidden;
      }
      .hitos-header::before {
        content: '';
        position: absolute;
        top: -40%; right: -5%;
        width: 180px; height: 180px;
        background: rgba(255,255,255,0.05);
        border-radius: 50%;
      }
      .hitos-header h1 {
        font-size: 1.6rem;
        font-weight: 900;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      @media (max-width: 600px) {
        .hitos-header h1 { font-size: 1.1rem; white-space: normal; }
      }

      /* ══ Pie de fuentes (estático, al final) ══ */
      .hitos-fuentes-pie {
        margin-top: 28px;
        padding: 14px 18px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        font-size: 0.78rem;
        color: #64748b;
        font-style: italic;
        line-height: 1.6;
        text-align: center;
      }

      /* ══ Botón volver ══ */
      .hitos-btn-volver {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        margin-bottom: 18px;
        background: #f1f5f9;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        font-size: 0.85rem;
        font-weight: 600;
        color: #475569;
        cursor: pointer;
        transition: all 0.15s;
        text-decoration: none;
      }
      .hitos-btn-volver:hover { background: #e2e8f0; color: #1e293b; }

      /* ══ Controles de vista ══ */
      .hitos-controles {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 20px;
        align-items: center;
      }
      .hitos-btn-vista {
        padding: 8px 16px;
        border: 2px solid #0d7490;
        border-radius: 6px;
        background: #fff;
        color: #0d7490;
        font-weight: 600;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.15s;
      }
      .hitos-btn-vista.activo,
      .hitos-btn-vista:hover { background: #0d7490; color: #fff; }
      .hitos-buscar {
        padding: 8px 14px;
        border: 2px solid #cbd5e1;
        border-radius: 6px;
        font-size: 0.85rem;
        width: 220px;
        outline: none;
        transition: border-color 0.15s;
      }
      .hitos-buscar:focus { border-color: #0d7490; }
      .hitos-lbl-buscar { font-size: 0.82rem; color: #475569; font-weight: 500; }

      /* ══ VISTA TABLA — wrapper con scroll sticky ══ */
      .hitos-tabla-outer {
        position: relative;
      }
      .hitos-tabla-wrap {
        overflow-x: auto;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.08);
        border: 1px solid #e2e8f0;
        /* scrollbar siempre visible para usabilidad */
        scrollbar-width: thin;
        scrollbar-color: #0d7490 #f1f5f9;
      }
      .hitos-tabla-wrap::-webkit-scrollbar { height: 8px; }
      .hitos-tabla-wrap::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
      .hitos-tabla-wrap::-webkit-scrollbar-thumb { background: #0d7490; border-radius: 4px; }

      /* Scrollbar fantasma fijo en la parte inferior del viewport */
      .hitos-scroll-phantom {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: 14px;
        overflow-x: auto;
        z-index: 500;
        background: #f1f5f9;
        border-top: 1px solid #cbd5e1;
        scrollbar-width: thin;
        scrollbar-color: #0d7490 #f1f5f9;
      }
      .hitos-scroll-phantom::-webkit-scrollbar { height: 8px; }
      .hitos-scroll-phantom::-webkit-scrollbar-track { background: #f1f5f9; }
      .hitos-scroll-phantom::-webkit-scrollbar-thumb { background: #0d7490; border-radius: 4px; }
      .hitos-scroll-phantom-inner { height: 1px; }

      .hitos-tabla {
        width: 100%;
        border-collapse: collapse;
        font-size: var(--hitos-fs, 0.84rem);
        background: #fff;
        min-width: 900px;
      }
      .hitos-tabla thead th {
        padding: 12px 10px;
        font-weight: 700;
        font-size: 0.75rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        text-align: left;
        border-bottom: 2px solid #e2e8f0;
        white-space: nowrap;
        position: sticky;
        top: 0;
        z-index: 2;
        cursor: default;
        user-select: none;
      }
      /* Títulos con wrap permitido por admin */
      .hitos-tabla thead th.wrap-header { white-space: normal; min-width: 100px; }

      .hitos-tabla thead th:first-child {
        background: #f1f5f9; color: #1e293b;
        width: 90px; text-align: center;
      }
      .hitos-tabla thead th.col-motgrueso { background: #e0f2f7; color: #155e75; }
      .hitos-tabla thead th.col-motfino   { background: #cffafe; color: #164e63; }
      .hitos-tabla thead th.col-dibujo    { background: #dbeafe; color: #1e3a5f; }
      .hitos-tabla thead th.col-lenguaje  { background: #ede9fe; color: #4c1d95; }
      .hitos-tabla thead th.col-social    { background: #fce7f3; color: #831843; }
      .hitos-tabla thead th.col-alertas   { background: #fef3c7; color: #92400e; }
      .hitos-tabla thead th.col-admin     { background: #1e293b; color: #94a3b8; text-align: center; }

      /* Resize handle en th */
      .hitos-th-inner {
        display: flex; align-items: center; gap: 5px; position: relative;
      }
      .hitos-th-label { flex: 1; }
      .hitos-th-resize {
        width: 6px; cursor: col-resize; opacity: 0;
        position: absolute; right: -4px; top: 0; bottom: 0;
        background: #0d7490; border-radius: 3px;
        transition: opacity 0.15s;
      }
      .hitos-tabla thead th:hover .hitos-th-resize { opacity: 0.5; }
      .hitos-th-resize:hover, .hitos-th-resize.dragging { opacity: 1 !important; }

      /* Controles admin en th */
      .hitos-th-admin-btns {
        display: flex; gap: 2px; align-items: center;
        position: absolute; top: -1px; right: 10px;
        opacity: 0; transition: opacity 0.15s;
      }
      .hitos-tabla thead th:hover .hitos-th-admin-btns { opacity: 1; }
      .hitos-th-admin-btn {
        padding: 1px 5px; font-size: 0.65rem; border: none;
        background: rgba(13,116,144,0.15); color: #0d7490;
        border-radius: 3px; cursor: pointer; font-weight: 700;
        transition: background 0.1s;
      }
      .hitos-th-admin-btn:hover { background: #0d7490; color: #fff; }
      .hitos-th-admin-btn.wrap-on { background: #0d7490; color: #fff; }

      .hitos-tabla tbody tr {
        border-bottom: 1px solid #f1f5f9;
        transition: background 0.12s;
      }
      .hitos-tabla tbody tr:hover { background: #f8fafc; }
      .hitos-tabla tbody tr.hitos-tr-par { background: #fafbfc; }

      .hitos-tabla td {
        padding: 12px 10px;
        vertical-align: top;
        line-height: 1.55;
        color: #334155;
        border-right: 1px solid #f1f5f9;
      }
      .hitos-tabla td:last-child { border-right: none; }
      .hitos-td-edad {
        font-weight: 800; font-size: 1rem; color: #0d7490;
        text-align: center; white-space: nowrap;
        background: linear-gradient(180deg, #f0f9ff 0%, #e0f2f7 100%);
        border-right: 3px solid #0d7490 !important; min-width: 80px;
      }
      .hitos-edad-valor {
        display: block; line-height: 1.3;
      }
      .hitos-edad-label {
        display: block; font-size: 0.68rem; font-weight: 500;
        color: #64748b; text-transform: uppercase;
        letter-spacing: 0.04em; margin-top: 2px;
      }
      .hitos-alarma {
        background: #fffbeb; border-left: 3px solid #f59e0b;
        padding: 6px 8px; border-radius: 4px; font-size: 0.8rem;
        color: #78350f; margin-top: 4px;
      }

      /* ══ VISTA TARJETAS ══ */
      .hitos-cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 16px;
      }
      .hitos-card {
        background: #fff; border-radius: 10px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.07);
        border: 1px solid #e2e8f0; border-top: 4px solid #0d7490;
        overflow: hidden; transition: box-shadow 0.15s, transform 0.15s;
      }
      .hitos-card:hover { box-shadow: 0 6px 20px rgba(13,116,144,0.15); transform: translateY(-2px); }
      .hitos-card-header {
        background: linear-gradient(135deg, #0d7490, #0891b2);
        color: #fff; padding: 14px 16px;
        display: flex; align-items: center; justify-content: space-between;
      }
      .hitos-card-edad { font-size: 1.4rem; font-weight: 800; letter-spacing: -0.01em; }
      .hitos-card-sublabel { font-size: 0.75rem; opacity: 0.8; font-weight: 400; }
      .hitos-card-body { padding: 14px 16px; }
      .hitos-card-dominio { margin-bottom: 10px; }
      .hitos-card-dominio-titulo {
        font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
        letter-spacing: 0.06em; color: #64748b; margin-bottom: 3px;
        display: flex; align-items: center; gap: 5px;
      }
      .hitos-card-dominio-texto { font-size: 0.84rem; color: #334155; line-height: 1.5; }
      .hitos-card-alarma {
        background: #fffbeb; border: 1px solid #f59e0b;
        border-radius: 6px; padding: 8px 10px; margin-top: 10px;
        font-size: 0.78rem; color: #78350f; line-height: 1.4;
      }
      .hitos-card-alarma-titulo {
        font-weight: 700; margin-bottom: 2px;
        display: flex; align-items: center; gap: 4px;
      }

      /* ══ VISTA POR DOMINIO ══ */
      .hitos-dominio-section {
        background: #fff; border-radius: 10px;
        border: 1px solid #e2e8f0; margin-bottom: 20px;
        overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.05);
      }
      .hitos-dominio-header {
        padding: 14px 20px; color: #fff; font-weight: 700;
        font-size: 1rem; display: flex; align-items: center;
        gap: 8px; justify-content: space-between;
      }
      .hitos-dominio-lista { padding: 0; margin: 0; list-style: none; }
      .hitos-dominio-item {
        display: flex; gap: 0; border-bottom: 1px solid #f1f5f9;
        transition: background 0.1s;
      }
      .hitos-dominio-item:last-child { border-bottom: none; }
      .hitos-dominio-item:hover { background: #f8fafc; }
      .hitos-dominio-edad-col {
        min-width: 80px; padding: 12px 14px; font-weight: 700;
        font-size: 0.9rem; color: #0d7490; background: #f0f9ff;
        border-right: 2px solid #e0f2f7; display: flex;
        align-items: flex-start; justify-content: center;
        text-align: center; flex-direction: column;
      }
      .hitos-dominio-texto-col {
        padding: 12px 16px; font-size: 0.85rem;
        color: #334155; line-height: 1.55; flex: 1;
      }
      /* botones editar en dominio */
      .hitos-dominio-edit-col {
        display: flex; align-items: center; padding: 8px 10px;
        border-left: 1px solid #f1f5f9;
      }

      /* ══ GLOSARIO ══ */
      .hitos-glosario-section {
        background: #fff; border-radius: 10px;
        border: 1px solid #e2e8f0; margin-top: 28px;
        overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.05);
      }
      .hitos-glosario-header {
        background: linear-gradient(135deg, #1e293b, #334155);
        color: #fff; padding: 14px 20px; font-weight: 700;
        font-size: 0.95rem; display: flex; align-items: center;
        gap: 8px; cursor: pointer; user-select: none;
        justify-content: space-between;
      }
      .hitos-glosario-body {
        display: none; padding: 16px 20px; columns: 2; column-gap: 24px;
      }
      .hitos-glosario-body.abierto { display: block; }
      .hitos-glosario-item {
        break-inside: avoid; margin-bottom: 8px; font-size: 0.84rem;
        display: flex; gap: 6px; line-height: 1.4;
      }
      .hitos-sigla { font-weight: 700; color: #0d7490; min-width: 70px; white-space: nowrap; }
      .hitos-sigla-def { color: #475569; }

      /* ══ BARRA ADMIN ══ */
      .hitos-admin-bar {
        background: linear-gradient(135deg, #1e293b, #0f172a);
        border-radius: 8px; padding: 12px 16px; margin-bottom: 16px;
        display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
      }
      .hitos-admin-bar > span {
        color: #94a3b8; font-size: 0.8rem; font-weight: 600;
        text-transform: uppercase; letter-spacing: 0.05em;
      }
      /* Separador de grupo */
      .hitos-admin-sep {
        width: 1px; height: 24px; background: rgba(255,255,255,0.12);
        margin: 0 4px;
      }
      /* Slider tamaño de letra */
      .hitos-admin-fs-wrap {
        display: flex; align-items: center; gap: 8px;
      }
      .hitos-admin-fs-wrap label {
        color: #94a3b8; font-size: 0.75rem; white-space: nowrap;
      }
      .hitos-admin-fs-wrap input[type=range] {
        width: 90px; accent-color: #0d7490;
      }
      .hitos-admin-fs-val {
        color: #38bdf8; font-size: 0.78rem; font-weight: 700; min-width: 36px;
      }

      .hitos-admin-btn {
        padding: 6px 12px; border-radius: 6px; border: none;
        font-size: 0.8rem; font-weight: 600;
        cursor: pointer; transition: all 0.15s;
      }
      .hitos-admin-btn.verde  { background: #10b981; color: #fff; }
      .hitos-admin-btn.verde:hover  { background: #059669; }
      .hitos-admin-btn.rojo   { background: #ef4444; color: #fff; }
      .hitos-admin-btn.rojo:hover   { background: #dc2626; }
      .hitos-admin-btn.azul   { background: #0d7490; color: #fff; }
      .hitos-admin-btn.azul:hover   { background: #155e75; }
      .hitos-admin-btn.gris   { background: #64748b; color: #fff; }
      .hitos-admin-btn.gris:hover   { background: #475569; }
      .hitos-admin-btn.naranja { background: #f59e0b; color: #fff; }
      .hitos-admin-btn.naranja:hover { background: #d97706; }

      /* ══ MODAL EDITOR ══ */
      #hitos-modal-overlay {
        display: none; position: fixed; inset: 0;
        background: rgba(5,10,20,0.7);
        backdrop-filter: blur(6px);
        z-index: 99990; align-items: center; justify-content: center;
      }
      #hitos-modal-overlay.activo { display: flex; }
      .hitos-modal {
        background: #fff; border-radius: 12px;
        width: 90%; max-width: 780px; max-height: 90vh;
        overflow-y: auto; box-shadow: 0 25px 60px rgba(0,0,0,0.3);
        animation: fadeIn 0.2s ease-out;
      }
      .hitos-modal-header {
        background: linear-gradient(135deg, #155e75, #0d7490);
        color: #fff; padding: 18px 22px; border-radius: 12px 12px 0 0;
        display: flex; align-items: center; justify-content: space-between;
        position: sticky; top: 0; z-index: 2;
      }
      .hitos-modal-header h3 { font-size: 1rem; font-weight: 700; }
      .hitos-modal-close {
        background: rgba(255,255,255,0.2); border: none; color: #fff;
        width: 32px; height: 32px; border-radius: 50%; cursor: pointer;
        font-size: 1.1rem; display: flex; align-items: center; justify-content: center;
        transition: background 0.15s;
      }
      .hitos-modal-close:hover { background: rgba(255,255,255,0.35); }
      .hitos-modal-body { padding: 22px; }
      .hitos-modal-field { margin-bottom: 16px; }
      .hitos-modal-field label {
        display: block; font-weight: 600; font-size: 0.82rem;
        color: #475569; text-transform: uppercase;
        letter-spacing: 0.04em; margin-bottom: 5px;
      }
      .hitos-modal-field textarea,
      .hitos-modal-field input[type="text"] {
        width: 100%; padding: 10px 12px;
        border: 2px solid #e2e8f0; border-radius: 6px;
        font-size: 0.88rem; font-family: inherit;
        line-height: 1.5; outline: none;
        transition: border-color 0.15s; resize: vertical;
        color: #1e293b;
        -webkit-user-select: text !important; user-select: text !important;
      }
      .hitos-modal-field textarea { min-height: 80px; }
      .hitos-modal-field textarea:focus,
      .hitos-modal-field input[type="text"]:focus { border-color: #0d7490; }
      .hitos-field-preview {
        min-height: 60px; padding: 10px 12px;
        border: 2px solid #0d7490; border-radius: 6px;
        font-size: 0.88rem; line-height: 1.5; color: #1e293b;
        background: #f0f9ff;
      }
      .hitos-modal-toolbar { display: flex; gap: 6px; margin-bottom: 6px; flex-wrap: wrap; }
      .hitos-toolbar-btn {
        padding: 4px 10px; border: 1px solid #cbd5e1;
        border-radius: 4px; background: #f8fafc;
        font-size: 0.8rem; cursor: pointer; font-weight: 600;
        transition: all 0.1s; color: #334155;
      }
      .hitos-toolbar-btn:hover { background: #0d7490; color: #fff; border-color: #0d7490; }
      .hitos-modal-footer {
        display: flex; justify-content: flex-end; gap: 10px;
        margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0;
      }

      /* ══ Modal columna ══ */
      #hitos-col-modal-overlay {
        display: none; position: fixed; inset: 0;
        background: rgba(5,10,20,0.7); backdrop-filter: blur(4px);
        z-index: 99991; align-items: center; justify-content: center;
      }
      #hitos-col-modal-overlay.activo { display: flex; }
      .hitos-col-modal {
        background: #fff; border-radius: 10px;
        width: 90%; max-width: 440px;
        box-shadow: 0 20px 50px rgba(0,0,0,0.25);
        animation: fadeIn 0.2s ease-out; overflow: hidden;
      }
      .hitos-col-modal-hdr {
        background: linear-gradient(135deg, #1e293b, #0f172a);
        color: #fff; padding: 16px 20px; font-weight: 700; font-size: 0.95rem;
        display: flex; justify-content: space-between; align-items: center;
      }
      .hitos-col-modal-body { padding: 20px; }
      .hitos-col-modal-field { margin-bottom: 14px; }
      .hitos-col-modal-field label {
        display: block; font-size: 0.8rem; font-weight: 600;
        color: #475569; margin-bottom: 4px; text-transform: uppercase;
      }
      .hitos-col-modal-field input[type=text],
      .hitos-col-modal-field input[type=number] {
        width: 100%; padding: 8px 10px;
        border: 2px solid #e2e8f0; border-radius: 6px;
        font-size: 0.88rem; font-family: inherit; outline: none;
        transition: border-color 0.15s;
      }
      .hitos-col-modal-field input:focus { border-color: #0d7490; }
      .hitos-col-modal-check { display: flex; align-items: center; gap: 8px; }
      .hitos-col-modal-check input { width: auto; accent-color: #0d7490; }
      .hitos-col-modal-footer {
        display: flex; gap: 8px; justify-content: flex-end;
        padding: 0 20px 20px;
      }

      /* ══ Highlight búsqueda ══ */
      .hitos-highlight { background: #fef08a; border-radius: 2px; padding: 0 1px; }

      /* ══ Subitem del menú ══ */
      .hitos-menu-subitem {
        padding: 5px 14px 5px 32px !important;
        font-size: 0.8rem !important;
        color: #0891b2 !important;
        border-left: 3px solid #0d7490 !important;
        border-bottom: 2px solid #e2e8f0 !important;
        background: linear-gradient(90deg, rgba(13,116,144,0.09) 0%, rgba(13,116,144,0.03) 100%) !important;
        font-weight: 600 !important;
        cursor: pointer;
        transition: all 0.15s;
        display: flex !important; align-items: center; gap: 6px;
        list-style: none !important;
        margin: 0 !important;
        position: relative;
        letter-spacing: 0.01em;
      }
      .hitos-menu-subitem::before {
        content: '↳';
        color: #0d7490;
        font-size: 0.9rem;
        opacity: 0.7;
        flex-shrink: 0;
      }
      .hitos-menu-subitem:hover {
        background: linear-gradient(90deg, rgba(13,116,144,0.18) 0%, rgba(13,116,144,0.06) 100%) !important;
        color: #155e75 !important;
        padding-left: 36px !important;
      }

      @media (max-width: 640px) {
        .hitos-glosario-body { columns: 1; }
        .hitos-cards-grid { grid-template-columns: 1fr; }
        .hitos-tabla { font-size: 0.78rem; }
        .hitos-modal, .hitos-col-modal { width: 98%; max-height: 95vh; }
      }

      @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
    `;
    document.head.appendChild(st);
  }

  /* ── 6. RENDERIZADO PRINCIPAL ──────────────────────────────────── */
  function renderHitos() {
    const panel = document.getElementById('hitos-panel');
    if (!panel) return;

    const isAdmin = esAdmin();
    const q = estado.busqueda.toLowerCase();
    const fs = estado.configTabla.fontSize || 0.84;

    // Aplicar font-size como CSS variable en la tabla
    panel.style.setProperty('--hitos-fs', fs + 'rem');

    const hitosFiltrados = q
      ? estado.hitosData.filter(h =>
          Object.values(h).some(v => typeof v === 'string' && v.toLowerCase().includes(q))
        )
      : estado.hitosData;

    let html = `
      <button class="hitos-btn-volver" onclick="window.mostrarMenuPrincipalHitos()">← Volver al Menú Principal</button>
      <div style="background:linear-gradient(135deg,#155e75 0%,#0d7490 60%,#0891b2 100%);color:#fff;border-radius:10px;padding:20px 32px;margin:0 0 24px;width:100%;box-sizing:border-box;text-align:center;box-shadow:0 6px 20px rgba(13,116,144,0.2);overflow:hidden;">
        <h1 style="font-size:clamp(1.1rem,3vw,1.55rem);font-weight:900;letter-spacing:0.05em;text-transform:uppercase;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2;">🧒 Hitos del Desarrollo Infantil</h1>
      </div>
    `;

    // Barra admin
    if (isAdmin) {
      html += `
      <div class="hitos-admin-bar">
        <span>🔧 Admin</span>
        <button class="hitos-admin-btn verde" onclick="hitosAgregarFila()">+ Fila</button>
        <button class="hitos-admin-btn azul"  onclick="hitosAgregarColumna()">+ Columna</button>
        <div class="hitos-admin-sep"></div>
        <div class="hitos-admin-fs-wrap">
          <label>Letra</label>
          <input type="range" min="0.7" max="1.1" step="0.02"
                 value="${fs}"
                 oninput="hitosCambiarFontSize(parseFloat(this.value))">
          <span class="hitos-admin-fs-val" id="hitos-fs-val">${fs}rem</span>
        </div>
        <div class="hitos-admin-sep"></div>
        <button class="hitos-admin-btn rojo" style="margin-left:auto" onclick="hitosRestaurarDatos()">↩ Restaurar originales</button>
      </div>`;
    }

    // Controles de vista
    html += `
      <div class="hitos-controles">
        <button class="hitos-btn-vista ${estado.vista==='tabla'?'activo':''}"    onclick="hitosSetVista('tabla')">📊 Tabla</button>
        <button class="hitos-btn-vista ${estado.vista==='tarjetas'?'activo':''}" onclick="hitosSetVista('tarjetas')">🃏 Tarjetas por edad</button>
        <button class="hitos-btn-vista ${estado.vista==='dominio'?'activo':''}"  onclick="hitosSetVista('dominio')">🏷 Por dominio</button>
        <span class="hitos-lbl-buscar" style="margin-left:auto">🔍 Buscar:</span>
        <input class="hitos-buscar" id="hitos-buscar-input" type="text"
               placeholder="Ej: pinza, palabras, camina…"
               value="${estado.busqueda}"
               oninput="hitosSetBusqueda(this.value)">
      </div>
    `;

    if (estado.vista === 'tabla') {
      html += renderTabla(hitosFiltrados, isAdmin, q);
    } else if (estado.vista === 'tarjetas') {
      html += renderTarjetas(hitosFiltrados, isAdmin, q);
    } else {
      html += renderPorDominio(hitosFiltrados, isAdmin, q);
    }

    html += renderGlosario();

    // Pie de fuentes (estático)
    html += `<div class="hitos-fuentes-pie">
      📚 Fuentes: Nelson Pediatría 21ª ed. · Fejerman &amp; Fernández Álvarez · Guías SAP/PRONAP · DSM-5 · Denver II (DDST)<br>
      Referencia clínica estructurada por dominio y edad. Basada en bibliografía pediátrica de uso en Argentina.
    </div>`;

    html += `<div style="margin-top:20px;">
      <button class="hitos-btn-volver" onclick="window.mostrarMenuPrincipalHitos()">← Volver al Menú Principal</button>
    </div>`;

    panel.innerHTML = html;

    if (estado.busqueda) {
      const inp = document.getElementById('hitos-buscar-input');
      if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
    }

    // Scroll phantom (solo en vista tabla)
    if (estado.vista === 'tabla') initScrollPhantom();
  }

  /* ── Scroll phantom: barra de desplazamiento fija al viewport ─── */
  function initScrollPhantom() {
    // Limpiar anterior
    const old = document.getElementById('hitos-scroll-phantom');
    if (old) old.remove();

    const wrap = document.querySelector('.hitos-tabla-wrap');
    if (!wrap) return;

    const phantom = document.createElement('div');
    phantom.id = 'hitos-scroll-phantom';
    phantom.className = 'hitos-scroll-phantom';
    const inner = document.createElement('div');
    inner.className = 'hitos-scroll-phantom-inner';
    phantom.appendChild(inner);
    document.body.appendChild(phantom);

    // Sincronizar anchos
    function syncWidth() {
      inner.style.width = wrap.scrollWidth + 'px';
    }
    syncWidth();

    let syncing = false;
    phantom.addEventListener('scroll', () => {
      if (syncing) return; syncing = true;
      wrap.scrollLeft = phantom.scrollLeft;
      syncing = false;
    });
    wrap.addEventListener('scroll', () => {
      if (syncing) return; syncing = true;
      phantom.scrollLeft = wrap.scrollLeft;
      syncing = false;
    });

    // Actualizar ancho si cambia el contenido
    const ro = new ResizeObserver(syncWidth);
    ro.observe(wrap);

    // Limpiar phantom cuando se abandone la vista
    phantom._cleanup = () => { ro.disconnect(); phantom.remove(); };
  }

  function limpiarScrollPhantom() {
    const ph = document.getElementById('hitos-scroll-phantom');
    if (ph && ph._cleanup) ph._cleanup();
    else if (ph) ph.remove();
  }

  /* ── Resaltar texto de búsqueda ──────────────────────────────── */
  function hl(texto, q) {
    if (!q || !texto) return texto;
    const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return texto.replace(new RegExp(`(${esc})`, 'gi'), '<span class="hitos-highlight">$1</span>');
  }

  /* ── Toolbar de formato (para textareas en admin) ─────────────── */
  function renderToolbar(targetId) {
    return `<div class="hitos-modal-toolbar">
      <button class="hitos-toolbar-btn" onclick="hitosFormatear('${targetId}','strong')" title="Negrita"><b>N</b></button>
      <button class="hitos-toolbar-btn" onclick="hitosFormatear('${targetId}','em')" title="Cursiva"><i>K</i></button>
      <button class="hitos-toolbar-btn" onclick="hitosFormatear('${targetId}','u')" title="Subrayado"><u>S</u></button>
      <button class="hitos-toolbar-btn" onclick="hitosFormatear('${targetId}','br')" title="Salto de línea">↵ br</button>
    </div>`;
  }

  /* ── RENDER TABLA ─────────────────────────────────────────────── */
  function renderTabla(hitos, isAdmin, q) {
    const cfg = estado.configTabla;

    // Encabezados con columnas en su orden actual
    let thsCols = '';
    estado.columnas.forEach((col, ci) => {
      const ckey = col.key.replace(/[^a-z]/gi,'').toLowerCase();
      const w = cfg.colWidths[col.key] ? `width:${cfg.colWidths[col.key]}px;min-width:${cfg.colWidths[col.key]}px;` : '';
      const wrapClass = cfg.headerWrap[col.key] ? 'wrap-header' : '';
      const adminBtns = isAdmin ? `
        <div class="hitos-th-admin-btns">
          ${ci > 0 ? `<button class="hitos-th-admin-btn" onclick="hitosColumnaIzq(${ci})" title="Mover izquierda">◀</button>` : ''}
          ${ci < estado.columnas.length-1 ? `<button class="hitos-th-admin-btn" onclick="hitosColumnaDer(${ci})" title="Mover derecha">▶</button>` : ''}
          <button class="hitos-th-admin-btn ${cfg.headerWrap[col.key]?'wrap-on':''}"
                  onclick="hitosToggleWrapHeader('${col.key}')"
                  title="Permitir 2 renglones">↩</button>
          <button class="hitos-th-admin-btn" onclick="hitosEditarColumna(${ci})" title="Editar columna">✏️</button>
        </div>` : '';
      thsCols += `<th class="col-${ckey} ${wrapClass}" style="${w}position:relative;"
          data-col="${col.key}">
        <div class="hitos-th-inner">
          <span class="hitos-th-label">${col.emoji} ${col.label}</span>
          ${isAdmin ? `<div class="hitos-th-resize" data-resize="${col.key}"
                title="Arrastrar para redimensionar"></div>` : ''}
        </div>
        ${adminBtns}
      </th>`;
    });

    const thAlarma = `<th class="col-alertas" style="position:relative;">
      <div class="hitos-th-inner"><span class="hitos-th-label">⚠️ Señales de Alarma</span></div>
    </th>`;
    const thAdmin = isAdmin ? `<th class="col-admin">Admin</th>` : '';

    let html = `<div class="hitos-tabla-outer"><div class="hitos-tabla-wrap"><table class="hitos-tabla">
      <thead><tr>
        <th style="position:sticky;left:0;z-index:3;">Edad</th>
        ${thsCols}${thAlarma}${thAdmin}
      </tr></thead><tbody>`;

    hitos.forEach((h, idx) => {
      const par = idx % 2 === 0 ? '' : 'hitos-tr-par';
      let tdsCol = '';
      estado.columnas.forEach(col => {
        tdsCol += `<td>${hl(h[col.key] || '—', q)}</td>`;
      });
      html += `<tr class="${par}">
        <td class="hitos-td-edad"><span class="hitos-edad-valor">${hl(h.edad, q)}</span><span class="hitos-edad-label">${hl(h.label, q)}</span></td>
        ${tdsCol}
        <td><div class="hitos-alarma">${hl(h.alertas || '', q)}</div></td>
        ${isAdmin ? `<td style="text-align:center;white-space:nowrap;">
          <button class="hitos-admin-btn azul" style="padding:3px 7px;font-size:0.73rem;margin:1px;"
                  onclick="hitosEditarFila('${h.id}')">✏️</button>
          ${idx > 0 ? `<button class="hitos-admin-btn gris" style="padding:3px 7px;font-size:0.73rem;margin:1px;"
                  onclick="hitosMoverFila('${h.id}',-1)">↑</button>` : ''}
          ${idx < hitos.length-1 ? `<button class="hitos-admin-btn gris" style="padding:3px 7px;font-size:0.73rem;margin:1px;"
                  onclick="hitosMoverFila('${h.id}',1)">↓</button>` : ''}
          <button class="hitos-admin-btn rojo" style="padding:3px 7px;font-size:0.73rem;margin:1px;"
                  onclick="hitosEliminarFila('${h.id}')">🗑</button>
        </td>` : ''}
      </tr>`;
    });

    html += '</tbody></table></div></div>';
    return html;
  }

  /* ── RENDER TARJETAS ──────────────────────────────────────────── */
  function renderTarjetas(hitos, isAdmin, q) {
    let html = '<div class="hitos-cards-grid">';
    hitos.forEach(h => {
      html += `<div class="hitos-card">
        <div class="hitos-card-header">
          <div>
            <div class="hitos-card-edad">${hl(h.edad, q)}</div>
            <div class="hitos-card-sublabel">${hl(h.label, q)}</div>
          </div>
          ${isAdmin ? `<button class="hitos-admin-btn azul" style="padding:5px 10px;font-size:0.78rem;"
                               onclick="hitosEditarFila('${h.id}')">✏️ Editar</button>` : ''}
        </div>
        <div class="hitos-card-body">`;

      estado.columnas.forEach(col => {
        const val = h[col.key];
        if (!val || val === '—') return;
        html += `<div class="hitos-card-dominio">
          <div class="hitos-card-dominio-titulo">${col.emoji} ${col.label}</div>
          <div class="hitos-card-dominio-texto">${hl(val, q)}</div>
        </div>`;
      });

      if (h.alertas) {
        html += `<div class="hitos-card-alarma">
          <div class="hitos-card-alarma-titulo">⚠️ Señales de Alarma</div>
          <div>${hl(h.alertas, q)}</div>
        </div>`;
      }
      html += `</div></div>`;
    });
    html += '</div>';
    return html;
  }

  /* ── RENDER POR DOMINIO ───────────────────────────────────────── */
  function renderPorDominio(hitos, isAdmin, q) {
    let html = '';
    if (isAdmin) {
      html += `<div style="margin-bottom:12px;">
        <button class="hitos-admin-btn verde" onclick="hitosAgregarFila()" style="font-size:0.85rem;padding:8px 16px;">
          + Agregar nueva fila / etapa
        </button>
        <span style="font-size:0.78rem;color:#64748b;margin-left:10px;">Las filas nuevas aparecen en todas las vistas</span>
      </div>`;
    }
    const dominios = [
      ...estado.columnas,
      { key: 'alertas', label: 'Señales de Alarma', color: '#92400e', emoji: '⚠️' }
    ];

    dominios.forEach(col => {
      html += `<div class="hitos-dominio-section">
        <div class="hitos-dominio-header"
             style="background: linear-gradient(135deg, ${col.color}, ${col.color}cc);">
          <span>${col.emoji} ${col.label}</span>
        </div>
        <ul class="hitos-dominio-lista">`;

      hitos.forEach(h => {
        const val = h[col.key];
        if (!val || val === '—') return;
        html += `<li class="hitos-dominio-item">
          <div class="hitos-dominio-edad-col">
            <strong>${hl(h.edad, q)}</strong>
            <small style="font-size:0.68rem;color:#64748b;font-weight:400;">${hl(h.label, q)}</small>
          </div>
          <div class="hitos-dominio-texto-col">${hl(val, q)}</div>
          ${isAdmin ? `<div class="hitos-dominio-edit-col">
            <button class="hitos-admin-btn azul" style="padding:3px 8px;font-size:0.73rem;white-space:nowrap;"
                    onclick="hitosEditarFila('${h.id}')">✏️</button>
          </div>` : ''}
        </li>`;
      });

      html += '</ul></div>';
    });
    return html;
  }

  /* ── RENDER GLOSARIO ──────────────────────────────────────────── */
  function renderGlosario() {
    let html = `<div class="hitos-glosario-section">
      <div class="hitos-glosario-header" onclick="hitosToggleGlosario()">
        <span>📖 Glosario de Siglas y Abreviaturas</span>
        <span id="hitos-glosario-chevron">▼</span>
      </div>
      <div class="hitos-glosario-body" id="hitos-glosario-body">`;
    GLOSARIO.forEach(g => {
      html += `<div class="hitos-glosario-item">
        <span class="hitos-sigla">${g.sigla}:</span>
        <span class="hitos-sigla-def">${g.def}</span>
      </div>`;
    });
    html += '</div></div>';
    return html;
  }

  /* ══════════════════════════════════════════════════════════════════
     7. FUNCIONES EXPUESTAS GLOBALMENTE
  ══════════════════════════════════════════════════════════════════ */

  window.mostrarHitosDesarrollo = async function () {
    inyectarEstilos();
    document.querySelectorAll('.menu-principal, .pagina-cuestionario').forEach(el => {
      el.classList.remove('activa');
      if (el.id === 'menu-principal') el.classList.add('oculto');
      else el.style.display = 'none';
    });
    ['buscador-panel','vacunas-panel','cronologia-panel'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    let panel = document.getElementById('hitos-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'hitos-panel';
      document.body.appendChild(panel);
    }
    panel.classList.add('activo');
    panel.innerHTML = '<div style="padding:40px;text-align:center;color:#64748b;">⏳ Cargando datos…</div>';
    await hitosCargarDatos();
    renderHitos();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.mostrarMenuPrincipalHitos = function () {
    limpiarScrollPhantom();
    const panel = document.getElementById('hitos-panel');
    if (panel) panel.classList.remove('activo');
    if (typeof window.volverAlMenu === 'function') {
      window.volverAlMenu();
    } else {
      const menu = document.getElementById('menu-principal');
      if (menu) { menu.classList.remove('oculto'); menu.style.display = ''; }
    }
  };

  window.hitosSetVista = function (v) {
    if (v !== 'tabla') limpiarScrollPhantom();
    estado.vista = v;
    renderHitos();
  };

  window.hitosSetBusqueda = function (v) {
    estado.busqueda = v;
    renderHitos();
  };

  window.hitosToggleGlosario = function () {
    const body = document.getElementById('hitos-glosario-body');
    const chevron = document.getElementById('hitos-glosario-chevron');
    if (!body) return;
    body.classList.toggle('abierto');
    if (chevron) chevron.textContent = body.classList.contains('abierto') ? '▲' : '▼';
  };

  /* ── Formateo de texto ──────────────────────────────────────── */
  window.hitosFormatear = function (id, tipo) {
    const ta = document.getElementById(id);
    if (!ta) return;
    const start = ta.selectionStart, end = ta.selectionEnd;
    const sel = ta.value.substring(start, end);
    const mapas = {
      strong: `<strong>${sel}</strong>`,
      em:     `<em>${sel}</em>`,
      u:      `<u>${sel}</u>`,
      br:     `${sel}<br>`,
    };
    const reemplazo = mapas[tipo] || sel;
    ta.value = ta.value.substring(0, start) + reemplazo + ta.value.substring(end);
    ta.focus();
    const nuevoCursor = start + reemplazo.length;
    ta.setSelectionRange(nuevoCursor, nuevoCursor);
  };

  /* ── Toggle vista previa en campos de edición ──────────────── */
  window.hitosTogglePreview = function (id) {
    const ta = document.getElementById(id);
    const preview = document.getElementById(id + '-preview');
    if (!ta || !preview) return;
    const showing = preview.style.display !== 'none';
    if (showing) {
      preview.style.display = 'none';
      ta.style.display = '';
    } else {
      preview.innerHTML = ta.value || '<em style="color:#94a3b8;">Sin contenido</em>';
      preview.style.display = '';
      ta.style.display = 'none';
    }
  };

  /* ── Tamaño de letra admin ──────────────────────────────────── */
  window.hitosCambiarFontSize = function (val) {
    estado.configTabla.fontSize = val;
    const panel = document.getElementById('hitos-panel');
    if (panel) panel.style.setProperty('--hitos-fs', val + 'rem');
    const lbl = document.getElementById('hitos-fs-val');
    if (lbl) lbl.textContent = val + 'rem';
    hitosGuardarDatos();
  };

  /* ── Mover columnas ─────────────────────────────────────────── */
  window.hitosColumnaIzq = function (ci) {
    if (ci <= 0) return;
    [estado.columnas[ci-1], estado.columnas[ci]] = [estado.columnas[ci], estado.columnas[ci-1]];
    hitosGuardarDatos();
    renderHitos();
  };
  window.hitosColumnaDer = function (ci) {
    if (ci >= estado.columnas.length-1) return;
    [estado.columnas[ci], estado.columnas[ci+1]] = [estado.columnas[ci+1], estado.columnas[ci]];
    hitosGuardarDatos();
    renderHitos();
  };

  /* ── Toggle wrap en encabezado de columna ───────────────────── */
  window.hitosToggleWrapHeader = function (key) {
    estado.configTabla.headerWrap[key] = !estado.configTabla.headerWrap[key];
    hitosGuardarDatos();
    renderHitos();
  };

  /* ── Mover filas ────────────────────────────────────────────── */
  window.hitosMoverFila = function (id, dir) {
    const idx = estado.hitosData.findIndex(x => x.id === id);
    if (idx < 0) return;
    const dest = idx + dir;
    if (dest < 0 || dest >= estado.hitosData.length) return;
    [estado.hitosData[idx], estado.hitosData[dest]] = [estado.hitosData[dest], estado.hitosData[idx]];
    hitosGuardarDatos();
    renderHitos();
  };

  /* ── Resize de columnas (drag) ──────────────────────────────── */
  let _resizeDrag = null;
  document.addEventListener('mousedown', function (e) {
    const handle = e.target.closest('[data-resize]');
    if (!handle) return;
    e.preventDefault();
    const key = handle.dataset.resize;
    const th = handle.closest('th');
    const startX = e.clientX;
    const startW = th.offsetWidth;
    _resizeDrag = { key, startX, startW };
    handle.classList.add('dragging');
  });
  document.addEventListener('mousemove', function (e) {
    if (!_resizeDrag) return;
    const delta = e.clientX - _resizeDrag.startX;
    const newW = Math.max(60, _resizeDrag.startW + delta);
    estado.configTabla.colWidths[_resizeDrag.key] = newW;
    // Actualizar en vivo sin re-render completo
    const th = document.querySelector(`th[data-col="${_resizeDrag.key}"]`);
    if (th) { th.style.width = newW + 'px'; th.style.minWidth = newW + 'px'; }
  });
  document.addEventListener('mouseup', function () {
    if (!_resizeDrag) return;
    hitosGuardarDatos();
    _resizeDrag = null;
    document.querySelectorAll('.hitos-th-resize.dragging').forEach(el => el.classList.remove('dragging'));
  });

  /* ── Editar columna (modal) ─────────────────────────────────── */
  window.hitosEditarColumna = function (ci) {
    const col = estado.columnas[ci];
    if (!col) return;
    let mo = document.getElementById('hitos-col-modal-overlay');
    if (mo) mo.remove();
    const wrapChecked = estado.configTabla.headerWrap[col.key] ? 'checked' : '';
    document.body.insertAdjacentHTML('beforeend', `
      <div id="hitos-col-modal-overlay" class="activo">
        <div class="hitos-col-modal">
          <div class="hitos-col-modal-hdr">
            <span>⚙️ Editar columna — ${col.label}</span>
            <button class="hitos-modal-close" onclick="hitosColModalCerrar()">✕</button>
          </div>
          <div class="hitos-col-modal-body">
            <div class="hitos-col-modal-field">
              <label>Emoji</label>
              <input type="text" id="hcol-emoji" value="${col.emoji}" maxlength="4">
            </div>
            <div class="hitos-col-modal-field">
              <label>Título de columna</label>
              <input type="text" id="hcol-label" value="${col.label}">
            </div>
            <div class="hitos-col-modal-field">
              <label>Ancho (px, 0 = automático)</label>
              <input type="number" id="hcol-width" min="0" max="600"
                     value="${estado.configTabla.colWidths[col.key] || 0}">
            </div>
            <div class="hitos-col-modal-field">
              <div class="hitos-col-modal-check">
                <input type="checkbox" id="hcol-wrap" ${wrapChecked}>
                <label for="hcol-wrap" style="text-transform:none;font-weight:500;">
                  Permitir 2 renglones en el título
                </label>
              </div>
            </div>
          </div>
          <div class="hitos-col-modal-footer">
            <button class="hitos-admin-btn rojo" onclick="hitosEliminarColumna(${ci})">🗑 Eliminar</button>
            <button class="hitos-admin-btn gris" onclick="hitosColModalCerrar()">Cancelar</button>
            <button class="hitos-admin-btn verde" onclick="hitosGuardarColumna(${ci})">💾 Guardar</button>
          </div>
        </div>
      </div>`);
  };

  window.hitosGuardarColumna = function (ci) {
    const col = estado.columnas[ci];
    if (!col) return;
    col.emoji = document.getElementById('hcol-emoji').value.trim() || col.emoji;
    col.label = document.getElementById('hcol-label').value.trim() || col.label;
    const w = parseInt(document.getElementById('hcol-width').value) || 0;
    if (w > 0) estado.configTabla.colWidths[col.key] = w;
    else delete estado.configTabla.colWidths[col.key];
    estado.configTabla.headerWrap[col.key] = document.getElementById('hcol-wrap').checked;
    hitosColModalCerrar();
    hitosGuardarDatos();
    renderHitos();
  };

  window.hitosColModalCerrar = function () {
    const mo = document.getElementById('hitos-col-modal-overlay');
    if (mo) mo.remove();
  };

  /* ── Agregar columna nueva ──────────────────────────────────── */
  window.hitosAgregarColumna = function () {
    const key = 'col_' + Date.now();
    estado.columnas.push({ key, label: 'Nueva columna', color: '#64748b', emoji: '📋' });
    // Agregar campo vacío en todos los hitos existentes
    estado.hitosData.forEach(h => { h[key] = ''; });
    hitosGuardarDatos();
    renderHitos();
    // Abrir editor para la nueva columna
    hitosEditarColumna(estado.columnas.length - 1);
  };

  window.hitosEliminarColumna = function (ci) {
    const col = estado.columnas[ci];
    if (!col) return;
    if (!confirm(`¿Eliminar la columna "${col.label}"? Se perderá el contenido de esa columna en todas las filas.`)) return;
    estado.columnas.splice(ci, 1);
    delete estado.configTabla.colWidths[col.key];
    delete estado.configTabla.headerWrap[col.key];
    estado.hitosData.forEach(h => { delete h[col.key]; });
    hitosColModalCerrar();
    hitosGuardarDatos();
    renderHitos();
  };

  /* ── Editar fila ─────────────────────────────────────────────── */
  window.hitosEditarFila = function (id) {
    const h = estado.hitosData.find(x => x.id === id);
    if (!h) return;

    let modalHTML = `
      <div id="hitos-modal-overlay" class="activo">
        <div class="hitos-modal">
          <div class="hitos-modal-header">
            <h3>✏️ Editar — ${h.label}</h3>
            <button class="hitos-modal-close" onclick="hitosModalCerrar()">✕</button>
          </div>
          <div class="hitos-modal-body">
            <div class="hitos-modal-field">
              <label>Edad (etiqueta corta)</label>
              <span style="font-size:0.72rem;color:#94a3b8;display:block;margin-bottom:4px;">Usá &lt;br&gt; para separar en 2 líneas (ej: <code>12m&lt;br&gt;1 año</code>)</span>
              <textarea id="hedit-edad" style="min-height:48px;resize:none;">${h.edad || ''}</textarea>
            </div>
            <div class="hitos-modal-field">
              <label>Descripción de edad</label>
              <input type="text" id="hedit-label" value="${h.label || ''}">
            </div>`;

    estado.columnas.forEach(col => {
      const taId = `hedit-${col.key}`;
      modalHTML += `
        <div class="hitos-modal-field">
          <label>${col.emoji} ${col.label}</label>
          ${renderToolbar(taId)}
          <div style="display:flex;gap:6px;margin-bottom:4px;">
            <button class="hitos-toolbar-btn" onclick="hitosTogglePreview('${taId}')" title="Alternar vista previa / código">👁 Vista previa</button>
            <span style="font-size:0.72rem;color:#94a3b8;align-self:center;">Podés usar &lt;strong&gt;, &lt;em&gt;, &lt;br&gt; para formato</span>
          </div>
          <textarea id="${taId}">${h[col.key] || ''}</textarea>
          <div id="${taId}-preview" class="hitos-field-preview" style="display:none;"></div>
        </div>`;
    });

    modalHTML += `
        <div class="hitos-modal-field">
          <label>⚠️ Señales de Alarma</label>
          ${renderToolbar('hedit-alertas')}
          <div style="display:flex;gap:6px;margin-bottom:4px;">
            <button class="hitos-toolbar-btn" onclick="hitosTogglePreview('hedit-alertas')" title="Alternar vista previa / código">👁 Vista previa</button>
            <span style="font-size:0.72rem;color:#94a3b8;align-self:center;">Podés usar &lt;strong&gt;, &lt;em&gt;, &lt;br&gt; para formato</span>
          </div>
          <textarea id="hedit-alertas">${h.alertas || ''}</textarea>
          <div id="hedit-alertas-preview" class="hitos-field-preview" style="display:none;"></div>
        </div>
        <div class="hitos-modal-footer">
          <button class="hitos-admin-btn gris" onclick="hitosModalCerrar()">Cancelar</button>
          <button class="hitos-admin-btn verde" onclick="hitosGuardarEdicion('${id}')">💾 Guardar cambios</button>
        </div>
      </div>
    </div>
  </div>`;

    const old = document.getElementById('hitos-modal-overlay');
    if (old) old.remove();
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  };

  window.hitosGuardarEdicion = async function (id) {
    const h = estado.hitosData.find(x => x.id === id);
    if (!h) return;
    h.edad  = document.getElementById('hedit-edad').value;
    h.label = document.getElementById('hedit-label').value;
    estado.columnas.forEach(col => {
      h[col.key] = document.getElementById(`hedit-${col.key}`)?.value || '';
    });
    h.alertas = document.getElementById('hedit-alertas').value;
    hitosModalCerrar();
    await hitosGuardarDatos();
    renderHitos();
    hitosToast('✅ Guardado en Firestore');
  };

  window.hitosModalCerrar = function () {
    const ov = document.getElementById('hitos-modal-overlay');
    if (ov) ov.remove();
  };

  /* ── Agregar fila nueva ─────────────────────────────────────── */
  window.hitosAgregarFila = function () {
    const nuevaId = 'hitos_' + Date.now();
    const nueva = { id: nuevaId, edad: 'Nueva', label: 'Nueva etapa', alertas: '' };
    estado.columnas.forEach(col => { nueva[col.key] = ''; });
    estado.hitosData.push(nueva);
    renderHitos();
    hitosEditarFila(nuevaId);
  };

  /* ── Eliminar fila ───────────────────────────────────────────── */
  window.hitosEliminarFila = function (id) {
    const h = estado.hitosData.find(x => x.id === id);
    if (!h) return;
    if (!confirm(`¿Eliminar la fila "${h.edad} — ${h.label}"? Esta acción no se puede deshacer.`)) return;
    estado.hitosData = estado.hitosData.filter(x => x.id !== id);
    hitosGuardarDatos();
    renderHitos();
  };

  /* ── Restaurar datos originales ─────────────────────────────── */
  window.hitosRestaurarDatos = async function () {
    if (!confirm('¿Restaurar todos los hitos a los datos originales? Se perderán todos los cambios.')) return;
    estado.hitosData = JSON.parse(JSON.stringify(HITOS_DEFAULT));
    estado.columnas  = JSON.parse(JSON.stringify(COLUMNAS_DEFAULT));
    estado.configTabla = { fontSize: 0.84, colWidths: {}, headerWrap: {} };
    _hitosCache = null;
    try { localStorage.removeItem(CACHE_KEY); } catch (_) {}
    await hitosGuardarDatos();
    renderHitos();
    hitosToast('✅ Datos restaurados a la versión original');
  };

  /* ── 8. BOTÓN EN EL MENÚ PRINCIPAL ─────────────────────────── */
  function agregarBtnAlMenu() {
    const lis = document.querySelectorAll('.columna ul li');
    let pediatriaLi = null;
    lis.forEach(li => {
      if (li.textContent.trim() === 'Pediatría') pediatriaLi = li;
    });
    if (!pediatriaLi) return;
    if (document.getElementById('hitos-menu-btn')) return;

    // Separador después del subítem (antes de Cardiología)
    const sep = document.createElement('li');
    sep.id = 'hitos-menu-sep';
    sep.style.cssText = 'height:6px;background:transparent;border:none;padding:0;margin:0;pointer-events:none;list-style:none;';
    pediatriaLi.insertAdjacentElement('afterend', sep);

    // Subítem con estilo inline para resistir cache
    const btn = document.createElement('li');
    btn.id = 'hitos-menu-btn';
    btn.className = 'hitos-menu-subitem';
    btn.setAttribute('onclick', 'mostrarHitosDesarrollo()');
    btn.style.cssText = 'padding:4px 12px 4px 14px!important;font-size:0.78rem!important;color:#0891b2!important;border-left:3px solid #0d7490!important;border-bottom:2px solid #cbd5e1!important;background:linear-gradient(90deg,rgba(13,116,144,0.1) 0%,rgba(13,116,144,0.03) 100%)!important;font-weight:600!important;cursor:pointer;display:flex!important;align-items:center;gap:5px;list-style:none!important;margin:0 0 0 20px!important;width:calc(100% - 20px)!important;box-sizing:border-box!important;border-radius:0 0 4px 0!important;';
    btn.innerHTML = '<span style="color:#0d7490;opacity:0.6;font-size:0.85rem;flex-shrink:0;">↳</span> 🧒 Hitos del Desarrollo';
    pediatriaLi.insertAdjacentElement('afterend', btn);
  }

  /* ── 9. INICIALIZACIÓN ─────────────────────────────────────── */
  function init() {
    inyectarEstilos();
    agregarBtnAlMenu();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('fb:usuarioAprobadoActivo', function () {
    setTimeout(agregarBtnAlMenu, 300);
  });

})();
