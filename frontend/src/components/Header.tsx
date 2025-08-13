// src/components/Header.tsx
import React from 'react';
import { Github, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom'; // Import the useNavigate hook
import { useError } from '../contexts/ErrorContext'; // Import the useError hook

export function Header() {
    const { user, logout } = useAuth();
    const navigate = useNavigate(); // Initialize the useNavigate hook
    const { setError } = useError(); // Initialize the useError hook

    const handleLogout = () => {
        logout();
        setError(null); // Clear any active error message
        navigate('/'); // Navigate to the home page after logging out
    };

    return (
        <header className="bg-white/80 backdrop-blur-md border-b border-[#e1e4e8] sticky top-0 z-50">
            <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <Github className="h-8 w-8 text-[#24292e]" />
                    <h1 className="text-xl font-bold text-[#24292e]">AI Test Generator</h1>
                </div>

                {user && (
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <img
                                src={user.avatar_url}
                                alt={user.name}
                                className="w-8 h-8 rounded-full border border-[#e1e4e8]"
                            />
                            <span className="text-sm font-medium text-[#586069] hidden sm:block">{user.name || user.login}</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center space-x-1 px-3 py-2 text-sm text-[#586069] bg-[#f6f8fa] border border-[#d1d5da] rounded-lg hover:bg-[#eaf0f4] transition-colors"
                        >
                            <LogOut className="h-4 w-4" />
                            <span className="hidden sm:block">Logout</span>
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}