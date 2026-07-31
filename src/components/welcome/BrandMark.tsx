import React from 'react';
import Svg, { Circle, Path, Polygon } from 'react-native-svg';

import { colors } from '../../theme/colors';

type BrandMarkProps = {
  size?: number;
};

// TODO: Replace this isolated temporary mark with the final transparent brand
// asset at src/assets/images/oh-my-teacher-logo.png when it is available.
export function BrandMark({ size = 88 }: BrandMarkProps) {
  return (
    <Svg
      accessibilityLabel="Oh My Teacher logo"
      accessibilityRole="image"
      height={size}
      viewBox="0 0 96 96"
      width={size}
    >
      <Path
        d="M17 52c12-4 22-1 31 8 9-9 19-12 31-8v22c-12-4-22 0-31 9-9-9-19-13-31-9V52Z"
        fill={colors.white}
        stroke={colors.primary}
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <Path
        d="M48 60v23"
        stroke={colors.lightBlue}
        strokeLinecap="round"
        strokeWidth="3"
      />
      <Circle cx="34" cy="48" fill={colors.green} r="6" />
      <Circle cx="62" cy="48" fill={colors.yellow} r="6" />
      <Path
        d="M24 67c2-10 5-15 10-15 5 0 8 5 14 13M72 67c-2-10-5-15-10-15-5 0-8 5-14 13"
        fill="none"
        stroke={colors.lightBlue}
        strokeLinecap="round"
        strokeWidth="5"
      />
      <Polygon fill={colors.primary} points="18,26 48,12 78,26 48,40" />
      <Path
        d="M31 32v13c9 6 25 6 34 0V32"
        fill={colors.lightBlue}
        stroke={colors.primary}
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <Path
        d="M78 26v17"
        stroke={colors.primary}
        strokeLinecap="round"
        strokeWidth="3"
      />
      <Circle cx="78" cy="45" fill={colors.orange} r="3" />
    </Svg>
  );
}
