/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { memo, useCallback, useMemo, useState } from 'react';

import { useRoute } from '@react-navigation/core';
import BigNumber from 'bignumber.js';
import { isNaN, isNil } from 'lodash';
import { useIntl } from 'react-intl';

import { Form, Input, Page, SizableText, useForm } from '@onekeyhq/components';
import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import { AccountSelectorProviderMirror } from '@onekeyhq/kit/src/components/AccountSelector';
import {
  AddressInput,
  type IAddressInputValue,
} from '@onekeyhq/kit/src/components/AddressInput';
import { AmountInput } from '@onekeyhq/kit/src/components/AmountInput';
import { ListItem } from '@onekeyhq/kit/src/components/ListItem';
import { useAccountData } from '@onekeyhq/kit/src/hooks/useAccountData';
import useAppNavigation from '@onekeyhq/kit/src/hooks/useAppNavigation';
import { usePromiseResult } from '@onekeyhq/kit/src/hooks/usePromiseResult';
import { useSendConfirm } from '@onekeyhq/kit/src/hooks/useSendConfirm';
import {
  useAllTokenListAtom,
  useAllTokenListMapAtom,
} from '@onekeyhq/kit/src/states/jotai/contexts/tokenList';
import { getFormattedNumber } from '@onekeyhq/kit/src/utils/format';
import { useSettingsPersistAtom } from '@onekeyhq/kit-bg/src/states/jotai/atoms';
import type { ITransferInfo } from '@onekeyhq/kit-bg/src/vaults/types';
import { OneKeyError, OneKeyInternalError } from '@onekeyhq/shared/src/errors';
import type {
  EModalSendRoutes,
  IModalSendParamList,
} from '@onekeyhq/shared/src/routes';
import {
  EAssetSelectorRoutes,
  EModalRoutes,
} from '@onekeyhq/shared/src/routes';
import { EAccountSelectorSceneName } from '@onekeyhq/shared/types';
import type { IAccountNFT } from '@onekeyhq/shared/types/nft';
import { ENFTType } from '@onekeyhq/shared/types/nft';
import type { IToken, ITokenFiat } from '@onekeyhq/shared/types/token';

import { HomeTokenListProviderMirror } from '../../../Home/components/HomeTokenListProvider/HomeTokenListProviderMirror';

import type { RouteProp } from '@react-navigation/core';

