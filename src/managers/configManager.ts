import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { FTPConfig, DEFAULT_FTP_CONFIG } from '../types/config';
import { Logger } from '../utils/logger';
import { PathUtils } from '../utils/pathUtils';

export class ConfigManager {
  private static instance: ConfigManager;
  private config: FTPConfig | null = null;
  private configPath: string | null = null;
  private logger = Logger.getInstance();
  private configWatcher: vscode.FileSystemWatcher | null = null;
  private onConfigChangedEmitter = new vscode.EventEmitter<FTPConfig | null>();
  public readonly onConfigChanged = this.onConfigChangedEmitter.event;
  private configReloadDebounceTimer: NodeJS.Timeout | null = null; // Added for debounce
  private readonly CONFIG_RELOAD_DELAY = 2000; // Delay in milliseconds (2 seconds)

  private constructor() {}

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public async initialize(): Promise<void> {
    await this.loadConfig();
    this.setupConfigWatcher();
  }

  public async createConfig(): Promise<void> {
    const workspaceRoot = PathUtils.getWorkspaceRoot();
    if (!workspaceRoot) {
      this.logger.error('No workspace folder found. Please open a workspace first.');
      this.logger.show();
      return;
    }

    const configPath = path.join(workspaceRoot, 'smartftp.json');
    
    if (fs.existsSync(configPath)) {
      const overwrite = await vscode.window.showWarningMessage(
        'smartftp.json already exists. Do you want to overwrite it?',
        'Yes', 'No'
      );
      if (overwrite !== 'Yes') {
        return;
      }
    }

    try {
      const configContent = JSON.stringify(DEFAULT_FTP_CONFIG, null, 2);
      fs.writeFileSync(configPath, configContent, 'utf8');
      this.logger.success(`Created Smart FTP configuration file: ${configPath}`);
      this.logger.info('Smart FTP configuration file created successfully!');
      this.logger.show();
      
      // Open the config file for editing
      const document = await vscode.workspace.openTextDocument(configPath);
      await vscode.window.showTextDocument(document);
      
      // Load config immediately after creation
      await this.loadConfig(); 
    } catch (error) {
      this.logger.error('Failed to create Smart FTP configuration file', error as Error);
      this.logger.show();
    }
  }

  public async loadConfig(): Promise<FTPConfig | null> {
    const workspaceRoot = PathUtils.getWorkspaceRoot();
    if (!workspaceRoot) {
      return null;
    }

    const configPath = path.join(workspaceRoot, 'smartftp.json');
    this.configPath = configPath;

    if (!fs.existsSync(configPath)) {
      this.logger.info('No smartftp.json configuration file found');
      if (this.config !== null) { // Only fire event if config state changes
        this.config = null;
        this.onConfigChangedEmitter.fire(null);
      }
      return null;
    }

    try {
      const configContent = fs.readFileSync(configPath, 'utf8');
      const parsedConfig = JSON.parse(configContent) as FTPConfig;
      
      // Validate required fields
      if (!this.validateConfig(parsedConfig)) {
        throw new Error('Invalid configuration format');
      }

      // Check if config actually changed before firing event
      if (JSON.stringify(this.config) !== JSON.stringify(parsedConfig)) {
          this.config = parsedConfig;
          this.logger.success(`Loaded Smart FTP configuration: ${parsedConfig.name || 'Default'}`);
          this.onConfigChangedEmitter.fire(this.config);
      } else {
          this.logger.info('Configuration file reloaded, but no changes detected.');
      }
      return this.config;
    } catch (error) {
      this.logger.error('Failed to load Smart FTP configuration. Please check smartftp.json format.', error as Error);
      this.logger.show();
      if (this.config !== null) { // Only fire event if config state changes
        this.config = null;
        this.onConfigChangedEmitter.fire(null);
      }
      return null;
    }
  }

  private validateConfig(config: any): config is FTPConfig {
    // Allow 'name' to be optional or empty
    const required = ['host', 'protocol', 'port', 'username', 'password', 'remotePath'];
    
    for (const field of required) {
      if (!(field in config) || config[field] === undefined || config[field] === '') {
        // Allow empty password if explicitly set to empty string
        if (field === 'password' && config[field] === '') continue;
        this.logger.error(`Missing or empty required field in smartftp.json: ${field}`);
        return false;
      }
    }

    if (!['ftp', 'sftp'].includes(config.protocol)) {
      this.logger.error('Protocol must be either "ftp" or "sftp" in smartftp.json');
      return false;
    }

    if (typeof config.port !== 'number' || !Number.isInteger(config.port) || config.port <= 0 || config.port > 65535) {
      this.logger.error('Port must be an integer between 1 and 65535 in smartftp.json');
      return false;
    }

    // Add more specific validation as needed (e.g., watcher properties)

    return true;
  }

  private setupConfigWatcher(): void {
    if (this.configWatcher) {
      this.configWatcher.dispose();
    }

    const workspaceRoot = PathUtils.getWorkspaceRoot();
    if (!workspaceRoot) {
      return;
    }

    const pattern = new vscode.RelativePattern(workspaceRoot, 'smartftp.json');
    this.configWatcher = vscode.workspace.createFileSystemWatcher(pattern);

    this.configWatcher.onDidChange(() => {
      this.logger.info('Smart FTP configuration file change detected. Debouncing reload...');
      // Clear existing timer if there is one
      if (this.configReloadDebounceTimer) {
        clearTimeout(this.configReloadDebounceTimer);
      }
      // Set a new timer to reload after a delay
      this.configReloadDebounceTimer = setTimeout(() => {
        this.logger.info('Reloading Smart FTP configuration now...');
        this.loadConfig();
        this.configReloadDebounceTimer = null;
      }, this.CONFIG_RELOAD_DELAY);
    });

    this.configWatcher.onDidCreate(() => {
      this.logger.info('Smart FTP configuration file created, loading immediately...');
      // Clear any pending reload debounce timer if the file is recreated
      if (this.configReloadDebounceTimer) {
        clearTimeout(this.configReloadDebounceTimer);
        this.configReloadDebounceTimer = null;
      }
      this.loadConfig();
    });

    this.configWatcher.onDidDelete(() => {
      this.logger.info('Smart FTP configuration file deleted');
      // Clear any pending reload debounce timer
      if (this.configReloadDebounceTimer) {
        clearTimeout(this.configReloadDebounceTimer);
        this.configReloadDebounceTimer = null;
      }
      if (this.config !== null) { // Only fire event if config state changes
          this.config = null;
          this.onConfigChangedEmitter.fire(null);
      }
    });
  }

  public getConfig(): FTPConfig | null {
    return this.config;
  }

  public hasConfig(): boolean {
    return this.config !== null;
  }

  public dispose(): void {
    if (this.configWatcher) {
      this.configWatcher.dispose();
    }
    if (this.configReloadDebounceTimer) { // Clear timer on dispose
        clearTimeout(this.configReloadDebounceTimer);
    }
    this.onConfigChangedEmitter.dispose();
  }
}

