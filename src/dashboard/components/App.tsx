import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import RequestLogs from "./RequestLogs";
import MockConfigs from "./MockConfigs";
import Settings from "./Settings";

const App: React.FC = () => {
  return (
    <Router>
      <div>
        <header className="header">
          <div className="container header-content">
            <div className="logo">TS Mock Proxy</div>
            <nav className="nav">
              <Link to="/" className="nav-link">
                Logs
              </Link>
              <Link to="/mocks" className="nav-link">
                Mocks
              </Link>
              <Link to="/settings" className="nav-link">
                Configurações
              </Link>
            </nav>
          </div>
        </header>

        <main className="container mt-3">
          <Routes>
            <Route path="/" element={<RequestLogs />} />
            <Route path="/mocks" element={<MockConfigs />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>

        <footer className="container text-center p-3 text-muted">
          <p>TS Mock Proxy - Desenvolvido com TypeScript</p>
        </footer>
      </div>
    </Router>
  );
};

export default App;
