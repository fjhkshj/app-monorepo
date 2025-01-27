import { useCallback, useEffect } from 'react';

import { Alert, BackHandler } from 'react-native';

import { Dialog, usePreventRemove } from '@onekeyhq/components';
import { FIRMWARE_UPDATE_PREVENT_EXIT } from '@onekeyhq/kit-bg/src/services/ServiceFirmwareUpdate/firmwareUpdateConsts';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import type {
  EModalFirmwareUpdateRoutes,
  IModalFirmwareUpdateParamList,
} from '@onekeyhq/shared/src/routes';

import useAppNavigation from '../../../hooks/useAppNavigation';
import { useAppRoute } from '../../../hooks/useAppRoute';

import { useFirmwareUpdateActions } from './useFirmwareUpdateActions';

let isNavExitConfirmShow = false;

export function useModalExitPrevent({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  const navigation = useAppNavigation();
  const navPreventRemoveCallback = useCallback(
    ({
      data,
    }: {
      data: {
        action: Readonly<{
          type: string;
          payload?: object | undefined;
          source?: string | undefined;
          target?: string | undefined;
        }>;
      };
    }) => {
      if (isNavExitConfirmShow) {
        return;
      }
      isNavExitConfirmShow = true;
      Dialog.show({
        title,
        description: message,
        onConfirmText: FIRMWARE_UPDATE_PREVENT_EXIT.confirm,
        onConfirm: () => {
          navigation.dispatch(data.action);
        },
        onCancelText: FIRMWARE_UPDATE_PREVENT_EXIT.cancel,
        onClose: () => {
          isNavExitConfirmShow = false;
        },
      });
    },
    [message, navigation, title],
  );
  usePreventRemove(true, navPreventRemoveCallback);
}

export function useAppExitPrevent({
  message,
  title,
}: {
  message: string;
  title: string;
}) {
  // Prevents web page refresh/exit
  useEffect(() => {
    if (platformEnv.isRuntimeBrowser && !platformEnv.isExtensionUiPopup) {
      const fn = (event: BeforeUnloadEvent) => {
        event.preventDefault();
        event.returnValue = true;
        return message;
      };
      window.addEventListener('beforeunload', fn);
      return () => {
        window.removeEventListener('beforeunload', fn);
      };
    }
  }, [message]);

  // Prevent Android exit
  // https://reactnavigation.org/docs/7.x/preventing-going-back
  useEffect(() => {
    const onBackPress = () => {
      Alert.alert(
        title,
        message,
        [
          {
            text: FIRMWARE_UPDATE_PREVENT_EXIT.cancel,
            onPress: () => {
              // Do nothing
            },
            style: 'cancel',
          },
          {
            text: FIRMWARE_UPDATE_PREVENT_EXIT.confirm,
            onPress: () => BackHandler.exitApp(),
          },
        ],
        { cancelable: false },
      );

      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress,
    );

    return () => backHandler.remove();
  }, [message, title]);

  // Prevent Desktop exit
  // TODO
}

export function useExtensionUpdatingFromExpandTab() {
  const route = useAppRoute<
    IModalFirmwareUpdateParamList,
    EModalFirmwareUpdateRoutes.ChangeLog
  >();
  const actions = useFirmwareUpdateActions();

  useEffect(() => {
    if (platformEnv.isExtensionUiPopup) {
      void actions.openChangeLogOfExtension(route.params);
      window.close();
    }
  }, [actions, route.params]);
}
