import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View, Dimensions } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Haptics from 'expo-haptics'
import { useAppTheme } from '@/lib/ThemeContext'

type Props = {
  visible: boolean
  onClose: () => void
  onScan: (data: string) => void
}

const { width } = Dimensions.get('window')
const FRAME_SIZE = width * 0.7

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
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                onScan(data)
                onClose()
                setTimeout(() => setLocked(false), 800)
              }}
            />
            <View style={styles.overlayFrame}>
              <View style={[styles.frame, { borderColor: colors.primary }]} />
            </View>
            <View style={styles.overlay}>
              <Text style={styles.hint}>Barkodu çerçeveye hizalayın</Text>
              <Pressable style={styles.close} onPress={onClose}>
                <Text style={styles.btnText}>İptal</Text>
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
  overlayFrame: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    borderWidth: 2,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  overlay: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 12,
  },
  hint: { color: '#fff', fontWeight: '700', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  close: { backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
})
