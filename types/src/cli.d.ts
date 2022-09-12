import { TcpExistsResult } from './chunk'

export interface HelpOptions {
  name: string
  version: string
  description: string
  engines: {
    [name: string]: string
  }
  homepage: string
  license: string
}

export interface ParsedArguments {
  colorless: boolean
  help: boolean
  delimiter: string
  endpoints: string[]
  chunkSize?: number
  timeout?: number
  verbose: boolean
}

export function cmd(args: string[], ac: AbortController): Promise<void>
export function parseArgs(args: string[]): ParsedArguments
export function formatOneResult(
  endpointResult: TcpExistsResult,
  delimiter: string,
  colorless: boolean
): string

declare function getHelpText(options: HelpOptions): string
