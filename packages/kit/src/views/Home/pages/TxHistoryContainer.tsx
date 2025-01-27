import { memo, useCallback, useEffect, useState } from 'react';

import { useMedia, useTabIsRefreshingFocused } from '@onekeyhq/components';
import type { ITabPageProps } from '@onekeyhq/components';
import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import {
  POLLING_DEBOUNCE_INTERVAL,
  POLLING_INTERVAL_FOR_HISTORY,
} from '@onekeyhq/shared/src/consts/walletConsts';
import {
  EModalAssetDetailRoutes,
  EModalRoutes,
} from '@onekeyhq/shared/src/routes';
import type { IAccountHistoryTx } from '@onekeyhq/shared/types/history';

import { TxHistoryListView } from '../../../components/TxHistoryListView';
import useAppNavigation from '../../../hooks/useAppNavigation';
import { usePromiseResult } from '../../../hooks/usePromiseResult';
import { useActiveAccount } from '../../../states/jotai/contexts/accountSelector';
import {
  useHistoryListActions,
  withHistoryListProvider,
} from '../../../states/jotai/contexts/historyList';

function TxHistoryListContainer(props: ITabPageProps) {
  const { onContentSizeChange } = props;
  const { isFocused } = useTabIsRefreshingFocused();

  const { updateSearchKey } = useHistoryListActions().current;

  const [historyState, setHistoryState] = useState({
    initialized: false,
    isRefreshing: false,
  });
  const media = useMedia();
  const navigation = useAppNavigation();
  const {
    activeAccount: { account, network, wallet },
  } = useActiveAccount({ num: 0 });

  const handleHistoryItemPress = useCallback(
    (history: IAccountHistoryTx) => {
      if (!account || !network) return;
      navigation.pushModal(EModalRoutes.MainModal, {
        screen: EModalAssetDetailRoutes.HistoryDetails,
        params: {
          networkId: network.id,
          accountAddress: account.address,
          historyTx: history,
        },
      });
    },
    [account, navigation, network],
  );

  const history = usePromiseResult(
    async () => {
      if (!account || !network) return;
      const [xpub, vaultSettings] = await Promise.all([
        backgroundApiProxy.serviceAccount.getAccountXpub({
          accountId: account.id,
          networkId: network.id,
        }),
        backgroundApiProxy.serviceNetwork.getVaultSettings({
          networkId: network.id,
        }),
      ]);
      const r = await backgroundApiProxy.serviceHistory.fetchAccountHistory({
        accountId: account.id,
        networkId: network.id,
        accountAddress: account.address,
        xpub,
        onChainHistoryDisabled: vaultSettings.onChainHistoryDisabled,
      });
      setHistoryState({
        initialized: true,
        isRefreshing: false,
      });
      return r;
    },
    [account, network],
    {
      overrideIsFocused: (isPageFocused) => isPageFocused && isFocused,
      debounced: POLLING_DEBOUNCE_INTERVAL,
      pollingInterval: POLLING_INTERVAL_FOR_HISTORY,
    },
  );

  useEffect(() => {
    if (account?.id && network?.id && wallet?.id) {
      setHistoryState({
        initialized: false,
        isRefreshing: true,
      });
      updateSearchKey('');
    }
  }, [account?.id, network?.id, updateSearchKey, wallet?.id]);

  return (
    <TxHistoryListView
      showIcon
      data={history.result ?? []}
      onPressHistory={handleHistoryItemPress}
      showHeader
      isLoading={historyState.isRefreshing}
      initialized={historyState.initialized}
      onContentSizeChange={onContentSizeChange}
      {...(media.gtLg && {
        tableLayout: true,
      })}
    />
  );
}

const TxHistoryListContainerWithProvider = memo(
  withHistoryListProvider(TxHistoryListContainer),
);

export { TxHistoryListContainerWithProvider };
