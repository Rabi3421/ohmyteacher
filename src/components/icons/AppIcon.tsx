import React from 'react';
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Polygon,
  Polyline,
  Rect,
  SvgProps,
} from 'react-native-svg';

export type AppIconName =
  | 'alert-circle'
  | 'arrow-left'
  | 'arrow-right'
  | 'bar-chart'
  | 'bell'
  | 'book-open'
  | 'calendar'
  | 'calendar-check'
  | 'check'
  | 'check-circle'
  | 'chevron-left'
  | 'chevron-down'
  | 'chevron-right'
  | 'chevron-up'
  | 'clock'
  | 'close'
  | 'credit-card'
  | 'eye'
  | 'eye-off'
  | 'file-text'
  | 'globe'
  | 'graduation-cap'
  | 'grid'
  | 'heart'
  | 'home'
  | 'info'
  | 'inbox'
  | 'layers'
  | 'lock'
  | 'log-in'
  | 'mail'
  | 'map-pin'
  | 'log-out'
  | 'menu'
  | 'more-horizontal'
  | 'phone'
  | 'plus'
  | 'refresh'
  | 'search'
  | 'school'
  | 'settings'
  | 'shield-settings'
  | 'shield-check'
  | 'star'
  | 'trending-up'
  | 'presentation'
  | 'user'
  | 'users'
  | 'wallet'
  | 'x-circle';

type AppIconProps = SvgProps & {
  name: AppIconName;
  size?: number;
  color?: string;
  fillColor?: string;
  strokeWidth?: number;
};

