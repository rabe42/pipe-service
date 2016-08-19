/// <reference path="../typings/bunyan/bunyan.d.ts" />

import * as bunyan from "bunyan";
import * as http from "http"; 

import {pipeHttpServerLoggerConfig} from "./loggerConfig";

var logger = bunyan.createLogger(pipeHttpServerLoggerConfig);

export class PipeHttpServer {

    server: any;
    port: number = 8080;
    hostname: string = "localhost";

    constructor() {
        this.server = http.createServer(this.serve); 
    }

    private serve(req: any, res: any): void {
        logger.info("PipeHttpServer.serve(): Service called.");
    }

    public start(callback: (err: any) => void) {
        this.server.listen(this.port, this.hostname, (err: any) => {
            if (err) {
                logger.error("PipeHttpServer.start(): Couldn't start server due to: " + err);
            }
            callback(err);
        });
        logger.info("PipeHttpServer.start(): Starting service...");
    }
}