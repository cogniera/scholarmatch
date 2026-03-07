import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';

const PARTICLE_COUNT = 150;
const MAX_LINES = PARTICLE_COUNT * PARTICLE_COUNT;
const CONNECTION_DISTANCE = 16;
const MOUSE_RADIUS = 30;
const MOUSE_ATTRACTION = 0.015;
const SPRING_DAMPING = 0.05;

function NetworkGraph() {
  const pointsRef = useRef();
  const linesRef = useRef();
  const { viewport, size } = useThree();

  // Create a custom water drop shape to replace default square Points
  const dropTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    ctx.beginPath();
    ctx.moveTo(32, 4);
    ctx.bezierCurveTo(48, 20, 56, 36, 56, 46);
    ctx.bezierCurveTo(56, 56, 46, 60, 32, 60);
    ctx.bezierCurveTo(18, 60, 8, 56, 8, 46);
    ctx.bezierCurveTo(8, 36, 16, 20, 32, 4);
    
    const gradient = ctx.createRadialGradient(32, 42, 0, 32, 42, 24);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    return new THREE.CanvasTexture(canvas);
  }, []);

  // Pre-calculate positions and physics data
  const { positions, originalPositions, baseVelocities, velocities, colors } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const originalPositions = new Float32Array(PARTICLE_COUNT * 3);
    const baseVelocities = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    const brandColor = new THREE.Color('#F5A623'); // Gold

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Distribute inside a 3D sphere for a cohesive network shape (like theoryvc)
      const r = 35 * Math.cbrt(Math.random());
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      originalPositions[i * 3] = x;
      originalPositions[i * 3 + 1] = y;
      originalPositions[i * 3 + 2] = z;

      // Base slow drift velocity for each particle
      baseVelocities[i * 3] = (Math.random() - 0.5) * 0.02;
      baseVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
      baseVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;

      velocities[i * 3] = 0;
      velocities[i * 3 + 1] = 0;
      velocities[i * 3 + 2] = 0;

      // Add slight color variations
      brandColor.toArray(colors, i * 3);
    }

    return { positions, originalPositions, baseVelocities, velocities, colors };
  }, []);

  // Pre-allocate arrays for line rendering
  const { linePositions, lineIndices, lineColors } = useMemo(() => {
    return {
      linePositions: new Float32Array(PARTICLE_COUNT * 3), // We share positions
      lineIndices: new Uint16Array(MAX_LINES * 2),
      lineColors: new Float32Array(MAX_LINES * 2 * 3) // Dynamic line colors (opacity driven by distance)
    };
  }, []);

  const mouse = useRef(new THREE.Vector2(-1000, -1000));
  const normalizedMouse = useRef(new THREE.Vector2(0, 0));
  const parallaxGroupRef = useRef();
  const rotationGroupRef = useRef();
  
  // Temporary variables for color math inside useFrame
  const baseNodeColor = useMemo(() => new THREE.Color('#F5A623'), []); // Gold
  const cursorNodeColor = useMemo(() => new THREE.Color(), []);
  const tempPColor = useMemo(() => new THREE.Color(), []);
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      // Map mouse to -1 to 1 coordinates
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      
      normalizedMouse.current.x = x;
      normalizedMouse.current.y = y;

      // Calculate world coordinates approximately
      mouse.current.x = (x * viewport.width) / 2;
      mouse.current.y = (y * viewport.height) / 2;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [viewport]);

  useFrame((state, delta) => {
    let lineCount = 0;
    
    // Smooth Parallax applied to the outer group
    if (parallaxGroupRef.current) {
      const targetRotX = normalizedMouse.current.y * 0.15;
      const targetRotY = normalizedMouse.current.x * 0.15;
      parallaxGroupRef.current.rotation.x += (targetRotX - parallaxGroupRef.current.rotation.x) * 0.05;
      parallaxGroupRef.current.rotation.y += (targetRotY - parallaxGroupRef.current.rotation.y) * 0.05;
      
      const targetPosX = normalizedMouse.current.x * 2;
      const targetPosY = normalizedMouse.current.y * 2;
      parallaxGroupRef.current.position.x += (targetPosX - parallaxGroupRef.current.position.x) * 0.05;
      parallaxGroupRef.current.position.y += (targetPosY - parallaxGroupRef.current.position.y) * 0.05;
    }

    // Continuous cohesive 3D rotation applied to the inner group
    if (rotationGroupRef.current) {
      rotationGroupRef.current.rotation.y += delta * 0.08;
      rotationGroupRef.current.rotation.x += delta * 0.03;
    }
    
    const posAttribute = pointsRef.current.geometry.attributes.position;
    const posArray = posAttribute.array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const idx = i * 3;
      
      // Current position
      const px = posArray[idx];
      const py = posArray[idx + 1];
      const pz = posArray[idx + 2];

      // Distance to mouse
      const dxMouse = mouse.current.x - px;
      const dyMouse = mouse.current.y - py;
      const distMouseSq = dxMouse * dxMouse + dyMouse * dyMouse;

      // Mouse attraction logic
      if (distMouseSq < MOUSE_RADIUS * MOUSE_RADIUS) {
        velocities[idx] += dxMouse * MOUSE_ATTRACTION;
        velocities[idx + 1] += dyMouse * MOUSE_ATTRACTION;
      }

      // Autonomous particle drift for continuous network movement
      originalPositions[idx] += baseVelocities[idx];
      originalPositions[idx + 1] += baseVelocities[idx + 1];
      originalPositions[idx + 2] += baseVelocities[idx + 2];

      // Keep particles inside bounding box
      if (Math.abs(originalPositions[idx]) > 40) baseVelocities[idx] *= -1;
      if (Math.abs(originalPositions[idx + 1]) > 40) baseVelocities[idx + 1] *= -1;
      if (Math.abs(originalPositions[idx + 2]) > 40) baseVelocities[idx + 2] *= -1;

      // --- DYNAMIC WATER DROP COLOR LOGIC ---
      const distMouse = Math.sqrt(distMouseSq);
      
      // Compute an Antigravity-style gradient hue depending on normalized mouse position (shifts cyan to purple)
      const targetHue = 0.55 + (normalizedMouse.current.x * 0.15) + (normalizedMouse.current.y * 0.15);
      cursorNodeColor.setHSL(targetHue, 0.9, 0.6);
      
      // Interpolate based on proximity so only nearby nodes drastically change color
      const colorIntensity = Math.max(0, 1 - (distMouse / 45)); 
      tempPColor.lerpColors(baseNodeColor, cursorNodeColor, colorIntensity);
      
      const colorAttribute = pointsRef.current.geometry.attributes.color;
      colorAttribute.array[idx] = tempPColor.r;
      colorAttribute.array[idx + 1] = tempPColor.g;
      colorAttribute.array[idx + 2] = tempPColor.b;

      // Spring back to (now drifting) original position (smooth recovery)
      const dxOri = originalPositions[idx] - px;
      const dyOri = originalPositions[idx + 1] - py;
      const dzOri = originalPositions[idx + 2] - pz;

      velocities[idx] += dxOri * SPRING_DAMPING;
      velocities[idx + 1] += dyOri * SPRING_DAMPING;
      velocities[idx + 2] += dzOri * SPRING_DAMPING;

      // Apply velocity and dampen
      velocities[idx] *= 0.85; // Friction
      velocities[idx + 1] *= 0.85;
      velocities[idx + 2] *= 0.85;

      posArray[idx] += velocities[idx];
      posArray[idx + 1] += velocities[idx + 1];
      posArray[idx + 2] += velocities[idx + 2];

      // Calculate Connections (O(N^2) but N is small)
      for (let j = i + 1; j < PARTICLE_COUNT; j++) {
        const jdx = j * 3;
        const oPx = posArray[jdx];
        const oPy = posArray[jdx + 1];
        const oPz = posArray[jdx + 2];

        const dx = oPx - px;
        const dy = oPy - py;
        const dz = oPz - pz;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < CONNECTION_DISTANCE * CONNECTION_DISTANCE) {
          lineIndices[lineCount * 2] = i;
          lineIndices[lineCount * 2 + 1] = j;

          // Make lines near mouse brighter
          const intensity = Math.max(0.1, 1 - (distSq / (CONNECTION_DISTANCE * CONNECTION_DISTANCE)));
          const mouseBoost = distMouseSq < (MOUSE_RADIUS * 1.5) ** 2 ? 0.8 : 0.2;
          
          const finalIntensity = Math.min(1, intensity * mouseBoost);

          // RGBA logic using dynamically computed node colors so the web itself changes color
          lineColors[lineCount * 6] = colorAttribute.array[idx] * finalIntensity; // R
          lineColors[lineCount * 6 + 1] = colorAttribute.array[idx + 1] * finalIntensity; // G
          lineColors[lineCount * 6 + 2] = colorAttribute.array[idx + 2] * finalIntensity; // B

          lineColors[lineCount * 6 + 3] = colorAttribute.array[jdx] * finalIntensity;
          lineColors[lineCount * 6 + 4] = colorAttribute.array[jdx + 1] * finalIntensity;
          lineColors[lineCount * 6 + 5] = colorAttribute.array[jdx + 2] * finalIntensity;

          lineCount++;
        }
      }
    }

    posAttribute.needsUpdate = true;
    pointsRef.current.geometry.attributes.color.needsUpdate = true;

    // Update lines geometry
    linesRef.current.geometry.setDrawRange(0, lineCount * 2);
    linesRef.current.geometry.attributes.color.needsUpdate = true;
    // We are sharing the exact same position buffer reference!
  });

  return (
    <group ref={parallaxGroupRef}>
      <group ref={rotationGroupRef}>
        {/* Nodes */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={PARTICLE_COUNT} array={positions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={PARTICLE_COUNT} array={colors} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={1.2} map={dropTexture} alphaTest={0.01} vertexColors transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>

      {/* Connections array */}
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={PARTICLE_COUNT} array={positions} itemSize={3} />
          <bufferAttribute attach="index" count={MAX_LINES * 2} array={lineIndices} itemSize={1} />
          <bufferAttribute attach="attributes-color" count={MAX_LINES * 2} array={lineColors} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial vertexColors transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} />
      </lineSegments>
      </group>
    </group>
  );
}

export default function NetworkCanvas() {
  return (
    <div className="absolute inset-0 z-0 bg-brand-bg overflow-hidden pointer-events-none">
      <Canvas camera={{ position: [0, 0, 50], fov: 75 }} dpr={[1, 2]}>
        <ambientLight intensity={0.5} />
        <NetworkGraph />
      </Canvas>
    </div>
  );
}
