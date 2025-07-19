/**
 * SuperClaude Integration for ae-desktop
 * Adapts SuperClaude principles to work with any VLM model
 */

import { logger } from '@main/logger';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';

export interface SuperClaudeCommand {
  name: string;
  description: string;
  enabled: boolean;
  handler?: string;
}

export interface SuperClaudePersona {
  name: string;
  description: string;
  enabled: boolean;
  confidence: number;
  triggers: string[];
}

export interface SuperClaudeAdapter {
  commands: Map<string, SuperClaudeCommand>;
  personas: Map<string, SuperClaudePersona>;
  principles: {
    taskManagement: boolean;
    contextEngineering: boolean;
    iterativeRefinement: boolean;
    errorHandling: boolean;
    documentation: boolean;
  };
  modelCapabilities: {
    maxTokens: number;
    supportsStructuredOutput: boolean;
    supportsVision: boolean;
    supportsFunctionCalling: boolean;
  };
}

export class SuperClaudeIntegration {
  private static instance: SuperClaudeIntegration;
  private adapter: SuperClaudeAdapter | null = null;
  private superClaudePath: string;

  private constructor() {
    this.superClaudePath = path.join(os.homedir(), '.claude');
  }

  static getInstance(): SuperClaudeIntegration {
    if (!SuperClaudeIntegration.instance) {
      SuperClaudeIntegration.instance = new SuperClaudeIntegration();
    }
    return SuperClaudeIntegration.instance;
  }

  async initialize(modelProvider: string): Promise<SuperClaudeAdapter> {
    logger.info(`Initializing SuperClaude integration for model: ${modelProvider}`);

    // Create adapter based on model capabilities
    this.adapter = await this.createAdapter(modelProvider);

    // Load SuperClaude framework if available
    if (await this.isSuperClaudeInstalled()) {
      await this.loadSuperClaudeFramework();
    }

    return this.adapter;
  }

  private async createAdapter(modelProvider: string): Promise<SuperClaudeAdapter> {
    const modelCapabilities = this.detectModelCapabilities(modelProvider);
    
    const adapter: SuperClaudeAdapter = {
      commands: this.createCommands(modelCapabilities),
      personas: this.createPersonas(modelCapabilities),
      principles: {
        taskManagement: true,
        contextEngineering: true,
        iterativeRefinement: true,
        errorHandling: true,
        documentation: true,
      },
      modelCapabilities,
    };

    return adapter;
  }

  private detectModelCapabilities(modelProvider: string): SuperClaudeAdapter['modelCapabilities'] {
    // Base capabilities for all models
    const base = {
      maxTokens: 4096,
      supportsStructuredOutput: false,
      supportsVision: true, // ae-desktop is vision-based
      supportsFunctionCalling: false,
    };

    // Adjust based on known models
    if (modelProvider.includes('gemma')) {
      return {
        ...base,
        maxTokens: 8192,
        supportsStructuredOutput: true,
      };
    } else if (modelProvider.includes('llama')) {
      return {
        ...base,
        maxTokens: 4096,
        supportsFunctionCalling: true,
      };
    } else if (modelProvider.includes('gpt') || modelProvider.includes('claude')) {
      return {
        ...base,
        maxTokens: 16384,
        supportsStructuredOutput: true,
        supportsFunctionCalling: true,
      };
    }

    return base;
  }

  private createCommands(capabilities: SuperClaudeAdapter['modelCapabilities']): Map<string, SuperClaudeCommand> {
    const commands = new Map<string, SuperClaudeCommand>();

    // Core commands that work with any model
    const coreCommands: SuperClaudeCommand[] = [
      {
        name: 'implement',
        description: 'Implement features or functionality',
        enabled: true,
      },
      {
        name: 'analyze',
        description: 'Analyze code or system behavior',
        enabled: true,
      },
      {
        name: 'troubleshoot',
        description: 'Debug and fix issues',
        enabled: true,
      },
      {
        name: 'document',
        description: 'Generate documentation',
        enabled: true,
      },
      {
        name: 'improve',
        description: 'Optimize and refactor code',
        enabled: true,
      },
    ];

    // Advanced commands based on capabilities
    if (capabilities.supportsStructuredOutput) {
      coreCommands.push(
        {
          name: 'design',
          description: 'Design system architecture',
          enabled: true,
        },
        {
          name: 'test',
          description: 'Generate and run tests',
          enabled: true,
        }
      );
    }

    if (capabilities.maxTokens >= 8192) {
      coreCommands.push({
        name: 'workflow',
        description: 'Complex multi-step workflows',
        enabled: true,
      });
    }

    // Add all commands to map
    coreCommands.forEach(cmd => commands.set(cmd.name, cmd));

    return commands;
  }

