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
export const get = (obj, key, def, p) => {
  if (typeof key === 'undefined') return def;
  p = 0;
  key = key.split ? key.split('.') : key;
  while (obj && p < key.length) obj = obj[key[p++]];
  return obj === undefined || p < key.length ? def : obj;
};

export const set = (obj, key, val) => {
  let p = key.split('.');
  if (p.length === 1) {
    return (obj[key] = val);
  }
  let end = false;
  return p.reduce((v, k, i) => {
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
