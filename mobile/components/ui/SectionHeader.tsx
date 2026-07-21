import { StyleSheet, Text, View } from 'react-native'
import { useAppTheme } from '@/lib/ThemeContext'

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  const { colors } = useAppTheme()
  return (
    <View style={styles.row}>
      <Text style={[styles.title, { color: colors.muted }]}>{title}</Text>
      {action}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
})
