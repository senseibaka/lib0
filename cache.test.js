
import * as t from './testing.js'
import * as cache from './cache.js'
import * as promise from './promise.js'

/**
 * @param {t.TestCase} tc
 */
export const testCache = async tc => {
  /**
   * @type {cache.Cache<string, string>}
   */
  const c = cache.create(50)
  cache.set(c, 'a', '1')
  t.assert(cache.get(c, 'a') === '1')
  t.assert(await cache.getAsync(c, 'a') === '1')
  const p = cache.setIfUndefined(c, 'b', () => promise.resolveWith('2'))
  const q = cache.setIfUndefined(c, 'b', () => promise.resolveWith('3'))
  t.assert(p === q)
  t.assert(cache.get(c, 'b') == null)
  t.assert(cache.getAsync(c, 'b') === p)
  t.assert(await p === '2')
  t.assert(cache.get(c, 'b') === '2')
  t.assert(cache.getAsync(c, 'b') === '2')

  await promise.wait(5) // keys shouldn't be timed out yet
  t.assert(cache.get(c, 'a') === '1')
  t.assert(cache.get(c, 'b') === '2')

  /**
   * @type {any}
   */
  const m = c._map
  const aTimestamp1 = m.get('a').created
  const bTimestamp1 = m.get('b').created

  // write new values and check later if the creation-timestamp was updated
  cache.set(c, 'a', '11')
  await cache.setIfUndefined(c, 'b', () => promise.resolveWith('22')) // this shouldn't override, but update the timestamp

  await promise.wait(5) // keys should be updated and not timed out. Hence the creation time should be updated
  t.assert(cache.get(c, 'a') === '11')
  t.assert(cache.get(c, 'b') === '2')
  // timestamps should be updated
  t.assert(aTimestamp1 !== m.get('a').created)
  t.assert(bTimestamp1 !== m.get('b').created)

  await promise.wait(60) // now the keys should be timed-out

  t.assert(cache.get(c, 'a') == null)
  t.assert(cache.getAsync(c, 'b') == null)

  t.assert(c._map.size === 0)
  t.assert(c._q.start === null && c._q.end === null)

  // test edge case of setIfUndefined
  const xp = cache.setIfUndefined(c, 'a', () => promise.resolve('x'))
  cache.set(c, 'a', 'y')
  await xp
  // we override the Entry.val property in cache when p resolves. However, we must prevent that when the value is overriden before p is resolved.
  t.assert(cache.get(c, 'a') === 'y')
}