var canvas = document.getElementById('canvas1');

var wordsDrawn = [];
var file = [];

function getWordAtLocation(aCanvasX, aCanvasY){
	// This function returns the word object of the word I
	// am clicking

	let context = canvas.getContext('2d');

	for(let i=0; i<wordsDrawn.length; i++){
		let wordLength = context.measureText(wordsDrawn[i].word).width;

		// Select what word I am trying to drag
		if((aCanvasX - wordsDrawn[i].x < wordLength) &&
		   (aCanvasX - wordsDrawn[i].x > 0) &&
		   (wordsDrawn[i].y - aCanvasY < 20) &&
		   (wordsDrawn[i].y - aCanvasY > 0)) {
			return wordsDrawn[i];
		}
	}
	return null;
}

var drawCanvas = function() {
	var context = canvas.getContext('2d');

	context.fillStyle = 'white';
	context.fillRect(0,0,canvas.width,canvas.height); //erase canvas
	context.font = '13pt Arial';
	context.fillStyle = 'cornflowerblue';

	// Draw word objects
	for(let i=0; i<wordsDrawn.length; i++){
		let data = wordsDrawn[i];

		// If its a chord, draw it in a different colour than lyrics.
		if(data.id == 'chord'){
			context.strokeStyle = 'GreenYellow ';
		}
		else{
			context.strokeStyle = 'Green';
		}
		context.fillText(data.word, data.x, data.y);
		context.strokeText(data.word, data.x, data.y);
	}
}

function handleMouseDown(e){

	//get mouse location
	let rect = canvas.getBoundingClientRect();

	//use jQuery event object pageX and pageY
	let canvasX = e.pageX - rect.left;
	let canvasY = e.pageY - rect.top;

	wordBeingMoved = getWordAtLocation(canvasX, canvasY);

	if(wordBeingMoved != null ){
		deltaX = wordBeingMoved.x - canvasX;
		deltaY = wordBeingMoved.y - canvasY;
		$("#canvas1").mousemove(handleMouseMove);
		$("#canvas1").mouseup(handleMouseUp);

	}

	// Stop propagation of the event and stop any default
	//  browser action
	e.stopPropagation();
	e.preventDefault();

	// update the canvas
	drawCanvas();
}

function handleMouseMove(e){

	console.log("mouse move");

	//get mouse location
	let rect = canvas.getBoundingClientRect();
	let canvasX = e.pageX - rect.left;
	let canvasY = e.pageY - rect.top;

	// update the wordBeingMoved position
	wordBeingMoved.x = canvasX + deltaX;
	wordBeingMoved.y = canvasY + deltaY;

	e.stopPropagation();

	drawCanvas();
}

function handleMouseUp(e){
	console.log("mouse up");

	e.stopPropagation();

	//remove mouse move and mouse up handlers but
	//leave mouse down handler
	$("#canvas1").off("mousemove", handleMouseMove);
	$("#canvas1").off("mouseup", handleMouseUp);

	drawCanvas();
}


function handleSubmitButton() {
	// This function displays a user specified chord pro file as draggable
	// elements on the canvas

	let context = canvas.getContext('2d');
	let userText = $('#userTextField').val();

	if(userText && userText != '') {

		// Add the text to a JSON object to send to the server
		let userRequestObj = {text: userText};
		let userRequestJSON = JSON.stringify(userRequestObj);

		$('#userTextField').val('');

		// POSTing the input text will return an array of song lyric lines
		$.post("userText", userRequestJSON, function(data, status) {
			console.log("data: " + data);
			console.log("typeof: " + typeof data);

			let responseObj = JSON.parse(data);

			if (responseObj.lineArray) {

				// The following code will
				// create objects representing words and their locations
				let yPosition=50;
				let spacingBetweenWords = 20;
				let words = [];

				// For each line in the array of lines...
				for(let line of responseObj.lineArray){

					let xPosition = 50;
					let wordsInLine = line.split(/\s/); // Split the line into words

					// For each word in the line...
					for(let aWord of wordsInLine){

						// If there is a chord in the word
						while(aWord.indexOf('[') > -1){

							// get the index where the chord starts
							let indexOfChord = aWord.indexOf('[');

							// Use that index to get a substring containing the whole chord
							let chord = aWord.substring(indexOfChord,aWord.indexOf(']')+1);

							// Get the chord out of the word by replacing it with blank space
							aWord = aWord.replace(/\[.+?\]/,'');

							// Measures how many pixels from the start of the word that the chord was
							// then subtracts the character [ from the chord so that its centered over where it
							// was in the word
							let chordXOffset = context.measureText(aWord.substring(0,indexOfChord)).width -
								context.measureText(chord.charAt(0)).width;

							// Push this chord with the value offsets and an id chord which is used in refresh
							words.push({word:chord, x:xPosition + chordXOffset,  y:yPosition - 25, id:'chord'});
						}

						// If we are left with "" (which occurs when the whole word is a chord)
						// dont add it. Only add it when...
						if(aWord.length > 0){
							words.push({word:aWord, x:xPosition,  y:yPosition});
						}

						// Offset x based on word length and the width of the spacing
						xPosition += context.measureText(aWord).width + spacingBetweenWords;
					}
					yPosition += 60;
				}

				wordsDrawn = words;
				drawCanvas();

				// Add lines to paragraph beneath the canvas
				let textDiv = document.getElementById("text-area");
				let textParagraph = "";
				for (let i = 0; i < responseObj.lineArray.length; i++) {
					textParagraph = textParagraph + `<p> ${responseObj.lineArray[i]} </p>`;
				}
				textDiv.innerHTML = textParagraph;

			} else {
				// R3.5 If the requested song does not exist, then the canvas appears blank
				// and no there is no paragraph content below the canvas
				wordsDrawn = [];
				drawCanvas();
				document.getElementById("text-area").innerHTML = ``;
			}
		});
	}
}

