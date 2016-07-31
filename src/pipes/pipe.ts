/// <reference path="../../typings/bunyan/bunyan.d.ts" />

// import bunyan from "bunyan";            // Module bunyan has no default export.
// import {bunyan} from "bunyan";          // module bunyan has no exported member 'bunyan'.
import * as bunyan from "bunyan";

var logger = bunyan.createLogger({
    name: "PipeLogger", 
    level: 'info', 
    streams: [
        {
            level: 'info',
            path: './pipe.log.json'
        },
        {
            level: 'error', 
            stream: process.stderr
        }
    ]
});

/**
 * Implements a simple push pipe, with the given name and destination.
 * It implements a simple store and forward logic.
 *
 * @author Dr. Ralf Berger
 */
export class Pipe {
    name: string;
    destinations: Array <string>;
    couchDbUrl: string = "http://localhost:5984/pipes";
    connected: boolean = false;

    constructor(name: string, destinations: Array <string>, couchDbUrl?: string) {
        this.name = name;
        this.destinations = destinations;
        if (couchDbUrl) {
            this.couchDbUrl = couchDbUrl;
        }
        logger.info("Connect pipe '" + this.name + "' to " + this.destinations);
    }

    /**
     * Stores the message in the persistent store. It is the task of the forwarding workers to retrieve
     * the payload from the database and deliver it to the destination.
     *
     * @param payload The payload to be stored in the database.
     */
    push(payload: any): void {

    }
};