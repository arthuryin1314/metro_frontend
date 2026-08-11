import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateStationVerticalAnchors } from '../stationVerticalGeometry.ts'

test('站点垂直锚点从地表向上依次排列', () => {
  const anchors = calculateStationVerticalAnchors({
    surfaceHeight: 32,
    coneHeight: 200,
  })

  assert.equal(anchors.groundHeight, 33)
  assert.equal(anchors.coneCenterHeight, 133)
  assert.equal(anchors.coneTopHeight, 233)
  assert.equal(anchors.labelHeight, 241)
  assert.equal(anchors.popupHeight, 245)
})

test('自定义间距只影响对应锚点', () => {
  const anchors = calculateStationVerticalAnchors({
    surfaceHeight: -10,
    coneHeight: 80,
    groundClearance: 2,
    labelClearance: 4,
    popupClearance: 16,
  })

  assert.deepEqual(anchors, {
    groundHeight: -8,
    coneCenterHeight: 32,
    coneTopHeight: 72,
    labelHeight: 76,
    popupHeight: 88,
  })
})
