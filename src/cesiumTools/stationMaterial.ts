import * as Cesium from 'cesium'

const MATERIAL_TYPE = 'MetroStationGlow'
const MATERIAL_SOURCE = `
  czm_material czm_getMaterial(czm_materialInput materialInput)
  {
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 st = materialInput.st;
    float distanceToCenter = distance(st, vec2(0.5));
    float ring = smoothstep(0.48, 0.38, distanceToCenter);
    float pulse = 0.78 + 0.22 * sin(czm_frameNumber * 0.08);
    material.diffuse = color.rgb;
    material.emission = color.rgb * 1.8;
    material.alpha = color.a * ring * pulse;
    return material;
  }
`

let materialRegistered = false

type MaterialConstructorWithCache = typeof Cesium.Material & {
  _materialCache: {
    addMaterial(type: string, material: unknown): void
  }
}

class StationGlowMaterialProperty implements Cesium.MaterialProperty {
  readonly isConstant = false
  readonly definitionChanged = new Cesium.Event()
  private readonly color: Cesium.ConstantProperty

  constructor(color: Cesium.Color) {
    ensureMaterialRegistered()
    this.color = new Cesium.ConstantProperty(color)
  }

  getType() {
    return MATERIAL_TYPE
  }

  getValue(time: Cesium.JulianDate, result?: { color?: Cesium.Color }) {
    const materialValue = result ?? {}
    materialValue.color = this.color.getValue(time, materialValue.color)
    return materialValue
  }

  equals(other?: Cesium.Property) {
    return (
      other instanceof StationGlowMaterialProperty &&
      this.color.equals(other.color)
    )
  }
}

function ensureMaterialRegistered() {
  if (materialRegistered) return
  ;(Cesium.Material as MaterialConstructorWithCache)._materialCache.addMaterial(MATERIAL_TYPE, {
    fabric: {
      type: MATERIAL_TYPE,
      uniforms: { color: Cesium.Color.WHITE },
      source: `uniform vec4 color;${MATERIAL_SOURCE}`,
    },
    translucent: true,
  })
  materialRegistered = true
}

export function createStationGlowMaterial(color: Cesium.Color): Cesium.MaterialProperty {
  return new StationGlowMaterialProperty(color)
}

const CONE_TYPE = 'MetroStationCone'
const CONE_SOURCE = `
  uniform vec4 color;

  czm_material czm_getMaterial(czm_materialInput materialInput)
  {
    czm_material material = czm_getDefaultMaterial(materialInput);
    // st.y: 0=底面 1=顶面;光锥均匀发光,顶部渐隐收尾
    float tip = smoothstep(0.0, 0.2, materialInput.st.y);
    material.diffuse = color.rgb;
    material.emission = color.rgb * 2.0;
    material.alpha = color.a * tip;
    return material;
  }
`

let coneMaterialRegistered = false

class StationConeMaterialProperty implements Cesium.MaterialProperty {
  readonly isConstant = false
  readonly definitionChanged = new Cesium.Event()
  private readonly color: Cesium.ConstantProperty

  constructor(color: Cesium.Color) {
    ensureConeMaterialRegistered()
    this.color = new Cesium.ConstantProperty(color)
  }

  getType() {
    return CONE_TYPE
  }

  getValue(time: Cesium.JulianDate, result?: { color?: Cesium.Color }) {
    const materialValue = result ?? {}
    materialValue.color = this.color.getValue(time, materialValue.color)
    return materialValue
  }

  equals(other?: Cesium.Property) {
    return (
      other instanceof StationConeMaterialProperty &&
      this.color.equals(other.color)
    )
  }
}

function ensureConeMaterialRegistered() {
  if (coneMaterialRegistered) return
  ;(Cesium.Material as MaterialConstructorWithCache)._materialCache.addMaterial(CONE_TYPE, {
    fabric: {
      type: CONE_TYPE,
      uniforms: { color: Cesium.Color.WHITE },
      source: CONE_SOURCE,
    },
    translucent: true,
  })
  coneMaterialRegistered = true
}

export function createStationConeMaterial(color: Cesium.Color): Cesium.MaterialProperty {
  return new StationConeMaterialProperty(color)
}
