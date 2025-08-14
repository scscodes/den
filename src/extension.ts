import * as vscode from 'vscode';
import { ConfigManager } from './configManager';
import { StatusBarManager } from './statusBarManager';
import { ErrorHandler } from './utils/errorHandler';
import { GitManager } from './git/gitManager';
import { PullRequestMonitor } from './git/pullRequestMonitor';
import { GitConfig } from './git/models/gitTypes';

let configManager: ConfigManager;
let statusBarManager: StatusBarManager;
let gitManager: GitManager;
let pullRequestMonitor: PullRequestMonitor;

export function activate(context: vscode.ExtensionContext) {
    ErrorHandler.logInfo('Extension is now active!');

    // Initialize managers
    configManager = new ConfigManager();
    statusBarManager = new StatusBarManager();
    gitManager = new GitManager();

    // Initialize Git configuration
    const gitConfig = getGitConfig();
    pullRequestMonitor = new PullRequestMonitor(gitManager, gitConfig);

    // Set up configuration file watcher for automatic validation
    setupConfigurationWatcher(context);

    // Register commands
    const createConfigCommand = vscode.commands.registerCommand('den.createConfig', async () => {
        await configManager.createDefaultConfig();
        // Automatically validate the newly created config
        await validateAndUpdateStatus();
    });

    const openSettingsCommand = vscode.commands.registerCommand('den.openSettings', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', 'den');
    });

    const validateConfigCommand = vscode.commands.registerCommand('den.validateConfig', async () => {
        await validateConfiguration();
    });

    const reloadConfigCommand = vscode.commands.registerCommand('den.reloadConfig', async () => {
        await reloadConfiguration();
    });

    const showConfigInfoCommand = vscode.commands.registerCommand('den.showConfigInfo', async () => {
        await showConfigurationInfo();
    });

    const clearCacheCommand = vscode.commands.registerCommand('den.clearCache', () => {
        configManager.clearCache();
        vscode.window.showInformationMessage('Configuration cache cleared');
    });

    // Git commands
    const showPRsCommand = vscode.commands.registerCommand('den.git.showPRs', async () => {
        await showPullRequests();
    });

    const switchBranchCommand = vscode.commands.registerCommand('den.git.switchBranch', async () => {
        await switchGitBranch();
    });

    const showRepositoryInfoCommand = vscode.commands.registerCommand('den.git.showRepositoryInfo', async () => {
        await showGitRepositoryInfo();
    });

    const refreshGitStatusCommand = vscode.commands.registerCommand('den.git.refreshGitStatus', async () => {
        await refreshGitStatus();
    });

    context.subscriptions.push(
        createConfigCommand, 
        openSettingsCommand, 
        validateConfigCommand, 
        reloadConfigCommand,
        showConfigInfoCommand,
        clearCacheCommand,
        showPRsCommand,
        switchBranchCommand,
        showRepositoryInfoCommand,
        refreshGitStatusCommand
    );

    // Initialize extension
    initializeExtension();
}

function getGitConfig(): GitConfig {
    const config = vscode.workspace.getConfiguration('den.git');
    return {
        enabled: config.get<boolean>('enabled', true),
        branches: config.get<string[]>('branches', ['develop', 'test', 'master', 'main']),
        pollingInterval: config.get<number>('pollingInterval', 300000),
        showNotifications: config.get<boolean>('showNotifications', true),
        includeDraftPRs: config.get<boolean>('includeDraftPRs', false)
    };
}

async function initializeExtension() {
    try {
        statusBarManager.setStatus('loading', 'Initializing...');
        
        // Search for and load configuration
        const config = await configManager.loadConfiguration();
        
        if (config) {
            statusBarManager.setStatus('success', 'Ready');
            ErrorHandler.logInfo('Configuration loaded successfully');
        } else {
            statusBarManager.setStatus('warning', 'No config found');
            ErrorHandler.logInfo('No configuration found, using defaults');
        }

        // Initialize Git functionality
        await initializeGit();
    } catch (error) {
        statusBarManager.setStatus('error', 'Error');
        ErrorHandler.logError('Failed to initialize extension', error);
    }
}

