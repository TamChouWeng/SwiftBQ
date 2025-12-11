
import React, { useMemo, useState } from 'react';
import { Download, FileText, AlertCircle, ArrowLeft, Search, Calendar, Clock, User } from 'lucide-react';
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

  // Get current project details
  const activeProject = useMemo(() => 
    projects.find(p => p.id === currentProjectId), 
  [projects, currentProjectId]);

  const activeItems = useMemo(() => 
    bqItems.filter(item => item.projectId === currentProjectId),
  [bqItems, currentProjectId]);

  const { subtotal, tax, grandTotal } = currentProjectId ? getProjectTotal(currentProjectId) : { subtotal: 0, tax: 0, grandTotal: 0 };

  // Group items by category
  const groupedItems = activeItems.reduce<Record<string, BQItem[]>>((acc, item) => {
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
      const canvas = await html2canvas(input, {
        scale: 2, // Higher resolution
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
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

      while (heightLeft >= 0) {
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
    <div className="animate-fade-in space-y-6 pb-12">
      {/* Title Header */}
      <div className={`transition-all duration-300 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${contentPadding}`}>
        <div className="flex items-start gap-4">
            <button 
                onClick={() => setCurrentProjectId(null)}
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
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-xl font-medium shadow-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
        >
          <Download size={20} />
          {t.exportPDF}
        </button>
      </div>

      {activeItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
            <div className="bg-gray-100 dark:bg-slate-800 p-6 rounded-full mb-4">
                <FileText size={48} className="text-slate-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300">{t.noData}</h2>
          </div>
      ) : (
          /* PDF Container */
          <div className="overflow-auto w-full px-4">
              <div
                id="quotation-content"
                className="bg-white text-slate-900 p-12 max-w-[210mm] mx-auto shadow-2xl min-h-[297mm] relative"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-12 border-b-2 border-slate-100 pb-8">
                  <div className="flex items-center gap-4">
                    {appSettings.logoUrl && (
                        <img src={appSettings.logoUrl} alt="Logo" className="h-16 w-auto object-contain" />
                    )}
                    {!appSettings.logoUrl && (
                        <div className="h-16 w-16 bg-primary-500 rounded flex items-center justify-center text-white font-bold text-2xl">C</div>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{appSettings.companyName}</h1>
                        <p className="text-slate-500 text-sm whitespace-pre-line max-w-xs">{appSettings.companyAddress}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 className="text-4xl font-light text-slate-300 mb-2">QUOTATION</h2>
                    <div className="space-y-1 text-sm">
                        <p><span className="font-semibold text-slate-600">{t.quoteId}:</span> {activeProject?.quoteId}</p>
                        <p><span className="font-semibold text-slate-600">{t.date}:</span> {activeProject?.date}</p>
                        <p><span className="font-semibold text-slate-600">{t.clientName}:</span> {activeProject?.clientName}</p>
                        {activeProject?.clientContact && (
                            <p><span className="font-semibold text-slate-600">{t.clientContact}:</span> {activeProject.clientContact}</p>
                        )}
                         {activeProject?.clientAddress && (
                            <p><span className="font-semibold text-slate-600">{t.clientAddress}:</span> <span className="block max-w-[200px] ml-auto whitespace-pre-wrap">{activeProject.clientAddress}</span></p>
                        )}
                        <p><span className="font-semibold text-slate-600">{t.validityPeriod}:</span> {activeProject?.validityPeriod} Days</p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-8">
                  {Object.entries(groupedItems).map(([category, items]: [string, BQItem[]]) => (
                    <div key={category} className="break-inside-avoid">
                      <h3 className="text-lg font-bold text-primary-700 mb-3 border-b border-primary-100 pb-1">{category}</h3>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-slate-500 border-b border-slate-200">
                            <th className="py-2 text-left font-medium w-1/2">{t.description}</th>
                            <th className="py-2 text-center font-medium">{t.uom}</th>
                            <th className="py-2 text-right font-medium">{t.price}</th>
                            <th className="py-2 text-center font-medium">{t.qty}</th>
                            <th className="py-2 text-right font-medium">{t.total}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {items.map((item) => (
                            <tr key={item.id}>
                              <td className="py-3 pr-4">
                                <p className="font-medium text-slate-800">{item.itemName}</p>
                                <p className="text-slate-500 text-xs">{item.description}</p>
                              </td>
                              <td className="py-3 text-center text-slate-600">{item.uom}</td>
                              <td className="py-3 text-right text-slate-600">{item.price.toFixed(2)}</td>
                              <td className="py-3 text-center text-slate-600">{item.qty}</td>
                              <td className="py-3 text-right font-medium text-slate-900">{item.total.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>

                {/* Footer Totals */}
                <div className="mt-12 border-t-2 border-slate-100 pt-6 break-inside-avoid">
                    <div className="flex justify-end">
                        <div className="w-64 space-y-3">
                            <div className="flex justify-between text-slate-600">
                                <span>{t.subtotal}</span>
                                <span>{appSettings.currencySymbol}{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>{t.tax} ({appSettings.taxRate}%)</span>
                                <span>{appSettings.currencySymbol}{tax.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xl font-bold text-slate-900 border-t border-slate-200 pt-3">
                                <span>{t.grandTotal}</span>
                                <span>{appSettings.currencySymbol}{grandTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Page Footer */}
                <div className="absolute bottom-12 left-12 right-12 text-center border-t border-slate-100 pt-4">
                    <p className="text-xs text-slate-400">{t.generatedBy}</p>
                </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default QuotationView;
