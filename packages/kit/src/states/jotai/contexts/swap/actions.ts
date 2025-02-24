import { useRef } from 'react';

import BigNumber from 'bignumber.js';
import { debounce } from 'lodash';

import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import type { useSwapAddressInfo } from '@onekeyhq/kit/src/views/Swap/hooks/useSwapAccount';
import { moveNetworkToFirst } from '@onekeyhq/kit/src/views/Swap/utils/utils';
import type { IDBUtxoAccount } from '@onekeyhq/kit-bg/src/dbs/local/types';
import { inAppNotificationAtom } from '@onekeyhq/kit-bg/src/states/jotai/atoms';
import accountUtils from '@onekeyhq/shared/src/utils/accountUtils';
import { memoFn } from '@onekeyhq/shared/src/utils/cacheUtils';
import { numberFormat } from '@onekeyhq/shared/src/utils/numberUtils';
import {
  swapApprovingStateFetchInterval,
  swapQuoteFetchInterval,
  swapRateDifferenceMax,
  swapRateDifferenceMin,
  swapSlippageAutoValue,
  swapTokenCatchMapMaxCount,
} from '@onekeyhq/shared/types/swap/SwapProvider.constants';
import type {
  IFetchTokensParams,
  ISwapAlertState,
  ISwapToken,
} from '@onekeyhq/shared/types/swap/types';
import {
  ESwapAlertLevel,
  ESwapApproveTransactionStatus,
  ESwapDirectionType,
  ESwapFetchCancelCause,
  ESwapRateDifferenceUnit,
  ESwapSlippageSegmentKey,
  ESwapTxHistoryStatus,
} from '@onekeyhq/shared/types/swap/types';

import { ContextJotaiActionsBase } from '../../utils/ContextJotaiActionsBase';

import {
  contextAtomMethod,
  rateDifferenceAtom,
  swapAlertsAtom,
  swapApprovingTransactionAtom,
  swapBuildTxFetchingAtom,
  swapFromTokenAmountAtom,
  swapManualSelectQuoteProvidersAtom,
  swapNetworks,
  swapQuoteCurrentSelectAtom,
  swapQuoteFetchingAtom,
  swapQuoteListAtom,
  swapSelectFromTokenAtom,
  swapSelectToTokenAtom,
  swapSelectTokenDetailFetchingAtom,
  swapSelectedFromTokenBalanceAtom,
  swapSelectedToTokenBalanceAtom,
  swapSilenceQuoteLoading,
  swapSlippagePercentageAtom,
  swapTokenFetchingAtom,
  swapTokenMapAtom,
} from './atoms';

class ContentJotaiActionsSwap extends ContextJotaiActionsBase {
  private quoteInterval: ReturnType<typeof setTimeout> | undefined;

  private approvingInterval: ReturnType<typeof setTimeout> | undefined;

  syncNetworksSort = contextAtomMethod(async (get, set, netWorkId: string) => {
    const networks = get(swapNetworks());
    const sortNetworks = moveNetworkToFirst(networks, netWorkId);
    set(swapNetworks(), sortNetworks);
    await backgroundApiProxy.simpleDb.swapNetworksSort.setRawData({
      data: sortNetworks,
    });
  });

  resetSwapSlippage = contextAtomMethod((get, set) => {
    set(swapSlippagePercentageAtom(), {
      key: ESwapSlippageSegmentKey.AUTO,
      value: swapSlippageAutoValue,
    });
  });

  cleanManualSelectQuoteProviders = contextAtomMethod((get, set) => {
    set(swapManualSelectQuoteProvidersAtom(), undefined);
  });

