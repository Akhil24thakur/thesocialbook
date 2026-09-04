const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const PROGUARD_RULES = `
# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# expo-av
-dontwarn expo.modules.core.interfaces.services.KeepAwakeManager
-dontwarn expo.modules.kotlin.types.AnyTypeProvider
-dontwarn expo.modules.kotlin.types.LazyKType
`;

module.exports = function withMinify(config) {
  return withDangerousMod(config, [
    "android",
    (config) => {
      const root = config.modRequest.platformProjectRoot;

      const propsPath = path.join(root, "gradle.properties");
      let contents = fs.readFileSync(propsPath, "utf8");

      const setProp = (key, value) => {
        const regex = new RegExp(`^${key}=.*$`, "m");
        if (regex.test(contents)) {
          contents = contents.replace(regex, `${key}=${value}`);
        } else {
          contents += `\n${key}=${value}`;
        }
      };

      setProp("android.enableMinifyInReleaseBuilds", "true");
      setProp("android.enableShrinkResourcesInReleaseBuilds", "true");
      setProp("expo.gif.enabled", "false");

      fs.writeFileSync(propsPath, contents, "utf8");

      const proguardPath = path.join(root, "app", "proguard-rules.pro");
      let proguard = fs.readFileSync(proguardPath, "utf8");
      if (!proguard.includes("expo-av")) {
        proguard = proguard.replace(
          "# Add any project specific keep options here:",
          PROGUARD_RULES + "\n# Add any project specific keep options here:"
        );
        fs.writeFileSync(proguardPath, proguard, "utf8");
      }

      return config;
    },
  ]);
};
