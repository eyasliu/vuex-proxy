import vuex from 'vuex'
import { get } from './helper'

class StoreProxy{
  constructor(store, proxyRoot) {
    this.$store = store
    if (!proxyRoot) {
      this.$s = this
    } else {
      this.$s = proxyRoot
    }
  }
}

function createStore(data) {
  data.strict = false
  const store = new vuex.Store(data)
  return store
}

function proxyModule(px, mod, store) {
  // module
  const proxyMod = (modpx, parent) => {
    Object.keys(parent._children).forEach(key => {
      const storeMod = parent._children[key]
      const childrenPx = new StoreProxy(store, px)
      
      Object.defineProperty(modpx, key, {
        // configurable: true,
        // writable: true,
        enumerable: true,
        get() {
          return childrenPx
        }
      })
      proxyMod(childrenPx, storeMod)
    })
  }
  proxyMod(px, mod)

  // state
  const proxyState = (modpx, parent) => {
    Object.keys(parent.state).forEach(stateKey => {
      if (modpx[stateKey] instanceof StoreProxy) {
        proxyState(modpx[stateKey], parent._children[stateKey])
      } else {
        Object.defineProperty(modpx, stateKey, {
          enumerable: true,
          get() {
            return parent.state[stateKey]
          },
          set(v) {
            return parent.state[stateKey] = v
          }
        })
      }
    })
  }
  proxyState(px, mod)

  // getters
  Object.keys(store.getters).forEach(key => {
    const p = key.split('/')
    const lastIndex = p.length - 1
    p.reduce((modpx, k, i) => {
      if (i < lastIndex) {
        return modpx[k]
      }
      if (i == lastIndex) {
        Object.defineProperty(modpx, k, {
          enumerable: true,
          get() {
            return store.getters[key]
          },
          set() {
            throw new Error('getters can not set value')
          }
        })
      }
    }, px)
  })

  // actions
  const proxyAction = (modpx, parent) => {
    // parse action
    Object.keys(parent._rawModule.actions || {}).forEach(actionKey => {
      if (modpx[actionKey]) {
        throw new Error('action has duplicate key [' + actionKey + ']')
      } else {
        modpx[actionKey] = function wrapAction(...args) {
          return parent._rawModule.actions[actionKey].call(modpx, ...args)
        }
      }
    })
    // sub modules
    Object.keys(parent._children).forEach(modKey => {
      proxyAction(modpx[modKey], parent._children[modKey])
    })
  }
  proxyAction(px, mod)


  // mutations
  const proxyMutation = (modpx, parent) => {
    // parse mutation
    Object.keys(parent._rawModule.mutations || {}).forEach(mutationKey => {
      if (modpx[mutationKey]) {
        throw new Error('mutation has duplicate key [' + mutationKey + ']')
      } else {
        modpx[mutationKey] = function wrapMutation(...args) {
          return parent._rawModule.mutations[mutationKey].call(modpx, ...args)
        }
      }
    })
    // sub modules
    Object.keys(parent._children).forEach(modKey => {
      proxyMutation(modpx[modKey], parent._children[modKey])
    })
  }
  proxyMutation(px, mod)
}

function createProxy(store) {
  const px = new StoreProxy(store)

  proxyModule(px, store._modules.root, store)

  return px
}

export function injectStore(vm) {
  const options = vm.$options

  if (options.store) {
    options.store = createStore(options.store)
    vm.$store = options.store
    vm.$s = createProxy(vm.$store)
  }
  
  if (options.parent && options.parent.$s) {
    vm.$s = options.parent.$s
  }
}
