import React from 'react'
import Card from './Card'
import './cardgrid.css'

export default function CardGrid() {
  return (
    <div className="cards-wrapper">
      <div className="cards-container">
        <Card className="left-card" title="Plant Overview">
          <p>Soil moisture, Temp & Light overview. This card spans vertically.</p>
        </Card>
        <div className="right-column">
          <Card className="top-right" title="Recent Alerts">
            <p>No alerts, all systems normal.</p>
          </Card>
          <Card className="bottom-right" title="History/Actions">
            <p>Latest logs and actions for the device.</p>
          </Card>
        </div>
      </div>
    </div>
  )
}
