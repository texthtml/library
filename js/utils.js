(function($scope) {
	"use strict";
	
	var Utils = {
		forEach: function($array, $callbacks, $alldone) {
			var 
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
						for(var $key in $callbacks) {
							if($results_keys[$i][$key] !== true) {
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
						$alldone($results);
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
