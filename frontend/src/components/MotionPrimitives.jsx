import React, { useEffect, useRef, useState } from 'react';
import { ImageOff } from 'lucide-react';

/**
 * Lightweight IntersectionObserver scroll reveal wrapper.
 * Runs once on entrance and degrades cleanly under prefers-reduced-motion.
 */
export function Reveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return true;
    return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
  });

  useEffect(() => {
    if (visible || !ref.current || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -24px 0px' }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={`${visible ? 'reveal-visible' : 'reveal-hidden'} ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Clean surface card with subtle hover elevation and crisp border transition.
 * No distracting cursor-tracking overlays over cards or selectable options.
 */
export function SpotlightCard({ children, className = '', interactive = false, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`studio-card rounded-2xl ${
        interactive
          ? 'hover:-translate-y-0.5 hover:border-emerald-500/35 hover:shadow-md hover:shadow-emerald-950/5 dark:hover:shadow-black/30'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Clean primary CTA button with smooth CSS hover lift and keyboard focus ring.
 * Preserves native browser pointer and never shifts away from cursor.
 */
export function MagneticButton({
  children,
  className = '',
  onClick,
  type = 'button',
  disabled = false,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#070a09] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Smooth image reveal with loading skeleton shimmer and graceful error fallback.
 */
export function StudioImage({ src, alt, className = '', loading = 'lazy' }) {
  const [imageState, setImageState] = useState({ src, status: 'loading' }); // 'loading' | 'loaded' | 'error'
  const status = imageState.src === src ? imageState.status : 'loading';

  if (!src || status === 'error') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-slate-100 dark:bg-slate-900/90 text-slate-400 dark:text-slate-500 p-4 text-center">
        <ImageOff className="w-6 h-6 opacity-70" />
        <span className="text-[11px] font-medium">Preview unavailable</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      {status === 'loading' && <div className="absolute inset-0 studio-skeleton" />}
      <img
        key={src}
        src={src}
        alt={alt}
        loading={loading}
        onLoad={() => setImageState({ src, status: 'loaded' })}
        onError={() => setImageState({ src, status: 'error' })}
        className={`${className} transition-all duration-500 ${
          status === 'loaded' ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.01]'
        }`}
      />
    </div>
  );
}
