/**
 * @author Dr.-Ing. Ralf Berger 2017
 * 
 * This is a circuit breaker implementation, inspired by Michael T. Nygard - Release IT.
 */
import * as bunyan from "bunyan"
import {circuitBreaker} from "../loggerConfig"

let logger = bunyan.createLogger(circuitBreaker)

export type SH = (result: any) => void
export type EH = (error: Error) => void

/**
 * The circuit breaker is intended for the operation of connections to a service. 
 * If the service fails to deliver for some time (failuserThreshold), the connections will only 
 * restarted after the retry period, provided in milliseconds, is over.
 */
export class CircuitBreaker {
    private name: string
    private retry: number
    private failureThreshold: number
    private failureCount: number
    private serviceCall: (errorHandler: EH, successHandler: SH) => void
    private lastErrorTimestamp: number

    /**
     * Creates a cicuit breaker for the given service call.
     * @param name The name of the cicuit breaker. This makes it easier to identify failures in the log.
     * @param serviceCall A function, which has to be called and may fail.
     * @param retryInMillis The time which must elapse before the opened circuit is closed again.
     * @param failureThreshold The number of failures the breaker tollerates before it openes the circuit.
     */
    constructor(name: string, serviceCall: (errorHandler: EH, successHandler: SH) => void, retryInMillis: number, failureThreshold = 1) {
        this.name = name
        this.serviceCall = serviceCall
        this.retry = retryInMillis
        this.failureThreshold = failureThreshold
        this.failureCount = 0
        this.lastErrorTimestamp = undefined
    }

    /**
     * Executes the function or fails, if the client is still in the retry period after an error.
     * @param errorHandler The error handler.
     * @param successHandler The success handler.
     */
    public execute(errorHandler: EH, successHandler: SH) {
        logger.debug("CircuitBreaker(%s).execute(): start", this.name)
        if (!this.isClosed()) {
            logger.info("CircuitBreaker(%s).execute(): Circuit is open. Calling error handler.", this.name)
            errorHandler(new Error("CircuitBreaker.execute(): Call within the retry period."))
        }
        else {
            this.serviceCall((err: Error) => {
                this.recordFailure(err)
                errorHandler(err)
            }, (result: any) => {
                this.reset()
                successHandler(result)
            })
        }
    }

    /**
     * Checks, if the cicuit is closed or open. Only if the cicuit is closed, the call to the service will be executed.
     */
    public isClosed(): boolean {
        return !this.lastErrorTimestamp
            || Date.now() > this.lastErrorTimestamp + this.retry
            || this.failureCount < this.failureThreshold
    }

    /**
     * Loggs the failure and make sure that the failure counts.
     * @param err The error which causes the problem.
     */
    private recordFailure(err: Error): void {
                this.failureCount++
                this.lastErrorTimestamp = Date.now()
                logger.error("CircuitBreaker(%s).execute(): Service not available due to '%s' incrementing failure count to %s/%s.",
                             this.name, err, this.failureCount, this.failureThreshold)
    }

    /**
     * Brings it back to the open state.
     */
    private reset(): void {
        this.lastErrorTimestamp = undefined
        this.failureCount = 0
    }
}