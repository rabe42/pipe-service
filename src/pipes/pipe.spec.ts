import {Pipe} from "./pipe";

describe("The basic pipe", () => {

    var aPipe: Pipe = undefined;

    it("should create a pipe", () => {
        aPipe = new Pipe("Test Pipe", ["http://x.y.z"]);
        expect(aPipe).toBeDefined();
    });
    it("should deliver merged connection properties", () => {
        let connectionProperties = aPipe.connectionParameter({host: "a.b.c"});
        expect(connectionProperties.host).toBe("a.b.c");
        expect(connectionProperties.port).toBe(5984);
    })
    it("should have a name", () => {
        expect(aPipe.name).toEqual("Test Pipe");
    });
    it("should have a destination", () => {
        expect(aPipe.destinations).toEqual(["http://x.y.z"]);
    });
    it("should save a simple payload", (done) => {
        aPipe.push("A first payload.", (err: any) => { 
                fail("With error: " + err);
                done(); 
            }, (res: any) => { 
                done(); 
            });
    });
    it("should save complex payloads", (done) => {
        var payload1 = {name: "Skywalker", firstName: "Anakin"};
        var payload2 = {name: "Skywalker", firstName: "Luke"};
        aPipe.push(payload1, null, null);
        aPipe.push(payload2, (err: any) => { 
                fail("With error: " + err);
                done(); 
            }, (res: any) => { 
                done(); 
            });
    });
    it("should substitute the space in the pibe name by underscores", () => {
        expect(aPipe.databaseName()).toBe("test_pipe");
    });
    it("should destroy the pipe", (done) => {
        aPipe.destroy((err: any) => {
            if (err) {
                fail("With error: " + err);
            }
            done();
        });
    });
    /*
    it("should retrieve the first payload", () => {
        fail("Not implemented yet!");
    });
    */
});
