const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

/* Serve static files */
app.use(express.static(__dirname));

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("send-location", (data) => {
    socket.broadcast.emit("receive-location", {
      id: socket.id,
      ...data,
    });
  });

  socket.on("disconnect", () => {
    io.emit("user-disconnected", socket.id);
    console.log("User disconnected:", socket.id);
  });
});

server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});

