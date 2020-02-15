# Vuex Proxy

that mean Vuex Proxy

vue 的增强组件，基于 vuex，让 vuex 更简单

# 使用方法

首先，vuex 那整套完全兼容，所以可以从 vuex 无缝迁移到 vuex-p，但是反之不行，因为 vuex-proxy 在 vuex 的api上有扩展

### API

在 vue 组件实例中，增加了一个 `$s` 属性，这是 `vuex-proxy store`，事实上这是一个 `vuex store` 的代理，目的就是为了简化 `vuex` 使用，当然，原本 vuex 注入的 `$store` 依然有效

> 注意在定义 store 的 state，actions，getters，mutation 时，不要和这些 api 名字重复了

**vuex-proxy store** 格式

在组件内使用 `this.$s` 访问

#### `this.$s.$store`

原始的 vuex store，没有任何侵入和 hack

#### `this.$s.$root`

最顶层 vuex-proxy store 对象

#### `this.$s.$registerModule`

动态注册新模块，参数和功能与 vuex 的 registerModule 基本一致

#### `this.$s.$unregisterModule`

动态删除模块，参数和功能与 vuex 的 unregisterModule 基本一致

#### `this.$s.$state`

该模块级别的 vuex store 状态数据

#### `this.$s[moduleName]`

模块级别的 vuex-proxy store，api 和根 vuex-proxy store 无区别，只是状态数据不一样

#### `this.$s[fieldName]`

fieldName 是指 state，getters，actions，mutation 里面的所有字段名，vuex-p 把所有的状态、计算属性、方法都放到了同一层级里面，当你访问 vuex-proxy 的数据时，内部是知道你访问的是 state，还是getters，，还是 actions ，是一个 module，所以这也要求 state，getters，actions，mutation 里面的字段不能有重复，如果有重复则在初始化的时候会报错误


### 示例

```js
import Vue from 'vue'
import vuex-proxy from 'vuex-proxy'

// 使用插件
Vue.use(vuex-proxy)

new Vue({
  // 在根组件使用 store 属性定义 vuex-proxy store，vuexp store 的 api 和 vuex store 完全兼容，说明请看下文
  store: {
    // store state 状态数据，和 vuex state 完全一致，无任何变化
    state: {
      num: 0,
    },
    // store getters 计算属性，和 vuex state 完全一致，无任何变化
    getters: {
      numPlus: state => state + 1
    },
    actions: {
      // 第一种 action 写法，和 vuex state 完全一致，无任何变化，在组件调用的时候，也没有区别，使用 this.$store.dispatch('reset')
      // 注意：该写法
      // this 指向 vuex store
      // 第一个参数是 vuex 的固定格式 { dispatch, commit, getters, state, rootGetters, rootState }
      // 第二个参数是 action 参数
      // 只有两个参数，不支持更多参数
      reset({commit}) {
        commit('RESET_NUM')
      }，
      // 第二种 action 写法，增强版本，在组件调用的时候，使用 this.$s.plus()
      // this 指向 vuex-proxy store
      // 参数无限个数，可在里面直接更改 state，把它当做 vuex mutation 来用，支持异步，注意异步函数里的 this 是指向的 vuex-proxy store就没问题了
      plus() {
        return ++this.num
      },
      setNum(n) {
        // 在action 函数内部，可以访问 state
        console.log(this.num)
        // 也可以访问 getters 计算属性
        console.log(this.numPlus)
        // 也可以调用其他 action 和 mutation
        this.plus()
        // 也可以修改 state
        this.num = n
      }
    },
    mutations: {
      // 第一种 mutations 写法，和 vuex state 完全一致
      RESET_NUM(state) {
        state.num = 0
      }
      // 第二种 mutations 写法，和第二种 action 写法没有区别，用法也没有区别
      resetNum() {
        this.num = 0
      }
    },
    // 嵌套模块，支持无限嵌套
    modules: {
      testMod: {
        state: {
          test: 100
        },
        getters: {},
        actions: {},
      }
    }
  },
  data() { return { name: 'my name is vue plus' } }

  // 映射到计算属性中，用 $computed，完全兼容原本 vue 组件的 computed 功能
  // 使用字符串数组形式，直接写key，多层级直接使用 . 或者 / 分隔，最终映射的key名字是最后一层的key，并且自动绑定了 get 和 set，也就是可以直接给绑定的对象赋值
  $computed: ['num', 'numPlus', 'testMod.test'],
  mounted() {
    this.num = 2 // 相当于 this.$s.num = 2
    this.test = 20 // 相当于 this.$s.testMod.test = 20
  },

  // 使用对象形式
  // this 指向组件实例
  $computed: {
    num: 'num', // 会自动绑定 get 和 set
    xnum: {
      get($s) { return $s.num } // get 函数只有一个参数，该参数为 vuex-proxy store 实例，也就是 this.$s
      set(n, $s) { return $s.num = n } // set 函数有两个参数，第一个是修改后的值，第二个是 this.$s
    },
    numPlus() { // 这算是 get 函数
      return this.$s.num
    },
    myname() {
      // 还可以访问组件内部 data
      return this.name
    },
  },

  // 绑定 actions 和 mutations 到组件实例中
  // 字符串数组形式，根据key名字自动映射，映射后函数的this指向为函数所在的层级的 vuex-proxy store 实例
  $methods: ['plus', 'setNum'],
  $methods: {
    plus: 'plus',
    setNum(n) {
      return this.$s.setNum(n)
    },
    sayMyName() {
      console.log(this.myname)
    }
  },
  watch: {
    // 这样监听值改变，api 无变化
    '$s.num': function(oldv, newv) {
      console.log(this.newv)
    }
  }
})

```