  private createPersonas(capabilities: SuperClaudeAdapter['modelCapabilities']): Map<string, SuperClaudePersona> {
    const personas = new Map<string, SuperClaudePersona>();

    // Core personas that adapt to any model
    const corePersonas: SuperClaudePersona[] = [
      {
        name: 'architect',
        description: 'System design and architecture expert',
        enabled: true,
        confidence: capabilities.maxTokens >= 8192 ? 0.9 : 0.7,
        triggers: ['design', 'architecture', 'structure', 'pattern'],
      },
      {
        name: 'developer',
        description: 'General development and implementation',
        enabled: true,
        confidence: 0.9,
        triggers: ['implement', 'code', 'function', 'feature'],
      },
      {
        name: 'analyzer',
        description: 'Code analysis and debugging expert',
        enabled: true,
        confidence: 0.9,
        triggers: ['analyze', 'debug', 'investigate', 'troubleshoot'],
      },
      {
        name: 'documenter',
        description: 'Documentation and explanation specialist',
        enabled: true,
        confidence: 0.9,
        triggers: ['document', 'explain', 'describe', 'readme'],
      },
    ];

    // Add specialized personas based on capabilities
    if (capabilities.supportsStructuredOutput) {
      corePersonas.push({
        name: 'tester',
        description: 'Testing and quality assurance expert',
        enabled: true,
        confidence: 0.8,
        triggers: ['test', 'verify', 'validate', 'check'],
      });
    }

    // Add all personas to map
    corePersonas.forEach(persona => personas.set(persona.name, persona));

    return personas;
  }

  private async isSuperClaudeInstalled(): Promise<boolean> {
    try {
      await fs.access(this.superClaudePath);
      return true;
    } catch {
      return false;
    }
  }

  private async loadSuperClaudeFramework(): Promise<void> {
    try {
      // Load command definitions
      const commandsPath = path.join(this.superClaudePath, 'commands', 'sc');
      const commandFiles = await fs.readdir(commandsPath).catch(() => []);

      for (const file of commandFiles) {
        if (file.endsWith('.md')) {
          const commandName = file.replace('.md', '');
          const content = await fs.readFile(path.join(commandsPath, file), 'utf-8');
          
          // Update command with SuperClaude definition
          const existingCommand = this.adapter?.commands.get(commandName);
          if (existingCommand) {
            existingCommand.handler = content;
          }
        }
      }

      logger.info('Loaded SuperClaude framework definitions');
    } catch (error) {
      logger.warn('Failed to load SuperClaude framework', error);
    }
  }

  getAdapter(): SuperClaudeAdapter | null {
    return this.adapter;
  }

  // Transform user input based on SuperClaude principles
  transformUserInput(input: string): string {
    if (!this.adapter) return input;

    // Check if input matches a command pattern
    for (const [cmdName, cmd] of this.adapter.commands) {
      if (input.toLowerCase().startsWith(`/${cmdName}`) || 
          input.toLowerCase().startsWith(`/sc:${cmdName}`)) {
        // Apply command transformation
        return this.applyCommandTransformation(cmdName, input);
      }
    }

    // Apply general principles
    return this.applyGeneralPrinciples(input);
  }

  private applyCommandTransformation(commandName: string, input: string): string {
    const command = this.adapter?.commands.get(commandName);
    if (!command) return input;

    // Extract arguments from input
    const args = input.replace(/^\/(sc:)?[^ ]+\s*/, '');

    // Build enhanced prompt based on command
    let enhancedPrompt = `Execute ${command.description}`;
    
    if (args) {
      enhancedPrompt += ` with the following requirements: ${args}`;
    }

    // Add SuperClaude principles
    if (this.adapter?.principles.taskManagement) {
      enhancedPrompt += '\n\nApproach this systematically by:';
      enhancedPrompt += '\n1. Understanding the requirements';
      enhancedPrompt += '\n2. Planning the implementation';
      enhancedPrompt += '\n3. Executing step by step';
      enhancedPrompt += '\n4. Verifying the results';
    }

    return enhancedPrompt;
  }

  private applyGeneralPrinciples(input: string): string {
    if (!this.adapter?.principles.contextEngineering) return input;

    // Detect which persona should handle this
    const activePersona = this.detectActivePersona(input);
    
    if (activePersona) {
      return `[${activePersona.name} persona active]\n\n${input}\n\nApproach: ${activePersona.description}`;
    }

    return input;
  }

  private detectActivePersona(input: string): SuperClaudePersona | null {
    if (!this.adapter) return null;

    const inputLower = input.toLowerCase();
    let bestMatch: SuperClaudePersona | null = null;
    let highestScore = 0;

    for (const [, persona] of this.adapter.personas) {
      if (!persona.enabled) continue;

      const matchScore = persona.triggers.reduce((score, trigger) => {
        return score + (inputLower.includes(trigger) ? 1 : 0);
      }, 0) * persona.confidence;

      if (matchScore > highestScore) {
        highestScore = matchScore;
        bestMatch = persona;
      }
    }

    return highestScore > 0.5 ? bestMatch : null;
  }
}