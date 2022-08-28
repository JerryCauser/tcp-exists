export { cmd, parseArgs, formatOneResult, DEFAULT_PORTS }

export interface HelpOptions {
    name: string
    version: string
    description: string
    engines: {
        [name:string]: string
    }
    homepage: string
    license: string
}

export interface ParsedArguments {
    colorless: boolean
    help: boolean
    delimiter: string
    endpoints: Set<[host:string, port:string|number]>
    chunkSize?: number,
    timeout?: number,
    verbose: boolean
}

declare const DEFAULT_PORTS:string

declare function cmd (args: string[], ac: AbortController): Promise<void>
declare function parseArgs (args: string[]): ParsedArguments
declare function formatOneResult (endpointResult:[host:string, port:string|number, result:boolean], delimiter:string, colorless:boolean):string

declare function getHelpText (options:HelpOptions):string
declare function red (string:string):string
declare function green (string:string):string