function SendDataInputContainer() {
  const intl = useIntl();

  const [isUseFiat, setIsUseFiat] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settings] = useSettingsPersistAtom();
  const navigation = useAppNavigation();

  const [allTokens] = useAllTokenListAtom();
  const [map] = useAllTokenListMapAtom();

  const route =
    useRoute<RouteProp<IModalSendParamList, EModalSendRoutes.SendDataInput>>();

  const { serviceNFT, serviceToken } = backgroundApiProxy;

  const {
    networkId,
    accountId,
    isNFT,
    token,
    nfts,
    address,
    amount: sendAmount = '',
  } = route.params;
  const nft = nfts?.[0];
  const [tokenInfo, setTokenInfo] = useState(token);
  const { account, network } = useAccountData({ accountId, networkId });
  const sendConfirm = useSendConfirm({ accountId, networkId });

  const {
    result: [tokenDetails, nftDetails, vaultSettings] = [],
    isLoading: isLoadingAssets,
  } = usePromiseResult(
    async () => {
      if (!account || !network) return;
      if (!token && !nft) {
        throw new OneKeyInternalError('token and nft info are both missing.');
      }

      let nftResp: IAccountNFT[] | undefined;
      let tokenResp:
        | ({
            info: IToken;
          } & ITokenFiat)[]
        | undefined;

      const accountAddress =
        await backgroundApiProxy.serviceAccount.getAccountAddressForApi({
          accountId,
          networkId,
        });
      if (isNFT && nft) {
        nftResp = await serviceNFT.fetchNFTDetails({
          networkId,
          accountAddress,
          nfts: [
            {
              collectionAddress: nft.collectionAddress,
              itemId: nft.itemId,
            },
          ],
        });
      } else if (!isNFT && tokenInfo) {
        tokenResp = await serviceToken.fetchTokensDetails({
          networkId,
          accountAddress,
          xpub: await backgroundApiProxy.serviceAccount.getAccountXpub({
            accountId,
            networkId,
          }),
          contractList: [tokenInfo.address],
        });
      }

      const vs = await backgroundApiProxy.serviceNetwork.getVaultSettings({
        networkId,
      });

      return [tokenResp?.[0], nftResp?.[0], vs];
    },
    [
      account,
      accountId,
      isNFT,
      network,
      networkId,
      nft,
      serviceNFT,
      serviceToken,
      token,
      tokenInfo,
    ],
    { watchLoading: true, alwaysSetState: true },
  );

  if (tokenDetails && isNil(tokenDetails?.balanceParsed)) {
    tokenDetails.balanceParsed = new BigNumber(tokenDetails.balance)
      .shiftedBy(tokenDetails.info.decimals * -1)
      .toFixed();
  }
  const currencySymbol = settings.currencyInfo.symbol;
  const tokenSymbol = tokenDetails?.info.symbol ?? '';

  const form = useForm({
    defaultValues: {
      to: { raw: address } as IAddressInputValue,
      amount: sendAmount,
      nftAmount: '',
    },
    mode: 'onChange',
    reValidateMode: 'onBlur',
  });

  // token amount or fiat amount
  const amount = form.watch('amount');
  const toPending = form.watch('to.pending');
  const toResolved = form.watch('to.resolved');

  const linkedAmount = useMemo(() => {
    const amountBN = new BigNumber(amount ?? 0);

    const tokenPrice = tokenDetails?.price;

    if (isNil(tokenPrice))
      return {
        amount: '0',
        originalAmount: '0',
      };

    if (isUseFiat) {
      const originalAmount = amountBN.dividedBy(tokenPrice).toFixed();
      return {
        amount: getFormattedNumber(originalAmount, { decimal: 4 }) ?? '0',
        originalAmount,
      };
    }

    const originalAmount = amountBN.times(tokenPrice).toFixed();
    return {
      originalAmount,
      amount: getFormattedNumber(originalAmount, { decimal: 4 }) ?? '0',
    };
  }, [amount, isUseFiat, tokenDetails?.price]);

  const {
    result: { displayAmountFormItem } = { displayAmountFormItem: false },
  } = usePromiseResult(async () => {
    const vs = await backgroundApiProxy.serviceNetwork.getVaultSettings({
      networkId,
    });
    if (!vs?.hideAmountInputOnFirstEntry) {
      return {
        displayAmountFormItem: true,
      };
    }
    if (toResolved) {
      const toRaw = form.getValues('to').raw;
      const validation =
        await backgroundApiProxy.serviceValidator.validateAmountInputShown({
          networkId,
          toAddress: toRaw ?? '',
        });
      return {
        displayAmountFormItem: validation.isValid,
      };
    }
    return {
      displayAmountFormItem: false,
    };
  }, [toResolved, networkId, form]);

  const handleOnChangeAmountMode = useCallback(() => {
    setIsUseFiat((prev) => !prev);

    form.setValue('amount', linkedAmount.originalAmount);
  }, [form, linkedAmount]);
  const handleOnSelectToken = useCallback(
    () =>
      navigation.pushModal(EModalRoutes.AssetSelectorModal, {
        screen: EAssetSelectorRoutes.TokenSelector,
        params: {
          networkId,
          accountId,
          tokens: {
            data: allTokens.tokens,
            keys: allTokens.keys,
            map,
          },
          onSelect: (data: IToken) => {
            setTokenInfo(data);
          },
        },
      }),
    [accountId, allTokens.keys, allTokens.tokens, map, navigation, networkId],
  );
  const handleOnConfirm = useCallback(async () => {
    try {
      if (!account) return;
      const toAddress = form.getValues('to').resolved;
      if (!toAddress) return;

      setIsSubmitting(true);

      let realAmount = amount;

      if (isUseFiat) {
        if (new BigNumber(amount).isGreaterThan(tokenDetails?.fiatValue ?? 0)) {
          realAmount = tokenDetails?.balanceParsed ?? '0';
        } else {
          realAmount = linkedAmount.originalAmount;
        }
      }

      const transfersInfo: ITransferInfo[] = [
        {
          from: account.address,
          to: toAddress,
          amount: realAmount,
          nftInfo:
            isNFT && nftDetails
              ? {
                  nftId: nftDetails.itemId,
                  nftAddress: nftDetails.collectionAddress,
                  nftType: nftDetails.collectionType,
                }
              : undefined,
          tokenInfo: !isNFT && tokenDetails ? tokenDetails.info : undefined,
        },
      ];
      await sendConfirm.navigationToSendConfirm({
        transfersInfo,
        sameModal: true,
      });
      setIsSubmitting(false);
    } catch (e: any) {
      setIsSubmitting(false);

      throw new OneKeyError({
        info: e.message ?? e,
        autoToast: true,
      });
    }
  }, [
    account,
    amount,
    form,
    isNFT,
    isUseFiat,
    linkedAmount,
    nftDetails,
    sendConfirm,
    tokenDetails,
  ]);
  const handleValidateTokenAmount = useCallback(
    (value: string) => {
      const amountBN = new BigNumber(value ?? 0);
      let isInsufficientBalance = false;
      let isLessThanMinTransferAmount = false;
      if (isUseFiat) {
        if (amountBN.isGreaterThan(tokenDetails?.fiatValue ?? 0)) {
          isInsufficientBalance = true;
        }

        if (
          tokenDetails?.price &&
          amountBN
            .dividedBy(tokenDetails.price)
            .isLessThan(vaultSettings?.minTransferAmount ?? 0)
        ) {
          isLessThanMinTransferAmount = true;
        }
      } else {
        if (amountBN.isGreaterThan(tokenDetails?.balanceParsed ?? 0)) {
          isInsufficientBalance = true;
        }

        if (amountBN.isLessThan(vaultSettings?.minTransferAmount ?? 0)) {
          isLessThanMinTransferAmount = true;
        }
      }

      if (isInsufficientBalance)
        return intl.formatMessage({ id: 'msg__insufficient_balance' });

      if (isLessThanMinTransferAmount)
        return `The minimum sent amount is ${
          vaultSettings?.minTransferAmount ?? '0'
        } ${tokenSymbol}`;

      return true;
    },
    [
      intl,
      isUseFiat,
      tokenDetails?.balanceParsed,
      tokenDetails?.fiatValue,
      tokenDetails?.price,
      tokenSymbol,
      vaultSettings?.minTransferAmount,
    ],
  );

  const isSubmitDisabled = useMemo(() => {
    if (isLoadingAssets || isSubmitting || toPending) return true;

    if (!form.formState.isValid) {
      return true;
    }

    if (
      (!isNFT || nft?.collectionType === ENFTType.ERC1155) &&
      !amount &&
      displayAmountFormItem
    ) {
      return true;
    }
  }, [
    amount,
    form.formState.isValid,
    isLoadingAssets,
    isNFT,
    isSubmitting,
    nft?.collectionType,
    toPending,
    displayAmountFormItem,
  ]);

  const maxAmount = useMemo(
    () =>
      isUseFiat
        ? tokenDetails?.fiatValue ?? '0'
        : tokenDetails?.balanceParsed ?? '0',
    [isUseFiat, tokenDetails?.balanceParsed, tokenDetails?.fiatValue],
  );

  const amountInputDescription = useMemo(() => {
    if (isNil(vaultSettings?.minTransferAmount)) return '';

    if (form.formState.errors.amount) return '';

    return `The minimum sent amount is ${vaultSettings?.minTransferAmount} ${tokenSymbol}`;
  }, [
    form.formState.errors.amount,
    tokenSymbol,
    vaultSettings?.minTransferAmount,
  ]);

  const renderTokenDataInputForm = useCallback(
    () => (
      <Form.Field
        name="amount"
        description={amountInputDescription}
        label={intl.formatMessage({ id: 'form__amount' })}
        rules={{
          required: true,
          validate: handleValidateTokenAmount,
          onChange: (e: { target: { name: string; value: string } }) => {
            const value = e.target?.value;
            const valueBN = new BigNumber(value ?? 0);
            if (valueBN.isNaN()) {
              const formattedValue = parseFloat(value);
              form.setValue(
                'amount',
                isNaN(formattedValue) ? '' : String(formattedValue),
              );
              return;
            }
            const dp = valueBN.decimalPlaces();
            if (!isUseFiat && dp && dp > (tokenDetails?.info.decimals ?? 0)) {
              form.setValue(
                'amount',
                valueBN.toFixed(tokenDetails?.info.decimals ?? 0),
              );
            }
          },
        }}
      >
        <AmountInput
          reversible
          enableMaxAmount
          balanceProps={{
            loading: isLoadingAssets,
            value: maxAmount,
            onPress: () => {
              form.setValue('amount', maxAmount);
              void form.trigger('amount');
            },
          }}
          valueProps={{
            value: isUseFiat
              ? `${linkedAmount.amount} ${tokenSymbol}`
              : `${currencySymbol}${linkedAmount.amount}`,
            onPress: handleOnChangeAmountMode,
          }}
          tokenSelectorTriggerProps={{
            selectedTokenImageUri: isNFT
              ? nft?.metadata?.image
              : tokenInfo?.logoURI,
            selectedNetworkImageUri: network?.logoURI,
            selectedTokenSymbol: isNFT
              ? nft?.metadata?.name
              : tokenInfo?.symbol,
            onPress: isNFT ? undefined : handleOnSelectToken,
          }}
        />
      </Form.Field>
    ),
    [
      amountInputDescription,
      currencySymbol,
      form,
      handleOnChangeAmountMode,
      handleOnSelectToken,
      handleValidateTokenAmount,
      intl,
      isLoadingAssets,
      isNFT,
      isUseFiat,
      linkedAmount.amount,
      maxAmount,
      network?.logoURI,
      nft?.metadata?.image,
      nft?.metadata?.name,
      tokenDetails?.info.decimals,
      tokenInfo?.logoURI,
      tokenInfo?.symbol,
      tokenSymbol,
    ],
  );
  const renderNFTDataInputForm = useCallback(() => {
    if (nft?.collectionType === ENFTType.ERC1155) {
      return (
        <Form.Field
          name="nftAmount"
          label={intl.formatMessage({ id: 'form__amount' })}
          rules={{ required: true }}
        >
          <SizableText
            size="$bodyMd"
            color="$textSubdued"
            position="absolute"
            right="$0"
            top="$0"
          >
            Available: 9999
          </SizableText>
          <Input
            size="large"
            addOns={[
              {
                label: intl.formatMessage({ id: 'action__max' }),
                onPress: () => console.log('clicked'),
              },
            ]}
          />
        </Form.Field>
      );
    }
    return null;
  }, [intl, nft?.collectionType]);

  const renderDataInput = useCallback(() => {
    if (isNFT) {
      return renderNFTDataInputForm();
    }
    if (displayAmountFormItem) {
      return renderTokenDataInputForm();
    }
    return null;
  }, [
    displayAmountFormItem,
    isNFT,
    renderNFTDataInputForm,
    renderTokenDataInputForm,
  ]);

  return (
    <Page scrollEnabled>
      <Page.Header title="Send" />
      <Page.Body px="$5">
        <AccountSelectorProviderMirror
          config={{
            sceneName: EAccountSelectorSceneName.addressInput, // can replace with other sceneName
            sceneUrl: '',
          }}
          enabledNum={[0]}
          availableNetworksMap={{
            0: { networkIds: [networkId], defaultNetworkId: networkId },
          }}
        >
          <Form form={form}>
            {isNFT && nft?.collectionType !== ENFTType.ERC1155 ? (
              <Form.Field
                label={intl.formatMessage({ id: 'form__token' })}
                name="token"
              >
                <ListItem
                  avatarProps={{
                    src: nft?.metadata?.image,
                    borderRadius: '$full',
                    cornerImageProps: {
                      src: network?.logoURI,
                    },
                  }}
                  mx="$0"
                  borderWidth={1}
                  borderColor="$border"
                  borderRadius="$2"
                >
                  <ListItem.Text
                    flex={1}
                    primary={nft?.metadata?.name}
                    secondary={
                      <SizableText size="$bodyMd" color="$textSubdued">
                        {tokenInfo?.name}
                      </SizableText>
                    }
                  />
                </ListItem>
              </Form.Field>
            ) : null}
            <Form.Field
              label={intl.formatMessage({ id: 'content__to' })}
              name="to"
              rules={{
                required: true,
                validate: (value: IAddressInputValue) => {
                  if (value.pending) {
                    return;
                  }
                  if (!value.resolved) {
                    return (
                      value.validateError?.message ??
                      intl.formatMessage({ id: 'form__address_invalid' })
                    );
                  }
                },
              }}
            >
              <AddressInput
                accountId={accountId}
                networkId={networkId}
                enableAddressBook
                enableWalletName
                enableVerifySendFundToSelf
                enableAddressInteractionStatus
                contacts
                accountSelector={{ num: 0 }}
              />
            </Form.Field>
            {renderDataInput()}
          </Form>
        </AccountSelectorProviderMirror>
      </Page.Body>
      <Page.Footer
        onConfirm={handleOnConfirm}
        onConfirmText={intl.formatMessage({ id: 'action__next' })}
        confirmButtonProps={{
          disabled: isSubmitDisabled,
          loading: isSubmitting,
        }}
      />
    </Page>
  );
}

const SendDataInputContainerWithProvider = memo(() => (
  <HomeTokenListProviderMirror>
    <SendDataInputContainer />
  </HomeTokenListProviderMirror>
));
SendDataInputContainerWithProvider.displayName =
  'SendDataInputContainerWithProvider';

export { SendDataInputContainer, SendDataInputContainerWithProvider };
