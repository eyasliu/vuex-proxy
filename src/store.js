import Vuex from 'vuex'
import Vue from 'vue'

class StoreProxy{
  constructor(path, store, proxyRoot) {
    this.$path = path
    this.$store = store
    if (!proxyRoot) {
      this.$root = this
    } else {
      this.$root = proxyRoot
    }
  }
  get $state() {
    return this.$path.split('.').reduce((s, k) => {
      if (k === 'root') {
        return s
      } else {
        return s[k]
      }
    }, this.$store.state)
  }
  get $name() {
    return this.$path.split('.').pop()
  }
  get $_watchVM() {
    if (this.$root.$watchVM) {
      return this.$root.$watchVM
    }
    
    this.$root.$watchVM = new Vue({store: this.$root})
    return this.$root.$watchVM
  }
  $registerModule(name, rawModule) {
    this.$store.registerModule(name, rawModule)
    const path = this.$path + '.' + name
    const mod = path.split('.').reduce((s, key) => {
      if (!s) {
        return undefined
      }
      const m = s[key] || s._children[key]
      if (m) {
        return m
      }
      return undefined
    }, this.$store._modules)
    this[name] = new StoreProxy(this.$path + '.' + name, this.$store, this.$root)
    proxyModule(this[name], mod, this.$store)
  }
  $unregisterModule(name) {
    this.$store.unregisterModule(name)
    delete this[name]
  }
}

function createStore(data) {
  data.strict = false

  if (data._vm && data._modules) {
    return data
  }
  const store = new Vuex.Store(data)
  return store
}

function proxyModule(px, mod, store) {
  // module
  const proxyMod = (modpx, parent) => {
    Object.keys(parent._children).forEach(key => {
      const storeMod = parent._children[key]
      const childrenPx = new StoreProxy(modpx.$path + '.' + key, store, px)
      if (modpx[key]) {
        throw new Error('module key has duplicate key [' + key + ']')
      }
      Object.defineProperty(modpx, key, {
        enumerable: true,
        get() {
          return childrenPx
        },
        set() {
          throw new Error('[vuexp] cannot set module state')
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
            return modpx.$state[stateKey]
          },
          set(v) {
            modpx.$store._withCommit(() => {
              modpx.$state[stateKey] = v
            })
            modpx.$store._subscribers.forEach(function (sub) { return sub({ type: 'VUEXP_CHANGE_STATE', payload: v}, modpx.$state)})
            return modpx.$state[stateKey]
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
      if (i == lastIndex && typeof modpx[k] === 'undefined') {
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
    }, px.$root)
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

  // watch
  const addWatch = (modpx, parent) => {
    Object.keys(parent.watch || (parent._rawModule && parent._rawModule.watch) || {}).forEach(key => {
      // 太早监听会没用，加个延时
      setTimeout(() => {
        modpx.$_watchVM.$watch((modpx.$path).replace('root', '$s') + '.' + key, (nv, ov) => {
          let handler = parent._rawModule.watch[key]
          if (typeof handler === 'function') {
            handler.call(modpx, nv, ov)
          } else if (typeof handler === 'string') {
            handler = modpx[handler]
            if (!handler) {
              throw new Error('actions or mutations not found ' + handler)
            }
            if (typeof handler === 'function') {
              handler.call(modpx, nv, ov)
            } else {
              throw new Error('watch handler must be function or action string name')
            }
          } else {
            throw new Error('watch handler must be function or action string name')
          }
          
        })
      }, 1);
    })
    Object.keys(parent._rawModule && parent._rawModule.modules || {}).forEach(name => {
      addWatch(modpx[name], parent._rawModule.modules[name])
    })
  }
  addWatch(px, mod)
  
}

function createProxy(store) {
  const px = new StoreProxy('root', store)

  proxyModule(px, store._modules.root, store)

  return px
}

export function Store(data) {
  if (data instanceof StoreProxy) {
    return data
  }

  let vuexStore = createStore(data)
  let proxyStore = createProxy(vuexStore)

  return proxyStore
}

export function injectStore(vm) {
  const options = vm.$options

  if (options.store) {
    options.store = Store(options.store)
    vm.$s = options.store
    vm.$s.$watchVM = vm
    vm.$store = vm.$s.$store
  }

  if (options.parent && options.parent.$s) {
    vm.$s = options.parent.$s
    vm.$store = vm.$s.$store
  }
}
