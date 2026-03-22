import React, { useState, useEffect } from 'react';
import './SlotGame.css'; // import CSS for animations

const SlotGame: React.FC = () => {
    const [reels, setReels] = useState<string[]>(['🍒', '🍋', '🍊']);
    const [spinning, setSpinning] = useState(false);
    const [result, setResult] = useState<string[]>([]);

    const symbols = ['🍒', '🍋', '🍊', '🍉', '⭐', '💎'];

    const spinReels = () => {
        setSpinning(true);
        const newResult = Array.from({ length: 3 }, () =>
            symbols[Math.floor(Math.random() * symbols.length)]
        );
        setResult(newResult);
    };

    useEffect(() => {
        if (spinning) {
            const timer = setTimeout(() => {
                setReels(result);
                setSpinning(false);
            }, 2000); // Simulate a spin duration
            return () => clearTimeout(timer);
        }
    }, [spinning, result]);

    return (
        <div className="slot-game">
            <div className={`reels ${spinning ? 'spinning' : ''}`}>  
                {reels.map((reel, index) => (
                    <div key={index} className="reel">
                        {reel}
                    </div>
                ))}
            </div>
            <button onClick={spinReels} disabled={spinning}>
                {spinning ? 'Spinning...' : 'Spin'}
            </button>
        </div>
    );
};

export default SlotGame;