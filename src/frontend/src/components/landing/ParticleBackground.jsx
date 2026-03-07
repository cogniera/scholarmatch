import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function ParticleBackground() {
  const vantaRef = useRef(null);
  const [vantaEffect, setVantaEffect] = useState(null);

  useEffect(() => {
    let effect = null;
    // Dynamic import to avoid SSR issues and reduce initial bundle
    import('vanta/dist/vanta.net.min').then((VANTA) => {
      if (vantaRef.current && !vantaEffect) {
        effect = VANTA.default({
          el: vantaRef.current,
          THREE,
          color: 0xF5A623,
          backgroundColor: 0x080C14,
          points: 12.0,
          maxDistance: 22.0,
          spacing: 18.0,
          showDots: true,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.0,
          minWidth: 200.0,
          scale: 1.0,
          scaleMobile: 1.0,
        });
        setVantaEffect(effect);
      }
    });
    return () => {
      if (effect) effect.destroy();
    };
  }, []);

  return (
    <div
      ref={vantaRef}
      className="fixed inset-0 z-0"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
