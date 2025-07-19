/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { initIpc } from '@ui-ae/electron-ipc/main';
import { checkBrowserAvailability } from '../services/browserCheck';

const t = initIpc.create();

export const browserRoute = t.router({
  checkBrowserAvailability: t.procedure.input<void>().handle(async () => {
    return await checkBrowserAvailability();
  }),
});
