// Sky Hoffert
// Basic UDP server for games.

const dgram = require("dgram");
const client = dgram.createSocket("udp4");

client.sendto("0", 0, 1, 5000, "127.0.0.1", function () {
    client.close();
});
