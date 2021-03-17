import Vuex from 'vuex';

// 模块路径分隔符
const pathSeparator = '/';
/**
 * 基于原始 vuex Store 处理成代理 Store 实例
 * @param {StoreProxy} px 代理 Store 实例
 * @param {Vuex.Module} mod 父vuex Module 实例
 * @param {Vuex.Store} store Vuex原始的 Store 实例
 */
function proxyModule(px, mod, store) {
  // module
  const proxyMod = (modpx, parent) => {
    Object.keys(parent._children).forEach((key) => {
      if (modpx[key] instanceof StoreProxy) {
        return;
      }
      const storeMod = parent._children[key];
      const childrenPx = new StoreProxy(
        modpx.$path + pathSeparator + key,
        store,
        px.$root
      );
      if (modpx[key]) {
        throw new Error('module key has duplicate key [' + key + ']');
      }
      Object.defineProperty(modpx, key, {
        enumerable: true,
        configurable: true,
        get() {
          return childrenPx;
        },
        set() {
          throw new Error('[vuexp] cannot set module state');
        },
      });
      proxyMod(childrenPx, storeMod);
    });
  };
  proxyMod(px, mod);

  // state
  const proxyState = (modpx, parent) => {
    Object.keys(parent.state).forEach((stateKey) => {
      if (modpx[stateKey] instanceof StoreProxy) {
        // proxyState(modpx[stateKey], parent._children[stateKey]);
      } else {
        Object.defineProperty(modpx, stateKey, {
          enumerable: true,
          configurable: true,
          get() {
            return modpx.$state[stateKey];
          },
          set(v) {
            modpx.$store._withCommit(() => {
              modpx.$state[stateKey] = v;
            });
            modpx.$store._subscribers.forEach(function (sub) {
              return sub(
                { type: 'VUEXP_CHANGE_STATE', payload: v },
                modpx.$state
              );
            });
          },
        });
      }
    });
  };
  proxyState(px, mod);

  // getters
  const proxyGetters = (modpx, parent) => {
    const getters = parent._rawModule.getters || {};
    Object.keys(getters).forEach((key) => {
      const p = key.split('/');
      const lastIndex = p.length - 1;
      p.reduce((modpx, k, i) => {
        if (i < lastIndex) {
          return modpx[k];
        }
        if (i == lastIndex && typeof modpx[k] === 'undefined') {
          Object.defineProperty(modpx, k, {
            enumerable: true,
            configurable: true,
            get() {
              return store.getters[
                parent.namespaced
                  ? (modpx.$path + pathSeparator + key).replace('root/', '')
                  : key
              ];
            },
            set() {
              throw new Error('getters can not set value');
            },
          });
        }
      }, modpx);
    });
  };
  proxyGetters(px, mod);

  // actions
  const proxyAction = (modpx, parent) => {
    // parse action
    Object.keys(parent._rawModule.actions || {}).forEach((actionKey) => {
      if (modpx[actionKey]) {
        // throw new Error('action has duplicate key [' + actionKey + ']');
      } else {
        modpx[actionKey] = function wrapAction(...args) {
          return parent._rawModule.actions[actionKey].call(modpx, ...args);
        };
      }
    });
    // sub modules
    // Object.keys(parent._children).forEach((modKey) => {
    //   proxyAction(modpx[modKey], parent._children[modKey]);
    // });
  };
  proxyAction(px, mod);

  // mutations
  const proxyMutation = (modpx, parent) => {
    // parse mutation
    Object.keys(parent._rawModule.mutations || {}).forEach((mutationKey) => {
      if (modpx[mutationKey]) {
        // throw new Error('mutation has duplicate key [' + mutationKey + ']');
      } else {
        modpx[mutationKey] = function wrapMutation(...args) {
          return parent._rawModule.mutations[mutationKey].call(modpx, ...args);
        };
      }
    });
    // sub modules
    // Object.keys(parent._children).forEach((modKey) => {
    //   proxyMutation(modpx[modKey], parent._children[modKey]);
    // });
  };
  proxyMutation(px, mod);

  // watch
  const watchVM = store._watcherVM || store._vm;
  if (!watchVM.$s) {
    watchVM.$s = px.$root;
  }
  const addWatch = (modpx, parent) => {
    const watch =
      parent.watch || (parent._rawModule && parent._rawModule.watch) || {};
    Object.keys(watch).forEach((key) => {
      const handler = watch[key].bind(px.$root);
      watchVM.$watch(
        (modpx.$path.replace('root', '$s') + pathSeparator + key).replace(
          /\//,
          '.'
        ),
        (nv, ov) => {
          handler(nv, ov);
        }
      );
    });
    // Object.keys((parent._rawModule && parent._rawModule.modules) || {}).forEach(
    //   (name) => {
    //     addWatch(modpx[name], parent._rawModule.modules[name]);
    //   }
    // );
  };
  addWatch(px, mod);
}

/**
 * Store 基于 vuex store 生成的代理 Store
 */
class StoreProxy {
  /**
   * @param {string} path 模块路径
   * @param {vuex.Store} store vuex的原始Store
   * @param {Store} proxyRoot 顶层的代理 Store
   */
  constructor(path, store, proxyRoot) {
    this.$path = path;
    this.$name = this.$path.split(pathSeparator).pop();
    this.$store = store;
    this.$root = proxyRoot || this;

    this.$_module = path
      .split(pathSeparator)
      .reduce((mod, name) => mod[name] || mod._children[name], store._modules);

    proxyModule(this, this.$_module, store);

    // call register hook
    if (typeof this.$_module._rawModule.register === 'function') {
      this.$_module._rawModule.register.call(this);
    }
  }
  get $state() {
    return this.$path.split(pathSeparator).reduce((s, k) => {
      if (k === 'root') {
        return s;
      } else {
        return s[k];
      }
    }, this.$store.state);
  }
  registerModule(name, rawModule, options) {
    if (!Array.isArray(name)) {
      name = [name];
    }
    name.forEach((n) => {
      if (this[n] instanceof StoreProxy) {
        this.unregisterModule(n);
      } else if (this[n]) {
        this[n] = undefined;
        delete this[n];
      }
    });

    this.$store.registerModule(name, rawModule, options);

    name.forEach((n) => {
      this[n] = new StoreProxy(
        this.$path + pathSeparator + n,
        this.$store,
        this.$root
      );
    });
  }
  unregisterModule(name) {
    this.$store.unregisterModule(name);
    const cache = this[name];
    delete this[name];

    // call unregister hook
    if (cache && typeof cache.$_module._rawModule.unregister === 'function') {
      cache.$_module._rawModule.unregister.call(cache);
    }
  }
  replaceState(state) {
    return this.$store.replaceState(state);
  }
  hotUpdate(...args) {
    this.$store.hotUpdate(...args);
    proxyModule(this, this.$_module, this.$store);
  }
}

export const createRootProxy = (vuexStore) => {
  return new StoreProxy('root', vuexStore);
};

export const createStore = (data = {}) => {
  if (data instanceof StoreProxy) {
    return data;
  }
  const vuexStore = data._vm && data._modules ? data : new Vuex.Store(data);
  const store = createRootProxy(vuexStore);
  return store;
};

// export default StoreProxy;