async function initializeGit(): Promise<void> {
    try {
        const isGitRepo = await gitManager.isGitRepository();
        
        if (isGitRepo) {
            const gitConfig = getGitConfig();
            if (gitConfig.enabled) {
                // Start pull request monitoring
                pullRequestMonitor.startMonitoring();
                
                // Update Git status
                await updateGitStatus();
                
                ErrorHandler.logInfo('Git functionality initialized');
            }
        } else {
            statusBarManager.hideGitStatus();
        }
    } catch (error) {
        ErrorHandler.logError('Failed to initialize Git functionality', error);
    }
}

async function updateGitStatus(): Promise<void> {
    try {
        const repoInfo = await gitManager.getRepositoryInfo();
        if (repoInfo) {
            statusBarManager.setGitStatus(
                repoInfo.currentBranch,
                repoInfo.status.isClean,
                repoInfo.status.ahead,
                repoInfo.status.behind
            );
        }
    } catch (error) {
        ErrorHandler.logError('Failed to update Git status', error);
    }
}

async function validateConfiguration(): Promise<void> {
    try {
        statusBarManager.setStatus('loading', 'Validating...');
        
        const config = await configManager.loadConfiguration();
        
        if (config) {
            // Use enhanced validation from ConfigManager
            const validation = configManager.validateConfiguration(config);
            
            if (validation.isValid) {
                statusBarManager.setStatus('success', 'Config Valid');
                let message = 'Configuration is valid!';
                
                // Show warnings if any
                if (validation.warnings && validation.warnings.length > 0) {
                    message += `\nWarnings:\n${validation.warnings.join('\n')}`;
                }
                
                vscode.window.showInformationMessage(message);
            } else {
                statusBarManager.setStatus('warning', 'Config Invalid');
                const errorMessage = `Configuration validation failed:\n${validation.errors.join('\n')}`;
                vscode.window.showWarningMessage(errorMessage);
            }
        } else {
            statusBarManager.setStatus('warning', 'No Config');
            vscode.window.showWarningMessage('No configuration file found');
        }
    } catch (error) {
        statusBarManager.setStatus('error', 'Validation Error');
        ErrorHandler.logError('Validation failed', error, true);
    }
}

async function reloadConfiguration(): Promise<void> {
    try {
        statusBarManager.setStatus('loading', 'Reloading...');
        
        const config = await configManager.loadConfiguration();
        
        if (config) {
            statusBarManager.setStatus('success', 'Reloaded');
            vscode.window.showInformationMessage('Configuration reloaded successfully!');
        } else {
            statusBarManager.setStatus('warning', 'Reload Failed');
            vscode.window.showWarningMessage('Failed to reload configuration');
        }
    } catch (error) {
        statusBarManager.setStatus('error', 'Reload Error');
        ErrorHandler.logError('Reload failed', error, true);
    }
}

async function showConfigurationInfo(): Promise<void> {
    try {
        const config = await configManager.loadConfiguration();
        
        if (config) {
            const info = `Configuration Information:
• Name: ${config.name}
• Version: ${config.version}
• Environment: ${config.environment}
• Tools: ${config.tools.length} configured
• Settings: ${Object.keys(config.settings).length} configured`;
            
            vscode.window.showInformationMessage(info);
        } else {
            vscode.window.showInformationMessage('No configuration loaded');
        }
    } catch (error) {
        ErrorHandler.logError('Failed to show configuration info', error, true);
    }
}

