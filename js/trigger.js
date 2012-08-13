"use strict";

(function($scope) {
	$scope.Trigger = {
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
}) (window);
