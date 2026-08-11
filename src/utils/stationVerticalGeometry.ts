export interface StationVerticalAnchors {
  groundHeight: number
  coneCenterHeight: number
  coneTopHeight: number
  labelHeight: number
  popupHeight: number
}

export interface StationVerticalGeometryOptions {
  surfaceHeight: number
  coneHeight: number
  groundClearance?: number
  labelClearance?: number
  popupClearance?: number
}

export function calculateStationVerticalAnchors(
  options: StationVerticalGeometryOptions,
): StationVerticalAnchors {
  const groundClearance = options.groundClearance ?? 1
  const labelClearance = options.labelClearance ?? 8
  const popupClearance = options.popupClearance ?? 12
  const groundHeight = options.surfaceHeight + groundClearance
  const coneTopHeight = groundHeight + options.coneHeight

  return {
    groundHeight,
    coneCenterHeight: groundHeight + options.coneHeight / 2,
    coneTopHeight,
    labelHeight: coneTopHeight + labelClearance,
    popupHeight: coneTopHeight + popupClearance,
  }
}
