import React, { useState } from 'react';

const PGSlotsGame: React.FC = () => {
    const [balance, setBalance] = useState(100); // Starting balance
    const [betAmount, setBetAmount] = useState(10);
    const [slots, setSlots] = useState(["🍒", "🍋", "🍊"]);

    const spinSlots = () => {
        if (balance >= betAmount) {
            const newSlots = slots.map(() => slots[Math.floor(Math.random() * slots.length)]);
            setSlots(newSlots);
            setBalance(balance - betAmount); // Deduct bet amount from balance
        } else {
            alert('Insufficient balance to place the bet.');
        }
    };

    const handleBetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setBetAmount(Number(e.target.value));
    };

    const handleDeposit = (amount: number) => {
        setBalance(balance + amount);
    };

    return (
        <div>
            <h1>PG Slots Game</h1>
            <div>
                <h2>Balance: ${balance}</h2>
                <button onClick={() => handleDeposit(10)}>Deposit $10</button>
                <input type='number' value={betAmount} onChange={handleBetChange} min='1' />
                <button onClick={spinSlots}>Spin</button>
            </div>
            <div>
                <h3>Slots:</h3>
                <div style={{ display: 'flex', justifyContent: 'center', fontSize: '2rem' }}>
                    {slots.map((slot, index) => (
                        <div key={index} style={{ margin: '0 10px' }}>{slot}</div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PGSlotsGame;