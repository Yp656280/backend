const Room = require("./models/roomModel"); // Import the Room model

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const dotenv = require("dotenv").config();
const connectDb = require("./config/db");

//
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Replace with your client's URL
    methods: ["GET", "POST"], // HTTP methods allowed
  },
});

//port
const PORT = process.env.PORT || 3000;

//middlewares
app.use(cors());
app.use(express.json());

//database
connectDb();

//api
app.use("/api/user", require("./routes/user"));
app.use("/api/room", require("./routes/room"));
app.get("/", (req, res) => {
  res.send("Hello");
});
// Store active users
io.on("connection", (socket, user) => {
  console.log("User connected:", socket.id);

  //Lisetn for leaveroom event
  socket.on("leaveRoom", ({ room, user }) => {
    socket.leave(room);
    console.log(`${user?.username} left room: ${room}`);
  });

  // Listen for joinRoom event
  socket.on("joinRoom", async ({ room, user }) => {
    try {
      socket.join(room); // Join the specified room
      console.log(`${user?.username} joined room: ${room}`);

      // Notify others in the room about the new user
      socket.to(room).emit("userJoined", { user, room });

      // Load and send previous messages (if they exist)
      // Load and send previous messages

      const roomData = await Room.findById(room).populate({
        path: "messages.sender", // Populate the sender field with the User model
        select: "username", // Only select the 'username' field
      });

      if (roomData && roomData.messages.length > 0) {
        // Emit the previous messages to the user who just joined

        socket.emit("previousMessages", roomData.messages);
      } else {
        console.log("No previous messages found.");
      }
    } catch (error) {
      console.error("Error joining room:", error);
    }
  });

  // Handle sending messages
  socket.on("sendMessage", async ({ room, sender, message }) => {
    try {
      // Find the room by ID

      const roomData = await Room.findById(room);

      if (!roomData) throw new Error("Room not found");

      // Get the current timestamp

      const timestamp = new Date().toISOString(); // ISO format, but you can adjust it based on your preference

      // Create a new message object with timestamp

      const newMessage = {
        sender, // User ID of the sender

        content: message, // Message content

        time: timestamp, // Add time to the message
      };

      // Push the new message to the room's messages array

      roomData.messages.push(newMessage);

      await roomData.save(); // Save changes to the database

      // Broadcast the new message to the room, including the timestamp
      io.to(room).emit("receiveMessage", newMessage);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  });

  // Handle deleting messages
  socket.on("deleteMessages", async ({ room, messages }) => {
    try {
      // Find the room in the database
      const roomData = await Room.findById(room);
      if (!roomData) throw new Error("Room not found");

      // Filter out the messages to be deleted
      const updatedMessages = roomData.messages.filter(
        (message) => !messages.includes(message._id.toString())
      );

      // Update the room with the filtered messages
      roomData.messages = updatedMessages;
      await roomData.save();

      // Prepare the remaining messages to send via Socket.IO
      const remainingMessages = updatedMessages.map((cur) => ({
        sender: { _id: cur.sender },
        time: cur.timestamp,
        content: cur.content,
        _id: cur._id,
      }));

      // Emit the updated message list to the room
      io.to(room).emit("previousMessages", remainingMessages);

      // Emit a success response to the client
      socket.emit("messageDeleted", {
        success: true,
        message: "Messages deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting messages:", error);
      socket.emit("messageDeleted", {
        success: false,
        error: error.message,
      });
    }
  });

  // Handle user disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
