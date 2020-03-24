// Sky Hoffert
// Basic UDP server for games.

const endian = require("./endian.js");
const util = require("./util.js");

const dgram = require("dgram");
const client = dgram.createSocket("udp4");
const readline = require('readline');

var msg;
var timeSent;

var IP = "127.0.0.1";
var PORT = 5000;

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', function(line){
	if (line === "quit") {
		msg = new Uint8Array(3);
		msg[0] = 0x01;
		msg[1] = 0x00;
		msg[2] = 0xff;
		client.sendto(msg, 0, msg.length, 5000, "127.0.0.1", function () {
			client.close();
			process.exit(0);
		});
	} else if (line === "kill") {
		client.sendto(msg, 0, msg.length, 5000, "127.0.0.1", function () {});
	} else if (line === "ping") {
		msg = new Uint8Array(3);
		msg[0] = 0x01;
		msg[1] = 0x00;
		msg[2] = 0x02;
		timeSent = Date.now();
		client.sendto(msg, 0, msg.length, 5000, "127.0.0.1", function () {});
	} else if (line === "get active lobbies") {
		msg = new Uint8Array(3);
		msg[0] = 0x01;
		msg[1] = 0x00;
		msg[2] = 0x04;
		client.sendto(msg, 0, msg.length, 5000, "127.0.0.1", function () {});
	} else if (line === "can i host 0") {
		msg = new Uint8Array(4);
		msg[0] = 0x01;
		msg[1] = 0x00;
		msg[2] = 0x06;
		msg[3] = 0x00;
		client.sendto(msg, 0, msg.length, 5000, "127.0.0.1", function () {});
	} else if (line === "i will host 0") {
		msg = new Uint8Array(4);
		msg[0] = 0x01;
		msg[1] = 0x00;
		msg[2] = 0x08;
		msg[3] = 0x00;
		client.sendto(msg, 0, msg.length, 5000, "127.0.0.1", function () {});
	} else {
		console.log("[ERROR] Could not handle.");
	}
});

client.on("message", function (msg, rinfo) {
    console.log("msg from " + rinfo.address + ":" + rinfo.port);
	msg = Uint8Array.from(msg)
	for (let i = 0; i < msg.length; i++) {
		console.log("  "+i+":"+msg[i]);
	}
	
	// Make sure that the packet ID is always given first
	if (msg[0] !== 0x01) {
		console.err("[DROP] Packet ID not provided!");
		return;
	}
	let ID = msg[1];

	if (msg[2] === 0x02) { // PING
		msg = new Uint8Array(3);
		msg[0] = 0x01;
		msg[1] = ID;
		msg[2] = 0x03; // PONG
		client.sendto(msg, 0, msg.length, rinfo.port, rinfo.address);
	} else if (msg[2] === 0x03) { // PONG
		if (msg[1] === 0x00) {
			let now = Date.now();
			let elapsed = now - timeSent;
			console.log("ping: "+elapsed+" ms");
		}
	} else if (msg[2] === 0x05) {
	} else if (msg[2] === 0x07) {
		if (msg[3] === 0x00) {
			console.log("  you can host");
		} else {
			console.log("  host error "+msg[3]);
		}
	} else if (msg[2] === 0x09) {
		console.log("  you will host "+msg[3]);
		msg = new Uint8Array(3);
		msg[0] = 0x01;
		msg[1] = 0x00;
		msg[2] = 0x0a; // ACK_I_WILL_HOST
		client.sendto(msg, 0, msg.length, rinfo.port, rinfo.address);
	}
});
