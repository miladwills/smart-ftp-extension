import * as vscode from 'vscode';
import * as chokidar from 'chokidar';
import { FTPConfig } from '../types/config';
import { Logger } from '../utils/logger';
import { PathUtils } from '../utils/pathUtils';
import { FTPManager } from './ftpManager';

export class FileWatcher {
  private static instance: FileWatcher;
  private logger = Logger.getInstance();
  private ftpManager = FTPManager.getInstance();
  private config: FTPConfig | null = null;
  private fileWatcher: chokidar.FSWatcher | null = null;
  private saveWatcher: vscode.Disposable | null = null;
  private isWatching = false;
  private uploadDebounce = new Map<string, NodeJS.Timeout>();

  private constructor() {}

  public static getInstance(): FileWatcher {
    if (!FileWatcher.instance) {
      FileWatcher.instance = new FileWatcher();
    }
    return FileWatcher.instance;
  }

  public setConfig(config: FTPConfig | null): void {
    this.config = config;
    this.restart();
  }

  public start(): void {
    if (!this.config || this.isWatching) {
      return;
    }

    const workspaceRoot = PathUtils.getWorkspaceRoot();
    if (!workspaceRoot) {
      this.logger.error('No workspace root found for file watching');
      return;
    }

    this.startFileSystemWatcher(workspaceRoot);
    this.startSaveWatcher();
    this.isWatching = true;
    
    this.logger.info(`Started file watching with pattern: ${this.config.watcher.files}`);
  }

  public stop(): void {
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = null;
    }

    if (this.saveWatcher) {
      this.saveWatcher.dispose();
      this.saveWatcher = null;
    }

    // Clear any pending debounced uploads
    this.uploadDebounce.forEach(timeout => clearTimeout(timeout));
    this.uploadDebounce.clear();

