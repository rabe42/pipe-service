/// <reference path="../typings/jasmine/jasmine.d.ts"/>
import {loadPipeConfig} from "./pipeConfig";

describe("Load pipe config", () => {
    it("should read all the json configs from the default directory.", () => {
        let pipeConfigs = loadPipeConfig();
        expect(pipeConfigs).toBeDefined();
        expect(pipeConfigs.length).toBe(1);
        expect(pipeConfigs[0].name).toBe('sample');
        expect(pipeConfigs[0].beginType).toBe('http');
        expect(pipeConfigs[0].endType).toBe('file');
    });
    it("should read all the '*.pipe.json' configs from specified directories.", () => {
        let pipeConfigs = loadPipeConfig('tests/config');
        expect(pipeConfigs).toBeDefined();
        expect(pipeConfigs.length).toBe(2);
    });
});