

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

export interface Project {
  id: string;
  projectName: string;
  clientName: string;
  clientContact: string;
  clientAddress: string;
  date: string;
  validityPeriod: string;
  quoteId: string; // Keeping for reference
}

export interface BQItem {
  id: string;
  projectId: string; // Linked project
  masterId?: string;
  category: string;
  itemName: string;
  description: string;
  price: number; // This is REX RSP
  qty: number;
  uom: string;
  total: number; // This is REX TRSP
  // Snapshots for calculation
  rexScDdp: number;
  rexSp: number;
  rexRsp: number;
}

export interface AppSettings {
  companyName: string;
  companyAddress: string;
  logoUrl: string;
  currencySymbol: string;
  taxRate: number;
  // Profile Info
  profileName: string;
  profileContact: string;
  profileRole: string;
}

export interface Translations {
  main: string;
  welcomeSubtitle: string;
  welcomeTitle: string;
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
  // Project & BQ New Headers
  projects: string;
  addProject: string;
  projectName: string;
  validityPeriod: string;
  backToProjects: string;
  rexTsc: string;
  rexTsp: string;
  rexTrsp: string;
  rexGp: string;
  rexGpPercent: string;
  createProject: string;
  searchProjects: string;
  // New Project Fields
  clientContact: string;
  clientAddress: string;
  editDetails: string;
  updateProject: string;
  projectDetails: string;
  // Profile Settings
  profileSettings: string;
  yourName: string;
  yourContact: string;
  profileRole: string;
  confirm: string;
  roleAdmin: string;
  roleUser: string;
}

export const LANGUAGES = [
  { code: AppLanguage.ENGLISH, label: 'English', flag: '🇺🇸' },
  { code: AppLanguage.MALAY, label: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: AppLanguage.CHINESE, label: '中文 (简体)', flag: '🇨🇳' },
];
