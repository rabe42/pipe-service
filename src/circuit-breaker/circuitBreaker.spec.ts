import {CircuitBreaker, EH, SH} from "./circuitBreaker"

describe("The circuit breaker should", () => {
    let triggerError = false

    let serviceCall = (errorHandler: EH, successHandler: SH) => {
        if (triggerError) {
            errorHandler(new Error("Husten..."))
        }
        else {
            successHandler(null)
        }
    }

    function expectServiceCallSuccess(aCB: CircuitBreaker, n = 100) {
        for (let i = 0; i < n; i++) {
            aCB.execute((err: Error) => {fail()}, (result: any) => {})
            expect(aCB.isClosed()).toBe(true)
        }

    }

    it("work transparent as long as no error occurs.", () => {
        let aCB = new CircuitBreaker("CicuitBreaker Unit-Test", serviceCall, 100)
        triggerError = false
        expect(aCB.isClosed()).toBe(true)
        expectServiceCallSuccess(aCB)
    })

    it("stays in error state for some time.", () => {
        let aCB = new CircuitBreaker("CicuitBreaker Unit-Test", serviceCall, 100)
        triggerError = true
        expect(aCB.isClosed()).toBe(true)
        aCB.execute((err: Error) => {}, (result: any) => {fail()})
        expect(aCB.isClosed()).toBe(false)
        // Next call should fail!
        aCB.execute((err: Error) => {}, (result: any) => {fail()})
        expect(aCB.isClosed()).toBe(false)
    })

    it("get back to life after the time is over.", (done: ()=>void) => {
        let aCB = new CircuitBreaker("CircuitBreaker Unit-Test", serviceCall, 50)
        triggerError = true
        aCB.execute((err: Error) => {}, (result: any) => {fail()})
        expect(aCB.isClosed()).toBe(false)
        let timer = setTimeout(() => {
            expect(aCB.isClosed()).toBe(true)
            done()
        }, 60)
        timer.unref()
    })

    it("get back to life and stays there.", (done: ()=>void) => {
        let aCB = new CircuitBreaker("CicuitBreaker Unit-Test", serviceCall, 50, 2)
        triggerError = true
        aCB.execute((err: Error) => {}, (result: any) => {fail()})
        expect(aCB.isClosed()).toBe(true)
        aCB.execute((err: Error) => {}, (result: any) => {fail()})
        expect(aCB.isClosed()).toBe(false)
        let timer = setTimeout(() => {
            // !!! Pleaes be aware, that this is only working, if it is the last test!
            expect(aCB.isClosed()).toBe(true)
            triggerError = false // This is not really multitasking!
            expectServiceCallSuccess(aCB)
            done()
        }, 60)
        timer.unref()
    })
})