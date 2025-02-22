const express = require("express");
const {
  registerUser,
  loginUser,
  getUsers,
  getUsersWithChat,
} = require("../controller/userController");

const router = express.Router();

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/getusers").post(getUsers);
router.route("/getUsersWithRoom").post(getUsersWithChat);

module.exports = router;
