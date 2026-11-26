import React, { useEffect, useRef, useState } from 'react';

/**
 * Subtle, non-intrusive emerald ambient background glow.
 * - No custom cursor dot or trailing ring over UI controls.
 * - Sits behind interface content (z-0, pointer-events-none).
 * - Fades out automatically over interactive elements (buttons, links, inputs, cards).
 * - Disabled automatically on touch devices and when prefers-reduced-motion is enabled.
 */
export default function StudioCursor() {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    const finePointer = window.matchMedia?.('(pointer: fine)')?.matches;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    return Boolean(finePointer && !reducedMotion);
  });

  const glowRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const pointerQuery = window.matchMedia('(pointer: fine)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const syncCapability = () => {
      setEnabled(Boolean(pointerQuery.matches && !motionQuery.matches));
    };

    pointerQuery.addEventListener('change', syncCapability);
    motionQuery.addEventListener('change', syncCapability);
    return () => {
      pointerQuery.removeEventListener('change', syncCapability);
      motionQuery.removeEventListener('change', syncCapability);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let rafId = 0;
    let isOverBackground = false;
    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const current = { x: target.x, y: target.y };

    const handleMove = (e) => {
      target.x = e.clientX;
      target.y = e.clientY;

      const el = e.target instanceof Element ? e.target : null;
      const onInteractiveOrCard = Boolean(
        el?.closest(
          'a, button, [role="button"], input, textarea, select, option, label, nav, header, footer, .studio-card, [role="dialog"]'
        )
      );

      isOverBackground = !onInteractiveOrCard;
      if (glowRef.current) {
        glowRef.current.style.opacity = isOverBackground ? '1' : '0';
      }
    };

    const handleLeave = () => {
      isOverBackground = false;
      if (glowRef.current) {
        glowRef.current.style.opacity = '0';
      }
    };

    const tick = () => {
      current.x += (target.x - current.x) * 0.09;
      current.y += (target.y - current.y) * 0.09;

      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${current.x}px, ${current.y}px, 0) translate(-50%, -50%)`;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', handleMove, { passive: true });
    document.addEventListener('mouseleave', handleLeave);
    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', handleMove);
      document.removeEventListener('mouseleave', handleLeave);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        ref={glowRef}
        style={{
          opacity: 0,
          width: 480,
          height: 480,
          background:
            'radial-gradient(circle, rgba(16, 185, 129, 0.075) 0%, rgba(6, 95, 70, 0.03) 40%, transparent 72%)',
          willChange: 'transform',
        }}
        className="fixed top-0 left-0 rounded-full transition-opacity duration-300"
      />
    </div>
  );
}
