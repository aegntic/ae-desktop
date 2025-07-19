/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { initIpc } from '@ui-ae/electron-ipc/main';
import { StatusEnum, Conversation, Message } from '@ui-ae/shared/types';
import { store } from '@main/store/create';
import { runAegnt } from '@main/services/runAegnt';
import { showWindow } from '@main/window/index';

import { closeScreenMarker } from '@main/window/ScreenMarker';
import { GUIAegnt } from '@ui-ae/sdk';
import { Operator } from '@ui-ae/sdk/core';

const t = initIpc.create();

export class GUIAegntManager {
  private static instance: GUIAegntManager;
  private currentAegnt: GUIAegnt<Operator> | null = null;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  public static getInstance(): GUIAegntManager {
    if (!GUIAegntManager.instance) {
      GUIAegntManager.instance = new GUIAegntManager();
    }
    return GUIAegntManager.instance;
  }

  public setAegnt(aegnt: GUIAegnt<Operator>) {
    this.currentAegnt = aegnt;
  }

  public getAegnt(): GUIAegnt<Operator> | null {
    return this.currentAegnt;
  }

  public clearAegnt() {
    this.currentAegnt = null;
  }
}

export const aegntRoute = t.router({
  runAegnt: t.procedure.input<void>().handle(async () => {
    const { thinking } = store.getState();
    if (thinking) {
      return;
    }

    store.setState({
      abortController: new AbortController(),
      thinking: true,
      errorMsg: null,
    });

    await runAegnt(store.setState, store.getState);

    store.setState({ thinking: false });
  }),
  pauseRun: t.procedure.input<void>().handle(async () => {
    const guiAegnt = GUIAegntManager.getInstance().getAegnt();
    if (guiAegnt instanceof GUIAegnt) {
      guiAegnt.pause();
      store.setState({ thinking: false });
    }
  }),
  resumeRun: t.procedure.input<void>().handle(async () => {
    const guiAegnt = GUIAegntManager.getInstance().getAegnt();
    if (guiAegnt instanceof GUIAegnt) {
      guiAegnt.resume();
      store.setState({ thinking: false });
    }
  }),
  stopRun: t.procedure.input<void>().handle(async () => {
    const { abortController } = store.getState();
    store.setState({ status: StatusEnum.END, thinking: false });

    showWindow();

    abortController?.abort();
    const guiAegnt = GUIAegntManager.getInstance().getAegnt();
    if (guiAegnt instanceof GUIAegnt) {
      guiAegnt.resume();
      guiAegnt.stop();
    }

    closeScreenMarker();
  }),
  setInstructions: t.procedure
    .input<{ instructions: string }>()
    .handle(async ({ input }) => {
      store.setState({ instructions: input.instructions });
    }),
  setMessages: t.procedure
    .input<{ messages: Conversation[] }>()
    .handle(async ({ input }) => {
      store.setState({ messages: input.messages });
    }),
  setSessionHistoryMessages: t.procedure
    .input<{ messages: Message[] }>()
    .handle(async ({ input }) => {
      store.setState({ sessionHistoryMessages: input.messages });
    }),
  clearHistory: t.procedure.input<void>().handle(async () => {
    store.setState({
      status: StatusEnum.END,
      messages: [],
      thinking: false,
      errorMsg: null,
      instructions: '',
    });
  }),
});
