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
    dbConnection: cradle.Database;

    constructor(name: string, destinations: Array <string>, couchDbUrl?: string) {
        this.name = name;
        this.destinations = destinations;
        if (couchDbUrl) {
            this.couchDbUrl = couchDbUrl;
        }
        logger.info(this.name + "::Pipe.constructor(): Connect pipe '" + this.name + "' to " + this.destinations);
        this.dbConnection = new(cradle.Connection)().database(this.databaseName());
        logger.info(this.name + "::Pipe.constructor(): Connected to default CouchDB.");
        this.createDatabase();
    }

    createDatabase(): void {
        this.dbConnection.exists((err, exists) => {
            if (err) {
                logger.error(this.name + "::Pipe.createDatabase(): cannot even check the existence of the store due to: " + err);
            }
            else if (exists) {
                logger.info(this.name + "::Pipe.createDatabase(): Use existing store.");
            }
            else {
                this.dbConnection.create((err) => {
                    if (err) {
                        logger.error(this.name + "::Pipe.constructor(): wasn't able to create database due to: " + err);
                    }
                    else {
                        logger.info(this.name + "::Pipe.constructor(): database created!");
                    }
                });
            }
        });
    }

    /**
     * Checks, if the database, attached to the queue is empty. 
     * If it is empty or force is provided, it will delete the database from the server.
     * If it isn't empty and no force is provided false will be returned.
     */
    public destroy(force?: boolean): boolean {
        if (!this.databaseIsEmpty()) {
            logger.info(this.name + ".destroy(): attempt to destroy non empty pipe.");
            if (force) {
                logger.info(this.name + "::Pipe.destroy(): destory pipe anyway!");
                return true;
            }
            return false;
        }
        else {
            logger.info(this.name + "::Pipe.destroy(): destroy empty pipe.");
        }
    }

    /**
     * Checks if the database is empty.
     */
    public databaseIsEmpty(): boolean {
        return false;
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
        var pipeEntry = {time: new Date(), payload: payload};
        this.dbConnection.save(pipeEntry, (err: any, res: any) => {
            if (err) {
                logger.error(this.name + "::Pipe.push() wasn't possible due to: " + err);
            }
            else {
                logger.info(this.name + "::Pipe.push() successful.");
            }
        });
    }

    /**
     * Creates a CoucheDB conform database name from the pipes name.
     */
    public databaseName(): string {
        return this.name.replace(" ", "_").toLowerCase();
    }
};