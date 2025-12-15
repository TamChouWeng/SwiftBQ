
import React, { useMemo, useState, useEffect } from 'react';
import { Download, FileText, AlertCircle, ArrowLeft, Search, Calendar, Clock, User, ChevronDown } from 'lucide-react';
import { useAppStore } from '../store';
import { AppLanguage, BQItem } from '../types';
import { TRANSLATIONS } from '../constants';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface Props {
  currentLanguage: AppLanguage;
  isSidebarOpen: boolean;
}

const QuotationView: React.FC<Props> = ({ currentLanguage, isSidebarOpen }) => {
  const { bqItems, currentProjectId, setCurrentProjectId, projects, getProjectTotal, appSettings } = useAppStore();
  const t = TRANSLATIONS[currentLanguage];
  const [searchQuery, setSearchQuery] = useState('');
  const [logoError, setLogoError] = useState(false);
  
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

  const { subtotal, tax, grandTotal } = currentProjectId && selectedVersionId ? getProjectTotal(currentProjectId, selectedVersionId) : { subtotal: 0, tax: 0, grandTotal: 0 };

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

  const handleExportPDF = async () => {
    const input = document.getElementById('quotation-content');
    if (!input) return;

    try {
      // Temporarily remove shadow for cleaner capture and accurate dimensions
      const originalShadow = input.style.boxShadow;
      input.style.boxShadow = 'none';

      const canvas = await html2canvas(input, {
        scale: 2, // Higher resolution
        useCORS: true,
        // allowTaint: true, // REMOVED: Taint prevents toDataURL from working if remote images fail CORS
        logging: false,
        backgroundColor: '#ffffff'
      });

      // Restore shadow
      input.style.boxShadow = originalShadow;

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Check if there is significant content left (more than 1mm) to avoid blank pages due to rounding
      while (heightLeft > 1) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Quotation-${activeProject?.quoteId || 'draft'}.pdf`);
    } catch (error) {
      console.error('PDF Generation failed', error);
      alert('Failed to generate PDF.');
    }
  };

  const contentPadding = !isSidebarOpen ? 'pl-4 md:pl-24 pr-4' : 'px-4';

  // Helper for currency format
  const fmt = (n: number) => n?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00';

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

  let rowCounter = 1;

  // === DETAIL VIEW ===
  return (
    <div className="animate-fade-in space-y-6 pb-12">
      {/* Title Header */}
      <div className={`transition-all duration-300 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${contentPadding}`}>
        <div className="flex flex-col gap-4">
            <div className="flex items-start gap-4">
                <button 
                    onClick={() => {
                        setCurrentProjectId(null);
                        setSelectedVersionId(null);
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
            
            {/* Version Selection in Quote View */}
            <div className="pl-14">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block uppercase">Select Version to Export</label>
                <div className="relative inline-block">
                     <select
                        value={selectedVersionId || ''}
                        onChange={(e) => setSelectedVersionId(e.target.value)}
                        className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm rounded-lg pl-3 pr-8 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none appearance-none font-medium min-w-[160px]"
                     >
                         {activeProject?.versions.map(v => (
                             <option key={v.id} value={v.id}>{v.name}</option>
                         ))}
                     </select>
                     <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
            </div>
        </div>
        
        {/* Square Export Button */}
        <button
          onClick={handleExportPDF}
          className="w-10 h-10 flex items-center justify-center bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg shadow-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
          title={t.exportPDF}
        >
          <Download size={20} />
        </button>
      </div>

      {activeItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
            <div className="bg-gray-100 dark:bg-slate-800 p-6 rounded-full mb-4">
                <FileText size={48} className="text-slate-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300">{t.noData}</h2>
            <p className="text-sm text-slate-500 mt-2">Ensure the selected version has items.</p>
          </div>
      ) : (
          /* PDF Container - A4 Size Simulation */
          <div className="overflow-auto w-full px-4 flex justify-center bg-gray-100 dark:bg-slate-900 py-8">
              <div
                id="quotation-content"
                className="bg-white text-black p-[10mm] w-[210mm] min-h-[297mm] shadow-2xl relative font-sans flex flex-col"
                style={{ fontSize: '10pt', lineHeight: '1.3' }}
              >
                {/* 1. Header Section */}
                <div className="flex justify-between items-end mb-4">
                  {/* Left: Company Details */}
                  <div className="w-[60%] pb-2">
                     <img 
                        src={appSettings.companyLogo || "/logo.jpg"} 
                        alt="Company Logo" 
                        className={`h-16 w-auto mb-3 object-contain ${logoError ? 'hidden' : 'block'}`}
                        onError={(e) => {
                            if (!appSettings.companyLogo) {
                                console.warn("Logo failed to load at path:", e.currentTarget.src);
                                setLogoError(true);
                            }
                        }}
                     />
                     {logoError && !appSettings.companyLogo && (
                        <div className="h-16 mb-3 flex items-center justify-center text-[10px] text-red-500 italic border border-red-200 bg-red-50 px-2 rounded w-48">
                            Logo not found. Upload in Settings.
                        </div>
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
                            <span className="font-bold text-xs uppercase border-b border-black pb-0.5" style={{ width: 'fit-content', borderBottomStyle: 'solid', display: 'inline-block' }}>BILL / SHIP TO:</span>
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
                            <span className="font-bold text-xs uppercase border-b border-black pb-0.5" style={{ width: 'fit-content', borderBottomStyle: 'solid', display: 'inline-block' }}>QUOTE REFERENCE:</span>
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

                {/* 3. Items Table */}
                <div className="mb-6">
                    <table className="w-full border-collapse border border-black text-xs text-black">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-black p-2 w-10 text-center font-bold">NO</th>
                                <th className="border border-black p-2 text-left font-bold">DESCRIPTION</th>
                                <th className="border border-black p-2 w-28 text-right font-bold">Unit Price ({appSettings.currencySymbol})</th>
                                <th className="border border-black p-2 w-12 text-center font-bold">QTY</th>
                                <th className="border border-black p-2 w-16 text-center font-bold">UOM</th>
                                <th className="border border-black p-2 w-28 text-right font-bold">Total Price ({appSettings.currencySymbol})</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Standard Items */}
                            {Object.entries(groupedItems).map(([category, items]) => (
                                <React.Fragment key={category}>
                                    {/* Category Header */}
                                    <tr>
                                        <td className="border border-black p-1 bg-gray-200"></td>
                                        <td className="border border-black p-1 font-bold bg-gray-50 uppercase pl-2" colSpan={5}>
                                            {category}
                                        </td>
                                    </tr>
                                    {/* Items */}
                                    {(items as BQItem[]).map((item) => (
                                        <tr key={item.id}>
                                            <td className="border border-black p-2 text-center align-top">{rowCounter++}</td>
                                            <td className="border border-black p-2 align-top">
                                                <div className="font-bold text-xs mb-1">{item.itemName}</div>
                                                <div className="text-[10px] text-black whitespace-pre-wrap leading-tight pl-2">
                                                    {item.description}
                                                </div>
                                            </td>
                                            <td className="border border-black p-2 text-right align-top">{fmt(item.price)}</td>
                                            <td className="border border-black p-2 text-center align-top">{item.qty}</td>
                                            <td className="border border-black p-2 text-center align-top">{item.uom}</td>
                                            <td className="border border-black p-2 text-right align-top font-semibold">{fmt(item.total)}</td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                            
                            {/* Empty Standard Items Filler if needed, but not required by prompt */}
                        </tbody>
                    </table>
                </div>

                {/* 4. Totals (Standard) */}
                <div className="flex justify-end mb-6 break-inside-avoid text-black">
                    <div className="w-[40%]">
                        <div className="flex justify-between border-b border-black py-1">
                            <span className="font-semibold text-xs">Subtotal ({appSettings.currencySymbol}) :</span>
                            <span className="font-medium">{fmt(subtotal)}</span>
                        </div>
                        <div className="flex justify-between border-b border-black py-1 text-red-600">
                            <span className="font-semibold text-xs">Special Discount ({appSettings.currencySymbol}) :</span>
                            <span className="font-medium">(0.00)</span>
                        </div>
                        <div className="flex justify-between border-b-2 border-black py-1 text-sm font-bold mt-1">
                            <span>TOTAL ({appSettings.currencySymbol}):</span>
                            <span>{fmt(grandTotal)}</span>
                        </div>
                    </div>
                </div>

                {/* 5. Optional Items Section (if any) */}
                {optionalItems.length > 0 && (
                    <div className="mb-6 break-inside-avoid">
                         <div className="border border-black border-b-0 bg-gray-100 p-1 text-center font-bold text-xs uppercase">
                             OPTIONAL
                         </div>
                         <table className="w-full border-collapse border border-black text-xs text-black">
                             <tbody>
                                 {optionalItems.map((item) => (
                                     <tr key={item.id}>
                                         <td className="border border-black p-2 w-10 text-center align-top">{rowCounter++}</td>
                                         <td className="border border-black p-2 align-top">
                                             <div className="font-bold text-xs mb-1">{item.itemName}</div>
                                             <div className="text-[10px] text-black whitespace-pre-wrap leading-tight pl-2">
                                                 {item.description}
                                             </div>
                                         </td>
                                         <td className="border border-black p-2 w-28 text-right align-top">{fmt(item.price)}</td>
                                         <td className="border border-black p-2 w-12 text-center align-top">{item.qty}</td>
                                         <td className="border border-black p-2 w-16 text-center align-top">{item.uom}</td>
                                         <td className="border border-black p-2 w-28 text-right align-top font-semibold">{fmt(item.total)}</td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                    </div>
                )}

                {/* 6. Footer Terms & Signature */}
                <div className="mt-8 break-inside-avoid text-black">
                    {/* Terms */}
                    <div className="text-xs mb-6">
                        <h4 className="font-bold underline mb-2">TERMS & CONDITIONS:</h4>
                        <ul className="list-disc list-outside ml-4 space-y-1 text-black">
                            <li>Payment : 50% deposit, balance before delivery.</li>
                            <li>Delivery : 10 - 14 weeks upon order confirmation and deposit paid.</li>
                        </ul>
                        <p className="mt-3 italic text-[10px] text-black">
                            (1) No cancellation, suspension or variation of an accepted customer's order shall be valid unless agreed in writing by our company.
                        </p>
                    </div>

                    {/* Closing Phrases Row - Aligned horizontally */}
                    <div className="flex justify-between items-end text-xs italic">
                        <div className="w-[50%]">
                             <p>Thank you for your business,</p>
                        </div>
                        <div className="w-[40%] text-center font-bold text-[10px] not-italic">
                             <p>Sign and return to confirm your order.</p>
                        </div>
                    </div>

                    {/* Spacer for Signature (4-5 lines approx) */}
                    <div className="h-24"></div>

                    {/* Bottom Section: Banking & Signature Lines */}
                    <div className="flex justify-between items-start text-xs">
                        {/* Banking / Company Info */}
                        <div className="w-[50%]">
                            <div className="border-t border-black pt-1">
                                <div className="text-[10px] space-y-1">
                                    <p className="font-bold text-xs">{appSettings.companyName}</p>
                                    <p className="text-blue-600 underline">xxx@rexharge.net</p>
                                    <div className="mt-2">
                                        <p className="italic mb-1">All cheques should be crossed and made to :</p>
                                        <p className="font-bold">{appSettings.companyName}</p>
                                        <p>Bank Name: <span className="font-semibold">OCBC Bank</span></p>
                                        <p>Bank Account: <span className="font-semibold">xxxxxx</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Signature Block Lines */}
                        <div className="w-[40%]">
                            <div className="border-t border-black pt-1">
                                <div className="flex justify-between text-[10px] text-black font-bold mb-8 items-start">
                                    <div className="flex flex-col">
                                        <span>Company Stamp</span>
                                        <span className="font-normal italic text-[9px] text-gray-500">(if any)</span>
                                    </div>
                                    <div className="flex flex-col text-right">
                                        <span>Authorized</span>
                                        <span>Signature</span>
                                    </div>
                                </div>
                                <div className="space-y-3 font-bold text-black text-[10px]">
                                    <div className="flex items-end gap-2">
                                        <span className="w-12">Name:</span>
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <span className="w-12">Mobile:</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

              </div>
          </div>
      )}
    </div>
  );
};

export default QuotationView;
