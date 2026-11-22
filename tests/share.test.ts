import { test } from 'node:test'
import assert from 'node:assert/strict'
import { frameLink, shareText, storyFileName } from '../app/shared/share.ts'

test('frame link respects the base path', () => {
  assert.equal(frameLink('https://ramirkolesnik.github.io', '/remember-me-web/', 42), 'https://ramirkolesnik.github.io/remember-me-web/f/42')
  assert.equal(frameLink('http://localhost:3000/', '/', 7), 'http://localhost:3000/f/7')
  assert.equal(frameLink('https://remember.me', '', 7), 'https://remember.me/f/7')
})

test('share text carries the number', () => {
  assert.equal(shareText({ number: 4812, isHeart: false }), "I'm #4,812 on the wall. Forever.")
  assert.equal(shareText({ number: null, isHeart: false }), "I'm on the wall. Forever.")
  assert.equal(shareText({ number: 3, isHeart: true }), 'I own the heart of the wall. Forever.')
})

test('story file name', () => {
  assert.equal(storyFileName(12), 'remember-me-12.jpg')
})
