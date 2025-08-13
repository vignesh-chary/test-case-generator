// src/types.ts

// Define the Owner type first, as it's a nested object within Repository
export interface Owner {
  id: number;
  login: string;
  avatar_url: string;
}

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  description?: string;
  private: boolean;
  language?: string;
  updated_at?: string;
  stargazers_count?: number;
  default_branch?: string;
  owner: Owner;
}

// This is the missing type that RepoDetails.tsx requires
export interface FileNode {
  path: string;
  type: 'blob' | 'tree';
  url: string;
  sha: string;
  size?: number;
  selected?: boolean;
}

// Your other types
export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  content?: string;
}

export interface TestSummary {
  file: string;
  title: string;
  description: string;
  framework?: string;
  code?: string;
}
export interface GeneratedTest {
  file: string;
  code: string;
}

export interface FileInput {
  filename: string;
  content: string;
}
