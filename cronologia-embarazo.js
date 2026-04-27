/* ══════════════════════════════════════════════════════════════════
   cronologia-embarazo.js  V2
   Módulo independiente — depende de script.js (Firebase ya inicializado)
   Incluye DOS vistas intercambiables con pestañas superiores:
     · Vista 1 — Cronología por trimestres (acordeón vertical)
     · Vista 2 — Línea de Tiempo Horizontal interactiva
   Ambas vistas comparten:
     · Mismos datos clínicos
     · Mismo sistema de admin (Firebase/Firestore)
     · Misma paleta de colores
   Novedades v3.0:
     · Integración de línea temporal como segunda vista (pestaña)
     · Slider de semana gestacional mejorado: suave, sin scroll lateral,
       con color dinámico según trimestre activo
     · Panel de administración unificado para ambas vistas
   ══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const FS_COLLECTION = 'meta';
  const FS_DOC_ID     = 'cronologiaEmbarazo';

  /* ═══════════════════════════════════════════════════════
     DATOS COMPLETOS POR DEFECTO
  ═══════════════════════════════════════════════════════ */
  /* ═══════════════════════════════════════════════════════
     DATOS LÍNEA TEMPORAL (ahora parte de DATOS_DEFAULT → Firestore)
  ═══════════════════════════════════════════════════════ */
  const EVENTOS_SEMANA_DEFAULT = {
    0:  {label:'Captación temprana',trim:'t1',icon:'⚕️',tipo:'consulta',desc:'Captación antes de sem. 10. Inicio del control prenatal, historia clínica perinatal y suplementación con ácido fólico.',estudios:['Historia clínica perinatal (HCP)','Cálculo de FPP (Naegele)','Peso, talla e IMC','Presión arterial basal','Ácido fólico 0,4 mg/día']},
    6:  {label:'Ecografía temprana',trim:'t1',icon:'🔊',tipo:'ecografia',desc:'La ecografía transvaginal temprana confirma vitalidad embrionaria y localización intrauterina.',estudios:['Ecografía transvaginal (6–10 sem)','Confirma latido y saco gestacional','Descarta embarazo ectópico']},
    7:  {label:'Lab. inicial obligatorio',trim:'t1',icon:'🧪',tipo:'laboratorio',desc:'Período de organogénesis activa. Máxima vulnerabilidad a teratógenos. Laboratorio inicial completo.',estudios:['Hemograma + Grupo/Rh','PAI (Coombs indirecto)','VDRL / RPR (sífilis)','VIH (ELISA)','Toxoplasmosis IgG+IgM','HBsAg (Hepatitis B)','Chagas (2 técnicas)','Rubéola IgG','Glucemia en ayunas','TSH','Urocultivo','Papanicolaou (si no actualizado)']},
    11: {label:'Cribado 1.° trimestre',trim:'t1',icon:'🔬',tipo:'ecografia',desc:'Ventana del cribado combinado. Mayor sensibilidad para síndrome de Down (T21) y otras aneuploidías. Calcular riesgo de preeclampsia.',estudios:['Translucencia nucal (TN)','Hueso nasal (HN)','Ductus venoso + tricúspide','PAPP-A y β-hCG libre','Doppler arterias uterinas','cfDNA / NIFTY (opcional)','Biopsia corial (si indicado)','Aspirina 100 mg si riesgo PE']},
    14: {label:'Control 2.° T.',trim:'t2',icon:'📋',tipo:'consulta',desc:'Controles obstétricos mensuales: AU (cm ≈ semanas ± 3), FCF (110–160 lpm), PA. Movimientos fetales percibidos desde sem. 16–20.',estudios:['Altura uterina (AU)','Auscultación FCF (Doppler)','PAI — Rh negativa','Amniocentesis (si indicada)']},
    18: {label:'Ecografía morfológica',trim:'t2',icon:'🔊',tipo:'ecografia',desc:'Estudio más importante del embarazo. Evalúa todos los sistemas fetales. Ventana: sem. 18–22. Sensibilidad cardíaca: 50–80%.',estudios:['Biometría fetal completa','Anatomía craneal (3 planos)','Cara y cuello','Cardíaco — screening (4 cámaras + tractos)','Tórax, abdomen, pelvis','Extremidades y columna','Placenta, ILA y cordón','Longitud cervical transvaginal']},
    24: {label:'Viabilidad · DMG · Rh',trim:'t2',icon:'🧪',tipo:'laboratorio',desc:'Hito crítico de viabilidad (24–25 sem). Cribado universal de diabetes gestacional con PTOG 75 g. Inmunoprofilaxis Rh si negativa.',estudios:['PTOG 75 g (diabetes gestacional)','Hemograma (control)','VDRL, VIH, Toxoplasmosis (repetición)','Coombs indirecto + Anti-D 300 μg (Rh–)','Urocultivo','HBsAg (si negativa)']},
    28: {label:'Eco crecimiento + Doppler',trim:'t3',icon:'🔊',tipo:'ecografia',desc:'Cerebro duplica su peso (28–40 sem). Consultas cada 2–3 semanas. NST a partir de sem. 28 en riesgo.',estudios:['Eco crecimiento fetal','Doppler arteria umbilical','Doppler ACM (brain sparing)','NST (si riesgo)','Corticoides antenatales (si APP)']},
    32: {label:'Eco 32 sem + GBS prep.',trim:'t3',icon:'🔊',tipo:'ecografia',desc:'Pulmones maduros a las 34–36 sem. Detectar RCF tardía. Cultivo GBS sem. 35–37 para profilaxis intraparto.',estudios:['Eco crecimiento + Doppler (32–36)','Cultivo recto-vaginal GBS (35–37)','Hemograma + VDRL (final)','VIH + HBsAg (final)','Coombs indirecto (Rh–)','Maniobras de Leopold']},
    36: {label:'Consultas semanales',trim:'t3',icon:'📋',tipo:'consulta',desc:'Embarazo de término desde sem. 37. Consultas semanales. Plan de parto. Score de Bishop. Preanestésica.',estudios:['NST semanal/bisemanal','Perfil biofísico (BPP)','Score de Bishop (tacto vaginal)','Consulta preanestésica','Prequirúrgico (si cesárea)','Signos de parto: contracciones, RPM, show']},
    41: {label:'Inducción 41 sem.',trim:'t3',icon:'🏥',tipo:'parto',desc:'Recomendación FASGO/ACOG 2019: inducción a las 41 sem reduce mortalidad perinatal sin aumentar cesáreas.',estudios:['NST diario + ILA','Doppler ductus venoso','Inducción: misoprostol / balón / oxitocina','Indicación absoluta ≥ 42 semanas']},
    42: {label:'Parto/Finalización',trim:'t3',icon:'👶',tipo:'parto',desc:'Indicación absoluta de finalización. Mortalidad perinatal duplicada vs sem. 40.',estudios:[]},
    43: {label:'Control 7 días postparto',trim:'t4',icon:'⚕️',tipo:'consulta',desc:'Control de puerperio inmediato. Involución uterina, lactancia, signos de infección y depresión postparto.',estudios:['PA + involución uterina','Pesquisa depresión (Edinburgh)','Lactancia materna','Anti-D postparto (Rh– si RN Rh+)','Hemograma postparto (si hemorragia)']},
    44: {label:'Alta puerperal 42 días',trim:'t4',icon:'✅',tipo:'consulta',desc:'Cierre del embarazo. Retorno a la normalidad fisiológica materna. Planificación familiar y vacunación.',estudios:['Control 42 días (cierre)','PAP y colposcopía (si indicado)','Anticoncepción postparto','Vacunación: rubéola, varicela','Edinburgh 2.° aplicación','Pesquisa neonatal']},
  };

  const FETO_INFO_DEFAULT = {
    4:{peso:'< 1 g',desc:'Blastocisto implantado. Comienzo de β-hCG.'},
    6:{peso:'< 1 g',desc:'Latido cardíaco detectable por eco TV. Saco gestacional visible.'},
    8:{peso:'1–2 g',desc:'LCC ≈ 16 mm. FC: 170 lpm. Forma humana reconocible. Máxima vulnerabilidad teratogénica.'},
    10:{peso:'5 g',desc:'Todos los órganos formados. Comienzan movimientos espontáneos.'},
    12:{peso:'14 g',desc:'LCC: 50–60 mm. Reflejo de succión. Dedos diferenciados.'},
    14:{peso:'43 g',desc:'Movimientos vigorosos. Sexo determinable. Placenta funcional.'},
    16:{peso:'100 g',desc:'Primeros movimientos percibidos (multíparas). Piel translúcida.'},
    18:{peso:'200 g',desc:'Médula ósea produce eritrocitos. Huellas dactilares formadas.'},
    20:{peso:'300 g',desc:'Mitad del embarazo. Vernix caseoso. Cejas y pestañas visibles.'},
    22:{peso:'430 g',desc:'Ojos entreabiertos. Reacciona a sonidos.'},
    24:{peso:'600 g',desc:'⚠️ Límite de viabilidad con UCI neonatal (24–25 sem).'},
    26:{peso:'820 g',desc:'Pulmones producen surfactante (inicio). Ondas sueño-vigilia.'},
    28:{peso:'1.000 g',desc:'Cerebro duplica su peso (28–40). Percibe la voz materna.'},
    30:{peso:'1.300 g',desc:'Grasa subcutánea acumulándose. Lanugo desaparece.'},
    32:{peso:'1.700 g',desc:'Pulmones maduran (34–36 sem). Testículos descienden (varón).'},
    34:{peso:'2.100 g',desc:'Surfactante suficiente. Reflejo de búsqueda y succión.'},
    36:{peso:'2.500 g',desc:'Término tardío. Uñas llegan al borde. Placenta envejece.'},
    38:{peso:'3.000 g',desc:'Término completo (37–38 sem según FASGO/ACOG 2013).'},
    40:{peso:'3.300 g',desc:'Término. Cabeza encajada en pelvis. Cuello en maduración.'},
    41:{peso:'3.400 g',desc:'⚠️ Postérmino temprano. Indicación de inducción FASGO/ACOG.'},
    42:{peso:'3.400 g',desc:'🚨 Postérmino. Mortalidad perinatal duplicada. Finalización obligatoria.'},
  };

  const TIPO_COLOR = {consulta:'#0891b2',ecografia:'#7c3aed',laboratorio:'#0f6e56',parto:'#c04060'};

  const DATOS_DEFAULT = {
    trimestres: [
      /* ── PRIMER TRIMESTRE ── */
      {
        id: 't1', titulo: 'Primer Trimestre', semanas: 'Semanas 1–13+6',
        descripcion: 'Período de organogénesis. El embrión pasa de una sola célula a un feto con todos los órganos formados. Captación ideal antes de la semana 10. Fase de máxima vulnerabilidad teratogénica.',
        color: 'rose',
        bloques: [
          { id:'b1-0', semana:'< Semana 10', titulo:'Captación temprana · Primera consulta prenatal',
            desarrollo:'El objetivo es captar a la embarazada antes de la semana 10. Se realiza anamnesis completa, cálculo de la FPP (Regla de Naegele: FUM + 280 días), toma de presión arterial basal, peso, talla e IMC pregestacional. Se completa la Historia Clínica Perinatal (HCP — CLAP/OPS) y se entrega el carnet perinatal. Se indica ácido fólico 0,4 mg/día (dosis 4–5 mg si antecedentes de defectos del tubo neural o fármacos antagonistas del folato).',
            estudios:[
              {nombre:'Historia clínica perinatal (HCP — CLAP/OPS)',detalle:'Registro de antecedentes personales, familiares, gineco-obstétricos, tóxicos y sociales.'},
              {nombre:'Cálculo de FPP',detalle:'Regla de Naegele (FUM + 280 días). Se ajusta con ecografía del 1.° trimestre si hay discrepancia > 7 días.'},
              {nombre:'Peso, talla e IMC pregestacional',detalle:'Ganancia ponderal esperada (IOM 2009): bajo peso > 12–18 kg · normopeso 11,5–16 kg · sobrepeso 7–11,5 kg · obesidad 5–9 kg.'},
              {nombre:'Presión arterial basal',detalle:'Valor de referencia para detección de HTA gestacional o preeclampsia.'},
              {nombre:'Ácido fólico (suplementación)',detalle:'0,4 mg/día iniciado idealmente periconcepcional. Previene defectos del tubo neural. Dosis 4–5 mg si antecedentes o uso de fármacos antagonistas del folato (valproato, metotrexato).'}
            ]
          },
          { id:'b1-1', semana:'Semanas 6–10', titulo:'Ecografía temprana · Latido + saco gestacional',
            desarrollo:'Ovulación y fecundación (día 14 del ciclo). El cigoto se divide formando una mórula y luego un blastocisto que se implanta entre los días 6–10. Comienza la producción de β-hCG. La ecografía transvaginal temprana (sem. 6–10) confirma la vitalidad embrionaria (latido cardíaco), la localización intrauterina del saco gestacional, descarta embarazo ectópico y ajusta la edad gestacional.',
            estudios:[
              {nombre:'Ecografía transvaginal temprana (sem. 6–10)',detalle:'Confirma latido embrionario, localización del saco gestacional, número de embriones. Descarta embarazo ectópico. Permite ajuste de FPP por LCC cuando la FUM es incierta.'}
            ]
          },
          { id:'b1-2', semana:'Semanas 6–8', titulo:'Organogénesis activa · Laboratorio inicial obligatorio',
            desarrollo:'Se esbozan corazón, encéfalo, ojos, oídos, extremidades y tubo digestivo. Al final de la semana 8 existe la forma humana reconocible. LCC ≈ 16 mm. FC fetal: 170–180 lpm. Período de máxima vulnerabilidad a teratógenos.',
            estudios:[
              {nombre:'Hemograma completo + Grupo/Rh',detalle:'Diagnóstico de anemia (Hb < 11 g/dL). Suplementación con hierro elemental 30–60 mg/día desde el 1.° control. Grupo sanguíneo y factor Rh para plan de inmunoprofilaxis.'},
              {nombre:'PAI (Prueba de antiglobulina indirecta)',detalle:'En todas las embarazadas. Si Rh negativa: solicitar Rh y PAI al padre para plan de inmunoprofilaxis con anti-D.'},
              {nombre:'VDRL / RPR (sífilis)',detalle:'Obligatoria. Repetir en sem. 28 y al parto. Detección y tratamiento previenen sífilis congénita (penicilina G benzatínica).'},
              {nombre:'VIH (ELISA)',detalle:'Previa consejería y consentimiento. Repetir en sem. 34 y al parto. Obligatorio en Argentina (Ley 23.798). Profilaxis ARV reduce la transmisión vertical a < 1%.'},
              {nombre:'Toxoplasmosis (IgG + IgM)',detalle:'Si IgG negativa: repetir cada 2 meses + educación (evitar carne cruda, gatos, tierra). Si IgM positiva: confirmar con avidez de IgG.'},
              {nombre:'Hepatitis B (HBsAg)',detalle:'Si positivo: vacunación neonatal + inmunoglobulina en las primeras 12 hs. Repetir en sem. 28 si negativo inicial.'},
              {nombre:'Chagas (serología IgG x 2 técnicas)',detalle:'Endémico en Argentina. Si positivo: seguimiento neonatal con PCR en sangre de cordón y a las 6 semanas.'},
              {nombre:'Rubéola (IgG)',detalle:'Si negativa: no vacunar durante el embarazo (contraindicada). Registrar para vacunación postparto antes del alta.'},
              {nombre:'Glucemia en ayunas',detalle:'Diagnóstico de DM pregestacional (≥ 126 mg/dL) o alto riesgo de DMG.'},
              {nombre:'TSH (función tiroidea)',detalle:'Objetivo TSH < 2,5 mUI/L en el 1.° trimestre. Hipotiroidismo subclínico asociado a menor CI fetal y mayor riesgo de pérdida gestacional.'},
              {nombre:'Urocultivo + sedimento urinario',detalle:'Bacteriuria asintomática: tratar con antibiótico según cultivo para prevenir pielonefritis y parto pretérmino.'},
              {nombre:'Papanicolaou (si no actualizado)',detalle:'Seguro en el embarazo. Cribado de cáncer cervical. Ideal si no tiene PAP del último año.'}
            ]
          },
          { id:'b1-3', semana:'Semanas 11–13+6', titulo:'Ecografía del 1.° trimestre · Cribado combinado de aneuploidías',
            desarrollo:'LCC: 45–84 mm. El feto puede tragar y hace movimientos respiratorios. La translucencia nucal (TN) alcanza su máximo valor detectable. La placenta es funcionalmente activa. Ventana del cribado combinado: mayor sensibilidad para síndrome de Down y otras aneuploidías. También se calcula el riesgo de preeclampsia precoz.',
            estudios:[
              {nombre:'Translucencia nucal (TN)',detalle:'Medición estandarizada (certificación FMF). TN ≥ 3 mm asociada a aneuploidías (T21, T18, T13) y cardiopatías congénitas mayores.'},
              {nombre:'Hueso nasal (HN)',detalle:'Ausente en ~65% de los fetos con T21. Mejora la tasa de detección del cribado combinado.'},
              {nombre:'Ductus venoso (DV) e índice de pulsatilidad tricuspídeo',detalle:'Marcadores secundarios de aneuploidía y cardiopatía.'},
              {nombre:'PAPP-A y β-hCG libre en suero materno',detalle:'Bioquímica del cribado combinado. PAPP-A baja (< p5): también marcador de RCF y preeclampsia.'},
              {nombre:'Velocimetría Doppler de arterias uterinas',detalle:'IP medio ≥ p95 + PAPP-A baja + HTA materna: calcula riesgo de preeclampsia precoz. Indica profilaxis con aspirina 100–150 mg/día desde sem. 11–16 (NNT 7–8, evidencia nivel I).'},
              {nombre:'ADN fetal libre en sangre materna (cfDNA / NIFTY)',detalle:'Disponible en sistema privado. Sensibilidad > 99% para T21. Opción no invasiva antes de amniocentesis en riesgo intermedio-alto.'},
              {nombre:'Biopsia corial (si indicado)',detalle:'Semanas 11–14. Diagnóstico citogenético definitivo en alto riesgo (> 1/270). Alternativa a amniocentesis en 1.° trimestre.'},
              {nombre:'Vacuna dTpa (doble bacteriana acelular)',detalle:'Si no recibida en embarazo previo, preferentemente sem. 20–28. Genera inmunidad pasiva neonatal contra tos convulsa (coqueluche).'}
            ]
          }
        ]
      },
      /* ── SEGUNDO TRIMESTRE ── */
      {
        id:'t2', titulo:'Segundo Trimestre', semanas:'Semanas 14–27+6',
        descripcion:'Período de crecimiento y maduración orgánica. El feto alcanza viabilidad extrauterina al final del trimestre (sem. 24–25). Ventana clave para detección de anomalías estructurales en la ecografía morfológica. Controles mensuales: altura uterina, latido fetal y presión arterial.',
        color:'teal',
        bloques:[
          { id:'b2-1', semana:'Semanas 14–17', titulo:'Movimientos fetales · Control clínico mensual',
            desarrollo:'El feto percibe luz, sonido y sabores. La piel es delgada y translúcida (cubierta por lanugo). Los movimientos fetales percibidos por la madre (quieks) comienzan entre las semanas 16–20, antes en multíparas. El sexo es determinable por ecografía. Los controles obstétricos son mensuales: altura uterina (≈ semanas de gestación ± 3 cm), latido fetal (FCF 110–160 lpm) y presión arterial materna.',
            estudios:[
              {nombre:'Altura uterina (AU)',detalle:'En cm, debe aproximarse a las semanas de gestación ± 3 cm (Curva FASGO argentinizada). AU < p10 o discordancia > 4 cm → ecografía de crecimiento.'},
              {nombre:'Auscultación de FCF (Doppler portátil)',detalle:'Verificación de vitalidad fetal en cada consulta. Normal: 110–160 lpm.'},
              {nombre:'Test de Coombs indirecto / PAI — Rh negativa',detalle:'Si Rh negativa sin sensibilización previa: repetir PAI. Base para plan de inmunoprofilaxis con anti-D.'},
              {nombre:'Amniocentesis (si indicada)',detalle:'Semanas 15–18. Indicaciones: riesgo > 1/270 en cribado, cfDNA alterado, anomalía ecográfica, edad materna ≥ 38 años. Riesgo de pérdida: 0,1–0,3%.'}
            ]
          },
          { id:'b2-2', semana:'Semanas 18–22', titulo:'Ecografía morfológica estructural completa',
            desarrollo:'El feto pesa ≈ 300–450 g. La médula ósea produce eritrocitos. Las huellas dactilares están formadas. El vernix caseoso comienza a recubrir la piel. Los movimientos son vigorosos y regulares. La ecografía morfológica es el estudio más importante del embarazo: evalúa cerebro, corazón, riñones, extremidades, sexo fetal y entorno placentario.',
            estudios:[
              {nombre:'Biometría fetal',detalle:'DBP (diámetro biparietal), CC (circunferencia cefálica), CA (circunferencia abdominal), LF (longitud femoral). Peso fetal estimado (Hadlock IV). Percentil vs. INTERGROWTH-21st.'},
              {nombre:'Anatomía craneal',detalle:'Plano transventricular (atrios laterales ≤ 10 mm), transcerebeloso (vermis, cisterna magna, cerebelo), transtalamocavum.'},
              {nombre:'Cara y cuello',detalle:'Labio superior, órbitas, paladar en plano coronal. Descarta labio leporino e hipotelorismo.'},
              {nombre:'Corazón fetal — screening cardíaco básico',detalle:'Plano de 4 cámaras, tractos de salida izquierdo y derecho, arco aórtico, vena cava superior. Sensibilidad: 50–80% (operador-dependiente).'},
              {nombre:'Tórax, abdomen y pelvis',detalle:'Pulmones, diafragma, estómago (debe verse lleno), riñones (pelvis ≤ 7 mm), vejiga, intestino, pared abdominal.'},
              {nombre:'Extremidades y columna',detalle:'Longitud y ecogenicidad de huesos largos, postura de manos y pies. Columna en sagital, coronal y axial.'},
              {nombre:'Placenta, líquido amniótico y cordón',detalle:'Localización placentaria (si previa: eco TV sem. 28–32). ILA. Cordón: número de vasos (arteria única en 1% → cariotipo).'},
              {nombre:'Longitud cervical (LC) transvaginal',detalle:'LC < 25 mm antes de las 24 semanas: alto riesgo de parto pretérmino. Indicación de pesario o progesterona vaginal micronizada 200 mg/noche.'}
            ]
          },
          { id:'b2-3', semana:'Semanas 24–28', titulo:'Viabilidad fetal · Cribado de diabetes gestacional · Inmunoprofilaxis Rh',
            desarrollo:'Hito crítico: viabilidad extrauterina a partir de las 24–25 semanas con UCI neonatal. El surfactante pulmonar comienza a producirse. Los ojos ya están abiertos. El peso fetal ≈ 1.000 g. Las ondas de sueño-vigilia son detectables. Período de cribado universal de diabetes gestacional.',
            estudios:[
              {nombre:'PTOG 75 g — Curva de tolerancia a la glucosa (DMG)',detalle:'Gold standard. Semanas 24–28. DMG: basal ≥ 92 mg/dL, 1 hs ≥ 180 mg/dL, 2 hs ≥ 153 mg/dL (un solo valor basta). Asociación con macrosomía, distocia de hombros, hipoglucemia neonatal.'},
              {nombre:'Hemograma (control)',detalle:'Detección de anemia ferropénica o por dilución. Suplementar si Hb < 10,5 g/dL.'},
              {nombre:'Repetición serologías: VDRL, VIH, Toxoplasmosis (si negativa)',detalle:'Control de reinfecciones o seroconversión. Obligatorio según normativa nacional (sem. 28).'},
              {nombre:'Test de Coombs indirecto (Rh negativa) — sem. 28',detalle:'Si PAI negativa y sin sensibilización: Inmunoglobulina anti-D 300 μg IM a las 28 semanas (profilaxis antenatal estándar, FASGO).'},
              {nombre:'Urocultivo (control)',detalle:'Repetición. Alta tasa de bacteriuria intercurrente en el 2.° trimestre.'},
              {nombre:'HBsAg (si negativa en 1.° T)',detalle:'Repetición de Hepatitis B para control prenatal completo.'}
            ]
          }
        ]
      },
      /* ── TERCER TRIMESTRE ── */
      {
        id:'t3', titulo:'Tercer Trimestre', semanas:'Semanas 28–40+6',
        descripcion:'Período de maduración y preparación para el parto. El feto acumula tejido adiposo, madura sus pulmones y adopta la presentación cefálica. Vigilancia intensificada del bienestar fetal. Consultas quincenales hasta sem. 36, luego semanales.',
        color:'amber',
        bloques:[
          { id:'b3-1', semana:'Semanas 28–32', titulo:'Maduración cerebral · Ecografía de crecimiento + Doppler',
            desarrollo:'El cerebro duplica su peso entre las semanas 28–40. La girificación se acelera. Se mielinizan los fascículos sensoriales. El feto acumula grasa subcutánea (≈ 250 g/sem). Los pulmones producen suficiente surfactante desde las 34 semanas. El feto percibe y responde a la voz materna. Consultas cada 2–3 semanas.',
            estudios:[
              {nombre:'Ecografía de crecimiento fetal (sem. 28–32)',detalle:'Biometría, peso fetal estimado, ILA y localización placentaria. Detecta RCF: PFE < p10 o < p3 (INTERGROWTH-21st).'},
              {nombre:'Doppler de arteria umbilical',detalle:'Si RCF o factores de riesgo: IP de AU aumentado, diástole ausente o reversa indica compromiso placentario grave.'},
              {nombre:'Doppler de arteria cerebral media (ACM)',detalle:'IP disminuido (brain sparing) = signo tardío de hipoxia fetal. Razón cérebro-placentaria (ACM/AU) < 1: alto valor pronóstico.'},
              {nombre:'Registro cardiotocográfico (NST)',detalle:'A partir de las 28 semanas en embarazos de riesgo. Reactivo: ≥ 2 aceleraciones de ≥ 15 lpm × 15 seg en 20 minutos.'},
              {nombre:'Corticoides antenatales (si amenaza de parto pretérmino)',detalle:'Betametasona 12 mg IM c/24 hs × 2 dosis entre sem. 24–34+6. Aceleran maduración pulmonar, cerebral y GI fetal.'}
            ]
          },
          { id:'b3-2', semana:'Semanas 32–36', titulo:'Ecografía crecimiento + Doppler · Cultivo GBS',
            desarrollo:'Los pulmones están funcionalmente maduros a las 34–36 semanas. El peso fetal ≈ 2.200–2.500 g. Los testículos descienden al escroto (varón). La presentación cefálica se estabiliza. Las uñas alcanzan el borde de los dedos. El lanugo desaparece.',
            estudios:[
              {nombre:'Ecografía crecimiento + Doppler (sem. 32–36)',detalle:'Peso estimado, líquido amniótico (ILA), flujo uteroplacentario y presentación fetal. Detecta RCF tardía.'},
              {nombre:'Cultivo recto-vaginal para EGB (Streptococcus agalactiae)',detalle:'Semanas 35–37. Si positivo: profilaxis antibiótica intraparto con penicilina G IV. Primera causa de sepsis neonatal de inicio temprano. Sensibilidad del cultivo: 85–95%.'},
              {nombre:'Hemograma y VDRL (control final)',detalle:'Última evaluación preparto. VDRL obligatorio al momento del parto según normativa argentina.'},
              {nombre:'VIH y Hepatitis B (control final)',detalle:'Para profilaxis neonatal adecuada. Resultado obligatorio antes del parto.'},
              {nombre:'Hemograma + Coombs indirecto (Rh negativa)',detalle:'Evaluar anemia y programar inmunoglobulina anti-D si aún no recibida a las 28 semanas.'},
              {nombre:'Valoración de presentación fetal (Maniobras de Leopold)',detalle:'Desde sem. 34. Si presentación podálica ≥ 36 sem: ofrecer versión cefálica externa (VCE), éxito ≈ 50–60%.'}
            ]
          },
          { id:'b3-3', semana:'Semanas 36–40', titulo:'Consultas semanales · Plan de parto · Preparación para el nacimiento',
            desarrollo:'A las 37 semanas el embarazo es de término completo (FASGO/ACOG 2013). Peso fetal: 2.900–3.500 g. La placenta envejece fisiológicamente (calcificaciones Grannum III). La cabeza fetal encaja en la pelvis. El cuello uterino se madura progresivamente. Las consultas son semanales desde semana 36 y evalúan: posición fetal, signos premonitorios de parto (contracciones, rotura de membranas, show hemático), tensión arterial y signos de preeclampsia.',
            estudios:[
              {nombre:'NST (cardiotocografía) semanal / bisemanal',detalle:'Estándar en embarazos de riesgo. No reactivo: estimular con vibro-acústico; si persiste: BPP o Doppler de ductus venoso.'},
              {nombre:'Perfil biofísico fetal (BPP)',detalle:'Puntuación 0–10: NST + movimientos respiratorios + movimientos corporales + tono + ILA. ≤ 6 en 30 min → finalización según EG.'},
              {nombre:'Score de Bishop (tacto vaginal)',detalle:'Evalúa madurez cervical. ≥ 8: inducción directa con oxitocina. < 6: maduración previa con misoprostol vaginal o balón de Foley.'},
              {nombre:'Consulta preanestésica preparto',detalle:'Evaluación para cesárea programada o analgesia epidural. Incluye valoración de vía aérea, coagulograma, historia de cirugías previas y alergias.'},
              {nombre:'Prequirúrgico si cesárea planificada',detalle:'ECG, coagulograma completo, hemograma, grupo y factor. Estudio preoperatorio estándar para toda cesárea electiva.'},
              {nombre:'Inducción del trabajo de parto (ITP) — sem. 41',detalle:'Recomendada a las 41 semanas (FASGO/ACOG 2019): reduce mortalidad perinatal sin aumentar cesáreas. Opciones: misoprostol sublingual/vaginal, balón cervical, oxitocina.'}
            ]
          },
          { id:'b3-4', semana:'≥ Semana 42', titulo:'Embarazo postérmino · Indicación absoluta de finalización',
            desarrollo:'A las 42 semanas la mortalidad perinatal se duplica respecto a las 40 semanas. Indicación absoluta de inducción o cesárea según condiciones materno-fetales. La placenta pierde capacidad de intercambio. Aumenta el riesgo de oligoamnios y aspiración de meconio.',
            estudios:[
              {nombre:'NST diario + ILA (perfil biofísico modificado)',detalle:'Vigilancia intensificada del bienestar fetal en postérmino. Cualquier alteración indica finalización urgente.'},
              {nombre:'Doppler de ductus venoso',detalle:'Ondas "a" ausentes o reversas: signo terminal de compromiso fetal. Indicación de finalización urgente.'},
              {nombre:'Inducción o cesárea (indicación absoluta ≥ 42 sem)',detalle:'Sin excepción: el embarazo postérmino tiene indicación de finalización. Se elige la vía según condiciones cervicales y presentación.'}
            ]
          }
        ]
      },
      /* ── PUERPERIO ── */
      {
        id:'t4', titulo:'Puerperio', semanas:'Días 0–42 postparto',
        descripcion:'El puerperio comprende desde el alumbramiento hasta los 42 días postparto. Las guías argentinas establecen controles obligatorios a los 7 días y a los 42 días. Se evalúan cicatrización, lactancia, salud mental perinatal y presión arterial.',
        color:'purple',
        bloques:[
          { id:'b4-1', semana:'Días 1–7 (Puerperio inmediato)', titulo:'Alta hospitalaria · Control a los 7 días postparto',
            desarrollo:'El puerperio inmediato comprende las primeras 24 horas (período crítico de hemorragia). El alta hospitalaria ocurre entre las 48–72 hs en parto vaginal y 72–96 hs en cesárea. Se verifican: involución uterina, loquios, cicatrización de episiotomía o herida, inicio de lactancia materna, signos vitales. El control a los 7 días evalúa presión arterial, involución uterina, lactancia y signos de infección o depresión postparto.',
            estudios:[
              {nombre:'Control a los 7 días postparto',detalle:'Presión arterial (detección de HTA postparto o preeclampsia tardía), involución uterina, loquios, cicatrización de herida/episiotomía, instauración de lactancia materna.'},
              {nombre:'Pesquisa de depresión postparto (Escala de Edinburgh)',detalle:'Se aplica entre la primera y segunda semana postparto. Puntaje ≥ 13: derivación a salud mental. Prevalencia en Argentina: 20–25%.'},
              {nombre:'Lactancia materna',detalle:'Apoyo y educación para lactancia exclusiva hasta los 6 meses. Verificar técnica de agarre. Contraindicaciones: VIH (en Argentina: lactancia contraindicada en madres VIH+), Chagas activo, galactosemia neonatal.'},
              {nombre:'Inmunoglobulina anti-D postparto (Rh negativa)',detalle:'Si el recién nacido es Rh positivo: 300 μg IM dentro de las 72 hs del parto. Previene sensibilización para embarazos futuros.'},
              {nombre:'Hemograma postparto (si hemorragia o anemia)',detalle:'Si Hb < 8 g/dL: valorar transfusión. Si 8–10 g/dL: hierro IV o suplementación oral intensiva.'}
            ]
          },
          { id:'b4-2', semana:'Día 42 (Puerperio tardío)', titulo:'Control de los 42 días · Alta puerperal · Salud reproductiva',
            desarrollo:'El control de los 42 días es el cierre del embarazo. Se evalúa el retorno a la normalidad fisiológica materna: involución uterina completa, reestablecimiento del eje hormonal, cicatrización, salud mental y planificación familiar. Es el momento ideal para actualizar vacunas y comenzar método anticonceptivo. Según las guías argentinas, este control es obligatorio.',
            estudios:[
              {nombre:'Control de los 42 días (alta puerperal)',detalle:'Examen general, PA, peso, involución uterina, cicatrización, evaluación de lactancia y pesquisa de depresión postparto.'},
              {nombre:'Papanicolaou y colposcopía (si indicado)',detalle:'Si el PAP del embarazo fue anormal: seguimiento colposcópico a los 42 días.'},
              {nombre:'Método anticonceptivo postparto',detalle:'Planificación familiar: DIU postparto (inserción inmediata o diferida), progesterona sola (compatible con lactancia), barrera. Estrógenos contraindicados durante lactancia.'},
              {nombre:'Vacunación postparto',detalle:'Rubéola (si serología negativa en embarazo): vacunar antes del alta o a los 42 días. Varicela si susceptible. No hay contraindicación con lactancia (excepto fiebre amarilla).'},
              {nombre:'Screening de salud mental (Escala de Edinburgh — 2.° aplicación)',detalle:'A los 42 días evalúa depresión postparto establecida. Derivación si puntaje ≥ 13.'},
              {nombre:'Control del recién nacido (pesquisa neonatal)',detalle:'En paralelo al control materno: pesquisa metabólica ampliada (PKU, hipotiroidismo, SCID, FQ y otras en Argentina), audición neonatal y vacunación neonatal (BCG, HB, Polio).'}
            ]
          }
        ]
      }
    ],
    eventosSemana: EVENTOS_SEMANA_DEFAULT,
    fetoInfo: FETO_INFO_DEFAULT
  };

  /* ═══════════════════════════════════════════════════════
     PALETA (compartida ambas vistas)
  ═══════════════════════════════════════════════════════ */
  const PALETA = {
    rose:   {accent:'#c04060',light:'#f7e8ed',mid:'#e8a0b4',tab:'linear-gradient(135deg,#c04060,#a03050)',dark:'#8b2040'},
    teal:   {accent:'#0f6e56',light:'#e1f5ee',mid:'#5dcaa5',tab:'linear-gradient(135deg,#0f6e56,#0a5040)',dark:'#094030'},
    amber:  {accent:'#854f0b',light:'#faeeda',mid:'#ef9f27',tab:'linear-gradient(135deg,#854f0b,#6a3f08)',dark:'#5a3508'},
    purple: {accent:'#5b21b6',light:'#ede9fe',mid:'#a78bfa',tab:'linear-gradient(135deg,#5b21b6,#4c1d95)',dark:'#3b1580'}
  };

  const CHECKLIST = [
    {label:'1.° Trimestre',col:'#c04060',items:'Captación < sem. 10 · Eco temprana (latido) · Ácido fólico · Serologías completas · Translucencia nucal + cribado combinado (sem. 11–14)'},
    {label:'2.° Trimestre',col:'#0f6e56',items:'Controles mensuales (AU, FCF, PA) · Morfológica completa (sem. 18–22) · PTOG 75 g (sem. 24–28) · Repetición serologías · Inmunoglobulina anti-D (sem. 28, si Rh–)'},
    {label:'3.° Trimestre',col:'#854f0b',items:'Eco crecimiento + Doppler · Cultivo GBS (sem. 35–37) · Consultas semanales desde sem. 36 · NST · Consulta preanestésica · Prequirúrgico (si cesárea) · ITP a las 41 sem.'},
    {label:'Puerperio',    col:'#5b21b6',items:'Control a los 7 días · Control a los 42 días · Pesquisa depresión postparto (Edinburgh) · Anticoncepción · Vacunas (rubéola, varicela) · Anti-D si Rh–'}
  ];



  /* ═══════════════════════════════════════════════════════
     GLOSARIO DE SIGLAS
  ═══════════════════════════════════════════════════════ */
  const GLOSARIO = [
    {sigla:'ACOG',  def:'American College of Obstetricians and Gynecologists'},
    {sigla:'ACM',   def:'Arteria Cerebral Media'},
    {sigla:'APP',   def:'Amenaza de Parto Pretérmino'},
    {sigla:'ARV',   def:'Antirretrovirales (tratamiento anti-VIH)'},
    {sigla:'AU',    def:'Altura Uterina'},
    {sigla:'BPP',   def:'Perfil Biofísico Fetal (Biophysical Profile)'},
    {sigla:'CA',    def:'Circunferencia Abdominal (fetal)'},
    {sigla:'CC',    def:'Circunferencia Cefálica (fetal)'},
    {sigla:'cfDNA', def:'ADN fetal libre en sangre materna (cell-free DNA)'},
    {sigla:'CI',    def:'Cociente Intelectual'},
    {sigla:'CLAP',  def:'Centro Latinoamericano de Perinatología (OPS/OMS)'},
    {sigla:'CPAP',  def:'Presión Positiva Continua en la Vía Aérea (neonatal)'},
    {sigla:'DBP',   def:'Diámetro Biparietal (fetal)'},
    {sigla:'DIU',   def:'Dispositivo Intrauterino'},
    {sigla:'DM',    def:'Diabetes Mellitus'},
    {sigla:'DMG',   def:'Diabetes Mellitus Gestacional'},
    {sigla:'dTpa',  def:'Vacuna combinada difteria-tétanos-pertusis acelular'},
    {sigla:'DV',    def:'Ductus Venoso'},
    {sigla:'EGB',   def:'Estreptococo del Grupo B (Streptococcus agalactiae)'},
    {sigla:'ELISA', def:'Enzyme-Linked Immunosorbent Assay (técnica serológica)'},
    {sigla:'FASGO', def:'Federación Argentina de Sociedades de Ginecología y Obstetricia'},
    {sigla:'FC',    def:'Frecuencia Cardíaca'},
    {sigla:'FCF',   def:'Frecuencia Cardíaca Fetal'},
    {sigla:'FPP',   def:'Fecha Probable de Parto'},
    {sigla:'FQ',    def:'Fibrosis Quística'},
    {sigla:'FUM',   def:'Fecha de Última Menstruación'},
    {sigla:'GBS',   def:'Group B Streptococcus (Estreptococo del Grupo B)'},
    {sigla:'GI',    def:'Gastrointestinal'},
    {sigla:'Hb',    def:'Hemoglobina'},
    {sigla:'HBsAg', def:'Antígeno de Superficie de Hepatitis B'},
    {sigla:'HCP',   def:'Historia Clínica Perinatal (CLAP/OPS)'},
    {sigla:'HN',    def:'Hueso Nasal (ecografía 1.° trimestre)'},
    {sigla:'HTA',   def:'Hipertensión Arterial'},
    {sigla:'IgG',   def:'Inmunoglobulina G (anticuerpo de memoria)'},
    {sigla:'IgM',   def:'Inmunoglobulina M (anticuerpo de respuesta aguda)'},
    {sigla:'ILA',   def:'Índice de Líquido Amniótico'},
    {sigla:'IMC',   def:'Índice de Masa Corporal'},
    {sigla:'IOM',   def:'Institute of Medicine (EE.UU., guías de ganancia de peso)'},
    {sigla:'IP',    def:'Índice de Pulsatilidad (Doppler)'},
    {sigla:'ITP',   def:'Inducción del Trabajo de Parto'},
    {sigla:'IV',    def:'Intravenoso'},
    {sigla:'LCC',   def:'Longitud Cráneo-Caudal (embrión/feto)'},
    {sigla:'LC',    def:'Longitud Cervical (transvaginal)'},
    {sigla:'LF',    def:'Longitud Femoral (biometría fetal)'},
    {sigla:'lpm',   def:'Latidos por minuto'},
    {sigla:'MSAL',  def:'Ministerio de Salud de la Nación (Argentina)'},
    {sigla:'NIFTY', def:'Non-Invasive Fetal TrisomY test (ADN fetal libre)'},
    {sigla:'NNT',   def:'Número Necesario a Tratar'},
    {sigla:'NST',   def:'Non-Stress Test (Registro Cardiotocográfico)'},
    {sigla:'OPS',   def:'Organización Panamericana de la Salud'},
    {sigla:'PAI',   def:'Prueba de Antiglobulina Indirecta (Coombs indirecto)'},
    {sigla:'PAP',   def:'Papanicolaou (citología cervical)'},
    {sigla:'PAPP-A',def:'Proteína Plasmática A asociada al Embarazo'},
    {sigla:'PCR',   def:'Reacción en Cadena de la Polimerasa (técnica diagnóstica)'},
    {sigla:'PE',    def:'Preeclampsia'},
    {sigla:'PFE',   def:'Peso Fetal Estimado'},
    {sigla:'PKU',   def:'Fenilcetonuria (pesquisa metabólica neonatal)'},
    {sigla:'PP',    def:'Postparto'},
    {sigla:'PTOG',  def:'Prueba de Tolerancia Oral a la Glucosa'},
    {sigla:'RCF',   def:'Restricción del Crecimiento Fetal'},
    {sigla:'Rh',    def:'Factor Rhesus (grupo sanguíneo)'},
    {sigla:'RPM',   def:'Rotura Prematura de Membranas'},
    {sigla:'RPR',   def:'Rapid Plasma Reagin (prueba de sífilis)'},
    {sigla:'SAO',   def:'Sociedad Argentina de Obstetricia'},
    {sigla:'SCID',  def:'Inmunodeficiencia Combinada Severa (pesquisa neonatal)'},
    {sigla:'T13',   def:'Trisomía 13 (Síndrome de Patau)'},
    {sigla:'T18',   def:'Trisomía 18 (Síndrome de Edwards)'},
    {sigla:'T21',   def:'Trisomía 21 (Síndrome de Down)'},
    {sigla:'TN',    def:'Translucencia Nucal'},
    {sigla:'TSH',   def:'Hormona Estimulante de la Tiroides'},
    {sigla:'TV',    def:'Transvaginal'},
    {sigla:'UCI',   def:'Unidad de Cuidados Intensivos'},
    {sigla:'VDRL',  def:'Venereal Disease Research Laboratory (prueba de sífilis)'},
    {sigla:'VCE',   def:'Versión Cefálica Externa'},
    {sigla:'VIH',   def:'Virus de la Inmunodeficiencia Humana'},
    {sigla:'β-hCG', def:'Subunidad beta de la Gonadotropina Coriónica Humana'},
  ];

  /* Mapa rápido sigla → definición para tooltips inline */
  const GLOSARIO_MAP = {};
  GLOSARIO.forEach(g => { GLOSARIO_MAP[g.sigla] = g.def; });

  function renderGlosario() {
    return `
      <div class="crono-glosario" id="crono-glosario-box">
        <div class="crono-glosario-header" onclick="window._cronoToggleGlosario()">
          <h4>📖 Glosario de siglas y abreviaturas <span style="font-weight:400;font-size:.77rem;color:#64748b">(${GLOSARIO.length} términos)</span></h4>
          <span class="crono-glosario-arrow">›</span>
        </div>
        <div class="crono-glosario-body">
          <div class="crono-glosario-grid">
            ${GLOSARIO.map(g=>`
              <div class="crono-sigla-row">
                <span class="crono-sigla-key">${g.sigla}</span>
                <span class="crono-sigla-def">${g.def}</span>
              </div>`).join('')}
          </div>
          <div class="crono-glosario-note">
            💡 <strong>Tip:</strong> En los textos del programa, pasá el mouse sobre cualquier sigla subrayada para ver su significado sin necesidad de buscarla acá.
          </div>
        </div>
      </div>`;
  }

  window._cronoToggleGlosario = function() {
    const box = document.getElementById('crono-glosario-box');
    if (box) box.classList.toggle('abierto');
  };

  /* ── Helpers de trimestre ── */
  function colorTrim(t){return t==='t1'?PALETA.rose.accent:t==='t2'?PALETA.teal.accent:t==='t3'?PALETA.amber.accent:PALETA.purple.accent;}
  function lightTrim(t){return t==='t1'?PALETA.rose.light:t==='t2'?PALETA.teal.light:t==='t3'?PALETA.amber.light:PALETA.purple.light;}
  function midTrim(t)  {return t==='t1'?PALETA.rose.mid:t==='t2'?PALETA.teal.mid:t==='t3'?PALETA.amber.mid:PALETA.purple.mid;}
  function nombreTrim(t){return t==='t1'?'Primer Trimestre':t==='t2'?'Segundo Trimestre':t==='t3'?'Tercer Trimestre':'Puerperio';}
  function semanaTrim(s){return s<=13?'t1':s<=27?'t2':s<=42?'t3':'t4';}
  function palTrim(t){return t==='t1'?PALETA.rose:t==='t2'?PALETA.teal:t==='t3'?PALETA.amber:PALETA.purple;}

  /* ═══════════════════════════════════════════════════════
     ESTILOS
  ═══════════════════════════════════════════════════════ */
  function inyectarEstilos() {
    if (document.getElementById('crono-styles')) return;
    const st = document.createElement('style');
    st.id = 'crono-styles';
    st.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

      #cronologia-panel{
        display:none;
        max-width:980px;
        margin:0 auto;
        padding:24px 20px 80px;
        font-family:'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif;
        background: linear-gradient(160deg, #f0f4ff 0%, #f8f0fa 40%, #f0f7f4 100%);
        min-height:100vh;
        position:relative;
      }
      #cronologia-panel::before{
        content:'';
        position:fixed;
        inset:0;
        background:
          radial-gradient(ellipse 600px 400px at 10% 20%, rgba(192,64,96,.06) 0%, transparent 70%),
          radial-gradient(ellipse 500px 350px at 85% 70%, rgba(15,110,86,.06) 0%, transparent 70%),
          radial-gradient(ellipse 400px 300px at 50% 50%, rgba(133,79,11,.04) 0%, transparent 70%);
        pointer-events:none;
        z-index:0;
      }
      #cronologia-panel > * { position:relative; z-index:1; }
      #cronologia-panel.activo{display:block;}

      .crono-header{
        text-align:center;
        padding:1.5rem 1rem 1.2rem;
        margin-bottom:1.4rem;
        background:linear-gradient(135deg,#fff 0%,rgba(255,255,255,.85) 100%);
        border-radius:18px;
        border:1px solid rgba(255,255,255,.9);
        box-shadow:0 4px 24px rgba(15,23,42,.07), 0 1px 3px rgba(15,23,42,.04);
      }
      .crono-header h1{font-size:1.7rem;font-weight:800;color:#0f172a;letter-spacing:-.03em;}
      .crono-header p{font-size:.84rem;color:#64748b;margin-top:5px;font-weight:500;}
      .crono-header-badge{display:inline-block;background:linear-gradient(135deg,#005f73,#0a8a70);color:#fff;font-size:.73rem;font-weight:700;padding:4px 14px;border-radius:40px;margin-bottom:.7rem;letter-spacing:.04em;box-shadow:0 2px 8px rgba(0,95,115,.25);}

      .crono-btn-volver{
        background:linear-gradient(135deg,#1e293b 0%,#334155 100%);
        border:none;color:#fff;padding:10px 20px;border-radius:10px;cursor:pointer;
        font-size:.875rem;font-weight:600;transition:all .2s;
        display:inline-flex;align-items:center;gap:6px;margin-bottom:1rem;
        box-shadow:0 2px 8px rgba(15,23,42,.2);
        font-family:inherit;
      }
      .crono-btn-volver:hover{background:linear-gradient(135deg,#334155,#1e293b);transform:translateY(-1px);box-shadow:0 4px 14px rgba(15,23,42,.25);}
      .crono-btn-volver:active{transform:translateY(0);}

      /* ══ SELECTOR DE VISTA ══ */
      .crono-view-selector{
        display:flex;
        background:rgba(15,23,42,.06);
        backdrop-filter:blur(8px);
        border:1px solid rgba(255,255,255,.7);
        border-radius:14px;
        padding:5px;
        margin-bottom:1.6rem;
        gap:5px;
        box-shadow:0 2px 12px rgba(15,23,42,.06);
      }
      .crono-view-tab{
        flex:1;padding:10px 14px;border:2px solid transparent;
        border-radius:10px;font-size:.85rem;font-weight:700;
        cursor:pointer;transition:all .22s;
        display:flex;align-items:center;justify-content:center;gap:7px;
        white-space:nowrap;
        background:transparent;
        color:#64748b;
        font-family:inherit;
      }
      .crono-view-tab:hover:not(.activo){
        background:rgba(255,255,255,.6);
        color:#1e293b;
        border-color:rgba(15,23,42,.08);
      }
      /* Pestaña "Línea de Tiempo" activa → teal */
      .crono-view-tab:first-child.activo{
        background:linear-gradient(135deg,#0f6e56,#0a8a70);
        color:#fff;
        border-color:transparent;
        box-shadow:0 3px 14px rgba(15,110,86,.35);
        transform:translateY(-1px);
      }
      /* Pestaña "Cronología por Trimestres" activa → azul slate */
      .crono-view-tab:last-child.activo{
        background:linear-gradient(135deg,#1e40af,#2563eb);
        color:#fff;
        border-color:transparent;
        box-shadow:0 3px 14px rgba(37,99,235,.35);
        transform:translateY(-1px);
      }

      /* ── Vista 1 ── */
      .crono-tabs{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:1.5rem;}
      .crono-tab{
        padding:9px 20px;border-radius:30px;border:2.5px solid transparent;
        font-size:.83rem;font-weight:700;cursor:pointer;color:#fff;
        letter-spacing:.01em;transition:all .2s;
        box-shadow:0 2px 10px rgba(0,0,0,.14);
        font-family:inherit;
        opacity:.6;
        filter:saturate(.7);
      }
      .crono-tab:hover{opacity:.82;filter:saturate(.9);}
      .crono-tab.activo{
        opacity:1;
        filter:saturate(1);
        transform:translateY(-2px);
        box-shadow:0 5px 18px rgba(0,0,0,.22);
        border-color:rgba(255,255,255,.5);
        outline:3px solid rgba(255,255,255,.7);
        outline-offset:1px;
      }

      .crono-trim-hero{border-radius:14px;padding:1.2rem 1.5rem;margin-bottom:1.5rem;border:1px solid;box-shadow:0 2px 12px rgba(0,0,0,.06);}
      .crono-trim-hero h2{font-size:1.1rem;font-weight:800;margin-bottom:4px;}
      .crono-trim-hero p{font-size:.83rem;opacity:.85;line-height:1.6;}

      .crono-timeline{position:relative;padding-left:28px;}
      .crono-timeline::before{content:'';position:absolute;left:10px;top:0;bottom:0;width:2px;background:linear-gradient(to bottom,rgba(15,23,42,.08),rgba(15,23,42,.04));}
      .crono-bloque{position:relative;margin-bottom:1rem;}
      .crono-bloque-dot{position:absolute;left:-22px;top:16px;width:12px;height:12px;border-radius:50%;border:2.5px solid #fff;box-shadow:0 0 0 2px rgba(15,23,42,.12);z-index:1;}
      .crono-card{background:#fff;border:1px solid rgba(15,23,42,.07);border-radius:12px;overflow:hidden;transition:box-shadow .2s,transform .15s;box-shadow:0 1px 4px rgba(15,23,42,.05);}
      .crono-card:hover{box-shadow:0 4px 18px rgba(15,23,42,.09);transform:translateY(-1px);}
      .crono-card-header{display:flex;align-items:center;gap:10px;padding:.75rem 1rem;cursor:pointer;user-select:none;}
      .crono-badge{font-size:.72rem;font-weight:700;padding:3px 11px;border-radius:14px;white-space:nowrap;flex-shrink:0;}
      .crono-card-title{font-size:.9rem;font-weight:700;color:#1e293b;flex:1;line-height:1.35;}
      .crono-card-arrow{font-size:.8rem;color:#94a3b8;transition:transform .2s;flex-shrink:0;}
      .crono-card.abierta .crono-card-arrow{transform:rotate(90deg);}
      .crono-card-body{display:none;border-top:1px solid #f1f5f9;}
      .crono-card.abierta .crono-card-body{display:block;}
      .crono-card-body-inner{padding:.9rem 1rem;display:grid;gap:.85rem;}
      .crono-section-label{font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#94a3b8;margin-bottom:.3rem;}
      .crono-dev-text{font-size:.875rem;line-height:1.65;color:#475569;}
      .crono-estudios{display:grid;gap:6px;}
      .crono-estudio-item{display:flex;gap:8px;align-items:flex-start;}
      .crono-estudio-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;margin-top:6px;}
      .crono-estudio-nombre{font-size:.875rem;font-weight:600;color:#1e293b;line-height:1.3;}
      .crono-estudio-detalle{font-size:.8rem;color:#64748b;line-height:1.5;margin-top:2px;}

      .crono-checklist{background:#fff;border:1px solid rgba(15,23,42,.07);border-radius:16px;padding:1.25rem 1.5rem;margin-top:1.5rem;box-shadow:0 2px 10px rgba(15,23,42,.05);}
      .crono-checklist h3{font-size:.95rem;font-weight:800;color:#0f172a;margin-bottom:1rem;display:flex;gap:8px;align-items:center;}
      .crono-checklist-grid{display:grid;gap:.75rem;}
      .crono-check-item{display:flex;gap:10px;align-items:flex-start;}
      .crono-check-dot{width:18px;height:18px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:.65rem;font-weight:700;margin-top:1px;}
      .crono-check-label{font-size:.8rem;font-weight:700;color:#0f172a;}
      .crono-check-items{font-size:.8rem;color:#475569;margin-top:2px;line-height:1.5;}
      .crono-checklist-note{margin-top:1rem;font-size:.73rem;color:#64748b;border-top:1px solid #e2e8f0;padding-top:.75rem;line-height:1.55;}
      .crono-footer-note{margin-top:1rem;padding:.8rem 1rem;background:rgba(255,255,255,.7);border-radius:10px;border:1px solid rgba(15,23,42,.07);font-size:.75rem;color:#64748b;line-height:1.6;}

      /* ══ VISTA 2 — LÍNEA TEMPORAL ══ */
      .lt-semana-ctrl{
        background:rgba(255,255,255,.85);
        backdrop-filter:blur(8px);
        border:1px solid rgba(255,255,255,.9);
        border-radius:14px;padding:.9rem 1.2rem;
        margin-bottom:1.2rem;
        display:flex;align-items:center;gap:12px;flex-wrap:wrap;
        box-shadow:0 2px 10px rgba(15,23,42,.06);
      }
      .lt-semana-ctrl label{font-size:.8rem;font-weight:700;color:#475569;white-space:nowrap;}
      .lt-semana-val{font-size:.95rem;font-weight:700;color:#0f172a;min-width:80px;}
      .lt-semana-trim-badge{font-size:.72rem;font-weight:700;padding:4px 12px;border-radius:20px;color:#fff;white-space:nowrap;transition:background .25s;box-shadow:0 2px 8px rgba(0,0,0,.15);}
      .lt-slider-wrap{flex:1;min-width:120px;max-width:340px;display:flex;align-items:center;}
      .lt-semana-slider{
        -webkit-appearance:none;appearance:none;
        width:100%;height:7px;border-radius:4px;outline:none;cursor:pointer;
        touch-action:none;
        background:var(--lt-track,#e2e8f0);
        transition:background .25s;
      }
      .lt-semana-slider::-webkit-slider-thumb{
        -webkit-appearance:none;appearance:none;
        width:22px;height:22px;border-radius:50%;cursor:pointer;
        background:var(--lt-thumb,#0f6e56);
        border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.3);
        transition:background .25s,transform .1s;
      }
      .lt-semana-slider::-moz-range-thumb{
        width:22px;height:22px;border-radius:50%;cursor:pointer;border:3px solid #fff;
        background:var(--lt-thumb,#0f6e56);box-shadow:0 2px 10px rgba(0,0,0,.3);
        transition:background .25s,transform .1s;
      }
      .lt-semana-slider:active::-webkit-slider-thumb{transform:scale(1.2);}
      .lt-semana-slider:active::-moz-range-thumb{transform:scale(1.2);}

      /* Línea de tiempo */
      .lt-timeline-wrap{position:relative;overflow-x:auto;padding-bottom:4px;border-radius:12px;background:rgba(255,255,255,.85);border:1px solid rgba(255,255,255,.9);box-shadow:0 2px 14px rgba(15,23,42,.07);padding:10px;}
      .lt-timeline-inner{min-width:700px;padding:12px 0 0;}
      .lt-trim-bands{display:flex;margin-bottom:6px;border-radius:6px;overflow:hidden;height:8px;}
      .lt-trim-band{height:100%;}
      .lt-weeks-row{display:flex;align-items:flex-end;position:relative;margin-bottom:0;}
      .lt-week-col{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;position:relative;}
      .lt-week-num{font-size:.6rem;color:#94a3b8;margin-bottom:4px;font-weight:500;white-space:nowrap;}
      .lt-week-num.major{font-size:.65rem;color:#64748b;font-weight:700;}
      .lt-base-line{position:absolute;bottom:14px;left:0;right:0;height:2px;background:linear-gradient(90deg,#fce7ef 0%,#e1f5ee 31%,#faeeda 62%,#ede9fe 85%,#ede9fe 100%);border-radius:2px;}
      .lt-dot-wrap{position:relative;display:flex;flex-direction:column;align-items:center;width:100%;}
      .lt-dot{width:13px;height:13px;border-radius:50%;border:2.5px solid #fff;cursor:pointer;position:relative;z-index:2;transition:transform .15s,box-shadow .15s;box-shadow:0 1px 6px rgba(0,0,0,.2);flex-shrink:0;margin-bottom:4px;}
      .lt-dot:hover,.lt-dot.activo{transform:scale(1.5);box-shadow:0 3px 12px rgba(0,0,0,.3);}
      .lt-dot.lt-dot-parto{width:18px;height:18px;border-radius:4px;}
      .lt-dot.lt-semana-actual-marker{box-shadow:0 0 0 3px rgba(14,165,233,.45);border-color:#0ea5e9 !important;}
      .lt-current-line{position:absolute;bottom:0;top:0;width:2px;opacity:.65;pointer-events:none;z-index:3;transition:left .25s,background .25s;}
      .lt-current-label{position:absolute;bottom:calc(100% + 4px);font-size:.6rem;font-weight:700;color:#fff;padding:2px 6px;border-radius:4px;white-space:nowrap;transform:translateX(-50%);transition:background .25s;box-shadow:0 1px 6px rgba(0,0,0,.2);}

      /* Detalle */
      .lt-detail{
        background:rgba(255,255,255,.95);
        backdrop-filter:blur(8px);
        border:1px solid rgba(255,255,255,.9);
        border-radius:16px;margin-top:1.1rem;overflow:hidden;
        animation:ltFadeIn .18s ease;
        box-shadow:0 4px 24px rgba(15,23,42,.09);
      }
      @keyframes ltFadeIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
      .lt-detail-header{padding:.9rem 1.2rem;display:flex;align-items:center;gap:.8rem;border-bottom:1px solid #f1f5f9;}
      .lt-detail-icon{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;}
      .lt-detail-title{flex:1;}
      .lt-detail-title h3{font-size:.95rem;font-weight:800;color:#0f172a;margin:0 0 2px;}
      .lt-detail-title p{font-size:.78rem;color:#64748b;margin:0;font-weight:600;}
      .lt-detail-body{padding:1rem 1.2rem;display:grid;grid-template-columns:1fr 1fr;gap:1rem;}
      @media(max-width:600px){.lt-detail-body{grid-template-columns:1fr;}}
      .lt-detail-section-label{font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:.5rem;}
      .lt-feto-card{background:linear-gradient(135deg,#f8fafc,#f1f5f9);border-radius:12px;padding:.9rem 1rem;border:1px solid #e8ecf1;}
      .lt-feto-peso{font-size:1.25rem;font-weight:800;color:#0f172a;margin-bottom:3px;}
      .lt-feto-desc{font-size:.78rem;color:#475569;line-height:1.55;}
      .lt-estudios-list{display:grid;gap:6px;}
      .lt-estudio-item{display:flex;gap:7px;align-items:flex-start;font-size:.8rem;color:#334155;line-height:1.4;}
      .lt-estudio-bullet{width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:5px;}
      .lt-detail-close{background:rgba(15,23,42,.06);border:none;cursor:pointer;color:#64748b;font-size:1rem;padding:5px 8px;border-radius:8px;transition:all .15s;font-family:inherit;}
      .lt-detail-close:hover{background:rgba(15,23,42,.1);color:#1e293b;}
      .lt-leyenda{display:flex;gap:.75rem;flex-wrap:wrap;margin-bottom:.9rem;align-items:center;}
      .lt-leyenda-item{display:flex;align-items:center;gap:5px;font-size:.72rem;color:#64748b;font-weight:600;}
      .lt-leyenda-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0;}
      .lt-trim-desc-bar{display:flex;gap:6px;margin-bottom:1rem;flex-wrap:wrap;}
      .lt-trim-desc-pill{
        flex:1;min-width:140px;border-radius:12px;padding:.6rem .9rem;
        border:1px solid;font-size:.73rem;line-height:1.45;
        box-shadow:0 1px 6px rgba(0,0,0,.04);
      }
      .lt-trim-desc-pill strong{display:block;font-size:.8rem;margin-bottom:3px;font-weight:700;}
      .lt-mini-checklist{background:rgba(255,255,255,.85);border:1px solid rgba(255,255,255,.9);border-radius:14px;padding:1rem 1.2rem;margin-top:1rem;box-shadow:0 2px 10px rgba(15,23,42,.05);}
      .lt-mini-checklist h4{font-size:.82rem;font-weight:800;color:#0f172a;margin:0 0 .7rem;display:flex;align-items:center;gap:6px;}
      .lt-mini-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.6rem;}
      .lt-mini-item{background:#fff;border-radius:10px;padding:.65rem .85rem;border-left:3px solid;font-size:.75rem;box-shadow:0 1px 4px rgba(15,23,42,.04);}
      .lt-mini-item strong{display:block;color:#0f172a;margin-bottom:3px;font-size:.78rem;}
      .lt-mini-item span{color:#64748b;line-height:1.5;}
      .lt-footer{margin-top:1.2rem;padding:.75rem 1rem;background:rgba(255,255,255,.6);border-radius:10px;border:1px solid rgba(15,23,42,.06);font-size:.72rem;color:#64748b;line-height:1.6;}

      /* ══ GLOSARIO DE SIGLAS ══ */
      .crono-glosario{background:rgba(255,255,255,.85);border:1px solid rgba(255,255,255,.9);border-radius:16px;padding:1.1rem 1.4rem;margin-top:1.2rem;box-shadow:0 2px 10px rgba(15,23,42,.05);}
      .crono-glosario-header{display:flex;align-items:center;justify-content:space-between;cursor:pointer;user-select:none;margin-bottom:0;}
      .crono-glosario-header h4{font-size:.88rem;font-weight:700;color:#0f172a;margin:0;display:flex;align-items:center;gap:7px;}
      .crono-glosario-header .crono-glosario-arrow{font-size:.78rem;color:#94a3b8;transition:transform .2s;}
      .crono-glosario.abierto .crono-glosario-arrow{transform:rotate(90deg);}
      .crono-glosario-body{display:none;margin-top:.9rem;}
      .crono-glosario.abierto .crono-glosario-body{display:block;}
      .crono-glosario-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:.45rem .8rem;}
      .crono-sigla-row{display:flex;align-items:baseline;gap:6px;font-size:.8rem;padding:.25rem 0;border-bottom:1px solid #f8fafc;}
      .crono-sigla-key{font-weight:700;color:#005f73;flex-shrink:0;min-width:52px;font-size:.82rem;}
      .crono-sigla-def{color:#475569;line-height:1.4;}
      abbr.crono-abbr{text-decoration:underline dotted #94a3b8;text-underline-offset:2px;cursor:help;position:relative;color:inherit;}
      abbr.crono-abbr::after{
        content:attr(data-title);
        position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);
        background:#0f172a;color:#f1f5f9;font-size:.72rem;font-weight:500;line-height:1.4;
        padding:5px 10px;border-radius:7px;white-space:normal;min-width:160px;max-width:260px;
        box-shadow:0 4px 14px rgba(0,0,0,.22);pointer-events:none;
        opacity:0;transition:opacity .15s;z-index:9999;text-align:left;
      }
      abbr.crono-abbr:hover::after{opacity:1;}
      .crono-glosario-note{margin-top:.75rem;font-size:.72rem;color:#94a3b8;line-height:1.5;border-top:1px solid #f1f5f9;padding-top:.6rem;}

      /* Admin panels */
      #crono-admin-panel,#crono-admin-lt-panel{display:none;margin-top:2.5rem;padding:1.5rem;background:rgba(255,255,255,.9);border:2px dashed #cbd5e1;border-radius:16px;box-shadow:0 2px 14px rgba(15,23,42,.06);}
      #crono-admin-panel.visible,#crono-admin-lt-panel.visible{display:block;}
      .crono-admin-title{font-size:1rem;font-weight:800;color:#0f172a;margin-bottom:1rem;display:flex;align-items:center;gap:8px;}
      .crono-admin-section{background:#fff;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:1rem;overflow:hidden;box-shadow:0 1px 4px rgba(15,23,42,.04);}
      .crono-admin-section-header{padding:.75rem 1rem;font-weight:700;font-size:.88rem;color:#1e293b;background:linear-gradient(135deg,#f8fafc,#f1f5f9);border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;cursor:pointer;}
      .crono-admin-section-body{padding:1rem;}
      .crono-admin-field{margin-bottom:.875rem;}
      .crono-admin-field label{display:block;font-size:.78rem;font-weight:700;color:#475569;margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em;}
      .crono-admin-field input,.crono-admin-field textarea,.crono-admin-field select{width:100%;padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:.875rem;font-family:inherit;color:#0f172a;background:#fff;transition:border-color .15s,box-shadow .15s;box-sizing:border-box;-webkit-user-select:text !important;user-select:text !important;}
      .crono-admin-field input:focus,.crono-admin-field textarea:focus,.crono-admin-field select:focus{outline:none;border-color:#38bdf8;box-shadow:0 0 0 3px rgba(56,189,248,.15);}
      .crono-admin-field textarea{resize:vertical;min-height:70px;}
      .crono-btn-admin{padding:8px 16px;border-radius:9px;border:none;font-size:.83rem;font-weight:700;cursor:pointer;transition:all .15s;display:inline-flex;align-items:center;gap:5px;font-family:inherit;}
      .crono-btn-save{background:linear-gradient(135deg,#0891b2,#0e7490);color:#fff;box-shadow:0 2px 8px rgba(8,145,178,.3);}.crono-btn-save:hover{filter:brightness(1.08);transform:translateY(-1px);}
      .crono-btn-add{background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;box-shadow:0 2px 8px rgba(22,163,74,.3);}.crono-btn-add:hover{filter:brightness(1.08);transform:translateY(-1px);}
      .crono-btn-del{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;box-shadow:0 2px 8px rgba(239,68,68,.25);}.crono-btn-del:hover{filter:brightness(1.08);}
      .crono-btn-seed{background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;box-shadow:0 2px 8px rgba(124,58,237,.3);}.crono-btn-seed:hover{filter:brightness(1.08);}
      .crono-btn-neutral{background:linear-gradient(135deg,#e2e8f0,#cbd5e1);color:#334155;}.crono-btn-neutral:hover{background:linear-gradient(135deg,#cbd5e1,#b2bccc);}
      .crono-admin-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:.5rem;}
      .crono-estudio-editor{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:.75rem;margin-bottom:.5rem;}
      .crono-estudio-editor-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem;}
      .crono-estudio-num{font-size:.75rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em;}
      .crono-seed-info{background:linear-gradient(135deg,#ede9fe,#ddd6fe);border:1px solid #a78bfa;border-radius:12px;padding:.875rem 1rem;font-size:.8rem;color:#4c1d95;line-height:1.6;margin-bottom:1rem;}
      .crono-toast{position:fixed;bottom:70px;left:50%;transform:translateX(-50%);background:#0f172a;color:#f1f5f9;padding:10px 22px;border-radius:12px;font-size:.85rem;font-weight:600;z-index:99999;opacity:0;transition:opacity .25s;pointer-events:none;white-space:nowrap;box-shadow:0 4px 18px rgba(15,23,42,.3);}
      .crono-toast.visible{opacity:1;}
      li.crono-menu-li{padding-left:24px !important;position:relative;font-style:italic;color:#0891b2 !important;border-left:2px solid #e8a0b4 !important;margin-left:24px;font-size:.88rem !important;}
      li.crono-menu-li::before{content:'└';position:absolute;left:6px;color:#e8a0b4;font-style:normal;}
      li.crono-menu-li:hover{background:#f7e8ed !important;color:#a03050 !important;}
    `;
    document.head.appendChild(st);
  }

  /* ═══════════════════════════════════════════════════════
     RENDER VISTA 1 (acordeón trimestres)
  ═══════════════════════════════════════════════════════ */
  function renderVista1(datos, esAdmin, trimActivo) {
    const trim = datos.trimestres.find(t=>t.id===trimActivo)||datos.trimestres[0];
    const pal  = PALETA[trim.color]||PALETA.rose;
    return `
      <div class="crono-tabs">
        ${datos.trimestres.map(t=>{const p=PALETA[t.color]||PALETA.rose;return`<button class="crono-tab${t.id===trimActivo?' activo':''}" style="background:${p.tab}" onclick="window._cronoSetTrim('${t.id}')">${t.titulo}</button>`;}).join('')}
      </div>
      <div class="crono-trim-hero" style="background:${pal.light};border-color:${pal.mid};color:${pal.accent}">
        <h2>${trim.titulo} <span style="font-weight:400;font-size:.85rem;opacity:.8">· ${trim.semanas}</span></h2>
        <p>${trim.descripcion}</p>
      </div>
      <div class="crono-timeline">
        ${trim.bloques.map(bloque=>`
          <div class="crono-bloque">
            <div class="crono-bloque-dot" style="background:${pal.accent}"></div>
            <div class="crono-card" id="crono-card-${bloque.id}">
              <div class="crono-card-header" onclick="window._cronoToggleCard('${bloque.id}')">
                <span class="crono-badge" style="background:${pal.light};color:${pal.accent}">${bloque.semana}</span>
                <span class="crono-card-title">${bloque.titulo}</span>
                <span class="crono-card-arrow">›</span>
              </div>
              <div class="crono-card-body">
                <div class="crono-card-body-inner">
                  <div><div class="crono-section-label">Contexto clínico y desarrollo</div><div class="crono-dev-text">${bloque.desarrollo}</div></div>
                  ${bloque.estudios&&bloque.estudios.length>0?`<div><div class="crono-section-label">Controles y estudios</div><div class="crono-estudios">${bloque.estudios.map(e=>`<div class="crono-estudio-item"><div class="crono-estudio-dot" style="background:${pal.accent}"></div><div><div class="crono-estudio-nombre">${e.nombre}</div><div class="crono-estudio-detalle">${e.detalle}</div></div></div>`).join('')}</div></div>`:''}
                </div>
              </div>
            </div>
          </div>`).join('')}
      </div>
      <div class="crono-checklist">
        <h3>✅ Resumen de controles mínimos (Argentina)</h3>
        <div class="crono-checklist-grid">
          ${CHECKLIST.map(c=>`<div class="crono-check-item"><div class="crono-check-dot" style="background:${c.col}">✓</div><div><div class="crono-check-label">${c.label}</div><div class="crono-check-items">${c.items}</div></div></div>`).join('')}
        </div>
        <div class="crono-checklist-note">⚕️ Basado en Guías de Obstetricia del Ministerio de Salud de la Nación y Consenso de Sociedades Científicas (actualización 2025–2026).</div>
      </div>
      <div class="crono-footer-note"><strong>Referencias:</strong> Guías FASGO · SAO · Programa Nacional de Salud Perinatal MSAL Argentina · CLAP-OPS · ACOG Practice Bulletins. Cronología orientativa; el manejo individualizado puede diferir según protocolo institucional y condición clínica.</div>
      ${renderGlosario()}
      ${esAdmin?renderAdminPanel(datos,trimActivo):''}
    `;
  }

  /* ═══════════════════════════════════════════════════════
     RENDER VISTA 2 (línea temporal)
  ═══════════════════════════════════════════════════════ */
  function renderVista2(semanaActual, eventoSel, esAdmin, datos) {
    const EVENTOS_SEMANA = datos.eventosSemana || EVENTOS_SEMANA_DEFAULT;
    const FETO_INFO = datos.fetoInfo || FETO_INFO_DEFAULT;
    const trimActual = semanaTrim(semanaActual);
    const pal = palTrim(trimActual);
    let semLabel = semanaActual===0?'Pre-gestación / captación':semanaActual<=13?`Semana ${semanaActual} · 1.° Trimestre`:semanaActual<=27?`Semana ${semanaActual} · 2.° Trimestre`:semanaActual<=40?`Semana ${semanaActual} · 3.° Trimestre`:semanaActual===41?'Semana 41 · Indicación de inducción':semanaActual===42?'Semana 42+ · Postérmino':semanaActual===43?'Control 7 días postparto':'Alta puerperal 42 días';
    const TOTAL = 45;
    const BANDS = [{id:'t1',cols:14},{id:'t2',cols:14},{id:'t3',cols:15},{id:'t4',cols:2}];
    const evento = eventoSel!==null?EVENTOS_SEMANA[eventoSel]:null;
    const fetoInfo = eventoSel!==null?(FETO_INFO[eventoSel]||FETO_INFO[Math.max(...Object.keys(FETO_INFO).map(Number).filter(k=>k<=eventoSel))]):null;

    return `
      <div class="lt-semana-ctrl">
        <label>Semana gestacional actual:</label>
        <div class="lt-slider-wrap">
          <input type="range" class="lt-semana-slider" id="lt-slider" min="0" max="44" value="${semanaActual}"
            style="--lt-thumb:${pal.accent};--lt-track:${pal.mid}">
        </div>
        <span class="lt-semana-val">${semLabel}</span>
        <span class="lt-semana-trim-badge" style="background:${pal.tab}">${nombreTrim(trimActual)}</span>
      </div>

      <div class="lt-trim-desc-bar">
        ${[{id:'t1',titulo:'1.° Trimestre',sem:'Sem. 1–13+6',desc:'Organogénesis. Máxima vulnerabilidad teratogénica. Cribado combinado.',pal:PALETA.rose},{id:'t2',titulo:'2.° Trimestre',sem:'Sem. 14–27+6',desc:'Crecimiento y maduración. Ecografía morfológica. DMG. Viabilidad.',pal:PALETA.teal},{id:'t3',titulo:'3.° Trimestre',sem:'Sem. 28–40+6',desc:'Maduración pulmonar. GBS. Controles semanales. Preparación al parto.',pal:PALETA.amber},{id:'t4',titulo:'Puerperio',sem:'Días 0–42 PP',desc:'Control a los 7 y 42 días. Edinburgh. Anticoncepción. Alta puerperal.',pal:PALETA.purple}].map(t=>`<div class="lt-trim-desc-pill" style="background:${t.pal.light};border-color:${t.pal.mid};color:${t.pal.dark||t.pal.accent}"><strong>${t.titulo} <span style="font-weight:400;opacity:.75">· ${t.sem}</span></strong>${t.desc}</div>`).join('')}
      </div>

      <div class="lt-leyenda">
        <span style="font-size:.72rem;color:#94a3b8;font-weight:600">TIPO DE CONTROL:</span>
        ${Object.entries(TIPO_COLOR).map(([tipo,color])=>`<span class="lt-leyenda-item"><span class="lt-leyenda-dot" style="background:${color}"></span>${tipo.charAt(0).toUpperCase()+tipo.slice(1)}</span>`).join('')}
        <span class="lt-leyenda-item" style="margin-left:4px"><span style="width:9px;height:9px;border:2px solid #0ea5e9;border-radius:50%;display:inline-block"></span> Semana actual</span>
      </div>

      <div class="lt-timeline-wrap" id="lt-timeline-wrap"><div class="lt-timeline-inner">
        <div class="lt-trim-bands">
          ${BANDS.map(b=>`<div class="lt-trim-band" style="flex:${b.cols};background:${midTrim(b.id)};opacity:.35;"></div>`).join('')}
        </div>
        <div class="lt-weeks-row" id="lt-weeks-row" style="position:relative;">
          <div class="lt-base-line"></div>
          <div class="lt-current-line" id="lt-current-line" style="left:${(semanaActual/(TOTAL-1))*100}%;background:${pal.accent};cursor:ew-resize;" title="Arrastrá para cambiar la semana">
            <div class="lt-current-label" style="background:${pal.accent}">Sem. ${semanaActual<=42?semanaActual:semanaActual===43?'7d PP':'42d PP'}</div>
          </div>
          ${Array.from({length:TOTAL},(_,col)=>{
            const ev=EVENTOS_SEMANA[col];
            const isActual=col===semanaActual;
            const isMajor=col%4===0||col>=43;
            const trimCol=semanaTrim(col);
            const dotColor=ev?TIPO_COLOR[ev.tipo]||colorTrim(ev.trim):'transparent';
            const isSel=eventoSel===col;
            let lbl='';if(col===43)lbl='7d';else if(col===44)lbl='42d';else if(isMajor&&col<=42)lbl=col===0?'Cap.':col;
            return `<div class="lt-week-col" style="cursor:${ev?'pointer':'crosshair'}" onclick="window._ltClickCol(${col},event)"><div class="lt-dot-wrap">${ev?`<div class="lt-dot${ev.tipo==='parto'?' lt-dot-parto':''}${isActual?' lt-semana-actual-marker':''}${isSel?' activo':''}" style="background:${dotColor};border-color:#fff;" title="${ev.label}"></div>`:`<div style="width:4px;height:4px;border-radius:50%;background:#e2e8f0;margin-bottom:4px;flex-shrink:0"></div>`}<div class="lt-week-num${isMajor?' major':''}" style="color:${ev?colorTrim(trimCol):''}">${lbl}</div></div></div>`;
          }).join('')}
        </div>
      </div></div>

      ${evento?`
        <div class="lt-detail" id="lt-detail-panel">
          <div class="lt-detail-header">
            <div class="lt-detail-icon" style="background:${lightTrim(evento.trim)};color:${colorTrim(evento.trim)};font-size:1.3rem">${evento.icon}</div>
            <div class="lt-detail-title">
              <h3>${evento.label}</h3>
              <p style="color:${colorTrim(evento.trim)};font-weight:600">${nombreTrim(evento.trim)}${eventoSel<=42?` · Semana ${eventoSel}`:eventoSel===43?' · 7 días postparto':' · 42 días postparto'}</p>
            </div>
            <button class="lt-detail-close" onclick="window._ltSelectEvento(null)" title="Cerrar">✕</button>
          </div>
          <div class="lt-detail-body">
            <div>
              <div class="lt-detail-section-label">Desarrollo fetal</div>
              ${fetoInfo?`<div class="lt-feto-card" style="border-left:3px solid ${colorTrim(evento.trim)}"><div class="lt-feto-peso" style="color:${colorTrim(evento.trim)}">≈ ${fetoInfo.peso}</div><div class="lt-feto-desc">${fetoInfo.desc}</div></div>`:`<div class="lt-feto-card"><div class="lt-feto-desc" style="color:#94a3b8">Datos fetales no disponibles para este hito.</div></div>`}
              ${eventoSel<=44?`<div style="margin-top:.75rem;font-size:.73rem;color:#94a3b8;line-height:1.5"><strong style="display:block;color:#475569;margin-bottom:3px">Contexto clínico</strong>${escH(evento.desc||'')}</div>`:''}
            </div>
            <div>
              <div class="lt-detail-section-label">Controles y estudios</div>
              <div class="lt-estudios-list">
                ${evento.estudios.length>0?evento.estudios.map(e=>`<div class="lt-estudio-item"><div class="lt-estudio-bullet" style="background:${colorTrim(evento.trim)}"></div><span>${e}</span></div>`).join(''):`<div style="font-size:.78rem;color:#94a3b8;font-style:italic">Hito sin estudios específicos.</div>`}
              </div>
            </div>
          </div>
        </div>
      `:`<div style="text-align:center;padding:1.5rem 1rem;color:#94a3b8;font-size:.83rem;border:1px dashed #e2e8f0;border-radius:12px;margin-top:1rem"><div style="font-size:1.5rem;margin-bottom:.5rem">☝️</div>Tocá un punto en la línea de tiempo para ver los detalles clínicos y estudios de esa semana.</div>`}

      <div class="lt-mini-checklist" style="margin-top:1rem">
        <h4>✅ Controles mínimos obligatorios (Argentina)</h4>
        <div class="lt-mini-grid">
          ${[{label:'1.° Trimestre',col:PALETA.rose.accent,items:'Captación < sem. 10 · Eco temprana (latido) · Ácido fólico · Serologías completas · TN + cribado combinado (sem. 11–14)'},{label:'2.° Trimestre',col:PALETA.teal.accent,items:'Controles mensuales (AU, FCF, PA) · Morfológica completa (sem. 18–22) · PTOG 75 g (sem. 24–28) · Repetición serologías · Anti-D sem. 28 (si Rh–)'},{label:'3.° Trimestre',col:PALETA.amber.accent,items:'Eco crecimiento + Doppler · GBS (sem. 35–37) · Consultas semanales desde sem. 36 · NST · Preanestésica · ITP a las 41 sem.'},{label:'Puerperio',col:PALETA.purple.accent,items:'Control 7 días · Control 42 días · Edinburgh · Anticoncepción · Vacunas (rubéola, varicela) · Anti-D si Rh–'}].map(c=>`<div class="lt-mini-item" style="border-left-color:${c.col};background:${c.col}11"><strong style="color:${c.col}">${c.label}</strong><span>${c.items}</span></div>`).join('')}
        </div>
      </div>
      <div class="lt-footer"><strong>Referencias:</strong> Guías FASGO · SAO · Programa Nacional de Salud Perinatal MSAL Argentina · CLAP-OPS · ACOG Practice Bulletins. Cronología orientativa; el manejo individualizado puede diferir según protocolo institucional y condición clínica.</div>
      ${renderGlosario()}
      ${esAdmin?renderAdminPanelTimeline(datos):''}
    `;
  }

  /* ═══════════════════════════════════════════════════════
     RENDER PRINCIPAL
  ═══════════════════════════════════════════════════════ */
  function renderCronologia(datos) {
    const panel = document.getElementById('cronologia-panel');
    if (!panel) return;
    const esAdminUser = () => !!(window._fbCurrentUserData && window._fbCurrentUserData.role === 'admin');

    let vistaActiva  = panel._vistaActiva  || 'v2';
    let trimActivo   = panel._trimActivo   || datos.trimestres[0].id;
    let semanaActual = parseInt(panel._semanaActual || 0);
    let eventoSel    = panel._eventoSel !== undefined ? panel._eventoSel : null;

    function build() {
      const admin = esAdminUser();
      panel.innerHTML = `
        <button class="crono-btn-volver" onclick="document.getElementById('cronologia-panel').classList.remove('activo'); window.volverAlMenu && window.volverAlMenu();">← Volver al Menú Principal</button>
        <div class="crono-header">
          <h1>📅 Control Prenatal</h1>
          <p>Cronología interactiva · Eventos clínicos + estudios por semana gestacional · Actualización 2025–2026</p>
        </div>
        <div class="crono-view-selector">
          <button class="crono-view-tab${vistaActiva==='v2'?' activo':''}" onclick="window._cronoSetVista('v2')">📆 Línea de Tiempo</button>
          <button class="crono-view-tab${vistaActiva==='v1'?' activo':''}" onclick="window._cronoSetVista('v1')">📋 Cronología por Trimestres</button>
        </div>
        <div id="crono-v2" ${vistaActiva==='v2'?'':'style="display:none"'}>${renderVista2(semanaActual,eventoSel,admin,datos)}</div>
        <div id="crono-v1" ${vistaActiva==='v1'?'':'style="display:none"'}>${renderVista1(datos,admin,trimActivo)}</div>
      `;
      panel._vistaActiva=vistaActiva; panel._trimActivo=trimActivo; panel._semanaActual=semanaActual; panel._eventoSel=eventoSel;

      /* Callbacks Vista 1 */
      window._cronoSetTrim = function(tid){trimActivo=tid;panel._trimActivo=tid;build();window.scrollTo(0,0);};
      window._cronoToggleCard = function(id){const c=document.getElementById('crono-card-'+id);if(c)c.classList.toggle('abierta');};

      /* Callbacks Vista 2 */
      window._ltSelectEvento = function(col){
        // Toggle del panel de detalle
        eventoSel=(col===null||eventoSel===col)?null:col;
        panel._eventoSel=eventoSel;

        if(col!==null && col!==undefined){
          // Mover la semana actual al punto seleccionado
          semanaActual = col;
          panel._semanaActual = semanaActual;
        }

        const v2=document.getElementById('crono-v2');
        if(v2){
          v2.innerHTML=renderVista2(semanaActual,eventoSel,esAdminUser(),datos);
          bindSlider();
          activarTooltipsSiglas(v2);
          if(eventoSel!==null){
            setTimeout(()=>{const d=document.getElementById('lt-detail-panel');if(d)d.scrollIntoView({behavior:'smooth',block:'nearest'});},80);
          }
        }
      };

      /* Cambio de vista */
      window._cronoSetVista = function(v){
        vistaActiva=v;panel._vistaActiva=v;
        document.getElementById('crono-v1').style.display=v==='v1'?'':'none';
        document.getElementById('crono-v2').style.display=v==='v2'?'':'none';
        document.querySelectorAll('.crono-view-tab').forEach((b,i)=>b.classList.toggle('activo',(i===0&&v==='v2')||(i===1&&v==='v1')));
        window.scrollTo(0,0);
      };

      if(admin) bindAdminEvents(datos,trimActivo,build);
      if(admin) bindAdminEventsTimeline(datos,build);
      bindSlider();
      activarTooltipsSiglas(panel);
    }

    /* ─────────────────────────────────────────────────────────
       bindSlider — sincronización total:
         · Slider input  → mueve selector + actualiza colores
         · Click en fila → mueve slider + selector + abre detalle si hay evento
         · Drag selector → mueve slider + actualiza colores en tiempo real
    ───────────────────────────────────────────────────────── */
    function bindSlider(){
      const slider = document.getElementById('lt-slider');
      if(!slider) return;
      const TOTAL = 45;

      /* Calcula la semana más cercana dada una posición X relativa al rows-wrap */
      function xToSemana(x, rowEl) {
        const rect = rowEl.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
        return Math.round(ratio * (TOTAL - 1));
      }

      /* Aplica colores y textos sin re-render (solo DOM patches) */
      function applyColors(val){
        const t = semanaTrim(val);
        const p = palTrim(t);
        slider.style.setProperty('--lt-thumb', p.accent);
        slider.style.setProperty('--lt-track',  p.mid);
        slider.value = val;

        const valEl = document.querySelector('.lt-semana-val');
        if(valEl){
          let lbl = val===0?'Pre-gestación / captación':val<=13?`Semana ${val} · 1.° Trimestre`:val<=27?`Semana ${val} · 2.° Trimestre`:val<=40?`Semana ${val} · 3.° Trimestre`:val===41?'Semana 41 · Indicación de inducción':val===42?'Semana 42+ · Postérmino':val===43?'Control 7 días postparto':'Alta puerperal 42 días';
          valEl.textContent = lbl;
        }
        const badgeEl = document.querySelector('.lt-semana-trim-badge');
        if(badgeEl){ badgeEl.textContent = nombreTrim(t); badgeEl.style.background = p.tab; }

        const line = document.getElementById('lt-current-line');
        if(line){
          line.style.left       = `${(val/(TOTAL-1))*100}%`;
          line.style.background = p.accent;
          const lbl2 = line.querySelector('.lt-current-label');
          if(lbl2){ lbl2.textContent = `Sem. ${val<=42?val:val===43?'7d PP':'42d PP'}`; lbl2.style.background = p.accent; }
        }

        /* Actualizar marcador de semana actual en los dots */
        document.querySelectorAll('.lt-dot').forEach(d => d.classList.remove('lt-semana-actual-marker'));
        const cols = document.querySelectorAll('.lt-week-col');
        if(cols[val]){ const dot = cols[val].querySelector('.lt-dot'); if(dot) dot.classList.add('lt-semana-actual-marker'); }
      }

      /* ── 1. Slider → selector ── */
      slider.addEventListener('input', function(){
        semanaActual = parseInt(this.value);
        panel._semanaActual = semanaActual;
        applyColors(semanaActual);
      });

      /* Prevenir scroll vertical al arrastrar el slider horizontalmente en touch */
      let _tx=0, _ty=0;
      slider.addEventListener('touchstart', function(e){ _tx=e.touches[0].clientX; _ty=e.touches[0].clientY; }, {passive:true});
      slider.addEventListener('touchmove',  function(e){
        const dx=Math.abs(e.touches[0].clientX-_tx), dy=Math.abs(e.touches[0].clientY-_ty);
        if(dx>dy) e.preventDefault();
      }, {passive:false});

      /* ── 2. Click en columna de la línea de tiempo → mueve slider + selector ──
             _ltClickCol se define aquí para tener acceso al closure de semanaActual/eventoSel */
      window._ltClickCol = function(col, e){
        e && e.stopPropagation();
        const prevSemana = semanaActual;
        semanaActual = col;
        panel._semanaActual = col;

        // Si hay un evento en este punto → abre o cierra el detalle
        const hayEvento = !!EVENTOS_SEMANA[col];
        if(hayEvento){
          eventoSel = (eventoSel === col) ? null : col;
          panel._eventoSel = eventoSel;
          // Re-render completo de v2 para actualizar detalle + dots activos
          const v2 = document.getElementById('crono-v2');
          if(v2){
            v2.innerHTML = renderVista2(semanaActual, eventoSel, esAdminUser(), datos);
            bindSlider();
            activarTooltipsSiglas(v2);
            if(eventoSel!==null) setTimeout(()=>{ const d=document.getElementById('lt-detail-panel'); if(d) d.scrollIntoView({behavior:'smooth',block:'nearest'}); }, 80);
          }
        } else {
          // Sin evento: solo mover selector + slider, sin re-render
          applyColors(semanaActual);
        }
      };

      /* ── 3. Arrastrar el selector (línea vertical) → mueve slider en tiempo real ── */
      const line = document.getElementById('lt-current-line');
      const rowEl = document.getElementById('lt-weeks-row');
      if(line && rowEl){
        let dragging = false;

        function onDragMove(clientX){
          const val = xToSemana(clientX, rowEl);
          if(val !== semanaActual){
            semanaActual = val;
            panel._semanaActual = val;
            applyColors(val);
          }
        }

        /* Mouse */
        line.addEventListener('mousedown', function(e){
          dragging = true;
          e.preventDefault();
          document.body.style.userSelect = 'none';
          document.body.style.cursor = 'ew-resize';
        });
        document.addEventListener('mousemove', function(e){
          if(dragging) onDragMove(e.clientX);
        });
        document.addEventListener('mouseup', function(){
          if(dragging){ dragging=false; document.body.style.userSelect=''; document.body.style.cursor=''; }
        });

        /* Touch */
        line.addEventListener('touchstart', function(e){
          dragging = true;
          e.stopPropagation();
        }, {passive:true});
        document.addEventListener('touchmove', function(e){
          if(dragging){ onDragMove(e.touches[0].clientX); e.preventDefault(); }
        }, {passive:false});
        document.addEventListener('touchend', function(){
          dragging = false;
        });

        /* Click directo sobre la línea (sin arrastrar): abre detalle si hay evento */
        line.addEventListener('click', function(e){
          e.stopPropagation();
          const rowEl2 = document.getElementById('lt-weeks-row');
          if(!rowEl2) return;
          const val = xToSemana(e.clientX, rowEl2);
          if(EVENTOS_SEMANA[val]) window._ltClickCol(val, e);
        });

        /* También hacer clickeable cualquier punto de la fila (entre dots) */
        rowEl.addEventListener('click', function(e){
          // Solo si el click NO fue en un lt-week-col (esos ya tienen _ltClickCol)
          if(e.target.closest('.lt-week-col')) return;
          const val = xToSemana(e.clientX, rowEl);
          semanaActual = val;
          panel._semanaActual = val;
          applyColors(val);
        });
      }

      /* Aplicar colores iniciales */
      applyColors(semanaActual);
    }

    build();
  }

  /* ═══════════════════════════════════════════════════════
     ADMIN PANEL
  ═══════════════════════════════════════════════════════ */
  function renderAdminPanel(datos,trimActivo){
    const trim=datos.trimestres.find(t=>t.id===trimActivo)||datos.trimestres[0];
    return `<div id="crono-admin-panel" class="visible">
      <div class="crono-admin-title">⚙️ Panel de Administración — Cronología del Embarazo</div>
      <div class="crono-seed-info"><strong>📤 Primera carga a Firestore:</strong> Si la cronología no está guardada en Firestore, usá el botón de abajo para subir todos los datos completos.
        <div class="crono-admin-row" style="margin-top:.75rem">
          <button class="crono-btn-admin crono-btn-seed" id="crono-adm-seed-fs">📤 Subir datos iniciales a Firestore</button>
          <button class="crono-btn-admin crono-btn-neutral" id="crono-adm-check-fs">🔍 Verificar si ya existe en Firestore</button>
        </div>
      </div>
      <div class="crono-admin-field"><label>Trimestre a editar</label>
        <select id="crono-admin-trim-sel">${datos.trimestres.map(t=>`<option value="${t.id}" ${t.id===trimActivo?'selected':''}>${t.titulo} (${t.semanas})</option>`).join('')}</select>
      </div>
      <div class="crono-admin-section">
        <div class="crono-admin-section-header" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">▸ Datos del trimestre seleccionado</div>
        <div class="crono-admin-section-body" style="display:none">
          <div class="crono-admin-field"><label>Título</label><input id="crono-adm-trim-titulo" value="${escH(trim.titulo)}"></div>
          <div class="crono-admin-field"><label>Semanas</label><input id="crono-adm-trim-semanas" value="${escH(trim.semanas)}"></div>
          <div class="crono-admin-field"><label>Descripción</label><textarea id="crono-adm-trim-desc">${escH(trim.descripcion)}</textarea></div>
          <div class="crono-admin-field"><label>Color</label><select id="crono-adm-trim-color"><option value="rose" ${trim.color==='rose'?'selected':''}>Rosa (1.° trimestre)</option><option value="teal" ${trim.color==='teal'?'selected':''}>Verde (2.° trimestre)</option><option value="amber" ${trim.color==='amber'?'selected':''}>Ámbar (3.° trimestre)</option><option value="purple" ${trim.color==='purple'?'selected':''}>Violeta (Puerperio)</option></select></div>
          <button class="crono-btn-admin crono-btn-save" id="crono-adm-save-trim">💾 Aplicar cambios del trimestre</button>
        </div>
      </div>
      <div class="crono-admin-section">
        <div class="crono-admin-section-header" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">▸ Bloques / semanas (${trim.bloques.length})</div>
        <div class="crono-admin-section-body" id="crono-adm-bloques-body">
          ${trim.bloques.map((b,bi)=>renderBloqueEditor(b,bi,trim.bloques.length)).join('')}
          <div class="crono-admin-row"><button class="crono-btn-admin crono-btn-add" id="crono-adm-add-bloque">＋ Agregar bloque</button></div>
        </div>
      </div>
      <div style="margin-top:1rem;display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        <button class="crono-btn-admin crono-btn-save" id="crono-adm-save-all" style="font-size:.92rem;padding:10px 22px">☁️ Guardar TODO en Firestore</button>
        <span style="font-size:.75rem;color:#64748b">Los cambios se guardan en la nube y se aplican a todos los usuarios.</span>
      </div>
      <div id="crono-toast" class="crono-toast"></div>
    </div>`;
  }

  function renderBloqueEditor(bloque,bi,total){
    return `<div class="crono-admin-section" style="margin-bottom:.75rem">
      <div class="crono-admin-section-header" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
        ▸ Bloque ${bi+1}: ${escH(bloque.titulo)}
        <button class="crono-btn-admin crono-btn-del" onclick="event.stopPropagation();window._cronoDelBloque(${bi})" style="padding:3px 10px;font-size:.75rem">🗑 Eliminar</button>
      </div>
      <div class="crono-admin-section-body" style="display:none">
        <div class="crono-admin-field"><label>Semana / rango</label><input class="crono-adm-b-semana" data-bi="${bi}" value="${escH(bloque.semana)}"></div>
        <div class="crono-admin-field"><label>Título</label><input class="crono-adm-b-titulo" data-bi="${bi}" value="${escH(bloque.titulo)}"></div>
        <div class="crono-admin-field"><label>Texto de desarrollo</label><textarea class="crono-adm-b-desarrollo" data-bi="${bi}" rows="4">${escH(bloque.desarrollo)}</textarea></div>
        <div style="font-size:.7rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-top:.5rem;margin-bottom:.4rem">Estudios / controles</div>
        <div id="crono-adm-estudios-${bi}">${(bloque.estudios||[]).map((e,ei)=>renderEstudioEditor(bi,ei,e)).join('')}</div>
        <div class="crono-admin-row"><button class="crono-btn-admin crono-btn-add" onclick="window._cronoAddEstudio(${bi})" style="padding:5px 12px;font-size:.78rem">＋ Agregar estudio</button></div>
        <div class="crono-admin-row" style="margin-top:.75rem">
          <button class="crono-btn-admin crono-btn-neutral" onclick="window._cronoBloqueUp(${bi})" ${bi===0?'disabled':''}>↑ Subir</button>
          <button class="crono-btn-admin crono-btn-neutral" onclick="window._cronoBloqueDown(${bi})" ${bi===total-1?'disabled':''}>↓ Bajar</button>
        </div>
      </div>
    </div>`;
  }

  function renderEstudioEditor(bi,ei,e){
    return `<div class="crono-estudio-editor">
      <div class="crono-estudio-editor-header"><span class="crono-estudio-num">Estudio ${ei+1}</span><button class="crono-btn-admin crono-btn-del" onclick="window._cronoDelEstudio(${bi},${ei})" style="padding:2px 8px;font-size:.72rem">✕</button></div>
      <div class="crono-admin-field"><label>Nombre</label><input class="crono-adm-e-nombre" data-bi="${bi}" data-ei="${ei}" value="${escH(e.nombre||'')}"></div>
      <div class="crono-admin-field"><label>Detalle</label><textarea class="crono-adm-e-detalle" data-bi="${bi}" data-ei="${ei}" rows="2">${escH(e.detalle||'')}</textarea></div>
    </div>`;
  }

  /* ═══════════════════════════════════════════════════════
     ADMIN PANEL — LÍNEA DE TIEMPO
  ═══════════════════════════════════════════════════════ */
  function renderAdminPanelTimeline(datos){
    const eventos = datos.eventosSemana || EVENTOS_SEMANA_DEFAULT;
    const fetoInfo = datos.fetoInfo || FETO_INFO_DEFAULT;
    const TIPOS = ['consulta','ecografia','laboratorio','parto'];
    const TRIMS = [{id:'t1',label:'1.° Trimestre'},{id:'t2',label:'2.° Trimestre'},{id:'t3',label:'3.° Trimestre'},{id:'t4',label:'Puerperio'}];
    const eventosArr = Object.entries(eventos).sort((a,b)=>Number(a[0])-Number(b[0]));
    const fetoArr = Object.entries(fetoInfo).sort((a,b)=>Number(a[0])-Number(b[0]));

    return `<div id="crono-admin-lt-panel" class="visible" style="margin-top:2rem">
      <div class="crono-admin-title">⏱️ Administración — Línea de Tiempo</div>
      <div class="crono-admin-section">
        <div class="crono-admin-section-header" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">▸ Puntos de la línea de tiempo (${eventosArr.length} eventos)</div>
        <div class="crono-admin-section-body">
          ${eventosArr.map(([semStr,ev],idx)=>`
            <div class="crono-admin-section" style="margin-bottom:.75rem" id="crono-lt-ev-${idx}">
              <div class="crono-admin-section-header" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
                ▸ Sem. ${semStr} — ${escH(ev.label)} ${ev.icon||''}
                <button class="crono-btn-admin crono-btn-del" onclick="event.stopPropagation();window._ltDelEvento('${semStr}')" style="padding:3px 10px;font-size:.75rem">🗑</button>
              </div>
              <div class="crono-admin-section-body" style="display:none">
                <div class="crono-admin-field"><label>Semana (clave numérica)</label><input class="lt-adm-semana" data-orig="${semStr}" value="${semStr}" type="number" min="0" max="44"></div>
                <div class="crono-admin-field"><label>Etiqueta</label><input class="lt-adm-label" data-orig="${semStr}" value="${escH(ev.label||'')}"></div>
                <div class="crono-admin-field"><label>Ícono (emoji)</label><input class="lt-adm-icon" data-orig="${semStr}" value="${escH(ev.icon||'')}" style="max-width:80px"></div>
                <div class="crono-admin-field"><label>Tipo</label>
                  <select class="lt-adm-tipo" data-orig="${semStr}">
                    ${TIPOS.map(t=>`<option value="${t}" ${ev.tipo===t?'selected':''}>${t.charAt(0).toUpperCase()+t.slice(1)}</option>`).join('')}
                  </select>
                </div>
                <div class="crono-admin-field"><label>Trimestre</label>
                  <select class="lt-adm-trim" data-orig="${semStr}">
                    ${TRIMS.map(t=>`<option value="${t.id}" ${ev.trim===t.id?'selected':''}>${t.label}</option>`).join('')}
                  </select>
                </div>
                <div class="crono-admin-field"><label>Descripción / contexto clínico</label><textarea class="lt-adm-desc" data-orig="${semStr}" rows="3">${escH(ev.desc||'')}</textarea></div>
                <div style="font-size:.7rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin:.5rem 0 .4rem">Lista de estudios / controles</div>
                <div id="lt-adm-estudios-${semStr}">${(ev.estudios||[]).map((est,ei)=>renderEventoEstudioEditor(semStr,ei,est)).join('')}</div>
                <div class="crono-admin-row">
                  <button class="crono-btn-admin crono-btn-add" onclick="window._ltAddEstudio('${semStr}')" style="padding:5px 12px;font-size:.78rem">＋ Agregar estudio</button>
                </div>
              </div>
            </div>`).join('')}
          <div class="crono-admin-row" style="margin-top:.75rem">
            <button class="crono-btn-admin crono-btn-add" id="lt-adm-add-evento">＋ Agregar punto / evento</button>
          </div>
        </div>
      </div>
      <div class="crono-admin-section">
        <div class="crono-admin-section-header" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">▸ Desarrollo fetal por semana (${fetoArr.length} entradas)</div>
        <div class="crono-admin-section-body">
          ${fetoArr.map(([semStr,fi])=>`
            <div class="crono-admin-section" style="margin-bottom:.6rem">
              <div class="crono-admin-section-header" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
                ▸ Semana ${semStr}
                <button class="crono-btn-admin crono-btn-del" onclick="event.stopPropagation();window._ltDelFeto('${semStr}')" style="padding:3px 10px;font-size:.75rem">🗑</button>
              </div>
              <div class="crono-admin-section-body" style="display:none">
                <div style="display:grid;grid-template-columns:1fr 2fr;gap:.75rem">
                  <div class="crono-admin-field"><label>Peso aproximado</label><input class="lt-adm-feto-peso" data-sem="${semStr}" value="${escH(fi.peso||'')}"></div>
                  <div class="crono-admin-field"><label>Descripción del desarrollo</label><textarea class="lt-adm-feto-desc" data-sem="${semStr}" rows="2">${escH(fi.desc||'')}</textarea></div>
                </div>
              </div>
            </div>`).join('')}
          <div class="crono-admin-row" style="margin-top:.75rem">
            <button class="crono-btn-admin crono-btn-add" id="lt-adm-add-feto">＋ Agregar semana fetal</button>
          </div>
        </div>
      </div>
      <div style="margin-top:1rem;display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        <button class="crono-btn-admin crono-btn-save" id="lt-adm-save-all" style="font-size:.92rem;padding:10px 22px">☁️ Guardar Línea de Tiempo en Firestore</button>
        <span style="font-size:.75rem;color:#64748b">Los cambios se aplican a todos los usuarios.</span>
      </div>
    </div>`;
  }

  function renderEventoEstudioEditor(semStr, ei, est){
    return `<div class="crono-estudio-editor" id="lt-ev-est-${semStr}-${ei}">
      <div class="crono-estudio-editor-header"><span class="crono-estudio-num">Estudio ${ei+1}</span><button class="crono-btn-admin crono-btn-del" onclick="window._ltDelEstudio('${semStr}',${ei})" style="padding:2px 8px;font-size:.72rem">✕</button></div>
      <div class="crono-admin-field"><label>Texto del estudio</label><input class="lt-adm-est-txt" data-sem="${semStr}" data-ei="${ei}" value="${escH(est||'')}"></div>
    </div>`;
  }

  /* ── Tooltips automáticos: busca siglas en texto del panel y las envuelve en <abbr> ── */
  function activarTooltipsSiglas(raiz) {
    // Siglas ordenadas de más larga a más corta para evitar coincidencias parciales
    const siglas = Object.keys(GLOSARIO_MAP).sort((a,b) => b.length - a.length);
    // Regex global que matchea las siglas como palabras completas
    // Se arma una sola regex con alternativas para eficiencia
    const escapar = s => s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/-/g,'\\-');
    const pattern = new RegExp('(?<![<"\\/\\w])(' + siglas.map(escapar).join('|') + ')(?![\\w"])', 'g');

    // Nodos de texto dentro de los contenedores de desarrollo y detalle
    // Solo procesamos nodos de texto dentro de elementos específicos para no romper atributos HTML
    const selectores = [
      '.crono-dev-text',
      '.crono-estudio-detalle',
      '.crono-estudio-nombre',
      '.lt-feto-desc',
      '.lt-estudio-item',
      '.crono-check-items',
      '.lt-trim-desc-pill',
    ];

    selectores.forEach(sel => {
      raiz.querySelectorAll(sel).forEach(el => {
        wrapTextNodes(el, pattern);
      });
    });
  }

  function wrapTextNodes(el, pattern) {
    // Trabaja sobre nodos de texto directos e hijos recursivos
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    const nodosAReemplazar = [];
    let node;
    while ((node = walker.nextNode())) {
      // No procesar dentro de <abbr> ya creados ni dentro de atributos
      if (node.parentElement && node.parentElement.tagName === 'ABBR') continue;
      if (pattern.test(node.textContent)) nodosAReemplazar.push(node);
      pattern.lastIndex = 0;
    }
    nodosAReemplazar.forEach(nodo => {
      const texto = nodo.textContent;
      pattern.lastIndex = 0;
      if (!pattern.test(texto)) return;
      pattern.lastIndex = 0;
      const frag = document.createDocumentFragment();
      let ultimo = 0;
      let m;
      while ((m = pattern.exec(texto)) !== null) {
        const sigla = m[1];
        const def = GLOSARIO_MAP[sigla];
        if (!def) continue;
        if (m.index > ultimo) frag.appendChild(document.createTextNode(texto.slice(ultimo, m.index)));
        const abbr = document.createElement('abbr');
        abbr.className = 'crono-abbr';
        abbr.setAttribute('data-title', def);
        abbr.textContent = sigla;
        frag.appendChild(abbr);
        ultimo = m.index + sigla.length;
      }
      if (ultimo < texto.length) frag.appendChild(document.createTextNode(texto.slice(ultimo)));
      if (frag.childNodes.length > 0) nodo.parentNode.replaceChild(frag, nodo);
    });
  }

  function bindAdminEvents(datos,trimActivo,rebuild){
    function leerDOM(){
      const trim=datos.trimestres.find(t=>t.id===trimActivo);if(!trim)return;
      const f=id=>document.getElementById(id);
      if(f('crono-adm-trim-titulo'))trim.titulo=f('crono-adm-trim-titulo').value;
      if(f('crono-adm-trim-semanas'))trim.semanas=f('crono-adm-trim-semanas').value;
      if(f('crono-adm-trim-desc'))trim.descripcion=f('crono-adm-trim-desc').value;
      if(f('crono-adm-trim-color'))trim.color=f('crono-adm-trim-color').value;
      trim.bloques.forEach((bloque,bi)=>{
        const q=sel=>document.querySelector(sel);
        const bS=q(`.crono-adm-b-semana[data-bi="${bi}"]`);if(bS)bloque.semana=bS.value;
        const bT=q(`.crono-adm-b-titulo[data-bi="${bi}"]`);if(bT)bloque.titulo=bT.value;
        const bD=q(`.crono-adm-b-desarrollo[data-bi="${bi}"]`);if(bD)bloque.desarrollo=bD.value;
        (bloque.estudios||[]).forEach((e,ei)=>{
          const eN=q(`.crono-adm-e-nombre[data-bi="${bi}"][data-ei="${ei}"]`);if(eN)e.nombre=eN.value;
          const eD=q(`.crono-adm-e-detalle[data-bi="${bi}"][data-ei="${ei}"]`);if(eD)e.detalle=eD.value;
        });
      });
    }
    const trimSel=document.getElementById('crono-admin-trim-sel');
    if(trimSel)trimSel.addEventListener('change',function(){leerDOM();trimActivo=this.value;document.getElementById('cronologia-panel')._trimActivo=trimActivo;rebuild();});
    const btnSaveTrim=document.getElementById('crono-adm-save-trim');
    if(btnSaveTrim)btnSaveTrim.addEventListener('click',()=>{leerDOM();mostrarToast('✅ Cambios en memoria. Guardá en Firestore para persistirlos.');rebuild();});
    const btnAddBloque=document.getElementById('crono-adm-add-bloque');
    if(btnAddBloque)btnAddBloque.addEventListener('click',()=>{leerDOM();const trim=datos.trimestres.find(t=>t.id===trimActivo);if(!trim)return;trim.bloques.push({id:'b-'+Date.now(),semana:'Semanas X–Y',titulo:'Nuevo bloque',desarrollo:'Descripción del contexto clínico.',estudios:[]});rebuild();mostrarToast('Bloque agregado');});
    const btnSaveAll=document.getElementById('crono-adm-save-all');
    if(btnSaveAll)btnSaveAll.addEventListener('click',async function(){leerDOM();this.disabled=true;this.textContent='⏳ Guardando…';try{await guardarEnFirestore(datos);mostrarToast('☁️ ¡Guardado exitosamente en Firestore!');}catch(e){mostrarToast('❌ Error: '+e.message);}this.disabled=false;this.textContent='☁️ Guardar TODO en Firestore';rebuild();});
    const btnSeed=document.getElementById('crono-adm-seed-fs');
    if(btnSeed)btnSeed.addEventListener('click',async function(){if(!confirm('¿Subir los datos completos por defecto a Firestore?\nEsto sobreescribirá cualquier versión existente.'))return;this.disabled=true;this.textContent='⏳ Subiendo datos…';try{await guardarEnFirestore(datos);mostrarToast('✅ Datos subidos · Colección: '+FS_COLLECTION+' · Doc: '+FS_DOC_ID);}catch(e){mostrarToast('❌ Error al subir: '+e.message);}this.disabled=false;this.textContent='📤 Subir datos iniciales a Firestore';});
    const btnCheck=document.getElementById('crono-adm-check-fs');
    if(btnCheck)btnCheck.addEventListener('click',async function(){this.disabled=true;this.textContent='🔍 Verificando…';try{const d=await leerDatosFirestore();if(d)mostrarToast('✅ Firestore OK · '+(d.trimestres?d.trimestres.length:'?')+' secciones guardadas');else mostrarToast('⚠️ No hay datos en Firestore. Usá "Subir datos iniciales".');}catch(e){mostrarToast('❌ Error al verificar: '+e.message);}this.disabled=false;this.textContent='🔍 Verificar si ya existe en Firestore';});
    window._cronoDelBloque=function(bi){leerDOM();const trim=datos.trimestres.find(t=>t.id===trimActivo);if(!trim||!confirm('¿Eliminar este bloque?'))return;trim.bloques.splice(bi,1);rebuild();mostrarToast('Bloque eliminado');};
    window._cronoAddEstudio=function(bi){leerDOM();const trim=datos.trimestres.find(t=>t.id===trimActivo);if(!trim||!trim.bloques[bi])return;if(!trim.bloques[bi].estudios)trim.bloques[bi].estudios=[];trim.bloques[bi].estudios.push({nombre:'Nuevo estudio',detalle:'Descripción del estudio o control.'});rebuild();mostrarToast('Estudio agregado');};
    window._cronoDelEstudio=function(bi,ei){leerDOM();const trim=datos.trimestres.find(t=>t.id===trimActivo);if(!trim||!trim.bloques[bi])return;trim.bloques[bi].estudios.splice(ei,1);rebuild();mostrarToast('Estudio eliminado');};
    window._cronoBloqueUp=function(bi){leerDOM();const trim=datos.trimestres.find(t=>t.id===trimActivo);if(!trim||bi===0)return;[trim.bloques[bi-1],trim.bloques[bi]]=[trim.bloques[bi],trim.bloques[bi-1]];rebuild();};
    window._cronoBloqueDown=function(bi){leerDOM();const trim=datos.trimestres.find(t=>t.id===trimActivo);if(!trim||bi>=trim.bloques.length-1)return;[trim.bloques[bi+1],trim.bloques[bi]]=[trim.bloques[bi],trim.bloques[bi+1]];rebuild();};
  }

  function bindAdminEventsTimeline(datos, rebuild) {
    /* Leer todos los campos del editor de línea de tiempo al DOM actual */
    function leerDOMTimeline() {
      const nuevoEventos = {};
      // Leer cada evento por su semana original
      document.querySelectorAll('.lt-adm-label').forEach(inp => {
        const orig = inp.dataset.orig;
        const semNueva = parseInt(document.querySelector(`.lt-adm-semana[data-orig="${orig}"]`)?.value ?? orig);
        if(isNaN(semNueva)) return;
        const label = inp.value;
        const icon  = document.querySelector(`.lt-adm-icon[data-orig="${orig}"]`)?.value || '';
        const tipo  = document.querySelector(`.lt-adm-tipo[data-orig="${orig}"]`)?.value || 'consulta';
        const trim  = document.querySelector(`.lt-adm-trim[data-orig="${orig}"]`)?.value || 't1';
        const desc  = document.querySelector(`.lt-adm-desc[data-orig="${orig}"]`)?.value || '';
        // Estudios
        const estudios = [];
        document.querySelectorAll(`.lt-adm-est-txt[data-sem="${orig}"]`).forEach(e => { if(e.value.trim()) estudios.push(e.value.trim()); });
        nuevoEventos[semNueva] = {label, icon, tipo, trim, desc, estudios};
      });
      if(Object.keys(nuevoEventos).length) datos.eventosSemana = nuevoEventos;

      // Leer fetoInfo
      const nuevoFeto = {};
      document.querySelectorAll('.lt-adm-feto-peso').forEach(inp => {
        const sem = inp.dataset.sem;
        const peso = inp.value;
        const desc = document.querySelector(`.lt-adm-feto-desc[data-sem="${sem}"]`)?.value || '';
        nuevoFeto[sem] = {peso, desc};
      });
      if(Object.keys(nuevoFeto).length) datos.fetoInfo = nuevoFeto;
    }

    // Agregar evento nuevo
    const btnAddEvento = document.getElementById('lt-adm-add-evento');
    if(btnAddEvento) btnAddEvento.addEventListener('click', () => {
      leerDOMTimeline();
      if(!datos.eventosSemana) datos.eventosSemana = {...EVENTOS_SEMANA_DEFAULT};
      const semLibre = Math.max(0,...Object.keys(datos.eventosSemana).map(Number)) + 1;
      datos.eventosSemana[semLibre] = {label:'Nuevo evento',icon:'📋',tipo:'consulta',trim:'t1',desc:'Descripción del evento.',estudios:[]};
      rebuild(); mostrarToast('Evento agregado');
    });

    // Eliminar evento
    window._ltDelEvento = function(semStr) {
      leerDOMTimeline();
      if(!confirm('¿Eliminar este evento de la línea de tiempo?')) return;
      if(datos.eventosSemana) delete datos.eventosSemana[semStr];
      rebuild(); mostrarToast('Evento eliminado');
    };

    // Agregar estudio a un evento
    window._ltAddEstudio = function(semStr) {
      leerDOMTimeline();
      if(!datos.eventosSemana?.[semStr]) return;
      if(!datos.eventosSemana[semStr].estudios) datos.eventosSemana[semStr].estudios = [];
      datos.eventosSemana[semStr].estudios.push('Nuevo estudio');
      rebuild(); mostrarToast('Estudio agregado');
    };

    // Eliminar estudio de un evento
    window._ltDelEstudio = function(semStr, ei) {
      leerDOMTimeline();
      if(!datos.eventosSemana?.[semStr]?.estudios) return;
      datos.eventosSemana[semStr].estudios.splice(ei, 1);
      rebuild(); mostrarToast('Estudio eliminado');
    };

    // Agregar semana fetal
    const btnAddFeto = document.getElementById('lt-adm-add-feto');
    if(btnAddFeto) btnAddFeto.addEventListener('click', () => {
      leerDOMTimeline();
      if(!datos.fetoInfo) datos.fetoInfo = {...FETO_INFO_DEFAULT};
      const semLibre = Math.max(0,...Object.keys(datos.fetoInfo).map(Number)) + 2;
      datos.fetoInfo[semLibre] = {peso:'0 g', desc:'Descripción del desarrollo fetal.'};
      rebuild(); mostrarToast('Semana fetal agregada');
    });

    // Eliminar semana fetal
    window._ltDelFeto = function(semStr) {
      leerDOMTimeline();
      if(!confirm('¿Eliminar esta semana del desarrollo fetal?')) return;
      if(datos.fetoInfo) delete datos.fetoInfo[semStr];
      rebuild(); mostrarToast('Semana fetal eliminada');
    };

    // Guardar en Firestore
    const btnSave = document.getElementById('lt-adm-save-all');
    if(btnSave) btnSave.addEventListener('click', async function() {
      leerDOMTimeline();
      this.disabled = true; this.textContent = '⏳ Guardando…';
      try {
        await guardarEnFirestore(datos);
        mostrarToast('☁️ Línea de tiempo guardada en Firestore');
      } catch(e) { mostrarToast('❌ Error: '+e.message); }
      this.disabled = false; this.textContent = '☁️ Guardar Línea de Tiempo en Firestore';
      rebuild();
    });
  }

  /* ═══════════════════════════════════════════════════════
     FIREBASE
  ═══════════════════════════════════════════════════════ */
  function _getDb(){if(window._fbDb)return window._fbDb;const{getFirestore}=window.__firebase_firestore;const db=getFirestore();window._fbDb=db;return db;}
  async function leerDatosFirestore(){try{const{getDoc,doc}=window.__firebase_firestore;const snap=await getDoc(doc(_getDb(),FS_COLLECTION,FS_DOC_ID));if(snap.exists())return snap.data();}catch(e){console.warn('[Cronología] Firestore no disponible, usando datos por defecto:',e.message);}return null;}
  async function guardarEnFirestore(datos){const{setDoc,doc}=window.__firebase_firestore;await setDoc(doc(_getDb(),FS_COLLECTION,FS_DOC_ID),datos);}

  /* ═══════════════════════════════════════════════════════
     MOSTRAR / OCULTAR
  ═══════════════════════════════════════════════════════ */
  function mostrarCronologia(){
    document.getElementById('menu-principal')?.classList.add('oculto');
    document.querySelectorAll('.pagina-cuestionario').forEach(p=>p.classList.remove('activa'));
    document.querySelectorAll('.menu-principal[id$="-submenu"]').forEach(s=>s.style.display='none');
    const panel=document.getElementById('cronologia-panel');
    if(panel){panel.classList.add('activo');window.scrollTo(0,0);}
  }

  /* ═══════════════════════════════════════════════════════
     UTILIDADES
  ═══════════════════════════════════════════════════════ */
  function escH(str){return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function mostrarToast(msg){let t=document.getElementById('crono-toast');if(!t){t=document.createElement('div');t.id='crono-toast';t.className='crono-toast';document.body.appendChild(t);}t.textContent=msg;t.classList.add('visible');clearTimeout(t._timeout);t._timeout=setTimeout(()=>t.classList.remove('visible'),3200);}

  /* ═══════════════════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════════════════ */
  function init(){
    inyectarEstilos();
    if(!document.getElementById('cronologia-panel')){const div=document.createElement('div');div.id='cronologia-panel';document.body.insertBefore(div,document.body.firstChild);}
    window.mostrarCronologiaEmbarazo=function(){
      leerDatosFirestore().then(datosFs=>{
        const d=datosFs||JSON.parse(JSON.stringify(DATOS_DEFAULT));
        // Asegurar que eventosSemana y fetoInfo estén presentes
        if(!d.eventosSemana) d.eventosSemana = JSON.parse(JSON.stringify(EVENTOS_SEMANA_DEFAULT));
        if(!d.fetoInfo) d.fetoInfo = JSON.parse(JSON.stringify(FETO_INFO_DEFAULT));
        window._cronoData=d;try{window._fbDb=_getDb();}catch(_){}
        mostrarCronologia();renderCronologia(d);
      });
    };
    document.addEventListener('fb:usuarioAprobadoActivo',function(){
      const panel=document.getElementById('cronologia-panel');
      if(panel&&panel.classList.contains('activo')&&window._cronoData)renderCronologia(window._cronoData);
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();

})();
