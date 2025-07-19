import { logger } from '@ui-ae/shared';
import { GraphitiTracker } from '@ae-desktop/graphiti-tracker';

export interface CodingTaskPattern {
  keywords: string[];
  confidence: number;
  action: 'code' | 'debug' | 'refactor' | 'review' | 'explain';
}

export class CodingTaskTrigger {
  private static instance: CodingTaskTrigger;
  private tracker?: GraphitiTracker;
  
  // Coding task detection patterns
  private readonly patterns: CodingTaskPattern[] = [
    {
      keywords: ['write code', 'create function', 'implement', 'build class', 'make component'],
      confidence: 0.9,
      action: 'code'
    },
    {
      keywords: ['debug', 'fix bug', 'error', 'not working', 'troubleshoot'],
      confidence: 0.85,
      action: 'debug'
    },
    {
      keywords: ['refactor', 'improve code', 'optimize', 'clean up', 'restructure'],
      confidence: 0.8,
      action: 'refactor'
    },
    {
      keywords: ['review code', 'check code', 'code quality', 'best practices'],
      confidence: 0.75,
      action: 'review'
    },
    {
      keywords: ['explain code', 'how does', 'what does this', 'understand'],
      confidence: 0.7,
      action: 'explain'
    }
  ];

  private constructor() {}

  static getInstance(): CodingTaskTrigger {
    if (!this.instance) {
      this.instance = new CodingTaskTrigger();
    }
    return this.instance;
  }

  setTracker(tracker: GraphitiTracker) {
    this.tracker = tracker;
  }

  /**
   * Analyze user input to detect coding tasks
   */
  async analyzeCodingIntent(userInput: string): Promise<{
    isCodingTask: boolean;
    confidence: number;
    action?: string;
    suggestClaudeCode: boolean;
  }> {
    const lowercaseInput = userInput.toLowerCase();
    
    // Check for explicit coding indicators
    const explicitCoding = this.checkExplicitCoding(lowercaseInput);
    if (explicitCoding.found) {
      return {
        isCodingTask: true,
        confidence: explicitCoding.confidence,
        action: explicitCoding.action,
        suggestClaudeCode: true
      };
    }

    // Check pattern matching
    let highestConfidence = 0;
    let detectedAction = '';

    for (const pattern of this.patterns) {
      const matches = pattern.keywords.filter(keyword => 
        lowercaseInput.includes(keyword)
      ).length;
      
      if (matches > 0) {
        const confidence = pattern.confidence * (matches / pattern.keywords.length);
        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          detectedAction = pattern.action;
        }
      }
    }

    // Track the analysis in Graphiti
    if (this.tracker && highestConfidence > 0.5) {
      await this.tracker.trackAction('coding_intent_detected', {
        confidence: highestConfidence,
        action: detectedAction,
        userInput: userInput.substring(0, 100) // First 100 chars for privacy
      });
    }

    return {
      isCodingTask: highestConfidence > 0.5,
      confidence: highestConfidence,
      action: detectedAction || undefined,
      suggestClaudeCode: highestConfidence > 0.7
    };
  }

  /**
   * Check for explicit coding language or framework mentions
   */
  private checkExplicitCoding(input: string): {
    found: boolean;
    confidence: number;
    action: string;
  } {
    const languages = [
      'javascript', 'typescript', 'python', 'java', 'c++', 'rust', 
      'go', 'ruby', 'php', 'swift', 'kotlin', 'c#', 'react', 
      'vue', 'angular', 'node', 'django', 'flask', 'spring'
    ];

    const codeKeywords = [
      'function', 'class', 'method', 'variable', 'api', 
      'component', 'module', 'package', 'library', 'framework',
      'algorithm', 'data structure', 'interface', 'repository'
    ];

    const hasLanguage = languages.some(lang => input.includes(lang));
    const hasCodeKeyword = codeKeywords.some(keyword => input.includes(keyword));

    if (hasLanguage && hasCodeKeyword) {
      return { found: true, confidence: 0.95, action: 'code' };
    } else if (hasLanguage || hasCodeKeyword) {
      return { found: true, confidence: 0.8, action: 'code' };
    }

    return { found: false, confidence: 0, action: '' };
  }

  /**
   * Generate Claude Code launch suggestion
   */
  generateClaudeCodeSuggestion(context: {
    action?: string;
    projectPath?: string;
    fileContext?: string;
  }): string {
    const { action, projectPath, fileContext } = context;

    let suggestion = '💡 **Coding task detected!**\n\n';
    
    suggestion += 'For an enhanced coding experience, you can use Claude Code with ae-desktop integration:\n\n';
    
    if (action) {
      const actionMessages = {
        code: '✍️ Writing new code',
        debug: '🐛 Debugging issues',
        refactor: '🔧 Refactoring code',
        review: '👀 Reviewing code',
        explain: '📚 Explaining code'
      };
      suggestion += `**Task**: ${actionMessages[action] || 'Coding assistance'}\n`;
    }

    if (projectPath) {
      suggestion += `**Project**: ${projectPath}\n`;
    }

    if (fileContext) {
      suggestion += `**Context**: ${fileContext}\n`;
    }

    suggestion += '\n**Enhanced features with ae-desktop:**\n';
    suggestion += '- 🧠 Automatic context awareness from your current project\n';
    suggestion += '- 📊 Code changes tracked in knowledge graph\n';
    suggestion += '- 🤖 SuperClaude integration for advanced AI assistance\n';
    suggestion += '- 🔄 Seamless switching between GUI and code tasks\n';

    return suggestion;
  }

  /**
   * Create context for Claude Code
   */
  async createClaudeCodeContext(userInput: string, additionalContext?: {
    currentFile?: string;
    projectPath?: string;
    recentActions?: any[];
  }): Promise<{
    prompt: string;
    context: Record<string, any>;
  }> {
    const analysis = await this.analyzeCodingIntent(userInput);
    
    // Build enhanced prompt for Claude Code
    let enhancedPrompt = userInput;
    
    if (additionalContext?.currentFile) {
      enhancedPrompt = `[Current file: ${additionalContext.currentFile}]\n\n${enhancedPrompt}`;
    }

    // Build context object
    const context: Record<string, any> = {
      source: 'ae-desktop',
      action: analysis.action,
      confidence: analysis.confidence,
      timestamp: new Date().toISOString()
    };

    if (additionalContext) {
      context.projectPath = additionalContext.projectPath;
      context.currentFile = additionalContext.currentFile;
      context.recentActions = additionalContext.recentActions;
    }

    // Track Claude Code context creation
    if (this.tracker) {
      await this.tracker.trackAction('claude_code_context_created', {
        action: analysis.action,
        hasFile: !!additionalContext?.currentFile,
        hasProject: !!additionalContext?.projectPath
      });
    }

    return {
      prompt: enhancedPrompt,
      context
    };
  }
}