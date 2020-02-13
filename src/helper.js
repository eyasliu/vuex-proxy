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
  if (typeof key === 'undefined') return def
  p = 0;
  key = key.split ? key.split('.') : key;
  while (obj && p < key.length) obj = obj[key[p++]];
  return (obj === undefined || p < key.length) ? def : obj;
}

export const set = (obj, key, val) => {
  if (typeof key === 'undefined') throw new Error('required set key')
  let p = 0;
  key = key.split ? key.split('.') : key;
  const endKey = key.pop()
  while (obj && p < key.length) obj = obj[key[p++]];
  if (obj !== undefined && p >= key.length && obj[endKey]) {
    return obj[endKey] = val
  }
}