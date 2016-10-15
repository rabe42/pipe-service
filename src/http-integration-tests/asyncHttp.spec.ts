/// <reference path="../../typings/jasmine/jasmine.d.ts"/>
/// <reference path="../../typings/bunyan/bunyan.d.ts"/>

import * as async from "async";
import * as http from "http";
import * as bunyan from "bunyan";
import {Pipe} from "../pipes/pipe";
import {pipeHttpServerLoggerConfig} from "../loggerConfig";

var logger = bunyan.createLogger(pipeHttpServerLoggerConfig);

describe("A asynchronous http service", () => {
    let server1Request: http.IncomingMessage;
    let server1: http.Server = http.createServer((request: http.IncomingMessage, response: http.ServerResponse) => {
        logger.debug("asyncHttp.spec.server1.createServer.callback(%s): processing request.", request.url);
        server1Request = request;
        setTimeout(() => {
            logger.debug("asyncHttp.spec.server1.createServer.callback(%s): timeout begin.", request.url);
            response.statusCode = 200;
            response.end("Ok1");
            logger.debug("asyncHttp.spec.server1.createServer.callback(%s): timeout end.", request.url);
        }, 600);
        logger.debug("asyncHttp.spec.server1.createServer.callback(%s): processing request end.", request.url);
    });
    server1.listen(9091, "localhost");

    let pipe: Pipe;

    let server2: http.Server = http.createServer((request: http.IncomingMessage, response: http.ServerResponse) => {
        logger.debug("asyncHttp.spec.server2.createServer.callback(%s): processing request.", request.url);
        pipe = new Pipe("asyncTest");
        async.series([
            (cb) => {
                pipe.init(cb);
            },
            (cb) => {
                pipe.length(cb);
            }
        ], (err, res) => {
            if (err) {
                logger.error("asyncHttp.spec.server2.createServer.callbakc(%s): faile with '%s'", request.url, err);
                response.statusCode = 500;
                response.end("NOK");
            }
            else {
                logger.debug("asyncHttp.spec.server2.createServer.callback(%s): succeded.", request.url);
                response.statusCode = 200;
                response.end("Ok:" + res[1]);
            }
        });
    });
    server2.listen(9092, "localhost");

    function request(method: string, port: number, expectedResponse: string, expectedStatus: number, callback: () => void): void {
        let responseContent = "";
        let clientRequest = http.request({hostname: "localhost", port: port, method: method, path: "/"},
            (result: http.IncomingMessage) => {
                result.setEncoding('utf8');
                result.on('data', (chunk: any) => {
                    responseContent += chunk;
                });
                result.on('end', () => { 
                    expect(responseContent).toBe(expectedResponse);
                    expect(result.statusCode).toBe(expectedStatus);
                    callback();
                 });
            });
        clientRequest.on('error', (err: any) => {
            fail("Request failed due to: " + err);
            callback();
        });
        clientRequest.end();
    };

    it("should be possible to request server1 only.", (done) => {
        request("GET", 9091, "Ok1", 200, done);
    });
    it("should have been really called 1st service.", () => {
        expect(server1Request).toBeDefined();
        server1Request = undefined;
    });
    it("should be possible to request server2 only", (done) => {
        request("PUT", 9091, "Ok1", 200, done);
    });
    it("should have been really called 2nd service.", () => {
        expect(server1Request).toBeDefined();
        server1Request = undefined;
    });
    it("should be possible to close the services.", () => {
        server1.close();
    });
    it("should be possible to contact another service.", (done) => {
        request("GET", 9092, "Ok:0", 200, done);
    })
    it("should be possible to close the 2nd service.", () => {
        server2.close();
    });
    it("should be possible to destroy the pipe.", (done) => {
        pipe.destroy(done);
    });
});