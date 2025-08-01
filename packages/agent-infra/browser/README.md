# @aegnt-infra/browser

A tiny Browser Control library based on [puppeteer](https://github.com/puppeteer/puppeteer), built for **Aegnt Ae**.

<p>
  <a href="https://npmjs.com/package/@aegnt-infra/browser?activeTab=readme"><img src="https://img.shields.io/npm/v/@aegnt-infra/browser?style=flat-square&colorA=564341&colorB=EDED91" alt="npm version" /></a>
  <a href="https://npmcharts.com/compare/@aegnt-infra/browser?minimal=true"><img src="https://img.shields.io/npm/dm/@aegnt-infra/browser.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="downloads" /></a>
  <a href="https://nodejs.org/en/about/previous-releases"><img src="https://img.shields.io/node/v/@aegnt-infra/browser.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="node version"></a>
  <a href="https://github.com/bytedance/UI-AE-desktop/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="license" /></a>
</p>

## Features

- 🔍 **Browser Detection** - Auto-detects installed browsers across platforms
- 🔄 **Remote Browser Support** - Connect to remote browser instances
- 🛡️ **Type Safety** - Written in TypeScript with full type definitions

## Architecture

```mermaid
graph TD
    A[Browser Interface] --> B[Local Browser]
    A --> C[Remote Browser]
    B --> D[Browser Finder]
    B --> E[Browser Adapter]
    C --> E
    E --> F[Puppeteer Adapter]
    F --> G[Browser Control]
```

## Installation

```bash
npm install @aegnt-infra/browser
# or
yarn add @aegnt-infra/browser
# or
pnpm add @aegnt-infra/browser
```

## Quick Start

```typescript
import { LocalBrowser } from '@aegnt-infra/browser';

async function main() {
  // Initialize browser
  const browser = new LocalBrowser();

  try {
    // Launch browser
    await browser.launch({ headless: false });

    // Create new page
    const page = await browser.createPage();

    // Navigate to URL
    await page.goto('https://example.com');

    // Take screenshot
    await page.screenshot({ path: 'example.png' });
  } finally {
    // Always close browser
    await browser.close();
  }
}
```

## Credits

Thanks to:

- [EGOIST](https://github.com/egoist) for creating a great AI chatbot product [ChatWise](https://chatwise.app/) from which we draw a lot of inspiration for browser detection functionality.
- The [puppeteer](https://github.com/puppeteer/puppeteer) project which helps us operate the browser better.
