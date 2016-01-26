'use strict';

var entityMap = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': '&quot;', "'": '&#39;', "/": '&#x2F;' };
function escapeHtml(string) { return String(string).replace(/[&<>"'\/]/g, function (s) { return entityMap[s]; }); }

angular
  .module('tnCommunityBrowserApp', ['ngRoute','frapontillo.bootstrap-switch','xeditable'])
  .run(['$rootScope', '$location', 'editableOptions', 'TNSession', function ($rootScope, $location, editableOptions, TNSession) {
    editableOptions.theme = 'bs3';
    _.mixin(s.exports());
    var openRoutes = ['/login'];
    var cleanRoute = function (route) {
      return _.find(openRoutes, function (r) { return _.startsWith(route, r)});
    };

    $rootScope.$on('$routeChangeStart', function (event,next,current) {
      if (!cleanRoute($location.url()) && !TNSession.isLoggedIn())
        $location.path('/login');
    });

    $rootScope.isActive = function (path) {
      return _.startsWith($location.path(), path);
    }

    var updateSession = function (e) {
      $rootScope.isLoggedIn = TNSession.isLoggedIn();
      $rootScope.username = TNSession.getUsername();
      $rootScope.guid = TNSession.getGuid();
    };
    var handleLogout = function (e) {
      updateSession();
      if (!_.startsWith($location.url(), '/login'))
        $location.path('/login');
    };
    $rootScope.$on('TNSession.login', updateSession);
    $rootScope.$on('TNSession.logout', handleLogout);
    $rootScope.$on('TNSession.expired', handleLogout);
  }])
  .config(['$routeProvider', function ($routeProvider) {
    $routeProvider
      .when('/login', {templateUrl:'views/login.html', controller:'LoginCtrl', controllerAs:'loginCtrl'})
      .when('/profile', {templateUrl:'views/profile.html', controller:'ProfileCtrl', controllerAs:'profile'})
      .when('/player/:guid', {templateUrl:'views/player.html', controller:'PlayerCtrl', controllerAs:'player'})
      .when('/tribe/:tribeId', {templateUrl:'views/tribe.html', controller:'TribeCtrl', controllerAs:'tribe'})
      .when('/search', {templateUrl:'views/search.html', controller:'SearchCtrl', controllerAs:'search'})
      .when('/create', {templateUrl:'views/create.html', controller:'CreateTribeCtrl', controllerAs:'tribe'})
      .otherwise({ redirectTo: '/login' });
  }])
  .filter('preserve_space', function () { return function (input) {return (input||'').replace(/ /g, '\xa0')} })
  .filter('yes_no', function () { return function (input) {return (input=='1')?'yes':'no'}})
  .filter('titleize', function () {return function (input) {return _.titleize(input)}})
  .directive('tribeLink', function () {
    return {
      restrict: 'E',
      scope: {
        id: '=',
        tag: '=',
        name: '=',
        append: '='
      },
      template: '<a href="#/tribe/{{id}}"><span class="tag" ng-show="append==0">{{tag|preserve_space}}</span>{{name|preserve_space}}<span class="tag" ng-show="append==1">{{tag|preserve_space}}</span></a>'
    };
  })
  .directive('playerLink', function () {
    return {
      restrict: 'E',
      scope: {
        guid: '=',
        tag: '=',
        name: '=',
        append: '='
      },
      template: '<a href="#/player/{{guid}}"><span class="tag" ng-show="append==0">{{tag|preserve_space}}</span>{{name|preserve_space}}<span class="tag" ng-show="append==1">{{tag|preserve_space}}</span></a>'
    };
  })
  .directive('historyItem', function () {
    return {
      link: function (scope, element, attrs) {
        var template = (scope.item.template || '');
        // Populate with @payload components...
        var payload = scope.item.payload || '';
        var payloads = payload.split('\t');
        template = template.replace(/@payload(;(\d+))?[\^]?/gi, function (_,__,g) {
          if (g !== undefined) return payloads[g]; return payload;
        });
        // Escape HTML
        template = escapeHtml(template);
        // Populate with @clan and @user link(s)
        template = template.replace(/@(clan|player[12]?)/gi, function (w) {
          var result;
          switch (w) {
            case '@clan':
              var clan = scope.item.clan;
              var tag = '<span class="tag">' + escapeHtml((clan.tag || '').replace(/ /g, '\xa0')) + '</span>';
              var name = escapeHtml((clan.name || '').replace(/ /g, '\xa0'));
              if (clan.append == '0')
                result = tag + name;
              else
                result = name + tag;
              return '<em><a href="#/tribe/' + clan.id + '">' + result + '</a></em>';
            case '@player':
              var player = scope.item.player;
              var tag = '<span class="tag">' + escapeHtml((player.tag || '').replace(/ /g, '\xa0')) + '</span>';
              var name = escapeHtml((player.name || '').replace(/ /g, '\xa0'));
              if (player.append == '0')
                result = tag + name;
              else
                result = name + tag;
              return '<em><a href="#/player/' + player.guid + '">' + result + '</a></em>';
            case '@player1':
              var player = scope.item.user1;
              var tag = '<span class="tag">' + escapeHtml((player.tag || '').replace(/ /g, '\xa0')) + '</span>';
              var name = escapeHtml((player.name || '').replace(/ /g, '\xa0'));
              if (player.append == '0')
                result = tag + name;
              else
                result = name + tag;
              return '<em><a href="#/player/' + player.guid + '">' + result + '</a></em>';
            case '@player2':
              var player = scope.item.user2;
              var tag = '<span class="tag">' + escapeHtml((player.tag || '').replace(/ /g, '\xa0')) + '</span>';
              var name = escapeHtml((player.name || '').replace(/ /g, '\xa0'));
              if (player.append == '0')
                result = tag + name;
              else
                result = name + tag;
              return '<em><a href="#/player/' + player.guid + '">' + result + '</a></em>';
          }
        });
        // Output
        element.html(template);
      }
    }
  })
  .directive('logoutButton', ['TNSession', function (TNSession) {
    return { link: function (scope, element, attrs) { 
        element.bind('click', function () { if (TNSession.isLoggedIn()) TNSession.logout()})}} 
  }])
  .controller('LoginCtrl', ['$scope', '$timeout', '$location', 'Notice', 'TNSession', function ($scope, $timeout, $location, notice, TNSession) {
    $scope.messages = notice.messages;

    $scope.login = function (username, password) {
      TNSession
        .login(username, password)
        .then(
            function (response) { $location.path('/profile'); },
            function (error) { notice.error(error) })
        .finally(function () { $scope.password = null; });
    };

    $scope.logout = function () {
      TNSession
        .logout()
        .then(
            function () { notice.success('You have been logged out.'); },
            function (error) { notice.error(error) });
    };

    /*
    $scope.$watch('TNSession.expired', function() {
      notice.info('You have been logged out due to inactivity.', 0);
    });
    */
  }])
  .controller('ProfileCtrl', ['$scope', 'Notice', 'TNSession', function ($scope, notice, TNSession) {
    $scope.messages = notice.messages;

    var getProfile = function () {
      TNSession.sendRequest('userview', {id: TNSession.getGuid()})
        .then(function (r) {$scope.info = r},
              function (e) {notice.error('An error was encountered while retrieving profile details.')});
    };
    var getHistory = function () {
      TNSession.sendRequest('userhistory', {id: TNSession.getGuid()})
        .then(function (r) {$scope.history = r},
              function (e) {notice.error('An error was encountered while retrieving profile history.')});
    };
    var getInvites = function () {
      TNSession.sendRequest('userinvites', {})
        .then(function (r) {$scope.invites = r},
              function (e) {notice.error('An error was encountered while retrieving tribe invitations.')});
    };

    $scope.$watch('TNSession.login', function (e) {
      $scope.messages = [];
      getProfile();
      getHistory();
      getInvites();
    });
    $scope.$watch('TNSession.logout', function (e) {
      $scope.info = null;
      $scope.history = null;
    });

    $scope.setDescription = function (description) { return TNSession.sendRequest('userinfo', {info:description}) };
    $scope.setWebsite = function (website) { return TNSession.sendRequest('usersite', {site:website}) };
    $scope.setName = function (name) { return TNSession.sendRequest('username', {name:name}) };

    $scope.setActiveTribe = function (tribeId,tag,append) {
      TNSession.sendRequest('userclan', {id:tribeId})
        .then(function (r) {$scope.info.append=append; return true;},
              function (e) {getProfile(); notice.error('Unable to set active tribe: ' + e)});
    };

    $scope.acceptInvite = function (invite) {
      return TNSession.sendRequest('useraccept', {id:invite.clan.id})
        .then(function () {
          notice.success('You have joined ' + invite.clan.name + '.')
          var index = $scope.invites.indexOf(invite);
          if (index !== -1) {
            $scope.invites.splice(index,1);
          }
          getProfile();
        },
        function (e) {notice.error('Error accepting invitation to ' + invite.clan.name + ': ' + e)});
    };

    $scope.rejectInvite = function (invite) {
      return TNSession.sendRequest('userreject', {id:invite.clan.id})
        .then(function () {
          notice.success('Invitation to ' + invite.clan.name + ' rejected.');
          var index = $scope.invites.indexOf(invite);
          if (index !== -1) {
            $scope.invites.splice(index,1);
          }
        },
        function (e) {notice.error('Error rejecting invitation to ' + invite.clan.name + ': ' + e)});
    };

    $scope.leaveTribe = function (tribe) {
      return TNSession.sendRequest('userleave', {id:tribe.id})
        .then(function () {
          notice.success('You have left ' + tribe.name);
          getProfile();
          return true;
        });
    };
  }])
  .controller('PlayerCtrl', ['$scope', '$routeParams', 'Notice', 'TNSession', function ($scope, $routeParams, notice, TNSession) {
    var guid = $routeParams.guid;
    TNSession.sendRequest('userview', {id: guid})
      .then(function (r) {$scope.info = r},
            function (e) {notice.error('An error was encountered while retrieving player details.\n' + e)});
    TNSession.sendRequest('userhistory', {id: guid})
      .then(function (r) {$scope.history = r},
            function (e) {notice.error('An error was encountered while retrieving player history.\n' + e)});
  }])
  .controller('TribeCtrl', ['$scope', '$routeParams', '$filter', 'Notice', 'TNSession', function ($scope,$routeParams,$filter,notice,TNSession) {
    $scope.messages = notice.messages;
    var tribeId = $routeParams.tribeId;
    $scope.canKick = function (member) { return $scope.isMember && $scope.canKickMembers && $scope.membership.rank > member.rank; };
    $scope.canSetRank = function (member) { return $scope.isMember && $scope.canSetMemberRanks && (member.guid == TNSession.getGuid() || $scope.membership.rank > member.rank); };

    var clearPermissions = function () {
      $scope.membership = null;
      $scope.isMember = false;
      $scope.availableRanks = [];
      $scope.canSetTag = $scope.canSetName = $scope.canSetWebsite = $scope.canSetPicture =
        $scope.canSetInfo = $scope.canSetRecruiting = $scope.canSendInvite = $scope.canViewInvites =
        $scope.canDisband = $scope.canKickMembers = $scope.canSetMemberRanks = false;
    };

    var updatePermissions = function () {
      var results = $filter('filter')($scope.info.members, {guid:TNSession.getGuid()}, true);
      $scope.membership = results.pop();
      $scope.isMember = $scope.membership != null;
      $scope.canViewInvites = $scope.isMember;
      if ($scope.isMember) {
        var rank = $scope.membership.rank;
        if (rank >= 2) {
          $scope.canSetRecruiting = $scope.canSendInvite = true;
          $scope.getInvites();
        }
        if (rank >= 3) {
          $scope.canSetTag = $scope.canSetName = $scope.canSetWebsite = $scope.canSetPicture =
            $scope.canSetInfo = $scope.canKickMembers = $scope.canSetMemberRanks = true;
        }
        if (rank >= 4) {
          $scope.canDisband = true;
        }
        if ($scope.canSetMemberRanks) {
          var ranks = [{key:'0', value:'0 - Probationary Member'},{key:'1',value:'1 - Member'},
            {key:'2',value:'2 - Senior Member'},{key:'3',value:'3 - Administrator'}];
          if (rank >= 4) ranks.push({key:'4',value:'4 - Leader'});
          $scope.availableRanks = ranks;
        }
      }
    };

    $scope.getInfo = function () {
      clearPermissions();
      TNSession.sendRequest('clanview', {id: tribeId})
        .then(function (r) {$scope.info = r; updatePermissions(); },
              function (e) {notice.error('An error was encountered while retrieving tribe details.\n' + e)});
    };
    $scope.getHistory = function () {
      TNSession.sendRequest('clanhistory', {id: tribeId})
        .then(function (r) {$scope.history = r},
              function (e) {notice.error('An error was encountered while retrieving tribe history.\n' + e)});
    };
    $scope.getInvites = function () {
      TNSession.sendRequest('clanviewinvites', {id:tribeId})
        .then(function (r) {$scope.invites = r;},
              function (e) {notice.error('An error was encountered while retrieving tribe invitations.\n' + e)});
    };
    $scope.setRecruiting = function (isRecruiting) {
      return TNSession.sendRequest('clanrecruit', {id:tribeId, v:(isRecruiting?'1':'0')})
        .then(null, function (e) {return e});
    }
    $scope.setDescription = function (description) { return TNSession.sendRequest('claninfo', {id:tribeId, v:description}) };

    var oldTag; var oldAppend;
    $scope.presetTag = function (tag,append) {oldTag=tag; oldAppend=append;};
    $scope.setTag = function (tag,append) {
      return TNSession.sendRequest('clantag', {id:tribeId, tag:tag, append:append})
        .then(null, function (e) {$scope.info.tag=oldTag; $scope.info.append=oldAppend;return e;});
    };
    $scope.setWebsite = function (website) { return TNSession.sendRequest('clansite', {id:tribeId, v:website}) };
    $scope.setName = function (name) { return TNSession.sendRequest('clanname', {id:tribeId, v:name}) };
    $scope.setPicture = function (path) { return TNSession.sendRequest('clanpicture', {id:tribeId, v:path}) };
    $scope.setRank = function (target,rank,title) { return TNSession.sendRequest('clanrank', {id:tribeId, to:target, rank:rank, title:title}) };
    $scope.disband = function (authorize) { return TNSession.sendRequest('clandisband', {id:tribeId, v:authorize})};
    $scope.kickMember = function (target,accept) {
      if ('Yes'==accept)
        return TNSession.sendRequest('clankick', {id:tribeId, to:target})
                .then(function (r) {$scope.getInfo(); return true;});
      return false;
    };

    $scope.searchResults = [];
    $scope.showSearchResults = false;
    $scope.searchAlert = null;
    $scope.searchAlertType = null;

    $scope.searchPlayers = function (name) {
      $scope.searchResults = [];
      $scope.searchAlert = $scope.searchAlertType = null;
      $scope.showSearchResults = false;

      TNSession.sendRequest('usersearch', {q:name})
        .then(function (r) {
          $scope.searchResults = r;
          $scope.showSearchResults = (r != null && r.length > 0);
          $scope.searchAlertType = 'info';
          if (!$scope.showSearchResults)
            $scope.searchAlert = 'No results found';
        },
        function (e) {$scope.searchAlertType='danger'; $scope.searchAlert = 'Search failed: ' + e;});
    };
    $scope.sendInvite = function(target,accept) {
      if ('Yes'==accept)
        return TNSession.sendRequest('claninvite', {id:tribeId, to:target})
                  .then(function (r) {$scope.getInvites(); return true;});
      return false;
    };

    $scope.getInfo();
    $scope.getHistory();
  }])
  .controller('SearchCtrl', ['$scope', '$timeout', 'Notice', 'TNSession', function ($scope, $timeout, notice, TNSession) {
    $scope.messages = notice.messages;
    $scope.searchMode = 'Tribes';
    $scope.searchModes = ['Tribes', 'Players'];
    $scope.resultMode = null;
    $scope.showResults = false;
    $scope.playerResults = [];
    $scope.tribeResults = [];

    var clearResults = function () {
      $scope.resultMode = null;
      $scope.showResults = false;
      $scope.playerResults = [];
      $scope.tribeResults = [];
    };

    var setResults = function (mode, results) {
      switch (mode) {
        case 'Players': $scope.playerResults = results;
        case 'Tribes': $scope.tribeResults = results;
      }
      $scope.showResults = (results != null && results.length > 0);
      if (!$scope.showResults)
        notice.info('No results found');
      $scope.resultMode = mode;
    };

    $scope.search = function (name, mode) {
      var method = ('Tribes' == mode) ? 'clansearch' : 'usersearch';
      clearResults();
      TNSession.sendRequest(method, {q:name})
        .then(function (r) { setResults(mode,r); },
              function (e) { notice.error('Search failed: ' + e); });
    };
  }])
  .controller('CreateTribeCtrl', ['$scope', '$timeout', 'Notice', 'TNSession', function ($scope, $timeout, notice, TNSession) {
    $scope.messages = notice.messages;
    $scope.resetInputs = function () {
      $scope.name = $scope.tag = $scope.info = null;
      $scope.append = $scope.recruiting = 'Yes';
    };
    $scope.resetInputs();

    $scope.createTribe = function (name, tag, append, recruiting, info) {
      append = ('Yes' == append) ? '1':'0';
      recruiting = ('Yes' == recruiting) ? '1':'0';
      TNSession.sendRequest('createclan', {name:name, tag:tag, append:append, recruiting:recruiting,info:info})
        .then(function (r) { notice.success('Tribe created successfully.'); $scope.resetInputs()},
              function (e) { notice.error(e)});
    };
  }])
  .factory('Notice', ['$timeout', function($timeout) {
    var service = {messages: []};

    var removeAlert = function (alert) {
      var index = service.messages.indexOf(alert);
      if (index !== -1) {
        alert = service.messages.splice(index,1)[0];
        if (undefined !== alert.expire)
          $timeout.cancel(alert.expire);
      }
    };

    var addAlert = function (type, message, timeout) {
      if (undefined === timeout) { timeout = 5000; }
      var alert= {type:type, message:message};
      alert.pop = function() {removeAlert(alert)};
      if (timeout > 0)
        alert.expire = $timeout(alert.pop, timeout);
      service.messages.push(alert);
    };

    service.push = addAlert;
    service.info = function (message, timeout) {addAlert('info', message, timeout)};
    service.warn = function (message, timeout) {addAlert('warning', message, timeout)};
    service.error = function (message, timeout) {addAlert('danger', message, timeout)};
    service.success = function (message, timeout) {addAlert('success', message, timeout)};
    service.clear = function () {service.messages = []};

    return service;
  }])
  .factory('TNSession', ['$timeout', '$rootScope', '$http', '$q', function ($timeout,$root, $http, $q) {
    var service = { _isLoggedIn:false, username:null, guid:null, uuid:null, expires:null };

    var sendSessionRequest = function (payload) {
      var params = angular.extend({jsonp:'JSON_CALLBACK'}, payload);
      var deferred = $q.defer();
      $http.jsonp('http://thyth.com/tn/json/json_session.php', {params:params})
        .then(
            function (response) {
              if ('error' === response.data.status) { deferred.reject(response.data.message); }
              else { deferred.resolve(response.data); }
            },
            function (error) { deferred.reject(error.data || 'Request failed'); });
      return deferred.promise;
    };

    var clearSessionTimeout = function (reset) {
      var expires = service.expires;
      if (expires)
        $timeout.cancel(expires);
      if (reset)
        expires = $timeout(timeoutSession, 15*60000);
      else
        expires = null;
      service.expires = expires;
      return expires;
    };

    var clearSession = function () {
      clearSessionTimeout(false);
      service._isLoggedIn = false;
      service.username = service.uuid = service.guid = service.expires = null;
    };

    var timeoutSession = function () {
      clearSession();
      $root.$broadcast('TNSession.expired');
    };

    service.isLoggedIn = function () { return service._isLoggedIn; };
    service.getUsername = function () { return service.username; };
    service.getGuid = function () { return service.guid; };

    service.login = function (username, password) {
      clearSession();
      return sendSessionRequest({method:'login', un:username, pw:password})
        .then(function (response) {
          service._isLoggedIn = true;
          service.username = username;
          service.uuid = response.uuid;
          service.guid = response.guid;
          service.expires = clearSessionTimeout(true);
          $root.$broadcast('TNSession.login');
          return response;
        });
    };

    service.logout = function () {
      return sendSessionRequest({method:'logout', uuid:service.uuid, guid:service.guid})
        .then(function () { clearSession(); $root.$broadcast('TNSession.logout'); });
    };

    service.sendRequest = function (method, payload) {
      var deferred = $q.defer();
      var params = {
        jsonp: 'JSON_CALLBACK',
        method: method,
        uuid: service.uuid,
        guid: service.guid,
        payload: JSON.stringify(payload)
      };
      $http.jsonp('http://thyth.com/tn/json/json_browser.php', {method:'POST', params:params})
        .then(
            function (response) {
              switch (response.data.status) {
                case 'error': deferred.reject(response.data.msg); break;
                case 'success': deferred.resolve(response.data['payload']); break;
                default: deferred.resolve(response.data); break;
              }
              clearSessionTimeout(true);
            },
            function (error) { deferred.reject(error.data || 'Request failed') });
      return deferred.promise;
    };

    return service;
  }]);
