/// <reference path="../../typings/jasmine/jasmine.d.ts"/>

import * as http from "http";
import * as querystring from "querystring";

import {PipeHttpServer} from "./pipeHttpServer";

describe("The pipe http server", () => {

    let pipeServer1: PipeHttpServer;
    let testDocument = {msg: "Hello Pipe", attribute: "attribute1", paramenter: "parameter1"};

    function request(pipe: string, expectedStatusCode: number, expectedResponse: string, done: () => void) {
        let serverResponse: string = "";
        let clientRequest = http.request({hostname: "localhost", port: 8081, method: "PUT", path: pipe},
            (result: http.IncomingMessage) => {
                result.setEncoding('utf8');
                result.on('data', (chunk: string) => {
                    serverResponse += chunk;
                });
                result.on('end', () => { 
                    expect(result.statusCode).toBe(expectedStatusCode);
                    expect(serverResponse).toBe(expectedResponse);
                    done();
                 });
            });
        clientRequest.on('error', (err: any) => {
            fail("Request failed due to: " + err);
            done();
        });
        clientRequest.write(JSON.stringify(testDocument));
        clientRequest.end();
    }

    it("should start a server", (done) => {
        pipeServer1 = new PipeHttpServer(8081, "localhost", "serverTest1", (err) => {
            if (err) {
                fail("error occured: " + err);
            }
            done();
        });
    });
    it("should accept requests and fail, if not correctly placed.", (done) => {
        request("/hello", 404, "Pipe not managed by this service.", done);
    });
    it("should store the document.", (done) => {
        request("/serverTest1", 200, "Ok", done);
    });
    it("should terminate the server", () => {
        pipeServer1.close();
    });
});