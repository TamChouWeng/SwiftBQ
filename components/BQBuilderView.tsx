
import React, { useMemo, useState, useRef } from 'react';
import { Plus, Trash2, ArrowLeft, FolderPlus, Search, Calendar, User, Clock, FileText, Phone, Edit2, X } from 'lucide-react';
import { useAppStore } from '../store';
import { AppLanguage, Project, BQItem } from '../types';
import { TRANSLATIONS } from '../constants';

interface Props {
  currentLanguage: AppLanguage;
  isSidebarOpen: boolean;
}

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
    removeBQItem,
    updateBQItem,
    getProjectTotal,
    appSettings,
  } = useAppStore();
  
  const t = TRANSLATIONS[currentLanguage];
  const [searchQuery, setSearchQuery] = useState('');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectForm, setProjectForm] = useState<Partial<Project>>({
    projectName: '',
    clientName: '',
    clientContact: '',
    clientAddress: '',
    date: new Date().toISOString().split('T')[0],
    validityPeriod: '30',
  });

  // --- Column Resizing State ---
  const [colWidths, setColWidths] = useState<{ [key: string]: number }>({
    category: 160,
    item: 200,
    description: 250,
    uom: 80,
    price: 120,
    qty: 80,
    rexTsc: 120,
    rexTsp: 120,
    rexTrsp: 120,
    rexGp: 120,
    rexGpPercent: 80,
    action: 60
  });

  const resizingRef = useRef<{ colKey: string; startX: number; startWidth: number } | null>(null);

  const startResize = (e: React.MouseEvent, colKey: string) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent sorting or other events if any
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
    const newWidth = Math.max(50, startWidth + diff); // Min width 50
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

  const { subtotal, tax, grandTotal } = currentProjectId ? getProjectTotal(currentProjectId) : { subtotal: 0, tax: 0, grandTotal: 0 };

  const filteredProjects = useMemo(() => {
    return projects.filter(p => 
        p.projectName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.clientName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [projects, searchQuery]);

  // Extract unique categories from Master Data
  const categories = useMemo(() => {
    return Array.from(new Set(masterData.map((item) => item.category)));
  }, [masterData]);

  // --- Handlers ---

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
        // Update existing
        updateProject(projectForm.id, {
            projectName: projectForm.projectName,
            clientName: projectForm.clientName,
            clientContact: projectForm.clientContact,
            clientAddress: projectForm.clientAddress,
            date: projectForm.date,
            validityPeriod: projectForm.validityPeriod,
        });
    } else {
        // Create new
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

  const handleCategoryChange = (rowId: string, newCategory: string) => {
    updateBQItem(rowId, 'category', newCategory);
    // Reset item selection when category changes
    updateBQItem(rowId, 'masterId', '');
    updateBQItem(rowId, 'itemName', '');
    updateBQItem(rowId, 'price', 0);
    updateBQItem(rowId, 'description', '');
    updateBQItem(rowId, 'uom', '');
    updateBQItem(rowId, 'rexScDdp', 0);
    updateBQItem(rowId, 'rexSp', 0);
    updateBQItem(rowId, 'rexRsp', 0);
  };

  const handleItemSelect = (rowId: string, masterId: string) => {
    const masterItem = masterData.find((m) => m.id === masterId);
    if (masterItem) {
      updateBQItem(rowId, 'masterId', masterId);
      updateBQItem(rowId, 'itemName', masterItem.itemName);
      updateBQItem(rowId, 'description', masterItem.description);
      updateBQItem(rowId, 'price', masterItem.price); // REX RSP
      updateBQItem(rowId, 'uom', masterItem.uom);
      // Snapshot unit costs
      updateBQItem(rowId, 'rexScDdp', masterItem.rexScDdp);
      updateBQItem(rowId, 'rexSp', masterItem.rexSp);
      updateBQItem(rowId, 'rexRsp', masterItem.rexRsp);
    }
  };

  // Helper to safely format numbers
  const fmt = (n: number) => n?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00';
  const fmtPct = (n: number) => (n * 100)?.toFixed(1) + '%';

  // Calculate totals for new columns
  const columnTotals = useMemo(() => {
     let tRexTsc = 0;
     let tRexTsp = 0;
     let tRexTrsp = 0;
     let tRexGp = 0;
     
     activeItems.forEach(item => {
        const qty = item.qty || 0;
        const tsc = qty * (item.rexScDdp || 0);
        const trsp = qty * (item.price || 0); // Price is RSP
        const tsp = qty * (item.rexSp || 0);

        tRexTsc += tsc;
        tRexTsp += tsp;
        tRexTrsp += trsp;
        tRexGp += (trsp - tsc);
     });

     const tRexGpPercent = tRexTrsp ? tRexGp / tRexTrsp : 0;
     return { tRexTsc, tRexTsp, tRexTrsp, tRexGp, tRexGpPercent };

  }, [activeItems]);

  const contentPadding = !isSidebarOpen ? 'pl-4 md:pl-24 pr-4' : 'px-4';

  const totalTableWidth = Object.values(colWidths).reduce((a, b) => a + b, 0);

  // --- Views ---

  if (!currentProjectId) {
    // === PROJECT LIST VIEW ===
    return (
        <div className={`space-y-6 animate-fade-in pb-20 transition-all duration-300 ${contentPadding}`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{t.projects}</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Manage your quotations and projects</p>
                </div>
                <button 
                    onClick={openCreateModal}
                    className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-primary-500/30 transition-colors"
                >
                    <FolderPlus size={20} />
                    {t.addProject}
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-md">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                 <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.searchProjects}
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white"
                 />
            </div>

            {/* Project Grid/List */}
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
                                onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }}
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

                {/* Empty State */}
                {filteredProjects.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center text-slate-400 dark:text-slate-500">
                        <FolderPlus size={48} className="mb-4 opacity-50" />
                        <p>No projects found. Create one to get started.</p>
                    </div>
                )}
            </div>
            
            {/* Modal is rendered outside the conditional return in the shared logic below */}
            {isProjectModalOpen && (
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
            )}
        </div>
    );
  }

  // === PROJECT BUILDER VIEW ===
  return (
    <div className="space-y-6 animate-fade-in pb-24 relative">
      
      {/* Header Bar */}
      <div className={`transition-all duration-300 flex flex-col xl:flex-row xl:items-start justify-between gap-6 ${contentPadding}`}>
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
                    <span className="flex items-center gap-1"><Calendar size={14}/> {activeProject?.date}</span>
                </div>
             </div>
        </div>
        
        {/* Project Meta Card (Read-Only with Edit Button) */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 w-full xl:w-96 flex flex-col gap-3 relative group">
             <div className="flex justify-between items-start">
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <User size={16} className="text-primary-500"/>
                    Client Details
                </h3>
                <button 
                    onClick={openEditModal}
                    className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-xs font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                >
                    <Edit2 size={12} />
                    {t.editDetails}
                </button>
             </div>
             
             <div className="text-sm">
                 <div className="flex flex-wrap items-center gap-3">
                    <p className="text-slate-900 dark:text-white font-medium text-lg">{activeProject?.clientName || 'N/A'}</p>
                    {activeProject?.clientContact && (
                        <p className="text-slate-500 dark:text-slate-400 flex items-center gap-1 text-sm">
                            <Phone size={14} className="text-slate-400" /> {activeProject.clientContact}
                        </p>
                    )}
                 </div>
             </div>
        </div>
      </div>

      {/* Builder Table */}
      <div className="bg-white dark:bg-slate-800 rounded-none md:rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden overflow-x-auto mx-0 md:mx-4">
        <table className="text-left border-collapse table-fixed" style={{ width: totalTableWidth, minWidth: '100%' }}>
          <thead>
            <tr className="text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <th className="relative p-4 font-semibold select-none" style={{ width: colWidths.category }}>
                {t.category}
                <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 z-10" onMouseDown={(e) => startResize(e, 'category')} />
              </th>
              <th className="relative p-4 font-semibold select-none" style={{ width: colWidths.item }}>
                {t.item}
                <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 z-10" onMouseDown={(e) => startResize(e, 'item')} />
              </th>
              <th className="relative p-4 font-semibold select-none" style={{ width: colWidths.description }}>
                {t.description}
                <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 z-10" onMouseDown={(e) => startResize(e, 'description')} />
              </th>
              <th className="relative p-4 text-center font-semibold select-none" style={{ width: colWidths.uom }}>
                {t.uom}
                <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 z-10" onMouseDown={(e) => startResize(e, 'uom')} />
              </th>
              <th className="relative p-4 text-right font-semibold select-none" style={{ width: colWidths.price }}>
                {t.price} (RSP)
                <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 z-10" onMouseDown={(e) => startResize(e, 'price')} />
              </th>
              <th className="relative p-4 text-center font-semibold select-none" style={{ width: colWidths.qty }}>
                {t.qty}
                <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 z-10" onMouseDown={(e) => startResize(e, 'qty')} />
              </th>
              
              {/* Calculated Columns U-Y */}
              <th className="relative p-4 text-right font-semibold select-none" style={{ width: colWidths.rexTsc }}>
                {t.rexTsc}
                <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 z-10" onMouseDown={(e) => startResize(e, 'rexTsc')} />
              </th>
              <th className="relative p-4 text-right font-semibold select-none" style={{ width: colWidths.rexTsp }}>
                {t.rexTsp}
                <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 z-10" onMouseDown={(e) => startResize(e, 'rexTsp')} />
              </th>
              <th className="relative p-4 text-right font-semibold select-none" style={{ width: colWidths.rexTrsp }}>
                {t.rexTrsp}
                <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 z-10" onMouseDown={(e) => startResize(e, 'rexTrsp')} />
              </th>
              <th className="relative p-4 text-right font-semibold select-none" style={{ width: colWidths.rexGp }}>
                {t.rexGp}
                <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 z-10" onMouseDown={(e) => startResize(e, 'rexGp')} />
              </th>
              <th className="relative p-4 text-right font-semibold select-none" style={{ width: colWidths.rexGpPercent }}>
                {t.rexGpPercent}
                <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 z-10" onMouseDown={(e) => startResize(e, 'rexGpPercent')} />
              </th>
              
              <th className="relative p-4 select-none" style={{ width: colWidths.action }}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700 text-sm">
            {activeItems.map((item) => {
              const availableItems = masterData.filter((m) => m.category === item.category);
              
              // Row Calculations
              const qty = item.qty || 0;
              const rowRexTsc = qty * (item.rexScDdp || 0); // U
              const rowRexTsp = qty * (item.rexSp || 0);    // V
              const rowRexTrsp = item.total;                // W (Price * Qty)
              const rowRexGp = rowRexTrsp - rowRexTsc;      // X
              const rowRexGpPercent = rowRexTrsp ? rowRexGp / rowRexTrsp : 0; // Y

              return (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors group">
                  <td className="p-2 align-top">
                    <select
                      value={item.category}
                      onChange={(e) => handleCategoryChange(item.id, e.target.value)}
                      className="w-full p-2 rounded border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs focus:border-primary-500 focus:outline-none dark:text-white font-normal"
                    >
                      <option value="">Select...</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 align-top">
                    <select
                      value={item.masterId || ''}
                      onChange={(e) => handleItemSelect(item.id, e.target.value)}
                      disabled={!item.category}
                      className="w-full p-2 rounded border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs focus:border-primary-500 focus:outline-none disabled:opacity-50 dark:text-white font-normal"
                    >
                      <option value="">Select Item...</option>
                      {availableItems.map((m) => (
                        <option key={m.id} value={m.id}>{m.itemName}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 align-top">
                    <textarea
                      value={item.description}
                      onChange={(e) => updateBQItem(item.id, 'description', e.target.value)}
                      rows={1}
                      className="w-full p-2 rounded border border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 bg-transparent text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none resize-none dark:text-slate-200 font-normal"
                    />
                  </td>
                  <td className="p-2 align-top">
                     <input
                      type="text"
                      value={item.uom}
                      onChange={(e) => updateBQItem(item.id, 'uom', e.target.value)}
                      className="w-full text-center bg-transparent border-b border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:outline-none dark:text-slate-200 font-normal"
                    />
                  </td>
                  <td className="p-2 align-top">
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => updateBQItem(item.id, 'price', e.target.value)}
                      className="w-full text-right bg-transparent border-b border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:outline-none dark:text-slate-200 font-normal"
                    />
                  </td>
                  <td className="p-2 align-top">
                    <input
                      type="number"
                      value={item.qty}
                      onChange={(e) => updateBQItem(item.id, 'qty', e.target.value)}
                      className="w-full text-center bg-gray-50 dark:bg-slate-700/50 rounded border border-gray-200 dark:border-slate-600 focus:border-primary-500 focus:outline-none dark:text-white p-1 font-normal"
                    />
                  </td>

                  {/* READ ONLY COLUMNS - Plain style */}
                  <td className="p-2 align-top text-right text-slate-500 font-normal">
                     {fmt(rowRexTsc)}
                  </td>
                  <td className="p-2 align-top text-right text-slate-500 font-normal">
                     {fmt(rowRexTsp)}
                  </td>
                  <td className="p-2 align-top text-right text-slate-900 dark:text-white font-normal">
                     {fmt(rowRexTrsp)}
                  </td>
                  <td className="p-2 align-top text-right text-slate-500 font-normal">
                     {fmt(rowRexGp)}
                  </td>
                  <td className="p-2 align-top text-right text-slate-500 font-normal">
                     {fmtPct(rowRexGpPercent)}
                  </td>

                  <td className="p-2 align-top text-center">
                    <button
                      onClick={() => removeBQItem(item.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {/* TABLE FOOTER */}
          <tfoot>
             <tr className="bg-gray-100 dark:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs border-t-2 border-gray-200 dark:border-slate-600">
                <td colSpan={6} className="p-4 text-right">TOTALS</td>
                <td className="p-4 text-right">{fmt(columnTotals.tRexTsc)}</td>
                <td className="p-4 text-right">{fmt(columnTotals.tRexTsp)}</td>
                <td className="p-4 text-right">{fmt(columnTotals.tRexTrsp)}</td>
                <td className="p-4 text-right">{fmt(columnTotals.tRexGp)}</td>
                <td className="p-4 text-right">{fmtPct(columnTotals.tRexGpPercent)}</td>
                <td></td>
             </tr>
          </tfoot>
        </table>
        
        <div className="p-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
           <button
             onClick={() => addBQItem(currentProjectId)}
             className="flex items-center gap-2 text-primary-600 dark:text-primary-400 font-medium hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
           >
             <Plus size={18} />
             {t.addRow}
           </button>
        </div>
      </div>
      
      {/* Disclaimer on values */}
      <div className="text-right text-xs text-slate-400 dark:text-slate-500 px-4">
          * Calculated values (REX TSC, TSP, GP) are based on current master data.
      </div>
      
      {/* Reused Modal for Create/Edit */}
      {isProjectModalOpen && (
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
      )}
    </div>
  );
};

export default BQBuilderView;
