/// <reference types="vite/client" />

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { MasterItem, BQItem, Project, AppSettings, BQViewMode, PriceField, ProjectVersion } from './types';
import { DDP_STRATEGIES, SP_STRATEGIES, RSP_STRATEGIES } from './pricingStrategies';

import { createClient } from '@supabase/supabase-js';

// --- Supabase Client ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Please check your .env.local file.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');


// --- Mappers ---
/* Copy of Mappers from mappers.ts */

// --- Master Item Mappers ---
export const mapMasterItemFromDB = (dbItem: any): MasterItem => ({
  id: dbItem.id,
  brand: dbItem.brand,
  axsku: dbItem.axsku,
  mpn: dbItem.mpn,
  group: dbItem.group,
  category: dbItem.category,
  itemName: dbItem.item_name,
  description: dbItem.description,
  uom: dbItem.uom,
  price: Number(dbItem.price) || 0,
  rexScFob: Number(dbItem.rex_sc_fob) || 0,
  forex: Number(dbItem.forex) || 1,
  sst: Number(dbItem.sst) || 1,
  opta: Number(dbItem.opta) || 0.97,
  rexScDdp: dbItem.rex_sc_ddp || { value: 0, strategy: 'MANUAL', manualOverride: 0 },
  rexSp: dbItem.rex_sp || { value: 0, strategy: 'MANUAL', manualOverride: 0 },
  rexRsp: dbItem.rex_rsp || { value: 0, strategy: 'MANUAL', manualOverride: 0 },
});

export const mapMasterItemToDB = (item: Partial<MasterItem>) => {
  const dbItem: any = {};
  if (item.id) dbItem.id = item.id;
  if (item.brand !== undefined) dbItem.brand = item.brand;
  if (item.axsku !== undefined) dbItem.axsku = item.axsku;
  if (item.mpn !== undefined) dbItem.mpn = item.mpn;
  if (item.group !== undefined) dbItem.group = item.group;
  if (item.category !== undefined) dbItem.category = item.category;
  if (item.itemName !== undefined) dbItem.item_name = item.itemName;
  if (item.description !== undefined) dbItem.description = item.description;
  if (item.uom !== undefined) dbItem.uom = item.uom;
  if (item.price !== undefined) dbItem.price = item.price;
  if (item.rexScFob !== undefined) dbItem.rex_sc_fob = item.rexScFob;
  if (item.forex !== undefined) dbItem.forex = item.forex;
  if (item.sst !== undefined) dbItem.sst = item.sst;
  if (item.opta !== undefined) dbItem.opta = item.opta;
  if (item.rexScDdp !== undefined) dbItem.rex_sc_ddp = item.rexScDdp;
  if (item.rexSp !== undefined) dbItem.rex_sp = item.rexSp;
  if (item.rexRsp !== undefined) dbItem.rex_rsp = item.rexRsp;
  return dbItem;
};

// --- Project Mappers ---
export const mapProjectFromDB = (dbProject: any, versions: ProjectVersion[] = []): Project => ({
  id: dbProject.id,
  userId: dbProject.user_id,
  projectName: dbProject.project_name,
  clientName: dbProject.client_name,
  clientContact: dbProject.client_contact || '',
  clientAddress: dbProject.client_address || '',
  date: dbProject.date,
  validityPeriod: dbProject.validity_period,
  quoteId: dbProject.quote_id,
  discount: Number(dbProject.discount) || 0,
  versions: versions,
});

export const mapProjectToDB = (project: Partial<Project>) => {
  const dbProject: any = {};
  if (project.id) dbProject.id = project.id;
  if (project.userId) dbProject.user_id = project.userId;
  if (project.projectName !== undefined) dbProject.project_name = project.projectName;
  if (project.clientName !== undefined) dbProject.client_name = project.clientName;
  if (project.clientContact !== undefined) dbProject.client_contact = project.clientContact;
  if (project.clientAddress !== undefined) dbProject.client_address = project.clientAddress;
  if (project.date !== undefined) dbProject.date = project.date;
  if (project.validityPeriod !== undefined) dbProject.validity_period = project.validityPeriod;
  if (project.quoteId !== undefined) dbProject.quote_id = project.quoteId;
  if (project.discount !== undefined) dbProject.discount = project.discount;
  return dbProject;
};

// --- Version Mappers ---
export const mapVersionFromDB = (dbVersion: any): ProjectVersion => ({
  id: dbVersion.id,
  name: dbVersion.version_name,
  createdAt: dbVersion.created_at,
  masterSnapshot: dbVersion.master_list_snapshot || [],
});

export const mapVersionToDB = (version: Partial<ProjectVersion>, projectId: string) => {
  const dbVersion: any = {
    project_id: projectId
  };
  if (version.id) dbVersion.id = version.id;
  if (version.name) dbVersion.version_name = version.name;
  if (version.masterSnapshot) dbVersion.master_list_snapshot = version.masterSnapshot;
  return dbVersion;
};

