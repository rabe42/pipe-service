/**
 * This file contains the configuration of the local pipes.
 */
import * as fs from "fs";
import * as bunyan from "bunyan";
import {mainLoggerConfig} from "./loggerConfig";
import {Contains, IsAlphanumeric, IsNumeric, IsFQDN} from "validator.ts/decorator/Validation.d.ts";

export class ListenerConfig {
    //@IsNumeric() -- Jasmine is not ready for this.
    port: number; 
    //@IsFQDN() 
    hostname: string
};
export class FileConfig {
    location: string; 
    pattern: string /* defaults to "${p}.${id}.json" */
};
export class PipeConfig {
    name: string; 
    description: string; 
    beginType: string; 
    beginConfig: ListenerConfig|FileConfig; 
    endType: string;
    endConfig: ListenerConfig|FileConfig
}

var logger = bunyan.createLogger(mainLoggerConfig);

export class PipeConfigurations {
    private configs: PipeConfig[] = [];

    constructor(location: string = './config') {
        this.loadPipeConfig(location);
    }

    /**
     * Load the pipe configuration from a given directory.
     * @param location The directory to read the file from.
     * @return An array of PipeConfig.
     */
    private loadPipeConfig(location: string = './config'): void {
        let files = fs.readdirSync(location);
        files.forEach((file: string) => {
            let path = location + '/' + file;
            logger.debug('loadPipeConfig(): found "%s".', file);
            if (file.match('[a-zA-Z_]+.pipe.json')
                && fs.statSync(path).isFile()) {
                logger.debug('loadPipeConfig(): read a pipe configuration from: %s', path);
                let pipeConfig: PipeConfig = JSON.parse(fs.readFileSync(path, 'utf8'));
                this.configs.push(pipeConfig);
            }
        });
    }

    public length(): number {
        return this.configs.length;
    }

    public findBeginByType(aType: string): PipeConfig[] {
        let result: PipeConfig[] = [];
        this.configs.forEach((config) => {
            if (config.beginType && config.beginType == aType) {
                result.push(config);
            }
        });
        return result;
    }

    public findEndByType(aType: string): PipeConfig[] {
        let result: PipeConfig[] = [];
        this.configs.forEach((config) => {
            if (config.endType && config.endType == aType) {
                result.push(config);
            }
        });
        return result;
    }
};
