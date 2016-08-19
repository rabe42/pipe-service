import {PipeHttpServer} from "./pipeHttpServer";

describe("The pipe http server", () => {

    var httpServer: PipeHttpServer;

    it("should be possible to be created.", () => {
        httpServer = new PipeHttpServer();
        expect(httpServer).toBeDefined();
    });
    it("should start the server", (done) => {
        try {
            httpServer.start((err) => {
                if (err) {
                    fail("Wasn't able to start server due to: " + err);
                }
                done();
            });
        }
        catch (error) {
            fail("Wasn't able to start the server as I catched: " + error);
        }
    });
});