export default (Vue, store) => {
  let store = store || null
  function beforeCreate() {
    const vm = this

    // inject $store
    const options = vm.$options
    if (options.store) {
      vm.$store = (typeof options.store === 'function'
        ? options.store()
        : options.store
      ) || store
    } else if (options.parent && options.parent.$store) {
      vm.$store = options.parent.$store
    } else if (store) {
      vm.$store = store
    }
  }

  function created() {
    const vm = this
  }

  function beforeDestroy() {
    const vm = this
  }

  Vue.mixin({
    beforeCreate,
    created,
    beforeDestroy
  })
}

function 