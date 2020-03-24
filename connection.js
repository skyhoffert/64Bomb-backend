// Sky Hoffert
// Used to retain persistence in connections.

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
	}
	
	GetWantsToHost() { return this._wantsToHost; }
	GetIsHosting() { return this._isHosting; }
	GetHostingLobbyNum() { return this._hostingLobbyNum; }
	GetWantsToHostPID() { return this._wantsToHostPID; }
	
	// Periodic update.
	Tick(dT) {
		console.log(this._id + ", tick");
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
