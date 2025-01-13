import {TrackTypes, TriggerTypes} from "./operations.js";

let shouldTrack = true
let activeEffect = null

const targetMap = new WeakMap
const ITERATOR_KEY = Symbol("iterator");

const effectStack  = []
function pauseTrack() {
  shouldTrack = false
}

function resumeTrack() {
  shouldTrack = true
}

function cleanup(effectFn) {
  const {deps} = effectFn
  if (deps && deps.length === 0) {
    return
  }
  for (const dep of deps) {
    dep.delete(effectFn)
  }
  deps.length = 0
}

function track(target, type, key) {
  if (!shouldTrack || !activeEffect) return;
  let propMap = targetMap.get(target)
  if (!propMap) {
    propMap = new Map()
    targetMap.set(target, propMap)
  }
  if (type === TrackTypes.ITERATOR) {
    key = ITERATOR_KEY
  }
  let typeMap = propMap.get(key)
  if (!typeMap) {
    typeMap = new Map()
    propMap.set(key, typeMap)
  }
  let depSet = typeMap.get(type)
  if (!depSet) {
    depSet = new Set()
    typeMap.set(type, depSet)
  }
  if (!depSet.has(activeEffect)) {
    depSet.add(activeEffect)
    //  处理分支没有使用的情况
    activeEffect.deps.push(depSet)
  }

  // console.log(targetMap)
}

function trigger(target, type, key) {
  const fns = getEffectFns(target, type, key)
  if (!fns) return
  for (const fn of fns) {
    if (fn === activeEffect) {
      continue
    }
    fn()
  }
}

function getEffectFns(target, type, key) {
  const propMap = targetMap.get(target)
  if (!propMap) {
    return
  }
  const keys = [key]
  if (type === TriggerTypes.ADD || type === TriggerTypes.DELETE) {
    keys.push(ITERATOR_KEY)
  }
  const triggerTypeMap = {
    [TriggerTypes.SET]: [TrackTypes.GET],
    [TriggerTypes.ADD]: [TrackTypes.ITERATOR, TrackTypes.HAS, TrackTypes.GET],
    [TriggerTypes.DELETE]: [TrackTypes.ITERATOR, TrackTypes.HAS, TrackTypes.GET]

  }
  const effectFns = new Set
  for (const key of keys) {
    const typeMap = propMap.get(key)
    if (!typeMap) {
      continue
    }
    const trackTypes = triggerTypeMap[type]
    for (const trackType of trackTypes) {
      const dep = typeMap.get(trackType)
      if (!dep) {
        continue
      }
      for (const depElement of dep) {
        effectFns.add(depElement)
      }
    }
  }
  return effectFns
}

function effect(fn, options ={}) {
  // 建立运行环境
  const { lazy} = options//延迟执行
  const effectFn = () => {
    try {
      activeEffect = effectFn
      // 解决嵌套effect 执行栈的问题
      effectStack.push(effectFn)
      cleanup(effectFn)
      return fn()
    } finally {
      effectStack.pop()
      activeEffect = effectStack[effectStack.length - 1]
    }
  }
  effectFn.deps = []
  if (!lazy) {
    effectFn()
  }
  return  effectFn
}

export {
  effect,
  track,
  trigger,
  pauseTrack,
  resumeTrack,
}