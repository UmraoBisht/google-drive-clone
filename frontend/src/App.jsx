import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import axios from 'axios';
import { AuthProvider, useAuth } from './components/AuthContext';
import Home from './components/Home';
import Login from './components/Login';
import Signup from './components/Signup';

// Set the backend URL (replace with your deployed URL later)
axios.defaults.baseURL = 'http://localhost:5000';

function PrivateRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Home />
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;