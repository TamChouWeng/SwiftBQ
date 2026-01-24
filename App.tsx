import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import SettingsView from './components/SettingsView';
import MasterListView from './components/MasterListView';
import BQBuilderView from './components/BQBuilderView';
import QuotationView from './components/QuotationView';
import { AppTheme, AppLanguage, ActiveTab } from './types';
import { AppProvider, useAppStore } from './store';
import LoginView from './components/LoginView';


const AppContent: React.FC = () => {
  // --- State ---
  const { user } = useAppStore();

  if (!user) {
    return <LoginView />;
  }


  // Persist Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    return localStorage.getItem('swiftbq_sidebarOpen') === 'true';
  });

  // Persist Active Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const saved = localStorage.getItem('swiftbq_activeTab');
    return (saved as ActiveTab) || ActiveTab.MASTER_LIST;
  });

  // Theme State (Persisted)
  const [theme, setTheme] = useState<AppTheme>(() => {
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme as AppTheme) || AppTheme.DARK;
  });

  // Language State (Persisted)
  const [language, setLanguage] = useState<AppLanguage>(() => {
    const savedLang = localStorage.getItem('language');
    return (savedLang as AppLanguage) || AppLanguage.ENGLISH;
  });

  // --- Effects ---

  // Handle Sidebar Persistence
  useEffect(() => {
    localStorage.setItem('swiftbq_sidebarOpen', String(isSidebarOpen));
  }, [isSidebarOpen]);

  // Handle Active Tab Persistence
  useEffect(() => {
    localStorage.setItem('swiftbq_activeTab', activeTab);
    // Scroll to top when tab changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  // Handle Theme Change
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Handle Language Change
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300 font-sans flex overflow-hidden">

      {/* Sidebar Component */}
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentLanguage={language}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'md:ml-72' : 'ml-0'
          }`}
      >
        {/* Mobile Header / Sidebar Toggle */}
        <div className="sticky top-0 z-30 flex items-center p-4 md:hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
          <span className="ml-3 font-semibold text-slate-800 dark:text-white md:hidden">SwitftBQ</span>
        </div>

        {/* Desktop Toggle Button (Floating) - Only visible when closed */}
        {!isSidebarOpen && (
          <div className="hidden md:block fixed top-6 left-6 z-30">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full shadow-lg border border-gray-100 dark:border-slate-700 hover:text-primary-500 dark:hover:text-primary-400 hover:scale-110 transition-all duration-200"
              aria-label="Open sidebar"
              title="Open Sidebar"
            >
              <Menu size={24} />
            </button>
          </div>
        )}

        {/* Content Wrapper */}
        <main className="flex-1 py-6 w-full transition-all duration-300">
          {activeTab === ActiveTab.MASTER_LIST && (
            <MasterListView currentLanguage={language} isSidebarOpen={isSidebarOpen} />
          )}
          {activeTab === ActiveTab.BQ_BUILDER && (
            <BQBuilderView currentLanguage={language} isSidebarOpen={isSidebarOpen} />
          )}
          {activeTab === ActiveTab.QUOTATION_VIEW && (
            <QuotationView currentLanguage={language} isSidebarOpen={isSidebarOpen} />
          )}
          {activeTab === ActiveTab.SETTINGS && (
            <SettingsView
              currentTheme={theme}
              setTheme={setTheme}
              currentLanguage={language}
              setLanguage={setLanguage}
              isSidebarOpen={isSidebarOpen}
            />
          )}
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <AppProvider>
    <AppContent />
  </AppProvider>
);

export default App;