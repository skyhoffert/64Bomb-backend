// Sky Hoffert
// Basic UDP server for games.

const endian = require("./endian.js");
const util = require("./util.js");

const dgram = require("dgram");
const client = dgram.createSocket("udp4");
const readline = require('readline');

var TICK_RATE = 1000.0/30.0;

var msg;
var timeSent;

var IP = "127.0.0.1";
var PORT = 5000;

if (process.argv.length === 4) {
	IP = process.argv[2];
	PORT = parseInt(process.argv[3]);
}

console.log("Using server address "+IP+":"+PORT);

var clientConnections = [];

var hostConnection = null;

var tickAsClient = false;
var tickAsHost = false;

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

function KILL(cb) {
	msg = new Uint8Array(3);
	msg[0] = 0x01;
	msg[1] = 0x00;
	msg[2] = 0xff;
	client.sendto(msg, 0, msg.length, PORT, IP, cb);
	for (let i = 0; i < clientConnections.length; i++) {
		clientConnections[i].sendto(msg, 0, msg.length, PORT, IP);
	}
	if (hostConnection) {
		hostConnection.sendto(msg, 0, msg.length, PORT, IP);
	}
}

rl.on('line', function(line){
	if (line === "quit") {
		KILL(function () {
			client.close();
			process.exit(0);
		});
	} else if (line === "kill") {
		KILL(function () {});
	} else if (line === "ping") {
		msg = new Uint8Array(3);
		msg[0] = 0x01;
		msg[1] = 0x00;
		msg[2] = 0x02;
		timeSent = Date.now();
		client.sendto(msg, 0, msg.length, PORT, IP, function () {});
	} else if (line === "get active lobbies") {
		msg = new Uint8Array(3);
		msg[0] = 0x01;
		msg[1] = 0x00;
		msg[2] = 0x04;
		client.sendto(msg, 0, msg.length, PORT, IP, function () {});
	} else if (line.substring(0,10) === "can i host") {
		let lobbyNum = parseInt(line.substring(11,line.length))
		if (isNaN(lobbyNum)){
			console.log("[ERROR] failed to parse lobby number");
			return;
		}
		msg = new Uint8Array(4);
		msg[0] = 0x01;
		msg[1] = 0x00;
		msg[2] = 0x06;
		msg[3] = lobbyNum & 0xff;
		client.sendto(msg, 0, msg.length, PORT, IP, function () {});
	} else if (line === "i will host 0") {
		msg = new Uint8Array(4);
		msg[0] = 0x01;
		msg[1] = 0x00;
		msg[2] = 0x08;
		msg[3] = 0x00;
		client.sendto(msg, 0, msg.length, PORT, IP, function () {});
	} else if (line === "add host conn 0") {
		msg = new Uint8Array(4);
		msg[0] = 0x01;
		msg[1] = 0x06;
		msg[2] = 0x08;
		msg[3] = 0x00; // only works for lobby 0
		client.sendto(msg, 0, msg.length, PORT, IP, function () {});
	} else if (line === "can i connect 0") {
		msg = new Uint8Array(4);
		msg[0] = 0x01;
		msg[1] = 0x00;
		msg[2] = 0x0d;
		msg[3] = 0x00; // only works for lobby 0
		client.sendto(msg, 0, msg.length, PORT, IP, function () {});
	} else if (line === "i will connect 0") {
		msg = new Uint8Array(4);
		msg[0] = 0x01;
		msg[1] = 0x00;
		msg[2] = 0x0f;
		msg[3] = 0x00; // only works for lobby 0
		client.sendto(msg, 0, msg.length, PORT, IP, function () {});
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
		console.log("[DROP] Packet ID not provided!");
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
	} else if (msg[2] === 0x05) { // RETURN_ACTIVE_LOBBIES
	} else if (msg[2] === 0x07) { // YOU_CAN_HOST
		if (msg[3] === 0x00) {
			console.log("  you can host");
		} else {
			console.log("  host error "+msg[3]);
		}
	} else if (msg[2] === 0x09) { // YOU_WILL_HOST
		console.log("  you will host "+msg[3]);
		msg = new Uint8Array(4);
		msg[0] = 0x01;
		msg[1] = 0x00;
		msg[2] = 0x0a; // ACK_I_WILL_HOST
		client.sendto(msg, 0, msg.length, rinfo.port, rinfo.address);
		
		clientConnections.push(dgram.createSocket("udp4"));
		msg = new Uint8Array(4);
		msg[0] = 0x01;
		msg[1] = 0x07;
		msg[2] = 0x0b; // ADD_HOST_CONNECTION
		msg[3] = 0x00; // Lobby ID
		clientConnections[0].sendto(msg, 0, msg.length, rinfo.port, rinfo.address);
		clientConnections[0].valid = false;
		// TODO: above only works for lobby 0
		clientConnections[0].on("message", function (msg, rinfo) {
			msg = Uint8Array.from(msg)
			for (let i = 0; i < msg.length; i++) {
				console.log("  "+i+":"+msg[i]);
			}
			if (msg[0] !== 0x01) {
				console.log("err with pID for clientConn[0]");
				return;
			}
			if (msg[2] === 0x0c) {
				if (msg[3] !== 0x07) {
					console.log("err with packed ID in ACK_HOST_CONNECTION");
					return;
				}
				clientConnections[0].valid = true;
				console.log("  ACK_HOST_CONNECTION");
				console.log("  "+clientConnections[0].valid);
			} else if (msg[2] === 0x02) { // PING
				console.log("got a ping from clientConn[0]");

				msg = new Uint8Array(3);
				msg[0] = 0x01;
				msg[1] = 0x00;
				msg[2] = 0x03; // PONG
				if (clientConnections[0].port) {
					clientConnections[0].sendto(msg, 0, msg.length, clientConnections[0].port, clientConnections[0].ip);
				}
			} else if (msg[2] === 0x03) {
				console.log("got a pong from clientConn[0]");
				let now = Date.now();
				console.log("  elapsed: "+(now-timeSent)+" ms");
				if (!tickAsHost) {
					tickAsHost = true;
				}
			}
		});
	} else if (msg[2] === 0x0c) { // ACK_HOST_CONNECTION
		// TODO: is this needed??
	} else if (msg[2] === 0x0e) { // YOU_CAN_CONNECT
		if (msg[3] === 0x00) {
			console.log("  connection available");
		} else {
			console.log("  unable to connect right now");
		}
	} else if (msg[2] === 0x10) { // YOU_WILL_CONNECT
		if (msg[3] !== 0x00) {
			console.log("[ERROR] issue when trying to connect as client.");
			return;
		}

		msg = new Uint8Array(4);
		msg[0] = 0x01;
		msg[1] = 0x00;
		msg[2] = 0x11; // ACK_I_WILL_CONNECT
		msg[3] = 0x00; // Packet ID
		client.sendto(msg, 0, msg.length, rinfo.port, rinfo.address);

		console.log("[NOTE] Client now will connect.");

		hostConnection = dgram.createSocket("udp4");
		msg = new Uint8Array(4);
		msg[0] = 0x01;
		msg[1] = 0x12;
		msg[2] = 0x12; // ADD_CLIENT_CONNECTION
		msg[3] = 0x00; // lobby 0 only
		hostConnection.confirmed = false;
		hostConnection.on("message", function (msg, rinfo) {
			msg = Uint8Array.from(msg);
			if (!hostConnection.confirmed) {
				if (msg[0] !== 0x01) {
					return;
				}
				if (msg[2] !== 0x13) {
					console.log("hostConnection did not get an ack");
					return;
				}
				if (msg[3] !== 0x12) {
					console.log("hostConnection got the wrong packet ID.");
					return;
				}
				console.log("  ACK_CLIENT_CONNECTION");
				hostConnection.confirmed = true;
			} else {
				if (msg[2] === 0x14) {
					console.log("got host address.");
					let ip = util.IntToIP(endian.beXXtoh(msg.subarray(3,7)));
					let port = endian.beXXtoh(msg.subarray(7,11));
					console.log("ip: "+ip+", port: "+port);
					hostConnection.port = port;
					hostConnection.ip = ip;

					msg = new Uint8Array(3);
					msg[0] = 0x01;
					msg[1] = 0x00;
					msg[2] = 0x02; // PING
					timeSent = Date.now();
					hostConnection.sendto(msg, 0, msg.length, port, ip);
					hostConnection.sendto(msg, 0, msg.length, port, ip); // DEBUG
					hostConnection.sendto(msg, 0, msg.length, port, ip); // DEBUG
				} else if (msg[2] === 0x02) { // PING
					msg = new Uint8Array(3);
					msg[0] = 0x01;
					msg[1] = 0x00;
					msg[2] = 0x03; // PONG
					hostConnection.sendto(msg, 0, msg.length, hostConnection.port, hostConnection.ip);
				} else if (msg[2] === 0x03) { // PONG
					let now = Date.now();
					console.log("hostConnection pong");
					console.log("  elapsed "+(now-timeSent)+" ms");
					if (!tickAsClient) {
						tickAsClient = true;
					}
				}
			}
		});
		hostConnection.sendto(msg, 0, msg.length, rinfo.port, rinfo.address, function () {});
	} else if (msg[2] === 0x14) { // HERE_HOST_ADDRESS
		console.log("got host address.");
		if (hostConnection === null) {
			console.log("[ERROR] hostConnection is not valid.");
			return;
		}
		let ip = endian.beXXtoh(msg.subarray(3,7));
		let port = endian.beXXtoh(msg.subarray(7,11));
		console.log("ip: "+ip+", port: "+port);
	} else if (msg[2] === 0x16) { // HERE_CLIENT_ADDRESS
		console.log("got client address.");
		if (clientConnections.length !== 1) {
			console.log("[ERROR] clientConnections[0] is not valid.");
			return;
		}
		let ip = util.IntToIP(endian.beXXtoh(msg.subarray(3,7)));
		let port = endian.beXXtoh(msg.subarray(7,11));
		console.log("ip: "+ip+", port: "+port);
		clientConnections[0].ip = ip;
		clientConnections[0].port = port;

		msg = new Uint8Array(3);
		msg[0] = 0x01;
		msg[1] = 0x00;
		msg[2] = 0x02; // PING
		timeSent = Date.now();
		clientConnections[0].sendto(msg, 0, msg.length, port, ip);
		clientConnections[0].sendto(msg, 0, msg.length, port, ip); // DEBUG
		clientConnections[0].sendto(msg, 0, msg.length, port, ip); // DEBUG
	} else {
		console.log("[ERROR] Unable to parse.");
	}
});

