import React from 'react';
import { AppLanguage } from '../types';
import { TRANSLATIONS } from '../constants';
import { Activity, BarChart2, Calendar, Clock, ArrowUpRight } from 'lucide-react';

interface MainViewProps {
  currentLanguage: AppLanguage;
}

const MainView: React.FC<MainViewProps> = ({ currentLanguage }) => {
  const t = TRANSLATIONS[currentLanguage];

  const cards = [
    { title: 'Total Revenue', value: '$45,231.89', change: '+20.1%', icon: BarChart2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    { title: 'Active Users', value: '2,338', change: '+15.2%', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    { title: 'Avg. Session', value: '4m 32s', change: '+1.2%', icon: Clock, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="mb-10">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-3 tracking-tight">
          {t.main}
        </h1>
        <div className="h-1 w-20 bg-primary-500 rounded-full"></div>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
          {t.welcomeSubtitle}
        </p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, index) => (
          <div key={index} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md transition-shadow duration-200">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${card.bg} ${card.color}`}>
                <card.icon size={24} />
              </div>
              <span className="flex items-center gap-1 text-sm font-medium text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full">
                {card.change} <ArrowUpRight size={14} />
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{card.title}</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{card.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Featured Section */}
      <div className="bg-gradient-to-br from-primary-600 to-indigo-700 rounded-3xl p-8 md:p-12 text-white shadow-xl shadow-primary-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10 transform translate-x-12 -translate-y-12">
            <Activity size={300} />
        </div>
        <div className="relative z-10 max-w-lg">
          <h2 className="text-3xl font-bold mb-4">{t.welcomeTitle}</h2>
          <p className="text-primary-100 text-lg mb-8 leading-relaxed">
             Experience the smooth transitions and responsive design of our new Beta 1.0 dashboard.
             Configure your experience in the settings tab.
          </p>
          <div className="flex flex-wrap gap-4">
            <button className="px-6 py-3 bg-white text-primary-700 rounded-xl font-semibold hover:bg-primary-50 transition-colors shadow-lg shadow-black/5">
              Get Started
            </button>
            <button className="px-6 py-3 bg-primary-700/50 backdrop-blur-sm border border-white/20 text-white rounded-xl font-semibold hover:bg-primary-700/70 transition-colors">
              View Documentation
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity Mockup */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Recent Updates</h3>
            <button className="text-primary-500 text-sm font-medium hover:text-primary-600">View All</button>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {[1, 2, 3].map((item) => (
                <div key={item} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400">
                        <Calendar size={18} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">System Update scheduled</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Today at 10:00 AM</p>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default MainView;
