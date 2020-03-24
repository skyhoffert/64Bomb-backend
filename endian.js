// Sky Hoffert
// Functions for endian operations in 64Bomb-backend.

exports.htobe32 = function (n) {
    return [
        (n & 0xFF000000) >>> 24,
        (n & 0x00FF0000) >>> 16,
        (n & 0x0000FF00) >>>  8,
        (n & 0x000000FF) >>>  0,
    ];
}

exports.htobe64 = function (n) {
    return [
        (n & 0xFF00000000000000) >>> 56,
        (n & 0x00FF000000000000) >>> 48,
        (n & 0x0000FF0000000000) >>> 40,
        (n & 0x000000FF00000000) >>> 32,
        (n & 0x00000000FF000000) >>> 24,
        (n & 0x0000000000FF0000) >>> 16,
        (n & 0x000000000000FF00) >>>  8,
        (n & 0x00000000000000FF) >>>  0,
    ];
}

exports.beXXtoh = function (n) {
	let val = 0;
	let len = n.length;
	for (let i = 0; i < len; i++) {
		val += n[i] << (8*(len-1 - i));
	}
	return val;
}