    this.isWatching = false;
    this.logger.info('Stopped file watching');
  }

  public restart(): void {
    this.stop();
    if (this.config) {
      this.start();
    }
  }

  private startFileSystemWatcher(workspaceRoot: string): void {
    // Check if watching is enabled at all (autoUpload implies watching)
    if (!this.config?.watcher.autoUpload && !this.config?.uploadOnSave) {
        this.logger.info('File watching disabled (autoUpload and uploadOnSave are false).');
        return;
    }

    const watchPattern = this.config.watcher.files || '**/*';
    const fullPattern = `${workspaceRoot}/${watchPattern}`;

    this.fileWatcher = chokidar.watch(fullPattern, {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/.vscode/**',
        '**/smartftp.json', // Updated config filename
        '**/*.log',
        '**/.DS_Store',
        '**/Thumbs.db'
      ],
      ignoreInitial: true,
      persistent: true,
      followSymlinks: false
    });

    // Handle file creation
    if (!this.config.watcher.ignoreCreate && this.config.watcher.autoUpload) {
      this.fileWatcher.on('add', (filePath: string) => {
        this.logger.info(`File created: ${filePath}`);
        this.debounceUpload(filePath, 'create');
      });
    }

    // Handle file modification
    if (!this.config.watcher.ignoreUpdate && this.config.watcher.autoUpload) {
      this.fileWatcher.on('change', (filePath: string) => {
        this.logger.info(`File changed: ${filePath}`);
        this.debounceUpload(filePath, 'change');
      });
    }

    // Handle file deletion
    if (!this.config.watcher.ignoreDelete && this.config.watcher.autoDelete) {
      this.fileWatcher.on('unlink', (filePath: string) => {
        this.logger.info(`File deleted locally: ${filePath}`);
        this.handleFileDelete(filePath);
      });
    }

    // Handle directory creation (no action needed, files inside will trigger 'add')
    // if (!this.config.watcher.ignoreCreate) {
    //   this.fileWatcher.on('addDir', (dirPath: string) => {
    //     this.logger.info(`Directory created: ${dirPath}`);
    //     // Optionally: Create directory on remote if needed, though file uploads handle this
    //   });
    // }

    // Handle directory deletion
    if (!this.config.watcher.ignoreDelete && this.config.watcher.autoDelete) {
      this.fileWatcher.on('unlinkDir', (dirPath: string) => {
        this.logger.info(`Directory deleted locally: ${dirPath}`);
        this.handleDirectoryDelete(dirPath);
      });
    }

    this.fileWatcher.on('error', (error: Error) => {
      this.logger.error('File watcher error', error);
    });
  }

  private startSaveWatcher(): void {
    if (!this.config?.uploadOnSave) {
      return;
    }

    this.saveWatcher = vscode.workspace.onDidSaveTextDocument((document) => {
      const filePath = document.fileName;
      
      if (!PathUtils.isInWorkspace(filePath)) {
        return;
      }

      if (PathUtils.shouldIgnoreFile(filePath)) {
        return;
      }

      this.logger.info(`File saved: ${filePath}`);
      
      // Clear any pending debounced upload for this file to avoid duplicates
      const timeout = this.uploadDebounce.get(filePath);
      if (timeout) {
        clearTimeout(timeout);
        this.uploadDebounce.delete(filePath);
        this.logger.info(`Cleared debounced watcher upload for ${filePath} due to save event.`);
      }

      // Upload immediately on save
      this.ftpManager.uploadFile(filePath);
    });
  }

  private debounceUpload(filePath: string, event: 'create' | 'change'): void {
    if (!PathUtils.isInWorkspace(filePath)) {
      return;
    }

    if (PathUtils.shouldIgnoreFile(filePath)) {
      return;
    }

    // Clear existing timeout for this file
    const existingTimeout = this.uploadDebounce.get(filePath);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout (debounce for 1 second)
    const timeout = setTimeout(() => {
      this.uploadDebounce.delete(filePath);
      
      // --- FIX for Upload-on-Save Bug --- 
      // Removed the check that skipped upload if uploadOnSave was true.
      // The save handler already clears the debounce timer, preventing duplicates from the save itself.
      // This allows watcher events (e.g., external changes) to still trigger uploads.
      // if (this.config?.uploadOnSave && event === 'change') { ... }
      // --- End FIX ---

      this.logger.info(`Triggering debounced upload for: ${filePath}`);
      this.ftpManager.uploadFile(filePath);
    }, 1000);

    this.uploadDebounce.set(filePath, timeout);
  }

  private async handleFileDelete(filePath: string): Promise<void> {
    // Check if autoDelete is enabled in config
    if (!this.config || !this.config.watcher.autoDelete) {
      return;
    }

    try {
      const workspaceRoot = PathUtils.getWorkspaceRoot();
      if (!workspaceRoot) {
        this.logger.error('Cannot determine workspace root for deletion.');
        return;
      }

      const remotePath = PathUtils.toRemotePath(filePath, workspaceRoot, this.config.remotePath);
      
      this.logger.info(`Auto-deleting remote file: ${remotePath}`);
      const success = await this.ftpManager.deleteFile(remotePath);
      if (!success) {
        this.logger.warn(`Auto-delete failed for remote file: ${remotePath}`);
      }
      
    } catch (error) {
      this.logger.error('Error during remote file deletion process', error as Error);
    }
  }

  private async handleDirectoryDelete(dirPath: string): Promise<void> {
    // Check if autoDelete is enabled in config
    if (!this.config || !this.config.watcher.autoDelete) {
      return;
    }

    try {
      const workspaceRoot = PathUtils.getWorkspaceRoot();
      if (!workspaceRoot) {
        this.logger.error('Cannot determine workspace root for directory deletion.');
        return;
      }

      const remotePath = PathUtils.toRemotePath(dirPath, workspaceRoot, this.config.remotePath);
      
      this.logger.info(`Auto-deleting remote directory: ${remotePath}`);
      const success = await this.ftpManager.deleteDirectory(remotePath);
      if (!success) {
        this.logger.warn(`Auto-delete failed for remote directory: ${remotePath}`);
      }
      
    } catch (error) {
      this.logger.error('Error during remote directory deletion process', error as Error);
    }
  }

  public isActive(): boolean {
    return this.isWatching;
  }

  public dispose(): void {
    this.stop();
  }
}

