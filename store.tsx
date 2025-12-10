
import React, { createContext, useContext, useState, useEffect } from 'react';
import { MasterItem, BQItem, ProjectDetails, AppSettings } from './types';

interface AppContextType {
  masterData: MasterItem[];
  setMasterData: React.Dispatch<React.SetStateAction<MasterItem[]>>;
  bqItems: BQItem[];
  setBqItems: React.Dispatch<React.SetStateAction<BQItem[]>>;
  projectDetails: ProjectDetails;
  setProjectDetails: React.Dispatch<React.SetStateAction<ProjectDetails>>;
  appSettings: AppSettings;
  setAppSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  addMasterItem: (item: MasterItem) => void;
  updateMasterItem: (id: string, updates: Partial<MasterItem>) => void;
  deleteMasterItem: (id: string) => void;
  addBQItem: () => void;
  removeBQItem: (id: string) => void;
  updateBQItem: (id: string, field: keyof BQItem, value: any) => void;
  calculateTotal: () => { subtotal: number; tax: number; grandTotal: number };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper for robust calculation (Ceiling logic from excel)
const calcCeiling = (val: number, significance: number) => {
    if (significance === 0) return val;
    return Math.ceil(val / significance) * significance;
};

// Calculate derived fields
const calculateDerivedFields = (item: Partial<MasterItem>): Partial<MasterItem> => {
    // Default values if missing
    const fob = item.rexScFob ?? 0;
    const forex = item.forex ?? 1;
    const sst = item.sst ?? 1;
    const opta = item.opta ?? 0.97;
    const spMargin = item.spMargin ?? 0.7;

    // Heuristic for precision based on value or category can be complex.
    // Using rules derived from CSV: 
    // High value items (>100) usually use precision 1
    // Low value items (Cables/Accessories) use precision 0.01 for DDP and 0.1 for SP
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
  // A BRAND - Opta 0.965, Margin 0.71
  createItem('101', 'EV CHARGER', 'A BRAND EV CHARGER', '7 KW AC CHARGER', 'Unit', 3000.00, 1, 1, 0.965, 0.71, 6699.00),
  createItem('102', 'EV CHARGER', 'A BRAND EV CHARGER', '11 KW AC CHARGER', 'Unit', 3500.00, 1, 1, 0.965, 0.71, 6999.00),
  createItem('103', 'EV CHARGER', 'A BRAND EV CHARGER', '22 KW AC CHARGER', 'Unit', 4500.00, 1, 1, 0.965, 0.71, 6999.00),
  createItem('104', 'EV CHARGER', 'A BRAND EV CHARGER', '180 KW DC CHARGER', 'Unit', 95000.00, 4.8, 1.1, 1.000, 0.9, 79999.00), 
  
  // B BRAND - Opta 1.000, Margin 0.7
  createItem('105', 'EV CHARGER', 'B BRAND EV CHARGER', '55 KW DC CHARGER', 'Unit', 30000.00, 1, 1.08, 1.000, 0.7), 
  createItem('106', 'EV CHARGER', 'B BRAND EV CHARGER', '240KW DC CHARGER', 'Unit', 60000.00, 1, 1.08, 1.000, 0.7),
  createItem('107', 'EV CHARGER', 'B BRAND EV CHARGER', '480KW DC CHARGER', 'Unit', 100000.00, 1, 1.08, 1.000, 0.7),

  // --- NON-ARMOURED CABLE ---
  // PVC OR PVC/PVC - Opta 0.965, Margin 0.7
  createItem('201', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 6MM PVC CABLE (RED)', 'Meter', 5, 1, 1, 0.965, 0.7),
  createItem('202', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 6MM PVC CABLE (YELLOW)', 'Meter', 5, 1, 1, 0.965, 0.7),
  createItem('203', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 6MM PVC CABLE (BLUE)', 'Meter', 5, 1, 1, 0.965, 0.7),
  createItem('204', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 6MM PVC CABLE (BLACK)', 'Meter', 5, 1, 1, 0.965, 0.7),
  createItem('205', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 6MM PVC CABLE (GREEN)', 'Meter', 5, 1, 1, 0.965, 0.7),
  
  createItem('206', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 10MM PVC CABLE (RED)', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('207', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 10MM PVC CABLE (YELLOW)', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('208', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 10MM PVC CABLE (BLUE)', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('209', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 10MM PVC CABLE (BLACK)', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('210', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 10MM PVC CABLE (GREEN)', 'Meter', 0, 1, 1, 0.965, 0.7),
  
  createItem('211', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 16MM PVC CABLE (RED)', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('212', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 16MM PVC CABLE (YELLOW)', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('213', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 16MM PVC CABLE (BLUE)', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('214', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 16MM PVC CABLE (BLACK)', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('215', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 16MM PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  
  createItem('216', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 25MM PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('217', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 35MM PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('218', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 50MM PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('219', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '1C X 95MM PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  
  createItem('220', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '3C X 6MM PVC/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('221', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '3C X 10MM PVC/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('222', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '4C X 6MM PVC/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('223', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '4C X 10MM PVC/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('224', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '4C X 16MM PVC/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('225', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '4C X 25MM PVC/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('226', 'NON-ARMOURED CABLE', 'PVC OR PVC/PVC', '4C X 35MM PVC/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),

  // XLPE/PVC - Opta 0.965, Margin 0.7
  createItem('250', 'NON-ARMOURED CABLE', 'XLPE/PVC', '1C X 16MM XLPE/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('251', 'NON-ARMOURED CABLE', 'XLPE/PVC', '1C X 35MM XLPE/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('252', 'NON-ARMOURED CABLE', 'XLPE/PVC', '1C X 50MM XLPE/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('253', 'NON-ARMOURED CABLE', 'XLPE/PVC', '1C X 70MM XLPE/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('254', 'NON-ARMOURED CABLE', 'XLPE/PVC', '1C X 95MM XLPE/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('255', 'NON-ARMOURED CABLE', 'XLPE/PVC', '1C X 150MM XLPE/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('256', 'NON-ARMOURED CABLE', 'XLPE/PVC', '1C X 185MM XLPE/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  
  createItem('257', 'NON-ARMOURED CABLE', 'XLPE/PVC', '4C X 4MM CU/XLPE/PVC Cable', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('258', 'NON-ARMOURED CABLE', 'XLPE/PVC', '4C X 6MM CU/XLPE/PVC Cable', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('259', 'NON-ARMOURED CABLE', 'XLPE/PVC', '4C X 10MM CU/XLPE/PVC Cable', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('260', 'NON-ARMOURED CABLE', 'XLPE/PVC', '4C X 16MM CU/XLPE/PVC Cable', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('261', 'NON-ARMOURED CABLE', 'XLPE/PVC', '4C X 25MM CU/XLPE/PVC Cable', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('262', 'NON-ARMOURED CABLE', 'XLPE/PVC', '4C X 35MM CU/XLPE/PVC Cable', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('263', 'NON-ARMOURED CABLE', 'XLPE/PVC', '4C X 50MM CU/XLPE/PVC Cable', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('264', 'NON-ARMOURED CABLE', 'XLPE/PVC', '4C X 70MM CU/XLPE/PVC Cable', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('265', 'NON-ARMOURED CABLE', 'XLPE/PVC', '4C X 95MM CU/XLPE/PVC Cable', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('266', 'NON-ARMOURED CABLE', 'XLPE/PVC', '4C X 120MM CU/XLPE/PVC Cable', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('267', 'NON-ARMOURED CABLE', 'XLPE/PVC', '4C X 150MM CU/XLPE/PVC Cable', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('268', 'NON-ARMOURED CABLE', 'XLPE/PVC', '4C X 185MM CU/XLPE/PVC Cable', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('269', 'NON-ARMOURED CABLE', 'XLPE/PVC', '4C X 240MM CU/XLPE/PVC Cable', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('270', 'NON-ARMOURED CABLE', 'XLPE/PVC', '4C X 300MM CU/XLPE/PVC Cable', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('271', 'NON-ARMOURED CABLE', 'XLPE/PVC', '4C X 400MM CU/XLPE/PVC Cable', 'Meter', 0, 1, 1, 0.965, 0.7),

  // --- ARMOURED CABLE ---
  // PVC/AWA/PVC OR PVC/SWA/PVC - Opta 0.965, Margin 0.7
  createItem('301', 'ARMOURED CABLE', 'PVC/AWA/PVC OR PVC/SWA/PVC', '4C X 1.5MM CU/PVC/OSCR/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('302', 'ARMOURED CABLE', 'PVC/AWA/PVC OR PVC/SWA/PVC', '3C X 6MM PVC/SWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('303', 'ARMOURED CABLE', 'PVC/AWA/PVC OR PVC/SWA/PVC', '3C X 10MM PVC/SWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('304', 'ARMOURED CABLE', 'PVC/AWA/PVC OR PVC/SWA/PVC', '4C X 6MM PVC/SWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('305', 'ARMOURED CABLE', 'PVC/AWA/PVC OR PVC/SWA/PVC', '4C X 10MM PVC/SWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),

  // XLPE/AWA/PVC - Opta 0.965, Margin 0.7
  createItem('310', 'ARMOURED CABLE', 'XLPE/AWA/PVC', '1C X 95MM XLPE/AWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('311', 'ARMOURED CABLE', 'XLPE/AWA/PVC', '1C X 120MM XLPE/AWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('312', 'ARMOURED CABLE', 'XLPE/AWA/PVC', '1C X 150MM XLPE/AWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('313', 'ARMOURED CABLE', 'XLPE/AWA/PVC', '1C X 185MM XLPE/AWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('314', 'ARMOURED CABLE', 'XLPE/AWA/PVC', '1C X 240MM XLPE/AWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),

  // XLPE/SWA/PVC - Opta 0.965, Margin 0.7
  createItem('320', 'ARMOURED CABLE', 'XLPE/SWA/PVC', '4C X 16MM XLPE/SWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('321', 'ARMOURED CABLE', 'XLPE/SWA/PVC', '4C X 25MM XLPE/SWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('322', 'ARMOURED CABLE', 'XLPE/SWA/PVC', '4C X 35MM XLPE/SWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('323', 'ARMOURED CABLE', 'XLPE/SWA/PVC', '4C X 50MM XLPE/SWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('324', 'ARMOURED CABLE', 'XLPE/SWA/PVC', '4C X 70MM XLPE/SWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('325', 'ARMOURED CABLE', 'XLPE/SWA/PVC', '4C X 95MM XLPE/SWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('326', 'ARMOURED CABLE', 'XLPE/SWA/PVC', '4C X 120MM XLPE/SWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('327', 'ARMOURED CABLE', 'XLPE/SWA/PVC', '4C X 150MM XLPE/SWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('328', 'ARMOURED CABLE', 'XLPE/SWA/PVC', '4C X 185MM XLPE/SWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('329', 'ARMOURED CABLE', 'XLPE/SWA/PVC', '4C X 240MM XLPE/SWA/PVC CABLE', 'Meter', 0, 1, 1, 0.965, 0.7),

  // --- CABLE ACCESSORIES ---
  // Opta: 1.000 for PCC 20-W, 0.965 for rest usually, or 0.955 for commercial acc
  createItem('401', 'ELECTRICAL INSTALLATION EQUIPMENT', 'CABLE ACCESORIES', 'PVC FLEXIBLE CONDUIT 20MM WHITE', 'Meter', 0, 1, 1, 1.000, 0.7),
  createItem('402', 'ELECTRICAL INSTALLATION EQUIPMENT', 'CABLE ACCESORIES', "PVC FLEXIBLE CONDUIT 25MM (1'') WHITE", 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('403', 'ELECTRICAL INSTALLATION EQUIPMENT', 'CABLE ACCESORIES', 'GI FLEXIBLE CONDUIT 20MM (3/4")', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('404', 'ELECTRICAL INSTALLATION EQUIPMENT', 'CABLE ACCESORIES', 'GI FLEXIBLE CONDUIT 25MM (1")', 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('405', 'ELECTRICAL INSTALLATION EQUIPMENT', 'CABLE ACCESORIES', "PVC PIPE 20MM (3/4'') WHITE", 'Meter', 0, 1, 1, 0.965, 0.7),
  createItem('406', 'ELECTRICAL INSTALLATION EQUIPMENT', 'CABLE ACCESORIES', "PVC PIPE 25MM (1'') WHITE", 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('407', 'ELECTRICAL INSTALLATION EQUIPMENT', 'CABLE ACCESORIES', 'PVC MINI TRUNKING 50MMX16MM (2"X5/8") WHITE', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('408', 'ELECTRICAL INSTALLATION EQUIPMENT', 'CABLE ACCESORIES', 'ACCESSORIES (HOME)', 'Lot', 0, 1, 1, 0.965, 0.7),
  createItem('409', 'ELECTRICAL INSTALLATION EQUIPMENT', 'CABLE ACCESORIES', 'ACCESSORIES (COMMERCIAL)', 'Lot', 0, 1, 1, 0.955, 0.7),
  
  // ISOLATOR - Opta 0.965, Margin 0.7
  createItem('501', 'ELECTRICAL INSTALLATION EQUIPMENT', 'ISOLATOR', 'WEATHER PROOF ISOLATOR 35A 3P (STANDARD)', 'Unit', 0, 1, 1, 0.965, 0.7),
  createItem('502', 'ELECTRICAL INSTALLATION EQUIPMENT', 'ISOLATOR', 'WEATHER PROOF ISOLATOR 35A 2P', 'Unit', 0, 1, 1, 0.965, 0.7),
  createItem('503', 'ELECTRICAL INSTALLATION EQUIPMENT', 'ISOLATOR', 'WEATHER PROOF ISOLATOR SWITCH IP66 2P 35A', 'Unit', 0, 1, 1, 0.965, 0.7),
  createItem('504', 'ELECTRICAL INSTALLATION EQUIPMENT', 'ISOLATOR', 'WEATHER PROOF ISOLATOR SWITCH IP66 3P 20A', 'Unit', 0, 1, 1, 0.965, 0.7),
  createItem('505', 'ELECTRICAL INSTALLATION EQUIPMENT', 'ISOLATOR', 'WEATHER PROOF ISOLATOR SWITCH IP66 3P 35A', 'Unit', 0, 1, 1, 0.965, 0.7),
  createItem('506', 'ELECTRICAL INSTALLATION EQUIPMENT', 'ISOLATOR', 'KAVACHA WEATHER PROOF ISOLATOR SWITCH IP66 3P 63A', 'Unit', 0, 1, 1, 0.965, 0.7),
  
  // SHUNT TRIP (Under Isolator) - Opta 0.965
  createItem('507', 'ELECTRICAL INSTALLATION EQUIPMENT', 'ISOLATOR', 'SHUNT TRIP VOLTAGE RELEASE MX 208-277V 60HZ 220-240V 50/60HZ', 'Unit', 0, 1, 1, 0.965, 0.7),
  createItem('508', 'ELECTRICAL INSTALLATION EQUIPMENT', 'ISOLATOR', 'TRIP UNIT ACCESSORY SDE ADAPTOR FOR NSX100-250 (X 10PCS)', 'Unit', 0, 1, 1, 0.965, 0.7),

  // INDOOR ENCLOSURE BOX - Opta 1.000 usually, but one is 0.965 (Surface Type)
  createItem('510', 'ELECTRICAL INSTALLATION EQUIPMENT', 'INDOOR ENCLOSURE BOX', 'WEATHERPROOF ENCLOSURE BOX W/TP COVER 155MM X 115MM X 110M', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('511', 'ELECTRICAL INSTALLATION EQUIPMENT', 'INDOOR ENCLOSURE BOX', 'WEATHERPROOF ENCLOSURE BOX W/TP COVER 215MM X 150MM X 110MM', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('512', 'ELECTRICAL INSTALLATION EQUIPMENT', 'INDOOR ENCLOSURE BOX', 'WEATHERPROOF ENCLOSURE BOX 250MM X200MM X 110MM', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('513', 'ELECTRICAL INSTALLATION EQUIPMENT', 'INDOOR ENCLOSURE BOX', 'WEATHERPROOF ENCLOSURE BOX 215MM X 215MM X 110MM', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('514', 'ELECTRICAL INSTALLATION EQUIPMENT', 'INDOOR ENCLOSURE BOX', 'WEATHERPROOF ENCLOSURE BOX 250MM X 200MM X 160MM', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('515', 'ELECTRICAL INSTALLATION EQUIPMENT', 'INDOOR ENCLOSURE BOX', 'MCB BOX 10 WAYS 222 X 146 X 98MM (SMOKE)', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('516', 'ELECTRICAL INSTALLATION EQUIPMENT', 'INDOOR ENCLOSURE BOX', 'MCB BOX 12 WAYS 256 X 176 X 98MM (TRANSPARENT)', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('517', 'ELECTRICAL INSTALLATION EQUIPMENT', 'INDOOR ENCLOSURE BOX', 'MCB BOX 16 WAYS 327 X 176 X 98MM (TRANSPARENT)', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('518', 'ELECTRICAL INSTALLATION EQUIPMENT', 'INDOOR ENCLOSURE BOX', 'PVC MCB BOX FOR SURFACE TYPE 9WAY', 'Unit', 0, 1, 1, 0.965, 0.7),

  // OUTDOOR ENCLOSURE BOX - Opta 1.000
  createItem('520', 'ELECTRICAL INSTALLATION EQUIPMENT', 'OUTDOOR ENCLOSURE BOX', 'DISTRIBUTION BOARD 2 ROW 24 WAYS', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('521', 'ELECTRICAL INSTALLATION EQUIPMENT', 'OUTDOOR ENCLOSURE BOX', 'DISTRIBUTION BOARD 3 ROW 46 WAYS', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('522', 'ELECTRICAL INSTALLATION EQUIPMENT', 'OUTDOOR ENCLOSURE BOX', 'METAL BOX 400MM X 400MM X 200MM', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('523', 'ELECTRICAL INSTALLATION EQUIPMENT', 'OUTDOOR ENCLOSURE BOX', 'METAL BOX 600MM X 400MM X 200MM', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('524', 'ELECTRICAL INSTALLATION EQUIPMENT', 'OUTDOOR ENCLOSURE BOX', 'METAL BOX 700MM X 500MM X 250MM', 'Unit', 0, 1, 1, 1.000, 0.7),

  // --- EV DISTRIBUTION BOARD ---
  // EVDB ADD ON & ACCESSORIES - Opta mixed
  createItem('601', 'EV DISTRIBUTION BOARD', 'EVDB ADD ON & ACCESSORIES', 'SMART POWER SENSOR SINGLE PHASE 2 WIRES', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('602', 'EV DISTRIBUTION BOARD', 'EVDB ADD ON & ACCESSORIES', 'PQM-1000S POWER QUALITY NETWORK ANALYZER', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('603', 'EV DISTRIBUTION BOARD', 'EVDB ADD ON & ACCESSORIES', 'INNER DOOR', 'Unit', 0, 1, 1, 0.965, 0.7),
  createItem('604', 'EV DISTRIBUTION BOARD', 'EVDB ADD ON & ACCESSORIES', 'POLY DOOR', 'Unit', 0, 1, 1, 0.965, 0.7),
  createItem('605', 'EV DISTRIBUTION BOARD', 'EVDB ADD ON & ACCESSORIES', 'CANOPY', 'Unit', 0, 1, 1, 0.965, 0.7),

  // MCCB - Opta 1.000
  createItem('610', 'EV DISTRIBUTION BOARD', 'MCCB', 'EASYPACT EZC100F TMD MCCB 3P 20A 10KA MC', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('611', 'EV DISTRIBUTION BOARD', 'MCCB', 'EASYPACT EZC100F TMD MCCB 3P 3D 25A 10KA MC', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('612', 'EV DISTRIBUTION BOARD', 'MCCB', 'EASYPACT EZC100F TMD MCCB 3P 40A 10KA MC', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('613', 'EV DISTRIBUTION BOARD', 'MCCB', 'EASYPACT EZC100F TMD MCCB 3P 3D 50A 10KA MC', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('614', 'EV DISTRIBUTION BOARD', 'MCCB', 'EASYPACT EZC100F TMD MCCB 63A 3P', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('615', 'EV DISTRIBUTION BOARD', 'MCCB', 'EASYPACT EZC100F TMD MCCB 75A 3P', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('616', 'EV DISTRIBUTION BOARD', 'MCCB', 'EASYPACT EZC100F TMD MCCB 3P 80A 10KA MC', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('617', 'EV DISTRIBUTION BOARD', 'MCCB', 'EASYPACT EZC100F TMD MCCB 3P 100A 10KA MC', 'Unit', 0, 1, 1, 1.000, 0.7),

  // MCB - Opta 1.000
  createItem('620', 'EV DISTRIBUTION BOARD', 'MCB', 'HIMEL MCB 2P 40A 6KA 230V C CURVE', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('621', 'EV DISTRIBUTION BOARD', 'MCB', 'TEMLITE 40A 2P 6KA MCB', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('622', 'EV DISTRIBUTION BOARD', 'MCB', 'MCB 1P 6A 10KA C CURVE', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('623', 'EV DISTRIBUTION BOARD', 'MCB', 'EASY 9 MCB 2P 40A 6KA 230V C CURVE', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('624', 'EV DISTRIBUTION BOARD', 'MCB', 'MCB 4P 40A 6KA 230V C CURVE', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('625', 'EV DISTRIBUTION BOARD', 'MCB', '40A 4P 6KA MCB', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('626', 'EV DISTRIBUTION BOARD', 'MCB', '40A 3P 6KA MCB', 'Unit', 0, 1, 1, 1.000, 0.7),

  // RCCB - Opta 1.000, ELCB 0.965
  createItem('630', 'EV DISTRIBUTION BOARD', 'RCCB', 'RCCB 2P 40A 30MA TYPE A', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('631', 'EV DISTRIBUTION BOARD', 'RCCB', '40A 2P RCCB TYPE A', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('632', 'EV DISTRIBUTION BOARD', 'RCCB', 'RCCB 4P 40A 30MA TYPE A', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('633', 'EV DISTRIBUTION BOARD', 'RCCB', '40A 4P RCCB TYPE A', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('634', 'EV DISTRIBUTION BOARD', 'RCCB', 'EPR SERIES ELCB 100A 4P 100MA', 'Unit', 0, 1, 1, 0.965, 0.7),

  // SURGE PROTECTION DEVICE - Opta 1.000 and 0.965
  createItem('640', 'EV DISTRIBUTION BOARD', 'SURGE PROTECTION DEVICE', 'NSP SURGE DIVERTER 1PHASE IN 20KA IMAX 40KA 320V', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('641', 'EV DISTRIBUTION BOARD', 'SURGE PROTECTION DEVICE', 'NSP SURGE DIVERTER 3PHASE IN 20KA IMAX 40KA 320V', 'Unit', 0, 1, 1, 0.965, 0.7),

  // SHUNT TRIP - Opta 0.965 and 1.000
  createItem('650', 'EV DISTRIBUTION BOARD', 'SHUNT TRIP', 'HM1-100/ST SHUNT TRIP EPS (FOR MCCB UP TO 100A)', 'Unit', 0, 1, 1, 0.965, 0.7),
  createItem('651', 'EV DISTRIBUTION BOARD', 'SHUNT TRIP', 'SHUNT TRIP FOR S100SF S160SCF E160SF E250SF S250SF MCCB', 'Unit', 0, 1, 1, 0.965, 0.7),
  createItem('652', 'EV DISTRIBUTION BOARD', 'SHUNT TRIP', 'SHUNT TRIP VOLTAGE RELEASE MX 208-277V 60HZ 220-240V 50/60HZ', 'Unit', 0, 1, 1, 0.965, 0.7),
  createItem('653', 'EV DISTRIBUTION BOARD', 'SHUNT TRIP', 'TRIP UNIT ACCESSORY SDE ADAPTOR FOR NSX100-250 (X 10PCS)', 'Unit', 0, 1, 1, 0.965, 0.7),
  createItem('654', 'EV DISTRIBUTION BOARD', 'SHUNT TRIP', 'SHUNT TRIP RELEASE SHT 200-277VAC FOR EZC400', 'Unit', 0, 1, 1, 1.000, 0.7),

  // DPM - Opta 1.000
  createItem('660', 'EV DISTRIBUTION BOARD', 'DPM', 'DIGITAL POWER METER 70-300 VAC', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('661', 'EV DISTRIBUTION BOARD', 'DPM', 'PQM-1000S POWER QUALITY NETWORK ANALYZER', 'Unit', 0, 1, 1, 1.000, 0.7),
  
  // CT - Opta 0.965
  createItem('670', 'EV DISTRIBUTION BOARD', 'CT', 'CURRENT TRANSFORMER CLASS 3 5VA RATIO:40/5A', 'Unit', 0, 1, 1, 0.965, 0.7),

  // PILOT LIGHT - Opta 0.965 and 1.000
  createItem('680', 'EV DISTRIBUTION BOARD', 'PILOT LIGHT', 'LED PILOT LIGHT 22MM 240V RED', 'Unit', 0, 1, 1, 0.965, 0.7),
  createItem('681', 'EV DISTRIBUTION BOARD', 'PILOT LIGHT', 'LED PILOT LIGHT 22MM 240V BLUE', 'Unit', 0, 1, 1, 1.000, 0.7),
  createItem('682', 'EV DISTRIBUTION BOARD', 'PILOT LIGHT', 'LED PILOT LIGHT 22MM 240V YELLOW', 'Unit', 0, 1, 1, 1.000, 0.7),

  // EFOC - Opta 0.965
  createItem('690', 'EV DISTRIBUTION BOARD', 'EFOC', 'EARTH FAULT & OVERCURRENT RELAY IDMT (DP-34-024D), DC18-72V', 'Unit', 0, 1, 1, 0.965, 0.7),
  createItem('691', 'EV DISTRIBUTION BOARD', 'EFOC', 'EARTH FAULT RELAY IDMT DP-31', 'Unit', 0, 1, 1, 0.965, 0.7),
];

const INITIAL_SETTINGS: AppSettings = {
  companyName: 'Recharge Xolutions Sdn Bhd (0295251X)',
  companyAddress: 'L3-023, Level 3, MyTOWN Shopping Centre, \n6,Jalan Cochrane, Seksyen 90,\n55100 Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur',
  logoUrl: 'https://cdn-icons-png.flaticon.com/512/25/25694.png',
  currencySymbol: 'RM',
  taxRate: 6,
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [masterData, setMasterData] = useState<MasterItem[]>(INITIAL_MASTER_DATA);
  const [bqItems, setBqItems] = useState<BQItem[]>([]);
  const [projectDetails, setProjectDetails] = useState<ProjectDetails>({
    clientName: 'John Doe',
    date: new Date().toISOString().split('T')[0],
    quoteId: 'Q-2024-001',
  });
  const [appSettings, setAppSettings] = useState<AppSettings>(INITIAL_SETTINGS);

  const addMasterItem = (item: MasterItem) => {
    setMasterData([...masterData, item]);
  };

  const updateMasterItem = (id: string, updates: Partial<MasterItem>) => {
    setMasterData((prev) => 
        prev.map((item) => {
            if (item.id === id) {
                // If inputs affecting calculations change, recalculate
                const isCalculationNeeded = 
                    'rexScFob' in updates || 
                    'forex' in updates || 
                    'sst' in updates || 
                    'opta' in updates || 
                    'spMargin' in updates;

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
    setMasterData(masterData.filter((item) => item.id !== id));
  };

  const addBQItem = () => {
    const newItem: BQItem = {
      id: Date.now().toString(),
      category: '',
      itemName: '',
      description: '',
      price: 0,
      qty: 1,
      uom: '',
      total: 0,
    };
    setBqItems([...bqItems, newItem]);
  };

  const removeBQItem = (id: string) => {
    setBqItems(bqItems.filter((item) => item.id !== id));
  };

  const updateBQItem = (id: string, field: keyof BQItem, value: any) => {
    setBqItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          // Recalculate total if price or qty changes
          if (field === 'price' || field === 'qty') {
            updated.total = (field === 'price' ? Number(value) : item.price) * (field === 'qty' ? Number(value) : item.qty);
          }
          return updated;
        }
        return item;
      })
    );
  };

  const calculateTotal = () => {
    const subtotal = bqItems.reduce((acc, item) => acc + item.total, 0);
    const tax = subtotal * (appSettings.taxRate / 100);
    const grandTotal = subtotal + tax;
    return { subtotal, tax, grandTotal };
  };

  return (
    <AppContext.Provider
      value={{
        masterData,
        setMasterData,
        bqItems,
        setBqItems,
        projectDetails,
        setProjectDetails,
        appSettings,
        setAppSettings,
        addMasterItem,
        updateMasterItem,
        deleteMasterItem,
        addBQItem,
        removeBQItem,
        updateBQItem,
        calculateTotal,
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
