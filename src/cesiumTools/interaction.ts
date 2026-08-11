import * as Cesium from 'cesium'
import { CesiumPopupManager } from './popup/popupManager.ts'

export interface StationPopupData {
  name: string
  lineIds: number[]
  position: Cesium.Cartesian3
}

function getEntityStationData(entity: Cesium.Entity, time: Cesium.JulianDate): StationPopupData | null {
  const properties = entity.properties
  const position = entity.position?.getValue(time)
  if (!properties || !position) return null

  const name = properties.stationName?.getValue(time)
  const lineIds = properties.lineIds?.getValue(time)
  if (typeof name !== 'string' || !Array.isArray(lineIds)) return null

  const popupPosition = properties.popupPosition?.getValue(time)
  const anchor = popupPosition instanceof Cesium.Cartesian3 ? popupPosition : position
  return { name, lineIds, position: anchor }
}

function createStationPopupContent(data: StationPopupData) {
  const root = document.createElement('div')
  root.className = 'cesium-station-popup'

  const title = document.createElement('div')
  title.className = 'cesium-station-popup__title'
  title.textContent = data.name
  root.append(title)

  const line = document.createElement('div')
  line.className = 'cesium-station-popup__line'
  line.textContent = `线路: ${data.lineIds.join(', ')}`
  root.append(line)

  return root
}

export function installStationPopupInteraction(
  viewer: Cesium.Viewer,
  popupManager: CesiumPopupManager,
) {
  if (!viewer.scene?.canvas) return () => popupManager.close()

  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
  handler.setInputAction((movement: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
    const picked = viewer.scene.pick(movement.position)
    const entity = picked?.id
    if (!(entity instanceof Cesium.Entity)) {
      popupManager.close()
      return
    }

    const data = getEntityStationData(entity, viewer.clock.currentTime)
    if (!data) {
      popupManager.close()
      return
    }

    popupManager.open({
      position: data.position,
      offset: [0, -12],
      content: createStationPopupContent(data),
    })
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

  return () => {
    handler.destroy()
    popupManager.close()
  }
}
