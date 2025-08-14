export interface GitRepositoryInfo {
    root: string;
    currentBranch: string;
    remotes: GitRemote[];
    lastCommit: GitCommit;
    status: GitStatus;
    isGitRepository: boolean;
}

export interface GitRemote {
    name: string;
    url: string;
    type: 'github' | 'gitlab' | 'bitbucket' | 'other';
    owner?: string;
    repository?: string;
}

export interface GitCommit {
    hash: string;
    message: string;
    author: string;
    date: Date;
}

export interface GitStatus {
    isClean: boolean;
    stagedFiles: number;
    modifiedFiles: number;
    untrackedFiles: number;
    ahead: number;
    behind: number;
}

export interface PullRequest {
    id: number;
    title: string;
    url: string;
    branch: string;
    author: string;
    createdAt: Date;
    updatedAt: Date;
    isDraft: boolean;
    repository: string;
}

export interface RepositoryHostInfo {
    type: 'github' | 'gitlab' | 'bitbucket' | 'other';
    owner: string;
    repository: string;
    baseUrl: string;
    apiUrl: string;
}

export interface GitConfig {
    enabled: boolean;
    branches: string[];
    pollingInterval: number;
    showNotifications: boolean;
    includeDraftPRs: boolean;
}
