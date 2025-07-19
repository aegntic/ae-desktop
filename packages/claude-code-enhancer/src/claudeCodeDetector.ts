import { execSync } from 'child_process';
import which from 'which';
import findProcess from 'find-process';
import { logger } from '@ui-ae/shared';

export interface ClaudeCodeInfo {
  installed: boolean;
  path?: string;
  version?: string;
  running?: boolean;
  pid?: number;
}

export class ClaudeCodeDetector {
  private static instance: ClaudeCodeDetector;
  private cachedInfo?: ClaudeCodeInfo;
  private lastCheck: number = 0;
  private readonly CACHE_DURATION = 60000; // 1 minute cache

  private constructor() {}

  static getInstance(): ClaudeCodeDetector {
    if (!this.instance) {
      this.instance = new ClaudeCodeDetector();
    }
    return this.instance;
  }

  /**
   * Detect if Claude Code is installed and running
   */
  async detect(forceRefresh = false): Promise<ClaudeCodeInfo> {
    const now = Date.now();
    
    // Return cached info if still valid
    if (!forceRefresh && this.cachedInfo && (now - this.lastCheck) < this.CACHE_DURATION) {
      return this.cachedInfo;
    }

    try {
      // Check if claude-code command exists
      const claudeCodePath = await this.findClaudeCode();
      
      if (!claudeCodePath) {
        this.cachedInfo = { installed: false };
        this.lastCheck = now;
        return this.cachedInfo;
      }

      // Get version
      const version = await this.getClaudeCodeVersion(claudeCodePath);
      
      // Check if running
      const runningInfo = await this.checkIfRunning();

      this.cachedInfo = {
        installed: true,
        path: claudeCodePath,
        version,
        running: runningInfo.running,
        pid: runningInfo.pid
      };
      
      this.lastCheck = now;
      logger.info('Claude Code detected:', this.cachedInfo);
      
      return this.cachedInfo;
    } catch (error) {
      logger.error('Error detecting Claude Code:', error);
      this.cachedInfo = { installed: false };
      this.lastCheck = now;
      return this.cachedInfo;
    }
  }

  /**
   * Find Claude Code executable path
   */
  private async findClaudeCode(): Promise<string | null> {
    try {
      // First try common command names
      const commands = ['claude-code', 'claude', 'anthropic-claude'];
      
      for (const cmd of commands) {
        try {
          const path = await which(cmd);
          if (path) return path;
        } catch (e) {
          // Command not found, continue
        }
      }

      // Check common installation paths
      const commonPaths = [
        '/usr/local/bin/claude-code',
        '/opt/claude-code/bin/claude-code',
        `${process.env.HOME}/.local/bin/claude-code`,
        `${process.env.HOME}/bin/claude-code`,
        // Windows paths
        'C:\\Program Files\\Claude Code\\claude-code.exe',
        'C:\\Program Files (x86)\\Claude Code\\claude-code.exe',
        `${process.env.APPDATA}\\Claude Code\\claude-code.exe`
      ];

      for (const path of commonPaths) {
        try {
          execSync(`test -f "${path}"`, { stdio: 'ignore' });
          return path;
        } catch (e) {
          // Path doesn't exist, continue
        }
      }

      return null;
    } catch (error) {
      logger.error('Error finding Claude Code:', error);
      return null;
    }
  }

  /**
   * Get Claude Code version
   */
  private async getClaudeCodeVersion(claudeCodePath: string): Promise<string | undefined> {
    try {
      const output = execSync(`"${claudeCodePath}" --version`, { 
        encoding: 'utf8',
        timeout: 5000 
      });
      
      // Extract version from output (adjust regex based on actual output format)
      const versionMatch = output.match(/(\d+\.\d+\.\d+)/);
      return versionMatch ? versionMatch[1] : undefined;
    } catch (error) {
      logger.warn('Could not get Claude Code version:', error);
      return undefined;
    }
  }

  /**
   * Check if Claude Code is currently running
   */
  private async checkIfRunning(): Promise<{ running: boolean; pid?: number }> {
    try {
      // Look for Claude Code processes
      const processes = await findProcess('name', /claude[- ]?code/i);
      
      if (processes.length > 0) {
        return {
          running: true,
          pid: processes[0].pid
        };
      }

      return { running: false };
    } catch (error) {
      logger.error('Error checking if Claude Code is running:', error);
      return { running: false };
    }
  }

  /**
   * Launch Claude Code if installed but not running
   */
  async launch(projectPath?: string): Promise<boolean> {
    const info = await this.detect();
    
    if (!info.installed || !info.path) {
      logger.warn('Cannot launch Claude Code: not installed');
      return false;
    }

    if (info.running) {
      logger.info('Claude Code is already running');
      return true;
    }

    try {
      const args = projectPath ? [projectPath] : [];
      execSync(`"${info.path}" ${args.join(' ')}`, { 
        detached: true,
        stdio: 'ignore'
      });
      
      logger.info('Claude Code launched successfully');
      
      // Update cached info
      this.cachedInfo = { ...info, running: true };
      
      return true;
    } catch (error) {
      logger.error('Failed to launch Claude Code:', error);
      return false;
    }
  }

  /**
   * Get suggested installation instructions
   */
  getInstallationInstructions(): string {
    const platform = process.platform;
    
    const instructions = {
      darwin: `To install Claude Code on macOS:
1. Visit https://claude.ai/code
2. Download the macOS installer
3. Open the .dmg file and drag Claude Code to Applications
4. Run: ln -s /Applications/Claude\\ Code.app/Contents/MacOS/claude-code /usr/local/bin/claude-code`,
      
      linux: `To install Claude Code on Linux:
1. Visit https://claude.ai/code
2. Download the Linux package for your distribution
3. For Debian/Ubuntu: sudo dpkg -i claude-code-*.deb
4. For other distributions, extract and add to PATH`,
      
      win32: `To install Claude Code on Windows:
1. Visit https://claude.ai/code
2. Download the Windows installer
3. Run the installer and follow the instructions
4. Claude Code will be added to your PATH automatically`
    };

    return instructions[platform] || 'Visit https://claude.ai/code to download Claude Code for your platform.';
  }
}