import * as http from "http"; 
import * as async from "async";

import {PipePullHttpClient} from "./pipePullHttpClient"
import {Pipe} from "../pipes/pipe"

describe("The http pull client should", () => {

    let testResponse = {_id: 123456789, name: "testResponse", payload: {name: "payload", value: "A value"}}
    let service : http.Server

    // Start a services which provides a simple message answer.
    // FIXME: Müsste dieser Service nicht auf 6513 lauschen?
    function createService(cb: ()=>void) {
        service = http.createServer((request, response) => {
            response.end(JSON.stringify(testResponse))
        })

        service.listen(9191, "localhost", cb)
    }

    function stopService(cb: ()=>void) {
        service.close(cb)
    }

    it("not be created without a pipe.", () => {
        try {
            new PipePullHttpClient(null)
            fail()
        }
        catch (err) {}
    })

    it("not be created without a hostname.", (done: ()=>void) => {
        new PipePullHttpClient(new Pipe("test"), "", 6513, 1000, 1000, (error: Error) => {
            done()
        }, () => {
            fail()
            done()
        })
    })

    it("retrieve data from a hub.", (done: ()=>void) => {
        let pullClient = new PipePullHttpClient(new Pipe("test"))
        async.series([
            (callback) => {
                createService(callback)
            },
            (callback) => {
                pullClient.start((err) => {
                    pullClient.stop()
                    callback(null, true)
                }, (payload) => {
                    pullClient.stop()
                    callback(new Error("Claims everything Ok!"), false)
                })
            }
        ], (err, result) => {
            if (err) {
                fail(err)
            }
            stopService(done)
        })
    })

    it ("should store received data into the pipe.", (done: ()=>void) => {
        let pullClient = new PipePullHttpClient(new Pipe("test"))
        async.series([
            (callback) => {
                createService(callback)
            },
            (callback) => {
                // start to retrieve the data
                pullClient.start(
                    (err) => {
                        callback(err)
                    }, 
                    (result) => {
                        // TODO: Store data
                        callback(undefined, true)
                })
            },
            (callback) => {
                // TODO: Check if the pipe has an entry.
            }
        ], (err, result) => {
            if (err) {
                fail(err)
            }
            stopService(done)
        })
    })

    // TODO: Check, if the client can get to proper operation again, after the communication failed.
})