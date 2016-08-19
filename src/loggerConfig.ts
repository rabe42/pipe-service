/// <reference path="../typings/bunyan/bunyan.d.ts" />

import * as bunyan from "bunyan";

export var pipeLoggerConfig: bunyan.LoggerOptions = {
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
};

