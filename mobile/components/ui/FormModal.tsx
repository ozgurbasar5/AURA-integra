import { Modal, Pressable, ScrollView, StyleSheet, Text, View, type ViewProps } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAppTheme } from '@/lib/ThemeContext'

type Props = ViewProps & {
  visible: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
}

export function FormModal({ visible, title, onClose, children, footer }: Props) {
  const { colors } = useAppTheme()
  const insets = useSafeAreaInsets()

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={{ color: colors.muted, fontWeight: '700' }}>Kapat</Text>
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={{ padding: colors.space, gap: 12, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
        {footer ? (
          <View
            style={[
              styles.footer,
              {
                borderTopColor: colors.border,
                paddingBottom: Math.max(insets.bottom, 12),
                backgroundColor: colors.card,
              },
            ]}
          >
            {footer}
          </View>
        ) : null}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '900' },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
})
