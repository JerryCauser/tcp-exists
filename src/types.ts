export type TcpExistsEndpoint = [host: string, port: string | number]

export type TcpExistsResult = [host: string, port: number, existed: boolean]

/** connection timeout in ms or `'auto'` to estimate it by round-trip times */
export type TcpExistsTimeout = number | 'auto'

export type TcpExistsEndpoints =
  string | Iterable<TcpExistsEndpoint> | AsyncIterable<TcpExistsEndpoint>

export interface TcpExistsManyOptions {
  /** max connections at once. **Default:** `DEFAULT_CONCURRENCY` */
  concurrency?: number
  /**
   * connection timeout in ms or `'auto'` to estimate it for every host
   * by measured round-trip times. **Default:** `'auto'`
   */
  timeout?: TcpExistsTimeout
  /** yield only existed endpoints. **Default:** `true` */
  returnOnlyExisted?: boolean
  /** closes all sockets and stops iteration ASAP */
  signal?: AbortSignal
}

export type ErrorWithCode<E extends Error, C extends string> = E & { code: C }

export const hasCode = <C extends string>(
  error: unknown,
  code: C
): error is ErrorWithCode<Error, C> =>
  error instanceof Error && (error as { code?: unknown }).code === code
