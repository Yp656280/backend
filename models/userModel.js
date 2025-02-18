const mongoose = require("mongoose");

const userSchema = mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "please add the username"],
    },
    email: {
      type: String,
      required: [true, "please add the email"],
      unique: [true, "please enter a new email"],
    },
    password: {
      type: String,
      required: [true, "please add the email"],
    },
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model("User", userSchema);
