import * as Cesium from 'cesium'
import waterGeoJsonUrl from '@/assets/water.json?url'
import waterNormalsUrl from '@/assets/waterNormals.jpg'
import { createBuildingEffectShader } from '@/cesiumTools/buildingEffect'

type DayNightMode = 'day' | 'night'

const DAY_WATER_COLOR = new Cesium.Color(0.02, 0.28, 0.5, 0.75)
const NIGHT_WATER_COLOR = new Cesium.Color(0.005, 0.03, 0.08, 0.9)

function getWaterPositions(
  data: unknown,
  baseProjection: Cesium.MapProjection,
): number[] | undefined {
  if (!data || typeof data !== 'object') return undefined

  const features = (data as { features?: unknown }).features
  const feature = Array.isArray(features) ? features[0] : undefined
  const geometry =
    feature && typeof feature === 'object'
      ? (feature as { geometry?: unknown }).geometry
      : undefined
  const coordinates =
    geometry && typeof geometry === 'object'
      ? (geometry as { coordinates?: unknown }).coordinates
      : undefined
  // ponytail: this asset is one Polygon; add MultiPolygon support only when the data requires it.
  const ring = Array.isArray(coordinates) ? coordinates[0] : undefined
  if (!Array.isArray(ring)) return undefined

  const positions: number[] = []
  const webMercator = new Cesium.WebMercatorProjection()
  for (const point of ring) {
    if (!Array.isArray(point) || typeof point[0] !== 'number' || typeof point[1] !== 'number') {
      return undefined
    }
    // ponytail: water.json is GCJ-02; reuse the active AMap projection for GCJ-02 -> WGS84.
    const cartographic = baseProjection.unproject(
      webMercator.project(Cesium.Cartographic.fromDegrees(point[0], point[1])),
    )
    positions.push(
      Cesium.Math.toDegrees(cartographic.longitude),
      Cesium.Math.toDegrees(cartographic.latitude),
    )
  }
  return positions.length >= 6 ? positions : undefined
}

export async function createWaterPrimitive(viewer: Cesium.Viewer) {
  try {
    const response = await fetch(waterGeoJsonUrl)
    if (!response.ok) throw new Error(`water GeoJSON request failed: ${response.status}`)

    const projection = viewer.imageryLayers.get(0).imageryProvider.tilingScheme.projection
    const positions = getWaterPositions((await response.json()) as unknown, projection)
    if (!positions || viewer.isDestroyed()) return undefined

    const material = Cesium.Material.fromType('Water', {
      baseWaterColor: DAY_WATER_COLOR,
      normalMap: waterNormalsUrl,
      frequency: 1000,
      animationSpeed: 0.02,
      amplitude: 1,
    })
    const primitive = viewer.scene.primitives.add(
      new Cesium.Primitive({
        geometryInstances: new Cesium.GeometryInstance({
          geometry: new Cesium.PolygonGeometry({
            polygonHierarchy: new Cesium.PolygonHierarchy(
              Cesium.Cartesian3.fromDegreesArray(positions),
            ),
            vertexFormat: Cesium.EllipsoidSurfaceAppearance.VERTEX_FORMAT,
          }),
        }),
        appearance: new Cesium.EllipsoidSurfaceAppearance({ material }),
      }),
    )

    return { primitive, material }
  } catch (error) {
    console.warn('Water primitive creation skipped.', error)
    return undefined
  }
}

export function setupDayNight(
  viewer: Cesium.Viewer,
  tileset?: Cesium.Cesium3DTileset,
  waterMaterial?: Cesium.Material,
) {
  const bloom = viewer.scene.postProcessStages.bloom
  const originalBloom = {
    enabled: bloom.enabled,
    contrast: bloom.uniforms.contrast,
    brightness: bloom.uniforms.brightness,
  }
  const originalShader = tileset?.customShader
  const originalWaterColor = waterMaterial?.uniforms.baseWaterColor
  const buildingShader = tileset ? createBuildingEffectShader() : undefined
  if (tileset && buildingShader) tileset.customShader = buildingShader

  const sunPosition = new Cesium.Cartesian3()
  const sunDirection = new Cesium.Cartesian3()
  const cameraNormal = new Cesium.Cartesian3()
  const icrfToFixed = new Cesium.Matrix3()
  const animationStart = Cesium.JulianDate.clone(viewer.clock.currentTime)
  let mode: DayNightMode | undefined

  function apply(nextMode: DayNightMode) {
    if (mode === nextMode) return
    mode = nextMode

    buildingShader?.setUniform('u_isDark', nextMode === 'night')

    if (nextMode === 'night') {
      bloom.enabled = true
      bloom.uniforms.contrast = 128
      bloom.uniforms.brightness = -0.3
      if (waterMaterial) waterMaterial.uniforms.baseWaterColor = NIGHT_WATER_COLOR
      return
    }

    bloom.enabled = originalBloom.enabled
    bloom.uniforms.contrast = originalBloom.contrast
    bloom.uniforms.brightness = originalBloom.brightness
    if (waterMaterial) waterMaterial.uniforms.baseWaterColor = DAY_WATER_COLOR
  }

  function update() {
    if (viewer.isDestroyed()) return

    const time = viewer.clock.currentTime
    buildingShader?.setUniform('u_time', Cesium.JulianDate.secondsDifference(time, animationStart))
    const transform =
      Cesium.Transforms.computeIcrfToFixedMatrix(time, icrfToFixed) ??
      Cesium.Transforms.computeTemeToPseudoFixedMatrix(time, icrfToFixed)
    const cameraPosition = viewer.camera.positionWC
    if (!transform || Cesium.Cartesian3.magnitudeSquared(cameraPosition) === 0) return

    Cesium.Simon1994PlanetaryPositions.computeSunPositionInEarthInertialFrame(time, sunPosition)
    Cesium.Matrix3.multiplyByVector(transform, sunPosition, sunPosition)
    Cesium.Cartesian3.normalize(sunPosition, sunDirection)
    Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(cameraPosition, cameraNormal)

    const dot = Cesium.Cartesian3.dot(cameraNormal, sunDirection)
    if (dot > 0.02) apply('day')
    if (dot < -0.02) apply('night')
  }

  const removePostRender = viewer.scene.postRender.addEventListener(update)
  update()

  return () => {
    removePostRender()
    bloom.enabled = originalBloom.enabled
    bloom.uniforms.contrast = originalBloom.contrast
    bloom.uniforms.brightness = originalBloom.brightness
    if (tileset) tileset.customShader = originalShader
    if (waterMaterial) waterMaterial.uniforms.baseWaterColor = originalWaterColor
    buildingShader?.destroy()
  }
}
