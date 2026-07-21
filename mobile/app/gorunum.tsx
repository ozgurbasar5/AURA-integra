import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Stack } from 'expo-router'
import { Screen } from '@/components/ui/Screen'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { useAppTheme } from '@/lib/ThemeContext'
import {
  THEMES,
  type ColorMode,
  type Density,
  type RadiusScale,
  type TabBarStyle,
  type ThemeKey,
} from '@/lib/appearance'

function Chip({
  label,
  active,
  color,
  onPress,
}: {
  label: string
  active: boolean
  color?: string
  onPress: () => void
}) {
  const { colors } = useAppTheme()
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: active ? (color || colors.primary) : colors.border,
          backgroundColor: active ? colors.primarySoft : colors.card,
          borderRadius: colors.radius,
        },
      ]}
    >
      {color ? <View style={[styles.swatch, { backgroundColor: color }]} /> : null}
      <Text style={{ color: active ? colors.primary : colors.text, fontWeight: '700', fontSize: 13 }}>
        {label}
      </Text>
    </Pressable>
  )
}

export default function GorunumScreen() {
  const { appearance, colors, setAppearance, resetAppearance } = useAppTheme()

  return (
    <>
      <Stack.Screen options={{ title: 'Görünüm', headerTintColor: colors.primary }} />
      <Screen scroll>
        <Card>
          <Text style={[styles.previewTitle, { color: colors.muted }]}>Önizleme</Text>
          <View style={[styles.previewBar, { backgroundColor: colors.primary, borderRadius: colors.radius }]}>
            <Text style={styles.previewText}>AURA İntegra · {THEMES[appearance.theme].name}</Text>
          </View>
        </Card>

        <SectionHeader title="Tema paleti" />
        <View style={styles.wrap}>
          {(Object.keys(THEMES) as ThemeKey[]).map(key => (
            <Chip
              key={key}
              label={THEMES[key].name}
              color={THEMES[key].accent}
              active={appearance.theme === key && !appearance.customAccent}
              onPress={() => setAppearance({ theme: key, customAccent: null })}
            />
          ))}
        </View>

        <SectionHeader title="Özel accent" />
        <Card>
          <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 8 }}>
            #RRGGBB — boş bırakırsanız tema rengi kullanılır
          </Text>
          <TextInput
            value={appearance.customAccent || ''}
            onChangeText={v => {
              const t = v.trim()
              if (!t) setAppearance({ customAccent: null })
              else setAppearance({ customAccent: t.startsWith('#') ? t : `#${t}` })
            }}
            placeholder="#0284c7"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            style={[
              styles.input,
              {
                borderColor: colors.border,
                color: colors.text,
                backgroundColor: colors.bgElevated,
                borderRadius: colors.radius,
              },
            ]}
          />
        </Card>

        <SectionHeader title="Köşe yuvarlaklığı" />
        <View style={styles.wrap}>
          {([
            ['sharp', 'Keskin'],
            ['rounded', 'Yuvarlak'],
            ['pill', 'Pill'],
          ] as [RadiusScale, string][]).map(([k, label]) => (
            <Chip
              key={k}
              label={label}
              active={appearance.radiusScale === k}
              onPress={() => setAppearance({ radiusScale: k })}
            />
          ))}
        </View>

        <SectionHeader title="Yoğunluk" />
        <View style={styles.wrap}>
          {([
            ['compact', 'Kompakt'],
            ['comfortable', 'Rahat'],
          ] as [Density, string][]).map(([k, label]) => (
            <Chip
              key={k}
              label={label}
              active={appearance.density === k}
              onPress={() => setAppearance({ density: k })}
            />
          ))}
        </View>

        <SectionHeader title="Alt bar" />
        <View style={styles.wrap}>
          {([
            ['dock', 'Klasik'],
            ['floating', 'Floating'],
          ] as [TabBarStyle, string][]).map(([k, label]) => (
            <Chip
              key={k}
              label={label}
              active={appearance.tabBarStyle === k}
              onPress={() => setAppearance({ tabBarStyle: k })}
            />
          ))}
        </View>

        <SectionHeader title="Ana ekran grid" />
        <View style={styles.wrap}>
          {([2, 3] as const).map(n => (
            <Chip
              key={n}
              label={`${n} kolon`}
              active={appearance.homeColumns === n}
              onPress={() => setAppearance({ homeColumns: n })}
            />
          ))}
        </View>

        <SectionHeader title="Renk modu" />
        <View style={styles.wrap}>
          {([
            ['system', 'Sistem'],
            ['light', 'Açık'],
            ['dark', 'Koyu'],
          ] as [ColorMode, string][]).map(([k, label]) => (
            <Chip
              key={k}
              label={label}
              active={appearance.colorMode === k}
              onPress={() => setAppearance({ colorMode: k })}
            />
          ))}
        </View>

        <Button title="Varsayılana sıfırla" variant="secondary" onPress={resetAppearance} />
      </Screen>
    </>
  )
}

const styles = StyleSheet.create({
  previewTitle: { fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' },
  previewBar: { padding: 14 },
  previewText: { color: '#fff', fontWeight: '800' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1.5,
  },
  swatch: { width: 14, height: 14, borderRadius: 7 },
  input: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
})
