"use strict";

$(function() {
	var WebReader = new WR($('#ebook'));

	window.$wr = WebReader;
	
	var list_ebooks = function() {
		var $ebooks = WebReader.library.list(true).sort(function($e1, $e2) {
			var 
				$s1 = 
					$($e1.metadata.creator).map(function($i, $e) {return $e.value}).sort().toArray().join(' ')+' '+
					($e1.metadata.series?$e1.metadata.series.value:'')+' '+
					($e1.metadata.series_index?$e1.metadata.series_index.value:'')+' '+
					$e1.metadata.title.value;
			var 
				$s2 = 
					$($e2.metadata.creator).map(function($i, $e) {return $e.value}).sort().toArray().join(' ')+' '+
					($e2.metadata.series?$e2.metadata.series.value:'')+' '+
					($e2.metadata.series_index?$e2.metadata.series_index.value:'')+' '+
					$e2.metadata.title.value;
			
			return $s1.localeCompare($s2);
		});
		
		$('#library_filter input[name=filter]').val('');
		$('#library > ul').html(
			$('#library-item').render($ebooks)
		);
	};
	
	var hash_change = function($evt) {
		if(window === window.top) {
			var 
				$hash = window.location.hash.substr(1), 
				$pos = $hash.search('/'), 
				$prefix = $hash.substr(0, $pos), 
				$ebook = $hash.substr($pos + 1);
			
			if($pos != -1) {
				WebReader.open($ebook, null);
			}
			
			if($prefix === 'library' || $pos === -1) {
				hash_change.move_pane();
			}
		}
	};

	hash_change.move_pane = function() {
		var 
			$hash = window.location.hash.substr(1), 
			$pos = $hash.search('/'), 
			$prefix = $hash.substr(0, $pos);
		
		if($prefix === 'ebook') {
			//$toc.close();
		}
		else if($prefix === 'toc') {
			//$toc.open();
			//$library.close();
		}
		else {
			//$library.open();
		}
	};

	var ebook_link = function($evt) {
		$evt.preventDefault();
		
		var $href = $($evt.target).attr('href');
		
		window.setTimeout(
			function() {WebReader.goto($href);}, 0
		);
	}
	
	var toc_link = function($evt) {
		$evt.preventDefault();
		WebReader.goto($($evt.currentTarget).siblings('content').attr('src'))
	}

	var filter_library = function($evt) {
		if(typeof $evt === 'undefined') {
			$evt.preventDefault();
		}
		
		var $filter = $('#library_filter input[name=filter]').val().trim().toLowerCase();
		
		if($filter === '') {
			$('#library li').show();
		}
		else {
			$('#library li:contains("' + $filter + '")').show();
			$('#library li:not(:contains("' + $filter + '"))').hide();
		}
	}

	$('#add_ebook').on('submit', function($e) {
		$e.preventDefault();
		var $file = $('input[type=file]', this).get(0).files[0];
		WebReader.library.set($file);
	});
	
	/*
	$($library).on('opened', function() {
		$('#library_filter input[name=filter]').select();
	});
	*/

	$(document)
		.on('click', '#toc navLabel', toc_link)
		.on('click', '#library button[name=delete]', function($e) {
			$e.preventDefault();
			WebReader.library.del($($e.target).parent().parent().attr('id'));
		});
	$(window).on('hashchange', hash_change);
	$(WebReader)
		.on('opening', function($evt) {
			$('#library').addClass('loading');
		})
		.on('opened', function($evt) {
			$('#library').removeClass('loading');
			WebReader.render_toc($('#toc .content').empty());
			console.log($evt);

			var update_with_prefix = function($id) {
				return function($attribute_name, $prefix) {
					if(typeof $prefix === 'undefined') {
						$prefix = '';
					}
					return function() {
						var $attribute_value= $prefix + $(this).data('id-prefix') + '/' + $id.value;
						$(this).attr($attribute_name, $attribute_value);
					};
				};
			} ($evt.$ebook.identifier());

			$('[data-id-prefix]:not(a)').each(update_with_prefix('id'));
			$('a[data-id-prefix]').each(update_with_prefix('href', '#'));
		})
		.on('goingto', function($evt) {
		})
		.on('goneto', function($evt) {
			hash_change.move_pane();
		})
		.on('rendered', function($evt) {
			var 
				$iframe = $evt.$iframe.contentDocument, 
				$next = WebReader.next();
			
			if(typeof $next !== 'undefined') {
				$('<a class="web-reader next" href="'+$next+'">next</a>')
					.css({
						display: 'block', 
						borderTop: '1px solid lightgray', 
						backgroundColor: 'rgba(0, 0, 0, 0.01)', 
						lineHeight: '5em', 
						paddingBottom: '6em', 
						textAlign: 'center', 
						textDecoration: 'none', 
						marginTop: '50%', 
						position: 'absolute', 
						left: '0', 
						right: '0'
					})
					.appendTo($('body', $iframe));
				
//				$('html', $iframe).on('mousemove', $toc.delay_reveal.bind($toc));
				$('a', $iframe).on('click', ebook_link);
			}
		});
	$(WebReader.library)
		.on('inserting', function() {
			$('#library').addClass('loading');
		})
		.on('inserted', function() {
			$('#library').removeClass('loading');
		})
		.on('changed', list_ebooks)
		.on('stored', function($evt) {
			$('#'+$evt.$ebook.identifier().value+' a').focus();
		});

	$('#library_filter')
		.on('input', filter_library)
		.on('submit', function($evt) {$evt.preventDefault();});
	
	list_ebooks();
	hash_change();
});


jQuery.fn.getPath = function() {
	if(this.length != 1) throw 'Requires one element.';
	
	var path, node = this;
	while(node.length) {
		var realNode = node[0], name = realNode.localName;
		if(!name) break;
		
		name = name.toLowerCase();
		if(realNode.id) {
			// As soon as an id is found, there's no need to specify more.
			return name + '#' + realNode.id + (path ? '>' + path : '');
		}
		else if(realNode.className) {
			name += '.' + realNode.className.split(/\s+/).join('.');
		}
		
		var parent = node.parent(), siblings = parent.children(name);
		if(siblings.length > 1) name += ':eq(' + siblings.index(node) + ')';
		path = name + (path ? '>' + path : '');
		
		node = parent;
	}
	
	return path;
};
