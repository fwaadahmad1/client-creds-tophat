#------------------- variables -----------
APP_PATH=~/shopify-app-js
API_JS_SUBPATH=packages/apps/shopify-api
APP_REMIX_SUBPATH=packages/apps/shopify-app-remix

# Exit the script if any command fails
set -e

pushd $APP_PATH
pnpm install && pnpm build && echo "Successfully built shopify-api-js"

#------------------- shopify-api ---------------
pushd $API_JS_SUBPATH
mv $(pnpm pack) local-shopify-api-package.tgz && echo "Successfully packaged shopify-api-js"
popd

#------------------- remix ---------------
pushd $APP_REMIX_SUBPATH
mv $(pnpm pack) local-remix-package.tgz && echo "Successfully packaged shopify-app-remix"
popd

popd

#------------------- Install local pacakges ---------------
# Install the packaged remix tar ball into this app
pnpm install $APP_PATH/$API_JS_SUBPATH/local-shopify-api-package.tgz && echo "Successfully installed shopify-api-js"
pnpm install $APP_PATH/$APP_REMIX_SUBPATH/local-remix-package.tgz && echo "Successfully installed shopify-app-remix"