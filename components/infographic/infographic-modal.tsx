'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  Sparkles,
  GraduationCap,
  Palette,
  Globe,
  Microscope,
  AlertCircle,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  researchTopic,
  generateInfographic,
  editInfographic,
} from '@/lib/services/infographic-client';
import type {
  InfographicComplexityLevel,
  InfographicVisualStyle,
  InfographicLanguage,
  GeneratedInfographic,
  SearchResultItem,
} from '@/lib/types/infographic';
import { InfographicLoading } from './infographic-loading';
import { InfographicViewer } from './infographic-viewer';
import { SearchResultsPanel } from './search-results-panel';
import { SessionArchives } from './session-archives';

interface InfographicModalProps {
  open: boolean;
  onClose: () => void;
  onInsertIntoSlide?: (imageDataUrl: string, prompt: string) => void;
  initialTopic?: string;
}

const INSPIRATION_CHIPS = [
  { label: '🔬 CRISPR-Cas9 Gene Editing', topic: 'CRISPR-Cas9 mechanism of targeted DNA cleavage and repair', style: 'Default' as const, level: 'College' as const },
  { label: '⚡ Photosynthesis & ATP Cycle', topic: 'Photosynthesis light reactions and Calvin cycle in chloroplasts', style: 'Default' as const, level: 'High School' as const },
  { label: '🌌 Black Hole Event Horizon', topic: 'Anatomy of a spinning Kerr black hole event horizon and accretion disk', style: '3D Render' as const, level: 'College' as const },
  { label: '🏛️ Roman Republic Constitution', topic: 'Constitutional checks and balances in the Roman Republic', style: 'Vintage' as const, level: 'High School' as const },
  { label: '🧠 Synaptic Transmission', topic: 'Neurotransmitter release and receptor binding across synaptic cleft', style: 'Default' as const, level: 'College' as const },
  { label: '⚙️ Jet Engine Turbofan', topic: 'High-bypass turbofan jet engine airflow and combustion stages', style: 'Sketch' as const, level: 'Expert' as const },
];

