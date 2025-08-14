import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { ErrorHandler } from './utils/errorHandler';

export interface DENConfig {
    name: string;
    version: string;
    environment: string;
    tools: string[];
    settings: Record<string, unknown>;
}

export interface ConfigValidationResult {
    isValid: boolean;
    errors: string[];
    warnings?: string[];
}

export class ConfigManager {
    private readonly configFileNames = [
        'den.yml', 'den.yaml', 'den.json', '.den.yml', '.den.yaml', '.den.json'
    ];
    
    private configCache: Map<string, { config: DENConfig; timestamp: number }> = new Map();
    private readonly cacheTimeout = 30000; // 30 seconds

    constructor() {
        // File watchers are now handled centrally by the extension
    }

    clearCache(): void {
        this.configCache.clear();
    }

    async loadConfiguration(): Promise<DENConfig | null> {
        try {
            // First check if user specified a custom config path
            const customPath = vscode.workspace.getConfiguration('den').get<string>('configPath');
            if (customPath) {
                const customConfig = await this.loadConfigFromPath(customPath);
                if (customConfig) {
                    return customConfig;
                }
            }

            // Auto-search for config files if enabled
            const autoSearch = vscode.workspace.getConfiguration('den').get<boolean>('autoSearch');
            if (autoSearch && vscode.workspace.workspaceFolders) {
                for (const folder of vscode.workspace.workspaceFolders) {
                    const config = await this.findConfigInWorkspace(folder.uri.fsPath);
                    if (config) {
                        return config;
                    }
                }
            }

            return null;
        } catch (error) {
            ErrorHandler.logError('Error loading configuration', error);
            return null;
        }
    }

    private async findConfigInWorkspace(workspacePath: string): Promise<DENConfig | null> {
        // Check cache first
        const cacheKey = `workspace:${workspacePath}`;
        const cached = this.configCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.config;
        }

        for (const fileName of this.configFileNames) {
            const filePath = path.join(workspacePath, fileName);
            if (fs.existsSync(filePath)) {
                const config = await this.loadConfigFromPath(filePath);
                if (config) {
                    // Cache the result
                    this.configCache.set(cacheKey, { config, timestamp: Date.now() });
                    return config;
                }
            }
        }
        return null;
    }

    private async loadConfigFromPath(filePath: string): Promise<DENConfig | null> {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const ext = path.extname(filePath).toLowerCase();
            
            let config: unknown;
            if (ext === '.json') {
                config = JSON.parse(content);
            } else if (ext === '.yml' || ext === '.yaml') {
                config = yaml.load(content);
            } else {
                ErrorHandler.logWarning(`Unsupported config file format: ${ext}`);
                return null;
            }

            return this.validateConfig(config);
        } catch (error) {
            console.error(`Error loading config from ${filePath}:`, error);
            return null;
        }
    }

    private validateConfig(config: unknown): DENConfig | null {
        // Basic validation - ensure required fields exist
        if (!config || typeof config !== 'object') {
            return null;
        }

        const configObj = config as Record<string, unknown>;

        // Return with defaults for missing fields
        return {
            name: typeof configObj.name === 'string' ? configObj.name : 'Default Environment',
            version: typeof configObj.version === 'string' ? configObj.version : '1.0.0',
            environment: typeof configObj.environment === 'string' ? configObj.environment : 'development',
            tools: Array.isArray(configObj.tools) ? configObj.tools : [],
            settings: configObj.settings && typeof configObj.settings === 'object' ? configObj.settings as Record<string, unknown> : {}
        };
    }

    async createDefaultConfig(): Promise<void> {
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }

        const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const configPath = path.join(workspacePath, 'den.yml');

        if (fs.existsSync(configPath)) {
            const overwrite = await vscode.window.showWarningMessage(
                'Configuration file already exists. Overwrite?',
                'Yes', 'No'
            );
            if (overwrite !== 'Yes') {
                return;
            }
        }

        const defaultConfig: DENConfig = {
            name: 'Developer Environment',
            version: '1.0.0',
            environment: 'development',
            tools: ['git', 'npm', 'docker'],
            settings: {
                autoSave: true,
                formatOnSave: true,
                lintOnSave: true
            }
        };

        try {
            const yamlContent = yaml.dump(defaultConfig);
            fs.writeFileSync(configPath, yamlContent, 'utf8');
            
            // Clear cache after creating new config to ensure immediate detection
            this.clearCache();
            
            vscode.window.showInformationMessage('Default configuration created successfully');
            
            // Open the created file
            const doc = await vscode.workspace.openTextDocument(configPath);
            await vscode.window.showTextDocument(doc);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create configuration: ${error}`);
        }
    }

    getDefaultConfig(): DENConfig {
        return {
            name: 'Default Environment',
            version: '1.0.0',
            environment: 'development',
            tools: [],
            settings: {}
        };
    }

    validateConfiguration(config: DENConfig): ConfigValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        if (!config.name || typeof config.name !== 'string') {
            errors.push('Missing or invalid "name" field');
        }
        
        if (!config.version || typeof config.version !== 'string') {
            errors.push('Missing or invalid "version" field');
        }
        
        if (!config.environment || typeof config.environment !== 'string') {
            errors.push('Missing or invalid "environment" field');
        }
        
        if (!Array.isArray(config.tools)) {
            errors.push('Invalid "tools" field - must be an array');
        } else if (config.tools.length === 0) {
            warnings.push('No tools specified in configuration');
        }
        
        if (!config.settings || typeof config.settings !== 'object') {
            errors.push('Invalid "settings" field - must be an object');
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    dispose(): void {
        // Clear cache
        this.clearCache();
    }
}
