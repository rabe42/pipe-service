/// <reference path="../../typings/bunyan/bunyan.d.ts" />
/// <reference path="../../typings/cradle/cradle.d.ts" />
/// <reference path="../../typings/async/async.d.ts" />
/// <reference path="../loggerConfig.ts" />

// import bunyan from "bunyan";            // Module bunyan has no default export.
// import {bunyan} from "bunyan";          // module bunyan has no exported member 'bunyan'.
import * as bunyan from "bunyan";
import * as cradle from "cradle";
import * as async from "async";

import {pipeLoggerConfig} from "../loggerConfig";

/**
 * The logger, used by the pipes.
 */
var logger = bunyan.createLogger(pipeLoggerConfig);

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

export type PipeCallback = (err?: any, result?: any) => void;
var defaultCallback: PipeCallback = () => {
    logger.warn("Default callback called!");
};

/**
 * Defines an interface which allows to notify that the pipe has data inside.
 */
export interface PipeListener {
    notify(pipe: Pipe): void;
}

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
    dbSpec: any;
    private dbConnection: cradle.Database;
    private listener: PipeListener;

    constructor(name: string, dbSpec?: any) {
        this.name = name;
        logger.info(this.name + "::Pipe.constructor(): Connect pipe '" + this.name);
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
     * Creates a CoucheDB conform database name from the pipes name.
     */
    public databaseName(): string {
        return this.name.replace(" ", "_").toLowerCase();
    }

    /**
     * Allows to define a listner, who will be notified, if data is available.
     * If the listener is substituted, a warning is issued.
     * @param listener The new content listener.
     */
    public setListener(listener: PipeListener): void {
        if (this.listener) {
            logger.warn(this.name + "::Pipe.setListener(): Listener will be substituted. This might result in unexpected end point behaviour.")
        }
        this.listener = listener
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
     * Checks if the database is empty. If not, a error is Provided.
     */
    private checkIsEmpty(callback: PipeCallback, force?: boolean): void {
        var dbInfo = this.dbConnection.info((err: any, dbInfo: any) => {
            if (err) {
                logger.error(this.name + "::Pipe.databaseIsEmpty(): failed due to: " + err);
                callback(err);
                return;
            }
            if (dbInfo.doc_count > 1 && !force) {
                // doc_count contains also the _design (view) document of the database.
                callback(new Error("Cannot destroy pipe database as it is not empty"));
                return;
            }
            callback(null, true);
        });
    }

    /**
     * Initialize the database with the view to easy retrieveal of messages.
     */
    public init(pipeCallback: PipeCallback = defaultCallback) {
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
            pipeCallback(err, res);
        });
    }

    /**
     * Stores the message in the persistent store. It is the task of the forwarding workers to retrieve
     * the payload from the database and deliver it to the destination.
     *
     * @param payload The payload to be stored in the database.
     * @param cb Called, when the operation finished.
     */
    public push(payload: any, pipeCallback: PipeCallback = defaultCallback): void {
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
                logger.info(this.name + "::Pipe.push() successful.")
                if (this.listener) {
                    this.listener.notify(this)
                }
            }
            pipeCallback(err, res);
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
    public peek(pipeCallback: PipeCallback = defaultCallback): void {
        this.dbConnection.view("pipe/all", {limit: 1}, (err, res) => {
            if (err) {
                logger.error(this.name + '::Pipe.peek(): failed due to ' + err);
            }
            if (res instanceof Array && res.length == 1) {
                let result = res[0].value;
                pipeCallback(err, result);
            }
            else {
                logger.error(this.name + '::Pipe.peek(): unexpected result!');
                pipeCallback("Unexpected result!", null);
            }
        });
    }

    /**
     * Provides the length of the pipe in the callback, provided here.
     * @param callback Called for providing error or result.
     */
    public length(callback: PipeCallback): void {
        var dbInfo = this.dbConnection.info((err: any, dbInfo: any) => {
            logger.debug(this.name + "::Pipe.length(): Database info: " + dbInfo);
            if (err) {
                logger.error(this.name + "::Pipe.databaseIsEmpty(): failed due to: " + err);
                callback(err);
                return;
            }
            callback(null, dbInfo.doc_count - 1); // Without the view document!
        });
    }

    /**
     * Delete the document with the given Id from the database. This is the
     * only way to delete anything, as it must be shure, that we delete something,
     * which was really delivered to the other end of the pipe.
     * @param id The database id of the object.
     * @param pipeCallback The omnipresent JS callback.
     */
    public remove(message: any, pipeCallback: PipeCallback = defaultCallback): void {
       
        this.dbConnection.remove(message._id, message._rev, (err, res) => {
            if (err) {
                logger.error(this.name + "::Pipe.remove(): failed due to: " + err);
            }
            pipeCallback(err, res);
        });
    }

    /**
     * Checks, if the database, attached to the queue is empty. 
     * If it is empty or force is provided, it will delete the database from the server.
     * If it isn't empty and no force is provided false will be returned.
     */
    public destroy(pipeCallback: PipeCallback = defaultCallback, force?: boolean): void {
        async.series([
            (callback) => {
                this.checkIsEmpty(callback, force);
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
};