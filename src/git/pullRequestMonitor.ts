import * as vscode from 'vscode';
import { GitManager } from './gitManager';
import { RepositoryHostAPI } from './repositoryHostAPI';
import { PullRequest, GitConfig } from './models/gitTypes';
import { ErrorHandler } from '../utils/errorHandler';

export class PullRequestMonitor {
    private gitManager: GitManager;
    private repositoryAPI: RepositoryHostAPI;
    private pollingInterval: NodeJS.Timeout | null = null;
    private lastKnownPRs: Map<string, PullRequest[]> = new Map();
    private config: GitConfig;

    constructor(gitManager: GitManager, config: GitConfig) {
        this.gitManager = gitManager;
        this.repositoryAPI = new RepositoryHostAPI();
        this.config = config;
    }

    startMonitoring(): void {
        if (!this.config.enabled) {
            return;
        }

        // Initial check
        this.checkForNewPullRequests();

        // Set up polling
        this.pollingInterval = setInterval(() => {
            this.checkForNewPullRequests();
        }, this.config.pollingInterval);
    }

    stopMonitoring(): void {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    async checkForNewPullRequests(): Promise<void> {
        try {
            const repoInfo = await this.gitManager.getRepositoryInfo();
            if (!repoInfo || !repoInfo.remotes.length) {
                return;
            }

            // Check each remote for new PRs
            for (const remote of repoInfo.remotes) {
                if (remote.type === 'other' || !remote.owner || !remote.repository) {
                    continue;
                }

                const hostInfo = {
                    type: remote.type,
                    owner: remote.owner,
                    repository: remote.repository,
                    baseUrl: remote.url.split('/').slice(0, -1).join('/'),
                    apiUrl: this.getApiUrl(remote.type)
                };

                const currentPRs = await this.repositoryAPI.getPullRequests(hostInfo, this.config.branches);
                const lastKnownPRs = this.lastKnownPRs.get(remote.name) || [];
                
                // Find new PRs
                const newPRs = this.findNewPullRequests(lastKnownPRs, currentPRs);
                
                if (newPRs.length > 0 && this.config.showNotifications) {
                    this.showNewPullRequestNotifications(newPRs);
                }

                // Update last known PRs
                this.lastKnownPRs.set(remote.name, currentPRs);
            }
        } catch (error) {
            ErrorHandler.logError('Failed to check for new pull requests', error);
        }
    }

    private findNewPullRequests(lastKnown: PullRequest[], current: PullRequest[]): PullRequest[] {
        if (lastKnown.length === 0) {
            return current;
        }

        const lastKnownIds = new Set(lastKnown.map(pr => pr.id));
        return current.filter(pr => !lastKnownIds.has(pr.id));
    }

    private showNewPullRequestNotifications(newPRs: PullRequest[]): void {
        if (newPRs.length === 1) {
            const pr = newPRs[0];
            const message = `New pull request: ${pr.title}`;
            
            vscode.window.showInformationMessage(message, 'View PR').then(selection => {
                if (selection === 'View PR') {
                    vscode.env.openExternal(vscode.Uri.parse(pr.url));
                }
            });
        } else {
            const message = `${newPRs.length} new pull requests found`;
            
            vscode.window.showInformationMessage(message, 'View All').then(selection => {
                if (selection === 'View All') {
                    this.showPullRequestList(newPRs);
                }
            });
        }
    }

    private showPullRequestList(prs: PullRequest[]): void {
        const items = prs.map(pr => ({
            label: pr.title,
            description: `by ${pr.author} → ${pr.branch}`,
            detail: pr.url,
            pr: pr
        }));

        vscode.window.showQuickPick(items, {
            placeHolder: 'Select a pull request to view...',
            ignoreFocusOut: true
        }).then(selection => {
            if (selection) {
                vscode.env.openExternal(vscode.Uri.parse(selection.detail));
            }
        });
    }

    private getApiUrl(type: string): string {
        switch (type) {
            case 'github':
                return 'https://api.github.com';
            case 'gitlab':
                return 'https://gitlab.com/api/v4';
            case 'bitbucket':
                return 'https://api.bitbucket.org/2.0';
            default:
                return '';
        }
    }

    async getCurrentPullRequests(): Promise<PullRequest[]> {
        try {
            const repoInfo = await this.gitManager.getRepositoryInfo();
            if (!repoInfo || !repoInfo.remotes.length) {
                return [];
            }

            const allPRs: PullRequest[] = [];

            for (const remote of repoInfo.remotes) {
                if (remote.type === 'other' || !remote.owner || !remote.repository) {
                    continue;
                }

                const hostInfo = {
                    type: remote.type,
                    owner: remote.owner,
                    repository: remote.repository,
                    baseUrl: remote.url.split('/').slice(0, -1).join('/'),
                    apiUrl: this.getApiUrl(remote.type)
                };

                const prs = await this.repositoryAPI.getPullRequests(hostInfo, this.config.branches);
                allPRs.push(...prs);
            }

            return allPRs;
        } catch (error) {
            ErrorHandler.logError('Failed to get current pull requests', error);
            return [];
        }
    }

    updateConfig(newConfig: GitConfig): void {
        this.config = newConfig;
        
        if (this.config.enabled) {
            this.startMonitoring();
        } else {
            this.stopMonitoring();
        }
    }

    dispose(): void {
        this.stopMonitoring();
        this.lastKnownPRs.clear();
    }
}
