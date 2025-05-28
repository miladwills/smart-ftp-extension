import * as vscode from 'vscode';

export class Logger {
  private static instance: Logger;
  private outputChannel: vscode.OutputChannel;

  private constructor() {
    this.outputChannel = vscode.window.createOutputChannel("Smart FTP Log");
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  // Log general information messages without prefix
  public info(message: string): void {
    const timestamp = new Date().toLocaleString();
    this.outputChannel.appendLine(`[${timestamp}] ${message}`);
  }

  // Log error messages, keeping ERROR prefix for clarity
  public error(message: string, error?: Error): void {
    const timestamp = new Date().toLocaleString();
    this.outputChannel.appendLine(`[${timestamp}] ERROR: ${message}`);
    if (error) {
      // Use the same timestamp for related error details
      this.outputChannel.appendLine(`[${timestamp}] ERROR DETAILS: ${error.message}`);
      if (error.stack) {
        this.outputChannel.appendLine(`[${timestamp}] STACK: ${error.stack}`);
      }
    }
  }

  // Log warning messages, keeping WARN prefix for clarity
  public warn(message: string): void {
    const timestamp = new Date().toLocaleString();
    this.outputChannel.appendLine(`[${timestamp}] WARN: ${message}`);
  }

  // Log success messages without prefix
  public success(message: string): void {
    const timestamp = new Date().toLocaleString();
    // Keep SUCCESS prefix for upload confirmation as per user example
    if (message.startsWith('Uploaded:')) {
        this.outputChannel.appendLine(`[${timestamp}] SUCCESS: ${message}`);
    } else {
        this.outputChannel.appendLine(`[${timestamp}] ${message}`);
    }
  }

  public show(): void {
    this.outputChannel.show();
  }

  public dispose(): void {
    this.outputChannel.dispose();
  }
}

