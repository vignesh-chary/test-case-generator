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
  // pathHistory now stores the full path of the current directory, not a history of steps
  const [currentPath, setCurrentPath] = useState('');
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
      fetchRepositoryFiles(owner, repoName, currentPath);
    }
  }, [accessToken, owner, repoName, currentPath]);

  const fetchRepositoryFiles = async (repoOwner: string, repoName: string, path: string) => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/auth/github/repos/${repoOwner}/${repoName}/contents/${path}`,
        {
          params: { token: accessToken },
        }
      );
      // The API returns 'dir' for folders, not 'tree'
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
    // Corrected logic: Set the current path to the full path of the selected directory.
    if (item.type === "dir") {
      setCurrentPath(item.path);
      setFileTree([]); // Clear tree to show loading state
    }
  };

  const onGoBack = () => {
    // Navigate back by getting the parent directory from the current path
    const pathParts = currentPath.split('/');
    if (pathParts.length > 1) {
      pathParts.pop(); // Remove the last part
      setCurrentPath(pathParts.join('/'));
      setFileTree([]); // Clear tree to show loading state
    } else {
      setCurrentPath('');
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

  const pathSegments = currentPath.split('/').filter(Boolean);

  return (
    <div className="repo-details-container">
      <h1 className="text-3xl font-bold mb-4">{repository?.full_name || "Repository"}</h1>
      <div className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
        <span>Path:</span>
        <span className="text-blue-600 font-medium">root</span>
        {pathSegments.map((p, index) => (
          <span key={index} className="flex items-center">
            <span className="mx-1">/</span>
            <span className="text-blue-600 font-medium">{p}</span>
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
            {currentPath !== '' && (
              <li onClick={onGoBack} className="file-tree-item text-blue-600 font-medium">
                <ArrowUp className="w-5 h-5 mr-2" />
                <span>...</span>
              </li>
            )}
            {fileTree.map(item => (
              <li
                key={item.path}
                onClick={() => item.type === 'dir' ? onNavigate(item) : onFileSelect(item)}
                className={`file-tree-item ${isFileSelected(item) ? 'selected' : ''}`}
              >
                {item.type === 'dir' ? (
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
