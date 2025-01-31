import "@shopify/shopify-app-remix/adapters/node";
import '@shopify/shopify-api/adapters/web-api';
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";
import { ShopifyError } from "@shopify/shopify-api";
import { shopifyApi } from "@shopify/shopify-api";

const appConfig = {
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  // useOnlineTokens: true,
  apiVersion: ApiVersion.October24,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    unstable_newEmbeddedAuthStrategy: false,
    removeRest: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
};

export const api = deriveApi();
const shopify = shopifyApp({
  ...appConfig,
  hooks: {
    afterAuth: async (ctx) => {
      try {
        console.log("afterAuth", ctx);
        await api.auth.clientCredentials();
      } catch (error) {
        console.error("Error in afterAuth hook", error);
      }
    },
  },
});

export default shopify;
export const apiVersion = ApiVersion.October24;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;

function deriveApi() {
  let appUrl;
  try {
    appUrl = new URL(appConfig.appUrl);
  } catch (error) {
    const message =
      appConfig.appUrl === ""
        ? `Detected an empty appUrl configuration, please make sure to set the necessary environment variables.\n` +
          `If you're deploying your app, you can find more information at https://shopify.dev/docs/apps/launch/deployment/deploy-web-app/deploy-to-hosting-service#step-4-set-up-environment-variables`
        : `Invalid appUrl configuration '${appConfig.appUrl}', please provide a valid URL.`;
    throw new ShopifyError(message);
  }

  /* eslint-disable no-process-env */
  if (appUrl.hostname === "localhost" && !appUrl.port && process.env.PORT) {
    appUrl.port = process.env.PORT;
  }
  /* eslint-enable no-process-env */
  appConfig.appUrl = appUrl.origin;

  let userAgentPrefix = `Shopify Remix Library v3.7.0`;
  if (appConfig.userAgentPrefix) {
    userAgentPrefix = `${appConfig.userAgentPrefix} | ${userAgentPrefix}`;
  }

  return shopifyApi({
    ...appConfig,
    hostName: appUrl.host,
    hostScheme: appUrl.protocol.replace(":", ""),
    userAgentPrefix,
    isEmbeddedApp: appConfig.isEmbeddedApp ?? true,
    apiVersion: appConfig.apiVersion ?? ApiVersion.October24,
    isCustomStoreApp: appConfig.distribution === AppDistribution.ShopifyAdmin,
    billing: appConfig.billing,
    future: {
      lineItemBilling: true,
      unstable_managedPricingSupport: true,
    },
    _logDisabledFutureFlags: false,
  });
}
