import type { ReactElement } from 'react';
import { useCallback } from 'react';

import { SizableText, styled } from 'tamagui';

import { XStack, YStack } from '../../primitives';

import type { GetProps } from 'tamagui';

export interface ISegmentControlProps {
  fullWidth?: boolean;
  value: string | number;
  options: {
    label: string | ReactElement;
    value: string | number;
  }[];
  onChange: (value: string | number) => void;
}

function SegmentControlItem({
  label,
  value,
  onChange,
  active,
  disabled,
  ...rest
}: {
  label: string | ReactElement;
  value: string | number;
  active: boolean;
  disabled?: boolean;
  onChange: (value: string | number) => void;
} & GetProps<typeof YStack>) {
  const handleChange = useCallback(() => {
    onChange(value);
  }, [onChange, value]);
  return (
    <YStack
      py="$1"
      px="$2"
      flex={1}
      onPress={handleChange}
      borderRadius="$2"
      userSelect="none"
      focusable={!disabled}
      focusStyle={{
        outlineWidth: 2,
        outlineColor: '$focusRing',
        outlineStyle: 'solid',
      }}
      {...(active
        ? {
            bg: '$bg',
            elevation: 2,
          }
        : {
            hoverStyle: {
              bg: '$bgHover',
            },
            pressStyle: {
              bg: '$bgActive',
            },
          })}
      {...(disabled && {
        opacity: 0.5,
      })}
      {...rest}
    >
      {typeof label === 'string' ? (
        <SizableText
          size="$bodyMdMedium"
          textAlign="center"
          color={active ? '$text' : '$textSubdued'}
        >
          {label}
        </SizableText>
      ) : (
        label
      )}
    </YStack>
  );
}

function SegmentControlFrame({
  value,
  options,
  onChange,
  fullWidth,
}: ISegmentControlProps) {
  const handleChange = useCallback(
    (v: string | number) => {
      onChange(v);
    },
    [onChange],
  );
  return (
    <XStack
      width={fullWidth ? '100%' : 'auto'}
      alignSelf={fullWidth ? undefined : 'flex-start'}
      backgroundColor="$neutral5"
      borderRadius="$2.5"
      p="$0.5"
    >
      {options.map(({ label, value: v }, index) => (
        <SegmentControlItem
          key={index}
          label={label}
          value={v}
          active={value === v}
          onChange={handleChange}
          {...(index !== 0 && {
            ml: '$0.5',
          })}
        />
      ))}
    </XStack>
  );
}

export const SegmentControl = styled(
  SegmentControlFrame,
  {} as ISegmentControlProps,
);
