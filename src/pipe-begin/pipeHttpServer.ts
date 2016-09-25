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
 * This is the http server, which accepts PUT and GET requests for different pipes.
 */
export class PipeHttpServer {
    port: number;
    hostname: string;
    pipeName: string;
    server: http.Server;
    pipe: Pipe;

    constructor(port: number, hostname: string, pipeName: string, callback: (err: any) => void) {
        this.port = port;
        this.hostname = hostname;
        this.pipeName = pipeName;
        this.server = http.createServer(this.serve);
        // This trick makes sure, that the serve() method works when the callback is called.
        (<any>this.server).service = this;
        this.start(callback);
    }

    /**
     * Creates the pipe and start listening. Call the callback, if both was finished or a error occured.
     */
    private start(callback: (err: Error) => void): void {
        async.series([
            (cb: () => void) => {
                // Creates the pipe
                this.pipe = new Pipe(this.pipeName);
                this.pipe.init(cb);
            },
            (cb: () => void) => {
                // Start listening after the pipe is created.
                this.server.listen(this.port, this.hostname, cb);
                logger.debug("PipeHttpServer.start(): Start listening on: %s:%s.", this.hostname, this.port);
            },
        ], (err: Error, result?: any) => {
            if (err) {
                logger.error("PipeHttpServer.start(): cannot start due to: '%s'");
            }
            else {
                logger.debug("PipeHttpServer.start(): Service for pipe '%s' (%s) successful established.",
                     this.pipeName, this.pipe.databaseName());
            }
            callback(err);
        });
    }

    /**
     * This is the central entry point for the management of the http request.
     * It distributes the requests to the different other methods "put", "get", "delete", "post".
     * @param req the incomming request.
     * @param res the request to be filled.
     */
    private serve(req: http.IncomingMessage, res: http.ServerResponse): void {
        logger.info("PipeHttpServer.serve(%s): %s service called.", req.url, req.method);
        if (req.method === "PUT") {
            (<any>this).service.put(req, res);
        }
        else if (req.method === "GET") {
            (<any>this).service.get(req, res);
        }
        else {
            logger.warn("Unsupported request method: " + req.method);
            res.statusCode = 404;
            res.setHeader("Content-Type", "text/plain");
            res.end("NOK");
        }
        logger.debug("PipeHttpServer.serve(%s): %s service end.", req.url, req.method);
    }

    /**
     * Providing status information about the pipe.
     * @param request <http.IncommingMessage> the request which specifies what to do.
     * @param response <http.ServerResponse> the response, where we handover the requested information.
     */
    private get(request: http.IncomingMessage, response: http.ServerResponse): void {
        logger.info("PipeHttpServer.get(%s)", request.url);
        try {
            if (request.url !== '/' + this.pipe.name) {
                logger.error("PipeHttpServer.get(): Try to access unmanaged pipe: '%s'", request.url);
                response.statusCode = 404;
                response.setHeader("Content-Type", "text/plain");
                response.end("Pipe not managed by this service.");
                return;
            }
            this.retrieveStatus(response);
        }
        catch (error) {
            logger.error("PipeHttpServer.get(): Cannot process result due to: " + error);
            throw error;
        }
        logger.debug("PipeHttpServer.get(%s): end", this.pipeName);
    }

    private retrieveStatusSync(response: http.ServerResponse): void {
        let statusDocument: any = {};
        statusDocument.name = this.pipe.name;
        statusDocument.length = 0;
        response.writeHead(200, {"Content-Type": "application/json"});
        response.end(JSON.stringify(statusDocument));
    }

    private retrieveStatus(response: http.ServerResponse): void {
        logger.debug("PipeHttpServer.retrieveStatus(): initiating request to pipe store...");
        this.pipe.length((err, res) => {
            logger.debug("PipeHttpServer.get(): pipeCallback called!");
            if (err) {
                this.handlePipeError(err, "retrieveStatus", response);
            }
            try {
                let statusDocument: any = {};
                statusDocument.name = this.pipe.name;
                statusDocument.length = res;
                let responseString = JSON.stringify(statusDocument);
                logger.debug("PipeHttpServer.get(): " + responseString);
                response.writeHead(200, {"Content-Type": "application/json"});
                response.end(JSON.stringify(statusDocument));
                logger.debug("PipeHttpServer.get(): response ended.");
            }
            catch (error) {
                logger.error("PipeHttpServer.get(): Exception during statistic gathering: " + error);
                throw error;
            }
        });
        logger.debug("PipeHttpServer.retrieveStatus(): request to pipe store initiated.");
    }

    private handlePipeError(err: any, method: string, response: http.ServerResponse): void {
        logger.error("PipeHttpServer.%s(): Failed to get length of pipe store due to: '%s'", method, err);
        response.setHeader("Content-Type", "text/plain");
        response.write(500, "Cannot access pipe store.");
        response.end("NOK");
        return;
    }

    /**
     * Handle the http-put request.
     * @param request The http request object.
     * @param response The http response object, where the result has to be communicated.
     */
    private put(request: http.IncomingMessage, response: http.ServerResponse): void {
        logger.info("PipeHttpServer.put(%s)", request.url);
        if (request.url !== '/' + this.pipe.name) {
            logger.error("PipeHttpServer.put(): Try to access unmanaged pipe: '%s'", request.url);
            response.statusCode = 404;
            response.end("Pipe not managed by this service.");
        }
        else {
            logger.debug("PipeHttpServer.put(): Saving data.")
            // Store the data asynchronously and providing the response back, when finished.
            let documentString = "";
            request.on("data", (chunk: string) => {
                logger.debug("PipeHttpServer.put(): read chunk '%s'", chunk);
                documentString += chunk;    // TODO: This is probably a OOM problem with big payloads!
            });
            request.on("end", () => {
                this.savePayload(JSON.parse(documentString), response);
            });
        }
    }

    private savePayload(payload: any, response: http.ServerResponse): void {
        logger.debug("PipeHttpServer.savePayload(): initiating save request.");
        this.pipe.push(payload, (err: Error, result: any) => {
            if (err) {
                logger.error("PipeHttpServer.savePayload(): Unable to save payload due to '%s'", err);
                response.statusCode = 500;
                response.end("NOK");
                return;
            }
            response.statusCode = 200;
            response.end("OK");
            logger.debug("PipeHttpServer.savePayload(): Completed successfuly.");
        });
        logger.debug("PipeHttpServer.savePayload(): save request initiated.");
    }

    public close() {
        logger.info("PipeHttpServer.close(): Closing http service for '%s' ...", this.pipeName);
        this.server.close();
        logger.info("PipeHttpServer.close(): http service for '%s' closed!", this.pipeName);
    }

    public destroyPipe(callback: PipeCallback) {
        this.pipe.destroy(callback);
    }
};