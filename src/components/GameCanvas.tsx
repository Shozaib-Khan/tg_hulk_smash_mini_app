import { useRef, useEffect, useState, useCallback } from 'react';
import { useTelegram } from '../hooks/useTelegram';

interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Hulk extends GameObject {
  velocityY: number;
  isJumping: boolean;
  animationFrame: number;
  isRunning: boolean;
}

interface Box extends GameObject {
  isCrushed: boolean;
  crushAnimation: number;
  type: 'small' | 'medium' | 'large';
}

interface Coin extends GameObject {
  zigzagOffset: number;
  zigzagSpeed: number;
  baseY: number;
  collected: boolean;
  collectAnimation: number;
}

interface Particle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

type GameState = 'waiting' | 'playing' | 'gameOver';

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [gameState, setGameState] = useState<GameState>('waiting');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const { hapticFeedback, user, isInTelegram } = useTelegram();

  // Game objects
  const hulkRef = useRef<Hulk>({
    x: 100,
    y: 0,
    width: 50,
    height: 50,
    velocityY: 0,
    isJumping: false,
    animationFrame: 0,
    isRunning: false
  });

  const boxesRef = useRef<Box[]>([]);
  const coinsRef = useRef<Coin[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const gameSpeedRef = useRef(4);
  const groundYRef = useRef(0);
  const lastBoxSpawnRef = useRef(0);
  const lastCoinSpawnRef = useRef(0);
  const difficultyTimerRef = useRef(0);
  const coinImageRef = useRef<HTMLImageElement | null>(null);

  const GRAVITY = 0.9;
  const JUMP_FORCE = -16;
  const GROUND_HEIGHT = 80;

  // Load coin image
  useEffect(() => {
    const img = new Image();
    img.src = '/Group 1171275784.png';
    img.onload = () => {
      coinImageRef.current = img;
    };
  }, []);

  // Initialize canvas dimensions
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
      
      groundYRef.current = rect.height - GROUND_HEIGHT;
      hulkRef.current.y = groundYRef.current - hulkRef.current.height;
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Enhanced Hulk drawing with better pixel art
  const drawHulk = (ctx: CanvasRenderingContext2D, hulk: Hulk) => {
    const pixelSize = 3;
    const animOffset = Math.floor(hulk.animationFrame / 8) % 2;
    
    // More detailed Hulk pattern
    const hulkPattern = [
      '    ████████████    ',
      '  ██████████████████  ',
      ' ████████████████████ ',
      '██████  ████  ██████',
      '██████████████████████',
      '██████████████████████',
      '  ████████████████  ',
      '    ████████████    ',
      '  ████████████████  ',
      '████████████████████',
      '████████████████████',
      '████████████████████',
      '██████████████████████',
      '██    ████████    ██',
      '██    ████████    ██',
      '      ████████      ',
      '      ████████      '
    ];

    // Body color (green)
    ctx.fillStyle = '#22c55e';
    
    for (let row = 0; row < hulkPattern.length; row++) {
      for (let col = 0; col < hulkPattern[row].length; col++) {
        if (hulkPattern[row][col] === '█') {
          const offsetX = row > 12 ? (animOffset * 2 - 1) : 0; // Leg animation
          ctx.fillRect(
            hulk.x + col * pixelSize + offsetX,
            hulk.y + row * pixelSize,
            pixelSize,
            pixelSize
          );
        }
      }
    }

    // Muscle definition (darker green)
    ctx.fillStyle = '#16a34a';
    // Chest muscles
    ctx.fillRect(hulk.x + 18, hulk.y + 24, 12, 6);
    ctx.fillRect(hulk.x + 36, hulk.y + 24, 12, 6);
    // Abs
    ctx.fillRect(hulk.x + 21, hulk.y + 33, 6, 9);
    ctx.fillRect(hulk.x + 33, hulk.y + 33, 6, 9);
    ctx.fillRect(hulk.x + 27, hulk.y + 36, 6, 6);

    // Eyes (angry red)
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(hulk.x + 15, hulk.y + 12, 6, 6);
    ctx.fillRect(hulk.x + 39, hulk.y + 12, 6, 6);

    // Eye glow effect
    ctx.fillStyle = '#fca5a5';
    ctx.fillRect(hulk.x + 16, hulk.y + 13, 4, 4);
    ctx.fillRect(hulk.x + 40, hulk.y + 13, 4, 4);

    // Mouth (angry)
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(hulk.x + 24, hulk.y + 21, 12, 3);

    // Hair (dark)
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(hulk.x + 12, hulk.y + 3, 36, 9);

    // Purple pants
    ctx.fillStyle = '#7c3aed';
    ctx.fillRect(hulk.x + 15, hulk.y + 42, 30, 15);
    
    // Pants details
    ctx.fillStyle = '#5b21b6';
    ctx.fillRect(hulk.x + 15, hulk.y + 45, 30, 3);

    hulk.animationFrame++;
  };

  // Enhanced box drawing with different types
  const drawBox = (ctx: CanvasRenderingContext2D, box: Box) => {
    const colors = {
      small: { main: '#8b5cf6', dark: '#6d28d9', light: '#a78bfa' },
      medium: { main: '#ef4444', dark: '#dc2626', light: '#f87171' },
      large: { main: '#f59e0b', dark: '#d97706', light: '#fbbf24' }
    };

    const color = colors[box.type];

    if (box.isCrushed) {
      const squishFactor = Math.max(0.1, 1 - box.crushAnimation / 25);
      const boxHeight = box.height * squishFactor;
      const boxY = box.y + (box.height - boxHeight);
      
      ctx.fillStyle = `rgba(${parseInt(color.main.slice(1, 3), 16)}, ${parseInt(color.main.slice(3, 5), 16)}, ${parseInt(color.main.slice(5, 7), 16)}, ${1 - box.crushAnimation / 25})`;
      ctx.fillRect(box.x, boxY, box.width, boxHeight);
    } else {
      // Main box
      ctx.fillStyle = color.main;
      ctx.fillRect(box.x, box.y, box.width, box.height);
      
      // Highlight
      ctx.fillStyle = color.light;
      ctx.fillRect(box.x + 2, box.y + 2, box.width - 4, 4);
      ctx.fillRect(box.x + 2, box.y + 2, 4, box.height - 4);
      
      // Shadow
      ctx.fillStyle = color.dark;
      ctx.fillRect(box.x + box.width - 4, box.y + 4, 4, box.height - 4);
      ctx.fillRect(box.x + 4, box.y + box.height - 4, box.width - 4, 4);
    }
  };

  // Draw coin with zigzag movement and darker colors
  const drawCoin = (ctx: CanvasRenderingContext2D, coin: Coin) => {
    if (coin.collected) {
      // Collection animation - scale up and fade out
      const scale = 1 + (coin.collectAnimation / 20) * 0.5;
      const alpha = Math.max(0, 1 - coin.collectAnimation / 20);
      
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(coin.x + coin.width / 2, coin.y + coin.height / 2);
      ctx.scale(scale, scale);
      
      if (coinImageRef.current) {
        // Apply darker filter to the image
        ctx.filter = 'brightness(0.7) contrast(1.2) saturate(1.3)';
        ctx.drawImage(coinImageRef.current, -coin.width / 2, -coin.height / 2, coin.width, coin.height);
        ctx.filter = 'none';
      } else {
        // Fallback coin drawing with darker colors
        ctx.fillStyle = '#d97706'; // Darker gold
        ctx.beginPath();
        ctx.arc(0, 0, coin.width / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
      return;
    }

    // Darker glow effect
    ctx.save();
    ctx.shadowColor = '#d97706'; // Darker gold glow
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Rotation animation
    const rotation = (Date.now() * 0.005) % (Math.PI * 2);
    ctx.translate(coin.x + coin.width / 2, coin.y + coin.height / 2);
    ctx.rotate(rotation);

    if (coinImageRef.current) {
      // Apply darker filter to make coin stand out from background
      ctx.filter = 'brightness(0.7) contrast(1.2) saturate(1.3)';
      ctx.drawImage(coinImageRef.current, -coin.width / 2, -coin.height / 2, coin.width, coin.height);
      ctx.filter = 'none';
    } else {
      // Fallback coin drawing with darker gradient
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, coin.width / 2);
      gradient.addColorStop(0, '#d97706'); // Darker gold
      gradient.addColorStop(0.7, '#b45309'); // Even darker
      gradient.addColorStop(1, '#92400e'); // Darkest
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, coin.width / 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Inner highlight (also darker)
      ctx.fillStyle = '#fbbf24'; // Darker highlight
      ctx.beginPath();
      ctx.arc(-coin.width / 6, -coin.height / 6, coin.width / 6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  // Enhanced particles with different sizes and colors
  const drawParticles = (ctx: CanvasRenderingContext2D) => {
    particlesRef.current.forEach(particle => {
      const alpha = particle.life / particle.maxLife;
      ctx.fillStyle = particle.color.replace('1)', `${alpha})`);
      ctx.fillRect(particle.x - particle.size/2, particle.y - particle.size/2, particle.size, particle.size);
      
      // Add sparkle effect
      if (particle.life > particle.maxLife * 0.7) {
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
        ctx.fillRect(particle.x - 1, particle.y - 1, 2, 2);
      }
    });
  };

  // Enhanced particle creation
  const createCrushParticles = (x: number, y: number, boxType: Box['type']) => {
    const colors = [
      'rgba(255, 215, 0, 1)', // Gold
      'rgba(255, 255, 255, 1)', // White
      'rgba(255, 193, 7, 1)', // Yellow
      'rgba(255, 165, 0, 1)', // Orange
      'rgba(138, 43, 226, 1)', // Purple
      'rgba(255, 20, 147, 1)' // Pink
    ];

    const particleCount = boxType === 'large' ? 20 : boxType === 'medium' ? 15 : 10;

    for (let i = 0; i < particleCount; i++) {
      particlesRef.current.push({
        x: x + Math.random() * 40,
        y: y + Math.random() * 40,
        velocityX: (Math.random() - 0.5) * 12,
        velocityY: (Math.random() - 0.5) * 12 - 3,
        life: 40,
        maxLife: 40,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 4 + 2
      });
    }
  };

  // Create coin collection particles
  const createCoinParticles = (x: number, y: number) => {
    const colors = [
      'rgba(217, 119, 6, 1)', // Darker gold
      'rgba(180, 83, 9, 1)', // Darker orange gold
      'rgba(255, 255, 255, 1)', // White
      'rgba(251, 191, 36, 1)', // Medium gold
    ];

    for (let i = 0; i < 15; i++) {
      particlesRef.current.push({
        x: x + Math.random() * 30,
        y: y + Math.random() * 30,
        velocityX: (Math.random() - 0.5) * 8,
        velocityY: (Math.random() - 0.5) * 8 - 2,
        life: 30,
        maxLife: 30,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 3 + 1
      });
    }
  };

  // Check collision
  const checkCollision = (obj1: GameObject, obj2: GameObject): boolean => {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
  };

  // Enhanced top collision detection
  const checkTopCollision = (hulk: Hulk, box: Box): boolean => {
    const hulkBottom = hulk.y + hulk.height;
    const boxTop = box.y;
    const horizontalOverlap = hulk.x < box.x + box.width && hulk.x + hulk.width > box.x;
    
    return horizontalOverlap && hulkBottom >= boxTop && hulkBottom <= boxTop + 15 && hulk.velocityY >= 0;
  };

  // Check if coin would overlap with existing boxes
  const checkCoinBoxOverlap = (coinX: number, coinY: number, coinSize: number): boolean => {
    const coinBounds = {
      x: coinX,
      y: coinY,
      width: coinSize,
      height: coinSize
    };

    return boxesRef.current.some(box => {
      // Add buffer zone around boxes to prevent coins from being too close
      const buffer = 50;
      const expandedBox = {
        x: box.x - buffer,
        y: box.y - buffer,
        width: box.width + buffer * 2,
        height: box.height + buffer * 2
      };
      
      return checkCollision(coinBounds, expandedBox);
    });
  };

  // Jump function with haptic feedback
  const jump = useCallback(() => {
    if (gameState === 'waiting') {
      setGameState('playing');
      hulkRef.current.velocityY = JUMP_FORCE;
      hulkRef.current.isJumping = true;
      hulkRef.current.isRunning = true;
      hapticFeedback.light();
      difficultyTimerRef.current = Date.now();
    } else if (gameState === 'playing' && !hulkRef.current.isJumping) {
      hulkRef.current.velocityY = JUMP_FORCE;
      hulkRef.current.isJumping = true;
      hapticFeedback.light();
    } else if (gameState === 'gameOver') {
      // Restart game
      setGameState('waiting');
      setScore(0);
      setLevel(1);
      hulkRef.current = {
        x: 100,
        y: groundYRef.current - 50,
        width: 50,
        height: 50,
        velocityY: 0,
        isJumping: false,
        animationFrame: 0,
        isRunning: false
      };
      boxesRef.current = [];
      coinsRef.current = [];
      particlesRef.current = [];
      gameSpeedRef.current = 4;
      lastBoxSpawnRef.current = 0;
      lastCoinSpawnRef.current = 0;
      difficultyTimerRef.current = 0;
      hapticFeedback.medium();
    }
  }, [gameState, hapticFeedback]);

  // Enhanced game loop with progressive difficulty and coins
  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Dynamic background based on level
    const bgColors = [
      'from-blue-200 to-blue-300',
      'from-purple-200 to-purple-300',
      'from-red-200 to-red-300',
      'from-orange-200 to-orange-300',
      'from-green-200 to-green-300'
    ];

    // Draw ground with level-based color
    const groundColors = ['#8b5cf6', '#ef4444', '#f59e0b', '#10b981', '#6366f1'];
    ctx.fillStyle = groundColors[(level - 1) % groundColors.length];
    ctx.fillRect(0, groundYRef.current, rect.width, GROUND_HEIGHT);

    // Enhanced clouds with parallax
    ctx.fillStyle = '#e5e7eb';
    for (let i = 0; i < 4; i++) {
      const speed = 0.01 + i * 0.005;
      const cloudX = (Date.now() * speed + i * 150) % (rect.width + 100) - 50;
      const cloudY = 30 + i * 25 + Math.sin(Date.now() * 0.001 + i) * 10;
      
      ctx.beginPath();
      ctx.arc(cloudX, cloudY, 15 + i * 3, 0, Math.PI * 2);
      ctx.arc(cloudX + 20, cloudY, 20 + i * 3, 0, Math.PI * 2);
      ctx.arc(cloudX + 40, cloudY, 15 + i * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    if (gameState === 'waiting') {
      // Enhanced start screen
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('🟢 HULK SMASH RUNNER', rect.width / 2, rect.height / 2 - 80);
      
      if (user) {
        ctx.font = '16px monospace';
        ctx.fillText(`Welcome, ${user.first_name}!`, rect.width / 2, rect.height / 2 - 50);
      }
      
      ctx.font = '18px monospace';
      ctx.fillText('Press SPACE or TAP to jump!', rect.width / 2, rect.height / 2 - 20);
      ctx.fillText('Land on boxes to SMASH them! 💥', rect.width / 2, rect.height / 2 + 10);
      ctx.fillText('Collect coins for bonus points! 🪙', rect.width / 2, rect.height / 2 + 40);
      ctx.fillText('Avoid head-on collisions! ⚠️', rect.width / 2, rect.height / 2 + 70);
      
      drawHulk(ctx, hulkRef.current);
      return;
    }

    if (gameState === 'playing') {
      const hulk = hulkRef.current;
      
      // Progressive difficulty system
      const currentTime = Date.now();
      const gameTime = (currentTime - difficultyTimerRef.current) / 1000;
      const newLevel = Math.floor(gameTime / 15) + 1; // Level up every 15 seconds
      
      if (newLevel > level) {
        setLevel(newLevel);
        hapticFeedback.success();
      }
      
      // Update game speed based on level and score
      gameSpeedRef.current = Math.min(12, 4 + (level - 1) * 1.5 + score * 0.05);
      
      // Update Hulk physics
      hulk.velocityY += GRAVITY;
      hulk.y += hulk.velocityY;
      
      // Ground collision
      if (hulk.y >= groundYRef.current - hulk.height) {
        hulk.y = groundYRef.current - hulk.height;
        hulk.velocityY = 0;
        hulk.isJumping = false;
      }

      // Enhanced box spawning with difficulty scaling
      const spawnDelay = Math.max(800, 1800 - level * 100 - score * 10);
      const shouldSpawnDouble = level > 2 && Math.random() < 0.3;
      
      if (currentTime - lastBoxSpawnRef.current > spawnDelay) {
        const boxTypes: Box['type'][] = ['small', 'medium'];
        if (level > 3) boxTypes.push('large');
        
        const boxType = boxTypes[Math.floor(Math.random() * boxTypes.length)];
        const boxSizes = { small: 25, medium: 35, large: 45 };
        const boxSize = boxSizes[boxType];
        
        boxesRef.current.push({
          x: rect.width,
          y: groundYRef.current - boxSize,
          width: boxSize,
          height: boxSize,
          isCrushed: false,
          crushAnimation: 0,
          type: boxType
        });
        
        // Spawn double boxes at higher levels
        if (shouldSpawnDouble) {
          boxesRef.current.push({
            x: rect.width + 60,
            y: groundYRef.current - boxSize,
            width: boxSize,
            height: boxSize,
            isCrushed: false,
            crushAnimation: 0,
            type: boxType
          });
        }
        
        lastBoxSpawnRef.current = currentTime;
      }

      // Coin spawning at random intervals within jumping range and avoiding box overlap
      const coinSpawnDelay = Math.max(3000, 5000 - level * 200); // 3-5 seconds based on level
      if (currentTime - lastCoinSpawnRef.current > coinSpawnDelay && Math.random() < 0.7) {
        const coinSize = 30;
        // Calculate maximum jump height (Hulk can reach about 120-140 pixels high)
        const maxJumpHeight = Math.abs(JUMP_FORCE * JUMP_FORCE) / (2 * GRAVITY); // Physics calculation
        const reachableHeight = maxJumpHeight * 0.8; // 80% of max jump for safety
        
        // Position coin within reachable range (ground level to max jump height)
        const minY = groundYRef.current - reachableHeight;
        const maxY = groundYRef.current - 40; // At least 40px above ground
        
        // Try multiple positions to avoid box overlap
        let attempts = 0;
        let coinX, coinY;
        do {
          coinX = rect.width + Math.random() * 200; // Spawn further ahead
          coinY = Math.random() * (maxY - minY) + minY;
          attempts++;
        } while (checkCoinBoxOverlap(coinX, coinY, coinSize) && attempts < 10);
        
        // Only spawn coin if we found a good position
        if (attempts < 10) {
          coinsRef.current.push({
            x: coinX,
            y: coinY,
            width: coinSize,
            height: coinSize,
            zigzagOffset: 0,
            zigzagSpeed: 0.08 + Math.random() * 0.04, // Slower zigzag for better collection
            baseY: coinY,
            collected: false,
            collectAnimation: 0
          });
        }
        
        lastCoinSpawnRef.current = currentTime;
      }

      // Update boxes
      boxesRef.current = boxesRef.current.filter(box => {
        box.x -= gameSpeedRef.current;
        
        if (box.isCrushed) {
          box.crushAnimation++;
          return box.crushAnimation < 25;
        }
        
        // Check collisions
        if (checkTopCollision(hulk, box) && !box.isCrushed) {
          box.isCrushed = true;
          createCrushParticles(box.x, box.y, box.type);
          
          // Different points for different box types
          const points = { small: 1, medium: 2, large: 3 };
          setScore(prev => prev + points[box.type]);
          
          // Hulk bounces based on box type
          const bounceForce = { small: -8, medium: -10, large: -12 };
          hulk.velocityY = bounceForce[box.type];
          
          hapticFeedback.medium();
        } else if (checkCollision(hulk, box) && !box.isCrushed) {
          // Head-on collision - game over
          setGameState('gameOver');
          setHighScore(prev => Math.max(prev, score));
          hapticFeedback.error();
        }
        
        return box.x > -box.width;
      });

      // Update coins with zigzag movement
      coinsRef.current = coinsRef.current.filter(coin => {
        coin.x -= gameSpeedRef.current;
        
        if (coin.collected) {
          coin.collectAnimation++;
          return coin.collectAnimation < 20;
        }
        
        // Zigzag movement with smaller amplitude for better collection
        coin.zigzagOffset += coin.zigzagSpeed;
        coin.y = coin.baseY + Math.sin(coin.zigzagOffset) * 20; // Reduced to 20px amplitude
        
        // Check collision with Hulk - DON'T affect Hulk's physics
        if (checkCollision(hulk, coin) && !coin.collected) {
          coin.collected = true;
          createCoinParticles(coin.x, coin.y);
          setScore(prev => prev + 5); // 5 points for coin
          hapticFeedback.light();
          // REMOVED: No physics changes to Hulk when collecting coins
        }
        
        return coin.x > -coin.width;
      });

      // Update particles with enhanced physics
      particlesRef.current = particlesRef.current.filter(particle => {
        particle.x += particle.velocityX;
        particle.y += particle.velocityY;
        particle.velocityY += 0.4; // Gravity for particles
        particle.velocityX *= 0.98; // Air resistance
        particle.life--;
        return particle.life > 0;
      });
    }

    // Draw game objects
    drawHulk(ctx, hulkRef.current);
    boxesRef.current.forEach(box => drawBox(ctx, box));
    coinsRef.current.forEach(coin => drawCoin(ctx, coin));
    drawParticles(ctx);

    // Enhanced UI
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 20, 40);
    ctx.fillText(`Level: ${level}`, 20, 70);
    ctx.fillText(`Speed: ${gameSpeedRef.current.toFixed(1)}x`, 20, 100);
    
    const savedHighScore = localStorage.getItem('hulkRunnerHighScore') || '0';
    ctx.fillText(`Best: ${savedHighScore}`, 20, 130);

    if (gameState === 'gameOver') {
      // Enhanced game over screen
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(0, 0, rect.width, rect.height);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('💥 GAME OVER 💥', rect.width / 2, rect.height / 2 - 80);
      
      ctx.font = '24px monospace';
      ctx.fillText(`Final Score: ${score}`, rect.width / 2, rect.height / 2 - 40);
      ctx.fillText(`Level Reached: ${level}`, rect.width / 2, rect.height / 2 - 10);
      
      const currentHighScore = Math.max(score, parseInt(savedHighScore));
      ctx.fillText(`High Score: ${currentHighScore}`, rect.width / 2, rect.height / 2 + 20);
      
      ctx.font = '18px monospace';
      ctx.fillText('Press SPACE or TAP to play again', rect.width / 2, rect.height / 2 + 70);
      
      // Save high score
      if (score > parseInt(savedHighScore)) {
        localStorage.setItem('hulkRunnerHighScore', score.toString());
        ctx.fillStyle = '#fbbf24';
        ctx.fillText('🏆 NEW HIGH SCORE! 🏆', rect.width / 2, rect.height / 2 + 50);
      }
    }

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, score, level, user, hapticFeedback]);

  // Event listeners
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        jump();
      }
    };

    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      jump();
    };

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      jump();
    };

    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('touchstart', handleTouch, { passive: false });
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('touchstart', handleTouch);
      window.removeEventListener('click', handleClick);
    };
  }, [jump]);

  // Initialize game
  useEffect(() => {
    const cleanup = initCanvas();
    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cleanup?.();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [initCanvas, gameLoop]);

  return (
    <div className="relative w-full h-screen">
      <canvas
        ref={canvasRef}
        className="w-full h-screen block bg-gradient-to-b from-blue-200 to-blue-300"
        style={{ touchAction: 'none' }}
      />
      {isInTelegram && (
        <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
          Telegram Mini App
        </div>
      )}
    </div>
  );
}