
import { useState } from 'react';
import './App.css';
import Form from './form';
import Records from './records';

function App() {
  const [showRecords, setShowRecords] = useState(false);

  return showRecords ? <Records /> : <Form onSubmit={() => setShowRecords(true)} />;
}

export default App;
