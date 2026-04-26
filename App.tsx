import React from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GameUI } from './components/GameUI';

function App() {
  return (
    <div className="relative w-full h-screen bg-neutral-950 overflow-hidden">
      <GameCanvas />
      <GameUI />
    </div>
  );
}

export default App;
