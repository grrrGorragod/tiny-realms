import Game from './game/Game';
import "./App.css";

function App() {
  return (
    <main className="app">
      <header className="heaer">
        <p className="logo"> TINY REALMS</p>
        <span className="status">EARLY ACCESS</span>
      </header>

      <section className="intro">
        <p className="eyebrow">CHAPTER I THE BEGINNING</p>
        <h1>The Forgotten Sanctum</h1>
        <p className="description">
          Something ancient stirs beneath the ruins.
        </p>
      </section>

      <section className="game-panel">
        <Game />
      </section>

      <footer className="footer">
        MOVE THROUGH THE DARKNESS SEEK THE LIGHT
      </footer>
    </main>
  );
}

export default App;