  catchSwapTokensMap = contextAtomMethod(
    async (get, set, key: string, tokens: ISwapToken[]) => {
      const swapTokenMap = get(swapTokenMapAtom());
      const swapNetworksList = get(swapNetworks());
      const catchTokens = swapTokenMap.tokenCatch?.[key];
      const dateNow = Date.now();
      let catchCount = 0;
      const newTokens = tokens.map((token) => {
        const network = swapNetworksList.find(
          (n) => n.networkId === token.networkId,
        );
        if (network) {
          token.networkLogoURI = network.logoURI;
        }
        return token;
      });
      if (swapTokenMap.tokenCatch && catchTokens?.data) {
        // have catch
        if (JSON.stringify(catchTokens.data) !== JSON.stringify(newTokens)) {
          // catch data not equal
          const newTokenCatch = { ...swapTokenMap.tokenCatch };
          newTokenCatch[key] = {
            data: newTokens,
            updatedAt: dateNow,
          };
          swapTokenMap.tokenCatch = { ...newTokenCatch };
        }
        catchCount = Object.keys(swapTokenMap.tokenCatch).length;
      } else {
        // no catch
        swapTokenMap.tokenCatch = {
          ...(swapTokenMap.tokenCatch ?? {}),
          [key]: { data: newTokens, updatedAt: dateNow },
        };
        catchCount = Object.keys(swapTokenMap.tokenCatch).length;
      }
      if (swapTokenMap.tokenCatch && catchCount > swapTokenCatchMapMaxCount) {
        // clean old catch
        const oldUpdatedAtKey = Object.entries(swapTokenMap.tokenCatch).reduce(
          (min, [mapKey, obj]) =>
            obj.updatedAt < (swapTokenMap.tokenCatch?.[min]?.updatedAt ?? 0)
              ? mapKey
              : min,
          Object.keys(swapTokenMap.tokenCatch)[0],
        );
        if (oldUpdatedAtKey) {
          delete swapTokenMap.tokenCatch[oldUpdatedAtKey];
        }
      }
      set(swapTokenMapAtom(), { ...swapTokenMap, updatedAt: dateNow });
    },
  );

  selectFromToken = contextAtomMethod(async (get, set, token: ISwapToken) => {
    const fromToken = get(swapSelectFromTokenAtom());
    if (
      fromToken?.networkId !== token.networkId ||
      fromToken?.contractAddress !== token.contractAddress
    ) {
      this.cleanManualSelectQuoteProviders.call(set);
      this.resetSwapSlippage.call(set);
      await this.syncNetworksSort.call(set, token.networkId);
    }
    set(swapSelectFromTokenAtom(), token);
  });

  selectToToken = contextAtomMethod(async (get, set, token: ISwapToken) => {
    const toToken = get(swapSelectToTokenAtom());
    if (
      toToken?.networkId !== token.networkId ||
      toToken?.contractAddress !== token.contractAddress
    ) {
      this.cleanManualSelectQuoteProviders.call(set);
      this.resetSwapSlippage.call(set);
      await this.syncNetworksSort.call(set, token.networkId);
    }
    set(swapSelectToTokenAtom(), token);
  });

  alternationToken = contextAtomMethod((get, set) => {
    const fromToken = get(swapSelectFromTokenAtom());
    const toToken = get(swapSelectToTokenAtom());
    if (!fromToken && !toToken) {
      return;
    }
    set(swapSelectFromTokenAtom(), toToken);
    set(swapSelectToTokenAtom(), fromToken);
    this.resetSwapSlippage.call(set);
  });

