import * as bunyan from "bunyan"
import * as http from "http";

import {Pipe} from "../pipes/pipe"
import {pipePullHttpClient} from "../loggerConfig"
import {CircuitBreaker, ServiceCall, EH, SH} from '../circuit-breaker/circuitBreaker'

var logger = bunyan.createLogger(pipePullHttpClient)

function processRequest(theRequest: any, theClient: PipePullHttpClient) {

}

/**
 * This begin http client is part of the pull strategy of the pipe network.
 * It allows to access a hub and ask for data there.
 * 
 * FIXME
 * This needs a circuit breaker to database and to the communication hub. As 
 * both may be unavailable for a certain time.
 */
export class PipePullHttpClient implements ServiceCall {
    pipe: Pipe
    hubHostname: string         // The name of the host, which delivers the messages
    hubPortNo: number           // The port number, where the data will be provided.
    timeout: number             // How long to wait maximum.
    dbTimeout: number           // How long to wait for the database
    retryInterval: number       // How often to retry to get a certain message. ???
    requestRunning = false
    private theInterval: NodeJS.Timer
    private circuitBreaker: CircuitBreaker

    // Connection request timeout
    // Connection frequency
    
    /**
     * Creates a pull client, which will fetch the data from the given hub.
     * @param pipe The pipe where the message will go into.
     * @param hubHostname The hostname of the hub.
     * @param hubPortNo The port number of the hub.
     * @param timeout The timeout (how long do we wait)
     * @param retryInterval The interval where we do the retry.
     */
    constructor(pipe: Pipe, hubHostname = "localhost", hubPortNo = 6513, timeout = 1000, retryInterval = 600, errorHandler: EH = undefined, successHandler: SH = undefined) {
        if (!pipe) {
            throw new Error("No pipe provided!")
        }
        this.pipe = pipe
        this.setHubHostname(hubHostname, errorHandler, successHandler)
        this.setHubPort(hubPortNo)
        this.hubPortNo = hubPortNo
        this.timeout = timeout
        this.retryInterval = retryInterval
    }

    /**
     * Starts the communication to the communication hub. 
     * If available at the check point in time, it retrieves all messages, whicha are available.
     * After this initial burst, it waits the configured retryInterval and than again tries to 
     * retrive as much as possible.
     */
    public start(errorHandler: (err: Error) => void, success: (payload: any) => void) {
        logger.debug("PipePullHttpClient.start()")
        // Creates an CircuitBreaker
        this.circuitBreaker = new CircuitBreaker("PipePullHttpClient", 1000)
        this.circuitBreaker.setCall(this)
        // Schedule the calls.
        this.theInterval = setInterval((self) => {
            // NOTE: As we have no concurrent execution, but an event loop, this approach is save!
            if (!self.requestRunning) {
                self.requestRunning = true
                logger.info('PipePullHttpClient.start(): called in interval.')
                self.getRequest((err: Error) => {
                    errorHandler(err)
                    self.requestRunning = false
                }, (result: any) => {
                    success(result)
                    self.requestRunning = false
                })
            }
        }, this.retryInterval, this)
        this.theInterval.unref()
    }

    /**
     * Stopps furture pull requests.
     */
    public stop() {
        logger.info("PipePullHttpClient.stop(): Client stopped.")
        clearInterval(this.theInterval)
    }

    /**
     * The interface for use by the circuite breaker.
     * @param errorHandler Callback for errors.
     * @param successHandler Callback with the result in case of success.
     */
    public callService(errorHandler: EH, successHandler: SH) {
        this.getRequest(errorHandler, successHandler)
    }

    /**
     * Pull call to the HUB.
     * @param errorHandler Callback for errors.
     * @param success Callback with the result in case of success.
     */
    private getRequest(errorHandler: EH, success: SH) {
        logger.info("PipePullHttpClient.getRequest(%s): Start get request...", this.pipe)
        let serverResponse: string

        let theRequest = http.request({host: this.hubHostname, port: this.hubPortNo, path: "/", /*timeout: this.timeout*/}, 
            (result: http.IncomingMessage) => {
                // Try to retrieve the data and store it into the Pipe.
                result.setEncoding('utf8')
                result.on('data', (chunk: string) => {
                    serverResponse += chunk
                })
                result.on('end', () => { 
                    logger.debug("PipePullHttpClient.getRequest(%s): Received response.", this.pipe)
                    let resp = JSON.parse(serverResponse)
                    this.requestRunning = false
                    success(resp)
                })
            })
        theRequest.on('error',
            (err: Error) => {
                logger.error("PipePullHttpClient.getRequest(%s): failed due to: %s", this.pipe, err)
                this.requestRunning = false
                errorHandler(err)
            })
    }

    /**
     * Set the hostname, if the host is reachable.
     * 
     * @param hubHostname The host name of the hub.
     * @param errorHandler Called, if the hostname isn't reachable.
     * @param successHandler Called, if the host was reachable.
     */
    private setHubHostname(hubHostname: string, errorHandler: EH, successHandler: SH) {
        if (!hubHostname) {
            throw new Error("A valid hostname must be provided.")
        }
        // TODO: Check, if the host is reachable.
        this.hubHostname = hubHostname
        if (successHandler) {
            setImmediate(successHandler, true)
        }
    }

    private setHubPort(hubPortNo: number) {
        if (!hubPortNo) {
            throw new Error("A valid port number must be provided.")
        }
        this.hubPortNo = hubPortNo
    }
}