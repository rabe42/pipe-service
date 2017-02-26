import * as async from "async"
import * as fs from "fs"
import {FileEndPoint} from "./fileEndPoint"
import {Pipe} from "../pipes/pipe"

describe("A file end point", () => {

    let fepData = "./tests/fepData"
    let pipe = new Pipe("filePipe")
    let pl1 = {name: "pl1", type: "abc"}
    let pl2 = {name: "pl2", attib: "efg"}
    let pl3 = {name: "pl3", param: "jkl"}
    let fepUnderTest: FileEndPoint

    function fillPipe(done: () => void) {
        async.series([
            (cb) => {pipe.push(pl1, cb)},
            (cb) => {pipe.push(pl2, cb)},
            (cb) => {pipe.push(pl3, cb)}
        ], 
        (err) => {return done()})
    }

    afterAll((done: ()=>void) => {
        // TODO Delete directory
        let files = fs.readdirSync(fepData)
        files.forEach((file) => { 
            fs.unlinkSync(fepData + "/" + file)
         })
        pipe.destroy(done, true)
    })

    it("should initialize the pipe", (done: ()=>void) => {
            pipe.init(done)
    })

    it("should fail to be initialized on a non existing directory.", () => {
        try {
            new FileEndPoint(pipe, "xxx")
            fail("It is possible to create a file end point for a non existing directory.")
        }
        catch (err) {}
    })

    it("should fail to initialize without pipe.", () => {
        try {
            new FileEndPoint(null, fepData)
            fail("It is possible to create a file end point without pipe.")
        }
        catch (err) {}
    })

    it("should fail to initialize without location.", () => {
        try {
            new FileEndPoint(pipe, null)
            fail("It is possible to create a file end point without any locltion.")
        }
        catch (err) {}
    })

    it("should fail to initialize for a file.", () => {
        try {
            new FileEndPoint(pipe, "./tests/fepFile")
            fail("It is possible to create a file end point for a file.")
        }
        catch (err) {}
    })

    it("should be possible to create a file end point for an existing directory.", () => {
        fepUnderTest = new FileEndPoint(pipe, fepData)
        fepUnderTest.start()
        let fnList = fs.readdirSync(fepData)
        expect(fnList.length).toBe(0)
    })

    it ("should close the without data end point.", (done: ()=>void) => {
        let timer = setTimeout(() => {
            if (fepUnderTest != undefined && fepUnderTest != null) {
                fepUnderTest.close()
            }
            done()
        }, 500)
        timer.unref()
    })

    it("should fill the pipe.", (done: ()=>void) => {
        fillPipe(done)
    })

    it("should read the content of the pipe...", (done: ()=>void) => {
        fepUnderTest = new FileEndPoint(pipe, fepData, "test_{_id}.json")
        expect(fepUnderTest.pattern).toBe("test_{_id}.json")
        fepUnderTest.start()
        // Wait for some seconds to allow the consumption of the pipe content.
        let timer = setTimeout(() => {
            done()
        }, 1000)
        timer.unref()
    })

    it("... and put it to the given location.", () => {
        let fnList = fs.readdirSync(fepData)
        expect(fnList.length).toBe(3)
    })

    it("should close the end point after data are read from the pipe.", (done: ()=>void) => {
        let timer = setTimeout(() => {
            if (fepUnderTest != undefined && fepUnderTest != null) {
                fepUnderTest.close()
            }
            done()
        }, 500)
        timer.unref()
    })
})
