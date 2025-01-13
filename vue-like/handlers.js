import {pauseTrack, resumeTrack, track, trigger} from "./effect.js";
import {hasChanged, isObject} from "./utils.js";
import {reactive} from "./reactive.js";
import { TriggerTypes, TrackTypes} from "./operations.js"

const RAW = Symbol('raw')
const arrayInstrumentation = {};

['includes', 'indexOf', 'lastIndexOf'].forEach((key) => {
  arrayInstrumentation[key] = function (...args) {
    const res = Array.prototype[key].apply(this, args) // 代理对象上找
    if (res < 0 || res === false) {
      return  Array.prototype[key].apply(this[RAW], args)
    }
    return res
  }
});

['push', 'pop', 'shift', 'unshift', 'splice'].forEach((key) => {
  arrayInstrumentation[key] = function (...args) {
    pauseTrack()
    const res = Array.prototype[key].apply(this, args)
    resumeTrack()
    return res
  }
})

export const handlers = {
  // 读
  get(target, key, receiver) {
    if (key === RAW) return target
    //依赖收集
    track(target, TrackTypes.GET, key)
    if (Array.isArray(target) && arrayInstrumentation.hasOwnProperty(key)) {
      return arrayInstrumentation[key]
    }
    const result = Reflect.get(target, key, receiver)
    return isObject(result) ? reactive(result) : result
  },
  // 写
  set(target, key, value, receiver) {
    //派发更新
    const type = target.hasOwnProperty(key)
      ? TriggerTypes.SET
      : TriggerTypes.ADD
    const oldValue = target[key]
    const oldLength = Array.isArray(target) ? target.length : undefined
    const isChanged = hasChanged(value, oldValue)

    const success = Reflect.set(target, key, value, receiver)
    if (!success) return
    const newLength = Array.isArray(target) ? target.length : undefined

    if (isChanged || type === TriggerTypes.ADD) {
      trigger(target, type, key)
      if (Array.isArray(target) && oldLength !== newLength) {
        if (key !== 'length') {
          trigger(target, TriggerTypes.SET, 'length')
        } else {
          for (let i = newLength; i < oldLength; i++) {
            trigger(target, TriggerTypes.DELETE, i)
          }
        }
      }
    }
    return success
  },
  // 对应 key in value
  has(target, key) {
    //依赖收集
    track(target, TrackTypes.HAS, key)
    return Reflect.has(target, key)
  },
  //iterator
  ownKeys(target) {
    track(target, TrackTypes.ITERATOR)
    return Reflect.ownKeys(target)
  },
  //delete
  deleteProperty(target, key) {
    const has = target.hasOwnProperty(key)
    const success = Reflect.deleteProperty(target, key)
    if (has && success) trigger(target, TriggerTypes.DELETE, key)
    return success
  }
}