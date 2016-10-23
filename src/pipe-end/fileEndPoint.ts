import * as fs from "fs"
import * as bunyan from "bunyan"
//import {template} from "string-template"
var template = require('string-template')

import {Pipe, PipeListener} from "../pipes/pipe"
import {fileLoggerConfig} from "../loggerConfig"

/**
 * The logger, used by the pipes.
 */
var logger = bunyan.createLogger(fileLoggerConfig)

/**
 * A file end point reads the data from the given pipe and put it to the provided file end point.
 * The provided location must be a directory.
 * It runs as a service and collecting the data from the pipe.
 */
export class FileEndPoint implements PipeListener {

    location: string // The location, where the pipe entries have to be stored.
    pattern: string // used to create the file name from the pipe.
    interval: number // The interval to wait for the next check of available content in the pipe.
    pipe: Pipe
    timer: NodeJS.Timer

    /**
     * @param pipe Where the data is stored.
     * @param location Where the data should be stored.
     * @param pattern The pattern how to create the files.
     * @param interval The interval between checks.
     */
    constructor(pipe: Pipe, location: string, pattern: string = "{_id}-{time}.json", interval: number = 100) {
        logger.debug("FileEndPoint.constructor(%s, %s, %d):", location, pattern, interval)
        if (!pipe) {
            logger.error("FileEndPoint.constructor(): No pipe provided!")
            throw new Error("No pipe provided!")
        }
        if (!location) {
            logger.error("FileEndPoint.constructor(): No location provided!")
            throw new Error("No location provided!")
        }
        if (!fs.statSync(location).isDirectory()) {
            logger.error("FileEndPoint.constructor(): Given location '%s' is not a directoy.", location)
            throw new Error("Given location is no directory: " + location)
        }
        this.pipe = pipe;
        this.location = location
        this.pattern = pattern
        this.interval
    }

    /**
     * Servces the pipe. This registers the end point as a watcher.
     */
    public start(): void {
        logger.debug("FileEndPoint.start(): starting service.")
        this.timer = setInterval((fileEndPoint: FileEndPoint) => {
            fileEndPoint.serve()
        }, this.interval, this)
    }

    /**
     * FIXME:
     * For big messages, this method may be called twice to save the same messages.
     */
    private serve(): void {
        // Check for new data and store them into the location.
        logger.debug("FileEndPoint.serve(): serving on '%s'", this.location)
        this.pipe.peek((err, data) => {
            if (err) {
                logger.error("FileEndPoint.serve(): Problem accesing data: " + err)
            }
            if (data) {
                logger.debug("FileEndPoint.serve(): Saving data.")
                let fileName = this.createFileName(data)
                fs.writeFile(fileName, JSON.stringify(data.payload), (err) => {
                    if (err) {
                        logger.error("FileEndPoint.serve(): Cannot write file due to: %s", err)
                    }
                    else {
                        logger.debug("FileEndPoint.serve(): File written '%s'", fileName)
                        this.pipe.remove(data, (err) => {
                            if (err) {
                                logger.error("FileEndPoint.serve(): Wasn't able to remove the '%s' message from the pipe.", data._id)
                            }
                        })
                    }
                })
            }
        })
    }

    /**
     * Crates the file name from the given data.
     */
    private createFileName(data: any): string {
        logger.debug("FileEndPoint.createFileName(%s)", data._id)
        return this.location + '/' + template(this.pattern, data)
    }

    /**
     * Stop watching the pipe and terminate the service.
     */
    public close(): void {
        clearInterval(this.timer)
    }

    public notify(pipe: Pipe): void {
        // Make sure, that the service fetches objects from the pipe
    }
};