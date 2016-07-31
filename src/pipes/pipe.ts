/// <reference path="../../typings/bunyan/bunyan.d.ts" />
/// <reference path="../../typings/cradle/cradle.d.ts" />

// import bunyan from "bunyan";            // Module bunyan has no default export.
// import {bunyan} from "bunyan";          // module bunyan has no exported member 'bunyan'.
import * as bunyan from "bunyan";
import * as cradle from "cradle";

/**
 * The logger, used by the pipes.
 */
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
    db: cradle.Database;

    constructor(name: string, destinations: Array <string>, couchDbUrl?: string) {
        this.name = name;
        this.destinations = destinations;
        if (couchDbUrl) {
            this.couchDbUrl = couchDbUrl;
        }
        logger.info("Connect pipe '" + this.name + "' to " + this.destinations);
        this.db = new(cradle.Connection)().database(this.databaseName());
    }

    /**
     * Stores the message in the persistent store. It is the task of the forwarding workers to retrieve
     * the payload from the database and deliver it to the destination.
     *
     * @param payload The payload to be stored in the database.
     */
    public push(payload: any): void {
        // Irgendwie benötige ich hier eine eindeutige Sequenznummer. Dies sollte am besten aus der DB kommen.
        // Dazu benöige ich jedoch eine Sequenzquelle! Aktuell gehe ich davon aus, dass die von der Datenbank 
        // vergebene Id genau diese Sequenz liefert. Dies ist jedoch nicht so, wenn die Datenbank für die Id eine
        // UUID verwendet.
        var queueEntry = {time: new Date(), payload: payload};
        this.db.save(payload, (err, res) => {
            if (err) {
                logger.error(this.name + ".push() wasn't possible due to: " + err);
            }
            else {
                logger.info(this.name + ".push() successful.");
            }
        });
    }

    public databaseName(): string {
        return this.name.replace(" ", "_").toLowerCase();
    }
};