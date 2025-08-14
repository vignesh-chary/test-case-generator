import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TestSummary, Repository, GeneratedTest } from '../types';
import { Loader } from 'lucide-react';
import axios from 'axios';
import { useAuth } from "../contexts/AuthContext";
import { useError } from "../contexts/ErrorContext";

export function SummaryGeneration() {
  const location = useLocation();
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const { setError } = useError();
  
  const [summaries, setSummaries] = useState<TestSummary[] | null>(null);
  const [repository, setRepository] = useState<Repository | null>(null);
  const [generatingForSummaryId, setGeneratingForSummaryId] = useState<string | null>(null);

  useEffect(() => {
    // Defensive check to ensure summaries and repository exist in the location state
    if (location.state?.summaries && location.state?.repository) {
      setSummaries(location.state.summaries);
      setRepository(location.state.repository);
    } else {
      // If no data, navigate back to the repository details page
      navigate(-1);
    }
  }, [location.state, navigate]);

  /**
   * Generates test code for a single, specific summary.
   * This function is now called for each individual summary, not for all files at once.
   */
  const onGenerateCodeForSummary = async (summary: TestSummary) => {
    if (!repository || !accessToken) {
      setError("Missing data to generate test code.");
      return;
    }

    setGeneratingForSummaryId(summary.title);
    setError(null);

    try {
      // API call to the backend to generate tests for a single summary.
      // The payload now correctly matches the backend's `CodeRequest` model.
      const res = await axios.post<{ code: string }>(
        `${import.meta.env.VITE_API_BASE_URL}/api/generate-test-code`,
        {
          summary: summary.description,
          framework: summary.framework,
        },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      
      // Update the response data to include the filename before navigating.
      const generatedTestWithFile: GeneratedTest = {
        file: summary.title, // Use the title of the summary as the filename
        code: res.data.code,
      };

      // Navigate to the TestGeneration page, passing the single generated test.
      // We wrap the single test in an array to maintain consistency with the next page's type.
      navigate('/dashboard/generate-tests', {
        state: {
          tests: [generatedTestWithFile],
          repository: repository,
        },
      });
    } catch (error: any) {
      console.error("Failed to generate test code:", error);
      // Correctly handle the error by setting a string message instead of the full object
      setError(error.response?.data?.detail || "Failed to generate test code.");
    } finally {
      setGeneratingForSummaryId(null);
    }
  };

  if (!summaries || !repository) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <Loader className="animate-spin w-12 h-12 text-blue-600" />
        <p className="ml-4 text-xl text-gray-700">Loading summaries...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Generated Test Summaries</h1>
      <p className="text-gray-600 mb-4">Repository: {repository.full_name}</p>
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <ul className="space-y-4">
          {summaries.map((summary, index) => (
            // ✅ FIX: Changed the key to use the unique index of the array item.
            <li key={index} className="border-b pb-4 last:border-b-0 last:pb-0">
              <h2 className="text-xl font-semibold text-gray-700">{summary.title}</h2>
              <p className="text-gray-500 mt-1">{summary.description}</p>
              <div className="mt-4">
                <button
                  onClick={() => onGenerateCodeForSummary(summary)}
                  className="py-2 px-4 bg-blue-600 text-white rounded-lg font-semibold shadow-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  disabled={generatingForSummaryId === summary.title}
                >
                  {generatingForSummaryId === summary.title && <Loader className="animate-spin w-5 h-5" />}
                  <span>{generatingForSummaryId === summary.title ? 'Generating...' : 'Generate Test Code'}</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
