/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Conversation } from '@ui-ae/shared/types';

export interface ConversationWithSoM extends Conversation {
  screenshotBase64WithElementMarker?: string;
}
