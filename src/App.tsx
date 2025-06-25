import GameCanvas from './components/GameCanvas';
import { useTelegram } from './hooks/useTelegram';
import { useEffect } from 'react';

function App() {
  const { tg } = useTelegram();

  useEffect(() => {
    if (tg) {
      // Configure Telegram Mini App
      tg.setHeaderColor('#4ade80');
      tg.setBackgroundColor('#dbeafe');
    }
  }, [tg]);

  return (
    <div className="w-full h-screen overflow-hidden bg-gradient-to-b from-blue-200 to-blue-300">
      <GameCanvas />
    </div>
  );
}

export default App;