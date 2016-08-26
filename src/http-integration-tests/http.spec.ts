/// <reference path="../../typings/jasmine/jasmine.d.ts"/>
/// <reference path="../../typings/async/async.d.ts" />

import * as async from "async";
import * as http from "http";

describe("http service", () => {
    var server1Request: http.IncomingMessage;
    var server1: http.Server = http.createServer((request: http.IncomingMessage, response: http.ServerResponse) => {
        server1Request = request;
        response.statusCode = 200;
        response.end("Ok1");
    });
    server1.listen(8081, "localhost");
    var server2Request: http.IncomingMessage;
    var server2: http.Server = http.createServer((request: http.IncomingMessage, response: http.ServerResponse) => {
        server2Request = request;
        response.statusCode = 200;
        response.end("Ok2");
    });
    server2.listen(8082, "localhost");

    function request(port: number, expectedResponse: string, expectedStatus: number, callback: () => void): void {
        var responseConent = "";
        let clientRequest = http.request({hostname: "localhost", port: port, method: "PUT", path: "/"},
            (result: http.IncomingMessage) => {
                result.setEncoding('utf8');
                result.on('data', (chunk: any) => {
                    responseConent += chunk;
                });
                result.on('end', () => { 
                    expect(responseConent).toBe(expectedResponse);
                    expect(result.statusCode).toBe(expectedStatus);
                    callback();
                 });
            });
        clientRequest.on('error', (err: any) => {
            fail("Request failed due to: " + err);
        });
        clientRequest.end();
    };

    it("should be possible to request server1 only.", (done) => {
        request(8081, "Ok1", 200, done);
    });
    it("should have been really called 1st service.", () => {
        expect(server1Request).toBeDefined();
        expect(server2Request).toBeUndefined();
    });
    it("should be possible to request server2 only", (done) => {
        request(8082, "Ok2", 200, done);
    });
    it("should have been really called 2nd service.", () => {
        expect(server1Request).toBeDefined();
        expect(server2Request).toBeDefined();
    });
    it("should be possible to close the services.", () => {
        server1.close();
        server2.close();
    });
});