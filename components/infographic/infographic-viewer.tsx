'use client';

import React, { useState } from 'react';
import {
  Download,
  Copy,
  Check,
  Sparkles,
  Maximize2,
  Wand2,
  PlusCircle,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  FileCode,
} from 'lucide-react';
import { toast } from 'sonner';
import type { GeneratedInfographic } from '@/lib/types/infographic';

interface InfographicViewerProps {
  image: GeneratedInfographic;
  previousImage?: GeneratedInfographic;
  onEdit: (editPrompt: string) => Promise<void>;
  isEditing: boolean;
  onInsertIntoSlide?: (imageDataUrl: string, prompt: string) => void;
}

const QUICK_EDIT_PRESETS = [
  '🏷️ Add bold component labels & annotations',
  '📐 Transform into a cyan Technical Blueprint',
  '🧊 Convert to modern 3D Isometric cutaway',
  '🎨 Re-render as Vintage Lithograph print',
  '👶 Simplify layout for elementary learners',
  '✨ Enhance lighting, contrast & readability',
];

export function InfographicViewer({
  image,
  previousImage,
  onEdit,
  isEditing,
  onInsertIntoSlide,
}: InfographicViewerProps) {
  const [editPrompt, setEditPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [showCompare, setShowCompare] = useState(false);

  const handleDownload = () => {
    try {
      const link = document.createElement('a');
      link.href = image.data;
      link.download = `infographic-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Infographic downloaded successfully');
    } catch {
      toast.error('Failed to download image');
    }
  };

  const handleCopy = async () => {
    try {
      if (image.data.startsWith('data:image/')) {
        const res = await fetch(image.data);
        const blob = await res.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob }),
        ]);
      } else {
        await navigator.clipboard.writeText(image.data);
      }
      setCopied(true);
      toast.success('Image copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleCopyMarkdown = async () => {
    try {
      const citations = image.searchResults?.map((s) => `[${s.title}](${s.url})`).join(', ') || '';
      const md = `### ${image.prompt}\n\n![${image.prompt}](${image.data})\n\n**Audience**: ${image.level} | **Style**: ${image.style}\n${citations ? `\n**Sources**: ${citations}` : ''}`;
      await navigator.clipboard.writeText(md);
      toast.success('Markdown with citations copied!');
    } catch {
      toast.error('Failed to copy markdown');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPrompt.trim() || isEditing) return;
    const promptToRun = editPrompt.trim();
    setEditPrompt('');
    await onEdit(promptToRun);
  };

  const handlePresetClick = (preset: string) => {
    // Strip emoji prefix for clean prompt
    const clean = preset.replace(/^[^\w\s]+\s*/, '');
    setEditPrompt(clean);
  };

  const zoomIn = () => setZoomScale((prev) => Math.min(prev + 0.25, 2.5));
  const zoomOut = () => setZoomScale((prev) => Math.max(prev - 0.25, 1));
  const resetZoom = () => setZoomScale(1);

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-500">
      {/* 16:9 Image Preview Container */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-2xl bg-black group select-none">
        <div className="w-full aspect-video flex items-center justify-center bg-slate-950 overflow-hidden relative">
          {/* Main or Comparison View */}
          {showCompare && previousImage ? (
            <div className="w-full h-full grid grid-cols-2 gap-0.5 bg-slate-800">
              <div className="relative h-full flex items-center justify-center bg-black overflow-hidden">
                <img
                  src={previousImage.data}
                  alt="Previous Revision"
                  className="w-full h-full object-contain"
                />
                <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-black/80 text-[10px] font-bold text-amber-400 border border-amber-500/30">
                  Previous Revision
                </span>
              </div>
              <div className="relative h-full flex items-center justify-center bg-black overflow-hidden">
                <img
                  src={image.data}
                  alt="Current Revision"
                  className="w-full h-full object-contain"
                />
                <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-black/80 text-[10px] font-bold text-cyan-400 border border-cyan-500/30">
                  Current Revision
                </span>
              </div>
            </div>
          ) : (
            <div
              className="w-full h-full flex items-center justify-center transition-transform duration-200 overflow-auto cursor-grab active:cursor-grabbing"
              style={{ transform: `scale(${zoomScale})` }}
            >
              <img
                src={image.data}
                alt={image.prompt}
                className="w-full h-full object-contain pointer-events-none"
              />
            </div>
          )}

          {/* Interactive Floating Canvas Toolbar */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/70 backdrop-blur-md p-1.5 rounded-xl border border-white/15 opacity-90 hover:opacity-100 transition-opacity">
            {previousImage && (
              <button
                onClick={() => setShowCompare(!showCompare)}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                  showCompare
                    ? 'bg-cyan-600 text-white'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
                title="Toggle Before/After Comparison"
              >
                <Layers className="w-4 h-4" />
                <span className="text-[10px] hidden sm:inline">Compare</span>
              </button>
            )}
            <button
              onClick={zoomIn}
              className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={zoomOut}
              className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            {zoomScale !== 1 && (
              <button
                onClick={resetZoom}
                className="p-1.5 text-cyan-400 hover:text-cyan-300 rounded-lg hover:bg-white/10 transition-colors"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="w-[1px] h-4 bg-white/20 mx-0.5" />
            <button
              onClick={() => setIsFullscreen(true)}
              className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Full screen view"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleCopy}
              className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Copy image"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handleDownload}
              className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Download PNG"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>

          {/* Bottom badge overlay */}
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5 pointer-events-none">
            <span className="px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-[10px] font-bold text-white border border-white/10">
              {image.level}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-[10px] font-bold text-cyan-400 border border-white/10">
              {image.style}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-[10px] font-bold text-purple-300 border border-white/10">
              {image.language}
            </span>
            {zoomScale !== 1 && (
              <span className="px-2 py-1 rounded-lg bg-cyan-950/80 backdrop-blur-md text-[10px] font-bold text-cyan-300 border border-cyan-500/30">
                {Math.round(zoomScale * 100)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          {onInsertIntoSlide && (
            <button
              onClick={() => onInsertIntoSlide(image.data, image.prompt)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 flex items-center gap-1.5 transition-all transform hover:scale-[1.02]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Insert into Slide Canvas</span>
            </button>
          )}
          <button
            onClick={handleDownload}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-1.5 border border-slate-200 dark:border-white/10 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PNG</span>
          </button>
          <button
            onClick={handleCopyMarkdown}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-1.5 border border-slate-200 dark:border-white/10 transition-colors"
            title="Copy Markdown with Citations"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Copy Markdown</span>
          </button>
        </div>

        <div className="text-xs text-slate-400 font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>16:9 Verified Presentation Format</span>
        </div>
      </div>

      {/* Interactive Quick Refinement Suggestion Chips */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
          Quick AI Refinement Suggestions
        </span>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_EDIT_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handlePresetClick(preset)}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-purple-500/50 hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:text-purple-600 dark:hover:text-purple-300 transition-all text-left"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Iterative AI Edit / Refinement Bar */}
      <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 backdrop-blur-md shadow-sm">
        <form onSubmit={handleEditSubmit} className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 shrink-0">
            <Wand2 className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            disabled={isEditing}
            placeholder="Type your natural language refinement or pick a suggestion above..."
            className="flex-1 bg-transparent border-none text-xs md:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isEditing || !editPrompt.trim()}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 shadow-md shadow-purple-500/20"
          >
            {isEditing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Refining Visual...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Refine</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Fullscreen Preview Modal */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-[400] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsFullscreen(false)}
        >
          <img
            src={image.data}
            alt={image.prompt}
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
          />
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
