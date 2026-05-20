/**
 * Sheet — bottom drawer modal. Mirrors Angular admin-portal
 * `.overlay` + `.sheet` pattern (admin-portal-suspend-confirm.component.ts):
 *   - fixed overlay rgba(15,17,21,0.5)
 *   - white sheet, 18px top radii, 18/18/28 padding
 *   - drag-handle pill at top
 *   - on web ≥768px, sheet is centered to the 430px phone-frame column
 *
 * Uses RN `Modal` for native modal semantics + back-button handling.
 */
import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  useWindowDimensions,
  View,
} from 'react-native';
import { YStack } from 'tamagui';

import { beautyTokens } from '../../../tamagui.config';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  dismissOnBackdropPress?: boolean;
  maxHeightPercent?: number;
}

export function Sheet({
  open,
  onClose,
  children,
  dismissOnBackdropPress = true,
  maxHeightPercent = 0.85,
}: SheetProps) {
  const { width, height } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width >= 768;
  const sheetMaxHeight = height * maxHeightPercent;

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        onPress={dismissOnBackdropPress ? onClose : undefined}
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 17, 21, 0.5)',
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: isDesktopWeb ? beautyTokens.phoneMax : '100%',
          }}
        >
          <YStack
            bg={beautyTokens.white}
            borderTopLeftRadius={18}
            borderTopRightRadius={18}
            px={18}
            pt={14}
            pb={28}
            maxH={sheetMaxHeight}
          >
            <View
              accessibilityElementsHidden
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: beautyTokens.line,
                alignSelf: 'center',
                marginBottom: 14,
              }}
            />
            {children}
          </YStack>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
