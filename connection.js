// Sky Hoffert
// Used to retain persistence in connections.

// TODO: connections will stay forever.

exports.Connection = class {
	constructor(addr, port) {
		this._active = true;
		this._id = addr+":"+port; // string of format "ip_addr:port"
		this._addr = addr;
		this._port = port;
		this._pingSentTime = -1;
		this._wantsToHost = false;
		this._isHosting = false;
		this._hostingLobbyNum = -1;
		this._wantsToHostPID = -1;
		this._isClient = false;
		this._wantsToConnect = false;
		this._isConnected = false;
		this._clientLobbyNum = -1;
		this._isHostConnection = false;
		this._hostConnectionLobbyNum = -1;
	}
	
	GetWantsToHost() { return this._wantsToHost; }
	GetIsHosting() { return this._isHosting; }
	GetHostingLobbyNum() { return this._hostingLobbyNum; }
	GetWantsToHostPID() { return this._wantsToHostPID; }
	GetIsClient() { return this._isClient; }
	GetWantsToConnect() { return this._wantsToConnect; }
	GetIsConnected() { return this._isConnected; }
	GetClientLobbyNum() { return this._clientLobbyNum; }
	GetIsHostConnection() { return this._isHostConnection; }
	
	// Periodic update.
	Tick(dT) {
		// DEBUG
		//console.log(this._id + ", tick");
	}

	// When a client wants to connect to a lobby.
	// @param ln: lobby number
	// @param pID: packed ID of the connect request
	// @return int: 0 on success, error code otherwise
	NowWantsToConnect(ln, PID) {
		if (this._isHosting) {
			return 1;
		} else if (this._isConnected || this._clientLobbyNum !== -1) {
			return 2;
		}

		this._isClient = true;
		this._wantsToConnect = true;
		this._clientLobbyNum = ln;

		return 0;
	}

	// When a client is now connected to a lobby.
	// @return int: 0 on success, error code otherwise
	NowConnected() {
		if (!this._wantsToConnect) {
			return 1;
		} else if (this._clientLobbyNum === -1) {
			return 2;
		} else if (!this._isClient) {
			return 3;
		}

		this._isConnected = true;
		this._wantsToConnect = false;

		return 0;
	}
	
	// If a connection wants to host a lobby.
	// @param ln: lobby number that this connection wishes to host
	// @param pID: packet ID of wants to host request
	// @return int: 0 on success, error code otherwise
	NowWantsToHost(ln, pID) {
		if (this._wantsToHost || this._isHosting) {
			return 1;
		}
		
		this._wantsToHost = true;
		this._hostingLobbyNum = ln;
		this._wantsToHostPID = pID;
		
		return 0;
	}
	
	// If a connection is now hosting a lobby.
	// @return int: 0 on success, error code otherwise
	NowIsHosting() {
		if (this._wantsToHost === false || this._isHosting) {
			return 1;
		}
		
		this._wantsToHost = false;
		this._isHosting = true;
		
		return 0;
	}
	
	// Notifies this connection that a ping was sent and a pong will be expected.
	// @return int: 0 on success, error code otherwise
	PingSent() {
		if (this._pingSentTime > 0) {
			return 1;
		}
		
		this._pingSentTime = Date.now();
		
		return 0;
	}
	
	// Notifies this connection that a pong message was received.
	// @return int: 0 on success, error code otherwise
	Pong() {
		let now = Date.now();
		
		if (this._pingSentTime <= 0) {
			console.err("[DEBUG] No ping sent.");
			return 1;
		}
		
		let elapsed = now - this._pingSentTime;
		
		console.log("[INFO] ping ("+this._id+") = "+elapsed+" ms");
		
		this._pingSentTime = -1;
		
		return 0;
	}
}
