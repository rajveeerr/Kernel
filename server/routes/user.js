import bcrypt from 'bcryptjs';
import { Router } from 'express';
import User from '../models/user.js';

const router=Router();

const registerUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Please enter all details' });
    }

    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 8);

    const newUser = new User({
      username,
      password: hashedPassword,
    });

    const savedUser = await User.create(newUser);

    res.status(201).json({
      _id: savedUser._id,
      username: savedUser.username,
      message: 'User registration successful'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

router.post('/register', registerUser);

export default router;