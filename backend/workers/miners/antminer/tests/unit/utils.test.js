'use strict'

const test = require('brittle')
const { getMinerStaticIpFromThgInfo } = require('../../lib/utils/index.js')

test('getMinerStaticIpFromThgInfo builds IP from thg info', (t) => {
  const thg = {
    info: {
      container: 'container-5',
      pos: '1_2_3'
    }
  }
  const ip = getMinerStaticIpFromThgInfo(thg)
  t.is(ip, '10.5.1.23')
})

test('getMinerStaticIpFromThgInfo returns empty string for invalid IP', (t) => {
  const thg = {
    info: {
      container: 'container-999',
      pos: '999_999_99'
    }
  }
  const ip = getMinerStaticIpFromThgInfo(thg)
  t.is(ip, '')
})

test('getMinerStaticIpFromThgInfo handles single digit pos parts', (t) => {
  const thg = {
    info: {
      container: 'container-1',
      pos: '0_0_1'
    }
  }
  const ip = getMinerStaticIpFromThgInfo(thg)
  t.is(ip, '10.1.0.01')
})
