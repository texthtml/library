if(!window.ArchiveReader) {
	
	function trigger($request, $event_type) {
		var $event = {
			type: $event_type, 
			target: $request
		};
		
		for(var $i in $request.$listeners[$event.type]) {
			$request.$listeners[$event.type][$i] ($event);
		}
	};
	
	var Request = {
		addEventListener: function($event, $callback) {
			if(this.$listeners === undefined) {
				this.$listeners = {};
			}
			
			if(this.$listeners[$event] === undefined) {
				this.$listeners[$event] = [];
			}
			
			this.$listeners[$event].push($callback);
		}
	};
	
	var ArchiveReader = function($blob) {
		this.$blob = $blob;
	}
	
	ArchiveReader.polyfill = true;
	
	ArchiveReader.prototype = {
		reader: Utils.cache(function($callback) {
			zip.createReader(new zip.BlobReader(this.$blob), $callback);
		}, '$reader'), 
		entries: Utils.cache(function($callback) {
			this.reader(function($reader) {
				$reader.getEntries($callback);
			})
		}, '$entries'), 
		entryids: Utils.cache(function($callback) {
			this.entries(function($entries) {
				var $entryids = {};
				for(var $i = 0; $i < $entries.length; $i++) {
					$entryids[$entries[$i].filename] = $i;
				}
				
				$callback($entryids);
			});
		}, '$entryids'), 
		entryid: Utils.cache(function($name, $callback) {
			this.entryids(function($entryids) {
				$callback($entryids[$name]);
			});
		}, function($name) {
			if(this.$entryid === undefined) {
				this.$entryid = {};
			}
			if(this.$entryid[$name] === undefined) {
				this.$entryid[$name] = {};
			}
			
			return this.$entryid[$name];
		}), 
		entry: Utils.cache(function($name, $callback) {
			this.entryid($name, function($entryid) {
				this.entries(function($entries) {
					$callback($entries[$entryid]);
				});
			}.bind(this));
		}, function($name) {
			if(this.$entry === undefined) {
				this.$entry = {};
			}
			if(this.$entry[$name] === undefined) {
				this.$entry[$name] = {};
			}
			
			return this.$entry[$name];
		}), 
		getFile: function($name) {
			var 
				$request = Object.create(Request), 
				$process = function() {
					this.entry($name, function($entry) {
						if($entry === undefined) {
							$request.result = null;
							trigger($request, 'error')
							return;
						}
						$entry.getData(new zip.BlobWriter(), function($blob) {
							$request.result = $blob;
							trigger($request, 'success');
						});
					}.bind(this));
				}.bind(this);
			
			setTimeout($process, 0);
			
			return $request;
		}, 
		getFilenames: function($callback) {
			console.warn('not implemented');
		}
	}
	
	window.ArchiveReader = ArchiveReader;
}
