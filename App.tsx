import React from 'react';
import { Tab, Tabs } from 'react-bootstrap';

import SlotGame from './SlotGame';
import JiliGame from './JiliGame';
import PGSlotsGame from './PGSlotsGame';
import PGGame from './PGGame';

const App = () => {
  return (
    <div className="App">
      <h1>Game Selection</h1>
      <Tabs defaultActiveKey="slot" id="game-tabs">
        <Tab eventKey="slot" title="Slot Game">
          <SlotGame />
        </Tab>
        <Tab eventKey="jili" title="Jili Game">
          <JiliGame />
        </Tab>
        <Tab eventKey="pgslots" title="PG Slots Game">
          <PGSlotsGame />
        </Tab>
        <Tab eventKey="pg" title="PG Game">
          <PGGame />
        </Tab>
      </Tabs>
    </div>
  );
};

export default App;