// --- BQ Item Mappers ---
export const mapBQItemFromDB = (dbItem: any): BQItem => ({
  id: dbItem.id,
  userId: dbItem.user_id,
  projectId: dbItem.project_id,
  versionId: dbItem.version_id,
  masterId: dbItem.master_id,

  category: dbItem.category,
  itemName: dbItem.item_name,
  description: dbItem.description,
  quotationDescription: dbItem.quotation_description,
  uom: dbItem.uom,
  qty: Number(dbItem.qty) || 0,
  price: Number(dbItem.price) || 0,
  total: Number(dbItem.total) || 0,

  brand: dbItem.brand,
  axsku: dbItem.axsku,
  mpn: dbItem.mpn,
  group: dbItem.group,

  rexScFob: Number(dbItem.rex_sc_fob) || 0,
  forex: Number(dbItem.forex) || 1,
  sst: Number(dbItem.sst) || 1,
  opta: Number(dbItem.opta) || 0.97,

  rexScDdp: dbItem.rex_sc_ddp || { value: 0, strategy: 'MANUAL', manualOverride: 0 },
  rexSp: dbItem.rex_sp || { value: 0, strategy: 'MANUAL', manualOverride: 0 },
  rexRsp: dbItem.rex_rsp || { value: 0, strategy: 'MANUAL', manualOverride: 0 },

  isOptional: dbItem.is_optional,
});

export const mapBQItemToDB = (item: Partial<BQItem>) => {
  const dbItem: any = {};
  if (item.id) dbItem.id = item.id;
  if (item.userId) dbItem.user_id = item.userId;
  if (item.projectId) dbItem.project_id = item.projectId;
  if (item.versionId) dbItem.version_id = item.versionId;
  if (item.masterId) dbItem.master_id = item.masterId;

  if (item.category !== undefined) dbItem.category = item.category;
  if (item.itemName !== undefined) dbItem.item_name = item.itemName;
  if (item.description !== undefined) dbItem.description = item.description;
  if (item.quotationDescription !== undefined) dbItem.quotation_description = item.quotationDescription;
  if (item.uom !== undefined) dbItem.uom = item.uom;
  if (item.qty !== undefined) dbItem.qty = item.qty;
  if (item.price !== undefined) dbItem.price = item.price;
  if (item.total !== undefined) dbItem.total = item.total;

  if (item.brand !== undefined) dbItem.brand = item.brand;
  if (item.axsku !== undefined) dbItem.axsku = item.axsku;
  if (item.mpn !== undefined) dbItem.mpn = item.mpn;
  if (item.group !== undefined) dbItem.group = item.group;

  if (item.rexScFob !== undefined) dbItem.rex_sc_fob = item.rexScFob;
  if (item.forex !== undefined) dbItem.forex = item.forex;
  if (item.sst !== undefined) dbItem.sst = item.sst;
  if (item.opta !== undefined) dbItem.opta = item.opta;

  if (item.rexScDdp !== undefined) dbItem.rex_sc_ddp = item.rexScDdp;
  if (item.rexSp !== undefined) dbItem.rex_sp = item.rexSp;
  if (item.rexRsp !== undefined) dbItem.rex_rsp = item.rexRsp;

  if (item.isOptional !== undefined) dbItem.is_optional = item.isOptional;
  return dbItem;
};

// --- Profile / Settings Mapper ---
export const mapProfileToSettings = (profile: any): Partial<AppSettings> => {
  if (!profile) return {};
  const settings: Partial<AppSettings> = {};

  // Strict fallback to "" to ensure UI shows empty instead of initial defaults
  settings.companyName = profile.company_name || "";
  settings.companyAddress = profile.company_address || "";
  settings.currencySymbol = profile.currency_symbol || "";
  settings.companyLogo = profile.company_logo || "";
  settings.bankName = profile.bank_name || "";
  settings.bankAccount = profile.bank_account || "";
  settings.profileName = profile.profile_name || "";
  settings.profileContact = profile.phone || "";
  settings.profileRole = profile.role || "user";

  return settings;
};


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

  hasUnsavedChanges: boolean;
  saveAllChanges: () => void;
  discardAllChanges: () => void;

  /* Authentication */
  user: any | null; // Profile object
  login: (username: string, pwd: string) => Promise<boolean>;
  logout: () => void;
  updateUserProfile: (updates: Partial<AppSettings>) => Promise<void>;
  updateCompanyProfile: (updates: Partial<AppSettings>) => Promise<void>;
  uploadCompanyLogo: (file: File) => Promise<string | null>;
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
// Calculate derived fields with strategy support
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

  // --- DDP Calculation ---
  // Default to Manual if undefined, or preserve existing.
  // We handle migration from plain numbers here by checking type
  let ddpField: PriceField = { value: 0, strategy: 'MANUAL', manualOverride: 0 };

  if (item.rexScDdp) {
    if (typeof item.rexScDdp === 'number') {
      ddpField = { value: item.rexScDdp, strategy: 'MANUAL', manualOverride: item.rexScDdp };
    } else {
      ddpField = item.rexScDdp;
    }
  }


  // Create context for DDP strategy
  const ddpContext = { fob, forex, sst, opta };

  // Find strategy
  const ddpStrategy = DDP_STRATEGIES.find(s => s.id === ddpField.strategy);
  let ddpValue = 0;

  if (ddpField.strategy === 'MANUAL') {
    ddpValue = ddpField.manualOverride ?? 0;
  } else if (ddpStrategy) {
    ddpValue = ddpStrategy.calculate(ddpContext);
  }

  const newDdpField: PriceField = { ...ddpField, value: ddpValue };


  // --- SP Calculation ---
  let spField: PriceField = { value: 0, strategy: 'MANUAL', manualOverride: 0 };

  if (item.rexSp) {
    if (typeof item.rexSp === 'number') {
      spField = { value: item.rexSp, strategy: 'MANUAL', manualOverride: item.rexSp };
    } else {
      spField = item.rexSp;
    }
  }

  const spContext = { ddp: ddpValue };

  const spStrategy = SP_STRATEGIES.find(s => s.id === spField.strategy);
  let spValue = 0;

  if (spField.strategy === 'MANUAL') {
    spValue = spField.manualOverride ?? 0;
  } else if (spStrategy) {
    spValue = spStrategy.calculate(spContext);
  }

  const newSpField: PriceField = { ...spField, value: spValue };


  // --- RSP Calculation ---
  let rspField: PriceField = { value: 0, strategy: 'MANUAL', manualOverride: 0 };

  if (item.rexRsp) {
    if (typeof item.rexRsp === 'number') {
      rspField = { value: item.rexRsp, strategy: 'MANUAL', manualOverride: item.rexRsp };
    } else {
      rspField = item.rexRsp;
    }
  }

  const rspContext = { sp: spValue };

  const rspStrategy = RSP_STRATEGIES.find(s => s.id === rspField.strategy);
  let rspValue = 0;

  if (rspField.strategy === 'MANUAL') {
    rspValue = rspField.manualOverride ?? 0;
  } else if (rspStrategy) {
    rspValue = rspStrategy.calculate(rspContext);
  }

  const newRspField: PriceField = { ...rspField, value: rspValue };

  return {
    rexScDdp: newDdpField,
    rexSp: newSpField,
    rexRsp: newRspField,
    price: rspValue // Update main price to match RSP
  };
};

