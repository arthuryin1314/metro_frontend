import * as Cesium from 'cesium'
import buildingFragmentShader from '@/shaders/buildingEffect.frag.glsl?raw'
import dayTextureUrl from '@/assets/sky.jpg?url'
import colorTextureUrl from '@/assets/color.png?url'

export function createBuildingEffectShader() {
  return new Cesium.CustomShader({
    uniforms: {
      u_isDark: { type: Cesium.UniformType.BOOL, value: false },
      u_textureDay: {
        type: Cesium.UniformType.SAMPLER_2D,
        value: new Cesium.TextureUniform({ url: dayTextureUrl, repeat: true }),
      },
      u_colorTexture: {
        type: Cesium.UniformType.SAMPLER_2D,
        value: new Cesium.TextureUniform({ url: colorTextureUrl, repeat: true }),
      },
      u_time: { type: Cesium.UniformType.FLOAT, value: 0 },
      u_heightInterval: { type: Cesium.UniformType.FLOAT, value: 50 },
      u_lineWidth: { type: Cesium.UniformType.FLOAT, value: 5 },
      u_colorScale: { type: Cesium.UniformType.FLOAT, value: 50 },
      u_stripeSpeed: { type: Cesium.UniformType.FLOAT, value: 0.35 },
      u_emissiveStrength: { type: Cesium.UniformType.FLOAT, value: 1.2 },
      u_minHeight: { type: Cesium.UniformType.FLOAT, value: 0 },
      u_maxHeight: { type: Cesium.UniformType.FLOAT, value: 1000 },
    },
    fragmentShaderText: buildingFragmentShader,
  })
}
