// Sky Hoffert
// Basic UDP server for games.

const util = require("./util.js");
const lobby = require("./lobby.js");
const conn = require("./connection.js");
const endian = require("./endian.js");

const dgram = require("dgram");
const server = dgram.createSocket("udp4");

const TICK_RATE = 1000;

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
	let connID = rinfo.address+":"+rinfo.port;
	if (!conns[connID]) {
        console.log("New connection from "+connID);
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
        if (msg[3] > lobby.MAX_LOBBIES-1) {
            console.log("[ERROR] Invalid lobby number for CAN_I_HOST");
            return;
        }
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
	} else if(msg[2] === 0x0b) { // ADD_HOST_CONNECTION
        // TODO: only works for lobby 0.
        if (msg[3] !== 0x00) {
            console.log("[ERROR] ADD_HOST_CONNECTION error 1.");
            return;
        }
        // TODO: this is lazy. Add methods.
        lobbies[0].nextHostConnection[0] = rinfo.address;
        lobbies[0].nextHostConnection[1] = rinfo.port;
        let id = msg[1];
        msg = new Uint8Array(4);
        msg[0] = 0x01;
        msg[1] = 0x00;
        msg[2] = 0x0c; // ACK_HOST_CONNECTION
        msg[3] = id;
        server.sendto(msg, 0, msg.length, rinfo.port, rinfo.address);
    } else if (msg[2] === 0x0d) { // CAN_I_CONNECT
        console.log("got client connect req.");
        if (lobbies[0].GetActive()) {
            msg = new Uint8Array(4);
            msg[0] = 0x01;
            msg[1] = 0x00;
            msg[2] = 0x0e; // YOU_CAN_CONNECT
            msg[3] = 0x00;
            server.sendto(msg, 0, msg.length, rinfo.port, rinfo.address);
        } else {
            msg = new Uint8Array(4);
            msg[0] = 0x01;
            msg[1] = 0x00;
            msg[2] = 0x0e; // YOU_CAN_CONNECT
            msg[3] = 0x01;
            server.sendto(msg, 0, msg.length, rinfo.port, rinfo.address);
        }
    } else if (msg[2] === 0x0f) { // I_WILL_CONNECT
        console.log("client is trying to connect.");
        let eno = conns[connID].NowWantsToConnect(msg[3], msg[1]);
        if (eno !== 0) { 
            console.log("[ERROR] Issue with I_WILL_CONNECT " + eno);
            return;
        }

        // TODO: only works on lobby 0.

        if (lobbies[0].GetActive()) {
            msg = new Uint8Array(4);
            msg[0] = 0x01;
            msg[1] = 0x00;
            msg[2] = 0x10; // YOU_WILL_CONNECT
            msg[3] = 0x00;
            server.sendto(msg, 0, msg.length, rinfo.port, rinfo.address);
        } else {
            msg = new Uint8Array(4);
            msg[0] = 0x01;
            msg[1] = 0x00;
            msg[2] = 0x10; // YOU_WILL_CONNECT
            msg[3] = 0x01;
            server.sendto(msg, 0, msg.length, rinfo.port, rinfo.address);
        }
    } else if (msg[2] === 0x11) { // ACK_I_WILL_CONNECT
        console.log("client has joined lobby " + conns[connID].GetClientLobbyNum());
        // TODO: confirm packet ID
        let eno = conns[connID].NowConnected();
        if (eno !== 0) {
            console.log("[ERROR] Issue with ACK_I_WILL_CONNECT " + eno);
            return;
        }
    } else if (msg[2] === 0x12) { // ADD_CLIENT_CONNECTION
        if (msg[3] !== 0x00) {
            console.log("[ERROR] Bad lobby number " + msg[3]);
            return;
        }

        let id = msg[1];

        msg = new Uint8Array(4);
        msg[0] = 0x01;
        msg[1] = 0x00;
        msg[2] = 0x13; // ACK_CLIENT_CONNECTION
        msg[3] = id;
        server.sendto(msg, 0, msg.length, rinfo.port, rinfo.address);
        
        msg = new Uint8Array(11);
        msg[0] = 0x01;
        msg[1] = 0x00;
        msg[2] = 0x14; // HERE_HOST_ADDRESS
        let host = lobbies[0].GetHost(); // [IP, PORT]
        let ip = endian.htobe32(util.IPToInt(lobbies[0].nextHostConnection[0]));
        let port = endian.htobe32(lobbies[0].nextHostConnection[1]);
        util.Memcpy(msg, 3, ip, 0, 4);
        util.Memcpy(msg, 7, port, 0, 4);
        server.sendto(msg, 0, msg.length, rinfo.port, rinfo.address);
        
        msg = new Uint8Array(11);
        msg[0] = 0x01;
        msg[1] = 0x00;
        msg[2] = 0x16; // HERE_CLIENT_ADDRESS
        ip = endian.htobe32(util.IPToInt(rinfo.address));
        port = endian.htobe32(rinfo.port);
        util.Memcpy(msg, 3, ip, 0, 4);
        util.Memcpy(msg, 7, port, 0, 4);
        server.sendto(msg, 0, msg.length, host[1], host[0]);
    } else if (msg[2] === 0xff) { // KILL
        console.log(""+connID+" DC-ed");
        
        for (let i = 0; i < lobbies.length; i++) {
            let dcs = lobbies[i].HandleDisconnect(rinfo.address, rinfo.port);
            if (dcs.length > 0) {
                console.log("Connection impacted a lobby.")
            }
            // TODO: handle all clients that were disconnected.
        }
        
		delete conns[connID];
	}
});

server.on("listening", function () {
    const address = server.address();
    console.log("Server listening on " + address.address + ":" + address.port);
});

server.bind(5000);

setInterval(function () {
    // TODO: handle actions that must happen on each tick, such as status info.
	for (let i = 0; i < lobbies.length; i++) {
		lobbies[i].Tick(TICK_RATE);
	}
	for (let key in conns) {
		conns[key].Tick(TICK_RATE);
	}
}, TICK_RATE);