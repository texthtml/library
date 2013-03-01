(function($scope) {
	"use strict";
	
	var 
		$servers = [], 
		$server_by_id = {};
	
	var OPDS = {
		register: function($opds_server) {
			var $server = Object.create(OPDS_Server, {$uri: {value: $opds_server}});
			$servers.push($server);
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
			
			if($a.host === window.location.host && this.$uri !== location.origin) {
				$a.href = 'http://' + this.host() + $uri;
			}
			
			var $server = this;
			var $xhr = new XMLHttpRequest({mozSystem: true});
			$xhr.open('GET', $a.href);
			$xhr.responseType = 'document';
			$xhr.onreadystatechange = function($event) {
				if(this.readyState === 4) {
					if(this.status === 200) {
						if($server.$host === undefined) {
							$server.$host = $a.host;
						}
						
						$callback(this.response);
					}
					else {
						$callback(null);
					}
				}
			};
			$xhr.send();
		}, 
		host: function() {
			return this.$host || '';
		}, 
		root: Utils.cache(function($callback) {
			this.get(this.$uri, function($doc) {
				if($doc === null) {
					$callback($doc);
				}
				else {
					var $end = function($doc) {
						var $id = $doc.querySelector('feed > id');
						if($id) {
							$server_by_id[$id.textContent] = this;
						}

						$callback($doc);
					}.bind(this);

					var $start = $doc.querySelector('feed > link[rel=start],head > link[type="application/atom+xml;profile=opds-catalog"],head > link[type="application/atom+xml;profile=opds-catalog;kind=navigation"]');
					
					if($start !== null) {
						$start = $start.getAttribute('href');
					}

					if($start !== null && this.$uri !== $start) {
						this.get($start, $end);
					}
					else {
						$end($doc);
					}
				}
			}.bind(this));
		}, '$root'), 
		id: function($callback) {
			this.root(function($root) {
				var $id = null;
				if($root !== null) {
					$id = $root.querySelector('feed > id');
				}
				if($id !== null) {
					$id = $id.textContent;
				}
				$callback($id);
			});
		}, 
		title: function($callback) {
			this.root(function($root) {
				if($root === null) {
					$callback(null);
				}
				else {
					var 
						$title = $root.querySelector('feed > title'), 
						$subtitle = $root.querySelector('feed > subtitle');

					$callback(
						$title ? $title.textContent : null, 
						$subtitle ? $subtitle.textContent : null
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
					var $icon = $root.querySelector('feed > icon');
					$callback(
						$icon ? $icon.textContent : null
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
