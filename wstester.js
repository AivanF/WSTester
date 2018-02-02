/*!
 * WSTester v1.0
 * WebSocket Testing Engine is JavaScript library for unit testing of websystems with WebSockets.
 *
 * Copyright AivanF. 2018 - All Rights Reserved.
 * E-mail: aivanf@mail.ru
 * Website: www.aivanf.com
 * GitHub: https://github.com/AivanF/WSTester

 * This software is provided 'as-is', without any express or implied warranty.
 * You may not hold the author liable.

 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it freely,
 * subject to the following restrictions:

 * The origin of this software must not be misrepresented. You must not claim
 * that you wrote the original software. When use the software, you must give
 * appropriate credit, provide a link to the original file, and indicate if changes were made.
 * This notice may not be removed or altered from any source distribution.
 */

/*
 WSTester is JavaScript library for unit testing of websystems with websockets.
 Controller objects work with flows which may be considered as unit tests.

 The parameter named `flows` must be a list of flow objects.
 A flow object may be an array or a dictionary with unit objects.
 If flow object is a list, all its units are run in the order of their indices by default.
 If flow object is a dictionary, all its units must provide next unit.
 Any flow object must have name as a string at 0 key, and entry unit object at 1 key.
 Each flow begins when previous one ends (obviously, excluding the first one).

 Unit object structure:
    {
        name: string,
        enter: function () {},
        task: function (ws, ref) {},
        condition: function (data, add) {},
        key: string,
        val: any type,
        finalise: function (ws) {},
    }
 All the fields are not strictly necessary.
 However, `task` may be skipped only in one case, so, don't forget to add it.

 Function named `task` of each unit is run only if previous unit object succeeded.
 To assert it, `condition`, `key` and `val` are used. At least one of these properties must present.
 So, initially `task` of a unit object is run, then the Controller waits for appropriate message.
 But if there is no result, after specific amount of time the unit object and its flow will be failed.

 `task` can return nothing or a single object or an array of object for JSON to be send.
 It can set ref.next to change next unit.
 
 If `condition` is specified, it will get parsed response JSON as `data`
 and must return bool for going to next unit or failing,
 or an integer or string for going to specific unit object;
 this will override next unit specified by task.
 Also it gets `add` for output which is used by `Controller`.

 If both `key` and `val` are specified, data[key] will be compared with val.
 If `key` only is specified, data[key] will be used as bool.

 Function named `finalise` is called on unit objects success.
 Its result is handled the same as the result of `task` function.

 Function named `enter` is called if unit does not have `task` function.
 It must return key of next unit.
 This function is similar to operators `continue`, `skip` and `pass` in some languages.
*/
var WSTester = (function (window) {
    /// Converts given value to boolean with correct numbers processing.
    function bulka(value) {
        if (typeof value === 'number' && isFinite(value)) {
            return value > 0;
        } else {
            return !!value;
        }
    }

    var strlentoo = 256;
    var strlencut = 192;
    /// Cuts too long string for output.
    function cutstr(txt) {
        if (txt.length > strlentoo) {
            return txt.substring(0, strlencut) + "...";
        } else {
            return txt;
        }
    }

    var Controller = function (args) {
        /// Full URL of WS server.
        this.server = null;
        /// Index of current flow.
        this.current_flow = 0;
        /// Key of current unit.
        this.current_unit = 1;
        /// Key of next unit.
        this.next_unit = null;
        /// Is WS connection opened?
        this.working = false;
        /// Waiting time before unit failing.
        this.waiting_time = 2000;
        /// Delay between end of one unit and beginning of another.
        this.delay = 0;
        /// Timer before unit failing.
        this.timer = null;
        /// Unit tests.
        this.flows = [];
        /// Function for output.
        this.add = function(val, kind){};
        /// Hidden WS connection.
        this.hws = null;
        /// Count of successfully passed flows.
        this.pass_count = 0;
        /// Count of failed flows.
        this.fail_count = 0;
        /// Function that is called after new WS connection creation.
        this.work_begin = function(){};
        /// Function that is called after all the flows completion.
        this.work_end = function(pass_count,fail_count,total_count){};
        /// If should recreate WS connection for each flow (unit test).
        this.split = false;

        // process given arguments
        var params = ["waiting_time", "add", "flows", "delay", "work_begin", "work_end", "split"];
        for (var i = 0; i < params.length; i++) {
            var p = params[i];
            if (p in args) {
                this[p] = args[p];
            }
        }
    };

    // Returns name of current flow.
    Controller.prototype.flow_name = function () {
        if (this.current_flow < this.flows.length) {
            if (this.islist()) {
                return "<b>[ " + this.flows[this.current_flow][0] + " ]</b>";
            } else {
                return "<b>{ " + this.flows[this.current_flow][0] + " }</b>";
            }
        } else {
            return "[?]";
        }
    };

    // Returns if current flow is a list.
    Controller.prototype.islist = function () {
        return this.flows[this.current_flow] instanceof Array;
    };

    // Stops failing timer.
    Controller.prototype.stop_timer = function () {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    };

    // Sends JSON messages to WS server.
    Controller.prototype.upload = function (data) {
        if (data) {
            if (!(data instanceof Array)) {
                data = [data];
            }
            for (var i = 0; i < data.length; i++) {
                var song = JSON.stringify(data[i]);
                this.add("- Sent data:", 1);
                this.add(song, 1);
                this.hws.send(song);
            }
        }
    };

    // Starts processing of the current flow.
    Controller.prototype.process_flow = function () {
        if (this.current_flow < this.flows.length) {
            this.add("- Flow " + this.flow_name() + " is started.");
            this.current_unit = 1;
            this.process_unit();
        } else {
            this.add("<b>- Flows results:</b>");
            var code = 0;
            if (this.pass_count > 0)
                code = 2;
            this.add("* Pass count: " + this.pass_count, code);
            code = 0;
            if (this.fail_count > 0)
                code = 3;
            this.add("* Fail count: " + this.fail_count, code);
            code = 0;
            if (this.flows.length != this.fail_count + this.pass_count)
                code = 3;
            this.add("* Missed count: " + (this.flows.length - this.fail_count - this.pass_count), code);
            this.finish();
        }
    };

    // Terminates current flow, starts next one.
    Controller.prototype.next_flow = function () {
        this.stop_timer();
        this.current_flow++;
        if (this.split) {
            this.stop_timer();
            this.working = false;
            this.hws.onmessage = function(){};
            this.hws.close();
            this.add("<br><hr>");
            this.setup(this.server);
        } else {
            this.add("<br><hr>");
            this.process_flow();
        }
    };

    // Processes current unit of current flow.
    Controller.prototype.process_unit = function () {
        // Is it time to stop the flow?
        var continue_flow = false;
        if (this.islist()) {
            // Unit is an array
            continue_flow = !!this.flows[this.current_flow][this.current_unit];
            if (!continue_flow) {
                // Catch incorrect values
                if (this.current_unit == this.flows[this.current_flow].length) {
                    this.add("- Flow " + this.flow_name() + " is completed.");
                } else {
                    this.add('- Warning: Flow ' + this.flow_name() + ' got undefined continue "' + this.current_unit + '"');
                }
            }   
        } else {
            // Unit is a dict
            continue_flow = !!this.current_unit;
            if (!continue_flow) {
                this.add("- Flow " + this.flow_name() + " got no continue.");
            } else {
                continue_flow = !!this.flows[this.current_flow][this.current_unit];
                if (!continue_flow) {
                    // It's not a warning, but usual completion of floaw as a dictionary.
                    this.add('- Flow ' + this.flow_name() + ' got undefined continue "' + this.current_unit + '"');
                }
            }
        }

        if (continue_flow) {
            // Nope, execute one more unit
            var current_one = this.flows[this.current_flow][this.current_unit];

            if (current_one.task) {
                // Usual unit with `task`
                var txt = "- Execution of #" + this.current_unit;
                if (current_one.title)
                    txt += ' "' + current_one.title + '"';
                this.add(txt);
                var ref = {};
                var task_res = current_one.task(this.hws, ref);
                if (ref.next) {
                    this.next_unit = ref.next;
                } else {
                    if (this.islist()) {
                        this.next_unit = this.current_unit + 1;
                    } else {
                        this.next_unit = null;
                    }
                }
                this.upload(task_res);
                var self = this;
                this.timer = setTimeout(function() {
                    if (self.working) {
                        self.fail_count++;
                        self.add("- Waiting time is up! ", 3);
                        self.next_flow();
                    } else {
                        self.add("- Bad timer...", 3);
                    }
                }, this.waiting_time);

            } else if (current_one.enter) {
                // Entry, skipping unit;
                // useful for flows as dictionaries
                this.next_unit = current_one.enter();
                if (this.next_unit == this.current_unit) {
                    this.add("- Warning: Recursive units indices!", 3);
                }
                this.current_unit = this.next_unit;
                this.next_unit = null;
                this.process_unit();

            } else {
                // Wrong unit without both task or enter functions
                this.fail_count++;
                this.add("- Wrong unit! ", 3);
                this.next_flow();
            }

        } else {
            // yeah, it's time to stop
            this.pass_count++;
            this.next_flow();
        }
    };

    // Is called by the Controller to correctly turn off the system.
    Controller.prototype.finish = function () {
        this.stop_timer();
        if (this.hws) {
            this.hws.close();
            this.hws = null;
        }
        this.working = false;
        this.work_end(this.pass_count, this.fail_count, this.flows.length);
    };

    // Sets server of the Controller, creates new WS connection with event handlers.
    Controller.prototype.setup = function (server) {
        this.server = server;
        this.hws = new WebSocket(server);
        var self = this;

        self.hws.onopen = function() {
            self.add("- Connection established.");
            self.working = true;
            if (self.current_flow == 0) {
                self.work_begin();
            }
            self.process_flow();
        };

        self.hws.onmessage = function(ev) {
            var data = JSON.parse(ev.data);
            self.add("- Got:", 1);
            self.add(cutstr(ev.data), 1);

            var current_one = self.flows[self.current_flow][self.current_unit];
            var well = false;

            if (!current_one) {
                // This is usual after flow completion.
                // self.add("- Bad key of current unit, cannot process received message!", 3);
                return;
            }

            // assertion
            if (current_one.condition) {
                var cond_res = current_one.condition(data);
                if (typeof cond_res === 'boolean' && cond_res) {
                    well = true;
                    self.add("- By condition with boolean as result", 1);
                } else if (typeof cond_res === 'number') {
                    //  && cond_res > 0 && cond_res < self.flows[self.current_flow].length
                    well = true;
                    self.add("- By condition with unit index as result", 1);
                    self.next_unit = cond_res;
                } else if (typeof cond_res === 'string') {
                    well = true;
                    self.add("- By condition with unit name as result", 1);
                    self.next_unit = cond_res;
                }
            }
            if (!well && current_one.key !== undefined) {
                if (current_one.val !== undefined) {
                    if (current_one.val instanceof Array) {
                        self.add("- Try by data[key]==val[i]", 1);
                        for (var i = 0; i < current_one.val.length; i++) {
                            if (data[current_one.key] == current_one.val[i]) {
                                well = true;
                                self.add("- By data[key]==val[i]", 1);
                                break;
                            }
                        }
                    } else {
                        if (data[current_one.key] == current_one.val) {
                            well = true;
                            self.add("- By data[key]==val", 1);
                        }
                    }
                } else {
                    if (bulka(data[current_one.key])) {
                        well = true;
                        self.add("- By true key", 1);
                    }
                }
            }

            // what is it next?
            if (well) {
                self.add("- Succeeded.", 2);
                self.stop_timer();
                
                if (current_one.finalise) {
                    self.upload(current_one.finalise(self.hws));
                }

                self.current_unit = self.next_unit;
                self.next_unit = null;
                if (self.delay > 50) {
                    setTimeout(function() { self.process_unit(); }, self.delay);
                } else {
                    self.process_unit();
                }
            } else {
                self.add("- Got irrelevent data:", 3);
                self.add(cutstr(ev.data), 3);
            }
        }; // END onmessage

        self.hws.onclose = function(ev) {
            if (self.working) {
                self.add("- The connection was closed!", 3);
                self.finish();
            } else {
                self.add("- The connection was closed.");
            }
            // console.log("Connection closed");
            // console.log(ev);
        };

        self.hws.onerror = function(ev) {
            self.add("- An error happened!", 3);
            // console.log("WS error");
            // console.log(ev);
            self.finish();
        };
    };

    // Stops processing and prevents any output.
    Controller.prototype.abort = function () {
        this.add = function(){};
        this.work_end = function(){};
        this.finish();
    };

    // Creates Controller objects and sets up the server.
    var creator = function (args) {
        var res = new Controller(args);
        if (args['server']) {
            res.setup(args['server']);
        }
        return res;
    };

    var res = {};
    res.Controller = creator;
    return res;
}(window));

alert("Full WSTester is here!");
