import { useEffect, useRef, useState, useCallback } from 'react';

/* ─── Magnetic Button ─────────────────────────────────────── */
export function MagneticButton({
  children,
  className = '',
  strength = 0.35,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { strength?: number }) {
  const ref = useRef<HTMLButtonElement>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * strength;
    const y = (e.clientY - rect.top - rect.height / 2) * strength;
    el.style.transform = `translate(${x}px, ${y}px) scale(1.03)`;
  }, [strength]);

  const handleMouseLeave = useCallback(() => {
    if (ref.current) {
      ref.current.style.transform = 'translate(0px, 0px) scale(1)';
      ref.current.style.transition = 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)';
    }
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [handleMouseMove, handleMouseLeave]);

  return (
    <button
      ref={ref}
      className={`btn-magnetic ${className}`}
      style={{ transition: 'transform 0.15s ease-out, box-shadow 0.3s ease' }}
      {...props}
    >
      {children}
    </button>
  );
}

/* ─── 3D Tilt Card ────────────────────────────────────────── */
export function TiltCard({
  children,
  className = '',
  maxTilt = 12,
}: {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotateX = (0.5 - y) * maxTilt;
    const rotateY = (x - 0.5) * maxTilt;
    el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    el.style.transition = 'transform 0.05s ease-out';
  }, [maxTilt]);

  const handleMouseLeave = useCallback(() => {
    if (ref.current) {
      ref.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
      ref.current.style.transition = 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)';
    }
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [handleMouseMove, handleMouseLeave]);

  return (
    <div ref={ref} className={`tilt-card ${className}`} style={{ transformStyle: 'preserve-3d' }}>
      {children}
    </div>
  );
}

/* ─── Kinetic Cycling Text ────────────────────────────────── */
export function KineticText({
  words,
  className = '',
}: {
  words: string[];
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setExiting(true);
      setTimeout(() => {
        setIndex((i) => (i + 1) % words.length);
        setExiting(false);
      }, 400);
    }, 2800);
    return () => clearInterval(interval);
  }, [words.length]);

  return (
    <span className={`kinetic-container ${className}`}>
      <span className={`kinetic-slide ${exiting ? 'exiting' : 'active'}`}>
        {words[index]}
      </span>
    </span>
  );
}

/* ─── Scroll Reveal Wrapper ───────────────────────────────── */
export function ScrollReveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: 0 | 1 | 2 | 3 | 4 | 5;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('revealed');
          observer.unobserve(el);
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const delayClass = delay > 0 ? `scroll-reveal-delay-${delay}` : '';

  return (
    <div ref={ref} className={`scroll-reveal ${delayClass} ${className}`}>
      {children}
    </div>
  );
}

/* ─── Spotlight Card ──────────────────────────────────────── */
export function SpotlightCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty('--mouse-x', `${x}%`);
    el.style.setProperty('--mouse-y', `${y}%`);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener('mousemove', handleMouseMove);
    return () => el.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  return (
    <div ref={ref} className={`spotlight-container ${className}`}>
      <div className="spotlight-overlay" />
      {children}
    </div>
  );
}

/* ─── Stat Counter (rolls up on enter) ───────────────────── */
export function StatCounter({
  value,
  className = '',
}: {
  value: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`stat-counter ${className}`}>
      {visible && (
        <span className="stat-counter-inner">{value}</span>
      )}
      {!visible && <span style={{ opacity: 0 }}>{value}</span>}
    </div>
  );
}
