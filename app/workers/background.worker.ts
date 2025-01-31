import { ApiVersion, AppDistribution } from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { SessionStorage } from "@shopify/shopify-app-session-storage";

import prisma from "../db.server";

import { ShopifyError } from "@shopify/shopify-api";
import { shopifyApi } from "@shopify/shopify-api";

export async function processTask(type: string, data: any) {
  switch (type) {
    case "PROCESS_TASK":
      console.log("processing task", type, data);
      const appConfig = {
        apiKey: process.env.SHOPIFY_API_KEY,
        apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
        apiVersion: ApiVersion.October24,
        scopes: process.env.SCOPES?.split(","),
        appUrl: process.env.SHOPIFY_APP_URL || "",
        authPathPrefix: "/auth",
        sessionStorage: new PrismaSessionStorage(prisma),
        distribution: AppDistribution.AppStore,
        future: {
          unstable_newEmbeddedAuthStrategy: true,
          removeRest: true,
        },
        ...(process.env.SHOP_CUSTOM_DOMAIN
          ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
          : {}),
      };

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
        if (
          appUrl.hostname === "localhost" &&
          !appUrl.port &&
          process.env.PORT
        ) {
          appUrl.port = process.env.PORT;
        }
        /* eslint-enable no-process-env */
        appConfig.appUrl = appUrl.origin;

        let userAgentPrefix = `Shopify Remix Library v3.7.0`;
        // if (appConfig.userAgentPrefix) {
        //   userAgentPrefix = `${appConfig.userAgentPrefix} | ${userAgentPrefix}`;
        // }

        return shopifyApi({
          ...appConfig,
          hostName: appUrl.host,
          hostScheme: appUrl.protocol.replace(":", "") as "http" | "https",
          userAgentPrefix,
          isEmbeddedApp: true,
          apiVersion: appConfig.apiVersion ?? ApiVersion.October24,
          isCustomStoreApp:
            appConfig.distribution === AppDistribution.ShopifyAdmin,
          future: {
            lineItemBilling: true,
            unstable_managedPricingSupport: true,
          },
          _logDisabledFutureFlags: false,
        });
      }

      function deriveConfig<Storage extends SessionStorage>(
        appConfig: any,
        apiConfig: any,
      ) {
        if (
          !appConfig.sessionStorage &&
          appConfig.distribution !== AppDistribution.ShopifyAdmin
        ) {
          throw new ShopifyError(
            "Please provide a valid session storage. Refer to https://github.com/Shopify/shopify-app-js/blob/main/README.md#session-storage-options for options.",
          );
        }

        const authPathPrefix = appConfig.authPathPrefix || "/auth";
        appConfig.distribution =
          appConfig.distribution ?? AppDistribution.AppStore;

        return {
          ...appConfig,
          ...apiConfig,
          scopes: apiConfig.scopes,
          canUseLoginForm:
            appConfig.distribution !== AppDistribution.ShopifyAdmin,
          useOnlineTokens: appConfig.useOnlineTokens ?? false,
          hooks: appConfig.hooks ?? {},
          sessionStorage: appConfig.sessionStorage as Storage,
          future: appConfig.future ?? {},
          auth: {
            path: authPathPrefix,
            callbackPath: `${authPathPrefix}/callback`,
            patchSessionTokenPath: `${authPathPrefix}/session-token`,
            exitIframePath: `${authPathPrefix}/exit-iframe`,
            loginPath: `${authPathPrefix}/login`,
          },
          distribution: appConfig.distribution,
        };
      }

      const api = deriveApi();

      const config = deriveConfig(appConfig, api.config);

      const response = await api.auth.clientCredentials({
        shop: "development-store-1.shopify.fa-jan28.fwaad-ahmad.us.spin.dev",
      });
      const { session } = response;
      await config.sessionStorage!.storeSession(session);
      console.log("response from client credentials", response);

      return { type: "TASK_COMPLETE", data: response };

    default:
      throw new Error(`Unknown task type: ${type}`);
  }
}

// Export types for TypeScript
export type TaskType = "PROCESS_TASK";
export type TaskData = any; // Define proper type based on your needs
