# Smart FTP Extension

An intelligent FTP client for Visual Studio Code with auto-connect, file watching, and seamless uploads.

## Features

- 🔄 **Auto Connect & Reconnect**: Automatically connects to FTP server and handles reconnection if connection is lost
- 📁 **File Watcher**: Monitors file changes and automatically uploads modified files
- 💾 **Upload on Save**: Instantly uploads files when you save them
- 🗑️ **Auto Delete**: Automatically deletes files/directories on the server when they are deleted locally
- ✨ **Sync Remote Files to Local**: Synchronizes changes from the server to your local workspace folder
- 🎯 **Smart Upload Queue**: Queues uploads when disconnected and processes them when connection is restored
- 📊 **Real-time Status**: Shows connection status and upload progress in status bar
- 📝 **Detailed Logging**: Complete operation logs in the output panel
- ⚙️ **Easy Configuration**: Simple JSON configuration file

## Quick Start

1. Install the extension
2. Open Command Palette (`Ctrl+Shift+P`)
3. Run `Smart FTP: Create FTP Configuration`
4. Edit the generated `smartftp.json` file with your server details
5. The extension will automatically connect and start watching files

## Configuration

The extension uses a `smartftp.json` file in your workspace root:

```json
{
  "name": "My Server",
  "host": "your-ftp-server.com",
  "protocol": "ftp",
  "port": 21,
  "username": "your-username",
  "password": "your-password",
  "remotePath": "/public_html/",
  "uploadOnSave": true,
  "useTempFile": false,
  "openSsh": false,
  "watcher": {
    "files": "**/*",
    "autoUpload": true,
    "autoDelete": false,
    "ignoreCreate": false,
    "ignoreUpdate": false,
    "ignoreDelete": true
  }
}
```

### Configuration Options

- `name`: Display name for your server
- `host`: FTP server hostname or IP
- `protocol`: "ftp" or "sftp"
- `port`: Server port (usually 21 for FTP, 22 for SFTP)
- `username`: FTP username
- `password`: FTP password
- `remotePath`: Remote directory path where files will be uploaded
- `uploadOnSave`: Upload files immediately when saved
- `useTempFile`: Use temporary files for uploads (not implemented yet)
- `openSsh`: Use SSH for SFTP connections

### Watcher Options

- `files`: File pattern to watch (e.g., "\*_/_" for all files)
- `autoUpload`: Enable automatic uploads on file changes
- `autoDelete`: Enable automatic deletion of remote files (not implemented yet)
- `ignoreCreate`: Ignore file creation events
- `ignoreUpdate`: Ignore file modification events
- `ignoreDelete`: Ignore file deletion events

## Commands

- `Smart FTP: Create FTP Configuration` - Create a new ftp.json file
- `Smart FTP: Connect to FTP Server` - Manually connect to FTP server
- `Smart FTP: Disconnect from FTP Server` - Disconnect from FTP server
- `Smart FTP: Upload Current File` - Upload the currently open file
- `Smart FTP: Upload Entire Workspace` - Upload all workspace files

## In Explorer
 - Right-click in the explorer and select "Sync Remote Files to Local" to download your remote files to your local

## Status Bar

The status bar shows current connection status:

- ✓ Smart FTP Connected - Successfully connected
- 🔄 Smart FTP Connecting... - Connection in progress
- ✗ Smart FTP Disconnected - Not connected or connection failed

Click the status bar item to connect/reconnect.

## Auto-Ignore Files

The following files and directories are automatically ignored:

- `.git/`
- `.vscode/`
- `node_modules/`
- `.DS_Store`
- `Thumbs.db`
- `.env`
- `*.log`
- `ftp.json`

## Troubleshooting

1. **Connection Issues**: Check your FTP credentials and server details in `ftp.json`
2. **Upload Failures**: Check the Output panel (View > Output > Smart FTP) for detailed error messages
3. **File Not Uploading**: Ensure the file is within your workspace and not in the ignore list
4. **Permission Errors**: Verify your FTP user has write permissions to the remote path

## Development

### Building from Source

```bash
npm install
npm run compile
```

### Package Extension

```bash
npm install -g vsce
vsce package
```

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
