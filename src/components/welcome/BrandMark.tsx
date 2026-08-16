import React from 'react';
import { Image } from 'react-native';

type BrandMarkProps = {
  size?: number;
};

export function BrandMark({ size = 88 }: BrandMarkProps) {
  const dimensions = { height: size, width: size };

  return (
    <Image
      accessibilityLabel="Oh My Teacher logo"
      accessibilityRole="image"
      resizeMode="contain"
      source={require('../../assets/images/ohmyteacher-logo.png')}
      style={dimensions}
    />
  );
}
