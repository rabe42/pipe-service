import {Pipe, PipeListener} from "./pipe";

describe("The pipe interface:", () => {

    var aPipe: Pipe;
    var aFailedPipe: Pipe;
    var aNewPipe: Pipe;
    var payload1 = {name: "Skywalker", firstName: "Anakin"};
    var payload2 = {name: "Skywalker", firstName: "Luke"};
    let notified = false;

    class PipeWatcher implements PipeListener {
        public notify(pipe: Pipe): void {
            notified = true
        }
    }
    let pipeWatcher = new PipeWatcher()

    it("should create a pipe", () => {
        aPipe = new Pipe("Test Pipe", ["http://x.y.z"]);
        expect(aPipe).toBeDefined();
    });
    it("should not fail to create the pipe on a port without database", () => {
        // Due to lazy logic, this shouldn't fail.
        aFailedPipe = new Pipe("A Failed Pipe", {port: 12345});
        expect(aFailedPipe.dbSpec.port).toBe(12345);
    });
    it("should deliver merged connection properties", () => {
        let connectionProperties = aPipe.connectionParameter({host: "a.b.c"});
        expect(connectionProperties.host).toBe("a.b.c");
        expect(connectionProperties.port).toBe(5984);
    })
    it("should have a name", () => {
        expect(aPipe.name).toEqual("Test Pipe");
    });
    it("should be possible to initalize", (done) => {
        aPipe.init((err, res) => {
            if (err) {
                fail("With error: " + err);
            }
            done();
        });
    })

    it("should not be possible to initialize failed pipe", (done) => {
        aFailedPipe.init((err, res) => {
            if (!err) {
                fail("Initalization of non existing pipe is possible.");
            }
            done();
        });
    })

    it("should be possible to set a listener.", () => {
        aPipe.setListener(pipeWatcher)
    })

    it("should save a simple payload", (done) => {
        aPipe.push("A first payload.", (err: any, res: any) => { 
            if (err) {
                fail("With error: " + err);
            }
            done(); 
        });
    })

    it("should not save a simple payload to a the failed pipe", (done) => {
        aFailedPipe.push("A simple payload.", (err: any, res: any) => {
            if (!err) {
                fail("Saving without database possible.")
            }
            done();
        })
    })

    it("should save complex payloads", (done) => {
        aPipe.push(payload1, (err: any, res: any) => { 
            if (err) {
                fail("With error: " + err);
            }   
            done(); 
        });
    })

    it("should have been notified.", () => {
        expect(notified).toBeTruthy()
        notified = false
    })

    it("should save the third payload", (done) => {
        aPipe.push(payload2, (err: any, res: any) => { 
            if (err) {
                fail("With error: " + err);
            }   
            done(); 
        });
    })

    it("should have three elements in the pipe.", (done) => {
        aPipe.length((err, res) => {
            if (err) {
                fail("With error: " + err);
            }
            expect(res).toBe(3);
            done();
        });
    })

    it("should substitute the space in the pibe name by underscores", () => {
        expect(aPipe.databaseName()).toBe("test_pipe");
    });
    it("should not be possible to destroy a non empty pipe database", (done) => {
        aPipe.destroy((err: any) => {
            if (!err) {
                fail("Shouldn't be possible to destroy.")
            }
            done();
        });
    });
    it("should retrieve the first message", (done) => {
        aPipe.peek((err: any, result: any) => {
            if (err) {
                fail("Should be possible to read the first payload!");
            }
            else {
                expect(result).toBeDefined();
                expect(result.payload).toBe("A first payload.");
            }
            done();
        });
    });
    it("should not retrieve data from failed pipe", (done) => {
        aFailedPipe.peek((err: any, result: any) => {
            if (!err) {
                fail("It shouldn't be possible to retrieve data from non existing pipe.");
            }
            done();
        });
    });
    it("should retrieve and delete the first message.", (done) => {
        aPipe.peek((err: any, message: any) => {
            if (err) {
                fail("couldn't peek data from pipe due to: " + err);
            }
            expect(message).toBeDefined();
            expect(message.payload).toBeDefined();
            expect(message.payload).toBe("A first payload.");
            aPipe.remove(message, (err: any, result: any) => {
                if (err) {
                    fail("Couldn't delete message due to: " + err)
                }
                aPipe.remove(message, (err: any) => {
                    if (!err) {
                        fail("Could delete message twice!");
                    }
                    done();
                });
            });
        });
    });
    it("should retrieve and delete the next message", (done) => {
        aPipe.peek((err: any, message: any) => {
            if (err) {
                fail("Couldn't peek data from pipe due to: " + err);
            }
            expect(message).toBeDefined();
            expect(message.payload).toBeDefined();
            expect(message.payload.firstName).toBe(payload1.firstName);
            expect(message.payload.name).toBe(payload1.name);
            aPipe.remove(message, (err: any, result: any) => {
                if (err) {
                    fail("Couldn't delete message due to: " + err)
                }
                done();
            });
        });
    });
    it("should retrieve and delete the last message", (done) => {
        aPipe.peek((err: any, message: any) => {
            if (err) {
                fail("Couldn't peek data from pipe due to: " + err);
            }
            expect(message).toBeDefined();
            expect(message.payload).toBeDefined();
            expect(message.payload.firstName).toBe(payload2.firstName);
            expect(message.payload.name).toBe(payload2.name);
            aPipe.remove(message, (err: any, result: any) => {
                if (err) {
                    fail("Couldn't delete message due to: " + err)
                }
                done();
            });
        });
    });
    it("should be possible to destroy the now empty pipe", (done) => {
        aPipe.destroy((err: any) => {
            if (err) {
                fail("With error: " + err);
            }
            done();
        });
    });
    it("should not be possible to destroy the failed pipe.", (done) => {
        aPipe.destroy((err: any) => {
            if (!err) {
                fail("It is possible to destroy a non existing database.");
            }
            done();
        });
    });
    it("should be possible to create another pipe", (done) => {
        // I've to make sure, that the initialization is done once, before I destroy the database again.
        aNewPipe = new Pipe("aNewPipe", ["a.b.c"]);
        aNewPipe.init(done);
    });
    it ("should be possible to call all functions also without callback", (done) => {
        aNewPipe.init();
        aNewPipe.push("Hello");
        aNewPipe.peek();
        aNewPipe.remove({_id: "1", _rev: "1"});
        aNewPipe.destroy();
        setTimeout(done, 500);
    });
    it ("should be possible to force to destroy the pipe", (done) => {
        aNewPipe.destroy((err, res) => {
            // Ignore the error in this case, as the destroy of the previous call might have worked, as the database was empty.
            done();
        }, true);
    });
});
