import React, { useState } from 'react';
import './JiliGame.css';

interface JiliGameState {
    balance: number;
    score: number;
    level: number;
    gameActive: boolean;
}

const JiliGame: React.FC = () => {
    const [state, setState] = useState<JiliGameState>({ balance: 5000, score: 0, level: 1, gameActive: false });
    const [enemies, setEnemies] = useState<Array<{id: number, x: number, y: number}>>([]);

    const startGame = () => {
        setState(prev => ({ ...prev, gameActive: true, score: 0 }));
        setEnemies(Array.from({length: state.level + 2}, (_, i) => ({id: i, x: Math.random() * 80, y: Math.random() * 60})));  
    };

    const shootEnemy = (enemyId: number) => {
        if (!state.gameActive) return;
        const newBalance = state.balance + 50;
        const newScore = state.score + 100;
        setState(prev => ({...prev, balance: newBalance, score: newScore}));
        setEnemies(enemies.filter(e => e.id !== enemyId));

        if (enemies.length === 1) {
            setState(prev => ({...prev, level: prev.level + 1}));
            startGame();
        }
    };

    return (
        <div className='jili-container'>
            <div className='jili-stats'>
                <h2>Jili Shooter</h2>
                <p>Balance: ${state.balance}</p>
                <p>Score: {state.score}</p>
                <p>Level: {state.level}</p>
            </div>
            <div className='jili-game-area'>
                {enemies.map(enemy => (
                    <button key={enemy.id} className='jili-enemy' style={{left: `${enemy.x}%`, top: `${enemy.y}%`}} onClick={() => shootEnemy(enemy.id)}>
                        👾
                    </button>
                ))}
            </div>
            <button className='jili-btn' onClick={startGame} disabled={state.gameActive}>
                {state.gameActive ? 'Game Running' : 'Start Game'}
            </button>
        </div>
    );
};

export default JiliGame;