import { useCallback } from 'react';

import { useIntl } from 'react-intl';

import type { IPageNavigationProp } from '@onekeyhq/components/src/layouts/Navigation';
import { ListItem } from '@onekeyhq/kit/src/components/ListItem';
import useAppNavigation from '@onekeyhq/kit/src/hooks/useAppNavigation';
import { useSettingsPersistAtom } from '@onekeyhq/kit-bg/src/states/jotai/atoms';
import { BRIDGE_STATUS_URL } from '@onekeyhq/shared/src/config/appConfig';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import type { IModalSettingParamList } from '@onekeyhq/shared/src/routes';
import { EModalSettingRoutes } from '@onekeyhq/shared/src/routes';
import { openUrlExternal } from '@onekeyhq/shared/src/utils/openUrlUtils';

import { Section } from '../Section';

const HardwareBridgeListItems = () => {
  const navigation =
    useAppNavigation<IPageNavigationProp<IModalSettingParamList>>();
  const onPressBridgeSdkUrl = useCallback(() => {
    navigation.push(EModalSettingRoutes.SettingHardwareSdkUrlModal);
  }, [navigation]);

  const onPressBridgeStatus = useCallback(() => {
    openUrlExternal(BRIDGE_STATUS_URL);
  }, []);
  const intl = useIntl();

  const [settings] = useSettingsPersistAtom();

  return (
    <>
      <ListItem
        onPress={onPressBridgeSdkUrl}
        icon="CodeOutline"
        title={intl.formatMessage({ id: 'form__hardware_bridge_sdk_url' })}
        drillIn
      >
        <ListItem.Text primary={settings.hardwareConnectSrc} align="right" />
      </ListItem>
      <ListItem
        onPress={onPressBridgeStatus}
        icon="ApiConnectionOutline"
        title={intl.formatMessage({ id: 'form__hardware_bridge_status' })}
      >
        <ListItem.IconButton
          disabled
          icon="ArrowTopRightOutline"
          iconProps={{
            color: '$iconActive',
          }}
        />
      </ListItem>
    </>
  );
};

const SpendDustUTXOItem = () => {
  const navigation =
    useAppNavigation<IPageNavigationProp<IModalSettingParamList>>();
  const onPress = useCallback(() => {
    navigation.push(EModalSettingRoutes.SettingSpendUTXOModal);
  }, [navigation]);
  const intl = useIntl();
  const [{ spendDustUTXO }] = useSettingsPersistAtom();
  return (
    <ListItem
      onPress={onPress}
      icon="CryptoCoinOutline"
      title={intl.formatMessage({ id: 'form__spend_dust_utxo' })}
      drillIn
    >
      <ListItem.Text primary={spendDustUTXO ? 'On' : 'Off'} align="right" />
    </ListItem>
  );
};

export const AdvancedSection = () => {
  const navigation =
    useAppNavigation<IPageNavigationProp<IModalSettingParamList>>();
  const onAccountDerivation = useCallback(() => {
    navigation.push(EModalSettingRoutes.SettingAccountDerivationModal);
  }, [navigation]);
  return (
    <Section title="Advanced">
      <ListItem
        onPress={onAccountDerivation}
        icon="OrganisationOutline"
        title="Account Derivation Path"
        drillIn
      />
      {/* <SpendDustUTXOItem />  Hide the spendDustUTXO function; it's not ready yet. */}
      {platformEnv.isExtension || platformEnv.isWeb ? (
        <HardwareBridgeListItems />
      ) : null}
    </Section>
  );
};
