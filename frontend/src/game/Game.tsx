import { useEffect, useRef } from "react"
import Phaser from "phaser";
import { DungeonScene } from "./DungeonScene";

function Game() {
    const gameContainer = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!gameContainer.current) return;

        const game = new Phaser.Game({
            type: Phaser.AUTO,
            width: 800,
            height: 500,
            parent: gameContainer.current,
            backgroundColor: "#11131b",
            scene: [DungeonScene],
        });

        return () => {
            game.destroy(true);
        };
    }, []);
    
    return <div ref={gameContainer} className="game-container" />;
}
export default Game;