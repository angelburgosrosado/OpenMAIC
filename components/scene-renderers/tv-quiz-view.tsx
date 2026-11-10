'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { CheckCircle2, XCircle, ArrowRight, Sparkles, HelpCircle } from 'lucide-react';
import { useTVNavigation } from '@/components/tv/TVNavigationProvider';
import { TVFocusable } from '@/components/tv/TVFocusable';
import { answerIncludesOption } from '@/lib/quiz/grading';
import { renderQuizMathText } from '@/lib/quiz/math-text';
import type { QuizQuestion } from '@/lib/types/stage';
import type { SpatialRect } from '@/lib/tv/spatial-navigation';
import { cn } from '@/lib/utils/cn';

export interface TVQuizViewProps {
  questions: QuizQuestion[];
  sceneId: string;
  stageId: string;
  onComplete?: () => void;
  className?: string;
}

function TVQuizMathText({ text, className }: { text: string; className?: string }) {
  const segments = useMemo(() => renderQuizMathText(text), [text]);
  if (segments.length === 1 && segments[0].type === 'text') {
    return <span className={className}>{segments[0].value}</span>;
  }

  return (
    <span className={className}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return <span key={index}>{segment.value}</span>;
        }

        return (
          <span
            key={index}
            className="inline-block align-baseline [&_.katex-display]:!my-0"
            dangerouslySetInnerHTML={{ __html: segment.html }}
          />
        );
      })}
    </span>
  );
}

