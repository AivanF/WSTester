/*
 * Blockchain transaction WebSocket API:
 * https://blockchain.info/api/api_websocket
 */

var f_t1 = [
	"Test Blockchain",
	{
		name: "Ping test",
		task: function(ws) {
			return {"op":"ping"};
		},
		key: "op",
		val: "pong",
	},
	{
		name: "Catch a transaction",
		task: function(ws) {
			return {"op":"unconfirmed_sub"};
		},
		key: "op",
		val: "utx",
		finalise: function(ws) {
			return {"op":"unconfirmed_unsub"};
		},
	},
	{
		name: "Search new block",
		task: function(ws) {
			return {"op":"ping_block"};
		},
		key: "op",
		val: "block",
	},
];

var flows = [];
flows.push(f_t1);

var args = {
	"server": "wss://ws.blockchain.info/inv",
	"waiting_time": 7000,
	"delay": 1000,
};

var title = "Blockchain WS API test";
