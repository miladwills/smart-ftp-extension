export interface FTPConfig {
  name: string;
  host: string;
  protocol: 'ftp' | 'sftp';
  port: number;
  username: string;
  password: string;
  remotePath: string;
  uploadOnSave: boolean;
  useTempFile: boolean;
  openSsh: boolean;
  watcher: {
    files: string;
    autoUpload: boolean;
    autoDelete: boolean;
    ignoreCreate: boolean;
    ignoreUpdate: boolean;
    ignoreDelete: boolean;
  };
  ignore?: string[]; // Add optional ignore list
}

export interface ConnectionStatus {
  connected: boolean;
  connecting: boolean;
  error?: string;
  lastConnected?: Date;
  host?: string; // Add optional host property
}

export interface UploadTask {
  localPath: string;
  remotePath: string;
  retries: number;
  timestamp: Date;
}

// Updated default config with placeholders for publishing
export const DEFAULT_FTP_CONFIG: FTPConfig = {
    name: "My Server",
    host: "localhost",
    protocol: "ftp",
    port: 21,
    username: "username",
    password: "password",
    remotePath: "/",
    uploadOnSave: true,
    useTempFile: false,
    openSsh: false,
    watcher: {
        files: "**/*",
        autoUpload: true,
        autoDelete: false,
        ignoreCreate: false,
        ignoreUpdate: false,
        ignoreDelete: true
    },
    ignore: [] // Initialize ignore list
};

