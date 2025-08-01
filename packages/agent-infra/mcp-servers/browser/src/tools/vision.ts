import { z } from 'zod';
import { defineTool } from './defineTool.js';

const screenCaptureTool = defineTool({
  name: 'browser_vision_screen_capture',
  config: {
    description: 'Take a screenshot of the current page for vision mode',
    inputSchema: {},
  },
  handle: async (ctx, _) => {
    const { page } = ctx;
    const viewport = page.viewport();

    const screenshot = await page.screenshot({
      type: 'webp',
      optimizeForSpeed: true,
      fullPage: false,
      omitBackground: false,
      encoding: 'base64',
    });

    return {
      content: [
        {
          type: 'text',
          text: `Screenshot taken at ${viewport?.width}x${viewport?.height}`,
        },
        {
          type: 'image',
          data: screenshot,
          mimeType: 'image/webp',
        },
      ],
    };
  },
});

const screenClickTool = defineTool({
  name: 'browser_vision_screen_click',
  config: {
    description:
      'Click left mouse button on the page with vision and snapshot, before calling this tool, you should call `browser_vision_screen_capture` first only once, fallback to `browser_click` if failed',
    inputSchema: {
      factors: z
        .array(z.number())
        .optional()
        .describe(
          'Vision model coordinate system scaling factors [width_factor, height_factor] for coordinate space normalization. ' +
            'Transformation formula: ' +
            'x = (x_model * screen_width * width_factor) / width_factor ' +
            'y = (y_model * screen_height * height_factor) / height_factor ' +
            'where x_model, y_model are normalized model output coordinates (0-1), ' +
            'screen_width/height are screen dimensions, ' +
            'width_factor/height_factor are quantization factors, ' +
            'If the factors are unknown, leave it blank. Most models do not require this parameter.',
        ),
      x: z.number().describe('X coordinate'),
      y: z.number().describe('Y coordinate'),
    },
  },
  handle: async (ctx, args) => {
    const { page, logger, contextOptions } = ctx;
    try {
      let x = args.x;
      let y = args.y;

      const factors = contextOptions.factors || args.factors;
      logger.info('[vision] factors', factors);

      if (Array.isArray(factors) && factors.length > 0) {
        const actionParserModule = await import('@ui-ae/action-parser');
        const { actionParser } = actionParserModule.default;

        const viewport = page.viewport();

        const prediction = `Action: click(start_box='(${args.x},${args.y})')`;

        const { parsed } = actionParser({
          prediction,
          factor: factors as [number, number],
          screenContext: {
            width: viewport?.width ?? 0,
            height: viewport?.height ?? 0,
          },
        });

        const { start_coords } = parsed?.[0]?.action_inputs ?? {};
        logger.info('[vision] start_coords', start_coords);

        x = start_coords?.[0] ?? x;
        y = start_coords?.[1] ?? y;
      }

      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.up();

      return {
        content: [
          {
            type: 'text',
            text: `Vision click at ${args.x}, ${args.y}`,
          },
        ],
        isError: false,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error clicking on the page: ${(error as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  },
});

export default [screenCaptureTool, screenClickTool];
