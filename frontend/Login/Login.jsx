import React, { useState } from "react";
import axios from "axios";

export default function Login({ onLogin }) {
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Clear previous errors
    
    try {
      // Call your FastAPI backend
      const res = await axios.post("http://127.0.0.1:8000/login", credentials);
      
      // If successful, pass the user object (id, name, role, etc.) up to App.jsx
      onLogin(res.data);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        setError("Invalid username or password");
      } else {
        setError("Something went wrong. Is the server running?");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-extrabold text-center text-slate-800 mb-6">
          🏥 Hospital Login
        </h2>
        
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-center text-sm font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              required
              className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition shadow-md"
          >
            Sign In
          </button>
        </form>

        <div className="mt-6 text-sm text-gray-500 text-center">
          <p>Test Accounts:</p>
          <p>Nurse: <b>nurse_joy</b> / password123</p>
          <p>Doctor: <b>doc_cardio</b> / password123</p>
        </div>
      </div>
    </div>
  );
}