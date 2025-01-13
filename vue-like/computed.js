import {effect, track, trigger} from "./effect.js";
import {TrackTypes, TriggerTypes} from "./operations.js";

function normalizeParameters(params) {
  let getter, setter;
  if (typeof params === 'function') {
    getter = params
    setter = () => {
      console.warn('no setter function')
    }
  } else {
    getter = params.get;
    setter = params.set;
  }
  return {
    getter,
    setter
  }
}

export function computed(getterOrOptions) {

  const {getter, setter} = normalizeParameters(getterOrOptions)
  let value, dirty = true
  const effectFn = effect(getter, {
    lazy: true,
    scheduler() {
      dirty = true
      trigger(obj, TriggerTypes.SET, 'value')
    }
  })
  const obj = {
    get value() {
      track(obj, TrackTypes.GET, 'value')
      if (dirty) {
        value = effectFn()
        dirty =false
      }
      return value
    },
    set value(newValue) {
      setter(newValue)
    }
  }
  return obj
}