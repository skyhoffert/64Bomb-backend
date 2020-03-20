const dgram = require("dgram");
const server = dgram.createSocket("udp4");

server.on("error", function (err) {
    console.log("Server error: " + err.stack);
    server.close();
});

server.on("message", function (msg, rinfo) {
    console.log("Server got: " + msg + " from " + rinfo.address + ":" + rinfo.port);
    server.send("Hi from server.", rinfo.port, rinfo.address);
});

server.on("listening", function () {
    const address = server.address();
    console.log("Server listening on " + address.address + ":" + address.port);
});

server.bind(5000);

