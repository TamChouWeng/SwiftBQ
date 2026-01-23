
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Trash2, Search, ChevronLeft, ChevronRight, Filter, X, Eye, LayoutTemplate, Check, EyeOff, Save } from 'lucide-react';
import { useAppStore, calculateDerivedFields } from '../store';
import { AppLanguage, MasterItem, PriceField } from '../types';
import { TRANSLATIONS } from '../constants';
import SmartPriceCell from './SmartPriceCell';
import { DDP_STRATEGIES, SP_STRATEGIES, RSP_STRATEGIES } from '../pricingStrategies';

interface Props {
  currentLanguage: AppLanguage;
  isSidebarOpen: boolean;
}

const MasterListView: React.FC<Props> = ({ currentLanguage, isSidebarOpen }) => {
  const { masterData, addMasterItem, deleteMasterItem, masterListEdits, setMasterListEdit, commitMasterListEdits } = useAppStore();
  const t = TRANSLATIONS[currentLanguage];

  // --- Local State ---
  const [currentPage, setCurrentPage] = useState(1);

  // Persist itemsPerPage
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem('swiftbq_itemsPerPage');
    return saved ? parseInt(saved, 10) : 10;
  });

  useEffect(() => {
    localStorage.setItem('swiftbq_itemsPerPage', itemsPerPage.toString());
  }, [itemsPerPage]);

  const [searchQuery, setSearchQuery] = useState('');

  // Dropdown States
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);

  // Advanced Filter State (Multi-select)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  // Column Visibility State
  const [visibleColumns, setVisibleColumns] = useState({
    brand: false,
    axsku: false,
    mpn: false,
    group: false,
    category: true,
    description: true, // Type
    itemName: true,
    uom: true,
    rexScFob: true,
    forex: true,
    sst: true,
    opta: true,
    rexScDdp: true,
    rexSp: true,
    rexRsp: true,
    action: true
  });

  // Column Widths State (for Resizing)
  const [colWidths, setColWidths] = useState<{ [key: string]: number }>({
    brand: 50,
    axsku: 60,
    mpn: 60,
    group: 50,
    category: 100,
    description: 120,
    itemName: 160,
    uom: 50,
    rexScFob: 70,
    forex: 50,
    sst: 45,
    opta: 50,
    rexScDdp: 110,
    rexSp: 110,
    rexRsp: 110,
    action: 50
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newItem, setNewItem] = useState<Partial<MasterItem>>({
    brand: '',
    axsku: '',
    mpn: '',
    group: '',
    category: '',
    description: '', // This maps to "Type" in the UI
    itemName: '',
    price: 0,
    uom: 'Unit',
    rexScFob: 0,
    forex: 1,
    sst: 1,
    opta: 0.97,
    rexScDdp: 0,
    rexSp: 0,
    rexRsp: 0
  });

  // Calculate fields dynamically when modal inputs change
  useEffect(() => {
    if (isModalOpen) {
      const derived = calculateDerivedFields(newItem);
      if (
        derived.rexScDdp !== newItem.rexScDdp ||
        derived.rexSp !== newItem.rexSp ||
        derived.rexRsp !== newItem.rexRsp
      ) {
        setNewItem(prev => ({ ...prev, ...derived }));
      }
    }
  }, [newItem.rexScFob, newItem.forex, newItem.sst, newItem.opta, isModalOpen]);

  // --- Derived Data ---

  // 1. Get Unique Categories
  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(masterData.map((item) => item.category))).filter(Boolean).sort();
  }, [masterData]);

  // 2. Get Unique Types based on selected Categories (Cascade filter logic, usually helps user)
  const uniqueItems = useMemo(() => {
    let dataToFilter = masterData;
    if (selectedCategories.length > 0) {
      dataToFilter = masterData.filter(item => selectedCategories.includes(item.category));
    }
    return Array.from(new Set(dataToFilter.map((item) => item.itemName))).filter(Boolean).sort();
  }, [masterData, selectedCategories]);

  // 3. Filter Data
  const filteredData = useMemo(() => {
    return masterData.filter((item) => {
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(item.category);
      const matchesType = selectedTypes.length === 0 || selectedTypes.includes(item.itemName);
      const matchesSearch =
        item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.brand && item.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.axsku && item.axsku.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCategory && matchesType && matchesSearch;
    });
  }, [masterData, selectedCategories, selectedTypes, searchQuery]);

  // 4. Paginate
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const hasUnsavedMasterChanges = Object.keys(masterListEdits).length > 0;

  // --- Handlers ---

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategories, selectedTypes, searchQuery, itemsPerPage]);

  const handleEdit = (id: string, field: keyof MasterItem, value: any) => {
    setMasterListEdit(id, field, value);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const toggleColumn = (key: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleCategorySelection = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const toggleTypeSelection = (typ: string) => {
    setSelectedTypes(prev =>
      prev.includes(typ) ? prev.filter(t => t !== typ) : [...prev, typ]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedTypes([]);
  };

  // --- Column Resizing ---
  const resizingRef = useRef<{ colKey: string; startX: number; startWidth: number } | null>(null);

  const startResize = (e: React.MouseEvent, colKey: string) => {
    e.preventDefault();
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

  // --- Modal Logic ---
  const openModal = () => {
    setNewItem({
      brand: '', axsku: '', mpn: '', group: '',
      category: '', description: '', itemName: '',
      price: 0, uom: 'Unit', rexScFob: 0, forex: 1, sst: 1, opta: 0.97,
      rexScDdp: 0, rexSp: 0, rexRsp: 0 // spMargin removed
    });
    setIsModalOpen(true);
  };

  const saveNewItem = () => {
    if (!newItem.category || !newItem.itemName) {
      alert("Category and Item Name are required.");
      return;
    }
    const itemToAdd: MasterItem = {
      id: Date.now().toString(),
      brand: newItem.brand || '',
      axsku: newItem.axsku || '',
      mpn: newItem.mpn || '',
      group: newItem.group || '',
      category: newItem.category!,
      description: newItem.description || '',
      itemName: newItem.itemName!,
      price: newItem.rexRsp?.value || 0,
      uom: newItem.uom || 'Unit',
      rexScFob: Number(newItem.rexScFob) || 0,
      forex: Number(newItem.forex) || 1,
      sst: Number(newItem.sst) || 1,
      opta: Number(newItem.opta) || 0.97,
      rexScDdp: newItem.rexScDdp || { value: 0, strategy: 'MANUAL', manualOverride: 0 },
      rexSp: newItem.rexSp || { value: 0, strategy: 'MANUAL', manualOverride: 0 },
      rexRsp: newItem.rexRsp || { value: 0, strategy: 'MANUAL', manualOverride: 0 },
      // spMargin removed
    };
    addMasterItem(itemToAdd);
    setIsModalOpen(false);

    // Jump to last page
    setTimeout(() => {
      const newTotalPages = Math.ceil((masterData.length + 1) / itemsPerPage);
      setCurrentPage(newTotalPages);
    }, 100);
  };

  // Data lists for auto-complete in modal
  const allUniqueCategories = useMemo(() => Array.from(new Set(masterData.map(i => i.category))), [masterData]);
  const alluniqueItems = useMemo(() => Array.from(new Set(masterData.map(i => i.description))), [masterData]);

  // Table Width Calculation
  const tableWidth = useMemo(() => {
    let width = 0;
    // Loop through all visibility keys that map to columns
    if (visibleColumns.brand) width += colWidths.brand;
    if (visibleColumns.axsku) width += colWidths.axsku;
    if (visibleColumns.mpn) width += colWidths.mpn;
    if (visibleColumns.group) width += colWidths.group;
    if (visibleColumns.category) width += colWidths.category;
    if (visibleColumns.description) width += colWidths.description;
    if (visibleColumns.itemName) width += colWidths.itemName;
    if (visibleColumns.uom) width += colWidths.uom;
    if (visibleColumns.rexScFob) width += colWidths.rexScFob;
    if (visibleColumns.forex) width += colWidths.forex;
    if (visibleColumns.sst) width += colWidths.sst;
    if (visibleColumns.opta) width += colWidths.opta;
    if (visibleColumns.rexScDdp) width += colWidths.rexScDdp;
    if (visibleColumns.rexSp) width += colWidths.rexSp;
    if (visibleColumns.rexRsp) width += colWidths.rexRsp;
    if (visibleColumns.action) width += colWidths.action;
    return width;
  }, [visibleColumns, colWidths]);

  // Column Ordering Config (Unified List)
  const columnOrder: { key: keyof typeof visibleColumns; label: string }[] = [
    { key: 'brand', label: t.brand },
    { key: 'axsku', label: t.axsku },
    { key: 'mpn', label: t.mpn },
    { key: 'group', label: t.group },
    { key: 'category', label: t.category },
    { key: 'itemName', label: t.item },
    { key: 'description', label: t.description },
    { key: 'uom', label: t.uom },
    { key: 'rexScFob', label: t.rexScFob },
    { key: 'forex', label: t.forex },
    { key: 'sst', label: t.sst },
    { key: 'opta', label: t.opta },
    { key: 'rexScDdp', label: t.rexScDdp },
    { key: 'rexSp', label: t.rexSp },
    { key: 'rexRsp', label: t.rexRsp },
    { key: 'action', label: t.actions },
  ];

  const headerPadding = !isSidebarOpen ? 'pl-4 md:pl-24 pr-4' : 'px-4';

  return (
    <div className="space-y-6 animate-fade-in flex flex-col h-[calc(100vh-3.5rem)] relative">
      {/* Header & Toolbar */}
      <div className={`flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 shrink-0 transition-all duration-300 ${headerPadding}`}>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{t.masterList}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {filteredData.length} items found
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] xl:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white"
            />
          </div>

          {/* Advanced Filter Button (Square) */}
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-colors ${(selectedCategories.length > 0 || selectedTypes.length > 0)
                ? 'bg-primary-50 border-primary-500 text-primary-600 dark:bg-primary-900/20 dark:border-primary-400 dark:text-primary-400'
                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              title="Filter Category & Type"
            >
              <Filter size={20} />
            </button>

            {/* Filter Popover - Side by Side View, Auto Width */}
            {showFilterDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowFilterDropdown(false)} />
                <div className="absolute right-0 top-full mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-600 z-20 flex flex-col max-h-[500px] max-w-[90vw] w-auto">
                  <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50 shrink-0">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white whitespace-nowrap">Filter Data</span>
                    {(selectedCategories.length > 0 || selectedTypes.length > 0) && (
                      <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-600 font-medium ml-4 whitespace-nowrap">
                        Clear All
                      </button>
                    )}
                  </div>

                  <div className="flex flex-row overflow-hidden min-h-0">
                    {/* Categories Column */}
                    <div className="flex flex-col border-r border-gray-100 dark:border-slate-700 min-w-[200px] w-auto">
                      <div className="p-2 bg-gray-50/50 dark:bg-slate-800/50 font-medium text-xs text-slate-500 uppercase tracking-wider sticky top-0 whitespace-nowrap">Category</div>
                      <div className="overflow-y-auto p-2 space-y-1">
                        {uniqueCategories.map(cat => (
                          <label key={cat} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded cursor-pointer group whitespace-nowrap">
                            <div className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedCategories.includes(cat) ? 'bg-primary-500 border-primary-500 text-white' : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 group-hover:border-primary-400'}`}>
                              {selectedCategories.includes(cat) && <Check size={10} strokeWidth={3} />}
                            </div>
                            <span className={`text-sm ${selectedCategories.includes(cat) ? 'text-primary-600 dark:text-primary-400 font-medium' : 'text-slate-700 dark:text-slate-300'}`}>{cat}</span>
                            <input type="checkbox" className="hidden" checked={selectedCategories.includes(cat)} onChange={() => toggleCategorySelection(cat)} />
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Item Column */}
                    <div className="flex flex-col min-w-[200px] w-auto">
                      <div className="p-2 bg-gray-50/50 dark:bg-slate-800/50 font-medium text-xs text-slate-500 uppercase tracking-wider sticky top-0 whitespace-nowrap">Item</div>
                      <div className="overflow-y-auto p-2 space-y-1">
                        {uniqueItems.length > 0 ? uniqueItems.map(typ => (
                          <label key={typ} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded cursor-pointer group whitespace-nowrap">
                            <div className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedTypes.includes(typ) ? 'bg-primary-500 border-primary-500 text-white' : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 group-hover:border-primary-400'}`}>
                              {selectedTypes.includes(typ) && <Check size={10} strokeWidth={3} />}
                            </div>
                            <span className={`text-sm ${selectedTypes.includes(typ) ? 'text-primary-600 dark:text-primary-400 font-medium' : 'text-slate-700 dark:text-slate-300'}`}>{typ}</span>
                            <input type="checkbox" className="hidden" checked={selectedTypes.includes(typ)} onChange={() => toggleTypeSelection(typ)} />
                          </label>
                        )) : (
                          <div className="p-4 text-center text-xs text-slate-400 italic whitespace-nowrap">No item available</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Save Button (Transactional) */}
          <button
            onClick={commitMasterListEdits}
            disabled={!hasUnsavedMasterChanges}
            className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-colors ${hasUnsavedMasterChanges
              ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/50 shadow-sm'
              : 'bg-white dark:bg-slate-800 text-gray-300 dark:text-gray-600 border-gray-200 dark:border-slate-700 cursor-not-allowed'
              }`}
            title="Save Changes"
          >
            <Save size={20} />
          </button>

          {/* Column Toggle Button (Square) */}
          <div className="relative">
            <button
              onClick={() => setShowColumnDropdown(!showColumnDropdown)}
              className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
              title={t.columns}
            >
              <LayoutTemplate size={20} />
            </button>

            {/* Dropdown Content - Single list, current sequence */}
            {showColumnDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowColumnDropdown(false)} />
                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-600 z-20 p-2 grid grid-cols-1 gap-1 max-h-[400px] overflow-y-auto">
                  {columnOrder.map((col) => (
                    <button
                      key={col.key}
                      onClick={() => toggleColumn(col.key)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${visibleColumns[col.key] ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400' : 'text-slate-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                    >
                      <span className="truncate mr-2 font-medium">{col.label}</span>
                      {visibleColumns[col.key] ? <Eye size={16} /> : <EyeOff size={16} className="opacity-50" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Add Button */}
          <button
            onClick={openModal}
            className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors shadow-lg shadow-primary-500/30 whitespace-nowrap h-10"
          >
            <Plus size={18} />
            <span>{t.addRow}</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 bg-white dark:bg-slate-800 rounded-none md:rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col relative mx-0 md:mx-4">
        <div className="overflow-auto flex-1">
          <table className="text-left border-collapse table-fixed" style={{ width: tableWidth + 'px', minWidth: '100%' }}>
            <thead className="sticky top-0 bg-gray-50 dark:bg-slate-700/90 backdrop-blur-sm z-10">
              <tr className="text-slate-600 dark:text-slate-300 text-sm border-b border-gray-100 dark:border-slate-700">
                {visibleColumns.brand && <th className="relative p-4 font-semibold select-none" style={{ width: colWidths.brand }}>{t.brand}<div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400" onMouseDown={(e) => startResize(e, 'brand')} /></th>}
                {visibleColumns.axsku && <th className="relative p-4 font-semibold select-none" style={{ width: colWidths.axsku }}>{t.axsku}<div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400" onMouseDown={(e) => startResize(e, 'axsku')} /></th>}
                {visibleColumns.mpn && <th className="relative p-4 font-semibold select-none" style={{ width: colWidths.mpn }}>{t.mpn}<div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400" onMouseDown={(e) => startResize(e, 'mpn')} /></th>}
                {visibleColumns.group && <th className="relative p-4 font-semibold select-none" style={{ width: colWidths.group }}>{t.group}<div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400" onMouseDown={(e) => startResize(e, 'group')} /></th>}

                {visibleColumns.category && <th className="relative p-4 font-semibold select-none" style={{ width: colWidths.category }}>{t.category}<div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400" onMouseDown={(e) => startResize(e, 'category')} /></th>}
                {visibleColumns.itemName && <th className="relative p-4 font-semibold select-none" style={{ width: colWidths.itemName }}>{t.item}<div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400" onMouseDown={(e) => startResize(e, 'itemName')} /></th>}
                {visibleColumns.description && <th className="relative p-4 font-semibold select-none" style={{ width: colWidths.description }}>{t.description}<div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400" onMouseDown={(e) => startResize(e, 'description')} /></th>}
                {visibleColumns.uom && <th className="relative p-4 font-semibold text-center select-none" style={{ width: colWidths.uom }}>{t.uom}<div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400" onMouseDown={(e) => startResize(e, 'uom')} /></th>}

                {visibleColumns.rexScFob && <th className="relative p-4 font-semibold text-right select-none" style={{ width: colWidths.rexScFob }}>{t.rexScFob}<div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400" onMouseDown={(e) => startResize(e, 'rexScFob')} /></th>}
                {visibleColumns.forex && <th className="relative p-4 font-semibold text-right select-none" style={{ width: colWidths.forex }}>{t.forex}<div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400" onMouseDown={(e) => startResize(e, 'forex')} /></th>}
                {visibleColumns.sst && <th className="relative p-4 font-semibold text-right select-none" style={{ width: colWidths.sst }}>{t.sst}<div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400" onMouseDown={(e) => startResize(e, 'sst')} /></th>}
                {visibleColumns.opta && <th className="relative p-4 font-semibold text-right select-none" style={{ width: colWidths.opta }}>{t.opta}<div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400" onMouseDown={(e) => startResize(e, 'opta')} /></th>}
                {visibleColumns.rexScDdp && <th className="relative p-4 font-semibold text-right select-none" style={{ width: colWidths.rexScDdp }}>{t.rexScDdp}<div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400" onMouseDown={(e) => startResize(e, 'rexScDdp')} /></th>}
                {visibleColumns.rexSp && <th className="relative p-4 font-semibold text-right select-none" style={{ width: colWidths.rexSp }}>{t.rexSp}<div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400" onMouseDown={(e) => startResize(e, 'rexSp')} /></th>}
                {visibleColumns.rexRsp && <th className="relative p-4 font-semibold text-right select-none" style={{ width: colWidths.rexRsp }}>{t.rexRsp}<div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400" onMouseDown={(e) => startResize(e, 'rexRsp')} /></th>}

                {visibleColumns.action && <th className="relative p-4 font-semibold text-center select-none" style={{ width: colWidths.action }}>{t.actions}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {paginatedData.length > 0 ? (
                paginatedData.map((item) => {
                  // Determine display values based on pending edits
                  const pending = masterListEdits[item.id] || {};
                  const display = {
                    ...item,
                    ...pending
                  };

                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                      {visibleColumns.brand && <td className="p-1"><input type="text" value={display.brand} onChange={(e) => handleEdit(item.id, 'brand', e.target.value)} className="w-full bg-transparent p-2 rounded border border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all text-slate-800 dark:text-slate-200 text-sm truncate" /></td>}
                      {visibleColumns.axsku && <td className="p-1"><input type="text" value={display.axsku} onChange={(e) => handleEdit(item.id, 'axsku', e.target.value)} className="w-full bg-transparent p-2 rounded border border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all text-slate-800 dark:text-slate-200 text-sm truncate" /></td>}
                      {visibleColumns.mpn && <td className="p-1"><input type="text" value={display.mpn} onChange={(e) => handleEdit(item.id, 'mpn', e.target.value)} className="w-full bg-transparent p-2 rounded border border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all text-slate-800 dark:text-slate-200 text-sm truncate" /></td>}
                      {visibleColumns.group && <td className="p-1"><input type="text" value={display.group} onChange={(e) => handleEdit(item.id, 'group', e.target.value)} className="w-full bg-transparent p-2 rounded border border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all text-slate-800 dark:text-slate-200 text-sm truncate" /></td>}

                      {visibleColumns.category && <td className="p-1"><input type="text" value={display.category} onChange={(e) => handleEdit(item.id, 'category', e.target.value)} className="w-full bg-transparent p-2 rounded border border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all text-slate-800 dark:text-slate-200 text-sm truncate" /></td>}
                      {visibleColumns.itemName && <td className="p-1"><input type="text" value={display.itemName} onChange={(e) => handleEdit(item.id, 'itemName', e.target.value)} className="w-full bg-transparent p-2 rounded border border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all text-slate-800 dark:text-slate-200 text-sm truncate font-bold" /></td>}
                      {visibleColumns.description && <td className="p-1"><input type="text" value={display.description} onChange={(e) => handleEdit(item.id, 'description', e.target.value)} className="w-full bg-transparent p-2 rounded border border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all text-slate-800 dark:text-slate-200 text-sm truncate" /></td>}
                      {visibleColumns.uom && <td className="p-1"><input type="text" value={display.uom} onChange={(e) => handleEdit(item.id, 'uom', e.target.value)} className="w-full bg-transparent p-2 rounded border border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all text-center text-slate-800 dark:text-slate-200 text-sm" /></td>}

                      {visibleColumns.rexScFob && <td className="p-1"><input type="number" value={display.rexScFob} onChange={(e) => handleEdit(item.id, 'rexScFob', e.target.value)} className="w-full bg-transparent p-2 rounded border border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all text-right text-slate-800 dark:text-slate-200 text-sm" /></td>}
                      {visibleColumns.forex && <td className="p-1"><input type="number" value={display.forex} onChange={(e) => handleEdit(item.id, 'forex', e.target.value)} className="w-full bg-transparent p-2 rounded border border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all text-right text-slate-800 dark:text-slate-200 text-sm" /></td>}
                      {visibleColumns.sst && <td className="p-1"><input type="number" value={display.sst} onChange={(e) => handleEdit(item.id, 'sst', e.target.value)} className="w-full bg-transparent p-2 rounded border border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all text-right text-slate-800 dark:text-slate-200 text-sm" /></td>}
                      {visibleColumns.opta && <td className="p-1"><input type="number" value={display.opta} onChange={(e) => handleEdit(item.id, 'opta', e.target.value)} className="w-full bg-transparent p-2 rounded border border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all text-right text-slate-800 dark:text-slate-200 text-sm" /></td>}


                      {visibleColumns.rexScDdp && <td className="p-1">
                        <SmartPriceCell
                          field={display.rexScDdp as PriceField}
                          strategies={DDP_STRATEGIES}
                          onChange={(updates) => handleEdit(item.id, 'rexScDdp', { ...display.rexScDdp, ...updates })}
                        />
                      </td>}
                      {visibleColumns.rexSp && <td className="p-1">
                        <SmartPriceCell
                          field={display.rexSp as PriceField}
                          strategies={SP_STRATEGIES}
                          onChange={(updates) => handleEdit(item.id, 'rexSp', { ...display.rexSp, ...updates })}
                        />
                      </td>}
                      {visibleColumns.rexRsp && <td className="p-1">
                        <SmartPriceCell
                          field={display.rexRsp as PriceField}
                          strategies={RSP_STRATEGIES}
                          onChange={(updates) => handleEdit(item.id, 'rexRsp', { ...display.rexRsp, ...updates })}
                        />
                      </td>}

                      {visibleColumns.action && <td className="p-1 text-center">
                        <button onClick={() => deleteMasterItem(item.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={16} /></button>
                      </td>}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={20} className="p-12 text-center text-slate-400 dark:text-slate-500">
                    No items found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
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
              <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition-colors"><ChevronLeft size={18} /></button>
              <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0} className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition-colors"><ChevronRight size={18} /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Item Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in border border-gray-100 dark:border-slate-700 h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700 shrink-0">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t.addRow}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">

              <div className="grid grid-cols-2 gap-4">
                {/* Col A */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.brand}</label>
                  <input type="text" value={newItem.brand} onChange={(e) => setNewItem({ ...newItem, brand: e.target.value })} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white" />
                </div>
                {/* Ax SKU */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.axsku}</label>
                  <input type="text" value={newItem.axsku} onChange={(e) => setNewItem({ ...newItem, axsku: e.target.value })} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* Col C */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.mpn}</label>
                  <input type="text" value={newItem.mpn} onChange={(e) => setNewItem({ ...newItem, mpn: e.target.value })} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white" />
                </div>
                {/* Group */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.group}</label>
                  <input type="text" value={newItem.group} onChange={(e) => setNewItem({ ...newItem, group: e.target.value })} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white" />
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-slate-700 pt-2"></div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.category}</label>
                <input list="category-options" value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })} placeholder="Select or type new category" className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white" />
                <datalist id="category-options">{allUniqueCategories.map(c => <option key={c} value={c} />)}</datalist>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.typeColumn}</label>
                <input list="type-options" value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} placeholder="Select or type new type" className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white" />
                <datalist id="type-options">{alluniqueItems.map(t => <option key={t} value={t} />)}</datalist>
              </div>

              {/* Item Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.item}</label>
                <input type="text" value={newItem.itemName} onChange={(e) => setNewItem({ ...newItem, itemName: e.target.value })} placeholder="Item name" className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* UOM */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.uom}</label>
                  <input type="text" value={newItem.uom} onChange={(e) => setNewItem({ ...newItem, uom: e.target.value })} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white" />
                </div>
                {/* FOB */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.rexScFob}</label>
                  <input type="number" value={newItem.rexScFob} onChange={(e) => setNewItem({ ...newItem, rexScFob: parseFloat(e.target.value) })} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.forex}</label>
                  <input type="number" value={newItem.forex} onChange={(e) => setNewItem({ ...newItem, forex: parseFloat(e.target.value) })} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.sst}</label>
                  <input type="number" value={newItem.sst} onChange={(e) => setNewItem({ ...newItem, sst: parseFloat(e.target.value) })} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.opta}</label>
                  <input type="number" value={newItem.opta} onChange={(e) => setNewItem({ ...newItem, opta: parseFloat(e.target.value) })} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-gray-100 dark:border-slate-700 pt-4">
                {/* Read Only Calculated Fields */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{t.rexScDdp}</label>
                  <input type="number" value={newItem.rexScDdp?.value ?? ''} readOnly className="w-full bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-500 dark:text-slate-400 cursor-not-allowed focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{t.rexSp}</label>
                  <input type="number" value={newItem.rexSp?.value ?? ''} readOnly className="w-full bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-500 dark:text-slate-400 cursor-not-allowed focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 font-bold">{t.rexRsp}</label>
                  <input type="number" value={newItem.rexRsp?.value ?? ''} readOnly className="w-full bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-300 font-bold cursor-not-allowed focus:outline-none" />
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 dark:bg-slate-700/30 flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors">Cancel</button>
              <button onClick={saveNewItem} className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg shadow-lg shadow-primary-500/30 transition-colors font-medium">Save Item</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterListView;
