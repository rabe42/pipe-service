"use strict";
var Queues = (function () {
    function Queues() {
    }
    /**
     * Create a named queue. If the queue already exist, nothing will be done.
     */
    Queues.prototype.create = function (name) {
        this.name = name;
    };
    return Queues;
}());
exports.Queues = Queues;
;
