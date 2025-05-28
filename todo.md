# Smart FTP Extension Enhancement TODO

This file tracks the implementation of new features for the Smart FTP extension.

- [x] **Feature: Auto-Delete**
    - [x] Implement `deleteFile(remotePath)` method in `ftpManager.ts` using `basic-ftp` client's `remove()`.
    - [x] Implement `deleteDirectory(remotePath)` method in `ftpManager.ts` using `basic-ftp` client's `removeDir()`.
    - [x] Update `handleFileDelete` in `fileWatcher.ts` to call `ftpManager.deleteFile()` if `config.watcher.autoDelete` is true.
    - [x] Update `handleDirectoryDelete` in `fileWatcher.ts` to call `ftpManager.deleteDirectory()` if `config.watcher.autoDelete` is true.
    - [x] Add error handling for delete operations in `ftpManager.ts`.
    - [x] Test file and directory deletion scenarios.

- [x] **Feature: Status Bar Enhancement**
    - [x] Modify `updateStatusBar` in `statusManager.ts`.
    - [x] Change connected status text to "$(check) Smart FTP Connected".
    - [x] Set connected status color to a green theme color (e.g., `statusBarItem.prominentBackground` or similar).
    - [x] Verify status bar text and color changes when connected, disconnected, and connecting.

- [x] **Feature: Server-to-Local Sync**
    - [x] **Context Menu:**
        - [x] Define a new command `smartftp.syncServerToLocal` in `package.json`.
        - [x] Add the command to the `explorer/context` menu group in `package.json`, targeting folders.
        - [x] Register the command in `extension.ts` and link it to a new handler function.
    - [x] **Sync Logic (`ftpManager.ts`):**
        - [x] Create a new public method `syncServerToLocal(localFolderPath, remoteFolderPath)`.
        - [x] Implement recursive listing of remote files/directories using `client.list()`.
        - [x] Implement recursive listing of local files/directories using `fs.readdir` and `fs.stat`.
        - [x] Implement comparison logic:
            - [x] Identify and download new files/directories from server to local.
            - [x] Identify files existing in both locations.
            - [x] Compare modification times (`modifiedAt` from `basic-ftp`) and download server file if newer.
        - [x] Add robust error handling for FTP and file system operations during sync.
        - [x] Provide user feedback (status bar updates, notifications) during the sync process.
    - [x] **Command Handler (`extension.ts`):**
        - [x] Get the selected folder URI from the command context.
        - [x] Calculate the corresponding remote path.
        - [x] Call `ftpManager.syncServerToLocal()` with appropriate paths.
        - [x] Handle cases where the command is not triggered from a folder context.
    - [x] Test server-to-local sync with various scenarios (new files, modified files, new directories).

- [x] **Final Steps:**
    - [x] Review all code changes for clarity, efficiency, and error handling.
    - [x] Perform comprehensive testing of all features (auto-upload, upload-on-save, auto-delete, sync, status bar).
    - [x] Build the extension (`vsce package`).
    - [x] Prepare final report and deliver the updated `.vsix` file.
