const path = require('path');
const os = require('os');
const fs = require('fs');

/**
 * TeaRoom data directory management
 */
class TeaRoomPaths {
  constructor() {
    this.appName = 'TeaRoom';
    this.initializePaths();
  }

  /**
   * Get platform-specific application data directory
   */
  getDataDirectory() {
    const platform = os.platform();
    const homeDir = os.homedir();

    switch (platform) {
      case 'darwin': // macOS
        return path.join(homeDir, 'Library', 'Application Support', this.appName);
      
      case 'win32': // Windows
        return path.join(process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming'), this.appName);
      
      case 'linux': // Linux
        return path.join(process.env.XDG_DATA_HOME || path.join(homeDir, '.local', 'share'), this.appName);
      
      default:
        return path.join(homeDir, `.${this.appName.toLowerCase()}`);
    }
  }

  /**
   * Initialize all necessary directories
   */
  initializePaths() {
    this.dataDir = this.getDataDirectory();
    this.dbDir = path.join(this.dataDir, 'database');
    this.uploadsDir = path.join(this.dataDir, 'uploads');
    this.logsDir = path.join(this.dataDir, 'logs');
    this.configDir = path.join(this.dataDir, 'config');

    // Create directories if they don't exist
    [this.dataDir, this.dbDir, this.uploadsDir, this.logsDir, this.configDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    });
  }

  /**
   * Get database file path
   */
  getDatabasePath() {
    return path.join(this.dbDir, 'tearoom.db');
  }

  /**
   * Get uploads directory path
   */
  getUploadsPath() {
    return this.uploadsDir;
  }

  /**
   * Get logs directory path
   */
  getLogsPath() {
    return this.logsDir;
  }

  /**
   * Get config file path
   */
  getConfigPath(filename = 'config.json') {
    return path.join(this.configDir, filename);
  }

  /**
   * Get main data directory
   */
  getDataPath() {
    return this.dataDir;
  }

  /**
   * Get relative path from project root to data directory
   */
  getRelativeDataPath() {
    const projectRoot = path.join(__dirname, '../..');
    return path.relative(projectRoot, this.dataDir);
  }

  /**
   * Create symbolic link from project directory to data directory
   */
  createDataSymlink() {
    const projectRoot = path.join(__dirname, '../..');
    const symlinkPath = path.join(projectRoot, 'data');

    try {
      // Remove existing symlink if it exists
      if (fs.existsSync(symlinkPath)) {
        fs.unlinkSync(symlinkPath);
      }

      // Create new symlink
      fs.symlinkSync(this.dataDir, symlinkPath);
      console.log(`🔗 Created symlink: ${symlinkPath} -> ${this.dataDir}`);
    } catch (error) {
      console.warn(`⚠️ Could not create symlink: ${error.message}`);
    }
  }

  /**
   * Get system info for debugging
   */
  getSystemInfo() {
    return {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      dataDirectory: this.dataDir,
      databasePath: this.getDatabasePath(),
      uploadsPath: this.getUploadsPath(),
      logsPath: this.getLogsPath()
    };
  }
}

module.exports = new TeaRoomPaths();