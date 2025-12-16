
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
  
  // Version Actions
  createVersion: (projectId: string, sourceVersionId: string, newVersionName: string) => void;
  updateVersionName: (projectId: string, versionId: string, name: string) => void;
  deleteVersion: (projectId: string, versionId: string) => void;

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
    const spMargin = safeNum(item.spMargin, 0.7);

    // Heuristic for precision
    const isHighValue = fob > 500; 
    const precisionDDP = isHighValue ? 1 : 0.01;
    const precisionSP = isHighValue ? 1 : 0.1;

    // Formula for DDP: CEILING((FOB * Forex * SST) / OPTA, precisionDDP)
    const ddp = opta !== 0 ? calcCeiling((fob * forex * sst) / opta, precisionDDP) : 0;
    
    // Formula for SP: CEILING(DDP / spMargin, precisionSP)
    const sp = spMargin !== 0 ? calcCeiling(ddp / spMargin, precisionSP) : 0;
    
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
    colA: string,
    colB: string,
    colC: string,
    colD: string,
    category: string, 
    type: string, 
    item: string, 
    uom: string, 
    fob: number, 
    forex: number, 
    sst: number, 
    opta: number,
    spMargin: number = 0.7, // 0.7 or 0.71 or 0.9 based on CSV
    overrideRSP: number | null = null
): MasterItem => {
    const derived = calculateDerivedFields({
        rexScFob: fob,
        forex,
        sst,
        opta,
        spMargin
    });

    return {
        id,
        colA,
        colB,
        colC,
        colD,
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
        spMargin
    };
};

