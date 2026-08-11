import * as Cesium from 'cesium'

export interface CesiumPopupOptions {
  position: Cesium.Cartesian3
  className?: string
  offset?: [number, number]
  content: string | HTMLElement
}

export class CesiumPopupManager {
  private readonly viewer: Cesium.Viewer
  private readonly container: HTMLElement
  private popup: HTMLDivElement | null = null
  private position: Cesium.Cartesian3 | null = null
  private offset: [number, number] = [0, 0]
  private readonly postRenderHandler: () => void

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer
    this.container = viewer.cesiumWidget.container as HTMLElement
    this.postRenderHandler = () => this.updatePosition()
    viewer.scene.postRender.addEventListener(this.postRenderHandler)
  }

  open(options: CesiumPopupOptions) {
    this.close()
    this.position = options.position
    this.offset = options.offset ?? [0, 0]
    this.popup = document.createElement('div')
    this.popup.className = options.className ?? 'cesium-popup'
    if (typeof options.content === 'string') this.popup.innerHTML = options.content
    else this.popup.append(options.content)
    this.container.append(this.popup)
    this.updatePosition()
    return this.popup
  }

  close() {
    this.popup?.remove()
    this.popup = null
    this.position = null
  }

  destroy() {
    this.close()
    this.viewer.scene.postRender.removeEventListener(this.postRenderHandler)
  }

  private updatePosition() {
    if (!this.popup || !this.position) return
    const windowPosition = Cesium.SceneTransforms.worldToWindowCoordinates(
      this.viewer.scene,
      this.position,
    )
    if (!windowPosition) {
      this.popup.style.display = 'none'
      return
    }
    this.popup.style.display = 'block'
    this.popup.style.left = `${windowPosition.x - this.popup.offsetWidth / 2 + this.offset[0]}px`
    this.popup.style.top = `${windowPosition.y - this.popup.offsetHeight + this.offset[1]}px`
  }
}
