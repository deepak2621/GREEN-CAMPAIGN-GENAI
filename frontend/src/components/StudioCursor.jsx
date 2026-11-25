import React, { useEffect, useRef, useState } from 'react';

/**
 * Lightweight, GPU-accelerated custom studio cursor + ambient radial emerald glow.
 * - Disabled automatically on touch devices and when prefers-reduced-motion is enabled.
 * - Never intercepts pointer events or interferes with clicking, scrolling, or text selection.
 */
export default function StudioCursor() {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    const finePointer = window.matchMedia?.('(pointer: fine)')?.matches;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    return Boolean(finePointer && !reducedMotion);
  });

  const dotRef = useRef(null);
  const ringRef = useRef(null);
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
    let visible = false;
    let hoveringInteractive = false;
    let hoveringTextInput = false;

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ring = { x: target.x, y: target.y };
    const glow = { x: target.x, y: target.y };

    const updateVisibility = (show) => {
      visible = show;
      const opacity = show ? '1' : '0';
      if (dotRef.current) dotRef.current.style.opacity = hoveringTextInput ? '0.25' : opacity;
      if (ringRef.current) ringRef.current.style.opacity = hoveringTextInput ? '0.2' : opacity;
      if (glowRef.current) glowRef.current.style.opacity = opacity;
    };

    const handleMove = (e) => {
      target.x = e.clientX;
      target.y = e.clientY;

      const el = e.target instanceof Element ? e.target : null;
      hoveringTextInput = Boolean(el?.closest('input, textarea, select, [contenteditable="true"]'));
      hoveringInteractive = Boolean(
        !hoveringTextInput &&
          el?.closest('a, button, [role="button"], label, [data-cursor="interactive"]')
      );

      if (!visible) updateVisibility(true);
      if (dotRef.current) {
        dotRef.current.style.opacity = hoveringTextInput ? '0.2' : '1';
      }
      if (ringRef.current) {
        ringRef.current.style.opacity = hoveringTextInput ? '0.15' : '1';
      }
    };

    const handleLeave = () => updateVisibility(false);

    const tick = () => {
      // Smooth interpolation for trailing ring and soft ambient glow
      ring.x += (target.x - ring.x) * 0.18;
      ring.y += (target.y - ring.y) * 0.18;
      glow.x += (target.x - glow.x) * 0.1;
      glow.y += (target.y - glow.y) * 0.1;

      if (dotRef.current) {
        const dotScale = hoveringInteractive ? 0.7 : 1;
        dotRef.current.style.transform = `translate3d(${target.x}px, ${target.y}px, 0) translate(-50%, -50%) scale(${dotScale})`;
      }

      if (ringRef.current) {
        const ringScale = hoveringInteractive ? 1.55 : 1;
        ringRef.current.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0) translate(-50%, -50%) scale(${ringScale})`;
        ringRef.current.style.borderColor = hoveringInteractive
          ? 'rgba(16, 185, 129, 0.65)'
          : 'rgba(16, 185, 129, 0.35)';
        ringRef.current.style.backgroundColor = hoveringInteractive
          ? 'rgba(16, 185, 129, 0.08)'
          : 'transparent';
      }

      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${glow.x}px, ${glow.y}px, 0) translate(-50%, -50%)`;
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
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {/* Subtle Cursor-Following Radial Emerald Glow */}
      <div
        ref={glowRef}
        style={{
          opacity: 0,
          width: 440,
          height: 440,
          background:
            'radial-gradient(circle, rgba(16, 185, 129, 0.09) 0%, rgba(6, 95, 70, 0.035) 38%, transparent 72%)',
          willChange: 'transform',
        }}
        className="fixed top-0 left-0 rounded-full transition-opacity duration-300"
      />

      {/* Smooth Trailing Ring */}
      <div
        ref={ringRef}
        style={{
          opacity: 0,
          width: 30,
          height: 30,
          border: '1.5px solid rgba(16, 185, 129, 0.35)',
          willChange: 'transform',
        }}
        className="fixed top-0 left-0 rounded-full transition-[opacity,border-color,background-color] duration-200"
      />

      {/* Crisp Center Accent Dot */}
      <div
        ref={dotRef}
        style={{
          opacity: 0,
          width: 6,
          height: 6,
          backgroundColor: '#10b981',
          boxShadow: '0 0 10px rgba(16, 185, 129, 0.45)',
          willChange: 'transform',
        }}
        className="fixed top-0 left-0 rounded-full transition-opacity duration-150"
      />
    </div>
  );
}
