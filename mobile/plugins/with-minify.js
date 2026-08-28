const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withMinify(config) {
  return withDangerousMod(config, [
    "android",
    (config) => {
      const propsPath = path.join(
        config.modRequest.platformProjectRoot,
        "gradle.properties"
      );
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
      return config;
    },
  ]);
};
