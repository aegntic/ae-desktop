# Quick Start

We're excited to announce the support for UI-AE-1.5! 🎉🎉🎉

The previous version of UI-AE Desktop version 0.0.8 will be upgraded to a new Desktop App 0.1.0 with support for both Computer and Browser operator.

<br />

## Prerequisites

Please install **Chrome** ([stable](https://www.google.com/chrome/)/[beta](https://www.google.com/chrome/beta/)/[dev](https://www.google.com/chrome/dev/)/[canary](https://www.google.com/chrome/canary/)), **Edge** ([stable](https://www.microsoft.com/en-us/edge/download)/[beta/dev/canary](https://www.microsoft.com/en-us/edge/download/insider)), or **Firefox** ([stable](https://www.mozilla.org/en-US/firefox/new/)/[beta/dev/nightly](https://www.mozilla.org/zh-CN/firefox/channel/desktop/)) for **Browser Operator**.

UI-AE-desktop is currently only available for single monitor setup. Multi-monitor configuration may cause failure for some tasks.

<br />

## Download

You can download the [latest release](https://github.com/bytedance/UI-AE-desktop/releases/latest) version of UI-AE Desktop from our releases page.

> **Note**: If you have [Homebrew](https://brew.sh/) installed, you can install UI-AE Desktop by running the following command:
> ```bash
> brew install --cask ui-ae
> ```

<br />

## Install

### MacOS

1. Drag **UI AE** application into the **Applications** folder
  <img src="../apps/ui-ae/images/mac_install.png" width="500px" />

2. Enable the permission of **UI AE** in MacOS:
  - System Settings -> Privacy & Security -> **Accessibility**
  - System Settings -> Privacy & Security -> **Screen Recording**
  <img src="../apps/ui-ae/images/mac_permission.png" width="500px" />

3. Then open **UI AE** application, you can see the following interface:
  <img src="../apps/ui-ae/images/mac_app.png" width="500px" />


### Windows

**Still to run** the application, you can see the following interface:

<img src="../apps/ui-ae/images/windows_install.png" width="400px" style="margin-left: 4em;" />

<br />

## Get model and run

### UI-AE-1.5 on [Hugging Face](https://endpoints.huggingface.co/catalog)

1. Click the button `Deploy from Hugging Face` on the top right corner of the page
  <img src="../apps/ui-ae/images/quick_start/huggingface_deploy.png" width="500px" />

2. Select the model UI-AE-1.5-7B
  <img src="../apps/ui-ae/images/quick_start/huggingface_uiae_1.5.png" width="500px" />

3. Refer to [README_deploy.md](https://github.com/bytedance/UI-AE/blob/main/README_deploy.md) for detailed deployment instructions to obtain the **Base URL**, **API Key**, and **Model Name**.

4. Open the UI-AE Desktop App [Settings]((./setting.md)) and configure:

```yaml
Language: en
VLM Provider: Hugging Face for UI-AE-1.5
VLM Base URL: https:xxx
VLM API KEY: hf_xxx
VLM Model Name: xxx
```

> [!NOTE]
> 1. For VLM Provider, make sure to select "**Hugging Face for UI-AE-1.5**" to ensure proper VLM Action parsing.
> 2. For VLM Base URL & VLM Model Name, you can checkout your huggingface endpoint page to see detail information. Please make sure Base URL ends with '/v1/'
>
> <img src="../apps/ui-ae/images/quick_start/base_url.png" width="500px" />

<img src="../apps/ui-ae/images/quick_start/huggingface_setting.png" width="500px" />

5. Click button starting a new chat

  <img src="../apps/ui-ae/images/quick_start/start_button.png" width="500px" />

6. Input the command to start a round of GUI operation tasks!

  <img src="../apps/ui-ae/images/quick_start/start_task.png" width="500px" />



<br />



### Doubao-1.5-UI-AE on [VolcEngine](https://console.volcengine.com/ark/region:ark+cn-beijing/model/detail?Id=doubao-1-5-ui-ae)


1. Visit the [VolcEngine Doubao-1.5-UI-AE page](https://console.volcengine.com/ark/region:ark+cn-beijing/model/detail?Id=doubao-1-5-ui-ae)


2. Click the button `Try (立即体验)` on the top right corner of the page
  <img src="../apps/ui-ae/images/quick_start/volcengine_try.png" width="500px" />

3. Click the `API inference (API 接入)` link
  <img src="../apps/ui-ae/images/quick_start/volcengine_api.png" width="500px" />

4. Get your **API Key** from STEP 1 in the drawer panel.
  <img src="../apps/ui-ae/images/quick_start/volcengine_api_key.png" width="500px" />

5. In STEP 2, authenticate your user info and switch to the OpenAI SDK tab to obtain **Base Url** and **Model name**：
  <img src="../apps/ui-ae/images/quick_start/volcengine_api_info.png" width="500px" />

6. Open the UI-AE Desktop App [Settings]((./setting.md)) and configure:

```yaml
Language: cn
VLM Provider: VolcEngine Ark for Doubao-1.5-UI-AE
VLM Base URL: https://ark.cn-beijing.volces.com/api/v3
VLM API KEY: ARK_API_KEY
VLM Model Name: doubao-1.5-ui-ae-250328
```

> [!NOTE]
> For VLM Provider, make sure to select "**VolcEngine Ark for Doubao-1.5-UI-AE**" to ensure proper VLM Action parsing.

  <img src="../apps/ui-ae/images/quick_start/volcengine_settings.png" width="500px" />


7. Select the desired usage scenario before starting a new chat

  <img src="../apps/ui-ae/images/quick_start/start_button.png" width="500px" />

> [!NOTE]
> Before using `Browser Operator` mode, please ensure that Chrome, Edge, or Firefox is installed on your device.

8. Input the command to start a round of GUI operation tasks!

  <img src="../apps/ui-ae/images/quick_start/start_task.png" width="500px" />

<br>


## Try out our free remote operators

1. Open the app and agree to our User Agreement

<img src="../apps/ui-ae/images/quick_start/user_agreement.png" width="500px" />

> [!NOTE]
> We promise all records on the servers will be exclusively used for academic research purposes and will not be utilized for any other activities.

2. Use for free for 30 minutes

<img src="../apps/ui-ae/images/quick_start/free_for_30min.png" width="500px" />

3. Easily take control of a remote device

<img src="../apps/ui-ae/images/quick_start/take_control.png" width="500px" />

4. How to exit/close

<img src="../apps/ui-ae/images/quick_start/terminate.png" width="500px" />

## More

At this point, you should have successfully launched the UI-AE-Desktop App! To get the most out of UI-AE and ensure stable usage, we recommend reviewing the following documentation:

- Read the [Settings Configuration Guide](./setting.md) and set up VLM/Chat parameters. Selecting the appropriate VLM Provider can optimize desktop app performance when using model.
- Read the [UI-AE-1.5 Deployment Guide](https://github.com/bytedance/UI-AE/blob/main/README_deploy.md) for more detail about the UI-AE-1.5's latest deployment methods.
- Read the [UI-AE 模型部署教程](https://bytedance.sg.larkoffice.com/docx/TCcudYwyIox5vyxiSDLlgIsTgWf) for more detail about the Doubao-1.5-UI-AE's latest deployment methods.