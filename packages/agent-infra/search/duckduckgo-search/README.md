# @aegnt-infra/duckduckgo-search

<p>
  <a href="https://npmjs.com/package/@aegnt-infra/duckduckgo-search?activeTab=readme"><img src="https://img.shields.io/npm/v/@aegnt-infra/duckduckgo-search?style=flat-square&colorA=564341&colorB=EDED91" alt="npm version" /></a>
  <a href="https://npmcharts.com/compare/@aegnt-infra/duckduckgo-search?minimal=true"><img src="https://img.shields.io/npm/dm/@aegnt-infra/duckduckgo-search.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="downloads" /></a>
  <a href="https://nodejs.org/en/about/previous-releases"><img src="https://img.shields.io/node/v/@aegnt-infra/duckduckgo-search.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="node version"></a>
  <a href="https://github.com/web-infra-dev/rsbuild/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="license" /></a>
</p>

A lightweight TypeScript client for DuckDuckGo Search, designed for AI applications.

## Features

- **Type-safe**: Full TypeScript support with comprehensive type definitions
- **Configurable**: Customizable search parameters and API settings
- **Minimal**: Zero external runtime dependencies
- **Developer-friendly**: Clean API with Promise-based interface

## Installation

```bash
npm install @aegnt-infra/duckduckgo-search
# or
yarn add @aegnt-infra/duckduckgo-search
# or
pnpm add @aegnt-infra/duckduckgo-search
```

## Usage

### Basic Search

```typescript
import { DuckDuckGoSearchClient } from '@aegnt-infra/duckduckgo-search';

const client = new DuckDuckGoSearchClient({});

const results = await client.search({
  query: 'climate change',
  count: 5,
});

console.log(results.results);
```

### With Custom Logger

```typescript
import { ConsoleLogger } from '@aegnt-infra/logger';
import { DuckDuckGoSearchClient } from '@aegnt-infra/duckduckgo-search';

const logger = new ConsoleLogger('[DuckDuckGoSearch]');
const client = new DuckDuckGoSearchClient({
  logger,
});

const results = await client.search({ query: 'machine learning' });
```

## API Reference

### DuckDuckGoSearchClient

```typescript
constructor(config?: Partial<DuckDuckGoSearchClientConfig>)
```

Configuration options:

```typescript
interface DuckDuckGoSearchClientConfig {
  logger?: Logger;
}
```

### Search Method

```typescript
async search(params: DuckDuckGoSearchOptions): Promise<DuckDuckGoSearchResponse>
```

Search options:

```typescript
interface DuckDuckGoSearchOptions {
  query: string; // Search query (required)
  count?: number; // Number of results to return
  /** The safe search type of the search. */
  safeSearch?: SafeSearchType;
  /** The time range of the searches, can be a SearchTimeType or a date range ("2021-03-16..2021-03-30") */
  time?: SearchTimeType | string;
  /** The locale(?) of the search. Defaults to "en-us". */
  locale?: string;
  /** The region of the search. Defaults to "wt-wt" or all regions. */
  region?: string;
  /** The market region(?) of the search. Defaults to "US". */
  marketRegion?: string;
  /** The number to offset the results to. */
  offset?: number;
  /**
   * The string that acts like a key to a search.
   * Set this if you made a search with the same query.
   */
  vqd?: string;
  [key: string]: any; // Additional parameters
}
```

### Response Types

```typescript
interface DuckDuckGoSearchResponse {
  /** Whether there were no results found. */
  noResults: boolean;
  /** The VQD of the search query. */
  vqd: string;
  /** The web results of the search. */
  results: SearchResult[];
  // Additional response fields
}
```

## Examples

See [examples](./examples/).


## License

Copyright (c) 2025 ByteDance, Inc. and its affiliates.

Licensed under the Apache License, Version 2.0.
