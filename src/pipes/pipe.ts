/// <reference path="../../typings/bunyan/bunyan.d.ts" />
/// <reference path="../../typings/cradle/cradle.d.ts" />
/// <reference path="../../typings/async/async.d.ts" />

// import bunyan from "bunyan";            // Module bunyan has no default export.
// import {bunyan} from "bunyan";          // module bunyan has no exported member 'bunyan'.
import * as bunyan from "bunyan";
import * as cradle from "cradle";
import * as async from "async";

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

var defaultConnectionParameter: any = {
    host: "http://localhost",
    port: 5984,
    cache: true,
    raw: false,
    secure: false,
    retries: 0,
    retryTimeout: 10e3,
    forceSave: true,
    headers: {}
};

type PipeCallback = (err?: any, result?: any) => void;

/**
 * Implements a simple push pipe, with the given name and destination.
 * It implements a simple store and forward logic.
 * The implementation requires, that the setup of the uuid algorithm is changed with this command:
 * curl -X PUT http://localhost:5984/_config/uuids/algorithm -d '"sequential"'
 *
 * @author Dr. Ralf Berger
 */
export class Pipe {
    name: string;
    destinations: Array <string>;
    dbSpec: any;
    dbConnection: cradle.Database;

    constructor(name: string, destinations: Array <string>, dbSpec?: any) {
        this.name = name;
        this.destinations = destinations;
        logger.info(this.name + "::Pipe.constructor(): Connect pipe '" + this.name + "' to " + this.destinations);
        this.connect(this.connectionParameter(dbSpec));
    }

    /**
     * Merging the provided connection parameter with the default parameters.
     */
    public connectionParameter(dbSpec?: any): any {
        let newDBSpec: any = {};
        Object.keys(defaultConnectionParameter).forEach((element: string) => {
            newDBSpec[element] = defaultConnectionParameter[element];
        });
        if (dbSpec) {
            Object.keys(dbSpec).forEach((key: string) => {
                newDBSpec[key] = dbSpec[key];
            })
        }
        return newDBSpec;
    }

    /**
     * Connect to the specified database.
     */
    private connect(dbSpec: any) {
        this.dbConnection = new(cradle.Connection)(dbSpec).database(this.databaseName());
        logger.info(this.name + "::Pipe.connect(): Connected to " + dbSpec.host + ":" + dbSpec.port);
        this.dbSpec = dbSpec;
    }

    private createDatabase(callback: PipeCallback): void {
        this.dbConnection.exists((err, exists) => {
            if (err) {
                logger.error(this.name + "::Pipe.createDatabase(): cannot even check the existence of the store due to: " + err);
                callback(err);
            }
            else if (exists) {
                logger.info(this.name + "::Pipe.createDatabase(): Use existing store.");
                callback(null, exists);
            }
            else {
                this.dbConnection.create((err) => {
                    if (err) {
                        logger.error(this.name + "::Pipe.constructor(): wasn't able to create database due to: " + err);
                        callback(err);
                    }
                    else {
                        logger.info(this.name + "::Pipe.constructor(): database created!");
                        callback(null, false);
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
    public destroy(pipeCallback: PipeCallback, force?: boolean): void {
        async.series([
            (callback) => {
                this.databaseIsEmpty(callback, force);
            },
            (callback) => {
                this.dbConnection.destroy(callback);
            }
        ], (err: any, result: any) => {
            if (err) {
                logger.error(this.name + "::Pipe.destroy(): attempt to destroy pipe fails due to: " + err);
            }
            pipeCallback(err);
        });
    }

    /**
     * Checks if the database is empty.
     */
    private databaseIsEmpty(callback: PipeCallback, force?: boolean): boolean {
        var dbInfo = this.dbConnection.info((err: any, result: any) => {
            logger.info("Database info: " + result);
            if (err) {
                callback(err);
                return;
            }
            else if (result) {
                var error: Error;
                if (result.doc_count > 0 && !force) {
                    error = new Error("Cannot destroy pipe database as it is not empty");
                    callback(error);
                    return;
                }
            }
            callback(null, true);
        });
        return false;
    }

    /**
     * Stores the message in the persistent store. It is the task of the forwarding workers to retrieve
     * the payload from the database and deliver it to the destination.
     *
     * @param payload The payload to be stored in the database.
     * @param cb Called, when the operation finished.
     */
    public push(payload: any, pipeCallback?: PipeCallback): void {
        var pipeEntry = {time: new Date(), payload: payload};
        async.series([
            (callback) => {
                // Create database, if not existent.
                this.createDatabase(callback);
            },
            (callback) => {
                // Save the data.
                this.dbConnection.save(pipeEntry, (err: any, res: any) => {
                    callback(err, res);
                });
            }
        ], (err, res) => {
            if (err) {
                logger.error(this.name + "::Pipe.push() wasn't possible due to: " + err);
            }
            else {
                logger.info(this.name + "::Pipe.push() successful.");
            }
            if (pipeCallback) pipeCallback(err, res);
        });
    }

    public pop(pipeCallback: PipeCallback): void {
        var id = "TODO";
        this.dbConnection.get(id, pipeCallback);
    }

    /**
     * Creates a CoucheDB conform database name from the pipes name.
     */
    public databaseName(): string {
        return this.name.replace(" ", "_").toLowerCase();
    }
};