
export enum AppTheme {
  LIGHT = 'light',
  DARK = 'dark',
}

export enum AppLanguage {
  ENGLISH = 'en',
  MALAY = 'ms',
  CHINESE = 'zh',
}

export enum ActiveTab {
  MASTER_LIST = 'masterList',
  BQ_BUILDER = 'bqBuilder',
  QUOTATION_VIEW = 'quotationView',
  SETTINGS = 'settings',
}

export interface MasterItem {
  id: string;
  category: string;
  itemName: string;
  description: string; // Type
  price: number; // Default Selling Price (RSP)
  uom: string;
  // New columns N-T
  rexScFob: number;
  forex: number;
  sst: number;
  opta: number;
  rexScDdp: number;
  rexSp: number;
  rexRsp: number;
  // Hidden field for calculation
  spMargin?: number;
}

export interface BQItem {
  id: string;
  masterId?: string;
  category: string;
  itemName: string;
  description: string;
  price: number;
  qty: number;
  uom: string;
  total: number;
}

export interface ProjectDetails {
  clientName: string;
  date: string;
  quoteId: string;
}

export interface AppSettings {
  companyName: string;
  companyAddress: string;
  logoUrl: string;
  currencySymbol: string;
  taxRate: number;
}

export interface Translations {
  main: string;
  masterList: string;
  bqBuilder: string;
  quotationView: string;
  settings: string;
  theme: string;
  language: string;
  darkMode: string;
  lightMode: string;
  selectLanguage: string;
  version: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
  appearance: string;
  general: string;
  system: string;
  clientName: string;
  date: string;
  quoteId: string;
  category: string;
  item: string;
  description: string;
  typeColumn: string;
  price: string;
  qty: string;
  uom: string;
  total: string;
  actions: string;
  addRow: string;
  delete: string;
  subtotal: string;
  tax: string;
  grandTotal: string;
  companyName: string;
  companyAddress: string;
  currencySymbol: string;
  taxRate: string;
  logoUrl: string;
  exportPDF: string;
  noData: string;
  generatedBy: string;
  // New Column Headers
  rexScFob: string;
  forex: string;
  sst: string;
  opta: string;
  rexScDdp: string;
  rexSp: string;
  rexRsp: string;
}

export const LANGUAGES = [
  { code: AppLanguage.ENGLISH, label: 'English', flag: '🇺🇸' },
  { code: AppLanguage.MALAY, label: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: AppLanguage.CHINESE, label: '中文 (简体)', flag: '🇨🇳' },
];