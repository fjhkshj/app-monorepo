import { useCallback } from 'react';

import { useRoute } from '@react-navigation/core';
import BigNumber from 'bignumber.js';
import { useIntl } from 'react-intl';

import type { IPageNavigationProp } from '@onekeyhq/components';
import {
  Form,
  Input,
  Page,
  TextArea,
  YStack,
  useForm,
} from '@onekeyhq/components';
import { EModalReceiveRoutes, EModalRoutes } from '@onekeyhq/shared/src/routes';
import type {
  IModalReceiveParamList,
  IModalSendParamList,
} from '@onekeyhq/shared/src/routes';

import backgroundApiProxy from '../../../background/instance/backgroundApiProxy';
import useAppNavigation from '../../../hooks/useAppNavigation';
import { usePromiseResult } from '../../../hooks/usePromiseResult';

import type { RouteProp } from '@react-navigation/core';

type IFormValues = {
  amount: string;
  description: string;
};

function CreateInvoice() {
  const intl = useIntl();
  const form = useForm<IFormValues>();
  const route =
    useRoute<
      RouteProp<IModalReceiveParamList, EModalReceiveRoutes.CreateInvoice>
    >();
  const navigation =
    useAppNavigation<IPageNavigationProp<IModalSendParamList>>();
  const { accountId, networkId } = route.params;
  const { serviceLightning } = backgroundApiProxy;

  const { result: invoiceConfig } = usePromiseResult(
    () => serviceLightning.getInvoiceConfig({ networkId }),
    [networkId, serviceLightning],
  );

  const onSubmit = useCallback(
    async (values: IFormValues) => {
      const response = await serviceLightning.createInvoice({
        accountId,
        networkId,
        amount: values.amount,
        description: values.description,
      });
      navigation.pushModal(EModalRoutes.ReceiveModal, {
        screen: EModalReceiveRoutes.ReceiveInvoice,
        params: {
          networkId,
          accountId,
          paymentHash: response.payment_hash,
          paymentRequest: response.payment_request,
        },
      });
    },
    [accountId, networkId, serviceLightning, navigation],
  );

  return (
    <Page>
      <Page.Header title="Lightning Invoice" />
      <Page.Body>
        <YStack p="$5">
          <Form form={form}>
            <Form.Field
              label="Amount"
              name="amount"
              description="$0.00"
              rules={{
                min: {
                  value: 0,
                  message: intl.formatMessage(
                    {
                      id: 'form__field_too_small',
                    },
                    {
                      0: 0,
                    },
                  ),
                },
                pattern: {
                  value: /^[0-9]*$/,
                  message: intl.formatMessage({
                    id: 'form__field_only_integer',
                  }),
                },
                validate: (value) => {
                  // allow unspecified amount
                  if (!value) return;

                  const valueBN = new BigNumber(value);
                  if (!valueBN.isInteger()) {
                    return intl.formatMessage({
                      id: 'form__field_only_integer',
                    });
                  }
                  if (
                    invoiceConfig?.maxReceiveAmount &&
                    valueBN.isGreaterThan(invoiceConfig?.maxReceiveAmount)
                  ) {
                    return intl.formatMessage(
                      {
                        id: 'msg_receipt_amount_should_be_less_than_int_sats',
                      },
                      {
                        0: invoiceConfig?.maxReceiveAmount,
                      },
                    );
                  }
                },
              }}
            >
              <Input
                placeholder="Enter amount"
                size="large"
                keyboardType="number-pad"
                addOns={[
                  {
                    label: 'sats',
                  },
                ]}
              />
            </Form.Field>
            <Form.Field label="Description" name="description">
              <TextArea size="large" placeholder="OneKey invoice" />
            </Form.Field>
          </Form>
        </YStack>
      </Page.Body>
      <Page.Footer
        onConfirmText="Create Invoice"
        onConfirm={() => form.handleSubmit(onSubmit)()}
      />
    </Page>
  );
}

export default CreateInvoice;
