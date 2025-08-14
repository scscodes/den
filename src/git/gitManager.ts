import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';
import { GitRepositoryInfo, GitRemote, GitCommit, GitStatus, RepositoryHostInfo } from './models/gitTypes';
import { ErrorHandler } from '../utils/errorHandler';

export class GitManager {
    private git: SimpleGit | null = null;
    private repositoryInfo: GitRepositoryInfo | null = null;
    private readonly gitOptions: SimpleGitOptions = {
        baseDir: '',
        binary: 'git',
        maxConcurrentProcesses: 6,
        trimmed: false,
        config: []
    };

    constructor() {
        this.initializeGit();
    }

    private async initializeGit(): Promise<void> {
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
            const gitDir = path.join(workspaceRoot, '.git');
            
            if (fs.existsSync(gitDir)) {
                this.gitOptions.baseDir = workspaceRoot;
                this.git = simpleGit(this.gitOptions);
                await this.refreshRepositoryInfo();
            }
        }
    }

    async refreshRepositoryInfo(): Promise<GitRepositoryInfo | null> {
        if (!this.git) {
            return null;
        }

        try {
            const [currentBranch, remotes, lastCommit, status] = await Promise.all([
                this.getCurrentBranch(),
                this.getRemotes(),
                this.getLastCommit(),
                this.getStatus()
            ]);

            this.repositoryInfo = {
                root: this.gitOptions.baseDir,
                currentBranch,
                remotes,
                lastCommit,
                status,
                isGitRepository: true
            };

            return this.repositoryInfo;
        } catch (error) {
            ErrorHandler.logError('Failed to refresh repository info', error);
            return null;
        }
    }

    private async getCurrentBranch(): Promise<string> {
        if (!this.git) return '';
        
        try {
            const result = await this.git.branch();
            return result.current;
        } catch (error) {
            ErrorHandler.logError('Failed to get current branch', error);
            return '';
        }
    }

    private async getRemotes(): Promise<GitRemote[]> {
        if (!this.git) return [];
        
        try {
            const result = await this.git.getRemotes(true);
            return result.map(remote => this.parseRemote(remote));
        } catch (error) {
            ErrorHandler.logError('Failed to get remotes', error);
            return [];
        }
    }

    private parseRemote(remote: { name: string; refs: { fetch?: string; push?: string } }): GitRemote {
        const url = remote.refs.fetch || remote.refs.push || '';
        const hostInfo = this.parseRepositoryUrl(url);
        
        return {
            name: remote.name,
            url,
            type: hostInfo.type,
            owner: hostInfo.owner,
            repository: hostInfo.repository
        };
    }

    private parseRepositoryUrl(url: string): RepositoryHostInfo {
        // GitHub: https://github.com/owner/repo.git or git@github.com:owner/repo.git
        const githubMatch = url.match(/(?:https:\/\/github\.com\/|git@github\.com:)([^\/]+)\/([^\/]+?)(?:\.git)?$/);
        if (githubMatch) {
            return {
                type: 'github',
                owner: githubMatch[1],
                repository: githubMatch[2],
                baseUrl: 'https://github.com',
                apiUrl: 'https://api.github.com'
            };
        }

        // GitLab: https://gitlab.com/owner/repo.git or git@gitlab.com:owner/repo.git
        const gitlabMatch = url.match(/(?:https:\/\/gitlab\.com\/|git@gitlab\.com:)([^\/]+)\/([^\/]+?)(?:\.git)?$/);
        if (gitlabMatch) {
            return {
                type: 'gitlab',
                owner: gitlabMatch[1],
                repository: gitlabMatch[2],
                baseUrl: 'https://gitlab.com',
                apiUrl: 'https://gitlab.com/api/v4'
            };
        }

        // Bitbucket: https://bitbucket.org/owner/repo.git or git@bitbucket.org:owner/repo.git
        const bitbucketMatch = url.match(/(?:https:\/\/bitbucket\.org\/|git@bitbucket\.org:)([^\/]+)\/([^\/]+?)(?:\.git)?$/);
        if (bitbucketMatch) {
            return {
                type: 'bitbucket',
                owner: bitbucketMatch[1],
                repository: bitbucketMatch[2],
                baseUrl: 'https://bitbucket.org',
                apiUrl: 'https://api.bitbucket.org/2.0'
            };
        }

        return {
            type: 'other',
            owner: '',
            repository: '',
            baseUrl: '',
            apiUrl: ''
        };
    }

    private async getLastCommit(): Promise<GitCommit> {
        if (!this.git) {
            return { hash: '', message: '', author: '', date: new Date() };
        }
        
        try {
            const result = await this.git.log({ maxCount: 1 });
            if (result.latest) {
                return {
                    hash: result.latest.hash,
                    message: result.latest.message,
                    author: result.latest.author_name,
                    date: new Date(result.latest.date)
                };
            }
        } catch (error) {
            ErrorHandler.logError('Failed to get last commit', error);
        }

        return { hash: '', message: '', author: '', date: new Date() };
    }

    private async getStatus(): Promise<GitStatus> {
        if (!this.git) {
            return { isClean: true, stagedFiles: 0, modifiedFiles: 0, untrackedFiles: 0, ahead: 0, behind: 0 };
        }
        
        try {
            const status = await this.git.status();
            return {
                isClean: status.isClean(),
                stagedFiles: status.staged.length,
                modifiedFiles: status.modified.length,
                untrackedFiles: status.not_added.length,
                ahead: status.ahead,
                behind: status.behind
            };
        } catch (error) {
            ErrorHandler.logError('Failed to get status', error);
            return { isClean: true, stagedFiles: 0, modifiedFiles: 0, untrackedFiles: 0, ahead: 0, behind: 0 };
        }
    }

    async getRepositoryInfo(): Promise<GitRepositoryInfo | null> {
        if (!this.repositoryInfo) {
            return await this.refreshRepositoryInfo();
        }
        return this.repositoryInfo;
    }

    async isGitRepository(): Promise<boolean> {
        if (!this.git) return false;
        
        try {
            const result = await this.git.checkIsRepo();
            return result;
        } catch (error) {
            return false;
        }
    }

    async getBranchList(): Promise<string[]> {
        if (!this.git) return [];
        
        try {
            const result = await this.git.branch();
            return result.all;
        } catch (error) {
            ErrorHandler.logError('Failed to get branch list', error);
            return [];
        }
    }

    async switchBranch(branchName: string): Promise<boolean> {
        if (!this.git) return false;
        
        try {
            await this.git.checkout(branchName);
            await this.refreshRepositoryInfo();
            return true;
        } catch (error) {
            ErrorHandler.logError(`Failed to switch to branch ${branchName}`, error);
            return false;
        }
    }

    dispose(): void {
        this.git = null;
        this.repositoryInfo = null;
    }
}
