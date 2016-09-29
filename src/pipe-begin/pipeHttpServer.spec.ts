/// <reference path="../../typings/jasmine/jasmine.d.ts"/>
/// <reference path="../../typings/bunyan/bunyan.d.ts"/>

import * as http from "http";
import * as querystring from "querystring";
import * as bunyan from "bunyan";

import {pipeHttpServerLoggerConfig} from "../loggerConfig";
import {PipeHttpServer} from "./pipeHttpServer";

var logger = bunyan.createLogger(pipeHttpServerLoggerConfig);

describe("The pipe http server", () => {

    let pipeServer1: PipeHttpServer;
    let testDocument = {msg: "Hello Pipe", attribute: "attribute1", paramenter: "parameter1"};

    function putRequest(pipe: string, expectedStatusCode: number, expectedResponse: string, done: () => void) {
        logger.debug("pipeHttpServer.spec: putRequest(%s): Start request.", pipe);
        let callback = (result: http.IncomingMessage) => {
            let serverResponse: string = "";

            result.setEncoding('utf8');

            result.on('data', (chunk: string) => {
                serverResponse += chunk;
            });

            result.on('end', () => { 
                expect(result.statusCode).toBe(expectedStatusCode);
                expect(serverResponse).toBe(expectedResponse);
                return done();
            });
        };
        let clientRequest = http.request({hostname: "localhost", port: 8071, method: "PUT", path: '/' + pipe}, callback);
            
        clientRequest.on('error', (err: any) => {
            logger.error("pipeHttpServer.spec: putRequest(): failed due to: " + err);
            fail("Request failed due to: " + err);
            return done();
        });

        let strDoc = JSON.stringify(testDocument);
        clientRequest.write(strDoc);
        clientRequest.end();
    }

    function getRequest(pipe: string, expectedStatusCode: number, expectedSize: number, done: () => void): void {
        logger.debug("pipeHttpServer.spec: getRequest(%s): Start request.", pipe);
        let serverResponse: string = "";
        let clientRequest = http.request({hostname: "localhost", port: 8071, method: "GET", path: '/' + pipe},
            (result: http.IncomingMessage) => {
                result.setEncoding('utf8');
                result.on('data', (chunk: string) => {
                    serverResponse += chunk;
                });
                result.on('end', () => { 
                    logger.debug("pipeHttpServer.spec: getRequest(%s): Received response.", pipe);
                    expect(result.statusCode).toBe(expectedStatusCode);
                    let resp = JSON.parse(serverResponse);
                    expect(resp.name).toBe(pipe);
                    expect(resp.length).toBe(expectedSize);
                    done();
                 });
            });
        clientRequest.on('error', (err: Error) => {
            logger.error("pipeHttpServer.spec: getRequest(%s): failed due to: %s", pipe, err);
            fail("Request failed due to: " + err);
            done();
        });
        clientRequest.end();
    }

    it("should start a server.", (done) => {
        logger.debug("pipeHttpServer.spec: 1");
        pipeServer1 = new PipeHttpServer(8071, "localhost", "serverTest1", (err) => {
            if (err) {
                fail("error occured: " + err);
            }
            done();
        });
        logger.debug("pipeHttpServer.spec: 1 end");
    });
    it("should deliver the status.", (done) => {
        logger.debug("pipeHttpServer.spec: 2");
        getRequest("serverTest1", 200, 0, done);
        logger.debug("PipeHttpServer.spec: 2 end");
    });
    it("should accept requests and fail, if pipe is not managed by the service.", (done) => {
        logger.debug("pipeHttpServer.spec: 3");
        putRequest("hello", 404, "Pipe not managed by this service.", done);
        logger.debug("PipeHttpServer.spec: 3 end");
    });
    it("should deliver the status.", (done) => {
        logger.debug("pipeHttpServer.spec: 4");
        getRequest("serverTest1", 200, 0, done);
        logger.debug("pipeHttpServer.spec: 4 end");
    });
    it("should store the document.", (done) => {
        logger.debug("pipeHttpServer.spec: 5");
        putRequest("serverTest1", 200, "OK", done);
        logger.debug("pipeHttpServer.spec: 5 end");
    });
    it("should deliver the status.", (done) => {
        logger.debug("pipeHttpServer.spec: 6");
        getRequest("serverTest1", 200, 1, done);
        logger.debug("pipeHttpServer.spec: 6 end");
    });
    it("should terminate the server.", (done) => {
        logger.debug("pipeHttpServer.spec: 7");
        setTimeout(() => {
            pipeServer1.close();
            done();
        }, 500);
        logger.debug("pipeHttpServer.spec: 7 end");
    });
    it("should destroy the pipe.", (done) => {
        logger.debug("pipeHttpServer.spec: 8");
        pipeServer1.destroyPipe(done);
        logger.debug("pipeHttpServer.spec: 8 end");
    });
});