/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, max-classes-per-file */

import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import {
  EAppEventBusNames,
  appEventBus,
} from '@onekeyhq/shared/src/eventBus/appEventBus';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import timerUtils from '@onekeyhq/shared/src/utils/timerUtils';

import { RemoteApiProxyBase } from '../../apis/RemoteApiProxyBase';

import type { IWebembedApi, IWebembedApiKeys } from './IWebembedApi';
import type { IBackgroundApiWebembedCallMessage } from '../../apis/IBackgroundApi';
import type WebEmbedApiChainAdaLegacy from '../WebEmbedApiChainAdaLegacy';
import type WebEmbedApiTest from '../WebEmbedApiTest';

class WebembedApiProxy extends RemoteApiProxyBase implements IWebembedApi {
  override checkEnvAvailable(): void {
    if (!platformEnv.isNative) {
      throw new Error(
        'WebembedApiProxy should only be used in iOS/Android Native env.',
      );
    }
  }

  override async waitRemoteApiReady(): Promise<void> {
    const ready = await this.isSDKReady();
    if (!ready) {
      return new Promise((resolve, reject) => {
        const timerId = setTimeout(() => {
          reject(new Error('WebEmbedApi not ready after 5s.'));
        }, 5000);
        appEventBus.once(EAppEventBusNames.LoadWebEmbedWebViewComplete, () => {
          clearTimeout(timerId);
          resolve();
        });
        appEventBus.emit(EAppEventBusNames.LoadWebEmbedWebView, undefined);
      });
    }
  }

  protected override async callRemoteApi(options: {
    module: IWebembedApiKeys;
    method: string;
    params: any[];
  }): Promise<any> {
    const { module, method, params } = options;
    const message: IBackgroundApiWebembedCallMessage = {
      module: module as any,
      method,
      params,
    };
    return backgroundApiProxy.serviceDApp.callWebEmbedApiProxy(message);
  }

  async isSDKReady(): Promise<boolean> {
    const isWebEmbedApiReady =
      await backgroundApiProxy.serviceDApp.isWebEmbedApiReady();
    return Promise.resolve(!!isWebEmbedApiReady);
  }

  test: WebEmbedApiTest = this._createProxyModule<IWebembedApiKeys>('test');

  chainAdaLegacy: WebEmbedApiChainAdaLegacy =
    this._createProxyModule<IWebembedApiKeys>('chainAdaLegacy', undefined, {
      asyncThenSupport: true,
    });
}

const webembedApiProxy = new WebembedApiProxy();
export default webembedApiProxy;
global.$webembedApiProxy = webembedApiProxy;
