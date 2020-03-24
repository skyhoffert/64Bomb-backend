// Sky Hoffert
// Basic UDP server for games.

const util = require("./util.js");
const lobby = require("./lobby.js");
const conn = require("./connection.js");

const dgram = require("dgram");
const server = dgram.createSocket("udp4");

const TICK_RATE = 1000;

var timeSent;

var lobbies = [];
for (let i = 0; i < lobby.MAX_LOBBIES; i++) {
    lobbies.push(new lobby.Lobby(i));
}

var conns = {};

server.on("error", function (err) {
    console.log("Server error: " + err.stack);
    server.close();
});

server.on("message", function (msg, rinfo) {
	// Add this connection to the dict if unknown.
	let connID = rinfo.address+rinfo.port;
	if (!conns[connID]) {
		conns[connID] = new conn.Connection(rinfo.address, rinfo.port);
	}
	
	/* DEBUG 
    console.log("msg from " + rinfo.address + ":" + rinfo.port);
	msg = Uint8Array.from(msg)
	for (let i = 0; i < msg.length; i++) {
		console.log("  "+i+":"+msg[i]);
	}
	*/
	
	// Make sure that the packet ID is always given first
	if (msg[0] !== 0x01) {
		return;
	}
	let ID = msg[1];
	
	if (msg[2] === 0x02) { // PING
		msg = new Uint8Array(3);
		msg[0] = 0x01;
		msg[1] = ID;
		msg[2] = 0x03; // PONG
		server.sendto(msg, 0, msg.length, rinfo.port, rinfo.address);
		msg[0] = 0x01;
		msg[1] = ID;
		msg[2] = 0x02; // PING
		conns[connID].PingSent();
		server.sendto(msg, 0, msg.length, rinfo.port, rinfo.address);
	} else if (msg[2] === 0x03) { // PONG
		conns[connID].Pong();
	} else if (msg[2] === 0x04) { // GET_ACTIVE_SERVERS
		let nServs = lobby.MAX_LOBBIES & 0xff;
		let nServsBytes = Math.ceil(nServs/8);
		msg = new Uint8Array(4+nServsBytes);
		msg[0] = 0x01;
		msg[1] = 0x00;
		msg[2] = 0x05; // RETURN_ACTIVE_SERVERS
		msg[3] = nServs;
		for (let i = 0; i < nServsBytes; i++) {
			let broke = false;
			for (let j = 0; j < 8; j++) {
				if (i*8 + j > nServs-1) {
					broke = true;
					break;
				}
				msg[4+i] |= lobbies[i*8+j].GetActive() << j;
			}
			if (broke) { break; }
		}
		server.sendto(msg, 0, msg.length, rinfo.port, rinfo.address);
	} else if (msg[2] === 0x06) { // CAN_I_HOST
		if (lobbies[msg[3]].GetActive() === false) {
			msg = new Uint8Array(4);
			msg[0] = 0x01;
			msg[1] = 0x00;
			msg[2] = 0x07; // YOU_CAN_HOST
			msg[3] = 0x00; // SUCCESS
			server.sendto(msg, 0, msg.length, rinfo.port, rinfo.address);
		} else {
			msg = new Uint8Array(4);
			msg[0] = 0x01;
			msg[1] = 0x00;
			msg[2] = 0x07; // YOU_CAN_HOST
			msg[3] = 0x01; // GENERIC_ERROR
			server.sendto(msg, 0, msg.length, rinfo.port, rinfo.address);
		}
	} else if (msg[2] === 0x08) { // I_WILL_HOST
		if (lobbies[msg[3]].GetActive() === false && lobbies[msg[3]].GetHasPotentialHost() === false) {
			let eno = conns[connID].NowWantsToHost(msg[3], msg[1]);
			console.log("  new host req for lobby "+msg[3]+", status "+eno);
			if (eno === 0) {
				lobbies[msg[3]].HasPotentialHost();
				msg = new Uint8Array(4);
				msg[0] = 0x01;
				msg[1] = 0x00;
				msg[2] = 0x09; // YOU_WILL_HOST
				msg[3] = conns[connID].GetWantsToHostPID();
				server.sendto(msg, 0, msg.length, rinfo.port, rinfo.address);
			} else {
				console.log("[NOTE] Error with I_WILL_HOST request.");
			}
		} else {
			console.log("[NOTE] I_WILL_HOST request ignored.");
		}
	} else if (msg[2] === 0x0a) { // ACK_I_WILL_HOST
		if (lobbies[conns[connID].GetHostingLobbyNum()].GetActive() === false && 
			lobbies[conns[connID].GetHostingLobbyNum()].GetHasPotentialHost()) {
			if (conns[connID].GetWantsToHost()) {
				let eno = conns[connID].NowIsHosting();
				if (eno === 0) {
					eno = lobbies[conns[connID].GetHostingLobbyNum()].AddHost([rinfo.address,rinfo.port]);
					if (eno === 0) {
						console.log("[DEBUG] New host added!");
					} else {
						console.log("[NOTE] Error when lobby tried to add host.");
					}
				} else {
					console.log("[NOTE] Error when trying to allow host.");
				}
			}
		} else {
			console.log("[NOTE] Unable to confirm lobby is available for hosting.");
		}
	} else if (msg[2] === 0xff) { // KILL
		// TODO: clean up when a host or client kills.
		delete conns[connID];
	}
});

server.on("listening", function () {
    const address = server.address();
    console.log("Server listening on " + address.address + ":" + address.port);
});

server.bind(5000);

setInterval(function () {
	for (let i = 0; i < lobbies.length; i++) {
		lobbies[i].Tick(TICK_RATE);
	}
	for (let key in conns) {
		conns[key].Tick(TICK_RATE);
	}
}, TICK_RATE);