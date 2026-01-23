
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { MasterItem, BQItem, Project, AppSettings, BQViewMode } from './types';

interface AppContextType {
  masterData: MasterItem[];
  setMasterData: React.Dispatch<React.SetStateAction<MasterItem[]>>;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;

  currentProjectId: string | null;
  setCurrentProjectId: React.Dispatch<React.SetStateAction<string | null>>;

  // Versioning
  currentVersionId: string | null;
  setCurrentVersionId: React.Dispatch<React.SetStateAction<string | null>>;

  bqItems: BQItem[];
  setBqItems: React.Dispatch<React.SetStateAction<BQItem[]>>;
  appSettings: AppSettings;
  setAppSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  bqViewMode: BQViewMode;
  setBqViewMode: React.Dispatch<React.SetStateAction<BQViewMode>>;

  // Actions
  addMasterItem: (item: MasterItem) => void;
  updateMasterItem: (id: string, updates: Partial<MasterItem>) => void;
  deleteMasterItem: (id: string) => void;

  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => void;

  // Version Actions
  createVersion: (projectId: string, sourceVersionId: string, newVersionName: string, explicitNewVersionId?: string) => void;
  updateVersionName: (projectId: string, versionId: string, name: string) => void;
  deleteVersion: (projectId: string, versionId: string) => void;

  updateProjectSnapshot: (projectId: string, versionId: string, snapshotUpdates: Partial<MasterItem>[]) => void;

  addBQItem: (projectId: string, versionId: string) => void;
  syncMasterToBQ: (projectId: string, versionId: string, masterItem: MasterItem, qty: number) => void;
  removeBQItem: (id: string) => void;
  updateBQItem: (id: string, field: keyof BQItem, value: any) => void;
  reorderBQItems: (projectId: string, versionId: string, sourceIndex: number, destinationIndex: number) => void;

  // Computations
  getProjectTotal: (projectId: string, versionId: string) => { subtotal: number; tax: number; grandTotal: number; discount: number };

  // Quotation Edit Mode
  quotationEdits: Record<string, string>;
  setQuotationEdit: (id: string, value: string) => void;
  commitQuotationEdits: () => void;
  discardQuotationEdits: () => void;

  // Master List Edit Mode (Transactional)
  masterListEdits: Record<string, Partial<MasterItem>>;
  setMasterListEdit: (id: string, field: keyof MasterItem, value: any) => void;
  commitMasterListEdits: () => void;
  discardMasterListEdits: () => void;

