import { useRef, useEffect } from 'react';
import { Animated, PanResponder, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from './theme';

type Props = {
  children: React.ReactNode;
  onDelete: () => void;
  threshold?: number;
  backgroundColor?: string;
  testID?: string;
};

export default function SwipeableRow({ children, onDelete, threshold = 90, backgroundColor, testID }: Props) {
  const tx = useRef(new Animated.Value(0)).current;
  const mounted = useRef(true);

  useEffect(() => {
    return () => { mounted.current = false; };
  }, []);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => { if (g.dx < 0) tx.setValue(Math.max(g.dx, -160)); },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -threshold) {
          Animated.timing(tx, { toValue: -500, duration: 200, useNativeDriver: true }).start(() => {
            if (mounted.current) onDelete();
          });
        } else {
          Animated.spring(tx, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  return (
    <View style={styles.wrap} testID={testID}>
      <View style={[styles.bg, backgroundColor ? { backgroundColor } : null]}>
        <Ionicons name="trash-outline" size={20} color="#fff" />
        <Text style={styles.bgText}>Elimina</Text>
      </View>
      <Animated.View {...pan.panHandlers} style={{ transform: [{ translateX: tx }] }}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', borderRadius: 16, overflow: 'hidden', marginBottom: 10 },
  bg: { position: 'absolute', top: 0, right: 0, bottom: 0, width: 160, backgroundColor: theme.colors.danger, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  bgText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
