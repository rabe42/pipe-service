/**
 * This file contains the configuration of the local pipes.
 */

export type ListenerConfig = {port: number, hostname: string};
export type FileConfig = {location: string};
export type PipeConfig = {
    name: string, 
    description?: string, 
    beginType: string, 
    beginConfig: ListenerConfig|FileConfig, 
    endType: string,
    endConfig: ListenerConfig|FileConfig
}

// TODO Logic for reading JSON files from the configuration directory goes here.

export const pipes: PipeConfig[] = [
    {
        name: "config",
        description: "This is the way to configure the network of pipes.",
        beginType: "http",
        beginConfig: {
            port: 8081,
            hostname: "localhost" // Makes sure, that the service is just locally reachable!
        },
        endType: "file",
        endConfig: {
            location: "../config/"
        }
    },
    {
        name: "master-data",
        beginType: "http",
        beginConfig: {
            port: 8081,
            hostname: "localhost"
        },
        endType: "http",
        endConfig: {
            port: 8081,
            hostname: "remote.host.ip"
        }
    }
];