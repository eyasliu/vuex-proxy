(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('vuex')) :
  typeof define === 'function' && define.amd ? define(['vuex'], factory) :
  (global = global || self, global['vuex-proxy'] = factory(global.vuex));
}(this, (function (vuex) { 'use strict';

  vuex = vuex && vuex.hasOwnProperty('default') ? vuex['default'] : vuex;

  /**
  * 获取一个对象指定路径的值
  * 
  * @param {object} obj 需要获取的对象
  * @param {string} key 对象的路径
  * @param {any} def 如果指定路径没有值，返回的默认值
  * 
  * @example 
  * ```
  * get(window, 'location.host', 'default value')
  * ```
  */
  const get = (obj, key, def, p) => {
    if (typeof key === 'undefined') return def
    p = 0;
    key = key.split ? key.split('.') : key;
    while (obj && p < key.length) obj = obj[key[p++]];
    return (obj === undefined || p < key.length) ? def : obj;
  };

  const set = (obj, key, val) => {
    if (typeof key === 'undefined') throw new Error('required set key')
    let p = 0;
    key = key.split ? key.split('.') : key;
    const endKey = key.pop();
    while (obj && p < key.length) obj = obj[key[p++]];
    if (obj !== undefined && p >= key.length && obj[endKey]) {
      return obj[endKey] = val
    }
  };

  class StoreProxy{
    constructor(path, store, proxyRoot) {
      this.$path = path;
      this.$store = store;
      if (!proxyRoot) {
        this.$root = this;
      } else {
        this.$root = proxyRoot;
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
    $registerModule(name, rawModule) {
      this.$store.registerModule(name, rawModule);
      const path = this.$path + '.' + name;
      const mod = path.split('.').reduce((s, key) => {
        if (!s) {
          return undefined
        }
        const m = s[key] || s._children[key];
        if (m) {
          return m
        }
        return undefined
      }, this.$store._modules);
      this[name] = new StoreProxy(this.$path + '.' + name, this.$store, this.$root);
      proxyModule(this[name], mod, this.$store);
    }
    $unregisterModule(name) {
      this.$store.unregisterModule(name);
      delete this[name];
    }
  }

  function createStore(data) {
    data.strict = false;

    if (data._vm && data._modules) {
      return data
    }
    const store = new vuex.Store(data);
    return store
  }

  function proxyModule(px, mod, store) {
    // module
    const proxyMod = (modpx, parent) => {
      Object.keys(parent._children).forEach(key => {
        const storeMod = parent._children[key];
        const childrenPx = new StoreProxy(modpx.$path + '.' + key, store, px);
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
        });
        proxyMod(childrenPx, storeMod);
      });
    };
    proxyMod(px, mod);

    // state
    const proxyState = (modpx, parent) => {
      Object.keys(parent.state).forEach(stateKey => {
        if (modpx[stateKey] instanceof StoreProxy) {
          proxyState(modpx[stateKey], parent._children[stateKey]);
        } else {
          Object.defineProperty(modpx, stateKey, {
            enumerable: true,
            get() {
              return modpx.$state[stateKey]
            },
            set(v) {
              modpx.$store._withCommit(() => {
                modpx.$state[stateKey] = v;
              });
              modpx.$store._subscribers.forEach(function (sub) { return sub({ type: 'VUEXP_CHANGE_STATE', payload: v}, modpx.$state)});
              return modpx.$state[stateKey]
            }
          });
        }
      });
    };
    proxyState(px, mod);

    // getters
    Object.keys(store.getters).forEach(key => {
      const p = key.split('/');
      const lastIndex = p.length - 1;
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
          });
        }
      }, px.$root);
    });

    // actions
    const proxyAction = (modpx, parent) => {
      // parse action
      Object.keys(parent._rawModule.actions || {}).forEach(actionKey => {
        if (modpx[actionKey]) {
          throw new Error('action has duplicate key [' + actionKey + ']')
        } else {
          modpx[actionKey] = function wrapAction(...args) {
            return parent._rawModule.actions[actionKey].call(modpx, ...args)
          };
        }
      });
      // sub modules
      Object.keys(parent._children).forEach(modKey => {
        proxyAction(modpx[modKey], parent._children[modKey]);
      });
    };
    proxyAction(px, mod);


    // mutations
    const proxyMutation = (modpx, parent) => {
      // parse mutation
      Object.keys(parent._rawModule.mutations || {}).forEach(mutationKey => {
        if (modpx[mutationKey]) {
          throw new Error('mutation has duplicate key [' + mutationKey + ']')
        } else {
          modpx[mutationKey] = function wrapMutation(...args) {
            return parent._rawModule.mutations[mutationKey].call(modpx, ...args)
          };
        }
      });
      // sub modules
      Object.keys(parent._children).forEach(modKey => {
        proxyMutation(modpx[modKey], parent._children[modKey]);
      });
    };
    proxyMutation(px, mod);
  }

  function createProxy(store) {
    const px = new StoreProxy('root', store);

    proxyModule(px, store._modules.root, store);

    return px
  }

  function injectStore(vm) {
    const options = vm.$options;

    if (options.store) {
      options.store = createStore(options.store);
      vm.$store = options.store;
      vm.$s = createProxy(vm.$store);
    }
    
    if (options.parent && options.parent.$s) {
      vm.$s = options.parent.$s;
    }
  }

  function injectComputed(vm) {
    if (vm.$options.$computed) {
      vm.$options.computed = createComputed(vm, vm.$options.$computed).reduce((m, {key, getter, setter}) => {
        // if (m[key]) {
        //   throw new Error('computed has duplicate key [' + key + ']')
        // }
        if (!setter) {
          m[key] = getter;
        } else {
          m[key] = {get: getter, set: setter};
        }
        return m
      }, vm.$options.computed || {});
    }
  }

  function createComputed(vm, comp) {
    if (!comp) {
      return []
    }
    if (Array.isArray(comp)) {
      comp = comp.reduce((m, k) => {
        let key;
        switch(typeof k) {
          case 'string':
            key = k.replace(/\//g, '.').split('.').pop();
            m[key] = k;
            break;
          case 'function':
            key = k.name;
            if (!key) {
              throw new Error('computed required function name')
            }
            m[key] = k;
            break;
          case 'object':
            Object.assign(m, k);
            break;
        }
        
        return m
      }, {});
    }
    let res = [];
    Object.keys(comp).forEach(key => {
      let v = comp[key];
      switch(typeof v) {
        case 'string':
          v = v.replace(/\//g, '.');
          
          res.push({
            key: key,
            getter: () => {
              return get(vm.$s, v)
            },
            setter: (nextVal) => set(vm.$s, v, nextVal)
          });
          if (key == 'news') {
            console.log(vm.$s, v, key, get(vm.$s, v));
          }
          break;
        case 'function':
          res.push({
            key: key,
            getter: v.bind(vm, vm.$s),
          });
          break;
        case 'object':
          if (v && v.get) {
            res.push({
              key,
              getter: v.get.bind(vm, vm.$s),
              setter: v.set ? (nextVal) => v.set.call(vm, nextVal, vm.$s) : null,
            });
          }
          break;
        default:
          res.push({
            key: key,
            getter: () => v,
          });
          break;
      }
    });

    return res

  }

  function injectMethods(vm) {
    if (vm.$options.$methods) {
      vm.$options.methods = createMethods(vm, vm.$options.$methods).reduce((m, {key, func}) => {
        if (m[key]) {
          throw new Error('methods has duplicate key [' + key + ']')
        }
        m[key] = func;
        return m
      }, vm.$options.methods || {});
    }
  }

  function createMethods(vm, methods) {
    if (!methods) {
      return []
    }

    if (Array.isArray(methods)) {
      methods = methods.reduce((m, k) => {
        let key;
        switch(typeof k) {
          case 'string':
            key = k.replace(/\//g, '.').split('.').pop();
            m[key] = k;
            break;
          case 'function':
            key = k.name;
            if (!key) {
              throw new Error('method required function name')
            }
            m[key] = k;
            break;
          case 'object':
            Object.assign(m, k);
            break;
        }
        
        return m
      }, {});
    }
    let res = [];

    Object.keys(methods).forEach(key => {
      let v = methods[key];
      switch(typeof v) {
        case 'string':
          v = v.replace(/\//g, '.');
          res.push({
            key: key,
            func: (...args) => {
              return get(vm.$s, v).call(vm, ...args)
            },
          });
          break;
        case 'function':
          res.push({
            key: key,
            func: v.bind(vm),
          });
          break;
        default:
          res.push({
            key: key,
            getter: () => v,
          });
      }
    });

    return res
  }

  var install = (Vue) => {
    Vue.use(vuex);
    function beforeCreate() {
      const vm = this;

      injectStore(vm);

      injectComputed(vm);

      injectMethods(vm);
      
    }
    Vue.mixin({
      beforeCreate
    });
  };

  var index = {
    install
  };

  // export { computed, methods } from './api'

  return index;

})));
