(function($scope) {
	"use strict";
	
	var Trigger = {
		addEventListener: function($event_name, $callback) {
			if(this.event_listeners === undefined) {
				this.event_listeners = {};
			}
			
			if(this.event_listeners[$event_name] === undefined) {
				this.event_listeners[$event_name] = [];
			}
			
			this.event_listeners[$event_name].push($callback);
		}, 
		
		trigger: function($event, $data) {
			if(typeof $event === 'string') {
				$event = new Event($event);
			}
			
			if($data !== undefined) {
				for(var $i in $data) {
					$event[$i] = $data[$i];
				}
			}
			
			console.info(this, $event);
			
			if(this.event_listeners === undefined) {
				return;
			}
			
			if(this.event_listeners[$event.type] === undefined) {
				return;
			}
			
			this.event_listeners[$event.type].forEach(function($callback) {
				$callback.call(this, $event);
			}.bind(this));
		}
	};
	
		
	var Library = (function() {
		
		var 
			$db, 
			store = function($ebook, $type) {
				var 
					$transaction = $db.transaction(['metadata', 'files'], 'readwrite'), 
					$identifier  = $ebook.identifier().value, 
					$blob        = $ebook.blob, 
					$metadata    = $ebook.metadata(), 
					$ebooks      = [];
				
				$transaction.addEventListener('complete', function($event) {
					this.trigger('added', {
						$metadata: $metadata
					});
					
					this.trigger('changed', {
						$ebooks: $ebooks
					});
				}.bind(this));
				
				$metadata.type = $type;
				
				$transaction.objectStore('metadata').put($metadata, $identifier);
				$transaction.objectStore('files').put($blob, $identifier);
				$transaction.objectStore('metadata').openCursor().addEventListener('success', function($event) {
					var $cursor = $event.target.result;
					
					if($cursor !== null && $cursor !== undefined) {
						$ebooks.push($cursor.value);
						$cursor.continue();
					}
				});
			};
		
		return {
			init: function() {
				var $request = indexedDB.open('web-reader', 1);
				
				$request.addEventListener('success', function($event) {
					var $ebooks = [];
					$db = $event.target.result;
					
					this.trigger('initied');
					
					var $transaction = $db.transaction('metadata');
					$transaction.addEventListener('complete', function($event) {
						this.trigger('changed', {
							$ebooks: $ebooks
						});
					}.bind(this));
					
					$transaction.objectStore('metadata').openCursor().addEventListener('success', function($event) {
						var $cursor = $event.target.result;
						
						if($cursor !== null && $cursor !== undefined) {
							$ebooks.push($cursor.value);
							$cursor.continue();
						}
					});
				}.bind(this));
				
				
				$request.addEventListener('upgradeneeded', function($event) {
					switch($event.oldVersion) {
						case 0:
							this.result.createObjectStore('metadata');
							this.result.createObjectStore('files');
					}
				});
			}, 
			
			delete: function($identifier) {
				var 
					$transaction = $db.transaction(['metadata', 'files'], "readwrite"), 
					$ebooks = [];
				
				$transaction.addEventListener('complete', function($event) {
					this.trigger('deleted', {
						$identifier: $identifier
					});
					
					this.trigger('changed', {
						$ebooks: $ebooks
					});
				}.bind(this));
				
				$transaction.objectStore('metadata').delete($identifier);
				$transaction.objectStore('files').delete($identifier);
				$transaction.objectStore('metadata').openCursor().addEventListener('success', function($event) {
					var $cursor = $event.target.result;
					
					if($cursor !== null && $cursor !== undefined) {
						$ebooks.push($cursor.value);
						$cursor.continue();
					}
				});
			}, 
			
			add: function($file) {
				this.trigger('adding');
				
				var $handler = WR.handler($file.type);
				
				if($handler !== undefined) {
					var $reader = new FileReader();
					
					$reader.onloadend = function($e) {
						var $ebook = $handler.factory($e.target.result);
						store.call(this, $ebook, $file.type);
					}.bind(this);
					
					$reader.readAsBinaryString($file);
				}
			}, 
			
			load: function($identifier, $callback) {
				var 
					$metadata, 
					$blob, 
					complete = function() {
						if($metadata !== undefined && $blob !== undefined) {
							var 
								$handler = WR.handler($metadata.type);
							
							if($handler !== undefined) {
								$callback($handler.factory($blob));
							}
						}
					};
				
				window.$db = $db;
				
				var $transaction = $db.transaction(['metadata', 'files'], 'readonly');
				$transaction.objectStore('metadata').get($identifier).addEventListener('success', function($event) {
					$metadata = $event.target.result;
					complete();
				});
				$transaction.objectStore('files').get($identifier).addEventListener('success', function($event) {
					$blob = $event.target.result;
					complete();
				});
			},
			
			addEventListener: Trigger.addEventListener, 
			trigger: Trigger.trigger
		};
	}) ();

	$scope.WR = (function() {
		
		var 
			$library, 
			$ebook_identifier, 
			$ebook, 
			$ebook_handlers = {}, 
			open = function($ebook, $spine, $hash) {
				this.trigger('open', {
					$metadata: $ebook.metadata(), 
					$ebook: $ebook, 
					$spine: $spine, 
					$hash: $hash
				});
			};
		
		return {
			init: function() {
				this.library().addEventListener('initied', function() {
					this.trigger('initied');
				}.bind(this));
				this.library().init();
			}, 
			
			register: function($mime, $handler, $name) {
				$ebook_handlers[$mime] = {
					factory: $handler, 
					name   : $name
				};
			}, 
			
			handler: function($mime) {
				return $ebook_handlers[$mime];
			}, 
			
			library: function() {
				if($library === undefined) {
					$library = Object.create(Library);
				}
				
				return $library;
			}, 
			
			open: function($identifier, $spine, $hash) {
				if($ebook_identifier === $identifier) {
					open($ebook, $spine, $hash).bind(this);
				}
				else {
					this.library().load($identifier, function($ebook) {
						open.call(this, $ebook, $spine, $hash);
					}.bind(this));
				}
			},
			
			addEventListener: Trigger.addEventListener, 
			trigger: Trigger.trigger
		};
		
		return WR;
	} ());
	
}) (window);
