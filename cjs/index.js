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
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// index.js
var tcp_exists_exports = {};
__export(tcp_exists_exports, {
  DEFAULT_CHUNK_SIZE: () => DEFAULT_CHUNK_SIZE,
  DEFAULT_DELIMITER: () => DEFAULT_DELIMITER,
  DEFAULT_PORTS: () => DEFAULT_PORTS,
  DEFAULT_TIMEOUT: () => DEFAULT_TIMEOUT,
  default: () => one_default,
  getEndpoints: () => getEndpoints,
  tcpExistsChunk: () => chunk_default,
  tcpExistsMany: () => many_default,
  tcpExistsOne: () => one_default
});
module.exports = __toCommonJS(tcp_exists_exports);

// src/one.js
var import_node_net = __toESM(require("node:net"), 1);
var handleFail = (resolve, socket) => {
  if (socket && !socket.destroyed)
    socket.destroy();
  resolve(false);
};
var handleSuccess = (resolve, socket) => {
  socket.destroy();
  resolve(true);
};
async function tcpExistsOne(host, port, timeout = 100, signal) {
  return await new Promise((resolve) => {
    let socket;
    try {
      socket = import_node_net.default.connect({ port, host, signal });
      socket.setTimeout(timeout);
      socket.once("connect", () => handleSuccess(resolve, socket));
      socket.once("error", () => handleFail(resolve, socket));
      socket.once("timeout", () => handleFail(resolve, socket));
    } catch (e) {
      handleFail(resolve, socket);
    }
  });
}
var one_default = tcpExistsOne;

// src/stuff.js
var DEFAULT_DELIMITER = "\n";
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
function* getEndpoints(argument, defaultPorts = DEFAULT_PORTS) {
  const defaultPortList = (defaultPorts == null ? void 0 : defaultPorts.split(",")) || [];
  if (typeof argument === "string") {
    argument = argument.split(/[;\s]+/);
  }
  for (const item of argument) {
    let [host, ports] = item.split(":");
    host = host == null ? void 0 : host.trim().toLowerCase();
    ports = ports == null ? void 0 : ports.trim().toLowerCase().split(",");
    if (!Array.isArray(ports) || ports.length === 0) {
      ports = defaultPortList;
    }
    if (!host || ports.length === 0)
      return;
    for (const portChunk of ports) {
      if (portChunk.includes("-")) {
        let [fromPort, toPort] = portChunk.split("-");
        fromPort = Math.max(1, Math.abs(parseInt(fromPort, 10)));
        toPort = Math.min(65535, Math.abs(parseInt(toPort, 10)));
        if (isNaN(fromPort) || isNaN(toPort))
          continue;
        if (fromPort > toPort) {
          [fromPort, toPort] = [toPort, fromPort];
        }
        for (let p = fromPort; p <= toPort; ++p) {
          yield [host, p];
        }
      } else {
        yield [host, portChunk];
      }
    }
  }
}

// src/chunk.js
async function processOne(host, port, timeout, signal) {
  const exist = await one_default(host, port, timeout, signal);
  return [host, port, exist];
}
async function tcpExistsChunk(endpoints, options) {
  const {
    timeout = DEFAULT_TIMEOUT,
    returnOnlyExisted = true,
    signal
  } = options || {};
  const promises = [];
  for (const [host, port] of endpoints) {
    promises.push(processOne(host, port, timeout, signal));
  }
  const result = await Promise.all(promises);
  return returnOnlyExisted ? result.filter((item) => item[2]) : result;
}
var chunk_default = tcpExistsChunk;

// src/many.js
async function* tcpExistsMany(endpoints, options) {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    timeout = DEFAULT_TIMEOUT,
    returnOnlyExisted = true,
    signal
  } = options || {};
  if (Array.isArray(endpoints)) {
    while (endpoints.length > 0 && (signal == null ? void 0 : signal.aborted) !== true) {
      const chunk = endpoints.splice(0, chunkSize);
      yield await chunk_default(chunk, { timeout, returnOnlyExisted, signal });
    }
  } else if (typeof endpoints === "string") {
    const chunk = [];
    for (const item of getEndpoints(endpoints, DEFAULT_PORTS)) {
      if (chunk.push(item) === DEFAULT_CHUNK_SIZE) {
        if ((signal == null ? void 0 : signal.aborted) === true)
          return;
        yield await chunk_default(chunk, {
          timeout,
          returnOnlyExisted,
          signal
        });
        chunk.length = 0;
      }
    }
    if ((signal == null ? void 0 : signal.aborted) === true)
      return;
    yield await chunk_default(chunk, { timeout, returnOnlyExisted, signal });
    chunk.length = 0;
  }
}
var many_default = tcpExistsMany;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DEFAULT_CHUNK_SIZE,
  DEFAULT_DELIMITER,
  DEFAULT_PORTS,
  DEFAULT_TIMEOUT,
  getEndpoints,
  tcpExistsChunk,
  tcpExistsMany,
  tcpExistsOne
});
