import vuex from 'vuex'
import { injectStore } from './store'
import { injectComputed } from './computed'
import { injectMethods } from './methods'

export default (Vue) => {
  Vue.use(vuex)
  function beforeCreate() {
    const vm = this

    injectStore(vm)

    injectComputed(vm)

    injectMethods(vm)
    
  }
  Vue.mixin({
    beforeCreate
  })
}
