/*
 * TacticToy WebSocket test.
 * Game description is available here:
 * http://www.aivanf.com/eng/note/tactictoy
 */

var us1 = "mymac";
var us2 = "newmac";
var pw = "707307";
var desk = -1;

// Tests user creation and deletion with array flow object.
var f_t1_1 = [
	"Test 1.1. Users",
	{
		title: "delete " + us1,
		task: function(ws) {
			return { "nick": us1, "pass": pw, "method": "deleteuser" };
		},
		condition: function(data) { return true; },
	},
	{
		title: "create " + us1,
		task: function(ws, ref) {
			return { "nick": us1, "pass": pw, "method": "makeuser"};
		},
		condition: function(data) { return 4; },
	},
	{
		title: "delete " + us2,
		task: function(ws) {
			return { "nick": us2, "pass": pw, "method": "deleteuser" };
		},
		condition: function(data) { return true; },
	},
	{
		title: "create " + us2,
		task: function(ws) {
			return { "nick": us2, "pass": pw, "method": "makeuser"};
		},
		condition: function(data) { return true; },
	},
];

// Tests user creation and deletion with dictionary flow object.
var f_t1_2 = {
	0: "Test 1.2. Users",
	1: {
		enter: function(data) { return "d1"; },
	},
	d1: {
		title: "delete " + us1,
		task: function(ws) {
			return { "nick": us1, "pass": pw, "method": "deleteuser" };
		},
		condition: function(data) { return "m1"; },
	},
	m1: {
		title: "create " + us1,
		task: function(ws, ref) {
			return { "nick": us1, "pass": pw, "method": "makeuser"};
		},
		condition: function(data) { return "m2"; },
	},
	d2: {
		title: "delete " + us2,
		task: function(ws) {
			return { "nick": us2, "pass": pw, "method": "deleteuser" };
		},
		condition: function(data) { return "m2"; },
	},
	m2: {
		title: "create " + us2,
		task: function(ws) {
			return { "nick": us2, "pass": pw, "method": "makeuser"};
		},
		condition: function(data) { return true; },
	},
};

var f_t2 = [
	"Test 2. Challenge",
	{
		title: "send challenge",
		task: function(ws) {
			return { "nick": us1, "pass": pw, "other": us2, "dim": 3, "dep": 2, "method": "challenge" };
		},
		condition: function(data) {
			desk = data["ind"];
			return false;
		},
		key: 'ind',
	},
	{
		title: "accept challenge",
		task: function(ws) {
			return { "nick": us2, "pass": pw, "ind": desk, "method": "accept"};
		},
		key: 'res',
	},
];

var f_t3 = [
	"Test 3. Own desk",
	{
		title: "create own desk",
		task: function(ws, ref) {
			ref.next = 3;
			return { "nick": us2, "pass": pw, "dim": 3, "dep": 2, "method": "owndesk" };
		},
		condition: function(data) {
			desk = data["ind"];
			return false;
		},
		key: 'ind',
	},
	{
		title: "cannot start",
		task: function(ws) {
			return { "nick": us2, "pass": pw, "ind": desk, "method": "start"};
		},
		key: 'res',
		val: 0,
	},
	{
		title: "send request",
		task: function(ws) {
			return { "nick": us1, "pass": pw, "ind": desk, "team": 1, "method": "request"};
		},
		key: 'res',
	},
	{
		title: "cannot start",
		task: function(ws) {
			return { "nick": us2, "pass": pw, "ind": desk, "method": "start"};
		},
		key: 'res',
		val: 0,
	},
	{
		title: "pass client",
		task: function(ws) {
			return { "nick": us2, "pass": pw, "other": us1, "ind": desk, "method": "pass"};
		},
		key: 'res',
	},
	{
		title: "have started",
		task: function(ws) {
			return { "nick": us2, "pass": pw, "ind": desk, "method": "start"};
		},
		key: 'res',
	},
];

var flows = [];
flows.push(f_t1_1);
flows.push(f_t1_2);
flows.push(f_t2);
flows.push(f_t3);

var args = {
	"server": "ws://www.aivanf.com/wstest",
	"waiting_time": 1000,
	"delay": 500,
};

var title = "TacticToy WS tests";
