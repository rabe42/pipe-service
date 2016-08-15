import {Pipe} from "./pipe";

describe("The pipe interface:", () => {

    var aPipe: Pipe = undefined;
    var aFailedPipe: Pipe = undefined;

    it("should create a pipe", () => {
        aPipe = new Pipe("Test Pipe", ["http://x.y.z"]);
        expect(aPipe).toBeDefined();
    });
    it("should not fail to create the pipe on a port without database", () => {
        // Due to lazy logic, this shouldn't fail.
        aFailedPipe = new Pipe("A Failed Pipe", ["http://a.b.c"], {port: 12345});
        expect(aFailedPipe.dbSpec.port).toBe(12345);
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
        aPipe.push("A first payload.", (err: any, res: any) => { 
            if (err) {
                fail("With error: " + err);
            }
            done(); 
        });
    });
    it("should not save a simple payload to a the failed pipe", (done) => {
        aFailedPipe.push("A simple payload.", (err: any, res: any) => {
            if (!err) {
                fail("Saving without database possible.")
            }
            done();
        })
    });
    it("should save complex payloads", (done) => {
        var payload1 = {name: "Skywalker", firstName: "Anakin"};
        var payload2 = {name: "Skywalker", firstName: "Luke"};
        aPipe.push(payload1);
        aPipe.push(payload2, (err: any, res: any) => { 
            if (err) {
                fail("With error: " + err);
            }   
            done(); 
        });
    });
    it("should substitute the space in the pibe name by underscores", () => {
        expect(aPipe.databaseName()).toBe("test_pipe");
    });
    it("should not be possible to destroy a non empty pipe database", (done) => {
        aPipe.destroy((err: any) => {
            if (!err) {
                fail("Shouldn't be possible to destroy.")
            }
            done();
        });
    });
    it("should force to destroy the pipe", (done) => {
        aPipe.destroy((err: any) => {
            if (err) {
                fail("With error: " + err);
            }
            done();
        }, true);
    });
    it("should not be possible to destroy the failed pipe.", (done) => {
        aPipe.destroy((err: any) => {
            if (!err) {
                fail("It is possible to destroy a non existing database.");
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
