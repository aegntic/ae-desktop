import { EventEmitter } from 'events';
import { logger } from '@ui-ae/shared';
import { ClaudeCodeDetector } from './claudeCodeDetector';
import { CodingTaskTrigger } from './codingTaskTrigger';
import { ClaudeCodeContextProvider, AeDesktopContext } from './contextProvider';
import { GraphitiTracker } from '@ae-desktop/graphiti-tracker';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface EnhancementOptions {
  autoLaunch?: boolean;
  trackCodingActions?: boolean;
  provideContext?: boolean;
  suggestOnCodingTasks?: boolean;
}

export class ClaudeCodeEnhancementManager extends EventEmitter {
  private static instance: ClaudeCodeEnhancementManager;
  private detector: ClaudeCodeDetector;
  private trigger: CodingTaskTrigger;
  private contextProvider: ClaudeCodeContextProvider;
  private tracker?: GraphitiTracker;
  private options: EnhancementOptions;
  private isInitialized = false;

  private constructor() {
    super();
    this.detector = ClaudeCodeDetector.getInstance();
    this.trigger = CodingTaskTrigger.getInstance();
    this.contextProvider = ClaudeCodeContextProvider.getInstance();
    
    this.options = {
      autoLaunch: false, // Don't auto-launch by default
      trackCodingActions: true,
      provideContext: true,
      suggestOnCodingTasks: true
    };
  }

  static getInstance(): ClaudeCodeEnhancementManager {
    if (!this.instance) {
      this.instance = new ClaudeCodeEnhancementManager();
    }
    return this.instance;
  }

  /**
   * Initialize the enhancement manager
   */
  async initialize(tracker?: GraphitiTracker, options?: EnhancementOptions) {
    if (this.isInitialized) return;

    this.tracker = tracker;
    if (tracker) {
      this.trigger.setTracker(tracker);
      this.contextProvider.setTracker(tracker);
    }

    if (options) {
      this.options = { ...this.options, ...options };
    }

    // Check Claude Code installation
    const claudeCodeInfo = await this.detector.detect();
    
    if (claudeCodeInfo.installed) {
      logger.info('Claude Code detected:', claudeCodeInfo);
      this.emit('claude-code-detected', claudeCodeInfo);
    } else {
      logger.info('Claude Code not installed');
      this.emit('claude-code-not-found', {
        instructions: this.detector.getInstallationInstructions()
      });
    }

    // Clean old context files periodically
    this.startContextCleanup();

    this.isInitialized = true;
  }

  /**
   * Process user input for coding tasks
   */
  async processUserInput(userInput: string, context?: {
    currentFile?: string;
    projectPath?: string;
  }): Promise<{
    isCodingTask: boolean;
    suggestion?: string;
    claudeCodeAvailable: boolean;
    contextFile?: string;
  }> {
    // Analyze if this is a coding task
    const analysis = await this.trigger.analyzeCodingIntent(userInput);
    
    if (!analysis.isCodingTask) {
      return { isCodingTask: false, claudeCodeAvailable: false };
    }

    // Check Claude Code availability
    const claudeCodeInfo = await this.detector.detect();
    
    // Update context
    if (context?.projectPath) {
      this.contextProvider.updateContext({ projectPath: context.projectPath });
    }

    // Add to recent actions
    this.contextProvider.addRecentAction({
      type: 'coding_task_detected',
      details: {
        action: analysis.action,
        confidence: analysis.confidence,
        hasContext: !!context
      }
    });

    let suggestion: string | undefined;
    let contextFile: string | undefined;

    if (claudeCodeInfo.installed && this.options.suggestOnCodingTasks) {
      // Generate suggestion
      suggestion = this.trigger.generateClaudeCodeSuggestion({
        action: analysis.action,
        projectPath: context?.projectPath,
        fileContext: context?.currentFile
      });

      // Create context file if enabled
      if (this.options.provideContext) {
        const claudeContext = await this.trigger.createClaudeCodeContext(
          userInput,
          context
        );
        
        contextFile = await this.contextProvider.createContextFile({
          userInput,
          analysis,
          claudeContext,
          ...context
        });
      }

      // Track the suggestion
      if (this.tracker && this.options.trackCodingActions) {
        await this.tracker.trackAction('claude_code_suggested', {
          action: analysis.action,
          confidence: analysis.confidence,
          contextProvided: !!contextFile
        });
      }
    }

    return {
      isCodingTask: true,
      suggestion,
      claudeCodeAvailable: claudeCodeInfo.installed,
      contextFile
    };
  }

