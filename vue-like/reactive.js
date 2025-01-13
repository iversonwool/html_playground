import { isObject} from "./utils.js";
import {handlers} from "./handlers.js";

const targetMap = new WeakMap();

export function reactive(obj) {
  if (!isObject(obj)) {
    return obj
  }
  if (targetMap.has(obj)) {
    return targetMap.get(obj)
  }
  const proxy = new Proxy(obj, handlers)
  targetMap.set(obj, proxy)
  return proxy
}