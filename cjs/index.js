var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// index.js
var index_exports = {};
__export(index_exports, {
  DEFAULT_CHUNK_SIZE: () => DEFAULT_CHUNK_SIZE,
  DEFAULT_PORTS: () => DEFAULT_PORTS,
  DEFAULT_TIMEOUT: () => DEFAULT_TIMEOUT,
  default: () => one_default,
  getEndpoints: () => getEndpoints,
  tcpExistsChunk: () => chunk_default,
  tcpExistsMany: () => many_default,
  tcpExistsOne: () => one_default
});
module.exports = __toCommonJS(index_exports);

// src/one.js
var import_node_net2 = __toESM(require("node:net"), 1);

// src/lookup.js
var import_node_dns = __toESM(require("node:dns"), 1);
var import_node_net = __toESM(require("node:net"), 1);
var normalizeFamily = (family) => {
  if (family === "IPv4") return 4;
  if (family === "IPv6") return 6;
  return Number(family) || 0;
};
var firstOfEveryFamily = (addresses) => {
  const families = /* @__PURE__ */ new Set();
  return addresses.filter(({ family }) => {
    if (families.has(family)) return false;
    families.add(family);
    return true;
  });
};
var isAutoSelectFamilyEnabled = () => typeof import_node_net.default.getDefaultAutoSelectFamily === "function" && import_node_net.default.getDefaultAutoSelectFamily();
function createCachedLookup() {
  const cache = /* @__PURE__ */ new Map();
  const familiesCount = /* @__PURE__ */ new Map();
  const resolve = (hostname) => {
    let promise = cache.get(hostname);
    if (promise === void 0) {
      promise = import_node_dns.default.promises.lookup(hostname, { all: true }).then(firstOfEveryFamily);
      promise.then(
        (addresses) => familiesCount.set(hostname, addresses.length),
        () => {
        }
      );
      cache.set(hostname, promise);
    }
    return promise;
  };
  const lookup = (hostname, options, callback) => {
    if (typeof options === "function") {
      callback = options;
      options = {};
    } else if (typeof options !== "object" || options === null) {
      options = { family: options };
    }
    const family = normalizeFamily(options.family);
    resolve(hostname).then(
      (addresses) => {
        const filtered = family === 0 ? addresses : addresses.filter((a) => a.family === family);
        if (filtered.length === 0) {
          const error = new Error(`getaddrinfo ENOTFOUND ${hostname}`);
          error.code = "ENOTFOUND";
          error.hostname = hostname;
          callback(error);
        } else if (options.all) {
          callback(null, filtered);
        } else {
          callback(null, filtered[0].address, filtered[0].family);
        }
      },
      (error) => callback(error)
    );
  };
  lookup.warmUp = async (hostnames) => {
    const promises = [];
    for (const hostname of hostnames) {
      if (import_node_net.default.isIP(hostname) === 0) promises.push(resolve(hostname));
    }
    await Promise.allSettled(promises);
  };
  lookup.getAttempts = (hostname) => isAutoSelectFamilyEnabled() ? Math.max(1, familiesCount.get(hostname) ?? 1) : 1;
  return lookup;
}

// src/utilities.js
var DEFAULT_CHUNK_SIZE = 2300;
var DEFAULT_TIMEOUT = 250;
var DEFAULT_PORTS_DICT = {
  21: "ftp",
  22: "ssh",
  23: "telnet",
  25: "smtp",
  53: "domain name system",
  80: "http",
  110: "pop3",
  111: "rpcbind",
  135: "msrpc",
  139: "netbios-ssn",
  143: "imap",
  443: "https",
  445: "microsoft-ds",
  993: "imaps",
  995: "pop3s",
  1723: "pptp",
  3306: "mysql",
  3389: "ms-wbt-server",
  5900: "vnc",
  8080: "http-proxy"
};
var DEFAULT_PORTS = process.env.DEFAULT_PORTS || Object.keys(DEFAULT_PORTS_DICT).join(",");
var MIN_PORT = 1;
var MAX_PORT = 65535;
var invalidEndpointError = (message) => {
  const error = new RangeError(message);
  error.code = "ERR_INVALID_ENDPOINT";
  return error;
};
function parsePort(value, item) {
  const port = Number(value);
  if (!/^\d+$/.test(value) || port < MIN_PORT || port > MAX_PORT) {
    throw invalidEndpointError(
      `Invalid port "${value}" in "${item}". Port must be an integer from ${MIN_PORT} to ${MAX_PORT}`
    );
  }
  return port;
}
function splitEndpoint(item) {
  if (item.startsWith("[")) {
    const end = item.indexOf("]");
    const rest = item.slice(end + 1);
    if (end === -1 || rest !== "" && !rest.startsWith(":")) {
      throw invalidEndpointError(
        `Invalid endpoint "${item}". Expected format for IPv6 is [host]:ports`
      );
    }
    return [item.slice(1, end), rest.slice(1)];
  }
  const firstColon = item.indexOf(":");
  if (firstColon === -1 || item.indexOf(":", firstColon + 1) !== -1) {
    return [item, ""];
  }
  return [item.slice(0, firstColon), item.slice(firstColon + 1)];
}
function parsePorts(portsString, item) {
  const result = [];
  for (const portChunk of portsString.split(",")) {
    const chunk = portChunk.trim();
    if (chunk === "") continue;
    if (chunk.includes("-")) {
      const [from, to, ...rest] = chunk.split("-").map((p) => p.trim());
      if (rest.length > 0) {
        throw invalidEndpointError(`Invalid port range "${chunk}" in "${item}"`);
      }
      const fromPort = parsePort(from, item);
      const toPort = parsePort(to, item);
      result.push(fromPort > toPort ? [toPort, fromPort] : [fromPort, toPort]);
    } else {
      parsePort(chunk, item);
      result.push(chunk);
    }
  }
  return result;
}
function* getEndpoints(argument, defaultPorts = DEFAULT_PORTS) {
  if (typeof argument === "string") {
    argument = argument.trim().split(/[;\s]+/);
  }
  const parsed = [];
  let defaultPortList;
  for (const rawItem of argument) {
    const item = String(rawItem).trim().toLowerCase();
    if (item === "") continue;
    const [host, portsString] = splitEndpoint(item);
    if (host === "") continue;
    let ports = parsePorts(portsString, item);
    if (ports.length === 0) {
      defaultPortList ??= parsePorts(defaultPorts || "", "DEFAULT_PORTS");
      ports = defaultPortList;
    }
    parsed.push([host, ports]);
  }
  for (const [host, ports] of parsed) {
    for (const port of ports) {
      if (typeof port === "string") {
        yield [host, port];
        continue;
      }
      for (let p = port[0]; p <= port[1]; ++p) {
        yield [host, p];
      }
    }
  }
}

