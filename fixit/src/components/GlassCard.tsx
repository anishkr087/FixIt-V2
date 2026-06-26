import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const GlassCard: React.FC<Props> = ({ children, style }) => {
  return (
    <View style={[styles.container, style]}>
      <BlurView intensity={30} tint="light" style={styles.blurView}>
        {children}
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  blurView: {
    padding: 20,
  },
});
