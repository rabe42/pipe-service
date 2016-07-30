/// <reference path="../typings/jasmine/jasmine.d.ts"/>
/// <reference path="../src/queueServer.ts" />
"use strict";
//import Queues = require("../src/queueServer");
var queueServer_1 = require("../src/queueServer");
describe("The queue interface", function () {
    it("should accept create request", function () {
        var queues = new queueServer_1.Queues();
        queues.create("hello");
        expect(queues.name).toBe("hello");
    });
});
