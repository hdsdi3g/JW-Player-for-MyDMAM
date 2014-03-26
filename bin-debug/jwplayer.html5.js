/**
 * jwplayer.html5 namespace
 *
 * @author pablo
 * @version 6.0
 */
(function(jwplayer) {
	jwplayer.html5 = {};
	jwplayer.html5.version = '6.8.';
})(jwplayer);/**
 * HTML5-only utilities for the JW Player.
 * 
 * @author pablo
 * @version 6.0
 */
(function(utils) {
	var DOCUMENT = document;

	/**
	 * Cleans up a css dimension (e.g. '420px') and returns an integer.
	 */
	utils.parseDimension = function(dimension) {
		if (typeof dimension == "string") {
			if (dimension === "") {
				return 0;
			} else if (dimension.lastIndexOf("%") > -1) {
				return dimension;
			}
			return parseInt(dimension.replace("px", ""), 10);
		}
		return dimension;
	};

	/** Format the elapsed / remaining text. **/
	utils.timeFormat = function(sec) {
		if (sec > 0) {
			var hrs = Math.floor(sec / 3600),
				mins = Math.floor((sec - hrs*3600) / 60),
				secs = Math.floor(sec % 60);
				
			return (hrs ? hrs + ":" : "")
					+ (mins < 10 ? "0" : "") + mins + ":"
					+ (secs < 10 ? "0" : "") + secs;
		} else {
			return "00:00";
		}
	};
	
	utils.bounds = function(element) {
		var bounds = {
			left: 0,
			right: 0,
			width: 0,
			height: 0,
			top: 0,
			bottom: 0
		};
		if (!element || !DOCUMENT.body.contains(element)) {
			return bounds;
		}
		if (element.getBoundingClientRect) {
			var rect = element.getBoundingClientRect(element),
				scrollOffsetY = window.pageYOffset,
				scrollOffsetX = window.pageXOffset;
			if (!rect.width && !rect.height && !rect.left && !rect.top) {
				//element is not visible / no layout
				return bounds;
			}
			bounds.left = rect.left + scrollOffsetX;
			bounds.right = rect.right + scrollOffsetX;
			bounds.top = rect.top + scrollOffsetY;
			bounds.bottom = rect.bottom + scrollOffsetY;
			bounds.width = rect.right - rect.left;
			bounds.height = rect.bottom - rect.top;
		} else {
			bounds.width = element.offsetWidth|0;
			bounds.height = element.offsetHeight|0;
			do {
				bounds.left += element.offsetLeft|0;
				bounds.top += element.offsetTop|0;
			} while (element = element.offsetParent);
			bounds.right = bounds.left + bounds.width;
			bounds.bottom = bounds.top + bounds.height;
		}
		return bounds;
	};
	
	utils.empty = function(element) {
		if (!element) return;
		while (element.childElementCount > 0) {
			element.removeChild(element.children[0]);
		}
	};

})(jwplayer.utils);/**
 * CSS utility methods for the JW Player.
 *
 * @author pablo
 * @version 6.0
 */
(function(jwplayer) {
	var utils = jwplayer.utils,
		_styleSheets={},
		_styleSheet,
		_rules = {},
		_cssBlock = null,
		_ruleIndexes = {},
		_debug = false,
				
		JW_CLASS = '.jwplayer ';

	function _createStylesheet(debugText) {
		var styleSheet = document.createElement("style");
		if (debugText) {
			styleSheet.innerText = debugText;
		}
		styleSheet.type = "text/css";
		document.getElementsByTagName('head')[0].appendChild(styleSheet);
		return styleSheet;
	}
	
	var _css = utils.css = function(selector, styles, important) {
		important = important || false;
		
		if (!_rules[selector]) {
			_rules[selector] = {};
		}

		if (!_updateStyles(_rules[selector], styles, important)) {
			//no change in css
			return;
		}
		if (_debug) {
			// add a new style sheet with css text and exit
			if (_styleSheets[selector]) {
				_styleSheets[selector].parentNode.removeChild(_styleSheets[selector]);
			}
			_styleSheets[selector] = _createStylesheet( _getRuleText(selector) );
			return;
		}
		if (!_styleSheets[selector]) {
			// set stylesheet for selector
			if (!_styleSheet || _styleSheet.sheet.cssRules.length > 50000) {
				_styleSheet = _createStylesheet();
			}
			_styleSheets[selector] = _styleSheet;
		}
		if (_cssBlock !== null) {
			_cssBlock.styleSheets[selector] = _rules[selector];
			// finish this later
			return;
		}
		_updateStylesheet(selector);
	};

	_css.style = function(elements, styles, immediate) {
		if (elements === undefined || elements === null) {
			//utils.log('css.style invalid elements: '+ elements +' '+ JSON.stringify(styles) +' '+ immediate);
			return;
		}
		if (elements.length === undefined) {
			elements = [elements];
		}

		var cssRules = {};
		_updateStyleAttributes(cssRules, styles);

		if (_cssBlock !== null && !immediate) {
			elements.__cssRules = _extend(elements.__cssRules, cssRules);
			if (_cssBlock.elements.indexOf(elements) < 0) {
				_cssBlock.elements.push(elements);
			}
			// finish this later
			return;
		}
		_updateElementsStyle(elements, cssRules);
	};

	_css.block = function(id) {
		// use id so that the first blocker gets to unblock
		if (_cssBlock === null) {
			// console.time('block_'+id);
			_cssBlock = {
				id: id,
				styleSheets: {},
				elements: []
			};
		}
	};
	
	_css.unblock = function(id) {
		if (_cssBlock && (!id || _cssBlock.id === id)) {
			// IE9 limits the number of style tags in the head, so we need to update the entire stylesheet each time
			for (var selector in _cssBlock.styleSheets) {
				_updateStylesheet(selector);
			}

			for (var i=0; i<_cssBlock.elements.length; i++) {
				var elements = _cssBlock.elements[i];
				_updateElementsStyle(elements, elements.__cssRules);
			}

			_cssBlock = null;
			// console.timeEnd('block_'+id);
		}
	};
	
	function _extend(target, source) {
		target = target || {};
		for (var prop in source) {
			target[prop] = source[prop];
		}
		return target;
	}

	function _updateStyles(cssRules, styles, important) {
		var dirty = false,
			style, val;
		for (style in styles) {
			val = _styleValue(style, styles[style], important);
			if (val !== '') {
				if (val !== cssRules[style]) {
					cssRules[style] = val;
					dirty = true;
				}
			} else if (cssRules[style] !== undefined) {
				delete cssRules[style];
				dirty = true;
			} 
		}
		return dirty;
	}

	function _updateStyleAttributes(cssRules, styles) {
		for (var style in styles) {
			cssRules[style] = _styleValue(style, styles[style]);
		}
	}

	function _styleAttributeName(name) {
		name = name.split('-');
		for (var i=1; i<name.length; i++) {
			name[i] = name[i].charAt(0).toUpperCase() + name[i].slice(1);
		}
		return name.join('');
	}

	function _styleValue(style, value, important) {
		if (!utils.exists(value)) {
			return '';
		}
		var importantString = important ? ' !important' : '';

		//string
		if (isNaN(value)) {
			if (!!value.match(/png|gif|jpe?g/i) && value.indexOf('url') < 0) {
				return "url(" + value + ")";
			}
			return value + importantString;
		}
		// number
		if (value === 0 ||
			style === 'z-index' ||
			style === 'opacity') {
			return '' + value + importantString;
		}
		if ((/color/i).test(style)) {
			return "#" + utils.pad(value.toString(16).replace(/^0x/i,""), 6) + importantString;
		}
		return Math.ceil(value) + "px" + importantString;
	}

	function _updateElementsStyle(elements, cssRules) {
		for (var i=0; i<elements.length; i++) {
			var element = elements[i],
				style, styleName;
			for (style in cssRules) {
				styleName = _styleAttributeName(style);
				if (element.style[styleName] !== cssRules[style]) {
					element.style[styleName] = cssRules[style];
				}
			}
		}
	}

	function _updateStylesheet(selector) {
		var sheet = _styleSheets[selector].sheet,
			cssRules,
			ruleIndex,
			ruleText;
		if (sheet) {
			cssRules = sheet.cssRules;
			ruleIndex = _ruleIndexes[selector];
			ruleText = _getRuleText(selector);
			
			if (ruleIndex !== undefined && ruleIndex < cssRules.length && cssRules[ruleIndex].selectorText === selector) {
				if (ruleText === cssRules[ruleIndex].cssText) {
					//no update needed
					return;
				}
				sheet.deleteRule(ruleIndex);
			} else {
				ruleIndex = cssRules.length;
				_ruleIndexes[selector] = ruleIndex;  
			}
			sheet.insertRule(ruleText, ruleIndex);
		}
	}
	
	function _getRuleText(selector) {
		var styles = _rules[selector];
		selector += ' { ';
		for (var style in styles) {
			selector += style + ': ' + styles[style] + '; ';
		}
		return selector + '}';
	}
	
	
	/**
	 * Removes all css elements which match a particular style
	 */
	utils.clearCss = function(filter) {
		for (var rule in _rules) {
			if (rule.indexOf(filter) >= 0) {
				delete _rules[rule];
			}
		}
		for (var selector in _styleSheets) {
			if (selector.indexOf(filter) >= 0) {
				_updateStylesheet(selector);
			}
		}
	};
	
	utils.transform = function(element, value) {
		var transform = 'transform',
			style = {};
		value = value || '';
		style[transform] = value;
		style['-webkit-'+transform] = value;
		style['-ms-'+transform] = value;
		style['-moz-'+transform] = value;
		style['-o-'+transform] = value;
		if (typeof element === "string") {
			_css(element, style);
		} else {
			_css.style(element, style);
		}
	};
	
	utils.dragStyle = function(selector, style) {
		_css(selector, {
			'-webkit-user-select': style,
			'-moz-user-select': style,
			'-ms-user-select': style,
			'-webkit-user-drag': style,
			'user-select': style,
			'user-drag': style
		});
	};
	
	utils.transitionStyle = function(selector, style) {
		// Safari 5 has problems with CSS3 transitions
		if(navigator.userAgent.match(/5\.\d(\.\d)? safari/i)) return;
		
		_css(selector, {
			'-webkit-transition': style,
			'-moz-transition': style,
			'-o-transition': style,
			transition: style
		});
	};

	
	utils.rotate = function(domelement, deg) {
		utils.transform(domelement, "rotate(" + deg + "deg)");
	};
	
	utils.rgbHex = function(color) {
		var hex = String(color).replace('#','');
		if (hex.length === 3) {
			hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
		}
		return '#'+hex.substr(-6);
	};

	utils.hexToRgba = function(hexColor, opacity) {
		var style = 'rgb';
		var channels = [
			parseInt(hexColor.substr(1, 2), 16),
			parseInt(hexColor.substr(3, 2), 16),
			parseInt(hexColor.substr(5, 2), 16)
		];
		if(opacity !== undefined && opacity !== 100) {
			style += 'a';
			channels.push(opacity / 100);
		}
		return style +'('+ channels.join(',') +')';
	};

	(function cssReset() {
		_css(JW_CLASS.slice(0, -1) + ["", "div", "span", "a", "img", "ul", "li", "video"].join(", "+JW_CLASS) + ", .jwclick", {
			margin: 0,
			padding: 0,
			border: 0,
			color: '#000000',
			'font-size': "100%",
			font: 'inherit',
			'vertical-align': 'baseline',
			'background-color': 'transparent',
			'text-align': 'left',
			'direction':'ltr',
			'-webkit-tap-highlight-color': 'rgba(255, 255, 255, 0)'
		});
		
		_css(JW_CLASS + "ul", { 'list-style': "none" });
	})();
	
})(jwplayer);
/**
 * Utility methods for the JW Player.
 * 
 * @author pablo
 * @version 6.0
 */
(function(utils) {
	
	/** Stretching options **/
	var _stretching = utils.stretching = {
		NONE : "none",
		FILL : "fill",
		UNIFORM : "uniform",
		EXACTFIT : "exactfit"
	};

	utils.scale = function(domelement, xscale, yscale, xoffset, yoffset) {
		var value = '';
		
		// Set defaults
		xscale = xscale || 1;
		yscale = yscale || 1;
		xoffset = xoffset|0;
		yoffset = yoffset|0;

		if (xscale !== 1 || yscale !== 1) {
			value = 'scale('+xscale+', '+yscale+')';
		}
		if (xoffset || yoffset) {
			if (value) {
				value += ' ';
			}
			value = 'translate('+xoffset+'px, '+yoffset+'px)';
		}
		utils.transform(domelement, value);
	};
	
	/**
	 * Stretches domelement based on stretching. parentWidth, parentHeight,
	 * elementWidth, and elementHeight are required as the elements dimensions
	 * change as a result of the stretching. Hence, the original dimensions must
	 * always be supplied.
	 * 
	 * @param {String}
	 *            stretching
	 * @param {DOMElement}
	 *            domelement
	 * @param {Number}
	 *            parentWidth
	 * @param {Number}
	 *            parentHeight
	 * @param {Number}
	 *            elementWidth
	 * @param {Number}
	 *            elementHeight
	 */
	utils.stretch = function(stretching, domelement, parentWidth, parentHeight, elementWidth, elementHeight) {
		if (!domelement) return false;
		if (!parentWidth || !parentHeight || !elementWidth || !elementHeight) return false;
		stretching = stretching || _stretching.UNIFORM;
		
		var xscale = Math.ceil(parentWidth/2) * 2 / elementWidth,
			yscale = Math.ceil(parentHeight/2) * 2 / elementHeight,
			video = (domelement.tagName.toLowerCase() === "video"),
			scale = false,
			stretchClass = "jw" + stretching.toLowerCase();
		
		switch (stretching.toLowerCase()) {
		case _stretching.FILL:
			if (xscale > yscale) {
				yscale = xscale;
			} else {
				xscale = yscale;
			}
			scale = true;
			break;
		case _stretching.NONE:
			xscale = yscale = 1;
			/* falls through */
		case _stretching.EXACTFIT:
			scale = true;
			break;
		case _stretching.UNIFORM:
			/* falls through */
		default:
			if (xscale > yscale) {
				if (elementWidth * yscale / parentWidth > 0.95) {
					scale = true;
					stretchClass = "jwexactfit";
				} else {
					elementWidth = elementWidth * yscale;
					elementHeight = elementHeight * yscale;
				}
			} else {
				if (elementHeight * xscale / parentHeight > 0.95) {
					scale = true;
					stretchClass = "jwexactfit";
				} else {
					elementWidth = elementWidth * xscale;
					elementHeight = elementHeight * xscale;
				}
			}
			if (scale) {
				xscale = Math.ceil(parentWidth/2) * 2 / elementWidth;
				yscale = Math.ceil(parentHeight/2) * 2 / elementHeight;
			}
		}

		if (video) {
			var style = {
				left: '',
				right: '',
				width: '',
				height: ''
			};
			if (scale) {
				if (parentWidth < elementWidth) {
					style.left = 
					style.right =  Math.ceil((parentWidth - elementWidth)/2);
				}
				if (parentHeight < elementHeight) {
					style.top = 
					style.bottom =  Math.ceil((parentHeight - elementHeight)/2);
				}
				style.width = elementWidth;
				style.height = elementHeight;
				utils.scale(domelement, xscale, yscale, 0, 0);
			} else {
				scale = false;
				utils.transform(domelement);
			}
			utils.css.style(domelement, style);
		} else {
			domelement.className = domelement.className.replace(/\s*jw(none|exactfit|uniform|fill)/g, "") +  " " + stretchClass;
		}
		return scale;
	};

})(jwplayer.utils);
(function(parsers) {

    /** Component that loads and parses an DFXP file. **/
    parsers.dfxp = function() {
        
        var _seconds = jwplayer.utils.seconds;

        this.parse = function(data) {
            var _captions = [{begin:0, text:''}];
            data = data.replace(/^\s+/, '').replace(/\s+$/, '');
            var list = data.split("</p>");
            var list2 = data.split ("</tt:p>");
            var newlist = [];
            for (var i = 0; i < list.length; i++) {
                if (list[i].indexOf("<p") >= 0) {
                    list[i] = list[i].substr(list[i].indexOf("<p") + 2).replace(/^\s+/, '').replace(/\s+$/, '');
                    newlist.push(list[i]);
                }
            }
            for (var i = 0; i < list2.length; i++) {
                if (list2[i].indexOf("<tt:p") >= 0) {
                    list2[i] = list2[i].substr(list2[i].indexOf("<tt:p") + 5).replace(/^\s+/, '').replace(/\s+$/, '');
                    newlist.push(list2[i]);
                }
            }
            list = newlist;

            for (i = 0; i < list.length; i++) {
                var entry = _entry(list[i]);
                if(entry['text']) {
                    _captions.push(entry);
                    // Insert empty caption at the end.
                    if(entry['end']) {
                        _captions.push({begin:entry['end'],text:''});
                        delete entry['end'];
                    }
                }
            }
            if(_captions.length > 1) {
                return _captions;
            } else {
                throw { message:"Invalid DFXP file:"};
            }
        };


        /** Parse a single captions entry. **/
        function _entry(data) {
            var entry = {};
            try {
                var idx = data.indexOf("begin=\"");
                data = data.substr(idx + 7);
                idx = data.indexOf("\" end=\"");
                entry['begin'] = _seconds(data.substr(0, idx));
                data = data.substr(idx + 7);
                idx = data.indexOf("\"");
                entry['end'] = _seconds(data.substr(0, idx));
                idx = data.indexOf("\">");
                data = data.substr(idx + 2);
                entry['text'] = data;
            } catch (error) {}
            return entry;
        };

    };


})(jwplayer.parsers);
(function(parsers) {


    /** Component that loads and parses an SRT file. **/
    parsers.srt = function() {


        /** XMLHTTP Object. **/
        var _utils = jwplayer.utils,
        _seconds = _utils.seconds;

        this.parse = function(data,mergeBeginEnd) {
            // Trim whitespace and split the list by returns.
            var _captions = mergeBeginEnd ? [] : [{begin:0, text:''}];
            data = _utils.trim(data);
            var list = data.split("\r\n\r\n");
            if(list.length == 1) { list = data.split("\n\n"); }
            for(var i=0; i<list.length; i++) {
                if (list[i] == "WEBVTT") {
                    continue;
                }
                // Parse each entry
                var entry = _entry(list[i]);
                if(entry['text']) {
                    _captions.push(entry);
                    // Insert empty caption at the end.
                    if(entry['end'] && !mergeBeginEnd) {
                        _captions.push({begin:entry['end'],text:''});
                        delete entry['end'];
                    }
                }
            }
            if(_captions.length > 1) {
                return _captions;
            } else {
                throw { message:"Invalid SRT file" };
            }
        };


        /** Parse a single captions entry. **/
        function _entry(data) {
            var entry = {};
            var array = data.split("\r\n");
            if(array.length == 1) { array = data.split("\n"); }
            try {
                // Second line contains the start and end.
                var idx = 1;
                if (array[0].indexOf(' --> ') > 0) {
                    idx = 0;
                }
                var index = array[idx].indexOf(' --> ');
                if(index > 0) {
                    entry['begin'] = _seconds(array[idx].substr(0,index));
                    entry['end'] = _seconds(array[idx].substr(index+5));
                }
                // Third line starts the text.
                if(array[idx+1]) {
                    entry['text'] = array[idx+1];
                    // Arbitrary number of additional lines.
                    for (var i=idx+2; i<array.length; i++) {
                        entry['text'] += '<br/>' + array[i];
                    }
                }
            } catch (error) {}
            return entry;
        };

    };


})(jwplayer.parsers);
/** 
 * skip button for ads
 *
 * @author alex
 * @version 6.8
 */
(function(jwplayer) {
    var _utils = jwplayer.utils,
        _css = _utils.css,
        TRUE = true,
        FALSE = false,
        _events = jwplayer.events,
        VIEW_INSTREAM_SKIP_CLASS = "jwskip",
        VIEW_INSTREAM_IMAGE = "jwskipimage",
        VIEW_INSTREAM_OVER = "jwskipover",
        VIEW_INSTREAM_OUT = "jwskipout",
        _SKIP_WIDTH = 80,
        _SKIP_HEIGHT = 30,
        _SKIP_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAICAYAAAArzdW1AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA3NpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNS1jMDE0IDc5LjE1MTQ4MSwgMjAxMy8wMy8xMy0xMjowOToxNSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDo0ODkzMWI3Ny04YjE5LTQzYzMtOGM2Ni0wYzdkODNmZTllNDYiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6RDI0OTcxRkE0OEM2MTFFM0I4MTREM0ZBQTFCNDE3NTgiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6RDI0OTcxRjk0OEM2MTFFM0I4MTREM0ZBQTFCNDE3NTgiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIChNYWNpbnRvc2gpIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6NDA5ZGQxNDktNzdkMi00M2E3LWJjYWYtOTRjZmM2MWNkZDI0IiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjQ4OTMxYjc3LThiMTktNDNjMy04YzY2LTBjN2Q4M2ZlOWU0NiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PqAZXX0AAABYSURBVHjafI2BCcAwCAQ/kr3ScRwjW+g2SSezCi0kYHpwKLy8JCLDbWaGTM+MAFzuVNXhNiTQsh+PS9QhZ7o9JuFMeUVNwjsamDma4K+3oy1cqX/hxyPAAAQwNKV27g9PAAAAAElFTkSuQmCC",
        _SKIP_ICON_OVER = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAICAYAAAArzdW1AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA3NpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNS1jMDE0IDc5LjE1MTQ4MSwgMjAxMy8wMy8xMy0xMjowOToxNSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDo0ODkzMWI3Ny04YjE5LTQzYzMtOGM2Ni0wYzdkODNmZTllNDYiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6RDI0OTcxRkU0OEM2MTFFM0I4MTREM0ZBQTFCNDE3NTgiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6RDI0OTcxRkQ0OEM2MTFFM0I4MTREM0ZBQTFCNDE3NTgiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIChNYWNpbnRvc2gpIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6NDA5ZGQxNDktNzdkMi00M2E3LWJjYWYtOTRjZmM2MWNkZDI0IiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjQ4OTMxYjc3LThiMTktNDNjMy04YzY2LTBjN2Q4M2ZlOWU0NiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PvgIj/QAAABYSURBVHjadI6BCcAgDAS/0jmyih2tm2lHSRZJX6hQQ3w4FP49LKraSHV3ZLDzAuAi3cwaqUhSfvft+EweznHneUdTzPGRmp5hEJFhAo3LaCnjn7blzCvAAH9YOSCL5RZKAAAAAElFTkSuQmCC";
        
        jwplayer.html5.adskipbutton = function(_api, _bottom, _skipMessage, _skipText) {
            var _instreamSkipContainer,
                _instreamSkip,
                _dispatcher = new _events.eventdispatcher(),
                _offsetTime = -1,
                _instreamSkipSet = FALSE,
                _controls,
                _this = this,
                _skipOffset = 0,
                _skip_image,
                _skip_image_over;
                _utils.extend(_this, _dispatcher);
                
            function _init() {
                _skip_image = new Image();
                _skip_image.src = _SKIP_ICON;
                _skip_image.className = VIEW_INSTREAM_IMAGE + " " + VIEW_INSTREAM_OUT;
                _skip_image_over = new Image();
                _skip_image_over.src = _SKIP_ICON_OVER;
                _skip_image_over.className = VIEW_INSTREAM_IMAGE + " " + VIEW_INSTREAM_OVER;
                _instreamSkipContainer = _createElement("div",VIEW_INSTREAM_SKIP_CLASS);
                _instreamSkipContainer.id = _api.id + "_skipcontainer";
                _instreamSkip = _createElement("canvas");
                _instreamSkipContainer.appendChild(_instreamSkip);
                _this.width = _instreamSkip.width = _SKIP_WIDTH;
                _this.height = _instreamSkip.height = _SKIP_HEIGHT;
                _instreamSkipContainer.appendChild(_skip_image_over);
                _instreamSkipContainer.appendChild(_skip_image);
                _css.style(_instreamSkipContainer, {
                    "visibility": "hidden",
                    "bottom": _bottom
                });
            }
            
            
            function _updateTime(currTime) {
                if (_offsetTime < 0) return;

                var ctx=_instreamSkip.getContext("2d");
                ctx.clearRect(0,0,_SKIP_WIDTH,_SKIP_HEIGHT);
                drawRoundRect(ctx,0,0,_SKIP_WIDTH,_SKIP_HEIGHT,5,TRUE,FALSE,FALSE);
                drawRoundRect(ctx,0,0,_SKIP_WIDTH,_SKIP_HEIGHT,5,FALSE,TRUE,FALSE);

                ctx.fillStyle="#979797";
                ctx.globalAlpha = 1.0;
                var x = _instreamSkip.width / 2;
                var y = _instreamSkip.height / 2;
                ctx.textAlign = "center";
                ctx.font = 'Bold 11px Sans-Serif';

                ctx.fillText(_skipMessage.replace(/xx/gi, Math.ceil(_offsetTime - currTime)), x, y + 4);
            
            }
            
            function _updateOffset(pos, duration) {
                if (_utils.typeOf(_skipOffset) == "number") {
                    _offsetTime = _skipOffset;
                } else if (_skipOffset.slice(-1) == "%") { 
                    var percent = parseFloat(_skipOffset.slice(0, -1));
                    if (duration && !isNaN(percent)) {
                        _offsetTime = duration * percent / 100;
                    }
                } else if (_utils.typeOf(_skipOffset) == "string") {
                    _offsetTime = _utils.seconds(_skipOffset);
                } else if (!isNaN(_skipOffset)) {
                    _offsetTime = _skipOffset;
                }
            }

            _this.updateSkipTime = function(time, duration) {
                var ctx = _instreamSkip.getContext("2d");
                _updateOffset(time, duration);
                if (_offsetTime >= 0) {
                    _css.style(_instreamSkipContainer, {
                        "visibility": _controls ? "visible" : "hidden"
                    });
                    if (_offsetTime - time > 0) {
                        _updateTime(time);
                    } else if (!_instreamSkipSet) {
                        _instreamSkipSet = TRUE;
                        ctx.clearRect(0,0,_SKIP_WIDTH,_SKIP_HEIGHT);
                        drawRoundRect(ctx,0,0,_SKIP_WIDTH,_SKIP_HEIGHT,5,TRUE,FALSE,FALSE);
                        drawRoundRect(ctx,0,0,_SKIP_WIDTH,_SKIP_HEIGHT,5,FALSE,TRUE);



                        ctx.fillStyle="#979797";
                        ctx.globalAlpha = 1.0;
                        var y = _instreamSkip.height / 2;
                        var x = _instreamSkip.width / 2;
                        ctx.textAlign = "center";
                        ctx.font = 'Bold 12px Sans-Serif';
                        
                        ctx.fillText(_skipText + "     ",x,y + 4); //add the padding to put the skip icon over but keep it centered
                        ctx.drawImage(_skip_image, _instreamSkip.width  - ((_instreamSkip.width - ctx.measureText(_skipText).width)/2) - 4, (_SKIP_HEIGHT - _skip_image.height) / 2);

                        if (_utils.isMobile()) {
                            var skipTouch = new _utils.touch(_instreamSkipContainer);
                            skipTouch.addEventListener(_utils.touchEvents.TAP, skipAd);
                        }
                        else {
                            _instreamSkipContainer.addEventListener('click', skipAd);
                            _instreamSkipContainer.addEventListener('mouseover', onMouseOver);
                            _instreamSkipContainer.addEventListener('mouseout', onMouseOut);
                        }
                        _instreamSkipContainer.style.cursor = "pointer";
                        
                    }
                }
            };

            function skipAd() {
                if (_instreamSkipSet) {
                    _dispatcher.sendEvent(_events.JWPLAYER_AD_SKIPPED);
                }
            }
            
            this.reset = function(offset) {
                _instreamSkipSet = false;
                _skipOffset = offset;
                _updateOffset(0, 0);
                _updateTime(0);
            };
            
            function onMouseOver(){
                if (_instreamSkipSet) {
                    var ctx=_instreamSkip.getContext("2d");
    
                    ctx.clearRect(0,0,_SKIP_WIDTH,_SKIP_HEIGHT);
                    drawRoundRect(ctx,0,0,_SKIP_WIDTH,_SKIP_HEIGHT,5,TRUE,FALSE,TRUE);
                    drawRoundRect(ctx,0,0,_SKIP_WIDTH,_SKIP_HEIGHT,5,FALSE,TRUE,TRUE);
                    ctx.fillStyle="#FFFFFF";
                    ctx.globalAlpha = 1.0;
                    var y = _instreamSkip.height / 2;
                    var x = _instreamSkip.width / 2;
                    ctx.textAlign = "center";
                    ctx.font = 'Bold 12px Sans-Serif';   
                    ctx.fillText(_skipText + "     ",x,y + 4);
                    ctx.drawImage(_skip_image_over, _instreamSkip.width  - ((_instreamSkip.width - ctx.measureText(_skipText).width)/2) - 4, (_SKIP_HEIGHT - _skip_image.height) / 2);
                }
            }
            
            function onMouseOut(){
                if (_instreamSkipSet) {
                    var ctx=_instreamSkip.getContext("2d");
                    ctx.clearRect(0,0,_SKIP_WIDTH,_SKIP_HEIGHT);
                    drawRoundRect(ctx,0,0,_SKIP_WIDTH,_SKIP_HEIGHT,5,TRUE,FALSE,FALSE);
                    drawRoundRect(ctx,0,0,_SKIP_WIDTH,_SKIP_HEIGHT,5,FALSE,TRUE,FALSE);
                    ctx.fillStyle="#979797";
                    ctx.globalAlpha = 1.0;
                    var y = _instreamSkip.height / 2;
                    var x = _instreamSkip.width / 2;
                    ctx.textAlign = "center";
                    ctx.font = 'Bold 12px Sans-Serif';   
                    ctx.fillText(_skipText + "     ",x,y + 4);
                    ctx.drawImage(_skip_image, _instreamSkip.width  - ((_instreamSkip.width - ctx.measureText(_skipText).width)/2) - 4, (_SKIP_HEIGHT - _skip_image.height) / 2);
                }
            }
            
            function drawRoundRect(ctx, x, y, width, height, radius, fill, stroke, over) {
                if (typeof stroke == "undefined" ) {
                    stroke = TRUE;
                }
                if (typeof radius === "undefined") {
                    radius = 5;
                }
                ctx.beginPath();
                ctx.moveTo(x + radius, y);
                ctx.lineTo(x + width - radius, y);
                ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
                ctx.lineTo(x + width, y + height - radius);
                ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
                ctx.lineTo(x + radius, y + height);
                ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
                ctx.lineTo(x, y + radius);
                ctx.quadraticCurveTo(x, y, x + radius, y);
                ctx.closePath();
                if (stroke) {
                    ctx.strokeStyle = "white";
                    ctx.globalAlpha = over ? 1.0 : 0.25;
                    ctx.stroke();
                }
                if (fill) {
                    ctx.fillStyle = "#000000";
                    ctx.globalAlpha = 0.5;
                    ctx.fill();
                }
            }
            
            _this.show = function() {
                _controls = true;
                if (_offsetTime > 0) {
                    _css.style(_instreamSkipContainer, {
                        "visibility": "visible"
                    });
                }
            };
            
            _this.hide = function() {
                _controls = false;
                _css.style(_instreamSkipContainer, {
                    "visibility": "hidden"
                });
            };
            
            function _createElement(elem, className) {
                var newElement = document.createElement(elem);
                if (className) newElement.className = className;
                return newElement;
            }
            
            this.element = function() {
                return _instreamSkipContainer;
            };
            
            _init();
        };
        
        _css('.' + VIEW_INSTREAM_SKIP_CLASS, {
            'position': 'absolute',
            'float': 'right',
            'display': 'inline-block',
            'width':  _SKIP_WIDTH,
            'height': _SKIP_HEIGHT,
            'right': 10
        });
        
        _css('.' + VIEW_INSTREAM_IMAGE, {
            'position': 'relative',
            'display':'none'
        });

})(window.jwplayer);
(function(jwplayer) {

    var html5 = jwplayer.html5,
        utils = jwplayer.utils,
        events = jwplayer.events,
        states = events.state,
        parsers = jwplayer.parsers,
        _css = utils.css,
        
        PLAYING = "playing",

        DOCUMENT = document,
        D_CLASS = ".jwcaptions",

        /** Some CSS constants we should use for minimization **/
        JW_CSS_ABSOLUTE = "absolute",
        JW_CSS_NONE = "none",
        JW_CSS_100PCT = "100%",
        JW_CSS_HIDDEN = "hidden",
        JW_CSS_NORMAL = "normal",
        JW_CSS_WHITE = "#FFFFFF";

    /** Displays closed captions or subtitles on top of the video. **/
    html5.captions = function(api, options) {
        
        var _api = api,
            _display,
            _defaults = {
                back: true,
                color: JW_CSS_WHITE,
                fontSize: 15,
                fontFamily: 'Arial,sans-serif',
                fontOpacity: 100,
                backgroundColor: '#000',
                backgroundOpacity: 100,
                // if back == false edgeStyle defaults to 'uniform',
                // otherwise it's 'none'
                edgeStyle: null,
                windowColor: JW_CSS_WHITE,
                windowOpacity: 0
            },

            /** Default configuration options. **/
            _options = {
                fontStyle: JW_CSS_NORMAL,
                fontWeight: JW_CSS_NORMAL,
                textDecoration: JW_CSS_NONE
            },
            
            /** Reference to the text renderer. **/
            _renderer,
            /** Current player state. **/
            _state,
            /** Currently active captions track. **/
            _track,
            /** List with all tracks. **/
            _tracks = [],
            /**counter for downloading all the tracks**/
            _dlCount = 0,
            
            _waiting = -1,
            /** Currently selected track in the displayed track list. **/
            _selectedTrack = 0,
            /** Flag to remember fullscreen state. **/
            _fullscreen = false,
            /** Current captions file being read. **/
            _file,
            /** Event dispatcher for captions events. **/
            _eventDispatcher = new events.eventdispatcher(),
            
            _nonChromeAndroid = utils.isAndroid(4) && !utils.isChrome(),
            
            _this = this;

        utils.extend(this, _eventDispatcher);

        function _init() {

            _display = DOCUMENT.createElement("div");
            _display.id = _api.id + "_caption";
            _display.className = "jwcaptions";

            _api.jwAddEventListener(events.JWPLAYER_PLAYER_STATE, _stateHandler);
            _api.jwAddEventListener(events.JWPLAYER_PLAYLIST_ITEM, _itemHandler);
            _api.jwAddEventListener(events.JWPLAYER_MEDIA_ERROR, _errorHandler);
            _api.jwAddEventListener(events.JWPLAYER_ERROR, _errorHandler);
            _api.jwAddEventListener(events.JWPLAYER_READY, _setup);
            _api.jwAddEventListener(events.JWPLAYER_MEDIA_TIME, _timeHandler);
            _api.jwAddEventListener(events.JWPLAYER_FULLSCREEN, _fullscreenHandler);
            _api.jwAddEventListener(events.JWPLAYER_RESIZE, _resizeHandler);
        }

        function _resizeHandler() {
            _redraw(false);
        }

        /** Error loading/parsing the captions. **/
        function _errorHandler(error) {
            utils.log("CAPTIONS(" + error + ")");
        }

        /** Player jumped to idle state. **/
        function _idleHandler() {
            _state = 'idle';
            _redraw(false);
            //_renderer.update(0);
        }

        function _stateHandler(evt) {
            switch(evt.newstate) {
            case states.IDLE:
                _idleHandler();
                break;
            case states.PLAYING:
                _playHandler();
                break;
            }
        }

        function _fullscreenHandler(event) {
            _fullscreen = event.fullscreen;
            if(event.fullscreen) {
                _fullscreenResize();
                // to fix browser fullscreen issue
                setTimeout(_fullscreenResize, 500);
            }
            else {
                _redraw(true);
            }
            
        }

        function _fullscreenResize() {
            var height = _display.offsetHeight,
                width  = _display.offsetWidth;
            if (height !== 0 && width !== 0) {
                _renderer.resize(width, Math.round(height*0.94));
            }
        }

        /** Listen to playlist item updates. **/
        function _itemHandler() {
            _track = 0;
            _tracks = [];
            _renderer.update(0);
            _dlCount = 0;

            if (_nonChromeAndroid) return;
            
            var item = _api.jwGetPlaylist()[_api.jwGetPlaylistIndex()],
                tracks = item['tracks'],
                captions = [],
                i = 0,
                label = "",
                defaultTrack = 0,
                file = "",
                cookies;

            for (i = 0; i < tracks.length; i++) {
                var kind = tracks[i].kind.toLowerCase();
                if (kind == "captions" || kind == "subtitles") {
                    captions.push(tracks[i]);
                }
            }

            _selectedTrack = 0;

            for (i = 0; i < captions.length; i++) {
                file = captions[i].file;
                if(file) {
                    if (!captions[i].label) {
                        captions[i].label = i.toString();
                       
                    }
                    _tracks.push(captions[i]);
                    _load(_tracks[i].file,i);
                }
            }

            for (i = 0; i < _tracks.length; i++) {
                if (_tracks[i]["default"]) {
                    defaultTrack = i+1;
                    break;
                }
            }

            cookies = utils.getCookies();
            label = cookies["captionLabel"];

            if (label) {
                tracks = _getTracks();
                for (i = 0; i < tracks.length; i++) {
                    if (label == tracks[i].label) {
                        defaultTrack = i;
                        
                        break;
                    }
                }
            }
            if (defaultTrack > 0) _renderCaptions(defaultTrack);
            _redraw(false);
            _sendEvent(events.JWPLAYER_CAPTIONS_LIST, _getTracks(), _selectedTrack);
        }

        /** Load captions. **/
        function _load(file,index) {
            utils.ajax(file, function(xmlEvent) {
                    _xmlReadHandler(xmlEvent,index); 
                }, _xmlFailedHandler, true);
        }

        function _xmlReadHandler(xmlEvent,index) {
            var rss = xmlEvent.responseXML ? xmlEvent.responseXML.firstChild : null,
                parser;
            _dlCount++;
            // IE9 sets the firstChild element to the root <xml> tag
            
            if (rss) {
                if (parsers.localName(rss) == "xml") rss = rss.nextSibling;
                // Ignore all comments
                while (rss.nodeType == rss.COMMENT_NODE) rss = rss.nextSibling;
            }
            if (rss && parsers.localName(rss) == "tt") {
                parser = new jwplayer.parsers.dfxp();
            }
            else {
                parser = new jwplayer.parsers.srt();   
            }
            try {
                var data = parser.parse(xmlEvent.responseText);
                if (_track < _tracks.length) {
                    _tracks[index].data = data;
                }
                _redraw(false);
            } catch (e) {
                _errorHandler(e.message + ": " +_tracks[index].file);
            }
            
            if (_dlCount == _tracks.length) {
                if (_waiting > 0) {
                    _renderCaptions(_waiting);
                    _waiting = -1;
                }
                sendAll();
            }
        }

        function _xmlFailedHandler(message) {
            _dlCount++;
            _errorHandler(message);
            if (_dlCount == _tracks.length) {
                if (_waiting > 0) {
                    _renderCaptions(_waiting);
                    _waiting = -1;
                }
                sendAll();
            }
        }

    
        function sendAll() {
            
            var data = [];
            for(var i = 0;i < _tracks.length;i++) {
                
                data.push(_tracks[i]);
            }
            _eventDispatcher.sendEvent(events.JWPLAYER_CAPTIONS_LOADED, {captionData:data});
        }

        /** Player started playing. **/
        function _playHandler() {
            _state = PLAYING;
            _redraw(false);
        }

        /** Update the interface. **/
        function _redraw(timeout) {
            if(!_tracks.length || _nonChromeAndroid) {
                _renderer.hide();
            } else {
                if(_state == PLAYING && _selectedTrack > 0) {
                    _renderer.show();
                    if (_fullscreen) {
                        _fullscreenHandler({fullscreen: true});
                        return;
                    }
                    _normalResize();
                    if (timeout) {
                        setTimeout(_normalResize, 500);
                    }
                } else {
                    _renderer.hide();
                }
            }
        }

        function _normalResize() {
            _renderer.resize();
        }

        /** Setup captions when player is ready. **/
        function _setup() {
            utils.foreach(_defaults, function(rule, val) {
                if (options) {
                    if (options[rule] !== undefined) {
                        val = options[rule];
                    } else if (options[rule.toLowerCase()] !== undefined) {
                        val = options[rule.toLowerCase()];
                    }
                }
                _options[rule] = val;
            });

            // Place renderer and selector.
            _renderer = new jwplayer.html5.captions.renderer(_options, _display);
            _redraw(false);
        }


        /** Selection menu was closed. **/
        function _renderCaptions(index) {
            // Store new state and track
            if(index > 0) {
                _track = index - 1;
                _selectedTrack = index;
            } else {
                _selectedTrack = 0;
                _redraw(false);
                return;
            }

            if (_track >= _tracks.length) return;

            // Load new captions
            if(_tracks[_track].data) {
                _renderer.populate(_tracks[_track].data);
            } else if (_dlCount == _tracks.length)  {
                _errorHandler("file not loaded: " + _tracks[_track].file);
                if (_selectedTrack != 0) {
                     _sendEvent(events.JWPLAYER_CAPTIONS_CHANGED, _tracks, 0);
                }
                _selectedTrack = 0;
            } else {
                _waiting = index;
            }
            _redraw(false);
        }


        /** Listen to player time updates. **/
        function _timeHandler(event) {
            _renderer.update(event.position);
        }

        function _sendEvent(type, tracks, track) {
            var captionsEvent = {type: type, tracks: tracks, track: track};
            _eventDispatcher.sendEvent(type, captionsEvent);
        }

        function _getTracks() {
            var list = [{label: "Off"}];
            for (var i = 0; i < _tracks.length; i++) {
                list.push({label: _tracks[i].label});
            }
            return list;
        }

        this.element = function() {
            return _display;
        };
        
        this.getCaptionsList = function() {
            return _getTracks();
        };
        
        this.getCurrentCaptions = function() {
            return _selectedTrack;
        };
        
        this.setCurrentCaptions = function(index) {
            if (index >= 0 && _selectedTrack != index && index <= _tracks.length) {
                _renderCaptions(index);
                var tracks = _getTracks();
                utils.saveCookie("captionLabel", tracks[_selectedTrack].label);
                _sendEvent(events.JWPLAYER_CAPTIONS_CHANGED, tracks, _selectedTrack);
            }
        };
        
        _init();

    };

    _css(D_CLASS, {
        position: JW_CSS_ABSOLUTE,
        cursor: "pointer",
        width: JW_CSS_100PCT,
        height: JW_CSS_100PCT,
        overflow: JW_CSS_HIDDEN
    });

})(jwplayer);
(function(jwplayer) {
    var html5 = jwplayer.html5,
        utils = jwplayer.utils,
        _style = utils.css.style;

    /** Component that renders the actual captions on screen. **/
    html5.captions.renderer = function(_options,_div) {

        /** Current list with captions. **/
        var _captions,
        /** Container of captions window. **/
        _container,
        /** Container of captions text. **/
        _captionsWindow,
        /** Text container of captions. **/
        _textContainer,
        /** Current actie captions entry. **/
        _current,
        /** Current video position. **/
        _position,
        /** Should the captions be visible or not. **/
        _visible = 'visible',
        /** Interval for resize. **/
        _interval = -1;


        /** Hide the rendering component. **/
        this.hide = function() {
            clearInterval(_interval);
            _style(_container, {display:'none'});
        };

        /** Assign list of captions to the renderer. **/
        this.populate = function(captions) {
            _current = -1;
            _captions = captions;
            _select();
        };

        /** Render the active caption. **/
        function _render(html) {
            html = html || '';
            //hide containers before resizing
            _visible = 'hidden';
            _style(_container, {
                visibility: _visible
            });
            //update text and resize after delay
            _textContainer.innerHTML = html;
            if (html.length) {
                _visible = 'visible';
                setTimeout(_resize, 16);
            }
        }

        /** Store new dimensions. **/
        this.resize = function() {
            _resize();
        };

        /** Resize the captions. **/
        function _resize() {
            // only resize if visible
            if (_visible === 'visible') {
                var width = _container.clientWidth,
                    scale = Math.pow(width/400, 0.6);

                var size = _options.fontSize * scale;
                _style(_textContainer, {
                    maxWidth: width + 'px',
                    fontSize: Math.round(size) + 'px',
                    lineHeight: Math.round(size * 1.4) + 'px',
                    padding: Math.round(1 * scale) + 'px ' + Math.round(8 * scale) + 'px'
                });
                if (_options.windowOpacity) {
                    _style(_captionsWindow, {
                        padding: Math.round(5 * scale) + 'px',
                        borderRadius: Math.round(5 * scale) + 'px'
                    });
                }
                _style(_container, {
                    visibility: _visible
                });
            }
        }

        /** Select a caption for rendering. **/
        function _select() {
            var found = -1;
            for (var i=0; i < _captions.length; i++) {
                if (_captions[i]['begin'] <= _position && 
                    (i == _captions.length-1 || _captions[i+1]['begin'] >= _position)) {
                    found = i;
                    break;
                }
            }
            // If none, empty the text. If not current, re-render.
            if(found == -1) {
                _render('');
            } else if (found != _current) {
                _current = found;
                _render(_captions[i]['text']);
            }
        }

        /** Constructor for the renderer. **/
        function _setup() {
            var fontOpacity   = _options.fontOpacity,
                windowOpacity =_options.windowOpacity,
                edgeStyle     = _options.edgeStyle,
                bgColor       = _options.backgroundColor,
                windowStyle = {
                    display: 'inline-block'
                },
                textStyle = {
                    color: utils.hexToRgba(utils.rgbHex(_options.color), fontOpacity),
                    display: 'inline-block',
                    fontFamily: _options.fontFamily,
                    fontStyle:  _options.fontStyle,
                    fontWeight: _options.fontWeight,
                    textAlign: 'center',
                    textDecoration: _options.textDecoration,
                    wordWrap: 'break-word'
                };

            if (windowOpacity) {
                windowStyle.backgroundColor = utils.hexToRgba(utils.rgbHex(_options.windowColor), windowOpacity);
            }

            addEdgeStyle(edgeStyle, textStyle, fontOpacity);

            if(_options.back) {
                textStyle.backgroundColor = utils.hexToRgba(utils.rgbHex(bgColor), _options.backgroundOpacity);
            } else if (edgeStyle === null) {
                addEdgeStyle('uniform', textStyle);
            }

            _container      = document.createElement("div");
            _captionsWindow = document.createElement("div");
            _textContainer  = document.createElement("span");
            
            _style(_container, {
                display: 'block',
                height: 'auto',
                position: 'absolute',
                bottom: '20px',
                textAlign: 'center',
                width: '100%'
            });

            _style(_captionsWindow, windowStyle);

            _style(_textContainer, textStyle);

            _captionsWindow.appendChild(_textContainer);
            _container.appendChild(_captionsWindow);
            _div.appendChild(_container);
        }

        function addEdgeStyle(option, style, fontOpacity) {
            var color = utils.hexToRgba('#000000', fontOpacity);
            if (option === 'dropshadow') {       // small drop shadow
                style.textShadow = '0 2px 1px '+color;
            } else if (option === 'raised') {    // larger drop shadow
                style.textShadow = '0 0 5px '+color+', 0 1px 5px '+color+', 0 2px 5px '+color;
            } else if (option === 'depressed') { // top down shadow
                style.textShadow = '0 -2px 1px '+color;
            } else if (option === 'uniform') {   // outline
                style.textShadow = '-2px 0 1px '+color+',2px 0 1px '+color+',0 -2px 1px '+color+',0 2px 1px '+color+',-1px 1px 1px '+color+',1px 1px 1px '+color+',1px -1px 1px '+color+',1px 1px 1px '+color;
            }
        }

        /** Show the rendering component. **/
        this.show = function() {
            _style(_container, {display:'block'});
            _resize();
            clearInterval(_interval);
            _interval = setInterval(_resize, 250);
        };

        /** Update the video position. **/
        this.update = function(position) {
            _position = position;
            if(_captions) {
                _select();
            }
        };

        _setup();
    };

})(jwplayer);
/**
 * JW Player HTML5 Controlbar component
 * 
 * @author pablo
 * @version 6.0
 * 
 */
(function(jwplayer) {
	var html5 = jwplayer.html5,
		utils = jwplayer.utils,
		events = jwplayer.events,
		states = events.state,
		_css = utils.css,
		_setTransition = utils.transitionStyle,
		_isMobile = utils.isMobile(),
		_nonChromeAndroid = utils.isAndroid(4) && !utils.isChrome(),
		/** Controlbar element types * */
		CB_BUTTON = "button",
		CB_TEXT = "text",
		CB_DIVIDER = "divider",
		CB_SLIDER = "slider",
		
		/** Some CSS constants we should use for minimization * */
		JW_CSS_RELATIVE = "relative",
		JW_CSS_ABSOLUTE = "absolute",
		JW_CSS_NONE = "none",
		JW_CSS_BLOCK = "block",
		JW_CSS_INLINE = "inline",
		JW_CSS_INLINE_BLOCK = "inline-block",
		JW_CSS_HIDDEN = "hidden",
		JW_CSS_LEFT = "left",
		JW_CSS_RIGHT = "right",
		JW_CSS_100PCT = "100%",
		JW_CSS_SMOOTH_EASE = "opacity .25s, background .25s, visibility .25s",
		JW_VISIBILITY_TIMEOUT = 250,
		
		HIDDEN = { display: JW_CSS_NONE },
		SHOWING = { display: JW_CSS_BLOCK },
		NOT_HIDDEN = { display: UNDEFINED },
		
		CB_CLASS = 'span.jwcontrolbar',
		TYPEOF_ARRAY = "array",
		
		FALSE = false,
		TRUE = true,
		NULL = null,
		UNDEFINED,
		
		WINDOW = window,
		DOCUMENT = document;
	
	/** HTML5 Controlbar class * */
	html5.controlbar = function(api, config) {
		var _api,
			_skin,
			_dividerElement = _layoutElement("divider", CB_DIVIDER),
			_defaults = {
				margin : 8,
				maxwidth: 800,
				font : "Arial,sans-serif",
				fontsize : 11,
				fontcolor : parseInt("eeeeee", 16),
				fontweight : "bold",
				layout : {
					left: {
						position: "left",
						elements: [ 
							_layoutElement("play", CB_BUTTON), 
							_layoutElement("prev", CB_BUTTON), 
							_layoutElement("next", CB_BUTTON), 
							_layoutElement("elapsed", CB_TEXT)
						]
					},
					center: {
						position: "center",
						elements: [ 
							_layoutElement("time", CB_SLIDER),
							_layoutElement("alt", CB_TEXT)
						]
					},
					right: {
						position: "right",
						elements: [ 
							_layoutElement("duration", CB_TEXT), 
							_layoutElement("hd", CB_BUTTON), 
							_layoutElement("cc", CB_BUTTON), 
							_layoutElement("mute", CB_BUTTON), 
							_layoutElement("volume", CB_SLIDER), 
							_layoutElement("volumeH", CB_SLIDER), 
							_layoutElement("fullscreen", CB_BUTTON)
						]
					}
				}
			},
		
			_settings, 
			_layout, 
			_elements,
			_bgHeight,
			_controlbar, 
			_id,
			_duration,
			_position,
			_levels,
			_currentQuality,
			_captions,
			_currentCaptions,
			_currentVolume,
			_volumeOverlay,
			_cbBounds,
			_timeRail,
			_railBounds,
			_timeOverlay,
			_timeOverlayContainer,
			_timeOverlayThumb,
			_timeOverlayText,
			_hdTimer,
			_hdTapTimer,
			_hdOverlay,
			_ccTimer,
			_ccTapTimer,
			_ccOverlay,
			_redrawTimeout,
			_hideTimeout = -1,
			_audioMode = FALSE,
			_hideFullscreen = FALSE,
			_dragging = NULL,	
			_lastSeekTime = 0,
			_lastTooltipPositionTime = 0,
			_cues = [],
			_activeCue,
			_instreamMode = FALSE,
			_eventDispatcher = new events.eventdispatcher(),
			
			_toggles = {
				play: "pause",
				mute: "unmute",
				fullscreen: "normalscreen"
			},
			
			_toggleStates = {
				play: FALSE,
				mute: FALSE,
				fullscreen: FALSE
			},
			
			_buttonMapping = {
				play: _play,
				mute: _mute,
				fullscreen: _fullscreen,
				next: _next,
				prev: _prev,
				hd: _hd,
				cc: _cc
			},
			
			_sliderMapping = {
				time: _seek,
				volume: _volume
			},
		
			_overlays = {},
			_jwhidden = [],
			_this = this;

		utils.extend(_this, _eventDispatcher);
			
		function _layoutElement(name, type, className) {
			return { name: name, type: type, className: className };
		}
		
		function _init() {
			_elements = {};
			
			_api = api;

			_id = _api.id + "_controlbar";
			_duration = _position = 0;

			_controlbar = _createSpan();
			_controlbar.id = _id;
			_controlbar.className = "jwcontrolbar";

			_skin = _api.skin;
			_layout = _skin.getComponentLayout('controlbar');
			if (!_layout) _layout = _defaults.layout;
			utils.clearCss(_internalSelector());
			_css.block(_id+'build');
			_createStyles();
			_buildControlbar();
			_css.unblock(_id+'build');
			_addEventListeners();
			setTimeout(_volumeHandler, 0);
			_playlistHandler();
			_this.visible = false;
		}
		
		
		function _addEventListeners() {
			_api.jwAddEventListener(events.JWPLAYER_MEDIA_TIME, _timeUpdated);
			_api.jwAddEventListener(events.JWPLAYER_PLAYER_STATE, _stateHandler);
			_api.jwAddEventListener(events.JWPLAYER_PLAYLIST_ITEM, _itemHandler);
			_api.jwAddEventListener(events.JWPLAYER_MEDIA_MUTE, _volumeHandler);
			_api.jwAddEventListener(events.JWPLAYER_MEDIA_VOLUME, _volumeHandler);
			_api.jwAddEventListener(events.JWPLAYER_MEDIA_BUFFER, _bufferHandler);
			_api.jwAddEventListener(events.JWPLAYER_FULLSCREEN, _fullscreenHandler);
			_api.jwAddEventListener(events.JWPLAYER_PLAYLIST_LOADED, _playlistHandler);
			_api.jwAddEventListener(events.JWPLAYER_MEDIA_LEVELS, _qualityHandler);
			_api.jwAddEventListener(events.JWPLAYER_MEDIA_LEVEL_CHANGED, _qualityLevelChanged);
			_api.jwAddEventListener(events.JWPLAYER_CAPTIONS_LIST, _captionsHandler);
			_api.jwAddEventListener(events.JWPLAYER_CAPTIONS_CHANGED, _captionChanged);
			_api.jwAddEventListener(events.JWPLAYER_RESIZE, _resizeHandler);
			if (!_isMobile) {
				_controlbar.addEventListener('mouseover', function() {
					// Slider listeners
					WINDOW.addEventListener('mousemove', _sliderMouseEvent, FALSE);
					WINDOW.addEventListener('mousedown', _killSelect, FALSE);
				}, false);
				_controlbar.addEventListener('mouseout', function(){
					// Slider listeners
					WINDOW.removeEventListener('mousemove', _sliderMouseEvent);
					WINDOW.removeEventListener('mousedown', _killSelect);
					DOCUMENT.onselectstart = null;
				}, false);
			}
		}
		
		function _resizeHandler() {
			_cbBounds = utils.bounds(_controlbar);
			if (_cbBounds.width > 0) {
				_this.show(TRUE);
			}
		}


		function _timeUpdated(evt) {
			_css.block(_id); //unblock on redraw

			// Positive infinity for live streams on iPad, 0 for live streams on Safari (HTML5)
			if (evt.duration == Number.POSITIVE_INFINITY || (!evt.duration && utils.isSafari() && !_isMobile)) {
				_this.setText(_api.jwGetPlaylist()[_api.jwGetPlaylistIndex()].title || "Live broadcast");
				
			} else {
				var timeString;
				if (_elements.elapsed) {
					timeString = utils.timeFormat(evt.position);
					_elements.elapsed.innerHTML = timeString;
				}
				if (_elements.duration) {
					timeString = utils.timeFormat(evt.duration);
					_elements.duration.innerHTML = timeString;
				}
				if (evt.duration > 0) {
					_setProgress(evt.position / evt.duration);
				} else {
					_setProgress(0);
				}
				_duration = evt.duration;
				_position = evt.position;
				if (!_instreamMode) { // TODO: tech dept cleanup
					_this.setText();
				}
			}
		}
		
		function _stateHandler(evt) {
			switch (evt.newstate) {
			case states.BUFFERING:
			case states.PLAYING:
				if (_elements.timeSliderThumb) {
					_css.style(_elements.timeSliderThumb, {
						opacity: 1
					});
				}
				_toggleButton("play", TRUE);
				break;
			case states.PAUSED:
				if (!_dragging) {
					_toggleButton("play", FALSE);
				}
				break;
			case states.IDLE:
				_toggleButton("play", FALSE);
				if (_elements.timeSliderThumb) {
					_css.style(_elements.timeSliderThumb, {
						opacity: 0
					});
				}
				if (_elements.timeRail) {
					_elements.timeRail.className = "jwrail";
					setTimeout(function() {
						// Temporarily disable the buffer animation
						_elements.timeRail.className += " jwsmooth";
					}, 100);
				}
				_setBuffer(0);
				_timeUpdated({ position: 0, duration: 0});
				break;
			}
		}
		
		function _itemHandler(evt) {
			if(!_instreamMode) {
				var tracks = _api.jwGetPlaylist()[evt.index].tracks,
					tracksloaded = FALSE,
					cuesloaded = FALSE;
				_removeCues();
				if (utils.typeOf(tracks) == TYPEOF_ARRAY && !_isMobile) {
					for (var i=0; i < tracks.length; i++) {
						if (!tracksloaded && tracks[i].file && tracks[i].kind && tracks[i].kind.toLowerCase() == "thumbnails") {
							_timeOverlayThumb.load(tracks[i].file);
							tracksloaded  = TRUE;
						}
						if (tracks[i].file && tracks[i].kind && tracks[i].kind.toLowerCase() == "chapters") {
							_loadCues(tracks[i].file);
							cuesloaded = TRUE;
						}
					}
				}
				// If we're here, there are no thumbnails to load - we should clear out the thumbs from the previous item
				if (!tracksloaded) {
					_timeOverlayThumb.load();
				}
			}
		}
		
		function _volumeHandler() {
			var muted = _api.jwGetMute();
			_currentVolume = _api.jwGetVolume() / 100;
			_toggleButton("mute", muted || _currentVolume === 0);
			_setVolume(muted ? 0 : _currentVolume);
		}

		function _bufferHandler(evt) {
			_setBuffer(evt.bufferPercent / 100);
		}
		
		function _fullscreenHandler(evt) {
			_toggleButton("fullscreen", evt.fullscreen);
			_updateNextPrev();
			if (_this.visible) {
				_this.show(TRUE);
			}
		}
		
		function _playlistHandler() {
			_css.style(_elements.hd, HIDDEN);
			_css.style(_elements.cc, HIDDEN);
			_updateNextPrev();
			_redraw();
		}
		
		function _hasHD() {
			return (!_instreamMode && _levels && _levels.length > 1 && _hdOverlay);
		}
		
		function _qualityHandler(evt) {
			_levels = evt.levels;
			if (_hasHD()) {
				_css.style(_elements.hd, NOT_HIDDEN);
				_hdOverlay.clearOptions();
				for (var i=0; i<_levels.length; i++) {
					_hdOverlay.addOption(_levels[i].label, i);
				}
				_qualityLevelChanged(evt);
			} else {
				_css.style(_elements.hd, HIDDEN);
			}
			_redraw();
		}
		
		function _qualityLevelChanged(evt) {
			_currentQuality = evt.currentQuality|0;
			if (_elements.hd) {
				_elements.hd.querySelector("button").className = (_levels.length === 2 && _currentQuality === 0) ? "off" : "";
			}
			if (_hdOverlay && _currentQuality >= 0) {
				_hdOverlay.setActive(evt.currentQuality);
			}
		}
		
		function _hasCaptions() {
			return (!_instreamMode && _captions && _captions.length > 1 && _ccOverlay);			
		}
		
		function _captionsHandler(evt) {
			_captions = evt.tracks;
			if (_hasCaptions()) {
				_css.style(_elements.cc, NOT_HIDDEN);
				_ccOverlay.clearOptions();
				for (var i=0; i<_captions.length; i++) {
					_ccOverlay.addOption(_captions[i].label, i);
				}
				_captionChanged(evt);
			} else {
				_css.style(_elements.cc, HIDDEN );
			}
			_redraw();
		}
		
		function _captionChanged(evt) {
			if (!_captions) return;
			_currentCaptions = evt.track|0;
			if (_elements.cc) {
				_elements.cc.querySelector("button").className = (_captions.length === 2 && _currentCaptions === 0) ? "off" : "";
			}
			if (_ccOverlay && _currentCaptions >= 0) {
				_ccOverlay.setActive(evt.track);
			}
		}

		// Bit of a hacky way to determine if the playlist is available
		function _sidebarShowing() {
			return (!!DOCUMENT.querySelector("#"+_api.id+" .jwplaylist") && !_api.jwGetFullscreen());
		}
		
		/**
		 * Styles specific to this controlbar/skin
		 */
		function _createStyles() {
			_settings = utils.extend({}, _defaults, _skin.getComponentSettings('controlbar'), config);

			_bgHeight = _getSkinElement("background").height;
			
			var margin = _audioMode ? 0 : _settings.margin;
			var styles = {
				height: _bgHeight,
				bottom: margin,
				left: margin,
				right: margin,
				'max-width': _audioMode ? '' : _settings.maxwidth
			};
			_css.style(_controlbar, styles);
			
			_css(_internalSelector(".jwtext"), {
				font: _settings.fontsize + "px/" + _getSkinElement("background").height + "px " + _settings.font,
				color: _settings.fontcolor,
				'font-weight': _settings.fontweight
			});

			_css(_internalSelector(".jwoverlay"), {
				bottom: _bgHeight
			});
		}

		
		function _internalSelector(name) {
			return '#' + _id + (name ? " " + name : "");
		}

		function _createSpan() {
			return _createElement("span");
		}
		
		function _createElement(tagname) {
			return DOCUMENT.createElement(tagname);
		}
		
		function _buildControlbar() {
			var capLeft = _buildImage("capLeft");
			var capRight = _buildImage("capRight");
			var bg = _buildImage("background", {
				position: JW_CSS_ABSOLUTE,
				left: _getSkinElement('capLeft').width,
				right: _getSkinElement('capRight').width,
				'background-repeat': "repeat-x"
			}, TRUE);

			if (bg) _appendChild(_controlbar, bg);
			if (capLeft) _appendChild(_controlbar, capLeft);
			_buildLayout();
			if (capRight) _appendChild(_controlbar, capRight);
		}
		
		function _buildElement(element, pos) {
			switch (element.type) {
			case CB_TEXT:
				return _buildText(element.name);
			case CB_BUTTON:
				if (element.name != "blank") {
					return _buildButton(element.name,pos);
				}
				break;
			case CB_SLIDER:
				return _buildSlider(element.name);
			}
		}
		
		function _buildImage(name, style, stretch, nocenter, vertical) {
			var element = _createSpan(),
				skinElem = _getSkinElement(name),
				center = nocenter ? " left center" : " center",
				size = _elementSize(skinElem),
				newStyle;

			element.className = 'jw'+name;
			element.innerHTML = "&nbsp;";
			
			if (!skinElem || !skinElem.src) {
				return;
			}

			if (stretch) {
				newStyle = {
					background: "url('" + skinElem.src + "') repeat-x " + center,
					'background-size': size,
					height: vertical ? skinElem.height : UNDEFINED 
				};
			} else {
				newStyle = {
					background: "url('" + skinElem.src + "') no-repeat" + center,
					'background-size': size,
					width: skinElem.width,
					height: vertical ? skinElem.height : UNDEFINED 
				};
			}
			element.skin = skinElem;
			_css(_internalSelector((vertical? ".jwvertical " : "") + '.jw'+name), utils.extend(newStyle, style));
			_elements[name] = element;
			return element;
		}

		function _buildButton(name, pos) {
			if (!_getSkinElement(name + "Button").src) {
				return NULL;
			}

			// Don't show volume or mute controls on mobile, since it's not possible to modify audio levels in JS
			if (_isMobile && (name == "mute" || name.indexOf("volume")===0)) return NULL;
			// Having issues with stock (non-chrome) Android browser and showing overlays.  Just remove HD/CC buttons in that case
			if (_nonChromeAndroid && /hd|cc/.test(name)) return NULL;
			
			
			var element = _createSpan();
			var span = _createSpan();
			var divider = _buildDivider(_dividerElement);
			var button = _createElement("button");
			element.style += " display:inline-block";
			element.className = 'jw'+name + ' jwbuttoncontainer';
			if (pos == "left") {
				_appendChild(element, span);
				_appendChild(element,divider);
			} else {
				_appendChild(element, divider);
				_appendChild(element, span);
			}
			
			if (!_isMobile) {
				button.addEventListener("click", _buttonClickHandler(name), FALSE);	
			}
			else if (name != "hd" && name != "cc") {
				var buttonTouch = new utils.touch(button); 
				buttonTouch.addEventListener(utils.touchEvents.TAP, _buttonClickHandler(name));
			}
			button.innerHTML = "&nbsp;";
			_appendChild(span, button);

			var outSkin = _getSkinElement(name + "Button"),
				overSkin = _getSkinElement(name + "ButtonOver"),
				offSkin = _getSkinElement(name + "ButtonOff");
			
			
			_buttonStyle(_internalSelector('.jw'+name+" button"), outSkin, overSkin, offSkin);
			var toggle = _toggles[name];
			if (toggle) {
				_buttonStyle(_internalSelector('.jw'+name+'.jwtoggle button'), _getSkinElement(toggle+"Button"), _getSkinElement(toggle+"ButtonOver"));
			}

			_elements[name] = element;
			
			return element;
		}
		
		function _buttonStyle(selector, out, over, off) {
			if (!out || !out.src) return;
			
			_css(selector, { 
				width: out.width,
				background: 'url('+ out.src +') no-repeat center',
				'background-size': _elementSize(out)
			});
			
			if (over.src && !_isMobile) {
				_css(selector + ':hover,' + selector + '.off:hover', { 
					background: 'url('+ over.src +') no-repeat center',
					'background-size': _elementSize(over)
				});
			}
			
			if (off && off.src) {
				_css(selector + '.off', { 
					background: 'url('+ off.src +') no-repeat center',
					'background-size': _elementSize(off)
				});
			}
		}
		
		function _buttonClickHandler(name) {
			return function(evt) {
				if (_buttonMapping[name]) {
					_buttonMapping[name]();
					if (_isMobile) {
						_eventDispatcher.sendEvent(events.JWPLAYER_USER_ACTION);
					}
				}
				if (evt.preventDefault) {
					evt.preventDefault();
				}
			};
		}
		

		function _play() {
			if (_toggleStates.play) {
				_api.jwPause();
			} else {
				_api.jwPlay();
			}
		}
		
		function _mute() {
			var muted = !_toggleStates.mute;
			_api.jwSetMute(muted);
			if (!muted && _currentVolume === 0) {
				_api.jwSetVolume(20);
			}
			_volumeHandler();
		}

		function _hideOverlays(exception) {
			utils.foreach(_overlays, function(i, overlay) {
				if (i != exception) {
					if (i == "cc") {
						_clearCcTapTimeout();
					}
					if (i == "hd") {
						_clearHdTapTimeout();
					}
					overlay.hide();
				}
			});
		}
		
		function _hideTimes() {
			if(_controlbar) {
				var jwalt = _elements.alt;
				if (!jwalt) return;
				if (_controlbar.parentNode && _controlbar.parentNode.clientWidth >= 320) {
					_css.style(_jwhidden, NOT_HIDDEN);
				} else {
					_css.style(_jwhidden, HIDDEN);
				}
			}
		}
		function _showVolume() {
			if (_audioMode || _instreamMode) return;
			_css.block(_id); // unblock on position overlay
			_volumeOverlay.show();
			_positionOverlay('volume', _volumeOverlay);
			_hideOverlays('volume');
		}
		
		function _volume(pct) {
			_setVolume(pct);
			if (pct < 0.1) pct = 0;
			if (pct > 0.9) pct = 1;
			_api.jwSetVolume(pct * 100);
		}
		
		function _seek(pct) {
			_api.jwSeek(_activeCue ? _activeCue.position : pct * _duration);
		}
		
		function _fullscreen() {
			_api.jwSetFullscreen();
		}

		function _next() {
			_api.jwPlaylistNext();
		}

		function _prev() {
			_api.jwPlaylistPrev();
		}

		function _toggleButton(name, state) {
			if (!utils.exists(state)) {
				state = !_toggleStates[name];
			}
			if (_elements[name]) {
				_elements[name].className = 'jw' + name + (state ? " jwtoggle jwtoggling" : " jwtoggling");
				// Use the jwtoggling class to temporarily disable the animation
				setTimeout(function() {
					_elements[name].className = _elements[name].className.replace(" jwtoggling", ""); 
				}, 100);
			}
			_toggleStates[name] = state;
		}
		
		function _createElementId(name) {
			return _id + "_" + name;
		}
		
		function _buildText(name) {
			var style = {},
				skinName = (name == "alt") ? "elapsed" : name,
				skinElement = _getSkinElement(skinName+"Background");
			if (skinElement.src) {
				var element = _createSpan();
				element.id = _createElementId(name); 
				if (name == "elapsed" || name == "duration") {
					element.className = "jwtext jw" + name + " jwhidden";
					_jwhidden.push(element);
				} else {
					element.className = "jwtext jw" + name;
				}
				style.background = "url(" + skinElement.src + ") repeat-x center";
				style['background-size'] = _elementSize(_getSkinElement("background"));
				_css.style(element, style);
				element.innerHTML = (name != "alt") ? "00:00" : "";
				
				_elements[name] = element;
				return element;
			}
			return null;
		}
		
		function _elementSize(skinElem) {
			return skinElem ? parseInt(skinElem.width, 10) + "px " + parseInt(skinElem.height, 10) + "px" : "0 0";
		}
		
		function _buildDivider(divider) {
			var element = _buildImage(divider.name);
			if (!element) {
				element = _createSpan();
				element.className = "jwblankDivider";
			}
			if (divider.className) element.className += " " + divider.className;
			return element;
		}
		
		function _showHd() {
			if (_levels && _levels.length > 2) {
				if (_hdTimer) {
					clearTimeout(_hdTimer);
					_hdTimer = UNDEFINED;
				}
				_css.block(_id); // unblock on position overlay
				_hdOverlay.show();
				_positionOverlay('hd', _hdOverlay);
				_hideOverlays('hd');
			}
		}
		
		function _showCc() {
			if (_captions && _captions.length > 2) {
				if (_ccTimer) {
					clearTimeout(_ccTimer);
					_ccTimer = UNDEFINED;
				}
				_css.block(_id); // unblock on position overlay
				_ccOverlay.show();
				_positionOverlay('cc', _ccOverlay);
				_hideOverlays('cc');
			}
		}

		function _switchLevel(newlevel) {
			if (newlevel >= 0 && newlevel < _levels.length) {
				_api.jwSetCurrentQuality(newlevel);
				_clearHdTapTimeout();
				_hdOverlay.hide();
			}
		}
		
		function _switchCaption(newcaption) {
			if (newcaption >= 0 && newcaption < _captions.length) {
				_api.jwSetCurrentCaptions(newcaption);
				_clearCcTapTimeout();
				_ccOverlay.hide();
			}
		}

		function _cc() {
			if (_captions.length != 2) return;
			_switchCaption((_currentCaptions + 1) % 2); 
		}

		function _hd() {
			if (_levels.length != 2) return;
			_switchLevel((_currentQuality + 1) % 2);
		}
		
		function _buildSlider(name) {
			if (_isMobile && name.indexOf("volume") === 0) return;
			
			var slider = _createSpan(),
				vertical = name == "volume",
				skinPrefix = name + (name=="time"?"Slider":""),
				capPrefix = skinPrefix + "Cap",
				left = vertical ? "Top" : "Left",
				right = vertical ? "Bottom" : "Right",
				capLeft = _buildImage(capPrefix + left, NULL, FALSE, FALSE, vertical),
				capRight = _buildImage(capPrefix + right, NULL, FALSE, FALSE, vertical),
				rail = _buildSliderRail(name, vertical, left, right),
				capLeftSkin = _getSkinElement(capPrefix+left),
				capRightSkin = _getSkinElement(capPrefix+left);
				//railSkin = _getSkinElement(name+"SliderRail");
			
			slider.className = "jwslider jw" + name;
			
			if (capLeft) _appendChild(slider, capLeft);
			_appendChild(slider, rail);
			if (capRight) {
				if (vertical) capRight.className += " jwcapBottom";
				_appendChild(slider, capRight);
			}

			_css(_internalSelector(".jw" + name + " .jwrail"), {
				left: vertical ? UNDEFINED : capLeftSkin.width,
				right: vertical ? UNDEFINED : capRightSkin.width,
				top: vertical ? capLeftSkin.height : UNDEFINED,
				bottom: vertical ? capRightSkin.height : UNDEFINED,
				width: vertical ? JW_CSS_100PCT : UNDEFINED,
				height: vertical ? "auto" : UNDEFINED
			});

			_elements[name] = slider;
			slider.vertical = vertical;

			if (name == "time") {
				_timeOverlay = new html5.overlay(_id+"_timetooltip", _skin);
				_timeOverlayThumb = new html5.thumbs(_id+"_thumb");
				_timeOverlayText = _createElement("div");
				_timeOverlayText.className = "jwoverlaytext";
				_timeOverlayContainer = _createElement("div");
				_appendChild(_timeOverlayContainer, _timeOverlayThumb.element());
				_appendChild(_timeOverlayContainer, _timeOverlayText);
				_timeOverlay.setContents(_timeOverlayContainer);
				_timeRail = rail;
				_setTimeOverlay(0);
				_appendChild(rail, _timeOverlay.element());
				_styleTimeSlider(slider);
				_setProgress(0);
				_setBuffer(0);
			} else if (name.indexOf("volume")===0) {
				_styleVolumeSlider(slider, vertical, left, right);
			}
			
			return slider;
		}
		
		function _buildSliderRail(name, vertical, left, right) {
			var rail = _createSpan(),
				railElements = ['Rail', 'Buffer', 'Progress'],
				progressRail,
				sliderPrefix;
			
			rail.className = "jwrail jwsmooth";

			for (var i=0; i<railElements.length; i++) {
				sliderPrefix = (name=="time"?"Slider":"");
				var prefix = name + sliderPrefix + railElements[i],
					element = _buildImage(prefix, NULL, !vertical, (name.indexOf("volume")===0), vertical),
					capLeft = _buildImage(prefix + "Cap" + left, NULL, FALSE, FALSE, vertical),
					capRight = _buildImage(prefix + "Cap" + right, NULL, FALSE, FALSE, vertical),
					capLeftSkin = _getSkinElement(prefix + "Cap" + left),
					capRightSkin = _getSkinElement(prefix + "Cap" + right);

				if (element) {
					var railElement = _createSpan();
					railElement.className = "jwrailgroup " + railElements[i];
					if (capLeft) _appendChild(railElement, capLeft);
					_appendChild(railElement, element);
					if (capRight) { 
						_appendChild(railElement, capRight);
						capRight.className += " jwcap" + (vertical ? "Bottom" : "Right");
					}
					
					_css(_internalSelector(".jwrailgroup." + railElements[i]), {
						'min-width': (vertical ? UNDEFINED : capLeftSkin.width + capRightSkin.width)
					});
					railElement.capSize = vertical ? capLeftSkin.height + capRightSkin.height : capLeftSkin.width + capRightSkin.width;
					
					_css(_internalSelector("." + element.className), {
						left: vertical ? UNDEFINED : capLeftSkin.width,
						right: vertical ? UNDEFINED : capRightSkin.width,
						top: vertical ? capLeftSkin.height : UNDEFINED,
						bottom: vertical ? capRightSkin.height : UNDEFINED,
						height: vertical ? "auto" : UNDEFINED
					});

					if (i == 2) progressRail = railElement;
					
					if (i == 2 && !vertical) {
						var progressContainer = _createSpan();
						progressContainer.className = "jwprogressOverflow";
						_appendChild(progressContainer, railElement);
						_elements[prefix] = progressContainer;
						_appendChild(rail, progressContainer);
					} else {
						_elements[prefix] = railElement;
						_appendChild(rail, railElement);
					}
				}
			}
			
			var thumb = _buildImage(name + sliderPrefix + "Thumb", NULL, FALSE, FALSE, vertical);
			if (thumb) {
				_css(_internalSelector('.'+thumb.className), {
					opacity: name == "time" ? 0 : 1,
					'margin-top': vertical ? thumb.skin.height / -2 : UNDEFINED
				});
				
				thumb.className += " jwthumb";
				_appendChild(vertical && progressRail ? progressRail : rail, thumb);
			}
			
			if (!_isMobile) {
				var sliderName = name;
				if (sliderName == "volume" && !vertical) sliderName += "H";
				rail.addEventListener('mousedown', _sliderMouseDown(sliderName), FALSE);
			}
			else {
				var railTouch = new utils.touch(rail);
				railTouch.addEventListener(utils.touchEvents.DRAG_START, _sliderDragStart);
				railTouch.addEventListener(utils.touchEvents.DRAG, _sliderDragEvent);
				railTouch.addEventListener(utils.touchEvents.DRAG_END, _sliderDragEvent);
				railTouch.addEventListener(utils.touchEvents.TAP, _sliderTapEvent);
			}
			
			if (name == "time" && !_isMobile) {
				rail.addEventListener('mousemove', _showTimeTooltip, FALSE);
				rail.addEventListener('mouseout', _hideTimeTooltip, FALSE);
			}
			
			_elements[name+'Rail'] = rail;
			
			return rail;
		}
		
		function _idle() {
			var currentState = _api.jwGetState();
			return (currentState == states.IDLE); 
		}

		function _killSelect(evt) {
			evt.preventDefault();
			DOCUMENT.onselectstart = function () { return FALSE; };
		}

		function _draggingStart(name) {
			_draggingEnd();
			_dragging = name;
			WINDOW.addEventListener('mouseup', _sliderMouseEvent, FALSE);
		}

		function _draggingEnd() {
			WINDOW.removeEventListener('mouseup', _sliderMouseEvent);
			_dragging = NULL;
		}

		function _sliderDragStart() {
			_elements.timeRail.className = 'jwrail';
			if (!_idle()) {
				_api.jwSeekDrag(TRUE);
				_draggingStart('time');
				_showTimeTooltip();
				_eventDispatcher.sendEvent(events.JWPLAYER_USER_ACTION);
			}
		}

		function _sliderDragEvent(evt) {
			if (!_dragging) return;

			var currentTime = (new Date()).getTime();

			if (currentTime - _lastTooltipPositionTime > 50) {
				_positionTimeTooltip(evt);
				_lastTooltipPositionTime = currentTime;
			}

			var rail = _elements[_dragging].querySelector('.jwrail'),
				railRect = utils.bounds(rail),
				pct = evt.x / railRect.width;
			if (pct > 100) {
				pct = 100;
			}
			if (evt.type == utils.touchEvents.DRAG_END) {
				_api.jwSeekDrag(FALSE);
				_elements.timeRail.className = "jwrail jwsmooth";
				_draggingEnd();
				_sliderMapping.time(pct);
				_hideTimeTooltip();
				_eventDispatcher.sendEvent(events.JWPLAYER_USER_ACTION);
			}
			else {
				_setProgress(pct);
				if (currentTime - _lastSeekTime > 500) {
					_lastSeekTime = currentTime;
					_sliderMapping.time(pct);
				}
				_eventDispatcher.sendEvent(events.JWPLAYER_USER_ACTION);
			}
		}

		function _sliderTapEvent(evt) {
			var rail = _elements.time.querySelector('.jwrail'),
				railRect = utils.bounds(rail),
				pct = evt.x / railRect.width;		
			if (pct > 100) {
				pct = 100;
			}
			if (!_idle()) {
				_sliderMapping.time(pct);
				_eventDispatcher.sendEvent(events.JWPLAYER_USER_ACTION);
			}
		}

		function _sliderMouseDown(name) {
			return (function(evt) {
				if (evt.button)
					return;
				
				_elements[name+'Rail'].className = "jwrail";
				
				if (name == "time") {
					if (!_idle()) {
						_api.jwSeekDrag(TRUE);
						_draggingStart(name);
					}
				} else {
					_draggingStart(name);
				}
			});
		}
		
		function _sliderMouseEvent(evt) {
			
			var currentTime = (new Date()).getTime();
			
			if (currentTime - _lastTooltipPositionTime > 50) {
				_positionTimeTooltip(evt);
				_lastTooltipPositionTime = currentTime;
			}
			
			if (!_dragging || evt.button) {
				return;
			}
			
			var rail = _elements[_dragging].querySelector('.jwrail'),
				railRect = utils.bounds(rail),
				name = _dragging,
				pct = _elements[name].vertical ? (railRect.bottom - evt.pageY) / railRect.height : (evt.pageX - railRect.left) / railRect.width;
			
			if (evt.type == 'mouseup') {
				if (name == "time") {
					_api.jwSeekDrag(FALSE);
				}

				_elements[name+'Rail'].className = "jwrail jwsmooth";
				_draggingEnd();
				_sliderMapping[name.replace("H", "")](pct);
			} else {
				if (_dragging == "time") {
					_setProgress(pct);
				} else {
					_setVolume(pct);
				}
				if (currentTime - _lastSeekTime > 500) {
					_lastSeekTime = currentTime;
					_sliderMapping[_dragging.replace("H", "")](pct);
				}
			}
			return false;
		}

		function _showTimeTooltip() {
			if (_timeOverlay && _duration && !_audioMode && !_isMobile) {
				_css.block(_id); // unblock on position overlay
				_timeOverlay.show();
				_positionOverlay('time', _timeOverlay);
			}
		}
		
		function _hideTimeTooltip() {
			if (_timeOverlay) {
				_timeOverlay.hide();
			}
		}
		
		function _positionTimeTooltip(evt) {
			_cbBounds = utils.bounds(_controlbar);
			_railBounds = utils.bounds(_timeRail);
			if (!_railBounds || _railBounds.width === 0) return;
			var position = evt.x;
			if (evt.pageX) {
				position = evt.pageX - _railBounds.left;
			}
			if (position >= 0 && position <= _railBounds.width) {
				_timeOverlay.positionX(Math.round(position));
				_setTimeOverlay(_duration * position / _railBounds.width);
			}
		}
		
		function _setTimeOverlay(sec) {
			var thumbUrl = _timeOverlayThumb.updateTimeline(sec, function(width) {
				_css.style(_timeOverlay.element(), {
					'width': width
				});
				_positionOverlay('time', _timeOverlay);
			});
			var text;
			if (_activeCue) {
				text = _activeCue.text;
				if (text) {
					_css.style(_timeOverlay.element(), {
						'width': (text.length > 32) ? 160: ''
					});
				}
			} else {
				text = utils.timeFormat(sec);
				if (!thumbUrl) {
					_css.style(_timeOverlay.element(), {
						'width': ''
					});
				}
			}
			if (_timeOverlayText.innerHTML !== text) {
				_timeOverlayText.innerHTML = text;
			}
			_positionOverlay('time', _timeOverlay);
		}
		
		function _styleTimeSlider() {
			if (!_elements.timeSliderRail) {
				_css.style(_elements.time, HIDDEN);
			}

			if (_elements.timeSliderThumb) {
				_css.style(_elements.timeSliderThumb, {
					'margin-left': (_getSkinElement("timeSliderThumb").width/-2)
				});
			}

			var cueClass = "timeSliderCue", 
				cue = _getSkinElement(cueClass),
				cueStyle = {
					'z-index': 1
				};
			
			if (cue && cue.src) {
				_buildImage(cueClass);
				cueStyle['margin-left'] = cue.width / -2;
			} else {
				cueStyle.display = JW_CSS_NONE;
			}
			_css(_internalSelector(".jw" + cueClass), cueStyle);
			
			_setBuffer(0);
			_setProgress(0);
		}
		
		function _addCue(timePos, text) {
			if (timePos.toString().search(/^[\d\.]+%?$/) >= 0) {
				var cueElem = _buildImage("timeSliderCue"),
					rail = _elements.timeSliderRail,
					cue = {
						position: timePos,
						text: text,
						element: cueElem
					};
				
				if (cueElem && rail) {
					rail.appendChild(cueElem);
					cueElem.addEventListener("mouseover", function() { _activeCue = cue; }, false);
					cueElem.addEventListener("mouseout", function() { _activeCue = NULL; }, false);
					_cues.push(cue);
				}
				
			}
			_drawCues();
		}
		
		function _drawCues() {
			utils.foreach(_cues, function(idx, cue) {
				var style = {};
				if (cue.position.toString().search(/^[\d\.]+%$/) > -1) {
					style.left = cue.position;
				} else {
					style.left = (100 * cue.position / _duration).toFixed(2) + '%';
				}
				_css.style(cue.element, style);
			});
		}
		
		function _removeCues() {
			var rail = _elements.timeSliderRail;
			utils.foreach(_cues, function(idx, cue) {
				rail.removeChild(cue.element);
			});
			_cues.length = 0;
		}
		
		_this.setText = function(text) {
			_css.block(_id); //unblock on redraw
			var jwalt = _elements.alt,
				jwtime = _elements.time;
			if (!_elements.timeSliderRail) {
				_css.style(jwtime, HIDDEN);
			} else {
				_css.style(jwtime, text ? HIDDEN : SHOWING);
			}
			if (jwalt) {
				_css.style(jwalt, text ? SHOWING : HIDDEN);
				jwalt.innerHTML = text || "";
			}
			_redraw();
		};
		
		function _styleVolumeSlider(slider, vertical, left, right) {
			var prefix = "volume" + (vertical ? "" : "H"),
				direction = vertical ? "vertical" : "horizontal";
			
			_css(_internalSelector(".jw"+prefix+".jw" + direction), {
				width: _getSkinElement(prefix+"Rail", vertical).width + (vertical ? 0 : 
					(_getSkinElement(prefix+"Cap"+left).width + 
					_getSkinElement(prefix+"RailCap"+left).width +
					_getSkinElement(prefix+"RailCap"+right).width + 
					_getSkinElement(prefix+"Cap"+right).width)
				),
				height: vertical ? (
					_getSkinElement(prefix+"Cap"+left).height + 
					_getSkinElement(prefix+"Rail").height + 
					_getSkinElement(prefix+"RailCap"+left).height + 
					_getSkinElement(prefix+"RailCap"+right).height + 
					_getSkinElement(prefix+"Cap"+right).height
				) : UNDEFINED
			});
			
			slider.className += " jw" + direction;
		}
		
		var _groups = {};
		
		function _buildLayout() {
			_buildGroup("left");
			_buildGroup("center");
			_buildGroup("right");
			_appendChild(_controlbar, _groups.left);
			_appendChild(_controlbar, _groups.center);
			_appendChild(_controlbar, _groups.right);
			_buildOverlays();
			
			_css.style(_groups.right, {
				right: _getSkinElement("capRight").width
			});
		}

		function _buildOverlays() {
			if (_elements.hd) {
				_hdOverlay = new html5.menu('hd', _id+"_hd", _skin, _switchLevel);
				if (!_isMobile) {
					_addOverlay(_hdOverlay, _elements.hd, _showHd, _setHdTimer);
				}
				else {
					_addMobileOverlay(_hdOverlay, _elements.hd, _showHd, "hd");
				}
				_overlays.hd = _hdOverlay;
			}
			if (_elements.cc) {
				_ccOverlay = new html5.menu('cc', _id+"_cc", _skin, _switchCaption);
				if (!_isMobile) {
					_addOverlay(_ccOverlay, _elements.cc, _showCc, _setCcTimer);
				}
				else {
					_addMobileOverlay(_ccOverlay, _elements.cc, _showCc, "cc");	
				}
				_overlays.cc = _ccOverlay;
			}
			if (_elements.mute && _elements.volume && _elements.volume.vertical) {
				_volumeOverlay = new html5.overlay(_id+"_volumeoverlay", _skin);
				_volumeOverlay.setContents(_elements.volume);
				_addOverlay(_volumeOverlay, _elements.mute, _showVolume);
				_overlays.volume = _volumeOverlay;
			}
		}
		
		function _setCcTimer() {
			_ccTimer = setTimeout(_ccOverlay.hide, 500);
		}

		function _setHdTimer() {
			_hdTimer = setTimeout(_hdOverlay.hide, 500);
		}

		function _addOverlay(overlay, button, hoverAction, timer) {
			if (_isMobile) return;
			var element = overlay.element();
			_appendChild(button, element);
			button.addEventListener('mousemove', hoverAction, FALSE);
			if (timer) {
				button.addEventListener('mouseout', timer, FALSE);	
			}
			else {
				button.addEventListener('mouseout', overlay.hide, FALSE);
			}
			_css.style(element, {
				left: '50%'
			});
		}

		function _addMobileOverlay(overlay, button, tapAction, name) {
			if (!_isMobile) return;
			var element = overlay.element();
			_appendChild(button, element);
			var buttonTouch = new utils.touch(button); 
			buttonTouch.addEventListener(utils.touchEvents.TAP, function() {
				_overlayTapHandler(overlay, tapAction, name);
			});
		}

		function _overlayTapHandler(overlay, tapAction, name) {
			if (name == "cc") {
				if (_captions.length == 2) tapAction = _cc;
				if (_ccTapTimer) {
					_clearCcTapTimeout();
					overlay.hide();
				}
				else {
					_ccTapTimer = setTimeout(function () {
						overlay.hide(); 
						_ccTapTimer = UNDEFINED;
					}, 4000);
					tapAction();
				}
				_eventDispatcher.sendEvent(events.JWPLAYER_USER_ACTION);
			}
			else if (name == "hd") {
				if (_levels.length == 2) tapAction = _hd;
				if (_hdTapTimer) {
					_clearHdTapTimeout();
					overlay.hide();
				}
				else {
					_hdTapTimer = setTimeout(function () {
						overlay.hide(); 
						_hdTapTimer = UNDEFINED;
					}, 4000);
					tapAction();
				}
				_eventDispatcher.sendEvent(events.JWPLAYER_USER_ACTION);
			}	
		}
		
		function _buildGroup(pos) {
			var elem = _createSpan();
			elem.className = "jwgroup jw" + pos;
			_groups[pos] = elem;
			if (_layout[pos]) {
				_buildElements(_layout[pos], _groups[pos],pos);
			}
		}
		
		function _buildElements(group, container,pos) {
			if (group && group.elements.length > 0) {
				for (var i=0; i<group.elements.length; i++) {
					var element = _buildElement(group.elements[i], pos);
					if (element) {
						if (group.elements[i].name == "volume" && element.vertical) {
							_volumeOverlay = new html5.overlay(_id+"_volumeOverlay", _skin);
							_volumeOverlay.setContents(element);
						} else {
							_appendChild(container, element);
						}
					}
				}
			}
		}

		function _redraw() {
			clearTimeout(_redrawTimeout);
			_redrawTimeout = setTimeout(_this.redraw, 0);
		}

		_this.redraw = function(resize) {
			_css.block(_id);

			if (resize && _this.visible) {
				_this.show(TRUE);
			}
			_createStyles();

			// ie <= IE10 does not allow fullscreen from inside an iframe. Hide the FS button.
			var ieIframe = (top !== window.self) && utils.isMSIE();
			_css.style(_elements.fullscreen, {
				display: (_audioMode || _hideFullscreen || ieIframe) ? JW_CSS_NONE : ''
			});
			_css(_internalSelector(".jwvolumeH"), {
				display: _audioMode || _instreamMode ? JW_CSS_BLOCK : JW_CSS_NONE
			});
			_css(_internalSelector(".jwmute .jwoverlay"), {
				display: !(_audioMode || _instreamMode) ? JW_CSS_BLOCK : JW_CSS_NONE
			});
			_css.style(_elements.hd, {
				display: !_audioMode && _hasHD() ? '' : JW_CSS_NONE
			});
			_css.style(_elements.cc, {
				display: !_audioMode && _hasCaptions() ? '' : JW_CSS_NONE
			});

			_drawCues();

			// utils.foreach(_overlays, _positionOverlay);

			_css.unblock(_id);

			if (_this.visible) {
				var capLeft = _getSkinElement("capLeft"),
					capRight = _getSkinElement("capRight"),
					centerCss = {
						left:  Math.round(utils.parseDimension(_groups.left.offsetWidth) + capLeft.width),
						right: Math.round(utils.parseDimension(_groups.right.offsetWidth) + capRight.width)
					};
				_css.style(_groups.center, centerCss);
			}
		};
		
		function _updateNextPrev() {
			if (_api.jwGetPlaylist().length > 1 && !_sidebarShowing()) {
				_css.style(_elements.next, NOT_HIDDEN);
				_css.style(_elements.prev, NOT_HIDDEN);
			} else {
				_css.style(_elements.next, HIDDEN);
				_css.style(_elements.prev, HIDDEN);
			}
		}

		function _positionOverlay(name, overlay) {
			if (!_cbBounds) {
				_cbBounds = utils.bounds(_controlbar);
			}
			var forceRedraw = true;
			overlay.constrainX(_cbBounds, forceRedraw);
		}
		

		_this.audioMode = function(mode) {
			if (mode != _audioMode) {
				_audioMode = mode;
				_redraw();
			}
		};
		
		_this.instreamMode = function(mode) {
			if (mode != _instreamMode) {
				_instreamMode = mode;
			}
		};

		/** Whether or not to show the fullscreen icon - used when an audio file is played **/
		_this.hideFullscreen = function(mode) {
			if (mode != _hideFullscreen) {
				_hideFullscreen = mode;
				_redraw();
			}
		};

		_this.element = function() {
			return _controlbar;
		};

		_this.margin = function() {
			return parseInt(_settings.margin, 10);
		};
		
		_this.height = function() {
			return _bgHeight;
		};
		

		function _setBuffer(pct) {
			if (_elements.timeSliderBuffer) {
				pct = Math.min(Math.max(0, pct), 1);
				_css.style(_elements.timeSliderBuffer, {
					width: (pct * 100).toFixed(1) + '%',
					opacity: pct > 0 ? 1 : 0
				});
			}
		}

		function _sliderPercent(name, pct) {
			if (!_elements[name]) return;
			var vertical = _elements[name].vertical,
				prefix = name + (name==='time' ? 'Slider' : ''),
				size = 100 * Math.min(Math.max(0, pct), 1) + '%',
				progress = _elements[prefix+'Progress'],
				thumb = _elements[prefix+'Thumb'],
				style;
			
			if (progress) {
				style = {};
				if (vertical) {
					style.height = size;
					style.bottom = 0;
				} else {
					style.width = size;
				}
				if (name !=='volume') {
					style.opacity = (pct > 0 || _dragging) ? 1 : 0;
				}
				_css.style(progress, style);
			}
			
			if (thumb) {
				style = {};
				if (vertical) {
					style.top = 0;
				} else {
					style.left = size;
				}
				_css.style(thumb, style);
			}
		}
		
		function _setVolume(pct) {
			_sliderPercent('volume', pct);	
			_sliderPercent('volumeH', pct);	
		}

		function _setProgress(pct) {
			_sliderPercent('time', pct);
		}

		function _getSkinElement(name) {
			var component = 'controlbar', elem, newname = name;
			if (name.indexOf("volume") === 0) {
				if (name.indexOf("volumeH") === 0) newname = name.replace("volumeH", "volume");
				else component = "tooltip";
			} 
			elem = _skin.getSkinElement(component, newname);
			if (elem) {
				return elem;
			} else {
				return {
					width: 0,
					height: 0,
					src: "",
					image: UNDEFINED,
					ready: FALSE
				};
			}
		}
		
		function _appendChild(parent, child) {
			parent.appendChild(child);
		}
		
		
		//because of size impacting whether to show duration/elapsed time, optional resize argument overrides the this.visible return clause.
		_this.show = function(resize) {
			if (_this.visible && !resize) return;
			_this.visible = true;

			var style = {
				display: JW_CSS_INLINE_BLOCK
			};

			// IE applied max-width centering fix
			var maxWidth = _settings.maxwidth|0;
			if (!_audioMode && maxWidth) {
				if (_controlbar.parentNode && utils.isIETrident()) {
					if (_controlbar.parentNode.clientWidth > maxWidth + (_settings.margin|0 * 2)) {
						style.width = maxWidth;
					} else {
						style.width = '';
					}
				}
			}

			_css.style(_controlbar, style);
			_cbBounds = utils.bounds(_controlbar);

			_hideTimes();
			
			_css.block(_id); //unblock on redraw

			_volumeHandler();
			_redraw();

			_clearHideTimeout();
			_hideTimeout = setTimeout(function() {
				_css.style(_controlbar, {
					opacity: 1
				});
			}, 0);
		};
		
		_this.showTemp = function() {
			if (!this.visible) {
				_controlbar.style.opacity = 0;
				_controlbar.style.display = JW_CSS_INLINE_BLOCK;
			}
		};
		
		_this.hideTemp = function() {
			if (!this.visible) {
				_controlbar.style.display = JW_CSS_NONE;
			}
		};
		
		
		function _clearHideTimeout() {
			clearTimeout(_hideTimeout);
			_hideTimeout = -1;
		}

		function _clearCcTapTimeout() {
			clearTimeout(_ccTapTimer);
			_ccTapTimer = UNDEFINED;
		}

		function _clearHdTapTimeout() {
			clearTimeout(_hdTapTimer);
			_hdTapTimer = UNDEFINED;
		}
		
		function _loadCues(vttFile) {
			if (vttFile) {
				utils.ajax(vttFile, _cueLoaded, _cueFailed, TRUE);
			} else {
				_cues.length = 0;
			}
		}
		
		function _cueLoaded(xmlEvent) {
			var data = new jwplayer.parsers.srt().parse(xmlEvent.responseText,true);
			if (utils.typeOf(data) !== TYPEOF_ARRAY) {
				return _cueFailed("Invalid data");
			}
			_this.addCues(data);
		}

		_this.addCues = function(cues) {
			utils.foreach(cues,function(idx,elem) {
				if (elem.text) _addCue(elem.begin,elem.text);
			});
		};
		
		function _cueFailed(error) {
			utils.log("Cues failed to load: " + error);
		}

		_this.hide = function() {
			if (!_this.visible) return;
			_this.visible = false;
			_css.style(_controlbar, {
				opacity: 0
			});
			_clearHideTimeout();
			_hideTimeout = setTimeout(function() {
				_css.style(_controlbar, {
					display: JW_CSS_NONE
				});
			}, JW_VISIBILITY_TIMEOUT);
		};
		
		
		
		// Call constructor
		_init();

	};

	/***************************************************************************
	 * Player stylesheets - done once on script initialization; * These CSS
	 * rules are used for all JW Player instances *
	 **************************************************************************/

	_css(CB_CLASS, {
		position: JW_CSS_ABSOLUTE,
		margin: 'auto',
		opacity: 0,
		display: JW_CSS_NONE
	});
	
	_css(CB_CLASS+' span', {
		height: JW_CSS_100PCT
	});
	utils.dragStyle(CB_CLASS+' span', JW_CSS_NONE);
	
	_css(CB_CLASS+' .jwgroup', {
		display: JW_CSS_INLINE
	});
	
	_css(CB_CLASS+' span, '+CB_CLASS+' .jwgroup button,'+CB_CLASS+' .jwleft', {
		position: JW_CSS_RELATIVE,
		'float': JW_CSS_LEFT
	});
	
	_css(CB_CLASS+' .jwright', {
		position: JW_CSS_RELATIVE,
		'float': JW_CSS_RIGHT
	});
	
	_css(CB_CLASS+' .jwcenter', {
		position: JW_CSS_ABSOLUTE
	});
	
	_css(CB_CLASS+' buttoncontainer,'+CB_CLASS+' button', {
		display: JW_CSS_INLINE_BLOCK,
		height: JW_CSS_100PCT,
		border: JW_CSS_NONE,
		cursor: 'pointer'
	});

	_css(CB_CLASS+' .jwcapRight,'+CB_CLASS+' .jwtimeSliderCapRight,'+CB_CLASS+' .jwvolumeCapRight', { 
		right: 0,
		position: JW_CSS_ABSOLUTE
	});

	_css(CB_CLASS+' .jwcapBottom', { 
		bottom: 0,
		position: JW_CSS_ABSOLUTE
	});

	_css(CB_CLASS+' .jwtime', {
		position: JW_CSS_ABSOLUTE,
		height: JW_CSS_100PCT,
		width: JW_CSS_100PCT,
		left: 0
	});
	
	_css(CB_CLASS + ' .jwthumb', {
		position: JW_CSS_ABSOLUTE,
		height: JW_CSS_100PCT,
		cursor: 'pointer'
	});
	
	_css(CB_CLASS + ' .jwrail', {
		position: JW_CSS_ABSOLUTE,
		cursor: 'pointer'
	});

	_css(CB_CLASS + ' .jwrailgroup', {
		position: JW_CSS_ABSOLUTE,
		width: JW_CSS_100PCT
	});

	_css(CB_CLASS + ' .jwrailgroup span', {
		position: JW_CSS_ABSOLUTE
	});

	_css(CB_CLASS + ' .jwdivider+.jwdivider', {
		display: JW_CSS_NONE
	});
	
	_css(CB_CLASS + ' .jwtext', {
		padding: '0 5px',
		'text-align': 'center'
	});

	_css(CB_CLASS + ' .jwalt', {
		display: JW_CSS_NONE,
		overflow: 'hidden'
	});

	// important
	_css(CB_CLASS + ' .jwalt', {
		position: JW_CSS_ABSOLUTE,
		left: 0,
		right: 0,
		'text-align': "left"
	}, TRUE);

	_css(CB_CLASS + ' .jwoverlaytext', {
		padding: 3,
		'text-align': 'center'
	});

	_css(CB_CLASS + ' .jwvertical *', {
		display: JW_CSS_BLOCK
	});

	// important
	_css(CB_CLASS + ' .jwvertical .jwvolumeProgress', {
		height: "auto"
	}, TRUE);

	_css(CB_CLASS + ' .jwprogressOverflow', {
		position: JW_CSS_ABSOLUTE,
		overflow: JW_CSS_HIDDEN
	});

	_setTransition(CB_CLASS, JW_CSS_SMOOTH_EASE);
	_setTransition(CB_CLASS + ' button', JW_CSS_SMOOTH_EASE);
	_setTransition(CB_CLASS + ' .jwtime .jwsmooth span', JW_CSS_SMOOTH_EASE + ", width .25s linear, left .05s linear");
	_setTransition(CB_CLASS + ' .jwtoggling', JW_CSS_NONE);

})(window.jwplayer);/**
 * jwplayer.html5 API
 *
 * @author pablo
 * @version 6.0
 */
(function(jwplayer) {
	var html5 = jwplayer.html5,
		utils = jwplayer.utils, 
		events = jwplayer.events, 
		states = events.state,
		playlist = jwplayer.playlist,
		TRUE = true,
		FALSE = false;
		
	html5.controller = function(model, view) {
		var _model = model,
			_view = view,
			_eventDispatcher = new events.eventdispatcher(_model.id, _model.config.debug),
			_ready = FALSE,
			_loadOnPlay = -1,
			_preplay, 
			_actionOnAttach,
			_stopPlaylist = FALSE,
			_interruptPlay,
			_queuedCalls = [];
		
		utils.extend(this, _eventDispatcher);

		function _init() {
			_model.addEventListener(events.JWPLAYER_MEDIA_BUFFER_FULL, _bufferFullHandler);
			_model.addEventListener(events.JWPLAYER_MEDIA_COMPLETE, function() {
				// Insert a small delay here so that other complete handlers can execute
				setTimeout(_completeHandler, 25);
			});
			_model.addEventListener(events.JWPLAYER_MEDIA_ERROR, function(evt) {
				// Re-dispatch media errors as general error
				var evtClone = utils.extend({}, evt);
				evtClone.type = events.JWPLAYER_ERROR;
				_eventDispatcher.sendEvent(evtClone.type, evtClone);
			});
		}
		
		function _video() {
			return model.getVideo();
		}
		
		function _playerReady(evt) {
			if (!_ready) {
				
				_view.completeSetup();
				_eventDispatcher.sendEvent(evt.type, evt);

				if (jwplayer.utils.exists(window.jwplayer.playerReady)) {
					jwplayer.playerReady(evt);
				}

				_model.addGlobalListener(_forward);
				_view.addGlobalListener(_forward);

				_eventDispatcher.sendEvent(jwplayer.events.JWPLAYER_PLAYLIST_LOADED, {playlist: jwplayer(_model.id).getPlaylist()});
				_eventDispatcher.sendEvent(jwplayer.events.JWPLAYER_PLAYLIST_ITEM, {index: _model.item});
				
				_load();
				
				if (_model.autostart && !utils.isMobile()) {
					_play();
				}
				
				_ready = TRUE;
				
				while (_queuedCalls.length > 0) {
					var queuedCall = _queuedCalls.shift();
					_callMethod(queuedCall.method, queuedCall.arguments);
				}
			}
		}

		
		function _forward(evt) {
			_eventDispatcher.sendEvent(evt.type, evt);
		}
		
		function _bufferFullHandler() {
			_video().play();
		}

		function _load(item) {
			_stop(TRUE);
			
			switch (utils.typeOf(item)) {
			case "string":
				_loadPlaylist(item);
				break;
			case "object":
			case "array":
				_model.setPlaylist(new jwplayer.playlist(item));
				break;
			case "number":
				_model.setItem(item);
				break;
			}
		}
		
		function _loadPlaylist(toLoad) {
			var loader = new playlist.loader();
			loader.addEventListener(events.JWPLAYER_PLAYLIST_LOADED, function(evt) {
				_load(evt.playlist);
			});
			loader.addEventListener(events.JWPLAYER_ERROR, function(evt) {
				_load([]);
				evt.message = "Could not load playlist: " + evt.message; 
				_forward(evt);
			});
			loader.load(toLoad);
		}
		
		function _play(state) {
			if (!utils.exists(state)) state = TRUE;
			if (!state) return _pause();
			try {
				if (_loadOnPlay >= 0) {
					_load(_loadOnPlay);
					_loadOnPlay = -1;
				}
				//_actionOnAttach = _play;
				if (!_preplay) {
					_preplay = TRUE;
					_eventDispatcher.sendEvent(events.JWPLAYER_MEDIA_BEFOREPLAY);
					_preplay = FALSE;
					if (_interruptPlay) {
						_interruptPlay = FALSE;
						_actionOnAttach = null;
						return;
					}
				}
				
				if (_isIdle()) {
					if (_model.playlist.length === 0) {
						return FALSE;
					}
					_video().load(_model.playlist[_model.item]);
				} else if (_model.state == states.PAUSED) {
					_video().play();
				}
				
				return TRUE;
			} catch (err) {
				_eventDispatcher.sendEvent(events.JWPLAYER_ERROR, err);
				_actionOnAttach = null;
			}
			return FALSE;
		}

		function _stop(internal) {
			_actionOnAttach = null;
			try {
				if (!_isIdle()) {
					_video().stop();
				} else if (!internal) {
					_stopPlaylist = TRUE;
				}
				if (_preplay) {
					_interruptPlay = TRUE;
				}
				return TRUE;
			} catch (err) {
				_eventDispatcher.sendEvent(events.JWPLAYER_ERROR, err);
			}
			return FALSE;

		}

		function _pause(state) {
		    _actionOnAttach = null;
			if (!utils.exists(state)) state = TRUE;
			if (!state) return _play();
			try {
				switch (_model.state) {
					case states.PLAYING:
					case states.BUFFERING:
						_video().pause();
						break;
					default:
						if (_preplay) {
							_interruptPlay = TRUE;
						}
				}
				return TRUE;
			} catch (err) {
				_eventDispatcher.sendEvent(events.JWPLAYER_ERROR, err);
			}
			
			return FALSE;
		}
		
		function _isIdle() {
			return (_model.state == states.IDLE);
		}
		
		function _seek(pos) {
			if (_model.state != states.PLAYING) _play(TRUE);
			_video().seek(pos);
		}
		
		function _setFullscreen(state) {
			_view.fullscreen(state);
		}

		function _item(index) {
			utils.css.block(_model.id + '_next');
			_load(index);
			_play();
			utils.css.unblock(_model.id + '_next');
		}
		
		function _prev() {
			_item(_model.item - 1);
		}
		
		function _next() {
			_item(_model.item + 1);
		}
		
		function _completeHandler() {
			if (!_isIdle()) {
				// Something has made an API call before the complete handler has fired.
				return;
			} else if (_stopPlaylist) {
				// Stop called in onComplete event listener
				_stopPlaylist = FALSE;
				return;
			}
			
			_actionOnAttach = _completeHandler;
			if (_model.repeat) {
				_next();
			} else {
				if (_model.item == _model.playlist.length - 1) {
					_loadOnPlay = 0;
					_stop(TRUE);
					setTimeout(function() {
						_eventDispatcher.sendEvent(events.JWPLAYER_PLAYLIST_COMPLETE);
					}, 0);
				} else {
					_next();
				}
			}
		}
		
		function _setCurrentQuality(quality) {
			_video().setCurrentQuality(quality);
		}

		function _getCurrentQuality() {
			if (_video()) return _video().getCurrentQuality();
			else return -1;
		}

		function _getQualityLevels() {
			if (_video()) return _video().getQualityLevels();
			else return null;
		}

		function _setCurrentCaptions(caption) {
			_view.setCurrentCaptions(caption);
		}

		function _getCurrentCaptions() {
			return _view.getCurrentCaptions();
		}

		function _getCaptionsList() {
			return _view.getCaptionsList();
		}

		/** Used for the InStream API **/
		function _detachMedia() {
			try {
				return _model.getVideo().detachMedia();
			} catch (err) {
				return null;
			}
		}

		function _attachMedia(seekable) {
			try {
				_model.getVideo().attachMedia(seekable);
				if (typeof _actionOnAttach == "function") {
					_actionOnAttach();
				}
			} catch (err) {
				return null;
			}
		}
		
		function _waitForReady(func) {
			return function() {
				if (_ready) {
					_callMethod(func, arguments);
				} else {
					_queuedCalls.push({ method: func, arguments: arguments});
				}
			};
		}
		
		function _callMethod(func, args) {
			var _args = [], i;
			for (i=0; i < args.length; i++) {
				_args.push(args[i]);
			}
			func.apply(this, _args);
		}

		/** Controller API / public methods **/
		this.play = _waitForReady(_play);
		this.pause = _waitForReady(_pause);
		this.seek = _waitForReady(_seek);
		this.stop = function() {
			// Something has called stop() in an onComplete handler
			_stopPlaylist = TRUE;
			_waitForReady(_stop)();
		};
		this.load = _waitForReady(_load);
		this.next = _waitForReady(_next);
		this.prev = _waitForReady(_prev);
		this.item = _waitForReady(_item);
		this.setVolume = _waitForReady(_model.setVolume);
		this.setMute = _waitForReady(_model.setMute);
		this.setFullscreen = _waitForReady(_setFullscreen);
		this.detachMedia = _detachMedia; 
		this.attachMedia = _attachMedia;
		this.setCurrentQuality = _waitForReady(_setCurrentQuality);
		this.getCurrentQuality = _getCurrentQuality;
		this.getQualityLevels = _getQualityLevels;
		this.setCurrentCaptions = _waitForReady(_setCurrentCaptions);
		this.getCurrentCaptions = _getCurrentCaptions;
		this.getCaptionsList = _getCaptionsList;
		this.checkBeforePlay = function() {
            return _preplay;
        };
		this.playerReady = _playerReady;

		_init();
	};
	
})(jwplayer);

/**
 * JW Player Default skin
 *
 * @author zach
 * @version 5.8
 */
(function(jwplayer) {
	jwplayer.html5.defaultskin = function() {
		this.text = '<?xml version="1.0" ?><skin author="JW Player" name="Six" target="6.7" version="3.0"><components><component name="controlbar"><settings><setting name="margin" value="10"/><setting name="maxwidth" value="800"/><setting name="fontsize" value="11"/><setting name="fontweight" value="normal"/><setting name="fontcase" value="normal"/><setting name="fontcolor" value="0xd2d2d2"/></settings><elements><element name="background" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAeCAYAAADtlXTHAAAAN0lEQVR42mMQFRW/x2RiYqLI9O3bNwam////MzAxAAESARQCsf6jcmFiOLkIoxAGEGIBmSAHAQBWYyX2FoQvwgAAAABJRU5ErkJggg=="/><element name="capLeft" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAeCAYAAAARgF8NAAAAtElEQVR42tWRQQrCMBBFvzDJRltcmDTURYO3kHoK71K8hGfxFh7DnS2atXSRpozbViwVRNS3frw/MMTM0NpYADsAOYAZOpDWZgXgEMfxwlqrpJSyJwAooihSWZalbduirms8CnmSJCqEgGcQgJkQQmAAwgivCcyjBf78xLs3/MUEM3/9WT9QuDVNE4gEDQlH564mTZdqSNh779dVVU6U0nMi6pXIuctJa7P13hdled4AmHaFO61WQkab+AHPAAAAAElFTkSuQmCC"/><element name="capRight" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAeCAYAAAARgF8NAAAAtklEQVR42tWTMQrCUBBE35evhX2UYJGTeACx8y4eQvRW6jWSVBJ/BCXEFMmStRISNKQSdWCrnZ0ZdlnjedOQNnLgCGycS2KzWCy12S3LsozjOM2y7AKsbFEUrXFjzCgIglkUReR5vh6oKs2q6xoRwff9CTAf0AFr7RAYdxKe6CVY1R4C6Ict+hX6MvyHhap++1g/rSBSCVB0KpzPyRXYv2xSRCRN3a2qqhOwM2+e9w4cgK1zSfgA16hp3sNEmiwAAAAASUVORK5CYII="/><element name="playButton" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAeCAYAAAA2Lt7lAAABIklEQVR42u3VoWqFUBjAcWFpaWn11qULew8RmQg+wnwAH0NBQYPFcosXdooYTH7FZhIEDQoaDIJJVDQ5bTeIHO8UFjzwR9sPPcdPYhxH4siIEziB/YFpvU69T71NvRAbFw5wybLsJgjC93T/sRXCAa5VVcEwDBCG4c9WCAf4zPMc5sqyhL7vN0FYQJIk8FhRFNB1HRaEBURRBEvNT9W27SqEBQRBAGulaQpN0yxCWIDv+4BTHMdQ1/V8vWua9jUfcSzA8zzYkm3bd0mSGGzAdV3AyTAMxHEcv/kVOY4Da+m6jliW5Z/eZMuyYClVVRHDMPyfjylCCB6TZRnRNM3v9aFdTdOEOVEUEUVR/N6j4qIoyo0kSf6oYXfsuD5/mSfw/4BfzM60PxpdNhsAAAAASUVORK5CYII="/><element name="playButtonOver" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAeCAYAAAA2Lt7lAAABIklEQVR42u3VoWqFUBjAccPi4uIe4D7A4g3rIoIIvsRd8ymmgoIGi9liEYPJZDMJgm4o6MCJYBIVTd+03SByzqaw4IE/2n7oOX4SAEAcGXECJ7A/MK/Huee5p7kHAnOhAJc8zz94nn+f719wIRTg2jQNTNMEURR940IowGtRFLBU1zWM44gFIQFpmsJ9ZVnCMAxIEBIQxzGstTxV3/ebEBIQhiFslWUZdF23CiEBQRAASkmSQNu2y7XQNO22HHEkwPd9wMlxnC9Jkt6QAc/zACXDMCqO4wTsV+S6Lmyl63rFsqzw6022bRvWUlW1YhhG+PMxtSwL7pNluaJpWtjrQ7uapglLoihWFEUJe4+Ki6IonyRJCkcNu2PH9fnLPIH/B/wA5fzQF959z6UAAAAASUVORK5CYII="/><element name="pauseButton" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAeCAYAAAA2Lt7lAAAAmUlEQVR42u2WTQoCMQxGX8RlDzAX9FRezXXxAN30B+KmIDilmQHLKNNsCt8jPAg0RFSVkXVhcE3BCQTXVigiDlgAV6MAPOtLzVdcVcMmAbCo6v1DegMeG7kpcN77VbaDmwJKKd3ZWtwU5Jy7jRY/XpBS6jZa/HhBjLHbaPETjGi44O//QWisgrCDv5dg66r45rqWebZMwe8LXlPydRVUwjqdAAAAAElFTkSuQmCC"/><element name="pauseButtonOver" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAeCAYAAAA2Lt7lAAAAn0lEQVR42u2VSwrFIAxFr9AFuIRuoftxz+0SOnLs1A/cN3H0WhILlVJqJkIO4ZCIcSKJnjGhcwzBVwXGGAtgBmBrKgDY64maP3CSobWDmeT6J10AbI1cFVjv/SF3get3UEoRZ6txVZBzFgs1/rwgpSQWavx5QYxRLNT4B0bUXfD6dxBOVkG4wFXB7pxbTtZ1K5cFda9vQucaH3/yENwYP2sBdLsTPIMJAAAAAElFTkSuQmCC"/><element name="prevButton" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAAeCAYAAAAhDE4sAAAA6UlEQVR42mP4//8/AzUww6hBowYNaoOAgAeIJaA0OmAGYn4gFgViTkIGqQDp/SAaiwHqJSUl6Q8ePFgMZMsRMsjg0aNHIIMM0A24cuXKmh8/fux/+fIlSF6XoEG3bt0CKbRHNuDbt2/7Hz9+vB8kB5U3IGjQ+fPn96enp5feuHFj5efPn/ffvn17P0gMGRNl0JEjR/YnJSWVbdmyZSWIjQ0TZdCuXbvgXgsNDc2YPXv2WpAYMibKoPXr12MEdkBAQMbEiRPXguSg8gQDW2X58uU4o9/X1zdj8uTJREU/dRLkaO4fNWhYGAQACIKTdMKw1gUAAAAASUVORK5CYII="/><element name="prevButtonOver" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAAeCAYAAAAhDE4sAAAA6UlEQVR42mP4//8/AzUww6hBowYNaoOAQACIFaA0OmABYhEglgFiHkIGGfyHMAywGGBSUlLS9eDBg5tAtgYhgxwePXoEYjigG3DlypVnP378+P/y5UuQvA1Bg27dugVihCAb8O3bt/+PHz/+D5KDyjsQNOj8+fP/09PT59y4cePh58+f/9++ffs/SAwZE2XQkSNH/iclJc3dsmXLIxAbGybKoF27dsG9Fhoa2j179uznIDFkTJRB69evxwjsgICA7okTJz4HyUHlCQa2wfLly3FGv6+vb/fkyZNvERP91EmQo7l/1KBhYRAAuDSgTOE1ffsAAAAASUVORK5CYII="/><element name="nextButton" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAAeCAYAAADKO/UvAAAA6klEQVR42mP4//8/A6WYYdSQUUMGxBAg4ARiUSDmB2JmBkzAA8QSIBqfIXIPHjxYXFJSkg5kq2MxTAWobj+UxmmI7suXL/f/+PFj/5UrV9ZgMczg0aNHIEMM8BlicOvWrf0g/Pjx4/3fvn1DN8weJEfQkPPnz+9Hxrdv397/+fPn/Tdu3FiZnp5eChIjaMiRI0f2Y8NbtmxZmZSUVAZiEzRk165d+5Hx7Nmz14aGhmbAvAMSI2SI7vr16/eD8MSJE9cGBARkoAcsSI6QIXKTJ09e7Ovrm4EripcvX04wiilPbKO5eNSQQW8IAG8yOc7bkjJcAAAAAElFTkSuQmCC"/><element name="nextButtonOver" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAAeCAYAAADKO/UvAAAA6klEQVR42mP4//8/A6WYYdSQUUMGxBAg4AFiGSAWAWIWBkwgAMQKIBqfIRoPHjy4WVJS0gVkm2AxzOA/RKEBPkNsXr58+f/Hjx//r1y58gyLYQ6PHj0CKXTAZ4jDrVu3/oPw48eP/3/79g3dsBCQHEFDzp8//x8Z3759+//nz5//37hx42F6evockBhBQ44cOfIfG96yZcujpKSkuSA2QUN27dr1HxnPnj37eWhoaDfMOyAxQobYrF+//j8IT5w48XlAQEA3esCC5AgZojF58uRbvr6+3biiePny5QSjmPLENpqLRw0Z9IYAAGB2RqagdTNIAAAAAElFTkSuQmCC"/><element name="elapsedBackground" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAYAAAAeCAYAAAAPSW++AAAAFklEQVR42mP4//8/AzbMMCoxKjHcJAArFxoDYgoNvgAAAABJRU5ErkJggg=="/><element name="durationBackground" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAYAAAAeCAYAAAAPSW++AAAAFklEQVR42mP4//8/AzbMMCoxKjHcJAArFxoDYgoNvgAAAABJRU5ErkJggg=="/><element name="timeSliderCapLeft" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAAeCAYAAADpYKT6AAAAFElEQVR42mP4//8/AwwzjHIGhgMAcFgNAkNCQTAAAAAASUVORK5CYII="/><element name="timeSliderCapRight" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAAeCAYAAADpYKT6AAAAFElEQVR42mP4//8/AwwzjHIGhgMAcFgNAkNCQTAAAAAASUVORK5CYII="/><element name="timeSliderRail" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAeCAYAAADtlXTHAAAAM0lEQVR42pWNIRLAIADD0vrJwv9f2gkONJhcokJbDFyDZNbJwLYPhKWdkpaRzNL242X0A7ayDBvOWGKEAAAAAElFTkSuQmCC"/><element name="timeSliderRailCapLeft" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAeCAYAAADkftS9AAAAoUlEQVR42t3RTQrCMBCG4SwKgrhttaSkFAppS9Mk/VEPoTvBC7nyUIpnKq4/JwGDeANdPJt3MZMhDAD7xv4ixvH6SG5kfocL5wJlKVHXrQ+HLBNoGoW21R5Lks1dyhpdZwMXZ60tjOkDH40ZYO0YsDTlDzdvGLYBq6rmJESBvp8wjjvPPSnK8+JKoJTGNO3DFQsKZzeKdjw/z4vIkqx++o9eChh4OrGutekAAAAASUVORK5CYII="/><element name="timeSliderRailCapRight" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAeCAYAAADkftS9AAAAqElEQVR42t3RTQrCMBCG4VkIgritWlpaCoW2oc1Pf9RD6E48kSsPpXim6vpzphAX3kAXz+ZNMiSEANA3+ukYBOuR3djhE6uqRp4XiKIEvHCZYl0bCKUaxPG0cCStHbyiUFitNneytoVnjJM4knM9PGs7iU/qui08mRuG0YP6fgfRtgOSJENZqhMNwx5NY5CmmbjylWbEM15yRGt75jD3z1yyhez4iz96A9GweD4LqeZmAAAAAElFTkSuQmCC"/><element name="timeSliderBuffer" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAeCAYAAADtlXTHAAAALUlEQVR42mP+//8/A3NDQwOJxNy58/8zCwkJNyARwsJglgiIBSPevn3TSLrxAICJLIFssC4FAAAAAElFTkSuQmCC"/><element name="timeSliderBufferCapLeft" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAeCAYAAADkftS9AAAAbElEQVR42mP8//8/AzpgHL6CMjJyvoyMDJlAIVuwoKysvA8TE9NCRkZGISCGqJSXV9wKFPQCC8AElZRUPgEFeVHMVFFR/QRUgSqoqqq+Dcj2RBFUU9PwBbIXALEQipOAEn5ACugkBlvGkREdAE2UZQboCcvbAAAAAElFTkSuQmCC"/><element name="timeSliderBufferCapRight" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAeCAYAAADkftS9AAAAaUlEQVR42t3QuxGAIBBFUfoA+S1oM1KudkUi5s8VwXEcKzC4yXlLggAg3on/oVK6KDUsUg7zjdZ6GOOgtc18kCp6H+Ac4Rx5WCsSRfR43CqGENEjCqXhiEfX8xgntDKXOu7c2uGnP/+FB8gXjGr6cT/xAAAAAElFTkSuQmCC"/><element name="timeSliderProgress" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAeCAYAAADtlXTHAAAALklEQVR42p3MsQ0AQAjDQCv7z8gakCo0LPDfnFyZJAh4J6oqZBt19zEzV7bhb792VRs5A8JlWAAAAABJRU5ErkJggg=="/><element name="timeSliderProgressCapLeft" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAeCAYAAADkftS9AAAAYklEQVR42mP8//8/AzpgHNaCvkCcCcS2MEGfb9++Lfz48aPQz58/ISpfv3699c2bN14o2s+dO/cJyOZFETx69Cim4N69e7cB2Z4oglu2bAHZvACIhVCctHbtWj90Jw3z6AAAdAV63jcCcQsAAAAASUVORK5CYII="/><element name="timeSliderProgressCapRight" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAeCAYAAADkftS9AAAAZUlEQVR42t3QIQ7AIAyFYQ44boojQ1VisVgcggQzhn5ryraQ7QaIz/xJ85IqAOpLLRkb29n2xpQScs7ovVcOWmKMEY9SipMYQsDkkOi9x6RJJCJMxrm1FrfKxpAx5mSO6bU//3MBeArIus+/eXoAAAAASUVORK5CYII="/><element name="timeSliderThumb" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAeCAYAAAAl+Z4RAAABm0lEQVR42u2UTUsCURSGJ0kNV1MghjuhVhYEbSPoY5WbWhV90pd/SfwPulDc6c6vvYrjQl2kLdQ/IDhwe8/wTsQ04ZSbFg48Mtzzvsdzz71nNKWUtgjaMsF/SOB4VoAPrIIAWCMBrvmocX0k6Afr4BBcgRdyCQ4Y81P7zRwEO+CpUCjkJpPJ0DTNmTAejweyhtgjNcGvSWzzLkh2u11jNBqpXq+nDMOw6Pf7CkmUxERD7WcSKSki/9xqtYxOp6Pa7bYrEhONaMEmvVoIHGUymfxPRifZbDYPzzG9mg6ua7XawGuCer0+hOeGXi0snW42mzOvCbCNGTyv9Fp7+VWCRqMxheeZXuvntlKpeN5CtVodwHPH5ltlnKXTac9NFC08CXsL0oi4lFQsFo15ZtGw/LjdRDmKqBylXJJSqWTMMSepjdrH6GemGDiVhqZSqRz2+Y5um2jutFwuv8ka5+KEWt2+SPZV3mBgH1yABx6VcA/OGYtR6zoPOkvb5tDsEXnfYkx3mp3jHKIozCOO8F1nzHWc//5BWX6VF0/wATCN7PmY+qrmAAAAAElFTkSuQmCC"/><element name="timeSliderCue" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAeCAYAAAAl+Z4RAAAAfElEQVR42mP4//8/AyWYYdSAUQOGuQGiouJZQHwEirNIMgCkwcbG7klra/tvEAaxcRmCy4Aj1dV1v3Nz8/+DMIgNEiPJgLS0jN+ZmTn/QRjEBoodJckLRkYmT5KSUn8nJqb8BrGBYtmkBmI2yFYgPgTEmaMpcdSAUQPwYwAtmWpcwU8bfwAAAABJRU5ErkJggg=="/><element name="hdButtonOff" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB0AAAAeCAYAAADQBxWhAAABiElEQVR42u2Vu0oDQRSGF1SwiIVCspfZnb1rEcxFCOmNzdb2PoIvpCCxEyJYqdU+gbVtKmMeQavx/KMDg4I4GxACU/wcZjL/+ebMzNk4Qgjnv+VYqIVa6HpC2223Ii1IYgXBX5lAF0HARBjyxoIfeUygIo5TkSQZmUO5c8TvY70yzwskDGsg+DFvBE3TXGRZoYw7jIWPnCcCEWM1D9V1vTcajSvX9edRFEsf/MZQGBWU5Pg+eyAJRIzVPOmS9ESw8XB4dIKKda8RNM9LKZW81xtMut3DM0QdSpB7xiJBVd5Mp9dbNPeme42gRVFKqeR0h+cEuEDUoag8ijhO4I7GG6R33WsI3ZfSK8JDQdShtIkrqvKZTgFtNsHx6l4jaFkeSOkVcR7/uFNavz2b3e7Sho5pPMdj072NoLgv1SK4p99aBi8XFTaCdjreK3oNRtwNXiKASIioXifaAus+2yuXvykg5inP8s/Qfn9wCsMqn0HyvyCPyQd/k9RSzd9Qra889q/NQi10DaEfbVCWtJniLegAAAAASUVORK5CYII="/><element name="hdButton" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB0AAAAeCAYAAADQBxWhAAABwklEQVR4nO2Uz0oCURTGXZigT+Br+ALiKyi4UAMJDAaEFkGLVrkM3BjkQiSFGElE0IUIIgrCLERUEkFJyD+ghLS1aVWn88kEg7i4KcwiRvhxzvngOx/cuV4LEVmMxvBAM9QM/Weh/DthnIyLcTOeA3Brfuw5EQl1xmKx+HK5VDebDR0K/NiDfSKhrul0qq5WKxgPBn7swT6RUPdisaDZbHY02IN9IqGeyWRCeli7y+fza/SomDX9mjmz2+2Xfr//UVEUdY/XIxQ6HA5JD2vnlUplgh4Vs6aHa7Wa0u/33wKBwK3X633Y4xUL7Xa7pIe1QCQSuZEk6QkVs6ZHi8XifDAYULlcHlmt1mi73f7a8YqF8jGRHtZOE4mEnM1mn1Exa3o0l8vN0cuy/GKz2S5ardb3jlcstNFokB7WpEKh8NrpdAgVs6aHM5mMwto7H+99KBSSm83mrlcstFqtkh5cnGQyuUaPilnTtxfJ4XBc+Xw+mUM+93iFQt2lUon0jMdjqtfr2x4V868ORqMR9Xo9XDLa9Yr+ZVz87VQ+MjoW7BF9HJz8beLpdFrlS0KHkkqlPoLBoPAzaPyDbwRmqBlqhv6JH8CLXqCC55PmAAAAAElFTkSuQmCC"/><element name="ccButtonOff" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB0AAAAeCAYAAADQBxWhAAAB10lEQVR42u1Vu0oDQRQNmEZQSGHMYzebZHcTg0IeFlZaCIpGRI2itb+hEOMnWEasbGLlo/EHJDY21jYWvhURH5UijudMEomI4CQgBLY4zMxhzj1z78zddQkhXP8Nl2PqmDqmrWnq9fqywBUgmgD1WRXTq2BQE7puNAzqGUfFVITDURGJmBKhUFj4/UGZQXe3X2ha6Afv8wW+eIJ68kqm0aglTNMWhhGh0XUymV4olba8udxsn6bpOzSA0Vk6nZnZ3t7pmpycSoHfJ08d9cqmFBKBgCYQeBrmE+DPYbRRLK57cJD7TKZ/FNnOgb8Av1YorHaBf64dWNnUsmISmL/l8yvtCHZQd1cPWN9ibxvGI/LgPsgD73VaNVPbjklg/gq4cXdlwwjL4CjjLjI74V6Mx1X+nWXHIR4ty65pVU3jEtWHMpxI9M4j4A2y2qyW8Qn8QDyeWMT8DuUvLi0tezF/YZbUKpvGYj0SfEi8S4zZcvnQMzY2HsVaPiSMpzAYIT84OGRjvcdS17QNm/LELF99y+h65YV+bxm/7E/ub8iULcJeq4lZLtO0ZBsQlTuL/8pTQz2v48+mqVR6joJmPoPQXzKOygffDXQAnU2goxrH+bU5po5pC5p+AoMCobNnBGFcAAAAAElFTkSuQmCC"/><element name="ccButton" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB0AAAAeCAYAAADQBxWhAAACIklEQVR42u2VO4saURiGbVZERC39AVZ2U9jK/gERCxG1sdIiAZukCWSxs1hZlE0jLtEQb9FCUfF+v4DXFTR4KxSDE9ikSDM72WTRk3OGGIatDgpLihGewo953+c4Z+bIAwDwnhseJ+WknPQkKfycQWQQAqKCnB+B6m8e9ZzhSGV2u/1yu93SFEWBY0F51IP6cKTEarWiSZJEwaNBedSD+nCkqs1mA9br9cmgHtSHIz1fLpeATa/X+2U2m+NisfiCIAhXIBD4gubtdvunyWSKiUSit0ql8joSiZBPs6gPSzqZTAAbg8HwyWKxvJ/P51Q4HP4sFAo9nU7nQavV+m0228fFYkH5/f5biURy0+12d+wstnQwGIADsGQPJa+LxSI5Go3AdDoFUPLYaDTQfr2s1Wp3hzlc1GO/3wfsPLa01WqBA/V6fS8QCF7FYrGv6Huz2QRut/sulUr9gNe+SCQS39EcLmLvcrm+5fP5HTuPLS2Xy+BApVIBer0+BPf0QzKZvHc6nRN4G68LhcJvtVp9Y7VaI3ABtMPhuJVKpe+y2eyOnceWZjIZwKZarT7odLoon89/I5fLnaFQaJvL5dCCaI1GE0ZzhUJxBR8kZs7O4kpV8XgcsIG/hNmf2WzGPBylUomZp9NpMBwOmfl4PP43Z4P7yhA+n4+ORqPgVFAP7uEgg+/epdfrpYPBIDgWj8dzbzQasY/B5z/wuT9xTspJ/zvpH7Snd5Nr6YMeAAAAAElFTkSuQmCC"/><element name="muteButton" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAeCAYAAAAy2w7YAAACPUlEQVR42mP4//8/Az0ww6hFoxYNvEVkAiYgZgZiRpgALSxijIuL4zt58qQNkM0Fs4xci0CaWYCYHUoji7G4u7sLv337dtaKFStsoWrIsghkILu1tbXCixcvmoBsXqg4C9AXphs3bjQEsvnKysr0gZYtlJaWFgUFJakWgcKet7Oz0/bdu3crX758uR/IF4f6hHXmzJna79+/X+Dl5SUD5AsdP368+uDBgwEghxFjERtIExBLALHMjh070r58+bL7zp07+69evQqySPbChQu2ycnJIAsFNm3alHDt2rUcEHvq1KnWt2/fbgX5kBiLhID0fhgGBsf+ixcv7j9//jwYA+Xljh49Gvb48eN6kOGenp7yQEfMA7KFOTk5xYCWLgKxibFI4sSJE/txYaC8FCj4rly5shhkIAifOnVqAYwNjLcFRFsEDOf9uDBQXpqDg0Pi8OHDMItEgGy4RTA2UUG3a9eu/bgwUF7+5s2b8evXr68EBV1kZKTSvn375oIMFxQUFNu/f/9CaPCTlhgaGxtTgEl495YtW/aDMCgxbNiwwdDU1BSkRgAYfxmLFy9OA7HXrFljv27duiZiEwN68uaJjo62Ahq2EmgILHmDihtWIN8QaNE8PT09SZDjLl++3DBjxgwvYpM31gyroaEhDzSkHjnDbtu2Ta+qqkoT5IMJEyaYHjp0aC4w5QmTk2EJFUEgn7EkJiaKAUuN+SUlJZaUFEEEC1UzMzOurq4uM2oUqgQtI7maGK3KRy0aPhYBAK/+y9iyNfpJAAAAAElFTkSuQmCC"/><element name="muteButtonOver" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAeCAYAAAAy2w7YAAACW0lEQVR42mP4//8/Az0ww6hFoxYNvEVkAlYg5gBiFpgALSxitLOzk122bFkikC0NxMyUWMQIxNxALALEXFAxFiibS1tbW+vx48fX6urqcqFqyLII5EIRJSUlr8uXL+8HslWg4pwrVqwI7ezsDAGyVf38/OKBlj3k5+c3BgUlqRaxAbFiXFxc+YMHD96/fPkSpMAOZAkQ8+Xm5gY+e/bsvo6OjgOQr79p06btc+bMaQE5jBiLBIDYAIhBmn0mTJiw9uPHj3/u3Lnz/+rVqyAFfkADE4DxYghka02dOnXmnj17lgLZOvn5+VnHjx8/BGSrEWORwX8k8Pbt2/8XL178f/78eTAGygesXLmy/cKFCzuBbE1g/HhcunTpLpBtyMrKanHu3LmHIDYxFjmcOHHiPy4MlHcDYtszZ848AdJGQGxy8ODBB0AaFDfGBw4cALOJsgio8T8uDJR3Z2Fhsd+9ezfIIlDwmQLZcItgbKKCbteuXf9xYaB84L59+ybOnz9/EyjozMzMvLds2QIOOk5OTqtt27Y9hAY/aYkhNTV19fr16/8ADfsPwkAx3/7+/kAFBQUNIFt748aNi7u7u+eDEkNTU1M+0AH7QMmdnOStYGtrWzJr1qz369atAymwBWJ2IOYFGhwBjLc7UlJS1iDH7d+/f29FRUUtkC1MboYVFhMT8wS6fDeQrQzLsMCk7RMdHe0F8kFKSkrazp077wBTngE5GRZfEcQMLUg5gT7Wu3fv3t2wsLB0kKNoVqjKy8tLFhQURALZUpQWqoQACzTemImuJkar8lGLho9FAFfb1pYP/NUtAAAAAElFTkSuQmCC"/><element name="unmuteButton" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAeCAYAAAAy2w7YAAAA2klEQVR42mP4//8/Az0ww6hFoxaNWkR9i3AARiBmAWJ2EE0ri0CWsFtbWys8e/asCcjmpYVFTCCD29rabN69e7cSiPcD+WLUsogNiIWAWAKIZbZv357y9evX3Y8ePdp/584dkEUS1LJICEjvh2GQL65evbr/8uXLYExNiyROnjy5HxemqkUHDhzYjwtTNei2bdu2HxempkUoiaG6ujpl1apVO9euXbsfhKlpEXry5gkPD7eaM2fOymXLllE1eWPNsMrKynITJ06sp1WGpV0RNFpNjFo0atHgtQgANKFe0TzIhR0AAAAASUVORK5CYII="/><element name="unmuteButtonOver" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAeCAYAAAAy2w7YAAAA2klEQVR42mP4//8/Az0ww6hFoxaNWkR9i3AARiDmBmIRIOailUXMIAuUlJS8Ll26tBfIVqaFRWxArBgTE1P64MGD9+/evQMpsKKWRQJAbADEDkDs09/fv/rTp09/Hj169P/OnTsgBQ7UssjgPxIA+eLq1av/L1++DMbUtMjh5MmT/3Fhqlp04MCB/7gwVYNu27Zt/3FhalqEkhgSExNXLV++/M/atWv/gzA1LUJP3grW1tbFkyZNer9s2TKQAktaZlhhIPBoaWnZTasMS7siaLSaGLVo1KLBaxEAvQpqyzzc7aAAAAAASUVORK5CYII="/><element name="fullscreenButton" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAeCAYAAAAo5+5WAAABX0lEQVR42u2UQYuCQBTHFTxJUJ0LJWiPQp/Dm126+x3yLi3YKU/dO+ilgx2iyETesXuelESNuvcN3HkwLh6WRXZYlgUHfoyg/ObN/43DlWXJ/QZcK27Ffyj+ZvAEkSATFMKEMiZ0mMSz2Ux+PB4O+Q7qoJy14p4kSdPL5eKTBaACK2cRCxjDarVa3O93yLLsE1Zxd7PZzF+vFyRJAnEcAxk+PmPmLOK+53lWFEVwvV7BMIz34XA4DcPQwZ00EfM1cPtdzBY7T3hbr9eWaZoGPR09VVVxFpuIRU3TZCqTcfun08lCKZX36TuhXkQTsVwUhTMajaa2bS+ezyekaQrn89mi0i9HE7FCjhPcbjcfu388HuFwOMByuZzTWH4snux2OwiCAHAmDQNd1xc0U4FJvN1uoYI0yx8MBhrNlWcRj13XhYr9fg95njv4O7OKO/RiqS4ZhcYgMonbi74V/0PxB6RCFmvPDfJxAAAAAElFTkSuQmCC"/><element name="fullscreenButtonOver" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAeCAYAAAAo5+5WAAABaklEQVR42u2UIWzCQBSGAYFsEGwISBNkp5hHoHFV9dXD1tehiqpjSQ0GwS2hNE0bUokHBYUUmtbXVb7dS66IZVkaLsuypJd86aXiu3f/u7saANR+g1olrsR/KP5h1CkCRaIMKSPGgNLiETcURZGSJAnhy0A5b8XPoihOdrtdTheAAqycR9zEGAzDIHEcQxRFd3jFbcuy5lmWwel0guPxCEEQ5DjHzHnEndVqZR8OB9jv96Bp2kev15tst9sQd1JGjFk22Be338ZssfOUV9M0bV3X3+n8Bf+Px2M8JUIZsSDLssRkEm7fdV0bpUzeoTyxRe9FlBFLt9st7Pf7k9lsRtI0hcvlAp7n2Uz67SgjHtLjBOfzOcfuO44Dm80GptPpnMXysHhECAHf9wG/tGGgqiphN67JJV4ul1BAm5V3u903lnmdRzxYLBZQsF6v4Xq9hnidWaMeFrfYw1I8MkMWg8BVcfXQV+J/KP4EGwslGEtzWUAAAAAASUVORK5CYII="/><element name="normalscreenButton" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAeCAYAAAAo5+5WAAABX0lEQVR42u3VMYvCMBQHcPXw1K3oKfclzqGlU7+MWye3c3Lph+gmdHGuW8WpGUrrarEIrlZEBKEtdPbegxeQG3pHglsDf0hJ+6N5adLG4/FovCKNGq7havgfrfmUFqQD6ULecFAGbs/n8w/ClCAIJofD4Rv6A8RlYCXLsoVhGOP1em2WZekXRcEAn8FYTwYe3W43dr/fXUTP5zOD+JvNZoJlkYE/Ebter4yjy+XSxJlgzaXgNE0ZT5Ikrq7rX1TzpgzcP51OjOdyuTCsuWVZQ1n4HXF8c8qIytD+C27STQo9xIE+oZWtEsZp5Xm+gGv2HMLFYVwITdPGURS5sDiMh95cGMZtqnieZx6PR3+/3zMeWbiD2xQ2gB/HMYP4cO1in2ouDPe22+1st9sxiG/btqmq6jgMwwUtqDCMp9RgtVrNHMeZENadTqdD+lqEYY736Ehs/ToqxeD611TDr4V/ALfMb7vGw5DiAAAAAElFTkSuQmCC"/><element name="normalscreenButtonOver" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAeCAYAAAAo5+5WAAABbklEQVR42u3VMauCUBQH8GqIN8UbImlocHSrPeR9haYWV7fX6NRniIbCqUDQwRpycVC/hFMNXSKzoD0Cx/PugeMbGnwPL21e+KOg/jj36L3WAKD2jtQquIKL4X+MOk+Djk2eNk+H5wMvisCt0WikEKZYlrUKgsDn5wPERWDler0yWZYn8/ncez6f8Hg8IIoixCUReHi/3+F0OmUIJkkC5/MZTNNcYVtE4C/GGFwuF8Dj8XiE6XTq4Uyw50Lwfr+HPLwFWa/X+6ae10XgfhzHkOdwOECapmw8HmPFDRH4E3GsnDKkNrT+qrhONyn0UA70CS0cRXADp3W73Ri8DMJLw1hxp9vtTtbrdeb7PuShykvDuEyV2WzmhWEIu93uN6JwG5cpXwCw3W7BdV1YLpfZZrMB6nlpWOKw7zgO2LYNmqZ5kiRNFosFoxdaGsZdamAYhq/r+oqwjqqq+SdVGs5xibbE5stWWQ6ufk0V/F74Bzh6cDMaFwHFAAAAAElFTkSuQmCC"/><element name="volumeCapLeft" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAAeCAYAAADpYKT6AAAAFElEQVR42mP4//8/AwwzjHIGhgMAcFgNAkNCQTAAAAAASUVORK5CYII="/><element name="volumeCapRight" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAAeCAYAAADpYKT6AAAAFElEQVR42mP4//8/AwwzjHIGhgMAcFgNAkNCQTAAAAAASUVORK5CYII="/><element name="volumeRail" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACoAAAAeCAYAAABaKIzgAAAAWElEQVR42u3VsQ3AIBBDUW4ASpQGIRS4sP+EzgzpYun/CV5lh6TiUAAFChQoUKD/grZ2WUij9+EBnfP2gK6VHtC9baCPBzTzeEBt5klS5ZmAAgUKFCjQr71HYkzTWoeyuwAAAABJRU5ErkJggg=="/><element name="volumeRailCapLeft" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAeCAYAAAALvL+DAAAAgUlEQVR42tXQQQqDMBAF0MFdwa02xBDTSWK3dW+X9rYt9GTV9gDfmUDBK7h4kPn5kCEEgPboOEHTnFUWT7HqcBUfYyyc86C2NS9rHfr+ghAY2lj1wJwQYy6NL3NESrmgrnNv74MMQ0HTdL9Ja/mH+nY1z49Rm3LxK3toKE6iPs4XboLWK4v24Kf0AAAAAElFTkSuQmCC"/><element name="volumeRailCapRight" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAeCAYAAAALvL+DAAAAgUlEQVR42tWQTQrCMBCFB3dCt60hDWmcJHWr+7qst1XwZCp1/3wjCF6hiw/m/cAMIwDkH1mP0ba7F7mS+jVCiHDOg8aDHCQlxTDs4X1A17mb5FyhWmABG4uUUmGoZmu8aYwwYkzo+3CXn2D6nKbzUTgslszz5cS1GzumIVsT63rhB+kPMQcishPoAAAAAElFTkSuQmCC"/><element name="volumeProgress" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACoAAAAeCAYAAABaKIzgAAAASElEQVR42u3UsQnAQAwEwRe4/wLVh5TqWzDGiWC2guGCi5k5GwpQUFBQUFDQr9AV0sjMFdCnqg7on9DutqgfBQUFBQUFBX3bBU4WWutcf3kcAAAAAElFTkSuQmCC"/><element name="volumeProgressCapLeft" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAeCAYAAAALvL+DAAAATklEQVR42mP8//8/AzJgHB4CfUCcDBb4/fv3hDdv3uR/+/YNouLy5csf//79ywfXcvTo0Y9ANkJg9+7dE4HsPBRDN2zYMAFIJTEOoxADAG38dDtrd5P1AAAAAElFTkSuQmCC"/><element name="volumeProgressCapRight" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAeCAYAAAALvL+DAAAAT0lEQVR42t3QIQ6AMAxG4d5fkHGS+un6JtXV84Cr+TfKQuAIID7z5CMA9ETfDtuw3MHd0VpDRJQMqoqTmR0ZRATTFWqtmNYMzLwP5SeDXjqg+Gveu5kMqgAAAABJRU5ErkJggg=="/></elements></component><component name="display"><settings><setting name="bufferrotation" value="90"/><setting name="bufferinterval" value="125"/><setting name="fontcase" value="normal"/><setting name="fontcolor" value="0xffffff"/><setting name="fontsize" value="11"/><setting name="fontweight" value="normal"/></settings><elements><element name="background" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAA0CAYAAACQGfi1AAAAZUlEQVR42u2VwQ3AMAgDebBClEUYt8NV+XUBvnQKq0UcC1jYZ9nX2pcJzyNiSwUy06QCJj6vMvUH1dwiBEZgSg+gCIv6Y0rIAygi5D8UjUUjA/aAyZwwOPIP2mMKRd9bdM79KAVee0AqrmZ58iQAAAAASUVORK5CYII="/><element name="backgroundOver" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAA0CAYAAACQGfi1AAAAZklEQVR42u2VsQ3AQAgDKVjhlS5TsH+dMV4MQUumsBL0xwIW9ln2ta7HhOcRcUsFqsqkAiY+7zb1Bz3cIgSOwJQeQBEWzceUkA+giJD/UDQWjQzYAybzhMGRfzAeUyj63qLMnUqBF2JaKtp629puAAAAAElFTkSuQmCC"/><element name="capLeft" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAA0CAYAAACHO2h8AAAA7ElEQVR42u3XvQqDMBQFYCPYWLWIiNFFUePvUju2e/sA9Vnsmzj2WbXXQktxkWgoIjlwudtH7pDhoL7vpSGEeBWsG0wEgyXGoAEC5G5ZVk0I0XRdV2RZRsyQ47hHQB6+75td173hzytZoYbS+IyxynzOGGrzvAjmnDOGnmVZutLCCOjfUFGsDyoENAHBp90ulK8MyjIBTUMZHyhNBTQFJUkqoAmI0mSrUBxzg+jKoChaHxTzgUJuUMgNirhAbRCEAYIshRrX9S6qut8thSpN0xvbts0lxeZb/ACrDeOgYYyVOWeinyp6gnWdW0Vft69cndg2ea8AAAAASUVORK5CYII="/><element name="capLeftOver" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAA0CAYAAACHO2h8AAAA50lEQVR42mP8//8/AwiIiUnYAKlIINYCYk4GEgEL1JAMQUHBTDExMV5ubm42JiAg2SCQS0CGyMrKCv/794/p58+fDDBXkuqiSCEhQZ4/f/6Q7Ap0gzRZWNjYyXAEhkFcTEyMQNdQZhITA5XAqEFEpmxKo576LqI0DY3G2pD22qCK/mEc2IMv1kYDm+gwGi0hR2YYUS2LjBa1dC/YqOai/4PMa9/+/fv/j5GRkYnSWLv+8+ePX9SI/uWfgeDfv7//IF4kDzO9evXiyLdvX6e/BYLv33/8AHoTXKqQihmRuqK2QCqC3K4oAL0UgwtgxUxZAAAAAElFTkSuQmCC"/><element name="capRight" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAA0CAYAAACHO2h8AAAA8klEQVR42u1XQQ6CQAwEUlfjTRLAC4k/8MIX/IDv8w16l1foA9RwUjhw2JW4IWFt9QPAokHcJk2zPUw6nWyTAc8LNlbzkJhnzH2aXo/UgCiKgqYoVVUpIUSQZdnS9+dbBNtBURSNx7ExGGPjMAwZPtcIdoIWtCyl1CtxMtt1Z9M8z1eAb60AYCMsC5xID8lxbBvLBKyOwgDVANKV/xPUlFHtB1UbrPyDXnbfVDPLrrMjcyH/eEcdfhFzar932DqbqHfy66qm3p9Vaqsm5aMk76ZFjXwb55x8WtyKGtGRUpZCcLR7dzJ+B0iSy03DisYEQo0nc8B4p9SUlywAAAAASUVORK5CYII="/><element name="capRightOver" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAA0CAYAAACHO2h8AAAA7klEQVR42u1XMQ6CMBSF5qdGEwdJQBfY3Rm9iEfwRHoDL8LgAYyzYTIwMFCrOFBfPQFQNKh9yU/TDi///Zf+5JHvzw9Oe9xQJ9Q+yy6JfqA4jqO2LDUghIjyPF8FwWILsh1JKVu347ou45yPwzAc4boB2ZE6yHKUUq9CY8zzZtOiKNaEuxGIOMexREdmTIy5DMeEnJ5giRoQmdr/DmnKuvaFrv2s/T897KG5ZofdZEZ2Q/7xjHr8InbVfm6x9dbR4Ow3dQ1/tdaxy9i1qro/dHYzkqZzWwnoANhJGuSoChCiLKW86uCXUJqe0z6i6BMdqXhIR7IE5AAAAABJRU5ErkJggg=="/><element name="bufferIcon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAA0CAYAAADi1poDAAABTElEQVR42u3WPUtCURzH8Xt92HRwCJokNAOJqKVcitBF0pr0FfRAay+gqDFobXaoKXsD6SY4Nbk7CA4OUa/h9jvwjy6XfDjdw+UIP+EzXfR+z/3fc9DxPM+xicMgBjGIQQxiEIPsC6rAGD6gYUPQ0Pv9fIIbVVAcknOCvqIKOoaBqP8xshFMoBm45soilJjJoHd5EkpfY8UJX1DSZFDPF9S1IagEHXiDXY0gV6ISpkfGg3EpgnbgCdpwYOBmKSiI1H+CWvISK69hDzzYgKJYDxvUtiFoG57hBfYNjCwddmTcZUsdtAW3cA15jRtk4BDKsGIy6B4exY1GkIo5EVVTQWq7P/iC7jT/3v4EHS1ydCz6w3sSpZ7UZuBaDi5EcJyrElKDrOmXetrqzuBKXE75XizKXXbqCzq3YdtnJUpZ48HIIAYxiEEMYhCDZvsG/QUNjWGQyWIAAAAASUVORK5CYII="/><element name="bufferIconOver" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAA0CAYAAADi1poDAAABTElEQVR42u3WPUtCURzH8Xt92HRwCJokNAOJqKVcitBF0pr0FfRAay+gqDFobXaoKXsD6SY4Nbk7CA4OUa/h9jvwjy6XfDjdw+UIP+EzXfR+z/3fc9DxPM+xicMgBjGIQQxiEIPsC6rAGD6gYUPQ0Pv9fIIbVVAcknOCvqIKOoaBqP8xshFMoBm45soilJjJoHd5EkpfY8UJX1DSZFDPF9S1IagEHXiDXY0gV6ISpkfGg3EpgnbgCdpwYOBmKSiI1H+CWvISK69hDzzYgKJYDxvUtiFoG57hBfYNjCwddmTcZUsdtAW3cA15jRtk4BDKsGIy6B4exY1GkIo5EVVTQWq7P/iC7jT/3v4EHS1ydCz6w3sSpZ7UZuBaDi5EcJyrElKDrOmXetrqzuBKXE75XizKXXbqCzq3YdtnJUpZ48HIIAYxiEEMYhCDZvsG/QUNjWGQyWIAAAAASUVORK5CYII="/><element name="errorIcon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAA0CAYAAADi1poDAAACs0lEQVR42u2XTWsaURSGbWtKqbQULJiGbrppN666K3EhNF11IYhZJnSrCO0P6MKG/gEX7SKbiKKCEUQEC4pCIKCoqPUThJDqSg1C6CoQwu15B0fMdBzHkDEhXOGB8dxz7zzOdeZVHWNMd5vQcSEuxIW4EBfiQndJ6IqvFeLpmJXbILS6u7v7FeD4poUeGY3G991u97TX652aTKYN1G5K6D7xyufzJfv9PgN7e3u/UMPYTQg9sVqtnwaDwTldHQZwjBrGli30gDBns9kmbRc7Pj4WwDFqGEPPMoWMTqfzG10RdnR0dAnU3G73DnqWJfRQr9e/q9Vqw06nw+TAGHrQq7XQPeKl1+sNY4tarZaAzWbzA/E9xtCDXszRUuix2Wy20wnP6vU6E6H6RzBdQw96qW7QSgi3+etYLJZrNBqsUqlMoLoVTNfQE4/H81R/s8hjYBGhZ5ubm5/pk1+USiU2jSgkraMXczD3uoWQV29zudyfQqHA8vn8JUQhaR29mIO5anNOrdCqx+P50Ww22eHh4X+IQnJjmENzf6rNOTVCyKsNunv+HhwcMDlEoVnjmLu2tvZBTc7NE5rkFV16lslkZBGFZo1jrtqcmyck5FW73T5PpVJsFuJtr9SDNdTknJKQkFfpdLqJBZPJ5Ey2t7f9W1tbfqUerIG1xjmnv4qQ0eVy7ZTLZZZIJBQZjUYC8/qwFuXcd1r7+aJCQl4Vi8UhPQjZdUKPAsWckxOa5BX9lGDRaHQuFotlH6jpxZpKOScnJORVtVo9i0QiTA12u32fiKjtx9qzck4qNMkrXN5wOKyK4XDITk5OVPePt08256RCQl7RPl8Eg0GmJfT9vHA4HF+kOScVevGbXqFQiAUCAU2BFM6FcyoJGbBlxLr49NWQ9fG5DPy/PRfiQlyIC3EhLqQh/wBHF7waCbYO0QAAAABJRU5ErkJggg=="/><element name="errorIconOver" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAA0CAYAAADi1poDAAACs0lEQVR42u2XTWsaURSGbWtKqbQULJiGbrppN666K3EhNF11IYhZJnSrCO0P6MKG/gEX7SKbiKKCEUQEC4pCIKCoqPUThJDqSg1C6CoQwu15B0fMdBzHkDEhXOGB8dxz7zzOdeZVHWNMd5vQcSEuxIW4EBfiQndJ6IqvFeLpmJXbILS6u7v7FeD4poUeGY3G991u97TX652aTKYN1G5K6D7xyufzJfv9PgN7e3u/UMPYTQg9sVqtnwaDwTldHQZwjBrGli30gDBns9kmbRc7Pj4WwDFqGEPPMoWMTqfzG10RdnR0dAnU3G73DnqWJfRQr9e/q9Vqw06nw+TAGHrQq7XQPeKl1+sNY4tarZaAzWbzA/E9xtCDXszRUuix2Wy20wnP6vU6E6H6RzBdQw96qW7QSgi3+etYLJZrNBqsUqlMoLoVTNfQE4/H81R/s8hjYBGhZ5ubm5/pk1+USiU2jSgkraMXczD3uoWQV29zudyfQqHA8vn8JUQhaR29mIO5anNOrdCqx+P50Ww22eHh4X+IQnJjmENzf6rNOTVCyKsNunv+HhwcMDlEoVnjmLu2tvZBTc7NE5rkFV16lslkZBGFZo1jrtqcmyck5FW73T5PpVJsFuJtr9SDNdTknJKQkFfpdLqJBZPJ5Ey2t7f9W1tbfqUerIG1xjmnv4qQ0eVy7ZTLZZZIJBQZjUYC8/qwFuXcd1r7+aJCQl4Vi8UhPQjZdUKPAsWckxOa5BX9lGDRaHQuFotlH6jpxZpKOScnJORVtVo9i0QiTA12u32fiKjtx9qzck4qNMkrXN5wOKyK4XDITk5OVPePt08256RCQl7RPl8Eg0GmJfT9vHA4HF+kOScVevGbXqFQiAUCAU2BFM6FcyoJGbBlxLr49NWQ9fG5DPy/PRfiQlyIC3EhLqQh/wBHF7waCbYO0QAAAABJRU5ErkJggg=="/><element name="playIcon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAA0CAYAAADi1poDAAABzElEQVR42u3XTYtBURjA8VuzmdWsZmk7GzWfxL1IJMs5n8GXkISFzCQz5pSUlMUjC2WhLCyUBclLXkIkNt5ZmXt3FpLn3nPRdE796y5/dc+rcDwehUdK4CAO4iAO4iAO+o8geTzLvcq9yD0JOg0MyNDv9z/dbveH/P2mFwwDMs7nczgcDlCr1X71gmFA76PRCJRmsxns93tdYCjQYDCA06bTKXMYCtTr9eBck8kEdrsdExgK1Ol04FLj8VgzDAVqtVpwTcPhELbbrSoYClSv1wGTvE3AZrNBwVCgarUKaup2u7Ber6+CoUCVSgW01G63YbVaXYShQOVyGVjUbDZhuVyehaFApVIJWKbMs8ViAY1G4zsUConKeYkCFYtF0KNMJvPj8/kkNKhQKADLYrEYdblcRPUvy+fzwKJoNEqdTifRPKlzuRxoKRKJUIfDQZgt+2w2C2oKh8PUbrcT5hsjIIe8cqjNZiO6HR3pdBquKRgMUqvVSnQ/XFOpFFzK7/dTi8VCbnb9SCaTcC55D6Fms5nc/IKWSCTgNK/XSyVJIve6whrj8TgoeTweKooiufcl3xAIBL5MJhN5lGfQYz0U+duegziIgziIgzhIfX+1FIqPwZcb/gAAAABJRU5ErkJggg=="/><element name="playIconOver" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAA0CAYAAADi1poDAAAByklEQVR42u3XuWoCQRzHcYuUKVPmAXyAlBbpPRFFfIek8yXMIGohFiLYiCCChWIhWAgWFoKFIh54RGUH0cZbq192OwsR/+uuSpiBL2z5gZ3TAMDwTBkESIAESIAESID+I0ger3Lvcm9yLwadBgVkHI1GHZ/P9yN/f+gFo4BMi8UCx+MRzWZT0gtGAX1Op1MozedzHA4HXWAk0Hg8xmmz2UxzGAk0HA5xLs459vu9JjASqN/v41KSJN0MI4G63S6uaTKZYLfbqYKRQK1WC5TkbQLb7ZYEI4EajQbUNBgMsNlsroKRQPV6HbfU6/WwXq8vwkigWq0GLep0OlitVmdhJFC1WoWWKfNsuVyi3W7/RiKRL+W8JIEqlQr0KJ/PjwOBwDcZVC6XoWWJRIJ7vV6m+peVSiVoUTwe5x6Ph908qYvFIm4pFotxt9vNNFv2hUIBaopGo9zlcjHNN8ZcLgdK8srhTqeT6XZ0ZLNZXFM4HOYOh4PpfrhmMhlcKhgMcrvdzu52/Uin0ziXvIdwm83G7n5BS6VSOI0xxq1WK3vUFdaUTCah5Pf7ucViYY++5BtDoVDXbDazZ3kGPddDUbztBUiABEiABEiA1PcHSCzm64IZEhcAAAAASUVORK5CYII="/><element name="replayIcon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAA0CAYAAADi1poDAAAEwUlEQVR42u1YW0icRxR2o6k2pmyMa0NJjRrRtWgp3rA00ifJpuqqL1FEpGLxQQVJIaUVgnZViqIglHh5UHej4mXpqruj4v2CFwTxLgjiFRUUUby8KCL2fMv8QYKa/Lsb0sL+8OHvzJxvvn/OmTln1ubi4sLmvwQbqyCrIKsgqyCroP+jIBMeB8J9wheEWx9q9DEFPVxeXi5JSUmJo3c3wh2C5FMK+mZ/f5+dnJywoaGhsvDw8J8gkq+c5FMI+nZra4sBXJiBMVYUEhLyI/U9IHx2lTBLCZLwL5cR3AlygnJjY4MJ2NzcZAcHB+zo6Ki5pqYmx83NLYjGOBPsLClIwmPDNTIyUlFXV6eanp5W7+7u6k5PTw3r6+vsXUDc4eEh29nZ+ae0tPSlo6PjY75aZgvCl8mUSuXT4eHhcgjACmxvbxsnXVtbY6urq9cCY46Pj9n4+Hgm8dw1V9BtBGhubm46uaAFIpaWlkRhcHCwPiMjIwWra+4KYWVcNRrNKxJjJF9cXDSitbX1jUqlylQoFEpyxXOh/TJoRXTZ2dm/29vb+xKP1NwYQsy4FBUVvdjb22MLCwtG9Pf3a5OTk3+hPm8eqAjw74R+YGpqSl9cXPyXh4dHCA9+O0ts+zsIXnKRfn5+ngEtLS3VNMkT6rtHsL18DqF/dnaWVVVVvabtHkZtX13a7sKG+FIqlT7gHyFKEAhcBwYGyubm5tjMzAzr6urSent7h1K74xVnysO2trbXUVFRz+n9EeHzS2PwVxodHR1GG+LvycnJYvr/a7SLEeRA5M9WVlYMRMAmJiZYfHz8zzwOJDfksrtX5LJbCQkJ/rTLWrAbwQlu2IgRJKuurv6TghKByejMeUNtXu+46UMffMDjhoYGjcAHbswhRpA7uUg9NjbGgKysrEwewKY+zuAQ+MCNOcQIklOS1JHPGRAREaEUAtHExwEcAh+4MYcYQb5kaKADDYcac3Z2DjbRXW/jSCaTBQl8IyMjBswhSlBPT4+hr6+PAT4+Pj+YK8jFxSVI4Ovt7RUtSN7U1KTr7u5mQFxcXLSZLrOnbR8p8IFbrMvcKysr1R0dHQwoKCj4jW9rU5/7hYWFLwW+iooK0UEty8nJUdFhxwAi0Zix7WHj1dnZqRH4KFGL3vYOYWFhz/R6vYEeNjo6ytLS0m46GG86g6SwBQe4wAlusQcjiB7l5+eXNzc3M4BSiNbPz++61HGdGEfYUI5rFHjAydOLRHRyDQ0NVdTX1+t1Oh0OM0YVYrVcLn/CV8r2PW6SYixsYAsOcIGTJ1rTyo+kpKQXjY2NTKvVovRABajl7vPige7A85ctf8eJ7oUxGAsb2IIDXOAUVtjkAi01NfUVfR2jfMTa29sZ1dGoeTRlZWV/xMTEKJ2cnII9PT2/pwQcQ7VzJvowBmNhA9v09PQsXjHaWaSEjY2NTafKsYUSLZKt8YBDBYla+fz8nJ2dnRkLerShTxhHNvrExMRfuZjblrp1GIv8wMDAp1SSltPVxlBbW8tuAo1hGBsQEKDgbrKz9L3s7TXI399fQW5U5eXlqUtKSnRqtdoA4B1t6AsODg7nu+naa/XHvCj6csh5m+x912hRgqy/D1kFWQVZBVkFWQVdj38BAk7AFyu8ie8AAAAASUVORK5CYII="/><element name="replayIconOver" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAA0CAYAAADi1poDAAAE2ElEQVR42u1YaUhcVxi1xirttDHWpbQxtSKoSRTiVoUaKFQquBOCVkQwkmmrVqH9FyiKC1TRYv+o+eFWNW513zruiguCdRcUcWXGRhFFR1q143j7neG+IMFJ88YJaWEuHHze5bzz7v22O0aMMaP/EowMggyCDIIMggyC/o+CdGjvED4kvEe48rKLXqUgp5WVlXmpVPoDPbsQrhKMX6egT/f29tjx8TEbGhpaCAgI+Ib6HAkSwhuvQ9Bnm5ubDODC1K2trWPe3t5f0pg94a2LhOlLkDH/cluCK8GbkCiXy5kAhULB9vf3mVKp/Lu8vLzTzs4ugOZcJ5jqU5Axt41bQUFB0srKStn09LR8Z2fnr5OTk7ONjQ32PCDu4OCAbW9v/5mfn/9EIpHc4bt1aUFvEm4EBwc/HB4eXoQA7MDW1pbmpevr62xtbU0rMOfw8JCNj4/XE4/FZQWZwYvS09Mf0xGoIGJ5eVkUBgcH95KSkn7G7l52h7AzN0tLS5tJjIZ8aWlJg7a2tj9SU1Pr/P39k+goHgn950E7cpSSklJjZmZ2l3hsOJ/ONgSb+SgnJ6dkd3eXLSwsaNDf36+MjY39icY+4YYKA/9cGAempqZOc3Nz++3t7UO58Zvqw+2vwnjpiE7n5+cZ0NTU9JRecp/G3ieYnI9DGJ+dnWXFxcVz5O4PqM/hnLsLDvGxubm5Pf8IUYJAcGtgYGBhbm6OzczMsK6uLqWjo2M49V+7IKY4tbe3z4WEhDyi59uEd89Favy1CQ0NfUAOMT05Ofk7/e+MfjGCJET+1erq6hkRsImJCRYZGfkjt4OLIq+E5zKLC3LZlaioqC/Iy1TwRnCCG2vECLItKyv7jYwShsko5mxSn9dzx/SyDTt0p7q6WiHwgRvvECPIlY5IPjY2xoDk5OQ6bsC6tuvgEPjAjXeIEeRDSfKIzpwBgYGBiYIh6tgk4BD4wI13iBF0lxaqKaAhqDFLS8tAHY/rmR1ZWVkFCHwjIyNqvEOUoJ6eHnVfXx8DnJ2d711WkLW1dYDA19vbK1qQT0NDw1F3dzcDIiIivuNVoa7tbXL7bwU+cIs9MteioiK5TCZjQFZWViV3a13bB9nZ2U8EvsLCQtFGbZuWliajYMcAIlFQn6eOx4Y1np2dnQqBjxK1aLeX+Pn5fd3c3HzW0tLCRkdHWXx8/IsCo7aGuTZYCw5wgRPcYgMjgtntzMzMxcbGRgZQClG6uLhoSx3axFzDGspxBwIPOHl6MRadXH19faVVVVWn9fX1CGaMKsSnTk5O9/lOmfzLMdlgLtZgLTjABU6eaHUrP2JiYkpqampYbW0tSg9UgEp+fJ7c0CU8f5lwT0RE98QczMUarAUHuMApJF5dCjTUMTfj4uKa6esY5SPW0dHBqI5GzaMoKCj4NSwsLNHCwiLQwcEhjBLw91Q712EMczAXa7A2ISGhDVzna6NLlbDh4eGPqXJUUaJFstUEOFSQqJXVajVTqVSagh59GBPm0ZrT6OjoX3j5aqavW4emyPfw8HhIJekiXW3OKioq2ItAcxjmuru7S/kxmer7XvbsGuTm5ialY5RlZGTI8/LyjkpKSs4APKMPY15eXnHcm7Req1/VRdEHeYnDh/fd4AZurJe7veH3IYMggyCDIIMggyDt+AeCTA8AFSrCbwAAAABJRU5ErkJggg=="/></elements></component><component name="dock"><settings><setting name="iconalpha" value="1"/><setting name="iconalphaactive" value="1"/><setting name="iconalphaover" value="1"/></settings><elements><element name="button" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACwAAAAgCAYAAABpRpp6AAAAzUlEQVR42u2YMQ7CMAxF7aRiSQckWtGOHKMLR2DimFyAE3CUdqWiQ4ucYANXqIiRv+T96ek7kYx1vS8A4MzT8QTIMxPPjefyhm2a5tS2bem9xxxpiSj1fV8Pw/AU4K6qduWyLJhSylIvcoSRgY8CHIgiQsb5ihTG4EBZDHjtFJ+OKANmZKuEAWvtsE7DmpbOKmGVsEr8xrB9zSsbVvdKWCVs6cywGf4bwwI8EcXknMv6+hNjFKuTD6HcIsJhw5EbVq6w43h/zPN8RW3n1hcs+1ICqMmZZQAAAABJRU5ErkJggg=="/><element name="buttonOver" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACwAAAAgCAYAAABpRpp6AAAA1UlEQVR42u2YMQ4CIRBFgV1LoXA3snoht/MOtnoarbyF1R5ptxRsDAngTKKtnWbYzE8+oXz8/IGEum3XCyHECbwDa0FTD/AAPtewHK21h67rTFVViiJtjDGN47iZpumJwH3TrEwIQeWcScYrpVTICMB7BNZwACUI6x0kMupaFCYG/gsw0Vn7lnDmSjBw4R3moeNKcCW4EjO7h/lp/nHCxd0SXAkeOk6YE55Vwj7GlBSIMmgCISsCD97ft1obQxUaYb13DrY3BL445yS4h/2SaMCf79brC0M0WI9LC6AuAAAAAElFTkSuQmCC"/><element name="buttonActive" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACwAAAAgCAYAAABpRpp6AAAAyklEQVR42u2YPQ4CIRSEccF2fwIbKz2T23kKaz2BVt7Dai9G4kJls+CbRDtbzWPzJhlCqL5MBkie6fvNWil1Ju/JreKpQB7JF0PLyTl3tNZ2WuuKI20iee+35CeAB86wUEUCIwEfANziIOesOAuMYDWqMAnwX4CZ1/dbwlkqIcCFd1gunVRCKiGVWNg7LF/zjxMu7pWQSsilk4Ql4UUlPM1zSu/JClthvgZWAI8xTru6bjqu0ICNMTxoewfwNYSwIg+0b5gG/Bm33l7CZ0/XNL9BmAAAAABJRU5ErkJggg=="/><element name="divider" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAgCAYAAAA1zNleAAAAFUlEQVR42mP4//8/AzJmGBUYFUBgAEE5fpDLFJZbAAAAAElFTkSuQmCC"/></elements></component><component name="playlist"><settings><setting name="backgroundcolor" value="0x3c3c3e"/><setting name="fontcolor" value="0x848489"/><setting name="fontsize" value="11"/><setting name="fontweight" value="normal"/><setting name="activecolor" value="0xb2b2b6"/><setting name="overcolor" value="0xb2b2b6"/><setting name="titlecolor" value="0xb9b9be"/><setting name="titlesize" value="12"/><setting name="titleweight" value="bold"/><setting name="titleactivecolor" value="0xececf4"/><setting name="titleovercolor" value="0xececf4"/></settings><elements><element name="item" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAABMCAIAAACnG28HAAAAoElEQVR42u3SQQkAAAwDsQor8y9rJvYZBKLguLQD5yIBxsJYGAuMhbEwFhgLY2EsMBbGwlhgLIyFscBYGAtjgbEwFsYCY2EsjAXGwlgYC4yFsTAWGAtjYSwwFsbCWGAsjIWxwFgYC2OBsTAWxgJjYSyMBcbCWBgLjIWxMBYYC2NhLDAWxsJYYCyMhbHAWBgLY4GxMBbGAmNhLIwFxsJY/LSgjDi3dpmB4AAAAABJRU5ErkJggg=="/><element name="itemActive" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAABMCAIAAACnG28HAAAAoElEQVR42u3SQQkAAAwDsToq829uJvYZBKLguLQD5yIBxsJYGAuMhbEwFhgLY2EsMBbGwlhgLIyFscBYGAtjgbEwFsYCY2EsjAXGwlgYC4yFsTAWGAtjYSwwFsbCWGAsjIWxwFgYC2OBsTAWxgJjYSyMBcbCWBgLjIWxMBYYC2NhLDAWxsJYYCyMhbHAWBgLY4GxMBbGAmNhLIwFxsJY/LRBziyQuYSeagAAAABJRU5ErkJggg=="/><element name="itemImage" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAAA2CAIAAAC3LQuFAAAB9UlEQVR42u3ZiWrCQBAGYF9CzWnu05hDbX3/N+tfBqdrjEIptNL9YQo5hKQfuzM7m9V6vWU8iRX+zucLYzEIRCACEYhABCIQgQjEIBCBCEQgAv0s6nrveQGBHgZ0CHSpqtZ1fc8Lu24wr+MUr5qmudVAbXvQrbzt1j0e3/RWHKe4iB9YDeT7obndud/3ch1Sm42DKybZ/wfK8wr/dlFUcjoMx9l+cNN013nX4NT3dxZVMeWAkYwLeD0CQkrCaZ6XFgFlWaEQko9dN1gEOhxG82e2AKFUKUTbdn0/3n9yEaAkyWSgnU7vtgANw4TnOo4nqRcQWVYuAml6DsPYipV0GEZ9PxVFjedilqGW40DWPlcXxwTCLTkuy9oKIIyaNC2CIMJzISVAcZwpCu6aQFr4MQctGUExjPBQaRpmcwocOmRkiOmi0ZZmVXONLH9mQHXdmkCSfRBRlNoChMWxJJpxPM2AMExQp2RNOAuo2QIEAnRVZdnoGxgT6nMdKPl7FqJp436QTiIcTNN5EQgFzt4NMy1S6DOuDdp8QfTLWxyvBYSUhKK228W6Sr4H0p6eW643Zc7M3AT6CnOhiEiS/A9f5hWBZkkarTyBbsJs69G48bPP8iBC6kG/JoWfQPxwSCACEYhBIAIRiEAEIhCBCMQg0HeBGE/iA2Oi1tFMiSX7AAAAAElFTkSuQmCC"/><element name="divider" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAANIAAAABCAIAAAAkUWeUAAAAEUlEQVR42mPQ1zccRaOIzggAmuR1T+nadMkAAAAASUVORK5CYII="/><element name="sliderRail" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAABCAYAAADErm6rAAAAIklEQVR42mP6//8/Az4sKir+X0lJ5b+ysioKBomB5AjpBwAxrjrJQvfEawAAAABJRU5ErkJggg=="/><element name="sliderCapTop" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAKCAYAAACuaZ5oAAAAGUlEQVR42mP4//8/Ay0xw6gFoxaMWkB7CwB2As1P8WmmAwAAAABJRU5ErkJggg=="/><element name="sliderCapBottom" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAKCAYAAACuaZ5oAAAAGUlEQVR42mP4//8/Ay0xw6gFoxaMWkB7CwB2As1P8WmmAwAAAABJRU5ErkJggg=="/><element name="sliderRailCapTop" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAECAYAAACUY/8YAAAAYUlEQVR42q2PSwqAMBBDe4mqrVL7sXh6vZoUDxAnxX0LungQEpJhFADVQusxC4dQXqhzT7dnfBcuY2Y4t1ao6TH7fGAYptPaBd5HhJAq1PSY/fFB4WCMG1LKFWp6kt2t/gOk+eeZy1KEHQAAAABJRU5ErkJggg=="/><element name="sliderRailCapBottom" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAECAYAAACUY/8YAAAAYElEQVR42mP4//8/Az4sJibxSUlJ5b+ysioKBokB5b4Q0s9ASIG0tMxGWVl5DAtAYiA5ii2wsbE1ALr0A8hAkKtBGMQGiYHkKLYAiJlcXd0MQa4FGvoZhEFskBhIjpB+AF4F6qfhUR58AAAAAElFTkSuQmCC"/><element name="sliderThumb" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAABCAYAAADErm6rAAAAKElEQVR4XmP8//8/AyHw+PHj/z9+/GD4+vUrGH/79g1MBwQEMBLSCwC4sRX/S7kwJwAAAABJRU5ErkJggg=="/><element name="sliderThumbCapBottom" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAECAYAAACUY/8YAAAASElEQVR42q3NoQ0AMAgFUfYXrIJH4/FIFmg6wS/1TUqaipOXRwDoVmbOiIC7w8ygqhCR2XmpCfAB4G/ArgAuYBQwCuDu1wZeW0osItX5QArCAAAAAElFTkSuQmCC"/><element name="sliderThumbCapTop" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAECAYAAACUY/8YAAAAWUlEQVR42rWNoQ1AIQwF2V8QHAJJKlAoSHVJ6qpI2IMwwPsrIPji3F3OAXB/ci221nytdRPRTin5p4MxRlBViAiYGaUUxBjDs8Gcc6+1YGYQEfTekXM+N+0HR/gfgjnWeYEAAAAASUVORK5CYII="/></elements></component><component name="tooltip"><settings><setting name="fontcase" value="normal"/><setting name="fontcolor" value="0xacacac"/><setting name="fontsize" value="11"/><setting name="fontweight" value="normal"/><setting name="activecolor" value="0xffffff"/><setting name="overcolor" value="0xffffff"/></settings><elements><element name="background" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAACCAYAAABsfz2XAAAAEklEQVR42mOwtnV8RgpmIFUDAFr3JukT6L+UAAAAAElFTkSuQmCC"/><element name="arrow" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAADCAYAAACnI+4yAAAAEklEQVR42mP4//8/AymYgeYaABssa5WUTzsyAAAAAElFTkSuQmCC"/><element name="capTop" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAECAYAAAC6Jt6KAAAAHUlEQVR42mMUFRU/wUACYHR1935GkgZrW0faagAAqHQGCWgiU9QAAAAASUVORK5CYII="/><element name="capBottom" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAECAYAAAC6Jt6KAAAAGElEQVR42mOwtnV8RgpmoL0GUVHxE6RgAO7IRsl4Cw8cAAAAAElFTkSuQmCC"/><element name="capLeft" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAACCAYAAACUn8ZgAAAAFklEQVR42mMQFRU/YW3r+AwbZsAnCQBUPRWHq8l/fAAAAABJRU5ErkJggg=="/><element name="capRight" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAACCAYAAACUn8ZgAAAAFklEQVR42mOwtnV8hg2LioqfYMAnCQBwXRWHw2Rr1wAAAABJRU5ErkJggg=="/><element name="capTopLeft" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAECAYAAABCxiV9AAAAPklEQVR4XmMQFRVnBeIiIN4FxCeQMQOQU6ijq3/VycXjiau79zNkDJLcZWvv9MTGzumZta0jCgZJnkAXhPEBnhkmTDF7/FAAAAAASUVORK5CYII="/><element name="capTopRight" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAECAYAAABCxiV9AAAAPklEQVR42mMQFRU/gYZ3A3ERELMyuLp7P0PGTi4eT3R09a8CJbMYrG0dnyFjGzunZ7b2Tk+AkrswJGEYZAUA8XwmRnLnEVMAAAAASUVORK5CYII="/><element name="capBottomLeft" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAECAYAAABCxiV9AAAAMklEQVR42mMQFRU/YW3r+AwbZgBK7rK0snuCS7JQXUP7qqW1/RNskqxAXATEu0FWIGMAFlYlnOJtim4AAAAASUVORK5CYII="/><element name="capBottomRight" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAECAYAAABCxiV9AAAANUlEQVR42mOwtnV8hg2LioqfYMAmYWll9wQouQtD0tLa/om6hvZVoGQ2A0g7Gt4NxEVAzAoAZzolltlSH50AAAAASUVORK5CYII="/><element name="menuOption" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAARCAYAAADkIz3lAAAAdklEQVR42mP4//8/AzGYYdgpFBUVlwPiXUD8GUrLYVUoJiaxR1JS+r+srNx/EA3kH8Bl4md5ecX/iorK/xUUlP4D+T+xKgSask9GRu6/srLqfxAN5B/CqtDb21cdpBho5VcQ7enprYHL10xAzAXEPFCaaVhHIQBeKc15eWl8jgAAAABJRU5ErkJggg=="/><element name="menuOptionOver" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAARCAYAAADkIz3lAAAAdklEQVR42mP4//8/AzGYYdgpFBUVlwPiXUD8GUrLYVUoJiaxR1JS+r+srNx/EA3kH8Bl4md5ecX/iorK/xUUlP4D+T+xKgSask9GRu6/srLqfxAN5B/CqtDb21cdpBho5VcQ7enprYHL10xAzAXEPFCaaVhHIQBeKc15eWl8jgAAAABJRU5ErkJggg=="/><element name="menuOptionActive" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAARCAYAAADkIz3lAAAAqklEQVR42mP4//8/AzGYYSgohAIZIHYE4lAoDeJjKJR1c3PLffTo0aXfv39/B9EgPlBcDl2h0/379y+/fv36/9OnT/+DaKDiq0BxF3SFoc+ePQOZ9B+Gnz9//hsoHo6u0GX//v2Xr1279h+GDx48CDLRDV2hkq2tbe6uXbsunz9//geItre3B7lRGV0hMxCrAbEHEIdBaRCfGVvwgBRzADE3lGbGCJ4hENcAI1indUdh01cAAAAASUVORK5CYII="/><element name="volumeCapTop" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAFCAYAAAB1j90SAAAAE0lEQVR42mP4//8/AzmYYQRoBADgm9EvDrkmuwAAAABJRU5ErkJggg=="/><element name="volumeCapBottom" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAFCAYAAAB1j90SAAAAE0lEQVR42mP4//8/AzmYYQRoBADgm9EvDrkmuwAAAABJRU5ErkJggg=="/><element name="volumeRailCapTop" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAECAYAAAC+0w63AAAAXklEQVR42n2NWwqAIBRE3YSmJT4KafW1tZAWMN2RPkSojwPDPO5VAFSP1lMRDqG+UJexN4524bJ2hvehQU2P2efQGHs6tyCEhBhzg5oes7+PlcWUVuS8Nah5QLK77z7Bcm/CZuJM1AAAAABJRU5ErkJggg=="/><element name="volumeRailCapBottom" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAECAYAAAC+0w63AAAAXklEQVR42mP4//8/AwyLiUl8UlVV/6+mpoGCQWJAuS/IahmQOdLSMhvl5RUxNILEQHI4NdrY2BoATf4AUgiyBYRBbJAYSA6nRiBmcnV1MwSZDlT8GYRBbJAYSA5ZLQArC3Oj7DuqswAAAABJRU5ErkJggg=="/><element name="volumeRail" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAA0CAYAAAC6qQkaAAAAXklEQVR42mP5//8/AwyIiUn85+bmZmBkZGRABiA1X79+ZXj16gVcgoUBDaBrwiWGoZFYMCg0MpKnkZFxCPlxVONw0MjIyDgaOCM7AdC7lBuNjtGiY1TjqMbRwooijQBUhw3jnmCdzgAAAABJRU5ErkJggg=="/><element name="volumeProgress" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAA0CAYAAAC6qQkaAAAAT0lEQVR42u3LIQ4AQQhDUe5/FjJ4NH48ggQu0rWbGbEH2Iqanz4BIO9VFTITe29EBNwdqorzJ2fo7guutb7hzFzQzAgJCQkJCQkJCQn/AR/HKvJmqR7XwAAAAABJRU5ErkJggg=="/><element name="volumeProgressCapTop" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAECAYAAAC+0w63AAAAWUlEQVR42p2LoQoAIRAF/f8gNsNGMZhMK+YVtpkW/A/xA9714+COC1OGGQfA/eFRMrOvte6c8yYi/2kcYwRVhYig945SCmKM4XU0s73WwpwTIoLWGlJK595da8On65TYLg8AAAAASUVORK5CYII="/><element name="volumeProgressCapBottom" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAECAYAAAC+0w63AAAASElEQVR42o3LIQ4AMQgFUe6v6EnwaDweyQ3aPcBf6poNyVaMm0cA6CwzZ0TA3WFmUFWIyPP9qIGjgeMX7gpywVVwFeTuaeFNL2bLq1AT4lm+AAAAAElFTkSuQmCC"/><element name="volumeThumb" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAQCAYAAAAmlE46AAABQElEQVR42p2SsWqDUBSGTYgpEqlLqNCxdHMoGTp079Y1kFJohrR5mzyCm4PpA2Rw1MlZg7gk6eSWXcxgzy//BWkbLBU+uZzz/derHq2ua+0/tK+e0BcGwlC4IEPW+nR+hNAcCffCVFiQKWsjOr12SBeuhJnv++uiKHZVVZUAa9TQo6OrMHa5FJ6DINgcj8f6cDjUeZ43YI0aenAEixnNEB48z/P3+32dZdmvoAcHLjPNDrM4jnfnQgo4PDIy2lhYbrfbU1cwTdOTuO/MaPZfg0mSlOK+MdPcXsIw7DwqHLgqiMc+rlardVcQDlx1VLzorfDquu7mXAg9ceZ0LfU78OgJGrLrRxRFn/IhSoA1agxN6BpqAEzhWnCEJ0pLMmfNoWOqAVAjZ3K3G0p3xGHNpqN/n9cBj2Dx5W0yZs1oD/kXpOphz005RgUAAAAASUVORK5CYII="/></elements></component></components></skin>';
		this.xml = jwplayer.utils.parseXML(this.text);
		return this;
	};
})(jwplayer);
/**
 * JW Player display component
 *
 * @author pablo
 * @version 6.0
 */
(function(jwplayer) {
	var html5 = jwplayer.html5,
		utils = jwplayer.utils,
		events = jwplayer.events,
		states = events.state,
		_css = utils.css,
		_isMobile = utils.isMobile(),

		DOCUMENT = document,
		D_CLASS = ".jwdisplay",
		D_PREVIEW_CLASS = ".jwpreview",
		TRUE = true,
		FALSE = false,

		/** Some CSS constants we should use for minimization **/
		JW_CSS_ABSOLUTE = "absolute",
		JW_CSS_100PCT = "100%",
		JW_CSS_HIDDEN = "hidden",
		JW_CSS_SMOOTH_EASE = "opacity .25s, background-image .25s, color .25s";

	
	html5.display = function(_api, config) {
		var _skin = _api.skin,
			_display, _preview,
			_displayTouch,
			_item,
			_image, _imageWidth, _imageHeight, 
			_imageHidden = FALSE,
			_icons = {},
			_errorState = FALSE,
			_completedState = FALSE,
			_visibilities = {},
			_hiding,
			_hideTimeout,
			_button,
			_forced,
			_previousState,
			_config = utils.extend({
				showicons: TRUE,
				bufferrotation: 45,
				bufferinterval: 100,
				fontcolor: '#ccc',
				overcolor: '#fff',
				fontsize: 15,
				fontweight: ""
			}, _skin.getComponentSettings('display'), config),
			_eventDispatcher = new events.eventdispatcher(),
			_alternateClickHandler,
			_lastClick;
			
		utils.extend(this, _eventDispatcher);
			
		function _init() {
			_display = DOCUMENT.createElement("div");
			_display.id = _api.id + "_display";
			_display.className = "jwdisplay";
			
			_preview = DOCUMENT.createElement("div");
			_preview.className = "jwpreview jw" + _api.jwGetStretching();
			_display.appendChild(_preview);
			
			_api.jwAddEventListener(events.JWPLAYER_PLAYER_STATE, _stateHandler);
			_api.jwAddEventListener(events.JWPLAYER_PLAYLIST_ITEM, _itemHandler);
			_api.jwAddEventListener(events.JWPLAYER_PLAYLIST_COMPLETE, _playlistCompleteHandler);
			_api.jwAddEventListener(events.JWPLAYER_MEDIA_ERROR, _errorHandler);
			_api.jwAddEventListener(events.JWPLAYER_ERROR, _errorHandler);

			if (!_isMobile) {
				_display.addEventListener('click', _clickHandler, FALSE);
			}
			else {
				_displayTouch = new utils.touch(_display);
				_displayTouch.addEventListener(utils.touchEvents.TAP, _clickHandler);
			}
			
			_createIcons();
			//_createTextFields();
			
			_stateHandler({newstate:states.IDLE});
		}
		
		function _clickHandler(evt) {
			if (_alternateClickHandler && (_api.jwGetControls() || _api.jwGetState() == states.PLAYING)) {
				_alternateClickHandler(evt);
				return;
			}

			if (!_isMobile || !_api.jwGetControls()) {
				_eventDispatcher.sendEvent(events.JWPLAYER_DISPLAY_CLICK);
			}
			if (!_api.jwGetControls()) return;


			// Handle double-clicks for fullscreen toggle
			var currentClick = _getCurrentTime();
			if (_lastClick && currentClick - _lastClick < 500) {
				_api.jwSetFullscreen();
				_lastClick = undefined;
			} else {
				_lastClick = _getCurrentTime();
			}

			var cbBounds = utils.bounds(_display.parentNode.querySelector(".jwcontrolbar")),
				displayBounds = utils.bounds(_display),
				playSquare = {
					left: cbBounds.left - 10 - displayBounds.left,
					right: cbBounds.left + 30 - displayBounds.left,
					top: displayBounds.bottom - 40,
					bottom: displayBounds.bottom
				},
				fsSquare = {
					left: cbBounds.right - 30 - displayBounds.left,
					right: cbBounds.right + 10 - displayBounds.left,
					top: playSquare.top,
					bottom: playSquare.bottom
				};
				
			if (_isMobile) {
				if (_inside(playSquare, evt.x, evt.y)) {
					// Perform play/pause toggle below
				} else if (_inside(fsSquare, evt.x, evt.y)) {
					_api.jwSetFullscreen();
					return;
				} else {
					_eventDispatcher.sendEvent(events.JWPLAYER_DISPLAY_CLICK);
					if (_hiding) return;
				}
			}
			
			switch (_api.jwGetState()) {
			case states.PLAYING:
			case states.BUFFERING:
				_api.jwPause();
				break;
			default:
				_api.jwPlay();
				break;
			}
			
		}
		
		function _inside(rect, x, y) {
			return (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom);
		}
		
		/** Returns the current timestamp in milliseconds **/
		function _getCurrentTime() {
			return new Date().getTime();
		}
		
		this.clickHandler = _clickHandler;
		
		function _createIcons() {
			var	outStyle = {
					font: _config.fontweight + " " + _config.fontsize + "px/"+(parseInt(_config.fontsize, 10)+3)+"px Arial, Helvetica, sans-serif",
					color: _config.fontcolor
				},
				overStyle = {color:_config.overcolor};
			_button = new html5.displayicon(_display.id+"_button", _api, outStyle, overStyle);
			_display.appendChild(_button.element());
		}
		

		function _setIcon(name, text) {
			if (!_config.showicons) return;
			
			if (name || text) {
				_button.setRotation(name == "buffer" ? parseInt(_config.bufferrotation, 10) : 0, parseInt(_config.bufferinterval, 10));
				_button.setIcon(name);
				_button.setText(text);
			} else {
				_button.hide();
			}
			
		}

		function _itemHandler() {
			_clearError();
			_item = _api.jwGetPlaylist()[_api.jwGetPlaylistIndex()];
			var newImage = _item ? _item.image : "";
			_previousState = undefined;
			_loadImage(newImage);
		}

		function _loadImage(newImage) {
			if (_image != newImage) {
				if (_image) {
					_setVisibility(D_PREVIEW_CLASS, FALSE);
				}
				_image = newImage;
				_getImage();
			} else if (_image && !_hiding) {
				_setVisibility(D_PREVIEW_CLASS, TRUE);
			}
			_updateDisplay(_api.jwGetState());
		}
		
		function _playlistCompleteHandler() {
			_completedState = TRUE;
			_setIcon("replay");
			var item = _api.jwGetPlaylist()[0];
			_loadImage(item.image);
		}
		
		var _stateTimeout;
		
		
		function _getState() {
			return _forced ? _forced : (_api ? _api.jwGetState() : states.IDLE);
		}
		
		function _stateHandler(evt) {
			clearTimeout(_stateTimeout);
			_stateTimeout = setTimeout(function() {
				_updateDisplay(evt.newstate);
			}, 100);
		}
		
		function _updateDisplay(state) {
			state = _getState();
			if (state!=_previousState) {
				_previousState = state;
				if (_button) _button.setRotation(0);
				switch(state) {
				case states.IDLE:
					if (!_errorState && !_completedState) {
						if (_image && !_imageHidden) {
							_setVisibility(D_PREVIEW_CLASS, TRUE);
						}
						var disp = true;
						if (_api._model && _api._model.config.displaytitle === false) {
							disp = false;
						}
						_setIcon('play', (_item && disp) ? _item.title : "");
					}
					break;
				case states.BUFFERING:
					_clearError();
					_completedState = FALSE;
					_setIcon('buffer');
					break;
				case states.PLAYING:
					_setIcon();
					break;
				case states.PAUSED:
					_setIcon('play');
					break;
				}
			}
		}
		
	
		this.forceState = function(state) {
			_forced = state;
			_updateDisplay(state);
			this.show();
		};
		
		this.releaseState = function(state) {
			_forced = null;
			_updateDisplay(state);
			this.show();
		};
		
		this.hidePreview = function(state) {
			_imageHidden = state;
			_setVisibility(D_PREVIEW_CLASS, !state);
			if (state) {
				_hiding = true;
				//_hideDisplay();
			}
		};

		this.setHiding = function() {
			_hiding = true;
		};

		this.element = function() {
			return _display;
		};
		
		function _internalSelector(selector) {
			return '#' + _display.id + ' ' + selector;
		}
		
		function _getImage() {
			if (_image) {
				// Find image size and stretch exactfit if close enough
				var img = new Image();
				img.addEventListener('load', _imageLoaded, FALSE);
				img.src = _image;
			} else {
				_css(_internalSelector(D_PREVIEW_CLASS), { 'background-image': undefined });
				_setVisibility(D_PREVIEW_CLASS, FALSE);
				_imageWidth = _imageHeight = 0;
			}
		}
		
		function _imageLoaded() {
			_imageWidth = this.width;
			_imageHeight = this.height;
			_updateDisplay(_api.jwGetState());
			_redraw();
			if (_image) {
				_css(_internalSelector(D_PREVIEW_CLASS), {
					'background-image': 'url('+_image+')' 
				});
			}
		}

		function _errorHandler(evt) {
			_errorState = TRUE;
			_setIcon('error', evt.message);
		}
		
		function _clearError() {
			_errorState = FALSE;
			if (_icons.error) _icons.error.setText();
		}

		
		function _redraw() {
			if (_display.clientWidth * _display.clientHeight > 0) {
				utils.stretch(_api.jwGetStretching(), _preview, _display.clientWidth, _display.clientHeight, _imageWidth, _imageHeight);
			}
		}

		this.redraw = _redraw;
		
		function _setVisibility(selector, state) {
			if (!utils.exists(_visibilities[selector])) _visibilities[selector] = false;
			
			if (_visibilities[selector] != state) {
				_visibilities[selector] = state;
				_css(_internalSelector(selector), {
					opacity: state ? 1 : 0,
					visibility: state ? "visible" : "hidden"
				});
			}
		}

		this.show = function(force) {
			if (_button && (force || _getState() != states.PLAYING)) {
				_clearHideTimeout();
				_display.style.display = "block";
				_button.show();
				_hiding = false;
			}
		};
		
		this.hide = function() {
			if (_button) {
				_button.hide();
				_hiding = true;
			}
		};

		function _clearHideTimeout() {
			clearTimeout(_hideTimeout);
			_hideTimeout = undefined;
		}

		/** NOT SUPPORTED : Using this for now to hack around instream API **/
		this.setAlternateClickHandler = function(handler) {
			_alternateClickHandler = handler;
		};

		this.revertAlternateClickHandler = function() {
			_alternateClickHandler = undefined;
		};

		_init();
	};
	
	_css(D_CLASS, {
		position: JW_CSS_ABSOLUTE,
		cursor: "pointer",
		width: JW_CSS_100PCT,
		height: JW_CSS_100PCT,
		overflow: JW_CSS_HIDDEN
	});

	_css(D_CLASS + ' .jwpreview', {
		position: JW_CSS_ABSOLUTE,
		width: JW_CSS_100PCT,
		height: JW_CSS_100PCT,
		background: 'no-repeat center',
		overflow: JW_CSS_HIDDEN,
		opacity: 0
	});

	_css(D_CLASS +', '+D_CLASS + ' *', {
		'-webkit-transition': JW_CSS_SMOOTH_EASE,
		'-moz-transition': JW_CSS_SMOOTH_EASE,
		'-o-transition': JW_CSS_SMOOTH_EASE
	});

})(jwplayer);
/**
 * JW Player display component
 * 
 * @author pablo
 * @version 6.0
 */
(function(jwplayer) {
	var html5 = jwplayer.html5,
		utils = jwplayer.utils,
		_css = utils.css,

		DI_CLASS = ".jwplayer .jwdisplayIcon",
		DOCUMENT = document,

		/** Some CSS constants we should use for minimization * */
		JW_CSS_NONE = "none", 
		JW_CSS_100PCT = "100%",
		JW_CSS_CENTER = "center";

	html5.displayicon = function(_id, _api, textStyle, textStyleOver) {
		var _skin = _api.skin,
			_container, 
			_bgSkin,
			_capLeftSkin,
			_capRightSkin,
			_hasCaps,
			_text,
			_icon,
			_iconCache = {},
			_iconElement,
			_iconWidth = 0,
			_setWidthTimeout = -1,
			_repeatCount = 0;

		function _init() {
			_container = _createElement("jwdisplayIcon");
			_container.id = _id;

			
			//_createElement('capLeft', _container);
//			_bg = _createElement('background', _container);
			_createBackground();
			_text = _createElement('jwtext', _container, textStyle, textStyleOver);
			_icon = _createElement('jwicon', _container);
			//_createElement('capRight', _container);
			
			_api.jwAddEventListener(jwplayer.events.JWPLAYER_RESIZE, _setWidth);
			
			_hide();
			_redraw();
		}

		function _internalSelector(selector, hover) {
			return "#" + _id + (hover ? ":hover" : "") + " " + (selector ? selector : "");
		}

		function _createElement(name, parent, style, overstyle) {
			var elem = DOCUMENT.createElement("div");

			elem.className = name;
			if (parent) parent.appendChild(elem);

			if (_container) {
				_styleIcon(elem, name, "."+name, style, overstyle);
			}
			return elem;
		}
		
		function _createBackground() {
			_bgSkin = _getSkinElement('background');
			_capLeftSkin = _getSkinElement('capLeft');
			_capRightSkin = _getSkinElement('capRight');
			_hasCaps = (_capLeftSkin.width * _capRightSkin.width > 0);
			
			var style = {
				'background-image': "url(" + _capLeftSkin.src + "), url(" + _bgSkin.src + "), url(" + _capRightSkin.src + ")",
				'background-position': "left,center,right",
				'background-repeat': 'no-repeat',
				padding: "0 " + _capRightSkin.width + "px 0 " + _capLeftSkin.width + "px",
				height: _bgSkin.height,
				'margin-top': _bgSkin.height / -2
			};
			_css(_internalSelector(), style);
			
			if (!utils.isMobile()) {
				if (_bgSkin.overSrc) {
					style['background-image'] = "url(" + _capLeftSkin.overSrc + "), url(" + _bgSkin.overSrc + "), url(" + _capRightSkin.overSrc + ")"; 
				}
				_css("#"+_api.id+" .jwdisplay:hover " + _internalSelector(), style);
			}
		}
		
		function _styleIcon(element, name, selector, style, overstyle) {
			var skinElem = _getSkinElement(name);
			if (name == "replayIcon" && !skinElem.src) skinElem = _getSkinElement("playIcon"); 

			if (skinElem.src) {
				style = utils.extend({}, style);
				if (name.indexOf("Icon") > 0) _iconWidth = skinElem.width|0;
				style.width = skinElem.width;
				style['background-image'] = 'url(' + skinElem.src + ')';
				style['background-size'] = skinElem.width+'px '+skinElem.height+'px';
				
				overstyle = utils.extend({}, overstyle);
				if (skinElem.overSrc) {
					overstyle['background-image'] = 'url(' + skinElem.overSrc + ')';
				}
				if (!utils.isMobile()) {
					_css("#"+_api.id+" .jwdisplay:hover " + selector, overstyle);
				}
				_css.style(_container, { display: "table" });
			} else {
				_css.style(_container, { display: "none" });
			}
			if (style) {
				_css.style(element, style);
			}
			_iconElement = skinElem;
		}

		function _getSkinElement(name) {
			var elem = _skin.getSkinElement('display', name),
				overElem = _skin.getSkinElement('display', name + 'Over');
				
			if (elem) {
				elem.overSrc = (overElem && overElem.src) ? overElem.src : "";
				return elem;
			}
			return { src : "", overSrc : "", width : 0, height : 0 };
		}
		
		function _redraw() {
			var showText = _hasCaps || (_iconWidth === 0);
			
			_css.style(_text, {
				display: (_text.innerHTML && showText) ? '' : JW_CSS_NONE
			});

			_repeatCount = showText ? 30 : 0;
			_setWidth();
		}
		
		function _setWidth() {
			clearTimeout(_setWidthTimeout);
			if (_repeatCount-- > 0) {
				_setWidthTimeout = setTimeout(_setWidth, 33);
			}

			var px100pct = 'px ' + JW_CSS_100PCT;
			var contentWidth = Math.ceil(Math.max(_iconElement.width, utils.bounds(_container).width - _capRightSkin.width - _capLeftSkin.width));
			var style = {
				'background-size': [_capLeftSkin.width + px100pct, contentWidth + px100pct, _capRightSkin.width + px100pct].join(', ')
			};
			if (_container.parentNode) {
				style.left = (_container.parentNode.clientWidth % 2 == 1) ? '0.5px' : '';
			}
			_css.style(_container, style);
		}
			
		this.element = function() {
			return _container;
		};

		this.setText = function(text) {
			var style = _text.style;
			_text.innerHTML = text ? text.replace(":", ":<br>") : "";
			style.height = "0";
			style.display = "block";
			if (text) {
				while (numLines(_text) > 2) {
					_text.innerHTML = _text.innerHTML.replace(/(.*) .*$/, "$1...");
				}
			}
			style.height = "";
			style.display = "";
			_redraw();
		};
		
		this.setIcon = function(name) {
			var icon = _iconCache[name];
			if (!icon) {
				icon = _createElement('jwicon');
				icon.id = _container.id + "_" + name;
			}
			_styleIcon(icon, name+"Icon", "#"+icon.id);
			if (_container.contains(_icon)) {
				_container.replaceChild(icon, _icon);
			} else {
				_container.appendChild(icon);
			}
			_icon = icon;
		};

		var _bufferInterval,
			_bufferAngle = 0,
			_currentAngle;
		
		function startRotation(angle, interval) {
			clearInterval(_bufferInterval);
			_currentAngle = 0;
			_bufferAngle = angle|0;
			if (_bufferAngle === 0) {
				rotateIcon();
			} else {
				_bufferInterval = setInterval(rotateIcon, interval);
			}
		}

		function rotateIcon() {
			_currentAngle = (_currentAngle + _bufferAngle) % 360;
			utils.rotate(_icon, _currentAngle);
		}

		this.setRotation = startRotation;
						
		function numLines(element) {
			return Math.floor(element.scrollHeight / DOCUMENT.defaultView.getComputedStyle(element, null).lineHeight.replace("px", ""));
		}

		
		var _hide = this.hide = function() {
			_container.style.opacity = 0;
		};

		this.show = function() {
			_container.style.opacity = 1;
		};

		_init();
	};

	_css(DI_CLASS, {
		display : 'table',
		cursor : 'pointer',
		position: "relative",
		'margin-left': "auto",
		'margin-right': "auto",
		top: "50%"
	});

	_css(DI_CLASS + " div", {
		position : "relative",
		display: "table-cell",
		'vertical-align': "middle",
		'background-repeat' : "no-repeat",
		'background-position' : JW_CSS_CENTER
	});

	_css(DI_CLASS + " div", {
		'vertical-align': "middle"
	}, true);

	_css(DI_CLASS + " .jwtext", {
		color : "#fff",
		padding: "0 1px",
		'max-width' : "300px",
		'overflow-y' : "hidden",
		'text-align': JW_CSS_CENTER,
		'-webkit-user-select' : JW_CSS_NONE,
		'-moz-user-select' : JW_CSS_NONE,
		'-ms-user-select' : JW_CSS_NONE,
		'user-select' : JW_CSS_NONE
	});

})(jwplayer);
/**
 * JW Player display component
 * 
 * @author pablo
 * @version 6.0
 */
(function(jwplayer) {
	var html5 = jwplayer.html5,
		utils = jwplayer.utils,
		_css = utils.css,
		_bounds = utils.bounds,

		D_CLASS = ".jwdock",
		DB_CLASS = ".jwdockbuttons",
		DOCUMENT = document,

		/** Some CSS constants we should use for minimization * */
		JW_CSS_NONE = "none",
		JW_CSS_BLOCK = "block",
		JW_CSS_100PCT = "100%";

	html5.dock = function(api, config) {
		var _api = api,
			_defaults = {
				iconalpha: 0.75,
				iconalphaactive: 0.5,
				iconalphaover: 1,
				margin: 8
			},
			_config = utils.extend({}, _defaults, config), 
			_id = _api.id + "_dock",
			_skin = _api.skin,
			_buttonCount = 0,
			_buttons = {},
			_tooltips = {},
			_container,
			_buttonContainer,
			_dockBounds,
			_fadeTimeout,
			_this = this;

		function _init() {
			_this.visible = false;
			
			_container = _createElement("div", "jwdock");
			_buttonContainer = _createElement("div", "jwdockbuttons");
			_container.appendChild(_buttonContainer);
			_container.id = _id;
			
			_setupElements();
			
			setTimeout(function() {
				_dockBounds = _bounds(_container);
			});
			
		}
		
		function _setupElements() {
			var button = _getSkinElement('button'),
				buttonOver = _getSkinElement('buttonOver'),
				buttonActive = _getSkinElement('buttonActive');
			
			if (!button) return;
			
			_css(_internalSelector(), {
				height: button.height,
				padding: _config.margin
			});

			_css(DB_CLASS, {
				height: button.height
			});

			_css(_internalSelector("button"), utils.extend(_formatBackground(button), {
				width: button.width,
				cursor: "pointer",
				border: JW_CSS_NONE
			}));
			
			_css(_internalSelector("button:hover"), _formatBackground(buttonOver));
			_css(_internalSelector("button:active"), _formatBackground(buttonActive));
			_css(_internalSelector("button>div"), { opacity: _config.iconalpha });
			_css(_internalSelector("button:hover>div"), { opacity: _config.iconalphaover });
			_css(_internalSelector("button:active>div"), { opacity: _config.iconalphaactive});
			_css(_internalSelector(".jwoverlay"), { top: _config.margin + button.height });
			
			_createImage("capLeft", _buttonContainer);
			_createImage("capRight", _buttonContainer);
			_createImage("divider");
		}
		
		function _formatBackground(elem) {
			if (!(elem && elem.src)) return {};
			return { 
				background: "url("+elem.src+") center",
				'background-size': elem.width+"px "+elem.height+"px"
			};
		}
		
		function _createImage(className, parent) {
			var skinElem = _getSkinElement(className);
			_css(_internalSelector("." + className), utils.extend(_formatBackground(skinElem), {
				width: skinElem.width
			}));
			return _createElement("div", className, parent);
		}
		
		function _internalSelector(selector) {
			return "#" + _id + " " + (selector ? selector : "");
		}

		function _createElement(type, name, parent) {
			var elem = DOCUMENT.createElement(type);
			if (name) elem.className = name;
			if (parent) parent.appendChild(elem);
			return elem;
		}
		
		function _getSkinElement(name) {
			var elem = _skin.getSkinElement('dock', name);
			return elem ? elem : { width: 0, height: 0, src: "" };
		}

		_this.redraw = function() {
			_dockBounds = _bounds(_container);
		};
		
		function _positionTooltip(name) {
			var tooltip = _tooltips[name],
				tipBounds,
				button = _buttons[name],
				dockBounds,
				buttonBounds = _bounds(button.icon);

			tooltip.offsetX(0);
			dockBounds = _bounds(_container);
			_css('#' + tooltip.element().id, {
				left: buttonBounds.left - dockBounds.left + buttonBounds.width / 2
			});
			tipBounds = _bounds(tooltip.element());	
			if (dockBounds.left > tipBounds.left) {
				tooltip.offsetX(dockBounds.left - tipBounds.left + 8);
			}

		}
	
		_this.element = function() {
			return _container;
		};
		
		_this.offset = function(offset) {
			_css(_internalSelector(), { 'margin-left': offset });
		};

		_this.hide = function() {
			if (!_this.visible) return;
			_this.visible = false;
			_container.style.opacity = 0;
			clearTimeout(_fadeTimeout);
			_fadeTimeout = setTimeout(function() {
				_container.style.display = JW_CSS_NONE;
			}, 250);
		};

		_this.showTemp = function() {
			if (!_this.visible) {
				_container.style.opacity = 0;
				_container.style.display = JW_CSS_BLOCK;
			}
		};
		
		_this.hideTemp = function() {
			if (!_this.visible) {
				_container.style.display = JW_CSS_NONE;
			}
		};

		_this.show = function() {
			if (_this.visible || !_buttonCount) return;
			_this.visible = true;
			_container.style.display = JW_CSS_BLOCK;
			clearTimeout(_fadeTimeout);
			_fadeTimeout = setTimeout(function() {
				_container.style.opacity = 1;
			}, 0);
		};
		
		_this.addButton = function(url, label, clickHandler, id) {
			// Can't duplicate button ids
			if (_buttons[id]) return;
			
			var divider = _createElement("div", "divider", _buttonContainer),
				newButton = _createElement("button", null, _buttonContainer),
				icon = _createElement("div", null, newButton);
		
			icon.id = _id + "_" + id;
			icon.innerHTML = "&nbsp;";
			_css("#"+icon.id, {
				'background-image': url
			});
			
			if (typeof clickHandler == "string") {
				clickHandler = new Function(clickHandler);
			}
			if (!utils.isMobile()) {
				newButton.addEventListener("click", function(evt) {
					clickHandler(evt);
					evt.preventDefault();
				});
			} else {
				var buttonTouch = new utils.touch(newButton);
				buttonTouch.addEventListener(utils.touchEvents.TAP, function(evt) {
					clickHandler(evt);
				});
			}
			
			_buttons[id] = { element: newButton, label: label, divider: divider, icon: icon };
			
			if (label) {
				var tooltip = new html5.overlay(icon.id+"_tooltip", _skin, true),
					tipText = _createElement("div");
				tipText.id = icon.id + "_label";
				tipText.innerHTML = label;
				_css('#'+tipText.id, {
					padding: 3
				});
				tooltip.setContents(tipText);
				
				if(!utils.isMobile()) {
					var timeout;
					newButton.addEventListener('mouseover', function() { 
						clearTimeout(timeout); 
						_positionTooltip(id); 
						tooltip.show();
						utils.foreach(_tooltips, function(i, tooltip) {
							if (i != id) tooltip.hide();
						});
					}, false);
					newButton.addEventListener('mouseout', function() {
						timeout = setTimeout(tooltip.hide, 100); 
					} , false);
					
					_container.appendChild(tooltip.element());
					_tooltips[id] = tooltip;
				}
			}
			
			_buttonCount++;
			_setCaps();
		};
		
		_this.removeButton = function(id) {
			if (_buttons[id]) {
				_buttonContainer.removeChild(_buttons[id].element);
				_buttonContainer.removeChild(_buttons[id].divider);
				var tooltip = document.getElementById(""+_id + "_" + id + "_tooltip");
				if (tooltip) _container.removeChild(tooltip);
				delete _buttons[id];
				_buttonCount--;
				_setCaps();
			}
		};
		
		_this.numButtons = function() {
			return _buttonCount;
		};
		
		function _setCaps() {
			_css(DB_CLASS + " .capLeft, " + DB_CLASS + " .capRight", {
				display: _buttonCount ? JW_CSS_BLOCK : JW_CSS_NONE
			});
		}

		_init();
	};

	_css(D_CLASS, {
		opacity: 0,
		display: JW_CSS_NONE
	});
		
	_css(D_CLASS + " > *", {
		height: JW_CSS_100PCT,
		'float': "left"
	});

	_css(D_CLASS + " > .jwoverlay", {
		height: 'auto',
		'float': JW_CSS_NONE,
		'z-index': 99
	});

	_css(DB_CLASS + " button", {
		position: "relative"
	});
	
	_css(DB_CLASS + " > *", {
		height: JW_CSS_100PCT,
		'float': "left"
	});

	_css(DB_CLASS + " .divider", {
		display: JW_CSS_NONE
	});

	_css(DB_CLASS + " button ~ .divider", {
		display: JW_CSS_BLOCK
	});

	_css(DB_CLASS + " .capLeft, " + DB_CLASS + " .capRight", {
		display: JW_CSS_NONE
	});

	_css(DB_CLASS + " .capRight", {
		'float': "right"
	});
	
	_css(DB_CLASS + " button > div", {
		left: 0,
		right: 0,
		top: 0,
		bottom: 0,
		margin: 5,
		position: "absolute",
		'background-position': "center",
		'background-repeat': "no-repeat"
	});

	utils.transitionStyle(D_CLASS, "background .25s, opacity .25s");
	utils.transitionStyle(D_CLASS + " .jwoverlay", "opacity .25s");
	utils.transitionStyle(DB_CLASS + " button div", "opacity .25s");

})(jwplayer);
/** 
 * API to control instream playback without interrupting currently playing video
 *
 * @author pablo
 * @version 6.0
 */
(function(jwplayer, undefined) {
    var html5 = jwplayer.html5, 
        _utils = jwplayer.utils, 
        _events = jwplayer.events, 
        _states = _events.state,
        _playlist = jwplayer.playlist;
    
    html5.instream = function(_api, _model, _view, _controller) {
        var _defaultOptions = {
            controlbarseekable: 'never',
            controlbarpausable: true,
            controlbarstoppable: true,
            loadingmessage: 'Loading ad',
            playlistclickable: true,
            skipoffset: null,
            tag: null
        };
        
        var _item,
            _array,
            _arrayIndex = 0,
            _optionList,
            _options = { // these are for before load
                controlbarseekable: 'never',
                controlbarpausable: false,
                controlbarstoppable: false
            },
            _skipButton,
            _video,
            _oldsrc,
            _oldsources,
            _oldpos,
            _oldstate,
            _olditem,
            _provider,
            _cbar,
            _disp,
            _dispatcher = new _events.eventdispatcher(),
            _instreamContainer,
            _fakemodel,
            _this = this,
            _shouldSeek = true,
            _completeTimeoutId = -1;

        // Listen for player resize events
        _api.jwAddEventListener(_events.JWPLAYER_RESIZE, _resize);
        _api.jwAddEventListener(_events.JWPLAYER_FULLSCREEN, _fullscreenHandler);

        /*****************************************
         *****  Public instream API methods  *****
         *****************************************/

        _this.init = function() {
            
            /** Blocking playback and show Instream Display **/
            
            // Make sure the original player's provider stops broadcasting events (pseudo-lock...)
            _video = _controller.detachMedia();

            // Create (or reuse) video media provider
            _setupProvider();

            // Initialize the instream player's model copied from main player's model
            _fakemodel = new html5.model({}, _provider);
            _fakemodel.setVolume(_model.volume);
            _fakemodel.setMute(_model.mute);

            _olditem = _model.playlist[_model.item];

            // Keep track of the original player state
            _oldsrc = _video.src ? _video.src : _video.currentSrc;
            _oldsources = _video.innerHTML;
            _oldpos = _video.currentTime;
            
            if (_controller.checkBeforePlay() || _oldpos === 0) {
                _oldstate = _states.PLAYING;
                _shouldSeek = false;
            } else if (_api.jwGetState() === _states.IDLE || _model.getVideo().checkComplete()) {
                _oldstate = _states.IDLE;
            } else {
                _oldstate = _states.PLAYING;
            }
            
            // If the player's currently playing, pause the video tag
            if (_oldstate == _states.PLAYING) {
                _video.pause();
            }

            // Instream display
            _disp = new html5.display(_this);
            _disp.forceState(_states.BUFFERING);
            // Create the container in which the controls will be placed
            _instreamContainer = document.createElement("div");
            _instreamContainer.id = _this.id + "_instream_container";
            _instreamContainer.appendChild(_disp.element());

            // Instream controlbar
            _cbar = new html5.controlbar(_this);
            _cbar.instreamMode(true);
            _instreamContainer.appendChild(_cbar.element());

            if (_api.jwGetControls()) {
                _cbar.show();
                _disp.show();
            } else {
                _cbar.hide();
                _disp.hide();
            }
            
            // Show the instream layer
            _view.setupInstream(_instreamContainer, _cbar, _disp, _fakemodel);
            
            // Resize the instream components to the proper size
            _resize();

            _this.jwInstreamSetText(_defaultOptions.loadingmessage);
        };

        /** Load an instream item and initialize playback **/
        _this.load = function(item, options) {
            if (_utils.isAndroid(2.3)) {
                errorHandler({
                    type: _events.JWPLAYER_ERROR,
                    message: 'Error loading instream: Cannot play instream on Android 2.3'
                });
                return;
            }
            _sendEvent(_events.JWPLAYER_PLAYLIST_ITEM, {index:_arrayIndex}, true);
            var playersize = _utils.bounds(document.getElementById(_api.id));
            var safe = _view.getSafeRegion();

            // Copy the playlist item passed in and make sure it's formatted as a proper playlist item
            if (_utils.typeOf(item) == "object") {
                _item = new _playlist.item(item);
                _fakemodel.setPlaylist([item]);
                _options = _utils.extend(_defaultOptions, options);
                _skipButton = new html5.adskipbutton(_api, playersize.height - (safe.y + safe.height) + 10, _options.skipMessage,_options.skipText);
                _skipButton.addEventListener(_events.JWPLAYER_AD_SKIPPED, _skipAd);
                _skipButton.reset(_options.skipoffset || -1);
            } else if (_utils.typeOf(item) == "array") {
                var curOpt;
                if (options) {
                    _optionList = options;
                    curOpt = options[_arrayIndex];
                }
                _options = _utils.extend(_defaultOptions, curOpt);
                _skipButton = new html5.adskipbutton(_api, playersize.height - (safe.y + safe.height) + 10, _options.skipMessage,_options.skipText);
                _skipButton.addEventListener(_events.JWPLAYER_AD_SKIPPED, _skipAd);
                _skipButton.reset(_options.skipoffset || -1);
                _array = item;
                
                item = _array[_arrayIndex];
                _item = new _playlist.item(item);
                _fakemodel.setPlaylist([item]);
            }
            

            if (_api.jwGetControls()) {
                _skipButton.show();
            } else {
                _skipButton.hide();
            }
            

            var skipElem = _skipButton.element();
            _instreamContainer.appendChild(skipElem);
            // Match the main player's controls state
            _fakemodel.addEventListener(_events.JWPLAYER_ERROR, errorHandler);

            // start listening for ad click
            _disp.setAlternateClickHandler(function(evt) {
                if (_api.jwGetControls()) {
                    if (_fakemodel.state == _states.PAUSED) {
                        _this.jwInstreamPlay();
                    } else {
                        _this.jwInstreamPause();
                    }
                    evt.hasControls = true;
                } else {
                    evt.hasControls = false;
                }
                
                _sendEvent(_events.JWPLAYER_INSTREAM_CLICK, evt);
            });
            
            
            
            if (_utils.isIE()) {
                _video.parentElement.addEventListener('click', _disp.clickHandler);
            }
 
            _view.addEventListener(_events.JWPLAYER_AD_SKIPPED, _skipAd);
            
            // Load the instream item
            _provider.load(_fakemodel.playlist[0]);
            //_fakemodel.getVideo().addEventListener('webkitendfullscreen', _fullscreenChangeHandler, FALSE);
        };
        
        function errorHandler(evt) {
            _sendEvent(evt.type, evt);

            if (_fakemodel) {
                _api.jwInstreamDestroy(false, _this);
            }
        }
        
        /** Stop the instream playback and revert the main player back to its original state **/
        _this.jwInstreamDestroy = function(complete) {
            if (!_fakemodel) {
                return;
            }
            clearTimeout(_completeTimeoutId);
            _completeTimeoutId = -1;
            _provider.detachMedia();
                        // Re-attach the controller
            _controller.attachMedia();
            // Load the original item into our provider, which sets up the regular player's video tag
            if (_oldstate != _states.IDLE) {
                //_provider.load(_olditem, false);
                _model.getVideo().load(_olditem,false);
            } else {
               _model.getVideo().stop();
            }
            _dispatcher.resetEventListeners();

            // We don't want the instream provider to be attached to the video tag anymore

            _provider.resetEventListeners();
            _fakemodel.resetEventListeners();



            // If we added the controlbar anywhere, let's get rid of it
            if (_cbar) {
                try {
                    _cbar.element().parentNode.removeChild(_cbar.element());
                } catch(e) {}
            }
            if (_disp) {
                if (_video && _video.parentElement) _video.parentElement.removeEventListener('click', _disp.clickHandler);
                _disp.revertAlternateClickHandler();
            }
            // Let listeners know the instream player has been destroyed, and why
            _sendEvent(_events.JWPLAYER_INSTREAM_DESTROYED, {
                reason: complete ? "complete" : "destroyed"
            }, true);



            if (_oldstate == _states.PLAYING) {
                // Model was already correct; just resume playback
                _video.play();
                if (_model.playlist[_model.item] == _olditem) {
                    // We need to seek using the player's real provider, since the seek may have to be delayed
                    if (_shouldSeek) _model.getVideo().seek(_oldpos);
                }
            }

                        // Return the view to its normal state
            _view.destroyInstream(_provider.audioMode());
            _fakemodel = null;
        };
        
        /** Forward any calls to add and remove events directly to our event dispatcher **/
        
        _this.jwInstreamAddEventListener = function(type, listener) {
            _dispatcher.addEventListener(type, listener);
        } ;
        _this.jwInstreamRemoveEventListener = function(type, listener) {
            _dispatcher.removeEventListener(type, listener);
        };

        /** Start instream playback **/
        _this.jwInstreamPlay = function() {
            //if (!_item) return;
            _provider.play(true);
            _model.state = _states.PLAYING;
            _disp.show();
            // if (_api.jwGetControls()) { _disp.show();  }
        };

        /** Pause instream playback **/
        _this.jwInstreamPause = function() {
            //if (!_item) return;
            _provider.pause(true);
            _model.state = _states.PAUSED;
            if (_api.jwGetControls()) { _disp.show(); }
        };
        
        /** Seek to a point in instream media **/
        _this.jwInstreamSeek = function(position) {
            //if (!_item) return;
            _provider.seek(position);
        };
        
        /** Set custom text in the controlbar **/
        _this.jwInstreamSetText = function(text) {
            _cbar.setText(text);
        };

        _this.jwInstreamState = function() {
            //if (!_item) return;
            return _model.state;
        };
        
        /*****************************
         ****** Private methods ****** 
         *****************************/
        
        function _setupProvider() {
            //if (!_provider) {
            _provider = new html5.video(_video);
            _provider.addGlobalListener(_forward);
            _provider.addEventListener(_events.JWPLAYER_MEDIA_META, _metaHandler);
            _provider.addEventListener(_events.JWPLAYER_MEDIA_COMPLETE, _completeHandler);
            _provider.addEventListener(_events.JWPLAYER_MEDIA_BUFFER_FULL, _bufferFullHandler);
            _provider.addEventListener(_events.JWPLAYER_MEDIA_ERROR, errorHandler);
            _provider.addEventListener(_events.JWPLAYER_MEDIA_TIME, function(evt) {
                if (_skipButton)
                    _skipButton.updateSkipTime(evt.position, evt.duration);
            });
            _provider.attachMedia();
            _provider.mute(_model.mute);
            _provider.volume(_model.volume);
        }
        
        function _skipAd(evt) {
            _sendEvent(evt.type, evt);
            _completeHandler(null);
        }
        /** Forward provider events to listeners **/        
        function _forward(evt) {
            _sendEvent(evt.type, evt);
        }
        
        function _fullscreenHandler(evt) {
            //_forward(evt);
            _resize();
            if (!evt.fullscreen && _utils.isIPad()) {
                if (_fakemodel.state === _states.PAUSED) {
                    _disp.show(true);
                }
                else if (_fakemodel.state === _states.PLAYING) {
                    _disp.hide();
                } 
            }
        }
        
        /** Handle the JWPLAYER_MEDIA_BUFFER_FULL event **/     
        function _bufferFullHandler() {
            if (_disp) {
                _disp.releaseState(_this.jwGetState());
            }
            _provider.play();
        }

        /** Handle the JWPLAYER_MEDIA_COMPLETE event **/        
        function _completeHandler() {
            if (_array && _arrayIndex + 1 < _array.length) {
                _arrayIndex++;
                var item = _array[_arrayIndex];
                _item = new _playlist.item(item);
                _fakemodel.setPlaylist([item]);
                var curOpt;
                if (_optionList) {
                    curOpt = _optionList[_arrayIndex];
                }
                _options = _utils.extend(_defaultOptions, curOpt);
                _provider.load(_fakemodel.playlist[0]);
                _skipButton.reset(_options.skipoffset||-1);
                _completeTimeoutId = setTimeout(function() {
                    _sendEvent(_events.JWPLAYER_PLAYLIST_ITEM, {index:_arrayIndex}, true);
                }, 0);
            } else {
                _completeTimeoutId = setTimeout(function() {
                    _sendEvent(_events.JWPLAYER_PLAYLIST_COMPLETE, {}, true);
                    _api.jwInstreamDestroy(true, _this);
                }, 0);
            }
        }

        /** Handle the JWPLAYER_MEDIA_META event **/        
        function _metaHandler(evt) {
            // If we're getting video dimension metadata from the provider, allow the view to resize the media
            if (evt.width && evt.height) {
                if (_disp) {
                    _disp.releaseState(_this.jwGetState());
                }
                _view.resizeMedia();
            }
        }
        
        function _sendEvent(type, data) {
            data = data || {};
            if (_defaultOptions.tag && !data.tag) data.tag = _defaultOptions.tag;
            _dispatcher.sendEvent(type, data);
        }
        
        // Resize handler; resize the components.
        function _resize() {
            if (_cbar) {
                _cbar.redraw();
            }
            if (_disp) {
                _disp.redraw();
            }
        }

        _this.setControls = function(mode) {
            if (mode) {
                _skipButton.show();
            } else {
                _skipButton.hide();
            }
        };
        
        /**************************************
         *****  Duplicate main html5 api  *****
         **************************************/
        
        _this.jwPlay = function() {
            if (_options.controlbarpausable.toString().toLowerCase()=="true") {
                _this.jwInstreamPlay();
            }
        };
        
        _this.jwPause = function() {
            if (_options.controlbarpausable.toString().toLowerCase()=="true") {
                _this.jwInstreamPause();
            }
        };

        _this.jwStop = function() {
            if (_options.controlbarstoppable.toString().toLowerCase()=="true") {
                _api.jwInstreamDestroy(false, _this);
                _api.jwStop();
            }
        };

        _this.jwSeek = function(position) {
            switch(_options.controlbarseekable.toLowerCase()) {
            case "never":
                return;
            case "always":
                _this.jwInstreamSeek(position);
                break;
            case "backwards":
                if (_fakemodel.position > position) {
                    _this.jwInstreamSeek(position);
                }
                break;
            }
        };
        
        _this.jwSeekDrag = function(state) { _fakemodel.seekDrag(state); };
        
        _this.jwGetPosition = function() {};
        _this.jwGetDuration = function() {};
        _this.jwGetWidth = _api.jwGetWidth;
        _this.jwGetHeight = _api.jwGetHeight;
        _this.jwGetFullscreen = _api.jwGetFullscreen;
        _this.jwSetFullscreen = _api.jwSetFullscreen;
        _this.jwGetVolume = function() {
            return _model.volume;
        };
        _this.jwSetVolume = function(vol) {
            _fakemodel.setVolume(vol);
            _api.jwSetVolume(vol);
        };
        _this.jwGetMute = function() { return _model.mute; };
        _this.jwSetMute = function(state) {
            _fakemodel.setMute(state);
            _api.jwSetMute(state);
        };
        _this.jwGetState = function() {
            if (!_fakemodel) {
                return _states.IDLE;
            }
            return _fakemodel.state;
        };
        _this.jwGetPlaylist = function() {
            return [_item];
        };
        _this.jwGetPlaylistIndex = function() {
            return 0;
        };
        _this.jwGetStretching = function() {
            return _model.config.stretching;
        };
        _this.jwAddEventListener = function(type, handler) {
            _dispatcher.addEventListener(type, handler);
        };
        _this.jwRemoveEventListener = function(type, handler) {
            _dispatcher.removeEventListener(type, handler);
        };
        _this.jwSetCurrentQuality = function() {};
        _this.jwGetQualityLevels = function() {
            return [];
        };

        // for supporting api interface in html5 display
        _this.jwGetControls = function() {
            return _api.jwGetControls();
        };

        _this.skin = _api.skin;
        _this.id = _api.id + "_instream";

        return _this;
    };
})(window.jwplayer);
/**
 * JW Player HTML5 overlay component
 * 
 * @author pablo
 * @version 6.0
 */
(function(jwplayer) {
	
	var html5 = jwplayer.html5,
		utils = jwplayer.utils,
		_css = utils.css,
		
		MENU_CLASS = 'jwmenu',
		OPTION_CLASS = 'jwoption',
		UNDEFINED,
		WHITE = '#ffffff',
		CCC = '#cccccc';
	
	/** HTML5 Overlay class **/
	html5.menu = function(name, id, skin, changeHandler) {
		var _id = id,
			_changeHandler = changeHandler,
			_overlay = new html5.overlay(_id+"_overlay", skin),
			_settings = utils.extend({
				fontcase: UNDEFINED,
				fontcolor: CCC,
				fontsize: 11,
				fontweight: UNDEFINED,
				activecolor: WHITE,
				overcolor: WHITE
			}, skin.getComponentSettings('tooltip')),
			_container,
			_options = [];
		
		function _init() {
			_container = _createElement(MENU_CLASS);
			_container.id = _id;
			
			var top = _getSkinElement('menuTop'+name),
				menuOption = _getSkinElement('menuOption'),
				menuOptionOver = _getSkinElement('menuOptionOver'),
				menuOptionActive = _getSkinElement('menuOptionActive');

			if (top && top.image) {
				var topImage = new Image();
				topImage.src = top.src;
				topImage.width = top.width;
				topImage.height = top.height;
				_container.appendChild(topImage);
			}
			
			if (menuOption) {
				var selector = '#'+id+' .'+OPTION_CLASS;
				
				_css(selector, utils.extend(_formatBackground(menuOption), {
					height: menuOption.height,
					color: _settings.fontcolor,
					'padding-left': menuOption.width,
					font: _settings.fontweight + " " + _settings.fontsize + "px Arial,Helvetica,sans-serif",
					'line-height': menuOption.height,
					'text-transform': (_settings.fontcase == "upper") ? "uppercase" : UNDEFINED 
				}));
				_css(selector+":hover", utils.extend(_formatBackground(menuOptionOver), {
					color: _settings.overcolor
				}));
				_css(selector+".active", utils.extend(_formatBackground(menuOptionActive), {
					color: _settings.activecolor
				}));
			}
			_overlay.setContents(_container);
		}
		
		function _formatBackground(elem) {
			if (!(elem && elem.src)) return {};
			return {
				background: "url(" + elem.src + ") no-repeat left",
				'background-size': elem.width + "px " + elem.height + "px" 
			};
		}
		
		this.element = function() {
			return _overlay.element();
		};
		
		this.addOption = function(label, value) {
			var option = _createElement(OPTION_CLASS, _container);
			option.id = _id+"_option_"+value;
			option.innerHTML = label;
			if (!utils.isMobile()) {
				option.addEventListener('click', _clickHandler(_options.length, value));
			}
			else {
				var optionTouch = new utils.touch(option);
				optionTouch.addEventListener(utils.touchEvents.TAP, _clickHandler(_options.length, value));
			}
			_options.push(option);
		};
		
		function _clickHandler(index, value) {
			return function() {
				_setActive(index);
				if (_changeHandler) _changeHandler(value);
			};
		}
		
		this.clearOptions = function() {
			while(_options.length > 0) {
				_container.removeChild(_options.pop());
			}
		};

		var _setActive = this.setActive = function(index) {
			for (var i = 0; i < _options.length; i++) {
				var option = _options[i];
				option.className = option.className.replace(" active", "");
				if (i == index) option.className += " active";
			}
		};
		

		function _createElement(className, parent) {
			var elem = document.createElement("div");
			if (className) elem.className = className;
			if (parent) parent.appendChild(elem);
			return elem;
		}
		
		function _getSkinElement(name) {
			var elem = skin.getSkinElement('tooltip', name);
			return elem ? elem : { width: 0, height: 0, src: UNDEFINED };
		}

		this.show = _overlay.show;
		this.hide = _overlay.hide;
		this.offsetX = _overlay.offsetX;
		this.positionX = _overlay.positionX;
		this.constrainX = _overlay.constrainX;
		
		_init();
	};
	
	function _class(className) {
		return "." + className.replace(/ /g, " .");
	}
	
	_css(_class(MENU_CLASS + ' ' + OPTION_CLASS), {
		cursor: "pointer",
		position: "relative"
	});
	
})(jwplayer);
/**
 * jwplayer.html5 model
 * 
 * @author pablo
 * @version 6.0
 */
(function(html5) {
	var utils = jwplayer.utils,
		events = jwplayer.events,
		UNDEF = undefined,
		TRUE = true,
		FALSE = false;

	html5.model = function(config, video) {
		var _model = this, 
			// Video provider
			_video, 
			// HTML5 <video> tag
			_videoTag,
			// Saved settings
			_cookies = utils.getCookies(),
			// Sub-component configurations
			_componentConfigs = {
				controlbar: {},
				display: {}
			},
			// Defaults
			_defaults = {
				autostart: FALSE,
				controls: TRUE,
				debug: UNDEF,
				fullscreen: FALSE,
				height: 320,
				mobilecontrols: FALSE,
				mute: FALSE,
				playlist: [],
				playlistposition: "none",
				playlistsize: 180,
				playlistlayout: "extended",
				repeat: FALSE,
				skin: UNDEF,
				stretching: utils.stretching.UNIFORM,
				width: 480,
				volume: 90
			};

		function _parseConfig(config) {
			utils.foreach(config, function(i, val) {
				config[i] = utils.serialize(val);
			});
			return config;
		}

		function _init() {
			utils.extend(_model, new events.eventdispatcher());
			_model.config = _parseConfig(utils.extend({}, _defaults, _cookies, config));
			utils.extend(_model, {
				id: config.id,
				state : events.state.IDLE,
				duration: -1,
				position: 0,
				buffer: 0
			}, _model.config);
			// This gets added later
			_model.playlist = [];
			_model.setItem(0);
			_model.setVideo(video ? video : new html5.video());

		}
		
		var _eventMap = {};
		_eventMap[events.JWPLAYER_MEDIA_MUTE] = "mute";
		_eventMap[events.JWPLAYER_MEDIA_VOLUME] = "volume";
		_eventMap[events.JWPLAYER_PLAYER_STATE] = "newstate->state";
		_eventMap[events.JWPLAYER_MEDIA_BUFFER] = "bufferPercent->buffer";
		_eventMap[events.JWPLAYER_MEDIA_TIME] = "position,duration";
			
		function _videoEventHandler(evt) {
			var mappings = (_eventMap[evt.type] ? _eventMap[evt.type].split(",") : []), i, _sendEvent;
			if (mappings.length > 0) {
				for (i=0; i<mappings.length; i++) {
					var mapping = mappings[i],
						split = mapping.split("->"),
						eventProp = split[0],
						stateProp = split[1] ? split[1] : eventProp;
						
					if (_model[stateProp] != evt[eventProp]) {
						_model[stateProp] = evt[eventProp];
						_sendEvent = true;
					}
				}
				if (_sendEvent) {
					_model.sendEvent(evt.type, evt);
				}
			} else {
				_model.sendEvent(evt.type, evt);
			}
		}
		
		/** Sets the video provider **/
		_model.setVideo = function(video) {
			if (_video) {
				_video.removeGlobalListener(_videoEventHandler);
			}

			_video = video;
			_videoTag = _video.getTag();

			_video.volume(_model.volume);
			_video.mute(_model.mute);
			_video.addGlobalListener(_videoEventHandler);
		}
		
		_model.getVideo = function() {
			return _video;
		}
		
		_model.seekDrag = function(state) {
			_video.seekDrag(state);
		}
		
		_model.setFullscreen = function(state) {
			if (state != _model.fullscreen) {
				_model.fullscreen = state;
				_model.sendEvent(events.JWPLAYER_FULLSCREEN, { fullscreen: state } );
			}
		}
		
		// TODO: make this a synchronous action; throw error if playlist is empty
		_model.setPlaylist = function(playlist) {
			_model.playlist = utils.filterPlaylist(playlist);
			if (_model.playlist.length == 0) {
				_model.sendEvent(events.JWPLAYER_ERROR, { message: "Error loading playlist: No playable sources found" });
			} else {
				_model.sendEvent(events.JWPLAYER_PLAYLIST_LOADED, {
					playlist: jwplayer(_model.id).getPlaylist()
				});
				_model.item = -1;
				_model.setItem(0);
			}
		}

		_model.setItem = function(index) {
            var newItem;
            var repeat = false;
            if (index == _model.playlist.length || index < -1) {
                newItem = 0;
                repeat = true;
            }
            else if (index == -1 || index > _model.playlist.length)
                newItem = _model.playlist.length - 1;
            else
                newItem = index;
            
            if (repeat  || newItem != _model.item) {
                _model.item = newItem;
                _model.sendEvent(events.JWPLAYER_PLAYLIST_ITEM, {
                    "index": _model.item
                });
            }
        }
        
		_model.setVolume = function(newVol) {
			if (_model.mute && newVol > 0) _model.setMute(FALSE);
			newVol = Math.round(newVol);
			if (!_model.mute) {
				utils.saveCookie("volume", newVol);
			}
			_videoEventHandler({type:events.JWPLAYER_MEDIA_VOLUME, volume: newVol});
			_video.volume(newVol);
		}

		_model.setMute = function(state) {
			if (!utils.exists(state)) state = !_model.mute;
			utils.saveCookie("mute", state);
			_videoEventHandler({type:events.JWPLAYER_MEDIA_MUTE, mute: state});
			_video.mute(state);
		}

		_model.componentConfig = function(name) {
			return _componentConfigs[name];
		}
		
		_init();
	}
})(jwplayer.html5);
/**
 * JW Player HTML5 overlay component
 * 
 * @author pablo
 * @version 6.0
 */
(function(jwplayer) {
	var html5 = jwplayer.html5,
		utils = jwplayer.utils,
		_css = utils.css,
		_setTransition = utils.transitionStyle,

		/** Some CSS constants we should use for minimization **/
		JW_CSS_RELATIVE = "relative",
		JW_CSS_ABSOLUTE = "absolute",
		//JW_CSS_NONE = "none",
		//JW_CSS_BLOCK = "block",
		//JW_CSS_INLINE = "inline",
		//JW_CSS_INLINE_BLOCK = "inline-block",
		JW_CSS_HIDDEN = "hidden",
		//JW_CSS_LEFT = "left",
		//JW_CSS_RIGHT = "right",
		JW_CSS_100PCT = "100%",
		JW_CSS_SMOOTH_EASE = 'opacity .25s, visibility .25s',
		
		OVERLAY_CLASS = '.jwoverlay',
		CONTENTS_CLASS = 'jwcontents',
		
		TOP = "top",
		BOTTOM = "bottom",
		RIGHT = "right",
		LEFT = "left",
		WHITE = "#ffffff",
		
		UNDEFINED,
		DOCUMENT = document,
		
		_defaults = {
			fontcase: UNDEFINED,
			fontcolor: WHITE,
			fontsize: 12,
			fontweight: UNDEFINED,
			activecolor: WHITE,
			overcolor: WHITE
		};
	
	/** HTML5 Overlay class **/
	html5.overlay = function(id, skin, inverted) {
		var _this = this,
			_id = id,
			_skin = skin,
			_inverted = inverted,
			_container,
			_contents,
			_arrow,
			_arrowElement,
			_settings = utils.extend({}, _defaults, _skin.getComponentSettings('tooltip')),
			_borderSizes = {};
		
		function _init() {
			_container = _createElement(OVERLAY_CLASS.replace(".",""));
			_container.id = _id;

			var arrow = _createSkinElement("arrow", "jwarrow");
			_arrowElement = arrow[0];
			_arrow = arrow[1];
			
			_css.style(_arrowElement, {
				position: JW_CSS_ABSOLUTE,
				//bottom: _inverted ? UNDEFINED : -1 * _arrow.height,
				bottom: _inverted ? UNDEFINED : 0,
				top: _inverted ? 0 : UNDEFINED,
				width: _arrow.width,
				height: _arrow.height,
				left: "50%"
			});

			_createBorderElement(TOP, LEFT);
			_createBorderElement(BOTTOM, LEFT);
			_createBorderElement(TOP, RIGHT);
			_createBorderElement(BOTTOM, RIGHT);
			_createBorderElement(LEFT);
			_createBorderElement(RIGHT);
			_createBorderElement(TOP);
			_createBorderElement(BOTTOM);
			
			var back = _createSkinElement("background", "jwback");
			_css.style(back[0], {
				left: _borderSizes.left,
				right: _borderSizes.right,
				top: _borderSizes.top,
				bottom: _borderSizes.bottom
			});
			
			_contents = _createElement(CONTENTS_CLASS, _container);
			_css(_internalSelector(CONTENTS_CLASS) + " *", {
				color: _settings.fontcolor,
				font: _settings.fontweight + " " + (_settings.fontsize) + "px Arial,Helvetica,sans-serif",
				'text-transform': (_settings.fontcase == "upper") ? "uppercase" : UNDEFINED
			});

			
			if (_inverted) {
				utils.transform(_internalSelector("jwarrow"), "rotate(180deg)");
			}

			_css.style(_container, {
				padding: (_borderSizes.top+1) + "px " + _borderSizes.right + "px " + (_borderSizes.bottom+1) + "px " + _borderSizes.left + "px"  
			});
			
			_this.showing = false;
		}
		
		function _internalSelector(name) {
			return '#' + _id + (name ? " ." + name : "");
		}

		function _createElement(className, parent) {
			var elem = DOCUMENT.createElement("div");
			if (className) elem.className = className;
			if (parent) parent.appendChild(elem);
			return elem;
		}


		function _createSkinElement(name, className) {
			var skinElem = _getSkinElement(name),
				elem = _createElement(className, _container);
			
			_css.style(elem, _formatBackground(skinElem));
			//_css(_internalSelector(className.replace(" ", ".")), _formatBackground(skinElem));
			
			return [elem, skinElem];
			
		}
		
		function _formatBackground(elem) {
			return {
				background: "url("+elem.src+") center",
				'background-size': elem.width + "px " + elem.height + "px"
			};
		}
		
		function _createBorderElement(dim1, dim2) {
			if (!dim2) dim2 = "";
			var created = _createSkinElement('cap' + dim1 + dim2, "jwborder jw" + dim1 + (dim2 ? dim2 : "")), 
				elem = created[0],
				skinElem = created[1],
				elemStyle = utils.extend(_formatBackground(skinElem), {
					width: (dim1 == LEFT || dim2 == LEFT || dim1 == RIGHT || dim2 == RIGHT) ? skinElem.width: UNDEFINED,
					height: (dim1 == TOP || dim2 == TOP || dim1 == BOTTOM || dim2 == BOTTOM) ? skinElem.height: UNDEFINED
				});
			
			
			elemStyle[dim1] = ((dim1 == BOTTOM && !_inverted) || (dim1 == TOP && _inverted)) ? _arrow.height : 0;
			if (dim2) elemStyle[dim2] = 0;
			
			_css.style(elem, elemStyle);
			//_css(_internalSelector(elem.className.replace(/ /g, ".")), elemStyle);
			
			var dim1style = {}, 
				dim2style = {}, 
				dims = { 
					left: skinElem.width, 
					right: skinElem.width, 
					top: (_inverted ? _arrow.height : 0) + skinElem.height, 
					bottom: (_inverted ? 0 : _arrow.height) + skinElem.height
				};
			if (dim2) {
				dim1style[dim2] = dims[dim2];
				dim1style[dim1] = 0;
				dim2style[dim1] = dims[dim1];
				dim2style[dim2] = 0;
				_css(_internalSelector("jw"+dim1), dim1style);
				_css(_internalSelector("jw"+dim2), dim2style);
				_borderSizes[dim1] = dims[dim1];
				_borderSizes[dim2] = dims[dim2];
			}
		}

		_this.element = function() {
			return _container;
		};
		
		_this.setContents = function(contents) {
			utils.empty(_contents);
			_contents.appendChild(contents);
		};

		_this.positionX = function(x) {
			_css.style(_container, {
				left: Math.round(x)
			});
		};
		
		_this.constrainX = function(containerBounds, forceRedraw) {
			if (_this.showing && containerBounds.width !== 0) {
				// reset and check bounds
				var width = _this.offsetX(0);
				if (width) {
					if (forceRedraw) {
						_css.unblock();
					}
					var bounds = utils.bounds(_container);
					if (bounds.width !== 0) {
						if (bounds.right > containerBounds.right) {
							_this.offsetX(containerBounds.right - bounds.right);
						} else if (bounds.left < containerBounds.left) {
							_this.offsetX(containerBounds.left - bounds.left);
						}
					}
				}
			}
		};

		_this.offsetX = function(offset) {
			offset = Math.round(offset);
			var width = _container.clientWidth;
			if (width !== 0) {
				_css.style(_container, {
					'margin-left': Math.round(-width/2) + offset
				});
				_css.style(_arrowElement, {
					'margin-left': Math.round(-_arrow.width/2) - offset
				});
			}
			return width;
		};
		
		_this.borderWidth = function() {
			return _borderSizes.left;
		};

		function _getSkinElement(name) {
			var elem = _skin.getSkinElement('tooltip', name); 
			if (elem) {
				return elem;
			} else {
				return {
					width: 0,
					height: 0,
					src: "",
					image: UNDEFINED,
					ready: false
				};
			}
		}
		
		_this.show = function() {
			_this.showing = true;
			_css.style(_container, {
				opacity: 1,
				visibility: "visible"
			});
		};
		
		_this.hide = function() {
			_this.showing = false;
			_css.style(_container, {
				opacity: 0,
				visibility: JW_CSS_HIDDEN
			});
		};
		
		// Call constructor
		_init();

	};

	/*************************************************************
	 * Player stylesheets - done once on script initialization;  *
	 * These CSS rules are used for all JW Player instances      *
	 *************************************************************/

	_css(OVERLAY_CLASS, {
		position: JW_CSS_ABSOLUTE,
		visibility: JW_CSS_HIDDEN,
		opacity: 0
	});

	_css(OVERLAY_CLASS + " .jwcontents", {
		position: JW_CSS_RELATIVE,
		'z-index': 1
	});

	_css(OVERLAY_CLASS + " .jwborder", {
		position: JW_CSS_ABSOLUTE,
		'background-size': JW_CSS_100PCT + " " + JW_CSS_100PCT
	}, true);

	_css(OVERLAY_CLASS + " .jwback", {
		position: JW_CSS_ABSOLUTE,
		'background-size': JW_CSS_100PCT + " " + JW_CSS_100PCT
	});

	_setTransition(OVERLAY_CLASS, JW_CSS_SMOOTH_EASE);
	
})(jwplayer);
/**
 * Main HTML5 player class
 *
 * @author pablo
 * @version 6.0
 */
(function(jwplayer) {
	var html5 = jwplayer.html5,
		utils = jwplayer.utils;
	
	html5.player = function(config) {
		var _this = this,
			_model, 
			_view, 
			_controller,
			_instreamPlayer;

		function _init() {
			_model = new html5.model(config); 
			_this.id = _model.id;

			utils.css.block(_this.id);
			
			_view = new html5.view(_this, _model); 
			_controller = new html5.controller(_model, _view);
			
			_this._model = _model;

			_initializeAPI();
			
			var setup = new html5.setup(_model, _view, _controller);
			setup.addEventListener(jwplayer.events.JWPLAYER_READY, _readyHandler);
			setup.addEventListener(jwplayer.events.JWPLAYER_ERROR, _errorHandler);
			setup.start();
		}
		
		function _readyHandler(evt) {
			_controller.playerReady(evt);
			utils.css.unblock(_this.id);
		}

		function _errorHandler(evt) {
			utils.log('There was a problem setting up the player: ', evt);
			utils.css.unblock(_this.id);
		}

		function _normalizePlaylist() {
			var list = _model.playlist,
				arr = [];

			for (var i = 0; i < list.length; i++) {
				arr.push(_normalizePlaylistItem(list[i]));
			}

			return arr;
		}

		function _normalizePlaylistItem(item) {
			var obj = {
				'description':	item.description,
				'file':			item.file,
				'image':		item.image,
				'mediaid':		item.mediaid,
				'title':		item.title
			};

			utils.foreach(item, function(i, val) {
				obj[i] = val;
			});

			obj['sources'] = [];
			obj['tracks'] = [];
			if (item.sources.length > 0) {
				utils.foreach(item.sources, function(i, source) {
					var sourceCopy = {
						file: source.file,
						type: source.type ? source.type : undefined,
						label: source.label,
						'default': source['default'] ? true : false
					};
					obj['sources'].push(sourceCopy);
				});
			}

			if (item.tracks.length > 0) {
				utils.foreach(item.tracks, function(i, track) {
					var trackCopy = {
						file: track.file,
						kind: track.kind ? track.kind : undefined,
						label: track.label,
						'default': track['default'] ? true : false
					};
					obj['tracks'].push(trackCopy);
				});
			}

			if (!item.file && item.sources.length > 0) {
				obj.file = item.sources[0].file;
			}

			return obj;
		}
		
		function _initializeAPI() {
			
			/** Methods **/
			_this.jwPlay = _controller.play;
			_this.jwPause = _controller.pause;
			_this.jwStop = _controller.stop;
			_this.jwSeek = _controller.seek;
			_this.jwSetVolume = _controller.setVolume;
			_this.jwSetMute = _controller.setMute;
			_this.jwLoad =  function(item) {
				_this.jwInstreamDestroy();
			    _controller.load(item);
			};
			_this.jwPlaylistNext = _controller.next;
			_this.jwPlaylistPrev = _controller.prev;
			_this.jwPlaylistItem = _controller.item;
			_this.jwSetFullscreen = _controller.setFullscreen;
			_this.jwResize = _view.resize;
			_this.jwSeekDrag = _model.seekDrag;
			_this.jwGetQualityLevels = _controller.getQualityLevels;
			_this.jwGetCurrentQuality = _controller.getCurrentQuality;
			_this.jwSetCurrentQuality = _controller.setCurrentQuality;
			_this.jwGetCaptionsList = _controller.getCaptionsList;
			_this.jwGetCurrentCaptions = _controller.getCurrentCaptions;
			_this.jwSetCurrentCaptions = _controller.setCurrentCaptions;

			_this.jwGetSafeRegion = _view.getSafeRegion; 
			_this.jwForceState = _view.forceState;
			_this.jwReleaseState = _view.releaseState;
			
			_this.jwGetPlaylistIndex = _statevarFactory('item');
			_this.jwGetPosition = _statevarFactory('position');
			_this.jwGetDuration = _statevarFactory('duration');
			_this.jwGetBuffer = _statevarFactory('buffer');
			_this.jwGetWidth = _statevarFactory('width');
			_this.jwGetHeight = _statevarFactory('height');
			_this.jwGetFullscreen = _statevarFactory('fullscreen');
			_this.jwGetVolume = _statevarFactory('volume');
			_this.jwGetMute = _statevarFactory('mute');
			_this.jwGetState = _statevarFactory('state');
			_this.jwGetStretching = _statevarFactory('stretching');
			_this.jwGetPlaylist = _normalizePlaylist;
			_this.jwGetControls = _statevarFactory('controls');

			/** InStream API **/
			_this.jwDetachMedia = _controller.detachMedia;
			_this.jwAttachMedia = _controller.attachMedia;

			/** Ads API **/
			_this.jwPlayAd = function (ad) { 
				// THIS SHOULD NOT BE USED!
				var plugins = jwplayer(_this.id).plugins;
				if (plugins.vast) {
					plugins.vast.jwPlayAd(ad);
				}
				// else if (plugins.googima) {
				// 	// This needs to be added once the googima Ads API is implemented
				// 	//plugins.googima.jwPlayAd(ad);
				// }
			};

			_this.jwPauseAd = function () { 
				var plugins = jwplayer(_this.id).plugins;
				if (plugins.googima) {
					plugins.googima.jwPauseAd();
				}
			};
			
			_this.jwInitInstream = function() {
				_this.jwInstreamDestroy();
				_instreamPlayer = new html5.instream(_this, _model, _view, _controller);
				_instreamPlayer.init();
			};
			
			_this.jwLoadItemInstream = function(item, options) {
				if(!_instreamPlayer) {
					throw 'Instream player undefined';
				}
				_instreamPlayer.load(item, options);
			};
			
			_this.jwLoadArrayInstream = function(item, options) {
                if(!_instreamPlayer) {
                    throw 'Instream player undefined';
                }
                _instreamPlayer.load(item, options);
            };
			
			_this.jwSetControls = function(mode) {
			    _view.setControls(mode);
			    if(_instreamPlayer) _instreamPlayer.setControls(mode);
			};

			_this.jwInstreamPlay = function() {
				if (_instreamPlayer) _instreamPlayer.jwInstreamPlay();
			};
			
			_this.jwInstreamPause = function() {
				if (_instreamPlayer) _instreamPlayer.jwInstreamPause();
			};

			_this.jwInstreamState = function() {
				if (_instreamPlayer) return _instreamPlayer.jwInstreamState();
				return '';
			};
			
			_this.jwInstreamDestroy = function(complete, _instreamInstance) {
				_instreamInstance = _instreamInstance || _instreamPlayer;
				if (_instreamInstance) {
					_instreamInstance.jwInstreamDestroy(complete||false);
					if (_instreamInstance === _instreamPlayer) {
						_instreamPlayer = undefined;
					}
				}
			};

			_this.jwInstreamAddEventListener = function(type, listener) {
				if (_instreamPlayer) _instreamPlayer.jwInstreamAddEventListener(type, listener);
			};

			_this.jwInstreamRemoveEventListener = function(type, listener) {
				if (_instreamPlayer) _instreamPlayer.jwInstreamRemoveEventListener(type, listener);
			};

			_this.jwPlayerDestroy = function() {
				if (_view) {
					_view.destroy();
				}
			};
			
			_this.jwInstreamSetText = function(text) {
				if (_instreamPlayer) _instreamPlayer.jwInstreamSetText(text);
			};
			
			_this.jwIsBeforePlay = function () {
				return _controller.checkBeforePlay();
			};

			_this.jwIsBeforeComplete = function () {
				return _model.getVideo().checkComplete();
			};

			/** Used by ads component to display upcoming cuepoints **/
			_this.jwSetCues = _view.addCues;
			
			/** Events **/
			_this.jwAddEventListener = _controller.addEventListener;
			_this.jwRemoveEventListener = _controller.removeEventListener;
			
			/** Dock **/
			_this.jwDockAddButton = _view.addButton;
			_this.jwDockRemoveButton = _view.removeButton;
						
		}

		/** Getters **/
		
		function _statevarFactory(statevar) {
			return function() {
				return _model[statevar];
			};
		}
		
		_init();
	};
	
})(window.jwplayer);

/**
 * jwplayer Playlist component for the JW Player.
 *
 * @author pablo
 * @version 6.0
 */
(function(html5) {
	var WHITE = "#FFFFFF",
		CCC = "#CCCCCC",
		THREES = "#333333",
		NINES = "#999999",
		NORMAL = "normal",
		_defaults = {
			size: 180,
			//position: html5.view.positions.NONE,
			//thumbs: true,
			// Colors
			backgroundcolor: THREES,
			fontcolor: NINES,
			overcolor: CCC,
			activecolor: CCC,
			titlecolor: CCC,
			titleovercolor: WHITE,
			titleactivecolor: WHITE,
			
			fontweight: NORMAL,
			titleweight: NORMAL,
			fontsize: 11,
			titlesize: 13
		},

		events = jwplayer.events,
		utils = jwplayer.utils, 
		_css = utils.css,
		_isMobile = utils.isMobile(),
		
		PL_CLASS = '.jwplaylist',
		DOCUMENT = document,
		
		/** Some CSS constants we should use for minimization **/
		JW_CSS_ABSOLUTE = "absolute",
		JW_CSS_RELATIVE = "relative",
		JW_CSS_HIDDEN = "hidden",
		JW_CSS_100PCT = "100%";
	
	html5.playlistcomponent = function(api, config) {
		var _api = api,
			_skin = _api.skin,
			_settings = utils.extend({}, _defaults, _api.skin.getComponentSettings("playlist"), config),
			_wrapper,
			_container,
			_playlist,
			_ul,
			_lastCurrent = -1,
			_clickedIndex,
			_slider,
			_lastHeight = -1,
			_itemheight = 76,
			_elements = {
				'background': undefined,
				'divider': undefined,
				'item': undefined,
				'itemOver': undefined,
				'itemImage': undefined,
				'itemActive': undefined
			},
			_isBasic,
			_this = this;

		_this.element = function() {
			return _wrapper;
		};
		
		_this.redraw = function() {
			if (_slider) _slider.redraw();
		};
		
		_this.show = function() {
			utils.show(_wrapper);
		}

		_this.hide = function() {
			utils.hide(_wrapper);
		}


		function _setup() {
			_wrapper = _createElement("div", "jwplaylist"); 
			_wrapper.id = _api.id + "_jwplayer_playlistcomponent";

			_isBasic = (_api._model.playlistlayout == "basic");
			
			_container = _createElement("div", "jwlistcontainer");
			_appendChild(_wrapper, _container);
			
			_populateSkinElements();
			if (_isBasic) {
				_itemheight = 32;
			}
			if (_elements.divider) {
				_itemheight += _elements.divider.height;
			}

			_setupStyles();
			
			_api.jwAddEventListener(events.JWPLAYER_PLAYLIST_LOADED, _rebuildPlaylist);
			_api.jwAddEventListener(events.JWPLAYER_PLAYLIST_ITEM, _itemHandler);
			_api.jwAddEventListener(events.JWPLAYER_RESIZE, _resizeHandler);
		}
		
        function _resizeHandler(evt) {
            _this.redraw();
        }

		function _internalSelector(className) {
			return '#' + _wrapper.id + (className ? ' .' + className : "");
		}
		
		function _setupStyles() {
			var imgPos = 0, imgWidth = 0, imgHeight = 0; 

			utils.clearCss(_internalSelector());

			_css(_internalSelector(), {
				'background-color':	_settings.backgroundcolor 
			});
			
			_css(_internalSelector("jwlist"), {
				'background-image': _elements.background ? " url("+_elements.background.src+")" : ""
			});
			
			_css(_internalSelector("jwlist" + " *"), {
				color: _settings.fontcolor,
				font: _settings.fontweight + " " + _settings.fontsize + "px Arial, Helvetica, sans-serif"
			});

			
        	if (_elements.itemImage) {
        		imgPos = (_itemheight - _elements.itemImage.height) / 2 + "px ";
        		imgWidth = _elements.itemImage.width;
        		imgHeight = _elements.itemImage.height;
        	} else {
        		imgWidth = _itemheight * 4 / 3;
        		imgHeight = _itemheight
        	}
			
        	if (_elements.divider) {
        		_css(_internalSelector("jwplaylistdivider"), {
        			'background-image': "url("+_elements.divider.src + ")",
        			'background-size': JW_CSS_100PCT + " " + _elements.divider.height + "px",
        			width: JW_CSS_100PCT,
        			height: _elements.divider.height
        		});
        	}
        	
        	_css(_internalSelector("jwplaylistimg"), {
			    height: imgHeight,
			    width: imgWidth,
				margin: imgPos ? (imgPos + "0 " + imgPos + imgPos) : "0 5px 0 0"
        	});
			
			_css(_internalSelector("jwlist li"), {
				'background-image': _elements.item ? "url("+_elements.item.src+")" : "",
				height: _itemheight,
				overflow: 'hidden',
				'background-size': JW_CSS_100PCT + " " + _itemheight + "px",
		    	cursor: 'pointer'
			});

			var activeStyle = { overflow: 'hidden' };
			if (_settings.activecolor !== "") activeStyle.color = _settings.activecolor;
			if (_elements.itemActive) activeStyle['background-image'] = "url("+_elements.itemActive.src+")";
			_css(_internalSelector("jwlist li.active"), activeStyle);
			_css(_internalSelector("jwlist li.active .jwtitle"), {
				color: _settings.titleactivecolor
			});
			_css(_internalSelector("jwlist li.active .jwdescription"), {
				color: _settings.activecolor
			});

			var overStyle = { overflow: 'hidden' };
			if (_settings.overcolor !== "") overStyle.color = _settings.overcolor;
			if (_elements.itemOver) overStyle['background-image'] = "url("+_elements.itemOver.src+")";
			
			if (!_isMobile) {
				_css(_internalSelector("jwlist li:hover"), overStyle);
				_css(_internalSelector("jwlist li:hover .jwtitle"), {
					color: _settings.titleovercolor
				});
				_css(_internalSelector("jwlist li:hover .jwdescription"), {
					color: _settings.overcolor
				});
			}
	
			_css(_internalSelector("jwtextwrapper"), {
				height: _itemheight,
				position: JW_CSS_RELATIVE
			});

			_css(_internalSelector("jwtitle"), {
	        	overflow: 'hidden',
	        	display: "inline-block",
	        	height: _isBasic ? _itemheight : 20,
	        	color: _settings.titlecolor,
		    	'font-size': _settings.titlesize,
	        	'font-weight': _settings.titleweight,
	        	'margin-top': _isBasic ? '0 10px' : 10,
	        	'margin-left': 10,
	        	'margin-right': 10,
	        	'line-height': _isBasic ? _itemheight : 20
	    	});
	    
			_css(_internalSelector("jwdescription"), {
	    	    display: 'block',
	    	    'font-size': _settings.fontsize,
	    	    'line-height': 18,
	    	    'margin-left': 10,
	    	    'margin-right': 10,
	        	overflow: 'hidden',
	        	height: 36,
	        	position: JW_CSS_RELATIVE
	    	});

		}

		function _createList() {
			var ul = _createElement("ul", "jwlist");
			ul.id = _wrapper.id + "_ul" + Math.round(Math.random()*10000000);
			return ul;
		}


		function _createItem(index) {
			var item = _playlist[index],
				li = _createElement("li", "jwitem"),
				div;
			
			li.id = _ul.id + '_item_' + index;

	        if (index > 0) {
	        	div = _createElement("div", "jwplaylistdivider");
	        	_appendChild(li, div);
	        }
	        else {
	        	var divHeight = _elements.divider ? _elements.divider.height : 0;
	        	li.style.height = (_itemheight - divHeight) + "px";
	        	li.style["background-size"] = "100% " + (_itemheight - divHeight) + "px";
	        }
		        
			var imageWrapper = _createElement("div", "jwplaylistimg jwfill");
        	
			var imageSrc; 
			if (item['playlist.image'] && _elements.itemImage) {
				imageSrc = item['playlist.image'];	
			} else if (item.image && _elements.itemImage) {
				imageSrc = item.image;
			} else if (_elements.itemImage) {
				imageSrc = _elements.itemImage.src;
			}
			if (imageSrc && !_isBasic) {
				_css('#'+li.id+' .jwplaylistimg', {
					'background-image': imageSrc
	        	});
				_appendChild(li, imageWrapper);
			}
		
			var textWrapper = _createElement("div", "jwtextwrapper");
        	var title = _createElement("span", "jwtitle");
        	title.innerHTML = (item && item.title) ? item.title : "";
        	_appendChild(textWrapper, title);

	        if (item.description && !_isBasic) {
	        	var desc = _createElement("span", "jwdescription");
	        	desc.innerHTML = item.description;
	        	_appendChild(textWrapper, desc);
	        }
	        
	        _appendChild(li, textWrapper);
			return li;
		}
		
		function _createElement(type, className) {
			var elem = DOCUMENT.createElement(type);
			if (className) elem.className = className;
			return elem;
		}
		
		function _appendChild(parent, child) {
			parent.appendChild(child);
		}
			
		function _rebuildPlaylist(evt) {
			_container.innerHTML = "";
			
			_playlist = _getPlaylist();
			if (!_playlist) {
				return;
			}
			_ul = _createList();
			
			for (var i=0; i<_playlist.length; i++) {
				var li = _createItem(i);
				if (_isMobile) {
					var touch = new utils.touch(li);
					touch.addEventListener(utils.touchEvents.TAP, _clickHandler(i));
				} else {
					li.onclick = _clickHandler(i);
				}
				_appendChild(_ul, li);
			}
			
			_lastCurrent = _api.jwGetPlaylistIndex();
			
			_appendChild(_container, _ul);
			_slider = new html5.playlistslider(_wrapper.id + "_slider", _api.skin, _wrapper, _ul);
			
		}
		
		function _getPlaylist() {
			var list = _api.jwGetPlaylist();
			var strippedList = [];
			for (var i=0; i<list.length; i++) {
				if (!list[i]['ova.hidden']) {
					strippedList.push(list[i]);
				}
			}
			return strippedList;
		}
		
		function _clickHandler(index) {
			return function() {
				_clickedIndex = index;
				_api.jwPlaylistItem(index);
				_api.jwPlay(true);
			}
		}
		
		function _scrollToItem() {
			var idx = _api.jwGetPlaylistIndex();
			// No need to scroll if the user clicked the current item
			if (idx == _clickedIndex) return;
			_clickedIndex = -1;
				
			if (_slider && _slider.visible()) {
				_slider.thumbPosition(idx / (_api.jwGetPlaylist().length-1)) ;
			}
		}

		function _itemHandler(evt) {
			if (_lastCurrent >= 0) {
				DOCUMENT.getElementById(_ul.id + '_item_' + _lastCurrent).className = "jwitem";
				_lastCurrent = evt.index;
			}
			DOCUMENT.getElementById(_ul.id + '_item_' + evt.index).className = "jwitem active";
			_scrollToItem();
		}

		
		function _populateSkinElements() {
			utils.foreach(_elements, function(element, _) {
				_elements[element] = _skin.getSkinElement("playlist", element);
			});
		}
		
		_setup();
		return this;
	};
	
	/** Global playlist styles **/

	_css(PL_CLASS, {
		position: JW_CSS_ABSOLUTE,
	    width: JW_CSS_100PCT,
		height: JW_CSS_100PCT
	});
	
	utils.dragStyle(PL_CLASS, 'none');

	_css(PL_CLASS + ' .jwplaylistimg', {
		position: JW_CSS_RELATIVE,
	    width: JW_CSS_100PCT,
	    'float': 'left',
	    margin: '0 5px 0 0',
		background: "#000",
		overflow: JW_CSS_HIDDEN
	});

	_css(PL_CLASS+' .jwlist', {
		position: JW_CSS_ABSOLUTE,
		width: JW_CSS_100PCT,
    	'list-style': 'none',
    	margin: 0,
    	padding: 0,
    	overflow: JW_CSS_HIDDEN
	});
	
	_css(PL_CLASS+' .jwlistcontainer', {
		position: JW_CSS_ABSOLUTE,
		overflow: JW_CSS_HIDDEN,
		width: JW_CSS_100PCT,
		height: JW_CSS_100PCT
	});

	_css(PL_CLASS+' .jwlist li', {
	    width: JW_CSS_100PCT
	});

	_css(PL_CLASS+' .jwtextwrapper', {
		overflow: JW_CSS_HIDDEN
	});

	_css(PL_CLASS+' .jwplaylistdivider', {
		position: JW_CSS_ABSOLUTE
	});
	
	if (_isMobile) utils.transitionStyle(PL_CLASS+' .jwlist', "top .35s");



})(jwplayer.html5);
/**
 * Playlist slider component for the JW Player.
 *
 * @author pablo
 * @version 6.0
 * 
 * TODO: reuse this code for vertical controlbar volume slider
 */
(function(html5) {
	var events = jwplayer.events,
		utils = jwplayer.utils,
		touchevents = utils.touchEvents,
		_css = utils.css,
	
		SLIDER_CLASS = 'jwslider',
		SLIDER_TOPCAP_CLASS = 'jwslidertop',
		SLIDER_BOTTOMCAP_CLASS = 'jwsliderbottom',
		SLIDER_RAIL_CLASS = 'jwrail',
		SLIDER_RAILTOP_CLASS = 'jwrailtop',
		SLIDER_RAILBACK_CLASS = 'jwrailback',
		SLIDER_RAILBOTTOM_CLASS = 'jwrailbottom',
		SLIDER_THUMB_CLASS = 'jwthumb',
		SLIDER_THUMBTOP_CLASS = 'jwthumbtop',
		SLIDER_THUMBBACK_CLASS = 'jwthumbback',
		SLIDER_THUMBBOTTOM_CLASS = 'jwthumbbottom',
	
		DOCUMENT = document,
		WINDOW = window,
		UNDEFINED = undefined,
	
		/** Some CSS constants we should use for minimization **/
		JW_CSS_ABSOLUTE = "absolute",
		JW_CSS_HIDDEN = "hidden",
		JW_CSS_100PCT = "100%";
	
	html5.playlistslider = function(id, skin, parent, pane) {
		var _skin = skin,
			_id = id,
			_pane = pane,
			_wrapper,
			_rail,
			_thumb,
			_dragging,
			_thumbPercent = 0, 
			_dragTimeout, 
			_dragInterval,
			_isMobile = utils.isMobile(),
			_touch,
			_visible = true,
			
			// Skin elements
			_sliderCapTop,
			_sliderCapBottom,
			_sliderRail,
			_sliderRailCapTop,
			_sliderRailCapBottom,
			_sliderThumb,
			_sliderThumbCapTop,
			_sliderThumbCapBottom,
			
			_topHeight,
			_bottomHeight,
			_redrawTimeout;


		this.element = function() {
			return _wrapper;
		};

		this.visible = function() {
			return _visible;
		};


		function _setup() {	
			var capTop, capBottom;
			
			_wrapper = _createElement(SLIDER_CLASS, null, parent);
			_wrapper.id = id;
			
			_touch = new utils.touch(_pane);
			
			if (_isMobile) {
				_touch.addEventListener(touchevents.DRAG, _touchDrag);
			} else {
				_wrapper.addEventListener('mousedown', _startDrag, false);
				_wrapper.addEventListener('click', _moveThumb, false);
			}
			
			_populateSkinElements();
			
			_topHeight = _sliderCapTop.height;
			_bottomHeight = _sliderCapBottom.height;
			
			_css(_internalSelector(), { width: _sliderRail.width });
			_css(_internalSelector(SLIDER_RAIL_CLASS), { top: _topHeight, bottom: _bottomHeight });
			_css(_internalSelector(SLIDER_THUMB_CLASS), { top: _topHeight });
			
			capTop = _createElement(SLIDER_TOPCAP_CLASS, _sliderCapTop, _wrapper);
			capBottom = _createElement(SLIDER_BOTTOMCAP_CLASS, _sliderCapBottom, _wrapper);
			_rail = _createElement(SLIDER_RAIL_CLASS, null, _wrapper);
			_thumb = _createElement(SLIDER_THUMB_CLASS, null, _wrapper);
			
			if (!_isMobile) {
				capTop.addEventListener('mousedown', _scroll(-1), false);
				capBottom.addEventListener('mousedown', _scroll(1), false);
			}
			
			_createElement(SLIDER_RAILTOP_CLASS, _sliderRailCapTop, _rail);
			_createElement(SLIDER_RAILBACK_CLASS, _sliderRail, _rail, true);
			_createElement(SLIDER_RAILBOTTOM_CLASS, _sliderRailCapBottom, _rail);
			_css(_internalSelector(SLIDER_RAILBACK_CLASS), {
				top: _sliderRailCapTop.height,
				bottom: _sliderRailCapBottom.height
			});
			
			_createElement(SLIDER_THUMBTOP_CLASS, _sliderThumbCapTop, _thumb);
			_createElement(SLIDER_THUMBBACK_CLASS, _sliderThumb, _thumb, true);
			_createElement(SLIDER_THUMBBOTTOM_CLASS, _sliderThumbCapBottom, _thumb);
			
			_css(_internalSelector(SLIDER_THUMBBACK_CLASS), {
				top: _sliderThumbCapTop.height,
				bottom: _sliderThumbCapBottom.height
			});
			
			_redraw();
			
			if (_pane) {
				if (!_isMobile) {
					_pane.addEventListener("mousewheel", _scrollHandler, false);
					_pane.addEventListener("DOMMouseScroll", _scrollHandler, false);
				}
			}
		}
		
		function _internalSelector(className) {
			return '#' + _wrapper.id + (className ? " ." + className : "");
		}
		
		function _createElement(className, skinElement, parent, stretch) {
			var elem = DOCUMENT.createElement("div");
			if (className) {
				elem.className = className;
				if (skinElement) {
					_css(_internalSelector(className), { 
						'background-image': skinElement.src ? skinElement.src : UNDEFINED, 
						'background-repeat': stretch ? "repeat-y" : "no-repeat",
						height: stretch ? UNDEFINED : skinElement.height
					});
				}
			}
			if (parent) parent.appendChild(elem);
			return elem;
		}
		
		function _populateSkinElements() {
			_sliderCapTop = _getElement('sliderCapTop');
			_sliderCapBottom = _getElement('sliderCapBottom');
			_sliderRail = _getElement('sliderRail');
			_sliderRailCapTop = _getElement('sliderRailCapTop');
			_sliderRailCapBottom = _getElement('sliderRailCapBottom');
			_sliderThumb = _getElement('sliderThumb');
			_sliderThumbCapTop = _getElement('sliderThumbCapTop');
			_sliderThumbCapBottom = _getElement('sliderThumbCapBottom');
		}
		
		function _getElement(name) {
			var elem = _skin.getSkinElement("playlist", name);
			return elem ? elem : { width: 0, height: 0, src: UNDEFINED };
		}
		
		var _redraw = this.redraw = function() {
			clearTimeout(_redrawTimeout);
			_redrawTimeout = setTimeout(function() {
				if (_pane && _pane.clientHeight) {
					_setThumbPercent(_pane.parentNode.clientHeight / _pane.clientHeight);
				} else {
					_redrawTimeout = setTimeout(_redraw, 10);
				}
			}, 0);
		}
		

		function _scrollHandler(evt) {
			if (!_visible) return;
			evt = evt ? evt : WINDOW.event;
			var wheelData = evt.detail ? evt.detail * -1 : evt.wheelDelta / 40;
			_setThumbPosition(_thumbPercent - wheelData / 10);
			  
			// Cancel event so the page doesn't scroll
			if(evt.stopPropagation) evt.stopPropagation();
			if(evt.preventDefault) evt.preventDefault();
			evt.cancelBubble = true;
			evt.cancel = true;
			evt.returnValue = false;
			return false;
		};
	
		function _setThumbPercent(pct) {
			if (pct < 0) pct = 0;
			if (pct > 1) {
				_visible = false;
			} else {
				_visible = true;
				_css(_internalSelector(SLIDER_THUMB_CLASS), { height: Math.max(_rail.clientHeight * pct , _sliderThumbCapTop.height + _sliderThumbCapBottom.height) });
			}
			_css(_internalSelector(), { visibility: _visible ? "visible" : JW_CSS_HIDDEN });
			if (_pane) {
				_pane.style.width = _visible ? _pane.parentElement.clientWidth - _sliderRail.width + "px" : "";
			}
		}

		var _setThumbPosition = this.thumbPosition = function(pct) {
			if (isNaN(pct)) pct = 0;
			_thumbPercent = Math.max(0, Math.min(1, pct));
			_css(_internalSelector(SLIDER_THUMB_CLASS), {
				top: _topHeight + (_rail.clientHeight - _thumb.clientHeight) * _thumbPercent
			});
			if (pane) {
				pane.style.top = Math.min(0, _wrapper.clientHeight - pane.scrollHeight) * _thumbPercent + "px";
			}
		}


		function _startDrag(evt) {
			if (evt.button == 0) _dragging = true;
			DOCUMENT.onselectstart = function() { return false; }; 
			WINDOW.addEventListener('mousemove', _moveThumb, false);
			WINDOW.addEventListener('mouseup', _endDrag, false);
		}
		
		function _touchDrag(evt) {
			_setThumbPosition(_thumbPercent - (evt.deltaY * 2 / _pane.clientHeight));
		}
		
		function _moveThumb(evt) {
			if (_dragging || evt.type == "click") {
				var railRect = utils.bounds(_rail),
					rangeTop = _thumb.clientHeight / 2,
					rangeBottom = railRect.height - rangeTop,
					y = evt.pageY - railRect.top,
					pct = (y - rangeTop) / (rangeBottom - rangeTop);
				_setThumbPosition(pct);
			}
		}
		
		function _scroll(dir) {
			return function(evt) {
				if (evt.button > 0) return;
				_setThumbPosition(_thumbPercent+(dir*.05));
				_dragTimeout = setTimeout(function() {
					_dragInterval = setInterval(function() {
						_setThumbPosition(_thumbPercent+(dir*.05));
					}, 50);
				}, 500);
			}
		}
		
		function _endDrag() {
			_dragging = false;
			WINDOW.removeEventListener('mousemove', _moveThumb);
			WINDOW.removeEventListener('mouseup', _endDrag);
			DOCUMENT.onselectstart = UNDEFINED; 
			clearTimeout(_dragTimeout);
			clearInterval(_dragInterval);
		}
		
		_setup();
		return this;
	};
	
	function _globalSelector() {
		var selector=[],i;
		for (i=0; i<arguments.length; i++) {
			selector.push(".jwplaylist ."+arguments[i]);
		}
		return selector.join(',');
	}
	
	/** Global slider styles **/

	_css(_globalSelector(SLIDER_CLASS), {
		position: JW_CSS_ABSOLUTE,
		height: JW_CSS_100PCT,
		visibility: JW_CSS_HIDDEN,
		right: 0,
		top: 0,
		cursor: "pointer",
		'z-index': 1,
		overflow: JW_CSS_HIDDEN
	});
	
	_css(_globalSelector(SLIDER_CLASS) + ' *', {
		position: JW_CSS_ABSOLUTE,
	    width: JW_CSS_100PCT,
	    'background-position': "center",
	    'background-size': JW_CSS_100PCT + " " + JW_CSS_100PCT,
		overflow: JW_CSS_HIDDEN
	});

	_css(_globalSelector(SLIDER_TOPCAP_CLASS, SLIDER_RAILTOP_CLASS, SLIDER_THUMBTOP_CLASS), { top: 0 });
	_css(_globalSelector(SLIDER_BOTTOMCAP_CLASS, SLIDER_RAILBOTTOM_CLASS, SLIDER_THUMBBOTTOM_CLASS), { bottom: 0 });

})(jwplayer.html5);
/**
 * JW Player html5 right-click
 *
 * @author pablo
 * @version 6.0
 */
(function(html5) {
	var utils = jwplayer.utils,
		_css = utils.css,

		ABOUT_DEFAULT = "MyDMAM JW Player...",
		LINK_DEFAULT = "http://mydmam.org/developments/jwplayer-licence/",

		DOCUMENT = document,
		RC_CLASS = ".jwclick",
		RC_ITEM_CLASS = RC_CLASS + "_item",

		/** Some CSS constants we should use for minimization **/
		JW_CSS_100PCT = "100%",
		JW_CSS_NONE = "none",
		JW_CSS_BOX_SHADOW = "5px 5px 7px rgba(0,0,0,.10), 0px 1px 0px rgba(255,255,255,.3) inset",
		JW_CSS_WHITE = "#FFF";
	
	html5.rightclick = function(api, config) {
		var _api = api,
			_container,// = DOCUMENT.getElementById(_api.id),
			_config = utils.extend({
				aboutlink: LINK_DEFAULT,
				abouttext: ABOUT_DEFAULT
			}, config),
			_mouseOverContext = false,
			_menu,
			_about;
			
		function _init() {
			_container = DOCUMENT.getElementById(_api.id);
			_menu = _createElement(RC_CLASS);
			_menu.id = _api.id + "_menu";
			_menu.style.display = JW_CSS_NONE;
	        _container.oncontextmenu = _showContext;
	        _menu.onmouseover = function() { _mouseOverContext = true; };
	        _menu.onmouseout = function() { _mouseOverContext = false; };
	        DOCUMENT.addEventListener("mousedown", _hideContext, false);
	        _about = _createElement(RC_ITEM_CLASS);
	        _about.innerHTML = _config.abouttext;
	        _about.onclick = _clickHandler;
	        _menu.appendChild(_about);
	        _container.appendChild(_menu);
		}
		
		function _createElement(className) {
			var elem = DOCUMENT.createElement("div");
			elem.className = className.replace(".", "");
			return elem;
		}
		
		function _clickHandler() {
			window.top.location = _config.aboutlink;
		}
		
	    function _showContext(evt) {
	        if (_mouseOverContext) {
	            // returning because _mouseOverContext is true, indicating the mouse is over the menu
	            return;
	        }

	        // IE doesn't pass the event object
	        if (evt == null) evt = window.event;

	        // we assume we have a standards compliant browser, but check if we have IE
	        // Also, document.body.scrollTop does not work in IE
	        var target = evt.target != null ? evt.target : evt.srcElement,
	        	containerBounds = utils.bounds(_container),
	        	bounds = utils.bounds(target);
	        
	    	// hide the menu first to avoid an "up-then-over" visual effect
	        _menu.style.display = JW_CSS_NONE;
	        _menu.style.left = (evt.offsetX ? evt.offsetX : evt.layerX) + bounds.left - containerBounds.left + 'px';
	        _menu.style.top = (evt.offsetY ? evt.offsetY : evt.layerY) + bounds.top - containerBounds.top + 'px';
	        _menu.style.display = 'block';
	        evt.preventDefault();
	    }

	    function _hideContext() {
	        if (_mouseOverContext) {
	            // returning because _mouseOverContext is true, indicating the mouse is over the menu
	            return;
	        }
	        else {
	            _menu.style.display = JW_CSS_NONE;
	        }
	    }

		this.element = function() {
			return _menu;
		}

		this.destroy = function() {
			DOCUMENT.removeEventListener("mousedown", _hideContext, false);
		}
		
		_init();
	};
	
	_css(RC_CLASS, {
		'background-color': JW_CSS_WHITE,
		'-webkit-border-radius': 5,
		'-moz-border-radius': 5,
		'border-radius': 5,
		height: "auto",
		border: "1px solid #bcbcbc",
		'font-family': '"MS Sans Serif", "Geneva", sans-serif',
		'font-size': 10,
		width: 320,
		'-webkit-box-shadow': JW_CSS_BOX_SHADOW,
		'-moz-box-shadow': JW_CSS_BOX_SHADOW,
		'box-shadow': JW_CSS_BOX_SHADOW,
		position: "absolute",
		'z-index': 999
	}, true);

	_css(RC_CLASS + " div", {
		padding: "8px 21px",
		margin: '0px',
		'background-color': JW_CSS_WHITE,
		border: "none",
		'font-family': '"MS Sans Serif", "Geneva", sans-serif',
		'font-size': 10,
		color: 'inherit'
	}, true);
	
	_css(RC_ITEM_CLASS, {
		padding: "8px 21px",
		'text-align': 'left',
		cursor: "pointer"
	}, true);

	_css(RC_ITEM_CLASS + ":hover", {
		"background-color": "#595959",
		color: JW_CSS_WHITE
	}, true);

	_css(RC_ITEM_CLASS + " a", {
		'text-decoration': JW_CSS_NONE,
		color: "#000"
	}, true);
	
	_css(RC_CLASS + " hr", {
		width: JW_CSS_100PCT,
		padding: 0,
		margin: 0,
		border: "1px #e9e9e9 solid"
	}, true);

})(jwplayer.html5);/**
 * This class is responsible for setting up the player and triggering the PLAYER_READY event, or an JWPLAYER_ERROR event
 * 
 * The order of the player setup is as follows:
 * 
 * 1. parse config
 * 2. load skin (async)
 * 3. load external playlist (async)
 * 4. load preview image (requires 3)
 * 5. initialize components (requires 2)
 * 6. initialize plugins (requires 5)
 * 7. ready
 *
 * @author pablo
 * @version 6.0
 */
(function(html5) {
	var _jw = jwplayer, utils = _jw.utils, events = _jw.events, playlist = _jw.playlist,
	
		PARSE_CONFIG = 1,
		LOAD_SKIN = 2,
		LOAD_PLAYLIST = 3,
		LOAD_PREVIEW = 4,
		SETUP_COMPONENTS = 5,
		INIT_PLUGINS = 6,
		SEND_READY = 7;

	html5.setup = function(model, view, controller) {
		var _model = model, 
			_view = view,
			_controller = controller,
			_completed = {},
			_depends = {},
			_skin,
			_eventDispatcher = new events.eventdispatcher(),
			_errorState = false,
			_queue = [];
			
		function _initQueue() {
			_addTask(PARSE_CONFIG, _parseConfig);
			_addTask(LOAD_SKIN, _loadSkin, PARSE_CONFIG);
			_addTask(LOAD_PLAYLIST, _loadPlaylist, PARSE_CONFIG);
			_addTask(LOAD_PREVIEW, _loadPreview, LOAD_PLAYLIST);
			_addTask(SETUP_COMPONENTS, _setupComponents, LOAD_PREVIEW + "," + LOAD_SKIN);
			_addTask(INIT_PLUGINS, _initPlugins, SETUP_COMPONENTS + "," + LOAD_PLAYLIST);
			_addTask(SEND_READY, _sendReady, INIT_PLUGINS);
		}
		
		function _addTask(name, method, depends) {
			_queue.push({name:name, method:method, depends:depends});
		}

		function _nextTask() {
			for (var i=0; i < _queue.length; i++) {
				var task = _queue[i];
				if (_allComplete(task.depends)) {
					_queue.splice(i, 1);
					try {
						task.method();
						_nextTask();
					} catch(error) {
						_error(error.message);
					}
					return;
				}
			}
			if (_queue.length > 0 && !_errorState) {
				// Still waiting for a dependency to come through; wait a little while.
				setTimeout(_nextTask, 500);
			}
		}
		
		function _allComplete(dependencies) {
			if (!dependencies) return true;
			var split = dependencies.toString().split(",");
			for (var i=0; i<split.length; i++) {
				if (!_completed[split[i]])
					return false;
			}
			return true;
		}

		function _taskComplete(name) {
			_completed[name] = true;
		}
		
		function _parseConfig() {
			if (model.edition && model.edition() == "invalid") {
				_error("Error setting up player: Invalid license key");
			}
			else {
				_taskComplete(PARSE_CONFIG);
			}
		}
		
		function _loadSkin() {
			_skin = new html5.skin();
			_skin.load(_model.config.skin, _skinLoaded, _skinError);
		}
		
		function _skinLoaded(skin) {
			_taskComplete(LOAD_SKIN);
		}

		function _skinError(message) {
			_error("Error loading skin: " + message);
		}

		function _loadPlaylist() {
			switch(utils.typeOf(_model.config.playlist)) {
			case "string":
//				var loader = new html5.playlistloader();
//				loader.addEventListener(events.JWPLAYER_PLAYLIST_LOADED, _playlistLoaded);
//				loader.addEventListener(events.JWPLAYER_ERROR, _playlistError);
//				loader.load(_model.config.playlist);
//				break;
				_error("Can't load a playlist as a string anymore");
			case "array":
				_completePlaylist(new playlist(_model.config.playlist));
			}
		}
		
		function _playlistLoaded(evt) {
			_completePlaylist(evt.playlist);
		}
		
		function _completePlaylist(playlist) {
			_model.setPlaylist(playlist);
			if (_model.playlist[0].sources.length == 0) {
				_error("Error loading playlist: No playable sources found");
			} else {
				_taskComplete(LOAD_PLAYLIST);
			}
		}

		function _playlistError(evt) {
			_error("Error loading playlist: " + evt.message);
		}
		
		function _loadPreview() {
			var preview = _model.playlist[_model.item].image; 
			if (preview) {
				var img = new Image();
				img.addEventListener('load', _previewLoaded, false);
				// If there was an error, continue anyway
				img.addEventListener('error', _previewLoaded, false);
				img.src = preview;
				setTimeout(_previewLoaded, 500);
			} else {
				_taskComplete(LOAD_PREVIEW);	
			}
		}
		
		function _previewLoaded() {
			_taskComplete(LOAD_PREVIEW);
		}

		function _setupComponents() {
			_view.setup(_skin);
			_taskComplete(SETUP_COMPONENTS);
		}
		
		function _initPlugins() {
			_taskComplete(INIT_PLUGINS);
		}

		function _sendReady() {
			_eventDispatcher.sendEvent(events.JWPLAYER_READY);
			_taskComplete(SEND_READY);
		}
		
		function _error(message) {
			_errorState = true;
			_eventDispatcher.sendEvent(events.JWPLAYER_ERROR, {message: message});
			_view.setupError(message);
		}
		
		utils.extend(this, _eventDispatcher);
		
		this.start = _nextTask;
		
		_initQueue();
	}

})(jwplayer.html5);

/**
 * JW Player component that loads PNG skins.
 *
 * @author zach
 * @version 5.4
 */
(function(html5) {
	html5.skin = function() {
		var _components = {};
		var _loaded = false;
		
		this.load = function(path, completeCallback, errorCallback) {
			new html5.skinloader(path, function(skin) {
				_loaded = true;
				_components = skin;
				if (typeof completeCallback == "function") completeCallback();
			}, function(message) {
				if (typeof errorCallback == "function") errorCallback(message);
			});
			
		};
		
		this.getSkinElement = function(component, element) {
			component = _lowerCase(component);
			element = _lowerCase(element);
			if (_loaded) {
				try {
					return _components[component].elements[element];
				} catch (err) {
					jwplayer.utils.log("No such skin component / element: ", [component, element]);
				}
			}
			return null;
		};
		
		this.getComponentSettings = function(component) {
			component = _lowerCase(component);
			if (_loaded && _components && _components[component]) {
				return _components[component].settings;
			}
			return null;
		};
		
		this.getComponentLayout = function(component) {
			component = _lowerCase(component);
			if (_loaded) {
				var lo = _components[component].layout;
				if (lo && (lo.left || lo.right || lo.center))
					return _components[component].layout;
			}
			return null;
		};
		
		function _lowerCase(string) {
			return string.toLowerCase();
		}
		
	};
})(jwplayer.html5);
/**
 * JW Player component that loads PNG skins.
 *
 * @author zach
 * @modified pablo
 * @version 6.0
 */
(function(html5) {
	var utils = jwplayer.utils,
		_foreach = utils.foreach,
		FORMAT_ERROR = "Skin formatting error";
	
	/** Constructor **/
	html5.skinloader = function(skinPath, completeHandler, errorHandler) {
		var _skin = {},
			_completeHandler = completeHandler,
			_errorHandler = errorHandler,
			_loading = true,
			_completeInterval,
			_skinPath = skinPath,
			_error = false,
			_defaultSkin,
			// Keeping this as 1 for now. Will change if necessary for mobile
			_mobileMultiplier = jwplayer.utils.isMobile() ? 1 : 1,
			_ratio = 1;
		
		/** Load the skin **/
		function _load() {
			if (typeof _skinPath != "string" || _skinPath === "") {
				_loadSkin(html5.defaultskin().xml);
			} else {
				if (utils.extension(_skinPath) != "xml") {
					_errorHandler("Skin not a valid file type");
					return;
				}
				// Load the default skin first; if any components are defined in the loaded skin, they will overwrite the default
				var defaultLoader = new html5.skinloader("", _defaultLoaded, _errorHandler);
			}
			
		}
		
		
		function _defaultLoaded(defaultSkin) {
			_skin = defaultSkin;
			utils.ajax(utils.getAbsolutePath(_skinPath), function(xmlrequest) {
				try {
					if (utils.exists(xmlrequest.responseXML)){
						_loadSkin(xmlrequest.responseXML);
						return;	
					}
				} catch (err){
					//_clearSkin();
					_errorHandler(FORMAT_ERROR);
				}
			}, function(message) {
				_errorHandler(message);
			});
		}
		
		function _getElementsByTagName(xml, tagName) {
			return xml ? xml.getElementsByTagName(tagName) : null;
		}
		
		function _loadSkin(xml) {
			var skinNode = _getElementsByTagName(xml, 'skin')[0],
				components = _getElementsByTagName(skinNode, 'component'),
				target = skinNode.getAttribute("target"),
				ratio = parseFloat(skinNode.getAttribute("pixelratio"));

			// Make sure ratio is set; don't want any divides by zero
			if (ratio > 0) _ratio = ratio; 

			if (!target || parseFloat(target) > parseFloat(jwplayer.version)) {
				_errorHandler("Incompatible player version")
			}

			if (components.length === 0) {
				// This is legal according to the skin doc - don't produce an error.
				// _errorHandler(FORMAT_ERROR);
				_completeHandler(_skin);
				return;
			}
			for (var componentIndex = 0; componentIndex < components.length; componentIndex++) {
				var componentName = _lowerCase(components[componentIndex].getAttribute("name")),
					component = {
						settings: {},
						elements: {},
						layout: {}
					},
					elements = _getElementsByTagName(_getElementsByTagName(components[componentIndex], 'elements')[0], 'element');
					
				_skin[componentName] = component;

				for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
					_loadImage(elements[elementIndex], componentName);
				}
				var settingsElement = _getElementsByTagName(components[componentIndex], 'settings')[0];
				if (settingsElement && settingsElement.childNodes.length > 0) {
					var settings = _getElementsByTagName(settingsElement, 'setting');
					for (var settingIndex = 0; settingIndex < settings.length; settingIndex++) {
						var name = settings[settingIndex].getAttribute("name");
						var value = settings[settingIndex].getAttribute("value");
						if(/color$/.test(name)) { value = utils.stringToColor(value); }
						component.settings[_lowerCase(name)] = value;
					}
				}
				var layout = _getElementsByTagName(components[componentIndex], 'layout')[0];
				if (layout && layout.childNodes.length > 0) {
					var groups = _getElementsByTagName(layout, 'group');
					for (var groupIndex = 0; groupIndex < groups.length; groupIndex++) {
						var group = groups[groupIndex],
							_layout = {
								elements: []
							};
						component.layout[_lowerCase(group.getAttribute("position"))] = _layout;
						for (var attributeIndex = 0; attributeIndex < group.attributes.length; attributeIndex++) {
							var attribute = group.attributes[attributeIndex];
							_layout[attribute.name] = attribute.value;
						}
						var groupElements = _getElementsByTagName(group, '*');
						for (var groupElementIndex = 0; groupElementIndex < groupElements.length; groupElementIndex++) {
							var element = groupElements[groupElementIndex];
							_layout.elements.push({
								type: element.tagName
							});
							for (var elementAttributeIndex = 0; elementAttributeIndex < element.attributes.length; elementAttributeIndex++) {
								var elementAttribute = element.attributes[elementAttributeIndex];
								_layout.elements[groupElementIndex][_lowerCase(elementAttribute.name)] = elementAttribute.value;
							}
							if (!utils.exists(_layout.elements[groupElementIndex].name)) {
								_layout.elements[groupElementIndex].name = element.tagName;
							}
						}
					}
				}
				
				_loading = false;
				
				_resetCompleteIntervalTest();
			}
		}
		
		
		function _resetCompleteIntervalTest() {
			clearInterval(_completeInterval);
			if (!_error) {
				_completeInterval = setInterval(function() {
					_checkComplete();
				}, 100);
			}
		}
		
		
		/** Load the data for a single element. **/
		function _loadImage(element, component) {
			component = _lowerCase(component);
			var img = new Image(),
				elementName = _lowerCase(element.getAttribute("name")),
				elementSource = element.getAttribute("src"),
				imgUrl;
			
			if (elementSource.indexOf('data:image/png;base64,') === 0) {
				imgUrl = elementSource;
			} else {
				var skinUrl = utils.getAbsolutePath(_skinPath);
				var skinRoot = skinUrl.substr(0, skinUrl.lastIndexOf('/'));
				imgUrl = [skinRoot, component, elementSource].join('/');
			}
			
			_skin[component].elements[elementName] = {
				height: 0,
				width: 0,
				src: '',
				ready: false,
				image: img
			};
			
			img.onload = function(evt) {
				_completeImageLoad(img, elementName, component);
			};
			img.onerror = function(evt) {
				_error = true;
				_resetCompleteIntervalTest();
				_errorHandler("Skin image not found: " + this.src);
			};
			
			img.src = imgUrl;
		}
		
		function _clearSkin() {
			_foreach(_skin, function(componentName, component) {
				_foreach(component.elements, function(elementName, element) {
					var img = element.image;
					img.onload = null;
					img.onerror = null;
					delete element.image;
					delete component.elements[elementName];
				});
				delete _skin[componentName];
			});
		}
		
		function _checkComplete() {
			var ready = true;
			_foreach(_skin, function(componentName, component) {
				if (componentName != 'properties') {
					_foreach(component.elements, function(element, _) {
						if (!_getElement(componentName, element).ready) {
							ready = false;
						}
					});
				}
			});
			
			if (!ready) return;
			
			if (_loading == false) {
				clearInterval(_completeInterval);
				_completeHandler(_skin);
			}
		}
		
		function _completeImageLoad(img, element, component) {
			var elementObj = _getElement(component, element);
			if(elementObj) {
				elementObj.height = Math.round((img.height / _ratio) * _mobileMultiplier);
				elementObj.width = Math.round((img.width / _ratio) * _mobileMultiplier);
				elementObj.src = img.src;
				elementObj.ready = true;
				_resetCompleteIntervalTest();
			} else {
				utils.log("Loaded an image for a missing element: " + component + "." + element);
			}
		}
		

		function _getElement(component, element) {
			return _skin[_lowerCase(component)] ? _skin[_lowerCase(component)].elements[_lowerCase(element)] : null;
		}
		
		function _lowerCase(string) {
			return string ? string.toLowerCase() : '';
		}
		_load();
	};
})(jwplayer.html5);
(function(jwplayer) {

	var html5 = jwplayer.html5,
		utils = jwplayer.utils,
		events = jwplayer.events,
		_css = utils.css;
		

	/** Displays thumbnails over the controlbar **/
	html5.thumbs = function(id) {
		var _display,
			_cues,
			_vttPath,
			_vttRequest,
			_id = id,
			_url,
			_images = {},
			_image,
			_eventDispatcher = new events.eventdispatcher();

		utils.extend(this, _eventDispatcher);

		_display = document.createElement("div");
		_display.id = _id;

		function _loadVTT(vtt) {
			_css.style(_display, {
				display: 'none'
			});

			if (_vttRequest) {
				_vttRequest.onload = null;
				_vttRequest.onreadystatechange = null;
				_vttRequest.onerror = null;
				if (_vttRequest.abort) _vttRequest.abort();
				_vttRequest = null;
			}
			if (_image) {
				_image.onload = null;
			}

			if (vtt) {
				_vttPath = vtt.split("?")[0].split("/").slice(0, -1).join("/");
				_vttRequest = utils.ajax(vtt, _vttLoaded, _vttFailed, true);
			} else {
				_cues =
				_url =
				_image = null;
				_images = {};
			}
		}
		
		function _vttLoaded(data) {
			_vttRequest = null;
		    try {
		      data = new jwplayer.parsers.srt().parse(data.responseText, true);
		    } catch (e) {
		        _vttFailed(e.message);
		        return;
		    }
			if (utils.typeOf(data) !== "array") {
				return _vttFailed("Invalid data");
			}
			_cues = data; 
		}
		
		function _vttFailed(error) {
			_vttRequest = null;
			utils.log("Thumbnails could not be loaded: " + error);        
		}
		
		function _loadImage(url, callback) {
			// only load image if it's different from the last one
			if (url && url !== _url) {
				_url = url;
				if (url.indexOf("://") < 0) {
					url = _vttPath ? _vttPath + "/" + url : url;
				}
				var style = {
					display: 'block',
					margin: '0 auto',
					'background-position': '0 0',
					width: 0,
					height: 0
				};
				var hashIndex = url.indexOf("#xywh");
				if (hashIndex > 0) {
					try {
						var matched = (/(.+)\#xywh=(\d+),(\d+),(\d+),(\d+)/).exec(url);
						url = matched[1];
						style['background-position'] = (matched[2] * -1) + 'px ' + (matched[3] * -1) + 'px';
						style.width = matched[4];
						style.height = matched[5];
					} catch(e) {
						_vttFailed("Could not parse thumbnail");
						return;
					}
				}

				var image = _images[url];
				if (!image) {
					image = new Image();
					image.onload = function() {
						_updateSprite(image, style, callback);
					};
					_images[url] = image;
					image.src = url;
				} else {
					_updateSprite(image, style, callback);
				}
				if (_image) {
					// ignore previous image
					_image.onload = null;
				}
				_image = image;
			}
		} 
		
		function _updateSprite(image, style, callback) {
			image.onload = null;
			if (!style.width) {
				style.width = image.width;
				style.height = image.height;
			}
			style['background-image'] = image.src;
			_css.style(_display, style);
			if (callback) {
				callback(style.width);
			}
		}
		
		this.load = function(thumbsVTT) {
			_loadVTT(thumbsVTT);
		};
		
		this.element = function() {
			return _display;
		};
		
		// Update display
		this.updateTimeline = function(seconds, callback) {
			if (!_cues) return;
			var i = 0;
			while(i < _cues.length && seconds > _cues[i].end) {
				i++;
			}
			if (i === _cues.length) i--;
			var url = _cues[i].text;
			_loadImage(url, callback);
			return url;
		};
	};


})(jwplayer);
/**
 * Video tag stuff
 * 
 * @author pablo
 * @version 6.0
 */
(function(jwplayer) {

    var utils = jwplayer.utils, 
        events = jwplayer.events, 
        states = events.state,
        
        TRUE = true,
        FALSE = false;
    
    /** HTML5 video class * */
    jwplayer.html5.video = function(videotag) {
        var _isIE = utils.isIE(),
            _mediaEvents = {
            "abort" : _generalHandler,
            "canplay" : _canPlayHandler,
            "canplaythrough" : _generalHandler,
            "durationchange" : _durationUpdateHandler,
            "emptied" : _generalHandler,
            "ended" : _endedHandler,
            "error" : _errorHandler,
            "loadeddata" : _generalHandler,
            "loadedmetadata" : _canPlayHandler,
            "loadstart" : _generalHandler,
            "pause" : _playHandler,
            "play" : _playHandler,
            "playing" : _playHandler,
            "progress" : _progressHandler,
            "ratechange" : _generalHandler,
            "readystatechange" : _generalHandler,
            "seeked" : _sendSeekEvent,
            "seeking" : _isIE ? _bufferStateHandler : _generalHandler,
            "stalled" : _generalHandler,
            "suspend" : _generalHandler,
            "timeupdate" : _timeUpdateHandler,
            "volumechange" : _volumeHandler,
            "waiting" : _bufferStateHandler
        },

        // Current playlist item
        _item,
        // Currently playing source
        _source,
        // Reference to the video tag
        _videotag,
        // Current duration
        _duration,
        // Current position
        _position,
        // Whether seeking is ready yet
        _canSeek,
        // Whether we have sent out the BUFFER_FULL event
        _bufferFull,
        // If we should seek on canplay
        _delayedSeek,
        // If we're currently dragging the seek bar
        _dragging = FALSE,
        // Current media state
        _state = states.IDLE,
        // Save the volume state before muting
        _lastVolume,
        // Using setInterval to check buffered ranges
        _bufferInterval = -1,
        // Last sent buffer amount
        _bufferPercent = -1,
        // Event dispatcher
        _eventDispatcher = new events.eventdispatcher(),
        // Whether or not we're listening to video tag events
        _attached = FALSE,
        // Quality levels
        _levels,
        // Current quality level index
        _currentQuality = -1,
        // Whether or not we're on an Android device
        _isAndroid = utils.isAndroid(FALSE, TRUE),
        // Whether or not we're on an iOS 7 device
        _isIOS7 = utils.isIOS(7),
        // Reference to self
        _this = this,
        
        //tracks for ios
        _tracks = [],
        
        _usedTrack = 0,
        //selected track
        
        _tracksOnce = false,
        
        //make sure we only do complete once
        _completeOnce = FALSE,
        
        _beforecompleted = FALSE;
        
        utils.extend(_this, _eventDispatcher);

        // Constructor
        function _init(videotag) {
            if (!videotag) videotag = document.createElement("video");

            _videotag = videotag;
            _setupListeners();

            // Workaround for a Safari bug where video disappears on switch to fullscreen
            if (!_isIOS7)   {
                _videotag.controls = TRUE;
                _videotag.controls = FALSE;
            }
            
            // Enable AirPlay
            _videotag.setAttribute("x-webkit-airplay", "allow");
            
            _attached = TRUE;
        }

        function _setupListeners() {
            utils.foreach(_mediaEvents, function(evt, evtCallback) {
                _videotag.addEventListener(evt, evtCallback, FALSE);
            });
        }

        function _sendEvent(type, data) {
            if (_attached) {
                _eventDispatcher.sendEvent(type, data);
            }
        }

        
        function _generalHandler(evt) {
            //if (evt) utils.log("%s %o (%s,%s)", evt.type, evt);
        }

        function _durationUpdateHandler(evt) {
            _generalHandler(evt);
            if (!_attached) return;
            var newDuration = _round(_videotag.duration);
            if (_duration != newDuration) {
                _duration = newDuration;
            }
            if (_isAndroid && _delayedSeek > 0 && newDuration > _delayedSeek) {
                _seek(_delayedSeek);
            }
            _timeUpdateHandler();
        }

        function _timeUpdateHandler(evt) {
            _generalHandler(evt);
            _progressHandler(evt);
            if (!_attached) return;
            if (_state == states.PLAYING && !_dragging) {
                _position = _round(_videotag.currentTime);
                _sendEvent(events.JWPLAYER_MEDIA_TIME, {
                    position : _position,
                    duration : _duration
                });
                // Working around a Galaxy Tab bug; otherwise _duration should be > 0
//              if (_position >= _duration && _duration > 3 && !utils.isAndroid(2.3)) {
//                  _complete();
//              }
            }
        }

        function _round(number) {
            return Number(number.toFixed(1));
        }

        function _canPlayHandler(evt) {
            _generalHandler(evt);
            if (!_attached) return;
            if (!_canSeek) {
                _canSeek = TRUE;
                _sendBufferFull();
            }
            if (evt.type == "loadedmetadata") {
                //fixes Chrome bug where it doesn't like being muted before video is loaded
                if (_videotag.muted) {
                    _videotag.muted = FALSE;
                    _videotag.muted = TRUE;
                }
                _sendEvent(events.JWPLAYER_MEDIA_META,{duration:_videotag.duration,height:_videotag.videoHeight,width:_videotag.videoWidth});
            }
        }
        
        
        
        function _progressHandler(evt) {
            _generalHandler(evt);
            if (_canSeek && _delayedSeek > 0 && !_isAndroid) {
                // Need to set a brief timeout before executing delayed seek; IE9 stalls otherwise.
                if (_isIE) setTimeout(function() { if (_delayedSeek > 0) _seek(_delayedSeek);}, 200);
                // Otherwise call it immediately
                else _seek(_delayedSeek);
            }
        }
        
        function _sendBufferFull() {
            if (!_bufferFull) {
                _bufferFull = TRUE;
                _sendEvent(events.JWPLAYER_MEDIA_BUFFER_FULL);
            }
        }

        function _playHandler(evt) {
            _generalHandler(evt);
            if (!_attached || _dragging) return;

            if (_videotag.paused) {
                if (_videotag.currentTime == _videotag.duration && _videotag.duration > 3) {
                    // Needed as of Chrome 20
                    //_complete();
                } else {
                    _pause();
                }
            } else {
                if (utils.isFF() && evt.type=="play" && _state == states.BUFFERING)
                    // In FF, we get an extra "play" event on startup - we need to wait for "playing",
                    // which is also handled by this function
                    return;
                else
                    _setState(states.PLAYING);
            }
        }

        function _bufferStateHandler(evt) {
            _generalHandler(evt);
            if (!_attached) return;
            if (!_dragging) _setState(states.BUFFERING);
        }

        function _errorHandler(evt) {
            if (!_attached) return;
            utils.log("Error playing media: %o", _videotag.error);
            _eventDispatcher.sendEvent(events.JWPLAYER_MEDIA_ERROR, {
                message: "Error loading media: File could not be played"
            });
            _setState(states.IDLE);
        }

        function _getPublicLevels(levels) {
            var publicLevels;
            if (utils.typeOf(levels)=="array" && levels.length > 0) {
                publicLevels = [];
                for (var i=0; i<levels.length; i++) {
                    var level = levels[i], publicLevel = {};
                    publicLevel.label = _levelLabel(level) ? _levelLabel(level) : i;
                    publicLevels[i] = publicLevel;
                }
            }
            return publicLevels;
        }
        
        function _sendLevels(levels) {
            var publicLevels = _getPublicLevels(levels);
            if (publicLevels) {
                _eventDispatcher.sendEvent(events.JWPLAYER_MEDIA_LEVELS, { levels: publicLevels, currentQuality: _currentQuality });
            }
        }
        
        function _levelLabel(level) {
            if (level.label) return level.label;
            else return 0;
        }
        
        _this.load = function(item) {
            if (!_attached) return;
            _completeOnce = FALSE;
            _item = item;
            _delayedSeek = 0;
            _duration = item.duration ? item.duration : -1;
            _position = 0;
            
            _levels = _item.sources;
            _pickInitialQuality();
            _sendLevels(_levels);
            
            _completeLoad();
        };
        
        function _pickInitialQuality() {
            if (_currentQuality < 0) _currentQuality = 0;
            
            for (var i=0; i<_levels.length; i++) {
                if (_levels[i]["default"]) {
                    _currentQuality = i;
                    break;
                }
            }

            var cookies = utils.getCookies(),
                label = cookies["qualityLabel"];

            if (label) {
                for (i=0; i<_levels.length; i++) {
                    if (_levels[i]["label"] == label) {
                        _currentQuality = i;
                        break;
                    }
                } 
            }
        }
        
        function _completeLoad() {
            _canSeek = FALSE;
            _bufferFull = FALSE;
            _source = _levels[_currentQuality];
            
            _setState(states.BUFFERING); 
            _videotag.src = _source.file;
            _videotag.load();
            
            _bufferInterval = setInterval(_sendBufferUpdate, 100);

            if (utils.isMobile()) {
                _sendBufferFull();
            }
        }

        _this.stop = function() {
            if (!_attached) return;
            _videotag.removeAttribute("src");
            if (!_isIE) _videotag.load();
            _currentQuality = -1;
            clearInterval(_bufferInterval);
            _setState(states.IDLE);
        };

        _this.play = function() {
            if (_attached && !_dragging) {
                _videotag.play();
            }
        };

        var _pause = _this.pause = function() {
            if (_attached) {
                _videotag.pause();
                _setState(states.PAUSED);
            }
        };
            
        _this.seekDrag = function(state) {
            if (!_attached) return; 
            _dragging = state;
            if (state) _videotag.pause();
            else _videotag.play();
        };
        
        var _seek = _this.seek = function(seekPos) {
            if (!_attached) return; 

            if (!_dragging && _delayedSeek == 0) {
                _sendEvent(events.JWPLAYER_MEDIA_SEEK, {
                    position: _position,
                    offset: seekPos
                });
            }

            if (_canSeek) {
                _delayedSeek = 0;
                _videotag.currentTime = seekPos;
            } else {
                _delayedSeek = seekPos;
            }
            
        };
        
        function _sendSeekEvent(evt) {
            _generalHandler(evt);
            if (!_dragging && _state != states.PAUSED) {
                _setState(states.PLAYING);
            }
        }

        var _volume = _this.volume = function(vol) {
            if (utils.exists(vol)) {
                _videotag.volume = Math.min(Math.max(0, vol / 100), 1);
                _lastVolume = _videotag.volume * 100;
            }
        };
        
        function _volumeHandler(evt) {
            _sendEvent(events.JWPLAYER_MEDIA_VOLUME, {
                volume: Math.round(_videotag.volume * 100)
            });
            _sendEvent(events.JWPLAYER_MEDIA_MUTE, {
                mute: _videotag.muted
            });
        }
        
        _this.mute = function(state) {
            if (!utils.exists(state)) state = !_videotag.muted;
            if (state) {
                _lastVolume = _videotag.volume * 100;
                _videotag.muted = TRUE;
            } else {
                _volume(_lastVolume);
                _videotag.muted = FALSE;
            }
        };

        /** Set the current player state * */
        function _setState(newstate) {
            // Handles a FF 3.5 issue
            if (newstate == states.PAUSED && _state == states.IDLE) {
                return;
            }
            
            // Ignore state changes while dragging the seekbar
            if (_dragging) return;

            if (_state != newstate) {
                var oldstate = _state;
                _state = newstate;
                _sendEvent(events.JWPLAYER_PLAYER_STATE, {
                    oldstate : oldstate,
                    newstate : newstate
                });
            }
        }
        
        function _sendBufferUpdate() {
            if (!_attached) return; 
            var newBuffer = _getBuffer();
            if (newBuffer != _bufferPercent) {
                _bufferPercent = newBuffer;
                _sendEvent(events.JWPLAYER_MEDIA_BUFFER, {
                    bufferPercent: Math.round(_bufferPercent * 100)
                });
            }
            if (newBuffer >= 1) {
                clearInterval(_bufferInterval);
            }
        }
        
        function _getBuffer() {
            if (_videotag.buffered.length == 0 || _videotag.duration == 0)
                return 0;
            else
                return _videotag.buffered.end(_videotag.buffered.length-1) / _videotag.duration;
        }
        
        function _endedHandler(evt) {
            _generalHandler(evt);
            if (_attached) _complete();
        }
        
        function _complete() {
            //if (_completeOnce) return;
            _completeOnce = TRUE;
            if (_state != states.IDLE) {
                _currentQuality = -1;
                _beforecompleted = TRUE;
                _sendEvent(events.JWPLAYER_MEDIA_BEFORECOMPLETE);


                if (_attached) {
                    _setState(states.IDLE);
                    _beforecompleted = FALSE;
                    _sendEvent(events.JWPLAYER_MEDIA_COMPLETE);
                }
            }
        }
        
        this.addCaptions = function(tracks,fullscreen,curr) {
            if (utils.isIOS() && _videotag.addTextTrack && !_tracksOnce) {
                if (curr > 0)
                    curr = tracks[curr-1].label;
                utils.foreach(tracks, function(index,elem) {
                    if (elem.data) {
                      _usedTrack = index;
                        var track = _videotag.addTextTrack(elem.kind,elem.label);//findTrack(elem.kind,elem.label);
                        utils.foreach(elem.data, function (ndx,element) {
                           if (ndx % 2 == 1)
                              track.addCue(new TextTrackCue(element.begin,elem.data[parseInt(ndx)+1].begin,element.text)) 
                        });
                        _tracks.push(track);
                        track.mode = "hidden";
                    }
                });
             }
        }

        function findTrack(kind,label) {
            for (var i = 0; i < _videotag.textTracks.length; i++) {
              if(_videotag.textTracks[i].label === label) {
                  _usedTrack = i;
                  return _videotag.textTracks[i];
                }
            }
            var track = _videotag.addTextTrack(kind,label);
            _usedTrack = _videotag.textTracks.length - 1;
            return track;
        }
        
        this.resetCaptions = function() {
            /*
            if (_tracks.length > 0) {
                _tracksOnce = true;
            }
            _tracks = [];
            
            for (var i = 0; i < _videotag.textTracks.length; i++) {


               while( _videotag.textTracks[i].cues && _videotag.textTracks[i].cues.length && _videotag.textTracks[i].cues.length > 0) {
                   _videotag.textTracks[i].removeCue(_videotag.textTracks[i].cues[0]);
               }
               
              //_videotag.textTracks[i].mode = "disabled";
            }*/
        }


        this.fsCaptions = function(state,curr) {
           if (utils.isIOS() && _videotag.addTextTrack && !_tracksOnce) {
               var ret = null;
               
               utils.foreach(_tracks, function(index,elem) {
                    if (!state && elem.mode == "showing") {
                        ret = parseInt(index);
                    }
                    if (!state)
                        elem.mode = "hidden";
               });
               /*if (state && _tracks[0]) {
                    _videotag.textTracks[0].mode = "showing";
                    _videotag.textTracks[0].mode = "hidden";
                    if (curr > 0) {
                        _tracks[curr-1].mode = "showing";
                    }
               }*/
               if (!state) {
                   return ret;
               }
            }
        }
        
        this.checkComplete = function() {
            
            return _beforecompleted;
        };

        /**
         * Return the video tag and stop listening to events  
         */
        _this.detachMedia = function() {
            _attached = FALSE;
            return _videotag;
        };
        
        /**
         * Begin listening to events again  
         */
        _this.attachMedia = function(seekable) {
            _attached = TRUE;
            if (!seekable) _canSeek = FALSE;
            if (_beforecompleted) {
                _setState(states.IDLE);
                _sendEvent(events.JWPLAYER_MEDIA_COMPLETE);
                _beforecompleted = FALSE;
            }
        };
        
        // Provide access to video tag
        // TODO: remove; used by InStream
        _this.getTag = function() {
            return _videotag;
        };
        
        _this.audioMode = function() {
            if (!_levels) { return FALSE; }
            var type = _levels[0].type;
            return (type == "aac" || type == "mp3" || type == "vorbis");
        };

        _this.setCurrentQuality = function(quality) {
            if (_currentQuality == quality) return;
            quality = parseInt(quality, 10);
            if (quality >=0) {
                if (_levels && _levels.length > quality) {
                    _currentQuality = quality;
                    utils.saveCookie("qualityLabel", _levels[quality].label);
                    _sendEvent(events.JWPLAYER_MEDIA_LEVEL_CHANGED, { currentQuality: quality, levels: _getPublicLevels(_levels)} );
                    var currentTime = _videotag.currentTime;
                    _completeLoad();
                    _this.seek(currentTime);
                }
            }
        };
        
        _this.getCurrentQuality = function() {
            return _currentQuality;
        };
        
        _this.getQualityLevels = function() {
            return _getPublicLevels(_levels);
        };
        
        // Call constructor
        _init(videotag);

    };

})(jwplayer);
/**
 * jwplayer.html5 namespace
 * 
 * @author pablo
 * @version 6.0
 */
(function(jwplayer) {
	var html5 = jwplayer.html5, 
		utils = jwplayer.utils, 
		events = jwplayer.events, 
		states = events.state,
		_css = utils.css, 
		_bounds = utils.bounds,
		_isMobile = utils.isMobile(),
		_isIPad = utils.isIPad(),
		_isIPod = utils.isIPod(),
		_isAndroid = utils.isAndroid(),
		_isIOS = utils.isIOS(),
		DOCUMENT = document,
		PLAYER_CLASS = "jwplayer",
		ASPECT_MODE = "aspectMode",
		FULLSCREEN_SELECTOR = "."+PLAYER_CLASS+".jwfullscreen",
		VIEW_MAIN_CONTAINER_CLASS = "jwmain",
		VIEW_INSTREAM_CONTAINER_CLASS = "jwinstream",
		VIEW_VIDEO_CONTAINER_CLASS = "jwvideo", 
		VIEW_CONTROLS_CONTAINER_CLASS = "jwcontrols",
		VIEW_ASPECT_CONTAINER_CLASS = "jwaspect",
		VIEW_PLAYLIST_CONTAINER_CLASS = "jwplaylistcontainer",

		/*************************************************************
		 * Player stylesheets - done once on script initialization;  *
		 * These CSS rules are used for all JW Player instances      *
		 *************************************************************/

		TRUE = true,
		FALSE = false,
		
		JW_CSS_SMOOTH_EASE = "opacity .25s ease",
		JW_CSS_100PCT = "100%",
		JW_CSS_ABSOLUTE = "absolute",
		JW_CSS_IMPORTANT = " !important",
		JW_CSS_HIDDEN = "hidden",
		JW_CSS_NONE = "none",
		JW_CSS_BLOCK = "block";

	html5.view = function(api, model) {
		var _api = api,
			_model = model, 
			_playerElement,
			_container,
			_controlsLayer,
			_aspectLayer,
			_playlistLayer,
			_controlsTimeout = -1,
			_timeoutDuration = _isMobile ? 4000 : 2000,
			_videoTag,
			_videoLayer,
			_lastWidth,
			_lastHeight,
			_instreamLayer,
			_instreamControlbar,
			_instreamDisplay,
			_instreamModel,
			_instreamMode = FALSE,
			_controlbar,
			_display,
			_dock,
			_captions,
			_playlist,
			_audioMode,
			_errorState = FALSE,
			_showing = FALSE,
			_replayState,
			_readyState,
			_rightClickMenu,
			_resizeMediaTimeout = -1,
			_inCB = FALSE,
			_currentState,
			_eventDispatcher = new events.eventdispatcher();

		utils.extend(this, _eventDispatcher);

		function _init() {

			_playerElement = _createElement("div", PLAYER_CLASS + " playlist-" + _model.playlistposition);
			_playerElement.id = _api.id;
			
			if (_model.aspectratio) {
				_css.style(_playerElement, {
					display: 'inline-block'
				});
				_playerElement.className = _playerElement.className.replace(PLAYER_CLASS, PLAYER_CLASS + " " + ASPECT_MODE);
			}

			_resize(_model.width, _model.height);
			
			var replace = DOCUMENT.getElementById(_api.id);
			replace.parentNode.replaceChild(_playerElement, replace);
		}

		this.getCurrentCaptions = function() {
			return _captions.getCurrentCaptions();
		};

		this.setCurrentCaptions = function(caption) {
			_captions.setCurrentCaptions(caption);
		};

		this.getCaptionsList = function() {
			return _captions.getCaptionsList();
		};		
		
		function _responsiveListener() {
			var bounds = _bounds(_playerElement), 
				containerWidth = Math.round(bounds.width),
				containerHeight = Math.round(bounds.height);
			if (!DOCUMENT.body.contains(_playerElement)) {
				window.removeEventListener('resize', _responsiveListener);
				if (_isMobile) {
					window.removeEventListener("orientationchange", _responsiveListener);
				}
			} else if (containerWidth && containerHeight) {
				if (containerWidth !== _lastWidth || containerHeight !== _lastHeight) {
					_lastWidth = containerWidth;
					_lastHeight = containerHeight;
					if (_display) {
						_display.redraw();
					}
					clearTimeout(_resizeMediaTimeout);
					_resizeMediaTimeout = setTimeout(_resizeMedia, 50);
					_eventDispatcher.sendEvent(events.JWPLAYER_RESIZE, {
						width : containerWidth,
						height : containerHeight
					});
				}
			}
			return bounds;
		}

		
		this.setup = function(skin) {
			if (_errorState) return;
			_api.skin = skin;
			
			_container = _createElement("span", VIEW_MAIN_CONTAINER_CLASS);
			_container.id = _api.id + "_view";
			_videoLayer = _createElement("span", VIEW_VIDEO_CONTAINER_CLASS);
			
			_videoTag = _model.getVideo().getTag();
			_videoLayer.appendChild(_videoTag);
			_controlsLayer = _createElement("span", VIEW_CONTROLS_CONTAINER_CLASS);
			_instreamLayer = _createElement("span", VIEW_INSTREAM_CONTAINER_CLASS);
			_playlistLayer = _createElement("span", VIEW_PLAYLIST_CONTAINER_CLASS);
			_aspectLayer = _createElement("span", VIEW_ASPECT_CONTAINER_CLASS);

			_setupControls();
			
			_container.appendChild(_videoLayer);
			_container.appendChild(_controlsLayer);
			_container.appendChild(_instreamLayer);
			
			_playerElement.appendChild(_container);
			_playerElement.appendChild(_aspectLayer);
			_playerElement.appendChild(_playlistLayer);

			DOCUMENT.addEventListener('webkitfullscreenchange', _fullscreenChangeHandler, FALSE);
			_videoTag.addEventListener('webkitbeginfullscreen', _fullscreenChangeHandler, FALSE);
			_videoTag.addEventListener('webkitendfullscreen', _fullscreenChangeHandler, FALSE);
			DOCUMENT.addEventListener('mozfullscreenchange', _fullscreenChangeHandler, FALSE);
			DOCUMENT.addEventListener('MSFullscreenChange', _fullscreenChangeHandler, FALSE);
			DOCUMENT.addEventListener('keydown', _keyHandler, FALSE);
			
			window.removeEventListener('resize', _responsiveListener);
			window.addEventListener('resize', _responsiveListener, false);
			if (_isMobile) {
				window.removeEventListener("orientationchange", _responsiveListener);
				window.addEventListener("orientationchange", _responsiveListener, false);
			}
			
			_api.jwAddEventListener(events.JWPLAYER_PLAYER_READY, _readyHandler);
			_api.jwAddEventListener(events.JWPLAYER_PLAYER_STATE, _stateHandler);
			_api.jwAddEventListener(events.JWPLAYER_MEDIA_ERROR, _errorHandler);
			_api.jwAddEventListener(events.JWPLAYER_PLAYLIST_COMPLETE, _playlistCompleteHandler);
			_api.jwAddEventListener(events.JWPLAYER_PLAYLIST_ITEM,_playlistItemHandler);
			_stateHandler({newstate:states.IDLE});
			
			if (!_isMobile) {
				_controlsLayer.addEventListener('mouseout', function() {
					clearTimeout(_controlsTimeout);
					_controlsTimeout = setTimeout(_hideControls, 10);
				}, FALSE);
				
				_controlsLayer.addEventListener('mousemove', _startFade, FALSE);
				if (utils.isIE()) {
					// Not sure why this is needed
					_videoLayer.addEventListener('mousemove', _startFade, FALSE);
					_videoLayer.addEventListener('click', _display.clickHandler);
				}
			} 
			_componentFadeListeners(_controlbar);
			_componentFadeListeners(_dock);

			_css('#' + _playerElement.id + '.' + ASPECT_MODE + " ." + VIEW_ASPECT_CONTAINER_CLASS, {
				"margin-top": _model.aspectratio,
				display: JW_CSS_BLOCK
			});

			var ar = utils.exists (_model.aspectratio) ? parseFloat(_model.aspectratio) : 100,
				size = _model.playlistsize;
			_css('#' + _playerElement.id + '.playlist-right .' + VIEW_ASPECT_CONTAINER_CLASS, {
				"margin-bottom": -1 * size * (ar/100) + "px"
			});

			_css('#' + _playerElement.id + '.playlist-right .' + VIEW_PLAYLIST_CONTAINER_CLASS, {
				width: size + "px",
				right: 0,
				top: 0,
				height: "100%"
			});

			_css('#' + _playerElement.id + '.playlist-bottom .' + VIEW_ASPECT_CONTAINER_CLASS, {
				"padding-bottom": size + "px"
			});

			_css('#' + _playerElement.id + '.playlist-bottom .' + VIEW_PLAYLIST_CONTAINER_CLASS, {
				width: "100%",
				height: size + "px",
				bottom: 0
			});

			_css('#' + _playerElement.id + '.playlist-right .' + VIEW_MAIN_CONTAINER_CLASS, {
				right: size + "px"
			});

			_css('#' + _playerElement.id + '.playlist-bottom .' + VIEW_MAIN_CONTAINER_CLASS, {
				bottom: size + "px"
			});

			setTimeout(function() { 
				_resize(_model.width, _model.height);
			}, 0);
		};
		
		function _componentFadeListeners(comp) {
			if (comp) {
				comp.element().addEventListener('mousemove', _cancelFade, FALSE);
				comp.element().addEventListener('mouseout', _resumeFade, FALSE);
			}
		}
	
	    function _captionsLoadedHandler(evt) {
	        
	        //ios7captions
	        //_model.getVideo().addCaptions(evt.captionData,_model.fullscreen, _api.jwGetCurrentCaptions());
	    }
	
	
		function _createElement(elem, className) {
			var newElement = DOCUMENT.createElement(elem);
			if (className) newElement.className = className;
			return newElement;
		}
		
		function _touchHandler() {
			if (_isMobile) {
				if (_showing) {
					_hideControls();
				} else {
					_showControls();
				}
			} else {
				_stateHandler(_api.jwGetState());
			}
			if (_showing) {
				_resetTapTimer();
			}
		}

		function _resetTapTimer() {
			clearTimeout(_controlsTimeout);
			_controlsTimeout = setTimeout(_hideControls, _timeoutDuration);
		}
		
		function _startFade() {
			clearTimeout(_controlsTimeout);
			if (_api.jwGetState() == states.PAUSED || _api.jwGetState() == states.PLAYING) {
				_showControls();
				if (!_inCB) {
					_controlsTimeout = setTimeout(_hideControls, _timeoutDuration);
				}
			}
		}
		
		function _cancelFade() {
			clearTimeout(_controlsTimeout);
			_inCB = TRUE;
		}
		
		function _resumeFade() {
			_inCB = FALSE;
		}
		
		function forward(evt) {
			_eventDispatcher.sendEvent(evt.type, evt);
		}
		
		function _setupControls() {
			var height = _model.height,
				cbSettings = _model.componentConfig('controlbar'),
				displaySettings = _model.componentConfig('display');

			_checkAudioMode(height);

			_captions = new html5.captions(_api, _model.captions);
			_captions.addEventListener(events.JWPLAYER_CAPTIONS_LIST, forward);
			_captions.addEventListener(events.JWPLAYER_CAPTIONS_CHANGED, forward);
			_captions.addEventListener(events.JWPLAYER_CAPTIONS_LOADED, _captionsLoadedHandler);
			_controlsLayer.appendChild(_captions.element());

			_display = new html5.display(_api, displaySettings);
			_display.addEventListener(events.JWPLAYER_DISPLAY_CLICK, function(evt) {
				forward(evt);
				_touchHandler();
				});
			if (_audioMode) _display.hidePreview(TRUE);
			_controlsLayer.appendChild(_display.element());
			
			_dock = new html5.dock(_api, _model.componentConfig('dock'));
			_controlsLayer.appendChild(_dock.element());
			
			if (_api.edition && !_isMobile) {
				_rightClickMenu = new html5.rightclick(_api, {abouttext: _model.abouttext, aboutlink: _model.aboutlink});	
			}
			else if (!_isMobile) {
				_rightClickMenu = new html5.rightclick(_api, {});
			}
			
			if (_model.playlistsize && _model.playlistposition && _model.playlistposition != JW_CSS_NONE) {
				_playlist = new html5.playlistcomponent(_api, {});
				_playlistLayer.appendChild(_playlist.element());
			}
			

			_controlbar = new html5.controlbar(_api, cbSettings);
			_controlbar.addEventListener(events.JWPLAYER_USER_ACTION, _resetTapTimer);
			_controlsLayer.appendChild(_controlbar.element());
			
			if (_isIPod) _hideControlbar();
		}

		/** 
		 * Switch to fullscreen mode.  If a native fullscreen method is available in the browser, use that.  
		 * Otherwise, use the false fullscreen method using CSS. 
		 **/
		var _fullscreen = this.fullscreen = function(state) {
			if (!utils.exists(state)) {
				state = !_model.fullscreen;
			}

			if (state) {
				if (_isAudioFile()) return;
				
				//ios7captions
				//_model.getVideo().fsCaptions(state,_api.jwGetCurrentCaptions());
				if (_isMobile) {
					try {
						_videoTag.webkitEnterFullScreen();
						_model.setFullscreen(TRUE);
					} catch(e) {
						//object can't go fullscreen
						return;
					}
				} else if (!_model.fullscreen) {
					_fakeFullscreen(TRUE);
					if (_playerElement.requestFullScreen) {
						_playerElement.requestFullScreen();
					} else if (_playerElement.mozRequestFullScreen) {
						_playerElement.mozRequestFullScreen();
					} else if (_playerElement.webkitRequestFullScreen) {
						_playerElement.webkitRequestFullScreen();
					} else if (_playerElement.msRequestFullscreen) {
						_playerElement.msRequestFullscreen();
					}
					_model.setFullscreen(TRUE);
				
				}
			} else {
			    
			    //commenting out ios7 support
			    //var curr = _model.getVideo().fsCaptions(state,_api.jwGetCurrentCaptions());
                //if (curr)
                 //   _api.jwSetCurrentCaptions(curr+1);
                //else 
                //    _api.jwSetCurrentCaptions(0);
				if (_isMobile) {
					_videoTag.webkitExitFullScreen();
					_model.setFullscreen(FALSE);
					if(_isIPad) {
                        _videoTag.controls = FALSE;
					}
				} else if (_model.fullscreen) {

					_fakeFullscreen(FALSE);
					_model.setFullscreen(FALSE);
					if (DOCUMENT.cancelFullScreen) {  
						DOCUMENT.cancelFullScreen();  
					} else if (DOCUMENT.mozCancelFullScreen) {  
						DOCUMENT.mozCancelFullScreen();  
					} else if (DOCUMENT.webkitCancelFullScreen) {  
						DOCUMENT.webkitCancelFullScreen();  
					} else if (DOCUMENT.msExitFullscreen) {
						DOCUMENT.msExitFullscreen();
					}
				}
				if (_isIPad && _api.jwGetState() == states.PAUSED) {
					setTimeout(_showDisplay, 500);
				}
			}

			_redrawComponent(_controlbar);
			_redrawComponent(_display);
			_redrawComponent(_dock);
			_resizeMedia();

			if (_model.fullscreen) {
				// Browsers seem to need an extra second to figure out how large they are in fullscreen...
				clearTimeout(_resizeMediaTimeout);
				_resizeMediaTimeout = setTimeout(_resizeMedia, 200);
			}
			
		};
		

		
		function _redrawComponent(comp) {
			if (comp) comp.redraw();
		}

		/**
		 * Resize the player
		 */
		function _resize(width, height, resetAspectMode) {
			var className = _playerElement.className,
				playerStyle,
				playlistStyle,
				containerStyle,
				playlistSize,
				playlistPos,
				id = _api.id + '_view';
			_css.block(id);

			// when jwResize is called remove aspectMode and force layout
			resetAspectMode = !!resetAspectMode;
			if (resetAspectMode) {
				className = className.replace(/\s*aspectMode/, '');
				if (_playerElement.className !== className) {
					_playerElement.className = className;
				}
				_css.style(_playerElement, {
					display: JW_CSS_BLOCK
				}, resetAspectMode);
			}
			
			if (utils.exists(width) && utils.exists(height)) {
				_model.width = width;
				_model.height = height;
			}
			
			playerStyle = { width: width };
			if (className.indexOf(ASPECT_MODE) == -1) {
				playerStyle.height = height;
			}
			_css.style(_playerElement, playerStyle, true);

			if (_display) {
				_display.redraw();
			}
			if (_controlbar) {
				_controlbar.redraw(TRUE);
			}
			
			_checkAudioMode(height);

			playlistSize = _model.playlistsize;
			playlistPos = _model.playlistposition;
			if (_playlist && playlistSize && (playlistPos == "right" || playlistPos == "bottom")) {
				_playlist.redraw();
				
				playlistStyle = {
					display: JW_CSS_BLOCK
				};
				containerStyle = {};

				playlistStyle[playlistPos] = 0;
				containerStyle[playlistPos] = playlistSize;
				
				if (playlistPos == "right") {
					playlistStyle.width = playlistSize;
				} else {
					playlistStyle.height = playlistSize;
				}
				
				_css.style(_playlistLayer, playlistStyle);
				_css.style(_container, containerStyle);
			}

			// pass width, height from jwResize if present 
			_resizeMedia(width, height);

			_css.unblock(id);
		}
		
		function _checkAudioMode(height) {
			_audioMode = _isAudioMode(height);
			if (_controlbar) {
				if (_audioMode) {
					_controlbar.audioMode(TRUE);
					_showControls();
					_display.hidePreview(TRUE);
					_hideDisplay();
					_showVideo(FALSE);
				} else {
					_controlbar.audioMode(FALSE);
					_updateState(_api.jwGetState());
				}
			}
			_playerElement.style.backgroundColor = _audioMode ? 'transparent' : '#000';
		}
		
		function _isAudioMode(height) {
			var bounds = _bounds(_playerElement);
			if (height.toString().indexOf("%") > 0)
				return FALSE;
			else if (bounds.height === 0)
				return FALSE;
			else if (_model.playlistposition == "bottom")
				return bounds.height <= 40 + _model.playlistsize;
			return bounds.height <= 40;
		}
		
		function _resizeMedia(width, height) {
			if (_videoTag) {
				if (!width || isNaN(Number(width))) {
					width  = _videoLayer.clientWidth;
				}
				if (!height || isNaN(Number(height))) {
					height = _videoLayer.clientHeight;
				}
				var transformScale = utils.stretch(_model.stretching,
					_videoTag, 
					width, height, 
					_videoTag.videoWidth, _videoTag.videoHeight);
				// poll resizing if video is transformed
				if (transformScale) {
					clearTimeout(_resizeMediaTimeout);
					_resizeMediaTimeout = setTimeout(_resizeMedia, 250);
				}
			}
		}
		
		this.resize = function(width, height) {
			var resetAspectMode = true;
			_resize(width, height, resetAspectMode);
			_responsiveListener();
		};
		this.resizeMedia = _resizeMedia;

		var _completeSetup = this.completeSetup = function() {
			_css.style(_playerElement, {
				opacity: 1
			});
		};
		
		/**
		 * Listen for keystrokes while in fullscreen mode.  
		 * ESC returns from fullscreen
		 * SPACE toggles playback
		 **/
		function _keyHandler(evt) {
			if (_model.fullscreen) {
				switch (evt.keyCode) {
				// ESC
				case 27:
					_fullscreen(FALSE);
					break;
				// SPACE
//				case 32:
//					if (_model.state == states.PLAYING || _model.state = states.BUFFERING)
//						_api.jwPause();
//					break;
				}
			}
		}
		
		/**
		 * False fullscreen mode. This is used for browsers without full support for HTML5 fullscreen.
		 * This method sets the CSS of the container element to a fixed position with 100% width and height.
		 */
		function _fakeFullscreen(state) {
			//this was here to fix a bug with iOS resizing from fullscreen, but it caused another bug with android, multiple sources.
			if (_isIOS) return;
			if (state) {
				_playerElement.className += " jwfullscreen";
				(DOCUMENT.getElementsByTagName("body")[0]).style["overflow-y"] = JW_CSS_HIDDEN;
			} else {
				_playerElement.className = _playerElement.className.replace(/\s+jwfullscreen/, "");
				(DOCUMENT.getElementsByTagName("body")[0]).style["overflow-y"] = "";
			}
		}

		/**
		 * Return whether or not we're in native fullscreen
		 */
		function _isNativeFullscreen() {
			var fsElement = DOCUMENT.mozFullScreenElement || 
							DOCUMENT.webkitCurrentFullScreenElement ||
							DOCUMENT.msFullscreenElement ||
							_videoTag.webkitDisplayingFullscreen;
			
			return !!(fsElement && (!fsElement.id || fsElement.id == _api.id));
		}
		
		/**
		 * If the browser enters or exits fullscreen mode (without the view's knowing about it) update the model.
		 **/
		function _fullscreenChangeHandler() {
			var fsNow = _isNativeFullscreen();
			if (_model.fullscreen != fsNow) {
				_fullscreen(fsNow);
			}
			
		}
		
		function _showControlbar() {
			if (_isIPod && !_audioMode) return; 
			if (_controlbar) _controlbar.show();
		}
		
		function _hideControlbar() {
			if (_controlbar && !_audioMode && !_model.getVideo().audioMode()) {
				_controlbar.hide();
			}
		}
		
		function _showDock() {
			if (_dock && !_audioMode && _model.controls) _dock.show();
		}
		function _hideDock() {
			if (_dock && !_replayState && !_model.getVideo().audioMode()) {
				_dock.hide();
			}
		}

		function _showDisplay() {
			if (_display && _model.controls && !_audioMode) {
				if (!_isIPod || _api.jwGetState() == states.IDLE)
					_display.show();
			}

			if (!(_isMobile && _model.fullscreen)) {
				_videoTag.controls = FALSE;
			}
			
		}
		function _hideDisplay() {
			if (_display) {
				_display.hide();
			}
		}

		function _hideControls() {
			clearTimeout(_controlsTimeout);
			_showing = FALSE;

			var state = _api.jwGetState();
			
			if (!model.controls || state != states.PAUSED) {
				_hideControlbar();
			}

			if (!model.controls) {
				_hideDock();
			}

			if (state != states.IDLE && state != states.PAUSED) {
				_hideDock();
			}
		}

		function _showControls() {

			_showing = TRUE;
			if (_model.controls || _audioMode) {
				if (!(_isIPod && _currentState == states.PAUSED)) {
					_showControlbar();
					_showDock();
				}
			}
		}

		function _showVideo(state) {
			state = state && !_audioMode;
			if (state || _isAndroid) {
				// Changing visibility to hidden on Android < 4.2 causes 
				// the pause event to be fired. This causes audio files to 
				// become unplayable. Hence the video tag is always kept 
				// visible on Android devices.
				_css.style(_videoLayer, {
					visibility: "visible",
					opacity: 1
				});
			}
			else {
				_css.style(_videoLayer, {
					visibility: JW_CSS_HIDDEN,
					opacity: 0
				});		
			}
		}

		function _playlistCompleteHandler() {
			_replayState = TRUE;
			_fullscreen(FALSE);
			if (_model.controls) {
				_showDock();
			}
		}
		
		
	    function _playlistItemHandler() {
            //ios7 captions:
            //_model.getVideo().resetCaptions();
        }

		function _readyHandler() {
			_readyState = TRUE;
		}

		/**
		 * Player state handler
		 */
		var _stateTimeout;
		
		function _stateHandler(evt) {
			_replayState = FALSE;
			clearTimeout(_stateTimeout);
			_stateTimeout = setTimeout(function() {
				_updateState(evt.newstate);
			}, 100);
		}
		
		function _errorHandler() {
			_hideControlbar();
		}
		
		function _isAudioFile() {
		    var model = _instreamMode ? _instreamModel : _model;
		    return model.getVideo().audioMode()
		}
		
		
		function _updateState(state) {
			_currentState = state;
			switch(state) {
			case states.PLAYING:
				if (!_isAudioFile()) {
					_showVideo(TRUE);
					_resizeMedia();
					_display.hidePreview(TRUE);
					if (_controlbar) _controlbar.hideFullscreen(FALSE);
					_hideControls();
				} else {
					_showVideo(FALSE);
					_display.hidePreview(_audioMode);
					_display.setHiding(TRUE);
					if (_controlbar) {
						_showControls();
						_controlbar.hideFullscreen(TRUE);
					} 
					_showDock();
				}
				break;
			case states.IDLE:
				_showVideo(FALSE);
				if (!_audioMode) {
					_display.hidePreview(FALSE);
					_showDisplay();
					_showDock();
					if (_controlbar) _controlbar.hideFullscreen(FALSE);
				}
				break;
			case states.BUFFERING:
				_showDisplay();
				_hideControls();
				if (_isMobile) _showVideo(TRUE);
				break;
			case states.PAUSED:
				_showDisplay();
				_showControls();
				break;
			}
		}
		
		function _internalSelector(className) {
			return '#' + _api.id + (className ? " ." + className : "");
		}
		
		this.setupInstream = function(instreamContainer, instreamControlbar, instreamDisplay, instreamModel) {
			_css.unblock();
			_setVisibility(_internalSelector(VIEW_INSTREAM_CONTAINER_CLASS), TRUE);
			_setVisibility(_internalSelector(VIEW_CONTROLS_CONTAINER_CLASS), FALSE);
			_instreamLayer.appendChild(instreamContainer);
			_instreamControlbar = instreamControlbar;
			_instreamDisplay = instreamDisplay;
			_instreamModel = instreamModel;
			_stateHandler({newstate:states.PLAYING});
			_instreamMode = TRUE;
		};
		
		this.destroyInstream = function() {
			_css.unblock();
			_setVisibility(_internalSelector(VIEW_INSTREAM_CONTAINER_CLASS), FALSE);
			_setVisibility(_internalSelector(VIEW_CONTROLS_CONTAINER_CLASS), TRUE);
			_instreamLayer.innerHTML = "";
			_instreamMode = FALSE;
		};
		
		this.setupError = function(message) {
			_errorState = TRUE;
			jwplayer.embed.errorScreen(_playerElement, message, _model);
			_completeSetup();
		};
		
		function _setVisibility(selector, state) {
			_css(selector, { display: state ? JW_CSS_BLOCK : JW_CSS_NONE });
		}
		
		this.addButton = function(icon, label, handler, id) {
			if (_dock) {
				_dock.addButton(icon, label, handler, id);
				if (_api.jwGetState() == states.IDLE) _showDock();
			}
		};

		this.removeButton = function(id) {
			if (_dock) _dock.removeButton(id);
		};
		
		this.setControls = function(state) {
			var oldstate = _model.controls,
				newstate = state ? TRUE : FALSE;
			_model.controls = newstate;
			if (newstate != oldstate) {

				if (_instreamMode) {
					_hideInstream(!state);
				} else {
				    if (newstate) {
                        _stateHandler({newstate: _api.jwGetState()});
                    } else {
                        _hideControls();
                        _hideDisplay();
                    }
				}
				_eventDispatcher.sendEvent(events.JWPLAYER_CONTROLS, { controls: newstate });
			}
		};
		
		function _hideInstream(hidden) {
			if (hidden) {
				_instreamControlbar.hide();
				_instreamDisplay.hide();
			} else {
				_instreamControlbar.show();
				_instreamDisplay.show();
			}
		}
		
		this.addCues = function(cues) {
			if (_controlbar) _controlbar.addCues(cues);
		};

		this.forceState = function(state) {
			_display.forceState(state);
		};
		
		this.releaseState = function() {
			_display.releaseState(_api.jwGetState());
		};
		
		this.getSafeRegion = function() {
			var bounds = {
				x: 0,
				y: 0,
				width: 0,
				height: 0
			};
			if (!_model.controls) {
				return bounds;
			}
			_controlbar.showTemp();
			_dock.showTemp();
			//_responsiveListener();
			var dispBounds = _bounds(_container),
				dispOffset = dispBounds.top,
				cbBounds = _instreamMode ? _bounds(DOCUMENT.getElementById(_api.id + "_instream_controlbar")) : _bounds(_controlbar.element()),
				dockButtons = _instreamMode ? false : (_dock.numButtons() > 0),
				dockBounds;
			if (dockButtons) {
				dockBounds = _bounds(_dock.element());
				bounds.y = Math.max(0, dockBounds.bottom - dispOffset);
			}
			bounds.width = dispBounds.width;
			if (cbBounds.height) {
				bounds.height = cbBounds.top - dispOffset - bounds.y;
			} else {
				bounds.height = dispBounds.height - bounds.y;
			}
			_controlbar.hideTemp();
			_dock.hideTemp();
			return bounds;
		};

		this.destroy = function () {
			DOCUMENT.removeEventListener('webkitfullscreenchange', _fullscreenChangeHandler, FALSE);
			DOCUMENT.removeEventListener('mozfullscreenchange', _fullscreenChangeHandler, FALSE);
			DOCUMENT.removeEventListener('MSFullscreenChange', _fullscreenChangeHandler, FALSE);
			_videoTag.removeEventListener('webkitbeginfullscreen', _fullscreenChangeHandler, FALSE);
			_videoTag.removeEventListener('webkitendfullscreen', _fullscreenChangeHandler, FALSE);
			DOCUMENT.removeEventListener('keydown', _keyHandler, FALSE);
			if (_rightClickMenu) {
				_rightClickMenu.destroy();
			}
		};

		_init();
	};

	// Container styles
	_css('.' + PLAYER_CLASS, {
		position: 'relative',
		// overflow: 'hidden',
		display: 'block',
		opacity: 0,
		'min-height': 0,
		'-webkit-transition': JW_CSS_SMOOTH_EASE,
		'-moz-transition': JW_CSS_SMOOTH_EASE,
		'-o-transition': JW_CSS_SMOOTH_EASE
	});

	_css('.' + VIEW_MAIN_CONTAINER_CLASS, {
		position : JW_CSS_ABSOLUTE,
		left: 0,
		right: 0,
		top: 0,
		bottom: 0,
		'-webkit-transition': JW_CSS_SMOOTH_EASE,
		'-moz-transition': JW_CSS_SMOOTH_EASE,
		'-o-transition': JW_CSS_SMOOTH_EASE
	});

	_css('.' + VIEW_VIDEO_CONTAINER_CLASS + ', .'+ VIEW_CONTROLS_CONTAINER_CLASS, {
		position : JW_CSS_ABSOLUTE,
		height : JW_CSS_100PCT,
		width: JW_CSS_100PCT,
		'-webkit-transition': JW_CSS_SMOOTH_EASE,
		'-moz-transition': JW_CSS_SMOOTH_EASE,
		'-o-transition': JW_CSS_SMOOTH_EASE
	});

	_css('.' + VIEW_VIDEO_CONTAINER_CLASS, {
		overflow: JW_CSS_HIDDEN,
		visibility: JW_CSS_HIDDEN,
		opacity: 0,
		cursor: "pointer"
	});

	_css('.' + VIEW_VIDEO_CONTAINER_CLASS + " video", {
		background : 'transparent',
		height : JW_CSS_100PCT,
		width: JW_CSS_100PCT,
		position: 'absolute',
		margin: 'auto',
		right: 0,
		left: 0,
		top: 0,
		bottom: 0
	});

	_css('.' + VIEW_PLAYLIST_CONTAINER_CLASS, {
		position: JW_CSS_ABSOLUTE,
		height : JW_CSS_100PCT,
		width: JW_CSS_100PCT,
		display: JW_CSS_NONE
	});
	
	_css('.' + VIEW_INSTREAM_CONTAINER_CLASS, {
		position: JW_CSS_ABSOLUTE,
		top: 0,
		left: 0,
		bottom: 0,
		right: 0,
		display: 'none'
	});


	_css('.' + VIEW_ASPECT_CONTAINER_CLASS, {
		display: 'none'
	});

	_css('.' + PLAYER_CLASS + '.' + ASPECT_MODE , {
		height: 'auto'
	});

	// Fullscreen styles
	
	_css(FULLSCREEN_SELECTOR, {
		width: JW_CSS_100PCT,
		height: JW_CSS_100PCT,
		left: 0, 
		right: 0,
		top: 0,
		bottom: 0,
		'z-index': 1000,
		position: "fixed"
	}, TRUE);

	_css(FULLSCREEN_SELECTOR + ' .'+ VIEW_MAIN_CONTAINER_CLASS, {
		left: 0, 
		right: 0,
		top: 0,
		bottom: 0
	}, TRUE);

	_css(FULLSCREEN_SELECTOR + ' .'+ VIEW_PLAYLIST_CONTAINER_CLASS, {
		display: JW_CSS_NONE
	}, TRUE);
	
	_css('.' + PLAYER_CLASS+' .jwuniform', {
		'background-size': 'contain' + JW_CSS_IMPORTANT
	});

	_css('.' + PLAYER_CLASS+' .jwfill', {
		'background-size': 'cover' + JW_CSS_IMPORTANT,
		'background-position': 'center'
	});

	_css('.' + PLAYER_CLASS+' .jwexactfit', {
		'background-size': JW_CSS_100PCT + " " + JW_CSS_100PCT + JW_CSS_IMPORTANT
	});

})(jwplayer);
