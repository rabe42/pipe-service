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
 *
 * @author Dr. Ralf Berger
 */
export class Pipe {
    name: string;
    destinations: Array <string>;
    connected: boolean = false;
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
    private connect(dbSpec?: any) {
        this.dbConnection = new(cradle.Connection)().database(this.databaseName());
        this.connected = true;
        logger.info(this.name + "::Pipe.connect(): Connected to default CouchDB.");
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
    public destroy(callback: any, force?: boolean): void {
        this.dbConnection.destroy((err) => {
            if (err) {
                logger.error(this.name + "::Pipe.destroy(): attempt to destroy pipe fails due to: " + err);
            }
            callback(err);
        });
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
     * @param cb Called, when the operation finished.
     */
    public push(payload: any, error?: any, success?: any): void {
        // Irgendwie benötige ich hier eine eindeutige Sequenznummer. Dies sollte am besten aus der DB kommen.
        // Dazu benöige ich jedoch eine Sequenzquelle! 
        // CouchDB verwendet eine UUID als Id, die als Sequenznummer ungeeignet ist. Dies konnte ich durch 
        // die Verwendung der Zeit validieren.
        var pipeEntry = {time: new Date(), payload: payload};
        // TODO: Aus noch unbekannten Gründen geht der Callback hier verloren.
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
                if (error) error(err);
            }
            else {
                logger.info(this.name + "::Pipe.push() successful.");
                if (success) success(res);
            }
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