
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Plus, Trash2, ArrowLeft, FolderPlus, Search, Calendar, User, Clock, FileText, Edit2, X, ArrowUpDown, LayoutTemplate, Eye, EyeOff, Layers, CheckSquare, GripVertical, AlertTriangle, Copy, ChevronDown, Save, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { useAppStore, calculateDerivedFields } from '../store';
import { AppLanguage, Project, BQItem, MasterItem, PriceField } from '../types';
import { TRANSLATIONS } from '../constants';
import SmartPriceCell from './SmartPriceCell';
import { DDP_STRATEGIES, SP_STRATEGIES, RSP_STRATEGIES } from '../pricingStrategies';


const getPriceValue = (val: any) => {
    if (typeof val === 'number') return val;
    if (val && typeof val === 'object' && 'value' in val) return val.value;
    return 0;
};

const getPriceField = (val: any): PriceField => {
    if (val && typeof val === 'object' && 'strategy' in val) return val;
    // Create a dummy wrapper for display if strictly number (should not happen after migration)
    return { value: Number(val) || 0, strategy: 'MANUAL', manualOverride: Number(val) || 0 };
};

interface Props {
    currentLanguage: AppLanguage;
    isSidebarOpen: boolean;
}

type SortKey = 'date' | 'validityPeriod';
type SortDirection = 'asc' | 'desc';

