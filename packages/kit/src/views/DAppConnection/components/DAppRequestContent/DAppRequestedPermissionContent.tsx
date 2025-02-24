import { StyleSheet } from 'react-native';

import { Icon, SizableText, XStack, YStack } from '@onekeyhq/components';

function DAppRequestedPermissionContent({
  requestPermissions = [
    'View your balance and activity',
    'Send approval requests',
  ],
}: {
  requestPermissions?: string[];
}) {
  return (
    <YStack space="$2">
      <SizableText color="$text" size="$headingMd">
        Requested permissions
      </SizableText>
      <YStack
        py="$2.5"
        px="$3"
        space="$3"
        minHeight="$8"
        bg="$bg"
        borderRadius="$3"
        borderWidth={StyleSheet.hairlineWidth}
        borderColor="$borderSubdued"
        borderCurve="continuous"
      >
        {requestPermissions.map((text) => (
          <XStack space="$3" key={text}>
            <Icon name="CheckLargeOutline" color="$icon" size="$5" />
            <SizableText color="$text" size="$bodyMd">
              {text}
            </SizableText>
          </XStack>
        ))}
      </YStack>
    </YStack>
  );
}

export { DAppRequestedPermissionContent };
