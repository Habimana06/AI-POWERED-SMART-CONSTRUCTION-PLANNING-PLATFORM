import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, RefreshCw, ExternalLink, ImageOff, Loader2 } from 'lucide-react';
import { pollinationsImageUrl, randomSeed, truncatePromptForImage } from '../utils/pollinations';

const MAX_RETRIES = 4;
const RETRY_DELAY_MS = 15000;
const LOAD_TIMEOUT_MS = 120000;

/**
 * Generates an AI image from a text prompt using Pollinations (no API key).
 */
export default function PollinationsImage({
  prompt,
  width = 1024,
  height = 768,
  seed,
  alt = 'AI generated image',
  className = '',
  filename = 'ai-image',
  showControls = true,
  aspect = 'aspect-[4/3]',
  onFail,
  onReady,
}) {
  const [attempt, setAttempt] = useState(0);
  const [currentSeed, setCurrentSeed] = useState(seed ?? randomSeed());
  const [src, setSrc] = useState('');
  const [status, setStatus] = useState('loading');
  const retryTimer = useRef(null);
  const loadTimer = useRef(null);

  const safePrompt = truncatePromptForImage(prompt, 850);

  const buildUrl = useCallback(
    (s) => pollinationsImageUrl(safePrompt, { width, height, seed: s }),
    [safePrompt, width, height],
  );

  const clearTimers = () => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    if (loadTimer.current) clearTimeout(loadTimer.current);
  };

  const startLoad = useCallback((s, attemptNum = 0) => {
    if (!safePrompt) {
      setStatus('error');
      return;
    }
    clearTimers();
    setCurrentSeed(s);
    setStatus('loading');
    setSrc(`${buildUrl(s)}&_t=${Date.now()}`);

    loadTimer.current = setTimeout(() => {
      setStatus('error');
      if (attemptNum >= MAX_RETRIES - 1) onFail?.();
    }, LOAD_TIMEOUT_MS);
  }, [safePrompt, buildUrl, onFail]);

  useEffect(() => {
    if (!safePrompt) return undefined;
    const s = seed ?? randomSeed();
    setAttempt(0);
    startLoad(s, 0);
    return clearTimers;
  }, [safePrompt, seed, startLoad]);

  const regenerate = () => {
    const s = randomSeed();
    setAttempt(0);
    startLoad(s, 0);
  };

  const handleError = () => {
    clearTimers();
    if (attempt < MAX_RETRIES - 1) {
      setAttempt((a) => a + 1);
      retryTimer.current = setTimeout(() => {
        startLoad(randomSeed(), attempt + 1);
      }, RETRY_DELAY_MS);
    } else {
      setStatus('error');
      onFail?.();
    }
  };

  const handleDownload = async () => {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `${filename}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(src, '_blank', 'noopener');
    }
  };

  return (
    <div className={`relative rounded-xl overflow-hidden border border-steel-100 bg-steel-50 min-h-[280px] ${aspect} ${className}`}>
      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-concrete z-10">
          <Loader2 className="h-7 w-7 animate-spin" />
          <span className="text-xs">Generating image… {attempt > 0 ? `(retry ${attempt}/${MAX_RETRIES})` : ''}</span>
          <span className="text-[10px] text-concrete/70">Free Flux — can take 30–90s</span>
        </div>
      )}

      {status === 'error' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-concrete p-4 text-center z-10">
          <ImageOff className="h-7 w-7" />
          <span className="text-xs">Pollinations rate limit — wait 15s and retry</span>
          <button type="button" onClick={regenerate} className="btn-primary !py-1.5 !px-3 text-xs">Retry</button>
        </div>
      ) : (
        src && (
          <img
            src={src}
            alt={alt}
            onLoad={() => { clearTimers(); setStatus('ready'); onReady?.(src); }}
            onError={handleError}
            className={`w-full h-full object-cover transition-opacity duration-300 ${status === 'loading' ? 'opacity-0' : 'opacity-100'}`}
          />
        )
      )}

      {showControls && status === 'ready' && (
        <div className="absolute bottom-2 right-2 flex gap-1.5 z-10">
          <button type="button" onClick={regenerate} title="Regenerate" className="rounded-lg bg-black/55 p-1.5 text-white hover:bg-black/75 transition-colors">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={handleDownload} title="Download" className="rounded-lg bg-black/55 p-1.5 text-white hover:bg-black/75 transition-colors">
            <Download className="h-3.5 w-3.5" />
          </button>
          <a href={src} target="_blank" rel="noreferrer" title="Open original" className="rounded-lg bg-black/55 p-1.5 text-white hover:bg-black/75 transition-colors">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}
