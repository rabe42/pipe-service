/// <reference path="../../typings/jasmine/jasmine.d.ts"/>

import * as http from "http";
import * as querystring from "querystring";

import {PipeHttpServer} from "./pipeHttpServer";

describe("The pipe http server", () => {

    let pipeServer1: PipeHttpServer;

    it("should start a server", (done) => {
        pipeServer1 = new PipeHttpServer(8081, "localhost", "serverTest1", (err) => {
            if (err) {
                fail("error occured: " + err);
            }
            done();
        });
    });
    it("should accept requests and fail, if not correctly placed.", (done) => {
        let serverResponse: string = "";
        let message = querystring.stringify({msg: "Hello Pipe", attribute: "attribute1", paramenter: "parameter1"});
        let clientRequest = http.request({hostname: "localhost", port: 8081, method: "PUT", path: "/hello"},
            (result: http.IncomingMessage) => {
                result.setEncoding('utf8');
                result.on('data', (chunk: string) => {
                    serverResponse += chunk;
                });
                result.on('end', () => { 
                    expect(result.statusCode).toBe(404);
                    expect(serverResponse).toBe("Pipe not managed by this service.");
                    done();
                 });
            });
        clientRequest.on('error', (err: any) => {
            fail("Request failed due to: " + err);
            done();
        });
        clientRequest.write(message);
        clientRequest.end();
    });
    /*
    it("should deliver the pipes configured at this node.", (done) => {
        let clientRequest = http.request({hostname: "localhost", port: 8081, method: "GET", path: "/"},
            (result: http.IncomingMessage) => {
                result.setEncoding('utf8');
                result.on('data', (chunk: any) => {
                    // TODO: Check if the right content was delivered.
                });
                result.on('end', () => {
                    expect(result.statusCode).toBe(200);
                    done();
                });
            });
        clientRequest.end();
    });
    */
    it("should terminate the server", () => {
        pipeServer1.close();
    });
});