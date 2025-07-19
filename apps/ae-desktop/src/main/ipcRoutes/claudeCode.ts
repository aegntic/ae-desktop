/**
 * Copyright (c) 2025 aegntic
 * SPDX-License-Identifier: Apache-2.0
 */
import { initIpc } from '@ui-ae/electron-ipc/main';
import { ClaudeCodeEnhancementManager } from '@ae-desktop/claude-code-enhancer';
import { logger } from '../logger';
import { GraphitiTracker } from '@ae-desktop/graphiti-tracker';

const t = initIpc.create();

let enhancementManager: ClaudeCodeEnhancementManager | null = null;
let tracker: GraphitiTracker | null = null;

/**
 * Initialize Claude Code enhancement manager
 */
export async function initializeClaudeCodeManager(graphitiTracker?: GraphitiTracker) {
  tracker = graphitiTracker || null;
  enhancementManager = ClaudeCodeEnhancementManager.getInstance();

  try {
    await enhancementManager.initialize(tracker, {
      autoLaunch: false,
      trackCodingActions: true,
      provideContext: true,
      suggestOnCodingTasks: true
    });

    // Listen for enhancement events
    enhancementManager.on('claude-code-detected', (info) => {
      logger.info('Claude Code detected:', info);
    });

    enhancementManager.on('claude-code-not-found', (data) => {
      logger.info('Claude Code not found, instructions:', data.instructions);
    });

    enhancementManager.on('claude-code-launched', (data) => {
      logger.info('Claude Code launched with context:', data);
    });

    enhancementManager.on('claude-code-launch-failed', (data) => {
      logger.error('Claude Code launch failed:', data);
    });
  } catch (error) {
    logger.error('Failed to initialize Claude Code enhancement manager:', error);
  }
}

export const claudeCodeRoute = t.router({
  checkStatus: t.procedure
    .handle(async () => {
      try {
        if (!enhancementManager) {
          throw new Error('Enhancement manager not initialized');
        }
        
        const status = await enhancementManager.getStatus();
        return { success: true, status };
      } catch (error) {
        logger.error('Error checking Claude Code status:', error);
        throw error;
      }
    }),

  processInput: t.procedure
    .input<{
      userInput: string;
      context?: {
        currentFile?: string;
        projectPath?: string;
        recentActions?: any[];
      };
    }>()
    .handle(async ({ input }) => {
      try {
        if (!enhancementManager) {
          throw new Error('Enhancement manager not initialized');
        }

        const result = await enhancementManager.processUserInput(
          input.userInput,
          input.context
        );
        return { success: true, ...result };
      } catch (error) {
        logger.error('Error processing user input:', error);
        throw error;
      }
    }),

  launch: t.procedure
    .input<{
      projectPath?: string;
      contextFile?: string;
      additionalArgs?: string[];
    }>()
    .handle(async ({ input }) => {
      try {
        if (!enhancementManager) {
          throw new Error('Enhancement manager not initialized');
        }

        const launched = await enhancementManager.launchClaudeCodeWithContext(input);
        return { success: launched };
      } catch (error) {
        logger.error('Error launching Claude Code:', error);
        throw error;
      }
    }),

  updateOptions: t.procedure
    .input<{
      autoLaunch?: boolean;
      trackCodingActions?: boolean;
      provideContext?: boolean;
      suggestOnCodingTasks?: boolean;
    }>()
    .handle(async ({ input }) => {
      try {
        if (!enhancementManager) {
          throw new Error('Enhancement manager not initialized');
        }

        enhancementManager.updateOptions(input);
        return { success: true };
      } catch (error) {
        logger.error('Error updating options:', error);
        throw error;
      }
    }),
});