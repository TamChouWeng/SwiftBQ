
import React, { useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '../store';
import { AppLanguage } from '../types';
import { TRANSLATIONS } from '../constants';

interface Props {
  currentLanguage: AppLanguage;
  isSidebarOpen: boolean;
}

const BQBuilderView: React.FC<Props> = ({ currentLanguage, isSidebarOpen }) => {
  const {
    masterData,
    bqItems,
    addBQItem,
    removeBQItem,
    updateBQItem,
    projectDetails,
    setProjectDetails,
    calculateTotal,
    appSettings,
  } = useAppStore();
  const t = TRANSLATIONS[currentLanguage];
  const { subtotal, tax, grandTotal } = calculateTotal();

  // Extract unique categories from Master Data
  const categories = useMemo(() => {
    return Array.from(new Set(masterData.map((item) => item.category)));
  }, [masterData]);

  const handleCategoryChange = (rowId: string, newCategory: string) => {
    updateBQItem(rowId, 'category', newCategory);
    // Reset item selection when category changes
    updateBQItem(rowId, 'masterId', '');
    updateBQItem(rowId, 'itemName', '');
    updateBQItem(rowId, 'price', 0);
    updateBQItem(rowId, 'description', '');
    updateBQItem(rowId, 'uom', '');
  };

  const handleItemSelect = (rowId: string, masterId: string) => {
    const masterItem = masterData.find((m) => m.id === masterId);
    if (masterItem) {
      updateBQItem(rowId, 'masterId', masterId);
      updateBQItem(rowId, 'itemName', masterItem.itemName);
      updateBQItem(rowId, 'description', masterItem.description);
      updateBQItem(rowId, 'price', masterItem.price);
      updateBQItem(rowId, 'uom', masterItem.uom);
    }
  };

  // Dynamic Padding for Title Header Only
  const contentPadding = !isSidebarOpen ? 'pl-4 md:pl-24 pr-4' : 'px-4';

  return (
    <div className="space-y-8 animate-fade-in pb-20 relative">
      
      {/* Title Header - Retains padding to clear floating button */}
      <div className={`transition-all duration-300 ${contentPadding}`}>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{t.bqBuilder}</h1>
      </div>

      {/* Project Details Header - Aligned with Table */}
      <div className="mx-0 md:mx-4 transition-all duration-300">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-none md:rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{t.clientName}</label>
            <input
                type="text"
                value={projectDetails.clientName}
                onChange={(e) => setProjectDetails({ ...projectDetails, clientName: e.target.value })}
                className="w-full bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
            </div>
            <div>
            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{t.date}</label>
            <input
                type="date"
                value={projectDetails.date}
                onChange={(e) => setProjectDetails({ ...projectDetails, date: e.target.value })}
                className="w-full bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
            </div>
            <div>
            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{t.quoteId}</label>
            <input
                type="text"
                value={projectDetails.quoteId}
                onChange={(e) => setProjectDetails({ ...projectDetails, quoteId: e.target.value })}
                className="w-full bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
            </div>
        </div>
      </div>

      {/* Builder Table - Full Width */}
      <div className="bg-white dark:bg-slate-800 rounded-none md:rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden overflow-x-auto mx-0 md:mx-4">
        <table className="w-full min-w-[1000px] text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-sm border-b border-gray-100 dark:border-slate-700">
              <th className="p-4 w-40">{t.category}</th>
              <th className="p-4 w-48">{t.item}</th>
              <th className="p-4">{t.description}</th>
              <th className="p-4 w-20 text-center">{t.uom}</th>
              <th className="p-4 w-32 text-right">{t.price}</th>
              <th className="p-4 w-24 text-center">{t.qty}</th>
              <th className="p-4 w-32 text-right">{t.total}</th>
              <th className="p-4 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {bqItems.map((item) => {
              // Filter items based on selected category for this row
              const availableItems = masterData.filter((m) => m.category === item.category);

              return (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors group">
                  <td className="p-2 align-top">
                    <select
                      value={item.category}
                      onChange={(e) => handleCategoryChange(item.id, e.target.value)}
                      className="w-full p-2 rounded border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:border-primary-500 focus:outline-none dark:text-white"
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
                      className="w-full p-2 rounded border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:border-primary-500 focus:outline-none disabled:opacity-50 dark:text-white"
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
                      rows={2}
                      className="w-full p-2 rounded border border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 bg-transparent text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-none resize-none dark:text-slate-200"
                    />
                  </td>
                  <td className="p-2 align-top">
                     <input
                      type="text"
                      value={item.uom}
                      onChange={(e) => updateBQItem(item.id, 'uom', e.target.value)}
                      className="w-full text-center bg-transparent border-b border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:outline-none dark:text-slate-200"
                    />
                  </td>
                  <td className="p-2 align-top">
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => updateBQItem(item.id, 'price', e.target.value)}
                      className="w-full text-right bg-transparent border-b border-transparent hover:border-gray-200 dark:hover:border-slate-600 focus:border-primary-500 focus:outline-none dark:text-slate-200"
                    />
                  </td>
                  <td className="p-2 align-top">
                    <input
                      type="number"
                      value={item.qty}
                      onChange={(e) => updateBQItem(item.id, 'qty', e.target.value)}
                      className="w-full text-center bg-gray-50 dark:bg-slate-700/50 rounded border border-gray-200 dark:border-slate-600 focus:border-primary-500 focus:outline-none dark:text-white p-1"
                    />
                  </td>
                  <td className="p-2 align-top text-right font-medium text-slate-900 dark:text-white">
                    {appSettings.currencySymbol}{item.total.toFixed(2)}
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
        </table>
        
        <div className="p-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
           <button
             onClick={addBQItem}
             className="flex items-center gap-2 text-primary-600 dark:text-primary-400 font-medium hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
           >
             <Plus size={18} />
             {t.addRow}
           </button>
        </div>
      </div>

      {/* Floating Summary */}
      <div className="fixed bottom-0 left-0 w-full md:pl-72 z-20 pointer-events-none">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-gray-200 dark:border-slate-700 p-4 shadow-lg pointer-events-auto">
             <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-end items-center gap-4 sm:gap-12">
                 <div className="flex justify-between w-full sm:w-auto sm:block">
                    <span className="text-slate-500 dark:text-slate-400 text-sm mr-2">{t.subtotal}:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{appSettings.currencySymbol}{subtotal.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between w-full sm:w-auto sm:block">
                    <span className="text-slate-500 dark:text-slate-400 text-sm mr-2">{t.tax} ({appSettings.taxRate}%):</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{appSettings.currencySymbol}{tax.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between w-full sm:w-auto sm:block text-lg">
                    <span className="text-slate-500 dark:text-slate-400 font-bold mr-2">{t.grandTotal}:</span>
                    <span className="font-extrabold text-primary-600 dark:text-primary-400">{appSettings.currencySymbol}{grandTotal.toFixed(2)}</span>
                 </div>
             </div>
          </div>
      </div>

    </div>
  );
};

export default BQBuilderView;
