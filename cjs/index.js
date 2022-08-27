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
  default: () => one_default,
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

// src/chunk.js
async function processOne(host, port, timeout, signal) {
  const exist = await one_default(host, port, timeout, signal);
  return [host, port, exist];
}
async function tcpExistsChunk(endpoints, options) {
  const { timeout = 500, returnOnlyExisted = true, signal } = options || {};
  const promises = [];
  for (const [host, port] of endpoints) {
    promises.push(processOne(host, port, timeout, signal));
  }
  const result = await Promise.all(promises);
  return returnOnlyExisted ? result.filter((item) => item[2]) : result;
}
var chunk_default = tcpExistsChunk;

// src/many.js
var DEFAULT_CHUNK_SIZE = 1400;
var DEFAULT_TIMEOUT = 160;
async function* tcpExistsMany(endpoints, options) {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    timeout = DEFAULT_TIMEOUT,
    returnOnlyExisted = true,
    signal
  } = options || {};
  while (endpoints.length > 0 && (signal == null ? void 0 : signal.aborted) !== true) {
    const chunk = endpoints.splice(0, chunkSize);
    yield await chunk_default(chunk, { timeout, returnOnlyExisted, signal });
  }
}
var many_default = tcpExistsMany;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  tcpExistsChunk,
  tcpExistsMany,
  tcpExistsOne
});
