import type { ReactNode } from 'react';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * App icon set: simple 24×24 stroke icons drawn for Sar AI.
 * To swap to an icon library later, only this file changes.
 */
const icons = {
  home: <Path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />,
  chart: <Path d="M4 19h16M7 16v-5M12 16V7M17 16v-8" />,
  sliders: (
    <>
      <Path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <Circle cx={16} cy={7} r={2} />
      <Circle cx={10} cy={17} r={2} />
    </>
  ),
  plus: <Path d="M12 5v14M5 12h14" />,
  minus: <Path d="M5 12h14" />,
  close: <Path d="M6 6l12 12M18 6 6 18" />,
  chevronLeft: <Path d="m15 18-6-6 6-6" />,
  chevronRight: <Path d="m9 18 6-6-6-6" />,
  calendar: (
    <>
      <Rect x={3.5} y={5} width={17} height={15.5} rx={2.5} />
      <Path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  camera: (
    <>
      <Path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.8l1.4-2h4.6l1.4 2h1.8A2.5 2.5 0 0 1 20 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5z" />
      <Circle cx={12} cy={13} r={3.5} />
    </>
  ),
  mic: (
    <>
      <Rect x={9} y={3} width={6} height={11} rx={3} />
      <Path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
    </>
  ),
  search: (
    <>
      <Circle cx={11} cy={11} r={6.5} />
      <Path d="m20 20-4.2-4.2" />
    </>
  ),
  barcode: <Path d="M4 6v12M7 6v12M10.5 6v12M14 6v12M17 6v12M20 6v12" />,
  image: (
    <>
      <Rect x={3.5} y={5} width={17} height={14} rx={2.5} />
      <Circle cx={9} cy={10} r={1.8} />
      <Path d="m20.5 16-5-5-8.5 8" />
    </>
  ),
  bolt: <Path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" />,
  flame: (
    <Path d="M12 21c-3.9 0-6.5-2.6-6.5-6.1 0-3.4 2.3-5.4 3.9-7.4.4 1.8 1.3 3 2.6 3.6-.1-3 .9-5.6 3.2-7.6.4 3 1.8 4.6 3.1 6.4.9 1.3 1.7 2.8 1.7 5 0 3.5-2.6 6.1-8 6.1z" />
  ),
  shield: (
    <>
      <Path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
      <Path d="m9 12 2 2 4-4" />
    </>
  ),
  drop: <Path d="M12 3.5c3 4 6 7.2 6 10.5a6 6 0 0 1-12 0c0-3.3 3-6.5 6-10.5z" />,
  briefcase: (
    <>
      <Rect x={3} y={7} width={18} height={13} rx={2.5} />
      <Path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 12.5h18" />
    </>
  ),
  store: <Path d="M4 10v10h16V10M3 10l2-6h14l2 6zM9 20v-5h6v5" />,
  box: <Path d="m3 8 9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8" />,
  sparkle: (
    <Path d="M12 3.5l1.9 5.1a2 2 0 0 0 1.2 1.2l5.1 1.9-5.1 1.9a2 2 0 0 0-1.2 1.2L12 20l-1.9-5.2a2 2 0 0 0-1.2-1.2L3.8 11.7l5.1-1.9a2 2 0 0 0 1.2-1.2z" />
  ),
  check: <Path d="m5 12.5 4.5 4.5L19 7.5" />,
  trash: <Path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5L17.5 7M10 11v6M14 11v6" />,
  users: (
    <>
      <Circle cx={8} cy={9} r={3} />
      <Circle cx={16} cy={9} r={3} />
      <Path d="M2.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5M10.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5" />
    </>
  ),
  cloudOff: (
    <>
      <Path d="M7.5 18.5h9.8a3.7 3.7 0 0 0 1.4-7.1A6 6 0 0 0 8 8.6 4.9 4.9 0 0 0 7.5 18.5z" />
      <Path d="M3.5 3.5l17 17" />
    </>
  ),
  clock: (
    <>
      <Circle cx={12} cy={12} r={8.5} />
      <Path d="M12 7.5V12l3 2" />
    </>
  ),
  keyboard: (
    <>
      <Rect x={2.5} y={6} width={19} height={12} rx={2.5} />
      <Path d="M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M8 14h8" />
    </>
  ),
  phone: <Rect x={7} y={2.5} width={10} height={19} rx={2.5} />,
  /** Plate of rice — used for the carbs indicator. */
  rice: (
    <>
      <Path d="M3.5 12h17a8.5 8.5 0 0 1-17 0z" />
      <Path d="M7 12c0-2.8 2.2-5 5-5s5 2.2 5 5" />
    </>
  ),
  /** Cooking-oil bottle — used for the fat indicator and the oil level. */
  oil: (
    <>
      <Path d="M10 3h4M10.5 3v3L8 9.2a2.5 2.5 0 0 0-.5 1.5V19a2 2 0 0 0 2 2h5a2 2 0 0 0 2-2v-8.3a2.5 2.5 0 0 0-.5-1.5L13.5 6V3" />
      <Path d="M7.5 13.5h9" />
    </>
  ),
  /** Sugar cube — blood sugar guidance. */
  sugar: (
    <>
      <Rect x={5} y={7} width={12} height={12} rx={1.5} />
      <Path d="M5 7l3-3h12v12l-3 3M17 7l3-3" />
    </>
  ),
  /** Salt shaker — sodium indicator. */
  salt: (
    <>
      <Path d="M7.5 10h9l-1 9.5a1.5 1.5 0 0 1-1.5 1.5h-4A1.5 1.5 0 0 1 8.5 19.5z" />
      <Path d="M7.5 10a4.5 4.5 0 0 1 9 0" />
      <Path d="M10.5 8h.01M13.5 8h.01M12 6.8h.01" />
    </>
  ),
  /** Chicken drumstick — used for the protein indicator. */
  protein: (
    <>
      <Ellipse cx={14.2} cy={9.8} rx={7} ry={5.6} transform="rotate(-45 14.2 9.8)" />
      <Path d="M9.6 14.4 6.2 17.8" />
      <Circle cx={4.6} cy={17.4} r={1.9} />
      <Circle cx={6.6} cy={19.4} r={1.9} />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof icons;

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  /** Fill the shape with the stroke colour (e.g. active tab). */
  filled?: boolean;
};

export function Icon({ name, size = 24, color, strokeWidth = 1.8, filled = false }: Props) {
  const theme = useTheme();
  const stroke = color ?? theme.colors.icon;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? stroke : 'none'}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={false}>
      {icons[name]}
    </Svg>
  );
}