const INITIAL_SETTINGS: AppSettings = {
  companyName: 'Recharge Xolutions Sdn Bhd (0295251X)',
  companyAddress: 'L3-023, Level 3, MyTOWN Shopping Centre, \n6,Jalan Cochrane, Seksyen 90,\n55100 Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur',
  currencySymbol: 'RM',
  companyLogo: '',
  bankName: 'OCBC Bank',
  bankAccount: 'xxxxx',
  profileName: 'Teoh Chi Yang',
  profileContact: '+6012 528 0665',
  profileRole: 'admin',
};

// Migration helpers
const migrateMasterData = (data: any[]): MasterItem[] => {
  return data.map(item => {
    // Check if valid already (simplified check)
    if (item.rexScDdp && typeof item.rexScDdp === 'object' && 'strategy' in item.rexScDdp) {
      return item as MasterItem;
    }

    // Migration logic: values to manual
    return {
      ...item,
      rexScDdp: { value: item.rexScDdp || 0, strategy: 'MANUAL', manualOverride: item.rexScDdp || 0 },
      rexSp: { value: item.rexSp || 0, strategy: 'MANUAL', manualOverride: item.rexSp || 0 },
      rexRsp: { value: item.rexRsp || 0, strategy: 'MANUAL', manualOverride: item.rexRsp || 0 },
      price: item.price || item.rexRsp || 0
    };
  });
};

const migrateProjects = (projects: any[]): Project[] => {
  return projects.map(p => ({
    ...p,
    versions: (p.versions || [{ id: 'v1', name: 'version-1', createdAt: new Date().toISOString() }]).map((v: any) => ({
      ...v,
      masterSnapshot: migrateMasterData(v.masterSnapshot || p.masterSnapshot || [])
    })),
    discount: p.discount || 0
  }));
};

