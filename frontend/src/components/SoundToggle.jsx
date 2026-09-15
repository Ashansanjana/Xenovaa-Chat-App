import { useEffect, useState } from 'react';
import { isSoundMuted, setSoundMuted, subscribeSoundMuteChange } from '../lib/soundSettings';
import { SpeakerIcon, SpeakerMuteIcon } from './Icons';

export function SoundToggle() {
  const [muted, setMuted] = useState(isSoundMuted);

  useEffect(() => subscribeSoundMuteChange(() => setMuted(isSoundMuted())), []);

  return (
    <button
      onClick={() => setSoundMuted(!muted)}
      title={muted ? 'Unmute message sounds' : 'Mute message sounds'}
      aria-label={muted ? 'Unmute message sounds' : 'Mute message sounds'}
      className="rounded-lg p-2 text-[var(--color-ink-muted)] transition hover:bg-field hover:text-[var(--color-ink-soft)]"
    >
      {muted ? <SpeakerMuteIcon className="h-[18px] w-[18px]" /> : <SpeakerIcon className="h-[18px] w-[18px]" />}
    </button>
  );
}
