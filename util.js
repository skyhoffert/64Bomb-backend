// Sky Hoffert
// Utility functions/values for 64Bomb-backend.

exports.IPToInt = function (ip) {
    return ip.split('.').reduce(function(ipInt, octet) { return (ipInt<<8) + parseInt(octet, 10)}, 0) >>> 0;
}

exports.IntToIP = function (ipInt) {
    return ( (ipInt>>>24) +'.' + (ipInt>>16 & 255) +'.' + (ipInt>>8 & 255) +'.' + (ipInt & 255) );
}

exports.Memcpy = function (dest, didx, source, sidx, len) {
    for (let i = 0; i < len; i++) {
        dest[didx+i] = source[sidx+i];
    }
}
