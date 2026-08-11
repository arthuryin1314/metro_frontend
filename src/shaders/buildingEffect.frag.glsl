vec2 getReflectionUv(vec3 positionEC, vec3 normalEC) {
    vec3 eyeToSurfaceDir = normalize(positionEC);
    vec3 direction = reflect(eyeToSurfaceDir, normalize(normalEC));
    vec3 coord = normalize(czm_inverseViewRotation * direction);

    // Keep the document's 2D environment-map projection, but wrap UVs so
    // reflected directions outside the 0..1 range remain valid.
    return fract(vec2(coord.x, (coord.z - coord.y) / 3.0));
}

vec3 getNightStripe(vec3 positionMC, float height) {
    float interval = max(u_heightInterval, 0.001);
    float lineWidth = clamp(u_lineWidth / interval, 0.0, 1.0);
    float stripePosition = fract(height / interval - u_time * u_stripeSpeed);
    float stripeMask = 1.0 - step(lineWidth, stripePosition);

    vec2 colorUv = vec2(
        fract(positionMC.x / max(u_colorScale, 0.001)),
        fract(height / max(u_colorScale, 0.001) - u_time * u_stripeSpeed)
    );
    return texture(u_colorTexture, colorUv).rgb * stripeMask;
}

void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
    if (u_isDark) {
        float heightRange = max(u_maxHeight - u_minHeight, 0.001);
        float heightFactor = clamp(
            (fsInput.attributes.positionMC.z - u_minHeight) / heightRange,
            0.0,
            1.0
        );
        vec3 nightBase = material.diffuse * 0.18;
        nightBase *= mix(0.55, 0.95, heightFactor);

        vec3 stripeColor = getNightStripe(fsInput.attributes.positionMC, fsInput.attributes.positionMC.z);
        material.diffuse = nightBase + stripeColor * 0.18;
        material.emissive += stripeColor * u_emissiveStrength;
    } else {
        vec3 positionEC = fsInput.attributes.positionEC;
        vec3 normalEC = normalize(fsInput.attributes.normalEC);
        vec2 reflectionUv = getReflectionUv(positionEC, normalEC);
        vec3 dayReflection = texture(u_textureDay, reflectionUv).rgb;
        material.diffuse = mix(material.diffuse, dayReflection, 0.55);
    }
}