// src/one.js
function checkEndpoint(host, port, timeout, signal, lookup, attempts = 1) {
  return new Promise((resolve) => {
    if ((signal == null ? void 0 : signal.aborted) === true) {
      resolve(false);
      return;
    }
    let socket;
    let timer;
    let finished = false;
    const finish = (exist) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      signal == null ? void 0 : signal.removeEventListener("abort", onAbort);
      if (socket && !socket.destroyed) socket.destroy();
      resolve(exist);
    };
    const onAbort = () => finish(false);
    signal == null ? void 0 : signal.addEventListener("abort", onAbort, { once: true });
    try {
      socket = import_node_net2.default.connect({
        port,
        host,
        lookup,
        autoSelectFamilyAttemptTimeout: Math.max(10, Math.round(timeout))
      });
      timer = setTimeout(
        () => setImmediate(finish, false),
        timeout * Math.max(1, attempts)
      );
      socket.once("connect", () => finish(true));
      socket.once("error", () => finish(false));
    } catch (e) {
      finish(false);
    }
  });
}
async function untilSettledOrAborted(promise, signal) {
  if (!signal) {
    await promise;
    return;
  }
  let onAbort;
  try {
    await Promise.race([
      promise,
      new Promise((resolve) => {
        onAbort = resolve;
        signal.addEventListener("abort", onAbort, { once: true });
      })
    ]);
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}
async function tcpExistsOne(host, port, timeout = DEFAULT_TIMEOUT, signal) {
  const lookup = createCachedLookup();
  await untilSettledOrAborted(lookup.warmUp([host]), signal);
  return await checkEndpoint(
    host,
    port,
    timeout,
    signal,
    lookup,
    lookup.getAttempts(host)
  );
}
var one_default = tcpExistsOne;

// src/chunk.js
async function processOne(host, port, timeout, signal, lookup) {
  const exist = await checkEndpoint(
    host,
    port,
    timeout,
    signal,
    lookup,
    lookup.getAttempts(host)
  );
  return [host, port, exist];
}
async function checkChunk(endpoints, { timeout, returnOnlyExisted, signal }, lookup) {
  const list = Array.from(endpoints);
  await lookup.warmUp(new Set(list.map(([host]) => host)));
  const promises = [];
  for (const [host, port] of list) {
    promises.push(processOne(host, port, timeout, signal, lookup));
  }
  const result = await Promise.all(promises);
  return returnOnlyExisted ? result.filter((item) => item[2]) : result;
}
var deprecationWarned = false;
async function tcpExistsChunk(endpoints, options) {
  if (!deprecationWarned) {
    deprecationWarned = true;
    process.emitWarning(
      "tcpExistsChunk is deprecated and will be removed in tcp-exists v2.0.0. Use tcpExistsMany instead.",
      "DeprecationWarning",
      "TCP_EXISTS_DEP_CHUNK"
    );
  }
  const {
    timeout = DEFAULT_TIMEOUT,
    returnOnlyExisted = true,
    signal
  } = options || {};
  return await checkChunk(
    endpoints,
    { timeout, returnOnlyExisted, signal },
    createCachedLookup()
  );
}
var chunk_default = tcpExistsChunk;

// src/many.js
var isIterable = (value) => value != null && (typeof value[Symbol.iterator] === "function" || typeof value[Symbol.asyncIterator] === "function");
async function* tcpExistsMany(endpoints, options) {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    timeout = DEFAULT_TIMEOUT,
    returnOnlyExisted = true,
    signal
  } = options || {};
  const source = typeof endpoints === "string" ? getEndpoints(endpoints) : endpoints;
  if (!isIterable(source)) {
    throw new TypeError(
      "endpoints must be a string, an Iterable or an AsyncIterable of [host, port]"
    );
  }
  const size = Number.isInteger(chunkSize) && chunkSize > 0 ? chunkSize : DEFAULT_CHUNK_SIZE;
  const chunkOptions = { timeout, returnOnlyExisted, signal };
  const lookup = createCachedLookup();
  let chunk = [];
  for await (const endpoint of source) {
    if ((signal == null ? void 0 : signal.aborted) === true) return;
    if (chunk.push(endpoint) === size) {
      const ready = chunk;
      chunk = [];
      yield await checkChunk(ready, chunkOptions, lookup);
    }
  }
  if ((signal == null ? void 0 : signal.aborted) === true || chunk.length === 0) return;
  yield await checkChunk(chunk, chunkOptions, lookup);
}
var many_default = tcpExistsMany;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DEFAULT_CHUNK_SIZE,
  DEFAULT_PORTS,
  DEFAULT_TIMEOUT,
  getEndpoints,
  tcpExistsChunk,
  tcpExistsMany,
  tcpExistsOne
});
