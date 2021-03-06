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
    it("should provide the http begin types in the configuration directories.", () => {
        let pipeConfigs = new PipeConfigurations('tests/config');
        expect(pipeConfigs.findBeginByType('http').length).toBe(1);
        expect(pipeConfigs.findBeginByType('file').length).toBe(0);
    });
    it("should provide the file end types.", () => {
        let pipeConfigs = new PipeConfigurations('tests/config');
        expect(pipeConfigs.findEndByType('file').length).toBe(1);
        expect(pipeConfigs.findEndByType('http').length).toBe(0);
    });
});