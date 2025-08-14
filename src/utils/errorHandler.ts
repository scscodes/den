import * as vscode from 'vscode';

export class ErrorHandler {
    private static readonly extensionName = 'Developer Environment';

    static logError(message: string, error?: unknown, showToUser: boolean = false): void {
        const fullMessage = `${this.extensionName}: ${message}`;
        console.error(fullMessage, error);

        if (showToUser) {
            vscode.window.showErrorMessage(fullMessage);
        }
    }

    static logWarning(message: string, showToUser: boolean = false): void {
        const fullMessage = `${this.extensionName}: ${message}`;
        console.warn(fullMessage);

        if (showToUser) {
            vscode.window.showWarningMessage(fullMessage);
        }
    }

    static logInfo(message: string, showToUser: boolean = false): void {
        const fullMessage = `${this.extensionName}: ${message}`;
        console.log(fullMessage);

        if (showToUser) {
            vscode.window.showInformationMessage(fullMessage);
        }
    }

    static handleAsyncError<T>(promise: Promise<T>, errorMessage: string): Promise<T | null> {
        return promise.catch(error => {
            this.logError(errorMessage, error, true);
            return null;
        });
    }
}
