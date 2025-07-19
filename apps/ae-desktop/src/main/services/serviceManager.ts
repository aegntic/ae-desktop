/**
 * Unified Service Manager for ae-desktop
 * Manages all background services including Graphiti, Ollama, and SuperClaude integration
 */

import { spawn, ChildProcess } from 'child_process';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { logger } from '@main/logger';
import { GraphitiTrackerService } from './graphitiTracker';
import { SettingStore } from '@main/store/setting';
import { initializeClaudeCodeManager } from '@main/ipcRoutes/claudeCode';
import * as os from 'os';

interface ServiceStatus {
  graphiti: boolean;
  ollama: boolean;
  neo4j: boolean;
  superClaude: boolean;
}

export class ServiceManager {
  private static instance: ServiceManager;
  private dockerComposeProcess: ChildProcess | null = null;
  private ollamaProcess: ChildProcess | null = null;
  private serviceStatus: ServiceStatus = {
    graphiti: false,
    ollama: false,
    neo4j: false,
    superClaude: false,
  };
  private isShuttingDown = false;

  private constructor() {}

  static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }

  async initialize(): Promise<void> {
    logger.info('Initializing ae-desktop Service Manager...');

    // Check if services should be enabled
    const settings = SettingStore.getInstance();
    const servicesEnabled = settings.get('backgroundServicesEnabled', true);

    if (!servicesEnabled) {
      logger.info('Background services are disabled in settings');
      return;
    }

    // Initialize services in order
    try {
      // 1. Start Ollama (for local LLM)
      await this.startOllama();

      // 2. Start Docker services (Neo4j + Graphiti)
      await this.startDockerServices();

      // 3. Initialize SuperClaude framework
      await this.initializeSuperClaude();

      // 4. Initialize Graphiti tracker
      await this.initializeGraphiti();

      // 5. Initialize Claude Code enhancement (after Graphiti)
      await this.initializeClaudeCode();

      logger.info('All services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize services', error);
    }

    // Setup graceful shutdown
    app.on('before-quit', async () => {
      await this.shutdown();
    });
  }

  private async startOllama(): Promise<void> {
    try {
      // Check if Ollama is already running
      const isRunning = await this.checkOllamaStatus();
      if (isRunning) {
        logger.info('Ollama is already running');
        this.serviceStatus.ollama = true;
        return;
      }

      logger.info('Starting Ollama service...');

      // Start Ollama based on platform
      const platform = os.platform();
      if (platform === 'darwin' || platform === 'linux') {
        // On macOS/Linux, try to start system Ollama
        this.ollamaProcess = spawn('ollama', ['serve'], {
          detached: true,
          stdio: 'ignore',
        });
        this.ollamaProcess.unref();
      } else if (platform === 'win32') {
        // On Windows, start Ollama.exe if installed
        const ollamaPath = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Ollama', 'ollama.exe');
        if (await this.fileExists(ollamaPath)) {
          this.ollamaProcess = spawn(ollamaPath, ['serve'], {
            detached: true,
            stdio: 'ignore',
          });
          this.ollamaProcess.unref();
        }
      }

      // Wait for Ollama to be ready
      await this.waitForOllama();

      // Pull required models
      await this.pullOllamaModels();

      this.serviceStatus.ollama = true;
      logger.info('Ollama service started successfully');
    } catch (error) {
      logger.error('Failed to start Ollama', error);
    }
  }

  private async checkOllamaStatus(): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      return response.ok;
    } catch {
      return false;
    }
  }

  private async waitForOllama(maxRetries = 30): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      if (await this.checkOllamaStatus()) {
        return;
      }
      await this.sleep(1000);
    }
    throw new Error('Ollama failed to start');
  }

  private async pullOllamaModels(): Promise<void> {
    const models = ['gemma3n:e2b', 'nomic-embed-text'];
    
    for (const model of models) {
      try {
        logger.info(`Pulling Ollama model: ${model}`);
        await fetch('http://localhost:11434/api/pull', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: model }),
        });
      } catch (error) {
        logger.error(`Failed to pull model ${model}`, error);
      }
    }
  }

  private async startDockerServices(): Promise<void> {
    try {
      // Check if Docker is available
      const dockerAvailable = await this.checkDockerAvailable();
      if (!dockerAvailable) {
        logger.warn('Docker is not available, skipping Docker services');
        return;
      }

      logger.info('Starting Docker services...');

      // Get the path to docker-compose.yml
      const dockerComposePath = path.join(
        app.getAppPath(),
        'packages',
        'graphiti-tracker',
        'docker-compose.ae-desktop.yml'
      );

      // Check if docker-compose file exists
      if (!(await this.fileExists(dockerComposePath))) {
        logger.warn('docker-compose.yml not found');
        return;
      }

      // Start Docker Compose
      this.dockerComposeProcess = spawn('docker-compose', ['-f', dockerComposePath, 'up', '-d'], {
        cwd: path.dirname(dockerComposePath),
        stdio: 'pipe',
      });

      this.dockerComposeProcess.on('error', (error) => {
        logger.error('Docker Compose error', error);
      });

      // Wait for services to be ready
      await this.waitForDockerServices();

      this.serviceStatus.neo4j = true;
      this.serviceStatus.graphiti = true;
      logger.info('Docker services started successfully');
    } catch (error) {
      logger.error('Failed to start Docker services', error);
    }
  }

  private async checkDockerAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const dockerCheck = spawn('docker', ['--version']);
      dockerCheck.on('close', (code) => {
        resolve(code === 0);
      });
      dockerCheck.on('error', () => {
        resolve(false);
      });
    });
  }

  private async waitForDockerServices(): Promise<void> {
    // Wait for Neo4j
    await this.waitForService('http://localhost:7474', 60);
    
    // Wait for Graphiti
    await this.waitForService('http://localhost:8100/health', 60);
  }

  private async waitForService(url: string, maxRetries = 30): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return;
        }
      } catch {
        // Service not ready yet
      }
      await this.sleep(1000);
    }
    throw new Error(`Service at ${url} failed to start`);
  }

  private async initializeSuperClaude(): Promise<void> {
    try {
      logger.info('Initializing SuperClaude framework integration...');

      // Get the SuperClaude framework files path
      const superClaudePath = path.join(os.homedir(), '.claude');
      
      // Check if SuperClaude is installed
      if (!(await this.fileExists(superClaudePath))) {
        logger.info('SuperClaude not installed, skipping');
        return;
      }

      // Load SuperClaude principles and adapt them for the current model
      await this.loadSuperClaudePrinciples();

      this.serviceStatus.superClaude = true;
      logger.info('SuperClaude framework integrated successfully');
    } catch (error) {
      logger.error('Failed to initialize SuperClaude', error);
    }
  }

  private async loadSuperClaudePrinciples(): Promise<void> {
    const settings = SettingStore.getInstance();
    const vlmProvider = settings.get('vlmProvider');
    
    // Create model-agnostic adapter for SuperClaude principles
    const adapter = {
      // Core principles that apply to any model
      principles: {
        taskManagement: true,
        contextEngineering: true,
        iterativeRefinement: true,
        errorHandling: true,
        documentation: true,
      },
      
      // Adapt commands based on model capabilities
      commands: this.adaptCommandsForModel(vlmProvider),
      
      // Personas adapted for current model
      personas: this.adaptPersonasForModel(vlmProvider),
    };

    // Store adapter in settings for use by the aegnt
    settings.set('superClaudeAdapter', adapter);
  }

  private adaptCommandsForModel(provider: string): Record<string, boolean> {
    // Enable/disable commands based on model capabilities
    const baseCommands = {
      implement: true,
      analyze: true,
      improve: true,
      troubleshoot: true,
      document: true,
      test: true,
      build: true,
      design: true,
      cleanup: true,
      estimate: true,
      explain: true,
      git: true,
      task: true,
      workflow: true,
      index: true,
      load: true,
      spawn: true,
    };

    // Adjust based on model capabilities
    if (provider.includes('gemma') || provider.includes('llama')) {
      // These models might have limitations
      baseCommands.spawn = false; // Complex orchestration might be limited
    }

    return baseCommands;
  }

  private adaptPersonasForModel(provider: string): Record<string, any> {
    // Create model-agnostic personas
    return {
      architect: { enabled: true, confidence: 0.8 },
      frontend: { enabled: true, confidence: 0.8 },
      backend: { enabled: true, confidence: 0.8 },
      analyzer: { enabled: true, confidence: 0.9 },
      security: { enabled: true, confidence: 0.7 },
      scribe: { enabled: true, confidence: 0.9 },
      mentor: { enabled: true, confidence: 0.8 },
      refactorer: { enabled: true, confidence: 0.8 },
      qa: { enabled: true, confidence: 0.8 },
      devops: { enabled: true, confidence: 0.7 },
      performance: { enabled: true, confidence: 0.7 },
    };
  }

  private async initializeGraphiti(): Promise<void> {
    try {
      if (!this.serviceStatus.graphiti) {
        logger.warn('Graphiti service not running, skipping initialization');
        return;
      }

      await GraphitiTrackerService.getInstance().initialize();
      
      // Start a new session for this app launch
      const sessionId = await GraphitiTrackerService.getInstance().startSession(
        os.userInfo().username,
        'ae-desktop session'
      );
      
      logger.info(`Started Graphiti session: ${sessionId}`);
    } catch (error) {
      logger.error('Failed to initialize Graphiti', error);
    }
  }

  private async initializeClaudeCode(): Promise<void> {
    try {
      logger.info('Initializing Claude Code enhancement...');

      // Get Graphiti tracker instance if available
      const tracker = this.serviceStatus.graphiti 
        ? GraphitiTrackerService.getInstance().getTracker()
        : undefined;

      // Initialize Claude Code manager with Graphiti integration
      await initializeClaudeCodeManager(tracker);

      logger.info('Claude Code enhancement initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Claude Code enhancement', error);
    }
  }

  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }
    
    this.isShuttingDown = true;
    logger.info('Shutting down ae-desktop services...');

    // End Graphiti session
    try {
      await GraphitiTrackerService.getInstance().endSession();
    } catch (error) {
      logger.error('Error ending Graphiti session', error);
    }

    // Stop Docker services
    if (this.dockerComposeProcess) {
      const dockerComposePath = path.join(
        app.getAppPath(),
        'packages',
        'graphiti-tracker',
        'docker-compose.ae-desktop.yml'
      );
      
      spawn('docker-compose', ['-f', dockerComposePath, 'down'], {
        cwd: path.dirname(dockerComposePath),
      });
    }

    // Note: We don't stop Ollama as it might be used by other applications

    logger.info('Services shutdown complete');
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getServiceStatus(): ServiceStatus {
    return { ...this.serviceStatus };
  }

  isReady(): boolean {
    return this.serviceStatus.ollama && this.serviceStatus.graphiti;
  }
}