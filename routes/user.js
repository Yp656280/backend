const express = require("express");
const {
  registerUser,
  loginUser,
  getUsers,
} = require("../controller/userController");

const router = express.Router();

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/getusers").post(getUsers);

module.exports = router;
