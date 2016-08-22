/// <reference path="../../typings/bunyan/bunyan.d.ts" />

import * as bunyan from "bunyan";
import * as http from "http"; 

import {pipeHttpServerLoggerConfig} from "../loggerConfig";
import {ListenerConfig, PipeConfig, pipes} from "../pipeConfig";

var logger = bunyan.createLogger(pipeHttpServerLoggerConfig);

/**
 * This is the http server, which accepts messages for certain pipes.
 * 
 * TODO Read pipe configuration
 * TODO Create server response
 */
export class PipeHttpServer {
    server: any;
    port: number = 8081;
    hostname: string = "localhost";
    pipeConfigs: PipeConfig[] = [];

    constructor() {
        if (pipeHttpServerSingleton) {
            throw Error("It's not allowed to create a second instance.")
        }
        this.readConfig();
    }

    /**
     * This is the central entry point for the management of the http request.
     * It distributes the requests to the different other methods "put", "get", "delete", "post".
     */
    public serve(req: http.IncomingMessage, res: http.ServerResponse): void {
        logger.info("PipeHttpServer.serve(): Service called.");
        if (req.method === "PUT") {
            this.put(req, res);
        }
        else {
            res.statusCode = 404;
            res.setHeader("Content-Type", "text/plain");
            res.end("Hello from the pipe world")
        }
    }

    private put(request: http.IncomingMessage, response: http.ServerResponse): void {
        logger.info("PipeHttpServer.put(): Service called.")
        response.statusCode = 200;
        response.end("end");
    }

    public start(callback: (err: any) => void) {
        this.readConfig();
        server.listen(this.port, this.hostname, (err: any) => {
            if (err) {
                logger.error("PipeHttpServer.start(): Couldn't start server due to: " + err);
            }
            callback(err);
        });
        logger.info("PipeHttpServer.start(): Starting service...");
    }

    public close() {
        server.close();
    }

    /**
     * Reads all begin configuration type 'http'.
     */
    private readConfig(): void {
        pipes.forEach((element: PipeConfig) => {
            if (element.beginType === 'http') {
                this.pipeConfigs.push(element);
            }
        });
    }
};

export const pipeHttpServerSingleton: PipeHttpServer = new PipeHttpServer();

const server = http.createServer((request: http.IncomingMessage, response: http.ServerResponse) => {
    pipeHttpServerSingleton.serve(request, response);
});
