/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { initIpc, createServer } from '@ui-ae/electron-ipc/main';
import { screenRoute } from './screen';
import { windowRoute } from './window';
import { permissionRoute } from './permission';
import { aegntRoute } from './aegnt';
import { browserRoute } from './browser';
import { remoteResourceRouter } from './remoteResource';
import { settingRoute } from './setting';

const t = initIpc.create();

export const ipcRoutes = t.router({
  ...screenRoute,
  ...windowRoute,
  ...permissionRoute,
  ...aegntRoute,
  ...remoteResourceRouter,
  ...browserRoute,
  ...settingRoute,
});
export type Router = typeof ipcRoutes;

export const server = createServer(ipcRoutes);