  // Global Unsaved State
  hasUnsavedChanges: boolean;
  saveAllChanges: () => void;
  discardAllChanges: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper for robust calculation (Ceiling logic from excel)
const calcCeiling = (val: number, significance: number) => {
  if (significance === 0) return val;
  // Fix floating point errors (e.g. 30000 * 1.08 = 32400.000000000004) by rounding slightly before ceiling
  const sanitizedVal = Number(val.toFixed(6));
  return Math.ceil(sanitizedVal / significance) * significance;
};

// Calculate derived fields
export const calculateDerivedFields = (item: Partial<MasterItem>): Partial<MasterItem> => {
  // Robustly handle string inputs from edits and avoid NaN
  const safeNum = (val: any, def: number) => {
    if (val === '' || val === null || val === undefined) return def;
    const num = Number(val);
    return isNaN(num) ? def : num;
  };

  const fob = safeNum(item.rexScFob, 0);
  const forex = safeNum(item.forex, 1);
  const sst = safeNum(item.sst, 1);
  const opta = safeNum(item.opta, 0.97);

  // Heuristic for precision
  const isHighValue = fob > 500;
  const precisionDDP = isHighValue ? 1 : 0.01;
  const precisionSP = isHighValue ? 1 : 0.1;

  // Formula for DDP: CEILING((FOB * Forex * SST) / OPTA, precisionDDP)
  const ddp = opta !== 0 ? calcCeiling((fob * forex * sst) / opta, precisionDDP) : 0;

  // Formula for SP: CEILING(DDP / 0.71, precisionSP)
  const sp = calcCeiling(ddp / 0.71, precisionSP);

  // RSP = SP
  const rsp = sp;

  return {
    rexScDdp: ddp,
    rexSp: sp,
    rexRsp: rsp,
    price: rsp // Update main price to match RSP
  };
};

// Raw Data processing function to mimic CSV row logic
const createItem = (
  id: string,
  brand: string,
  axsku: string,
  mpn: string,
  group: string,
  category: string,
  type: string,
  item: string,
  uom: string,
  fob: number,
  forex: number,
  sst: number,
  opta: number,
  // spMargin removed
  overrideRSP: number | null = null
): MasterItem => {
  const derived = calculateDerivedFields({
    rexScFob: fob,
    forex,
    sst,
    opta,
  });

  return {
    id,
    brand,
    axsku,
    mpn,
    group,
    category,
    itemName: item,
    description: type,
    uom,
    price: overrideRSP ?? derived.rexRsp ?? 0,
    rexScFob: fob,
    forex,
    sst,
    opta,
    rexScDdp: derived.rexScDdp ?? 0,
    rexSp: derived.rexSp ?? 0,
    rexRsp: overrideRSP ?? derived.rexRsp ?? 0,
  };
};

// Parsed Data from CSV with robust calculations
const INITIAL_MASTER_DATA: MasterItem[] = [
  // --- EV CHARGER ---
  createItem('1', "SIEMENS", "", "CPC50CC-M", "50", "EV CHARGER", "ALPITRONIC", "50 KW HYC50", "Unit", 99000, 1, 1.08, 1),
  createItem('2', "SIEMENS", "", "CPC50CC-M", "50", "EV CHARGER", "ALPITRONIC", "200KW HYC200", "Unit", 249000, 1, 1.08, 1),
  createItem('3', "SIEMENS", "", "CPC50CC-M", "50", "EV CHARGER", "ALPITRONIC", "400KW HYC 400", "Unit", 499000, 1, 1.08, 1),
  createItem('4', "SCHNEIDER", "2331550", "EVB1A22P4RI", "7", "EV CHARGER", "REVO ", "REVO RE LITE 7kW", "Unit", 646.8, 1, 1.1, 1),
  createItem('5', "SCHNEIDER", "2331550", "EVB1A22P4RI", "7", "EV CHARGER", "REVO ", "REVO RE LITE 22kW", "Unit", 640, 1, 1, 1),
  createItem('6', "SCHNEIDER", "2331550", "EVB1A22P4RI", "7", "EV CHARGER", "SCHNEIDER EV CHARGER", "22 KW Schneider Charge - White ", "Unit", 3145, 1, 1, 1),
  createItem('7', "", "", "", "", "EV CHARGER", "SCHNEIDER EV CHARGER", "Harting Cable", "Unit", 680.6, 1, 1, 1),
  createItem('8', "SCHNEIDER", "2331550", "EVB1A22P4RI", "22", "EV CHARGER", "SCHNEIDER EV CHARGER", "22 KW Schneider Charge Pro - Black (With OCPP)", "Unit", 2800, 1, 1, 1),
  createItem('9', "SCHNEIDER", "2331550", "EVB1A22P4RI", "7", "EV CHARGER", "SCHNEIDER EV CHARGER", "7kW EVLINK PRO AC CHARGING STATION", "Unit", 5000, 1, 1, 1),
  createItem('10', "SCHNEIDER", "2331550", "EVB1A22P4RI", "22", "EV CHARGER", "SCHNEIDER EV CHARGER", "22kW EVLINK PRO AC CHARGING STATION", "Unit", 5223, 1, 1, 1),
  createItem('11', "HICI", "", "", "60", "EV CHARGER", "SCHNEIDER EV CHARGER", "60kW with CMS", "Unit", 47000, 1, 1, 1),
  createItem('12', "", "", "", "", "EV CHARGER", "SCHNEIDER EV CHARGER", "60kW with 5m cable (No CMS)", "Unit", 47000, 1, 1, 1),
  createItem('13', "", "", "", "", "EV CHARGER", "SCHNEIDER EV CHARGER", "60kW with 7m cable (No CMS)", "Unit", 48000, 1, 1, 1),
  createItem('14', "", "", "", "", "EV CHARGER", "SCHNEIDER EV CHARGER", "Pedestal 1m ", "Unit", 2000, 1, 1, 1),
  createItem('15', "", "", "", "", "EV CHARGER", "SCHNEIDER EV CHARGER", "Pedestal 0.75m ", "Unit", 1800, 1, 1, 1),
  createItem('16', "HICI", "", "", "120", "EV CHARGER", "SCHNEIDER EV CHARGER", "120kW ", "Unit", 63000, 1, 1, 1),
  createItem('17', "HICI", "", "", "60", "EV CHARGER", "SCHNEIDER EV CHARGER", "120kW ", "Unit", 63000, 1, 1, 1),
  createItem('18', "HICI", "", "", "180", "EV CHARGER", "SCHNEIDER EV CHARGER", "150kW", "Unit", 75000, 1, 1, 1),
  createItem('19', "HICI", "", "", "60", "EV CHARGER", "SCHNEIDER EV CHARGER", "150kW with CMS", "Unit", 82500, 1, 1, 1),
  createItem('20', "HICI", "", "", "180", "EV CHARGER", "SCHNEIDER EV CHARGER", "180kW", "Unit", 85000, 1, 1, 1),
  createItem('21', "HICI", "", "", "60", "EV CHARGER", "SCHNEIDER EV CHARGER", "180kW ", "Unit", 85000, 1, 1, 1),
  createItem('22', "7kW", "7kW", "7kW", "7kW", "EV CHARGER", "HUAWEI ", "7kW", "Unit", 5460.73, 1, 1, 0.96),
  createItem('23', "22kW", "22kW", "22kW", "22kW", "EV CHARGER", "HUAWEI ", "22kW", "Unit", 5460.73, 1, 1, 1),
  createItem('24', "STARCHARGE", "", "", "7", "EV CHARGER", "STARCHARGE EV CHARGER", "7 KW ARTEMIS BASIC", "Unit", 200, 4.25, 1, 1),
  createItem('25', "STARCHARGE", "", "", "11", "EV CHARGER", "STARCHARGE EV CHARGER", "7 KW ARTEMIS SMART", "Unit", 280, 4.25, 1, 1),
  createItem('26', "", "", "", "", "EV CHARGER", "STARCHARGE EV CHARGER", "22 KW ARTEMIS BASIC", "Unit", 292, 4.25, 1, 1),
  createItem('27', "STARCHARGE", "", "", "22", "EV CHARGER", "STARCHARGE EV CHARGER", "22 KW ARTEMIS SMART", "Unit", 300, 4.25, 1, 1),
  createItem('28', "STARCHARGE", "", "", "22", "EV CHARGER", "STARCHARGE EV CHARGER", "22 KW Aurora 22 (PROMO PRICE)", "Unit", 300, 4.25, 1, 1),
  createItem('29', "STARCHARGE", "", "", "22", "EV CHARGER", "STARCHARGE EV CHARGER", "22 KW Saturn 22", "Unit", 1950, 4.25, 1.13, 0.97),
  createItem('30', "STARCHARGE", "", "", "30", "EV CHARGER", "STARCHARGE EV CHARGER", "30 KW Venus 30", "Unit", 24000, 1, 1, 1),
  createItem('31', "", "", "", "", "EV CHARGER", "STARCHARGE EV CHARGER", "Hyperion Warranty Extension", "Unit", 1250, 1, 1, 1),
  createItem('32', "STARCHARGE", "", "291", "120", "EV CHARGER", "STARCHARGE EV CHARGER", "60 KW Hyperion V2 (2 years Warranty) - Perodua Price", "Unit", 80000, 1, 1, 1),
  createItem('33', "STARCHARGE", "", "291", "120", "EV CHARGER", "STARCHARGE EV CHARGER", "120 KW Hyperion V2 (2 years Warranty) - Perodua Price", "Unit", 90000, 1, 1, 1),
  createItem('34', "STARCHARGE", "", "291", "120", "EV CHARGER", "STARCHARGE EV CHARGER", "120 KW Hyperion V2 (2 years Warranty)", "Unit", 100000, 1, 1, 1),
  createItem('35', "", "", "", "", "EV CHARGER", "STARCHARGE EV CHARGER", "60 KW Hyperion V2 (2 years Warranty)", "Unit", 110000, 1, 1, 1),
  createItem('36', "STARCHARGE", "", "291", "120", "EV CHARGER", "STARCHARGE EV CHARGER", "150 KW Hyperion V2 (2 years Warranty) - Perodua Price", "Unit", 120000, 1, 1, 1),
  createItem('37', "STARCHARGE", "", "291", "120", "EV CHARGER", "STARCHARGE EV CHARGER", "180 KW Hyperion V2 (2 years Warranty) - Perodua Price", "Unit", 130000, 1, 1, 1),
  createItem('38', "STARCHARGE", "", "291", "120", "EV CHARGER", "STARCHARGE EV CHARGER", "120 KW Titan V2", "Unit", 140000, 1, 1, 1),
  createItem('39', "STARCHARGE", "", "#REF!", "150", "EV CHARGER", "STARCHARGE EV CHARGER", "150 KW Titan V2", "Unit", 150000, 1, 1, 1),
  createItem('40', "STARCHARGE", "", "", "180", "EV CHARGER", "STARCHARGE EV CHARGER", "180 KW Titan V2", "Unit", 160000, 1, 1, 1),
  createItem('41', "STARCHARGE", "", "", "180", "EV CHARGER", "STARCHARGE EV CHARGER", "180 KW Titan V3 with CMS", "Unit", 170000, 1, 1, 1),
  createItem('42', "STARCHARGE", "", "", "180", "EV CHARGER", "STARCHARGE EV CHARGER", "240 kW Nova Power Cabinet ", "Unit", 180000, 1, 1, 1),
  createItem('43', "STARCHARGE", "", "", "180", "EV CHARGER", "STARCHARGE EV CHARGER", "360 kW Nova Power Cabinet", "Unit", 190000, 1, 1, 1),
  createItem('44', "STARCHARGE", "", "", "180", "EV CHARGER", "STARCHARGE EV CHARGER", "720 kW Nova Power Cabinet (1100 A)", "Unit", 200000, 1, 1, 1),
  createItem('45', "STARCHARGE", "", "", "180", "EV CHARGER", "STARCHARGE EV CHARGER", "Seraph Dispenser (5m cable)", "Unit", 210000, 1, 1, 1),
  createItem('46', "STARCHARGE", "", "", "180", "EV CHARGER", "STARCHARGE EV CHARGER", "Seraph Dispenser (7.5m cable)", "Unit", 220000, 1, 1, 1),
  createItem('47', "PINGALAX", "", "", "7", "EV CHARGER", "ATP EV CHARGER", "7kW", "Unit", 640, 1, 1, 1),
  createItem('48', "PINGALAX", "", "", "22", "EV CHARGER", "ATP EV CHARGER", "22kW", "Unit", 770, 1, 1, 1),
  createItem('49', "PINGALAX", "", "", "7", "EV CHARGER", "GRESYING", "7kW", "Unit", 1561, 1, 1, 1),
  createItem('50', "PINGALAX", "", "", "22", "EV CHARGER", "GRESYING", "22kW", "Unit", 1981, 1, 1, 1),
  createItem('51', "", "", "", "", "EV CHARGER", "GRESYING", "30kW ", "Unit", 20650, 1, 1, 1),
  createItem('52', "PINGALAX", "", "", "60", "EV CHARGER", "GRESYING", "60kW", "Unit", 39200, 1, 1, 1),
  createItem('53', "PINGALAX", "", "", "80", "EV CHARGER", "GRESYING", "120kW", "Unit", 58100, 1, 1, 1),
  createItem('54', "PINGALAX", "", "", "160", "EV CHARGER", "GRESYING", "180kW", "Unit", 74550, 1, 1, 1),
  createItem('55', "PINGALAX", "", "", "240", "EV CHARGER", "GRESYING", "240kW", "Unit", 114520, 1, 1, 1),
  createItem('56', "PINGALAX", "", "", "240", "EV CHARGER", "GRESYING", "320kW", "Unit", 124600, 1, 1, 1),
  createItem('57', "PINGALAX", "", "", "240", "EV CHARGER", "GRESYING", "480KW", "Unit", 422800, 1, 1, 1),
  createItem('58', "PINGALAX", "", "", "240", "EV CHARGER", "GRESYING", "480KW HPC", "Unit", 494200, 1, 1, 1),
  createItem('59', "PINGALAX", "", "", "240", "EV CHARGER", "GRESYING", "480kW Power Cabinet", "Unit", 169582, 1, 1, 1),
  createItem('60', "PINGALAX", "", "", "240", "EV CHARGER", "GRESYING", "180kW Dispenser", "Unit", 47600, 1, 1, 1),
  createItem('61', "PINGALAX", "", "", "240", "EV CHARGER", "GRESYING", "180kW Dispenser HPC", "Unit", 116900, 1, 1, 1),
  createItem('62', "", "", "", "", "EV CHARGER", "PINGALAX EV CHARGER", "20kW Portable DC Charger", "Unit", 12520, 0.6, 1, 1),
  createItem('63', "", "", "", "", "EV CHARGER", "PINGALAX EV CHARGER", "30kW Portable DC Charger", "Unit", 14700, 0.6, 1, 1),
  createItem('64', "PINGALAX", "", "", "30", "EV CHARGER", "PINGALAX EV CHARGER", "30kw", "Unit", 19980, 0.6, 1, 1),
  createItem('65', "PINGALAX", "", "", "40", "EV CHARGER", "PINGALAX EV CHARGER", "40kW", "Unit", 20860, 0.6, 1, 1),
  createItem('66', "PINGALAX", "", "", "60", "EV CHARGER", "PINGALAX EV CHARGER", "60kW (200A DC Cable)", "Unit", 35142, 0.6, 1, 1),
  // --- NON-ARMOURED CABLE ---
  createItem('67', "MEGA/SOUTHERN", "", "", "", "NON-ARMOURED CABLE", "PVC OR PVC/PVC", "1C X 6MM PVC CABLE (RED)", "Meter", 3.4, 1, 1, 0.96),
  createItem('68', "MEGA/SOUTHERN", "", "", "", "NON-ARMOURED CABLE", "PVC OR PVC/PVC", "1C X 6MM PVC CABLE (YELLOW)", "Meter", 3.4, 1, 1, 0.96),
  createItem('69', "MEGA/SOUTHERN", "", "", "", "NON-ARMOURED CABLE", "PVC OR PVC/PVC", "1C X 6MM PVC CABLE (BLUE)", "Meter", 3.4, 1, 1, 0.96),
  createItem('70', "MEGA/SOUTHERN", "", "", "", "NON-ARMOURED CABLE", "PVC OR PVC/PVC", "1C X 6MM PVC CABLE (BLACK)", "Meter", 3.4, 1, 1, 0.96),
  createItem('71', "MEGA/SOUTHERN", "", "", "", "NON-ARMOURED CABLE", "PVC OR PVC/PVC", "1C X 6MM PVC CABLE (GREEN)", "Meter", 3.4, 1, 1, 0.96),
  createItem('72', "MEGA/SOUTHERN", "", "", "", "NON-ARMOURED CABLE", "PVC OR PVC/PVC", "1C X 10MM PVC CABLE (RED)", "Meter", 5.8, 1, 1, 0.96),
  createItem('73', "MEGA/SOUTHERN", "", "", "", "NON-ARMOURED CABLE", "PVC OR PVC/PVC", "1C X 10MM PVC CABLE (YELLOW)", "Meter", 5.8, 1, 1, 0.96),
  createItem('74', "MEGA/SOUTHERN", "", "", "", "NON-ARMOURED CABLE", "PVC OR PVC/PVC", "1C X 10MM PVC CABLE (BLUE)", "Meter", 5.8, 1, 1, 0.96),
  createItem('75', "MEGA/SOUTHERN", "", "", "", "NON-ARMOURED CABLE", "PVC OR PVC/PVC", "1C X 10MM PVC CABLE (BLACK)", "Meter", 5.8, 1, 1, 0.96),
  createItem('76', "MEGA/SOUTHERN", "", "", "", "NON-ARMOURED CABLE", "PVC OR PVC/PVC", "1C X 10MM PVC CABLE (GREEN)", "Meter", 5.8, 1, 1, 0.96),
  createItem('77', "MEGA", "", "", "", "NON-ARMOURED CABLE", "PVC OR PVC/PVC", "1C X 16MM PVC CABLE (RED)", "Meter", 9, 1, 1, 0.96),
  createItem('78', "MEGA", "", "", "", "NON-ARMOURED CABLE", "PVC OR PVC/PVC", "1C X 16MM PVC CABLE (YELLOW)", "Meter", 9, 1, 1, 0.96),
  createItem('79', "MEGA", "", "", "", "NON-ARMOURED CABLE", "PVC OR PVC/PVC", "1C X 16MM PVC CABLE (BLUE)", "Meter", 9, 1, 1, 0.96),
  createItem('80', "MEGA", "", "", "", "NON-ARMOURED CABLE", "PVC OR PVC/PVC", "1C X 16MM PVC CABLE (BLACK)", "Meter", 9, 1, 1, 0.96),
  createItem('81', "MEGA", "", "", "", "NON-ARMOURED CABLE", "PVC OR PVC/PVC", "1C X 16MM PVC CABLE", "Meter", 9, 1, 1, 0.96),
  createItem('82', "MEGA/SOUTHERN", "", "", "", "NON-ARMOURED CABLE", "PVC OR PVC/PVC", "1C X 25MM PVC CABLE ", "Meter", 12.65, 1, 1, 0.96),
  createItem('83', "MEGA/SOUTHERN", "", "", "", "NON-ARMOURED CABLE", "PVC OR PVC/PVC", "1C X 35MM PVC CABLE ", "Meter", 19.5, 1, 1, 0.96),
  createItem('84', "MEGA/SOUTHERN", "", "", "", "NON-ARMOURED CABLE", "PVC OR PVC/PVC", "1C X 50MM PVC CABLE ", "Meter", 24.8, 1, 1, 0.96),
  createItem('85', "MEGA/SOUTHERN", "", "", "", "NON-ARMOURED CABLE", "PVC OR PVC/PVC", "1C X 95MM PVC CABLE ", "Meter", 50.3, 1, 1, 0.96),
  createItem('86', "MEGA/SOUTHERN", "", "", "", "NON-ARMOURED CABLE", "PVC OR PVC/PVC", "3C X 6MM PVC/PVC CABLE", "Meter", 11.1, 1, 1, 0.96),
  createItem('87', "MEGA/SOUTHERN", "", "", "", "NON-ARMOURED CABLE", "PVC OR PVC/PVC", "3C X 10MM PVC/PVC CABLE", "Meter", 17.03, 1, 1, 0.96),
  createItem('88', "MEGA/SOUTHERN", "", "", "", "NON-ARMOURED CABLE", "PVC OR PVC/PVC", "4C X 6MM PVC/PVC CABLE", "Meter", 15.8, 1, 1, 0.96),
  createItem('89', "MEGA/SOUTHERN", "", "", "", "NON-ARMOURED CABLE", "PVC OR PVC/PVC", "4C X 10MM PVC/PVC CABLE", "Meter", 22.68, 1, 1, 0.96),
  createItem('90', "MEGA/SOUTHERN", "", "", "", "NON-ARMOURED CABLE", "PVC OR PVC/PVC", "4C X 16MM PVC/PVC CABLE", "Meter", 32.13, 1, 1, 0.96),
  createItem('91', "MEGA/SOUTHERN", "", "", "", "NON-ARMOURED CABLE", "PVC OR PVC/PVC", "4C X 25MM PVC/PVC CABLE", "Meter", 50.47, 1, 1, 0.96),
  createItem('92', "MEGA/SOUTHERN", "", "", "", "NON-ARMOURED CABLE", "PVC OR PVC/PVC", "4C X 35MM PVC/PVC CABLE", "Meter", 69.77, 1, 1, 0.96),
  createItem('93', "MEGA/SOUTHERN", "", "", "", "NON-ARMOURED CABLE", "XLPE/PVC", "1C X 16MM XLPE/PVC CABLE ", "Meter", 9, 1, 1, 0.96),
  createItem('94', "MEGA/SOUTHERN", "", "", "", "NON-ARMOURED CABLE", "XLPE/PVC", "1C X 35MM XLPE/PVC CABLE ", "Meter", 19.5, 1, 1, 0.96),
  createItem('95', "MEGA/SOUTHERN", "", "", "", "NON-ARMOURED CABLE", "XLPE/PVC", "1C X 50MM XLPE/PVC CABLE ", "Meter", 28.5, 1, 1, 0.96),
  createItem('96', "MEGA/SOUTHERN", "", "", "", "NON-ARMOURED CABLE", "XLPE/PVC", "1C X 70MM XLPE/PVC CABLE ", "Meter", 35.8, 1, 1, 0.96),
  createItem('97', "MEGA/SOUTHERN", "", "", "", "NON-ARMOURED CABLE", "XLPE/PVC", "1C X 95MM XLPE/PVC CABLE ", "Meter", 49.5, 1, 1, 0.96),
  createItem('98', "MEGA/SOUTHERN", "", "", "", "NON-ARMOURED CABLE", "XLPE/PVC", "1C X 150MM XLPE/PVC CABLE ", "Meter", 68, 1, 1, 0.96),
  createItem('99', "MEGA/SOUTHERN", "", "", "", "NON-ARMOURED CABLE", "XLPE/PVC", "1C X 185MM XLPE/PVC CABLE ", "Meter", 98, 1, 1, 0.96),
  createItem('100', "SAMA", "", "", "", "NON-ARMOURED CABLE", "XLPE/PVC", "4C X 4MM CU/XLPE/PVC Cable", "Meter", 21.95, 1, 1, 0.96),
  createItem('101', "SAMA", "", "", "", "NON-ARMOURED CABLE", "XLPE/PVC", "4C X 6MM CU/XLPE/PVC Cable", "Meter", 29.78, 1, 1, 0.96),
  createItem('102', "SAMA", "", "", "", "NON-ARMOURED CABLE", "XLPE/PVC", "4C X 10MM CU/XLPE/PVC Cable", "Meter", 43.37, 1, 1, 0.96),
  createItem('103', "SAMA", "", "", "", "NON-ARMOURED CABLE", "XLPE/PVC", "4C X 16MM CU/XLPE/PVC Cable", "Meter", 61.76, 1, 1, 0.96),
  createItem('104', "SAMA\nMEGA - RM 68", "", "", "", "NON-ARMOURED CABLE", "XLPE/PVC", "4C X 25MM CU/XLPE/PVC Cable", "Meter", 60, 1, 1, 0.96),
  createItem('105', "SAMA", "", "", "", "NON-ARMOURED CABLE", "XLPE/PVC", "4C X 35MM CU/XLPE/PVC Cable", "Meter", 76, 1, 1, 0.96),
  createItem('106', "SAMA", "", "", "", "NON-ARMOURED CABLE", "XLPE/PVC", "4C X 50MM CU/XLPE/PVC Cable", "Meter", 104.5, 1, 1, 0.96),
  createItem('107', "SAMA", "", "", "", "NON-ARMOURED CABLE", "XLPE/PVC", "4C X 70MM CU/XLPE/PVC Cable", "Meter", 140.66, 1, 1, 0.96),
  createItem('108', "SAMA", "", "", "", "NON-ARMOURED CABLE", "XLPE/PVC", "4C X 95MM CU/XLPE/PVC Cable", "Meter", 193.53, 1, 1, 0.96),
  createItem('109', "SAMA", "", "", "", "NON-ARMOURED CABLE", "XLPE/PVC", "4C X 120MM CU/XLPE/PVC Cable", "Meter", 253.41, 1, 1, 0.96),
  createItem('110', "SAMA", "", "", "", "NON-ARMOURED CABLE", "XLPE/PVC", "4C X 150MM CU/XLPE/PVC Cable", "Meter", 309.74, 1, 1, 0.96),
  createItem('111', "SAMA", "", "", "", "NON-ARMOURED CABLE", "XLPE/PVC", "4C X 185MM CU/XLPE/PVC Cable", "Meter", 400, 1, 1, 0.96),
  createItem('112', "SAMA", "", "", "", "NON-ARMOURED CABLE", "XLPE/PVC", "4C X 240MM CU/XLPE/PVC Cable", "Meter", 512.26, 1, 1, 0.96),
  createItem('113', "SAMA", "", "", "", "NON-ARMOURED CABLE", "XLPE/PVC", "4C X 300MM CU/XLPE/PVC Cable", "Meter", 651.35, 1, 1, 0.96),
  createItem('114', "SAMA", "", "", "", "NON-ARMOURED CABLE", "XLPE/PVC", "4C X 400MM CU/XLPE/PVC Cable", "Meter", 1024.1, 1, 1, 0.96),
  // --- ARMOURED CABLE ---
  createItem('115', "MEGA/SOUTHERN", "", "FOR TELD GROUP CHARGING COMMUNICATION USE", "", "ARMOURED CABLE", "PVC/AWA/PVC OR PVC/SWA/PVC", "4C X 1.5MM CU/PVC/OSCR/PVC CABLE ", "Meter", 11.99, 1, 1, 0.96),
  createItem('116', "MEGA/SOUTHERN", "", "", "", "ARMOURED CABLE", "PVC/AWA/PVC OR PVC/SWA/PVC", "3C X 6MM PVC/SWA/PVC CABLE", "Meter", 18.53, 1, 1, 0.96),
  createItem('117', "MEGA/SOUTHERN", "", "", "", "ARMOURED CABLE", "PVC/AWA/PVC OR PVC/SWA/PVC", "3C X 10MM PVC/SWA/PVC CABLE", "Meter", 21.23, 1, 1, 0.96),
  createItem('118', "MEGA/SOUTHERN", "", "", "", "ARMOURED CABLE", "PVC/AWA/PVC OR PVC/SWA/PVC", "4C X 6MM PVC/SWA/PVC CABLE", "Meter", 18.14, 1, 1, 0.96),
  createItem('119', "MEGA/SOUTHERN", "", "", "", "ARMOURED CABLE", "PVC/AWA/PVC OR PVC/SWA/PVC", "4C X 10MM PVC/SWA/PVC CABLE", "Meter", 27.5, 1, 1, 0.96),
  createItem('120', "MEGA/SOUTHERN", "", "", "", "ARMOURED CABLE", "XLPE/AWA/PVC ", "1C X 95MM XLPE/AWA/PVC CABLE ", "Meter", 65, 1, 1, 0.96),
  createItem('121', "MEGA/SOUTHERN", "", "", "", "ARMOURED CABLE", "XLPE/AWA/PVC ", "1C X 120MM XLPE/AWA/PVC CABLE", "Meter", 74, 1, 1, 0.96),
  createItem('122', "MEGA/SOUTHERN", "", "", "", "ARMOURED CABLE", "XLPE/AWA/PVC ", "1C X 150MM XLPE/AWA/PVC CABLE", "Meter", 87.36, 1, 1, 0.96),
  createItem('123', "MEGA/SOUTHERN", "", "", "", "ARMOURED CABLE", "XLPE/AWA/PVC ", "1C X 185MM XLPE/AWA/PVC CABLE", "Meter", 150, 1, 1, 0.96),
  createItem('124', "MEGA/SOUTHERN", "", "", "", "ARMOURED CABLE", "XLPE/AWA/PVC ", "1C X 240MM XLPE/AWA/PVC CABLE", "Meter", 183.2, 1, 1, 0.96),
  createItem('125', "MEGA/SOUTHERN", "", "", "", "ARMOURED CABLE", "XLPE/SWA/PVC ", "4C X 16MM XLPE/SWA/PVC CABLE", "Meter", 37.83, 1, 1, 0.96),
  createItem('126', "MEGA/SOUTHERN", "", "", "", "ARMOURED CABLE", "XLPE/SWA/PVC ", "4C X 25MM XLPE/SWA/PVC CABLE", "Meter", 57.51, 1, 1, 0.96),
  createItem('127', "MEGA/SOUTHERN", "", "", "", "ARMOURED CABLE", "XLPE/SWA/PVC ", "4C X 35MM XLPE/SWA/PVC CABLE", "Meter", 88.5, 1, 1, 0.96),
  createItem('128', "MEGA/SOUTHERN", "", "", "", "ARMOURED CABLE", "XLPE/SWA/PVC ", "4C X 50MM XLPE/SWA/PVC CABLE", "Meter", 100.84, 1, 1, 0.96),
  createItem('129', "MEGA/SOUTHERN", "", "", "", "ARMOURED CABLE", "XLPE/SWA/PVC ", "4C X 70MM XLPE/SWA/PVC CABLE", "Meter", 146.2, 1, 1, 0.96),
  createItem('130', "MEGA/SOUTHERN", "", "", "", "ARMOURED CABLE", "XLPE/SWA/PVC ", "4C X 95MM XLPE/SWA/PVC CABLE", "Meter", 215.8, 1, 1, 0.96),
  createItem('131', "MEGA/SOUTHERN", "", "", "", "ARMOURED CABLE", "XLPE/SWA/PVC ", "4C X 120MM XLPE/SWA/PVC CABLE", "Meter", 248.1, 1, 1, 0.96),
  createItem('132', "MEGA/SOUTHERN", "", "", "", "ARMOURED CABLE", "XLPE/SWA/PVC ", "4C X 150MM XLPE/SWA/PVC CABLE", "Meter", 304.55, 1, 1, 0.96),
  createItem('133', "MEGA/SOUTHERN", "", "", "", "ARMOURED CABLE", "XLPE/SWA/PVC ", "4C X 185MM XLPE/SWA/PVC CABLE", "Meter", 390, 1, 1, 0.96),
  createItem('134', "MEGA/SOUTHERN", "", "", "", "ARMOURED CABLE", "XLPE/SWA/PVC ", "4C X 240MM XLPE/SWA/PVC CABLE", "Meter", 505.5, 1, 1, 0.96),
  createItem('135', "SAMA", "", "", "", "ARMOURED CABLE", "ARMOURED WITH EARTHING", "4C X 4MM CU/XLPE/PVC/SWA/PVC Cable+ 4MM CU/PVC CPC Cable", "Meter", 28.96, 1, 1, 0.96),
  createItem('136', "SAMA", "", "", "", "ARMOURED CABLE", "ARMOURED WITH EARTHING", "4C X 6MM CU/XLPE/PVC/SWA/PVC Cable + 6MM CU/PVC CPC Cable", "Meter", 39.23, 1, 1, 0.96),
  createItem('137', "SAMA", "", "", "", "ARMOURED CABLE", "ARMOURED WITH EARTHING", "4C X 10MM CU/XLPE/PVC/SWA/PVC Cable + 10MM CU/PVC CPC Cable", "Meter", 54.5, 1, 1, 0.96),
  createItem('138', "SAMA", "", "", "", "ARMOURED CABLE", "ARMOURED WITH EARTHING", "4C X 16MM CU/XLPE/PVC/SWA/PVC Cable + 16MM CU/PVC CPC Cable", "Meter", 76.58, 1, 1, 0.96),
  createItem('139', "SAMA", "", "", "", "ARMOURED CABLE", "ARMOURED WITH EARTHING", "4C X 25MM CU/XLPE/PVC/SWA/PVC Cable + 16MM CU/PVC CPC Cable", "Meter", 113.15, 1, 1, 0.96),
  createItem('140', "SAMA", "", "", "", "ARMOURED CABLE", "ARMOURED WITH EARTHING", "4C X 35MM CU/XLPE/PVC/SWA/PVC Cable + 16MM CU/PVC CPC Cable", "Meter", 103.12, 1, 1, 0.96),
  createItem('141', "SAMA", "", "", "", "ARMOURED CABLE", "ARMOURED WITH EARTHING", "4C X 50MM CU/XLPE/PVC/SWA/PVC Cable + 25MM CU/PVC CPC Cable", "Meter", 117.63, 1, 1, 0.96),
  createItem('142', "SAMA", "", "", "", "ARMOURED CABLE", "ARMOURED WITH EARTHING", "4C X 70MM CU/XLPE/PVC/SWA/PVC Cable + 35MM CU/PVC CPC Cable", "Meter", 158.63, 1, 1, 0.96),
  createItem('143', "SAMA", "", "", "", "ARMOURED CABLE", "ARMOURED WITH EARTHING", "4C X 95MM CU/XLPE/PVC/SWA/PVC Cable + 50MM CU/PVC CPC Cable", "Meter", 217.78, 1, 1, 0.96),
  createItem('144', "SAMA", "", "", "", "ARMOURED CABLE", "ARMOURED WITH EARTHING", "4C X120MM CU/XLPE/PVC/SWA/PVC Cable + 70MM CU/PVC CPC Cable", "Meter", 288.01, 1, 1, 0.96),
  createItem('145', "SAMA", "", "", "", "ARMOURED CABLE", "ARMOURED WITH EARTHING", "4C X 150MM sq CU/XLPE/PVC/SWA/PVC Cable + 95MM CU/PVC CPC Cable", "Meter", 355.93, 1, 1, 0.96),
  createItem('146', "SAMA", "", "", "", "ARMOURED CABLE", "ARMOURED WITH EARTHING", "4C X 185MM CU/XLPE/PVC/SWA/PVC Cable + 95MM CU/PVC CPC Cable", "Meter", 425.84, 1, 1, 0.96),
  createItem('147', "SAMA", "", "", "", "ARMOURED CABLE", "ARMOURED WITH EARTHING", "4C X 240MM CU/XLPE/PVC/SWA/PVC Cable + 120MM CU/PVC CPC Cable", "Meter", 572.97, 1, 1, 0.96),
  createItem('148', "SAMA", "", "", "", "ARMOURED CABLE", "ARMOURED WITH EARTHING", "4C X 300MM CU/XLPE/PVC/SWA/PVC Cable + 150MM CU/PVC CPC Cable", "Meter", 727.84, 1, 1, 0.96),
  createItem('149', "SAMA", "", "", "", "ARMOURED CABLE", "ARMOURED WITH EARTHING", "4C X 400MM CU/XLPE/PVC/SWA/PVC Cable + 240MM CU/PVC CPC Cable", "Meter", 1175.63, 1, 1, 0.96),
  // --- ELECTRICAL PARTS ---
  createItem('150', "PVCLINK", "2282082", "PCC 20-W", "", "ELECTRICAL PARTS", "CABLE SUPPORT ", "PVC FLEXIBLE CONDUIT 20MM WHITE", "Meter", 0.8, 1, 1, 1),
  createItem('151', "PVCLINK", "2089263", "PCC 25-W", "", "ELECTRICAL PARTS", "CABLE SUPPORT ", "PVC FLEXIBLE CONDUIT 25MM (1'') WHITE", "Meter", 1.21, 1, 1, 1),
  createItem('152', "PLASMA", "2222162", "2222162", "", "ELECTRICAL PARTS", "CABLE SUPPORT ", "GI FLEXIBLE CONDUIT 20MM (3/4\")", "Meter", 3.51, 1, 1, 1),
  createItem('153', "PLASMA", "2434578", "2434578", "", "ELECTRICAL PARTS", "CABLE SUPPORT ", "GI FLEXIBLE CONDUIT 25MM (1\")", "Meter", 5.47, 1, 1, 1),
  createItem('154', "PVCLINK", "2157148", "PH 20", "", "ELECTRICAL PARTS", "CABLE SUPPORT ", "PVC PIPE 20MM (3/4'') WHITE", "Meter", 4.36, 1, 1, 1),
  createItem('155', "PVCLINK", "2157150", "PH 25", "", "ELECTRICAL PARTS", "CABLE SUPPORT ", "PVC PIPE 25MM (1'') WHITE", "Unit", 5.84, 1, 1, 1),
  createItem('156', "WIREMAN", "", "", "", "ELECTRICAL PARTS", "CABLE SUPPORT ", "PVC MINI TRUNKING 50MMX16MM (2\"X5/8\") WHITE", "Unit", 6.7, 1, 1, 1),
  createItem('157', "PVCLINK", "2020115", "PMT 5575", "", "ELECTRICAL PARTS", "CABLE SUPPORT ", "PVC MODULAR TRUNKING 75MM X 55MM", "Meter", 27.64, 1, 1, 1),
  createItem('158', "ULI", "2027297", "UL/TG/ST-2/2", "", "ELECTRICAL PARTS", "CABLE SUPPORT ", "EPOXY POWDER COATING METAL TRUNKING G18 2\"X2\" ORANGE", "Meter", 21.57, 1, 1, 1),
  createItem('159', "ULI", "2063465", "UL/TG/ST-2/3", "", "ELECTRICAL PARTS", "CABLE SUPPORT ", "EPOXY POWDER COATING METAL TRUNKING G18 2\"X3\" ORANGE", "Meter", 25.2, 1, 1, 1),
  createItem('160', "ULI", "", "", "", "ELECTRICAL PARTS", "CABLE SUPPORT ", "HDG CABLE TRAY G18 2\"X2\" 1.2MMT", "Meter", 27.2, 1, 1, 1),
  createItem('161', "ULI", "", "", "", "ELECTRICAL PARTS", "CABLE SUPPORT ", "HDG CABLE TRAY G18 2\"X3\" 1.2MMT", "Meter", 31, 1, 1, 1),
  createItem('162', "ULI", "2415648", "UL/LZ/ST/4-6", "", "ELECTRICAL PARTS", "CABLE SUPPORT ", "HDG CABLE LADDER G14 4\"X6\"X3M(L)", "Meter", 171.24, 1, 1, 1),
  createItem('163', "BBB", "", "", "", "ELECTRICAL PARTS", "CABLE SUPPORT ", "160MM X 6M HDPE PN10 PIPE", "Meter", 45, 1, 1, 1),
  createItem('164', "PVCLINK", "2067494", "PCS-120F-G", "", "ELECTRICAL PARTS", "CABLE SUPPORT ", "PVC SLAB FLAT 4\" GREEN", "Meter", 3.6, 1, 1, 1),
  createItem('165', "NONE", "", "", "", "ELECTRICAL PARTS", "CABLE SUPPORT ", "ACCESSORIES (HOME)", "Lot", 20, 1, 1, 1),
  createItem('166', "NONE", "", "", "", "ELECTRICAL PARTS", "CABLE SUPPORT ", "ACCESSORIES (COMMERCIAL)", "Lot", 100, 1, 1, 1),
  createItem('167', "PLASMA", "", "PWHD-35A", "", "ELECTRICAL PARTS", "ISOLATOR", "WEATHER PROOF ISOLATOR 35A 3P (STANDARD)", "Unit", 65.3, 1, 1, 1),
  createItem('168', "PLASMA", "2166877", "PWHD-35A", "", "ELECTRICAL PARTS", "ISOLATOR", "WEATHER PROOF ISOLATOR 35A 2P", "Unit", 44.15, 1, 1, 1),
  createItem('169', "SCHNEIDER", "2021258", "WHD35 GY", "", "ELECTRICAL PARTS", "ISOLATOR", "WEATHER PROOF ISOLATOR SWITCH IP66 2P 35A", "Unit", 40, 1, 1, 1),
  createItem('170', "SCHNEIDER", "2533078", "WHT20_G11", "", "ELECTRICAL PARTS", "ISOLATOR", "WEATHER PROOF ISOLATOR SWITCH IP66 3P 20A", "Unit", 59.81, 1, 1, 1),
  createItem('171', "SCHNEIDER", "2533079", "WHT35_G11", "", "ELECTRICAL PARTS", "ISOLATOR", "WEATHER PROOF ISOLATOR SWITCH IP66 3P 35A", "Unit", 61.94, 1, 1, 1),
  createItem('172', "SCHNEIDER", "2533080", "WHT63_G11", "", "ELECTRICAL PARTS", "ISOLATOR", "KAVACHA WEATHER PROOF ISOLATOR SWITCH IP66 3P 63A", "Unit", 144.54, 1, 1, 1),
  createItem('173', "SCHNEIDER", "2025010", "LV429387", "", "ELECTRICAL PARTS", "ISOLATOR", "SHUNT TRIP VOLTAGE RELEASE MX 208-277V 60HZ 220-240V 50/60HZ", "Unit", 142.44, 1, 1, 1),
  createItem('174', "SCHNEIDER", "2027553", "LV429451", "", "ELECTRICAL PARTS", "ISOLATOR", "TRIP UNIT ACCESSORY SDE ADAPTOR FOR NSX100-250 (X 10PCS)", "Unit", 43.84, 1, 1, 1),
  createItem('175', "PVCLINK", "2026228", "PEB 644-PC-T", "", "ELECTRICAL PARTS", "INDOOR ENCLOSURE BOX", "WEATHERPROOF ENCLOSURE BOX W/TP COVER 155MM X 115MM X 110M", "Unit", 43.46, 1, 1, 1),
  createItem('176', "PVCLINK", "2074736", "PEB 864-PC-T", "", "ELECTRICAL PARTS", "INDOOR ENCLOSURE BOX", "WEATHERPROOF ENCLOSURE BOX W/TP COVER 215MM X 150MM X 110MM", "Unit", 66.49, 1, 1, 1),
  createItem('177', "PVCLINK", "2010314", "PEB 1084", "", "ELECTRICAL PARTS", "INDOOR ENCLOSURE BOX", "WEATHERPROOF ENCLOSURE BOX 250MM X200MM X 110MM", "Unit", 12.45, 1, 1, 1),
  createItem('178', "PVCLINK", "2020108", "PEB 884", "", "ELECTRICAL PARTS", "INDOOR ENCLOSURE BOX", "WEATHERPROOF ENCLOSURE BOX 215MM X 215MM X 110MM", "Unit", 15.82, 1, 1, 1),
  createItem('179', "PVCLINK", "2020105", "PEB 1086", "", "ELECTRICAL PARTS", "INDOOR ENCLOSURE BOX", "WEATHERPROOF ENCLOSURE BOX 250MM X 200MM X 160MM", "Unit", 22.63, 1, 1, 1),
  createItem('180', "PVCLINK", "2161953", "PL 06-10S", "", "ELECTRICAL PARTS", "INDOOR ENCLOSURE BOX", "MCB BOX 10 WAYS 222 X 146 X 98MM (SMOKE)", "Unit", 12.05, 1, 1, 1),
  createItem('181', "PVCLINK", "2073028", "PL 08-12T", "", "ELECTRICAL PARTS", "INDOOR ENCLOSURE BOX", "MCB BOX 12 WAYS 256 X 176 X 98MM (TRANSPARENT)", "Unit", 13.82, 1, 1, 1),
  createItem('182', "PVCLINK", "2073029", "PL 12-16T", "", "ELECTRICAL PARTS", "INDOOR ENCLOSURE BOX", "MCB BOX 16 WAYS 327 X 176 X 98MM (TRANSPARENT)", "Unit", 17.16, 1, 1, 1),
  createItem('183', "THAM CHEE", "", "", "", "ELECTRICAL PARTS", "INDOOR ENCLOSURE BOX", "PVC MCB BOX FOR SURFACE TYPE 9WAY", "Unit", 8.82, 1, 1, 1),
  createItem('184', "EPS", "2115869", "EL2M 2N", "", "ELECTRICAL PARTS", "OUTDOOR ENCLOSURE BOX", "DISTRIBUTION BOARD 2 ROW 24 WAYS", "Unit", 159.58, 1, 1, 1),
  createItem('185', "EPS", "2002146", "EL3M 2N", "", "ELECTRICAL PARTS", "OUTDOOR ENCLOSURE BOX", "DISTRIBUTION BOARD 3 ROW 46 WAYS", "Unit", 263.66, 1, 1, 1),
  createItem('186', "CVS", "2053836", "CR404020", "", "ELECTRICAL PARTS", "OUTDOOR ENCLOSURE BOX", "METAL BOX 400MM X 400MM X 200MM", "Unit", 178.76, 1, 1, 1),
  createItem('187', "CVS", "2056171", "CR604020", "", "ELECTRICAL PARTS", "OUTDOOR ENCLOSURE BOX", "METAL BOX 600MM X 400MM X 200MM", "Unit", 222.65, 1, 1, 1),
  createItem('188', "CVS", "2064627", "CR705025", "", "ELECTRICAL PARTS", "OUTDOOR ENCLOSURE BOX", "METAL BOX 700MM X 500MM X 250MM", "Unit", 345.2, 1, 1, 1),
  createItem('189', "HUAWEI", "2405705", "DDSU666-H", "", "ELECTRICAL PARTS", "EVDB ADD ON & ACCESSORIES", "SMART POWER SENSOR SINGLE PHASE 2 WIRES", "Unit", 234.55, 1, 1, 1),
  createItem('190', "MIKRO", "2014396", "DM38", "", "ELECTRICAL PARTS", "EVDB ADD ON & ACCESSORIES", "DIGITAL POWER METER 70-300 VAC", "Unit", 417.49, 1, 1, 1),
  createItem('191', "ASAHI", "2049662", "CL3-5VA-40/5", "", "ELECTRICAL PARTS", "EVDB ADD ON & ACCESSORIES", "CURRENT TRANSFORMER CLASS 3 5VA RATIO:40/5A", "Unit", 16.79, 1, 1, 1),
  createItem('192', "DELAB", "2210336", "PQM-1000S", "", "ELECTRICAL PARTS", "EVDB ADD ON & ACCESSORIES", "PQM-1000S POWER QUALITY NETWORK ANALYZER", "Unit", 356.34, 1, 1, 1),
  createItem('193', "", "2044280", "SZ22C40-LER", "", "ELECTRICAL PARTS", "EVDB ADD ON & ACCESSORIES", "LED PILOT LIGHT 22MM 240V RED", "Unit", 2.78, 1, 1, 1),
  createItem('194', "", "2020315", "SZ22C60-LEB", "", "ELECTRICAL PARTS", "EVDB ADD ON & ACCESSORIES", "LED PILOT LIGHT 22MM 240V BLUE", "Unit", 4.61, 1, 1, 1),
  createItem('195', "", "2018201", " SZ22C50-LEY", "", "ELECTRICAL PARTS", "EVDB ADD ON & ACCESSORIES", "LED PILOT LIGHT 22MM 240V YELLOW", "Unit", 2.88, 1, 1, 1),
  createItem('196', "", "2209978", "DP-34-024D", "", "ELECTRICAL PARTS", "EVDB ADD ON & ACCESSORIES", "EARTH FAULT & OVERCURRENT RELAY IDMT (DP-34-024D), DC18-72V", "Unit", 849.83, 1, 1, 1),
  createItem('197', "CVS", "", "", "", "ELECTRICAL PARTS", "EVDB ADD ON & ACCESSORIES", "INNER DOOR", "Unit", 100, 1, 1, 1),
  createItem('198', "CVS", "", "", "", "ELECTRICAL PARTS", "EVDB ADD ON & ACCESSORIES", "POLY DOOR", "Unit", 130, 1, 1, 1),
  createItem('199', "CVS", "", "", "", "ELECTRICAL PARTS", "EVDB ADD ON & ACCESSORIES", "CANOPY", "Unit", 60, 1, 1, 1),
  createItem('200', "SCHNEIDER", "2098735", "EZC100F3020", "", "ELECTRICAL PARTS", "MCCB", "EASYPACT EZC100F TMD MCCB 3P 20A 10KA MC", "Unit", 109.67, 1, 1, 1),
  createItem('201', "SCHNEIDER", "2072331", "EZC100F3025", "", "ELECTRICAL PARTS", "MCCB", "EASYPACT EZC100F TMD MCCB 3P 3D 25A 10KA MC", "Unit", 109.67, 1, 1, 1),
  createItem('202', "SCHNEIDER", "2098738", "EZC100F3040", "", "ELECTRICAL PARTS", "MCCB", "EASYPACT EZC100F TMD MCCB 3P 40A 10KA MC", "Unit", 109.67, 1, 1, 1),
  createItem('203', "SCHNEIDER", "2098739", "EZC100F3050", "", "ELECTRICAL PARTS", "MCCB", "EASYPACT EZC100F TMD MCCB 3P 3D 50A 10KA MC", "Unit", 109.67, 1, 1, 1),
  createItem('204', "SCHNEIDER", "2052690", "EZC100F3060", "", "ELECTRICAL PARTS", "MCCB", "EASYPACT EZC100F TMD MCCB 63A 3P", "Unit", 118.5, 1, 1, 1),
  createItem('205', "SCHNEIDER", "2052691", "EZC100F3075", "", "ELECTRICAL PARTS", "MCCB", "EASYPACT EZC100F TMD MCCB 75A 3P", "Unit", 129.12, 1, 1, 1),
  createItem('206', "SCHNEIDER", "2098741", "EZC100F3080", "", "ELECTRICAL PARTS", "MCCB", "EASYPACT EZC100F TMD MCCB 3P 80A 10KA MC", "Unit", 109.67, 1, 1, 1),
  createItem('207', "SCHNEIDER", "2098742", "EZC100F3100", "", "ELECTRICAL PARTS", "MCCB", "EASYPACT EZC100F TMD MCCB 3P 100A 10KA MC", "Unit", 109.67, 1, 1, 1),
  createItem('208', "SCHNEIDER", "2094278", "LV516462", "", "ELECTRICAL PARTS", "MCCB", "EASYPACT CVS160N MCCB 3P 125A", "Unit", 427.31, 1, 1, 1),
  createItem('209', "SCHNEIDER", "2068347", "LV516463", "", "ELECTRICAL PARTS", "MCCB", "EASYPACT CVS160N MCCB 3P 160A", "Unit", 427.31, 1, 1, 1),
  createItem('210', "SCHNEIDER", "2068348", "LV525452", "", "ELECTRICAL PARTS", "MCCB", "EASYPACT CVS250N MCCB 3P 200A", "Unit", 600.87, 1, 1, 1),
  createItem('211', "SCHNEIDER", "2068349", "LV525453", "", "ELECTRICAL PARTS", "MCCB", "EASYPACT CVS250N MCCB 3P 250A", "Unit", 600.87, 1, 1, 1),
  createItem('212', "SCHNEIDER", "2082852", "EZC400N3320N", "", "ELECTRICAL PARTS", "MCCB", "EASYPACT EZC400N CIRCUIT BREAKER TMD 320A 3 POLES 3D", "Unit", 806.14, 1, 1, 1),
  createItem('213', "SCHNEIDER", "2092572", "EZC400N3350N", "", "ELECTRICAL PARTS", "MCCB", "MCCB 3P EZC400N 350AT/400AF 36KA 415VAC", "Unit", 996.6, 1, 1, 1),
  createItem('214', "SCHNEIDER", "2104601", "EZC400N3400N", "", "ELECTRICAL PARTS", "MCCB", "EASYPACT EZC400N TMD MCCB 400A 3P 3D", "Unit", 806.14, 1, 1, 1),
  createItem('215', "SCHNEIDER", "2151574", "EZ9F56240", "", "ELECTRICAL PARTS", "MCB", "HIMEL MCB 2P 40A 6KA 230V C CURVE", "Unit", 14.5, 1, 1, 1),
  createItem('216', "TERASAKI", "", "TER-TMC06403", "", "ELECTRICAL PARTS", "MCB", "TEMLITE 40A 2P 6KA MCB", "Unit", 18, 1, 1, 1),
  createItem('217', "HAGER", "2017533", "NC106A", "", "ELECTRICAL PARTS", "MCB", "MCB 1P 6A 10KA C CURVE", "Unit", 32.04, 1, 1, 1),
  createItem('218', "SCHNEIDER", "2151574", "EZ9F56240", "", "ELECTRICAL PARTS", "MCB", "EASY 9 MCB 2P 40A 6KA 230V C CURVE", "Unit", 27.33, 1, 1, 1),
  createItem('219', "SCHNEIDER", "2151574", "EZ9F56240", "", "ELECTRICAL PARTS", "MCB", "HIMEL MCB 4P 40A 6KA 230V C CURVE", "Unit", 37.35, 1, 1, 1),
  createItem('220', "SCHNEIDER", "2145848", "EZ9F56320", "", "ELECTRICAL PARTS", "MCB", "EASY 9 MCB 3P 20A 6KA 400V C CURVE", "Unit", 35.71, 1, 1, 1),
  createItem('221', "SCHNEIDER", "2145851", "EZ9F56340", "", "ELECTRICAL PARTS", "MCB", "EASY 9 MCB 3P 40A 6KA 400V C CURVE", "Unit", 42.62, 1, 1, 1),
  createItem('222', "SCHNEIDER", "2145852", "EZ9F56363", "", "ELECTRICAL PARTS", "MCB", "EASY 9 MCB 3P 63A 6KA 400V C CURVE", "Unit", 51, 1, 1, 1),
  createItem('223', "TERASAKI", "", "TER-TMC06403", "", "ELECTRICAL PARTS", "MCB", "TEMLITE 40A 4P 6KA MCB", "Unit", 48, 1, 1, 1),
  createItem('224', "TERASAKI", "", "TER-TMC06403", "", "ELECTRICAL PARTS", "MCB", "TERASAKI 40A 3P 6KA MCB", "Unit", 32.34, 1, 1, 1),
  createItem('225', "", "", "", "", "ELECTRICAL PARTS", "MCB", "JMS MCB TYPE-C 40A 3P 6KA", "Unit", 23.4, 1, 1, 1),
  createItem('226', "", "", "", "", "ELECTRICAL PARTS", "RCCB", "HIMEL RCCB 2P 40A 30MA TYPE A", "Unit", 79.5, 1, 1, 1),
  createItem('227', "TERASAKI", "", "TER-TMC06403", "", "ELECTRICAL PARTS", "RCCB", "TEMLITE 40A 2P RCCB TYPE A", "Unit", 85, 1, 1, 1),
  createItem('228', "SCHNEIDER", "2145854", "EZ9R36240", "", "ELECTRICAL PARTS", "RCCB", "EASY 9 RCCB 2P 40A 30MA 230V AC TYPE", "Unit", 57.17, 1, 1, 1),
  createItem('229', "SCHNEIDER", "2354971", "A9R51240", "", "ELECTRICAL PARTS", "RCCB", "ACTI 9 ILD RCCB 2P 40A 30MA TYPE A", "Unit", 200, 1, 1, 1),
  createItem('230', "", "", "", "", "ELECTRICAL PARTS", "RCCB", "HIMEL RCCB 4P 40A 30MA TYPE A", "Unit", 112.5, 1, 1, 1),
  createItem('231', "TERASAKI", "", "TER-TMC06403", "", "ELECTRICAL PARTS", "RCCB", "TEMLITE 40A 4P RCCB TYPE A", "Unit", 110, 1, 1, 1),
  createItem('232', "SCHNEIDER", "2355046", "EZ9R36425", "25", "ELECTRICAL PARTS", "RCCB", "EASY 9 RCCB 4P 25A 30MA 400V AC TYPE", "Unit", 126.91, 1, 1, 1),
  createItem('233', "SCHNEIDER", "2145856", "EZ9R36440", "40", "ELECTRICAL PARTS", "RCCB", "EASY 9 RCCB 4P 40A 30MA 400V AC TYPE", "Unit", 142.83, 1, 1, 1),
  createItem('234', "SCHNEIDER", "2143308", "EZ9R36463", "63", "ELECTRICAL PARTS", "RCCB", "EASY 9 RCCB 4P 63A 30MA 400V AC TYPE", "Unit", 214.66, 1, 1, 1),
  createItem('235', "SCHNEIDER", "2354974", "A9R51440", "40", "ELECTRICAL PARTS", "RCCB", "ACTI 9 ILD RCCB 4P 40A 30MA TYPE A", "Unit", 220, 1, 1, 1),
  createItem('236', "", "", "", "40", "ELECTRICAL PARTS", "RCCB", "TERASAKI RCCB 40A 4P 30MA TYPE A", "Unit", 143.3, 1, 1, 1),
  createItem('237', "TERASAKI", "", "TER-TMR104040030A", "40", "ELECTRICAL PARTS", "RCCB", "TERASAKI 40A 4P 30MA TYPE A RCCB", "Unit", 143.3, 1, 1, 1),
  createItem('238', "TERASAKI", "", "TMR104063030A", "63", "ELECTRICAL PARTS", "RCCB", "TERASAKI RCCB 63A 4P 30MA TYPE A", "Unit", 156.27, 1, 1, 1),
  createItem('239', "TERASAKI", "2056862", "EPR4100100AC", "100", "ELECTRICAL PARTS", "RCCB", "EPR SERIES ELCB 100A 4P 100MA", "Unit", 200, 1, 1, 1),
  // --- PROTECTION EQUIPMENT FOR DC ---
  createItem('240', "NOVARIS", "2395160", "NSP1-40-320-N", "", "PROTECTION EQUIPMENT FOR DC", "SURGE PROTECTION DEVICE", "NSP SURGE DIVERTER 1PHASE IN 20KA IMAX 40KA 320V", "Unit", 143.56, 1, 1, 1),
  createItem('241', "NOVARIS", "2395161", "NSP3-40-320-N", "", "PROTECTION EQUIPMENT FOR DC", "SURGE PROTECTION DEVICE", "NSP SURGE DIVERTER 3PHASE IN 20KA IMAX 40KA 320V", "Unit", 143.3, 1, 1, 1),
  createItem('242', "TERASAKI", "2010723", "T2SH00LA20WB", "", "PROTECTION EQUIPMENT FOR DC", "SHUNT TRIP", "HM1-100/ST SHUNT TRIP EPS (FOR MCCB UP TO 100A)", "Unit", 41.3, 1, 1, 1),
  createItem('243', "TERASAKI", "2010723", "T2SH00LA20WB", "", "PROTECTION EQUIPMENT FOR DC", "SHUNT TRIP", "SHUNT TRIP FOR S100SF S160SCF E160SF E250SF S250SF MCCB", "Unit", 67.4, 1, 1, 1),
  createItem('244', "SCHNEIDER", "2025010", "LV429387", "", "PROTECTION EQUIPMENT FOR DC", "SHUNT TRIP", "SHUNT TRIP VOLTAGE RELEASE MX 208-277V 60HZ 220-240V 50/60HZ", "Unit", 4000, 1, 1, 1),
  createItem('245', "SCHNEIDER", "2027553", "LV429451", "", "PROTECTION EQUIPMENT FOR DC", "SHUNT TRIP", "TRIP UNIT ACCESSORY SDE ADAPTOR FOR NSX100-250 (X 10PCS)", "Unit", 43.84, 1, 1, 1),
  createItem('246', "SCHNEIDER", "2018040", "EZASHT200AC", "", "PROTECTION EQUIPMENT FOR DC", "SHUNT TRIP", "SHUNT TRIP RELEASE SHT 200-277VAC FOR EZC400", "Unit", 120.89, 1, 1, 1),
  createItem('247', "MIKRO", "2014396", "DM38", "", "PROTECTION EQUIPMENT FOR DC", "DPM", "DIGITAL POWER METER 70-300 VAC", "Unit", 417.49, 1, 1, 1),
  createItem('248', "DELAB", "2210336", "PQM-1000S", "", "PROTECTION EQUIPMENT FOR DC", "DPM", "PQM-1000S POWER QUALITY NETWORK ANALYZER", "Unit", 356.34, 1, 1, 1),
  createItem('249', "ASAHI", "2049662", "CL3-5VA-40/5", "", "PROTECTION EQUIPMENT FOR DC", "CT", "CURRENT TRANSFORMER CLASS 3 5VA RATIO:40/5A", "Unit", 16.79, 1, 1, 1),
  createItem('250', "", "2044280", "SZ22C40-LER", "", "PROTECTION EQUIPMENT FOR DC", "PILOT LIGHT", "LED PILOT LIGHT 22MM 240V RED", "Unit", 2.78, 1, 1, 1),
  createItem('251', "", "2020315", "SZ22C60-LEB", "", "PROTECTION EQUIPMENT FOR DC", "PILOT LIGHT", "LED PILOT LIGHT 22MM 240V BLUE", "Unit", 4.61, 1, 1, 1),
  createItem('252', "", "2018201", " SZ22C50-LEY", "", "PROTECTION EQUIPMENT FOR DC", "PILOT LIGHT", "LED PILOT LIGHT 22MM 240V YELLOW", "Unit", 2.88, 1, 1, 1),
  createItem('253', "", "2209978", "DP-34-024D", "", "PROTECTION EQUIPMENT FOR DC", "EFOC", "EARTH FAULT & OVERCURRENT RELAY IDMT (DP-34-024D), DC18-72V", "Unit", 849.83, 1, 1, 1),
  createItem('254', "DELAB", "2209978", "DP-31", "", "PROTECTION EQUIPMENT FOR DC", "EFOC", "EARTH FAULT RELAY IDMT DP-31", "Unit", 243.87, 1, 1, 1),
  createItem('255', "", "2094211", "LATG100", "Lead 41", "PROTECTION EQUIPMENT FOR DC", "EARTHING", "AIR TERMINAL ROD 1000MM X 16MM", "Unit", 76.8, 1, 1, 1),
  createItem('256', "", "2393447", "ATG150", "Lead 23", "PROTECTION EQUIPMENT FOR DC", "EARTHING", "AIR TERMINAL ROD 500MM X 16MM", "Unit", 183, 1, 1, 1),
  createItem('257', "", "2041509", "ATBG160", "Ex stock", "PROTECTION EQUIPMENT FOR DC", "EARTHING", "AIR TERMINAL BASE 16MM", "Unit", 52.8, 1, 1, 1),
  createItem('258', "", "2030220", "BMG253", "Ex stock", "PROTECTION EQUIPMENT FOR DC", "EARTHING", "BI-METALLIC CONNECTOR 25MM X 3MM (INTERCONNECT CU & AL)", "Unit", 91, 1, 1, 1),
  createItem('259', "Lock the tape", "2031378", "DCG253", "Ex stock", "PROTECTION EQUIPMENT FOR DC", "EARTHING", "DC TAPE CLIP 25MM X 3MM", "Unit", 8.16, 1, 1, 1),
  createItem('260', "For disconnection testing", "2053009", "OTBG268", "Lead 50 ", "PROTECTION EQUIPMENT FOR DC", "EARTHING", "OBLONG TEST CLAMP 26MM X 8MM", "Unit", 41.6, 1, 1, 1),
  createItem('261', "Use at roof", "2028022", "BAG253", "Ex stock ", "PROTECTION EQUIPMENT FOR DC", "EARTHING", "BARE ALUMINIUM TAPE 25MM X 3MM (73M/ROLL)", "Meter", 4.63, 1, 1, 1),
  createItem('262', "Use nearby ground", "2031375", "BCG253", "Ex stock", "PROTECTION EQUIPMENT FOR DC", "EARTHING", "BARE COPPER TAPE 25MM X 3MM 80M±", "Meter", 40, 1, 1, 1),
  createItem('263', "EARTH CHAMBER SET", "2049677", "EBBG061", "Lead time 23 days", "PROTECTION EQUIPMENT FOR DC", "EARTHING", "EARTH BAR 6 WAY C/W 1 DISCONNECTING LINK 40MM X 6MM X 420MM", "Unit", 260.7, 1, 1, 1),
  createItem('264', "", "2030221", "CRG1615", "Ex stock", "PROTECTION EQUIPMENT FOR DC", "EARTHING", "COPPER BOND ROD 5/8\" X 1.5M", "Unit", 47.7, 1, 1, 1),
  createItem('265', "", "2047996", "CPG062", "Ex stock", "PROTECTION EQUIPMENT FOR DC", "EARTHING", "COUPLING 5/8\"", "Unit", 16.3, 1, 1, 1),
  createItem('266', "", "2041513", "CIPG282", "Ex stock", "PROTECTION EQUIPMENT FOR DC", "EARTHING", "CONCRETE EARTH CHAMBER W/ALUM PLATE 282MM X 282MM X 195MM", "Unit", 47.9, 1, 1, 1),
  createItem('267', "", "2026426", "ERG1625", "Ex stock", "PROTECTION EQUIPMENT FOR DC", "EARTHING", "ROD TO TAPE CLAMP 5/8\" X 25MM", "Unit", 15.9, 1, 1, 1),
  createItem('268', "BELDEN", "2339313", "7834ANC 008U1000", "", "PROTECTION EQUIPMENT FOR DC", "INTERNET CABLE & ACCESSORIES", "CAT6 UTP 23AWG SOLID BARE COPPER COND LSZH JACKET GY (1000FT/ROLL)", "Meter", 4, 1, 1, 1),
  createItem('269', "BELDEN", "2008727", "AP700008", "", "PROTECTION EQUIPMENT FOR DC", "INTERNET CABLE & ACCESSORIES", "RJ45-CONNECTOR UTP CAT6 100 OHM STRAIGHT MALE (PLUG) (50PCS/PKT)", "Unit", 1.36, 1, 1, 1),
  createItem('270', "", "", "", "", "PROTECTION EQUIPMENT FOR DC", "INTERNET CABLE & ACCESSORIES", "4G LTE TELTOPNIKA ROUTER", "Unit", 670, 1, 1, 1),
  createItem('271', "", "", "", "", "PROTECTION EQUIPMENT FOR DC", "INTERNET CABLE & ACCESSORIES", "TELTONIKA UNMANAGED SWITCH 8PORT TSW 202", "Unit", 599, 1, 1, 1),
  createItem('272', "", "", "", "", "PROTECTION EQUIPMENT FOR DC", "INTERNET CABLE & ACCESSORIES", "WEATHERPROOF ENCLOSURE BOX 310MM X 230MM X 145MM", "Unit", 38.7, 1, 1, 1),
  createItem('273', "", "", "", "", "PROTECTION EQUIPMENT FOR DC", "INTERNET CABLE & ACCESSORIES", "4G LTE SIM CARD SUBSCRIPTION (MAXIS/DIGI)", "Month", 40, 1, 1, 1),
  // --- LABOUR & CIVIL ---
  createItem('274', "", "", "", "", "LABOUR & CIVIL", "AC INSTALLATION (HOME)", "LABOUR COST", "Lot", 500, 1, 1, 1),
  createItem('275', "", "", "", "", "LABOUR & CIVIL", "AC INSTALLATION (HOME)", "CUT CEILING ", "Lot", 150, 1, 1, 1),
  createItem('276', "", "", "", "", "LABOUR & CIVIL", "AC INSTALLATION (HOME)", "WALL HACKING", "Lot", 300, 1, 1, 1),
  createItem('277', "", "", "", "", "LABOUR & CIVIL", "AC INSTALLATION (HOME)", "FUEL", "Lot", 50, 1, 1, 1),
  createItem('278', "", "", "", "", "LABOUR & CIVIL", "AC INSTALLATION (HOME)", "TOLL", "Lot", 50, 1, 1, 1),
  createItem('279', "", "", "", "", "LABOUR & CIVIL", "AC INSTALLATION (HOME)", "EV RENT", "Lot", 850, 1, 1, 1),
  createItem('280', "", "", "", "", "LABOUR & CIVIL", "AC INSTALLATION (HOME)", "TOOLS & ACCESSORIES", "Lot", 50, 1, 1, 1),
  createItem('281', "", "", "", "", "LABOUR & CIVIL", "AC INSTALLATION (COMMERCIAL)", "AC CHARGER INSTALLATION & LABOUR FEE", "Lot", 1600, 1, 1, 1),
  createItem('282', "", "", "", "", "LABOUR & CIVIL", "AC INSTALLATION (COMMERCIAL)", "EVDB INSTALLATION (COMMERCIAL)", "Lot", 200, 1, 1, 1),
  createItem('283', "", "", "", "", "LABOUR & CIVIL", "AC INSTALLATION (COMMERCIAL)", "PEDESTAL STAND INSTALLATION", "Lot", 100, 1, 1, 1),
  createItem('284', "", "", "", "", "LABOUR & CIVIL", "AC INSTALLATION (COMMERCIAL)", "STAND CONCRETE PLINTH", "Lot", 300, 1, 1, 1),
  createItem('285', "", "", "", "", "LABOUR & CIVIL", "AC INSTALLATION (COMMERCIAL)", "EVDB ASSEMBLY (COMMERCIAL)", "Lot", 100, 1, 1, 1),
  createItem('286', "", "", "", "", "LABOUR & CIVIL", "AC INSTALLATION (COMMERCIAL)", "EXCAVATION & MAKE GOOD (GREEN AREA)", "Meter", 40, 1, 1, 1),
  createItem('287', "", "", "", "", "LABOUR & CIVIL", "AC INSTALLATION (COMMERCIAL)", "EXCAVATION & MAKE GOOD (TILES)", "Meter", 60, 1, 1, 1),
  createItem('288', "", "", "", "", "LABOUR & CIVIL", "AC INSTALLATION (COMMERCIAL)", "EXCAVATION & MAKE GOOD (CONCRETE)", "Meter", 40, 1, 1, 1),
  createItem('289', "", "", "", "", "LABOUR & CIVIL", "AC INSTALLATION (COMMERCIAL)", "EXCAVATION & MAKE GOOD (ASPALT ROAD)", "Meter", 200, 1, 1, 1),
  createItem('290', "", "", "", "", "LABOUR & CIVIL", "AC INSTALLATION (COMMERCIAL)", "CONCEAL WORK", "Lot", 40, 1, 1, 1),
  createItem('291', "", "", "", "", "LABOUR & CIVIL", "AC INSTALLATION (COMMERCIAL)", "CEILING MAKE GOOD", "Lot", 150, 1, 1, 1),
  createItem('292', "", "", "", "", "LABOUR & CIVIL", "AC INSTALLATION (COMMERCIAL)", "CABLE + CONDUIT", "Meter", 10, 1, 1, 1),
  createItem('293', "", "", "", "", "LABOUR & CIVIL", "AC INSTALLATION (COMMERCIAL)", "CABLE + TRUNKING", "Meter", 20, 1, 1, 1),
  createItem('294', "", "", "", "", "LABOUR & CIVIL", "AC INSTALLATION (COMMERCIAL)", "CABLE + TRAY", "Meter", 30, 1, 1, 1),
  createItem('295', "", "", "", "", "LABOUR & CIVIL", "AC INSTALLATION (COMMERCIAL)", "MANTAINANCE (per year)", "Lot", 30, 1, 1, 1),
  createItem('296', "", "", "", "", "LABOUR & CIVIL", "DC INSTALLATION", "DC CHARGER SIMULATOR/ANALYZER (COMEMSO)", "Lot", 20000, 1, 1, 1),
  createItem('297', "TBC WITH SUB CON", "", "", "", "LABOUR & CIVIL", "DC INSTALLATION", "DC CHARGER INSTALLATION & LABOUR FEE", "Lot", 2000, 1, 1, 1),
  createItem('298', "", "", "", "", "LABOUR & CIVIL", "DC INSTALLATION", "DC CHARGER DELIVERY + CRANE", "Lot", 3000, 1, 1, 1),
  createItem('299', "", "", "", "", "LABOUR & CIVIL", "DC INSTALLATION", "DC CHARGER DELIVERY TO KUCHING （PINGALAX )", "Lot", 2900, 1, 1, 1),
  createItem('300', "", "", "", "", "LABOUR & CIVIL", "DC INSTALLATION", "EVDB INSTALLATION", "Lot", 200, 1, 1, 1),
  createItem('301', "", "", "", "", "LABOUR & CIVIL", "DC INSTALLATION", "PEDESTAL STAND INSTALLATION", "Lot", 100, 1, 1, 1),
  createItem('302', "", "", "", "", "LABOUR & CIVIL", "DC INSTALLATION", "EVDB ASSEMBLY", "Lot", 100, 1, 1, 1),
  createItem('303', "", "", "", "", "LABOUR & CIVIL", "DC INSTALLATION", "DC CONCRETE PLINTH", "Lot", 1500, 1, 1, 1),
  createItem('304', "", "", "", "", "LABOUR & CIVIL", "DC INSTALLATION", "EXCAVATION & MAKE GOOD (GREEN AREA)", "Meter", 40, 1, 1, 1),
  createItem('305', "", "", "", "", "LABOUR & CIVIL", "DC INSTALLATION", "EXCAVATION & MAKE GOOD (TILES)", "Meter", 60, 1, 1, 1),
  createItem('306', "", "", "", "", "LABOUR & CIVIL", "DC INSTALLATION", "EXCAVATION & MAKE GOOD (CONCRETE)", "Meter", 40, 1, 1, 1),
  createItem('307', "", "", "", "", "LABOUR & CIVIL", "DC INSTALLATION", "EXCAVATION & MAKE GOOD (ASPALT ROAD)", "Meter", 200, 1, 1, 1),
  createItem('308', "", "", "", "", "LABOUR & CIVIL", "DC INSTALLATION", "CONCEAL WORK", "Lot", 40, 1, 1, 1),
  createItem('309', "", "", "", "", "LABOUR & CIVIL", "DC INSTALLATION", "CEILING MAKE GOOD", "Lot", 150, 1, 1, 1),
  createItem('310', "", "", "", "", "LABOUR & CIVIL", "DC INSTALLATION", "CABLE + TRUNKING", "Meter", 50, 1, 1, 1),
  createItem('311', "", "", "", "", "LABOUR & CIVIL", "DC INSTALLATION", "CABLE LAYING", "Meter", 50, 1, 1, 1),
  // --- PANEL FABRICATION ---
  createItem('312', "", "", "", "", "PANEL FABRICATION", "VBLUE", "3 x AC MCCB PANEL INDOOR WALL MOUNTED", "Unit", 5800, 1, 1, 1),
  createItem('313', "", "", "", "", "PANEL FABRICATION", "VBLUE", "100A MCCB PANEL - WALL MOUNTED INDOOR", "Unit", 3200, 1, 1, 1),
  createItem('314', "", "", "", "", "PANEL FABRICATION", "VBLUE", "100A MCCB PANEL - WALL MOUNTED OUTDOOR", "Unit", 4000, 1, 1, 1),
  createItem('315', "", "", "", "", "PANEL FABRICATION", "VBLUE", "100A MCCB PANEL - FLOOR MOUNTED OUTDOOR", "Unit", 4550, 1, 1, 1),
  createItem('316', "", "", "", "", "PANEL FABRICATION", "VBLUE", "200A MAIN , 100A, 40A, 40A SUB PANEL", "Unit", 5500, 1, 1, 1),
  createItem('317', "", "", "", "", "PANEL FABRICATION", "VBLUE", "250A MAIN, 200A, 40A, 40A SUB PANEL", "Unit", 6800, 1, 1, 1),
  createItem('318', "", "", "", "", "PANEL FABRICATION", "VBLUE", "500A MAIN, 200A, 200A, SUB", "Unit", 9550, 1, 1, 1),
  createItem('319', "", "", "", "", "PANEL FABRICATION", "VBLUE", "OCEF WITH FAT REPORT CALIBRATION", "Unit", 250, 1, 1, 1),
  // --- SOLAR ---
  createItem('320', "", "", "", "", "SOLAR", "SOLAR", "SOLAR PRICING PER KWP RESI SP", "kWp", 2300, 1, 1, 1),
  createItem('321', "", "", "", "", "SOLAR", "SOLAR", "SOLAR PRICING PER KWP RESI TP", "kWp", 2600, 1, 1, 1),
  createItem('322', "", "", "", "", "SOLAR", "SOLAR", "SOLAR PRICING PER KWP C&I", "kWp", 1200, 1, 1, 1),
  createItem('323', "", "", "", "", "SOLAR", "SOLAR", "SIGEN HYBRID 4.0 SP2", "Unit", 2250, 1, 1, 1),
  createItem('324', "", "", "", "", "SOLAR", "SOLAR", "SIGEN HYBRID 5.0 SP2", "Unit", 2530, 1, 1, 1),
  createItem('325', "", "", "", "", "SOLAR", "SOLAR", "SIGEN HYBRID 6.0 TP2", "Unit", 3940, 1, 1, 1),
  createItem('326', "", "", "", "", "SOLAR", "SOLAR", "SIGEN HYBRID 8.0 TP2", "Unit", 4260, 1, 1, 1),
  createItem('327', "", "", "", "", "SOLAR", "SOLAR", "SIGEN HYBRID 10.0 TP2", "Unit", 4600, 1, 1, 1),
  createItem('328', "", "", "", "", "SOLAR", "SOLAR", "SIGEN HYBRID 12.0 TP2", "Unit", 4770, 1, 1, 1),
  createItem('329', "", "", "", "", "SOLAR", "SOLAR", "SIGENSTOR EC 12.0 TP", "Unit", 9170, 1, 1, 1),
  createItem('330', "", "", "", "", "SOLAR", "SOLAR", "SIGENSTOR EC 17.0 TP", "Unit", 10890, 1, 1, 1),
  createItem('331', "", "", "", "", "SOLAR", "SOLAR", "SIGENSTOR EC 20.0 TP", "Unit", 12140, 1, 1, 1),
  createItem('332', "", "", "", "", "SOLAR", "SOLAR", "SIGENSTOR EC 25.0 TP", "Unit", 13380, 1, 1, 1),
  createItem('333', "", "", "", "", "SOLAR", "SOLAR", "SIGENSTOR EC 30.0 TP", "Unit", 14570, 1, 1, 1),
  createItem('334', "", "", "", "", "SOLAR", "SOLAR", "SIGEN PV 50M1-HYA", "Unit", 14500, 1, 1, 1),
  createItem('335', "", "", "", "", "SOLAR", "SOLAR", "SIGEN PV 60M1-HYA", "Unit", 15110, 1, 1, 1),
  createItem('336', "", "", "", "", "SOLAR", "SOLAR", "SIGEN PV 80M1-HYA", "Unit", 15110, 1, 1, 1),
  createItem('337', "", "", "", "", "SOLAR", "SOLAR", "SIGEN PV 100M1-HYA", "Unit", 19940, 1, 1, 1),
  createItem('338', "", "", "", "", "SOLAR", "SOLAR", "SIGEN PV 110M1-HYA", "Unit", 21150, 1, 1, 1),
  createItem('339', "", "", "", "", "SOLAR", "SOLAR", "SIGEN PV 125M1-HYA", "Unit", 22960, 1, 1, 1),
  createItem('340', "", "", "", "", "SOLAR", "SOLAR", "SIGEN PV 50M1", "Unit", 11480, 1, 1, 1),
  createItem('341', "", "", "", "", "SOLAR", "SOLAR", "SIGEN PV 60M1", "Unit", 12090, 1, 1, 1),
  createItem('342', "", "", "", "", "SOLAR", "SOLAR", "SIGEN PV 80M1", "Unit", 16320, 1, 1, 1),
  createItem('343', "", "", "", "", "SOLAR", "SOLAR", "SIGEN PV 100M1", "Unit", 17520, 1, 1, 1),
  createItem('344', "", "", "", "", "SOLAR", "SOLAR", "SIGEN PV 110M1", "Unit", 18130, 1, 1, 1),
  createItem('345', "", "", "", "", "SOLAR", "SOLAR", "SIGEN PV 125M1", "Unit", 19340, 1, 1, 1),
  createItem('346', "", "", "", "", "SOLAR", "SOLAR", "SIGEN BAT 6.0", "Unit", 7280, 1, 1, 1),
  createItem('347', "", "", "", "", "SOLAR", "SOLAR", "SIGEN BAT 8.0", "Unit", 0, 1, 1, 1),
  createItem('348', "", "", "", "", "SOLAR", "SOLAR", "SIGEN BAT 10.0 (9kWh)", "Unit", 9310, 1, 1, 1),
  createItem('349', "", "", "", "", "SOLAR", "SOLAR", "SIGEN BAT CONTROLLER (FOR INVERTER V2)", "Unit", 1290, 1, 1, 1),
  createItem('350', "", "", "", "", "SOLAR", "SOLAR", "SIGENSTACK BAT 12.0", "Unit", 10470, 1, 1, 1),
  createItem('351', "", "", "", "", "SOLAR", "SOLAR", "SIGENSTACK BC M2-0.5C-BST", "Unit", 15110, 1, 1, 1),
  createItem('352', "", "", "", "", "SOLAR", "SOLAR", "SIGENSTACK BASE 4S-0.5C", "Unit", 12090, 1, 1, 1),
  createItem('353', "", "", "", "", "SOLAR", "SOLAR", "SIGENSTACK BASE MAIN-0.5C", "Unit", 3030, 1, 1, 1),
  createItem('354', "", "", "", "", "SOLAR", "SOLAR", "SIGENSTACK BASE SUB-0.5C", "Unit", 3030, 1, 1, 1),
  createItem('355', "", "", "", "", "SOLAR", "SOLAR", "SIGENSTACK COVER", "Unit", 1040, 1, 1, 1),
  createItem('356', "", "", "", "", "SOLAR", "SOLAR", "SIGENSTOR EVDC 25kWh", "Unit", 17050, 1, 1, 1),
  createItem('357', "", "", "", "", "SOLAR", "SOLAR", "SIGEN GATEWAY HOMEMAX TP", "Unit", 5070, 1, 1, 1),
  createItem('358', "", "", "", "", "SOLAR", "SOLAR", "SIGEN GATEWAY HOME SP 12K", "Unit", 1680, 1, 1, 1),
  createItem('359', "", "", "", "", "SOLAR", "SOLAR", "SIGEN GATEWAY HOME TP 30K", "Unit", 2000, 1, 1, 1),
  createItem('360', "", "", "", "", "SOLAR", "SOLAR", "SIGEN GATEWAY HOMEPRO SP", "Unit", 2670, 1, 1, 1),
  createItem('361', "", "", "", "", "SOLAR", "SOLAR", "SIGEN GATEWAY HOMEPRO TP", "Unit", 4960, 1, 1, 1),
  createItem('362', "", "", "", "", "SOLAR", "SOLAR", "SIGEN SENSOR SP-CT120-DH (WITH CT)", "Unit", 370, 1, 1, 1),
  createItem('363', "", "", "", "", "SOLAR", "SOLAR", "SIGEN SENSOR TP-CT120-DH (WITH CT)", "Unit", 670, 1, 1, 1),
  createItem('364', "", "", "", "", "SOLAR", "SOLAR", "SIGEN SENSOR TP-CT100", "Unit", 600, 1, 1, 1),
  createItem('365', "", "", "", "", "SOLAR", "SOLAR", "SIGEN SENSOR TPX-CH", "Unit", 910, 1, 1, 1),
  createItem('366', "", "", "", "", "SOLAR", "SOLAR", "MOUNTING KIT (GROUND)", "Unit", 460, 1, 1, 1),
  createItem('367', "", "", "", "", "SOLAR", "SOLAR", "Structure", "Unit", 2000, 1, 1, 1),
  createItem('368', "AC Injection point within 10m", "", "", "", "SOLAR", "SOLAR", "SOLAR PANELS + INSTALLATION(FOR ROOF TOP)", "Unit", 116830, 1, 1, 1),
  // --- LICENSING AND APPLICATION ---
  createItem('369', "Covered by TNB ", "", "", "", "LICENSING AND APPLICATION", "TNB METER APPLICATION", "TNB METERING KIOSK CONNECTION CHARGE 300/5A", "Lot", 8100, 1, 1, 1),
  createItem('370', "", "", "", "", "LICENSING AND APPLICATION", "TNB METER APPLICATION", "APPLICATION, SUBMISSION & ENDORSEMENT", "Lot", 6000, 1, 1, 1),
  createItem('371', "", "", "", "", "LICENSING AND APPLICATION", "TNB METER APPLICATION", "TNB CAS SAMBUNGAN", "Lot", 1000, 1, 1, 1),
  createItem('372', "MEGA/SOUTHERN", "", "", "X", "LICENSING AND APPLICATION", "BOMBA APPLICATION & COMPLIANCE", "1C X 2.5mmsq PVC CABLE", "Meter", 1.2, 1, 1, 1),
  createItem('373', "", "", "", "", "LICENSING AND APPLICATION", "BOMBA APPLICATION & COMPLIANCE", "EMERGENCY BUTTON C/W TRANSPARENT COVER", "Set", 81.44, 1, 1, 1),
  createItem('374', "", "", "", "", "LICENSING AND APPLICATION", "BOMBA APPLICATION & COMPLIANCE", "HARMONY XALK STATION 1 RED PB TURN TO RELEASE 1NO+1NC YELLOW", "Set", 106.25, 1, 1, 1),
  createItem('375', "", "", "", "", "LICENSING AND APPLICATION", "BOMBA APPLICATION & COMPLIANCE", "ESB STAND 75X50X1200 MM - AISASH RESOURCES", "Set", 155, 1, 1, 1),
  createItem('376', "", "", "", "", "LICENSING AND APPLICATION", "BOMBA APPLICATION & COMPLIANCE", "FIRE BLANKET C/W STORAGE CASE", "Unit", 1900, 1, 1, 1),
  createItem('377', "", "", "", "", "LICENSING AND APPLICATION", "BOMBA APPLICATION & COMPLIANCE", "9KG ABC DRY POWDER FIRE EXTINGUISHER C/W BRACKET", "Unit", 148, 1, 1, 1),
  createItem('378', "", "", "", "", "LICENSING AND APPLICATION", "BOMBA APPLICATION & COMPLIANCE", "EMERGENCY BUTTON TRANSPARENT COVER", "Unit", 15, 1, 1, 1),
  createItem('379', "", "", "", "", "LICENSING AND APPLICATION", "BOMBA APPLICATION & COMPLIANCE", "PBT + PASSIVE BOMBA", "LUMP", 10000, 1, 1, 1),
  createItem('380', "", "", "", "", "LICENSING AND APPLICATION", "BOMBA APPLICATION & COMPLIANCE", "ACTIVE BOMBA APPLICATION FEE", "Unit", 3240, 1, 1, 1),
  createItem('381', "", "", "", "", "LICENSING AND APPLICATION", "ST LICENSE APPLICATION", "ST LICENSE APPLICATION", "Unit", 1080, 1, 1, 1),
  // --- OTHERS ---
  createItem('382', "", "", "", "", "OTHERS", "PARKING", "LOGO + WORDING ONLY PAINTING (WHITE)", "Lot", 750, 1, 1, 1),
  createItem('383', "", "", "", "", "OTHERS", "PARKING", "CHARGER PEDESTAL STAND (AISASH - METAL) - PROTON (ORI)", "Unit", 680, 1, 1, 1),
  createItem('384', "", "", "", "", "OTHERS", "PARKING", "CHARGER PEDESTAL STAND (AISASH - METAL) - PROTON W BASE ", "Unit", 800, 1, 1, 1),
  createItem('385', "", "", "", "", "OTHERS", "PARKING", "CHARGER PEDESTAL STAND (AISASH - ALU) - TRI", "Unit", 650, 1, 1, 1),
  createItem('386', "", "", "", "", "OTHERS", "PARKING", "CHARGER PEDESTAL STAND (AISASH - ALU) - FLAT TOP", "Unit", 780, 1, 1, 1),
  createItem('387', "", "", "", "", "OTHERS", "PARKING", "CHARGER PEDESTAL STAND (RYAN)", "Unit", 1100, 1, 1, 1),
  createItem('388', "", "", "", "", "OTHERS", "PARKING", "USER GUIDE SIGNAGE", "Unit", 150, 1, 1, 1),
  createItem('389', "", "", "", "", "OTHERS", "PARKING", "FULL PAINTING", "Lot", 900, 1, 1, 1),
  createItem('390', "", "", "", "", "OTHERS", "PARKING", "METAL WHEEL STOPPER (2.1M)", "Unit", 185, 4.8, 1.15, 1),
  createItem('391', "", "", "", "", "OTHERS", "PARKING", "RUBBER WHEEL STOPPER (2 UNIT)", "Set", 36, 1, 1, 1),
  createItem('392', "", "", "", "", "OTHERS", "PARKING", "STAINLESS STEEL PARKING BOLLARD", "Unit", 185, 1, 1, 1),
  createItem('393', "", "", "", "", "OTHERS", "PARKING", "PU TYPE PARKING BOLLARD", "Unit", 45, 1, 1, 1),
  createItem('394', "", "", "", "", "OTHERS", "PARKING", "SMART PARKING BARRIER", "Unit", 144, 4.8, 1.15, 1),
  createItem('395', "", "", "", "", "OTHERS", "PARKING", "SMART PARKING BARRIER - COMMUNICATION GATEWAY", "Unit", 399, 4.8, 1.05, 1),
  createItem('396', "", "", "", "", "OTHERS", "REXHARGE APPS & TNC", "REXHARGE APPLICATION INTEGRATION", "Lot", 970, 1, 1, 1),
  createItem('397', "", "", "", "", "OTHERS", "REXHARGE APPS & TNC", "TESTING & COMMISSIONING (HOME)", "Lot", 150, 1, 1, 1),
  createItem('398', "", "", "", "", "OTHERS", "REXHARGE APPS & TNC", "TESTING & COMMISSIONING HQs Region (AC CHARGER)", "Lot", 250, 1, 1, 1),
  createItem('399', "", "", "", "", "OTHERS", "REXHARGE APPS & TNC", "TESTING & COMMISSIONING HQs Region (DC CHARGER)", "Lot", 2000, 1, 1, 1),
  createItem('400', "", "", "", "", "OTHERS", "REXHARGE APPS & TNC", "TESTING & COMMISSIONING S/N/EC Region (DC CHARGER)", "Lot", 2500, 1, 1, 1),
  createItem('401', "", "", "", "", "OTHERS", "REXHARGE APPS & TNC", "PREVENTIVE MAINTAINANCE PACKAGE HQs Region (PER ANNUM)", "Lot", 350, 1, 1, 1),
  createItem('402', "", "", "", "", "OTHERS", "REXHARGE APPS & TNC", "PREVENTIVE MAINTAINANCE PACKAGE S/N/EC Region (PER ANNUM)", "Lot", 500, 1, 1, 1),
  createItem('403', "BELDEN", "2339313", "7834ANC 008U1000", "X", "OTHERS", "BYTEPLUS", "METERING POINT MONTHLY SUBS", "Month", 40, 1, 1, 1),
  createItem('404', "HAGER", "2017533", "NC106A", "24-12", "OTHERS", "BYTEPLUS", "MONITORING DASHBOARD", "Unit", 1, 1, 1, 1),
  createItem('405', "BELDEN", "2008727", "AP700008", "24-12", "OTHERS", "BYTEPLUS", "SCHNEIDER ELECTRIC PM3255 DIN RAIL POWER METER MODBUS WITH MEMORY", "Unit", 900, 1, 1, 0.955),
  createItem('406', "TELTONIKA", "", "", "X", "OTHERS", "BYTEPLUS", "CURRENT TRANSFORMER CLASS 1 5VA RATIO:50/5A", "Unit", 42.1, 1, 1, 0.955),
  createItem('407', "TELTONIKA", "", "", "X", "OTHERS", "BYTEPLUS", "4NEXT EASYLOGXL-A", "Unit", 270, 1, 1, 0.955),
  createItem('408', "TPLINK", "", "", "X", "OTHERS", "BYTEPLUS", "32GB SD CARD", "Unit", 15.9, 1, 1, 0.955),
  createItem('409', "PVC LINK", "2043917", "IPEB 1296-G", "24-12", "OTHERS", "BYTEPLUS", "MCB 1P 6A 10KA C CURVE", "Unit", 32.04, 1, 1, 0.955),
  createItem('410', "", "", "", "", "OTHERS", "BYTEPLUS", "ACCESSORIES", "Lot", 50, 1, 1, 1),
  createItem('411', "", "", "", "", "OTHERS", "MISCELLANEOUS", "MOBILISATION : KLANG VALLEY", "Lot", 800, 1, 1, 1),
  createItem('412', "", "", "", "", "OTHERS", "MISCELLANEOUS", "MOBILISATION : SELANGOR", "Lot", 1500, 1, 1, 1),
  createItem('413', "", "", "", "", "OTHERS", "MISCELLANEOUS", "MOBILISATION : NEGERI SEMBILAN ", "Lot", 1500, 1, 1, 1),
  createItem('414', "", "", "", "", "OTHERS", "MISCELLANEOUS", "MOBILISATION : MELAKA", "Lot", 1400, 1, 1, 1),
  createItem('415', "", "", "", "", "OTHERS", "MISCELLANEOUS", "MOBILISATION : JOHOR", "Lot", 2600, 1, 1, 1),
  createItem('416', "", "", "", "", "OTHERS", "MISCELLANEOUS", "MOBILISATION : PENANG", "Lot", 2000, 1, 1, 1),
  createItem('417', "", "", "", "", "OTHERS", "MISCELLANEOUS", "MOBILISATION : PERLIS", "Lot", 2600, 1, 1, 1),
  createItem('418', "", "", "", "", "OTHERS", "MISCELLANEOUS", "MOBILISATION : KEDAH", "Lot", 2600, 1, 1, 1),
  createItem('419', "", "", "", "", "OTHERS", "MISCELLANEOUS", "MOBILISATION : PERAK", "Lot", 3200, 1, 1, 1),
  createItem('420', "", "", "", "", "OTHERS", "MISCELLANEOUS", "MOBILISATION : TERENGGANU", "Lot", 3500, 1, 1, 1),
  createItem('421', "", "", "", "", "OTHERS", "MISCELLANEOUS", "MOBILISATION : KELANTAN", "Lot", 3500, 1, 1, 1),
  createItem('422', "", "", "", "", "OTHERS", "MISCELLANEOUS", "MOBILISATION : PAHANG", "Lot", 2500, 1, 1, 1),
  createItem('423', "", "", "", "", "OTHERS", "MISCELLANEOUS", "INSURANCE \n-ALL RISK INSURANCE (RM 150 EVERY 10K)\n-PUBLIC LIABILITY FOR 1 MIILLION (RM 1000)", "Year", 2952, 1, 1, 1),
  createItem('424', "", "", "", "", "OTHERS", "MISCELLANEOUS", "STICKER DESIGN (DC CHARGER)", "Unit", 500, 1, 1, 1),
  createItem('425', "", "", "", "", "OTHERS", "MISCELLANEOUS", "STICKER ONLY", "Unit", 2952, 1, 1, 1),
  createItem('426', "", "", "", "", "OTHERS", "MISCELLANEOUS", "STICKER + INSTALLATION (VOOH) - 60 kW", "Unit", 1080, 1, 1, 1),
  createItem('427', "", "", "", "", "OTHERS", "MISCELLANEOUS", "STICKER + INSTALLATION (SCAPEMEDIA) - 60kW", "Unit", 1620, 1, 1, 1),
  createItem('428', "", "", "", "", "OTHERS", "MISCELLANEOUS", "STICKER + INSTALLATION (VOOH) - 180 kW", "Unit", 1188, 1, 1, 1),
  createItem('429', "", "", "", "", "OTHERS", "MISCELLANEOUS", "STICKER + INSTALLATION (SCAPEMEDIA) - 180kW", "Unit", 1836, 1, 1, 1),
  createItem('430', "", "", "", "", "OTHERS", "MISCELLANEOUS", "STICKER + INSTALLATION OUTSTATION (OUTSIDE KV) - VOOH", "Unit", 1324.08, 1, 1, 1),
];

const INITIAL_SETTINGS: AppSettings = {
  companyName: 'Recharge Xolutions Sdn Bhd (0295251X)',
  companyAddress: 'L3-023, Level 3, MyTOWN Shopping Centre, \n6,Jalan Cochrane, Seksyen 90,\n55100 Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur',
  currencySymbol: 'RM',
  companyLogo: '',
  bankName: 'OCBC Bank',
  bankAccount: 'xxxxx',
  profileName: 'Teoh Chi Yang',
  profileContact: '+6012 528 0665',
  profileRole: 'Admin',
};

// Migration helpers
const migrateProjects = (projects: any[]): Project[] => {
  return projects.map(p => ({
    ...p,
    versions: (p.versions || [{ id: 'v1', name: 'version-1', createdAt: new Date().toISOString() }]).map((v: any) => ({
      ...v,
      masterSnapshot: v.masterSnapshot || p.masterSnapshot || INITIAL_MASTER_DATA // Migrate old project snapshot to version or use initial
    })),
    discount: p.discount || 0
  }));
};

const migrateItems = (items: any[]): BQItem[] => {
  return items.map(i => ({
    ...i,
    versionId: i.versionId || 'v1',
    quotationDescription: i.quotationDescription // Migrate existing field if present
  }));
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // --- Initialize State ---

  const [masterData, setMasterData] = useState<MasterItem[]>(() => {
    try {
      const saved = localStorage.getItem('swiftbq_masterData_v1');
      return saved ? JSON.parse(saved) : INITIAL_MASTER_DATA;
    } catch (e) {
      return INITIAL_MASTER_DATA;
    }
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem('swiftbq_projects');
      if (saved) {
        const parsed = migrateProjects(JSON.parse(saved));
        return parsed;
      }
      return [];
    } catch (e) {
      return [];
    }
  });

