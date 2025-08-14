import axios, { AxiosResponse } from 'axios';
import { RepositoryHostInfo, PullRequest } from './models/gitTypes';
import { ErrorHandler } from '../utils/errorHandler';

export class RepositoryHostAPI {
    private readonly userAgent = 'DEN-Extension/1.0.0';

    async getPullRequests(hostInfo: RepositoryHostInfo, branches: string[]): Promise<PullRequest[]> {
        if (hostInfo.type === 'other') {
            return [];
        }

        try {
            switch (hostInfo.type) {
                case 'github':
                    return await this.getGitHubPullRequests(hostInfo, branches);
                case 'gitlab':
                    return await this.getGitLabPullRequests(hostInfo, branches);
                case 'bitbucket':
                    return await this.getBitbucketPullRequests(hostInfo, branches);
                default:
                    return [];
            }
        } catch (error) {
            ErrorHandler.logError(`Failed to fetch pull requests from ${hostInfo.type}`, error);
            return [];
        }
    }

    private async getGitHubPullRequests(hostInfo: RepositoryHostInfo, branches: string[]): Promise<PullRequest[]> {
        const url = `${hostInfo.apiUrl}/repos/${hostInfo.owner}/${hostInfo.repository}/pulls`;
        const params = {
            state: 'open',
            per_page: 100,
            sort: 'updated',
            direction: 'desc'
        };

        try {
            const response: AxiosResponse = await axios.get(url, {
                params,
                headers: { 'User-Agent': this.userAgent }
            });

            return response.data
                .filter((pr: { base: { ref: string } }) => branches.includes(pr.base.ref))
                .map((pr: { 
                    number: number; 
                    title: string; 
                    html_url: string; 
                    base: { ref: string }; 
                    user: { login: string }; 
                    created_at: string; 
                    updated_at: string; 
                    draft: boolean 
                }) => ({
                    id: pr.number,
                    title: pr.title,
                    url: pr.html_url,
                    branch: pr.base.ref,
                    author: pr.user.login,
                    createdAt: new Date(pr.created_at),
                    updatedAt: new Date(pr.updated_at),
                    isDraft: pr.draft,
                    repository: `${hostInfo.owner}/${hostInfo.repository}`
                }));
        } catch (error) {
            ErrorHandler.logError('Failed to fetch GitHub pull requests', error);
            return [];
        }
    }

    private async getGitLabPullRequests(hostInfo: RepositoryHostInfo, branches: string[]): Promise<PullRequest[]> {
        const url = `${hostInfo.apiUrl}/projects/${encodeURIComponent(`${hostInfo.owner}/${hostInfo.repository}`)}/merge_requests`;
        const params = {
            state: 'opened',
            per_page: 100,
            order_by: 'updated_at',
            sort: 'desc'
        };

        try {
            const response: AxiosResponse = await axios.get(url, {
                params,
                headers: { 'User-Agent': this.userAgent }
            });

            return response.data
                .filter((mr: { target_branch: string }) => branches.includes(mr.target_branch))
                .map((mr: { 
                    iid: number; 
                    title: string; 
                    web_url: string; 
                    target_branch: string; 
                    author: { username: string }; 
                    created_at: string; 
                    updated_at: string; 
                    work_in_progress: boolean 
                }) => ({
                    id: mr.iid,
                    title: mr.title,
                    url: mr.web_url,
                    branch: mr.target_branch,
                    author: mr.author.username,
                    createdAt: new Date(mr.created_at),
                    updatedAt: new Date(mr.updated_at),
                    isDraft: mr.work_in_progress,
                    repository: `${hostInfo.owner}/${hostInfo.repository}`
                }));
        } catch (error) {
            ErrorHandler.logError('Failed to fetch GitLab merge requests', error);
            return [];
        }
    }

    private async getBitbucketPullRequests(hostInfo: RepositoryHostInfo, branches: string[]): Promise<PullRequest[]> {
        const url = `${hostInfo.apiUrl}/repositories/${hostInfo.owner}/${hostInfo.repository}/pullrequests`;
        const params = {
            state: 'OPEN',
            pagelen: 100
        };

        try {
            const response: AxiosResponse = await axios.get(url, {
                params,
                headers: { 'User-Agent': this.userAgent }
            });

            return response.data.values
                .filter((pr: { destination: { branch: { name: string } } }) => branches.includes(pr.destination.branch.name))
                .map((pr: { 
                    id: number; 
                    title: string; 
                    links: { html: { href: string } }; 
                    destination: { branch: { name: string } }; 
                    author: { username: string }; 
                    created_on: string; 
                    updated_on: string 
                }) => ({
                    id: pr.id,
                    title: pr.title,
                    url: pr.links.html.href,
                    branch: pr.destination.branch.name,
                    author: pr.author.username,
                    createdAt: new Date(pr.created_on),
                    updatedAt: new Date(pr.updated_on),
                    isDraft: false, // Bitbucket doesn't have draft PRs
                    repository: `${hostInfo.owner}/${hostInfo.repository}`
                }));
        } catch (error) {
            ErrorHandler.logError('Failed to fetch Bitbucket pull requests', error);
            return [];
        }
    }

    async getRepositoryInfo(hostInfo: RepositoryHostInfo): Promise<Record<string, unknown> | null> {
        if (hostInfo.type === 'other') {
            return null;
        }

        try {
            switch (hostInfo.type) {
                case 'github':
                    return await this.getGitHubRepositoryInfo(hostInfo);
                case 'gitlab':
                    return await this.getGitLabRepositoryInfo(hostInfo);
                case 'bitbucket':
                    return await this.getBitbucketRepositoryInfo(hostInfo);
                default:
                    return null;
            }
        } catch (error) {
            ErrorHandler.logError(`Failed to fetch repository info from ${hostInfo.type}`, error);
            return null;
        }
    }

    private async getGitHubRepositoryInfo(hostInfo: RepositoryHostInfo): Promise<Record<string, unknown> | null> {
        const url = `${hostInfo.apiUrl}/repos/${hostInfo.owner}/${hostInfo.repository}`;
        
        try {
            const response: AxiosResponse = await axios.get(url, {
                headers: { 'User-Agent': this.userAgent }
            });
            return response.data;
        } catch (error) {
            ErrorHandler.logError('Failed to fetch GitHub repository info', error);
            return null;
        }
    }

    private async getGitLabRepositoryInfo(hostInfo: RepositoryHostInfo): Promise<Record<string, unknown> | null> {
        const url = `${hostInfo.apiUrl}/projects/${encodeURIComponent(`${hostInfo.owner}/${hostInfo.repository}`)}`;
        
        try {
            const response: AxiosResponse = await axios.get(url, {
                headers: { 'User-Agent': this.userAgent }
            });
            return response.data;
        } catch (error) {
            ErrorHandler.logError('Failed to fetch GitLab repository info', error);
            return null;
        }
    }

    private async getBitbucketRepositoryInfo(hostInfo: RepositoryHostInfo): Promise<Record<string, unknown> | null> {
        const url = `${hostInfo.apiUrl}/repositories/${hostInfo.owner}/${hostInfo.repository}`;
        
        try {
            const response: AxiosResponse = await axios.get(url, {
                headers: { 'User-Agent': this.userAgent }
            });
            return response.data;
        } catch (error) {
            ErrorHandler.logError('Failed to fetch Bitbucket repository info', error);
            return null;
        }
    }
}
