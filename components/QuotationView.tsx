
import React, { useMemo, useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Download, FileText, AlertCircle, ArrowLeft, Search, Calendar, Clock, User, ChevronDown, Save, RotateCcw, Check } from 'lucide-react';
import { useAppStore } from '../store';
import { AppLanguage, BQItem } from '../types';
import { TRANSLATIONS } from '../constants';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface Props {
  currentLanguage: AppLanguage;
  isSidebarOpen: boolean;
}

// Pagination Constants
const ITEMS_PER_PAGE_DEFAULT = 14;
const FOOTER_BUFFER_ITEMS = 6; // If last page has more than (Max - this) items, push footer to new page

type RenderRow = 
 | { type: 'item'; data: BQItem }
 | { type: 'category'; label: string }
 | { type: 'section_header'; label: string };

// Helper Component for Auto-Resizing Textarea
const AutoResizeTextarea = ({ 
    value, 
    onChange, 
    className, 
    style,
    placeholder
}: { 
    value: string, 
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void, 
    className?: string, 
    style?: React.CSSProperties,
    placeholder?: string
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useLayoutEffect(() => {
        if (textareaRef.current) {
            // Reset height to auto to correctly calculate scrollHeight for shrinking content
            textareaRef.current.style.height = 'auto';
            const scrollHeight = textareaRef.current.scrollHeight;
            // Add a small buffer (e.g., 2px) to prevent clipping of descenders
            textareaRef.current.style.height = (scrollHeight + 2) + 'px';
        }
    }, [value]);

    return (
        <textarea
            ref={textareaRef}
            value={value}
            onChange={onChange}
            className={className}
            style={{ ...style, resize: 'none', overflow: 'hidden' }}
            rows={1}
            placeholder={placeholder}
        />
    );
};

const QuotationView: React.FC<Props> = ({ currentLanguage, isSidebarOpen }) => {
  const { 
      bqItems, 
      currentProjectId, 
      setCurrentProjectId, 
      projects, 
      updateProject, 
      getProjectTotal, 
      appSettings,
      quotationEdits,
      setQuotationEdit,
      commitQuotationEdits,
      discardQuotationEdits,
      hasUnsavedChanges
  } = useAppStore();
  const t = TRANSLATIONS[currentLanguage];
  const [searchQuery, setSearchQuery] = useState('');
  
  // Local state for selecting version in Quotation View
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  // Get current project details
  const activeProject = useMemo(() => 
    projects.find(p => p.id === currentProjectId), 
  [projects, currentProjectId]);

  // Set default version when project loads
  useEffect(() => {
    if (activeProject && !selectedVersionId && activeProject.versions.length > 0) {
        setSelectedVersionId(activeProject.versions[0].id);
    }
  }, [activeProject, selectedVersionId]);

  const activeItems = useMemo(() => 
    bqItems.filter(item => item.projectId === currentProjectId && item.versionId === selectedVersionId),
  [bqItems, currentProjectId, selectedVersionId]);

  // Calculate totals including discount
  const { subtotal, grandTotal, discount } = currentProjectId && selectedVersionId 
      ? getProjectTotal(currentProjectId, selectedVersionId) 
      : { subtotal: 0, grandTotal: 0, discount: 0 };

  // Separate Standard and Optional Items
  const standardItems = useMemo(() => activeItems.filter(item => !item.isOptional), [activeItems]);
  const optionalItems = useMemo(() => activeItems.filter(item => item.isOptional), [activeItems]);

  // Group items by category (Standard)
  const groupedItems = standardItems.reduce<Record<string, BQItem[]>>((acc, item) => {
    const cat = item.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const filteredProjects = useMemo(() => {
    return projects.filter(p => 
        p.projectName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.clientName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [projects, searchQuery]);

  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (activeProject) {
          const val = parseFloat(e.target.value);
          updateProject(activeProject.id, { discount: isNaN(val) ? 0 : val });
      }
  };

  // --- Pagination Logic ---
  const pages = useMemo(() => {
    // 1. Flatten all data into render rows
    const allRows: RenderRow[] = [];
    
    // Standard Items
    Object.entries(groupedItems).forEach(([cat, items]) => {
        allRows.push({ type: 'category', label: cat });
        items.forEach(item => allRows.push({ type: 'item', data: item }));
    });

    // Optional Items
    if (optionalItems.length > 0) {
        allRows.push({ type: 'section_header', label: 'OPTIONAL ITEMS' });
        optionalItems.forEach(item => allRows.push({ type: 'item', data: item }));
    }

    // 2. Chunk into pages
    const _pages: RenderRow[][] = [];
    let currentBatch: RenderRow[] = [];
    
    // Heuristic: Page 1 has header, so fewer items. Subsequent pages have more space?
    const LIMIT = ITEMS_PER_PAGE_DEFAULT;

    allRows.forEach((row, index) => {
        currentBatch.push(row);
        if (currentBatch.length >= LIMIT) {
            _pages.push(currentBatch);
            currentBatch = [];
        }
    });

    if (currentBatch.length > 0) {
        _pages.push(currentBatch);
    }

    // 3. Check footer space on last page
    // If the last page is very full, add an empty page for the footer
    if (_pages.length > 0) {
        const lastPage = _pages[_pages.length - 1];
        if (lastPage.length > (LIMIT - FOOTER_BUFFER_ITEMS)) {
            _pages.push([]); // New page for footer
        }
    } else {
        // If no items, still show one page
        _pages.push([]);
    }

    return _pages;
  }, [groupedItems, optionalItems]);


  const handleExportPDF = async () => {
    if (hasUnsavedChanges) {
        const confirmSave = window.confirm("You have unsaved changes. Save before exporting?");
        if (confirmSave) commitQuotationEdits();
    }

    const pageElements = document.querySelectorAll('.quotation-page');
    if (pageElements.length === 0) return;

    // Show loading state if needed...
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = 210;
    const pdfHeight = 297;

    try {
        for (let i = 0; i < pageElements.length; i++) {
            const pageEl = pageElements[i] as HTMLElement;
            
            // Create a clone to clean up for capture
            const clone = pageEl.cloneNode(true) as HTMLElement;
            clone.style.transform = 'none'; // Remove any zoom transforms
            clone.style.margin = '0';
            clone.style.boxShadow = 'none';
            // Ensure fixed dimensions for capture
            clone.style.width = '210mm'; 
            clone.style.height = '297mm'; // Force A4 height context
            clone.style.position = 'fixed';
            clone.style.left = '-9999px';
            clone.style.top = '0';
            
            // Fix Textareas in clone
            const originalTextareas = pageEl.querySelectorAll('textarea');
            const cloneTextareas = clone.querySelectorAll('textarea');
            cloneTextareas.forEach((cta, idx) => {
                const div = document.createElement('div');
                div.className = cta.className;
                div.style.whiteSpace = 'pre-wrap';
                div.style.wordBreak = 'break-word';
                // IMPORTANT: Force auto height for clone to ensure text isn't clipped in PDF
                div.style.height = 'auto';
                div.style.minHeight = 'auto';
                div.textContent = originalTextareas[idx].value;
                cta.parentNode?.replaceChild(div, cta);
            });

            // --- STYLING FIXES FOR PDF ---
            // Html2Canvas often clips text in tables with border-collapse.
            // We inject explicit spacing to correct this in the export.
            
            const tableHeaders = clone.querySelectorAll('th');
            tableHeaders.forEach(th => {
                th.style.paddingTop = '10px';
                th.style.paddingBottom = '10px';
                th.style.verticalAlign = 'middle';
                // Prevent background color from clipping border
                th.style.backgroundClip = 'padding-box';
            });

            const tableCells = clone.querySelectorAll('td');
            tableCells.forEach(td => {
                 // Ensure padding is sufficient for text
                 td.style.paddingTop = '8px';
                 td.style.paddingBottom = '8px';
                 td.style.verticalAlign = 'top';
            });

            document.body.appendChild(clone);

            const canvas = await html2canvas(clone, {
                scale: 4, // High Quality Scale
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: 794, // Approx px width of A4 at 96dpi
                windowHeight: 1123
            });

            document.body.removeChild(clone);

            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            
            if (i > 0) pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        }

        pdf.save(`Quotation-${activeProject?.quoteId || 'draft'}.pdf`);
    } catch (err) {
        console.error("PDF Export Failed", err);
        alert("Failed to generate PDF. Please try again.");
    }
  };

  const contentPadding = !isSidebarOpen ? 'pl-4 md:pl-24 pr-4' : 'px-4';

  // Helper for currency format
  const fmt = (n: number) => n?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00';

  // Global row counter for pagination
  let globalRowCounter = 1;

  if (!currentProjectId) {
      return (
        <div className={`space-y-6 animate-fade-in pb-20 transition-all duration-300 ${contentPadding}`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{t.quotationView}</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Select a project to view and export quotation</p>
                </div>
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

            {/* Project List */}
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
                        <AlertCircle size={48} className="mb-4 opacity-50" />
                        <p>No projects found. Go to BQ Builder to create one.</p>
                    </div>
                )}
            </div>
        </div>
      );
  }

  // === DETAIL VIEW ===
  return (
    <div className="animate-fade-in space-y-6 pb-12 flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Title Header */}
      <div className={`transition-all duration-300 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 shrink-0 ${contentPadding}`}>
        <div className="flex flex-col gap-4">
            <div className="flex items-start gap-4">
                <button 
                    onClick={() => {
                         if (hasUnsavedChanges) {
                             if(window.confirm("You have unsaved changes. Discard them?")) {
                                 discardQuotationEdits();
                                 setCurrentProjectId(null);
                                 setSelectedVersionId(null);
                             }
                         } else {
                             setCurrentProjectId(null);
                             setSelectedVersionId(null);
                         }
                    }}
                    className="mt-1 p-2 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
                    title="Back to Projects"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{t.quotationView}</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Project: {activeProject?.projectName}</p>
                </div>
            </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 w-full xl:w-auto">
            {/* Discount Input */}
             <div className="flex flex-col items-end sm:items-start">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase">Special Discount</label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">{appSettings.currencySymbol}</span>
                    <input 
                        type="number" 
                        value={activeProject?.discount || ''} 
                        onChange={handleDiscountChange}
                        placeholder="0.00"
                        className="w-32 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none font-medium text-right"
                    />
                </div>
            </div>

            {/* Version Selection */}
            <div className="flex flex-col items-end sm:items-start">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase">Select Version to Export</label>
                <div className="relative inline-block">
                     <select
                        value={selectedVersionId || ''}
                        onChange={(e) => {
                             if (hasUnsavedChanges) {
                                 if(!window.confirm("Changing version will discard unsaved changes. Continue?")) return;
                                 discardQuotationEdits();
                             }
                             setSelectedVersionId(e.target.value);
                        }}
                        className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm rounded-lg pl-3 pr-8 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none appearance-none font-medium min-w-[160px]"
                     >
                         {activeProject?.versions.map(v => (
                             <option key={v.id} value={v.id}>{v.name}</option>
                         ))}
                     </select>
                     <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
            </div>

            <div className="flex gap-2 mt-4 sm:mt-0">
                {/* Undo Button */}
                <button
                    onClick={discardQuotationEdits}
                    disabled={!hasUnsavedChanges}
                    className={`w-10 h-10 flex items-center justify-center rounded-lg shadow-sm transition-colors border ${
                        hasUnsavedChanges 
                        ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-gray-200 dark:border-slate-600 hover:bg-gray-50'
                        : 'bg-gray-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 border-transparent cursor-not-allowed'
                    }`}
                    title="Undo Changes"
                >
                    <RotateCcw size={20} />
                </button>

                {/* Save Button */}
                <button
                    onClick={commitQuotationEdits}
                    disabled={!hasUnsavedChanges}
                    className={`w-10 h-10 flex items-center justify-center rounded-lg shadow-sm transition-colors border ${
                         hasUnsavedChanges
                         ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-100'
                         : 'bg-gray-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 border-transparent cursor-not-allowed'
                    }`}
                    title="Save Changes"
                >
                    <Save size={20} />
                </button>

                {/* Export Button */}
                <button
                onClick={handleExportPDF}
                className="w-10 h-10 flex items-center justify-center bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg shadow-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
                title={t.exportPDF}
                >
                <Download size={20} />
                </button>
            </div>
        </div>
      </div>

      {activeItems.length === 0 && pages.length <= 1 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in flex-1">
            <div className="bg-gray-100 dark:bg-slate-800 p-6 rounded-full mb-4">
                <FileText size={48} className="text-slate-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300">{t.noData}</h2>
            <p className="text-sm text-slate-500 mt-2">Ensure the selected version has items.</p>
          </div>
      ) : (
          /* Pagination Wrapper */
          <div className="flex-1 overflow-auto bg-gray-200 dark:bg-slate-950 p-8 flex flex-col items-center gap-8">
              {pages.map((pageRows, pageIndex) => {
                  const isFirstPage = pageIndex === 0;
                  const isLastPage = pageIndex === pages.length - 1;
                  
                  return (
                      <div
                        key={pageIndex}
                        className="quotation-page bg-white text-black p-[10mm] w-[210mm] min-h-[297mm] shadow-2xl relative font-sans flex flex-col shrink-0"
                        style={{ fontSize: '10pt', lineHeight: '1.3' }}
                      >
                        {/* 1. Header Section (First Page Only) */}
                        {isFirstPage && (
                            <>
                                <div className="flex justify-between items-end mb-4">
                                {/* Left: Company Details */}
                                <div className="w-[60%] pb-2">
                                    {appSettings.companyLogo && (
                                        <img 
                                            src={appSettings.companyLogo} 
                                            alt="Company Logo" 
                                            className="h-16 w-auto mb-3 object-contain"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none'; // Hide if broken
                                            }}
                                        />
                                    )}
                                    <h2 className="font-bold text-xl text-red-600 mb-2">{appSettings.companyName}</h2>
                                    <p className="whitespace-pre-line text-xs leading-normal">{appSettings.companyAddress}</p>
                                </div>
                                
                                {/* Right: QUOTE Title */}
                                <div className="w-[40%] text-right pb-2">
                                    <h1 className="text-3xl font-bold tracking-widest uppercase mb-4">QUOTE</h1>
                                </div>
                                </div>

                                {/* 2. Bill To / Reference Section */}
                                <div className="flex justify-between gap-8 mb-6">
                                    {/* Bill To */}
                                    <div className="w-[55%]">
                                        <div className="mb-3">
                                            <span className="font-bold text-xs uppercase border-b border-black pb-1 inline-block">BILL / SHIP TO:</span>
                                        </div>
                                        <table className="w-full text-xs text-black border-collapse">
                                            <tbody>
                                                <tr>
                                                    <td className="w-20 font-semibold align-top py-0.5">Attn to:</td>
                                                    <td className="align-top py-0.5 uppercase">{activeProject?.clientContact || 'N/A'}</td>
                                                </tr>
                                                <tr>
                                                    <td className="w-20 font-semibold align-top py-0.5">Client:</td>
                                                    <td className="align-top py-0.5 uppercase">{activeProject?.clientName}</td>
                                                </tr>
                                                <tr>
                                                    <td className="w-20 font-semibold align-top py-0.5">Address:</td>
                                                    <td className="align-top py-0.5 whitespace-pre-wrap">{activeProject?.clientAddress}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Quote Reference */}
                                    <div className="w-[40%]">
                                        <div className="mb-3">
                                            <span className="font-bold text-xs uppercase border-b border-black pb-1 inline-block">QUOTE REFERENCE:</span>
                                        </div>
                                        <table className="w-full text-xs text-black border-collapse">
                                            <tbody>
                                                <tr>
                                                    <td className="w-24 font-semibold align-top py-0.5">Quote #:</td>
                                                    <td className="align-top py-0.5">{activeProject?.quoteId}</td>
                                                </tr>
                                                <tr>
                                                    <td className="w-24 font-semibold align-top py-0.5">Date:</td>
                                                    <td className="align-top py-0.5">{activeProject?.date}</td>
                                                </tr>
                                                <tr>
                                                    <td className="w-24 font-semibold align-top py-0.5">Valid for:</td>
                                                    <td className="align-top py-0.5">{activeProject?.validityPeriod} Days</td>
                                                </tr>
                                                <tr>
                                                    <td className="w-24 font-semibold align-top py-0.5">Issued by:</td>
                                                    <td className="align-top py-0.5">{appSettings.profileName}</td>
                                                </tr>
                                                <tr>
                                                    <td className="w-24 font-semibold align-top py-0.5">Contact:</td>
                                                    <td className="align-top py-0.5">{appSettings.profileContact}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}
                        
                        {/* 3. Items Table */}
                        <div className="mb-6">
                            <table className="w-full border-collapse border border-black text-xs text-black">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-black py-3 px-2 w-10 text-center font-bold">NO</th>
                                        <th className="border border-black py-3 px-2 text-left font-bold">DESCRIPTION</th>
                                        <th className="border border-black py-3 px-2 w-28 text-right font-bold">Unit Price ({appSettings.currencySymbol})</th>
                                        <th className="border border-black py-3 px-2 w-12 text-center font-bold">QTY</th>
                                        <th className="border border-black py-3 px-2 w-16 text-center font-bold">UOM</th>
                                        <th className="border border-black py-3 px-2 w-28 text-right font-bold">Total Price ({appSettings.currencySymbol})</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageRows.map((row, idx) => {
                                        if (row.type === 'category') {
                                            return (
                                                <tr key={`cat-${idx}`}>
                                                    <td className="border border-black p-1 bg-gray-200"></td>
                                                    <td className="border border-black p-1 font-bold bg-gray-50 uppercase pl-2" colSpan={5}>
                                                        {row.label}
                                                    </td>
                                                </tr>
                                            );
                                        } else if (row.type === 'section_header') {
                                             return (
                                                <tr key={`header-${idx}`}>
                                                    <td className="border border-black p-1 bg-gray-200"></td>
                                                    <td className="border border-black p-1 font-bold bg-gray-100 text-center uppercase" colSpan={5}>
                                                        {row.label}
                                                    </td>
                                                </tr>
                                            );
                                        } else if (row.type === 'item') {
                                            const item = row.data;
                                            const displayDescription = quotationEdits[item.id] ?? item.quotationDescription ?? item.description;
                                            return (
                                                <tr key={item.id}>
                                                    <td className="border border-black p-2 text-center align-top">{globalRowCounter++}</td>
                                                    <td className="border border-black p-2 align-top">
                                                        <div className="font-bold text-xs mb-1">{item.itemName}</div>
                                                        <AutoResizeTextarea
                                                            value={displayDescription}
                                                            onChange={(e) => setQuotationEdit(item.id, e.target.value)}
                                                            className="w-full bg-transparent border-none p-0 text-[10px] text-black whitespace-pre-wrap leading-tight focus:ring-0"
                                                        />
                                                    </td>
                                                    <td className="border border-black p-2 text-right align-top">{fmt(item.price)}</td>
                                                    <td className="border border-black p-2 text-center align-top">{item.qty}</td>
                                                    <td className="border border-black p-2 text-center align-top">{item.uom}</td>
                                                    <td className="border border-black p-2 text-right align-top font-semibold">{fmt(item.total)}</td>
                                                </tr>
                                            );
                                        }
                                        return null;
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* 4. Footer Section (Last Page Only) */}
                        {isLastPage && (
                            <div className="mt-4">
                                {/* Totals */}
                                <div className="flex justify-end mb-6 text-black">
                                    <div className="w-[40%]">
                                        <div className="flex justify-between border-b border-black py-2">
                                            <span className="font-semibold text-xs">Subtotal ({appSettings.currencySymbol}) :</span>
                                            <span className="font-medium">{fmt(subtotal)}</span>
                                        </div>
                                        
                                        {discount > 0 && (
                                            <div className="flex justify-between border-b border-black py-2 text-green-600 font-bold">
                                                <span className="text-xs uppercase">Special Discount ({appSettings.currencySymbol}) :</span>
                                                <span className="">({fmt(discount)})</span>
                                            </div>
                                        )}

                                        <div className="flex justify-between border-b-2 border-black py-2 text-sm font-bold mt-1">
                                            <span>TOTAL ({appSettings.currencySymbol}):</span>
                                            <span>{fmt(grandTotal)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Terms & Signature */}
                                <div className="text-black">
                                    <div className="text-xs mb-6">
                                        <div className="mb-3">
                                            <span className="font-bold border-b border-black pb-1 inline-block">TERMS & CONDITIONS:</span>
                                        </div>
                                        <ul className="list-disc list-outside ml-4 space-y-1 text-black">
                                            <li>Payment : 50% deposit, balance before delivery.</li>
                                            <li>Delivery : 10 - 14 weeks upon order confirmation and deposit paid.</li>
                                        </ul>
                                        <p className="mt-3 italic text-[10px] text-black">
                                            (1) No cancellation, suspension or variation of an accepted customer's order shall be valid unless agreed in writing by our company.
                                        </p>
                                    </div>

                                    <div className="flex justify-between items-end text-xs italic">
                                        <div className="w-[50%]"><p>Thank you for your business,</p></div>
                                        <div className="w-[40%] text-center font-bold text-[10px] not-italic"><p>Sign and return to confirm your order.</p></div>
                                    </div>

                                    <div className="h-16"></div>

                                    <div className="flex justify-between items-start text-xs">
                                        <div className="w-[50%]">
                                            <div className="border-t border-black pt-1">
                                                <div className="text-[10px] space-y-1">
                                                    <p className="font-bold text-xs">{appSettings.companyName}</p>
                                                    <p className="text-blue-600 underline">xxx@rexharge.net</p>
                                                    <div className="mt-2">
                                                        <p className="italic mb-1">All cheques should be crossed and made to :</p>
                                                        <p className="font-bold">{appSettings.companyName}</p>
                                                        <p>Bank Name: <span className="font-semibold">{appSettings.bankName}</span></p>
                                                        <p>Bank Account: <span className="font-semibold">{appSettings.bankAccount}</span></p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="w-[40%]">
                                            <div className="border-t border-black pt-1">
                                                <div className="flex justify-between text-[10px] text-black font-bold mb-4 items-start">
                                                    <div className="flex flex-col"><span>Company Stamp</span><span className="font-normal italic text-[9px] text-gray-500">(if any)</span></div>
                                                    <div className="flex flex-col text-right"><span>Authorized</span><span>Signature</span></div>
                                                </div>
                                                <div className="space-y-3 font-bold text-black text-[10px]">
                                                    <div className="flex items-end gap-2"><span className="w-12">Name:</span></div>
                                                    <div className="flex items-end gap-2"><span className="w-12">Mobile:</span></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Page Number */}
                        <div className="absolute bottom-4 right-8 text-[9px] text-slate-400">
                             Page {pageIndex + 1} of {pages.length}
                        </div>
                      </div>
                  )
              })}
          </div>
      )}
    </div>
  );
};

export default QuotationView;
