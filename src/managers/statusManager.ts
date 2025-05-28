import * as vscode from 'vscode';
import { ConnectionStatus } from '../types/config';
import { Logger } from '../utils/logger';

export class StatusManager {
  private static instance: StatusManager;
  private statusBarItem: vscode.StatusBarItem;
  private logger = Logger.getInstance();
  private connectionStatus: ConnectionStatus = {
    connected: false,
    connecting: false
  };
  private currentOperation: 'upload' | 'sync' | 'download' | 'none' = 'none';
  private operationText: string = '';

  private constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.statusBarItem.name = "Smart FTP Status";
    this.statusBarItem.command = 'smartftp.connect';
    this.updateStatusBar();
    this.statusBarItem.show();
  }

  public static getInstance(): StatusManager {
    if (!StatusManager.instance) {
      StatusManager.instance = new StatusManager();
    }
    return StatusManager.instance;
  }

  public updateConnectionStatus(status: ConnectionStatus): void {
    this.connectionStatus = status;
    // Only update status bar if no other operation is in progress
    if (this.currentOperation === 'none') {
        this.updateStatusBar();
    }

    // Log connection events regardless of ongoing operations
    if (status.connected) {
      this.logger.success('Connected to FTP server');
    } else if (status.connecting) {
      this.logger.info('Connecting to FTP server...');
    } else if (status.error) {
      this.logger.error(`Connection failed: ${status.error}`);
      this.logger.show();
    }
  }

  public updateStatusBar(): void {
    // Prioritize showing operation status if one is active
    if (this.currentOperation !== 'none') {
        this.statusBarItem.text = this.operationText;
        // Use default colors during operations unless it's an error state related to the operation?
        // For now, keep default colors during operations.
        this.statusBarItem.color = undefined;
        this.statusBarItem.backgroundColor = undefined;
        this.statusBarItem.tooltip = this.operationText; // Simple tooltip during operation
        this.statusBarItem.command = undefined; // No command during operation
        return;
    }

    // Otherwise, show connection status
    if (this.connectionStatus.connected) {
      this.statusBarItem.text = '$(check) Smart FTP: Connected';
      this.statusBarItem.color = '#90EE90'; // Light Green
      this.statusBarItem.backgroundColor = undefined;
      this.statusBarItem.tooltip = `Smart FTP: Connected to ${this.connectionStatus.host || 'server'}\nLast connected: ${this.connectionStatus.lastConnected?.toLocaleString()}\nClick to disconnect`;
      this.statusBarItem.command = 'smartftp.disconnect';
    } else if (this.connectionStatus.connecting) {
      this.statusBarItem.text = '$(sync~spin) Smart FTP: Connecting...';
      this.statusBarItem.color = undefined;
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      this.statusBarItem.tooltip = 'Smart FTP: Connecting to server...';
      this.statusBarItem.command = undefined;
    } else {
      this.statusBarItem.text = '$(x) Smart FTP: Disconnected';
      this.statusBarItem.color = undefined;
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
      this.statusBarItem.tooltip = this.connectionStatus.error ? `Smart FTP: Connection Error: ${this.connectionStatus.error}\nClick to connect` : 'Smart FTP: Click to connect to server';
      this.statusBarItem.command = 'smartftp.connect';
    }
  }

  // --- Upload Status --- 
  public showUploadProgress(fileName: string, progress?: number): void {
    this.currentOperation = 'upload';
    if (progress !== undefined) {
      this.operationText = `$(cloud-upload) Uploading ${fileName} (${Math.round(progress)}%)`;
    } else {
      this.operationText = `$(cloud-upload) Uploading ${fileName}...`;
    }
    this.updateStatusBar();
  }

  public showUploadSuccess(fileName: string): void {
    this.logger.success(`Uploaded: ${fileName}`);
    // Check if queue is empty before resetting status?
    // For now, assume ftpManager calls updateStatusBar when queue is done.
    // If this was the last upload, reset status
    // if (ftpManager.isQueueEmpty()) { // Need a way to check this
        this.currentOperation = 'none';
        this.operationText = '';
        this.updateStatusBar();
    // }
  }

  public showUploadError(fileName: string, error: string): void {
    this.logger.error(`Upload failed for ${fileName}: ${error}`);
    // Reset status after showing error? Or keep showing error?
    // Let's reset to connection status after an error.
    this.currentOperation = 'none';
    this.operationText = '';
    this.updateStatusBar();
    this.logger.show();
  }

  // --- Sync Status --- 
  public showSyncProgress(message: string): void {
    this.currentOperation = 'sync';
    this.operationText = `$(sync~spin) ${message}`; // Use sync icon
    this.updateStatusBar();
  }

  public showSyncSuccess(message: string): void {
    this.logger.success(`Sync Success: ${message}`);
    this.currentOperation = 'none';
    this.operationText = '';
    this.updateStatusBar();
    // Optional: Show temporary success message?
    // vscode.window.setStatusBarMessage(`$(check) ${message}`, 5000); 
  }

  public showSyncError(message: string, error: string): void {
    this.logger.error(`Sync Error: ${message}: ${error}`);
    this.currentOperation = 'none';
    this.operationText = '';
    this.updateStatusBar();
    this.logger.show();
  }

  // --- Download Status --- 
  public showDownloadProgress(message: string): void {
    this.currentOperation = 'download';
    this.operationText = `$(cloud-download) ${message}`; // Use download icon
    this.updateStatusBar();
  }

  public showDownloadSuccess(message: string): void {
    this.logger.success(`Download Success: ${message}`);
    this.currentOperation = 'none';
    this.operationText = '';
    this.updateStatusBar();
    // Optional: Show temporary success message?
    // vscode.window.setStatusBarMessage(`$(check) ${message}`, 5000);
  }

  public showDownloadError(message: string, error: string): void {
    this.logger.error(`Download Error: ${message}: ${error}`);
    this.currentOperation = 'none';
    this.operationText = '';
    this.updateStatusBar();
    this.logger.show();
  }

  // --- General Notifications --- 
  public showNotification(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    const displayMessage = message.startsWith('Connected to') || message.startsWith('Disconnected from')
      ? message.replace('FTP', 'Smart FTP:') 
      : `Smart FTP: ${message}`;

    if (message.startsWith('Connected to') || message.startsWith('Disconnected from')) {
      // Let connection status updates handle these implicitly via status bar
      // vscode.window.showInformationMessage(displayMessage);
    } else {
      switch (type) {
        case 'info':
          this.logger.info(displayMessage);
          // vscode.window.showInformationMessage(displayMessage);
          break;
        case 'warning':
          this.logger.warn(displayMessage);
          vscode.window.showWarningMessage(displayMessage);
          break;
        case 'error':
          this.logger.error(displayMessage);
          vscode.window.showErrorMessage(displayMessage);
          break;
      }
      if (type === 'error' || type === 'warning') {
          this.logger.show(); 
      }
    }
  }

  public showOutputChannel(): void {
    this.logger.show();
  }

  public dispose(): void {
    this.statusBarItem.dispose();
  }
}

