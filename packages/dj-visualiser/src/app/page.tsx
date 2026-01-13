'use client';

import { useEffect, useRef, useState } from 'react';

export default function DJVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  const startVisualizer = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      setIsActive(true);
      setError(null);
      animate();
    } catch (err) {
      setError('Microphone access denied. Please allow microphone access to use the visualizer.');
      console.error('Error accessing microphone:', err);
    }
  };

  const stopVisualizer = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setIsActive(false);
  };

  const animate = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    
    if (!canvas || !analyser) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      
      analyser.getByteFrequencyData(dataArray);
      
      // Clear with fade effect
      ctx.fillStyle = 'rgba(10, 10, 10, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const barCount = 64;
      const barWidth = canvas.width / barCount;
      const centerY = canvas.height / 2;
      
      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * bufferLength);
        const value = dataArray[dataIndex];
        const barHeight = (value / 255) * (canvas.height * 0.8);
        
        // Neon gradient colors
        const hue = (i / barCount) * 360 + Date.now() * 0.05;
        const gradient = ctx.createLinearGradient(0, centerY - barHeight / 2, 0, centerY + barHeight / 2);
        gradient.addColorStop(0, `hsla(${hue}, 100%, 60%, 0.8)`);
        gradient.addColorStop(0.5, `hsla(${hue + 30}, 100%, 70%, 1)`);
        gradient.addColorStop(1, `hsla(${hue}, 100%, 60%, 0.8)`);
        
        ctx.fillStyle = gradient;
        
        // Draw mirrored bars
        const x = i * barWidth;
        ctx.fillRect(x, centerY - barHeight / 2, barWidth - 2, barHeight);
        
        // Add glow effect
        ctx.shadowBlur = 20;
        ctx.shadowColor = `hsla(${hue}, 100%, 70%, 0.8)`;
        ctx.fillRect(x, centerY - barHeight / 2, barWidth - 2, barHeight);
        ctx.shadowBlur = 0;
      }
      
      // Add circular visualizer in center
      const radius = 100;
      const centerX = canvas.width / 2;
      
      ctx.beginPath();
      for (let i = 0; i < 360; i += 3) {
        const dataIndex = Math.floor((i / 360) * bufferLength);
        const value = dataArray[dataIndex];
        const r = radius + (value / 255) * 80;
        const angle = (i * Math.PI) / 180;
        const x = centerX + r * Math.cos(angle);
        const y = centerY + r * Math.sin(angle);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      
      const circleGradient = ctx.createRadialGradient(centerX, centerY, radius, centerX, centerY, radius + 80);
      circleGradient.addColorStop(0, 'rgba(120, 73, 239, 0.6)');
      circleGradient.addColorStop(1, 'rgba(50, 108, 216, 0.8)');
      ctx.strokeStyle = circleGradient;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 30;
      ctx.shadowColor = 'rgba(120, 73, 239, 0.8)';
      ctx.stroke();
      ctx.shadowBlur = 0;
    };
    
    draw();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      stopVisualizer();
    };
  }, []);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#0a0a0a]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
      
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
        {!isActive && !error && (
          <div className="text-center px-6 pointer-events-auto">
            <h1 className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              DJ Visualizer
            </h1>
            <p className="text-white/70 text-lg mb-8">
              Audio-reactive visuals for your beats
            </p>
            <button
              onClick={startVisualizer}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold rounded-full shadow-lg shadow-purple-500/50 transition-all duration-300 hover:scale-105"
            >
              Start Visualizer
            </button>
          </div>
        )}
        
        {error && (
          <div className="text-center px-6 pointer-events-auto">
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-6 max-w-md">
              <p className="text-red-300 mb-4">{error}</p>
              <button
                onClick={() => setError(null)}
                className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-full transition-all duration-300"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
        
        {isActive && (
          <button
            onClick={stopVisualizer}
            className="absolute bottom-8 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-semibold rounded-full border border-white/20 transition-all duration-300 pointer-events-auto"
          >
            Stop Visualizer
          </button>
        )}
      </div>
    </div>
  );
}

