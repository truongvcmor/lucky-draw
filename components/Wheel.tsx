import React, { useRef, useEffect, useState } from 'react';
import { WheelSegment } from '../types';
import { audioManager } from '../utils/audio';

interface WheelProps {
  segments: WheelSegment[];
  isSpinning: boolean;
  winnerSegmentIndex: number | null; 
  onSpinFinish: (actualWinner: number) => void;
  customLogo?: string | null;
}

const Wheel: React.FC<WheelProps> = ({ segments, isSpinning, winnerSegmentIndex, onSpinFinish, customLogo }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentNumberRef = useRef<HTMLDivElement>(null); // Ref for the digital display box
  
  // Animation state
  const rotationRef = useRef(0);
  const outerRotationRef = useRef(0); // NEW: Track outer rim rotation
  const velocityRef = useRef(0);
  const animationFrameRef = useRef<number>(0);
  const spinningRef = useRef(false);
  
  // Audio throttling
  const lastClickRef = useRef(0);

  // Logo handling
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    // Priority: Custom Uploaded Logo -> Default 'logo.png'
    const src = customLogo || './logo.png';
    
    const img = new Image();
    img.src = src; 
    
    img.onload = () => setLogoImage(img);
    img.onerror = () => {
        // Silently fail if image not found, so it falls back to text "MOR" without crashing
        if (customLogo) {
             console.warn("Could not load custom logo.");
        }
        setLogoImage(null);
    };
  }, [customLogo]);

  // Helper to get current segment based on rotation
  const getCurrentSegment = () => {
    if (segments.length === 0) return null;

    // Normalizing rotation to 0 - 2PI
    let normalizedRotation = rotationRef.current % (2 * Math.PI);
    if (normalizedRotation < 0) normalizedRotation += 2 * Math.PI;

    // The pointer is at Angle 0 (3 o'clock).
    // The segments rotate clockwise.
    // We need to find which segment currently overlaps angle 0 (or 2PI).
    // Formula: Index = floor( (2PI - rotation) / arcSize ) % total
    
    const arcSize = (2 * Math.PI) / segments.length;
    const angleFromStart = (2 * Math.PI - normalizedRotation) % (2 * Math.PI);
    const index = Math.floor(angleFromStart / arcSize) % segments.length;

    return segments[index];
  };

  // Calculate and update the digital display
  const updateCurrentValueDisplay = () => {
    if (!currentNumberRef.current) return;
    
    const currentSegment = getCurrentSegment();
    if (currentSegment) {
      currentNumberRef.current.innerText = currentSegment.text;
    }
  };

  // Initialize and Draw Wheel
  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    // Reduced radius to make space for the outer tech border
    const radius = Math.min(centerX, centerY) - 100; // Increased padding for lightning
    
    // Safety check for empty segments to avoid division by zero
    const arcSize = segments.length > 0 ? (2 * Math.PI) / segments.length : 0;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const time = performance.now() / 1000;

    // ==========================================================
    // GROUP 1: OUTER ROTATING RIMS (Tech + Gold Rim + Lights)
    // Rotates Counter-Clockwise based on outerRotationRef
    // ==========================================================
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(outerRotationRef.current);

    // --- 0. NEW: Technology Outer Border Layer & Lightning ---
    
    // 0.0 "SHORT CIRCUIT" / LEAKAGE EFFECT
    // Instead of a loop, we create random intense arcs that zap between points
    ctx.save();
    
    // Probability of a zap happening this frame (high for chaotic look)
    if (Math.random() > 0.1) {
        // How many separate arcs to draw at once (1 to 3)
        const numArcs = Math.floor(Math.random() * 3) + 1;
        const lightningBaseRadius = radius + 90;

        for (let n = 0; n < numArcs; n++) {
            // Pick a random sector for the arc
            const startAngle = Math.random() * 2 * Math.PI;
            // Short length for "spark" look (0.1 to 0.4 radians)
            const arcLength = (Math.random() * 0.3) + 0.1; 
            
            ctx.beginPath();
            const segmentsCount = 10; // Detailed jaggedness

            for (let i = 0; i <= segmentsCount; i++) {
                const progress = i / segmentsCount;
                const currentAngle = startAngle + (progress * arcLength);
                
                // Extreme jitter for "leaking electricity" look
                // The jitter is larger in the middle of the arc
                const jitterAmount = Math.sin(progress * Math.PI) * 35; 
                const randomOffset = (Math.random() - 0.5) * jitterAmount;
                
                const r = lightningBaseRadius + randomOffset;
                const x = Math.cos(currentAngle) * r;
                const y = Math.sin(currentAngle) * r;

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }

            // Draw the Bolt (White Core)
            ctx.lineWidth = 2 + Math.random() * 2;
            ctx.strokeStyle = '#FFFFFF';
            ctx.shadowColor = '#00E5FF'; // Cyan Glow
            ctx.shadowBlur = 15;
            ctx.lineCap = 'round';
            ctx.stroke();

            // Draw a second wider, fainter stroke for "Gas" effect around plasma
            ctx.beginPath();
            // Re-trace (simplified for visual speed, actually we just stroke same path if we didn't close path)
            ctx.stroke(); 
            ctx.lineWidth = 8;
            ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
            ctx.shadowBlur = 30;
            ctx.stroke();

            // SPARKS: Draw random dots flying off the arc
            const numSparks = Math.floor(Math.random() * 5);
            for(let s=0; s<numSparks; s++) {
                const sparkAngle = startAngle + Math.random() * arcLength;
                const sparkDist = lightningBaseRadius + (Math.random() - 0.5) * 60;
                const sx = Math.cos(sparkAngle) * sparkDist;
                const sy = Math.sin(sparkAngle) * sparkDist;
                
                ctx.beginPath();
                ctx.rect(sx, sy, 2, 2);
                ctx.fillStyle = '#FFFFFF';
                ctx.fill();
            }
        }
    }
    ctx.restore();

    // 0.1 Rotating Cyan Dashed Ring
    ctx.save();
    // Note: We are already rotating the whole group, adding `time` here makes this specific ring spin faster relative to the group
    ctx.rotate(time * 0.15); 
    ctx.beginPath();
    ctx.arc(0, 0, radius + 65, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.5)'; // Cyan
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 30]); // Long dashes
    ctx.stroke();
    ctx.restore();

    // 0.2 Counter-Rotating Blue Tech Ring
    ctx.save();
    ctx.rotate(-time * 0.1);
    ctx.beginPath();
    ctx.arc(0, 0, radius + 55, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(0, 84, 166, 0.6)'; // MOR Blue
    ctx.lineWidth = 3;
    ctx.setLineDash([4, 8]);
    ctx.stroke();
    ctx.restore();

    // 0.3 Static HUD Brackets & Outer Circle
    // These now rotate with the outerRotationRef
    ctx.beginPath();
    ctx.arc(0, 0, radius + 75, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 4 Corner Markers
    const bracketRadius = radius + 70;
    for(let i = 0; i < 4; i++) {
        ctx.save();
        ctx.rotate((Math.PI / 2) * i);
        
        ctx.beginPath();
        ctx.arc(0, 0, bracketRadius, -Math.PI/12, Math.PI/12);
        ctx.strokeStyle = '#00E5FF';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#00E5FF';
        ctx.shadowBlur = 15;
        ctx.lineCap = 'round';
        ctx.stroke();
        
        // Dot at the center of arc
        ctx.beginPath();
        ctx.arc(bracketRadius + 8, 0, 3, 0, 2*Math.PI);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();

        ctx.restore();
    }


    // --- 1. Draw Outer Rim / Lights ---
    // Moved inside the rotating context so it spins!
    ctx.save();
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#F37021'; // MOR Orange Glow
    
    // Gold/Orange Gradient Rim
    // We need to recreate gradient relative to new coordinates (0,0)
    const rimGradient = ctx.createLinearGradient(-radius, -radius, radius, radius);
    rimGradient.addColorStop(0, '#F37021');
    rimGradient.addColorStop(0.5, '#FFD700');
    rimGradient.addColorStop(1, '#F37021');
    
    ctx.beginPath();
    ctx.arc(0, 0, radius + 25, 0, 2 * Math.PI); // Draw at 0,0
    ctx.fillStyle = rimGradient;
    ctx.fill();
    ctx.restore();

    // Dark Inner Border
    ctx.beginPath();
    ctx.arc(0, 0, radius + 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#0B1E33'; // Dark Navy
    ctx.fill();

    // LED Lights on Rim
    const numLights = 24;
    const lightAngle = (2 * Math.PI) / numLights;
    const lightRadius = radius + 15;
    
    for(let i=0; i<numLights; i++) {
       const lx = Math.cos(i * lightAngle) * lightRadius; // Relative to 0,0
       const ly = Math.sin(i * lightAngle) * lightRadius;
       
       ctx.beginPath();
       ctx.arc(lx, ly, 6, 0, 2*Math.PI);
       
       // Alternating lights logic
       const isOn = Math.floor(time * 2) % 2 === 0 ? (i % 2 === 0) : (i % 2 !== 0);
       
       if (isOn) {
         ctx.fillStyle = '#FFF';
         ctx.shadowBlur = 10;
         ctx.shadowColor = '#FFF';
       } else {
         ctx.fillStyle = '#555';
         ctx.shadowBlur = 0;
       }
       ctx.fill();
       ctx.shadowBlur = 0; // Reset
    }

    // End of Rotating Group
    ctx.restore(); 


    // ==========================================================
    // GROUP 2: SEGMENTS (Main Wheel)
    // ==========================================================

    // --- 2. Draw Segments (Only if there are segments) ---
    if (segments.length > 0) {
      segments.forEach((segment, index) => {
        const angle = rotationRef.current + index * arcSize;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, angle, angle + arcSize);
        
        // Segment Gradient for 3D effect
        ctx.fillStyle = segment.color;
        ctx.fill();
        
        // Inner Stroke for separation
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.stroke();

        // --- Draw Text ---
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle + arcSize / 2);
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle'; // Center text vertically in the slice
        ctx.fillStyle = segment.textColor;
        
        // Adjust font size based on density
        const fontSize = segments.length > 60 ? 12 : 16;
        ctx.font = `bold ${fontSize}px Montserrat`;
        
        // Add text shadow for better visibility
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        
        // Draw at y=0 to ensure it's exactly on the centerline of the slice
        ctx.fillText(segment.text, radius - 20, 0);
        
        ctx.restore();
      });

      // --- 3. Inner Gloss/Shine (Optional) ---
      // Draw a faint white gradient over top half to simulate reflection
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      const glossGradient = ctx.createLinearGradient(centerX, centerY - radius, centerX, centerY + radius);
      glossGradient.addColorStop(0, 'rgba(255,255,255,0.2)');
      glossGradient.addColorStop(0.5, 'transparent');
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2*Math.PI);
      ctx.fillStyle = glossGradient;
      ctx.fill();
      ctx.restore();
    } else {
      // Empty State for Wheel
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#1A3A5E'; // Dark Blue Background
      ctx.fill();
      
      ctx.fillStyle = '#FFF';
      ctx.font = '20px Montserrat';
      ctx.textAlign = 'center';
      ctx.fillText('Đang cập nhật...', centerX, centerY + 80);
      ctx.restore();
    }

    // --- 4. Center Decoration (Company Logo) ---
    // Outer metallic ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, 50, 0, 2 * Math.PI);
    const centerGradient = ctx.createLinearGradient(centerX - 50, centerY - 50, centerX + 50, centerY + 50);
    centerGradient.addColorStop(0, '#E5E7EB');
    centerGradient.addColorStop(1, '#9CA3AF');
    ctx.fillStyle = centerGradient;
    ctx.fill();
    
    // Inner border
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#6B7280';
    ctx.stroke();

    // White background for logo
    ctx.beginPath();
    ctx.arc(centerX, centerY, 46, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFFFFF'; 
    ctx.fill();
    
    // Draw Logo Image or Fallback
    if (logoImage) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, 42, 0, 2 * Math.PI);
        ctx.clip();
        // Draw image centered and covering the area
        ctx.drawImage(logoImage, centerX - 35, centerY - 35, 70, 70);
        ctx.restore();
    } else {
        // Fallback: Stylized MOR Logo Representation
        // Blue Shape (Top)
        ctx.beginPath();
        ctx.arc(centerX, centerY, 30, Math.PI - 0.5, 0 - 0.3); 
        ctx.strokeStyle = '#0054A6'; // MOR Blue
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Orange Shape (Bottom)
        ctx.beginPath();
        ctx.arc(centerX, centerY, 30, 0 + 0.5, Math.PI - 0.3);
        ctx.strokeStyle = '#F37021'; // MOR Orange
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.stroke();
        
        // Text
        ctx.fillStyle = '#0B1E33';
        ctx.font = '900 16px Montserrat';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('MOR', centerX, centerY);
    }
  };

  // Continuous animation loop for lights blinking AND IDLE SPIN
  useEffect(() => {
    let animId: number;
    const loop = () => {
      // Idle Spin Logic: Rotate slowly when not actively spinning
      if (!isSpinning && !spinningRef.current && segments.length > 0) {
         rotationRef.current += 0.005; // Adjust idle speed here
         // Keep rotation normalized to prevent massive numbers
         if (rotationRef.current >= Math.PI * 2) {
           rotationRef.current -= Math.PI * 2;
         }
      }

      // Update OUTER ROTATION (Counter-Clockwise)
      // When spinning: Rotate Fast (-0.15)
      // When idle: Rotate Slow (-0.002)
      const outerSpeed = (isSpinning || spinningRef.current) ? 0.15 : 0.002;
      outerRotationRef.current -= outerSpeed;

      drawWheel();
      updateCurrentValueDisplay(); // Update the digital box

      animId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animId);
  }, [segments, logoImage, isSpinning]); // Re-bind if segments/logo/isSpinning changes

  // Spin Logic
  useEffect(() => {
    if (isSpinning && !spinningRef.current && winnerSegmentIndex !== null && segments.length > 0) {
      startSpin(winnerSegmentIndex);
    }
  }, [isSpinning, winnerSegmentIndex, segments]);

  const startSpin = (targetIndex: number) => {
    if (segments.length === 0) return;

    spinningRef.current = true;
    
    const arcSize = (2 * Math.PI) / segments.length;
    const startRotation = rotationRef.current;
    
    // We want the winner segment to end up at Angle 0 (Right side, 3 o'clock)
    // Current Absolute Angle of the Winner Segment = (startRotation + index * arc + arc/2)
    // We need to find how much we need to ADD to this to reach the next multiple of 2PI (which is angle 0)
    
    const currentAbsoluteAngle = startRotation + (targetIndex * arcSize) + (arcSize / 2);
    
    // Calculate the remainder relative to a full circle
    // We use modulo to find where we are in the current circle
    const remainder = currentAbsoluteAngle % (2 * Math.PI);
    
    // Distance needed to reach the end of the circle (Angle 0/2PI) from current position
    // If remainder is 0.5PI, we need 1.5PI to reach 0.
    let distToZero = (2 * Math.PI) - remainder;
    
    // Ensure positive rotation
    if (distToZero < 0) distToZero += 2 * Math.PI;

    // Add extra full spins for drama (e.g., 10-15 spins)
    // const extraSpins = (10 + Math.random() * 5) * 2 * Math.PI; 
    // const extraSpins = (4 + Math.random() * 2) * 2 * Math.PI; 
    
    // Total rotation to add to the CURRENT rotation
    // const totalRotationChange = extraSpins + distToZero;

    const baseSpins = segments.filter(s => !s.isBlacklisted).length === 1
      ? 4
      : 6;

    // Góc chính xác để segment target nằm ở kim (3h)
    const targetRotation =
      baseSpins * 2 * Math.PI +
      (2 * Math.PI - ((targetIndex + 0.5) * arcSize));

    // Tổng rotation cần đạt
    const totalRotationChange =
      targetRotation -
      (startRotation % (2 * Math.PI));
    
    const startTime = performance.now();
    // const duration = 5000; // 8 seconds for suspense
    const activeCount = segments.filter(s => !s.isBlacklisted).length;
    
    const duration = activeCount === 1 ? 3000 : 5000;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing: Cubic Ease Out -> starts fast, slows down
      // const ease = 1 - Math.pow(1 - progress, 3);
      const ease = 1 - Math.pow(1 - progress, 4); 
      
      // Interpolate from Start Rotation
      const currentRot = startRotation + (totalRotationChange * ease);
      rotationRef.current = currentRot;
      
      const totalSegmentsPassed = Math.floor(currentRot / arcSize);
      if (totalSegmentsPassed > lastClickRef.current) {
         audioManager.playTick();
         lastClickRef.current = totalSegmentsPassed;
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // FINISHED
        // Snap to exact target value to avoid sub-pixel misalignment
        rotationRef.current = startRotation + totalRotationChange;
        
        spinningRef.current = false;
        lastClickRef.current = 0;
        
        // CRITICAL: Determine EXACTLY what segment we stopped on
        // const finalSegment = getCurrentSegment();


        // if (finalSegment) {
        //     onSpinFinish(finalSegment.value);
        // } else {
        //     // Fallback (should not happen if segments exist)
        //     onSpinFinish(0); 
        // }
        onSpinFinish(segments[targetIndex].value);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  return (
    <div className="relative flex justify-center items-center w-full h-full">
      {/* Pointer - Pointing Left into the wheel */}
      <div className="absolute right-[-2%] top-1/2 transform -translate-y-1/2 z-20 filter drop-shadow-lg w-[10%] max-w-[60px]">
        <svg viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
           <path d="M0 20L60 0V40L0 20Z" fill="url(#paint0_linear)"/>
           <path d="M5 20L55 5V35L5 20Z" fill="#F37021"/> 
           <defs>
             <linearGradient id="paint0_linear" x1="0" y1="0" x2="60" y2="0" gradientUnits="userSpaceOnUse">
               <stop stopColor="#FFD700"/>
               <stop offset="1" stopColor="#B45309"/>
             </linearGradient>
           </defs>
        </svg>
      </div>

      {/* --- Digital Number Display Box --- */}
      {/* Positioned absolutely near the pointer */}
      <div className="absolute top-1/2 right-[-25%] z-30 transform -translate-y-1/2 animate-fade-in-left hidden md:block">
        <div className="relative group scale-75 lg:scale-100">
          {/* Glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-mor-gold to-mor-orange rounded-lg blur opacity-50 group-hover:opacity-100 transition duration-200"></div>
          
          {/* Main Box */}
          <div className="relative bg-black/80 backdrop-blur-md rounded-lg border-2 border-mor-gold p-1 w-28 shadow-2xl">
            {/* Screen bevel */}
            <div className="bg-[#05101c] rounded border border-white/10 p-2 flex flex-col items-center justify-center h-20 relative overflow-hidden">
               {/* Scanlines effect */}
               <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%] pointer-events-none"></div>
               
               <div className="text-[10px] text-mor-gold/80 font-bold uppercase tracking-widest mb-1 z-20">Hiện tại</div>
               
               {/* THE NUMBER */}
               <div 
                 ref={currentNumberRef}
                 className="text-4xl font-black text-white z-20 font-mono tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]"
               >
                 --
               </div>
            </div>
            
            {/* Metallic bolts decoration */}
            <div className="absolute top-1 left-1 w-1 h-1 bg-gray-400 rounded-full"></div>
            <div className="absolute top-1 right-1 w-1 h-1 bg-gray-400 rounded-full"></div>
            <div className="absolute bottom-1 left-1 w-1 h-1 bg-gray-400 rounded-full"></div>
            <div className="absolute bottom-1 right-1 w-1 h-1 bg-gray-400 rounded-full"></div>
          </div>
          
          {/* Connection line to pointer */}
          <div className="absolute top-1/2 left-0 w-8 h-1 bg-mor-gold transform -translate-x-full -translate-y-1/2 shadow-[0_0_10px_rgba(255,215,0,0.5)]"></div>
        </div>
      </div>
      
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={800} 
        className="w-full h-full object-contain"
      />
    </div>
  );
};

export default Wheel;