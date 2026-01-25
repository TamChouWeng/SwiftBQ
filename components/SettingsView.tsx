
import React, { useState, useRef, useEffect } from 'react';
import { Moon, Sun, Globe, Info, Check, Building, User, ShieldCheck, Trash2, Upload, LogOut } from 'lucide-react';
import { AppLanguage, AppTheme, LANGUAGES } from '../types';
import { TRANSLATIONS } from '../constants';
import { useAppStore } from '../store';

interface SettingsViewProps {
    currentTheme: AppTheme;
    setTheme: (theme: AppTheme) => void;
    currentLanguage: AppLanguage;
    setLanguage: (lang: AppLanguage) => void;
    isSidebarOpen: boolean;
}

const SettingsView: React.FC<SettingsViewProps> = ({
    currentTheme,
    setTheme,
    currentLanguage,
    setLanguage,
    isSidebarOpen,
}) => {
    const t = TRANSLATIONS[currentLanguage];
    const { appSettings, setAppSettings, logout, user, updateUserProfile, updateCompanyProfile } = useAppStore();
    const fileInputRef = useRef<HTMLInputElement>(null);


    // Local state for profile form to defer updates until confirmation
    const [profileForm, setProfileForm] = useState({
        name: appSettings.profileName,
        contact: appSettings.profileContact,
        role: appSettings.profileRole || 'Admin'
    });

    // Local state for company form to detect changes
    const [companyForm, setCompanyForm] = useState({
        name: appSettings.companyName,
        address: appSettings.companyAddress,
        currency: appSettings.currencySymbol,
        bankName: appSettings.bankName,
        bankAccount: appSettings.bankAccount
    });

    // Sync local states if global state changes externally (though unlikely here)
    useEffect(() => {
        setProfileForm({
            name: appSettings.profileName,
            contact: appSettings.profileContact,
            role: appSettings.profileRole || 'Admin'
        });
        setCompanyForm({
            name: appSettings.companyName,
            address: appSettings.companyAddress,
            currency: appSettings.currencySymbol,
            bankName: appSettings.bankName,
            bankAccount: appSettings.bankAccount
        });
    }, [appSettings]);

    const isProfileDirty =
        profileForm.name !== appSettings.profileName ||
        profileForm.contact !== appSettings.profileContact ||
        profileForm.role !== (appSettings.profileRole || 'Admin');

    const isCompanyDirty =
        companyForm.name !== appSettings.companyName ||
        companyForm.address !== appSettings.companyAddress ||
        companyForm.currency !== appSettings.currencySymbol ||
        companyForm.bankName !== appSettings.bankName ||
        companyForm.bankAccount !== appSettings.bankAccount;

    const handleProfileSave = () => {
        if (!isProfileDirty) return;
        updateUserProfile({
            profileName: profileForm.name,
            profileContact: profileForm.contact,
            profileRole: profileForm.role
        });
    };

    const handleCompanySave = () => {
        if (!isCompanyDirty) return;
        updateCompanyProfile({
            companyName: companyForm.name,
            companyAddress: companyForm.address,
            currencySymbol: companyForm.currency,
            bankName: companyForm.bankName,
            bankAccount: companyForm.bankAccount
        });
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAppSettings({ ...appSettings, companyLogo: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveLogo = () => {
        setAppSettings({ ...appSettings, companyLogo: '' });
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const containerPadding = !isSidebarOpen ? 'pl-4 md:pl-24 pr-4' : 'px-4';

    return (
        <div className={`space-y-8 animate-fade-in pb-12 transition-all duration-300 ${containerPadding}`}>
            <header className="mb-10">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                    {t.settings}
                </h1>
            </header>

            {/* Profile Settings */}
            <section className="space-y-4">
                <h2 className="text-sm uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 px-1">
                    {t.profileSettings}
                </h2>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden p-6 space-y-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                                <User size={20} />
                            </div>
                            <h3 className="font-semibold text-slate-900 dark:text-white">{t.profileSettings}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleProfileSave}
                                disabled={!isProfileDirty}
                                className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-all ${isProfileDirty
                                    ? 'bg-green-500 border-green-600 text-white shadow-lg shadow-green-500/30 hover:bg-green-600'
                                    : 'bg-gray-100 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-400 dark:text-slate-500 cursor-not-allowed'
                                    }`}
                                title="Save Profile Changes"
                            >
                                <Check size={20} strokeWidth={3} />
                            </button>
                            <button
                                onClick={() => {
                                    if (window.confirm('Are you sure you want to sign out?')) {
                                        logout();
                                    }
                                }}
                                className="w-10 h-10 flex items-center justify-center rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all"
                                title="Sign Out"
                            >
                                <LogOut size={20} strokeWidth={2} />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{t.yourName}</label>
                            <input
                                type="text"
                                value={profileForm.name}
                                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{t.yourContact}</label>
                            <input
                                type="text"
                                value={profileForm.contact}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (/^[0-9+\-\s]*$/.test(val)) {
                                        setProfileForm({ ...profileForm, contact: val });
                                    }
                                }}
                                className="w-full bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{t.profileRole}</label>
                            <div className="relative">
                                <select
                                    value={profileForm.role}
                                    onChange={(e) => setProfileForm({ ...profileForm, role: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none appearance-none cursor-pointer"
                                >
                                    <option value="Admin">{t.roleAdmin}</option>
                                    <option value="User">{t.roleUser}</option>
                                </select>
                                <ShieldCheck className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* Company Settings */}
            <section className="space-y-4">
                <h2 className="text-sm uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 px-1">
                    Company Info
                </h2>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden p-6 space-y-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                                <Building size={20} />
                            </div>
                            <h3 className="font-semibold text-slate-900 dark:text-white">Company Information</h3>
                        </div>
                        <button
                            onClick={handleCompanySave}
                            disabled={!isCompanyDirty}
                            className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-all ${isCompanyDirty
                                ? 'bg-green-500 border-green-600 text-white shadow-lg shadow-green-500/30 hover:bg-green-600'
                                : 'bg-gray-100 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-400 dark:text-slate-500 cursor-not-allowed'
                                }`}
                            title="Save Company Info Changes"
                        >
                            <Check size={20} strokeWidth={3} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{t.companyName}</label>
                            <input
                                type="text"
                                value={companyForm.name}
                                onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{t.currencySymbol}</label>
                            <input
                                type="text"
                                value={companyForm.currency}
                                onChange={(e) => setCompanyForm({ ...companyForm, currency: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{t.bankName}</label>
                            <input
                                type="text"
                                value={companyForm.bankName}
                                onChange={(e) => setCompanyForm({ ...companyForm, bankName: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{t.bankAccount}</label>
                            <input
                                type="text"
                                value={companyForm.bankAccount}
                                onChange={(e) => setCompanyForm({ ...companyForm, bankAccount: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{t.companyAddress}</label>
                            <textarea
                                value={companyForm.address}
                                onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                                rows={2}
                                className="w-full bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none resize-none"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Company Logo</label>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                <div className="relative group">
                                    {appSettings.companyLogo ? (
                                        <div className="w-20 h-20 border border-gray-200 dark:border-slate-600 rounded-lg overflow-hidden bg-white flex items-center justify-center relative">
                                            <img src={appSettings.companyLogo} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                                        </div>
                                    ) : (
                                        <div className="w-20 h-20 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg flex items-center justify-center text-slate-400 bg-gray-50 dark:bg-slate-700/30">
                                            <span className="text-xs">No Logo</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 space-y-2">
                                    <div className="flex gap-2">
                                        <label className="flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300">
                                            <Upload size={16} />
                                            Choose Image
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={handleLogoUpload}
                                                className="hidden"
                                            />
                                        </label>
                                        {appSettings.companyLogo && (
                                            <button
                                                onClick={handleRemoveLogo}
                                                className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-sm font-medium"
                                            >
                                                <Trash2 size={16} />
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400">
                                        Recommended: PNG or JPG. Transparent background works best.
                                        <br />If no logo is uploaded, the logo section will be hidden in quotations.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Appearance Section */}
            <section className="space-y-4">
                <h2 className="text-sm uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 px-1">
                    {t.appearance}
                </h2>

                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <div className="p-6 sm:p-8">
                        <div className="flex flex-col sm:flex-row gap-6">

                            {/* Light Mode Option */}
                            <button
                                onClick={() => setTheme(AppTheme.LIGHT)}
                                className={`flex-1 relative group rounded-xl p-4 border-2 transition-all duration-200 ${currentTheme === AppTheme.LIGHT
                                    ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/10'
                                    : 'border-transparent bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className={`p-2 rounded-lg ${currentTheme === AppTheme.LIGHT ? 'bg-primary-100 text-primary-600' : 'bg-gray-200 text-gray-500 dark:bg-slate-600 dark:text-slate-300'}`}>
                                        <Sun size={24} />
                                    </div>
                                    {currentTheme === AppTheme.LIGHT && (
                                        <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center text-white">
                                            <Check size={14} strokeWidth={3} />
                                        </div>
                                    )}
                                </div>
                                <div className="text-left">
                                    <h3 className={`font-semibold ${currentTheme === AppTheme.LIGHT ? 'text-primary-700 dark:text-primary-300' : 'text-slate-900 dark:text-white'}`}>
                                        {t.lightMode}
                                    </h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Light & Crisp</p>
                                </div>
                            </button>

                            {/* Dark Mode Option */}
                            <button
                                onClick={() => setTheme(AppTheme.DARK)}
                                className={`flex-1 relative group rounded-xl p-4 border-2 transition-all duration-200 ${currentTheme === AppTheme.DARK
                                    ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/10'
                                    : 'border-transparent bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className={`p-2 rounded-lg ${currentTheme === AppTheme.DARK ? 'bg-primary-100 text-primary-600' : 'bg-gray-200 text-gray-500 dark:bg-slate-600 dark:text-slate-300'}`}>
                                        <Moon size={24} />
                                    </div>
                                    {currentTheme === AppTheme.DARK && (
                                        <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center text-white">
                                            <Check size={14} strokeWidth={3} />
                                        </div>
                                    )}
                                </div>
                                <div className="text-left">
                                    <h3 className={`font-semibold ${currentTheme === AppTheme.DARK ? 'text-primary-700 dark:text-primary-300' : 'text-slate-900 dark:text-white'}`}>
                                        {t.darkMode}
                                    </h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Dark & Focus</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Language Section */}
            <section className="space-y-4">
                <h2 className="text-sm uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 px-1">
                    {t.language}
                </h2>

                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden divide-y divide-gray-100 dark:divide-slate-700">

                    {/* Language Selector */}
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                                <Globe size={20} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900 dark:text-white">{t.selectLanguage}</h3>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {LANGUAGES.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => setLanguage(lang.code)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 ${currentLanguage === lang.code
                                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                                        : 'border-gray-200 dark:border-slate-600 hover:border-primary-200 dark:hover:border-primary-800 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800'
                                        }`}
                                >
                                    <span className="text-xl">{lang.flag}</span>
                                    <span className="font-medium">{lang.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* About / Version Section */}
            <section className="space-y-4">
                <h2 className="text-sm uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 px-1">
                    {t.system}
                </h2>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <div className="p-6 flex items-center justify-between group cursor-default">
                        <div className="flex items-center gap-4">
                            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                <Info size={20} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900 dark:text-white">{t.version}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Current build</p>
                            </div>
                        </div>
                        <div className="px-3 py-1 bg-gray-100 dark:bg-slate-700 rounded-full border border-gray-200 dark:border-slate-600">
                            <span className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300">Beta 3.0</span>
                        </div>
                    </div>
                </div>
            </section>

            <div className="text-center pt-8 pb-4">
                <p className="text-xs text-slate-400 dark:text-slate-600">
                    © 2024 SwitftBQ Application. All rights reserved.
                </p>
            </div>

        </div>
    );
};

export default SettingsView;
