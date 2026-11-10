'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { isTVEnvironment } from '@/lib/tv/tv-detection';
import {
  findNextSpatialCandidate,
  type SpatialItem,
} from '@/lib/tv/spatial-navigation';

export interface TVNavigationContextValue {
  isTVMode: boolean;
  focusedId: string | null;
  setFocus: (id: string) => void;
  registerItem: (item: SpatialItem, onSelect?: () => void) => () => void;
  isOSDVisible: boolean;
  wakeOSD: () => void;
}

const defaultContext: TVNavigationContextValue = {
  isTVMode: false,
  focusedId: null,
  setFocus: () => {},
  registerItem: () => () => {},
  isOSDVisible: true,
  wakeOSD: () => {},
};

export const TVNavigationContext =
  createContext<TVNavigationContextValue>(defaultContext);

export interface TVNavigationProviderProps {
  forceTVMode?: boolean;
  defaultFocusId?: string;
  osdTimeoutMs?: number;
  debounceMs?: number;
  children: React.ReactNode;
}

export function TVNavigationProvider({
  forceTVMode,
  defaultFocusId,
  osdTimeoutMs = 5000,
  debounceMs = 80,
  children,
}: TVNavigationProviderProps) {
  const isTVMode =
    forceTVMode !== undefined ? forceTVMode : isTVEnvironment();

  const [focusedId, setFocusedId] = useState<string | null>(
    defaultFocusId ?? null
  );
  const focusedIdRef = useRef<string | null>(focusedId);
  focusedIdRef.current = focusedId;

  const [isOSDVisible, setIsOSDVisible] = useState<boolean>(true);
  const osdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const itemsRef = useRef<
    Map<string, { item: SpatialItem; onSelect?: () => void }>
  >(new Map());

  const lastKeyTimeRef = useRef<number>(0);

  const wakeOSD = useCallback(() => {
    setIsOSDVisible(true);
    if (osdTimerRef.current) {
      clearTimeout(osdTimerRef.current);
    }
    osdTimerRef.current = setTimeout(() => {
      setIsOSDVisible(false);
    }, osdTimeoutMs);
  }, [osdTimeoutMs]);

  // Initial OSD timer startup
  useEffect(() => {
    if (!isTVMode) {
      if (osdTimerRef.current) {
        clearTimeout(osdTimerRef.current);
      }
      return;
    }
    wakeOSD();
    return () => {
      if (osdTimerRef.current) {
        clearTimeout(osdTimerRef.current);
      }
    };
  }, [isTVMode, wakeOSD]);

  const setFocus = useCallback((id: string) => {
    setFocusedId(id);
    focusedIdRef.current = id;
  }, []);

  const registerItem = useCallback(
    (item: SpatialItem, onSelect?: () => void) => {
      itemsRef.current.set(item.id, { item, onSelect });

      return () => {
        itemsRef.current.delete(item.id);
        // Fallback / Recovery: If focused element unregisters, automatically sets focus to the first available registered item
        if (focusedIdRef.current === item.id) {
          const remaining = Array.from(itemsRef.current.values()).filter(
            (entry) => !entry.item.disabled
          );
          const nextId = remaining.length > 0 ? remaining[0].item.id : null;
          setFocusedId(nextId);
          focusedIdRef.current = nextId;
        }
      };
    },
    []
  );

  useEffect(() => {
    if (!isTVMode) return;
    if (typeof window === 'undefined') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Any remote key wakes up OSD
      wakeOSD();

      const key = event.key;
      const code = event.code;

      const isDirectional =
        key === 'ArrowUp' ||
        key === 'ArrowDown' ||
        key === 'ArrowLeft' ||
        key === 'ArrowRight';

      const isSelect =
        key === 'Enter' ||
        key === ' ' ||
        key === 'Spacebar' ||
        code === 'Space';

      if (!isDirectional && !isSelect) {
        return;
      }

      const now = Date.now();
      if (now - lastKeyTimeRef.current < debounceMs) {
        event.preventDefault();
        return;
      }
      lastKeyTimeRef.current = now;

      if (isDirectional) {
        event.preventDefault();
        const items = Array.from(itemsRef.current.values()).map((entry) => {
          const item = { ...entry.item };
          if (typeof document !== 'undefined') {
            const el = document.querySelector(
              `[data-tv-focusable-id="${item.id}"]`
            );
            if (el && typeof el.getBoundingClientRect === 'function') {
              const domRect = el.getBoundingClientRect();
              if (domRect.width > 0 || domRect.height > 0) {
                item.rect = {
                  left: domRect.left,
                  top: domRect.top,
                  width: domRect.width,
                  height: domRect.height,
                };
              }
            }
          }
          return item;
        });

        if (items.length === 0) return;

        let dir: 'up' | 'down' | 'left' | 'right' = 'right';
        if (key === 'ArrowUp') dir = 'up';
        else if (key === 'ArrowDown') dir = 'down';
        else if (key === 'ArrowLeft') dir = 'left';
        else if (key === 'ArrowRight') dir = 'right';

        const currentId = focusedIdRef.current;
        if (!currentId) {
          const first = items.find((i) => !i.disabled);
          if (first) {
            setFocus(first.id);
          }
          return;
        }

        const nextCandidate = findNextSpatialCandidate(currentId, dir, items);
        if (nextCandidate) {
          setFocus(nextCandidate);
        }
      } else if (isSelect) {
        event.preventDefault();
        const currentId = focusedIdRef.current;
        if (currentId) {
          const entry = itemsRef.current.get(currentId);
          if (entry && !entry.item.disabled && entry.onSelect) {
            entry.onSelect();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isTVMode, debounceMs, wakeOSD, setFocus]);

  const value: TVNavigationContextValue = {
    isTVMode,
    focusedId,
    setFocus,
    registerItem,
    isOSDVisible,
    wakeOSD,
  };

  return (
    <TVNavigationContext.Provider value={value}>
      {children}
    </TVNavigationContext.Provider>
  );
}

export function useTVNavigation(): TVNavigationContextValue {
  return useContext(TVNavigationContext);
}
