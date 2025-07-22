// This file is a fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight } from 'expo-symbols';
import React from 'react';
import { OpaqueColorValue, StyleProp, TextStyle } from 'react-native';

// Add your SFSymbol to MaterialIcons mappings here.
const MAPPING = {
  // See MaterialIcons here: https://icons.expo.fyi
  // See SF Symbols in the SF Symbols app on Mac.
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'map.fill': 'map',
  'clock.fill': 'access-time',
  'chart.bar.fill': 'bar-chart',
  'gear': 'settings',
  'xmark': 'close',
  'person.fill': 'person',
  'location.fill': 'location-on',
  'arrow.right': 'arrow-forward',
  'lightbulb.fill': 'lightbulb',
  'calendar': 'calendar-today',
  'minus': 'remove',
  'plus': 'add',
  'checkmark': 'check',
  'arrow.left': 'arrow-back',
  'play.fill': 'play-arrow',
  'pause.fill': 'pause',
  'stop.fill': 'stop',
  'sun.max.fill': 'wb-sunny',
  'cross.fill': 'local-hospital',
  'person.circle.fill': 'account-circle',
  'questionmark.circle': 'help',
  'dollarsign.circle.fill': 'monetization-on',
  'doc.text.fill': 'description',
  'chevron.down': 'expand-more',
  'square.and.arrow.up': 'share',
} as Partial<
  Record<
    import('expo-symbols').SymbolViewProps['name'],
    React.ComponentProps<typeof MaterialIcons>['name']
  >
>;

export type IconSymbolName = keyof typeof MAPPING;

/**
 * An icon component that uses native SFSymbols on iOS, and MaterialIcons on Android and web. This ensures a consistent look across platforms, and optimal resource usage.
 *
 * Icon `name`s are based on SFSymbols and require manual mapping to MaterialIcons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
