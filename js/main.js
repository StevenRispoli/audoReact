$(document).ready(function () {

	//-----------------------------------------------Local Storage------------------------------------------------

	Storage.prototype.setObject = function(name, value) {
	    this.setItem(name, JSON.stringify(value));
	}

	Storage.prototype.getObject = function(name) {
	    return JSON.parse(this.getItem(name));
	}

	//Properties of a level
	var gameProps = {
		level: 		1,
		score: 		0,
		numZeros: 	0,//Number of unaccented beats
		max: 		0,//Max length of rhythm
		m: 			0,//Total number of beats
		k: 			0,//Number of accented beats
		ms: 		0,//Time in ms that a sound plays. Will always be equal to half the length of a beat
		bpm: 		60,//Beats per minute
		failedBeat: false//Rhythm from level the user failed
	};

	var getGameProps = function(){
		if(!localStorage.getObject('gameProps')){ 
			localStorage.setObject('gameProps', gameProps);
		}
		gameProps = localStorage.getObject('gameProps');
	};
	getGameProps();

	var saveGameProps = function(){
		localStorage.setObject('gameProps', gameProps);
	};

	//---------------------------------------Random rhythm generation--------------------------------------------
	
	/**
	 *Based on euclid's algorithm for finding the greatest common factor of two numbers 
	 *Inspired by: http://cgm.cs.mcgill.ca/~godfried/publications/banff.pdf
	 */
	var euclid = function(m,k){
		var beats = [];
		var rhythm = [];
		var lastArrIndex = 0;

		function genInitialArray(){
			var a = m-k;//Number of 0's
			if(m/k<2){//More 1's than 0's
				for(var i = 0; i < a; i++){
					beats.push([1,0]);
				}
				while(k>a){
					beats.push([1]);
					k--
				}
			} else{
				for(var i = 0; i < k; i++){
					beats.push([1,0]);
				}
				while(k<a){
					beats.push([0]);
					a--
				}
			}
		};
		genInitialArray();
		
		function mergeDiffArrays(){
			var currIndex = 0;
			for(var i = 0; i < beats.length; i++){
				//lastArrIndex is the last array that is the same as the arrays before it
				//must be 2 or more arrays after lastArrIndex
				if(beats[i].length < beats[0].length && beats.length-1 > i){
					lastArrIndex = i-1;
					break;
				}else if(i === beats.length-1){
					rhythm = beats.join().split(',');
					rhythm.forEach(function(_, index){
						rhythm[index] = parseInt(rhythm[index])
					});
					return;
				}
			}
			//Loop ends when lastArrIndex is the last array or there are no more arrays left that can be merged
			while(beats.length-1 > lastArrIndex && beats.length-1 > currIndex){
				if(beats[beats.length-1].length < beats[lastArrIndex].length){
					var lastIndex = beats.splice(beats.length-1,1);
					beats[currIndex].push(lastIndex);
					currIndex++;
				}
			}
			mergeDiffArrays();
		}
		mergeDiffArrays();
		
		return rhythm;
	};

	//-----------------------------------------------Game Logic--------------------------------------------------
	
	var level = gameProps.level;
	var score = gameProps.score;
	var numZeros = gameProps.numZeros;
	var max = gameProps.max;
	var m = gameProps.m;
	var k = gameProps.k;
	var ms = gameProps.ms;
	var bpm = gameProps.bpm;
	var failedBeat = gameProps.failedBeat;

	//max length of rhythm is equal to the next level that is a multiple of 8 but no longer than 32
	var setMax = function(){
		var calcMax = Math.ceil(level/8)*8;
		if(calcMax<32)
			max = calcMax;
		else 
			max = 32;
	};
	
	var set_m_k = function(){
		//random integer between min(2) and max, inclusively.
		m = Math.floor(Math.random()*((max+1)-2))+2;
		//k will be between 3/4m and 1/4m, inclusively
		switch(m){
			case 2: k = 1; break;
			case 3: (Math.random()<.5) ? k=1 : k=2; break;
			default: k = Math.floor(Math.random()*(((m*.75)+1)-(m*.25))+(m*.25));
		};
	};
	
	//Rhythm playback is 10 bpm faster every fourth level
	var setBPM = function(){
		if(!((level-1)%4) && level-1 > 0 && failedBeat === false){
			bpm += 10;
		}
	};


	$('body').on('click', '#start', function(){
		var startBtn = this;
		$(startBtn).prop('disabled',true);//Prevents more than one rhythm playing when start button is pressed during playback
		waveformColor = 'rgb(0,153,255)';
		setBPM();
		setMax();
		set_m_k();
		$('#score').html(score);
		$('#level').html(level);
		$('#bpm').html(bpm);
		ms = (60000/bpm)/2;

		//Generate random rhythm using m and k or use beat from previously failed level
		var beatArray = failedBeat || euclid(m, k);
		
		//Select random note to play for each unaccented beat
		beatArray.forEach(function(el, i){
			if(el===0) beatArray[i] = keyCodes[Math.floor(Math.random()*keyCodes.length)];
		});
		
		var keydown = $.Event('keydown');//Keydown event for app to play sounds
		keydown.which = 65;
		var keyup = $.Event('keyup');//Keyup event for app to stop play sounds
		keyup.which = 65;
		var usersTurn = 3;//Rhythm will play 3 times before input is required from the user

		/**
		 *Must use recursive function instead of forLoop because setInterval will only delay
		 *the first iteration by the given time. Subsequent iterations will fire as usual.
		 */
		var playRhythm = function(beatArray, i){
			var i = i || 0;
			if(i > beatArray.length-3){
				waveformColor = 'rgb(255,0,0)';
			}else if(i > beatArray.length-5){
				waveformColor = 'rgb(0,255,0)';
			}
			function sound(beat){
				if(beat === 1){//Accented beats are played one octave higher than unaccented beats
					keydown.which = 59;
					keyup.which = 59;
					$('body').trigger(keydown, true);
				}else {
					keydown.which = 65;
					keyup.which = 65;
					$('body').trigger(keydown, true);
				}
			};
			sound(beatArray[i]);

			var noSound = function(){
				$('body').trigger(keyup);
			}

			var endRound = function(){
				waveformColor = 'rgb(0,153,255)';
				usersTurn = 3;
				noSound();
				if(score === numZeros){
					$('.notes').html('Well Done').removeClass('faded');
					failedBeat = false;
					level++;
				} else {
					$('.notes').html('Try Again').removeClass('faded');
					failedBeat = beatArray;
				}
				numZeros = 0;
				score = 0;
				$(startBtn).prop('disabled', false);
				saveGameProps();
			}

			if(usersTurn > 0){
				$('.notes').html('Listen');
				setTimeout(function(){
					noSound();
					if(beatArray[i+1] !== undefined){
						setTimeout(function(){
							playRhythm(beatArray, i+1)
						}, ms);
					} else {
						i = 0;
						usersTurn--;
						waveformColor = 'rgb(0,153,255)';
						setTimeout(function(){//Replay rhythm again from first beat
							playRhythm(beatArray, i);
						}, ms);
					}
				}, ms);
			} else if(beatArray[i] === 1){
				if(beatArray[i+1] !== 1 && beatArray[i+1] !== undefined)
					$('.notes').html(String.fromCharCode(beatArray[i+1])).addClass('faded');
				else
					$('.notes').html('...');
				setTimeout(function(){
					noSound();
				}, ms);
				setTimeout(function(){
					if(beatArray[i+1] !== undefined)
						playRhythm(beatArray, i+1);
					else
						endRound();
				}, ms*2);
			} else if(beatArray[i] !== 1){
				$('.notes').removeClass('faded');
				numZeros++;
				var foundKeys = [];
				var hit = false;
				//Determine what keys were pressed by the user
				function listenForCorrectKey(){
					for(key in depressedKeys){
						if(depressedKeys[key] && foundKeys.indexOf(parseInt(key))<0){
							foundKeys.push(parseInt(key));
							if(parseInt(key)===beatArray[i] && hit===false){//Check if key pressed is the correct key
								hit = true;
							}
						}
					}
				};
				var j = 0;
				setInterval(function(){
					if(j<ms){
						listenForCorrectKey();
						j++;
					}
				}, 1);
				setTimeout(function(){
					noSound();
					$('.notes').html(String.fromCharCode(beatArray[i+1])).addClass('faded');
					if(foundKeys.length === 1 && hit === true){//Iterate score if the correct key is the only key that was pressed
						score++;
						$('#score').html(score);
					}
					if(beatArray[i+1] !== undefined){
						setTimeout(function(){
							playRhythm(beatArray, i+1);
						}, ms);
					} else {
						endRound();
					}
				}, ms);
			}
		};
		playRhythm(beatArray);
	});

	//--------------------------------------------------CANVAS--------------------------------------------------
	
	var canvas = document.getElementById('visualizer');
	var canvasContext = canvas.getContext('2d');
	var width = $(window).width();
	canvas.setAttribute('width', width);
	var waveformColor = 'rgb(0,153,255)';
	var drawVisual;
	var analyser;

	//Source for visualize function: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API
	var visualize = function(analyser){
		var width = canvas.width;
		var height = canvas.height;

		//collect data points
		analyser.fftSize = 2048;
		var bufferLength = analyser.fftSize;
		var dataArray = new Uint8Array(bufferLength);
		
		//Clear canvas. clearRect is an HTML5 canvas method
		canvasContext.clearRect(0, 0, width, height);
		
		var draw = function(){
			//put time data collected by the analyser into the dataArray
			analyser.getByteTimeDomainData(dataArray);
			
			/**
			 *Reference: https://developer.mozilla.org/en-US/docs/Web/API/window.requestAnimationFrame
			 *tells the browser that you wish to perform an animation and 
			 *requests that the browser call a specified function to update an animation before the next repaint.
			 */ 
			drawVisual = requestAnimationFrame(draw);

			canvasContext.fillStyle = 'rgb(0, 0, 0)';
			canvasContext.fillRect(0, 0, width, height);
			canvasContext.lineWidth = 2;
			canvasContext.strokeStyle = waveformColor;

			//begin a canvas path
			canvasContext.beginPath();

			var sliceWidth = width * 1.0 / bufferLength;
			var x = 0;

			for(var i = 0; i < bufferLength; i++) {

				var v = dataArray[i] / 128.0;
				var y = v * height/2;

				if(i === 0) {
				  canvasContext.moveTo(x, y);
				} else {
				  canvasContext.lineTo(x, y);
				}

				x += sliceWidth;
			}

			canvasContext.lineTo(canvas.width, canvas.height/2);
			canvasContext.stroke();
	    };
		
		draw();
	}

	//-----------------------------------------Oscillator creation----------------------------------------------

	var context = new AudioContext();//Context needed to create nodes and handle audio processing
	analyser = context.createAnalyser();//provides time and frequency analysis
	function Oscillator(frequency){
		this.osc = context.createOscillator();
		this.osc.type = 'sine';
		this.osc.frequency.value = frequency;
		
		this.gain = context.createGain();
		this.gain.gain.value = 0;

		this.osc.connect(this.gain);
		this.gain.connect(analyser)
	}

	analyser.connect(context.destination);
	visualize(analyser);
	
	var chromaticC4 = {
		'C'  :261.626,
		'C#' :277.183,
		'D'  :293.665,
		'D#' :311.127,
		'E'  :329.628,
		'F'  :349.228,
		'F#' :369.994,
		'G'  :391.995,
		'G#' :415.305,
		'A'  :440.000,
		'A#' :466.164,
		'B'  :493.883
	}
	var keyCodes = [65, 83, 68, 70, 74, 75, 76, 59];
	var scale = [];
	var scaleObj = {};
	var oscillators = {};
	var tonic = $('select[name="key"]').val();
	var mode = +($('select[name="mode"]').val());

	var scalePicker = function(tonic, modeNum){
		scale = [];//reset scale
	    var root = chromaticC4[tonic];
	    //One semitone up is the original notes frequency multiplied by the 12th root of 2
	    var wholeStep = function(note){
	      return Math.pow(Math.pow(2, 1/12), 2)*note;
	    }
	    var halfStep = function(note){
	      return Math.pow(2, 1/12)*note; 
	    }

	    //The half step notes of each mode
	    var ionian = [3,7];
	    var dorian = [2,6];
	    var phrygian = [1,5];
	    var lydian = [4,7];
	    var mixolydian = [3,6];
	    var aeolian = [2,5];
	    var locrian = [1,4];

	    
	    //scale creation based off of root note 
	    //scaleObj gets values to assign to keycodes from the scale array
	    var genScale = function(mode){
	    	for(var i = 0; i < 8; i++){
				if (i === 0){
					scale.push(root);
				} else if(mode.indexOf(i) > -1){
					scale.push(halfStep(scale[i-1]));
				} else {
					scale.push(wholeStep(scale[i-1]));
				}
	    	}
	    }

	    /**
	     * modeNum
	     *
	     * Ionian = 1
	     * Dorian = 2
	     * Phrygian = 3
	     * Lydian = 4
	     * Mixolydian = 5
	     * Aeolian = 6
	     * Locrian = 7
	     */
	    //generate scale based on which mode was chosen by the user
	   	switch (modeNum){
	   		case 1: genScale(ionian); break;
	   		case 2: genScale(dorian); break;
	   		case 3: genScale(phrygian); break;
	   		case 4: genScale(lydian); break;
	   		case 5: genScale(mixolydian); break;
	   		case 6: genScale(aeolian); break;
	   		case 7: genScale(locrian); break;
	   	}
	};
	scalePicker(tonic, mode);

	var makeOscillators = function(){
		for(var i = 0; i < keyCodes.length; i++){
			scaleObj[keyCodes[i]] = scale[i];//assign frequencies to keycodes
			var osc = new Oscillator(scaleObj[keyCodes[i]]);
			
			//assign osciallators to corresponding keycode in oscillators object
			oscillators[keyCodes[i]] = osc;
	    	osc.osc.start(0);
		}
	};
	makeOscillators();

	//Set tonic
	$('select[name="key"]').on('change', function(){
		tonic = $(this).val();
		scalePicker(tonic, mode);
		makeOscillators();
		$(this).blur();
	});

	//Set mode
	$('select[name="mode"]').on('change', function(){
		mode = +($(this).val());
		scalePicker(tonic, mode);
		makeOscillators();
		$(this).blur();
	});

	//----------------------------------------------User action handling---------------------------------------

	//False if user is not currently pressing a key
	var depressedKeys = {
		65: false,
		83: false,
		68: false,
		70: false,
		74: false,
		75: false,
		76: false,
		59: false
	};

	$('body').on('keydown', function(e, triggered) {
		triggered = triggered || false;//Prevents triggered keydown events from altering depressedKeys object
		if(e.which===186)//Keydown event number of semicolon button is 186, but semicolon character code is 59
			key = 59
		else
	    	key = e.which;
	    if(keyCodes.indexOf(key) > -1 && depressedKeys[key] === false){
	    	oscillators[key].gain.gain.value = .20;
	    	if(triggered === false) depressedKeys[key] = true;
	    }
  	});

  	$('body').on('keyup', function(e){
  		if(e.which===186)
  			key = 59
  		else
  			key = e.which
  		if(keyCodes.indexOf(key) > -1){
  			oscillators[key].gain.gain.value=0;
  			depressedKeys[key] = false;
		}
  	});

  	$('#help').on('click', function(){
  		$('#help-text').slideToggle(400);
  	});
});
