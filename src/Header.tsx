import { Pressable, StyleSheet, Text, View } from 'react-native';

export function Header({
  title,
  onClose,
  closeLabel,
}: {
  title: string;
  onClose?: () => void;
  closeLabel: string;
}) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {onClose && (
        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}>
          <Text style={styles.close}>{closeLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  title: { fontSize: 17, fontWeight: '600', color: '#111' },
  close: { fontSize: 16, color: '#2563eb' },
});
