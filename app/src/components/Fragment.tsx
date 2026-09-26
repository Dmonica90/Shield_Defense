import { motion } from 'framer-motion';
import { useLanguage } from '../i18n/LanguageProvider';
import type { AreaId } from '../game/types';

export type FragmentLook = 'empty' | 'held' | 'genuine' | 'false';

const RING: Record<FragmentLook, string> = {
  empty: 'border-edge bg-panel-2/60 opacity-45 grayscale',
  // Held looks exactly like genuine would: the player cannot tell yet.
  held: 'border-accent/70 bg-accent/10 shadow-[0_0_22px_-6px_var(--color-accent)]',
  genuine: 'border-safe bg-safe/15 shadow-[0_0_26px_-4px_var(--color-safe)]',
  false: 'border-alarm bg-alarm/15 shadow-[0_0_26px_-4px_var(--color-alarm)]',
};

/**
 * One of the four shield fragments. `held` is deliberately indistinguishable
 * from a real one — until the console verifies them, every fragment looks safe.
 */
export function Fragment({
  area,
  look,
  size = 'md',
  label = true,
}: {
  area: AreaId;
  look: FragmentLook;
  size?: 'sm' | 'md' | 'lg';
  label?: boolean;
}) {
  const { story } = useLanguage();
  const { icon, name } = story.areas[area].fragment;
  const box = { sm: 'h-8 w-8 text-base', md: 'h-12 w-12 text-2xl', lg: 'h-24 w-24 text-5xl' }[size];

  return (
    <span className="inline-flex flex-col items-center gap-1">
      <motion.span
        aria-hidden="true"
        className={`grid place-items-center rounded-xl border-2 ${box} ${RING[look]}`}
        style={{ clipPath: 'polygon(50% 0%, 100% 22%, 100% 78%, 50% 100%, 0% 78%, 0% 22%)' }}
        animate={look === 'false' ? { x: [0, -3, 3, -2, 0] } : undefined}
        transition={{ duration: 0.4 }}
      >
        {icon}
      </motion.span>
      {label && <span className="font-mono text-[0.65rem] tracking-widest text-ink-dim uppercase">{name}</span>}
    </span>
  );
}
