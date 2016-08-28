/// <reference path="../typings/jasmine/jasmine.d.ts"/>
import {PipeConfigurations} from "./pipeConfig";

describe("Load pipe config", () => {
    it("should read all the json configs from the default directory.", () => {
        let pipeConfigs = new PipeConfigurations();
        expect(pipeConfigs).toBeDefined();
        expect(pipeConfigs.length()).toBe(1);
    });
    it("should read all the '*.pipe.json' configs from specified directories.", () => {
        let pipeConfigs = new PipeConfigurations('tests/config');
        expect(pipeConfigs).toBeDefined();
        expect(pipeConfigs.length()).toBe(2);
    });
});