  tokenListFetchAction = contextAtomMethod(
    async (get, set, params: IFetchTokensParams) => {
      try {
        set(swapTokenFetchingAtom(), true);
        const result = await backgroundApiProxy.serviceSwap.fetchSwapTokens({
          ...params,
        });
        if (result.length > 0) {
          await this.catchSwapTokensMap.call(
            set,
            JSON.stringify(params),
            result,
          );
        }
        set(swapTokenFetchingAtom(), false);
      } catch (e: any) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (e?.cause !== ESwapFetchCancelCause.SWAP_TOKENS_CANCEL) {
          set(swapTokenFetchingAtom(), false);
        }
      }
    },
  );

  runQuote = contextAtomMethod(
    async (
      get,
      set,
      fromToken: ISwapToken,
      toToken: ISwapToken,
      fromTokenAmount: string,
      slippagePercentage: number,
      address?: string,
      loadingDelayEnable?: boolean,
      blockNumber?: number,
    ) => {
      let enableInterval = true;
      try {
        if (!loadingDelayEnable) {
          set(swapQuoteFetchingAtom(), true);
        }
        const res = await backgroundApiProxy.serviceSwap.fetchQuotes({
          fromToken,
          toToken,
          fromTokenAmount,
          userAddress: address,
          slippagePercentage,
          blockNumber,
        });
        if (!loadingDelayEnable) {
          set(swapQuoteFetchingAtom(), false);
          set(swapQuoteListAtom(), res);
        } else {
          set(swapSilenceQuoteLoading(), true);
          setTimeout(() => {
            set(swapSilenceQuoteLoading(), false);
            set(swapQuoteListAtom(), res);
          }, 800);
        }
      } catch (e: any) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (e?.cause !== ESwapFetchCancelCause.SWAP_QUOTE_CANCEL) {
          set(swapQuoteFetchingAtom(), false);
        } else {
          enableInterval = false;
        }
      } finally {
        if (enableInterval) {
          void this.recoverQuoteInterval.call(set, address);
        }
      }
    },
  );

  quoteAction = contextAtomMethod(
    async (get, set, address?: string, blockNumber?: number) => {
      this.cleanQuoteInterval();
      set(swapBuildTxFetchingAtom(), false);
      const fromToken = get(swapSelectFromTokenAtom());
      const toToken = get(swapSelectToTokenAtom());
      const fromTokenAmount = get(swapFromTokenAmountAtom());
      const swapSlippage = get(swapSlippagePercentageAtom());
      const fromTokenAmountNumber = Number(fromTokenAmount);
      if (
        fromToken &&
        toToken &&
        !Number.isNaN(fromTokenAmountNumber) &&
        fromTokenAmountNumber > 0
      ) {
        void this.runQuote.call(
          set,
          fromToken,
          toToken,
          fromTokenAmount,
          swapSlippage.value,
          address,
          false,
          blockNumber,
        );
      } else {
        await backgroundApiProxy.serviceSwap.cancelFetchQuotes();
        set(swapQuoteFetchingAtom(), false);
        set(swapQuoteListAtom(), []);
      }
    },
  );

  approvingStateRunSync = contextAtomMethod(
    async (get, set, networkId: string, txId: string) => {
      let enableInterval = true;
      try {
        const txState = await backgroundApiProxy.serviceSwap.fetchTxState({
          txId,
          networkId,
        });

        if (
          txState.state === ESwapTxHistoryStatus.SUCCESS ||
          txState.state === ESwapTxHistoryStatus.FAILED
        ) {
          enableInterval = false;
          set(swapApprovingTransactionAtom(), (pre) => {
            if (!pre) return pre;
            if (txState.state === ESwapTxHistoryStatus.SUCCESS) {
              return {
                ...pre,
                blockNumber: txState.blockNumber,
                status: ESwapApproveTransactionStatus.SUCCESS,
              };
            }
            return {
              ...pre,
              txId: undefined,
              status: ESwapApproveTransactionStatus.FAILED,
            };
          });
          set(swapBuildTxFetchingAtom(), false);
        }
      } finally {
        if (enableInterval) {
          void this.approvingStateAction.call(set);
        }
      }
    },
  );

  approvingStateAction = contextAtomMethod(async (get, set) => {
    this.cleanApprovingInterval();
    const approvingTransaction = get(swapApprovingTransactionAtom());
    if (approvingTransaction && approvingTransaction.txId) {
      this.approvingInterval = setTimeout(() => {
        if (approvingTransaction.txId) {
          void this.approvingStateRunSync.call(
            set,
            approvingTransaction.fromToken.networkId,
            approvingTransaction.txId,
          );
        }
      }, swapApprovingStateFetchInterval);
    }
  });

  recoverQuoteInterval = contextAtomMethod(
    async (get, set, address?: string) => {
      this.cleanQuoteInterval();
      set(swapBuildTxFetchingAtom(), false);
      set(swapQuoteFetchingAtom(), false);
      set(swapApprovingTransactionAtom(), (pre) => {
        if (pre?.status === ESwapApproveTransactionStatus.PENDING) {
          return {
            ...pre,
            status: ESwapApproveTransactionStatus.CANCEL,
          };
        }
        return pre;
      });
      const fromToken = get(swapSelectFromTokenAtom());
      const toToken = get(swapSelectToTokenAtom());
      const fromTokenAmount = get(swapFromTokenAmountAtom());
      const swapSlippage = get(swapSlippagePercentageAtom());
      const fromTokenAmountNumber = Number(fromTokenAmount);
      if (
        fromToken &&
        toToken &&
        !Number.isNaN(fromTokenAmountNumber) &&
        fromTokenAmountNumber > 0
      ) {
        this.quoteInterval = setTimeout(() => {
          void this.runQuote.call(
            set,
            fromToken,
            toToken,
            fromTokenAmount,
            swapSlippage.value,
            address,
            true,
          );
        }, swapQuoteFetchInterval);
      }
    },
  );

  cleanQuoteInterval = () => {
    if (this.quoteInterval) {
      clearTimeout(this.quoteInterval);
      this.quoteInterval = undefined;
    }
  };

  cleanApprovingInterval = () => {
    if (this.approvingInterval) {
      clearTimeout(this.approvingInterval);
      this.approvingInterval = undefined;
    }
  };

  checkSwapWarning = contextAtomMethod(
    async (
      get,
      set,
      swapFromAddressInfo: ReturnType<typeof useSwapAddressInfo>,
      swapToAddressInfo: ReturnType<typeof useSwapAddressInfo>,
    ) => {
      const fromToken = get(swapSelectFromTokenAtom());
      const toToken = get(swapSelectToTokenAtom());
      const networks = get(swapNetworks());
      const quoteResult = get(swapQuoteCurrentSelectAtom());
      const fromTokenAmount = get(swapFromTokenAmountAtom());
      const swapSelectFromTokenBalance = get(
        swapSelectedFromTokenBalanceAtom(),
      );
      let alertsRes: ISwapAlertState[] = [];
      let rateDifferenceRes:
        | { value: string; unit: ESwapRateDifferenceUnit }
        | undefined;
      if (!networks.length || !swapFromAddressInfo.accountInfo?.ready) return;
      // check account
      if (!swapFromAddressInfo.accountInfo?.wallet) {
        alertsRes = [
          ...alertsRes,
          {
            message: 'No connected wallet.',
            alertLevel: ESwapAlertLevel.ERROR,
          },
        ];
        set(swapAlertsAtom(), alertsRes);
        return;
      }

      if (
        fromToken &&
        ((!swapFromAddressInfo.address &&
          !accountUtils.isHdWallet({
            walletId: swapFromAddressInfo.accountInfo?.wallet?.id,
          }) &&
          !accountUtils.isHwWallet({
            walletId: swapFromAddressInfo.accountInfo?.wallet?.id,
          })) ||
          swapFromAddressInfo.networkId !== fromToken.networkId)
      ) {
        alertsRes = [
          ...alertsRes,
          {
            message: `The connected wallet do not support ${
              networks.find((net) => net.networkId === fromToken?.networkId)
                ?.name ?? 'unknown'
            }. Try switch to another one.`,
            alertLevel: ESwapAlertLevel.ERROR,
          },
        ];
      }

      if (
        toToken &&
        ((!swapToAddressInfo.address &&
          !accountUtils.isHdWallet({
            walletId: swapToAddressInfo.accountInfo?.wallet?.id,
          }) &&
          !accountUtils.isHwWallet({
            walletId: swapToAddressInfo.accountInfo?.wallet?.id,
          })) ||
          swapToAddressInfo.networkId !== toToken.networkId)
      ) {
        alertsRes = [
          ...alertsRes,
          {
            message: `The connected wallet do not support ${
              networks.find((net) => net.networkId === toToken?.networkId)
                ?.name ?? 'unknown'
            }. Try switch to another one.`,
            alertLevel: ESwapAlertLevel.ERROR,
          },
        ];
      }

      if (
        fromToken &&
        accountUtils.isWatchingWallet({
          walletId: swapFromAddressInfo.accountInfo?.wallet?.id,
        })
      ) {
        alertsRes = [
          ...alertsRes,
          {
            message: `The connected wallet do not support swap. Try switch to another one.`,
            alertLevel: ESwapAlertLevel.ERROR,
          },
        ];
      }

      // if (
      //   fromToken &&
      //   !swapFromAddressInfo.address &&
      //   (accountUtils.isHdWallet({
      //     walletId: swapFromAddressInfo.accountInfo?.wallet?.id,
      //   }) ||
      //     accountUtils.isHwWallet({
      //       walletId: swapFromAddressInfo.accountInfo?.wallet?.id,
      //     }))
      // ) {
      //   alertsRes = [
      //     ...alertsRes,
      //     {
      //       message: `${
      //         swapFromAddressInfo.accountInfo?.wallet?.name ?? 'unknown'
      //       } - ${
      //         swapFromAddressInfo.accountInfo?.accountName ?? 'unknown'
      //       } lacks ${
      //         swapFromAddressInfo.accountInfo?.network?.name ?? 'unknown'
      //       } address. Please try to create one.`,
      //       alertLevel: ESwapAlertLevel.ERROR,
      //     },
      //   ];
      // }

      // if (
      //   toToken &&
      //   !swapToAddressInfo.address &&
      //   (accountUtils.isHdWallet({
      //     walletId: swapToAddressInfo.accountInfo?.wallet?.id,
      //   }) ||
      //     accountUtils.isHwWallet({
      //       walletId: swapToAddressInfo.accountInfo?.wallet?.id,
      //     })) &&
      //   swapFromAddressInfo.networkId !== swapToAddressInfo.networkId
      // ) {
      //   alertsRes = [
      //     ...alertsRes,
      //     {
      //       message: `${
      //         swapToAddressInfo.accountInfo?.wallet?.name ?? 'unknown'
      //       } - ${
      //         swapToAddressInfo.accountInfo?.accountName ?? 'unknown'
      //       } lacks ${
      //         swapToAddressInfo.accountInfo?.network?.name ?? 'unknown'
      //       } address. Please try to create one.`,
      //       alertLevel: ESwapAlertLevel.ERROR,
      //     },
      //   ];
      // }

      // provider toAmount check
      // if (quoteResult && !quoteResult?.toAmount && !quoteResult?.limit) {
      //   alertsRes = [
      //     ...alertsRes,
      //     {
      //       message: 'No provider supports this trade.',
      //       alertLevel: ESwapAlertLevel.ERROR,
      //     },
      //   ];
      // }

      // provider best check
      if (quoteResult?.toAmount && !quoteResult.isBest) {
        alertsRes = [
          ...alertsRes,
          {
            message:
              'The current provider does not offer the best rate for this trade.',
            alertLevel: ESwapAlertLevel.WARNING,
          },
        ];
      }

      // price check
      // if (
      //   (fromToken &&
      //     (!fromToken?.price || new BigNumber(fromToken.price).isZero())) ||
      //   (toToken && (!toToken?.price || new BigNumber(toToken.price).isZero()))
      // ) {
      //   alertsRes = [
      //     ...alertsRes,
      //     {
      //       message: `Failed to fetch ${
      //         !fromToken?.price
      //           ? fromToken?.name ?? fromToken?.symbol ?? 'unknown'
      //           : toToken?.name ?? toToken?.symbol ?? 'unknown'
      //       } price.You can still proceed with the trade.`,
      //       alertLevel: ESwapAlertLevel.WARNING,
      //     },
      //   ];
      // }

      // market rate check
      if (fromToken?.price && toToken?.price && quoteResult?.instantRate) {
        const fromTokenPrice = new BigNumber(fromToken.price);
        const toTokenPrice = new BigNumber(toToken.price);
        if (!fromTokenPrice.isZero() && !toTokenPrice.isZero()) {
          const marketingRate = fromTokenPrice.dividedBy(toTokenPrice);
          const quoteRateBN = new BigNumber(quoteResult.instantRate);
          const difference = quoteRateBN
            .dividedBy(marketingRate)
            .minus(1)
            .multipliedBy(100);
          if (difference.absoluteValue().gte(swapRateDifferenceMin)) {
            let unit = ESwapRateDifferenceUnit.POSITIVE;
            if (difference.isNegative()) {
              if (difference.lte(swapRateDifferenceMax)) {
                unit = ESwapRateDifferenceUnit.NEGATIVE;
              } else {
                unit = ESwapRateDifferenceUnit.DEFAULT;
              }
            }
            rateDifferenceRes = {
              value: `(${difference.isPositive() ? '+' : ''}${
                numberFormat(difference.toFixed(), {
                  formatter: 'priceChange',
                }) as string
              })`,
              unit,
            };
          }
          if (quoteRateBN.isZero()) {
            alertsRes = [
              ...alertsRes,
              {
                message: `100% value drop! High price impact may cause your asset loss.`,
                alertLevel: ESwapAlertLevel.WARNING,
              },
            ];
          } else if (difference.lt(swapRateDifferenceMax)) {
            alertsRes = [
              ...alertsRes,
              {
                message: `${
                  numberFormat(difference.absoluteValue().toFixed(), {
                    formatter: 'priceChange',
                  }) as string
                } value drop! High price impact may cause your asset loss.`,
                alertLevel: ESwapAlertLevel.WARNING,
              },
            ];
          }
        }
      }

      const fromTokenAmountBN = new BigNumber(fromTokenAmount);
      // check min max amount
      if (quoteResult && quoteResult.limit?.min) {
        const minAmountBN = new BigNumber(quoteResult.limit.min);
        if (fromTokenAmountBN.lt(minAmountBN)) {
          alertsRes = [
            ...alertsRes,
            {
              message: `The minimum amount for this swap is ${minAmountBN.toFixed()} ${
                fromToken?.symbol ?? 'unknown'
              }`,
              alertLevel: ESwapAlertLevel.ERROR,
              inputShowError: true,
            },
          ];
        }
      }
      if (quoteResult && quoteResult.limit?.max) {
        const maxAmountBN = new BigNumber(quoteResult.limit.max);
        if (fromTokenAmountBN.gt(maxAmountBN)) {
          alertsRes = [
            ...alertsRes,
            {
              message: `The maximum amount for this swap is ${maxAmountBN.toFixed()} ${
                fromToken?.symbol ?? 'unknown'
              }`,
              alertLevel: ESwapAlertLevel.ERROR,
              inputShowError: true,
            },
          ];
        }
      }

      const fromTokenPriceBN = new BigNumber(fromToken?.price ?? 0);
      const tokenFiatValueBN = fromTokenAmountBN.multipliedBy(fromTokenPriceBN);

      const gasFeeBN = new BigNumber(
        quoteResult?.fee?.estimatedFeeFiatValue ?? 0,
      );
      if (
        !(tokenFiatValueBN.isNaN() || tokenFiatValueBN.isZero()) &&
        gasFeeBN.gt(tokenFiatValueBN)
      ) {
        alertsRes = [
          ...alertsRes,
          {
            message:
              'Est Network fee exceeds swap amount, proceed with caution.',
            alertLevel: ESwapAlertLevel.WARNING,
          },
        ];
      }

      if (
        fromToken?.isNative &&
        fromTokenAmountBN.isEqualTo(
          new BigNumber(swapSelectFromTokenBalance ?? 0),
        )
      ) {
        alertsRes = [
          ...alertsRes,
          {
            message: `Network fee in ${fromToken.symbol} deducted automatically in the next step.`,
            alertLevel: ESwapAlertLevel.INFO,
          },
        ];
      }
      set(swapAlertsAtom(), alertsRes);
      set(rateDifferenceAtom(), rateDifferenceRes);
    },
  );

  loadSwapSelectTokenDetail = contextAtomMethod(
    async (
      get,
      set,
      type: ESwapDirectionType,
      swapAddressInfo: ReturnType<typeof useSwapAddressInfo>,
    ) => {
      const { swapHistoryPendingList } = await inAppNotificationAtom.get();
      const token =
        type === ESwapDirectionType.FROM
          ? get(swapSelectFromTokenAtom())
          : get(swapSelectToTokenAtom());
      const accountAddress = swapAddressInfo.address;
      const accountNetworkId = swapAddressInfo.networkId;
      const accountXpub = (
        swapAddressInfo.accountInfo?.account as IDBUtxoAccount
      )?.xpub;
      if (accountNetworkId !== token?.networkId) return;
      let balanceDisplay;
      if (token && accountAddress && accountNetworkId) {
        if (
          token.accountAddress === accountAddress &&
          accountNetworkId === token.networkId &&
          token.balanceParsed &&
          (!swapHistoryPendingList.length ||
            swapHistoryPendingList.every(
              (item) => item.status !== ESwapTxHistoryStatus.SUCCESS,
            ))
        ) {
          const balanceParsedBN = new BigNumber(token.balanceParsed ?? 0);
          balanceDisplay = balanceParsedBN.isNaN()
            ? '0.0'
            : balanceParsedBN.toFixed();
        } else {
          try {
            set(swapSelectTokenDetailFetchingAtom(), (pre) => ({
              ...pre,
              [type]: true,
            }));
            const detailInfo =
              await backgroundApiProxy.serviceSwap.fetchSwapTokenDetails({
                networkId: token.networkId,
                accountAddress,
                xpub: accountXpub,
                contractAddress: token.contractAddress,
              });
            if (detailInfo?.[0]) {
              const balanceParsedBN = new BigNumber(
                detailInfo[0].balanceParsed ?? 0,
              );
              balanceDisplay = balanceParsedBN.isNaN()
                ? '0.0'
                : balanceParsedBN.toFixed();
              if (
                detailInfo[0].price &&
                detailInfo[0].fiatValue &&
                detailInfo[0].balanceParsed
              ) {
                if (type === ESwapDirectionType.FROM) {
                  set(swapSelectFromTokenAtom(), (pre) => {
                    if (pre) {
                      return {
                        ...pre,
                        price: detailInfo[0].price,
                        fiatValue: detailInfo[0].fiatValue,
                        balanceParsed: detailInfo[0].balanceParsed,
                        accountAddress,
                      };
                    }
                  });
                } else {
                  set(swapSelectToTokenAtom(), (pre) => {
                    if (pre) {
                      return {
                        ...pre,
                        price: detailInfo[0].price,
                        fiatValue: detailInfo[0].fiatValue,
                        balanceParsed: detailInfo[0].balanceParsed,
                        accountAddress,
                      };
                    }
                  });
                }
              }
            }
          } catch (e) {
            balanceDisplay = '0.0';
          } finally {
            set(swapSelectTokenDetailFetchingAtom(), (pre) => ({
              ...pre,
              [type]: false,
            }));
          }
        }
      }
      if (type === ESwapDirectionType.FROM) {
        set(swapSelectedFromTokenBalanceAtom(), balanceDisplay ?? '0.0');
      } else {
        set(swapSelectedToTokenBalanceAtom(), balanceDisplay ?? '0.0');
      }
    },
  );
}

