import * as vscode from 'vscode';
import { ConfigManager } from './managers/configManager';
import { FTPManager } from './managers/ftpManager';
import { FileWatcher } from './managers/fileWatcher';
import { StatusManager } from './managers/statusManager';
import { Logger } from './utils/logger';
import { PathUtils } from './utils/pathUtils';

let configManager: ConfigManager;
let ftpManager: FTPManager;
let fileWatcher: FileWatcher;
let statusManager: StatusManager;
let logger: Logger;

export async function activate(context: vscode.ExtensionContext) {
  logger = Logger.getInstance();
  logger.info('Smart FTP extension is activating...');
  logger.show(); // Ensure the output channel is visible on activation

  // Initialize managers
  configManager = ConfigManager.getInstance();
  ftpManager = FTPManager.getInstance();
  fileWatcher = FileWatcher.getInstance();
  statusManager = StatusManager.getInstance();

  // Initialize configuration
  await configManager.initialize();

  // Auto-Connect Logic
  const initialConfig = configManager.getConfig();
  if (initialConfig) {
    logger.info(`Initial configuration loaded: ${initialConfig.name || 'Default'}`);
    ftpManager.setConfig(initialConfig);
    fileWatcher.setConfig(initialConfig);
    ftpManager.connect();
  } else {
    logger.info('No initial configuration found.');
    logger.info('Welcome to Smart FTP! Create a configuration to get started.');
    logger.show();
    setTimeout(() => {
      vscode.window.showInformationMessage(
        'Welcome to Smart FTP! Create a configuration to get started.',
        'Create Config'
      ).then(action => {
        if (action === 'Create Config') {
          vscode.commands.executeCommand('smartftp.createConfig');
        }
      });
    }, 1000);
  }

  // Config Change Listener
  configManager.onConfigChanged((config) => {
    ftpManager.setConfig(config);
    fileWatcher.setConfig(config);
    if (config) {
      logger.info(`Configuration updated/loaded: ${config.name || 'Default'}`);
      if (!ftpManager.isConnected()) {
          ftpManager.connect();
      }
    } else {
      logger.info('Configuration removed or became invalid');
      ftpManager.disconnect();
    }
  });

  // Register commands
  const commands = [
    vscode.commands.registerCommand('smartftp.createConfig', async () => {
      await configManager.createConfig();
    }),

    vscode.commands.registerCommand('smartftp.connect', async () => {
      if (!configManager.hasConfig()) {
        logger.warn('No FTP configuration found. Please create one first.');
        logger.show();
        const create = await vscode.window.showInformationMessage(
          'No FTP configuration found. Would you like to create one?',
          'Create Config', 'Cancel'
        );
        if (create === 'Create Config') {
          await configManager.createConfig();
        }
        return;
      }
      await ftpManager.connect();
    }),

    vscode.commands.registerCommand('smartftp.disconnect', async () => {
      await ftpManager.disconnect();
    }),

    vscode.commands.registerCommand('smartftp.uploadFile', async (uri?: vscode.Uri) => {
      let filePath: string;
      if (uri?.fsPath) {
        filePath = uri.fsPath;
      } else {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
          logger.error('No file is currently open');
          logger.show();
          return;
        }
        filePath = activeEditor.document.fileName;
      }
      if (!PathUtils.isInWorkspace(filePath)) {
        logger.error('File must be within the workspace');
        logger.show();
        return;
      }
      await ftpManager.uploadFile(filePath);
    }),

    vscode.commands.registerCommand('smartftp.uploadWorkspace', async () => {
      const workspaceRoot = PathUtils.getWorkspaceRoot();
      if (!workspaceRoot) {
        logger.error('No workspace folder found');
        logger.show();
        return;
      }
      const confirm = await vscode.window.showWarningMessage(
        'This will upload all files in the workspace. Continue?',
        'Yes', 'No'
      );
      if (confirm !== 'Yes') return;
      try {
        const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**'); // Consider adding more excludes from config
        let uploadCount = 0;
        for (const file of files) {
          // Use global ignore check from PathUtils
          if (!PathUtils.shouldIgnoreFile(file.fsPath, configManager.getConfig()?.ignore)) { 
            await ftpManager.uploadFile(file.fsPath);
            uploadCount++;
          }
        }
        statusManager.showNotification(`${uploadCount} files queued for upload`);
      } catch (error) {
        logger.error('Failed to upload workspace', error as Error);
        logger.show();
      }
    }),

    vscode.commands.registerCommand('smartftp.showOutput', () => {
      statusManager.showOutputChannel();
    }),

    vscode.commands.registerCommand('smartftp.toggleWatcher', () => {
      if (fileWatcher.isActive()) {
        fileWatcher.stop();
        statusManager.showNotification('File watcher stopped');
      } else {
        fileWatcher.start();
        statusManager.showNotification('File watcher started');
      }
    }),

    // UPDATED: Sync Remote Files to Local Command (No Warning)
    vscode.commands.registerCommand('smartftp.syncServerToLocal', async (uri?: vscode.Uri) => {
      if (!configManager.hasConfig()) {
        vscode.window.showWarningMessage('No FTP configuration found. Please create one first.');
        return;
      }

      let localFolderPath: string;
      if (uri?.fsPath && PathUtils.isDirectory(uri.fsPath)) {
        localFolderPath = uri.fsPath;
      } else {
        vscode.window.showWarningMessage('Please right-click a folder in the explorer to sync.');
        return;
      }

      const workspaceRoot = PathUtils.getWorkspaceRoot();
      if (!workspaceRoot || !localFolderPath.startsWith(workspaceRoot)) {
        vscode.window.showErrorMessage('Selected folder must be within the current workspace.');
        return;
      }

      const config = configManager.getConfig()!;
      const remoteFolderPath = PathUtils.toRemotePath(localFolderPath, workspaceRoot, config.remotePath);

      // REMOVED Confirmation Warning
      // const confirm = await vscode.window.showWarningMessage(...);
      // if (confirm !== 'Yes') return;

      logger.info(`Starting sync from server: ${remoteFolderPath} to local: ${localFolderPath}`);
      // Use a more specific notification
      statusManager.showNotification(`Syncing remote files to ${PathUtils.basename(localFolderPath)}...`, 'info'); 
      logger.show();

      try {
        await ftpManager.syncServerToLocal(localFolderPath, remoteFolderPath);
        // Success message handled by ftpManager/statusManager
      } catch (error) {
        // Error message handled by ftpManager/statusManager
        logger.error(`Sync command failed for ${localFolderPath}`, error as Error);
      }
    }),

    // REMOVED Download Remote Path Command
    // vscode.commands.registerCommand('smartftp.downloadRemotePath', ...)
  ];

  // Add commands to context subscriptions
  // Filter out any potentially undefined commands if removal logic failed (belt-and-suspenders)
  commands.filter(cmd => cmd !== undefined).forEach(command => context.subscriptions.push(command));

  // Add managers to context subscriptions for proper disposal
  context.subscriptions.push(
    configManager,
    ftpManager,
    fileWatcher,
    statusManager,
    logger
  );

  // Workspace change listener
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      logger.info('Workspace folders changed, reinitializing...');
      configManager.initialize(); // Re-initialize config which triggers connect if needed
    })
  );

  logger.info('Smart FTP extension activated successfully');
}

export function deactivate() {
  logger?.info('Smart FTP extension is deactivating...');
  ftpManager?.disconnect();
  logger?.info('Smart FTP extension deactivated');
}

