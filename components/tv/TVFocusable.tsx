'use client';

import React, { useEffect, useRef } from 'react';
import { useTVNavigation } from './TVNavigationProvider';
import type { SpatialRect } from '@/lib/tv/spatial-navigation';
import { cn } from '@/lib/utils/cn';

export interface TVFocusableProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  onSelect?: () => void;
  autoFocus?: boolean;
  className?: string;
  disabled?: boolean;
  rect?: SpatialRect;
  children?: React.ReactNode;
}

export const TV_FOCUS_CLASSES =
  'ring-4 ring-cyan-400 dark:ring-cyan-300 scale-105 shadow-2xl transition-all duration-200';

export function TVFocusable({
  id,
  onSelect,
  autoFocus = false,
  className,
  disabled = false,
  rect: manualRect,
  children,
  onClick,
  ...rest
}: TVFocusableProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const { isTVMode, focusedId, setFocus, registerItem } = useTVNavigation();

  const isFocused = isTVMode && focusedId === id;

  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const getMeasuredRect = (): SpatialRect => {
    if (manualRect) return manualRect;
    if (
      elementRef.current &&
      typeof elementRef.current.getBoundingClientRect === 'function'
    ) {
      const r = elementRef.current.getBoundingClientRect();
      return {
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
      };
    }
    return { left: 0, top: 0, width: 0, height: 0 };
  };

  // Mount/Unmount lifecycle for spatial registry
  useEffect(() => {
    if (!isTVMode) return;

    const unregister = registerItem(
      {
        id,
        rect: getMeasuredRect(),
        disabled,
      },
      () => onSelectRef.current?.()
    );

    if (autoFocus) {
      setFocus(id);
    }

    return () => {
      unregister();
    };
  }, [id, isTVMode, autoFocus, setFocus, registerItem]);

  // Update item details when disabled or rect changes
  useEffect(() => {
    if (!isTVMode) return;

    registerItem(
      {
        id,
        rect: getMeasuredRect(),
        disabled,
      },
      () => onSelectRef.current?.()
    );
  }, [
    id,
    isTVMode,
    disabled,
    manualRect?.left,
    manualRect?.top,
    manualRect?.width,
    manualRect?.height,
    registerItem,
  ]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (isTVMode) {
      setFocus(id);
    }
    onSelect?.();
    onClick?.(e);
  };

  return (
    <div
      ref={elementRef}
      id={id}
      data-tv-focusable-id={id}
      data-focused={isFocused ? 'true' : 'false'}
      tabIndex={isTVMode ? (isFocused ? 0 : -1) : undefined}
      className={cn(className, isFocused && TV_FOCUS_CLASSES)}
      onClick={handleClick}
      {...rest}
    >
      {children}
    </div>
  );
}
