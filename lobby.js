// Sky Hoffert
// Lobby classes/function/values.

exports.MAX_LOBBIES = 4;

// Main class for lobbies.
exports.Lobby = class {
    constructor(id) {
		this._id = id;
        this._active = false;
		this._hasPotentialHost = false;
        this._clients = []; // An array of tuples with [ip_addr, port, id]
        this._host = null; // A single tuple with [ip_addr, port]
        this.nextHostConnection = ["",0];
    }
    
    GetHost() { return this._host; }
	GetActive() { return this._active; }
	GetHasPotentialHost() { return this._hasPotentialHost; }
	
	// Periodic update.
	Tick(dT) {
    }
    
    CanClientConnect() {
        return this._active;
    }

    // Add a client of proper format to the clients list.
    AddClient(c) {
        this._clients.push(c);
        // TODO
    }
	
	// Tells this lobby not to accept another host request.
	HasPotentialHost() {
		this._hasPotentialHost = true;
	}

    // Adds a host as the proper lobby host.
    // @param host: new host to be added
    // @return int: 0 on success, error code otherwise
    AddHost(host) {
        if (this._host != null || this._active) {
            return 1;
        } else if (this._hasPotentialHost === false) {
			return 2;
		}

		this._hasPotentialHost = false;
        this._host = host;
		this._active = true;
		
		console.log("[DEBUG] "+this._host[0]+":"+this._host[1]+" is now hosting lobby "+this._id);

        return 0;
    }

    // Removes current host as the lobby leader.
    // @return int: 0 on success, error code otherwise
    RemoveHost() {
        if (this._host == null) {
            return 1;
        }

        this._host = null;
		this._active = false;

        return 0;
    }

    // Adds a client to the lobby, if there is a valid host.
    // @param client: client to be added to the lobby
    // @return int: 0 on success, error code otherwise
    AddClient(client) {
        if (this._active == false) {
            return 1;
        }
        if (this._host == null) {
            return 2;
        }

        this._clients.push(client);

        return 0;
    }
}