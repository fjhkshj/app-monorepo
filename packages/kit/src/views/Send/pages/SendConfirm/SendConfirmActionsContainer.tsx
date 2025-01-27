import { memo, useCallback, useMemo, useState } from 'react';

import { useIntl } from 'react-intl';

import { Page, Toast } from '@onekeyhq/components';
import type { IPageNavigationProp } from '@onekeyhq/components';
import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import useAppNavigation from '@onekeyhq/kit/src/hooks/useAppNavigation';
import useDappApproveAction from '@onekeyhq/kit/src/hooks/useDappApproveAction';
import { usePromiseResult } from '@onekeyhq/kit/src/hooks/usePromiseResult';
import {
  useNativeTokenInfoAtom,
  useNativeTokenTransferAmountToUpdateAtom,
  useSendFeeStatusAtom,
  useSendSelectedFeeInfoAtom,
  useSendTxStatusAtom,
  useUnsignedTxsAtom,
} from '@onekeyhq/kit/src/states/jotai/contexts/sendConfirm';
import type { IModalSendParamList } from '@onekeyhq/shared/src/routes';
import type { IDappSourceInfo } from '@onekeyhq/shared/types';
import type { ISendTxOnSuccessData } from '@onekeyhq/shared/types/tx';

type IProps = {
  accountId: string;
  networkId: string;
  onSuccess?: (data: ISendTxOnSuccessData[]) => void;
  onFail?: (error: Error) => void;
  onCancel?: () => void;
  tableLayout?: boolean;
  sourceInfo?: IDappSourceInfo;
  signOnly?: boolean;
};

function SendConfirmActionsContainer(props: IProps) {
  const {
    accountId,
    networkId,
    onSuccess,
    onFail,
    onCancel,
    tableLayout,
    sourceInfo,
    signOnly,
  } = props;
  const intl = useIntl();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigation =
    useAppNavigation<IPageNavigationProp<IModalSendParamList>>();
  const [sendSelectedFeeInfo] = useSendSelectedFeeInfoAtom();
  const [sendFeeStatus] = useSendFeeStatusAtom();
  const [sendTxStatus] = useSendTxStatusAtom();
  const [unsignedTxs] = useUnsignedTxsAtom();
  const [nativeTokenInfo] = useNativeTokenInfoAtom();
  const [nativeTokenTransferAmountToUpdate] =
    useNativeTokenTransferAmountToUpdateAtom();

  const dappApprove = useDappApproveAction({
    id: sourceInfo?.id ?? '',
    closeWindowAfterResolved: true,
  });

  const vaultSettings = usePromiseResult(
    () => backgroundApiProxy.serviceNetwork.getVaultSettings({ networkId }),
    [networkId],
  ).result;
  const handleOnConfirm = useCallback(async () => {
    setIsSubmitting(true);

    try {
      const result =
        await backgroundApiProxy.serviceSend.batchSignAndSendTransaction({
          accountId,
          networkId,
          unsignedTxs,
          feeInfo: sendSelectedFeeInfo,
          nativeAmountInfo: nativeTokenTransferAmountToUpdate.isMaxSend
            ? {
                maxSendAmount: nativeTokenTransferAmountToUpdate.amountToUpdate,
              }
            : undefined,
          signOnly,
          sourceInfo,
        });
      onSuccess?.(result);
      setIsSubmitting(false);
      Toast.success({
        title: intl.formatMessage({ id: 'msg__transaction_submitted' }),
      });

      const signedTx = result[0].signedTx;

      if (signOnly) {
        if (vaultSettings?.signOnlyFullTxRequired) {
          void dappApprove.resolve({ result: signedTx });
        } else {
          void dappApprove.resolve({ result: signedTx.rawTx });
        }
      } else {
        void dappApprove.resolve({ result: signedTx.txid });
      }

      navigation.popStack();
    } catch (e: any) {
      setIsSubmitting(false);
      // show toast by @toastIfError() in background method
      // Toast.error({
      //   title: (e as Error).message,
      // });
      onFail?.(e as Error);
      void dappApprove.reject(e);
      throw e;
    }
  }, [
    accountId,
    dappApprove,
    intl,
    nativeTokenTransferAmountToUpdate.amountToUpdate,
    nativeTokenTransferAmountToUpdate.isMaxSend,
    navigation,
    networkId,
    onFail,
    onSuccess,
    sendSelectedFeeInfo,
    signOnly,
    unsignedTxs,
    sourceInfo,
    vaultSettings?.signOnlyFullTxRequired,
  ]);

  const handleOnCancel = useCallback(
    (close: () => void, closePageStack: () => void) => {
      dappApprove.reject();
      if (!sourceInfo) {
        closePageStack();
      } else {
        close();
      }
      onCancel?.();
    },
    [dappApprove, onCancel, sourceInfo],
  );

  const isSubmitDisabled = useMemo(() => {
    if (isSubmitting) return true;
    if (nativeTokenInfo.isLoading || sendTxStatus.isInsufficientNativeBalance)
      return true;

    if (!sendSelectedFeeInfo || sendFeeStatus.errMessage) return true;
  }, [
    sendFeeStatus.errMessage,
    isSubmitting,
    nativeTokenInfo.isLoading,
    sendTxStatus.isInsufficientNativeBalance,
    sendSelectedFeeInfo,
  ]);

  if (tableLayout) {
    return (
      <Page.FooterActions
        confirmButtonProps={{
          size: 'medium',
          flex: 0,
          disabled: isSubmitDisabled,
          loading: isSubmitting,
        }}
        cancelButtonProps={{
          size: 'medium',
          flex: 0,
          disabled: isSubmitting,
        }}
        onConfirmText={signOnly ? 'Sign' : 'Sign and Broadcast'}
        onConfirm={handleOnConfirm}
        onCancel={handleOnCancel}
      />
    );
  }

  return (
    <Page.Footer
      confirmButtonProps={{
        disabled: isSubmitDisabled,
        loading: isSubmitting,
      }}
      cancelButtonProps={{
        disabled: isSubmitting,
      }}
      onConfirmText={signOnly ? 'Sign' : 'Sign and Broadcast'}
      onConfirm={handleOnConfirm}
      onCancel={handleOnCancel}
    />
  );
}

export default memo(SendConfirmActionsContainer);
