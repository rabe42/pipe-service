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

    function request(method: string, port: number, expectedResponse: string, expectedStatus: number, callback: () => void): void {
        var responseConent = "";
        let clientRequest = http.request({hostname: "localhost", port: port, method: method, path: "/"},
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

    class MyServer {
        port: number;
        server: any;

        constructor(port: number) {
            this.port = port;
            this.server = http.createServer(this.serve);
            // Adding the parent to the server instace, provides access to this object later on.
            this.server.parent = this;
            this.server.listen(this.port, "localhost");
        }
        /** 
         * This is an alien!
         */
        private serve(request: http.IncomingMessage, response: http.ServerResponse) {
            // Casting the this to the parent object, as this will be the server at the point, the method is called.
            if (request.method === "GET") {
                (<any>this).parent.get(request, response);
            }
            else if (request.method === "PUT") {
                (<any>this).parent.put(request, response);
            }
            else if (request.method === "POST") {
                (<any>this).parent.post(request, response);
            }
            else if (request.method === "DELETE") {
                (<any>this).parent.delete(request, response);
            }
        }
        get(request: http.IncomingMessage, response: http.ServerResponse) {
            response.statusCode = 200;
            response.end("GET processed! (" + this.port + ")");
        }
        put(request: http.IncomingMessage, response: http.ServerResponse) {
            response.statusCode = 200;
            response.end("PUT processed! (" + this.port + ")");
        }
        post(request: http.IncomingMessage, response: http.ServerResponse) {
            response.statusCode = 200;
            response.end("POST processed! (" + this.port + ")");
        }
        delete(request: http.IncomingMessage, response: http.ServerResponse) {
            response.statusCode = 200;
            response.end("DELETE processed! (" + this.port + ")");
        }
        close() {
            this.server.close();
        }
    }
    var myserver1: MyServer = new MyServer(8083);
    var myserver2: MyServer = new MyServer(8084);

    it("should be possible to request server1 only.", (done) => {
        request("GET", 8081, "Ok1", 200, done);
    });
    it("should have been really called 1st service.", () => {
        expect(server1Request).toBeDefined();
        expect(server2Request).toBeUndefined();
    });
    it("should be possible to request server2 only", (done) => {
        request("PUT", 8082, "Ok2", 200, done);
    });
    it("should have been really called 2nd service.", () => {
        expect(server1Request).toBeDefined();
        expect(server2Request).toBeDefined();
    });
    it("should be possible to close the services.", () => {
        server1.close();
        server2.close();
    });
    it("should be possible to use an instance context of a class.", (done) => {
        request("GET", 8084, "GET processed! (8084)", 200, done);
    });
    it("should be possible to use also the other instance.", (done) => {
        request("PUT", 8083, "PUT processed! (8083)", 200, done);
    })
    it("should be possible to close my servers.", () => {
        myserver1.close();
        myserver2.close();
    });
});