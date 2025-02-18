const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Register User
const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate input fields
    if (!username || !email || !password) {
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
    // console.log(data);
    return res.status(200).json({ data });
  } catch (error) {
    console.error("Error during fetching users:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUsers,
};
