# Browser Operator for UI-AE

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://github.com/bytedance/UI-AE-desktop/LICENSE)

A browser automation operator for UI-AE that enables controlling web browsers through natural language instructions.

## Features

- Control web browsers using [UI-AE](https://github.com/bytedance/UI-AE)(Vision-Lanuage Model)
- Support for common browser actions:
  - Clicking (single, double, right-click)
  - Typing text
  - Navigation
  - Scrolling
  - Keyboard shortcuts
- Visual feedback for actions in the browser
- Highlight clickable elements before taking screenshots
- Integration with [UI-AE SDK](https://github.com/bytedance/UI-AE-desktop/blob/main/docs/sdk.md)

## Installation

```bash
npm install @ui-ae/operator-browser
```

## Usage

Here's a basic example of how to use the Browser Operator:

```typescript
import { LocalBrowser } from '@aegnt-infra/browser';
import { ConsoleLogger } from '@aegnt-infra/logger';
import { GUIAgent, StatusEnum } from '@ui-ae/sdk';
import { BrowserOperator } from '@ui-ae/operator-browser';

async function main() {
  // Create a local browser
  const logger = new ConsoleLogger('[BrowserGUIAgent]');
  const browser = new LocalBrowser({ logger });
  await browser.launch();

  // Navigate to a page
  const page = await browser.createPage();
  await page.goto('https://www.example.com/');

  // Create a BrowserOperator instance
  const operator = new BrowserOperator({
    browser,
    logger,
    factors: [1000, 1000],
    onFinalAnswer: async (answer) => {
      console.log('Final answer:', answer);
    },
  });

  // Create a GUIAgent instance
  const aegnt = new GUIAgent({
    model: {
      baseURL: process.env.VLM_BASE_URL,
      apiKey: process.env.VLM_API_KEY,
      model: process.env.VLM_MODEL_NAME,
    },
    operator,
    onData: ({ data }) => {
      console.log(data);
    },
    onError: ({ error }) => {
      console.error(error);
    },
  });

  // Run the aegnt with an instruction
  await aegnt.run('Search for UI-AE on the website');

  // Clean up
  await browser.close();
}

main().catch(console.error);
```

## API Reference

### BrowserOperator

The main class that implements the UI-AE operator interface for browser control.

#### Constructor Options

```typescript
interface BrowserOperatorOptions {
  factors: [number, number]; // Scaling factors for screen coordinates
  browser: BrowserInterface; // Browser instance to control
  logger?: LoggerInterface; // Optional logger
  onOperatorAction?: (prediction: ParsedPrediction) => Promise<void>; // Action callback
  onScreenshot?: (screenshot: ScreenshotOutput, page: Page) => Promise<void>; // Screenshot callback
  onFinalAnswer?: (finalAnswer: string) => Promise<void>; // Final answer callback
}
```

## License

Apache-2.0 © 2025 Bytedance, Inc. and its affiliates.