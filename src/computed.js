import { get, set } from './helper'

export function injectComputed(vm) {
  if (vm.$options.$computed) {
    vm.$options.computed = createComputed(vm, vm.$options.$computed).reduce((m, {key, getter, setter}) => {
      if (m[key]) {
        throw new Error('computed has duplicate key [' + key + ']')
      }
      if (!setter) {
        m[key] = getter
      } else {
        m[key] = {get: getter, set: setter}
      }
      return m
    }, vm.$options.computed || {})
  }
}

function createComputed(vm, comp) {
  if (!comp) {
    return []
  }
  if (Array.isArray(comp)) {
    comp = comp.reduce((m, k) => {
      let key
      switch(typeof k) {
        case 'string':
          key = k.replace(/\//g, '.').split('.').pop()
          m[key] = k
          break;
        case 'function':
          key = k.name
          if (!key) {
            throw new Error('computed required function name')
          }
          m[key] = k
          break;
        case 'object':
          Object.assign(m, k)
          break;
      }
      
      return m
    }, {})
  }
  let res = []
  Object.keys(comp).forEach(key => {
    let v = comp[key]
    switch(typeof v) {
      case 'string':
        v = v.replace(/\//g, '.')
        
        res.push({
          key: key,
          getter: () => {
            return get(vm.$s, v)
          },
          setter: (nextVal) => set(vm.$s, v, nextVal)
        })
        if (key == 'news') {
          console.log(vm.$s, v, key, get(vm.$s, v))
        }
        break;
      case 'function':
        res.push({
          key: key,
          getter: v.bind(vm, vm.$s),
        })
        break;
      case 'object':
        if (v && v.get) {
          res.push({
            key,
            getter: v.get.bind(vm, vm.$s),
            setter: v.set ? (nextVal) => v.set.call(vm, nextVal, vm.$s) : null,
          })
        }
      default:
        res.push({
          key: key,
          getter: () => v,
        })
    }
  })

  return res

}