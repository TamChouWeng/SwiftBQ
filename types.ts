/* Updated types.ts: add PriceField and use it for pricing columns */

export interface PriceField {
  value: number;
  strategy: string; // e.g., 'DDP_FORMULA_A', 'MANUAL'
  manualOverride?: number;
}

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
  // price numeric is kept for BQ snapshots/backwards compatibility (mirrors rexRsp.value)
  price: number;
  uom: string;

  // Columns N-T
  rexScFob: number;
  forex: number;
  sst: number;
  opta: number;

  // Refactored: composite objects for the three dependent columns
  rexScDdp: PriceField;
  rexSp: PriceField;
  rexRsp: PriceField;

  // Hidden field for calculation
  // spMargin removed
}

export interface ProjectVersion {
  id: string;
  name: string;
  createdAt: string;
  masterSnapshot: MasterItem[]; // Data Independence: Per-Version Price Book
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
  versions: ProjectVersion[]; // New: List of versions
  discount?: number; // Special Discount
}

export interface BQItem {
  id: string;
  projectId: string; // Linked project
  versionId: string; // New: Linked version
  masterId?: string;
  category: string;
  itemName: string;
  description: string;
  quotationDescription?: string; // New: Specific description for quotation view
  price: number; // This is REX RSP (numeric snapshot)
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

  rexScDdp: number;
  rexSp: number;
  rexRsp: number;

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
}