  /**
   * Launch Claude Code with ae-desktop context
   */
  async launchClaudeCodeWithContext(options?: {
    projectPath?: string;
    contextFile?: string;
    additionalArgs?: string[];
  }): Promise<boolean> {
    const claudeCodeInfo = await this.detector.detect();
    
    if (!claudeCodeInfo.installed) {
      logger.warn('Cannot launch Claude Code: not installed');
      this.emit('claude-code-launch-failed', {
        reason: 'not-installed',
        instructions: this.detector.getInstallationInstructions()
      });
      return false;
    }

    try {
      // Prepare launch arguments
      const args: string[] = [];
      
      if (options?.projectPath) {
        args.push(options.projectPath);
      }

      // Add ae-desktop enhancement flag
      args.push('--ae-desktop-enhanced');
      
      if (options?.contextFile) {
        args.push('--context', options.contextFile);
      }

      if (options?.additionalArgs) {
        args.push(...options.additionalArgs);
      }

      // Create enhancement instructions file
      const instructions = this.contextProvider.createEnhancementInstructions();
      const instructionsFile = await this.contextProvider.createContextFile({
        type: 'enhancement-instructions',
        instructions
      });
      args.push('--instructions', instructionsFile);

      // Launch Claude Code
      const command = `"${claudeCodeInfo.path}" ${args.join(' ')}`;
      logger.info('Launching Claude Code with command:', command);
      
      await execAsync(command, { detached: true });

      // Track the launch
      if (this.tracker) {
        await this.tracker.trackAction('claude_code_launched', {
          withContext: !!options?.contextFile,
          projectPath: options?.projectPath
        });
      }

      this.emit('claude-code-launched', {
        args,
        contextFile: options?.contextFile
      });

      return true;
    } catch (error) {
      logger.error('Failed to launch Claude Code:', error);
      this.emit('claude-code-launch-failed', {
        reason: 'launch-error',
        error
      });
      return false;
    }
  }

  /**
   * Get current enhancement status
   */
  async getStatus(): Promise<{
    claudeCodeInstalled: boolean;
    claudeCodeRunning: boolean;
    enhancementsActive: boolean;
    recentCodingTasks: number;
    contextFilesCreated: number;
  }> {
    const claudeCodeInfo = await this.detector.detect();
    const recentActions = this.contextProvider['context'].recentActions;
    const codingTasks = recentActions.filter(a => 
      a.type === 'coding_task_detected'
    ).length;

    return {
      claudeCodeInstalled: claudeCodeInfo.installed,
      claudeCodeRunning: claudeCodeInfo.running || false,
      enhancementsActive: this.isInitialized,
      recentCodingTasks: codingTasks,
      contextFilesCreated: recentActions.filter(a => 
        a.type === 'claude_code_context_file_created'
      ).length
    };
  }

  /**
   * Update options
   */
  updateOptions(options: Partial<EnhancementOptions>) {
    this.options = { ...this.options, ...options };
    logger.info('Claude Code enhancement options updated:', this.options);
  }

  /**
   * Start periodic context cleanup
   */
  private startContextCleanup() {
    // Clean old context files every 24 hours
    setInterval(() => {
      this.contextProvider.cleanOldContextFiles(7).catch(error => {
        logger.error('Context cleanup failed:', error);
      });
    }, 24 * 60 * 60 * 1000);

    // Initial cleanup
    this.contextProvider.cleanOldContextFiles(7).catch(error => {
      logger.error('Initial context cleanup failed:', error);
    });
  }
}