import { test } from 'node:test'
import assert from 'node:assert/strict'
import { frameLink, parseFrameNumber, shareText, storyFileName } from '../app/shared/share.ts'

test('frame link uses the frame number and respects the base path', () => {
  assert.equal(frameLink('https://ramirkolesnik.github.io', '/remember-me-web/', { id: 9, number: 42 }), 'https://ramirkolesnik.github.io/remember-me-web/f/42')
  assert.equal(frameLink('http://localhost:3000/', '/', { id: 9, number: 7 }), 'http://localhost:3000/f/7')
  assert.equal(frameLink('https://remember.me', '', { id: 9, number: 7 }), 'https://remember.me/f/7')
  assert.equal(frameLink('https://remember.me', '/', { id: 9, number: null }), 'https://remember.me/?frame=9')
})

test('frame numbers are read the way people type them', () => {
  for (const s of ['4812', '#4812', '#4,812', ' 4 812 ', '# 4812', '№4812', '4.812']) {
    assert.equal(parseFrameNumber(s), 4812, s)
  }
  for (const s of ['', '#', '0', 'abc', '48a', '-5', '12345678', '1.5.x']) {
    assert.equal(parseFrameNumber(s), null, s)
  }
})

test('share text carries the number', () => {
  assert.equal(shareText({ number: 4812, isHeart: false }), "I'm #4,812 on the wall. Forever.")
  assert.equal(shareText({ number: null, isHeart: false }), "I'm on the wall. Forever.")
  assert.equal(shareText({ number: 3, isHeart: true }), 'I own the heart of the wall. Forever.')
})

test('story file name', () => {
  assert.equal(storyFileName(12), 'remember-me-12.jpg')
})