const migrateItems = (items: any[]): BQItem[] => {
  return items.map(i => {
    // Migrate BQ Item snapshots
    const ddp = typeof i.rexScDdp === 'number' ? { value: i.rexScDdp, strategy: 'MANUAL', manualOverride: i.rexScDdp } : i.rexScDdp;
    const sp = typeof i.rexSp === 'number' ? { value: i.rexSp, strategy: 'MANUAL', manualOverride: i.rexSp } : i.rexSp;
    const rsp = typeof i.rexRsp === 'number' ? { value: i.rexRsp, strategy: 'MANUAL', manualOverride: i.rexRsp } : i.rexRsp;

    return {
      ...i,
      versionId: i.versionId || 'v1',
      quotationDescription: i.quotationDescription,
      rexScDdp: ddp,
      rexSp: sp,
      rexRsp: rsp
    };
  });
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // --- Initialize State ---

  // Auth State
  const [user, setUser] = useState<any | null>(() => {
    const saved = localStorage.getItem('swiftbq_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = async (username: string, pwd: string) => {
    // Simple query
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .eq('password', pwd) // Plain text for POC
      .maybeSingle();

    if (data) {
      setUser(data);
      localStorage.setItem('swiftbq_user', JSON.stringify(data));

      // Sync App Settings from DB Profile
      const dbSettings = mapProfileToSettings(data);
      setAppSettings(prev => ({ ...prev, ...dbSettings }));

      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('swiftbq_user');
  };

  const updateUserProfile = async (updates: Partial<AppSettings>) => {
    // 1. Update Local App Settings
    setAppSettings(prev => ({ ...prev, ...updates }));

    // 2. Sync to DB if logged in
    if (user && user.id) {
      const dbUpdates: any = {};
      if (updates.profileName !== undefined) dbUpdates.profile_name = updates.profileName;
      if (updates.profileContact !== undefined) dbUpdates.phone = updates.profileContact;
      // Note: 'role' might be protected or not exist in some schemas, but assuming it exists based on previous code.
      // Force lowercase to satisfy check constraint (profiles_role_check)
      if (updates.profileRole !== undefined) dbUpdates.role = updates.profileRole.toLowerCase();

      if (Object.keys(dbUpdates).length > 0) {
        const { error } = await supabase
          .from('profiles')
          .update(dbUpdates)
          .eq('id', user.id);

        if (error) {
          console.error("Failed to sync profile to DB:", error);
        } else {
          // Update user state too to reflect changes
          setUser((prev: any) => ({ ...prev, ...dbUpdates }));
          // Update local storage for user
          const updatedUser = { ...user, ...dbUpdates };
          localStorage.setItem('swiftbq_user', JSON.stringify(updatedUser));
        }
      }
    }
  };

  const updateCompanyProfile = async (updates: Partial<AppSettings>) => {
    // 1. Update Local App Settings
    setAppSettings(prev => ({ ...prev, ...updates }));

    // 2. Sync to DB if logged in
    if (user && user.id) {
      const dbUpdates: any = {};
      if (updates.companyName !== undefined) dbUpdates.company_name = updates.companyName;
      if (updates.companyAddress !== undefined) dbUpdates.company_address = updates.companyAddress;
      if (updates.currencySymbol !== undefined) dbUpdates.currency_symbol = updates.currencySymbol;
      if (updates.bankName !== undefined) dbUpdates.bank_name = updates.bankName;
      if (updates.bankAccount !== undefined) dbUpdates.bank_account = updates.bankAccount;
      if (updates.companyLogo !== undefined) dbUpdates.company_logo = updates.companyLogo;

      if (Object.keys(dbUpdates).length > 0) {
        const { error } = await supabase
          .from('profiles')
          .update(dbUpdates)
          .eq('id', user.id);

        if (error) {
          console.error("Failed to sync company info to DB:", error);
        } else {
          // Update user state too
          setUser((prev: any) => ({ ...prev, ...dbUpdates }));
          // Update local storage for user
          const updatedUser = { ...user, ...dbUpdates };
          localStorage.setItem('swiftbq_user', JSON.stringify(updatedUser));
        }
      }
    }
  };

  // --- Sync Profile on Load/Changes ---
  useEffect(() => {
    const syncProfile = async () => {
      if (user && user.id) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) {
          const dbSettings = mapProfileToSettings(data);
          setAppSettings(prev => ({ ...prev, ...dbSettings }));

          // Update user object if DB has changed (e.g. role updated elsewhere)
          // We use a simple check to avoid infinite loops if objects are identical
          if (user.company_logo !== data.company_logo || user.company_name !== data.company_name) {
            setUser(data);
            localStorage.setItem('swiftbq_user', JSON.stringify(data));
          }
        }
      }
    };
    syncProfile();
  }, [user?.id]); // Run when user ID changes (login or load)

  const uploadCompanyLogo = async (file: File): Promise<string | null> => {
    if (!user || !user.id) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error uploading logo:', uploadError);
        return null;
      }

      const { data } = supabase.storage.from('logos').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Unexpected error uploading logo:', error);
      return null;
    }
  };




  const [isLoading, setIsLoading] = useState(true);

  const [masterData, setMasterData] = useState<MasterItem[]>([]);

  // --- Initial Data Fetch ---
  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('master_list_items')
        .select('*')
        .eq('is_deleted', false); // Only fetch non-deleted

      if (error) {
        console.error('Error fetching master data:', error);
        return;
      }

      if (data) {
        const mapped = data.map(mapMasterItemFromDB);
        setMasterData(mapped);
      }
    } catch (err) {
      console.error('Unexpected error fetching master data:', err);
    } finally {
      setIsLoading(false);
    }
  };


  /* Projects State - Supabase */
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (user && user.id) {
      fetchProjects();
    } else {
      setProjects([]); // Clear projects if logged out
    }
  }, [user?.id]); // Refetch when user changes

  const fetchProjects = async () => {
    if (!user || !user.id) return;

    const { data: projectsData, error } = await supabase
      .from('projects')
      .select(`
        *,
        project_versions (
          *
        )
      `)
      .eq('user_id', user.id) // Filter by User
      .neq('status', 'deleted')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      return;
    }

    if (projectsData) {
      const mappedProjects = projectsData.map(p => {
        // Map versions
        const mappedVersions = (p.project_versions || [])
          .filter((v: any) => !v.is_deleted) // Assuming logical delete or just filter
          .map(mapVersionFromDB);
        return mapProjectFromDB(p, mappedVersions);
      });
      setProjects(mappedProjects);
    }
  };

  /* BQ Items State - Supabase */
  // Fetching ALL for POC simplicity, but ideally should be per project
  const [bqItems, setBqItems] = useState<BQItem[]>([]);

  useEffect(() => {
    if (user && user.id) {
      fetchBQItems();
    } else {
      setBqItems([]);
    }
  }, [user?.id]);

  const fetchBQItems = async () => {
    if (!user || !user.id) return;

    const { data, error } = await supabase
      .from('bq_items')
      .select('*')
      .eq('user_id', user.id); // Filter by User

    if (error) console.error('Error fetching BQ items:', error);
    if (data) {
      setBqItems(data.map(mapBQItemFromDB));
    }
  };



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
  // --- Persistence Effects (LocalStorage Removed for Master Data) ---
  // useEffect(() => { localStorage.setItem('swiftbq_masterData_v1', JSON.stringify(masterData)); }, [masterData]);

  // --- Persistence Effects ---
  // Removed LocalStorage for MasterData, Projects, BQItems
  // useEffect(() => { localStorage.setItem('swiftbq_masterData_v1', JSON.stringify(masterData)); }, [masterData]);
  // useEffect(() => { localStorage.setItem('swiftbq_projects', JSON.stringify(projects)); }, [projects]);
  // useEffect(() => { localStorage.setItem('swiftbq_bqItems', JSON.stringify(bqItems)); }, [bqItems]);
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


  // --- Master Data Actions (DB Integrated) ---
  const addMasterItem = async (item: MasterItem) => {
    // Optimistic Update
    setMasterData(prev => [...prev, item]);

    // DB Insert
    try {
      const dbItem = mapMasterItemToDB(item);
      // Remove ID to let DB generate it? Or use client-generated ID?
      // Schema says default uuid_generate_v4().
      // Frontend generates ID. Let's use frontend ID for consistency or let DB handle it.
      // Ideally, let DB handle, but for optimistic UI, we need an ID.
      // Strategy: Use the ID generated by `Date.now()` (as per current code) for now, 
      // but strictly UUID is better. 
      // Current ID is string "Date.now()". Pass it as ID? 
      // Supabase ID is UUID. "Date.now()" will FAIL UUID validation.
      // FIX: We need robust UUID generation on frontend or let DB return it.
      // For now, let's omit ID and let DB Generate, then update state with real ID?
      // Or easier: fetch list again?

      const { id, ...itemWithoutId } = dbItem; // Let DB gen ID
      const { data, error } = await supabase
        .from('master_list_items')
        .insert(itemWithoutId)
        .select()
        .single();

      if (error) {
        console.error('Error adding item:', error);
        // Rollback?
      } else if (data) {
        const newItem = mapMasterItemFromDB(data);
        // Replace the optimistic item (which had temp ID) with real item
        setMasterData(prev => prev.map(i => i.id === item.id ? newItem : i));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateMasterItem = async (id: string, updates: Partial<MasterItem>) => {
    setMasterData((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const calcTriggers: (keyof MasterItem)[] = ['rexScFob', 'forex', 'sst', 'opta', 'rexScDdp', 'rexSp', 'rexRsp'];
          const isCalculationNeeded = calcTriggers.some(key => key in updates);

          let finalItem = { ...item, ...updates };
          if (isCalculationNeeded) {
            const derived = calculateDerivedFields(finalItem);
            finalItem = { ...finalItem, ...derived };
          }

          // DB Update Trigger
          // Fire and forget (or handle error)
          const dbUpdates = mapMasterItemToDB(finalItem);
          delete dbUpdates.id; // Don't update ID

          supabase.from('master_list_items').update(dbUpdates).eq('id', id).then(({ error }) => {
            if (error) console.error('Error updating item:', error);
          });

          return finalItem;
        }
        return item;
      })
    );
  };

  const deleteMasterItem = async (id: string) => {
    // Optimistic
    setMasterData(prev => prev.filter((item) => item.id !== id));
    if (masterListEdits[id]) {
      const newEdits = { ...masterListEdits };
      delete newEdits[id];
      setMasterListEdits(newEdits);
    }

    // DB Soft Delete
    const { error } = await supabase
      .from('master_list_items')
      .update({ is_deleted: true })
      .eq('id', id);

    if (error) console.error('Error deleting item (soft):', error);
  };


  // --- Master List Transactional Logic ---
  const setMasterListEdit = (id: string, field: keyof MasterItem, value: any) => {
    setMasterListEdits(prev => {
      const currentItem = masterData.find(i => i.id === id);
      if (!currentItem) return prev;

      const existingEdits = prev[id] || {};
      const mergedForCalc = { ...currentItem, ...existingEdits, [field]: value };

      let derivedUpdates = {};
      if (['rexScFob', 'forex', 'sst', 'opta', 'rexScDdp', 'rexSp', 'rexRsp'].includes(field as string)) {
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
        // masterListEdits contains proper PriceField objects now thanks to calculateDerivedFields
        return { ...item, ...masterListEdits[item.id] };
      }
      return item;
    }));
    setMasterListEdits({});
  };

  const discardMasterListEdits = () => {
    setMasterListEdits({});
  };


  // --- Project Actions ---
  const addProject = async (project: Project) => {
    // Inject User ID
    if (!user || !user.id) {
      console.error("Cannot add project: No user logged in");
      return;
    }
    const projectWithUser = { ...project, userId: user.id };

    // Initial Version
    const initialVersion: ProjectVersion = {
      id: self.crypto.randomUUID(),
      name: 'Version 1',
      createdAt: new Date().toISOString(),
      masterSnapshot: masterData // Snapshot current master list
    };

    // Attach version to project for optimistic UI
    const projectWithVersion = { ...projectWithUser, versions: [initialVersion] };

    // Optimistic Update
    setProjects(prev => [projectWithVersion, ...prev]);
    setCurrentProjectId(project.id);
    setCurrentVersionId(initialVersion.id); // Set active version immediately

    // DB Insert
    try {
      const dbProject = mapProjectToDB(projectWithUser);
      // ... db call ...
      const { data, error } = await supabase
        .from('projects')
        .insert(dbProject)
        .select()
        .single();

      if (error) console.error('Error adding project:', error);

      // Create initial version in DB too
      const dbVersion = mapVersionToDB(initialVersion, project.id);
      await supabase.from('project_versions').insert(dbVersion);

    } catch (err) {
      console.error(err);
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    // Optimistic
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));

    // DB
    const dbUpdates = mapProjectToDB(updates);
    delete dbUpdates.id; // ensure ID not changed
    if (Object.keys(dbUpdates).length > 0) {
      await supabase.from('projects').update(dbUpdates).eq('id', id);
    }
  };

  const deleteProject = async (id: string) => {
    // Optimistic
    setProjects(prev => prev.filter(p => p.id !== id));
    setBqItems(prev => prev.filter(item => item.projectId !== id));
    if (currentProjectId === id) {
      setCurrentProjectId(null);
      setCurrentVersionId(null);
    }

    // DB Hard Delete with Cascade
    try {
      // 1. Delete BQ Items
      await supabase.from('bq_items').delete().eq('project_id', id);

      // 2. Delete Versions
      await supabase.from('project_versions').delete().eq('project_id', id);

      // 3. Delete Project
      await supabase.from('projects').delete().eq('id', id);
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  const duplicateProject = async (id: string) => {
    // Fetch full project data to duplicate? or use local state?
    const sourceProject = projects.find(p => p.id === id);
    if (!sourceProject) return;

    const newProjectName = `${sourceProject.projectName} (Copy)`;

    // 1. Create New Project
    const dbProject = mapProjectToDB({
      ...sourceProject,
      projectName: newProjectName,
      date: new Date().toISOString()
    });
    delete dbProject.id; // Let DB generate

    const { data: pData, error } = await supabase.from('projects').insert(dbProject).select().single();
    if (error || !pData) return;

    // 2. Duplicate Versions and BQ Items
    // This is complex. For now, duplication might just copy the LATEST version or ALL versions?
    // Let's implement copying ALL versions.

    const newVersions: ProjectVersion[] = [];

    for (const ver of sourceProject.versions) {
      // Create Version
      const dbVer = mapVersionToDB({
        ...ver,
        name: ver.name,
        masterSnapshot: ver.masterSnapshot // Copy snapshot
      }, pData.id);
      delete dbVer.id;

      const { data: vData } = await supabase.from('project_versions').insert(dbVer).select().single();
      if (vData) {
        const newVer = mapVersionFromDB(vData);
        newVersions.push(newVer);

        // Copy BQ Items for this version
        const sourceItems = bqItems.filter(i => i.projectId === id && i.versionId === ver.id);
        if (sourceItems.length > 0) {
          const dbItems = sourceItems.map(i => {
            const mapped = mapBQItemToDB(i);
            mapped.project_id = pData.id;
            mapped.version_id = vData.id;
            delete mapped.id;
            return mapped;
          });
          // Bulk insert
          const { data: newBqItemsData } = await supabase.from('bq_items').insert(dbItems).select();

          if (newBqItemsData) {
            const mappedNewItems = newBqItemsData.map(mapBQItemFromDB);
            setBqItems(prev => [...prev, ...mappedNewItems]);
          }
        }
      }
    }

    const newProject = mapProjectFromDB(pData, newVersions);
    setProjects(prev => [newProject, ...prev]);
  };

  // --- Version Actions ---
  // --- Version Actions ---
  const createVersion = async (projectId: string, sourceVersionId: string, newVersionName: string, explicitNewVersionId?: string) => {
    // DB First to get ID? Or Optimistic?
    // Let's go with Optimistic rendering but wait for DB to confirm ID if possible?
    // Actually, for versions, ID consistency is important.
    // We'll optimistically use a temp ID, but fetch real one? No, too complex.
    // We will run DB first, then update state.

    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const sourceVersion = project.versions.find(v => v.id === sourceVersionId);
    if (!sourceVersion) return; // Should not happen

    const sourceSnapshot = sourceVersion.masterSnapshot || [];

    // 1. Create Version in DB
    const dbVer = mapVersionToDB({
      name: newVersionName,
      masterSnapshot: sourceSnapshot
    }, projectId);
    delete dbVer.id;

    const { data: vData, error: vError } = await supabase.from('project_versions').insert(dbVer).select().single();

    if (vError || !vData) {
      console.error('Error creating version:', vError);
      return;
    }

    const newVer = mapVersionFromDB(vData);

    // 2. Clone BQ Items
    const sourceItems = bqItems.filter(item => item.projectId === projectId && item.versionId === sourceVersionId);
    const newBqItems: BQItem[] = [];

    if (sourceItems.length > 0) {
      const dbItems = sourceItems.map(i => {
        const mapped = mapBQItemToDB(i);
        mapped.project_id = projectId;
        mapped.version_id = newVer.id;
        delete mapped.id;
        return mapped;
      });

      const { data: bqData, error: bqError } = await supabase.from('bq_items').insert(dbItems).select();
      if (bqData) {
        bqData.forEach(d => newBqItems.push(mapBQItemFromDB(d)));
      }
    }

    // 3. Update State
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return { ...p, versions: [...p.versions, newVer] };
      }
      return p;
    }));
    setBqItems(prev => [...prev, ...newBqItems]);
    setCurrentVersionId(newVer.id);
  };

  const updateProjectSnapshot = async (projectId: string, versionId: string, snapshotUpdates: Partial<MasterItem>[]) => {
    // 1. Update Version Snapshot State (Optimistic)
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
        // DB Update for snapshot
        // We need to construct the FULL snapshot to update.
        const targetVersion = newVersions.find(v => v.id === versionId);
        if (targetVersion && targetVersion.masterSnapshot) {
          supabase.from('project_versions')
            .update({ master_list_snapshot: targetVersion.masterSnapshot })
            .eq('id', versionId)
            .then(res => { if (res.error) console.error(res.error) });
        }

        return { ...p, versions: newVersions };
      }
      return p;
    }));

    // 2. Sync BQ Items (Review View) -> Only for this version!
    // We need to update items in DB too
    const updatesToProcess: BQItem[] = [];

    setBqItems(prev => prev.map(item => {
      if (item.projectId === projectId && item.versionId === versionId && item.masterId) {
        const update = snapshotUpdates.find(u => u.id === item.masterId);
        if (update) {
          const newItem = { ...item, ...update };
          if (update.price !== undefined || update.rexRsp !== undefined) {
            // ... logic from original ...
            let rRsp = undefined;
            if (update.rexRsp) {
              if (typeof update.rexRsp === 'object' && 'value' in update.rexRsp) rRsp = update.rexRsp.value;
              else if (typeof update.rexRsp === 'number') rRsp = update.rexRsp;
            }
            const newPrice = rRsp ?? update.price ?? item.price;
            const safePrice = isNaN(newPrice) ? 0 : newPrice;
            newItem.price = safePrice;
            if (update.rexRsp && typeof update.rexRsp === 'object') newItem.rexRsp = { ...item.rexRsp, ...update.rexRsp };
            else if (typeof update.rexRsp === 'number') newItem.rexRsp = { value: update.rexRsp, strategy: 'MANUAL', manualOverride: update.rexRsp };
            newItem.total = safePrice * item.qty;

            updatesToProcess.push(newItem);
          }
          return newItem as BQItem;
        }
      }
      return item;
    }));

    // DB Updates for BQ Items
    // Batch update? Supabase doesn't support bulk update easily unless upsert with PK.
    // We iterate.
    for (const item of updatesToProcess) {
      const dbItem = mapBQItemToDB(item);
      delete dbItem.id; // Usually we update by ID
      await supabase.from('bq_items').update(dbItem).eq('id', item.id);
    }
  };

  const updateVersionName = async (projectId: string, versionId: string, name: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          versions: p.versions.map(v => v.id === versionId ? { ...v, name } : v)
        };
      }
      return p;
    }));

    await supabase.from('project_versions').update({ version_name: name }).eq('id', versionId);
  };

  const deleteVersion = async (projectId: string, versionId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return { ...p, versions: p.versions.filter(v => v.id !== versionId) };
      }
      return p;
    }));

    setBqItems(prev => prev.filter(item => !(item.projectId === projectId && item.versionId === versionId)));

    await supabase.from('project_versions').update({ is_deleted: true }).eq('id', versionId); // Soft delete version

    if (currentProjectId === projectId && currentVersionId === versionId) {
      // Logic to switch version
      // We can just rely on state update for currentVersionId switch if we want
      // But original code has logic to switch to valid one.
      // Re-implement simplified:
      const project = projects.find(p => p.id === projectId); // This reads OLD state reference?
      // React state update is async.
      // Safe bet: set CurrentVersionId to null or first available?
      // Let's just set to null for now.
      setCurrentVersionId(null);
    }
  };


  // --- BQ Items Actions ---
  // --- BQ Items Actions ---
  const addBQItem = async (projectId: string, versionId: string) => {
    if (!user || !user.id) return;

    const newItem: BQItem = {
      id: self.crypto.randomUUID(),
      userId: user.id, // Ownership
      projectId,
      versionId,
      category: 'New Category',
      itemName: 'New Item',
      description: 'Description',
      uom: 'unit',
      qty: 1,
      price: 0,
      total: 0,

      // Defaults from master/empty
      brand: '', axsku: '', mpn: '', group: '',
      rexScFob: 0, forex: 1, sst: 1, opta: 0.97,
      rexScDdp: { value: 0, strategy: 'MANUAL', manualOverride: 0 },
      rexSp: { value: 0, strategy: 'MANUAL', manualOverride: 0 },
      rexRsp: { value: 0, strategy: 'MANUAL', manualOverride: 0 }
    };

    setBqItems(prev => [...prev, newItem]);

    // DB Insert
    const dbItem = mapBQItemToDB(newItem);
    await supabase.from('bq_items').insert(dbItem);
  };

  const syncMasterToBQ = async (projectId: string, versionId: string, masterItem: MasterItem, qty: number) => {
    // 1. Determine Action based on CURRENT state (bqItems)
    // Note: We rely on 'bqItems' from closure. In high-concurrency this might be slightly stale but acceptable for UI.
    const existingIndex = bqItems.findIndex(item => item.projectId === projectId && item.versionId === versionId && item.masterId === masterItem.id);
    const existingItem = existingIndex > -1 ? bqItems[existingIndex] : null;

    let action: 'insert' | 'update' | 'delete' | 'none' = 'none';

    if (qty <= 0) {
      if (existingItem) action = 'delete';
    } else {
      if (existingItem) action = 'update';
      else action = 'insert';
    }

    if (action === 'none') return;

    // 2. Perform Optimistic Update & Prepare DB Ops
    if (action === 'delete' && existingItem) {
      // Optimistic
      setBqItems(prev => prev.filter(i => i.id !== existingItem.id));
      // DB
      await supabase.from('bq_items').delete().eq('id', existingItem.id);

    } else if (action === 'update' && existingItem) {
      const safePrice = isNaN(existingItem.price) ? 0 : existingItem.price;
      const safeQty = isNaN(qty) ? 0 : qty;
      const updatedTotal = safePrice * safeQty;

      // Optimistic
      setBqItems(prev => prev.map(i => i.id === existingItem.id ? { ...i, qty: safeQty, total: updatedTotal } : i));

      // DB
      // Fetch fresh price to be safe? Or just update Qty?
      // User might have edited price manually. We should preserve that price (existingItem.price).
      // So we update Qty and Total.
      await supabase.from('bq_items').update({ qty: safeQty, total: updatedTotal }).eq('id', existingItem.id);

    } else if (action === 'insert') {
      const tempId = self.crypto.randomUUID();

      const newItem: BQItem = {
        id: tempId,
        userId: user?.id || 'unknown',
        projectId,
        versionId,
        masterId: masterItem.id,
        category: masterItem.category,
        itemName: masterItem.itemName,
        description: masterItem.description,
        uom: masterItem.uom,
        brand: masterItem.brand,
        axsku: masterItem.axsku,
        mpn: masterItem.mpn,
        group: masterItem.group,
        price: masterItem.rexRsp.value,
        qty: qty,
        total: (masterItem.rexRsp.value || 0) * (qty || 0),
        rexScFob: masterItem.rexScFob,
        forex: masterItem.forex,
        sst: masterItem.sst,
        opta: masterItem.opta,
        rexScDdp: masterItem.rexScDdp,
        rexSp: masterItem.rexSp,
        rexRsp: masterItem.rexRsp,
        isOptional: false,
      };

      // Optimistic
      setBqItems(prev => [...prev, newItem]);

      // DB
      const dbItemObj = mapBQItemToDB(newItem);
      delete dbItemObj.id; // Let DB generate

      const { data, error } = await supabase.from('bq_items').insert(dbItemObj).select().single();

      if (data) {
        // Replace Temp ID
        setBqItems(prev => prev.map(i => i.id === tempId ? { ...i, id: data.id } : i));
      } else if (error) {
        console.error("Error inserting BQ Item:", error);
        // Revert? For now just log.
      }
    }
  };

  const removeBQItem = async (id: string) => {
    setBqItems(bqItems.filter((item) => item.id !== id));
    await supabase.from('bq_items').delete().eq('id', id);
  };

  const updateBQItem = async (id: string, field: keyof BQItem, value: any) => {
    let processedValue = value;
    if (field === 'qty' || field === 'price') {
      processedValue = Number(value);
    }

    // Handle Qty <= 0 Delete
    if (field === 'qty' && processedValue <= 0) {
      setBqItems(prev => prev.filter(item => item.id !== id));
      await supabase.from('bq_items').delete().eq('id', id);
      return;
    }

    setBqItems((prev) => {
      return prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: processedValue };
          if (field === 'price' || field === 'qty') {
            const p = field === 'price' ? processedValue : item.price;
            const q = field === 'qty' ? processedValue : item.qty;
            const safeP = isNaN(p) ? 0 : p;
            const safeQ = isNaN(q) ? 0 : q;
            updated.total = safeP * safeQ;
          }
          return updated;
        }
        return item;
      })
    });

    // DB Update
    // Calculate total if price/qty changed
    let dbUpdate: any = { [field]: processedValue };
    if (field === 'price' || field === 'qty') {
      // We need to calculate total. 
      // Reuse logic?
      // Just find the item in 'prev' state is hard. 
      // We can fetch from DB, update total.
      // Or cleaner: Calculate total based on what we have.
      // We only have the CHANGED field.
      // We need the OTHER field.
      const existing = bqItems.find(i => i.id === id);
      if (existing) {
        const p = field === 'price' ? processedValue : existing.price;
        const q = field === 'qty' ? processedValue : existing.qty;
        const total = p * q;
        dbUpdate = { [field]: processedValue, total };

        // Perform Update
        const merged = { ...existing, ...dbUpdate };
        const toSave = mapBQItemToDB(merged);
        delete toSave.id;
        await supabase.from('bq_items').update(toSave).eq('id', id);
      }
    } else {
      // Non-calc field update
      // Map the single field? 
      // Just update the whole item using mapBQItemToDB is safer.
      const existing = bqItems.find(i => i.id === id);
      if (existing) {
        const merged = { ...existing, [field]: processedValue };
        const toSave = mapBQItemToDB(merged);
        delete toSave.id;
        await supabase.from('bq_items').update(toSave).eq('id', id);
      }
    }
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
    // TODO: Persist order to DB (requires order_index column)
  };

  // --- Calculations ---
  const getProjectTotal = (projectId: string, versionId: string) => {
    const project = projects.find(p => p.id === projectId);
    const discount = project?.discount || 0;
    const projectItems = bqItems.filter(i => i.projectId === projectId && i.versionId === versionId && !i.isOptional);

    // Summation of REX TRSP (which is stored in item.total)
    const subtotal = projectItems.reduce((acc, item) => acc + (isNaN(item.total) ? 0 : item.total), 0);

    const tax = 0;
    // Grand Total is Subtotal - Discount
    const grandTotal = subtotal + tax - (isNaN(discount) ? 0 : discount);

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
        user, login, logout, updateUserProfile, updateCompanyProfile, uploadCompanyLogo
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
