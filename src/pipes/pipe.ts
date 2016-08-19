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
            /*stream: process.stderr*/
            path: './pipe.err.log.json'
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
                if (callback) callback(err);
            }
            else if (exists) {
                logger.info(this.name + "::Pipe.createDatabase(): Use existing store.");
                if (callback) callback(null, exists);
            }
            else {
                this.dbConnection.create((err) => {
                    if (err) {
                        logger.error(this.name + "::Pipe.constructor(): wasn't able to create database due to: " + err);
                        if (callback) callback(err);
                    }
                    else {
                        logger.info(this.name + "::Pipe.constructor(): database created!");
                        if (callback) callback(null, false);
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
            if (pipeCallback) pipeCallback(err);
        });
    }

    /**
     * Checks if the database is empty.
     */
    private databaseIsEmpty(callback: PipeCallback, force?: boolean): boolean {
        var dbInfo = this.dbConnection.info((err: any, result: any) => {
            logger.info("Database info: " + result);
            if (err) {
                if (callback) callback(err);
                return;
            }
            else if (result) {
                var error: Error;
                if (result.doc_count > 0 && !force) {
                    error = new Error("Cannot destroy pipe database as it is not empty");
                    if (callback) callback(error);
                    return;
                }
            }
            if (callback) callback(null, true);
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
    public push(payload: any, pipeCallback: PipeCallback): void {
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

    /**
     * This still needs some attention!
     */
    public init(pipeCallback: PipeCallback) {
        async.series([
            (callback) => {
                this.createDatabase(callback);
            },
            (callback) => {
                // Save a view for the database. (I expect, that at this point the database is part of the html request.)
                this.dbConnection.save('_design/pipe', {
                    all: {map: 'function (doc) {emit(doc._id, doc);}'}
                }, callback);
            }
        ], (err, res) => {
            if (err) {
                logger.error(this.name + '::Pipe.init(): Wasn\'t able to init the pipe due to: ' + err);
            }
            if (pipeCallback) pipeCallback(err, res);
        });
    }

    /**
     * Retrieve the oldest element from the database, associated with the pipe.
     * It deliveres the object with the complete set of Metadata, to allow the
     * receiver to check on the origin of the payload. It also provides the unique
     * message id, which is needed for the removal of the message from the queue.
     * 
     * @param pipeCallback The omnipresent JS callback.
     */
    public peek(pipeCallback: PipeCallback): void {
        this.dbConnection.view("pipe/all", {limit: 1}, (err, res) => {
            if (err) {
                logger.error(this.name + '::Pipe.peek(): failed due to ' + err);
            }
            if (res instanceof Array && res.length == 1) {
                let result = res[0].value;
                if (pipeCallback) pipeCallback(err, result);
            }
            else {
                if (pipeCallback) pipeCallback("Unexpected result!", null);
            }
        });
    }

    /**
     * Delete the document with the given Id from the database. This is the
     * only way to delete anything, as it must be shure, that we delete something,
     * which was really delivered to the other end of the pipe.
     * @param id The database id of the object.
     * @param pipeCallback The omnipresent JS callback.
     */
    public remove(message: any, pipeCallback: PipeCallback): void {
       
        this.dbConnection.remove(message._id, message._rev, (err, res) => {
            if (err) {
                logger.error(this.name + "::Pipe.remove(): failed due to: " + err);
            }
            if (pipeCallback) pipeCallback(err, res);
        });
    }

    /**
     * Creates a CoucheDB conform database name from the pipes name.
     */
    public databaseName(): string {
        return this.name.replace(" ", "_").toLowerCase();
    }
};