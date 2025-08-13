import React, { useState } from "react";
import { GeneratedTest, Repository } from "../types";
import { Clipboard, Check, Download, ArrowLeft, Github, Loader } from "lucide-react";
import axios from 'axios';
import { useAuth } from "../contexts/AuthContext";
import { useError } from "../contexts/ErrorContext";
import { useLocation, useNavigate } from "react-router-dom";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vs } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface LocationState {
    tests: GeneratedTest[];
    repository: Repository;
}

export function TestGeneration() {
    const navigate = useNavigate();
    const { state } = useLocation();
    const { accessToken } = useAuth();
    const { setError } = useError();

    const { tests, repository } = (state as LocationState) || { tests: [], repository: null };

    const [copied, setCopied] = useState<string | null>(null);
    const [prStatus, setPrStatus] = useState<string | null>(null);
    const [isCreatingPr, setIsCreatingPr] = useState(false);

    // If we have no tests or repository, we need to handle this gracefully
    if (!tests || !repository) {
        setError("Missing test data or repository. Please start the generation process again.");
        return (
            <div className="text-center p-12">
                <p className="text-gray-600">No test code to display.</p>
                <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-gray-200 rounded-md">Go Back</button>
            </div>
        );
    }
    
    // Unchanged helper functions
    const copy = async (code: string, id: string) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(id);
            setTimeout(() => setCopied(null), 2000);
        } catch {
            setError("Failed to copy code to clipboard.");
        }
    };

    const download = (code: string, filename: string) => {
        const blob = new Blob([code], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${filename}.test.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const createPullRequest = async () => {
        if (!accessToken || !repository || !tests.length) {
            setError("Missing data to create pull request.");
            return;
        }

        setIsCreatingPr(true);
        setPrStatus('Creating...');
        setError(null);

        // Filter out any tests that are missing the file name before creating the payload
        const validTests = tests.filter(test => test.file && typeof test.file === 'string');
        if (validTests.length === 0) {
            setError("No valid test files to create a pull request.");
            setIsCreatingPr(false);
            setPrStatus('Failed');
            return;
        }
        
        const payload = {
            repo: repository.full_name,
            files: validTests.map(test => ({ file: test.file, code: test.code })),
        };

        // Log the corrected payload to the console before sending
        console.log("Corrected Request Payload:", payload);

        try {
            const res = await axios.post(
                `${import.meta.env.VITE_API_BASE_URL}/auth/create-pr`,
                payload, // Use the corrected payload variable
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            setPrStatus('Success!');
            // Open the PR URL in a new tab
            if (res.data.url) {
                window.open(res.data.url, '_blank');
            }
        } catch (error: any) {
            console.error('Failed to create PR:', error);
            const errorDetail = error.response?.data?.detail;
            
            let errorMessage = 'Failed to create PR. Please check your GitHub permissions or try again.';

            // Check if the error detail is an array of validation errors
            if (Array.isArray(errorDetail)) {
                // Map the array of objects to a single, readable string
                errorMessage = `Validation Error: ${errorDetail.map(e => `${e.loc.join('.')}: ${e.msg}`).join('; ')}`;
            } else if (typeof errorDetail === 'string') {
                // If it's a simple string, use it directly
                errorMessage = errorDetail;
            }

            setPrStatus('Failed');
            setError(errorMessage);
        } finally {
            setIsCreatingPr(false);
        }
    };

    return (
        <div className="bg-white border border-[#e1e4e8] rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#e1e4e8]">
                <h2 className="text-xl font-semibold text-[#24292e]">Generated Test Code</h2>
                <div className="flex items-center space-x-3">
                    <button onClick={() => navigate(-1)} className="text-sm text-[#0366d6] hover:text-[#005cc5] transition-colors flex items-center space-x-1">
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back</span>
                    </button>
                    <button
                        onClick={createPullRequest}
                        className="bg-[#28a745] text-white px-3 py-1 rounded-lg text-sm font-semibold disabled:bg-[#d1d5da] disabled:cursor-not-allowed flex items-center space-x-2 transition-colors hover:bg-[#218838]"
                        disabled={isCreatingPr}
                    >
                        {isCreatingPr ? <Loader className="w-4 h-4 animate-spin"/> : <Github className="w-4 h-4" />}
                        <span>{isCreatingPr ? 'Creating...' : prStatus || 'Create PR'}</span>
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {tests.map((t) => {
                    const id = `${t.file}`;
                    return (
                        <div key={id} className="relative border border-[#e1e4e8] rounded-lg">
                            <div className="flex items-center justify-between bg-[#f6f8fa] px-4 py-2 rounded-t-lg">
                                <div className="font-medium text-[#24292e] text-sm">{t.file}</div>
                                <div className="flex items-center space-x-2">
                                    <button onClick={() => copy(t.code, id)} className="text-sm text-[#586069] hover:text-[#0366d6] transition-colors flex items-center space-x-1">
                                        {copied === id ? <><Check className="w-4 h-4 text-green-500"/> <span className="text-green-500">Copied!</span></> : <><Clipboard className="w-4 h-4"/> <span>Copy</span></>}
                                    </button>
                                    <button onClick={() => download(t.code, t.file)} className="text-sm text-[#586069] hover:text-[#0366d6] transition-colors flex items-center space-x-1">
                                        <Download className="w-4 h-4" />
                                        <span>Download</span>
                                    </button>
                                </div>
                            </div>
                            <SyntaxHighlighter language="javascript" style={vs} customStyle={{
                                fontSize: '14px',
                                padding: '16px',
                                borderRadius: '0 0 8px 8px',
                                margin: 0,
                                backgroundColor: '#ffffff',
                                color: '#24292e'
                            }}>
                                {t.code}
                            </SyntaxHighlighter>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
