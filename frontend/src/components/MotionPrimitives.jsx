import React, { useEffect, useRef, useState } from 'react';

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
      { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
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
 * Linear-inspired card with subtle cursor-tracking emerald radial spotlight & hover lift.
 * Updates CSS variables directly on the DOM node to avoid React re-renders.
 */
export function SpotlightCard({ children, className = '', interactive = false, onClick }) {
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    el.style.setProperty('--my', `${e.clientY - rect.top}px`);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onClick={onClick}
      className={`studio-card spotlight-card rounded-2xl ${
        interactive ? 'hover:-translate-y-0.5 hover:border-emerald-500/35 hover:shadow-lg hover:shadow-emerald-950/10' : ''
      } ${className}`}
    >
      <div className="relative z-[2] h-full">{children}</div>
    </div>
  );
}

/**
 * Subtle magnetic button for primary calls-to-action.
 * Disabled automatically on touch devices or reduced motion.
 */
export function MagneticButton({
  children,
  className = '',
  onClick,
  type = 'button',
  disabled = false,
  ...props
}) {
  const btnRef = useRef(null);

  const canMagnet = () => {
    if (disabled || typeof window === 'undefined') return false;
    return Boolean(
      window.matchMedia?.('(pointer: fine)')?.matches &&
        !window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    );
  };

  const handleMove = (e) => {
    if (!canMagnet() || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const dx = ((e.clientX - (rect.left + rect.width / 2)) / rect.width) * 7;
    const dy = ((e.clientY - (rect.top + rect.height / 2)) / rect.height) * 5;
    btnRef.current.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
  };

  const handleLeave = () => {
    if (btnRef.current) {
      btnRef.current.style.transform = 'translate3d(0, 0, 0)';
    }
  };

  return (
    <button
      ref={btnRef}
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ transition: 'transform 0.2s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.2s, box-shadow 0.2s, opacity 0.2s' }}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Smooth image reveal with loading skeleton shimmer.
 */
export function StudioImage({ src, alt, className = '', loading = 'lazy' }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {!loaded && <div className="absolute inset-0 studio-skeleton" />}
      <img
        src={src}
        alt={alt}
        loading={loading}
        onLoad={() => setLoaded(true)}
        className={`${className} transition-all duration-500 ${
          loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.02]'
        }`}
      />
    </div>
  );
}
