import { get } from './helper'

export function injectMethods(vm) {
  if (vm.$options.$methods) {
    vm.$options.methods = createMethods(vm, vm.$options.$methods).reduce((m, {key, func}) => {
      if (m[key]) {
        throw new Error('methods has duplicate key [' + key + ']')
      }
      m[key] = func
      return m
    }, vm.$options.methods || {})
  }
}

export function createMethods(vm, methods) {
  if (!methods) {
    return []
  }

  if (Array.isArray(methods)) {
    methods = methods.reduce((m, k) => {
      let key
      switch(typeof k) {
        case 'string':
          key = k.replace(/\//g, '.').split('.').pop()
          m[key] = k
          break;
        case 'function':
          key = k.name
          if (!key) {
            throw new Error('method required function name')
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

  Object.keys(methods).forEach(key => {
    let v = methods[key]
    switch(typeof v) {
      case 'string':
        v = v.replace(/\//g, '.')
        res.push({
          key: key,
          func: (...args) => {
            return get(vm.$s, v).call(vm, ...args)
          },
        })
        break;
      case 'function':
        res.push({
          key: key,
          func: v.bind(vm),
        })
        break;
      default:
        res.push({
          key: key,
          getter: () => v,
        })
    }
  })

  return res
}