/**
 * JW Player Source start cap
 * 
 * This will appear at the top of the JW Player source
 * 
 * @version 6.0
 */

 if (typeof jwplayer == "undefined") {/**
 * JW Player namespace definition
 * @version 6.0
 */
jwplayer = function(container) {
	if (jwplayer.api) {
		return jwplayer.api.selectPlayer(container);
	}
};

jwplayer.version = '6.8.';

// "Shiv" method for older IE browsers; required for parsing media tags
jwplayer.vid = document.createElement("video");
jwplayer.audio = document.createElement("audio");
jwplayer.source = document.createElement("source");/**
 * Utility methods for the JW Player.
 * 
 * @author pablo
 * @version 6.0
 */
(function(jwplayer) {
	var DOCUMENT = document, 
		WINDOW = window, 
		NAVIGATOR = navigator, 
		UNDEFINED = "undefined", 
		STRING = "string", 
		OBJECT = "object",
		TRUE = true, 
		FALSE = false;
	
	//Declare namespace
	var utils = jwplayer.utils = function() {};

	/**
	 * Returns true if the value of the object is null, undefined or the empty
	 * string
	 * 
	 * @param a The variable to inspect
	 */
	utils.exists = function(item) {
		switch (typeof (item)) {
		case STRING:
			return (item.length > 0);
		case OBJECT:
			return (item !== null);
		case UNDEFINED:
			return FALSE;
		}
		return TRUE;
	};

	/** Used for styling dimensions in CSS -- return the string unchanged if it's a percentage width; add 'px' otherwise **/ 
	utils.styleDimension = function(dimension) {
		return dimension + (dimension.toString().indexOf("%") > 0 ? "" : "px");
	};
	
	/** Gets an absolute file path based on a relative filepath * */
	utils.getAbsolutePath = function(path, base) {
		if (!utils.exists(base)) {
			base = DOCUMENT.location.href;
		}
		if (!utils.exists(path)) {
			return;
		}
		if (isAbsolutePath(path)) {
			return path;
		}
		var protocol = base.substring(0, base.indexOf("://") + 3);
		var domain = base.substring(protocol.length, base.indexOf('/', protocol.length + 1));
		var patharray;
		if (path.indexOf("/") === 0) {
			patharray = path.split("/");
		} else {
			var basepath = base.split("?")[0];
			basepath = basepath.substring(protocol.length + domain.length + 1, basepath.lastIndexOf('/'));
			patharray = basepath.split("/").concat(path.split("/"));
		}
		var result = [];
		for ( var i = 0; i < patharray.length; i++) {
			if (!patharray[i] || !utils.exists(patharray[i]) || patharray[i] == ".") {
				continue;
			} else if (patharray[i] == "..") {
				result.pop();
			} else {
				result.push(patharray[i]);
			}
		}
		return protocol + domain + "/" + result.join("/");
	};

	function isAbsolutePath(path) {
		if (!utils.exists(path)) {
			return;
		}
		var protocol = path.indexOf("://");
		var queryparams = path.indexOf("?");
		return (protocol > 0 && (queryparams < 0 || (queryparams > protocol)));
	}

	/** Merges a list of objects **/
	utils.extend = function() {
		var args = utils.extend['arguments'];
		if (args.length > 1) {
			for ( var i = 1; i < args.length; i++) {
				utils.foreach(args[i], function(element, arg) {
					try {
						if (utils.exists(arg)) {
							args[0][element] = arg;
						}
					} catch(e) {}
				});
			}
			return args[0];
		}
		return null;
	};

	/** Logger * */
	var console = window.console = window.console || {log: function(){}};
	utils.log = function() {
		var args = Array.prototype.slice.call(arguments, 0);
		if (typeof console.log === OBJECT) {
			console.log(args);
		} else {
			console.log.apply(console, args);
		}
	};

	var _userAgentMatch = utils.userAgentMatch = function(regex) {
		var agent = NAVIGATOR.userAgent.toLowerCase();
		return (agent.match(regex) !== null);
	};
	
	function _browserCheck(regex) {
		return function() {
			return _userAgentMatch(regex);
		};
	}

	// TODO: Rename "isIETrident" (true for all versions of IE) with "isIE" in 6.9
	utils.isIE = utils.isMSIE = _browserCheck(/msie/i);
	utils.isFF = _browserCheck(/firefox/i);
	utils.isChrome = _browserCheck(/chrome/i);
	utils.isIPod = _browserCheck(/iP(hone|od)/i);
	utils.isIPad = _browserCheck(/iPad/i);
	utils.isSafari602 = _browserCheck(/Macintosh.*Mac OS X 10_8.*6\.0\.\d* Safari/i);

	utils.isIETrident = function(version) {
		if (version) {
			version = parseFloat(version).toFixed(1);
			return _userAgentMatch(new RegExp('msie\\s*'+version+'|trident/.+rv:\\s*'+version, 'i'));
		}
		return _userAgentMatch(/msie|trident/i);
	};

	utils.isSafari = function() {
		return (_userAgentMatch(/safari/i) && !_userAgentMatch(/chrome/i) && !_userAgentMatch(/chromium/i) && !_userAgentMatch(/android/i));
	};

	/** Matches iOS devices **/
	utils.isIOS = function(version) {
		if (version) {
			return _userAgentMatch(new RegExp("iP(hone|ad|od).+\\sOS\\s"+version, "i"));
		}
		return _userAgentMatch(/iP(hone|ad|od)/i);
	};

	/** Matches Android devices **/	
	utils.isAndroid = function(version, excludeChrome) {
		//Android Browser appears to include a user-agent string for Chrome/18
		var androidBrowser = excludeChrome ? !_userAgentMatch(/chrome\/[23456789]/i) : TRUE;
		if (version) {
			return androidBrowser && _userAgentMatch(new RegExp("android.*"+version, "i"));
		}
		return androidBrowser && _userAgentMatch(/android/i);
	};

	/** Matches iOS and Android devices **/	
	utils.isMobile = function() {
		return utils.isIOS() || utils.isAndroid();
	};
	
	/** Save a setting **/
	utils.saveCookie = function(name, value) {
		DOCUMENT.cookie = "jwplayer." + name + "=" + value + "; path=/";
	};

	/** Retrieve saved  player settings **/
	utils.getCookies = function() {
		var jwCookies = {};
		var cookies = DOCUMENT.cookie.split('; ');
		for (var i=0; i<cookies.length; i++) {
			var split = cookies[i].split('=');
			if (split[0].indexOf("jwplayer.") === 0) {
				jwCookies[split[0].substring(9, split[0].length)] = split[1];
			}
		}
		return jwCookies;
	};

	/** Returns the true type of an object * */
	utils.typeOf = function(value) {
		var typeofString = typeof value;
		if (typeofString === OBJECT) {
			if (!value) return "null";
			return (value instanceof Array) ? 'array' : typeofString;
		}
		return typeofString;
	};

	/* Normalizes differences between Flash and HTML5 internal players' event responses. */
	utils.translateEventResponse = function(type, eventProperties) {
		var translated = utils.extend({}, eventProperties);
		if (type == jwplayer.events.JWPLAYER_FULLSCREEN && !translated.fullscreen) {
			translated.fullscreen = translated.message == "true" ? TRUE : FALSE;
			delete translated.message;
		} else if (typeof translated.data == OBJECT) {
			// Takes ViewEvent "data" block and moves it up a level
			var data = translated.data;
			delete translated.data;
			translated = utils.extend(translated, data);

		} else if (typeof translated.metadata == OBJECT) {
			utils.deepReplaceKeyName(translated.metadata, ["__dot__","__spc__","__dsh__","__default__"], ["."," ","-","default"]);
		}
		
		var rounders = ["position", "duration", "offset"];
		utils.foreach(rounders, function(rounder, val) {
			if (translated[val]) {
				translated[val] = Math.round(translated[val] * 1000) / 1000;
			}
		});
		
		return translated;
	};

	/**
	 * If the browser has flash capabilities, return the flash version 
	 */
	utils.flashVersion = function() {
		if (utils.isAndroid()) return 0;
		
		var plugins = NAVIGATOR.plugins, flash;
		
		try {
			if (plugins !== UNDEFINED) {
				flash = plugins['Shockwave Flash'];
				if (flash) {
					return parseInt(flash.description.replace(/\D+(\d+)\..*/, "$1"), 10);
				}
			}
		} catch(e) {
			// The above evaluation (plugins != undefined) messes up IE7
		}
		
		if (typeof WINDOW.ActiveXObject != UNDEFINED) {
			try {
				flash = new WINDOW.ActiveXObject("ShockwaveFlash.ShockwaveFlash");
				if (flash) {
					return parseInt(flash.GetVariable("$version").split(" ")[1].split(",")[0], 10);
				}
			} catch (err) {
			}
		}
		return 0;
	};


	/** Finds the location of jwplayer.js and returns the path **/
	utils.getScriptPath = function(scriptName) {
		var scripts = DOCUMENT.getElementsByTagName("script");
		for (var i=0; i<scripts.length; i++) {
			var src = scripts[i].src;
			if (src && src.indexOf(scriptName) >= 0) {
				return src.substr(0, src.indexOf(scriptName));
			}
		}
		return "";
	};

	/**
	 * Recursively traverses nested object, replacing key names containing a
	 * search string with a replacement string.
	 * 
	 * @param searchString
	 *            The string to search for in the object's key names
	 * @param replaceString
	 *            The string to replace in the object's key names
	 * @returns The modified object.
	 */
	utils.deepReplaceKeyName = function(obj, searchString, replaceString) {
		switch (jwplayer.utils.typeOf(obj)) {
		case "array":
			for ( var i = 0; i < obj.length; i++) {
				obj[i] = jwplayer.utils.deepReplaceKeyName(obj[i],
						searchString, replaceString);
			}
			break;
		case OBJECT:
			utils.foreach(obj, function(key, val) {
				var searches, replacements;
				if (searchString instanceof Array && replaceString instanceof Array) {
					if (searchString.length != replaceString.length)
						return;
					else {
						searches = searchString;
						replacements = replaceString;
					}
				} else {
					searches = [searchString];
					replacements = [replaceString];
				}
				var newkey = key;
				for (var i=0; i < searches.length; i++) {
					newkey = newkey.replace(new RegExp(searchString[i], "g"), replaceString[i]);
				}
				obj[newkey] = jwplayer.utils.deepReplaceKeyName(val, searchString, replaceString);
				if (key != newkey) {
					delete obj[key];
				}
			});
			break;
		}
		return obj;
	};
	
	
	/**
	 * Types of plugin paths
	 */
	var _pluginPathType = utils.pluginPathType = {
		ABSOLUTE : 0,
		RELATIVE : 1,
		CDN : 2
	};

	/*
	 * Test cases getPathType('hd') getPathType('hd-1') getPathType('hd-1.4')
	 * 
	 * getPathType('http://plugins.longtailvideo.com/5/hd/hd.swf')
	 * getPathType('http://plugins.longtailvideo.com/5/hd/hd-1.swf')
	 * getPathType('http://plugins.longtailvideo.com/5/hd/hd-1.4.swf')
	 * 
	 * getPathType('./hd.swf') getPathType('./hd-1.swf')
	 * getPathType('./hd-1.4.swf')
	 */
	utils.getPluginPathType = function(path) {
		if (typeof path != STRING) {
			return;
		}
		path = path.split("?")[0];
		var protocol = path.indexOf("://");
		if (protocol > 0) {
			return _pluginPathType.ABSOLUTE;
		}
		var folder = path.indexOf("/");
		var extension = utils.extension(path);
		if (protocol < 0 && folder < 0 && (!extension || !isNaN(extension))) {
			return _pluginPathType.CDN;
		}
		return _pluginPathType.RELATIVE;
	};

	
	/**
	 * Extracts a plugin name from a string
	 */
	utils.getPluginName = function(pluginName) {
		/** Regex locates the characters after the last slash, until it encounters a dash. **/
		return pluginName.replace(/^(.*\/)?([^-]*)-?.*\.(swf|js)$/, "$2");
	};

	/**
	 * Extracts a plugin version from a string
	 */
	utils.getPluginVersion = function(pluginName) {
		return pluginName.replace(/[^-]*-?([^\.]*).*$/, "$1");
	};

	/**
	 * Determines if a URL is a YouTube link
	 */
	utils.isYouTube = function(path) {
		return /^(http|\/\/).*(youtube\.com|youtu\.be)\/.+/.test(path);
	};
	
	/** 
	 * Returns a YouTube ID from a number of YouTube URL formats:
	 * 
	 * Matches the following YouTube URL types:
	 *  - http://www.youtube.com/watch?v=YE7VzlLtp-4
	 *  - http://www.youtube.com/watch?v=YE7VzlLtp-4&extra_param=123
	 *  - http://www.youtube.com/watch#!v=YE7VzlLtp-4
	 *  - http://www.youtube.com/watch#!v=YE7VzlLtp-4?extra_param=123&another_param=456
	 *  - http://www.youtube.com/v/YE7VzlLtp-4
	 *  - http://www.youtube.com/v/YE7VzlLtp-4?extra_param=123&another_param=456
	 *  - http://youtu.be/YE7VzlLtp-4
	 *  - http://youtu.be/YE7VzlLtp-4?extra_param=123&another_param=456
	 *  - YE7VzlLtp-4
	 **/
	utils.youTubeID = function(path) {
		try {
			// Left as a dense regular expression for brevity.  
			return (/v[=\/]([^?&]*)|youtu\.be\/([^?]*)|^([\w-]*)$/i).exec(path).slice(1).join('').replace("?", "");		
		} catch (e) {
			return "";
		}
	};

	/**
	 * Determines if a URL is an RTMP link
	 */
	utils.isRtmp = function(file,type) {
		return (file.indexOf("rtmp") === 0 || type == 'rtmp');
	};

	/**
	 * Iterates over an object and executes a callback function for each property (if it exists)
	 * This is a safe way to iterate over objects if another script has modified the object prototype
	 */
	utils.foreach = function(aData, fnEach) {
		var key, val;
		for (key in aData) {
			if (utils.typeOf(aData.hasOwnProperty) == "function") {
				if (aData.hasOwnProperty(key)) {
					val = aData[key];
					fnEach(key, val);
				}
			} else {
				// IE8 has a problem looping through XML nodes
				val = aData[key];
				fnEach(key, val);
			}
		}
	};

	/** Determines if the current page is HTTPS **/
	utils.isHTTPS = function() {
		return (WINDOW.location.href.indexOf("https") === 0);	
	};
	
	/** Gets the repository location **/
	utils.repo = function() {
		var repo = "http://p.jwpcdn.com/" + jwplayer.version.split(/\W/).splice(0, 2).join("/") + "/";
		
		try {
			if (utils.isHTTPS()) {
				repo = repo.replace("http://", "https://ssl.");
			}
		} catch(e) {}
		
		return repo;
	};
	
	/** Loads an XML file into a DOM object * */
	utils.ajax = function(xmldocpath, completecallback, errorcallback, donotparse) {
		var xmlhttp;
		// Hash tags should be removed from the URL since they can't be loaded in IE
		if (xmldocpath.indexOf("#") > 0) xmldocpath = xmldocpath.replace(/#.*$/, "");

		if (_isCrossdomain(xmldocpath) && utils.exists(WINDOW.XDomainRequest)) {
			// IE8 / 9
			xmlhttp = new WINDOW.XDomainRequest();
			xmlhttp.onload = _ajaxComplete(xmlhttp, xmldocpath, completecallback, errorcallback, donotparse);
			xmlhttp.ontimeout = xmlhttp.onprogress = function(){};
			xmlhttp.timeout = 5000;
		} else if (utils.exists(WINDOW.XMLHttpRequest)) {
			// Firefox, Chrome, Opera, Safari
			xmlhttp = new WINDOW.XMLHttpRequest();
			xmlhttp.onreadystatechange = _readyStateChangeHandler(xmlhttp, xmldocpath, completecallback, errorcallback,donotparse);
		} else {
			if (errorcallback) errorcallback();
			return xmlhttp; 
		}
		if (xmlhttp.overrideMimeType) {
			xmlhttp.overrideMimeType('text/xml');
		}

		xmlhttp.onerror = _ajaxError(errorcallback, xmldocpath, xmlhttp);

		// make XDomainRequest asynchronous:
		setTimeout(function() {
			try {
				xmlhttp.open("GET", xmldocpath, TRUE);
				xmlhttp.send();
			} catch (error) {
				if (errorcallback) errorcallback(xmldocpath);
			}
		}, 0);

		return xmlhttp;
	};
	
	function _isCrossdomain(path) {
		return (path && path.indexOf('://') >= 0) &&
				(path.split('/')[2] != WINDOW.location.href.split('/')[2]);
	}
	
	function _ajaxError(errorcallback, xmldocpath, xmlhttp) {
		return function() {
			errorcallback("Error loading file");
		};
	}
	
	function _readyStateChangeHandler(xmlhttp, xmldocpath, completecallback, errorcallback, donotparse) {
		return function() {
			if (xmlhttp.readyState === 4) {
				switch (xmlhttp.status) {
				case 200:
					_ajaxComplete(xmlhttp, xmldocpath, completecallback, errorcallback, donotparse)();
					break;
				case 404:
					errorcallback("File not found");
				}
				
			}
		};
	}
	
	function _ajaxComplete(xmlhttp, xmldocpath, completecallback, errorcallback, donotparse) {
		return function() {
			// Handle the case where an XML document was returned with an incorrect MIME type.
			var xml, firstChild;
			if (donotparse) {
				completecallback(xmlhttp);
			} else {
				try {
					// This will throw an error on Windows Mobile 7.5.  We want to trigger the error so that we can move 
					// down to the next section
					xml = xmlhttp.responseXML;
					if (xml) {
						firstChild = xml.firstChild;
						if (xml.lastChild && xml.lastChild.nodeName === 'parsererror') {
							if (errorcallback) {
								errorcallback("Invalid XML");
							}
							return;
						}
					}
				} catch (e) {}
				if (xml && firstChild) {
					return completecallback(xmlhttp);
				}
				var parsedXML = utils.parseXML(xmlhttp.responseText);
				if (parsedXML && parsedXML.firstChild) {
					xmlhttp = utils.extend({}, xmlhttp, {responseXML:parsedXML});
				} else {
					if (errorcallback) {
						errorcallback(xmlhttp.responseText ? "Invalid XML" : xmldocpath);
					}
					return;
				}
				completecallback(xmlhttp);
			}
		};
	}
	
	/** Takes an XML string and returns an XML object **/
	utils.parseXML = function(input) {
		var parsedXML;
		try {
			// Parse XML in FF/Chrome/Safari/Opera
			if (WINDOW.DOMParser) {
				parsedXML = (new WINDOW.DOMParser()).parseFromString(input, "text/xml");
				if (parsedXML.childNodes && parsedXML.childNodes.length && parsedXML.childNodes[0].firstChild.nodeName == "parsererror") {
					return;
				}
			} else { 
				// Internet Explorer
				parsedXML = new WINDOW.ActiveXObject("Microsoft.XMLDOM");
				parsedXML.async = "false";
				parsedXML.loadXML(input);
			}
		} catch(e) {
			return;
		}
		return parsedXML;
	};
	
	/** Go through the playlist and choose a single playable type to play; remove sources of a different type **/
	utils.filterPlaylist = function(playlist, checkFlash) {
		var pl = [], i, item, j, source;
		for (i=0; i < playlist.length; i++) {
			item = utils.extend({}, playlist[i]);
			item.sources = utils.filterSources(item.sources);
			if (item.sources.length > 0) {
				for (j = 0; j < item.sources.length; j++) {
					source = item.sources[j];
					if (!source.label) source.label = j.toString();
				}
				pl.push(item);
			}
		}
		
		// HTML5 filtering failed; try for Flash sources
		if (checkFlash && pl.length === 0) {
			for (i=0; i < playlist.length; i++) {
				item = utils.extend({}, playlist[i]);
				item.sources = utils.filterSources(item.sources, TRUE);
				if (item.sources.length > 0) {
					for (j = 0; j < item.sources.length; j++) {
						source = item.sources[j];
						if (!source.label) source.label = j.toString();
					}
					pl.push(item);
				}
			}
		}
		return pl;
	};

	/** Filters the sources by taking the first playable type and eliminating sources of a different type **/
	utils.filterSources = function(sources, filterFlash) {
		var selectedType, newSources, extensionmap = utils.extensionmap;
		if (sources) {
			newSources = [];
			for (var i=0; i<sources.length; i++) {
				var type = sources[i].type,
					file = sources[i].file;
				
				if (file) file = utils.trim(file);
				
				if (!type) {
					type = extensionmap.extType(utils.extension(file));
					sources[i].type = type;
				}

				if (filterFlash) {
					if (jwplayer.embed.flashCanPlay(file, type)) {
						if (!selectedType) {
							selectedType = type;
						}
						if (type == selectedType) {
							newSources.push(utils.extend({}, sources[i]));
						}
					}
				} else {
					if (utils.canPlayHTML5(type)) {
						if (!selectedType) {
							selectedType = type;
						}
						if (type == selectedType) {
							newSources.push(utils.extend({}, sources[i]));
						}
					}
				}
			}
		}
		return newSources;
	};
	
	/** Returns true if the type is playable in HTML5 **/
	utils.canPlayHTML5 = function(type) {
		if (utils.isAndroid() && (type == "hls" || type == "m3u" || type == "m3u8")) return FALSE;
		var mime = utils.extensionmap.types[type];
		return (!!mime && !!jwplayer.vid.canPlayType && jwplayer.vid.canPlayType(mime));
	};

	/**
	 * Convert a time-representing string to a number.
	 *
	 * @param {String}	The input string. Supported are 00:03:00.1 / 03:00.1 / 180.1s / 3.2m / 3.2h
	 * @return {Number}	The number of seconds.
	 */
	utils.seconds = function(str) {
		str = str.replace(',', '.');
		var arr = str.split(':');
		var sec = 0;
		if (str.slice(-1) == 's') {
			sec = parseFloat(str);
		} else if (str.slice(-1) == 'm') {
			sec = parseFloat(str) * 60;
		} else if (str.slice(-1) == 'h') {
			sec = parseFloat(str) * 3600;
		} else if (arr.length > 1) {
			sec = parseFloat(arr[arr.length - 1]);
			sec += parseFloat(arr[arr.length - 2]) * 60;
			if (arr.length == 3) {
				sec += parseFloat(arr[arr.length - 3]) * 3600;
			}
		} else {
			sec = parseFloat(str);
		}
		return sec;
	};
	
	/**
	 * Basic serialization: string representations of booleans and numbers are
	 * returned typed
	 * 
	 * @param {String}
	 *            val String value to serialize.
	 * @return {Object} The original value in the correct primitive type.
	 */
	utils.serialize = function(val) {
		if (val == null) {
			return null;
		} else if (val.toString().toLowerCase() == 'true') {
			return TRUE;
		} else if (val.toString().toLowerCase() == 'false') {
			return FALSE;
		} else if (isNaN(Number(val)) || val.length > 5 || val.length === 0) {
			return val;
		} else {
			return Number(val);
		}
	};
	
})(jwplayer);
/**
 * JW Player Media Extension to Mime Type mapping
 * 
 * @author zach
 * @modified pablo
 * @version 6.0
 */
(function(utils) {
	var video = "video/", 
		audio = "audio/",
		image = "image",
		mp4 = "mp4",
		webm = "webm",
		ogg = "ogg",
		aac = "aac",
		mp3 = "mp3",
		vorbis = "vorbis",
		_foreach = utils.foreach,
		
		mimeMap = {
			mp4: video+mp4,
			vorbis: audio+ogg,
			ogg: video+ogg,
			webm: video+webm,
			aac: audio+mp4,
			mp3: audio+"mpeg",
			hls: "application/vnd.apple.mpegurl"
		},
		
		html5Extensions = {
			"mp4": mimeMap[mp4],
			"f4v": mimeMap[mp4],
			"m4v": mimeMap[mp4],
			"mov": mimeMap[mp4],
			"m4a": mimeMap[aac],
			"m4r": mimeMap[aac],
			"f4a": mimeMap[aac],
			"aac": mimeMap[aac],
			"mp3": mimeMap[mp3],
			"ogv": mimeMap[ogg],
			"ogg": mimeMap[vorbis],
			"oga": mimeMap[vorbis],
			"webm": mimeMap[webm],
			"m3u8": mimeMap.hls,
			"hls": mimeMap.hls
		}, 
		video = "video", 
		flashExtensions = {
			"flv": video,
			"f4v": video,
			"mov": video,
			"m4a": video,
			"m4r": video,
			"m4v": video,
			"mp4": video,
			"aac": video,
			"f4a": video,
			"mp3": "sound",
			"smil": "rtmp",
			"m3u8": "hls",
			"hls": "hls"
		};
	
	var _extensionmap = utils.extensionmap = {};
	_foreach(html5Extensions, function(ext, val) {
		_extensionmap[ext] = { html5: val };
	});

	_foreach(flashExtensions, function(ext, val) {
		if (!_extensionmap[ext]) _extensionmap[ext] = {};
		_extensionmap[ext].flash = val;
	});
	
	_extensionmap.types = mimeMap; 

	_extensionmap.mimeType = function(mime) {
		var returnType;
		_foreach(mimeMap, function(type, val) {
			if (!returnType && val == mime) returnType = type;
		});
		return returnType;
	}

	_extensionmap.extType = function(extension) {
		return _extensionmap.mimeType(html5Extensions[extension]);
	}

})(jwplayer.utils);
/**
 * Loads a <script> tag
 * @author zach
 * @modified pablo
 * @version 6.0
 */
(function(utils) {

	var _loaderstatus = utils.loaderstatus = {
			NEW: 0,
			LOADING: 1,
			ERROR: 2,
			COMPLETE: 3
		},
		DOCUMENT = document;
	
	
	utils.scriptloader = function(url) {
		var _status = _loaderstatus.NEW,
			_events = jwplayer.events,
			_eventDispatcher = new _events.eventdispatcher();
		
		utils.extend(this, _eventDispatcher);
		
		this.load = function() {
			var sameLoader = utils.scriptloader.loaders[url];
			if (sameLoader && (sameLoader.getStatus() == _loaderstatus.NEW || sameLoader.getStatus() == _loaderstatus.LOADING)) {
				// If we already have a scriptloader loading the same script, don't create a new one;
				sameLoader.addEventListener(_events.ERROR, _sendError);
				sameLoader.addEventListener(_events.COMPLETE, _sendComplete);
				return;
			}
			
			utils.scriptloader.loaders[url] = this;
			
			if (_status == _loaderstatus.NEW) {
				_status = _loaderstatus.LOADING;
				var scriptTag = DOCUMENT.createElement("script");
				// Most browsers
				if (scriptTag.addEventListener) {
					scriptTag.onload = _sendComplete;
					scriptTag.onerror = _sendError;
				}
				else if (scriptTag.readyState) {
					// IE
					scriptTag.onreadystatechange = function() {
						if (scriptTag.readyState == 'loaded' || scriptTag.readyState == 'complete') {
							_sendComplete();
						}
						// Error?
					}
				}
				DOCUMENT.getElementsByTagName("head")[0].appendChild(scriptTag);
				scriptTag.src = url;
			}
			
		};
		
		function _sendError(evt) {
			_status = _loaderstatus.ERROR;
			_eventDispatcher.sendEvent(_events.ERROR);
		}
		
		function _sendComplete(evt) {
			_status = _loaderstatus.COMPLETE;
			_eventDispatcher.sendEvent(_events.COMPLETE);
		}

		
		this.getStatus = function() {
			return _status;
		}
	}
	
	utils.scriptloader.loaders = {};
})(jwplayer.utils);
/**
 * String utilities for the JW Player.
 *
 * @version 6.0
 */
(function(utils) {
	/** Removes whitespace from the beginning and end of a string **/
	utils.trim = function(inputString) {
		return inputString.replace(/^\s*/, "").replace(/\s*$/, "");
	};
	
	/**
	 * Pads a string
	 * @param {String} string
	 * @param {Number} length
	 * @param {String} padder
	 */
	utils.pad = function (str, length, padder) {
		if (!padder){
			padder = "0";
		}
		while (str.length < length) {
			str = padder + str;
		}
		return str;
	}
	
	/**
	 * Get the value of a case-insensitive attribute in an XML node
	 * @param {XML} xml
	 * @param {String} attribute
	 * @return {String} Value
	 */
	utils.xmlAttribute = function(xml, attribute) {
		for (var attrib = 0; attrib < xml.attributes.length; attrib++) {
			if (xml.attributes[attrib].name && xml.attributes[attrib].name.toLowerCase() == attribute.toLowerCase()) 
				return xml.attributes[attrib].value.toString();
		}
		return "";
	}
	
	/** Returns the extension of a file name * */
	utils.extension = function(path) {
		if (!path || path.substr(0,4) == 'rtmp') { return ""; }
		path = path.substring(path.lastIndexOf("/") + 1, path.length).split("?")[0].split("#")[0];
		if (path.lastIndexOf('.') > -1) {
			return path.substr(path.lastIndexOf('.') + 1, path.length).toLowerCase();
		}
	};
	
	/** Convert a string representation of a string to an integer **/
	utils.stringToColor = function(value) {
		value = value.replace(/(#|0x)?([0-9A-F]{3,6})$/gi, "$2");
		if (value.length == 3) {
			value = value.charAt(0) + value.charAt(0) + value.charAt(1) + value.charAt(1) + value.charAt(2) + value.charAt(2);
		}
		return parseInt(value, 16);
	}


})(jwplayer.utils);
/**
 * JW Player Touch Framework
 *
 * @author sanil
 * @version 6.6
 */

(function(utils) {

    var TOUCH_MOVE = "touchmove",
        TOUCH_START = "touchstart",
        TOUCH_END = "touchend",
        TOUCH_CANCEL = "touchcancel";

    utils.touch = function(elem) {
        var _elem = elem,
            _isListening = false,
            _handlers = {},
            _startEvent = null,
            _gotMove = false, 
            _events = utils.touchEvents;

        document.addEventListener(TOUCH_MOVE, touchHandler);
        document.addEventListener(TOUCH_END, documentEndHandler);
        document.addEventListener(TOUCH_CANCEL, touchHandler);
        elem.addEventListener(TOUCH_START, touchHandler);
        elem.addEventListener(TOUCH_END, touchHandler);

        function documentEndHandler(evt) {
            if(_isListening) {
                if(_gotMove) {
                    triggerEvent(_events.DRAG_END, evt);
                }
            }
            _gotMove = false;
            _isListening = false;
            _startEvent = null; 
        }

        function touchHandler(evt) {
            if(evt.type == TOUCH_START) {
                _isListening = true;
                _startEvent = createEvent(_events.DRAG_START, evt);
            }
            else if(evt.type == TOUCH_MOVE) {
                if(_isListening) {
                    if(_gotMove) {
                        triggerEvent(_events.DRAG, evt);
                    }
                    else {
                        triggerEvent(_events.DRAG_START, evt, _startEvent);
                        _gotMove = true;
                        triggerEvent(_events.DRAG, evt);
                    }
                }
            }
            else {
                if(_isListening) {
                    if(_gotMove) {
                        triggerEvent(_events.DRAG_END, evt);
                    }
                    else {
                        // This allows the controlbar/dock/logo tap events not to be forwarded to the view
                        evt.cancelBubble = true;
                        triggerEvent(_events.TAP, evt);
                    }
                }
                _gotMove = false;
                _isListening = false;
                _startEvent = null;
            }
        }

        function triggerEvent(type, srcEvent, finalEvt) {
            if(_handlers[type]) {
                preventDefault(srcEvent);
                var evt = finalEvt ? finalEvt : createEvent(type, srcEvent);
                if (evt) {
                    _handlers[type](evt);
                }
            }
        }

        function createEvent(type, srcEvent) {
            var touch = null;
            if(srcEvent.touches && srcEvent.touches.length) {
                touch = srcEvent.touches[0];
            }
            else if(srcEvent.changedTouches && srcEvent.changedTouches.length) {
                touch = srcEvent.changedTouches[0];   
            }
            if(!touch) {
                return null;
            }
            var rect = _elem.getBoundingClientRect();
            var evt = {
                type: type,
                target: _elem,
                x: ((touch.pageX - window.pageXOffset) - rect.left),
                y: touch.pageY,
                deltaX: 0,
                deltaY: 0
            };
            if(type != _events.TAP && _startEvent) {
                evt.deltaX = evt.x - _startEvent.x;
                evt.deltaY = evt.y - _startEvent.y;
            }
            return evt;
        }
        
        function preventDefault(evt) {
             if(evt.preventManipulation) {
                evt.preventManipulation();
            }
            if(evt.preventDefault) {
                evt.preventDefault();
            }
        }

        this.addEventListener = function(type, handler) {
            _handlers[type] = handler;
        };

        this.removeEventListener = function(type) {
            delete _handlers[type];
        };

        return this;
    };

})(jwplayer.utils);/**
 * Event namespace defintion for the JW Player
 * 
 * @author pablo
 * @version 6.0
 */
(function(utils) {
	utils.touchEvents = {
		DRAG: "jwplayerDrag",
        DRAG_START: "jwplayerDragStart",
        DRAG_END: "jwplayerDragEnd",
        TAP: "jwplayerTap"
	};

})(jwplayer.utils);
/**
 * Event namespace defintion for the JW Player
 * 
 * @author pablo
 * @version 6.0
 */
(function(jwplayer) {
	jwplayer.events = {
		// General Events
		COMPLETE : 'COMPLETE',
		ERROR : 'ERROR',

		// API Events
		API_READY : 'jwplayerAPIReady',
		JWPLAYER_READY : 'jwplayerReady',
		JWPLAYER_FULLSCREEN : 'jwplayerFullscreen',
		JWPLAYER_RESIZE : 'jwplayerResize',
		JWPLAYER_ERROR : 'jwplayerError',
		JWPLAYER_SETUP_ERROR : 'jwplayerSetupError',

		// Media Events
		JWPLAYER_MEDIA_BEFOREPLAY : 'jwplayerMediaBeforePlay',
		JWPLAYER_MEDIA_BEFORECOMPLETE : 'jwplayerMediaBeforeComplete',
		JWPLAYER_COMPONENT_SHOW : 'jwplayerComponentShow',
		JWPLAYER_COMPONENT_HIDE : 'jwplayerComponentHide',
		JWPLAYER_MEDIA_BUFFER : 'jwplayerMediaBuffer',
		JWPLAYER_MEDIA_BUFFER_FULL : 'jwplayerMediaBufferFull',
		JWPLAYER_MEDIA_ERROR : 'jwplayerMediaError',
		JWPLAYER_MEDIA_LOADED : 'jwplayerMediaLoaded',
		JWPLAYER_MEDIA_COMPLETE : 'jwplayerMediaComplete',
		JWPLAYER_MEDIA_SEEK : 'jwplayerMediaSeek',
		JWPLAYER_MEDIA_TIME : 'jwplayerMediaTime',
		JWPLAYER_MEDIA_VOLUME : 'jwplayerMediaVolume',
		JWPLAYER_MEDIA_META : 'jwplayerMediaMeta',
		JWPLAYER_MEDIA_MUTE : 'jwplayerMediaMute',
		JWPLAYER_MEDIA_LEVELS: 'jwplayerMediaLevels',
		JWPLAYER_MEDIA_LEVEL_CHANGED: 'jwplayerMediaLevelChanged',
		JWPLAYER_CAPTIONS_CHANGED: 'jwplayerCaptionsChanged',
		JWPLAYER_CAPTIONS_LIST: 'jwplayerCaptionsList',
        JWPLAYER_CAPTIONS_LOADED: 'jwplayerCaptionsLoaded',


		// State events
		JWPLAYER_PLAYER_STATE : 'jwplayerPlayerState',
		state : {
			BUFFERING : 'BUFFERING',
			IDLE : 'IDLE',
			PAUSED : 'PAUSED',
			PLAYING : 'PLAYING'
		},

		// Playlist Events
		JWPLAYER_PLAYLIST_LOADED : 'jwplayerPlaylistLoaded',
		JWPLAYER_PLAYLIST_ITEM : 'jwplayerPlaylistItem',
		JWPLAYER_PLAYLIST_COMPLETE : 'jwplayerPlaylistComplete',

		// Display CLick
		JWPLAYER_DISPLAY_CLICK : 'jwplayerViewClick',

		// Controls show/hide 
	 	JWPLAYER_CONTROLS : 'jwplayerViewControls', 
	 	JWPLAYER_USER_ACTION : 'jwplayerUserAction', 

		// Instream events
		JWPLAYER_INSTREAM_CLICK : 'jwplayerInstreamClicked',
		JWPLAYER_INSTREAM_DESTROYED : 'jwplayerInstreamDestroyed',

		// Ad events
		JWPLAYER_AD_TIME: "jwplayerAdTime",
		JWPLAYER_AD_ERROR: "jwplayerAdError",
		JWPLAYER_AD_CLICK: "jwplayerAdClicked",
		JWPLAYER_AD_COMPLETE: "jwplayerAdComplete",
		JWPLAYER_AD_IMPRESSION: "jwplayerAdImpression",
		JWPLAYER_AD_COMPANIONS: "jwplayerAdCompanions",
		JWPLAYER_AD_SKIPPED: "jwplayerAdSkipped"
	};

})(jwplayer);
/**
 * Event dispatcher for the JW Player
 *
 * @author zach
 * @modified pablo
 * @version 6.0
 */
(function(jwplayer) {
	var events = jwplayer.events,
		_utils = jwplayer.utils; 
	
	events.eventdispatcher = function(id, debug) {
		var _id = id,
			_debug = debug,
			_listeners,
			_globallisteners;
		
		/** Clears all event listeners **/
		this.resetEventListeners = function() {
			_listeners = {};
			_globallisteners = [];
		};
		
		this.resetEventListeners();
		
		/** Add an event listener for a specific type of event. **/
		this.addEventListener = function(type, listener, count) {
			try {
				if (!_utils.exists(_listeners[type])) {
					_listeners[type] = [];
				}
				
				if (_utils.typeOf(listener) == "string") {
					listener = ( new Function( 'return ' + listener ) )();
				}
				_listeners[type].push({
					listener: listener,
					count: count || null
				});
			} catch (err) {
				_utils.log("error", err);
			}
			return false;
		};
		
		/** Remove an event listener for a specific type of event. **/
		this.removeEventListener = function(type, listener) {
			if (!_listeners[type]) {
				return;
			}
			try {
				for (var listenerIndex = 0; listenerIndex < _listeners[type].length; listenerIndex++) {
					if (_listeners[type][listenerIndex].listener.toString() == listener.toString()) {
						_listeners[type].splice(listenerIndex, 1);
						break;
					}
				}
			} catch (err) {
				_utils.log("error", err);
			}
			return false;
		};
		
		/** Add an event listener for all events. **/
		this.addGlobalListener = function(listener, count) {
			try {
				if (_utils.typeOf(listener) == "string") {
					listener = ( new Function( 'return ' + listener ) )();
				}
				_globallisteners.push({
					listener: listener,
					count: count || null
				});
			} catch (err) {
				_utils.log("error", err);
			}
			return false;
		};
		
		/** Add an event listener for all events. **/
		this.removeGlobalListener = function(listener) {
			if (!listener) {
				return;
			}
			try {
				for (var index = _globallisteners.length; index--;) {
					if (_globallisteners[index].listener.toString() == listener.toString()) {
						_globallisteners.splice(index, 1);
					}
				}
			} catch (err) {
				_utils.log("error", err);
			}
			return false;
		};
		
		
		/** Send an event **/
		this.sendEvent = function(type, data) {
			if (!_utils.exists(data)) {
				data = {};
			}
			_utils.extend(data, {
				id: _id,
				version: jwplayer.version,
				type: type
			});
			if (_debug) {
				_utils.log(type, data);
			}
			dispatchEvent(_listeners[type], data, type);
			dispatchEvent(_globallisteners, data, type);
		};

		function dispatchEvent(listeners, data, type) {
			if (!listeners) {
				return;
			}
			for (var index = 0; index < listeners.length; index++) {
				var listener = listeners[index];
				if (listener) {
					if (listener.count !== null && --listener.count === 0) {
						delete listeners[index];
					}
					try {
						listener.listener(data);
					} catch (err) {
						_utils.log('Error handling "'+ type +'" event listener ['+ index +']: '+ err.toString(), listener.listener, data);
					}
				}
			}
		}
	};
})(window.jwplayer);
/**
 * Plugin package definition
 * @author zach
 * @version 5.5
 */
(function(jwplayer) {
	var _plugins = {},	
		_pluginLoaders = {};
	
	jwplayer.plugins = function() {
	}
	
	jwplayer.plugins.loadPlugins = function(id, config) {
		_pluginLoaders[id] = new jwplayer.plugins.pluginloader(new jwplayer.plugins.model(_plugins), config);
		return _pluginLoaders[id];
	}
	
	jwplayer.plugins.registerPlugin = function(id, target, arg1, arg2) {
		var pluginId = jwplayer.utils.getPluginName(id);
		if (!_plugins[pluginId]) {
			_plugins[pluginId] = new jwplayer.plugins.plugin(id);
		}
		_plugins[pluginId].registerPlugin(id, target, arg1, arg2);
	}
})(jwplayer);
/**
 * Model that manages all plugins
 * @author zach
 * @version 5.5
 */
(function(jwplayer) {		
	jwplayer.plugins.model = function(plugins) {
		this.addPlugin = function(url) {
			var pluginName = jwplayer.utils.getPluginName(url);
			if (!plugins[pluginName]) {
				plugins[pluginName] = new jwplayer.plugins.plugin(url);
			}
			return plugins[pluginName];
		}
		this.getPlugins = function() {
			return plugins;
		}
	}
})(jwplayer);
/**
 * Internal plugin model
 * @author zach
 * @version 5.8
 */
(function(plugins) {
	var utils = jwplayer.utils, events = jwplayer.events, UNDEFINED = "undefined";
	
	plugins.pluginmodes = {
		FLASH: 0,
		JAVASCRIPT: 1,
		HYBRID: 2
	}
	
	plugins.plugin = function(url) {
		var _status = utils.loaderstatus.NEW,
			_flashPath,
			_js,
			_target,
			_completeTimeout;
		
		var _eventDispatcher = new events.eventdispatcher();
		utils.extend(this, _eventDispatcher);
		
		function getJSPath() {
			switch (utils.getPluginPathType(url)) {
				case utils.pluginPathType.ABSOLUTE:
					return url;
				case utils.pluginPathType.RELATIVE:
					return utils.getAbsolutePath(url, window.location.href);
			}
		}
		
		function completeHandler(evt) {
			_completeTimeout = setTimeout(function(){
				_status = utils.loaderstatus.COMPLETE;
				_eventDispatcher.sendEvent(events.COMPLETE);		
			}, 1000);
		}
		
		function errorHandler(evt) {
			_status = utils.loaderstatus.ERROR;
			_eventDispatcher.sendEvent(events.ERROR);
		}
		
		this.load = function() {
			if (_status == utils.loaderstatus.NEW) {
				if (url.lastIndexOf(".swf") > 0) {
					_flashPath = url;
					_status = utils.loaderstatus.COMPLETE;
					_eventDispatcher.sendEvent(events.COMPLETE);
					return;
				} else if (utils.getPluginPathType(url) == utils.pluginPathType.CDN) {
					_status = utils.loaderstatus.COMPLETE;
					_eventDispatcher.sendEvent(events.COMPLETE);
					return;
				}
				_status = utils.loaderstatus.LOADING;
				var _loader = new utils.scriptloader(getJSPath());
				// Complete doesn't matter - we're waiting for registerPlugin 
				_loader.addEventListener(events.COMPLETE, completeHandler);
				_loader.addEventListener(events.ERROR, errorHandler);
				_loader.load();
			}
		}
		
		this.registerPlugin = function(id, target, arg1, arg2) {
			if (_completeTimeout){
				clearTimeout(_completeTimeout);
				_completeTimeout = undefined;
			}
			_target = target;
			if (arg1 && arg2) {
				_flashPath = arg2;
				_js = arg1;
			} else if (typeof arg1 == "string") {
				_flashPath = arg1;
			} else if (typeof arg1 == "function") {
				_js = arg1;
			} else if (!arg1 && !arg2) {
				_flashPath = id;
			}
			_status = utils.loaderstatus.COMPLETE;
			_eventDispatcher.sendEvent(events.COMPLETE);
		}
		
		this.getStatus = function() {
			return _status;
		}
		
		this.getPluginName = function() {
			return utils.getPluginName(url);
		}
		
		this.getFlashPath = function() {
			if (_flashPath) {
				switch (utils.getPluginPathType(_flashPath)) {
					case utils.pluginPathType.ABSOLUTE:
						return _flashPath;
					case utils.pluginPathType.RELATIVE:
						if (url.lastIndexOf(".swf") > 0) {
							return utils.getAbsolutePath(_flashPath, window.location.href);
						}
						return utils.getAbsolutePath(_flashPath, getJSPath());
//					case utils.pluginPathType.CDN:
//						if (_flashPath.indexOf("-") > -1){
//							return _flashPath+"h";
//						}
//						return _flashPath+"-h";
				}
			}
			return null;
		}
		
		this.getJS = function() {
			return _js;
		}
		
		this.getTarget = function() {
			return _target;
		}

		this.getPluginmode = function() {
			if (typeof _flashPath != UNDEFINED
			 && typeof _js != UNDEFINED) {
			 	return plugins.pluginmodes.HYBRID;
			 } else if (typeof _flashPath != UNDEFINED) {
			 	return plugins.pluginmodes.FLASH;
			 } else if (typeof _js != UNDEFINED) {
			 	return plugins.pluginmodes.JAVASCRIPT;
			 }
		}
		
		this.getNewInstance = function(api, config, div) {
			return new _js(api, config, div);
		}
		
		this.getURL = function() {
			return url;
		}
	}
	
})(jwplayer.plugins);
/**
 * Loads plugins for a player
 * @author zach
 * @version 5.6
 */
(function(jwplayer) {
	var utils = jwplayer.utils, 
		events = jwplayer.events,
		_foreach = utils.foreach;

	jwplayer.plugins.pluginloader = function(model, config) {
		var _status = utils.loaderstatus.NEW,
			_loading = false,
			_iscomplete = false,
			_errorState = false,
			_errorMessage,
			_config = config,
			_eventDispatcher = new events.eventdispatcher();
		
		
		utils.extend(this, _eventDispatcher);
		
		/*
		 * Plugins can be loaded by multiple players on the page, but all of them use
		 * the same plugin model singleton. This creates a race condition because
		 * multiple players are creating and triggering loads, which could complete
		 * at any time. We could have some really complicated logic that deals with
		 * this by checking the status when it's created and / or having the loader
		 * redispatch its current status on load(). Rather than do this, we just check
		 * for completion after all of the plugins have been created. If all plugins
		 * have been loaded by the time checkComplete is called, then the loader is
		 * done and we fire the complete event. If there are new loads, they will
		 * arrive later, retriggering the completeness check and triggering a complete
		 * to fire, if necessary.
		 */
		function _complete() {
			if (_errorState) {
				_eventDispatcher.sendEvent(events.ERROR, {message: _errorMessage});
			} else if (!_iscomplete) {
				_iscomplete = true;
				_status = utils.loaderstatus.COMPLETE;
				_eventDispatcher.sendEvent(events.COMPLETE);
			}
		}
		
		// This is not entirely efficient, but it's simple
		function _checkComplete() {
			if (!_config) _complete();
			if (!_iscomplete && !_errorState) {
				var incomplete = 0, plugins = model.getPlugins();
				
				utils.foreach(_config, function(plugin, val) {
					var pluginName = utils.getPluginName(plugin),
						pluginObj = plugins[pluginName],
						js = pluginObj.getJS(),
						target = pluginObj.getTarget(),
						status = pluginObj.getStatus(); 

					if (status == utils.loaderstatus.LOADING || status == utils.loaderstatus.NEW) {
						incomplete++;
					} else if (js && (!target || parseFloat(target) > parseFloat(jwplayer.version))) {
						_errorState = true;
						_errorMessage = "Incompatible player version";
						_complete();
					}
				});
				
				if (incomplete == 0) {
					_complete();
				}
			}
		}
		
		this.setupPlugins = function(api, config, resizer) {
			var flashPlugins = {
				length: 0,
				plugins: {}
			},
			jsplugins = {
				length: 0,
				plugins: {}
			},

			plugins = model.getPlugins();
			
			_foreach(config.plugins, function(plugin, pluginConfig) {
				var pluginName = utils.getPluginName(plugin),
					pluginObj = plugins[pluginName],
					flashPath = pluginObj.getFlashPath(),
					jsPlugin = pluginObj.getJS(),
					pluginURL = pluginObj.getURL();
				

				if (flashPath) {
					flashPlugins.plugins[flashPath] = utils.extend({}, pluginConfig);
					flashPlugins.plugins[flashPath].pluginmode = pluginObj.getPluginmode();
					flashPlugins.length++;
				}

				try {
					if (jsPlugin && config.plugins && config.plugins[pluginURL]) {
						var div = document.createElement("div");
						div.id = api.id + "_" + pluginName;
						div.style.position = "absolute";
						div.style.top = 0;
						div.style.zIndex = jsplugins.length + 10;
						jsplugins.plugins[pluginName] = pluginObj.getNewInstance(api, utils.extend({}, config.plugins[pluginURL]), div);
						jsplugins.length++;
						api.onReady(resizer(jsplugins.plugins[pluginName], div, true));
						api.onResize(resizer(jsplugins.plugins[pluginName], div));
					}
				}
				catch (err) {
					utils.log ("ERROR: Failed to load " + pluginName + ".");
				}
			});
			
			api.plugins = jsplugins.plugins;
			
			return flashPlugins;
		};
		
		this.load = function() {
			// Must be a hash map
			if (utils.exists(config) && utils.typeOf(config) != "object") {
				_checkComplete();
				return;
			}
			
			_status = utils.loaderstatus.LOADING;
			_loading = true;
			
			/** First pass to create the plugins and add listeners **/
			_foreach(config, function(plugin, val) {
				if (utils.exists(plugin)) {
					var pluginObj = model.addPlugin(plugin);
					pluginObj.addEventListener(events.COMPLETE, _checkComplete);
					pluginObj.addEventListener(events.ERROR, _pluginError);
				}
			});
			
			var plugins = model.getPlugins();
			
			/** Second pass to actually load the plugins **/
			_foreach(plugins, function(plugin, pluginObj) {
				// Plugin object ensures that it's only loaded once
				pluginObj.load();
			});
			
			_loading = false;
			
			// Make sure we're not hanging around waiting for plugins that already finished loading
			_checkComplete();
		}
		
		var _pluginError = this.pluginFailed = function(evt) {
			if (!_errorState) {
				_errorState = true;
				_errorMessage = "File not found";
				_complete();
			}
		}
		
		this.getStatus = function() {
			return _status;
		}
		
	}
})(jwplayer);
/**
 * Parsers namespace declaration
 * 
 * @author pablo
 * @version 6.0
 */
(function(html5) {
	jwplayer.parsers = {
		localName : function(node) {
			if (!node) {
				return "";
			} else if (node.localName) {
				return node.localName;
			} else if (node.baseName) {
				return node.baseName;
			} else {
				return "";
			}
		},
		textContent : function(node) {
			if (!node) {
				return "";
			} else if (node.textContent) {
				return jwplayer.utils.trim(node.textContent);
			} else if (node.text) {
				return jwplayer.utils.trim(node.text);
			} else {
				return "";
			}
		},
		getChildNode : function(parent, index) {
			return parent.childNodes[index];
		},
		numChildren : function(parent) {
			if (parent.childNodes) {
				return parent.childNodes.length;
			} else {
				return 0;
			}
		}

	};
})(jwplayer);
/**
 * Parse a feed item for JWPlayer content.
 * 
 * @author zach
 * @modified pablo
 * @version 6.0
 */
(function(jwplayer) {
	var _parsers = jwplayer.parsers;
	
	var jwparser = _parsers.jwparser = function() {
	};

	var PREFIX = 'jwplayer';

	/**
	 * Parse a feed entry for JWPlayer content.
	 * 
	 * @param {XML}
	 *            obj The XML object to parse.
	 * @param {Object}
	 *            itm The playlistentry to amend the object to.
	 * @return {Object} The playlistentry, amended with the JWPlayer info.
	 */
	jwparser.parseEntry = function(obj, itm) {
		var sources = [],
			tracks = [],
			_xmlAttribute = jwplayer.utils.xmlAttribute,
			def = "default",
			label = "label",
			file = "file",
			type = "type";
		for ( var i = 0; i < obj.childNodes.length; i++) {
			var node = obj.childNodes[i];
			if (node.prefix == PREFIX) {
				var _localName = _parsers.localName(node);
				if (_localName == "source") {
					delete itm.sources;
					sources.push({
						file: _xmlAttribute(node, file),
						"default": _xmlAttribute(node, def),
						label: _xmlAttribute(node, label),
						type: _xmlAttribute(node, type)
					});
				}
				else if (_localName == "track") {
					delete itm.tracks;
					tracks.push({
						file: _xmlAttribute(node, file),
						"default": _xmlAttribute(node, def),
						kind: _xmlAttribute(node, "kind"),
						label: _xmlAttribute(node, label)
					});
				}
				else {
					itm[_localName] = jwplayer.utils.serialize(_parsers.textContent(node));
					if (_localName == "file" && itm.sources) {
						// jwplayer namespace file should override existing source
						// (probably set in MediaParser)
						delete itm.sources;
					}
				}
				
			}
			if (!itm[file]) {
				itm[file] = itm['link'];
			}
		}


		if (sources.length) {
			itm.sources = [];
			for (i = 0; i < sources.length; i++) {
				if (sources[i].file.length > 0) {
					sources[i][def] = (sources[i][def] == "true") ? true : false;
					if (!sources[i].label.length) { 
						delete sources[i].label;
					}
					itm.sources.push(sources[i]);
				}
			}
		}

		if (tracks.length) {
			itm.tracks = [];
			for (i = 0; i < tracks.length; i++) {
				if (tracks[i].file.length > 0) {
					tracks[i][def] = (tracks[i][def] == "true") ? true : false;
					tracks[i].kind = (!tracks[i].kind.length) ? "captions" : tracks[i].kind;
					if (!tracks[i].label.length) {
						delete tracks[i].label;
					}
					itm.tracks.push(tracks[i]);
				}
			}
		}
		return itm;
	}
})(jwplayer);/**
 * Parse a MRSS group into a playlistitem (used in RSS and ATOM).
 *
 * author zach
 * modified pablo
 * version 6.0
 */
(function(parsers) {
	var utils = jwplayer.utils,
		_xmlAttribute = utils.xmlAttribute,
		_localName = parsers.localName,
		_textContent = parsers.textContent,
		_numChildren = parsers.numChildren;
	
	
	var mediaparser = parsers.mediaparser = function() {};
	
	/** Prefix for the MRSS namespace. **/
	var PREFIX = 'media';
	
	/**
	 * Parse a feeditem for Yahoo MediaRSS extensions.
	 * The 'content' and 'group' elements can nest other MediaRSS elements.
	 * @param	{XML}		obj		The entire MRSS XML object.
	 * @param	{Object}	itm		The playlistentry to amend the object to.
	 * @return	{Object}			The playlistentry, amended with the MRSS info.
	 **/
	mediaparser.parseGroup = function(obj, itm) {
		var node, 
			i,
			tracks = "tracks",
			captions = [];

		function getLabel(code) {
			var LANGS = { 
				"zh": "Chinese",
				"nl": "Dutch",
				"en": "English",
				"fr": "French",
				"de": "German",
				"it": "Italian",
				"ja": "Japanese",
				"pt": "Portuguese",
				"ru": "Russian",
				"es": "Spanish"
			};
			
			if(LANGS[code]) {
				return LANGS[code];
			}
			return code;
		}	

		for (i = 0; i < _numChildren(obj); i++) {
			node = obj.childNodes[i];
			if (node.prefix == PREFIX) {
				if (!_localName(node)){
					continue;
				}
				switch (_localName(node).toLowerCase()) {
					case 'content':
						//itm['file'] = _xmlAttribute(node, 'url');
						if (_xmlAttribute(node, 'duration')) {
							itm['duration'] = utils.seconds(_xmlAttribute(node, 'duration'));
						}
						if (_numChildren(node) > 0) {
							itm = mediaparser.parseGroup(node, itm);
						}
						if (_xmlAttribute(node, 'url')) {
							if (!itm.sources) {
								itm.sources = [];
							}
							itm.sources.push({
								file: _xmlAttribute(node, 'url'),
								type: _xmlAttribute(node, 'type'),
								width: _xmlAttribute(node, 'width'),
								label: _xmlAttribute(node, 'label')
							});
						}
						break;
					case 'title':
						itm['title'] = _textContent(node);
						break;
					case 'description':
						itm['description'] = _textContent(node);
						break;
					case 'guid':
						itm['mediaid'] = _textContent(node);
						break;
					case 'thumbnail':
						if (!itm['image']) {
							itm['image'] = _xmlAttribute(node, 'url');
						}
						break;
					case 'player':
						var url = node.url;
						break;
					case 'group':
						mediaparser.parseGroup(node, itm);
						break;
					case 'subtitle':
						var entry = {};
						entry.file = _xmlAttribute(node, 'url');
						entry.kind = "captions";
						if (_xmlAttribute(node, 'lang').length > 0) {
							entry.label = getLabel(_xmlAttribute(node, 'lang'));
						}
						captions.push(entry);
				}
			}
		}

		if (!itm.hasOwnProperty(tracks)) {
			itm[tracks] = [];
		}

		for(i = 0; i < captions.length; i++) {
			itm[tracks].push(captions[i]);
		}

		return itm;
	}
	
})(jwplayer.parsers);
/**
 * Parse an RSS feed and translate it to a playlist.
 *
 * @author zach
 * @modified pablo
 * @version 6.0
 */
(function(parsers) {
	var utils = jwplayer.utils,
		_textContent = parsers.textContent,
		_getChildNode = parsers.getChildNode,
		_numChildren = parsers.numChildren,
		_localName = parsers.localName;
	
	parsers.rssparser = {};
	
	
	/**
	 * Parse an RSS playlist for feed items.
	 *
	 * @param {XML} dat
	 * @reuturn {Array} playlistarray
	 */
	parsers.rssparser.parse = function(dat) {
		var arr = [];
		for (var i = 0; i < _numChildren(dat); i++) {
			var node = _getChildNode(dat, i),
				localName = _localName(node).toLowerCase();
			if (localName == 'channel') {
				for (var j = 0; j < _numChildren(node); j++) {
					var subNode = _getChildNode(node, j);
					if (_localName(subNode).toLowerCase() == 'item') {
						arr.push(_parseItem(subNode));
					}
				}
			}
		}
		return arr;
	};
		
		
	/** 
	 * Translate RSS item to playlist item.
	 *
	 * @param {XML} obj
	 * @return {PlaylistItem} PlaylistItem
	 */
	function _parseItem(obj) {
		var itm = {};
		for (var i = 0; i < obj.childNodes.length; i++) {
			var node = obj.childNodes[i];
			var localName = _localName(node);
			if (!localName){
				continue;
			}
			switch (localName.toLowerCase()) {
				case 'enclosure':
					itm['file'] = utils.xmlAttribute(node, 'url');
					break;
				case 'title':
					itm['title'] = _textContent(node);
					break;
				case 'guid':
					itm['mediaid'] = _textContent(node);
					break;
				case 'pubdate':
					itm['date'] = _textContent(node);
					break;
				case 'description':
					itm['description'] = _textContent(node);
					break;
				case 'link':
					itm['link'] = _textContent(node);
					break;
				case 'category':
					if (itm['tags']) {
						itm['tags'] += _textContent(node);
					} else {
						itm['tags'] = _textContent(node);
					}
					break;
			}
		}
		itm = parsers.mediaparser.parseGroup(obj, itm);
		itm = parsers.jwparser.parseEntry(obj, itm);

		return new jwplayer.playlist.item(itm);
	}


	
	
})(jwplayer.parsers);
/**
 * JW Player playlist model
 *
 * @author zach
 * @modified pablo
 * @version 6.0
 */
(function(jwplayer) {
	jwplayer.playlist = function(playlist) {
		var _playlist = [];
		if (jwplayer.utils.typeOf(playlist) == "array") {
			for (var i=0; i < playlist.length; i++) {
				_playlist.push(new jwplayer.playlist.item(playlist[i]));
			}
		} else {
			_playlist.push(new jwplayer.playlist.item(playlist));
		}
		return _playlist;
	};
	
})(jwplayer);
/**
 * JW Player playlist item model
 *
 * @author zach
 * @modified pablo
 * @version 6.0
 */
(function(playlist) {
	var _item = playlist.item = function(config) {
		var utils = jwplayer.utils,
			_playlistitem = utils.extend({}, _item.defaults, config);
		_playlistitem.tracks = (config && utils.exists(config.tracks)) ? config.tracks : [];

		if (_playlistitem.sources.length == 0) {
			_playlistitem.sources = [new playlist.source(_playlistitem)];
		}

		/** Each source should be a named object **/
		for (var i=0; i < _playlistitem.sources.length; i++) {
			var def = _playlistitem.sources[i]["default"];
			if (def) {
				_playlistitem.sources[i]["default"] = (def.toString() == "true");
			}
			else {
				_playlistitem.sources[i]["default"] = false;	
			}

			_playlistitem.sources[i] = new playlist.source(_playlistitem.sources[i]);
		}

		if (_playlistitem.captions && !utils.exists(config.tracks)) {
			for (var j = 0; j < _playlistitem.captions.length; j++) {
				_playlistitem.tracks.push(_playlistitem.captions[j]);
			}
			delete _playlistitem.captions;
		}

		for (var i=0; i < _playlistitem.tracks.length; i++) {
			_playlistitem.tracks[i] = new playlist.track(_playlistitem.tracks[i]);
		}
		return _playlistitem;
	};
	
	_item.defaults = {
		description: "",
		image: "",
		mediaid: "",
		title: "",
		sources: [],
		tracks: []
	};
	
})(jwplayer.playlist);/**
 * JW Player playlist loader
 *
 * @author pablo
 * @version 6.0
 */
(function(playlist) {
	var _jw = jwplayer, utils = _jw.utils, events = _jw.events, parsers = _jw.parsers;

	playlist.loader = function() {
		var _eventDispatcher = new events.eventdispatcher();
		utils.extend(this, _eventDispatcher);
		
		this.load = function(playlistfile) {
			utils.ajax(playlistfile, _playlistLoaded, _playlistLoadError);
		}
		
		function _playlistLoaded(loadedEvent) {
			try {
				var childNodes = loadedEvent.responseXML.childNodes;
				var rss = "";
				for (var i = 0; i < childNodes.length; i++) {
					rss = childNodes[i];
					if (rss.nodeType != 8) { // 8: Node.COMMENT_NODE (IE8 doesn't have the Node.COMMENT_NODE constant)
						break;
					}
				}
				
				if (parsers.localName(rss) == "xml") {
					rss = rss.nextSibling;
				}
				
				if (parsers.localName(rss) != "rss") {
					_playlistError("Not a valid RSS feed");
					return;
				}
				
				var pl = new playlist(parsers.rssparser.parse(rss));
				_eventDispatcher.sendEvent(events.JWPLAYER_PLAYLIST_LOADED, {
					playlist: pl
				});
			} catch (e) {
				_playlistError();
			}
		}
		
		function _playlistLoadError(err) {
			_playlistError(err.match(/invalid/i) ? "Not a valid RSS feed" : "");
		}
		
		function _playlistError(msg) {
			_eventDispatcher.sendEvent(events.JWPLAYER_ERROR, {
				message: msg ? msg : 'Error loading file'
			});
		}
	}
})(jwplayer.playlist);/**
 * JW Player playlist item source
 *
 * @author pablo
 * @version 6.0
 */
(function(playlist) {
	var UNDEF = undefined,
		utils = jwplayer.utils,
		defaults = {
			file: UNDEF,
			label: UNDEF,
			type: UNDEF,
			"default": UNDEF
		};
	
	playlist.source = function(config) {
		var _source = utils.extend({}, defaults);
		
		utils.foreach(defaults, function(property, value) {
			if (utils.exists(config[property])) {
				_source[property] = config[property];
				// Actively move from config to source
				delete config[property];
			}
		});
		
		if (_source.type && _source.type.indexOf("/") > 0) {
			_source.type = utils.extensionmap.mimeType(_source.type);
		}
		if (_source.type == "m3u8") _source.type = "hls";
		if (_source.type == "smil") _source.type = "rtmp";
		return _source;
	};
	
})(jwplayer.playlist);
/**
 * JW Player playlist item track
 *
 * @author sanil
 * @version 6.3
 */
(function(playlist) {
	var UNDEF = undefined,
		utils = jwplayer.utils,
		defaults = {
			file: UNDEF,
			label: UNDEF,
			kind: "captions",
			"default": false
		};
	
	playlist.track = function(config) {
		var _track = utils.extend({}, defaults);
		if (!config) config = {};
		
		utils.foreach(defaults, function(property, value) {
			if (utils.exists(config[property])) {
				_track[property] = config[property];
				// Actively move from config to track
				delete config[property];
			}
		});
		
		return _track;
	};
	
})(jwplayer.playlist);
/**
 * Embedder for the JW Player
 * @author Zach
 * @modified Pablo
 * @version 6.0
 */
(function(jwplayer) {
	var utils = jwplayer.utils,
		events = jwplayer.events,
		
		TRUE = true,
		FALSE = false,
		DOCUMENT = document;
	
	var embed = jwplayer.embed = function(playerApi) {
//		var mediaConfig = utils.mediaparser.parseMedia(playerApi.container);
		var _config = new embed.config(playerApi.config),
			_container, _oldContainer, _fallbackDiv,
			_width = _config.width,
			_height = _config.height,
			_errorText = "Error loading player: ",
			_pluginloader = jwplayer.plugins.loadPlugins(playerApi.id, _config.plugins),
			_playlistLoading = FALSE,
			_errorOccurred = FALSE,
			_setupErrorTimer = null,
			_this = this;

		if (_config.fallbackDiv) {
			_fallbackDiv = _config.fallbackDiv;
			delete _config.fallbackDiv;
		}
		_config.id = playerApi.id;
		_oldContainer = DOCUMENT.getElementById(playerApi.id);
		if (_config.aspectratio) {
			playerApi.config.aspectratio = _config.aspectratio;
		}
		else {
			delete playerApi.config.aspectratio;
		}
		_container = DOCUMENT.createElement("div");
		_container.id = _oldContainer.id;
		_container.style.width = _width.toString().indexOf("%") > 0 ? _width : (_width + "px");
		_container.style.height = _height.toString().indexOf("%") > 0 ? _height : (_height + "px");
		_oldContainer.parentNode.replaceChild(_container, _oldContainer);
		
		function _setupEvents(api, events) {
			utils.foreach(events, function(evt, val) {
				if (typeof api[evt] == "function") {
					(api[evt]).call(api, val);
				}
			});
		}
		
		_this.embed = function() {
			if (_errorOccurred) return;

			_pluginloader.addEventListener(events.COMPLETE, _doEmbed);
			_pluginloader.addEventListener(events.ERROR, _pluginError);
			_pluginloader.load();
		};
		
		function _doEmbed() {
			if (_errorOccurred) return;

			if (utils.typeOf(_config.playlist) == "array" && _config.playlist.length < 2) {
				if (_config.playlist.length == 0 || !_config.playlist[0].sources || _config.playlist[0].sources.length == 0) {
					_sourceError();
					return;
				}
			}
			
			if (_playlistLoading) return;
			
			if (utils.typeOf(_config.playlist) == "string") {
				var loader = new jwplayer.playlist.loader();
				loader.addEventListener(events.JWPLAYER_PLAYLIST_LOADED, function(evt) {
					_config.playlist = evt.playlist;
					_playlistLoading = FALSE;
					_doEmbed();
				});
				loader.addEventListener(events.JWPLAYER_ERROR, function(evt) {
					_playlistLoading = FALSE;
					_sourceError(evt);
				});
				_playlistLoading = TRUE;
				loader.load(_config.playlist);
				return;
			}

			if (_pluginloader.getStatus() == utils.loaderstatus.COMPLETE) {
				for (var mode = 0; mode < _config.modes.length; mode++) {
					if (_config.modes[mode].type && embed[_config.modes[mode].type]) {
						var configClone = utils.extend({}, _config),
							embedder = new embed[_config.modes[mode].type](_container, _config.modes[mode], configClone, _pluginloader, playerApi);

						if (embedder.supportsConfig()) {
							embedder.addEventListener(events.ERROR, _embedError);
							embedder.embed();
							_setupEvents(playerApi, configClone.events);
							return playerApi;
						}
					}
				}
				var message;
				if (_config.fallback) {
					message = "No suitable players found and fallback enabled";
					_setupErrorTimer = setTimeout(function() {
						_dispatchSetupError(message, TRUE);
					}, 10);
					utils.log(message);
					new embed.download(_container, _config, _sourceError);
				} else {
					message = "No suitable players found and fallback disabled";
					_dispatchSetupError(message, FALSE);
					utils.log(message);
					_replaceContainer();
				}
				
			}
		}
		
		function _replaceContainer() {
			_container.parentNode.replaceChild(_fallbackDiv, _container);
		}
		
		function _embedError(evt) {
			_errorScreen(_errorText + evt.message);
		}
		
		function _pluginError(evt) {
			_errorScreen("Could not load plugins: " + evt.message);
		}
		
		function _sourceError(evt) {
			if (evt && evt.message) {
				_errorScreen("Error loading playlist: " + evt.message);
			} else {
				_errorScreen(_errorText  + "No playable sources found");
			}
		}

		function _dispatchSetupError(message, fallback) {
			if (_setupErrorTimer) {
				clearTimeout(_setupErrorTimer);
				_setupErrorTimer = null;
			}
			_setupErrorTimer = setTimeout(function() {
				_setupErrorTimer = null;
				playerApi.dispatchEvent(events.JWPLAYER_SETUP_ERROR, {message: message, fallback: fallback});
			}, 0);
		}	

		function _errorScreen(message) {
			if (_errorOccurred) return;

			if (!_config.fallback) {
				_dispatchSetupError(message, FALSE);
				return;
			}

			_errorOccurred = TRUE;
			_displayError(_container, message, _config);
			_dispatchSetupError(message, TRUE);
		}
		
		_this.errorScreen = _errorScreen;
		
		return _this;
	};

	function _displayError(container, message, config) {
		var style = container.style;
		style.backgroundColor = "#000";
		style.color = "#FFF";
		style.width = utils.styleDimension(config.width);
		style.height = utils.styleDimension(config.height);
		style.display = "table";
		style.opacity = 1;
		
		var text = document.createElement("p"),
			textStyle = text.style;	
		textStyle.verticalAlign = "middle";
		textStyle.textAlign = "center";
		textStyle.display = "table-cell";
		textStyle.font = "15px/20px Arial, Helvetica, sans-serif";
		text.innerHTML = message.replace(":", ":<br>");

		container.innerHTML = "";
		container.appendChild(text);
	}

	// Make this publicly accessible so the HTML5 player can error out on setup using the same code
	jwplayer.embed.errorScreen = _displayError;
	
})(jwplayer);
/**
 * Configuration for the JW Player Embedder
 * @author Zach
 * @modified Pablo
 * @version 6.0
 */
(function(jwplayer) {
	var utils = jwplayer.utils,
		embed = jwplayer.embed,
		playlistitem = jwplayer.playlist.item,
		UNDEFINED = undefined;

	var config = embed.config = function(config) {
		
		var _defaults = {
				fallback: true,
				height: 270,
				primary: "html5",
				width: 480,
				base: config.base ? config.base : utils.getScriptPath("jwplayer.js"),
				aspectratio: ""
			},
			_config = utils.extend(_defaults, jwplayer.defaults, config),
			_modes = {
			    html5: { type: "html5", src: _config.base + "jwplayer.html5.js" },
				flash: { type: "flash", src: _config.base + "jwplayer.flash.swf" }
			};

		// No longer allowing user-set modes block as of 6.0
		_config.modes = (_config.primary == "flash") ? [_modes.flash, _modes.html5] : [_modes.html5, _modes.flash]; 
		
		if (_config.listbar) {
			_config.playlistsize = _config.listbar.size;
			_config.playlistposition = _config.listbar.position;
			_config.playlistlayout = _config.listbar.layout;
		}
		
		if (_config.flashplayer) _modes.flash.src = _config.flashplayer;
		if (_config.html5player) _modes.html5.src = _config.html5player;
		
		_normalizePlaylist(_config);

		evaluateAspectRatio(_config);

		return _config;
	};

	function evaluateAspectRatio(config) {
		var ar = config.aspectratio,
			ratio = getRatio(ar);
		if (config.width.toString().indexOf("%") == -1) {
			delete config.aspectratio;	
		}
		else if (!ratio) {
			delete config.aspectratio;
		}
		else {
			config.aspectratio = ratio;	
		}
	}

	function getRatio(ar) {
		if (typeof ar != "string" || !utils.exists(ar)) return 0;
		var index = ar.indexOf(":");
		if (index == -1) return 0;
		var w = parseFloat(ar.substr(0,index)),
			h = parseFloat(ar.substr(index+1));
		if (w <= 0 || h <= 0) return 0;
		return (h/w * 100) + "%";
	}

	/** Appends a new configuration onto an old one; used for mode configuration **/
	config.addConfig = function(oldConfig, newConfig) {
		_normalizePlaylist(newConfig);
		return utils.extend(oldConfig, newConfig);
	}
	
	/** Construct a playlist from base-level config elements **/
	function _normalizePlaylist(config) {
		if (!config.playlist) {
			var singleItem = {};
			
			utils.foreach(playlistitem.defaults, function(itemProp, val) {
				_moveProperty(config, singleItem, itemProp);
			});

			if (!singleItem.sources) {
				if (config.levels) {
					singleItem.sources = config.levels;
					delete config.levels;
				} else {
					var singleSource = {};
					_moveProperty(config, singleSource, "file");
					_moveProperty(config, singleSource, "type");
					singleItem.sources = singleSource.file ? [singleSource] : [];
				}
			}
				
			config.playlist = [new playlistitem(singleItem)];
		} else {
			// Use JW Player playlist items to normalize sources of existing playlist items
			for (var i=0; i<config.playlist.length; i++) {
				config.playlist[i] = new playlistitem(config.playlist[i]);
			}
		}
	}
	
	function _moveProperty(sourceObj, destObj, property) {
		if (utils.exists(sourceObj[property])) {
			destObj[property] = sourceObj[property];
			delete sourceObj[property];
		}
	}
	
})(jwplayer);
/**
 * Download mode embedder for the JW Player
 * @author Zach
 * @version 5.5
 */
(function(jwplayer) {
	var embed = jwplayer.embed,
		utils = jwplayer.utils,

		DOCUMENT = document,
		
		JW_CSS_NONE = "none",
		JW_CSS_BLOCK = "block",
		JW_CSS_100PCT = "100%",
		JW_CSS_RELATIVE = "relative",
		JW_CSS_ABSOLUTE = "absolute";
	
	embed.download = function(_container, _options, _errorCallback) {
		var params = utils.extend({}, _options),
			_display,
			_width = params.width ? params.width : 480,
			_height = params.height ? params.height : 320,
			_file, 
			_image,
			_logo = _options.logo ? _options.logo : {
				prefix: utils.repo(),
				file: 'logo.png',
				margin: 10
			};


		function _embed() {
			var file, image, youtube, i, playlist = params.playlist, item, sources,
				types = ["mp4", "aac", "mp3", "m4r", "m4a"]; 
			if (playlist && playlist.length) {
				item = playlist[0];
				sources = item.sources;
				// If no downloadable files, and youtube, display youtube
				// If nothing, show error message
				for (i=0; i<sources.length; i++) {
					var source = sources[i], 
						type = source.type ? source.type : utils.extensionmap.extType(utils.extension(source.file));
					if (source.file) {
						// TODO: shouldn't be using same variable in nested loop...  Clean up at some point
						utils.foreach(types, function(i) {
							if (type == types[i]) {
								file = source.file;
								image = item.image;
							} else if (utils.isYouTube(source.file)) {
								youtube = source.file;
							}
						});

						if (file || youtube) continue;
					}
				}
			} else {
				return;
			}
			
			if (file) {
				_file = file;
				_image = image;
				_buildElements();
				_styleElements();
			} else if (youtube) {
				_embedYouTube(youtube);
			} else {
				_errorCallback();
			}
		}
		
		function _buildElements() {
			if (_container) {
				_display = _createElement("a", "display", _container);
				_createElement("div", "icon", _display);
				_createElement("div", "logo", _display);
				if (_file) {
					_display.setAttribute("href", utils.getAbsolutePath(_file));
				}
			}
		}
		
		function _css(selector, style) {
			var elements = DOCUMENT.querySelectorAll(selector);
			for (var i=0; i<elements.length; i++) {
				utils.foreach(style, function(prop, val) {
					elements[i].style[prop] = val;
				});
			}
		}
		
		function _styleElements() {
			var _prefix = "#" + _container.id + " .jwdownload";

			_container.style.width = "";
			_container.style.height = "";
			
			_css(_prefix+"display", {
				width: utils.styleDimension(Math.max(320, _width)),
				height: utils.styleDimension(Math.max(180, _height)),
				background: "black center no-repeat " + (_image ? 'url('+_image+')' : ""),
				backgroundSize: "contain",
				position: JW_CSS_RELATIVE,
				border: JW_CSS_NONE,
				display: JW_CSS_BLOCK
			});

			_css(_prefix+"display div", {
				position: JW_CSS_ABSOLUTE,
				width: JW_CSS_100PCT,
				height: JW_CSS_100PCT
			});

			_css(_prefix+"logo", {
				top: _logo.margin + "px",
				right: _logo.margin + "px",
				background: "top right no-repeat url(" + _logo.prefix + _logo.file + ")"
			});
			
			_css(_prefix+"icon", {
				background: "center no-repeat url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAYAAAA6/NlyAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAgNJREFUeNrs28lqwkAYB/CZqNVDDj2r6FN41QeIy8Fe+gj6BL275Q08u9FbT8ZdwVfotSBYEPUkxFOoks4EKiJdaDuTjMn3wWBO0V/+sySR8SNSqVRKIR8qaXHkzlqS9jCfzzWcTCYp9hF5o+59sVjsiRzcegSckFzcjT+ruN80TeSlAjCAAXzdJSGPFXRpAAMYwACGZQkSdhG4WCzehMNhqV6vG6vVSrirKVEw66YoSqDb7cqlUilE8JjHd/y1MQefVzqdDmiaJpfLZWHgXMHn8F6vJ1cqlVAkEsGuAn83J4gAd2RZymQygX6/L1erVQt+9ZPWb+CDwcCC2zXGJaewl/DhcHhK3DVj+KfKZrMWvFarcYNLomAv4aPRSFZVlTlcSPA5fDweW/BoNIqFnKV53JvncjkLns/n/cLdS+92O7RYLLgsKfv9/t8XlDn4eDyiw+HA9Jyz2eyt0+kY2+3WFC5hluej0Ha7zQQq9PPwdDq1Et1sNsx/nFBgCqWJ8oAK1aUptNVqcYWewE4nahfU0YQnk4ntUEfGMIU2m01HoLaCKbTRaDgKtaVLk9tBYaBcE/6Artdr4RZ5TB6/dC+9iIe/WgAMYADDpAUJAxjAAAYwgGFZgoS/AtNNTF7Z2bL0BYPBV3Jw5xFwwWcYxgtBP5OkE8i9G7aWGOOCruvauwADALMLMEbKf4SdAAAAAElFTkSuQmCC)"
			});
	
		}
		
		function _createElement(tag, className, parent) {
			var _element = DOCUMENT.createElement(tag);
			if (className) _element.className = "jwdownload"+className;
			if (parent) {
				parent.appendChild(_element);
			}
			return _element;
		}
		
		/** 
		 * Although this function creates a flash embed, the target is iOS, which interprets the embed code as a YouTube video, 
		 * and plays it using the browser
		 */
		function _embedYouTube(path) {
            var embed = _createElement("iframe", "", _container);

            embed.src = "http://www.youtube.com/embed/" + utils.youTubeID(path);
            embed.width = _width;
            embed.height = _height;
            embed.style.border = "none";
		}
		
		_embed();
	};


	
})(jwplayer);
/**
 * Flash mode embedder the JW Player
 * @author Zach
 * @modified Pablo
 * @version 6.0
 */
(function(jwplayer) {
	var utils = jwplayer.utils,
		events = jwplayer.events,
		storedFlashvars = {};

	var _flash = jwplayer.embed.flash = function(_container, _player, _options, _loader, _api) {
		var _eventDispatcher = new jwplayer.events.eventdispatcher(),
			_flashVersion = utils.flashVersion();
		utils.extend(this, _eventDispatcher);
		
		
		function appendAttribute(object, name, value) {
			var param = document.createElement('param');
			param.setAttribute('name', name);
			param.setAttribute('value', value);
			object.appendChild(param);
		};
		
		function _resizePlugin(plugin, div, onready) {
			return function(evt) {
				try {
					if (onready) {
						document.getElementById(_api.id+"_wrapper").appendChild(div);
					}
					var display = document.getElementById(_api.id).getPluginConfig("display");
					if (typeof plugin.resize == "function") {
						plugin.resize(display.width, display.height);
					}
					div.style.left = display.x;
					div.style.top = display.h;
				} catch (e) {}
			}
		}
		
		
		function parseComponents(componentBlock) {
			if (!componentBlock) {
				return {};
			}
			
			var flat = {};
			
			utils.foreach(componentBlock, function(component, componentConfig) {
				utils.foreach(componentConfig, function(param, val) {
					flat[component + '.' + param] = val;
				});
			});
			
			return flat;
		};
		
		function parsePlugins(pluginBlock) {
			if (!pluginBlock) {
				return {};
			}
			
			var flat = {}, pluginKeys = [];
			
			utils.foreach(pluginBlock, function(plugin, pluginConfig) {
				var pluginName = utils.getPluginName(plugin);
				pluginKeys.push(plugin);
				utils.foreach(pluginConfig, function(param, val) {
					flat[pluginName + '.' + param] = val;
				});
			});
			flat.plugins = pluginKeys.join(',');
			return flat;
		};

		this.embed = function() {		
			// Make sure we're passing the correct ID into Flash for Linux API support
			_options.id = _api.id;
			
			// If Flash is installed, but the version is too low, display an error.
			if (_flashVersion < 10) {
				_eventDispatcher.sendEvent(events.ERROR, {message:"Flash version must be 10.0 or greater"});
				return false;
			}
			
			var _wrapper,
			 	_aspect,
				lb = _api.config.listbar;
			
			var params = utils.extend({}, _options);
			
			// Hack for when adding / removing happens too quickly
			if (_container.id + "_wrapper" == _container.parentNode.id) {
				_wrapper = document.getElementById(_container.id + "_wrapper");
			} else {
				_wrapper = document.createElement("div");
				_aspect = document.createElement("div");
				_aspect.style.display = "none";
				_aspect.id = _container.id + "_aspect";
				_wrapper.id = _container.id + "_wrapper";
				_wrapper.style.position = "relative";
				_wrapper.style.display = "block";
				_wrapper.style.width = utils.styleDimension(params.width);
				_wrapper.style.height= utils.styleDimension(params.height);
				
				if (_api.config.aspectratio) {
					var ar = parseFloat(_api.config.aspectratio);
					_aspect.style.display = "block";
					_aspect.style.marginTop = _api.config.aspectratio;
					_wrapper.style.height = "auto";
					_wrapper.style.display = "inline-block";
					if (lb) {
						if(lb.position == "bottom") {
							_aspect.style.paddingBottom = lb.size + "px";
						}
						else if(lb.position == "right") {
							_aspect.style.marginBottom = (-1 * lb.size * (ar/100)) + "px";
						}
					}
				}
				
				_container.parentNode.replaceChild(_wrapper, _container);
				_wrapper.appendChild(_container);
				_wrapper.appendChild(_aspect);
				
			}
			
			var flashPlugins = _loader.setupPlugins(_api, params, _resizePlugin);
			
			if (flashPlugins.length > 0) {
				utils.extend(params, parsePlugins(flashPlugins.plugins));
			} else {
				delete params.plugins;
			}

			// Hack for the dock
			if (typeof params["dock.position"] != "undefined"){
				if (params["dock.position"].toString().toLowerCase() == "false") {
					params["dock"] = params["dock.position"];
					delete params["dock.position"];					
				}
			}
			
			var bgcolor = "#000000",
				flashPlayer, //flashvars,
				wmode = params.wmode ? params.wmode : (params.height && params.height <= 40 ? "transparent" : "opaque"),
				toDelete = ["height", "width", "modes", "events", "primary", "base", "fallback", "volume"];
			
			for (var i = 0; i < toDelete.length; i++) {
				delete params[toDelete[i]];
			}
			
			// If we've set any cookies in HTML5 mode, bring them into flash
			var cookies = utils.getCookies();
			utils.foreach(cookies, function(cookie, val) {
				if (typeof(params[cookie])=="undefined") {
					params[cookie] = val;
				}
			});
			
			var base = window.location.href.split("/");
			base.splice(base.length-1, 1);
			base = base.join("/");
			params.base = base + "/";
			
			storedFlashvars[_container.id] = params;

			if (utils.isIE()) {
				var html = '<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" ' +
				'" width="100%" height="100%"' +
				'id="' +
				_container.id +
				'" name="' +
				_container.id +
				'" tabindex=0"' +
				'">';
				html += '<param name="movie" value="' + _player.src + '">';
				html += '<param name="allowfullscreen" value="true">';
				html += '<param name="allowscriptaccess" value="always">';
				html += '<param name="seamlesstabbing" value="true">';
				html += '<param name="wmode" value="' + wmode + '">';
				html += '<param name="bgcolor" value="' + bgcolor + '">';
				html += '</object>';

				_container.outerHTML = html;
								
				flashPlayer = document.getElementById(_container.id);
			} else {
				var obj = document.createElement('object');
				obj.setAttribute('type', 'application/x-shockwave-flash');
				obj.setAttribute('data', _player.src);
				obj.setAttribute('width', "100%");
				obj.setAttribute('height', "100%");
				obj.setAttribute('bgcolor', bgcolor);
				obj.setAttribute('id', _container.id);
				obj.setAttribute('name', _container.id);
				obj.setAttribute('tabindex', 0);
				appendAttribute(obj, 'allowfullscreen', 'true');
				appendAttribute(obj, 'allowscriptaccess', 'always');
				appendAttribute(obj, 'seamlesstabbing', 'true');
				appendAttribute(obj, 'wmode', wmode);
				
				_container.parentNode.replaceChild(obj, _container);
				flashPlayer = obj;
			}
			
			if (_api.config.aspectratio) {
				flashPlayer.style.position = "absolute";		
			}
			_api.container = flashPlayer;
			_api.setPlayer(flashPlayer, "flash");
		}
		/**
		 * Detects whether Flash supports this configuration
		 */
		this.supportsConfig = function() {
			if (_flashVersion) {
				if (_options) {
					if (utils.typeOf(_options.playlist) == "string") return true;

					try {
						var item = _options.playlist[0],
							sources = item.sources;
						
						if (typeof sources == "undefined") {
							return true;
						} else {
							for (var i = 0; i < sources.length; i++) {
								if (sources[i].file && _flashCanPlay(sources[i].file, sources[i].type)) {
									return true;
								}
							}
						}
					} catch (e) {
						return false;
					}
				} else {
					return true;
				}
			}
			return false;
		}
	}
	
	_flash.getVars = function(id) {
		return storedFlashvars[id];		
	}

	/**
	 * Determines if a Flash can play a particular file, based on its extension
	 */
	var _flashCanPlay = jwplayer.embed.flashCanPlay = function(file, type) {
		// TODO: Return false if isMobile
		
		if (utils.isYouTube(file)) return true;
		if (utils.isRtmp(file,type)) return true;
		if (type == "hls") return true;

		var mappedType = utils.extensionmap[type ? type : utils.extension(file)];
		
		// If no type or unrecognized type, don't allow to play
		if (!mappedType) {
			return false;
		}

		return !!(mappedType.flash);
	}
	
})(jwplayer);
/**
 * HTML5 mode embedder for the JW Player
 * @author Zach
 * @modified Pablo
 * @version 6.0
 */
(function(jwplayer) {
	var utils = jwplayer.utils, extensionmap = utils.extensionmap, events = jwplayer.events;

	jwplayer.embed.html5 = function(_container, _player, _options, _loader, _api) {
		var _this = this,
			_eventdispatcher = new events.eventdispatcher();
		
		utils.extend(_this, _eventdispatcher);
		
		
		function _resizePlugin (plugin, div, onready) {
			return function(evt) {
				try {
					var displayarea = document.querySelector("#" + _container.id + " .jwmain");
					if (onready) {
						displayarea.appendChild(div);
					}
					if (typeof plugin.resize == "function") {
						plugin.resize(displayarea.clientWidth, displayarea.clientHeight);
						setTimeout(function () {
							plugin.resize(displayarea.clientWidth, displayarea.clientHeight);
						}, 400);
					}
					div.left = displayarea.style.left;
					div.top = displayarea.style.top;
				} catch(e) {}
			}
		}
		
		_this.embed = function() {
			if (jwplayer.html5) {
				_loader.setupPlugins(_api, _options, _resizePlugin);
				_container.innerHTML = "";
				var playerOptions = jwplayer.utils.extend({}, _options);
				
				// Volume option is tricky to remove, since it needs to be in the HTML5 player model.  So we'll remove it here.
				delete playerOptions.volume;
				
				var html5player = new jwplayer.html5.player(playerOptions);
				_api.container = document.getElementById(_api.id);
				_api.setPlayer(html5player, "html5");
			} else {
				var scriptLoader = new utils.scriptloader(_player.src);
				scriptLoader.addEventListener(events.ERROR, _loadError);
				scriptLoader.addEventListener(events.COMPLETE, _this.embed);
				scriptLoader.load();
			}

		}
				
		function _loadError(evt) {
			_this.sendEvent(evt.type, {message: "HTML5 player not found"});
		}
		
		/**
		 * Detects whether the html5 player supports this configuration.
		 *
		 * @return {Boolean}
		 */
		_this.supportsConfig = function() {
			if (!!jwplayer.vid.canPlayType) {
				try {
					if (utils.typeOf(_options.playlist) == "string") {
						return true;
					} else {
						var sources = _options.playlist[0].sources;
						for (var i=0; i<sources.length; i++) {
							var file = sources[i].file,
								type = sources[i].type;
							
							if (_html5CanPlay(file, type)) {
								return true;
							}
						}
					}
				} catch(e) {
					return false;
				}
			}
			
			return false;
		}
		
		/**
		 * Determines if a video element can play a particular file, based on its extension
		 * @param {Object} file
		 * @param {Object} type
		 * @return {Boolean}
		 */
		function _html5CanPlay(file, type) {
			// HTML5 playback is not sufficiently supported on Blackberry devices; should fail over automatically.
			if(navigator.userAgent.match(/BlackBerry/i) !== null) { return false; }

			// HLS not sufficiently supported on Android devices; should fail over automatically.
			if (utils.isAndroid() && (utils.extension(file) == "m3u" || utils.extension(file) == "m3u8")) {
				return false;
			}

			// Ensure RTMP files are not seen as videos
			if (utils.isRtmp(file,type)) return false;

			var mappedType = extensionmap[type ? type : utils.extension(file)];
			
			// If no type or unrecognized type, don't allow to play
			if (!mappedType) {
				return false;
			}
			
			// Extension is recognized as a format Flash can play, but no HTML5 support is listed  
			if (mappedType.flash && !mappedType.html5) {
				return false;
			}
			
			// Last, but not least, we ask the browser 
			// (But only if it's a video with an extension known to work in HTML5)
			return _browserCanPlay(mappedType.html5);
		};
		
		/**
		 * 
		 * @param {DOMMediaElement} video
		 * @param {String} mimetype
		 * @return {Boolean}
		 */
		function _browserCanPlay(mimetype) {
			var video = jwplayer.vid;

			// OK to use HTML5 with no extension
			if (!mimetype) {
				return true;
			}

			try {
				if (video.canPlayType(mimetype)) {
					return true;
				} else {
					return false;
				}
			} catch(e) {
				return false;
			}
			
		}
	};
	
})(jwplayer);
/**
 * API for the JW Player
 * 
 * @author Pablo
 * @version 5.8
 */
(function(jwplayer, undefined) {
	var _players = [], 
		utils = jwplayer.utils, 
		events = jwplayer.events,
		states = events.state,
		DOCUMENT = document;
	
	var api = jwplayer.api = function(container) {
		var _this = this,
			_listeners = {},
			_stateListeners = {},
			_player,
			_playerReady = false,
			_queuedCalls = [],
			_instream,
			_itemMeta = {},
			_callbacks = {};
		
		_this.container = container;
		_this.id = container.id;
		
		// Player Getters
		_this.getBuffer = function() {
			return _callInternal('jwGetBuffer');
		};
		_this.getContainer = function() {
			return _this.container;
		};
				
		_this.addButton = function(icon, label, handler, id) {
			try {
				_callbacks[id] = handler;
				var handlerString = "jwplayer('" + _this.id + "').callback('" + id + "')";
				//_player.jwDockAddButton(icon, label, handlerString, id);
				_callInternal("jwDockAddButton", icon, label, handlerString, id);
			} catch (e) {
				utils.log("Could not add dock button" + e.message);
			}
		};
		_this.removeButton = function(id) {
			_callInternal('jwDockRemoveButton', id);
		};

		_this.callback = function(id) {
			if (_callbacks[id]) {
				_callbacks[id]();
			}
		};
		
		_this.forceState = function(state) {
		    _callInternal("jwForceState", state);
		    return _this;  
		};
		
		_this.releaseState = function() {
		    
		    return _callInternal("jwReleaseState");
		};
		
		_this.getDuration = function() {
			return _callInternal('jwGetDuration');
		};
		_this.getFullscreen = function() {
			return _callInternal('jwGetFullscreen');
		};
		_this.getHeight = function() {
			return _callInternal('jwGetHeight');
		};
		_this.getLockState = function() {
			return _callInternal('jwGetLockState');
		};
		_this.getMeta = function() {
			return _this.getItemMeta();
		};
		_this.getMute = function() {
			return _callInternal('jwGetMute');
		};
		_this.getPlaylist = function() {
			var playlist = _callInternal('jwGetPlaylist');
			if (_this.renderingMode == "flash") {
				utils.deepReplaceKeyName(playlist, ["__dot__","__spc__","__dsh__","__default__"], ["."," ","-","default"]);	
			}
			return playlist;
		};
		_this.getPlaylistItem = function(item) {
			if (!utils.exists(item)) {
				item = _this.getPlaylistIndex();
			}
			return _this.getPlaylist()[item];
		};
		_this.getPlaylistIndex = function() {
			return _callInternal('jwGetPlaylistIndex');
		};
		_this.getPosition = function() {
			return _callInternal('jwGetPosition');
		};
		_this.getRenderingMode = function() {
			return _this.renderingMode;
		};
		_this.getState = function() {
			return _callInternal('jwGetState');
		};
		_this.getVolume = function() {
			return _callInternal('jwGetVolume');
		};
		_this.getWidth = function() {
			return _callInternal('jwGetWidth');
		};
		// Player Public Methods
		_this.setFullscreen = function(fullscreen) {
			if (!utils.exists(fullscreen)) {
				_callInternal("jwSetFullscreen", !_callInternal('jwGetFullscreen'));
			} else {
				_callInternal("jwSetFullscreen", fullscreen);
			}
			return _this;
		};
		_this.setMute = function(mute) {
			if (!utils.exists(mute)) {
				_callInternal("jwSetMute", !_callInternal('jwGetMute'));
			} else {
				_callInternal("jwSetMute", mute);
			}
			return _this;
		};
		_this.lock = function() {
			return _this;
		};
		_this.unlock = function() {
			return _this;
		};
		_this.load = function(toLoad) {
			_callInternal("jwLoad", toLoad);
			return _this;
		};
		_this.playlistItem = function(item) {
			_callInternal("jwPlaylistItem", parseInt(item, 10));
			return _this;
		};
		_this.playlistPrev = function() {
			_callInternal("jwPlaylistPrev");
			return _this;
		};
		_this.playlistNext = function() {
			_callInternal("jwPlaylistNext");
			return _this;
		};
		_this.resize = function(width, height) {
			if (_this.renderingMode !== "flash") {
				_callInternal("jwResize", width, height);
			} else {
				var wrapper = DOCUMENT.getElementById(_this.id + "_wrapper"),
					aspect = DOCUMENT.getElementById(_this.id + "_aspect");
				if (aspect) {
					aspect.style.display = 'none';
				}
				if (wrapper) {
					wrapper.style.display = "block";
					wrapper.style.width = utils.styleDimension(width);
					wrapper.style.height = utils.styleDimension(height);
				}
			}
			return _this;
		};
		_this.play = function(state) {
			if (state === undefined) {
				state = _this.getState();
				if (state == states.PLAYING || state == states.BUFFERING) {
					_callInternal("jwPause");
				} else {
					_callInternal("jwPlay");
				}
			} else {
				_callInternal("jwPlay", state);
			}
			return _this;
		};
		_this.pause = function(state) {
			if (state === undefined) {
				state = _this.getState();
				if (state == states.PLAYING || state == states.BUFFERING) {
					_callInternal("jwPause");
				} else {
					_callInternal("jwPlay");
				}
			} else {
				_callInternal("jwPause", state);
			}
			return _this;
		};
		_this.stop = function() {
			_callInternal("jwStop");
			return _this;
		};
		_this.seek = function(position) {
			_callInternal("jwSeek", position);
			return _this;
		};
		_this.setVolume = function(volume) {
			_callInternal("jwSetVolume", volume);
			return _this;
		};
		_this.createInstream = function() {
			return new api.instream(this, _player);
		};
		_this.setInstream = function(instream) {
			_instream = instream;
			return instream;
		};
		_this.loadInstream = function(item, options) {
			_instream = _this.setInstream(_this.createInstream()).init(options);
            _instream.loadItem(item);
            return _instream;
		};
		_this.getQualityLevels = function() {
			return _callInternal("jwGetQualityLevels");
		};
		_this.getCurrentQuality = function() {
			return _callInternal("jwGetCurrentQuality");
		};
		_this.setCurrentQuality = function(level) {
			_callInternal("jwSetCurrentQuality", level);
		};
		_this.getCaptionsList = function() {
			return _callInternal("jwGetCaptionsList");
		};
		_this.getCurrentCaptions = function() {
			return _callInternal("jwGetCurrentCaptions");
		};
		_this.setCurrentCaptions = function(caption) {
			_callInternal("jwSetCurrentCaptions", caption);
		};
		_this.getControls = function() {
			return _callInternal("jwGetControls");
		};
		_this.getSafeRegion = function() {
			return _callInternal("jwGetSafeRegion");
		};	
		_this.setControls = function(state) {
			_callInternal("jwSetControls", state);
		};
		_this.destroyPlayer = function () {
			_callInternal ("jwPlayerDestroy");
		};
		_this.playAd = function(ad) {
			var plugins = jwplayer(_this.id).plugins;
			if (plugins.vast) {
				plugins.vast.jwPlayAd(ad);
			}
			// _callInternal("jwPlayAd", ad);
		};
		_this.pauseAd = function() {
			var plugins = jwplayer(_this.id).plugins;
			if (plugins.vast) {
				plugins.vast.jwPauseAd();
			}
			else {
				_callInternal("jwPauseAd");
			}
		};
		
		var _eventMapping = {
			onBufferChange: events.JWPLAYER_MEDIA_BUFFER,
			onBufferFull: events.JWPLAYER_MEDIA_BUFFER_FULL,
			onError: events.JWPLAYER_ERROR,
			onSetupError: events.JWPLAYER_SETUP_ERROR,
			onFullscreen: events.JWPLAYER_FULLSCREEN,
			onMeta: events.JWPLAYER_MEDIA_META,
			onMute: events.JWPLAYER_MEDIA_MUTE,
			onPlaylist: events.JWPLAYER_PLAYLIST_LOADED,
			onPlaylistItem: events.JWPLAYER_PLAYLIST_ITEM,
			onPlaylistComplete: events.JWPLAYER_PLAYLIST_COMPLETE,
			onReady: events.API_READY,
			onResize: events.JWPLAYER_RESIZE,
			onComplete: events.JWPLAYER_MEDIA_COMPLETE,
			onSeek: events.JWPLAYER_MEDIA_SEEK,
			onTime: events.JWPLAYER_MEDIA_TIME,
			onVolume: events.JWPLAYER_MEDIA_VOLUME,
			onBeforePlay: events.JWPLAYER_MEDIA_BEFOREPLAY,
			onBeforeComplete: events.JWPLAYER_MEDIA_BEFORECOMPLETE,
			onDisplayClick: events.JWPLAYER_DISPLAY_CLICK,
			onControls: events.JWPLAYER_CONTROLS,
			onQualityLevels: events.JWPLAYER_MEDIA_LEVELS,
			onQualityChange: events.JWPLAYER_MEDIA_LEVEL_CHANGED,
			onCaptionsList: events.JWPLAYER_CAPTIONS_LIST,
			onCaptionsChange: events.JWPLAYER_CAPTIONS_CHANGED,
			onAdError: events.JWPLAYER_AD_ERROR,
			onAdClick: events.JWPLAYER_AD_CLICK,
			onAdImpression: events.JWPLAYER_AD_IMPRESSION,
			onAdTime: events.JWPLAYER_AD_TIME,
			onAdComplete: events.JWPLAYER_AD_COMPLETE,
			onAdCompanions: events.JWPLAYER_AD_COMPANIONS,
			onAdSkipped: events.JWPLAYER_AD_SKIPPED
		};
		
		utils.foreach(_eventMapping, function(event) {
			_this[event] = _eventCallback(_eventMapping[event], _eventListener); 
		});

		var _stateMapping = {
			onBuffer: states.BUFFERING,
			onPause: states.PAUSED,
			onPlay: states.PLAYING,
			onIdle: states.IDLE 
		};

		utils.foreach(_stateMapping, function(state) {
			_this[state] = _eventCallback(_stateMapping[state], _stateListener); 
		});
		
		function _eventCallback(event, listener) {
			return function(callback) {
				return listener(event, callback);
			};
		}

		_this.remove = function() {
			if (!_playerReady) {
				throw "Cannot call remove() before player is ready";
			}
			_remove(this);
		};
		
		function _remove(player) {
			_queuedCalls = [];
			api.destroyPlayer(player.id);
		}
		
		_this.setup = function(options) {
			if (jwplayer.embed) {
				// Destroy original API on setup() to remove existing listeners
				var fallbackDiv = DOCUMENT.getElementById(_this.id);
				if (fallbackDiv) {
					options["fallbackDiv"] = fallbackDiv;
				}
				_remove(_this);
				var newApi = jwplayer(_this.id);
				newApi.config = options;
				var embedder = new jwplayer.embed(newApi);
				embedder.embed();
				return newApi;
			}
			return _this;
		};
		_this.registerPlugin = function(id, target, arg1, arg2) {
			jwplayer.plugins.registerPlugin(id, target, arg1, arg2);
		};
		
		/** Use this function to set the internal low-level player.  This is a javascript object which contains the low-level API calls. **/
		_this.setPlayer = function(player, renderingMode) {
			_player = player;
			_this.renderingMode = renderingMode;
		};
		
		_this.detachMedia = function() {
			if (_this.renderingMode == "html5") {
				return _callInternal("jwDetachMedia");
			}
		};

		_this.attachMedia = function(seekable) {
			if (_this.renderingMode == "html5") {
				return _callInternal("jwAttachMedia", seekable);
			}
		};

		function _stateListener(state, callback) {
			if (!_stateListeners[state]) {
				_stateListeners[state] = [];
				_eventListener(events.JWPLAYER_PLAYER_STATE, _stateCallback(state));
			}
			_stateListeners[state].push(callback);
			return _this;
		}

		function _stateCallback(state) {
			return function(args) {
				var newstate = args.newstate, oldstate = args.oldstate;
				if (newstate == state) {
					var callbacks = _stateListeners[newstate];
					if (callbacks) {
						for (var c = 0; c < callbacks.length; c++) {
							var fn = callbacks[c];
							if (typeof fn == 'function') {
								fn.call(this, {
									oldstate: oldstate,
									newstate: newstate
								});
							}
						}
					}
				}
			};
		}	
		
		function _addInternalListener(player, type) {
			try {
				player.jwAddEventListener(type, 'function(dat) { jwplayer("' + _this.id + '").dispatchEvent("' + type + '", dat); }');
			} catch(e) {
				utils.log("Could not add internal listener");
			}
		}
		
		function _eventListener(type, callback) {
			if (!_listeners[type]) {
				_listeners[type] = [];
				if (_player && _playerReady) {
					_addInternalListener(_player, type);
				}
			}
			_listeners[type].push(callback);
			return _this;
		}

		_this.removeEventListener = function(type, callback) {
			var listeners = _listeners[type];
			if (listeners) {
				for (var l = listeners.length; l--;) {
					if (listeners[l] === callback) {
						listeners.splice(l, 1);
					}
				}
			}
		};
		
		_this.dispatchEvent = function(type) {
			var listeners = _listeners[type];
			if (listeners) {
				listeners = listeners.slice(0); //copy array
				var args = utils.translateEventResponse(type, arguments[1]);
				for (var l = 0; l < listeners.length; l++) {
					var fn = listeners[l];
					if (typeof fn === 'function') {
						try {
							if (type === events.JWPLAYER_PLAYLIST_LOADED) {
								utils.deepReplaceKeyName(args.playlist, ["__dot__","__spc__","__dsh__","__default__"], ["."," ","-","default"]);
							}
							fn.call(this, args);
						} catch(e) {
							utils.log("There was an error calling back an event handler");
						}
					}
				}
			}
		};

		_this.dispatchInstreamEvent = function(type) {
			if (_instream) {
				_instream.dispatchEvent(type, arguments);
			}
		};

		function _callInternal() {
			if (_playerReady) {
				if (_player) {
					var args = Array.prototype.slice.call(arguments, 0),
						funcName = args.shift();
					if (typeof _player[funcName] === 'function') {
						// Can't use apply here -- Flash's externalinterface doesn't like it.
						//return func.apply(player, args);
						switch(args.length) {
							case 6:  return _player[funcName](args[0], args[1], args[2], args[3], args[4], args[5]);
							case 5:  return _player[funcName](args[0], args[1], args[2], args[3], args[4]);
							case 4:  return _player[funcName](args[0], args[1], args[2], args[3]);
							case 3:  return _player[funcName](args[0], args[1], args[2]);
							case 2:  return _player[funcName](args[0], args[1]);
							case 1:  return _player[funcName](args[0]);
						}
						return _player[funcName]();
					}
				}
				return null;
			}
			_queuedCalls.push(arguments);
		}
		
		_this.callInternal = _callInternal;
		
		_this.playerReady = function(obj) {
			_playerReady = true;
			
			if (!_player) {
				_this.setPlayer(DOCUMENT.getElementById(obj.id));
			}
			_this.container = DOCUMENT.getElementById(_this.id);
			
			utils.foreach(_listeners, function(eventType) {
				_addInternalListener(_player, eventType);
			});
			
			_eventListener(events.JWPLAYER_PLAYLIST_ITEM, function() {
				_itemMeta = {};
			});
			
			_eventListener(events.JWPLAYER_MEDIA_META, function(data) {
				utils.extend(_itemMeta, data.metadata);
			});
			
			_this.dispatchEvent(events.API_READY);
			
			while (_queuedCalls.length > 0) {
				_callInternal.apply(this, _queuedCalls.shift());
			}
		};
		
		_this.getItemMeta = function() {
			return _itemMeta;
		};

		_this.isBeforePlay = function () {
			return _callInternal('jwIsBeforePlay');
		};
		_this.isBeforeComplete = function () {
			return _callInternal('jwIsBeforeComplete');
		};
		
		return _this;
	};
	
	api.selectPlayer = function(identifier) {
		var _container;
		
		if (!utils.exists(identifier)) {
			identifier = 0;
		}
		
		if (identifier.nodeType) {
			// Handle DOM Element
			_container = identifier;
		} else if (typeof identifier == 'string') {
			// Find container by ID
			_container = DOCUMENT.getElementById(identifier);
		}
		
		if (_container) {
			var foundPlayer = api.playerById(_container.id);
			if (foundPlayer) {
				return foundPlayer;
			} else {
				// Todo: register new object
				return api.addPlayer(new api(_container));
			}
		} else if (typeof identifier == "number") {
			return _players[identifier];
		}
		
		return null;
	};
	

	api.playerById = function(id) {
		for (var p = 0; p < _players.length; p++) {
			if (_players[p].id == id) {
				return _players[p];
			}
		}
		return null;
	};
	
	api.addPlayer = function(player) {
		for (var p = 0; p < _players.length; p++) {
			if (_players[p] == player) {
				return player; // Player is already in the list;
			}
		}
		
		_players.push(player);
		return player;
	};
	
	api.destroyPlayer = function(playerId) {
		var index = -1, player;
		for (var p = 0; p < _players.length; p++) {
			if (_players[p].id == playerId) {
				index = p;
				player = _players[p];
				continue;
			}
		}
		if (index >= 0) {
			var id = player.id,
				toDestroy = DOCUMENT.getElementById(id + (player.renderingMode == "flash" ? "_wrapper" : ""));
			
			if (utils.clearCss) {
				// Clear HTML5 rules
				utils.clearCss("#"+id);
			}

//			if (!toDestroy) {
//				toDestroy = DOCUMENT.getElementById(id);	
//			}
			
			if (toDestroy) {
				if (player.renderingMode == "html5") {
					player.destroyPlayer();
				}
				var replacement = DOCUMENT.createElement('div');
				replacement.id = id;
				toDestroy.parentNode.replaceChild(replacement, toDestroy);
			}
			_players.splice(index, 1);
		}
		
		return null;
	};

	jwplayer.playerReady = function(obj) {
		var api = jwplayer.api.playerById(obj.id);

		if (api) {
			api.playerReady(obj);
		} else {
			jwplayer.api.selectPlayer(obj.id).playerReady(obj);
		}
		
	};

})(window.jwplayer);
/**
 * InStream API 
 * 
 * @author Pablo
 * @version 5.9
 */
(function(jwplayer) {
	var events = jwplayer.events,
		utils = jwplayer.utils,
		states = events.state;
	
	jwplayer.api.instream = function(_api, _player) {
		
		var _item,
			_options,
			_listeners = {},
			_stateListeners = {},
			_this = this;

		function _addInternalListener(id, type) {
			_player.jwInstreamAddEventListener(type, 'function(dat) { jwplayer("' + id + '").dispatchInstreamEvent("' + type + '", dat); }');
		}

		function _eventListener(type, callback) {
			if (!_listeners[type]) {
				_listeners[type] = [];
				_addInternalListener(_api.id, type);
			}
			_listeners[type].push(callback);
			return this;
		}

		function _stateListener(state, callback) {
			if (!_stateListeners[state]) {
				_stateListeners[state] = [];
				_eventListener(events.JWPLAYER_PLAYER_STATE, _stateCallback(state));
			}
			_stateListeners[state].push(callback);
			return this;
		}

		function _stateCallback(state) {
			return function(args) {
				var newstate = args.newstate, oldstate = args.oldstate;
				if (newstate == state) {
					var callbacks = _stateListeners[newstate];
					if (callbacks) {
						for (var c = 0; c < callbacks.length; c++) {
							var fn = callbacks[c];
							if (typeof fn == 'function') {
								fn.call(this, {
									oldstate: oldstate,
									newstate: newstate,
									type: args.type
								});
							}
						}
					}
				}
			};
		}
		
		_this.type = 'instream';
		
		_this.init = function() {
			_api.callInternal('jwInitInstream');
			return _this;
		};
		_this.loadItem = function(item, options) {
			_item = item;
			_options = options || {};
			if (utils.typeOf(item) == "array") {
			   _api.callInternal('jwLoadArrayInstream', _item, _options);
			} else {
			   _api.callInternal('jwLoadItemInstream', _item, _options);
			}
		};

		_this.removeEvents = function() {
			_listeners = _stateListeners = {};
		};

		_this.removeEventListener = function(type, callback) {
			var listeners = _listeners[type];
			if (listeners) {
				for (var l = listeners.length; l--;) {
					if (listeners[l] === callback) {
						listeners.splice(l, 1);
					}
				}
			}
		};

		_this.dispatchEvent = function(type, calledArguments) {
			var listeners = _listeners[type];
			if (listeners) {
				listeners = listeners.slice(0); //copy array
				var args = utils.translateEventResponse(type, calledArguments[1]);
				for (var l = 0; l < listeners.length; l++) {
					var fn = listeners[l];
					if (typeof fn == 'function') {
						fn.call(this, args);
					}
				}
			}
		};
		_this.onError = function(callback) {
			return _eventListener(events.JWPLAYER_ERROR, callback);
		};
		_this.onMediaError = function(callback) {
			return _eventListener(events.JWPLAYER_MEDIA_ERROR, callback);
		};
		_this.onFullscreen = function(callback) {
			return _eventListener(events.JWPLAYER_FULLSCREEN, callback);
		};
		_this.onMeta = function(callback) {
			return _eventListener(events.JWPLAYER_MEDIA_META, callback);
		};
		_this.onMute = function(callback) {
			return _eventListener(events.JWPLAYER_MEDIA_MUTE, callback);
		};
		_this.onComplete = function(callback) {
			return _eventListener(events.JWPLAYER_MEDIA_COMPLETE, callback);
		};
		// _this.onSeek = function(callback) {
		// 	return _eventListener(events.JWPLAYER_MEDIA_SEEK, callback);
		// };
		
		_this.onPlaylistComplete = function(callback) {
			return _eventListener(events.JWPLAYER_PLAYLIST_COMPLETE,callback);
		};
		
		_this.onPlaylistItem = function(callback) {
			return _eventListener(events.JWPLAYER_PLAYLIST_ITEM,callback);
		};
		
		_this.onTime = function(callback) {
			return _eventListener(events.JWPLAYER_MEDIA_TIME, callback);
		};
		// _this.onVolume = function(callback) {
		// 	return _eventListener(events.JWPLAYER_MEDIA_VOLUME, callback);
		// };
		// State events
		_this.onBuffer = function(callback) {
			return _stateListener(states.BUFFERING, callback);
		};
		_this.onPause = function(callback) {
			return _stateListener(states.PAUSED, callback);
		};
		_this.onPlay = function(callback) {
			return _stateListener(states.PLAYING, callback);
		};
		_this.onIdle = function(callback) {
			return _stateListener(states.IDLE, callback);
		};
		// // Instream events
		_this.onClick = function(callback) {
			return _eventListener(events.JWPLAYER_INSTREAM_CLICK, callback);
		};
		_this.onInstreamDestroyed = function(callback) {
			return _eventListener(events.JWPLAYER_INSTREAM_DESTROYED, callback);
		};
		_this.onAdSkipped = function(callback) {
			return _eventListener(events.JWPLAYER_AD_SKIPPED, callback);
		};
		_this.play = function(state) {
			_player.jwInstreamPlay(state);
		};
		_this.pause = function(state) {
			_player.jwInstreamPause(state);
		};
		_this.hide = function() {
			_api.callInternal('jwInstreamHide');
		};
		_this.destroy = function() {
			_this.removeEvents();
			_api.callInternal('jwInstreamDestroy');
		};
		_this.setText = function(text) {
			_player.jwInstreamSetText(text ? text : '');
		};
		_this.getState = function() {
			return _player.jwInstreamState();
		};
		_this.setClick = function (url) {
			//only present in flashMode
			if (_player.jwInstreamClick) {
				_player.jwInstreamClick(url);
			}
		};
	};
	
})(window.jwplayer);
/**
 * JW Player Source Endcap
 * 
 * This will appear at the end of the JW Player source
 * 
 * @version 6.0
 */

 }