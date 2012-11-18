(function($scope) {
	"use strict";
	
	var 
		$servers = [], 
		$server_by_id = {};
	
	var OPDS = {
		register: function($opds_server) {
			var $server = Object.create(OPDS_Server, {$uri: {value: $opds_server}});
			$servers.push($server);
			$server_by_id[$opds_server] = $server;
		}, 
		servers: function() {
			return $servers;
		}, 
		server: function($id) {
			return $server_by_id[$id];
		}
	};
	
	var OPDS_Server = {
		get: function($uri, $callback) {
			var $a = document.createElement('a');
			$a.href = $uri;
			
			if($a.host === window.location.host) {
				if(this.$root !== undefined) {
					$a.href = this.$uri;
					$uri = 'http://' + $a.host + '/' + $uri;
				}
				else {
					$uri = 'http://' + $uri;
				}
			}
			
			var $xhr = new XMLHttpRequest({mozSystem: true});
			$xhr.open('GET', $uri);
			$xhr.responseType = 'document';
			$xhr.onreadystatechange = function($event) {
				if(this.readyState === 4) {
					if(this.status === 200) {
						$callback(this.response);
					}
					else {
						$callback(null);
					}
				}
			};
			$xhr.send();
		}, 
		root: Utils.cache(function($callback) {
			var $uri = document.createElement('a');
			$uri.href = this.$uri;
			this.get(this.$uri, function($doc) {
				if($doc === null) {
					$callback($doc);
				}
				else {
					var $start = $doc.querySelector('feed > link[rel=start]');
					
					var $start_uri = $start.getAttribute('href');
					if($uri.pathname+$uri.search !== $start_uri) {
						this.get($uri.protocol+'//'+$uri.host+$start_uri, $callback);
					}
					else {
						$callback($doc);
					}
				}
			}.bind(this));
		}, '$root'), 
		id: function($callback) {
			this.root(function($root) {
				if($root === null) {
					$callback(null);
				}
				else {
					$callback(
						$root.querySelector('feed > id').textContent
					);
				}
			});
		}, 
		title: function($callback) {
			this.root(function($root) {
				if($root === null) {
					$callback(null);
				}
				else {
					$callback(
						$root.querySelector('feed > title').textContent, 
						$root.querySelector('feed > subtitle').textContent
					);
				}
			});
		}, 
		icon: function($callback) {
			this.root(function($root) {
				if($root === null) {
					$callback(null);
				}
				else {
					$callback(
						$root.querySelector('feed > icon').textContent
					);
				}
			});
		}, 
		searchengine: function($callback) {
			if(this.$searchengine === undefined) {
				this.root(function($root) {
					if($root === null) {
						$callback(null);
					}
					else {
						var $search = $root.querySelector('feed > link[rel=search][type="application/opensearchdescription+xml"]');
						if($search === null) {
							this.$searchengine = null;
							$callback(null);
						}
						else {
							this.get($search.getAttribute('href'), function($search) {
								this.$searchengine = $search;
								$callback($search);
							}.bind(this));
						}
					}
				}.bind(this));
			}
			else {
				$callback(this.$searchengine);
			}
		}
	};
	
	$scope.OPDS = OPDS;
}) (window);
