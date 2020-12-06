const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const socket = require("socket.io");
const io = socket(server);

let Person_Constraints;
express.urlencoded({
  extended: true,
}); //This is a built-in middleware function in Express. It parses incoming requests with urlencoded payloads and is based on body-parser.
app.use(express.json()); // For parsing application/json  This is a built-in middleware function in Express. It parses incoming requests with JSON payloads and is based on body-parser.
app.post("/room", (req, res) => {
  try {
    Person_Constraints = JSON.parse(JSON.stringify(req.body)); //Deep copy means all the values are copied to the variable and both values are disconnected
    console.log(req.body); //simply using assignment operator we just make another instance pointing to same variable (shallow copy)
    res.status(200).send({
      "From Server": "Client Data Received",
    });
  } catch (err) {
    console.log("\n!! Person_Constraints not Found!!\n" + err);
    res.redirect("/"); //Redirect to home URL
  }
});

io.on("connection", (socket) => {
  try {
    socket.emit("AboutMe", {
      ID: socket.id,
      Name: Person_Constraints.Person,
      Media_const: Person_Constraints.StreamConstraints,
      Room: Person_Constraints.Room,
    });

    socket.on("join_room", (roomID) => {
      console.log("RoomID: ");
      console.log(roomID);

      socket.join(roomID);

      const client_in_room = Object.keys(
        io.sockets.adapter.rooms[roomID].sockets
      );
      const other_clients = client_in_room.filter((id) => id !== socket.id);

      if (other_clients.length > 0) {
        console.log("\nSending on Room : " + roomID);
        //socket.emit("other Users",other_clients);
        socket.to(roomID).emit("user_joined", {
          userID: socket.id,
          UserName: Person_Constraints.Person,
          Room: Person_Constraints.Room,
        });
      }

      socket.on("to_other_socket", (data) => {
        io.to(data.dest).emit("callerSocket", data.LocalInfo);
      });

      socket.on("ice-candidate", (incoming) => {
        io.to(incoming.dest).emit("ice-candidate", incoming.Info);
      });

      socket.on("offer", (payload) => {
        io.to(payload.dest).emit("Answer", payload.Info);
      });

      socket.on("disconnect", () => {
        console.log("Disconnecting and Signalling ");
        socket.to(roomID).emit("user_disconnected", socket.id);
      });
    });

    socket.on("answer", (payload) => {
      io.to(payload.target).emit("answer", payload);
    });
  } catch (err) {
    console.log("\n!! Person_Constraints not Found!!\n" + err);
    io.emit("redirect_to_home_URL", "/"); //Redirect to home URL
  }
});

const POrt = process.env.PORT || 8080;

if (process.env.NODE_ENV === "production") {
  app.use(express.static("client/build"));

  const path = require("path");
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "client", "build", "index.html"));
  });
}
server.listen(POrt, () => {
  console.log("Server Running  at port ..." + POrt);
});