var prevUpdate = -1;
function Tick() {
	if (prevUpdate < 0) {
		prevUpdate = Date.now();
		return;
	}
	
	let now = Date.now();
	let dT = now - prevUpdate;
	prevUpdate = now;
	
	if (tickAsClient) {
		TickAsClient(dT);
	} else if (tickAsHost) {
		TickAsHost(dT);
	}
}

var lastPing = 0;

function TickAsClient(dT) {
	if (lastPing > 1000) {
		lastPing = 0;
		
		msg = new Uint8Array(3);
		msg[0] = 0x01;
		msg[1] = 0x00;
		msg[2] = 0x02; // PING
		timeSent = Date.now();
		hostConnection.sendto(msg, 0, msg.length, hostConnection.port, hostConnection.ip);
	} else {
		lastPing += dT;
	}
}

function TickAsHost(dT) {
	if (lastPing > 1000) {
		lastPing = 0;
		
		msg = new Uint8Array(3);
		msg[0] = 0x01;
		msg[1] = 0x00;
		msg[2] = 0x02; // PING
		timeSent = Date.now();
		clientConnections[0].sendto(msg, 0, msg.length, clientConnections[0].port, clientConnections[0].ip);
	} else {
		lastPing += dT;
	}
	
	// TODO: only works on client[0]
}

setInterval(Tick, TICK_RATE);
