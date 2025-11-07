const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

// Mock database for demo purposes
const users = [
  { id: 1, username: 'admin', email: 'admin@example.com', role: 'admin', createdAt: new Date() }
];

// Get all users
router.get('/', (req, res) => {
  // Remove password from response
  const safeUsers = users.map(user => {
    const { password, ...safeUser } = user;
    return safeUser;
  });
  
  res.json({ success: true, users: safeUsers });
});

// Add new user
router.post('/', (req, res) => {
  const { username, email, password, role = 'user' } = req.body;
  
  // Check if user already exists
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ success: false, message: 'Username already exists' });
  }
  
  // Hash password
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(password, salt);
  
  // Create new user
  const newUser = {
    id: users.length + 1,
    username,
    email,
    password: hashedPassword,
    role,
    createdAt: new Date()
  };
  
  users.push(newUser);
  
  // Remove password from response
  const { password: _, ...safeUser } = newUser;
  
  res.status(201).json({ success: true, user: safeUser });
});

// Ban user
router.post('/ban/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  
  user.status = 'banned';
  
  res.json({ success: true, message: 'User banned successfully' });
});

// Delete user
router.delete('/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  
  users.splice(userIndex, 1);
  
  res.json({ success: true, message: 'User deleted successfully' });
});

module.exports = router;