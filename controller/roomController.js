const Room = require("../models/roomModel");

const createRoom = async (req, res) => {
  const { user1, user2 } = req.body; // User IDs
  if (!user1 || !user2) {
    return res.status(400).send("User IDs are required");
  }

  try {
    // Ensure a room doesn't already exist
    let room = await Room.findOne({ users: { $all: [user1, user2] } });

    if (!room) {
      room = new Room({ users: [user1, user2] });
      await room.save();
    }

    res.status(200).json(room);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating room");
  }
};

module.exports = { createRoom };
