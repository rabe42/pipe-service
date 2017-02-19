import * as bunyan from "bunyan";

let commonStream = {
    level: 'info',
    path: 'common.log.json'
};

let serverStream = {
    level: 'info',
    path: 'server.log.json'
};

let pipeStream = {
    level: 'info',
    path: './pipe.log.json'
};

let errorStream = {
    level: 'error',
    path: 'error.log.json'
}

let fileStream = {
    level: 'info',
    path: 'file.log.json'
}

export let pipeLoggerConfig: bunyan.LoggerOptions = {
    name: "PipeLogger",
    level: 'info', 
    streams: [commonStream, pipeStream, errorStream]
};

export let pipeHttpServerLoggerConfig: bunyan.LoggerOptions = {
    name: "PipeHttpServerLogger",
    level: 'info',
    streams: [commonStream, serverStream, errorStream]
}

export let mainLoggerConfig: bunyan.LoggerOptions = {
    name: "MainLogger",
    level: 'info',
    streams: [commonStream, errorStream]
}

export let fileLoggerConfig: bunyan.LoggerOptions = {
    name: "FileLogger",
    level: 'info',
    streams: [commonStream, fileStream]
}

export let pipePullHttpClient: bunyan.LoggerOptions = {
    name: "HttpClient",
    level: 'debug',
    streams: [commonStream, errorStream]
}

export let circuitBreaker: bunyan.LoggerOptions = {
    name: "CircuitBreaker",
    level: 'info',
    streams: [commonStream, errorStream]
}