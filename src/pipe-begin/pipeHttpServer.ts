/// <reference path="../../typings/bunyan/bunyan.d.ts" />
/// <reference path="../../typings/async/async.d.ts"/>

import * as bunyan from "bunyan";
import * as http from "http"; 
import * as async from "async";

import {pipeHttpServerLoggerConfig} from "../loggerConfig";
import {ListenerConfig, PipeConfig, pipes} from "../pipeConfig";
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
    server: any;
    pipeConfigs: PipeConfig[] = [];
    pipeInstances: Pipe[] = [];

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
        else if (req.method === "GET") {
            this.get(req, res);
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
        response.statusCode = 200;
        response.end("end");
    }

    /**
     * Start all the configured pipe begin services.
     * @param callback Will be called, if the services are started.
     */
    public start(callback: (err: any) => void) {
        logger.info("PipeHttpServer.start(): Starting service...");
        this.readConfig();
        async.series([
            (cb) => {
                this.createPipes(cb);
            },
            (cb) => {
                logger.debug("PipeHttpServer.start(): start listening...");
                // TODO: Create a server for every individual configured server port.
                // Unfortunately, this requires a different approach!
                server.listen(8081, "localhost", cb);
            }
        ], (err: any) => {
            if (err) {
                logger.error("PipeHttpServer.start(): Couldn't start server due to: " + err);
            }
            callback(err);
        });
    }

    public close() {
        server.close();
    }

    /**
     * Reads all begin configuration type 'http'.
     */
    private readConfig(): void {
        logger.debug("PipeHttpServer.readConfig()");
        this.pipeConfigs = [];
        pipes.forEach((element: PipeConfig) => {
            if (element.beginType === 'http') {
                logger.debug("PipeHttpServer.readConfig(): " + element.name + " " + element.description 
                            + "(" + (<ListenerConfig>element.beginConfig).hostname
                            + ":" + (<ListenerConfig>element.beginConfig).port + ")");
                this.pipeConfigs.push(element);
            }
        });
        logger.debug("PipeHttpServer.readConfig(): finished.")
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

export const pipeHttpServerSingleton: PipeHttpServer = new PipeHttpServer();

const server = http.createServer((request: http.IncomingMessage, response: http.ServerResponse) => {
    pipeHttpServerSingleton.serve(request, response);
});
