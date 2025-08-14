# DEN - Developer Environment Extension

A Visual Studio Code extension that manages developer environment configurations with a simple status bar interface, intelligent caching, real-time file monitoring, and comprehensive Git integration.

## Features

- **Automatic Initialization**: Starts up automatically when VS Code launches
- **Configuration Discovery**: Automatically searches for configuration files in YAML or JSON format
- **Boilerplate Generation**: Creates default configuration files when none exist
- **Custom Config Paths**: Allows users to specify custom configuration file locations
- **Status Bar Integration**: Simple status indicator showing success/fail/in-progress states
- **Multiple Format Support**: Works with `.yml`, `.yaml`, and `.json` configuration files
- **Intelligent Caching**: Configurations are cached for performance with configurable timeout
- **File Watching**: Automatically detects and reloads configuration changes
- **Enhanced Validation**: Comprehensive configuration validation with warnings and errors
- **Error Handling**: Consistent error handling and logging throughout the extension
- **Git Integration**: Full Git repository monitoring and pull request tracking
- **Source Control**: Real-time Git status, branch management, and repository information

## Configuration

The extension looks for configuration files with these names (in order of priority):
- `den.yml`
- `den.yaml` 
- `den.json`
- `.den.yml`
- `.den.yaml`
- `.den.json`

### Configuration Format

```yaml
name: Developer Environment
version: 1.0.0
environment: development
tools:
  - git
  - npm
  - docker
settings:
  autoSave: true
  formatOnSave: true
  lintOnSave: true
```

## Commands

- **Create Config File**: Generates a default configuration file in the workspace
- **Open DEN Settings**: Opens the extension's configuration settings
- **Validate Configuration**: Validates the current configuration file for errors and warnings
- **Reload Configuration**: Reloads the configuration from disk
- **Show Configuration Info**: Displays detailed information about the loaded configuration
- **Clear Configuration Cache**: Clears the internal configuration cache

### Git Commands

- **Show Pull Requests**: Displays all open pull requests for monitored branches
- **Switch Git Branch**: Allows switching between Git branches
- **Show Repository Info**: Displays detailed Git repository information
- **Refresh Git Status**: Updates the Git status display

## Settings

### General Settings
- `den.configPath`: Custom path to configuration file (absolute or relative to workspace)
- `den.autoSearch`: Automatically search for configuration files in workspace (default: true)
- `den.cacheTimeout`: Configuration cache timeout in milliseconds, 5s - 5m (default: 30s)
- `den.enableFileWatching`: Watch for configuration file changes and auto-reload (default: true)

### Git Settings
- `den.git.enabled`: Enable Git and source control features (default: true)
- `den.git.branches`: Git branches to monitor for pull requests (default: ["develop", "test", "master", "main"])
- `den.git.pollingInterval`: Pull request polling interval in milliseconds, 1m - 30m (default: 5m)
- `den.git.showNotifications`: Show notifications for new pull requests (default: true)
- `den.git.includeDraftPRs`: Include draft pull requests in monitoring (default: false)

## Status Bar

The extension displays its status in the VS Code status bar with:
- **Success** (✓): Configuration loaded successfully
- **Fail** (✗): Error or no configuration found
- **In Progress** (⟳): Initializing or loading

### Git Status Bar

A separate Git status bar item shows:
- **Current Branch**: Displays the active Git branch
- **Repository Status**: Shows if the working directory is clean or modified
- **Sync Status**: Indicates if the branch is ahead/behind remote (↑2 ↓1)

### Status Bar Interaction

**Click the status bar item** to access a quick menu with options:
- ⚙️ **Settings**: Open DEN extension settings
- ✓ **Validate Config**: Check configuration file validity
- ⟳ **Reload Config**: Reload configuration from disk
- 🌿 **Git Status**: Show repository information
- 🔀 **Pull Requests**: View open pull requests

The status bar provides real-time feedback during operations and shows detailed validation results when checking configuration files.

## Git Integration

### Supported Repository Hosts
- **GitHub**: Full pull request monitoring and repository information
- **GitLab**: Merge request tracking and project details
- **Bitbucket**: Pull request monitoring and repository data
- **Other**: Basic Git operations and status display

### Pull Request Monitoring
- **Automatic Detection**: Polls for new pull requests at configurable intervals
- **Branch Filtering**: Only monitors specified branches (develop, test, master, main)
- **Smart Notifications**: Shows alerts for new PRs with direct links to view them
- **Real-time Updates**: Status bar reflects current repository state

### Git Operations
- **Branch Management**: Switch between branches with quick pick interface
- **Status Monitoring**: Real-time working directory and sync status
- **Repository Info**: View detailed repository information and remotes
- **Commit History**: Access to recent commit information

## Performance Optimizations

- **Configuration Caching**: Reduces file system calls with intelligent caching
- **File Watching**: Only reloads when configuration files actually change
- **Status Bar Optimization**: Prevents unnecessary UI updates
- **Async Operations**: Non-blocking configuration loading and validation
- **Resource Management**: Proper cleanup of file watchers and caches
- **Git Polling**: Configurable intervals to balance responsiveness and performance
- **Smart Notifications**: Only shows alerts when new pull requests are detected

## Development

### Prerequisites

- Node.js 16+
- VS Code 1.74+

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Compile the extension:
   ```bash
   npm run compile
   ```

3. Press F5 to run the extension in a new Extension Development Host window

### Build Commands

- `npm run compile`: Build the extension
- `npm run watch`: Watch for changes and rebuild automatically
- `npm run lint`: Run ESLint
- `npm test`: Run tests

## Architecture

The extension is built with a modular architecture:

- **Extension**: Main entry point and command registration
- **ConfigManager**: Handles configuration loading, validation, and caching
- **StatusBarManager**: Manages status bar display and interactions
- **ErrorHandler**: Centralized error handling and logging utilities
- **GitManager**: Core Git operations and repository management
- **RepositoryHostAPI**: Integration with GitHub, GitLab, and Bitbucket APIs
- **PullRequestMonitor**: Pull request monitoring and notification system

## License

MIT
