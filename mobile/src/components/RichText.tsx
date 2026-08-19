import React, { useMemo } from "react";
import { Linking, StyleSheet, Text, TextProps } from "react-native";
import { type Colors } from "../theme";
import { useTheme } from "../theme-context";

const URL_RE = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s]|www\.[^\s<]+[^<.,:;"')\]\s])/g;
const MARKDOWN_LINK_RE = /\[([^\]]+)\]\(((?:https?|ftp):\/\/[^)\s]+)\)/g;
const BOLD_RE = /\*\*([^*]+?)\*\*/g;
const ITALIC_RE = /\*([^*]+?)\*/g;
const UNDERLINE_RE = /_([^_]+?)_/g;

type Span = { text: string; bold?: boolean; italic?: boolean; underline?: boolean; link?: string };

function openLink(href: string) {
  Linking.openURL(href).catch(() => {});
}

function linkify(spans: Span[]): Span[] {
  const out: Span[] = [];
  for (const s of spans) {
    let last = 0;
    let m: RegExpExecArray | null;
    URL_RE.lastIndex = 0;
    while ((m = URL_RE.exec(s.text))) {
      if (m.index > last) out.push({ ...s, text: s.text.slice(last, m.index) });
      const raw = m[0];
      const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      out.push({ text: raw, link: href });
      last = m.index + raw.length;
    }
    if (last < s.text.length) out.push({ ...s, text: s.text.slice(last) });
  }
  return out;
}

function parseFormat(text: string): Span[] {
  const spans: Span[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = /(\*\*[^*]+?\*\*|\*[^*]+?\*|_[^_]+?_)/g;
  re.lastIndex = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) spans.push({ text: text.slice(last, m.index) });
    const tok = m[0];
    if (tok.startsWith("**") && tok.endsWith("**")) {
      spans.push({ text: tok.slice(2, -2), bold: true });
    } else if (tok.startsWith("_") && tok.endsWith("_")) {
      spans.push({ text: tok.slice(1, -1), underline: true });
    } else {
      spans.push({ text: tok.slice(1, -1), italic: true });
    }
    last = m.index + tok.length;
  }
  if (last < text.length) spans.push({ text: text.slice(last) });
  return spans;
}

function parseMarkdownLinks(text: string): Span[] {
  const spans: Span[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  MARKDOWN_LINK_RE.lastIndex = 0;
  while ((m = MARKDOWN_LINK_RE.exec(text))) {
    if (m.index > last) spans.push(...parseFormat(text.slice(last, m.index)));
    spans.push({ text: m[1], link: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) spans.push(...parseFormat(text.slice(last)));
  return spans;
}

function spansToNodes(spans: Span[], keyBase: string, styles: ReturnType<typeof createStyles>): React.ReactNode[] {
  return linkify(spans).map((s, i) => {
    if (s.link) {
      return (
        <Text key={`${keyBase}-${i}`} style={styles.link} onPress={() => openLink(s.link!)}>
          {s.text}
        </Text>
      );
    }
    return (
      <Text
        key={`${keyBase}-${i}`}
        style={[
          s.bold && styles.bold,
          s.italic && styles.italic,
          s.underline && styles.underline,
        ]}
      >
        {s.text}
      </Text>
    );
  });
}

export default function RichText({ style, children, ...rest }: TextProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const text = String(children ?? "");
  if (!text) return null;
  return (
    <Text style={style} {...rest}>
      {spansToNodes(parseMarkdownLinks(text), "rt", styles)}
    </Text>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  bold: { fontWeight: "700" },
  italic: { fontStyle: "italic" },
  underline: { textDecorationLine: "underline" },
  link: {
    color: colors.primary,
    textDecorationLine: "underline",
  },
});
