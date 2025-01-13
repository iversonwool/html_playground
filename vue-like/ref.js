import {track, trigger} from "./effect.js";
import {TrackTypes, TriggerTypes} from "./operations.js";

export function ref(value) {
  return {
    get value() {
      track(this, TrackTypes.GET, 'value')
      return value;
    },
    set value(newValue) {
      trigger(this, TriggerTypes.SET, 'value')
      value = newValue
    }
  }
}