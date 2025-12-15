import React from 'react';
import { Settings, X, ChevronLeft, List, Hammer, FileText } from 'lucide-react';
import { ActiveTab, AppLanguage } from '../types';
import { TRANSLATIONS } from '../constants';
import { useAppStore } from '../store';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentLanguage: AppLanguage;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  setIsOpen,
  activeTab,
  setActiveTab,
  currentLanguage,
}) => {
  const t = TRANSLATIONS[currentLanguage];
  const { appSettings } = useAppStore();

  const handleTabClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    // On mobile, auto-close sidebar when clicking a link
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  const menuItems = [
    { tab: ActiveTab.MASTER_LIST, label: t.masterList, icon: List },
    { tab: ActiveTab.BQ_BUILDER, label: t.bqBuilder, icon: Hammer },
    { tab: ActiveTab.QUOTATION_VIEW, label: t.quotationView, icon: FileText },
    { tab: ActiveTab.SETTINGS, label: t.settings, icon: Settings },
  ];

  return (
    <>
      {/* Overlay Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-white dark:bg-slate-800 shadow-2xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary-500/30">
              S
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800 dark:text-slate-100">
              SwitftBQ
            </span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors md:hidden"
          >
            <X size={20} />
          </button>
          <button
             onClick={() => setIsOpen(false)}
             className="hidden md:block p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
             aria-label="Collapse sidebar"
          >
             <ChevronLeft size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.tab}
              onClick={() => handleTabClick(item.tab)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group ${
                activeTab === item.tab
                  ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <item.icon
                size={22}
                className={`${
                  activeTab === item.tab ? 'text-primary-500 dark:text-primary-400' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'
                }`}
              />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-slate-700">
           <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-700/50">
             <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
               {appSettings.profileName.charAt(0).toUpperCase()}
             </div>
             <div className="flex-1 min-w-0">
               <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{appSettings.profileName}</p>
               <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{appSettings.profileRole || 'Admin'}</p>
             </div>
           </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;