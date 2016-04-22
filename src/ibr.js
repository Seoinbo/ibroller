//
// # ibRoller2
// since: 2013.07.06
// version 1.0.4
//
// [history]
// - 2016.04.22. jQuery1.9 이상에서 jQuery.browser()가 deprecated된 것에 대한 처리.
// - 2013.12.05. 'endless' 옵션 추가.
// - 2013.12.05. 'onChangeState' 이벤트 추가.
//

// The indexOf() method is not supported in Internet Explorer 8 and earlier.
if (!Array.prototype.indexOf) {
	Array.prototype.indexOf = function(elt /*, from*/) {
		var len = this.length >>> 0;
		var from = Number(arguments[1]) || 0;
		from = (from < 0) ? Math.ceil(from) : Math.floor(from);
		if (from < 0) {
			from += len;
		}
	    for (; from < len; from++) {
	    	if (from in this && this[from] === elt) {
	    		return from;
	    	}
		}
		return -1;
	};
}

;(function (window, $, undefined) {

	_direction = {
		"hor": "right-to-left",
		"ver": "down-to-up"
	};
	
	_moveto = {
		"left": "ibr_move_left",
		"right": "ibr_move_right",
		"up": "ibr_move_up",
		"down": "ibr_move_down"
	};
	
	_state = {
		"ready": "ibr_ready",
		"active": "ibr_active",
		"idle": "ibr_idle"
	}
	
	_fn = {
		"mergeProp": function (src, dest) {
			if (src === undefined) {
				return dest;
			}
			if (dest === undefined) {
				dest = {};
			}
			for (var key in src) {
				if (!src.hasOwnProperty(key)) {
					continue;
				}
				if (src[key] === undefined) {
					continue;
				} else if (src[key].constructor == Object) {
					_fn.mergeProp(src[key], dest[key]);
				} else {
					dest[key] = src[key];
				}
			}
			return dest;
		},
		"filterClass": function (classes, regexp, except) {
			if (classes === undefined) {
				return "";
			}
			if (regexp === undefined) {
				return "";
			}
			var result = "",
				arrClass = classes.split(' '),
				except = except || [];
			for(var i = 0; i < arrClass.length; i++) {
				if(!regexp.test(arrClass[i]) || except.indexOf(arrClass[i]) != -1) {
					if (i > 0) {
						result += " " + arrClass[i];
	         		} else {
	         			result += arrClass[i];
					}
				}
			}
			return result;
		},
		// return milliseconds
		// - selector: jQuery selector
		"getTransitionTime": function (selector) {
			var $item = $(selector),
				dur = $item.css("transition-duration"),
				delay = $item.css("transition-delay");
			
			if (dur === undefined || delay === undefined) {
				return 0;
			}
			
			return (parseFloat($item.css("transition-duration")) + parseFloat($item.css("transition-delay"))) * 1000;
		}
	};
		
	var _ibroller = function (args) {
		if (typeof args.group === "string") {
			args.group = {
				"element": args.group
			}
		}
		if (typeof args.unit === "string") {
			args.unit = {
				"element": args.unit
			}
		}
		if (typeof args.play === "boolean") {
			args.play = {
				"auto": args.play
			}
		}
		this.args = _fn.mergeProp(args, {
			"wrap": "",
			"mask": "",
			"group": {
				"element": "",
				"count": 1
			},
			"unit": {
				"element": ""
			},
			"startIndex": 0,
			"endless": true,
			"play": {
				"auto": false,
				"direction": _direction.hor,
				"moveto": _moveto.left,
				"intervalTime": 3000,
				"movingCnt": 1
			},
			"events": {
				"init": function () {},
				"focus": function () {},
				"play": function () {},
				"stop": function () {},
				"pause": function () {},
				"resume": function () {},
				"timeout": function () {},
				"onChangeState": function () {}
			}
		});
		
		this.ele = {
			"$wrap": {},
			"$mask": {},
			"$group": {},
			"$unit": {}
		};
				
		this.totalUnit = 0; // 총 unit 개 수
		this.maxIndex = 0;
		this.nowIndex = 0;
		this.paused = true;
		this.stopped = true;
		this.noani = false;
		this.intervalId = 0;
		this.forceStop = false;

		// 초기화
		this.init();
		
		// 엘리먼트 속성 적용
		var _this = this;
		this.ele.$wrap.bind("mouseenter", function () {
			_this.forceStop = true;
			_this.pause();
		}).bind("mouseleave", function () {
			_this.forceStop = false;
			_this.resume();
		});
		
		// autoplay
		if (this.args.play.auto) {
			this.paused = false;
			this.play();
		}
		
		return this;
	};
	
	_ibroller.prototype = {
		"init": function () {
			this.ele.$wrap = $(this.args.wrap).addClass("ibroller");
			this.ele.$mask = this.ele.$wrap.find(this.args.mask).addClass("ibr_mask");
			this.ele.$group = this.ele.$wrap.find(this.args.group.element).addClass("ibr_group").addClass(this.args.play.moveto);
			this.ele.$unit = this.ele.$wrap.find(this.args.unit.element).addClass("ibr_unit");
			this.totalGroup = Math.ceil(this.totalUnit / this.args.group.count);
			this.totalUnit = this.ele.$unit.length;
			
			// movingCnt를 적용 할 만큼 적당한 unit이 없을 경우
			if (this.args.endless && (this.args.play.movingCnt < 1 || this.totalUnit < this.args.group.count + this.args.play.movingCnt) ) {
				this.args.play.movingCnt = 1;
			}
			
			this.stopped = !this.args.play.auto;
			this.maxIndex = Math.ceil(this.totalUnit / this.args.play.movingCnt) - 1; 
			this.nowIndex = this.args.startIndex;
			this.currentDir = this.args.play.direction;
			this.currentMoveto = this.args.play.moveto;
			
			// attribues
			this.ele.$wrap.attr({
				"index": this.nowIndex,
				"direction": this.currentDir
			});
			
			this.initPosition(this.currentMoveto, this.nowIndex);
			
			// css3 prefix
			var agent = navigator.userAgent.toLowerCase();
			if (agent.indexOf("chrome") != -1) this.prefix = "-webkit-"; 
			if (agent.indexOf("opera") != -1) this.prefix = "-o-";
			if (agent.indexOf("firefox") != -1) this.prefix = "-moz-";
			if (agent.indexOf("safari") != -1) this.prefix = "-webkit-";
			if (agent.indexOf("msie") != -1) this.prefix = "-ms-"; 
			if (agent.indexOf("mozilla/5.0") != -1) this.prefix = "-moz-";

			// init event call
			if (typeof this.args.events.init === "function") {
				this.args.events.init.apply(null, [this.nowIndex]);
			}
		},
		"play": function () {
			this.stopped = false;
			
			if (this.intervalId) {
				window.clearTimeout(this.intervalId);
			}
			
			if (this.forceStop) {
				return;
			}
			
			this.intervalId = window.setTimeout( function (_this) {
				return function () {
					_this.next();
					_this.play();
					
					if (typeof _this.args.events.timeout === "function") {
						_this.args.events.timeout.apply(null, [_this.nowIndex]);
					}
				};
			}(this), this.args.play.intervalTime);
			
			
			
			if (typeof this.args.events.play === "function") {
				this.args.events.play.apply(null, [this.nowIndex]);
			}
		},
		"stop": function () {
			this.pause();
			this.stopped = true;
			
			if (typeof this.args.events.stop === "function") {
				this.args.events.stop.apply(null, [this.nowIndex]);
			}
		},
		"pause": function () {
			window.clearTimeout(this.intervalId);
			this.paused = true;
			
			if (typeof this.args.events.pause === "function") {
				this.args.events.pause.apply(null, [this.nowIndex]);
			}
		},
		"resume": function () {
			if (!this.stopped && this.paused) {
				this.paused = false;
				this.play();
			}
			if (typeof this.args.events.resume === "function") {
				this.args.events.resume.apply(null, [this.nowIndex]);
			}
		},
		"next": function (dir) {
			var dir = dir || this.currentDir,
				moveto = _moveto.left;
			
			switch (dir) {
			case _direction.hor:
			default:
				moveto = _moveto.left;
				break;
			case _direction.ver:
				moveto = _moveto.down;
				break;
			}
			this.focus(+this.nowIndex + 1, moveto);
		},
		"prev": function (dir) {
			var dir = dir || this.currentDir,
				moveto = _moveto.left;
			
			switch (dir) {
			case _direction.hor:
			default:
				moveto = _moveto.right;
				break;
			case _direction.ver:
				moveto = _moveto.up;
				break;
			}
			this.focus(+this.nowIndex - 1, moveto);
		},
		"focus": function (idx, moveto, noani) {
			// 화면에 노출되는 개수가 전체 개수 미만일 경우 동작하지 않도록
			if (this.totalUnit <= this.args.group.count) {
				return;
			}
			
			// 방향 설정;
			var moveto = moveto || (this.currentDir == _direction.hor ? _moveto.left : _moveto.up);
			if (moveto != this.currentMoveto) {
				this.initPosition(moveto); // 방향전환에 따른 불필요한 애니메이션을 없애기 위해
			}
			
			var _this = this,
				noani = (noani === undefined) ? false : noani,
				idx = this.setNowIndex(idx);
			
			this.setNoani(noani);
			this._setState(_state.ready, idx, function (nowIndex) {
				_this._setState(_state.idle, _this.prevIndex);
				_this._setState(_state.active, nowIndex);
				
				// focus event
				if (typeof _this.args.events.focus === "function") {
					_this.args.events.focus.apply(null, [_this.nowIndex]);
				}
			});
		},
		"initPosition": function (moveto, idx) {
			var _this = this,
				dir = dir || this.currentDir,
				idx = (idx === undefined) ? this.nowIndex : idx,
				moveto = moveto || this.currentMoveto;
			
			this.setNoani(true);
			this._moveto(moveto);
			for (var i = 0; i <= this.maxIndex; i++) {
				this._setState(_state.idle, i);
			}
			this._setState(_state.active, idx);
			this.setNowIndex(idx);
			this.setNoani(false);
		},
		"direction": function (dir) {
			if (dir === undefined) {
				return this.currentDir;
			}
			this.ele.$wrap.attr("direction", dir);
			this.currentDir = dir;
		},
		"setNoani": function (noani) {
			var noani = (noani === undefined) ? false : noani;
			
			if (noani == this.noani) {
				return;
			}
			
			if (noani) {
				this.ele.$unit.addClass("ibr_noani");
			} else {
				this.ele.$unit.removeClass("ibr_noani");
			}
			this.noani = noani;
		},
		"setNowIndex": function (idx) {
			if (idx === undefined) {
				return this.nowIndex;
			}
			if (idx < 0) {
				idx = this.maxIndex;
			} else if (idx > this.maxIndex) {
				idx = 0;
			}
			this.prevIndex = this.nowIndex;
			this.nowIndex = idx;
			this.ele.$wrap.attr("index", this.nowIndex);
			
			return this.nowIndex;
		},
		"_moveto": function (movedir) {
			if (movedir === undefined) {
				return this.currentMoveto;
			}
			this.ele.$group.removeClass(_moveto.left + " " + _moveto.right + " " + _moveto.up + " " + _moveto.down).addClass(movedir);
			this.currentMoveto = movedir;
		},
		"_setState": function (state, idx, end) {
			var _this = this,
				state = state || _state.ready,
				idx = (idx === undefined) ? 0 : idx,
				end = end || function () {},
				cls = "",
				timeout = 0,
				maxtime = 0,
				$item = {},
				arrItem = [];
			
			var s = idx * this.args.play.movingCnt, 
				e = s + this.args.group.count,
				i = s,
				n = 0;
			for (; i < e; i++, n++) {
				if (this.args.endless && i >= this.totalUnit) {
					$item = this.ele.$unit.eq(i - this.totalUnit);
				} else {
					$item = this.ele.$unit.eq(i);
				}
				
				switch (state) {
				case _state.ready:
					if ($item.hasClass("ibr_active")) {
						continue;
					}
					cls = "ibr_ready ibr_r" + n;
					break;
					
				case _state.active:
					cls = "ibr_active ibr_a" + n;
					break;
					
				case _state.idle:
					switch (this.currentMoveto) {
					case _moveto.left:
						if (n >= this.args.play.movingCnt) {
							continue;
						}
						break;
					case _moveto.right:
					case _moveto.up:
						if (n < (this.args.group.count - this.args.play.movingCnt)) {
							continue;
						}
						break;
					}
					cls = "ibr_idle ibr_i" + n;
					break;
				}
				
				$cleanClass = _fn.filterClass($item.attr("class"), /ibr_*/, ["ibr_unit", "ibr_noani"]);
				$item.attr("class", $cleanClass).addClass(cls);
				arrItem.push($item.get(0));
				
				maxtime = parseFloat($item.css("transition-duration")) + parseFloat($item.css("transition-delay"));
				if (maxtime > timeout) {
					timeout = maxtime;
				}
			}
			
			window.setTimeout(function () {
				end.apply(null, [idx]);
			}, timeout * 1000);
			
			this.args.events.onChangeState.apply(null, [state, arrItem]);
		}
	};
	
	window.ibr = _ibroller;
	window.ibr.fn = _fn;
	window.ibr.dir = _direction;
	window.ibr.move = _moveto;
	window.ibr.state = _state;
	
}(window, jQuery));
