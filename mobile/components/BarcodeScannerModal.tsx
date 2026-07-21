import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useAppTheme } from '@/lib/ThemeContext'

type Props = {
  visible: boolean
  onClose: () => void
  onScan: (data: string) => void
}

export function BarcodeScannerModal({ visible, onClose, onScan }: Props) {
  const { colors } = useAppTheme()
  const [permission, requestPermission] = useCameraPermissions()
  const [locked, setLocked] = useState(false)

  if (!visible) return null

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        {!permission?.granted ? (
          <View style={styles.center}>
            <Text style={styles.msg}>Barkod için kamera izni gerekli</Text>
            <Pressable
              style={[styles.btn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
              onPress={() => void requestPermission()}
            >
              <Text style={styles.btnText}>İzin Ver</Text>
            </Pressable>
            <Pressable onPress={onClose}><Text style={styles.cancel}>Kapat</Text></Pressable>
          </View>
        ) : (
          <>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'code128', 'qr', 'upc_a', 'upc_e'] }}
              onBarcodeScanned={({ data }) => {
                if (locked) return
                setLocked(true)
                onScan(data)
                onClose()
                setTimeout(() => setLocked(false), 800)
              }}
            />
            <View style={styles.overlay}>
              <Text style={styles.hint}>Barkodu çerçeveye hizalayın</Text>
              <Pressable style={styles.close} onPress={onClose}>
                <Text style={styles.btnText}>Kapat</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  msg: { color: '#fff', textAlign: 'center' },
  btn: { paddingHorizontal: 20, paddingVertical: 12 },
  btnText: { color: '#fff', fontWeight: '800' },
  cancel: { color: '#94a3b8', marginTop: 8 },
  overlay: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 12,
  },
  hint: { color: '#fff', fontWeight: '700' },
  close: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
})
