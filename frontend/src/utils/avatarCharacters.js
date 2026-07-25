export const AVATAR_CHARACTERS = [
  { id: 'char-1', label: 'Alex — Site lead', src: '/avatars/char-1.svg' },
  { id: 'char-2', label: 'Jordan — Structural engineer', src: '/avatars/char-2.svg' },
  { id: 'char-3', label: 'Sam — Foreman', src: '/avatars/char-3.svg' },
  { id: 'char-4', label: 'Rina — Architect', src: '/avatars/char-4.svg' },
  { id: 'char-5', label: 'Chris — Safety officer', src: '/avatars/char-5.svg' },
  { id: 'char-6', label: 'Pat — Project planner', src: '/avatars/char-6.svg' },
];

/** @returns {'' | 'custom' | string} preset id, empty for initials, or 'custom' for uploads */
export function resolveAvatarCharacterId(avatarUrl) {
  if (!avatarUrl || !String(avatarUrl).trim()) return '';
  const match = AVATAR_CHARACTERS.find(
    (c) => c.src === avatarUrl || avatarUrl.endsWith(c.src),
  );
  return match ? match.id : 'custom';
}
