# Vuex Proxy

Vuex 增强版，简化 vuex，让 vuex 更简单

## 使用方法

1. 安装

```sh
yarn add vuex-proxy
```

2. 如果针对已存在的项目，则按照如下改动

```diff
- import ... from 'vuex'
+ import ... from 'vuex-proxy'
```

完成。当然了，有一些 Break Change，因为设计原因，有一些和 vuex 不一样的地方，如果你没有涉及到以下几点，则无缝迁移

1.  state, getters, actions, mutations 的字段名不能重复
2.  没有 2

## API

首先， vuex 那套可以继续用，工具函数和各种操作都兼容，说明一下和 vuex 不一样的地方

#### store

```js
import Vue from 'vue'
import VuexProxy from 'vuex-proxy'
Vue.use(VuexProxuy)

const store = new VuexProxy.Store{
  // 和 vuex 一样
  state: {
    num: 15,
    wnum: [0, 0],
    wpnum: [0, 0],
  },
  // 和 vuex 一样
  getters: {
    numPlus: (state) => state.num + 1,
  },

  // 新增 watch，在 state, getters 发生变化时，触发函数，使用方法和 vue 组件的 watch 一样
  watch: {
    num(newV, oldV) {
      this.wnum = [newV, oldV];
    },
    numPlus(newV, oldV) {
      this.wpnum = [newV, oldV];
    },
  },
  // 和 vuex 有区别
  actions: {
    // 参数随便，this 指向了当前模块 VuexProxy 实例，actions的调用也不一样，后面涉及
    reset() {
      // 在 actions 中修改状态，放心，大胆的改吧
      this.num = 0;
    },
    plus() {
      this.num++;
    },
    setNum(n) {
      this.num = n;
    },
  },
  // 当模块初始化完成后触发
  register() {
    this.$root.testMod.triggerRegister = true;
  },
  // 当模块动态卸载是触发
  unregister() {
    this.$root.testMod.triggerUnregister = true;
  },

  // 可以看到，没有 mutations 了
}

store.num // 5
store.numPlus // 6
store.reset() // 直接调用
store.setNum(10) // 直接传参，参数个数无限制
store.$store // 原始的 vuex Store，没有任何入侵
store.$store.dispatch('plus') // 当然，如果你喜欢用dispatch 和 commit，也一样兼容，在 store 定义的时候参数记得和 vuex store 一样

```

store 的定义有些区别

1.  actions 和 mutations 没有区别了
2.  actions 和 mutations 的触发直接调用，没有 dispatch，没有 commit，如果非要用 dispatch 和 commit，使用 store.$store

#### Vue Component

在 Vue 组件中使用时

```js
// 实例化Vue应用

const app = new Vue({ store });

const component = Vue.extend({
  // 注意这个 $s，为注入组件标识
  // 支持数组，对象，数组嵌入对象，对象嵌入数组
  // 注入的时候，内部知道哪些该注入到 computed，哪些该注入到 methods，不需要你关心
  $s: [
    {
      // num 是 state，所以最终会被注入到 computed，可以定义 get 和 set
      num: {
        get: 'num',
        set: 'num',
      },
      num2: {
        get() {
          return this.$s.num;
        },
        set(v) {
          this.$s.num = v;
        },
      },
      // numPlus 是 getters，所以最终会被注入到 computed，可以定义 get 和 set
      numPlus: {
        get() {
          return this.$s.numPlus;
        },
      },
      numPlus2: {
        get: 'numPlus', // 如果是 字符串，则规则和 vuex 的 mapState, mapAction, mapMutation 等等那种工具函数差不多
        set(v) {
          this.$s.num = v - 1;
        },
      },
    },
    'reset', //
    'plus',
    {
      plus2: 'plus', // 别名，把 store.plus 绑定到 组件的 this.plus2() 中
      reset2: 'reset',
    },
    { z: 'testmod.z' }, // 字符串使用 . 或者 / 表示路径
    { testmod: ['x', { y: 'y', z: { a: { b: 'b' } } }] },
    { n: 'testmod.y/z/a.b' }, // 你也可以 . 和 / 混用，效果没有区别
  ],
  mounted() {
    this.num; // 5
    this.num = 14;
    this.numPlus; // 15
    this.numPlus = 20;
    this.reset();
    this.setNum(30);
    this.z; // { a: { b: 'b' } }
    this.n; // b

    this.$s.num; // this.$s 就是 store 实例
    this.$store; // 原始 vuex Store 实例
    this.$s.$store; // 等价与 this.$store
  },
});
```

## Vuex Proxy 对于 Vuex

1.  兼容 Vuex，Vuex Proxy 通过了 Vuex 的大部分单元测试，但是因为 Vuex Proxy 的 state, getters, actions, mutations 的字段名不能重复，所以有些测试用例是无法通过的。所以 Vuex Proxy 基本兼容 vuex 的大部分操作
2.  增加了 register, unregister 初始化与卸载的钩子
3.  增加了 watch ，使用方法和 vue 组件的 watch 一致
4.  actions 的定义和调用优化，但是兼容 vuex
5.  actions 中直接修改状态，并且是响应式的，包括 组件的 watch，render，和 store 的 watch 都会响应
6.  vue 组件新增 $s, 用于直接访问和操作 Vuex Proxy Store

#### 为什么要这样做

1.  我觉得 mutations 是多余的
2.  vuex 可以变得更简单
3.  vuex 可以变得更强大
4.  dispatch 和 commit 不好用
5.  开发效率更高了

#### 使用它有什么代价

1.  中大型的代码维护会变得很糟糕，没错，中大型项目建议不要用
2.  性能没有 vuex 好，这是可预见的，vuex Proxy 底层都是调用的 vuex 的 api
