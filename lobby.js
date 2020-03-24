// Sky Hoffert
// Lobby classes/function/values.

exports.MAX_LOBBIES = 4;

// Main class for lobbies.
exports.Lobby = class Lobby {
    constructor() {
        this._active = false;
        this._clients = []; // An array of tuples with [ip_addr, port, id]
        this._host = null; // A single tuple with [ip_addr, port]
    }

    // Adds a host as the proper lobby host.
    // @param host: new host to be added
    // @return int: 0 on success, error code otherwise
    AddHost(host) {
        if (this._host != null) {
            return 1;
        }

        this._host = host;

        return 0;
    }

    // Removes current host as the lobby leader.
    // @return int: 0 on success, error code otherwise
    RemoveHost() {
        if (this._host == null) {
            return 1;
        }

        this._host = null;

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