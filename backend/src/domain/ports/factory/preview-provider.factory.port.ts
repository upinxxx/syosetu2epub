import { PreviewProviderPort } from '../preview-provider.port.js';

export const PREVIEW_PROVIDER_FACTORY_TOKEN = Symbol(
  'PREVIEW_PROVIDER_FACTORY_PORT',
);

export interface PreviewProviderFactoryPort {
  getProvider(source: string): PreviewProviderPort;
}
