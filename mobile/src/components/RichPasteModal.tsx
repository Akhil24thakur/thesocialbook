import React, { useCallback, useMemo, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { WebView } from "react-native-webview";
import Icon from "./Icon";
import { radius, type Colors } from "../theme";
import { useTheme } from "../theme-context";

const TOKEN_RE = /<([a-zA-Z/][^>]*)>|([^<]+)/g;

export function htmlToMarkers(html: string): string {
  const out: string[] = [];
  const stack: { tag: string; href?: string }[] = [];
  const decode = (t: string) =>
    t
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  const emit = (text: string) => {
    const t = decode(text);
    if (!t) return;
    let s = t;
    const link = [...stack].reverse().find((x) => x.tag === "a");
    if (link?.href) s = `[${s}](${link.href})`;
    if (stack.some((x) => x.tag === "b" || x.tag === "strong")) s = `**${s}**`;
    else if (stack.some((x) => x.tag === "i" || x.tag === "em")) s = `*${s}*`;
    else if (stack.some((x) => x.tag === "u")) s = `_${s}_`;
    out.push(s);
  };
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(html))) {
    if (m[2] !== undefined) {
      emit(m[2]);
      continue;
    }
    const tagRaw = m[1].trim();
    const closing = tagRaw.startsWith("/");
    const tag = closing ? tagRaw.slice(1).toLowerCase().split(/\s/)[0] : tagRaw.toLowerCase().split(/\s/)[0];
    if (tag === "br") {
      emit("\n");
    } else if (["p", "div", "li", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "tr", "table"].includes(tag)) {
      if (closing) emit("\n");
    } else if (closing) {
      const idx = stack.map((x) => x.tag).lastIndexOf(tag);
      if (idx >= 0) stack.splice(idx, 1);
    } else if (["b", "strong", "i", "em", "u", "a"].includes(tag)) {
      let href: string | undefined;
      if (tag === "a") {
        const hm = tagRaw.match(/href=["']([^"']+)["']/i);
        href = hm ? hm[1] : undefined;
      }
      stack.push({ tag, href });
    }
  }
  return out.join("");
}

const EDITOR_HTML = `
<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
  html, body { margin: 0; padding: 12px; background: #FFFFFF; }
  #ed { outline: none; font-size: 17px; line-height: 26px; font-family: sans-serif; min-height: 180px; color: #172033; }
</style>
</head><body>
<div id="ed" contenteditable="true" autofocus placeholder="Paste your text here..."></div>
<script>
document.addEventListener("keydown", function(e) {
  if (e.key === "Enter" && !e.shiftKey) e.preventDefault();
});
</script>
</body></html>
`;

export default function RichPasteModal({
  visible,
  onInsert,
  onClose,
}: {
  visible: boolean;
  onInsert: (text: string) => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const webRef = React.useRef<WebView>(null);
  const [extracting, setExtracting] = useState(false);

  const run = useCallback((js: string) => {
    webRef.current?.injectJavaScript(js);
  }, []);

  const exec = (cmd: string) => {
    run(`document.execCommand('${cmd}'); true;`);
  };

  const extract = () => {
    setExtracting(true);
    run(`window.ReactNativeWebView.postMessage(document.getElementById('ed').innerHTML); true;`);
  };

  const onMessage = useCallback(
    (e: any) => {
      const html = String(e.nativeEvent?.data ?? "");
      const markers = htmlToMarkers(html);
      setExtracting(false);
      onInsert(markers);
    },
    [onInsert]
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.head}>
            <Text style={styles.title}>Paste rich text</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.toolbar}>
            <TouchableOpacity style={styles.toolBtn} onPress={() => exec("bold")}>
              <Text style={[styles.toolText, styles.toolBold]}>B</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolBtn} onPress={() => exec("italic")}>
              <Text style={[styles.toolText, styles.toolItalic]}>I</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolBtn} onPress={() => exec("underline")}>
              <Text style={[styles.toolText, styles.toolUnderline]}>U</Text>
            </TouchableOpacity>
            <Text style={styles.hint}>Long-press here and Paste your copied text</Text>
          </View>
          <View style={styles.editor}>
            <WebView
              ref={webRef}
              source={{ html: EDITOR_HTML }}
              style={styles.web}
              originWhitelist={["*"]}
              onMessage={onMessage}
              onLoadEnd={() => run(`document.getElementById('ed').focus(); true;`)}
              keyboardDisplayRequiresUserAction={false}
            />
          </View>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.btnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={extract} activeOpacity={0.85}>
              <Text style={styles.btnText}>{extracting ? "Reading…" : "Insert"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(23,32,51,0.45)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 16,
    paddingBottom: 26,
    minHeight: "70%",
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  toolBtn: {
    width: 36,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  toolText: {
    fontSize: 16,
    color: colors.text,
  },
  toolBold: { fontWeight: "700" },
  toolItalic: { fontStyle: "italic" },
  toolUnderline: { textDecorationLine: "underline" },
  hint: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "right",
  },
  editor: {
    flex: 1,
    marginTop: 10,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  web: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  row: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhost: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnGhostText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
  },
  btnText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.white,
  },
});