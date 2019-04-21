const multer = require('multer');
const autoReap = require('multer-autoreap');

autoReap.options.reapOnError = true; // continue reaping the file even if an error occurs

module.exports = function(crowi, app) {
  const middleware = require('../util/middlewares');
  const uploads = multer({ dest: `${crowi.tmpDir}uploads` });
  const form = require('../form');
  const page = require('./page')(crowi, app);
  const login = require('./login')(crowi, app);
  const loginPassport = require('./login-passport')(crowi, app);
  const logout = require('./logout')(crowi, app);
  const me = require('./me')(crowi, app);
  const admin = require('./admin')(crowi, app);
  const installer = require('./installer')(crowi, app);
  const user = require('./user')(crowi, app);
  const attachment = require('./attachment')(crowi, app);
  const comment = require('./comment')(crowi, app);
  const bookmark = require('./bookmark')(crowi, app);
  const tag = require('./tag')(crowi, app);
  const revision = require('./revision')(crowi, app);
  const search = require('./search')(crowi, app);
  const hackmd = require('./hackmd')(crowi, app);
  const loginRequired = middleware.loginRequired;
  const accessTokenParser = middleware.accessTokenParser(crowi, app);
  const csrf = middleware.csrfVerify(crowi, app);
  const config = crowi.getConfig();
  const Config = crowi.model('Config');

  /* eslint-disable max-len, comma-spacing, no-multi-spaces */

  app.get('/'                        , middleware.applicationInstalled(), loginRequired(crowi, app, false) , page.showTopPage);

  app.get('/installer'               , middleware.applicationNotInstalled() , installer.index);
  app.post('/installer'              , middleware.applicationNotInstalled() , form.register , csrf, installer.install);

  app.get('/login/error/:reason'     , login.error);
  app.get('/login'                   , middleware.applicationInstalled()    , login.login);
  app.get('/login/invited'           , login.invited);
  app.post('/login/activateInvited'  , form.invited                         , csrf, login.invited);

  // switch POST /login route
  if (Config.isEnabledPassport(config)) {
    app.post('/login'                , form.login                           , csrf, loginPassport.loginWithLocal, loginPassport.loginWithLdap, loginPassport.loginFailure);
    app.post('/_api/login/testLdap'  , loginRequired(crowi, app) , form.login , loginPassport.testLdapCredentials);
  }
  else {
    app.post('/login'                , form.login                           , csrf, login.login);
  }

  app.post('/register'               , form.register                        , csrf, login.register);
  app.get('/register'                , middleware.applicationInstalled()    , login.register);
  app.post('/register/google'        , login.registerGoogle);
  app.get('/google/callback'         , login.googleCallback);
  app.get('/login/google'            , login.loginGoogle);
  app.get('/logout'                  , logout.logout);

  app.get('/admin'                          , loginRequired(crowi, app) , middleware.adminRequired() , admin.index);
  app.get('/admin/app'                      , loginRequired(crowi, app) , middleware.adminRequired() , admin.app.index);
  app.post('/_api/admin/settings/app'       , loginRequired(crowi, app) , middleware.adminRequired() , csrf, form.admin.app, admin.api.appSetting);
  app.post('/_api/admin/settings/siteUrl'   , loginRequired(crowi, app) , middleware.adminRequired() , csrf, form.admin.siteUrl, admin.api.asyncAppSetting);
  app.post('/_api/admin/settings/mail'      , loginRequired(crowi, app) , middleware.adminRequired() , csrf, form.admin.mail, admin.api.appSetting);
  app.post('/_api/admin/settings/aws'       , loginRequired(crowi, app) , middleware.adminRequired() , csrf, form.admin.aws, admin.api.appSetting);
  app.post('/_api/admin/settings/plugin'    , loginRequired(crowi, app) , middleware.adminRequired() , csrf, form.admin.plugin, admin.api.appSetting);

  // security admin
  app.get('/admin/security'                     , loginRequired(crowi, app) , middleware.adminRequired() , admin.security.index);
  app.post('/_api/admin/security/general'       , loginRequired(crowi, app) , middleware.adminRequired() , form.admin.securityGeneral, admin.api.securitySetting);
  app.post('/_api/admin/security/google'        , loginRequired(crowi, app) , middleware.adminRequired() , csrf, form.admin.securityGoogle, admin.api.securitySetting);
  app.post('/_api/admin/security/mechanism'     , loginRequired(crowi, app) , middleware.adminRequired() , csrf, form.admin.securityMechanism, admin.api.securitySetting);
  app.post('/_api/admin/security/passport-ldap' , loginRequired(crowi, app) , middleware.adminRequired() , csrf, form.admin.securityPassportLdap, admin.api.securityPassportLdapSetting);
  app.post('/_api/admin/security/passport-saml' , loginRequired(crowi, app) , middleware.adminRequired() , csrf, form.admin.securityPassportSaml, admin.api.securityPassportSamlSetting);

  // OAuth
  app.post('/_api/admin/security/passport-google' , loginRequired(crowi, app) , middleware.adminRequired() , csrf, form.admin.securityPassportGoogle, admin.api.securityPassportGoogleSetting);
  app.post('/_api/admin/security/passport-github' , loginRequired(crowi, app) , middleware.adminRequired() , csrf, form.admin.securityPassportGitHub, admin.api.securityPassportGitHubSetting);
  app.post('/_api/admin/security/passport-twitter', loginRequired(crowi, app) , middleware.adminRequired() , csrf, form.admin.securityPassportTwitter, admin.api.securityPassportTwitterSetting);
  app.get('/passport/google'                      , loginPassport.loginWithGoogle);
  app.get('/passport/github'                      , loginPassport.loginWithGitHub);
  app.get('/passport/twitter'                     , loginPassport.loginWithTwitter);
  app.get('/passport/saml'                        , loginPassport.loginWithSaml);
  app.get('/passport/google/callback'             , loginPassport.loginPassportGoogleCallback);
  app.get('/passport/github/callback'             , loginPassport.loginPassportGitHubCallback);
  app.get('/passport/twitter/callback'            , loginPassport.loginPassportTwitterCallback);
  app.post('/passport/saml/callback'              , loginPassport.loginPassportSamlCallback);

  // markdown admin
  app.get('/admin/markdown'                   , loginRequired(crowi, app) , middleware.adminRequired() , admin.markdown.index);
  app.post('/admin/markdown/lineBreaksSetting', loginRequired(crowi, app) , middleware.adminRequired() , csrf, form.admin.markdown, admin.markdown.lineBreaksSetting); // change form name
  app.post('/admin/markdown/xss-setting'      , loginRequired(crowi, app) , middleware.adminRequired() , csrf, form.admin.markdownXss, admin.markdown.xssSetting);
  app.post('/admin/markdown/presentationSetting', loginRequired(crowi, app) , middleware.adminRequired() , csrf, form.admin.markdownPresentation, admin.markdown.presentationSetting);

  // markdown admin
  app.get('/admin/customize'                , loginRequired(crowi, app) , middleware.adminRequired() , admin.customize.index);
  app.post('/_api/admin/customize/css'      , loginRequired(crowi, app) , middleware.adminRequired() , csrf, form.admin.customcss, admin.api.customizeSetting);
  app.post('/_api/admin/customize/script'   , loginRequired(crowi, app) , middleware.adminRequired() , csrf, form.admin.customscript, admin.api.customizeSetting);
  app.post('/_api/admin/customize/header'   , loginRequired(crowi, app) , middleware.adminRequired() , csrf, form.admin.customheader, admin.api.customizeSetting);
  app.post('/_api/admin/customize/theme'    , loginRequired(crowi, app) , middleware.adminRequired() , csrf, form.admin.customtheme, admin.api.customizeSetting);
  app.post('/_api/admin/customize/title'    , loginRequired(crowi, app) , middleware.adminRequired() , csrf, form.admin.customtitle, admin.api.customizeSetting);
  app.post('/_api/admin/customize/behavior' , loginRequired(crowi, app) , middleware.adminRequired() , csrf, form.admin.custombehavior, admin.api.customizeSetting);
  app.post('/_api/admin/customize/layout'   , loginRequired(crowi, app) , middleware.adminRequired() , csrf, form.admin.customlayout, admin.api.customizeSetting);
  app.post('/_api/admin/customize/features' , loginRequired(crowi, app) , middleware.adminRequired() , csrf, form.admin.customfeatures, admin.api.customizeSetting);
  app.post('/_api/admin/customize/highlightJsStyle' , loginRequired(crowi, app) , middleware.adminRequired() , csrf, form.admin.customhighlightJsStyle, admin.api.customizeSetting);

  // search admin
  app.get('/admin/search'              , loginRequired(crowi, app) , middleware.adminRequired() , admin.search.index);
  app.post('/_api/admin/search/build'  , loginRequired(crowi, app) , middleware.adminRequired() , csrf, admin.api.searchBuildIndex);

  // notification admin
  app.get('/admin/notification'              , loginRequired(crowi, app) , middleware.adminRequired() , admin.notification.index);
  app.post('/admin/notification/slackIwhSetting', loginRequired(crowi, app) , middleware.adminRequired() , csrf, form.admin.slackIwhSetting, admin.notification.slackIwhSetting);
  app.post('/admin/notification/slackSetting', loginRequired(crowi, app) , middleware.adminRequired() , csrf, form.admin.slackSetting, admin.notification.slackSetting);
  app.get('/admin/notification/slackAuth'    , loginRequired(crowi, app) , middleware.adminRequired() , admin.notification.slackAuth);
  app.get('/admin/notification/slackSetting/disconnect', loginRequired(crowi, app) , middleware.adminRequired() , admin.notification.disconnectFromSlack);
  app.post('/_api/admin/notification.add'    , loginRequired(crowi, app) , middleware.adminRequired() , csrf, admin.api.notificationAdd);
  app.post('/_api/admin/notification.remove' , loginRequired(crowi, app) , middleware.adminRequired() , csrf, admin.api.notificationRemove);
  app.get('/_api/admin/users.search'         , loginRequired(crowi, app) , middleware.adminRequired() , admin.api.usersSearch);
  app.get('/admin/global-notification/new'   , loginRequired(crowi, app) , middleware.adminRequired() , admin.globalNotification.detail);
  app.get('/admin/global-notification/:id'   , loginRequired(crowi, app) , middleware.adminRequired() , admin.globalNotification.detail);
  app.post('/admin/global-notification/new'  , loginRequired(crowi, app) , middleware.adminRequired() , form.admin.notificationGlobal, admin.globalNotification.create);
  app.post('/_api/admin/global-notification/toggleIsEnabled', loginRequired(crowi, app) , middleware.adminRequired() , admin.api.toggleIsEnabledForGlobalNotification);
  app.post('/admin/global-notification/:id/update', loginRequired(crowi, app) , middleware.adminRequired() , form.admin.notificationGlobal, admin.globalNotification.update);
  app.post('/admin/global-notification/:id/remove', loginRequired(crowi, app) , middleware.adminRequired() , admin.globalNotification.remove);

  app.get('/admin/users'                , loginRequired(crowi, app) , middleware.adminRequired() , admin.user.index);
  app.post('/admin/user/invite'         , form.admin.userInvite ,  loginRequired(crowi, app) , middleware.adminRequired() , csrf, admin.user.invite);
  app.post('/admin/user/:id/makeAdmin'  , loginRequired(crowi, app) , middleware.adminRequired() , csrf, admin.user.makeAdmin);
  app.post('/admin/user/:id/removeFromAdmin', loginRequired(crowi, app) , middleware.adminRequired() , admin.user.removeFromAdmin);
  app.post('/admin/user/:id/activate'   , loginRequired(crowi, app) , middleware.adminRequired() , csrf, admin.user.activate);
  app.post('/admin/user/:id/suspend'    , loginRequired(crowi, app) , middleware.adminRequired() , csrf, admin.user.suspend);
  app.post('/admin/user/:id/remove'     , loginRequired(crowi, app) , middleware.adminRequired() , csrf, admin.user.remove);
  app.post('/admin/user/:id/removeCompletely' , loginRequired(crowi, app) , middleware.adminRequired() , csrf, admin.user.removeCompletely);
  // new route patterns from here:
  app.post('/_api/admin/users.resetPassword'  , loginRequired(crowi, app) , middleware.adminRequired() , csrf, admin.user.resetPassword);

  app.get('/admin/users/external-accounts'               , loginRequired(crowi, app) , middleware.adminRequired() , admin.externalAccount.index);
  app.post('/admin/users/external-accounts/:id/remove'   , loginRequired(crowi, app) , middleware.adminRequired() , admin.externalAccount.remove);

  // user-groups admin
  app.get('/admin/user-groups'             , loginRequired(crowi, app), middleware.adminRequired(), admin.userGroup.index);
  app.get('/admin/user-group-detail/:id'          , loginRequired(crowi, app), middleware.adminRequired(), admin.userGroup.detail);
  app.post('/admin/user-group/create'      , form.admin.userGroupCreate, loginRequired(crowi, app), middleware.adminRequired(), csrf, admin.userGroup.create);
  app.post('/admin/user-group/:userGroupId/update', loginRequired(crowi, app), middleware.adminRequired(), csrf, admin.userGroup.update);
  app.post('/admin/user-group.remove' , loginRequired(crowi, app), middleware.adminRequired(), csrf, admin.userGroup.removeCompletely);

  // user-group-relations admin
  app.post('/admin/user-group-relation/create', loginRequired(crowi, app), middleware.adminRequired(), csrf, admin.userGroupRelation.create);
  app.post('/admin/user-group-relation/:id/remove-relation/:relationId', loginRequired(crowi, app), middleware.adminRequired(), csrf, admin.userGroupRelation.remove);

  // importer management for admin
  app.get('/admin/importer'                , loginRequired(crowi, app) , middleware.adminRequired() , admin.importer.index);
  app.post('/_api/admin/settings/importerEsa' , loginRequired(crowi, app) , middleware.adminRequired() , csrf , form.admin.importerEsa , admin.api.importerSettingEsa);
  app.post('/_api/admin/settings/importerQiita' , loginRequired(crowi, app) , middleware.adminRequired() , csrf , form.admin.importerQiita , admin.api.importerSettingQiita);
  app.post('/_api/admin/import/esa'        , loginRequired(crowi, app) , middleware.adminRequired() , admin.api.importDataFromEsa);
  app.post('/_api/admin/import/testEsaAPI' , loginRequired(crowi, app) , middleware.adminRequired() , csrf , form.admin.importerEsa , admin.api.testEsaAPI);
  app.post('/_api/admin/import/qiita'        , loginRequired(crowi, app) , middleware.adminRequired() , admin.api.importDataFromQiita);
  app.post('/_api/admin/import/testQiitaAPI' , loginRequired(crowi, app) , middleware.adminRequired() , csrf , form.admin.importerQiita , admin.api.testQiitaAPI);

  app.get('/me'                       , loginRequired(crowi, app) , me.index);
  app.get('/me/password'              , loginRequired(crowi, app) , me.password);
  app.get('/me/apiToken'              , loginRequired(crowi, app) , me.apiToken);
  app.post('/me'                      , form.me.user              , loginRequired(crowi, app) , me.index);
  // external-accounts
  if (Config.isEnabledPassport(config)) {
    app.get('/me/external-accounts'                         , loginRequired(crowi, app) , me.externalAccounts.list);
    app.post('/me/external-accounts/disassociate'           , loginRequired(crowi, app) , me.externalAccounts.disassociate);
    app.post('/me/external-accounts/associateLdap'          , loginRequired(crowi, app) , form.login , me.externalAccounts.associateLdap);
  }
  app.post('/me/password'             , form.me.password          , loginRequired(crowi, app) , me.password);
  app.post('/me/imagetype'            , form.me.imagetype         , loginRequired(crowi, app) , me.imagetype);
  app.post('/me/apiToken'             , form.me.apiToken          , loginRequired(crowi, app) , me.apiToken);
  app.post('/me/auth/google'          , loginRequired(crowi, app) , me.authGoogle);
  app.get('/me/auth/google/callback' , loginRequired(crowi, app) , me.authGoogleCallback);

  app.get('/:id([0-9a-z]{24})'       , loginRequired(crowi, app, false) , page.redirector);
  app.get('/_r/:id([0-9a-z]{24})'    , loginRequired(crowi, app, false) , page.redirector); // alias
  app.get('/attachment/:pageId/:fileName'  , loginRequired(crowi, app, false), attachment.api.obsoletedGetForMongoDB); // DEPRECATED: remains for backward compatibility for v3.3.x or below
  app.get('/attachment/:id([0-9a-z]{24})'  , loginRequired(crowi, app, false), attachment.api.get);
  app.get('/download/:id([0-9a-z]{24})'    , loginRequired(crowi, app, false), attachment.api.download);

  app.get('/_search'                 , loginRequired(crowi, app, false) , search.searchPage);
  app.get('/_api/search'             , accessTokenParser , loginRequired(crowi, app, false) , search.api.search);

  app.get('/_api/check_username'           , user.api.checkUsername);
  app.get('/_api/me/user-group-relations'  , accessTokenParser , loginRequired(crowi, app) , me.api.userGroupRelations);
  app.get('/_api/user/bookmarks'           , loginRequired(crowi, app, false) , user.api.bookmarks);

  // HTTP RPC Styled API (に徐々に移行していいこうと思う)
  app.get('/_api/users.list'          , accessTokenParser , loginRequired(crowi, app, false) , user.api.list);
  app.get('/_api/pages.list'          , accessTokenParser , loginRequired(crowi, app, false) , page.api.list);
  app.get('/_api/pages.recentCreated' , accessTokenParser , loginRequired(crowi, app, false) , page.api.recentCreated);
  app.post('/_api/pages.create'       , accessTokenParser , loginRequired(crowi, app) , csrf, page.api.create);
  app.post('/_api/pages.update'       , accessTokenParser , loginRequired(crowi, app) , csrf, page.api.update);
  app.get('/_api/pages.get'           , accessTokenParser , loginRequired(crowi, app, false) , page.api.get);
  app.get('/_api/pages.updatePost', accessTokenParser, loginRequired(crowi, app, false), page.api.getUpdatePost);
  app.get('/_api/pages.getPageTag'    , accessTokenParser , loginRequired(crowi, app, false) , page.api.getPageTag);
  // allow posting to guests because the client doesn't know whether the user logged in
  app.post('/_api/pages.seen'         , accessTokenParser , loginRequired(crowi, app, false) , page.api.seen);
  app.post('/_api/pages.rename'       , accessTokenParser , loginRequired(crowi, app) , csrf, page.api.rename);
  app.post('/_api/pages.remove'       , loginRequired(crowi, app) , csrf, page.api.remove); // (Avoid from API Token)
  app.post('/_api/pages.revertRemove' , loginRequired(crowi, app) , csrf, page.api.revertRemove); // (Avoid from API Token)
  app.post('/_api/pages.unlink'       , loginRequired(crowi, app) , csrf, page.api.unlink); // (Avoid from API Token)
  app.post('/_api/pages.duplicate', accessTokenParser, loginRequired(crowi, app), csrf, page.api.duplicate);
  app.get('/_api/tags.search'         , accessTokenParser, loginRequired(crowi, app, false), tag.api.search);
  app.get('/_api/comments.get'        , accessTokenParser , loginRequired(crowi, app, false) , comment.api.get);
  app.post('/_api/comments.add'       , form.comment, accessTokenParser , loginRequired(crowi, app) , csrf, comment.api.add);
  app.post('/_api/comments.remove'    , accessTokenParser , loginRequired(crowi, app) , csrf, comment.api.remove);
  app.get('/_api/bookmarks.get'      , accessTokenParser , loginRequired(crowi, app, false) , bookmark.api.get);
  app.post('/_api/bookmarks.add'      , accessTokenParser , loginRequired(crowi, app) , csrf, bookmark.api.add);
  app.post('/_api/bookmarks.remove'   , accessTokenParser , loginRequired(crowi, app) , csrf, bookmark.api.remove);
  app.post('/_api/likes.add'          , accessTokenParser , loginRequired(crowi, app) , csrf, page.api.like);
  app.post('/_api/likes.remove'       , accessTokenParser , loginRequired(crowi, app) , csrf, page.api.unlike);
  app.get('/_api/attachments.list'   , accessTokenParser , loginRequired(crowi, app, false) , attachment.api.list);
  app.post('/_api/attachments.add'                  , uploads.single('file'), autoReap, accessTokenParser, loginRequired(crowi, app) ,csrf, attachment.api.add);
  app.post('/_api/attachments.uploadProfileImage'   , uploads.single('file'), autoReap, accessTokenParser, loginRequired(crowi, app) ,csrf, attachment.api.uploadProfileImage);
  app.post('/_api/attachments.remove' , accessTokenParser , loginRequired(crowi, app) , csrf, attachment.api.remove);
  app.get('/_api/attachments.limit'  , accessTokenParser , loginRequired(crowi, app) , csrf, attachment.api.limit);

  app.get('/_api/revisions.get'      , accessTokenParser , loginRequired(crowi, app, false) , revision.api.get);
  app.get('/_api/revisions.ids'      , accessTokenParser , loginRequired(crowi, app, false) , revision.api.ids);
  app.get('/_api/revisions.list'     , accessTokenParser , loginRequired(crowi, app, false) , revision.api.list);

  app.get('/trash$'                  , loginRequired(crowi, app, false) , page.trashPageShowWrapper);
  app.get('/trash/$'                 , loginRequired(crowi, app, false) , page.trashPageListShowWrapper);
  app.get('/trash/*/$'               , loginRequired(crowi, app, false) , page.deletedPageListShowWrapper);

  app.get('/_hackmd/load-agent'        , hackmd.loadAgent);
  app.get('/_hackmd/load-styles'       , hackmd.loadStyles);
  app.post('/_api/hackmd.integrate'    , accessTokenParser , loginRequired(crowi, app) , csrf, hackmd.validateForApi, hackmd.integrate);
  app.post('/_api/hackmd.saveOnHackmd' , accessTokenParser , loginRequired(crowi, app) , csrf, hackmd.validateForApi, hackmd.saveOnHackmd);

  // API v3
  app.use('/_api/v3', require('./apiv3')(crowi));

  app.get('/*/$'                   , loginRequired(crowi, app, false) , page.showPageWithEndOfSlash, page.notFound);
  app.get('/*'                     , loginRequired(crowi, app, false) , page.showPage, page.notFound);
};
