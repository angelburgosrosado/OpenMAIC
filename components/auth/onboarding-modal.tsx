'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/store/auth-store';
import { AVATAR_OPTIONS, useUserProfileStore } from '@/lib/store/user-profile';
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  Code,
  Building,
  CheckCircle2,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PERSONAS = [
  {
    id: 'educator',
    title: 'Educator & Course Creator',
    desc: 'Creating interactive multimedia lectures, slide decks, and lesson plans for students.',
    icon: GraduationCap,
  },
  {
    id: 'researcher',
    title: 'Student & Academic Researcher',
    desc: 'Synthesizing complex papers, exploring concepts visually, and self-paced study.',
    icon: BookOpen,
  },
  {
    id: 'developer',
    title: 'AI Engineer & Builder',
    desc: 'Experimenting with generative multi-agent choreography, custom models, and DSLs.',
    icon: Code,
  },
  {
    id: 'enterprise',
    title: 'Corporate Trainer & Leader',
    desc: 'Producing executive briefings, employee onboarding modules, and sales training.',
    icon: Building,
  },
];

export function OnboardingModal() {
  const open = useAuthStore((s) => s.onboardingOpen);
  const setOpen = useAuthStore((s) => s.setOnboardingOpen);
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const setPricingOpen = useAuthStore((s) => s.setPricingModalOpen);

  const [step, setStep] = useState(1);
  const [selectedPersona, setSelectedPersona] = useState('educator');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(
    user?.avatar || AVATAR_OPTIONS[0],
  );

  const handleFinish = async () => {
    await updateProfile({
      avatar: selectedAvatar,
      bio: `Role: ${PERSONAS.find((p) => p.id === selectedPersona)?.title || 'Learner'}`,
    });
    setOpen(false);
    toast.success('Your workspace is ready! Enjoy generating your first classroom.');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border-border/50 bg-background/95 backdrop-blur-2xl shadow-2xl rounded-2xl">
        {/* Step Indicator Top Bar */}
        <div className="p-6 pb-4 bg-gradient-to-br from-violet-600/10 via-purple-500/5 to-primary/10 border-b border-border/40">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-2">
            <span>STEP {step} OF 3</span>
            <div className="flex gap-1.5">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={cn(
                    'h-1.5 w-6 rounded-full transition-all',
                    step >= s ? 'bg-violet-600' : 'bg-muted',
                  )}
                />
              ))}
            </div>
          </div>

          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            {step === 1 && 'Welcome to OpenMAIC! What is your main focus?'}
            {step === 2 && 'Your Token Allowance is Ready'}
            {step === 3 && 'Personalize Your Presenter Identity'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            {step === 1 && 'Help us tailor generation templates and agent choreography to your goals.'}
            {step === 2 && 'You have 250,000 complimentary platform tokens credited to your account.'}
            {step === 3 && 'Choose your favorite presentation persona for synthesized lectures.'}
          </DialogDescription>
        </div>

        {/* Step 1: Persona */}
        {step === 1 && (
          <div className="p-6 space-y-3">
            <div className="grid grid-cols-1 gap-2.5">
              {PERSONAS.map((p) => {
                const Icon = p.icon;
                const isSelected = selectedPersona === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPersona(p.id)}
                    className={cn(
                      'flex items-start gap-3.5 p-3.5 rounded-xl border text-left transition-all',
                      isSelected
                        ? 'border-violet-600 bg-violet-500/10 shadow-sm'
                        : 'border-border/60 hover:border-border hover:bg-muted/40',
                    )}
                  >
                    <div
                      className={cn(
                        'p-2 rounded-lg shrink-0',
                        isSelected ? 'bg-violet-600 text-white' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-foreground flex items-center justify-between">
                        <span>{p.title}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-violet-600" />}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {p.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-3 flex justify-end">
              <Button
                onClick={() => setStep(2)}
                className="bg-violet-600 hover:bg-violet-700 text-white font-medium"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Plan & Tokens Overview */}
        {step === 2 && (
          <div className="p-6 space-y-4">
            <div className="p-5 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-purple-500/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                  Current Tier: Free Starter
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  ACTIVE
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-foreground">
                  {(user?.tokenBalance ?? 250_000).toLocaleString()}
                </span>
                <span className="text-sm text-muted-foreground font-medium">tokens available</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tokens power all AI generations across OpenMAIC — including outline planning, scene DSL
                compilation, AI illustrations, and audio voiceover.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border/60 bg-muted/30 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Need higher quotas or 1080p video exports?
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Creator Pro unlocks 3,000,000 monthly tokens and flagship models.
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setOpen(false);
                  setPricingOpen(true);
                }}
                className="text-xs font-semibold border-violet-500/40 text-violet-600 dark:text-violet-400 shrink-0 ml-2"
              >
                View Plans
              </Button>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep(1)} className="text-xs">
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                className="bg-violet-600 hover:bg-violet-700 text-white font-medium"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Avatar Selection */}
        {step === 3 && (
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-foreground">Select Presenter Avatar</span>
              <div className="grid grid-cols-4 gap-3">
                {AVATAR_OPTIONS.map((avatarUri) => (
                  <button
                    key={avatarUri}
                    type="button"
                    onClick={() => setSelectedAvatar(avatarUri)}
                    className={cn(
                      'relative p-2 rounded-xl border transition-all flex flex-col items-center justify-center gap-1.5',
                      selectedAvatar === avatarUri
                        ? 'border-violet-600 bg-violet-500/10 shadow-sm ring-2 ring-violet-500/30'
                        : 'border-border/60 hover:border-border hover:bg-muted/40',
                    )}
                  >
                    <img
                      src={avatarUri}
                      alt="Avatar option"
                      className="w-12 h-12 rounded-full object-cover shadow-sm"
                    />
                    {selectedAvatar === avatarUri && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-violet-600 text-white flex items-center justify-center text-[10px]">
                        ✓
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-border/40">
              <Button variant="ghost" onClick={() => setStep(2)} className="text-xs">
                Back
              </Button>
              <Button
                onClick={handleFinish}
                className="bg-violet-600 hover:bg-violet-700 text-white font-medium"
              >
                <Sparkles className="w-4 h-4 mr-1.5" />
                Launch Studio
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
