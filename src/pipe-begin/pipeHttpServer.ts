/// <reference path="../../typings/bunyan/bunyan.d.ts" />
/// <reference path="../../typings/async/async.d.ts"/>

import * as bunyan from "bunyan";
import * as http from "http"; 
import * as async from "async";

import {pipeHttpServerLoggerConfig} from "../loggerConfig";
import {ListenerConfig, PipeConfig} from "../pipeConfig";
import {Pipe, PipeCallback} from "../pipes/pipe";

var logger = bunyan.createLogger(pipeHttpServerLoggerConfig);

/**
 * This is the http server, which accepts messages for certain pipes.
 * 
 * TODO Store message
 * TODO Create server response
 * TODO Provide status information (queue-names, queue sizes)
 */
export class PipeHttpServer {
    port: number;
    hostname: string;
    pipeName: string;
    server: http.Server;
    pipe: Pipe;
    pipeConfigs: PipeConfig[] = [];
    pipeInstances: Pipe[] = [];

    constructor(port: number, hostname: string, pipeName: string, callback: (err: any) => void) {
        this.port = port;
        this.hostname = hostname;
        this.pipeName = pipeName;
        this.server = http.createServer(this.serve);
        (<any>this.server).parent = this;
        this.start(callback);
    }

    /**
     * Creates the pipe and start listening. Call the callback, if both was finished or a error occured.
     */
    private start(callback: (err: any) => void): void {
        async.series([
            (cb) => {
                // Creates the pipe
                this.pipe = new Pipe(this.pipeName);
                this.pipe.init(cb);
            },
            (cb) => {
                // Start listening
                this.server.listen(this.port, this.hostname, cb);
            },
        ], (err: any) => {
            if (err) {
                logger.error("PipeHttpServer.start(): cannot start due to: " + err);
            }
            callback(err);
        });
    }

    /**
     * This is the central entry point for the management of the http request.
     * It distributes the requests to the different other methods "put", "get", "delete", "post".
     */
    private serve(req: http.IncomingMessage, res: http.ServerResponse): void {
        logger.info("PipeHttpServer.serve(): Service called.");
        if (req.method === "PUT") {
            (<any>this).parent.put(req, res);
        }
        else if (req.method === "GET") {
            (<any>this).parent.get(req, res);
        }
        else {
            logger.warn("Unsupported request method: " + req.method);
            res.statusCode = 404;
            res.setHeader("Content-Type", "text/plain");
            res.end("Hello from the pipe world!")
        }
    }

    private get(request: http.IncomingMessage, response: http.ServerResponse) {
        logger.info("PipeHttpServer.get(): Asked for statistics on: " + request.url);
        response.statusCode = 200;
        response.end();
    }

    /**
     * Handle the http-put request.
     * @param request The http request object.
     * @param response The http response object, where the result has to be communicated.
     */
    private put(request: http.IncomingMessage, response: http.ServerResponse): void {
        logger.info("PipeHttpServer.put(): Service called.")
        if (request.url !== this.pipe.name) {
            response.statusCode = 404;
            response.end("Pipe not managed by this service.");
        }
        else {
            response.statusCode = 200;
            // TODO Store the data in the pipe here!
            // Check, if the pipe is managed by this service.
            // Store the data asynchronously and providing the response back, when finished.

            response.end("end");
        }
    }

    public close() {
        this.server.close();
    }

    /**
     * Creates the configured pipes.
     */
    private createPipes(callback: PipeCallback): void {
        logger.debug("PipeHttpServer.createPipes()");
        this.pipeInstances = [];
        let initCalls: any[] = [];
        this.pipeConfigs.forEach((config: PipeConfig) => {
            let newPipe: Pipe = new Pipe(config.name);
            this.pipeInstances.push(newPipe);
            logger.debug("PipeHttpServer.createPipes(): Pipe with name: " + config.name + " created.");
            initCalls.push((cb: any) => {
                // TODO: The problem here is, how to handover the newPipe to this callback?
                logger.debug("PipeHttpServer.createPipes(): initializing pipe named: " + newPipe.name);
                newPipe.init(cb);
            });
        });
        async.parallel(initCalls, (err: any) => {
            logger.debug("PipeHttpServer.createPipes(): All pipes initialized or err: " + err);
            if (err) {
                logger.error("PipeHttpServer.createPipes(): initialization error: " + err);
            }
            callback(err);
        });
        logger.debug("PipeHttpServer.createPipes(): end.");
    }
};