import React, { useState } from 'react';
import SlotGame from './SlotGame';
import PGGame from './PGGame';

const GameHub = () => {
    const [selectedGame, setSelectedGame] = useState('slot');

    const handleGameChange = (event) => {
        setSelectedGame(event.target.value);
    };

    return (
        <div>
            <h1>Game Hub</h1>
            <select onChange={handleGameChange} value={selectedGame}>
                <option value="slot">Slot Game</option>
                <option value="pg">PG Game</option>
            </select>
            {selectedGame === 'slot' ? <SlotGame /> : <PGGame />}
        </div>
    );
};

export default GameHub;