async function showPullRequests(): Promise<void> {
    try {
        const prs = await pullRequestMonitor.getCurrentPullRequests();
        
        if (prs.length === 0) {
            vscode.window.showInformationMessage('No pull requests found');
            return;
        }

        const items = prs.map(pr => ({
            label: pr.title,
            description: `by ${pr.author} → ${pr.branch}`,
            detail: pr.url,
            pr: pr
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a pull request to view...',
            ignoreFocusOut: true
        });

        if (selected) {
            vscode.env.openExternal(vscode.Uri.parse(selected.detail));
        }
    } catch (error) {
        ErrorHandler.logError('Failed to show pull requests', error, true);
    }
}

async function switchGitBranch(): Promise<void> {
    try {
        const branches = await gitManager.getBranchList();
        
        if (branches.length === 0) {
            vscode.window.showWarningMessage('No branches found');
            return;
        }

        const selected = await vscode.window.showQuickPick(branches, {
            placeHolder: 'Select a branch to switch to...',
            ignoreFocusOut: true
        });

        if (selected) {
            const success = await gitManager.switchBranch(selected);
            if (success) {
                vscode.window.showInformationMessage(`Switched to branch: ${selected}`);
                await updateGitStatus();
            } else {
                vscode.window.showErrorMessage(`Failed to switch to branch: ${selected}`);
            }
        }
    } catch (error) {
        ErrorHandler.logError('Failed to switch branch', error, true);
    }
}

async function showGitRepositoryInfo(): Promise<void> {
    try {
        const repoInfo = await gitManager.getRepositoryInfo();
        
        if (repoInfo) {
            const info = `Git Repository Information:
• Current Branch: ${repoInfo.currentBranch}
• Repository Root: ${repoInfo.root}
• Remotes: ${repoInfo.remotes.length}
• Last Commit: ${repoInfo.lastCommit.message}
• Status: ${repoInfo.status.isClean ? 'Clean' : 'Modified'}`;
            
            vscode.window.showInformationMessage(info);
        } else {
            vscode.window.showInformationMessage('No Git repository found');
        }
    } catch (error) {
        ErrorHandler.logError('Failed to show repository info', error, true);
    }
}

async function refreshGitStatus(): Promise<void> {
    try {
        await updateGitStatus();
        vscode.window.showInformationMessage('Git status refreshed');
    } catch (error) {
        ErrorHandler.logError('Failed to refresh Git status', error, true);
    }
}

function setupConfigurationWatcher(context: vscode.ExtensionContext): void {
    if (vscode.workspace.workspaceFolders) {
        for (const folder of vscode.workspace.workspaceFolders) {
            const watcher = vscode.workspace.createFileSystemWatcher(
                new vscode.RelativePattern(folder, '**/den.{yml,yaml,json}')
            );
            
            // Debounced event handling to prevent rapid successive events
            let createTimeout: NodeJS.Timeout | null = null;
            let changeTimeout: NodeJS.Timeout | null = null;
            let deleteTimeout: NodeJS.Timeout | null = null;
            
            watcher.onDidCreate(async () => {
                // Clear existing timeout
                if (createTimeout) {
                    clearTimeout(createTimeout);
                }
                
                // Debounce create event
                createTimeout = setTimeout(async () => {
                    // Clear cache first
                    configManager.clearCache();
                    // Then validate and update status
                    await validateAndUpdateStatus();
                }, 500); // 500ms debounce
            });
            
            watcher.onDidChange(async () => {
                // Clear existing timeout
                if (changeTimeout) {
                    clearTimeout(changeTimeout);
                }
                
                // Debounce change event
                changeTimeout = setTimeout(async () => {
                    // Clear cache first
                    configManager.clearCache();
                    // Then validate and update status
                    await validateAndUpdateStatus();
                }, 500); // 500ms debounce
            });
            
            watcher.onDidDelete(async () => {
                // Clear existing timeout
                if (deleteTimeout) {
                    clearTimeout(deleteTimeout);
                }
                
                // Debounce delete event
                deleteTimeout = setTimeout(async () => {
                    // Clear cache first
                    configManager.clearCache();
                    // Update status to reflect no config
                    statusBarManager.setStatus('warning', 'No config found');
                }, 500); // 500ms debounce
            });
            
            context.subscriptions.push(watcher);
        }
    }
}

async function validateAndUpdateStatus(): Promise<void> {
    try {
        statusBarManager.setStatus('loading', 'Validating new config...');
        
        // Reload configuration
        const config = await configManager.loadConfiguration();
        
        if (config) {
            // Validate the configuration
            const validation = configManager.validateConfiguration(config);
            
            if (validation.isValid) {
                statusBarManager.setStatus('success', 'Config Valid');
                vscode.window.showInformationMessage('Configuration validated successfully!');
                
                // Initialize Git functionality with new config
                await initializeGit();
            } else {
                statusBarManager.setStatus('warning', 'Config Invalid');
                const errorMessage = `Configuration validation failed:\n${validation.errors.join('\n')}`;
                vscode.window.showWarningMessage(errorMessage);
            }
        } else {
            statusBarManager.setStatus('warning', 'No config found');
        }
    } catch (error) {
        statusBarManager.setStatus('error', 'Validation Error');
        ErrorHandler.logError('Failed to validate new configuration', error);
    }
}

export function deactivate() {
    if (statusBarManager) {
        statusBarManager.dispose();
    }
    if (configManager) {
        configManager.dispose();
    }
    if (gitManager) {
        gitManager.dispose();
    }
    if (pullRequestMonitor) {
        pullRequestMonitor.dispose();
    }
}