const BQBuilderView: React.FC<Props> = ({ currentLanguage, isSidebarOpen }) => {
    const {
        masterData,
        bqItems,
        projects,
        currentProjectId,
        setCurrentProjectId,
        currentVersionId,
        setCurrentVersionId,
        addProject,
        updateProject,
        deleteProject,
        duplicateProject,
        createVersion,
        updateVersionName,
        deleteVersion,
        updateProjectSnapshot,
        addBQItem,
        syncMasterToBQ,
        removeBQItem,
        updateBQItem,
        reorderBQItems,
        getProjectTotal,
        appSettings,
        bqViewMode,
        setBqViewMode,
    } = useAppStore();

    const t = TRANSLATIONS[currentLanguage];
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'date', direction: 'desc' });

    // Pagination State (Catalog)
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(() => {
        const saved = localStorage.getItem('swiftbq_builder_itemsPerPage');
        return saved ? parseInt(saved, 10) : 10;
    });

    useEffect(() => {
        localStorage.setItem('swiftbq_builder_itemsPerPage', itemsPerPage.toString());
    }, [itemsPerPage]);


    // Project Form State
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [projectForm, setProjectForm] = useState<Partial<Project>>({
        projectName: '',
        clientName: '',
        clientContact: '',
        clientAddress: '',
        date: new Date().toISOString().split('T')[0],
        validityPeriod: '30',
    });

    // Version Rename/Delete State
    const [isRenameVersionModalOpen, setIsRenameVersionModalOpen] = useState(false);
    const [isDeleteVersionModalOpen, setIsDeleteVersionModalOpen] = useState(false);
    const [newVersionName, setNewVersionName] = useState('');

    // Delete Confirmation State (Project)
    const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);

    // Filter State (Catalog)
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

    // Staged Edits for Catalog Mode (Session-based)
    const [stagedEdits, setStagedEdits] = useState<Record<string, Partial<MasterItem>>>({});

    // Column Visibility State with localStorage persistence
    const [showColumnDropdown, setShowColumnDropdown] = useState(false);
    const [visibleColumns, setVisibleColumns] = useState(() => {
        try {
            const saved = localStorage.getItem('swiftbq_bqBuilder_visibleColumns_v2');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Default visibility: first 4 columns (colA-D) hidden
                const defaultVisibility = {
                    brand: false,
                    axsku: false,
                    mpn: false,
                    group: false,
                    category: true,
                    item: true,
                    description: true,
                    uom: true,
                    forex: true,
                    sst: true,
                    opta: true,
                    rexScFob: true,
                    rexScDdp: true,
                    rexSp: true,
                    rexRsp: true,
                    price: true,
                    qty: true,
                    rexTsc: true,
                    rexTsp: true,
                    rexTrsp: true,
                    rexGp: true,
                    rexGpPercent: true,
                    isOptional: true,
                    action: true
                };
                // Merge saved with default to handle new columns
                return { ...defaultVisibility, ...parsed };
            }
        } catch (e) {
            console.error('Failed to load column visibility preferences:', e);
        }
        // Fallback default if no saved state
        return {
            brand: false,
            axsku: false,
            mpn: false,
            group: false,
            category: true,
            item: true,
            description: true,
            uom: true,
            forex: true,
            sst: true,
            opta: true,
            rexScFob: true,
            rexScDdp: true,
            rexSp: true,
            rexRsp: true,
            price: true,
            qty: true,
            rexTsc: true,
            rexTsp: true,
            rexTrsp: true,
            rexGp: true,
            rexGpPercent: true,
            isOptional: true,
            action: true
        };
    });

    // Persist column visibility changes to localStorage
    useEffect(() => {
        localStorage.setItem('swiftbq_bqBuilder_visibleColumns_v2', JSON.stringify(visibleColumns));
    }, [visibleColumns]);

    // --- Column Resizing State ---
    const [colWidths, setColWidths] = useState<{ [key: string]: number }>({
        dragHandle: 30,
        brand: 60,
        axsku: 70,
        mpn: 70,
        group: 60,
        category: 110,
        item: 140,
        description: 180,
        uom: 50,
        forex: 50,
        sst: 70,
        opta: 65,
        rexScDdp: 150,
        rexSp: 150,
        rexRsp: 150,
        price: 120,
        qty: 70,
        rexTsc: 90,
        rexTsp: 90,
        rexTrsp: 90,
        rexGp: 90,
        rexGpPercent: 60,
        isOptional: 50,
        action: 40
    });

    // Drag State for Review Table Rows
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const resizingRef = useRef<{ colKey: string; startX: number; startWidth: number } | null>(null);

    // --- Scroll Sync Refs ---
    const headerRef = useRef<HTMLDivElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);

    // Reset scroll on page change
    useEffect(() => {
        if (bodyRef.current) {
            bodyRef.current.scrollTop = 0;
            bodyRef.current.scrollLeft = 0;
        }
    }, [currentPage]);

    // Derived State
    const activeProject = useMemo(() =>
        projects.find(p => p.id === currentProjectId),
        [projects, currentProjectId]);

    const activeItems = useMemo(() =>
        bqItems.filter(item => item.projectId === currentProjectId && item.versionId === currentVersionId),
        [bqItems, currentProjectId, currentVersionId]);

    // OPTIMIZATION: Create a Map for O(1) lookup of BQ Items by Master ID
    const activeItemsMap = useMemo(() => {
        const map = new Map<string, BQItem>();
        activeItems.forEach(item => {
            if (item.masterId) {
                map.set(item.masterId, item);
            }
        });
        return map;
    }, [activeItems]);

    // Effect to set default version if none selected
    useEffect(() => {
        if (activeProject && !currentVersionId && activeProject.versions.length > 0) {
            setCurrentVersionId(activeProject.versions[0].id);
        }
    }, [activeProject, currentVersionId, setCurrentVersionId]);

    const startResize = (e: React.MouseEvent, colKey: string) => {
        e.preventDefault();
        e.stopPropagation();
        resizingRef.current = {
            colKey,
            startX: e.pageX,
            startWidth: colWidths[colKey],
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'col-resize';
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!resizingRef.current) return;
        const { colKey, startX, startWidth } = resizingRef.current;
        const diff = e.pageX - startX;
        const newWidth = Math.max(50, startWidth + diff);
        setColWidths((prev) => ({ ...prev, [colKey]: newWidth }));
    };

    const handleMouseUp = () => {
        resizingRef.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
    };

    const { grandTotal } = currentProjectId && currentVersionId ? getProjectTotal(currentProjectId, currentVersionId) : { grandTotal: 0 };
    const totalItemsSelected = activeItems.reduce((acc, item) => acc + (Number(item.qty) || 0), 0);

    // --- Bottom Bar Calculations ---
    const totalTSC = useMemo(() => activeItems.reduce((sum, item) => sum + (item.qty * (getPriceValue(item.rexScDdp) || 0)), 0), [activeItems]);
    const totalTSP = useMemo(() => activeItems.reduce((sum, item) => sum + (item.qty * (getPriceValue(item.rexSp) || 0)), 0), [activeItems]);
    // Total TRSP is essentially the sum of Item Totals (Selling Price * Qty)
    const totalTRSP = useMemo(() => activeItems.reduce((sum, item) => sum + (item.total || 0), 0), [activeItems]);
    const totalGP = totalTRSP - totalTSC;
    const totalGPPerc = totalTRSP !== 0 ? totalGP / totalTRSP : 0;

    // --- Catalog Data Processing ---
    const categories = useMemo(() => {
        const cats = Array.from(new Set(masterData.map((item) => item.category))).filter(Boolean).sort();
        return ['All', ...cats];
    }, [masterData]);
    // --- Derived State (Catalog) ---
    // Use Version-specific Master Snapshot if available, else fallback to global Master Data
    const catalogSource = useMemo(() => {
        if (!activeProject || !currentVersionId) return [];
        const version = activeProject.versions.find(v => v.id === currentVersionId);
        return version?.masterSnapshot || [];
    }, [activeProject, currentVersionId, masterData]);

    const filteredItems = useMemo(() => {
        let items = catalogSource;

        // 1. Filter by Category
        if (selectedCategory !== 'All') {
            items = items.filter(item => item.category === selectedCategory);
        }

        // 2. Filter by Search Query
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            items = items.filter(item =>
                item.itemName.toLowerCase().includes(q) ||
                item.description.toLowerCase().includes(q) ||
                (item.brand || '').toLowerCase().includes(q) ||
                (item.axsku || '').toLowerCase().includes(q) ||
                (item.mpn || '').toLowerCase().includes(q)
            );
        }

        return items;
    }, [catalogSource, selectedCategory, searchQuery]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedCategory, searchQuery, itemsPerPage]);

    // Pagination Calculation
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredItems.slice(start, start + itemsPerPage);
    }, [filteredItems, currentPage, itemsPerPage]);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };


    // --- Project List Processing ---
    const filteredProjects = useMemo(() => {
        const filtered = projects.filter(p =>
            p.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.clientName.toLowerCase().includes(searchQuery.toLowerCase())
        );

        return filtered.sort((a, b) => {
            const { key, direction } = sortConfig;
            let valA: any = a[key];
            let valB: any = b[key];

            if (key === 'validityPeriod') {
                valA = Number(valA);
                valB = Number(valB);
            }

            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });

    }, [projects, searchQuery, sortConfig]);

    // --- Handlers ---

    const commitCatalogChanges = () => {
        if (!activeProject || !stagedEdits || Object.keys(stagedEdits).length === 0) return;

        const updates = Object.entries(stagedEdits).map(([id, edits]) => ({
            id,
            ...(edits as Partial<MasterItem>)
        }));

        if (currentVersionId) {
            updateProjectSnapshot(activeProject.id, currentVersionId, updates);
            setStagedEdits({});
        }

        // Force reload BQ items that use these master items to ensure they stay in sync?
        // Actually, BQ items are snapshots of Master items *at add time*.
        // If we update the Project Snapshot, subsequent Adds will be correct.
        // Existing BQ items: User might want them updated? 
        // For now, versioning philosophy says "Snapshot on Add". 
        // If user wants to update BQ Item, they should re-add or we could implement a "Refresh Prices" feature later.
    };



    const handleCategorySelect = (cat: string) => {
        setSelectedCategory(cat);
        setShowCategoryDropdown(false);
    };

    const handleCatalogEdit = (id: string, field: keyof MasterItem, value: any) => {
        setStagedEdits(prev => {
            const currentStaged = prev[id] || {};

            // Calculate derived fields (DDP, SP, RSP) based on updates
            // We need the base item to have complete context for calculation
            const baseItem = catalogSource.find(m => m.id === id);
            const itemContext = { ...(baseItem || {}), ...currentStaged, [field]: value } as Partial<MasterItem>;
            const derived = calculateDerivedFields(itemContext);

            const newStagedItem = { ...currentStaged, [field]: value, ...derived };
            const newStaged = { ...prev, [id]: newStagedItem };

            // If item is already added (Qty > 0), live update the BQ Item to reflect changes
            const currentQty = getQtyForMasterItem(id);
            if (currentQty && Number(currentQty) > 0 && activeProject && currentVersionId) {
                // Use catalogSource (Snapshot) as base
                const masterItem = baseItem; // Reused from above
                if (masterItem) {
                    const mergedItem = { ...masterItem, ...newStagedItem } as MasterItem;
                    // Defer sync to avoid state update conflict/race
                    const qtyVal = Number(currentQty);
                    setTimeout(() => {
                        if (syncMasterToBQ) {
                            syncMasterToBQ(activeProject.id, currentVersionId, mergedItem, qtyVal);
                        }
                    }, 0);
                }
            }
            return newStaged;
        });
    };

    const handleCatalogQtyChange = (masterItemId: string, qty: string) => {
        if (!activeProject || !currentVersionId) return;
        const val = parseFloat(qty);
        // Step 2 Fix: Use catalogSource (Snapshot) AND Merge with Staged Edits
        const masterItem = catalogSource.find(m => m.id === masterItemId);
        if (masterItem) {
            const staged = stagedEdits[masterItemId] || {};
            const finalItem = { ...masterItem, ...staged } as MasterItem;
            syncMasterToBQ(activeProject.id, currentVersionId, finalItem, isNaN(val) ? 0 : val);
        }
    };

    const getQtyForMasterItem = (masterId: string) => {
        const item = activeItemsMap.get(masterId);
        return item ? item.qty : '';
    };

    const openCreateModal = () => {
        setProjectForm({
            projectName: '',
            clientName: '',
            clientContact: '',
            clientAddress: '',
            date: new Date().toISOString().split('T')[0],
            validityPeriod: '30',
        });
        setIsProjectModalOpen(true);
    };

    const openEditModal = () => {
        if (!activeProject) return;
        setProjectForm({
            id: activeProject.id,
            projectName: activeProject.projectName,
            clientName: activeProject.clientName,
            clientContact: activeProject.clientContact || '',
            clientAddress: activeProject.clientAddress || '',
            date: activeProject.date,
            validityPeriod: activeProject.validityPeriod,
        });
        setIsProjectModalOpen(true);
    }

    const handleSaveProject = () => {
        if (!projectForm.projectName) return;

        if (projectForm.id) {
            updateProject(projectForm.id, {
                projectName: projectForm.projectName,
                clientName: projectForm.clientName,
                clientContact: projectForm.clientContact,
                clientAddress: projectForm.clientAddress,
                date: projectForm.date,
                validityPeriod: projectForm.validityPeriod,
            });
        } else {
            const project: Project = {
                id: Date.now().toString(),
                projectName: projectForm.projectName!,
                clientName: projectForm.clientName || '',
                clientContact: projectForm.clientContact || '',
                clientAddress: projectForm.clientAddress || '',
                date: projectForm.date || new Date().toISOString().split('T')[0],
                validityPeriod: projectForm.validityPeriod || '30',
                quoteId: `Q-${new Date().getFullYear()}-${projects.length + 1001}`,
                versions: [] // Will be handled by store
            };
            addProject(project);
        }
        setIsProjectModalOpen(false);
    };

    const handleCopyVersion = () => {
        if (!activeProject || !currentVersionId) return;

        const currentVersionName = activeProject.versions.find(v => v.id === currentVersionId)?.name || 'version';

        // Determine next version number logic
        let newName = `${currentVersionName}-copy`;
        const match = currentVersionName.match(/version-(\d+)$/i);
        if (match) {
            const nextNum = parseInt(match[1]) + 1;
            newName = `version-${nextNum}`;
        } else {
            let counter = 2;
            while (activeProject.versions.some(v => v.name === `version-${counter}`)) {
                counter++;
            }
            newName = `version-${counter}`;
        }

        const newVersionId = Date.now().toString();
        createVersion(activeProject.id, currentVersionId, newName, newVersionId);
        // Immediate switch
        setCurrentVersionId(newVersionId);
    };

    const handleRenameVersion = () => {
        if (!activeProject || !currentVersionId) return;
        const currentVer = activeProject.versions.find(v => v.id === currentVersionId);
        if (currentVer) {
            setNewVersionName(currentVer.name);
            setIsRenameVersionModalOpen(true);
        }
    };

    const saveVersionName = () => {
        if (!activeProject || !currentVersionId || !newVersionName.trim()) return;
        updateVersionName(activeProject.id, currentVersionId, newVersionName.trim());
        setIsRenameVersionModalOpen(false);
    };

    const handleDeleteVersion = () => {
        if (!activeProject || !currentVersionId) return;
        deleteVersion(activeProject.id, currentVersionId);
        setIsDeleteVersionModalOpen(false);
    };

    const toggleColumn = (key: keyof typeof visibleColumns) => {
        setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Drag Handlers
    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === dropIndex) return;
        if (activeProject && currentVersionId) {
            reorderBQItems(activeProject.id, currentVersionId, draggedIndex, dropIndex);
        }
        setDraggedIndex(null);
    };

    const fmt = (n: number) => n?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00';
    const fmtSensitive = (n: number) => {
        if (n === undefined || n === null) return '0';
        return n.toString();
    };
    const fmtPct = (n: number) => (n * 100)?.toFixed(1) + '%';

    const contentPadding = !isSidebarOpen ? 'pl-4 md:pl-24 pr-4' : 'px-4';

    // Calculate dynamic table width based on visible columns
    const totalTableWidth = Object.keys(colWidths).reduce((acc, key) => {
        if (bqViewMode === 'catalog' && (key === 'dragHandle' || key === 'isOptional')) return acc;

        if (key === 'dragHandle') return acc + colWidths[key];
        if (visibleColumns[key as keyof typeof visibleColumns]) {
            return acc + colWidths[key];
        }
        return acc;
    }, 0);

    // Column Ordering Config
    const columnOrder: { key: keyof typeof visibleColumns; label: string }[] = [
        { key: 'brand', label: t.brand },
        { key: 'axsku', label: t.axsku },
        { key: 'mpn', label: t.mpn },
        { key: 'group', label: t.group },
        { key: 'category', label: t.category },
        { key: 'item', label: t.item },
        { key: 'description', label: t.description },
        { key: 'uom', label: t.uom },
        { key: 'price', label: 'REX SC (FOB)' },
        { key: 'qty', label: 'Quantity' },
        { key: 'forex', label: t.forex },
        { key: 'sst', label: t.sst },
        { key: 'opta', label: t.opta },
        { key: 'rexScDdp', label: t.rexScDdp },
        { key: 'rexSp', label: t.rexSp },
        { key: 'rexTsc', label: t.rexTsc },
        { key: 'rexTsp', label: t.rexTsp },
        { key: 'rexTrsp', label: t.rexTrsp },
        { key: 'rexGp', label: t.rexGp },
        { key: 'rexGpPercent', label: t.rexGpPercent },
        { key: 'action', label: t.actions },
    ];



    // --- UNIFIED ROW RENDERING LOGIC ---
    const renderTableRows = (items: (MasterItem | BQItem)[], mode: 'catalog' | 'review') => {
        if (items.length === 0) {
            return (
                <tr>
                    <td colSpan={20} className="p-12 text-center text-slate-400 italic">
                        {mode === 'catalog' ? 'No items found in catalog.' : 'No items selected. Go to Catalog to add items.'}
                    </td>
                </tr>
            );
        }

        return items.map((item, index) => {
            const isReview = mode === 'review';
            const bqItem = isReview ? (item as BQItem) : null;
            const masterItem = !isReview ? (item as MasterItem) : null;
            const itemId = item.id;

            // Phase 1: Data Independence - Remove Linked Master Item Logic
            // In Review Mode, we strictly use the BQItem snapshot fields.
            // In Catalog Mode, we use the MasterItem fields.

            // Phase 2: Editable Catalog
            // Resolve Display Item:
            // Review: BQItem
            // Catalog: Catalog Source Item (Snapshot) + Staged Edits

            let displayItem: any = item;
            if (!isReview) {
                const master = item as MasterItem;
                const staged = stagedEdits[master.id] || {};
                displayItem = { ...master, ...staged };
            } else {
                displayItem = item as BQItem;
            }

            // Calculations
            let rowRexScDdp = 0, rowRexSp = 0;
            // Calculations should respect staged edits in Catalog
            rowRexScDdp = getPriceValue(displayItem.rexScDdp);
            rowRexSp = getPriceValue(displayItem.rexSp);



            // Quantity & Pricing
            let currentQty: number | string = '';
            let priceVal = 0;

            if (isReview && bqItem) {
                currentQty = bqItem.qty;
                priceVal = bqItem.rexScFob || 0;
            } else {
                // Catalog uses merged displayItem for pricing, but Qty is lookup
                currentQty = getQtyForMasterItem(item.id) || '';
                priceVal = displayItem.rexScFob || 0;
            }
            const numQty = Number(currentQty) || 0;

            const rowRexTsc = numQty * rowRexScDdp;
            const rowRexTsp = numQty * rowRexSp;

            // TRSP: In Review, use stored Total. In Catalog, calculate.
            // Note: BQItem.total is TRSP. Store calculates it as rexRsp * qty.
            // Catalog: Calculate derived TRSP.
            let rowRexTrsp = 0;
            if (isReview && bqItem) {
                rowRexTrsp = bqItem.total;
            } else {
                rowRexTrsp = numQty * getPriceValue(displayItem.rexRsp);
            }

            const rowRexGp = rowRexTrsp - rowRexTsc;
            const rowRexGpPercent = rowRexTrsp ? rowRexGp / rowRexTrsp : 0;
            const isOptional = isReview && bqItem ? !!bqItem.isOptional : false;

            // Drag & Select States
            const isDragging = isReview && draggedIndex === index;
            const isSelectedInCatalog = !isReview && numQty > 0;

            return (
                <tr
                    key={itemId}
                    className={`transition-colors group hover:bg-gray-50 dark:hover:bg-slate-700/30 ${(!isReview && stagedEdits[itemId]) ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}`}
                    draggable={isReview}
                    onDragStart={isReview ? (e) => handleDragStart(e, index) : undefined}
                    onDragOver={isReview ? handleDragOver : undefined}
                    onDrop={isReview ? (e) => handleDrop(e, index) : undefined}
                >
                    {/* Drag Handle / Spacer */}
                    {isReview && (
                        <td className="p-2 align-middle text-center sticky left-0 bg-white dark:bg-slate-800 z-10 border-r border-gray-100 dark:border-slate-700/50" style={{ width: colWidths.dragHandle }}>
                            <div className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <GripVertical size={16} className="mx-auto" />
                            </div>
                        </td>
                    )}

                    {/* Column A (Brand) */}
                    {visibleColumns.brand && <td className="p-1 align-top">
                        {isReview ? (
                            <div className="text-xs font-normal text-slate-600 dark:text-slate-300 truncate p-2">{(bqItem as BQItem)?.brand}</div>
                        ) : (
                            <input tabIndex={1} type="text" value={displayItem.brand || ''} onChange={(e) => handleCatalogEdit(itemId, 'brand', e.target.value)} className="w-full bg-transparent p-2 rounded border border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all text-xs font-normal text-slate-600 dark:text-slate-300 truncate" />
                        )}
                    </td>}

                    {/* Column B (AX SKU) */}
                    {visibleColumns.axsku && <td className="p-1 align-top">
                        {isReview ? (
                            <div className="text-xs font-normal text-slate-600 dark:text-slate-300 truncate p-2">{(bqItem as BQItem)?.axsku}</div>
                        ) : (
                            <input tabIndex={1} type="text" value={displayItem.axsku || ''} onChange={(e) => handleCatalogEdit(itemId, 'axsku', e.target.value)} className="w-full bg-transparent p-2 rounded border border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all text-xs font-normal text-slate-600 dark:text-slate-300 truncate" />
                        )}
                    </td>}

                    {/* Column C (MPN) */}
                    {visibleColumns.mpn && <td className="p-1 align-top">
                        {isReview ? (
                            <div className="text-xs font-normal text-slate-600 dark:text-slate-300 truncate p-2">{(bqItem as BQItem)?.mpn}</div>
                        ) : (
                            <input tabIndex={1} type="text" value={displayItem.mpn || ''} onChange={(e) => handleCatalogEdit(itemId, 'mpn', e.target.value)} className="w-full bg-transparent p-2 rounded border border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all text-xs font-normal text-slate-600 dark:text-slate-300 truncate" />
                        )}
                    </td>}

                    {/* Column D (Group) */}
                    {visibleColumns.group && <td className="p-1 align-top">
                        {isReview ? (
                            <div className="text-xs font-normal text-slate-600 dark:text-slate-300 truncate p-2">{(bqItem as BQItem)?.group}</div>
                        ) : (
                            <input tabIndex={1} type="text" value={displayItem.group || ''} onChange={(e) => handleCatalogEdit(itemId, 'group', e.target.value)} className="w-full bg-transparent p-2 rounded border border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all text-xs font-normal text-slate-600 dark:text-slate-300 truncate" />
                        )}
                    </td>}

                    {/* Category */}
                    {visibleColumns.category && <td className="p-1 align-top">
                        {isReview ? (
                            <div className="truncate text-xs font-normal text-slate-600 dark:text-slate-300 p-2">{bqItem?.category}</div>
                        ) : (
                            <input tabIndex={1} type="text" value={displayItem.category || ''} onChange={(e) => handleCatalogEdit(itemId, 'category', e.target.value)} className="w-full bg-transparent p-2 rounded border border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all text-xs font-normal text-slate-600 dark:text-slate-300 truncate" />
                        )}
                    </td>}

                    {/* Item Name */}
                    {visibleColumns.item && <td className="p-1 align-top">
                        {isReview ? (
                            <div className="font-medium text-sm text-slate-900 dark:text-white truncate p-2">{bqItem?.itemName}</div>
                        ) : (
                            <input tabIndex={1} type="text" value={displayItem.itemName || ''} onChange={(e) => handleCatalogEdit(itemId, 'itemName', e.target.value)} className="w-full bg-transparent p-2 rounded border border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all font-medium text-sm text-slate-900 dark:text-white truncate" />
                        )}
                    </td>}

                    {/* Description */}
                    {visibleColumns.description && <td className="p-1 align-top">
                        {isReview ? (
                            <div className="text-xs font-normal text-slate-600 dark:text-slate-300 truncate whitespace-pre-wrap p-2">{bqItem?.description}</div>
                        ) : (
                            <textarea
                                tabIndex={1}
                                value={displayItem.description || ''}
                                onChange={(e) => handleCatalogEdit(itemId, 'description', e.target.value)}
                                rows={1}
                                className="w-full bg-transparent p-2 rounded border border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all font-normal text-xs resize-none text-slate-600 dark:text-slate-300"
                            />
                        )}
                    </td>}

                    {/* UOM */}
                    {visibleColumns.uom && <td className="p-1 align-top">
                        {isReview ? (
                            <div className="text-xs font-normal text-slate-600 dark:text-slate-300 text-center p-2">{bqItem?.uom}</div>
                        ) : (
                            <input tabIndex={1} type="text" value={displayItem.uom || ''} onChange={(e) => handleCatalogEdit(itemId, 'uom', e.target.value)} className="w-full text-center bg-transparent p-2 rounded border border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all font-normal text-xs text-slate-600 dark:text-slate-300" />
                        )}
                    </td>}

                    {/* Price (REX SC FOB) */}
                    {visibleColumns.price && <td className="p-1 align-top">
                        {isReview ? (
                            <div className="text-sm font-normal text-slate-900 dark:text-white text-right p-2">{fmt(priceVal)}</div>
                        ) : (
                            <input
                                tabIndex={1}
                                type="number"
                                value={priceVal}
                                onChange={(e) => handleCatalogEdit(itemId, 'rexScFob', e.target.value)} // Editing FOB triggers calc
                                className="w-full text-right bg-transparent p-2 rounded border border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all font-normal text-sm text-slate-900 dark:text-white"
                            />
                        )}
                    </td>}

                    {/* Qty (Quantity) - Review: Editable (user request ambiguous, but usually Qty is the ONLY thing editable in a locked BOQ). Catalog: Editable. */}
                    {visibleColumns.qty && <td className="p-1 align-top">
                        <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={currentQty}
                            onChange={(e) => isReview
                                ? updateBQItem(itemId, 'qty', e.target.value)
                                : handleCatalogQtyChange(itemId, e.target.value)
                            }
                            className={`w-full text-center rounded-lg border focus:ring-2 focus:outline-none p-1 transition-all text-sm font-bold ${isReview
                                ? 'bg-gray-50 dark:bg-slate-700/50 border-gray-200 dark:border-slate-600 text-slate-900 dark:text-white focus:border-primary-500'
                                : isSelectedInCatalog
                                    ? 'border-primary-500 ring-2 ring-primary-100 dark:ring-primary-900/30 bg-white dark:bg-slate-800 text-primary-600'
                                    : 'border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-primary-500'
                                }`}
                        />
                    </td>}

                    {/* Forex */}
                    {visibleColumns.forex && <td className="p-1 align-middle">
                        {isReview ? (
                            <div className="text-xs font-normal text-slate-600 dark:text-slate-300 text-right p-2">{fmtSensitive((bqItem as BQItem)?.forex || 0)}</div>
                        ) : (
                            <input tabIndex={1} type="number" value={displayItem.forex} onChange={(e) => handleCatalogEdit(itemId, 'forex', e.target.value)} className="w-full text-right bg-transparent p-2 rounded border border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all text-xs text-slate-600 dark:text-slate-300" />
                        )}
                    </td>}

                    {/* SST */}
                    {visibleColumns.sst && <td className="p-1 align-middle">
                        {isReview ? (
                            <div className="text-xs font-normal text-slate-600 dark:text-slate-300 text-right p-2">{fmtSensitive((bqItem as BQItem)?.sst || 0)}</div>
                        ) : (
                            <input tabIndex={1} type="number" value={displayItem.sst} onChange={(e) => handleCatalogEdit(itemId, 'sst', e.target.value)} className="w-full text-right bg-transparent p-2 rounded border border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all text-xs text-slate-600 dark:text-slate-300" />
                        )}
                    </td>}

                    {/* OPTA */}
                    {visibleColumns.opta && <td className="p-1 align-middle">
                        {isReview ? (
                            <div className="text-xs font-normal text-slate-600 dark:text-slate-300 text-right p-2">{fmtSensitive((bqItem as BQItem)?.opta || 0)}</div>
                        ) : (
                            <input tabIndex={1} type="number" value={displayItem.opta} onChange={(e) => handleCatalogEdit(itemId, 'opta', e.target.value)} className="w-full text-right bg-transparent p-2 rounded border border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all text-xs text-slate-600 dark:text-slate-300" />
                        )}
                    </td>}

                    {/* REX SC DDP */}
                    {visibleColumns.rexScDdp && <td className="p-1 align-top">
                        {isReview ? (
                            <SmartPriceCell
                                field={getPriceField(displayItem.rexScDdp)}
                                strategies={DDP_STRATEGIES}
                                onChange={(updates) => updateBQItem(itemId, 'rexScDdp', { ...getPriceField(displayItem.rexScDdp), ...updates })}
                                disabled={true}
                            // Review mode likely shouldn't edit DDP directly unless intended. 
                            // Assuming yes for dynamic pricing within quote.
                            />
                        ) : (
                            <SmartPriceCell
                                field={getPriceField(displayItem.rexScDdp)}
                                strategies={DDP_STRATEGIES}
                                onChange={(updates) => handleCatalogEdit(itemId, 'rexScDdp', { ...getPriceField(displayItem.rexScDdp), ...updates })}
                            />
                        )}

                    </td>}

                    {/* REX SP */}
                    {visibleColumns.rexSp && <td className="p-1 align-top">
                        <SmartPriceCell
                            field={getPriceField(displayItem.rexSp)}
                            strategies={SP_STRATEGIES}
                            onChange={(updates) => isReview
                                ? updateBQItem(itemId, 'rexSp', { ...getPriceField(displayItem.rexSp), ...updates })
                                : handleCatalogEdit(itemId, 'rexSp', { ...getPriceField(displayItem.rexSp), ...updates })
                            }
                            disabled={isReview}
                        />
                    </td>}

                    {/* REX RSP - Placeholder */}
                    {visibleColumns.rexRsp && <td className="p-1 align-top">
                        <SmartPriceCell
                            field={getPriceField(displayItem.rexRsp)}
                            strategies={RSP_STRATEGIES}
                            onChange={(updates) => isReview
                                ? updateBQItem(itemId, 'rexRsp', { ...getPriceField(displayItem.rexRsp), ...updates })
                                : handleCatalogEdit(itemId, 'rexRsp', { ...getPriceField(displayItem.rexRsp), ...updates })
                            }
                            disabled={isReview}
                        />
                    </td>}

                    {/* Calculated Columns */}
                    {visibleColumns.rexTsc && <td className="p-1 align-middle text-right text-slate-500 font-normal text-sm">{fmt(rowRexTsc)}</td>}
                    {visibleColumns.rexTsp && <td className="p-1 align-middle text-right text-slate-500 font-normal text-sm">{fmt(rowRexTsp)}</td>}
                    {visibleColumns.rexTrsp && <td className="p-1 align-middle text-right text-slate-500 font-bold text-sm">{fmt(rowRexTrsp)}</td>}
                    {visibleColumns.rexGp && <td className="p-1 align-middle text-right text-slate-500 font-normal text-sm">{fmt(rowRexGp)}</td>}
                    {visibleColumns.rexGpPercent && <td className="p-1 align-middle text-right text-slate-500 font-normal text-sm">{fmtPct(rowRexGpPercent)}</td>}

                    {/* Optional */}
                    {visibleColumns.isOptional && isReview && <td className="p-1 align-middle text-center">
                        <input
                            type="checkbox"
                            checked={isOptional}
                            onChange={(e) => updateBQItem(itemId, 'isOptional', e.target.checked)}
                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 cursor-pointer"
                        />
                    </td>}

                    {/* Action */}
                    {visibleColumns.action && <td className="p-1 align-top text-center">
                        {isReview && (
                            <button
                                onClick={() => removeBQItem(itemId)}
                                className="text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </td>}
                </tr>
            );
        });
    };

    // Reusable Project Modal Component
    const renderProjectModal = () => {
        if (!isProjectModalOpen) return null;
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{projectForm.id ? t.updateProject : t.createProject}</h3>
                        <button onClick={() => setIsProjectModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                            <X size={24} />
                        </button>
                    </div>
                    <div className="p-6 space-y-4 overflow-y-auto">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.projectName}</label>
                            <input type="text" value={projectForm.projectName} onChange={(e) => setProjectForm({ ...projectForm, projectName: e.target.value })} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white" autoFocus />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.clientName}</label>
                                <input type="text" value={projectForm.clientName} onChange={(e) => setProjectForm({ ...projectForm, clientName: e.target.value })} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.clientContact}</label>
                                <input type="text" value={projectForm.clientContact} onChange={(e) => setProjectForm({ ...projectForm, clientContact: e.target.value })} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.clientAddress}</label>
                            <textarea
                                rows={3}
                                value={projectForm.clientAddress}
                                onChange={(e) => setProjectForm({ ...projectForm, clientAddress: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white resize-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.date}</label>
                                <input type="date" value={projectForm.date} onChange={(e) => setProjectForm({ ...projectForm, date: e.target.value })} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.validityPeriod}</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={projectForm.validityPeriod}
                                        onChange={(e) => setProjectForm({ ...projectForm, validityPeriod: e.target.value })}
                                        className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg pl-4 pr-12 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white"
                                        placeholder="30"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">Days</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 bg-gray-50 dark:bg-slate-700/30 flex justify-end gap-3 shrink-0">
                        <button onClick={() => setIsProjectModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors">Cancel</button>
                        <button onClick={handleSaveProject} className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium shadow-lg shadow-primary-500/30 transition-colors">
                            {projectForm.id ? t.updateProject : 'Create'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Reusable Table Header for both Catalog and Review
    const renderTableHeader = () => (
        <thead className="sticky top-0 bg-gray-50 dark:bg-slate-700/90 backdrop-blur-sm z-10">
            <tr className="text-slate-600 dark:text-slate-300 text-sm border-b border-gray-100 dark:border-slate-700">
                {/* Drag Handle Column / Spacer */}
                {bqViewMode === 'review' && (
                    <th className="p-4 w-10 sticky left-0 z-20 bg-gray-50 dark:bg-slate-700/90 border-r border-gray-100 dark:border-slate-700/50" style={{ width: colWidths.dragHandle }}></th>
                )}

                {visibleColumns.brand && <th className="relative p-4 font-semibold select-none" style={{ width: colWidths.brand }}>
                    {t.brand}
                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 z-10" onMouseDown={(e) => startResize(e, 'brand')} />
                </th>}
                {visibleColumns.axsku && <th className="relative p-4 font-semibold select-none" style={{ width: colWidths.axsku }}>
                    {t.axsku}
                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 z-10" onMouseDown={(e) => startResize(e, 'axsku')} />
                </th>}
                {visibleColumns.mpn && <th className="relative p-4 font-semibold select-none" style={{ width: colWidths.mpn }}>
                    {t.mpn}
                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 z-10" onMouseDown={(e) => startResize(e, 'mpn')} />
                </th>}
                {visibleColumns.group && <th className="relative p-4 font-semibold select-none" style={{ width: colWidths.group }}>
                    {t.group}
                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 z-10" onMouseDown={(e) => startResize(e, 'group')} />
                </th>}

                {visibleColumns.category && <th className="relative p-4 font-semibold select-none" style={{ width: colWidths.category }}>

                    {t.category}
                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 z-10" onMouseDown={(e) => startResize(e, 'category')} />
                </th>}
                {visibleColumns.item && <th className="relative p-4 font-semibold select-none" style={{ width: colWidths.item }}>
                    {t.item}
                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 z-10" onMouseDown={(e) => startResize(e, 'item')} />
                </th>}
                {visibleColumns.description && <th className="relative p-4 font-semibold select-none" style={{ width: colWidths.description }}>
                    {t.description}
                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 z-10" onMouseDown={(e) => startResize(e, 'description')} />
                </th>}
                {visibleColumns.uom && <th className="relative p-4 text-center font-semibold select-none" style={{ width: colWidths.uom }}>
                    {t.uom}
                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 z-10" onMouseDown={(e) => startResize(e, 'uom')} />
                </th>}
                {visibleColumns.price && <th className="relative p-4 text-right font-semibold select-none" style={{ width: colWidths.price }}>
                    REX SC (FOB)
                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 z-10" onMouseDown={(e) => startResize(e, 'price')} />
                </th>}
                {visibleColumns.qty && <th className="relative p-4 text-center font-semibold select-none" style={{ width: colWidths.qty }}>
                    Quantity
                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 z-10" onMouseDown={(e) => startResize(e, 'qty')} />
                </th>}
                {visibleColumns.forex && <th className="relative p-4 text-right font-semibold select-none" style={{ width: colWidths.forex }}>
                    {t.forex}
                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 z-10" onMouseDown={(e) => startResize(e, 'forex')} />
                </th>}
                {visibleColumns.sst && <th className="relative p-4 text-right font-semibold select-none" style={{ width: colWidths.sst }}>
                    {t.sst}
                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 z-10" onMouseDown={(e) => startResize(e, 'sst')} />
                </th>}
                {visibleColumns.opta && <th className="relative p-4 text-right font-semibold select-none" style={{ width: colWidths.opta }}>
                    {t.opta}
                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 z-10" onMouseDown={(e) => startResize(e, 'opta')} />
                </th>}
                {/* {visibleColumns.rexScFob && <th className="relative p-4 text-right font-semibold select-none" style={{ width: colWidths.rexScFob }}>
                    {t.rexScFob}
                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 z-10" onMouseDown={(e) => startResize(e, 'rexScFob')} />
                </th>} */}
                {visibleColumns.rexScDdp && <th className="relative p-4 text-right font-semibold select-none" style={{ width: colWidths.rexScDdp }}>
                    {t.rexScDdp}
                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 z-10" onMouseDown={(e) => startResize(e, 'rexScDdp')} />
                </th>}
                {visibleColumns.rexSp && <th className="relative p-4 text-right font-semibold select-none" style={{ width: colWidths.rexSp }}>
                    {t.rexSp}
                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 z-10" onMouseDown={(e) => startResize(e, 'rexSp')} />
                </th>}
                {visibleColumns.rexRsp && <th className="relative p-4 text-right font-semibold select-none" style={{ width: colWidths.rexRsp }}>
                    {t.rexRsp}
                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 z-10" onMouseDown={(e) => startResize(e, 'rexRsp')} />
                </th>}

                {/* Calculated Columns */}
                {visibleColumns.rexTsc && <th className="relative p-4 text-right font-semibold select-none" style={{ width: colWidths.rexTsc }}>
                    {t.rexTsc}
                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 z-10" onMouseDown={(e) => startResize(e, 'rexTsc')} />
                </th>}
                {visibleColumns.rexTsp && <th className="relative p-4 text-right font-semibold select-none" style={{ width: colWidths.rexTsp }}>
                    {t.rexTsp}
                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 z-10" onMouseDown={(e) => startResize(e, 'rexTsp')} />
                </th>}
                {visibleColumns.rexTrsp && <th className="relative p-4 text-right font-semibold select-none" style={{ width: colWidths.rexTrsp }}>
                    {t.rexTrsp}
                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 z-10" onMouseDown={(e) => startResize(e, 'rexTrsp')} />
                </th>}
                {visibleColumns.rexGp && <th className="relative p-4 text-right font-semibold select-none" style={{ width: colWidths.rexGp }}>
                    {t.rexGp}
                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 z-10" onMouseDown={(e) => startResize(e, 'rexGp')} />
                </th>}
                {visibleColumns.rexGpPercent && <th className="relative p-4 text-right font-semibold select-none" style={{ width: colWidths.rexGpPercent }}>
                    {t.rexGpPercent}
                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 z-10" onMouseDown={(e) => startResize(e, 'rexGpPercent')} />
                </th>}

                {visibleColumns.isOptional && bqViewMode === 'review' && <th className="relative p-4 text-center font-semibold select-none" style={{ width: colWidths.isOptional }}>
                    Opt.
                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 z-10" onMouseDown={(e) => startResize(e, 'isOptional')} />
                </th>}

                {visibleColumns.action && <th className="relative p-4 select-none" style={{ width: colWidths.action }}>

                </th>}
            </tr>
        </thead>
    );

    // --- Views ---

    if (!currentProjectId) {
        // === PROJECT LIST VIEW (Unchanged) ===
        return (
            <div className={`space-y-6 animate-fade-in pb-20 transition-all duration-300 ${contentPadding}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{t.projects}</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Manage your quotations and projects</p>
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="w-10 h-10 flex items-center justify-center bg-primary-500 hover:bg-primary-600 text-white rounded-lg shadow-lg shadow-primary-500/30 transition-colors"
                        title={t.addProject}
                    >
                        <Plus size={20} />
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t.searchProjects}
                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white"
                        />
                    </div>
                    <div className="relative min-w-[180px]">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                            <ArrowUpDown size={16} />
                        </div>
                        <select
                            value={`${sortConfig.key}-${sortConfig.direction}`}
                            onChange={(e) => {
                                const [key, direction] = e.target.value.split('-');
                                setSortConfig({ key: key as SortKey, direction: direction as SortDirection });
                            }}
                            className="w-full pl-10 pr-8 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white appearance-none cursor-pointer"
                        >
                            <option value="date-desc">Newest Date First</option>
                            <option value="date-asc">Oldest Date First</option>
                            <option value="validityPeriod-desc">Longest Validity</option>
                            <option value="validityPeriod-asc">Shortest Validity</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredProjects.map(project => (
                        <div
                            key={project.id}
                            onClick={() => {
                                setCurrentProjectId(project.id);
                                // Default to Catalog View when opening a project
                                setBqViewMode('catalog');
                                if (project.versions.length > 0) {
                                    // Auto-select latest version
                                    setCurrentVersionId(project.versions[project.versions.length - 1].id);
                                }
                            }}
                            className="group bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md hover:border-primary-200 dark:hover:border-primary-800 transition-all cursor-pointer relative overflow-hidden"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-primary-50 dark:bg-primary-900/20 text-primary-600 rounded-xl">
                                    <FileText size={24} />
                                </div>
                                <div className="flex gap-1 z-10">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); duplicateProject(project.id); }}
                                        className="p-2 text-slate-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                                        title="Duplicate Project"
                                    >
                                        <Copy size={18} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setDeleteConfirmationId(project.id); }}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1 group-hover:text-primary-600 transition-colors">{project.projectName}</h3>
                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4">
                                <User size={14} /> {project.clientName}
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-t border-gray-100 dark:border-slate-700 pt-4 mt-2">
                                <div>
                                    <p className="text-xs text-slate-400 mb-1">{t.date}</p>
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                        <Calendar size={12} /> {project.date}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 mb-1">{t.validityPeriod}</p>
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                        <Clock size={12} /> {project.validityPeriod} Days
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredProjects.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-center text-slate-400 dark:text-slate-500">
                            <FolderPlus size={48} className="mb-4 opacity-50" />
                            <p>No projects found. Create one to get started.</p>
                        </div>
                    )}
                </div>

                {renderProjectModal()}

                {/* Delete Confirmation Modal (Project) */}
                {deleteConfirmationId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6 transform transition-all scale-100">
                            <div className="flex flex-col items-center text-center mb-6">
                                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mb-4">
                                    <AlertTriangle size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Delete Project?</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Are you sure you want to delete this project? This action cannot be undone.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteConfirmationId(null)}
                                    className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => { deleteProject(deleteConfirmationId); setDeleteConfirmationId(null); }}
                                    className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl shadow-lg shadow-red-500/30 transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // === PROJECT BUILDER VIEW ===
    return (
        <div className="space-y-6 animate-fade-in pb-12 relative flex flex-col h-[calc(100vh-3.5rem)]">

            {/* Header Bar */}
            <div className={`transition-all duration-300 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shrink-0 ${contentPadding}`}>
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => {
                                setCurrentProjectId(null);
                                setCurrentVersionId(null);
                            }}
                            className="p-2 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
                            title={t.backToProjects}
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div className="flex items-baseline gap-4">
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{activeProject?.projectName || 'Untitled Project'}</h1>
                            <button
                                onClick={openEditModal}
                                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium flex items-center gap-1 transition-colors text-sm"
                            >
                                <User size={14} /> {activeProject?.clientName || 'Add Client'} <Edit2 size={12} className="ml-0.5" />
                            </button>
                        </div>
                    </div>

                    {/* Version Control Bar - Moved below title */}
                    <div className="flex items-center gap-2 pl-14">
                        <div className="relative">
                            <select
                                value={currentVersionId || ''}
                                onChange={(e) => setCurrentVersionId(e.target.value)}
                                className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs rounded-lg pl-2 pr-7 py-1.5 focus:ring-2 focus:ring-primary-500 focus:outline-none appearance-none font-medium min-w-[120px]"
                            >
                                {activeProject?.versions.map(v => (
                                    <option key={v.id} value={v.id}>{v.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                        </div>

                        <button
                            onClick={handleRenameVersion}
                            className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                            title="Rename Version"
                        >
                            <Edit2 size={14} />
                        </button>

                        <button
                            onClick={handleCopyVersion}
                            className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                            title="Duplicate Version"
                        >
                            <Copy size={14} />
                        </button>

                        <button
                            onClick={() => setIsDeleteVersionModalOpen(true)}
                            className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Delete Version"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>

                {/* Toggle View & Custom Item Actions */}
                <div className="flex gap-2 items-center w-full xl:w-auto self-end xl:self-center">

                    {/* Catalog Search & Filter: Only visible in Catalog View */}
                    {bqViewMode === 'catalog' && (
                        <>
                            {/* Search Bar */}
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-40 xl:w-64 pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white transition-all"
                                />
                            </div>

                            {/* Category Filter Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                                    className={`w-10 h-10 flex items-center justify-center border hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition-colors ${selectedCategory !== 'All'
                                        ? 'bg-primary-50 text-primary-600 border-primary-200 dark:bg-primary-900/30 dark:border-primary-800 dark:text-primary-400'
                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-gray-200 dark:border-slate-600'}`}
                                    title="Filter Category"
                                >
                                    <Filter size={20} />
                                </button>
                                {showCategoryDropdown && (
                                    <>
                                        <div className="fixed inset-0 z-10 cursor-default" onClick={() => setShowCategoryDropdown(false)} />
                                        <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-600 z-20 p-2 grid grid-cols-1 gap-1 max-h-[300px] overflow-y-auto">
                                            {categories.map((cat) => (
                                                <button
                                                    key={cat}
                                                    onClick={() => handleCategorySelect(cat)}
                                                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${selectedCategory === cat
                                                        ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                                                        : 'text-slate-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                                                >
                                                    <span className="truncate font-medium">{cat}</span>
                                                    {selectedCategory === cat && <CheckSquare size={14} />}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    )}

                    {/* Catalog Save Button: Only visible in Catalog View */}
                    {bqViewMode === 'catalog' && (
                        <button
                            onClick={commitCatalogChanges}
                            disabled={Object.keys(stagedEdits).length === 0}
                            className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-all ${Object.keys(stagedEdits).length > 0
                                ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/50 shadow-sm'
                                : 'bg-white dark:bg-slate-800 text-gray-300 dark:text-gray-600 border-gray-200 dark:border-slate-700 cursor-not-allowed opacity-60'
                                }`}
                            title="Save Catalog Changes"
                        >
                            <Save size={20} />
                        </button>
                    )}

                    {/* Columns Button - Shared for both views */}
                    <div className="relative">
                        <button
                            onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                            className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
                            title={t.columns}
                        >
                            <LayoutTemplate size={20} />
                        </button>
                        {showColumnDropdown && (
                            <>
                                <div className="fixed inset-0 z-10 cursor-default" onClick={() => setShowColumnDropdown(false)} />
                                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-600 z-20 p-2 grid grid-cols-1 gap-1 max-h-[300px] overflow-y-auto">
                                    {columnOrder.map((col) => (
                                        <button
                                            key={col.key}
                                            onClick={() => toggleColumn(col.key)}
                                            className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${visibleColumns[col.key] ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400' : 'text-slate-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                                        >
                                            <span className="truncate mr-2 font-medium">{col.label}</span>
                                            {visibleColumns[col.key] ? <Eye size={14} /> : <EyeOff size={14} className="opacity-50" />}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex p-1 bg-gray-100 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600">
                        <button
                            onClick={() => setBqViewMode('catalog')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${bqViewMode === 'catalog'
                                ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                        >
                            <Layers size={16} />
                            Catalog
                        </button>
                        <button
                            onClick={() => setBqViewMode('review')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${bqViewMode === 'review'
                                ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                        >
                            <CheckSquare size={16} />
                            Review ({activeItems.length})
                        </button>
                    </div>

                    {/* Add Custom Item Button - Square with Logo */}
                    <button
                        onClick={() => {
                            if (activeProject && currentVersionId) {
                                addBQItem(activeProject.id, currentVersionId);
                                setBqViewMode('review');
                            }
                        }}
                        className="w-10 h-10 flex items-center justify-center bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-gray-100 transition-colors shadow-sm ml-2"
                        title="Add Custom Item"
                    >
                        <Plus size={20} />
                    </button>
                </div>
            </div>

            {/* --- View Content --- */}
            <div className="flex-1 overflow-hidden flex flex-col relative mx-0 md:mx-4">

                {/* === CATALOG VIEW === */}
                {bqViewMode === 'catalog' && (
                    <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                        {/* Catalog Toolbar REMOVED */}

                        {/* Catalog Table */}
                        <div ref={headerRef} className="overflow-hidden border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/90 backdrop-blur-sm z-10">
                            <table className="text-left border-collapse table-fixed bg-gray-50 dark:bg-slate-700/90" style={{ width: totalTableWidth + 'px', minWidth: '100%' }}>
                                <colgroup>
                                    {visibleColumns.brand && <col style={{ width: colWidths.brand }} />}
                                    {visibleColumns.axsku && <col style={{ width: colWidths.axsku }} />}
                                    {visibleColumns.mpn && <col style={{ width: colWidths.mpn }} />}
                                    {visibleColumns.group && <col style={{ width: colWidths.group }} />}
                                    {visibleColumns.category && <col style={{ width: colWidths.category }} />}
                                    {visibleColumns.item && <col style={{ width: colWidths.item }} />}
                                    {visibleColumns.description && <col style={{ width: colWidths.description }} />}
                                    {visibleColumns.uom && <col style={{ width: colWidths.uom }} />}
                                    {visibleColumns.price && <col style={{ width: colWidths.price }} />}
                                    {visibleColumns.qty && <col style={{ width: colWidths.qty }} />}
                                    {visibleColumns.forex && <col style={{ width: colWidths.forex }} />}
                                    {visibleColumns.sst && <col style={{ width: colWidths.sst }} />}
                                    {visibleColumns.opta && <col style={{ width: colWidths.opta }} />}
                                    {visibleColumns.rexScDdp && <col style={{ width: colWidths.rexScDdp }} />}
                                    {visibleColumns.rexSp && <col style={{ width: colWidths.rexSp }} />}
                                    {visibleColumns.rexRsp && <col style={{ width: colWidths.rexRsp }} />}
                                    {visibleColumns.rexTsc && <col style={{ width: colWidths.rexTsc }} />}
                                    {visibleColumns.rexTsp && <col style={{ width: colWidths.rexTsp }} />}
                                    {visibleColumns.rexTrsp && <col style={{ width: colWidths.rexTrsp }} />}
                                    {visibleColumns.rexGp && <col style={{ width: colWidths.rexGp }} />}
                                    {visibleColumns.rexGpPercent && <col style={{ width: colWidths.rexGpPercent }} />}
                                    {visibleColumns.action && <col style={{ width: colWidths.action }} />}
                                </colgroup>
                                {renderTableHeader()}
                            </table>
                        </div>

                        <div
                            ref={bodyRef}
                            onScroll={(e) => {
                                if (headerRef.current) {
                                    headerRef.current.scrollLeft = (e.target as HTMLDivElement).scrollLeft;
                                }
                            }}
                            className="flex-1 overflow-auto [&::-webkit-scrollbar-corner]:bg-transparent"
                        >
                            <table className="text-left border-collapse table-fixed" style={{ width: totalTableWidth + 'px', minWidth: '100%' }}>
                                <colgroup>
                                    {visibleColumns.brand && <col style={{ width: colWidths.brand }} />}
                                    {visibleColumns.axsku && <col style={{ width: colWidths.axsku }} />}
                                    {visibleColumns.mpn && <col style={{ width: colWidths.mpn }} />}
                                    {visibleColumns.group && <col style={{ width: colWidths.group }} />}
                                    {visibleColumns.category && <col style={{ width: colWidths.category }} />}
                                    {visibleColumns.item && <col style={{ width: colWidths.item }} />}
                                    {visibleColumns.description && <col style={{ width: colWidths.description }} />}
                                    {visibleColumns.uom && <col style={{ width: colWidths.uom }} />}
                                    {visibleColumns.price && <col style={{ width: colWidths.price }} />}
                                    {visibleColumns.qty && <col style={{ width: colWidths.qty }} />}
                                    {visibleColumns.forex && <col style={{ width: colWidths.forex }} />}
                                    {visibleColumns.sst && <col style={{ width: colWidths.sst }} />}
                                    {visibleColumns.opta && <col style={{ width: colWidths.opta }} />}
                                    {visibleColumns.rexScDdp && <col style={{ width: colWidths.rexScDdp }} />}
                                    {visibleColumns.rexSp && <col style={{ width: colWidths.rexSp }} />}
                                    {visibleColumns.rexRsp && <col style={{ width: colWidths.rexRsp }} />}
                                    {visibleColumns.rexTsc && <col style={{ width: colWidths.rexTsc }} />}
                                    {visibleColumns.rexTsp && <col style={{ width: colWidths.rexTsp }} />}
                                    {visibleColumns.rexTrsp && <col style={{ width: colWidths.rexTrsp }} />}
                                    {visibleColumns.rexGp && <col style={{ width: colWidths.rexGp }} />}
                                    {visibleColumns.rexGpPercent && <col style={{ width: colWidths.rexGpPercent }} />}
                                    {visibleColumns.action && <col style={{ width: colWidths.action }} />}
                                </colgroup>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700 text-sm">
                                    {renderTableRows(paginatedItems, 'catalog')}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        <div className="p-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/20 flex items-center justify-between gap-4 shrink-0">
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                <span className="hidden sm:inline">Rows per page:</span>
                                <span className="sm:hidden">Rows:</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                    className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded px-2 py-1 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                                >
                                    {[10, 20, 50, 100].map((num) => (
                                        <option key={num} value={num}>{num}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-4">
                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                    Page {currentPage} of {totalPages || 1}
                                </span>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition-colors">
                                        <ChevronLeft size={18} />
                                    </button>
                                    <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0} className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition-colors">
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* === REVIEW VIEW === */}
                {/* === REVIEW VIEW === */}
                {bqViewMode === 'review' && (
                    <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">

                        <div ref={headerRef} className="overflow-hidden border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/90 backdrop-blur-sm z-10">
                            <table className="text-left border-collapse table-fixed bg-gray-50 dark:bg-slate-700/90" style={{ width: totalTableWidth + 'px', minWidth: '100%' }}>
                                {renderTableHeader()}
                            </table>
                        </div>

                        <div
                            ref={bodyRef}
                            onScroll={(e) => {
                                if (headerRef.current) {
                                    headerRef.current.scrollLeft = (e.target as HTMLDivElement).scrollLeft;
                                }
                            }}
                            className="flex-1 overflow-auto [&::-webkit-scrollbar-corner]:bg-transparent"
                        >
                            <table className="text-left border-collapse table-fixed" style={{ width: totalTableWidth + 'px', minWidth: '100%' }}>
                                <colgroup>
                                    {bqViewMode === 'review' && <col style={{ width: colWidths.dragHandle }} />}
                                    {visibleColumns.brand && <col style={{ width: colWidths.brand }} />}
                                    {visibleColumns.axsku && <col style={{ width: colWidths.axsku }} />}
                                    {visibleColumns.mpn && <col style={{ width: colWidths.mpn }} />}
                                    {visibleColumns.group && <col style={{ width: colWidths.group }} />}
                                    {visibleColumns.category && <col style={{ width: colWidths.category }} />}
                                    {visibleColumns.item && <col style={{ width: colWidths.item }} />}
                                    {visibleColumns.description && <col style={{ width: colWidths.description }} />}
                                    {visibleColumns.uom && <col style={{ width: colWidths.uom }} />}
                                    {visibleColumns.price && <col style={{ width: colWidths.price }} />}
                                    {visibleColumns.qty && <col style={{ width: colWidths.qty }} />}
                                    {visibleColumns.forex && <col style={{ width: colWidths.forex }} />}
                                    {visibleColumns.sst && <col style={{ width: colWidths.sst }} />}
                                    {visibleColumns.opta && <col style={{ width: colWidths.opta }} />}
                                    {visibleColumns.rexScDdp && <col style={{ width: colWidths.rexScDdp }} />}
                                    {visibleColumns.rexSp && <col style={{ width: colWidths.rexSp }} />}
                                    {visibleColumns.rexRsp && <col style={{ width: colWidths.rexRsp }} />}
                                    {visibleColumns.rexTsc && <col style={{ width: colWidths.rexTsc }} />}
                                    {visibleColumns.rexTsp && <col style={{ width: colWidths.rexTsp }} />}
                                    {visibleColumns.rexTrsp && <col style={{ width: colWidths.rexTrsp }} />}
                                    {visibleColumns.rexGp && <col style={{ width: colWidths.rexGp }} />}
                                    {visibleColumns.rexGpPercent && <col style={{ width: colWidths.rexGpPercent }} />}
                                    {visibleColumns.isOptional && <col style={{ width: colWidths.isOptional }} />}
                                    {visibleColumns.action && <col style={{ width: colWidths.action }} />}
                                </colgroup>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700 text-sm">
                                    {renderTableRows(activeItems, 'review')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </div>

            {/* Sticky Footer for Total */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-30 transition-all duration-300"
                style={{ left: isSidebarOpen ? (window.innerWidth >= 768 ? '18rem' : '0') : '0' }}>
                <div className="max-w-screen-2xl mx-auto px-6 py-4 flex flex-col xl:flex-row items-center justify-between gap-4">
                    {/* Left Group */}
                    <div className="flex flex-wrap items-center justify-center xl:justify-start gap-4 text-sm text-slate-500 dark:text-slate-400 w-full xl:w-auto">
                        <span>Selected Items: <b className="text-slate-900 dark:text-white">{totalItemsSelected}</b></span>
                    </div>

                    {/* Center Group - Internal Metrics */}
                    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs w-full xl:w-auto bg-gray-50 dark:bg-slate-700/50 rounded-lg px-4 py-2 border border-gray-100 dark:border-slate-700">
                        <div className="flex flex-col items-center sm:block">
                            <span className="text-slate-400 uppercase font-semibold mr-1">TSC:</span>
                            <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{fmt(totalTSC)}</span>
                        </div>
                        <div className="w-px h-3 bg-gray-300 dark:bg-slate-600 hidden sm:block"></div>
                        <div className="flex flex-col items-center sm:block">
                            <span className="text-slate-400 uppercase font-semibold mr-1">TSP:</span>
                            <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{fmt(totalTSP)}</span>
                        </div>
                        <div className="w-px h-3 bg-gray-300 dark:bg-slate-600 hidden sm:block"></div>
                        <div className="flex flex-col items-center sm:block">
                            <span className="text-slate-400 uppercase font-semibold mr-1">TRSP:</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">{fmt(totalTRSP)}</span>
                        </div>
                        <div className="w-px h-3 bg-gray-300 dark:bg-slate-600 hidden sm:block"></div>
                        <div className="flex flex-col items-center sm:block">
                            <span className="text-slate-400 uppercase font-semibold mr-1">GP:</span>
                            <span className={`font-mono font-medium ${totalGP >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{fmt(totalGP)}</span>
                        </div>
                        <div className="w-px h-3 bg-gray-300 dark:bg-slate-600 hidden sm:block"></div>
                        <div className="flex flex-col items-center sm:block">
                            <span className="text-slate-400 uppercase font-semibold mr-1">GP%:</span>
                            <span className={`font-mono font-medium ${totalGPPerc >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{fmtPct(totalGPPerc)}</span>
                        </div>
                    </div>

                    {/* Right Group - Client Facing Total */}
                    <div className="flex items-center gap-4 justify-center xl:justify-end w-full xl:w-auto">
                        <div className="text-right flex items-center gap-3">
                            <p className="text-xs text-slate-500 uppercase font-semibold">Grand Total</p>
                            <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                                {appSettings.currencySymbol} {fmt(grandTotal)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {renderProjectModal()}

            {/* Rename Version Modal */}
            {isRenameVersionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm p-6 animate-fade-in">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Rename Version</h3>
                        <input
                            type="text"
                            value={newVersionName}
                            onChange={(e) => setNewVersionName(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 mb-6 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white"
                            autoFocus
                        />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setIsRenameVersionModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
                            <button onClick={saveVersionName} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Version Confirmation Modal */}
            {isDeleteVersionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm p-6 animate-fade-in text-center">
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mb-4 mx-auto">
                            <AlertTriangle size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Delete Version?</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                            Are you sure you want to delete <span className="font-semibold text-slate-900 dark:text-white">"{activeProject?.versions.find(v => v.id === currentVersionId)?.name}"</span>?
                            This action cannot be undone.
                        </p>
                        <div className="flex justify-center gap-3">
                            <button onClick={() => setIsDeleteVersionModalOpen(false)} className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 flex-1">Cancel</button>
                            <button onClick={handleDeleteVersion} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex-1 shadow-lg shadow-red-500/30">Delete</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default BQBuilderView;
