import { StatusBar } from 'expo-status-bar'
import { Platform, StyleSheet, Text, View } from 'react-native'
import { AuraColors } from '@/constants/AuraColors'

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>AURA İntegra Mobil</Text>
      <Text style={styles.body}>
        Web paneli ile aynı Supabase hesabını kullanır. Satış ve sayım için Next.js API
        (Bearer token) gerekir.
      </Text>
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: AuraColors.bg,
  },
  title: { fontSize: 20, fontWeight: '800', color: AuraColors.text, marginBottom: 12 },
  body: { textAlign: 'center', color: AuraColors.muted, lineHeight: 22 },
})