const createActions = memoFn(() => new ContentJotaiActionsSwap());

export const useSwapActions = () => {
  const actions = createActions();
  const selectFromToken = actions.selectFromToken.use();
  const selectToToken = actions.selectToToken.use();
  const alternationToken = actions.alternationToken.use();
  const syncNetworksSort = actions.syncNetworksSort.use();
  const catchSwapTokensMap = actions.catchSwapTokensMap.use();
  const recoverQuoteInterval = actions.recoverQuoteInterval.use();
  const quoteAction = debounce(actions.quoteAction.use(), 100);
  const approvingStateAction = actions.approvingStateAction.use();
  const checkSwapWarning = debounce(actions.checkSwapWarning.use(), 200);
  const tokenListFetchAction = actions.tokenListFetchAction.use();

  const loadSwapSelectTokenDetail = debounce(
    actions.loadSwapSelectTokenDetail.use(),
    200,
  );
  const { cleanQuoteInterval, cleanApprovingInterval } = actions;

  return useRef({
    selectFromToken,
    quoteAction,
    selectToToken,
    alternationToken,
    syncNetworksSort,
    catchSwapTokensMap,
    cleanQuoteInterval,
    cleanApprovingInterval,
    approvingStateAction,
    tokenListFetchAction,
    recoverQuoteInterval,
    checkSwapWarning,
    loadSwapSelectTokenDetail,
  });
};
