import Vuex from 'vuex';
import { createStore } from './store';
import { get, set } from './helper';

function injectStore(vm) {
  const options = vm.$options;

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
  const $s = vm.$options.$s;
  if (!$s) {
    return;
  }

  const { computed, methods } = create$sInject(vm, $s);
  // inject computed
  if (computed.length) {
    vm.$options.computed = computed.reduce((m, { key, get, set }) => {
      m[key] = set ? { get, set } : get;
      return m;
    }, vm.$options.computed || {});
  }

  // inject methods
  if (methods.length) {
    vm.$options.methods = methods.reduce((m, { key, func }) => {
      m[key] = func;
      return m;
    }, vm.$options.methods || {});
  }
}

function create$sInject(vm, $s) {
  const getKeyVals = (s) => {
    const ks = [];
    if (Array.isArray(s)) {
      s.forEach((v) => {
        let field = { key: v, val: v };
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
            ks.push(...getKeyVals(v));
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
      for (let [k, v] of Object.entries(s)) {
        let field = { key: k, val: v };
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
            ks.push(
              ...getKeyVals(v).map((i) => {
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
      }
    } else {
      ks.push({ key: s, val: s });
    }
    return ks;
  };

  if (typeof $s === 'function') {
    $s = $s.apply(vm, [vm.$s]);
  }
  const sp = getKeyVals($s);
  // console.log(sp);

  const computed = [];
  const methods = [];

  for (let { key, val, parent } of sp) {
    let path = parent ? parent + '.' : '';

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
    const target = get(vm.$s, path);
    const isMethod = typeof target === 'function';
    const field = { key };
    if (isMethod) {
      switch (typeof val) {
        case 'string':
          field.func = (...args) => {
            return get(vm.$s, path).apply(vm.$s, args);
          };
          break;
        case 'function':
          field.func = val.bind(vm);
          break;
        default:
          field.func = () => val;
          break;
      }
      methods.push(field);
    } else {
      if (typeof val === 'string') {
        field.get = () => get(vm.$s, path);
        field.set = (v) => set(vm.$s, path, v);
      } else if (val && typeof val === 'object') {
        switch (typeof val.get) {
          case 'string':
            field.get = () => get(vm.$s, path);
            break;
          case 'function':
            field.get = val.get.bind(vm);
            break;
          default:
            field.get = val.get ? () => val.get : undefined;
        }
        switch (typeof val.set) {
          case 'string':
            field.set = (v) => set(vm.$s, path, v);
            break;
          case 'function':
            field.set = val.set.bind(vm);
            break;
          default:
            field.set = val.set ? (v) => set(vm.$s, path, v) : undefined;
        }
      }
      if (!field.get && !field.set) {
        continue;
      }
      computed.push(field);
    }
  }

  return { computed, methods };
}

export default (Vue) => {
  Vue.use(Vuex);
  function beforeCreate() {
    injectStore(this);
    inject$s(this);
  }
  Vue.mixin({
    beforeCreate,
  });
};
