const { withAppBuildGradle, withGradleProperties } = require('@expo/config-plugins')

/**
 * AGP 8+ defaults buildConfig=false → MainActivity/MainApplication
 * "Unresolved reference 'BuildConfig'" on :app:compileReleaseKotlin.
 */
function withAndroidBuildConfig(config) {
  config = withGradleProperties(config, (cfg) => {
    const key = 'android.defaults.buildfeatures.buildconfig'
    const props = cfg.modResults.filter((item) => item.key !== key)
    props.push({ type: 'property', key, value: 'true' })
    cfg.modResults = props
    return cfg
  })

  config = withAppBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents
    if (!contents.includes('buildConfig')) {
      contents = contents.replace(
        /android\s*\{/,
        `android {
    buildFeatures {
        buildConfig true
    }`,
      )
      cfg.modResults.contents = contents
    }
    return cfg
  })

  return config
}

module.exports = withAndroidBuildConfig
