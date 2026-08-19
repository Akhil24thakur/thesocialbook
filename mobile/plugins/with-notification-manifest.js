const { withAndroidManifest } = require("@expo/config-plugins");

const SERVICE = "com.thesocialbook.notificationreply.ReplyMessagingService";
const RECEIVER = "com.thesocialbook.notificationreply.ReplyReceiver";

module.exports = function withNotificationManifest(config) {
  return withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application?.[0];
    if (!app) return config;

    if (!(app.service ?? []).some((s) => s.$["android:name"] === SERVICE)) {
      app.service = app.service ?? [];
      app.service.push({
        $: {
          "android:name": SERVICE,
          "android:exported": "false",
        },
        "intent-filter": [
          {
            $: { "android:priority": "1" },
            action: [{ $: { "android:name": "com.google.firebase.MESSAGING_EVENT" } }],
          },
        ],
      });
    }

    if (!(app.receiver ?? []).some((r) => r.$["android:name"] === RECEIVER)) {
      app.receiver = app.receiver ?? [];
      app.receiver.push({
        $: {
          "android:name": RECEIVER,
          "android:exported": "false",
        },
      });
    }

    return config;
  });
};