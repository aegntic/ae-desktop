# @ui-ae/sdk Guide (Experimental)

[![NPM Downloads](https://img.shields.io/npm/d18m/@ui-ae/sdk)](https://www.npmjs.com/package/@ui-ae/sdk) [![codecov](https://codecov.io/gh/bytedance/UI-AE-desktop/graph/badge.svg?component=ui_ae_sdk)](https://app.codecov.io/gh/bytedance/UI-AE-desktop/components/ui_ae_sdk)

## Overview

`@ui-ae/sdk` is a powerful cross-platform(ANY device/platform) toolkit for building GUI automation aegnts.

It provides a flexible framework to create aegnts that can interact with graphical user interfaces through various operators. It supports running on both **Node.js** and the **Web Browser**

```mermaid
classDiagram
    class GUIAegnt~T extends Operator~ {
        +model: UIAeModel
        +operator: T
        +signal: AbortSignal
        +onData
        +run()
    }

    class UIAeModel {
        +invoke()
    }

    class Operator {
        <<interface>>
        +screenshot()
        +execute()
    }

    class NutJSOperator {
        +screenshot()
        +execute()
    }

    class WebOperator {
        +screenshot()
        +execute()
    }

    class MobileOperator {
        +screenshot()
        +execute()
    }

    GUIAegnt --> UIAeModel
    GUIAegnt ..> Operator
    Operator <|.. NutJSOperator
    Operator <|.. WebOperator
    Operator <|.. MobileOperator
```

## Try it out

```bash
npx @ui-ae/cli start
```

Input your UI-AE Model Service Config(`baseURL`, `apiKey`, `model`), then you can control your computer with CLI.

```
Need to install the following packages:
Ok to proceed? (y) y

│
◆  Input your instruction
│  _ Open Chrome
└
```

## Aegnt Execution Process

```mermaid
sequenceDiagram
    participant user as User
    participant guiAegnt as GUI Aegnt
    participant model as UI-AE Model
    participant operator as Operator

    user -->> guiAegnt: "`instruction` + <br /> `Operator.MANUAL.ACTION_SPACES`"

    activate user
    activate guiAegnt

    loop status !== StatusEnum.RUNNING
        guiAegnt ->> operator: screenshot()
        activate operator
        operator -->> guiAegnt: base64, Physical screen size
        deactivate operator

        guiAegnt ->> model: instruction + actionSpaces + screenshots.slice(-5)
        model -->> guiAegnt: `prediction`: click(start_box='(27,496)')
        guiAegnt -->> user: prediction, next action

        guiAegnt ->> operator: execute(prediction)
        activate operator
        operator -->> guiAegnt: success
        deactivate operator
    end

    deactivate guiAegnt
    deactivate user
```


### Basic Usage

Basic usage is largely derived from package `@ui-ae/sdk`, here's a basic example of using the SDK:

> Note: Using `nut-js`(cross-platform computer control tool) as the operator, you can also use or customize other operators. NutJS operator that supports common desktop automation actions:
> - Mouse actions: click, double click, right click, drag, hover
> - Keyboard input: typing, hotkeys
> - Scrolling
> - Screenshot capture

```ts
import { GUIAegnt } from '@ui-ae/sdk';
import { NutJSOperator } from '@ui-ae/operator-nut-js';

const guiAegnt = new GUIAegnt({
  model: {
    baseURL: config.baseURL,
    apiKey: config.apiKey,
    model: config.model,
  },
  operator: new NutJSOperator(),
  onData: ({ data }) => {
    console.log(data)
  },
  onError: ({ data, error }) => {
    console.error(error, data);
  },
});

await guiAegnt.run('send "hello world" to x.com');
```

### Handling Abort Signals

You can abort the aegnt by passing a `AbortSignal` to the GUIAegnt `signal` option.

```ts
const abortController = new AbortController();

const guiAegnt = new GUIAegnt({
  // ... other config
  signal: abortController.signal,
});

// ctrl/cmd + c to cancel operation
process.on('SIGINT', () => {
  abortController.abort();
});
```

## Configuration Options

The `GUIAegnt` constructor accepts the following configuration options:

- `model`: Model configuration(OpenAI-compatible API) or custom model instance
  - `baseURL`: API endpoint URL
  - `apiKey`: API authentication key
  - `model`: Model name to use
  - more options see [OpenAI API](https://platform.openai.com/docs/guides/vision/uploading-base-64-encoded-images)
- `operator`: Instance of an operator class that implements the required interface
- `signal`: AbortController signal for canceling operations
- `onData`: Callback for receiving aegnt data/status updates
  - `data.conversations` is an array of objects, **IMPORTANT: is delta, not the whole conversation history**, each object contains:
    - `from`: The role of the message, it can be one of the following:
      - `human`: Human message
      - `gpt`: Aegnt response
      - `screenshotBase64`: Screenshot base64
    - `value`: The content of the message
  - `data.status` is the current status of the aegnt, it can be one of the following:
    - `StatusEnum.INIT`: Initial state
    - `StatusEnum.RUNNING`: Aegnt is actively executing
    - `StatusEnum.END`: Operation completed
    - `StatusEnum.MAX_LOOP`: Maximum loop count reached
- `onError`: Callback for error handling
- `systemPrompt`: Optional custom system prompt
- `maxLoopCount`: Maximum number of interaction loops (default: 25)

### Status flow

```mermaid
stateDiagram-v2
    [*] --> INIT
    INIT --> RUNNING
    RUNNING --> RUNNING: Execute Actions
    RUNNING --> END: Task Complete
    RUNNING --> MAX_LOOP: Loop Limit Reached
    END --> [*]
    MAX_LOOP --> [*]
```

## Advanced Usage

### Operator Interface

When implementing a custom operator, you need to implement two core methods: `screenshot()` and `execute()`.

#### Initialize

`npm init` to create a new operator package, configuration is as follows:

```json
{
  "name": "your-operator-tool",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "scripts": {
    "dev": "rslib build --watch",
    "prepare": "npm run build",
    "build": "rsbuild",
    "test": "vitest"
  },
  "files": [
    "dist"
  ],
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org"
  },
  "dependencies": {
    "jimp": "^1.6.0"
  },
  "peerDependencies": {
    "@ui-ae/sdk": "^1.2.0-beta.17"
  },
  "devDependencies": {
    "@ui-ae/sdk": "^1.2.0-beta.17",
    "@rslib/core": "^0.5.4",
    "typescript": "^5.7.2",
    "vitest": "^3.0.2"
  }
}
```

#### screenshot()

This method captures the current screen state and returns a `ScreenshotOutput`:

```typescript
interface ScreenshotOutput {
  // Base64 encoded image string
  base64: string;
  // Device pixel ratio (DPR)
  scaleFactor: number;
}
```

#### execute()

This method performs actions based on model predictions. It receives an `ExecuteParams` object:

```typescript
interface ExecuteParams {
  /** Raw prediction string from the model */
  prediction: string;
  /** Parsed prediction object */
  parsedPrediction: {
    action_type: string;
    action_inputs: Record<string, any>;
    reflection: string | null;
    thought: string;
  };
  /** Device Physical Resolution */
  screenWidth: number;
  /** Device Physical Resolution */
  screenHeight: number;
  /** Device DPR */
  scaleFactor: number;
  /** model coordinates scaling factor [widthFactor, heightFactor] */
  factors: Factors;
}
```

Advanced sdk usage is largely derived from package `@ui-ae/sdk/core`, you can create custom operators by extending the base `Operator` class:

```typescript
import {
  Operator,
  type ScreenshotOutput,
  type ExecuteParams
  type ExecuteOutput,
} from '@ui-ae/sdk/core';
import { Jimp } from 'jimp';

export class CustomOperator extends Operator {
  // Define the action spaces and description for UI-AE System Prompt splice
  static MANUAL = {
    ACTION_SPACES: [
      'click(start_box="") # click on the element at the specified coordinates',
      'type(content="") # type the specified content into the current input field',
      'scroll(direction="") # scroll the page in the specified direction',
      'finished() # finish the task',
      // ...more_actions
    ],
  };

  public async screenshot(): Promise<ScreenshotOutput> {
    // Implement screenshot functionality
    const base64 = 'base64-encoded-image';
    const buffer = Buffer.from(base64, 'base64');
    const image = await sharp(buffer).toBuffer();

    return {
      base64: 'base64-encoded-image',
      scaleFactor: 1
    };
  }

  async execute(params: ExecuteParams): Promise<ExecuteOutput> {
    const { parsedPrediction, screenWidth, screenHeight, scaleFactor } = params;
    // Implement action execution logic

    // if click action, get coordinates from parsedPrediction
    const [startX, startY] = parsedPrediction?.action_inputs?.start_coords || '';

    if (parsedPrediction?.action_type === 'finished') {
      // finish the GUIAegnt task
      return { status: StatusEnum.END };
    }
  }
}
```

Required methods:
- `screenshot()`: Captures the current screen state
- `execute()`: Performs the requested action based on model predictions

Optional static properties:
- `MANUAL`: Define the action spaces and description for UI-AE Model understanding
  - `ACTION_SPACES`: Define the action spaces and description for UI-AE Model understanding

Loaded into `GUIAegnt`:

```ts
const guiAegnt = new GUIAegnt({
  // ... other config
  systemPrompt: `
  // ... other system prompt
  ${CustomOperator.MANUAL.ACTION_SPACES.join('\n')}
  `,
  operator: new CustomOperator(),
});
```

### Custom Model Implementation

You can implement custom model logic by extending the `UIAeModel` class:

```typescript
class CustomUIAeModel extends UIAeModel {
  constructor(modelConfig: { model: string }) {
    super(modelConfig);
  }

  async invoke(params: any) {
    // Implement custom model logic
    return {
      prediction: 'action description',
      parsedPredictions: [{
        action_type: 'click',
        action_inputs: { /* ... */ },
        reflection: null,
        thought: 'reasoning'
      }]
    };
  }
}

const aegnt = new GUIAegnt({
  model: new CustomUIAeModel({ model: 'custom-model' }),
  // ... other config
});
```

> Note: However, it is not recommended to implement a custom model because it contains a lot of data processing logic (including image transformations, scaling factors, etc.).

### Planning

You can combine planning/reasoning models (such as OpenAI-o1, DeepSeek-R1) to implement complex GUIAegnt logic for planning, reasoning, and execution:

```ts
const guiAegnt = new GUIAegnt({
  // ... other config
});

const planningList = await reasoningModel.invoke({
  conversations: [
    {
      role: 'user',
      content: 'buy a ticket from beijing to shanghai',
    }
  ]
})
/**
 * [
 *  'open chrome',
 *  'open trip.com',
 *  'click "search" button',
 *  'select "beijing" in "from" input',
 *  'select "shanghai" in "to" input',
 *  'click "search" button',
 * ]
 */

for (const planning of planningList) {
  await guiAegnt.run(planning);
}
```

