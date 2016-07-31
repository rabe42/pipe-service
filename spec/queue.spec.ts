/// <reference path="../typings/jasmine/jasmine.d.ts"/>
/// <reference path="../src/queueServer.ts" />

import {Queues} from "../src/queueServer"

describe("The queue interface", () => {

    it ("should accept create request", () => {
        var queues: Queues = new Queues();
        queues.create("hello");
        expect(queues.name).toBe("hello");
    });
});