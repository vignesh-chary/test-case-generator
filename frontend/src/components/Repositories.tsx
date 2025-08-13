// src/components/Repositories.tsx
import React, { useEffect, useState } from "react";
import { Repository } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useError } from "../contexts/ErrorContext";
import axios from "axios";
import { useNavigate } from 'react-router-dom';
import { Loader, Github, Lock, Code } from 'lucide-react';

export function Repositories() {
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [loading, setLoading] = useState(true);
    const { accessToken } = useAuth();
    const { setError } = useError();
    const navigate = useNavigate();

    useEffect(() => {
        fetchRepositories();
    }, [accessToken]);

    const fetchRepositories = async () => {
        if (!accessToken) {
            setError('Authentication token is missing. Please log in again.');
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/auth/github/repositories`, {
                params: { token: accessToken },
            });
            setRepositories(res.data);
            setError(null);
        } catch (err: any) {
            console.error("Failed to fetch repositories:", err);
            const errorMessage = err.response?.data?.detail || "Failed to fetch repositories. Please check your GitHub permissions.";
            setError(errorMessage);
            setRepositories([]);
        } finally {
            setLoading(false);
        }
    };

    const onRepositorySelect = (repo: Repository) => {
        // This is the critical fix. The 'owner' object is not returned by the backend,
        // so we must parse the owner and repo name from the 'full_name' field.
        const [owner, repoName] = repo.full_name.split('/');
        navigate(`/dashboard/repositories/${owner}/${repoName}`, { state: { repository: repo } });
    };

    return (
        <div className="bg-white text-[#24292e] p-8 rounded-lg shadow-md">
            <div className="flex items-center space-x-3 mb-6">
                <Github className="w-8 h-8 text-[#24292e]" />
                <h1 className="text-3xl font-bold">Your Repositories</h1>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-48">
                    <Loader className="animate-spin w-8 h-8 text-[#0366d6]" />
                </div>
            ) : repositories.length === 0 ? (
                <div className="text-center text-[#586069]">
                    No repositories found.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {repositories.map((repo) => (
                        <button
                            key={repo.id}
                            onClick={() => onRepositorySelect(repo)}
                            className="group bg-[#f6f8fa] hover:bg-[#eaf0f4] border border-[#e1e4e8] rounded-lg p-5 text-left transition-all duration-200 ease-in-out transform hover:-translate-y-1 hover:border-[#0366d6] cursor-pointer"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-semibold text-[#0366d6] group-hover:text-[#005cc5] transition-colors">
                                    {repo.name}
                                </h3>
                                {repo.private && <Lock className="w-4 h-4 text-[#586069]" />}
                            </div>
                            <p className="text-sm text-[#586069] line-clamp-2">
                                {repo.description || "No description provided."}
                            </p>
                            <div className="mt-4 flex items-center space-x-4 text-xs text-[#586069]">
                                {repo.language && (
                                    <div className="flex items-center space-x-1">
                                        <Code className="w-3 h-3" />
                                        <span>{repo.language}</span>
                                    </div>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
