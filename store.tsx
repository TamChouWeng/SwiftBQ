
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
];

const INITIAL_SETTINGS: AppSettings = {
  companyName: 'Company XXX',
  companyAddress: 'JALAN SATU DUA TIGA\n55100 Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur',
  currencySymbol: 'RM',
  companyLogo: '',
  bankName: 'OCBC Bank',
  bankAccount: 'xxxxx',
  profileName: 'Adrian',
  profileContact: '+60123456789',
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
  useEffect(() => { localStorage.setItem('swiftbq_masterData', JSON.stringify(masterData)); }, [masterData]);
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
