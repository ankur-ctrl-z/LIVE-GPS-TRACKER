const express = require('express');
const http = require('http');
const app = express();
const path = require("path");
 
const socketio = require('socket.io');

const server = http.createServer(app);
const io = socketio(server);

app.set("view engine","ejs");
app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
  console.log("connected:", socket.id);

  socket.on("send-location", ({ latitude, longitude }) => {
    socket.broadcast.emit("receive-location", {
      id: socket.id,
      latitude,
      longitude,
    });
  });

  socket.on("disconnect", () => {
    socket.broadcast.emit("user-disconnected", socket.id);
  });
});

app.get("/", (req,res) => {
    res.render("index");
});

server.listen(3000);