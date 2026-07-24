import React from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  /** Full profile URL, e.g. "https://x.com/LCSOfficial". */
  url: string;
  height?: number;
}

/** Extracts the handle from a twitter.com/x.com profile URL. Twitter's
 * embed widget wants the handle in the href, not the full URL's exact form. */
function extractHandle(url: string): string {
  const match = url.match(/(?:twitter|x)\.com\/([^/?#]+)/i);
  return match ? match[1] : url;
}

export function TwitterTimeline({ url, height = 420 }: Props) {
  const { resolvedMode, colors } = useTheme();
  const handle = extractHandle(url);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          html, body { margin: 0; padding: 0; background: transparent; }
        </style>
      </head>
      <body>
        <a
          class="twitter-timeline"
          data-theme="${resolvedMode}"
          data-chrome="noheader nofooter noborders transparent"
          data-height="${height}"
          href="https://twitter.com/${handle}"
        >Tweets by @${handle}</a>
        <script async src="https://platform.twitter.com/widgets.js"></script>
      </body>
    </html>
  `;

  return (
    <View style={[styles.wrap, { height, borderColor: colors.border }]}>
      <WebView
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
        originWhitelist={['*']}
        javaScriptEnabled
        // Twitter's widget background renders white until the theme
        // script applies — this avoids a stark white flash before that.
        containerStyle={{ backgroundColor: colors.surface }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  webview: { flex: 1, backgroundColor: 'transparent' },
});
