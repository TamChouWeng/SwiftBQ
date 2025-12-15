

import React, { useMemo, useState, useRef } from 'react';
import { Plus, Trash2, ArrowLeft, FolderPlus, Search, Calendar, User, Clock, FileText, Edit2, X, ArrowUpDown, LayoutTemplate, Eye, EyeOff, Layers, CheckSquare, GripVertical, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../store';
import { AppLanguage, Project, BQItem } from '../types';
import { TRANSLATIONS } from '../constants';

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
    addProject,
    updateProject,
    deleteProject,
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

  // Delete Confirmation State
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);

  // Filter State (Catalog)
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Column Visibility State
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
      category: true,
      item: true,
      description: true,
      uom: true,
      price: true,
      qty: true,
      rexTsc: true,
      rexTsp: true,
      rexTrsp: true,
      rexGp: true,
      rexGpPercent: true,
      isOptional: true,
      action: true
  });

  // --- Column Resizing State ---
  const [colWidths, setColWidths] = useState<{ [key: string]: number }>({
    dragHandle: 40,
    category: 160,
    item: 200,
    description: 250,
    uom: 80,
    price: 120,
    qty: 100,
    rexTsc: 120,
    rexTsp: 120,
    rexTrsp: 120,
    rexGp: 120,
    rexGpPercent: 80,
    isOptional: 60,
    action: 60
  });

  // Drag State for Review Table Rows
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const resizingRef = useRef<{ colKey: string; startX: number; startWidth: number } | null>(null);

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

  // Derived State
  const activeProject = useMemo(() => 
    projects.find(p => p.id === currentProjectId), 
  [projects, currentProjectId]);

  const activeItems = useMemo(() => 
    bqItems.filter(item => item.projectId === currentProjectId),
  [bqItems, currentProjectId]);

  const { grandTotal } = currentProjectId ? getProjectTotal(currentProjectId) : { grandTotal: 0 };
  const totalItemsSelected = activeItems.reduce((acc, item) => acc + (item.qty || 0), 0);

  // --- Catalog Data Processing ---
  const categories = useMemo(() => {
      const cats = Array.from(new Set(masterData.map((item) => item.category))).filter(Boolean).sort();
      return ['All', ...cats];
  }, [masterData]);

  const filteredCatalog = useMemo(() => {
      return masterData.filter(item => {
          const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
          const matchesSearch = 
              item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) || 
              item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.category.toLowerCase().includes(searchQuery.toLowerCase());
          return matchesCategory && matchesSearch;
      });
  }, [masterData, selectedCategory, searchQuery]);


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

  const handleCatalogQtyChange = (masterItemId: string, qty: string) => {
      if (!activeProject) return;
      const val = parseFloat(qty);
      const masterItem = masterData.find(m => m.id === masterItemId);
      if (masterItem) {
          syncMasterToBQ(activeProject.id, masterItem, isNaN(val) ? 0 : val);
      }
  };

  const getQtyForMasterItem = (masterId: string) => {
      const item = activeItems.find(i => i.masterId === masterId);
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
            quoteId: `Q-${new Date().getFullYear()}-${projects.length + 1001}`
        };
        addProject(project);
        setCurrentProjectId(project.id);
    }
    setIsProjectModalOpen(false);
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
    if (activeProject) {
        reorderBQItems(activeProject.id, draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
  };

  const fmt = (n: number) => n?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00';
  const fmtPct = (n: number) => (n * 100)?.toFixed(1) + '%';

  const contentPadding = !isSidebarOpen ? 'pl-4 md:pl-24 pr-4' : 'px-4';

  // Calculate dynamic table width based on visible columns
  const totalTableWidth = Object.keys(colWidths).reduce((acc, key) => {
      if (key === 'dragHandle') return acc + colWidths[key];
      if (visibleColumns[key as keyof typeof visibleColumns]) {
          return acc + colWidths[key];
      }
      return acc;
  }, 0);

  // Column Ordering Config
  const columnOrder: { key: keyof typeof visibleColumns; label: string }[] = [
      { key: 'category', label: t.category },
      { key: 'item', label: t.item },
      { key: 'description', label: t.description },
      { key: 'uom', label: t.uom },
      { key: 'price', label: t.price },
      { key: 'qty', label: t.qty },
      { key: 'rexTsc', label: t.rexTsc },
      { key: 'rexTsp', label: t.rexTsp },
      { key: 'rexTrsp', label: t.rexTrsp },
      { key: 'rexGp', label: t.rexGp },
      { key: 'rexGpPercent', label: t.rexGpPercent },
      { key: 'isOptional', label: t.isOptional },
      { key: 'action', label: t.actions },
  ];

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
                            <input type="text" value={projectForm.projectName} onChange={(e) => setProjectForm({...projectForm, projectName: e.target.value})} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white" autoFocus />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.clientName}</label>
                            <input type="text" value={projectForm.clientName} onChange={(e) => setProjectForm({...projectForm, clientName: e.target.value})} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.clientContact}</label>
                            <input type="text" value={projectForm.clientContact} onChange={(e) => setProjectForm({...projectForm, clientContact: e.target.value})} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white" />
                        </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.clientAddress}</label>
                            <textarea 
                            rows={3} 
                            value={projectForm.clientAddress} 
                            onChange={(e) => setProjectForm({...projectForm, clientAddress: e.target.value})} 
                            className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white resize-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.date}</label>
                            <input type="date" value={projectForm.date} onChange={(e) => setProjectForm({...projectForm, date: e.target.value})} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.validityPeriod}</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    value={projectForm.validityPeriod} 
                                    onChange={(e) => setProjectForm({...projectForm, validityPeriod: e.target.value})} 
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
      <thead>
        <tr className="text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800">
            {/* Drag Handle Column / Spacer */}
            <th className="p-4 w-10 sticky left-0 z-20 bg-gray-50/50 dark:bg-slate-800" style={{ width: colWidths.dragHandle }}></th>
            
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
                {t.price} (RSP)
                <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 z-10" onMouseDown={(e) => startResize(e, 'price')} />
            </th>}
            {visibleColumns.qty && <th className="relative p-4 text-center font-semibold select-none" style={{ width: colWidths.qty }}>
                {t.qty}
                <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 z-10" onMouseDown={(e) => startResize(e, 'qty')} />
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

            {visibleColumns.isOptional && <th className="relative p-4 text-center font-semibold select-none" style={{ width: colWidths.isOptional }}>
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
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProjects.map(project => (
                    <div 
                        key={project.id} 
                        onClick={() => setCurrentProjectId(project.id)}
                        className="group bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md hover:border-primary-200 dark:hover:border-primary-800 transition-all cursor-pointer relative overflow-hidden"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-primary-50 dark:bg-primary-900/20 text-primary-600 rounded-xl">
                                <FileText size={24} />
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setDeleteConfirmationId(project.id); }}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors z-10"
                            >
                                <Trash2 size={18} />
                            </button>
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

            {/* Delete Confirmation Modal */}
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
    <div className="space-y-6 animate-fade-in pb-24 relative flex flex-col h-[calc(100vh-3.5rem)]">
      
      {/* Header Bar */}
      <div className={`transition-all duration-300 flex flex-col xl:flex-row xl:items-start justify-between gap-6 shrink-0 ${contentPadding}`}>
        <div className="flex items-start gap-4 flex-1">
             <button 
                onClick={() => setCurrentProjectId(null)}
                className="mt-1 p-2 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
                title={t.backToProjects}
             >
                <ArrowLeft size={20} />
             </button>
             <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{activeProject?.projectName || 'Untitled Project'}</h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">{activeProject?.quoteId}</span>
                    <span className="hidden sm:inline">•</span>
                    <button 
                        onClick={openEditModal}
                        className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium flex items-center gap-1 transition-colors"
                    >
                        <User size={14} /> {activeProject?.clientName || 'Add Client'} <Edit2 size={12} className="ml-0.5" />
                    </button>
                </div>
             </div>
        </div>
        
        {/* Toggle View & Custom Item Actions */}
        <div className="flex gap-2 items-center w-full xl:w-auto self-end xl:self-start">
             
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
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        bqViewMode === 'catalog' 
                        ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                >
                    <Layers size={16} />
                    Catalog
                </button>
                <button 
                    onClick={() => setBqViewMode('review')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        bqViewMode === 'review' 
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
                     addBQItem(activeProject!.id);
                     setBqViewMode('review'); // Auto switch to review to edit the new custom item
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
                {/* Catalog Toolbar */}
                <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex flex-col md:flex-row gap-4">
                     <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search catalog..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white"
                        />
                     </div>
                     <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                         {categories.map(cat => (
                             <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                                    selectedCategory === cat 
                                    ? 'bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-900/30 dark:border-primary-800 dark:text-primary-300' 
                                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                                }`}
                             >
                                 {cat}
                             </button>
                         ))}
                     </div>
                </div>

                {/* Catalog Table */}
                <div className="flex-1 overflow-auto overflow-x-auto">
                    <table className="text-left border-collapse table-fixed" style={{ width: totalTableWidth, minWidth: '100%' }}>
                        {renderTableHeader()}
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700 text-sm">
                            {filteredCatalog.map(item => {
                                const currentQty = getQtyForMasterItem(item.id);
                                const isSelected = Number(currentQty) > 0;
                                // Calculations for display in Catalog (Simulating BQ logic for reference)
                                const qtyVal = Number(currentQty) || 0;
                                const rowRexTsc = qtyVal * (item.rexScDdp || 0); 
                                const rowRexTsp = qtyVal * (item.rexSp || 0);   
                                const rowRexTrsp = qtyVal * (item.rexRsp || 0);               
                                const rowRexGp = rowRexTrsp - rowRexTsc;      
                                const rowRexGpPercent = rowRexTrsp ? rowRexGp / rowRexTrsp : 0; 

                                return (
                                    <tr 
                                        key={item.id} 
                                        className="transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/30"
                                    >
                                        <td className="p-2 align-middle text-center sticky left-0 bg-white dark:bg-slate-800 z-10 text-slate-300">
                                            {/* Spacer for drag handle column alignment */}
                                        </td>

                                        {visibleColumns.category && <td className="p-2 align-top">
                                            <div className="truncate text-xs font-normal text-slate-700 dark:text-slate-200">{item.category}</div>
                                        </td>}
                                        {visibleColumns.item && <td className="p-2 align-top">
                                            <div className="font-medium text-sm text-slate-900 dark:text-white truncate">{item.itemName}</div>
                                        </td>}
                                        {visibleColumns.description && <td className="p-2 align-top">
                                            <div className="text-xs font-normal text-slate-500 dark:text-slate-400 truncate">{item.description}</div>
                                        </td>}
                                        {visibleColumns.uom && <td className="p-2 align-top text-center">
                                             <div className="text-xs font-normal text-slate-500 dark:text-slate-400">{item.uom}</div>
                                        </td>}
                                        {visibleColumns.price && <td className="p-2 align-top text-right">
                                             <div className="text-sm font-normal text-slate-900 dark:text-slate-200">{fmt(item.rexRsp)}</div>
                                        </td>}
                                        {visibleColumns.qty && <td className="p-2 align-top">
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="0"
                                                value={currentQty}
                                                onChange={(e) => handleCatalogQtyChange(item.id, e.target.value)}
                                                className={`w-full text-center rounded-lg border focus:ring-2 focus:outline-none p-1 transition-all text-sm font-bold ${
                                                    isSelected 
                                                    ? 'border-primary-500 ring-2 ring-primary-100 dark:ring-primary-900/30 bg-white dark:bg-slate-800 text-primary-600' 
                                                    : 'border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-primary-500'
                                                }`}
                                            />
                                        </td>}

                                        {/* READ ONLY CALCULATED COLUMNS */}
                                        {visibleColumns.rexTsc && <td className="p-2 align-top text-right text-slate-500 font-normal text-xs">{fmt(rowRexTsc)}</td>}
                                        {visibleColumns.rexTsp && <td className="p-2 align-top text-right text-slate-500 font-normal text-xs">{fmt(rowRexTsp)}</td>}
                                        {visibleColumns.rexTrsp && <td className="p-2 align-top text-right text-slate-900 dark:text-white font-medium text-sm">{fmt(rowRexTrsp)}</td>}
                                        {visibleColumns.rexGp && <td className="p-2 align-top text-right text-slate-500 font-normal text-xs">{fmt(rowRexGp)}</td>}
                                        {visibleColumns.rexGpPercent && <td className="p-2 align-top text-right text-slate-500 font-normal text-xs">{fmtPct(rowRexGpPercent)}</td>}

                                        {visibleColumns.isOptional && <td className="p-2 align-top text-center">
                                            <div className="w-4 h-4 border border-gray-200 rounded mx-auto bg-gray-50 dark:bg-slate-700 dark:border-slate-600"></div>
                                        </td>}

                                        {visibleColumns.action && <td className="p-2 align-top text-center">
                                            {/* No action for Master List Item row */}
                                        </td>}
                                    </tr>
                                );
                            })}
                            {filteredCatalog.length === 0 && (
                                <tr>
                                    <td colSpan={20} className="p-12 text-center text-slate-400 italic">
                                        No items found in catalog.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* === REVIEW VIEW === */}
        {bqViewMode === 'review' && (
            <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="flex-1 overflow-auto overflow-x-auto">
                    <table className="text-left border-collapse table-fixed" style={{ width: totalTableWidth, minWidth: '100%' }}>
                    {renderTableHeader()}
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700 text-sm">
                        {activeItems.map((item, index) => {
                        const qty = item.qty || 0;
                        const rowRexTsc = qty * (item.rexScDdp || 0); 
                        const rowRexTsp = qty * (item.rexSp || 0);   
                        const rowRexTrsp = item.total;               
                        const rowRexGp = rowRexTrsp - rowRexTsc;      
                        const rowRexGpPercent = rowRexTrsp ? rowRexGp / rowRexTrsp : 0; 
                        
                        const isDragging = draggedIndex === index;

                        return (
                            <tr 
                                key={item.id} 
                                className={`transition-colors group ${isDragging ? 'opacity-50 bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-700/30'}`}
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, index)}
                            >
                            <td className="p-2 align-middle text-center sticky left-0 bg-white dark:bg-slate-800 z-10 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <GripVertical size={16} />
                            </td>

                            {visibleColumns.category && <td className="p-2 align-top">
                                <input
                                type="text"
                                value={item.category}
                                onChange={(e) => updateBQItem(item.id, 'category', e.target.value)}
                                className="w-full bg-transparent border-b border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:outline-none dark:text-slate-200 font-normal text-xs"
                                placeholder="Category"
                                />
                            </td>}
                            {visibleColumns.item && <td className="p-2 align-top">
                                <input
                                type="text"
                                value={item.itemName}
                                onChange={(e) => updateBQItem(item.id, 'itemName', e.target.value)}
                                className="w-full bg-transparent border-b border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:outline-none dark:text-white font-medium text-sm"
                                placeholder="Item Name"
                                />
                            </td>}
                            {visibleColumns.description && <td className="p-2 align-top">
                                <textarea
                                value={item.description}
                                onChange={(e) => updateBQItem(item.id, 'description', e.target.value)}
                                rows={1}
                                className="w-full bg-transparent border-b border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:outline-none dark:text-slate-400 font-normal text-xs resize-none"
                                placeholder="Description"
                                />
                            </td>}
                            {visibleColumns.uom && <td className="p-2 align-top">
                                <input
                                type="text"
                                value={item.uom}
                                onChange={(e) => updateBQItem(item.id, 'uom', e.target.value)}
                                className="w-full text-center bg-transparent border-b border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:outline-none dark:text-slate-400 font-normal text-xs"
                                />
                            </td>}
                            {visibleColumns.price && <td className="p-2 align-top">
                                <input
                                type="number"
                                value={item.price}
                                onChange={(e) => updateBQItem(item.id, 'price', e.target.value)}
                                className="w-full text-right bg-transparent border-b border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:outline-none dark:text-slate-200 font-normal text-sm"
                                />
                            </td>}
                            {visibleColumns.qty && <td className="p-2 align-top">
                                <input
                                type="number"
                                value={item.qty}
                                onChange={(e) => updateBQItem(item.id, 'qty', e.target.value)}
                                className="w-full text-center bg-gray-50 dark:bg-slate-700/50 rounded border border-gray-200 dark:border-slate-600 focus:border-primary-500 focus:outline-none dark:text-white p-1 font-bold text-sm"
                                />
                            </td>}

                            {/* READ ONLY COLUMNS */}
                            {visibleColumns.rexTsc && <td className="p-2 align-top text-right text-slate-500 font-normal text-xs">{fmt(rowRexTsc)}</td>}
                            {visibleColumns.rexTsp && <td className="p-2 align-top text-right text-slate-500 font-normal text-xs">{fmt(rowRexTsp)}</td>}
                            {visibleColumns.rexTrsp && <td className="p-2 align-top text-right text-slate-900 dark:text-white font-medium text-sm">{fmt(rowRexTrsp)}</td>}
                            {visibleColumns.rexGp && <td className="p-2 align-top text-right text-slate-500 font-normal text-xs">{fmt(rowRexGp)}</td>}
                            {visibleColumns.rexGpPercent && <td className="p-2 align-top text-right text-slate-500 font-normal text-xs">{fmtPct(rowRexGpPercent)}</td>}

                            {visibleColumns.isOptional && <td className="p-2 align-top text-center">
                                <input 
                                    type="checkbox" 
                                    checked={!!item.isOptional} 
                                    onChange={(e) => updateBQItem(item.id, 'isOptional', e.target.checked)}
                                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 cursor-pointer"
                                />
                            </td>}

                            {visibleColumns.action && <td className="p-2 align-top text-center">
                                <button
                                onClick={() => removeBQItem(item.id)}
                                className="text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                <Trash2 size={16} />
                                </button>
                            </td>}
                            </tr>
                        );
                        })}
                        {activeItems.length === 0 && (
                            <tr>
                                <td colSpan={20} className="p-12 text-center text-slate-400">
                                    No items selected. Go to Catalog to add items.
                                </td>
                            </tr>
                        )}
                    </tbody>
                    </table>
                </div>
            </div>
        )}

      </div>
      
      {/* Sticky Footer for Total */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-30 transition-all duration-300" 
           style={{ left: isSidebarOpen ? (window.innerWidth >= 768 ? '18rem' : '0') : '0' }}>
          <div className="max-w-screen-2xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400">
                  <span>Selected Items: <b className="text-slate-900 dark:text-white">{totalItemsSelected}</b></span>
                  <span className="hidden sm:inline">|</span>
                  <span className="hidden sm:inline">Project ID: {activeProject?.quoteId}</span>
              </div>
              <div className="flex items-center gap-4">
                  <div className="text-right">
                      <p className="text-xs text-slate-500 uppercase font-semibold">Grand Total</p>
                      <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                          {appSettings.currencySymbol} {fmt(grandTotal)}
                      </p>
                  </div>
              </div>
          </div>
      </div>
      
      {renderProjectModal()}
    </div>
  );
};

export default BQBuilderView;