## 对比

### 与 Vuex 对比，api 变化

#### 兼容性

Vuex 的原有功能一切正常，可以无缝的将 vuex 迁移到 vuex-proxy

#### 为什么要改变 vuex

vuex 是 vue 官方指定并维护的状态管理插件，和 vue 的结合无疑非常好的，但是在我看来在使用vuex的时候，有一些让我不舒服的地方

 1. actions 和 mutations 的参数，只能有一个，我理解初衷其实是为了只有一个 payload，更好记录，调试，跟踪变更等等，但是却不好用
 2. mutations 的存在，我觉得就是多余的，明明可以直接改状态，为什么还要多包装一层呢。我觉得有几个原因：
  2.1 方便调试工具的 Time Revel，redo，undo，变化跟踪等等。但是相信我，这些功能你基本不会用得上的，调试工具最大的作用就是用来看当前状态数据。
  2.2 隔离 actions 的副作用，让状态变更更好跟踪和调试。但是实际上用的时候，我基本上不会去调试 mutation 函数
3. 在组件调用的时候，必须要用 dispatch 或 commit 去调用，为什么呢，直接调用不是更好吗

#### 变化点

 1. 初始化时，new vues.Store 是可选的，可以 new vuex.Store 再传入，也可以直接传入，内部自动识别
 2. actions 和 mutations 兼容原有的，并且支持不同写法
 3. state，getters，modules 没有变更
 4. vue开发工具依然可用，不过每次更改状态都会有一个名为 `VUEXP_CHANGE_STATE` 的 type
 5. vuex 生态的插件都可以继续使用

简单地说，就是原有的 vuex 的功能都没有阉割，没有改变，只是增加了其他用法，使其变得使用更简单

### 与 Mobx 对比

其实一开始这个想法是从 mobx 中启发的，mobx store在定义的时候非常方便，但是和 vue 结合得非常难看，把 vue api 变成了 React 的形式，自认为那会让组件变得更复杂。

原本尝试把 mobx store 通过简单的方式绑定到组件，但是最后遇到一些我无法解决的困难，后面改成复用 vuex store，然后顺利完成了。

## 已知bug

 1. 在修改数组和对象的状态的时候，如果不是返回一个全新的对象，而是修改原对象（如数组的push，pop等），会导致在开发工具内记录数据会有差别，这也只是开发工具看到的数据不对而已，实际上在应用内部的数据才是对的。事实上如果在原生的 mutation 里面也是直接修改原对象，而不返回一个新对象，开发工具一样可能显示错误数据。解决方法当然是在修改数组或对象的时候，赋值一个新的值。