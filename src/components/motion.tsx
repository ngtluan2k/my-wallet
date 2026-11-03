import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

/**
 * Small motion kit on React Native's built-in Animated API (no native module, so no rebuild).
 * Every effect turns off when the user enables Reduce Motion.
 */

let reduceMotion = false;
void AccessibilityInfo.isReduceMotionEnabled?.()
  .then((v) => (reduceMotion = v))
  .catch(() => undefined);
AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) => (reduceMotion = v));

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(reduceMotion);
  useEffect(() => {
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduced);
    return () => sub?.remove();
  }, []);
  return reduced;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Pressable that shrinks slightly while held and springs back on release. */
export function PressScale({
  style,
  scaleTo = 0.97,
  onPressIn,
  onPressOut,
  ...props
}: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; scaleTo?: number }) {
  const scale = useState(() => new Animated.Value(1))[0];
  const reduced = useReducedMotion();

  function animateTo(toValue: number) {
    if (reduced) return;
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 40, bounciness: toValue === 1 ? 8 : 0 }).start();
  }

  return (
    <AnimatedPressable
      {...props}
      onPressIn={(e: GestureResponderEvent) => {
        animateTo(scaleTo);
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        animateTo(1);
        onPressOut?.(e);
      }}
      style={[style, { transform: [{ scale }] }]}
    />
  );
}

/** Fades and slides its children up when mounted. `delay` staggers siblings. */
export function FadeIn({
  children,
  delay = 0,
  offset = 12,
  duration = 320,
  style,
}: {
  children: ReactNode;
  delay?: number;
  offset?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const progress = useState(() => new Animated.Value(reduced ? 1 : 0))[0];
  useEffect(() => {
    if (reduced) return;
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, delay, duration, reduced]);
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] });
  return <Animated.View style={[style, { opacity: progress, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

/** Gives a quick "pop" whenever `trigger` changes, e.g. a number that was just updated. */
export function Pop({ trigger, children, style }: { trigger: unknown; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const scale = useState(() => new Animated.Value(1))[0];
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduced) return;
    scale.setValue(1.06);
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 24, bounciness: 10 }).start();
  }, [trigger, reduced, scale]);
  return <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>;
}

/**
 * Number that counts toward `value` when it changes. Starts at the final value unless `fromZero`,
 * so a screen never flashes a wrong total.
 */
export function useCountUp(value: number, { fromZero = false, duration = 650 } = {}): number {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(fromZero && !reduced ? 0 : value);
  const animated = useState(() => new Animated.Value(fromZero && !reduced ? 0 : value))[0];
  useEffect(() => {
    if (reduced) {
      animated.setValue(value);
      return;
    }
    const id = animated.addListener(({ value: v }) => setShown(Math.round(v)));
    const animation = Animated.timing(animated, {
      toValue: value,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start(({ finished }) => finished && setShown(value));
    return () => {
      animation.stop();
      animated.removeListener(id);
    };
  }, [value, duration, reduced, animated]);
  // With Reduce Motion the real value shows straight away.
  return reduced ? value : shown;
}
