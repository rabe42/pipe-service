/// <reference path="../typings/bunyan/bunyan.d.ts" />

import * as bunyan from "bunyan";

var commonStream = {
    level: 'info',
    path: 'common.log.json'
};

var serverStream = {
    level: 'debug',
    path: 'server.log.json'
};

var pipeStream = {
    level: 'info',
    path: './pipe.log.json'
};

var errorStream = {
    level: 'error',
    path: 'error.log.json'
}

export var pipeLoggerConfig: bunyan.LoggerOptions = {
    name: "PipeLogger",
    level: 'info', 
    streams: [commonStream, pipeStream, errorStream]
};

export var pipeHttpServerLoggerConfig: bunyan.LoggerOptions = {
    name: "PipeHttpServerLogger",
    level: 'info',
    streams: [commonStream, serverStream, errorStream]
}