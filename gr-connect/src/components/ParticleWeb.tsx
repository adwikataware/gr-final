"use client";
import { useEffect, useRef } from "react";

interface Props {
  particleCount?: number;
  particleColor?: string;
  lineColor?: string;
  particleRadius?: number;
  lineMaxDist?: number;
  mouseRadius?: number;
  mouseForce?: number;
  speed?: number;
  className?: string;
}

export default function ParticleWeb({
  particleCount = 80,
  particleColor = "rgba(157,132,97,0.5)",
  lineColor = "157,132,97",
  particleRadius = 2,
  lineMaxDist = 140,
  mouseRadius = 200,
  mouseForce = 0.08,
  speed = 0.4,
  className = "",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let animId = 0;
    const mouse = { x: -1000, y: -1000 };

    interface Dot {
      x: number;
      y: number;
      ox: number;
      oy: number;
      vx: number;
      vy: number;
    }

    let dots: Dot[] = [];

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const init = () => {
      resize();
      dots = [];
      for (let i = 0; i < particleCount; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        dots.push({
          x,
          y,
          ox: x,
          oy: y,
          vx: (Math.random() - 0.5) * speed,
          vy: (Math.random() - 0.5) * speed,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // Update positions
      for (const d of dots) {
        // Drift
        d.x += d.vx;
        d.y += d.vy;

        // Wrap edges
        if (d.x < 0) d.x = w;
        if (d.x > w) d.x = 0;
        if (d.y < 0) d.y = h;
        if (d.y > h) d.y = 0;

        // Mouse attraction
        const dx = mouse.x - d.x;
        const dy = mouse.y - d.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouseRadius) {
          const force = (1 - dist / mouseRadius) * mouseForce;
          d.x += dx * force;
          d.y += dy * force;
        }
      }

      // Draw lines
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x;
          const dy = dots[i].y - dots[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < lineMaxDist) {
            const opacity = (1 - dist / lineMaxDist) * 0.35;
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = `rgba(${lineColor},${opacity})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Draw lines from mouse to nearby dots
      for (const d of dots) {
        const dx = mouse.x - d.x;
        const dy = mouse.y - d.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouseRadius) {
          const opacity = (1 - dist / mouseRadius) * 0.5;
          ctx.beginPath();
          ctx.moveTo(mouse.x, mouse.y);
          ctx.lineTo(d.x, d.y);
          ctx.strokeStyle = `rgba(${lineColor},${opacity})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Draw dots
      for (const d of dots) {
        // Dots near mouse are bigger and brighter
        const dx = mouse.x - d.x;
        const dy = mouse.y - d.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const nearMouse = dist < mouseRadius;
        const r = nearMouse
          ? particleRadius + (1 - dist / mouseRadius) * 2.5
          : particleRadius;

        ctx.beginPath();
        ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
        ctx.fillStyle = nearMouse
          ? `rgba(${lineColor},${0.5 + (1 - dist / mouseRadius) * 0.5})`
          : particleColor;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const onMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    init();
    draw();

    window.addEventListener("resize", init);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", init);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [particleCount, particleColor, lineColor, particleRadius, lineMaxDist, mouseRadius, mouseForce, speed]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
    />
  );
}
