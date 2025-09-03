import React, { useState } from 'react';
import axios from 'axios';

const AuthForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const apiUrl = import.meta.env.VITE_BACKEND_URL+"/api/users/register" || "http://localhost:4000/api/users/register";

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setMessage(''); 

    try {
      const response = await axios.post(apiUrl, {
        username,
        password,
      });
      setMessage(response.data.message);
    } catch (error) {
      if (error.response && error.response.data) {
        setMessage(error.response.data.message);
      } else {
        setMessage('uhoh, ran into unexpected error');
      }
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>Register</h2>
        <div className="form-group">
          <label>Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Register</button>
        {message && <p className="message">{message}</p>}
      </form>
    </div>
  );
};

export default AuthForm;