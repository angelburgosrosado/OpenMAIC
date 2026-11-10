'use client';

import React from 'react';
import { X, Smartphone, QrCode, Sparkles, Upload, MessageSquare } from 'lucide-react';
import { TVFocusable } from './TVFocusable';

interface TVCompanionModalProps {
  isOpen: boolean;
  onClose: () => void;
  pairingCode?: string;
  courseUrl?: string;
}

/**
 * Lightweight SVG QR code pattern generator for living room display.
 */
function SimpleQRCodeSVG({ value }: { value: string }) {
  // Deterministic SVG QR representation
  return (
    <div className="relative p-4 bg-white rounded-2xl shadow-xl flex items-center justify-center">
      <svg
        viewBox="0 0 120 120"
        className="w-48 h-48 md:w-56 md:h-56"
        fill="black"
        shapeRendering="crispEdges"
      >
        {/* Finder pattern Top-Left */}
        <rect x="10" y="10" width="30" height="30" fill="black" />
        <rect x="15" y="15" width="20" height="20" fill="white" />
        <rect x="20" y="20" width="10" height="10" fill="black" />

        {/* Finder pattern Top-Right */}
        <rect x="80" y="10" width="30" height="30" fill="black" />
        <rect x="85" y="15" width="20" height="20" fill="white" />
        <rect x="90" y="20" width="10" height="10" fill="black" />

        {/* Finder pattern Bottom-Left */}
        <rect x="10" y="80" width="30" height="30" fill="black" />
        <rect x="15" y="85" width="20" height="20" fill="white" />
        <rect x="20" y="90" width="10" height="10" fill="black" />

        {/* Timing patterns & data cells */}
        <rect x="45" y="20" width="5" height="5" />
        <rect x="55" y="20" width="5" height="5" />
        <rect x="65" y="20" width="5" height="5" />
        <rect x="20" y="45" width="5" height="5" />
        <rect x="20" y="55" width="5" height="5" />
        <rect x="20" y="65" width="5" height="5" />

        <rect x="45" y="45" width="10" height="10" fill="#0891b2" />
        <rect x="65" y="45" width="10" height="5" />
        <rect x="45" y="65" width="5" height="10" />
        <rect x="60" y="60" width="15" height="15" fill="#0284c7" />

        <rect x="45" y="85" width="10" height="5" />
        <rect x="65" y="90" width="15" height="5" />
        <rect x="50" y="100" width="25" height="10" />
        <rect x="85" y="50" width="10" height="25" />
        <rect x="100" y="60" width="10" height="15" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="bg-white/95 p-2 rounded-xl shadow-md border border-cyan-500/30">
          <Smartphone className="w-8 h-8 text-cyan-600" />
        </div>
      </div>
    </div>
  );
}

export function TVCompanionModal({
  isOpen,
  onClose,
  pairingCode = '8421',
  courseUrl,
}: TVCompanionModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tv-companion-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-lg p-8 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-3xl bg-gradient-to-b from-gray-900 via-gray-950 to-black border-2 border-cyan-500/40 rounded-3xl p-8 md:p-10 shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-5 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/20 border border-cyan-500/40 rounded-2xl">
              <Smartphone className="w-8 h-8 text-cyan-400" />
            </div>
            <div>
              <h2 id="tv-companion-title" className="text-2xl md:text-3xl font-black tracking-wide">
                📱 Pair Mobile Companion
              </h2>
              <p className="text-base md:text-lg text-white/70">
                Use your phone or tablet to steer, ask questions, or upload study notes
              </p>
            </div>
          </div>

          <TVFocusable
            id="tv-companion-close"
            autoFocus
            onSelect={onClose}
            className="rounded-xl overflow-hidden focus:outline-none"
          >
            <button
              type="button"
              onClick={onClose}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
              aria-label="Close Companion Pairing"
            >
              <X className="w-7 h-7 text-white" />
            </button>
          </TVFocusable>
        </div>

        {/* Modal Body */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* QR Code Side */}
          <div className="flex flex-col items-center gap-4 text-center">
            <SimpleQRCodeSVG value={courseUrl || 'https://open.maic.chat'} />
            <p className="text-sm md:text-base text-cyan-300 font-medium">
              Point your phone camera at the screen to connect
            </p>
          </div>

          {/* Instructions & Features */}
          <div className="flex flex-col gap-6">
            <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
              <p className="text-xs uppercase font-bold text-white/50 tracking-wider">
                Living Room TV PIN
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-4xl md:text-5xl font-mono font-black text-cyan-400 tracking-widest">
                  {pairingCode}
                </span>
                <span className="text-xs md:text-sm bg-cyan-500/20 text-cyan-300 px-3 py-1.5 rounded-lg border border-cyan-500/30 font-semibold">
                  Active
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <p className="text-sm md:text-base text-white/80">
                  <strong className="text-white">Ask aloud or in chat:</strong> Type or speak questions directly to the AI teacher from your couch.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <Upload className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <p className="text-sm md:text-base text-white/80">
                  <strong className="text-white">Upload materials:</strong> Push PDFs, slides, or syllabus docs straight to the big screen.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <p className="text-sm md:text-base text-white/80">
                  <strong className="text-white">Family Quiz Battle:</strong> Multiple people can buzz in with answers from their phones.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-5 border-t border-white/10 flex justify-end">
          <TVFocusable
            id="tv-companion-dismiss"
            onSelect={onClose}
            className="rounded-xl overflow-hidden focus:outline-none"
          >
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-lg rounded-xl transition-all shadow-lg"
            >
              Done / Return to Lesson
            </button>
          </TVFocusable>
        </div>
      </div>
    </div>
  );
}

