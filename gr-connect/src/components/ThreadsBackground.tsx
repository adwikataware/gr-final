"use client";
import { useEffect, useRef } from "react";

export default function ThreadsBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const threads: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      length: number;
      angle: number;
      speed: number;
      opacity: number;
    }[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    // Create threads
    for (let i = 0; i < 40; i++) {
      threads.push({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        length: 80 + Math.random() * 160,
        angle: Math.random() * Math.PI * 2,
        speed: 0.001 + Math.random() * 0.003,
        opacity: 0.04 + Math.random() * 0.08,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      threads.forEach((t) => {
        t.x += t.vx;
        t.y += t.vy;
        t.angle += t.speed;

        if (t.x < -100) t.x = canvas.offsetWidth + 100;
        if (t.x > canvas.offsetWidth + 100) t.x = -100;
        if (t.y < -100) t.y = canvas.offsetHeight + 100;
        if (t.y > canvas.offsetHeight + 100) t.y = -100;

        const endX = t.x + Math.cos(t.angle) * t.length;
        const endY = t.y + Math.sin(t.angle) * t.length;

        ctx.beginPath();
        ctx.moveTo(t.x, t.y);

        const cpX = (t.x + endX) / 2 + Math.sin(t.angle * 2) * 30;
        const cpY = (t.y + endY) / 2 + Math.cos(t.angle * 2) * 30;
        ctx.quadraticCurveTo(cpX, cpY, endX, endY);

        ctx.strokeStyle = `rgba(157, 132, 97, ${t.opacity})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}
