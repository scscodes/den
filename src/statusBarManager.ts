import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export type StatusType = 'loading' | 'warning' | 'error' | 'success';

export class StatusBarManager {
    private statusBarItem: vscode.StatusBarItem;
    private gitStatusBarItem: vscode.StatusBarItem;
    private readonly statusIcons = {
        'loading': '$(sync~spin)',
        'warning': '$(warning)',
        'error': '$(error)',
        'success': '$(check)'
    };
    private currentStatus: StatusType | null = null;
    private currentText: string | null = null;
    private clickCommandDisposable: vscode.Disposable | null = null;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.name = 'Developer Environment';
        this.statusBarItem.tooltip = 'Developer Environment - Click for options';
        this.statusBarItem.show();
        
        // Create Git status bar item
        this.gitStatusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            99
        );
        this.gitStatusBarItem.name = 'Git Status';
        this.gitStatusBarItem.tooltip = 'Git Repository Status - Click for options';
        
        // Add click handler for context menu
        this.setupClickHandler();
    }

    private setupClickHandler(): void {
        // Create a disposable command that will be executed when the status bar item is clicked
        const disposable = vscode.commands.registerCommand('den.statusBarClick', () => {
            this.showContextMenu();
        });
        
        // Set the command on the status bar item
        this.statusBarItem.command = 'den.statusBarClick';
        
        // Store the disposable for cleanup
        this.clickCommandDisposable = disposable;
    }

    private async showContextMenu(): Promise<void> {
        const options = [
            { label: '$(gear) Settings', value: 'settings' },
            { label: '$(plus) Create Config', value: 'create-config' },
            { label: '$(check) Validate Config', value: 'validate' },
            { label: '$(refresh) Reload Config', value: 'reload' }
        ];

        // Add Git options if Git is available
        try {
            const isGitRepo = await this.checkGitAvailability();
            if (isGitRepo) {
                options.push(
                    { label: '$(git-branch) Git Status', value: 'git-status' },
                    { label: '$(git-pull-request) Pull Requests', value: 'prs' }
                );
            }
        } catch (error) {
            // Git check failed, don't add Git options
        }

        const selected = await vscode.window.showQuickPick(options, {
            placeHolder: 'Select an option...',
            ignoreFocusOut: true
        });

        if (selected) {
            switch (selected.value) {
                case 'settings':
                    vscode.commands.executeCommand('workbench.action.openSettings', 'den');
                    break;
                case 'create-config':
                    vscode.commands.executeCommand('den.createConfig');
                    break;
                case 'validate':
                    vscode.commands.executeCommand('den.validateConfig');
                    break;
                case 'reload':
                    vscode.commands.executeCommand('den.reloadConfig');
                    break;
                case 'git-status':
                    vscode.commands.executeCommand('den.git.showRepositoryInfo');
                    break;
                case 'prs':
                    vscode.commands.executeCommand('den.git.showPRs');
                    break;
            }
        }
    }

    private async checkGitAvailability(): Promise<boolean> {
        try {
            // Check if we're in a Git repository by looking for .git directory
            if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
                const gitDir = path.join(workspaceRoot, '.git');
                return fs.existsSync(gitDir);
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    setStatus(status: StatusType, text: string): void {
        // Only update if status or text has changed
        if (this.currentStatus === status && this.currentText === text) {
            return;
        }

        this.currentStatus = status;
        this.currentText = text;

        const icon = this.statusIcons[status];
        this.statusBarItem.text = `${icon} DEN: ${text}`;
        
        // Set appropriate colors based on status
        switch (status) {
            case 'success':
                this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
                break;
            case 'error':
                this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
                break;
            case 'warning':
                this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
                break;
            case 'loading':
                this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
                break;
        }
    }

    setGitStatus(branch: string, isClean: boolean, ahead: number, behind: number): void {
        let icon = '$(git-branch)';
        let text = branch;
        
        if (!isClean) {
            icon = '$(git-branch) $(warning)';
        }
        
        if (ahead > 0 || behind > 0) {
            text += ` ↑${ahead} ↓${behind}`;
        }
        
        this.gitStatusBarItem.text = `${icon} ${text}`;
        this.gitStatusBarItem.show();
    }

    hideGitStatus(): void {
        this.gitStatusBarItem.hide();
    }

    updateStatus(status: StatusType, text: string): void {
        this.setStatus(status, text);
    }

    show(): void {
        this.statusBarItem.show();
    }

    hide(): void {
        this.statusBarItem.hide();
    }

    dispose(): void {
        this.statusBarItem.dispose();
        this.gitStatusBarItem.dispose();
        if (this.clickCommandDisposable) {
            this.clickCommandDisposable.dispose();
        }
    }
}
