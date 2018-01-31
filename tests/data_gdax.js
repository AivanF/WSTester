/*
 * GDAX WebSocket API:
 * https://docs.gdax.com/#subscribe
 */

var f_t1 = [
	"Channel: heartbeat",
	{
		name: "Subscribe to something",
		task: function(ws) {
			return {
				"type": "subscribe",
				"product_ids": [
					"ETH-USD",
					"ETH-EUR"
				],
				"channels": [
					"heartbeat",
				]
			};
		},
		key: "type",
		val: "heartbeat",
	},
];

var f_t2 = [
	"Channel: level2",
	{
		name: "Subscribe to something",
		task: function(ws) {
			return {
				"type": "subscribe",
				"product_ids": [
					"ETH-USD",
					"ETH-EUR"
				],
				"channels": [
					"level2",
				]
			};
		},
		key: "type",
		val: ["snapshot", "l2update"],
	},
];

var f_t3 = [
	"Channel: ticker",
	{
		name: "Subscribe to something",
		task: function(ws) {
			return {
				"type": "subscribe",
				"product_ids": [
					"ETH-USD",
					"ETH-EUR"
				],
				"channels": [
					{
						"name": "ticker",
						"product_ids": [
							"ETH-BTC",
							"ETH-USD"
						]
					}
				]
			};
		},
		key: "type",
		val: "ticker",
	},
];

var flows = [];
flows.push(f_t1);
flows.push(f_t2);
flows.push(f_t3);

var args = {
	"server": "wss://ws-feed.gdax.com",
	"waiting_time": 5000,
	"delay": 1000,
	"split": true,
};

var title = "GDAX WS API test";
