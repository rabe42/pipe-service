import * as http from "http";
import * as querystring from "querystring";

import {PipeHttpServer, pipeHttpServerSingleton} from "./pipeHttpServer";

describe("The pipe http server", () => {

    it("should not be possible to be a 2nd instance.", () => {
        try {
            var httpServer = new PipeHttpServer();
            fail("2nd instance created.");
        }
        catch (e) {};
    });
    it("should start the server", (done) => {
        try {
            pipeHttpServerSingleton.start((err) => {
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
    it("should accept requests", (done) => {
        let message = querystring.stringify({msg: "Hello Pipe", attribute: "attribute1", paramenter: "parameter1"});
        let clientRequest = http.request({hostname: "localhost", port: 8081, method: "PUT", path: "/hello"},
            (result: http.IncomingMessage) => {
                result.setEncoding('utf8');
                result.on('data', (chunk: any) => {
                    // Ignoring the answer... But this must be handled to get to the end.
                });
                result.on('end', () => { 
                    expect(result.statusCode).toBe(200);
                    done();
                 });
            });
        clientRequest.on('error', (err: any) => {
            fail("Request failed due to: " + err);
        });
        clientRequest.write(message);
        clientRequest.end();
    });
    it("should terminate the server", () => {
        pipeHttpServerSingleton.close();
    });
});