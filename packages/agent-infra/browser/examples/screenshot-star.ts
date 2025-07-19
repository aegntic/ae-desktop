/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { LocalBrowser } from '../src';

function sleep(time: number) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

async function main() {
  const browser = new LocalBrowser();
  await browser.launch({ headless: false });
  const page = await browser.createPage();
  await page.goto(
    'https://star-history.com/#bytedance/UI-AE-desktop&bytedance/UI-AE&Date',
    { waitUntil: 'networkidle2' },
  );
  await page.waitForSelector('#capture');
  await sleep(2000);
  await page.screenshot({ path: './UI-AE-desktop-star-history.png' });
  await page.close();
  await browser.close();
}

main();
