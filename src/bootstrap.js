/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

var Cu = Components.utils;
var Ci = Components.interfaces;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

var m_isInstall = false;

// install & uninstall are called even for disabled extensions
function install(data, reason) {
  m_isInstall = true;
}


function uninstall(data, reason) {
  registerResourceProtocol(data.resourceURI);

  // uninstall: remove storage, prefs
  if (reason === ADDON_UNINSTALL) { // updating=ADDON_UPGRADE
    Cu.import("${PATH_MODULE}/new-window.js", null).
      Bootstrap.
        extensionUninstall();
  }

  // update/uninstall: unload all modules
  unloadModules();
  registerResourceProtocol(null);
}


function startup(data, reason) {
  registerResourceProtocol(data.resourceURI);
  registerAbout();

  Cu.import("${PATH_MODULE}/new-window.js", null).
    Bootstrap.
      extensionStartup(m_isInstall);
}


function shutdown(data, reason) {
  if (reason === APP_SHUTDOWN) {
    return;
  }

  Cu.import("${PATH_MODULE}/new-window.js", null).
    Bootstrap.
      extensionShutdown();

  unregisterAbout();
  unloadModules();
  registerResourceProtocol(null);
}


function unloadModules() {
  Cu.unload("${PATH_MODULE}/commands.js");
  Cu.unload("${PATH_MODULE}/menus.js");
  Cu.unload("${PATH_MODULE}/popup.js");
  Cu.unload("${PATH_MODULE}/error.js");
  Cu.unload("${PATH_MODULE}/main.js");
  Cu.unload("${PATH_MODULE}/new-window.js");
}


// chrome.manifest line:
// resource ext-modules modules/
function registerResourceProtocol(uri) { // null to unregister
  var io = Services.io;
  var module = uri ? io.newURI(uri.resolve("modules/"), null, null) : null;
  io.getProtocolHandler("resource")
    .QueryInterface(Ci.nsIResProtocolHandler)
    .setSubstitution("${EXT_HOST}", module);
}


function registerAbout() {
  var Cm = Components.manager;
  Cm.QueryInterface(Ci.nsIComponentRegistrar).registerFactory(
    Components.ID("${XPCOM_ABOUT_CLASS}"),
    "about multifox",
    "${XPCOM_ABOUT_CONTRACT}",
    AboutMultifoxFactory);
}


function unregisterAbout() {
  var Cm = Components.manager;
  Cm.QueryInterface(Ci.nsIComponentRegistrar).unregisterFactory(
    Components.ID("${XPCOM_ABOUT_CLASS}"),
    AboutMultifoxFactory);
}


var AboutMultifoxFactory = {
  createInstance: function(outer, iid) {
    if (outer !== null) {
      throw Components.resources.NS_ERROR_NO_AGGREGATION;
    }
    return AboutMultifoxImpl.QueryInterface(iid);
  }
};


var AboutMultifoxImpl = {
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIAboutModule]),
  getURIFlags: function(uri) {
    return Ci.nsIAboutModule.ALLOW_SCRIPT;
  },

  newChannel: function(uri) {
    var channel = Services.io.newChannel("${PATH_CONTENT}/about-multifox.html", null, null);
    channel.originalURI = uri;
    return channel;
  }
};
