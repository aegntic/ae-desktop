import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { logger } from '@ui-ae/shared';
import { GraphitiTracker } from '@ae-desktop/graphiti-tracker';

export interface AeDesktopContext {
  version: string;
  sessionId: string;
  projectPath?: string;
  recentActions: Array<{
    type: string;
    timestamp: string;
    details: any;
  }>;
  graphitiEnabled: boolean;
  superClaudeEnabled: boolean;
  currentModels: {
    vision?: string;
    language?: string;
  };
}

export class ClaudeCodeContextProvider {
  private static instance: ClaudeCodeContextProvider;
  private contextPath: string;
  private context: AeDesktopContext;
  private tracker?: GraphitiTracker;

  private constructor() {
    // Create context directory
    this.contextPath = join(homedir(), '.ae-desktop', 'claude-code-context');
    if (!existsSync(this.contextPath)) {
      mkdirSync(this.contextPath, { recursive: true });
    }

    // Initialize context
    this.context = {
      version: '0.1.0',
      sessionId: this.generateSessionId(),
      recentActions: [],
      graphitiEnabled: true,
      superClaudeEnabled: true,
      currentModels: {}
    };
  }

  static getInstance(): ClaudeCodeContextProvider {
    if (!this.instance) {
      this.instance = new ClaudeCodeContextProvider();
    }
    return this.instance;
  }

  setTracker(tracker: GraphitiTracker) {
    this.tracker = tracker;
  }

  /**
   * Update the current context
   */
  updateContext(updates: Partial<AeDesktopContext>) {
    this.context = { ...this.context, ...updates };
    this.saveContext();
  }

  /**
   * Add a recent action to context
   */
  addRecentAction(action: {
    type: string;
    timestamp?: string;
    details: any;
  }) {
    const actionWithTimestamp = {
      ...action,
      timestamp: action.timestamp || new Date().toISOString()
    };

    this.context.recentActions.unshift(actionWithTimestamp);
    
    // Keep only last 50 actions
    if (this.context.recentActions.length > 50) {
      this.context.recentActions = this.context.recentActions.slice(0, 50);
    }

    this.saveContext();
  }

  /**
   * Create a context file for Claude Code
   */
  async createContextFile(additionalData?: any): Promise<string> {
    const contextFile = join(this.contextPath, `context-${Date.now()}.json`);
    
    const fullContext = {
      ...this.context,
      timestamp: new Date().toISOString(),
      additionalData
    };

    try {
      writeFileSync(contextFile, JSON.stringify(fullContext, null, 2));
      logger.info('Created Claude Code context file:', contextFile);

      // Track context creation
      if (this.tracker) {
        await this.tracker.trackAction('claude_code_context_file_created', {
          sessionId: this.context.sessionId,
          actionsCount: this.context.recentActions.length
        });
      }

      return contextFile;
    } catch (error) {
      logger.error('Failed to create context file:', error);
      throw error;
    }
  }

  /**
   * Create ae-desktop enhancement instructions for Claude Code
   */
  createEnhancementInstructions(): string {
    return `# ae-desktop Enhanced Coding Session

You are now working within an ae-desktop enhanced environment with the following capabilities:

## Available Features:
1. **Knowledge Graph Tracking**: All your code changes are automatically tracked in a temporal knowledge graph via Graphiti
2. **SuperClaude Integration**: Advanced AI capabilities with specialized personas and commands
3. **Context Awareness**: Access to recent GUI actions and system state
4. **Model Flexibility**: Working with ${this.context.currentModels.language || 'local AI models'}

## Recent Actions:
${this.context.recentActions.slice(0, 5).map(action => 
  `- ${action.timestamp}: ${action.type}`
).join('\n')}

## Session Information:
- Session ID: ${this.context.sessionId}
- Project Path: ${this.context.projectPath || 'Not set'}
- Graphiti Tracking: ${this.context.graphitiEnabled ? 'Enabled' : 'Disabled'}

## Enhanced Commands:
When coding, you can use these ae-desktop specific features:
- \`@track\`: Explicitly track important code changes in the knowledge graph
- \`@context\`: Get full ae-desktop context including recent GUI actions
- \`@persona\`: Activate specific SuperClaude personas for specialized help
- \`@integrate\`: Generate code that integrates with ae-desktop features

## Best Practices:
1. Your code changes are automatically tracked - add meaningful comments for better graph relationships
2. Consider the GUI context when writing automation code
3. Use the knowledge graph to understand code evolution over time
4. Leverage SuperClaude personas for specialized tasks (e.g., security, performance)

Remember: You're not just coding, you're building within an intelligent, context-aware environment!`;
  }

  /**
   * Get context for specific file types
   */
  getFileTypeContext(filePath: string): Record<string, any> {
    const ext = filePath.split('.').pop()?.toLowerCase();
    
    const contexts = {
      ts: { language: 'TypeScript', framework: 'ae-desktop uses TypeScript' },
      tsx: { language: 'TypeScript React', framework: 'React components in ae-desktop' },
      js: { language: 'JavaScript', note: 'Consider using TypeScript for ae-desktop' },
      py: { language: 'Python', note: 'Likely for Graphiti or AI services' },
      json: { language: 'JSON', note: 'Configuration or package file' },
      md: { language: 'Markdown', note: 'Documentation file' }
    };

    return contexts[ext || ''] || { language: 'Unknown' };
  }

  /**
   * Save current context
   */
  private saveContext() {
    try {
      const contextFile = join(this.contextPath, 'current-context.json');
      writeFileSync(contextFile, JSON.stringify(this.context, null, 2));
    } catch (error) {
      logger.error('Failed to save context:', error);
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `ae-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Clean old context files
   */
  async cleanOldContextFiles(daysToKeep = 7) {
    const fs = require('fs').promises;
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

    try {
      const files = await fs.readdir(this.contextPath);
      
      for (const file of files) {
        if (file.startsWith('context-') && file.endsWith('.json')) {
          const filePath = join(this.contextPath, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime.getTime() < cutoffTime) {
            await fs.unlink(filePath);
            logger.info(`Cleaned old context file: ${file}`);
          }
        }
      }
    } catch (error) {
      logger.error('Error cleaning old context files:', error);
    }
  }
}