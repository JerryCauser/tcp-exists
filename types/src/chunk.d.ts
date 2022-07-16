export default tcpExistsChunk

declare function tcpExistsChunk(
  endpoints: [string, string | number][],
  options?: {
    timeout?: number
    returnOnlyExisted?: boolean
    signal?: AbortSignal
  }
): Promise<[string, string | number, boolean][]>
