// Sky Hoffert
// Basic UDP server for games.

const endian = require("./endian.js");
const util = require("./util.js");

const dgram = require("dgram");
const client = dgram.createSocket("udp4");

var msg = new Uint8Array(3);
msg[0] = 0x01;
msg[1] = 0x00;
msg[2] = 0x02;
var timeSent = Date.now();

client.sendto(msg, 0, msg.length, 5000, "127.0.0.1", function () {});

client.on("message", function (msg, rinfo) {
    console.log("msg from " + rinfo.address + ":" + rinfo.port);
	msg = Uint8Array.from(msg)
	for (let i = 0; i < msg.length; i++) {
		console.log("  "+i+":"+msg[i]);
	}
	
	// Make sure that the packet ID is always given first
	if (msg[0] != 0x01) {
		console.err("[DROP] Packet ID not provided!");
		return;
	}
	let ID = msg[1];

	if (msg[2] == 0x02) { // PING
		msg = new Uint8Array(3);
		msg[0] = 0x01;
		msg[1] = ID;
		msg[2] = 0x03; // PONG
		client.sendto(msg, 0, msg.length, rinfo.port, rinfo.address);
	} else if (msg[2] == 0x03) { // PONG
		if (msg[1] == 0x00) {
			let now = Date.now();
			let elapsed = now - timeSent;
			console.log("ping: "+elapsed+" ms");
			msg = new Uint8Array(3);
			msg[0] = 0x01;
			msg[1] = 0x01;
			msg[2] = 0x04;
			client.sendto(msg, 0, msg.length, 5000, "127.0.0.1", function () {});
		}
	} else if (msg[2] == 0x05) {
		client.close();
	}
});
