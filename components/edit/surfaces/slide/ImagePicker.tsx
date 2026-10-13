'use client';

import { useRef, useState } from 'react';
import { Microscope } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/hooks/use-i18n';
import { InfographicModal } from '@/components/infographic';

interface ImagePickerProps {
  readonly onPick: (src: string) => void;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ImagePicker({ onPick }: ImagePickerProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');
  const [infographicOpen, setInfographicOpen] = useState(false);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    try {
      onPick(await fileToDataUrl(file));
    } catch (err) {
      console.error('ImagePicker: failed to read image file', err);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Grounded Infographic AI Visual Studio Entry */}
      <button
        type="button"
        onClick={() => setInfographicOpen(true)}
        className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600/15 to-purple-600/15 hover:from-cyan-600/25 hover:to-purple-600/25 border border-cyan-500/40 text-cyan-700 dark:text-cyan-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
      >
        <Microscope className="w-4 h-4 text-cyan-500 animate-pulse" />
        <span>Generate Grounded Infographic</span>
      </button>

      <InfographicModal
        open={infographicOpen}
        onClose={() => setInfographicOpen(false)}
        onInsertIntoSlide={(src) => {
          onPick(src);
          setInfographicOpen(false);
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void handleFiles(e.dataTransfer.files);
        }}
        className="rounded-lg border border-dashed border-zinc-300 p-5 text-center text-sm text-zinc-500 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400"
      >
        {t('edit.insert.imageDrop')}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <div className="text-center text-xs text-zinc-400">{t('edit.insert.imageOr')}</div>
      <div className="flex gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t('edit.insert.imageUrlPlaceholder')}
        />
        <Button type="button" disabled={!url.trim()} onClick={() => onPick(url.trim())}>
          {t('edit.insert.imageInsert')}
        </Button>
      </div>
    </div>
  );
}
