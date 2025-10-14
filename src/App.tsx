import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SolanaWalletProvider } from '@/chains/solana/SolanaWalletProvider';
import HomePage from '@/pages/HomePage';
import RoomPage from '@/pages/RoomPage';
import CreateRoomPage from '@/pages/CreateRoomPage';

function App() {
  return (
    <SolanaWalletProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/create" element={<CreateRoomPage />} />
            <Route path="/room/:roomId" element={<RoomPage />} />
          </Routes>
        </div>
      </Router>
    </SolanaWalletProvider>
  );
}

export default App;
