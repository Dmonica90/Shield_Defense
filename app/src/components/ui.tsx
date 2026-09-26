import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useSound } from '../audio/SoundProvider';
import type { SfxName } from '../assets';

type ButtonTone = 'primary' | 'ghost' | 'danger' | 'quiet';

const TONES: Record<ButtonTone, string> = {
  primary:
    'bg-accent text-ground font-semibold hover:bg-accent/90 shadow-[0_0_28px_-8px_var(--color-accent)]',
  ghost: 'bg-panel-2/80 text-ink border border-edge hover:border-accent/70 hover:bg-panel-2',
  danger: 'bg-alarm text-ground font-semibold hover:bg-alarm/90',
  quiet: 'bg-transparent text-ink-dim hover:text-ink border border-transparent hover:border-edge',
};

export function Button({
  children,
  onClick,
  tone = 'primary',
  sfx = 'click',
  disabled,
  className = '',
  ...rest
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: ButtonTone;
  sfx?: SfxName | null;
  disabled?: boolean;
  className?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'className'>) {
  const { play } = useSound();
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (sfx) play(sfx);
        onClick?.();
      }}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-[0.95rem] transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${TONES[tone]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/**
 * Full-bleed scene with a cover image behind it. Every screen uses this so the
 * cross-fade between phases is identical everywhere.
 */
export function Scene({
  backdrop,
  children,
  overlay = 'bg-ground/72',
  className = '',
  zoomBackdrop = false,
}: {
  backdrop?: string;
  children: ReactNode;
  overlay?: string;
  className?: string;
  /** Scales the backdrop in, for a "lean closer" beat. */
  zoomBackdrop?: boolean;
}) {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className={`relative min-h-dvh w-full overflow-hidden ${className}`}
    >
      {backdrop && (
        <motion.img
          src={backdrop}
          alt=""
          aria-hidden="true"
          initial={zoomBackdrop ? { scale: 1.12, opacity: 0 } : false}
          animate={zoomBackdrop ? { scale: 1, opacity: 1 } : undefined}
          transition={{ duration: 0.75, ease: 'easeOut' }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className={`absolute inset-0 ${overlay}`} aria-hidden="true" />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,var(--color-ground)_100%)] opacity-80"
        aria-hidden="true"
      />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-6 sm:px-8">
        {children}
      </div>
    </motion.section>
  );
}

/**
 * Staggered entrance for a list of cards. Renders an `<ol>`/`<ul>` when asked,
 * so a list of items stays a real list for screen readers.
 */
export function Stagger({
  children,
  delay = 0,
  as = 'div',
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  as?: 'div' | 'ol' | 'ul';
  className?: string;
}) {
  const Tag = motion[as];
  return (
    <Tag
      initial="hidden"
      animate="shown"
      variants={{ shown: { transition: { staggerChildren: 0.09, delayChildren: delay } } }}
      className={className}
    >
      {children}
    </Tag>
  );
}

export function StaggerItem({
  children,
  className = '',
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'li';
}) {
  const Tag = motion[as];
  return (
    <Tag
      variants={{ hidden: { opacity: 0, y: 18 }, shown: { opacity: 1, y: 0 } }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </Tag>
  );
}

/**
 * Reveals text one character at a time, for the narrator and the console. The full string
 * is always in the DOM for assistive technology; only the visible slice grows.
 */
export function Typewriter({
  text,
  speed = 18,
  className = '',
  onDone,
}: {
  text: string;
  speed?: number;
  className?: string;
  onDone?: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [count, setCount] = useState(reduceMotion ? text.length : 0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (reduceMotion) {
      setCount(text.length);
      doneRef.current?.();
      return;
    }
    setCount(0);
    let index = 0;
    const id = setInterval(() => {
      index += 1;
      setCount(index);
      if (index >= text.length) {
        clearInterval(id);
        doneRef.current?.();
      }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, reduceMotion]);

  return (
    <p className={className}>
      <span aria-hidden="true">{text.slice(0, count)}</span>
      <span className="sr-only">{text}</span>
    </p>
  );
}

/** Modal dialog with focus trapping and Escape-to-close. */
export function Dialog({
  open,
  onClose,
  labelledBy,
  children,
}: {
  open: boolean;
  onClose?: () => void;
  labelledBy: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const node = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    node?.querySelector<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])')?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose?.();
        return;
      }
      if (event.key !== 'Tab' || !node) return;

      const focusable = [
        ...node.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ];
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ground/85 p-4 backdrop-blur-sm">
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="panel w-full max-w-lg rounded-2xl p-6 sm:p-8"
      >
        {children}
      </motion.div>
    </div>
  );
}