export function InfographicModal({
  open,
  onClose,
  onInsertIntoSlide,
  initialTopic = '',
}: InfographicModalProps) {
  const [topic, setTopic] = useState(initialTopic);
  const [complexityLevel, setComplexityLevel] =
    useState<InfographicComplexityLevel>('High School');
  const [visualStyle, setVisualStyle] =
    useState<InfographicVisualStyle>('Default');
  const [language, setLanguage] = useState<InfographicLanguage>('English');

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingFacts, setLoadingFacts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [imageHistory, setImageHistory] = useState<GeneratedInfographic[]>([]);
  const [currentSearchResults, setCurrentSearchResults] = useState<
    SearchResultItem[]
  >([]);

  const handleSpeechToggle = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.error('Text-to-speech is not supported in this browser');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const factsToRead =
      imageHistory[0]?.facts || loadingFacts;

    if (!factsToRead || factsToRead.length === 0) {
      toast.error('No research facts available to read aloud');
      return;
    }

    window.speechSynthesis.cancel();
    const textToRead = `${topic}. Key facts: ${factsToRead.join('. ')}`;
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    toast.info('Reading grounded facts aloud...');
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoading || !topic.trim()) return;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    setIsLoading(true);
    setError(null);
    setLoadingStep(1);
    setLoadingFacts([]);
    setCurrentSearchResults([]);
    setLoadingMessage('Researching topic with Google Search grounding...');

    try {
      // Step 1: Research with Google search grounding
      const research = await researchTopic(
        topic.trim(),
        complexityLevel,
        visualStyle,
        language,
      );

      setLoadingFacts(research.facts);
      setCurrentSearchResults(research.searchResults);

      // Step 2: Generate 16:9 infographic
      setLoadingStep(2);
      setLoadingMessage('Synthesizing 16:9 educational infographic visual...');

      const imageData = await generateInfographic(research.imagePrompt);

      const newImage: GeneratedInfographic = {
        id: Date.now().toString(),
        data: imageData,
        prompt: topic.trim(),
        timestamp: Date.now(),
        level: complexityLevel,
        style: visualStyle,
        language,
        facts: research.facts,
        searchResults: research.searchResults,
      };

      setImageHistory([newImage, ...imageHistory]);
      toast.success('Grounded infographic generated successfully');
    } catch (err: unknown) {
      console.error(err);
      const msg =
        err instanceof Error ? err.message : 'Failed to generate visual infographic';
      setError(msg);
      toast.error('Infographic generation failed');
    } finally {
      setIsLoading(false);
      setLoadingStep(0);
    }
  };

  const handleEdit = async (editPrompt: string) => {
    if (imageHistory.length === 0 || isLoading) return;
    const current = imageHistory[0];

    setIsLoading(true);
    setError(null);
    setLoadingStep(2);
    setLoadingMessage(`Refining visual: "${editPrompt}"...`);

    try {
      const updatedData = await editInfographic(current.data, editPrompt);
      const updatedImage: GeneratedInfographic = {
        id: Date.now().toString(),
        data: updatedData,
        prompt: editPrompt,
        timestamp: Date.now(),
        level: current.level,
        style: current.style,
        language: current.language,
        facts: current.facts,
        searchResults: current.searchResults,
      };

      setImageHistory([updatedImage, ...imageHistory]);
      toast.success('Diagram refined successfully');
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Refinement failed';
      setError(msg);
      toast.error('Refinement failed');
    } finally {
      setIsLoading(false);
      setLoadingStep(0);
    }
  };

  const handleSelectHistory = (img: GeneratedInfographic) => {
    const remaining = imageHistory.filter((i) => i.id !== img.id);
    setImageHistory([img, ...remaining]);
    if (img.searchResults) setCurrentSearchResults(img.searchResults);
  };

  const handleChipClick = (chip: (typeof INSPIRATION_CHIPS)[0]) => {
    setTopic(chip.topic);
    setComplexityLevel(chip.level);
    setVisualStyle(chip.style);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-4 md:p-8 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl">
        <DialogHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-500/25 to-purple-500/25 border border-cyan-500/30 text-cyan-500 shadow-md">
              <Microscope className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Visual Knowledge Studio
                <span className="text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full font-extrabold bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                  Google Search Grounded
                </span>
              </DialogTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Generate audience-calibrated educational infographics, blueprints, and scientific diagrams
              </p>
            </div>
          </div>

          {(imageHistory.length > 0 || loadingFacts.length > 0) && (
            <button
              onClick={handleSpeechToggle}
              className={`p-2 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-semibold ${
                isSpeaking
                  ? 'bg-cyan-500 text-white border-cyan-400 animate-pulse'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-cyan-50 dark:hover:bg-slate-800'
              }`}
              title={isSpeaking ? 'Stop narration' : 'Listen to grounded facts'}
            >
              {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{isSpeaking ? 'Stop Audio' : 'Listen Facts'}</span>
            </button>
          )}
        </DialogHeader>

        {/* Inspiration Preset Chips */}
        <div className="mt-3 space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Sample Inspiration Topics
          </span>
          <div className="flex flex-wrap gap-1.5">
            {INSPIRATION_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleChipClick(chip)}
                className="text-xs font-medium px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 hover:border-cyan-500/50 hover:bg-cyan-50/50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all text-left shadow-2xs"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Configuration Form */}
        <form onSubmit={handleGenerate} className="mt-3 space-y-3">
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What educational concept, scientific mechanism, or timeline do you want to visualize?"
              className="w-full pl-12 pr-28 py-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-sm md:text-base font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-sm"
            />
            <button
              type="submit"
              disabled={isLoading || !topic.trim()}
              className="absolute right-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs tracking-wide shadow-md shadow-cyan-500/20 flex items-center gap-1.5 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate</span>
            </button>
          </div>

          {/* Granular Parameter Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            {/* Audience / Complexity Selector */}
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xs">
              <div className="p-1.5 rounded-lg bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Audience
                </span>
                <select
                  value={complexityLevel}
                  onChange={(e) =>
                    setComplexityLevel(e.target.value as InfographicComplexityLevel)
                  }
                  className="w-full bg-transparent border-none text-xs font-bold text-slate-800 dark:text-slate-200 p-0 focus:outline-none cursor-pointer"
                >
                  <option value="Elementary">Elementary (K-5 Metaphorical)</option>
                  <option value="High School">High School (Standard Curricular)</option>
                  <option value="College">College (In-Depth Academic)</option>
                  <option value="Expert">Expert (Professional Schematic)</option>
                </select>
              </div>
            </div>

            {/* Aesthetic Style Selector */}
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xs">
              <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
                <Palette className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Aesthetic Style
                </span>
                <select
                  value={visualStyle}
                  onChange={(e) =>
                    setVisualStyle(e.target.value as InfographicVisualStyle)
                  }
                  className="w-full bg-transparent border-none text-xs font-bold text-slate-800 dark:text-slate-200 p-0 focus:outline-none cursor-pointer"
                >
                  <option value="Default">Standard Scientific</option>
                  <option value="Sketch">Technical Blueprint</option>
                  <option value="3D Render">3D Isometric Cutaway</option>
                  <option value="Vintage">Vintage Lithograph</option>
                  <option value="Cartoon">Graphic Novel</option>
                  <option value="Futuristic">Cyberpunk HUD</option>
                  <option value="Minimalist">Minimalist Vector</option>
                  <option value="Realistic">Photorealistic</option>
                </select>
              </div>
            </div>

            {/* Language Selector */}
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xs">
              <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                <Globe className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Language
                </span>
                <select
                  value={language}
                  onChange={(e) =>
                    setLanguage(e.target.value as InfographicLanguage)
                  }
                  className="w-full bg-transparent border-none text-xs font-bold text-slate-800 dark:text-slate-200 p-0 focus:outline-none cursor-pointer"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                  <option value="Mandarin">Mandarin</option>
                  <option value="Japanese">Japanese</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Arabic">Arabic</option>
                  <option value="Portuguese">Portuguese</option>
                  <option value="Russian">Russian</option>
                </select>
              </div>
            </div>
          </div>
        </form>

        {/* Error Notification */}
        {error && (
          <div className="mt-4 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center gap-3 text-red-700 dark:text-red-300 text-xs font-medium">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading fact ticker */}
        {isLoading && (
          <InfographicLoading
            status={loadingMessage}
            step={loadingStep}
            facts={loadingFacts}
          />
        )}

        {/* Main Display Area */}
        {!isLoading && imageHistory.length > 0 && (
          <div className="mt-6 space-y-6">
            <InfographicViewer
              image={imageHistory[0]}
              previousImage={imageHistory[1]}
              onEdit={handleEdit}
              isEditing={isLoading}
              onInsertIntoSlide={
                onInsertIntoSlide
                  ? (dataUrl, prompt) => {
                      onInsertIntoSlide(dataUrl, prompt);
                      onClose();
                    }
                  : undefined
              }
            />

            {/* Google Search Grounding Sources Drawer */}
            <SearchResultsPanel results={currentSearchResults} />

            {/* Revisions & Variations History */}
            <SessionArchives
              history={imageHistory}
              onSelect={handleSelectHistory}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
