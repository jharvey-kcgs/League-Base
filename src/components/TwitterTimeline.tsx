import React, { useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  /** Full profile URL, e.g. "https://x.com/LCSOfficial". */
  url: string;
  /** How many recent tweets to show. */
  tweetLimit?: number;
}

/** Extracts the handle from a twitter.com/x.com profile URL. Twitter's
 * embed widget wants the handle in the href, not the full URL's exact form. */
function extractHandle(url: string): string {
  const match = url.match(/(?:twitter|x)\.com\/([^/?#]+)/i);
  return match ? match[1] : url;
}

const INITIAL_HEIGHT = 120;
const MAX_HEIGHT = 700;

export function TwitterTimeline({ url, tweetLimit = 3 }: Props) {
  const { resolvedMode, colors } = useTheme();
  const handle = extractHandle(url);
  const [height, setHeight] = useState(INITIAL_HEIGHT);
  const [loaded, setLoaded] = useState(false);

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
          data-tweet-limit="${tweetLimit}"
          href="https://twitter.com/${handle}"
        >Tweets by @${handle}</a>
        <script async src="https://platform.twitter.com/widgets.js"></script>
        <script>
          // Twitter's widget lives in an iframe it creates itself and posts
          // resize events to our window as it loads content — relay the
          // real height to React Native instead of guessing a fixed one
          // (which either clips tweets or leaves a lot of empty space).
          window.addEventListener('message', function (event) {
            try {
              var data = JSON.parse(event.data);
              if (
                data['twttr.embed'] &&
                data['twttr.embed'].method === 'twttr.private.resize' &&
                data['twttr.embed'].params &&
                data['twttr.embed'].params[0]
              ) {
                var height = data['twttr.embed'].params[0].height;
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'resize', height: height }));
              }
            } catch (e) {}
          });
        </script>
      </body>
    </html>
  `;

  // Tapping a tweet should open Twitter/X itself, not navigate inside this
  // WebView — block any real navigation attempt and hand it to the OS
  // instead. The initial inline-HTML load isn't a twitter.com/x.com URL, so
  // it's unaffected by this check.
  const handleShouldStartLoad = (request: WebViewNavigation): boolean => {
    if (/(?:twitter|x)\.com/i.test(request.url)) {
      Linking.openURL(request.url);
      return false;
    }
    return true;
  };

  return (
    <View style={[styles.wrap, { height: Math.min(height, MAX_HEIGHT), borderColor: colors.border }]}>
      {!loaded && (
        <View style={[styles.loading, { backgroundColor: colors.surface }]}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}
      <WebView
        source={{ html }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onLoadEnd={() => setLoaded(true)}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'resize' && typeof data.height === 'number') {
              setHeight(data.height);
            }
          } catch {
            // ignore malformed messages
          }
        }}
        containerStyle={{ backgroundColor: colors.surface }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  webview: { flex: 1, backgroundColor: 'transparent' },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
});