function insertStringAtIndex(stringAddingTo, stringToAdd, index){
	// This helper function injects a string into another string at an index then return it.
	return stringAddingTo.substring(0,index) + stringToAdd
		+ stringAddingTo.substring(index,stringAddingTo.length-1);
}

function handleRefreshButton () {
	// This function generates the text at the bottom of the webpage. It shows
	// a preview of the chord pro file based on the position of elements on the canvas

	let context = canvas.getContext('2d');
	let yPos = 50;
	const lineOffset = 60;
	let finalLines = [];

	// Loop until we hit the bottom of the canvas
	while (yPos <= $("#canvas1").height()) {
		let line = [];

		// Collect words on this anchor line into an array
		for (let i = 0; i < wordsDrawn.length; i++) {
			if (wordsDrawn[i].y > yPos - 50 && wordsDrawn[i].y < yPos + 10) {
				line.push(wordsDrawn[i]);
			}
		}

		// Sort this array from lowest to highest x values
		line.sort(function (a, b) {
			return a.x - b.x;
		});

		// For each word in the line
		let tempLine = "";
		for (let j = 0; j < line.length; j++) {

			if(j > 0){

				// This makes sure prevWord is always the object of the last LYRIC we've seen
				if (!line[j-1].hasOwnProperty('id')) {
					var prevWord = line[j-1];
					var prevWordWidth = context.measureText(line[j-1].word).width;
				}

				// If this word is a chord, and its x position is less than where the last LYRIC ended
				// Then we know this chord belongs inside that lyric
				if(line[j].x < prevWord.x + prevWordWidth && line[j].id == 'chord' && prevWord.id != 'chord' ){

					// The index of where the chord should be in that word is calculated like a percent.
					// we take the x value of the chord and divide it by the x value of the end of the previous word.
					// If the start of the word is 0, and the end of the word is 100. This will tell us where along
					// that range the chord would be. We multiply the length of that previous word by the percentage to
					// get the index
					let indexWithinWord = Math.floor((line[j].x - prevWord.x)/(prevWordWidth) * (prevWord.word.length)-1);

					// Calculate how far back from the end of tempLine the chord should go
					let indexRelativeToTempLine = tempLine.length - ((prevWord.word.length - 1) - indexWithinWord);
					console.log("Chord " + line[j].word);
					console.log(indexWithinWord + "WRD");
					console.log(indexRelativeToTempLine + " TMP");
					// Function shoves the chord within the string and returns the new string.
					tempLine = insertStringAtIndex(tempLine,line[j].word, indexRelativeToTempLine) + " ";
					continue;
                }
            }
				// Add this word to the line buffer
				tempLine += line[j].word + " ";
			// Push the line buffer into an array of lines
		}
			console.log(tempLine);
			finalLines.push(tempLine);
			yPos += lineOffset;

	}
		// Update the paragraph tag at the bottom of the webpage
		let textDiv = document.getElementById("text-area");
		let textParagraph = "";
		for (let i = 0; i < finalLines.length; i++) {
			textParagraph = textParagraph + `<p> ${finalLines[i]} </p>`;
		}
		textDiv.innerHTML = textParagraph;

	// save the lines into a variable ready to be saved to a file
	file = finalLines;
}

function handleSaveAsButton() {
	// This function saves the lyrics and chords to a
	// text file based on their position on the canvas

	handleRefreshButton();

	let result = "";
	let userText = $('#userTextField').val();

	$('#userTextField').val(''); //clear the user text field
	// Transfer the array of lines into a single string
	for (let i = 0; i < file.length; i++) {
		result += file[i] + "\n";
	}

	// Send post request with new content to write to a file.
	let userRequestObj = {fileTitle: userText, fileText: result};
	let userRequestJSON = JSON.stringify(userRequestObj);
	$.post("newFile", userRequestJSON, function(data, status) {
		console.log("success");
	});
}

var ENTER = 13;

function handleKeyUp(e){
	if(e.which == ENTER){
		handleSubmitButton(); //treat ENTER key like you would a submit
		$('#userTextField').val(''); //clear the user text field
	}

	e.stopPropagation();
	e.preventDefault();
}

$(document).ready(function() {
	$(document).keyup(handleKeyUp);
	$("#canvas1").mousedown(handleMouseDown);

	drawCanvas();
});
