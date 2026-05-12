export type LanguageCode = string;

export type LanguageConfig = {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  direction: 'ltr' | 'rtl';
  group: 'core' | 'local' | 'planned';
  regions: string[];
  aliases: string[];
  enabled: boolean;
  recommendedNext?: boolean;
};

export const defaultLanguage = 'en';

export const supportedLanguages: LanguageConfig[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', direction: 'ltr', group: 'core', regions: ['global'], aliases: ['eng'], enabled: true },
  { code: 'fr', label: 'French', nativeLabel: 'Francais', direction: 'ltr', group: 'core', regions: ['global', 'west-africa', 'central-africa'], aliases: ['francais'], enabled: true },
  { code: 'ar', label: 'Arabic', nativeLabel: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629', direction: 'rtl', group: 'core', regions: ['global', 'north-africa', 'east-africa'], aliases: ['arabic'], enabled: true },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Portugues', direction: 'ltr', group: 'core', regions: ['global', 'southern-africa', 'west-africa'], aliases: ['portugues'], enabled: true },
  { code: 'sw', label: 'Swahili', nativeLabel: 'Kiswahili', direction: 'ltr', group: 'local', regions: ['east-africa'], aliases: ['kiswahili'], enabled: true },
  { code: 'ha', label: 'Hausa', nativeLabel: 'Hausa', direction: 'ltr', group: 'planned', regions: ['west-africa'], aliases: ['hausa'], enabled: false, recommendedNext: true },
  { code: 'am', label: 'Amharic', nativeLabel: 'Amarigna', direction: 'ltr', group: 'planned', regions: ['east-africa'], aliases: ['amharic', 'amarigna'], enabled: false, recommendedNext: true },
  { code: 'yo', label: 'Yoruba', nativeLabel: 'Yoruba', direction: 'ltr', group: 'planned', regions: ['west-africa'], aliases: ['yoruba'], enabled: false, recommendedNext: true },
  { code: 'ig', label: 'Igbo', nativeLabel: 'Igbo', direction: 'ltr', group: 'planned', regions: ['west-africa'], aliases: ['igbo'], enabled: false },
  { code: 'so', label: 'Somali', nativeLabel: 'Soomaali', direction: 'ltr', group: 'planned', regions: ['east-africa'], aliases: ['somali', 'soomaali'], enabled: false, recommendedNext: true },
  { code: 'zu', label: 'Zulu', nativeLabel: 'isiZulu', direction: 'ltr', group: 'planned', regions: ['southern-africa'], aliases: ['zulu', 'isizulu'], enabled: false },
  { code: 'xh', label: 'Xhosa', nativeLabel: 'isiXhosa', direction: 'ltr', group: 'planned', regions: ['southern-africa'], aliases: ['xhosa', 'isixhosa'], enabled: false },
  { code: 'rw', label: 'Kinyarwanda', nativeLabel: 'Kinyarwanda', direction: 'ltr', group: 'planned', regions: ['east-africa'], aliases: ['rwanda'], enabled: false },
  { code: 'rn', label: 'Kirundi', nativeLabel: 'Kirundi', direction: 'ltr', group: 'planned', regions: ['east-africa'], aliases: ['rundi'], enabled: false },
  { code: 'ln', label: 'Lingala', nativeLabel: 'Lingala', direction: 'ltr', group: 'planned', regions: ['central-africa'], aliases: ['lingala'], enabled: false },
  { code: 'wo', label: 'Wolof', nativeLabel: 'Wolof', direction: 'ltr', group: 'planned', regions: ['west-africa'], aliases: ['wolof'], enabled: false },
  { code: 'bm', label: 'Bambara', nativeLabel: 'Bamanankan', direction: 'ltr', group: 'planned', regions: ['west-africa'], aliases: ['bambara', 'bamanankan'], enabled: false },
  { code: 'om', label: 'Oromo', nativeLabel: 'Afaan Oromoo', direction: 'ltr', group: 'planned', regions: ['east-africa'], aliases: ['oromo'], enabled: false },
  { code: 'ti', label: 'Tigrinya', nativeLabel: 'Tigrinya', direction: 'ltr', group: 'planned', regions: ['east-africa'], aliases: ['tigrinya'], enabled: false },
  { code: 'mg', label: 'Malagasy', nativeLabel: 'Malagasy', direction: 'ltr', group: 'planned', regions: ['indian-ocean'], aliases: ['malagasy'], enabled: false },
  { code: 'es', label: 'Spanish', nativeLabel: 'Espanol', direction: 'ltr', group: 'planned', regions: ['global'], aliases: ['spanish', 'espanol'], enabled: false, recommendedNext: true },
  { code: 'hi', label: 'Hindi', nativeLabel: 'Hindi', direction: 'ltr', group: 'planned', regions: ['global', 'south-asia'], aliases: ['hindi'], enabled: false },
  { code: 'bn', label: 'Bengali', nativeLabel: 'Bangla', direction: 'ltr', group: 'planned', regions: ['global', 'south-asia'], aliases: ['bengali', 'bangla'], enabled: false },
  { code: 'ur', label: 'Urdu', nativeLabel: 'Urdu', direction: 'rtl', group: 'planned', regions: ['global', 'south-asia'], aliases: ['urdu'], enabled: false },
  { code: 'id', label: 'Indonesian', nativeLabel: 'Bahasa Indonesia', direction: 'ltr', group: 'planned', regions: ['global', 'southeast-asia'], aliases: ['indonesian', 'bahasa'], enabled: false },
  { code: 'tr', label: 'Turkish', nativeLabel: 'Turkce', direction: 'ltr', group: 'planned', regions: ['global', 'west-asia'], aliases: ['turkish'], enabled: false },
  { code: 'ru', label: 'Russian', nativeLabel: 'Russkiy', direction: 'ltr', group: 'planned', regions: ['global'], aliases: ['russian'], enabled: false },
  { code: 'zh-Hans', label: 'Chinese Simplified', nativeLabel: 'Simplified Chinese', direction: 'ltr', group: 'planned', regions: ['global', 'east-asia'], aliases: ['chinese', 'mandarin', 'simplified chinese'], enabled: false },
  { code: 'fil', label: 'Filipino / Tagalog', nativeLabel: 'Filipino', direction: 'ltr', group: 'planned', regions: ['global', 'southeast-asia'], aliases: ['filipino', 'tagalog'], enabled: false },
];

export const enabledLanguages = supportedLanguages.filter((language) => language.enabled);

export function getLanguageConfig(languageCode: string): LanguageConfig {
  return supportedLanguages.find((language) => language.code === languageCode && language.enabled) ?? enabledLanguages[0];
}
