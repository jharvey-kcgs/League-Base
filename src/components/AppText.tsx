import React from 'react';
import { Text, type TextProps } from 'react-native';
import { FONT_FAMILY } from '../theme/fonts';

type Weight = 'regular' | 'medium' | 'bold' | 'heavy';

interface Props extends TextProps {
  weight?: Weight;
}

// RN fontWeight fallback for when the display font isn't loaded yet, so headers
// still read as distinct from body text on the system font.
const FALLBACK_WEIGHT: Record<Weight, TextProps['style']> = {
  regular: { fontWeight: '400' },
  medium: { fontWeight: '500' },
  bold: { fontWeight: '700' },
  heavy: { fontWeight: '800' },
};

/** Use this instead of the raw RN <Text> everywhere — it's how the display
 * font gets applied to headers consistently once it's added (see theme/fonts.ts). */
export function AppText({ weight = 'regular', style, ...rest }: Props) {
  const family = FONT_FAMILY[weight];
  return (
    <Text
      {...rest}
      style={[family ? { fontFamily: family } : FALLBACK_WEIGHT[weight], style]}
    />
  );
}