  const [bqItems, setBqItems] = useState<BQItem[]>(() => {
    try {
      const saved = localStorage.getItem('swiftbq_bqItems');
      return saved ? migrateItems(JSON.parse(saved)) : [];
    } catch (e) {
      return [];
    }
  });

  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('swiftbq_appSettings');
      return saved ? { ...INITIAL_SETTINGS, ...JSON.parse(saved) } : INITIAL_SETTINGS;
    } catch (e) {
      return INITIAL_SETTINGS;
    }
  });

  // --- Session State with Persistence ---
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(() => {
    return localStorage.getItem('swiftbq_currentProjectId');
  });

  const [currentVersionId, setCurrentVersionId] = useState<string | null>(() => {
    return localStorage.getItem('swiftbq_currentVersionId');
  });

  const [bqViewMode, setBqViewMode] = useState<BQViewMode>(() => {
    const saved = localStorage.getItem('swiftbq_bqViewMode');
    return (saved as BQViewMode) || 'catalog';
  });

  const [quotationEdits, setQuotationEdits] = useState<Record<string, string>>({});
  const [masterListEdits, setMasterListEdits] = useState<Record<string, Partial<MasterItem>>>({});

  const hasUnsavedChanges = useMemo(() =>
    Object.keys(quotationEdits).length > 0 || Object.keys(masterListEdits).length > 0,
    [quotationEdits, masterListEdits]);


  // --- Persistence Effects ---
  useEffect(() => { localStorage.setItem('swiftbq_masterData_v1', JSON.stringify(masterData)); }, [masterData]);
  useEffect(() => { localStorage.setItem('swiftbq_projects', JSON.stringify(projects)); }, [projects]);
  useEffect(() => { localStorage.setItem('swiftbq_bqItems', JSON.stringify(bqItems)); }, [bqItems]);
  useEffect(() => { localStorage.setItem('swiftbq_appSettings', JSON.stringify(appSettings)); }, [appSettings]);

  // Session Persistence Effects
  useEffect(() => {
    if (currentProjectId) localStorage.setItem('swiftbq_currentProjectId', currentProjectId);
    else localStorage.removeItem('swiftbq_currentProjectId');
  }, [currentProjectId]);

  useEffect(() => {
    if (currentVersionId) localStorage.setItem('swiftbq_currentVersionId', currentVersionId);
    else localStorage.removeItem('swiftbq_currentVersionId');
  }, [currentVersionId]);

  useEffect(() => {
    localStorage.setItem('swiftbq_bqViewMode', bqViewMode);
  }, [bqViewMode]);


  // --- Master Data Actions ---
  const addMasterItem = (item: MasterItem) => {
    setMasterData(prev => [...prev, item]);
  };

  const updateMasterItem = (id: string, updates: Partial<MasterItem>) => {
    setMasterData((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const isCalculationNeeded =
            'rexScFob' in updates || 'forex' in updates || 'sst' in updates || 'opta' in updates;

          if (isCalculationNeeded) {
            const merged = { ...item, ...updates };
            const derived = calculateDerivedFields(merged);
            return { ...merged, ...derived };
          }
          return { ...item, ...updates };
        }
        return item;
      })
    );
  };

  const deleteMasterItem = (id: string) => {
    setMasterData(prev => prev.filter((item) => item.id !== id));
    if (masterListEdits[id]) {
      const newEdits = { ...masterListEdits };
      delete newEdits[id];
      setMasterListEdits(newEdits);
    }
  };

  // --- Master List Transactional Logic ---
  const setMasterListEdit = (id: string, field: keyof MasterItem, value: any) => {
    setMasterListEdits(prev => {
      const currentItem = masterData.find(i => i.id === id);
      if (!currentItem) return prev;

      const existingEdits = prev[id] || {};
      const mergedForCalc = { ...currentItem, ...existingEdits, [field]: value };

      let derivedUpdates = {};
      if (['rexScFob', 'forex', 'sst', 'opta'].includes(field as string)) {
        derivedUpdates = calculateDerivedFields(mergedForCalc);
      }

      return {
        ...prev,
        [id]: { ...existingEdits, [field]: value, ...derivedUpdates }
      };
    });
  };

  const commitMasterListEdits = () => {
    if (Object.keys(masterListEdits).length === 0) return;

    setMasterData(prev => prev.map(item => {
      if (masterListEdits[item.id]) {
        const edits = masterListEdits[item.id];
        const numericFields: (keyof MasterItem)[] = ['price', 'rexScFob', 'forex', 'sst', 'opta', 'rexScDdp', 'rexSp', 'rexRsp'];
        const sanitizedEdits = { ...edits };

        numericFields.forEach(field => {
          if (sanitizedEdits[field] !== undefined) {
            (sanitizedEdits[field] as any) = Number(sanitizedEdits[field]) || 0;
          }
        });

        return { ...item, ...sanitizedEdits };
      }
      return item;
    }));
    setMasterListEdits({});
  };

  const discardMasterListEdits = () => {
    setMasterListEdits({});
  };


  // --- Project Actions ---
  const addProject = (project: Project) => {
    const newProject = {
      ...project,
      versions: [{
        id: 'v1',
        name: 'version-1',
        createdAt: new Date().toISOString(),
        masterSnapshot: [...masterData] // Snapshot for v1
      }],
      // masterSnapshot removed from Project
    };
    setProjects(prev => [...prev, newProject]);
    setCurrentProjectId(newProject.id);
    setCurrentVersionId('v1');
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    setBqItems(prev => prev.filter(item => item.projectId !== id));
    if (currentProjectId === id) {
      setCurrentProjectId(null);
      setCurrentVersionId(null);
    }
  };

  const duplicateProject = (id: string) => {
    const sourceProject = projects.find(p => p.id === id);
    if (!sourceProject) return;

    const newProjectId = Date.now().toString();

    // Generate unique name: Name (1), Name (2) etc.
    let newName = `${sourceProject.projectName} (1)`;
    let counter = 1;
    while (projects.some(p => p.projectName === newName)) {
      counter++;
      newName = `${sourceProject.projectName} (${counter})`;
    }

    const newProject: Project = {
      ...sourceProject,
      id: newProjectId,
      projectName: newName,
      quoteId: `Q-${new Date().getFullYear()}-${projects.length + 1001 + Math.floor(Math.random() * 1000)}`, // New unique quote ID
      versions: sourceProject.versions.map(v => ({
        ...v,
        masterSnapshot: v.masterSnapshot ? [...v.masterSnapshot] : [...masterData] // Deep copy snapshot
      })),
      // masterSnapshot removed
    };

    // Duplicate Items
    const sourceItems = bqItems.filter(item => item.projectId === id);
    const newItems = sourceItems.map(item => ({
      ...item,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9), // Use robust random ID
      projectId: newProjectId
    }));

    setProjects(prev => [...prev, newProject]);
    setBqItems(prev => [...prev, ...newItems]);
  };

  // --- Version Actions ---
  const createVersion = (projectId: string, sourceVersionId: string, newVersionName: string, explicitNewVersionId?: string) => {
    const newVersionId = explicitNewVersionId || Date.now().toString();

    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const sourceVersion = p.versions.find(v => v.id === sourceVersionId);
        const sourceSnapshot = sourceVersion?.masterSnapshot || INITIAL_MASTER_DATA;

        return {
          ...p,
          versions: [...p.versions, {
            id: newVersionId,
            name: newVersionName,
            createdAt: new Date().toISOString(),
            masterSnapshot: [...sourceSnapshot] // Deep copy snapshot
          }]
        };
      }
      return p;
    }));

    const sourceItems = bqItems.filter(item => item.projectId === projectId && item.versionId === sourceVersionId);
    const newItems = sourceItems.map(item => ({
      ...item,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      versionId: newVersionId
    }));

    setBqItems(prev => [...prev, ...newItems]);
    setCurrentVersionId(newVersionId);
  };

  const updateProjectSnapshot = (projectId: string, versionId: string, snapshotUpdates: Partial<MasterItem>[]) => {
    // 1. Update Version Snapshot
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const newVersions = p.versions.map(v => {
          if (v.id === versionId && v.masterSnapshot) {
            const newSnapshot = v.masterSnapshot.map(m => {
              const update = snapshotUpdates.find(u => u.id === m.id);
              if (update) return { ...m, ...update };
              return m;
            });
            return { ...v, masterSnapshot: newSnapshot };
          }
          return v;
        });
        return { ...p, versions: newVersions };
      }
      return p;
    }));

    // 2. Sync BQ Items (Review View) -> Only for this version!
    setBqItems(prev => prev.map(item => {
      if (item.projectId === projectId && item.versionId === versionId && item.masterId) {
        const update = snapshotUpdates.find(u => u.id === item.masterId);
        if (update) {
          const newItem = { ...item, ...update };
          if (update.price !== undefined || update.rexRsp !== undefined) {
            const newPrice = update.rexRsp ?? update.price ?? item.price;
            newItem.price = newPrice;
            newItem.rexRsp = newPrice;
            newItem.total = newPrice * item.qty;
          }
          return newItem as BQItem;
        }
      }
      return item;
    }));
  };

  const updateVersionName = (projectId: string, versionId: string, name: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          versions: p.versions.map(v => v.id === versionId ? { ...v, name } : v)
        };
      }
      return p;
    }));
  };

  const deleteVersion = (projectId: string, versionId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          versions: p.versions.filter(v => v.id !== versionId)
        };
      }
      return p;
    }));

    setBqItems(prev => prev.filter(item => !(item.projectId === projectId && item.versionId === versionId)));

    if (currentProjectId === projectId && currentVersionId === versionId) {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        const remaining = project.versions.filter(v => v.id !== versionId);
        if (remaining.length > 0) {
          setCurrentVersionId(remaining[0].id);
        } else {
          const newDefaultId = Date.now().toString();
          setProjects(prev => prev.map(p => {
            if (p.id === projectId) {
              return {
                ...p,
                versions: [{ id: newDefaultId, name: 'version-1', createdAt: new Date().toISOString() }]
              };
            }
            return p;
          }));
          setCurrentVersionId(newDefaultId);
        }
      }
    }
  };

  // --- BQ Items Actions ---
  const addBQItem = (projectId: string, versionId: string) => {
    const newItem: BQItem = {
      id: Date.now().toString(),
      projectId: projectId,
      versionId: versionId,
      category: '',
      itemName: '',
      description: '',
      uom: '',
      brand: '',
      axsku: '',
      mpn: '',
      group: '',
      price: 0,
      qty: 1,
      total: 0,
      rexScFob: 0,
      forex: 1,
      sst: 1,
      opta: 1,
      rexScDdp: 0,
      rexSp: 0,
      rexRsp: 0,
      isOptional: false,
    };
    setBqItems([...bqItems, newItem]);
  };

  const syncMasterToBQ = (projectId: string, versionId: string, masterItem: MasterItem, qty: number) => {
    setBqItems(prev => {
      const existingIndex = prev.findIndex(item => item.projectId === projectId && item.versionId === versionId && item.masterId === masterItem.id);

      if (qty <= 0) {
        if (existingIndex > -1) return prev.filter((_, index) => index !== existingIndex);
        return prev;
      }

      if (existingIndex > -1) {
        const newItems = [...prev];
        const currentItem = newItems[existingIndex];
        const updatedTotal = currentItem.price * qty;

        newItems[existingIndex] = {
          ...currentItem,
          qty: qty,
          total: updatedTotal
        };
        return newItems;
      } else {
        const newItem: BQItem = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          projectId,
          versionId,
          masterId: masterItem.id,
          // Snapshot Master Data
          category: masterItem.category,
          itemName: masterItem.itemName,
          description: masterItem.description,
          uom: masterItem.uom,
          brand: masterItem.brand,
          axsku: masterItem.axsku,
          mpn: masterItem.mpn,
          group: masterItem.group,

          // Costing Snapshot
          price: masterItem.rexRsp, // Default Price is RSP
          qty: qty,
          total: masterItem.rexRsp * qty,

          rexScFob: masterItem.rexScFob,
          forex: masterItem.forex,
          sst: masterItem.sst,
          opta: masterItem.opta,
          rexScDdp: masterItem.rexScDdp,
          rexSp: masterItem.rexSp,
          rexRsp: masterItem.rexRsp,

          isOptional: false,
        };
        return [...prev, newItem];
      }
    });
  };

  const removeBQItem = (id: string) => {
    setBqItems(bqItems.filter((item) => item.id !== id));
  };

  const updateBQItem = (id: string, field: keyof BQItem, value: any) => {
    setBqItems((prev) => {
      let processedValue = value;
      if (field === 'qty' || field === 'price') {
        processedValue = Number(value);
      }

      if (field === 'qty' && processedValue <= 0) {
        return prev.filter(item => item.id !== id);
      }

      return prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: processedValue };
          if (field === 'price' || field === 'qty') {
            const p = field === 'price' ? processedValue : item.price;
            const q = field === 'qty' ? processedValue : item.qty;
            updated.total = p * q;
          }
          return updated;
        }
        return item;
      })
    });
  };

  const reorderBQItems = (projectId: string, versionId: string, sourceIndex: number, destinationIndex: number) => {
    setBqItems((prev) => {
      const projectVersionItems = prev.filter((item) => item.projectId === projectId && item.versionId === versionId);
      const otherItems = prev.filter((item) => !(item.projectId === projectId && item.versionId === versionId));

      const newProjectItems = [...projectVersionItems];
      const [movedItem] = newProjectItems.splice(sourceIndex, 1);
      newProjectItems.splice(destinationIndex, 0, movedItem);

      return [...otherItems, ...newProjectItems];
    });
  };

  // --- Calculations ---
  const getProjectTotal = (projectId: string, versionId: string) => {
    const project = projects.find(p => p.id === projectId);
    const discount = project?.discount || 0;
    const projectItems = bqItems.filter(i => i.projectId === projectId && i.versionId === versionId && !i.isOptional);
    const subtotal = projectItems.reduce((acc, item) => acc + item.total, 0);
    const tax = 0;
    const grandTotal = subtotal + tax - discount;
    return { subtotal, tax, grandTotal, discount };
  };

  // --- Edits Logic ---
  const setQuotationEdit = (id: string, value: string) => {
    setQuotationEdits(prev => ({ ...prev, [id]: value }));
  };

  const commitQuotationEdits = () => {
    if (Object.keys(quotationEdits).length === 0) return;
    setBqItems(prev => prev.map(item => {
      if (quotationEdits[item.id] !== undefined) {
        return { ...item, quotationDescription: quotationEdits[item.id] };
      }
      return item;
    }));
    setQuotationEdits({});
  };

  const discardQuotationEdits = () => {
    setQuotationEdits({});
  };

  const saveAllChanges = () => {
    commitQuotationEdits();
    commitMasterListEdits();
  };

  const discardAllChanges = () => {
    discardQuotationEdits();
    discardMasterListEdits();
  };

  return (
    <AppContext.Provider
      value={{
        masterData, setMasterData,
        projects, setProjects,
        currentProjectId, setCurrentProjectId,
        currentVersionId, setCurrentVersionId,
        bqItems, setBqItems,
        appSettings, setAppSettings,
        bqViewMode, setBqViewMode,
        addMasterItem, updateMasterItem, deleteMasterItem,
        addProject, updateProject, deleteProject, duplicateProject,
        createVersion, updateVersionName, deleteVersion, updateProjectSnapshot,
        addBQItem, syncMasterToBQ, removeBQItem, updateBQItem, reorderBQItems,
        getProjectTotal,
        quotationEdits, setQuotationEdit, commitQuotationEdits, discardQuotationEdits,
        masterListEdits, setMasterListEdit, commitMasterListEdits, discardMasterListEdits,
        hasUnsavedChanges, saveAllChanges, discardAllChanges,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
};
