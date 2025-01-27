import type { ComponentProps } from 'react';

import { useIntl } from 'react-intl';

import { Icon, SizableText, XStack } from '@onekeyhq/components';
import { useSendSelectedFeeAtom } from '@onekeyhq/kit/src/states/jotai/contexts/sendConfirm';
import { getFeeLabel } from '@onekeyhq/kit/src/utils/gasFee';

type IProps = ComponentProps<typeof XStack> & {
  disabled?: boolean;
  onPress?: () => void;
};

function FeeSelectorTrigger(props: IProps) {
  const intl = useIntl();
  const { disabled, onPress, ...rest } = props;

  const [sendSelectedFee] = useSendSelectedFeeAtom();

  return (
    <XStack alignItems="center" space="$1" {...rest} onPress={onPress}>
      <SizableText
        size="$bodyMdMedium"
        color={disabled ? '$textDisabled' : '$text'}
      >
        {intl.formatMessage({
          id: getFeeLabel({
            feeType: sendSelectedFee.feeType,
            presetIndex: sendSelectedFee.presetIndex,
          }),
        })}
      </SizableText>
      <Icon
        hoverStyle={{
          color: '$iconActive',
        }}
        name="ChevronGrabberVerOutline"
        size="$4"
        color={disabled ? '$iconDisabled' : '$iconSubdued'}
      />
    </XStack>
  );
}

export { FeeSelectorTrigger };
