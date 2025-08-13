// src/components/RepoDetails.tsx
import { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom"; // Added useNavigate
import { FileNode, Repository } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useError } from "../contexts/ErrorContext";
import axios from "axios";
import { FolderOpen, FileText, Loader, ArrowUp } from "lucide-react";
import { SelectedFilesFooter } from "./SelectedFilesFooter";
import "./RepoDetails.css";


export function RepoDetails() {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [pathHistory, setPathHistory] = useState<string[]>(['']);
  const [selectedFiles, setSelectedFiles] = useState<FileNode[]>([]);
  const [generatingTests, setGeneratingTests] = useState(false); // New state for test generation loading

  const { owner, repoName } = useParams<{ owner: string; repoName: string }>();

  const { accessToken } = useAuth();
  const { setError } = useError();
  const location = useLocation();
  const navigate = useNavigate(); // Hook for navigation
  const repository = location.state?.repository as Repository;

  useEffect(() => {
    if (accessToken && owner && repoName) {
      fetchRepositoryFiles(owner, repoName, pathHistory[pathHistory.length - 1]);
    }
  }, [accessToken, owner, repoName, pathHistory]);

  const fetchRepositoryFiles = async (repoOwner: string, repoName: string, path: string) => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/auth/github/repos/${repoOwner}/${repoName}/contents/${path}`,
        {
          params: { token: accessToken },
        }
      );
      setFileTree(res.data.filter((item: any) => item.type === "file" || item.type === "dir"));
      setError(null);
    } catch (err: any) {
      console.error("Failed to fetch files:", err);
      setError("Failed to fetch files. Check permissions or try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchFileContent = async (file: FileNode) => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/auth/github/repos/${owner}/${repoName}/contents/${file.path}`,
        {
          params: { token: accessToken },
        }
      );
      // The backend returns a base64 encoded content string
      return atob(res.data.content);
    } catch (err: any) {
      // Corrected to use path to get the name
      console.error(`Failed to fetch content for ${file.path.split('/').pop()}:`, err);
      setError(`Failed to fetch content for ${file.path.split('/').pop()}.`);
      return null;
    }
  };

  const onNavigate = (item: FileNode) => {
    if (item.type === "tree") {
      const newPath = pathHistory[pathHistory.length - 1] === '' ? item.path : `${pathHistory[pathHistory.length - 1]}/${item.path}`;
      setPathHistory(prev => [...prev, newPath]);
      setFileTree([]);
    }
  };

  const onGoBack = () => {
    if (pathHistory.length > 1) {
      setPathHistory(prev => prev.slice(0, prev.length - 1));
      setFileTree([]);
    }
  };

  const onFileSelect = (file: FileNode) => {
    setSelectedFiles(prev => {
      const isSelected = prev.find(f => f.path === file.path);
      if (isSelected) {
        return prev.filter(f => f.path !== file.path);
      } else {
        return [...prev, file];
      }
    });
  };

  const isFileSelected = (file: FileNode) => {
    return selectedFiles.some(f => f.path === file.path);
  };

  const onGenerateTests = async () => {
    setGeneratingTests(true);
    setError(null);
    try {
      const filePromises = selectedFiles.map(file => fetchFileContent(file));
      const fileContents = await Promise.all(filePromises);

      // Filter out any files that failed to fetch
      const filesWithContent = selectedFiles
        .map((file, index) => ({
          // Corrected to use path to get the filename consistently
          filename: file.path.split('/').pop(),
          content: fileContents[index],
        }))
        .filter(file => file.content !== null);

      if (filesWithContent.length === 0) {
        setError("Could not fetch content for any of the selected files.");
        setGeneratingTests(false);
        return;
      }

      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/generate-summaries`,
        { files: filesWithContent }
      );

      // Navigate to the next page, passing the summaries and file content as state
      navigate('/dashboard/generate-summaries', {
        state: {
          summaries: res.data.summaries,
          files: filesWithContent,
          repository: repository
        }
      });
    } catch (err: any) {
      console.error("Failed to generate summaries:", err);
      setError(err.response?.data?.detail || "Failed to generate test summaries.");
    } finally {
      setGeneratingTests(false);
    }
  };

  return (
    <div className="repo-details-container">
      <h1 className="text-3xl font-bold mb-4">{repository?.full_name || "Repository"}</h1>
      <div className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
        <span>Path:</span>
        {pathHistory.map((p, index) => (
          <span key={index}>
            {index > 0 && <span>/</span>}
            <span className="text-blue-600 font-medium">{p.split('/').filter(Boolean).pop() || "root"}</span>
          </span>
        ))}
      </div>

      <div className="file-tree-container bg-white rounded-lg shadow-md">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader className="animate-spin w-8 h-8 text-blue-600" />
          </div>
        ) : (
          <ul className="p-4">
            {pathHistory.length > 1 && (
              <li onClick={onGoBack} className="file-tree-item text-blue-600 font-medium">
                <ArrowUp className="w-5 h-5 mr-2" />
                <span>...</span>
              </li>
            )}
            {fileTree.map(item => (
              <li
                key={item.path}
                onClick={() => item.type === 'tree' ? onNavigate(item) : onFileSelect(item)}
                className={`file-tree-item ${isFileSelected(item) ? 'selected' : ''}`}
              >
                {item.type === 'tree' ? (
                  <FolderOpen className="w-5 h-5 mr-2 text-gray-500" />
                ) : (
                  <FileText className="w-5 h-5 mr-2 text-gray-500" />
                )}
                <span>{item.path.split('/').pop()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <SelectedFilesFooter selectedFileCount={selectedFiles.length} onGenerateTests={onGenerateTests} isLoading={generatingTests} />
    </div>
  );
}
