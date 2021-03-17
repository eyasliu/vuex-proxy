import VuexProxy from '@/index';
import Vue from 'vue';

const createStoreOptions = () => ({
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
    reset() {
      this.num = 0;
    },
    plus() {
      this.num++;
    },
    setNum(n) {
      this.num = n;
    },
  },
});

describe('Store Proxy', () => {
  it('register hooks', () => {
    const options = {
      state: {
        num: 15,
        triggerRegister: false,
        testMod: {
          triggerRegister: false,
          triggerUnregister: false,
        },
      },
      getters: {
        numPlus: (state) => state.num + 1,
      },
      register() {
        this.triggerRegister = true;
      },
    };
    const store = new VuexProxy.Store(options);

    expect(store.num).toBe(15);
    expect(store.numPlus).toBe(16);
    expect(store.triggerRegister).toBe(true);

    store.registerModule('testreg', {
      namespaced: true,
      state: {
        name: 'eyas',
      },
      register() {
        this.$root.testMod.triggerRegister = true;
      },
      unregister() {
        this.$root.testMod.triggerUnregister = true;
      },
      actions: {
        setName(name) {
          this.name = name;
        },
      },
    });
    expect(store.testreg.name).toBe('eyas');
    expect(store.testMod.triggerRegister).toBe(true);
    expect(store.testMod.triggerUnregister).toBe(false);

    store.testreg.setName('yuesong');
    expect(store.testreg.name).toBe('yuesong');

    store.unregisterModule('testreg');
    expect(store.testreg).toBe(undefined);
    expect(store.testMod.triggerUnregister).toBe(true);
  });

  it('actions', () => {
    const store = new VuexProxy.Store(createStoreOptions());
    store.plus();

    expect(store.num).toBe(16);
    expect(store.numPlus).toBe(17);

    store.setNum(20);
    expect(store.num).toBe(20);
    expect(store.numPlus).toBe(21);
  });

  it('mutations', () => {
    const options = createStoreOptions();
    options.mutations = options.actions;
    delete options.actions;
    const store = new VuexProxy.Store(options);
    store.plus();

    expect(store.num).toBe(16);
    expect(store.numPlus).toBe(17);

    store.setNum(20);
    expect(store.num).toBe(20);
    expect(store.numPlus).toBe(21);
  });

  it('watch', async () => {
    const store = new VuexProxy.Store(createStoreOptions());

    store.setNum(70);
    await new Promise((r) => Vue.nextTick(r));
    store.setNum(75);
    await new Promise((r) => Vue.nextTick(r));

    expect(store.num).toBe(75);
    expect(store.numPlus).toBe(76);
    expect(store.wnum).toStrictEqual([75, 70]);
    expect(store.wpnum).toStrictEqual([76, 71]);
  });
});
