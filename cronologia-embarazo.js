/* ══════════════════════════════════════════════════════════════════
   cronologia-embarazo.js  V1
   Módulo independiente — depende de script.js (Firebase ya inicializado)
   Novedades v2.0:
   · Captación temprana < semana 10
   · Ecografía temprana semana 6–10 (latido + saco gestacional)
   · Consulta preanestésica preparto
   · Consultas semanales desde semana 36 + signos de parto
   · Prequirúrgico si cesárea planificada
   · Sección Puerperio completa (7 días y 42 días)
   · Resumen tipo checklist al pie
   · Botón admin "Subir datos iniciales a Firestore" (primera carga)
   · Botón admin "Verificar si ya existe en Firestore"
   Novedades v2.1:
   · Educación sobre signos premonitorios de trabajo de parto (bloque sem. 36–40)
   · Actualización checklist 3.° trimestre
   · Firestore: colección /meta, doc cronologiaEmbarazo (igual que calendarioVacunacion)
   ══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const FS_COLLECTION = 'meta';
  const FS_DOC_ID     = 'cronologiaEmbarazo';

  /* ═══════════════════════════════════════════════════════
     DATOS COMPLETOS POR DEFECTO
  ═══════════════════════════════════════════════════════ */
  const DATOS_DEFAULT = {
    trimestres: [

      /* ── PRIMER TRIMESTRE ── */
      {
        id: 't1',
        titulo: 'Primer Trimestre',
        semanas: 'Semanas 1–13+6',
        descripcion: 'Período de organogénesis. El embrión pasa de una sola célula a un feto con todos los órganos formados. Captación ideal antes de la semana 10. Fase de máxima vulnerabilidad teratogénica.',
        color: 'rose',
        bloques: [
          {
            id: 'b1-0',
            semana: '< Semana 10',
            titulo: 'Captación temprana · Primera consulta prenatal',
            desarrollo: 'El objetivo es captar a la embarazada antes de la semana 10. Se realiza anamnesis completa, cálculo de la FPP (Regla de Naegele: FUM + 280 días), toma de presión arterial basal, peso, talla e IMC pregestacional. Se completa la Historia Clínica Perinatal (HCP — CLAP/OPS) y se entrega el carnet perinatal. Se indica ácido fólico 0,4 mg/día (dosis 4–5 mg si antecedentes de defectos del tubo neural o fármacos antagonistas del folato).',
            estudios: [
              { nombre: 'Historia clínica perinatal (HCP — CLAP/OPS)', detalle: 'Registro de antecedentes personales, familiares, gineco-obstétricos, tóxicos y sociales.' },
              { nombre: 'Cálculo de FPP', detalle: 'Regla de Naegele (FUM + 280 días). Se ajusta con ecografía del 1.° trimestre si hay discrepancia > 7 días.' },
              { nombre: 'Peso, talla e IMC pregestacional', detalle: 'Ganancia ponderal esperada (IOM 2009): bajo peso > 12–18 kg · normopeso 11,5–16 kg · sobrepeso 7–11,5 kg · obesidad 5–9 kg.' },
              { nombre: 'Presión arterial basal', detalle: 'Valor de referencia para detección de HTA gestacional o preeclampsia.' },
              { nombre: 'Ácido fólico (suplementación)', detalle: '0,4 mg/día iniciado idealmente periconcepcional. Previene defectos del tubo neural. Dosis 4–5 mg si antecedentes o uso de fármacos antagonistas del folato (valproato, metotrexato).' }
            ]
          },
          {
            id: 'b1-1',
            semana: 'Semanas 6–10',
            titulo: 'Ecografía temprana · Latido + saco gestacional',
            desarrollo: 'Ovulación y fecundación (día 14 del ciclo). El cigoto se divide formando una mórula y luego un blastocisto que se implanta entre los días 6–10. Comienza la producción de β-hCG. La ecografía transvaginal temprana (sem. 6–10) confirma la vitalidad embrionaria (latido cardíaco), la localización intrauterina del saco gestacional, descarta embarazo ectópico y ajusta la edad gestacional.',
            estudios: [
              { nombre: 'Ecografía transvaginal temprana (sem. 6–10)', detalle: 'Confirma latido embrionario, localización del saco gestacional, número de embriones. Descarta embarazo ectópico. Permite ajuste de FPP por LCC cuando la FUM es incierta.' }
            ]
          },
          {
            id: 'b1-2',
            semana: 'Semanas 6–8',
            titulo: 'Organogénesis activa · Laboratorio inicial obligatorio',
            desarrollo: 'Se esbozan corazón, encéfalo, ojos, oídos, extremidades y tubo digestivo. Al final de la semana 8 existe la forma humana reconocible. LCC ≈ 16 mm. FC fetal: 170–180 lpm. Período de máxima vulnerabilidad a teratógenos.',
            estudios: [
              { nombre: 'Hemograma completo + Grupo/Rh', detalle: 'Diagnóstico de anemia (Hb < 11 g/dL). Suplementación con hierro elemental 30–60 mg/día desde el 1.° control. Grupo sanguíneo y factor Rh para plan de inmunoprofilaxis.' },
              { nombre: 'PAI (Prueba de antiglobulina indirecta)', detalle: 'En todas las embarazadas. Si Rh negativa: solicitar Rh y PAI al padre para plan de inmunoprofilaxis con anti-D.' },
              { nombre: 'VDRL / RPR (sífilis)', detalle: 'Obligatoria. Repetir en sem. 28 y al parto. Detección y tratamiento previenen sífilis congénita (penicilina G benzatínica).' },
              { nombre: 'VIH (ELISA)', detalle: 'Previa consejería y consentimiento. Repetir en sem. 34 y al parto. Obligatorio en Argentina (Ley 23.798). Profilaxis ARV reduce la transmisión vertical a < 1%.' },
              { nombre: 'Toxoplasmosis (IgG + IgM)', detalle: 'Si IgG negativa: repetir cada 2 meses + educación (evitar carne cruda, gatos, tierra). Si IgM positiva: confirmar con avidez de IgG.' },
              { nombre: 'Hepatitis B (HBsAg)', detalle: 'Si positivo: vacunación neonatal + inmunoglobulina en las primeras 12 hs. Repetir en sem. 28 si negativo inicial.' },
              { nombre: 'Chagas (serología IgG x 2 técnicas)', detalle: 'Endémico en Argentina. Si positivo: seguimiento neonatal con PCR en sangre de cordón y a las 6 semanas.' },
              { nombre: 'Rubéola (IgG)', detalle: 'Si negativa: no vacunar durante el embarazo (contraindicada). Registrar para vacunación postparto antes del alta.' },
              { nombre: 'Glucemia en ayunas', detalle: 'Diagnóstico de DM pregestacional (≥ 126 mg/dL) o alto riesgo de DMG.' },
              { nombre: 'TSH (función tiroidea)', detalle: 'Objetivo TSH < 2,5 mUI/L en el 1.° trimestre. Hipotiroidismo subclínico asociado a menor CI fetal y mayor riesgo de pérdida gestacional.' },
              { nombre: 'Urocultivo + sedimento urinario', detalle: 'Bacteriuria asintomática: tratar con antibiótico según cultivo para prevenir pielonefritis y parto pretérmino.' },
              { nombre: 'Papanicolaou (si no actualizado)', detalle: 'Seguro en el embarazo. Cribado de cáncer cervical. Ideal si no tiene PAP del último año.' }
            ]
          },
          {
            id: 'b1-3',
            semana: 'Semanas 11–13+6',
            titulo: 'Ecografía del 1.° trimestre · Cribado combinado de aneuploidías',
            desarrollo: 'LCC: 45–84 mm. El feto puede tragar y hace movimientos respiratorios. La translucencia nucal (TN) alcanza su máximo valor detectable. La placenta es funcionalmente activa. Ventana del cribado combinado: mayor sensibilidad para síndrome de Down y otras aneuploidías. También se calcula el riesgo de preeclampsia precoz.',
            estudios: [
              { nombre: 'Translucencia nucal (TN)', detalle: 'Medición estandarizada (certificación FMF). TN ≥ 3 mm asociada a aneuploidías (T21, T18, T13) y cardiopatías congénitas mayores.' },
              { nombre: 'Hueso nasal (HN)', detalle: 'Ausente en ~65% de los fetos con T21. Mejora la tasa de detección del cribado combinado.' },
              { nombre: 'Ductus venoso (DV) e índice de pulsatilidad tricuspídeo', detalle: 'Marcadores secundarios de aneuploidía y cardiopatía.' },
              { nombre: 'PAPP-A y β-hCG libre en suero materno', detalle: 'Bioquímica del cribado combinado. PAPP-A baja (< p5): también marcador de RCF y preeclampsia.' },
              { nombre: 'Velocimetría Doppler de arterias uterinas', detalle: 'IP medio ≥ p95 + PAPP-A baja + HTA materna: calcula riesgo de preeclampsia precoz. Indica profilaxis con aspirina 100–150 mg/día desde sem. 11–16 (NNT 7–8, evidencia nivel I).' },
              { nombre: 'ADN fetal libre en sangre materna (cfDNA / NIFTY)', detalle: 'Disponible en sistema privado. Sensibilidad > 99% para T21. Opción no invasiva antes de amniocentesis en riesgo intermedio-alto.' },
              { nombre: 'Biopsia corial (si indicado)', detalle: 'Semanas 11–14. Diagnóstico citogenético definitivo en alto riesgo (> 1/270). Alternativa a amniocentesis en 1.° trimestre.' },
              { nombre: 'Vacuna dTpa (doble bacteriana acelular)', detalle: 'Si no recibida en embarazo previo, preferentemente sem. 20–28. Genera inmunidad pasiva neonatal contra tos convulsa (coqueluche).' }
            ]
          }
        ]
      },

      /* ── SEGUNDO TRIMESTRE ── */
      {
        id: 't2',
        titulo: 'Segundo Trimestre',
        semanas: 'Semanas 14–27+6',
        descripcion: 'Período de crecimiento y maduración orgánica. El feto alcanza viabilidad extrauterina al final del trimestre (sem. 24–25). Ventana clave para detección de anomalías estructurales en la ecografía morfológica. Controles mensuales: altura uterina, latido fetal y presión arterial.',
        color: 'teal',
        bloques: [
          {
            id: 'b2-1',
            semana: 'Semanas 14–17',
            titulo: 'Movimientos fetales · Control clínico mensual',
            desarrollo: 'El feto percibe luz, sonido y sabores. La piel es delgada y translúcida (cubierta por lanugo). Los movimientos fetales percibidos por la madre (quieks) comienzan entre las semanas 16–20, antes en multíparas. El sexo es determinable por ecografía. Los controles obstétricos son mensuales: altura uterina (≈ semanas de gestación ± 3 cm), latido fetal (FCF 110–160 lpm) y presión arterial materna.',
            estudios: [
              { nombre: 'Altura uterina (AU)', detalle: 'En cm, debe aproximarse a las semanas de gestación ± 3 cm (Curva FASGO argentinizada). AU < p10 o discordancia > 4 cm → ecografía de crecimiento.' },
              { nombre: 'Auscultación de FCF (Doppler portátil)', detalle: 'Verificación de vitalidad fetal en cada consulta. Normal: 110–160 lpm.' },
              { nombre: 'Test de Coombs indirecto / PAI — Rh negativa', detalle: 'Si Rh negativa sin sensibilización previa: repetir PAI. Base para plan de inmunoprofilaxis con anti-D.' },
              { nombre: 'Amniocentesis (si indicada)', detalle: 'Semanas 15–18. Indicaciones: riesgo > 1/270 en cribado, cfDNA alterado, anomalía ecográfica, edad materna ≥ 38 años. Riesgo de pérdida: 0,1–0,3%.' }
            ]
          },
          {
            id: 'b2-2',
            semana: 'Semanas 18–22',
            titulo: 'Ecografía morfológica estructural completa',
            desarrollo: 'El feto pesa ≈ 300–450 g. La médula ósea produce eritrocitos. Las huellas dactilares están formadas. El vernix caseoso comienza a recubrir la piel. Los movimientos son vigorosos y regulares. La ecografía morfológica es el estudio más importante del embarazo: evalúa cerebro, corazón, riñones, extremidades, sexo fetal y entorno placentario.',
            estudios: [
              { nombre: 'Biometría fetal', detalle: 'DBP (diámetro biparietal), CC (circunferencia cefálica), CA (circunferencia abdominal), LF (longitud femoral). Peso fetal estimado (Hadlock IV). Percentil vs. INTERGROWTH-21st.' },
              { nombre: 'Anatomía craneal', detalle: 'Plano transventricular (atrios laterales ≤ 10 mm), transcerebeloso (vermis, cisterna magna, cerebelo), transtalamocavum.' },
              { nombre: 'Cara y cuello', detalle: 'Labio superior, órbitas, paladar en plano coronal. Descarta labio leporino e hipotelorismo.' },
              { nombre: 'Corazón fetal — screening cardíaco básico', detalle: 'Plano de 4 cámaras, tractos de salida izquierdo y derecho, arco aórtico, vena cava superior. Sensibilidad: 50–80% (operador-dependiente).' },
              { nombre: 'Tórax, abdomen y pelvis', detalle: 'Pulmones, diafragma, estómago (debe verse lleno), riñones (pelvis ≤ 7 mm), vejiga, intestino, pared abdominal.' },
              { nombre: 'Extremidades y columna', detalle: 'Longitud y ecogenicidad de huesos largos, postura de manos y pies. Columna en sagital, coronal y axial.' },
              { nombre: 'Placenta, líquido amniótico y cordón', detalle: 'Localización placentaria (si previa: eco TV sem. 28–32). ILA. Cordón: número de vasos (arteria única en 1% → cariotipo).' },
              { nombre: 'Longitud cervical (LC) transvaginal', detalle: 'LC < 25 mm antes de las 24 semanas: alto riesgo de parto pretérmino. Indicación de pesario o progesterona vaginal micronizada 200 mg/noche.' }
            ]
          },
          {
            id: 'b2-3',
            semana: 'Semanas 24–28',
            titulo: 'Viabilidad fetal · Cribado de diabetes gestacional · Inmunoprofilaxis Rh',
            desarrollo: 'Hito crítico: viabilidad extrauterina a partir de las 24–25 semanas con UCI neonatal. El surfactante pulmonar comienza a producirse. Los ojos ya están abiertos. El peso fetal ≈ 1.000 g. Las ondas de sueño-vigilia son detectables. Período de cribado universal de diabetes gestacional.',
            estudios: [
              { nombre: 'PTOG 75 g — Curva de tolerancia a la glucosa (DMG)', detalle: 'Gold standard. Semanas 24–28. DMG: basal ≥ 92 mg/dL, 1 hs ≥ 180 mg/dL, 2 hs ≥ 153 mg/dL (un solo valor basta). Asociación con macrosomía, distocia de hombros, hipoglucemia neonatal.' },
              { nombre: 'Hemograma (control)', detalle: 'Detección de anemia ferropénica o por dilución. Suplementar si Hb < 10,5 g/dL.' },
              { nombre: 'Repetición serologías: VDRL, VIH, Toxoplasmosis (si negativa)', detalle: 'Control de reinfecciones o seroconversión. Obligatorio según normativa nacional (sem. 28).' },
              { nombre: 'Test de Coombs indirecto (Rh negativa) — sem. 28', detalle: 'Si PAI negativa y sin sensibilización: Inmunoglobulina anti-D 300 μg IM a las 28 semanas (profilaxis antenatal estándar, FASGO).' },
              { nombre: 'Urocultivo (control)', detalle: 'Repetición. Alta tasa de bacteriuria intercurrente en el 2.° trimestre.' },
              { nombre: 'HBsAg (si negativa en 1.° T)', detalle: 'Repetición de Hepatitis B para control prenatal completo.' }
            ]
          }
        ]
      },

      /* ── TERCER TRIMESTRE ── */
      {
        id: 't3',
        titulo: 'Tercer Trimestre',
        semanas: 'Semanas 28–40+6',
        descripcion: 'Período de maduración y preparación para el parto. El feto acumula tejido adiposo, madura sus pulmones y adopta la presentación cefálica. Vigilancia intensificada del bienestar fetal. Consultas quincenales hasta sem. 36, luego semanales.',
        color: 'amber',
        bloques: [
          {
            id: 'b3-1',
            semana: 'Semanas 28–32',
            titulo: 'Maduración cerebral · Ecografía de crecimiento + Doppler',
            desarrollo: 'El cerebro duplica su peso entre las semanas 28–40. La girificación se acelera. Se mielinizan los fascículos sensoriales. El feto acumula grasa subcutánea (≈ 250 g/sem). Los pulmones producen suficiente surfactante desde las 34 semanas. El feto percibe y responde a la voz materna. Consultas cada 2–3 semanas.',
            estudios: [
              { nombre: 'Ecografía de crecimiento fetal (sem. 28–32)', detalle: 'Biometría, peso fetal estimado, ILA y localización placentaria. Detecta RCF: PFE < p10 o < p3 (INTERGROWTH-21st).' },
              { nombre: 'Doppler de arteria umbilical', detalle: 'Si RCF o factores de riesgo: IP de AU aumentado, diástole ausente o reversa indica compromiso placentario grave.' },
              { nombre: 'Doppler de arteria cerebral media (ACM)', detalle: 'IP disminuido (brain sparing) = signo tardío de hipoxia fetal. Razón cérebro-placentaria (ACM/AU) < 1: alto valor pronóstico.' },
              { nombre: 'Registro cardiotocográfico (NST)', detalle: 'A partir de las 28 semanas en embarazos de riesgo. Reactivo: ≥ 2 aceleraciones de ≥ 15 lpm × 15 seg en 20 minutos.' },
              { nombre: 'Corticoides antenatales (si amenaza de parto pretérmino)', detalle: 'Betametasona 12 mg IM c/24 hs × 2 dosis entre sem. 24–34+6. Aceleran maduración pulmonar, cerebral y GI fetal.' }
            ]
          },
          {
            id: 'b3-2',
            semana: 'Semanas 32–36',
            titulo: 'Ecografía crecimiento + Doppler · Cultivo GBS',
            desarrollo: 'Los pulmones están funcionalmente maduros a las 34–36 semanas. El peso fetal ≈ 2.200–2.500 g. Los testículos descienden al escroto (varón). La presentación cefálica se estabiliza. Las uñas alcanzan el borde de los dedos. El lanugo desaparece.',
            estudios: [
              { nombre: 'Ecografía crecimiento + Doppler (sem. 32–36)', detalle: 'Peso estimado, líquido amniótico (ILA), flujo uteroplacentario y presentación fetal. Detecta RCF tardía.' },
              { nombre: 'Cultivo recto-vaginal para EGB (Streptococcus agalactiae)', detalle: 'Semanas 35–37. Si positivo: profilaxis antibiótica intraparto con penicilina G IV. Primera causa de sepsis neonatal de inicio temprano. Sensibilidad del cultivo: 85–95%.' },
              { nombre: 'Hemograma y VDRL (control final)', detalle: 'Última evaluación preparto. VDRL obligatorio al momento del parto según normativa argentina.' },
              { nombre: 'VIH y Hepatitis B (control final)', detalle: 'Para profilaxis neonatal adecuada. Resultado obligatorio antes del parto.' },
              { nombre: 'Hemograma + Coombs indirecto (Rh negativa)', detalle: 'Evaluar anemia y programar inmunoglobulina anti-D si aún no recibida a las 28 semanas.' },
              { nombre: 'Valoración de presentación fetal (Maniobras de Leopold)', detalle: 'Desde sem. 34. Si presentación podálica ≥ 36 sem: ofrecer versión cefálica externa (VCE), éxito ≈ 50–60%.' }
            ]
          },
          {
            id: 'b3-3',
            semana: 'Semanas 36–40',
            titulo: 'Consultas semanales · Plan de parto · Preparación para el nacimiento',
            desarrollo: 'A las 37 semanas el embarazo es de término completo (FASGO/ACOG 2013). Peso fetal: 2.900–3.500 g. La placenta envejece fisiológicamente (calcificaciones Grannum III). La cabeza fetal encaja en la pelvis. El cuello uterino se madura progresivamente. Las consultas son semanales desde semana 36 y evalúan: posición fetal, signos premonitorios de parto (contracciones, rotura de membranas, show hemático), tensión arterial y signos de preeclampsia.',
            estudios: [
              { nombre: 'NST (cardiotocografía) semanal / bisemanal', detalle: 'Estándar en embarazos de riesgo. No reactivo: estimular con vibro-acústico; si persiste: BPP o Doppler de ductus venoso.' },
              { nombre: 'Perfil biofísico fetal (BPP)', detalle: 'Puntuación 0–10: NST + movimientos respiratorios + movimientos corporales + tono + ILA. ≤ 6 en 30 min → finalización según EG.' },
              { nombre: 'Score de Bishop (tacto vaginal)', detalle: 'Evalúa madurez cervical. ≥ 8: inducción directa con oxitocina. < 6: maduración previa con misoprostol vaginal o balón de Foley.' },
              { nombre: 'Consulta preanestésica preparto', detalle: 'Evaluación para cesárea programada o analgesia epidural. Incluye valoración de vía aérea, coagulograma, historia de cirugías previas y alergias.' },
              { nombre: 'Prequirúrgico si cesárea planificada', detalle: 'ECG, coagulograma completo, hemograma, grupo y factor. Estudio preoperatorio estándar para toda cesárea electiva.' },
              { nombre: 'Inducción del trabajo de parto (ITP) — sem. 41', detalle: 'Recomendada a las 41 semanas (FASGO/ACOG 2019): reduce mortalidad perinatal sin aumentar cesáreas. Opciones: misoprostol sublingual/vaginal, balón cervical, oxitocina.' }
            ]
          },
          {
            id: 'b3-4',
            semana: '≥ Semana 42',
            titulo: 'Embarazo postérmino · Indicación absoluta de finalización',
            desarrollo: 'A las 42 semanas la mortalidad perinatal se duplica respecto a las 40 semanas. Indicación absoluta de inducción o cesárea según condiciones materno-fetales. La placenta pierde capacidad de intercambio. Aumenta el riesgo de oligoamnios y aspiración de meconio.',
            estudios: [
              { nombre: 'NST diario + ILA (perfil biofísico modificado)', detalle: 'Vigilancia intensificada del bienestar fetal en postérmino. Cualquier alteración indica finalización urgente.' },
              { nombre: 'Doppler de ductus venoso', detalle: 'Ondas "a" ausentes o reversas: signo terminal de compromiso fetal. Indicación de finalización urgente.' },
              { nombre: 'Inducción o cesárea (indicación absoluta ≥ 42 sem)', detalle: 'Sin excepción: el embarazo postérmino tiene indicación de finalización. Se elige la vía según condiciones cervicales y presentación.' }
            ]
          }
        ]
      },

      /* ── PUERPERIO ── */
      {
        id: 't4',
        titulo: 'Puerperio',
        semanas: 'Días 0–42 postparto',
        descripcion: 'El puerperio comprende desde el alumbramiento hasta los 42 días postparto. Las guías argentinas establecen controles obligatorios a los 7 días y a los 42 días. Se evalúan cicatrización, lactancia, salud mental perinatal y presión arterial.',
        color: 'purple',
        bloques: [
          {
            id: 'b4-1',
            semana: 'Días 1–7 (Puerperio inmediato)',
            titulo: 'Alta hospitalaria · Control a los 7 días postparto',
            desarrollo: 'El puerperio inmediato comprende las primeras 24 horas (período crítico de hemorragia). El alta hospitalaria ocurre entre las 48–72 hs en parto vaginal y 72–96 hs en cesárea. Se verifican: involución uterina, loquios, cicatrización de episiotomía o herida, inicio de lactancia materna, signos vitales. El control a los 7 días evalúa presión arterial, involución uterina, lactancia y signos de infección o depresión postparto.',
            estudios: [
              { nombre: 'Control a los 7 días postparto', detalle: 'Presión arterial (detección de HTA postparto o preeclampsia tardía), involución uterina, loquios, cicatrización de herida/episiotomía, instauración de lactancia materna.' },
              { nombre: 'Pesquisa de depresión postparto (Escala de Edinburgh)', detalle: 'Se aplica entre la primera y segunda semana postparto. Puntaje ≥ 13: derivación a salud mental. Prevalencia en Argentina: 20–25%.' },
              { nombre: 'Lactancia materna', detalle: 'Apoyo y educación para lactancia exclusiva hasta los 6 meses. Verificar técnica de agarre. Contraindicaciones: VIH (en Argentina: lactancia contraindicada en madres VIH+), Chagas activo, galactosemia neonatal.' },
              { nombre: 'Inmunoglobulina anti-D postparto (Rh negativa)', detalle: 'Si el recién nacido es Rh positivo: 300 μg IM dentro de las 72 hs del parto. Previene sensibilización para embarazos futuros.' },
              { nombre: 'Hemograma postparto (si hemorragia o anemia)', detalle: 'Si Hb < 8 g/dL: valorar transfusión. Si 8–10 g/dL: hierro IV o suplementación oral intensiva.' }
            ]
          },
          {
            id: 'b4-2',
            semana: 'Día 42 (Puerperio tardío)',
            titulo: 'Control de los 42 días · Alta puerperal · Salud reproductiva',
            desarrollo: 'El control de los 42 días es el cierre del embarazo. Se evalúa el retorno a la normalidad fisiológica materna: involución uterina completa, reestablecimiento del eje hormonal, cicatrización, salud mental y planificación familiar. Es el momento ideal para actualizar vacunas y comenzar método anticonceptivo. Según las guías argentinas, este control es obligatorio.',
            estudios: [
              { nombre: 'Control de los 42 días (alta puerperal)', detalle: 'Examen general, PA, peso, involución uterina, cicatrización, evaluación de lactancia y pesquisa de depresión postparto.' },
              { nombre: 'Papanicolaou y colposcopía (si indicado)', detalle: 'Si el PAP del embarazo fue anormal: seguimiento colposcópico a los 42 días.' },
              { nombre: 'Método anticonceptivo postparto', detalle: 'Planificación familiar: DIU postparto (inserción inmediata o diferida), progesterona sola (compatible con lactancia), barrera. Estrógenos contraindicados durante lactancia.' },
              { nombre: 'Vacunación postparto', detalle: 'Rubéola (si serología negativa en embarazo): vacunar antes del alta o a los 42 días. Varicela si susceptible. No hay contraindicación con lactancia (excepto fiebre amarilla).' },
              { nombre: 'Screening de salud mental (Escala de Edinburgh — 2.° aplicación)', detalle: 'A los 42 días evalúa depresión postparto establecida. Derivación si puntaje ≥ 13.' },
              { nombre: 'Control del recién nacido (pesquisa neonatal)', detalle: 'En paralelo al control materno: pesquisa metabólica ampliada (PKU, hipotiroidismo, SCID, FQ y otras en Argentina), audición neonatal y vacunación neonatal (BCG, HB, Polio).' }
            ]
          }
        ]
      }
    ]
  };

  /* ═══════════════════════════════════════════════════════
     PALETA DE COLORES
  ═══════════════════════════════════════════════════════ */
  const PALETA = {
    rose:   { accent: '#c04060', light: '#f7e8ed', mid: '#e8a0b4', tab: 'linear-gradient(135deg,#c04060,#a03050)' },
    teal:   { accent: '#0f6e56', light: '#e1f5ee', mid: '#5dcaa5', tab: 'linear-gradient(135deg,#0f6e56,#0a5040)' },
    amber:  { accent: '#854f0b', light: '#faeeda', mid: '#ef9f27', tab: 'linear-gradient(135deg,#854f0b,#6a3f08)' },
    purple: { accent: '#5b21b6', light: '#ede9fe', mid: '#a78bfa', tab: 'linear-gradient(135deg,#5b21b6,#4c1d95)' }
  };

  /* Checklist resumen al pie */
  const CHECKLIST = [
    { label: '1.° Trimestre', col: '#c04060', items: 'Captación < sem. 10 · Eco temprana (latido) · Ácido fólico · Serologías completas · Translucencia nucal + cribado combinado (sem. 11–14)' },
    { label: '2.° Trimestre', col: '#0f6e56', items: 'Controles mensuales (AU, FCF, PA) · Morfológica completa (sem. 18–22) · PTOG 75 g (sem. 24–28) · Repetición serologías · Inmunoglobulina anti-D (sem. 28, si Rh–)' },
    { label: '3.° Trimestre', col: '#854f0b', items: 'Eco crecimiento + Doppler · Cultivo GBS (sem. 35–37) · Consultas semanales desde sem. 36 · NST · Consulta preanestésica · Prequirúrgico (si cesárea) · ITP a las 41 sem.' },
    { label: 'Puerperio',    col: '#5b21b6', items: 'Control a los 7 días · Control a los 42 días · Pesquisa depresión postparto (Edinburgh) · Anticoncepción · Vacunas (rubéola, varicela) · Anti-D si Rh–' }
  ];

  /* ═══════════════════════════════════════════════════════
     ESTILOS
  ═══════════════════════════════════════════════════════ */
  function inyectarEstilos() {
    if (document.getElementById('crono-styles')) return;
    const st = document.createElement('style');
    st.id = 'crono-styles';
    st.textContent = `
      #cronologia-panel { display:none; max-width:900px; margin:0 auto; padding:24px 20px 80px; font-family:'Segoe UI',system-ui,sans-serif; }
      #cronologia-panel.activo { display:block; }
      .crono-header { text-align:center; padding:1.5rem 0 1rem; border-bottom:1px solid #e2e8f0; margin-bottom:1.5rem; }
      .crono-header h1 { font-size:1.6rem; font-weight:700; color:#0f172a; letter-spacing:-.02em; }
      .crono-header p { font-size:.85rem; color:#64748b; margin-top:4px; }
      .crono-header-badge { display:inline-block; background:#005f73; color:#fff; font-size:.75rem; font-weight:600; padding:3px 12px; border-radius:40px; margin-bottom:.6rem; letter-spacing:.03em; }
      .crono-btn-volver { background:none; border:1px solid #cbd5e1; color:#475569; padding:7px 16px; border-radius:8px; cursor:pointer; font-size:.88rem; font-weight:500; transition:all .15s; display:inline-flex; align-items:center; gap:6px; margin-bottom:1rem; }
      .crono-btn-volver:hover { background:#f1f5f9; border-color:#94a3b8; color:#0f172a; }
      .crono-tabs { display:flex; gap:8px; justify-content:center; flex-wrap:wrap; margin-bottom:1.5rem; }
      .crono-tab { padding:8px 18px; border-radius:24px; border:none; font-size:.83rem; font-weight:600; cursor:pointer; color:#fff; letter-spacing:.01em; opacity:.55; transition:opacity .2s,transform .15s,box-shadow .2s; box-shadow:0 2px 8px rgba(0,0,0,.12); }
      .crono-tab:hover { opacity:.78; }
      .crono-tab.activo { opacity:1; transform:translateY(-1px); box-shadow:0 4px 14px rgba(0,0,0,.2); }
      .crono-trim-hero { border-radius:12px; padding:1.1rem 1.4rem; margin-bottom:1.5rem; border:1px solid; }
      .crono-trim-hero h2 { font-size:1.1rem; font-weight:700; margin-bottom:3px; }
      .crono-trim-hero p { font-size:.83rem; opacity:.85; line-height:1.55; }
      .crono-timeline { position:relative; padding-left:28px; }
      .crono-timeline::before { content:''; position:absolute; left:10px; top:0; bottom:0; width:1.5px; background:#e2e8f0; }
      .crono-bloque { position:relative; margin-bottom:1rem; }
      .crono-bloque-dot { position:absolute; left:-22px; top:16px; width:12px; height:12px; border-radius:50%; border:2.5px solid #fff; box-shadow:0 0 0 1px #d1d5db; z-index:1; }
      .crono-card { background:#fff; border:1px solid #e8ecf1; border-radius:10px; overflow:hidden; transition:box-shadow .2s; }
      .crono-card:hover { box-shadow:0 2px 12px rgba(0,0,0,.07); }
      .crono-card-header { display:flex; align-items:center; gap:10px; padding:.7rem 1rem; cursor:pointer; user-select:none; }
      .crono-badge { font-size:.72rem; font-weight:600; padding:3px 10px; border-radius:12px; white-space:nowrap; flex-shrink:0; }
      .crono-card-title { font-size:.9rem; font-weight:600; color:#1e293b; flex:1; line-height:1.35; }
      .crono-card-arrow { font-size:.8rem; color:#94a3b8; transition:transform .2s; flex-shrink:0; }
      .crono-card.abierta .crono-card-arrow { transform:rotate(90deg); }
      .crono-card-body { display:none; border-top:1px solid #f1f5f9; }
      .crono-card.abierta .crono-card-body { display:block; }
      .crono-card-body-inner { padding:.9rem 1rem; display:grid; gap:.85rem; }
      .crono-section-label { font-size:.7rem; font-weight:600; text-transform:uppercase; letter-spacing:.6px; color:#94a3b8; margin-bottom:.3rem; }
      .crono-dev-text { font-size:.875rem; line-height:1.65; color:#475569; }
      .crono-estudios { display:grid; gap:6px; }
      .crono-estudio-item { display:flex; gap:8px; align-items:flex-start; }
      .crono-estudio-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; margin-top:6px; }
      .crono-estudio-nombre { font-size:.875rem; font-weight:600; color:#1e293b; line-height:1.3; }
      .crono-estudio-detalle { font-size:.8rem; color:#64748b; line-height:1.5; margin-top:2px; }
      .crono-checklist { background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:1.25rem 1.5rem; margin-top:1.5rem; }
      .crono-checklist h3 { font-size:.95rem; font-weight:700; color:#0f172a; margin-bottom:1rem; display:flex; gap:8px; align-items:center; }
      .crono-checklist-grid { display:grid; gap:.75rem; }
      .crono-check-item { display:flex; gap:10px; align-items:flex-start; }
      .crono-check-dot { width:18px; height:18px; border-radius:50%; flex-shrink:0; display:flex; align-items:center; justify-content:center; color:#fff; font-size:.65rem; font-weight:700; margin-top:1px; }
      .crono-check-label { font-size:.8rem; font-weight:700; color:#0f172a; }
      .crono-check-items { font-size:.8rem; color:#475569; margin-top:2px; line-height:1.5; }
      .crono-checklist-note { margin-top:1rem; font-size:.73rem; color:#64748b; border-top:1px solid #e2e8f0; padding-top:.75rem; line-height:1.55; }
      .crono-footer-note { margin-top:1rem; padding:.8rem 1rem; background:#f8fafc; border-radius:10px; border:1px solid #e2e8f0; font-size:.75rem; color:#64748b; line-height:1.6; }
      #crono-admin-panel { display:none; margin-top:2.5rem; padding:1.5rem; background:#f8fafc; border:2px dashed #cbd5e1; border-radius:14px; }
      #crono-admin-panel.visible { display:block; }
      .crono-admin-title { font-size:1rem; font-weight:700; color:#0f172a; margin-bottom:1rem; display:flex; align-items:center; gap:8px; }
      .crono-admin-section { background:#fff; border:1px solid #e2e8f0; border-radius:10px; margin-bottom:1rem; overflow:hidden; }
      .crono-admin-section-header { padding:.75rem 1rem; font-weight:600; font-size:.88rem; color:#1e293b; background:#f1f5f9; border-bottom:1px solid #e2e8f0; display:flex; align-items:center; justify-content:space-between; cursor:pointer; }
      .crono-admin-section-body { padding:1rem; }
      .crono-admin-field { margin-bottom:.875rem; }
      .crono-admin-field label { display:block; font-size:.78rem; font-weight:600; color:#475569; margin-bottom:4px; text-transform:uppercase; letter-spacing:.04em; }
      .crono-admin-field input,.crono-admin-field textarea,.crono-admin-field select { width:100%; padding:8px 10px; border:1px solid #cbd5e1; border-radius:7px; font-size:.875rem; font-family:inherit; color:#0f172a; background:#fff; transition:border-color .15s; box-sizing:border-box; -webkit-user-select:text !important; user-select:text !important; }
      .crono-admin-field input:focus,.crono-admin-field textarea:focus,.crono-admin-field select:focus { outline:none; border-color:#38bdf8; box-shadow:0 0 0 3px rgba(56,189,248,.15); }
      .crono-admin-field textarea { resize:vertical; min-height:70px; }
      .crono-btn-admin { padding:8px 16px; border-radius:8px; border:none; font-size:.83rem; font-weight:600; cursor:pointer; transition:all .15s; display:inline-flex; align-items:center; gap:5px; }
      .crono-btn-save { background:#0891b2; color:#fff; } .crono-btn-save:hover { background:#0e7490; }
      .crono-btn-add  { background:#16a34a; color:#fff; } .crono-btn-add:hover  { background:#15803d; }
      .crono-btn-del  { background:#ef4444; color:#fff; } .crono-btn-del:hover  { background:#dc2626; }
      .crono-btn-seed { background:#7c3aed; color:#fff; } .crono-btn-seed:hover { background:#6d28d9; }
      .crono-btn-neutral { background:#e2e8f0; color:#334155; } .crono-btn-neutral:hover { background:#cbd5e1; }
      .crono-admin-row { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-top:.5rem; }
      .crono-estudio-editor { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:.75rem; margin-bottom:.5rem; }
      .crono-estudio-editor-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:.5rem; }
      .crono-estudio-num { font-size:.75rem; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:.04em; }
      .crono-seed-info { background:#ede9fe; border:1px solid #a78bfa; border-radius:10px; padding:.875rem 1rem; font-size:.8rem; color:#4c1d95; line-height:1.6; margin-bottom:1rem; }
      .crono-toast { position:fixed; bottom:70px; left:50%; transform:translateX(-50%); background:#0f172a; color:#f1f5f9; padding:10px 20px; border-radius:10px; font-size:.85rem; font-weight:500; z-index:99999; opacity:0; transition:opacity .25s; pointer-events:none; white-space:nowrap; }
      .crono-toast.visible { opacity:1; }
      li.crono-menu-li { padding-left:24px !important; position:relative; font-style:italic; color:#c04060 !important; border-left:2px solid #e8a0b4 !important; margin-left:4px; font-size:.88rem !important; }
      li.crono-menu-li::before { content:'└'; position:absolute; left:6px; color:#e8a0b4; font-style:normal; }
      li.crono-menu-li:hover { background:#f7e8ed !important; color:#a03050 !important; }
    `;
    document.head.appendChild(st);
  }

  /* ═══════════════════════════════════════════════════════
     RENDERIZADO
  ═══════════════════════════════════════════════════════ */
  function renderCronologia(datos) {
    const panel = document.getElementById('cronologia-panel');
    if (!panel) return;
    const esAdmin = () => window._fbCurrentUserData && window._fbCurrentUserData.role === 'admin';
    let trimActivo = panel._trimActivo || datos.trimestres[0].id;

    function build() {
      const trim = datos.trimestres.find(t => t.id === trimActivo) || datos.trimestres[0];
      const pal  = PALETA[trim.color] || PALETA.rose;

      panel.innerHTML = `
        <button class="crono-btn-volver" onclick="document.getElementById('cronologia-panel').classList.remove('activo'); window.volverAlMenu && window.volverAlMenu();">
          ← Volver al Menú Principal
        </button>
        <div class="crono-header">
          <div class="crono-header-badge">⚕️ Guías Ministerio de Salud Argentina · FASGO · SAO</div>
          <h1>📅 Control Prenatal</h1>
          <p>Línea de tiempo interactiva · Eventos clínicos + estudios por trimestre · Actualización 2025–2026</p>
        </div>
        <div class="crono-tabs">
          ${datos.trimestres.map(t => {
            const p = PALETA[t.color] || PALETA.rose;
            return `<button class="crono-tab${t.id === trimActivo ? ' activo' : ''}" style="background:${p.tab}" onclick="window._cronoSetTrim('${t.id}')">${t.titulo}</button>`;
          }).join('')}
        </div>
        <div class="crono-trim-hero" style="background:${pal.light};border-color:${pal.mid};color:${pal.accent}">
          <h2>${trim.titulo} <span style="font-weight:400;font-size:.85rem;opacity:.8">· ${trim.semanas}</span></h2>
          <p>${trim.descripcion}</p>
        </div>
        <div class="crono-timeline">
          ${trim.bloques.map(bloque => `
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
                    <div>
                      <div class="crono-section-label">Contexto clínico y desarrollo</div>
                      <div class="crono-dev-text">${bloque.desarrollo}</div>
                    </div>
                    ${bloque.estudios && bloque.estudios.length > 0 ? `
                    <div>
                      <div class="crono-section-label">Controles y estudios</div>
                      <div class="crono-estudios">
                        ${bloque.estudios.map(e => `
                          <div class="crono-estudio-item">
                            <div class="crono-estudio-dot" style="background:${pal.accent}"></div>
                            <div>
                              <div class="crono-estudio-nombre">${e.nombre}</div>
                              <div class="crono-estudio-detalle">${e.detalle}</div>
                            </div>
                          </div>`).join('')}
                      </div>
                    </div>` : ''}
                  </div>
                </div>
              </div>
            </div>`).join('')}
        </div>
        <div class="crono-checklist">
          <h3>✅ Resumen de controles mínimos (Argentina)</h3>
          <div class="crono-checklist-grid">
            ${CHECKLIST.map(c => `
              <div class="crono-check-item">
                <div class="crono-check-dot" style="background:${c.col}">✓</div>
                <div>
                  <div class="crono-check-label">${c.label}</div>
                  <div class="crono-check-items">${c.items}</div>
                </div>
              </div>`).join('')}
          </div>
          <div class="crono-checklist-note">⚕️ Basado en Guías de Obstetricia del Ministerio de Salud de la Nación y Consenso de Sociedades Científicas (actualización 2025–2026). Los embarazos de alto riesgo podrán requerir estudios adicionales y mayor frecuencia de controles.</div>
        </div>
        <div class="crono-footer-note"><strong>Referencias:</strong> Guías FASGO · SAO · Programa Nacional de Salud Perinatal MSAL Argentina · CLAP-OPS · ACOG Practice Bulletins. Cronología orientativa; el manejo individualizado puede diferir según protocolo institucional y condición clínica.</div>
        ${esAdmin() ? renderAdminPanel(datos, trimActivo) : ''}
      `;

      panel._trimActivo = trimActivo;
      window._cronoSetTrim = function(tid) { trimActivo = tid; panel._trimActivo = tid; build(); window.scrollTo(0,0); };
      window._cronoToggleCard = function(id) { const c = document.getElementById('crono-card-' + id); if (c) c.classList.toggle('abierta'); };
      if (esAdmin()) bindAdminEvents(datos, trimActivo, build);
    }
    build();
  }

  /* ─── Admin panel HTML ─── */
  function renderAdminPanel(datos, trimActivo) {
    const trim = datos.trimestres.find(t => t.id === trimActivo) || datos.trimestres[0];
    return `
      <div id="crono-admin-panel" class="visible">
        <div class="crono-admin-title">⚙️ Panel de Administración — Cronología del Embarazo</div>
        <div class="crono-seed-info">
          <strong>📤 Primera carga a Firestore:</strong> Si la cronología no está guardada en Firestore todavía, usá el botón de abajo para subir todos los datos completos. Solo es necesario una vez. Después podés editar desde este panel y guardar los cambios con "Guardar TODO en Firestore".
          <div class="crono-admin-row" style="margin-top:.75rem">
            <button class="crono-btn-admin crono-btn-seed" id="crono-adm-seed-fs">📤 Subir datos iniciales a Firestore</button>
            <button class="crono-btn-admin crono-btn-neutral" id="crono-adm-check-fs">🔍 Verificar si ya existe en Firestore</button>
          </div>
        </div>
        <div class="crono-admin-field">
          <label>Trimestre a editar</label>
          <select id="crono-admin-trim-sel">
            ${datos.trimestres.map(t => `<option value="${t.id}" ${t.id===trimActivo?'selected':''}>${t.titulo} (${t.semanas})</option>`).join('')}
          </select>
        </div>
        <div class="crono-admin-section">
          <div class="crono-admin-section-header" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">▸ Datos del trimestre seleccionado</div>
          <div class="crono-admin-section-body" style="display:none">
            <div class="crono-admin-field"><label>Título</label><input id="crono-adm-trim-titulo" value="${escH(trim.titulo)}"></div>
            <div class="crono-admin-field"><label>Semanas</label><input id="crono-adm-trim-semanas" value="${escH(trim.semanas)}"></div>
            <div class="crono-admin-field"><label>Descripción</label><textarea id="crono-adm-trim-desc">${escH(trim.descripcion)}</textarea></div>
            <div class="crono-admin-field"><label>Color</label>
              <select id="crono-adm-trim-color">
                <option value="rose"   ${trim.color==='rose'  ?'selected':''}>Rosa  (1.° trimestre)</option>
                <option value="teal"   ${trim.color==='teal'  ?'selected':''}>Verde  (2.° trimestre)</option>
                <option value="amber"  ${trim.color==='amber' ?'selected':''}>Ámbar  (3.° trimestre)</option>
                <option value="purple" ${trim.color==='purple'?'selected':''}>Violeta (Puerperio)</option>
              </select>
            </div>
            <button class="crono-btn-admin crono-btn-save" id="crono-adm-save-trim">💾 Aplicar cambios del trimestre</button>
          </div>
        </div>
        <div class="crono-admin-section">
          <div class="crono-admin-section-header" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">▸ Bloques / semanas (${trim.bloques.length})</div>
          <div class="crono-admin-section-body" id="crono-adm-bloques-body">
            ${trim.bloques.map((b, bi) => renderBloqueEditor(b, bi, trim.bloques.length)).join('')}
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

  function renderBloqueEditor(bloque, bi, total) {
    return `
      <div class="crono-admin-section" style="margin-bottom:.75rem">
        <div class="crono-admin-section-header" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
          ▸ Bloque ${bi+1}: ${escH(bloque.titulo)}
          <button class="crono-btn-admin crono-btn-del" onclick="event.stopPropagation();window._cronoDelBloque(${bi})" style="padding:3px 10px;font-size:.75rem">🗑 Eliminar</button>
        </div>
        <div class="crono-admin-section-body" style="display:none">
          <div class="crono-admin-field"><label>Semana / rango</label><input class="crono-adm-b-semana" data-bi="${bi}" value="${escH(bloque.semana)}"></div>
          <div class="crono-admin-field"><label>Título</label><input class="crono-adm-b-titulo" data-bi="${bi}" value="${escH(bloque.titulo)}"></div>
          <div class="crono-admin-field"><label>Texto de desarrollo</label><textarea class="crono-adm-b-desarrollo" data-bi="${bi}" rows="4">${escH(bloque.desarrollo)}</textarea></div>
          <div style="font-size:.7rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-top:.5rem;margin-bottom:.4rem">Estudios / controles</div>
          <div id="crono-adm-estudios-${bi}">
            ${(bloque.estudios||[]).map((e,ei) => renderEstudioEditor(bi,ei,e)).join('')}
          </div>
          <div class="crono-admin-row">
            <button class="crono-btn-admin crono-btn-add" onclick="window._cronoAddEstudio(${bi})" style="padding:5px 12px;font-size:.78rem">＋ Agregar estudio</button>
          </div>
          <div class="crono-admin-row" style="margin-top:.75rem">
            <button class="crono-btn-admin crono-btn-neutral" onclick="window._cronoBloqueUp(${bi})" ${bi===0?'disabled':''}>↑ Subir</button>
            <button class="crono-btn-admin crono-btn-neutral" onclick="window._cronoBloqueDown(${bi})" ${bi===total-1?'disabled':''}>↓ Bajar</button>
          </div>
        </div>
      </div>`;
  }

  function renderEstudioEditor(bi, ei, e) {
    return `
      <div class="crono-estudio-editor">
        <div class="crono-estudio-editor-header">
          <span class="crono-estudio-num">Estudio ${ei+1}</span>
          <button class="crono-btn-admin crono-btn-del" onclick="window._cronoDelEstudio(${bi},${ei})" style="padding:2px 8px;font-size:.72rem">✕</button>
        </div>
        <div class="crono-admin-field"><label>Nombre</label><input class="crono-adm-e-nombre" data-bi="${bi}" data-ei="${ei}" value="${escH(e.nombre||'')}"></div>
        <div class="crono-admin-field"><label>Detalle</label><textarea class="crono-adm-e-detalle" data-bi="${bi}" data-ei="${ei}" rows="2">${escH(e.detalle||'')}</textarea></div>
      </div>`;
  }

  /* ─── Bind admin events ─── */
  function bindAdminEvents(datos, trimActivo, rebuild) {
    function leerDOM() {
      const trim = datos.trimestres.find(t => t.id === trimActivo);
      if (!trim) return;
      const f = id => document.getElementById(id);
      if (f('crono-adm-trim-titulo'))  trim.titulo      = f('crono-adm-trim-titulo').value;
      if (f('crono-adm-trim-semanas')) trim.semanas     = f('crono-adm-trim-semanas').value;
      if (f('crono-adm-trim-desc'))    trim.descripcion = f('crono-adm-trim-desc').value;
      if (f('crono-adm-trim-color'))   trim.color       = f('crono-adm-trim-color').value;
      trim.bloques.forEach((bloque, bi) => {
        const q = sel => document.querySelector(sel);
        const bS = q(`.crono-adm-b-semana[data-bi="${bi}"]`);    if (bS) bloque.semana    = bS.value;
        const bT = q(`.crono-adm-b-titulo[data-bi="${bi}"]`);    if (bT) bloque.titulo    = bT.value;
        const bD = q(`.crono-adm-b-desarrollo[data-bi="${bi}"]`);if (bD) bloque.desarrollo= bD.value;
        (bloque.estudios||[]).forEach((e, ei) => {
          const eN = q(`.crono-adm-e-nombre[data-bi="${bi}"][data-ei="${ei}"]`);  if (eN) e.nombre  = eN.value;
          const eD = q(`.crono-adm-e-detalle[data-bi="${bi}"][data-ei="${ei}"]`); if (eD) e.detalle = eD.value;
        });
      });
    }

    const trimSel = document.getElementById('crono-admin-trim-sel');
    if (trimSel) trimSel.addEventListener('change', function() {
      leerDOM(); trimActivo = this.value;
      document.getElementById('cronologia-panel')._trimActivo = trimActivo; rebuild();
    });

    const btnSaveTrim = document.getElementById('crono-adm-save-trim');
    if (btnSaveTrim) btnSaveTrim.addEventListener('click', () => {
      leerDOM(); mostrarToast('✅ Cambios en memoria. Guardá en Firestore para persistirlos.'); rebuild();
    });

    const btnAddBloque = document.getElementById('crono-adm-add-bloque');
    if (btnAddBloque) btnAddBloque.addEventListener('click', () => {
      leerDOM();
      const trim = datos.trimestres.find(t => t.id === trimActivo);
      if (!trim) return;
      trim.bloques.push({ id: 'b-'+Date.now(), semana: 'Semanas X–Y', titulo: 'Nuevo bloque', desarrollo: 'Descripción del contexto clínico.', estudios: [] });
      rebuild(); mostrarToast('Bloque agregado');
    });

    const btnSaveAll = document.getElementById('crono-adm-save-all');
    if (btnSaveAll) btnSaveAll.addEventListener('click', async function() {
      leerDOM(); this.disabled = true; this.textContent = '⏳ Guardando…';
      try { await guardarEnFirestore(datos); mostrarToast('☁️ ¡Guardado exitosamente en Firestore!'); }
      catch(e) { mostrarToast('❌ Error: ' + e.message); }
      this.disabled = false; this.textContent = '☁️ Guardar TODO en Firestore'; rebuild();
    });

    const btnSeed = document.getElementById('crono-adm-seed-fs');
    if (btnSeed) btnSeed.addEventListener('click', async function() {
      if (!confirm('¿Subir los datos completos por defecto a Firestore?\nEsto sobreescribirá cualquier versión existente.')) return;
      this.disabled = true; this.textContent = '⏳ Subiendo datos…';
      try { await guardarEnFirestore(datos); mostrarToast('✅ Datos subidos · Colección: ' + FS_COLLECTION + ' · Doc: ' + FS_DOC_ID); }
      catch(e) { mostrarToast('❌ Error al subir: ' + e.message); }
      this.disabled = false; this.textContent = '📤 Subir datos iniciales a Firestore';
    });

    const btnCheck = document.getElementById('crono-adm-check-fs');
    if (btnCheck) btnCheck.addEventListener('click', async function() {
      this.disabled = true; this.textContent = '🔍 Verificando…';
      try {
        const d = await leerDatosFirestore();
        if (d) mostrarToast('✅ Firestore OK · ' + (d.trimestres ? d.trimestres.length : '?') + ' secciones guardadas');
        else mostrarToast('⚠️ No hay datos en Firestore. Usá "Subir datos iniciales".');
      } catch(e) { mostrarToast('❌ Error al verificar: ' + e.message); }
      this.disabled = false; this.textContent = '🔍 Verificar si ya existe en Firestore';
    });

    window._cronoDelBloque = function(bi) {
      leerDOM();
      const trim = datos.trimestres.find(t => t.id === trimActivo);
      if (!trim || !confirm('¿Eliminar este bloque?')) return;
      trim.bloques.splice(bi, 1); rebuild(); mostrarToast('Bloque eliminado');
    };
    window._cronoAddEstudio = function(bi) {
      leerDOM();
      const trim = datos.trimestres.find(t => t.id === trimActivo);
      if (!trim || !trim.bloques[bi]) return;
      if (!trim.bloques[bi].estudios) trim.bloques[bi].estudios = [];
      trim.bloques[bi].estudios.push({ nombre: 'Nuevo estudio', detalle: 'Descripción del estudio o control.' });
      rebuild(); mostrarToast('Estudio agregado');
    };
    window._cronoDelEstudio = function(bi, ei) {
      leerDOM();
      const trim = datos.trimestres.find(t => t.id === trimActivo);
      if (!trim || !trim.bloques[bi]) return;
      trim.bloques[bi].estudios.splice(ei, 1); rebuild(); mostrarToast('Estudio eliminado');
    };
    window._cronoBloqueUp = function(bi) {
      leerDOM();
      const trim = datos.trimestres.find(t => t.id === trimActivo);
      if (!trim || bi === 0) return;
      [trim.bloques[bi-1], trim.bloques[bi]] = [trim.bloques[bi], trim.bloques[bi-1]]; rebuild();
    };
    window._cronoBloqueDown = function(bi) {
      leerDOM();
      const trim = datos.trimestres.find(t => t.id === trimActivo);
      if (!trim || bi >= trim.bloques.length-1) return;
      [trim.bloques[bi+1], trim.bloques[bi]] = [trim.bloques[bi], trim.bloques[bi+1]]; rebuild();
    };
  }

  /* ═══════════════════════════════════════════════════════
     FIREBASE
  ═══════════════════════════════════════════════════════ */
  function _getDb() {
    if (window._fbDb) return window._fbDb;
    const { getFirestore } = window.__firebase_firestore;
    const db = getFirestore();
    window._fbDb = db;
    return db;
  }

  async function leerDatosFirestore() {
    try {
      const { getDoc, doc } = window.__firebase_firestore;
      const snap = await getDoc(doc(_getDb(), FS_COLLECTION, FS_DOC_ID));
      if (snap.exists()) return snap.data();
    } catch(e) {
      console.warn('[Cronología] Firestore no disponible, usando datos por defecto:', e.message);
    }
    return null;
  }

  async function guardarEnFirestore(datos) {
    const { setDoc, doc } = window.__firebase_firestore;
    await setDoc(doc(_getDb(), FS_COLLECTION, FS_DOC_ID), datos);
  }

  /* ═══════════════════════════════════════════════════════
     MOSTRAR / OCULTAR
  ═══════════════════════════════════════════════════════ */
  function mostrarCronologia() {
    document.getElementById('menu-principal')?.classList.add('oculto');
    document.querySelectorAll('.pagina-cuestionario').forEach(p => p.classList.remove('activa'));
    document.querySelectorAll('.menu-principal[id$="-submenu"]').forEach(s => s.style.display = 'none');
    const panel = document.getElementById('cronologia-panel');
    if (panel) { panel.classList.add('activo'); window.scrollTo(0, 0); }
  }

  /* ═══════════════════════════════════════════════════════
     UTILIDADES
  ═══════════════════════════════════════════════════════ */
  function escH(str) {
    return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function mostrarToast(msg) {
    let t = document.getElementById('crono-toast');
    if (!t) { t = document.createElement('div'); t.id='crono-toast'; t.className='crono-toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('visible');
    clearTimeout(t._timeout);
    t._timeout = setTimeout(() => t.classList.remove('visible'), 3200);
  }

  /* ═══════════════════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════════════════ */
  function init() {
    inyectarEstilos();
    if (!document.getElementById('cronologia-panel')) {
      const div = document.createElement('div'); div.id = 'cronologia-panel';
      document.body.insertBefore(div, document.body.firstChild);
    }
    window.mostrarCronologiaEmbarazo = function() {
      leerDatosFirestore().then(datos => {
        const d = datos || JSON.parse(JSON.stringify(DATOS_DEFAULT));
        window._cronoData = d;
        try { window._fbDb = _getDb(); } catch(_) {}
        mostrarCronologia();
        renderCronologia(d);
      });
    };
    document.addEventListener('fb:usuarioAprobadoActivo', function() {
      const panel = document.getElementById('cronologia-panel');
      if (panel && panel.classList.contains('activo') && window._cronoData) renderCronologia(window._cronoData);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
