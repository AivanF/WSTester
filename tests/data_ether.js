/*
 * The Etherscan Block Explorer WebSocket API:
 * https://etherscan.io/apis#websocket
 */

var f_t1 = [
	"Test A of Etherscan",
	{
		name: "Ping test",
		task: function(ws) {
			return {"event":"ping"};
		},
		key: "event",
		val: "pong",
	},
	{
		name: "Subscribe to something",
		task: function(ws) {
			return {"event": "txlist", "address": "0x2a65aca4d5fc5b5c859090a6c34d164135398226"};
		},
		key: "status",
		// only key is enough to check the value
		// val: "1",
	},
	{
		name: "Send an error",
		task: function(ws) {
			return {"op":"LOL"};
		},
		key: "event",
		val: "error",
	},
];

var f_t2 = {
	0: "Test B of Etherscan",
	1: {
		// this is the entry point of the flow
		enter: function() { return "k_ping"; },
	},
	"k_ping": {
		name: "Ping test",
		task: function(ws, ref) {
			ref.next = "k_subs";
			return {"event":"ping"};
		},
		key: "event",
		val: "pong",
	},
	"k_subs": {
		name: "Subscribe to something",
		task: function(ws, ref) {
			ref.next = "k_send";
			return {"event": "txlist", "address": "0x2a65aca4d5fc5b5c859090a6c34d164135398226"};
		},
		key: "status",
		val: "1",
	},
	"k_send": {
		name: "Send an error",
		task: function(ws) {
			return {"op":"LOL"};
		},
		key: "event",
		val: "error",
	},
};

var flows = [];
flows.push(f_t1);
flows.push(f_t2);

var args = {
	"server": "wss://socket.etherscan.io/wshandler",
	"waiting_time": 7000,
	"delay": 1000,
	"split": true,
};

var title = "Etherscan WS API test";
