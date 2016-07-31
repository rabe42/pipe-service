import {Pipe} from "./pipe";

describe("The basic pipe", () => {

    const aPipe: Pipe = new Pipe("Test Pipe", ["http://x.y.z"]);

    it("should have a name", () => {
        expect(aPipe.name).toEqual("Test Pipe");
    });
    it("should have a destination", () => {
        expect(aPipe.destinations).toEqual(["http://x.y.z"]);
    });
    it("should use the default CouchDB", () => {
        expect(aPipe.couchDbUrl).toEqual("http://localhost:5984/pipes");
    });
    it("should save the payload", () => {
        aPipe.push("A first payload.");
//        expect(aPipe).
    });
});
