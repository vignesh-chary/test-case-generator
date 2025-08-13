// src/components/AuthScreen.tsx
import React from 'react';
import { Github, Zap, Code, GitBranch } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useError } from '../contexts/ErrorContext'; // Import the new error hook

export function AuthScreen() {
    const { login, loading } = useAuth();
    const { error } = useError(); // Use the global error context

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-900 px-4 py-12">
            <div className="max-w-4xl mx-auto text-center">
                <div className="mb-10">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-blue-600 rounded-3xl mb-6 shadow-xl">
                        <Github className="h-14 w-14 text-white" />
                    </div>
                    <h1 className="text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
                        AI-Powered Test Case Generator
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto font-light">
                        Automate the boring parts of testing. Our tool integrates with GitHub to generate intelligent test cases, helping you ship high-quality code faster.
                    </p>
                </div>

                {/* Display error message if it exists */}
                {error && (
                    <div className="mb-6 p-4 bg-red-100 text-red-700 border border-red-200 rounded-lg max-w-lg mx-auto">
                        <p className="font-medium">Error: {error}</p>
                    </div>
                )}

                <div className="grid md:grid-cols-3 gap-8 mb-12">
                    <FeatureCard
                        icon={<Code className="h-6 w-6 text-blue-600" />}
                        title="Smart File Analysis"
                        description="Browse your GitHub repositories and select multiple files for intelligent test case analysis."
                        iconBg="bg-blue-100"
                    />
                    <FeatureCard
                        icon={<Zap className="h-6 w-6 text-green-600" />}
                        title="AI-Generated Tests"
                        description="Leverage a local AI model to get comprehensive test cases for various frameworks."
                        iconBg="bg-green-100"
                    />
                    <FeatureCard
                        icon={<GitBranch className="h-6 w-6 text-purple-600" />}
                        title="Auto PR Creation"
                        description="Easily create new branches and pull requests on GitHub with your generated test files."
                        iconBg="bg-purple-100"
                    />
                </div>

                <button
                    onClick={login}
                    disabled={loading}
                    className="inline-flex items-center space-x-4 px-10 py-5 bg-gray-900 text-white rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Github className="h-7 w-7" />
                    <span className="text-xl font-semibold">{loading ? 'Connecting...' : 'Connect with GitHub'}</span>
                </button>
                
                <p className="text-sm text-gray-500 mt-6">
                    This application requires access to your repositories. We will not store your code.
                </p>
            </div>
        </div>
    );
}

interface FeatureCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    iconBg: string;
}

function FeatureCard({ icon, title, description, iconBg }: FeatureCardProps) {
    return (
        <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-md transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl">
            <div className={`inline-flex items-center justify-center w-14 h-14 ${iconBg} rounded-xl mb-6`}>
                {icon}
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600 text-base">{description}</p>
        </div>
    );
}