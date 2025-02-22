const User = require("../models/userModel");
const Room = require("../models/roomModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Register User
const registerUser = async (req, res) => {
  try {
    const { username, email, password, file } = req.body;

    // Validate input fields
    if (!username || !email || !password || !file) {
      return res.status(400).json({ message: "All fields are mandatory" });
    }

    // Check if the user is already registered
    const userAvailable = await User.findOne({ email });
    if (userAvailable) {
      return res.status(400).json({ message: "User already registered" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      logo: file,
    });

    if (user) {
      return res.status(201).json({ _id: user.id, email: user.email });
    } else {
      return res.status(400).json({ message: "User not created" });
    }
  } catch (error) {
    console.error("Error during user registration:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Login User
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    // Validate input fields
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are mandatory" });
    }

    // Check if the user exists
    const user = await User.findOne({ email });
    if (user && (await bcrypt.compare(password, user.password))) {
      // Generate JWT
      const accessToken = jwt.sign(
        {
          user: {
            username: user.username,
            email: user.email,
            id: user.id,
          },
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "50m" }
      );

      return res.status(200).json({ accessToken, user });
    } else {
      return res.status(400).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    console.error("Error during user login:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
const getUsers = async (req, res) => {
  const { user } = req.body;
  try {
    const data = await User.find({ _id: { $ne: user } });
    return res.status(200).json({ data });
  } catch (error) {
    console.error("Error during fetching users:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
const getUsersWithChat = async (req, res) => {
  try {
    const { userId } = req.body;
    // Find rooms where the user is a member and has at least one message
    const rooms = await Room.find({
      users: userId,
      "messages.0": { $exists: true }, // Ensures the room has more than one message
    }).populate("users", "_id username email");

    // Extract unique users excluding the current user
    const users = new Set();
    rooms.forEach((room) => {
      room.users.forEach((user) => {
        if (user._id.toString() !== userId) {
          users.add(JSON.stringify(user));
        }
      });
    });

    // Convert set back to array
    const userList = Array.from(users).map((user) => JSON.parse(user));
    res.json({ users: userList });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
module.exports = {
  registerUser,
  loginUser,
  getUsers,
  getUsersWithChat,
};
