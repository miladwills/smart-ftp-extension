import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs'; // Import fs for isDirectory

export class PathUtils {
  /**
   * Convert local file path to remote FTP path
   */
  public static toRemotePath(localPath: string, workspaceRoot: string, remotePath: string): string {
    const relativePath = path.relative(workspaceRoot, localPath);
    // Always use forward slashes for remote paths
    const normalizedPath = relativePath.replace(/\\/g, '/'); 
    return path.posix.join(remotePath, normalizedPath);
  }

  /**
   * Get workspace root path
   */
  public static getWorkspaceRoot(): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    return workspaceFolders?.[0]?.uri.fsPath;
  }

  /**
   * Check if file is in workspace
   */
  public static isInWorkspace(filePath: string): boolean {
    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) {
      return false;
    }
    return filePath.startsWith(workspaceRoot);
  }

  /**
   * Normalize path separators for FTP
   */
  public static normalizeFtpPath(ftpPath: string): string {
    return ftpPath.replace(/\\/g, '/').replace(/\/+/g, '/');
  }

  /**
   * Get directory path from file path
   */
  public static getDirectoryPath(filePath: string): string {
    // Use path.posix.dirname for remote paths which use forward slashes
    return path.posix.dirname(filePath.replace(/\\/g, '/'));
  }

  /**
   * Get file extension
   */
  public static getFileExtension(filePath: string): string {
    return path.extname(filePath).toLowerCase();
  }

  /**
   * Check if file should be ignored based on patterns
   */
  public static shouldIgnoreFile(filePath: string, ignorePatterns: string[] = []): boolean {
    const fileName = path.basename(filePath);
    const defaultIgnores = [
      '.git',
      '.vscode',
      'node_modules',
      '.DS_Store',
      'Thumbs.db',
      '.env',
      '*.log',
      'smartftp.json' // Ignore the config file itself
    ];
    
    const allPatterns = [...defaultIgnores, ...(ignorePatterns || [])]; // Ensure ignorePatterns is array
    
    // Check against basename and full path relative to workspace root
    const workspaceRoot = this.getWorkspaceRoot();
    const relativePath = workspaceRoot ? path.relative(workspaceRoot, filePath).replace(/\\/g, '/') : fileName;

    return allPatterns.some(pattern => {
      if (!pattern) return false; // Skip empty patterns
      // Simple name match
      if (fileName === pattern || relativePath === pattern) {
        return true;
      }
      // Glob matching (basic)
      if (pattern.includes('*')) {
        try {
          // Convert glob to regex (simple conversion)
          const regexPattern = pattern
            .replace(/\./g, '\\.')   // Escape dots
            .replace(/\*\*/g, '.+') // Match multiple directories
            .replace(/\*/g, '[^/]*'); // Match anything except slash
          const regex = new RegExp(`^${regexPattern}$`);
          return regex.test(fileName) || regex.test(relativePath);
        } catch (e) {
          console.error(`Invalid ignore pattern regex: ${pattern}`, e);
          return false;
        }
      }
      // Directory check
      if (pattern.endsWith('/') && (relativePath + '/').startsWith(pattern)) {
          return true;
      }
      return false;
    });
  }

  /**
   * NEW: Check if a path is a directory
   */
  public static isDirectory(fsPath: string): boolean {
    try {
      return fs.statSync(fsPath).isDirectory();
    } catch (e) {
      // If stat fails (e.g., path doesn't exist), it's not a directory
      return false;
    }
  }

  /**
   * NEW: Get the base name of a path
   */
  public static basename(fsPath: string): string {
    return path.basename(fsPath);
  }
}
