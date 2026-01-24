
import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Lock, User } from 'lucide-react';

const LoginView: React.FC = () => {
    const { login } = useAppStore();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const success = await login(username, password);
            if (!success) {
                setError('Invalid credentials');
            }
        } catch (err) {
            setError('Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 dark:border-slate-700">
                <div className="text-center mb-8">
                    <div className="mx-auto w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mb-4">
                        <Lock className="text-primary-600 dark:text-primary-400" size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Welcome Back</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Sign in to access SwiftBQ</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Username</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="pl-10 block w-full rounded-lg border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2.5"
                                placeholder="Enter your username"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-10 block w-full rounded-lg border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2.5"
                                placeholder="Enter your password"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/20 p-2 rounded">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors"
                    >
                        {loading ? 'Signing in...' : 'Sign in'}
                    </button>
                </form>

                <div className="mt-4 text-center text-xs text-slate-400">
                    <p>Default: Teoh Chi Yang / 12345</p>
                </div>
            </div>
        </div>
    );
};

export default LoginView;
