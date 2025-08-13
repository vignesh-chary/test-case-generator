// src/components/Dashboard.tsx
import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { PackageIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useError } from '../contexts/ErrorContext';

export function Dashboard() {
    const { logout } = useAuth();
    const { setError } = useError();
    const navigate = useNavigate();
    const location = useLocation();

    // Determine if we should show the "Change Repository" button
    const isRepoSelected = location.pathname.startsWith('/repositories/');

    const handleLogout = () => {
        logout();
        navigate('/');
        setError(null);
    };

    const handleBack = () => {
        navigate(-1);
    };

    const handleBackToRepos = () => {
        navigate('/repositories');
    };

    return (
        <div className="bg-[#f6f8fa] min-h-screen text-[#24292e] font-sans">
            <header className="py-4 px-6 flex items-center justify-between border-b border-[#e1e4e8]">
                <div className="flex items-center space-x-2 text-sm text-[#586069]">
                    <button 
                        onClick={handleBack} 
                        className="text-[#0366d6] hover:text-[#005cc5] transition-colors"
                    >
                        &larr; Back
                    </button>
                    {isRepoSelected && (
                        <div className="flex items-center space-x-2 ml-4">
                            <PackageIcon className="w-4 h-4" />
                            {/* We can get the repo name from the URL or state in a more sophisticated implementation */}
                            <span>Current Repository</span> 
                        </div>
                    )}
                </div>
                <div className="flex items-center space-x-4">
                    {isRepoSelected && (
                        <button
                            onClick={handleBackToRepos}
                            className="text-sm text-[#0366d6] hover:text-[#005cc5] transition-colors"
                        >
                            Change Repository
                        </button>
                    )}
                    <button
                        onClick={handleLogout}
                        className="text-sm text-red-600 hover:text-red-800 transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </header>
            <main className="container mx-auto py-8 px-6">
                <div className="w-full max-w-7xl mx-auto">
                    {/* React Router will render the correct component here based on the URL */}
                    <Outlet />
                </div>
            </main>
        </div>
    );
}