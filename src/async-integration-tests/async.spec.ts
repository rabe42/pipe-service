import * as async from "async";
import * as cradle from "cradle";

describe("The async lib", () => {
    var dbConnection: cradle.Database;

    it("should call the final callback with empty lists immediately.", () => {
        var finalCallbackCalled: boolean = false;
        async.parallel([], (err) => {
            // This should be the final callback! The callback called when all functions terminated.
            if (err) {
                throw err;
            }
            finalCallbackCalled = true;
        });
        expect(finalCallbackCalled).toBe(true);
    });

    it("should create a database connection", () => {
        dbConnection = new(cradle.Connection)().database("async_test");
        expect(dbConnection).toBeDefined();
    });

    it("should call the final callback after a parallel function comes back.", (done) => {
        var finalCallbackCalled = false;
        var dbCreated = false;
        async.series([
            (callback) => {
                // creates a database...
                dbConnection.create((err) => {
                    if (err) {
                        callback(err);
                    }
                    else {
                        dbCreated = true;
                        callback();
                    }
                });
            }
        ], (err) => {
            if (err) {
                fail("Error at DB Creation:" + err);
                return;
            }
            done();
        });
    });

    it("should delete the database again", (done) => {
        dbConnection.destroy(() => { done() });
    });
});