import React from 'react';
import './PGGame.css'; // Import your styles here

interface GameCard {
    id: number;
    title: string;
    description: string;
    image: string;
}

const games: GameCard[] = [
    {
        id: 1,
        title: 'Game 1',
        description: 'Description of Game 1',
        image: 'url_to_game_1_image',
    },
    {
        id: 2,
        title: 'Game 2',
        description: 'Description of Game 2',
        image: 'url_to_game_2_image',
    },
    // Add more games as needed
];

const PGGame: React.FC = () => {
    return (
        <div className="pg-game-container">
            <h1>Play Games</h1>
            <div className="game-cards">
                {games.map(game => (
                    <div key={game.id} className="game-card">
                        <img src={game.image} alt={game.title} />
                        <h2>{game.title}</h2>
                        <p>{game.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PGGame;
