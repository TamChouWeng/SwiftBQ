
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Trash2, Search, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';
import { useAppStore } from '../store';
import { AppLanguage, MasterItem } from '../types';
import { TRANSLATIONS } from '../constants';

interface Props {
  currentLanguage: AppLanguage;
  isSidebarOpen: boolean;
}

const MasterListView: React.FC<Props> = ({ currentLanguage, isSidebarOpen }) => {
  const { masterData, updateMasterItem, addMasterItem, deleteMasterItem } = useAppStore();
  const t = TRANSLATIONS[currentLanguage];

  // --- Local State ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Column Widths State (for Resizing)
  const [colWidths, setColWidths] = useState<{ [key: string]: number }>({
    category: 180,
    type: 220,
    item: 280,
    uom: 80,
    fob: 100,
    forex: 80,
    sst: 60,
    opta: 80,
    ddp: 100,
    sp: 100,
    rsp: 120, // This is technically "Price" in BQ view but shown as RSP here
    action: 60
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newItem, setNewItem] = useState<Partial<MasterItem>>({
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
    rexRsp: 0,
    spMargin: 0.7
  });

  // --- Derived Data ---

  // 1. Get Unique Categories
  const categories = useMemo(() => {
    // Separate "All" from the list to ensure it's always at the top
    const cats = Array.from(new Set(masterData.map((item) => item.category))).sort();
    return ['All', ...cats];
  }, [masterData]);

  // 2. Get Unique Types (Descriptions) based on selected Category
  const types = useMemo(() => {
    let dataToFilter = masterData;
    if (selectedCategory !== 'All') {
        dataToFilter = masterData.filter(item => item.category === selectedCategory);
    }
    const typs = Array.from(new Set(dataToFilter.map((item) => item.description))).sort();
    return ['All', ...typs];
  }, [masterData, selectedCategory]);

  // 3. Filter Data based on Category, Type and Search
  const filteredData = useMemo(() => {
    return masterData.filter((item) => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesType = selectedType === 'All' || item.description === selectedType;
      const matchesSearch =
        item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesType && matchesSearch;
    });
  }, [masterData, selectedCategory, selectedType, searchQuery]);

  // 4. Paginate the Filtered Data
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  // --- Handlers ---

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedType, searchQuery, itemsPerPage]);

  const handleEdit = (id: string, field: keyof MasterItem, value: string | number) => {
    updateMasterItem(id, { [field]: value });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // --- Column Resizing Logic ---
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
    const newWidth = Math.max(50, startWidth + diff); // Minimum width 50px
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
        category: '',
        description: '',
        itemName: '',
        price: 0,
        uom: 'Unit',
        rexScFob: 0,
        forex: 1,
        sst: 1,
        opta: 0.97,
        rexScDdp: 0,
        rexSp: 0,
        rexRsp: 0,
        spMargin: 0.7
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
        category: newItem.category!,
        description: newItem.description || '', // Type
        itemName: newItem.itemName!,
        price: Number(newItem.rexRsp) || 0, // In this model, price = RSP
        uom: newItem.uom || 'Unit',
        rexScFob: Number(newItem.rexScFob) || 0,
        forex: Number(newItem.forex) || 1,
        sst: Number(newItem.sst) || 1,
        opta: Number(newItem.opta) || 0.97,
        rexScDdp: Number(newItem.rexScDdp) || 0,
        rexSp: Number(newItem.rexSp) || 0,
        rexRsp: Number(newItem.rexRsp) || 0,
        spMargin: Number(newItem.spMargin) || 0.7
    };
    addMasterItem(itemToAdd);
    setIsModalOpen(false);
    
    // Auto-switch filters to view the new item if practical
    if (selectedCategory !== 'All' && selectedCategory !== itemToAdd.category) {
        setSelectedCategory('All');
    }
    // Jump to last page
    setTimeout(() => {
        const newTotalPages = Math.ceil((masterData.length + 1) / itemsPerPage);
        setCurrentPage(newTotalPages);
    }, 100);
  };

  // Data lists for auto-complete (exclude 'All')
  const uniqueCategories = useMemo(() => Array.from(new Set(masterData.map(i => i.category))), [masterData]);
  const uniqueTypes = useMemo(() => Array.from(new Set(masterData.map(i => i.description))), [masterData]);

  // Dynamic Padding for Title/Toolbar
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
          <div className="relative flex-1 min-w-[200px] xl:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white"
            />
          </div>

          {/* Category Filter */}
          <div className="relative flex-1 min-w-[150px] xl:w-48">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Filter size={16} />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setSelectedType('All'); }}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white appearance-none cursor-pointer truncate"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          
          {/* Type Filter */}
          <div className="relative flex-1 min-w-[150px] xl:w-48">
             <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Filter size={16} />
            </div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white appearance-none cursor-pointer truncate"
            >
              {types.map((typ) => (
                <option key={typ} value={typ}>
                  {typ || '(No Type)'}
                </option>
              ))}
            </select>
          </div>

          {/* Add Button */}
          <button
            onClick={openModal}
            className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors shadow-lg shadow-primary-500/30 whitespace-nowrap"
          >
            <Plus size={18} />
            <span>{t.addRow}</span>
          </button>
        </div>
      </div>

      {/* Table Container - Expanded width (reduced margins) */}
      <div className="flex-1 bg-white dark:bg-slate-800 rounded-none md:rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col relative mx-0 md:mx-4">
        <div className="overflow-auto flex-1">
          <table className="text-left border-collapse table-fixed" style={{ width: Object.values(colWidths).reduce((a: number, b: number) => a + b, 0) + 'px', minWidth: '100%' }}>
            <thead className="sticky top-0 bg-gray-50 dark:bg-slate-700/90 backdrop-blur-sm z-10">
              <tr className="text-slate-600 dark:text-slate-300 text-sm border-b border-gray-100 dark:border-slate-700">
                <th className="relative p-4 font-semibold select-none" style={{ width: colWidths.category }}>{t.category}<div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400" onMouseDown={(e) => startResize(e, 'category')} /></th>
                <th className="relative p-4 font-semibold select-none" style={{ width: colWidths.type }}>{t.typeColumn}<div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400" onMouseDown={(e) => startResize(e, 'type')} /></th>
                <th className="relative p-4 font-semibold select-none" style={{ width: colWidths.item }}>{t.item}<div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400" onMouseDown={(e) => startResize(e, 'item')} /></th>
                <th className="relative p-4 font-semibold text-center select-none" style={{ width: colWidths.uom }}>{t.uom}<div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400" onMouseDown={(e) => startResize(e, 'uom')} /></th>
                
                {/* New Columns N-T */}
                <th className="relative p-4 font-semibold text-right select-none" style={{ width: colWidths.fob }}>{t.rexScFob}<div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400" onMouseDown={(e) => startResize(e, 'fob')} /></th>
                <th className="relative p-4 font-semibold text-right select-none" style={{ width: colWidths.forex }}>{t.forex}<div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400" onMouseDown={(e) => startResize(e, 'forex')} /></th>
                <th className="relative p-4 font-semibold text-right select-none" style={{ width: colWidths.sst }}>{t.sst}<div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400" onMouseDown={(e) => startResize(e, 'sst')} /></th>
                <th className="relative p-4 font-semibold text-right select-none" style={{ width: colWidths.opta }}>{t.opta}<div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400" onMouseDown={(e) => startResize(e, 'opta')} /></th>
                <th className="relative p-4 font-semibold text-right select-none" style={{ width: colWidths.ddp }}>{t.rexScDdp}<div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400" onMouseDown={(e) => startResize(e, 'ddp')} /></th>
                <th className="relative p-4 font-semibold text-right select-none" style={{ width: colWidths.sp }}>{t.rexSp}<div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400" onMouseDown={(e) => startResize(e, 'sp')} /></th>
                <th className="relative p-4 font-semibold text-right select-none" style={{ width: colWidths.rsp }}>{t.rexRsp}<div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400" onMouseDown={(e) => startResize(e, 'rsp')} /></th>

                <th className="relative p-4 font-semibold text-center select-none" style={{ width: colWidths.action }}>{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {paginatedData.length > 0 ? (
                paginatedData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="p-2"><input type="text" value={item.category} onChange={(e) => handleEdit(item.id, 'category', e.target.value)} className="w-full bg-transparent p-2 rounded border border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all text-slate-800 dark:text-slate-200 text-sm truncate" /></td>
                    <td className="p-2"><input type="text" value={item.description} onChange={(e) => handleEdit(item.id, 'description', e.target.value)} className="w-full bg-transparent p-2 rounded border border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all text-slate-800 dark:text-slate-200 text-sm truncate" /></td>
                    <td className="p-2"><input type="text" value={item.itemName} onChange={(e) => handleEdit(item.id, 'itemName', e.target.value)} className="w-full bg-transparent p-2 rounded border border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all text-slate-800 dark:text-slate-200 text-sm truncate" /></td>
                    <td className="p-2"><input type="text" value={item.uom} onChange={(e) => handleEdit(item.id, 'uom', e.target.value)} className="w-full bg-transparent p-2 rounded border border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all text-center text-slate-800 dark:text-slate-200 text-sm" /></td>
                    
                    {/* New Columns */}
                    <td className="p-2"><input type="number" value={item.rexScFob} onChange={(e) => handleEdit(item.id, 'rexScFob', parseFloat(e.target.value))} className="w-full bg-transparent p-2 rounded border border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all text-right text-slate-800 dark:text-slate-200 text-sm" /></td>
                    <td className="p-2"><input type="number" value={item.forex} onChange={(e) => handleEdit(item.id, 'forex', parseFloat(e.target.value))} className="w-full bg-transparent p-2 rounded border border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all text-right text-slate-800 dark:text-slate-200 text-sm" /></td>
                    <td className="p-2"><input type="number" value={item.sst} onChange={(e) => handleEdit(item.id, 'sst', parseFloat(e.target.value))} className="w-full bg-transparent p-2 rounded border border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all text-right text-slate-800 dark:text-slate-200 text-sm" /></td>
                    <td className="p-2"><input type="number" value={item.opta} onChange={(e) => handleEdit(item.id, 'opta', parseFloat(e.target.value))} className="w-full bg-transparent p-2 rounded border border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all text-right text-slate-800 dark:text-slate-200 text-sm" /></td>
                    
                    {/* Read-Only Calculated Fields */}
                    <td className="p-2">
                        <input type="number" value={item.rexScDdp} readOnly className="w-full bg-transparent p-2 rounded border-none text-right text-slate-500 dark:text-slate-400 text-sm font-medium cursor-not-allowed" />
                    </td>
                    <td className="p-2">
                        <input type="number" value={item.rexSp} readOnly className="w-full bg-transparent p-2 rounded border-none text-right text-slate-500 dark:text-slate-400 text-sm font-medium cursor-not-allowed" />
                    </td>
                    <td className="p-2">
                        <input type="number" value={item.rexRsp} readOnly className="w-full bg-transparent p-2 rounded border-none text-right text-slate-800 dark:text-white text-sm font-medium cursor-not-allowed" />
                    </td>

                    <td className="p-2 text-center">
                      <button onClick={() => deleteMasterItem(item.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={12} className="p-12 text-center text-slate-400 dark:text-slate-500">
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
                     {/* Category */}
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.category}</label>
                        <input list="category-options" value={newItem.category} onChange={(e) => setNewItem({...newItem, category: e.target.value})} placeholder="Select or type new category" className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white" />
                        <datalist id="category-options">{uniqueCategories.map(c => <option key={c} value={c} />)}</datalist>
                     </div>

                     {/* Type */}
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.typeColumn}</label>
                        <input list="type-options" value={newItem.description} onChange={(e) => setNewItem({...newItem, description: e.target.value})} placeholder="Select or type new type" className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white" />
                        <datalist id="type-options">{uniqueTypes.map(t => <option key={t} value={t} />)}</datalist>
                     </div>

                     {/* Item Name */}
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.item}</label>
                        <input type="text" value={newItem.itemName} onChange={(e) => setNewItem({...newItem, itemName: e.target.value})} placeholder="Item name" className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white" />
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        {/* UOM */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.uom}</label>
                            <input type="text" value={newItem.uom} onChange={(e) => setNewItem({...newItem, uom: e.target.value})} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white" />
                        </div>
                        {/* FOB */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.rexScFob}</label>
                            <input type="number" value={newItem.rexScFob} onChange={(e) => setNewItem({...newItem, rexScFob: parseFloat(e.target.value)})} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white" />
                        </div>
                     </div>
                     
                     <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.forex}</label>
                            <input type="number" value={newItem.forex} onChange={(e) => setNewItem({...newItem, forex: parseFloat(e.target.value)})} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.sst}</label>
                            <input type="number" value={newItem.sst} onChange={(e) => setNewItem({...newItem, sst: parseFloat(e.target.value)})} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.opta}</label>
                            <input type="number" value={newItem.opta} onChange={(e) => setNewItem({...newItem, opta: parseFloat(e.target.value)})} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white" />
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4 border-t border-gray-100 dark:border-slate-700 pt-4">
                        {/* Note: In add mode, we allow manual entry, but the calculation will override if logic exists. 
                            For simplicity, we let users enter manually here, but calculations happen on save/edit */}
                        <div>
                             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.rexSp}</label>
                             <input type="number" value={newItem.rexSp} onChange={(e) => setNewItem({...newItem, rexSp: parseFloat(e.target.value)})} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white" />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 font-bold text-primary-600">{t.rexRsp} (Price)</label>
                             <input type="number" value={newItem.rexRsp} onChange={(e) => setNewItem({...newItem, rexRsp: parseFloat(e.target.value)})} className="w-full bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white font-bold" />
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
