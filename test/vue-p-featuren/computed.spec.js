import Vue from 'vue'
import {computed} from '../../src'

const store = {
  state: {
    num: 0,
  },
  computed: {
    numPlus: state => state.num + 1,
    numx: {
      get: state => state.num,
      set: (n, state) => state.setNum(n)
    },
    numy() {
      return this.num
    },
    numz: {
      get(){
        return this.num
      },
      set(n) {
        return this.setNum(n)
      }
    }
  },

  setNum(n) {
    this.num = n
  },

  plus() {
    this.num++
  },

  reset() {
    this.num = 0
  }

}

test("computed string array", () => {
  const vm = new Vue({
    store,
    computed: ['num', 'numx', 'numy', 'numz', 'numPlus']
  })
})

test("computed function", () => {
  const vm = new Vue({
    store,
    computed: store => ({
      num: store.num,
      numx: store.numx,
    })
  })
})

test("computed function namespace", () => {
  const vm = new Vue({
    store: {
      a: {
        b: {
          c: store
        }
      }
    },
    computed: computed('a.b.c', store => ({
      num: store.num,
      numx: store.numx,
    }))
  })
})