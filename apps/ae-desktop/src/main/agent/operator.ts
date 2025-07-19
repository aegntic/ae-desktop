/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Key, keyboard } from '@computer-use/nut-js';
import {
  type ScreenshotOutput,
  type ExecuteParams,
  type ExecuteOutput,
} from '@ui-ae/sdk/core';
import { NutJSOperator } from '@ui-ae/operator-nut-js';
import { clipboard } from 'electron';
import { desktopCapturer } from 'electron';

import * as env from '@main/env';
import { logger } from '@main/logger';
import { sleep } from '@ui-ae/shared/utils';
import { getScreenSize } from '@main/utils/screen';
import { GraphitiTrackerService } from '@main/services/graphitiTracker';

export class NutJSElectronOperator extends NutJSOperator {
  private tracker = GraphitiTrackerService.getInstance();
  private currentUserIntent?: string;
  static MANUAL = {
    ACTION_SPACES: [
      `click(start_box='[x1, y1, x2, y2]')`,
      `left_double(start_box='[x1, y1, x2, y2]')`,
      `right_single(start_box='[x1, y1, x2, y2]')`,
      `drag(start_box='[x1, y1, x2, y2]', end_box='[x3, y3, x4, y4]')`,
      `hotkey(key='')`,
      `type(content='') #If you want to submit your input, use "\\n" at the end of \`content\`.`,
      `scroll(start_box='[x1, y1, x2, y2]', direction='down or up or right or left')`,
      `wait() #Sleep for 5s and take a screenshot to check for any changes.`,
      `finished()`,
      `call_user() # Submit the task and call the user when the task is unsolvable, or when you need the user's help.`,
    ],
  };

  public async screenshot(): Promise<ScreenshotOutput> {
    const {
      physicalSize,
      logicalSize,
      scaleFactor,
      id: primaryDisplayId,
    } = getScreenSize(); // Logical = Physical / scaleX

    logger.info(
      '[screenshot] [primaryDisplay]',
      'logicalSize:',
      logicalSize,
      'scaleFactor:',
      scaleFactor,
    );

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: Math.round(logicalSize.width),
        height: Math.round(logicalSize.height),
      },
    });
    const primarySource =
      sources.find(
        (source) => source.display_id === primaryDisplayId.toString(),
      ) || sources[0];

    if (!primarySource) {
      logger.error('[screenshot] Primary display source not found', {
        primaryDisplayId,
        availableSources: sources.map((s) => s.display_id),
      });
      // fallback to default screenshot
      return await super.screenshot();
    }

    const screenshot = primarySource.thumbnail;

    const resized = screenshot.resize({
      width: physicalSize.width,
      height: physicalSize.height,
    });

    return {
      base64: resized.toJPEG(75).toString('base64'),
      scaleFactor,
    };
  }

  async execute(params: ExecuteParams): Promise<ExecuteOutput> {
    const { action_type, action_inputs } = params.parsedPrediction;
    const startTime = Date.now();
    let actionId: string | null = null;
    let screenshotBefore: string | undefined;

    try {
      // Take screenshot before action
      if (this.tracker.isActive()) {
        try {
          const screenshot = await this.screenshot();
          screenshotBefore = screenshot.base64;
        } catch (error) {
          logger.warn('Failed to capture screenshot before action', error);
        }
      }

      // Track action start
      actionId = await this.tracker.trackAction(
        action_type,
        action_inputs || {},
        undefined,
        this.currentUserIntent
      );

      let result: ExecuteOutput;
      
      if (action_type === 'type' && env.isWindows && action_inputs?.content) {
        const content = action_inputs.content?.trim();

        logger.info('[device] type', content);
        const stripContent = content.replace(/\\n$/, '').replace(/\n$/, '');
        const originalClipboard = clipboard.readText();
        clipboard.writeText(stripContent);
        await keyboard.pressKey(Key.LeftControl, Key.V);
        await sleep(50);
        await keyboard.releaseKey(Key.LeftControl, Key.V);
        await sleep(50);
        clipboard.writeText(originalClipboard);
        
        result = { success: true };
      } else {
        result = await super.execute(params);
      }

      // Track action success
      if (actionId) {
        let screenshotAfter: string | undefined;
        if (this.tracker.isActive()) {
          try {
            const screenshot = await this.screenshot();
            screenshotAfter = screenshot.base64;
          } catch (error) {
            logger.warn('Failed to capture screenshot after action', error);
          }
        }

        await this.tracker.trackActionResult(
          actionId,
          true,
          Date.now() - startTime,
          undefined,
          screenshotBefore,
          screenshotAfter
        );
      }

      return result;
    } catch (error) {
      // Track action failure
      if (actionId) {
        await this.tracker.trackActionResult(
          actionId,
          false,
          Date.now() - startTime,
          error instanceof Error ? error.message : String(error),
          screenshotBefore
        );
      }
      throw error;
    }
  }

  setUserIntent(intent: string): void {
    this.currentUserIntent = intent;
  }
}
