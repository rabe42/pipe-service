/**
 * This file contains the configuration of the local pipes.
 */
import * as fs from "fs";
import * as bunyan from "bunyan";
import {mainLoggerConfig} from "./loggerConfig";
import {Contains, IsAlphanumeric, IsNumeric, IsFQDN} from "validator.ts/decorator/Validation.d.ts";

export class ListenerConfig {
    //@IsNumeric() 
    port: number; 
    //@IsFQDN() 
    hostname: string
};
export class FileConfig {
    location: string; 
    pattern: string /* defaults to "${p}.${id}.json" */
};
export type PipeConfig = {
    name: string, 
    description?: string, 
    beginType: string, 
    beginConfig: ListenerConfig|FileConfig, 
    endType: string,
    endConfig: ListenerConfig|FileConfig
}

// TODO Logic for reading JSON files from the configuration directory goes here.
var logger = bunyan.createLogger(mainLoggerConfig);

export function loadPipeConfig(location: string = './config'): PipeConfig[] {
    let result: PipeConfig[] = [];
    let files = fs.readdirSync(location);
    files.forEach((file: string) => {
        let path = location + '/' + file;
        logger.debug('loadPipeConfig(): found "%s".', file);
        if (file.match('[a-zA-Z_]+.pipe.json')
            && fs.statSync(path).isFile()) {
            logger.debug('loadPipeConfig(): read a pipe configuration from: %s', path);
            let pipeConfig: PipeConfig = JSON.parse(fs.readFileSync(path, 'utf8'));
            result.push(pipeConfig);
        }
    });
    return result;
}