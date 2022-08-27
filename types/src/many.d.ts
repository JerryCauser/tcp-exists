export default tcpExistsMany

export const DEFAULT_CHUNK_SIZE:number
export const DEFAULT_TIMEOUT:number

declare function tcpExistsMany(
    endpoints: [string, string | number][],
    options?: {
        chunkSize?: number
        timeout?: number
        returnOnlyExisted?: boolean
        signal?: AbortSignal
    }
): AsyncIterable<[string, string | number, boolean][]>
