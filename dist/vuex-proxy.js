/*!
 * vuex-proxy v1.0.0
 * (c) 2021 Eyas Liu
 * @license MIT
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('vuex')) :
  typeof define === 'function' && define.amd ? define(['exports', 'vuex'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.VuexProxy = {}, global.Vuex));
}(this, (function (exports, Vuex) { 'use strict';

  function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

  var Vuex__default = /*#__PURE__*/_interopDefaultLegacy(Vuex);

  // 模块路径分隔符
  var pathSeparator = '/';
  /**
   * 基于原始 vuex Store 处理成代理 Store 实例
   * @param {StoreProxy} px 代理 Store 实例
   * @param {Vuex.Module} mod 父vuex Module 实例
   * @param {Vuex.Store} store Vuex原始的 Store 实例
   */
  function proxyModule(px, mod, store) {
    // module
    var proxyMod = function (modpx, parent) {
      Object.keys(parent._children).forEach(function (key) {
        if (modpx[key] instanceof StoreProxy) {
          return;
        }
        var storeMod = parent._children[key];
        var childrenPx = new StoreProxy(
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
          get: function get() {
            return childrenPx;
          },
          set: function set() {
            throw new Error('[vuexp] cannot set module state');
          },
        });
        proxyMod(childrenPx, storeMod);
      });
    };
    proxyMod(px, mod);

    // state
    var proxyState = function (modpx, parent) {
      Object.keys(parent.state).forEach(function (stateKey) {
        if (modpx[stateKey] instanceof StoreProxy) ; else {
          Object.defineProperty(modpx, stateKey, {
            enumerable: true,
            configurable: true,
            get: function get() {
              return modpx.$state[stateKey];
            },
            set: function set(v) {
              modpx.$store._withCommit(function () {
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
    var proxyGetters = function (modpx, parent) {
      var getters = parent._rawModule.getters || {};
      Object.keys(getters).forEach(function (key) {
        var p = key.split('/');
        var lastIndex = p.length - 1;
        p.reduce(function (modpx, k, i) {
          if (i < lastIndex) {
            return modpx[k];
          }
          if (i == lastIndex && typeof modpx[k] === 'undefined') {
            Object.defineProperty(modpx, k, {
              enumerable: true,
              configurable: true,
              get: function get() {
                return store.getters[
                  parent.namespaced
                    ? (modpx.$path + pathSeparator + key).replace('root/', '')
                    : key
                ];
              },
              set: function set() {
                throw new Error('getters can not set value');
              },
            });
          }
        }, modpx);
      });
    };
    proxyGetters(px, mod);

    // actions
    var proxyAction = function (modpx, parent) {
      // parse action
      Object.keys(parent._rawModule.actions || {}).forEach(function (actionKey) {
        if (modpx[actionKey]) ; else {
          modpx[actionKey] = function wrapAction() {
            var ref;

            var args = [], len = arguments.length;
            while ( len-- ) args[ len ] = arguments[ len ];
            return (ref = parent._rawModule.actions[actionKey]).call.apply(ref, [ modpx ].concat( args ));
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
    var proxyMutation = function (modpx, parent) {
      // parse mutation
      Object.keys(parent._rawModule.mutations || {}).forEach(function (mutationKey) {
        if (modpx[mutationKey]) ; else {
          modpx[mutationKey] = function wrapMutation() {
            var ref;

            var args = [], len = arguments.length;
            while ( len-- ) args[ len ] = arguments[ len ];
            return (ref = parent._rawModule.mutations[mutationKey]).call.apply(ref, [ modpx ].concat( args ));
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
    var watchVM = store._watcherVM || store._vm;
    if (!watchVM.$s) {
      watchVM.$s = px.$root;
    }
    var addWatch = function (modpx, parent) {
      var watch =
        parent.watch || (parent._rawModule && parent._rawModule.watch) || {};
      Object.keys(watch).forEach(function (key) {
        var handler = watch[key].bind(px.$root);
        watchVM.$watch(
          (modpx.$path.replace('root', '$s') + pathSeparator + key).replace(
            /\//,
            '.'
          ),
          function (nv, ov) {
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
  var StoreProxy = function StoreProxy(path, store, proxyRoot) {
    this.$path = path;
    this.$name = this.$path.split(pathSeparator).pop();
    this.$store = store;
    this.$root = proxyRoot || this;

    this.$_module = path
      .split(pathSeparator)
      .reduce(function (mod, name) { return mod[name] || mod._children[name]; }, store._modules);

    proxyModule(this, this.$_module, store);

    // call register hook
    if (typeof this.$_module._rawModule.register === 'function') {
      this.$_module._rawModule.register.call(this);
    }
  };

  var prototypeAccessors = { $state: { configurable: true } };
  prototypeAccessors.$state.get = function () {
    return this.$path.split(pathSeparator).reduce(function (s, k) {
      if (k === 'root') {
        return s;
      } else {
        return s[k];
      }
    }, this.$store.state);
  };
  StoreProxy.prototype.registerModule = function registerModule (name, rawModule, options) {
      var this$1 = this;

    if (!Array.isArray(name)) {
      name = [name];
    }
    name.forEach(function (n) {
      if (this$1[n] instanceof StoreProxy) {
        this$1.unregisterModule(n);
      } else if (this$1[n]) {
        this$1[n] = undefined;
        delete this$1[n];
      }
    });

    this.$store.registerModule(name, rawModule, options);

    name.forEach(function (n) {
      this$1[n] = new StoreProxy(
        this$1.$path + pathSeparator + n,
        this$1.$store,
        this$1.$root
      );
    });
  };
  StoreProxy.prototype.unregisterModule = function unregisterModule (name) {
    this.$store.unregisterModule(name);
    var cache = this[name];
    delete this[name];

    // call unregister hook
    if (cache && typeof cache.$_module._rawModule.unregister === 'function') {
      cache.$_module._rawModule.unregister.call(cache);
    }
  };
  StoreProxy.prototype.replaceState = function replaceState (state) {
    return this.$store.replaceState(state);
  };
  StoreProxy.prototype.hotUpdate = function hotUpdate () {
      var ref;

      var args = [], len = arguments.length;
      while ( len-- ) args[ len ] = arguments[ len ];
    (ref = this.$store).hotUpdate.apply(ref, args);
    proxyModule(this, this.$_module, this.$store);
  };

  Object.defineProperties( StoreProxy.prototype, prototypeAccessors );

  var createRootProxy = function (vuexStore) {
    return new StoreProxy('root', vuexStore);
  };

  var createStore = function (data) {
    if ( data === void 0 ) data = {};

    if (data instanceof StoreProxy) {
      return data;
    }
    var vuexStore = data._vm && data._modules ? data : new Vuex__default['default'].Store(data);
    var store = createRootProxy(vuexStore);
    return store;
  };

  // export default StoreProxy;

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
  var get = function (obj, key, def, p) {
    if (typeof key === 'undefined') { return def; }
    p = 0;
    key = key.split ? key.split('.') : key;
    while (obj && p < key.length) { obj = obj[key[p++]]; }
    return obj === undefined || p < key.length ? def : obj;
  };

  var set = function (obj, key, val) {
    var p = key.split('.');
    if (p.length === 1) {
      return (obj[key] = val);
    }
    var end = false;
    return p.reduce(function (v, k, i) {
      if (end) {
        return val;
      }
      if (typeof v === 'object' && v) {
        if (i === p.length - 1) {
          v[k] = val;
          end = true;
          return val;
        } else {
          return v[k];
        }
      }
    }, obj);
  };

  function injectStore(vm) {
    var options = vm.$options;

    if (options.store) {
      options.store = createStore(options.store);
      vm.$s = options.store;
      vm.$store = vm.$s.$store;
    }
    if (options.parent && options.parent.$s) {
      vm.$s = options.parent.$s;
      vm.$store = vm.$s.$store;
    }
  }

  function inject$s(vm) {
    var $s = vm.$options.$s;
    if (!$s) {
      return;
    }

    var ref = create$sInject(vm, $s);
    var computed = ref.computed;
    var methods = ref.methods;
    // inject computed
    if (computed.length) {
      vm.$options.computed = computed.reduce(function (m, ref) {
        var key = ref.key;
        var get = ref.get;
        var set = ref.set;

        m[key] = set ? { get: get, set: set } : get;
        return m;
      }, vm.$options.computed || {});
    }

    // inject methods
    if (methods.length) {
      vm.$options.methods = methods.reduce(function (m, ref) {
        var key = ref.key;
        var func = ref.func;

        m[key] = func;
        return m;
      }, vm.$options.methods || {});
    }
  }

  function create$sInject(vm, $s) {
    var getKeyVals = function (s) {
      var ks = [];
      if (Array.isArray(s)) {
        s.forEach(function (v) {
          var field = { key: v, val: v };
          switch (typeof v) {
            case 'string':
              ks.push(field);
              break;
            case 'function':
              if (!v.name) {
                throw new Error('[vuexp]$s required function name');
              }
              field.key = v.name;
              ks.push(field);
              break;
            case 'array':
            case 'object':
              ks.push.apply(ks, getKeyVals(v));
              break;
            default:
              ks.push(field);
              break;
          }
        });
        return ks;
      } else if (s && typeof s === 'object') {
        // getter, setter
        if (s.get || s.set) {
          return [{ key: '', val: s }];
        }
        var loop = function () {
          var ref = list[i];
          var k = ref[0];
          var v = ref[1];

          var field = { key: k, val: v };
          switch (typeof v) {
            case 'string':
              ks.push(field);
              break;
            case 'function':
              if (!v.name) {
                throw new Error('[vuexp]$s required function name');
              }
              field.key = v.name;
              ks.push(field);
              break;
            case 'array':
            case 'object':
              ks.push.apply(
                ks, getKeyVals(v).map(function (i) {
                  if (i.key) {
                    i.parent = i.parent ? k + '.' + i.parent : k;
                  } else {
                    i.key = k;
                  }
                  return i;
                })
              );
              break;
            default:
              ks.push(field);
              break;
          }
        };

        for (var i = 0, list = Object.entries(s); i < list.length; i += 1) loop();
      } else {
        ks.push({ key: s, val: s });
      }
      return ks;
    };

    if (typeof $s === 'function') {
      $s = $s.apply(vm, [vm.$s]);
    }
    var sp = getKeyVals($s);
    // console.log(sp);

    var computed = [];
    var methods = [];

    var loop = function () {
      var ref = list[i];
      var key = ref.key;
      var val = ref.val;
      var parent = ref.parent;

      var path = parent ? parent + '.' : '';

      switch (typeof val) {
        case 'string':
          path += val;
          break;
        case 'object':
          if (typeof val.get === 'string') {
            path += val.get;
          }
      }

      path = path.replace(/\//, '.');
      var target = get(vm.$s, path);
      var isMethod = typeof target === 'function';
      var field = { key: key };
      if (isMethod) {
        switch (typeof val) {
          case 'string':
            field.func = function () {
              var args = [], len = arguments.length;
              while ( len-- ) args[ len ] = arguments[ len ];

              return get(vm.$s, path).apply(vm.$s, args);
            };
            break;
          case 'function':
            field.func = val.bind(vm);
            break;
          default:
            field.func = function () { return val; };
            break;
        }
        methods.push(field);
      } else {
        if (typeof val === 'string') {
          field.get = function () { return get(vm.$s, path); };
          field.set = function (v) { return set(vm.$s, path, v); };
        } else if (val && typeof val === 'object') {
          switch (typeof val.get) {
            case 'string':
              field.get = function () { return get(vm.$s, path); };
              break;
            case 'function':
              field.get = val.get.bind(vm);
              break;
            default:
              field.get = val.get ? function () { return val.get; } : undefined;
          }
          switch (typeof val.set) {
            case 'string':
              field.set = function (v) { return set(vm.$s, path, v); };
              break;
            case 'function':
              field.set = val.set.bind(vm);
              break;
            default:
              field.set = val.set ? function (v) { return set(vm.$s, path, v); } : undefined;
          }
        }
        if (!field.get && !field.set) {
          return;
        }
        computed.push(field);
      }
    };

    for (var i = 0, list = sp; i < list.length; i += 1) loop();

    return { computed: computed, methods: methods };
  }

  function install (Vue) {
    Vue.use(Vuex__default['default']);
    function beforeCreate() {
      injectStore(this);
      inject$s(this);
    }
    Vue.mixin({
      beforeCreate: beforeCreate,
    });
  }

  var index = {
    install: install,
    Store: createStore,
  };

  Object.defineProperty(exports, 'createNamespacedHelpers', {
    enumerable: true,
    get: function () {
      return Vuex.createNamespacedHelpers;
    }
  });
  Object.defineProperty(exports, 'mapActions', {
    enumerable: true,
    get: function () {
      return Vuex.mapActions;
    }
  });
  Object.defineProperty(exports, 'mapGetters', {
    enumerable: true,
    get: function () {
      return Vuex.mapGetters;
    }
  });
  Object.defineProperty(exports, 'mapMutations', {
    enumerable: true,
    get: function () {
      return Vuex.mapMutations;
    }
  });
  Object.defineProperty(exports, 'mapState', {
    enumerable: true,
    get: function () {
      return Vuex.mapState;
    }
  });
  exports.default = index;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
