import React from 'react'
import './App.css'
import CardGrid from './components/CardGrid'

function App() {
  return (
    <div className="app-root">
      <header className="app-header">
        <h1>Potchi Cards</h1>
        <p className="subtitle">Modular card layout: left vertical card, two right stacked cards</p>
      </header>
      <main>
        <CardGrid />
      </main>
    </div>
  )
}

export default App
