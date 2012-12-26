(function($scope) {
	"use strict";
	
	var Utils = {
		cache: function($process, $name) {
			return function() {
				var 
					$storage, 
					$callback = Array.prototype.pop.call(arguments);
				
				if(typeof $name === 'string') {
					if(this[$name] === undefined) {
						this[$name] = {};
					}
					
					$storage = this[$name];
				}
				else {
					$storage = $name.apply(this, arguments);
				}
				
				if($storage.$loaded === undefined) {
					$storage.$loaded = false;
					$storage.$callbacks = [$callback];
					
					Array.prototype.push.call(arguments, function() {
						$storage.$data = arguments;
						$storage.$loaded = true;
						
						while($storage.$callbacks.length !== 0) {
							$storage.$callbacks.shift().apply(this, $storage.$data);
						}
					}.bind(this));
					
					$process.apply(this, arguments);
				}
				else if($storage.$loaded !== true) {
					$storage.$callbacks.push($callback);
				}
				else {
					$callback.apply(this, $storage.$data);
				}
			};
		}, 
		forEach: function($input, $callbacks, $alldone) {
			var 
				$is_array = $input instanceof Array || $input instanceof NodeList, 
				$array = $is_array? $input : [$input], 
				$have_keys = typeof $callbacks !== 'function', 
				$results_keys = [], 
				$results = [], 
				$remaining = $array.length, 
				$done = typeof $alldone === 'function' ? function($i, $key, $result) {
					if($have_keys) {
						if($results[$i] === undefined) {
							$results[$i] = {};
							$results_keys[$i] = {};
						}
						$results[$i][$key] = $result;
						$results_keys[$i][$key] = true;
						
						var $done = true;
						for(var $k in $callbacks) {
							if($results_keys[$i][$k] !== true) {
								$done = false;
							}
						}
						if($done) {
							$remaining--;
						}
					}
					else {
						$results[$i] = $result;
						$remaining--;
					}
					if($remaining === 0) {
						$alldone($is_array ? $results : $results[0]);
					}
				}: function() {};
			
			if(!$have_keys) {
				$callbacks = {value: $callbacks};
			}
			
			Array.prototype.forEach.call($array, function($item, $i) {
				for(var $key in $callbacks) {
					$callbacks[$key]($item, function($i, $key) {
						return function($result) {
							$done($i, $key, $result);
						};
					} ($i, $key), $i);
				}
			});
		}
	};
	
	$scope.Utils = Utils;
}) (window);
