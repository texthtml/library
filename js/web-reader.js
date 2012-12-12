(function($scope) {
	"use strict";
		
	var Library = (function() {
		
		var $db;
		
		return {
			init: function() {
				var $request = indexedDB.open('library', 1);
				
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
							this.result.createObjectStore('files');
							this.result.createObjectStore('metadata');
					}
				});
			}, 
			
			identifiers: function($callback) {
				var 
					$identifiers = [], 
					$transaction = $db.transaction('metadata');
				
				$transaction.addEventListener('complete', function($event) {
					$callback($identifiers);
				});
				
				$transaction.objectStore('metadata').openCursor().addEventListener('success', function($event) {
					var $cursor = $event.target.result;
					
					if($cursor !== null && $cursor !== undefined) {
						$identifiers.push($cursor.key);
						$cursor.continue();
					}
				});
			}, 
			
			list: function($callback) {
				var 
					$ebooks = {}, 
					$transaction = $db.transaction('metadata');
				
				$transaction.addEventListener('complete', function($event) {
					$callback($ebooks);
				});
				
				$transaction.objectStore('metadata').openCursor().addEventListener('success', function($event) {
					var $cursor = $event.target.result;
					
					if($cursor !== null && $cursor !== undefined) {
						$ebooks[$cursor.key] = $cursor.value;

						$cursor.continue();
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
			
			save: function($identifier, $metadata, $blob) {
				this.trigger('adding');
				
				var 
					$transaction = $db.transaction(['metadata', 'files'], 'readwrite'), 
					$ebooks      = [];
				
				$metadata.identifier.value = $identifier;
				$metadata.type = $blob.type;
				
				$transaction.addEventListener('complete', function($event) {
					this.trigger('added', {
						$identifier: $identifier, 
						$metadata  : $metadata
					});
					
					this.trigger('changed', {
						$ebooks: $ebooks
					});
				}.bind(this));
				
				$transaction.objectStore('metadata').put($metadata, $identifier);
				$transaction.objectStore('files').put($blob, $identifier);
				$transaction.objectStore('metadata').openCursor().addEventListener('success', function($event) {
					var $cursor = $event.target.result;
					
					if($cursor !== null && $cursor !== undefined) {
						$ebooks.push($cursor.value);
						$cursor.continue();
					}
				});
			}, 
			
			load: function($identifier, $callback) {
				var 
					$metadata, 
					$blob, 
					$transaction = $db.transaction(['metadata', 'files'], 'readonly'), 
					$file_request = $transaction.objectStore('files').get($identifier), 
					$metadata_request = $transaction.objectStore('metadata').get($identifier);

				$file_request.addEventListener('success', function($event) {
					$blob = $event.target.result;
				});
				$metadata_request.addEventListener('success', function($event) {
					$metadata = $event.target.result;
				});
				$transaction.addEventListener('complete', function($event) {
					var 
						$handler, 
						$ebook;
					
					if($metadata !== undefined) {
						$handler = WR.handler($metadata.type);
					}
					if($handler !== undefined && $blob !== undefined) {
						$ebook = $handler.factory($blob, typeof $metadata === 'object' ? $metadata.settings : undefined);
					}
					$callback($ebook, $metadata);
				});
			}, 
			
			metadata: function($identifier, $callback) {
				var $transaction = $db.transaction(['metadata', 'files'], 'readonly');
				
				$transaction.objectStore('metadata').get($identifier).addEventListener('success', function($event) {
					$callback($event.target.result);
				});
			}, 

			set_ebook_settings: function($ebook_identifier, $settings, $callback) {
				var 
					$transaction = $db.transaction(['metadata'], 'readwrite'), 
					$new_settings;
				
				$transaction.addEventListener('complete', function($event) {
					if(typeof $callback === 'function') {
						$callback($new_settings);
					}
				}.bind(this));
				
				$transaction.objectStore('metadata').get($ebook_identifier).addEventListener('success', function($event) {
					$new_settings = (this.result.settings || {});
					for(var $name in $settings) {
						$new_settings[$name] = $settings[$name];
					}

					this.result.settings = $new_settings;

					$transaction.objectStore('metadata').put(this.result, $ebook_identifier);
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
			
			formats: function() {
				var $formats = {};
				
				for(var $mime in $ebook_handlers) {
					$formats[$mime] = $ebook_handlers[$mime].name;
				}
				
				return $formats;
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
			
			build: function($file) {
				var $handler = $scope.WR.handler($file.type);
				
				if($handler !== undefined) {
					return $handler.factory($file);
				}
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
	} ());
	
}) (window);
