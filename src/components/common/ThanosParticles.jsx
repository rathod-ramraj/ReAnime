import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export function ThanosParticles({ isActive, onComplete, rect }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);

  useEffect(() => {
    if (!isActive || !rect || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = rect.width + 120;
    const height = rect.height + 120;
    canvas.width = width;
    canvas.height = height;

    const particleCount = 260;
    const particles = [];
    const colors = [
      'rgba(157, 255, 0, 0.95)',
      'rgba(157, 255, 0, 0.75)',
      'rgba(255, 255, 255, 0.95)',
      'rgba(255, 255, 255, 0.7)',
      'rgba(220, 255, 120, 0.85)',
      'rgba(180, 255, 60, 0.8)',
    ];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        id: i,
        x: Math.random() * rect.width + 60,
        y: Math.random() * rect.height + 60,
        size: Math.random() * 3.5 + 1.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        velocity: {
          x: (Math.random() - 0.25) * 9,
          y: (Math.random() - 0.55) * 6 - 1.2,
        },
        opacity: 1,
        rotation: Math.random() * 360,
        spin: (Math.random() - 0.5) * 8,
      });
    }
    particlesRef.current = particles;

    const startTime = Date.now();
    const duration = 1100;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle) => {
        particle.x += particle.velocity.x * (1 - progress * 0.4);
        particle.y += particle.velocity.y;
        particle.velocity.y += 0.1;
        particle.opacity = Math.max(0, 1 - progress);
        particle.rotation += particle.spin;

        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate((particle.rotation * Math.PI) / 180);
        ctx.globalAlpha = particle.opacity;
        ctx.fillStyle = particle.color;
        ctx.shadowColor = particle.color;
        ctx.shadowBlur = 4;
        ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
        ctx.restore();
      });

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, rect, onComplete]);

  if (!isActive || !rect || typeof document === 'undefined') return null;

  return createPortal(
    <canvas
      ref={canvasRef}
      className="thanos-canvas"
      style={{
        position: 'fixed',
        left: `${rect.left - 60}px`,
        top: `${rect.top - 60}px`,
        width: `${rect.width + 120}px`,
        height: `${rect.height + 120}px`,
        pointerEvents: 'none',
        zIndex: 999999,
      }}
    />,
    document.body
  );
}
