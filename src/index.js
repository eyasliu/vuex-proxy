import {
  mapState,
  mapMutations,
  mapGetters,
  mapActions,
  createNamespacedHelpers,
} from 'vuex';

export {
  mapState,
  mapMutations,
  mapGetters,
  mapActions,
  createNamespacedHelpers,
};

import install from './install';
import { createStore } from './store';

export default {
  install,
  Store: createStore,
};
