var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
var __export = (target, all) => {
  __markAsModule(target);
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __reExport = (target, module2, desc) => {
  if (module2 && typeof module2 === "object" || typeof module2 === "function") {
    for (let key of __getOwnPropNames(module2))
      if (!__hasOwnProp.call(target, key) && key !== "default")
        __defProp(target, key, { get: () => module2[key], enumerable: !(desc = __getOwnPropDesc(module2, key)) || desc.enumerable });
  }
  return target;
};
var __toModule = (module2) => {
  return __reExport(__markAsModule(__defProp(module2 != null ? __create(__getProtoOf(module2)) : {}, "default", module2 && module2.__esModule && "default" in module2 ? { get: () => module2.default, enumerable: true } : { value: module2, enumerable: true })), module2);
};

// index.js
__export(exports, {
  default: () => one_default,
  tcpExistsChunk: () => chunk_default,
  tcpExistsMany: () => many_default,
  tcpExistsOne: () => one_default
});

// src/one.js
var import_node_net = __toModule(require("node:net"));
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
async function processOne(host, port, timeout) {
  const exist = await one_default(host, port, timeout);
  return [host, port, exist];
}
async function tcpExistsChunk(endpoints, options) {
  const { timeout = 1e3, returnOnlyExisted = true, signal } = options || {};
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
    timeout = 1e3,
    chunkSize = 4096,
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