export function AppIcon({
  name,
  size = 24,
  color = 'currentColor',
  fillColor = 'none',
  strokeWidth = 2,
  ...svgProps
}: AppIconProps) {
  const shared = {
    fill: fillColor,
    stroke: color,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth,
  };

  const icon = (() => {
    switch (name) {
      case 'alert-circle':
        return (
          <>
            <Circle cx="12" cy="12" r="9" {...shared} />
            <Line x1="12" y1="7" x2="12" y2="13" {...shared} />
            <Circle cx="12" cy="17" r=".65" fill={color} stroke="none" />
          </>
        );
      case 'arrow-left':
        return (
          <>
            <Line x1="20" y1="12" x2="4" y2="12" {...shared} />
            <Polyline points="10 6 4 12 10 18" {...shared} />
          </>
        );
      case 'globe':
        return (
          <>
            <Circle cx="12" cy="12" r="9" {...shared} />
            <Path
              d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"
              {...shared}
            />
          </>
        );
      case 'mail':
        return (
          <>
            <Rect height="14" rx="2.5" width="18" x="3" y="5" {...shared} />
            <Polyline points="3.5 7 12 13 20.5 7" {...shared} />
          </>
        );
      case 'map-pin':
        return (
          <>
            <Path
              d="M12 21c4.2-4.6 6.3-8 6.3-10.7A6.3 6.3 0 0 0 5.7 10.3C5.7 13 7.8 16.4 12 21Z"
              {...shared}
            />
            <Circle cx="12" cy="10.2" r="2.4" {...shared} />
          </>
        );
      case 'phone':
        return (
          <Path
            d="M7.6 3.5 9.4 8 7.3 9.9a12.4 12.4 0 0 0 6.8 6.8L16 14.6l4.5 1.8v3.1a1.6 1.6 0 0 1-1.8 1.6C10.4 20.4 3.6 13.6 2.9 5.3A1.6 1.6 0 0 1 4.5 3.5Z"
            {...shared}
          />
        );
      case 'chevron-down':
        return <Polyline points="6 9 12 15 18 9" {...shared} />;
      case 'chevron-left':
        return <Polyline points="15 5 8 12 15 19" {...shared} />;
      case 'chevron-right':
        return <Polyline points="9 5 16 12 9 19" {...shared} />;
      case 'close':
        return (
          <>
            <Line x1="6" y1="6" x2="18" y2="18" {...shared} />
            <Line x1="18" y1="6" x2="6" y2="18" {...shared} />
          </>
        );
      case 'check':
        return <Polyline points="5 12.5 10 17 19 7" {...shared} />;
      case 'graduation-cap':
        return (
          <>
            <Polygon points="2 9 12 4 22 9 12 14 2 9" {...shared} />
            <Path
              d="M6 11.2v5.1c3.4 2.3 8.6 2.3 12 0v-5.1M22 9v6"
              {...shared}
            />
          </>
        );
      case 'users':
        return (
          <>
            <Circle cx="9" cy="8" r="3" {...shared} />
            <Circle cx="17" cy="9" r="2.5" {...shared} />
            <Path
              d="M3.5 19v-1.2c0-3.1 2.5-5.6 5.5-5.6s5.5 2.5 5.5 5.6V19M14 13.2c3.7-.8 6.5 1.6 6.5 5.1V19"
              {...shared}
            />
          </>
        );
      case 'user':
        return (
          <>
            <Circle cx="12" cy="8" r="4" {...shared} />
            <Path d="M4.5 21v-1.5a7.5 7.5 0 0 1 15 0V21" {...shared} />
          </>
        );
      case 'presentation':
        return (
          <>
            <Rect x="3" y="4" width="18" height="12" rx="2" {...shared} />
            <Line x1="12" y1="16" x2="12" y2="21" {...shared} />
            <Line x1="8" y1="21" x2="16" y2="21" {...shared} />
            <Path d="m7 12 3-3 2 2 4-4" {...shared} />
          </>
        );
      case 'book-open':
        return (
          <>
            <Path
              d="M3 5.5c3.4-.8 6.4.1 9 2.5v11c-2.6-2.4-5.6-3.3-9-2.5v-11Z"
              {...shared}
            />
            <Path
              d="M21 5.5c-3.4-.8-6.4.1-9 2.5v11c2.6-2.4 5.6-3.3 9-2.5v-11Z"
              {...shared}
            />
          </>
        );
      case 'calendar-check':
        return (
          <>
            <Rect x="3" y="5" width="18" height="16" rx="3" {...shared} />
            <Line x1="7" y1="3" x2="7" y2="7" {...shared} />
            <Line x1="17" y1="3" x2="17" y2="7" {...shared} />
            <Line x1="3" y1="10" x2="21" y2="10" {...shared} />
            <Polyline points="8 15 11 18 16 13" {...shared} />
          </>
        );
      case 'calendar':
        return (
          <>
            <Rect x="3" y="5" width="18" height="16" rx="3" {...shared} />
            <Line x1="7" y1="3" x2="7" y2="7" {...shared} />
            <Line x1="17" y1="3" x2="17" y2="7" {...shared} />
            <Line x1="3" y1="10" x2="21" y2="10" {...shared} />
          </>
        );
      case 'bar-chart':
        return (
          <>
            <Rect x="4" y="13" width="3.5" height="7" rx="1" {...shared} />
            <Rect x="10.25" y="9" width="3.5" height="11" rx="1" {...shared} />
            <Rect x="16.5" y="4" width="3.5" height="16" rx="1" {...shared} />
          </>
        );
      case 'log-in':
        return (
          <>
            <Path d="M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" {...shared} />
            <Polyline points="10 8 14 12 10 16" {...shared} />
            <Line x1="14" y1="12" x2="3" y2="12" {...shared} />
          </>
        );
      case 'school':
        return (
          <>
            <Path
              d="M3 21h18M5 21V10h14v11M3 10l9-6 9 6M9 21v-6h6v6M8 12h.01M16 12h.01"
              {...shared}
            />
            <Line x1="12" y1="4" x2="12" y2="1.8" {...shared} />
            <Path d="M12 2h5l-1.4 1.5L17 5h-5" {...shared} />
          </>
        );
      case 'shield-check':
        return (
          <>
            <Path
              d="M12 2 20 5v6c0 5-3.3 8.7-8 11-4.7-2.3-8-6-8-11V5l8-3Z"
              {...shared}
            />
            <Polyline points="8 12 11 15 16.5 9" {...shared} />
          </>
        );
      case 'shield-settings':
        return (
          <>
            <Path
              d="M12 2 20 5v6c0 5-3.3 8.7-8 11-4.7-2.3-8-6-8-11V5l8-3Z"
              {...shared}
            />
            <Circle cx="12" cy="11" r="2.2" {...shared} />
            <Path
              d="M12 6.8v1.3M12 13.9v1.3M7.8 11h1.3M14.9 11h1.3M9 8l.9.9M14.1 13.1l.9.9M15 8l-.9.9M9.9 13.1 9 14"
              {...shared}
            />
          </>
        );
      case 'lock':
        return (
          <>
            <Rect x="4" y="10" width="16" height="11" rx="2.5" {...shared} />
            <Path d="M8 10V7a4 4 0 0 1 8 0v3" {...shared} />
            <Line x1="12" y1="14" x2="12" y2="17" {...shared} />
          </>
        );
      case 'clock':
        return (
          <>
            <Circle cx="12" cy="12" r="9" {...shared} />
            <Polyline points="12 7 12 12 15.5 14" {...shared} />
            <Path
              d="M5 3 2.5 5.5M19 3l2.5 2.5M7 22l-1 1M17 22l1 1"
              {...shared}
            />
          </>
        );
      case 'star':
        return (
          <Polygon
            points="12 2.5 15 8.6 21.7 9.6 16.8 14.4 18 21 12 17.8 6 21 7.2 14.4 2.3 9.6 9 8.6 12 2.5"
            {...shared}
          />
        );
      case 'settings':
        return (
          <>
            <Circle cx="12" cy="12" r="3" {...shared} />
            <Path
              d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"
              {...shared}
            />
          </>
        );
      case 'heart':
        return (
          <Path
            d="M20.8 4.8a5.5 5.5 0 0 0-7.8 0L12 5.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z"
            {...shared}
          />
        );
      case 'search':
        return (
          <>
            <Circle cx="10.5" cy="10.5" r="6.5" {...shared} />
            <Line x1="15.5" y1="15.5" x2="21" y2="21" {...shared} />
          </>
        );
      case 'eye':
        return (
          <>
            <Path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" {...shared} />
            <Circle cx="12" cy="12" r="2.5" {...shared} />
          </>
        );
      case 'eye-off':
        return (
          <>
            <Path d="M4 4 20 20M9.8 6.3A9.8 9.8 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-2.2 2.9M6.3 7.4C3.9 9.2 2.5 12 2.5 12s3.5 6 9.5 6c1.1 0 2.1-.2 3-.5M9.9 9.9a3 3 0 0 0 4.2 4.2" {...shared} />
          </>
        );
      case 'info':
        return (
          <>
            <Circle cx="12" cy="12" r="9" {...shared} />
            <Line x1="12" y1="11" x2="12" y2="17" {...shared} />
            <Circle cx="12" cy="7" r=".65" fill={color} stroke="none" />
          </>
        );
      case 'inbox':
        return (
          <>
            <Path d="M4 5h16l2 10v4H2v-4L4 5Z" {...shared} />
            <Path d="M2 15h5l2 2h6l2-2h5" {...shared} />
          </>
        );
      case 'refresh':
        return (
          <>
            <Path d="M20 7v5h-5M4 17v-5h5" {...shared} />
            <Path d="M6.1 8a7 7 0 0 1 11.7-1L20 12M4 12l2.2 5a7 7 0 0 0 11.7-1" {...shared} />
          </>
        );
      case 'arrow-right':
        return (
          <>
            <Line x1="4" y1="12" x2="20" y2="12" {...shared} />
            <Polyline points="14 6 20 12 14 18" {...shared} />
          </>
        );
      case 'bell':
        return (
          <>
            <Path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5 2 6H4c.5-1 2-2 2-6Z" {...shared} />
            <Path d="M10 21a2 2 0 0 0 4 0" {...shared} />
          </>
        );
      case 'check-circle':
        return (
          <>
            <Circle cx="12" cy="12" r="9" {...shared} />
            <Polyline points="8 12 11 15 16.5 9" {...shared} />
          </>
        );
      case 'chevron-up':
        return <Polyline points="18 15 12 9 6 15" {...shared} />;
      case 'credit-card':
        return (
          <>
            <Rect x="2" y="5" width="20" height="14" rx="2" {...shared} />
            <Line x1="2" y1="10" x2="22" y2="10" {...shared} />
          </>
        );
      case 'file-text':
        return (
          <>
            <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" {...shared} />
            <Polyline points="14 2 14 8 20 8" {...shared} />
            <Line x1="8" y1="13" x2="16" y2="13" {...shared} />
            <Line x1="8" y1="17" x2="12" y2="17" {...shared} />
          </>
        );
      case 'grid':
        return (
          <>
            <Rect x="3" y="3" width="7" height="7" rx="1" {...shared} />
            <Rect x="14" y="3" width="7" height="7" rx="1" {...shared} />
            <Rect x="3" y="14" width="7" height="7" rx="1" {...shared} />
            <Rect x="14" y="14" width="7" height="7" rx="1" {...shared} />
          </>
        );
      case 'home':
        return (
          <>
            <Path d="M3 10.5 12 3l9 7.5V21H15v-6H9v6H3V10.5Z" {...shared} />
          </>
        );
      case 'layers':
        return (
          <>
            <Polygon points="12 2 2 7 12 12 22 7 12 2" {...shared} />
            <Polyline points="2 17 12 22 22 17" {...shared} />
            <Polyline points="2 12 12 17 22 12" {...shared} />
          </>
        );
      case 'log-out':
        return (
          <>
            <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" {...shared} />
            <Polyline points="16 17 21 12 16 7" {...shared} />
            <Line x1="21" y1="12" x2="9" y2="12" {...shared} />
          </>
        );
      case 'menu':
        return (
          <>
            <Line x1="3" y1="6" x2="21" y2="6" {...shared} />
            <Line x1="3" y1="12" x2="21" y2="12" {...shared} />
            <Line x1="3" y1="18" x2="21" y2="18" {...shared} />
          </>
        );
      case 'more-horizontal':
        return (
          <>
            <Circle cx="5" cy="12" r="1.2" fill={color} stroke="none" />
            <Circle cx="12" cy="12" r="1.2" fill={color} stroke="none" />
            <Circle cx="19" cy="12" r="1.2" fill={color} stroke="none" />
          </>
        );
      case 'plus':
        return (
          <>
            <Line x1="12" y1="5" x2="12" y2="19" {...shared} />
            <Line x1="5" y1="12" x2="19" y2="12" {...shared} />
          </>
        );
      case 'trending-up':
        return (
          <>
            <Polyline points="23 6 13.5 15.5 8.5 10.5 1 18" {...shared} />
            <Polyline points="17 6 23 6 23 12" {...shared} />
          </>
        );
      case 'wallet':
        return (
          <>
            <Path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z" {...shared} />
            <Path d="M16 10h2v4h-2a2 2 0 1 1 0-4Z" {...shared} />
          </>
        );
      case 'x-circle':
        return (
          <>
            <Circle cx="12" cy="12" r="9" {...shared} />
            <Line x1="9" y1="9" x2="15" y2="15" {...shared} />
            <Line x1="15" y1="9" x2="9" y2="15" {...shared} />
          </>
        );
      default:
        return null;
    }
  })();

  return (
    <Svg
      accessibilityElementsHidden
      focusable={false}
      height={size}
      viewBox="0 0 24 24"
      width={size}
      {...svgProps}
    >
      <G>{icon}</G>
    </Svg>
  );
}