export function TVQuizView({
  questions,
  sceneId: _sceneId,
  stageId: _stageId,
  onComplete,
  className,
}: TVQuizViewProps) {
  const { setFocus } = useTVNavigation();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const currentQ = questions[currentQuestionIndex];
  const totalQuestions = questions.length;

  // Auto focus first option on initial mount or when question index changes
  useEffect(() => {
    setSelectedOption(null);
    setIsSubmitted(false);
    setFocus('tv-quiz-opt-0');
  }, [currentQuestionIndex, setFocus]);

  const options = currentQ?.options ?? [];

  const isCorrect = useMemo(() => {
    if (!currentQ || !selectedOption) return false;
    return answerIncludesOption(currentQ, selectedOption);
  }, [currentQ, selectedOption]);

  const handleSelectOption = useCallback(
    (val: string) => {
      if (isSubmitted) return;
      setSelectedOption(val);
    },
    [isSubmitted]
  );

  const handleSubmit = useCallback(() => {
    if (isSubmitted) return;
    if (!selectedOption && options.length > 0) {
      // If nothing selected, select first option by default on submit
      setSelectedOption(options[0].value);
    }
    setIsSubmitted(true);
    setFocus('tv-quiz-next');
  }, [isSubmitted, selectedOption, options, setFocus]);

  const handleContinue = useCallback(() => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      onComplete?.();
    }
  }, [currentQuestionIndex, totalQuestions, onComplete]);

  if (!currentQ || totalQuestions === 0) {
    return (
      <div
        data-testid="tv-quiz-view"
        className="w-full h-full flex items-center justify-center bg-zinc-950 text-white p-8"
      >
        <p className="text-2xl text-white/70">No questions available</p>
      </div>
    );
  }

  // Pre-calculated 2D spatial layout coordinates for predictable spatial navigation
  const submitTop = 220 + Math.ceil(options.length / 2) * 140;
  const submitRect: SpatialRect = {
    left: 300,
    top: submitTop,
    width: 320,
    height: 80,
  };

  const nextRect: SpatialRect = {
    left: 300,
    top: submitTop + 100,
    width: 380,
    height: 80,
  };

  return (
    <div
      data-testid="tv-quiz-view"
      className={cn(
        'w-full h-full min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black',
        'text-white flex flex-col items-center justify-center p-8 md:p-14 select-none overflow-y-auto',
        className
      )}
    >
      <div className="w-full max-w-5xl flex flex-col items-center">
        {/* Header: Question counter & Type */}
        <div className="w-full flex items-center justify-between mb-4">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-cyan-950/70 border border-cyan-800/80 shadow-md">
            <HelpCircle className="w-5 h-5 text-cyan-400" />
            <span className="text-lg md:text-xl font-bold text-cyan-300">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </span>
          </div>
          {currentQ.points && (
            <span className="text-base md:text-lg font-semibold text-white/60">
              {currentQ.points} {currentQ.points === 1 ? 'Point' : 'Points'}
            </span>
          )}
        </div>

        {/* Question Text (Large 28px-34px font for 10-foot scale) */}
        <h2 className="w-full text-2xl md:text-[32px] font-bold text-white tracking-wide leading-snug mb-8 text-left">
          <TVQuizMathText text={currentQ.question} />
        </h2>

        {/* Options 2D Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-8">
          {options.map((opt, idx) => {
            const isSelected = selectedOption === opt.value;
            const isCorrectOption = isSubmitted && answerIncludesOption(currentQ, opt.value);
            const isWrongSelection = isSubmitted && isSelected && !isCorrectOption;

            const col = idx % 2;
            const row = Math.floor(idx / 2);
            const optRect: SpatialRect = {
              left: 100 + col * 420,
              top: 220 + row * 140,
              width: 380,
              height: 110,
            };

            return (
              <TVFocusable
                key={opt.value}
                id={`tv-quiz-opt-${idx}`}
                autoFocus={idx === 0 && !isSubmitted}
                rect={optRect}
                disabled={isSubmitted}
                onSelect={() => handleSelectOption(opt.value)}
                data-selected={isSelected ? 'true' : 'false'}
                data-correct={isCorrectOption ? 'true' : 'false'}
                className={cn(
                  'relative rounded-2xl p-6 border transition-all duration-200 cursor-pointer flex items-center gap-5',
                  // Pre-submission states
                  !isSubmitted && !isSelected && 'bg-white/10 border-white/20 hover:bg-white/15',
                  !isSubmitted &&
                    isSelected &&
                    'border-2 border-cyan-400 bg-cyan-950/70 shadow-xl shadow-cyan-900/40 ring-2 ring-cyan-400/50',
                  // Post-submission review states
                  isSubmitted &&
                    isCorrectOption &&
                    'border-2 border-emerald-400 bg-emerald-950/70 ring-2 ring-emerald-400/50 text-emerald-100',
                  isSubmitted &&
                    isWrongSelection &&
                    'border-2 border-red-400 bg-red-950/70 text-red-200 ring-2 ring-red-400/40',
                  isSubmitted &&
                    !isCorrectOption &&
                    !isWrongSelection &&
                    'border-white/10 bg-white/5 opacity-40 text-white/50'
                )}
              >
                {/* Large Letter Chip */}
                <div
                  className={cn(
                    'w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0 transition-colors',
                    !isSubmitted && !isSelected && 'bg-white/20 text-white',
                    !isSubmitted && isSelected && 'bg-cyan-400 text-black shadow-lg shadow-cyan-400/50',
                    isSubmitted && isCorrectOption && 'bg-emerald-400 text-black shadow-lg shadow-emerald-400/50',
                    isSubmitted && isWrongSelection && 'bg-red-400 text-white',
                    isSubmitted && !isCorrectOption && !isWrongSelection && 'bg-white/10 text-white/50'
                  )}
                >
                  {opt.value}
                </div>

                {/* Option Text (20px-24px font) */}
                <div className="flex-1 text-xl md:text-2xl font-medium leading-normal">
                  <TVQuizMathText text={opt.label} />
                </div>

                {/* Review status icons */}
                {isSubmitted && isCorrectOption && (
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
                )}
                {isSubmitted && isWrongSelection && (
                  <XCircle className="w-8 h-8 text-red-400 shrink-0" />
                )}
              </TVFocusable>
            );
          })}
        </div>

        {/* Action Controls & Review Mode */}
        {!isSubmitted ? (
          <div className="flex justify-center mt-2">
            <TVFocusable
              id="tv-quiz-submit"
              autoFocus={false}
              rect={submitRect}
              onSelect={handleSubmit}
              className="rounded-2xl overflow-hidden focus:outline-none"
            >
              <button
                type="button"
                className={cn(
                  'px-10 py-5 rounded-2xl text-2xl font-bold flex items-center gap-3 transition-all',
                  'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-xl hover:brightness-110 active:scale-95'
                )}
              >
                <Sparkles className="w-6 h-6 text-cyan-200" />
                Submit Answer
              </button>
            </TVFocusable>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center gap-6 mt-2">
            {/* Celebration or Review Banner */}
            <div
              className={cn(
                'w-full p-6 rounded-2xl border-2 flex items-center gap-5 shadow-2xl backdrop-blur-md',
                isCorrect
                  ? 'bg-emerald-950/80 border-emerald-400/80 text-emerald-200'
                  : 'bg-red-950/80 border-red-400/80 text-red-200'
              )}
            >
              {isCorrect ? (
                <CheckCircle2 className="w-12 h-12 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-12 h-12 text-red-400 shrink-0" />
              )}
              <div className="flex-1">
                <h3 className="text-2xl md:text-3xl font-black tracking-wide">
                  {isCorrect ? 'Correct! 🎉 Outstanding job!' : 'Incorrect ❌'}
                </h3>
                <p className="text-lg md:text-xl text-white/80 mt-1">
                  {isCorrect
                    ? 'You selected the right answer.'
                    : 'Review the correct answer and explanation below.'}
                </p>
              </div>
            </div>

            {/* Explanation / Analysis */}
            {currentQ.analysis && (
              <div className="w-full p-6 rounded-2xl bg-white/10 border border-white/20 text-white/90">
                <span className="text-lg font-bold text-cyan-300 block mb-2">
                  Explanation:
                </span>
                <p className="text-lg md:text-xl leading-relaxed text-white/90">
                  <TVQuizMathText text={currentQ.analysis} />
                </p>
              </div>
            )}

            {/* Continue Button */}
            <div className="flex justify-center mt-4">
              <TVFocusable
                id="tv-quiz-next"
                autoFocus={true}
                rect={nextRect}
                onSelect={handleContinue}
                className="rounded-2xl overflow-hidden focus:outline-none"
              >
                <button
                  type="button"
                  className={cn(
                    'px-12 py-5 rounded-2xl text-2xl font-bold flex items-center gap-4 transition-all',
                    'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-2xl hover:brightness-110 active:scale-95'
                  )}
                >
                  <span>
                    {currentQuestionIndex < totalQuestions - 1
                      ? 'Continue to Next Question ⏭'
                      : 'Continue to Next Scene ⏭'}
                  </span>
                  <ArrowRight className="w-7 h-7 text-white" />
                </button>
              </TVFocusable>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
