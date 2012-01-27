"use strict";

window.WebReader = (function() {
	
	var 
		storage = function() {
			if(!('sessionStorage' in window)) {
				alert('no session storage support');
			}
			
			return window.sessionStorage;
		};
	
	var WR = $.noop;
	WR.prototype = {
		library: (function() {
			
			var 
				ebooks = function() {
					var $ebooks = storage().getItem('ebooks');
					
					if($ebooks === null) {
						$ebooks = {};
					}
					else {
						$ebooks = JSON.parse($ebooks);
					}
					
					return $ebooks;
				}, 
				store_ebook = function($ebook, $type) {
					var 
						$identifier = $ebook.identifier().value, 
						$title      = $ebook.title(), 
						$language   = $ebook.language(), 
						$blob       = $ebook.blob(), 
						
						$metadata   = $ebook.metadata(), 
						
						$ebooks     = ebooks();
					
					var $existed = WebReader.library.exists($identifier);
					$ebooks[$identifier] = {
						title     : $title, 
						language  : $language, 
						identifier: $identifier, 
						
						metadata  : $metadata, 
						
						type: $type
					};
					storage().setItem('ebook.'+$identifier, $blob);
					storage().setItem('ebooks', JSON.stringify($ebooks));
					
					var $event = $.Event('changed');
					$event.ebooks = $ebooks;
					$(WebReader.library).trigger($event);
					
					var $event = $.Event('stored');
					$event.ebook = $ebook;
					$event.already_existed = $existed;
					$(WebReader.library).trigger($event);
				};
			
			var Library = $.noop;
			Library.prototype = {
				set: function($file) {
					if($file.type === 'application/epub+zip') {
						var $reader = new FileReader();
						
						$reader.onloadend = function($e) {
							var $epub = new EPUB($e.target.result);
							
							store_ebook($epub, 'epub');
						}
						
						$reader.readAsBinaryString($file);
					}
				}, 
				del: function($identifier) {
					var 
						$ebooks     = ebooks();
					
					delete $ebooks[$identifier];
					storage().setItem('ebooks', JSON.stringify($ebooks));
					
					var $event = $.Event('removed');
					$event.ebook = $identifier;
					$(WebReader.library).trigger($event);
					
					var $event = $.Event('changed');
					$event.ebooks = $ebooks;
					$(WebReader.library).trigger($event);
				}, 
				list: function($array) {
					if($array !== true) {
						return ebooks();
					}
					
					var 
						$ebooks = ebooks(), 
						$res = [];
					for(var $i in $ebooks) {
						$ebooks[$i].creators = $ebooks[$i].metadata.creator;
						$res.push($ebooks[$i]);
					}
					
					return $res;
				}, 
				exists: function($identifier) {
					return ebooks()[$identifier] !== undefined;
				}, 
				get: function($identifier) {
					var $ebook = ebooks()[$identifier];
					
					if($ebook.type = 'epub') {
						return new EPUB(storage().getItem('ebook.'+$identifier));
					}
				}
			};
			
			return new Library();
		} ()), 
		
		ebook: function() {
			return this.$ebook;
		}, 
		
		current_page: function() {
			return this.$page;
		}, 
		
		render_toc: function($ebook) {
			this.$ebook = $ebook;
			return $($ebook.toc().content());
		}, 		
		
		render_page: function($page, $target) {
			this.$page = $page;
			
			var $iframe = document.createElement("iframe");
			
			$target.append($iframe);
			
			$iframe.contentDocument.open();
			$iframe.contentDocument.write($page.html());
			$iframe.contentDocument.close();
			
			return $iframe;
		}, 
		
		page: function($ebook, $href) {
			this.$ebook = $ebook;
			return $ebook.page($href);
		}
	};
	
	return new WR();
} ());

/*
EBook = $.noop;

EBook.prototype = {
	identifier: $.noop, 
	title     : $.noop, 
	language  : $.noop, 
	
	blob      : $.noop
}
*/
