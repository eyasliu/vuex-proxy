import Vue from 'vue';
import VuexProxy from '@/index';

function expectAction(vm) {
  expect(vm.num).toBe(15);
  expect(vm.num2).toBe(15);
  expect(vm.numPlus).toBe(16);
  expect(vm.numPlus2).toBe(16);
  vm.reset();
  expect(vm.num).toBe(0);
  expect(vm.num2).toBe(0);
  expect(vm.numPlus).toBe(1);
  expect(vm.numPlus2).toBe(1);
  vm.plus();
  expect(vm.num).toBe(1);
  expect(vm.num2).toBe(1);
  expect(vm.numPlus).toBe(2);
  expect(vm.numPlus2).toBe(2);

  vm.reset2();
  expect(vm.num).toBe(0);
  expect(vm.num2).toBe(0);
  expect(vm.numPlus).toBe(1);
  expect(vm.numPlus2).toBe(1);
  vm.plus2();
  expect(vm.num).toBe(1);
  expect(vm.num2).toBe(1);
  expect(vm.numPlus).toBe(2);
  expect(vm.numPlus2).toBe(2);
}

describe('VM Binding', () => {
  let store = null;
  beforeEach(() => {
    store = new VuexProxy.Store({
      state: {
        num: 15,
        wnum: [0, 0],
        wpnum: [0, 0],
      },
      getters: {
        numPlus: (state) => state.num + 1,
      },

      watch: {
        num(newV, oldV) {
          this.wnum = [newV, oldV];
        },
        numPlus(newV, oldV) {
          this.wpnum = [newV, oldV];
        },
      },
      actions: {
        plus() {
          this.num++;
        },
        setNum(n) {
          this.num = n;
        },
      },
      mutations: {
        reset() {
          this.num = 0;
        },
      },
    });
  });
  it('initialize', () => {
    const vm = new Vue({
      store,
    });
    expect(vm.$s != undefined).toBe(true);
  });

  it('$s binding string', () => {
    let vm;
    vm = new Vue({
      store,
      $s: {
        num: 'num',
        num2: 'num',
        numPlus: 'numPlus',
        numPlus2: 'numPlus',
        plus: 'plus',
        plus2: 'plus',
        reset: 'reset',
        reset2: 'reset',
      },
    });
    expectAction(vm);
  });
  it('$s binding array + object', () => {
    const vm = new Vue({
      store,
      $s: [
        'num',
        'numPlus',
        'reset',
        'plus',
        {
          num2: 'num',
          numPlus2: 'numPlus',
          plus2: 'plus',
          reset2: 'reset',
        },
      ],
    });

    expectAction(vm);
  });
  it('$s binding array + object + submodule', () => {
    store.registerModule('testmod', {
      state: {
        x: 1,
        y: 2,
        z: {
          a: {
            b: 'b',
          },
        },
      },
    });
    const vm = new Vue({
      store,
      $s: [
        {
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
          numPlus: {
            get() {
              return this.$s.numPlus;
            },
          },
          numPlus2: {
            get: 'numPlus',
            set(v) {
              this.$s.num = v - 1;
            },
          },
        },
        'reset',
        'plus',
        {
          plus2: 'plus',
          reset2: 'reset',
        },
        { z: 'testmod.z' },
        { testmod: ['x', { y: 'y', z: { a: { b: 'b' } } }] },
      ],
    });
    expectAction(vm);
  });
});