// Parsed Data from CSV with robust calculations
const INITIAL_MASTER_DATA: MasterItem[] = [
// --- EV CHARGER ---
  createItem('101', 'SIEMENS', '', '', '7', 'EV CHARGER', 'A BRAND EV CHARGER', '7 KW AC CHARGER', 'Unit', 3000.00, 1, 1, 0.965, 0.71, 6699.00),
  createItem('102', 'SIEMENS', '', '', '11', 'EV CHARGER', 'A BRAND EV CHARGER', '11 KW AC CHARGER', 'Unit', 3500.00, 1, 1, 0.965, 0.71, 6999.00),
  createItem('103', 'SIEMENS', '', '', '22', 'EV CHARGER', 'A BRAND EV CHARGER', '22 KW AC CHARGER', 'Unit', 4500.00, 1, 1, 0.965, 0.71, 6999.00),
  createItem('104', 'SIEMENS', '', '', '180', 'EV CHARGER', 'A BRAND EV CHARGER', '180 KW DC CHARGER', 'Unit', 95000.00, 4.8, 1.1, 1.000, 0.9, 79999.00), 
  
  createItem('105', 'SIEMENS', '', 'CPC50CC-M', '50', 'EV CHARGER', 'B BRAND EV CHARGER', '55 KW DC CHARGER', 'Unit', 30000.00, 1, 1.08, 1.000, 0.7), 
  createItem('106', 'SIEMENS', '', 'CPC50CC-M', '50', 'EV CHARGER', 'B BRAND EV CHARGER', '240KW DC CHARGER', 'Unit', 60000.00, 1, 1.08, 1.000, 0.7),
  createItem('107', 'SIEMENS', '', 'CPC50CC-M', '50', 'EV CHARGER', 'B BRAND EV CHARGER', '480KW DC CHARGER', 'Unit', 100000.00, 1, 1.08, 1.000, 0.7),

  // --- NON-ARMOURED CABLE ---
  createItem('201', 'MEGA/SOUTHERN', '', '', '', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 6MM PVC CABLE (RED)', 'Meter', 5, 1, 1, 0.965, 0.7),
  createItem('202', 'MEGA/SOUTHERN', '', '', '', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 6MM PVC CABLE (YELLOW)', 'Meter', 5, 1, 1, 0.965, 0.7),
  createItem('203', 'MEGA/SOUTHERN', '', '', '', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 6MM PVC CABLE (BLUE)', 'Meter', 5, 1, 1, 0.965, 0.7),
  createItem('204', 'MEGA/SOUTHERN', '', '', '', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 6MM PVC CABLE (BLACK)', 'Meter', 5, 1, 1, 0.965, 0.7),
  createItem('205', 'MEGA/SOUTHERN', '', '', '', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 6MM PVC CABLE (GREEN)', 'Meter', 5, 1, 1, 0.965, 0.7),
  
  createItem('206', 'MEGA/SOUTHERN', '', '', '', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 10MM PVC CABLE (RED)', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('207', 'MEGA/SOUTHERN', '', '', '', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 10MM PVC CABLE (YELLOW)', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('208', 'MEGA/SOUTHERN', '', '', '', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 10MM PVC CABLE (BLUE)', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('209', 'MEGA/SOUTHERN', '', '', '', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 10MM PVC CABLE (BLACK)', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('210', 'MEGA/SOUTHERN', '', '', '', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 10MM PVC CABLE (GREEN)', 'Meter', 0, 1, 1, 0.965, 0.7),
  
  createItem('211', 'MEGA', '', '', '', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 16MM PVC CABLE (RED)', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('212', 'MEGA', '', '', '', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 16MM PVC CABLE (YELLOW)', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('213', 'MEGA', '', '', '', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 16MM PVC CABLE (BLUE)', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('214', 'MEGA', '', '', '', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 16MM PVC CABLE (BLACK)', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('215', 'MEGA', '', '', '', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 16MM PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  
  createItem('216', 'MEGA/SOUTHERN', '', '', '', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 25MM PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('217', 'MEGA/SOUTHERN', '', '', '', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 35MM PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('218', 'MEGA/SOUTHERN', '', '', '', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 50MM PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('219', 'MEGA/SOUTHERN', '', '', '', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 95MM PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  
  createItem('220', 'MEGA/SOUTHERN', '', '', '', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '3C X 6MM PVC/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('221', 'MEGA/SOUTHERN', '', '', '', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '3C X 10MM PVC/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('222', 'MEGA/SOUTHERN', '', '', '', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '4C X 6MM PVC/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('223', 'MEGA/SOUTHERN', '', '', '', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '4C X 10MM PVC/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('224', 'MEGA/SOUTHERN', '', '', '', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '4C X 16MM PVC/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('225', 'MEGA/SOUTHERN', '', '', '', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '4C X 25MM PVC/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('226', 'MEGA/SOUTHERN', '', '', '', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '4C X 35MM PVC/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),

  // XLPE/PVC
  createItem('250', 'MEGA/SOUTHERN', '', '', '', 'NON-ARMOURED CABLE', 'XLPE/PVC', '1C X 16MM XLPE/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('251', 'MEGA/SOUTHERN', '', '', '', 'NON-ARMOURED CABLE', 'XLPE/PVC', '1C X 35MM XLPE/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('252', 'MEGA/SOUTHERN', '', '', '', 'NON-ARMOURED CABLE', 'XLPE/PVC', '1C X 50MM XLPE/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('253', 'MEGA/SOUTHERN', '', '', '', 'NON-ARMOURED CABLE', 'XLPE/PVC', '1C X 70MM XLPE/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('254', 'MEGA/SOUTHERN', '', '', '', 'NON-ARMOURED CABLE', 'XLPE/PVC', '1C X 95MM XLPE/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('255', 'MEGA/SOUTHERN', '', '', '', 'NON-ARMOURED CABLE', 'XLPE/PVC', '1C X 150MM XLPE/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('256', 'MEGA/SOUTHERN', '', '', '', 'NON-ARMOURED CABLE', 'XLPE/PVC', '1C X 185MM XLPE/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  
  createItem('257', 'SAMA', '', '', '', 'NON-ARMOURED CABLE', 'XLPE/PVC', '4C X 4MM CU/XLPE/PVC Cable', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('258', 'SAMA', '', '', '', 'NON-ARMOURED CABLE', 'XLPE/PVC', '4C X 6MM CU/XLPE/PVC Cable', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('259', 'SAMA', '', '', '', 'NON-ARMOURED CABLE', 'XLPE/PVC', '4C X 10MM CU/XLPE/PVC Cable', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('260', 'SAMA', '', '', '', 'NON-ARMOURED CABLE', 'XLPE/PVC', '4C X 16MM CU/XLPE/PVC Cable', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('261', "SAMA\nMEGA - RM 68", '', '', '', 'NON-ARMOURED CABLE', 'XLPE/PVC', '4C X 25MM CU/XLPE/PVC Cable', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('262', 'SAMA', '', '', '', 'NON-ARMOURED CABLE', 'XLPE/PVC', '4C X 35MM CU/XLPE/PVC Cable', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('263', 'SAMA', '', '', '', 'NON-ARMOURED CABLE', 'XLPE/PVC', '4C X 50MM CU/XLPE/PVC Cable', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('264', 'SAMA', '', '', '', 'NON-ARMOURED CABLE', 'XLPE/PVC', '4C X 70MM CU/XLPE/PVC Cable', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('265', 'SAMA', '', '', '', 'NON-ARMOURED CABLE', 'XLPE/PVC', '4C X 95MM CU/XLPE/PVC Cable', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('266', 'SAMA', '', '', '', 'NON-ARMOURED CABLE', 'XLPE/PVC', '4C X 120MM CU/XLPE/PVC Cable', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('267', 'SAMA', '', '', '', 'NON-ARMOURED CABLE', 'XLPE/PVC', '4C X 150MM CU/XLPE/PVC Cable', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('268', 'SAMA', '', '', '', 'NON-ARMOURED CABLE', 'XLPE/PVC', '4C X 185MM CU/XLPE/PVC Cable', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('269', 'SAMA', '', '', '', 'NON-ARMOURED CABLE', 'XLPE/PVC', '4C X 240MM CU/XLPE/PVC Cable', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('270', 'SAMA', '', '', '', 'NON-ARMOURED CABLE', 'XLPE/PVC', '4C X 300MM CU/XLPE/PVC Cable', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('271', 'SAMA', '', '', '', 'NON-ARMOURED CABLE', 'XLPE/PVC', '4C X 400MM CU/XLPE/PVC Cable', 'Meter', 0, 1, 1, 0.965, 0.7),

  // --- ARMOURED CABLE ---
  createItem('301', 'MEGA/SOUTHERN', '', 'FOR TELD GROUP CHARGING COMMUNICATION USE', '', 'ARMOURED CABLE', 'PVC/AWA/PVC OR PVC/SWA/PVC', '4C X 1.5MM CU/PVC/OSCR/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('302', 'MEGA/SOUTHERN', '', '', '', 'ARMOURED CABLE', 'PVC/AWA/PVC OR PVC/SWA/PVC', '3C X 6MM PVC/SWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('303', 'MEGA/SOUTHERN', '', '', '', 'ARMOURED CABLE', 'PVC/AWA/PVC OR PVC/SWA/PVC', '3C X 10MM PVC/SWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('304', 'MEGA/SOUTHERN', '', '', '', 'ARMOURED CABLE', 'PVC/AWA/PVC OR PVC/SWA/PVC', '4C X 6MM PVC/SWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('305', 'MEGA/SOUTHERN', '', '', '', 'ARMOURED CABLE', 'PVC/AWA/PVC OR PVC/SWA/PVC', '4C X 10MM PVC/SWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  
  createItem('310', 'MEGA/SOUTHERN', '', '', '', 'ARMOURED CABLE', 'XLPE/AWA/PVC', '1C X 95MM XLPE/AWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('311', 'MEGA/SOUTHERN', '', '', '', 'ARMOURED CABLE', 'XLPE/AWA/PVC', '1C X 120MM XLPE/AWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('312', 'MEGA/SOUTHERN', '', '', '', 'ARMOURED CABLE', 'XLPE/AWA/PVC', '1C X 150MM XLPE/AWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('313', 'MEGA/SOUTHERN', '', '', '', 'ARMOURED CABLE', 'XLPE/AWA/PVC', '1C X 185MM XLPE/AWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('314', 'MEGA/SOUTHERN', '', '', '', 'ARMOURED CABLE', 'XLPE/AWA/PVC', '1C X 240MM XLPE/AWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  
  createItem('320', 'MEGA/SOUTHERN', '', '', '', 'ARMOURED CABLE', 'XLPE/SWA/PVC', '4C X 16MM XLPE/SWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('321', 'MEGA/SOUTHERN', '', '', '', 'ARMOURED CABLE', 'XLPE/SWA/PVC', '4C X 25MM XLPE/SWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('322', 'MEGA/SOUTHERN', '', '', '', 'ARMOURED CABLE', 'XLPE/SWA/PVC', '4C X 35MM XLPE/SWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('323', 'MEGA/SOUTHERN', '', '', '', 'ARMOURED CABLE', 'XLPE/SWA/PVC', '4C X 50MM XLPE/SWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('324', 'MEGA/SOUTHERN', '', '', '', 'ARMOURED CABLE', 'XLPE/SWA/PVC', '4C X 70MM XLPE/SWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('325', 'MEGA/SOUTHERN', '', '', '', 'ARMOURED CABLE', 'XLPE/SWA/PVC', '4C X 95MM XLPE/SWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('326', 'MEGA/SOUTHERN', '', '', '', 'ARMOURED CABLE', 'XLPE/SWA/PVC', '4C X 120MM XLPE/SWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('327', 'MEGA/SOUTHERN', '', '', '', 'ARMOURED CABLE', 'XLPE/SWA/PVC', '4C X 150MM XLPE/SWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('328', 'MEGA/SOUTHERN', '', '', '', 'ARMOURED CABLE', 'XLPE/SWA/PVC', '4C X 185MM XLPE/SWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('329', 'MEGA/SOUTHERN', '', '', '', 'ARMOURED CABLE', 'XLPE/SWA/PVC', '4C X 240MM XLPE/SWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),

  // --- CABLE ACCESSORIES ---
  createItem('401', 'PVCLINK', '2282082', 'PCC 20-W', '', 'ELECTRICAL INSTALLATION EQUIPMENT', 'CABLE ACCESORIES', 'PVC FLEXIBLE CONDUIT 20MM WHITE', 'Meter', 0, 1, 1, 1.000, 0.7),
  createItem('402', 'PVCLINK', '2089263', 'PCC 25-W', '', 'ELECTRICAL INSTALLATION EQUIPMENT', 'CABLE ACCESORIES', "PVC FLEXIBLE CONDUIT 25MM (1'') WHITE", 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('403', 'PLASMA', '2222162', '2222162', '', 'ELECTRICAL INSTALLATION EQUIPMENT', 'CABLE ACCESORIES', 'GI FLEXIBLE CONDUIT 20MM (3/4")', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('404', 'PLASMA', '2434578', '2434578', '', 'ELECTRICAL INSTALLATION EQUIPMENT', 'CABLE ACCESORIES', 'GI FLEXIBLE CONDUIT 25MM (1")', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('405', 'PVCLINK', '2157148', 'PH 20', '', 'ELECTRICAL INSTALLATION EQUIPMENT', 'CABLE ACCESORIES', "PVC PIPE 20MM (3/4'') WHITE", 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('406', 'PVCLINK', '2157150', 'PH 25', '', 'ELECTRICAL INSTALLATION EQUIPMENT', 'CABLE ACCESORIES', "PVC PIPE 25MM (1'') WHITE", 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('407', 'WIREMAN', '', '', '', 'ELECTRICAL INSTALLATION EQUIPMENT', 'CABLE ACCESORIES', 'PVC MINI TRUNKING 50MMX16MM (2"X5/8") WHITE', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('408', 'NONE', '', '', '', 'ELECTRICAL INSTALLATION EQUIPMENT', 'CABLE ACCESORIES', 'ACCESSORIES (HOME)', 'Lot', 0, 1, 1, 0.965, 0.7),
  createItem('409', 'NONE', '', '', '', 'ELECTRICAL INSTALLATION EQUIPMENT', 'CABLE ACCESORIES', 'ACCESSORIES (COMMERCIAL)', 'Lot', 0, 1, 1, 0.955, 0.7),
  
  // ISOLATOR
  createItem('501', 'PLASMA', '', 'PWHD-35A', '', 'ELECTRICAL INSTALLATION EQUIPMENT', 'ISOLATOR', 'WEATHER PROOF ISOLATOR 35A 3P (STANDARD)', 'Unit', 0, 1, 1, 0.965, 0.7),
  createItem('502', 'PLASMA', '2166877', 'PWHD-35A', '', 'ELECTRICAL INSTALLATION EQUIPMENT', 'ISOLATOR', 'WEATHER PROOF ISOLATOR 35A 2P', 'Unit', 0, 1, 1, 0.965, 0.7),
  createItem('503', 'SCHNEIDER', '2021258', 'WHD35 GY', '', 'ELECTRICAL INSTALLATION EQUIPMENT', 'ISOLATOR', 'WEATHER PROOF ISOLATOR SWITCH IP66 2P 35A', 'Unit', 0, 1, 1, 0.965, 0.7),
  createItem('504', 'SCHNEIDER', '2533078', 'WHT20_G11', '', 'ELECTRICAL INSTALLATION EQUIPMENT', 'ISOLATOR', 'WEATHER PROOF ISOLATOR SWITCH IP66 3P 20A', 'Unit', 0, 1, 1, 0.965, 0.7),
  createItem('505', 'SCHNEIDER', '2533079', 'WHT35_G11', '', 'ELECTRICAL INSTALLATION EQUIPMENT', 'ISOLATOR', 'WEATHER PROOF ISOLATOR SWITCH IP66 3P 35A', 'Unit', 0, 1, 1, 0.965, 0.7),
  createItem('506', 'SCHNEIDER', '2533080', 'WHT63_G11', '', 'ELECTRICAL INSTALLATION EQUIPMENT', 'ISOLATOR', 'KAVACHA WEATHER PROOF ISOLATOR SWITCH IP66 3P 63A', 'Unit', 0, 1, 1, 0.965, 0.7),
  createItem('507', 'SCHNEIDER', '2025010', 'LV429387', '', 'ELECTRICAL INSTALLATION EQUIPMENT', 'ISOLATOR', 'SHUNT TRIP VOLTAGE RELEASE MX 208-277V 60HZ 220-240V 50/60HZ', 'Unit', 0, 1, 1, 0.965, 0.7),
  createItem('508', 'SCHNEIDER', '2027553', 'LV429451', '', 'ELECTRICAL INSTALLATION EQUIPMENT', 'ISOLATOR', 'TRIP UNIT ACCESSORY SDE ADAPTOR FOR NSX100-250 (X 10PCS)', 'Unit', 0, 1, 1, 0.965, 0.7),

  // INDOOR ENCLOSURE BOX
  createItem('510', 'PVCLINK', '2026228', 'PEB 644-PC-T', '', 'ELECTRICAL INSTALLATION EQUIPMENT', 'INDOOR ENCLOSURE BOX', 'WEATHERPROOF ENCLOSURE BOX W/TP COVER 155MM X 115MM X 110M', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('511', 'PVCLINK', '2074736', 'PEB 864-PC-T', '', 'ELECTRICAL INSTALLATION EQUIPMENT', 'INDOOR ENCLOSURE BOX', 'WEATHERPROOF ENCLOSURE BOX W/TP COVER 215MM X 150MM X 110MM', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('512', 'PVCLINK', '2010314', 'PEB 1084', '', 'ELECTRICAL INSTALLATION EQUIPMENT', 'INDOOR ENCLOSURE BOX', 'WEATHERPROOF ENCLOSURE BOX 250MM X200MM X 110MM', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('513', 'PVCLINK', '2020108', 'PEB 884', '', 'ELECTRICAL INSTALLATION EQUIPMENT', 'INDOOR ENCLOSURE BOX', 'WEATHERPROOF ENCLOSURE BOX 215MM X 215MM X 110MM', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('514', 'PVCLINK', '2020105', 'PEB 1086', '', 'ELECTRICAL INSTALLATION EQUIPMENT', 'INDOOR ENCLOSURE BOX', 'WEATHERPROOF ENCLOSURE BOX 250MM X 200MM X 160MM', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('515', 'PVCLINK', '2161953', 'PL 06-10S', '', 'ELECTRICAL INSTALLATION EQUIPMENT', 'INDOOR ENCLOSURE BOX', 'MCB BOX 10 WAYS 222 X 146 X 98MM (SMOKE)', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('516', 'PVCLINK', '2073028', 'PL 08-12T', '', 'ELECTRICAL INSTALLATION EQUIPMENT', 'INDOOR ENCLOSURE BOX', 'MCB BOX 12 WAYS 256 X 176 X 98MM (TRANSPARENT)', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('517', 'PVCLINK', '2073029', 'PL 12-16T', '', 'ELECTRICAL INSTALLATION EQUIPMENT', 'INDOOR ENCLOSURE BOX', 'MCB BOX 16 WAYS 327 X 176 X 98MM (TRANSPARENT)', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('518', 'THAM CHEE', '', '', '', 'ELECTRICAL INSTALLATION EQUIPMENT', 'INDOOR ENCLOSURE BOX', 'PVC MCB BOX FOR SURFACE TYPE 9WAY', 'Unit', 0, 1, 1, 0.965, 0.7),

  // OUTDOOR ENCLOSURE BOX
  createItem('520', 'EPS', '2115869', 'EL2M 2N', '', 'ELECTRICAL INSTALLATION EQUIPMENT', 'OUTDOOR ENCLOSURE BOX', 'DISTRIBUTION BOARD 2 ROW 24 WAYS', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('521', 'EPS', '2002146', 'EL3M 2N', '', 'ELECTRICAL INSTALLATION EQUIPMENT', 'OUTDOOR ENCLOSURE BOX', 'DISTRIBUTION BOARD 3 ROW 46 WAYS', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('522', 'CVS', '2053836', 'CR404020', '', 'ELECTRICAL INSTALLATION EQUIPMENT', 'OUTDOOR ENCLOSURE BOX', 'METAL BOX 400MM X 400MM X 200MM', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('523', 'CVS', '2056171', 'CR604020', '', 'ELECTRICAL INSTALLATION EQUIPMENT', 'OUTDOOR ENCLOSURE BOX', 'METAL BOX 600MM X 400MM X 200MM', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('524', 'CVS', '2064627', 'CR705025', '', 'ELECTRICAL INSTALLATION EQUIPMENT', 'OUTDOOR ENCLOSURE BOX', 'METAL BOX 700MM X 500MM X 250MM', 'Unit', 0, 1, 1, 1.000, 0.7),

  // EVDB & ADDONS
  createItem('601', 'HUAWEI', '2405705', 'DDSU666-H', '', 'EV DISTRIBUTION BOARD', 'EVDB ADD ON & ACCESSORIES', 'SMART POWER SENSOR SINGLE PHASE 2 WIRES', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('602', 'DELAB', '2210336', 'PQM-1000S', '', 'EV DISTRIBUTION BOARD', 'EVDB ADD ON & ACCESSORIES', 'PQM-1000S POWER QUALITY NETWORK ANALYZER', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('603', 'CVS', '', '', '', 'EV DISTRIBUTION BOARD', 'EVDB ADD ON & ACCESSORIES', 'INNER DOOR', 'Unit', 0, 1, 1, 0.965, 0.7),
  createItem('604', 'CVS', '', '', '', 'EV DISTRIBUTION BOARD', 'EVDB ADD ON & ACCESSORIES', 'POLY DOOR', 'Unit', 0, 1, 1, 0.965, 0.7),
  createItem('605', 'CVS', '', '', '', 'EV DISTRIBUTION BOARD', 'EVDB ADD ON & ACCESSORIES', 'CANOPY', 'Unit', 0, 1, 1, 0.965, 0.7),
  
  createItem('610', 'SCHNEIDER', '2098735', 'EZC100F3020', '', 'EV DISTRIBUTION BOARD', 'MCCB', 'EASYPACT EZC100F TMD MCCB 3P 20A 10KA MC', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('611', 'SCHNEIDER', '2072331', 'EZC100F3025', '', 'EV DISTRIBUTION BOARD', 'MCCB', 'EASYPACT EZC100F TMD MCCB 3P 3D 25A 10KA MC', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('612', 'SCHNEIDER', '2098738', 'EZC100F3040', '', 'EV DISTRIBUTION BOARD', 'MCCB', 'EASYPACT EZC100F TMD MCCB 3P 40A 10KA MC', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('613', 'SCHNEIDER', '2098739', 'EZC100F3050', '', 'EV DISTRIBUTION BOARD', 'MCCB', 'EASYPACT EZC100F TMD MCCB 3P 3D 50A 10KA MC', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('614', 'SCHNEIDER', '2052690', 'EZC100F3060', '', 'EV DISTRIBUTION BOARD', 'MCCB', 'EASYPACT EZC100F TMD MCCB 63A 3P', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('615', 'SCHNEIDER', '2052691', 'EZC100F3075', '', 'EV DISTRIBUTION BOARD', 'MCCB', 'EASYPACT EZC100F TMD MCCB 75A 3P', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('616', 'SCHNEIDER', '2098741', 'EZC100F3080', '', 'EV DISTRIBUTION BOARD', 'MCCB', 'EASYPACT EZC100F TMD MCCB 3P 80A 10KA MC', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('617', 'SCHNEIDER', '2098742', 'EZC100F3100', '', 'EV DISTRIBUTION BOARD', 'MCCB', 'EASYPACT EZC100F TMD MCCB 3P 100A 10KA MC', 'Unit', 0, 1, 1, 1.000, 0.7),
  
  createItem('620', 'SCHNEIDER', '2151574', 'EZ9F56240', '', 'EV DISTRIBUTION BOARD', 'MCB', 'HIMEL MCB 2P 40A 6KA 230V C CURVE', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('621', 'TERASAKI', '', 'TER-TMC06403', '', 'EV DISTRIBUTION BOARD', 'MCB', 'TEMLITE 40A 2P 6KA MCB', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('622', 'HAGER', '2017533', 'NC106A', '', 'EV DISTRIBUTION BOARD', 'MCB', 'MCB 1P 6A 10KA C CURVE', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('623', 'SCHNEIDER', '2151574', 'EZ9F56240', '', 'EV DISTRIBUTION BOARD', 'MCB', 'EASY 9 MCB 2P 40A 6KA 230V C CURVE', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('624', 'SCHNEIDER', '2151574', 'EZ9F56240', '', 'EV DISTRIBUTION BOARD', 'MCB', 'MCB 4P 40A 6KA 230V C CURVE', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('625', 'TERASAKI', '', 'TER-TMC06403', '', 'EV DISTRIBUTION BOARD', 'MCB', '40A 4P 6KA MCB', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('626', 'TERASAKI', '', 'TER-TMC06403', '', 'EV DISTRIBUTION BOARD', 'MCB', '40A 3P 6KA MCB', 'Unit', 0, 1, 1, 1.000, 0.7),
  
  createItem('630', '', '', '', '', 'EV DISTRIBUTION BOARD', 'RCCB', 'RCCB 2P 40A 30MA TYPE A', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('631', 'TERASAKI', '', 'TER-TMC06403', '', 'EV DISTRIBUTION BOARD', 'RCCB', '40A 2P RCCB TYPE A', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('632', '', '', '', '', 'EV DISTRIBUTION BOARD', 'RCCB', 'RCCB 4P 40A 30MA TYPE A', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('633', 'TERASAKI', '', 'TER-TMC06403', '', 'EV DISTRIBUTION BOARD', 'RCCB', '40A 4P RCCB TYPE A', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('634', 'TERASAKI', '2056862', 'EPR4100100AC', '100', 'EV DISTRIBUTION BOARD', 'RCCB', 'EPR SERIES ELCB 100A 4P 100MA', 'Unit', 0, 1, 1, 0.965, 0.7),
  
  createItem('640', 'NOVARIS', '2395160', 'NSP1-40-320-N', '', 'EV DISTRIBUTION BOARD', 'SURGE PROTECTION DEVICE', 'NSP SURGE DIVERTER 1PHASE IN 20KA IMAX 40KA 320V', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('641', 'NOVARIS', '2395161', 'NSP3-40-320-N', '', 'EV DISTRIBUTION BOARD', 'SURGE PROTECTION DEVICE', 'NSP SURGE DIVERTER 3PHASE IN 20KA IMAX 40KA 320V', 'Unit', 0, 1, 1, 0.965, 0.7),
  
  createItem('650', 'TERASAKI', '2010723', 'T2SH00LA20WB', '', 'EV DISTRIBUTION BOARD', 'SHUNT TRIP', 'HM1-100/ST SHUNT TRIP EPS (FOR MCCB UP TO 100A)', 'Unit', 0, 1, 1, 0.965, 0.7),
  createItem('651', 'TERASAKI', '2010723', 'T2SH00LA20WB', '', 'EV DISTRIBUTION BOARD', 'SHUNT TRIP', 'SHUNT TRIP FOR S100SF S160SCF E160SF E250SF S250SF MCCB', 'Unit', 0, 1, 1, 0.965, 0.7),
  createItem('652', 'SCHNEIDER', '2025010', 'LV429387', '', 'EV DISTRIBUTION BOARD', 'SHUNT TRIP', 'SHUNT TRIP VOLTAGE RELEASE MX 208-277V 60HZ 220-240V 50/60HZ', 'Unit', 0, 1, 1, 0.965, 0.7),
  createItem('653', 'SCHNEIDER', '2027553', 'LV429451', '', 'EV DISTRIBUTION BOARD', 'SHUNT TRIP', 'TRIP UNIT ACCESSORY SDE ADAPTOR FOR NSX100-250 (X 10PCS)', 'Unit', 0, 1, 1, 0.965, 0.7),
  createItem('654', 'SCHNEIDER', '2018040', 'EZASHT200AC', '', 'EV DISTRIBUTION BOARD', 'SHUNT TRIP', 'SHUNT TRIP RELEASE SHT 200-277VAC FOR EZC400', 'Unit', 0, 1, 1, 1.000, 0.7),
  
  createItem('660', 'MIKRO', '2014396', 'DM38', '', 'EV DISTRIBUTION BOARD', 'DPM', 'DIGITAL POWER METER 70-300 VAC', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('661', 'DELAB', '2210336', 'PQM-1000S', '', 'EV DISTRIBUTION BOARD', 'DPM', 'PQM-1000S POWER QUALITY NETWORK ANALYZER', 'Unit', 0, 1, 1, 1.000, 0.7),
  
  createItem('670', 'ASAHI', '2049662', 'CL3-5VA-40/5', '', 'EV DISTRIBUTION BOARD', 'CT', 'CURRENT TRANSFORMER CLASS 3 5VA RATIO:40/5A', 'Unit', 0, 1, 1, 0.965, 0.7),
  
  createItem('680', '', '2044280', 'SZ22C40-LER', '', 'EV DISTRIBUTION BOARD', 'PILOT LIGHT', 'LED PILOT LIGHT 22MM 240V RED', 'Unit', 0, 1, 1, 0.965, 0.7),
  createItem('681', '', '2020315', 'SZ22C60-LEB', '', 'EV DISTRIBUTION BOARD', 'PILOT LIGHT', 'LED PILOT LIGHT 22MM 240V BLUE', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('682', '', '2018201', ' SZ22C50-LEY', '', 'EV DISTRIBUTION BOARD', 'PILOT LIGHT', 'LED PILOT LIGHT 22MM 240V YELLOW', 'Unit', 0, 1, 1, 1.000, 0.7),
  
  createItem('690', '', '2209978', 'DP-34-024D', '', 'EV DISTRIBUTION BOARD', 'EFOC', 'EARTH FAULT & OVERCURRENT RELAY IDMT (DP-34-024D), DC18-72V', 'Unit', 0, 1, 1, 0.965, 0.7),
  createItem('691', 'DELAB', '2209978', 'DP-31', '', 'EV DISTRIBUTION BOARD', 'EFOC', 'EARTH FAULT RELAY IDMT DP-31', 'Unit', 0, 1, 1, 0.965, 0.7),
  
  // ... (Abbreviated for brevity, logic unchanged for initial data)
  createItem('691', 'DELAB', '2209978', 'DP-31', '', 'EV DISTRIBUTION BOARD', 'EFOC', 'EARTH FAULT RELAY IDMT DP-31', 'Unit', 0, 1, 1, 0.965, 0.7),
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
    versions: p.versions || [{ id: 'v1', name: 'version-1', createdAt: new Date().toISOString() }],
    discount: p.discount || 0 // Default discount to 0
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
        const saved = localStorage.getItem('swiftbq_masterData');
        return saved ? JSON.parse(saved) : INITIAL_MASTER_DATA;
    } catch (e) {
        return INITIAL_MASTER_DATA;
    }
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    try {
        const saved = localStorage.getItem('swiftbq_projects');
        return saved ? migrateProjects(JSON.parse(saved)) : [];
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

  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
  const [bqViewMode, setBqViewMode] = useState<BQViewMode>('catalog');

  const [quotationEdits, setQuotationEdits] = useState<Record<string, string>>({});
  const [masterListEdits, setMasterListEdits] = useState<Record<string, Partial<MasterItem>>>({});

  const hasUnsavedChanges = useMemo(() => 
    Object.keys(quotationEdits).length > 0 || Object.keys(masterListEdits).length > 0, 
  [quotationEdits, masterListEdits]);


  // --- Persistence Effects ---
  useEffect(() => { localStorage.setItem('swiftbq_masterData', JSON.stringify(masterData)); }, [masterData]);
  useEffect(() => { localStorage.setItem('swiftbq_projects', JSON.stringify(projects)); }, [projects]);
  useEffect(() => { localStorage.setItem('swiftbq_bqItems', JSON.stringify(bqItems)); }, [bqItems]);
  useEffect(() => { localStorage.setItem('swiftbq_appSettings', JSON.stringify(appSettings)); }, [appSettings]);


  // --- Master Data Actions ---
  const addMasterItem = (item: MasterItem) => {
    setMasterData(prev => [...prev, item]);
  };

  const updateMasterItem = (id: string, updates: Partial<MasterItem>) => {
    setMasterData((prev) => 
        prev.map((item) => {
            if (item.id === id) {
                const isCalculationNeeded = 
                    'rexScFob' in updates || 'forex' in updates || 'sst' in updates || 'opta' in updates || 'spMargin' in updates;

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
          // Merge to calculate derived - allow value to be string during edit
          const mergedForCalc = { ...currentItem, ...existingEdits, [field]: value };
          
          let derivedUpdates = {};
          if (['rexScFob', 'forex', 'sst', 'opta', 'spMargin'].includes(field as string)) {
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
              // Safe conversion to numbers for numeric fields upon commit
              const numericFields: (keyof MasterItem)[] = ['price', 'rexScFob', 'forex', 'sst', 'opta', 'rexScDdp', 'rexSp', 'rexRsp', 'spMargin'];
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
        versions: [{ id: 'v1', name: 'version-1', createdAt: new Date().toISOString() }]
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

  // --- Version Actions ---
  const createVersion = (projectId: string, sourceVersionId: string, newVersionName: string) => {
    const newVersionId = Date.now().toString(); 
    
    setProjects(prev => prev.map(p => {
        if (p.id === projectId) {
            return {
                ...p,
                versions: [...p.versions, { id: newVersionId, name: newVersionName, createdAt: new Date().toISOString() }]
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
      price: 0,
      qty: 1,
      uom: '',
      total: 0,
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
                  category: masterItem.category,
                  itemName: masterItem.itemName,
                  description: masterItem.description,
                  price: masterItem.rexRsp, 
                  qty: qty,
                  uom: masterItem.uom,
                  total: masterItem.rexRsp * qty,
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
        addProject, updateProject, deleteProject,
        createVersion, updateVersionName, deleteVersion,
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
