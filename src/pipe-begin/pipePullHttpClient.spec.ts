import * as http from "http"; 
import * as async from "async";

import {PipePullHttpClient} from "./PipePullHttpClient"
import {Pipe} from "../pipes/Pipe"

describe("The http pull client should", () => {

    let testResponse = {_id: 123456789, name: "testResponse", payload: {name: "payload", value: "A value"}}

    // Start a services which provides a simple message answer.
    function createService(cb: ()=>void) {
        let service = http.createServer((request, response) => {
            response.end(JSON.stringify(testResponse))
        })
        service.listen(9191, "localhost", cb)
    }

    it("not be created without a pipe.", () => {
        try {
            new PipePullHttpClient(null)
            fail()
        }
        catch (err) {}
    })

    it("not be created without a hostname.", () => {
        try {
            new PipePullHttpClient(new Pipe("test"), "")
            fail()
        }
        catch (err) {}
    })

    it("retrieve data from a hub.", (done) => {
        createService(done)
        let pullClient = new PipePullHttpClient(new Pipe("test"))
        pullClient.start((err) => {
            // Should be notified, if sth. failed.
            pullClient.stop()
            done()
        }, (payload) => {
            // Should be notified, if everything is fine. --> fail()
            pullClient.stop()
            fail()
            done()
        })
    })

    // TODO: Check, if the client pulls some data and stores it!
    // TODO: Check, if the client can get to proper operation again, after the communication failed.
})