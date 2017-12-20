Subscriptions = new SubsManager();
var autourl = new Autourl();

FlowRouter.subscriptions = function() {
  this.register('apps', Subscriptions.subscribe('apps.userOwned'));
  this.register('userInfo', Subscriptions.subscribe('user.userInfo'));
  this.register('getCollabApps', Subscriptions.subscribe('apps.collaboratored'));
};

FlowRouter.triggers.enter([setTitles]);
FlowRouter.triggers.exit([autourl.trackPreviousContext]);

FlowRouter.route('/', {
  action: function() {
    // sending an empty options object to make sure options.ignoreLoginCheck
    // revalidated
    BlazeLayout.render('layout.main', { main: 'apps' });
  }
});

FlowRouter.route('/sign-in', {
  action: function() {
    var options = {
      isSignInPage: true,
      ignoreLoginCheck: true
    };

    BlazeLayout.render('layout.main', { main: 'signIn', options: options });
  }
});

FlowRouter.route('/sign-up', {
  action: function() {
    var options = {
      isSignUpPage: true,
      ignoreLoginCheck: true
    };

    BlazeLayout.render('layout.main', { main: 'signIn', options: options });
  }
});

FlowRouter.route('/forgot-password', {
  action: function() {
    var options = {
      ignoreLoginCheck: true
    };
    BlazeLayout.render('layout.main', {
      main: 'forgotPassword',
      options: options
    });
  }
});

FlowRouter.route('/create-app', {
  action: function() {
    BlazeLayout.render('layout.main', { main: 'apps.create' });
  }
});

FlowRouter.route('/debug', {
  name: 'debug',
  action: function() {
    var options = {
      ignoreLoginCheck: true
    };
    BlazeLayout.render('layout.main', { main: 'debug', options: options });
  }
});

FlowRouter.route('/apps/:appId/:section/:subSection', {
  name: 'app',
  triggersEnter: [
    legacyUrlRedirects,
    redirectToNewProfiler,
    resoultionsToRanges,
    UrlStateManager.triggers.saveGlobalQueryParams,
    UrlStateManager.triggers.saveSubSection,
    UrlStateManager.triggers.saveLastPath,
    autourl.handle
  ],
  subscriptions: function(params) {
    var appId = params.appId;

    this.register('pendingUsers', Subscriptions.subscribe('apps.pendingUsers', appId));
    this.register('collaborators', Subscriptions.subscribe('apps.collaborators', appId));
    this.register('alerts', Subscriptions.subscribe('alerts', appId));
    this.register('admin', Subscriptions.subscribe('apps.admin', appId));
  },
  action: function() {
    BlazeLayout.render('layout.main', { main: 'app' });
  }
});

FlowRouter.route('/invite/:inviteId', {
  action: function() {
    BlazeLayout.render('layout.main', { main: 'app.share.invite' });
  }
});

FlowRouter.route('/account/:section?', {
  triggersEnter: [
    function(context) {
      // only allowed these sections.
      // otherwise, redirects to the billing section
      var sections = ['billing', 'plans', 'profile'];
      var isAllow = sections.indexOf(context.params.section);
      BlazeLayout.render('layout.main', { main: 'account' });
      if (isAllow < 0) {
        FlowRouter.redirect('/account/billing');
      }
    }
  ],
  action: function() {
    BlazeLayout.render('layout.main', { main: 'account' });
  }
});

FlowRouter.route('/mt/:traceId/:appId?', {
  action: function() {
    var options = {
      ignoreLoginCheck: true
    };
    BlazeLayout.render('layout.main', {
      main: 'traceExplorer.shared',
      options: options
    });
  }
});

FlowRouter.route('/pt/:traceId/:appId?', {
  action: function() {
    var options = {
      ignoreLoginCheck: true
    };
    BlazeLayout.render('layout.main', {
      main: 'traceExplorer.shared',
      options: options
    });
  }
});

FlowRouter.route('/et/:traceId/:appId?', {
  action: function() {
    var options = {
      ignoreLoginCheck: true
    };
    BlazeLayout.render('layout.main', {
      main: 'traceExplorer.shared',
      options: options
    });
  }
});

FlowRouter.route('/redirect', {
  name: 'redirect',
  action: function() {
    BlazeLayout.render('layout.redirect');
  }
});

FlowRouter.notFound = {
  action: function() {
    // We've removed "selection" param from the "app" route
    // So, it's possible to have wrong urls in the localStorage
    // We need to detect it and fix it
    // XXX we can remove this code sometimes later.
    var path = FlowRouter.current().path;
    var matched = path.match(/\/apps\/(\w+)\//);
    if (matched) {
      var appId = matched[1];
      FlowRouter.go('app', {
        appId: appId,
        section: 'dashboard',
        subSection: 'overview'
      });
    }
  }
};

function legacyUrlRedirects(context, redirect) {
  const { section, subSection } = context.params;
  // these are the redirects of URLs we had in the first version of the app
  if (section === 'pubsub' || section === 'methods') {
    const params = {
      appId: context.params.appId,
      section: 'dashboard',
      subSection: section
    };
    redirect('app', params, context.queryParams);
  }
  // redirect if an user visit insights
  if (section === 'insights' && subSection === 'summary') {
    const insightsParams = {
      appId: context.params.appId,
      section: 'dashboard',
      subSection: 'overview'
    };
    redirect('app', insightsParams, context.queryParams);
  }
}

// redirect to new profiler if comes from old url
function redirectToNewProfiler(context, redirect) {
  var isOldProfilerUrl =
    context.params.section === 'profiler' && context.params.subSection === 'overview';
  if (isOldProfilerUrl) {
    var path = '/apps/' + context.params.appId + '/tools/cpu-profiler';
    redirect(path, context.params, context.queryParams);
  }
}

var RESOLUTION_TO_RANGE = {
  '1min': KadiraData.Ranges.getValue('1hour'),
  '30min': KadiraData.Ranges.getValue('7day'),
  '3hour': KadiraData.Ranges.getValue('1hour')
};

function resoultionsToRanges(context, redirect) {
  context.queryParams = context.queryParams || {};
  var res = context.queryParams.res;
  var range = RESOLUTION_TO_RANGE[res];
  if (range > 0) {
    var queryParams = _.omit(context.queryParams, 'res');
    queryParams.range = range;
    redirect('app', context.params, queryParams);
  }
}

function setTitles() {
  document.title = 'Kadira - Performance Monitoring for Meteor Apps';
}
