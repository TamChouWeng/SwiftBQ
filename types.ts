
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

export type BQViewMode = 'catalog' | 'review';

export interface PriceField {
  value: number;
  strategy: string; // Strategy ID (e.g., 'DDP_FORMULA_A', 'MANUAL')
  manualOverride?: number; // Stores the user-entered value if strategy is 'MANUAL'
}

export interface MasterItem {
  id: string;
  // New Columns A-D
  brand: string; // Header: Brand
  axsku: string; // Header: AX SKU
  mpn: string; // Header: MPN
  group: string; // Header: GROUP

  category: string;
  itemName: string;
  description: string; // Type
  price: number; // Default Selling Price (RSP) - Kept for backward compatibility, syncs with rexRsp.value
  uom: string;
  // Columns N-T
  rexScFob: number;
  forex: number;
  sst: number;
  opta: number;

  // Dynamic Pricing Columns
  rexScDdp: PriceField;
  rexSp: PriceField;
  rexRsp: PriceField;
}

export interface ProjectVersion {
  id: string;
  name: string;
  createdAt: string;
  masterSnapshot: MasterItem[]; // Data Independence: Per-Version Price Book
  termsConditions?: string; // Dynamic T&C
}

export interface Project {
  id: string;
  userId: string; // Owner ID
  projectName: string;
  clientName: string;
  clientContact: string;
  clientAddress: string;
  date: string;
  validityPeriod: string;
  quoteId: string; // Keeping for reference
  versions: ProjectVersion[]; // New: List of versions
  discount?: number; // Special Discount
}

export interface BQItem {
  id: string;
  userId: string; // Owner ID
  projectId: string; // Linked project
  versionId: string; // New: Linked version
  masterId?: string;
  category: string;
  itemName: string;
  description: string;

  price: number; // This is REX RSP
  qty: number;
  uom: string;
  total: number; // This is REX TRSP

  // Snapshots for Data Independence
  brand: string;
  axsku: string;
  mpn: string;
  group: string;

  // Costing Snapshots
  rexScFob: number;
  forex: number;
  sst: number;
  opta: number;

  rexScDdp: PriceField;
  rexSp: PriceField;
  rexRsp: PriceField;

  // New field
  isOptional?: boolean;
}

export interface AppSettings {
  companyName: string;
  companyAddress: string;
  currencySymbol: string;
  companyLogo: string; // Added Base64 logo string
  // Bank Info
  bankName: string;
  bankAccount: string;
  // Profile Info
  profileName: string;
  profileContact: string;
  profileRole: string;
  profileSignature?: string; // New: Signature Image URL
  companyEmail?: string; // New: Company Email
}

export interface Translations {
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
  exportPDF: string;
  noData: string;
  // New Column Headers
  brand: string;
  axsku: string;
  mpn: string;
  group: string;
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
  // Column Visibility
  columns: string;
  isOptional: string;
  // Bank Info
  bankName: string;
  bankAccount: string;
}

export const LANGUAGES = [
  { code: AppLanguage.ENGLISH, label: 'English', flag: '🇺🇸' },
  { code: AppLanguage.MALAY, label: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: AppLanguage.CHINESE, label: '中文 (简体)', flag: '🇨🇳' },
];
