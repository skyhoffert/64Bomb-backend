// Sky Hoffert
// Basic UDP server for games.

const lobby = require("./lobby.js");

const dgram = require("dgram");
const server = dgram.createSocket("udp4");

var lobbies = [];
for (let i = 0; i < lobby.MAX_LOBBIES; i++) {
    lobbies.push(new lobby.Lobby());
}

server.on("error", function (err) {
    console.log("Server error: " + err.stack);
    server.close();
});

server.on("message", function (msg, rinfo) {
    console.log("msg from " + rinfo.address + ":" + rinfo.port);
    //server.send("Hi from server.", rinfo.port, rinfo.address);
    console.log(""+typeof(msg));
});

server.on("listening", function () {
    const address = server.address();
    console.log("Server listening on " + address.address + ":" + address.port);
});

server.bind(5000);
