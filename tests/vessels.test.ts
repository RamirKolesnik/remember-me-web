import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeVessels } from '../app/shared/vessels.ts'
import { HEART, WALL_SIZE } from '../app/shared/wall.ts'

const vessels = makeVessels()

test('every visitor gets the same vessels', () => {
  assert.deepEqual(makeVessels(), vessels)
})

test('fourteen main vessels leave the heart, with branches', () => {
  const main = vessels.filter((v) => v.width === 1)
  assert.equal(main.length, 14)
  assert.ok(vessels.length > main.length)
  for (const v of main) {
    const [x, y] = v.points
    const onBorder = (x === HEART.x || x === HEART.x + HEART.size || y === HEART.y || y === HEART.y + HEART.size)
    assert.ok(onBorder, `starts on the heart border: ${x},${y}`)
  }
})

test('vessels run along the seams and stay on the wall', () => {
  for (const v of vessels) {
    assert.equal(v.points.length % 2, 0)
    for (let i = 0; i < v.points.length; i += 2) {
      const x = v.points[i]!, y = v.points[i + 1]!
      assert.ok(Number.isInteger(x) && Number.isInteger(y))
      assert.ok(x >= 0 && x <= WALL_SIZE && y >= 0 && y <= WALL_SIZE)
      if (i >= 2) {
        const sameRow = y === v.points[i - 1], sameCol = x === v.points[i - 2]
        assert.ok(sameRow || sameCol, 'segments are horizontal or vertical')
      }
    }
  }
})

test('vessels never cut through the heart', () => {
  const inside = (x: number, y: number) => x > HEART.x && x < HEART.x + HEART.size && y > HEART.y && y < HEART.y + HEART.size
  for (const v of vessels) {
    for (let i = 0; i < v.points.length; i += 2) assert.ok(!inside(v.points[i]!, v.points[i + 1]!))
  }
})

test('main vessels reach far out', () => {
  const far = vessels.filter((v) => v.width === 1).filter((v) => {
    const n = v.points.length
    const x = v.points[n - 2]!, y = v.points[n - 1]!
    return Math.max(Math.abs(x - 500), Math.abs(y - 500)) > 300
  })
  assert.ok(far.length >= 10)
})
