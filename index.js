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
// io.on("connection", (socket, user) => {
//   console.log("User connected:", socket.id);

//   socket.on("leaveRoom", ({ room, user }) => {
//     socket.leave(room);
//     console.log(`${user?.username} left room: ${room}`);
//   });

//   socket.on("joinRoom", async ({ room, user }) => {
//     try {
//       socket.join(room);
//       console.log(`${user?.username} joined room: ${room}`);

//       socket.to(room).emit("userJoined", { user, room });

//       const roomData = await Room.findById(room).populate({
//         path: "messages.sender",
//         select: "username",
//       });

//       if (roomData && roomData.messages.length > 0) {
//         socket.emit("previousMessages", roomData.messages);
//       } else {
//         console.log("No previous messages found.");
//       }
//     } catch (error) {
//       console.error("Error joining room:", error);
//     }
//   });

//   socket.on("sendMessage", async ({ room, sender, message }) => {
//     try {
//       const roomData = await Room.findById(room);

//       if (!roomData) throw new Error("Room not found");

//       const timestamp = new Date().toISOString();

//       const newMessage = {
//         sender,

//         content: message,

//         time: timestamp,
//       };

//       roomData.messages.push(newMessage);

//       await roomData.save();

//       io.to(room).emit("receiveMessage", newMessage);
//     } catch (error) {
//       console.error("Error sending message:", error);
//     }
//   });

//   socket.on("deleteMessages", async ({ room, messages }) => {
//     try {
//       const roomData = await Room.findById(room);
//       if (!roomData) throw new Error("Room not found");

//       const updatedMessages = roomData.messages.filter(
//         (message) => !messages.includes(message._id.toString())
//       );

//       roomData.messages = updatedMessages;
//       await roomData.save();

//       socket.emit("previousMessages", updatedMessages);

//       socket.emit("messageDeleted", {
//         success: true,
//         message: "Messages deleted successfully",
//       });
//     } catch (error) {
//       console.error("Error deleting messages:", error);
//       socket.emit("messageDeleted", {
//         success: false,
//         error: error.message,
//       });
//     }
//   });

//   socket.on("disconnect", () => {
//     console.log("User disconnected:", socket.id);
//   });
// });

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("leaveRoom", ({ room, user }) => {
    socket.leave(room);
    // console.log(`${user?.username} left room: ${room}`);
  });

  socket.on("joinRoom", async ({ room, user }) => {
    try {
      socket.join(room);
      // console.log(`${user?.username} joined room: ${room}`);

      socket.to(room).emit("userJoined", { user, room });

      const roomData = await Room.findById(room).populate({
        path: "messages.sender",
        select: "_id username",
      });

      if (roomData && roomData.messages.length > 0) {
        const formattedMessages = roomData.messages.map((msg) => ({
          sender: {
            _id: msg.sender._id,
            username: msg.sender.username,
          },
          content: msg.content,
          _id: msg._id,
          timestamp: msg.timestamp,
        }));

        socket.emit("previousMessages", formattedMessages);
      } else {
        console.log("No previous messages found.");
      }
    } catch (error) {
      console.error("Error joining room:", error);
    }
  });

  socket.on("sendMessage", async ({ room, sender, message }) => {
    try {
      const roomData = await Room.findById(room);
      if (!roomData) throw new Error("Room not found");

      const timestamp = new Date().toISOString();
      const newMessage = {
        sender,
        content: message,
        timestamp,
      };

      roomData.messages.push(newMessage);
      await roomData.save();

      const populatedMessage = await Room.findOne({ _id: room })
        .select("messages")
        .populate({
          path: "messages.sender",
          select: "_id username",
        });

      const latestMessage = populatedMessage.messages.pop();
      const formattedMessage = {
        sender: {
          _id: latestMessage.sender._id,
          username: latestMessage.sender.username,
        },
        content: latestMessage.content,
        _id: latestMessage._id,
        timestamp: latestMessage.timestamp.toISOString(),
      };
      io.to(room).emit("receiveMessage", { message: formattedMessage });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  });

  socket.on("deleteMessages", async ({ room, messages }) => {
    try {
      const roomData = await Room.findById(room);
      if (!roomData) throw new Error("Room not found");

      roomData.messages = roomData.messages.filter(
        (message) => !messages.includes(message._id.toString())
      );

      await roomData.save();

      const formattedMessages = roomData.messages.map((msg) => ({
        sender: {
          _id: msg.sender._id,
          username: msg.sender.username,
        },
        content: msg.content,
        _id: msg._id,
        timestamp: msg.timestamp,
      }));

      io.to(room).emit("previousMessages", formattedMessages);
      socket.emit("messageDeleted", {
        success: true,
        message: "Messages deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting messages:", error);
      socket.emit("messageDeleted", { success: false, error: error.message });
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
