import JL from "jsnlog";

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
        JL().error("Connect pipe '" + this.name + "' to " + this.destinations);
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