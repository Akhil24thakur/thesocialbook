import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const APP_DIR = "android/app";
const KEYSTORE = `${APP_DIR}/keystore.jks`;
const ALIAS = process.env.KEY_ALIAS || "thesocialbook";

let storePassword = process.env.KEYSTORE_PASSWORD;
let keyPassword = process.env.KEY_PASSWORD;

if (process.env.KEYSTORE_B64) {
  mkdirSync(APP_DIR, { recursive: true });
  writeFileSync(KEYSTORE, Buffer.from(process.env.KEYSTORE_B64, "base64"));
  console.log("using existing keystore from secret");
} else {
  storePassword = randomBytes(12).toString("base64").replace(/[^a-zA-Z0-9]/g, "");
  keyPassword = storePassword;
  mkdirSync(APP_DIR, { recursive: true });
  execSync(
    `keytool -genkeypair -v -keystore ${KEYSTORE} -alias ${ALIAS} -keyalg RSA -keysize 2048 -validity 10000 ` +
      `-storepass ${storePassword} -keypass ${keyPassword} ` +
      `-dname "CN=SocialBook, OU=Dev, O=SocialBook, L=City, ST=State, C=IN"`,
    { stdio: "inherit" }
  );
  writeFileSync(
    "android/keystore-credentials.txt",
    `ANDROID_KEYSTORE_BASE64=${readFileSync(KEYSTORE).toString("base64")}\nANDROID_KEYSTORE_PASSWORD=${storePassword}\nANDROID_KEY_ALIAS=${ALIAS}\nANDROID_KEY_PASSWORD=${keyPassword}\n`,
    { encoding: "utf8" }
  );
  console.log("generated new keystore");
}
writeFileSync(
  "android/keystore-credentials.txt",
  `ANDROID_KEYSTORE_BASE64=${process.env.KEYSTORE_B64 ? process.env.KEYSTORE_B64 : readFileSync(KEYSTORE).toString("base64")}\nANDROID_KEYSTORE_PASSWORD=${storePassword}\nANDROID_KEY_ALIAS=${ALIAS}\nANDROID_KEY_PASSWORD=${keyPassword}\n`,
  { encoding: "utf8" }
);

const gradlePropsPath = "android/gradle.properties";
const gradleProps = readFileSync(gradlePropsPath, "utf8");
let propsToAppend = "";
if (!gradleProps.includes("expo.inlineModules.watchedDirectories")) {
  propsToAppend += "\nexpo.inlineModules.watchedDirectories=[]\n";
  console.log("added expo.inlineModules.watchedDirectories to gradle.properties");
}
propsToAppend +=
  `\nRELEASE_STORE_FILE=keystore.jks\nRELEASE_STORE_PASSWORD=${storePassword}\nRELEASE_KEY_ALIAS=${ALIAS}\nRELEASE_KEY_PASSWORD=${keyPassword}\n`;
writeFileSync(gradlePropsPath, propsToAppend, { encoding: "utf8", flag: "a" });

const buildGradle = "android/app/build.gradle";
let gradle = readFileSync(buildGradle, "utf8");

const signingBlock = `
        signingConfigs {
            release {
                if (project.hasProperty('RELEASE_STORE_FILE')) {
                    storeFile file(RELEASE_STORE_FILE)
                    storePassword RELEASE_STORE_PASSWORD
                    keyAlias RELEASE_KEY_ALIAS
                    keyPassword RELEASE_KEY_PASSWORD
                }
            }
        }
`;
gradle = gradle.replace(/\n\s*buildTypes \{/, `${signingBlock}\n        buildTypes {`);
gradle = gradle.replace(/signingConfig signingConfigs\.debug/g, "signingConfig signingConfigs.release");
writeFileSync(buildGradle, gradle, "utf8");
console.log("patched signing config");

if (!existsSync("android/app/src/main/res")) {
  console.log("WARNING: res dir missing");
}
console.log("done");