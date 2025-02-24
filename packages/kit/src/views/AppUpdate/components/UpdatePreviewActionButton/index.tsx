import { useCallback } from 'react';

import type { IPageFooterProps } from '@onekeyhq/components';
import { Page, Toast, YStack } from '@onekeyhq/components';
import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import { useAppUpdateInfo } from '@onekeyhq/kit/src/components/UpdateReminder/hooks';
import { EAppUpdateStatus } from '@onekeyhq/shared/src/appUpdate';
import {
  downloadPackage,
  installPackage,
  useDownloadProgress,
} from '@onekeyhq/shared/src/modules3rdParty/auto-update';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import { openUrlExternal } from '@onekeyhq/shared/src/utils/openUrlUtils';

import type { IUpdatePreviewActionButton } from './type';

export const UpdatePreviewActionButton: IUpdatePreviewActionButton = ({
  autoClose,
}: {
  autoClose: boolean;
}) => {
  const appUpdateInfo = useAppUpdateInfo();
  const downloadSuccess = useCallback(() => {}, []);
  const downloadFailed = useCallback(() => {}, []);
  const progress = useDownloadProgress(downloadSuccess, downloadFailed);
  const handleToUpdate: IPageFooterProps['onConfirm'] = useCallback(
    (close: () => void) => {
      if (appUpdateInfo.data) {
        if (appUpdateInfo.data.storeUrl) {
          openUrlExternal(appUpdateInfo.data.storeUrl);
        } else if (appUpdateInfo.data.downloadUrl) {
          void backgroundApiProxy.serviceAppUpdate.startDownloading();
          void downloadPackage(appUpdateInfo.data)
            .then(() => {
              void backgroundApiProxy.serviceAppUpdate.readyToInstall();
            })
            .catch((e: { message: string }) => {
              const { message } = e as { message: string };
              if (message) {
                Toast.error({ title: message });
              }
              void backgroundApiProxy.serviceAppUpdate.notifyFailed(e);
            });
          if (autoClose) {
            close();
          }
        }
      }
    },
    [appUpdateInfo.data, autoClose],
  );

  const handleToInstall = useCallback(async () => {
    try {
      await installPackage(appUpdateInfo.data);
    } catch (error) {
      const { message } = error as { message: string };
      if (message) {
        Toast.error({ title: message });
      }
    }
  }, [appUpdateInfo.data]);

  const isDownloading =
    EAppUpdateStatus.downloading === appUpdateInfo.data?.status;

  const isReadyToInstall =
    EAppUpdateStatus.ready === appUpdateInfo.data?.status;

  const renderButtonText = useCallback(() => {
    if (isDownloading) {
      return `${progress}% Downloading...`;
    }

    if (isReadyToInstall) {
      return platformEnv.isNativeAndroid ? 'Install Now' : 'Restart to Update';
    }
    return 'Update Now';
  }, [isDownloading, isReadyToInstall, progress]);
  return (
    <Page.Footer>
      <YStack>
        <Page.FooterActions
          confirmButtonProps={{
            disabled: isDownloading,
            loading: isDownloading,
          }}
          onConfirmText={renderButtonText()}
          onConfirm={isReadyToInstall ? handleToInstall : handleToUpdate}
        />
      </YStack>
    </Page.Footer>
  );
};
