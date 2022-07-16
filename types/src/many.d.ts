export default tcpExistsMany

declare function tcpExistsMany(
    endpoints: [string, string | number][],
    options?: {
        chunkSize?: number
        timeout?: number
        returnOnlyExisted?: boolean
        signal?: AbortSignal
    }
): AsyncIterable<[string, string | number, boolean][]>
