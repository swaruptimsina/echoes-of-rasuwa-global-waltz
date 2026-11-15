export type SupportedLocale = 'en' | 'ne' | 'es';

export interface LocaleStrings {
  localeCode: SupportedLocale;
  languageLabel: string;
  draftDisclaimer: string | null;
  challengeBadge: string;
  heroSubtitle: string;
  door1Title: string;
  door1Subtitle: string;
  door1Cta: string;
  door2Title: string;
  door2Subtitle: string;
  door2Cta: string;
  door3Title: string;
  door3Subtitle: string;
  door3Cta: string;
  sar101Button: string;
  resourcesButton: string;
  waltzMotifNote: string;
  communitySmsNote: string;
}

export const TRANSLATIONS: Record<SupportedLocale, LocaleStrings> = {
  en: {
    localeCode: 'en',
    languageLabel: 'English',
    draftDisclaimer: null,
    challengeBadge: '2026 NASA SPACE APPS CHALLENGE // DANCING WITH THE SARs',
    heroSubtitle:
      'Simple Before/After Space Radar Checker, 8-Chapter Story Journey & 5-Town World Map',
    door1Title: 'OPTION 1 · 8-CHAPTER STORY MODE',
    door1Subtitle:
      'Follow Lali from Nepal to Alaska as she uses NASA space radar to spot hidden dangers.',
    door1Cta: 'PLAY 8-CHAPTER STORY',
    door2Title: 'OPTION 2 · REAL NASA SATELLITE CHECKER',
    door2Subtitle:
      'Look up real NASA satellite scans, slide Before/After maps, and measure ground shifts.',
    door2Cta: 'OPEN SATELLITE CHECKER',
    door3Title: 'OPTION 3 · TOWN EXPLORATION & 6-STEP PHOTO GUIDE',
    door3Subtitle:
      'Walk around 5 towns in 2D pixel art or walk through our simple 6-step NASA photo guide.',
    door3Cta: 'START GUIDED EVIDENCE TRAIL',
    sar101Button: 'How Radar Works (Simple Guide)',
    resourcesButton: 'NASA & Space Links',
    waltzMotifNote: '12-Day Satellite Cycle',
    communitySmsNote: 'Learning simulation only · Bilingual Nepali / Tamang / English SMS drill',
  },
  ne: {
    localeCode: 'ne',
    languageLabel: 'नेपाली (Draft)',
    draftDisclaimer:
      'सूचना: यो नेपाली अनुवाद रसुवा केस-स्टडीको पहुँचका लागि तयार पारिएको मेशिन-सहायता प्राप्त मस्यौदा (Machine-Assisted Draft) हो। वैज्ञानिक शब्दावलीका लागि अङ्ग्रेजी मूल पाठ हेर्नुहोस्।',
    challengeBadge: '२०२६ नासा स्पेस एप्स च्यालेन्ज // सिन्थेटिक एपर्चर रडार (SAR) अभियान',
    heroSubtitle:
      'बहु-कालीन SAR विश्लेषण कार्यशाला, ८-चरण कथा मोड र रसुवा–त्रिशूली सहित ५-क्षेत्रीय भू-अभियान',
    door1Title: 'ढोका १ · ८-चरण वैज्ञानिक कथा (Story Mode)',
    door1Subtitle:
      'रसुवा गल्छीदेखि हबर्ड हिमनदीसम्मको वास्तविक नासा सन्दर्भ र डेटा पासपोर्ट सहितको अन्तरक्रियात्मक कथा।',
    door1Cta: '८-चरण कथा र ध्वनि खोल्नुहोस्',
    door2Title: 'ढोका २ · SAR विश्लेषक कार्यशाला (Analyst Workbench)',
    door2Subtitle:
      'NASA CMR ग्रान्युल, dB परिवर्तन पहिचान, स्थिर-क्षेत्र क्यालिब्रेसन र InSAR लाइन-अफ-साइट प्रोफाइल।',
    door2Cta: 'विश्लेषक कार्यशाला खोल्नुहोस्',
    door3Title: 'ढोका ३ · भू-अभियान र निर्णायक पथ (Field Expedition)',
    door3Subtitle:
      '५-क्षेत्रीय पिक्सेल अभियान र ६०-सेकेन्ड निर्णायक प्रमाण पथ (Judge Evidence Trail)।',
    door3Cta: 'START GUIDED EVIDENCE TRAIL',
    sar101Button: 'SAR १०१ · ध्रुवीकरण र सेन्सर तुलना',
    resourcesButton: 'आधिकारिक NASA / CSA / CONAE स्रोतहरू',
    waltzMotifNote: '१२-दिने कक्षीय पुनरावृत्ति लय',
    communitySmsNote: 'सिकाइ अभ्यास मात्र · नेपाली / तामाङ / अङ्ग्रेजी सामुदायिक सन्देश मस्यौदा',
  },
  es: {
    localeCode: 'es',
    languageLabel: 'Español (Borrador)',
    draftDisclaimer:
      'AVISO: Esta traducción al español es un borrador asistido por máquina (Machine-Assisted Draft) alineado con la capacitación bilingüe NASA ARSET y CONAE SAOCOM.',
    challengeBadge: 'NASA SPACE APPS CHALLENGE 2026 // BAILANDO CON LOS SAR',
    heroSubtitle:
      'Banco de Trabajo Analítico SAR Multitemporal, Narrativa en 8 Actos y Expedición de Campo en 5 Biomas',
    door1Title: 'PUERTA 1 · MODO HISTORIA (8 ACTOS)',
    door1Subtitle:
      'Recorrido guiado desde el desfiladero de Rasuwa hasta el glaciar Hubbard con DataPassports y sonificación de series temporales.',
    door1Cta: 'ABRIR HISTORIA Y SONIFICACIÓN',
    door2Title: 'PUERTA 2 · BANCO DE TRABAJO ANALÍTICO SAR',
    door2Subtitle:
      'Gránulos reales NASA CMR, detección de cambios log-ratio en dB, calibración ROI estable y transectos InSAR LOS.',
    door2Cta: 'ABRIR BANCO DE TRABAJO SAR',
    door3Title: 'PUERTA 3 · EXPEDICIÓN DE CAMPO Y RUTA DEL JURADO',
    door3Subtitle:
      'Campaña interactiva en 5 regiones (incluyendo el Pantanal y los Andes/Himalaya) y ruta guiada de 60 segundos.',
    door3Cta: 'START GUIDED EVIDENCE TRAIL',
    sar101Button: 'SAR 101 · Polarización y Rosetta de Sensores',
    resourcesButton: 'Recursos Oficiales NASA / CSA / CONAE',
    waltzMotifNote: 'Cadencia Orbital de 12 Días · Vals del Radar',
    communitySmsNote: 'Solo simulación educativa · Borrador de aviso comunitario bilingüe',
  },
};
