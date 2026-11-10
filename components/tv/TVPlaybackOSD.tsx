'use client';

import React from 'react';
import {
  SkipBack,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Subtitles,
} from 'lucide-react';
import { useTVNavigation } from './TVNavigationProvider';
import { TVFocusable } from './TVFocusable';
import { cn } from '@/lib/utils/cn';

export interface TVPlaybackOSDProps {
  currentSceneIndex: number;
  totalScenes: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onReplay: () => void;
  courseTitle?: string;
  sceneTitle?: string;
  subtitlesEnabled?: boolean;
  onToggleSubtitles?: () => void;
  className?: string;
}

export function TVPlaybackOSD({
  currentSceneIndex,
  totalScenes,
  isPlaying,
  onTogglePlay,
  onPrev,
  onNext,
  onReplay,
  courseTitle,
  sceneTitle,
  subtitlesEnabled = false,
  onToggleSubtitles,
  className,
}: TVPlaybackOSDProps) {
  const { focusedId, isOSDVisible } = useTVNavigation();

  // Visibility: when paused or isOSDVisible is true, HUD displays.
  // When playing and isOSDVisible is false, gracefully slides down / fades out.
  const isVisible = isOSDVisible || !isPlaying;

  const isPrevDisabled = currentSceneIndex <= 0;
  const isNextDisabled = totalScenes <= 0 || currentSceneIndex >= totalScenes - 1;

  const safeTotal = Math.max(1, totalScenes);
  const safeCurrent = Math.max(0, Math.min(currentSceneIndex, safeTotal - 1));
  const progressPercent = totalScenes > 0
    ? Math.round(((safeCurrent + 1) / safeTotal) * 100)
    : 0;

  const playPauseAutoFocus = !focusedId || focusedId === 'tv-osd-play-pause';

  return (
    <div
      data-testid="tv-playback-osd"
      data-visible={isVisible ? 'true' : 'false'}
      className={cn(
        'fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl z-50',
        'bg-black/85 backdrop-blur-md rounded-2xl border border-white/20 p-5 shadow-2xl',
        'transition-all duration-300 ease-in-out',
        isVisible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-12 pointer-events-none',
        className
      )}
    >
      {/* Title & Scene Header (24px-28px large typography) */}
      <div className="flex flex-col gap-1 mb-2">
        {courseTitle && (
          <h2 className="text-2xl md:text-[28px] font-bold text-white tracking-wide truncate">
            {courseTitle}
          </h2>
        )}
        {sceneTitle && (
          <p className="text-lg md:text-xl text-white/80 font-medium truncate">
            {sceneTitle}
          </p>
        )}
      </div>

      {/* Progress Bar */}
      <div className="flex items-center gap-4 my-2">
        <div className="flex-1 h-2.5 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-400 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-base md:text-lg font-semibold text-cyan-300 whitespace-nowrap">
          {totalScenes > 0 ? `${currentSceneIndex + 1} / ${totalScenes}` : '0 / 0'}
        </span>
      </div>

      {/* Control Buttons (wrapped with TVFocusable) */}
      <div className="flex items-center justify-between pt-2 border-t border-white/10 mt-3">
        <div className="flex items-center gap-3">
          {/* Previous Scene Button */}
          <TVFocusable
            id="tv-osd-prev"
            disabled={isPrevDisabled}
            aria-disabled={isPrevDisabled ? 'true' : 'false'}
            onSelect={onPrev}
            className={cn(
              'flex items-center justify-center p-3 rounded-xl transition-all',
              isPrevDisabled
                ? 'opacity-30 cursor-not-allowed text-white/40'
                : 'hover:bg-white/15 active:bg-white/25 text-white cursor-pointer'
            )}
            aria-label="Previous Scene"
            role="button"
          >
            <SkipBack className="w-7 h-7" />
          </TVFocusable>

          {/* Play / Pause Primary Button */}
          <TVFocusable
            id="tv-osd-play-pause"
            autoFocus={playPauseAutoFocus}
            onSelect={onTogglePlay}
            className="flex items-center justify-center p-3.5 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-black font-semibold rounded-2xl shadow-lg cursor-pointer transition-all"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            role="button"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 fill-current" />
            ) : (
              <Play className="w-8 h-8 fill-current ml-0.5" />
            )}
          </TVFocusable>

          {/* Next Scene Button */}
          <TVFocusable
            id="tv-osd-next"
            disabled={isNextDisabled}
            aria-disabled={isNextDisabled ? 'true' : 'false'}
            onSelect={onNext}
            className={cn(
              'flex items-center justify-center p-3 rounded-xl transition-all',
              isNextDisabled
                ? 'opacity-30 cursor-not-allowed text-white/40'
                : 'hover:bg-white/15 active:bg-white/25 text-white cursor-pointer'
            )}
            aria-label="Next Scene"
            role="button"
          >
            <SkipForward className="w-7 h-7" />
          </TVFocusable>
        </div>

        <div className="flex items-center gap-3">
          {/* Replay Button */}
          <TVFocusable
            id="tv-osd-replay"
            onSelect={onReplay}
            className="flex items-center justify-center p-3 rounded-xl hover:bg-white/15 active:bg-white/25 text-white cursor-pointer transition-all"
            aria-label="Replay Scene"
            role="button"
          >
            <RotateCcw className="w-7 h-7" />
          </TVFocusable>

          {/* Subtitles / Info Toggle Button */}
          <TVFocusable
            id="tv-osd-subtitles"
            onSelect={onToggleSubtitles}
            className={cn(
              'flex items-center justify-center p-3 rounded-xl hover:bg-white/15 active:bg-white/25 text-white cursor-pointer transition-all',
              subtitlesEnabled ? 'text-cyan-400 bg-white/20' : 'text-white'
            )}
            aria-label="Toggle Subtitles"
            role="button"
          >
            <Subtitles className="w-7 h-7" />
          </TVFocusable>
        </div>
      </div>
    </div>
  );
}

