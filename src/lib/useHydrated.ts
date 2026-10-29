"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * 頁面在伺服器產生及瀏覽器接手（hydration）期間回傳 false，之後回傳 true。
 * 用來確保只存在於瀏覽器的狀態（語音、已選學習者）不會令 hydration 前後的畫面不一致。
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
