🟢 HULK SMASH RUNNER - Telegram Mini App endless runner game where you control the Hulk to smash boxes!

🎮 Game Overview
Action-packed endless runner featuring the Hulk. Jump over and smash boxes while avoiding collisions. Features progressive difficulty, particle effects, and Telegram integration.

✨ Key Features
Endless Runner: Classic side-scrolling with increasing difficulty

Box Smashing: 3 box types (Small: 1pt, Medium: 2pts, Large: 3pts)

Progressive Levels: Auto-level up every 15 seconds

Pixel Art Design: 8-bit Hulk with animations

Telegram Integration: Haptic feedback, user recognition, theme matching

High Score Tracking: Persistent local storage

🛠️ Tech Stack
React 18.3.1 + TypeScript + Vite

Tailwind CSS + HTML5 Canvas

@twa-dev/sdk for Telegram WebApp

🚀 Quick Start
bash
npm install
npm run dev        # Development
npm run build      # Production
🎮 Controls
Space/Tap: Jump

Land on boxes: Smash for points

Avoid: Head-on collisions

📁 Structure
text
src/
├── components/GameCanvas.tsx    # Main game logic
├── hooks/useTelegram.ts        # Telegram integration
├── App.tsx                     # Root component
└── main.tsx                    # Entry point
⚙️ Game Mechanics
Physics: Gravity (0.9), Jump (-16), Ground (80px)

Difficulty: Speed increases with level/score

Particles: Colorful crush effects (10-20 per box)

Collision: Pixel-perfect detection

Ready to SMASH? 💥
